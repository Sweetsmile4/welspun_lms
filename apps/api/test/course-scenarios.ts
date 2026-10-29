import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { expect, it } from 'vitest';
import { courseFixture, type CourseHarness } from './course-fixture.js';
import { createCourseDraftService } from '../src/modules/catalog/drafts/service.js';
import { type Change } from '../src/modules/catalog/drafts/contracts.js';
import { fingerprint } from '../src/modules/identity/management/receipts.js';
import { now } from './authorization-scenarios.js';
const meta = {
  language: 'en',
  tags: ['synthetic'],
  audienceUnitIds: [] as string[],
};
const newId = () => new Types.ObjectId().toHexString();
const all = [
  'course.draft.create',
  'course.draft.read',
  'course.draft.edit',
  'course.draft.archive',
] as const;
export function courseScenarios(get: () => CourseHarness) {
  async function setup() {
    const h = get(),
      f = await courseFixture(h);
    await f.grant({ kind: 'organization' }, [...all]);
    return { h, f };
  }
  function command(
    f: Awaited<ReturnType<typeof courseFixture>>,
    change: Change,
    courseId?: string,
    expectedRevision?: number,
    key = randomUUID(),
  ) {
    return {
      organizationId: f.org.id,
      key,
      requestId: randomUUID(),
      change,
      ...(courseId ? { courseId, expectedRevision } : {}),
    };
  }
  const create = (): Change => ({
    kind: 'create',
    code: 'SYN_' + randomUUID().replaceAll('-', '').toUpperCase(),
    scopeUnitId: null,
    title: 'Synthetic course',
    description: 'Unapproved synthetic content',
    metadata: meta,
  });
  it('creates stable identity/draft, safe metadata, attribution and original versioned acknowledgement', async () => {
    const { h, f } = await setup(),
      cmd = command(f, create());
    const result = await f.service.execute(f.actor.token, cmd);
    const draft = await f.service.retrieve(
      f.actor.token,
      f.org.id,
      result.courseId,
    );
    expect(draft).toMatchObject({
      id: result.draftId,
      revision: 0,
      status: 'draft',
      createdBy: f.actor.id,
      updatedBy: f.actor.id,
      modules: [],
    });
    await expect(
      f.service.execute(f.actor.token, { ...cmd, requestId: randomUUID() }),
    ).resolves.toEqual({ ...result, replayed: true });
    expect(await h.events(f.org.id)).toBe(1);
    expect(await h.receiptCount(f.org.id)).toBe(1);
    await expect(
      f.service.execute(f.actor.token, {
        ...cmd,
        change: { ...cmd.change, title: 'Different' } as Change,
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });
  it('edits metadata and module/lesson structure with contiguous stable ordering and no orphan references', async () => {
    const { f } = await setup(),
      first = await f.service.execute(f.actor.token, command(f, create()));
    let revision = 0;
    const send = async (change: Change) => {
      const value = await f.service.execute(
        f.actor.token,
        command(f, change, first.courseId, revision),
      );
      revision = value.revision;
      return f.service.retrieve(f.actor.token, f.org.id, first.courseId);
    };
    await send({
      kind: 'metadata',
      title: 'Edited',
      description: 'Synthetic',
      metadata: meta,
    });
    await send({ kind: 'addModule', title: 'One', description: 'Synthetic' });
    let draft = await send({
      kind: 'addModule',
      title: 'Two',
      description: 'Synthetic',
    });
    const a = draft.modules[0]!.id,
      b = draft.modules[1]!.id;
    await send({
      kind: 'updateModule',
      moduleId: a,
      title: 'Changed',
      description: 'Synthetic',
    });
    await send({
      kind: 'addLesson',
      moduleId: a,
      title: 'One',
      description: 'Synthetic',
      content: { type: 'text', text: 'Synthetic plain text' },
    });
    draft = await send({
      kind: 'addLesson',
      moduleId: a,
      title: 'Two',
      description: 'Synthetic',
      content: {
        type: 'structured',
        blocks: [
          { type: 'heading', level: 2, text: 'Synthetic' },
          { type: 'list', items: ['One', 'Two'] },
        ],
      },
    });
    const [l1, l2] = draft.modules[0]!.lessons;
    draft = await send({
      kind: 'reorderLessons',
      moduleId: a,
      ids: [l2!.id, l1!.id],
    });
    expect(draft.modules[0]!.lessons.map((v) => v.position)).toEqual([0, 1]);
    await send({
      kind: 'updateLesson',
      moduleId: a,
      lessonId: l1!.id,
      title: 'Updated',
      description: 'Synthetic',
      content: { type: 'text', text: 'Updated safe text' },
    });
    await send({ kind: 'removeLesson', moduleId: a, lessonId: l2!.id });
    draft = await send({ kind: 'reorderModules', ids: [b, a] });
    expect(draft.modules.map((v) => v.id)).toEqual([b, a]);
    draft = await send({ kind: 'removeModule', moduleId: a });
    expect(draft.modules).toHaveLength(1);
    expect(draft.modules[0]!.position).toBe(0);
    expect(draft.modules[0]!.lessons).toEqual([]);
    expect(draft.revision).toBe(revision);
  });
  it('rejects duplicate/missing/foreign ordering and parent substitution without changing revision', async () => {
    const { f } = await setup(),
      result = await f.service.execute(f.actor.token, command(f, create()));
    await f.service.execute(
      f.actor.token,
      command(
        f,
        { kind: 'addModule', title: 'One', description: 'Synthetic' },
        result.courseId,
        0,
      ),
    );
    const draft = await f.service.retrieve(
        f.actor.token,
        f.org.id,
        result.courseId,
      ),
      moduleId = draft.modules[0]!.id;
    for (const change of [
      { kind: 'reorderModules', ids: [] },
      { kind: 'reorderModules', ids: [moduleId, moduleId] },
      { kind: 'reorderModules', ids: [newId()] },
      {
        kind: 'addLesson',
        moduleId: newId(),
        title: 'Bad',
        description: 'Synthetic',
        content: { type: 'text', text: 'Safe' },
      },
      { kind: 'removeLesson', moduleId, lessonId: newId() },
    ] as Change[])
      await expect(
        f.service.execute(
          f.actor.token,
          command(f, change, result.courseId, 1),
        ),
      ).rejects.toThrow();
    expect(
      (await f.service.retrieve(f.actor.token, f.org.id, result.courseId))
        .revision,
    ).toBe(1);
  });
  it('enforces own versus other author and requires explicit course permission even for security administrators', async () => {
    const h = get(),
      f = await courseFixture(h);
    await f.grant({ kind: 'organization' }, [
      'course.draft.create',
      'security.manage',
    ]);
    const mine = await f.service.execute(f.actor.token, command(f, create()));
    await expect(
      f.service.retrieve(f.actor.token, f.org.id, mine.courseId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant({ kind: 'own' }, [
      'course.draft.read',
      'course.draft.edit',
      'course.draft.archive',
    ]);
    await expect(
      f.service.retrieve(f.actor.token, f.org.id, mine.courseId),
    ).resolves.toMatchObject({ createdBy: f.actor.id });
    await f.grant({ kind: 'organization' }, ['course.draft.create'], {
      userId: f.peer.id,
    });
    const theirs = await f.service.execute(f.peer.token, command(f, create()));
    await expect(
      f.service.retrieve(f.actor.token, f.org.id, theirs.courseId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.service.execute(
        f.actor.token,
        command(f, { kind: 'archive' }, theirs.courseId, 0),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant(
      { kind: 'resource', resourceType: 'course', resourceId: theirs.courseId },
      ['course.draft.read'],
    );
    await expect(
      f.service.retrieve(f.actor.token, f.org.id, theirs.courseId),
    ).resolves.toMatchObject({ createdBy: f.peer.id });
  });
  it('isolates organizations, plants and sibling departments; audience metadata never grants access', async () => {
    const { h, f } = await setup(),
      other = await courseFixture(h);
    const row = await f.service.execute(
      f.actor.token,
      command(f, {
        ...create(),
        scopeUnitId: f.department.id,
        metadata: { ...meta, audienceUnitIds: [f.sibling.id] },
      } as Change),
    );
    await f.grant(
      { kind: 'unit', unitId: f.sibling.id, includeDescendants: true },
      ['course.draft.read', 'course.draft.edit'],
      { userId: f.peer.id },
    );
    await expect(
      f.service.retrieve(f.peer.token, f.org.id, row.courseId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant(
      { kind: 'unit', unitId: f.plantB.id, includeDescendants: true },
      ['course.draft.read'],
      { userId: f.peer.id },
    );
    await expect(
      f.service.retrieve(f.peer.token, f.org.id, row.courseId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant(
      { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
      ['course.draft.read'],
      { userId: f.peer.id },
    );
    await expect(
      f.service.retrieve(f.peer.token, f.org.id, row.courseId),
    ).resolves.toBeDefined();
    await other.grant({ kind: 'organization' }, [...all]);
    await expect(
      other.service.retrieve(other.actor.token, other.org.id, row.courseId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.service.execute(
        f.actor.token,
        command(f, { ...create(), scopeUnitId: other.plantA.id } as Change),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.service.execute(
        f.actor.token,
        command(f, {
          ...create(),
          metadata: { ...meta, audienceUnitIds: [other.plantA.id] },
        } as Change),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('rechecks revoked permission and disabled actors on replay', async () => {
    const h = get(),
      f = await courseFixture(h),
      grant = await f.grant({ kind: 'organization' }, [...all]);
    const cmd = command(f, create());
    await f.service.execute(f.actor.token, cmd);
    await h.repository.transaction((tx) =>
      tx.revokeGrant(grant, f.actor.id, now, 'Synthetic revoke'),
    );
    await expect(f.service.execute(f.actor.token, cmd)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await f.grant({ kind: 'organization' }, [...all]);
    await h.disable(f.actor.id);
    await expect(f.service.execute(f.actor.token, cmd)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('rejects stale concurrent edits and duplicate retries commit exactly one change', async () => {
    const { h, f } = await setup(),
      result = await f.service.execute(f.actor.token, command(f, create()));
    const changes = await Promise.allSettled(
      ['One', 'Two'].map((title) =>
        f.service.execute(
          f.actor.token,
          command(
            f,
            {
              kind: 'metadata',
              title,
              description: 'Synthetic',
              metadata: meta,
            },
            result.courseId,
            0,
          ),
        ),
      ),
    );
    expect(changes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const cmd = command(
      f,
      { kind: 'addModule', title: 'Only one', description: 'Synthetic' },
      result.courseId,
      1,
    );
    const retries = await Promise.all([
      f.service.execute(f.actor.token, cmd),
      f.service.execute(f.actor.token, cmd),
    ]);
    expect(retries.map((r) => r.replayed).sort()).toEqual([false, true]);
    expect(
      (await f.service.retrieve(f.actor.token, f.org.id, result.courseId))
        .modules,
    ).toHaveLength(1);
    expect(await h.events(f.org.id)).toBe(3);
    expect(await h.receiptCount(f.org.id)).toBe(3);
  });
  it('archives softly, permits authorized historical read/replay, rejects subsequent edits/new archive', async () => {
    const { f } = await setup(),
      result = await f.service.execute(f.actor.token, command(f, create())),
      cmd = command(f, { kind: 'archive' }, result.courseId, 0);
    await f.service.execute(f.actor.token, cmd);
    await expect(f.service.execute(f.actor.token, cmd)).resolves.toMatchObject({
      revision: 1,
      replayed: true,
    });
    await expect(
      f.service.retrieve(f.actor.token, f.org.id, result.courseId),
    ).resolves.toMatchObject({ status: 'archived' });
    await expect(
      f.service.execute(
        f.actor.token,
        command(
          f,
          { kind: 'addModule', title: 'Bad', description: 'Synthetic' },
          result.courseId,
          1,
        ),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.service.execute(
        f.actor.token,
        command(f, { kind: 'archive' }, result.courseId, 1),
      ),
    ).rejects.toMatchObject({ code: 'DRAFT_CONFLICT' });
  });
  it('rolls back identity/draft changes on audit and receipt persistence failure', async () => {
    for (const boundary of ['audit', 'receipt']) {
      const { h, f } = await setup();
      const bad = createCourseDraftService(
        h.repository,
        h.store,
        {
          ...h.receipts,
          saveReceipt: async (...args) => {
            await h.receipts.saveReceipt(...args);
            if (boundary === 'receipt')
              throw new Error('Synthetic receipt fault');
          },
        },
        f.provider,
        {
          durability: 'isolated-test',
          append: async (...args) => {
            await h.audit.append(...args);
            if (boundary === 'audit') throw new Error('Synthetic audit fault');
          },
        },
        { isolatedTest: true, clock: () => now },
      );
      const cmd = command(f, create());
      await expect(bad.execute(f.actor.token, cmd)).rejects.toThrow();
      expect(await h.events(f.org.id)).toBe(0);
      expect(await h.receiptCount(f.org.id)).toBe(0);
      await expect(
        f.service.execute(f.actor.token, cmd),
      ).resolves.toMatchObject({ revision: 0 });
    }
  });
  it('fails closed on corrupt/legacy receipts and rejects malformed stored response without reexecution', async () => {
    const { h, f } = await setup(),
      cmd = command(f, create());
    await f.service.execute(f.actor.token, cmd);
    for (const mode of ['digest', 'version', 'shape']) {
      const bad = createCourseDraftService(
        h.repository,
        h.store,
        {
          ...h.receipts,
          receipt: async (...args) => {
            const row = (await h.receipts.receipt(...args))!;
            if (mode === 'shape') {
              const data = { invalid: true };
              return { ...row, data, responseDigest: fingerprint(data) };
            }
            return {
              ...row,
              ...(mode === 'digest'
                ? { responseDigest: '0'.repeat(64) }
                : { commandVersion: 99 }),
            };
          },
        },
        f.provider,
        h.audit,
        { isolatedTest: true, clock: () => now },
      );
      await expect(bad.execute(f.actor.token, cmd)).rejects.toMatchObject({
        code: 'REPLAY_UNAVAILABLE',
      });
    }
    expect(await h.events(f.org.id)).toBe(1);
  });
  it('rejects executable, unknown, oversized and operator-bearing input and missing preconditions', async () => {
    const { f } = await setup();
    for (const value of [
      { ...create(), title: '<script>bad</script>' },
      { ...create(), metadata: { ...meta, $where: 'bad' } },
      { ...create(), description: 'x'.repeat(2001) },
      { ...create(), status: 'published' },
      {
        kind: 'addLesson',
        moduleId: newId(),
        title: 'Bad',
        description: 'Synthetic',
        content: { type: 'video', url: 'https://example.invalid' },
      },
    ])
      await expect(
        f.service.execute(f.actor.token, command(f, value as Change)),
      ).rejects.toThrow();
    const row = await f.service.execute(f.actor.token, command(f, create()));
    await expect(
      f.service.execute(
        f.actor.token,
        command(f, { kind: 'archive' }, row.courseId),
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
  it('bounds creation to the explicit unit grant; own and department grants cannot create at organization/parent scope', async () => {
    const h = get(),
      f = await courseFixture(h);
    await f.grant({ kind: 'own' }, [...all]);
    await expect(
      f.service.execute(f.actor.token, command(f, create())),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await f.grant(
      { kind: 'unit', unitId: f.department.id, includeDescendants: true },
      ['course.draft.create'],
    );
    for (const scopeUnitId of [null, f.plantA.id, f.sibling.id, f.plantB.id])
      await expect(
        f.service.execute(
          f.actor.token,
          command(f, { ...create(), scopeUnitId } as Change),
        ),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      f.service.execute(
        f.actor.token,
        command(f, { ...create(), scopeUnitId: f.child.id } as Change),
      ),
    ).resolves.toMatchObject({ revision: 0 });
  });
  it('rolls back a failed edit without changing content, revision, audit or receipt', async () => {
    const { h, f } = await setup(),
      row = await f.service.execute(f.actor.token, command(f, create()));
    const before = await f.service.retrieve(
      f.actor.token,
      f.org.id,
      row.courseId,
    );
    const bad = createCourseDraftService(
      h.repository,
      h.store,
      h.receipts,
      f.provider,
      {
        durability: 'isolated-test',
        append: async (...args) => {
          await h.audit.append(...args);
          throw new Error('Synthetic edit audit failure');
        },
      },
      { isolatedTest: true, clock: () => now },
    );
    await expect(
      bad.execute(
        f.actor.token,
        command(
          f,
          {
            kind: 'metadata',
            title: 'Uncommitted',
            description: '',
            metadata: meta,
          },
          row.courseId,
          0,
        ),
      ),
    ).rejects.toMatchObject({ code: 'SECURITY_AUDIT_UNAVAILABLE' });
    expect(
      await f.service.retrieve(f.actor.token, f.org.id, row.courseId),
    ).toEqual(before);
    expect(await h.events(f.org.id)).toBe(1);
    expect(await h.receiptCount(f.org.id)).toBe(1);
  });
  it('does not expose mutable retrieved objects as persistence and guards test-only composition', async () => {
    const { h, f } = await setup(),
      row = await f.service.execute(f.actor.token, command(f, create()));
    const draft = await f.service.retrieve(
      f.actor.token,
      f.org.id,
      row.courseId,
    );
    draft.title = 'Caller mutation';
    expect(
      (await f.service.retrieve(f.actor.token, f.org.id, row.courseId)).title,
    ).toBe('Synthetic course');
    const env = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() =>
        createCourseDraftService(
          h.repository,
          h.store,
          h.receipts,
          f.provider,
          h.audit,
          { isolatedTest: true },
        ),
      ).toThrow('isolated');
      await expect(
        f.service.retrieve(f.actor.token, f.org.id, row.courseId),
      ).rejects.toThrow('isolated');
    } finally {
      process.env.NODE_ENV = env;
    }
  });
}
