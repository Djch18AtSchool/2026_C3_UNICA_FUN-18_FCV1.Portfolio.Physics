/**
 * Data of Tema 10's step figures, from the damped spring core (src/lib/physics/dampedSpring.ts)
 * and Motion's own values: the undamped cosine (Paso 1), the damped curve with its envelope
 * (Paso 2), Motion's three tests as the three regimes (Paso 3) and an interruption of the spring
 * against a fixed-duration Bézier (Paso 4). Research
 * docs/superpowers/research/2026-11-17-animaciones-resorte.md §4 and §5.
 */
import { CHART_COLORS } from '../../charts/chartTheme';
import { cubicBezier, EASE_IN_OUT } from '../../../lib/cubicBezier';
import { SPRING_PRESETS } from '../../../lib/data/springPresets';
import { MOTION_SPRING_TESTS, type MotionSpringTest } from '../../../lib/data/springReferences';
import {
  dampingRatio,
  naturalAngularFrequency,
  settlingTime,
  springState,
  type DampingRegime,
  type SpringParams,
} from '../../../lib/physics/dampedSpring';

export type XY = { x: number; y: number };

/**
 * Each regime wears one color in every figure of the topic (meaning, never series order); the
 * spring of Pasos 2 and 4 is underdamped, so it wears the underdamped color.
 */
export const REGIME_COLORS: Readonly<Record<DampingRegime, string>> = {
  'sin-amortiguar': CHART_COLORS[5],
  subamortiguado: CHART_COLORS[0],
  critico: CHART_COLORS[2],
  sobreamortiguado: CHART_COLORS[3],
};
/** The fixed-duration curve that Paso 4 sets against the spring. */
export const BEZIER_COLOR = CHART_COLORS[1];
/** The rest band's fill and the dash of every guide (a target, a mark, an instant), in every drawing. */
export const BAND_OPACITY = 0.18;
export const GUIDE_DASH = '4 4';

/** The keyframes of Motion's three tests, [100, 1000]: every figure travels them. */
const [{ from: TRAVEL_FROM, to: TRAVEL_TO }] = MOTION_SPRING_TESTS;
export const TRAVEL = { from: TRAVEL_FROM, to: TRAVEL_TO } as const;
/** The rest band of the figures: the target ± 2 % of the travel (research §4, t_s at 2 %). */
export const BAND_EPSILON = 0.02;
/** Intervals per drawn curve: under a pixel apart at the column's width. */
const SAMPLES = 480;

const OFFSET = TRAVEL.from - TRAVEL.to;

function presetParams(id: string): SpringParams {
  const preset = SPRING_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`springPlots: falta el preajuste ${id}`);
  return preset.params;
}

/** `samples` + 1 evenly spaced instants from 0 to `end`. */
const instants = (end: number, samples: number) =>
  Array.from({ length: samples + 1 }, (_, i) => (end * i) / samples);

/** The band x_obj ± ε·|x_obj − x₀|. */
export function restBand(from: number, to: number, epsilon: number): { low: number; high: number } {
  const half = epsilon * Math.abs(to - from);
  return { low: to - half, high: to + half };
}

/** x(t) = x_obj + u(t) from rest at `from`, on [0, end]: (10.6) through the core. */
export function springCurve(
  params: SpringParams,
  from: number,
  to: number,
  end: number,
  samples: number,
): XY[] {
  return instants(end, samples).map((t) => ({
    x: t,
    y: to + springState(params, from - to, 0, t).u,
  }));
}

// ---------------------------------------------------------------------------------------------
// Paso 1: Hooke without damping
// ---------------------------------------------------------------------------------------------

/** Motion's default stiffness and mass (spring.ts L22, L24) with b = 0: «will run forever». */
const LIBRE_PARAMS: SpringParams = { ...presetParams('motion-defecto'), b: 0 };
/** Three periods and a little more. */
const LIBRE_END = 2;

export const LIBRE = {
  params: LIBRE_PARAMS,
  tEnd: LIBRE_END,
  period: (2 * Math.PI) / naturalAngularFrequency(LIBRE_PARAMS),
  curve: springCurve(LIBRE_PARAMS, TRAVEL.from, TRAVEL.to, LIBRE_END, SAMPLES),
} as const;

// ---------------------------------------------------------------------------------------------
// Paso 2: the damped spring and its envelope
// ---------------------------------------------------------------------------------------------

const AMORTIGUADO_PARAMS = presetParams('motion-defecto');
/** Past the 2 % settling time (0,81 s) with room to see the curve stay in the band. */
const AMORTIGUADO_END = 1.5;

/** x_obj ± A₀ e^(−ζω₀t) with A₀ = |u₀|/√(1 − ζ²): the amplitude of u from rest (ζ < 1). */
function envelope(params: SpringParams, sign: 1 | -1, times: readonly number[]): XY[] {
  const zeta = dampingRatio(params);
  const decay = zeta * naturalAngularFrequency(params);
  const amplitude = Math.abs(OFFSET) / Math.sqrt(1 - zeta * zeta);
  return times.map((t) => ({ x: t, y: TRAVEL.to + sign * amplitude * Math.exp(-decay * t) }));
}

const AMORTIGUADO_TIMES = instants(AMORTIGUADO_END, SAMPLES);

