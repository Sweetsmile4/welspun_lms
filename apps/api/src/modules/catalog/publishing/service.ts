import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { z } from 'zod';
import { createAuthorizationService } from '../../identity/authorization/service.js';
import { authorize } from '../../identity/authorization/engine.js';
import {
  deny,
  objectId,
  type AuthorizationIdentityProvider,
  type AuthorizationRepository,
  type AuthorizationTransaction as Tx,
} from '../../identity/authorization/types.js';
import type { DraftStore } from '../drafts/repository.js';
import { draftResolver } from '../drafts/service.js';
import { HttpError } from '../../../platform/errors.js';
import {
  securityEvent,
  type TransactionalSecurityAudit,
} from '../../../platform/security-audit.js';
import type { ManagementStore } from '../../identity/management/store.js';
import {
  fingerprint,
  receiptVersions,
  validateReceipt,
} from '../../identity/management/receipts.js';
import {
  acknowledgement,
  commandSchema,
  contentDigest,
  pageSchema,
  policySchema,
  reviewSchema,
  releaseSchema,
  snapshotSchema,
  type Review,
  type Snapshot,
  type Evidence,
  type Command,
} from './contracts.js';
import type { PublishingStore } from './repository.js';

const id = () => new Types.ObjectId().toHexString();
const conflict = (): never => {
  throw new HttpError(
    409,
    'REVIEW_CONFLICT',
    'Review or release preconditions are not satisfied',
  );
};
const permission = (kind: Command['action']['kind']) =>
  ({
    submit: 'course.review.submit',
    supersede: 'course.review.submit',
    assign: 'course.review.assign',
    decide: 'course.review.decide',
    publish: 'course.release.publish',
  })[kind] as
    | 'course.review.submit'
    | 'course.review.assign'
    | 'course.review.decide'
    | 'course.release.publish';

