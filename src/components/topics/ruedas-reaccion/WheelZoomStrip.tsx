import type { JSX } from 'react';
import ScaleBar from '../../lab/ScaleBar';
import type { ZoomPan } from '../../lab/useZoomPan';
import ZoomControls from '../../lab/ZoomControls';
import { BODY_SCALE_UNITS, ZOOM_ROW_PX } from './wheelZoom';

export interface WheelZoomStripProps {
  zoom: ZoomPan;
  /** CSS px per centimetre of the body at the current view. */
  pxPerCm: number;
}

/**
 * The scale bar and the zoom buttons, in two rows of fixed height under the square: the server
 * and the client lay them out alike (the bar's length changes with the zoom, never the rows), and
 * a 160 px bar never meets a 192 px row of buttons («Zoom ×…» and three buttons) on a phone. The
 * buttons are on the right, like the other canvases' (ZoomControls, in a row), and the bar on the
 * left, where it is read first, with whose length it is: the drawing's one part to scale is the
 * body, and zoomed in it may be out of the view, so the bar says it itself.
 */
export default function WheelZoomStrip({ zoom, pxPerCm }: WheelZoomStripProps): JSX.Element {
  return (
    <div data-wheel-zoom-strip="">
      <div className="flex items-center px-2" style={{ height: ZOOM_ROW_PX }}>
        <ScaleBar pxPerUnit={pxPerCm} units={BODY_SCALE_UNITS} corner="inline" />
        <span className="ml-2 text-xs text-fg-muted">de la nave</span>
      </div>
      <div className="flex items-center justify-end px-2" style={{ height: ZOOM_ROW_PX }}>
        <ZoomControls zoom={zoom} corner="inline" orientation="row" />
      </div>
    </div>
  );
}
