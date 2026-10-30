import { describe, expect, test } from 'vitest';
import { G_EARTH, idealBallAt } from '../../../lib/physics';
import { BOUNCE_DEFAULTS, presetById, type BounceSettings } from './bouncePresets';
import {
  buildBounceModel,
  decimateMinMax,
  energyGains,
  engineFrameAt,
  engineSeries,
  h0KeyTarget,
  idealEnergyAt,
  idealImpacts,
  idealSeries,
  idealStateAt,
  idealTotalTime,
  MAX_TIMELINE_S,
  measuredRestitution,
  pairRestitution,
  sceneTop,
  simulateEngine,
  thresholdPrediction,
  timelineDuration,
  viewY,
} from './bounceScene';

const g = G_EARTH;
const settings = (overrides: Partial<BounceSettings>): BounceSettings => ({
  ...BOUNCE_DEFAULTS,
  ...overrides,
});

describe('pairRestitution', () => {
  test('mixes the ball and the floor with the engine rule', () => {
    expect(pairRestitution(settings({ e: 0.85, floorE: 0.5, combine: 'max' }))).toBe(0.85);
    expect(pairRestitution(settings({ e: 0.85, floorE: 0.5, combine: 'average' }))).toBeCloseTo(
      0.675,
      10,
    );
    expect(pairRestitution(settings({ e: 0.85, floorE: 0.5, combine: 'sumClamped' }))).toBe(1);
  });
});

describe('idealImpacts and idealTotalTime', () => {
  test('each impact is where idealBallAt touches the floor, and the count matches its bounces', () => {
    const impacts = idealImpacts(1, 0.75, g, 3);

    for (const [index, impact] of impacts.entries()) {
      expect(idealBallAt(impact.t, 1, 0.75, g).y).toBeCloseTo(0, 9);
      const after = idealBallAt(impact.t + 1e-6, 1, 0.75, g);
      expect(after.bounces).toBe(index + 1);
      expect(impact.vOut).toBeCloseTo(0.75 * impact.vIn, 12);
    }
    expect(impacts[0].t).toBeCloseTo(Math.sqrt(2 / g), 12);
  });

  test('T = t₀(1+e)/(1−e) for constant e, Infinity from e = 1, t₀ for e = 0', () => {
    const t0 = Math.sqrt(2 / g);
    expect(idealTotalTime(1, 0.9, g)).toBeCloseTo((t0 * 1.9) / 0.1, 10);
    expect(idealTotalTime(1, 1, g)).toBe(Infinity);
    expect(idealTotalTime(1, 1.1, g)).toBe(Infinity);
    expect(idealTotalTime(1, 0, g)).toBeCloseTo(t0, 12);
  });

  test('with e(v) the series still converges to a finite time', () => {
    const tennis = presetById('realista-mejorado').values;
    const total = idealTotalTime(tennis.h0, 0.79, g, (v) => 0.79 - 0.009 * v);

    expect(Number.isFinite(total)).toBe(true);
    expect(total).toBeGreaterThan(Math.sqrt((2 * tennis.h0) / g));
  });

  test('a threshold makes the impact that falls to it the last one, with no rebound', () => {
    const impacts = idealImpacts(1, 0.9, g, Infinity, 2);
    const last = impacts[impacts.length - 1];

    expect(impacts.filter((impact) => impact.vOut > 0)).toHaveLength(8);
    expect(last.vOut).toBe(0);
    expect(last.vIn).toBeCloseTo(1.91, 2);
  });
});

describe('idealEnergyAt', () => {
  test('steps down by e² at each impact and starts at 1', () => {
    const impacts = idealImpacts(1, 0.5, g, 5);

    expect(idealEnergyAt(impacts, 0, 1, g)).toBe(1);
    expect(idealEnergyAt(impacts, impacts[0].t + 1e-6, 1, g)).toBeCloseTo(0.25, 10);
    expect(idealEnergyAt(impacts, impacts[1].t + 1e-6, 1, g)).toBeCloseTo(0.0625, 10);
  });

  test('rises by e² with e > 1', () => {
    const impacts = idealImpacts(1, 1.1, g, 5);

    expect(idealEnergyAt(impacts, impacts[0].t + 1e-6, 1, g)).toBeCloseTo(1.21, 10);
  });
});

