import { describe, expect, test } from 'vitest';
import { cubicBezier, EASE_IN_OUT } from '../../../lib/cubicBezier';
import {
  dampingRegime,
  naturalAngularFrequency,
  settlingTime,
  springState,
} from '../../../lib/physics/dampedSpring';
import {
  bezierAt,
  buildRun,
  cardsAt,
  comparisonDuration,
  lastJump,
  MARKS,
  MAX_LEG_S,
  MIN_LEG_S,
  MOTION_REST,
  RUN_EPSILON,
  runCurves,
  runMarkers,
  springAt,
  TRAVEL_PX,
  withRetarget,
} from './springScene';

const MOTION_DEFAULT = { k: 100, b: 10, m: 1 } as const;
const OVERDAMPED = { k: 100, b: 40, m: 1 } as const;
const UNDAMPED = { k: 100, b: 0, m: 1 } as const;
const STEP = MARKS.from - MARKS.to;
const SAMPLE_TIMES = [0, 0.05, 0.1, 0.3627, 0.5, 0.81, 1.2, 2.5, 3];
/** Two presses this close are the «pressed twice quickly» of Review Focus 4. */
const QUICK_PRESS_S = 0.03;

describe('the plain step, from 100 px to 1 000 px', () => {
  test('the card at clock t is springState itself, exact and not integrated', () => {
    // Arrange
    const run = buildRun(MOTION_DEFAULT, []);

    // Act and assert
    for (const t of SAMPLE_TIMES) {
      const { u, v } = springState(MOTION_DEFAULT, STEP, 0, t);
      expect(springAt(run, t).x, `x(${t})`).toBe(MARKS.to + u);
      expect(springAt(run, t).v, `v(${t})`).toBe(v);
      expect(springAt(run, t).target).toBe(MARKS.to);
    }
  });

  test('changing k, b or m recomputes x(t) from the new spring', () => {
    for (const patch of [{ k: 400 }, { b: 30 }, { m: 2.5 }]) {
      const params = { ...MOTION_DEFAULT, ...patch };
      const run = buildRun(params, []);
      for (const t of SAMPLE_TIMES) {
        expect(springAt(run, t).x).toBe(MARKS.to + springState(params, STEP, 0, t).u);
      }
      expect(springAt(run, 0.3).x).not.toBe(springAt(buildRun(MOTION_DEFAULT, []), 0.3).x);
    }
  });

  test('the clock lasts the larger of 3 s and the 0,2 % settling time, at most 6 s', () => {
    // A slow, light damping settles at 0,2 % in about 4 s: the run lasts exactly that.
    const slow = { k: 100, b: 3.1, m: 1 };
    const slowSettle = settlingTime(slow, STEP, 0, RUN_EPSILON, TRAVEL_PX);

    expect(MIN_LEG_S).toBe(3);
    expect(MAX_LEG_S).toBe(6);
    expect(slowSettle).toBeGreaterThan(MIN_LEG_S);
    expect(slowSettle).toBeLessThan(MAX_LEG_S);
    expect(buildRun(slow, []).duration).toBe(slowSettle);
    expect(buildRun(MOTION_DEFAULT, []).duration).toBe(MIN_LEG_S);
    expect(buildRun(OVERDAMPED, []).duration).toBe(MIN_LEG_S);
    expect(buildRun({ k: 10, b: 100, m: 5 }, []).duration).toBe(MAX_LEG_S);
    expect(buildRun(UNDAMPED, []).duration).toBe(MAX_LEG_S);
  });
});

