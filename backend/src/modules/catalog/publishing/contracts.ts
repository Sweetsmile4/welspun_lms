import { z } from 'zod';
import { objectId } from '../../identity/authorization/types.js';
import { courseSchema, draftSchema, description } from '../drafts/contracts.js';
import { fingerprint } from '../../identity/management/receipts.js';

export const revision = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER - 1);
export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const policySchema = z.strictObject({
  key: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  requiredApprovals: z.number().int().min(1).max(5),
});
export const snapshotSchema = z
  .strictObject({ course: courseSchema, draft: draftSchema })
  .superRefine((s, ctx) => {
    if (
      s.course.id !== s.draft.courseId ||
      s.course.organizationId !== s.draft.organizationId ||
      !s.draft.editedBy ||
      !s.draft.editedBy.includes(s.course.ownerId) ||
      !s.draft.editedBy.includes(s.draft.updatedBy)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Incomplete snapshot provenance or binding',
      });
  });
export type Snapshot = z.infer<typeof snapshotSchema>;
/** Dates become ISO strings BEFORE canonical key sorting. Array order and all submitted bytes matter. */
export const contentDigest = (snapshot: Snapshot) =>
  fingerprint(JSON.parse(JSON.stringify(snapshotSchema.parse(snapshot))));
export const feedbackSchema = z
  .array(
    z.strictObject({
      category: z.enum(['accuracy', 'clarity', 'safety', 'structure']),
      message: description.refine((s) => s.trim().length > 0),
    }),
  )
  .min(1)
  .max(10);
const binding = {
  organizationId: objectId,
  courseId: objectId,
  draftId: objectId,
  draftRevision: revision,
  digest: digestSchema,
  algorithm: z.literal('catalog-snapshot-v1'),
};
export const evidenceSchema = z.strictObject({
  id: objectId,
  reviewId: objectId,
  ...binding,
  actorId: objectId,
  at: z.date(),
  kind: z.enum([
    'assigned',
    'approve',
    'changesRequested',
    'reject',
    'supersede',
  ]),
  reviewerId: objectId.nullable(),
  feedback: feedbackSchema.nullable(),
});
export type Evidence = z.infer<typeof evidenceSchema>;
export const reviewSchema = z
  .strictObject({
    id: objectId,
    ...binding,
    snapshot: snapshotSchema,
    policy: policySchema,
    submittedBy: objectId,
    submittedAt: z.date(),
    revision,
    state: z.enum([
      'submitted',
      'inReview',
      'changesRequested',
      'approved',
      'rejected',
      'superseded',
      'published',
    ]),
    reviewers: z.array(objectId).max(5),
    evidenceIds: z.array(objectId).max(11),
  })
  .superRefine((r, ctx) => {
    if (
      r.organizationId !== r.snapshot.course.organizationId ||
      r.courseId !== r.snapshot.course.id ||
      r.draftId !== r.snapshot.draft.id ||
      r.draftRevision !== r.snapshot.draft.revision ||
      r.digest !== contentDigest(r.snapshot) ||
      new Set(r.reviewers).size !== r.reviewers.length ||
      new Set(r.evidenceIds).size !== r.evidenceIds.length ||
      r.reviewers.length > r.policy.requiredApprovals
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid review binding' });
  });
export type Review = z.infer<typeof reviewSchema>;
export const releaseSchema = z
  .strictObject({
    id: objectId,
    ...binding,
    number: revision.refine((n) => n > 0),
    reviewId: objectId,
    snapshot: snapshotSchema,
    policy: policySchema,
    approvals: z.array(evidenceSchema).min(1).max(5),
    scopeUnitId: objectId.nullable(),
    publishedBy: objectId,
    publishedAt: z.date(),
    lifecycle: z.literal('published'),
    schemaVersion: z.literal(1),
  })
  .superRefine((r, ctx) => {
    if (
      r.digest !== contentDigest(r.snapshot) ||
      r.courseId !== r.snapshot.course.id ||
      r.organizationId !== r.snapshot.course.organizationId ||
      r.draftId !== r.snapshot.draft.id ||
      r.draftRevision !== r.snapshot.draft.revision ||
      r.scopeUnitId !== r.snapshot.course.scopeUnitId ||
      r.approvals.length !== r.policy.requiredApprovals ||
      new Set(r.approvals.map((a) => a.actorId)).size !== r.approvals.length ||
      r.approvals.some(
        (a) =>
          a.kind !== 'approve' ||
          a.actorId !== a.reviewerId ||
          a.organizationId !== r.organizationId ||
          a.courseId !== r.courseId ||
          a.draftId !== r.draftId ||
          a.draftRevision !== r.draftRevision ||
          a.digest !== r.digest ||
          a.reviewId !== r.reviewId ||
          r.snapshot.draft.editedBy!.includes(a.actorId),
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Invalid immutable release evidence',
      });
  });
export type Release = z.infer<typeof releaseSchema>;
const envelope = {
  organizationId: objectId,
  courseId: objectId,
  expectedDraftRevision: revision,
  digest: digestSchema,
  key: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/),
  requestId: z.uuid(),
};
export const commandSchema = z.strictObject({
  ...envelope,
  action: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('submit') }),
    z.strictObject({
      kind: z.literal('assign'),
      reviewId: objectId,
      expectedReviewRevision: revision,
      reviewerId: objectId,
    }),
    z.strictObject({
      kind: z.literal('decide'),
      reviewId: objectId,
      expectedReviewRevision: revision,
      decision: z.enum(['approve', 'changesRequested', 'reject']),
      feedback: feedbackSchema,
    }),
    z.strictObject({
      kind: z.literal('supersede'),
      reviewId: objectId,
      expectedReviewRevision: revision,
    }),
    z.strictObject({
      kind: z.literal('publish'),
      reviewId: objectId,
      expectedReviewRevision: revision,
      expectedReleaseNumber: revision,
    }),
  ]),
});
export type Command = z.infer<typeof commandSchema>;
export const acknowledgement = z.strictObject({
  courseId: objectId,
  reviewId: objectId,
  reviewRevision: revision,
  releaseId: objectId.nullable(),
  releaseNumber: revision.nullable(),
});
export const pageSchema = z.strictObject({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: objectId.optional(),
});
