import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  clockReducer,
  createClock,
  type ClockAction,
  type ClockState,
} from '../../lib/physics/clock';
import { motionReduced } from '../../lib/settingsStore';
import { createFrameStore, type FrameStore } from './frameStore';
import { useGlobalSettings } from './useGlobalSettings';

/**
 * Playback state plus the transitions every laboratory drives it with. Times in s.
 *
 * Two clocks in one, by cadence:
 * - `frame` is the live time: the animation loop advances it every frame without a React render.
 *   Only the moving layer reads it, through useFrameTime (re-render per frame) or useFrameEffect
 *   (imperative write per frame).
 * - `state` is the settled time plus the discrete fields (duration, playing, speed, loop). It is
 *   exact right after play, pause, toggle, reset, seek and step, and, while playing, it is written
 *   back from `frame` CLOCK_SYNC_HZ times a second: readouts, transport text and the announcer read
 *   `state.t` and re-render at that cadence, not at 60 Hz. Between syncs `state.t` lags `frame`
 *   by less than one sync interval.
 */
export interface SimClock {
  state: ClockState;
  frame: FrameStore;
  /**
   * Simulated seconds per real second of the playback now: the time scale times the speed, or,
   * under reduced motion, the stepped pace (duration/60 every 250 ms, times the speed). What a
   * lab's canvas declares (TimeScaleBadge).
   */
  rate: number;
  play(): void;
  pause(): void;
  toggle(): void;
  reset(): void;
  seek(t: number): void;
  step(dt: number): void;
  setSpeed(s: number): void;
  setLoop(b: boolean): void;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MS_PER_S = 1000;
/** How often, while playing, the live time is written into React state (s⁻¹). */
export const CLOCK_SYNC_HZ = 10;
const SYNC_INTERVAL_MS = MS_PER_S / CLOCK_SYNC_HZ;
/**
 * A frame longer than this (s) is a stall (a tab in the background, a frozen machine), not a slow
 * frame: the clock advances by MAX_FRAME_DT_S and resumes, instead of jumping ahead by the stall.
 * Shorter frames advance by their real duration, so a slow machine drops frames but keeps the
 * simulation's pace (the labs compute their state from t; nothing is integrated per frame).
 */
export const MAX_FRAME_DT_S = 0.25;
/** Reduced motion: discrete steps of duration/REDUCED_STEPS every REDUCED_STEP_MS. */
const REDUCED_STEPS = 60;
const REDUCED_STEP_MS = 250;
/** Real seconds a whole run takes at speed 1 under reduced motion. */
const REDUCED_RUN_S = (REDUCED_STEPS * REDUCED_STEP_MS) / MS_PER_S;

/** Simulated seconds per real second: see SimClock.rate. */
function playbackRate({ duration, speed }: ClockState, timeScale: number, isReduced: boolean) {
  return isReduced ? (duration / REDUCED_RUN_S) * speed : timeScale * speed;
}

/** Follows `prefers-reduced-motion` live; false until mount and wherever matchMedia is missing. */
export function usePrefersReducedMotion(): boolean {
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const sync = () => setIsReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isReduced;
}

export interface SimClockOptions {
  /**
   * Simulated seconds per real second at speed 1 (default 1), for motions too slow to watch in
   * real time, such as a drone route of several minutes. The speed setting multiplies it.
   */
  timeScale?: number;
}

type Apply = (action: ClockAction) => void;

/**
 * Moves the live time by `dtSim` simulated seconds times the speed. Returns true when the run has
 * reached its end without looping (the live time then sits at duration).
 */
function advance(frame: FrameStore, { duration, speed, loop }: ClockState, dtSim: number): boolean {
  const next = frame.get() + dtSim * speed;
  if (next < duration) {
    frame.set(next);
    return false;
  }
  if (loop && duration > 0) {
    frame.set(next % duration);
    return false;
  }
  frame.set(duration);
  return true;
}

interface LoopDeps {
  frame: FrameStore;
  latest: { current: ClockState };
  apply: Apply;
}

/**
 * Advances the live time with the real elapsed time between animation frames (each capped at
 * MAX_FRAME_DT_S) times the time scale, and syncs the React state every SYNC_INTERVAL_MS and at
 * the end of the run.
 */
function startFrameLoop({ frame, latest, apply }: LoopDeps, timeScale: number): () => void {
  let handle = 0;
  let last: number | undefined;
  let lastSync = 0;
  const onFrame = (now: number) => {
    // A frame queued between a pausing transition and this effect's cleanup must not advance.
    if (!latest.current.playing) return;
    if (last === undefined) lastSync = now;
    else {
      const dt = Math.min(Math.max((now - last) / MS_PER_S, 0), MAX_FRAME_DT_S);
      const ended = advance(frame, latest.current, dt * timeScale);
      if (ended || now - lastSync >= SYNC_INTERVAL_MS) {
        lastSync = now;
        apply({ type: 'sync', t: frame.get() });
      }
      if (ended) return;
    }
    last = now;
    handle = requestAnimationFrame(onFrame);
  };
  handle = requestAnimationFrame(onFrame);
  return () => cancelAnimationFrame(handle);
}

/** Steps duration/REDUCED_STEPS (times the speed) every REDUCED_STEP_MS, syncing state each step. */
function startSteppedLoop({ frame, latest, apply }: LoopDeps): () => void {
  const id = setInterval(() => {
    advance(frame, latest.current, latest.current.duration / REDUCED_STEPS);
    apply({ type: 'sync', t: frame.get() });
  }, REDUCED_STEP_MS);
  return () => clearInterval(id);
}

/**
 * Simulation clock for a laboratory of the given duration (s). While playing, the live time
 * (`frame`) advances once per animation frame with the real dt and the React state follows it
 * CLOCK_SYNC_HZ times a second; under reduced motion it steps duration/60 every 250 ms instead.
 * The loop stops on pause, at the end (unless looping) and on unmount. See SimClock.
 */
export function useSimClock(duration: number, { timeScale = 1 }: SimClockOptions = {}): SimClock {
  const [state, dispatch] = useReducer(clockReducer, duration, createClock);
  const [frame] = useState(() => createFrameStore());
  const settings = useGlobalSettings();
  const isReduced = motionReduced(settings, usePrefersReducedMotion());
  const { playing } = state;
  /**
   * The state as the reducer will see it once React applies every action dispatched so far: the
   * same pure reducer is run here, so the live time can be set in the same call, synchronously.
   */
  const latest = useRef(state);
  latest.current = state;

  const apply = useCallback<Apply>(
    (action) => {
      const next = clockReducer(latest.current, action);
      latest.current = next;
      dispatch(action);
      frame.set(next.t);
    },
    [frame],
  );
  /** A discrete transition acts on the live time: while playing, settle it first. */
  const transition = useCallback<Apply>(
    (action) => {
      if (latest.current.playing) apply({ type: 'sync', t: frame.get() });
      apply(action);
    },
    [apply, frame],
  );

  useEffect(() => {
    transition({ type: 'setDuration', duration });
  }, [duration, transition]);

  useEffect(() => {
    if (!playing) return;
    const deps: LoopDeps = { frame, latest, apply };
    return isReduced ? startSteppedLoop(deps) : startFrameLoop(deps, timeScale);
  }, [playing, isReduced, timeScale, frame, apply]);

  const actions = useMemo(
    () => ({
      play: () => transition({ type: 'play' }),
      pause: () => transition({ type: 'pause' }),
      toggle: () => transition({ type: 'toggle' }),
      reset: () => transition({ type: 'reset' }),
      seek: (t: number) => transition({ type: 'seek', t }),
      step: (dt: number) => transition({ type: 'step', dt }),
      setSpeed: (speed: number) => transition({ type: 'setSpeed', speed }),
      setLoop: (loop: boolean) => transition({ type: 'setLoop', loop }),
    }),
    [transition],
  );

  const rate = playbackRate(state, timeScale, isReduced);
  return useMemo(() => ({ state, frame, rate, ...actions }), [state, frame, rate, actions]);
}
