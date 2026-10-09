import { requireFinite, requireNonNegative, requirePositive } from './validate';

/** Playback state of a simulation: time t ∈ [0, duration] in s, speed multiplier and loop flag. */
export interface ClockState {
  t: number;
  duration: number;
  playing: boolean;
  speed: number;
  loop: boolean;
}

/** Every transition the simulation clock accepts. Times and steps in s. */
export type ClockAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'reset' }
  | { type: 'seek'; t: number }
  | { type: 'step'; dt: number }
  | { type: 'tick'; dt: number }
  | { type: 'setSpeed'; speed: number }
  | { type: 'setLoop'; loop: boolean }
  | { type: 'setDuration'; duration: number };

/** Paused clock at t = 0 with speed 1 and no loop; duration ≥ 0 s. */
export function createClock(duration: number): ClockState {
  requireNonNegative('duration', duration);
  return { t: 0, duration, playing: false, speed: 1, loop: false };
}

/** Clamps t to the closed interval [0, duration]. */
function clampTime(t: number, duration: number): number {
  return Math.min(Math.max(t, 0), duration);
}

/** Starts playback; at the end (t ≥ duration) it restarts from t = 0. */
function play(state: ClockState): ClockState {
  const t = state.t >= state.duration ? 0 : state.t;
  return { ...state, t, playing: true };
}

/** Moves to t (clamped to [0, duration]) and pauses. */
function seek(state: ClockState, t: number): ClockState {
  requireFinite('t', t);
  return { ...state, t: clampTime(t, state.duration), playing: false };
}

/** Advances t' = t + dt·speed; past the end it wraps (t' mod duration) when looping, else stops at duration. */
function tick(state: ClockState, dt: number): ClockState {
  requireNonNegative('dt', dt);
  if (!state.playing) return state;
  const next = state.t + dt * state.speed;
  if (next < state.duration) return { ...state, t: next };
  if (state.loop && state.duration > 0) return { ...state, t: next % state.duration };
  return { ...state, t: state.duration, playing: false };
}

/** Replaces the duration (≥ 0 s) and clamps t into the new range. */
function setDuration(state: ClockState, duration: number): ClockState {
  requireNonNegative('duration', duration);
  return { ...state, duration, t: clampTime(state.t, duration) };
}

/**
 * Pure playback reducer; always returns a new object, except a tick while paused (unchanged state).
 * tick: t' = t + dt·speed; if t' ≥ duration → loop ? t' mod duration (keeps playing) : t = duration, paused.
 * seek and step clamp to [0, duration] and pause; play at t = duration restarts from 0.
 */
export function clockReducer(state: ClockState, action: ClockAction): ClockState {
  switch (action.type) {
    case 'play':
      return play(state);
    case 'pause':
      return { ...state, playing: false };
    case 'toggle':
      return state.playing ? { ...state, playing: false } : play(state);
    case 'reset':
      return { ...state, t: 0, playing: false };
    case 'seek':
      return seek(state, action.t);
    case 'step':
      requireFinite('dt', action.dt);
      return seek(state, state.t + action.dt);
    case 'tick':
      return tick(state, action.dt);
    case 'setSpeed':
      requirePositive('speed', action.speed);
      return { ...state, speed: action.speed };
    case 'setLoop':
      return { ...state, loop: action.loop };
    case 'setDuration':
      return setDuration(state, action.duration);
  }
}
