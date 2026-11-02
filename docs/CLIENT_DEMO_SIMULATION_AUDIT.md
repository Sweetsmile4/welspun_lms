# Client Demo Simulation Audit

## Scope and evidence

This audit covers the runtime reachable from `http://127.0.0.1:3000/client-demo`, the typed content in `src/lib/client-demo/course-data.ts`, the reusable viewer in `src/components/client-demo/three-simulation.tsx`, and the supplied reference files:

- `Downloads/Welspun_Learning_Portal.html`
- `Downloads/Welspun Learning Portal_ Follow the Pipe and The Inspector’s Eye.html`
- `Downloads/Welspun Corp Technical Centre of Excellence_ Factory Twin & Visual Inspection Master Simulator.html`

The reference HTML is treated as supplied training material, not as independently verified engineering authority. Values or claims marked for confirmation remain subject-matter-expert questions.

## 1. Current runtime audit

### Route and LMS boundary

`/client-demo` is an isolated Next.js client-demo area. `layout.tsx` mounts `DemoProvider`, a disclaimer banner, a demo header, and the child route. The login page activates a fictional user and redirects to `/client-demo/dashboard`.

The dashboard exposes three typed courses:

| Course | Current scenes | Current simulation path | Current assessed interaction |
| --- | ---: | --- | --- |
| From Steel Coil to Finished Pipe (`pipe-process-101`) | 6 | `ThreeSimulation` for all scenes; dedicated HSAW geometry for scene 3 and generic stations elsewhere | One scenario quiz per scene |
| Shop Floor Safety Essentials (`safety-essentials-102`) | 4 | `ThreeSimulation` for all scenes; dedicated suspended-load model for scene 2 and generic stations elsewhere | One scenario quiz per scene |
| Quality Inspection & Traceability (`quality-basics-103`) | 4 | `ThreeSimulation` for all scenes; dedicated pipe/scanner model for scene 2 and generic stations elsewhere | One scenario quiz per scene |

### Components and data flow

- `src/app/client-demo/page.tsx`: fictional login and local-demo entry.
- `src/app/client-demo/dashboard/page.tsx`: course catalog and aggregate progress.
- `src/app/client-demo/course/[courseId]/page.tsx`: selects the saved scene index and renders `SceneViewer`.
- `src/components/client-demo/scene-viewer.tsx`: scene navigation, explanation modes, quiz rendering, and completion actions.
- `src/components/client-demo/three-simulation.tsx`: R3F canvas, OrbitControls, pause/reset, hotspot selection, one pipe angle slider, animation, and accessible text details.
- `src/components/client-demo/scenario-quiz.tsx`: one-answer scenario feedback.
- `src/components/client-demo/demo-context.tsx`: localStorage-backed progress and demo authentication state.
- `src/lib/client-demo/course-data.ts`: all current course content, explanations, standards, and quiz keys.
- `src/lib/client-demo/types.ts`: typed content and progress contracts.

### Current strengths

- Existing React Three Fiber, Three.js, and Drei dependencies are already available.
- Orbit rotation, zoom, pause, reset, hotspot selection, responsive canvas sizing, WebGL fallback, and accessible station details exist.
- Scene-specific labels are present for all current scene types.
- The explanation switcher separates simple, operator, and engineer content.
- Completion and answer state resumes from browser-local storage.

### Current limitations and risks

