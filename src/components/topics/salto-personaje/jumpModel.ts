import {
  airTime,
  apexHeight,
  eulerStep,
  timeToApex,
  trajectory,
  type EulerState,
  type TrajectoryPoint,
} from '../../../lib/physics';
import { CELESTE_JUMP, type JumpSettings } from '../../../lib/data/jumpPresets';

export type { JumpSettings };

/** Slider ranges (spec §7.2): g reaches 150 m/s² so Celeste (112,5 m/s²) fits; ×4 covers Mario's ×3,5. */
export const JUMP_LIMITS = {
  v0: [2, 25],
  g: [1, 150],
  vx: [0, 12],
  fallMultiplier: [1, 4],
} as const;

/** The simulator opens on Celeste, a game gravity far from 9,81, so the Earth ghost contrasts at load. */
export const JUMP_DEFAULTS: JumpSettings = CELESTE_JUMP;

export interface JumpResult {
  points: TrajectoryPoint[];
  hMax: number;
  tApex: number;
  tAir: number;
  range: number;
  domain: { x: [number, number]; y: [number, number] };
}

/** Headroom above the apex so the curve never touches the top of the plot. */
const Y_HEADROOM = 1.1;
/** A vertical jump still gets a 1 m wide plot. */
const MIN_X_SPAN = 1;

/** The plot window v1 derived from a jump: [0, range] (at least 1 m) by [0, 1.1 · h_max]. */
function jumpDomain(range: number, hMax: number): JumpResult['domain'] {
  return { x: [0, Math.max(range, MIN_X_SPAN)], y: [0, hMax * Y_HEADROOM] };
}

/** Trajectory and readouts of one jump; the fall uses g_down = g · fallMultiplier. */
export function computeJump(s: JumpSettings): JumpResult {
  const gDown = s.g * s.fallMultiplier;
  const hMax = apexHeight(s.v0, s.g);
  const tAir = airTime(s.v0, s.g, gDown);
  const range = s.vx * tAir;
  return {
    points: trajectory({ v0: s.v0, gUp: s.g, gDown, vx: s.vx }),
    hMax,
    tApex: timeToApex(s.v0, s.g),
    tAir,
    range,
    domain: jumpDomain(range, hMax),
  };
}

/** Fixed step of the alternative integrator (s): the lab never ties Δt to the frame rate. */
export const EULER_DT = 1 / 120;

const toPoint = ({ t, x, y, vy }: EulerState): TrajectoryPoint => ({ t, x, y, vy });

/** The state where the segment a → b crosses y = 0, linearly interpolated (b.y ≤ 0 < a.y). */
function landing(a: EulerState, b: EulerState): TrajectoryPoint {
  const fraction = a.y / (a.y - b.y);
  const lerp = (from: number, to: number) => from + (to - from) * fraction;
  return { t: lerp(a.t, b.t), x: lerp(a.x, b.x), y: 0, vy: lerp(a.vy, b.vy) };
}

/**
 * The same jump integrated with semi-implicit Euler at a fixed Δt (g on the way up, g · k on the
 * way down), as a game engine does frame by frame. The landing is interpolated to y = 0 and the
 * readouts come from the samples, so the apex sits about v₀Δt/2 below the analytic one.
 */
export function computeJumpEuler(s: JumpSettings, dt: number = EULER_DT): JumpResult {
  const gDown = s.g * s.fallMultiplier;
  const start: EulerState = { t: 0, x: 0, y: 0, vx: s.vx, vy: s.v0 };
  const states: EulerState[] = [start];
  let current = eulerStep(start, s.g, gDown, dt);
  while (current.y > 0) {
    states.push(current);
    current = eulerStep(current, s.g, gDown, dt);
  }
  const touchdown = landing(states[states.length - 1], current);
  const points = [...states.map(toPoint), touchdown];
  const apex = points.reduce((best, p) => (p.y > best.y ? p : best), points[0]);
  const range = touchdown.x;
  return {
    points,
    hMax: apex.y,
    tApex: apex.t,
    tAir: touchdown.t,
    range,
    domain: jumpDomain(range, apex.y),
  };
}
