import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { parseEnvironment } from '../src/platform/environment.js';
import {
  createHttpApplicationService,
  createHttpSecurity,
} from '../src/modules/identity/http-security.js';
import { createAuthorizationService } from '../src/modules/identity/authorization/service.js';
import {
  securityAuditEventSchema,
  securityEvent,
  type SecurityAuditEvent,
} from '../src/platform/security-audit.js';
import { memoryAuthorizationRepository } from './authorization-memory.js';
import { authorizationFixture, now } from './authorization-scenarios.js';
import { httpFixture } from './http-security-fixture.js';
import { httpSecurityScenarios } from './http-security-scenarios.js';

describe('isolated HTTP authentication and authorization integration (test double)', () => {
  let store: ReturnType<typeof memoryAuthorizationRepository>;
  beforeEach(() => {
    store = memoryAuthorizationRepository();
  });
  httpSecurityScenarios(() => store);
  it('keeps management and test routes absent on the normal API and rejects unsafe test mounting', async () => {
    const app = createApp(
      parseEnvironment({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }),
    );
    for (const path of [
      '/api/v1/employees',
      '/api/v1/organizations',
      '/api/v1/__test/organizations',
      '/api/v1/bootstrap',
      '/api/v1/role-grants',
    ])
      await request(app).post(path).send({}).expect(404);
    expect(() =>
      createApp(parseEnvironment({ NODE_ENV: 'production' }), {
        isolatedTestRouter: Router(),
      }),
    ).toThrow('isolated test');
    expect(() =>
      createApp(parseEnvironment({ NODE_ENV: 'test' }), {
        isolatedTestRouter: Router(),
      }),
    ).toThrow('isolated test');
  });
  it('defaults the HTTP provider to disabled and rejects synthetic adapters outside isolated tests', async () => {
    const security = createHttpSecurity({ audit: { append: async () => {} } });
    const router = Router()
      .use(security.authenticate)
      .get('/probe', (_req, res) => res.json({}));
    const app = createApp(
      parseEnvironment({
        NODE_ENV: 'test',
        ISOLATED_DEVELOPMENT: 'true',
        LOG_LEVEL: 'silent',
      }),
      { isolatedTestRouter: router },
    );
    await request(app)
      .get('/api/v1/__test/probe')
      .set('authorization', 'Bearer fake')
      .expect(401);
    expect(() =>
      createHttpSecurity({
        verifier: { mode: 'synthetic-test', verifyBearer: async () => null },
        audit: { append: async () => {} },
      }),
    ).toThrow('isolated tests');
    const f = await httpFixture(store);
    const original = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() =>
        createHttpApplicationService(
          store.repository,
          f.security,
          { durability: 'transactional-persistent', append: async () => {} },
          { isolatedTest: true },
        ),
      ).toThrow('isolated tests');
      await request(f.app)
        .post(f.provisionPath)
        .set('authorization', 'Bearer ' + f.bearer)
        .send(f.provision)
        .expect(401);
    } finally {
      process.env.NODE_ENV = original;
    }
  });
  it('requires audit before mutation and appends role/grant/revocation events inside the service transaction', async () => {
    const f = await authorizationFixture(store.repository);
    await f.grant({ kind: 'organization' }, [
      'security.manage',
      'employee.read',
      'user.create',
    ]);
    const missingAudit = createAuthorizationService(
      store.repository,
      f.provider,
      { isolatedTest: true, requireMutationAudit: true, clock: () => now },
    );
    await expect(
      missingAudit.createUser(f.actor.token, {
        organizationId: f.org.id,
        identityIssuer: 'urn:test',
        identitySubject: 'no-audit',
        displayName: 'Synthetic blocked',
      }),
    ).rejects.toMatchObject({ status: 503 });
    const events: SecurityAuditEvent[] = [];
    const service = createAuthorizationService(store.repository, f.provider, {
      isolatedTest: true,
      requireMutationAudit: true,
      clock: () => now,
      mutationAudit: {
        requestId: () => randomUUID(),
        sink: {
          durability: 'isolated-test',
          append: async (_tx, event) => {
            events.push(event);
          },
        },
      },
    });
    const role = await service.defineRole(f.actor.token, f.org.id, {
      code: 'HTTP_TEST_ROLE',
      version: 1,
      status: 'active',
      permissions: ['employee.read'],
    });
    const grant = await service.grantRole(f.actor.token, f.org.id, {
      roleDefinitionId: role.id,
      userId: f.peer.id,
      scope: { kind: 'own' },
      validFrom: now,
      validTo: new Date('2026-11-01T00:00:00Z'),
    });
    await service.revokeGrant(
      f.actor.token,
      f.org.id,
      grant.id,
      0,
      'Synthetic test revoke',
    );
    expect(events.map((e) => e.type)).toEqual([
      'role.defined',
      'role.granted',
      'role.revoked',
    ]);
    expect(
      events.every((e) => e.actorId === f.actor.id && Object.isFrozen(e)),
    ).toBe(true);
    expect(
      securityAuditEventSchema.safeParse({ ...events[0], token: 'secret' })
        .success,
    ).toBe(false);
    expect(
      Object.isFrozen(
        securityEvent({
          requestId: randomUUID(),
          type: 'identity.rejected',
          outcome: 'denied',
        }),
      ),
    ).toBe(true);
  });
});
