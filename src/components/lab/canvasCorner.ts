/**
 * A corner of the canvas' positioned box, 8 px from its edges: where the overlays declared on the
 * canvas sit (TimeScaleBadge, ZoomControls, ScaleBar). Each lab picks corners that do not cover
 * what matters in its drawing.
 */
export type CanvasCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const CANVAS_CORNER: Readonly<Record<CanvasCorner, string>> = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-2 right-2',
};

/** Whether the corner is on the right, so an overlay there aligns its content to the end. */
export const isRightCorner = (corner: CanvasCorner): boolean => corner.endsWith('right');
