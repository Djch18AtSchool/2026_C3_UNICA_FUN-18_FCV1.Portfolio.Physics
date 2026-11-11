import { useEffect, useRef, useState } from 'react';
import type { CycleId } from '../../../lib/data/driveCycles';
import { useSimClock } from '../../lab/useSimClock';
import { STRETCHES } from './regenViews';
import { viewSwitchTime, viewTiming, type RegenView } from './regenStretch';

/**
 * The view on show and its clock: «Tramo» plays the cycle's stretch at real time on a clock of
 * its own (t = 0 at the stretch's start; the transport reads it in the cycle's time through
 * `timing.offset` as its timeOrigin), «Ciclo» the whole cycle CYCLE_TIME_LAPSE times faster and
 * «Conducir» the stretch again, driven by the reader on the clock of «Tramo».
 * Switching keeps the instant of the cycle when the new view holds it (else the stretch's start)
 * and pauses. The seek waits for the clock's new duration, which useSimClock sets in an effect
 * declared before this hook's own.
 */
export function useRegenView(cycle: CycleId, cycleDuration: number) {
  const [view, setView] = useState<RegenView>('tramo');
  const stretch = STRETCHES[cycle];
  const timing = viewTiming(view, stretch, cycleDuration);
  const clock = useSimClock(timing.duration, { timeScale: timing.timeScale });
  const pendingSeek = useRef<number | undefined>(undefined);
  const { seek } = clock;
  useEffect(() => {
    if (pendingSeek.current === undefined) return;
    seek(pendingSeek.current);
    pendingSeek.current = undefined;
  }, [view, seek]);

  /**
   * To `next`, keeping the instant of the cycle on show now when `next` holds it; «Conducir» opens
   * at its start, where its run begins (nothing is driven past it yet).
   */
  const changeView = (next: RegenView) => {
    if (next === view) return;
    const cycleT = timing.offset + clock.frame.get();
    const nextTiming = viewTiming(next, stretch, cycleDuration);
    pendingSeek.current = next === 'conducir' ? 0 : viewSwitchTime(nextTiming, cycleT);
    clock.pause();
    setView(next);
  };
  /** Restablecer: back to «Tramo», at its start. */
  const resetView = () => {
    clock.reset();
    setView('tramo');
  };
  return { view, stretch, timing, clock, changeView, resetView };
}
