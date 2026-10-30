'use client';
import Link from 'next/link';
import { ContentView } from './content-view';
import { useState } from 'react';
import { BookOpen, ArrowLeft, RotateCcw } from 'lucide-react';
import { usePreviewState } from './provider';
import type { Release } from './model';
const button = 'preview-button';
function latest(releases: Release[]) {
  const map = new Map<string, Release>();
  for (const r of releases)
    if (!map.has(r.snapshot.id) || map.get(r.snapshot.id)!.number < r.number)
      map.set(r.snapshot.id, r);
  return [...map.values()].sort((a, b) =>
    a.snapshot.title.localeCompare(b.snapshot.title),
  );
}
function visible(r: Release, scenario: string) {
  return (
    scenario === 'organization' ||
    (scenario === 'plant-a' &&
      r.snapshot.scope.startsWith('Synthetic Plant A')) ||
    (scenario === 'department-a' &&
      r.snapshot.scope === 'Synthetic Plant A / Department A')
  );
}
export function PreviewCatalog({ courseId }: { courseId?: string }) {
  const { releases, visibility, setVisibility, reset, busy } =
    usePreviewState();
  const [search, setSearch] = useState(''),
    [scope, setScope] = useState('all');
  const eligible = latest(releases).filter((r) => visible(r, visibility));
  const items = eligible.filter(
    (r) =>
      (scope === 'all' || r.snapshot.scope === scope) &&
      `${r.snapshot.title} ${r.snapshot.code}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const detail = courseId && eligible.find((r) => r.snapshot.id === courseId);
  return (
    <div className="preview-workspace">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="preview-eyebrow">
            DEVELOPMENT / PUBLISHED COURSE DISCOVERY
          </p>
          <h1 className="text-3xl font-bold">
            {courseId
              ? 'Published course details'
              : 'Development Course Catalog'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Latest visible release snapshots · no learner enrollment or progress
          </p>
        </div>
        <button className={button} onClick={reset} disabled={busy}>
          <RotateCcw size={15} aria-hidden="true" />
          Reset fixtures
        </button>
      </div>
      <div className="preview-disclosure">
        <div>
          <strong>Simulated catalog · shared tab-memory fixtures only</strong>
          <p>
            Entries come directly from the course workspace’s published release
            snapshots. No backend calls, authentication or corporate eligibility
            checks. In-app development navigation preserves fixtures; reload or
            leaving this workspace resets them.
          </p>
        </div>
      </div>
      <div className="preview-panel">
        <label className="preview-field">
          Synthetic learner visibility
          <select
            aria-label="Synthetic learner visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="organization">
              Explicit organization-wide scenario
            </option>
            <option value="plant-a">Synthetic Plant A only</option>
            <option value="department-a">Synthetic Department A only</option>
            <option value="none">No catalog access scenario</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          Visual scenarios only. Real learner eligibility and cross-plant policy
          require approval.
        </p>
      </div>
      {courseId ? (
        <>
          <Link className={button} href="/development/catalog">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to Development Catalog
          </Link>
          {detail ? (
            <article className="preview-panel" data-testid="catalog-detail">
              <span className="preview-badge">
                Simulated published · Release {detail.number}
              </span>
              <h2 className="mt-3 text-2xl font-bold">
                {detail.snapshot.title}
              </h2>
              <p className="mt-2 text-sm">
                {detail.snapshot.code} · {detail.snapshot.scope}
              </p>
              <p className="my-4 whitespace-pre-wrap">
                {detail.snapshot.description}
              </p>
              <p className="text-sm text-muted-foreground">
                Immutable fixture release {detail.id} · Published{' '}
                {detail.createdAt} · Source revision {detail.snapshot.revision}
              </p>
              <code className="preview-digest">
                Fixture SHA-256: {detail.digest}
              </code>
              <h3 className="mt-5 font-bold">
                Published module and lesson outline
              </h3>
              {detail.snapshot.modules.map((m, i) => (
                <section className="preview-inset mt-3" key={m.id}>
                  <h4 className="font-bold">
                    {i + 1}. {m.title}
                  </h4>
                  <p className="text-sm">{m.description}</p>
                  {m.lessons.map((l, j) => (
                    <div className="preview-lesson mt-3" key={l.id}>
                      <h5 className="font-semibold">
                        {j + 1}. {l.title}
                      </h5>
                      <p className="text-sm mb-2">{l.description}</p>
                      <ContentView content={l.content} />
                    </div>
                  ))}
                </section>
              ))}
            </article>
          ) : (
            <div className="preview-panel">
              <h2>Published course unavailable in this fixture scenario</h2>
              <p>
                There is no visible published snapshot for this ID. A reset or
                full reload also clears synthetic releases.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="preview-panel preview-form-grid">
            <label className="preview-field">
              Search title or code
              <input
                aria-label="Search title or code"
                value={search}
                maxLength={100}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="preview-field">
              Filter course scope
              <select
                aria-label="Filter course scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                <option value="all">All visible scopes</option>
                {[
                  'Synthetic organization',
                  'Synthetic Plant A',
                  'Synthetic Plant A / Department A',
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            {items.length} visible simulated course(s)
          </p>
          {items.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((r) => (
                <article
                  className="preview-panel flex flex-col items-start"
                  data-testid="catalog-card"
                  key={r.snapshot.id}
                >
                  <BookOpen className="mb-3 text-primary" aria-hidden="true" />
                  <span className="preview-badge">
                    Simulated published · Release {r.number}
                  </span>
                  <h2 className="mt-3 font-bold">{r.snapshot.title}</h2>
                  <p className="my-3 text-sm whitespace-pre-wrap">
                    {r.snapshot.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.snapshot.code} · {r.snapshot.scope}
                  </p>
                  <p className="my-3 text-sm">
                    {r.snapshot.modules.length} modules ·{' '}
                    {r.snapshot.modules.reduce(
                      (n, m) => n + m.lessons.length,
                      0,
                    )}{' '}
                    lessons
                  </p>
                  <Link
                    className={`${button} preview-primary mt-auto`}
                    href={`/development/catalog/${encodeURIComponent(r.snapshot.id)}`}
                  >
                    Open published course
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="preview-panel">
              <h2 className="font-bold">No visible published courses</h2>
              <p className="mt-2 text-sm">
                Drafts and review approvals are not catalog entries. Publish a
                complete course in the development workspace, or adjust your
                search and synthetic visibility scenario.
              </p>
              <Link className={`${button} mt-4`} href="/development/courses">
                Open course workspace
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
