import { describe, expect, test } from 'vitest';
import {
  DRONE_ROUTE,
  generateRoute,
  routeDuration,
  routeSchedule,
  type RouteDefinition,
} from '../../../lib/data/droneRoute';
import {
  normalizeMarkers,
  nextMarkerTime,
  previousMarkerTime,
  markerTolerance,
} from '../../lab/transportMarkers';
import { sampleAt } from './routeEdit';
import {
  DEFAULT_SELECTION,
  LEG_TIME_LAPSE,
  ROUTE_TIME_LAPSE,
  legAtTime,
  legOptionLabel,
  localTime,
  openingTime,
  viewNote,
  viewWindow,
} from './routeView';

const SCHEDULE = routeSchedule(DRONE_ROUTE);
const SAMPLES = generateRoute(DRONE_ROUTE);
const RUTA = viewWindow(SCHEDULE, { view: 'ruta', leg: 0 });
/** The drone is within this of the stop (m) when a mark says it has arrived. */
const AT_STOP_M = 0.05;

describe('viewWindow · Ruta', () => {
  test('plays the whole route, from 0 s, at the route time lapse', () => {
    expect(RUTA.start).toBe(0);
    expect(RUTA.duration).toBe(routeDuration(DRONE_ROUTE));
    expect(RUTA.timeScale).toBe(ROUTE_TIME_LAPSE);
    expect(ROUTE_TIME_LAPSE).toBe(4);
  });

  test('marks the departure from the depot and the arrival at A, B, C and the depot', () => {
    expect(RUTA.markers.map((marker) => marker.label)).toEqual([
      'Salida del depósito',
      'Llegada a A',
      'Llegada a B',
      'Llegada a C',
      'Llegada al depósito',
    ]);
  });

  test('every mark is the instant the drone is at rest on a stop of the route model', () => {
    const stops = DRONE_ROUTE.stops;
    expect(RUTA.markers).toHaveLength(stops.length);
    RUTA.markers.forEach((marker, i) => {
      const at = sampleAt(SAMPLES, marker.t);
      expect(Math.hypot(at.x - stops[i].x, at.y - stops[i].y), marker.label).toBeLessThan(
        AT_STOP_M,
      );
      expect(at.speed, marker.label).toBeLessThan(0.5);
    });
    expect(RUTA.markers.map((marker) => marker.t)).toEqual([
      0,
      ...SCHEDULE.map((leg) => leg.arrival),
    ]);
  });

  test('all the marks survive normalization and are reachable one by one with the transport', () => {
    const marks = normalizeMarkers(RUTA.markers, RUTA.duration);
    const tolerance = markerTolerance(RUTA.duration);
    expect(marks).toHaveLength(5);
    expect(previousMarkerTime(marks, 0, tolerance)).toBeUndefined();
    expect(nextMarkerTime(marks, RUTA.duration, tolerance)).toBeUndefined();
    const visited = marks.reduce<number[]>(
      (times) => [...times, nextMarkerTime(marks, times.at(-1) ?? -1, tolerance) ?? NaN],
      [],
    );
    expect(visited).toEqual(marks.map((marker) => marker.t));
  });
});

