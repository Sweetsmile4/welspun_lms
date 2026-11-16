import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { expect, it } from 'vitest';
import {
  managementFixture,
  type ManagementTestStore,
} from './management-fixture.js';
import { now } from './authorization-scenarios.js';

export function hardeningScenarios(store: () => ManagementTestStore) {
  it('denies grant replay after delegated authority is lost while security.manage remains', async () => {
    const f = await managementFixture(store());
    await f.grant({ kind: 'organization' }, ['security.manage']);
    const authority = await f.grant({ kind: 'organization' }, [
      'employee.read',
    ]);
    const role = await f.role(['employee.read']);
    const key = randomUUID(),
      body = {
        userId: f.peer.id,
        roleDefinitionId: role.id,
        scope: { kind: 'own' },
        validFrom: now.toISOString(),
        validTo: '2026-11-01T00:00:00Z',
      };
    const send = () =>
      request(f.app)
        .post(f.base + '/role-grants')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', key)
        .send(body);
    await send().expect(201);
    await f.repository.transaction(async (tx) => {
      const org = (await tx.organization(f.org.id))!;
      await tx.lockOrganization(org.id, org.revision, false, f.actor.id, now);
      await tx.revokeGrant(
        authority,
        f.actor.id,
        now,
        'Synthetic delegation removed',
      );
    });
    await send().expect(403);
    expect(await store().receiptCount(f.org.id)).toBe(1);
  });
  it('denies subtree-move replay after authority over a descendant is revoked', async () => {
    const f = await managementFixture(store());
    await f.grant(
      { kind: 'unit', unitId: f.department.id, includeDescendants: false },
      ['unit.manage'],
    );
    const child = await f.grant(
      { kind: 'unit', unitId: f.child.id, includeDescendants: false },
      ['unit.manage'],
    );
    await f.grant(
      { kind: 'unit', unitId: f.sibling.id, includeDescendants: false },
      ['unit.manage'],
    );
    const key = randomUUID();
    const send = () =>
      request(f.app)
        .post(f.base + '/org-units/' + f.department.id + '/moves')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', key)
        .set('if-match', '"5"')
        .send({ parentId: f.sibling.id });
    await send().expect(200);
    await f.repository.transaction(async (tx) => {
      const org = (await tx.organization(f.org.id))!;
      await tx.lockOrganization(org.id, org.revision, false, f.actor.id, now);
      await tx.revokeGrant(
        child,
        f.actor.id,
        now,
        'Synthetic descendant authority removed',
      );
    });
    await send().expect(403);
    expect(await store().receiptCount(f.org.id)).toBe(1);
  });
  it('denies old command replay after the authorizing role version is replaced', async () => {
    const f = await managementFixture(store());
    const role = await f.role(['user.create']);
    await f.grant({ kind: 'organization' }, [], { role });
    const key = randomUUID();
    const send = () =>
      request(f.app)
        .post(f.base + '/employees')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', key)
        .send(f.provision);
    await send().expect(201);
    await f.role(['user.create'], role.code, 2, 'inactive');
    await send().expect(403);
  });
}
