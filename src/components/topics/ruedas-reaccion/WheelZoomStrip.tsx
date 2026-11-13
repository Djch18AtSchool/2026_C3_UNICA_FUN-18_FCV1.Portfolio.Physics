import type { JSX } from 'react';
import ScaleBar, { inlineScaleBarMaxPx } from '../../lab/ScaleBar';
import type { ZoomPan } from '../../lab/useZoomPan';
import ZoomControls, { ZOOM_ROW_WIDTH_PX } from '../../lab/ZoomControls';
import { BODY_SCALE_UNITS } from './wheelZoom';

/**
 * From this width (px) the bar and the buttons share one row of 48 px; narrower, they stack (two
 * rows, 96 px). The bar's box says «20 cm de la nave» (90 px of text, measured, wider than a short
 * bar), so the row needs 90 + 18 + 191 + 16 + 4 = 319 px at the least: one row from a 390 px
 * phone up, two on a 360 px one (a 318 px strip). Tailwind reads the breakpoint as a literal
 * class, so the literal below must stay equal to this number.
 */
export const WHEEL_STRIP_ONE_ROW_FROM = 320;

export interface WheelZoomStripProps {
  zoom: ZoomPan;
  /** CSS px per centimetre of the body at the current view. */
  pxPerCm: number;
  /** The strip's width (the square's), px: how long the bar may be beside the buttons. */
  width: number;
}

/**
 * The scale bar and the zoom buttons under the square, in one row where the width allows (the
 * Phase D visual pass, I3: two rows added 96 px to the stage at 1 280 px) and stacked below
 * WHEEL_STRIP_ONE_ROW_FROM; the rows have a fixed height and the switch is a container query, so
 * the server and the client lay them out alike. The bar is on the left, where it is read first,
 * and says in its box whose length it is: the drawing's one part to scale is the body, and zoomed
 * in it may be out of the view. The buttons are on the right, like the other canvases'.
 */
export default function WheelZoomStrip({ zoom, pxPerCm, width }: WheelZoomStripProps): JSX.Element {
  return (
    <div data-wheel-zoom-strip="" className="@container">
      <div className="flex flex-col px-2 @min-[320px]:flex-row @min-[320px]:items-center @min-[320px]:justify-between">
        <div className="flex h-12 items-center">
          <ScaleBar
            pxPerUnit={pxPerCm}
            units={BODY_SCALE_UNITS}
            maxPx={inlineScaleBarMaxPx(width, ZOOM_ROW_WIDTH_PX)}
            note="de la nave"
            corner="inline"
          />
        </div>
        <div className="flex h-12 items-center justify-end">
          <ZoomControls zoom={zoom} corner="inline" orientation="row" />
        </div>
      </div>
    </div>
  );
}
