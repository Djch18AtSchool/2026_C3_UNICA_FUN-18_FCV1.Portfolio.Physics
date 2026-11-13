import type { JSX } from 'react';
import ScaleBar from '../../lab/ScaleBar';
import type { ZoomPan } from '../../lab/useZoomPan';
import ZoomControls from '../../lab/ZoomControls';
import { SCALE_UNITS } from './habitatRing';

/**
 * Below this width (px) the strip stacks its two rows. The scale bar is at most about 178 px
 * wide and the row of buttons 192 (the factor reads «Zoom ×5,7»), with 8 px on each side: 402 px
 * side by side. Tailwind reads the breakpoint as a literal class, so the literal below must stay
 * equal to this number.
 */
export const STRIP_STACK_BELOW = 408;

export interface HabitatZoomStripProps {
  zoom: ZoomPan;
  /** Screen px per metre of the ring's floor radius at the current zoom. */
  pxPerMetre: number;
}

/**
 * Under the radius bar: the scale bar at the start and the zoom buttons at the end, one row of
 * 48 px, or one row each (96 px) when the canvas is narrower than STRIP_STACK_BELOW. The
 * ring turns through the whole square and its labels sweep it, so nothing of the zoom sits over
 * it; the two states are known to CSS alone (a container query, the lab's own @container), so the
 * server reserves the height the browser will lay out.
 */
export default function HabitatZoomStrip({ zoom, pxPerMetre }: HabitatZoomStripProps): JSX.Element {
  return (
    <div
      data-zoom-strip=""
      className="flex flex-col @min-[408px]:flex-row @min-[408px]:items-center @min-[408px]:justify-between"
    >
      <div className="flex h-12 items-center px-2">
        <ScaleBar pxPerUnit={pxPerMetre} units={SCALE_UNITS} corner="inline" />
      </div>
      <div className="flex h-12 items-center justify-end px-2">
        <ZoomControls zoom={zoom} corner="inline" orientation="row" />
      </div>
    </div>
  );
}
