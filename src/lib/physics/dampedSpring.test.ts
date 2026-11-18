import { describe, expect, test } from 'vitest';
import {
  CRITICAL_TOLERANCE,
  dampingRatio,
  dampingRegime,
  fromPerceptual,
  isSpringAtRest,
  naturalAngularFrequency,
  overshootRatio,
  peakTime,
  settlingTime,
  springState,
  type SpringParams,
} from './dampedSpring';
import { criticalDamping } from './spring';

/** Motion's test harness: x = target + u, sampled every stepS seconds and rounded (spring.test.ts). */
const sample = (p: SpringParams, from: number, to: number, stepS: number, n: number) =>
  Array.from({ length: n }, (_, i) => Math.round(to + springState(p, from - to, 0, i * stepS).u));

/** A spring with ω₀ = 1 rad/s and the given ζ (m = 1, so b = 2ζ). */
const unitSpring = (zeta: number): SpringParams => ({ k: 1, b: 2 * zeta, m: 1 });

/** A spring whose ζ is exactly the critical value scaled by `factor`. */
const scaledCritical = (k: number, m: number, factor: number): SpringParams => ({
  k,
  b: criticalDamping(k, m) * factor,
  m,
});

/** Within one unit of the last decimal of a value the research prints to 3 decimals. */
const expectWithinThousandth = (actual: number, expected: number) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-3);

/** The last grid time at which |u| is outside the band ε·|u₀|: a brute-force settling time. */
function scannedSettling(
  p: SpringParams,
  u0: number,
  v0: number,
  eps: number,
  tMax: number,
  dt: number,
) {
  const band = eps * Math.abs(u0);
  const steps = Math.round(tMax / dt);
  return Array.from({ length: steps + 1 }, (_, i) => i * dt).reduce(
    (last, t) => (Math.abs(springState(p, u0, v0, t).u) > band ? t : last),
    0,
  );
}

describe('dampedSpring: reproduces the sources', () => {
  test('reproduce la prueba subamortiguada de Motion', () =>
    expect(sample({ k: 300, b: 10, m: 1 }, 100, 1000, 0.2, 9)).toEqual([
      100, 1343, 873, 1046, 984, 1005, 998, 1001, 1000,
    ]));

  test('reproduce la prueba crítica de Motion', () =>
    expect(sample({ k: 100, b: 20, m: 1 }, 100, 1000, 0.2, 6)).toEqual([
      100, 635, 918, 984, 997, 1000,
    ]));

  test('reproduce la prueba sobreamortiguada de Motion', () =>
    expect(sample({ k: 300, b: 100, m: 1 }, 100, 1000, 0.2, 14)).toEqual([
      100, 499, 731, 855, 922, 958, 977, 988, 993, 996, 998, 999, 999, 1000,
    ]));

  test('el ejemplo de Apple: 0,5 s y rebote 0,3 → k 157,9 y b 17,6', () => {
    const p = fromPerceptual(0.5, 0.3);
    expect(p.k).toBeCloseTo(157.91, 2);
    expect(p.b).toBeCloseTo(17.59, 2);
    expect(p.m).toBe(1);
  });

  test('Motion por omisión: ζ = 0,5 y ω0 = 10', () => {
    const p = { k: 100, b: 10, m: 1 };
    expect(dampingRatio(p)).toBe(0.5);
    expect(naturalAngularFrequency(p)).toBe(10);
    expect(dampingRegime(p)).toBe('subamortiguado');
  });

  test('la escala hacia 0 de Motion es crítica exacta', () =>
    expect(dampingRegime({ k: 550, b: 2 * Math.sqrt(550), m: 1 })).toBe('critico'));

  test('.bouncy: sobrepaso 4,60 % a 0,350 s', () => {
    const p = fromPerceptual(0.5, 0.3);
    expect(overshootRatio(0.7)).toBeCloseTo(0.046, 4);
    expect(peakTime(p)).toBeCloseTo(0.35, 3);
    // (10.7) is (10.6) evaluated at the peak: from u₀ = −1 at rest, u(t_p) = +M_p and v(t_p) = 0.
    const peak = springState(p, -1, 0, peakTime(p));
    expect(peak.u).toBeCloseTo(overshootRatio(dampingRatio(p)), 12);
    expect(peak.v).toBeCloseTo(0, 12);
  });

  test('the overshoot table of research §4 (ζ 0,2 · 0,5 · 0,9 · 1 · 1,5)', () => {
    expect(overshootRatio(0.2)).toBeCloseTo(0.5266, 4);
    expect(overshootRatio(0.5)).toBeCloseTo(0.163, 4);
    expect(overshootRatio(0.9)).toBeCloseTo(0.0015, 4);
    expect(overshootRatio(1)).toBe(0);
    expect(overshootRatio(1.5)).toBe(0);
  });

  test('the critical settling root e^(−u)(1 + u) = ε of research §4 and Motion plan 033', () => {
    expect(settlingTime(unitSpring(1), 1, 0, 0.001)).toBeCloseTo(9.2334134764516, 9);
    expectWithinThousandth(settlingTime(unitSpring(1), 1, 0, 0.02), 5.834);
    expectWithinThousandth(settlingTime(unitSpring(1), 1, 0, 0.01), 6.638);
  });

  test('the settling times of .smooth, .snappy and .bouncy (research §4)', () => {
    const cases: [number, [number, number, number]][] = [
      [0, [0.464, 0.528, 0.735]],
      [0.15, [0.333, 0.355, 0.697]],
      [0.3, [0.476, 0.523, 0.819]],
    ];
    cases.forEach(([bounce, expected]) => {
      const p = fromPerceptual(0.5, bounce);
      [0.02, 0.01, 0.001].forEach((eps, i) =>
        expectWithinThousandth(settlingTime(p, -1, 0, eps), expected[i]),
      );
    });
  });

  test('ω₀·t_s at 2 % against ζ (research §4), the three regimes', () => {
    const table: [number, number][] = [
      [0.2, 19.601],
      [0.5, 8.076],
      [0.8, 3.755],
      [1, 5.833],
      [1.5, 10.654],
      [2, 14.877],
      [3, 22.975],
    ];
    table.forEach(([zeta, expected]) =>
      expectWithinThousandth(settlingTime(unitSpring(zeta), -1, 0, 0.02), expected),
    );
  });

  test("Motion's default spring enters the 0,5 px band of a 100 px move at 0,917 s", () =>
    expectWithinThousandth(settlingTime({ k: 100, b: 10, m: 1 }, -100, 0, 0.005), 0.917));
});