describe('viewWindow · Tramo', () => {
  test('plays one leg at real speed, from its departure to its arrival', () => {
    SCHEDULE.forEach((leg, index) => {
      const window = viewWindow(SCHEDULE, { view: 'tramo', leg: index });

      expect(window.start).toBe(leg.departure);
      expect(window.duration).toBe(leg.arrival - leg.departure);
      expect(window.timeScale).toBe(LEG_TIME_LAPSE);
    });
    expect(LEG_TIME_LAPSE).toBe(1);
  });

  test('its marks are on the leg own clock: the departure at 0 and the arrival at its end', () => {
    const second = viewWindow(SCHEDULE, { view: 'tramo', leg: 1 });

    expect(second.markers.map((marker) => marker.label)).toEqual([
      'Salida de A',
      'Fin de la aceleración',
      'Inicio del frenado',
      'Llegada a B',
    ]);
    const [departure, accelerated, braking, arrival] = second.markers.map((marker) => marker.t);
    expect(departure).toBe(0);
    expect(accelerated).toBeCloseTo(4, 9);
    expect(braking).toBeCloseTo(second.duration - 4, 9);
    expect(arrival).toBe(second.duration);
  });

  test('the arrival mark is the instant the drone reaches the stop, on the route clock', () => {
    SCHEDULE.forEach((leg, index) => {
      const window = viewWindow(SCHEDULE, { view: 'tramo', leg: index });
      const arrivalMark = window.markers.at(-1);

      const at = sampleAt(SAMPLES, window.start + (arrivalMark?.t ?? NaN));

      expect(Math.hypot(at.x - leg.to.x, at.y - leg.to.y)).toBeLessThan(AT_STOP_M);
    });
  });

  test('the drone stops accelerating and starts braking at the marks between', () => {
    const window = viewWindow(SCHEDULE, DEFAULT_SELECTION);
    const [, accelerated, braking] = window.markers.map((marker) => marker.t);

    expect(sampleAt(SAMPLES, window.start + accelerated - 0.5).accel).toBeCloseTo(2.5, 6);
    expect(sampleAt(SAMPLES, window.start + accelerated + 0.5).accel).toBeCloseTo(0, 6);
    expect(sampleAt(SAMPLES, window.start + braking + 0.5).accel).toBeCloseTo(2.5, 6);
  });

  test('a leg too short to cruise has its two phase marks at the same instant', () => {
    const short: RouteDefinition = {
      ...DRONE_ROUTE,
      stops: [DRONE_ROUTE.stops[0], { name: 'A', x: 20, y: 0, dwell: 5 }],
    };
    const window = viewWindow(routeSchedule(short), DEFAULT_SELECTION);
    const [, accelerated, braking] = window.markers.map((marker) => marker.t);

    expect(accelerated).toBeCloseTo(braking, 9);
    expect(normalizeMarkers(window.markers, window.duration)).toHaveLength(4);
  });

  test('an out-of-range leg falls back to the last one', () => {
    const window = viewWindow(SCHEDULE, { view: 'tramo', leg: 99 });

    expect(window.start).toBe(SCHEDULE.at(-1)?.departure);
  });
});

describe('legAtTime', () => {
  test('finds the leg flying at t; during a dwell, the one that just arrived', () => {
    expect(legAtTime(SCHEDULE, 0)).toBe(0);
    expect(legAtTime(SCHEDULE, 30)).toBe(0);
    expect(legAtTime(SCHEDULE, SCHEDULE[0].arrival + 1)).toBe(0);
    expect(legAtTime(SCHEDULE, SCHEDULE[0].end)).toBe(1);
    expect(legAtTime(SCHEDULE, 250)).toBe(2);
  });

  test('t at or past the end of the route belongs to the last leg', () => {
    expect(legAtTime(SCHEDULE, RUTA.duration)).toBe(3);
    expect(legAtTime(SCHEDULE, RUTA.duration + 50)).toBe(3);
  });
});

describe('localTime and openingTime', () => {
  const second = viewWindow(SCHEDULE, { view: 'tramo', leg: 1 });

  test('localTime is the route time on the window own clock, held inside it', () => {
    expect(localTime(second, second.start + 12)).toBeCloseTo(12, 9);
    expect(localTime(second, 0)).toBe(0);
    expect(localTime(second, RUTA.duration)).toBe(second.duration);
    expect(localTime(RUTA, 123)).toBe(123);
  });

  test('openingTime shows the drone cruising: 30 s in, or the middle of a short leg', () => {
    expect(openingTime(viewWindow(SCHEDULE, DEFAULT_SELECTION))).toBe(30);
    expect(openingTime({ ...second, duration: 20 })).toBe(10);
  });
});

describe('legOptionLabel and viewNote', () => {
  test('names a leg by the stops it joins', () => {
    expect(SCHEDULE.map(legOptionLabel)).toEqual([
      'Depósito → A',
      'A → B',
      'B → C',
      'C → Depósito',
    ]);
  });

  test('Tramo says when the leg departs on the route and how long it lasts', () => {
    const note = viewNote(SCHEDULE, { view: 'tramo', leg: 1 }).replace(/\s/g, ' ');

    expect(note).toBe('Sale en t = 87,2 s de la ruta y dura 71,1 s.');
  });

  test('Ruta says how long the whole route lasts', () => {
    expect(viewNote(SCHEDULE, { view: 'ruta', leg: 0 }).replace(/\s/g, ' ')).toBe(
      'La ruta entera dura 387,4 s.',
    );
  });
});
