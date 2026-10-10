/**
 * Locks page scrolling while a modal is open: `overflow: hidden` on <html>. A modal <dialog> does
 * not stop the page behind it from scrolling by itself. Where the page has a classic scrollbar
 * (desktop), hiding it would shift the layout sideways by its width, so the gutter is kept with
 * `scrollbar-gutter: stable`; overlay scrollbars (phones, macOS) take no width and get nothing.
 * Returns the release, which restores the previous inline values once; later calls do nothing.
 */
export function lockPageScroll(): () => void {
  const root = document.documentElement;
  const previous = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
  const scrollbarWidth = window.innerWidth - root.clientWidth;
  if (scrollbarWidth > 0) root.style.scrollbarGutter = 'stable';
  root.style.overflow = 'hidden';

  let isReleased = false;
  return () => {
    if (isReleased) return;
    isReleased = true;
    root.style.overflow = previous.overflow;
    root.style.scrollbarGutter = previous.gutter;
  };
}
