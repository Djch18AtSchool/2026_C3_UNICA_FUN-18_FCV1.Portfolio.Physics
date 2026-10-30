/**
 * Pure model of the bounce laboratory: the exact ideal ball (idealBallAt and its impact events),
 * the engine run (engineStep frame by frame), their y(t) and E(t) series, the energy gains to mark,
 * the threshold's prediction with exact events, and the scene's view helpers. SI units; +y up.
 */
import {
  bounceSeries,
  bouncesAboveThreshold,
  combineRestitution,
  engineStep,
  idealBallAt,
  restitutionAtSpeed,
  type BallState,
  type EngineParams,
  type SpeedRestitution,
} from '../../../lib/physics';
import { BOUNCE_LIMITS, SPEED_FIT, type BounceSettings } from './bouncePresets';

export type Point = { x: number; y: number };

/** Longest timeline (s): e ≥ 1 or a ball that never rests plays this window. */
export const MAX_TIMELINE_S = 15;
const MIN_TIMELINE_S = 2;
/** The timeline runs this long past the later of T and the engine's rest (s). */
const TAIL_S = 0.75;
/** Rebounds slower than this (m/s) count as rest, as in the kernel's idealBallAt. */
const MIN_REBOUND_SPEED = 1e-9;
/** Hard stop on event loops whose impacts never fall to the threshold. */
const MAX_EVENTS = 10_000;
/** A rebound gains energy when it beats its reference by 2 % and by 1 % of h₀. */
const GAIN_TOLERANCE = 0.02;
const GAIN_MIN_SHARE = 0.01;
/** Floats this close to a frame boundary belong to that frame. */
const FRAME_EPSILON = 1e-6;
/** The scene shows 15 % above h₀, rounded up to half metres. */
const SCENE_HEADROOM = 1.15;
const SCENE_GRAIN = 0.5;
/** h₀ moves in centimetres; arrows by 5 cm, Shift or Page keys by 25 cm. */
const H0_GRAIN = 0.01;
const H0_KEY_STEP = 0.05;
const H0_COARSE_STEP = 0.25;

const [H0_MIN, H0_MAX] = BOUNCE_LIMITS.h0;

/** The pair's e the engine uses: the ball's and the floor's mixed by its rule. */
export function pairRestitution(s: BounceSettings): number {
  return combineRestitution(s.e, s.floorE, s.combine);
}

const speedFit: SpeedRestitution = (v) => restitutionAtSpeed(v, SPEED_FIT.e0, SPEED_FIT.k);

/** e(v) for the ideal ball when the illustrative fit is on. */
export function idealRestitutionAt(s: BounceSettings): SpeedRestitution | undefined {
  return s.speedDependent ? speedFit : undefined;
}

/** The constant e handed to the kernel: the fit's e₀ when e(v) replaces it. */
export function idealE(s: BounceSettings): number {
  return s.speedDependent ? SPEED_FIT.e0 : s.e;
}

/** The engine's parameters; with e(v) on, each impact mixes e(|v⁻|) with the floor's e. */
export function engineParams(s: BounceSettings, g: number): EngineParams {
  const base = {
    g,
    e: pairRestitution(s),
    threshold: s.threshold,
    baumgarte: s.baumgarte,
    substeps: s.substeps,
  };
  if (!s.speedDependent) return base;
  const restitutionAt: SpeedRestitution = (v) =>
    combineRestitution(speedFit(v), s.floorE, s.combine);
  return { ...base, restitutionAt };
}

/** One impact of the ideal ball: time (s), approach and rebound speeds (m/s). */
export interface IdealImpact {
  t: number;
  vIn: number;
  vOut: number;
}

/**
 * The exact impacts of a ball dropped from h₀ up to tEnd, with the kernel's rule: e_eff = 0 at
 * or below the (strict) threshold, else e(|v⁻|) or the constant e. Ends at the impact that leaves
 * no rebound (or one slower than 1e-9 m/s).
 */
export function idealImpacts(
  h0: number,
  e: number,
  g: number,
  tEnd: number,
  threshold = 0,
  restitutionAt?: SpeedRestitution,
): IdealImpact[] {
  const impacts: IdealImpact[] = [];
  let t = Math.sqrt((2 * h0) / g);
  let vIn = g * t;
  while (t <= tEnd && impacts.length < MAX_EVENTS) {
    const eEff = vIn <= threshold ? 0 : restitutionAt ? restitutionAt(vIn) : e;
    const vOut = eEff * vIn;
    impacts.push({ t, vIn, vOut });
    if (vOut < MIN_REBOUND_SPEED) break;
    t += (2 * vOut) / g;
    vIn = vOut;
  }
  return impacts;
}

