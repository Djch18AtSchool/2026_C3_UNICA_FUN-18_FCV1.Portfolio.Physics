/**
 * A run of «Conducir» as data: the pedals the reader held (recorded as changes) and the states the
 * drive step computed from them, one every DRIVE_STEP_S. Pure: every function returns a new run.
 * Recording the pedals, not only the states, lets the lab replay a run (seek back), drive on from an
 * earlier instant (the later part is dropped) and recompute the same driving with another car or
 * regeneration model. Times in s of the run's clock (t = 0 at the course's start).
 */
import type { RegenParams } from '../../../lib/physics/energy';
import {
  driveStep,
  startDrive,
  type DriveCar,
  type DriveState,
  type PedalsHeld,
} from '../../../lib/physics/regenDrive';
import { KMH_PER_MS } from './regenScene';

/** The fixed integration step (s): 100 steps a second, whatever the frame rate. */
export const DRIVE_STEP_S = 0.01;
/** Float residue allowed when an instant is turned into a step (0,03 / 0,01 = 2,999…). */
const STEP_EPSILON = 1e-6;
/** The speed trace keeps one point every this many steps (0,1 s). */
const TRACE_EVERY = 10;

/**
 * What the reader drives: a stretch of the cycle, from its start (at `offset` s of the cycle) for
 * `duration` s, starting at the cycle's speed and distance there, with the line where the cycle's
 * car stops and the end of the road drawn past it (m of the cycle).
 */
export interface DriveCourse {
  offset: number;
  duration: number;
  startSpeed: number;
  startDistance: number;
  stopLine: number;
  roadEnd: number;
}

/** The car and the regeneration model a run is computed with. */
export interface DriveModel {
  car: DriveCar;
  regen: RegenParams;
}

/** From step `step` on, the reader holds `held`. */
export interface InputChange {
  step: number;
  held: PedalsHeld;
}

/** The recorded run: states[i] at t = i·DRIVE_STEP_S; inputs sorted by step, the first at 0. */
export interface DriveRun {
  states: readonly DriveState[];
  inputs: readonly InputChange[];
}

const RELEASED: PedalsHeld = { throttle: false, brake: false };

/** The step that holds instant t (s). */
export const stepAt = (t: number): number => Math.floor(t / DRIVE_STEP_S + STEP_EPSILON);

const lastStep = (run: DriveRun) => run.states.length - 1;
const sameHeld = (a: PedalsHeld, b: PedalsHeld) => a.throttle === b.throttle && a.brake === b.brake;

/** A run at the course's start: one state, pedals released. */
export function newRun(course: DriveCourse): DriveRun {
  return {
    states: [startDrive(course.startSpeed, course.startDistance, 0)],
    inputs: [{ step: 0, held: RELEASED }],
  };
}

/** The instant (s) the recording reaches. */
export const runEnd = (run: DriveRun): number => lastStep(run) * DRIVE_STEP_S;

/** The pedals held during step `step` (from state `step` to the next). */
export function heldAt(inputs: readonly InputChange[], step: number): PedalsHeld {
  return inputs.reduce((held, change) => (change.step <= step ? change.held : held), RELEASED);
}

/** States after `from`, one per step, holding the pedals heldOf(i) during step i. */
function simulate(
  from: DriveState,
  firstStep: number,
  count: number,
  heldOf: (step: number) => PedalsHeld,
  { car, regen }: DriveModel,
): DriveState[] {
  // One pass, linear in the steps: `current` is rebound to each new state, none is mutated.
  let current = from;
  return Array.from({ length: count }, (_, k) => {
    current = driveStep(current, heldOf(firstStep + k), DRIVE_STEP_S, car, regen);
    return current;
  });
}

/**
 * The run driven on to instant t (never past the course's end) with `held` from its last step:
 * a change of pedals is recorded at that step. A run already at or past t is returned as is.
 */
export function extendRun(
  run: DriveRun,
  t: number,
  held: PedalsHeld,
  course: DriveCourse,
  model: DriveModel,
): DriveRun {
  const from = lastStep(run);
  const target = Math.min(stepAt(t), stepAt(course.duration));
  if (target <= from) return run;
  const isChange = !sameHeld(heldAt(run.inputs, from), held);
  const added = simulate(run.states[from], from, target - from, () => held, model);
  return {
    states: [...run.states, ...added],
    inputs: isChange ? [...run.inputs, { step: from, held }] : run.inputs,
  };
}

/** The recorded state at instant t, clamped to the recording. */
export function stateAt(run: DriveRun, t: number): DriveState {
  return run.states[Math.min(Math.max(stepAt(t), 0), lastStep(run))];
}

/** The run cut at instant t: what was driven after it is dropped, to drive on from there. */
export function truncateRun(run: DriveRun, t: number): DriveRun {
  const keep = Math.max(stepAt(t), 0);
  if (keep >= lastStep(run)) return run;
  return {
    states: run.states.slice(0, keep + 1),
    // The first entry (released at step 0) always stays; a change applies from its step on.
    inputs: run.inputs.filter((change, i) => i === 0 || change.step < keep),
  };
}

/** The same pedals, step by step, with another car or regeneration model. */
export function resimulateRun(run: DriveRun, course: DriveCourse, model: DriveModel): DriveRun {
  const [start] = newRun(course).states;
  const states = simulate(start, 0, lastStep(run), (step) => heldAt(run.inputs, step), model);
  return { states: [start, ...states], inputs: run.inputs };
}

/** v (km/h) against the cycle's time, every 0,1 s up to instant t and at t itself. */
export function speedTrace(
  run: DriveRun,
  course: DriveCourse,
  t: number,
): { x: number; y: number }[] {
  const end = Math.min(Math.max(stepAt(t), 0), lastStep(run));
  const steps = Array.from(
    { length: Math.floor(end / TRACE_EVERY) + 1 },
    (_, k) => k * TRACE_EVERY,
  );
  const kept = steps.at(-1) === end ? steps : [...steps, end];
  return kept.map((step) => ({
    x: course.offset + step * DRIVE_STEP_S,
    y: run.states[step].v * KMH_PER_MS,
  }));
}
