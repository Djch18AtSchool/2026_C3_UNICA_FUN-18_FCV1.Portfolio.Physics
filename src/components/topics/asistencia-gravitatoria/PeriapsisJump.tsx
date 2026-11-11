/**
 * «Ir a la máxima aproximación», in the canvas under the planet frame's clock line: a button that
 * seeks to t = t_p (the clock stops there, as for any seek) and a status region that says what is
 * there. The region is a node renewed on every press, so a second press says the same text again,
 * and it empties once playback starts or the time leaves t_p (a stale line is not read later).
 */
import { useState, type JSX } from 'react';
import { CANVAS_INSET } from '../../lab/canvasInset';
import { markerTolerance } from '../../lab/transportMarkers';
import type { SimClock } from '../../lab/useSimClock';

export const GO_TO_PERIAPSIS = 'Ir a la máxima aproximación';

const BUTTON =
  'min-h-11 self-start rounded-sm border border-border bg-bg-elevated px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';

export interface PeriapsisJumpProps {
  clock: SimClock;
  /** Time of the closest approach on the clock (s). */
  periapsisT: number;
  /** What is there, said after the jump («Máxima aproximación: la sonda pasa a …»). */
  summary: string;
}

export default function PeriapsisJump({
  clock,
  periapsisT,
  summary,
}: PeriapsisJumpProps): JSX.Element {
  const [presses, setPresses] = useState(0);
  const { t, playing, duration } = clock.state;
  const isAtPeriapsis = !playing && Math.abs(t - periapsisT) <= markerTolerance(duration);
  const isSpoken = presses > 0 && isAtPeriapsis;
  const jump = () => {
    clock.seek(periapsisT);
    setPresses((count) => count + 1);
  };
  return (
    <div data-periapsis-jump="" className={`flex flex-col gap-1 ${CANVAS_INSET}`}>
      <button type="button" onClick={jump} className={BUTTON}>
        {GO_TO_PERIAPSIS}
      </button>
      <p role="status" className="sr-only">
        {isSpoken ? <span key={presses}>{summary}</span> : null}
      </p>
    </div>
  );
}
