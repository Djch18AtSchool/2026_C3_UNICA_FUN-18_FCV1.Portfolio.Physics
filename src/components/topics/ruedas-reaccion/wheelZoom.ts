/**
 * What the zoom adds to the reaction-wheel scene (wheelScene.ts is the drawing at ×1): the scene's
 * geometry through the zoom's view, the scale bar's length for the body (the one part drawn to
 * scale: 366,0 × 226,3 mm; the dial is an angle gauge and the wheel is not to scale) and the box a
 * revealed target knob keeps clear. Pure, in the canvas' px.
 */
import { scaleBarLength, type ScaleBarLength, type ScaleUnit } from '../../lab/scaleBarMath';
import { toScreen, type ZoomBox, type ZoomPoint, type ZoomView } from '../../lab/zoomMath';
import type { SceneGeometry } from './wheelScene';

const CM_PER_M = 100;
/** The bar's only unit: the body is 36,6 cm long, so lengths run from 1 cm up to a few tens. */
export const BODY_SCALE_UNITS: readonly ScaleUnit[] = [{ label: 'cm', size: 1 }];
/** Each of the two rows under the drawing's square (the scale bar, then the buttons), px. */
export const ZOOM_ROW_PX = 48;

/**
 * The knob's focus ring (11) plus the band of the corner texts (34, the dial's own margin): a
 * revealed knob is never under the note, the time-scale badge or the target's text.
 */
export const KNOB_REVEAL_RADIUS = 11 + 34;

/** The scene through the zoom's view: the dial, the body's scale and the wheel grow; the canvas does not. */
export function zoomGeometry(base: SceneGeometry, view: ZoomView): SceneGeometry {
  return {
    c: toScreen(view, base.c),
    dial: base.dial * view.scale,
    scale: base.scale * view.scale,
    wheel: base.wheel * view.scale,
    zoom: base.zoom * view.scale,
    extent: base.extent,
  };
}

/** CSS px per centimetre of the body, drawn at `pxPerMetre` at ×1 and seen at `zoomScale`. */
export const pxPerCm = (pxPerMetre: number, zoomScale: number): number =>
  (pxPerMetre / CM_PER_M) * zoomScale;

/** The bar for a body drawn at `pxPerMetre` at ×1, seen at `zoomScale`: round centimetres of the body. */
export function bodyScaleBar(pxPerMetre: number, zoomScale: number): ScaleBarLength | undefined {
  return scaleBarLength(pxPerCm(pxPerMetre, zoomScale), BODY_SCALE_UNITS);
}

/** The box (drawing units) a reveal brings into view for a knob at `knobAt`, at this zoom. */
export function knobRevealBox(knobAt: ZoomPoint, zoomScale: number): ZoomBox {
  const radius = KNOB_REVEAL_RADIUS / zoomScale;
  return { x: knobAt.x - radius, y: knobAt.y - radius, width: 2 * radius, height: 2 * radius };
}
