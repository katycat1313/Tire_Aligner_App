export type WheelPosition = 'frontLeft' | 'frontRight' | 'rearLeft' | 'rearRight';
export type AlignmentType = 'toe' | 'camber' | 'caster';

export interface AdjustmentStep {
  instruction: string;
  warning?: string;
}

export interface AdjustmentGuide {
  component: string;
  estimatedTimeMinutes: number;
  toolsNeeded: string[];
  steps: AdjustmentStep[];
  note?: string;
}

// Estimates: ~0.1° per 1/4 turn on Silverado tie rods (19mm tie rod thread pitch ≈ 1.5mm/rev)
const TIE_ROD_DEG_PER_QUARTER_TURN = 0.08; // conservative estimate

export function getToeAdjustmentGuide(
  position: WheelPosition,
  errorDegrees: number // positive = too much toe-in, negative = toe-out
): AdjustmentGuide {
  const isFront = position.includes('front');
  const isLeft = position.includes('Left');
  const quarterTurns = Math.abs(errorDegrees) / TIE_ROD_DEG_PER_QUARTER_TURN;
  const fullTurns = Math.floor(quarterTurns / 4);
  const remainingQuarters = Math.round(quarterTurns % 4);

  const turnAmount =
    fullTurns > 0
      ? `${fullTurns} full turn${fullTurns > 1 ? 's' : ''} and ${remainingQuarters} quarter turn${remainingQuarters !== 1 ? 's' : ''}`
      : `${remainingQuarters} quarter turn${remainingQuarters !== 1 ? 's' : ''}`;

  // Toe-in adjustment logic: shorten tie rod = more toe-in
  // For LEFT front: clockwise from front = shorten = more toe-in
  // For RIGHT front: counter-clockwise from front = shorten = more toe-in
  const needsMoreToeIn = errorDegrees < 0; // currently too much toe-out
  let direction: string;
  if (isFront) {
    if (isLeft) {
      direction = needsMoreToeIn ? 'CLOCKWISE (shortens tie rod)' : 'COUNTER-CLOCKWISE (lengthens tie rod)';
    } else {
      direction = needsMoreToeIn ? 'COUNTER-CLOCKWISE (shortens tie rod)' : 'CLOCKWISE (lengthens tie rod)';
    }
  } else {
    direction = needsMoreToeIn ? 'CLOCKWISE' : 'COUNTER-CLOCKWISE';
  }

  if (!isFront) {
    return {
      component: 'Rear Toe Adjuster / Cam Bolt',
      estimatedTimeMinutes: 20,
      toolsNeeded: ['19mm socket', 'Torque wrench', 'Breaker bar', 'Jack and jack stands'],
      steps: [
        { instruction: 'Safely lift and support the vehicle on jack stands.' },
        { instruction: 'Locate the rear toe cam bolt (on the lower rear control arm).' },
        { instruction: `Loosen the cam bolt nut (do NOT fully remove).`, warning: 'Do not remove the bolt while the vehicle is lifted.' },
        { instruction: `Rotate the cam bolt ${direction} by approximately ${turnAmount}.` },
        { instruction: 'Hold the bolt position and re-tighten the nut to 155 ft-lbs.' },
        { instruction: 'Lower vehicle, bounce suspension 3 times, then re-measure.' },
      ],
      note: 'Rear toe on the Silverado 1500 is adjusted via cam bolts on the lower rear control arm.',
    };
  }

  return {
    component: 'Front Tie Rod End',
    estimatedTimeMinutes: 15,
    toolsNeeded: ['18mm wrench', '22mm wrench', 'Tie rod end tool (optional)'],
    steps: [
      { instruction: `Locate the outer tie rod end on the ${isLeft ? 'left' : 'right'} side.` },
      { instruction: 'Loosen the jam nut (22mm) on the tie rod sleeve.' },
      { instruction: `Rotate the tie rod sleeve ${direction} by approximately ${turnAmount}.`, warning: 'Count your turns carefully — it\'s easy to lose track.' },
      { instruction: 'Hold the sleeve in position and re-tighten the jam nut to 46 ft-lbs.' },
      { instruction: 'Re-measure toe. Repeat if needed.' },
    ],
    note: `Each full rotation of the tie rod sleeve changes toe by approximately ${(TIE_ROD_DEG_PER_QUARTER_TURN * 4).toFixed(2)}°. Adjust in small increments and re-measure.`,
  };
}

