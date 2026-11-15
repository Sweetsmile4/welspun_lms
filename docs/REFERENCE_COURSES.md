# Reference learning courses

The client-demo dashboard includes three additional courses from the supplied Welspun_Learning_Portal.html:

- Follow the Pipe: all 16 coating chapters.
- The Inspector’s Eye: all 10 visual-inspection chapters.
- Coating & Inspection Simulation Lab: six activities grouped into a course from the reference’s separate lab section.

The existing three courses remain available. Reference text, technical facts, chapter decisions and answer explanations are adapted in src/lib/client-demo/reference-courses.ts. Every chapter has a native end-of-chapter quiz; an answer is required before advancing, and every chapter must be answered before course completion. Answers and chapter progress use the existing browser storage.

The original self-contained diagrams, photographs and simulations are served from public/learning/welspun-reference.html in a sandboxed iframe. Only the reference navigation chrome is hidden. The iframe has script permission but no same-origin permission; portal progress is managed by the native quiz outside it. No additional 3D dependencies are required.

Verified: TypeScript, ESLint for changed TypeScript files, production webpack build, and local browser checks for the dashboard cards, model canvas, factory twin, layer peeler, quiz gating, per-chapter state reset, persisted answers and mobile rendering. The browser walkthrough completed without page errors.
