/** Inline values of <html> before the first active lock; restored when the last one releases. */
let saved: { overflow: string; gutter: string } | undefined;
let activeLocks = 0;

/**
 * Locks page scrolling while a modal is open: `overflow: hidden` on <html>. A modal <dialog> does
 * not stop the page behind it from scrolling by itself. Where the page has a classic scrollbar
 * (desktop), hiding it would shift the layout sideways by its width, so the gutter is kept with
 * `scrollbar-gutter: stable`; overlay scrollbars (phones, macOS) take no width and get nothing.
 *
 * Locks nest (two labs' drawers, say): the page stays locked until every lock is released, in any
 * order. Returns the release, which counts once; later calls do nothing.
 */
export function lockPageScroll(): () => void {
  const root = document.documentElement;
  if (activeLocks === 0) {
    saved = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    if (scrollbarWidth > 0) root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
  }
  activeLocks += 1;

  let isReleased = false;
  return () => {
    if (isReleased) return;
    isReleased = true;
    activeLocks -= 1;
    if (activeLocks > 0 || !saved) return;
    root.style.overflow = saved.overflow;
    root.style.scrollbarGutter = saved.gutter;
    saved = undefined;
  };
}
