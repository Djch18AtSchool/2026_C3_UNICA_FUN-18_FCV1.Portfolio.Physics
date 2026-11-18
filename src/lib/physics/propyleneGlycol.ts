import type { Fluid } from './hydraulics';
import { requireFinite } from './validate';

/*
 * Propylene glycol–water from Melinder (2010), as Modelica Buildings v14.0.0 codes it
 * (Buildings/Media/Antifreeze/Functions/PropyleneGlycolWater.mo): a polynomial in the mass
 * fraction and the temperature around a reference point (prototype pg_props.py; research
 * docs/superpowers/research/2026-11-17-enfriamiento-liquido.md, §5.1).
 */
const MELINDER = {
  massFractionRef: 0.307031,
  temperatureRef: 32.7083,
  maxMassFraction: 0.6,
  termsPerPower: [4, 4, 4, 3, 2, 1],
  density: [
    1.018e3, -5.406e-1, -2.666e-3, 1.347e-5, 7.604e-1, -9.45e-3, 5.541e-5, -1.343e-7, -2.498e-3,
    2.7e-5, -4.018e-7, 3.376e-9, -1.55e-4, 2.829e-6, -7.175e-9, -1.131e-6, -2.221e-8, 2.342e-8,
  ],
  logViscosity: [
    6.837e-1, -3.045e-2, 2.525e-4, -1.399e-6, 3.328e-2, -3.984e-4, 4.332e-6, -1.86e-8, 5.453e-5,
    -8.6e-8, -1.593e-8, -4.465e-11, -3.9e-6, 1.054e-7, -1.589e-9, -1.587e-8, 4.475e-10, 3.564e-9,
  ],
} as const;

function melinder(coefficients: readonly number[], massFraction: number, tC: number): number {
  const dx = 100 * (massFraction - MELINDER.massFractionRef);
  const dt = tC - MELINDER.temperatureRef;
  const terms = MELINDER.termsPerPower.flatMap((count, i) =>
    Array.from({ length: count }, (_, j) => dx ** i * dt ** j),
  );
  return terms.reduce((sum, term, n) => sum + coefficients[n] * term, 0);
}

const density = (massFraction: number, tC: number) => melinder(MELINDER.density, massFraction, tC);

/** MBL's volumeToMassFraction: the glycol density extrapolated from 60 % to pure glycol. */
export function volumeToMassFraction(volumeFraction: number, tC: number): number {
  const xMax = MELINDER.maxMassFraction;
  const water = density(0, tC);
  const glycol =
    density(xMax, tC) + ((1 - xMax) * (density(xMax, tC) - density(xMax - 0.01, tC))) / 0.01;
  return (volumeFraction * glycol) / (volumeFraction * glycol + (1 - volumeFraction) * water);
}

/** MBL converts the volume fraction at 20 °C. */
const MIXING_TEMPERATURE_C = 20;

/** PG–water by volume fraction (mixed at 20 °C, as MBL) at temperature tC (°C). */
export function propyleneGlycolWater(volumeFraction: number, tC: number): Fluid {
  requireFinite('tC', tC);
  if (!(volumeFraction >= 0 && volumeFraction <= 1)) {
    throw new RangeError(`volumeFraction must be between 0 and 1, got ${volumeFraction}`);
  }
  const x = volumeToMassFraction(volumeFraction, MIXING_TEMPERATURE_C);
  if (x > MELINDER.maxMassFraction) {
    throw new RangeError(`mass fraction ${x} is beyond Melinder's fit (0.6)`);
  }
  return { rho: density(x, tC), mu: 1e-3 * Math.exp(melinder(MELINDER.logViscosity, x, tC)) };
}
