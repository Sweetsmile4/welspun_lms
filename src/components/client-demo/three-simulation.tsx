'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { AlertTriangle, Info, Pause, Play, RotateCcw } from 'lucide-react';
import type { CourseScene } from '@/lib/client-demo/types';

type SimulationKind = 'pipe' | 'safety' | 'quality' | 'generic';
type Hotspot = {
  id: string;
  label: string;
  detail: string;
  position: [number, number, number];
};

const HOTSPOTS: Record<SimulationKind, Hotspot[]> = {
  pipe: [
    {
      id: 'coil',
      label: 'Steel coil',
      detail:
        'The incoming strip is shown as illustrative geometry. It feeds the forming head at the selected angle.',
      position: [-4, 1.1, 0],
    },
    {
      id: 'rolls',
      label: 'Three-roll forming head',
      detail:
        'The rollers bend the strip continuously. Their spacing is intentionally simplified for learning.',
      position: [-1.6, 1.1, 0],
    },
    {
      id: 'weld',
      label: 'SAW welding area',
      detail:
        'The glowing torch marks the seam joining area. It is not a production parameter display.',
      position: [1.1, 1.2, 0],
    },
    {
      id: 'inspection',
      label: 'Inspection stage',
      detail:
        'The final station represents visual and non-destructive inspection before release.',
      position: [3.7, 0.9, 0],
    },
  ],
  safety: [
    {
      id: 'load',
      label: 'Suspended coil',
      detail:
        'Fictional hazard: clear the travel path and never stand beneath a suspended load.',
      position: [0, 3.1, 0],
    },
    {
      id: 'pinch',
      label: 'Pinch point',
      detail:
        'Fictional hazard: stay outside the moving coil car and machine frame interface.',
      position: [2.4, 0.5, 0],
    },
    {
      id: 'walkway',
      label: 'Safe walkway',
      detail:
        'Use the marked walkway and remain outside the yellow exclusion zone.',
      position: [-2.7, 0.05, 2],
    },
  ],
  quality: [
    {
      id: 'seam',
      label: 'Weld seam',
      detail:
        'Select an indication to investigate. The markers are fictional examples, not defect diagnoses.',
      position: [0, 0.8, 1.7],
    },
    {
      id: 'ut',
      label: 'UT scanner',
      detail:
        'The scanner represents a qualified inspection method that must follow controlled procedures.',
      position: [0, 2.2, 0],
    },
    {
      id: 'gauge',
      label: 'Pressure gauge',
      detail:
        'The gauge is illustrative. Any real acceptance decision requires qualified personnel and records.',
      position: [-3.1, 1.2, 0],
    },
  ],
  generic: [
    {
      id: 'input',
      label: 'Input material',
      detail: 'Illustrative input material for this learning station.',
      position: [-3, 1, 0],
    },
    {
      id: 'process',
      label: 'Process station',
      detail:
        'Illustrative process equipment showing the main learning action.',
      position: [-0.8, 1.2, 0],
    },
    {
      id: 'control',
      label: 'Control check',
      detail:
        'Illustrative control or inspection point. Use current controlled procedures for real decisions.',
      position: [1.5, 1.4, 0],
    },
    {
      id: 'output',
      label: 'Output / status',
      detail:
        'Illustrative output state for this station, not a production record.',
      position: [3.5, 0.9, 0],
    },
  ],
};

function CameraReset({ resetSignal }: { resetSignal: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(8, 5, 9);
    camera.lookAt(0, 1, 0);
  }, [camera, resetSignal]);
  return null;
}

function HotspotMarker({
  hotspot,
  active,
  onSelect,
}: {
  hotspot: Hotspot;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <group position={hotspot.position}>
      <mesh
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color={active ? '#fbbf24' : '#38bdf8'}
          emissive={active ? '#f59e0b' : '#0369a1'}
          emissiveIntensity={1.4}
        />
      </mesh>
    </group>
  );
}

