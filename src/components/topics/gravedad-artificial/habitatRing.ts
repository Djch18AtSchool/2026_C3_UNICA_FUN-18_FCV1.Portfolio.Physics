/**
 * The habitat scene's drawing seen through the canvas zoom (useZoomPan). The scene is drawn at its
 * own framing (a ring in a square, `RingBase`) and the zoom's view maps it to screen px: the ring,
 * the person, the band, the hub and the vectors grow with the zoom; text, strokes and arrowheads
 * keep their pixel size. Pure: no React, no DOM.
 */
import type { Point } from '../../lab/OverlayMarks';
import type { ScaleUnit } from '../../lab/scaleBarMath';
import { toScreen, type ZoomView } from '../../lab/zoomMath';
import { vectorLength } from './habitatScene';

/** The ring as the scene frames it at ×1: centre, radius of the floor and px per g, in px. */
export interface RingBase {
  c: Point;
  ring: number;
  unit: number;
}

export const RING_BAND = 9;
export const HUB_RADIUS = 9;
export const SPOKE_WIDTH = 3;
/** The person stands this tall at ×1, or less on a small ring (PERSON_RING_SHARE of its radius). */
const PERSON_HEIGHT = 34;
const PERSON_RING_SHARE = 0.35;
/** Each vector sits this far to one side of the person, so the two never overlap. */
const VECTOR_OFFSET = 9;
/** Label offsets are text distances: they keep their pixel size at any zoom. */
const VECTOR_LABEL_GAP = 13;
const R_LABEL_SIDE = 10;
const R_LABEL_AT = 0.5;
const AC_LABEL_SIDE = 16;
/** The scale bar's ladder: metres, then kilometres (the radius runs from 5 m to 4 000 m). */
export const SCALE_UNITS: readonly ScaleUnit[] = [
  { label: 'm', size: 1 },
  { label: 'km', size: 1000 },
];

/** The ring at a zoom: everything in screen px, `scale` being the view's. */
export interface ScreenRing extends RingBase {
  band: number;
  hub: number;
  scale: number;
}

/** The ring through the view: its centre mapped, its lengths times the zoom. */
export function screenRing(base: RingBase, view: ZoomView): ScreenRing {
  const { scale } = view;
  return {
    c: toScreen(view, base.c),
    ring: base.ring * scale,
    unit: base.unit * scale,
    band: RING_BAND * scale,
    hub: HUB_RADIUS * scale,
    scale,
  };
}

/**
 * Screen px per metre of the ring's floor radius: the radius r (m) is drawn `ringPx` long at ×1,
 * and the zoom multiplies it. The scale bar is read against this, not typed in.
 */
export function pxPerMetre(ringPx: number, radiusM: number, zoomScale: number): number {
  return (ringPx / radiusM) * zoomScale;
}

/** Where the spinning parts sit, in screen px with the person at the bottom (angle 0). */
export interface SpinLayout {
  floorY: number;
  person: number;
  ac: { from: Point; toY: number };
  gap: { from: Point; toY: number };
  isClipped: boolean;
  /** Length of a vector drawn to scale (clipped at MAX_DRAWN_G). */
  length: number;
  labels: { r: Point; ac: Point; gap: Point };
}

/** The person, the two vectors and their labels around the floor point under the hub. */
export function spinLayout(ring: ScreenRing, gRatio: number): SpinLayout {
  const { c, scale } = ring;
  const floorY = c.y + ring.ring;
  const { length, isClipped } = vectorLength(gRatio, ring.unit);
  const offset = VECTOR_OFFSET * scale;
  const person = Math.min(PERSON_HEIGHT * scale, ring.ring * PERSON_RING_SHARE);
  const gapStart = floorY - person / 2;
  const acFrom = { x: c.x + offset, y: floorY - 2 };
  const acToY = acFrom.y - length;
  const gapFrom = { x: c.x - offset, y: gapStart };
  const gapToY = gapStart + length;
  // Short vectors keep their labels clear of the person: above the head and below the floor.
  const acLabelY = Math.min(acToY, floorY - person);
  const gapLabelY = Math.max(gapToY, floorY + ring.band) + VECTOR_LABEL_GAP;
  return {
    floorY,
    person,
    ac: { from: acFrom, toY: acToY },
    gap: { from: gapFrom, toY: gapToY },
    isClipped,
    length,
    labels: {
      // a_c's label sits beside its tip, on the side away from the r line.
      ac: { x: acFrom.x + AC_LABEL_SIDE, y: acLabelY },
      gap: { x: gapFrom.x, y: gapLabelY },
      // The r label sits near the hub, clear of the vector labels by the floor.
      r: { x: c.x - R_LABEL_SIDE, y: c.y + ring.ring * R_LABEL_AT },
    },
  };
}
