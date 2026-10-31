# Client Demo Testing Guide

## Automated checks

Run from the repository root:

```text
npm run typecheck
npm run lint
npm test -- tests/client-demo.test.ts
npm run test:e2e -- tests/e2e/client-demo.spec.ts
npm run build
```

The focused unit tests verify the three courses, required scene sequences, explanation and quiz completeness, fictional profile data, and helical geometry calculations. The Playwright walkthrough verifies entry, dashboard cards, explanation switching, quiz feedback, visualizer controls, course completion, reset, and an unaffected foundation route.

## Manual browser review

1. Open `/client-demo` at desktop width and confirm the fictional-environment label is visible.
2. Enter the demonstration portal and confirm three course cards and status states.
3. Resize to tablet and mobile widths; check that course cards, scene controls, tables, quiz options, and the header remain usable without horizontal page overflow.
4. Open each course, switch all three explanation modes, answer both a correct and incorrect scenario, and use previous/next plus scene jumps.
5. On the forming scene, change both sliders and presets; verify the diagram and displayed educational values update.
6. Complete a course, return to the dashboard, refresh, and confirm local progress resumes.
7. Use Reset Demo and confirm all courses return to Not Started.
8. Use keyboard navigation and a reduced-motion browser preference; verify visible focus and no essential content depends on animation.

## Expected boundary checks

The route must make no network or backend requests, must not ask for a real password, and must not expose internal development preview controls. Existing `/dashboard`, `/development/*`, and security/API tests should remain unchanged.