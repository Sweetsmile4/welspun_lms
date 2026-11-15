'use client';

import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, ShieldAlert } from 'lucide-react';
import { ThreeSimulationViewer } from './three-simulation-viewer';

interface SafetyHotspot {
  id: string;
  label: string;
  hazard: string;
  safeResponse: string;
}

const HOTSPOTS: SafetyHotspot[] = [
  {
    id: 'suspended-load',
    label: 'Suspended coil path',
    hazard: 'A moving load is crossing the marked work area.',
    safeResponse: 'Leave the path and wait in the designated safe zone.',
  },
  {
    id: 'missing-eye-protection',
    label: 'Missing eye protection',
    hazard:
      'A person is near grinding activity without visible eye protection.',
    safeResponse:
      'Pause the interaction and ask the person to obtain suitable eye protection.',
  },
  {
    id: 'spill-near-cable',
    label: 'Spill near cable',
    hazard: 'A fluid spill is close to an electrical cable route.',
    safeResponse:
      'Keep clear, isolate the area, and report it through the site process.',
  },
];

export function SafetySimulation() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [identifiedIds, setIdentifiedIds] = useState<string[]>([]);
  const selected = HOTSPOTS.find((hotspot) => hotspot.id === selectedId);
  const isComplete = identifiedIds.length === HOTSPOTS.length;

  const selectHotspot = (id: string) => {
    setSelectedId(id);
    setIdentifiedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  };
  const reset = () => {
    setSelectedId(null);
    setIdentifiedIds([]);
  };

  return (
    <section
      aria-labelledby="safety-simulation-heading"
      className="my-6 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#102a43] px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-amber-400 text-[#0a2540]">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="safety-simulation-heading" className="text-sm font-bold">
              Try Simulation: Spot the Shop Floor Hazards
            </h2>
            <p className="text-xs text-slate-300">
              {identifiedIds.length} of {HOTSPOTS.length} hazards identified
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
            Orbit the illustrative work area, then select each glowing hazard
            hotspot. This model is not an approved safety procedure.
          </p>
          <ThreeSimulationViewer
            mode="safety"
            selectedId={selectedId}
            onSelect={selectHotspot}
          />
        </div>
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          aria-live="polite"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Hazard review
          </p>
          {!selected ? (
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Select a glowing 3D hotspot or use the accessible list below.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                {selected.label}
              </h3>
              <p className="text-xs leading-relaxed text-slate-700">
                {selected.hazard}
              </p>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Safe response
                </p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-950">
                  {selected.safeResponse}
                </p>
              </div>
            </div>
          )}
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Accessible hotspot list
            </p>
            {HOTSPOTS.map((hotspot) => (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => selectHotspot(hotspot.id)}
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-[#203d68]"
              >
                {identifiedIds.includes(hotspot.id) ? '✓ ' : ''}
                {hotspot.label}
              </button>
            ))}
          </div>
          {isComplete && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-950">
              <CheckCircle2
                className="size-4 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
              All sample hazards identified. Site-specific controls always take
              priority.
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-slate-200 bg-amber-50 px-5 py-3 text-xs text-amber-950">
        <strong>Illustrative only:</strong> This interaction does not replace a
        site risk assessment, permit, approved SOP, or qualified safety
        direction.
      </div>
    </section>
  );
}
