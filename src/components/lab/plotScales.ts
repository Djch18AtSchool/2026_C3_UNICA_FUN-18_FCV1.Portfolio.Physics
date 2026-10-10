/** Pure plotting math for SvgPlot: linear scales, nice ticks and padded domains. No React. */

export interface Domain {
  min: number;
  max: number;
}

export interface Scale {
  toPx(v: number): number;
  toValue(px: number): number;
  domain: Domain;
  range: [number, number];
}

/** Nice step mantissas; 10 closes the decade so a raw step near the next power is reachable. */
const NICE_MANTISSAS = [1, 2, 2.5, 5, 10] as const;
/** Significant digits kept when cleaning k·step products (0.30000000000000004 → 0.3). */
const CLEAN_PRECISION = 12;
/** Tolerance, in steps, so a tick sitting on a domain end survives floating point error. */
const STEP_EPSILON = 1e-9;
const MAX_TICK_DECIMALS = 2;

function assertDomain(domain: Domain, caller: string): void {
  const { min, max } = domain;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    throw new RangeError(`${caller}: el dominio necesita min < max finitos (${min}, ${max})`);
  }
}

function clean(value: number): number {
  return Number.parseFloat(value.toPrecision(CLEAN_PRECISION));
}

/** A linear map between a value domain and a pixel range; the range may run backwards. */
export function linearScale(domain: Domain, range: [number, number]): Scale {
  assertDomain(domain, 'linearScale');
  const [r0, r1] = range;
  if (!Number.isFinite(r0) || !Number.isFinite(r1) || r0 === r1) {
    throw new RangeError(`linearScale: el rango necesita dos extremos finitos distintos`);
  }
  const span = domain.max - domain.min;
  const length = r1 - r0;
  return {
    toPx: (v) => r0 + ((v - domain.min) / span) * length,
    toValue: (px) => domain.min + ((px - r0) / length) * span,
    domain: { ...domain },
    range: [r0, r1],
  };
}

/** The step in {1, 2, 2.5, 5} × 10^n closest to rawStep. */
function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const candidates = NICE_MANTISSAS.map((mantissa) => mantissa * magnitude);
  return candidates.reduce((best, step) =>
    Math.abs(step - rawStep) < Math.abs(best - rawStep) ? step : best,
  );
}

/** About `count` ticks at a nice step, every multiple of it that lies inside the domain. */
export function niceTicks(domain: Domain, count: number): number[] {
  assertDomain(domain, 'niceTicks');
  if (!Number.isFinite(count) || count < 1) {
    throw new RangeError(`niceTicks: se necesita al menos un intervalo (${count})`);
  }
  const step = niceStep((domain.max - domain.min) / count);
  const first = Math.ceil(domain.min / step - STEP_EPSILON);
  const last = Math.floor(domain.max / step + STEP_EPSILON);
  return Array.from({ length: last - first + 1 }, (_, i) => clean((first + i) * step));
}

/** Decimals that print a tick step exactly (20 → 0, 2.5 → 1, 0.25 → 2), capped at two. */
export function tickDecimals(step: number): number {
  for (let decimals = 0; decimals < MAX_TICK_DECIMALS; decimals += 1) {
    const scaled = step * 10 ** decimals;
    if (Math.abs(scaled - Math.round(scaled)) < STEP_EPSILON * Math.max(1, scaled)) {
      return decimals;
    }
  }
  return MAX_TICK_DECIMALS;
}

/**
 * The extent of `values` widened by padFraction of its span on each side; with includeZero the
 * padded domain is then stretched to reach 0, so a zero end carries no padding.
 * A degenerate extent (one distinct value) is padded around that value instead.
 */
export function padDomain(values: number[], padFraction: number, includeZero = false): Domain {
  if (values.length === 0) throw new RangeError('padDomain: no hay valores');
  if (!values.every(Number.isFinite)) {
    throw new RangeError('padDomain: todos los valores deben ser finitos');
  }
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || Math.abs(low) || 1;
  const pad = span * padFraction;
  const padded = { min: low - pad, max: high + pad };
  const domain = includeZero
    ? { min: Math.min(padded.min, 0), max: Math.max(padded.max, 0) }
    : padded;
  if (domain.max > domain.min) return { min: clean(domain.min), max: clean(domain.max) };
  // Padding of zero around a single value: open a unit-wide window so a scale can be built.
  return { min: domain.min - span / 2, max: domain.max + span / 2 };
}

/** Advance of one character of the plots' monospace font, in em (IBM Plex Mono: 600/1000). */
const MONO_CHAR_EM = 0.6;

/** Estimated width (px) of `text` set in the plots' monospace font at `fontSize`. */
export function monoTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * MONO_CHAR_EM;
}

/** The centre x that keeps a text of `width` inside [min, max], or `x` when it already fits. */
export function fitCentre(x: number, width: number, min: number, max: number): number {
  const half = width / 2;
  if (max - min <= width) return (min + max) / 2;
  return Math.min(Math.max(x, min + half), max - half);
}
