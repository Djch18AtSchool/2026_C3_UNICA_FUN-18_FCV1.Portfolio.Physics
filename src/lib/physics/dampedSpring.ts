/**
 * Tema 10's damped spring, m ü + b u̇ + k u = 0 (10.3), solved analytically as UI animation
 * libraries do (Motion v14.14.0, packages/motion-dom/src/animation/generators/spring.ts L362-L455;
 * research docs/superpowers/research/2026-11-17-animaciones-resorte.md §5). u = x − x_target is the
 * offset from the target and v = u̇; the length unit cancels, so pixels or metres give the same k
 * and b.
 */
import { criticalDamping } from './spring';
import { requireFinite, requireNonNegative, requirePositive } from './validate';

/** Stiffness k (N/m), viscous damping b (N·s/m) and mass m (kg). */
export interface SpringParams {
  k: number;
  b: number;
  m: number;
}

export type DampingRegime = 'sin-amortiguar' | 'subamortiguado' | 'critico' | 'sobreamortiguado';

/**
 * |ζ − 1| below this is «crítico»: the critical branch is used there, so neither the regime label
 * nor the state depends on dividing by a vanishing ω_d or √(ζ² − 1).
 */
export const CRITICAL_TOLERANCE = 1e-9;

/** Bisection steps for the band entry: 2⁻⁶⁴ of the bracket, far below any plotted resolution. */
const SETTLING_BISECTION_STEPS = 64;
/**
 * Forward steps over the extrema after the logarithmic estimate, which starts at most two early.
 * The cap only stops the walk where t is so large (n ≥ 2⁵³) that n + 1 rounds to n.
 */
const MAX_EXTREMUM_STEPS = 8;

/** Offset from the target u and velocity v: what springState returns. */
export interface OffsetState {
  u: number;
  v: number;
}

/** One regime's closed form for given u₀ and v₀: its state and its settling time. */
interface Solution {
  state: (t: number) => OffsetState;
  /** The last time |u| is above `band` (> 0), or 0 if it never is. */
  settle: (band: number) => number;
}

function requireParams({ k, b, m }: SpringParams): void {
  requirePositive('k', k);
  requireNonNegative('b', b);
  requirePositive('m', m);
}

/** ω₀ = √(k/m) (10.2), rad/s. */
export function naturalAngularFrequency(p: SpringParams): number {
  requireParams(p);
  return Math.sqrt(p.k / p.m);
}

/** ζ = b / (2√(km)) (10.4): b over the critical damping b_c of Módulo 5 and Tema 5. */
export function dampingRatio(p: SpringParams): number {
  requireParams(p);
  return p.b / criticalDamping(p.k, p.m);
}

/** The regime of (10.6); «crítico» within CRITICAL_TOLERANCE of ζ = 1, «sin amortiguar» only for b = 0. */
export function dampingRegime(p: SpringParams): DampingRegime {
  const zeta = dampingRatio(p);
  if (p.b === 0) return 'sin-amortiguar';
  if (Math.abs(zeta - 1) < CRITICAL_TOLERANCE) return 'critico';
  return zeta < 1 ? 'subamortiguado' : 'sobreamortiguado';
}

/**
 * The band entry in [low, high]: |u| is above the band at `low` and, once below it, stays below
 * until `high` (the bracket holds one monotonic stretch of u, or ends where u is settled for good).
 */