describe('the comparison card: ease-in-out lasting the spring’s 2 % settling time', () => {
  const easing = cubicBezier(...EASE_IN_OUT);

  test('follows CSS ease-in-out (ruling R14), not the brief’s ease, over t_s at 2 %', () => {
    // Arrange
    const run = buildRun(MOTION_DEFAULT, []);
    const duration = comparisonDuration(MOTION_DEFAULT, STEP, 0);

    // Assert
    expect(duration).toBe(settlingTime(MOTION_DEFAULT, STEP, 0, 0.02, TRAVEL_PX));
    expect(duration).toBeCloseTo(0.8076, 4);
    for (const fraction of [0, 0.1, 0.25, 0.5, 0.9, 1]) {
      const { x } = bezierAt(run, fraction * duration);
      expect(x).toBeCloseTo(MARKS.from + (MARKS.to - MARKS.from) * easing.progress(fraction), 9);
    }
    expect(bezierAt(run, 0)).toEqual({ x: MARKS.from, v: 0 });
    expect(bezierAt(run, duration).x).toBe(MARKS.to);
    expect(bezierAt(run, 2)).toEqual({ x: MARKS.to, v: 0 });
  });

  test('with b = 0 the spring never settles: the curve lasts d = 2π/ω₀ of (10.10)', () => {
    const period = (2 * Math.PI) / naturalAngularFrequency(UNDAMPED);

    expect(comparisonDuration(UNDAMPED, STEP, 0)).toBe(period);
    expect(bezierAt(buildRun(UNDAMPED, []), period).x).toBe(MARKS.to);
  });

  test('a spring that starts and stays inside its band gives the curve d too, never 0 s', () => {
    expect(comparisonDuration(MOTION_DEFAULT, 1, 0)).toBe(
      (2 * Math.PI) / naturalAngularFrequency(MOTION_DEFAULT),
    );
  });
});

