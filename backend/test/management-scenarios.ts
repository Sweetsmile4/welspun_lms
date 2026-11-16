import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { expect, it } from 'vitest';
import { Types } from 'mongoose';
import {
  managementFixture,
  type ManagementTestStore,
} from './management-fixture.js';
import { now } from './authorization-scenarios.js';

export function managementScenarios(store: () => ManagementTestStore) {
  const fixture = () => managementFixture(store());
  it('does not turn a command receipt into authority after grant revocation or expiry', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, ['user.create'], {
      validTo: new Date('2026-10-01T01:00:00Z'),
    });
    await f.grant({ kind: 'organization' }, ['user.create'], { revoked: true });
    const key = randomUUID();
    const send = () =>
      request(f.app)
        .post(f.base + '/employees')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', key)
        .send(f.provision);
    await send().expect(403);
    const grant = await f.grant({ kind: 'organization' }, ['user.create']);
    await send().expect(201);
    await f.repository.transaction(async (tx) => {
      const org = (await tx.organization(f.org.id))!;
      await tx.lockOrganization(org.id, org.revision, false, f.actor.id, now);
      await tx.revokeGrant(
        grant,
        f.actor.id,
        now,
        'Synthetic loss of authority',
      );
    });
    await send().expect(403);
    expect(await store().receiptCount(f.org.id)).toBe(1);
    f.expire();
    await send().expect(401);
  });
  it('uses the trusted boundary and conceals disabled, missing and cross-organization employees', async () => {
    const f = await fixture();
    const path = f.base + '/employees/' + f.actor.id;
    await request(f.app).get(path).set('x-user-id', f.actor.id).expect(401);
    await request(f.app)
      .get(path)
      .set('authorization', 'Bearer invalid')
      .expect(401);
    await request(f.app)
      .get(path)
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
    await f.grant({ kind: 'own' }, ['employee.read']);
    const own = await request(f.app)
      .get(path)
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(200);
    expect(Object.keys(own.body.data).sort()).toEqual(
      ['id', 'displayName', 'status', 'revision'].sort(),
    );
    await request(f.app)
      .get(f.base + '/employees/' + new Types.ObjectId().toHexString())
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
    const other = await fixture();
    await request(f.app)
      .get(other.base + '/employees/' + other.actor.id)
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
    await store().disable(f.actor.id);
    await request(f.app)
      .get(path)
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
  });
  it('persists one result for concurrent retries, fingerprints payloads and refreshes request IDs', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, ['user.create']);
    const key = randomUUID();
    const path = f.base + '/employees';
    const send = () =>
      request(f.app)
        .post(path)
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', key)
        .send(f.provision);
    const results = await Promise.all([send().expect(201), send().expect(201)]);
    expect(results[0].body.data).toEqual(results[1].body.data);
    expect(results[0].body.meta.requestId).not.toBe(
      results[1].body.meta.requestId,
    );
    expect(
      results.map((r) => r.headers['idempotency-replayed']).sort(),
    ).toEqual(['false', 'true']);
    expect(await store().receiptCount(f.org.id)).toBe(1);
    expect(
      (await store().events()).filter(
        (e) =>
          e.organizationId === f.org.id && e.type === 'employee.provisioned',
      ),
    ).toHaveLength(1);
    await request(f.app)
      .post(path)
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', key)
      .send({ ...f.provision, displayName: 'Synthetic changed payload' })
      .expect(409);
    expect(JSON.stringify(results[0].body)).not.toContain('identitySubject');
    expect(JSON.stringify(results[0].body)).not.toContain('identityIssuer');
  });
  it('binds command receipts to actor and organization and rechecks authority before replay', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, ['user.create']);
    await f.grant({ kind: 'organization' }, ['user.create'], {
      userId: f.peer.id,
    });
    const key = randomUUID();
    const post = (bearer: string, body = f.provision) =>
      request(f.app)
        .post(f.base + '/employees')
        .set('authorization', 'Bearer ' + bearer)
        .set('idempotency-key', key)
        .send(body);
    await post(f.bearer).expect(201);
    await post(f.peerBearer).expect(409); // Domain duplicate, not another actor's stored response.
    await post(f.peerBearer, {
      ...f.provision,
      identitySubject: 'synthetic-peer-command',
    }).expect(201);
    expect(await store().receiptCount(f.org.id)).toBe(2);
    const other = await fixture();
    await other.grant({ kind: 'organization' }, ['user.create']);
    await request(other.app)
      .post(other.base + '/employees')
      .set('authorization', 'Bearer ' + other.bearer)
      .set('idempotency-key', key)
      .send(other.provision)
      .expect(201);
    await store().disable(f.actor.id);
    await post(f.bearer).expect(403);
  });
  it('requires keys/preconditions and rejects unknown/operator-shaped input', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, ['user.create', 'unit.manage']);
    await request(f.app)
      .post(f.base + '/employees')
      .set('authorization', 'Bearer ' + f.bearer)
      .send(f.provision)
      .expect(428);
    const body = {
      parentId: f.department.id,
      type: 'department',
      code: 'SYN_NEW',
      name: 'Synthetic new',
    };
    const post = () =>
      request(f.app)
        .post(f.base + '/org-units')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', randomUUID());
    await post().send(body).expect(428);
    await post().set('if-match', '5').send(body).expect(422);
    await post()
      .set('if-match', '"5"')
      .send({ ...body, parentId: { $ne: null } })
      .expect(422);
    await post()
      .set('if-match', '"5"')
      .send({ ...body, role: 'ADMIN' })
      .expect(422);
    await request(f.app)
      .get(f.base + '/employees?limit=101')
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(422);
    await request(f.app)
      .get(f.base + '/employees?filter[$ne]=x')
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(422);
  });
  it('creates units and preserves preview/move scope and optimistic tree revisions', async () => {
    const f = await fixture();
    await f.grant(
      { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
      ['unit.manage'],
    );
    const path = f.base + '/org-units';
    const body = {
      parentId: f.department.id,
      type: 'department',
      code: 'SYN_HTTP',
      name: 'Synthetic HTTP department',
    };
    const created = await request(f.app)
      .post(path)
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', randomUUID())
      .set('if-match', '"5"')
      .send(body)
      .expect(201);
    const id = created.body.data.id;
    await request(f.app)
      .post(path)
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', randomUUID())
      .set('if-match', '"5"')
      .send({ ...body, code: 'SYN_STALE' })
      .expect(409);
    const movePath = path + '/' + id;
    await request(f.app)
      .post(movePath + '/move-preview')
      .set('authorization', 'Bearer ' + f.bearer)
      .set('if-match', '"6"')
      .send({ parentId: f.sibling.id })
      .expect(200);
    await request(f.app)
      .post(movePath + '/moves')
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', randomUUID())
      .set('if-match', '"6"')
      .send({ parentId: f.plantB.id })
      .expect(403);
    const moved = await request(f.app)
      .post(movePath + '/moves')
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', randomUUID())
      .set('if-match', '"6"')
      .send({ parentId: f.sibling.id })
      .expect(200);
    expect(moved.body.data.parentId).toBe(f.sibling.id);
  });
  it('creates/closes memberships and preserves atomic transfers and scoped history', async () => {
    const f = await fixture();
    await f.grant(
      { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
      ['membership.manage', 'membership.read'],
    );
    const created = await request(f.app)
      .post(f.base + '/memberships')
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', randomUUID())
      .send({
        userId: f.peer.id,
        orgUnitId: f.sibling.id,
        primary: false,
        validFrom: now.toISOString(),
      })
      .expect(201);
    const closePath =
      f.base + '/memberships/' + created.body.data.id + '/close';
    const close = { validTo: '2026-10-28T12:00:00Z' };
    await request(f.app)
      .post(closePath)
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', randomUUID())
      .set('if-match', '"99"')
      .send(close)
      .expect(409);
    await request(f.app)
      .post(closePath)
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', randomUUID())
      .set('if-match', '"0"')
      .send(close)
      .expect(200);
    const old = (await f.raw.membershipHistory(f.org.id, f.actor.id))[0]!;
    const transferPath = f.base + '/memberships/' + old.id + '/transfers';
    const key = randomUUID();
    const transfer = {
      targetOrgUnitId: f.sibling.id,
      effectiveAt: now.toISOString(),
    };
    const send = () =>
      request(f.app)
        .post(transferPath)
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', key)
        .set('if-match', '"0"')
        .send(transfer);
    const first = await send().expect(201);
    const second = await send().expect(201);
    expect(first.body.data).toEqual(second.body.data);
    const current = await request(f.app)
      .get(f.base + '/employees/' + f.actor.id + '/current-memberships')
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(200);
    expect(current.body.data).toHaveLength(1);
    const history = await request(f.app)
      .get(f.base + '/employees/' + f.actor.id + '/memberships')
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(200);
    expect(history.body.data).toHaveLength(2);
    await request(f.app)
      .get(f.base + '/employees/' + f.remote.id + '/memberships')
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
  });
  it('versions roles and prevents duplicate commands, self-grants and delegated privilege escalation', async () => {
    const f = await fixture();
    await f.grant({ kind: 'organization' }, [
      'security.manage',
      'employee.read',
    ]);
    const role = {
      code: 'SYN_MANAGEMENT',
      permissions: ['employee.read'],
      status: 'active',
    };
    const key = randomUUID();
    const define = () =>
      request(f.app)
        .post(f.base + '/roles')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', key)
        .set('if-match', '"0"')
        .send(role);
    const first = await define().expect(201);
    const replay = await define().expect(201);
    expect(first.body.data).toEqual(replay.body.data);
    await request(f.app)
      .post(f.base + '/roles')
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', randomUUID())
      .set('if-match', '"0"')
      .send(role)
      .expect(409);
    const body = {
      userId: f.actor.id,
      roleDefinitionId: first.body.data.id,
      scope: { kind: 'own' },
      validFrom: now.toISOString(),
      validTo: '2026-11-01T00:00:00Z',
    };
    const grant = (value: object, key = randomUUID()) =>
      request(f.app)
        .post(f.base + '/role-grants')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', key)
        .send(value);
    await grant(body).expect(403);
    const grantKey = randomUUID();
    const granted = await grant(
      { ...body, userId: f.peer.id },
      grantKey,
    ).expect(201);
    const duplicate = await grant(
      { ...body, userId: f.peer.id },
      grantKey,
    ).expect(201);
    expect(granted.body.data.id).toBe(duplicate.body.data.id);
    await grant({ ...body, userId: f.peer.id }).expect(409);
    const dangerous = await f.role(['user.create']);
    await grant({
      ...body,
      userId: f.peer.id,
      roleDefinitionId: dangerous.id,
      scope: { kind: 'organization' },
    }).expect(403);
    const revoke = f.base + '/role-grants/' + granted.body.data.id + '/revoke';
    await request(f.app)
      .post(revoke)
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', randomUUID())
      .set('if-match', '"0"')
      .send({ reason: 'Synthetic revoke' })
      .expect(200);
    await request(f.app)
      .post(revoke)
      .set('authorization', 'Bearer ' + f.bearer)
      .set('idempotency-key', randomUUID())
      .set('if-match', '"0"')
      .send({ reason: 'Synthetic stale' })
      .expect(409);
  });
  for (const failure of ['audit', 'receipt'] as const)
    it(`rolls back domain, audit and receipt on ${failure} persistence failure`, async () => {
      const f = await fixture();
      await f.grant({ kind: 'organization' }, ['user.create']);
      if (failure === 'audit') f.failAudit();
      else f.failReceipt();
      await request(f.app)
        .post(f.base + '/employees')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', randomUUID())
        .send(f.provision)
        .expect(failure === 'audit' ? 503 : 500);
      expect(
        await f.repository.transaction((tx) =>
          tx.userByIdentity(
            f.org.id,
            f.provision.identityIssuer,
            f.provision.identitySubject,
          ),
        ),
      ).toBeNull();
      expect(await store().receiptCount(f.org.id)).toBe(0);
      expect(
        (await store().events()).some(
          (e) =>
            e.organizationId === f.org.id && e.type === 'employee.provisioned',
        ),
      ).toBe(false);
    });
}