/**
 * Time to rest of the ideal ball: T = t₀(1+e)/(1−e) for a constant e (Infinity from e = 1), or
 * the sum of the flights with e(v).
 */
export function idealTotalTime(
  h0: number,
  e: number,
  g: number,
  restitutionAt?: SpeedRestitution,
): number {
  if (!restitutionAt) return bounceSeries(h0, e, g, 1).totalTime;
  const last = idealImpacts(h0, e, g, Infinity, 0, restitutionAt).at(-1);
  if (!last || last.vOut >= MIN_REBOUND_SPEED) return Infinity;
  return last.t;
}

/** E/E₀ of the ideal ball at t: 1 until the first impact, then (v_out²/2)/(g h₀). */
export function idealEnergyAt(impacts: IdealImpact[], t: number, h0: number, g: number): number {
  const last = impacts.filter((impact) => impact.t <= t).at(-1);
  return last ? (last.vOut * last.vOut) / (2 * g * h0) : 1;
}

/** y(t) through idealBallAt (on a grid plus every impact) and the E/E₀ steps, up to tEnd. */
export function idealSeries(
  s: BounceSettings,
  g: number,
  tEnd: number,
  samples: number,
): { position: Point[]; energy: Point[] } {
  const e = idealE(s);
  const at = idealRestitutionAt(s);
  const impacts = idealImpacts(s.h0, e, g, tEnd, 0, at);
  const grid = Array.from({ length: samples + 1 }, (_, i) => (tEnd * i) / samples);
  const times = [...new Set([...grid, ...impacts.map((impact) => impact.t)])].sort((a, b) => a - b);
  const position = times.map((t) => ({ x: t, y: idealBallAt(t, s.h0, e, g, undefined, at).y }));
  const steps = impacts.flatMap((impact, index) => [
    { x: impact.t, y: idealEnergyAt(impacts.slice(0, index), impact.t, s.h0, g) },
    { x: impact.t, y: idealEnergyAt(impacts, impact.t, s.h0, g) },
  ]);
  const energy = [{ x: 0, y: 1 }, ...steps, { x: tEnd, y: idealEnergyAt(impacts, tEnd, s.h0, g) }];
  return { position, energy };
}

/** An armed engine contact: frame time (s) and approach speed |v⁻| (m/s). */
export interface EngineContact {
  t: number;
  impactSpeed: number;
}

/** The engine ball frame by frame from rest at h₀. */
export interface EngineRun {
  dt: number;
  frames: BallState[];
  contacts: EngineContact[];
  /** apexes[0] = h₀; apexes[k] = highest frame of the flight after armed contact k (m). */
  apexes: number[];
  /** Time of the first frame from which every frame is at rest; Infinity if it never settles. */
  restTime: number;
}

/** Runs engineStep at Δt = 1/rate up to tMax and records contacts, apexes and the rest time. */
export function simulateEngine(s: BounceSettings, g: number, tMax: number): EngineRun {
  const dt = 1 / s.rate;
  const params = engineParams(s, g);
  const count = Math.ceil(tMax / dt - FRAME_EPSILON);
  const frames: BallState[] = [
    { t: 0, y: s.h0, v: 0, bounces: 0, lastImpactSpeed: 0, resting: false },
  ];
  const contacts: EngineContact[] = [];
  const apexes = [s.h0];
  for (let i = 1; i <= count; i += 1) {
    const frame = engineStep(frames[i - 1], params, dt);
    frames.push(frame);
    while (apexes.length <= frame.bounces) {
      contacts.push({ t: frame.t, impactSpeed: frame.lastImpactSpeed });
      apexes.push(frame.y);
    }
    apexes[frame.bounces] = Math.max(apexes[frame.bounces], frame.y);
  }
  let lastMoving = frames.length - 1;
  while (lastMoving >= 0 && frames[lastMoving].resting) lastMoving -= 1;
  const restTime = lastMoving === frames.length - 1 ? Infinity : frames[lastMoving + 1].t;
  return { dt, frames, contacts, apexes, restTime };
}

/** The last engine frame at or before t (a game draws its latest frame), clamped to the run. */
export function engineFrameAt(run: EngineRun, t: number): BallState {
  const index = Math.floor(t / run.dt + FRAME_EPSILON);
  return run.frames[Math.min(Math.max(index, 0), run.frames.length - 1)];
}

/** E/E₀ = (g y + v²/2)/(g h₀) of an engine frame (y below the floor counts, as the engine has it). */
export function engineEnergy(frame: BallState, h0: number, g: number): number {
  return (g * frame.y + (frame.v * frame.v) / 2) / (g * h0);
}

