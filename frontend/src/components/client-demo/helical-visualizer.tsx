'use client';

import React, { useMemo, useState } from 'react';
import { Compass, Info, Pause, Play, RotateCcw } from 'lucide-react';
import {
  calculateHelicalForming,
  inchesToMm,
  mmToInches,
} from '@/lib/client-demo/math-utils';
import { ThreeSimulationViewer } from './three-simulation-viewer';

interface PresetOption {
  label: string;
  diameterInches: number;
  stripWidthMm: number;
}
const PRESETS: PresetOption[] = [
  { label: '24" Water Line', diameterInches: 24, stripWidthMm: 1250 },
  { label: '36" Gas Transmission', diameterInches: 36, stripWidthMm: 1500 },
  { label: '48" Heavy Trunkline', diameterInches: 48, stripWidthMm: 1500 },
];

export function HelicalFormingVisualizer() {
  const [diameterInches, setDiameterInches] = useState(48);
  const [stripWidthMm, setStripWidthMm] = useState(1500);
  const [visualAngle, setVisualAngle] = useState(23.05);
  const [paused, setPaused] = useState(false);
  const diameterMm = useMemo(
    () => inchesToMm(diameterInches),
    [diameterInches],
  );
  const calculation = useMemo(
    () => calculateHelicalForming({ diameterMm, stripWidthMm }),
    [diameterMm, stripWidthMm],
  );

  const applyPreset = (preset: PresetOption) => {
    setDiameterInches(preset.diameterInches);
    setStripWidthMm(preset.stripWidthMm);
    setVisualAngle(
      calculateHelicalForming({
        diameterMm: inchesToMm(preset.diameterInches),
        stripWidthMm: preset.stripWidthMm,
      }).formingAngleDegrees,
    );
  };
  const reset = () => {
    setDiameterInches(48);
    setStripWidthMm(1500);
    setVisualAngle(23.05);
    setPaused(false);
  };

  return (
    <section
      aria-labelledby="helical-simulation-heading"
      className="my-6 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-[#102a43] px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-amber-400 text-[#0a2540]">
            <Compass className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="helical-simulation-heading"
              className="text-sm font-bold tracking-wide"
            >
              Interactive Educational Tool: Helical Forming Angle Explorer
            </h2>
            <p className="text-xs text-slate-300">
              Reference relationship: sin(alpha) = W / (pi x D)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-amber-300/40 bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-200">
            Three.js 3D Simulation
          </span>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? 'Resume visual motion' : 'Pause visual motion'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
          >
            {paused ? (
              <Play className="size-3.5" aria-hidden="true" />
            ) : (
              <Pause className="size-3.5" aria-hidden="true" />
            )}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Quick Size Presets
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`rounded-lg border px-2.5 py-2 text-left text-xs ${diameterInches === preset.diameterInches && stripWidthMm === preset.stripWidthMm ? 'border-[#203d68] bg-[#edf4fb] font-bold text-[#152d50]' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                >
                  {preset.label}
                  <span className="mt-1 block text-[10px] text-slate-500">
                    {preset.stripWidthMm}mm strip
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Pipe outer diameter
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono font-bold">
                {diameterInches}&quot; ({diameterMm} mm)
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="64"
              step="2"
              value={diameterInches}
              onChange={(event) =>
                setDiameterInches(Number(event.target.value))
              }
              aria-label="Pipe Outer Diameter in inches"
              className="mt-3 h-2 w-full accent-[#203d68]"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Steel strip width
              </span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono font-bold">
                {stripWidthMm} mm ({mmToInches(stripWidthMm)}&quot;)
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="1800"
              step="50"
              value={stripWidthMm}
              onChange={(event) => setStripWidthMm(Number(event.target.value))}
              aria-label="Steel Strip Width in millimeters"
              className="mt-3 h-2 w-full accent-[#203d68]"
            />
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="visual-forming-angle"
                className="font-bold text-slate-800"
              >
                Visual forming angle (alpha)
              </label>
              <span className="rounded-md border border-blue-200 bg-white px-2 py-0.5 font-mono font-bold">
                {visualAngle.toFixed(1)} degrees
              </span>
            </div>
            <input
              id="visual-forming-angle"
              type="range"
              min="10"
              max="50"
              step="0.5"
              value={visualAngle}
              onChange={(event) => setVisualAngle(Number(event.target.value))}
              aria-describedby="visual-angle-note"
              className="mt-3 h-2 w-full accent-[#203d68]"
            />
            <p
              id="visual-angle-note"
              className="mt-2 text-[11px] leading-relaxed text-blue-950"
            >
              This slider changes the 3D strip pose only. The selected
              dimensions give a reference angle of{' '}
              {calculation.formingAngleDegrees.toFixed(1)} degrees; neither
              value is a certified machine setting.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-emerald-950">
              Reference geometry
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-600">Reference angle</span>
                <p className="text-lg font-black text-emerald-900">
                  {calculation.formingAngleDegrees}°
                </p>
              </div>
              <div>
                <span className="text-slate-600">Spiral pitch</span>
                <p className="font-mono font-bold">{calculation.pitchMm} mm</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-800">
              {calculation.statusMessage}
            </p>
          </div>
        </div>
        <div className="lg:col-span-7">
          <ThreeSimulationViewer
            mode="helical"
            angle={visualAngle}
            paused={paused}
          />
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[11px] text-slate-300">
            <div className="flex items-start gap-2">
              <Info
                className="mt-0.5 size-4 shrink-0 text-amber-400"
                aria-hidden="true"
              />
              <p>
                <strong className="text-amber-300">
                  Illustrative 3D model:
                </strong>{' '}
                The coil, rollers, pipe, seam, welding head, and inspection
                stage communicate process relationships. They are not a digital
                twin or certified setup calculator.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-amber-50/90 px-5 py-3 text-xs text-amber-950">
        <strong>Illustrative educational model:</strong> Production setup
        requires controlled procedures, qualified engineering review, material
        data, tooling factors, and site-specific validation.
      </div>
    </section>
  );
}
