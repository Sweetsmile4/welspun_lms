'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  createStationGeometry,
  partOffset,
  type StationModel,
} from './station-models';

export type StationView = { yaw: number; pitch: number; distance: number };
export const INITIAL_STATION_VIEW: StationView = {
  yaw: 0.73,
  pitch: 0.38,
  distance: 13,
};
// Project real mesh geometry to SVG so the activity also works without WebGL.
export function SoftwareStation({
  model,
  selected,
  onSelect,
  view,
  onViewChange,
  paused,
  whiteBackground,
}: {
  model: StationModel;
  selected: string;
  onSelect: (id: string) => void;
  view: StationView;
  onViewChange: (view: StationView) => void;
  paused: boolean;
  whiteBackground: boolean;
}) {
  const [phase, setPhase] = useState(0);
  const drag = useRef<{
    x: number;
    y: number;
    view: StationView;
    moved: boolean;
  } | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ length: number; view: StationView } | null>(null);
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    let frame = 0;
    let last = performance.now();
    const animate = (now: number) => {
      if (now - last > 50) {
        setPhase((value) => value + Math.min(now - last, 100) * 0.0006);
        last = now;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused]);
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      onViewChange({
        ...view,
        distance: Math.max(
          5,
          Math.min(20, view.distance * Math.exp(event.deltaY * 0.001)),
        ),
      });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [view, onViewChange]);

  const objects = useMemo(
    () =>
      model.parts.flatMap((part) =>
        part.meshes.map((mesh, meshIndex) => {
          const geometry = createStationGeometry(mesh);
          const transform = new THREE.Matrix4().compose(
            new THREE.Vector3(...mesh.position),
            new THREE.Quaternion().setFromEuler(
              new THREE.Euler(...(mesh.rotation ?? [0, 0, 0])),
            ),
            new THREE.Vector3(1, 1, 1),
          );
          const positions = geometry.getAttribute('position');
          const indices = geometry.index;
          const vertices = Array.from({ length: positions.count }, (_, i) =>
            new THREE.Vector3()
              .fromBufferAttribute(positions, i)
              .applyMatrix4(transform),
          );
          const triangles = Array.from(
            { length: (indices?.count ?? positions.count) / 3 },
            (_, i) =>
              [0, 1, 2].map((j) =>
                indices ? indices.getX(i * 3 + j) : i * 3 + j,
              ),
          );
          geometry.dispose();
          return {
            id: part.id,
            label: part.label,
            part,
            key: part.id + '-' + meshIndex,
            vertices,
            triangles,
            color: mesh.color,
          };
        }),
      ),
    [model],
  );

  const { faces, labels } = useMemo(() => {
    const camera = new THREE.PerspectiveCamera(42, 640 / 360, 0.1, 100);
    camera.position.set(
      Math.sin(view.yaw) * Math.cos(view.pitch) * view.distance,
      1 + Math.sin(view.pitch) * view.distance,
      Math.cos(view.yaw) * Math.cos(view.pitch) * view.distance,
    );
    camera.lookAt(0, 1, 0);
    camera.updateMatrixWorld();

    const faces = objects
      .flatMap((object) => {
        const offset = new THREE.Vector3(...partOffset(object.part, phase));
        const vertices = object.vertices.map((vertex) =>
          vertex.clone().add(offset),
        );
        return object.triangles.map((triangle, i) => {
          const points = triangle.map((index) => vertices[index]!);
          const normal = new THREE.Vector3()
            .subVectors(points[1]!, points[0]!)
            .cross(new THREE.Vector3().subVectors(points[2]!, points[0]!))
            .normalize();
          const light =
            0.55 +
            Math.abs(normal.dot(new THREE.Vector3(0.4, 0.8, 0.5).normalize())) *
              0.45;
          const color = new THREE.Color(
            object.id === selected ? '#fbbf24' : object.color,
          ).multiplyScalar(light);
          const projected = points.map((point) =>
            point.clone().project(camera),
          );
          return {
            key: object.key + i,
            id: object.id,
            label: object.label,
            points: projected
              .map((point) => `${320 + point.x * 320},${180 - point.y * 180}`)
              .join(' '),
            depth:
              points.reduce(
                (sum, point) => sum + point.distanceToSquared(camera.position),
                0,
              ) / 3,
            fill: '#' + color.getHexString(),
          };
        });
      })
      .sort((a, b) => b.depth - a.depth);
    const placed: { x: number; y: number; width: number }[] = [];
    const labels = model.parts.map((part) => {
      const point = new THREE.Vector3(...part.position)
        .add(new THREE.Vector3(...partOffset(part, phase)))
        .project(camera);
      const width = Math.max(84, part.label.length * 6.4);
      const anchorX = 320 + point.x * 320,
        anchorY = 180 - point.y * 180;
      const x = Math.max(width / 2 + 4, Math.min(636 - width / 2, anchorX));
      let y = anchorY;
      for (let attempt = 0; attempt < model.parts.length; attempt++) {
        const collision = placed.find(
          (other) =>
            Math.abs(other.x - x) < (other.width + width) / 2 + 6 &&
            Math.abs(other.y - y) < 29,
        );
        if (!collision) break;
        y = collision.y - 31;
      }
      placed.push({ x, y, width });
      return { id: part.id, label: part.label, x, y, anchorX, anchorY };
    });
    return { faces, labels };
  }, [objects, model, view, phase, selected]);

  return (
    <svg
      ref={svg}
      viewBox="0 0 640 360"
      className={`h-full w-full touch-none ${whiteBackground ? 'bg-slate-50' : 'bg-slate-900'}`}
      role="group"
      aria-label="Interactive station model without WebGL"
      data-renderer="software"
      data-view={`${view.yaw.toFixed(2)},${view.pitch.toFixed(2)},${view.distance.toFixed(2)}`}
      data-selection={selected}
      style={{ cursor: 'grab' }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          pinch.current = {
            length: Math.hypot(a!.x - b!.x, a!.y - b!.y),
            view,
          };
          drag.current = null;
          return;
        }
        drag.current = {
          x: event.clientX,
          y: event.clientY,
          view,
          moved: false,
        };
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
        if (pinch.current && pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          const length = Math.max(1, Math.hypot(a!.x - b!.x, a!.y - b!.y));
          onViewChange({
            ...pinch.current.view,
            distance: Math.max(
              5,
              Math.min(
                20,
                (pinch.current.view.distance * pinch.current.length) / length,
              ),
            ),
          });
          return;
        }
        const start = drag.current;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) start.moved = true;
        if (start.moved)
          onViewChange({
            ...start.view,
            yaw: start.view.yaw - dx * 0.01,
            pitch: Math.max(-0.2, Math.min(1.3, start.view.pitch + dy * 0.008)),
          });
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId);
        pinch.current = null;
        const start = drag.current;
        if (start && !start.moved) {
          const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('[data-component]');
          const id = target?.getAttribute('data-component');
          if (id) onSelect(id);
        }
        drag.current = null;
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        pinch.current = null;
        drag.current = null;
      }}
    >
      <ellipse
        cx="320"
        cy="285"
        rx="240"
        ry="30"
        fill={whiteBackground ? '#cbd5e1' : '#020617'}
        opacity="0.5"
      />
      {faces.map((face) => (
        <polygon
          key={face.key}
          points={face.points}
          fill={face.fill}
          stroke={face.fill}
          strokeWidth="0.5"
          data-component={face.id}
        >
          <title>{face.label}</title>
        </polygon>
      ))}
      {labels.map((label) => (
        <g
          key={label.id}
          transform={`translate(${label.x},${label.y})`}
          data-component={label.id}
          data-part-label={label.id}
          role="button"
          tabIndex={0}
          aria-label={label.label}
          aria-pressed={selected === label.id}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onSelect(label.id);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <line
            x1="0"
            y1="0"
            x2={label.anchorX - label.x}
            y2={label.anchorY - label.y + 14}
            stroke="#64748b"
          />
          <rect
            x={-Math.max(42, label.label.length * 3.2)}
            y="-22"
            width={Math.max(84, label.label.length * 6.4)}
            height="23"
            rx="5"
            fill={selected === label.id ? '#fef3c7' : '#ffffff'}
            stroke={selected === label.id ? '#f59e0b' : '#94a3b8'}
          />
          <text
            y="-7"
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#0f172a"
          >
            {label.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
