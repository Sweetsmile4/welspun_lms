import { Types, type PipelineStage } from 'mongoose';
import type { User } from '../organization/types.js';
import {
  actionSchema,
  deny,
  objectId,
  scopeSchema,
  type Action,
  type AuthorizationTransaction,
  type ResourceFacts,
  type ResourceResolver,
  type RoleGrant,
  type Scope,
  type Target,
} from './types.js';

const ownActions: readonly Action[] = [
  'course.review.submit',
  'course.review.read',
  'course.release.read',
  'course.draft.read',
  'course.draft.edit',
  'course.draft.archive',
  'membership.read',
  'employee.read',
  'progress.read',
  'assignment.read',
];
export function activeAt(
  row: { validFrom: Date; validTo: Date | null },
  now: Date,
) {
  return row.validFrom <= now && (row.validTo === null || now < row.validTo);
}
export async function activeUnit(
  tx: AuthorizationTransaction,
  org: string,
  id: string,
) {
  if (!objectId.safeParse(id).success) return deny();
  const unit = await tx.unit(org, id);
  if (!unit || unit.status !== 'active') return deny();
  for (const ancestor of unit.ancestorIds) {
    if ((await tx.unit(org, ancestor))?.status !== 'active') return deny();
  }
  return unit;
}
export async function validGrants(
  tx: AuthorizationTransaction,
  actor: User,
  action: Action,
  now: Date,
) {
  if (!actionSchema.safeParse(action).success) return deny();
  const result: RoleGrant[] = [];
  for (const grant of await tx.grants(actor.organizationId, actor.id)) {
    if (
      grant.revokedAt ||
      !activeAt(grant, now) ||
      !scopeSchema.safeParse(grant.scope).success
    )
      continue;
    const role = await tx.role(actor.organizationId, grant.roleDefinitionId);
    if (
      !role ||
      role.status !== 'active' ||
      role.version !== grant.roleVersion ||
      !role.permissions.includes(action)
    )
      continue;
    const latest = await tx.latestRole(actor.organizationId, role.code);
    if (latest?.id !== role.id) continue; // Publishing a new version invalidates old-version grants.
    if (grant.scope.kind === 'unit') {
      const unit = await tx.unit(actor.organizationId, grant.scope.unitId);
      if (!unit || unit.status !== 'active' || unit.type === 'organization')
        continue;
      try {
        await activeUnit(tx, actor.organizationId, unit.id);
      } catch {
        continue;
      }
    }
    result.push(grant);
  }
  return result;
}
export async function resolveResource(
  tx: AuthorizationTransaction,
  org: string,
  target: Target,
  now: Date,
  resolver?: ResourceResolver,
): Promise<ResourceFacts> {
  const base = {
    organizationId: org,
    kind: target.kind,
    unitIds: [] as string[],
    ownerId: null,
    state: 'active' as const,
    editedBy: [] as string[],
  };
  if (target.kind === 'organization') return { ...base, id: org };
  if (!objectId.safeParse(target.id).success) return deny();
  if (target.kind === 'unit') {
    const unit = await activeUnit(tx, org, target.id);
    return { ...base, id: unit.id, unitIds: [unit.id] };
  }
  if (target.kind === 'membership') {
    const membership = await tx.membership(org, target.id);
    if (
      !membership ||
      (await tx.user(org, membership.userId))?.status !== 'active'
    )
      return deny();
    await activeUnit(tx, org, membership.orgUnitId);
    return {
      ...base,
      id: membership.id,
      ownerId: membership.userId,
      unitIds: [membership.orgUnitId],
    };
  }
  if (target.kind === 'user') {
    const user = await tx.user(org, target.id);
    if (!user || user.status !== 'active') return deny();
    const units: string[] = [];
    for (const row of await tx.memberships(org, user.id)) {
      if (activeAt(row, now)) {
        await activeUnit(tx, org, row.orgUnitId);
        units.push(row.orgUnitId);
      }
    }
    return { ...base, id: user.id, ownerId: user.id, unitIds: units };
  }
  const facts = await resolver?.resolve(tx, org, target);
  if (
    !facts ||
    facts.organizationId !== org ||
    facts.id !== target.id ||
    facts.kind !== target.kind ||
    !facts.unitIds.length
  )
    return deny();
  for (const unit of facts.unitIds) await activeUnit(tx, org, unit);
  return facts;
}
export function enforceGlobalPolicy(
  actorId: string,
  action: Action,
  facts: ResourceFacts,
) {
  const kinds: Record<Action, readonly ResourceFacts['kind'][]> = {
    'course.catalog.read': ['course'],
    'course.review.submit': ['course'],
    'course.review.read': ['course'],
    'course.review.assign': ['course'],
    'course.review.decide': ['course'],
    'course.release.publish': ['course'],
    'course.release.read': ['course'],
    'course.draft.create': ['organization', 'unit'],
    'course.draft.read': ['course'],
    'course.draft.edit': ['course'],
    'course.draft.archive': ['course'],
    'organization.manage': ['organization'],
    'unit.manage': ['unit'],
    'unit.read': ['unit'],
    'role.read': ['organization'],
    'grant.read': ['organization', 'unit', 'user'],
    'user.create': ['organization'],
    'membership.read': ['user', 'membership'],
    'membership.manage': ['user', 'unit', 'membership'],
    'employee.read': ['user'],
    'progress.read': ['user'],
    'assignment.read': ['user'],
    'report.read': ['unit', 'organization'],
    'audit.read': ['unit', 'organization', 'course', 'revision'],
    'content.approve': ['revision'],
    'content.publish': ['revision'],
    'security.manage': ['organization', 'unit', 'course', 'revision'],
  };
  if (!kinds[action]?.includes(facts.kind)) return deny();
  if (action === 'content.approve') {
    if (
      facts.kind !== 'revision' ||
      facts.state !== 'review' ||
      facts.editedBy.includes(actorId) ||
      facts.ownerId === actorId
    )
      return deny();
  } else if (action === 'content.publish') {
    const a = facts.approval;
    if (
      facts.kind !== 'revision' ||
      facts.state !== 'approved' ||
      !a ||
      !a.revisionDigest ||
      a.approvedDigest !== a.revisionDigest ||
      !Number.isSafeInteger(a.required) ||
      a.required < 1 ||
      new Set(a.approverIds).size < a.required ||
      a.approverIds.some(
        (id) => facts.editedBy.includes(id) || id === facts.ownerId,
      )
    )
      return deny();
  } else if (
    facts.state !== 'active' &&
    !(
      facts.state === 'archived' &&
      [
        'course.catalog.read',
        'course.draft.read',
        'course.draft.archive',
        'course.review.read',
        'course.release.read',
      ].includes(action)
    )
  )
    return deny();
}
export async function scopeCovers(
  tx: AuthorizationTransaction,
  org: string,
  actorId: string,
  action: Action,
  scope: Scope,
  facts: ResourceFacts,
) {
  if (scope.kind === 'organization') return true;
  if (scope.kind === 'own')
    return ownActions.includes(action) && facts.ownerId === actorId;
  if (scope.kind === 'resource')
    return scope.resourceType === facts.kind && scope.resourceId === facts.id;
  if (!facts.unitIds.length) return false;
  // All authoritative affiliations must fit; mixed-plant records cannot leak through one membership.
  for (const id of facts.unitIds) {
    const unit = await activeUnit(tx, org, id);
    if (
      id !== scope.unitId &&
      !(scope.includeDescendants && unit.ancestorIds.includes(scope.unitId))
    )
      return false;
  }
  return true;
}
export async function authorize(
  tx: AuthorizationTransaction,
  actor: User,
  action: Action,
  target: Target,
  now: Date,
  resolver?: ResourceResolver,
) {
  const facts = await resolveResource(
    tx,
    actor.organizationId,
    target,
    now,
    resolver,
  );
  enforceGlobalPolicy(actor.id, action, facts);
  for (const grant of await validGrants(tx, actor, action, now)) {
    if (
      await scopeCovers(
        tx,
        actor.organizationId,
        actor.id,
        action,
        grant.scope,
        facts,
      )
    )
      return facts;
  }
  return deny();
}

