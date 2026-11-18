import * as THREE from 'three';
import type { CourseScene } from '@/lib/client-demo/types';

export type Point3 = [number, number, number];
export type StationMesh = {
  shape: 'box' | 'cylinder' | 'tube' | 'torus' | 'sphere' | 'seam' | 'bevel';
  args: number[];
  position: Point3;
  rotation?: Point3;
  color: string;
  text?: string;
};
export type StationPart = {
  id: string;
  label: string;
  detail: string;
  position: Point3; // Label anchor, immediately above the represented equipment.
  meshes: StationMesh[];
  motion?: 'roll' | 'scan' | 'lift' | 'strip';
};
export type StationModel = {
  type: CourseScene['diagramType'];
  parts: StationPart[];
  note: string;
};
export type ModelOptions = {
  angle: number;
  inspectionView: string;
  selectedDefect: string;
};
const steel = '#94a3b8',
  dark = '#334155',
  blue = '#0284c7',
  yellow = '#fbbf24',
  green = '#16a34a',
  red = '#dc2626';
const box = (
  position: Point3,
  args: Point3,
  color = steel,
  text?: string,
): StationMesh => ({ shape: 'box', position, args, color, text });
const cylinder = (
  position: Point3,
  radius: number,
  length: number,
  color = steel,
  rotation: Point3 = [Math.PI / 2, 0, 0],
): StationMesh => ({
  shape: 'cylinder',
  position,
  args: [radius, length],
  color,
  rotation,
});
const tube = (
  position: Point3,
  radius: number,
  length: number,
  color = steel,
  inner = radius * 0.8,
): StationMesh => ({
  shape: 'tube',
  position,
  args: [radius, inner, length],
  color,
  rotation: [0, 0, Math.PI / 2],
});
const part = (
  id: string,
  label: string,
  position: Point3,
  detail: string,
  meshes: StationMesh[],
  motion?: StationPart['motion'],
): StationPart => ({ id, label, position, detail, meshes, motion });
const pipeSupports = (x: number) => [
  box([x, 0.2, 0], [0.35, 0.4, 2], dark),
  cylinder([x, 0.45, -0.6], 0.17, 0.6, dark),
  cylinder([x, 0.45, 0.6], 0.17, 0.6, dark),
];
const gauge = (x: number, y: number, z: number, text: string) => [
  cylinder([x, y, z], 0.43, 0.15, '#f8fafc'),
  box([x, y, z + 0.1], [0.64, 0.22, 0.025], '#f8fafc', text),
  box([x, y - 0.6, z], [0.1, 0.6, 0.1], dark),
];
const person = (x: number, z: number): StationMesh[] => [
  { shape: 'sphere', position: [x, 2.1, z], args: [0.23], color: '#d6a575' },
  cylinder([x, 2.3, z], 0.29, 0.14, yellow, [0, 0, 0]),
  box([x, 1.45, z], [0.65, 0.85, 0.4], '#fb923c'),
  box([x - 0.4, 1.4, z], [0.17, 0.7, 0.2], blue),
  box([x + 0.4, 1.4, z], [0.17, 0.7, 0.2], blue),
  box([x - 0.18, 0.65, z], [0.22, 0.85, 0.25], dark),
  box([x + 0.18, 0.65, z], [0.22, 0.85, 0.25], dark),
  box([x - 0.18, 0.16, z + 0.08], [0.27, 0.2, 0.48], '#111827'),
  box([x + 0.18, 0.16, z + 0.08], [0.27, 0.2, 0.48], '#111827'),
];
const lock = (x: number, y: number, z: number): StationMesh[] => [
  box([x, y, z], [0.3, 0.32, 0.15], red),
  {
    shape: 'torus',
    position: [x, y + 0.2, z],
    args: [0.12, 0.035],
    color: steel,
  },
];

