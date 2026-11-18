'use client';
import dynamic from 'next/dynamic';
import type { CourseScene } from '@/lib/client-demo/types';
import { HelicalFormingVisualizer } from '@/components/client-demo/helical-visualizer';
const Simulation = dynamic(
  () =>
    import('@/components/client-demo/three-simulation').then(
      (module) => module.ThreeSimulation,
    ),
  { ssr: false, loading: () => <p>Loading interactive simulation…</p> },
);
const kinds = [
  'coil_receiving',
  'strip_prep',
  'helical_forming',
  'submerged_arc_welding',
  'quality_testing',
  'release_dispatch',
  'ppe_safety',
  'hazard_loads',
  'loto_isolation',
  'near_miss',
  'inspection_gates',
  'defect_types',
  'traceability_lineage',
  'quarantine_ncr',
];
export function LessonSimulation({
  lesson,
}: {
  lesson: {
    title: string;
    referenceRoute?: string;
    diagramType?: string;
    hasInteractiveVisualizer?: boolean;
  };
}) {
  return (
    <div className="mt-6 space-y-6">
      {lesson.referenceRoute ? (
        <iframe
          title={lesson.title + ' simulation'}
          src={
            '/learning/welspun-reference.html#' +
            encodeURIComponent(lesson.referenceRoute)
          }
          sandbox="allow-scripts"
          className="h-[680px] w-full rounded border"
        />
      ) : lesson.diagramType && kinds.includes(lesson.diagramType) ? (
        <Simulation
          key={lesson.diagramType}
          scene={{
            title: lesson.title,
            diagramType: lesson.diagramType as CourseScene['diagramType'],
          }}
        />
      ) : null}
      {lesson.hasInteractiveVisualizer && <HelicalFormingVisualizer />}
    </div>
  );
}
