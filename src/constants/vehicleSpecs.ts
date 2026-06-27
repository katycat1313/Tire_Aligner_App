export interface AlignmentSpec {
  target: number;
  tolerance: number;
  unit: string;
}

export interface VehicleSpecs {
  name: string;
  frontToePerWheel: AlignmentSpec;
  frontCamber: AlignmentSpec;
  frontCaster: AlignmentSpec;
  rearToePerWheel: AlignmentSpec;
  rearCamber: AlignmentSpec;
  notes: string[];
}

export interface VehicleProfile {
  specs: VehicleSpecs;
  liftHeightInches: number;
  spacerThicknessMM: number;
  tireSizeWidth: number;   // e.g. 285
  tireSizeAspect: number;  // e.g. 70
  tireRimSize: number;     // e.g. 18
}

// Factory specs for 2021 Chevy Silverado 1500 Trail Boss
// Source: GM service manual alignment specifications
export const TRAILBOSS_2021_FACTORY: VehicleSpecs = {
  name: '2021 Chevy Silverado 1500 Trail Boss',
  frontToePerWheel: { target: 0.0, tolerance: 0.15, unit: '°' },
  frontCamber: { target: -0.5, tolerance: 0.5, unit: '°' },
  frontCaster: { target: 4.0, tolerance: 0.75, unit: '°' },
  rearToePerWheel: { target: 0.1, tolerance: 0.15, unit: '°' },
  rearCamber: { target: 0.0, tolerance: 0.5, unit: '°' },
  notes: [
    'Caster is not independently adjustable from factory.',
    'Camber adjustment requires aftermarket cam bolts or UCAs.',
  ],
};

// Adjusted specs for lifted Trail Boss (2-4" lift with spacers)
// Lifted trucks run more negative camber and reduced caster — these are acceptable ranges
export function getLiftAdjustedSpecs(
  baseSpecs: VehicleSpecs,
  liftInches: number,
  spacerMM: number
): VehicleSpecs {
  const liftCamberShift = -(liftInches * 0.15); // ~0.15° negative per inch of lift
  const liftCasterShift = -(liftInches * 0.20); // ~0.20° caster reduction per inch of lift
  const spacerCamberShift = -(spacerMM * 0.02); // ~0.02° negative per mm of spacer

  const totalCamberShift = liftCamberShift + spacerCamberShift;
  const totalCasterShift = liftCasterShift;

  return {
    ...baseSpecs,
    name: `${baseSpecs.name} (Lifted ${liftInches}" + ${spacerMM}mm Spacers)`,
    frontCamber: {
      ...baseSpecs.frontCamber,
      target: baseSpecs.frontCamber.target + totalCamberShift,
      tolerance: baseSpecs.frontCamber.tolerance + 0.2, // more tolerance with mods
    },
    frontCaster: {
      ...baseSpecs.frontCaster,
      target: baseSpecs.frontCaster.target + totalCasterShift,
      tolerance: baseSpecs.frontCaster.tolerance + 0.25,
    },
    notes: [
      ...baseSpecs.notes,
      `Camber target shifted ${totalCamberShift.toFixed(2)}° due to lift/spacers.`,
      `Caster target shifted ${totalCasterShift.toFixed(2)}° due to lift.`,
      'Consider aftermarket UCAs with caster correction for optimal geometry.',
    ],
  };
}

export const DEFAULT_VEHICLE_PROFILE: VehicleProfile = {
  specs: TRAILBOSS_2021_FACTORY,
  liftHeightInches: 0,
  spacerThicknessMM: 0,
  tireSizeWidth: 275,
  tireSizeAspect: 65,
  tireRimSize: 18,
};
