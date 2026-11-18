import { describe, expect, test } from 'vitest';
import { MOTION_SPRING_TESTS } from '../../../lib/data/springReferences';
import {
  dampingRatio,
  naturalAngularFrequency,
  settlingTime,
  springState,
} from '../../../lib/physics/dampedSpring';
import {
  AMORTIGUADO,
  BAND_EPSILON,
  INTERRUPTION,
  LIBRE,
  REGIMES,
  restBand,
  springCurve,
  TRAVEL,
} from './springPlots';

const { from, to } = TRAVEL;
const offset = from - to;
const isInside = (x: number, band: { low: number; high: number }) =>
  x >= band.low && x <= band.high;

describe('the shared travel and band', () => {
  test("travel from 100 to 1 000, as Motion's own tests", () => {
    expect(TRAVEL).toEqual({ from: 100, to: 1000 });
  });

  test('the rest band is the target ± 2 % of the travel', () => {
    expect(BAND_EPSILON).toBe(0.02);
    expect(restBand(from, to, BAND_EPSILON)).toEqual({ low: 982, high: 1018 });
  });

  test('springCurve samples x = x_obj + u(t) of the core, evenly from 0 to the end', () => {
    // Arrange
    const params = { k: 100, b: 10, m: 1 };

    // Act
    const curve = springCurve(params, from, to, 1, 4);

    // Assert
    expect(curve.map((point) => point.x)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    curve.forEach(({ x, y }) => expect(y).toBeCloseTo(to + springState(params, offset, 0, x).u, 9));
    expect(curve[0].y).toBe(from);
  });
});

describe('Paso 1: the undamped spring', () => {
  test("uses Motion's default k and m with b = 0: ω₀ = 10 rad/s and T₀ = 0,63 s", () => {
    expect(LIBRE.params).toEqual({ k: 100, b: 0, m: 1 });
    expect(LIBRE.period).toBeCloseTo((2 * Math.PI) / 10, 12);
  });

  test('is the cosine x = x_obj + u₀ cos ω₀t of (10.2)', () => {
    LIBRE.curve.forEach(({ x: t, y }) => expect(y).toBeCloseTo(to + offset * Math.cos(10 * t), 6));
  });

  test('never settles: every period it is back at the start, outside the band, with no decay', () => {
    const band = restBand(from, to, BAND_EPSILON);
    const periods = Math.floor(LIBRE.tEnd / LIBRE.period);

    expect(periods).toBeGreaterThanOrEqual(3);
    for (let n = 1; n <= periods; n++) {
      const start = to + springState(LIBRE.params, offset, 0, n * LIBRE.period).u;
      const far = to + springState(LIBRE.params, offset, 0, (n - 0.5) * LIBRE.period).u;
      expect(start).toBeCloseTo(from, 6);
      expect(far).toBeCloseTo(2 * to - from, 6);
      expect(isInside(start, band) || isInside(far, band)).toBe(false);
    }
    expect(settlingTime(LIBRE.params, offset, 0, BAND_EPSILON)).toBe(Infinity);
    // The tail of the plot still swings the full travel: it never stays in the band.
    const tail = LIBRE.curve.filter(({ x }) => x > LIBRE.tEnd - LIBRE.period);
    expect(Math.max(...tail.map(({ y }) => y)) - Math.min(...tail.map(({ y }) => y))).toBeCloseTo(
      2 * (to - from),
      -1,
    );
  });
});

describe('Paso 2: the damped spring and its envelope', () => {
  test("uses Motion's defaults, 100, 10 and 1: ζ = 0,5", () => {
    expect(AMORTIGUADO.params).toEqual({ k: 100, b: 10, m: 1 });
    expect(dampingRatio(AMORTIGUADO.params)).toBe(0.5);
  });

  test('the envelope is x_obj ± A₀ e^(−ζω₀t), with A₀ = |u₀|/√(1 − ζ²)', () => {
    const zeta = 0.5;
    const w0 = 10;
    const a0 = Math.abs(offset) / Math.sqrt(1 - zeta * zeta);

    AMORTIGUADO.envelope.upper.forEach(({ x: t, y }) =>
      expect(y).toBeCloseTo(to + a0 * Math.exp(-zeta * w0 * t), 9),
    );
    AMORTIGUADO.envelope.lower.forEach(({ x: t, y }) =>
      expect(y).toBeCloseTo(to - a0 * Math.exp(-zeta * w0 * t), 9),
    );
  });

  test('the curve stays between the envelopes and touches them', () => {
    const ratios = AMORTIGUADO.curve.map(({ x: t, y }, i) => {
      const upper = AMORTIGUADO.envelope.upper[i];
      const lower = AMORTIGUADO.envelope.lower[i];
      expect(upper.x).toBe(t);
      expect(y).toBeLessThanOrEqual(upper.y + 1e-9);
      expect(y).toBeGreaterThanOrEqual(lower.y - 1e-9);
      return Math.abs(y - to) / (upper.y - to);
    });

    expect(Math.max(...ratios)).toBeGreaterThan(0.99);
  });

  test('enters the 2 % band for good at the settling time of the core, 0,81 s', () => {
    const band = restBand(from, to, BAND_EPSILON);

    expect(AMORTIGUADO.settling).toBeCloseTo(settlingTime(AMORTIGUADO.params, offset, 0, 0.02), 12);
    expect(AMORTIGUADO.settling).toBeCloseTo(0.808, 3);
    expect(AMORTIGUADO.curve.filter(({ x }) => x > AMORTIGUADO.settling + 1e-9)).not.toEqual([]);
    AMORTIGUADO.curve
      .filter(({ x }) => x > AMORTIGUADO.settling + 1e-9)
      .forEach(({ y }) => expect(isInside(y, band)).toBe(true));
  });
});

describe('Paso 3: the three regimes', () => {
  test("are Motion's three tests, from the same u₀: under, critically and overdamped", () => {
    expect(REGIMES.map(({ id }) => id)).toEqual(['subamortiguado', 'critico', 'sobreamortiguado']);
    expect(REGIMES.map(({ test }) => test)).toEqual(MOTION_SPRING_TESTS);
    REGIMES.forEach(({ test: { from: start, to: target } }) => {
      expect([start, target]).toEqual([from, to]);
    });
    expect(REGIMES.map(({ zeta }) => zeta.toFixed(3))).toEqual(['0.289', '1.000', '2.887']);
  });

  test("each curve, rounded at Motion's sampling instants, gives the values its test expects", () => {
    REGIMES.forEach(({ checks, test: { expected, stepS } }) => {
      expect(checks.map(({ x }) => x)).toEqual(expected.map((_, i) => i * stepS));
      expect(checks.map(({ y }) => Math.round(y))).toEqual(expected);
    });
  });

  test('the underdamped curve overshoots the target; the other two never do', () => {
    const [under, critical, over] = REGIMES;

    expect(Math.max(...under.curve.map(({ y }) => y))).toBeGreaterThan(to);
    for (const regime of [critical, over]) {
      regime.curve.forEach(({ y }) => expect(y).toBeLessThanOrEqual(to + 1e-9));
    }
  });

  test('with a 2 % band, ζ = 0,8 settles before the critical spring (research §4: 3,76 and 5,83 over ω₀)', () => {
    const [nearCritical, critical] = [0.8, 1].map((zeta) =>
      settlingTime({ k: 1, b: 2 * zeta, m: 1 }, -1, 0, BAND_EPSILON),
    );

    expect(nearCritical).toBeLessThan(critical);
    expect(nearCritical.toFixed(2)).toBe('3.76');
    expect(critical.toFixed(2)).toBe('5.83');
  });

  test('each curve is the core state of its own spring', () => {
    REGIMES.forEach(({ test: { params }, curve }) =>
      curve.forEach(({ x: t, y }) =>
        expect(y).toBeCloseTo(to + springState(params, offset, 0, t).u, 9),
      ),
    );
  });
});

describe('Paso 4: interrupting the spring and a fixed-duration curve', () => {
  const { tStar, spring, bezier, duration, params } = INTERRUPTION;
  /** Every sample at t: a series that jumps at t holds the value before and the value after. */
  const valuesAt = (points: readonly { x: number; y: number }[], t: number) =>
    points.filter(({ x }) => Math.abs(x - t) < 1e-12).map(({ y }) => y);
  const at = (points: readonly { x: number; y: number }[], t: number) => {
    const [value] = valuesAt(points, t);
    if (value === undefined) throw new Error(`no sample at ${t}`);
    return value;
  };

  test("uses Motion's default transition for x, 500 and 25, and a Bézier as long as its 2 % settling", () => {
    expect(params).toEqual({ k: 500, b: 25, m: 1 });
    expect(duration).toBeCloseTo(settlingTime(params, offset, 0, BAND_EPSILON), 12);
    expect(INTERRUPTION.easing).toEqual([0.42, 0, 0.58, 1]);
    expect(tStar).toBe(0.1);
    expect(tStar).toBeLessThan(duration);
  });

  test('before the retarget the spring is the core state towards 1 000', () => {
    spring.position
      .filter(({ x }) => x <= tStar)
      .forEach(({ x: t, y }) => expect(y).toBeCloseTo(to + springState(params, offset, 0, t).u, 9));
  });

  test('the spring keeps x and v at the retarget (10.9): its velocity does not jump', () => {
    expect(spring.jump.after).toBeCloseTo(spring.jump.before, 9);
    expect(spring.jump.before).toBeGreaterThan(1000);
    const [before, after] = valuesAt(spring.velocity, tStar);
    expect(before).toBeCloseTo(spring.jump.before, 9);
    expect(after).toBeCloseTo(spring.jump.after, 9);
    expect(valuesAt(spring.position, tStar)).toHaveLength(1);
  });

  test('after the retarget the spring heads back to 100 from its state at t*', () => {
    const state = springState(params, offset, 0, tStar);
    const x0 = to + state.u;
    spring.position
      .filter(({ x }) => x > tStar)
      .forEach(({ x: t, y }) =>
        expect(y).toBeCloseTo(from + springState(params, x0 - from, state.v, t - tStar).u, 9),
      );
    expect(spring.position.at(-1)?.y).toBeCloseTo(from, -1);
  });

  test('the Bézier restarts from rest at its own position: its velocity jumps to 0', () => {
    expect(bezier.jump.before).toBeGreaterThan(1000);
    expect(bezier.jump.after).toBe(0);
    expect(valuesAt(bezier.velocity, tStar)).toEqual([bezier.jump.before, 0]);
    // No jump in position: one sample at t*, and the curve restarts where it was.
    expect(valuesAt(bezier.position, tStar)).toHaveLength(1);
    const before = bezier.position.filter(({ x }) => x < tStar).at(-1);
    const restart = at(bezier.position, tStar);
    expect(Math.abs(restart - (before?.y ?? NaN))).toBeLessThan(0.02 * (to - from));
  });

  test('the Bézier ends at 100 exactly one duration after the retarget, and rests there', () => {
    expect(at(bezier.position, tStar + duration)).toBeCloseTo(from, 9);
    bezier.position
      .filter(({ x }) => x >= tStar + duration)
      .forEach(({ y }) => expect(y).toBeCloseTo(from, 9));
  });

  test('both start at 100 at rest, and the spring is faster off the mark', () => {
    expect(at(spring.position, 0)).toBe(from);
    expect(at(bezier.position, 0)).toBe(from);
    expect(at(spring.velocity, 0)).toBe(0);
    expect(at(bezier.velocity, 0)).toBe(0);
    expect(at(spring.position, tStar)).toBeGreaterThan(at(bezier.position, tStar));
  });

  test('the caption numbers: 0,26 s of Bézier, about 6 680 px/s kept and 5 330 px/s lost', () => {
    expect(duration.toFixed(2)).toBe('0.26');
    expect(Math.round(spring.jump.before / 10) * 10).toBe(6680);
    expect(Math.round(bezier.jump.before / 10) * 10).toBe(5330);
  });

  test('the natural angular frequency of the plotted spring is ω₀ = √500', () => {
    expect(naturalAngularFrequency(params)).toBeCloseTo(Math.sqrt(500), 12);
  });
});
