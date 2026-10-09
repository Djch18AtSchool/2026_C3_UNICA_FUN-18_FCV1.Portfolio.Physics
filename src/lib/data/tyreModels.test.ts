import { describe, expect, test } from 'vitest';
import { gripVsTemperature, maxLateralForce } from '../physics';
import {
  LOAD_MODEL,
  TEMPERATURE_MODEL,
  WORKING_WINDOW,
  loadSeries,
  temperatureSeries,
} from './tyreModels';

/** Isola's convention: the operating range is where grip stays within 3 % of its peak. */
const ISOLA_FRACTION = 0.97;

describe('TEMPERATURE_MODEL', () => {
  test('puts the optimum at the centre of the C3 window', () => {
    const { from, to } = WORKING_WINDOW.values;

    expect(TEMPERATURE_MODEL.values.tOpt).toBe((from + to) / 2);
  });

  test('gives 97 % of peak grip at both edges of the working window', () => {
    const model = TEMPERATURE_MODEL.values;
    const { from, to } = WORKING_WINDOW.values;

    expect(gripVsTemperature(model, from)).toBeCloseTo(ISOLA_FRACTION * model.muPeak, 6);
    expect(gripVsTemperature(model, to)).toBeCloseTo(ISOLA_FRACTION * model.muPeak, 6);
  });

  test('is illustrative, while the working window is a published value', () => {
    expect(TEMPERATURE_MODEL.illustrative).toBe(true);
    expect(WORKING_WINDOW.illustrative).toBe(false);
    expect(WORKING_WINDOW.values).toEqual({ from: 105, to: 135 });
  });
});

describe('temperatureSeries', () => {
  test('samples 40–160 °C every 2 °C in 61 points', () => {
    const series = temperatureSeries(40, 160, 2);

    expect(series).toHaveLength(61);
    expect(series[0].t).toBe(40);
    expect(series[60].t).toBe(160);
  });

  test('peaks exactly at the optimum temperature', () => {
    const series = temperatureSeries(40, 160, 2);

    const peak = series.reduce((best, row) => (row.mu > best.mu ? row : best));

    expect(peak.t).toBe(TEMPERATURE_MODEL.values.tOpt);
    expect(peak.mu).toBeCloseTo(TEMPERATURE_MODEL.values.muPeak, 10);
  });

  test('rejects a step that is not positive', () => {
    expect(() => temperatureSeries(40, 160, 0)).toThrow(RangeError);
  });

  test('rejects a range that runs backwards', () => {
    expect(() => temperatureSeries(160, 40, 2)).toThrow(RangeError);
  });
});

describe('LOAD_MODEL', () => {
  test('is the illustrative power law μ0 = 1,6, F_z0 = 4 000 N, n = 0,9', () => {
    expect(LOAD_MODEL.values).toEqual({ mu0: 1.6, fz0: 4000, exponent: 0.9 });
    expect(LOAD_MODEL.illustrative).toBe(true);
  });
});

describe('loadSeries', () => {
  const series = loadSeries(0, 10000, 250);
  const { fz0 } = LOAD_MODEL.values;

  test('samples 0–10 000 N every 250 N in 41 points', () => {
    expect(series).toHaveLength(41);
    expect(series[0].fz).toBe(0);
    expect(series[40].fz).toBe(10000);
  });

  test('starts both models at the origin', () => {
    expect(series[0].linear).toBe(0);
    expect(series[0].real).toBe(0);
  });

  test('the load-sensitive force always increases with load', () => {
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i].real).toBeGreaterThan(series[i - 1].real);
    }
  });

  test('falls below the linear model above the reference load', () => {
    const above = series.filter((row) => row.fz > fz0);

    expect(above.length).toBeGreaterThan(0);
    for (const row of above) expect(row.real).toBeLessThan(row.linear);
  });

  test('stays above the linear model between zero and the reference load', () => {
    const below = series.filter((row) => row.fz > 0 && row.fz < fz0);

    expect(below.length).toBeGreaterThan(0);
    for (const row of below) expect(row.real).toBeGreaterThan(row.linear);
  });

  test('both models agree at the reference load: 6 400 N at 4 000 N', () => {
    const atReference = series.find((row) => row.fz === fz0);

    expect(atReference?.linear).toBeCloseTo(6400, 6);
    expect(atReference?.real).toBeCloseTo(6400, 6);
    expect(atReference?.muEff).toBeCloseTo(1.6, 10);
  });

  test('gives 11 943 N at 8 000 N, from F = μ0 F_z0 (F_z/F_z0)^n', () => {
    const atDouble = series.find((row) => row.fz === 8000);
    const { mu0, exponent } = LOAD_MODEL.values;

    expect(atDouble?.real).toBeCloseTo(maxLateralForce(mu0, 8000, fz0, exponent), 10);
    expect(atDouble?.real).toBeCloseTo(11942.9, 0);
  });

  test('the effective μ is the force divided by the load', () => {
    for (const row of series.slice(1)) expect(row.muEff).toBeCloseTo(row.real / row.fz, 10);
  });

  test('leaves the effective μ undefined at zero load', () => {
    expect(Number.isNaN(series[0].muEff)).toBe(true);
  });

  test('rejects a negative vertical load', () => {
    expect(() => loadSeries(-250, 1000, 250)).toThrow(RangeError);
  });
});

describe('sourceLabel', () => {
  test.each([
    ['TEMPERATURE_MODEL', TEMPERATURE_MODEL],
    ['WORKING_WINDOW', WORKING_WINDOW],
    ['LOAD_MODEL', LOAD_MODEL],
  ] as const)('%s names its source', (_name, params) => {
    expect(params.sourceLabel.trim()).not.toBe('');
  });

  test('the working window says it is the 2019 13-inch C3', () => {
    expect(WORKING_WINDOW.sourceLabel).toMatch(/Autosport/);
    expect(WORKING_WINDOW.sourceLabel).toMatch(/C3/);
    expect(WORKING_WINDOW.sourceLabel).toMatch(/2019/);
    expect(WORKING_WINDOW.sourceLabel).toMatch(/13 pulgadas/);
  });

  test('the illustrative models say so', () => {
    expect(TEMPERATURE_MODEL.sourceLabel).toMatch(/ilustrativ/);
    expect(LOAD_MODEL.sourceLabel).toMatch(/parámetros ilustrativos/);
  });
});
