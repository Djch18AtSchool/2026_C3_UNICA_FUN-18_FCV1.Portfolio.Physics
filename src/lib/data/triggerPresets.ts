/**
 * Tema 5's worked examples, one source for the text's numbers: the example spring k = 400 N/m,
 * the fixed vibration's amplitude F₀, the laboratory's presets and the readings at a travel x.
 * Millimetres in, SI through the kernel (src/lib/physics/spring.ts), N and mJ out.
 */
import { elasticEnergy, hookeForce, piecewiseResistance } from '../physics';
import type { Preset } from '../presets';
import { TRIGGER_TRAVEL_MM } from './triggerModel';

const MM_PER_M = 1000;
const MILLIJOULES_PER_JOULE = 1000;

const toMetres = (millimetres: number) => millimetres / MM_PER_M;

/** The virtual spring's settings: stiffness k (N/m) and the start of the resistance x₀ (mm). */
export interface SpringSettings {
  k: number;
  x0Mm: number;
}

export interface TriggerReadings {
  /** Resistance of the trigger profile, equation (5.4), N. */
  force: number;
  /** k·x, the magnitude of the ideal spring's force −k x, N. */
  hooke: number;
  /** Elastic energy ½ k x² of the ideal spring at x, mJ. */
  energy: number;
  /** Work of the finger against the profile from 0 to x: the area ½ k (x − x₀)² for x ≥ x₀, mJ. */
  work: number;
}

/** The readings of a virtual spring with the trigger at xMm (mm), all from the kernel. */
export function triggerReadings({ k, x0Mm }: SpringSettings, xMm: number): TriggerReadings {
  const x = toMetres(xMm);
  const x0 = toMetres(x0Mm);
  return {
    force: piecewiseResistance(x, x0, k),
    hooke: -hookeForce(k, x),
    energy: elasticEnergy(k, x) * MILLIJOULES_PER_JOULE,
    work: elasticEnergy(k, Math.max(x - x0, 0)) * MILLIJOULES_PER_JOULE,
  };
}

/** The text's example spring, N/m: illustrative, no published mapping gives the DualSense's own. */
export const EXAMPLE_K = 400;

/** The ideal example spring, engaged from rest. */
export const EXAMPLE_SPRING: Readonly<SpringSettings> = { k: EXAMPLE_K, x0Mm: 0 };

/**
 * Amplitude F₀ of the fixed vibration (5.1), N: a model assumption set equal to the example
 * spring's force at mid travel, k · 4 mm = 1,6 N, so the two compare.
 */
export const VIBRATION_AMPLITUDE_N = triggerReadings(EXAMPLE_SPRING, TRIGGER_TRAVEL_MM / 2).hooke;

export type Damping = 'critica' | 'subamortiguada';

/** What a trigger preset sets: the virtual spring and the damping of the release. */
export interface TriggerPresetValues {
  k: number;
  x0Mm: number;
  damping: Damping;
}

/**
 * The text's worked examples: the ideal spring (k = 400 N/m from x₀ = 0), the late-engaging
 * spring of step 4 (x₀ = 3 mm) and the same spring released with 0,3 of the critical damping.
 * k and x₀ are illustrative: no published mapping turns the API's 0–1 intensities and positions
 * into N/m and mm, so no preset claims to be the DualSense's own values.
 */
export const TRIGGER_PRESETS: Preset<TriggerPresetValues>[] = [
  {
    id: 'ideal',
    name: 'Resorte ideal',
    values: { k: EXAMPLE_K, x0Mm: 0, damping: 'critica' },
    sourceLabel: 'cálculo propio con la ecuación (5.2)',
    note: 'Al fondo, 3,2 N y 12,8 mJ desde el reposo.',
  },
  {
    id: 'tardio',
    name: 'Resorte tardío',
    values: { k: EXAMPLE_K, x0Mm: 3, damping: 'critica' },
    sourceLabel: 'cálculo propio con la ecuación (5.4)',
    note: 'El ejemplo del paso 4, con valores ilustrativos: la resistencia empieza a 3 mm y al fondo da 2,0 N y 5,0 mJ de trabajo del dedo.',
  },
  {
    id: 'subamortiguado',
    name: 'Subamortiguado',
    values: { k: EXAMPLE_K, x0Mm: 0, damping: 'subamortiguada' },
    sourceLabel: 'supuesto del modelo, $c$ = 0,3 del valor crítico',
    note: 'Con menos amortiguación la palanca vuelve antes y choca con el tope del reposo, que la detiene sin rebote.',
  },
];
