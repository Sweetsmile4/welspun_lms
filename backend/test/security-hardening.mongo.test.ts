import { randomUUID } from 'node:crypto';
import { mongo, Types } from 'mongoose';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { localSecurityStore } from './security-local-fixture.js';
import { managementFixture } from './management-fixture.js';
import { hardeningScenarios } from './security-hardening-scenarios.js';
import { createAuthorizationService } from '../src/modules/identity/authorization/service.js';
import { fingerprint } from '../src/modules/identity/management/receipts.js';
import {
  securityEvent,
  type SecurityAuditEvent,
} from '../src/platform/security-audit.js';
import { now } from './authorization-scenarios.js';

describe.skipIf(process.env.RUN_MONGO_INTEGRATION !== 'true')(
  'security audit/receipt recovery on isolated MongoDB',
  () => {
    let local: Awaited<ReturnType<typeof localSecurityStore>>;
    let commitFault = false,
      commitCalls = 0;
    function error(label: string) {
      const value = new mongo.MongoServerError({
        message: 'Synthetic deterministic transaction failure',
        code: 112,
      });
      value.addErrorLabel(label);
      return value;
    }
    beforeAll(async () => {
      local = await localSecurityStore((session) => {
        if (commitFault) {
          const commit = session.commitTransaction.bind(session);
          session.commitTransaction = async (...args) => {
            commitCalls++;
            await commit(...args);
            if (commitFault) {
              commitFault = false;
              throw error('UnknownTransactionCommitResult');
            }
          };
        }
      });
    });
    afterAll(async () => {
      if (local) await local.close();
    });
    hardeningScenarios(() => local.store);
    it('enforces append-only API, duplicate event identity, strict schema, scope and explicit non-TTL indexes', async () => {
      const f = await managementFixture(local.store),
        other = await managementFixture(local.store);
      const event = securityEvent(
        {
          requestId: randomUUID(),
          type: 'employee.provisioned',
          outcome: 'allowed',
          organizationId: f.org.id,
          actorId: f.actor.id,
          resourceId: f.peer.id,
        },
        now,
      );
      await local.repository.transaction((tx) => local.audit.append(tx, event));
      await expect(
        local.repository.transaction((tx) => local.audit.append(tx, event)),
      ).rejects.toMatchObject({ code: 'DUPLICATE' });
      for (const change of [
        { token: 'SENSITIVE' },
        { organizationId: other.org.id },
        { resourceId: other.peer.id },
        { actorId: other.actor.id },
        { type: 'identity.verified' },
        { outcome: 'denied' },
      ])
        await expect(
          local.repository.transaction((tx) =>
            local.audit.append(tx, {
              ...event,
              eventId: randomUUID(),
              ...change,
            } as SecurityAuditEvent),
          ),
        ).rejects.toThrow();
      expect(
        'delete' in local.audit ||
          'update' in local.audit ||
          'model' in local.audit,
      ).toBe(false);
      await expect(
        local.audit.append(
          {} as Parameters<typeof local.audit.append>[0],
          event,
        ),
      ).rejects.toThrow('domain transaction');
      const indexes = await local.adapter.connection
        .db!.collection('securityAuditEvents')
        .indexes();
      expect(
        indexes.some((i) => i.name === 'security_event_identity' && i.unique),
      ).toBe(true);
      expect(indexes.some((i) => 'expireAfterSeconds' in i)).toBe(false);
    });
    it('allows bounded internal audit reads only with current explicit organization audit.read', async () => {
      const f = await managementFixture(local.store),
        other = await managementFixture(local.store);
      const core = createAuthorizationService(local.repository, f.provider, {
        isolatedTest: true,
        clock: () => now,
      });
      await expect(
        local.audit.readAuthorized(core, f.actor.token, f.org.id),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await f.grant(
        { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
        ['audit.read'],
      );
      await expect(
        local.audit.readAuthorized(core, f.actor.token, f.org.id),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await f.grant({ kind: 'organization' }, ['audit.read']);
      for (const fixture of [f, f, other])
        await local.repository.transaction((tx) =>
          local.audit.append(
            tx,
            securityEvent(
              {
                requestId: randomUUID(),
                type: 'employee.provisioned',
                outcome: 'allowed',
                organizationId: fixture.org.id,
                actorId: fixture.actor.id,
                resourceId: fixture.peer.id,
              },
              now,
            ),
          ),
        );
      const first = await local.audit.readAuthorized(
        core,
        f.actor.token,
        f.org.id,
        { limit: 1 },
      );
      const second = await local.audit.readAuthorized(
        core,
        f.actor.token,
        f.org.id,
        { limit: 1, cursor: first.nextCursor! },
      );
      expect(first.events).toHaveLength(1);
      expect(second.events).toHaveLength(1);
      expect(first.events[0]!.eventId).not.toBe(second.events[0]!.eventId);
      expect(
        [...first.events, ...second.events].every(
          (e) => e.organizationId === f.org.id,
        ),
      ).toBe(true);
      await expect(
        local.audit.readAuthorized(core, f.actor.token, f.org.id, {
          limit: 101,
        }),
      ).rejects.toThrow();
      await expect(
        local.audit.readAuthorized(
          { within: core.within },
          f.actor.token,
          f.org.id,
        ),
      ).rejects.toThrow('Protected authorization');
    });
    it('fails closed on restored legacy, unsupported, misbound or corrupted stored responses without reexecution', async () => {
      let transform: (value: unknown) => unknown = (value) => value;
      const wrapped = {
        ...local.store,
        management: {
          ...local.management,
          receipt: async (
            ...args: Parameters<typeof local.management.receipt>
          ) =>
            transform(await local.management.receipt(...args)) as Awaited<
              ReturnType<typeof local.management.receipt>
            >,
        },
      };
      const f = await managementFixture(wrapped);
      await f.grant({ kind: 'organization' }, ['user.create']);
      const key = randomUUID(),
        send = () =>
          request(f.app)
            .post(f.base + '/employees')
            .set('authorization', 'Bearer ' + f.bearer)
            .set('idempotency-key', key)
            .send(f.provision);
      await send().expect(201);
      for (const change of [
        { responseVersion: 99 },
        { schemaVersion: undefined },
        { actorId: otherId() },
        { responseDigest: '0'.repeat(64) },
        {
          data: {
            id: otherId(),
            displayName: 'Synthetic corrupt',
            status: 'active',
            revision: 0,
          },
        },
      ]) {
        transform = (value) => ({ ...(value as object), ...change });
        const result = await send().expect(503);
        expect(result.body.error.code).toBe('REPLAY_UNAVAILABLE');
      }
      transform = (value) => {
        const receipt = value as { data: object };
        const data = { ...receipt.data, token: 'SENSITIVE' };
        return { ...receipt, data, responseDigest: fingerprint(data) };
      };
      expect(JSON.stringify((await send().expect(500)).body)).not.toContain(
        'SENSITIVE',
      );
      transform = () => null;
      await send().expect(409); // Simulated incomplete restore; surviving business uniqueness prevents a duplicate, not a fabricated replay.
      expect(await local.store.receiptCount(f.org.id)).toBe(1);
      expect(
        (await local.store.events()).filter(
          (e) => e.organizationId === f.org.id,
        ),
      ).toHaveLength(1);
    });
    function otherId() {
      return new Types.ObjectId().toHexString();
    }
    it('rolls back before domain work and after domain work but before audit insertion', async () => {
      for (const boundary of ['before-domain', 'after-domain'] as const) {
        const wrapped = {
          ...local.store,
          management: {
            ...local.management,
            receipt: async (
              ...args: Parameters<typeof local.management.receipt>
            ) => {
              if (boundary === 'before-domain')
                throw new Error('Synthetic before-domain failure');
              return local.management.receipt(...args);
            },
          },
          appendAudit: async (
            ...args: Parameters<NonNullable<typeof local.store.appendAudit>>
          ) => {
            if (boundary === 'after-domain')
              throw new Error('Synthetic after-domain failure');
            return local.store.appendAudit!(...args);
          },
        };
        const f = await managementFixture(wrapped);
        await f.grant({ kind: 'organization' }, ['user.create']);
        await request(f.app)
          .post(f.base + '/employees')
          .set('authorization', 'Bearer ' + f.bearer)
          .set('idempotency-key', randomUUID())
          .send(f.provision)
          .expect(boundary === 'before-domain' ? 500 : 503);
        expect(
          await local.repository.transaction((tx) =>
            tx.userByIdentity(
              f.org.id,
              f.provision.identityIssuer,
              f.provision.identitySubject,
            ),
          ),
        ).toBeNull();
        expect(await local.store.receiptCount(f.org.id)).toBe(0);
        expect(
          (await local.store.events()).some(
            (e) => e.organizationId === f.org.id,
          ),
        ).toBe(false);
      }
    });
    it('rolls back actual audit insertion failure without domain/receipt partial commit', async () => {
      const eventId = randomUUID();
      const wrapped = {
        ...local.store,
        appendAudit: async (
          tx: Parameters<typeof local.audit.append>[0],
          event: SecurityAuditEvent,
        ) => local.audit.append(tx, { ...event, eventId }),
      };
      const f = await managementFixture(wrapped);
      await f.grant({ kind: 'organization' }, ['user.create']);
      const send = (subject: string) =>
        request(f.app)
          .post(f.base + '/employees')
          .set('authorization', 'Bearer ' + f.bearer)
          .set('idempotency-key', randomUUID())
          .send({ ...f.provision, identitySubject: subject });
      await send('synthetic-first').expect(201);
      await send('synthetic-duplicate-audit').expect(503);
      expect(
        await local.repository.transaction((tx) =>
          tx.userByIdentity(
            f.org.id,
            f.provision.identityIssuer,
            'synthetic-duplicate-audit',
          ),
        ),
      ).toBeNull();
      expect(await local.store.receiptCount(f.org.id)).toBe(1);
    });
    it('retries a labeled transient failure after receipt insert and commits exactly one result/event/receipt', async () => {
      let attempts = 0;
      const wrapped = {
        ...local.store,
        management: {
          ...local.management,
          saveReceipt: async (
            ...args: Parameters<typeof local.management.saveReceipt>
          ) => {
            await local.management.saveReceipt(...args);
            attempts++;
            if (attempts === 1) throw error('TransientTransactionError');
          },
        },
      };
      const f = await managementFixture(wrapped);
      await f.grant({ kind: 'organization' }, ['user.create']);
      await request(f.app)
        .post(f.base + '/employees')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', randomUUID())
        .send(f.provision)
        .expect(201);
      expect(attempts).toBe(2);
      expect(await local.store.receiptCount(f.org.id)).toBe(1);
      expect(
        (await local.store.events()).filter(
          (e) => e.organizationId === f.org.id,
        ),
      ).toHaveLength(1);
    });
    it('retries a lost commit acknowledgement without repeating committed domain work', async () => {
      const f = await managementFixture(local.store);
      await f.grant({ kind: 'organization' }, ['user.create']);
      commitFault = true;
      commitCalls = 0;
      await request(f.app)
        .post(f.base + '/employees')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', randomUUID())
        .send(f.provision)
        .expect(201);
      expect(commitCalls).toBe(2);
      expect(commitFault).toBe(false);
      expect(await local.store.receiptCount(f.org.id)).toBe(1);
      expect(
        (await local.store.events()).filter(
          (e) => e.organizationId === f.org.id,
        ),
      ).toHaveLength(1);
    });
    it('replays after commit but before response delivery without duplicating the mutation', async () => {
      const f = await managementFixture(local.store);
      await f.grant({ kind: 'organization' }, ['user.create']);
      let drop = true;
      const proxy = express();
      proxy.use((_req, response, next) => {
        const json = response.json.bind(response);
        response.json = (body) => {
          if (drop) {
            drop = false;
            response.destroy();
            return response;
          }
          return json(body);
        };
        next();
      });
      proxy.use(f.app);
      const key = randomUUID(),
        send = () =>
          request(proxy)
            .post(f.base + '/employees')
            .set('authorization', 'Bearer ' + f.bearer)
            .set('idempotency-key', key)
            .send(f.provision);
      await expect(send()).rejects.toThrow();
      const replay = await send().expect(201);
      expect(replay.headers['idempotency-replayed']).toBe('true');
      expect(await local.store.receiptCount(f.org.id)).toBe(1);
      expect(
        (await local.store.events()).filter(
          (e) => e.organizationId === f.org.id,
        ),
      ).toHaveLength(1);
    });
  },
);
