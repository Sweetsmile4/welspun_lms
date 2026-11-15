'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CourseData, CourseScene } from '@/lib/client-demo/types';
import { useDemo } from './demo-context';
import { SceneDiagram } from './scene-diagrams';
import { HelicalFormingVisualizer } from './helical-visualizer';
import { SafetySimulation } from './safety-simulation';
import { QualityInspectionSimulation } from './quality-simulation';
import { ScenarioQuizComponent } from './scenario-quiz';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Wrench,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Check,
  Award,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SceneViewerProps {
  course: CourseData;
  scene: CourseScene;
  currentSceneIndex: number;
}

export function SceneViewer({
  course,
  scene,
  currentSceneIndex,
}: SceneViewerProps) {
  const router = useRouter();
  const {
    explanationMode,
    setExplanationMode,
    getCourseProgress,
    markSceneCompleted,
    setCurrentSceneIndex,
    recordQuestionAnswer,
    markCourseCompleted,
  } = useDemo();

  const progress = getCourseProgress(course.id);
  const totalScenes = course.scenes.length;
  const isFirstScene = currentSceneIndex === 0;
  const isLastScene = currentSceneIndex === totalScenes - 1;
  const savedAnswer = progress.answeredQuestions[scene.id];

  const handleNext = () => {
    markSceneCompleted(course.id, scene.id);
    if (!isLastScene) {
      setCurrentSceneIndex(course.id, currentSceneIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      markCourseCompleted(course.id);
      router.push('/client-demo/dashboard?completed=' + course.id);
    }
  };

  const handlePrev = () => {
    if (!isFirstScene) {
      setCurrentSceneIndex(course.id, currentSceneIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleJumpToScene = (index: number) => {
    setCurrentSceneIndex(course.id, index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnswer = (optionId: string) => {
    recordQuestionAnswer(course.id, scene.id, optionId);
    markSceneCompleted(course.id, scene.id);
  };

  return (
    <article className="space-y-6">
      {/* Top Breadcrumb & Return to Dashboard Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <Link
          href="/client-demo/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#203d68] hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Employee Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {course.code}
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
            Scene {scene.number} of {totalScenes}
          </span>
        </div>
      </div>

      {/* Course Title & Scene Progress Navigator */}
      <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              {course.title}
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              Scene {scene.number}: {scene.title}
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-600">
              {scene.subtitle}
            </p>
          </div>

          {/* Quick Scene Jump Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {course.scenes.map((s, idx) => {
              const isCurrent = idx === currentSceneIndex;
              const isDone = progress.completedSceneIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleJumpToScene(idx)}
                  title={`Jump to Scene ${s.number}: ${s.title}`}
                  aria-label={`Jump to Scene ${s.number}: ${s.title}`}
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-[#203d68]',
                    isCurrent
                      ? 'border-2 border-[#203d68] bg-[#152d50] text-white shadow-xs'
                      : isDone
                        ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {isDone && !isCurrent ? (
                    <Check className="size-3.5 stroke-[3]" aria-hidden="true" />
                  ) : (
                    s.number
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Course Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-amber-500 transition-all duration-300"
              style={{
                width: `${((currentSceneIndex + 1) / totalScenes) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-slate-600">
            {Math.round(((currentSceneIndex + 1) / totalScenes) * 100)}%
          </span>
        </div>
      </div>

      {/* Real-World Manufacturing Situation / Story */}
      <section
        aria-labelledby="situation-heading"
        className="rounded-2xl border border-blue-200 bg-[#f0f6fc] p-5"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#203d68] text-white">
            <Layers className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="situation-heading"
              className="text-xs font-bold tracking-wider text-[#152d50] uppercase"
            >
              Shop Floor Manufacturing Situation
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">
              {scene.story}
            </p>
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
        <p className="font-bold">Illustrative learning content</p>
        <p className="mt-1 leading-relaxed">
          This scene demonstrates the learning flow only. It is not an approved
          Welspun SOP, work instruction, engineering setting, compliance record,
          or production decision. Always follow the current controlled
          procedures and qualified site guidance.
        </p>
      </div>

      {/* Technical Schematic Diagram */}
      <section
        aria-label="Technical manufacturing schematic"
        className="rounded-2xl border border-slate-300 bg-slate-900 p-4 shadow-xs"
      >
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">
            Technical Process Schematic
          </span>
          <span className="text-[11px] text-amber-300">
            Illustrative Manufacturing Model
          </span>
        </div>
        <SceneDiagram type={scene.diagramType} title={scene.title} />
      </section>

      {/* Interactive educational simulations */}
      {scene.hasInteractiveVisualizer && <HelicalFormingVisualizer />}
      {scene.diagramType === 'hazard_loads' && <SafetySimulation />}
      {scene.diagramType === 'defect_types' && <QualityInspectionSimulation />}

      {/* Multi-Tier Explanation Switcher (ELI5, Operator, Engineer) */}
      <section
        aria-labelledby="explanation-heading"
        className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="explanation-heading"
                className="text-sm font-bold text-slate-900"
              >
                Multi-Perspective Learning Explanation
              </h2>
              <p className="text-xs text-slate-500">
                Switch explanation depth between intuitive analogies, practical
                operator cues, and engineering specifications.
              </p>
            </div>

            {/* 3 Mode Switcher Buttons */}
            <div
              role="tablist"
              aria-label="Explanation modes"
              className="inline-flex rounded-xl border border-slate-300 bg-slate-200/80 p-1"
            >
              {[
                {
                  id: 'eli5' as const,
                  label: 'ELI5',
                  subtitle: 'Analogy',
                  icon: Sparkles,
                },
                {
                  id: 'operator' as const,
                  label: 'Operator',
                  subtitle: 'Practical',
                  icon: Wrench,
                },
                {
                  id: 'engineer' as const,
                  label: 'Engineer',
                  subtitle: 'Technical',
                  icon: Cpu,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = explanationMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setExplanationMode(tab.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-[#203d68]',
                      isActive
                        ? 'bg-[#152d50] text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50',
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="p-6">
          {/* ELI5 Content */}
          {explanationMode === 'eli5' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                <Sparkles
                  className="size-4 text-amber-600"
                  aria-hidden="true"
                />
                Explain Like I&apos;m 5 (Intuitive Everyday Analogy)
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb
                    className="mt-0.5 size-5 shrink-0 text-amber-700"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-amber-950">
                      {scene.explanations.eli5.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium italic text-amber-900 leading-relaxed">
                      &ldquo;{scene.explanations.eli5.analogy}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-700">
                {scene.explanations.eli5.body}
              </p>
            </div>
          )}

          {/* Operator Content */}
          {explanationMode === 'operator' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
                <Wrench className="size-4 text-[#203d68]" aria-hidden="true" />
                Operator Practical Checkpoints & Sensory Cues
              </div>

              {/* Station Checkpoints */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  {scene.explanations.operator.title}:
                </h3>
                <ul className="mt-2.5 space-y-2 text-xs text-slate-800">
                  {scene.explanations.operator.checkpoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sensory Cues */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Sensory Cues (What to Look and Listen For):
                </h4>
                <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs text-slate-700">
                  {scene.explanations.operator.cues.map((cue, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs"
                    >
                      {cue}
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning Banner */}
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-950">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-red-600"
                    aria-hidden="true"
                  />
                  <p className="font-semibold leading-relaxed">
                    {scene.explanations.operator.warnings}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Engineer Content */}
          {explanationMode === 'engineer' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                <Cpu className="size-4 text-indigo-700" aria-hidden="true" />
                Engineering Specifications & Governing Standards
              </div>

              <p className="text-xs leading-relaxed text-slate-800 font-medium">
                {scene.explanations.engineer.specifications}
              </p>

              {/* Parameters Table */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Governing Technical Parameters:
                </h3>
                <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="px-4 py-2">Parameter</th>
                        <th className="px-4 py-2">Specification Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                      {Object.entries(
                        scene.explanations.engineer.parameters,
                      ).map(([key, val]) => (
                        <tr key={key} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-sans font-medium text-slate-700">
                            {key}
                          </td>
                          <td className="px-4 py-2 font-bold text-slate-900">
                            {val}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Standards Badges */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Relevant Industrial Codes:
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {scene.explanations.engineer.standards.map((std) => (
                    <span
                      key={std}
                      className="rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800"
                    >
                      {std}
                    </span>
                  ))}
                </div>
              </div>

              {/* Technical Note */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950">
                <span className="font-bold">Engineering Rationale:</span>{' '}
                {scene.explanations.engineer.technicalNote}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Decision-Based Scenario Question */}
      <section aria-label="Scenario decision question">
        <ScenarioQuizComponent
          quiz={scene.quiz}
          savedAnswerId={savedAnswer}
          onAnswerSelected={handleAnswer}
        />
      </section>

      {/* Practical Takeaway Highlight */}
      <section
        aria-labelledby="takeaway-heading"
        className="rounded-2xl border-l-4 border-l-amber-500 border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800">
            <Lightbulb className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="takeaway-heading"
              className="text-xs font-bold tracking-wider text-amber-900 uppercase"
            >
              Shop Floor Practical Takeaway
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-900 leading-snug">
              {scene.practicalTakeaway}
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={isFirstScene}
          className="h-10 border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          <ChevronLeft className="mr-1 size-4" aria-hidden="true" />
          Previous Scene
        </Button>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleNext}
            className={cn(
              'h-10 text-xs font-bold px-5 transition-all shadow-sm',
              isLastScene
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-[#152d50] text-white hover:bg-[#203d68]',
            )}
          >
            {isLastScene ? (
              <>
                <Award className="mr-2 size-4" aria-hidden="true" />
                Complete Course & Finish
              </>
            ) : (
              <>
                <span>Next Scene</span>
                <ChevronRight className="ml-1 size-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
