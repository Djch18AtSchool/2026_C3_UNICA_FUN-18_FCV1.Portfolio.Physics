import { describe, expect, test } from 'vitest';
import {
  bounceSeries,
  bouncesAboveThreshold,
  collide1D,
  G_EARTH,
  idealBallAt,
} from '../../../lib/physics';
import {
  apexPoints,
  bounceTrajectory,
  COLLISION_CASE,
  collisionRows,
  heightSeries,
  ITF_DROP,
  thresholdCase,
  THRESHOLD_CASES,
  UMBRAL_DROP,
} from './bounceFigures';

describe('Paso 1: the ITF tennis ball', () => {
  test('drops from the ITF test height with the centre of the ITF e range, 0,745', () => {
    expect(ITF_DROP.h0).toBe(2.54);
    expect(ITF_DROP.e).toBe(0.745);
    expect(ITF_DROP.reboundMin).toBe(1.35);
    expect(ITF_DROP.reboundMax).toBe(1.47);
  });

  test('the trajectory is the kernel ideal ball, sampled with every impact at y = 0', () => {
    // Arrange
    const flights = 6;
    const series = bounceSeries(2.54, 0.745, G_EARTH, flights);
    const impacts = series.flightTimes.map((_, n) =>
      series.flightTimes.slice(0, n + 1).reduce((sum, time) => sum + time, 0),
    );

    // Act
    const points = bounceTrajectory(2.54, 0.745, G_EARTH, flights, 10);

    // Assert
    expect(points[0]).toEqual({ x: 0, y: 2.54 });
    for (const point of points) {
      expect(point.y).toBeCloseTo(idealBallAt(point.x, 2.54, 0.745, G_EARTH).y, 12);
      expect(point.y).toBeGreaterThanOrEqual(0);
    }
    for (const time of impacts) {
      const impact = points.find((point) => Math.abs(point.x - time) < 1e-12);
      expect(impact?.y ?? NaN).toBeCloseTo(0, 9);
    }
    expect(points.at(-1)?.x).toBeCloseTo(impacts.at(-1) ?? NaN, 12);
  });

  test('apexes follow hₙ = e²ⁿ h₀ at the middle of each flight', () => {
    const apexes = apexPoints(2.54, 0.745, G_EARTH, 4);

    expect(apexes.map((apex) => apex.n)).toEqual([0, 1, 2, 3]);
    expect(apexes[0]).toMatchObject({ t: 0, h: 2.54 });
    expect(apexes[1].h).toBeCloseTo(0.745 ** 2 * 2.54, 12);
    expect(apexes[3].h).toBeCloseTo(0.745 ** 6 * 2.54, 12);
    for (const apex of apexes.slice(1)) {
      expect(idealBallAt(apex.t, 2.54, 0.745, G_EARTH).y).toBeCloseTo(apex.h, 12);
      expect(idealBallAt(apex.t, 2.54, 0.745, G_EARTH).v).toBeCloseTo(0, 9);
    }
    expect(apexes.map((apex) => apex.label)).toEqual([
      'h₀ = 2,54 m',
      'h₁ = 1,41 m',
      'h₂ = 0,78 m',
      'h₃ = 0,43 m',
    ]);
    expect(apexes[1].shortLabel).toBe('h₁ = 1,41');
  });

  test('labels two-digit indices with two subscripts', () => {
    expect(apexPoints(1, 0.9, G_EARTH, 13)[12].label).toBe('h₁₂ = 0,08 m');
  });

  test('the first rebound, 1,41 m, falls inside the band the ITF admits', () => {
    const [, first] = apexPoints(ITF_DROP.h0, ITF_DROP.e, G_EARTH, 2);

    expect(first.h).toBeGreaterThan(ITF_DROP.reboundMin);
    expect(first.h).toBeLessThan(ITF_DROP.reboundMax);
  });
});