describe('dampedSpring: regimes and continuity', () => {
  test('the regime chip for ζ = 0,5 · 1 · 2 and for b = 0', () => {
    expect(dampingRegime(unitSpring(0.5))).toBe('subamortiguado');
    expect(dampingRegime(unitSpring(1))).toBe('critico');
    expect(dampingRegime(unitSpring(2))).toBe('sobreamortiguado');
    expect(dampingRegime(unitSpring(0))).toBe('sin-amortiguar');
  });

  test('peakTime is π/ω_d below critical and Infinity from critical on', () => {
    expect(peakTime(unitSpring(0.6))).toBeCloseTo(Math.PI / 0.8, 12);
    expect(peakTime(unitSpring(1))).toBe(Infinity);
    expect(peakTime(unitSpring(2))).toBe(Infinity);
    expect(peakTime(scaledCritical(100, 1, 1 - 1e-12))).toBe(Infinity);
  });

  test('springState is finite at an extreme t in every regime (no Infinity · 0)', () => {
    [0.5, 1, 2].forEach((zeta) => {
      const { u, v } = springState(unitSpring(zeta), -1, 30, 1e308);
      expect(Number.isFinite(u) && Number.isFinite(v)).toBe(true);
    });
  });

  test('springState at t = 0 returns the initial state in every regime', () => {
    [0, 0.5, 1, 2].forEach((zeta) =>
      expect(springState(unitSpring(zeta), -3, 2, 0)).toEqual({ u: -3, v: 2 }),
    );
  });

  test('x y v son continuas: springState en t y el reinicio desde ese estado coinciden', () => {
    // (10.9): restarting (10.6) from the state at t₁ gives the same motion as running on.
    const springs = [
      { k: 100, b: 10, m: 1 },
      { k: 100, b: 20, m: 1 },
      { k: 100, b: 40, m: 1 },
    ];
    springs.forEach((p) => {
      const atT1 = springState(p, -300, 50, 0.2);
      const onward = springState(p, -300, 50, 0.35);
      const restarted = springState(p, atT1.u, atT1.v, 0.15);
      expect(restarted.u).toBeCloseTo(onward.u, 9);
      expect(restarted.v).toBeCloseTo(onward.v, 9);
    });
  });

  test('the velocity is the derivative of the position in every regime', () => {
    const h = 1e-6;
    [0, 0.3, 1, 2.5].forEach((zeta) => {
      const p = { k: 40, b: 2 * zeta * Math.sqrt(40 * 2), m: 2 };
      const slope =
        (springState(p, 1.5, -4, 0.4 + h).u - springState(p, 1.5, -4, 0.4 - h).u) / (2 * h);
      expect(springState(p, 1.5, -4, 0.4).v).toBeCloseTo(slope, 6);
    });
  });

  test('ζ = 1 ± 1e-12 se clasifica crítico y su estado es finito', () => {
    const exact = { k: 157.91, b: criticalDamping(157.91, 0.8), m: 0.8 };
    [1 - 1e-12, 1 + 1e-12, 1 - CRITICAL_TOLERANCE / 2, 1 + CRITICAL_TOLERANCE / 2].forEach(
      (factor) => {
        const p = scaledCritical(157.91, 0.8, factor);
        expect(dampingRegime(p)).toBe('critico');
        [0, 0.1, 1, 10, 1e4].forEach((t) => {
          const s = springState(p, -1, 3, t);
          expect(Number.isFinite(s.u) && Number.isFinite(s.v)).toBe(true);
          expect(s.u).toBeCloseTo(springState(exact, -1, 3, t).u, 9);
          expect(s.v).toBeCloseTo(springState(exact, -1, 3, t).v, 9);
        });
        expect(Number.isFinite(settlingTime(p, -1, 0, 0.02))).toBe(true);
        expect(overshootRatio(dampingRatio(p))).toBe(0);
      },
    );
  });

  test('just outside the tolerance the neighbours take over without a jump in u, v or t_s', () => {
    const exact = scaledCritical(100, 1, 1);
    const below = scaledCritical(100, 1, 1 - 1e-8);
    const above = scaledCritical(100, 1, 1 + 1e-8);
    expect(dampingRegime(below)).toBe('subamortiguado');
    expect(dampingRegime(above)).toBe('sobreamortiguado');
    expect(dampingRegime(scaledCritical(100, 1, 1 - 2 * CRITICAL_TOLERANCE))).toBe(
      'subamortiguado',
    );
    expect(dampingRegime(scaledCritical(100, 1, 1 + 2 * CRITICAL_TOLERANCE))).toBe(
      'sobreamortiguado',
    );
    [0.05, 0.2, 1].forEach((t) =>
      [below, above].forEach((p) => {
        expect(springState(p, -1, 3, t).u).toBeCloseTo(springState(exact, -1, 3, t).u, 5);
        expect(springState(p, -1, 3, t).v).toBeCloseTo(springState(exact, -1, 3, t).v, 5);
      }),
    );
    const settled = settlingTime(exact, -1, 0, 0.02);
    [below, above, scaledCritical(100, 1, 1 - 2 * CRITICAL_TOLERANCE)].forEach((p) =>
      expect(settlingTime(p, -1, 0, 0.02)).toBeCloseTo(settled, 4),
    );
  });

  test('b = 0: sin amortiguar, energía constante y asentamiento infinito', () => {
    const p = { k: 157.91, b: 0, m: 2 };
    const energy = ({ u, v }: { u: number; v: number }) => (p.m * v * v + p.k * u * u) / 2;
    const initial = energy({ u: -1, v: 3 });
    expect(dampingRegime(p)).toBe('sin-amortiguar');
    [0.3, 1.7, 12, 600].forEach((t) =>
      expect(energy(springState(p, -1, 3, t)) / initial).toBeCloseTo(1, 12),
    );
    expect(settlingTime(p, -1, 3, 0.02)).toBe(Infinity);
    expect(overshootRatio(0)).toBe(1);
    expect(peakTime(p)).toBeCloseTo(Math.PI / naturalAngularFrequency(p), 12);
  });

  test('a very heavy overdamping (Motion’s k = 10⁶, b = 10⁷) stays finite and never crosses', () => {
    const p = { k: 1e6, b: 1e7, m: 1 };
    const us = [0, 1e-4, 0.01, 1, 10, 100, 1e4].map((t) => springState(p, -1, 0, t).u);
    us.forEach((u) => expect(Number.isFinite(u)).toBe(true));
    us.slice(1).forEach((u, i) => expect(u).toBeGreaterThanOrEqual(us[i]));
    expect(us.at(-1)).toBeLessThanOrEqual(0);
    expect(Number.isFinite(settlingTime(p, -1, 0, 0.02))).toBe(true);
  });
});

