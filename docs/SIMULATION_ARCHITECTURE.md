# Simulation architecture

Phase 0 proposal · all industrial specifications require SME approval

## Educational model and scope

Use reusable renderer types driven by versioned, approved configuration: factory route, coating layers, inspection optics, instrument reading, defect atlas, decision scenario and process sequencing. A station is a process node, a scene is a learning unit, and an assessment item is a scored task. Keep these identities separate. Support one approved plant model initially; never infer its actual equipment inventory from the prototypes.

Use React Three Fiber/Drei with Three.js for scenes where rotation, depth, occlusion or component relationships teach something useful. Use SVG and Motion for route diagrams, scales and sequencing. Prototype B/C use their own Canvas 2D projection engine, while A uses Three.js for the peeler; production need not preserve either implementation verbatim. Rebuilding a limited renderer set costs effort but provides consistent lifecycle, accessibility and tracking contracts. Avoid photorealistic factory reconstruction until approved learning objectives justify it.

## Versioned simulation package

Each simulation release contains stable simulation ID, renderer type/version, evaluator version, content hash, approved technical-policy reference, scenario ID/seed rules, typed input schema/units/bounds, model/texture asset IDs with hashes, station/route graph, hotspot text, learning objective mappings, practice vs assessed mode, completion rubric and accessibility fallback. Course releases pin this manifest. A model asset update creates a new release when it changes meaning or assessed evidence.

Admin forms support text, images, captions, station order/links, approved parameter values and selection among existing interaction/rubric types. Arbitrary scripts, shader code or uploaded executable scenarios are prohibited. A new interaction type requires developer work and tests. This is the boundary that makes safe no-code content maintenance realistic for a sole developer.

## Renderer families

| Family | Proposed interactions | Evidence and safeguards |
|---|---|---|
| Factory walkthrough | Route choice, station/hotspot selection, play/pause, quality-gate branches, links to lessons | Meaningful station/decision events; animation/visits alone do not establish competency; route topology approved |
| Coating layers | Rotate, explode/peel, identify order and function | Layer identification answers; dimensions labelled schematic unless approved; no invented thickness defaults |
| Optics | Set distance/angle/light, choose applicable inspection profile, change light direction | Record typed inputs and selected policy; server evaluates approved profile; target fading is illustrative, not an optical measurement |
| Metrology | Read a scale/vernier, select tool, compare values to approved rubric | Separate reading accuracy from instrument suitability; calibration/uncertainty cannot be replaced by resolution < tolerance |
| Defect atlas and inspection | Inspect views, identify defect/cause, select disposition | Separate identification from accept/reject criteria; normative limits require product/customer/source applicability |
| Sequencing and scenarios | Order selected steps, make gate/disposition decisions | Versioned expected order/decision rubric; distinguish route alternatives and optional stages |

Factory graphs should represent main route, optional branches, reprocess loops and internal lining as approved, rather than forcing A's 16 stations or B/C's 20 nodes into one linear truth. SME approves naming, order, optionality, NTC meaning and process-specific equipment references.

## Trust and assessment mode

Practice may evaluate immediately in the browser for responsiveness and show explanations. In assessed mode, server creates run/seed, pins rubric and deadline, accepts bounded action evidence and recomputes the outcome. Never trust client pass/fail, elapsed time or displayed score. Final outcomes retain raw decisive inputs, selected profile, versions, rubric results and provenance. Validate impossible action sequences, out-of-range values, duplicates and timing inconsistencies.

Prefer discrete actions and deterministic rubric evaluation over server-side rendering or full physics replay. This reduces infrastructure and provides explainable results. It does not prove who operated the browser or prevent all cheating; high-stakes qualification may need supervised observation or other approved controls. Frame rate and model appearance must not change assessed scores.

## Technical approval and source provenance

Parameter records carry value, unit, tolerance/range, applicable process/product/customer, standard edition/clause or internal controlled source, effective date and reviewer decision. Missing acceptance criteria produce an explicit unavailable/not-assessed state, never a guessed default. A release cannot label such a task as certified industrial compliance.

Specifically reconcile lighting thresholds (A 1076; portals 300/350/1000 with 500 recommendation), layer thicknesses, holiday voltage interpretation, heating tolerances, salt/dust limits, gauge limits, peel acceptance, defect limits, repair/reject criteria and certificate policies. Prototype annotations are useful questions but are not approval. Exact pending per-scene notes are recorded in the audit appendix.

## Performance and accessibility

Load the lesson shell first and lazy-load the simulation client bundle/assets. Use compressed approved assets, bounded texture budgets, instancing where appropriate and adaptive quality. Pause hidden scenes, respect reduced motion and dispose geometries/materials/listeners on unmount. Handle WebGL/context loss and show a meaningful fallback. Choose asset budgets after measuring pilot devices; no assumed plant GPU capability.

Every assessed objective needs keyboard-accessible controls, textual labels, understandable focus order, numeric input alternatives to sliders and non-color-only feedback. Supply static annotated images, step descriptions and equivalent decision tasks where WebGL is unavailable. Alternative evidence must be approved as equivalent; do not make accessibility users pass an unrelated easier quiz.

## Validation and release criteria

SME reviews source/profile applicability and representative outcomes. Unit tests verify evaluator boundaries, units and exact pass fractions; integration tests verify pinned versions and tamper rejection. Playwright covers load, resize, controls, reduced motion, fallback, resume and finalization. Test representative low-capability devices and keyboard navigation. Golden screenshots help detect visual regressions but cannot validate engineering correctness. No live sensor, PLC, MES or plant control integration is included in the initial simulation scope.
