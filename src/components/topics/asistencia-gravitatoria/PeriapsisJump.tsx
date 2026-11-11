/**
 * «Ir a la máxima aproximación», in the canvas under the planet frame's clock line: a button that
 * seeks to t = t_p (the clock stops there, as for any seek) and a status region that says what is
 * there. The region is a node renewed on every press, so a second press says the same text again.
 * It empties once playback starts, the time leaves t_p or an edit changes what it said (a new r_p
 * or encounter): a line with old figures is never read, nor is a new one announced unasked.
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
  /** The press count and what was said then: an edit that changes `summary` leaves it stale. */
  const [pressed, setPressed] = useState<{ count: number; said: string }>({ count: 0, said: '' });
  const { t, playing, duration } = clock.state;
  const isAtPeriapsis = !playing && Math.abs(t - periapsisT) <= markerTolerance(duration);
  const isSpoken = pressed.count > 0 && pressed.said === summary && isAtPeriapsis;
  const jump = () => {
    clock.seek(periapsisT);
    setPressed(({ count }) => ({ count: count + 1, said: summary }));
  };
  return (
    <div data-periapsis-jump="" className={`flex flex-col gap-1 ${CANVAS_INSET}`}>
      <button type="button" onClick={jump} className={BUTTON}>
        {GO_TO_PERIAPSIS}
      </button>
      <p role="status" className="sr-only">
        {isSpoken ? <span key={pressed.count}>{summary}</span> : null}
      </p>
    </div>
  );
}
