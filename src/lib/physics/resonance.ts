import { requireFinite, requireNonNegative, requirePositive } from './validate';

/*
 * Tema 12: forced oscillation, resonance, many feet and self-excitation. Equations (12.1)–(12.12)
 * of docs/superpowers/research/2026-11-17-resonancia-estructural.md §5, in SI units, with the
 * damping coefficient written b (F = −b v) and ζ = b/(2√(km)).
 */

const TWO_PI = 2 * Math.PI;

/** A mass m (kg) on a spring k (N/m) with a viscous damper b (N·s/m). */
export interface Oscillator {
  m: number;
  k: number;
  b: number;
}

function requireOscillator(o: Oscillator): void {
  requirePositive('m', o.m);
  requireNonNegative('k', o.k);
  requireNonNegative('b', o.b);
}

/** (12.1) Natural frequency f0 = (1/2π)√(k/m), in Hz. */
export function naturalFrequency(o: Oscillator): number {
  requireOscillator(o);
  return Math.sqrt(o.k / o.m) / TWO_PI;
}

/** The denominator of (12.3), √((ω0² − ω²)² + (bω/m)²), and the phase lag δ of x behind F. */
function response(o: Oscillator, omega: number): { denominator: number; lag: number } {
  requireOscillator(o);
  requireNonNegative('omega', omega);
  const stiffness = o.k / o.m - omega * omega;
  const damping = (o.b * omega) / o.m;
  return { denominator: Math.hypot(stiffness, damping), lag: Math.atan2(damping, stiffness) };
}

/**
 * (12.3) Steady amplitude of m ẍ + b ẋ + k x = F0 cos ωt (OpenStax ec. 15.29):
 * A = (|F0|/m)/√((ω0² − ω²)² + (bω/m)²), in m, with ω in rad/s. Without damping at ω = ω0 there is
 * no steady state: it returns Infinity (never NaN), and a zero force gives 0. The lab clamps it.
 */
export function steadyAmplitude(o: Oscillator, F0: number, omega: number): number {
  requireFinite('F0', F0);
  const { denominator } = response(o, omega);
  if (F0 === 0) return 0;
  return denominator === 0 ? Number.POSITIVE_INFINITY : Math.abs(F0) / o.m / denominator;
}

/**
 * Amplification at ω = ω0 over the static deflection F0/k: A(ω0)/(F0/k) = 1/(2ζ) (research §5,
 * the peak of the curve for small ζ). ×100 for ζ = 0,005; Infinity without damping.
 */
export function resonanceGain(zeta: number): number {
  requireNonNegative('zeta', zeta);
  return zeta === 0 ? Number.POSITIVE_INFINITY : 1 / (2 * zeta);
}

/**
 * (12.4) Energy per cycle in steady state, in J: what the force puts in, W_F = π F0 A sin δ, and
 * what the damper takes out, W_b = π b ω A². They are equal in steady state. Without damping at
 * ω = ω0 there is no steady state and both are reported as Infinity («crece sin límite»).
 */
export function cycleEnergies(
  o: Oscillator,
  F0: number,
  omega: number,
): { input: number; dissipated: number } {
  const A = steadyAmplitude(o, F0, omega);
  if (!Number.isFinite(A)) {
    return { input: Number.POSITIVE_INFINITY, dissipated: Number.POSITIVE_INFINITY };
  }
  const { lag } = response(o, omega);
  return {
    input: Math.PI * Math.abs(F0) * A * Math.sin(lag),
    dissipated: Math.PI * o.b * omega * A * A,
  };
}

/**
 * (12.5) Amplitude of the sum of N forces of amplitude F1 (N) at one frequency with phases φ_i
 * (rad): |Σ F1 e^{iφ_i}|. In step it is N·F1; with random phases its rms is √N·F1.
 */
export function troopForceAmplitude(F1: number, phases: readonly number[]): number {
  requireFinite('F1', F1);
  let re = 0;
  let im = 0;
  phases.forEach((phase, i) => {
    requireFinite(`phases[${i}]`, phase);
    re += Math.cos(phase);
    im += Math.sin(phase);
  });
  return Math.abs(F1) * Math.hypot(re, im);
}

