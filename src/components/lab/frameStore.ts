/**
 * The playback time of a laboratory as a tiny external store, so the animation loop can advance it
 * sixty times a second without a React render: only the components that subscribe (the moving
 * layers, through useFrameTime) follow it frame by frame. `t` is the one value this site mutates in
 * place, and this is the one place that does it.
 */
import { requireFinite } from '../../lib/physics/validate';

export interface FrameStore {
  /** The live playback time (s). */
  get(): number;
  /** Replaces the live time and notifies the subscribers, unless it is unchanged. */
  set(t: number): void;
  /** Calls `listener` after every change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

export function createFrameStore(initial = 0): FrameStore {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(t) {
      requireFinite('t', t);
      if (t === current) return;
      current = t;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
