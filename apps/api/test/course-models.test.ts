import { randomUUID } from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { createDraftModels } from '../src/modules/catalog/drafts/models.js';
import {
  draftSchema,
  type Draft,
} from '../src/modules/catalog/drafts/contracts.js';
const id = () => new Types.ObjectId().toHexString();
function draft(): Draft {
  const actor = id();
  return {
    id: id(),
    courseId: id(),
    organizationId: id(),
    title: 'Synthetic',
    description: '',
    metadata: { language: 'en', tags: [], audienceUnitIds: [] },
    status: 'draft',
    revision: 0,
    modules: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: actor,
    updatedBy: actor,
  };
}
describe('bounded draft schemas without a database connection', () => {
  it('validates both Mongoose models, empty descriptions and rejects unknown/unsafe model fields offline', async () => {
    const connection = mongoose.createConnection(),
      models = createDraftModels(connection),
      value = draft();
    const { id: draftId, ...rest } = value;
    await expect(
      new models.drafts({ _id: draftId, ...rest }).validate(),
    ).resolves.toBeUndefined();
    await expect(
      new models.courses({
        _id: value.courseId,
        organizationId: value.organizationId,
        code: 'SYN_' + randomUUID().replaceAll('-', '').toUpperCase(),
        ownerId: value.createdBy,
        scopeUnitId: null,
        createdBy: value.createdBy,
        createdAt: value.createdAt,
      }).validate(),
    ).resolves.toBeUndefined();
    await expect(
      new models.drafts({
        _id: draftId,
        ...rest,
        title: '<script>bad</script>',
      }).validate(),
    ).rejects.toThrow();
    expect(
      () =>
        new models.drafts({ _id: draftId, ...rest, publishedAt: new Date() }),
    ).toThrow();
    expect(connection.readyState).toBe(0);
    await connection.close();
  });
  it('rejects duplicate IDs, noncontiguous positions and forged parent references at the stored contract boundary', () => {
    const value = draft(),
      moduleId = id();
    value.modules.push({
      id: moduleId,
      courseId: value.courseId,
      position: 0,
      revision: 0,
      title: 'Synthetic',
      description: '',
      lessons: [],
    });
    expect(draftSchema.safeParse(value).success).toBe(true);
    for (const change of [{ position: 2 }, { courseId: id() }])
      expect(
        draftSchema.safeParse({
          ...value,
          modules: [{ ...value.modules[0], ...change }],
        }).success,
      ).toBe(false);
    value.modules[0]!.lessons.push({
      id: moduleId,
      moduleId,
      courseId: value.courseId,
      position: 0,
      revision: 0,
      title: 'Synthetic',
      description: '',
      content: { type: 'text', text: 'Synthetic' },
    });
    expect(draftSchema.safeParse(value).success).toBe(false);
    value.modules[0]!.lessons[0]!.id = id();
    value.modules[0]!.lessons[0]!.moduleId = id();
    expect(draftSchema.safeParse(value).success).toBe(false);
  });
  it('bounds sibling counts, total lessons and UTF-8 aggregate size', () => {
    const value = draft();
    for (let m = 0; m < 6; m++) {
      const moduleId = id();
      value.modules.push({
        id: moduleId,
        courseId: value.courseId,
        position: m,
        revision: 0,
        title: 'Synthetic',
        description: '',
        lessons: Array.from({ length: 17 }, (_, position) => ({
          id: id(),
          moduleId,
          courseId: value.courseId,
          position,
          revision: 0,
          title: 'Synthetic',
          description: '',
          content: { type: 'text' as const, text: 'Synthetic' },
        })),
      });
    }
    expect(draftSchema.safeParse(value).success).toBe(false); // 102 total.
    value.modules = value.modules.slice(0, 2);
    for (const courseModule of value.modules)
      for (const lesson of courseModule.lessons)
        lesson.content = { type: 'text', text: '界'.repeat(8000) };
    expect(draftSchema.safeParse(value).success).toBe(false); // UTF-8 bytes, not character count.
    value.modules = Array.from({ length: 21 }, (_, position) => ({
      id: id(),
      courseId: value.courseId,
      position,
      revision: 0,
      title: 'Synthetic',
      description: '',
      lessons: [],
    }));
    expect(draftSchema.safeParse(value).success).toBe(false);
  });
});