1. The dedicated models are still teaching-scale geometry. Most scenes use one generic rotating station with renamed hotspots; that does not represent the process decision the learner must make.
2. The viewer supports orbit and zoom but not pan, guided camera tours, exploded views, cross-sections, equipment state changes, or task state.
3. Hotspots explain components but do not require the learner to inspect, configure, diagnose, sequence, or release anything.
4. `SceneViewer.handleNext` calls `markSceneCompleted` before navigation, so a learner can complete a scene without answering its scenario correctly. `handleAnswer` also marks a scene complete on any selected answer.
5. `demo-context.tsx` writes progress only to localStorage. There is no server-side validation, authenticated LMS event, attempt record, score record, versioned content identifier, or instructor visibility.
6. `markCourseCompleted` can mark every scene complete from navigation. This is appropriate for a UX prototype but not for a qualification record.
7. The current content contains many specific plant, equipment, safety, and engineering claims without a structured source-status field or approval workflow.
8. The route has no guided/exploration mode distinction, no retry/attempt policy beyond replacing an answer, and no simulation completion contract separate from scene navigation.

## 2. Reference comparison matrix

| Reference experience | Supplied reference behavior | Current `/client-demo` coverage | Gap / priority |
| --- | --- | --- | --- |
| Follow the Pipe: coating journey | 16 coating scenes, source/deck labels, simple/operator/engineer views, diagrams, values, review notes, decisions, 3D models, labs, final assessment, record and certificate | No coating course; current pipe course is HSAW fabrication with 6 scenes | P0: content and information architecture mismatch |
| The Inspector's Eye | Visual inspection course with inspection setup, lighting, defects, weld cross-sections, defect causes, assessment, review flags | Current quality course has 4 generic quality scenes and one moving scanner model | P0: pilot target |
| 3D station interaction | Drag-to-turn canvas, zoom controls, reset, numbered hotspots, guided tour list, model-specific controls | OrbitControls, wheel/pinch zoom, reset, four hotspot buttons, pause; no guided tour or pan | P1 |
| Process controls | Layer peel, route switch, blast gate decisions, holiday voltage/speed, sequence ordering, optics sliders, metrology selection | Only forming-angle slider; no process state machine | P0 |
| Defect identification | Defect atlas with weld/steel/body categories, cross-section drawings, causes, photos, and explicit lack of acceptance limits | Red indication markers with generic detail; no defect selection or cause reasoning | P0 pilot |
| Assessment | Scene decisions require a correct answer; 10-question final assessment with 80% threshold; retry and best score | One quiz per scene; any answer marks scene complete; no course final assessment | P0 |
| Technical review | Review build banner, “To confirm” notes, source references, explicit deck-vs-assumption boundary | Disclaimer exists, but no structured source status or review record | P0 |
| Learner record | Local record, CSV export, certificates marked draft pending TCoE sign-off | Local progress dashboard only | P1, production integration requires LMS contract |

## 3. Technical accuracy and source verification report

### Reference-supported content to preserve

The reference explicitly presents these as deck-backed values or rules, subject to the supplied deck's authority: coating process stages, 3LPE/3LPP/FBE/DFBE route differences, surface preparation concepts, the displayed Sa2½-Sa3 and 50-110 µm blast-gate values, visual inspection setup examples, holiday-detector speed of 300 mm/s, and the illustrated inspection conditions of within 600 mm, at least 30 degrees, and at least 350 lux. The reference itself also states that the governing contract, ITP, QAP, or controlled procedure decides where standards differ.

### Items that must not be presented as approved plant facts yet

- Site-specific equipment dimensions, capacities, pressures, speeds, temperatures, tolerances, and acceptance limits unless Welspun supplies the controlled source.
- The supplied reference's “to confirm” items, including some coating thicknesses, cut-back values, peel-force criteria, metrology limits, defect acceptance thresholds, and simulator-only wording.
- Any current course claim that is not traceable to a controlled Welspun source. The current HSAW dataset includes detailed values and named procedures, but this audit cannot certify those values from the supplied reference HTML.

### Required content metadata

Each future simulation datum should carry: `sourceId`, `sourceLocation`, `status` (`deck`, `controlled`, `illustrative`, `to_confirm`), `approvedBy`, `approvedAt`, and `contentVersion`. Values shown in a simulated gauge must be labelled as simulated unless they come from a controlled approved source.

## 4. Proposed architecture and reuse plan

