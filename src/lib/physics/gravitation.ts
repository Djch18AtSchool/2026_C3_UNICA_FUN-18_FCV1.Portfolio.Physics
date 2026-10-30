/**
 * Newtonian gravitation for the gravity-assist topic (Tema 9): force and potential energy, energy
 * in the Sun's field, escape speed and vis-viva, the Sun-only conic from a state vector and its
 * Kepler propagation, the hyperbolic flyby in the planet frame, the change back to the Sun frame
 * (patched conics) and the planet's recoil. Units throughout: km, s, km/s, kg and GM in km³/s²,
 * so specific energies come out in km²/s² (= MJ/kg).
 */
import { requireFinite, requireNonNegative, requirePositive } from './validate';

/** Exponent of the Laplace sphere of influence, r_SOI = a (m/M)^(2/5). */
const SOI_EXPONENT = 2 / 5;
/**
 * Relative slack below zero accepted by vis-viva at a turning point, where v² = 2(ε + GM/r)
 * should be exactly 0 but can come out as −1e−16 · GM/r from rounding.
 */
const TURNING_POINT_SLACK = 1e-9;
/** Kepler's equation is solved by Newton's method to this many radians, in at most that many steps. */
const KEPLER_TOLERANCE = 1e-13;
const KEPLER_MAX_ITERATIONS = 50;
/** Danby's starting guess for Kepler's equation, E₀ = M + 0,85 e·sign(sin M). */
const DANBY_FACTOR = 0.85;

/** Cartesian vector (x, y, z): position in km or velocity in km/s. */
export type Cartesian3 = readonly [number, number, number];

/**
 * Magnitude of the gravitational force between M and m at distance r: F = G M m / r², written
 * with GM. With GM in km³/s², m in kg and r in km it comes out in kg·km/s² = kN.
 */
export function gravityForce(GM: number, m: number, r: number): number {
  requirePositive('GM', GM);
  requirePositive('m', m);
  requirePositive('r', r);
  return (GM * m) / (r * r);
}

/**
 * Gravitational potential energy with U = 0 at infinity: U = −G M m / r, written with GM. With
 * GM in km³/s², m in kg and r in km it comes out in kg·km²/s² = MJ.
 */
export function potentialEnergy(GM: number, m: number, r: number): number {
  requirePositive('GM', GM);
  requirePositive('m', m);
  requirePositive('r', r);
  return -(GM * m) / r;
}

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

/**
 * Recoil of the planet from momentum conservation, m Δv⃗ = −M ΔV⃗: the component of ΔV⃗ along the
 * probe's Δv⃗, ΔV = −m Δv / M, in the units of Δv (km/s in, km/s out).
 */
export function recoilSpeed(m: number, M: number, deltaV: number): number {
  requirePositive('m', m);
  requirePositive('M', M);
  requireFinite('deltaV', deltaV);
  return -(m * deltaV) / M;
}

/** The conic a state vector (r⃗, v⃗) is on, with the Sun (or any GM) alone. */
export interface OrbitElements {
  /** Specific energy ε = v²/2 − GM/r, km²/s². */
  energy: number;
  /** Semi-major axis a = −GM/(2ε), km (negative for a hyperbola). */
  a: number;
  /** Eccentricity |e⃗|, e⃗ = ((v² − GM/r) r⃗ − (r⃗·v⃗) v⃗)/GM. */
  e: number;
  /** Closest distance, q = a(1 − e) (= h²/(GM(1 + e)), valid for every conic), km. */
  perihelion: number;
  /** Farthest distance a(1 + e), km; Infinity when the orbit is unbound. */
  aphelion: number;
  /** Period 2π√(a³/GM), s; Infinity when the orbit is unbound. */
  period: number;
}

/** Orbital elements of the state (r⃗, v⃗) around GM (km, km/s, km³/s²). */
export function orbitFromState(r: Cartesian3, v: Cartesian3, GM: number): OrbitElements {
  const rNorm = Math.hypot(...r);
  const speed = Math.hypot(...v);
  const energy = specificEnergy(speed, rNorm, GM);
  const radial = dot(r, v);
  const eVec = r.map((ri, i) => ((speed * speed - GM / rNorm) * ri - radial * v[i]) / GM);
  const e = Math.hypot(...eVec);
  const h = Math.hypot(...cross(r, v));
  const a = -GM / (2 * energy);
  const isBound = energy < 0;
  return {
    energy,
    a,
    e,
    perihelion: (h * h) / (GM * (1 + e)),
    aphelion: isBound ? a * (1 + e) : Infinity,
    period: isBound ? 2 * Math.PI * Math.sqrt(a ** 3 / GM) : Infinity,
  };
}

/** One instant of a Kepler propagation: t (s since the state), r⃗ (km), v⃗ (km/s) and their norms. */
export interface OrbitSample {
  t: number;
  rVec: Cartesian3;
  vVec: Cartesian3;
  r: number;
  speed: number;
}

/**
 * Two-body (Sun-only) motion from the state (r⃗₀, v⃗₀) at each time t (s, from the state). Solves
 * Kepler's equation E − e sin E = M₀ + n t for the eccentric anomaly and maps it with the f and g
 * functions, so energy and angular momentum are those of the initial state. Bound orbits only.
 */
export function keplerPropagate(
  r0: Cartesian3,
  v0: Cartesian3,
  GM: number,
  times: readonly number[],
): OrbitSample[] {
  const { a, e, energy } = orbitFromState(r0, v0, GM);
  if (!(energy < 0)) throw new RangeError('keplerPropagate needs a bound orbit (ε < 0)');
  const r0Norm = Math.hypot(...r0);
  const sqrtGMa = Math.sqrt(GM * a);
  const n = Math.sqrt(GM / a ** 3);
  const E0 = Math.atan2(dot(r0, v0) / sqrtGMa, 1 - r0Norm / a);
  const M0 = E0 - e * Math.sin(E0);
  return times.map((t) => {
    requireFinite('t', t);
    const dE = solveKepler(M0 + n * t, e) - E0;
    const f = 1 - (a / r0Norm) * (1 - Math.cos(dE));
    const g = t - (dE - Math.sin(dE)) / n;
    const rVec = combine(f, r0, g, v0);
    const r = Math.hypot(...rVec);
    const fDot = (-sqrtGMa / (r * r0Norm)) * Math.sin(dE);
    const gDot = 1 - (a / r) * (1 - Math.cos(dE));
    const vVec = combine(fDot, r0, gDot, v0);
    return { t, rVec, vVec, r, speed: Math.hypot(...vVec) };
  });
}

/** Eccentric anomaly E with E − e sin E = M (0 ≤ e < 1), by Newton's method from Danby's guess. */
function solveKepler(M: number, e: number): number {
  let E = M + DANBY_FACTOR * e * Math.sign(Math.sin(M));
  for (let k = 0; k < KEPLER_MAX_ITERATIONS; k += 1) {
    const step = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < KEPLER_TOLERANCE * Math.max(1, Math.abs(M))) return E;
  }
  throw new RangeError(`Kepler's equation did not converge for M = ${M}, e = ${e}`);
}

function dot(a: Cartesian3, b: Cartesian3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Cartesian3, b: Cartesian3): Cartesian3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** p·a⃗ + q·b⃗. */
function combine(p: number, a: Cartesian3, q: number, b: Cartesian3): Cartesian3 {
  return [p * a[0] + q * b[0], p * a[1] + q * b[1], p * a[2] + q * b[2]];
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
