import { describe, expect, test } from 'vitest';
import {
  bounceSeries,
  bouncesAboveThreshold,
  collide1D,
  combineRestitution,
  engineStep,
  idealBallAt,
  restitutionAtSpeed,
  restitutionFromHeights,
  type BallState,
  type EngineParams,
} from './collision';
import { G_EARTH } from './constants';

const G = G_EARTH;
/** Impact speed of a drop from 1 m: √(2 g h₀) = 4,43 m/s. */
const V0_ONE_METRE = Math.sqrt(2 * G * 1);
/** Hard stop on the simulated time so a broken step cannot hang a test. */
const MAX_SIM_TIME = 400;

function dropState(h0: number): BallState {
  return { t: 0, y: h0, v: 0, bounces: 0, lastImpactSpeed: 0, resting: false };
}

function engine(overrides: Partial<EngineParams>): EngineParams {
  return { g: G, e: 0.75, threshold: 1, baumgarte: 0, substeps: 1, ...overrides };
}

interface RunResult {
  apexes: number[];
  final: BallState;
  states: BallState[];
}

/**
 * Runs the engine until `stop` holds, recording the apex of every flight that follows a rebound
 * (the highest y between one rebound and the next).
 */
function run(
  h0: number,
  p: EngineParams,
  dt: number,
  stop: (s: BallState, apexes: number[]) => boolean,
): RunResult {
  let state = dropState(h0);
  const apexes: number[] = [];
  const states: BallState[] = [];
  let flightMax = Number.NEGATIVE_INFINITY;
  while (!stop(state, apexes) && state.t < MAX_SIM_TIME) {
    const next = engineStep(state, p, dt);
    if (next.bounces > state.bounces) {
      if (state.bounces > 0) apexes.push(flightMax);
      flightMax = next.y;
    } else {
      flightMax = Math.max(flightMax, next.y);
    }
    state = next;
    states.push(state);
  }
  return { apexes, final: state, states };
}

describe('restitutionFromHeights', () => {
  test('gives the ITF type 2 range 0,729–0,761 from 254 cm → 135–147 cm', () => {
    expect(restitutionFromHeights(2.54, 1.35)).toBeCloseTo(0.729, 3);
    expect(restitutionFromHeights(2.54, 1.47)).toBeCloseTo(0.761, 3);
  });

  test('is 0 when the ball does not rebound and 1 when it returns to its height', () => {
    expect(restitutionFromHeights(1.8, 0)).toBe(0);
    expect(restitutionFromHeights(1.8, 1.8)).toBe(1);
  });

  test('rejects a drop height that is not positive or a negative rebound', () => {
    expect(() => restitutionFromHeights(0, 1)).toThrow(RangeError);
    expect(() => restitutionFromHeights(1, -0.1)).toThrow(RangeError);
    expect(() => restitutionFromHeights(Number.NaN, 1)).toThrow(RangeError);
  });
});

