import { randomUUID } from 'node:crypto';
import { beforeEach, expect, it } from 'vitest';
import { createOrganizationService } from '../src/modules/identity/organization/service.js';
import type { OrganizationRepository } from '../src/modules/identity/organization/repository.js';

const actor = { actorId: 'synthetic-test-operator' };
const date = (day: number) => new Date(Date.UTC(2026, 0, day));
/** The same service contract runs against a test double and the opted-in real Mongo repository. */
export function organizationScenarios(
  getRepository: () => OrganizationRepository,
) {
  let repository: OrganizationRepository;
  let service: ReturnType<typeof createOrganizationService>;
  beforeEach(() => {
    repository = getRepository();
    service = createOrganizationService(repository);
  });
  async function fixture() {
    const first = await service.createOrganization(
      {
        code: 'SYN_' + randomUUID().replaceAll('-', ''),
        name: 'Synthetic organization',
        timeZone: 'UTC',
      },
      actor,
    );
    const org = first.organization.id;
    const a = await service.createUnit(
      {
        organizationId: org,
        type: 'plant',
        parentId: first.root.id,
        code: 'PLANT_A',
        name: 'Synthetic plant A',
        expectedTreeRevision: 0,
      },
      actor,
    );
    const b = await service.createUnit(
      {
        organizationId: org,
        type: 'plant',
        parentId: first.root.id,
        code: 'PLANT_B',
        name: 'Synthetic plant B',
        expectedTreeRevision: 1,
      },
      actor,
    );
    const user = await service.createUser(
      {
        organizationId: org,
        identityIssuer: 'urn:synthetic:issuer',
        identitySubject: 'subject-a',
        displayName: 'Synthetic learner',
      },
      actor,
    );
    return { ...first, org, a, b, user };
  }
  it('creates a valid hierarchy including unambiguous nested departments', async () => {
    const f = await fixture();
    const department = await service.createUnit(
      {
        organizationId: f.org,
        type: 'department',
        parentId: f.a.id,
        code: 'DEPT',
        name: 'Synthetic department',
        expectedTreeRevision: 2,
      },
      actor,
    );
    const child = await service.createUnit(
      {
        organizationId: f.org,
        type: 'department',
        parentId: department.id,
        code: 'TEAM',
        name: 'Synthetic nested department',
        expectedTreeRevision: 3,
      },
      actor,
    );
    expect(child.ancestorIds).toEqual([f.root.id, f.a.id, department.id]);
    expect(child.treeRevision).toBe(4);
  });
  it('rejects invalid parents and cross-organization unit references', async () => {
    const f = await fixture();
    const other = await fixture();
    await expect(
      service.createUnit(
        {
          organizationId: f.org,
          type: 'department',
          parentId: f.root.id,
          code: 'BAD',
          name: 'Synthetic invalid',
          expectedTreeRevision: 2,
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_HIERARCHY' });
    await expect(
      service.createUnit(
        {
          organizationId: f.org,
          type: 'plant',
          parentId: f.a.id,
          code: 'BAD',
          name: 'Synthetic invalid',
          expectedTreeRevision: 2,
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_HIERARCHY' });
    await expect(
      service.createUnit(
        {
          organizationId: f.org,
          type: 'plant',
          parentId: other.root.id,
          code: 'BAD',
          name: 'Synthetic invalid',
          expectedTreeRevision: 2,
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('prevents cycles and preserves the tree on a failed move', async () => {
    const f = await fixture();
    const d = await service.createUnit(
      {
        organizationId: f.org,
        type: 'department',
        parentId: f.a.id,
        code: 'D',
        name: 'Synthetic department',
        expectedTreeRevision: 2,
      },
      actor,
    );
    const child = await service.createUnit(
      {
        organizationId: f.org,
        type: 'department',
        parentId: d.id,
        code: 'CHILD',
        name: 'Synthetic child',
        expectedTreeRevision: 3,
      },
      actor,
    );
    await expect(
      service.moveUnit(
        {
          organizationId: f.org,
          unitId: d.id,
          parentId: child.id,
          expectedTreeRevision: 4,
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'CYCLE' });
    await expect(
      service.validateUnitMove({
        organizationId: f.org,
        unitId: d.id,
        parentId: d.id,
        expectedTreeRevision: 4,
      }),
    ).rejects.toMatchObject({ code: 'CYCLE' });
    const stored = await repository.transaction((tx) => tx.unit(f.org, d.id));
    expect(stored?.parentId).toBe(f.a.id);
  });
  it('moves a department subtree atomically and rejects stale/concurrent edits', async () => {
    const f = await fixture();
    const d = await service.createUnit(
      {
        organizationId: f.org,
        type: 'department',
        parentId: f.a.id,
        code: 'D',
        name: 'Synthetic department',
        expectedTreeRevision: 2,
      },
      actor,
    );
    const child = await service.createUnit(
      {
        organizationId: f.org,
        type: 'department',
        parentId: d.id,
        code: 'C',
        name: 'Synthetic child',
        expectedTreeRevision: 3,
      },
      actor,
    );
    const results = await Promise.allSettled([
      service.moveUnit(
        {
          organizationId: f.org,
          unitId: d.id,
          parentId: f.b.id,
          expectedTreeRevision: 4,
        },
        actor,
      ),
      service.moveUnit(
        {
          organizationId: f.org,
          unitId: d.id,
          parentId: f.b.id,
          expectedTreeRevision: 4,
        },
        actor,
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await repository.transaction((tx) => tx.unit(f.org, child.id)))
        ?.ancestorIds,
    ).toEqual([f.root.id, f.b.id, d.id]);
    await expect(
      service.validateUnitMove({
        organizationId: f.org,
        unitId: d.id,
        parentId: f.a.id,
        expectedTreeRevision: 4,
      }),
    ).rejects.toMatchObject({ code: 'STALE_REVISION' });
  });
  it('normalizes organization/unit codes and enforces parent-scoped uniqueness', async () => {
    const f = await fixture();
    await expect(
      service.createOrganization(
        {
          code: f.organization.code.toLowerCase(),
          name: 'Synthetic duplicate',
          timeZone: 'UTC',
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE' });
    const d = await service.createUnit(
      {
        organizationId: f.org,
        type: 'department',
        parentId: f.a.id,
        code: 'd',
        name: 'Synthetic department',
        expectedTreeRevision: 2,
      },
      actor,
    );
    await expect(
      service.createUnit(
        {
          organizationId: f.org,
          type: 'department',
          parentId: f.a.id,
          code: 'D',
          name: 'Synthetic duplicate',
          expectedTreeRevision: 3,
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE' });
    const other = await service.createUnit(
      {
        organizationId: f.org,
        type: 'department',
        parentId: f.b.id,
        code: 'D',
        name: 'Synthetic valid',
        expectedTreeRevision: 3,
      },
      actor,
    );
    await expect(
      service.moveUnit(
        {
          organizationId: f.org,
          unitId: d.id,
          parentId: f.b.id,
          expectedTreeRevision: 4,
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE' });
    expect(other.code).toBe('D');
  });
  it('enforces identity and optional employee ID uniqueness without requiring employee IDs', async () => {
    const f = await fixture();
    await expect(
      service.createUser(
        {
          organizationId: f.org,
          identityIssuer: 'urn:synthetic:issuer',
          identitySubject: 'subject-a',
          displayName: 'Synthetic duplicate',
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE' });
    await service.createUser(
      {
        organizationId: f.org,
        identityIssuer: 'urn:synthetic:issuer',
        identitySubject: 'subject-b',
        employeeId: 'SYN-ID',
        displayName: 'Synthetic B',
      },
      actor,
    );
    await expect(
      service.createUser(
        {
          organizationId: f.org,
          identityIssuer: 'urn:synthetic:issuer',
          identitySubject: 'subject-c',
          employeeId: 'SYN-ID',
          displayName: 'Synthetic C',
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE' });
    await expect(
      service.createUser(
        {
          organizationId: f.org,
          identityIssuer: 'urn:synthetic:issuer',
          identitySubject: 'subject-d',
          displayName: 'Synthetic D',
        },
        actor,
      ),
    ).resolves.toMatchObject({ status: 'active' });
  });
  it('allows multiple units while rejecting same-unit and primary overlap', async () => {
    const f = await fixture();
    await service.createMembership(
      {
        organizationId: f.org,
        userId: f.user.id,
        orgUnitId: f.a.id,
        validFrom: date(1),
        primary: true,
      },
      actor,
    );
    await service.createMembership(
      {
        organizationId: f.org,
        userId: f.user.id,
        orgUnitId: f.b.id,
        validFrom: date(1),
      },
      actor,
    );
    expect(
      await service.currentMemberships(f.org, f.user.id, date(2)),
    ).toHaveLength(2);
    await expect(
      service.createMembership(
        {
          organizationId: f.org,
          userId: f.user.id,
          orgUnitId: f.a.id,
          validFrom: date(2),
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_OVERLAP' });
    const second = await service.createUser(
      {
        organizationId: f.org,
        identityIssuer: 'urn:synthetic:issuer',
        identitySubject: 'overlap',
        displayName: 'Synthetic overlap',
      },
      actor,
    );
    const results = await Promise.allSettled(
      [f.a.id, f.b.id].map((orgUnitId) =>
        service.createMembership(
          {
            organizationId: f.org,
            userId: second.id,
            orgUnitId,
            validFrom: date(1),
            validTo: date(5),
            primary: true,
          },
          actor,
        ),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await service.membershipHistory(f.org, second.id)).toHaveLength(1);
  });
  it('closes memberships once, supports adjacent transfers and preserves history', async () => {
    const f = await fixture();
    const old = await service.createMembership(
      {
        organizationId: f.org,
        userId: f.user.id,
        orgUnitId: f.a.id,
        validFrom: date(1),
        primary: true,
      },
      actor,
    );
    const closed = await service.closeMembership(
      {
        organizationId: f.org,
        membershipId: old.id,
        expectedRevision: 0,
        validTo: date(3),
      },
      actor,
    );
    await service.createMembership(
      {
        organizationId: f.org,
        userId: f.user.id,
        orgUnitId: f.b.id,
        validFrom: date(3),
        primary: true,
      },
      actor,
    );
    const history = await service.membershipHistory(f.org, f.user.id);
    expect(history).toHaveLength(2);
    expect(history[0]?.id).toBe(old.id);
    expect(history[0]?.createdAt).toEqual(old.createdAt);
    expect(
      (await service.currentMemberships(f.org, f.user.id, date(3))).map(
        (r) => r.orgUnitId,
      ),
    ).toEqual([f.b.id]);
    await expect(
      service.closeMembership(
        {
          organizationId: f.org,
          membershipId: closed.id,
          expectedRevision: 0,
          validTo: date(4),
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'STALE_REVISION' });
    await expect(
      service.closeMembership(
        {
          organizationId: f.org,
          membershipId: closed.id,
          expectedRevision: 1,
          validTo: date(4),
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'HISTORY_CLOSED' });
  });
  it('rejects invalid dates, unknown fields and cross-organization memberships', async () => {
    const f = await fixture();
    const other = await fixture();
    for (const validTo of [date(1), date(0), new Date('invalid')])
      await expect(
        service.createMembership(
          {
            organizationId: f.org,
            userId: f.user.id,
            orgUnitId: f.a.id,
            validFrom: date(1),
            validTo,
          },
          actor,
        ),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(
      service.createMembership(
        {
          organizationId: f.org,
          userId: other.user.id,
          orgUnitId: f.a.id,
          validFrom: date(1),
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      service.createMembership(
        {
          organizationId: f.org,
          userId: f.user.id,
          orgUnitId: other.a.id,
          validFrom: date(1),
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      service.createOrganization(
        { code: 'SYN', name: 'Synthetic', timeZone: 'Not/AZone' },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
  it('transfers an open membership atomically and leaves it open on rejected transfer', async () => {
    const f = await fixture();
    const other = await fixture();
    const old = await service.createMembership(
      {
        organizationId: f.org,
        userId: f.user.id,
        orgUnitId: f.a.id,
        validFrom: date(1),
        primary: true,
      },
      actor,
    );
    await expect(
      service.transferMembership(
        {
          organizationId: f.org,
          membershipId: old.id,
          expectedRevision: 0,
          targetOrgUnitId: other.a.id,
          effectiveAt: date(3),
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(
      (await service.membershipHistory(f.org, f.user.id))[0]?.validTo,
    ).toBeNull();
    const result = await service.transferMembership(
      {
        organizationId: f.org,
        membershipId: old.id,
        expectedRevision: 0,
        targetOrgUnitId: f.b.id,
        effectiveAt: date(3),
      },
      actor,
    );
    expect(result.closed.validTo).toEqual(date(3));
    expect(result.membership.primary).toBe(true);
    expect(result.membership.userId).toBe(old.userId);
    expect(await service.membershipHistory(f.org, f.user.id)).toHaveLength(2);
  });
}
