import { z } from 'zod';
import type { PipelineStage } from 'mongoose';
import { createOrganizationService } from '../organization/service.js';
import type { User } from '../organization/types.js';
import { HttpError } from '../../../platform/errors.js';
import {
  securityEvent,
  type MutationAuditContext,
  type SecurityAuditEvent,
} from '../../../platform/security-audit.js';
import {
  activeUnit,
  authorize,
  scopeCovers,
  scopedQuery,
  validGrants,
  resolveResource,
  type QueryDomain,
} from './engine.js';
import {
  actionSchema,
  deny,
  objectId,
  scopeSchema,
  type Action,
  type AuthorizationIdentityProvider,
  type AuthorizationRepository,
  type AuthorizationTransaction,
  type ResourceResolver,
  type Target,
} from './types.js';

const roleInput = z.strictObject({
  code: z.string().regex(/^[A-Z][A-Z0-9_-]{0,63}$/),
  version: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  permissions: z
    .array(actionSchema)
    .min(1)
    .max(50)
    .refine((v) => new Set(v).size === v.length),
  status: z.enum(['active', 'inactive']),
});
const grantInput = z.strictObject({
  userId: objectId,
  roleDefinitionId: objectId,
  scope: scopeSchema,
  validFrom: z.date(),
  validTo: z.date().nullable(),
});
type OrganizationService = ReturnType<typeof createOrganizationService>;
const authorizationServices = new WeakSet<object>();
export function assertAuthorizationService(value: unknown) {
  if (!value || typeof value !== 'object' || !authorizationServices.has(value))
    throw new Error('Protected authorization service required');
}
/** Server composition only. No production provider is supplied by this phase. */
export function createAuthorizationService(
  repository: AuthorizationRepository,
  identity: AuthorizationIdentityProvider,
  options: {
    isolatedTest?: boolean;
    resolver?: ResourceResolver;
    clock?: () => Date;
    mutationAudit?: MutationAuditContext;
    requireMutationAudit?: boolean;
  } = {},
) {
  if (
    identity.mode === 'synthetic-test' &&
    (process.env.NODE_ENV !== 'test' || options.isolatedTest !== true)
  )
    throw new Error(
      'Synthetic authorization identities require isolated tests',
    );
  const clock = options.clock ?? (() => new Date());
  function requireAudit() {
    const audit = options.mutationAudit;
    if (
      ((options.requireMutationAudit ||
        process.env.NODE_ENV === 'production') &&
        !audit) ||
      (process.env.NODE_ENV === 'production' &&
        audit?.sink.durability !== 'transactional-persistent') ||
      (audit?.sink.durability === 'isolated-test' &&
        (process.env.NODE_ENV !== 'test' || options.isolatedTest !== true))
    )
      throw new HttpError(
        503,
        'SECURITY_AUDIT_UNAVAILABLE',
        'Transactional security audit is unavailable',
      );
  }
  async function mutationAudit(
    tx: AuthorizationTransaction,
    actor: User,
    credential: unknown,
    type: SecurityAuditEvent['type'],
    record: unknown,
    now: Date,
  ) {
    requireAudit();
    const audit = options.mutationAudit;
    if (!audit) return;
    const row = record as { id?: string; membership?: { id: string } };
    try {
      await audit.sink.append(
        tx,
        securityEvent(
          {
            requestId: audit.requestId(credential),
            type,
            outcome: 'allowed',
            organizationId: actor.organizationId,
            actorId: actor.id,
            resourceId: row.id ?? row.membership?.id,
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
  }
  async function run<T>(
    credential: unknown,
    organizationId: string,
    work: (tx: AuthorizationTransaction, actor: User, now: Date) => Promise<T>,
  ): Promise<T> {
    if (
      !objectId.safeParse(organizationId).success ||
      identity.mode === 'disabled'
    )
      return deny();
    return repository.transaction(async (tx) => {
      // Re-resolve on every retry; raw actorId/roles in request objects have no authority.
      if (
        identity.mode === 'synthetic-test' &&
        (process.env.NODE_ENV !== 'test' || !options.isolatedTest)
      )
        return deny();
      const verified = await identity.authenticate(credential);
      if (
        !verified ||
        !verified.issuer ||
        !verified.subject ||
        (verified.synthetic && identity.mode !== 'synthetic-test') ||
        (!verified.synthetic && identity.mode === 'synthetic-test')
      )
        return deny();
      const actor = await tx.userByIdentity(
        organizationId,
        verified.issuer,
        verified.subject,
      );
      const org = await tx.organization(organizationId);
      if (
        !actor ||
        actor.status !== 'active' ||
        !org ||
        org.status !== 'active'
      )
        return deny();
      const now = clock();
      if (!Number.isFinite(now.getTime())) return deny();
      // Shared write fence makes stale snapshot readers conflict with compliant revocations/moves/disable writes.
      if (
        !(await tx.lockOrganization(org.id, org.revision, false, actor.id, now))
      )
        return deny();
      return work(tx, actor, now);
    });
  }
  const check = (
    tx: AuthorizationTransaction,
    actor: User,
    action: Action,
    target: Target,
    now: Date,
  ) => authorize(tx, actor, action, target, now, options.resolver);
  // Concrete wrappers deliberately keep credentials out of attribution parameters.
  async function withService<T>(
    credential: unknown,
    org: string,
    action: Action,
    targets: Target[],
    work: (
      service: OrganizationService,
      actorId: string,
      tx: AuthorizationTransaction,
      actor: User,
      now: Date,
    ) => Promise<T>,
    mutation?: SecurityAuditEvent['type'],
  ) {
    return run(credential, org, async (tx, actor, now) => {
      if (mutation) requireAudit();
      for (const target of targets) await check(tx, actor, action, target, now);
      const result = await work(
        createOrganizationService(
          { transaction: (callback) => callback(tx) },
          () => now,
        ),
        actor.id,
        tx,
        actor,
        now,
      );
      if (mutation)
        await mutationAudit(tx, actor, credential, mutation, result, now);
      return result;
    });
  }
  async function grantPlan(
    tx: AuthorizationTransaction,
    actor: User,
    org: string,
    now: Date,
    value: z.output<typeof grantInput>,
  ) {
    if (
      value.userId === actor.id ||
      (value.validTo !== null && value.validTo <= now) ||
      (value.validTo && value.validTo <= value.validFrom)
    )
      return deny();
    if ((await tx.user(org, value.userId))?.status !== 'active') return deny();
    const role = await tx.role(org, value.roleDefinitionId);
    if (
      !role ||
      role.status !== 'active' ||
      (await tx.latestRole(org, role.code))?.id !== role.id
    )
      return deny();
    const scope = value.scope;
    const target: Target =
      scope.kind === 'unit'
        ? { kind: 'unit', id: scope.unitId }
        : scope.kind === 'resource'
          ? { kind: scope.resourceType, id: scope.resourceId }
          : { kind: 'organization' };
    if (
      scope.kind === 'unit' &&
      (await activeUnit(tx, org, scope.unitId)).type === 'organization'
    )
      return deny();
    await check(tx, actor, 'security.manage', target, now);
    // Delegation is bounded by an EXISTING authority grant for every action and time window.
    for (const action of new Set<Action>([
      'security.manage',
      ...role.permissions,
    ])) {
      const candidates = await validGrants(tx, actor, action, now);
      let covered = false;
      for (const parent of candidates) {
        if (
          parent.validFrom > value.validFrom ||
          (parent.validTo && (!value.validTo || parent.validTo < value.validTo))
        )
          continue;
        if (scope.kind === 'own') {
          if (parent.scope.kind === 'organization') covered = true;
          continue;
        }
        if (scope.kind === 'organization') {
          if (parent.scope.kind === 'organization') covered = true;
          continue;
        }
        const facts = await checkFacts(tx, org, target, now);
        if (
          scope.kind === 'unit' &&
          scope.includeDescendants &&
          parent.scope.kind === 'unit' &&
          !parent.scope.includeDescendants
        )
          continue;
        if (await scopeCovers(tx, org, actor.id, action, parent.scope, facts))
          covered = true;
      }
      if (!covered) return deny();
    }
    return role;
  }
  const service = {
    /** Trusted backend composition only: extend work in the SAME fenced transaction. Never expose callbacks through HTTP. */
    within<T>(
      credential: unknown,
      org: string,
      work: (context: {
        tx: AuthorizationTransaction;
        actor: User;
        now: Date;
        assert: (action: Action, target: Target) => Promise<void>;
      }) => Promise<T>,
    ): Promise<T> {
      return run(credential, org, async (tx, actor, now) =>
        work({
          tx,
          actor,
          now,
          assert: async (action, target) => {
            await check(tx, actor, action, target, now);
          },
        }),
      );
    },
    async check(
      credential: unknown,
      org: string,
      action: Action,
      target: Target,
    ) {
      return run(credential, org, async (tx, actor, now) => {
        await check(tx, actor, action, target, now);
        return { allowed: true as const };
      });
    },
    /** Consumer executes constrained DB work inside the same transaction; do not return/reuse plans. */
    async query<T>(
      credential: unknown,
      org: string,
      domain: QueryDomain,
      consume: (
        tx: AuthorizationTransaction,
        stages: PipelineStage[],
      ) => Promise<T>,
    ) {
      return run(credential, org, async (tx, actor, now) =>
        consume(tx, await scopedQuery(tx, actor, domain, now)),
      );
    },
    createUnit(
      credential: unknown,
      input: Parameters<OrganizationService['createUnit']>[0],
    ) {
      return withService(
        credential,
        input.organizationId,
        'unit.manage',
        [{ kind: 'unit', id: input.parentId }],
        (s, actorId) => s.createUnit(input, { actorId }),
        'unit.created',
      );
    },
    createUser(
      credential: unknown,
      input: Parameters<OrganizationService['createUser']>[0],
    ) {
      return withService(
        credential,
        input.organizationId,
        'user.create',
        [{ kind: 'organization' }],
        (s, actorId) => s.createUser(input, { actorId }),
        'employee.provisioned',
      );
    },
    moveUnit(
      credential: unknown,
      input: Parameters<OrganizationService['moveUnit']>[0],
    ) {
      return withService(
        credential,
        input.organizationId,
        'unit.manage',
        [
          { kind: 'unit', id: input.unitId },
          { kind: 'unit', id: input.parentId },
        ],
        async (s, actorId, tx, actor, now) => {
          for (const unit of await tx.subtree(
            input.organizationId,
            input.unitId,
          ))
            await check(
              tx,
              actor,
              'unit.manage',
              { kind: 'unit', id: unit.id },
              now,
            );
          return s.moveUnit(input, { actorId });
        },
        'unit.moved',
      );
    },
    validateUnitMove(
      credential: unknown,
      input: Parameters<OrganizationService['validateUnitMove']>[0],
    ) {
      return withService(
        credential,
        input.organizationId,
        'unit.manage',
        [
          { kind: 'unit', id: input.unitId },
          { kind: 'unit', id: input.parentId },
        ],
        async (s, _id, tx, actor, now) => {
          for (const unit of await tx.subtree(
            input.organizationId,
            input.unitId,
          ))
            await check(
              tx,
              actor,
              'unit.manage',
              { kind: 'unit', id: unit.id },
              now,
            );
          return s.validateUnitMove(input);
        },
      );
    },
    createMembership(
      credential: unknown,
      input: Parameters<OrganizationService['createMembership']>[0],
    ) {
      return withService(
        credential,
        input.organizationId,
        'membership.manage',
        [
          { kind: 'user', id: input.userId },
          { kind: 'unit', id: input.orgUnitId },
        ],
        (s, actorId) => s.createMembership(input, { actorId }),
        'membership.created',
      );
    },
    closeMembership(
      credential: unknown,
      input: Parameters<OrganizationService['closeMembership']>[0],
    ) {
      return withService(
        credential,
        input.organizationId,
        'membership.manage',
        [{ kind: 'membership', id: input.membershipId }],
        (s, actorId) => s.closeMembership(input, { actorId }),
        'membership.closed',
      );
    },
    transferMembership(
      credential: unknown,
      input: Parameters<OrganizationService['transferMembership']>[0],
    ) {
      return withService(
        credential,
        input.organizationId,
        'membership.manage',
        [
          { kind: 'membership', id: input.membershipId },
          { kind: 'unit', id: input.targetOrgUnitId },
        ],
        (s, actorId) => s.transferMembership(input, { actorId }),
        'membership.transferred',
      );
    },
    membershipHistory(credential: unknown, org: string, userId: string) {
      return withService(
        credential,
        org,
        'membership.read',
        [{ kind: 'user', id: userId }],
        async (s, _id, tx, actor, now) => {
          const rows = await s.membershipHistory(org, userId);
          for (const row of rows)
            await check(
              tx,
              actor,
              'membership.read',
              { kind: 'membership', id: row.id },
              now,
            );
          return rows;
        },
      );
    },
    currentMemberships(credential: unknown, org: string, userId: string) {
      return withService(
        credential,
        org,
        'membership.read',
        [{ kind: 'user', id: userId }],
        async (s, _id, tx, actor, now) => {
          const rows = await s.currentMemberships(org, userId, now);
          for (const row of rows)
            await check(
              tx,
              actor,
              'membership.read',
              { kind: 'membership', id: row.id },
              now,
            );
          return rows;
        },
      );
    },
    defineRole(
      credential: unknown,
      org: string,
      input: z.input<typeof roleInput>,
    ) {
      const value = roleInput.parse(input);
      return run(credential, org, async (tx, actor, now) => {
        requireAudit();
        await check(
          tx,
          actor,
          'security.manage',
          { kind: 'organization' },
          now,
        );
        const previous = await tx.latestRole(org, value.code);
        if (value.version !== (previous?.version ?? 0) + 1) return deny();
        // Definitions confer no grants, and changing a definition never upgrades old grants.
        const result = await tx.insertRole({
          ...value,
          organizationId: org,
          createdBy: actor.id,
          updatedBy: actor.id,
          createdAt: now,
          updatedAt: now,
          revision: 0,
        });
        await mutationAudit(tx, actor, credential, 'role.defined', result, now);
        return result;
      });
    },
    validateRoleGrant(
      credential: unknown,
      org: string,
      input: z.input<typeof grantInput>,
    ) {
      const value = grantInput.parse(input);
      return run(credential, org, async (tx, actor, now) => {
        await grantPlan(tx, actor, org, now, value);
      });
    },
    grantRole(
      credential: unknown,
      org: string,
      input: z.input<typeof grantInput>,
    ) {
      const value = grantInput.parse(input);
      return run(credential, org, async (tx, actor, now) => {
        requireAudit();
        const role = await grantPlan(tx, actor, org, now, value);
        const result = await tx.insertGrant({
          ...value,
          organizationId: org,
          roleDefinitionId: role.id,
          roleVersion: role.version,
          grantedBy: actor.id,
          revokedAt: null,
          revokedBy: null,
          revocationReason: null,
          createdBy: actor.id,
          updatedBy: actor.id,
          createdAt: now,
          updatedAt: now,
          revision: 0,
        });
        await mutationAudit(tx, actor, credential, 'role.granted', result, now);
        return result;
      });
    },
    revokeGrant(
      credential: unknown,
      org: string,
      id: string,
      expectedRevision: number,
      reason: string,
    ) {
      if (
        !objectId.safeParse(id).success ||
        !Number.isSafeInteger(expectedRevision) ||
        !reason.trim() ||
        reason.length > 500
      )
        return Promise.reject(new Error('Invalid revocation input'));
      return run(credential, org, async (tx, actor, now) => {
        requireAudit();
        await check(
          tx,
          actor,
          'security.manage',
          { kind: 'organization' },
          now,
        );
        const grant = await tx.grant(org, id);
        if (!grant || grant.revision !== expectedRevision || grant.revokedAt)
          return deny();
        const result = await tx.revokeGrant(
          grant,
          actor.id,
          now,
          reason.trim(),
        );
        if (!result) return deny();
        await mutationAudit(tx, actor, credential, 'role.revoked', result, now);
        return result;
      });
    },
  };
  authorizationServices.add(service);
  return service;
  async function checkFacts(
    tx: AuthorizationTransaction,
    org: string,
    target: Target,
    now: Date,
  ) {
    return resolveResource(tx, org, target, now, options.resolver);
  }
}
