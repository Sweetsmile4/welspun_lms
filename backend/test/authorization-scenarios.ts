import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { Types } from 'mongoose';
import { createOrganizationService } from '../src/modules/identity/organization/service.js';
import { createAuthorizationService } from '../src/modules/identity/authorization/service.js';
import type {
  Action,
  AuthorizationIdentityProvider,
  AuthorizationRepository,
  ResourceFacts,
  RoleDefinition,
  Scope,
} from '../src/modules/identity/authorization/types.js';

export const now = new Date('2026-10-28T10:00:00Z');
const before = new Date('2026-10-01T00:00:00Z');
const after = new Date('2026-12-01T00:00:00Z');
export async function authorizationFixture(
  repository: AuthorizationRepository,
) {
  const attribution = { actorId: 'synthetic-test-bootstrap' };
  const raw = createOrganizationService(repository, () => now);
  const { organization: org, root } = await raw.createOrganization(
    {
      code: 'SYN_' + randomUUID().replaceAll('-', ''),
      name: 'Synthetic authorization fixture',
      timeZone: 'UTC',
    },
    attribution,
  );
  let tree = 0;
  async function unit(
    parentId: string,
    code: string,
    type: 'plant' | 'department',
  ) {
    return raw.createUnit(
      {
        organizationId: org.id,
        parentId,
        code,
        name: 'Synthetic ' + code,
        type,
        expectedTreeRevision: tree++,
      },
      attribution,
    );
  }
  const plantA = await unit(root.id, 'PLANT_A', 'plant');
  const plantB = await unit(root.id, 'PLANT_B', 'plant');
  const department = await unit(plantA.id, 'DEPT_A', 'department');
  const sibling = await unit(plantA.id, 'DEPT_B', 'department');
  const child = await unit(department.id, 'CHILD', 'department');
  const tokens = new Map<unknown, string>();
  async function user(subject: string, unitId: string) {
    const user = await raw.createUser(
      {
        organizationId: org.id,
        identityIssuer: 'urn:synthetic:authorization-tests',
        identitySubject: subject,
        displayName: 'Synthetic ' + subject,
      },
      attribution,
    );
    await raw.createMembership(
      {
        organizationId: org.id,
        userId: user.id,
        orgUnitId: unitId,
        validFrom: before,
        primary: true,
      },
      attribution,
    );
    const token = Object.freeze({ fixture: randomUUID() });
    tokens.set(token, subject);
    return { ...user, token };
  }
  const actor = await user('actor', department.id);
  const peer = await user('peer', department.id);
  const siblingUser = await user('sibling', sibling.id);
  const childUser = await user('child', child.id);
  const remote = await user('remote', plantB.id);
  const provider: AuthorizationIdentityProvider = {
    mode: 'synthetic-test',
    authenticate: async (credential) => {
      const subject = tokens.get(credential);
      return subject
        ? {
            issuer: 'urn:synthetic:authorization-tests',
            subject,
            synthetic: true,
          }
        : null;
    },
  };
  const resources = new Map<string, ResourceFacts>();
  const service = createAuthorizationService(repository, provider, {
    isolatedTest: true,
    clock: () => now,
    resolver: {
      resolve: async (_tx, orgId, target) => {
        const row = resources.get(target.id);
        return row?.organizationId === orgId ? row : null;
      },
    },
  });
  const metadata = {
    createdBy: 'synthetic-test-bootstrap',
    updatedBy: 'synthetic-test-bootstrap',
    createdAt: now,
    updatedAt: now,
    revision: 0,
  };
  async function role(
    permissions: Action[],
    code = 'ROLE_' + randomUUID().replaceAll('-', '').toUpperCase(),
    version = 1,
    status: 'active' | 'inactive' = 'active',
  ) {
    return repository.transaction((tx) =>
      tx.insertRole({
        organizationId: org.id,
        code,
        version,
        status,
        permissions,
        ...metadata,
      }),
    );
  }
  async function grant(
    scope: Scope,
    permissions: Action[] = ['employee.read'],
    options: {
      userId?: string;
      role?: RoleDefinition;
      validFrom?: Date;
      validTo?: Date | null;
      revoked?: boolean;
    } = {},
  ) {
    const definition = options.role ?? (await role(permissions));
    return repository.transaction((tx) =>
      tx.insertGrant({
        organizationId: org.id,
        userId: options.userId ?? actor.id,
        roleDefinitionId: definition.id,
        roleVersion: definition.version,
        scope,
        validFrom: options.validFrom ?? before,
        validTo: options.validTo === undefined ? after : options.validTo,
        grantedBy: metadata.createdBy,
        revokedAt: options.revoked ? now : null,
        revokedBy: options.revoked ? metadata.createdBy : null,
        revocationReason: options.revoked ? 'Synthetic revocation' : null,
        ...metadata,
      }),
    );
  }
  const checkUser = (id: string) =>
    service.check(actor.token, org.id, 'employee.read', { kind: 'user', id });
  return {
    repository,
    raw,
    org,
    root,
    plantA,
    plantB,
    department,
    sibling,
    child,
    actor,
    peer,
    siblingUser,
    childUser,
    remote,
    service,
    provider,
    resources,
    grant,
    role,
    checkUser,
    metadata,
  };
}
export function authorizationScenarios(
  store: () => {
    repository: AuthorizationRepository;
    disable(id: string): Promise<void>;
  },
) {
  const fixture = () => authorizationFixture(store().repository);
  it('supports explicit course access without inheriting access to unrelated resources', async () => {
    const f = await fixture();
    const id = new Types.ObjectId().toHexString();
    f.resources.set(id, {
      organizationId: f.org.id,
      kind: 'course',
      id,
      unitIds: [f.department.id],
      ownerId: null,
      editedBy: [],
      state: 'active',
    });
    await f.grant(
      { kind: 'resource', resourceType: 'course', resourceId: id },
      ['audit.read'],
    );
    await expect(
      f.service.check(f.actor.token, f.org.id, 'audit.read', {
        kind: 'course',
        id,
      }),
    ).resolves.toEqual({ allowed: true });
    await expect(
      f.service.check(f.actor.token, f.org.id, 'audit.read', {
        kind: 'course',
        id: new Types.ObjectId().toHexString(),
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('supports scheduled grants without making them effective early', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, [
      'security.manage',
      'employee.read',
    ]);
    const role = await f.role(['employee.read']);
    const future = new Date(now.getTime() + 86400000);
    const grant = await f.service.grantRole(f.actor.token, f.org.id, {
      userId: f.peer.id,
      roleDefinitionId: role.id,
      scope: { kind: 'own' },
      validFrom: future,
      validTo: new Date('2026-11-01T00:00:00Z'),
    });
    expect(grant.validFrom).toEqual(future);
    await expect(
      f.service.check(f.peer.token, f.org.id, 'employee.read', {
        kind: 'user',
        id: f.peer.id,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('checks permission before invoking a query consumer and preserves organization in plans', async () => {
    const f = await fixture();
    let called = false;
    await expect(
      f.service.query(f.actor.token, f.org.id, 'employees', async () => {
        called = true;
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(called).toBe(false);
    await f.grant({ kind: 'own' });
    await f.service.query(
      f.actor.token,
      f.org.id,
      'employees',
      async (_tx, stages) => {
        expect(stages[0]).toEqual({
          $match: { organizationId: new Types.ObjectId(f.org.id) },
        });
        expect(JSON.stringify(stages)).toContain(f.actor.id);
      },
    );
  });
  it('protects provisioning and unit creation while preserving integrity and attribution', async () => {
    const f = await fixture();
    const input = {
      organizationId: f.org.id,
      identityIssuer: 'urn:synthetic:new',
      identitySubject: 'new-subject',
      displayName: 'Synthetic provisioned user',
    };
    await expect(
      f.service.createUser(f.actor.token, input),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant({ kind: 'organization' }, ['user.create']);
    expect((await f.service.createUser(f.actor.token, input)).createdBy).toBe(
      f.actor.id,
    );
    await f.grant(
      { kind: 'unit', unitId: f.department.id, includeDescendants: true },
      ['unit.manage'],
    );
    const unit = await f.service.createUnit(f.actor.token, {
      organizationId: f.org.id,
      parentId: f.department.id,
      type: 'department',
      code: 'NEW',
      name: 'Synthetic new unit',
      expectedTreeRevision: 5,
    });
    expect(unit.ancestorIds.at(-1)).toBe(f.department.id);
    await expect(
      f.service.createUnit(f.actor.token, {
        organizationId: f.org.id,
        parentId: f.plantB.id,
        type: 'department',
        code: 'DENIED',
        name: 'Synthetic denied unit',
        expectedTreeRevision: 6,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('does not expose historical memberships from another plant after a transfer', async () => {
    const f = await fixture();
    const history = await f.raw.membershipHistory(f.org.id, f.remote.id);
    await f.raw.transferMembership(
      {
        organizationId: f.org.id,
        membershipId: history[0]!.id,
        expectedRevision: 0,
        targetOrgUnitId: f.department.id,
        effectiveAt: now,
      },
      { actorId: 'synthetic-test-bootstrap' },
    );
    await f.grant(
      { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
      ['membership.read'],
    );
    await expect(
      f.service.currentMemberships(f.actor.token, f.org.id, f.remote.id),
    ).resolves.toHaveLength(1);
    await expect(
      f.service.membershipHistory(f.actor.token, f.org.id, f.remote.id),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('requires every current affiliation to fit a scope for a multi-plant employee', async () => {
    const f = await fixture();
    await f.raw.createMembership(
      {
        organizationId: f.org.id,
        userId: f.peer.id,
        orgUnitId: f.plantB.id,
        validFrom: before,
        primary: false,
      },
      { actorId: 'synthetic-test-bootstrap' },
    );
    await f.grant({
      kind: 'unit',
      unitId: f.plantA.id,
      includeDescendants: true,
    });
    await expect(f.checkUser(f.peer.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await f.grant({ kind: 'organization' });
    await expect(f.checkUser(f.peer.id)).resolves.toEqual({ allowed: true });
  });
  it('does not delegate a scope beyond the grantor expiry window', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, ['security.manage']);
    await f.grant({ kind: 'organization' }, ['employee.read']);
    const role = await f.role(['employee.read']);
    await expect(
      f.service.grantRole(f.actor.token, f.org.id, {
        userId: f.peer.id,
        roleDefinitionId: role.id,
        scope: { kind: 'organization' },
        validFrom: now,
        validTo: null,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('publishes role versions explicitly, invalidates old grants and rejects racing edits', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, ['security.manage']);
    const role = await f.role(['employee.read']);
    await f.grant({ kind: 'organization' }, [], { role });
    const input = {
      code: role.code,
      version: 2,
      permissions: ['employee.read'] as Action[],
      status: 'active' as const,
    };
    const results = await Promise.allSettled([
      f.service.defineRole(f.actor.token, f.org.id, input),
      f.service.defineRole(f.actor.token, f.org.id, input),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await expect(f.checkUser(f.peer.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('denies by default and rejects raw actor/role assertions and forged IDs', async () => {
    const f = await fixture();
    await expect(f.checkUser(f.actor.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await f.grant({ kind: 'organization' });
    await expect(
      f.service.check(
        { actorId: f.actor.id, role: 'ADMIN' },
        f.org.id,
        'employee.read',
        { kind: 'user', id: f.actor.id },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.checkUser(new Types.ObjectId().toHexString()),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(f.checkUser('forged-id')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      f.service.check(f.actor.token, f.org.id, 'employee.read', {
        kind: 'unit',
        id: f.department.id,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('allows own read but denies another learner and own administrative writes', async () => {
    const f = await fixture();
    await f.grant({ kind: 'own' }, ['employee.read', 'membership.manage']);
    await expect(f.checkUser(f.actor.id)).resolves.toEqual({ allowed: true });
    await expect(f.checkUser(f.peer.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      f.service.check(f.actor.token, f.org.id, 'membership.manage', {
        kind: 'user',
        id: f.actor.id,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('department exact scope excludes children, siblings, parents and other plants', async () => {
    const f = await fixture();
    await f.grant(
      { kind: 'unit', unitId: f.department.id, includeDescendants: false },
      ['employee.read', 'unit.manage'],
    );
    await expect(f.checkUser(f.peer.id)).resolves.toEqual({ allowed: true });
    for (const user of [f.childUser, f.siblingUser, f.remote])
      await expect(f.checkUser(user.id)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    await expect(
      f.service.check(f.actor.token, f.org.id, 'unit.manage', {
        kind: 'unit',
        id: f.plantA.id,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('explicit descendant scope includes children but never siblings or parents', async () => {
    const f = await fixture();
    await f.grant({
      kind: 'unit',
      unitId: f.department.id,
      includeDescendants: true,
    });
    await expect(f.checkUser(f.childUser.id)).resolves.toEqual({
      allowed: true,
    });
    await expect(f.checkUser(f.siblingUser.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('plant scope includes its departments and cannot cross plants or organizations', async () => {
    const f = await fixture();
    await f.grant({
      kind: 'unit',
      unitId: f.plantA.id,
      includeDescendants: true,
    });
    await expect(f.checkUser(f.siblingUser.id)).resolves.toEqual({
      allowed: true,
    });
    await expect(f.checkUser(f.remote.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    const other = await fixture();
    await expect(f.checkUser(other.actor.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      f.service.check(f.actor.token, other.org.id, 'employee.read', {
        kind: 'user',
        id: other.actor.id,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant({
      kind: 'unit',
      unitId: other.plantA.id,
      includeDescendants: true,
    });
    await expect(f.checkUser(f.remote.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('ignores expired, future and revoked grants using half-open validity', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, ['employee.read'], {
      validTo: now,
    });
    await f.grant({ kind: 'organization' }, ['employee.read'], {
      validFrom: after,
      validTo: null,
    });
    await f.grant({ kind: 'organization' }, ['employee.read'], {
      revoked: true,
    });
    await expect(f.checkUser(f.peer.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('disabled actors are denied despite current organization grants', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' });
    await store().disable(f.actor.id);
    await expect(f.checkUser(f.peer.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('combines explicit grants without granting unspecified actions', async () => {
    const f = await fixture();
    await f.grant({
      kind: 'unit',
      unitId: f.department.id,
      includeDescendants: false,
    });
    await f.grant({
      kind: 'unit',
      unitId: f.plantB.id,
      includeDescendants: false,
    });
    await expect(f.checkUser(f.remote.id)).resolves.toEqual({ allowed: true });
    await expect(f.checkUser(f.peer.id)).resolves.toEqual({ allowed: true });
    await expect(f.checkUser(f.siblingUser.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      f.service.check(f.actor.token, f.org.id, 'audit.read', {
        kind: 'organization',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('role version replacement and inactive definitions fail closed', async () => {
    const f = await fixture();
    const role = await f.role(['employee.read']);
    await f.grant({ kind: 'organization' }, [], { role });
    await expect(f.checkUser(f.peer.id)).resolves.toEqual({ allowed: true });
    await f.role(['employee.read'], role.code, 2);
    await expect(f.checkUser(f.peer.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await f.grant({ kind: 'organization' }, [], {
      role: await f.role(['employee.read'], undefined, 1, 'inactive'),
    });
    await expect(f.checkUser(f.peer.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('global self-approval and publication rules survive combined organization/resource roles', async () => {
    const f = await fixture();
    const id = new Types.ObjectId().toHexString();
    const facts: ResourceFacts = {
      organizationId: f.org.id,
      kind: 'revision',
      id,
      unitIds: [f.department.id],
      ownerId: f.peer.id,
      editedBy: [f.actor.id],
      state: 'review',
    };
    f.resources.set(id, facts);
    await f.grant({ kind: 'organization' }, [
      'content.approve',
      'content.publish',
    ]);
    await f.grant(
      { kind: 'resource', resourceType: 'revision', resourceId: id },
      ['content.approve', 'content.publish'],
    );
    const check = (action: 'content.approve' | 'content.publish') =>
      f.service.check(f.actor.token, f.org.id, action, {
        kind: 'revision',
        id,
      });
    await expect(check('content.approve')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    facts.editedBy = [f.peer.id];
    await expect(check('content.approve')).resolves.toEqual({ allowed: true });
    facts.state = 'approved';
    await expect(check('content.publish')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    facts.approval = {
      revisionDigest: 'synthetic-digest',
      approvedDigest: 'stale',
      required: 1,
      approverIds: [f.actor.id],
    };
    await expect(check('content.publish')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    facts.approval.approvedDigest = 'synthetic-digest';
    await expect(check('content.publish')).resolves.toEqual({ allowed: true });
    facts.approval.approverIds = [f.peer.id];
    await expect(check('content.publish')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    facts.state = 'archived';
    await expect(check('content.approve')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('explicit revision scopes do not authorize forged or different resources', async () => {
    const f = await fixture();
    const id = new Types.ObjectId().toHexString();
    f.resources.set(id, {
      organizationId: f.org.id,
      kind: 'revision',
      id,
      unitIds: [f.department.id],
      ownerId: f.peer.id,
      editedBy: [f.peer.id],
      state: 'review',
    });
    await f.grant(
      { kind: 'resource', resourceType: 'revision', resourceId: id },
      ['content.approve'],
    );
    await expect(
      f.service.check(f.actor.token, f.org.id, 'content.approve', {
        kind: 'revision',
        id,
      }),
    ).resolves.toEqual({ allowed: true });
    await expect(
      f.service.check(f.actor.token, f.org.id, 'content.approve', {
        kind: 'revision',
        id: new Types.ObjectId().toHexString(),
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('recomputes scopes after hierarchy moves and preserves stale revision rejection', async () => {
    const f = await fixture();
    await f.grant({
      kind: 'unit',
      unitId: f.plantA.id,
      includeDescendants: true,
    });
    await expect(f.checkUser(f.childUser.id)).resolves.toEqual({
      allowed: true,
    });
    await f.grant({ kind: 'organization' }, ['unit.manage']);
    await expect(
      f.service.moveUnit(f.actor.token, {
        organizationId: f.org.id,
        unitId: f.child.id,
        parentId: f.plantB.id,
        expectedTreeRevision: 0,
      }),
    ).rejects.toMatchObject({ code: 'STALE_REVISION' });
    await f.service.moveUnit(f.actor.token, {
      organizationId: f.org.id,
      unitId: f.child.id,
      parentId: f.plantB.id,
      expectedTreeRevision: 5,
    });
    await expect(f.checkUser(f.childUser.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('protects membership operations and prevents cross-plant transfers by forged destination', async () => {
    const f = await fixture();
    await f.grant(
      { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
      ['membership.read', 'membership.manage'],
    );
    const history = await f.service.membershipHistory(
      f.actor.token,
      f.org.id,
      f.peer.id,
    );
    await expect(
      f.service.transferMembership(f.actor.token, {
        organizationId: f.org.id,
        membershipId: history[0]!.id,
        expectedRevision: 0,
        targetOrgUnitId: f.plantB.id,
        effectiveAt: now,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const result = await f.service.transferMembership(f.actor.token, {
      organizationId: f.org.id,
      membershipId: history[0]!.id,
      expectedRevision: 0,
      targetOrgUnitId: f.sibling.id,
      effectiveAt: now,
    });
    expect(result.membership.orgUnitId).toBe(f.sibling.id);
    expect(result.membership.createdBy).toBe(f.actor.id);
  });
  it('security administrators cannot self-grant or delegate permissions/scopes they lack', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, ['security.manage']);
    const role = await f.role(['employee.read']);
    const input = {
      userId: f.actor.id,
      roleDefinitionId: role.id,
      scope: { kind: 'organization' as const },
      validFrom: now,
      validTo: after,
    };
    await expect(
      f.service.grantRole(f.actor.token, f.org.id, input),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.service.grantRole(f.actor.token, f.org.id, {
        ...input,
        userId: f.peer.id,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant({
      kind: 'unit',
      unitId: f.department.id,
      includeDescendants: false,
    });
    await expect(
      f.service.grantRole(f.actor.token, f.org.id, {
        ...input,
        userId: f.peer.id,
        scope: {
          kind: 'unit',
          unitId: f.department.id,
          includeDescendants: true,
        },
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const granted = await f.service.grantRole(f.actor.token, f.org.id, {
      ...input,
      userId: f.peer.id,
      scope: {
        kind: 'unit',
        unitId: f.department.id,
        includeDescendants: false,
      },
    });
    expect(granted.grantedBy).toBe(f.actor.id);
  });
  it('serializes concurrent revocations and rejects subsequent access without cache', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, ['security.manage']);
    const grant = await f.grant({ kind: 'organization' });
    const results = await Promise.allSettled([
      f.service.revokeGrant(
        f.actor.token,
        f.org.id,
        grant.id,
        0,
        'Synthetic first',
      ),
      f.service.revokeGrant(
        f.actor.token,
        f.org.id,
        grant.id,
        0,
        'Synthetic second',
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await expect(f.checkUser(f.peer.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('isolates synthetic providers to explicit test environments', async () => {
    const f = await fixture();
    expect(() => createAuthorizationService(f.repository, f.provider)).toThrow(
      'isolated tests',
    );
    const prodEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() =>
        createAuthorizationService(f.repository, f.provider, {
          isolatedTest: true,
        }),
      ).toThrow('isolated tests');
      await expect(f.checkUser(f.peer.id)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    } finally {
      process.env.NODE_ENV = prodEnv;
    }
  });
}
