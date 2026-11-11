import type { Locator } from '@playwright/test';

/** Room kept around the badge, in px: nothing may be drawn within it. */
const CLEARANCE_PX = 2;
/** Spacing of the points sampled along a drawn outline, in the svg's user units. */
const SAMPLE_STEP = 2;

/**
 * What a canvas's time-scale badge (`g[data-time-scale-badge]` inside the svg) touches: every other
 * text whose box meets its box, and every drawn outline (path, line, circle, polygon) with a point
 * inside it, as sentences. Empty when the badge stands clear. Measured in the page, in client px,
 * so it holds at whatever width the svg is drawn.
 */
export async function badgeTouches(svg: Locator): Promise<string[]> {
  return svg.evaluate(
    (root, { clearance, step }) => {
      const badge = root.querySelector('g[data-time-scale-badge]');
      if (!badge) return ['no badge in the svg'];
      const frame = badge.getBoundingClientRect();
      const zone = {
        left: frame.left - clearance,
        right: frame.right + clearance,
        top: frame.top - clearance,
        bottom: frame.bottom + clearance,
      };
      const isInside = (x: number, y: number) =>
        x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom;
      const touches: string[] = [];
      for (const text of root.querySelectorAll('text')) {
        if (badge.contains(text)) continue;
        const box = text.getBoundingClientRect();
        const isSeparate =
          box.right < zone.left ||
          box.left > zone.right ||
          box.bottom < zone.top ||
          box.top > zone.bottom;
        if (!isSeparate) touches.push(`text «${(text.textContent ?? '').trim()}»`);
      }
      const outlines = root.querySelectorAll<SVGGeometryElement>(
        'path, line, circle, polygon, polyline, rect',
      );
      for (const shape of outlines) {
        if (badge.contains(shape) || !shape.getScreenCTM()) continue;
        const matrix = shape.getScreenCTM() as DOMMatrix;
        const length = shape.getTotalLength();
        for (let at = 0; at <= length; at += step) {
          const point = shape.getPointAtLength(at).matrixTransform(matrix);
          if (isInside(point.x, point.y)) {
            touches.push(`${shape.tagName} at ${Math.round(point.x)}, ${Math.round(point.y)}`);
            break;
          }
        }
      }
      return touches;
    },
    { clearance: CLEARANCE_PX, step: SAMPLE_STEP },
  );
}