describe('Paso 2: the class collision for e = 0, 0,75 and 1', () => {
  test('uses the class example: 2 kg at +3 m/s against 1 kg at rest', () => {
    expect(COLLISION_CASE).toEqual({ m1: 2, v1: 3, m2: 1, v2: 0 });
  });

  test('before: p = 6 kg·m/s and K = 9 J, of which 6 J belong to the centre of mass', () => {
    const { before } = collisionRows();

    expect(before).toMatchObject({ v1: 3, v2: 0, p1: 6, p2: 0, momentum: 6, kinetic: 9 });
    expect(before.kineticCM).toBeCloseTo(6, 12);
    expect(before.kineticRel).toBeCloseTo(3, 12);
  });

  test('after: the kernel velocities, the same momentum and a K that shrinks as e falls', () => {
    const { before, after } = collisionRows();

    expect(after.map((row) => row.e)).toEqual([0, 0.75, 1]);
    for (const row of after) {
      const kernel = collide1D(2, 3, 1, 0, row.e);
      expect(row.v1).toBeCloseTo(kernel.v1, 12);
      expect(row.v2).toBeCloseTo(kernel.v2, 12);
      expect(row.momentum).toBeCloseTo(before.momentum, 12);
      expect(row.p1 + row.p2).toBeCloseTo(before.momentum, 12);
      expect(row.kineticLoss).toBeCloseTo(kernel.kineticLoss, 12);
      expect(before.kinetic - row.kinetic).toBeCloseTo(kernel.kineticLoss, 12);
      expect(row.kineticCM).toBeCloseTo(before.kineticCM, 12);
      expect(row.kineticRel).toBeCloseTo(row.e ** 2 * before.kineticRel, 12);
    }
    expect(after.map((row) => [row.v1, row.v2])).toEqual([
      [2, 2],
      [1.25, 3.5],
      [1, 4],
    ]);
    expect(after.map((row) => row.kinetic)).toEqual([6, 7.6875, 9]);
  });
});

describe('Paso 3: hₙ against n with and without a threshold', () => {
  test('drops the e = 0,9 ball of the research example from 1 m', () => {
    expect(UMBRAL_DROP).toEqual({ h0: 1, e: 0.9, count: 31 });
  });

  test('the ideal series is the kernel hₙ in centimetres, n = 0 to 30', () => {
    const points = heightSeries(1, 0.9, G_EARTH, 31);
    const kernel = bounceSeries(1, 0.9, G_EARTH, 31).heights;

    expect(points).toHaveLength(31);
    points.forEach((point, n) => {
      expect(point.x).toBe(n);
      expect(point.y).toBeCloseTo(kernel[n] * 100, 10);
    });
  });

  test('2 m/s (Unity 3D): 8 rebounds, the last one 18,5 cm, under its 20,4 cm line', () => {
    const unity = thresholdCase(1, 0.9, G_EARTH, 2);
    const v0 = bounceSeries(1, 0.9, G_EARTH, 1).impactSpeeds[0];

    expect(unity.bounces).toBe(bouncesAboveThreshold(v0, 0.9, 2));
    expect(unity.bounces).toBe(8);
    expect(unity.lastHeight).toBeCloseTo(18.53, 2);
    expect(unity.thresholdHeight).toBeCloseTo(20.39, 2);
    expect(unity.points).toHaveLength(9);
    expect(unity.points.at(-1)).toEqual({ x: 8, y: unity.lastHeight });
  });

  test('1 m/s (Box2D v3): 15 rebounds, the last one 4,2 cm, under its 5,1 cm line', () => {
    const box2d = thresholdCase(1, 0.9, G_EARTH, 1);

    expect(box2d.bounces).toBe(15);
    expect(box2d.lastHeight).toBeCloseTo(4.24, 2);
    expect(box2d.thresholdHeight).toBeCloseTo(5.1, 2);
  });

  test('the figure cases read their thresholds from the engine table', () => {
    expect(THRESHOLD_CASES.map((item) => [item.id, item.engine, item.vth])).toEqual([
      ['box2d', 'Box2D v3', 1],
      ['unity', 'Unity 3D', 2],
    ]);
    expect(THRESHOLD_CASES.map((item) => item.legend)).toEqual([
      'Umbral de 1 m/s (Box2D v3): 15 rebotes, el último de 4,2 cm',
      'Umbral de 2 m/s (Unity 3D): 8 rebotes, el último de 18,5 cm',
    ]);
  });

  test('a ball at or below the threshold never bounces, and e = 0 never does either', () => {
    expect(thresholdCase(0.1, 0.9, G_EARTH, 2)).toMatchObject({ bounces: 0, lastHeight: 10 });
    expect(thresholdCase(1, 0, G_EARTH, 1)).toMatchObject({ bounces: 0, lastHeight: 100 });
  });

  test('a series that never drops below the threshold (e = 1, or v_th = 0) is refused', () => {
    expect(() => thresholdCase(1, 1, G_EARTH, 1)).toThrow(RangeError);
    expect(() => thresholdCase(1, 0.9, G_EARTH, 0)).toThrow('la serie no se corta');
  });
});
