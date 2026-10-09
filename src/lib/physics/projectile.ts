import { requirePositive } from './validate';

const DEFAULT_TRAJECTORY_POINTS = 240;
const MIN_TRAJECTORY_POINTS = 2;

/** Jump launch parameters: vertical launch speed v₀, rise and fall gravities, horizontal speed vₓ (SI). */
export interface JumpParams {
  v0: number;
  gUp: number;
  gDown?: number;
  vx?: number;
}

/** Maximum height of a vertical launch: h = v₀²/(2g). */
export function apexHeight(v0: number, g: number): number {
  requirePositive('v0', v0);
  requirePositive('g', g);
  return (v0 * v0) / (2 * g);
}

/** Time to reach the apex: t_apex = v₀/g. */
export function timeToApex(v0: number, g: number): number {
  requirePositive('v0', v0);
  requirePositive('g', g);
  return v0 / g;
}

/** Total flight time with asymmetric gravity: t_air = v₀/g_up + √(2h/g_down). */
export function airTime(v0: number, gUp: number, gDown: number = gUp): number {
  requirePositive('gDown', gDown);
  return timeToApex(v0, gUp) + Math.sqrt((2 * apexHeight(v0, gUp)) / gDown);
}

/** Design inverse from apex height and time to apex: g = 2h/t², v₀ = 2h/t. */
export function designJump(height: number, timeToApex: number): { g: number; v0: number } {
  requirePositive('height', height);
  requirePositive('timeToApex', timeToApex);
  return {
    g: (2 * height) / (timeToApex * timeToApex),
    v0: (2 * height) / timeToApex,
  };
}

/** Height during the rise of a vertical launch: y(t) = v₀ t − g t²/2. */
export function heightAt(v0: number, g: number, t: number): number {
  requirePositive('v0', v0);
  requirePositive('g', g);
  return v0 * t - (g * t * t) / 2;
}

/** One sample of a jump trajectory: time, horizontal and vertical position, vertical velocity. */
export interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
  vy: number;
}

/** Piecewise analytic jump: rise y = v₀t − g_up t²/2 until t_apex, then fall y = h − g_down (t − t_apex)²/2; x = vₓ t. */
export function trajectory(
  p: JumpParams,
  points: number = DEFAULT_TRAJECTORY_POINTS,
): TrajectoryPoint[] {
  if (!Number.isInteger(points) || points < MIN_TRAJECTORY_POINTS) {
    throw new RangeError(
      `points must be an integer of at least ${MIN_TRAJECTORY_POINTS}, got ${points}`,
    );
  }
  const { v0, gUp, gDown = gUp, vx = 0 } = p;
  const tApex = timeToApex(v0, gUp);
  const h = apexHeight(v0, gUp);
  const tAir = airTime(v0, gUp, gDown);
  const dt = tAir / (points - 1);

  return Array.from({ length: points }, (_, i): TrajectoryPoint => {
    const isLast = i === points - 1;
    const t = isLast ? tAir : i * dt;
    if (t <= tApex) {
      return { t, x: vx * t, y: heightAt(v0, gUp, t), vy: v0 - gUp * t };
    }
    const tFall = t - tApex;
    const y = isLast ? 0 : h - (gDown * tFall * tFall) / 2;
    return { t, x: vx * t, y, vy: -gDown * tFall };
  });
}

/** State of a body in a jump simulation: time (s), position (m) and velocity (m/s). */
export interface EulerState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * One semi-implicit Euler step with asymmetric gravity (y up): g = vy > 0 ? g_up : g_down;
 * vy' = vy − g dt; y' = y + vy' dt; x' = x + vx dt; t' = t + dt. Does not clamp y at the ground.
 */
export function eulerStep(s: EulerState, gUp: number, gDown: number, dt: number): EulerState {
  requirePositive('gUp', gUp);
  requirePositive('gDown', gDown);
  requirePositive('dt', dt);
  const g = s.vy > 0 ? gUp : gDown;
  const vy = s.vy - g * dt;
  return { t: s.t + dt, x: s.x + s.vx * dt, y: s.y + vy * dt, vx: s.vx, vy };
}
