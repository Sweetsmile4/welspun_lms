import { Types } from 'mongoose';
import { z } from 'zod';
import { createAuthorizationService } from '../../identity/authorization/service.js';
import { activeUnit } from '../../identity/authorization/engine.js';
import {
  deny,
  objectId,
  type AuthorizationIdentityProvider,
  type AuthorizationRepository,
  type ResourceResolver,
} from '../../identity/authorization/types.js';
import { HttpError } from '../../../platform/errors.js';
import {
  securityEvent,
  type TransactionalSecurityAudit,
} from '../../../platform/security-audit.js';
import {
  fingerprint,
  receiptVersions,
  validateReceipt,
} from '../../identity/management/receipts.js';
import type { ManagementStore } from '../../identity/management/store.js';
import {
  acknowledgement,
  commandSchema,
  draftSchema,
  type Change,
  type Draft,
} from './contracts.js';
import type { DraftStore } from './repository.js';

const id = () => new Types.ObjectId().toHexString();
const conflict = () => {
  throw new HttpError(
    409,
    'DRAFT_CONFLICT',
    'Draft state or revision conflicts with command',
  );
};
export function draftResolver(store: DraftStore): ResourceResolver {
  return {
    async resolve(tx, organizationId, target) {
      if (target.kind !== 'course') return null;
      const course = await store.course(tx, organizationId, target.id);
      const draft =
        course && (await store.draft(tx, organizationId, course.id));
      if (!course || !draft) return null;
      const org = await tx.organization(organizationId);
      const root = org && (await tx.unitByCode(organizationId, null, org.code));
      if (!root) return null;
      return {
        organizationId,
        id: course.id,
        kind: 'course',
        ownerId: course.ownerId,
        unitIds: [course.scopeUnitId ?? root.id],
        state: draft.status === 'archived' ? 'archived' : 'active',
        editedBy: [course.ownerId],
      };
    },
  };
}

