export interface ReadingProgressInput {
  /** Document Y of the top of the topic header: progress is 0 until it reaches the viewport top. */
  start: number;
  /** Document Y of the bottom of the topic body: progress is 1 once it reaches the viewport bottom. */
  end: number;
  scrollY: number;
  viewportHeight: number;
}

/**
 * How much of the topic has been read, in [0, 1]. It is linear in the scroll between the moment
 * the header's top leaves the viewport top (`scrollY = start`) and the moment the body's bottom
 * reaches the viewport bottom (`scrollY = end - viewportHeight`). Invalid measures give 0.
 */
export function readingProgress({
  start,
  end,
  scrollY,
  viewportHeight,
}: ReadingProgressInput): number {
  const isValid =
    [start, end, scrollY, viewportHeight].every(Number.isFinite) && viewportHeight > 0;
  if (!isValid) return 0;
  const span = end - viewportHeight - start;
  // Content that fits in one screen has no range to interpolate: it is read once scrolled past.
  if (span <= 0) return scrollY > start ? 1 : 0;
  return Math.min(1, Math.max(0, (scrollY - start) / span));
}
