import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Types, type ClientSession } from 'mongoose';
import request from 'supertest';
import { createMongoAdapter } from '../src/platform/database.js';
import { createMongoAuthorizationRepository } from '../src/modules/identity/authorization/mongo-repository.js';
import { createMongoManagementStore } from '../src/modules/identity/management/mongo-store.js';
import { createOrganizationModels } from '../src/modules/identity/organization/models.js';
import type { AuthorizationTransaction } from '../src/modules/identity/authorization/types.js';
import type { SecurityAuditEvent } from '../src/platform/security-audit.js';
import {
  managementFixture,
  type ManagementTestStore,
} from './management-fixture.js';
import { managementScenarios } from './management-scenarios.js';
import { now } from './authorization-scenarios.js';
import { createMongoSecurityAudit } from '../src/platform/mongo-security-audit.js';
import { securityAuditEventSchema } from '../src/platform/security-audit.js';

describe.skipIf(process.env.RUN_MONGO_INTEGRATION !== 'true')(
  'management controllers on actual isolated local MongoDB',
  () => {
    let adapter: ReturnType<typeof createMongoAdapter>;
    let repository: ReturnType<typeof createMongoAuthorizationRepository>;
    let management: ReturnType<typeof createMongoManagementStore>;
    let audit: ReturnType<typeof createMongoSecurityAudit>;
    const sessions = new WeakMap<AuthorizationTransaction, ClientSession>();
    beforeAll(async () => {
      if (
        process.env.MONGO_TEST_ALLOW_WRITE !== 'true' ||
        !process.env.MONGO_TEST_URI
      )
        throw new Error('Explicit local URI/write opt-in required');
      const uri = new URL(process.env.MONGO_TEST_URI);
      if (!uri.pathname.startsWith('/welspun_lms_test_'))
        throw new Error('Isolated test database prefix required');
      uri.pathname = '/welspun_lms_test_' + randomUUID().replaceAll('-', '');
      adapter = createMongoAdapter({
        uri: uri.toString(),
        environment: 'test',
        isolated: true,
      });
      await adapter.connect({ explicitlyAllowConnection: true });
      if (!(await adapter.connection.db!.admin().command({ hello: 1 })).setName)
        throw new Error('Replica set required');
      repository = createMongoAuthorizationRepository(
        adapter.connection,
        (tx, session) => sessions.set(tx, session),
      );
      await repository.initializeIndexes();
      management = createMongoManagementStore(adapter.connection, (tx) =>
        sessions.get(tx),
      );
      await management.initializeIndexes();
      audit = createMongoSecurityAudit(
        adapter.connection,
        (tx) => sessions.get(tx),
        { isolatedTest: true },
      );
      await audit.initializeIndexes();
    });
    afterAll(async () => {
      if (adapter) {
        if (adapter.state === 1 && repository)
          await adapter.connection.dropDatabase();
        await adapter.disconnect();
      }
    });
    const store = (): ManagementTestStore => ({
      repository,
      management,
      appendAudit: async (tx, event, fail) => {
        await audit.append(tx, event);
        if (fail) throw new Error('Synthetic failure after audit insert');
      },
      events: async () =>
        adapter.connection
          .db!.collection<SecurityAuditEvent>('securityAuditEvents')
          .find({}, { projection: { _id: 0 } })
          .toArray()
          .then((rows) =>
            rows.map((row) =>
              securityAuditEventSchema.parse({
                ...row,
                organizationId: String(row.organizationId),
                actorId: String(row.actorId),
                resourceId: String(row.resourceId),
                occurredAt: new Date(row.occurredAt).toISOString(),
              }),
            ),
          ),
      receiptCount: async (org) =>
        adapter.connection
          .db!.collection('managementCommandReceipts')
          .countDocuments({ organizationId: new Types.ObjectId(org) }),
      disable: async (id) => {
        const users = createOrganizationModels(adapter.connection).users;
        const user = (await users.findById(id).lean())!;
        await repository.transaction(async (tx) => {
          const org = (await tx.organization(
            user.organizationId.toHexString(),
          ))!;
          await tx.lockOrganization(
            org.id,
            org.revision,
            false,
            'synthetic-management-disable',
            now,
          );
          await users.updateOne(
            { _id: id },
            { $set: { status: 'inactive' } },
            { session: sessions.get(tx) },
          );
        });
      },
    });
    managementScenarios(store);
    it('applies employee scope before filters, totals and pagination, without leaking private fields', async () => {
      const f = await managementFixture(store());
      await f.grant(
        { kind: 'unit', unitId: f.department.id, includeDescendants: false },
        ['employee.read'],
      );
      const get = (query = '') =>
        request(f.app)
          .get(f.base + '/employees' + query)
          .set('authorization', 'Bearer ' + f.bearer);
      const first = await get('?limit=1').expect(200);
      expect(first.body.data.total).toBe(2);
      expect(first.body.meta.nextCursor).toBe(first.body.data.nextCursor);
      expect(first.body.data.items).toHaveLength(1);
      const second = await get(
        '?limit=1&cursor=' + first.body.data.nextCursor,
      ).expect(200);
      expect(second.body.data.total).toBe(2);
      expect(second.body.data.items).toHaveLength(1);
      expect(second.body.data.items[0].id).not.toBe(
        first.body.data.items[0].id,
      );
      expect(second.body.data.nextCursor).toBeNull();
      const impossible = await get('?namePrefix=.%2A').expect(200);
      expect(impossible.body.data.total).toBe(0);
      await get('?organizationId=' + f.org.id).expect(422);
      await get('?limit[$gt]=0').expect(422);
      const ids = [first, second].flatMap((r) =>
        r.body.data.items.map((row: { id: string }) => row.id),
      );
      expect(ids.sort()).toEqual([f.actor.id, f.peer.id].sort());
      expect(JSON.stringify(first.body)).not.toContain('identitySubject');
      await f.grant(
        { kind: 'unit', unitId: f.department.id, includeDescendants: true },
        ['employee.read'],
      );
      expect((await get().expect(200)).body.data.total).toBe(3);
      await f.grant(
        { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
        ['employee.read'],
      );
      expect((await get().expect(200)).body.data.total).toBe(4);
    });
    it('uses explicit unit.read, denies parents/siblings, and filters inactive ancestry', async () => {
      const f = await managementFixture(store());
      await f.grant(
        { kind: 'unit', unitId: f.department.id, includeDescendants: false },
        ['unit.read'],
      );
      const get = () =>
        request(f.app)
          .get(f.base + '/org-units')
          .set('authorization', 'Bearer ' + f.bearer);
      const exact = await get().expect(200);
      expect(exact.body.data.total).toBe(1);
      expect(exact.body.data.items[0].id).toBe(f.department.id);
      await f.grant(
        { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
        ['unit.read'],
      );
      expect((await get().expect(200)).body.data.total).toBe(4);
      await repository.transaction(async (tx) => {
        const org = (await tx.organization(f.org.id))!;
        await tx.lockOrganization(
          org.id,
          org.revision,
          false,
          'synthetic-inactivate',
          now,
        );
        await createOrganizationModels(adapter.connection).orgUnits.updateOne(
          { _id: f.department.id },
          { $set: { status: 'inactive' } },
          { session: sessions.get(tx) },
        );
      });
      expect((await get().expect(200)).body.data.total).toBe(2);
    });
    it('separates role.read from security.manage and confines all versions to the organization', async () => {
      const f = await managementFixture(store());
      await f.grant({ kind: 'organization' }, ['role.read']);
      const history = await f.role(['employee.read'], 'SYN_HISTORY');
      await f.role(['employee.read'], history.code, 2, 'inactive');
      const response = await request(f.app)
        .get(f.base + '/roles?status=inactive')
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(200);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.items[0].code).toBe(history.code);
      expect(response.body.data.items[0]).not.toHaveProperty('createdBy');
      await request(f.app)
        .post(f.base + '/roles')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', randomUUID())
        .set('if-match', '"0"')
        .send({ code: 'DENIED', permissions: ['unit.read'], status: 'active' })
        .expect(403);
      const other = await managementFixture(store());
      await request(f.app)
        .get(other.base + '/roles')
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(403);
    });
    it('filters grant scope and employee affiliations before totals, preserving revocation history', async () => {
      const f = await managementFixture(store());
      await f.grant(
        { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
        ['grant.read'],
      );
      await f.grant(
        { kind: 'unit', unitId: f.department.id, includeDescendants: false },
        ['employee.read'],
        { userId: f.peer.id, revoked: true },
      );
      await f.grant(
        { kind: 'unit', unitId: f.plantB.id, includeDescendants: true },
        ['employee.read'],
        { userId: f.remote.id },
      );
      await f.grant(
        { kind: 'unit', unitId: f.department.id, includeDescendants: false },
        ['employee.read'],
        { userId: f.remote.id },
      );
      await f.grant({ kind: 'organization' }, ['employee.read']);
      const response = await request(f.app)
        .get(f.base + '/role-grants?limit=1')
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(200);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.items).toHaveLength(1);
      const peer = await request(f.app)
        .get(f.base + '/role-grants?userId=' + f.peer.id)
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(200);
      expect(peer.body.data.total).toBe(1);
      expect(peer.body.data.items[0].revokedAt).not.toBeNull();
      expect(peer.body.data.items[0]).not.toHaveProperty('grantedBy');
      const remote = await request(f.app)
        .get(f.base + '/role-grants?userId=' + f.remote.id)
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(200);
      expect(remote.body.data.total).toBe(0);
    });
    it('keeps transferred cross-plant history concealed and does not use request filters to expand scope', async () => {
      const f = await managementFixture(store());
      const old = (await f.raw.membershipHistory(f.org.id, f.remote.id))[0]!;
      await f.raw.transferMembership(
        {
          organizationId: f.org.id,
          membershipId: old.id,
          expectedRevision: 0,
          targetOrgUnitId: f.department.id,
          effectiveAt: now,
        },
        { actorId: 'synthetic-bootstrap' },
      );
      await f.grant(
        { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
        ['membership.read'],
      );
      await request(f.app)
        .get(f.base + '/employees/' + f.remote.id + '/current-memberships')
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(200);
      await request(f.app)
        .get(f.base + '/employees/' + f.remote.id + '/memberships')
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(403);
      await request(f.app)
        .get(
          f.base +
            '/employees/' +
            f.remote.id +
            '/memberships?scopeUnitId=' +
            f.plantB.id,
        )
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(422);
    });
    it('creates the compound receipt uniqueness index and requires a live transaction/session', async () => {
      const indexes = await adapter.connection
        .db!.collection('managementCommandReceipts')
        .indexes();
      expect(
        indexes.some(
          (i) => i.name === 'management_command_identity' && i.unique,
        ),
      ).toBe(true);
      await expect(
        management.receipt({} as AuthorizationTransaction, {
          organizationId: new Types.ObjectId().toHexString(),
          actorId: new Types.ObjectId().toHexString(),
          operation: 'employee.provision',
          keyHash: 'a'.repeat(64),
        }),
      ).rejects.toThrow('domain transaction');
    });
  },
);
