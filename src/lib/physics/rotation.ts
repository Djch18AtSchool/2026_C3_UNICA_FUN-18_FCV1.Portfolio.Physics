import { requireFinite, requireNonNegative, requirePositive } from './validate';

/*
 * Reaction wheels about one shared axis z, so every quantity is a signed scalar. "s" is the
 * spacecraft without its wheel and "w" the wheel (docs/superpowers/research/2026-10-30-ruedas-reaccion.md, §5).
 * The wheel rate ω_w is inertial (measured from the stars, not from the body), as in the class
 * text: then L_w = I_w ω_w and I_s ω_s + I_w ω_w is the total angular momentum. Simulators such
 * as 42 and Basilisk use the rate relative to the body, Ω = ω_w − ω_s; for the 6U with the RW400
 * the two differ by at most ω_s = 0,0524 rad/s (0,5 rpm out of 970 rpm).
 */

const TWO_PI = 2 * Math.PI;

/** Moment of inertia of a homogeneous box about the axis through its centre normal to the a × b face: I = m(a² + b²)/12. */
export function boxInertia(m: number, a: number, b: number): number {
  requirePositive('m', m);
  requirePositive('a', a);
  requirePositive('b', b);
  return (m * (a * a + b * b)) / 12;
}

/** Body rate change when the wheel changes its rate, with no external torque: I_s Δω_s = −I_w Δω_w. */
export function bodyRateChange(Is: number, Iw: number, wheelRateChange: number): number {
  requirePositive('Is', Is);
  requirePositive('Iw', Iw);
  requireFinite('wheelRateChange', wheelRateChange);
  return (-Iw * wheelRateChange) / Is;
}

/**
 * Wheel revolutions while the body turns θ from rest: I_s Δθ_s = −I_w Δθ_w gives
 * |Δθ_w| = (I_s/I_w)·θ, that is I_s θ/(2π I_w) turns, the other way. It does not depend on how
 * fast the turn is.
 */
export function wheelTurnsForSlew(Is: number, Iw: number, theta: number): number {
  requirePositive('Is', Is);
  requirePositive('Iw', Iw);
  requireFinite('theta', theta);
  return (Is * theta) / (Iw * TWO_PI);
}

/**
 * Peak values of a rest-to-rest turn, all magnitudes (for θ > 0 the wheel spins the negative
 * way): motor torque τ (N·m, on the wheel and, reversed, on the body), body angular acceleration
 * α_s (rad/s²), peak body rate (rad/s), peak wheel momentum (N·m·s) and peak wheel rate (rad/s).
 */
export interface SlewPlan {
  torque: number;
  alpha: number;
  peakRate: number;
  peakWheelMomentum: number;
  peakWheelRate: number;
}

/**
 * Rest-to-rest turn of θ in T seconds with constant torque for T/2 and the opposite torque for
 * T/2 (bang-bang): θ = α_s (T/2)² gives τ = I_s α_s = 4 I_s θ/T², ω_s,peak = 2θ/T at T/2 and
 * L_w,peak = I_s ω_s,peak (the wheel holds what the body borrows). Ideal: it does not check the
 * wheel's limits, so a T below `minSlewTime` returns values above τ_max or L_max.
 */
export function restToRestSlew(Is: number, Iw: number, theta: number, T: number): SlewPlan {
  requirePositive('Is', Is);
  requirePositive('Iw', Iw);
  requireFinite('theta', theta);
  requirePositive('T', T);
  const angle = Math.abs(theta);
  const alpha = (4 * angle) / (T * T);
  const peakRate = (2 * angle) / T;
  const peakWheelMomentum = Is * peakRate;
  return {
    torque: Is * alpha,
    alpha,
    peakRate,
    peakWheelMomentum,
    peakWheelRate: peakWheelMomentum / Iw,
  };
}

/**
 * Signed state of a rest-to-rest turn at one instant: body angle θ_s (rad) and rate ω_s (rad/s);
 * inertial wheel angle θ_w (rad) and rate ω_w (rad/s); wheel momentum L_w = I_w ω_w (N·m·s); and
 * the motor torque on the wheel τ = dL_w/dt (N·m), the body receiving −τ (third law).
 */
export interface SlewState {
  thetaS: number;
  omegaS: number;
  thetaW: number;
  omegaW: number;
  Lw: number;
  torque: number;
}

/**
 * The bang-bang turn of `restToRestSlew` at time t (s), with both bodies at rest and the wheel
 * at 0 rpm at t = 0, so the total angular momentum stays 0: L_w = −I_s ω_s and θ_w = −(I_s/I_w) θ_s
 * at every t. First half: ω_s = α t, θ_s = α t²/2, τ = −I_s α; second half, with u = T − t:
 * ω_s = α u, θ_s = θ − α u²/2, τ = +I_s α. Before 0 it holds the start, after T the end.
 */
export function slewStateAt(
  Is: number,
  Iw: number,
  theta: number,
  T: number,
  t: number,
): SlewState {
  requirePositive('Is', Is);
  requirePositive('Iw', Iw);
  requireFinite('theta', theta);
  requirePositive('T', T);
  requireFinite('t', t);
  const alpha = (4 * theta) / (T * T);
  const clamped = Math.min(Math.max(t, 0), T);
  const firstHalf = clamped < T / 2;
  const fromEnd = T - clamped;
  const omegaS = firstHalf ? alpha * clamped : alpha * fromEnd;
  const thetaS = firstHalf
    ? (alpha * clamped * clamped) / 2
    : theta - (alpha * fromEnd * fromEnd) / 2;
  const moving = t > 0 && t < T;
  const torque = moving ? (firstHalf ? -1 : 1) * Is * alpha : 0;
  const Lw = -Is * omegaS;
  return {
    thetaS,
    omegaS,
    thetaW: (-Is * thetaS) / Iw,
    omegaW: Lw / Iw,
    Lw,
    torque,
  };
}

