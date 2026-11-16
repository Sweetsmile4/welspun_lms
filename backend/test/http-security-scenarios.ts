import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { expect, it } from 'vitest';
import { errorEnvelopeSchema } from '@welspun/contracts';
import { httpFixture, type HttpTestStore } from './http-security-fixture.js';

export function httpSecurityScenarios(store: () => HttpTestStore) {
  it('returns standard 401 for missing/invalid/unsupported/expired credentials and ignores forged identity headers', async () => {
    const f = await httpFixture(store());
    for (const header of [
      '',
      'Basic secret',
      'Bearer unknown',
      'Bearer one, Bearer two',
    ]) {
      const call = request(f.app)
        .get(f.path())
        .set('x-user-id', f.actor.id)
        .set('x-role', 'ADMIN')
        .set('x-organization-id', f.org.id);
      if (header) call.set('authorization', header);
      const response = await call.expect(401);
      expect(errorEnvelopeSchema.safeParse(response.body).success).toBe(true);
      expect(response.headers['www-authenticate']).toBe('Bearer');
    }
    f.expire();
    await request(f.app)
      .get(f.path())
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(401);
    expect(f.events.filter((e) => e.type === 'identity.rejected')).toHaveLength(
      5,
    );
  });
  it('binds trusted credentials to this request, propagates request IDs and exposes only projected DTOs', async () => {
    const f = await httpFixture(store());
    await f.grant({ kind: 'own' }, ['membership.read']);
    const requestId = randomUUID();
    const response = await request(f.app)
      .get(f.path())
      .set('authorization', 'Bearer ' + f.bearer)
      .set('x-request-id', requestId)
      .set('x-user-id', f.remote.id)
      .expect(200);
    expect(response.body.meta.requestId).toBe(requestId);
    expect(response.headers['x-request-id']).toBe(requestId);
    expect(response.body.data[0].userId).toBe(f.actor.id);
    expect(Object.keys(response.body.data[0]).sort()).toEqual(
      [
        'id',
        'userId',
        'orgUnitId',
        'validFrom',
        'validTo',
        'primary',
        'revision',
      ].sort(),
    );
    await expect(
      f.security.provider.authenticate({ actorId: f.actor.id }),
    ).resolves.toBeNull();
    expect(JSON.stringify(f.logs.mock.calls)).not.toContain(f.bearer);
    expect(JSON.stringify(f.events)).not.toContain('issuer');
  });
  it('denies missing permissions, another learner and disabled users without disclosing existence', async () => {
    const f = await httpFixture(store());
    await request(f.app)
      .get(f.path())
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
    await f.grant({ kind: 'own' }, ['membership.read']);
    await request(f.app)
      .get(f.path(f.peer.id))
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
    await store().disable(f.actor.id);
    await request(f.app)
      .get(f.path())
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
    expect(f.events.some((e) => e.type === 'authorization.denied')).toBe(true);
  });
  it('keeps department, plant and organization boundaries authoritative at HTTP entry', async () => {
    const f = await httpFixture(store());
    await f.grant(
      { kind: 'unit', unitId: f.department.id, includeDescendants: false },
      ['membership.read'],
    );
    await request(f.app)
      .get(f.path(f.peer.id))
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(200);
    for (const user of [f.childUser, f.siblingUser, f.remote])
      await request(f.app)
        .get(f.path(user.id))
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(403);
    await f.grant(
      { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
      ['membership.read'],
    );
    await request(f.app)
      .get(f.path(f.childUser.id))
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(200);
    await request(f.app)
      .get(f.path(f.remote.id))
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
    const other = await httpFixture(store());
    await request(f.app)
      .get(f.path(other.actor.id, other.org.id))
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
  });
  it('denies expired/revoked grants and validates resource IDs', async () => {
    const f = await httpFixture(store());
    await f.grant({ kind: 'organization' }, ['membership.read'], {
      validTo: new Date('2026-10-01T01:00:00Z'),
    });
    await f.grant({ kind: 'organization' }, ['membership.read'], {
      revoked: true,
    });
    await request(f.app)
      .get(f.path())
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(403);
    await request(f.app)
      .get(f.path('not-an-id'))
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(422);
    await request(f.app).get('/api/v1/not-a-route').expect(404);
  });
  it('provisions through the authorized service with transaction-bound audit, safe DTO and 409 conflicts', async () => {
    const f = await httpFixture(store());
    await f.grant({ kind: 'organization' }, ['user.create']);
    const requestId = randomUUID();
    const response = await request(f.app)
      .post(f.provisionPath)
      .set('authorization', 'Bearer ' + f.bearer)
      .set('x-request-id', requestId)
      .send(f.provision)
      .expect(201);
    expect(response.body.data.displayName).toBe(f.provision.displayName);
    expect(response.body.data).not.toHaveProperty('identityIssuer');
    const events = store().events ? await store().events!() : f.events;
    expect(
      events.some(
        (e) =>
          e.type === 'employee.provisioned' &&
          e.requestId === requestId &&
          e.actorId === f.actor.id &&
          e.resourceId === response.body.data.id,
      ),
    ).toBe(true);
    const conflict = await request(f.app)
      .post(f.provisionPath)
      .set('authorization', 'Bearer ' + f.bearer)
      .send(f.provision)
      .expect(409);
    expect(conflict.body.error.code).toBe('CONFLICT');
    expect(JSON.stringify(conflict.body)).not.toContain(
      f.provision.identitySubject,
    );
  });
  it('rolls back a protected mutation when required audit persistence fails', async () => {
    const f = await httpFixture(store());
    await f.grant({ kind: 'organization' }, ['user.create']);
    f.failAudit();
    const response = await request(f.app)
      .post(f.provisionPath)
      .set('authorization', 'Bearer ' + f.bearer)
      .send(f.provision)
      .expect(503);
    expect(JSON.stringify(response.body)).not.toContain('SENSITIVE');
    expect(
      await f.repository.transaction((tx) =>
        tx.userByIdentity(
          f.org.id,
          f.provision.identityIssuer,
          f.provision.identitySubject,
        ),
      ),
    ).toBeNull();
    const events = store().events ? await store().events!() : f.events;
    expect(
      events.some(
        (e) =>
          e.type === 'employee.provisioned' && e.organizationId === f.org.id,
      ),
    ).toBe(false);
  });
  it('rejects client role injection, unsafe DTO output and unavailable verification audit', async () => {
    const f = await httpFixture(store());
    await f.grant({ kind: 'organization' }, ['user.create']);
    await request(f.app)
      .post(f.provisionPath)
      .set('authorization', 'Bearer ' + f.bearer)
      .send({ ...f.provision, roles: ['ADMIN'] })
      .expect(422);
    const response = await request(f.app)
      .get('/api/v1/__test/projection-failure')
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(500);
    expect(JSON.stringify(response.body)).not.toContain('SENSITIVE');
    f.failIdentityAudit();
    await request(f.app)
      .get(f.path())
      .set('authorization', 'Bearer ' + f.bearer)
      .expect(503);
    await request(f.app).get(f.path()).expect(401);
  });
  it('protects transfers, stale revisions and destination scope without partially closing history', async () => {
    const f = await httpFixture(store());
    await f.grant(
      { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
      ['membership.manage', 'membership.read'],
    );
    const old = (await f.raw.membershipHistory(f.org.id, f.peer.id))[0]!;
    const path = `/api/v1/__test/organizations/${f.org.id}/memberships/${old.id}/transfers`;
    const body = {
      expectedRevision: 0,
      targetOrgUnitId: f.plantB.id,
      effectiveAt: '2026-10-28T10:00:00Z',
    };
    await request(f.app)
      .post(path)
      .set('authorization', 'Bearer ' + f.bearer)
      .send(body)
      .expect(403);
    expect(
      (await f.raw.membershipHistory(f.org.id, f.peer.id))[0]!.validTo,
    ).toBeNull();
    await request(f.app)
      .post(path)
      .set('authorization', 'Bearer ' + f.bearer)
      .send({ ...body, expectedRevision: 99, targetOrgUnitId: f.sibling.id })
      .expect(409);
    await request(f.app)
      .post(path)
      .set('authorization', 'Bearer ' + f.bearer)
      .send({ ...body, targetOrgUnitId: f.sibling.id })
      .expect(201);
  });
}
