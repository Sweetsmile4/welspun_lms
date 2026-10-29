import { Types, type PipelineStage } from 'mongoose';
import {
  activeUnit,
  scopedQuery,
  validGrants,
} from '../authorization/engine.js';
import { deny, type AuthorizationTransaction } from '../authorization/types.js';
import type { User } from '../organization/types.js';

/** Scope predicates are built from authoritative grants and CURRENT ancestry, never client filters. */
export async function managementScope(
  tx: AuthorizationTransaction,
  actor: User,
  kind: 'employee' | 'unit' | 'role' | 'grant',
  now: Date,
): Promise<PipelineStage[]> {
  if (kind === 'employee') return scopedQuery(tx, actor, 'employees', now);
  const action =
    kind === 'unit'
      ? 'unit.read'
      : kind === 'role'
        ? 'role.read'
        : 'grant.read';
  const grants = await validGrants(tx, actor, action, now);
  const org = new Types.ObjectId(actor.organizationId);
  if (grants.some((g) => g.scope.kind === 'organization')) {
    if (kind !== 'unit') return [{ $match: { organizationId: org } }];
  } else if (kind === 'role') return deny();
  const organization = await tx.organization(actor.organizationId);
  const root =
    organization &&
    (await tx.unitByCode(actor.organizationId, null, organization.code));
  if (!root) return deny();
  const units = await tx.subtree(actor.organizationId, root.id);
  if (units.length > 1000) return deny();
  const active = [];
  for (const unit of units) {
    try {
      await activeUnit(tx, actor.organizationId, unit.id);
      active.push(unit);
    } catch {
      /* Exclude inactive ancestry. */
    }
  }
  const clauses: Record<string, unknown>[] = [];
  for (const grant of grants) {
    const scope = grant.scope;
    if (scope.kind !== 'unit' && scope.kind !== 'organization') continue;
    const ids = active
      .filter(
        (u) =>
          scope.kind === 'organization' ||
          u.id === scope.unitId ||
          (scope.includeDescendants && u.ancestorIds.includes(scope.unitId)),
      )
      .map((u) => new Types.ObjectId(u.id));
    if (kind === 'unit') clauses.push({ _id: { $in: ids } });
    else if (scope.kind === 'unit')
      clauses.push({
        'scope.kind': 'unit',
        'scope.unitId': { $in: ids.map((id) => id.toHexString()) },
        ...(!scope.includeDescendants
          ? { 'scope.includeDescendants': false }
          : {}),
        $expr: {
          $and: [
            { $gt: [{ $size: '$_managementMemberships' }, 0] },
            { $setIsSubset: ['$_managementMemberships.orgUnitId', ids] },
          ],
        },
      });
  }
  if (!clauses.length) return deny();
  const pipeline: PipelineStage[] = [{ $match: { organizationId: org } }];
  if (kind === 'grant')
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          pipeline: [{ $match: { organizationId: org, status: 'active' } }],
          as: '_managementUser',
        },
      },
      { $match: { '_managementUser.0': { $exists: true } } },
      {
        $lookup: {
          from: 'memberships',
          let: { owner: '$userId' },
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
          as: '_managementMemberships',
        },
      },
    );
  pipeline.push({ $match: { $or: clauses } });
  if (kind === 'grant')
    pipeline.push({ $unset: ['_managementUser', '_managementMemberships'] });
  return pipeline;
}