describe('bounceSeries', () => {
  test('total time is t₀(1+e)/(1−e): 3 t₀ for e = 0,5', () => {
    const s = bounceSeries(1, 0.5, G, 50);

    expect(s.totalTime).toBeCloseTo(Math.sqrt(2 / G) * 3, 6);
  });

  test('totals 1,35 s, 3,16 s and 8,58 s for e = 0,5, 0,75 and 0,9 from 1 m', () => {
    expect(bounceSeries(1, 0.5, G, 1).totalTime).toBeCloseTo(1.35, 2);
    expect(bounceSeries(1, 0.75, G, 1).totalTime).toBeCloseTo(3.16, 2);
    expect(bounceSeries(1, 0.9, G, 1).totalTime).toBeCloseTo(8.58, 2);
  });

  test('total time is Infinity for e = 1 and for e > 1', () => {
    expect(bounceSeries(1, 1, G, 5).totalTime).toBe(Infinity);
    expect(bounceSeries(1, 1.2, G, 5).totalTime).toBe(Infinity);
  });

  test('heights follow hₙ = e²ⁿ h₀ and impact speeds vₙ = eⁿ v₀', () => {
    const s = bounceSeries(2.54, 0.745, G, 4);

    expect(s.heights).toHaveLength(4);
    expect(s.heights[0]).toBe(2.54);
    s.heights.forEach((h, n) => expect(h).toBeCloseTo(0.745 ** (2 * n) * 2.54, 12));
    s.impactSpeeds.forEach((v, n) =>
      expect(v).toBeCloseTo(0.745 ** n * Math.sqrt(2 * G * 2.54), 12),
    );
  });

  test('impact speed is √(2 g h) of the same flight: 7,06 m/s for the ITF drop', () => {
    const s = bounceSeries(2.54, 0.745, G, 3);

    expect(s.impactSpeeds[0]).toBeCloseTo(7.06, 2);
    s.heights.forEach((h, n) => expect(s.impactSpeeds[n]).toBeCloseTo(Math.sqrt(2 * G * h), 12));
  });

  test('the drop lasts t₀ and every later flight 2 t₀ eⁿ, summing towards T', () => {
    const t0 = Math.sqrt(2 / G);
    const s = bounceSeries(1, 0.5, G, 60);

    expect(s.flightTimes[0]).toBeCloseTo(t0, 12);
    expect(s.flightTimes[1]).toBeCloseTo(2 * t0 * 0.5, 12);
    expect(s.flightTimes[3]).toBeCloseTo(2 * t0 * 0.5 ** 3, 12);
    expect(s.flightTimes.reduce((a, b) => a + b, 0)).toBeCloseTo(s.totalTime, 10);
  });

  test('e = 0 stops at the first impact: one drop flight, then zeros, T = t₀', () => {
    const s = bounceSeries(1, 0, G, 3);

    expect(s.heights).toEqual([1, 0, 0]);
    expect(s.impactSpeeds.slice(1)).toEqual([0, 0]);
    expect(s.flightTimes.slice(1)).toEqual([0, 0]);
    expect(s.totalTime).toBeCloseTo(Math.sqrt(2 / G), 12);
  });

  test('e = 1,2 grows every bounce and stays finite for 20 bounces', () => {
    const s = bounceSeries(1, 1.2, G, 21);

    for (let n = 1; n < s.heights.length; n += 1) {
      expect(s.heights[n]).toBeGreaterThan(s.heights[n - 1]);
    }
    for (const value of [...s.heights, ...s.impactSpeeds, ...s.flightTimes]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  test('rejects bad inputs', () => {
    expect(() => bounceSeries(0, 0.5, G, 3)).toThrow(RangeError);
    expect(() => bounceSeries(1, -0.1, G, 3)).toThrow(RangeError);
    expect(() => bounceSeries(1, 0.5, 0, 3)).toThrow(RangeError);
    expect(() => bounceSeries(1, 0.5, G, 0)).toThrow(RangeError);
    expect(() => bounceSeries(1, 0.5, G, 2.5)).toThrow(RangeError);
  });
});

describe('collide1D', () => {
  test('conserves momentum: 1 kg at 2 m/s on 3 kg at rest, e = 0,75', () => {
    const c = collide1D(1, 2, 3, 0, 0.75);

    expect(c.v1 * 1 + c.v2 * 3).toBeCloseTo(2, 12);
    expect(c.momentum).toBeCloseTo(2, 12);
  });

  test('separates at e times the approach speed (Newton)', () => {
    const c = collide1D(1, 2, 3, -1, 0.75);

    expect(c.v2 - c.v1).toBeCloseTo(-0.75 * (-1 - 2), 12);
  });

  test.each([0, 0.5, 0.75, 1, 1.2])('loses 1 − e² of the relative kinetic energy (e = %s)', (e) => {
    const m1 = 2;
    const m2 = 5;
    const v1 = 3;
    const v2 = -1;
    const mu = (m1 * m2) / (m1 + m2);
    const kRel = 0.5 * mu * (v2 - v1) ** 2;

    const c = collide1D(m1, v1, m2, v2, e);
    const kBefore = 0.5 * m1 * v1 ** 2 + 0.5 * m2 * v2 ** 2;
    const kAfter = 0.5 * m1 * c.v1 ** 2 + 0.5 * m2 * c.v2 ** 2;

    expect(c.kineticLoss / kRel).toBeCloseTo(1 - e * e, 12);
    expect(kBefore - kAfter).toBeCloseTo(c.kineticLoss, 12);
  });

  test('e = 0 leaves both bodies with the centre-of-mass velocity', () => {
    const c = collide1D(1, 2, 3, 0, 0);

    expect(c.v1).toBeCloseTo(0.5, 12);
    expect(c.v2).toBeCloseTo(0.5, 12);
  });

  test('e = 1 with equal masses swaps the velocities and keeps K', () => {
    const c = collide1D(1, 2, 1, -1, 1);

    expect(c.v1).toBeCloseTo(-1, 12);
    expect(c.v2).toBeCloseTo(2, 12);
    expect(c.kineticLoss).toBeCloseTo(0, 12);
  });

  test('an infinite mass is the floor: v₁′ = −e v₁, finite numbers only', () => {
    const c = collide1D(0.058, -7.06, Infinity, 0, 0.745);

    expect(c.v1).toBeCloseTo(0.745 * 7.06, 12);
    expect(c.v2).toBe(0);
    expect(c.momentum).toBeCloseTo(0.058 * 0.745 * 7.06, 12);
    expect(c.kineticLoss).toBeCloseTo(0.5 * 0.058 * 7.06 ** 2 * (1 - 0.745 ** 2), 12);
    for (const value of Object.values(c)) expect(Number.isFinite(value)).toBe(true);
  });

  test('a moving floor keeps its velocity and the ball leaves at −e v₁ + (1+e) v₂', () => {
    const c = collide1D(1, -3, Infinity, 1, 0.5);

    expect(c.v2).toBe(1);
    expect(c.v1).toBeCloseTo(-0.5 * -3 + 1.5 * 1, 12);
  });

  test('rejects masses that are not positive, an infinite first mass and a negative e', () => {
    expect(() => collide1D(0, 1, 1, 0, 0.5)).toThrow(RangeError);
    expect(() => collide1D(Infinity, 1, 1, 0, 0.5)).toThrow(RangeError);
    expect(() => collide1D(1, 1, -1, 0, 0.5)).toThrow(RangeError);
    expect(() => collide1D(1, Number.NaN, 1, 0, 0.5)).toThrow(RangeError);
    expect(() => collide1D(1, 1, 1, 0, -0.5)).toThrow(RangeError);
  });
});

describe('bouncesAboveThreshold', () => {
  test('Unity preset: 8 bounces from 1 m with e = 0,9 and v_th = 2 m/s', () => {
    expect(bouncesAboveThreshold(V0_ONE_METRE, 0.9, 2)).toBe(8);
  });

  test('the last of the 8 rebounds rises 18,5 cm and the next impact is 1,91 m/s', () => {
    const n = bouncesAboveThreshold(V0_ONE_METRE, 0.9, 2);
    const lastRebound = 0.9 ** n * V0_ONE_METRE;

    expect(lastRebound ** 2 / (2 * G)).toBeCloseTo(0.185, 3);
    expect(lastRebound).toBeCloseTo(1.91, 2);
  });

  test.each([
    [0.9, 1, 15],
    [0.75, 1, 6],
    [0.75, 2, 3],
    [0.9, 0.2, 30],
  ])('e = %s, v_th = %s m/s from 1 m → %s bounces (research table)', (e, vth, n) => {
    expect(bouncesAboveThreshold(V0_ONE_METRE, e, vth)).toBe(n);
  });

  test('is 0 when the first impact is already at or below the threshold', () => {
    expect(bouncesAboveThreshold(1, 0.9, 1)).toBe(0);
    expect(bouncesAboveThreshold(0.5, 0.9, 1)).toBe(0);
  });

  test('the threshold is strict: an impact exactly at v_th does not bounce', () => {
    // 4 → 2 → 1 m/s with e = 0,5: the third impact equals v_th = 1 and sticks.
    expect(bouncesAboveThreshold(4, 0.5, 1)).toBe(2);
  });

  test('e = 0 never rebounds, like the bounce counters of engineStep and idealBallAt', () => {
    expect(bouncesAboveThreshold(V0_ONE_METRE, 0, 1)).toBe(0);
    expect(bouncesAboveThreshold(V0_ONE_METRE, 0, 0)).toBe(0);
  });

  test('never stops for e ≥ 1 or a zero threshold', () => {
    expect(bouncesAboveThreshold(V0_ONE_METRE, 1, 1)).toBe(Infinity);
    expect(bouncesAboveThreshold(V0_ONE_METRE, 1.2, 2)).toBe(Infinity);
    expect(bouncesAboveThreshold(V0_ONE_METRE, 0.9, 0)).toBe(Infinity);
  });

  test('rejects negative or non-finite inputs', () => {
    expect(() => bouncesAboveThreshold(-1, 0.9, 1)).toThrow(RangeError);
    expect(() => bouncesAboveThreshold(1, -0.9, 1)).toThrow(RangeError);
    expect(() => bouncesAboveThreshold(1, 0.9, Number.NaN)).toThrow(RangeError);
  });
});

describe('combineRestitution', () => {
  test('average: a 0,85 ball on a 0 floor gives 0,425 (Unity 3D, PhysX)', () => {
    expect(combineRestitution(0.85, 0, 'average')).toBeCloseTo(0.425);
    expect(combineRestitution(0.85, 0.5, 'average')).toBeCloseTo(0.675);
  });

  test('sumClamped: 0,5 + 0,5 = 1 and never above 1 (Godot)', () => {
    expect(combineRestitution(0.5, 0.5, 'sumClamped')).toBe(1);
    expect(combineRestitution(0.85, 0.5, 'sumClamped')).toBe(1);
    expect(combineRestitution(0.85, 0, 'sumClamped')).toBeCloseTo(0.85);
  });

  test('max keeps the lively ball lively; min and multiply kill it on a dead floor', () => {
    expect(combineRestitution(0.85, 0, 'max')).toBe(0.85);
    expect(combineRestitution(0.85, 0, 'min')).toBe(0);
    expect(combineRestitution(0.85, 0, 'multiply')).toBe(0);
    expect(combineRestitution(0.85, 0.5, 'multiply')).toBeCloseTo(0.425);
  });

  test('rejects a negative or non-finite coefficient', () => {
    expect(() => combineRestitution(-0.1, 0.5, 'max')).toThrow(RangeError);
    expect(() => combineRestitution(0.5, Number.NaN, 'max')).toThrow(RangeError);
  });
});

describe('restitutionAtSpeed', () => {
  test('the illustrative fit e(v) = 0,79 − 0,009 |v| gives 0,754 at 4 m/s and 0,637 at 17 m/s', () => {
    expect(restitutionAtSpeed(4, 0.79, 0.009)).toBeCloseTo(0.754, 12);
    expect(restitutionAtSpeed(-17, 0.79, 0.009)).toBeCloseTo(0.637, 12);
  });

  test('is clamped to [0, 1]', () => {
    expect(restitutionAtSpeed(200, 0.79, 0.009)).toBe(0);
    expect(restitutionAtSpeed(1, 1.2, 0)).toBe(1);
  });

  test('rejects non-finite inputs', () => {
    expect(() => restitutionAtSpeed(Number.NaN, 0.79, 0.009)).toThrow(RangeError);
    expect(() => restitutionAtSpeed(1, Infinity, 0.009)).toThrow(RangeError);
  });
});

describe('engineStep', () => {
  test('one step is semi-implicit Euler: v −= g h, then y += v h', () => {
    const next = engineStep(dropState(1), engine({}), 0.1);

    expect(next.t).toBeCloseTo(0.1, 12);
    expect(next.v).toBeCloseTo(-G * 0.1, 12);
    expect(next.y).toBeCloseTo(1 - G * 0.01, 12);
    expect(next.bounces).toBe(0);
    expect(next.resting).toBe(false);
  });

  test('substeps split dt into equal Euler steps', () => {
    const next = engineStep(dropState(1), engine({ substeps: 2 }), 0.1);

    expect(next.v).toBeCloseTo(-G * 0.1, 12);
    expect(next.y).toBeCloseTo(1 - G * 0.05 * 0.05 * 3, 12);
  });

  test('does not mutate the state it receives', () => {
    const state = dropState(0.01);
    const copy = { ...state };

    engineStep(state, engine({}), 1 / 60);

    expect(state).toEqual(copy);
  });

  test('a contact sets v = e·|v⁻|, records the impact speed and projects y to 0 without Baumgarte', () => {
    const state: BallState = { ...dropState(0.01), v: -4 };

    const next = engineStep(state, engine({ e: 0.5, threshold: 1 }), 0.01);

    const approach = -4 - G * 0.01;
    expect(next.v).toBeCloseTo(0.5 * -approach, 12);
    expect(next.y).toBe(0);
    expect(next.bounces).toBe(1);
    expect(next.lastImpactSpeed).toBeCloseTo(-approach, 12);
    expect(next.resting).toBe(false);
  });

  test('Baumgarte adds β·penetration/h and leaves the position penetrated', () => {
    const state: BallState = { ...dropState(0.01), v: -4 };
    const h = 0.01;

    const next = engineStep(state, engine({ e: 0.5, threshold: 1, baumgarte: 0.2 }), h);

    const approach = -4 - G * h;
    const y = 0.01 + approach * h;
    expect(next.y).toBeCloseTo(y, 12);
    expect(next.v).toBeCloseTo(0.5 * -approach + (0.2 * -y) / h, 12);
  });

  test('a ball still penetrated but already separating only gets the push, never a pull', () => {
    const state: BallState = { ...dropState(-0.05), v: 2 };
    const h = 0.01;

    const next = engineStep(state, engine({ baumgarte: 0.2 }), h);

    expect(next.v).toBeCloseTo(2 - G * h, 12);
    expect(next.bounces).toBe(0);
  });

  test('an impact at or below the threshold sticks: e_eff = 0 and the ball rests', () => {
    const state: BallState = { ...dropState(0.001), v: -0.5 };

    const next = engineStep(state, engine({ e: 0.9, threshold: 1 }), 1 / 60);

    expect(next.v).toBe(0);
    expect(next.y).toBe(0);
    expect(next.bounces).toBe(0);
    expect(next.resting).toBe(true);
    expect(next.lastImpactSpeed).toBeCloseTo(0.5 + G / 60, 12);
  });

  test('a resting ball stays at rest and keeps the speed of the impact that stopped it', () => {
    const resting: BallState = {
      t: 1,
      y: 0,
      v: 0,
      bounces: 3,
      lastImpactSpeed: 1.5,
      resting: true,
    };

    const next = engineStep(resting, engine({ threshold: 1 }), 1 / 60);

    expect(next).toMatchObject({ y: 0, v: 0, bounces: 3, lastImpactSpeed: 1.5, resting: true });
  });

  test('low fps + Baumgarte (e = 0,75, Δt = 1/30, β = 0,2) gains energy: first apex above e² h₀', () => {
    const { apexes } = run(1, engine({ e: 0.75, baumgarte: 0.2 }), 1 / 30, (_, a) => a.length >= 1);

    expect(apexes[0]).toBeGreaterThan(0.75 ** 2);
  });

  test('a fine step without Baumgarte (Δt = 1/240, 4 substeps) lands within 2 % of e² h₀ = 0,5625 m', () => {
    const { apexes } = run(1, engine({ e: 0.75, substeps: 4 }), 1 / 240, (_, a) => a.length >= 1);

    expect(Math.abs(apexes[0] - 0.5625) / 0.5625).toBeLessThan(0.02);
  });

  test('with v_th = 1 m/s the ball rests after bouncesAboveThreshold(v₀, e, 1) contacts (±1)', () => {
    const expected = bouncesAboveThreshold(V0_ONE_METRE, 0.75, 1);

    const { final } = run(
      1,
      engine({ e: 0.75, threshold: 1, substeps: 4 }),
      1 / 60,
      (s) => s.resting,
    );

    expect(final.resting).toBe(true);
    expect(Math.abs(final.bounces - expected)).toBeLessThanOrEqual(1);
  });

  test('Unity preset at Δt = 1/60 with Box2D’s 4 substeps rests within 8 ± 1 contacts', () => {
    const { final } = run(
      1,
      engine({ e: 0.9, threshold: 2, substeps: 4 }),
      1 / 60,
      (s) => s.resting,
    );

    expect(final.resting).toBe(true);
    expect(final.bounces).toBeGreaterThanOrEqual(7);
    expect(final.bounces).toBeLessThanOrEqual(9);
    expect(final.y).toBe(0);
    expect(final.v).toBe(0);
    expect(final.lastImpactSpeed).toBeLessThanOrEqual(2);
  });

  test('a single substep at 1/60 loses rebound speed every bounce and stops sooner', () => {
    const coarse = run(1, engine({ e: 0.9, threshold: 2, substeps: 1 }), 1 / 60, (s) => s.resting);
    const fine = run(1, engine({ e: 0.9, threshold: 2, substeps: 4 }), 1 / 60, (s) => s.resting);

    expect(coarse.final.resting).toBe(true);
    expect(coarse.final.bounces).toBeLessThan(fine.final.bounces);
  });

  test('e = 1,2 raises the apex every bounce and stays finite after 20 bounces', () => {
    const { apexes, states } = run(
      1,
      engine({ e: 1.2, threshold: 1, substeps: 4 }),
      1 / 60,
      (s) => s.bounces > 20,
    );

    expect(apexes.length).toBeGreaterThanOrEqual(19);
    for (let i = 1; i < apexes.length; i += 1) expect(apexes[i]).toBeGreaterThan(apexes[i - 1]);
    for (const s of states) {
      expect(Number.isFinite(s.y)).toBe(true);
      expect(Number.isFinite(s.v)).toBe(true);
    }
  });

  test('e = 0 sticks on the first contact without ever bouncing', () => {
    const { final } = run(1, engine({ e: 0, threshold: 1 }), 1 / 60, (s) => s.resting);

    expect(final.resting).toBe(true);
    expect(final.bounces).toBe(0);
    expect(final.lastImpactSpeed).toBeGreaterThan(4);
  });

  test('rejects a step that is not positive, bad substeps and negative parameters', () => {
    const s = dropState(1);
    expect(() => engineStep(s, engine({}), 0)).toThrow(RangeError);
    expect(() => engineStep(s, engine({ substeps: 0 }), 1 / 60)).toThrow(RangeError);
    expect(() => engineStep(s, engine({ substeps: 1.5 }), 1 / 60)).toThrow(RangeError);
    expect(() => engineStep(s, engine({ g: 0 }), 1 / 60)).toThrow(RangeError);
    expect(() => engineStep(s, engine({ e: -1 }), 1 / 60)).toThrow(RangeError);
    expect(() => engineStep(s, engine({ threshold: -1 }), 1 / 60)).toThrow(RangeError);
    expect(() => engineStep(s, engine({ baumgarte: -0.1 }), 1 / 60)).toThrow(RangeError);
    expect(() => engineStep({ ...s, y: Number.NaN }, engine({}), 1 / 60)).toThrow(RangeError);
  });
});

describe('idealBallAt', () => {
  const t0 = Math.sqrt(2 / G);

  test('falls freely until the first impact at t₀', () => {
    const half = idealBallAt(t0 / 2, 1, 0.75, G);

    expect(half.y).toBeCloseTo(1 - (G * (t0 / 2) ** 2) / 2, 12);
    expect(half.v).toBeCloseTo((-G * t0) / 2, 12);
    expect(half.bounces).toBe(0);
  });

  test('peaks at e² h₀ halfway through the first rebound flight', () => {
    const apex = idealBallAt(t0 + t0 * 0.75, 1, 0.75, G);

    expect(apex.y).toBeCloseTo(0.5625, 12);
    expect(apex.v).toBeCloseTo(0, 12);
    expect(apex.bounces).toBe(1);
  });

  test('lands again exactly at t₀ + 2 t₀ e', () => {
    const landing = idealBallAt(t0 + 2 * t0 * 0.75, 1, 0.75, G);

    expect(landing.y).toBeCloseTo(0, 12);
    expect(landing.bounces).toBe(1);
  });

  test('without a threshold the ball rests at T = t₀(1+e)/(1−e) after infinitely many bounces', () => {
    const T = bounceSeries(1, 0.75, G, 1).totalTime;

    expect(idealBallAt(T, 1, 0.75, G)).toEqual({ y: 0, v: 0, bounces: Infinity });
    expect(idealBallAt(T * 0.999, 1, 0.75, G).bounces).toBeGreaterThan(10);
  });

  test('with the Unity threshold it bounces 8 times, the last up to 18,5 cm, then stops', () => {
    const atRest = idealBallAt(100, 1, 0.9, G, 2);
    const lastUp = 0.9 ** 8 * V0_ONE_METRE;
    const series = bounceSeries(1, 0.9, G, 9);
    const lastImpact = series.flightTimes.slice(0, 8).reduce((a, b) => a + b, 0);
    const lastApex = idealBallAt(lastImpact + lastUp / G, 1, 0.9, G, 2);

    expect(atRest).toEqual({ y: 0, v: 0, bounces: 8 });
    expect(lastApex.bounces).toBe(8);
    expect(lastApex.y).toBeCloseTo(0.185, 3);
  });

  test('e = 0 sticks at t₀', () => {
    expect(idealBallAt(2 * t0, 1, 0, G)).toEqual({ y: 0, v: 0, bounces: 0 });
  });

  test('e = 1 keeps bouncing to h₀ forever', () => {
    const later = idealBallAt(t0 + 2 * t0 * 50 + t0, 1, 1, G);

    expect(later.y).toBeCloseTo(1, 9);
    expect(later.bounces).toBe(51);
  });

  test('e = 1,2 grows and stays finite', () => {
    const s = idealBallAt(60, 1, 1.2, G);

    expect(Number.isFinite(s.y)).toBe(true);
    expect(Number.isFinite(s.v)).toBe(true);
    expect(s.bounces).toBeGreaterThan(5);
  });

  test('rejects negative time and bad parameters', () => {
    expect(() => idealBallAt(-1, 1, 0.5, G)).toThrow(RangeError);
    expect(() => idealBallAt(1, 0, 0.5, G)).toThrow(RangeError);
    expect(() => idealBallAt(1, 1, -0.5, G)).toThrow(RangeError);
    expect(() => idealBallAt(1, 1, 0.5, G, -1)).toThrow(RangeError);
  });
});