/** e measured as the drop tests do, √(h₁/h₀), from the engine's first rebound; 0 without one. */
export function measuredRestitution(run: EngineRun): number {
  const first = run.apexes[1];
  return first === undefined ? 0 : Math.sqrt(Math.max(first, 0) / run.apexes[0]);
}

/** The engine's first rebound apex h₁ (m), 0 without one. */
export function firstRebound(run: EngineRun): number {
  return Math.max(run.apexes[1] ?? 0, 0);
}

/**
 * A rebound where the engine gains energy, at its contact time with the flight's E/E₀:
 * `excess` when it rises above what e allows, (e_eff v⁻)²/2g (the Baumgarte bias of research
 * §6 b), `rise` when it climbs above the previous flight (e > 1).
 */
export interface EnergyGain {
  t: number;
  energy: number;
  kind: 'excess' | 'rise';
}

export function energyGains(run: EngineRun, s: BounceSettings, g: number): EnergyGain[] {
  const { e, restitutionAt } = engineParams(s, g);
  const minGain = GAIN_MIN_SHARE * s.h0;
  const beats = (value: number, reference: number) =>
    value - reference > Math.max(GAIN_TOLERANCE * reference, minGain);
  return run.contacts.flatMap((contact, index): EnergyGain[] => {
    const before = run.apexes[index];
    const after = run.apexes[index + 1];
    const eEff = restitutionAt ? restitutionAt(contact.impactSpeed) : e;
    const allowed = (eEff * contact.impactSpeed) ** 2 / (2 * g);
    const energy = after / s.h0;
    if (beats(after, allowed)) return [{ t: contact.t, energy, kind: 'excess' }];
    if (beats(after, before)) return [{ t: contact.t, energy, kind: 'rise' }];
    return [];
  });
}

/** Engine y(t) and E/E₀(t) up to tEnd, thinned to maxPoints keeping every bucket's extremes. */
export function engineSeries(
  run: EngineRun,
  s: BounceSettings,
  g: number,
  tEnd: number,
  maxPoints: number,
): { position: Point[]; energy: Point[] } {
  const frames = run.frames.filter((frame) => frame.t <= tEnd + FRAME_EPSILON);
  return {
    position: decimateMinMax(
      frames.map((frame) => ({ x: frame.t, y: frame.y })),
      maxPoints,
    ),
    energy: decimateMinMax(
      frames.map((frame) => ({ x: frame.t, y: engineEnergy(frame, s.h0, g) })),
      maxPoints,
    ),
  };
}

/**
 * At most about maxPoints points: the ends plus the lowest and highest point of each bucket, in
 * time order, so every contact and apex survives the thinning.
 */
export function decimateMinMax(points: Point[], maxPoints: number): Point[] {
  if (points.length <= maxPoints) return points;
  const inner = points.slice(1, -1);
  const buckets = Math.max(1, Math.floor((maxPoints - 2) / 2));
  const size = Math.ceil(inner.length / buckets);
  const kept: Point[] = [points[0]];
  for (let start = 0; start < inner.length; start += size) {
    const bucket = inner.slice(start, start + size);
    const low = bucket.reduce((a, b) => (b.y < a.y ? b : a));
    const high = bucket.reduce((a, b) => (b.y > a.y ? b : a));
    const ordered = bucket.indexOf(low) <= bucket.indexOf(high) ? [low, high] : [high, low];
    kept.push(...new Set(ordered));
  }
  kept.push(points[points.length - 1]);
  return kept;
}

/** Timeline (s): the later of T and the engine's rest plus a tail, within 2–15 s. */
export function timelineDuration(idealTime: number, engineRest: number): number {
  const end = Math.max(idealTime, engineRest);
  if (!Number.isFinite(end)) return MAX_TIMELINE_S;
  return Math.min(Math.max(end + TAIL_S, MIN_TIMELINE_S), MAX_TIMELINE_S);
}

/** The engine's rule with exact events: rebounds before an impact falls to the threshold. */
export interface ThresholdPrediction {
  bounces: number;
  /** Apex of the last rebound (m); Infinity when the impacts never fall to the threshold. */
  lastApex: number;
}

/**
 * N = ⌊ln(v₀/v_th)/ln(1/e)⌋ + 1 and h_N = e^{2N} h₀ for the engine's pair e (research §5 Paso 3;
 * kernel bouncesAboveThreshold and bounceSeries), or the impacts walked with e(v). Undefined
 * without a threshold, where the series is the ideal one.
 */
