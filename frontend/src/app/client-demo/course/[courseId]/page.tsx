'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useDemo } from '@/components/client-demo/demo-context';
import { SceneViewer } from '@/components/client-demo/scene-viewer';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function CourseViewerPage() {
  const params = useParams();
  const courseId = params?.courseId as string;
  const { courses, getCourseProgress } = useDemo();

  const course = courses.find((c) => c.id === courseId);

  if (!course) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800">
          <AlertCircle className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          Course Not Found in Demonstration Catalog
        </h1>
        <p className="mt-2 text-xs text-slate-600">
          The requested course ID &ldquo;{courseId}&rdquo; does not exist in the
          client demonstration set.
        </p>
        <div className="mt-6">
          <Link href="/client-demo/dashboard">
            <Button className="bg-[#152d50] text-white hover:bg-[#203d68] text-xs">
              <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const progress = getCourseProgress(course.id);
  const currentSceneIndex = Math.min(
    Math.max(0, progress.currentSceneIndex),
    course.scenes.length - 1,
  );
  const currentScene = course.scenes[currentSceneIndex] ?? course.scenes[0];

  if (!currentScene) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-xs text-slate-600">
          No scenes found in this course.
        </p>
        <Link href="/client-demo/dashboard" className="mt-4 inline-block">
          <Button className="text-xs">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2">
      <SceneViewer
        course={course}
        scene={currentScene}
        currentSceneIndex={currentSceneIndex}
      />
    </div>
  );
}
