import { z } from 'zod';
import type {
  OrganizationRepository,
  OrganizationTransaction,
} from './repository.js';
import {
  OrganizationError,
  type ActorContext,
  type Membership,
  type OrgUnit,
  type UnitType,
} from './types.js';
import { validTimeZone } from './models.js';

const id = z.string().regex(/^[a-f\d]{24}$/i);
const text = z.string().trim().min(1).max(200);
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9_-]{0,63}$/);
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const organizationInput = z.strictObject({
  code,
  name: text,
  timeZone: z.string().refine(validTimeZone),
});
const unitInput = z.strictObject({
  organizationId: id,
  parentId: id,
  type: z.enum(['plant', 'department']),
  code,
  name: text,
  expectedTreeRevision: revision,
});
const moveInput = z.strictObject({
  organizationId: id,
  unitId: id,
  parentId: id,
  expectedTreeRevision: revision,
});
const userInput = z.strictObject({
  organizationId: id,
  identityIssuer: z
    .string()
    .min(1)
    .max(512)
    .refine((value) => value.trim().length > 0),
  identitySubject: z
    .string()
    .min(1)
    .max(256)
    .refine((value) => value.trim().length > 0),
  employeeId: z.string().trim().min(1).max(100).optional(),
  displayName: text,
});
const membershipInput = z.strictObject({
  organizationId: id,
  userId: id,
  orgUnitId: id,
  validFrom: z.date(),
  validTo: z.date().nullable().default(null),
  primary: z.boolean().default(false),
});
const closureInput = z.strictObject({
  organizationId: id,
  membershipId: id,
  expectedRevision: revision,
  validTo: z.date(),
});
const transferInput = z.strictObject({
  organizationId: id,
  membershipId: id,
  expectedRevision: revision,
  targetOrgUnitId: id,
  effectiveAt: z.date(),
});
function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new OrganizationError(
      'VALIDATION',
      'Invalid organization input fields: ' +
        [
          ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
        ].join(', '),
    );
  return result.data;
}
function requireRecord<T>(record: T | null): T {
  if (!record)
    throw new OrganizationError(
      'NOT_FOUND',
      'Record not found in the specified organization',
    );
  return record;
}
export function validateHierarchy(
  type: UnitType,
  parent: OrgUnit,
  unitId?: string,
) {
  if (
    parent.status !== 'active' ||
    type === 'organization' ||
    (type === 'plant' && parent.type !== 'organization') ||
    (type === 'department' && !['plant', 'department'].includes(parent.type))
  )
    throw new OrganizationError(
      'INVALID_HIERARCHY',
      'Invalid parent/child relationship',
    );
  if (unitId && (parent.id === unitId || parent.ancestorIds.includes(unitId)))
    throw new OrganizationError(
      'CYCLE',
      'A unit cannot be moved into its own subtree',
    );
  const ancestors = [...parent.ancestorIds, parent.id];
  if (ancestors.length > 32)
    throw new OrganizationError(
      'LIMIT_EXCEEDED',
      'Maximum hierarchy depth exceeded',
    );
  return ancestors;
}
export function intervalsOverlap(
  a: Pick<Membership, 'validFrom' | 'validTo'>,
  b: Pick<Membership, 'validFrom' | 'validTo'>,
) {
  return (
    a.validFrom.getTime() < (b.validTo?.getTime() ?? Infinity) &&
    b.validFrom.getTime() < (a.validTo?.getTime() ?? Infinity)
  );
}
/** Internal trusted entry point only. Phase 1B.2 must authorize actor + scope before invoking. */
export function createOrganizationService(
  repository: OrganizationRepository,
  clock: () => Date = () => new Date(),
) {
  function metadata(context: ActorContext) {
    const actor = parse(text, context.actorId);
    const now = clock();
    return {
      createdBy: actor,
      updatedBy: actor,
      createdAt: now,
      updatedAt: now,
      revision: 0,
    };
  }
  async function lock(
    tx: OrganizationTransaction,
    organizationId: string,
    context: ActorContext,
    expectedTreeRevision?: number,
  ) {
    const organization = requireRecord(await tx.organization(organizationId));
    if (organization.status !== 'active')
      throw new OrganizationError('VALIDATION', 'Organization is inactive');
    if (
      expectedTreeRevision !== undefined &&
      organization.treeRevision !== expectedTreeRevision
    )
      throw new OrganizationError(
        'STALE_REVISION',
        'Organization tree has changed',
      );
    const updated = await tx.lockOrganization(
      organizationId,
      organization.revision,
      expectedTreeRevision !== undefined,
      parse(text, context.actorId),
      clock(),
    );
    if (!updated)
      throw new OrganizationError(
        'STALE_REVISION',
        'Concurrent organization modification',
      );
    return updated;
  }
  async function movePlan(
    tx: OrganizationTransaction,
    input: z.output<typeof moveInput>,
  ) {
    const unit = requireRecord(
      await tx.unit(input.organizationId, input.unitId),
    );
    const parent = requireRecord(
      await tx.unit(input.organizationId, input.parentId),
    );
    const ancestors = validateHierarchy(unit.type, parent, unit.id);
    if (await tx.unitByCode(input.organizationId, parent.id, unit.code)) {
      if (parent.id !== unit.parentId)
        throw new OrganizationError(
          'DUPLICATE',
          'Unit code already exists under the destination parent',
        );
    }
    const subtree = await tx.subtree(input.organizationId, unit.id);
    if (subtree.length > 1000)
      throw new OrganizationError(
        'LIMIT_EXCEEDED',
        'Move exceeds the atomic subtree limit',
      );
    for (const descendant of subtree) {
      const suffix =
        descendant.id === unit.id
          ? []
          : descendant.ancestorIds.slice(
              descendant.ancestorIds.indexOf(unit.id),
            );
      if (ancestors.length + suffix.length > 32)
        throw new OrganizationError(
          'LIMIT_EXCEEDED',
          'Move exceeds maximum hierarchy depth',
        );
    }
    return { unit, ancestors, subtree };
  }
  async function membershipHistory(organizationId: string, userId: string) {
    parse(id, organizationId);
    parse(id, userId);
    return repository.transaction(async (tx) => {
      requireRecord(await tx.organization(organizationId));
      requireRecord(await tx.user(organizationId, userId));
      return tx.memberships(organizationId, userId);
    });
  }
  return {
    async createOrganization(
      input: z.input<typeof organizationInput>,
      context: ActorContext,
    ) {
      const data = parse(organizationInput, input);
      return repository.transaction(async (tx) => {
        if (await tx.organizationByCode(data.code))
          throw new OrganizationError(
            'DUPLICATE',
            'Organization code already exists',
          );
        const organization = await tx.insertOrganization({
          ...data,
          status: 'active',
          treeRevision: 0,
          ...metadata(context),
        });
        const root = await tx.insertUnit({
          organizationId: organization.id,
          type: 'organization',
          parentId: null,
          ancestorIds: [],
          code: organization.code,
          name: organization.name,
          status: 'active',
          treeRevision: 0,
          ...metadata(context),
        });
        return { organization, root };
      });
    },
    async createUnit(input: z.input<typeof unitInput>, context: ActorContext) {
      const data = parse(unitInput, input);
      return repository.transaction(async (tx) => {
        const organization = await lock(
          tx,
          data.organizationId,
          context,
          data.expectedTreeRevision,
        );
        const parent = requireRecord(
          await tx.unit(data.organizationId, data.parentId),
        );
        const ancestors = validateHierarchy(data.type, parent);
        if (await tx.unitByCode(data.organizationId, data.parentId, data.code))
          throw new OrganizationError(
            'DUPLICATE',
            'Unit code already exists under this parent',
          );
        return tx.insertUnit({
          organizationId: data.organizationId,
          type: data.type,
          parentId: parent.id,
          ancestorIds: ancestors,
          code: data.code,
          name: data.name,
          status: 'active',
          treeRevision: organization.treeRevision,
          ...metadata(context),
        });
      });
    },
    async validateUnitMove(input: z.input<typeof moveInput>) {
      const data = parse(moveInput, input);
      return repository.transaction(async (tx) => {
        const organization = requireRecord(
          await tx.organization(data.organizationId),
        );
        if (organization.status !== 'active')
          throw new OrganizationError('VALIDATION', 'Organization is inactive');
        if (organization.treeRevision !== data.expectedTreeRevision)
          throw new OrganizationError(
            'STALE_REVISION',
            'Organization tree has changed',
          );
        const plan = await movePlan(tx, data);
        return {
          unitId: plan.unit.id,
          ancestorIds: plan.ancestors,
          expectedTreeRevision: organization.treeRevision,
          affectedUnitCount: plan.subtree.length,
        };
      });
    },
    async moveUnit(input: z.input<typeof moveInput>, context: ActorContext) {
      const data = parse(moveInput, input);
      return repository.transaction(async (tx) => {
        const organization = await lock(
          tx,
          data.organizationId,
          context,
          data.expectedTreeRevision,
        );
        const { unit, ancestors, subtree } = await movePlan(tx, data);
        for (const descendant of subtree) {
          const suffix =
            descendant.id === unit.id
              ? []
              : descendant.ancestorIds.slice(
                  descendant.ancestorIds.indexOf(unit.id),
                );
          const nextAncestors = [...ancestors, ...suffix];
          if (nextAncestors.length > 32)
            throw new OrganizationError(
              'LIMIT_EXCEEDED',
              'Move exceeds maximum hierarchy depth',
            );
          const updated = await tx.moveUnit(
            descendant,
            descendant.id === unit.id ? data.parentId : descendant.parentId!,
            nextAncestors,
            organization.treeRevision,
            parse(text, context.actorId),
            clock(),
          );
          if (!updated)
            throw new OrganizationError(
              'STALE_REVISION',
              'Unit changed during movement',
            );
        }
        return requireRecord(await tx.unit(data.organizationId, unit.id));
      });
    },
    async createUser(input: z.input<typeof userInput>, context: ActorContext) {
      const data = parse(userInput, input);
      return repository.transaction(async (tx) => {
        await lock(tx, data.organizationId, context);
        if (
          (await tx.userByIdentity(
            data.organizationId,
            data.identityIssuer,
            data.identitySubject,
          )) ||
          (data.employeeId &&
            (await tx.userByEmployeeId(data.organizationId, data.employeeId)))
        )
          throw new OrganizationError(
            'DUPLICATE',
            'Provisioning identity or employee ID already exists',
          );
        return tx.insertUser({
          ...data,
          status: 'active',
          ...metadata(context),
        });
      });
    },
    async createMembership(
      input: z.input<typeof membershipInput>,
      context: ActorContext,
    ) {
      const data = parse(membershipInput, input);
      if (data.validTo && data.validTo <= data.validFrom)
        throw new OrganizationError(
          'VALIDATION',
          'validTo must follow validFrom',
        );
      return repository.transaction(async (tx) => {
        await lock(tx, data.organizationId, context);
        const user = requireRecord(
          await tx.user(data.organizationId, data.userId),
        );
        const unit = requireRecord(
          await tx.unit(data.organizationId, data.orgUnitId),
        );
        if (
          user.status !== 'active' ||
          unit.status !== 'active' ||
          unit.type === 'organization'
        )
          throw new OrganizationError(
            'VALIDATION',
            'Membership requires an active user and plant/department',
          );
        const existing = await tx.memberships(data.organizationId, data.userId);
        if (
          existing.some(
            (record) =>
              intervalsOverlap(record, data) &&
              (record.orgUnitId === data.orgUnitId ||
                (record.primary && data.primary)),
          )
        )
          throw new OrganizationError(
            'MEMBERSHIP_OVERLAP',
            'Membership intervals conflict',
          );
        return tx.insertMembership({ ...data, ...metadata(context) });
      });
    },
    async closeMembership(
      input: z.input<typeof closureInput>,
      context: ActorContext,
    ) {
      const data = parse(closureInput, input);
      return repository.transaction(async (tx) => {
        await lock(tx, data.organizationId, context);
        const record = requireRecord(
          await tx.membership(data.organizationId, data.membershipId),
        );
        if (record.revision !== data.expectedRevision)
          throw new OrganizationError(
            'STALE_REVISION',
            'Membership has changed',
          );
        if (record.validTo !== null)
          throw new OrganizationError(
            'HISTORY_CLOSED',
            'Closed membership history cannot be rewritten',
          );
        if (data.validTo <= record.validFrom)
          throw new OrganizationError(
            'VALIDATION',
            'Closure must follow validFrom',
          );
        return requireRecord(
          await tx.closeMembership(
            record,
            data.validTo,
            parse(text, context.actorId),
            clock(),
          ),
        );
      });
    },
    async transferMembership(
      input: z.input<typeof transferInput>,
      context: ActorContext,
    ) {
      const data = parse(transferInput, input);
      return repository.transaction(async (tx) => {
        await lock(tx, data.organizationId, context);
        const old = requireRecord(
          await tx.membership(data.organizationId, data.membershipId),
        );
        if (old.revision !== data.expectedRevision)
          throw new OrganizationError(
            'STALE_REVISION',
            'Membership has changed',
          );
        if (old.validTo !== null)
          throw new OrganizationError(
            'HISTORY_CLOSED',
            'Closed membership history cannot be rewritten',
          );
        if (
          data.effectiveAt <= old.validFrom ||
          data.targetOrgUnitId === old.orgUnitId
        )
          throw new OrganizationError(
            'VALIDATION',
            'Invalid membership transfer',
          );
        const user = requireRecord(
          await tx.user(data.organizationId, old.userId),
        );
        const target = requireRecord(
          await tx.unit(data.organizationId, data.targetOrgUnitId),
        );
        if (
          user.status !== 'active' ||
          target.status !== 'active' ||
          target.type === 'organization'
        )
          throw new OrganizationError(
            'VALIDATION',
            'Transfer requires an active user and plant/department',
          );
        const next = {
          organizationId: data.organizationId,
          userId: old.userId,
          orgUnitId: target.id,
          validFrom: data.effectiveAt,
          validTo: null,
          primary: old.primary,
        };
        const history = await tx.memberships(data.organizationId, old.userId);
        if (
          history.some(
            (r) =>
              r.id !== old.id &&
              intervalsOverlap(r, next) &&
              (r.orgUnitId === target.id || (r.primary && next.primary)),
          )
        )
          throw new OrganizationError(
            'MEMBERSHIP_OVERLAP',
            'Transfer conflicts with membership history',
          );
        const closed = requireRecord(
          await tx.closeMembership(
            old,
            data.effectiveAt,
            parse(text, context.actorId),
            clock(),
          ),
        );
        const membership = await tx.insertMembership({
          ...next,
          ...metadata(context),
        });
        return { closed, membership };
      });
    },
    membershipHistory,
    async currentMemberships(
      organizationId: string,
      userId: string,
      at: Date = clock(),
    ) {
      parse(z.date(), at);
      const history = await membershipHistory(organizationId, userId);
      return history.filter(
        (record) =>
          record.validFrom <= at &&
          (record.validTo === null || at < record.validTo),
      );
    },
  };
}
