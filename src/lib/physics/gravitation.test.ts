import { describe, expect, test } from 'vitest';
import {
  deltaVMagnitude,
  escapeSpeed,
  gravityForce,
  hyperbolicEccentricity,
  keplerPropagate,
  orbitFromState,
  planarFlyby,
  potentialEnergy,
  recoilSpeed,
  specificEnergy,
  sphereOfInfluence,
  turnAngle,
  visVivaSpeed,
  type Cartesian3,
} from './gravitation';

const DEG = Math.PI / 180;
/** GM of the Sun, km³/s² (JPL astro_par, DE440). */
const GM_SUN = 1.32712440041279419e11;
/** GM of Jupiter (the body), km³/s² (Horizons); research §7 rounds it to 1,26687 × 10⁸. */
const GM_JUPITER = 1.26686532e8;
const R_JUPITER = 71492;
const AU = 149597870.7;
/** Voyager 2 at Jupiter (research §5 and §7): v∞, r_p and the Sun-frame triangle. */
const V2_JUPITER = { vInf: 7.616, rp: 721375, Vp: 12.749, thetaIn: 131.5 * DEG };

describe('Sun-only model: energy, escape and vis-viva', () => {
  test('specific energy is v²/2 − GM/r (km²/s²)', () => {
    expect(specificEnergy(10, 1000, 2e5)).toBe(-150);
    // Research §7: between Jupiter and Saturn ε ≈ 26,32 km²/s² at 6,23 AU with v = 18,375 km/s.
    expect(specificEnergy(18.375, 6.23 * AU, GM_SUN)).toBeCloseTo(26.4, 0);
  });

  test('escape speed √(2GM/r): 42,1 km/s at 1 AU and 18,26 km/s at Jupiter (5,32 AU)', () => {
    expect(escapeSpeed(AU, GM_SUN)).toBeCloseTo(42.12, 2);
    expect(escapeSpeed(5.32 * AU, GM_SUN)).toBeCloseTo(18.26, 2);
  });

  test('vis-viva recovers the speed from the energy: v = √(2(ε + GM/r))', () => {
    // Research §7: at 6,23 AU with ε = 26,32 km²/s², v = 18,37 km/s.
    expect(visVivaSpeed(6.23 * AU, GM_SUN, 26.32)).toBeCloseTo(18.37, 2);
    expect(visVivaSpeed(1000, 2e5, specificEnergy(10, 1000, 2e5))).toBeCloseTo(10, 12);
  });

  test('vis-viva is 0 exactly at the turning point and tolerates rounding just past it', () => {
    const energy = -100;
    const rTurn = 2e5 / 100;

    expect(visVivaSpeed(rTurn, 2e5, energy)).toBe(0);
    expect(visVivaSpeed(rTurn * (1 + 1e-13), 2e5, energy)).toBe(0);
  });

  test('vis-viva rejects a distance the orbit never reaches', () => {
    expect(() => visVivaSpeed(3000, 2e5, -100)).toThrow(/turning point/);
  });

  test('a bound orbit (ε < 0) has v below escape speed and an unbound one above', () => {
    const r = 5.2 * AU;
    const vEsc = escapeSpeed(r, GM_SUN);

    expect(specificEnergy(vEsc * 0.99, r, GM_SUN)).toBeLessThan(0);
    expect(specificEnergy(vEsc, r, GM_SUN)).toBeCloseTo(0, 9);
    expect(specificEnergy(vEsc * 1.01, r, GM_SUN)).toBeGreaterThan(0);
  });

  test('rejects non-positive distances and GM', () => {
    expect(() => specificEnergy(1, 0, GM_SUN)).toThrow(RangeError);
    expect(() => escapeSpeed(-1, GM_SUN)).toThrow(RangeError);
    expect(() => escapeSpeed(AU, 0)).toThrow(RangeError);
    expect(() => visVivaSpeed(AU, GM_SUN, Number.NaN)).toThrow(RangeError);
  });
});