function HotspotLegend({
  hotspots,
  selected,
  onSelect,
}: {
  hotspots: Hotspot[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-lg border border-slate-600/90 bg-slate-950/90 p-2 shadow-lg backdrop-blur-sm">
      <p className="px-1 pb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-300">
        Station components
      </p>
      <div className="flex flex-wrap gap-1.5">
        {hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            onClick={() => onSelect(hotspot.id)}
            className={`rounded border px-2 py-1 text-[10px] font-bold transition-colors ${selected === hotspot.id ? 'border-amber-300 bg-amber-100 text-amber-950' : 'border-sky-300/80 bg-slate-900 text-sky-100 hover:bg-slate-800'}`}
          >
            {hotspot.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function genericHotspots(sceneType: CourseScene['diagramType']): Hotspot[] {
  const labels: Partial<
    Record<CourseScene['diagramType'], [string, string, string, string]>
  > = {
    coil_receiving: [
      'Incoming coil',
      'Heat stamp',
      'Thickness check',
      'Hold status',
    ],
    strip_prep: ['Steel strip', 'Leveler rolls', 'Edge mill', 'Bevel check'],
    submerged_arc_welding: [
      'Formed pipe',
      'Flux hopper',
      'Welding torch',
      'Weld bead',
    ],
    quality_testing: [
      'Pipe joint',
      'UT gantry',
      'Pressure gauge',
      'Test status',
    ],
    release_dispatch: [
      'Coated pipe',
      'Bevel station',
      'Stencil head',
      'QA release',
    ],
    ppe_safety: ['PPE station', 'Hard hat', 'High-vis walkway', 'Entry status'],
    loto_isolation: [
      'Machine',
      'Energy isolator',
      'Safety lock',
      'Zero-energy check',
    ],
    near_miss: ['Work area', 'Leak hazard', 'Containment', 'Report status'],
    inspection_gates: [
      'Pipe flow',
      'Inspection gate',
      'Calibrated gauge',
      'Gate status',
    ],
    traceability_lineage: [
      'Steel heat',
      'Coil record',
      'Pipe serial',
      'Digital lineage',
    ],
    quarantine_ncr: ['Flagged pipe', 'NCR station', 'Hold tag', 'Disposition'],
  };
  const selectedLabels = labels[sceneType] ?? [
    'Input material',
    'Process station',
    'Control check',
    'Output / status',
  ];
  return HOTSPOTS.generic.map((hotspot, index) => ({
    ...hotspot,
    label: selectedLabels[index] ?? hotspot.label,
  }));
}

function GenericScene({
  sceneType,
  paused,
  selected,
  onSelect,
}: {
  sceneType: CourseScene['diagramType'];
  paused: boolean;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const station = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!paused && station.current) station.current.rotation.y += delta * 0.12;
  });
  const accent =
    sceneType.includes('safety') ||
    sceneType.includes('loto') ||
    sceneType.includes('hazard') ||
    sceneType.includes('near_miss')
      ? '#eab308'
      : sceneType.includes('quality') ||
          sceneType.includes('inspection') ||
          sceneType.includes('defect') ||
          sceneType.includes('traceability') ||
          sceneType.includes('quarantine')
        ? '#22c55e'
        : '#38bdf8';
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <group ref={station}>
        <mesh position={[-3, 1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.85, 0.85, 1.2, 24]} />
          <meshStandardMaterial
            color="#64748b"
            metalness={0.75}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[-0.8, 1, 0]}>
          <boxGeometry args={[2, 1.8, 1.6]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.55}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[1.5, 1.7, 0]}>
          <boxGeometry args={[0.25, 2.4, 0.25]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.65}
          />
        </mesh>
        <mesh position={[3.5, 0.9, 0]}>
          <boxGeometry args={[1.3, 1.1, 1.3]} />
          <meshStandardMaterial
            color="#0f766e"
            metalness={0.45}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0.7, 2.2, 0]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={1.2}
          />
        </mesh>
      </group>
      {genericHotspots(sceneType).map((item) => (
        <HotspotMarker
          key={item.id}
          hotspot={item}
          active={selected === item.id}
          onSelect={() => onSelect(item.id)}
        />
      ))}
    </>
  );
}

function PipeScene({
  angle,
  paused,
  selected,
  onSelect,
}: {
  angle: number;
  paused: boolean;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const pipe = useRef<THREE.Group>(null);
  useFrame((_, frameDelta) => {
    if (!paused && pipe.current) pipe.current.rotation.x += frameDelta * 0.18;
  });
  const seam = useMemo(() => {
    const points = Array.from({ length: 96 }, (_, index) => {
      const t = index / 95;
      const x = -1.2 + t * 5.3;
      const y = 1.05 + Math.sin(t * Math.PI * 2.3 + angle * 0.06) * 0.62;
      return new THREE.Vector3(x, y, 0.8);
    });
    return new THREE.CatmullRomCurve3(points);
  }, [angle]);
  return (
    <>
      <group ref={pipe}>
        <mesh position={[-4, 1.1, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.05, 0.28, 12, 32]} />
          <meshStandardMaterial
            color="#64748b"
            metalness={0.75}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[-2, 1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.45, 0.45, 1.8, 16]} />
          <meshStandardMaterial
            color="#334155"
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[-1.2, 1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 1.8, 16]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[1.5, 1, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[1.25, 1.25, 3.2, 32, 1, true]} />
          <meshStandardMaterial
            color="#64748b"
            metalness={0.75}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[1.5, 1, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.25, 0.035, 8, 64]} />
          <meshStandardMaterial
            color="#f97316"
            emissive="#7c2d12"
            emissiveIntensity={1.2}
          />
        </mesh>
        <mesh position={[2.8, 2.15, 0]}>
          <boxGeometry args={[0.35, 0.7, 0.35]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#991b1b"
            emissiveIntensity={1.3}
          />
        </mesh>
        <mesh position={[4.2, 0.8, 0]}>
          <boxGeometry args={[1.4, 1.2, 1.4]} />
          <meshStandardMaterial
            color="#0f766e"
            metalness={0.5}
            roughness={0.35}
          />
        </mesh>
        <mesh>
          <tubeGeometry args={[seam, 96, 0.045, 8, false]} />
          <meshStandardMaterial
            color="#fb923c"
            emissive="#9a3412"
            emissiveIntensity={1.4}
          />
        </mesh>
      </group>
      {HOTSPOTS.pipe.map((item) => (
        <HotspotMarker
          key={item.id}
          hotspot={item}
          active={selected === item.id}
          onSelect={() => onSelect(item.id)}
        />
      ))}
    </>
  );
}

