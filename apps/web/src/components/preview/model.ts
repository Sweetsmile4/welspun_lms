import {
  courseContentSchema,
  courseMetadataSchema,
  courseTitleSchema,
  courseDescriptionSchema,
} from '@welspun/contracts';
export type Perspective = 'author' | 'reviewer' | 'publisher' | 'unauthorized';
export type Content = ReturnType<typeof courseContentSchema.parse>;
export type Lesson = {
  id: string;
  title: string;
  description: string;
  content: Content;
};
export type Module = {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
};
export type Draft = {
  id: string;
  code: string;
  title: string;
  description: string;
  language: string;
  tags: string[];
  scope: string;
  revision: number;
  status: 'draft' | 'archived';
  modules: Module[];
};
export const feedbackCategories = [
  { value: 'accuracy', label: 'Accuracy' },
  { value: 'clarity', label: 'Clarity' },
  { value: 'safety', label: 'Safety' },
  { value: 'structure', label: 'Structure' },
] as const;
export type FeedbackCategory = (typeof feedbackCategories)[number]['value'];
export type FeedbackItem = { category: FeedbackCategory; message: string };
export type Decision = 'approve' | 'changesRequested' | 'rejected';
export type Review = {
  id: string;
  draftId: string;
  revision: number;
  digest: string;
  snapshot: Draft;
  state:
    | 'submitted'
    | 'inReview'
    | 'approved'
    | 'changesRequested'
    | 'rejected'
    | 'published'
    | 'superseded';
  required: number;
  reviewers: string[];
  decisions: {
    reviewer: string;
    decision: Decision;
    feedback: FeedbackItem[];
  }[];
  timeline: string[];
};
export type Release = {
  id: string;
  number: number;
  digest: string;
  snapshot: Draft;
  approvals: Review['decisions'];
  reviewId: string;
  reviewRevision: number;
  createdAt: string;
};
export type ReadinessCheck = {
  label: string;
  ok: boolean;
  detail: string;
};
export const fixture = (): Draft[] => [
  {
    id: 'synthetic-course-1',
    code: 'SYN_TEXT',
    title: 'Structured learning essentials',
    description:
      'Synthetic text course for testing authoring and review screens. No industrial guidance.',
    language: 'en',
    tags: ['synthetic', 'orientation'],
    scope: 'Synthetic Plant A / Department A',
    revision: 0,
    status: 'draft',
    modules: [
      {
        id: 'module-1',
        title: 'Getting started',
        description: 'Synthetic example module',
        lessons: [
          {
            id: 'lesson-1',
            title: 'Welcome',
            description: '',
            content: {
              type: 'text',
              text: 'This fictional lesson helps you explore the editor. It is not approved training.',
            },
          },
        ],
      },
      {
        id: 'module-2',
        title: 'Putting text into practice',
        description: '',
        lessons: [
          {
            id: 'lesson-2',
            title: 'A structured example',
            description: '',
            content: {
              type: 'structured',
              blocks: [
                {
                  type: 'heading',
                  level: 2,
                  text: 'A clear learning objective',
                },
                {
                  type: 'paragraph',
                  text: 'Explore simple, safe content blocks.',
                },
              ],
            },
          },
        ],
      },
    ],
  },
];
export const uid = () => crypto.randomUUID();
export function fields(data: FormData) {
  return {
    title: courseTitleSchema.parse(data.get('title')),
    description: courseDescriptionSchema.parse(data.get('description') ?? ''),
  };
}
export function metadata(data: FormData) {
  return courseMetadataSchema.parse({
    language: data.get('language'),
    tags: String(data.get('tags') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    audienceUnitIds: [],
  });
}
export function validateDraft(draft: Draft) {
  courseTitleSchema.parse(draft.title);
  courseDescriptionSchema.parse(draft.description);
  courseMetadataSchema.parse({
    language: draft.language,
    tags: draft.tags,
    audienceUnitIds: [],
  });
  if (
    draft.modules.length > 20 ||
    draft.modules.some((m) => m.lessons.length > 20) ||
    draft.modules.reduce((sum, m) => sum + m.lessons.length, 0) > 100 ||
    new TextEncoder().encode(JSON.stringify(draft)).length > 256 * 1024
  )
    throw new Error(
      'Draft exceeds 20 modules, 20 lessons per module, 100 total lessons or 256 KiB.',
    );
  for (const m of draft.modules) {
    courseTitleSchema.parse(m.title);
    courseDescriptionSchema.parse(m.description);
    for (const l of m.lessons) {
      courseTitleSchema.parse(l.title);
      courseDescriptionSchema.parse(l.description);
      courseContentSchema.parse(l.content);
    }
  }
}
export async function digest(draft: Draft) {
  function canonical(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, value]) => [k, canonical(value)]),
      );
    return v;
  }
  const result = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(canonical(draft))),
  );
  return Array.from(new Uint8Array(result), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
type ValidationIssue = { path?: (string | number)[]; message?: string };
export function describeError(error: unknown) {
  if (error instanceof SyntaxError)
    return 'Structured content must be valid JSON using only paragraph, heading or list blocks.';
  if (error && typeof error === 'object' && 'issues' in error) {
    const first = (error as { issues?: ValidationIssue[] }).issues?.[0];
    if (first) {
      const field = (first.path ?? [])
        .filter((part): part is string => typeof part === 'string')
        .join(' ');
      return field
        ? `${field}: ${first.message ?? 'Invalid value'}`
        : (first.message ?? 'Invalid value');
    }
  }
  return error instanceof Error ? error.message : 'Invalid input.';
}
export async function readinessChecks(
  draft: Draft,
  review: Review | undefined,
  releaseCount: number,
): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [];
  const add = (label: string, ok: boolean, detail: string) =>
    checks.push({ label, ok, detail });
  add(
    'Active draft',
    draft.status === 'draft',
    draft.status === 'draft'
      ? 'Draft lifecycle permits publication.'
      : 'Archived drafts cannot be reviewed or published.',
  );
  add(
    'Lesson-bearing modules',
    draft.modules.length > 0 &&
      draft.modules.every((module) => module.lessons.length > 0),
    draft.modules.length
      ? `${draft.modules.length} module(s); every module must contain a lesson.`
      : 'Add at least one module with a lesson.',
  );
  if (review) {
    const approvals = review.decisions.filter(
      (decision) => decision.decision === 'approve',
    ).length;
    add(
      'Review submission',
      true,
      `Submitted revision ${review.revision} · ${review.state}.`,
    );
    add(
      'Exact draft revision',
      review.revision === draft.revision,
      `Submitted ${review.revision}; current ${draft.revision}.`,
    );
    add(
      'Exact content digest',
      review.digest === (await digest(draft)),
      'The review digest must equal the current draft digest.',
    );
    add(
      'Assigned reviewers',
      review.reviewers.length === review.required,
      `${review.reviewers.length} assigned for ${review.required} required slot(s).`,
    );
    add(
      'Independent approvals',
      review.state === 'approved' &&
        approvals === review.required &&
        review.reviewers.length === review.required,
      `${approvals} approval(s) for ${review.required} required slot(s).`,
    );
  } else {
    add('Review submission', false, 'Submit the current draft for review.');
    add(
      'Exact draft revision',
      false,
      'No submitted revision exists for this draft.',
    );
    add('Exact content digest', false, 'A current review digest is required.');
    add('Assigned reviewers', false, 'Assign the configured reviewer slots.');
    add(
      'Independent approvals',
      false,
      'Assign and obtain all required approvals.',
    );
  }
  add(
    'Next release number',
    true,
    `Release ${releaseCount + 1} is the next synthetic release for this draft.`,
  );
  return checks;
}
export function move<T>(rows: T[], index: number, direction: number) {
  const next = [...rows],
    to = index + direction;
  if (to < 0 || to >= rows.length) return next;
  [next[index], next[to]] = [next[to]!, next[index]!];
  return next;
}