function bandEntry(isOutside: (t: number) => boolean, low: number, high: number): number {
  let [lo, hi] = [low, high];
  for (let i = 0; i < SETTLING_BISECTION_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (isOutside(mid)) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** The band entry in [0, end], one monotonic stretch of u; 0 if u starts inside and so stays. */
function entryFromStart(isOutside: (t: number) => boolean, end: number): number {
  return isOutside(0) ? bandEntry(isOutside, 0, end) : 0;
}

/** Wraps an angle into [0, π) (atan2 gives (−π, π]). */
const wrapHalfTurn = (angle: number) => ((angle % Math.PI) + Math.PI) % Math.PI;

/**
 * ζ < 1 (and ζ = 0): u = e^(−ζω₀t)[u₀ cos ω_d t + (v₀ + ζω₀u₀)/ω_d · sin ω_d t], ω_d = ω₀√(1 − ζ²).
 * Shifting t by half a period π/ω_d flips u and scales it by e^(−ζω₀π/ω_d), the envelope of (10.8),
 * so the extrema shrink geometrically and the last one outside the band follows from a logarithm.
 */
function underdamped(w0: number, zeta: number, u0: number, v0: number): Solution {
  const decay = zeta * w0;
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  const sinU = (v0 + decay * u0) / wd;
  const sinV = (decay * v0 + w0 * w0 * u0) / wd;
  const state = (t: number): OffsetState => {
    const envelope = Math.exp(-decay * t);
    const [cos, sin] = [Math.cos(wd * t), Math.sin(wd * t)];
    return { u: envelope * (u0 * cos + sinU * sin), v: envelope * (v0 * cos - sinV * sin) };
  };
  const settle = (band: number): number => {
    // b = 0 (or a b so small that ζω₀ underflows): the spring never settles, whatever the band.
    if (!(decay > 0)) return Infinity;
    const isOutside = (t: number) => Math.abs(state(t).u) > band;
    const halfPeriod = Math.PI / wd;
    // v = 0 where v₀ cos ω_d t = sinV · sin ω_d t: the extrema of u, every half period.
    const first = wrapHalfTurn(Math.atan2(v0, sinV)) / wd;
    // Every later extremum is smaller, so if the first is inside, u never leaves after it.
    if (!isOutside(first)) return entryFromStart(isOutside, first);
    const extremum = (n: number) => first + n * halfPeriod;
    // The last n with |u(first)|·e^(−n·ζω₀π/ω_d) > band. The logarithm can round either way near an
    // integer, so start one extremum early (still outside, as they shrink) and step forward.
    const halfPeriods = Math.log(Math.abs(state(first).u) / band) / (decay * halfPeriod);
    let n = Math.max(0, Math.ceil(halfPeriods) - 2);
    for (let step = 0; step < MAX_EXTREMUM_STEPS && isOutside(extremum(n + 1)); step++) n++;
    return bandEntry(isOutside, extremum(n), extremum(n + 1));
  };
  return { state, settle };
}

/**
 * Critical and overdamped motion has at most one extremum, at `extremum` (NaN or ±Infinity when
 * there is none), so u is monotonic before and after it; `bound` is where an envelope of |u|
 * reaches the band, after which u is settled for good.
 */
function settleWithoutOscillation(
  u: (t: number) => number,
  extremum: number,
  bound: number,
  band: number,
): number {
  const isOutside = (t: number) => Math.abs(u(t)) > band;
  if (!(extremum > 0 && extremum < bound)) return entryFromStart(isOutside, bound);
  return isOutside(extremum)
    ? bandEntry(isOutside, extremum, bound)
    : entryFromStart(isOutside, extremum);
}

/** ζ = 1: u = e^(−ω₀t)[u₀ + (v₀ + ω₀u₀) t]. */
function critical(w0: number, u0: number, v0: number): Solution {
  const slope = v0 + w0 * u0;
  const state = (t: number): OffsetState => {
    const envelope = Math.exp(-w0 * t);
    // t·e^(−ω₀t) first, so a huge t gives 0 instead of Infinity · 0 = NaN.
    const decayedT = t * envelope;
    return { u: envelope * u0 + slope * decayedT, v: envelope * v0 - w0 * slope * decayedT };
  };
  const settle = (band: number): number => {
    // t·e^(−ω₀t/2) ≤ 2/(e ω₀), so |u| ≤ e^(−ω₀t/2) (|u₀| + 2|slope|/(e ω₀)).
    const amplitude = Math.abs(u0) + (2 * Math.abs(slope)) / (Math.E * w0);
    const bound = (2 / w0) * Math.log(amplitude / band);
    return settleWithoutOscillation((t) => state(t).u, v0 / (w0 * slope), bound, band);
  };
  return { state, settle };
}

/**
 * ζ > 1: u = C_s e^(r_s t) + C_f e^(r_f t), a slow and a fast decaying exponential as in Motion, so
 * no term overflows however heavy the damping. r_s = ω₀²/r_f avoids the cancellation in
 * −ω₀(ζ − √(ζ² − 1)), and ζ√(1 − 1/ζ²) avoids overflowing ζ² beyond ζ ≈ 1,3·10¹⁵⁴.
 */
function overdamped(w0: number, zeta: number, u0: number, v0: number): Solution {
  const fast = -w0 * (zeta + zeta * Math.sqrt(1 - 1 / (zeta * zeta)));
  const slow = (w0 * w0) / fast;
  const cFast = (v0 - slow * u0) / (fast - slow);
  const cSlow = u0 - cFast;
  const state = (t: number): OffsetState => {
    const [eSlow, eFast] = [Math.exp(slow * t), Math.exp(fast * t)];
    return { u: cSlow * eSlow + cFast * eFast, v: slow * cSlow * eSlow + fast * cFast * eFast };
  };
  const settle = (band: number): number => {
    // e^(r_f t) ≤ e^(r_s t), so |u| ≤ (|C_s| + |C_f|) e^(r_s t).
    const bound = Math.log((Math.abs(cSlow) + Math.abs(cFast)) / band) / -slow;
    const extremum = Math.log(-(fast * cFast) / (slow * cSlow)) / (slow - fast);
    return settleWithoutOscillation((t) => state(t).u, extremum, bound, band);
  };
  return { state, settle };
}

function solve(p: SpringParams, u0: number, v0: number): Solution {
  requireFinite('u0', u0);
  requireFinite('v0', v0);
  const regime = dampingRegime(p);
  const w0 = naturalAngularFrequency(p);
  if (regime === 'critico') return critical(w0, u0, v0);
  const zeta = dampingRatio(p);
  return regime === 'sobreamortiguado'
    ? overdamped(w0, zeta, u0, v0)
    : underdamped(w0, zeta, u0, v0);
}

/**
 * (10.6), analytic: the offset u and velocity v at t ≥ 0 s after starting from u₀ and v₀. Exact at
 * any t, so it can be sampled at any frame rate or on a dragged timeline. Restarting it from its own
 * state at t* is (10.9): x and v stay continuous when the target changes.
 */
export function springState(p: SpringParams, u0: number, v0: number, t: number): OffsetState {
  requireNonNegative('t', t);
  return solve(p, u0, v0).state(t);
}

/** (10.7) M_p = e^(−ζπ/√(1 − ζ²)): the first overshoot over the offset, from rest; 0 for ζ ≥ 1. */
export function overshootRatio(zeta: number): number {
  requireNonNegative('zeta', zeta);
  if (zeta >= 1) return 0;
  return Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));
}

