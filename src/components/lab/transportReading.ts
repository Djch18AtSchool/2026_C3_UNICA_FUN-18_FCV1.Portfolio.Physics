/**
 * What the transport reads (TransportBar): the «t = …» text of any clock time, shifted by the
 * lab's `timeOrigin` and written by its `formatTime` when it gives them; the event the settled time
 * stands on, or the next one; and the widest reading of the run, the readout's reserved width.
 * The timeline, the markers and seek never see any of this: they stay on the clock.
 */
import {
  markersAt,
  markersText,
  markerTolerance,
  nextMarkerTime,
  type NormalizedMarkers,
} from './transportMarkers';
import { transportTimeText, type TransportTimeUnitChoice } from './transportTime';

/** A reading of a time (s, already shifted by the origin): «t = 22,52 h». */
export type TransportTimeFormat = (time: number) => string;

export interface ReadingOptions {
  /** The clock's duration (s): it fixes the default unit and its decimals. */
  duration: number;
  timeUnit?: TransportTimeUnitChoice;
  /** Where the clock's t = 0 stands in the lab's time (s); not finite: 0. */
  timeOrigin?: number;
  /** The lab's own reading of a shifted time; an empty text falls back to the default one. */
  formatTime?: TransportTimeFormat;
}

/** The reading of a clock time: origin + t, in the lab's format or the transport's own. */
export function readingFormatter({
  duration,
  timeUnit = 'auto',
  timeOrigin = 0,
  formatTime,
}: ReadingOptions): (clockT: number) => string {
  const origin = Number.isFinite(timeOrigin) ? timeOrigin : 0;
  return (clockT) => {
    const time = origin + clockT;
    return formatTime?.(time) || transportTimeText(time, duration, timeUnit);
  };
}

/** Clock times, ends included, over which the widest reading of a run is looked for. */
const WIDTH_SAMPLES = 32;

/**
 * The longest reading of the run (in characters): the readout reserves its width, so the row
 * never re-wraps as t runs, whatever the origin's sign or the lab's format.
 */
export function widestReading(textOf: (clockT: number) => string, duration: number): string {
  const texts = Array.from({ length: WIDTH_SAMPLES + 1 }, (_, i) =>
    textOf((i / WIDTH_SAMPLES) * duration),
  );
  return texts.reduce((widest, text) => ([...text].length > [...widest].length ? text : widest));
}

export interface TransportTexts {
  /** The readout: «t = 397,00 s». */
  timeText: string;
  /** The event the time stands on («Detención 3 de 17»), if any. */
  event: string | undefined;
  /** The timeline's aria-valuetext: the reading, and the event while on it. */
  valueText: string;
  /** Between events, the next one: «Siguiente: Detención 3 de 17 · t = 397,00 s». */
  next: string | undefined;
}

export interface TextsInput {
  events: NormalizedMarkers;
  /** The settled clock time (s). */
  t: number;
  duration: number;
  textOf(clockT: number): string;
}

/** The transport's texts at the settled time `t`. */
export function transportTexts({ events, t, duration, textOf }: TextsInput): TransportTexts {
  const tolerance = markerTolerance(duration);
  const timeText = textOf(t);
  const event = markersText(events, markersAt(events, t, tolerance));
  const nextT = event === undefined ? nextMarkerTime(events, t, tolerance) : undefined;
  const next =
    nextT === undefined
      ? undefined
      : `Siguiente: ${markersText(events, markersAt(events, nextT, tolerance))} · ${textOf(nextT)}`;
  return {
    timeText,
    event,
    valueText: event === undefined ? timeText : `${timeText} · ${event}`,
    next,
  };
}
