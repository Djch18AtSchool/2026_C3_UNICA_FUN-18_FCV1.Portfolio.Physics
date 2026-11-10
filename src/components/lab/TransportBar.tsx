import { useRef, type JSX } from 'react';
import { ICON_BUTTON } from './iconButton';
import { TIMELINE_STEPS, transportTimeText, type TransportTimeUnitChoice } from './transportTime';
import { useFrameEffect } from './useFrameTime';
import type { SimClock } from './useSimClock';

export interface TransportBarProps {
  clock: SimClock;
  /** Step (s) for frame-by-frame stepping; the timeline keeps the native range keyboard. */
  stepSize?: number;
  /** Display unit of the t readout; 'auto' (default) picks it from the run's duration. */
  timeUnit?: TransportTimeUnitChoice;
}

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

/**
 * Play/Pause, Reiniciar and a timeline scrubber with a t readout in the run's unit (s, min, h or d,
 * or the lab's timeUnit; the clock and the range stay in seconds); nothing when duration is 0.
 *
 * The thumb follows the live time: the range is uncontrolled and its value is written every frame
 * (a property write, no DOM mutation and no render), while the text and aria-valuetext read the
 * settled time the clock syncs CLOCK_SYNC_HZ times a second.
 */
export default function TransportBar({
  clock,
  timeUnit = 'auto',
}: TransportBarProps): JSX.Element | null {
  const { t, duration, playing } = clock.state;
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
  if (duration === 0) return null;

  const timeText = transportTimeText(t, duration, timeUnit);

  return (
    <div
      role="group"
      aria-label="Reproducción"
      data-playing={playing ? 'true' : 'false'}
      className="flex flex-wrap items-center gap-3"
    >
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
      <input
        ref={rangeRef}
        type="range"
        min={0}
        max={RANGE_MAX}
        step={1}
        defaultValue={toPosition(t, duration)}
        aria-label="Línea de tiempo"
        aria-valuetext={timeText}
        // seek pauses, so scrubbing never fights a running clock.
        onChange={(event) => clock.seek((Number(event.target.value) / RANGE_MAX) * duration)}
        className="h-6 min-w-32 flex-1 cursor-pointer accent-accent"
      />
      <span className="font-mono text-sm tabular-nums">{timeText}</span>
    </div>
  );
}
