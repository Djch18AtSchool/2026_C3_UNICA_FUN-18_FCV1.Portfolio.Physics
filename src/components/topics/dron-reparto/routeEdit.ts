/**
 * Pure edits of the drone route for the laboratory: move a delivery stop, try to regenerate the
 * flight, tell the declared route apart and read the flight at any t. No React; metres and seconds.
 */
import {
  DRONE_ROUTE,
  generateRoute,
  type RouteDefinition,
  type RouteSample,
  type RouteStop,
} from '../../../lib/data/droneRoute';

/** Stops snap to a 10 m grid, so a dragged route reads as round numbers. */
const GRID_M = 10;
const DEPOT_NAME = 'Depósito';
const KEEP_LAST = 'Se conserva la última ruta válida.';
const GENERIC_ERROR = `No se pudo generar la ruta con estos valores. ${KEEP_LAST}`;

export type GenerateResult = { ok: true; samples: RouteSample[] } | { ok: false; error: string };

const snap = (metres: number) => Math.round(metres / GRID_M) * GRID_M;

/** A new route with stop `index` (A = 1, B = 2, C = 3) at (x, y) rounded to 10 m. */
export function moveStop(
  def: RouteDefinition,
  index: 1 | 2 | 3,
  x: number,
  y: number,
): RouteDefinition {
  return {
    ...def,
    stops: def.stops.map((stop, i) => (i === index ? { ...stop, x: snap(x), y: snap(y) } : stop)),
  };
}

const describeStop = ({ name }: RouteStop) =>
  name === DEPOT_NAME ? 'el depósito' : `la parada ${name}`;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The Spanish message for a route that cannot be flown: which two stops coincide, if any. */
function errorMessage(def: RouteDefinition): string {
  const index = def.stops.findIndex(
    (stop, i) => i > 0 && stop.x === def.stops[i - 1].x && stop.y === def.stops[i - 1].y,
  );
  if (index < 1) return GENERIC_ERROR;
  const [from, to] = [def.stops[index - 1], def.stops[index]];
  const pronoun = [from, to].some((stop) => stop.name === DEPOT_NAME) ? 'ellos' : 'ellas';
  return `${capitalize(describeStop(from))} y ${describeStop(to)} coinciden: no hay tramo entre ${pronoun}. ${KEEP_LAST}`;
}

/** The samples of the route, or a Spanish message when generateRoute rejects it (RangeError). */
export function tryGenerate(def: RouteDefinition): GenerateResult {
  try {
    return { ok: true, samples: generateRoute(def) };
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return { ok: false, error: errorMessage(def) };
  }
}

const sameStop = (a: RouteStop, b: RouteStop) =>
  a.name === b.name && a.x === b.x && a.y === b.y && a.dwell === b.dwell;

/** True when the route is the declared one (same stops, limits and sampling period). */
export function isDeclaredRoute(def: RouteDefinition): boolean {
  return (
    def.vMax === DRONE_ROUTE.vMax &&
    def.aMax === DRONE_ROUTE.aMax &&
    def.dt === DRONE_ROUTE.dt &&
    def.stops.length === DRONE_ROUTE.stops.length &&
    def.stops.every((stop, i) => sameStop(stop, DRONE_ROUTE.stops[i]))
  );
}

/** Index of the last sample with t ≤ the given t (binary search; samples are sorted by t). */
function sampleBefore(samples: RouteSample[], t: number): number {
  let low = 0;
  let high = samples.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].t <= t) low = middle;
    else high = middle;
  }
  return low;
}

/** The flight at t, linear between the two samples around it; t clamped to the samples. */
export function sampleAt(samples: RouteSample[], t: number): RouteSample {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (t <= first.t) return first;
  if (t >= last.t) return last;
  const index = sampleBefore(samples, t);
  const a = samples[index];
  const b = samples[index + 1];
  const fraction = (t - a.t) / (b.t - a.t);
  const lerp = (key: keyof RouteSample) => a[key] + (b[key] - a[key]) * fraction;
  return {
    t,
    x: lerp('x'),
    y: lerp('y'),
    vx: lerp('vx'),
    vy: lerp('vy'),
    speed: lerp('speed'),
    ax: lerp('ax'),
    ay: lerp('ay'),
    accel: lerp('accel'),
  };
}
