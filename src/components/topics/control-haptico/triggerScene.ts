/**
 * Pure model of Tema 5's trigger laboratory: the lever's geometry, the release (the damped spring
 * of the kernel stepped at a fixed dt) and the readings. Millimetres in the UI, SI in the kernel:
 * the conversion happens here, once.
 */
import {
  criticalDamping,
  dampedSpringStep,
  elasticEnergy,
  isAtRest,
  piecewiseResistance,
  type OscillatorParams,
  type OscillatorState,
} from '../../../lib/physics';
import { requirePositive } from '../../../lib/physics/validate';
import { TRIGGER_TRAVEL_MM } from '../../../lib/data/triggerModel';
import type { Preset } from '../../../lib/presets';

/** Assumed mass of the lever for the release, 20 g: an illustrative value, not a measured one. */
export const TRIGGER_MASS_KG = 0.02;
/**
 * Fixed integration step of the release, s of simulated time; each animation frame runs as many
 * as fit. At k = 600 N/m and 20 g, ω₀·dt = 173 · 1/4800 ≈ 0,036: the semi-implicit Euler steps
 * follow the analytic return within about 2 % over its visible part.
 */
export const RELEASE_DT = 1 / 4800;
/**
 * The release is displayed this many times slower than computed: the real return lasts a few
 * hundredths of a second, too fast to watch. The physics is unchanged; only the clock is.
 */
export const SLOW_MOTION = 10;
/** The release never animates longer than this, s of displayed time; it then snaps to rest. */
export const MAX_RELEASE_S = 3;
/** Simulated time that fills MAX_RELEASE_S of display. */
const MAX_SIMULATED_S = MAX_RELEASE_S / SLOW_MOTION;
/** Longest real time a single frame may add, s: a background tab must not jump the lever. */
const MAX_FRAME_S = 0.05;
/** Float slack when counting whole steps in a frame. */
const STEP_EPSILON = 1e-9;
const MM_PER_M = 1000;
const MILLIJOULES_PER_JOULE = 1000;

/** Keyboard grains on the lever: 0,1 mm, and 1 mm with Shift or the Page keys. */
const KEY_STEP_MM = 0.1;
const BIG_KEY_STEP_MM = 1;
const GRID_DECIMALS = 1;

export type Damping = 'critica' | 'subamortiguada';

/** Share of the critical damping c = 2√(k m) each setting applies. */
const DAMPING_RATIOS: Record<Damping, number> = { critica: 1, subamortiguada: 0.3 };

export const DAMPING_OPTIONS: { value: Damping; label: string }[] = [
  { value: 'critica', label: 'Crítica, c = 2√(k m)' },
  { value: 'subamortiguada', label: 'Subamortiguada, 0,3 del valor crítico' },
];

export function dampingRatio(damping: Damping): number {
  return DAMPING_RATIOS[damping];
}

/** What a trigger preset sets: the virtual spring and the damping of the release. */
export interface TriggerPresetValues {
  k: number;
  x0Mm: number;
  damping: Damping;
}

/**
 * The text's worked examples: the ideal spring (k = 400 N/m from x₀ = 0), the late-engaging
 * trigger of step 4 (x₀ = 3 mm) and the same spring released with 0,3 of the critical damping.
 * k and x₀ are illustrative: no published mapping turns force and startPosition into N/m and mm.
 */
export const TRIGGER_PRESETS: Preset<TriggerPresetValues>[] = [
  {
    id: 'ideal',
    name: 'Resorte ideal',
    values: { k: 400, x0Mm: 0, damping: 'critica' },
    sourceLabel: 'k = 400 N/m · x₀ = 0',
    note: 'Al fondo, 3,2 N y 12,8 mJ: la ecuación (5.2) desde el reposo.',
  },
  {
    id: 'dualsense',
    name: 'Gatillo DualSense',
    values: { k: 400, x0Mm: 3, damping: 'critica' },
    sourceLabel: 'k = 400 N/m · x₀ = 3 mm',
    note: 'El ejemplo del paso 4, con valores ilustrativos: al fondo, 2,0 N y 5,0 mJ de trabajo del dedo.',
  },
  {
    id: 'subamortiguado',
    name: 'Subamortiguado',
    values: { k: 400, x0Mm: 0, damping: 'subamortiguada' },
    sourceLabel: 'c = 0,3 del valor crítico',
    note: 'Con menos amortiguación la palanca vuelve antes y choca con el tope del reposo, que la detiene sin rebote.',
  },
];

/** The id of the preset whose values the lab matches exactly, if any. */
export function triggerPresetIdFor({ k, x0Mm, damping }: TriggerPresetValues): string | undefined {
  return TRIGGER_PRESETS.find(
    ({ values }) => values.k === k && values.x0Mm === x0Mm && values.damping === damping,
  )?.id;
}

export const toMetres = (millimetres: number) => millimetres / MM_PER_M;
export const toMillimetres = (metres: number) => metres * MM_PER_M;

