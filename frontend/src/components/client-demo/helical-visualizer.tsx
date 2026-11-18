'use client';

import React, { useState, useMemo } from 'react';
import {
  calculateHelicalForming,
  inchesToMm,
  mmToInches,
} from '@/lib/client-demo/math-utils';
import { Info, Compass } from 'lucide-react';

interface PresetOption {
  label: string;
  diameterInches: number;
  stripWidthMm: number;
  description: string;
}

const PRESETS: PresetOption[] = [
  {
    label: '24" Water Line',
    diameterInches: 24,
    stripWidthMm: 1250,
    description: 'Medium diameter municipal water pipeline',
  },
  {
    label: '36" Gas Transmission',
    diameterInches: 36,
    stripWidthMm: 1500,
    description: 'High-pressure cross-country natural gas main',
  },
  {
    label: '48" Heavy Trunkline',
    diameterInches: 48,
    stripWidthMm: 1500,
    description: 'API 5L X70 large-diameter oil/gas pipeline',
  },
];

export function HelicalFormingVisualizer() {
  const [diameterInches, setDiameterInches] = useState<number>(48);
  const [stripWidthMm, setStripWidthMm] = useState<number>(1500);

  const diameterMm = useMemo(
    () => inchesToMm(diameterInches),
    [diameterInches],
  );

  const calculation = useMemo(() => {
    return calculateHelicalForming({
      diameterMm,
      stripWidthMm,
    });
  }, [diameterMm, stripWidthMm]);

  const applyPreset = (preset: PresetOption) => {
    setDiameterInches(preset.diameterInches);
    setStripWidthMm(preset.stripWidthMm);
  };

  // Dynamic visual geometry for SVG
  const angleDeg = calculation.formingAngleDegrees;
  // Bounded angle for visual drawing
  const visualAngle = Math.min(Math.max(angleDeg, 12), 48);

  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-[#102a43] px-5 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-amber-400 text-[#0a2540]">
            <Compass className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide">
              Interactive Educational Tool: Helical Forming Angle Explorer
            </h3>
            <p className="text-xs text-slate-300">
              Kinematic relationship: $\sin(\alpha) = W / (\pi \times D)$
            </p>
          </div>
        </div>
        <span className="rounded-full border border-amber-300/40 bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-200">
          Educational Simulation
        </span>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-12">
        {/* Controls Column (5 cols) */}
        <div className="space-y-5 lg:col-span-5">
          {/* Presets */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quick Size Presets:
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PRESETS.map((p) => {
                const isActive =
                  diameterInches === p.diameterInches &&
                  stripWidthMm === p.stripWidthMm;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`rounded-lg border px-2.5 py-2 text-left transition-all ${
                      isActive
                        ? 'border-[#203d68] bg-[#edf4fb] text-[#152d50] ring-2 ring-[#203d68]/20 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs">{p.label}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {p.stripWidthMm}mm coil
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slider 1: Pipe Outer Diameter */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Pipe Outer Diameter (D):
              </span>
              <span className="rounded-md bg-white px-2 py-0.5 font-mono font-bold text-slate-900 border border-slate-200">
                {diameterInches}&quot; ({diameterMm} mm)
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="64"
              step="2"
              value={diameterInches}
              onChange={(e) => setDiameterInches(Number(e.target.value))}
              aria-label="Pipe Outer Diameter in inches"
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-[#203d68]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>20&quot; (508 mm)</span>
              <span>36&quot;</span>
              <span>48&quot;</span>
              <span>64&quot; (1626 mm)</span>
            </div>
          </div>

          {/* Slider 2: Strip Width */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Steel Strip Width (W):
              </span>
              <span className="rounded-md bg-white px-2 py-0.5 font-mono font-bold text-slate-900 border border-slate-200">
                {stripWidthMm} mm ({mmToInches(stripWidthMm)}&quot;)
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="1800"
              step="50"
              value={stripWidthMm}
              onChange={(e) => setStripWidthMm(Number(e.target.value))}
              aria-label="Steel Strip Width in millimeters"
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 accent-[#203d68]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>1000 mm</span>
              <span>1400 mm</span>
              <span>1600 mm</span>
              <span>1800 mm</span>
            </div>
          </div>

          {/* Computed Metrics Card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              Calculated Helical Geometry
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-600">Forming Angle (α):</span>
                <p className="text-lg font-black text-emerald-900">
                  {calculation.formingAngleDegrees}°
                </p>
              </div>
              <div>
                <span className="text-slate-600">Circumference (πD):</span>
                <p className="text-lg font-black text-slate-800">
                  {calculation.circumferenceMm} mm
                </p>
              </div>
              <div>
                <span className="text-slate-600">Ratio W / (πD):</span>
                <p className="font-mono font-bold text-slate-800">
                  {calculation.widthToCircumferenceRatio}
                </p>
              </div>
              <div>
                <span className="text-slate-600">Spiral Pitch (P):</span>
                <p className="font-mono font-bold text-slate-800">
                  {calculation.pitchMm} mm
                </p>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] font-medium text-emerald-800">
              Status: {calculation.statusMessage}
            </p>
          </div>
        </div>

        {/* Visual Diagram Column (7 cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-900 p-5 text-white lg:col-span-7">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Dynamic Geometry Visualization</span>
              <span className="font-mono text-amber-300">
                Forming Angle α = {calculation.formingAngleDegrees}°
              </span>
            </div>

            {/* SVG Visual Model */}
            <div className="relative mt-4 flex items-center justify-center overflow-hidden rounded-lg bg-[#0b1928] p-4">
              <svg
                viewBox="0 0 500 280"
                className="h-56 w-full max-w-lg select-none"
                aria-label="Helical forming interactive diagram"
              >
                {/* Background Grid Lines */}
                <defs>
                  <pattern
                    id="grid-pattern"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="1"
                    />
                  </pattern>
                  <linearGradient
                    id="pipeGrad"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#4a6585" />
                    <stop offset="35%" stopColor="#8ba4c4" />
                    <stop offset="50%" stopColor="#c5d8ed" />
                    <stop offset="65%" stopColor="#6380a3" />
                    <stop offset="100%" stopColor="#2c4463" />
                  </linearGradient>
                  <linearGradient
                    id="stripGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#a3b8cc" />
                    <stop offset="50%" stopColor="#d5e2ef" />
                    <stop offset="100%" stopColor="#7a92aa" />
                  </linearGradient>
                </defs>
                <rect width="500" height="280" fill="url(#grid-pattern)" />

                {/* Pipe Axis Centerline */}
                <line
                  x1="180"
                  y1="140"
                  x2="480"
                  y2="140"
                  stroke="#e8a93a"
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                />
                <text
                  x="430"
                  y="132"
                  fill="#e8a93a"
                  fontSize="10"
                  fontWeight="bold"
                >
                  Pipe Axis
                </text>

                {/* Formed Spiral Pipe Body */}
                {/* Pipe Cylinder Shell */}
                <rect
                  x="200"
                  y="70"
                  width="270"
                  height="140"
                  rx="6"
                  fill="url(#pipeGrad)"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />

                {/* Helical Spiral Seam Lines on Pipe */}
                <path
                  d="M 230 70 Q 250 140 270 210 M 290 70 Q 310 140 330 210 M 350 70 Q 370 140 390 210 M 410 70 Q 430 140 450 210"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray="4,2"
                />

                {/* Forming Rolls (3 Rollers schematically at entry) */}
                {/* Roll 1 - Upper */}
                <circle
                  cx="200"
                  cy="55"
                  r="16"
                  fill="#1e293b"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                />
                <circle cx="200" cy="55" r="4" fill="#f59e0b" />
                {/* Roll 2 - Lower */}
                <circle
                  cx="200"
                  cy="225"
                  r="16"
                  fill="#1e293b"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                />
                <circle cx="200" cy="225" r="4" fill="#f59e0b" />
                {/* Roll 3 - Bending offset roll */}
                <circle
                  cx="170"
                  cy="140"
                  r="18"
                  fill="#1e293b"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                />
                <circle cx="170" cy="140" r="5" fill="#38bdf8" />
                <text
                  x="135"
                  y="115"
                  fill="#38bdf8"
                  fontSize="9"
                  fontWeight="bold"
                >
                  Bending Roll
                </text>

                {/* Incoming Steel Strip (Rotated by angleDeg) */}
                <g transform={`translate(170, 140) rotate(-${visualAngle})`}>
                  {/* Flat Strip feeding into forming head */}
                  <rect
                    x="-150"
                    y="-35"
                    width="150"
                    height="70"
                    fill="url(#stripGrad)"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                  />
                  {/* Strip Centerline */}
                  <line
                    x1="-150"
                    y1="0"
                    x2="0"
                    y2="0"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  {/* Arrow indicating feed direction */}
                  <polygon points="-70,-6 -55,0 -70,6" fill="#0f172a" />
                  <text
                    x="-135"
                    y="-42"
                    fill="#cbd5e1"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    Strip Width W = {stripWidthMm}mm
                  </text>
                </g>

                {/* Angle Arc Indicator */}
                <path
                  d="M 120 140 A 50 50 0 0 0 135 110"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <text
                  x="95"
                  y="115"
                  fill="#38bdf8"
                  fontSize="11"
                  fontWeight="bold"
                >
                  α = {calculation.formingAngleDegrees}°
                </text>

                {/* Submerged Arc Welding Torch Schematics */}
                <rect
                  x="235"
                  y="58"
                  width="14"
                  height="24"
                  rx="2"
                  fill="#ef4444"
                />
                <polygon points="237,82 247,82 242,92" fill="#fbbf24" />
                <text
                  x="215"
                  y="48"
                  fill="#fbbf24"
                  fontSize="10"
                  fontWeight="bold"
                >
                  OD SAW Torch
                </text>

                {/* Dimension callout for Diameter */}
                <line
                  x1="475"
                  y1="70"
                  x2="475"
                  y2="210"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <polygon points="472,75 475,68 478,75" fill="#38bdf8" />
                <polygon points="472,205 475,212 478,205" fill="#38bdf8" />
                <text
                  x="482"
                  y="144"
                  fill="#38bdf8"
                  fontSize="10"
                  fontWeight="bold"
                >
                  OD {diameterInches}&quot;
                </text>
              </svg>
            </div>
          </div>

          {/* Technical Note at bottom */}
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-[11px] text-slate-300">
            <div className="flex items-start gap-2">
              <Info
                className="size-4 shrink-0 text-amber-400 mt-0.5"
                aria-hidden="true"
              />
              <p>
                <strong className="text-amber-300">
                  Engineering Principle:
                </strong>{' '}
                In HSAW mills, adjusting the forming angle α allows one standard
                coil width to produce pipes of multiple diameters. Narrower
                forming angles allow larger diameter pipes, while steeper angles
                allow smaller diameter pipes from the same steel coil.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Caution Banner */}
      <div className="border-t border-slate-200 bg-amber-50/90 px-5 py-2.5 text-xs text-amber-950">
        <span className="font-bold text-amber-900">
          Illustrative Educational Model:
        </span>{' '}
        This calculator demonstrates kinematic geometry concepts. Production
        tool setups require exact metallurgical tensile calibration, springback
        compensation, uncoiler back-tension, and machine-specific roll radius
        adjustments.
      </div>
    </div>
  );
}
