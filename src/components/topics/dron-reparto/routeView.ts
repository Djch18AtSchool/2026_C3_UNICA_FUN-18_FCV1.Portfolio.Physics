/**
 * The two views of Tema 1's laboratory, as pure data: «Tramo» plays one leg between two stops at
 * real speed, «Ruta» plays the whole route faster. Each view is a span of the route: where it
 * starts on the route's clock, how long it lasts, how much faster than real time it plays and the
 * events its timeline marks, all taken from the route model (`routeSchedule`), never typed in.
 * No React; seconds.
 */
import type { LegSchedule, RouteStop } from '../../../lib/data/droneRoute';
import { formatNumber } from '../../../lib/format';
import type { TransportMarker } from '../../lab/transportMarkers';

export type RouteView = 'tramo' | 'ruta';

/** Which view is shown and, for «Tramo», which leg (0 = depósito → A). */
export interface ViewSelection {
  view: RouteView;
  leg: number;
}

/** A view's part of the route: the clock the laboratory runs for it. */
export interface ViewSpan {
  /** The route time at which this clock's 0 falls (s). */
  start: number;
  /** How long the clock runs (s). */
  duration: number;
  /** Simulated seconds per real second at speed 1. */
  timeScale: number;
  /** Events on this clock (s), for the transport's timeline and its previous/next buttons. */
  markers: readonly TransportMarker[];
}

/** A leg at real speed: the drone's acceleration, cruise and braking take as long as they do. */
export const LEG_TIME_LAPSE = 1;
/** The whole route lasts minutes: four times faster is still slow enough to follow the stops. */
export const ROUTE_TIME_LAPSE = 4;
/** «Tramo», the first leg: the view that explains the motion opens first. */
export const DEFAULT_SELECTION: ViewSelection = { view: 'tramo', leg: 0 };
/** Cruising on leg 1, halfway to A: clear of every stop, with v and a visible. */
const OPENING_TIME_S = 30;
const DEPOT_NAME = 'Depósito';
/** Slack so that an instant a hair past a grid instant does not jump a whole step. */
const GRID_EPSILON = 1e-9;
const TIME_DECIMALS = 6;

const isDepot = ({ name }: RouteStop) => name === DEPOT_NAME;
const fromText = (stop: RouteStop) => (isDepot(stop) ? 'del depósito' : `de ${stop.name}`);
const toText = (stop: RouteStop) => (isDepot(stop) ? 'al depósito' : `a ${stop.name}`);
const seconds = (value: number) => formatNumber(value, { precision: 1, unit: 's' });

const departureMark = (t: number, from: RouteStop): TransportMarker => ({
  t,
  label: `Salida ${fromText(from)}`,
});
const arrivalMark = (t: number, to: RouteStop): TransportMarker => ({
  t,
  label: `Llegada ${toText(to)}`,
});

/**
 * The flight is sampled every `step` s, and the laboratory reads it by interpolating the samples:
 * only on a sample are its readings exact. Where the acceleration jumps (a departure, the end of
 * the acceleration, the start of braking, an arrival) an instant between two samples reads a
 * blend of both sides, such as 2 m/s² at a stop. So an event is placed on the sample that follows
 * it (a step at most later than the model's instant), and a leg starts on the one before its
 * departure (the drone at rest, in its dwell). The route's clock ends on the last sample, the
 * first at rest at the depot. Without a `step` the instants are the model's.
 */
function gridAfter(t: number, step: number): number {
  if (!(step > 0)) return t;
  return Number((Math.ceil(t / step - GRID_EPSILON) * step).toFixed(TIME_DECIMALS));
}

function gridBefore(t: number, step: number): number {
  if (!(step > 0)) return t;
  return Number((Math.floor(t / step + GRID_EPSILON) * step).toFixed(TIME_DECIMALS));
}

/** «Ruta»: the departure from the depot and the arrival at every stop, on the route's clock. */
function routeSpan(schedule: readonly LegSchedule[], step: number): ViewSpan {
  return {
    start: 0,
    duration: gridAfter(schedule[schedule.length - 1].end, step),
    timeScale: ROUTE_TIME_LAPSE,
    markers: [
      departureMark(0, schedule[0].from),
      ...schedule.map((leg) => arrivalMark(gridAfter(leg.arrival, step), leg.to)),
    ],
  };
}

/**
 * «Tramo»: the flight from just before `departure` to just after `arrival` on its own clock (0 at
 * the start), with the instants the acceleration ends and the braking starts between the two
 * stops.
 */
function legSpan(leg: LegSchedule, step: number): ViewSpan {
  const start = gridBefore(leg.departure, step);
  const on = (t: number) => gridAfter(t, step) - start;
  const duration = on(leg.arrival);
  return {
    start,
    duration,
    timeScale: LEG_TIME_LAPSE,
    markers: [
      departureMark(0, leg.from),
      { t: on(leg.departure + leg.accelDuration), label: 'Fin de la aceleración' },
      { t: on(leg.arrival - leg.accelDuration), label: 'Inicio del frenado' },
      arrivalMark(duration, leg.to),
    ],
  };
}

/** The span of a selection, its events placed on the flight's samples `step` s apart. */
export function viewSpan(
  schedule: readonly LegSchedule[],
  { view, leg }: ViewSelection,
  step = 0,
): ViewSpan {
  if (view === 'ruta') return routeSpan(schedule, step);
  return legSpan(schedule[Math.min(Math.max(leg, 0), schedule.length - 1)], step);
}

/** The leg the drone is on at route time t: during a dwell, the one that just arrived. */
export function legAtTime(schedule: readonly LegSchedule[], t: number): number {
  const index = schedule.findIndex((leg) => t < leg.end);
  return index < 0 ? schedule.length - 1 : index;
}

/** Route time t on the span's own clock, held inside it. */
export function localTime(span: ViewSpan, routeTime: number): number {
  return Math.min(Math.max(routeTime - span.start, 0), span.duration);
}

/** Where a view opens: cruising 30 s in, or in the middle of a leg shorter than 60 s. */
export function openingTime(span: ViewSpan): number {
  return Math.min(OPENING_TIME_S, span.duration / 2);
}

/** «Del depósito a A», «De A a B»: a leg named by the stops it joins (plain text, for an <option>). */
export function legOptionLabel({ from, to }: LegSchedule): string {
  const [lead, ...rest] = `${fromText(from)} ${toText(to)}`;
  return `${lead.toUpperCase()}${rest.join('')}`;
}

/**
 * What the selected view covers, in the model's own seconds (the same ones as table 1.1 and the
 * figure of step 2): when the leg departs and how long it flies, not the clock window it plays in.
 */
export function viewNote(schedule: readonly LegSchedule[], { view, leg }: ViewSelection): string {
  if (view === 'ruta') return `La ruta entera dura ${seconds(schedule[schedule.length - 1].end)}.`;
  const { departure, arrival } = schedule[Math.min(Math.max(leg, 0), schedule.length - 1)];
  return `Sale en t = ${seconds(departure)} de la ruta y dura ${seconds(arrival - departure)}.`;
}
