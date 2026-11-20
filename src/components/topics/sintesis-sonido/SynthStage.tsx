/**
 * The synthesiser's canvas: «Reproducir»/«Detener» with its status line, and the waveform that
 * sounds, with a cursor that marks y(t) and −y(t + T/2) at the same instant (11.6). K, with the
 * focus in the lab, stops it too (useStopKey).
 */
import { useRef, type JSX } from 'react';
import { CANVAS_INSET } from '../../lab/canvasInset';
import InlineMath from '../../lab/InlineMath';
import { PlotPoints, type PlotPoint } from '../../lab/PlotPoints';
import { STAGE_PLOT_ASPECT } from '../../lab/SvgPlot';
import { formatNumber } from '../../../lib/format';
import { SHIFTED_COLOR, SIGNAL_COLOR, type WaveformData } from './soundPlots';
import { useStopKey } from './useStopKey';
import WaveformPlot from './WaveformPlot';

/** A text button of the lab (40 px), wide enough for «Reproducir» so the line beside it stays. */
const PLAY_BUTTON =
  'inline-flex min-h-10 min-w-32 items-center justify-center gap-2 rounded-base border bg-bg px-3 text-sm font-medium text-fg transition-colors hover:border-accent';

function PlayIcon({ isPlaying }: { isPlaying: boolean }): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0" fill="currentColor">
      {isPlaying ? <rect x={5} y={5} width={10} height={10} /> : <path d="M6 4 16 10 6 16Z" />}
    </svg>
  );
}

export interface SynthStageProps {
  isPlaying: boolean;
  /** The status line's text (statusText), with KaTeX between `$…$`. */
  status: string;
  onToggle(): void;
  /** The one stop, also bound to K inside the lab. */
  onStop(): void;
  waveform: WaveformData;
  waveformLabel: string;
  showShifted: boolean;
  cursorMs: number;
  /** y(t) and −y(t + T/2) at the cursor, on the drawn scale. */
  at: { y: number; shifted: number };
  onCursor(tMs: number): void;
}

export default function SynthStage({
  isPlaying,
  status,
  onToggle,
  onStop,
  waveform,
  waveformLabel,
  showShifted,
  cursorMs,
  at,
  onCursor,
}: SynthStageProps): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null);
  useStopKey(stageRef, isPlaying, onStop);
  const points: PlotPoint[] = [
    { id: 'senal', x: cursorMs, y: at.y, color: SIGNAL_COLOR },
    ...(showShifted
      ? [{ id: 'media-onda', x: cursorMs, y: at.shifted, color: SHIFTED_COLOR }]
      : []),
  ];
  return (
    <div ref={stageRef} className="flex flex-col gap-4">
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${CANVAS_INSET}`}>
        <button
          type="button"
          data-testid="synth-play"
          onClick={onToggle}
          className={`${PLAY_BUTTON} ${isPlaying ? 'border-accent' : 'border-border'}`}
        >
          <PlayIcon isPlaying={isPlaying} />
          {isPlaying ? 'Detener' : 'Reproducir'}
        </button>
        <p
          role="status"
          data-testid="synth-status"
          className="m-0 min-w-0 flex-1 text-sm text-fg-muted"
        >
          <InlineMath text={status} />
        </p>
      </div>
      <WaveformPlot
        data={waveform}
        title="Forma de onda que suena"
        ariaLabel={waveformLabel}
        showShifted={showShifted}
        aspectRatio={STAGE_PLOT_ASPECT}
        cursor={{
          x: cursorMs,
          onChange: onCursor,
          label: (t) => `$t$ = ${formatNumber(t, { precision: 2, unit: 'ms' })}`,
        }}
        marks={(scales) => <PlotPoints scales={scales} points={points} />}
        testId="synth-waveform"
      />
    </div>
  );
}
