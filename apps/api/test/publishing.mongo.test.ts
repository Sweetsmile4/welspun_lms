import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { localSecurityStore } from './security-local-fixture.js';
import { createMongoDraftStore } from '../src/modules/catalog/drafts/mongo-store.js';
import { createMongoPublishingStore } from '../src/modules/catalog/publishing/mongo-store.js';
import { createMongoSecurityAudit } from '../src/platform/mongo-security-audit.js';
import { publishingScenarios } from './publishing-scenarios.js';
import type { CourseHarness } from './course-fixture.js';
import { publishingFixture } from './publishing-fixture.js';
import { securityEvent } from '../src/platform/security-audit.js';
import { randomUUID } from 'node:crypto';
describe.skipIf(process.env.RUN_MONGO_INTEGRATION !== 'true')(
  'review and publishing on isolated MongoDB',
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
    publishingScenarios(() => h);
    it('checks authoritative review/release audit target type and organization on the same session', async () => {
      const f = await publishingFixture(h),
        other = await publishingFixture(h),
        approved = await f.approved(),
        release = await f.workflow.execute(
          f.remote.token,
          await f.command({
            kind: 'publish',
            reviewId: approved.reviewId,
            expectedReviewRevision: 2,
            expectedReleaseNumber: 0,
          }),
        );
      for (const [org, actor, type, resourceId] of [
        [
          other.org.id,
          other.actor.id,
          'course.release.published',
          release.releaseId!,
        ],
        [f.org.id, f.actor.id, 'course.review.decided', release.releaseId!],
        [f.org.id, f.actor.id, 'course.release.published', approved.reviewId],
      ] as const)
        await expect(
          h.repository.transaction((tx) =>
            h.audit.append(
              tx,
              securityEvent({
                requestId: randomUUID(),
                organizationId: org,
                actorId: actor,
                type,
                resourceId,
                outcome: 'allowed',
              }),
            ),
          ),
        ).rejects.toThrow('resource/type');
    });
    it('has unique source/release/reviewer indexes and no adapter mutation methods for immutable records', async () => {
      for (const [collection, index] of [
        ['reviewRequests', 'review_exact_revision'],
        ['reviewDecisions', 'reviewer_one_decision'],
        ['courseReleases', 'release_monotonic_identity'],
        ['courseReleases', 'release_exact_source'],
      ]) {
        const indexes = await local.adapter.connection
          .db!.collection(collection!)
          .indexes();
        expect(indexes.some((i) => i.name === index && i.unique)).toBe(true);
        expect(indexes.some((i) => 'expireAfterSeconds' in i)).toBe(false);
      }
      expect(
        'updateRelease' in h.publishing! || 'deleteRelease' in h.publishing!,
      ).toBe(false);
      await expect(
        local.adapter.connection.models.CourseRelease!.updateOne(
          {},
          { $set: { number: 8 } },
        ),
      ).rejects.toThrow('Immutable');
      await expect(
        local.adapter.connection.models.CourseReviewEvidence!.deleteMany({}),
      ).rejects.toThrow('Immutable');
    });
  },
);
