/**
 * The route Tema 1's laboratory flies and what edits it: the last route that could be flown with
 * its samples, the two limits (regenerating the route, debounced when a generation is slow), the
 * stop being dragged, and the message for a route that could not be flown.
 */
import { useEffect, useRef, useState } from 'react';
import { DRONE_ROUTE, type RouteDefinition, type RouteSample } from '../../../lib/data/droneRoute';
import type { Point } from '../../lab/OverlayMarks';
import { isDeclaredRoute, moveStop, tryGenerate } from './routeEdit';
import type { StopIndex } from './RouteOverlay';

/** A generation slower than one frame debounces the next parameter change by PARAM_DEBOUNCE_MS. */
const FRAME_BUDGET_MS = 16;
const PARAM_DEBOUNCE_MS = 150;

/** The last route that could be flown, with its samples. */
export interface ValidRoute {
  def: RouteDefinition;
  samples: RouteSample[];
}

export type Limits = Pick<RouteDefinition, 'vMax' | 'aMax'>;

const DECLARED_LIMITS: Limits = { vMax: DRONE_ROUTE.vMax, aMax: DRONE_ROUTE.aMax };

export interface EditableRoute {
  route: ValidRoute;
  limits: Limits;
  setLimits(update: (previous: Limits) => Limits): void;
  error: string | null;
  /** The stops as drawn: those of a drag in progress, else the route's. */
  shownStops: RouteDefinition['stops'];
  /** A drag preview, or the end of one (the route is regenerated). */
  dragStop(index: StopIndex, at: Point, isEnd: boolean): void;
  /** Back to the declared route and limits. */
  reset(): void;
}

/** The editable route over the declared dataset `declared`. */
export function useEditableRoute(declared: RouteSample[]): EditableRoute {
  const declaredRoute: ValidRoute = { def: DRONE_ROUTE, samples: declared };
  const [route, setRoute] = useState<ValidRoute>(declaredRoute);
  const [limits, setLimits] = useState<Limits>(DECLARED_LIMITS);
  const [preview, setPreview] = useState<{ index: StopIndex; at: Point } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** How long the last generation took (ms), to decide whether parameter changes debounce. */
  const costRef = useRef(0);

  /** Adopts the candidate if it can be flown; otherwise keeps the last valid route and says why. */
  const commit = (candidate: RouteDefinition) => {
    if (isDeclaredRoute(candidate)) {
      setRoute({ def: candidate, samples: declared });
      setError(null);
      return;
    }
    const started = performance.now();
    const result = tryGenerate(candidate);
    costRef.current = performance.now() - started;
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRoute({ def: candidate, samples: result.samples });
    setError(null);
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    if (limits.vMax === route.def.vMax && limits.aMax === route.def.aMax) return;
    const delay = costRef.current > FRAME_BUDGET_MS ? PARAM_DEBOUNCE_MS : 0;
    const id = setTimeout(() => commitRef.current({ ...route.def, ...limits }), delay);
    return () => clearTimeout(id);
  }, [limits, route.def]);

  const dragStop = (index: StopIndex, at: Point, isEnd: boolean) => {
    if (!isEnd) {
      setPreview({ index, at });
      return;
    }
    setPreview(null);
    commit(moveStop(route.def, index, at.x, at.y));
  };

  const reset = () => {
    setRoute(declaredRoute);
    setLimits(DECLARED_LIMITS);
    setPreview(null);
    setError(null);
  };

  const shownStops = preview
    ? moveStop(route.def, preview.index, preview.at.x, preview.at.y).stops
    : route.def.stops;

  return { route, limits, setLimits, error, shownStops, dragStop, reset };
}
