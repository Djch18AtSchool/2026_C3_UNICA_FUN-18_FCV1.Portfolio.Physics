/**
 * Newtonian gravitation for the gravity-assist topic (Tema 9): energy in the Sun's field, escape
 * speed and vis-viva, the hyperbolic flyby in the planet frame and the change back to the Sun
 * frame (patched conics). Units throughout: km, s, km/s and GM in km³/s², so specific energies
 * come out in km²/s² (= MJ/kg).
 */
import { requireFinite, requireNonNegative, requirePositive } from './validate';

/** Exponent of the Laplace sphere of influence, r_SOI = a (m/M)^(2/5). */
const SOI_EXPONENT = 2 / 5;
/**
 * Relative slack below zero accepted by vis-viva at a turning point, where v² = 2(ε + GM/r)
 * should be exactly 0 but can come out as −1e−16 · GM/r from rounding.
 */
const TURNING_POINT_SLACK = 1e-9;

/** Specific orbital energy: ε = v²/2 − GM/r (km²/s²). ε < 0 bound, ε > 0 escapes. */
export function specificEnergy(v: number, r: number, GM: number): number {
  requireFinite('v', v);
  requirePositive('r', r);
  requirePositive('GM', GM);
  return (v * v) / 2 - GM / r;
}

/** Escape speed at distance r: v_esc = √(2GM/r), the speed at which ε = 0. */
export function escapeSpeed(r: number, GM: number): number {
  requirePositive('r', r);
  requirePositive('GM', GM);
  return Math.sqrt((2 * GM) / r);
}

/**
 * Vis-viva: the speed at distance r on an orbit of specific energy ε, v = √(2(ε + GM/r)).
 * Returns 0 at the turning point (apoapsis of a bound orbit) and throws beyond it, where the
 * orbit never reaches.
 */
export function visVivaSpeed(r: number, GM: number, energy: number): number {
  requirePositive('r', r);
  requirePositive('GM', GM);
  requireFinite('energy', energy);
  const potential = GM / r;
  const kinetic = energy + potential;
  if (kinetic >= 0) return Math.sqrt(2 * kinetic);
  if (kinetic >= -TURNING_POINT_SLACK * potential) return 0;
  throw new RangeError(`r = ${r} km is beyond the turning point of an orbit with ε = ${energy}`);
}

/** Eccentricity of the flyby hyperbola: e = 1 + r_p v∞²/GM (e = 1 when v∞ = 0, a parabola). */
export function hyperbolicEccentricity(vInf: number, rp: number, GM: number): number {
  requireNonNegative('vInf', vInf);
  requirePositive('rp', rp);
  requirePositive('GM', GM);
  return 1 + (rp * vInf * vInf) / GM;
}

/** Angle the planet turns v∞ through: sin(δ/2) = 1/e, so δ = 2 asin(1/e), in rad (0 < δ ≤ π). */
export function turnAngle(vInf: number, rp: number, GM: number): number {
  return 2 * Math.asin(1 / hyperbolicEccentricity(vInf, rp, GM));
}

/** Magnitude of the velocity change when v∞ turns by δ at constant length: |Δv⃗| = 2 v∞ sin(δ/2). */
export function deltaVMagnitude(vInf: number, delta: number): number {
  requireNonNegative('vInf', vInf);
  requireAngle('delta', delta);
  return 2 * vInf * Math.sin(delta / 2);
}

/** Side of the planet the probe passes on, relative to the planet's motion. */
export type PassSide = 'behind' | 'front';

/** A planar flyby seen from the Sun: turn angle and the heliocentric velocity before and after. */
export interface PlanarFlybyResult {
  /** Turn angle δ of v∞, rad. */
  delta: number;
  /** |v⃗_in| = |V⃗_p + v⃗∞,in|, km/s. */
  vIn: number;
  /** |v⃗_out| = |V⃗_p + v⃗∞,out|, km/s. */
  vOut: number;
  /** v⃗_in in the plane, with V⃗_p along +x, km/s. */
  vInVec: [number, number];
  /** v⃗_out in the plane, with V⃗_p along +x, km/s. */
  vOutVec: [number, number];
}

/**
 * Patched-conic flyby in one plane. V⃗_p (the planet's heliocentric velocity) points along +x and
 * v⃗∞,in makes the angle θ_in with it, counted counter-clockwise (0 ≤ θ_in ≤ π). In the planet
 * frame the probe leaves with the same |v∞| turned by δ (energy is conserved there); passing
 * behind the planet turns v⃗∞ clockwise, towards V⃗_p, and passing in front turns it the other way.
 * Back in the Sun frame, v⃗ = V⃗_p + v⃗∞, so turning v⃗∞ changes |v⃗|.
 */
export function planarFlyby(
  Vp: number,
  vInf: number,
  thetaIn: number,
  rp: number,
  GM: number,
  side: PassSide,
): PlanarFlybyResult {
  requirePositive('Vp', Vp);
  requireAngle('thetaIn', thetaIn);
  const delta = turnAngle(vInf, rp, GM);
  const thetaOut = side === 'behind' ? thetaIn - delta : thetaIn + delta;
  const vInVec = heliocentric(Vp, vInf, thetaIn);
  const vOutVec = heliocentric(Vp, vInf, thetaOut);
  return {
    delta,
    vIn: Math.hypot(...vInVec),
    vOut: Math.hypot(...vOutVec),
    vInVec,
    vOutVec,
  };
}

/** Laplace sphere of influence of a body of mass m orbiting M at distance a: a (m/M)^(2/5). */
export function sphereOfInfluence(a: number, m: number, M: number): number {
  requirePositive('a', a);
  requirePositive('m', m);
  requirePositive('M', M);
  return a * (m / M) ** SOI_EXPONENT;
}

/** v⃗ = V⃗_p + v⃗∞ with V⃗_p on +x and v⃗∞ at angle θ from it. */
function heliocentric(Vp: number, vInf: number, theta: number): [number, number] {
  return [Vp + vInf * Math.cos(theta), vInf * Math.sin(theta)];
}

/** Throws a RangeError unless `value` is an angle in [0, π]. */
function requireAngle(name: string, value: number): void {
  requireFinite(name, value);
  if (value < 0 || value > Math.PI) {
    throw new RangeError(`${name} must be between 0 and π rad, got ${value}`);
  }
}