export function getCamberAdjustmentGuide(
  position: WheelPosition,
  errorDegrees: number
): AdjustmentGuide {
  const isLeft = position.includes('Left');
  const isFront = position.includes('front');
  const directionNeeded = errorDegrees < 0 ? 'less negative (more positive)' : 'more negative';

  if (!isFront) {
    return {
      component: 'Rear Cam Bolt / Shim Kit',
      estimatedTimeMinutes: 30,
      toolsNeeded: ['Socket set', 'Torque wrench', 'Jack and jack stands', 'Camber shim kit (if needed)'],
      steps: [
        { instruction: 'Safely lift and support the vehicle.' },
        { instruction: 'Locate the rear upper control arm mounting bolts.' },
        { instruction: `Adjust cam bolts to move camber ${directionNeeded}.` },
        { instruction: 'Tighten to spec: 130 ft-lbs (lower) / 100 ft-lbs (upper).' },
        { instruction: 'Lower and bounce vehicle, then re-measure.' },
      ],
      note: 'Rear camber adjustment varies by configuration. Aftermarket shim kits or cam bolts may be required.',
    };
  }

  return {
    component: 'Front Upper Control Arm Cam Bolts',
    estimatedTimeMinutes: 25,
    toolsNeeded: ['21mm socket', 'Torque wrench', 'Jack stands', 'Pry bar'],
    steps: [
      { instruction: 'Safely lift and support the vehicle on jack stands.' },
      { instruction: `Locate the upper control arm (UCA) on the ${isLeft ? 'left' : 'right'} side.` },
      { instruction: 'Loosen (do not remove) the UCA mounting bolts.' },
      {
        instruction: `Shift the UCA inboard to increase negative camber, or outboard to reduce it. You need ${directionNeeded} camber.`,
        warning: 'Move in very small increments — even 1mm of shift changes camber noticeably.',
      },
      { instruction: 'Re-tighten UCA bolts to 130 ft-lbs with the suspension at ride height.' },
      { instruction: 'Lower vehicle, bounce suspension, then re-measure.' },
    ],
    note: 'Stock Trail Boss has limited camber adjustment. Aftermarket UCAs (e.g. Rough Country, ReadyLIFT) provide greater range and may include caster correction.',
  };
}

export function getCasterAdjustmentGuide(
  position: WheelPosition,
  errorDegrees: number
): AdjustmentGuide {
  const isLeft = position.includes('Left');
  const needsMoreCaster = errorDegrees < 0;

  return {
    component: 'Upper Control Arm (Fore-Aft Position) / Cam Bolts',
    estimatedTimeMinutes: 30,
    toolsNeeded: ['21mm socket', 'Torque wrench', 'Jack stands'],
    steps: [
      { instruction: 'Safely lift and support the vehicle on jack stands.' },
      { instruction: `Locate the UCA mounting bracket on the ${isLeft ? 'left' : 'right'} frame rail.` },
      {
        instruction: needsMoreCaster
          ? 'Move the rear UCA bolt rearward OR move the front UCA bolt forward to increase caster.'
          : 'Move the rear UCA bolt forward OR move the front UCA bolt rearward to reduce caster.',
        warning: 'Caster and camber adjustments interact — re-check camber after adjusting caster.',
      },
      { instruction: 'Tighten UCA bolts to 130 ft-lbs with suspension at ride height.' },
      { instruction: 'Lower vehicle, bounce suspension, then re-measure both caster and camber.' },
    ],
    note: `Lifted Trail Boss trucks often have reduced caster. A caster correction kit (offset ball joints or UCAs) is the cleanest fix for trucks with 3"+ of lift. Expected caster loss at your lift height: ~${(errorDegrees).toFixed(1)}° from target.`,
  };
}

export function getQuickBrief(
  type: AlignmentType,
  position: WheelPosition,
  current: number,
  target: number,
  unit: string
): string {
  const error = current - target;
  const absError = Math.abs(error);
  const wheel = position.replace('front', 'Front ').replace('rear', 'Rear ').replace('Left', 'Left').replace('Right', 'Right');

  const componentMap: Record<AlignmentType, string> = {
    toe: 'tie rod adjustment (front) or cam bolt (rear)',
    camber: 'upper control arm position or cam bolts',
    caster: 'upper control arm fore/aft position or caster correction kit',
  };

  const directionMap: Record<AlignmentType, string> = {
    toe: error > 0 ? 'too much toe-in — lengthen the tie rod' : 'too much toe-out — shorten the tie rod',
    camber: error > 0 ? 'too positive — move UCA outboard' : 'too negative — move UCA inboard',
    caster: error > 0 ? 'too high — shift UCA forward' : 'too low — shift UCA rearward (add caster correction)',
  };

  return `${wheel} ${type}: Currently ${current.toFixed(2)}${unit}, target is ${target.toFixed(2)}${unit} — off by ${absError.toFixed(2)}${unit}. This is ${directionMap[type]}. Requires ${componentMap[type]}.`;
}
