/**
 * The flyby hyperbola in the planet frame, drawn by the laboratory: its shape (e, |a|, δ), its
 * orientation in the plane of V⃗_p and v⃗∞,in, and the probe's position and velocity at a time τ
 * from periapsis by Kepler's hyperbolic equation, M = e sinh F − F = n τ. Axes follow the kernel's
 * planarFlyby: V⃗_p along +x, angles counter-clockwise. Units: km, s, km/s and GM in km³/s².
 */
import { hyperbolicEccentricity, turnAngle, type PassSide } from '../../../lib/physics';
import { requireFinite, requirePositive } from '../../../lib/physics/validate';

/** Newton's method on Kepler's hyperbolic equation stops at this |ΔF|, in at most that many steps. */
const KEPLER_TOLERANCE = 1e-12;
const KEPLER_MAX_ITERATIONS = 60;
/** Starting guess F₀ = sign(M) ln(2|M|/e + 1,8), good for every M and e > 1. */
const KEPLER_GUESS_OFFSET = 1.8;

export interface FlybyHyperbolaInput {
  /** |v⃗∞|, km/s. */
  vInf: number;
  /** Periapsis distance from the planet's centre, km. */
  rp: number;
  /** GM of the planet, km³/s². */
  GM: number;
  /** Angle from V⃗_p to v⃗∞,in, rad (counter-clockwise). */
  thetaIn: number;
  side: PassSide;
}

export interface FlybyHyperbola {
  vInf: number;
  rp: number;
  GM: number;
  /** Eccentricity e = 1 + r_p v∞²/GM. */
  e: number;
  /** |a| = GM/v∞², km (the semi-major axis of a hyperbola is negative). */
  a: number;
  /** Turn angle δ = 2 asin(1/e), rad. */
  delta: number;
  /** Mean motion n = √(GM/|a|³), rad/s. */
  n: number;
  /** +1: counter-clockwise (passing in front); −1: clockwise (passing behind). */
  sense: 1 | -1;
  /** Direction of periapsis seen from the planet, rad from V⃗_p. */
  periapsisAngle: number;
  thetaIn: number;
  /** Direction of v⃗∞,out, rad from V⃗_p: θ_in − δ behind, θ_in + δ in front. */
  thetaOut: number;
}

/** Position (km), velocity (km/s) and their norms, in the planet frame. */
export interface FlybyState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  speed: number;
}

/** A point of the drawn track (km) and its time from periapsis (s). */
export interface TrackPoint {
  x: number;
  y: number;
  tau: number;
}

/**
 * The hyperbola for v∞, r_p and GM, oriented so the probe arrives along v⃗∞,in and leaves turned
 * by δ: clockwise (towards V⃗_p) when passing behind, counter-clockwise in front. In its own
 * perifocal frame the incoming asymptote points at ±acos(1/e) from periapsis; the frame is
 * mirrored for a clockwise pass and turned so that asymptote lands on θ_in.
 */
export function flybyHyperbola({
  vInf,
  rp,
  GM,
  thetaIn,
  side,
}: FlybyHyperbolaInput): FlybyHyperbola {
  requirePositive('vInf', vInf);
  requireFinite('thetaIn', thetaIn);
  const e = hyperbolicEccentricity(vInf, rp, GM);
  const delta = turnAngle(vInf, rp, GM);
  const a = GM / (vInf * vInf);
  const sense = side === 'behind' ? -1 : 1;
  const asymptote = Math.acos(1 / e);
  return {
    vInf,
    rp,
    GM,
    e,
    a,
    delta,
    n: Math.sqrt(GM / a ** 3),
    sense,
    periapsisAngle: thetaIn - sense * asymptote,
    thetaIn,
    thetaOut: thetaIn + sense * delta,
  };
}

/** Hyperbolic anomaly F with e sinh F − F = M (e > 1), by Newton's method. */
export function solveHyperbolicKepler(M: number, e: number): number {
  requireFinite('M', M);
  if (!(e > 1)) throw new RangeError(`a hyperbola needs e > 1, got ${e}`);
  let F = Math.sign(M) * Math.log((2 * Math.abs(M)) / e + KEPLER_GUESS_OFFSET);
  for (let k = 0; k < KEPLER_MAX_ITERATIONS; k += 1) {
    const step = (e * Math.sinh(F) - F - M) / (e * Math.cosh(F) - 1);
    F -= step;
    if (Math.abs(step) < KEPLER_TOLERANCE * Math.max(1, Math.abs(F))) return F;
  }
  throw new RangeError(`Kepler's hyperbolic equation did not converge for M = ${M}, e = ${e}`);
}

/** Perifocal (x toward periapsis) point and velocity at anomaly F, turned into the plane's axes. */
function stateAtAnomaly(h: FlybyHyperbola, F: number): FlybyState {
  const { a, e, n, sense, periapsisAngle } = h;
  const b = a * Math.sqrt(e * e - 1);
  const px = a * (e - Math.cosh(F));
  const py = sense * b * Math.sinh(F);
  const rate = n / (e * Math.cosh(F) - 1);
  const pvx = -a * Math.sinh(F) * rate;
  const pvy = sense * b * Math.cosh(F) * rate;
  const cos = Math.cos(periapsisAngle);
  const sin = Math.sin(periapsisAngle);
  const x = px * cos - py * sin;
  const y = px * sin + py * cos;
  const vx = pvx * cos - pvy * sin;
  const vy = pvx * sin + pvy * cos;
  return { x, y, vx, vy, r: Math.hypot(x, y), speed: Math.hypot(vx, vy) };
}

/** Where the probe is τ seconds after periapsis (negative before), from Kepler's equation. */
export function stateAt(h: FlybyHyperbola, tau: number): FlybyState {
  requireFinite('tau', tau);
  return stateAtAnomaly(h, solveHyperbolicKepler(h.n * tau, h.e));
}

/** Hyperbolic anomaly at distance r ≥ r_p on the way out: r = |a|(e cosh F − 1). */
function anomalyAtRadius(h: FlybyHyperbola, r: number): number {
  requirePositive('r', r);
  if (r < h.rp) throw new RangeError(`r = ${r} km is inside periapsis r_p = ${h.rp} km`);
  return Math.acosh(Math.max(1, (r / h.a + 1) / h.e));
}

/** Seconds from periapsis to distance r (≥ r_p) on the way out; the same before periapsis. */
export function timeToRadius(h: FlybyHyperbola, r: number): number {
  const F = anomalyAtRadius(h, r);
  return (h.e * Math.sinh(F) - F) / h.n;
}

/** `count` points evenly spaced in F from r = reach on the way in to r = reach on the way out. */
export function sampleTrack(h: FlybyHyperbola, reach: number, count: number): TrackPoint[] {
  const last = anomalyAtRadius(h, reach);
  return Array.from({ length: count }, (_, k) => {
    const F = -last + (2 * last * k) / (count - 1);
    const { x, y } = stateAtAnomaly(h, F);
    return { x, y, tau: (h.e * Math.sinh(F) - F) / h.n };
  });
}
