'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  Component,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { AlertTriangle, Info, Pause, Play, RotateCcw } from 'lucide-react';
import type { CourseScene } from '@/lib/client-demo/types';
import {
  SoftwareStation,
  INITIAL_STATION_VIEW,
  type StationView,
} from './software-station';

import {
  getStationModel,
  createStationGeometry,
  partOffset,
  type StationModel,
  type StationPart,
  type StationMesh,
} from './station-models';
type Hotspot = StationPart;

class WebGLStageBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function WebGLStage({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    // Synchronize with the browser's graphics capability after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailable(Boolean(context));
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  }, []);
  return available ? (
    <WebGLStageBoundary fallback={fallback}>{children}</WebGLStageBoundary>
  ) : (
    fallback
  );
}

function StationCamera({
  view,
  onViewChange,
}: {
  view: StationView;
  onViewChange: (view: StationView) => void;
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(
      Math.sin(view.yaw) * Math.cos(view.pitch) * view.distance,
      1 + Math.sin(view.pitch) * view.distance,
      Math.cos(view.yaw) * Math.cos(view.pitch) * view.distance,
    );
    camera.lookAt(0, 1, 0);
  }, [camera, view]);
  return (
    <OrbitControls
      enablePan={false}
      enableDamping={false}
      onEnd={() => {
        const offset = camera.position.clone().sub(new THREE.Vector3(0, 1, 0));
        const distance = offset.length();
        onViewChange({
          yaw: Math.atan2(offset.x, offset.z),
          pitch: Math.asin(offset.y / distance),
          distance,
        });
      }}
      minDistance={5}
      maxDistance={20}
      target={[0, 1, 0]}
    />
  );
}

