import {
  airTime,
  apexHeight,
  timeToApex,
  trajectory,
  type TrajectoryPoint,
} from '../../../lib/physics';
import { CELESTE_JUMP } from '../../../lib/data/jumpPresets';

/** Jump controls in SI: launch speed v₀ (m/s), rise gravity g (m/s²), run speed vₓ (m/s), fall multiplier (×). */
export interface JumpSettings {
  v0: number;
  g: number;
  vx: number;
  fallMultiplier: number;
}

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
    domain: { x: [0, Math.max(range, MIN_X_SPAN)], y: [0, hMax * Y_HEADROOM] },
  };
}
