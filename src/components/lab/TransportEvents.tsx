/**
 * TransportBar's events (`markers`): the marks under its timeline, the line under it that names
 * the event the time stands on (or the next one), and, from MIN_EVENTS_FOR_PAIR events, the joined
 * pair «Evento anterior | siguiente» at the end of the row. See transportMarkers.ts.
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
 * The pair takes a place in the row only where it adds something: with one event the mark, the
 * line under the timeline and the timeline's aria-valuetext say it, and a click on the mark goes
 * there; from two on, the keyboard needs the pair to reach them (WCAG 2.1.1: the timeline's arrows
 * move by 1/1 000 of the run and pass them by).
 */
export const MIN_EVENTS_FOR_PAIR = 2;

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
export const RANGE_WITH_MARKS = 'relative block h-10 w-full';
const MARKS_STRIP = 'pointer-events-none absolute inset-x-0 bottom-0 h-2';
/**
 * The event buttons: icon buttons joined into one pair (the second loses its left border and the
 * inner corners square off), dimmed and inert (yet focusable) at the ends.
 */
const EVENT_BUTTON = `${ICON_BUTTON} aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:border-border aria-disabled:hover:text-fg-muted`;
const PAIR_SIDE: Readonly<Record<Direction, string>> = {
  previous: 'rounded-r-none',
  next: 'rounded-l-none border-l-0',
};

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

/**
 * An event button's icon: a mark standing on a track, as under the timeline, and an arrow that
 * goes to it from the side the button looks (not ⏮ ⏭, which read as «to the start / to the end»).
 */
function EventIcon({ direction }: { direction: Direction }) {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-event-icon={direction}
    >
      <path d="M3 20h18" />
      <path d={direction === 'next' ? 'M17 12v8' : 'M7 12v8'} />
      <path d={direction === 'next' ? 'M4 6h9m-3-3 3 3-3 3' : 'M20 6h-9m3-3-3 3 3 3'} />
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

export interface EventPairProps {
  clock: SimClock;
  markers: NormalizedMarkers;
  /** Half a timeline step (s): see markerTolerance. */
  tolerance: number;
  /** «t = …» of any clock time, as the transport reads it. */
  timeTextOf: (t: number) => string;
  /** Places the pair in the transport's grid. */
  className: string;
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
function useEventNavigation({ clock, markers, tolerance, timeTextOf }: EventPairProps) {
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
 * «Evento anterior | Evento siguiente», joined, and the status region that says where a press
 * went. In the order of reading and of Tab: right after the timeline (and its t readout).
 */
export function EventPair(props: EventPairProps): JSX.Element {
  const { announcement, isEnabled, goTo } = useEventNavigation(props);
  const button = (direction: Direction, label: string) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-disabled={!isEnabled(direction)}
      onClick={() => goTo(direction)}
      className={`${EVENT_BUTTON} ${PAIR_SIDE[direction]}`}
    >
      <EventIcon direction={direction} />
    </button>
  );
  return (
    <div data-transport-pair="" className={`flex ${props.className}`}>
      {button('previous', 'Evento anterior')}
      {button('next', 'Evento siguiente')}
      <p role="status" className="sr-only">
        {announcement ? <span key={announcement.count}>{announcement.text}</span> : null}
      </p>
    </div>
  );
}

export interface EventLineProps {
  /** The event the settled time stands on, as TransportBar names it (undefined between events). */
  eventText: string | undefined;
  /** Between events, the next one with its reading («Siguiente: … · t = …»); none after the last. */
  nextText?: string;
  /** Places the line in the transport's grid and sets how many lines it keeps. */
  className: string;
}

/** A line with nothing to say (after the last event) still holds its height. */
const EMPTY_LINE = '\u00a0';

/** What the line's text is: the event the time is on, the next one, or nothing (''). */
function eventKind(eventText: string | undefined, nextText: string | undefined): string {
  if (eventText !== undefined) return 'at';
  return nextText === undefined ? '' : 'next';
}

/**
 * Under the timeline: the event the settled time stands on (a visual copy of the timeline's
 * aria-valuetext, in full ink) or, between events, the next one in a muted tone (what the marks
 * are, before a jump); empty after the last. Its whole text is its title, for when it is cut.
 */
export function EventLine({ eventText, nextText, className }: EventLineProps): JSX.Element {
  return (
    <span
      data-transport-event={eventKind(eventText, nextText)}
      aria-hidden="true"
      title={eventText ?? nextText}
      className={`text-sm ${eventText === undefined ? 'text-fg-muted' : 'text-fg'} ${className}`}
    >
      {eventText ?? nextText ?? EMPTY_LINE}
    </span>
  );
}
