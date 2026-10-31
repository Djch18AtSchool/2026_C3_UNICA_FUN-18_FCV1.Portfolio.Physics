/**
 * The two ways a component follows a laboratory's live time (see useSimClock for the contract;
 * readouts and transport text read the settled `clock.state.t`, synced at 10 Hz):
 *
 * - useFrameTime (and useFrameDerived): re-render on every frame. For the moving layer only (probe,
 *   ball, cursor, arrows, hands), which must be small.
 * - useFrameEffect: no render at all; an imperative DOM write per frame (an input's value, an
 *   attribute) where even a small re-render is too much.
 *
 * Every hook takes the store itself or anything that carries it as `frame` (a SimClock).
 */
import { useEffect, useRef, useSyncExternalStore, type DependencyList } from 'react';
import type { FrameStore } from './frameStore';

export type FrameSource = FrameStore | { frame: FrameStore };

const noopSubscribe = () => () => undefined;

/** The store behind a source: itself, or its `frame`. */
export function frameOf(source: FrameSource): FrameStore {
  return 'frame' in source ? source.frame : source;
}

/** The live time, re-rendering the caller on every change (every animation frame while playing). */
export function useFrameTime(source: FrameSource): number {
  const frame = frameOf(source);
  return useSyncExternalStore(frame.subscribe, frame.get, frame.get);
}

/**
 * `derive(t)` for the live time, re-rendering the caller on every change: the moving layer's
 * state (a probe's position, a ball's height) computed where it is drawn, not in the laboratory.
 */
export function useFrameDerived<T>(source: FrameSource, derive: (t: number) => T): T {
  return derive(useFrameTime(source));
}

/** useFrameTime when a source is given; `fallback` (and no subscription) when it is not. */
export function useOptionalFrameTime(source: FrameSource | undefined, fallback: number): number {
  const frame = source ? frameOf(source) : undefined;
  const get = frame ? frame.get : () => fallback;
  return useSyncExternalStore(frame ? frame.subscribe : noopSubscribe, get, get);
}

/**
 * Runs `effect(t)` with the live time on mount, whenever `deps` change and after every change of
 * the store, without re-rendering: for imperative writes to a DOM node the component owns.
 */
export function useFrameEffect(
  source: FrameSource,
  effect: (t: number) => void,
  deps: DependencyList,
): void {
  const frame = frameOf(source);
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    const run = () => effectRef.current(frame.get());
    run();
    return frame.subscribe(run);
    // The caller's deps decide when the effect re-runs, as with useEffect.
  }, [frame, ...deps]);
}