/** Internal application boundary only; no HTTP mounting or production identity composition. */
export function createCourseDraftService(
  repository: AuthorizationRepository,
  store: DraftStore,
  receipts: Pick<ManagementStore, 'receipt' | 'saveReceipt'>,
  identity: AuthorizationIdentityProvider,
  audit: TransactionalSecurityAudit,
  options: { isolatedTest: true; clock?: () => Date },
) {
  function guard() {
    if (
      process.env.NODE_ENV !== 'test' ||
      options.isolatedTest !== true ||
      identity.mode !== 'synthetic-test' ||
      audit.durability !== 'isolated-test'
    )
      throw new Error('Course drafts require isolated synthetic tests');
  }
  guard();
  const core = createAuthorizationService(repository, identity, {
    ...options,
    resolver: draftResolver(store),
  });
  const service = {
    async retrieve(
      credential: unknown,
      organizationId: string,
      courseId: string,
    ) {
      guard();
      objectId.parse(courseId);
      return core.within(credential, organizationId, async ({ tx, assert }) => {
        await assert('course.draft.read', { kind: 'course', id: courseId });
        return draftSchema.parse(
          await store.draft(tx, organizationId, courseId),
        );
      });
    },
    async execute(credential: unknown, input: z.input<typeof commandSchema>) {
      guard();
      const command = commandSchema.parse(input),
        change = command.change;
      if (
        change.kind === 'create'
          ? command.courseId !== undefined ||
            command.expectedRevision !== undefined
          : !command.courseId || command.expectedRevision === undefined
      )
        throw new HttpError(
          422,
          'VALIDATION_ERROR',
          'Invalid draft command precondition',
        );
      return core.within(
        credential,
        command.organizationId,
        async ({ tx, actor, now, assert }) => {
          const org = command.organizationId;
          const creating = change.kind === 'create';
          if (creating) {
            if (change.scopeUnitId) {
              const unit = await activeUnit(tx, org, change.scopeUnitId);
              if (unit.type === 'organization') return deny();
              await assert('course.draft.create', {
                kind: 'unit',
                id: unit.id,
              });
            } else
              await assert('course.draft.create', { kind: 'organization' });
          } else
            await assert(
              change.kind === 'archive'
                ? 'course.draft.archive'
                : 'course.draft.edit',
              { kind: 'course', id: command.courseId! },
            );
          const key = {
            organizationId: org,
            actorId: actor.id,
            operation: 'course.draft.command.v1',
            keyHash: fingerprint(command.key),
          };
          const digest = fingerprint({
            organizationId: org,
            operation: key.operation,
            courseId: command.courseId,
            expectedRevision: command.expectedRevision,
            change,
          });
          const prior = await receipts.receipt(tx, key);
          if (prior) {
            const valid = validateReceipt(prior, key);
            if (valid.fingerprint !== digest)
              throw new HttpError(
                409,
                'IDEMPOTENCY_CONFLICT',
                'Command key conflicts with original request',
              );
            const parsed = acknowledgement.safeParse(valid.data);
            if (!parsed.success)
              throw new HttpError(
                503,
                'REPLAY_UNAVAILABLE',
                'Stored command replay requires reconciliation',
              );
            return { ...parsed.data, replayed: true };
          }
          let draft: Draft;
          if (creating) {
            const courseId = id();
            draft = {
              id: id(),
              courseId,
              organizationId: org,
              title: change.title,
              description: change.description,
              metadata: change.metadata,
              status: 'draft',
              revision: 0,
              modules: [],
              createdBy: actor.id,
              updatedBy: actor.id,
              editedBy: [actor.id],
              createdAt: now,
              updatedAt: now,
            };
            await audience();
            draftSchema.parse(draft);
            await store.insert(
              tx,
              {
                id: courseId,
                organizationId: org,
                code: change.code,
                ownerId: actor.id,
                scopeUnitId: change.scopeUnitId,
                createdBy: actor.id,
                createdAt: now,
              },
              draft,
            );
          } else {
            const previous = await store.draft(tx, org, command.courseId!);
            if (
              !previous ||
              previous.status !== 'draft' ||
              previous.revision !== command.expectedRevision
            )
              return conflict();
            draft = structuredClone(previous);
            edit(draft, change);
            draft.revision++;
            draft.updatedBy = actor.id;
            if (draft.editedBy)
              draft.editedBy = [...new Set([...draft.editedBy, actor.id])];
            draft.updatedAt = now;
            await audience();
            draftSchema.parse(draft);
            if (!(await store.replace(tx, draft, command.expectedRevision!)))
              return conflict();
          }
          async function audience() {
            for (const unitId of draft.metadata.audienceUnitIds) {
              const unit = await activeUnit(tx, org, unitId);
              if (unit.type === 'organization') return deny();
            }
          }
          try {
            await audit.append(
              tx,
              securityEvent(
                {
                  requestId: command.requestId,
                  type: creating
                    ? 'course.draft.created'
                    : change.kind === 'archive'
                      ? 'course.draft.archived'
                      : 'course.draft.changed',
                  outcome: 'allowed',
                  organizationId: org,
                  actorId: actor.id,
                  resourceId: draft.courseId,
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
            courseId: draft.courseId,
            draftId: draft.id,
            revision: draft.revision,
          });
          await receipts.saveReceipt(tx, {
            ...key,
            ...receiptVersions,
            fingerprint: digest,
            responseDigest: fingerprint(data),
            data,
            createdAt: now,
          });
          return { ...data, replayed: false };
        },
      );
    },
  };
  return service;
}

function reorder<T extends { id: string; position: number; revision: number }>(
  rows: T[],
  ids: string[],
) {
  if (
    rows.length !== ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !rows.some((row) => row.id === id))
  )
    return conflict();
  return ids.map((id, position) => {
    const row = rows.find((row) => row.id === id)!;
    if (row.position !== position) row.revision++;
    return { ...row, position };
  });
}
function edit(draft: Draft, change: Change) {
  if (change.kind === 'archive') {
    draft.status = 'archived';
    return;
  }
  if (change.kind === 'metadata') {
    draft.title = change.title;
    draft.description = change.description;
    draft.metadata = change.metadata;
    return;
  }
  if (change.kind === 'addModule') {
    draft.modules.push({
      id: id(),
      courseId: draft.courseId,
      title: change.title,
      description: change.description,
      position: draft.modules.length,
      revision: 0,
      lessons: [],
    });
    return;
  }
  if (change.kind === 'reorderModules') {
    draft.modules = reorder(draft.modules, change.ids);
    return;
  }
  if (!('moduleId' in change)) return conflict();
  const courseModule = draft.modules.find((row) => row.id === change.moduleId);
  if (!courseModule) return conflict();
  if (change.kind === 'removeModule') {
    draft.modules = draft.modules.filter((row) => row.id !== courseModule.id);
    draft.modules.forEach((row, index) => {
      if (row.position !== index) row.revision++;
      row.position = index;
    });
    return;
  }
  courseModule.revision++;
  if (change.kind === 'updateModule') {
    courseModule.title = change.title;
    courseModule.description = change.description;
    return;
  }
  if (change.kind === 'addLesson') {
    courseModule.lessons.push({
      id: id(),
      courseId: draft.courseId,
      moduleId: courseModule.id,
      title: change.title,
      description: change.description,
      content: change.content,
      revision: 0,
      position: courseModule.lessons.length,
    });
    return;
  }
  if (change.kind === 'reorderLessons') {
    courseModule.lessons = reorder(courseModule.lessons, change.ids);
    return;
  }
  if (!('lessonId' in change)) return conflict();
  const lesson = courseModule.lessons.find((row) => row.id === change.lessonId);
  if (!lesson) return conflict();
  if (change.kind === 'removeLesson') {
    courseModule.lessons = courseModule.lessons.filter(
      (row) => row.id !== lesson.id,
    );
    courseModule.lessons.forEach((row, index) => {
      if (row.position !== index) row.revision++;
      row.position = index;
    });
    return;
  }
  lesson.title = change.title;
  lesson.description = change.description;
  lesson.content = change.content;
  lesson.revision++;
}