describe('hyperbolic flyby in the planet frame', () => {
  test('V2 at Jupiter: e = 1 + r_p v∞²/GM = 1,330', () => {
    const e = hyperbolicEccentricity(V2_JUPITER.vInf, V2_JUPITER.rp, GM_JUPITER);

    expect(e).toBeCloseTo(1.33, 3);
  });

  test('V2 at Jupiter: δ = 2 asin(1/e) = 97,5°', () => {
    expect(turnAngle(V2_JUPITER.vInf, V2_JUPITER.rp, GM_JUPITER) / DEG).toBeCloseTo(97.5, 1);
  });

  test('|Δv⃗| = 2 v∞ sin(δ/2) = 11,45 km/s at Jupiter', () => {
    expect(deltaVMagnitude(V2_JUPITER.vInf, 97.5 * DEG)).toBeCloseTo(11.45, 1);
  });

  test('research §8 table: e and δ for r_p from 1 to 100 R_J', () => {
    const rows: [number, number, number][] = [
      [1, 1.033, 151.1],
      [2, 1.066, 139.6],
      [5, 1.164, 118.5],
      [20, 1.655, 74.4],
      [50, 2.637, 44.6],
      [100, 4.273, 27.1],
    ];
    rows.forEach(([radii, e, delta]) => {
      const rp = radii * R_JUPITER;
      // The table rounds e to three decimals; 2 R_J gives 1,0655, printed there as 1,066.
      expect(hyperbolicEccentricity(V2_JUPITER.vInf, rp, GM_JUPITER)).toBeCloseTo(e, 2);
      expect(turnAngle(V2_JUPITER.vInf, rp, GM_JUPITER) / DEG).toBeCloseTo(delta, 1);
    });
  });

  test('closer passes turn more: δ falls monotonically with r_p', () => {
    const deltas = [1, 2, 5, 10, 20, 50, 100].map((k) =>
      turnAngle(V2_JUPITER.vInf, k * R_JUPITER, GM_JUPITER),
    );

    deltas.slice(1).forEach((delta, i) => expect(delta).toBeLessThan(deltas[i]));
  });

  test('degenerate v∞ = 0 is a parabola: e = 1, δ = 180° and finite Δv = 0', () => {
    expect(hyperbolicEccentricity(0, R_JUPITER, GM_JUPITER)).toBe(1);
    expect(turnAngle(0, R_JUPITER, GM_JUPITER)).toBeCloseTo(Math.PI, 12);
    expect(deltaVMagnitude(0, Math.PI)).toBe(0);
  });

  test('a very distant pass barely turns: δ → 0 and |Δv⃗| → 0', () => {
    const delta = turnAngle(V2_JUPITER.vInf, 1e12, GM_JUPITER);

    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(1e-3);
    expect(deltaVMagnitude(V2_JUPITER.vInf, delta)).toBeLessThan(1e-2);
  });

  test('rejects negative v∞, non-positive r_p or GM and δ outside [0, π]', () => {
    expect(() => hyperbolicEccentricity(-1, R_JUPITER, GM_JUPITER)).toThrow(RangeError);
    expect(() => hyperbolicEccentricity(1, 0, GM_JUPITER)).toThrow(RangeError);
    expect(() => turnAngle(1, R_JUPITER, 0)).toThrow(RangeError);
    expect(() => deltaVMagnitude(1, -0.1)).toThrow(RangeError);
    expect(() => deltaVMagnitude(1, 4)).toThrow(RangeError);
  });
});

