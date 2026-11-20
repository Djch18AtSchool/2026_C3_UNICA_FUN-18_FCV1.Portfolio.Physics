/**
 * Pure model of Tema 10's laboratory: a card that a damped spring moves between two marks of a
 * track, and beside it a card moved by a fixed-duration ease-in-out curve over the same travel.
 * The run is a list of legs: the plain step from 100 px to 1 000 px and, after each «Interrumpir»
 * at a clock time t*, a leg towards the other mark. The spring restarts (10.9) from its own x and
 * v at t*, sampled from the analytic solution (10.6) of src/lib/physics/dampedSpring.ts (never
 * integrated); the curve restarts from its own position at rest. Research
 * docs/superpowers/research/2026-11-17-animaciones-resorte.md §4 and §8.
 */
import { cubicBezier, EASE_IN_OUT } from '../../../lib/cubicBezier';
import {
  dampingRatio,
  isSpringAtRest,
  naturalAngularFrequency,
  peakTime,
  settlingTime,
  springState,
  type SpringParams,
} from '../../../lib/physics/dampedSpring';
import { requireNonNegative } from '../../../lib/physics/validate';
import type { TransportMarker } from '../../lab/transportMarkers';
import { BAND_EPSILON, TRAVEL, type XY } from './springPlots';

/** The two marks of the track, Motion's test keyframes as in the figures (px). */
export const MARKS = TRAVEL;
/** The distance between the marks: every band and every t_s is relative to it (ruling R6). */
export const TRAVEL_PX = Math.abs(MARKS.to - MARKS.from);
/** The clock's band: a leg lasts until the spring stays within 0,2 % of the travel. */
export const RUN_EPSILON = 0.002;
/** Every leg plays for 3 s at least and 6 s at most (Infinity, b = 0, gives 6). */
export const MIN_LEG_S = 3;
export const MAX_LEG_S = 6;
/**
 * Motion's rest thresholds, `restDeltaDefault = 0.5` px and `restSpeedDefault = 2` px/s (Motion
 * v14.14.0, generators/spring.ts L32-L35): within both, a press finds the spring at rest (10.11).
 */
export const MOTION_REST = { delta: 0.5, speed: 2 } as const;
/** Samples of each drawn curve, before the legs' own instants are added: at least this many, */
const MIN_CURVE_SAMPLES = 600;
/** and at least this many per period of ω′, so a stiff spring's oscillation never aliases, */
const SAMPLES_PER_PERIOD = 16;
/** but never more than this (a run grown by many presses). */
const MAX_CURVE_SAMPLES = 4000;

const EASING = cubicBezier(...EASE_IN_OUT);

/** A leg of the spring: from clock time `start`, towards `target`, from offset u₀ and speed v₀. */
export interface SpringLeg {
  start: number;
  target: number;
  u0: number;
  v0: number;
}

/** A leg of the fixed-duration curve: from `from` to `to` in `duration` s, starting at rest. */
export interface BezierLeg {
  start: number;
  from: number;
  to: number;
  duration: number;
}

export interface SpringRun {
  params: SpringParams;
  /** The clock times of the presses, in order. */
  retargets: readonly number[];
  spring: readonly SpringLeg[];
  bezier: readonly BezierLeg[];
  /** The clock's duration, s. */
  duration: number;
}

export interface CardState {
  x: number;
  v: number;
}

export interface SpringCards {
  spring: CardState & { target: number };
  bezier: CardState;
}

/** A velocity before and after an instant. */
export interface Jump {
  before: number;
  after: number;
}

export interface VelocityJump {
  t: number;
  spring: Jump;
  bezier: Jump;
}

const otherMark = (target: number) => (target === MARKS.to ? MARKS.from : MARKS.to);

/** Apple's perceptual duration d = 2π/ω₀ of (10.10), s. */
export function perceptualDuration(params: SpringParams): number {
  return (2 * Math.PI) / naturalAngularFrequency(params);
}

/**
 * A leg's 2 % settling time, from its start (s): the band is a share of the travel between the
 * marks, also after a press (ruling R6). Infinity without damping, 0 when it never leaves the band.
 */
export function legSettle(params: SpringParams, { u0, v0 }: Pick<SpringLeg, 'u0' | 'v0'>): number {
  return settlingTime(params, u0, v0, BAND_EPSILON, TRAVEL_PX);
}

