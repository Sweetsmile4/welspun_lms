import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import {
  contentDigest,
  snapshotSchema,
  policySchema,
  type Snapshot,
} from '../src/modules/catalog/publishing/contracts.js';
const id = () => new Types.ObjectId().toHexString();
function snapshot(): Snapshot {
  const actor = id(),
    course = id(),
    org = id(),
    at = new Date('2026-10-29T00:00:00Z');
  return {
    course: {
      id: course,
      organizationId: org,
      code: 'SYNTHETIC',
      ownerId: actor,
      scopeUnitId: null,
      createdAt: at,
      createdBy: actor,
    },
    draft: {
      id: id(),
      courseId: course,
      organizationId: org,
      title: 'Synthetic',
      description: '',
      metadata: { language: 'en', tags: [], audienceUnitIds: [] },
      status: 'draft',
      revision: 0,
      modules: [],
      createdBy: actor,
      updatedBy: actor,
      editedBy: [actor],
      createdAt: at,
      updatedAt: at,
    },
  };
}
describe('review snapshot digest and development policy', () => {
  it('sorts object keys but retains array ordering, date bytes, IDs and revision', () => {
    const s = snapshot(),
      original = contentDigest(s);
    expect(
      contentDigest({
        draft: s.draft,
        course: Object.fromEntries(Object.entries(s.course).reverse()),
      } as Snapshot),
    ).toBe(original);
    for (const change of [
      { revision: 1 },
      { updatedAt: new Date('2026-10-29T00:00:01Z') },
      { title: 'Different' },
      { metadata: { ...s.draft.metadata, tags: ['a', 'b'] } },
    ])
      expect(
        contentDigest({ ...s, draft: { ...s.draft, ...change } }),
      ).not.toBe(original);
    const tagged = {
      ...s,
      draft: {
        ...s.draft,
        metadata: { ...s.draft.metadata, tags: ['a', 'b'] },
      },
    };
    expect(contentDigest(tagged)).not.toBe(
      contentDigest({
        ...tagged,
        draft: {
          ...tagged.draft,
          metadata: { ...tagged.draft.metadata, tags: ['b', 'a'] },
        },
      }),
    );
  });
  it('requires explicit bounded policy and complete same-organization contributor provenance', () => {
    expect(policySchema.safeParse({ key: 'synthetic' }).success).toBe(false);
    expect(
      policySchema.safeParse({ key: 'synthetic', requiredApprovals: 0 })
        .success,
    ).toBe(false);
    expect(
      policySchema.safeParse({ key: 'synthetic', requiredApprovals: 6 })
        .success,
    ).toBe(false);
    const s = snapshot();
    expect(
      snapshotSchema.safeParse({
        ...s,
        draft: { ...s.draft, editedBy: undefined },
      }).success,
    ).toBe(false);
    expect(
      snapshotSchema.safeParse({
        ...s,
        draft: { ...s.draft, organizationId: id() },
      }).success,
    ).toBe(false);
  });
});
