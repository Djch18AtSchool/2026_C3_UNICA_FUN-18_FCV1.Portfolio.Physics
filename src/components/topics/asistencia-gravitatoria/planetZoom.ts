/**
 * What the planet frame's zoom adds to its geometry (flybyScene.ts is the drawing at ×1): the
 * scale bar's units and length from the drawing's px per km times the zoom, the planet's radius on
 * screen (and whether it is still enlarged), whether a point is on the panel, and the boxes the
 * SVG scale bar takes up, which the labels keep off. Pure, in the frame's pixels.
 */
import { mathTextWidth } from '../../../lib/mathNotation';
import { textBox, type Box, type Point } from '../../lab/labelClearance';
import { SCALE_BAR_LABEL_GAP, SCALE_BAR_LABEL_SIZE, SCALE_BAR_TICK } from '../../lab/ScaleBar';
import {
  SCALE_BAR_MAX_PX,
  SCALE_BAR_MIN_PX,
  scaleBarLength,
  type ScaleBarLength,
  type ScaleUnit,
} from '../../lab/scaleBarMath';
import { inlineMathToNotation } from '../../lab/timeScaleFormat';
import { MIN_PLANET_PX } from './flybyScene';

/** Room under the drawing's square, in the zoomed canvas, for the zoom buttons: 40 px + margins. */
export const ZOOM_STRIP_PX = 48;

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
  maxPx?: number,
): ScaleBarLength | undefined {
  return scaleBarLength(pxPerKm, planetScaleUnits(unit, radiusKm), maxPx);
}

/** Air between the scale bar's end and «planeta agrandado» on its backdrop (px). */
const BAR_NOTE_GAP = 8;

/**
 * The longest scale bar that, from `barLeft`, stops BAR_NOTE_GAP before the note's backdrop at
 * `noteLeft` (both on the bottom line of the frame); none to keep clear of without the note. At
 * least the shared 64 px.
 */
export function barMaxBesideNote(
  barLeft: number,
  noteLeft: number | undefined,
): number | undefined {
  if (noteLeft === undefined) return undefined;
  return Math.min(SCALE_BAR_MAX_PX, Math.max(SCALE_BAR_MIN_PX, noteLeft - BAR_NOTE_GAP - barLeft));
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
  const top = at.y - SCALE_BAR_TICK;
  const label = textBox(
    { x: at.x, y: top - SCALE_BAR_LABEL_GAP },
    text,
    SCALE_BAR_LABEL_SIZE,
    'start',
  );
  const width = mathTextWidth(text, SCALE_BAR_LABEL_SIZE, 'sans');
  return [
    { left: at.x, right: at.x + bar.px, top, bottom: at.y },
    { ...label, right: label.left + width },
  ];
}
