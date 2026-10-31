# Client Demo Simulations

## Three.js Viewer

The client demo uses `src/components/client-demo/three-simulation.tsx` as a reusable React Three Fiber viewer. It provides orbit rotation, wheel/touch zoom through Drei `OrbitControls`, animated station elements, selectable hotspot markers, pause/resume, reset, responsive canvas sizing, loading UI, WebGL fallback content, and accessible HTML hotspot descriptions.

`src/components/client-demo/scene-viewer.tsx` mounts the viewer only for the three target scene types. Existing SVG diagrams remain for other scenes.

The current implementation now mounts the viewer for every scene in all three courses. The three scenes below have dedicated models; the other eleven use lightweight scene-specific procedural stations with named hotspots.

## Pipe Scene 3

The helical forming model contains an incoming steel coil, forming rolls, a hollow pipe, an orange helical seam, a welding torch, and an inspection station. The forming-angle slider updates the seam curve and strip/forming geometry. Hotspots explain each station. Geometry is explicitly illustrative and is not a verified machine setup.

## Safety Scene 2

The safety model contains a suspended coil, crane line, machinery, marked walkway, yellow exclusion zone, and pinch-point area. Hotspots explain the fictional hazard and safe response. The scene does not represent a site-specific approved procedure.

## Quality Scene 2

The inspection model contains a rotatable pipe with weld seam, moving scanner gantry, pressure gauge, and fictional red indication markers. Hotspots explain inspection and escalation concepts without diagnosing real defects.

## Remaining Scenes

The remaining pipe, safety, and quality scenes use the same real WebGL viewer with process-specific station headings such as Incoming coil, Heat stamp, Leveler rolls, Energy isolator, Safety lock, Inspection gate, Digital lineage, and NCR station. These are original educational geometry, not site-specific equipment or operating instructions.

## Reference Audit Note

The named reference HTML was not found in the current repository, so its custom Canvas V3 engine, MODELS definitions, and exact camera choreography could not be audited here. The implementation therefore uses original Three.js meshes and materials based on the interaction requirements in the task.
