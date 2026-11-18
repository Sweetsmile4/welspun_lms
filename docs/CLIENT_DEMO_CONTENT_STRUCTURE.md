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
| From Steel Coil to Finished Pipe | 6 | Receiving, strip preparation, helical forming, welding, inspection, release |
| Shop Floor Safety Essentials | 4 | PPE, hazard identification, equipment isolation, reporting |
| Quality Inspection Basics | 4 | Checkpoints, defect awareness, traceability, release decisions |

Course data is statically typed in `frontend/src/lib/client-demo/course-data.ts`. Diagrams are local components; no external media or content service is required.

## Content boundary

Examples are shortened and original, inspired by the manufacturing learning sequence in the supplied reference. They are illustrative educational models, not approved Welspun SOPs, work instructions, engineering settings, customer specifications, training records, or compliance claims. Learners must follow current controlled site procedures.