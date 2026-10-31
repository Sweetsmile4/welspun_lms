'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useDemo } from '@/components/client-demo/demo-context';
import { CourseCard } from '@/components/client-demo/course-card';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  BookOpen,
  Award,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const completedCourseId = searchParams.get('completed');

  const { user, courses, overallStats } = useDemo();

  const completedCourse = courses.find((c) => c.id === completedCourseId);
  const filteredCourses = courses;

  return (
    <div className="space-y-8">
      {/* Course Completion Toast/Celebration */}
      {completedCourse && (
        <div
          role="status"
          className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 text-emerald-950 shadow-md animate-in slide-in-from-top duration-300"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <Award className="size-7" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                  Course Completed Successfully!
                </span>
                <h2 className="text-lg font-black text-emerald-950">
                  Congratulations, {user?.fullName}!
                </h2>
                <p className="text-xs text-emerald-800">
                  You have completed all interactive scenes for &ldquo;
                  {completedCourse.title}&rdquo;. Your progress is saved locally
                  in this demonstration session.
                </p>
              </div>
            </div>
            <Link href="/client-demo/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100"
              >
                Dismiss Notice
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <section
        aria-labelledby="welcome-heading"
        className="overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-br from-[#0a2540] via-[#102a43] to-[#152d50] p-6 sm:p-8 text-white shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-black text-[#0a2540] uppercase tracking-wider">
                Active Employee Assignment
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Mandatory Technical Qualification Curriculum
              </span>
            </div>
            <h1
              id="welcome-heading"
              className="text-2xl font-black tracking-tight sm:text-3xl"
            >
              Welcome back, {user?.fullName}
            </h1>
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              {user?.jobTitle} · {user?.department} ({user?.plantLocation})
            </p>

            {/* Quick stats pills */}
            <div className="flex flex-wrap gap-3 pt-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-slate-200">
                <BookOpen
                  className="size-3.5 text-amber-300"
                  aria-hidden="true"
                />
                <span>
                  <strong>{overallStats.completedCourses}</strong> of{' '}
                  <strong>{overallStats.totalCourses}</strong> Courses Complete
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-slate-200">
                <Layers
                  className="size-3.5 text-amber-300"
                  aria-hidden="true"
                />
                <span>
                  <strong>{overallStats.completedScenes}</strong> /{' '}
                  <strong>{overallStats.totalScenes}</strong> Scenes Mastered
                </span>
              </div>
            </div>
          </div>

          {/* Quick Continue Action on the Hero */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-xs min-w-[240px]">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Overall Curriculum Progress
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-black text-amber-300">
                {overallStats.percentComplete}%
              </span>
              <span className="text-xs text-slate-400">
                {overallStats.completedScenes} of {overallStats.totalScenes}{' '}
                scenes
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
                style={{ width: `${overallStats.percentComplete}%` }}
              />
            </div>
            <Link
              href="/client-demo/course/pipe-process-101"
              className="mt-4 block"
            >
              <Button className="w-full bg-amber-400 text-[#0a2540] hover:bg-amber-300 font-bold text-xs h-9">
                <span>Continue Core Course</span>
                <ArrowRight className="ml-1.5 size-3.5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Assigned Courses Section */}
      <section aria-labelledby="courses-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="courses-heading"
              className="text-lg font-black text-slate-900 tracking-tight sm:text-xl"
            >
              Assigned Training Modules
            </h2>
            <p className="text-xs text-slate-500">
              Complete all three interactive courses to fulfill your
              demonstration curriculum.
            </p>
          </div>

          {/* Demonstration Notice Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            <Sparkles className="size-3.5 text-amber-500" aria-hidden="true" />
            <span>
              Interactive Multi-Perspective Content (ELI5 / Operator / Engineer)
            </span>
          </div>
        </div>

        {/* 3 Course Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      {/* Industrial Learning Experience Highlights */}
      <section
        aria-labelledby="highlights-heading"
        className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs"
      >
        <h2
          id="highlights-heading"
          className="text-base font-extrabold text-slate-900"
        >
          Key Features in this Client Demonstration
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="grid size-8 place-items-center rounded-lg bg-blue-100 text-[#203d68]">
              <Sparkles className="size-4" aria-hidden="true" />
            </div>
            <h3 className="mt-2.5 font-bold text-slate-900">
              Multi-Perspective Explanations
            </h3>
            <p className="mt-1 leading-relaxed text-slate-600">
              Switch freely between ELI5 (everyday analogies), Operator
              (practical machine cues), and Engineer (technical formulas and API
              5L parameters).
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-800">
              <Layers className="size-4" aria-hidden="true" />
            </div>
            <h3 className="mt-2.5 font-bold text-slate-900">
              Interactive Educational Simulators
            </h3>
            <p className="mt-1 leading-relaxed text-slate-600">
              Explore dynamic mathematical tools such as the Helical Forming
              Angle calculator with dynamic SVG pipe geometry visualizer.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="grid size-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </div>
            <h3 className="mt-2.5 font-bold text-slate-900">
              Shop Floor Decision Scenarios
            </h3>
            <p className="mt-1 leading-relaxed text-slate-600">
              Answer real manufacturing dilemma questions with immediate
              feedback, standard code references, and practical takeaways.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ClientDemoDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Loading demo dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