export type QueryDomain =
  | 'employees'
  | 'progress'
  | 'assignments'
  | 'departmentReports'
  | 'plantReports'
  | 'audit';
const queryActions: Record<QueryDomain, Action> = {
  employees: 'employee.read',
  progress: 'progress.read',
  assignments: 'assignment.read',
  departmentReports: 'report.read',
  plantReports: 'report.read',
  audit: 'audit.read',
};
/** Use inside the protected transaction. Stages MUST precede filters, counts, facets and pagination. */
export async function scopedQuery(
  tx: AuthorizationTransaction,
  actor: User,
  domain: QueryDomain,
  now: Date,
): Promise<PipelineStage[]> {
  const action = queryActions[domain];
  if (!action) return deny();
  const grants = await validGrants(tx, actor, action, now);
  const org = new Types.ObjectId(actor.organizationId);
  const employeeDomain = ['employees', 'progress', 'assignments'].includes(
    domain,
  );
  const alternatives: Record<string, unknown>[] = [];
  let orgWide = false;
  for (const grant of grants) {
    const scope = grant.scope;
    if (scope.kind === 'organization') {
      orgWide = true;
      continue;
    }
    if (scope.kind === 'own' && ownActions.includes(action)) {
      alternatives.push({
        [domain === 'employees' ? '_id' : 'userId']: new Types.ObjectId(
          actor.id,
        ),
      });
    } else if (scope.kind === 'unit') {
      const units = scope.includeDescendants
        ? await tx.subtree(actor.organizationId, scope.unitId)
        : [await activeUnit(tx, actor.organizationId, scope.unitId)];
      if (units.length > 1000) return deny();
      const ids: Types.ObjectId[] = [];
      for (const unit of units) {
        try {
          await activeUnit(tx, actor.organizationId, unit.id);
          ids.push(new Types.ObjectId(unit.id));
        } catch {
          /* Exclude inactive subtrees. */
        }
      }
      if (employeeDomain) {
        // A user with memberships outside this grant is excluded, matching object authorization.
        alternatives.push({
          $expr: {
            $and: [
              { $gt: [{ $size: '$_authorizationMemberships' }, 0] },
              { $setIsSubset: ['$_authorizationMemberships.orgUnitId', ids] },
            ],
          },
        });
      } else alternatives.push({ orgUnitId: { $in: ids } });
    } else if (scope.kind === 'resource' && action === 'audit.read') {
      alternatives.push({
        resourceType: scope.resourceType,
        resourceId: new Types.ObjectId(scope.resourceId),
      });
    }
  }
  if (!orgWide && !alternatives.length) return deny();
  const pipeline: PipelineStage[] = [{ $match: { organizationId: org } }];
  const organization = await tx.organization(actor.organizationId);
  const root =
    organization &&
    (await tx.unitByCode(actor.organizationId, null, organization.code));
  if (!root) return deny();
  const allUnits = await tx.subtree(actor.organizationId, root.id);
  if (allUnits.length > 1000) return deny();
  const activeIds: Types.ObjectId[] = [];
  for (const unit of allUnits) {
    try {
      await activeUnit(tx, actor.organizationId, unit.id);
      activeIds.push(new Types.ObjectId(unit.id));
    } catch {
      /* Fail closed for inactive units and ancestors. */
    }
  }
  if (employeeDomain) {
    if (domain === 'employees') pipeline.push({ $match: { status: 'active' } });
    else
      pipeline.push(
        { $match: { authorizationState: 'active' } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: '_authorizationOwner',
            pipeline: [{ $match: { organizationId: org, status: 'active' } }],
          },
        },
        { $match: { '_authorizationOwner.0': { $exists: true } } },
        { $unset: '_authorizationOwner' },
      );
    pipeline.push({
      $lookup: {
        from: 'memberships',
        let: { owner: domain === 'employees' ? '$_id' : '$userId' },
        pipeline: [
          {
            $match: {
              organizationId: org,
              validFrom: { $lte: now },
              $or: [{ validTo: null }, { validTo: { $gt: now } }],
              $expr: { $eq: ['$userId', '$$owner'] },
            },
          },
        ],
        as: '_authorizationMemberships',
      },
    });
    pipeline.push({
      $match: {
        $expr: {
          $setIsSubset: ['$_authorizationMemberships.orgUnitId', activeIds],
        },
      },
    });
  } else
    pipeline.push({
      $match: { authorizationState: 'active', orgUnitId: { $in: activeIds } },
    });
  if (!orgWide) pipeline.push({ $match: { $or: alternatives } });
  if (employeeDomain) pipeline.push({ $unset: '_authorizationMemberships' });
  return pipeline;
}