describe('planarFlyby: back to the Sun frame, v⃗ = V⃗_p + v⃗_rel', () => {
  const { Vp, vInf, thetaIn, rp } = V2_JUPITER;

  test('V2 at Jupiter passing behind: 9,59 → 19,5 km/s', () => {
    const f = planarFlyby(Vp, vInf, thetaIn, rp, GM_JUPITER, 'behind');

    expect(f.vIn).toBeCloseTo(9.59, 1);
    expect(f.vOut).toBeCloseTo(19.5, 0);
    expect(f.delta / DEG).toBeCloseTo(97.5, 1);
  });

  test('research §8 table: v_out behind and in front for r_p from 1 to 100 R_J', () => {
    const rows: [number, number, number][] = [
      [1, 20.09, 16.21],
      [2, 20.32, 14.98],
      [5, 20.24, 12.41],
      [10.09, 19.53, 9.65],
      [20, 18.05, 6.77],
      [50, 15.2, 5.18],
      [100, 13.12, 6.31],
    ];
    rows.forEach(([radii, behind, front]) => {
      const r = radii * R_JUPITER;
      expect(planarFlyby(Vp, vInf, thetaIn, r, GM_JUPITER, 'behind').vOut).toBeCloseTo(behind, 1);
      expect(planarFlyby(Vp, vInf, thetaIn, r, GM_JUPITER, 'front').vOut).toBeCloseTo(front, 1);
    });
  });

  test('the planet-frame speed is unchanged: |v⃗_out − V⃗_p| = |v⃗_in − V⃗_p| = v∞', () => {
    const f = planarFlyby(Vp, vInf, thetaIn, rp, GM_JUPITER, 'front');

    expect(Math.hypot(f.vInVec[0] - Vp, f.vInVec[1])).toBeCloseTo(vInf, 12);
    expect(Math.hypot(f.vOutVec[0] - Vp, f.vOutVec[1])).toBeCloseTo(vInf, 12);
  });

  test('vectors agree with the magnitudes and the turn equals δ', () => {
    const f = planarFlyby(Vp, vInf, thetaIn, rp, GM_JUPITER, 'behind');
    const relIn = [f.vInVec[0] - Vp, f.vInVec[1]];
    const relOut = [f.vOutVec[0] - Vp, f.vOutVec[1]];
    const turn = Math.acos((relIn[0] * relOut[0] + relIn[1] * relOut[1]) / (vInf * vInf));

    expect(Math.hypot(...f.vInVec)).toBeCloseTo(f.vIn, 12);
    expect(Math.hypot(...f.vOutVec)).toBeCloseTo(f.vOut, 12);
    expect(turn).toBeCloseTo(f.delta, 9);
    expect(Math.hypot(relOut[0] - relIn[0], relOut[1] - relIn[1])).toBeCloseTo(
      deltaVMagnitude(vInf, f.delta),
      9,
    );
  });

  test('the side decides: behind gains +9,9 km/s, in front gains almost nothing (research §8)', () => {
    const behind = planarFlyby(Vp, vInf, thetaIn, rp, GM_JUPITER, 'behind');
    const front = planarFlyby(Vp, vInf, thetaIn, rp, GM_JUPITER, 'front');

    expect(behind.vIn).toBe(front.vIn);
    expect(behind.vOut - behind.vIn).toBeCloseTo(9.94, 1);
    // θ_in + δ = 229° mirrors θ_in = 131,5° about 180°, so |v| barely changes: 9,59 → 9,65.
    expect(front.vOut - front.vIn).toBeCloseTo(0.06, 1);
  });

  test('passing in front at 20 R_J loses speed: 9,59 → 6,77 km/s', () => {
    const front = planarFlyby(Vp, vInf, thetaIn, 20 * R_JUPITER, GM_JUPITER, 'front');

    expect(front.vOut - front.vIn).toBeLessThan(-2.5);
  });

  test('never exceeds V_p + v∞ (20,37 km/s) and stays finite at the planet radius', () => {
    const f = planarFlyby(Vp, vInf, thetaIn, R_JUPITER, GM_JUPITER, 'behind');

    expect(Number.isFinite(f.vOut)).toBe(true);
    expect(f.vOut).toBeLessThanOrEqual(Vp + vInf);
  });

  test('rejects an arrival angle outside [0, π] and non-positive V_p', () => {
    expect(() => planarFlyby(Vp, vInf, -0.1, rp, GM_JUPITER, 'behind')).toThrow(RangeError);
    expect(() => planarFlyby(Vp, vInf, 3.2, rp, GM_JUPITER, 'behind')).toThrow(RangeError);
    expect(() => planarFlyby(0, vInf, thetaIn, rp, GM_JUPITER, 'front')).toThrow(RangeError);
  });
});

