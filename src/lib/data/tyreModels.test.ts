import { describe, expect, test } from 'vitest';
import { gripVsTemperature, maxLateralForce } from '../physics';
import {
  COMPOUND_WINDOWS,
  LOAD_MODEL,
  PACEJKA_EXAMPLE,
  TEMPERATURE_MODEL,
  WORKING_WINDOW,
  gripFactor,
  loadPoint,
  loadSeries,
  pacejkaSeries,
  temperatureModelFor,
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

describe('COMPOUND_WINDOWS', () => {
  test('C4 runs from 90 to 120 °C, cited from the 2019 Autosport table', () => {
    const { C4 } = COMPOUND_WINDOWS;

    expect(C4.values).toEqual({ from: 90, to: 120 });
    expect(C4.illustrative).toBe(false);
    expect(C4.sourceLabel).toMatch(/Autosport/);
    expect(C4.sourceLabel).toMatch(/C4/);
    expect(C4.sourceLabel).toMatch(/2019/);
    expect(C4.sourceLabel).toMatch(/13 pulgadas/);
  });

  test('C3 is the v1 working window, 105–135 °C', () => {
    expect(COMPOUND_WINDOWS.C3).toBe(WORKING_WINDOW);
    expect(COMPOUND_WINDOWS.C3.values).toEqual({ from: 105, to: 135 });
  });
});

describe('temperatureModelFor', () => {
  test('C3 is the v1 temperature model', () => {
    expect(temperatureModelFor('C3')).toEqual(TEMPERATURE_MODEL.values);
  });

  test('C4 centres the optimum at 105 °C with the same 60,8 °C width', () => {
    const model = temperatureModelFor('C4');

    expect(model.tOpt).toBe(105);
    expect(model.widthBelow).toBeCloseTo(60.8, 1);
    expect(model.widthAbove).toBe(model.widthBelow);
    expect(model.muPeak).toBe(TEMPERATURE_MODEL.values.muPeak);
  });

  test('C4 gives 97 % of peak grip at 90 and 120 °C', () => {
    const model = temperatureModelFor('C4');

    expect(gripVsTemperature(model, 90)).toBeCloseTo(ISOLA_FRACTION * model.muPeak, 6);
    expect(gripVsTemperature(model, 120)).toBeCloseTo(ISOLA_FRACTION * model.muPeak, 6);
  });
});

describe('gripFactor', () => {
  test('is 1 at the optimum of each compound', () => {
    expect(gripFactor('C3', 120)).toBeCloseTo(1, 12);
    expect(gripFactor('C4', 105)).toBeCloseTo(1, 12);
  });

  test('is 0,97 at the window edges and μ(T)/μ_pico elsewhere', () => {
    expect(gripFactor('C3', 135)).toBeCloseTo(ISOLA_FRACTION, 6);
    expect(gripFactor('C3', 60)).toBeCloseTo(1.11 / 1.8, 2);
  });
});

describe('temperatureSeries', () => {
  test('follows the chosen compound', () => {
    const series = temperatureSeries(40, 160, 5, 'C4');

    const peak = series.reduce((best, row) => (row.mu > best.mu ? row : best));

    expect(peak.t).toBe(105);
  });

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
  test('is the illustrative power law μ0 = 1,6, F_z0 = 4 000 N, β = 0,9', () => {
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

describe('loadPoint', () => {
  test('gives the v1 numbers at 8 000 N: 12 800 N linear, 11 943 N real, μ 1,49', () => {
    const point = loadPoint(8000);

    expect(point.linear).toBeCloseTo(12800, 6);
    expect(point.real).toBeCloseTo(11942.9, 0);
    expect(point.muEff).toBeCloseTo(1.49, 2);
  });

  test('scales both forces by the grip factor, leaving the crossing at F_z0', () => {
    const point = loadPoint(4000, 0.5);

    expect(point.linear).toBeCloseTo(3200, 6);
    expect(point.real).toBeCloseTo(3200, 6);
    expect(point.muEff).toBeCloseTo(0.8, 10);
  });

  test('leaves the effective μ undefined at zero load', () => {
    const point = loadPoint(0);

    expect(point).toMatchObject({ linear: 0, real: 0 });
    expect(Number.isNaN(point.muEff)).toBe(true);
  });

  test('rejects a negative load or a grip factor that is not positive', () => {
    expect(() => loadPoint(-1)).toThrow(RangeError);
    expect(() => loadPoint(1000, 0)).toThrow(RangeError);
    expect(() => loadPoint(1000, Number.NaN)).toThrow(RangeError);
  });

  test('loadSeries passes the grip factor on', () => {
    const scaled = loadSeries(0, 8000, 4000, 0.5);

    expect(scaled[2].real).toBeCloseTo(loadPoint(8000).real / 2, 6);
  });
});

describe('sourceLabel', () => {
  test.each([
    ['TEMPERATURE_MODEL', TEMPERATURE_MODEL],
    ['WORKING_WINDOW', WORKING_WINDOW],
    ['COMPOUND_WINDOWS.C4', COMPOUND_WINDOWS.C4],
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

describe('PACEJKA_EXAMPLE', () => {
  test("carries Edy's example constants, marked illustrative", () => {
    expect(PACEJKA_EXAMPLE.values).toEqual({ B: 10, C: 1.9, D: 1, E: 0.97 });
    expect(PACEJKA_EXAMPLE.illustrative).toBe(true);
    expect(PACEJKA_EXAMPLE.sourceLabel).toMatch(/Edy/);
  });

  test('its curve is 0 at x = 0 and 0,91 at x = 1, as the text states', () => {
    const rows = pacejkaSeries(1, 0.01);

    expect(rows[0]).toEqual({ x: 0, y: 0 });
    expect(rows.at(-1)?.x).toBeCloseTo(1, 12);
    expect(rows.at(-1)?.y).toBeCloseTo(0.91, 2);
    expect(rows).toHaveLength(101);
  });
});
