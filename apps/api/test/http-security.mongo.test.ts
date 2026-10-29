import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe } from 'vitest';
import type { ClientSession } from 'mongoose';
import { createMongoAdapter } from '../src/platform/database.js';
import { createMongoAuthorizationRepository } from '../src/modules/identity/authorization/mongo-repository.js';
import { createOrganizationModels } from '../src/modules/identity/organization/models.js';
import type { AuthorizationTransaction } from '../src/modules/identity/authorization/types.js';
import type { SecurityAuditEvent } from '../src/platform/security-audit.js';
import { httpSecurityScenarios } from './http-security-scenarios.js';
import { now } from './authorization-scenarios.js';

describe.skipIf(process.env.RUN_MONGO_INTEGRATION !== 'true')(
  'HTTP boundary on isolated real local MongoDB',
  () => {
    let adapter: ReturnType<typeof createMongoAdapter>;
    let repository: ReturnType<typeof createMongoAuthorizationRepository>;
    const sessions = new WeakMap<AuthorizationTransaction, ClientSession>();
    beforeAll(async () => {
      if (
        process.env.MONGO_TEST_ALLOW_WRITE !== 'true' ||
        !process.env.MONGO_TEST_URI
      )
        throw new Error('Explicit local test URI/write opt-in required');
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
      // Test evidence ONLY: no runtime audit model, durable storage policy or retention/compliance claim.
      await adapter.connection.db!.createCollection('syntheticSecurityAudit');
    });
    afterAll(async () => {
      if (adapter) {
        if (adapter.state === 1 && repository)
          await adapter.connection.dropDatabase();
        await adapter.disconnect();
      }
    });
    httpSecurityScenarios(() => ({
      repository,
      appendAudit: async (tx, event, fail) => {
        await adapter.connection
          .db!.collection('syntheticSecurityAudit')
          .insertOne({ ...event }, { session: sessions.get(tx)! });
        if (fail)
          throw new Error(
            'Synthetic failure AFTER audit insert; both writes must roll back',
          );
      },
      events: async () =>
        adapter.connection
          .db!.collection<SecurityAuditEvent>('syntheticSecurityAudit')
          .find({}, { projection: { _id: 0 } })
          .toArray(),
      disable: async (id) => {
        const models = createOrganizationModels(adapter.connection);
        const user = (await models.users.findById(id).lean())!;
        await repository.transaction(async (tx) => {
          const org = (await tx.organization(
            user.organizationId.toHexString(),
          ))!;
          await tx.lockOrganization(
            org.id,
            org.revision,
            false,
            'synthetic-http-disable',
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
  },
);
