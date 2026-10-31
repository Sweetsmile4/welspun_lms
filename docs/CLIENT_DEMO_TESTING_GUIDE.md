# Client Demo 3D Testing Guide

## Commands

```text
npm ci
npm run typecheck
npm run build
npm run dev
```

Open:

- `/client-demo/course/pipe-process-101`
- `/client-demo/course/safety-essentials-102`
- `/client-demo/course/quality-basics-103`

## Manual Checks

1. Jump to pipe scene 3 and confirm a visible WebGL canvas.
2. Drag to orbit and use wheel or pinch to zoom.
3. Change the forming angle and confirm the displayed value and seam geometry update.
4. Select each hotspot and confirm the explanation panel changes.
5. Pause and resume animation, then use Reset and confirm defaults return.
6. Repeat canvas, orbit, zoom, hotspot, and pause checks for safety scene 2 and quality scene 2.
7. Open Accessible station details and verify the same information is available without 3D interaction.
8. Select quiz answers, move between scenes, and confirm local progress and completion still work.
9. Test a mobile viewport and a browser with WebGL disabled; confirm the fallback/details content is meaningful.

## Verified in This Change

- TypeScript check passed.
- Production build passed.
- Browser-rendered canvas and viewer controls verified for all three target scenes.
- Pipe angle, hotspot, and reset interactions verified.

## Resource Check

Navigate between scenes and watch the browser console/performance tools for repeated render-loop errors or growing canvas count. The viewer is mounted through the scene route and should be discarded when the scene unmounts.
