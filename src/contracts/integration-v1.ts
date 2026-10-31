import { z } from 'zod';
import {
  resourceIdSchema,
  requestIdSchema,
  courseTitleSchema,
  courseDescriptionSchema,
  courseContentSchema,
  courseMetadataSchema,
} from './index.js';

/** Wire representations only. None of these schemas establishes authorization. */
export const idSchema = resourceIdSchema;
export const utcDateSchema = z.iso.datetime({ offset: false }).regex(/Z$/);
export const revisionSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER - 1);
export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/);
const version = z.literal(1);
const count = z.number().int().min(0);
export const sessionSummarySchema = z.strictObject({
  schemaVersion: version,
  user: z.strictObject({ id: idSchema, displayName: courseTitleSchema }),
  expiresAt: utcDateSchema,
});
export const lessonSchema = z.strictObject({
  id: idSchema,
  title: courseTitleSchema,
  description: courseDescriptionSchema,
  position: z.number().int().min(0).max(19),
  content: courseContentSchema,
});
export const moduleSchema = z.strictObject({
  id: idSchema,
  title: courseTitleSchema,
  description: courseDescriptionSchema,
  position: z.number().int().min(0).max(19),
  lessons: z.array(lessonSchema).max(20),
});
const modules = z
  .array(moduleSchema)
  .max(20)
  .superRefine((items, ctx) => {
    const ids = new Set<string>();
    let lessons = 0;
    for (const [position, module] of items.entries()) {
      if (module.position !== position || ids.has(module.id))
        ctx.addIssue({
          code: 'custom',
          message: 'Invalid module order or identity',
        });
      ids.add(module.id);
      for (const [position, lesson] of module.lessons.entries()) {
        if (lesson.position !== position || ids.has(lesson.id))
          ctx.addIssue({
            code: 'custom',
            message: 'Invalid lesson order or identity',
          });
        ids.add(lesson.id);
        lessons++;
      }
    }
    if (lessons > 100)
      ctx.addIssue({ code: 'custom', message: 'Lesson bound exceeded' });
  });
export const draftSummarySchema = z.strictObject({
  schemaVersion: version,
  courseId: idSchema,
  draftId: idSchema,
  code: z.string().regex(/^[A-Z][A-Z0-9_-]{0,63}$/),
  title: courseTitleSchema,
  description: courseDescriptionSchema,
  scopeUnitId: idSchema.nullable(),
  revision: revisionSchema,
  status: z.enum(['draft', 'archived']),
  updatedAt: utcDateSchema,
});
export const draftDetailSchema = draftSummarySchema.extend({
  metadata: courseMetadataSchema,
  modules,
  digest: digestSchema,
});
export const reviewBindingSchema = z.strictObject({
  reviewId: idSchema,
  draftRevision: revisionSchema,
  reviewRevision: revisionSchema,
  digest: digestSchema,
});
export const reviewSummarySchema = z
  .strictObject({
    schemaVersion: version,
    courseId: idSchema,
    draftId: idSchema,
    binding: reviewBindingSchema,
    state: z.enum([
      'submitted',
      'inReview',
      'changesRequested',
      'approved',
      'rejected',
      'superseded',
      'published',
    ]),
    submittedAt: utcDateSchema,
    requiredApprovals: z.number().int().min(1).max(5),
    assignedCount: count.max(5),
    approvedCount: count.max(5),
  })
  .superRefine((r, ctx) => {
    if (
      r.approvedCount > r.assignedCount ||
      r.assignedCount > r.requiredApprovals ||
      (['approved', 'published'].includes(r.state) &&
        r.approvedCount !== r.requiredApprovals)
    )
      ctx.addIssue({ code: 'custom', message: 'Inconsistent approval counts' });
  });
