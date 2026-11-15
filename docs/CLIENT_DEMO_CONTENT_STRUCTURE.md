# Client Demo Content Structure

The standalone demonstration follows a progressive learning loop:

1. A short shop-floor situation establishes why the step matters.
2. An original schematic or interactive model shows the process.
3. The learner chooses ELI5, Operator, or Engineer depth.
4. A scenario question asks for a safe or quality-focused decision.
5. Immediate reasoning and a practical takeaway close the scene.

## Assigned courses

| Course | Scenes | Focus |
| --- | ---: | --- |
| From Steel Coil to Finished Pipe | 6 | Receiving, strip preparation, helical forming, welding, inspection, release; helical simulation in scene 3 |
| Shop Floor Safety Essentials | 4 | PPE, hazard identification, equipment isolation, reporting; hazard simulation in scene 2 |
| Quality Inspection Basics | 4 | Checkpoints, defect awareness, traceability, release decisions; indication simulation in scene 2 |

Course data is statically typed in `apps/web/src/lib/client-demo/course-data.ts`. Diagrams and simulations are local components; no external media or content service is required.

## Simulation learning loop

- `helical-visualizer.tsx`: adjusts a visual angle slider, updates the SVG strip pose immediately, and demonstrates the existing simplified geometry reference. Pause/resume controls the illustrative seam motion; reset returns to the 48-inch/1500 mm example.
- `safety-simulation.tsx`: presents three selectable hotspots for a suspended load path, missing eye protection, and a spill near a cable route. Each selection reveals a safer response and contributes to completion.
- `quality-simulation.tsx`: presents three selectable fictional scan indications. Learners decide whether to escalate or continue review and receive a reasoned educational response.

Simulation state is React/browser-local state. Reset actions clear only the current simulation; course completion and learning progress continue to use the existing demo context and local storage.

## Content boundary

Examples are shortened and original, inspired by the manufacturing learning sequence in the supplied reference. They are illustrative educational models, not approved Welspun SOPs, work instructions, engineering settings, customer specifications, training records, or compliance claims. Learners must follow current controlled site procedures.