describe('sphereOfInfluence', () => {
  test('r_SOI = a (m/M)^(2/5): Jupiter ≈ 4,94 × 10⁷ km at 5,32 AU', () => {
    // Research §5 uses Jupiter's distance to the Sun at the encounter and the GM ratio.
    const rSoi = sphereOfInfluence(5.32 * AU, GM_JUPITER, GM_SUN);

    expect(rSoi / 1e7).toBeCloseTo(4.94, 1);
    expect(rSoi / R_JUPITER).toBeGreaterThan(680);
  });

  test('scales linearly with a and is unchanged by the units of the mass ratio', () => {
    expect(sphereOfInfluence(2, 1, 32)).toBeCloseTo(2 * sphereOfInfluence(1, 1, 32), 12);
    expect(sphereOfInfluence(1, 1, 32)).toBeCloseTo(0.25, 12);
    expect(sphereOfInfluence(1, 1898.19e24, 1.98841e30)).toBeCloseTo(
      sphereOfInfluence(1, GM_JUPITER, GM_SUN),
      3,
    );
  });

  test('rejects non-positive inputs', () => {
    expect(() => sphereOfInfluence(0, 1, 2)).toThrow(RangeError);
    expect(() => sphereOfInfluence(1, 0, 2)).toThrow(RangeError);
    expect(() => sphereOfInfluence(1, 1, 0)).toThrow(RangeError);
  });
});

describe('force, potential energy and recoil', () => {
  test('F = GMm/r² and U = −GMm/r in kernel units (kg·km/s² = kN, kg·km²/s² = MJ)', () => {
    // A 721,9 kg probe at 1 AU from the Sun: F ≈ 4,28 N, U ≈ −640 GJ.
    expect(gravityForce(GM_SUN, 721.9, AU) * 1000).toBeCloseTo(4.28, 2);
    expect(potentialEnergy(GM_SUN, 721.9, AU) / 1000).toBeCloseTo(-640.4, 1);
    expect(potentialEnergy(2e5, 2, 1000)).toBe(-400);
    expect(gravityForce(2e5, 2, 1000)).toBe(0.4);
  });

  test('U is the work against F: dU/dr = F', () => {
    const r = 5 * AU;
    const h = 1e4;
    const slope = (potentialEnergy(GM_SUN, 1, r + h) - potentialEnergy(GM_SUN, 1, r - h)) / (2 * h);

    expect(slope / gravityForce(GM_SUN, 1, r)).toBeCloseTo(1, 8);
  });

  test('m Δv = −M ΔV: Jupiter recoils 4,4 × 10⁻²¹ m/s for V2’s 11,45 km/s (research §5)', () => {
    const recoil = recoilSpeed(721.9, 18.9819e26, 11.45);

    expect(recoil).toBeLessThan(0);
    // 4,35 × 10⁻²¹ m/s, which research §5 rounds to 4,4 × 10⁻²¹.
    expect((-recoil * 1000) / 1e-21).toBeCloseTo(4.35, 2);
    expect(recoilSpeed(2, 4, 3)).toBe(-1.5);
  });

  test('rejects non-positive masses and distances', () => {
    expect(() => gravityForce(GM_SUN, 0, AU)).toThrow(RangeError);
    expect(() => potentialEnergy(GM_SUN, 1, 0)).toThrow(RangeError);
    expect(() => recoilSpeed(1, 0, 1)).toThrow(RangeError);
    expect(() => recoilSpeed(1, 1, Number.NaN)).toThrow(RangeError);
  });
});

