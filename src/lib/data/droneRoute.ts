import {
  add,
  magnitude,
  scale,
  sub,
  trapezoidalProfile,
  vec,
  type MotionProfile,
  type Vec2,
} from '../physics';
import { requirePositive } from '../physics/validate';

/** A stop of the route: position in metres and dwell time in seconds. */
export interface RouteStop {
  name: string;
  x: number;
  y: number;
  dwell: number;
}

/** A closed delivery route flown leg by leg, rest to rest, under speed and acceleration limits. */
export interface RouteDefinition {
  stops: RouteStop[];
  vMax: number;
  aMax: number;
  dt: number;
}

/** One sample of the flight (SI units): position, velocity and acceleration with their magnitudes. */
export interface RouteSample {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  ax: number;
  ay: number;
  accel: number;
}

const CM_PER_M = 100;
/**
 * ArduPilot Copter 4.6.3 defaults (libraries/AC_WPNav/AC_WPNav.cpp): WPNAV_WP_SPEED 1000 cm/s and
 * WPNAV_ACCELERATION 250 cm/s², called WP_SPD and WP_ACC in the current documentation.
 * Source: docs/superpowers/research/2026-10-08-sources.md, section 5.
 */
const ARDUPILOT_WP_SPEED_CM_S = 1000;
const ARDUPILOT_WP_ACCEL_CM_S2 = 250;
const SAMPLE_PERIOD_S = 0.1;
const DELIVERY_DWELL_S = 20;
/** Removes binary noise such as 0.30000000000000004 from grid times. */
const TIME_DECIMALS = 6;
/** Slack so that a duration a hair above a grid instant does not add an extra sample. */
const GRID_EPSILON = 1e-9;

export const DRONE_ROUTE: RouteDefinition = {
  stops: [
    { name: 'Depósito', x: 0, y: 0, dwell: 0 },
    { name: 'A', x: 600, y: 200, dwell: DELIVERY_DWELL_S },
    { name: 'B', x: 900, y: 800, dwell: DELIVERY_DWELL_S },
    { name: 'C', x: 300, y: 1100, dwell: DELIVERY_DWELL_S },
    { name: 'Depósito', x: 0, y: 0, dwell: 0 },
  ],
  vMax: ARDUPILOT_WP_SPEED_CM_S / CM_PER_M,
  aMax: ARDUPILOT_WP_ACCEL_CM_S2 / CM_PER_M,
  dt: SAMPLE_PERIOD_S,
};

/** A leg flown from `origin` along the unit vector `heading`, followed by the dwell at its end. */
interface Leg {
  start: number;
  origin: Vec2;
  heading: Vec2;
  profile: MotionProfile;
  dwell: number;
}

const AT_REST = { v: vec(0, 0), a: vec(0, 0) } as const;

function validate(def: RouteDefinition): void {
  if (def.stops.length < 2) {
    throw new RangeError(`a route needs at least 2 stops, got ${def.stops.length}`);
  }
  def.stops.forEach((stop, i) => {
    if (!(stop.dwell >= 0)) throw new RangeError(`dwell at ${stop.name} must be ≥ 0`);
    const previous = def.stops[i - 1];
    if (previous && previous.x === stop.x && previous.y === stop.y) {
      throw new RangeError(`zero-length leg from ${previous.name} to ${stop.name}: no heading`);
    }
  });
  requirePositive('vMax', def.vMax);
  requirePositive('aMax', def.aMax);
  requirePositive('dt', def.dt);
}

/** Legs with their start times: leg i starts after legs 0…i−1 and their dwells. */
function buildLegs(def: RouteDefinition): Leg[] {
  validate(def);
  const points = def.stops.map((stop) => vec(stop.x, stop.y));
  return points.slice(1).reduce<Leg[]>((legs, end, i) => {
    const origin = points[i];
    const delta = sub(end, origin);
    const distance = magnitude(delta);
    const previous = legs[legs.length - 1];
    const start = previous ? previous.start + previous.profile.duration + previous.dwell : 0;
    const leg: Leg = {
      start,
      origin,
      heading: scale(delta, 1 / distance),
      profile: trapezoidalProfile(distance, def.vMax, def.aMax),
      dwell: def.stops[i + 1].dwell,
    };
    return [...legs, leg];
  }, []);
}

function legEnd(leg: Leg): number {
  return leg.start + leg.profile.duration + leg.dwell;
}

/** Total time of the route: the trapezoidal duration of every leg plus every dwell after it. */
export function routeDuration(def: RouteDefinition): number {
  const legs = buildLegs(def);
  return legEnd(legs[legs.length - 1]);
}

/** State at time t: s, v and a of the leg profile projected on its heading; at rest during dwells. */
function stateAt(legs: Leg[], t: number): { r: Vec2; v: Vec2; a: Vec2 } {
  const leg = legs.find((candidate) => t < legEnd(candidate)) ?? legs[legs.length - 1];
  const local = t - leg.start;
  const { profile, origin, heading } = leg;
  const r = add(origin, scale(heading, profile.s(local)));
  if (local >= profile.duration) return { r, ...AT_REST };
  return { r, v: scale(heading, profile.v(local)), a: scale(heading, profile.a(local)) };
}

function toSample(t: number, { r, v, a }: { r: Vec2; v: Vec2; a: Vec2 }): RouteSample {
  return {
    t,
    x: r.x,
    y: r.y,
    vx: v.x,
    vy: v.y,
    speed: magnitude(v),
    ax: a.x,
    ay: a.y,
    accel: magnitude(a),
  };
}

/**
 * Samples the route every dt, from 0 to the first grid instant at or after the end, so the last
 * sample is the drone back at the depot and at rest. Each leg is a rest-to-rest trapezoidal profile
 * along the leg's heading: the drone stops at every vertex and turns while hovering.
 */
export function generateRoute(def: RouteDefinition): RouteSample[] {
  const legs = buildLegs(def);
  const duration = legEnd(legs[legs.length - 1]);
  const count = Math.ceil(duration / def.dt - GRID_EPSILON) + 1;
  return Array.from({ length: count }, (_, i) => {
    const t = Number((i * def.dt).toFixed(TIME_DECIMALS));
    return toSample(t, stateAt(legs, t));
  });
}