export const AMORTIGUADO = {
  params: AMORTIGUADO_PARAMS,
  tEnd: AMORTIGUADO_END,
  curve: springCurve(AMORTIGUADO_PARAMS, TRAVEL.from, TRAVEL.to, AMORTIGUADO_END, SAMPLES),
  envelope: {
    upper: envelope(AMORTIGUADO_PARAMS, 1, AMORTIGUADO_TIMES),
    lower: envelope(AMORTIGUADO_PARAMS, -1, AMORTIGUADO_TIMES),
  },
  settling: settlingTime(AMORTIGUADO_PARAMS, OFFSET, 0, BAND_EPSILON),
} as const;

// ---------------------------------------------------------------------------------------------
// Paso 3: the three regimes, as Motion's own tests
// ---------------------------------------------------------------------------------------------

export interface RegimeCase {
  id: MotionSpringTest['id'];
  test: MotionSpringTest;
  zeta: number;
  curve: XY[];
  /** The curve at the test's sampling instants: rounded, they are the test's expected values. */
  checks: XY[];
}

/** The overdamped test's last sample, 13 × 0,2 s. */
const REGIMES_END = 2.6;

export const REGIMES: readonly RegimeCase[] = MOTION_SPRING_TESTS.map((test) => ({
  id: test.id,
  test,
  zeta: dampingRatio(test.params),
  curve: springCurve(test.params, test.from, test.to, REGIMES_END, SAMPLES),
  checks: test.expected.map((_, i) => {
    const t = i * test.stepS;
    return { x: t, y: test.to + springState(test.params, test.from - test.to, 0, t).u };
  }),
}));

// ---------------------------------------------------------------------------------------------
// Paso 4: interrupting the spring and a fixed-duration Bézier
// ---------------------------------------------------------------------------------------------

/** Motion's default transition for x and y, 500 and 25 (default-transitions.ts L4-L9). */
const INTERRUPTION_PARAMS = presetParams('motion-xy');
/** The Bézier lasts the spring's 2 % settling time: uninterrupted, both arrive together. */
const BEZIER_DURATION = settlingTime(INTERRUPTION_PARAMS, OFFSET, 0, BAND_EPSILON);
/** The retarget, mid-flight: the target goes back to the start. */
const RETARGET_AT = 0.1;
const INTERRUPTION_END = 0.7;
const EASING = cubicBezier(...EASE_IN_OUT);

/** The value before and after an instant: equal for the spring, apart for the Bézier. */
export interface Jump {
  before: number;
  after: number;
}

export interface Trace {
  position: XY[];
  /** Two samples at the retarget, before and after: a jump shows as a vertical step. */
  velocity: XY[];
  jump: Jump;
}

/** A plotting grid with the retarget and the Bézier's end on it, each once. */
const INTERRUPTION_TIMES = [
  ...new Set([...instants(INTERRUPTION_END, SAMPLES), RETARGET_AT, RETARGET_AT + BEZIER_DURATION]),
].sort((a, b) => a - b);

/** A trace from a state function that switches legs at the retarget. */
function trace(
  first: (t: number) => { x: number; v: number },
  second: (t: number) => { x: number; v: number },
): Trace {
  const state = (t: number) => (t <= RETARGET_AT ? first(t) : second(t));
  const jump = { before: first(RETARGET_AT).v, after: second(RETARGET_AT).v };
  return {
    position: INTERRUPTION_TIMES.map((t) => ({ x: t, y: state(t).x })),
    velocity: INTERRUPTION_TIMES.flatMap((t) =>
      t === RETARGET_AT
        ? [
            { x: t, y: jump.before },
            { x: t, y: jump.after },
          ]
        : [{ x: t, y: state(t).v }],
    ),
    jump,
  };
}

/** (10.9): the spring restarts towards the new target from its own x and v at t*. */
function springTrace(): Trace {
  const toTarget = (t: number) => springState(INTERRUPTION_PARAMS, OFFSET, 0, t);
  const atRetarget = toTarget(RETARGET_AT);
  const restartOffset = TRAVEL.to + atRetarget.u - TRAVEL.from;
  return trace(
    (t) => {
      const { u, v } = toTarget(t);
      return { x: TRAVEL.to + u, v };
    },
    (t) => {
      const { u, v } = springState(
        INTERRUPTION_PARAMS,
        restartOffset,
        atRetarget.v,
        t - RETARGET_AT,
      );
      return { x: TRAVEL.from + u, v };
    },
  );
}

/** A Bézier leg from `start` to `end` that begins at `t0`: x and v. A −0 velocity reads as 0. */
function bezierLeg(start: number, end: number, t0: number) {
  return (t: number) => {
    const fraction = (t - t0) / BEZIER_DURATION;
    const v = ((end - start) * EASING.slope(fraction)) / BEZIER_DURATION;
    return { x: start + (end - start) * EASING.progress(fraction), v: v === 0 ? 0 : v };
  };
}

/** The fixed-duration curve restarts from its own position, from rest, with its full duration. */
function bezierTrace(): Trace {
  const first = bezierLeg(TRAVEL.from, TRAVEL.to, 0);
  return trace(first, bezierLeg(first(RETARGET_AT).x, TRAVEL.from, RETARGET_AT));
}

export const INTERRUPTION = {
  params: INTERRUPTION_PARAMS,
  duration: BEZIER_DURATION,
  easing: EASE_IN_OUT,
  tStar: RETARGET_AT,
  tEnd: INTERRUPTION_END,
  spring: springTrace(),
  bezier: bezierTrace(),
} as const;
