import { beforeAll, afterAll, describe } from 'vitest';
import { localSecurityStore } from './security-local-fixture.js';
import { createMongoDraftStore } from '../src/modules/catalog/drafts/mongo-store.js';
import { createMongoPublishingStore } from '../src/modules/catalog/publishing/mongo-store.js';
import { createMongoCatalogStore } from '../src/modules/catalog/discovery/mongo-store.js';
import { createMongoSecurityAudit } from '../src/platform/mongo-security-audit.js';
import type { CourseHarness } from './course-fixture.js';
import { catalogScenarios } from './catalog-scenarios.js';
describe.skipIf(process.env.RUN_MONGO_INTEGRATION !== 'true')(
  'catalog on isolated real MongoDB',
  () => {
    let local: Awaited<ReturnType<typeof localSecurityStore>>, h: CourseHarness;
    beforeAll(async () => {
      local = await localSecurityStore();
      const store = createMongoDraftStore(
          local.adapter.connection,
          local.sessionFor,
        ),
        publishing = createMongoPublishingStore(
          local.adapter.connection,
          local.sessionFor,
        );
      await store.initializeIndexes();
      await publishing.initializeIndexes();
      const audit = createMongoSecurityAudit(
        local.adapter.connection,
        local.sessionFor,
        {
          isolatedTest: true,
          courseTarget: async (tx, org, id) =>
            !!(await store.course(tx, org, id)),
          reviewTarget: async (tx, org, id) =>
            !!(await publishing.review(tx, org, id)),
          releaseTarget: async (tx, org, id) =>
            !!(await publishing.release(tx, org, id)),
        },
      );
      h = {
        repository: local.repository,
        store,
        publishing,
        catalog: createMongoCatalogStore(
          local.adapter.connection,
          local.sessionFor,
        ),
        receipts: local.management,
        audit,
        disable: local.store.disable,
        receiptCount: local.store.receiptCount,
        events: async (org) =>
          (await local.store.events()).filter((e) => e.organizationId === org)
            .length,
      };
    });
    afterAll(async () => {
      if (local) await local.close();
    });
    catalogScenarios(() => h);
  },
);
