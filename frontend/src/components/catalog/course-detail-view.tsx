'use client';

import Link from 'next/link';
import { LessonSimulation } from '@/components/live-lms/lesson-simulation';
import { LessonProgress } from '@/components/live-lms/lesson-progress';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CircleCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getCatalogDetail,
  IntegrationRequestError,
  type CatalogDetail,
} from '@/lib/integration/api-client';

export function CourseDetailView({
  courseId,
  releaseNumber,
}: {
  courseId: string;
  releaseNumber?: number;
}) {
  const [course, setCourse] = useState<CatalogDetail | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [error, setError] = useState<IntegrationRequestError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadCourse(
      courseId,
      releaseNumber,
      setCourse,
      setSelectedLesson,
      setError,
      setLoading,
    );
  }, [courseId, releaseNumber]);

  if (loading)
    return (
      <Card
        className="h-96 animate-pulse bg-slate-100"
        aria-label="Loading course"
        aria-busy="true"
      />
    );
  if (error || !course)
    return (
      <ErrorState
        error={error}
        retry={() =>
          void loadCourse(
            courseId,
            releaseNumber,
            setCourse,
            setSelectedLesson,
            setError,
            setLoading,
          )
        }
      />
    );
  const lesson =
    course.modules
      .flatMap((module) => module.lessons)
      .find((item) => item.id === selectedLesson) ??
    course.modules[0]?.lessons[0];

  return (
    <div className="space-y-7">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to catalog
      </Link>
      <header className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wide text-muted-foreground">
          <span>{course.code}</span>
          <span aria-hidden="true">·</span>
          <span>Published release {course.releaseNumber}</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          {course.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {course.description}
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.5fr)]">
        <Card className="h-fit p-4">
          <h2 className="px-2 pb-3 text-sm font-semibold">Course outline</h2>
          <div className="space-y-4">
            {course.modules.map((module) => (
              <section key={module.id} aria-labelledby={`module-${module.id}`}>
                <h3
                  id={`module-${module.id}`}
                  className="px-2 text-xs font-bold uppercase tracking-wide text-muted-foreground"
                >
                  {module.title}
                </h3>
                <div className="mt-2 space-y-1">
                  {module.lessons.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedLesson(item.id)}
                      className={`flex w-full items-start gap-2 rounded-lg px-2 py-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-primary ${item.id === lesson?.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      <BookOpen
                        className="mt-0.5 shrink-0"
                        size={15}
                        aria-hidden="true"
                      />
                      {item.title}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          {lesson ? (
            <Card className="p-6 md:p-8">
              <p className="text-xs font-bold tracking-[.2em] text-muted-foreground">
                LESSON {lesson.position + 1}
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{lesson.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {lesson.description}
              </p>
              <LessonContent content={lesson.content} />
              <LessonSimulation
                lesson={
                  lesson as typeof lesson & {
                    referenceRoute?: string;
                    diagramType?: string;
                    hasInteractiveVisualizer?: boolean;
                  }
                }
              />
              <LessonProgress
                courseId={courseId}
                lessonId={lesson.id}
                quiz={
                  (
                    lesson as typeof lesson & {
                      quiz?: {
                        question: string;
                        options: { id: string; text: string }[];
                      };
                    }
                  ).quiz
                }
              />
            </Card>
          ) : (
            <Card className="p-8">
              <p className="text-muted-foreground">
                This published course has no lessons.
              </p>
            </Card>
          )}
          <Card className="border-amber-200 bg-amber-50 p-5 text-amber-950">
            <div className="flex gap-3">
              <CircleCheck
                className="mt-0.5 shrink-0"
                size={20}
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold">
                  Progress tracking is not available yet
                </h2>
                <p className="mt-1 text-sm leading-6">
                  This view is backed by the published catalog contract.
                  Enrollment, server-confirmed lesson evidence, assessments, and
                  completion records require the learning API contract and are
                  intentionally not simulated.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function loadCourse(
  courseId: string,
  releaseNumber: number | undefined,
  setCourse: (course: CatalogDetail | null) => void,
  setSelectedLesson: (lessonId: string | null) => void,
  setError: (error: IntegrationRequestError | null) => void,
  setLoading: (loading: boolean) => void,
) {
  if (!releaseNumber) {
    setError(
      new IntegrationRequestError(
        400,
        'VALIDATION_ERROR',
        'A published release number is required to open this course.',
      ),
    );
    setLoading(false);
    return;
  }
  setLoading(true);
  try {
    const result = await getCatalogDetail(courseId, releaseNumber);
    setCourse(result.data);
    setSelectedLesson(result.data.modules[0]?.lessons[0]?.id ?? null);
    setError(null);
  } catch (requestError) {
    setError(
      requestError instanceof IntegrationRequestError
        ? requestError
        : new IntegrationRequestError(
            503,
            'INTEGRATION_UNAVAILABLE',
            'The course could not be loaded.',
          ),
    );
  } finally {
    setLoading(false);
  }
}

function LessonContent({
  content,
}: {
  content: CatalogDetail['modules'][number]['lessons'][number]['content'];
}) {
  if (content.type === 'text')
    return (
      <div className="mt-8 whitespace-pre-wrap text-base leading-8">
        {content.text}
      </div>
    );
  return (
    <div className="mt-8 space-y-5">
      {content.blocks.map((block, index) =>
        block.type === 'heading' ? (
          <h3 key={index} className="text-xl font-semibold">
            {block.text}
          </h3>
        ) : block.type === 'list' ? (
          <ul key={index} className="list-disc space-y-2 pl-6 leading-7">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={index} className="leading-8">
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}

function ErrorState({
  error,
  retry,
}: {
  error: IntegrationRequestError | null;
  retry: () => void;
}) {
  return (
    <Card className="border-red-200 bg-red-50 p-6 text-red-950" role="alert">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
        <div>
          <h1 className="font-semibold">
            {error?.message ?? 'Course unavailable'}
          </h1>
          <p className="mt-1 text-sm">
            The published response could not be displayed.
          </p>
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={retry}>
              <RefreshCw size={16} aria-hidden="true" />
              Retry
            </Button>
            <Button asChild variant="outline">
              <Link href="/catalog">Back to catalog</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