export function thresholdPrediction(s: BounceSettings, g: number): ThresholdPrediction | undefined {
  if (s.threshold === 0) return undefined;
  const never = { bounces: Infinity, lastApex: Infinity };
  const { e, restitutionAt } = engineParams(s, g);
  if (!restitutionAt) {
    const bounces = bouncesAboveThreshold(Math.sqrt(2 * g * s.h0), e, s.threshold);
    if (!Number.isFinite(bounces)) return never;
    return {
      bounces,
      lastApex: bounces === 0 ? 0 : bounceSeries(s.h0, e, g, bounces + 1).heights[bounces],
    };
  }
  const impacts = idealImpacts(s.h0, e, g, Infinity, s.threshold, restitutionAt);
  const last = impacts.at(-1);
  if (!last || last.vOut > 0) return never;
  const rebounds = impacts.filter((impact) => impact.vOut > 0);
  const lastOut = rebounds.at(-1)?.vOut ?? 0;
  return { bounces: rebounds.length, lastApex: (lastOut * lastOut) / (2 * g) };
}

/** y(t) samples of the ideal ball, and the most points an engine series keeps. */
const PLOT_SAMPLES = 600;
const PLOT_MAX_POINTS = 1200;

/** Everything the lab draws and reads out for one set of settings. */
export interface BounceModel {
  run: EngineRun;
  /** T of the ideal ball (s); Infinity from e = 1. */
  idealTime: number;
  /** Timeline length (s). */
  duration: number;
  impacts: IdealImpact[];
  ideal: { position: Point[]; energy: Point[] };
  engine: { position: Point[]; energy: Point[] };
  gains: EnergyGain[];
  prediction: ThresholdPrediction | undefined;
}

export function buildBounceModel(s: BounceSettings, g: number): BounceModel {
  const e = idealE(s);
  const at = idealRestitutionAt(s);
  const run = simulateEngine(s, g, MAX_TIMELINE_S);
  const idealTime = idealTotalTime(s.h0, e, g, at);
  const duration = timelineDuration(idealTime, run.restTime);
  return {
    run,
    idealTime,
    duration,
    impacts: idealImpacts(s.h0, e, g, duration, 0, at),
    ideal: idealSeries(s, g, duration, PLOT_SAMPLES),
    engine: engineSeries(run, s, g, duration, PLOT_MAX_POINTS),
    gains: energyGains(run, s, g).filter((gain) => gain.t <= duration),
    prediction: thresholdPrediction(s, g),
  };
}

/** The ideal ball at t: its height and whether it has come to rest on the floor. */
export function idealStateAt(
  s: BounceSettings,
  g: number,
  t: number,
): { y: number; isResting: boolean } {
  const state = idealBallAt(t, s.h0, idealE(s), g, undefined, idealRestitutionAt(s));
  return { y: state.y, isResting: t > 0 && state.y === 0 && state.v === 0 };
}

/** Top of the scene (m): 15 % above h₀, rounded up to half metres. */
export function sceneTop(h0: number): number {
  const steps = Math.ceil((h0 * SCENE_HEADROOM) / SCENE_GRAIN - FRAME_EPSILON);
  return Math.max(steps, 1) * SCENE_GRAIN;
}

/** Where a ball at height y is drawn: clamped to [0, top], with the side it left by. */
export function viewY(y: number, top: number): { y: number; clamp: 'none' | 'above' | 'below' } {
  if (y > top) return { y: top, clamp: 'above' };
  if (y < 0) return { y: 0, clamp: 'below' };
  return { y, clamp: 'none' };
}

/** h₀ snapped to whole centimetres and kept in 0,2–3 m. */
export function snapH0(value: number): number {
  const snapped = Number((Math.round(value / H0_GRAIN) * H0_GRAIN).toFixed(2));
  return Math.min(Math.max(snapped, H0_MIN), H0_MAX);
}

/** The h₀ a key asks the handle for, or undefined for keys it ignores. */
export function h0KeyTarget(key: string, isCoarse: boolean, h0: number): number | undefined {
  const step = isCoarse ? H0_COARSE_STEP : H0_KEY_STEP;
  const moves: Record<string, number> = {
    ArrowUp: h0 + step,
    ArrowRight: h0 + step,
    ArrowDown: h0 - step,
    ArrowLeft: h0 - step,
    PageUp: h0 + H0_COARSE_STEP,
    PageDown: h0 - H0_COARSE_STEP,
    Home: H0_MIN,
    End: H0_MAX,
  };
  const next = moves[key];
  return next === undefined ? undefined : snapH0(next);
}
