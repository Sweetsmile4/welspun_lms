'use client';

import React, {
  Component,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCcw } from 'lucide-react';

export type ThreeSimulationMode = 'helical' | 'safety' | 'quality';

interface ThreeSimulationViewerProps {
  mode: ThreeSimulationMode;
  angle?: number;
  paused?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

class WebGLErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-64 place-items-center bg-slate-950 p-6 text-center text-sm text-slate-200">
          <div>
            <p className="font-bold text-white">3D preview unavailable</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
              Your browser did not provide a usable WebGL context. Use the
              accessible hotspot list below to continue the learning activity.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingState() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="w-44 rounded-lg border border-slate-600 bg-slate-950/90 p-3 text-center text-xs text-slate-200">
        Loading 3D scene {Math.round(progress)}%
      </div>
    </Html>
  );
}

function CameraReset({ resetSignal }: { resetSignal: number }) {
  const { camera } = useThree();
  const initialPosition = useRef(new THREE.Vector3(7, 5, 8));
  useEffect(() => {
    camera.position.copy(initialPosition.current);
    camera.lookAt(0, 0, 0);
  }, [camera, resetSignal]);
  return null;
}

function Hotspot({
  id,
  position,
  selected,
  onSelect,
  color = '#ef4444',
}: {
  id: string;
  position: [number, number, number];
  selected: boolean;
  onSelect?: (id: string) => void;
  color?: string;
}) {
  return (
    <mesh
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <sphereGeometry args={[selected ? 0.3 : 0.23, 20, 12]} />
      <meshStandardMaterial
        color={selected ? '#22c55e' : color}
        emissive={selected ? '#14532d' : '#450a0a'}
        emissiveIntensity={1.4}
      />
    </mesh>
  );
}

function AnimatedSeam({ paused, angle }: { paused: boolean; angle: number }) {
  const seam = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!paused && seam.current)
      seam.current.rotation.x += delta * (0.25 + angle / 180);
  });
  return (
    <mesh ref={seam} rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[1.6, 0.035, 8, 96]} />
      <meshStandardMaterial
        color="#f97316"
        emissive="#7c2d12"
        emissiveIntensity={0.8}
      />
    </mesh>
  );
}

