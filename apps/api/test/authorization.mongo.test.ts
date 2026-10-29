import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Types, type ClientSession } from 'mongoose';
import { createMongoAdapter } from '../src/platform/database.js';
import { createMongoAuthorizationRepository } from '../src/modules/identity/authorization/mongo-repository.js';
import { createOrganizationModels } from '../src/modules/identity/organization/models.js';
import { createAuthorizationModels } from '../src/modules/identity/authorization/models.js';
import type { AuthorizationTransaction } from '../src/modules/identity/authorization/types.js';
import type { QueryDomain } from '../src/modules/identity/authorization/engine.js';
import {
  authorizationFixture,
  authorizationScenarios,
  now,
} from './authorization-scenarios.js';

describe.skipIf(process.env.RUN_MONGO_INTEGRATION !== 'true')(
  'authorization on isolated real local MongoDB replica set',
  () => {
    let adapter: ReturnType<typeof createMongoAdapter>;
    let repository: ReturnType<typeof createMongoAuthorizationRepository>;
    const sessions = new WeakMap<AuthorizationTransaction, ClientSession>();
    beforeAll(async () => {
      if (
        process.env.MONGO_TEST_ALLOW_WRITE !== 'true' ||
        !process.env.MONGO_TEST_URI
      )
        throw new Error('Explicit local test URI and write opt-in required');
      const uri = new URL(process.env.MONGO_TEST_URI);
      if (!uri.pathname.startsWith('/welspun_lms_test_'))
        throw new Error('Isolated database prefix required');
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
    });
    afterAll(async () => {
      if (adapter) {
        if (adapter.state === 1 && repository)
          await adapter.connection.dropDatabase();
        await adapter.disconnect();
      }
    });
    authorizationScenarios(() => ({
      repository,
      disable: async (id) => {
        const models = createOrganizationModels(adapter.connection);
        const user = await models.users.findById(id).lean();
        if (!user) throw new Error('Synthetic user missing');
        await repository.transaction(async (tx) => {
          const org = (await tx.organization(
            user.organizationId.toHexString(),
          ))!;
          await tx.lockOrganization(
            org.id,
            org.revision,
            false,
            'synthetic-disable-test',
            now,
          );
          await models.users.updateOne(
            { _id: id },
            { $set: { status: 'inactive' } },
            { session: sessions.get(tx) },
          );
        });
      },
    }));
    it('executes employee scope before counts/pagination and rejects filter substitution', async () => {
      const f = await authorizationFixture(repository);
      await f.grant({
        kind: 'unit',
        unitId: f.plantA.id,
        includeDescendants: true,
      });
      const users = createOrganizationModels(adapter.connection).users;
      const result = await f.service.query(
        f.actor.token,
        f.org.id,
        'employees',
        async (tx, stages) =>
          users
            .aggregate([
              ...stages,
              {
                $facet: {
                  rows: [{ $sort: { _id: 1 } }, { $limit: 2 }],
                  total: [{ $count: 'value' }],
                  forged: [
                    { $match: { _id: new Types.ObjectId(f.remote.id) } },
                    { $count: 'value' },
                  ],
                },
              },
            ])
            .session(sessions.get(tx)!),
      );
      expect(result[0].total).toEqual([{ value: 4 }]);
      expect(result[0].rows).toHaveLength(2);
      expect(result[0].forged).toEqual([]);
      await f.grant({ kind: 'own' }, ['membership.read']);
      await expect(
        f.service.query(f.actor.token, f.org.id, 'audit', async () => []),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
    it('keeps a protected transaction ahead of a racing revocation; all later operations deny', async () => {
      const f = await authorizationFixture(repository);
      await f.grant({ kind: 'organization' }, ['security.manage']);
      const grant = await f.grant({ kind: 'organization' });
      let entered!: () => void, release!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const read = f.service.query(
        f.actor.token,
        f.org.id,
        'employees',
        async () => {
          entered();
          await held;
          return 'synthetic protected result';
        },
      );
      await started;
      const revoke = f.service.revokeGrant(
        f.actor.token,
        f.org.id,
        grant.id,
        0,
        'Synthetic race revocation',
      );
      release();
      await expect(read).resolves.toBe('synthetic protected result');
      await revoke;
      await expect(f.checkUser(f.peer.id)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });
    it('executes own, exact-department and descendant constraints on employees and all future query fixtures', async () => {
      const f = await authorizationFixture(repository);
      const users = createOrganizationModels(adapter.connection).users;
      const records = adapter.connection.db!.collection(
        'authorizationQueryFixtures',
      );
      const affiliations = [
        f.department,
        f.department,
        f.sibling,
        f.child,
        f.plantB,
      ];
      const people = [f.actor, f.peer, f.siblingUser, f.childUser, f.remote];
      await records.insertMany(
        people.map((user, index) => ({
          organizationId: new Types.ObjectId(f.org.id),
          userId: new Types.ObjectId(user.id),
          orgUnitId: new Types.ObjectId(affiliations[index]!.id),
          authorizationState: 'active',
        })),
      );
      await records.insertOne({
        organizationId: new Types.ObjectId(f.org.id),
        userId: new Types.ObjectId(f.actor.id),
        orgUnitId: new Types.ObjectId(f.department.id),
        authorizationState: 'archived',
      });
      const domains: QueryDomain[] = [
        'progress',
        'assignments',
        'departmentReports',
        'plantReports',
        'audit',
      ];
      async function counts(expected: number) {
        const employees = await f.service.query(
          f.actor.token,
          f.org.id,
          'employees',
          async (tx, stages) =>
            users
              .aggregate([...stages, { $count: 'value' }])
              .session(sessions.get(tx)!),
        );
        expect(employees).toEqual([{ value: expected }]);
        for (const domain of domains) {
          const result = await f.service.query(
            f.actor.token,
            f.org.id,
            domain,
            async (tx, stages) =>
              records
                .aggregate([...stages, { $count: 'value' }], {
                  session: sessions.get(tx)!,
                })
                .toArray(),
          );
          expect(result).toEqual([{ value: expected }]);
        }
      }
      await f.grant({ kind: 'own' }, [
        'employee.read',
        'progress.read',
        'assignment.read',
      ]);
      for (const domain of ['employees', 'progress', 'assignments'] as const) {
        const result = await f.service.query(
          f.actor.token,
          f.org.id,
          domain,
          async (tx, stages) =>
            domain === 'employees'
              ? users
                  .aggregate([...stages, { $count: 'value' }])
                  .session(sessions.get(tx)!)
              : records
                  .aggregate([...stages, { $count: 'value' }], {
                    session: sessions.get(tx)!,
                  })
                  .toArray(),
        );
        expect(result).toEqual([{ value: 1 }]);
      }
      await f.grant(
        { kind: 'unit', unitId: f.department.id, includeDescendants: false },
        [
          'employee.read',
          'progress.read',
          'assignment.read',
          'report.read',
          'audit.read',
        ],
      );
      await counts(2);
      await f.grant(
        { kind: 'unit', unitId: f.department.id, includeDescendants: true },
        [
          'employee.read',
          'progress.read',
          'assignment.read',
          'report.read',
          'audit.read',
        ],
      );
      await counts(3);
      await f.grant(
        { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
        [
          'employee.read',
          'progress.read',
          'assignment.read',
          'report.read',
          'audit.read',
        ],
      );
      await counts(4);
    });
    it('enforces role uniqueness and grant model validation at persistence level', async () => {
      const f = await authorizationFixture(repository);
      const role = await f.role(['employee.read']);
      await expect(f.role(['employee.read'], role.code)).rejects.toMatchObject({
        code: 'DUPLICATE',
      });
      const models = createAuthorizationModels(adapter.connection);
      const grant = await f.grant({ kind: 'organization' });
      const stored = (await models.roleGrants.findById(grant.id).lean())!;
      const invalid = new models.roleGrants({
        ...stored,
        _id: undefined,
        scope: { kind: 'unit' },
        validTo: stored.validFrom,
      });
      await expect(invalid.validate()).rejects.toThrow();
      const indexes = await models.roleDefinitions.listIndexes();
      expect(
        indexes.some((i) => i.name === 'role_code_version_unique' && i.unique),
      ).toBe(true);
    });
  },
);
