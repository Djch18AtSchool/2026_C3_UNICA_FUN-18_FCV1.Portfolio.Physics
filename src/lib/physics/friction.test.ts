import { describe, expect, test } from 'vitest';
import {
  gripVsTemperature,
  kineticFriction,
  loadSensitiveMu,
  magicFormula,
  maxLateralForce,
  maxStaticFriction,
  normalOnIncline,
} from './friction';

describe('Coulomb friction', () => {
  test('static and kinetic friction are μ N', () => {
    expect(maxStaticFriction(0.4, 98)).toBeCloseTo(39.2, 6);
    expect(kineticFriction(0.3, 98)).toBeCloseTo(29.4, 6);
  });

  test('normal force on an incline is m g cos θ', () => {
    expect(normalOnIncline(10, 9.81, Math.PI / 6)).toBeCloseTo(84.96, 2);
  });
});

describe('tyre load sensitivity', () => {
  test('μ drops as vertical load grows', () => {
    expect(loadSensitiveMu(1.5, 8000, 4000, 0.9)).toBeCloseTo(1.3995, 3);
  });

  test('lateral force grows less than proportionally with load', () => {
    expect(maxLateralForce(1.5, 4000, 4000, 0.9)).toBeCloseTo(6000, 6);
    expect(maxLateralForce(1.5, 8000, 4000, 0.9)).toBeLessThan(12000);
  });

  test('rejects non-positive loads', () => {
    expect(() => loadSensitiveMu(1.5, 4000, 0, 0.9)).toThrow(RangeError);
    expect(() => loadSensitiveMu(1.5, 0, 4000, 0.9)).toThrow(RangeError);
  });
});

describe('grip temperature window', () => {
  const m = { muPeak: 1.8, tOpt: 100, widthBelow: 20, widthAbove: 15 };

  test('peaks at the optimum and falls with asymmetric widths', () => {
    expect(gripVsTemperature(m, 100)).toBe(1.8);
    expect(gripVsTemperature(m, 80)).toBeCloseTo(1.8 * Math.exp(-0.5), 6);
    expect(gripVsTemperature(m, 115)).toBeCloseTo(1.8 * Math.exp(-0.5), 6);
  });

  test('rejects a non-positive width', () => {
    expect(() => gripVsTemperature({ ...m, widthAbove: 0 }, 120)).toThrow(RangeError);
  });
});

describe('Pacejka magic formula', () => {
  const c = { B: 10, C: 1.9, D: 1, E: 0.97 };

  test('is zero at zero slip, odd, and bounded by D', () => {
    expect(magicFormula(0, c)).toBe(0);
    expect(magicFormula(-0.1, c)).toBeCloseTo(-magicFormula(0.1, c), 12);
    expect(Math.abs(magicFormula(5, c))).toBeLessThanOrEqual(1);
  });
});
