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
    default: {
      const unknown: never = rule;
      throw new RangeError(`rule must be a known combine rule, got ${String(unknown)}`);
    }
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

/**
 * Restitution as a function of the approach speed |v⁻| (m/s) of each impact, e.g.
 * `(v) => restitutionAtSpeed(v, 0.79, 0.009)`; it replaces the constant e where it is given.
 */
export type SpeedRestitution = (approachSpeed: number) => number;

/** e_eff of one impact: 0 at or below the (strict) threshold, else e(|v⁻|) or the constant e. */
function effectiveRestitution(
  speed: number,
  threshold: number,
  e: number,
  restitutionAt: SpeedRestitution | undefined,
): number {
  if (speed <= threshold) return 0;
  if (!restitutionAt) return e;
  const value = restitutionAt(speed);
  requireCoefficient('restitutionAt(v)', value);
  return value;
}

/** Normal impulses (N·s) of one impact against a fixed floor and the velocity after it. */
export interface PoissonImpact {
  /** J_c = m|v⁻|: the impulse that stops the approach. */
  compressionImpulse: number;
  /** J_r = e J_c, the largest restitution impulse Poisson's law allows. */
  restitutionImpulse: number;
  /** v⁺ = v⁻ + (J_c + J_r)/m (m/s). */
  v: number;
}

/**
 * Poisson's restitution on a fixed floor (research §5, Paso 4): the collision splits into
 * compression (J_c) and restitution (J_r), capped at J_r ≤ e J_c. Box2D v3.2.0 uses it as a cap
 * in `src/contact_solver.c` L658-L659, "Poisson kinetic restitution guarantees no energy gain":
 * `allowance = restitution * ( compressionImpulse + approachImpulse ) - cp->restitutionImpulse`.
 * For one frictionless contact it reproduces Newton's v⁺ = e|v⁻|; a separating ball (v⁻ ≥ 0)
 * gets no impulse.
 */
