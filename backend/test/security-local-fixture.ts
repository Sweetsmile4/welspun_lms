import { randomUUID } from 'node:crypto';
import { type ClientSession } from 'mongoose';
import { createMongoAdapter } from '../src/platform/database.js';
import { createMongoAuthorizationRepository } from '../src/modules/identity/authorization/mongo-repository.js';
import { createMongoManagementStore } from '../src/modules/identity/management/mongo-store.js';
import { createMongoSecurityAudit } from '../src/platform/mongo-security-audit.js';
import { securityAuditEventSchema } from '../src/platform/security-audit.js';
import type { AuthorizationTransaction } from '../src/modules/identity/authorization/types.js';
import type { ManagementTestStore } from './management-fixture.js';
import { createOrganizationModels } from '../src/modules/identity/organization/models.js';
import { now } from './authorization-scenarios.js';

export async function localSecurityStore(
  onTransaction?: (session: ClientSession) => void,
) {
  if (
    process.env.MONGO_TEST_ALLOW_WRITE !== 'true' ||
    !process.env.MONGO_TEST_URI
  )
    throw new Error('Explicit local test URI/write opt-in required');
  const uri = new URL(process.env.MONGO_TEST_URI);
  if (!uri.pathname.startsWith('/welspun_lms_test_'))
    throw new Error('Isolated test prefix required');
  uri.pathname = '/welspun_lms_test_' + randomUUID().replaceAll('-', '');
  const adapter = createMongoAdapter({
    uri: uri.toString(),
    environment: 'test',
    isolated: true,
  });
  await adapter.connect({ explicitlyAllowConnection: true });
  if (!(await adapter.connection.db!.admin().command({ hello: 1 })).setName)
    throw new Error('Replica set required');
  const sessions = new WeakMap<AuthorizationTransaction, ClientSession>();
  const repository = createMongoAuthorizationRepository(
    adapter.connection,
    (tx, session) => {
      sessions.set(tx, session);
      onTransaction?.(session);
    },
  );
  await repository.initializeIndexes();
  const management = createMongoManagementStore(adapter.connection, (tx) =>
    sessions.get(tx),
  );
  await management.initializeIndexes();
  const audit = createMongoSecurityAudit(
    adapter.connection,
    (tx) => sessions.get(tx),
    { isolatedTest: true },
  );
  await audit.initializeIndexes();
  const store: ManagementTestStore = {
    repository,
    management,
    appendAudit: async (tx, event, fail) => {
      await audit.append(tx, event);
      if (fail) throw new Error('Synthetic audit failure after insertion');
    },
    events: async () =>
      (
        await adapter.connection
          .db!.collection('securityAuditEvents')
          .find({}, { projection: { _id: 0 } })
          .toArray()
      ).map((row) =>
        securityAuditEventSchema.parse({
          ...row,
          organizationId: String(row.organizationId),
          actorId: String(row.actorId),
          resourceId: String(row.resourceId),
          occurredAt: new Date(row.occurredAt).toISOString(),
        }),
      ),
    receiptCount: async (org) =>
      adapter.connection.models.ManagementCommandReceipt!.countDocuments({
        organizationId: org,
      }),
    disable: async (id) => {
      const users = createOrganizationModels(adapter.connection).users,
        user = (await users.findById(id).lean())!;
      await repository.transaction(async (tx) => {
        const org = (await tx.organization(String(user.organizationId)))!;
        await tx.lockOrganization(
          org.id,
          org.revision,
          false,
          'synthetic-disable',
          now,
        );
        await users.updateOne(
          { _id: id },
          { $set: { status: 'inactive' } },
          { session: sessions.get(tx) },
        );
      });
    },
  };
  return {
    sessionFor: (tx: AuthorizationTransaction) => sessions.get(tx),
    adapter,
    repository,
    management,
    audit,
    store,
    async close() {
      await adapter.connection.dropDatabase();
      await adapter.disconnect();
    },
  };
}
