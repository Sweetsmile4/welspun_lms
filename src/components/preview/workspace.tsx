'use client';
import Link from 'next/link';
import { ContentView } from './content-view';
import { usePreviewState } from './provider';
import {
  useState,
  useId,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ClipboardCheck,
  LockKeyhole,
  Plus,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  courseContentSchema,
  courseDescriptionSchema,
  courseTitleSchema,
} from '@/contracts';
import {
  describeError,
  digest,
  feedbackCategories,
  fields,
  metadata,
  move,
  readinessChecks,
  uid,
  validateDraft,
  type Draft,
  type FeedbackCategory,
  type Review,
  type Release,
  type ReadinessCheck,
} from './model';

const button = 'preview-button';
const categoryLabel = (value: FeedbackCategory) =>
  feedbackCategories.find((category) => category.value === value)?.label ??
  value;
const tabs = [
  ['draft', 'Draft editor'],
  ['review', 'Review workflow'],
  ['releases', 'Release history'],
] as const;
function Field({
  label,
  name,
  value = '',
  multiline = false,
  required = false,
  max = 200,
}: {
  label: string;
  name: string;
  value?: string;
  multiline?: boolean;
  required?: boolean;
  max?: number;
}) {
  const errorId = useId();
  const [error, setError] = useState('');
  return (
    <label className="preview-field">
      {label}
      {multiline ? (
        <textarea
          name={name}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onBlur={(e) => {
            const result = courseDescriptionSchema.safeParse(e.target.value);
            setError(result.success ? '' : describeError(result.error));
          }}
          defaultValue={value}
          rows={3}
          maxLength={max}
          required={required}
        />
      ) : (
        <input
          name={name}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onBlur={(e) => {
            if (name !== 'title') return;
            const result = courseTitleSchema.safeParse(e.target.value);
            setError(result.success ? '' : describeError(result.error));
          }}
          defaultValue={value}
          maxLength={max}
          required={required}
        />
      )}
      {error && (
        <span id={errorId} className="preview-field-error">
          {error}
        </span>
      )}
    </label>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="preview-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function PreviewWorkspace({
  initialTab = 'draft',
}: {
  initialTab?: string;
}) {
  const {
    courses,
    setCourses,
    selected,
    setSelected,
    perspective,
    setPerspective,
    reviews,
    setReviews,
    releases,
    setReleases,
    reset: resetShared,
    busy,
    setBusy,
    notice,
    setNotice,
  } = usePreviewState();
  const [search, setSearch] = useState(''),
    [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState(initialTab),
    [reviewer, setReviewer] = useState('Synthetic reviewer A'),
    [required, setRequired] = useState(1),
    [creating, setCreating] = useState(false),
    [ready, setReady] = useState('Not checked'),
    [checks, setChecks] = useState<ReadinessCheck[]>([]),
    [editingLesson, setEditingLesson] = useState<string | null>(null),
    [contentType, setContentType] = useState('text');
  const draft = courses.find((c) => c.id === selected)!;
  const review = reviews.filter((r) => r.draftId === selected).at(-1);
  const history = releases.filter((r) => r.snapshot.id === selected);
  const canEdit = perspective === 'author' && draft.status === 'draft';
  async function simulate(work: () => void | Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await work();
    } catch (error) {
      setNotice({
        error: true,
        text: `Simulated action blocked: ${describeError(error)}`,
      });
    } finally {
      setBusy(false);
    }
  }
  const success = (text: string) =>
    setNotice({
      error: false,
      text: `Simulated: ${text} No backend validation or persistence.`,
    });
  function update(change: (d: Draft) => void, expected = draft.revision) {
    if (!canEdit)
      throw new Error('This perspective cannot edit an active draft.');
    if (draft.revision !== expected)
      throw new Error(
        'Revision conflict. Reload the current fixture form before retrying.',
      );
    const next = structuredClone(draft);
    change(next);
    next.revision++;
    validateDraft(next);
    setCourses(courses.map((c) => (c.id === selected ? next : c)));
    setReady('Not checked');
    setChecks([]);
    success(`Draft saved at revision ${next.revision}.`);
  }
  function form(
    event: FormEvent<HTMLFormElement>,
    action: (data: FormData) => void | Promise<void>,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void simulate(() => action(data));
  }
  async function currentReview() {
    if (!review) throw new Error('Submit a draft for review first.');
    if (
      draft.status !== 'draft' ||
      review.revision !== draft.revision ||
      review.digest !== (await digest(draft))
    )
      throw new Error(
        'Stale review. Draft revision or digest has changed; submit the new revision.',
      );
    return review;
  }
  function replaceReview(next: Review) {
    setReviews(reviews.map((r) => (r.id === next.id ? next : r)));
    setReady('Not checked');
    setChecks([]);
  }
  async function readiness() {
    if (perspective !== 'publisher')
      throw new Error('Switch to the synthetic publisher perspective.');
    const result = await readinessChecks(draft, review, history.length);
    setChecks(result);
    const blocker = result.find((check) => !check.ok);
    if (blocker) {
      const message = `${blocker.label}: ${blocker.detail}`;
      setReady(`Not ready: ${message}`);
      throw new Error(message);
    }
    setReady(
      'Simulated ready: exact revision/digest and required approvals match.',
    );
    return review!;
  }
  function reset() {
    resetShared();
    setTab('draft');
    setCreating(false);
    setReady('Not checked');
    setChecks([]);
    setEditingLesson(null);
    setRequired(1);
    setReviewer('Synthetic reviewer A');
    setContentType('text');
    success('All synthetic data reset.');
  }
  const selectors = (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="preview-field">
        Visual perspective
        <select
          aria-label="Visual perspective"
          disabled={busy}
          value={perspective}
          onChange={(e) => {
            setPerspective(e.target.value as typeof perspective);
            setReady('Not checked');
            setChecks([]);
          }}
        >
          <option value="author">Course author · synthetic</option>
          <option value="reviewer">Assigned reviewer · synthetic</option>
          <option value="publisher">Publisher · synthetic</option>
          <option value="unauthorized">Unauthorized visitor · synthetic</option>
        </select>
      </label>
      {perspective === 'reviewer' && (
        <label className="preview-field">
          Reviewer scenario
          <select
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
          >
            <option>Synthetic reviewer A</option>
            <option>Synthetic reviewer B</option>
            <option>Unassigned reviewer</option>
          </select>
        </label>
      )}
    </div>
  );
  function moveTab(event: KeyboardEvent<HTMLButtonElement>, current: string) {
    const values = tabs.map(([value]) => value);
    const index = values.indexOf(current as (typeof values)[number]);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % values.length;
    else if (event.key === 'ArrowLeft')
      next = (index - 1 + values.length) % values.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = values.length - 1;
    else return;
    event.preventDefault();
    const value = values[next]!;
    setTab(value);
    document.getElementById(`tab-${value}`)?.focus();
  }
  return (
    <div className="preview-workspace" aria-busy={busy}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="preview-eyebrow">DEVELOPMENT / COURSE OPERATIONS</p>
          <h1 className="text-3xl font-bold tracking-tight">
            Course workspace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Author, review and inspect release snapshots with synthetic content.
          </p>
        </div>
        <button className={button} disabled={busy} onClick={reset}>
          <RotateCcw size={15} aria-hidden="true" />
          Reset fixtures
        </button>
      </div>
      <div className="preview-disclosure">
        <ShieldCheck size={21} aria-hidden="true" />
        <div>
          <strong>UI fixture mode · simulated actions only</strong>
          <p>
            Tab-memory data. No backend calls, saved records, authentication or
            qualification checks. Reload or reset clears this walkthrough.
          </p>
          <p className="mt-1">
            Isolated integration: unavailable — the existing test-only services
            have no approved browser identity/transport boundary.
          </p>
        </div>
      </div>
      <div className="preview-panel">
        {selectors}
        <p className="mt-2 text-xs text-muted-foreground">
          Perspectives change this visual scenario only. They grant no server
          access and never impersonate an employee.
        </p>
      </div>
      <div
        role="status"
        aria-live="polite"
        className={
          notice.error ? 'preview-message preview-error' : 'preview-message'
        }
      >
        {busy ? 'Simulating interaction…' : notice.text}
      </div>
      {perspective === 'unauthorized' ? (
        <Panel title="Access unavailable in this scenario">
          <LockKeyhole aria-hidden="true" />
          <p className="mt-3">
            This synthetic visitor has no course permissions. Draft editing,
            review decisions and publishing are hidden. This display is not a
            backend authorization test.
          </p>
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [
                'Active drafts',
                courses.filter((c) => c.status === 'draft').length,
              ],
              [
                'Published courses',
                new Set(releases.map((r) => r.snapshot.id)).size,
              ],
              ['Simulated releases', releases.length],
            ].map(([label, count]) => (
              <div className="preview-stat" key={label}>
                <span>{label}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <Panel title="Course drafts">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Synthetic authoring workspace · no learner catalog
              </p>
              {perspective === 'author' && (
                <button
                  className={`${button} preview-primary`}
                  onClick={() => setCreating(!creating)}
                  disabled={busy}
                >
                  <Plus size={15} aria-hidden="true" />
                  {creating ? 'Close create form' : 'Create synthetic course'}
                </button>
              )}
            </div>
            {creating && (
              <form
                aria-label="Create course"
                className="preview-inset"
                onSubmit={(e) =>
                  form(e, (data) => {
                    if (perspective !== 'author')
                      throw new Error('Author perspective required.');
                    const info = fields(data),
                      meta = metadata(data),
                      code = String(data.get('code'));
                    if (!/^[A-Z][A-Z0-9_-]{0,63}$/.test(code))
                      throw new Error(
                        'Code must be uppercase letters, digits, underscore or hyphen, starting with a letter (maximum 64).',
                      );
                    if (courses.some((c) => c.code === code))
                      throw new Error(
                        'Course code already exists in this fixture.',
                      );
                    const next: Draft = {
                      id: uid(),
                      ...info,
                      code,
                      language: meta.language,
                      tags: meta.tags,
                      scope: String(data.get('scope')),
                      revision: 0,
                      status: 'draft',
                      modules: [],
                    };
                    validateDraft(next);
                    setCourses([...courses, next]);
                    setSelected(next.id);
                    setCreating(false);
                    setTab('draft');
                    success('Synthetic course created.');
                  })
                }
              >
                <div className="preview-form-grid">
                  <Field label="Course title" name="title" required />
                  <Field label="Course code" name="code" required max={64} />
                  <Field
                    label="Description"
                    name="description"
                    multiline
                    max={2000}
                  />
                  <Field
                    label="Language"
                    name="language"
                    value="en"
                    required
                    max={12}
                  />
                  <Field
                    label="Tags (comma separated)"
                    name="tags"
                    value="synthetic"
                    max={410}
                  />
                  <label className="preview-field">
                    Scope
                    <select name="scope">
                      <option>Synthetic Plant A / Department A</option>
                      <option>Synthetic Plant A</option>
                      <option>Synthetic organization</option>
                    </select>
                  </label>
                </div>
                <button className={`${button} preview-primary`} disabled={busy}>
                  Create fixture
                </button>
              </form>
            )}
            <div className="preview-form-grid mb-4">
              <label className="preview-field">
                Search course drafts
                <input
                  type="search"
                  value={search}
                  maxLength={100}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Course title or code"
                />
              </label>
              <label className="preview-field">
                Draft lifecycle
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All drafts</option>
                  <option value="draft">Active drafts</option>
                  <option value="archived">Archived drafts</option>
                </select>
              </label>
            </div>
            {!courses.some(
              (c) =>
                (statusFilter === 'all' || c.status === statusFilter) &&
                `${c.title} ${c.code}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            ) && (
              <p className="preview-inset">
                No matching course drafts. Adjust your search or lifecycle
                filter.
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {courses
                .filter(
                  (c) =>
                    (statusFilter === 'all' || c.status === statusFilter) &&
                    `${c.title} ${c.code}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .map((c) => (
                  <button
                    key={c.id}
                    aria-label={`Open draft ${c.title}`}
                    aria-pressed={c.id === selected}
                    disabled={busy}
                    onClick={() => {
                      setSelected(c.id);
                      setReady('Not checked');
                      setChecks([]);
                      setEditingLesson(null);
                    }}
                    className={`preview-course ${c.id === selected ? 'preview-selected' : ''}`}
                  >
                    <BookOpen size={19} aria-hidden="true" />
                    <span className="min-w-0">
                      <strong>{c.title}</strong>
                      <small>
                        {c.code} · Revision {c.revision}
                      </small>
                      <small>{c.scope}</small>
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <span className="preview-badge">{c.status}</span>
                      {releases.some((r) => r.snapshot.id === c.id) && (
                        <span className="preview-badge preview-status-success">
                          Published snapshot available
                        </span>
                      )}
                    </span>
                  </button>
                ))}
            </div>
          </Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{draft.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Revision{' '}
                <span data-testid="draft-revision">{draft.revision}</span> ·{' '}
                {draft.status} · Synthetic author
              </p>
            </div>
            <div
              role="tablist"
              aria-label="Course workspace views"
              className="preview-tabs"
            >
              {tabs.map(([value, label]) => (
                <button
                  key={value}
                  id={`tab-${value}`}
                  role="tab"
                  aria-selected={tab === value}
                  aria-controls={`panel-${value}`}
                  tabIndex={tab === value ? 0 : -1}
                  onClick={() => setTab(value)}
                  onKeyDown={(event) => moveTab(event, value)}
                  className={tab === value ? 'active' : ''}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {tab === 'draft' && (
            <div
              id="panel-draft"
              role="tabpanel"
              aria-labelledby="tab-draft"
              tabIndex={0}
              className="space-y-5"
            >
              <Panel title="Course details">
                <p className="mb-3 text-sm text-muted-foreground">
                  {canEdit
                    ? 'Edit metadata below, then save to advance the draft revision. Unsaved field changes are discarded when switching course or view.'
                    : 'Read-only in this perspective or lifecycle. Switch to the author perspective to edit an active draft.'}
                </p>
                <form
                  key={`${selected}-${draft.revision}`}
                  aria-label="Edit course details"
                  onSubmit={(e) =>
                    form(e, (data) =>
                      update((next) => {
                        Object.assign(next, fields(data));
                        const meta = metadata(data);
                        next.language = meta.language;
                        next.tags = meta.tags;
                      }),
                    )
                  }
                >
                  <fieldset disabled={!canEdit || busy}>
                    <div className="preview-form-grid">
                      <Field
                        label="Course title"
                        name="title"
                        value={draft.title}
                        required
                      />
                      <Field
                        label="Description"
                        name="description"
                        value={draft.description}
                        multiline
                        max={2000}
                      />
                      <Field
                        label="Language"
                        name="language"
                        value={draft.language}
                        required
                        max={12}
                      />
                      <Field
                        label="Tags (comma separated)"
                        name="tags"
                        value={draft.tags.join(', ')}
                        max={410}
                      />
                    </div>
                    <p className="my-3 text-xs text-muted-foreground">
                      {draft.code} · {draft.scope} · Revision {draft.revision} ·{' '}
                      {draft.status}. Scope and ownership are fixed after
                      creation. Audience metadata grants no access.
                    </p>
                    <button className={`${button} preview-primary`}>
                      Save course details
                    </button>
                  </fieldset>
                </form>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={!canEdit || busy}
                    onClick={() =>
                      void simulate(() => {
                        const next = { ...draft, revision: draft.revision + 1 };
                        setCourses(
                          courses.map((c) => (c.id === selected ? next : c)),
                        );
                        setReady('Not checked');
                        throw new Error(
                          `Revision conflict demonstration: another simulated edit advanced revision ${draft.revision} to ${next.revision}. Current form refreshed; retry explicitly.`,
                        );
                      })
                    }
                  >
                    Demo revision conflict
                  </button>
                  <button
                    className={`${button} preview-danger`}
                    disabled={!canEdit || busy}
                    onClick={() =>
                      void simulate(() => {
                        if (
                          !window.confirm(
                            `Archive draft "${draft.title}"? Editing and new submissions will be disabled. Published snapshots remain available.`,
                          )
                        )
                          return;
                        update((next) => {
                          next.status = 'archived';
                        });
                      })
                    }
                  >
                    Archive draft
                  </button>
                </div>
                {draft.status === 'archived' && (
                  <p className="mt-3 text-sm">
                    Archived fixture preserved. Editing and new
                    review/publication are unavailable.
                  </p>
                )}
              </Panel>
              <Panel title="Modules and lessons">
                <p className="mb-3 text-sm">
                  {draft.modules.length} modules -{' '}
                  {draft.modules.reduce(
                    (count, module) => count + module.lessons.length,
                    0,
                  )}{' '}
                  lessons - Use the arrow buttons to change sibling order.
                  Boundary controls are disabled.
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Safe text only. Maximum 20 modules, 20 lessons per module, 100
                  lessons overall and 256 KiB. Order is the displayed sibling
                  sequence.
                </p>
                <div className="space-y-4">
                  {draft.modules.map((m, index) => (
                    <article
                      key={m.id}
                      className="preview-inset"
                      data-testid="module-card"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold">
                          {index + 1}. {m.title}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            className={button}
                            aria-label={`Move module ${m.title} up`}
                            disabled={!canEdit || busy || index === 0}
                            onClick={() =>
                              void simulate(() =>
                                update((next) => {
                                  next.modules = move(next.modules, index, -1);
                                }),
                              )
                            }
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            className={button}
                            aria-label={`Move module ${m.title} down`}
                            disabled={
                              !canEdit ||
                              busy ||
                              index === draft.modules.length - 1
                            }
                            onClick={() =>
                              void simulate(() =>
                                update((next) => {
                                  next.modules = move(next.modules, index, 1);
                                }),
                              )
                            }
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            className={`${button} preview-danger`}
                            disabled={!canEdit || busy}
                            onClick={() =>
                              void simulate(() =>
                                update((next) => {
                                  next.modules.splice(index, 1);
                                }),
                              )
                            }
                          >
                            Remove module {index + 1}
                          </button>
                        </div>
                      </div>
                      <details className="mt-3">
                        <summary>Edit module details</summary>
                        <form
                          key={`${m.id}-${draft.revision}`}
                          aria-label={`Edit module ${m.title}`}
                          onSubmit={(e) =>
                            form(e, (data) =>
                              update((next) =>
                                Object.assign(
                                  next.modules[index]!,
                                  fields(data),
                                ),
                              ),
                            )
                          }
                        >
                          <fieldset disabled={!canEdit || busy}>
                            <Field
                              label="Module title"
                              name="title"
                              value={m.title}
                              required
                            />
                            <Field
                              label="Module description"
                              name="description"
                              value={m.description}
                              max={2000}
                              multiline
                            />
                            <button className={button}>Save module</button>
                          </fieldset>
                        </form>
                      </details>
                      <ol className="mt-4 space-y-3">
                        {m.lessons.map((l, li) => (
                          <li
                            className="preview-lesson"
                            key={l.id}
                            data-testid="lesson-card"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold">
                                  {li + 1}. {l.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {l.content.type === 'text'
                                    ? 'Plain text'
                                    : 'Structured text'}{' '}
                                  · Stable fixture ID {l.id.slice(0, 8)}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className={button}
                                  disabled={!canEdit || busy || li === 0}
                                  aria-label={`Move lesson ${l.title} up`}
                                  onClick={() =>
                                    void simulate(() =>
                                      update((next) => {
                                        next.modules[index]!.lessons = move(
                                          next.modules[index]!.lessons,
                                          li,
                                          -1,
                                        );
                                      }),
                                    )
                                  }
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  className={button}
                                  disabled={
                                    !canEdit ||
                                    busy ||
                                    li === m.lessons.length - 1
                                  }
                                  aria-label={`Move lesson ${l.title} down`}
                                  onClick={() =>
                                    void simulate(() =>
                                      update((next) => {
                                        next.modules[index]!.lessons = move(
                                          next.modules[index]!.lessons,
                                          li,
                                          1,
                                        );
                                      }),
                                    )
                                  }
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  className={button}
                                  disabled={!canEdit || busy}
                                  onClick={() => {
                                    setEditingLesson(l.id);
                                    setContentType(l.content.type);
                                  }}
                                >
                                  Edit lesson {li + 1}
                                </button>
                                <button
                                  className={`${button} preview-danger`}
                                  disabled={!canEdit || busy}
                                  onClick={() =>
                                    void simulate(() =>
                                      update((next) => {
                                        next.modules[index]!.lessons.splice(
                                          li,
                                          1,
                                        );
                                      }),
                                    )
                                  }
                                >
                                  Remove lesson {li + 1}
                                </button>
                              </div>
                            </div>
                            {editingLesson === l.id && lessonForm(m.id, l.id)}
                          </li>
                        ))}
                      </ol>
                      {m.lessons.length === 0 && (
                        <p className="my-4 text-sm">
                          No lessons yet. Add safe text before submitting this
                          module.
                        </p>
                      )}
                      <button
                        className={`${button} mt-3`}
                        disabled={!canEdit || busy || m.lessons.length >= 20}
                        onClick={() => {
                          setEditingLesson(`new-${m.id}`);
                          setContentType('text');
                        }}
                      >
                        Add lesson to {m.title}
                      </button>
                      {editingLesson === `new-${m.id}` && lessonForm(m.id)}
                    </article>
                  ))}
                </div>
                {draft.modules.length === 0 && (
                  <p className="mb-4 text-sm">
                    No modules yet. Start with a title and a simple learning
                    sequence.
                  </p>
                )}
                <form
                  aria-label="Add module"
                  className="preview-inset mt-4"
                  onSubmit={(e) =>
                    form(e, (data) =>
                      update((next) => {
                        next.modules.push({
                          id: uid(),
                          ...fields(data),
                          lessons: [],
                        });
                      }),
                    )
                  }
                >
                  <fieldset
                    disabled={!canEdit || busy || draft.modules.length >= 20}
                  >
                    <Field label="New module title" name="title" required />
                    <Field
                      label="New module description"
                      name="description"
                      multiline
                      max={2000}
                    />
                    <button className={button}>
                      <Plus size={15} aria-hidden="true" />
                      Add module
                    </button>
                  </fieldset>
                </form>
              </Panel>
            </div>
          )}
          {tab === 'review' && (
            <div
              id="panel-review"
              role="tabpanel"
              aria-labelledby="tab-review"
              tabIndex={0}
              className="grid gap-5 xl:grid-cols-[1.2fr_1fr]"
            >
              <Panel title="Review submission">
                <p className="mb-3 text-sm">
                  Exact fixture revision and SHA-256 digest. This is a visual
                  workflow; it does not record SME approval.
                </p>
                <label className="preview-field">
                  Synthetic required approvals
                  <select
                    value={required}
                    disabled={
                      perspective !== 'author' ||
                      busy ||
                      (!!review &&
                        review.revision === draft.revision &&
                        ['submitted', 'inReview', 'approved'].includes(
                          review.state,
                        ))
                    }
                    onChange={(e) => setRequired(Number(e.target.value))}
                  >
                    <option value={1}>1 · scenario setting</option>
                    <option value={2}>2 · scenario setting</option>
                  </select>
                </label>
                <p className="my-2 text-xs">
                  Applies to the next submission. An active submission keeps its
                  original slots. No corporate reviewer count is selected.
                </p>
                <button
                  className={`${button} preview-primary`}
                  disabled={
                    perspective !== 'author' ||
                    busy ||
                    draft.status === 'archived'
                  }
                  onClick={() =>
                    void simulate(async () => {
                      if (
                        !draft.modules.length ||
                        draft.modules.some((m) => !m.lessons.length)
                      )
                        throw new Error(
                          'Every draft must have a module and a lesson in each module.',
                        );
                      if (
                        reviews.some(
                          (r) =>
                            r.draftId === selected &&
                            r.revision === draft.revision,
                        )
                      )
                        throw new Error(
                          'This revision already has a submission. Edit the draft before resubmitting.',
                        );
                      const next: Review = {
                        id: uid(),
                        draftId: selected,
                        revision: draft.revision,
                        digest: await digest(draft),
                        snapshot: structuredClone(draft),
                        state: 'submitted',
                        required,
                        reviewers: [],
                        decisions: [],
                        timeline: [
                          `Synthetic author submitted revision ${draft.revision}`,
                        ],
                      };
                      setReviews([...reviews, next]);
                      setReady('Not checked');
                      success(
                        'Review submission created for the exact fixture revision.',
                      );
                    })
                  }
                >
                  Submit for review
                </button>
                {review ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <span
                        className={`preview-badge ${review.state === 'approved' || review.state === 'published' ? 'preview-status-success' : ''}`}
                      >
                        {review.state}
                      </span>
                      <p className="mt-3 text-sm font-semibold">
                        {
                          review.decisions.filter(
                            (d) => d.decision === 'approve',
                          ).length
                        }{' '}
                        / {review.required} synthetic approvals -{' '}
                        {review.reviewers.length} assigned
                      </p>
                      {review.revision !== draft.revision && (
                        <p className="preview-message preview-error mt-3">
                          Stale submission: the current draft has changed.
                          Previous evidence is preserved; submit the new
                          revision before publishing.
                        </p>
                      )}
                      <p className="mt-2 text-sm">
                        Submitted revision {review.revision} · Current revision{' '}
                        {draft.revision}
                      </p>
                      <code className="preview-digest">
                        Fixture SHA-256: {review.digest}
                      </code>
                      <button
                        className={button}
                        disabled={
                          busy ||
                          perspective !== 'author' ||
                          review.revision === draft.revision ||
                          ['published', 'superseded'].includes(review.state)
                        }
                        onClick={() =>
                          void simulate(() => {
                            replaceReview({
                              ...review,
                              state: 'superseded',
                              timeline: [
                                ...review.timeline,
                                'Synthetic author superseded stale submission; original evidence preserved',
                              ],
                            });
                            success(
                              'Stale submission superseded in fixture memory.',
                            );
                          })
                        }
                      >
                        Supersede stale submission
                      </button>
                    </div>
                    <h3 className="font-bold">Reviewer assignment</h3>
                    <p className="text-xs">
                      Simulated course.review.assign capability. Synthetic
                      reviewers only; the submitting author is never an eligible
                      reviewer.
                    </p>
                    {['Synthetic reviewer A', 'Synthetic reviewer B'].map(
                      (name) => (
                        <div
                          key={name}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2"
                        >
                          <span className="text-sm">
                            {name}
                            <small className="block mt-1 text-muted-foreground">
                              {review.decisions.find(
                                (decision) => decision.reviewer === name,
                              )?.decision ??
                                (review.reviewers.includes(name)
                                  ? 'Awaiting decision'
                                  : 'Not assigned')}
                            </small>
                          </span>
                          <button
                            className={button}
                            disabled={
                              busy ||
                              perspective !== 'author' ||
                              review.reviewers.includes(name) ||
                              review.reviewers.length >= review.required ||
                              !['submitted', 'inReview'].includes(review.state)
                            }
                            onClick={() =>
                              void simulate(async () => {
                                const r = await currentReview();
                                replaceReview({
                                  ...r,
                                  state: 'inReview',
                                  reviewers: [...r.reviewers, name],
                                  timeline: [
                                    ...r.timeline,
                                    `${name} assigned (synthetic qualification scenario)`,
                                  ],
                                });
                                success('Reviewer assignment simulated.');
                              })
                            }
                          >
                            {review.reviewers.includes(name)
                              ? 'Assigned'
                              : `Assign ${name.endsWith('A') ? 'reviewer A' : 'reviewer B'}`}
                          </button>
                        </div>
                      ),
                    )}
                    <h3 className="font-bold">Reviewer decision</h3>
                    <form
                      aria-label="Reviewer decision"
                      onSubmit={(e) =>
                        form(e, async (data) => {
                          const r = await currentReview();
                          if (
                            perspective !== 'reviewer' ||
                            !r.reviewers.includes(reviewer)
                          )
                            throw new Error(
                              'Only an assigned synthetic reviewer can decide in this scenario.',
                            );
                          if (
                            r.state !== 'inReview' ||
                            r.decisions.some((d) => d.reviewer === reviewer)
                          )
                            throw new Error(
                              'This reviewer cannot make another decision in the current state.',
                            );
                          const decision = String(
                            data.get('decision'),
                          ) as Review['decisions'][number]['decision'];
                          const category = String(
                            data.get('category'),
                          ) as FeedbackCategory;
                          const message = String(data.get('feedback') ?? '');
                          courseDescriptionSchema.parse(message);
                          if (!message.trim())
                            throw new Error('Feedback is required.');
                          if (
                            !feedbackCategories.some(
                              (item) => item.value === category,
                            )
                          )
                            throw new Error('Invalid feedback category.');
                          if (
                            ![
                              'approve',
                              'changesRequested',
                              'rejected',
                            ].includes(decision)
                          )
                            throw new Error('Invalid decision.');
                          const decisions = [
                            ...r.decisions,
                            {
                              reviewer,
                              decision,
                              feedback: [{ category, message }],
                            },
                          ];
                          const state: Review['state'] =
                            decision === 'changesRequested'
                              ? 'changesRequested'
                              : decision === 'rejected'
                                ? 'rejected'
                                : decisions.filter(
                                      (d) => d.decision === 'approve',
                                    ).length === r.required &&
                                    r.reviewers.length === r.required
                                  ? 'approved'
                                  : 'inReview';
                          replaceReview({
                            ...r,
                            decisions,
                            state,
                            timeline: [
                              ...r.timeline,
                              reviewer +
                                ': ' +
                                decision +
                                ' for exact fixture revision',
                            ],
                          });
                          success(
                            'Exact-revision decision recorded in fixture memory.',
                          );
                        })
                      }
                    >
                      <fieldset
                        disabled={
                          perspective !== 'reviewer' ||
                          busy ||
                          review.state !== 'inReview'
                        }
                      >
                        <label className="preview-field">
                          Decision
                          <select name="decision" aria-label="Decision">
                            <option value="approve">
                              Approve exact revision
                            </option>
                            <option value="changesRequested">
                              Request changes
                            </option>
                            <option value="rejected">Reject submission</option>
                          </select>
                        </label>
                        <label className="preview-field">
                          Feedback category
                          <select
                            name="category"
                            aria-label="Feedback category"
                            defaultValue="clarity"
                          >
                            {feedbackCategories.map((category) => (
                              <option
                                key={category.value}
                                value={category.value}
                              >
                                {category.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Field
                          label="Structured feedback message"
                          name="feedback"
                          multiline
                          required
                          max={2000}
                        />
                        <p className="mb-3 text-xs text-muted-foreground">
                          Records one structured feedback item with a category
                          and message, matching the Phase 2B evidence shape.
                        </p>
                        <button className={button}>
                          Record simulated decision
                        </button>
                      </fieldset>
                    </form>
                    <h3 className="font-bold">Approval evidence</h3>
                    {review.decisions.length ? (
                      review.decisions.map((d) => (
                        <div key={d.reviewer} className="preview-inset">
                          <strong className="text-sm">
                            {d.reviewer} · {d.decision}
                          </strong>
                          <div className="mt-2 space-y-2">
                            {d.feedback.map((item, index) => (
                              <div key={index}>
                                <span className="preview-badge">
                                  {categoryLabel(item.category)}
                                </span>
                                <p className="text-sm mt-1 whitespace-pre-wrap">
                                  {item.message}
                                </p>
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 text-xs">
                            Bound to revision {review.revision} and the fixture
                            digest above.
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No decisions recorded in this fixture.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No submission. Add lesson content and submit as the
                    synthetic author.
                  </p>
                )}
              </Panel>
              <div className="space-y-5">
                <Panel title="Publishing readiness">
                  <p className="mb-3 text-sm">
                    Requires an active draft, matching revision and digest,
                    completed assigned approvals and the synthetic publisher
                    perspective. These are fixture checks, not backend
                    validation.
                  </p>
                  <p className="preview-inset text-sm" data-testid="readiness">
                    {ready}
                  </p>
                  {checks.length > 0 && (
                    <ul
                      aria-label="Publishing readiness checks"
                      className="mt-3 space-y-2"
                    >
                      {checks.map((check) => (
                        <li
                          key={check.label}
                          data-testid="readiness-check"
                          className="flex items-start gap-2 rounded border border-border bg-white p-3 text-sm"
                        >
                          {check.ok ? (
                            <Check
                              size={16}
                              className="mt-0.5 shrink-0 text-emerald-700"
                              aria-hidden="true"
                            />
                          ) : (
                            <X
                              size={16}
                              className="mt-0.5 shrink-0 text-red-700"
                              aria-hidden="true"
                            />
                          )}
                          <span>
                            <strong>{check.label}</strong>
                            <small className="block text-xs text-muted-foreground">
                              {check.detail}
                            </small>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className={button}
                      disabled={busy || perspective !== 'publisher'}
                      onClick={() =>
                        void simulate(async () => {
                          await readiness();
                          success('Readiness checked in fixture memory.');
                        })
                      }
                    >
                      Check readiness
                    </button>
                    <button
                      className={`${button} preview-primary`}
                      disabled={busy || perspective !== 'publisher'}
                      onClick={() =>
                        void simulate(async () => {
                          const r = await readiness();
                          if (
                            !window.confirm(
                              `Publish release ${history.length + 1} of "${draft.title}" at revision ${draft.revision}? This creates an immutable simulated snapshot.`,
                            )
                          )
                            return;
                          const next: Release = {
                            id: uid(),
                            number: history.length + 1,
                            digest: r.digest,
                            snapshot: structuredClone(r.snapshot),
                            approvals: structuredClone(r.decisions),
                            reviewId: r.id,
                            reviewRevision: r.revision,
                            createdAt: new Date().toISOString(),
                          };
                          setReleases([...releases, next]);
                          replaceReview({
                            ...r,
                            state: 'published',
                            timeline: [
                              ...r.timeline,
                              `Synthetic publisher created simulated release ${next.number}`,
                            ],
                          });
                          success(
                            `Release ${next.number} snapshot created in memory.`,
                          );
                          setTab('releases');
                        })
                      }
                    >
                      Publish simulated release
                    </button>
                  </div>
                </Panel>
                <Panel title="Review timeline">
                  {review ? (
                    <ol className="space-y-3 text-sm">
                      {review.timeline.map((entry, i) => (
                        <li key={i} className="flex gap-2">
                          <ClipboardCheck
                            size={16}
                            className="shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          {entry}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      The first submission starts this timeline.
                    </p>
                  )}
                </Panel>
                <Panel title="Submission history">
                  {reviews
                    .filter((r) => r.draftId === selected)
                    .map((r) => (
                      <p
                        key={r.id}
                        className="border-b border-border py-2 text-sm"
                      >
                        Revision {r.revision} · {r.state} · {r.decisions.length}
                        /{r.required} decisions
                      </p>
                    ))}
                  {!review && (
                    <p className="text-sm">No review evidence in this tab.</p>
                  )}
                </Panel>
              </div>
            </div>
          )}
          {tab === 'releases' && (
            <div
              id="panel-releases"
              role="tabpanel"
              aria-labelledby="tab-releases"
              tabIndex={0}
            >
              <Panel title="Immutable fixture releases">
                <p className="mb-4 text-sm">
                  These are cloned UI snapshots, not backend release records.
                  Later draft edits leave the displayed snapshots unchanged.
                </p>
                {history.length ? (
                  history.map((r) => (
                    <article
                      className="preview-inset mb-4"
                      key={r.id}
                      data-testid="release-card"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <h3 className="font-bold">
                          Release {r.number} · {r.snapshot.title}
                        </h3>
                        <Link
                          className={button}
                          href={`/development/catalog/${encodeURIComponent(r.snapshot.id)}`}
                        >
                          View in Development Catalog
                        </Link>
                        <span className="preview-badge">
                          Simulated published
                        </span>
                      </div>
                      <p className="mt-2 text-sm">
                        Source revision {r.snapshot.revision} · Submitted
                        revision {r.reviewRevision} · {r.snapshot.scope}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.number ===
                        Math.max(...history.map((release) => release.number))
                          ? 'Latest release'
                          : 'Previous release'}{' '}
                        - Release ID {r.id.slice(0, 8)} · Created {r.createdAt}{' '}
                        · Immutable fixture snapshot
                      </p>
                      <code className="preview-digest">
                        Fixture SHA-256: {r.digest}
                      </code>
                      <div className="my-3 rounded border border-border bg-white p-3">
                        <h4 className="text-sm font-bold">Approval evidence</h4>
                        {r.approvals.map((approval) => (
                          <div
                            key={`${approval.reviewer}-${approval.decision}`}
                            className="mt-2 border-t border-border pt-2"
                          >
                            <strong className="text-sm">
                              {approval.reviewer} · {approval.decision}
                            </strong>
                            {approval.feedback.map((item, index) => (
                              <div key={index} className="mt-1">
                                <span className="preview-badge">
                                  {categoryLabel(item.category)}
                                </span>
                                <p className="mt-1 text-sm whitespace-pre-wrap">
                                  {item.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {r.snapshot.description}
                      </p>
                      {r.snapshot.modules.map((m, mi) => (
                        <div className="mt-4" key={m.id}>
                          <h4 className="font-semibold">
                            {mi + 1}. {m.title}
                          </h4>
                          {m.lessons.map((l, li) => (
                            <div
                              className="mt-2 rounded border border-border bg-white p-3"
                              key={l.id}
                            >
                              <h5 className="font-semibold text-sm">
                                {li + 1}. {l.title}
                              </h5>
                              <ContentView content={l.content} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </article>
                  ))
                ) : (
                  <div className="preview-inset">
                    <LockKeyhole aria-hidden="true" />
                    <p className="mt-2">
                      No releases yet. Complete a synthetic review and inspect
                      readiness as publisher.
                    </p>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
  function lessonForm(moduleId: string, lessonId?: string) {
    const m = draft.modules.find((m) => m.id === moduleId)!,
      lesson = m.lessons.find((l) => l.id === lessonId);
    return (
      <form
        key={`${editingLesson}-${draft.revision}`}
        aria-label={lesson ? 'Edit lesson content' : 'Add lesson'}
        className="mt-3 preview-inset"
        onSubmit={(e) =>
          form(e, (data) => {
            const info = fields(data);
            const raw = String(data.get('body'));
            const content = courseContentSchema.parse(
              contentType === 'text'
                ? { type: 'text', text: raw }
                : { type: 'structured', blocks: JSON.parse(raw) },
            );
            update((next) => {
              const parent = next.modules.find((m) => m.id === moduleId)!;
              if (lessonId)
                Object.assign(
                  parent.lessons.find((l) => l.id === lessonId)!,
                  { ...info, content },
                );
              else parent.lessons.push({ id: uid(), ...info, content });
            });
            setEditingLesson(null);
          })
        }
      >
        <fieldset disabled={!canEdit || busy}>
          <Field
            label="Lesson title"
            name="title"
            value={lesson?.title}
            required
          />
          <Field
            label="Lesson description"
            name="description"
            value={lesson?.description}
            multiline
            max={2000}
          />
          <label className="preview-field">
            Content format
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              <option value="text">Plain text</option>
              <option value="structured">
                Structured blocks (validated JSON)
              </option>
            </select>
          </label>
          <p className="my-2 text-xs">
            Text ≤8,000 characters. Structured: ≤20 paragraph/heading/list
            blocks, fragments ≤2,000 characters and list items ≤20. No HTML,
            scripts, embeds or uploads.
          </p>
          <textarea
            key={contentType}
            aria-label="Lesson content"
            name="body"
            rows={5}
            required
            maxLength={contentType === 'text' ? 8000 : 250000}
            defaultValue={
              contentType === 'text'
                ? lesson?.content.type === 'text'
                  ? lesson.content.text
                  : ''
                : lesson?.content.type === 'structured'
                  ? JSON.stringify(lesson.content.blocks, null, 2)
                  : '[{"type":"paragraph","text":"Synthetic learning content"}]'
            }
            className="w-full rounded border border-border p-3 font-mono text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button className={`${button} preview-primary`}>
              {lesson ? 'Save lesson' : 'Add lesson'}
            </button>
            <button
              type="button"
              className={button}
              onClick={() => setEditingLesson(null)}
            >
              Cancel lesson edit
            </button>
          </div>
        </fieldset>
      </form>
    );
  }
}