function SafetyScene({
  paused,
  selected,
  onSelect,
}: {
  paused: boolean;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const load = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!paused && load.current)
      load.current.position.y = Math.sin(Date.now() * 0.001) * 0.08;
  });
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 3.3, 32, 1, 0, Math.PI * 1.6]} />
        <meshStandardMaterial color="#eab308" side={THREE.DoubleSide} />
      </mesh>
      <group ref={load}>
        <mesh position={[0, 3, 0]}>
          <torusGeometry args={[1.15, 0.35, 12, 32]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        <mesh position={[0, 4.2, 0]}>
          <boxGeometry args={[0.08, 2.4, 0.08]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      </group>
      <mesh position={[2.5, 0.8, 0]}>
        <boxGeometry args={[2.2, 1.6, 1.8]} />
        <meshStandardMaterial color="#475569" metalness={0.6} />
      </mesh>
      <mesh position={[-2.5, 0.8, 0]}>
        <boxGeometry args={[1.5, 1.6, 1.5]} />
        <meshStandardMaterial color="#64748b" metalness={0.6} />
      </mesh>
      <mesh position={[-2.5, 0.1, 2]}>
        <boxGeometry args={[3.5, 0.08, 0.9]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      {HOTSPOTS.safety.map((item) => (
        <HotspotMarker
          key={item.id}
          hotspot={item}
          active={selected === item.id}
          onSelect={() => onSelect(item.id)}
        />
      ))}
    </>
  );
}

function QualityScene({
  paused,
  selected,
  onSelect,
}: {
  paused: boolean;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const scanner = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!paused && scanner.current)
      scanner.current.position.x = Math.sin(Date.now() * 0.001) * 1.5;
  });
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.05, 1.05, 7, 32, 1, true]} />
        <meshStandardMaterial
          color="#64748b"
          metalness={0.8}
          roughness={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 1, 1.04]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.05, 0.04, 8, 64]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#9a3412"
          emissiveIntensity={1.4}
        />
      </mesh>
      <group ref={scanner}>
        <mesh position={[0, 2.35, 0]}>
          <boxGeometry args={[1.5, 0.25, 1.3]} />
          <meshStandardMaterial color="#0284c7" metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.9, 0]}>
          <boxGeometry args={[0.14, 0.8, 0.14]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0369a1"
            emissiveIntensity={1.3}
          />
        </mesh>
      </group>
      <mesh position={[-3.1, 1.2, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.15, 24]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#166534"
          emissiveIntensity={0.8}
        />
      </mesh>
      {(
        [
          [-0.2, 1.2, 1.09],
          [1.1, 1.2, 1.09],
          [2.25, 0.6, 1.09],
        ] as [number, number, number][]
      ).map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#991b1b"
            emissiveIntensity={1.5}
          />
        </mesh>
      ))}
      {HOTSPOTS.quality.map((item) => (
        <HotspotMarker
          key={item.id}
          hotspot={item}
          active={selected === item.id}
          onSelect={() => onSelect(item.id)}
        />
      ))}
    </>
  );
}

