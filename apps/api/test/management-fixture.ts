import { createApp } from '../src/app.js';
import { parseEnvironment } from '../src/platform/environment.js';
import { createManagementService } from '../src/modules/identity/management/service.js';
import { createManagementRouter } from '../src/modules/identity/management/router.js';
import type {
  ManagementStore,
  Receipt,
} from '../src/modules/identity/management/store.js';
import type {
  AuthorizationRepository,
  AuthorizationTransaction,
} from '../src/modules/identity/authorization/types.js';
import type { SecurityAuditEvent } from '../src/platform/security-audit.js';
import { httpFixture, type HttpTestStore } from './http-security-fixture.js';
import { memoryAuthorizationRepository } from './authorization-memory.js';
import { now } from './authorization-scenarios.js';

export interface ManagementTestStore extends HttpTestStore {
  management: ManagementStore;
  events: () => Promise<SecurityAuditEvent[]>;
  receiptCount: (org: string) => Promise<number>;
}
export function memoryManagementStore(): ManagementTestStore {
  const base = memoryAuthorizationRepository();
  let data: { receipts: Receipt[]; events: SecurityAuditEvent[] } = {
    receipts: [],
    events: [],
  };
  const current = new WeakMap<AuthorizationTransaction, typeof data>();
  const repository: AuthorizationRepository = {
    transaction: (work) =>
      base.repository.transaction(async (tx) => {
        const copy = structuredClone(data);
        current.set(tx, copy);
        const value = await work(tx);
        data = copy;
        return value;
      }),
  };
  return {
    repository,
    disable: base.disable,
    appendAudit: async (tx, event, fail) => {
      current.get(tx)!.events.push(event);
      if (fail) throw new Error('Synthetic audit failure');
    },
    events: async () => data.events,
    receiptCount: async (org) =>
      data.receipts.filter((r) => r.organizationId === org).length,
    management: {
      page: async () => {
        throw new Error('Aggregation evidence requires opt-in real MongoDB');
      },
      receipt: async (tx, key) =>
        current
          .get(tx)!
          .receipts.find(
            (r) =>
              r.organizationId === key.organizationId &&
              r.actorId === key.actorId &&
              r.operation === key.operation &&
              r.keyHash === key.keyHash,
          ) ?? null,
      saveReceipt: async (tx, value) => {
        current.get(tx)!.receipts.push(value);
      },
    },
  };
}
export async function managementFixture(store: ManagementTestStore) {
  const f = await httpFixture(store);
  let failAudit = false,
    failReceipt = false;
  const management = {
    ...store.management,
    saveReceipt: async (tx: AuthorizationTransaction, value: Receipt) => {
      await store.management.saveReceipt(tx, value);
      if (failReceipt)
        throw new Error('Synthetic failure AFTER receipt insert');
    },
  };
  const service = createManagementService(
    store.repository,
    management,
    f.security,
    {
      durability: 'isolated-test',
      append: async (tx, event) => {
        await store.appendAudit!(tx, event, failAudit);
      },
    },
    { isolatedTest: true, clock: () => now },
  );
  const router = createManagementRouter(f.security, service, {
    isolatedTest: true,
  });
  const app = createApp(
    parseEnvironment({
      NODE_ENV: 'test',
      ISOLATED_DEVELOPMENT: 'true',
      LOG_LEVEL: 'silent',
    }),
    { isolatedTestRouter: router },
  );
  return {
    ...f,
    app,
    managementService: service,
    managementRouter: router,
    base: `/api/v1/__test/organizations/${f.org.id}`,
    failAudit: () => {
      failAudit = true;
    },
    failReceipt: () => {
      failReceipt = true;
    },
  };
}