// One explicit model for every chapter. No generic geometry fallback is used.
export function getStationModel(
  type: CourseScene['diagramType'],
  options: ModelOptions,
): StationModel {
  let parts: StationPart[];
  let note = '';
  switch (type) {
    case 'coil_receiving':
      parts = [
        part(
          'coil',
          'Incoming steel coil',
          [-2, 2.8, 0],
          'A hollow hot-rolled coil rests on its receiving saddle before loading. Check its identity before it enters the line.',
          [
            tube([-2, 1.3, 0], 1.15, 1.4, steel, 0.4),
            box([-2, 0.1, 0], [2, 0.2, 2.6], dark),
            box([-2, 0.35, -0.85], [1.7, 0.5, 0.3], dark),
            box([-2, 0.35, 0.85], [1.7, 0.5, 0.3], dark),
          ],
        ),
        part(
          'stamp',
          'Hard stamp: 8419',
          [-1.8, 2.1, 1.25],
          'The permanent heat stamp belongs on the steel surface, not on a separate machine. Compare Heat 8419 against the tag and MTR.',
          [box([-1.8, 1.45, 1.17], [0.9, 0.3, 0.06], '#dbe4ed', 'HEAT 8419')],
        ),
        part(
          'documents',
          'Tag / MTR: 8410',
          [1.35, 2.5, 0],
          'This sample tag reads 8410 while the steel stamp reads 8419. The mismatch requires a hold and QC escalation before loading.',
          [
            box([1.35, 1.3, 0], [1.25, 1.5, 0.12], '#ffffff', 'MTR 8410'),
            box([1.35, 0.45, 0], [0.12, 0.8, 0.12], dark),
          ],
        ),
        part(
          'thickness',
          'UT thickness probe',
          [-2, 1.9, -1.25],
          'The contact probe represents thickness measurement on the coil; it is separate from the heat-number check.',
          [
            box([-2, 1.3, -1.15], [0.35, 0.3, 0.35], blue),
            box([-2, 1.55, -1.15], [0.14, 0.25, 0.14], '#1e293b'),
          ],
        ),
        part(
          'hold',
          'Yellow HOLD tag',
          [3.1, 2.1, 0.2],
          'Do not load discrepant material. Apply a hold and notify Quality Control while the heat identities are reconciled.',
          [
            box([3.1, 1.15, 0.2], [0.8, 0.65, 0.06], yellow, 'HOLD'),
            box([3.1, 0.55, 0.2], [0.05, 0.6, 0.05], dark),
          ],
        ),
      ];
      note =
        'Compare the permanent heat stamp with the tag/MTR: the sample deliberately shows the chapter’s 8419 / 8410 mismatch.';
      break;
    case 'strip_prep': {
      const rollers = Array.from({ length: 9 }, (_, i) =>
        cylinder(
          [-2.5 + i * 0.4, i % 2 ? 1.38 : 0.78, 0],
          0.25,
          1.8,
          i % 2 ? blue : steel,
        ),
      );
      parts = [
        part(
          'strip',
          'Steel strip',
          [-3.5, 1.8, 0],
          'Strip travels between alternating leveling rolls before both edges are milled.',
          [box([-0.8, 1.08, 0], [7.2, 0.1, 1.35], steel)],
          'strip',
        ),
        part(
          'leveler',
          'Nine alternating rolls',
          [-1, 3.1, 0],
          'Five lower rolls and four upper rolls reverse-bend the strip to remove coil curvature.',
          rollers,
          'roll',
        ),
        part(
          'mills',
          'Paired edge mills',
          [2.3, 2.5, 0],
          'A cutter works on each strip edge; milling creates the prepared weld faces.',
          [
            cylinder([2.3, 1.1, -0.9], 0.45, 0.3, blue, [0, 0, 0]),
            cylinder([2.3, 1.1, 0.9], 0.45, 0.3, blue, [0, 0, 0]),
            box([2.3, 0.4, 0], [1.5, 0.6, 2.5], dark),
          ],
        ),
        part(
          'bevel',
          'Double-V edge section',
          [3.7, 1.9, 1.2],
          'The enlarged edge sample shows opposed bevel faces and a central root land. Use the chapter’s gauge checks; the display is not to scale.',
          [
            {
              shape: 'bevel',
              position: [3.7, 0.9, 1.4],
              args: [0.9, 0.7, 0.8],
              color: steel,
            },
            box([4.16, 0.9, 1.4], [0.03, 0.12, 0.8], yellow),
          ],
        ),
      ];
      note =
        'The flattener contains nine rolls; the cutters sit at opposite strip edges. The bevel section is enlarged for inspection.';
      break;
    }
    case 'helical_forming': {
      const radians = THREE.MathUtils.degToRad(options.angle);
      parts = [
        part(
          'strip',
          'Angled feed strip',
          [-3.3, 2.2, 1],
          'The feed strip meets the three-roll forming head at the selected angle.',
          [
            {
              ...box([-3, 1, 0], [3.1, 0.1, 1.1], steel),
              rotation: [0, radians, 0],
            },
          ],
        ),
        part(
          'rolls',
          'Three forming rolls',
          [-1, 2.8, -0.5],
          'Three bending rolls progressively curve the strip into a hollow cylinder.',
          [
            cylinder([-1.2, 0.65, -0.7], 0.35, 2.1, blue),
            cylinder([-0.2, 0.65, 0.7], 0.35, 2.1, blue),
            cylinder([-0.7, 1.65, 0], 0.35, 2.1, blue),
          ],
          'roll',
        ),
        part(
          'pipe',
          'Hollow formed pipe',
          [2.3, 2.8, 0],
          'The emerging pipe is hollow. Forming precedes the permanent inside and outside submerged-arc weld passes.',
          [tube([2.1, 1.2, 0], 1, 4, steel)],
        ),
        part(
          'seam',
          'Helical meeting edges',
          [2.2, 2.1, 1.1],
          'The spiral line represents adjoining strip edges; changing feed angle changes the illustrative seam pitch.',
          [
            {
              shape: 'seam',
              position: [2.1, 1.2, 0],
              args: [1.02, 3.9, options.angle],
              color: yellow,
            },
          ],
        ),
      ];
      note =
        'The angle slider changes feed-strip orientation and seam pitch. Dimensions are schematic, not a mill setup calculation.';
      break;
    }
    case 'submerged_arc_welding':
      parts = [
        part(
          'pipe',
          'Pipe / helical seam',
          [0, 3.1, 0],
          'The formed pipe has a spiral joint that receives separate ID and OD weld passes.',
          [
            tube([0, 1.25, 0], 1.05, 6.5, steel),
            {
              shape: 'seam',
              position: [0, 1.25, 0],
              args: [1.06, 6.3, 24],
              color: '#fb923c',
            },
          ],
        ),
        part(
          'od',
          'OD wire and flux blanket',
          [0.7, 3.8, 0.3],
          'The outside wire enters a blanket of granular flux. The arc is covered rather than shown as an exposed welding flame.',
          [
            cylinder([0.7, 2.95, 0], 0.26, 0.65, blue, [0, 0, 0]),
            box([0.7, 2.5, 0], [0.09, 0.4, 0.09], steel),
            box([0.7, 2.31, 0], [1, 0.13, 0.5], '#b69a64'),
          ],
        ),
        part(
          'id',
          'ID welding lance',
          [-3.3, 2.1, 0.5],
          'A lance reaches through the open pipe end for the internal pass; the two stations represent successive operations.',
          [
            box([-2, 1.55, 0], [4.4, 0.12, 0.12], blue),
            box([-0.1, 1.65, 0], [0.15, 0.3, 0.15], '#fb923c'),
          ],
        ),
        part(
          'flux',
          'Dry flux hopper',
          [2.6, 3.6, -0.6],
          'Keep the flux dry and maintain its coverage. Moisture can contribute to weld porosity.',
          [
            box([2.6, 2.5, -0.6], [1, 0.8, 0.8], '#d6ba80'),
            box([2.6, 1.8, -0.6], [0.15, 0.65, 0.15], dark),
          ],
        ),
      ];
      break;
    case 'quality_testing':
      parts = [
        part(
          'pipe',
          'Pipe under test',
          [0, 2.8, 0],
          'A pipe joint is supported for two different checks: UT scans the weld, while a water-filled hydrostatic test checks pressure integrity.',
          [
            tube([0, 1.2, 0], 0.8, 6, steel),
            ...pipeSupports(-2),
            ...pipeSupports(2),
          ],
        ),
        part(
          'ut',
          'UT scanner gantry',
          [0, 3.5, 0],
          'The scanning head traverses the weld region. Its motion is an illustration of ultrasonic inspection, not a diagnostic result.',
          [
            box([0, 2.35, 0], [0.65, 0.25, 1.5], blue),
            box([0, 2, 0], [0.18, 0.5, 0.3], blue),
          ],
          'scan',
        ),
        part(
          'hydro',
          'Hydrostatic end seals',
          [-3.2, 2.2, 0.5],
          'Both pipe ends are sealed for the water-pressure proof test. UT and hydrostatic testing are separate operations.',
          [
            cylinder([-3.15, 1.2, 0], 0.85, 0.3, blue, [0, 0, Math.PI / 2]),
            cylinder([3.15, 1.2, 0], 0.85, 0.3, blue, [0, 0, Math.PI / 2]),
            box([3.6, 0.65, 0], [0.15, 1.3, 0.15], blue),
            box([3.3, 0.1, 0], [0.7, 0.12, 0.15], blue),
          ],
        ),
        part(
          'gauge',
          'Pressure monitoring',
          [3.65, 2.9, 1.3],
          'Monitor the pressure and test record; a model gauge is not an acceptance decision. Stay outside the test exclusion area.',
          gauge(3.65, 1.6, 1.3, 'PRESSURE'),
        ),
      ];
      note =
        'UT scanning and the sealed hydrostatic setup are shown together for comparison; they are distinct inspection operations.';
      break;
    case 'release_dispatch':
      parts = [
        part(
          'coating',
          '3LPE coating section',
          [0, 3, 0],
          'The cutaway separates steel, epoxy primer, adhesive and the outer polyethylene jacket. Layer thickness is exaggerated for clarity.',
          [
            tube([0.6, 1.2, 0], 0.85, 5.8, steel),
            tube([0.9, 1.2, 0], 0.9, 4.9, '#b45339', 0.85),
            tube([1.15, 1.2, 0], 0.96, 4.2, '#dca62e', 0.9),
            tube([1.4, 1.2, 0], 1.02, 3.5, '#1e293b', 0.96),
          ],
        ),
        part(
          'bevel',
          'Bare beveled pipe end',
          [-2.7, 2.4, 0],
          'The field-weld end remains bare. The annular end face represents the bevel/cut-back inspection area.',
          [tube([-2.5, 1.2, 0], 0.86, 0.4, steel, 0.72)],
        ),
        part(
          'stencil',
          'Pedigree stencil',
          [1.5, 2.1, 1.2],
          'Check the finished pipe identity against its release dossier before applying a release stamp.',
          [box([1.5, 1.5, 1.02], [2, 0.28, 0.03], '#ffffff', 'PIPE W0417')],
        ),
        part(
          'dispatch',
          'Dispatch supports',
          [1, 0.9, -1.9],
          'Protect the coating during handling and verify the release records before dispatch.',
          [
            ...pipeSupports(-1.8),
            ...pipeSupports(2.5),
            box([1, 0.1, -2], [3, 0.15, 0.65], green, 'QA RELEASE'),
          ],
        ),
      ];
      break;
    case 'ppe_safety':
      parts = [
        part(
          'worker',
          'Helmet / eye protection',
          [-1, 3.2, 0],
          'The operator wears head and eye protection before entering the production zone.',
          [
            ...person(-1, 0),
            box([-1, 2.15, 0.24], [0.39, 0.1, 0.08], '#0ea5e9'),
          ],
        ),
        part(
          'gloves',
          'Gloves and fitted clothing',
          [-1.6, 1.9, 0.1],
          'Keep clothing fitted and hands protected according to the task. Avoid loose items near rotating equipment.',
          [
            box([-1.4, 1.04, 0], [0.2, 0.18, 0.22], yellow),
            box([-0.6, 1.04, 0], [0.2, 0.18, 0.22], yellow),
          ],
        ),
        part(
          'boots',
          'Safety footwear',
          [-0.4, 0.9, 0.7],
          'The boots protect the feet; PPE does not replace segregation from moving machinery.',
          [
            box([-1.18, 0.17, 0.12], [0.28, 0.22, 0.5], dark),
            box([-0.82, 0.17, 0.12], [0.28, 0.22, 0.5], dark),
          ],
        ),
        part(
          'walkway',
          'Marked pedestrian route',
          [1.8, 0.9, 1.5],
          'Stay within the marked walkway and away from transfer-car routes.',
          [
            box([1.5, 0.025, 1.6], [5.5, 0.04, 1.4], green),
            box([1.5, 0.06, 0.9], [5.5, 0.03, 0.06], yellow),
            box([1.5, 0.06, 2.3], [5.5, 0.03, 0.06], yellow),
          ],
        ),
      ];
      break;
    case 'hazard_loads':
      parts = [
        part(
          'load',
          'Suspended coil',
          [0, 3.6, 0],
          'The suspended coil can swing or fall. Never stand beneath it or enter its travel path.',
          [
            tube([0, 2, 0], 0.85, 1.3, steel, 0.35),
            box([0, 3.3, 0], [0.08, 1, 0.08], yellow),
            box([0, 3.9, 0], [6.5, 0.25, 0.3], blue),
          ],
          'lift',
        ),
        part(
          'zone',
          'Load exclusion zone',
          [0, 0.8, 1.6],
          'The floor boundary represents an exclusion area, not a measured safe distance.',
          [
            box([0, 0.025, 1.7], [4, 0.04, 0.1], yellow),
            box([0, 0.025, -1.7], [4, 0.04, 0.1], yellow),
            box([-2, 0.025, 0], [0.1, 0.04, 3.4], yellow),
            box([2, 0.025, 0], [0.1, 0.04, 3.4], yellow),
          ],
        ),
        part(
          'pinch',
          'Coil-car pinch interface',
          [3.4, 2.2, 0],
          'Do not stand between the moving transfer car and the fixed machine frame.',
          [
            box([2.5, 0.55, 0], [1.2, 0.65, 1.6], blue),
            box([3.7, 0.9, 0], [0.55, 1.8, 2], dark),
            box([3.12, 0.55, 0.86], [0.2, 0.65, 0.05], red),
          ],
        ),
        part(
          'walkway',
          'Separated safe walkway',
          [-3.3, 2.8, 1.2],
          'Use the segregated pedestrian route outside the suspended-load exclusion boundary.',
          [...person(-3.4, 1.2), box([-3.4, 0.025, 0], [1.25, 0.04, 5], green)],
        ),
      ];
      break;
    case 'loto_isolation':
      parts = [
        part(
          'machine',
          'Welding carriage',
          [0, 2.8, 0],
          'The machine remains a maintenance hazard until all hazardous energy has been isolated and verified.',
          [
            box([0, 1.1, 0], [2, 1.8, 1.5], dark),
            box([0, 2.1, 0], [0.6, 0.25, 0.6], blue),
          ],
        ),
        part(
          'disconnect',
          'Electrical isolator + lock',
          [-2.7, 2.9, 0],
          'A stopped console is not electrical isolation. The disconnect is shown open and secured by a personal lock.',
          [
            box([-2.7, 1.6, 0], [0.8, 1.3, 0.3], steel),
            {
              ...box([-2.7, 1.7, 0.25], [0.12, 0.6, 0.12], red),
              rotation: [0, 0, Math.PI / 4],
            },
            ...lock(-2.4, 1.15, 0.3),
          ],
        ),
        part(
          'hydraulic',
          'Hydraulic / pneumatic valves',
          [2.5, 2.6, 0],
          'Isolate hydraulic and pneumatic supplies and dissipate stored pressure according to the controlled procedure.',
          [
            box([2.5, 1.7, 0], [0.15, 0.15, 2.3], blue),
            box([2.5, 1.1, 0], [0.15, 0.15, 2.3], yellow),
            box([2.5, 1.9, 0], [0.7, 0.08, 0.15], red),
            box([2.5, 1.3, 0], [0.7, 0.08, 0.15], red),
            ...lock(2.8, 1.5, 0.3),
          ],
        ),
        part(
          'verify',
          'Verify zero energy',
          [3.6, 2.2, 1.5],
          'A zero-energy check follows isolation and dissipation; the model is not a complete LOTO procedure.',
          gauge(3.4, 1.1, 1.5, 'ZERO'),
        ),
      ];
      break;
    case 'near_miss':
      parts = [
        part(
          'hose',
          'Leaking hydraulic hose',
          [-1, 2.1, 0],
          'The chapter’s near miss starts with a weeping hydraulic hose beside the tester conveyor.',
          [
            box([-1, 1, 0], [3, 0.16, 0.16], dark),
            box([-1, 0.65, 0], [0.16, 0.7, 0.16], blue),
            {
              shape: 'sphere',
              position: [-1, 0.2, 0.1],
              args: [0.12],
              color: '#0284c7',
            },
          ],
        ),
        part(
          'spill',
          'Fluid on the floor',
          [-0.8, 0.8, 0.6],
          'The fluid spill creates a slip hazard before anyone is injured. Secure the area and report it.',
          [cylinder([-0.8, 0.035, 0.6], 0.85, 0.035, '#2563eb', [0, 0, 0])],
        ),
        part(
          'conduit',
          'Nearby electrical conduit',
          [1.4, 1.4, 0],
          'Fluid near electrical equipment adds a hazard; avoid contact and escalate for qualified control.',
          [
            box([1.4, 0.15, 0], [0.12, 0.12, 3.5], steel),
            box([1.4, 0.7, -1.6], [0.6, 1, 0.2], dark),
          ],
        ),
        part(
          'report',
          'Barricade and report',
          [2.6, 2.5, 1.4],
          'A near miss requires prompt reporting and controlled cleanup, even when there is no injury.',
          [
            box([2.6, 1, 1.4], [1.4, 0.7, 0.15], yellow, 'REPORT'),
            box([2, 0.5, 1.4], [0.1, 1, 0.1], dark),
            box([3.2, 0.5, 1.4], [0.1, 1, 0.1], dark),
          ],
        ),
      ];
      break;
    case 'inspection_gates':
      parts = [
        part(
          'incoming',
          '1 · Incoming coil',
          [-3, 2.4, -1.4],
          'Confirm the heat identity and incoming material dimensions before processing.',
          [tube([-3, 1, -1.4], 0.65, 0.9, steel, 0.25)],
        ),
        part(
          'milling',
          '2 · Strip milling',
          [0, 2.4, -1.4],
          'Check strip preparation and bevel geometry at the prescribed inspection intervals.',
          [
            box([0, 0.9, -1.4], [1.8, 0.1, 0.8], steel),
            cylinder([0, 0.8, -1.9], 0.3, 0.25, blue, [0, 0, 0]),
            cylinder([0, 0.8, -0.9], 0.3, 0.25, blue, [0, 0, 0]),
          ],
        ),
        part(
          'welding',
          '3 · Helical welding',
          [3, 2.5, -1.4],
          'Monitor weld preparation and controlled welding parameters during production.',
          [
            tube([3, 1, -1.4], 0.55, 1.7, steel),
            box([3, 1.85, -1.4], [0.15, 0.7, 0.15], blue),
          ],
        ),
        part(
          'hydro',
          '4 · Hydrostatic test',
          [-3, 2.2, 1.6],
          'Check pressure integrity using the controlled hydrostatic test procedure.',
          [
            tube([-3, 1, 1.6], 0.55, 1.7, steel),
            cylinder([-3.9, 1, 1.6], 0.58, 0.15, blue, [0, 0, Math.PI / 2]),
            cylinder([-2.1, 1, 1.6], 0.58, 0.15, blue, [0, 0, Math.PI / 2]),
          ],
        ),
        part(
          'ut',
          '5 · Ultrasonic test',
          [0, 2.5, 1.6],
          'Inspect the weld using the prescribed UT method and retain the test record.',
          [
            tube([0, 1, 1.6], 0.55, 1.7, steel),
            box([0, 1.8, 1.6], [0.5, 0.2, 1.3], blue),
          ],
        ),
        part(
          'release',
          '6 · Final release',
          [3, 2.4, 1.6],
          'Verify the required inspections and documentation before the final release decision.',
          [
            tube([3, 1, 1.6], 0.55, 1.7, dark),
            box([3, 0.2, 2.3], [1.8, 0.15, 0.5], green, 'RELEASE'),
          ],
        ),
        part(
          'calibration',
          'Calibration status',
          [0, 1, -3],
          'Check the calibration label and validity before using any measuring instrument.',
          [
            box([0, 0.45, -3], [1.8, 0.15, 0.15], steel),
            box([-0.5, 0.25, -3], [0.14, 0.5, 0.18], steel),
            box([0.2, 0.25, -3], [0.14, 0.5, 0.18], steel),
            box([0.2, 0.62, -3], [0.8, 0.2, 0.08], green, 'CAL VALID'),
          ],
        ),
      ];
      note =
        'Six inspection gates are shown as a learning sequence, not the plant layout. Sampling intervals and acceptance limits come from the controlled inspection plan.';
      break;
    case 'defect_types': {
      const defect = options.selectedDefect;
      // This is a local weld cross-section, not unrelated scanner/gauge equipment.
      const indication: StationMesh[] =
        defect === 'porosity'
          ? [-0.32, 0, 0.32].map((x) => ({
              shape: 'sphere',
              position: [x, 1.13, 0.72],
              args: [0.11],
              color: '#111827',
            }))
          : defect === 'lack_of_fusion'
            ? [
                {
                  ...box([0.43, 1.13, 0.72], [0.055, 0.55, 0.08], red),
                  rotation: [0, 0, -0.42],
                },
              ]
            : defect === 'lack_of_penetration'
              ? [box([0, 0.83, 0.72], [0.09, 0.3, 0.08], '#111827')]
              : [
                  {
                    ...box([0.68, 1.45, 0.72], [0.12, 0.18, 0.1], red),
                    rotation: [0, 0, 0.4],
                  },
                ];
      parts = [
        part(
          'parent',
          'Parent metal',
          [-2, 2.4, 0],
          'Two steel sections meet at the weld joint. The cutaway makes the weld profile and internal indications visible.',
          [
            box([-1.8, 1, 0], [2.2, 0.65, 1.4], steel),
            box([1.8, 1, 0], [2.2, 0.65, 1.4], steel),
          ],
        ),
        part(
          'weld',
          'Weld cap and root',
          [0, 3.2, 0],
          'The gold weld region joins the plates; its cap is above the face and its root is at the underside.',
          [
            box([0, 1.05, 0], [1.4, 0.7, 1.4], '#c4a66a'),
            cylinder([0, 1.4, 0], 0.24, 1.4, '#c4a66a'),
            box([0, 0.65, 0], [0.3, 0.14, 1.4], '#c4a66a'),
          ],
        ),
        part(
          'indication',
          defect === 'porosity'
            ? 'Gas pores'
            : defect === 'lack_of_fusion'
              ? 'Unfused sidewall'
              : defect === 'lack_of_penetration'
                ? 'Unfused root'
                : 'Weld-toe undercut',
          [0.8, 2.1, 1.1],
          'Use the defect selector to compare a weld-toe groove, internal pores, an unfused sidewall, and an unfused root. Locations are schematic and enlarged.',
          options.inspectionView === 'cross_section'
            ? indication
            : defect === 'undercut'
              ? indication
              : [],
        ),
      ];
      note =
        options.inspectionView === 'cross_section'
          ? 'Cutaway: internal indications are exposed at the section face.'
          : 'Surface view: internal pores and unfused interfaces require a section or a suitable inspection method.';
      break;
    }
    case 'traceability_lineage':
      parts = [
        part(
          'heat',
          'Heat record',
          [-3.4, 2.8, 0],
          'The steel heat is the beginning of the material lineage. Its chemistry is recorded in the mill test report.',
          [box([-3.4, 1.3, 0], [1.3, 1.5, 0.12], '#ffffff', 'HEAT 8419')],
        ),
        part(
          'coil',
          'Identified coil',
          [-1, 2.5, 0],
          'The coil ID links the received steel back to the heat record.',
          [
            tube([-1, 1.1, 0], 0.85, 1, steel, 0.35),
            box([-1, 1.2, 0.85], [0.8, 0.3, 0.03], yellow, 'COIL C17'),
          ],
        ),
        part(
          'pipe',
          'Serialized finished pipe',
          [2, 2.7, 0],
          'The pipe serial number links the finished product to its coil, weld, operator and inspection records.',
          [
            tube([2, 1, 0], 0.7, 3, steel),
            box([2, 1, 0.72], [1.5, 0.3, 0.03], '#ffffff', 'PIPE W0417'),
          ],
        ),
        part(
          'records',
          'MTR / test dossier',
          [3.5, 2.8, -1.5],
          'The test dossier retains the chain of identity. Never invent a missing pipe number; ambiguous identity requires a hold.',
          [box([3.5, 1.4, -1.5], [1.2, 1.4, 0.12], green, '8419 / W0417')],
        ),
      ];
      note =
        'Matching example identifiers show the chain from heat to coil to pipe and test records.';
      break;
    case 'quarantine_ncr':
      parts = [
        part(
          'pipe',
          'Held pipe',
          [-1, 2.9, 0],
          'A pipe with an unresolved nonconformance is physically segregated from releasable material.',
          [
            tube([-1, 1.1, 0], 0.85, 4.5, steel),
            ...pipeSupports(-2.4),
            ...pipeSupports(0.5),
          ],
        ),
        part(
          'tag',
          'Red HOLD tag',
          [-0.5, 2.1, 1],
          'The attached red tag prevents accidental release while the nonconformance is investigated.',
          [box([-0.5, 1.35, 0.9], [0.85, 0.55, 0.05], red, 'HOLD')],
        ),
        part(
          'bay',
          'Quarantine boundary',
          [-1, 1, 2],
          'The marked bay separates held material from the dispatch route.',
          [
            box([-1, 0.035, 1.9], [5.3, 0.05, 0.12], red),
            box([-1, 0.035, -1.9], [5.3, 0.05, 0.12], red),
            box([-3.65, 0.035, 0], [0.12, 0.05, 3.8], red),
            box([1.65, 0.035, 0], [0.12, 0.05, 3.8], red),
          ],
        ),
        part(
          'ncr',
          'NCR / QA disposition',
          [3.2, 2.8, 0],
          'Only authorized QA disposition can release or otherwise resolve the NCR. A production schedule cannot override the hold.',
          [
            box([3.2, 1.4, 0], [1.4, 1.7, 0.12], '#ffffff', 'NCR OPEN'),
            box([3.2, 0.35, 0], [0.12, 0.7, 0.12], dark),
          ],
        ),
      ];
      break;
    default: {
      const exhaustive: never = type;
      throw new Error(`No chapter-specific model for ${exhaustive}`);
    }
  }
  return { type, parts, note };
}