describe('«Interrumpir» mid-flight (10.9)', () => {
  const T_STAR = 0.2;

  test('swaps the target and restarts (10.6) from springState at t*, with the same x and v', () => {
    // Arrange
    const plain = buildRun(MOTION_DEFAULT, []);
    const before = springAt(plain, T_STAR);

    // Act
    const run = buildRun(MOTION_DEFAULT, withRetarget([], T_STAR));
    const after = springAt(run, T_STAR);

    // Assert
    expect(Math.abs(after.x - before.x)).toBeLessThan(1e-9);
    expect(Math.abs(after.v - before.v)).toBeLessThan(1e-9);
    expect(before.v).toBeGreaterThan(1000);
    expect(after.target).toBe(MARKS.from);
    expect(run.spring[1]).toEqual({
      start: T_STAR,
      target: MARKS.from,
      u0: before.x - MARKS.from,
      v0: before.v,
    });
    for (const t of [0.25, 0.5, 1]) {
      const { u } = springState(MOTION_DEFAULT, before.x - MARKS.from, before.v, t - T_STAR);
      expect(springAt(run, t).x).toBeCloseTo(MARKS.from + u, 9);
    }
    // Before t* nothing changed.
    expect(springAt(run, 0.1)).toEqual(springAt(plain, 0.1));
  });

  test('the curve restarts from its own position at rest, lasting the new leg’s 2 % t_s', () => {
    // Arrange
    const plain = buildRun(MOTION_DEFAULT, []);
    const curveBefore = bezierAt(plain, T_STAR);

    // Act
    const run = buildRun(MOTION_DEFAULT, [T_STAR]);
    const leg = run.spring[1];

    // Assert
    expect(Math.abs(bezierAt(run, T_STAR).x - curveBefore.x)).toBeLessThan(1e-9);
    expect(curveBefore.v).toBeGreaterThan(0);
    expect(bezierAt(run, T_STAR).v).toBe(0);
    expect(run.bezier[1]).toEqual({
      start: T_STAR,
      from: curveBefore.x,
      to: MARKS.from,
      duration: settlingTime(MOTION_DEFAULT, leg.u0, leg.v0, 0.02, TRAVEL_PX),
    });
    expect(bezierAt(run, T_STAR + run.bezier[1].duration).x).toBe(MARKS.from);
  });

  test('Review Focus 4: two presses 30 ms apart keep x and v continuous for both cards', () => {
    // Arrange
    const first = T_STAR;
    const second = T_STAR + QUICK_PRESS_S;
    const plain = buildRun(MOTION_DEFAULT, []);
    const once = buildRun(MOTION_DEFAULT, [first]);

    // Act
    const twice = buildRun(MOTION_DEFAULT, withRetarget([first], second));

    // Assert
    expect(twice.retargets).toEqual([first, second]);
    for (const [run, previous, t] of [
      [once, plain, first],
      [twice, once, second],
    ] as const) {
      expect(Math.abs(springAt(run, t).x - springAt(previous, t).x)).toBeLessThan(1e-9);
      expect(Math.abs(springAt(run, t).v - springAt(previous, t).v)).toBeLessThan(1e-9);
      expect(Math.abs(bezierAt(run, t).x - bezierAt(previous, t).x)).toBeLessThan(1e-9);
    }
    expect(springAt(twice, second).target).toBe(MARKS.to);
    for (const t of [0.1, first, second, 0.5, 1, 2]) {
      expect(Number.isFinite(springAt(twice, t).x)).toBe(true);
      expect(Number.isFinite(bezierAt(twice, t).x)).toBe(true);
    }
  });

  test('two presses at the same paused instant swap the target twice and move nothing', () => {
    const run = buildRun(MOTION_DEFAULT, withRetarget([T_STAR], T_STAR));
    const plain = buildRun(MOTION_DEFAULT, []);

    expect(run.retargets).toEqual([T_STAR, T_STAR]);
    expect(springAt(run, T_STAR).target).toBe(MARKS.to);
    expect(Math.abs(springAt(run, T_STAR).x - springAt(plain, T_STAR).x)).toBeLessThan(1e-9);
    expect(Math.abs(springAt(run, T_STAR).v - springAt(plain, T_STAR).v)).toBeLessThan(1e-9);
  });

  test('Review Focus 4: a press at rest just swaps the targets, from x_obj with v = 0 (10.11)', () => {
    // Arrange: by 2,9 s Motion's default spring is within 0,5 px and 2 px/s of its target.
    const atRest = 2.9;
    const { u, v } = springState(MOTION_DEFAULT, STEP, 0, atRest);
    expect(Math.abs(u)).toBeLessThan(MOTION_REST.delta);
    expect(Math.abs(v)).toBeLessThan(MOTION_REST.speed);

    // Act
    const run = buildRun(MOTION_DEFAULT, [atRest]);

    // Assert
    expect(springAt(run, atRest)).toEqual({ x: MARKS.to, v: 0, target: MARKS.from });
    expect(run.spring[1]).toEqual({ start: atRest, target: MARKS.from, u0: -STEP, v0: 0 });
    expect(bezierAt(run, atRest)).toEqual({ x: MARKS.to, v: 0 });
    // The new leg plays in full: the run grows to t* plus the leg's own 3 to 6 s.
    expect(run.duration).toBe(atRest + MIN_LEG_S);
  });

  test('a press after its later presses rewrites the run from there on', () => {
    expect(withRetarget([0.2, 0.6, 1], 0.5)).toEqual([0.2, 0.5]);
    expect(() => withRetarget([], -0.1)).toThrow(RangeError);
    expect(() => buildRun(MOTION_DEFAULT, [0.6, 0.2])).toThrow(RangeError);
  });

  test('the jump of the last press: the spring keeps v, the curve falls to 0', () => {
    const run = buildRun(MOTION_DEFAULT, [T_STAR]);
    const plain = buildRun(MOTION_DEFAULT, []);

    expect(lastJump(buildRun(MOTION_DEFAULT, []))).toBeUndefined();
    expect(lastJump(run)).toEqual({
      t: T_STAR,
      spring: { before: springAt(plain, T_STAR).v, after: run.spring[1].v0 },
      bezier: { before: bezierAt(plain, T_STAR).v, after: 0 },
    });
  });

  test('cardsAt gives both cards at once', () => {
    const run = buildRun(MOTION_DEFAULT, [T_STAR]);

    expect(cardsAt(run, 0.4)).toEqual({ spring: springAt(run, 0.4), bezier: bezierAt(run, 0.4) });
  });
});

