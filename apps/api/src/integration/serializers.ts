import { Types } from 'mongoose';
import { z } from 'zod';
import * as wire from '@welspun/contracts/integration/v1';
import {
  snapshotSchema,
  releaseSchema,
  reviewSchema,
  evidenceSchema,
  contentDigest,
} from '../modules/catalog/publishing/contracts.js';

export class PublicSerializationError extends Error {
  readonly code = 'PUBLIC_SERIALIZATION_UNAVAILABLE';
  constructor() {
    super('Public response serialization is unavailable.');
  }
}
function safely<T>(work: () => T): T {
  try {
    return work();
  } catch {
    throw new PublicSerializationError();
  }
}
function plain(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    throw new PublicSerializationError();
}
/** Explicit scalar conversions, never generic toJSON()/toString() traversal. */
export function serializeId(value: unknown): string {
  return safely(() =>
    wire.idSchema.parse(
      value instanceof Types.ObjectId ? value.toHexString() : value,
    ),
  );
}
export function serializeDate(value: unknown): string {
  return safely(() =>
    wire.utcDateSchema.parse(
      value instanceof Date ? Date.prototype.toISOString.call(value) : value,
    ),
  );
}
function outline(modules: z.infer<typeof snapshotSchema>['draft']['modules']) {
  return modules.map((m) => ({
    id: serializeId(m.id),
    title: m.title,
    description: m.description,
    position: m.position,
    lessons: m.lessons.map((l) => ({
      id: serializeId(l.id),
      title: l.title,
      description: l.description,
      position: l.position,
      content: l.content,
    })),
  }));
}
function snapshot(value: unknown) {
  plain(value);
  return snapshotSchema.parse(value);
}
function release(value: unknown) {
  plain(value);
  return releaseSchema.parse(value);
}
function draftSummary(s: z.infer<typeof snapshotSchema>) {
  return {
    schemaVersion: 1 as const,
    courseId: s.course.id,
    draftId: s.draft.id,
    code: s.course.code,
    title: s.draft.title,
    description: s.draft.description,
    scopeUnitId: s.course.scopeUnitId,
    revision: s.draft.revision,
    status: s.draft.status,
    updatedAt: serializeDate(s.draft.updatedAt),
  };
}
export function serializeDraftSummary(value: unknown): wire.DraftSummary {
  return safely(() =>
    wire.draftSummarySchema.parse(draftSummary(snapshot(value))),
  );
}
export function serializeDraftDetail(value: unknown): wire.DraftDetail {
  return safely(() => {
    const s = snapshot(value);
    return wire.draftDetailSchema.parse({
      ...draftSummary(s),
      metadata: s.draft.metadata,
      modules: outline(s.draft.modules),
      digest: contentDigest(s),
    });
  });
}
export function serializeSession(value: unknown): wire.SessionSummary {
  return safely(() => {
    plain(value);
    const s = z
      .strictObject({
        userId: wire.idSchema,
        displayName: z.string(),
        expiresAt: z.date(),
      })
      .parse(value);
    return wire.sessionSummarySchema.parse({
      schemaVersion: 1,
      user: { id: s.userId, displayName: s.displayName },
      expiresAt: serializeDate(s.expiresAt),
    });
  });
}
/** Caller must already authorize the exact review and evidence scope. No directory lookup occurs. */
export function serializeReview(
  value: unknown,
  rows: unknown,
): wire.ReviewSummary {
  return safely(() => {
    plain(value);
    const r = reviewSchema.parse(value),
      evidence = z.array(evidenceSchema).max(11).parse(rows);
    const seen = new Set<string>();
    for (const e of evidence) {
      if (
        seen.has(e.id) ||
        !r.evidenceIds.includes(e.id) ||
        e.reviewId !== r.id ||
        e.courseId !== r.courseId ||
        e.organizationId !== r.organizationId ||
        e.draftId !== r.draftId ||
        e.draftRevision !== r.draftRevision ||
        e.digest !== r.digest
      )
        throw new Error();
      seen.add(e.id);
    }
    if (seen.size !== r.evidenceIds.length) throw new Error();
    return wire.reviewSummarySchema.parse({
      schemaVersion: 1,
      courseId: r.courseId,
      draftId: r.draftId,
      binding: {
        reviewId: r.id,
        draftRevision: r.draftRevision,
        reviewRevision: r.revision,
        digest: r.digest,
      },
      state: r.state,
      submittedAt: serializeDate(r.submittedAt),
      requiredApprovals: r.policy.requiredApprovals,
      assignedCount: r.reviewers.length,
      approvedCount: evidence.filter((e) => e.kind === 'approve').length,
    });
  });
}
/** Feedback disclosure must be separately authorized; strips actor identity and all private binding evidence. */
export function serializeDecision(value: unknown): wire.Decision {
  return safely(() => {
    plain(value);
    const e = evidenceSchema.parse(value);
    return wire.decisionSchema.parse({
      schemaVersion: 1,
      reviewId: e.reviewId,
      decision: e.kind,
      at: serializeDate(e.at),
      feedback: e.feedback,
    });
  });
}
/** Accepts ONLY an already-authorized minimal candidate projection, never an unrestricted User. */
export function serializeReviewerCandidate(
  value: unknown,
): wire.ReviewerCandidate {
  return safely(() => {
    plain(value);
    const c = z
      .strictObject({ id: wire.idSchema, displayName: z.string() })
      .parse(value);
    return wire.reviewerCandidateSchema.parse({
      schemaVersion: 1,
      candidateId: c.id,
      displayName: c.displayName,
    });
  });
}
export function serializeReadiness(value: unknown): wire.Readiness {
  return safely(() => {
    plain(value);
    const s = z
      .strictObject({
        ready: z.literal(true),
        reviewId: wire.idSchema,
        digest: wire.digestSchema,
        nextReleaseNumber: wire.revisionSchema.refine((n) => n > 0),
      })
      .parse(value);
    return wire.readinessSchema.parse({ schemaVersion: 1, ...s });
  });
}
/** Does not manufacture a failure checklist from private exceptions. Reasons require a future reviewed adapter. */
export function serializeReleaseHistory(value: unknown): wire.ReleaseHistory {
  return safely(() => {
    const r = release(value);
    return wire.releaseHistorySchema.parse({
      schemaVersion: 1,
      releaseId: r.id,
      courseId: r.courseId,
      releaseNumber: r.number,
      sourceRevision: r.draftRevision,
      digest: r.digest,
      title: r.snapshot.draft.title,
      publishedAt: serializeDate(r.publishedAt),
      moduleCount: r.snapshot.draft.modules.length,
      lessonCount: r.snapshot.draft.modules.reduce(
        (n, m) => n + m.lessons.length,
        0,
      ),
    });
  });
}
function catalog(r: z.infer<typeof releaseSchema>) {
  const d = r.snapshot.draft;
  return {
    schemaVersion: 1 as const,
    courseId: r.courseId,
    releaseId: r.id,
    releaseNumber: r.number,
    title: d.title,
    description: d.description,
    code: r.snapshot.course.code,
    scopeUnitId: r.scopeUnitId,
    publishedAt: serializeDate(r.publishedAt),
    moduleCount: d.modules.length,
    lessonCount: d.modules.reduce((n, m) => n + m.lessons.length, 0),
  };
}
export function serializeCatalogEntry(value: unknown): wire.CatalogEntry {
  return safely(() => wire.catalogEntrySchema.parse(catalog(release(value))));
}
export function serializeCatalogDetail(value: unknown): wire.CatalogDetail {
  return safely(() => {
    const r = release(value);
    return wire.catalogDetailSchema.parse({
      ...catalog(r),
      modules: outline(r.snapshot.draft.modules),
    });
  });
}
