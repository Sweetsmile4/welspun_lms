'use client';

import React from 'react';
import Link from 'next/link';
import type { CourseData } from '@/lib/client-demo/types';
import { useDemo } from './demo-context';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Layers,
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  Flame,
  HardHat,
  SearchCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: CourseData;
}

export function CourseCard({ course }: CourseCardProps) {
  const { getCourseProgress } = useDemo();
  const progress = getCourseProgress(course.id);

  const totalScenes = course.scenes.length;
  const completedCount = progress.completedSceneIds.length;
  const percent = Math.min(
    100,
    Math.round((completedCount / totalScenes) * 100),
  );
  const isCompleted = progress.status === 'completed' || percent === 100;
  const isInProgress = progress.status === 'in_progress' && !isCompleted;

  // Visual icon for thumbnail
  const renderThumbnailIcon = () => {
    switch (course.thumbnailType) {
      case 'pipe_process':
        return <Flame className="size-8 text-amber-400" aria-hidden="true" />;
      case 'safety_gear':
        return <HardHat className="size-8 text-amber-400" aria-hidden="true" />;
      case 'quality_stamp':
        return (
          <SearchCheck className="size-8 text-amber-400" aria-hidden="true" />
        );
      default:
        return <Layers className="size-8 text-amber-400" aria-hidden="true" />;
    }
  };

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xs transition-all hover:shadow-md hover:border-slate-400">
      <div>
        {/* Card Header & Thumbnail Banner */}
        <div className="relative flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#0a2540] to-[#152d50] p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-white/10 backdrop-blur-xs border border-white/20">
              {renderThumbnailIcon()}
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-widest text-amber-300 uppercase">
                {course.category}
              </span>
              <p className="font-mono text-xs text-slate-300">{course.code}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Completed
              </span>
            ) : isInProgress ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                <PlayCircle className="size-3.5" aria-hidden="true" />
                In Progress ({percent}%)
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-700/60 px-2.5 py-1 text-xs font-semibold text-slate-300 border border-slate-600">
                Not Started
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5">
          <h3 className="text-base font-extrabold text-slate-900 leading-snug">
            {course.title}
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-600 line-clamp-1">
            {course.subtitle}
          </p>
          <p className="mt-2.5 text-xs text-slate-600 leading-relaxed line-clamp-3">
            {course.description}
          </p>

          {/* Meta specs */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-slate-400" aria-hidden="true" />
              <span>{totalScenes} Interactive Scenes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
              <span>~{course.estimatedMinutes} mins</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Scene Progress</span>
              <span className="font-mono font-semibold">
                {completedCount} / {totalScenes} completed
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  isCompleted
                    ? 'bg-emerald-500'
                    : isInProgress
                      ? 'bg-amber-500'
                      : 'bg-slate-300',
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="border-t border-slate-200 bg-slate-50/80 p-4">
        <Link
          href={`/client-demo/course/${course.id}`}
          className="block w-full focus-visible:outline-2 focus-visible:outline-[#203d68] rounded-xl"
        >
          <Button
            className={cn(
              'w-full text-xs font-bold shadow-xs transition-all h-9',
              isCompleted
                ? 'bg-slate-800 text-white hover:bg-slate-900'
                : isInProgress
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-[#152d50] text-white hover:bg-[#203d68]',
            )}
          >
            {isCompleted ? (
              <>
                <RotateCcw className="mr-1.5 size-3.5" aria-hidden="true" />
                Review Course
              </>
            ) : isInProgress ? (
              <>
                <PlayCircle className="mr-1.5 size-3.5" aria-hidden="true" />
                Continue Learning (Scene {progress.currentSceneIndex + 1})
              </>
            ) : (
              <>
                <PlayCircle className="mr-1.5 size-3.5" aria-hidden="true" />
                Start Course
              </>
            )}
          </Button>
        </Link>
      </div>
    </div>
  );
}
