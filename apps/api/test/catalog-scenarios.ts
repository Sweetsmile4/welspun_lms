import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { expect, it } from 'vitest';
import { publishingFixture } from './publishing-fixture.js';
import type { CourseHarness } from './course-fixture.js';
import { createCatalogService } from '../src/modules/catalog/discovery/service.js';
import {
  contentDigest,
  type Command,
} from '../src/modules/catalog/publishing/contracts.js';
import { now } from './authorization-scenarios.js';
const uid = () => new Types.ObjectId().toHexString();
export function catalogScenarios(get: () => CourseHarness) {
  it('excludes rejected submissions and refuses audience/membership or own-scope entitlement', async () => {
    const { f, service } = await setup();
    const s = await f.current();
    await f.service.execute(f.actor.token, {
      organizationId: f.org.id,
      courseId: f.courseId,
      expectedRevision: s.draft.revision,
      key: randomUUID(),
      requestId: randomUUID(),
      change: {
        kind: 'metadata',
        title: s.draft.title,
        description: s.draft.description,
        metadata: { ...s.draft.metadata, audienceUnitIds: [f.plantB.id] },
      },
    });
    await f.grant({ kind: 'organization' }, ['course.catalog.read']);
    const assigned = await f.assigned();
    await f.workflow.execute(
      f.peer.token,
      await f.command({
        kind: 'decide',
        reviewId: assigned.reviewId,
        expectedReviewRevision: 1,
        decision: 'reject',
        feedback: [
          { category: 'accuracy', message: 'Synthetic rejected draft' },
        ],
      }),
    );
    expect((await service.list(f.actor.token, f.org.id)).total).toBe(0);
    await f.edit();
    await publish(f);
    // The publisher belongs to Plant B and the draft's audience names Plant B; neither confers discovery.
    await expect(service.list(f.remote.token, f.org.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await f.grant({ kind: 'own' }, ['course.catalog.read'], {
      userId: f.remote.id,
    });
    await expect(service.list(f.remote.token, f.org.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect((await service.list(f.actor.token, f.org.id)).total).toBe(1);
  });
  async function setup() {
    const h = get(),
      f = await publishingFixture(h),
      service = createCatalogService(h.repository, h.catalog!, f.provider, {
        isolatedTest: true,
        clock: () => now,
      });
    return { h, f, service };
  }
  async function publish(
    f: Awaited<ReturnType<typeof publishingFixture>>,
    number = 0,
  ) {
    const review = await f.approved();
    return f.workflow.execute(
      f.remote.token,
      await f.command({
        kind: 'publish',
        reviewId: review.reviewId,
        expectedReviewRevision: 2,
        expectedReleaseNumber: number,
      }),
    );
  }
  async function second(
    f: Awaited<ReturnType<typeof publishingFixture>>,
    scopeUnitId: string | null,
  ) {
    const base = {
        organizationId: f.org.id,
        key: randomUUID(),
        requestId: randomUUID(),
      },
      code = 'SYN_EXTRA_' + randomUUID().replaceAll('-', '').toUpperCase();
    const c = await f.service.execute(f.actor.token, {
      ...base,
      change: {
        kind: 'create',
        code,
        scopeUnitId,
        title: 'Extra synthetic course',
        description: 'Synthetic extra',
        metadata: { language: 'en', tags: [], audienceUnitIds: [] },
      },
    });
    await f.service.execute(f.actor.token, {
      ...base,
      key: randomUUID(),
      courseId: c.courseId,
      expectedRevision: 0,
      change: { kind: 'addModule', title: 'Extra module', description: '' },
    });
    let s = await f.h.repository.transaction(async (tx) => ({
      course: (await f.h.store.course(tx, f.org.id, c.courseId))!,
      draft: (await f.h.store.draft(tx, f.org.id, c.courseId))!,
    }));
    await f.service.execute(f.actor.token, {
      ...base,
      key: randomUUID(),
      courseId: c.courseId,
      expectedRevision: 1,
      change: {
        kind: 'addLesson',
        moduleId: s.draft.modules[0]!.id,
        title: 'Extra lesson',
        description: '',
        content: { type: 'text', text: 'Safe extra content' },
      },
    });
    s = await f.h.repository.transaction(async (tx) => ({
      course: (await f.h.store.course(tx, f.org.id, c.courseId))!,
      draft: (await f.h.store.draft(tx, f.org.id, c.courseId))!,
    }));
    const run = (
      action: Command['action'],
      credential: unknown = f.actor.token,
    ) =>
      f.workflow.execute(credential, {
        ...base,
        key: randomUUID(),
        courseId: c.courseId,
        expectedDraftRevision: s.draft.revision,
        digest: contentDigest(s),
        action,
      });
    const r = await run({ kind: 'submit' });
    await run({
      kind: 'assign',
      reviewId: r.reviewId,
      expectedReviewRevision: 0,
      reviewerId: f.peer.id,
    });
    await run(
      {
        kind: 'decide',
        reviewId: r.reviewId,
        expectedReviewRevision: 1,
        decision: 'approve',
        feedback: [{ category: 'clarity', message: 'Synthetic approval' }],
      },
      f.peer.token,
    );
    await run(
      {
        kind: 'publish',
        reviewId: r.reviewId,
        expectedReviewRevision: 2,
        expectedReleaseNumber: 0,
      },
      f.remote.token,
    );
    return c.courseId;
  }
  it('requires explicit catalog permission and returns only published learner projections', async () => {
    const { f, service } = await setup();
    await expect(service.list(f.actor.token, f.org.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await f.grant({ kind: 'organization' }, ['course.catalog.read']);
    expect((await service.list(f.actor.token, f.org.id)).total).toBe(0);
    const approved = await f.approved();
    expect((await service.list(f.actor.token, f.org.id)).items).toEqual([]);
    const pub = await f.workflow.execute(
      f.remote.token,
      await f.command({
        kind: 'publish',
        reviewId: approved.reviewId,
        expectedReviewRevision: 2,
        expectedReleaseNumber: 0,
      }),
    );
    const page = await service.list(f.actor.token, f.org.id);
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({
      courseId: f.courseId,
      releaseId: pub.releaseId,
      moduleCount: 1,
      lessonCount: 1,
    });
    const details = await service.details(f.actor.token, f.org.id, f.courseId);
    expect(details.modules[0]!.lessons[0]!.content).toMatchObject({
      type: 'text',
    });
    for (const field of [
      'approvals',
      'feedback',
      'ownerId',
      'submittedBy',
      'editedBy',
      'reviewId',
    ])
      expect(JSON.stringify(details)).not.toContain('"' + field + '"');
  });
  it('preserves immutable catalog snapshots across edits/archive and selects newer releases only after publication', async () => {
    const { f, service } = await setup();
    await f.grant({ kind: 'organization' }, [
      'course.catalog.read',
      'course.draft.archive',
    ]);
    await publish(f);
    const first = await service.details(f.actor.token, f.org.id, f.courseId);
    await f.edit();
    expect(await service.details(f.actor.token, f.org.id, f.courseId)).toEqual(
      first,
    );
    await publish(f, 1);
    expect(
      (await service.details(f.actor.token, f.org.id, f.courseId))
        .releaseNumber,
    ).toBe(2);
    expect(
      (
        await f.workflow.history(
          f.actor.token,
          f.org.id,
          f.courseId,
          'releases',
        )
      ).items,
    ).toHaveLength(2);
    const s = await f.current();
    await f.service.execute(f.actor.token, {
      organizationId: f.org.id,
      courseId: f.courseId,
      expectedRevision: s.draft.revision,
      key: randomUUID(),
      requestId: randomUUID(),
      change: { kind: 'archive' },
    });
    expect(
      (await service.list(f.actor.token, f.org.id)).items[0],
    ).toMatchObject({ releaseNumber: 2, title: 'Changed synthetic draft' });
  });
  it('filters scopes before counts and pagination, searches literals and conceals inaccessible details', async () => {
    const { f, service } = await setup();
    await publish(f);
    const remote = await second(f, f.plantB.id);
    await second(f, null);
    await f.grant(
      { kind: 'unit', unitId: f.department.id, includeDescendants: true },
      ['course.catalog.read'],
      { userId: f.childUser.id },
    );
    const page = await service.list(f.childUser.token, f.org.id);
    expect(page.total).toBe(1);
    expect(page.nextCursor).toBeNull();
    expect(page.items[0]!.courseId).toBe(f.courseId);
    await expect(
      service.details(f.childUser.token, f.org.id, remote),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(
      (
        await service.list(f.childUser.token, f.org.id, {
          scopeUnitId: f.plantB.id,
        })
      ).total,
    ).toBe(0);
    await f.grant(
      { kind: 'unit', unitId: f.sibling.id, includeDescendants: true },
      ['course.catalog.read'],
      { userId: f.siblingUser.id },
    );
    expect((await service.list(f.siblingUser.token, f.org.id)).total).toBe(0);
    await f.grant(
      { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
      ['course.catalog.read'],
      { userId: f.peer.id },
    );
    expect(
      (await service.list(f.peer.token, f.org.id, { scopeUnitId: f.plantA.id }))
        .total,
    ).toBe(1);
    await f.grant({ kind: 'organization' }, ['course.catalog.read']);
    const first = await service.list(f.actor.token, f.org.id, { limit: 1 });
    const next = await service.list(f.actor.token, f.org.id, {
      limit: 1,
      cursor: first.nextCursor!,
    });
    expect(first.total).toBe(3);
    expect(next.total).toBe(3);
    expect(first.items[0]!.courseId).not.toBe(next.items[0]!.courseId);
    expect(
      (await service.list(f.actor.token, f.org.id, { search: 'Extra' })).total,
    ).toBe(2);
    expect(
      (await service.list(f.actor.token, f.org.id, { search: '.*' })).total,
    ).toBe(0);
    const code = (await service.details(f.actor.token, f.org.id, remote)).code;
    expect(
      (await service.list(f.actor.token, f.org.id, { search: code })).total,
    ).toBe(1);
  });
  it('isolates organizations, rejects audience-only entitlement and rechecks revoked/disabled actors', async () => {
    const { h, f, service } = await setup(),
      other = await publishingFixture(h);
    const otherService = createCatalogService(
      h.repository,
      h.catalog!,
      other.provider,
      { isolatedTest: true, clock: () => now },
    );
    await publish(f);
    await f.grant({ kind: 'organization' }, ['course.catalog.read']);
    await expect(
      otherService.details(other.actor.token, other.org.id, f.courseId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await other.grant({ kind: 'organization' }, ['course.catalog.read']);
    expect(
      (await otherService.list(other.actor.token, other.org.id)).total,
    ).toBe(0);
    await expect(
      otherService.details(other.actor.token, other.org.id, f.courseId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const grant = await f.grant(
      { kind: 'resource', resourceType: 'course', resourceId: f.courseId },
      ['course.catalog.read'],
      { userId: f.peer.id },
    );
    expect((await service.list(f.peer.token, f.org.id)).total).toBe(1);
    await h.repository.transaction((tx) =>
      tx.revokeGrant(grant, f.actor.id, now, 'Synthetic revoke'),
    );
    await expect(service.list(f.peer.token, f.org.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await h.disable(f.actor.id);
    await expect(service.list(f.actor.token, f.org.id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      otherService.details(other.actor.token, other.org.id, uid()),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('validates bounded query inputs and production/test composition', async () => {
    const { h, f, service } = await setup();
    await f.grant({ kind: 'organization' }, ['course.catalog.read']);
    for (const query of [
      { limit: 51 },
      { search: { $where: 'bad' } },
      { cursor: 'not-an-id' },
      { search: 'x'.repeat(101) },
    ])
      await expect(
        service.list(f.actor.token, f.org.id, query as never),
      ).rejects.toThrow();
    const env = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() =>
        createCatalogService(h.repository, h.catalog!, f.provider, {
          isolatedTest: true,
        }),
      ).toThrow('isolated');
      await expect(service.list(f.actor.token, f.org.id)).rejects.toThrow(
        'isolated',
      );
    } finally {
      process.env.NODE_ENV = env;
    }
  });
}
