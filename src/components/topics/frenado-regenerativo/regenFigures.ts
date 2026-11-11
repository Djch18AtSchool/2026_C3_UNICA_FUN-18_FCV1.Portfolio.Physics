/**
 * Data of Tema 6's figures, computed from the EPA cycle and the energy kernel (never typed by
 * hand): K(t) of step 1, the road-load terms of step 2, the largest UDDS stop of step 3 and the
 * cycle balance of step 4, with the semantic colors of spec §4.3.
 */
import type { DriveCycle } from '../../../lib/data/driveCycles';
import {
  DEFAULT_REGEN,
  type BalanceStep,
  type CycleSample,
  type RegenParams,
  type RoadLoad,
} from '../../../lib/physics/energy';
import {
  ENERGY_SERIES,
  J_PER_KJ,
  J_PER_KWH,
  KMH_PER_MS,
  W_PER_KW,
  type EnergyKey,
  type EnergySeriesSpec,
} from './regenScene';

export type Point = { x: number; y: number };

export { J_PER_KWH };

const SERIES_BY_KEY = new Map(ENERGY_SERIES.map((series) => [series.key, series]));

/**
 * The color of an energy, shared with the laboratory's ENERGY_SERIES (spec §4.3): battery green,
 * conversion loss cyan, friction heat orange-red, braking at the wheels purple, traction blue and
 * road load a muted neutral.
 */
export function energyColor(key: EnergyKey): string {
  const series = SERIES_BY_KEY.get(key);
  if (!series) throw new RangeError(`no energy series for ${key}`);
  return series.color;
}

/** The car's state (v, K) is drawn in ink; the falling stretches of K too, over a blue K(t). */
export const STATE_COLOR = 'var(--fg)';
export const KINETIC_COLOR = 'var(--chart-1)';

/**
 * The source line of the prescribed chart (spec §6 Paso 4, research pitfall 6): real data and
 * model kept apart. Task 6D passes it verbatim to the chart's `<Figure source={…}>`.
 */
export const ENERGY_BALANCE_SOURCE = {
  text: 'Gráfica del autor con las ecuaciones (6.2) a (6.4); ciclo UDDS y coeficientes de carga: EPA (datos reales); reparto regenerativo/fricción: cálculo propio con el modelo y los parámetros de FASTSim',
  url: 'https://www.epa.gov/vehicle-and-fuel-emissions-testing/dynamometer-drive-schedules',
} as const;

/**
 * The contrast of step 3 only: the site's η and P_máx without FASTSim 2's low-speed fade. Then
 * nothing reaches the friction brakes in these cycles (P_máx 239 kW against a 33 kW UDDS peak).
 */
export const NO_FADE_REGEN: RegenParams = { ...DEFAULT_REGEN, lowSpeedFade: false };

/* ── Step 1: kinetic energy ─────────────────────────────────────────────────────────────── */

/** Step 1 shows the first 200 s of the UDDS. */
export const KINETIC_WINDOW_S = 200;

/** A run of samples over which the speed falls at every second: indices start…end. */
export interface Deceleration {
  start: number;
  end: number;
}

/** Every maximal run of strictly falling speed in the samples. */
export function decelerations(samples: readonly CycleSample[]): Deceleration[] {
  const runs: Deceleration[] = [];
  let start: number | undefined;
  for (let i = 1; i <= samples.length; i += 1) {
    const isFalling = i < samples.length && samples[i].v < samples[i - 1].v;
    if (isFalling && start === undefined) start = i - 1;
    if (!isFalling && start !== undefined) {
      runs.push({ start, end: i - 1 });
      start = undefined;
    }
  }
  return runs;
}

export interface KineticEnergyFigure {
  /** K(t) in kJ, one point per sample of the window. */
  k: Point[];
  /** K(t) on the falling stretches only, each followed by a NaN break. */
  drops: Point[];
  events: Deceleration[];
  /** The deceleration that removes the most K: its times (s), start speed (m/s) and ΔK (J). */
  largest: { tStart: number; tEnd: number; vStart: number; drop: number };
}

/** Step 1's figure: K = ½ m v² over the first 200 s, with each deceleration marked. */
export function kineticEnergyFigure(
  cycle: readonly CycleSample[],
  m: number,
  windowS = KINETIC_WINDOW_S,
): KineticEnergyFigure {
  const samples = cycle.filter((sample) => sample.t <= windowS);
  const kinetic = (v: number) => (0.5 * m * v * v) / J_PER_KJ;
  const k = samples.map(({ t, v }) => ({ x: t, y: kinetic(v) }));
  const events = decelerations(samples);
  const drops = events.flatMap(({ start, end }) => [
    ...k.slice(start, end + 1),
    { x: Number.NaN, y: Number.NaN },
  ]);
  const dropOf = ({ start, end }: Deceleration) => (k[start].y - k[end].y) * J_PER_KJ;
  const largest = events.reduce((best, event) => (dropOf(event) > dropOf(best) ? event : best));
  return {
    k,
    drops,
    events,
    largest: {
      tStart: samples[largest.start].t,
      tEnd: samples[largest.end].t,
      vStart: samples[largest.start].v,
      drop: dropOf(largest),
    },
  };
}

/* ── Step 2: road load ──────────────────────────────────────────────────────────────────── */