/**
 * How long the curve lasts on a leg: the spring's 2 % settling time for that leg, relative to the
 * travel, so both cards start and end together on a plain step. When the spring never settles
 * (b = 0) or never leaves the band (t_s = 0), the curve lasts d = 2π/ω₀ instead: it always moves.
 */
export function comparisonDuration(params: SpringParams, u0: number, v0: number): number {
  const settle = legSettle(params, { u0, v0 });
  return Number.isFinite(settle) && settle > 0 ? settle : perceptualDuration(params);
}

/** How long a leg plays: its 0,2 % settling time within [MIN_LEG_S, MAX_LEG_S]. */
function legSpan(params: SpringParams, leg: SpringLeg): number {
  const settle = settlingTime(params, leg.u0, leg.v0, RUN_EPSILON, TRAVEL_PX);
  return Math.min(MAX_LEG_S, Math.max(MIN_LEG_S, settle));
}

function legState(params: SpringParams, leg: SpringLeg, t: number): CardState {
  const { u, v } = springState(params, leg.u0, leg.v0, Math.max(0, t - leg.start));
  return { x: leg.target + u, v };
}

/** x = x₀ + Δ·progress(f), v = Δ·slope(f)/T with f = (t − start)/T; a −0 velocity reads as 0. */
function bezierState(leg: BezierLeg, t: number): CardState {
  const span = leg.to - leg.from;
  const fraction = (t - leg.start) / leg.duration;
  const v = (span * EASING.slope(fraction)) / leg.duration;
  return { x: leg.from + span * EASING.progress(fraction), v: v === 0 ? 0 : v };
}

/**
 * Where the spring restarts at t: its own x and v (10.9) or, when it is at rest by Motion's
 * thresholds (10.11), exactly on its target with v = 0.
 */
function restartState(params: SpringParams, leg: SpringLeg, t: number): CardState {
  const { u, v } = springState(params, leg.u0, leg.v0, t - leg.start);
  return isSpringAtRest(u, v, MOTION_REST.delta, MOTION_REST.speed)
    ? { x: leg.target, v: 0 }
    : { x: leg.target + u, v };
}

interface Legs {
  spring: readonly SpringLeg[];
  bezier: readonly BezierLeg[];
}

/** The legs after one more press at t: the spring turns to the other mark, the curve restarts. */
function addLeg(params: SpringParams, { spring, bezier }: Legs, t: number): Legs {
  const previous = spring[spring.length - 1];
  const restart = restartState(params, previous, t);
  const target = otherMark(previous.target);
  const leg = { start: t, target, u0: restart.x - target, v0: restart.v };
  const curve = bezierState(bezier[bezier.length - 1], t);
  const duration = comparisonDuration(params, leg.u0, leg.v0);
  return {
    spring: [...spring, leg],
    bezier: [...bezier, { start: t, from: curve.x, to: target, duration }],
  };
}

function requireOrdered(retargets: readonly number[]): void {
  retargets.forEach((t, i) => {
    requireNonNegative('retarget', t);
    if (i > 0 && t < retargets[i - 1]) {
      throw new RangeError(`retargets must be in order, got ${retargets.join(', ')}`);
    }
  });
}

/** The run of a spring with presses at the clock times `retargets` (s, in order). */
export function buildRun(params: SpringParams, retargets: readonly number[]): SpringRun {
  requireOrdered(retargets);
  const first: SpringLeg = { start: 0, target: MARKS.to, u0: MARKS.from - MARKS.to, v0: 0 };
  const firstCurve: BezierLeg = {
    start: 0,
    from: MARKS.from,
    to: MARKS.to,
    duration: comparisonDuration(params, first.u0, 0),
  };
  const legs = retargets.reduce((acc, t) => addLeg(params, acc, t), {
    spring: [first],
    bezier: [firstCurve],
  } as Legs);
  const duration = Math.max(...legs.spring.map((leg) => leg.start + legSpan(params, leg)));
  return { params, retargets, ...legs, duration };
}

/** The presses after one more at t*: those after it are dropped (the run is rewritten from t*). */
export function withRetarget(retargets: readonly number[], tStar: number): number[] {
  requireNonNegative('tStar', tStar);
  return [...retargets.filter((t) => t <= tStar), tStar];
}

