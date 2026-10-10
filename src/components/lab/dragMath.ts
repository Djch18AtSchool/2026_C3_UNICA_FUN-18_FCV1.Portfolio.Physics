/** Pure math for pointer-drag handles: clamping, snapping and SVG coordinate mapping. No React. */

/** A 2x3 affine matrix shaped like `DOMMatrixReadOnly`, read-only for this module's purposes. */
export type AffineMatrix = Pick<DOMMatrixReadOnly, 'a' | 'b' | 'c' | 'd' | 'e' | 'f'>;

/** Clamps `v` to the closed range `[min, max]`. */
export function clampTo(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Snaps `v` to the nearest multiple of `step`. `step` must be greater than zero. */
export function snapTo(v: number, step: number): number {
  if (step <= 0) throw new RangeError(`step must be positive, got ${step}`);
  return Math.round(v / step) * step;
}

/**
 * Maps a client-space point through the inverse of an SVG screen CTM into the owner svg's
 * user units (its viewBox space): `x' = a·x + c·y + e`, `y' = b·x + d·y + f`.
 */
export function svgPointFromClient(
  ctmInverse: AffineMatrix,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const { a, b, c, d, e, f } = ctmInverse;
  return {
    x: a * clientX + c * clientY + e,
    y: b * clientX + d * clientY + f,
  };
}
