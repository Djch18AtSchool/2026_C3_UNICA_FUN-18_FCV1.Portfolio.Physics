import { describe, expect, test } from 'vitest';
import {
  markerName,
  markerTolerance,
  markersAt,
  markersText,
  nextMarkerTime,
  normalizeMarkers,
  previousMarkerTime,
  type TransportMarker,
} from './transportMarkers';

const UDDS = 1369;
const STOPS = normalizeMarkers(
  [
    { t: 120, label: 'Detención' },
    { t: 312, label: 'Detención' },
    { t: 500, label: 'Detención' },
  ],
  UDDS,
);
const NONE = normalizeMarkers([], UDDS);

describe('markerTolerance', () => {
  test('is half a timeline step: a time within it shows on the same thumb position', () => {
    expect(markerTolerance(1000)).toBe(0.5);
    expect(markerTolerance(UDDS)).toBeCloseTo(0.6845, 6);
  });

  test('is 0 for a run without a positive finite duration', () => {
    expect(markerTolerance(0)).toBe(0);
    expect(markerTolerance(-5)).toBe(0);
    expect(markerTolerance(Number.NaN)).toBe(0);
    expect(markerTolerance(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('normalizeMarkers', () => {
  test('sorts by time without touching the caller array', () => {
    const given: readonly TransportMarker[] = [
      { t: 500, label: 'C' },
      { t: 120, label: 'A' },
      { t: 312, label: 'B' },
    ];
    const snapshot = structuredClone(given);

    const sorted = normalizeMarkers(given, UDDS);

    expect(sorted.map((marker) => marker.label)).toEqual(['A', 'B', 'C']);
    expect(given).toEqual(snapshot);
    expect(sorted).not.toBe(given);
  });

  test('keeps the given order between markers at the same time (stable)', () => {
    const tied = normalizeMarkers(
      [
        { t: 10, label: 'Pico', kind: 'peak' },
        { t: 10, label: 'Detención' },
      ],
      UDDS,
    );

    expect(tied.map((marker) => marker.label)).toEqual(['Pico', 'Detención']);
  });

  test('drops markers outside [0, duration] and those with a time that is not finite', () => {
    const kept = normalizeMarkers(
      [
        { t: -1, label: 'antes' },
        { t: 0, label: 'inicio' },
        { t: UDDS, label: 'fin' },
        { t: UDDS + 0.001, label: 'después' },
        { t: Number.NaN, label: 'NaN' },
        { t: Number.POSITIVE_INFINITY, label: 'infinito' },
      ],
      UDDS,
    );

    expect(kept.map((marker) => marker.label)).toEqual(['inicio', 'fin']);
  });

  test('drops markers whose label is blank: an event needs a name to be announced', () => {
    expect(normalizeMarkers([{ t: 3, label: '  ' }], UDDS)).toEqual([]);
  });

  test('removes exact duplicates (same time, label and kind) and keeps the first', () => {
    const kept = normalizeMarkers(
      [
        { t: 312, label: 'Detención' },
        { t: 312, label: 'Detención', kind: 'stop' },
        { t: 312, label: 'Detención' },
        { t: 312, label: 'Pico', kind: 'peak' },
      ],
      UDDS,
    );

    expect(kept).toEqual([
      { t: 312, label: 'Detención' },
      { t: 312, label: 'Pico', kind: 'peak' },
    ]);
  });

  test('a run of duration 0 keeps no marker at all but one at t = 0', () => {
    expect(normalizeMarkers(STOPS, 0)).toEqual([]);
    expect(normalizeMarkers([{ t: 0, label: 'inicio' }], 0)).toEqual([{ t: 0, label: 'inicio' }]);
  });

  test('an empty list stays empty', () => {
    expect(normalizeMarkers([], UDDS)).toEqual([]);
  });
});

describe('nextMarkerTime and previousMarkerTime', () => {
  const tolerance = markerTolerance(UDDS);

  test('from between two markers, go to the one after and the one before', () => {
    expect(nextMarkerTime(STOPS, 200, tolerance)).toBe(312);
    expect(previousMarkerTime(STOPS, 200, tolerance)).toBe(120);
  });

  test('standing on a marker never returns that same marker', () => {
    expect(nextMarkerTime(STOPS, 312, tolerance)).toBe(500);
    expect(previousMarkerTime(STOPS, 312, tolerance)).toBe(120);
  });

  test('within the tolerance of a marker counts as standing on it', () => {
    expect(nextMarkerTime(STOPS, 312 - tolerance / 2, tolerance)).toBe(500);
    expect(previousMarkerTime(STOPS, 312 + tolerance / 2, tolerance)).toBe(120);
  });

  test('just beyond the tolerance, the marker is reachable again', () => {
    expect(nextMarkerTime(STOPS, 312 - 2 * tolerance, tolerance)).toBe(312);
    expect(previousMarkerTime(STOPS, 312 + 2 * tolerance, tolerance)).toBe(312);
  });

  test('past the last marker there is no next one; before the first, no previous one', () => {
    expect(nextMarkerTime(STOPS, 500, tolerance)).toBeUndefined();
    expect(nextMarkerTime(STOPS, UDDS, tolerance)).toBeUndefined();
    expect(previousMarkerTime(STOPS, 120, tolerance)).toBeUndefined();
    expect(previousMarkerTime(STOPS, 0, tolerance)).toBeUndefined();
  });

  test('from the start, a marker at t = 0 is the current one, not the next', () => {
    const fromZero = normalizeMarkers([{ t: 0, label: 'Salida' }, ...STOPS], UDDS);

    expect(nextMarkerTime(fromZero, 0, tolerance)).toBe(120);
  });

  test('markers tied in time are one stop of the navigation', () => {
    const tied = [...STOPS, { t: 312, label: 'Pico', kind: 'peak' }];
    const sorted = normalizeMarkers(tied, UDDS);

    expect(nextMarkerTime(sorted, 200, tolerance)).toBe(312);
    expect(nextMarkerTime(sorted, 312, tolerance)).toBe(500);
    expect(previousMarkerTime(sorted, 500, tolerance)).toBe(312);
  });

  test('no markers: nothing before or after', () => {
    expect(nextMarkerTime(NONE, 10, tolerance)).toBeUndefined();
    expect(previousMarkerTime(NONE, 10, tolerance)).toBeUndefined();
  });
});

describe('markersAt', () => {
  const tolerance = markerTolerance(UDDS);

  test('returns the markers the time stands on, within the tolerance', () => {
    expect(markersAt(STOPS, 312, tolerance)).toEqual([STOPS[1]]);
    expect(markersAt(STOPS, 312 + 0.9 * tolerance, tolerance)).toEqual([STOPS[1]]);
    expect(markersAt(STOPS, 312 - 0.9 * tolerance, tolerance)).toEqual([STOPS[1]]);
  });

  test('returns nothing between markers', () => {
    expect(markersAt(STOPS, 313, tolerance)).toEqual([]);
  });

  test('returns every marker tied at that time, in order', () => {
    const tied = normalizeMarkers([...STOPS, { t: 312, label: 'Pico', kind: 'peak' }], UDDS);

    expect(markersAt(tied, 312, tolerance).map((marker) => marker.label)).toEqual([
      'Detención',
      'Pico',
    ]);
  });
});

describe('markerName', () => {
  test('numbers a marker among those that share its label: «Detención 2 de 3»', () => {
    expect(markerName(STOPS, STOPS[1])).toBe('Detención 2 de 3');
  });

  test('a label that appears once reads alone, without «1 de 1»', () => {
    const markers = normalizeMarkers(
      [...STOPS, { t: 900, label: 'Máxima aproximación', kind: 'peak' }],
      UDDS,
    );

    expect(markerName(markers, markers[3])).toBe('Máxima aproximación');
  });

  test('counts each label on its own when labels are mixed', () => {
    const mixed = normalizeMarkers(
      [
        { t: 1, label: 'Parada' },
        { t: 2, label: 'Despegue' },
        { t: 3, label: 'Parada' },
        { t: 4, label: 'Despegue' },
      ],
      UDDS,
    );

    expect(mixed.map((marker) => markerName(mixed, marker))).toEqual([
      'Parada 1 de 2',
      'Despegue 1 de 2',
      'Parada 2 de 2',
      'Despegue 2 de 2',
    ]);
  });

  test('a marker that is not in the list reads as its bare label', () => {
    expect(markerName(STOPS, { t: 7, label: 'Detención' })).toBe('Detención');
  });
});

describe('markersText', () => {
  test('joins the names of the markers at a time with « · »', () => {
    const tied = normalizeMarkers([...STOPS, { t: 312, label: 'Pico', kind: 'peak' }], UDDS);

    expect(markersText(tied, markersAt(tied, 312, markerTolerance(UDDS)))).toBe(
      'Detención 2 de 3 · Pico',
    );
  });

  test('is undefined when there is no marker', () => {
    expect(markersText(STOPS, [])).toBeUndefined();
  });

  test('the helpers only take a normalized list (a plain array does not type-check)', () => {
    const plain: readonly TransportMarker[] = [
      { t: 500, label: 'B' },
      { t: 100, label: 'A' },
    ];

    // @ts-expect-error: an unsorted plain array would make «next» the first larger, not the next.
    expect(nextMarkerTime(plain, 0, 0)).toBe(500);
    expect(nextMarkerTime(normalizeMarkers(plain, UDDS), 0, 0)).toBe(100);
  });
});
