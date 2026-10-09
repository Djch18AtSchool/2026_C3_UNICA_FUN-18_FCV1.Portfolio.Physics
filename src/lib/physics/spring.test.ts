import { describe, expect, test } from 'vitest';
import {
  criticalDamping,
  dampedSpringStep,
  elasticEnergy,
  forceCurve,
  hookeForce,
  isAtRest,
  piecewiseResistance,
  type OscillatorParams,
  type OscillatorState,
} from './spring';

describe('spring', () => {
  test('Hooke force opposes the displacement', () => {
    expect(hookeForce(150, -0.08)).toBeCloseTo(12, 6);
  });

  test('elastic energy is k x²/2', () => {
    expect(elasticEnergy(150, -0.08)).toBeCloseTo(0.48, 6);
  });

  test('piecewise resistance is zero before the start point and linear after it', () => {
    expect(piecewiseResistance(0.002, 0.003, 400)).toBe(0);
    expect(piecewiseResistance(0.005, 0.003, 400)).toBeCloseTo(0.8, 6);
  });

  test('forceCurve samples steps + 1 points from 0 to xMax', () => {
    const curve = forceCurve((x) => 2 * x, 1, 4);
    expect(curve).toHaveLength(5);
    expect(curve[0]).toEqual({ x: 0, f: 0 });
    expect(curve.at(-1)).toEqual({ x: 1, f: 2 });
  });

  test('forceCurve rejects a non-positive or non-integer step count', () => {
    expect(() => forceCurve((x) => x, 1, 0)).toThrow(RangeError);
    expect(() => forceCurve((x) => x, 1, 2.5)).toThrow(RangeError);
  });
});

describe('damped oscillator', () => {
  const K = 400;
  const M = 0.02;

  function energy(s: OscillatorState): number {
    return (K * s.x * s.x) / 2 + (M * s.v * s.v) / 2;
  }

  function signChanges(xs: number[]): number {
    const signs = xs.map(Math.sign).filter((sign) => sign !== 0);
    return signs.slice(1).filter((sign, i) => sign !== signs[i]).length;
  }

  test('criticalDamping is 2√(k m)', () => {
    expect(criticalDamping(K, M)).toBeCloseTo(5.657, 3);
  });

  test('critically damped trigger settles within 0.5 s and crosses zero at most once', () => {
    const p: OscillatorParams = { k: K, m: M, c: criticalDamping(K, M) };
    const dt = 1 / 1000;
    const steps = Math.round(0.5 / dt);
    const xs: number[] = [];
    let s: OscillatorState = { x: 0.008, v: 0 };
    for (let i = 0; i < steps; i++) {
      s = dampedSpringStep(s, p, dt);
      xs.push(s.x);
    }
    expect(isAtRest(s)).toBe(true);
    expect(signChanges(xs)).toBeLessThanOrEqual(1);
  });

  // Semi-implicit Euler's energy error is bounded by ≈ ω·dt/2 = √(k/m)·dt/2 ≈ 1.77 % here, hence 2 %.
  test('undamped oscillator keeps its energy within 2 % for 1 s', () => {
    const p: OscillatorParams = { k: K, m: M, c: 0 };
    const dt = 1 / 4000;
    const steps = Math.round(1 / dt);
    const initial: OscillatorState = { x: 0.008, v: 0 };
    const e0 = energy(initial);
    let s = initial;
    let maxDeviation = 0;
    for (let i = 0; i < steps; i++) {
      s = dampedSpringStep(s, p, dt);
      maxDeviation = Math.max(maxDeviation, Math.abs(energy(s) - e0) / e0);
    }
    expect(maxDeviation).toBeLessThan(0.02);
  });

  test('step is semi-implicit: v first, then x with the new v', () => {
    const next = dampedSpringStep({ x: 0.01, v: 0.5 }, { k: 400, m: 0.02, c: 1 }, 0.001);
    const v = 0.5 + ((-400 * 0.01 - 1 * 0.5) / 0.02) * 0.001;
    expect(next.v).toBeCloseTo(v, 12);
    expect(next.x).toBeCloseTo(0.01 + v * 0.001, 12);
  });

  test('step returns a new object and leaves the input untouched', () => {
    const s = Object.freeze({ x: 0.01, v: 0 });
    const next = dampedSpringStep(s, { k: 400, m: 0.02, c: 1 }, 0.001);
    expect(next).not.toBe(s);
    expect(s).toEqual({ x: 0.01, v: 0 });
  });

  test('rejects m ≤ 0, dt ≤ 0, k < 0 or c < 0', () => {
    expect(() => dampedSpringStep({ x: 0, v: 0 }, { k: 400, m: 0, c: 1 }, 0.01)).toThrow(
      RangeError,
    );
    expect(() => dampedSpringStep({ x: 0, v: 0 }, { k: 400, m: 1, c: 1 }, 0)).toThrow(RangeError);
    expect(() => dampedSpringStep({ x: 0, v: 0 }, { k: -1, m: 1, c: 1 }, 0.01)).toThrow(RangeError);
    expect(() => dampedSpringStep({ x: 0, v: 0 }, { k: 400, m: 1, c: -1 }, 0.01)).toThrow(
      RangeError,
    );
    expect(() => criticalDamping(-1, 1)).toThrow(RangeError);
    expect(() => criticalDamping(1, 0)).toThrow(RangeError);
  });

  test('isAtRest uses 1e-4 m and 1e-3 m/s by default and accepts custom tolerances', () => {
    expect(isAtRest({ x: 5e-5, v: 5e-4 })).toBe(true);
    expect(isAtRest({ x: 2e-4, v: 0 })).toBe(false);
    expect(isAtRest({ x: 0, v: 2e-3 })).toBe(false);
    expect(isAtRest({ x: 2e-4, v: 0 }, { x: 1e-3, v: 1e-3 })).toBe(true);
  });

  test('isAtRest rejects tolerances that are not finite and > 0', () => {
    const s = { x: 0, v: 0 };
    expect(() => isAtRest(s, { x: 0, v: 1e-3 })).toThrow(RangeError);
    expect(() => isAtRest(s, { x: 1e-4, v: -1 })).toThrow(RangeError);
    expect(() => isAtRest(s, { x: Number.POSITIVE_INFINITY, v: 1e-3 })).toThrow(RangeError);
    expect(() => isAtRest(s, { x: 1e-4, v: Number.NaN })).toThrow(RangeError);
  });
});
