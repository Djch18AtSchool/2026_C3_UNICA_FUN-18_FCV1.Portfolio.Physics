/**
 * Events on a transport's timeline («Detención 5 de 17», «Máxima aproximación»): times on the
 * clock (s), never positions of the range. Pure helpers for TransportBar's marks, its «Evento
 * anterior / siguiente» buttons and the event its timeline names when the time stands on one.
 */
import { TIMELINE_STEPS } from './transportTime';

/** 'stop' (a halt, the default) and 'peak' (a maximum) are drawn apart; any other kind as a stop. */
export type TransportMarkerKind = 'stop' | 'peak' | (string & {});

export interface TransportMarker {
  /** Time on the clock (s), within [0, duration]; markers outside are dropped. */
  readonly t: number;
  /** What happens there, short and in words («Detención»); markers sharing it are numbered. */
  readonly label: string;
  readonly kind?: TransportMarkerKind;
}

/**
 * Half a timeline step (s): a time this close to a marker shows on the marker's thumb position,
 * so it counts as standing on it (no button returns the marker the thumb is on). 0 for a run
 * without a positive finite duration.
 */
export function markerTolerance(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return duration / TIMELINE_STEPS / 2;
}

const isSame = (a: TransportMarker, b: TransportMarker) =>
  a.t === b.t && a.label === b.label && (a.kind ?? 'stop') === (b.kind ?? 'stop');

/**
 * The markers a run can show: finite times within [0, duration] and a non-blank label, sorted by
 * time (ties keep the given order) and without exact duplicates (same time, label and kind; the
 * first stays). Returns a new array; the given one is not touched.
 */
export function normalizeMarkers(
  markers: readonly TransportMarker[],
  duration: number,
): readonly TransportMarker[] {
  const valid = markers.filter(
    ({ t, label }) => Number.isFinite(t) && t >= 0 && t <= duration && label.trim() !== '',
  );
  const sorted = valid.toSorted((a, b) => a.t - b.t);
  return sorted.filter((marker, i) => sorted.findIndex((other) => isSame(other, marker)) === i);
}

/** Time of the first marker after t (beyond the tolerance), or undefined past the last one. */
export function nextMarkerTime(
  markers: readonly TransportMarker[],
  t: number,
  tolerance: number,
): number | undefined {
  return markers.find((marker) => marker.t > t + tolerance)?.t;
}

/** Time of the last marker before t (beyond the tolerance), or undefined before the first one. */
export function previousMarkerTime(
  markers: readonly TransportMarker[],
  t: number,
  tolerance: number,
): number | undefined {
  return markers.findLast((marker) => marker.t < t - tolerance)?.t;
}

/** The markers t stands on (within the tolerance), in order: several when they are tied. */
export function markersAt(
  markers: readonly TransportMarker[],
  t: number,
  tolerance: number,
): readonly TransportMarker[] {
  return markers.filter((marker) => Math.abs(marker.t - t) <= tolerance);
}

/**
 * A marker's name, numbered among the markers that share its label: «Detención 5 de 17»; a label
 * that appears once reads alone («Máxima aproximación»), and so does a marker not in the list.
 */
export function markerName(markers: readonly TransportMarker[], marker: TransportMarker): string {
  const namesakes = markers.filter((other) => other.label === marker.label);
  const index = namesakes.indexOf(marker);
  if (index < 0 || namesakes.length < 2) return marker.label;
  return `${marker.label} ${index + 1} de ${namesakes.length}`;
}

/** The names of `at` (markers of the list) joined by « · », or undefined when there is none. */
export function markersText(
  markers: readonly TransportMarker[],
  at: readonly TransportMarker[],
): string | undefined {
  if (at.length === 0) return undefined;
  return at.map((marker) => markerName(markers, marker)).join(' · ');
}
