'use client';

import React, { useState } from 'react';
import { CheckCircle2, Eye, RotateCcw } from 'lucide-react';
import { ThreeSimulationViewer } from './three-simulation-viewer';
import { cn } from '@/lib/utils';

interface InspectionIndication {
  id: string;
  label: string;
  kind: 'review' | 'clear';
  decision: string;
  explanation: string;
}
const INDICATIONS: InspectionIndication[] = [
  {
    id: 'linear-indication',
    label: 'Linear indication',
    kind: 'review',
    decision: 'Escalate for qualified review and hold the sample.',
    explanation:
      'A linear pattern is a signal to investigate, not a diagnosis. Apply the applicable controlled criteria with qualified inspection.',
  },
  {
    id: 'rounded-mark',
    label: 'Rounded mark',
    kind: 'review',
    decision: 'Record the indication and request a second check.',
    explanation:
      'A rounded indication may have several causes. Document it rather than making a release decision from this display.',
  },
  {
    id: 'clean-area',
    label: 'Clear reference area',
    kind: 'clear',
    decision: 'Continue the sample scan; no escalation from this area alone.',
    explanation:
      'This area is a visual reference only. A clear sample patch does not prove that the entire item passes inspection.',
  },
];

export function QualityInspectionSimulation() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const selected = INDICATIONS.find(
    (indication) => indication.id === selectedId,
  );
  const isComplete = reviewedIds.length === INDICATIONS.length;
  const selectIndication = (id: string) => {
    setSelectedId(id);
    setReviewedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  };
  const reset = () => {
    setSelectedId(null);
    setReviewedIds([]);
  };

  return (
    <section
      aria-labelledby="quality-simulation-heading"
      className="my-6 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#102a43] px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-amber-400 text-[#0a2540]">
            <Eye className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="quality-simulation-heading" className="text-sm font-bold">
              Try Simulation: Inspect Sample Indications
            </h2>
            <p className="text-xs text-slate-300">
              {reviewedIds.length} of {INDICATIONS.length} sample areas reviewed
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset Simulation
        </button>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <p className="mb-3 text-xs leading-relaxed text-slate-600">
            Orbit the illustrative inspection setup and select each glowing
            indication on the pipe. These fictional patterns do not diagnose
            actual defects.
          </p>
          <ThreeSimulationViewer
            mode="quality"
            selectedId={selectedId}
            onSelect={selectIndication}
          />
        </div>
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          aria-live="polite"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Inspection decision
          </p>
          {!selected ? (
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Select a glowing 3D indication or use the accessible list below.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                {selected.label}
              </h3>
              <div
                className={cn(
                  'rounded-lg border p-3',
                  selected.kind === 'review'
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-sky-200 bg-sky-50',
                )}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Recommended learning response
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-900">
                  {selected.decision}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {selected.explanation}
              </p>
            </div>
          )}
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Accessible indication list
            </p>
            {INDICATIONS.map((indication) => (
              <button
                key={indication.id}
                type="button"
                onClick={() => selectIndication(indication.id)}
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-[#203d68]"
              >
                {reviewedIds.includes(indication.id) ? '✓ ' : ''}
                {indication.label}
              </button>
            ))}
          </div>
          {isComplete && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-950">
              <CheckCircle2
                className="size-4 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
              Sample review complete. Qualified inspection and controlled
              criteria make the actual decision.
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-200 bg-amber-50 px-5 py-3 text-xs text-amber-950">
        <strong>Illustrative only:</strong> The marks are fictional visual
        patterns and do not diagnose actual weld defects or authorize release.
      </div>
    </section>
  );
}
