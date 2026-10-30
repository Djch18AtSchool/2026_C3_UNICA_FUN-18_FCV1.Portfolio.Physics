import { describe, expect, test } from 'vitest';
import { PLANETS } from '../../../lib/data/planets';
import { planarFlyby, type PassSide } from '../../../lib/physics';
import {
  flybyHyperbola,
  sampleTrack,
  solveHyperbolicKepler,
  stateAt,
  timeToRadius,
} from './flybyOrbit';

const DEG = Math.PI / 180;
/** V2 at Jupiter (research §8): V_p, v∞, θ_in and r_p. */
const JUPITER = PLANETS.jupiter;
const V2_JUPITER = {
  Vp: 12.7493,
  vInf: 7.6161,
  thetaIn: 131.46 * DEG,
  rp: 721375,
  GM: JUPITER.gm,
};

const hyperbola = (side: PassSide, rp = V2_JUPITER.rp) =>
  flybyHyperbola({ ...V2_JUPITER, rp, side });

describe('solveHyperbolicKepler', () => {
  test.each([
    [0, 1.33],
    [0.01, 1.033],
    [-0.5, 1.033],
    [3, 1.33],
    [-250, 4.27],
    [1e4, 1.01],
  ])('F solves e sinh F − F = M for M = %s, e = %s', (M, e) => {
    const F = solveHyperbolicKepler(M, e);

    expect(e * Math.sinh(F) - F).toBeCloseTo(M, 9);
  });

  test('rejects an ellipse or a non-finite anomaly', () => {
    expect(() => solveHyperbolicKepler(1, 0.9)).toThrow(RangeError);
    expect(() => solveHyperbolicKepler(Number.NaN, 1.5)).toThrow(RangeError);
  });
});

describe('flybyHyperbola', () => {
  test('V2 at Jupiter: e = 1,330 and δ = 97,5° (research §7)', () => {
    const h = hyperbola('behind');

    expect(h.e).toBeCloseTo(1.33, 3);
    expect(h.delta / DEG).toBeCloseTo(97.48, 2);
    expect(h.a).toBeCloseTo(JUPITER.gm / V2_JUPITER.vInf ** 2, 6);
  });

  test('passing behind turns v∞ clockwise, in front counter-clockwise', () => {
    expect(hyperbola('behind').thetaOut).toBeCloseTo(
      V2_JUPITER.thetaIn - hyperbola('behind').delta,
    );
    expect(hyperbola('front').thetaOut).toBeCloseTo(V2_JUPITER.thetaIn + hyperbola('front').delta);
  });

  test('passing behind puts periapsis on the trailing side of the planet', () => {
    const { periapsisAngle } = hyperbola('behind');

    expect(Math.cos(periapsisAngle)).toBeLessThan(0);
  });
});

describe('stateAt', () => {
  test('at τ = 0 the probe is at periapsis, r = r_p, with v ⊥ r', () => {
    const s = stateAt(hyperbola('behind'), 0);

    expect(s.r).toBeCloseTo(V2_JUPITER.rp, 3);
    expect(s.x * s.vx + s.y * s.vy).toBeCloseTo(0, 3);
    expect(Math.atan2(s.y, s.x)).toBeCloseTo(hyperbola('behind').periapsisAngle, 9);
  });

  test.each<PassSide>(['behind', 'front'])(
    'energy v²/2 − GM/r stays v∞²/2 along the %s pass (the planet frame conserves it)',
    (side) => {
      const h = hyperbola(side);
      for (const tau of [-4e5, -3e4, -100, 0, 777, 2e5]) {
        const s = stateAt(h, tau);
        expect(s.speed ** 2 / 2 - JUPITER.gm / s.r).toBeCloseTo(V2_JUPITER.vInf ** 2 / 2, 6);
      }
    },
  );

  test.each<PassSide>(['behind', 'front'])(
    'far from the planet the %s velocity points along v∞,in before and v∞,out after',
    (side) => {
      const h = hyperbola(side);
      const before = stateAt(h, -1e12);
      const after = stateAt(h, 1e12);
      const { vInVec, vOutVec } = planarFlyby(
        V2_JUPITER.Vp,
        V2_JUPITER.vInf,
        V2_JUPITER.thetaIn,
        V2_JUPITER.rp,
        JUPITER.gm,
        side,
      );

      expect(Math.atan2(before.vy, before.vx)).toBeCloseTo(
        Math.atan2(vInVec[1], vInVec[0] - V2_JUPITER.Vp),
        4,
      );
      expect(Math.atan2(after.vy, after.vx)).toBeCloseTo(
        Math.atan2(vOutVec[1], vOutVec[0] - V2_JUPITER.Vp),
        4,
      );
      expect(after.speed).toBeCloseTo(V2_JUPITER.vInf, 3);
    },
  );

  test('the motion is symmetric about periapsis: r(−τ) = r(τ)', () => {
    const h = hyperbola('front');

    expect(stateAt(h, -5e4).r).toBeCloseTo(stateAt(h, 5e4).r, 6);
  });

  test('stays finite at the planet surface (r_p = 1 R_J)', () => {
    const h = hyperbola('behind', JUPITER.radiusKm);
    const s = stateAt(h, 0);

    expect(s.r).toBeCloseTo(JUPITER.radiusKm, 3);
    expect(Number.isFinite(s.speed)).toBe(true);
  });
});

describe('timeToRadius', () => {
  test('is 0 at periapsis and the inverse of stateAt beyond it', () => {
    const h = hyperbola('behind');
    const tau = timeToRadius(h, 3e6);

    expect(timeToRadius(h, V2_JUPITER.rp)).toBe(0);
    expect(stateAt(h, tau).r).toBeCloseTo(3e6, 3);
  });

  test('rejects a radius inside periapsis', () => {
    expect(() => timeToRadius(hyperbola('behind'), 1000)).toThrow(RangeError);
  });
});

describe('sampleTrack', () => {
  test('runs from r = reach on the way in to r = reach on the way out, through periapsis', () => {
    const h = hyperbola('behind');
    const track = sampleTrack(h, 3e6, 41);

    expect(track).toHaveLength(41);
    expect(Math.hypot(track[0].x, track[0].y)).toBeCloseTo(3e6, 0);
    expect(Math.hypot(track[40].x, track[40].y)).toBeCloseTo(3e6, 0);
    expect(Math.hypot(track[20].x, track[20].y)).toBeCloseTo(V2_JUPITER.rp, 0);
    expect(track[0].tau).toBeCloseTo(-timeToRadius(h, 3e6), 3);
  });
});
