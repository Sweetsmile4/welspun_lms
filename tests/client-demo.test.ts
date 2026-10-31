import { describe, expect, it } from 'vitest';
import {
  DEMO_COURSES,
  DEMO_USER,
} from '../apps/web/src/lib/client-demo/course-data.js';
import {
  calculateHelicalForming,
  inchesToMm,
  mmToInches,
} from '../apps/web/src/lib/client-demo/math-utils.js';

describe('Client Demonstration Course Data Integrity', () => {
  it('contains the three required assigned courses', () => {
    expect(DEMO_COURSES).toHaveLength(3);
    const courseIds = DEMO_COURSES.map((c) => c.id);
    expect(courseIds).toEqual([
      'pipe-process-101',
      'safety-essentials-102',
      'quality-basics-103',
    ]);
  });

  it('course 1 has exactly 6 manufacturing scenes matching the process journey', () => {
    const course1 = DEMO_COURSES.find((c) => c.id === 'pipe-process-101')!;
    expect(course1).toBeDefined();
    expect(course1.scenes).toHaveLength(6);

    const sceneIds = course1.scenes.map((s) => s.id);
    expect(sceneIds).toEqual([
      'scene-1-coil-receiving',
      'scene-2-strip-prep',
      'scene-3-helical-forming',
      'scene-4-submerged-arc-welding',
      'scene-5-quality-testing',
      'scene-6-release-dispatch',
    ]);

    // Scene 3 must have interactive visualizer enabled
    expect(course1.scenes[2]?.hasInteractiveVisualizer).toBe(true);
  });

  it('course 2 has exactly 4 safety essentials scenes', () => {
    const course2 = DEMO_COURSES.find((c) => c.id === 'safety-essentials-102')!;
    expect(course2).toBeDefined();
    expect(course2.scenes).toHaveLength(4);

    const sceneIds = course2.scenes.map((s) => s.id);
    expect(sceneIds).toEqual([
      'scene-1-ppe',
      'scene-2-hazards',
      'scene-3-loto',
      'scene-4-reporting',
    ]);
  });

  it('course 3 has exactly 4 quality inspection scenes', () => {
    const course3 = DEMO_COURSES.find((c) => c.id === 'quality-basics-103')!;
    expect(course3).toBeDefined();
    expect(course3.scenes).toHaveLength(4);

    const sceneIds = course3.scenes.map((s) => s.id);
    expect(sceneIds).toEqual([
      'scene-1-checkpoints',
      'scene-2-defects',
      'scene-3-traceability',
      'scene-4-quarantine',
    ]);
  });

  it('every scene contains complete multi-tier explanations and valid decision quizzes', () => {
    for (const course of DEMO_COURSES) {
      for (const scene of course.scenes) {
        // Story and Takeaway
        expect(scene.story.length).toBeGreaterThan(20);
        expect(scene.practicalTakeaway.length).toBeGreaterThan(10);

        // ELI5
        expect(scene.explanations.eli5.title).toBeTruthy();
        expect(scene.explanations.eli5.analogy).toBeTruthy();
        expect(scene.explanations.eli5.body).toBeTruthy();

        // Operator
        expect(scene.explanations.operator.title).toBeTruthy();
        expect(
          scene.explanations.operator.checkpoints.length,
        ).toBeGreaterThanOrEqual(3);
        expect(scene.explanations.operator.cues.length).toBeGreaterThanOrEqual(
          2,
        );
        expect(scene.explanations.operator.warnings).toBeTruthy();

        // Engineer
        expect(scene.explanations.engineer.title).toBeTruthy();
        expect(scene.explanations.engineer.specifications).toBeTruthy();
        expect(
          Object.keys(scene.explanations.engineer.parameters).length,
        ).toBeGreaterThanOrEqual(2);
        expect(
          scene.explanations.engineer.standards.length,
        ).toBeGreaterThanOrEqual(1);

        // Quiz
        expect(scene.quiz.question).toBeTruthy();
        expect(scene.quiz.options.length).toBeGreaterThanOrEqual(3);
        const correctCount = scene.quiz.options.filter(
          (o) => o.isCorrect,
        ).length;
        expect(correctCount).toBe(1);
        for (const opt of scene.quiz.options) {
          expect(opt.text).toBeTruthy();
          expect(opt.explanation).toBeTruthy();
        }
      }
    }
  });

  it('fictional employee profile has correct corporate demo attributes', () => {
    expect(DEMO_USER.fullName).toBe('Rajesh Sharma');
    expect(DEMO_USER.employeeCode).toBe('WCL-DEMO-7042');
    expect(DEMO_USER.jobTitle).toContain('Operator');
    expect(DEMO_USER.plantLocation).toContain('Anjar');
  });
});

describe('Helical Forming Angle Mathematical Calculations', () => {
  it('correctly calculates forming angle for 48-inch pipe with 1500 mm strip', () => {
    const diameterMm = inchesToMm(48); // 1219.2 mm
    const result = calculateHelicalForming({
      diameterMm,
      stripWidthMm: 1500,
    });

    expect(result.isValid).toBe(true);
    // Circumference = pi * 1219.2 = 3830.2
    expect(result.circumferenceMm).toBeCloseTo(3830.2, 0);
    // sin(alpha) = 1500 / 3830.2 = 0.3916
    expect(result.widthToCircumferenceRatio).toBeCloseTo(0.3916, 2);
    // alpha = arcsin(0.3916) * 180 / pi = 23.05 deg
    expect(result.formingAngleDegrees).toBeCloseTo(23.05, 1);
  });

  it('correctly calculates forming angle for 36-inch pipe with 1500 mm strip', () => {
    const diameterMm = inchesToMm(36); // 914.4 mm
    const result = calculateHelicalForming({
      diameterMm,
      stripWidthMm: 1500,
    });

    expect(result.isValid).toBe(true);
    // Circumference = pi * 914.4 = 2872.7
    expect(result.circumferenceMm).toBeCloseTo(2872.7, 0);
    // alpha = arcsin(1500 / 2872.7) = 31.48 deg
    expect(result.formingAngleDegrees).toBeCloseTo(31.48, 1);
  });

  it('flags invalid geometry when strip width exceeds pipe circumference', () => {
    const result = calculateHelicalForming({
      diameterMm: 300, // circumference ~942 mm
      stripWidthMm: 1200, // strip wider than circumference
    });

    expect(result.isValid).toBe(false);
    expect(result.statusMessage).toContain('Geometry limit exceeded');
  });

  it('handles zero or negative dimensions safely', () => {
    const resultZero = calculateHelicalForming({
      diameterMm: 0,
      stripWidthMm: 1500,
    });
    expect(resultZero.isValid).toBe(false);

    const resultNegative = calculateHelicalForming({
      diameterMm: 1200,
      stripWidthMm: -500,
    });
    expect(resultNegative.isValid).toBe(false);
  });

  it('unit conversion utilities convert accurately', () => {
    expect(inchesToMm(10)).toBe(254);
    expect(inchesToMm(48)).toBe(1219.2);
    expect(mmToInches(254)).toBe(10);
    expect(mmToInches(1219.2)).toBe(48);
  });
});
