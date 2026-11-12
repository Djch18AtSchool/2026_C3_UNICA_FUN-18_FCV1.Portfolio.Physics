/**
 * The zoom buttons of the jump plot, in a strip of fixed height under it (ZOOM_STRIP_PX), at the
 * end of the line. The height is fixed, so the server and the client draw the same stage: nothing
 * moves when React takes over. The viewport is the plot area (JumpZoomLayer); these buttons are
 * the next stop after the handles in the keyboard order.
 */
import type { JSX } from 'react';
import type { ZoomPan } from '../../lab/useZoomPan';
import ZoomControls from '../../lab/ZoomControls';
import { ZOOM_STRIP_PX } from './jumpZoom';

export default function JumpZoomStrip({ zoom }: { zoom: ZoomPan }): JSX.Element {
  return (
    <div
      data-zoom-strip=""
      className="flex items-center justify-end px-2"
      style={{ height: ZOOM_STRIP_PX }}
    >
      <ZoomControls zoom={zoom} corner="inline" orientation="row" />
    </div>
  );
}