export const feedbackSchema = z.strictObject({
  category: z.enum(['accuracy', 'clarity', 'safety', 'structure']),
  message: courseDescriptionSchema.refine((s) => s.trim().length > 0),
});
/** Only an explicitly authorized feedback projection, not complete private evidence. */
export const decisionSchema = z.strictObject({
  schemaVersion: version,
  reviewId: idSchema,
  decision: z.enum(['approve', 'changesRequested', 'reject']),
  at: utcDateSchema,
  feedback: z.array(feedbackSchema).min(1).max(10),
});
export const reviewerCandidateSchema = z.strictObject({
  schemaVersion: version,
  candidateId: idSchema,
  displayName: courseTitleSchema,
});
export const readinessReasonSchema = z.enum([
  'ACTIVE_DRAFT_REQUIRED',
  'CONTENT_INCOMPLETE',
  'STALE_BINDING',
  'APPROVALS_INCOMPLETE',
  'REVIEWER_UNAVAILABLE',
  'POLICY_MISMATCH',
  'RELEASE_CONFLICT',
]);
export const readinessSchema = z.discriminatedUnion('ready', [
  z.strictObject({
    schemaVersion: version,
    ready: z.literal(true),
    reviewId: idSchema,
    digest: digestSchema,
    nextReleaseNumber: revisionSchema.refine((n) => n > 0),
  }),
  z.strictObject({
    schemaVersion: version,
    ready: z.literal(false),
    reasons: z.array(readinessReasonSchema).min(1).max(7),
  }),
]);
export const releaseHistorySchema = z.strictObject({
  schemaVersion: version,
  releaseId: idSchema,
  courseId: idSchema,
  releaseNumber: revisionSchema.refine((n) => n > 0),
  sourceRevision: revisionSchema,
  digest: digestSchema,
  title: courseTitleSchema,
  publishedAt: utcDateSchema,
  moduleCount: count.max(20),
  lessonCount: count.max(100),
});
export const catalogEntrySchema = z.strictObject({
  schemaVersion: version,
  courseId: idSchema,
  releaseId: idSchema,
  releaseNumber: revisionSchema.refine((n) => n > 0),
  title: courseTitleSchema,
  description: courseDescriptionSchema,
  code: z.string().regex(/^[A-Z][A-Z0-9_-]{0,63}$/),
  scopeUnitId: idSchema.nullable(),
  publishedAt: utcDateSchema,
  moduleCount: count.max(20),
  lessonCount: count.max(100),
});
export const catalogDetailSchema = catalogEntrySchema
  .extend({ modules })
  .superRefine((r, ctx) => {
    if (
      r.moduleCount !== r.modules.length ||
      r.lessonCount !== r.modules.reduce((n, m) => n + m.lessons.length, 0)
    )
      ctx.addIssue({ code: 'custom', message: 'Inconsistent outline counts' });
  });
export const paginationSchema = z.strictObject({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: idSchema.optional(),
});
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.strictObject({
    schemaVersion: version,
    items: z.array(item).max(50),
    nextCursor: idSchema.nullable(),
  });
}
export function successSchema<T extends z.ZodType>(data: T) {
  return z.strictObject({
    data,
    meta: z.strictObject({
      requestId: requestIdSchema,
      nextCursor: idSchema.nullable(),
    }),
  });
}
export const errorDefinitions = {
  INTEGRATION_UNAVAILABLE: {
    status: 503,
    message: 'Integration is unavailable.',
    retry: 'none',
  },
  AUTHENTICATION_REQUIRED: {
    status: 401,
    message: 'Valid authentication is required.',
    retry: 'reauthenticate',
  },
  FORBIDDEN: {
    status: 403,
    message: 'Operation is not authorized.',
    retry: 'none',
  },
  NOT_FOUND: { status: 404, message: 'Resource not found.', retry: 'none' },
  CONFLICT: {
    status: 409,
    message: 'Operation conflicts with current state.',
    retry: 'reconcile',
  },
  DRAFT_CONFLICT: {
    status: 409,
    message: 'Draft revision conflicts with current state.',
    retry: 'reconcile',
  },
  REVIEW_CONFLICT: {
    status: 409,
    message: 'Review preconditions are not satisfied.',
    retry: 'reconcile',
  },
  IDEMPOTENCY_CONFLICT: {
    status: 409,
    message: 'Command key conflicts with the original request.',
    retry: 'reconcile',
  },
  VALIDATION_ERROR: {
    status: 422,
    message: 'Invalid request fields.',
    retry: 'correct-input',
  },
  PRECONDITION_REQUIRED: {
    status: 428,
    message: 'A revision precondition is required.',
    retry: 'correct-input',
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    message: 'Request body exceeds limit.',
    retry: 'correct-input',
  },
  MALFORMED_JSON: {
    status: 400,
    message: 'Malformed JSON body.',
    retry: 'correct-input',
  },
  UNSUPPORTED_ENCODING: {
    status: 415,
    message: 'Request encoding is not supported.',
    retry: 'correct-input',
  },
  RATE_LIMITED: {
    status: 429,
    message: 'Too many requests.',
    retry: 'same-intent',
  },
  DEPENDENCY_UNAVAILABLE: {
    status: 503,
    message: 'Required service is unavailable.',
    retry: 'same-intent',
  },
  SECURITY_AUDIT_UNAVAILABLE: {
    status: 503,
    message: 'Security verification is unavailable.',
    retry: 'same-intent',
  },
  REPLAY_UNAVAILABLE: {
    status: 503,
    message: 'Stored command replay requires reconciliation.',
    retry: 'reconcile',
  },
  INTERNAL_ERROR: {
    status: 500,
    message: 'An unexpected error occurred.',
    retry: 'reconcile',
  },
} as const;
export type ErrorCode = keyof typeof errorDefinitions;
export const errorCodeSchema = z.enum(
  Object.keys(errorDefinitions) as [ErrorCode, ...ErrorCode[]],
);
export const safeErrorEnvelopeSchema = z
  .strictObject({
    error: z.strictObject({
      code: errorCodeSchema,
      message: courseDescriptionSchema,
      details: z
        .array(
          z.strictObject({
            field: z.enum([
              'title',
              'description',
              'content',
              'metadata',
              'revision',
              'digest',
              'headers',
            ]),
            code: z.enum(['INVALID', 'REQUIRED', 'CONFLICT']),
          }),
        )
        .max(20),
    }),
    requestId: requestIdSchema,
  })
  .refine(
    (r) => r.error.message === errorDefinitions[r.error.code].message,
    'Unsupported public error message',
  );
