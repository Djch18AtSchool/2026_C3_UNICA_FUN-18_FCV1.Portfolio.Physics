import { useEffect, useRef } from 'react';
import type { ZoomPan } from './useZoomPan';

/**
 * Each change of `refit` frames the drawing again, as «Ajustar» does: a lab bumps a counter when a
 * preset, a new encounter or «Restablecer» starts from its own framing. Not the first value: that
 * is the initial view (the server's).
 */
export function useRefit(zoom: Pick<ZoomPan, 'fit'>, refit: number): void {
  const last = useRef(refit);
  const { fit } = zoom;
  useEffect(() => {
    if (last.current === refit) return;
    last.current = refit;
    fit();
  }, [refit, fit]);
}
