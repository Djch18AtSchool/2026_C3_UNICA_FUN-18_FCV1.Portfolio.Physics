/**
 * The zoom buttons of the jump plot, in a strip of fixed height under it (ZOOM_STRIP_PX): at the
 * bottom of the strip and flush with the plot card's right edge, so they stand 6 px apart from the
 * card instead of hanging from its border like a loose tab (Phase D visual pass, M5). The height
 * is fixed, so the server and the client draw the same stage: nothing moves when React takes over.
 * The viewport is the plot area (JumpZoomLayer); these buttons are the next stop after the handles
 * in the keyboard order.
 */
import type { JSX } from 'react';
import type { ZoomPan } from '../../lab/useZoomPan';
import ZoomControls, { ZOOM_STRIP_PX } from '../../lab/ZoomControls';

export default function JumpZoomStrip({ zoom }: { zoom: ZoomPan }): JSX.Element {
  return (
    <div
      data-zoom-strip=""
      className="flex items-end justify-end"
      style={{ height: ZOOM_STRIP_PX }}
    >
      <ZoomControls zoom={zoom} corner="inline" orientation="row" />
    </div>
  );
}
