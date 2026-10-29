import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { localSecurityStore } from './security-local-fixture.js';
import { createMongoDraftStore } from '../src/modules/catalog/drafts/mongo-store.js';
import { createMongoSecurityAudit } from '../src/platform/mongo-security-audit.js';
import { courseScenarios } from './course-scenarios.js';
import type { CourseHarness } from './course-fixture.js';
describe.skipIf(process.env.RUN_MONGO_INTEGRATION !== 'true')(
  'course drafts on isolated real MongoDB',
  () => {
    let local: Awaited<ReturnType<typeof localSecurityStore>>,
      harness: CourseHarness;
    beforeAll(async () => {
      local = await localSecurityStore();
      const store = createMongoDraftStore(
        local.adapter.connection,
        local.sessionFor,
      );
      await store.initializeIndexes();
      const audit = createMongoSecurityAudit(
        local.adapter.connection,
        local.sessionFor,
        {
          isolatedTest: true,
          courseTarget: async (tx, org, id) =>
            !!(await store.course(tx, org, id)),
        },
      );
      harness = {
        repository: local.repository,
        store,
        receipts: local.management,
        audit,
        disable: local.store.disable,
        events: async (org) =>
          (await local.store.events()).filter((e) => e.organizationId === org)
            .length,
        receiptCount: local.store.receiptCount,
      };
    });
    afterAll(async () => {
      if (local) await local.close();
    });
    courseScenarios(() => harness);
    it('initializes course uniqueness and current-draft indexes without TTL and requires mapped sessions', async () => {
      for (const [collection, name] of [
        ['courses', 'course_code_identity'],
        ['contentDrafts', 'course_current_draft'],
      ]) {
        const indexes = await local.adapter.connection
          .db!.collection(collection!)
          .indexes();
        expect(indexes.some((i) => i.name === name && i.unique)).toBe(true);
        expect(indexes.some((i) => 'expireAfterSeconds' in i)).toBe(false);
      }
      await expect(
        harness.store.course({} as never, '0'.repeat(24), '1'.repeat(24)),
      ).rejects.toThrow('domain transaction');
    });
  },
);
