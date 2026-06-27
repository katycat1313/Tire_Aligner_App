export interface WheelOrientation {
  alpha: number; // yaw / compass heading (0–360°)
  beta: number;  // pitch (−180–180°)
  gamma: number; // roll (−90–90°)
}

export interface WheelMeasurement {
  orientation: WheelOrientation;
  sampleCount: number;
  stdDevCamber: number; // quality indicator
  stdDevToe: number;
}

export interface AlignmentResults {
  frontLeft: WheelAlignmentData;
  frontRight: WheelAlignmentData;
  rearLeft: WheelAlignmentData;
  rearRight: WheelAlignmentData;
  thrustAngle: number; // rear thrust angle relative to vehicle centerline
}

export interface WheelAlignmentData {
  camber: number;
  toe: number;
  caster?: number;
  casterLeftLock?: WheelOrientation;
  casterRightLock?: WheelOrientation;
}

// ─── Circular statistics ──────────────────────────────────────────────────────

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function normalizeAngle(angle: number): number {
  let a = angle % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

// Circular mean — correctly handles 0°/360° wraparound
function circularMean(angles: number[]): number {
  const sinSum = angles.reduce((s, a) => s + Math.sin(toRad(a)), 0);
  const cosSum = angles.reduce((s, a) => s + Math.cos(toRad(a)), 0);
  return toDeg(Math.atan2(sinSum / angles.length, cosSum / angles.length));
}

function stdDev(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ─── Sample averaging ─────────────────────────────────────────────────────────

export function averageOrientations(samples: WheelOrientation[]): WheelMeasurement {
  const alphas = samples.map((s) => s.alpha);
  const gammas = samples.map((s) => s.gamma);

  return {
    orientation: {
      alpha: circularMean(alphas),
      beta: samples.reduce((s, o) => s + o.beta, 0) / samples.length,
      gamma: samples.reduce((s, o) => s + o.gamma, 0) / samples.length,
    },
    sampleCount: samples.length,
    stdDevCamber: stdDev(gammas),
    stdDevToe: stdDev(alphas),
  };
}

// ─── Camber ───────────────────────────────────────────────────────────────────
// Phone is held in portrait, screen facing outward from the wheel.
// Gamma (roll) represents the tilt of the wheel from vertical.
// We subtract the surface baseline to correct for uneven ground.
//
// Sign convention: negative camber = top of wheel tilted inward = negative value

export function calculateCamber(
  wheel: WheelOrientation,
  baseline: WheelOrientation,
  isLeftSide: boolean
): number {
  const raw = wheel.gamma - baseline.gamma;
  // Left wheel: phone roll positive when top tilts away = positive camber
  // Right wheel: sign is mirrored due to phone facing the opposite direction
  return isLeftSide ? raw : -raw;
}

// ─── Toe ──────────────────────────────────────────────────────────────────────
// Toe is measured relative to the rear axle thrust line.
// The rear wheels (fixed) define "straight ahead" for this session.
// Front wheel headings are compared to the thrust line.
//
// Sign convention (per wheel): positive = toe-in, negative = toe-out

export function calculateThrustLine(
  rearLeft: WheelOrientation,
  rearRight: WheelOrientation
): number {
  // Thrust line = average of rear wheel headings
  return circularMean([rearLeft.alpha, rearRight.alpha]);
}

export function calculateThrustAngle(
  rearLeft: WheelOrientation,
  rearRight: WheelOrientation
): number {
  // Thrust angle = deviation of rear axle from vehicle centerline
  // Ideally 0°; non-zero = dog-tracking
  const diff = normalizeAngle(rearLeft.alpha - rearRight.alpha);
  return diff / 2;
}

export function calculateToe(
  wheel: WheelOrientation,
  thrustLineHeading: number,
  isLeftSide: boolean
): number {
  // Angle of wheel heading relative to thrust line
  const deviation = normalizeAngle(wheel.alpha - thrustLineHeading);
  // Left side: wheel pointed left of center = toe-in (positive)
  // Right side: wheel pointed right of center = toe-in (positive)
  return isLeftSide ? -deviation : deviation;
}

// ─── Caster ───────────────────────────────────────────────────────────────────
// Measured via the camber-change-during-steering-sweep method (SAE J670e).
// With the wheel steered to full lock in each direction, measure camber.
// caster = (camber_at_left_lock - camber_at_right_lock) / (2 × sin(sweep_angle))
//
// Typical sweep angle: 20° each side (use steering stops or marked wheel)
// Positive caster = favorable for straight-line stability

export function calculateCaster(
  camberAtLeftLock: number,
  camberAtRightLock: number,
  sweepAngleDegrees: number = 20
): number {
  return (
    (camberAtLeftLock - camberAtRightLock) /
    (2 * Math.sin(toRad(sweepAngleDegrees)))
  );
}

// ─── Rear toe (individual wheels vs thrust line) ──────────────────────────────

export function calculateRearToe(
  rearWheel: WheelOrientation,
  thrustLine: number,
  isLeftSide: boolean
): number {
  return calculateToe(rearWheel, thrustLine, isLeftSide);
}

// ─── Quality assessment ───────────────────────────────────────────────────────

export interface MeasurementQuality {
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
}

export function assessMeasurementQuality(measurement: WheelMeasurement): MeasurementQuality {
  const maxStdDev = Math.max(measurement.stdDevCamber, measurement.stdDevToe);

  if (maxStdDev < 0.1) {
    return { rating: 'excellent', message: 'Very stable reading — high confidence' };
  } else if (maxStdDev < 0.25) {
    return { rating: 'good', message: 'Stable reading — good confidence' };
  } else if (maxStdDev < 0.5) {
    return { rating: 'fair', message: 'Some movement detected — hold jig steadier' };
  } else {
    return { rating: 'poor', message: 'High variation — retake this measurement' };
  }
}

// ─── Full session calculation ─────────────────────────────────────────────────

export function computeFullAlignment(
  rl: WheelOrientation,
  rr: WheelOrientation,
  fl: WheelOrientation,
  fr: WheelOrientation,
  baseline: WheelOrientation,
  flCasterLeft?: WheelOrientation,
  flCasterRight?: WheelOrientation,
  frCasterLeft?: WheelOrientation,
  frCasterRight?: WheelOrientation,
  casterSweepAngle: number = 20
): AlignmentResults {
  const thrustLine = calculateThrustLine(rl, rr);
  const thrustAngle = calculateThrustAngle(rl, rr);

  const flCamber = calculateCamber(fl, baseline, true);
  const frCamber = calculateCamber(fr, baseline, false);
  const rlCamber = calculateCamber(rl, baseline, true);
  const rrCamber = calculateCamber(rr, baseline, false);

  const flToe = calculateToe(fl, thrustLine, true);
  const frToe = calculateToe(fr, thrustLine, false);
  const rlToe = calculateRearToe(rl, thrustLine, true);
  const rrToe = calculateRearToe(rr, thrustLine, false);

  let flCaster: number | undefined;
  let frCaster: number | undefined;

  if (flCasterLeft && flCasterRight) {
    const lockLeftCamber = calculateCamber(flCasterLeft, baseline, true);
    const lockRightCamber = calculateCamber(flCasterRight, baseline, true);
    flCaster = calculateCaster(lockLeftCamber, lockRightCamber, casterSweepAngle);
  }

  if (frCasterLeft && frCasterRight) {
    const lockLeftCamber = calculateCamber(frCasterLeft, baseline, false);
    const lockRightCamber = calculateCamber(frCasterRight, baseline, false);
    frCaster = calculateCaster(lockLeftCamber, lockRightCamber, casterSweepAngle);
  }

  return {
    frontLeft: { camber: flCamber, toe: flToe, caster: flCaster },
    frontRight: { camber: frCamber, toe: frToe, caster: frCaster },
    rearLeft: { camber: rlCamber, toe: rlToe },
    rearRight: { camber: rrCamber, toe: rrToe },
    thrustAngle,
  };
}