/**
 * Shortest rest-to-rest turn the wheel allows (s). By torque: τ = 4 I_s θ/T² ≤ τ_max gives
 * T ≥ √(4 I_s θ/τ_max). By momentum: I_s·2θ/T ≤ L_max gives T ≥ 2 I_s θ/L_max. A zero limit
 * makes the turn impossible (Infinity); a zero angle needs no time.
 */
export function minSlewTime(
  Is: number,
  theta: number,
  tauMax: number,
  Lmax: number,
): { byTorque: number; byMomentum: number } {
  requirePositive('Is', Is);
  requireFinite('theta', theta);
  requireNonNegative('tauMax', tauMax);
  requireNonNegative('Lmax', Lmax);
  const angle = Math.abs(theta);
  if (angle === 0) return { byTorque: 0, byMomentum: 0 };
  return {
    byTorque: tauMax > 0 ? Math.sqrt((4 * Is * angle) / tauMax) : Number.POSITIVE_INFINITY,
    byMomentum: Lmax > 0 ? (2 * Is * angle) / Lmax : Number.POSITIVE_INFINITY,
  };
}

/**
 * Largest gravity-gradient torque on a body in a circular orbit of radius r (NASA SP-8024,
 * pitch): τ = (3/2)(μ/r³)(I_R − I_Y) sin 2θ peaks at θ = 45°, so τ_max = (3/2)(μ/r³)|ΔI| (N·m).
 */
export function gravityGradientTorqueMax(mu: number, r: number, deltaI: number): number {
  requirePositive('mu', mu);
  requirePositive('r', r);
  requireFinite('deltaI', deltaI);
  return 1.5 * (mu / (r * r * r)) * Math.abs(deltaI);
}

/**
 * A constant disturbance and a momentum dump. τ_ext (N·m) fills the wheel while the body is held
 * still; when L_w reaches dumpAt·L_max a second actuator (magnetorquer or thruster) applies
 * τ_dump against it until L_w falls to dumpTo·L_max. dumpAt and dumpTo are fractions of L_max
 * (0 ≤ dumpTo < dumpAt ≤ 1); τ_dump = 0 means there is nothing to dump with. Both torques are
 * magnitudes and L_w is measured in the sense τ_ext pushes it.
 */
export interface DumpingParams {
  tauExt: number;
  tauDump: number;
  Lmax: number;
  dumpAt: number;
  dumpTo: number;
}

function validateDumping(p: DumpingParams): void {
  requireNonNegative('tauExt', p.tauExt);
  requireNonNegative('tauDump', p.tauDump);
  requirePositive('Lmax', p.Lmax);
  requirePositive('dumpAt', p.dumpAt);
  if (p.dumpAt > 1) throw new RangeError(`dumpAt must be at most 1, got ${p.dumpAt}`);
  requireNonNegative('dumpTo', p.dumpTo);
  if (!(p.dumpTo < p.dumpAt)) {
    throw new RangeError(`dumpTo must be below dumpAt, got ${p.dumpTo} ≥ ${p.dumpAt}`);
  }
}

/**
 * Wheel momentum L_w (N·m·s) at time t (s), exact and piecewise linear, from an empty wheel at
 * t = 0: L_w = ∫ τ_ext dt = τ_ext t up to the dump mark (t₁ = dumpAt·L_max/τ_ext); then, if the
 * dump wins (τ_dump > τ_ext), a sawtooth that falls at the net rate τ_dump − τ_ext to
 * dumpTo·L_max and fills again at τ_ext, period (dumpAt − dumpTo) L_max·[1/(τ_dump − τ_ext) + 1/τ_ext].
 * If it does not win, L_w keeps growing at τ_ext − τ_dump until it saturates at L_max, where the
 * motor can no longer take the disturbance and the body drifts (42: `if (W->Trq > 0.0 && W->H >=
 * W->Hmax) W->Trq = 0.0;`). `dumping` says the dump actuator is firing; `saturated`, L_w = L_max.
 */
export function wheelMomentumAt(
  t: number,
  p: DumpingParams,
): { Lw: number; dumping: boolean; saturated: boolean } {
  requireNonNegative('t', t);
  validateDumping(p);
  const { tauExt, tauDump, Lmax, dumpAt, dumpTo } = p;
  const state = (Lw: number, dumping: boolean) => ({ Lw, dumping, saturated: Lw >= Lmax });
  const high = dumpAt * Lmax;
  const reachHigh = high / tauExt;
  if (t < reachHigh) return state(tauExt * t, false);
  const netDump = tauDump - tauExt;
  if (!(netDump > 0)) return state(Math.min(high - netDump * (t - reachHigh), Lmax), tauDump > 0);
  const swing = (dumpAt - dumpTo) * Lmax;
  const dumpDuration = swing / netDump;
  const phase = (t - reachHigh) % (dumpDuration + swing / tauExt);
  if (phase < dumpDuration) return state(high - netDump * phase, true);
  return state(dumpTo * Lmax + tauExt * (phase - dumpDuration), false);
}
