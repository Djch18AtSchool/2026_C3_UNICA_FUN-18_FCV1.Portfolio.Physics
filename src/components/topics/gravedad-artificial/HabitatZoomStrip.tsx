import type { JSX } from 'react';
import ScaleBar, { inlineScaleBarMaxPx } from '../../lab/ScaleBar';
import type { ZoomPan } from '../../lab/useZoomPan';
import ZoomControls, { ZOOM_ROW_WIDTH_PX } from '../../lab/ZoomControls';
import { SCALE_UNITS } from './habitatRing';

/**
 * Below this width (px) the strip stacks its two rows. Side by side the bar is as long as the row
 * leaves it (inlineScaleBarMaxPx: 64 px at the least, in its 18 px box), the buttons 191 px, 8 px
 * of padding a side and 4 between: 64 + 18 + 191 + 16 + 4 = 293, so a phone's 294 px scene keeps
 * one row (the Phase D visual pass, I3). Tailwind reads the breakpoint as a literal class, so the
 * literal below must stay equal to this number.
 */
export const STRIP_STACK_BELOW = 293;

export interface HabitatZoomStripProps {
  zoom: ZoomPan;
  /** Screen px per metre of the ring's floor radius at the current zoom. */
  pxPerMetre: number;
  /** The strip's width (the scene's), px: how long the bar may be beside the buttons. */
  width: number;
}

/**
 * Under the radius bar: the scale bar at the start and the zoom buttons at the end, one row of
 * 48 px, or one row each (96 px) when the canvas is narrower than STRIP_STACK_BELOW. The
 * ring turns through the whole square and its labels sweep it, so nothing of the zoom sits over
 * it; the two states are known to CSS alone (a container query, the lab's own @container), so the
 * server reserves the height the browser will lay out.
 */
export default function HabitatZoomStrip({
  zoom,
  pxPerMetre,
  width,
}: HabitatZoomStripProps): JSX.Element {
  return (
    <div
      data-zoom-strip=""
      className="flex flex-col px-2 @min-[293px]:flex-row @min-[293px]:items-center @min-[293px]:justify-between"
    >
      <div className="flex h-12 items-center">
        <ScaleBar
          pxPerUnit={pxPerMetre}
          units={SCALE_UNITS}
          maxPx={inlineScaleBarMaxPx(width, ZOOM_ROW_WIDTH_PX)}
          corner="inline"
        />
      </div>
      <div className="flex h-12 items-center justify-end">
        <ZoomControls zoom={zoom} corner="inline" orientation="row" />
      </div>
    </div>
  );
}
