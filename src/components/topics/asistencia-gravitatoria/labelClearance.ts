/**
 * Finds a spot for a small label where its box crosses none of the drawn lines (a path, arrows,
 * asymptotes) and stays inside the plot: the first clear candidate wins. Pixels throughout. Pure.
 */
export interface Point {
  x: number;
  y: number;
}

export type Segment = readonly [Point, Point];

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The box of size `width` × `height` centred on `centre`. */
export function boxAround(centre: Point, width: number, height: number): Box {
  return {
    left: centre.x - width / 2,
    right: centre.x + width / 2,
    top: centre.y - height / 2,
    bottom: centre.y + height / 2,
  };
}

/** Whether the segment touches the box (Liang–Barsky clipping of the segment to the box). */
export function segmentHitsBox([a, b]: Segment, box: Box): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const edges: [number, number][] = [
    [-dx, a.x - box.left],
    [dx, box.right - a.x],
    [-dy, a.y - box.top],
    [dy, box.bottom - a.y],
  ];
  let enter = 0;
  let leave = 1;
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) enter = Math.max(enter, t);
    else leave = Math.min(leave, t);
    if (enter > leave) return false;
  }
  return true;
}

/** Consecutive points of a polyline as segments, skipping any non-finite point (a break). */
export function segmentsOf(points: readonly Point[]): Segment[] {
  const isFinite = (p: Point) => Number.isFinite(p.x) && Number.isFinite(p.y);
  return points.slice(1).flatMap((p, i): Segment[] => {
    const q = points[i];
    return isFinite(p) && isFinite(q) ? [[q, p]] : [];
  });
}

const isInside = (box: Box, area: Box) =>
  box.left >= area.left &&
  box.right <= area.right &&
  box.top >= area.top &&
  box.bottom <= area.bottom;

/**
 * The first candidate centre whose box is inside `area` and clear of every segment, or undefined
 * when none is.
 */
export function clearSpot(
  candidates: readonly Point[],
  size: { width: number; height: number },
  obstacles: readonly Segment[],
  area: Box,
): Point | undefined {
  return candidates.find((centre) => {
    const box = boxAround(centre, size.width, size.height);
    return isInside(box, area) && !obstacles.some((segment) => segmentHitsBox(segment, box));
  });
}
