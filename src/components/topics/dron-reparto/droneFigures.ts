/**
 * Data of Tema 1's static figures (steps 2 and 3), from the declared route: the naive flight at
 * constant speed, whose velocity jumps, and the trapezoidal profile of the first leg. Pure.
 */
import type { RouteDefinition } from '../../../lib/data/droneRoute';
import { trapezoidalProfile } from '../../../lib/physics';

type Point = { x: number; y: number };

export interface ConstantSpeedFlight {
  /** vₓ(t) and v_y(t) as (t, v) points; a jump is two points at the same t. */
  vx: Point[];
  vy: Point[];
  /** Instants at which the velocity jumps (takeoff and landing of every leg), s. */
  jumps: number[];
  duration: number;
}

interface FlownLeg {
  start: number;
  end: number;
  vx: number;
  vy: number;
}

/** Each leg flown straight at vₘₐₓ from the first instant, with the dwell after it at rest. */
function flownLegs(def: RouteDefinition): FlownLeg[] {
  return def.stops.slice(1).reduce<FlownLeg[]>((legs, stop, i) => {
    const from = def.stops[i];
    const distance = Math.hypot(stop.x - from.x, stop.y - from.y);
    const previous = legs[legs.length - 1];
    const start = previous ? previous.end + def.stops[i].dwell : 0;
    const scale = def.vMax / distance;
    const leg = {
      start,
      end: start + distance / def.vMax,
      vx: (stop.x - from.x) * scale,
      vy: (stop.y - from.y) * scale,
    };
    return [...legs, leg];
  }, []);
}

/** The flight of step 2: rapidez constante vₘₐₓ on every leg, so v jumps at every vertex. */
export function constantSpeedFlight(def: RouteDefinition): ConstantSpeedFlight {
  const legs = flownLegs(def);
  const steps = (key: 'vx' | 'vy') =>
    legs.flatMap((leg) => [
      { x: leg.start, y: 0 },
      { x: leg.start, y: leg[key] },
      { x: leg.end, y: leg[key] },
      { x: leg.end, y: 0 },
    ]);
  return {
    vx: steps('vx'),
    vy: steps('vy'),
    jumps: legs.flatMap((leg) => [leg.start, leg.end]),
    duration: legs[legs.length - 1].end,
  };
}

export interface LegProfile {
  distance: number;
  tAccel: number;
  duration: number;
  /** |v|(t) of the trapezoidal profile: its four corners. */
  trapezoid: Point[];
  /** |v|(t) at constant vₘₐₓ over the same distance. */
  rectangle: Point[];
}

/** The first leg (depósito → A) flown rest to rest under vₘₐₓ and aₘₐₓ, next to constant speed. */
export function firstLegProfile(def: RouteDefinition): LegProfile {
  const [from, to] = def.stops;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const profile = trapezoidalProfile(distance, def.vMax, def.aMax);
  const tAccel = def.vMax / def.aMax;
  const cruiseEnd = distance / def.vMax;
  return {
    distance,
    tAccel,
    duration: profile.duration,
    trapezoid: [
      { x: 0, y: 0 },
      { x: tAccel, y: def.vMax },
      { x: profile.duration - tAccel, y: def.vMax },
      { x: profile.duration, y: 0 },
    ],
    rectangle: [
      { x: 0, y: 0 },
      { x: 0, y: def.vMax },
      { x: cruiseEnd, y: def.vMax },
      { x: cruiseEnd, y: 0 },
    ],
  };
}
