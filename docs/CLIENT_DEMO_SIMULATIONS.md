# Client Demo Simulations

## Audit result

Before this change, the demo had one partial SVG simulation: `helical-visualizer.tsx` rendered a schematic and reused `math-utils.ts`, but offered dimension/preset controls only. Safety and quality scenes had static SVG diagrams and decision quizzes, not selectable simulation state. The reference HTML was not found in the workspace search path; available repository audit notes were used to map its custom-canvas behaviors to R3F.

## Implemented simulations

### Helical pipe forming

- Component: `frontend/src/components/client-demo/helical-visualizer.tsx` using `frontend/src/components/client-demo/three-simulation-viewer.tsx`
- Entry: `/client-demo/course/pipe-process-101`, scene 3.
- Controls: visual forming-angle slider from 10 to 50 degrees, existing dimension and strip-width controls, pause/resume, and reset.
- Visual state: the actual Three.js strip mesh rotates with the angle slider; the pipe, rollers, coil, welding head, inspection stage, and animated seam are real WebGL meshes. The illustrative seam motion can be paused.
- Technical boundary: the existing `calculateHelicalForming` utility supplies a reference relationship. The direct angle slider changes the educational SVG pose only and never claims to calculate a certified machine setting.

### Shop-floor safety

- Component: `frontend/src/components/client-demo/safety-simulation.tsx` using the shared R3F viewer
- Entry: `/client-demo/course/safety-essentials-102`, scene 2.
- Hotspots: suspended load path, missing eye protection, and spill near a cable route.
- Interaction: orbit/zoom the 3D work area, click a glowing mesh hotspot, or use the keyboard-accessible HTML list to reveal the hazard, safer response, explanation, progress, completion, and reset.
- Boundary: the scene is illustrative and does not replace a site risk assessment, permit, approved SOP, or qualified safety direction.

### Weld / quality inspection

- Component: `frontend/src/components/client-demo/quality-simulation.tsx` using the shared R3F viewer
- Entry: `/client-demo/course/quality-basics-103`, scene 2.
- Indications: a fictional linear indication, rounded mark, and clear reference area.
- Interaction: orbit/zoom the 3D pipe and inspection fixture, click a glowing indication marker, or use the keyboard-accessible HTML list to reveal whether the learning response is to escalate or continue review, plus an explanation, progress, completion, and reset.
- Boundary: the patterns are fictional. The simulation does not diagnose actual defects, apply acceptance criteria, or authorize product release.

## Integration and state

`frontend/src/components/client-demo/scene-viewer.tsx` renders the relevant simulation after the scene schematic and before the explanation tabs. `three-simulation-viewer.tsx` centralizes Canvas lifecycle, OrbitControls, procedural meshes, lighting, camera reset, WebGL fallback/error state, reduced-motion handling, and hotspot mesh events. Simulation state is kept in component/browser memory; no API, Express server, MongoDB, Atlas, authentication, or employee data is involved. Course progress remains governed by the existing local demo context.

## Packages

The web workspace adds `three`, `@react-three/fiber`, `@react-three/drei`, and `@types/three`.

## Limitations

- Procedural Three.js scenes are simplified educational illustrations, not plant layouts or equipment replicas.
- The helical visualization is geometric and visual; it omits machine-specific setup, springback, tension, tooling, material, and control-system factors.
- Safety and quality responses are learning prompts, not controlled operational decisions.
- No simulation state is an official learning record and no certificate or compliance status is produced.
- WebGL availability and device GPU performance vary. A meaningful HTML fallback remains available, but the fallback cannot provide 3D depth or orbit interaction.