export function createStationGeometry(mesh: StationMesh): THREE.BufferGeometry {
  const [a = 1, b = 1, c = 1] = mesh.args;
  switch (mesh.shape) {
    case 'bevel': {
      const shape = new THREE.Shape();
      shape.moveTo(-a / 2, -b / 2);
      shape.lineTo(a / 2 - 0.2, -b / 2);
      shape.lineTo(a / 2, -0.06);
      shape.lineTo(a / 2, 0.06);
      shape.lineTo(a / 2 - 0.2, b / 2);
      shape.lineTo(-a / 2, b / 2);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: c,
        bevelEnabled: false,
      });
      geometry.translate(0, 0, -c / 2);
      return geometry;
    }
    case 'box':
      return new THREE.BoxGeometry(a, b, c);
    case 'cylinder':
      return new THREE.CylinderGeometry(a, a, b, 20);
    case 'sphere':
      return new THREE.SphereGeometry(a, 12, 8);
    case 'torus':
      return new THREE.TorusGeometry(a, b, 8, 24);
    case 'tube':
      return new THREE.LatheGeometry(
        [
          new THREE.Vector2(b, -c / 2),
          new THREE.Vector2(a, -c / 2),
          new THREE.Vector2(a, c / 2),
          new THREE.Vector2(b, c / 2),
          new THREE.Vector2(b, -c / 2),
        ],
        24,
      );
    case 'seam': {
      const turns = 1.1 + (c - 12) / 20;
      const curve = new THREE.CatmullRomCurve3(
        Array.from({ length: 80 }, (_, i) => {
          const t = i / 79;
          return new THREE.Vector3(
            (t - 0.5) * b,
            Math.cos(t * Math.PI * 2 * turns) * a,
            Math.sin(t * Math.PI * 2 * turns) * a,
          );
        }),
      );
      return new THREE.TubeGeometry(curve, 80, 0.035, 5, false);
    }
  }
}

export function partOffset(part: StationPart, phase: number): Point3 {
  return part.motion === 'scan'
    ? [Math.sin(phase) * 2, 0, 0]
    : part.motion === 'lift'
      ? [0, Math.sin(phase) * 0.13, 0]
      : [0, 0, 0];
}
