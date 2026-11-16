import { randomUUID } from 'node:crypto';
import type { CourseHarness } from './course-fixture.js';
import { courseFixture } from './course-fixture.js';
import { createPublishingService } from '../src/modules/catalog/publishing/service.js';
import {
  contentDigest,
  type Command,
} from '../src/modules/catalog/publishing/contracts.js';
import { now } from './authorization-scenarios.js';
export async function publishingFixture(
  h: CourseHarness,
  requiredApprovals = 1,
) {
  const f = await courseFixture(h),
    policy = { key: 'synthetic-policy-v1', requiredApprovals };
  await f.grant({ kind: 'organization' }, [
    'course.draft.create',
    'course.draft.read',
    'course.draft.edit',
    'course.review.submit',
    'course.review.assign',
    'course.review.read',
    'course.release.read',
  ]);
  const reviewerGrant = await f.grant(
    { kind: 'organization' },
    ['course.review.read', 'course.review.decide'],
    { userId: f.peer.id },
  );
  await f.grant(
    { kind: 'organization' },
    ['course.review.read', 'course.review.decide'],
    { userId: f.siblingUser.id },
  );
  const publisherGrant = await f.grant(
    { kind: 'organization' },
    ['course.release.publish', 'course.release.read', 'course.review.read'],
    { userId: f.remote.id },
  );
  const service = createPublishingService(
    h.repository,
    h.store,
    h.publishing!,
    h.receipts,
    f.provider,
    h.audit,
    { isolatedTest: true, policy, clock: () => now },
  );
  const base = {
    organizationId: f.org.id,
    requestId: randomUUID(),
    key: randomUUID(),
  };
  const created = await f.service.execute(f.actor.token, {
    ...base,
    change: {
      kind: 'create',
      code: 'SYN_' + randomUUID().replaceAll('-', '').toUpperCase(),
      title: 'Synthetic reviewed content',
      description: 'Unapproved development text',
      scopeUnitId: f.department.id,
      metadata: { language: 'en', tags: ['synthetic'], audienceUnitIds: [] },
    },
  });
  await f.service.execute(f.actor.token, {
    ...base,
    key: randomUUID(),
    courseId: created.courseId,
    expectedRevision: 0,
    change: { kind: 'addModule', title: 'Module', description: '' },
  });
  const draft = await f.service.retrieve(
      f.actor.token,
      f.org.id,
      created.courseId,
    ),
    moduleId = draft.modules[0]!.id;
  await f.service.execute(f.actor.token, {
    ...base,
    key: randomUUID(),
    courseId: created.courseId,
    expectedRevision: 1,
    change: {
      kind: 'addLesson',
      moduleId,
      title: 'Lesson',
      description: '',
      content: { type: 'text', text: 'Synthetic safe teaching content' },
    },
  });
  async function current() {
    return h.repository.transaction(async (tx) => ({
      course: (await h.store.course(tx, f.org.id, created.courseId))!,
      draft: (await h.store.draft(tx, f.org.id, created.courseId))!,
    }));
  }
  async function command(action: Command['action']): Promise<Command> {
    const snapshot = await current();
    return {
      organizationId: f.org.id,
      courseId: created.courseId,
      expectedDraftRevision: snapshot.draft.revision,
      digest: contentDigest(snapshot),
      requestId: randomUUID(),
      key: randomUUID(),
      action,
    };
  }
  async function submit() {
    return service.execute(f.actor.token, await command({ kind: 'submit' }));
  }
  async function assigned() {
    const review = await submit();
    return service.execute(
      f.actor.token,
      await command({
        kind: 'assign',
        reviewId: review.reviewId,
        expectedReviewRevision: 0,
        reviewerId: f.peer.id,
      }),
    );
  }
  async function approved() {
    const review = await assigned();
    return service.execute(
      f.peer.token,
      await command({
        kind: 'decide',
        reviewId: review.reviewId,
        expectedReviewRevision: 1,
        decision: 'approve',
        feedback: [
          { category: 'accuracy', message: 'Synthetic test approval only' },
        ],
      }),
    );
  }
  async function edit() {
    const snapshot = await current();
    return f.service.execute(f.actor.token, {
      ...base,
      key: randomUUID(),
      courseId: created.courseId,
      expectedRevision: snapshot.draft.revision,
      change: {
        kind: 'metadata',
        title: 'Changed synthetic draft',
        description: '',
        metadata: snapshot.draft.metadata,
      },
    });
  }
  return {
    ...f,
    workflow: service,
    h,
    policy,
    current,
    command,
    submit,
    assigned,
    approved,
    edit,
    courseId: created.courseId,
    reviewerGrant,
    publisherGrant,
  };
}