export type SafeErrorEnvelope = z.infer<typeof safeErrorEnvelopeSchema>;
export const unavailableSchema = z.strictObject({
  available: z.literal(false),
  code: z.literal('INTEGRATION_UNAVAILABLE'),
  message: z.literal('Integration is unavailable.'),
  retry: z.literal('none'),
});
export type Unavailable = z.infer<typeof unavailableSchema>;
export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export type DraftSummary = z.infer<typeof draftSummarySchema>;
export type DraftDetail = z.infer<typeof draftDetailSchema>;
export type Module = z.infer<typeof moduleSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type ReviewSummary = z.infer<typeof reviewSummarySchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type ReviewerCandidate = z.infer<typeof reviewerCandidateSchema>;
export type Readiness = z.infer<typeof readinessSchema>;
export type ReleaseHistory = z.infer<typeof releaseHistorySchema>;
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export type CatalogDetail = z.infer<typeof catalogDetailSchema>;

const commandHeaders = {
  schemaVersion: version,
  idempotencyKey: idempotencyKeySchema,
  requestId: requestIdSchema,
};
export const commandMetadataSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({ ...commandHeaders, kind: z.literal('create') }),
    z.strictObject({
      ...commandHeaders,
      kind: z.literal('draft'),
      expectedDraftRevision: revisionSchema,
    }),
    z.strictObject({
      ...commandHeaders,
      kind: z.literal('review'),
      expectedDraftRevision: revisionSchema,
      binding: reviewBindingSchema,
    }),
    z.strictObject({
      ...commandHeaders,
      kind: z.literal('publish'),
      expectedDraftRevision: revisionSchema,
      binding: reviewBindingSchema,
      expectedReleaseNumber: revisionSchema,
    }),
  ])
  .refine(
    (c) =>
      !('binding' in c) || c.binding.draftRevision === c.expectedDraftRevision,
    'Conflicting revision bindings',
  );
export type CommandMetadata = z.infer<typeof commandMetadataSchema>;
export const transportLimits = Object.freeze({
  draftAggregateBytes: 256 * 1024,
  commandBodyBytes: 300 * 1024,
  smallBodyBytes: 16 * 1024,
  pageSize: 50,
  maxAttempts: 3,
  maxBackoffMs: 2000,
});
/** A future route policy; does not change current Express middleware. */
export const privateResponseHeaders = Object.freeze({
  'cache-control': 'private, no-store',
});
