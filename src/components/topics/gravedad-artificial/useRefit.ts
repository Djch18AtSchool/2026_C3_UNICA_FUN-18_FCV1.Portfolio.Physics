import { useEffect, useRef } from 'react';
import type { ZoomPan } from '../../lab/useZoomPan';

/**
 * Each change of `refit` frames the drawing again, as «Ajustar» does (a preset or a reset starts
 * from the lab's own framing). Not the first value: that is the initial view.
 */
export function useRefit(zoom: ZoomPan, refit: number): void {
  const last = useRef(refit);
  const { fit } = zoom;
  useEffect(() => {
    if (last.current === refit) return;
    last.current = refit;
    fit();
  }, [refit, fit]);
}
