/**
 * The two views of Tema 1's laboratory, as pure data: «Tramo» plays one leg between two stops at
 * real speed, «Ruta» plays the whole route faster. Each view is a window onto the route: where it
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
export interface ViewWindow {
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

/** «Ruta»: the departure from the depot and the arrival at every stop, on the route's clock. */
function routeWindow(schedule: readonly LegSchedule[]): ViewWindow {
  const [first] = schedule;
  return {
    start: 0,
    duration: schedule[schedule.length - 1].end,
    timeScale: ROUTE_TIME_LAPSE,
    markers: [
      departureMark(0, first.from),
      ...schedule.map((leg) => arrivalMark(leg.arrival, leg.to)),
    ],
  };
}

/**
 * «Tramo»: the flight from `departure` to `arrival` on its own clock (0 at the departure), with
 * the instants the acceleration ends and the braking starts between the two stops.
 */
function legWindow(leg: LegSchedule): ViewWindow {
  const flight = leg.arrival - leg.departure;
  return {
    start: leg.departure,
    duration: flight,
    timeScale: LEG_TIME_LAPSE,
    markers: [
      departureMark(0, leg.from),
      { t: leg.accelDuration, label: 'Fin de la aceleración' },
      { t: flight - leg.accelDuration, label: 'Inicio del frenado' },
      arrivalMark(flight, leg.to),
    ],
  };
}

/** The window of a selection; a leg out of range is the last one. */
export function viewWindow(
  schedule: readonly LegSchedule[],
  { view, leg }: ViewSelection,
): ViewWindow {
  if (view === 'ruta') return routeWindow(schedule);
  return legWindow(schedule[Math.min(Math.max(leg, 0), schedule.length - 1)]);
}

/** The leg the drone is on at route time t: during a dwell, the one that just arrived. */
export function legAtTime(schedule: readonly LegSchedule[], t: number): number {
  const index = schedule.findIndex((leg) => t < leg.end);
  return index < 0 ? schedule.length - 1 : index;
}

/** Route time t on the window's own clock, held inside it. */
export function localTime(window: ViewWindow, routeTime: number): number {
  return Math.min(Math.max(routeTime - window.start, 0), window.duration);
}

/** Where a view opens: cruising 30 s in, or in the middle of a leg shorter than 60 s. */
export function openingTime(window: ViewWindow): number {
  return Math.min(OPENING_TIME_S, window.duration / 2);
}

/** «Depósito → A»: a leg named by the stops it joins (plain text: it goes in an <option>). */
export function legOptionLabel({ from, to }: LegSchedule): string {
  return `${from.name} → ${to.name}`;
}

/** What the selected view covers, in the route's own seconds. */
export function viewNote(schedule: readonly LegSchedule[], { view, leg }: ViewSelection): string {
  if (view === 'ruta') {
    return `La ruta entera dura ${seconds(schedule[schedule.length - 1].end)}.`;
  }
  const { departure, arrival } = schedule[Math.min(Math.max(leg, 0), schedule.length - 1)];
  return `Sale en t = ${seconds(departure)} de la ruta y dura ${seconds(arrival - departure)}.`;
}