describe('thresholdPrediction (the engine rule with exact events)', () => {
  test('Unity: e = 0,9, 2 m/s from 1 m gives 8 rebounds, the last one 18,5 cm', () => {
    const prediction = thresholdPrediction(presetById('umbral-unity').values, g);

    expect(prediction?.bounces).toBe(8);
    expect(prediction?.lastApex).toBeCloseTo(0.185, 3);
  });

  test('undefined without a threshold, Infinity when the impacts never fall to it', () => {
    expect(thresholdPrediction(settings({ threshold: 0 }), g)).toBeUndefined();
    expect(thresholdPrediction(settings({ e: 1.1, threshold: 1 }), g)?.bounces).toBe(Infinity);
  });

  test('with e(v) it walks the impacts with the combined e(v)', () => {
    const prediction = thresholdPrediction(presetById('realista-mejorado').values, g);

    expect(prediction?.bounces).toBe(8);
    expect(prediction?.lastApex).toBeGreaterThan(0);
  });
});

describe('simulateEngine', () => {
  test('the Unity preset rests after 8 rebounds and stays resting', () => {
    const run = simulateEngine(presetById('umbral-unity').values, g, MAX_TIMELINE_S);
    const end = run.frames[run.frames.length - 1];

    expect(end.bounces).toBe(8);
    expect(end.resting).toBe(true);
    expect(run.restTime).toBeLessThan(6);
    expect(run.apexes[0]).toBe(1);
    expect(run.apexes).toHaveLength(9);
  });

  test('threshold 0 never lets the ball rest: restTime is Infinity', () => {
    const run = simulateEngine(settings({ e: 0.75, h0: 1, threshold: 0 }), g, 6);

    expect(run.restTime).toBe(Infinity);
  });

  test('engineFrameAt returns the last frame at or before t, clamped to the run', () => {
    const run = simulateEngine(settings({ h0: 1 }), g, 2);

    expect(engineFrameAt(run, 0)).toBe(run.frames[0]);
    expect(engineFrameAt(run, run.dt * 3.5).t).toBeCloseTo(run.dt * 3, 12);
    expect(engineFrameAt(run, 99)).toBe(run.frames[run.frames.length - 1]);
  });

  test('measuredRestitution is √(h₁/h₀) of the first rebound, 0 when there is none', () => {
    const run = simulateEngine(settings({ e: 0.5, h0: 1, rate: 240 }), g, 3);
    const clay = simulateEngine(settings({ e: 0, h0: 1 }), g, 3);

    expect(measuredRestitution(run)).toBeCloseTo(0.5, 2);
    expect(measuredRestitution(clay)).toBe(0);
  });
});

describe('energyGains', () => {
  test('marks every rebound of e = 1,1 as a rise', () => {
    const s = settings({ e: 1.1, h0: 1 });
    const gains = energyGains(simulateEngine(s, g, 5), s, g);

    expect(gains.length).toBeGreaterThan(2);
    expect(gains.every((gain) => gain.energy > 1)).toBe(true);
  });

  test('marks the Baumgarte bias at 1/30 s as energy the engine adds beyond e²', () => {
    const s = presetById('pocos-fps').values;
    const gains = energyGains(simulateEngine(s, g, 5), s, g);

    expect(gains[0]?.kind).toBe('excess');
    expect(gains[0]?.energy).toBeGreaterThan(0.5625);
  });

  test('a fine step without Baumgarte adds nothing', () => {
    const s = settings({ e: 0.75, h0: 1, rate: 240, substeps: 4 });

    expect(energyGains(simulateEngine(s, g, 5), s, g)).toEqual([]);
  });
});