describe('settlingTime: the last time |u| leaves ε·|u₀|', () => {
  const cases: {
    name: string;
    p: SpringParams;
    u0: number;
    v0: number;
    eps: number;
    tMax: number;
  }[] = [
    // The first extremum is already inside the band: the entry is before it.
    {
      name: 'underdamped, launched towards the target',
      p: unitSpring(0.7),
      u0: -1,
      v0: 0.1,
      eps: 0.5,
      tMax: 10,
    },
    {
      name: 'underdamped, launched away from the target',
      p: unitSpring(0.3),
      u0: -1,
      v0: -2,
      eps: 0.02,
      tMax: 40,
    },
    {
      name: 'underdamped, lightly damped',
      p: { k: 1000, b: 0.5, m: 0.1 },
      u0: 1,
      v0: 0,
      eps: 0.002,
      tMax: 3,
    },
    {
      name: 'critical, overshoot outside the band',
      p: unitSpring(1),
      u0: -1,
      v0: 2,
      eps: 0.02,
      tMax: 20,
    },
    {
      name: 'critical, overshoot inside the band',
      p: unitSpring(1),
      u0: -1,
      v0: 1.3,
      eps: 0.02,
      tMax: 20,
    },
    {
      name: 'overdamped, overshoot outside the band',
      p: unitSpring(2),
      u0: -1,
      v0: 4,
      eps: 0.02,
      tMax: 40,
    },
    {
      name: 'overdamped, overshoot inside the band',
      p: unitSpring(2),
      u0: -1,
      v0: 3.8,
      eps: 0.02,
      tMax: 40,
    },
  ];

  test.each(cases)('$name matches a brute-force scan', ({ p, u0, v0, eps, tMax }) => {
    const dt = tMax / 20000;
    const scanned = scannedSettling(p, u0, v0, eps, tMax, dt);
    const settled = settlingTime(p, u0, v0, eps);
    expect(settled).toBeGreaterThanOrEqual(scanned);
    expect(settled).toBeLessThan(scanned + dt);
    expect(Math.abs(springState(p, u0, v0, settled).u)).toBeCloseTo(eps * Math.abs(u0), 9);
  });

  test('is 0 for a spring already at rest on its target', () =>
    expect(settlingTime(unitSpring(0.5), 0, 0, 0.02)).toBe(0));

  test('needs an initial offset to scale ε, and ε strictly between 0 and 1', () => {
    expect(() => settlingTime(unitSpring(0.5), 0, 2, 0.02)).toThrow(RangeError);
    expect(() => settlingTime(unitSpring(0.5), -1, 0, 0)).toThrow(RangeError);
    expect(() => settlingTime(unitSpring(0.5), -1, 0, 1)).toThrow(RangeError);
    expect(() => settlingTime(unitSpring(0.5), -1, Number.NaN, 0.02)).toThrow(RangeError);
  });
});