/**
 * (12.6) Klipper's ZV input shaper, tag v0.13.0: klippy/extras/shaper_defs.py L17-L23 gives
 * A = [1, K] with K = e^{−ζπ/√(1−ζ²)} and T = [0, t_d/2] with t_d = 1/(f√(1−ζ²)); the amplitudes
 * are divided by their sum as klippy/chelper/kin_shaper.c `init_shaper` (L49-L57) does, so the
 * shaped command ends where the unshaped one would. f in Hz, ζ in [0, 1), times in s. (Klipper
 * then reverses and recentres the times for its convolution, which shifts both impulses alike.)
 */
export function zvShaper(
  f: number,
  zeta: number,
): { amplitudes: readonly [number, number]; times: readonly [number, number] } {
  requirePositive('f', f);
  requireNonNegative('zeta', zeta);
  if (!(zeta < 1)) throw new RangeError(`zeta must be below 1, got ${zeta}`);
  const df = Math.sqrt(1 - zeta * zeta);
  const K = Math.exp((-zeta * Math.PI) / df);
  const tD = 1 / (f * df);
  return { amplitudes: [1 / (1 + K), K / (1 + K)], times: [0, 0.5 * tD] };
}

/**
 * (12.8) Arup's critical number of pedestrians (Dallard et al. 2001, eq. 9): N_L = 8π ζ f M / k_p,
 * with f in Hz, the modal mass M in kg and the lateral force coefficient k_p in N·s/m.
 */
export function criticalPedestrians(zeta: number, f: number, M: number, kp: number): number {
  requireNonNegative('zeta', zeta);
  requirePositive('f', f);
  requirePositive('M', M);
  requirePositive('kp', kp);
  return (8 * Math.PI * zeta * f * M) / kp;
}

/** (12.9) Strouhal vortex-shedding frequency f_v = S U / D, in Hz (U in m/s, D in m). */
export function vortexFrequency(strouhal: number, U: number, D: number): number {
  requirePositive('strouhal', strouhal);
  requireNonNegative('U', U);
  requirePositive('D', D);
  return (strouhal * U) / D;
}

/**
 * (12.12) Relative energy change per cycle of a lightly damped free oscillation, ΔE/E ≈ −4π ζ_net
 * (small-ζ form of e^{−4πζ} − 1). Negative: energy lost; positive (ζ_net < 0): energy gained.
 */
export function energyChangePerCycle(zetaNet: number): number {
  requireFinite('zetaNet', zetaNet);
  return -4 * Math.PI * zetaNet;
}

/**
 * (12.12), exact over one natural period T0 = 2π/ω0: the envelope e^{−ζ_net ω0 t} scales the
 * amplitude by e^{−2πζ_net} and the energy, ∝ amplitude², by e^{−4πζ_net}, so
 * ΔE/E = e^{−4πζ_net} − 1. Positive (ζ_net < 0): energy gained; `energyChangePerCycle` is its
 * linear form for small ζ, always a little below it (e^x − 1 > x).
 */
export function energyGrowthPerCycle(zetaNet: number): number {
  requireFinite('zetaNet', zetaNet);
  return Math.expm1(-4 * Math.PI * zetaNet);
}

/**
 * One semi-implicit (symplectic) Euler step of (12.2) with any force F (N) at this instant,
 * m ẍ = F − k x − b ẋ: v′ = v + (F − k x − b v)/m · dt, then x′ = x + v′ · dt (as `dampedSpringStep`
 * in spring.ts, plus the force).
 */
export function forcedStep(
  o: Oscillator,
  s: { x: number; v: number },
  force: number,
  dt: number,
): { x: number; v: number } {
  requireOscillator(o);
  requireFinite('x', s.x);
  requireFinite('v', s.v);
  requireFinite('force', force);
  requirePositive('dt', dt);
  const v = s.v + ((force - o.k * s.x - o.b * s.v) / o.m) * dt;
  return { x: s.x + v * dt, v };
}