/** The index of the leg that holds clock time t: the last one started by then. */
function legIndexAt(legs: readonly { start: number }[], t: number): number {
  return Math.max(
    0,
    legs.findLastIndex((leg) => leg.start <= t),
  );
}

export function springAt(run: SpringRun, t: number): CardState & { target: number } {
  const leg = run.spring[legIndexAt(run.spring, t)];
  return { ...legState(run.params, leg, t), target: leg.target };
}

export function bezierAt(run: SpringRun, t: number): CardState {
  return bezierState(run.bezier[legIndexAt(run.bezier, t)], t);
}

export function cardsAt(run: SpringRun, t: number): SpringCards {
  return { spring: springAt(run, t), bezier: bezierAt(run, t) };
}

/** The curve's leg at clock time t (its duration names the curve's lane). */
export function bezierLegAt(run: SpringRun, t: number): BezierLeg {
  return run.bezier[legIndexAt(run.bezier, t)];
}

/** The velocities of both cards just before and just after the last press; none without one. */
export function lastJump(run: SpringRun): VelocityJump | undefined {
  const count = run.spring.length;
  if (count < 2) return undefined;
  const leg = run.spring[count - 1];
  return {
    t: leg.start,
    spring: { before: legState(run.params, run.spring[count - 2], leg.start).v, after: leg.v0 },
    bezier: { before: bezierState(run.bezier[count - 2], leg.start).v, after: 0 },
  };
}

/** The events of one leg that happen before it ends: its peak from rest and its 2 % settling. */
function legMarkers(params: SpringParams, leg: SpringLeg, end: number): TransportMarker[] {
  const peak = leg.start + peakTime(params);
  const hasPeak = leg.v0 === 0 && dampingRatio(params) < 1 && peak < end;
  const settle = leg.start + legSettle(params, leg);
  const hasSettle = Number.isFinite(settle) && settle > leg.start && settle < end;
  return [
    ...(leg.start > 0 ? [{ t: leg.start, label: 'Interrupción' }] : []),
    ...(hasPeak ? [{ t: peak, label: 'Pico', kind: 'peak' as const }] : []),
    ...(hasSettle ? [{ t: settle, label: 'Asentamiento' }] : []),
  ];
}

/**
 * The transport's events: each press («Interrupción»), the first overshoot of a leg that starts
 * from rest («Pico», t_p of (10.7), only for ζ < 1) and each leg's entry into the 2 % band for good
 * («Asentamiento»), when it happens before the next press.
 */
export function runMarkers(run: SpringRun): TransportMarker[] {
  return run.spring.flatMap((leg, i) =>
    legMarkers(run.params, leg, run.spring[i + 1]?.start ?? run.duration),
  );
}

/** Every instant a curve turns a corner: the presses and the end of each leg of the curve. */
function cornerTimes(run: SpringRun): number[] {
  return run.bezier.flatMap((leg) => [leg.start, leg.start + leg.duration]);
}

/**
 * How many even samples a run's curves take: MIN_CURVE_SAMPLES, or SAMPLES_PER_PERIOD per period
 * of ω′ = ω₀√(1 − ζ²) when the spring oscillates (ζ < 1), within MAX_CURVE_SAMPLES.
 */
export function curveSamples(run: SpringRun): number {
  const zeta = dampingRatio(run.params);
  if (!(zeta < 1)) return MIN_CURVE_SAMPLES;
  const omega = naturalAngularFrequency(run.params) * Math.sqrt(1 - zeta * zeta);
  const needed = Math.ceil((SAMPLES_PER_PERIOD * run.duration * omega) / (2 * Math.PI));
  return Math.min(MAX_CURVE_SAMPLES, Math.max(MIN_CURVE_SAMPLES, needed));
}

/** x(t) of both cards over the run: an even grid plus every corner, in order and once each. */
export function runCurves(
  run: SpringRun,
  samples = curveSamples(run),
): { spring: XY[]; bezier: XY[] } {
  const grid = Array.from({ length: samples + 1 }, (_, i) => (run.duration * i) / samples);
  const corners = cornerTimes(run).filter((t) => t <= run.duration);
  const times = [...new Set([...grid, ...corners])].sort((a, b) => a - b);
  return {
    spring: times.map((t) => ({ x: t, y: springAt(run, t).x })),
    bezier: times.map((t) => ({ x: t, y: bezierAt(run, t).x })),
  };
}