describe('orbitFromState and keplerPropagate (Sun-only conic from a state vector)', () => {
  /** An ellipse with q = 1 AU and e = 0,727 starting at perihelion, in the ecliptic. */
  const ECC = 0.727;
  const Q = AU;
  const R0: Cartesian3 = [Q, 0, 0];
  const V0: Cartesian3 = [0, Math.sqrt((GM_SUN * (1 + ECC)) / Q), 0];
  const elements = orbitFromState(R0, V0, GM_SUN);

  test('recovers a = q/(1 − e), e, perihelion, aphelion and period 2π√(a³/GM)', () => {
    const a = Q / (1 - ECC);

    expect(elements.e).toBeCloseTo(ECC, 12);
    expect(elements.a / a).toBeCloseTo(1, 12);
    expect(elements.perihelion / Q).toBeCloseTo(1, 12);
    expect(elements.aphelion / (a * (1 + ECC))).toBeCloseTo(1, 12);
    expect(elements.period / (2 * Math.PI * Math.sqrt(a ** 3 / GM_SUN))).toBeCloseTo(1, 12);
    expect(elements.energy).toBeCloseTo(-GM_SUN / (2 * a), 9);
  });

  test('is independent of where on the orbit and in which plane the state is taken', () => {
    const [later] = keplerPropagate(R0, V0, GM_SUN, [elements.period / 3]);
    const tilt = (u: Cartesian3): Cartesian3 => [u[0], u[1] * 0.6, u[1] * 0.8];
    const tilted = orbitFromState(tilt(later.rVec), tilt(later.vVec), GM_SUN);

    expect(tilted.e).toBeCloseTo(ECC, 9);
    expect(tilted.a / elements.a).toBeCloseTo(1, 9);
  });

  test('an unbound state has no aphelion nor period: Infinity, not NaN', () => {
    const escape: Cartesian3 = [0, escapeSpeed(Q, GM_SUN) * 1.1, 0];
    const hyperbola = orbitFromState(R0, escape, GM_SUN);

    expect(hyperbola.e).toBeGreaterThan(1);
    expect(hyperbola.aphelion).toBe(Infinity);
    expect(hyperbola.period).toBe(Infinity);
    expect(() => keplerPropagate(R0, escape, GM_SUN, [0])).toThrow(/bound/);
  });

  test('reaches aphelion after half a period and returns to the start after one', () => {
    const [start, half, full] = keplerPropagate(R0, V0, GM_SUN, [
      0,
      elements.period / 2,
      elements.period,
    ]);

    expect(start.r / Q).toBeCloseTo(1, 12);
    expect(half.r / elements.aphelion).toBeCloseTo(1, 9);
    expect(full.r / Q).toBeCloseTo(1, 9);
    expect(half.speed).toBeCloseTo(visVivaSpeed(elements.aphelion, GM_SUN, elements.energy), 6);
  });

  test('conserves energy and angular momentum along the propagated orbit', () => {
    const times = Array.from({ length: 50 }, (_, k) => (k * elements.period) / 37);
    const h0 = Q * V0[1];

    keplerPropagate(R0, V0, GM_SUN, times).forEach((sample, k) => {
      const { rVec, vVec } = sample;
      const h = rVec[0] * vVec[1] - rVec[1] * vVec[0];
      expect(sample.t).toBe(times[k]);
      expect(Math.hypot(...rVec)).toBeCloseTo(sample.r, 3);
      expect(Math.hypot(...vVec)).toBeCloseTo(sample.speed, 9);
      expect(specificEnergy(sample.speed, sample.r, GM_SUN) / elements.energy).toBeCloseTo(1, 9);
      expect(h / h0).toBeCloseTo(1, 9);
    });
  });

  test('a circular orbit stays at constant r and speed', () => {
    const v = Math.sqrt(GM_SUN / Q);
    const samples = keplerPropagate([Q, 0, 0], [0, v, 0], GM_SUN, [0, 1e6, 1e7]);

    samples.forEach((sample) => {
      expect(sample.r / Q).toBeCloseTo(1, 9);
      expect(sample.speed / v).toBeCloseTo(1, 9);
    });
  });

  test('rejects a state at the origin and a non-finite time', () => {
    expect(() => orbitFromState([0, 0, 0], V0, GM_SUN)).toThrow(RangeError);
    expect(() => keplerPropagate(R0, V0, GM_SUN, [Number.NaN])).toThrow(RangeError);
  });
});