export function createPublishingService(
  repository: AuthorizationRepository,
  drafts: DraftStore,
  store: PublishingStore,
  receipts: Pick<ManagementStore, 'receipt' | 'saveReceipt'>,
  identity: AuthorizationIdentityProvider,
  audit: TransactionalSecurityAudit,
  options: {
    isolatedTest: true;
    policy: z.input<typeof policySchema>;
    clock?: () => Date;
  },
) {
  const policy = Object.freeze(policySchema.parse(options.policy));
  function guard() {
    if (
      process.env.NODE_ENV !== 'test' ||
      options.isolatedTest !== true ||
      identity.mode !== 'synthetic-test' ||
      audit.durability !== 'isolated-test'
    )
      throw new Error('Review publishing requires isolated synthetic tests');
  }
  guard();
  const resolver = draftResolver(drafts),
    core = createAuthorizationService(repository, identity, {
      ...options,
      resolver,
    });
  async function snapshot(
    tx: Tx,
    org: string,
    courseId: string,
  ): Promise<Snapshot> {
    return snapshotSchema.parse({
      course: await drafts.course(tx, org, courseId),
      draft: await drafts.draft(tx, org, courseId),
    });
  }
  async function qualify(
    tx: Tx,
    review: Review,
    reviewerId: string,
    now: Date,
  ) {
    if (
      review.snapshot.draft.editedBy!.includes(reviewerId) ||
      review.snapshot.course.ownerId === reviewerId ||
      review.submittedBy === reviewerId
    )
      return deny();
    const user = await tx.user(review.organizationId, reviewerId);
    if (!user || user.status !== 'active') return deny();
    await authorize(
      tx,
      user,
      'course.review.decide',
      { kind: 'course', id: review.courseId },
      now,
      resolver,
    );
  }
  async function approvals(tx: Tx, review: Review, now: Date) {
    if (
      fingerprint(review.policy) !== fingerprint(policy) ||
      !['approved', 'published'].includes(review.state) ||
      review.reviewers.length !== policy.requiredApprovals
    )
      return conflict();
    const rows = (
      await store.evidence(tx, review.organizationId, review.id)
    ).filter((e) => e.kind === 'approve');
    if (
      rows.length !== policy.requiredApprovals ||
      new Set(rows.map((r) => r.actorId)).size !== rows.length
    )
      return conflict();
    for (const row of rows) {
      if (
        !review.evidenceIds.includes(row.id) ||
        !review.reviewers.includes(row.actorId) ||
        row.reviewerId !== row.actorId ||
        row.digest !== review.digest ||
        row.draftRevision !== review.draftRevision ||
        row.draftId !== review.draftId ||
        row.courseId !== review.courseId ||
        row.reviewId !== review.id ||
        row.organizationId !== review.organizationId
      )
        return conflict();
      await qualify(tx, review, row.actorId, now);
    }
    return rows;
  }
  async function exact(tx: Tx, command: Command, review?: Review) {
    const current = await snapshot(
      tx,
      command.organizationId,
      command.courseId,
    );
    if (
      current.draft.status !== 'draft' ||
      current.draft.revision !== command.expectedDraftRevision ||
      contentDigest(current) !== command.digest ||
      (review &&
        (review.digest !== command.digest ||
          review.draftRevision !== current.draft.revision ||
          review.draftId !== current.draft.id))
    )
      return conflict();
    return current;
  }
  async function load(tx: Tx, org: string, course: string, reviewId: string) {
    const row = await store.review(tx, org, reviewId);
    if (!row || row.courseId !== course) return deny();
    return reviewSchema.parse(row);
  }
  const service = {
    async execute(credential: unknown, input: z.input<typeof commandSchema>) {
      guard();
      const command = commandSchema.parse(input),
        action = command.action,
        org = command.organizationId;
      return core.within(
        credential,
        org,
        async ({ tx, actor, now, assert }) => {
          await assert(permission(action.kind), {
            kind: 'course',
            id: command.courseId,
          });
          let review =
            action.kind === 'submit'
              ? undefined
              : await load(tx, org, command.courseId, action.reviewId);
          if (action.kind === 'decide') {
            if (!review!.reviewers.includes(actor.id)) return deny();
            await qualify(tx, review!, actor.id, now);
          }
          if (action.kind === 'assign')
            await qualify(tx, review!, action.reviewerId, now);
          if (action.kind === 'publish') await approvals(tx, review!, now);
          const key = {
            organizationId: org,
            actorId: actor.id,
            operation:
              action.kind === 'publish'
                ? 'course.release.publish.v1'
                : 'course.review.command.v1',
            keyHash: fingerprint(command.key),
          };
          const payload = {
            organizationId: command.organizationId,
            courseId: command.courseId,
            expectedDraftRevision: command.expectedDraftRevision,
            digest: command.digest,
            action: command.action,
          };
          const requestDigest = fingerprint(payload),
            prior = await receipts.receipt(tx, key);
          if (prior) {
            const valid = validateReceipt(prior, key);
            if (valid.fingerprint !== requestDigest)
              throw new HttpError(
                409,
                'IDEMPOTENCY_CONFLICT',
                'Command key conflicts with original request',
              );
            const data = acknowledgement.safeParse(valid.data);
            if (!data.success)
              throw new HttpError(
                503,
                'REPLAY_UNAVAILABLE',
                'Stored command replay requires reconciliation',
              );
            return { ...data.data, replayed: true };
          }
          let releaseId: string | null = null,
            releaseNumber: number | null = null;
          if (action.kind === 'submit') {
            const current = await exact(tx, command);
            if (
              !current.draft.modules.length ||
              current.draft.modules.some((m) => !m.lessons.length)
            )
              return conflict();
            review = {
              id: id(),
              organizationId: org,
              courseId: current.course.id,
              draftId: current.draft.id,
              draftRevision: current.draft.revision,
              digest: contentDigest(current),
              algorithm: 'catalog-snapshot-v1',
              snapshot: current,
              policy: { ...policy },
              submittedBy: actor.id,
              submittedAt: now,
              revision: 0,
              state: 'submitted',
              reviewers: [],
              evidenceIds: [],
            };
            await store.insertReview(tx, review);
          } else {
            if (review!.revision !== action.expectedReviewRevision)
              return conflict();
            const previousRevision = review!.revision;
            if (action.kind === 'supersede') {
              const current = await snapshot(tx, org, command.courseId);
              if (
                review!.digest !== command.digest ||
                current.draft.revision !== command.expectedDraftRevision ||
                (contentDigest(current) === review!.digest &&
                  current.draft.revision === review!.draftRevision) ||
                ['published', 'superseded'].includes(review!.state)
              )
                return conflict();
            } else await exact(tx, command, review);
            const binding = {
              organizationId: org,
              courseId: review!.courseId,
              draftId: review!.draftId,
              draftRevision: review!.draftRevision,
              digest: review!.digest,
              algorithm: review!.algorithm,
            };
            let event: Evidence | undefined;
            if (action.kind === 'assign') {
              if (
                !['submitted', 'inReview'].includes(review!.state) ||
                review!.reviewers.includes(action.reviewerId) ||
                review!.reviewers.length >= policy.requiredApprovals
              )
                return conflict();
              review!.reviewers.push(action.reviewerId);
              review!.state = 'inReview';
              event = {
                ...binding,
                id: id(),
                reviewId: review!.id,
                actorId: actor.id,
                at: now,
                kind: 'assigned',
                reviewerId: action.reviewerId,
                feedback: null,
              };
            } else if (action.kind === 'decide') {
              if (
                review!.state !== 'inReview' ||
                (await store.evidence(tx, org, review!.id)).some(
                  (e) =>
                    ['approve', 'changesRequested', 'reject'].includes(
                      e.kind,
                    ) && e.actorId === actor.id,
                )
              )
                return conflict();
              event = {
                ...binding,
                id: id(),
                reviewId: review!.id,
                actorId: actor.id,
                at: now,
                kind: action.decision,
                reviewerId: actor.id,
                feedback: action.feedback,
              };
              if (action.decision === 'changesRequested')
                review!.state = 'changesRequested';
              else if (action.decision === 'reject') review!.state = 'rejected';
              else {
                const previous = (
                  await store.evidence(tx, org, review!.id)
                ).filter((e) => e.kind === 'approve');
                if (
                  previous.length + 1 === policy.requiredApprovals &&
                  review!.reviewers.length === policy.requiredApprovals
                )
                  review!.state = 'approved';
              }
            } else if (action.kind === 'supersede') {
              review!.state = 'superseded';
              event = {
                ...binding,
                id: id(),
                reviewId: review!.id,
                actorId: actor.id,
                at: now,
                kind: 'supersede',
                reviewerId: null,
                feedback: null,
              };
            } else {
              if (review!.state !== 'approved') return conflict();
              const latest = await store.latestNumber(
                tx,
                org,
                command.courseId,
              );
              if (latest !== action.expectedReleaseNumber) return conflict();
              releaseId = id();
              releaseNumber = latest + 1;
              await store.appendRelease(
                tx,
                releaseSchema.parse({
                  ...binding,
                  id: releaseId,
                  number: releaseNumber,
                  reviewId: review!.id,
                  snapshot: review!.snapshot,
                  policy: review!.policy,
                  approvals: await approvals(tx, review!, now),
                  scopeUnitId: review!.snapshot.course.scopeUnitId,
                  publishedBy: actor.id,
                  publishedAt: now,
                  lifecycle: 'published',
                  schemaVersion: 1,
                }),
              );
              review!.state = 'published';
            }
            if (event) {
              await store.appendEvidence(tx, event);
              review!.evidenceIds.push(event.id);
            }
            review!.revision++;
            if (!(await store.replaceReview(tx, review!, previousRevision)))
              return conflict();
          }
          const type =
            action.kind === 'submit'
              ? 'course.review.submitted'
              : action.kind === 'assign'
                ? 'course.review.assigned'
                : action.kind === 'decide'
                  ? 'course.review.decided'
                  : action.kind === 'supersede'
                    ? 'course.review.superseded'
                    : 'course.release.published';
          try {
            await audit.append(
              tx,
              securityEvent(
                {
                  requestId: command.requestId,
                  type,
                  outcome: 'allowed',
                  organizationId: org,
                  actorId: actor.id,
                  resourceId: releaseId ?? review!.id,
                },
                now,
              ),
            );
          } catch {
            throw new HttpError(
              503,
              'SECURITY_AUDIT_UNAVAILABLE',
              'Transactional security audit is unavailable',
            );
          }
          const data = acknowledgement.parse({
            courseId: command.courseId,
            reviewId: review!.id,
            reviewRevision: review!.revision,
            releaseId,
            releaseNumber,
          });
          await receipts.saveReceipt(tx, {
            ...key,
            ...receiptVersions,
            fingerprint: requestDigest,
            responseDigest: fingerprint(data),
            data,
            createdAt: now,
          });
          return { ...data, replayed: false };
        },
      );
    },
    async retrieveReview(credential: unknown, org: string, reviewId: string) {
      guard();
      objectId.parse(reviewId);
      return core.within(credential, org, async ({ tx, assert }) => {
        const review = await store.review(tx, org, reviewId);
        if (!review) return deny();
        await assert('course.review.read', {
          kind: 'course',
          id: review.courseId,
        });
        return {
          review: reviewSchema.parse(review),
          evidence: await store.evidence(tx, org, reviewId),
        };
      });
    },
    async retrieveRelease(credential: unknown, org: string, releaseId: string) {
      guard();
      objectId.parse(releaseId);
      return core.within(credential, org, async ({ tx, assert }) => {
        const release = await store.release(tx, org, releaseId);
        if (!release) return deny();
        await assert('course.release.read', {
          kind: 'course',
          id: release.courseId,
        });
        return releaseSchema.parse(release);
      });
    },
    async history(
      credential: unknown,
      org: string,
      courseId: string,
      kind: 'reviews' | 'releases',
      input: z.input<typeof pageSchema> = {},
    ) {
      guard();
      objectId.parse(courseId);
      z.enum(['reviews', 'releases']).parse(kind);
      const page = pageSchema.parse(input);
      return core.within(credential, org, async ({ tx, assert }) => {
        await assert(
          kind === 'reviews' ? 'course.review.read' : 'course.release.read',
          { kind: 'course', id: courseId },
        );
        const rows = await store[kind](
          tx,
          org,
          courseId,
          page.limit + 1,
          page.cursor,
        );
        const items = rows
          .slice(0, page.limit)
          .map((row) =>
            kind === 'reviews'
              ? reviewSchema.parse(row)
              : releaseSchema.parse(row),
          );
        return {
          items,
          nextCursor: rows.length > page.limit ? items.at(-1)!.id : null,
        };
      });
    },
    async validatePublishReadiness(
      credential: unknown,
      input: Omit<Command, 'key' | 'requestId'>,
    ) {
      guard();
      const command = commandSchema.parse({
        ...input,
        key: 'readiness_only',
        requestId: randomUUID(),
      });
      if (command.action.kind !== 'publish') return conflict();
      const action = command.action;
      return core.within(
        credential,
        command.organizationId,
        async ({ tx, now, assert }) => {
          await assert('course.release.publish', {
            kind: 'course',
            id: command.courseId,
          });
          const review = await load(
            tx,
            command.organizationId,
            command.courseId,
            action.reviewId,
          );
          if (
            review.state !== 'approved' ||
            review.revision !== action.expectedReviewRevision ||
            (await store.latestNumber(
              tx,
              command.organizationId,
              command.courseId,
            )) !== action.expectedReleaseNumber
          )
            return conflict();
          await exact(tx, command, review);
          await approvals(tx, review, now);
          return {
            ready: true as const,
            reviewId: review.id,
            digest: review.digest,
            nextReleaseNumber: action.expectedReleaseNumber + 1,
          };
        },
      );
    },
  };
  return service;
}