describe('dampedSpring: perceptual parameters, rest and validation', () => {
  test('(10.10) keeps ζ = 1 − β and ω₀ = 2π/d for any mass', () => {
    const p = fromPerceptual(0.5, 0.3, 2);
    expect(p.m).toBe(2);
    expect(p.k).toBeCloseTo(2 * 157.9137, 3);
    expect(dampingRatio(p)).toBeCloseTo(0.7, 12);
    expect(naturalAngularFrequency(p)).toBeCloseTo(4 * Math.PI, 12);
    expect(dampingRegime(fromPerceptual(0.5, 0))).toBe('critico');
    expect(dampingRegime(fromPerceptual(0.5, 1))).toBe('sin-amortiguar');
  });

  test('fromPerceptual rejects a bounce outside 0–1 and a non-positive duration or mass', () => {
    expect(() => fromPerceptual(0.5, -0.1)).toThrow(RangeError);
    expect(() => fromPerceptual(0.5, 1.1)).toThrow(RangeError);
    expect(() => fromPerceptual(0.5, Number.NaN)).toThrow(RangeError);
    expect(() => fromPerceptual(0, 0.3)).toThrow(RangeError);
    expect(() => fromPerceptual(0.5, 0.3, 0)).toThrow(RangeError);
  });

  test('(10.11) the rest test is inclusive, as Motion’s', () => {
    expect(isSpringAtRest(0.5, -2, 0.5, 2)).toBe(true);
    expect(isSpringAtRest(-0.1, 1.5, 0.5, 2)).toBe(true);
    expect(isSpringAtRest(0.51, 0, 0.5, 2)).toBe(false);
    expect(isSpringAtRest(0, 2.01, 0.5, 2)).toBe(false);
    expect(() => isSpringAtRest(0, 0, 0, 2)).toThrow(RangeError);
    expect(() => isSpringAtRest(Number.NaN, 0, 0.5, 2)).toThrow(RangeError);
  });

  test('rejects a non-positive k or m, a negative b, a negative t and a non-finite state', () => {
    expect(() => dampingRatio({ k: 0, b: 1, m: 1 })).toThrow(RangeError);
    expect(() => naturalAngularFrequency({ k: 1, b: 1, m: 0 })).toThrow(RangeError);
    expect(() => dampingRegime({ k: 1, b: -1, m: 1 })).toThrow(RangeError);
    expect(() => springState(unitSpring(0.5), -1, 0, -0.1)).toThrow(RangeError);
    expect(() => springState(unitSpring(0.5), Number.POSITIVE_INFINITY, 0, 1)).toThrow(RangeError);
    expect(() => overshootRatio(-0.1)).toThrow(RangeError);
  });
});
