import { describe, expect, test } from 'vitest';
import {
  accelerationLine,
  COMFORT,
  CONFORT_POINTS,
  RADIUS_POINTS,
  spinForOneG,
} from './habitatFigures';

describe('habitatFigures', () => {
  test('a_c/g grows in proportion to r and crosses 1 g at r = g/ω²', () => {
    const line = accelerationLine(2, 1000);

    expect(line[0]).toEqual({ x: 0, y: 0 });
    expect(line[1].x).toBe(1000);
    expect(line[1].y).toBeCloseTo(1000 / 223.64, 3);
  });

  test('step 2 marks 223,6 m at 2 rpm, 894,6 m at 1 rpm and the Stanford torus at 0,93 g', () => {
    const byId = Object.fromEntries(RADIUS_POINTS.map((point) => [point.id, point]));

    expect(byId['dos-rpm']).toMatchObject({ x: 223.6, y: 1, label: '2 RPM: 223,6 m' });
    expect(byId['una-rpm']).toMatchObject({ x: 894.6, y: 1, label: '1 RPM: 894,6 m' });
    expect(byId['toro']).toMatchObject({ x: 830, label: 'Toro de Stanford: 0,93 g' });
    expect(byId['toro'].y).toBeCloseTo(0.928, 3);
  });

  test('the spin for 1 g falls as 1/√r from 5 m', () => {
    const curve = spinForOneG(5, 250);

    expect(curve[0].x).toBe(5);
    expect(curve[0].y).toBeCloseTo(13.38, 2);
    expect(curve.at(-1)?.x).toBe(250);
    for (let i = 1; i < curve.length; i++) expect(curve[i].y).toBeLessThan(curve[i - 1].y);
  });

  test('step 3 points carry the spin and the head-to-feet gradient of v1', () => {
    expect(CONFORT_POINTS.map((point) => point.label)).toEqual([
      '10 m: 9,46 RPM, 18 %',
      '100 m: 2,99 RPM, 1,8 %',
      '223,6 m: 2 RPM, 0,8 %',
    ]);
    expect(CONFORT_POINTS[0].y).toBeCloseTo(9.46, 2);
  });

  test('the comfort limits are the ranges SpinCalc collects', () => {
    expect(COMFORT).toEqual({ rpmMax: [3, 6], rMin: [4, 12], vMin: [6, 10] });
  });
});
