import { z } from 'zod';
import { courseContentSchema } from '@welspun/contracts';
import { createAuthorizationService } from '../../identity/authorization/service.js';
import { validGrants } from '../../identity/authorization/engine.js';
import {
  deny,
  objectId,
  type AuthorizationIdentityProvider,
  type AuthorizationRepository,
  type AuthorizationTransaction as Tx,
} from '../../identity/authorization/types.js';
export const querySchema = z.strictObject({
  search: z.string().trim().max(100).optional(),
  scopeUnitId: objectId.optional(),
  courseId: objectId.optional(),
  cursor: objectId.optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
const lesson = z.strictObject({
  id: objectId,
  title: z.string().max(200),
  description: z.string().max(2000),
  position: z.number().int().nonnegative(),
  content: courseContentSchema,
});
const outline = z.strictObject({
  id: objectId,
  title: z.string().max(200),
  description: z.string().max(2000),
  position: z.number().int().nonnegative(),
  lessons: z.array(lesson).max(20),
});
export const entrySchema = z.strictObject({
  courseId: objectId,
  releaseId: objectId,
  releaseNumber: z.number().int().positive(),
  title: z.string().max(200),
  description: z.string().max(2000),
  code: z.string().max(64),
  scopeUnitId: objectId.nullable(),
  publishedAt: z.iso.datetime(),
  moduleCount: z.number().int().nonnegative(),
  lessonCount: z.number().int().nonnegative(),
});
export const detailSchema = entrySchema.extend({
  modules: z.array(outline).max(20),
});
export type Entry = z.infer<typeof entrySchema>;
export type Query = z.output<typeof querySchema>;
export type CatalogScope = {
  organizationWide: boolean;
  unitIds: string[];
  courseIds: string[];
  activeUnitIds: string[];
  filterUnitIds?: string[];
};
export interface CatalogStore {
  query(
    tx: Tx,
    org: string,
    scope: CatalogScope,
    query: Query,
    details: boolean,
  ): Promise<{ items: unknown[]; total: number; nextCursor: string | null }>;
}
export function createCatalogService(
  repository: AuthorizationRepository,
  store: CatalogStore,
  identity: AuthorizationIdentityProvider,
  options: { isolatedTest: true; clock?: () => Date },
) {
  function guard() {
    if (
      process.env.NODE_ENV !== 'test' ||
      options.isolatedTest !== true ||
      identity.mode !== 'synthetic-test'
    )
      throw new Error('Catalog requires isolated synthetic tests');
  }
  guard();
  const core = createAuthorizationService(repository, identity, options);
  async function run(
    credential: unknown,
    org: string,
    input: z.input<typeof querySchema>,
    details: boolean,
  ) {
    guard();
    const query = querySchema.parse(input);
    return core.within(credential, org, async ({ tx, actor, now }) => {
      const grants = (
        await validGrants(tx, actor, 'course.catalog.read', now)
      ).filter(
        (g) =>
          g.scope.kind !== 'own' &&
          (g.scope.kind !== 'resource' || g.scope.resourceType === 'course'),
      );
      if (!grants.length) return deny();
      const organization = await tx.organization(org),
        root =
          organization && (await tx.unitByCode(org, null, organization.code));
      if (!root || root.status !== 'active') return deny();
      const units = await tx.subtree(org, root.id);
      if (units.length > 1000) return deny();
      const byId = new Map(units.map((u) => [u.id, u]));
      const active = units.filter(
        (u) =>
          u.status === 'active' &&
          u.ancestorIds.every((id) => byId.get(id)?.status === 'active'),
      );
      const scope: CatalogScope = {
        organizationWide: grants.some((g) => g.scope.kind === 'organization'),
        activeUnitIds: active.map((u) => u.id),
        unitIds: [],
        courseIds: [],
      };
      for (const { scope: grant } of grants) {
        if (grant.kind === 'unit')
          scope.unitIds.push(
            ...active
              .filter(
                (u) =>
                  u.id === grant.unitId ||
                  (grant.includeDescendants &&
                    u.ancestorIds.includes(grant.unitId)),
              )
              .map((u) => u.id),
          );
        if (grant.kind === 'resource') scope.courseIds.push(grant.resourceId);
      }
      scope.unitIds = [...new Set(scope.unitIds)];
      if (query.scopeUnitId) {
        if (
          !active.some(
            (u) => u.id === query.scopeUnitId && u.type !== 'organization',
          )
        )
          return deny();
        scope.filterUnitIds = active
          .filter(
            (u) =>
              u.id === query.scopeUnitId ||
              u.ancestorIds.includes(query.scopeUnitId!),
          )
          .map((u) => u.id);
      }
      const result = await store.query(tx, org, scope, query, details);
      return {
        ...result,
        items: result.items.map((row) =>
          (details ? detailSchema : entrySchema).parse(row),
        ),
      };
    });
  }
  return {
    list: (
      credential: unknown,
      org: string,
      query: z.input<typeof querySchema> = {},
    ) => run(credential, org, query, false),
    async details(credential: unknown, org: string, courseId: string) {
      objectId.parse(courseId);
      const result = await run(credential, org, { courseId, limit: 1 }, true);
      if (!result.items[0]) return deny();
      return detailSchema.parse(result.items[0]);
    },
  };
}