function SceneContents({
  kind,
  sceneType,
  angle,
  paused,
  selected,
  onSelect,
}: {
  kind: SimulationKind;
  sceneType: CourseScene['diagramType'];
  angle: number;
  paused: boolean;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return kind === 'pipe' ? (
    <PipeScene
      angle={angle}
      paused={paused}
      selected={selected}
      onSelect={onSelect}
    />
  ) : kind === 'safety' ? (
    <SafetyScene paused={paused} selected={selected} onSelect={onSelect} />
  ) : kind === 'quality' ? (
    <QualityScene paused={paused} selected={selected} onSelect={onSelect} />
  ) : (
    <GenericScene
      sceneType={sceneType}
      paused={paused}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

function kindForScene(scene: CourseScene): SimulationKind | null {
  if (scene.diagramType === 'helical_forming') return 'pipe';
  if (scene.diagramType === 'hazard_loads') return 'safety';
  if (scene.diagramType === 'defect_types') return 'quality';
  return 'generic';
}

export function ThreeSimulation({ scene }: { scene: CourseScene }) {
  const kind = kindForScene(scene);
  const [paused, setPaused] = useState(false);
  const [angle, setAngle] = useState(24);
  const [selected, setSelected] = useState(
    HOTSPOTS[kind ?? 'pipe'][0]?.id ?? 'coil',
  );
  const [resetSignal, setResetSignal] = useState(0);
  const hotspots =
    kind === 'generic'
      ? genericHotspots(scene.diagramType)
      : HOTSPOTS[kind ?? 'generic'];
  const activeHotspot =
    hotspots.find((item) => item.id === selected) ?? hotspots[0]!;

  if (!kind) return null;
  const reset = () => {
    setPaused(false);
    setAngle(24);
    setSelected(HOTSPOTS[kind][0]?.id ?? 'input');
    setResetSignal((value) => value + 1);
  };
  return (
    <section
      aria-label={`${scene.title} interactive 3D simulation`}
      className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 text-white">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300">
            Interactive 3D learning model
          </p>
          <p className="text-sm font-bold">
            Rotate, zoom, and inspect the station
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="inline-flex items-center gap-1 rounded border border-slate-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-800"
          >
            {paused ? (
              <Play className="size-3.5" />
            ) : (
              <Pause className="size-3.5" />
            )}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded border border-slate-600 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-800"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
        </div>
      </div>
      <div className="relative h-[360px] min-h-[300px] w-full sm:h-[430px]">
        <Canvas
          camera={{ position: [8, 5, 9], fov: 42 }}
          dpr={[1, 1.5]}
          fallback={
            <div className="grid h-full place-items-center bg-slate-900 p-6 text-center text-sm text-slate-200">
              WebGL is unavailable in this browser. Use the accessible station
              details below.
            </div>
          }
          onCreated={({ gl }) => gl.setClearColor('#07111f')}
        >
          <ambientLight intensity={1.2} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={3}
            color="#fff7ed"
          />
          <pointLight
            position={[-4, 4, 3]}
            intensity={20}
            distance={14}
            color="#38bdf8"
          />
          <CameraReset resetSignal={resetSignal} />
          <SceneContents
            kind={kind}
            sceneType={scene.diagramType}
            angle={angle}
            paused={paused}
            selected={selected}
            onSelect={setSelected}
          />
          <OrbitControls
            enablePan={false}
            minDistance={5}
            maxDistance={16}
            target={[0, 1, 0]}
          />
        </Canvas>
        <HotspotLegend
          hotspots={hotspots}
          selected={selected}
          onSelect={setSelected}
        />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/85 px-3 py-2 text-[10px] text-slate-300">
          <span>Drag to orbit · scroll or pinch to zoom</span>
          <span className="font-semibold text-amber-300">
            Illustrative only
          </span>
        </div>
      </div>
      <div className="grid gap-4 border-t border-slate-800 bg-slate-900 p-4 lg:grid-cols-[1fr_1.2fr]">
        <div>
          {kind === 'pipe' && (
            <label className="block text-xs font-semibold text-slate-200">
              Forming angle{' '}
              <span className="font-mono text-amber-300">{angle}°</span>
              <input
                type="range"
                min="12"
                max="42"
                value={angle}
                onChange={(event) => setAngle(Number(event.target.value))}
                aria-label="Forming angle"
                className="mt-3 w-full accent-amber-400"
              />
            </label>
          )}
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="list"
            aria-label="3D component hotspots"
          >
            {hotspots.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item.id)}
                className={`rounded border px-2.5 py-1.5 text-[11px] font-semibold ${selected === item.id ? 'border-amber-300 bg-amber-100 text-amber-950' : 'border-slate-600 text-slate-200 hover:bg-slate-800'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div
          className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 font-bold text-sky-300">
            <Info className="size-4" />
            {activeHotspot.label}
          </div>
          <p className="mt-2 leading-relaxed">{activeHotspot.detail}</p>
          {kind !== 'pipe' && (
            <p className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Fictional training example. Follow current controlled procedures
              and qualified site guidance.
            </p>
          )}
        </div>
      </div>
      <details className="border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
        <summary className="cursor-pointer font-semibold">
          Accessible station details
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {hotspots.map((item) => (
            <li key={item.id}>
              <strong>{item.label}:</strong> {item.detail}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
