'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  IntegrationRequestError,
  listCatalog,
  type CatalogEntry,
} from '@/lib/integration/api-client';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; items: CatalogEntry[]; nextCursor: string | null }
  | { kind: 'error'; error: IntegrationRequestError };

export function CatalogView() {
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    void loadCatalog('', setState);
  }, []);

  return (
    <div className="space-y-8">
      <Link href="/login" className="text-sm underline">
        Sign in to your learning account
      </Link>
      <header className="max-w-3xl">
        <p className="mb-3 text-xs font-bold tracking-[.2em] text-muted-foreground">
          LEARNER WORKSPACE
        </p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Course catalog
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Discover the latest published courses available to your account. Each
          result is pinned to its immutable release version.
        </p>
      </header>

      <form
        className="flex max-w-3xl flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmittedSearch(search);
          void loadCatalog(search, setState);
        }}
        role="search"
      >
        <label className="sr-only" htmlFor="catalog-search">
          Search published courses
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground"
            size={18}
            aria-hidden="true"
          />
          <input
            id="catalog-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by course title or code"
            className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 outline-none focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>
        <Button type="submit">
          <Search size={16} aria-hidden="true" />
          Search
        </Button>
      </form>

      {state.kind === 'loading' && <CatalogLoading />}
      {state.kind === 'error' && (
        <Card
          className="border-red-200 bg-red-50 p-6 text-red-950"
          role="alert"
        >
          <div className="flex gap-3">
            <AlertCircle
              className="mt-0.5 shrink-0"
              size={20}
              aria-hidden="true"
            />
            <div>
              <h2 className="font-semibold">{state.error.message}</h2>
              <p className="mt-1 text-sm">
                The catalog has not been replaced with local fixture data.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => void loadCatalog(submittedSearch, setState)}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}
      {state.kind === 'ready' &&
        (state.items.length === 0 ? (
          <Card className="p-10 text-center">
            <BookOpen
              className="mx-auto text-muted-foreground"
              size={28}
              aria-hidden="true"
            />
            <h2 className="mt-4 text-lg font-semibold">
              No published courses found
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different search or check back after a course is published
              for your scope.
            </p>
          </Card>
        ) : (
          <section aria-labelledby="catalog-results-heading">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2
                id="catalog-results-heading"
                className="text-lg font-semibold"
              >
                Published courses
              </h2>
              <span className="text-sm text-muted-foreground">
                {state.items.length} shown
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {state.items.map((course) => (
                <Card
                  key={`${course.courseId}-${course.releaseNumber}`}
                  className="flex flex-col p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded bg-muted px-2 py-1 text-xs font-bold tracking-wide text-muted-foreground">
                      {course.code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Release {course.releaseNumber}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{course.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {course.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{course.moduleCount} modules</span>
                    <span aria-hidden="true">·</span>
                    <span>{course.lessonCount} lessons</span>
                  </div>
                  <Button asChild variant="outline" className="mt-6 self-start">
                    <Link
                      href={`/catalog/${course.courseId}?release=${course.releaseNumber}`}
                    >
                      View course <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </Button>
                </Card>
              ))}
            </div>
            {state.nextCursor && (
              <p className="mt-5 text-sm text-muted-foreground">
                More results are available. Pagination will continue from the
                server cursor.
              </p>
            )}
          </section>
        ))}
    </div>
  );
}

function CatalogLoading() {
  return (
    <div
      className="grid gap-4 md:grid-cols-2"
      aria-label="Loading course catalog"
      aria-busy="true"
    >
      {[1, 2, 3, 4].map((item) => (
        <Card key={item} className="h-64 animate-pulse bg-slate-100" />
      ))}
    </div>
  );
}

async function loadCatalog(value: string, setState: (state: State) => void) {
  setState({ kind: 'loading' });
  try {
    const result = await listCatalog({ search: value, limit: 20 });
    setState({
      kind: 'ready',
      items: result.data.items,
      nextCursor: result.data.nextCursor,
    });
  } catch (error) {
    setState({
      kind: 'error',
      error:
        error instanceof IntegrationRequestError
          ? error
          : new IntegrationRequestError(
              503,
              'INTEGRATION_UNAVAILABLE',
              'The catalog could not be loaded.',
            ),
    });
  }
}
