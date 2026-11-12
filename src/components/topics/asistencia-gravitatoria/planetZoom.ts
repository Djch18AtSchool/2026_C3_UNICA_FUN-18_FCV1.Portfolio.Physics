/**
 * What the planet frame's zoom adds to its geometry (flybyScene.ts is the drawing at ×1): the
 * scale bar's units and length from the drawing's px per km times the zoom, the planet's radius on
 * screen (and whether it is still enlarged), whether a point is on the panel, and the boxes the
 * SVG scale bar takes up, which the labels keep off. Pure, in the frame's pixels.
 */
import { mathTextWidth } from '../../../lib/mathNotation';
import { textBox, type Box, type Point } from '../../lab/labelClearance';
import { scaleBarLength, type ScaleBarLength, type ScaleUnit } from '../../lab/scaleBarMath';
import { inlineMathToNotation } from '../../lab/timeScaleFormat';
import { MIN_PLANET_PX } from './flybyScene';

/** Room under the drawing's square, in the zoomed canvas, for the zoom buttons: 40 px + margins. */
export const ZOOM_STRIP_PX = 48;

/**
 * ScaleBarSvg's own sizes, copied until the shared piece exports them: ticks 8 up from the
 * baseline, the text 4 above the ticks in 12 px of the sans family. A test renders the shared bar
 * and compares.
 */
const TICK = 8;
const LABEL_GAP = 4;
const LABEL_SIZE = 12;

/** The bar's ladder: kilometres, then the planet's radius («$R_J$»), which is `radiusKm` of them. */
export function planetScaleUnits(unit: string, radiusKm: number): readonly ScaleUnit[] {
  return [
    { label: 'km', size: 1 },
    { label: `$${unit}$`, size: radiusKm },
  ];
}

/** The bar for `pxPerKm` px per km on screen (the drawing's scale times the zoom). */
export function frameScaleBar(
  pxPerKm: number,
  unit: string,
  radiusKm: number,
): ScaleBarLength | undefined {
  return scaleBarLength(pxPerKm, planetScaleUnits(unit, radiusKm));
}

export interface PlanetOnScreen {
  radiusPx: number;
  /** Drawn larger than true scale: the true radius would be under MIN_PLANET_PX. */
  isEnlarged: boolean;
}

/**
 * The planet's radius on screen: its true radius (px at ×1) times the zoom, but never under
 * MIN_PLANET_PX. Zooming in can make the planet true to scale, and then it is not «agrandado».
 */
export function planetOnScreen(truePx: number, zoomScale: number): PlanetOnScreen {
  const trueOnScreen = truePx * zoomScale;
  const isEnlarged = trueOnScreen < MIN_PLANET_PX;
  return { radiusPx: isEnlarged ? MIN_PLANET_PX : trueOnScreen, isEnlarged };
}

/** Whether `point` is on the panel, `margin` px or more from every edge. */
export function isOnPanel(
  point: Point,
  panel: { width: number; height: number },
  margin = 0,
): boolean {
  return (
    point.x >= margin &&
    point.x <= panel.width - margin &&
    point.y >= margin &&
    point.y <= panel.height - margin
  );
}

/**
 * The boxes of the SVG scale bar drawn with its baseline starting at `at`: the bar with its ticks,
 * and its text above them. Labels and the drawing's texts keep clear of both.
 */
export function scaleBarObstacles(bar: ScaleBarLength, at: Point): readonly [Box, Box] {
  const text = inlineMathToNotation(bar.text);
  // textBox measures in the mono family and ScaleBarSvg writes in sans: keep its box, not its width.
  const label = textBox({ x: at.x, y: at.y - TICK - LABEL_GAP }, text, LABEL_SIZE, 'start');
  const width = mathTextWidth(text, LABEL_SIZE, 'sans');
  return [
    { left: at.x, right: at.x + bar.px, top: at.y - TICK, bottom: at.y },
    { ...label, right: label.left + width },
  ];
}