/** The speed axis of step 2 reaches past the US06 top speed (80,3 mph = 35,9 m/s). */
export const ROAD_LOAD_MAX_SPEED = 36;
const ROAD_LOAD_STEP = 0.5;

export interface RoadLoadTerms {
  total: Point[];
  rolling: Point[];
  linear: Point[];
  aero: Point[];
}

/** F_RL(v) = A + Bv + Cv² and its three terms, in N against v in m/s. */
export function roadLoadTerms(
  { A, B, C }: RoadLoad,
  vMax = ROAD_LOAD_MAX_SPEED,
  step = ROAD_LOAD_STEP,
): RoadLoadTerms {
  const speeds = Array.from({ length: Math.floor(vMax / step) + 1 }, (_, i) => i * step);
  const at = (term: (v: number) => number) => speeds.map((v) => ({ x: v, y: term(v) }));
  return {
    total: at((v) => A + B * v + C * v * v),
    rolling: at(() => A),
    linear: at((v) => B * v),
    aero: at((v) => C * v * v),
  };
}

/** The speed at which drag equals the constant term: Cv² = A, so v = √(A/C). */
export function roadLoadCrossover({ A, C }: RoadLoad): number {
  return Math.sqrt(A / C);
}

/* ── Step 3: one stop ───────────────────────────────────────────────────────────────────── */

/**
 * A run of intervals with brake power: steps[start] is the instant before the first one,
 * steps[end] the end of the last; energy (J) is the brake energy at the wheels over the run.
 */
export interface BrakingEvent {
  start: number;
  end: number;
  energy: number;
}

/** Every maximal run of intervals with P_freno > 0, in time order. */
export function brakingEvents(steps: readonly BalanceStep[]): BrakingEvent[] {
  const events: BrakingEvent[] = [];
  let start: number | undefined;
  for (let i = 1; i <= steps.length; i += 1) {
    const isBraking = i < steps.length && steps[i].pBrake > 0;
    if (isBraking && start === undefined) start = i - 1;
    if (!isBraking && start !== undefined) {
      events.push({ start, end: i - 1, energy: steps[i - 1].eBrake - steps[start].eBrake });
      start = undefined;
    }
  }
  return events;
}

/** The stop with the most brake energy; a cycle without braking has none. */
export function largestBrakingEvent(steps: readonly BalanceStep[]): BrakingEvent {
  const events = brakingEvents(steps);
  if (events.length === 0) throw new RangeError('the cycle has no braking interval');
  return events.reduce((best, event) => (event.energy > best.energy ? event : best));
}

/** Step 3 shows 5 s of the cycle before and after the stop. */
export const BRAKING_PAD_S = 5;

export interface BrakingWindow {
  /** P_freno, P_regen and η P_regen in kW, piecewise constant: two points per interval. */
  brake: Point[];
  regen: Point[];
  battery: Point[];
  /** Energies of the stop (J): brake = battery + losses + friction. */
  energies: { brake: number; battery: number; losses: number; friction: number };
}

/** The stop's powers, drawn as one-second steps so the areas are exactly Σ P Δt. */
export function brakingWindow(
  steps: readonly BalanceStep[],
  event: BrakingEvent,
  eta: number,
  padS = BRAKING_PAD_S,
): BrakingWindow {
  const from = steps[event.start].t - padS;
  const to = steps[event.end].t + padS;
  const intervals = steps
    .map((step, i) => ({ step, previous: steps[i - 1] }))
    .filter(({ step, previous }) => previous && previous.t >= from && step.t <= to);
  const stairs = (power: (step: BalanceStep) => number) =>
    intervals.flatMap(({ step, previous }) => [
      { x: previous.t, y: power(step) / W_PER_KW },
      { x: step.t, y: power(step) / W_PER_KW },
    ]);
  const [first, last] = [steps[event.start], steps[event.end]];
  const brake = last.eBrake - first.eBrake;
  const battery = last.eBattery - first.eBattery;
  const friction = last.eFriction - first.eFriction;
  return {
    brake: stairs((s) => s.pBrake),
    regen: stairs((s) => s.pRegen),
    battery: stairs((s) => eta * s.pRegen),
    energies: { brake, battery, losses: brake - battery - friction, friction },
  };
}

/* ── Step 4: the balance of the cycle ───────────────────────────────────────────────────── */

export type EnergySeries = EnergySeriesSpec & { points: Point[] };

/** v(t) in km/h and the lab's six cumulative energies in kWh, one point per step (not thinned). */
export function energyBalanceSeries(steps: readonly BalanceStep[]): {
  speed: Point[];
  energies: EnergySeries[];
} {
  return {
    speed: steps.map(({ t, v }) => ({ x: t, y: v * KMH_PER_MS })),
    energies: ENERGY_SERIES.map((spec) => ({
      ...spec,
      points: steps.map((step) => ({ x: step.t, y: step[spec.key] / J_PER_KWH })),
    })),
  };
}

/** Length (m) of a cycle: Σ v̄ Δt with the interval's mean speed, as the balance does. */
export function cycleDistance({ samples }: DriveCycle): number {
  return samples
    .slice(1)
    .reduce((sum, s, i) => sum + ((s.v + samples[i].v) / 2) * (s.t - samples[i].t), 0);
}

export const toKmh = (v: number): number => v * KMH_PER_MS;
