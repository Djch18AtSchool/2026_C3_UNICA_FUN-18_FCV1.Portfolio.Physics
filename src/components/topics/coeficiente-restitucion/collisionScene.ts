/**
 * Pure model of the "Choque de dos cuerpos" mode (research §5, Paso 2): the outcome of a 1D
 * collision through the kernel's collide1D, its momentum and energy bookkeeping, and where each
 * body's contact face is at t for the animation. Body 1 moves on the left, body 2 on the right.
 */
import { collide1D } from '../../../lib/physics';

export interface CollisionSettings {
  m1: number;
  m2: number;
  v1: number;
  v2: number;
  e: number;
  /** Body 2 is the floor or a wall: m₂ → ∞ and v₂ = 0. */
  isWall: boolean;
}

export const COLLISION_DEFAULTS: CollisionSettings = {
  m1: 1,
  m2: 3,
  v1: 4,
  v2: 0,
  e: 0.5,
  isWall: false,
};

export const COLLISION_LIMITS = {
  mass: [0.1, 10],
  velocity: [-10, 10],
  e: [0, 1],
} as const;

/** The bodies touch at x = 0 at this time (s) of a 2 s timeline. */
export const COLLISION_TIME_S = 1;
export const COLLISION_DURATION_S = 2;
/** Bodies that never meet start this far (m) from the contact point, so they never overlap. */
const APART_M = 0.5;
const MIN_HALF_SPAN_M = 1;
const SPAN_MARGIN_M = 0.4;

export interface CollisionOutcome {
  /** v₁ > v₂: body 1 catches up with body 2 (or reaches the wall). */
  isApproaching: boolean;
  v1After: number;
  v2After: number;
  /** p before and after (kg·m/s): the system's, or body 1's alone against the wall. */
  pBefore: number;
  pAfter: number;
  /** Impulse the contact gives body 1, J = m₁(v₁′ − v₁) (N·s). */
  impulse: number;
  kBefore: number;
  kAfter: number;
  /** ΔK = K before − K after = ½ μ (1 − e²) v_rel² (J). */
  kineticLoss: number;
  /** K of the relative motion, ½ μ v_rel² (J), μ = m₁m₂/(m₁+m₂) (m₁ for the wall). */
  relativeEnergy: number;
  /** ΔK/K_rel, which equals 1 − e² whenever they collide; 0 when they do not. */
  lossFraction: number;
}

export function collisionOutcome(s: CollisionSettings): CollisionOutcome {
  const m2 = s.isWall ? Infinity : s.m2;
  const v2 = s.isWall ? 0 : s.v2;
  const isApproaching = s.v1 > v2;
  const after = isApproaching ? collide1D(s.m1, s.v1, m2, v2, s.e) : { v1: s.v1, v2 };
  const mu = s.isWall ? s.m1 : (s.m1 * s.m2) / (s.m1 + s.m2);
  const relativeEnergy = 0.5 * mu * (v2 - s.v1) ** 2;
  const kinetic = (u1: number, u2: number) =>
    0.5 * s.m1 * u1 * u1 + (s.isWall ? 0 : 0.5 * s.m2 * u2 * u2);
  const momentum = (u1: number, u2: number) => s.m1 * u1 + (s.isWall ? 0 : s.m2 * u2);
  const kBefore = kinetic(s.v1, v2);
  const kAfter = kinetic(after.v1, after.v2);
  const kineticLoss = kBefore - kAfter;
  return {
    isApproaching,
    v1After: after.v1,
    v2After: after.v2,
    pBefore: momentum(s.v1, v2),
    pAfter: momentum(after.v1, after.v2),
    impulse: s.m1 * (after.v1 - s.v1),
    kBefore,
    kAfter,
    kineticLoss,
    relativeEnergy,
    lossFraction: isApproaching && relativeEnergy > 0 ? kineticLoss / relativeEnergy : 0,
  };
}

/** x (m) of body 1's right face and body 2's left face at t; they touch at x = 0 at 1 s. */
export function facePositions(
  s: CollisionSettings,
  outcome: CollisionOutcome,
  t: number,
): { x1: number; x2: number } {
  const v2 = s.isWall ? 0 : s.v2;
  if (!outcome.isApproaching) {
    return { x1: s.v1 * t - APART_M, x2: v2 * t + APART_M };
  }
  const tau = t - COLLISION_TIME_S;
  const isBefore = tau < 0;
  return {
    x1: (isBefore ? s.v1 : outcome.v1After) * tau,
    x2: (isBefore ? v2 : outcome.v2After) * tau,
  };
}

/** Half the track (m): every face position over the timeline fits, plus a margin. */
export function trackHalfSpan(s: CollisionSettings, outcome: CollisionOutcome): number {
  const reach = [0, COLLISION_DURATION_S].flatMap((t) => {
    const { x1, x2 } = facePositions(s, outcome, t);
    return [Math.abs(x1), Math.abs(x2)];
  });
  return Math.max(MIN_HALF_SPAN_M, Math.max(...reach) + SPAN_MARGIN_M);
}
