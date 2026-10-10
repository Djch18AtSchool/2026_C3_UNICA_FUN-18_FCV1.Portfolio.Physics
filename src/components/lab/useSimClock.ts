import { useEffect, useMemo, useReducer, useState, type Dispatch } from 'react';
import {
  clockReducer,
  createClock,
  type ClockAction,
  type ClockState,
} from '../../lib/physics/clock';
import { motionReduced } from '../../lib/settingsStore';
import { useGlobalSettings } from './useGlobalSettings';

/** Playback state plus the transitions every laboratory drives it with. Times in s. */
export interface SimClock {
  state: ClockState;
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
/** Longest real dt a single frame may add (s): a backgrounded tab must not jump the simulation. */
const MAX_FRAME_DT_S = 0.05;
/** Reduced motion: discrete steps of duration/REDUCED_STEPS every REDUCED_STEP_MS. */
const REDUCED_STEPS = 60;
const REDUCED_STEP_MS = 250;

/** Follows `prefers-reduced-motion` live; false until mount and wherever matchMedia is missing. */
function usePrefersReducedMotion(): boolean {
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

/**
 * Ticks with the real elapsed time between animation frames, capped at MAX_FRAME_DT_S, times the
 * time scale.
 */
function startFrameLoop(dispatch: Dispatch<ClockAction>, timeScale: number): () => void {
  let frame = 0;
  let last: number | undefined;
  const onFrame = (now: number) => {
    if (last !== undefined) {
      const dt = Math.min(Math.max((now - last) / MS_PER_S, 0), MAX_FRAME_DT_S);
      dispatch({ type: 'tick', dt: dt * timeScale });
    }
    last = now;
    frame = requestAnimationFrame(onFrame);
  };
  frame = requestAnimationFrame(onFrame);
  return () => cancelAnimationFrame(frame);
}

/** Advances in discrete steps of duration/REDUCED_STEPS (scaled by speed), with no continuous animation. */
function startSteppedLoop(dispatch: Dispatch<ClockAction>, duration: number): () => void {
  const id = setInterval(
    () => dispatch({ type: 'tick', dt: duration / REDUCED_STEPS }),
    REDUCED_STEP_MS,
  );
  return () => clearInterval(id);
}

/**
 * Simulation clock for a laboratory of the given duration (s). While playing it ticks once per
 * animation frame with the real dt (≤ 50 ms); under reduced motion it steps duration/60 every
 * 250 ms instead. The loop stops on pause, at the end (unless looping) and on unmount.
 */
export function useSimClock(duration: number, { timeScale = 1 }: SimClockOptions = {}): SimClock {
  const [state, dispatch] = useReducer(clockReducer, duration, createClock);
  const settings = useGlobalSettings();
  const isReduced = motionReduced(settings, usePrefersReducedMotion());
  const { playing, duration: clockDuration } = state;

  useEffect(() => {
    dispatch({ type: 'setDuration', duration });
  }, [duration]);

  useEffect(() => {
    if (!playing) return;
    return isReduced
      ? startSteppedLoop(dispatch, clockDuration)
      : startFrameLoop(dispatch, timeScale);
  }, [playing, isReduced, clockDuration, timeScale]);

  const actions = useMemo(
    () => ({
      play: () => dispatch({ type: 'play' }),
      pause: () => dispatch({ type: 'pause' }),
      toggle: () => dispatch({ type: 'toggle' }),
      reset: () => dispatch({ type: 'reset' }),
      seek: (t: number) => dispatch({ type: 'seek', t }),
      step: (dt: number) => dispatch({ type: 'step', dt }),
      setSpeed: (speed: number) => dispatch({ type: 'setSpeed', speed }),
      setLoop: (loop: boolean) => dispatch({ type: 'setLoop', loop }),
    }),
    [],
  );

  return useMemo(() => ({ state, ...actions }), [state, actions]);
}
