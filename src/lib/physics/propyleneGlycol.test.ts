import { describe, expect, test } from 'vitest';
import { propyleneGlycolWater, volumeToMassFraction } from './propyleneGlycol';

/*
 * Melinder (2010) as coded in Modelica Buildings v14.0.0; reference values from
 * docs/superpowers/research/2026-11-17-enfriamiento-liquido.md, §5.1 (prototype pg_props.py).
 */

describe('propylene glycol–water (Melinder 2010, as coded in Modelica Buildings v14.0.0)', () => {
  test('25 % by volume is a mass fraction of 0,2601 at 20 °C', () => {
    expect(volumeToMassFraction(0.25, 20)).toBeCloseTo(0.2601, 4);
  });

  test('PG25 at 40 °C: ρ = 1010,6 kg/m³ and μ = 1,394 mPa·s (research §5.1)', () => {
    const pg25 = propyleneGlycolWater(0.25, 40);

    expect(pg25.rho).toBeCloseTo(1010.6, 1);
    expect(pg25.mu * 1e3).toBeCloseTo(1.394, 3);
  });

  test('the viscosity falls from 2,541 to 1,102 mPa·s between 20 and 50 °C (×2,3)', () => {
    const cold = propyleneGlycolWater(0.25, 20).mu;
    const hot = propyleneGlycolWater(0.25, 50).mu;

    expect(cold * 1e3).toBeCloseTo(2.541, 3);
    expect(hot * 1e3).toBeCloseTo(1.102, 3);
    expect(cold / hot).toBeCloseTo(2.3, 1);
  });

  test('with no glycol it reproduces water at 30 °C (NIST: 995,74 kg/m³, 0,797 22 mPa·s) within 0,03 %', () => {
    const water = propyleneGlycolWater(0, 30);

    expect(Math.abs(water.rho / 995.74 - 1)).toBeLessThan(3e-4);
    expect(water.mu * 1e3).toBeCloseTo(0.7967, 4);
  });

  test('rejects a mixture beyond Melinder’s fit (60 % by mass), a negative fraction and a non-finite temperature', () => {
    expect(() => propyleneGlycolWater(0.7, 40)).toThrow(RangeError);
    expect(() => propyleneGlycolWater(-0.1, 40)).toThrow(RangeError);
    expect(() => propyleneGlycolWater(0.25, Number.NaN)).toThrow(RangeError);
  });
});