describe('Review Focus 3: extreme inputs', () => {
  test('b = 0 never settles and never rests: every press restarts with its real velocity', () => {
    const run = buildRun(UNDAMPED, [5.9]);
    const plain = buildRun(UNDAMPED, []);

    expect(Math.abs(springAt(run, 5.9).v - springAt(plain, 5.9).v)).toBeLessThan(1e-9);
    expect(run.duration).toBe(5.9 + MAX_LEG_S);
    for (let t = 0; t <= run.duration; t += 0.37) {
      expect(Number.isFinite(springAt(run, t).x)).toBe(true);
      expect(Number.isFinite(bezierAt(run, t).v)).toBe(true);
    }
  });

  test('ζ = 1 ± 1e-9 gives finite cards and one regime each side of the tolerance', () => {
    for (const scale of [1 - 1e-9, 1 - 1e-12, 1, 1 + 1e-12, 1 + 1e-9]) {
      const params = { k: 100, b: 20 * scale, m: 1 };
      const run = buildRun(params, [0.15]);
      for (const t of SAMPLE_TIMES) {
        expect(Number.isFinite(springAt(run, t).x)).toBe(true);
        expect(Number.isFinite(springAt(run, t).v)).toBe(true);
      }
      expect(Number.isFinite(run.duration)).toBe(true);
    }
    expect(dampingRegime({ k: 100, b: 20 * (1 + 1e-12), m: 1 })).toBe('critico');
  });
});

describe('the events of the run', () => {
  test('Motion’s default: the first overshoot («Pico») and the 2 % settling', () => {
    const markers = runMarkers(buildRun(MOTION_DEFAULT, []));

    expect(markers.map(({ label, kind }) => ({ label, kind }))).toEqual([
      { label: 'Pico', kind: 'peak' },
      { label: 'Asentamiento', kind: undefined },
    ]);
    expect(markers[0].t).toBeCloseTo(0.3628, 4);
    expect(markers[1].t).toBe(settlingTime(MOTION_DEFAULT, STEP, 0, 0.02, TRAVEL_PX));
  });

  test('a press before the peak drops it and settles the new leg after t*', () => {
    const run = buildRun(MOTION_DEFAULT, [0.2]);
    const leg = run.spring[1];

    expect(runMarkers(run)).toEqual([
      { t: 0.2, label: 'Interrupción' },
      {
        t: 0.2 + settlingTime(MOTION_DEFAULT, leg.u0, leg.v0, 0.02, TRAVEL_PX),
        label: 'Asentamiento',
      },
    ]);
  });

  test('critical and overdamped springs have no peak; b = 0 has a peak and never settles', () => {
    expect(runMarkers(buildRun(OVERDAMPED, [])).map(({ label }) => label)).toEqual([
      'Asentamiento',
    ]);
    const undamped = runMarkers(buildRun(UNDAMPED, []));
    expect(undamped).toEqual([{ t: Math.PI / 10, label: 'Pico', kind: 'peak' }]);
  });

  test('a press at rest starts a leg from rest, with its own peak', () => {
    const run = buildRun(MOTION_DEFAULT, [2.9]);

    expect(runMarkers(run).map(({ label }) => label)).toEqual([
      'Pico',
      'Asentamiento',
      'Interrupción',
      'Pico',
      'Asentamiento',
    ]);
  });
});

describe('the curves of x(t)', () => {
  test('sample both cards over the run, with every press and every curve end on the grid', () => {
    // Arrange
    const run = buildRun(MOTION_DEFAULT, [0.2]);

    // Act
    const { spring, bezier } = runCurves(run, 100);

    // Assert
    const times = spring.map((point) => point.x);
    expect(times[0]).toBe(0);
    expect(times.at(-1)).toBe(run.duration);
    expect(times).toContain(0.2);
    expect(times).toContain(run.bezier[0].duration);
    expect(times).toContain(0.2 + run.bezier[1].duration);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(times).size).toBe(times.length);
    spring.forEach(({ x, y }) => expect(y).toBe(springAt(run, x).x));
    bezier.forEach(({ x, y }) => expect(y).toBe(bezierAt(run, x).x));
  });
});