export function poissonFloorImpact(m: number, vApproach: number, e: number): PoissonImpact {
  requirePositive('m', m);
  requireFinite('vApproach', vApproach);
  requireCoefficient('e', e);
  const compressionImpulse = m * Math.max(-vApproach, 0);
  const restitutionImpulse = e * compressionImpulse;
  return {
    compressionImpulse,
    restitutionImpulse,
    v: vApproach + (compressionImpulse + restitutionImpulse) / m,
  };
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

/**
 * Engine settings: gravity, the pair's e, restitution threshold (m/s), Baumgarte β, substeps and,
 * optionally, a speed-dependent e(v) that replaces `e` on each impact (still subject to the
 * threshold).
 */
export interface EngineParams {
  g: number;
  e: number;
  threshold: number;
  baumgarte: number;
  substeps: number;
  restitutionAt?: SpeedRestitution;
}

/**
 * Contact response of one substep; the floor pushes, never pulls. An armed impact (e_eff > 0,
 * that is restitution > 0 and |v⁻| above the threshold, as Box2D's `armed` test in
 * `contact_solver.c` L629-L630) takes v = e_eff|v⁻| + β(−y)/h: the bias stays in the velocity,
 * unrelaxed, which is the energy gain of research §6 (b). Every other contact (below the threshold,
 * or already separating) is relaxed as Box2D v3 does after integrating positions (`solver.c`
 * L1151-L1153, `useBias = false`; Catto, Solver2D: "This serves to remove the extra energy"): the
 * bias moves the position by β(−y) and leaves the velocity at max(v⁻, 0), so the ball can settle.
 * Without Baumgarte the position is projected to y = 0.
 */
function resolveContact(state: BallState, p: EngineParams, h: number): BallState {
  const approach = state.v;
  const isApproaching = approach < 0;
  const eEff = isApproaching
    ? effectiveRestitution(-approach, p.threshold, p.e, p.restitutionAt)
    : 0;
  const push = p.baumgarte * -state.y;
  const isArmed = eEff > 0;
  const v = isArmed ? eEff * -approach + push / h : Math.max(approach, 0);
  const y = p.baumgarte === 0 ? 0 : isArmed ? state.y : state.y + push;
  return {
    ...state,
    v,
    y,
    bounces: state.bounces + (isArmed ? 1 : 0),
    lastImpactSpeed: isApproaching && !state.resting ? -approach : state.lastImpactSpeed,
    resting: !isArmed && Math.abs(v) < REST_SPEED,
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
 * is v = e_eff·(−v⁻), with e_eff = 0 if |v⁻| ≤ threshold (and e_eff = e(|v⁻|) when
 * `restitutionAt` is given): Box2D v3.1.1's
 * `impulse = -cp->normalMass * ( vn + restitution * cp->relativeVelocity )` against a fixed
 * floor. Baumgarte adds β·(−y)/h to the velocity of an armed impact; with β > 0 the position is
 * not projected, so the penetration drives the bias (and adds energy at low fps); with β = 0 it
 * is clamped to y = 0. Contacts without restitution are relaxed (see resolveContact), so with
 * β > 0 the ball rests at the Baumgarte steady penetration g h²(1−β)/β below the floor.
 * The step's gravity stays in v⁻ (research §6 b′), and the substep after a projected contact
 * subtracts g·h before the ball moves, so at 1/60 with one substep each rebound loses about
 * g·h of speed and the ball stops a few bounces sooner than the ideal one.
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

/**
 * Hard stop on the ideal ball's event loop: an e(v) whose flights never shrink, or a time far
 * beyond any lab timeline (with e = 1 from 1 m, about 250 h), throws instead of hanging.
 */
const MAX_IMPACT_EVENTS = 1_000_000;

/** Ball at rest on the floor. */
function atRest(bounces: number): { y: number; v: number; bounces: number } {
  return { y: 0, v: 0, bounces };
}

/**
 * The exact ideal ball at time t, dropped from rest at h₀ (research §5, Pasos 1, 3 and 4): free
 * fall to t₀ = √(2h₀/g), then flights of 2 e_eff vₙ/g between exact impact events, where e_eff is
 * 0 at or below the threshold and otherwise `restitutionAt(vₙ)` or the constant e.
 * A threshold of 0 and no threshold are the same. `bounces` counts rebounds and, at rest, reports:
 * - with a threshold > 0, the finite count before the impact that stuck (bouncesAboveThreshold
 *   for constant e);
 * - with no threshold, Infinity once the ball rests, because infinitely many bounces fit before
 *   T = t₀(1+e)/(1−e) (rebounds below 1e-9 m/s count as rest);
 * - 0 when e_eff of the first impact is 0.
 */
export function idealBallAt(
  t: number,
  h0: number,
  e: number,
  g: number,
  threshold?: number,
  restitutionAt?: SpeedRestitution,
): { y: number; v: number; bounces: number } {
  requireNonNegative('t', t);
  requirePositive('h0', h0);
  requireCoefficient('e', e);
  requirePositive('g', g);
  const vth = threshold ?? 0;
  requireNonNegative('threshold', vth);
  const t0 = Math.sqrt((2 * h0) / g);
  if (t <= t0) return { y: h0 - (g * t * t) / 2, v: -g * t, bounces: 0 };
  if (!restitutionAt && vth === 0 && e > 0 && e < 1) {
    if (t >= bounceSeries(h0, e, g, 1).totalTime) return atRest(Infinity);
  }

  let impactTime = t0;
  let impactSpeed = g * t0;
  for (let bounces = 0; bounces < MAX_IMPACT_EVENTS; bounces += 1) {
    const up = effectiveRestitution(impactSpeed, vth, e, restitutionAt) * impactSpeed;
    if (up === 0) return atRest(bounces);
    if (up < MIN_REBOUND_SPEED) return atRest(vth === 0 ? Infinity : bounces);
    const flight = (2 * up) / g;
    if (t <= impactTime + flight) {
      const tau = t - impactTime;
      return { y: up * tau - (g * tau * tau) / 2, v: up - g * tau, bounces: bounces + 1 };
    }
    impactTime += flight;
    impactSpeed = up;
  }
  throw new RangeError(`idealBallAt passed ${MAX_IMPACT_EVENTS} impacts before t = ${t}`);
}
