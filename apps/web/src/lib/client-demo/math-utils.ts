/**
 * Helical Forming Angle Mathematical Utilities
 *
 * Governing Kinematic Formula for HSAW pipe manufacturing:
 *   sin(alpha) = W / (pi * D)
 *
 * where:
 *   alpha = Helical forming angle (angle between incoming strip centerline and pipe axis/feed line)
 *   W = Strip width (mm)
 *   D = Pipe outer diameter (mm)
 *   pi * D = Pipe nominal circumference (mm)
 *
 * Note: Illustrative educational calculations only.
 * Shop-floor tool setups require exact uncoiler tension calibration,
 * neutral axis shift, springback compensation, and metallurgical expansion factors.
 */

export interface HelicalCalculationInput {
  diameterMm: number; // e.g. 1219.2 mm (48 inch)
  stripWidthMm: number; // e.g. 1500 mm
}

export interface HelicalCalculationResult {
  circumferenceMm: number;
  widthToCircumferenceRatio: number;
  formingAngleDegrees: number;
  formingAngleRadians: number;
  pitchMm: number; // Pitch = W / cos(alpha)
  isValid: boolean;
  statusMessage: string;
}

export function calculateHelicalForming(
  input: HelicalCalculationInput,
): HelicalCalculationResult {
  const { diameterMm, stripWidthMm } = input;

  if (diameterMm <= 0 || stripWidthMm <= 0) {
    return {
      circumferenceMm: 0,
      widthToCircumferenceRatio: 0,
      formingAngleDegrees: 0,
      formingAngleRadians: 0,
      pitchMm: 0,
      isValid: false,
      statusMessage:
        'Invalid input: Diameter and strip width must be greater than zero.',
    };
  }

  const circumference = Math.PI * diameterMm;
  const ratio = stripWidthMm / circumference;

  // In HSAW, sin(alpha) cannot exceed 1.0 (strip width cannot exceed pipe circumference).
  // Practical industrial HSAW forming angles typically lie between 15° and 45°.
  if (ratio >= 1.0) {
    return {
      circumferenceMm: Math.round(circumference * 10) / 10,
      widthToCircumferenceRatio: Math.round(ratio * 1000) / 1000,
      formingAngleDegrees: 90,
      formingAngleRadians: Math.PI / 2,
      pitchMm: 0,
      isValid: false,
      statusMessage:
        'Geometry limit exceeded: Strip width cannot exceed pipe circumference for helical forming.',
    };
  }

  const angleRad = Math.asin(ratio);
  const angleDeg = (angleRad * 180) / Math.PI;
  const pitch = stripWidthMm / Math.cos(angleRad);

  let statusMessage = 'Nominal helical forming range';
  if (angleDeg < 18) {
    statusMessage =
      'Shallow forming angle: High strip feed speed; check guide roll rigidity.';
  } else if (angleDeg > 42) {
    statusMessage =
      'Steep forming angle: Higher edge strain; monitor edge elongation and seam alignment.';
  }

  return {
    circumferenceMm: Math.round(circumference * 10) / 10,
    widthToCircumferenceRatio: Math.round(ratio * 10000) / 10000,
    formingAngleDegrees: Math.round(angleDeg * 100) / 100,
    formingAngleRadians: angleRad,
    pitchMm: Math.round(pitch * 10) / 10,
    isValid: true,
    statusMessage,
  };
}

export function inchesToMm(inches: number): number {
  return Math.round(inches * 25.4 * 10) / 10;
}

export function mmToInches(mm: number): number {
  return Math.round((mm / 25.4) * 10) / 10;
}