describe('series', () => {
  test('the ideal position touches the floor at every impact and starts at h₀', () => {
    const s = settings({ e: 0.75, h0: 1 });
    const { position, energy } = idealSeries(s, g, 3, 200);

    expect(position[0]).toEqual({ x: 0, y: 1 });
    for (const impact of idealImpacts(1, 0.75, g, 3)) {
      expect(position.some((p) => p.x === impact.t && Math.abs(p.y) < 1e-9)).toBe(true);
    }
    expect(energy[0]).toEqual({ x: 0, y: 1 });
    expect(energy[energy.length - 1].x).toBe(3);
  });

  test('the engine series follows the frames up to the end time, as E/E₀', () => {
    const s = settings({ h0: 1 });
    const run = simulateEngine(s, g, 3);
    const { position, energy } = engineSeries(run, s, g, 2, 10_000);

    expect(position[0]).toEqual({ x: 0, y: 1 });
    expect(energy[0].y).toBeCloseTo(1, 12);
    expect(position[position.length - 1].x).toBeLessThanOrEqual(2);
  });

  test('decimateMinMax keeps the ends and every bucket extreme', () => {
    const points = Array.from({ length: 1000 }, (_, i) => ({ x: i, y: Math.sin(i / 7) }));
    const thinned = decimateMinMax(points, 100);

    expect(thinned.length).toBeLessThanOrEqual(102);
    expect(thinned[0]).toBe(points[0]);
    expect(thinned[thinned.length - 1]).toBe(points[999]);
    expect(Math.min(...thinned.map((p) => p.y))).toBe(Math.min(...points.map((p) => p.y)));
    expect(decimateMinMax(points.slice(0, 50), 100)).toHaveLength(50);
  });
});

describe('timeline and view', () => {
  test('the timeline covers the slower of T and the engine rest, within 2–15 s', () => {
    expect(timelineDuration(8.58, 4.98)).toBeCloseTo(9.33, 2);
    expect(timelineDuration(0.45, 0.5)).toBe(2);
    expect(timelineDuration(Infinity, 3)).toBe(MAX_TIMELINE_S);
    expect(timelineDuration(30, 3)).toBe(MAX_TIMELINE_S);
  });

  test('sceneTop leaves 15 % above h₀, in half metres', () => {
    expect(sceneTop(1)).toBe(1.5);
    expect(sceneTop(2.54)).toBe(3);
    expect(sceneTop(3)).toBe(3.5);
    expect(sceneTop(0.2)).toBe(0.5);
  });

  test('viewY clamps above the top and below the floor and says which', () => {
    expect(viewY(0.7, 1.5)).toEqual({ y: 0.7, clamp: 'none' });
    expect(viewY(4, 1.5)).toEqual({ y: 1.5, clamp: 'above' });
    expect(viewY(-0.04, 1.5)).toEqual({ y: 0, clamp: 'below' });
  });

  test('h₀ keys: 5 cm per arrow, 25 cm with Shift or Page keys, Home and End to the ends', () => {
    expect(h0KeyTarget('ArrowUp', false, 1)).toBeCloseTo(1.05, 10);
    expect(h0KeyTarget('ArrowDown', true, 1)).toBeCloseTo(0.75, 10);
    expect(h0KeyTarget('PageUp', false, 2.9)).toBe(3);
    expect(h0KeyTarget('Home', false, 2)).toBe(0.2);
    expect(h0KeyTarget('End', false, 2)).toBe(3);
    expect(h0KeyTarget('a', false, 2)).toBeUndefined();
  });
});

describe('buildBounceModel and idealStateAt', () => {
  test('the Unity model plays to T plus a tail and predicts 8 rebounds', () => {
    const model = buildBounceModel(presetById('umbral-unity').values, g);

    expect(model.duration).toBeCloseTo(model.idealTime + 0.75, 10);
    expect(model.prediction?.bounces).toBe(8);
    expect(model.engine.position.length).toBeLessThanOrEqual(1200);
    expect(model.gains).toEqual([]);
  });

  test('the ideal ball rests on the floor after T and not before', () => {
    const s = settings({ e: 0.5, h0: 1 });
    const total = idealTotalTime(1, 0.5, g);

    expect(idealStateAt(s, g, total + 0.01)).toEqual({ y: 0, isResting: true });
    expect(idealStateAt(s, g, 0).isResting).toBe(false);
    expect(idealStateAt(s, g, total / 2).isResting).toBe(false);
  });
});
