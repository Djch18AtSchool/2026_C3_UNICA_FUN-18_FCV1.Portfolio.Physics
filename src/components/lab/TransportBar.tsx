import { useMemo, useRef, type JSX } from 'react';
import { ICON_BUTTON } from './iconButton';
import {
  EventLine,
  EventPair,
  MIN_EVENTS_FOR_PAIR,
  RANGE_WITH_MARKS,
  TimelineMarks,
} from './TransportEvents';
import { markerTolerance, normalizeMarkers, type TransportMarker } from './transportMarkers';
import {
  readingFormatter,
  transportTexts,
  widestReading,
  type TransportTimeFormat,
} from './transportReading';
import { TIMELINE_STEPS, type TransportTimeUnitChoice } from './transportTime';
import TransportSpeed from './TransportSpeed';
import { useFrameEffect } from './useFrameTime';
import type { SimClock } from './useSimClock';

export interface TransportBarProps {
  clock: SimClock;
  /** Step (s) for frame-by-frame stepping; the timeline keeps the native range keyboard. */
  stepSize?: number;
  /** Display unit of the t readout; 'auto' (default) picks it from the run's duration. */
  timeUnit?: TransportTimeUnitChoice;
  /**
   * Events on the clock (s): marks on the timeline and the line that names the event the time
   * stands on (or the next one); from two in range, «Evento anterior | siguiente» too
   * (transportMarkers.ts, TransportEvents.tsx). Without any in range, the bar is the plain one.
   */
  markers?: readonly TransportMarker[];
  /**
   * Where the clock's t = 0 stands in the lab's own time (s), for the reading only: the t
   * readout, aria-valuetext and the event announcements say origin + t, while the timeline, the
   * markers and seek stay on the clock. A «Tramo» view with a clock of its own reads the cycle's
   * time this way. 0 (default), or any value that is not a finite number, shifts nothing.
   */
  timeOrigin?: number;
  /**
   * The lab's own reading of a time (s, already shifted by `timeOrigin`), for the readout,
   * aria-valuetext and the event announcements: «t = 22,52 h» of orbit for a clock that counts
   * playback seconds. Reading only, like `timeOrigin`; an empty text falls back to «t = …».
   */
  formatTime?: TransportTimeFormat;
  /** The speeds of the speed select, in order; DEFAULT_SPEEDS (0,25× to 2×) when omitted. */
  speeds?: readonly number[];
}

const NO_MARKERS: readonly TransportMarker[] = [];

/** The timeline maps t ∈ [0, duration] onto 0..RANGE_MAX integer positions. */
const RANGE_MAX = TIMELINE_STEPS;

function PlayIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15l12-7.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.5 4.5h4v15h-4ZM13.5 4.5h4v15h-4Z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12a8 8 0 1 0 2.35-5.65" />
      <path d="M4 4v4.5h4.5" />
    </svg>
  );
}

/** Range position of a time t in a run of `duration`. */
const toPosition = (t: number, duration: number) => Math.round((t / duration) * RANGE_MAX);

function TransportButtons({ clock }: { clock: SimClock }): JSX.Element {
  const { playing } = clock.state;
  return (
    <>
      <button
        type="button"
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        onClick={clock.toggle}
        className={ICON_BUTTON}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button type="button" aria-label="Reiniciar" onClick={clock.reset} className={ICON_BUTTON}>
        <ResetIcon />
      </button>
    </>
  );
}

interface TimelineProps {
  clock: SimClock;
  valueText: string;
  className: string;
}

/**
 * The scrubber. Its thumb follows the live time: the range is uncontrolled and its value is
 * written every frame (a property write, no DOM mutation and no render).
 */
function Timeline({ clock, valueText, className }: TimelineProps): JSX.Element {
  const { t, duration } = clock.state;
  const rangeRef = useRef<HTMLInputElement>(null);
  useFrameEffect(
    clock,
    (liveT) => {
      if (rangeRef.current && duration > 0) {
        rangeRef.current.value = String(toPosition(liveT, duration));
      }
    },
    [duration],
  );
  return (
    <input
      ref={rangeRef}
      type="range"
      min={0}
      max={RANGE_MAX}
      step={1}
      defaultValue={toPosition(t, duration)}
      aria-label="Línea de tiempo"
      aria-valuetext={valueText}
      // seek pauses, so scrubbing never fights a running clock.
      onChange={(event) => clock.seek((Number(event.target.value) / RANGE_MAX) * duration)}
      className={`cursor-pointer accent-accent ${className}`}
    />
  );
}

/** The bar's root: a named group that tells whether it plays, the container of its own layout. */
const transportRoot = (playing: boolean) =>
  ({
    role: 'group',
    'aria-label': 'Reproducción',
    'data-playing': playing ? 'true' : 'false',
  }) as const;

/** Without events, with events (marks and the line under the timeline), or with the pair too. */
type Layout = 'plain' | 'events' | 'pair';

