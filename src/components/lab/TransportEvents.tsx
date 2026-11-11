/**
 * TransportBar's events (`markers`): the marks under its timeline and the row under it with
 * «Evento anterior / siguiente», the event the time stands on and the t readout. See
 * transportMarkers.ts.
 */
import { useEffect, useState, type CSSProperties, type JSX } from 'react';
import { ICON_BUTTON } from './iconButton';
import {
  markersAt,
  markersText,
  nextMarkerTime,
  previousMarkerTime,
  type NormalizedMarkers,
  type TransportMarker,
} from './transportMarkers';
import type { SimClock } from './useSimClock';

/**
 * A mark sits under the thumb's centre at its time: the native thumb is 16 px wide and travels
 * from 8 px to (width − 8 px), whatever the root size (an assumption: README, «Escala de tiempo y
 * eventos»). `--mark-at` is the time over the duration. The marks are borders, not fills, so
 * forced colors keep them.
 */
const MARK = 'absolute inset-y-0 left-[calc(8px+(100%-16px)*var(--mark-at))] -translate-x-1/2';
/** A stop is a thin tick of the muted ink; a peak, a wider one of the full ink. */
const MARK_KIND: Readonly<Record<'stop' | 'peak', string>> = {
  stop: 'w-0.5 border-l-2 border-fg-muted',
  peak: 'w-1 border-x-2 border-fg',
};
/**
 * The timeline's cell with events: the 8 px strip of marks at the bottom, and the range over the
 * whole cell (40 px, its track and thumb centred, the thumb clear of the strip). The marks take no
 * pointer events, so a click on one lands on the range there, as on any point of it.
 */
export const TIMELINE_WITH_MARKS = 'relative min-w-32 flex-1';
export const RANGE_WITH_MARKS = 'relative block h-10 w-full';
const MARKS_STRIP = 'pointer-events-none absolute inset-x-0 bottom-0 h-2';
/** The event buttons: the icon button, dimmed and inert (yet focusable) at the ends. */
const EVENT_BUTTON = `${ICON_BUTTON} aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-border aria-disabled:hover:text-fg-muted`;

const markKind = (kind: TransportMarker['kind']) => (kind === 'peak' ? 'peak' : 'stop');

export interface TimelineMarksProps {
  markers: NormalizedMarkers;
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

/** What the status region says, the time it is about and a counter that renews its node. */
interface Announcement {
  text: string;
  at: number;
  count: number;
}

type Direction = 'previous' | 'next';

/** «No hay evento siguiente; el último es Detención 17 de 17 · t = 1 360 s». */
function noFurtherEvent(
  direction: Direction,
  markers: NormalizedMarkers,
  tolerance: number,
  timeTextOf: (t: number) => string,
): string {
  const end = direction === 'next' ? markers[markers.length - 1] : markers[0];
  const name = markersText(markers, markersAt(markers, end.t, tolerance));
  const lead =
    direction === 'next'
      ? 'No hay evento siguiente; el último es'
      : 'No hay evento anterior; el primero es';
  return `${lead} ${name} · ${timeTextOf(end.t)}`;
}

export interface EventRowProps {
  clock: SimClock;
  markers: NormalizedMarkers;
  /** Half a timeline step (s): see markerTolerance. */
  tolerance: number;
  /** The event the settled time stands on, as TransportBar names it (undefined between events). */
  eventText: string | undefined;
  /** The t readout of the settled time («t = 312 s»). */
  timeText: string;
  /** «t = …» of any time, in the run's unit. */
  timeTextOf: (t: number) => string;
}

/**
 * The status region's text: set on a press (a new node each time, so the same text is spoken
 * again), cleared once playback starts or the time leaves the moment it spoke about.
 */
function useEventAnnouncement(clock: SimClock, tolerance: number) {
  const [announcement, setAnnouncement] = useState<Announcement | undefined>(undefined);
  const { t, playing } = clock.state;
  const isStale =
    announcement !== undefined && (playing || Math.abs(t - announcement.at) > tolerance);
  useEffect(() => {
    if (isStale) setAnnouncement(undefined);
  }, [isStale]);
  const announce = (text: string, at: number) =>
    setAnnouncement((last) => ({ text, at, count: (last?.count ?? 0) + 1 }));
  return { announcement: isStale ? undefined : announcement, announce };
}

const FINDERS = { previous: previousMarkerTime, next: nextMarkerTime } as const;

/**
 * The buttons' state (from the settled time) and action (from the live time): seek to the
 * neighbouring event and say it, or, at an end (aria-disabled, so the button keeps the focus),
 * say which event is the last or the first.
 */
function useEventNavigation({ clock, markers, tolerance, timeTextOf }: EventRowProps) {
  const { announcement, announce } = useEventAnnouncement(clock, tolerance);
  const { t } = clock.state;
  const isEnabled = (direction: Direction) =>
    FINDERS[direction](markers, t, tolerance) !== undefined;
  const goTo = (direction: Direction) => {
    const target = isEnabled(direction)
      ? FINDERS[direction](markers, clock.frame.get(), tolerance)
      : undefined;
    if (target === undefined) {
      announce(noFurtherEvent(direction, markers, tolerance, timeTextOf), t);
      return;
    }
    clock.seek(target);
    const name = markersText(markers, markersAt(markers, target, tolerance));
    announce(`${name} · ${timeTextOf(target)}`, target);
  };
  return { announcement, isEnabled, goTo };
}

/**
 * «Evento anterior», «Evento siguiente», the event the settled time stands on (a visual copy of
 * the timeline's aria-valuetext, two lines at most) and the t readout; the row wraps (the readout
 * first) only by its width, so its height holds while playing.
 */
export function EventRow(props: EventRowProps): JSX.Element {
  const { clock, eventText, timeText, timeTextOf } = props;
  const { announcement, isEnabled, goTo } = useEventNavigation(props);
  // The readout is as wide as its longest text (mono): the row wraps by its width, never by t.
  const longestTime = `${[...timeTextOf(clock.state.duration)].length}ch`;
  const button = (direction: Direction, label: string, icon: JSX.Element) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-disabled={!isEnabled(direction)}
      onClick={() => goTo(direction)}
      className={EVENT_BUTTON}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {button('previous', 'Evento anterior', <PreviousIcon />)}
      {button('next', 'Evento siguiente', <NextIcon />)}
      <span
        data-transport-event=""
        aria-hidden="true"
        className="line-clamp-2 min-w-24 flex-1 text-xs text-fg-muted"
      >
        {eventText}
      </span>
      <span style={{ minWidth: longestTime }} className="font-mono text-sm tabular-nums">
        {timeText}
      </span>
      <p role="status" className="sr-only">
        {announcement ? <span key={announcement.count}>{announcement.text}</span> : null}
      </p>
    </div>
  );
}
