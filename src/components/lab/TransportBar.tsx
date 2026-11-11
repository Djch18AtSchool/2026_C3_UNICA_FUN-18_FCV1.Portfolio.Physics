import { useMemo, useRef, type JSX } from 'react';
import { ICON_BUTTON } from './iconButton';
import { EventRow, RANGE_WITH_MARKS, TIMELINE_WITH_MARKS, TimelineMarks } from './TransportEvents';
import { markerTolerance, normalizeMarkers, type TransportMarker } from './transportMarkers';
import {
  readingFormatter,
  transportTexts,
  widestReading,
  type TransportTimeFormat,
} from './transportReading';
import { TIMELINE_STEPS, type TransportTimeUnitChoice } from './transportTime';
import { useFrameEffect } from './useFrameTime';
import type { SimClock } from './useSimClock';

export interface TransportBarProps {
  clock: SimClock;
  /** Step (s) for frame-by-frame stepping; the timeline keeps the native range keyboard. */
  stepSize?: number;
  /** Display unit of the t readout; 'auto' (default) picks it from the run's duration. */
  timeUnit?: TransportTimeUnitChoice;
  /**
   * Events on the clock (s): marks on the timeline, «Evento anterior / siguiente» and the event
   * named while the time stands on it (transportMarkers.ts). Without any in range, the bar is the
   * plain one.
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
}

const NO_MARKERS: readonly TransportMarker[] = [];

/** The timeline maps t ∈ [0, duration] onto 0..RANGE_MAX integer positions. */
const RANGE_MAX = TIMELINE_STEPS;

function PlayIcon() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15l12-7.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.5 4.5h4v15h-4ZM13.5 4.5h4v15h-4Z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      className="size-[18px]"
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

/** The bar's root: a named group that tells whether it plays. */
const transportRoot = (playing: boolean) =>
  ({
    role: 'group',
    'aria-label': 'Reproducción',
    'data-playing': playing ? 'true' : 'false',
  }) as const;

/**
 * Play/Pause, Reiniciar and a timeline scrubber with a t readout in the run's unit (s, min, h or d,
 * or the lab's timeUnit; the clock and the range stay in seconds); nothing when duration is 0.
 * With `markers`, a second row: «Evento anterior / siguiente», the event the time stands on and
 * the readout (TransportEvents.tsx).
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
}: TransportBarProps): JSX.Element | null {
  const { t, duration, playing } = clock.state;
  const events = useMemo(() => normalizeMarkers(markers, duration), [markers, duration]);
  if (duration === 0) return null;

  // The default unit and its decimals come from the run's duration; only the reading changes.
  const textOf = readingFormatter({ duration, timeUnit, timeOrigin, formatTime });
  const { timeText, event, valueText, next } = transportTexts({ events, t, duration, textOf });
  const rootProps = transportRoot(playing);

  if (events.length === 0) {
    return (
      <div {...rootProps} className="flex flex-wrap items-center gap-3">
        <TransportButtons clock={clock} />
        <Timeline clock={clock} valueText={valueText} className="h-6 min-w-32 flex-1" />
        <span className="font-mono text-sm tabular-nums">{timeText}</span>
      </div>
    );
  }
  return (
    <div {...rootProps} data-transport-events="" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <TransportButtons clock={clock} />
        <div className={TIMELINE_WITH_MARKS}>
          <TimelineMarks markers={events} duration={duration} />
          <Timeline clock={clock} valueText={valueText} className={RANGE_WITH_MARKS} />
        </div>
      </div>
      <EventRow
        clock={clock}
        markers={events}
        tolerance={markerTolerance(duration)}
        eventText={event}
        nextText={next}
        timeText={timeText}
        timeTextOf={textOf}
        widestTime={widestReading(textOf, duration)}
      />
    </div>
  );
}