/** Time of the first overshoot from rest, t_p = π/ω_d; Infinity for «crítico» and «sobreamortiguado». */
export function peakTime(p: SpringParams): number {
  const regime = dampingRegime(p);
  if (regime === 'critico' || regime === 'sobreamortiguado') return Infinity;
  const zeta = dampingRatio(p);
  return Math.PI / (naturalAngularFrequency(p) * Math.sqrt(1 - zeta * zeta));
}

/**
 * Settling time t_s(ε): the last time |u| exceeds the band ε·reference (research §4: «el último
 * instante con |x − x_obj| > ε»), or 0 if u never leaves it; the start may be inside the band.
 * `reference` is the distance ε is relative to: |u₀| by default, a step from rest. For a restart
 * mid-flight (10.9), pass the distance between the two targets (as the lab does), so the band stays
 * the step's and the reading does not grow like ln(1/|u₀|) as u₀ → 0.
 *
 * Found on the analytic solution (10.6), bracketed by the envelope and closed by bisection: for
 * ζ < 1 the extrema shrink by the envelope e^(−ζω₀t) of (10.8), so the last one outside the band is
 * a logarithm away and the entry lies before the next one; for ζ ≥ 1 u has at most one extremum and
 * an envelope bound of |u| closes the bracket.
 *
 * 0 when the spring starts at rest on its target. Infinity when b = 0 and it does not, even if its
 * swing fits in the band: an undamped spring never comes to rest (Motion: «Springs with
 * `damping: 0` will run forever»). ε must be in (0, 1); reference = 0 is rejected for a damped spring
 * that is not at rest.
 */
export function settlingTime(
  p: SpringParams,
  u0: number,
  v0: number,
  epsilon: number,
  reference = Math.abs(u0),
): number {
  requirePositive('epsilon', epsilon);
  if (!(epsilon < 1)) throw new RangeError(`epsilon must be less than 1, got ${epsilon}`);
  const solution = solve(p, u0, v0);
  requireNonNegative('reference', reference);
  if (u0 === 0 && v0 === 0) return 0;
  if (reference === 0 && p.b > 0) {
    throw new RangeError('settlingTime needs a reference > 0 for a spring that is not at rest');
  }
  return solution.settle(epsilon * reference);
}

/**
 * (10.10), Apple's perceptual parameters: k = m(2π/d)², b = 4πm(1 − β)/d, so ω₀ = 2π/d and
 * ζ = 1 − β. Bounce β in [0, 1] (1 is undamped); Apple's negative branch is unconfirmed (research
 * §3.3), so it is rejected.
 */
export function fromPerceptual(duration: number, bounce: number, m = 1): SpringParams {
  requirePositive('duration', duration);
  requirePositive('m', m);
  requireNonNegative('bounce', bounce);
  if (!(bounce <= 1)) throw new RangeError(`bounce must be at most 1, got ${bounce}`);
  const w0 = (2 * Math.PI) / duration;
  return { k: m * w0 * w0, b: (4 * Math.PI * m * (1 - bounce)) / duration, m };
}

/** (10.11) Rest test, inclusive as Motion's: |u| ≤ restDelta and |v| ≤ restSpeed. */
export function isSpringAtRest(
  u: number,
  v: number,
  restDelta: number,
  restSpeed: number,
): boolean {
  requireFinite('u', u);
  requireFinite('v', v);
  requirePositive('restDelta', restDelta);
  requirePositive('restSpeed', restSpeed);
  return Math.abs(u) <= restDelta && Math.abs(v) <= restSpeed;
}