function PartLabel({
  hotspot,
  selected,
  onSelect,
}: {
  hotspot: Hotspot;
  selected: boolean;
  onSelect: () => void;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const context = canvas.getContext('2d')!;
    context.fillStyle = selected ? '#fef3c7' : '#ffffff';
    context.strokeStyle = selected ? '#f59e0b' : '#94a3b8';
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(2, 2, 252, 76, 12);
    context.fill();
    context.stroke();
    context.fillStyle = '#0f172a';
    context.font = '600 25px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(hotspot.label, 128, 40, 236);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [hotspot.label, selected]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite
      name={hotspot.label + ' label'}
      position={[hotspot.position[0], hotspot.position[1], hotspot.position[2]]}
      scale={[1.8, 0.56, 1]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        toneMapped={false}
      />
    </sprite>
  );
}
function EquipmentMesh({
  definition,
  selected,
  onSelect,
  rolling,
  paused,
}: {
  definition: StationMesh;
  selected: boolean;
  onSelect: () => void;
  rolling: boolean;
  paused: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(
    () => createStationGeometry(definition),
    [definition],
  );
  const map = useMemo(() => {
    if (!definition.text) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;
    context.fillStyle = definition.color;
    context.fillRect(0, 0, 512, 128);
    context.fillStyle = ['#ffffff', '#f8fafc', '#dbe4ed'].includes(
      definition.color,
    )
      ? '#0f172a'
      : '#ffffff';
    context.font = 'bold 54px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(definition.text, 256, 64, 480);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [definition]);
  useEffect(
    () => () => {
      geometry.dispose();
      map?.dispose();
    },
    [geometry, map],
  );
  useFrame((_, delta) => {
    if (!paused && rolling && definition.shape === 'cylinder')
      ref.current?.rotateY(delta * 0.7);
  });
  return (
    <mesh
      ref={ref}
      geometry={geometry}
      position={definition.position}
      rotation={definition.rotation}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <meshStandardMaterial
        color={map ? '#ffffff' : definition.color}
        map={map}
        metalness={map ? 0 : 0.35}
        roughness={0.6}
        side={THREE.DoubleSide}
        emissive={selected ? '#8a6100' : '#000000'}
        emissiveIntensity={selected ? 0.28 : 0}
      />
    </mesh>
  );
}
function EquipmentPart({
  part,
  paused,
  selected,
  onSelect,
}: {
  part: StationPart;
  paused: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const phase = useRef(0);
  useFrame((_, delta) => {
    if (!paused) phase.current += delta * 0.6;
    const offset = partOffset(part, phase.current);
    group.current?.position.set(...offset);
  });
  return (
    <group ref={group} name={part.id}>
      {part.meshes.map((mesh, index) => (
        <EquipmentMesh
          key={index}
          definition={mesh}
          selected={selected}
          onSelect={onSelect}
          rolling={part.motion === 'roll'}
          paused={paused}
        />
      ))}
      <PartLabel hotspot={part} selected={selected} onSelect={onSelect} />
    </group>
  );
}
function ChapterStation({
  model,
  paused,
  selected,
  onSelect,
}: {
  model: StationModel;
  paused: boolean;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <group name={model.type}>
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[11, 0.12, 7]} />
        <meshStandardMaterial color="#dce4ec" roughness={0.9} />
      </mesh>
      <gridHelper
        args={[10, 10, '#a3b3c5', '#ccd5df']}
        position={[0, -0.02, 0]}
      />
      {model.parts.map((part) => (
        <EquipmentPart
          key={part.id}
          part={part}
          paused={paused}
          selected={selected === part.id}
          onSelect={() => onSelect(part.id)}
        />
      ))}
    </group>
  );
}

export function ThreeSimulation({
  scene,
  onTaskComplete,
  whiteBackground = false,
}: {
  scene: CourseScene;
  onTaskComplete?: () => void;
  whiteBackground?: boolean;
}) {
  const kind =
    scene.diagramType === 'helical_forming'
      ? 'pipe'
      : scene.diagramType === 'defect_types'
        ? 'quality'
        : 'chapter';
  const [paused, setPaused] = useState(false);
  const [angle, setAngle] = useState(24);
  const [selected, setSelected] = useState(
    () =>
      getStationModel(scene.diagramType, {
        angle: 24,
        inspectionView: 'surface',
        selectedDefect: 'undercut',
      }).parts[0]!.id,
  );
  const [inspectionView, setInspectionView] = useState<
    'surface' | 'cross_section'
  >('surface');
  const [selectedDefect, setSelectedDefect] = useState<
    'undercut' | 'porosity' | 'lack_of_fusion' | 'lack_of_penetration'
  >('undercut');
  const [inspectionFeedback, setInspectionFeedback] = useState<string | null>(
    null,
  );
  const [inspectionComplete, setInspectionComplete] = useState(false);
  const [view, setView] = useState<StationView>(INITIAL_STATION_VIEW);
  const [resetSignal, setResetSignal] = useState(0);
  const model = useMemo(
    () =>
      getStationModel(scene.diagramType, {
        angle,
        inspectionView,
        selectedDefect,
      }),
    [scene.diagramType, angle, inspectionView, selectedDefect],
  );
  const hotspots = model.parts;
  const activeHotspot =
    hotspots.find((item) => item.id === selected) ?? hotspots[0]!;

  const reset = () => {
    setPaused(false);
    setAngle(24);
    setSelected(hotspots[0]?.id ?? 'input');
    setInspectionView('surface');
    setSelectedDefect('undercut');
    setInspectionFeedback(null);
    setInspectionComplete(false);
    setView({ ...INITIAL_STATION_VIEW });
    setResetSignal((value) => value + 1);
  };
  const changeView = (action: string) =>
    setView((current) => ({
      yaw:
        current.yaw +
        (action === 'left' ? -0.25 : action === 'right' ? 0.25 : 0),
      pitch: Math.max(
        -0.2,
        Math.min(
          1.3,
          current.pitch +
            (action === 'up' ? 0.15 : action === 'down' ? -0.15 : 0),
        ),
      ),
      distance: Math.max(
        5,
        Math.min(
          20,
          current.distance *
            (action === 'in' ? 0.85 : action === 'out' ? 1.18 : 1),
        ),
      ),
    }));
  return (
    <section
      data-model-type={model.type}
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
      <div
        className="relative h-[360px] min-h-[300px] w-full sm:h-[430px]"
        tabIndex={0}
        role="group"
        aria-label="Station view. Arrow keys rotate, plus and minus zoom, Home resets."
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const action = (
            {
              ArrowLeft: 'left',
              ArrowRight: 'right',
              ArrowUp: 'up',
              ArrowDown: 'down',
              '+': 'in',
              '=': 'in',
              '-': 'out',
            } as Record<string, string>
          )[event.key];
          if (action) {
            event.preventDefault();
            changeView(action);
          }
          if (event.key === 'Home') {
            event.preventDefault();
            setView({ ...INITIAL_STATION_VIEW });
          }
        }}
      >
        <WebGLStage
          fallback={
            <SoftwareStation
              key={resetSignal}
              model={model}
              selected={selected}
              onSelect={setSelected}
              view={view}
              onViewChange={setView}
              paused={paused}
              whiteBackground={whiteBackground}
            />
          }
        >
          <Canvas
            camera={{ position: [8, 5, 9], fov: 42 }}
            dpr={[1, 1.5]}
            onCreated={({ gl }) =>
              gl.setClearColor(whiteBackground ? '#ffffff' : '#07111f')
            }
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
            <StationCamera view={view} onViewChange={setView} />
            <ChapterStation
              model={model}
              paused={paused}
              selected={activeHotspot.id}
              onSelect={setSelected}
            />
          </Canvas>
        </WebGLStage>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/85 px-3 py-2 text-[10px] text-slate-300">
          <span>Drag to orbit · scroll or pinch to zoom</span>
          <span className="font-semibold text-amber-300">
            Illustrative only
          </span>
        </div>
      </div>
      <div
        className="flex flex-wrap items-center gap-2 border-t border-slate-700 bg-slate-950 px-4 py-3"
        role="group"
        aria-label="Model camera controls"
      >
        {(
          [
            ['left', 'Rotate left', '↶'],
            ['right', 'Rotate right', '↷'],
            ['up', 'Tilt up', '↑'],
            ['down', 'Tilt down', '↓'],
            ['in', 'Zoom in', '+'],
            ['out', 'Zoom out', '−'],
          ] as const
        ).map(([action, label, symbol]) => (
          <button
            key={action}
            type="button"
            aria-label={label}
            title={label}
            onClick={() => changeView(action)}
            className="min-h-10 min-w-10 rounded-lg border border-slate-500 px-3 text-lg font-bold text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-amber-300"
          >
            {symbol}
          </button>
        ))}
        <span className="text-xs text-slate-300">
          Select a component to inspect it
        </span>
      </div>
      {model.note && (
        <p className="border-t border-slate-700 bg-slate-900 px-4 py-3 text-xs leading-relaxed text-slate-200">
          {model.note}
        </p>
      )}
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
          {kind === 'quality' && (
            <div className="space-y-3 text-xs text-slate-200">
              <p className="text-xs text-slate-300">
                Practice task: expose the cross-section and select the undercut
                at the weld toe. Use the other defect options to compare their
                locations.
              </p>
              <div>
                <p className="font-semibold text-slate-100">Inspection view</p>
                <div
                  className="mt-2 flex flex-wrap gap-2"
                  role="group"
                  aria-label="Inspection view"
                >
                  {(
                    [
                      ['surface', 'Surface scan'],
                      ['cross_section', 'Cross-section'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={inspectionView === id}
                      onClick={() => {
                        setInspectionView(id);
                        setInspectionFeedback(null);
                      }}
                      className={`rounded border px-2.5 py-1.5 font-semibold ${inspectionView === id ? 'border-amber-300 bg-amber-100 text-amber-950' : 'border-slate-600 text-slate-200 hover:bg-slate-800'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-100">
                  Identify the indication
                </p>
                <div
                  className="mt-2 grid gap-2"
                  role="group"
                  aria-label="Defect classification"
                >
                  {(
                    [
                      ['undercut', 'Undercut at the weld toe'],
                      ['porosity', 'Porosity cluster'],
                      ['lack_of_fusion', 'Lack of fusion'],
                      ['lack_of_penetration', 'Lack of penetration'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selectedDefect === id}
                      onClick={() => {
                        setSelectedDefect(id);
                        setInspectionFeedback(null);
                      }}
                      className={`rounded border px-2.5 py-1.5 text-left font-semibold ${selectedDefect === id ? 'border-sky-300 bg-sky-950 text-sky-100' : 'border-slate-600 text-slate-200 hover:bg-slate-800'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const correct =
                    inspectionView === 'cross_section' &&
                    selectedDefect === 'undercut';
                  setInspectionComplete(correct);
                  if (correct) onTaskComplete?.();
                  setInspectionFeedback(
                    correct
                      ? 'Correct classification. The cross-section exposes the sharp groove at the weld toe; apply the controlled acceptance criteria before any release decision.'
                      : 'Re-check the view and indication. Use the cross-section to distinguish a weld-toe groove from volumetric or fusion-related indications.',
                  );
                }}
                className="w-full rounded bg-amber-400 px-3 py-2 font-bold text-slate-950 hover:bg-amber-300"
              >
                Submit inspection finding
              </button>
              {inspectionFeedback && (
                <p
                  role="status"
                  className={
                    inspectionComplete ? 'text-emerald-300' : 'text-amber-200'
                  }
                >
                  {inspectionFeedback}
                </p>
              )}
              <p className="text-[10px] leading-relaxed text-amber-200">
                Simulated indication only. Acceptance limits are not supplied by
                this model; use the approved ITP, QAP, and customer
                specification.
              </p>
            </div>
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
                aria-pressed={selected === item.id}
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
