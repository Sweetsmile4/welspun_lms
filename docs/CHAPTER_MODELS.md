# Chapter-specific learning models

The 14 chapters in the active client-demo catalog each use an explicit model in src/components/client-demo/station-models.ts. WebGL and the software SVG renderer consume the same part definitions, geometry, labels and component explanations. Unknown chapter types fail rather than silently rendering a generic station.

| Chapter | Represented equipment or teaching scene |
| --- | --- |
| Coil receiving | Hollow coil on a saddle, stamp on its steel surface, separate tag/MTR, UT thickness probe and hold tag. The 8419 / 8410 mismatch matches the chapter question. |
| Strip preparation | Nine alternating leveling rolls, strip, paired edge mills and an enlarged double-V edge profile with root land. |
| Helical forming | Angled feed strip, three bending rolls, hollow formed pipe and spiral meeting edges. The angle control changes feed orientation and illustrative seam pitch. |
| Submerged arc welding | Helical pipe joint, internal lance, external wire under a flux blanket and dry-flux hopper. |
| Hydrostatic and NDT | Pipe supports, traversing UT head, sealed hydrostatic ends and pressure gauge. These distinct operations are shown together for comparison. |
| Release and dispatch | Stepped 3LPE layer cutaway, bare field-weld end, pipe identity stencil and dispatch supports. |
| PPE and plant zones | Operator, helmet, eye protection, gloves, fitted clothing, safety footwear and marked pedestrian route. |
| Suspended loads | Suspended hollow coil, crane suspension, exclusion boundary, transfer-car pinch interface and separated walkway. |
| LOTO | Welding carriage, open electrical isolator with personal lock, hydraulic/pneumatic valve isolation and zero-energy verification gauge. |
| Near-miss reporting | Leaking hose, spill beside electrical conduit and reporting barricade. |
| Inspection gates | All six described gates: incoming, milling, welding, hydrostatic, UT and final release, plus calibration status. This is a sequence diagram in 3D, not a plant layout. |
| Defect classification | Parent metal, weld cap/root, weld-toe undercut, gas pores, unfused sidewall and incomplete root penetration. Internal defects are hidden in surface view and exposed in the section. |
| Traceability | Matching example heat record, identified coil, serialized pipe and MTR/test dossier. |
| Quarantine | Held pipe, physically attached red hold tag, segregated bay and open NCR/QA disposition record. |

Models follow the existing chapter narratives. Dimensions, layer thicknesses, defect sizes, stage spacing and motion are illustrative; they are not approved engineering drawings or operating procedures. A site subject-matter expert should approve training content before operational use.

Component names sit above their equipment. Selecting a part or its accessible button highlights it and explains its chapter-specific role. Rotation, zoom, keyboard controls and the no-WebGL fallback remain available. Each chapter mounts with its own model state.

Run npm run test:models for repeatable coverage, geometry and content invariants. The implementation was also checked through every chapter with WebGL enabled and disabled.
