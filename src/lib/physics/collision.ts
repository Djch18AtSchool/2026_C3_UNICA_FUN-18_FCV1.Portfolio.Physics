import { requireFinite, requireNonNegative, requirePositive } from './validate';

/**
 * Collisions and the coefficient of restitution (Tema 7). Convention: +y up, floor at y = 0,
 * v < 0 falling; SI units. Sources and derivations: docs/superpowers/research/
 * 2026-10-30-coeficiente-restitucion.md (§4 numbers, §5 physics).
 */

/**
 * How an engine mixes the restitution of two materials (research §5, Paso 3): `max` in Box2D,
 * Jolt and Unity 2D; `average` in Unity 3D and PhysX; `multiply` in Bullet; `sumClamped`,
 * min(e_A + e_B, 1), in Godot; `min` is one of Unity's and PhysX's options.
 */
export type CombineRule = 'max' | 'average' | 'min' | 'multiply' | 'sumClamped';

/**
 * Below this rebound speed (m/s) the analytic ball is at rest: the remaining flights are shorter
 * than any frame, and stopping here keeps the event loop short when t is close to T.
 */
const MIN_REBOUND_SPEED = 1e-9;

/** Below this speed (m/s) a ball whose last contact had no restitution counts as resting. */
const REST_SPEED = 1e-3;

function requireCoefficient(name: string, e: number): void {
  requireNonNegative(name, e);
}

function requirePositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be an integer of at least 1, got ${value}`);
  }
}

/** Restitution from a drop test (ITF, FIBA, FIFA): e = √(h′/h), since h = v²/(2g) in flight. */
export function restitutionFromHeights(h: number, hRebound: number): number {
  requirePositive('h', h);
  requireNonNegative('hRebound', hRebound);
  return Math.sqrt(hRebound / h);
}

/** The ideal bounce sequence of a ball dropped from h₀ onto a fixed floor. */
export interface BounceSeries {
  /** hₙ = e²ⁿ h₀ (m): apex of the flight that ends in impact n; heights[0] = h₀. */
  heights: number[];
  /** vₙ = eⁿ v₀ = √(2 g hₙ) (m/s): speed of impact n, v₀ = √(2 g h₀). */
  impactSpeeds: number[];
  /** Duration (s) of the flight that ends in impact n: t₀ for the drop, 2 t₀ eⁿ afterwards. */
  flightTimes: number[];
  /** T = t₀(1+e)/(1−e) (s), t₀ = √(2h₀/g): every bounce, infinitely many; Infinity for e ≥ 1. */
  totalTime: number;
}

/**
 * The first `count` flights of the ideal bounce (index n = 0 is the drop; research §5, Paso 1).
 * Infinitely many bounces fit in the finite time T, the Zeno series that forces engines to
 * use a threshold.
 */
export function bounceSeries(h0: number, e: number, g: number, count: number): BounceSeries {
  requirePositive('h0', h0);
  requireCoefficient('e', e);
  requirePositive('g', g);
  requirePositiveInteger('count', count);
  const t0 = Math.sqrt((2 * h0) / g);
  const v0 = g * t0;
  const indices = Array.from({ length: count }, (_, n) => n);
  return {
    heights: indices.map((n) => (n === 0 ? h0 : e ** (2 * n) * h0)),
    impactSpeeds: indices.map((n) => (n === 0 ? v0 : e ** n * v0)),
    flightTimes: indices.map((n) => (n === 0 ? t0 : 2 * t0 * e ** n)),
    totalTime: e >= 1 ? Infinity : (t0 * (1 + e)) / (1 - e),
  };
}

/** Velocities after a 1D collision, the total momentum and the kinetic energy lost. */
export interface Collision1D {
  v1: number;
  v2: number;
  /** p = m₁v₁′ + m₂v₂′ (kg·m/s), equal before and after; with m₂ = ∞, the ball's alone, m₁v₁′. */
  momentum: number;
  /** K_before − K_after = ½ μ (1 − e²) v_rel² (J), μ = m₁m₂/(m₁+m₂); negative when e > 1. */
  kineticLoss: number;
}

/**
 * 1D collision from momentum conservation and Newton's law e = −(v₂′ − v₁′)/(v₂ − v₁)
 * (research §5, Paso 2):
 *   v₁′ = ((m₁ − e m₂) v₁ + (1+e) m₂ v₂)/(m₁+m₂),  v₂′ = ((m₂ − e m₁) v₂ + (1+e) m₁ v₁)/(m₁+m₂).
 * m₂ = Infinity is the floor (or a moving platform): v₁′ = −e v₁ + (1+e) v₂, v₂′ = v₂, μ = m₁.
 */
export function collide1D(m1: number, v1: number, m2: number, v2: number, e: number): Collision1D {
  requirePositive('m1', m1);
  requireFinite('v1', v1);
  if (m2 !== Infinity) requirePositive('m2', m2);
  requireFinite('v2', v2);
  requireCoefficient('e', e);
  const vRel = v2 - v1;
  if (m2 === Infinity) {
    const ball = -e * v1 + (1 + e) * v2;
    return { v1: ball, v2, momentum: m1 * ball, kineticLoss: 0.5 * m1 * (1 - e * e) * vRel * vRel };
  }
  const total = m1 + m2;
  const after1 = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / total;
  const after2 = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / total;
  const mu = (m1 * m2) / total;
  return {
    v1: after1,
    v2: after2,
    momentum: m1 * after1 + m2 * after2,
    kineticLoss: 0.5 * mu * (1 - e * e) * vRel * vRel,
  };
}

/**
 * How many impacts get restitution before one falls to the threshold (research §5, Paso 3):
 * N = ⌊ln(v₀/v_th)/ln(1/e)⌋ + 1, the impacts eⁿv₀ strictly above v_th (Box2D's test is strict,
 * so an impact exactly at v_th sticks). 0 if v₀ ≤ v_th; Infinity when it never drops below
 * (e ≥ 1, or v_th = 0 with e > 0). For e = 0 it is 0: the formula's limit, 1, would count an
 * impact that leaves no rebound, and the `bounces` of engineStep and idealBallAt count rebounds.
 */
export function bouncesAboveThreshold(v0: number, e: number, vth: number): number {
  requireNonNegative('v0', v0);
  requireCoefficient('e', e);
  requireNonNegative('vth', vth);
  if (v0 <= vth || e === 0) return 0;
  if (e >= 1 || vth === 0) return Infinity;
  const n = Math.floor(Math.log(v0 / vth) / Math.log(1 / e)) + 1;
  // At an exact integer ratio the last counted impact equals v_th, and equal does not bounce.
  return v0 * e ** (n - 1) <= vth ? n - 1 : n;
}

/** The pair's restitution under an engine's mixing rule (see CombineRule). */
export function combineRestitution(eA: number, eB: number, rule: CombineRule): number {
  requireCoefficient('eA', eA);
  requireCoefficient('eB', eB);
  switch (rule) {
    case 'max':
      return Math.max(eA, eB);
    case 'average':
      return (eA + eB) / 2;
    case 'min':
      return Math.min(eA, eB);
    case 'multiply':
      return eA * eB;
    case 'sumClamped':
      return Math.min(eA + eB, 1);
  }
}

/**
 * Speed-dependent restitution e(v) = e₀ − k|v|, clamped to [0, 1] (research §5, Paso 4): an
 * illustrative linear fit to Cross (1999), Fig. 8, with e₀ ≈ 0,79 and k ≈ 0,009 s/m for tennis.
 */
export function restitutionAtSpeed(v: number, e0: number, k: number): number {
  requireFinite('v', v);
  requireFinite('e0', e0);
  requireFinite('k', k);
  return Math.min(Math.max(e0 - k * Math.abs(v), 0), 1);
}

/** State of the engine ball: time (s), height (m), velocity (m/s, + up) and contact record. */
export interface BallState {
  t: number;
  y: number;
  v: number;
  /** Contacts that applied restitution (e_eff > 0). */
  bounces: number;
  /** Approach speed |v⁻| (m/s) of the latest impact, including the one that stopped the ball. */
  lastImpactSpeed: number;
  /** The last contact had e_eff = 0 and left |v| < 1e-3 m/s. */
  resting: boolean;
}

/** Engine settings: gravity, the pair's e, restitution threshold (m/s), Baumgarte β, substeps. */
export interface EngineParams {
  g: number;
  e: number;
  threshold: number;
  baumgarte: number;
  substeps: number;
}

/** Contact response of one substep: the floor pushes, never pulls. */
function resolveContact(state: BallState, p: EngineParams, h: number): BallState {
  const approach = state.v;
  const isImpact = approach < 0;
  const eEff = isImpact && Math.abs(approach) > p.threshold ? p.e : 0;
  const restitutionTarget = isImpact ? eEff * -approach : 0;
  const bias = (p.baumgarte * -state.y) / h;
  // As in Box2D's clamped accumulated impulse (≥ 0), a separating ball keeps its faster velocity.
  const v = Math.max(approach, restitutionTarget + bias);
  const isNewImpact = isImpact && !state.resting;
  return {
    ...state,
    v,
    y: p.baumgarte > 0 ? state.y : 0,
    bounces: state.bounces + (isImpact && eEff > 0 ? 1 : 0),
    lastImpactSpeed: isNewImpact ? -approach : state.lastImpactSpeed,
    resting: eEff === 0 && Math.abs(v) < REST_SPEED,
  };
}

/** One substep: semi-implicit Euler (v −= g h, then y += v h), then contact if y < 0. */
function substep(state: BallState, p: EngineParams, h: number): BallState {
  const v = state.v - p.g * h;
  const moved = { ...state, t: state.t + h, v, y: state.y + v * h };
  return moved.y < 0 ? resolveContact(moved, p, h) : { ...moved, resting: false };
}

/**
 * One engine frame of length dt split into `substeps` (research §5, Paso 3; §7). Each substep is
 * semi-implicit Euler and detects contact by penetration (y < 0). On contact the target velocity
 * is v = e_eff·(−v⁻), with e_eff = 0 if |v⁻| ≤ threshold: Box2D v3.1.1's
 * `impulse = -cp->normalMass * ( vn + restitution * cp->relativeVelocity )` against a fixed
 * floor. Baumgarte adds β·(−y)/h to v; with β > 0 the position is not projected, so the
 * penetration keeps driving the bias (and adds energy); with β = 0 it is clamped to y = 0.
 * Unlike Box2D v3, there is no relax pass and the step's gravity stays in v⁻, so the scheme
 * shows the energy gains the research lists in §6 (b) and (b′).
 */
export function engineStep(state: BallState, p: EngineParams, dt: number): BallState {
  requireFinite('t', state.t);
  requireFinite('y', state.y);
  requireFinite('v', state.v);
  requirePositive('g', p.g);
  requireCoefficient('e', p.e);
  requireNonNegative('threshold', p.threshold);
  requireNonNegative('baumgarte', p.baumgarte);
  requirePositiveInteger('substeps', p.substeps);
  requirePositive('dt', dt);
  const h = dt / p.substeps;
  let next = state;
  for (let i = 0; i < p.substeps; i += 1) next = substep(next, p, h);
  return next;
}

/** Ball at rest on the floor. */
function atRest(bounces: number): { y: number; v: number; bounces: number } {
  return { y: 0, v: 0, bounces };
}

/**
 * The exact ideal ball at time t, dropped from rest at h₀ (research §5, Pasos 1 and 3): free
 * fall to t₀ = √(2h₀/g), then flights of 2 e_eff vₙ/g between exact impact events. With a
 * threshold, an impact at or below it sticks (`bounces` stops at bouncesAboveThreshold); without
 * one and e < 1, the ball comes to rest at T = t₀(1+e)/(1−e) after infinitely many bounces,
 * reported as `bounces: Infinity`.
 */
export function idealBallAt(
  t: number,
  h0: number,
  e: number,
  g: number,
  threshold?: number,
): { y: number; v: number; bounces: number } {
  requireNonNegative('t', t);
  requirePositive('h0', h0);
  requireCoefficient('e', e);
  requirePositive('g', g);
  if (threshold !== undefined) requireNonNegative('threshold', threshold);
  const t0 = Math.sqrt((2 * h0) / g);
  if (t <= t0) return { y: h0 - (g * t * t) / 2, v: -g * t, bounces: 0 };
  if (e === 0) return atRest(0);
  if (threshold === undefined && e < 1 && t >= bounceSeries(h0, e, g, 1).totalTime) {
    return atRest(Infinity);
  }

  let impactTime = t0;
  let impactSpeed = g * t0;
  let bounces = 0;
  for (;;) {
    const sticks = threshold !== undefined && impactSpeed <= threshold;
    const up = sticks ? 0 : e * impactSpeed;
    if (up < MIN_REBOUND_SPEED) return atRest(bounces);
    bounces += 1;
    const flight = (2 * up) / g;
    if (t <= impactTime + flight) {
      const tau = t - impactTime;
      return { y: up * tau - (g * tau * tau) / 2, v: up - g * tau, bounces };
    }
    impactTime += flight;
    impactSpeed = up;
  }
}