function PipeScene({
  angle = 23,
  paused = false,
}: {
  angle?: number;
  paused?: boolean;
}) {
  const seamCurve = useMemo(() => {
    const points = Array.from({ length: 30 }, (_, index) => {
      const x = -2.7 + index * 0.19;
      const theta = index * 0.48;
      return new THREE.Vector3(
        x,
        Math.cos(theta) * 1.15,
        Math.sin(theta) * 1.15,
      );
    });
    return new THREE.CatmullRomCurve3(points);
  }, []);
  const pipeAngle = THREE.MathUtils.degToRad(angle);
  return (
    <group>
      <mesh position={[-4.2, 0.3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.25, 0.48, 16, 48]} />
        <meshStandardMaterial
          color="#718096"
          metalness={0.75}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[-3, 0.3, 0]} rotation={[0, 0, pipeAngle]}>
        <boxGeometry args={[2.8, 0.18, 1.3]} />
        <meshStandardMaterial
          color="#b9c7d8"
          metalness={0.7}
          roughness={0.35}
        />
      </mesh>
      {[-1.4, -0.5, 0.4].map((x) => (
        <mesh key={x} position={[x, 1.45, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.42, 0.75, 24]} />
          <meshStandardMaterial
            color="#334155"
            metalness={0.85}
            roughness={0.24}
          />
        </mesh>
      ))}
      <mesh position={[1.7, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[1.45, 1.45, 4.7, 48, 1, true]} />
        <meshStandardMaterial
          color="#516b87"
          metalness={0.72}
          roughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[1.7, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <tubeGeometry args={[seamCurve, 96, 0.045, 8, false]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#7c2d12"
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh position={[1.7, 1.65, 0]}>
        <boxGeometry args={[0.45, 0.7, 0.45]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#7f1d1d"
          emissiveIntensity={0.9}
        />
      </mesh>
      <AnimatedSeam paused={paused} angle={angle} />
      <mesh position={[4.5, -0.85, 0]}>
        <boxGeometry args={[1.2, 0.18, 2.8]} />
        <meshStandardMaterial
          color="#f59e0b"
          metalness={0.35}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[4.5, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.45, 0.45, 2.4, 24]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#14532d"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

function SafetyScene({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[3.2, 2.3, 2.4]} />
        <meshStandardMaterial
          color="#475569"
          metalness={0.55}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[-4, 1.4, 0]}>
        <boxGeometry args={[1.2, 2.8, 1.5]} />
        <meshStandardMaterial
          color="#64748b"
          metalness={0.4}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[1.8, 2.7, 0]}>
        <boxGeometry args={[2.4, 0.3, 0.3]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.4} />
      </mesh>
      <mesh position={[2.8, 1.8, 0]}>
        <boxGeometry args={[0.7, 1.4, 0.7]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
      <mesh position={[0, -0.92, 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 1.1]} />
        <meshBasicMaterial color="#eab308" transparent opacity={0.32} />
      </mesh>
      <Hotspot
        id="suspended-load"
        position={[2.8, 1.05, 0.5]}
        selected={selectedId === 'suspended-load'}
        onSelect={onSelect}
      />
      <Hotspot
        id="missing-eye-protection"
        position={[-3.4, 0.7, 0.9]}
        selected={selectedId === 'missing-eye-protection'}
        onSelect={onSelect}
      />
      <Hotspot
        id="spill-near-cable"
        position={[0, -0.75, 1.8]}
        selected={selectedId === 'spill-near-cable'}
        onSelect={onSelect}
      />
    </group>
  );
}

function QualityScene({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.65, 1.65, 5.4, 48, 1, true]} />
        <meshStandardMaterial
          color="#64748b"
          metalness={0.8}
          roughness={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[1.66, 0.06, 10, 64]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#7c2d12"
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[0.55, 0.45, 0.55]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0c4a6e"
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh position={[0, -2.3, 0]}>
        <boxGeometry args={[5.8, 0.18, 3.2]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
      </mesh>
      <Hotspot
        id="linear-indication"
        position={[-1.5, 0.75, 1.45]}
        selected={selectedId === 'linear-indication'}
        onSelect={onSelect}
      />
      <Hotspot
        id="rounded-mark"
        position={[0.9, -0.8, 1.42]}
        selected={selectedId === 'rounded-mark'}
        onSelect={onSelect}
        color="#f59e0b"
      />
      <Hotspot
        id="clean-area"
        position={[1.65, 0.95, 1.18]}
        selected={selectedId === 'clean-area'}
        onSelect={onSelect}
        color="#38bdf8"
      />
    </group>
  );
}

function SimulationContents({
  mode,
  angle,
  paused,
  selectedId,
  onSelect,
}: ThreeSimulationViewerProps) {
  return (
    <>
      <ambientLight intensity={1.3} />
      <directionalLight position={[5, 8, 6]} intensity={3} castShadow />
      <pointLight
        position={[-5, 3, 3]}
        color="#38bdf8"
        intensity={18}
        distance={14}
      />
      <gridHelper args={[16, 16, '#475569', '#263449']} position={[0, -1, 0]} />
      <CameraReset resetSignal={0} />
      {mode === 'helical' && <PipeScene angle={angle} paused={paused} />}
      {mode === 'safety' && (
        <SafetyScene selectedId={selectedId} onSelect={onSelect} />
      )}
      {mode === 'quality' && (
        <QualityScene selectedId={selectedId} onSelect={onSelect} />
      )}
    </>
  );
}

export function ThreeSimulationViewer(props: ThreeSimulationViewerProps) {
  const [resetSignal, setResetSignal] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return (
    <div className="relative h-[360px] min-h-64 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-950 sm:h-[430px]">
      <WebGLErrorBoundary>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [7, 5, 8], fov: 42, near: 0.1, far: 100 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          fallback={
            <div className="grid h-full place-items-center p-6 text-center text-sm text-slate-300">
              WebGL is unavailable. Use the accessible controls below.
            </div>
          }
        >
          <color attach="background" args={['#0b1928']} />
          <SimulationContents
            {...props}
            paused={props.paused || reducedMotion}
          />
          <OrbitControls
            enableDamping={!reducedMotion}
            dampingFactor={0.08}
            minDistance={4}
            maxDistance={18}
            makeDefault
          />
          <CameraReset resetSignal={resetSignal} />
          <LoadingState />
        </Canvas>
      </WebGLErrorBoundary>
      <button
        type="button"
        onClick={() => setResetSignal((current) => current + 1)}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-500 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-amber-300"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Reset camera
      </button>
      <p className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-950/75 px-2 py-1 text-[11px] text-slate-300">
        Drag to orbit · scroll or pinch to zoom
      </p>
    </div>
  );
}