const GRID = 'grid items-center gap-x-3 gap-y-2 @xl/transport:gap-y-1';
/**
 * One grid, phone first: the buttons (▶ ↺ 1×▾) on their own row, the timeline with the t readout
 * at its right under them, and under those the event line (beside the pair, when there is one);
 * so nothing passes a 320 px card. From 36 rem of bar, one row: ▶ ↺ 1×▾, the timeline, t and the
 * pair, with the event line under the timeline. The DOM keeps the order of reading in both
 * (buttons, timeline, readout, pair): Tab never goes back up. Tailwind needs each class literal.
 */
const LAYOUT: Readonly<Record<Layout, string>> = {
  plain:
    'grid-cols-[minmax(0,1fr)_auto] [grid-template-areas:"buttons_buttons"_"timeline_time"] @xl/transport:grid-cols-[auto_minmax(8rem,1fr)_auto] @xl/transport:[grid-template-areas:"buttons_timeline_time"]',
  events:
    'grid-cols-[minmax(0,1fr)_auto] [grid-template-areas:"buttons_buttons"_"timeline_time"_"event_event"] @xl/transport:grid-cols-[auto_minmax(8rem,1fr)_auto] @xl/transport:[grid-template-areas:"buttons_timeline_time"_"._event_event"]',
  pair: 'grid-cols-[minmax(0,1fr)_auto] [grid-template-areas:"buttons_buttons"_"timeline_time"_"event_pair"] @xl/transport:grid-cols-[auto_minmax(8rem,1fr)_auto_auto] @xl/transport:[grid-template-areas:"buttons_timeline_time_pair"_"._event_event_event"]',
};
/** The event line keeps two lines on a phone (beside the pair) and one in the row; never less. */
const EVENT_LINE =
  '[grid-area:event] line-clamp-2 min-h-10 @xl/transport:line-clamp-1 @xl/transport:min-h-0';

function layoutOf(eventCount: number): Layout {
  if (eventCount >= MIN_EVENTS_FOR_PAIR) return 'pair';
  return eventCount > 0 ? 'events' : 'plain';
}

/**
 * Play/Pause, Reiniciar, the speed («1×▾»), a timeline scrubber and the t readout in the run's
 * unit (s, min, h or d, or the lab's timeUnit; the clock and the range stay in seconds), in one
 * row where it fits (LAYOUT); nothing when duration is 0. With `markers`, the marks under the
 * timeline and the line naming the event under it; with two or more, «Evento anterior | siguiente»
 * at the end (TransportEvents.tsx). The readout reserves the width of its longest text, so neither
 * the timeline nor the row moves as t runs.
 *
 * The thumb follows the live time (Timeline), while the text and aria-valuetext read the settled
 * time the clock syncs CLOCK_SYNC_HZ times a second, shifted by `timeOrigin` and written by
 * `formatTime` when the lab gives them (transportReading.ts).
 */
export default function TransportBar({
  clock,
  timeUnit = 'auto',
  markers = NO_MARKERS,
  timeOrigin,
  formatTime,
  speeds,
}: TransportBarProps): JSX.Element | null {
  const { t, duration, playing } = clock.state;
  const events = useMemo(() => normalizeMarkers(markers, duration), [markers, duration]);
  if (duration === 0) return null;

  // The default unit and its decimals come from the run's duration; only the reading changes.
  const textOf = readingFormatter({ duration, timeUnit, timeOrigin, formatTime });
  const { timeText, event, valueText, next } = transportTexts({ events, t, duration, textOf });
  const layout = layoutOf(events.length);
  const hasEvents = layout !== 'plain';
  // The readout is as wide as its longest text (mono): nothing beside it moves as t grows.
  const longestTime = `${[...widestReading(textOf, duration)].length}ch`;
  return (
    <div
      {...transportRoot(playing)}
      data-transport-events={hasEvents ? '' : undefined}
      className="@container/transport"
    >
      <div className={`${GRID} ${LAYOUT[layout]}`}>
        <div className="flex items-center gap-3 [grid-area:buttons]">
          <TransportButtons clock={clock} />
          <TransportSpeed clock={clock} speeds={speeds} />
        </div>
        <div className="relative min-w-0 [grid-area:timeline]">
          {hasEvents ? <TimelineMarks markers={events} duration={duration} /> : null}
          <Timeline
            clock={clock}
            valueText={valueText}
            className={hasEvents ? RANGE_WITH_MARKS : 'block h-6 w-full'}
          />
        </div>
        <span
          data-transport-time=""
          style={{ minWidth: longestTime }}
          className="justify-self-end text-right text-sm tabular-nums [grid-area:time]"
        >
          {timeText}
        </span>
        {layout === 'pair' ? (
          <EventPair
            clock={clock}
            markers={events}
            tolerance={markerTolerance(duration)}
            timeTextOf={textOf}
            className="justify-self-end [grid-area:pair]"
          />
        ) : null}
        {hasEvents ? <EventLine eventText={event} nextText={next} className={EVENT_LINE} /> : null}
      </div>
    </div>
  );
}
