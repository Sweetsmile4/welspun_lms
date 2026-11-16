import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { vi } from 'vitest';
import {
  employeeSummarySchema,
  membershipSummarySchema,
  resourceIdSchema,
} from '@welspun/contracts';
import { createApp } from '../src/app.js';
import {
  createHttpApplicationService,
  createHttpSecurity,
  protectedController,
} from '../src/modules/identity/http-security.js';
import type {
  AuthorizationRepository,
  AuthorizationTransaction,
} from '../src/modules/identity/authorization/types.js';
import {
  securityAuditEventSchema,
  type SecurityAuditEvent,
} from '../src/platform/security-audit.js';
import { createLogger } from '../src/platform/logger.js';
import { parseEnvironment } from '../src/platform/environment.js';
import { authorizationFixture, now } from './authorization-scenarios.js';

export interface HttpTestStore {
  repository: AuthorizationRepository;
  disable(id: string): Promise<void>;
  appendAudit?: (
    tx: AuthorizationTransaction,
    event: SecurityAuditEvent,
    fail: boolean,
  ) => Promise<void>;
  events?: () => Promise<SecurityAuditEvent[]>;
}
export async function httpFixture(store: HttpTestStore) {
  const f = await authorizationFixture(store.repository);
  const events: SecurityAuditEvent[] = [];
  let failAudit = false;
  let failIdentityAudit = false;
  let instant = now.getTime();
  const bearer = 'synthetic.' + randomUUID();
  const peerBearer = 'synthetic.' + randomUUID();
  const security = createHttpSecurity({
    isolatedTest: true,
    clock: () => new Date(instant),
    verifier: {
      mode: 'synthetic-test',
      verifyBearer: async (token) => {
        const oldToken =
          token === bearer
            ? f.actor.token
            : token === peerBearer
              ? f.peer.token
              : null;
        const identity = oldToken && (await f.provider.authenticate(oldToken));
        return identity
          ? { ...identity, expiresAt: now.getTime() + 60000 }
          : null;
      },
    },
    audit: {
      append: async (event) => {
        if (failIdentityAudit)
          throw new Error('SENSITIVE verifier/audit diagnostic');
        events.push(event);
      },
    },
  });
  const service = createHttpApplicationService(
    store.repository,
    security,
    {
      durability: 'isolated-test',
      append: async (tx, event) => {
        securityAuditEventSchema.parse(event);
        if (store.appendAudit) return store.appendAudit(tx, event, failAudit);
        if (failAudit) throw new Error('SENSITIVE audit diagnostic');
        events.push(event);
      },
    },
    { isolatedTest: true, clock: () => new Date(instant) },
  );
  const router = Router();
  router.use(security.authenticate);
  const params = z.strictObject({
    organizationId: resourceIdSchema,
    userId: resourceIdSchema,
  });
  router.get(
    '/organizations/:organizationId/employees/:userId/memberships',
    protectedController(
      security,
      params,
      (request) => request.params,
      (credential, value) =>
        service.membershipHistory(
          credential,
          value.organizationId,
          value.userId,
        ),
      (rows) =>
        rows.map((row) => ({
          id: row.id,
          userId: row.userId,
          orgUnitId: row.orgUnitId,
          validFrom: row.validFrom.toISOString(),
          validTo: row.validTo?.toISOString() ?? null,
          primary: row.primary,
          revision: row.revision,
        })),
      z.array(membershipSummarySchema),
    ),
  );
  const provisionInput = z.strictObject({
    params: z.strictObject({ organizationId: resourceIdSchema }),
    body: z.strictObject({
      identityIssuer: z.string().min(1).max(512),
      identitySubject: z.string().min(1).max(256),
      displayName: z.string().trim().min(1).max(200),
    }),
    query: z.strictObject({}),
  });
  router.post(
    '/organizations/:organizationId/employees',
    security.isolatedMutation,
    protectedController(
      security,
      provisionInput,
      (request) => ({
        params: request.params,
        body: request.body,
        query: request.query,
      }),
      (credential, value) =>
        service.createUser(credential, {
          ...value.body,
          organizationId: value.params.organizationId,
        }),
      (row) => ({
        id: row.id,
        displayName: row.displayName,
        status: row.status,
        revision: row.revision,
      }),
      employeeSummarySchema,
      201,
    ),
  );
  const transfer = z.strictObject({
    params: z.strictObject({
      organizationId: resourceIdSchema,
      membershipId: resourceIdSchema,
    }),
    body: z.strictObject({
      expectedRevision: z.number().int().nonnegative(),
      targetOrgUnitId: resourceIdSchema,
      effectiveAt: z.iso.datetime(),
    }),
  });
  router.post(
    '/organizations/:organizationId/memberships/:membershipId/transfers',
    security.isolatedMutation,
    protectedController(
      security,
      transfer,
      (request) => ({ params: request.params, body: request.body }),
      (credential, value) =>
        service.transferMembership(credential, {
          ...value.params,
          ...value.body,
          effectiveAt: new Date(value.body.effectiveAt),
        }),
      (value) => ({
        id: value.membership.id,
        userId: value.membership.userId,
        orgUnitId: value.membership.orgUnitId,
        validFrom: value.membership.validFrom.toISOString(),
        validTo: value.membership.validTo?.toISOString() ?? null,
        primary: value.membership.primary,
        revision: value.membership.revision,
      }),
      membershipSummarySchema,
      201,
    ),
  );
  // Test-only probes exercise real shared error and output handling without enabling normal routes.
  router.get(
    '/projection-failure',
    protectedController(
      security,
      z.strictObject({}),
      () => ({}),
      async () => ({}),
      () => ({ token: 'SENSITIVE' }),
      employeeSummarySchema,
    ),
  );
  const logger = createLogger('silent');
  const logs = vi.spyOn(logger, 'info');
  const app = createApp(
    parseEnvironment({
      NODE_ENV: 'test',
      ISOLATED_DEVELOPMENT: 'true',
      LOG_LEVEL: 'silent',
    }),
    { isolatedTestRouter: router, logger },
  );
  return {
    ...f,
    app,
    security,
    service,
    events,
    logs,
    bearer,
    peerBearer,
    failAudit: () => {
      failAudit = true;
    },
    failIdentityAudit: () => {
      failIdentityAudit = true;
    },
    expire: () => {
      instant += 60000;
    },
    path: (userId = f.actor.id, organizationId = f.org.id) =>
      `/api/v1/__test/organizations/${organizationId}/employees/${userId}/memberships`,
    provisionPath: `/api/v1/__test/organizations/${f.org.id}/employees`,
    provision: {
      identityIssuer: 'urn:synthetic:http',
      identitySubject: 'synthetic-http-new',
      displayName: 'Synthetic HTTP learner',
    },
  };
}
