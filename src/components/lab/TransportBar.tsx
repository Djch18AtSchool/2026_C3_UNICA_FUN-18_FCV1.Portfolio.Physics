import type { JSX } from 'react';
import { formatNumber } from '../../lib/format';
import type { SimClock } from './useSimClock';

export interface TransportBarProps {
  clock: SimClock;
  /** Step (s) for frame-by-frame stepping; the timeline keeps the native range keyboard. */
  stepSize?: number;
}

/** The timeline maps t ∈ [0, duration] onto 0..RANGE_MAX integer positions. */
const RANGE_MAX = 1000;
const TIME_PRECISION = 3;

const ICON_BUTTON =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-base border border-border bg-bg-elevated text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';

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

function formatTime(t: number): string {
  return `t = ${formatNumber(t, { precision: TIME_PRECISION, unit: 's' })}`;
}

/** Play/Pause, Reiniciar and a timeline scrubber with a t readout; nothing when duration is 0. */
export default function TransportBar({ clock }: TransportBarProps): JSX.Element | null {
  const { t, duration, playing } = clock.state;
  if (duration === 0) return null;

  const position = Math.round((t / duration) * RANGE_MAX);
  const timeText = formatTime(t);

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
        type="range"
        min={0}
        max={RANGE_MAX}
        step={1}
        value={position}
        aria-label="Línea de tiempo"
        aria-valuetext={timeText}
        // seek pauses, so scrubbing never fights a running clock.
        onChange={(event) => clock.seek((Number(event.target.value) / RANGE_MAX) * duration)}
        className="h-6 min-w-40 flex-1 cursor-pointer accent-accent"
      />
      <span className="font-mono text-sm tabular-nums">{timeText}</span>
    </div>
  );
}
