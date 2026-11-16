import { createCourseDraftService } from '../src/modules/catalog/drafts/service.js';
import type { DraftStore } from '../src/modules/catalog/drafts/repository.js';
import type { Course, Draft } from '../src/modules/catalog/drafts/contracts.js';
import type {
  AuthorizationRepository,
  AuthorizationTransaction,
} from '../src/modules/identity/authorization/types.js';
import type {
  ManagementStore,
  Receipt,
  ReceiptKey,
} from '../src/modules/identity/management/store.js';
import type {
  SecurityAuditEvent,
  TransactionalSecurityAudit,
} from '../src/platform/security-audit.js';
import { memoryAuthorizationRepository } from './authorization-memory.js';
import { authorizationFixture, now } from './authorization-scenarios.js';
import type { PublishingStore } from '../src/modules/catalog/publishing/repository.js';
import type { CatalogStore } from '../src/modules/catalog/discovery/service.js';
import type {
  Review,
  Evidence,
  Release,
} from '../src/modules/catalog/publishing/contracts.js';

export interface CourseHarness {
  catalog?: CatalogStore;
  publishing?: PublishingStore;
  repository: AuthorizationRepository;
  store: DraftStore;
  receipts: Pick<ManagementStore, 'receipt' | 'saveReceipt'>;
  audit: TransactionalSecurityAudit;
  events(org: string): Promise<number>;
  receiptCount(org: string): Promise<number>;
  disable(id: string): Promise<void>;
}
export async function courseFixture(h: CourseHarness) {
  const f = await authorizationFixture(h.repository);
  const service = createCourseDraftService(
    h.repository,
    h.store,
    h.receipts,
    f.provider,
    h.audit,
    { isolatedTest: true, clock: () => now },
  );
  return { ...f, service };
}
export function memoryCourseHarness(): CourseHarness {
  const base = memoryAuthorizationRepository();
  let state = {
    courses: [] as Course[],
    drafts: [] as Draft[],
    receipts: [] as Receipt[],
    events: [] as SecurityAuditEvent[],
    reviews: [] as Review[],
    evidence: [] as Evidence[],
    releases: [] as Release[],
  };
  const contexts = new WeakMap<AuthorizationTransaction, typeof state>();
  const context = (tx: AuthorizationTransaction) => {
    const value = contexts.get(tx);
    if (!value) throw new Error('No transaction');
    return value;
  };
  const repository: AuthorizationRepository = {
    transaction: (work) =>
      base.repository.transaction(async (tx) => {
        const current = structuredClone(state);
        contexts.set(tx, current);
        const result = await work(tx);
        state = current;
        return result;
      }),
  };
  const keyMatches = (row: Receipt, key: ReceiptKey) =>
    Object.entries(key).every(([k, v]) => row[k as keyof Receipt] === v);
  return {
    repository,
    catalog: {
      async query(tx, org, scope, query, details) {
        const s = context(tx),
          latest = new Map<string, Release>();
        for (const row of s.releases) {
          const course = s.courses.find(
            (c) => c.organizationId === org && c.id === row.courseId,
          );
          if (
            row.organizationId !== org ||
            row.lifecycle !== 'published' ||
            !course ||
            row.snapshot.course.scopeUnitId !== course.scopeUnitId ||
            (course.scopeUnitId !== null &&
              !scope.activeUnitIds.includes(course.scopeUnitId)) ||
            (!scope.organizationWide &&
              !scope.courseIds.includes(course.id) &&
              !scope.unitIds.includes(course.scopeUnitId ?? '')) ||
            (scope.filterUnitIds &&
              !scope.filterUnitIds.includes(course.scopeUnitId ?? ''))
          )
            continue;
          if (
            !latest.has(row.courseId) ||
            latest.get(row.courseId)!.number < row.number
          )
            latest.set(row.courseId, row);
        }
        const rows = [...latest.values()]
          .filter(
            (r) =>
              (!query.courseId || r.courseId === query.courseId) &&
              (!query.search ||
                `${r.snapshot.draft.title} ${r.snapshot.course.code}`
                  .toLowerCase()
                  .includes(query.search.toLowerCase())),
          )
          .sort((a, b) => a.courseId.localeCompare(b.courseId));
        const page = rows
          .filter((r) => !query.cursor || r.courseId > query.cursor)
          .slice(0, query.limit + 1);
        return {
          total: rows.length,
          nextCursor:
            page.length > query.limit ? page[query.limit - 1]!.courseId : null,
          items: page.slice(0, query.limit).map((r) => ({
            courseId: r.courseId,
            releaseId: r.id,
            releaseNumber: r.number,
            title: r.snapshot.draft.title,
            description: r.snapshot.draft.description,
            code: r.snapshot.course.code,
            scopeUnitId: r.scopeUnitId,
            publishedAt: r.publishedAt.toISOString(),
            moduleCount: r.snapshot.draft.modules.length,
            lessonCount: r.snapshot.draft.modules.reduce(
              (n, m) => n + m.lessons.length,
              0,
            ),
            ...(details
              ? {
                  modules: r.snapshot.draft.modules.map((m) => ({
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    position: m.position,
                    lessons: m.lessons.map((l) => ({
                      id: l.id,
                      title: l.title,
                      description: l.description,
                      position: l.position,
                      content: structuredClone(l.content),
                    })),
                  })),
                }
              : {}),
          })),
        };
      },
    },
    publishing: {
      review: async (tx, org, id) =>
        context(tx).reviews.find(
          (r) => r.organizationId === org && r.id === id,
        ) ?? null,
      insertReview: async (tx, row) => {
        const s = context(tx);
        if (
          s.reviews.some(
            (r) =>
              r.organizationId === row.organizationId &&
              r.courseId === row.courseId &&
              r.draftId === row.draftId &&
              r.draftRevision === row.draftRevision,
          )
        )
          throw new Error('Duplicate review revision');
        s.reviews.push(structuredClone(row));
      },
      replaceReview: async (tx, row, expected) => {
        const s = context(tx),
          index = s.reviews.findIndex(
            (r) =>
              r.organizationId === row.organizationId &&
              r.id === row.id &&
              r.revision === expected,
          );
        if (index < 0) return false;
        s.reviews[index] = structuredClone(row);
        return true;
      },
      appendEvidence: async (tx, row) => {
        const s = context(tx);
        if (
          s.evidence.some(
            (r) =>
              r.id === row.id ||
              (r.reviewId === row.reviewId &&
                r.actorId === row.actorId &&
                ['approve', 'changesRequested', 'reject'].includes(r.kind) &&
                ['approve', 'changesRequested', 'reject'].includes(row.kind)),
          )
        )
          throw new Error('Duplicate review evidence');
        s.evidence.push(structuredClone(row));
      },
      evidence: async (tx, org, review) =>
        structuredClone(
          context(tx).evidence.filter(
            (r) => r.organizationId === org && r.reviewId === review,
          ),
        ),
      release: async (tx, org, id) =>
        structuredClone(
          context(tx).releases.find(
            (r) => r.organizationId === org && r.id === id,
          ) ?? null,
        ),
      appendRelease: async (tx, row) => {
        const s = context(tx);
        if (
          s.releases.some(
            (r) =>
              r.organizationId === row.organizationId &&
              r.courseId === row.courseId &&
              (r.number === row.number ||
                (r.draftRevision === row.draftRevision &&
                  r.draftId === row.draftId)),
          )
        )
          throw new Error('Duplicate release');
        s.releases.push(structuredClone(row));
      },
      latestNumber: async (tx, org, course) =>
        Math.max(
          0,
          ...context(tx)
            .releases.filter(
              (r) => r.organizationId === org && r.courseId === course,
            )
            .map((r) => r.number),
        ),
      reviews: async (tx, org, course, limit, cursor) =>
        structuredClone(
          context(tx)
            .reviews.filter(
              (r) =>
                r.organizationId === org &&
                r.courseId === course &&
                (!cursor || r.id > cursor),
            )
            .sort((a, b) => a.id.localeCompare(b.id))
            .slice(0, limit),
        ),
      releases: async (tx, org, course, limit, cursor) =>
        structuredClone(
          context(tx)
            .releases.filter(
              (r) =>
                r.organizationId === org &&
                r.courseId === course &&
                (!cursor || r.id > cursor),
            )
            .sort((a, b) => a.id.localeCompare(b.id))
            .slice(0, limit),
        ),
    },
    disable: base.disable,
    store: {
      course: async (tx, org, id) =>
        context(tx).courses.find(
          (row) => row.organizationId === org && row.id === id,
        ) ?? null,
      draft: async (tx, org, id) =>
        context(tx).drafts.find(
          (row) => row.organizationId === org && row.courseId === id,
        ) ?? null,
      insert: async (tx, course, draft) => {
        const s = context(tx);
        if (
          s.courses.some(
            (row) =>
              row.organizationId === course.organizationId &&
              row.code === course.code,
          )
        )
          throw new Error('Duplicate course');
        s.courses.push(course);
        s.drafts.push(draft);
      },
      replace: async (tx, draft, expected) => {
        const s = context(tx);
        const i = s.drafts.findIndex(
          (row) =>
            row.organizationId === draft.organizationId &&
            row.courseId === draft.courseId &&
            row.revision === expected &&
            row.status === 'draft',
        );
        if (i < 0) return false;
        s.drafts[i] = draft;
        return true;
      },
    },
    receipts: {
      receipt: async (tx, key) =>
        context(tx).receipts.find((row) => keyMatches(row, key)) ?? null,
      saveReceipt: async (tx, row) => {
        if (context(tx).receipts.some((r) => keyMatches(r, row)))
          throw new Error('Duplicate receipt');
        context(tx).receipts.push(row);
      },
    },
    audit: {
      durability: 'isolated-test',
      append: async (tx, event) => {
        context(tx).events.push(event);
      },
    },
    events: async (org) =>
      state.events.filter((row) => row.organizationId === org).length,
    receiptCount: async (org) =>
      state.receipts.filter((row) => row.organizationId === org).length,
  };
}
