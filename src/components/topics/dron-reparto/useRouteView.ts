/**
 * Which view of the route Tema 1's laboratory shows («Tramo» or «Ruta», routeView.ts) and the
 * clock that plays it. The clock runs on the view's own span, so a view switch changes the
 * clock's duration and time lapse; the drone must not jump, so the route time it was at is carried
 * across, and a leg selected by hand opens cruising.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  routeSchedule,
  type LegSchedule,
  type RouteDefinition,
} from '../../../lib/data/droneRoute';
import { useSimClock, type SimClock } from '../../lab/useSimClock';
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
}

/** The clock and the view over `definition`'s route; opens on «Tramo», cruising on leg 1. */
export function useRouteView(definition: RouteDefinition): RouteViewState {
  const schedule = useMemo(() => routeSchedule(definition), [definition]);
  const [selection, setSelection] = useState<ViewSelection>(DEFAULT_SELECTION);
  const span = useMemo(() => viewSpan(schedule, selection, definition.dt), [schedule, selection]);
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

  return {
    selection,
    schedule,
    span,
    clock,
    routeTime: span.start + clock.state.t,
    setView,
    setLeg,
  };
}
