/**
 * Time in Tema 6's laboratory: the cycle's stops as events of the transport, and its two views:
 * «Tramo», one braking of the cycle played at real time on its own clock (figure 6.3's in the
 * UDDS), and «Ciclo», the whole cycle in time lapse. Everything comes from the EPA cycle and the
 * energy kernel, never typed by hand. Times in s of the cycle unless a name says «clock».
 */
import { MODEL3_LR_RWD_2025, type EvModel } from '../../../lib/data/evModels';
import { cycleBalance, DEFAULT_REGEN, type CycleSample } from '../../../lib/physics/energy';
import type { TransportMarker } from '../../lab/transportMarkers';
import { BRAKING_PAD_S, largestBrakingEvent } from './regenFigures';
import { ENERGY_SERIES, type BalanceAt, type EnergyKey } from './regenScene';

export type RegenView = 'tramo' | 'ciclo';

/** «Ciclo» compresses the cycle 20 times: the 1 369 s UDDS in 68,5 s at speed 1. */
export const CYCLE_TIME_LAPSE = 20;

/** Instants at which the car comes to rest: a sample at v = 0 right after one in motion. */
export function cycleStops(samples: readonly CycleSample[]): number[] {
  return samples
    .filter((sample, i) => i > 0 && sample.v === 0 && samples[i - 1].v > 0)
    .map((sample) => sample.t);
}

/**
 * One marker per stop, named by its place among the cycle's stops («Detención 4 de 17»); a
 * cycle's only stop is just «Detención».
 */
export function stopMarkers(stops: readonly number[]): TransportMarker[] {
  const name = (i: number) =>
    stops.length === 1 ? 'Detención' : `Detención ${i + 1} de ${stops.length}`;
  return stops.map((t, i) => ({ t, label: name(i), kind: 'stop' }));
}

/** A stretch of the cycle, from `start` to `end`. */
export interface Stretch {
  readonly start: number;
  readonly end: number;
}

/**
 * The stretch «Tramo» plays: the cycle's braking with the most brake energy at the wheels and
 * `pad` seconds on each side, clamped to the cycle, exactly figure 6.3's window in the UDDS. It is
 * the cycle's, computed with the figure's car, so a preset with another car keeps the same stretch.
 * Throws a RangeError for a run without braking.
 */
export function brakingStretch(
  samples: readonly CycleSample[],
  pad = BRAKING_PAD_S,
  car: EvModel = MODEL3_LR_RWD_2025,
): Stretch {
  const { steps } = cycleBalance(samples, car, DEFAULT_REGEN);
  const event = largestBrakingEvent(steps);
  return {
    start: Math.max(steps[event.start].t - pad, samples[0].t),
    end: Math.min(steps[event.end].t + pad, samples[samples.length - 1].t),
  };
}

/** The markers within the stretch (ends included), on its own clock (t − start), names kept. */
export function markersInStretch(
  markers: readonly TransportMarker[],
  { start, end }: Stretch,
): TransportMarker[] {
  return markers
    .filter(({ t }) => t >= start && t <= end)
    .map((marker) => ({ ...marker, t: marker.t - start }));
}

/** The clock of a view: where its t = 0 falls in the cycle, how long it runs and its time scale. */
export interface ViewTiming {
  readonly offset: number;
  readonly duration: number;
  readonly timeScale: number;
}

export function viewTiming(view: RegenView, stretch: Stretch, cycleDuration: number): ViewTiming {
  return view === 'tramo'
    ? { offset: stretch.start, duration: stretch.end - stretch.start, timeScale: 1 }
    : { offset: 0, duration: cycleDuration, timeScale: CYCLE_TIME_LAPSE };
}

/**
 * The clock time a view opens at when the lab switches to it from the instant `cycleT` of the
 * cycle: that same instant when the view holds it, else the view's beginning.
 */
export function viewSwitchTime({ offset, duration }: ViewTiming, cycleT: number): number {
  const t = cycleT - offset;
  return t >= 0 && t <= duration ? t : 0;
}

const J_PER_KJ = 1000;
/** A stretch's bars end at its largest energy rounded up to this many kJ (at least one grain). */
const STRETCH_AXIS_GRAIN_KJ = 50;
const ENERGY_KEYS: readonly EnergyKey[] = ENERGY_SERIES.map(({ key }) => key);

/**
 * The balance of a stretch at the instant `at`: every energy counted from `base` (the stretch's
 * start), while speed, distance and powers stay the instant's own. The share recovered is of the
 * stretch's braking at the wheels (E_batería / E_freno): a braking stretch has almost no traction
 * (24,8 kJ against 168,1 kJ to the battery in the UDDS's), so a share of it would pass 600 %.
 */
export function balanceSince(at: BalanceAt, base: BalanceAt): BalanceAt {
  const energies = Object.fromEntries(
    ENERGY_KEYS.map((key) => [key, at[key] - base[key]]),
  ) as Record<EnergyKey, number>;
  return {
    ...at,
    ...energies,
    recoveredShare: energies.eBrake > 0 ? energies.eBattery / energies.eBrake : 0,
  };
}

/** The bars' end (kJ) for a stretch from `start` to `end`: its largest energy, up to 50 kJ. */
export function stretchAxisMax(start: BalanceAt, end: BalanceAt): number {
  const largest = Math.max(...ENERGY_KEYS.map((key) => (end[key] - start[key]) / J_PER_KJ));
  const grains = Math.max(1, Math.ceil(largest / STRETCH_AXIS_GRAIN_KJ));
  return grains * STRETCH_AXIS_GRAIN_KJ;
}
