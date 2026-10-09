/**
 * Horizontally scrollable blocks (wide equations, figure frames on phones) must be reachable by
 * keyboard (axe `scrollable-region-focusable`). Making every block a tab stop would litter the
 * tab order, so an element opts in with `data-scroll-label` and only becomes a focusable,
 * labelled region while its content actually overflows. CSS cannot query overflow, hence JS.
 */

export const SCROLL_LABEL_SELECTOR = '[data-scroll-label]';
/** scrollWidth and clientWidth are rounded separately; one pixel apart is not real overflow. */
const OVERFLOW_TOLERANCE_PX = 1;

/** Add or remove the tab stop, the region role and its name, depending on overflow now. */
export function syncScrollRegion(element: HTMLElement): void {
  const isOverflowing = element.scrollWidth - element.clientWidth > OVERFLOW_TOLERANCE_PX;
  const label = element.dataset.scrollLabel;
  if (isOverflowing && label) {
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'region');
    element.setAttribute('aria-label', label);
    return;
  }
  element.removeAttribute('tabindex');
  element.removeAttribute('role');
  element.removeAttribute('aria-label');
}

/** Sync every opted-in element under `root`; returns them so callers can observe resizes. */
export function syncScrollRegions(root: ParentNode): HTMLElement[] {
  const elements = [...root.querySelectorAll<HTMLElement>(SCROLL_LABEL_SELECTOR)];
  elements.forEach(syncScrollRegion);
  return elements;
}
