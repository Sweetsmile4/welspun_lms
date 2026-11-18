'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError, type Account } from './api';
type CatalogItem = {
  courseId: string;
  title: string;
  description: string;
  code: string;
  lessonCount: number;
};
type Record = {
  courseId: string;
  title: string;
  percent: number;
  certificateId: string | null;
  lessonCount: number;
};
export function LiveDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [courses, setCourses] = useState<Record[]>([]);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState<CatalogItem[]>([]);
  useEffect(() => {
    void Promise.all([
      api<Account>('/auth/session'),
      api<Record[]>('/learning'),
      api<{ items: CatalogItem[] }>('/courses'),
    ])
      .then(([user, courses, catalog]) => {
        setUser(user);
        setCourses(courses);
        setAvailable(catalog.items);
      })
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401)
          router.replace('/login');
        else setError(error.message);
      });
  }, [router]);
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, {user?.name ?? 'learner'}
          </h1>
          <p className="mt-2 text-slate-600">
            Your enrollments, assessment results and progress are saved to your
            account.
          </p>
        </div>
        <div className="flex gap-4">
          <Link className="underline" href="/catalog">
            Browse courses
          </Link>
          <Link className="underline" href="/certificates">
            Certificates
          </Link>
          {user?.role === 'admin' && (
            <Link className="underline" href="/admin">
              Administration
            </Link>
          )}
          <button
            className="underline"
            onClick={async () => {
              await api('/auth/logout', {});
              router.push('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <section className="grid gap-5 md:grid-cols-2">
        {courses.map((course) => (
          <article
            key={course.courseId}
            className="rounded-xl border bg-white p-6"
          >
            <h2 className="text-xl font-semibold">{course.title}</h2>
            <p className="my-3">{course.percent}% complete</p>
            <progress className="w-full" max={100} value={course.percent} />
            <Link
              className="mt-4 block font-semibold text-blue-900 underline"
              href={`/catalog/${course.courseId}?release=1`}
            >
              Continue learning
            </Link>
            {course.certificateId && (
              <p className="mt-2 text-green-800">Certificate earned</p>
            )}
          </article>
        ))}
      </section>
      <section className="space-y-5">
        <h2 className="text-xl font-bold">Available training</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {available
            .filter(
              (course) =>
                !courses.some((record) => record.courseId === course.courseId),
            )
            .map((course) => (
              <article
                key={course.courseId}
                className="flex flex-col rounded-2xl border bg-white p-6 shadow-sm"
              >
                <p className="text-xs font-semibold text-slate-500">
                  {course.code} · {course.lessonCount} lessons
                </p>
                <h3 className="mt-4 text-xl font-bold text-slate-900">
                  {course.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                  {course.description}
                </p>
                <button
                  className="mt-5 self-start rounded bg-blue-950 px-4 py-2 font-semibold text-white"
                  onClick={async () => {
                    try {
                      await api(`/learning/${course.courseId}/enroll`, {});
                      router.push(`/catalog/${course.courseId}?release=1`);
                    } catch (error) {
                      setError(
                        error instanceof Error
                          ? error.message
                          : 'Could not enroll',
                      );
                    }
                  }}
                >
                  Start course
                </button>
              </article>
            ))}
        </div>
      </section>
      {user && courses.length === 0 && (
        <p>No enrollments yet. Open the course catalog to begin.</p>
      )}
    </div>
  );
}
