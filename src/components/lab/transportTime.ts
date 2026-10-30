/**
 * The transport's "t = …" text. The clock always counts seconds; the display picks one unit for
 * the whole run from its duration, so the readout never switches units mid-playback.
 */
import { formatNumber } from '../../lib/format';

export interface TransportTimeUnit {
  symbol: string;
  /** Seconds in one of this unit. */
  seconds: number;
  /** Decimals shown in this unit. */
  precision: number;
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86_400;
/** A run switches to the next unit when it lasts at least this many of the larger one. */
const UNIT_SWITCH_COUNT = 2;
/**
 * Seconds keep the three decimals the short labs always showed. The larger units show two: the
 * timeline moves in thousandths of the run, so a third decimal would be noise.
 */
const SECONDS_PRECISION = 3;
const SCALED_PRECISION = 2;

const SECONDS: TransportTimeUnit = { symbol: 's', seconds: 1, precision: SECONDS_PRECISION };

/** Each unit with the duration (s) from which a run reads in it, largest first. */
const SCALED_UNITS: readonly (TransportTimeUnit & { from: number })[] = [
  {
    symbol: 'd',
    seconds: SECONDS_PER_DAY,
    precision: SCALED_PRECISION,
    from: UNIT_SWITCH_COUNT * SECONDS_PER_DAY,
  },
  {
    symbol: 'h',
    seconds: SECONDS_PER_HOUR,
    precision: SCALED_PRECISION,
    from: UNIT_SWITCH_COUNT * SECONDS_PER_HOUR,
  },
  {
    symbol: 'min',
    seconds: SECONDS_PER_MINUTE,
    precision: SCALED_PRECISION,
    from: UNIT_SWITCH_COUNT * SECONDS_PER_MINUTE,
  },
];

/** Seconds below 120 s, minutes below 2 h, hours below 2 d, days beyond; seconds when undefined. */
export function transportTimeUnit(duration: number): TransportTimeUnit {
  if (!Number.isFinite(duration)) return SECONDS;
  const scaled = SCALED_UNITS.find((unit) => duration >= unit.from);
  if (!scaled) return SECONDS;
  const { symbol, seconds, precision } = scaled;
  return { symbol, seconds, precision };
}

/** "t = 1,234 s", "t = 22,82 min", "t = 39,99 h", "t = 1,67 d": t (s) in the unit of its run. */
export function transportTimeText(t: number, duration: number): string {
  const { symbol, seconds, precision } = transportTimeUnit(duration);
  return `t = ${formatNumber(t / seconds, { precision, unit: symbol })}`;
}
