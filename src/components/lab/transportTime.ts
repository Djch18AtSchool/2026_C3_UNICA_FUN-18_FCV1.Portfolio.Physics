/**
 * The transport's "t = …" text. The clock always counts seconds; the display picks one unit for
 * the whole run (from its duration, or the one a lab fixes), so the readout never switches units
 * mid-playback.
 */
import { formatNumber } from '../../lib/format';

/** A fixed display unit, or 'auto' to choose it from the run's duration. */
export type TransportTimeUnitChoice = 's' | 'min' | 'h' | 'd' | 'auto';

export interface TransportTimeUnit {
  symbol: string;
  /** Seconds in one of this unit. */
  seconds: number;
  /** Decimals shown in this unit for this run. */
  precision: number;
}

/** The timeline maps t ∈ [0, duration] onto 0..TIMELINE_STEPS integer positions. */
export const TIMELINE_STEPS = 1000;

const SECONDS_PER_UNIT = { s: 1, min: 60, h: 3600, d: 86_400 } as const;
type UnitSymbol = keyof typeof SECONDS_PER_UNIT;
/** 'auto' moves to the next unit once the run lasts at least this many of the larger one. */
const UNIT_SWITCH_COUNT = 2;
/** Larger units first: the first one the run reaches UNIT_SWITCH_COUNT of. */
const AUTO_ORDER: readonly UnitSymbol[] = ['d', 'h', 'min'];
/** Auto seconds (runs under 120 s) keep the three decimals the labs always showed. */
const SECONDS_PRECISION = 3;
/** Larger units of a run whose duration is not a positive finite number. */
const FALLBACK_PRECISION = 2;
/** Float slack so a step of exactly 0,1 or 0,01 of the unit is not pushed to one more decimal. */
const LOG_EPSILON = 1e-9;

function autoSymbol(duration: number): UnitSymbol {
  if (!Number.isFinite(duration)) return 's';
  return (
    AUTO_ORDER.find((symbol) => duration >= UNIT_SWITCH_COUNT * SECONDS_PER_UNIT[symbol]) ?? 's'
  );
}

/**
 * The fewest decimals at which one timeline step (duration / TIMELINE_STEPS) changes the last
 * digit, so consecutive positions never read the same, and no decimal finer than a step.
 * `fallback` when the duration is not a positive finite number.
 */
function stepPrecision(duration: number, unitSeconds: number, fallback: number): number {
  const step = duration / TIMELINE_STEPS / unitSeconds;
  if (!Number.isFinite(step) || step <= 0) return fallback;
  return Math.max(0, Math.ceil(-Math.log10(step) - LOG_EPSILON));
}

/**
 * The display unit of a run: 'auto' reads seconds below 120 s, minutes below 2 h, hours below 2 d
 * and days beyond (seconds when the duration is not finite). Auto seconds show three decimals;
 * any other unit, seconds fixed by a lab included, as many as one timeline step needs (a 1 369 s
 * UDDS in fixed seconds reads whole seconds, not a false "1 369,000 s").
 */
export function transportTimeUnit(
  duration: number,
  choice: TransportTimeUnitChoice = 'auto',
): TransportTimeUnit {
  const symbol = choice === 'auto' ? autoSymbol(duration) : choice;
  const seconds = SECONDS_PER_UNIT[symbol];
  const precision =
    choice === 'auto' && symbol === 's'
      ? SECONDS_PRECISION
      : stepPrecision(duration, seconds, symbol === 's' ? SECONDS_PRECISION : FALLBACK_PRECISION);
  return { symbol, seconds, precision };
}

/** A time (s) of a run of `duration` (s) in that run's unit: "2,688 d", "1,93 min". */
export function transportTimeValue(
  seconds: number,
  duration: number,
  choice: TransportTimeUnitChoice = 'auto',
): string {
  const unit = transportTimeUnit(duration, choice);
  return formatNumber(seconds / unit.seconds, { precision: unit.precision, unit: unit.symbol });
}

/** "t = 1,234 s", "t = 22,82 min", "t = 39,99 h", "t = 1,670 d": t (s) in the unit of its run. */
export function transportTimeText(
  t: number,
  duration: number,
  choice: TransportTimeUnitChoice = 'auto',
): string {
  return `t = ${transportTimeValue(t, duration, choice)}`;
}
