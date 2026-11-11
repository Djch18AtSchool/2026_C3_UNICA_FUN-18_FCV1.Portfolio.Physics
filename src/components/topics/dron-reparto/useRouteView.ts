/**
 * Which view of the route Tema 1's laboratory shows («Tramo» or «Ruta», routeView.ts) and the
 * clock that plays it. The clock runs on the view's own span, so a view switch changes the
 * clock's duration and time lapse; the drone must not jump, so the route time it was at is carried
 * across, and a leg selected by hand opens cruising.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  routeSchedule,
  type LegSchedule,
  type RouteDefinition,
  type RouteSample,
} from '../../../lib/data/droneRoute';
import { useSimClock, type SimClock } from '../../lab/useSimClock';
import { sampleAt } from './routeEdit';
import type { LiveFlight, TimeRange } from './RouteOverlay';
import {
  DEFAULT_SELECTION,
  legAtTime,
  localTime,
  openingTime,
  viewSpan,
  type RouteView,
  type ViewSelection,
  type ViewSpan,
} from './routeView';

export interface RouteViewState {
  selection: ViewSelection;
  schedule: readonly LegSchedule[];
  /** The part of the route on the clock now. */
  span: ViewSpan;
  clock: SimClock;
  /** The route time the clock stands at (s): the clock's t shifted to the route's own origin. */
  routeTime: number;
  /** Switches view keeping the drone where it is on the route (a leg: the one it is on). */
  setView(view: RouteView): void;
  /** Selects the leg of «Tramo»; the drone opens it cruising. */
  setLeg(leg: number): void;
  /** Back to the default view, the first leg cruising, as the lab opens. */
  reset(): void;
}

/** The clock and the view over `definition`'s route; opens on «Tramo», cruising on leg 1. */
export function useRouteView(definition: RouteDefinition): RouteViewState {
  const schedule = useMemo(() => routeSchedule(definition), [definition]);
  const [selection, setSelection] = useState<ViewSelection>(DEFAULT_SELECTION);
  const span = useMemo(
    () => viewSpan(schedule, selection, definition.dt),
    [schedule, selection, definition.dt],
  );
  const clock = useSimClock(span.duration, { timeScale: span.timeScale });
  const { seek } = clock;
  /**
   * The clock's t to take once the new span's duration has reached the clock (an effect in
   * useSimClock runs before this one, so the seek is not clamped to the old duration).
   */
  const pendingSeek = useRef<number | null>(openingTime(span));
  useEffect(() => {
    if (pendingSeek.current === null) return;
    seek(pendingSeek.current);
    pendingSeek.current = null;
  }, [selection, seek]);

  const routeNow = () => span.start + clock.frame.get();
  const moveTo = (next: ViewSelection) => {
    pendingSeek.current = localTime(viewSpan(schedule, next, definition.dt), routeNow());
    setSelection(next);
  };
  const setView = (view: RouteView) => {
    if (view === 'ruta') return moveTo({ view, leg: selection.leg });
    moveTo({ view, leg: legAtTime(schedule, routeNow()) });
  };
  const setLeg = (leg: number) => {
    pendingSeek.current = openingTime(viewSpan(schedule, { view: 'tramo', leg }, definition.dt));
    setSelection({ view: 'tramo', leg });
  };

  const reset = () => {
    pendingSeek.current = openingTime(viewSpan(schedule, DEFAULT_SELECTION, definition.dt));
    // A new object, so the effect that takes the pending seek runs even from the default view.
    setSelection({ ...DEFAULT_SELECTION });
  };

  return {
    selection,
    schedule,
    span,
    clock,
    routeTime: span.start + clock.state.t,
    setView,
    setLeg,
    reset,
  };
}

export interface ViewFlight {
  /** The flight at the settled route time (the readouts, the phase). */
  now: RouteSample;
  /** The flight at any time of the clock, for what moves every frame. */
  live: LiveFlight;
  /** The route times the clock covers: what the drone can be dragged over. */
  timeRange: TimeRange;
  /** Seeks a route time (the map and its drone speak the route's), held inside the view. */
  seekRoute(t: number): void;
}

/** The flight of `samples` as the view's clock plays it: the clock's time starts at `span.start`. */
export function useViewFlight(
  samples: RouteSample[],
  { clock, span, routeTime }: RouteViewState,
): ViewFlight {
  const { frame, seek } = clock;
  const sampleOnClock = useCallback(
    (t: number) => sampleAt(samples, span.start + t),
    [samples, span.start],
  );
  const live = useMemo(() => ({ frame, sampleAt: sampleOnClock }), [frame, sampleOnClock]);
  const timeRange = useMemo(
    () => ({ from: span.start, to: span.start + span.duration }),
    [span.start, span.duration],
  );
  return {
    now: sampleAt(samples, routeTime),
    live,
    timeRange,
    seekRoute: (t) => seek(localTime(span, t)),
  };
}
