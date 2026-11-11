/**
 * TransportBar's events (`markers`): the marks on its timeline and the row under it with «Evento
 * anterior / siguiente», the event the time stands on and the t readout. See transportMarkers.ts.
 */
import { useState, type CSSProperties, type JSX } from 'react';
import { ICON_BUTTON } from './iconButton';
import {
  markersAt,
  markersText,
  nextMarkerTime,
  previousMarkerTime,
  type TransportMarker,
} from './transportMarkers';
import type { SimClock } from './useSimClock';

/**
 * A mark sits under the thumb's centre at its time: the native thumb is 16 px wide and travels
 * from 8 px to (width − 8 px), whatever the root size. `--mark-at` is the time over the duration.
 * The marks fill a strip under the range (MARKS_STRIP), clear of the track and the thumb.
 */
const MARK = 'absolute inset-y-0 left-[calc(8px+(100%-16px)*var(--mark-at))] -translate-x-1/2';
/** A stop is a thin tick of the muted ink; a peak, a wider one of the full ink. */
const MARK_KIND: Readonly<Record<'stop' | 'peak', string>> = {
  stop: 'w-0.5 bg-fg-muted',
  peak: 'w-1 rounded-sm bg-fg',
};
/** The timeline's cell with events: the range, then 8 px under it the strip of marks. */
export const TIMELINE_WITH_MARKS = 'relative min-w-32 flex-1 py-2';
const MARKS_STRIP = 'pointer-events-none absolute inset-x-0 bottom-0 h-2';
/** The event buttons: the icon button, dimmed and inert (yet focusable) at the ends. */
const EVENT_BUTTON = `${ICON_BUTTON} aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-border aria-disabled:hover:text-fg-muted`;

const markKind = (kind: TransportMarker['kind']) => (kind === 'peak' ? 'peak' : 'stop');

export interface TimelineMarksProps {
  markers: readonly TransportMarker[];
  duration: number;
}

/** The markers as ticks under the range, each where the thumb stands at its time: drawing only. */
export function TimelineMarks({ markers, duration }: TimelineMarksProps): JSX.Element {
  return (
    <div data-transport-marks="" aria-hidden="true" className={MARKS_STRIP}>
      {markers.map((marker, i) => (
        <span
          key={`${marker.t}-${i}`}
          data-transport-mark=""
          data-kind={markKind(marker.kind)}
          style={{ '--mark-at': String(marker.t / duration) } as CSSProperties}
          className={`${MARK} ${MARK_KIND[markKind(marker.kind)]}`}
        />
      ))}
    </div>
  );
}

function PreviousIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h2v14H6ZM18 5v14L9 12Z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 5h2v14h-2ZM6 5v14l9-7Z" />
    </svg>
  );
}

export interface EventRowProps {
  clock: SimClock;
  markers: readonly TransportMarker[];
  /** Half a timeline step (s): see markerTolerance. */
  tolerance: number;
  /** The t readout of the settled time («t = 312 s»). */
  timeText: string;
  /** «t = …» of any time, in the run's unit. */
  timeTextOf: (t: number) => string;
}

/**
 * «Evento anterior», «Evento siguiente», the event the settled time stands on (a visual copy of
 * what the timeline's aria-valuetext says) and the t readout; a button seeks from the live time
 * and its target is said in a status region. At the ends a button is aria-disabled, not disabled,
 * so it keeps the focus.
 */
export function EventRow({
  clock,
  markers,
  tolerance,
  timeText,
  timeTextOf,
}: EventRowProps): JSX.Element {
  const [announcement, setAnnouncement] = useState('');
  const { t } = clock.state;
  const hasPrevious = previousMarkerTime(markers, t, tolerance) !== undefined;
  const hasNext = nextMarkerTime(markers, t, tolerance) !== undefined;
  const goTo = (isEnabled: boolean, find: typeof nextMarkerTime) => {
    if (!isEnabled) return;
    const target = find(markers, clock.frame.get(), tolerance);
    if (target === undefined) return;
    clock.seek(target);
    setAnnouncement(
      `${markersText(markers, markersAt(markers, target, tolerance))} · ${timeTextOf(target)}`,
    );
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Evento anterior"
        aria-disabled={!hasPrevious}
        onClick={() => goTo(hasPrevious, previousMarkerTime)}
        className={EVENT_BUTTON}
      >
        <PreviousIcon />
      </button>
      <button
        type="button"
        aria-label="Evento siguiente"
        aria-disabled={!hasNext}
        onClick={() => goTo(hasNext, nextMarkerTime)}
        className={EVENT_BUTTON}
      >
        <NextIcon />
      </button>
      <span
        data-transport-event=""
        aria-hidden="true"
        className="min-w-0 flex-1 text-xs text-fg-muted"
      >
        {markersText(markers, markersAt(markers, t, tolerance))}
      </span>
      <span className="font-mono text-sm tabular-nums">{timeText}</span>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
