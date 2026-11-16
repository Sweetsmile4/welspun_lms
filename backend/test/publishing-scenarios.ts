import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { publishingFixture } from './publishing-fixture.js';
import type { CourseHarness } from './course-fixture.js';
import { createPublishingService } from '../src/modules/catalog/publishing/service.js';
import {
  contentDigest,
  type Command,
} from '../src/modules/catalog/publishing/contracts.js';
import { now } from './authorization-scenarios.js';
import { fingerprint } from '../src/modules/identity/management/receipts.js';
const feedback = [
  { category: 'accuracy' as const, message: 'Synthetic development decision' },
];
export function publishingScenarios(get: () => CourseHarness) {
  it('fails closed on corrupt publishing receipts and changed reviewer role versions', async () => {
    const h = get(),
      f = await publishingFixture(h),
      approved = await f.approved(),
      cmd = await f.command({
        kind: 'publish',
        reviewId: approved.reviewId,
        expectedReviewRevision: 2,
        expectedReleaseNumber: 0,
      });
    await f.workflow.execute(f.remote.token, cmd);
    for (const shape of [false, true]) {
      const broken = createPublishingService(
        h.repository,
        h.store,
        h.publishing!,
        {
          ...h.receipts,
          receipt: async (...args) => {
            const row = (await h.receipts.receipt(...args))!;
            if (shape) {
              const data = { ...(row.data as object), unapproved: true };
              return { ...row, data, responseDigest: fingerprint(data) };
            }
            return { ...row, responseVersion: 999 };
          },
        },
        f.provider,
        h.audit,
        { isolatedTest: true, policy: f.policy, clock: () => now },
      );
      await expect(broken.execute(f.remote.token, cmd)).rejects.toMatchObject({
        code: 'REPLAY_UNAVAILABLE',
      });
    }
    const role = await h.repository.transaction((tx) =>
      tx.role(f.org.id, f.reviewerGrant.roleDefinitionId),
    );
    await f.role(
      ['course.review.decide'],
      role!.code,
      role!.version + 1,
      'inactive',
    );
    await expect(f.workflow.execute(f.remote.token, cmd)).rejects.toMatchObject(
      { code: 'FORBIDDEN' },
    );
  });
  it('isolates release reads/history across organizations and sibling scopes', async () => {
    const f = await publishingFixture(get()),
      approved = await f.approved(),
      result = await f.workflow.execute(
        f.remote.token,
        await f.command({
          kind: 'publish',
          reviewId: approved.reviewId,
          expectedReviewRevision: 2,
          expectedReleaseNumber: 0,
        }),
      );
    const other = await publishingFixture(get());
    await expect(
      other.workflow.retrieveRelease(
        other.remote.token,
        other.org.id,
        result.releaseId!,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant(
      { kind: 'unit', unitId: f.sibling.id, includeDescendants: true },
      ['course.release.read'],
      { userId: f.childUser.id },
    );
    await expect(
      f.workflow.retrieveRelease(
        f.childUser.token,
        f.org.id,
        result.releaseId!,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.workflow.history(f.childUser.token, f.org.id, f.courseId, 'releases'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('submits exact content, assigns qualified reviewer, approves and publishes an authorized immutable release', async () => {
    const f = await publishingFixture(get()),
      approved = await f.approved();
    const cmd = await f.command({
      kind: 'publish',
      reviewId: approved.reviewId,
      expectedReviewRevision: 2,
      expectedReleaseNumber: 0,
    });
    const ready = {
      organizationId: cmd.organizationId,
      courseId: cmd.courseId,
      expectedDraftRevision: cmd.expectedDraftRevision,
      digest: cmd.digest,
      action: cmd.action,
    };
    await expect(
      f.workflow.validatePublishReadiness(f.remote.token, ready),
    ).resolves.toMatchObject({ ready: true, nextReleaseNumber: 1 });
    const result = await f.workflow.execute(f.remote.token, cmd),
      release = await f.workflow.retrieveRelease(
        f.remote.token,
        f.org.id,
        result.releaseId!,
      );
    expect(release).toMatchObject({
      number: 1,
      draftRevision: 2,
      lifecycle: 'published',
      publishedBy: f.remote.id,
    });
    expect(release.digest).toBe(contentDigest(release.snapshot));
    expect(release.approvals).toHaveLength(1);
    const read = await f.workflow.retrieveReview(
      f.actor.token,
      f.org.id,
      result.reviewId,
    );
    expect(read.review.state).toBe('published');
    expect(read.evidence.map((e) => e.kind)).toEqual(['assigned', 'approve']);
  });
  it('requires explicit qualification/assignment and rejects authors, unassigned reviewers and security-only publishers', async () => {
    const f = await publishingFixture(get()),
      review = await f.submit();
    await f.grant({ kind: 'organization' }, [
      'security.manage',
      'course.review.decide',
    ]);
    await expect(
      f.workflow.execute(
        f.actor.token,
        await f.command({
          kind: 'assign',
          reviewId: review.reviewId,
          expectedReviewRevision: 0,
          reviewerId: f.actor.id,
        }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.workflow.execute(
        f.actor.token,
        await f.command({
          kind: 'assign',
          reviewId: review.reviewId,
          expectedReviewRevision: 0,
          reviewerId: f.remote.id,
        }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.workflow.execute(
        f.siblingUser.token,
        await f.command({
          kind: 'decide',
          reviewId: review.reviewId,
          expectedReviewRevision: 0,
          decision: 'approve',
          feedback,
        }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.workflow.execute(
        f.actor.token,
        await f.command({
          kind: 'publish',
          reviewId: review.reviewId,
          expectedReviewRevision: 0,
          expectedReleaseNumber: 0,
        }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.workflow.execute(
        f.remote.token,
        await f.command({
          kind: 'publish',
          reviewId: review.reviewId,
          expectedReviewRevision: 0,
          expectedReleaseNumber: 0,
        }),
      ),
    ).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
  });
  it('preserves changes-requested and rejection evidence and rejects invalid terminal transitions', async () => {
    for (const decision of ['changesRequested', 'reject'] as const) {
      const f = await publishingFixture(get()),
        review = await f.assigned();
      await f.workflow.execute(
        f.peer.token,
        await f.command({
          kind: 'decide',
          reviewId: review.reviewId,
          expectedReviewRevision: 1,
          decision,
          feedback,
        }),
      );
      const read = await f.workflow.retrieveReview(
        f.actor.token,
        f.org.id,
        review.reviewId,
      );
      expect(read.review.state).toBe(
        decision === 'reject' ? 'rejected' : 'changesRequested',
      );
      expect(read.evidence.at(-1)!.feedback).toEqual(feedback);
      await expect(
        f.workflow.execute(
          f.peer.token,
          await f.command({
            kind: 'decide',
            reviewId: review.reviewId,
            expectedReviewRevision: 2,
            decision: 'approve',
            feedback,
          }),
        ),
      ).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
      await expect(
        f.workflow.execute(
          f.remote.token,
          await f.command({
            kind: 'publish',
            reviewId: review.reviewId,
            expectedReviewRevision: 2,
            expectedReleaseNumber: 0,
          }),
        ),
      ).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
    }
  });
  it('binds bytes as well as revision and supersedes stale reviews without rewriting approval evidence', async () => {
    const f = await publishingFixture(get()),
      approved = await f.approved(),
      old = await f.current();
    const cmd = await f.command({
      kind: 'publish',
      reviewId: approved.reviewId,
      expectedReviewRevision: 2,
      expectedReleaseNumber: 0,
    });
    await expect(
      f.workflow.execute(f.remote.token, { ...cmd, digest: '0'.repeat(64) }),
    ).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
    await f.edit();
    await expect(f.workflow.execute(f.remote.token, cmd)).rejects.toMatchObject(
      { code: 'REVIEW_CONFLICT' },
    );
    await expect(
      f.workflow.execute(f.remote.token, await f.command(cmd.action)),
    ).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
    const supersede = await f.command({
      kind: 'supersede',
      reviewId: approved.reviewId,
      expectedReviewRevision: 2,
    });
    supersede.digest = contentDigest(old);
    await f.workflow.execute(f.actor.token, supersede);
    const read = await f.workflow.retrieveReview(
      f.actor.token,
      f.org.id,
      approved.reviewId,
    );
    expect(read.review.state).toBe('superseded');
    expect(read.evidence.filter((e) => e.kind === 'approve')).toHaveLength(1);
    expect(read.review.snapshot.draft.title).toBe(old.draft.title);
    await expect(f.submit()).resolves.toMatchObject({ reviewRevision: 0 });
  });
  it('tracks all collaborators and refuses reviewer assignment to an earlier editor or submitter', async () => {
    const f = await publishingFixture(get());
    await f.grant(
      { kind: 'organization' },
      ['course.draft.edit', 'course.review.submit'],
      { userId: f.peer.id },
    );
    const s = await f.current();
    await f.service.execute(f.peer.token, {
      organizationId: f.org.id,
      courseId: f.courseId,
      expectedRevision: s.draft.revision,
      key: randomUUID(),
      requestId: randomUUID(),
      change: {
        kind: 'metadata',
        title: 'Coauthored',
        description: '',
        metadata: s.draft.metadata,
      },
    });
    await f.edit();
    const review = await f.submit();
    expect((await f.current()).draft.editedBy).toContain(f.peer.id);
    await expect(
      f.workflow.execute(
        f.actor.token,
        await f.command({
          kind: 'assign',
          reviewId: review.reviewId,
          expectedReviewRevision: 0,
          reviewerId: f.peer.id,
        }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('honors explicitly configured multiple approvals without a hardcoded corporate reviewer count', async () => {
    const f = await publishingFixture(get(), 2),
      assigned = await f.assigned();
    await f.workflow.execute(
      f.actor.token,
      await f.command({
        kind: 'assign',
        reviewId: assigned.reviewId,
        expectedReviewRevision: 1,
        reviewerId: f.siblingUser.id,
      }),
    );
    await f.workflow.execute(
      f.peer.token,
      await f.command({
        kind: 'decide',
        reviewId: assigned.reviewId,
        expectedReviewRevision: 2,
        decision: 'approve',
        feedback,
      }),
    );
    await expect(
      f.workflow.execute(
        f.remote.token,
        await f.command({
          kind: 'publish',
          reviewId: assigned.reviewId,
          expectedReviewRevision: 3,
          expectedReleaseNumber: 0,
        }),
      ),
    ).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
    await f.workflow.execute(
      f.siblingUser.token,
      await f.command({
        kind: 'decide',
        reviewId: assigned.reviewId,
        expectedReviewRevision: 3,
        decision: 'approve',
        feedback,
      }),
    );
    await expect(
      f.workflow.execute(
        f.remote.token,
        await f.command({
          kind: 'publish',
          reviewId: assigned.reviewId,
          expectedReviewRevision: 4,
          expectedReleaseNumber: 0,
        }),
      ),
    ).resolves.toMatchObject({ releaseNumber: 1 });
  });
  it('serializes concurrent decisions and publications; duplicate keys replay and different keys cannot duplicate a release', async () => {
    const f = await publishingFixture(get()),
      assigned = await f.assigned();
    const decision = await f.command({
      kind: 'decide',
      reviewId: assigned.reviewId,
      expectedReviewRevision: 1,
      decision: 'approve',
      feedback,
    });
    const decisions = await Promise.allSettled([
      f.workflow.execute(f.peer.token, decision),
      f.workflow.execute(f.peer.token, {
        ...decision,
        key: randomUUID(),
        action: {
          ...decision.action,
          decision: 'changesRequested',
        } as Command['action'],
      }),
    ]);
    expect(decisions.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    // A separate fully approved fixture makes publication independent of which decision won the race.
    const p = await publishingFixture(get()),
      approved = await p.approved(),
      publish = await p.command({
        kind: 'publish',
        reviewId: approved.reviewId,
        expectedReviewRevision: 2,
        expectedReleaseNumber: 0,
      });
    const results = await Promise.all([
      p.workflow.execute(p.remote.token, publish),
      p.workflow.execute(p.remote.token, publish),
    ]);
    expect(results.map((r) => r.replayed).sort()).toEqual([false, true]);
    expect(results[0]!.releaseId).toBe(results[1]!.releaseId);
    await expect(
      p.workflow.execute(p.remote.token, { ...publish, key: randomUUID() }),
    ).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
    expect(
      (
        await p.workflow.history(
          p.remote.token,
          p.org.id,
          p.courseId,
          'releases',
        )
      ).items,
    ).toHaveLength(1);
  });
  it('replays a discarded committed response and keeps release bytes unchanged after later draft edits', async () => {
    const f = await publishingFixture(get()),
      approved = await f.approved(),
      cmd = await f.command({
        kind: 'publish',
        reviewId: approved.reviewId,
        expectedReviewRevision: 2,
        expectedReleaseNumber: 0,
      });
    const first = await f.workflow.execute(f.remote.token, cmd),
      release = await f.workflow.retrieveRelease(
        f.remote.token,
        f.org.id,
        first.releaseId!,
      );
    await f.edit();
    const replay = await f.workflow.execute(f.remote.token, {
      ...cmd,
      requestId: randomUUID(),
    });
    expect(replay).toEqual({ ...first, replayed: true });
    expect(
      await f.workflow.retrieveRelease(
        f.remote.token,
        f.org.id,
        first.releaseId!,
      ),
    ).toEqual(release);
    await expect(
      f.workflow.execute(f.remote.token, { ...cmd, digest: '0'.repeat(64) }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    const next = await f.approved();
    await expect(
      f.workflow.execute(
        f.remote.token,
        await f.command({
          kind: 'publish',
          reviewId: next.reviewId,
          expectedReviewRevision: 2,
          expectedReleaseNumber: 0,
        }),
      ),
    ).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
    await expect(
      f.workflow.execute(
        f.remote.token,
        await f.command({
          kind: 'publish',
          reviewId: next.reviewId,
          expectedReviewRevision: 2,
          expectedReleaseNumber: 1,
        }),
      ),
    ).resolves.toMatchObject({ releaseNumber: 2 });
    const page = await f.workflow.history(
      f.remote.token,
      f.org.id,
      f.courseId,
      'releases',
      { limit: 1 },
    );
    expect(page.nextCursor).not.toBeNull();
    expect(
      (
        await f.workflow.history(
          f.remote.token,
          f.org.id,
          f.courseId,
          'releases',
          { limit: 1, cursor: page.nextCursor! },
        )
      ).items,
    ).toHaveLength(1);
  });
  it('rechecks revoked publisher/reviewer grants and disabled reviewers on new publish and replay', async () => {
    for (const target of ['publisher', 'reviewer', 'disabled']) {
      const f = await publishingFixture(get()),
        approved = await f.approved(),
        cmd = await f.command({
          kind: 'publish',
          reviewId: approved.reviewId,
          expectedReviewRevision: 2,
          expectedReleaseNumber: 0,
        });
      await f.workflow.execute(f.remote.token, cmd);
      if (target === 'disabled') await f.h.disable(f.peer.id);
      else
        await f.h.repository.transaction((tx) =>
          tx.revokeGrant(
            target === 'publisher' ? f.publisherGrant : f.reviewerGrant,
            f.actor.id,
            now,
            'Synthetic revocation',
          ),
        );
      await expect(
        f.workflow.execute(f.remote.token, cmd),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
  });
  it('enforces organization/plant/sibling isolation and filters history before returning any records', async () => {
    const f = await publishingFixture(get()),
      review = await f.submit(),
      other = await publishingFixture(get());
    await expect(
      other.workflow.retrieveReview(
        other.actor.token,
        other.org.id,
        review.reviewId,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant(
      { kind: 'unit', unitId: f.sibling.id, includeDescendants: true },
      ['course.review.read', 'course.review.assign'],
      { userId: f.childUser.id },
    );
    await f.grant(
      { kind: 'unit', unitId: f.plantB.id, includeDescendants: true },
      ['course.review.read'],
      { userId: f.childUser.id },
    );
    await expect(
      f.workflow.retrieveReview(f.childUser.token, f.org.id, review.reviewId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.workflow.history(f.childUser.token, f.org.id, f.courseId, 'reviews'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant(
      { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
      ['course.review.read'],
      { userId: f.childUser.id },
    );
    expect(
      (
        await f.workflow.retrieveReview(
          f.childUser.token,
          f.org.id,
          review.reviewId,
        )
      ).review.id,
    ).toBe(review.reviewId);
  });
  it('rolls back release/review/audit/receipt after audit and receipt failures and safely retries', async () => {
    for (const fault of ['audit', 'receipt']) {
      const h = get(),
        f = await publishingFixture(h),
        approved = await f.approved(),
        cmd = await f.command({
          kind: 'publish',
          reviewId: approved.reviewId,
          expectedReviewRevision: 2,
          expectedReleaseNumber: 0,
        });
      const before = {
        events: await h.events(f.org.id),
        receipts: await h.receiptCount(f.org.id),
      };
      const bad = createPublishingService(
        h.repository,
        h.store,
        h.publishing!,
        {
          ...h.receipts,
          saveReceipt: async (...args) => {
            await h.receipts.saveReceipt(...args);
            if (fault === 'receipt')
              throw new Error('Synthetic receipt failure');
          },
        },
        f.provider,
        {
          durability: 'isolated-test',
          append: async (...args) => {
            await h.audit.append(...args);
            if (fault === 'audit') throw new Error('Synthetic audit failure');
          },
        },
        { isolatedTest: true, policy: f.policy, clock: () => now },
      );
      await expect(bad.execute(f.remote.token, cmd)).rejects.toThrow();
      expect(await h.events(f.org.id)).toBe(before.events);
      expect(await h.receiptCount(f.org.id)).toBe(before.receipts);
      expect(
        (
          await f.workflow.retrieveReview(
            f.actor.token,
            f.org.id,
            approved.reviewId,
          )
        ).review.state,
      ).toBe('approved');
      expect(
        (
          await f.workflow.history(
            f.remote.token,
            f.org.id,
            f.courseId,
            'releases',
          )
        ).items,
      ).toHaveLength(0);
      await expect(
        f.workflow.execute(f.remote.token, cmd),
      ).resolves.toMatchObject({ releaseNumber: 1 });
    }
  });
  it('validates strict commands, policy configuration and production/test isolation', async () => {
    const h = get(),
      f = await publishingFixture(h),
      cmd = await f.command({ kind: 'submit' });
    await expect(
      f.workflow.execute(f.actor.token, {
        ...cmd,
        actorId: f.peer.id,
      } as never),
    ).rejects.toThrow();
    await expect(
      f.workflow.execute(f.actor.token, { ...cmd, expectedDraftRevision: 0 }),
    ).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
    await expect(
      f.workflow.history(f.actor.token, f.org.id, f.courseId, 'reviews', {
        limit: 51,
      }),
    ).rejects.toThrow();
    const env = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() =>
        createPublishingService(
          h.repository,
          h.store,
          h.publishing!,
          h.receipts,
          f.provider,
          h.audit,
          { isolatedTest: true, policy: f.policy },
        ),
      ).toThrow('isolated');
      await expect(f.workflow.execute(f.actor.token, cmd)).rejects.toThrow(
        'isolated',
      );
    } finally {
      process.env.NODE_ENV = env;
    }
  });
  it('rejects same-revision byte drift and legacy unknown contributor history', async () => {
    const h = get(),
      f = await publishingFixture(h),
      approved = await f.approved();
    const drifted = createPublishingService(
      h.repository,
      {
        ...h.store,
        draft: async (...args) => {
          const row = await h.store.draft(...args);
          return row
            ? { ...row, title: 'Different bytes at same revision' }
            : null;
        },
      },
      h.publishing!,
      h.receipts,
      f.provider,
      h.audit,
      { isolatedTest: true, policy: f.policy, clock: () => now },
    );
    await expect(
      drifted.execute(
        f.remote.token,
        await f.command({
          kind: 'publish',
          reviewId: approved.reviewId,
          expectedReviewRevision: 2,
          expectedReleaseNumber: 0,
        }),
      ),
    ).rejects.toMatchObject({ code: 'REVIEW_CONFLICT' });
    const legacy = createPublishingService(
      h.repository,
      {
        ...h.store,
        draft: async (...args) => {
          const row = await h.store.draft(...args);
          return row ? { ...row, editedBy: undefined } : null;
        },
      },
      h.publishing!,
      h.receipts,
      f.provider,
      h.audit,
      { isolatedTest: true, policy: f.policy, clock: () => now },
    );
    await expect(
      legacy.execute(f.actor.token, await f.command({ kind: 'submit' })),
    ).rejects.toThrow();
  });
  it('rejects revoked reviewer authority before publication and disabled publisher access', async () => {
    const h = get(),
      f = await publishingFixture(h),
      approved = await f.approved(),
      cmd = await f.command({
        kind: 'publish',
        reviewId: approved.reviewId,
        expectedReviewRevision: 2,
        expectedReleaseNumber: 0,
      });
    await h.repository.transaction((tx) =>
      tx.revokeGrant(
        f.reviewerGrant,
        f.actor.id,
        now,
        'Synthetic qualification revoked',
      ),
    );
    await expect(f.workflow.execute(f.remote.token, cmd)).rejects.toMatchObject(
      { code: 'FORBIDDEN' },
    );
    await f.grant({ kind: 'organization' }, ['course.review.decide'], {
      userId: f.peer.id,
    });
    await h.disable(f.remote.id);
    await expect(f.workflow.execute(f.remote.token, cmd)).rejects.toMatchObject(
      { code: 'FORBIDDEN' },
    );
  });
  it('allows only one distinct concurrent publish command and records no duplicate release audit', async () => {
    const h = get(),
      f = await publishingFixture(h),
      approved = await f.approved(),
      cmd = await f.command({
        kind: 'publish',
        reviewId: approved.reviewId,
        expectedReviewRevision: 2,
        expectedReleaseNumber: 0,
      });
    const count = await h.events(f.org.id),
      results = await Promise.allSettled([
        f.workflow.execute(f.remote.token, cmd),
        f.workflow.execute(f.remote.token, { ...cmd, key: randomUUID() }),
      ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await h.events(f.org.id)).toBe(count + 1);
    expect(
      (
        await f.workflow.history(
          f.remote.token,
          f.org.id,
          f.courseId,
          'releases',
        )
      ).items,
    ).toHaveLength(1);
  });
  it('rolls back appended review evidence and projection when audit persistence fails', async () => {
    const h = get(),
      f = await publishingFixture(h),
      assigned = await f.assigned();
    const broken = createPublishingService(
      h.repository,
      h.store,
      h.publishing!,
      h.receipts,
      f.provider,
      {
        durability: 'isolated-test',
        append: async (...args) => {
          await h.audit.append(...args);
          throw new Error('Synthetic decision audit failure');
        },
      },
      { isolatedTest: true, policy: f.policy, clock: () => now },
    );
    await expect(
      broken.execute(
        f.peer.token,
        await f.command({
          kind: 'decide',
          reviewId: assigned.reviewId,
          expectedReviewRevision: 1,
          decision: 'approve',
          feedback,
        }),
      ),
    ).rejects.toMatchObject({ code: 'SECURITY_AUDIT_UNAVAILABLE' });
    const read = await f.workflow.retrieveReview(
      f.actor.token,
      f.org.id,
      assigned.reviewId,
    );
    expect(read.review).toMatchObject({ state: 'inReview', revision: 1 });
    expect(read.evidence.map((e) => e.kind)).toEqual(['assigned']);
  });
}
