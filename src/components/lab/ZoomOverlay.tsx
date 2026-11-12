/**
 * The zoom's indicators and buttons as one strip along the bottom of the canvas, 8 px from its
 * edges: the scale bar at the start and ZoomControls at the end. When the canvas is too narrow for
 * both on one line (a row of buttons beside a 160 px bar on a phone), the strip wraps: the bar
 * stays above and the buttons go under it, at the end, so they never cover each other. The usual
 * way to declare a zoom on a canvas:
 *
 *   <div {...zoom.viewportProps} className="relative">
 *     <Scene … />
 *     <ZoomOverlay zoom={zoom} scaleBar={{ pxPerUnit: pxPerKm * zoom.view.scale, units: KM }} />
 *   </div>
 *
 * The strip lets the pointer through to the drawing; only the buttons take it. The top corners
 * stay free for TimeScaleBadge. ScaleBar and ZoomControls can still go in corners of their own.
 */
import type { JSX } from 'react';
import ScaleBar, { type ScaleBarProps } from './ScaleBar';
import ZoomControls, { type ZoomControlsOrientation } from './ZoomControls';
import type { ZoomPan } from './useZoomPan';

export interface ZoomOverlayProps {
  zoom: ZoomPan;
  /** The scale bar's scale and units; none for a drawing without a length. */
  scaleBar?: ScaleBarProps;
  orientation?: ZoomControlsOrientation;
}

const STRIP =
  'pointer-events-none absolute inset-x-2 bottom-2 flex flex-wrap items-end justify-between gap-2';

export default function ZoomOverlay({
  zoom,
  scaleBar,
  orientation,
}: ZoomOverlayProps): JSX.Element {
  return (
    <div data-zoom-overlay="" className={STRIP}>
      {scaleBar ? <ScaleBar {...scaleBar} corner="inline" /> : null}
      <div className="pointer-events-auto ml-auto">
        <ZoomControls zoom={zoom} corner="inline" orientation={orientation} />
      </div>
    </div>
  );
}