1. Keep the existing route, layout, demo context, and R3F/Drei dependency boundary.
2. Split the viewer into a reusable `SimulationShell` and versioned simulation modules with explicit contracts: camera views, hotspots, learner actions, reset state, accessible equivalent, and completion evidence.
3. Add a content manifest layer rather than embedding approval state in JSX. Existing `CourseScene` can gain optional simulation metadata without breaking current routes.
4. Add a pure scoring/decision module for scene tasks and final assessments. Test this module independently from rendering.
5. Keep browser-local state as demo-only. Add an adapter boundary for a future server-backed LMS event API; do not make localStorage look like production progress.
6. Use the existing `ScenarioQuizComponent` for immediate feedback, but only allow completion after the required task and the correct decision rules pass.
7. Add keyboard-accessible HTML controls and a text alternative for every 3D task. Keep reduced-motion and WebGL fallback behavior.

## 5. Prioritized implementation roadmap

1. **Pilot, P0:** upgrade the current quality defect scene into an Inspector's Eye defect-identification simulation with selectable defect states, cross-sectional view, guided inspection steps, meaningful learner task completion, source-status labels, and tests for decision rules.
2. **P0:** correct completion semantics so navigation cannot grant credit and incorrect answers remain retryable without falsely completing a scene.
3. **P1:** add the reference-aligned inspection course/labs as versioned content while preserving the existing course URLs.
4. **P1:** add the coating factory-twin route, layer peeler, process sequence, blast gate, holiday detector, and metrology lab.
5. **P1:** add course-level assessment, attempt history, retry/best-score policy, and draft certificate behavior.
6. **P2:** connect the adapter to the real LMS only after authorization, event, validation, and reporting contracts are approved.
7. **P2:** validate desktop/mobile/WebGL fallback, accessibility, frame rate, and browser lifecycle with automated browser coverage.

## 6. Questions requiring Welspun technical approval

- Which controlled documents govern each course, and which revision/date should be used?
- Should the pilot teach HSAW quality inspection, external coating inspection, or the supplied Inspector's Eye course as the first production-aligned module?
- What are the approved inspection methods, equipment models, calibration intervals, and acceptance criteria for the pilot?
- Which values may be shown as training examples, and which must be hidden until plant or customer-specific data is selected?
- What is the approved pass mark, retry policy, attempt retention, and supervisor visibility requirement?
- What backend endpoint and authorization boundary should receive completion evidence and scores?
- Which certificate wording is permitted, and who signs off before any certificate is considered qualification evidence?
- Should the reference's alternate standards and conflicting light-level examples be displayed as comparison material or reduced to the governing site standard?

## Pilot decision

The safest first implementation slice is the existing quality defect scene (`quality-basics-103`, scene `scene-2-defects`) because it has a clear learner task, a direct counterpart in the supplied Inspector's Eye reference, and a contained rendering surface. It can be upgraded without changing authentication, routes, or unrelated LMS features. The pilot will remain explicitly illustrative until the questions above are answered.

## Pilot implementation and validation

Implemented in the existing route:

- Surface-scan and cross-section inspection views in the quality R3F model.
- Defect classification choices for undercut, porosity, and lack of fusion.
- Explicit submission feedback and an accessible status message.
- Resettable inspection state and an instructional note that acceptance limits are not supplied by the model.
- Completion gating for this pilot scene: the learner must submit the correct simulated finding and select the correct scenario decision before continuing.

Validation completed:

- `npm run typecheck` passed.
- `npm run build` passed.
- Browser smoke check passed at `http://127.0.0.1:3000/client-demo/course/quality-basics-103`.
- The pilot initially disables `Next Scene`, shows positive feedback after the cross-section finding is submitted, and enables navigation only after the correct scenario answer is selected.

The pilot does not yet create server-backed attempts, scores, or qualification records. Those remain intentionally outside the current demo architecture until the LMS contract and Welspun approval questions are resolved.