/** Lever angle from rest (deg) for a travel x (mm): linear, maxAngle at the end of the travel. */
export function leverAngle(xMm: number, travelMm: number, maxAngleDeg: number): number {
  requirePositive('travelMm', travelMm);
  requirePositive('maxAngleDeg', maxAngleDeg);
  return (xMm / travelMm) * maxAngleDeg;
}

/** Travel x (mm) for a lever angle from rest (deg): the inverse of leverAngle. */
export function xFromLever(angleDeg: number, travelMm: number, maxAngleDeg: number): number {
  requirePositive('travelMm', travelMm);
  requirePositive('maxAngleDeg', maxAngleDeg);
  return (angleDeg / maxAngleDeg) * travelMm;
}

/** The oscillator the lever returns with: k of the lab, 20 g, a share of the critical damping. */
export function releaseParams(k: number, ratio = 1): OscillatorParams {
  return { k, m: TRIGGER_MASS_KG, c: ratio * criticalDamping(k, TRIGGER_MASS_KG) };
}

const clampTravel = (xMm: number) => Math.min(TRIGGER_TRAVEL_MM, Math.max(0, xMm));

/**
 * Travel (mm) under a pointer, from its angle about the pivot (SVG angles, y down, so pressing
 * turns the lever clockwise), clamped to 0–8 mm.
 */
export function xFromPointer(
  point: { x: number; y: number },
  pivot: { x: number; y: number },
  restDeg: number,
  travelMm: number,
  maxAngleDeg: number,
): number {
  const degrees = (Math.atan2(point.y - pivot.y, point.x - pivot.x) * 180) / Math.PI;
  return clampTravel(xFromLever(degrees - restDeg, travelMm, maxAngleDeg));
}

/** Where a key moves the lever (mm), on the 0,1 mm grid inside the travel; undefined if unbound. */
export function triggerKeyTarget(key: string, isShift: boolean, xMm: number): number | undefined {
  const step = isShift ? BIG_KEY_STEP_MM : KEY_STEP_MM;
  const targets: Record<string, number> = {
    ArrowRight: xMm + step,
    ArrowUp: xMm + step,
    ArrowLeft: xMm - step,
    ArrowDown: xMm - step,
    PageUp: xMm + BIG_KEY_STEP_MM,
    PageDown: xMm - BIG_KEY_STEP_MM,
    Home: 0,
    End: TRIGGER_TRAVEL_MM,
  };
  const target = targets[key];
  if (target === undefined) return undefined;
  return Number(clampTravel(target).toFixed(GRID_DECIMALS));
}

/** A release in progress: the oscillator in SI, the simulated time and the unspent simulated time. */
export interface ReleaseState {
  state: OscillatorState;
  elapsed: number;
  carry: number;
  isDone: boolean;
}

/** A lever let go at x (mm), still. */
export function startRelease(xMm: number): ReleaseState {
  return { state: { x: toMetres(xMm), v: 0 }, elapsed: 0, carry: 0, isDone: false };
}

const AT_REST: OscillatorState = { x: 0, v: 0 };

/**
 * Advances a release by one frame of real time (at most 50 ms), which is frameSeconds/SLOW_MOTION
 * of simulated time, in whole steps of RELEASE_DT (the remainder carries to the next frame). The
 * rest stop is inelastic: a step that reaches x ≤ 0 ends the release at x = 0, still. It also ends
 * when the kernel's isAtRest holds or after MAX_RELEASE_S of displayed time.
 */
export function advanceRelease(
  release: ReleaseState,
  frameSeconds: number,
  params: OscillatorParams,
): ReleaseState {
  if (release.isDone) return release;
  if (isAtRest(release.state)) return { ...release, state: AT_REST, carry: 0, isDone: true };
  const frame = Math.min(Math.max(frameSeconds, 0), MAX_FRAME_S);
  let budget = release.carry + frame / SLOW_MOTION;
  let state = release.state;
  let elapsed = release.elapsed;
  while (budget + STEP_EPSILON >= RELEASE_DT) {
    state = dampedSpringStep(state, params, RELEASE_DT);
    elapsed += RELEASE_DT;
    budget -= RELEASE_DT;
    const isAtStop = state.x <= 0;
    if (isAtStop || isAtRest(state) || elapsed + STEP_EPSILON >= MAX_SIMULATED_S) {
      return { state: AT_REST, elapsed, carry: 0, isDone: true };
    }
  }
  return { state, elapsed, carry: Math.max(budget, 0), isDone: false };
}

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

export function triggerReadings({ k, x0Mm }: SpringSettings, xMm: number): TriggerReadings {
  const x = toMetres(xMm);
  const x0 = toMetres(x0Mm);
  return {
    force: piecewiseResistance(x, x0, k),
    hooke: k * x,
    energy: elasticEnergy(k, x) * MILLIJOULES_PER_JOULE,
    work: elasticEnergy(k, Math.max(x - x0, 0)) * MILLIJOULES_PER_JOULE,
  };
}
