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
import {
  DEFAULT_SELECTION,
  LEG_TIME_LAPSE,
  ROUTE_TIME_LAPSE,
  legAtTime,
  legOptionLabel,
  localTime,
  openingTime,
  viewNote,
  viewSpan,
} from './routeView';

const SCHEDULE = routeSchedule(DRONE_ROUTE);
const SAMPLES = generateRoute(DRONE_ROUTE);
const STEP = DRONE_ROUTE.dt;
const RUTA = viewSpan(SCHEDULE, { view: 'ruta', leg: 0 }, STEP);
/** The sample of the flight at a grid instant t, with no interpolation: what the lab reads there. */
const sampleOnGrid = (t: number) => SAMPLES[Math.round(t / STEP)];
const isOnGrid = (t: number) => Math.abs(t / STEP - Math.round(t / STEP)) < 1e-6;
/**
 * What the lab shows at a stop (the 0,1 s samples are exact there): on it and not moving; and, for
 * an arrival, with the acceleration over (the very first instant of the route already accelerates).
 */
function expectAtRestOn(
  t: number,
  stop: { x: number; y: number },
  label: string,
  isArrival = true,
) {
  const sample = sampleOnGrid(t);
  expect(Math.hypot(sample.x - stop.x, sample.y - stop.y), label).toBeLessThan(1e-6);
  expect(sample.speed, label).toBe(0);
  if (isArrival) expect(sample.accel, label).toBe(0);
}

describe('viewSpan · Ruta', () => {
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

  test('every mark is the first sample of the flight at rest on a stop of the route model', () => {
    const stops = DRONE_ROUTE.stops;
    expect(RUTA.markers).toHaveLength(stops.length);
    RUTA.markers.slice(0, -1).forEach((marker, i) => {
      const arrival = i === 0 ? 0 : SCHEDULE[i - 1].arrival;

      expect(isOnGrid(marker.t), marker.label).toBe(true);
      expect(marker.t, marker.label).toBeGreaterThanOrEqual(arrival);
      expect(marker.t, marker.label).toBeLessThan(arrival + STEP);
      expectAtRestOn(marker.t, stops[i], marker.label, i > 0);
    });
  });

  test('the arrival at the depot, the end of the route, is its last instant', () => {
    expect(RUTA.markers.at(-1)?.t).toBe(RUTA.duration);
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

describe('viewSpan · Tramo', () => {
  test('plays one leg at real speed, from just before its departure to its arrival', () => {
    SCHEDULE.forEach((leg, index) => {
      const span = viewSpan(SCHEDULE, { view: 'tramo', leg: index }, STEP);

      expect(isOnGrid(span.start)).toBe(true);
      expect(span.start).toBeLessThanOrEqual(leg.departure + 1e-9);
      expect(span.start).toBeGreaterThan(leg.departure - STEP);
      expect(span.start + span.duration).toBeGreaterThanOrEqual(leg.arrival);
      expect(span.start + span.duration).toBeLessThan(leg.arrival + STEP);
      expect(span.timeScale).toBe(LEG_TIME_LAPSE);
    });
    expect(LEG_TIME_LAPSE).toBe(1);
  });

  test('its marks are on the leg own clock: the departure at 0 and the arrival at its end', () => {
    const second = viewSpan(SCHEDULE, { view: 'tramo', leg: 1 }, STEP);

    expect(second.markers.map((marker) => marker.label)).toEqual([
      'Salida de A',
      'Fin de la aceleración',
      'Inicio del frenado',
      'Llegada a B',
    ]);
    const [departure, accelerated, braking, arrival] = second.markers.map((marker) => marker.t);
    const { accelDuration } = SCHEDULE[1];
    expect(departure).toBe(0);
    expect(accelerated).toBeGreaterThanOrEqual(accelDuration);
    expect(accelerated).toBeLessThan(accelDuration + 2 * STEP);
    expect(braking).toBeGreaterThan(second.duration - accelDuration - STEP);
    expect(braking).toBeLessThan(second.duration - accelDuration + 2 * STEP);
    expect(arrival).toBe(second.duration);
  });

  test('the departure and the arrival are the flight at rest on the two stops of the leg', () => {
    SCHEDULE.forEach((leg, index) => {
      const span = viewSpan(SCHEDULE, { view: 'tramo', leg: index }, STEP);

      expectAtRestOn(span.start, leg.from, `salida ${index}`, index > 0);
      // The last arrival is the route's own end (off the grid): the lab already reads it there.
      if (index < SCHEDULE.length - 1) {
        expectAtRestOn(span.start + span.duration, leg.to, `llegada ${index}`);
      }
    });
  });

  test('the phase marks fall where the sampled flight has stopped accelerating and started braking', () => {
    const span = viewSpan(SCHEDULE, DEFAULT_SELECTION, STEP);
    const [, accelerated, braking] = span.markers.map((marker) => marker.t);

    expect(isOnGrid(span.start + accelerated)).toBe(true);
    expect(sampleOnGrid(span.start + accelerated).accel).toBe(0);
    expect(sampleOnGrid(span.start + accelerated).speed).toBeCloseTo(10, 9);
    expect(sampleOnGrid(span.start + braking).accel).toBeCloseTo(2.5, 9);
    expect(sampleOnGrid(span.start + braking).speed).toBeGreaterThan(9.7);
  });

  test('a leg too short to cruise has its two phase marks at the same instant', () => {
    const short: RouteDefinition = {
      ...DRONE_ROUTE,
      stops: [DRONE_ROUTE.stops[0], { name: 'A', x: 20, y: 0, dwell: 5 }],
    };
    const span = viewSpan(routeSchedule(short), DEFAULT_SELECTION, STEP);
    const [, accelerated, braking] = span.markers.map((marker) => marker.t);

    expect(Math.abs(accelerated - braking)).toBeLessThanOrEqual(STEP + 1e-9);
    expect(normalizeMarkers(span.markers, span.duration)).toHaveLength(4);
  });

  test('the last leg ends where the route ends, not on the sample after it', () => {
    const last = viewSpan(SCHEDULE, { view: 'tramo', leg: 3 }, STEP);

    expect(last.start + last.duration).toBeCloseTo(RUTA.duration, 9);
  });

  test('an out-of-range leg falls back to the last one', () => {
    const span = viewSpan(SCHEDULE, { view: 'tramo', leg: 99 }, STEP);
    const { departure } = SCHEDULE[SCHEDULE.length - 1];

    expect(span.start).toBeLessThanOrEqual(departure + 1e-9);
    expect(span.start).toBeGreaterThan(departure - STEP);
  });

  test('without a sample step the marks are the model instants themselves', () => {
    const span = viewSpan(SCHEDULE, DEFAULT_SELECTION);

    expect(span.markers.at(-1)?.t).toBe(SCHEDULE[0].arrival);
    expect(viewSpan(SCHEDULE, { view: 'ruta', leg: 0 }).markers.map((m) => m.t)).toEqual([
      0,
      ...SCHEDULE.map((leg) => leg.arrival),
    ]);
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
  const second = viewSpan(SCHEDULE, { view: 'tramo', leg: 1 }, STEP);

  test('localTime is the route time on the span own clock, held inside it', () => {
    expect(localTime(second, second.start + 12)).toBeCloseTo(12, 9);
    expect(localTime(second, 0)).toBe(0);
    expect(localTime(second, RUTA.duration)).toBe(second.duration);
    expect(localTime(RUTA, 123)).toBe(123);
  });

  test('openingTime shows the drone cruising: 30 s in, or the middle of a short leg', () => {
    expect(openingTime(viewSpan(SCHEDULE, DEFAULT_SELECTION, STEP))).toBe(30);
    expect(openingTime({ ...second, duration: 20 })).toBe(10);
  });
});

describe('legOptionLabel and viewNote', () => {
  test('names a leg by the stops it joins', () => {
    expect(SCHEDULE.map(legOptionLabel)).toEqual([
      'Del depósito a A',
      'De A a B',
      'De B a C',
      'De C al depósito',
    ]);
  });

  test('Tramo says when the leg departs on the route and how long it lasts: the clock the lab runs', () => {
    const selection = { view: 'tramo', leg: 1 } as const;
    const note = viewNote(viewSpan(SCHEDULE, selection, STEP), selection).replace(/\s/g, ' ');

    expect(note).toBe('Sale en t = 87,2 s de la ruta y dura 71,2 s.');
  });

  test('Ruta says how long the whole route lasts', () => {
    const selection = { view: 'ruta', leg: 0 } as const;

    expect(viewNote(viewSpan(SCHEDULE, selection, STEP), selection).replace(/\s/g, ' ')).toBe(
      'La ruta entera dura 387,4 s.',
    );
  });
});
