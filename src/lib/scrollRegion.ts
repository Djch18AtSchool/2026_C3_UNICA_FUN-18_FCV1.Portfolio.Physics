/**
 * Horizontally scrollable blocks (wide equations, figure frames on phones) must be reachable by
 * keyboard (axe `scrollable-region-focusable`). Making every block a tab stop would litter the
 * tab order, so an element opts in with `data-scroll-label` and only becomes a focusable,
 * labelled region while its content actually overflows. CSS cannot query overflow, hence JS.
 */

export const SCROLL_LABEL_SELECTOR = '[data-scroll-label]';
/** Where a label template takes the element's "N.k" number. */
const NUMBER_PLACEHOLDER = '{n}';
/** The template's number with its brackets and leading space, dropped when there is no number. */
const NUMBER_SLOT = /\s*\(?\{n\}\)?/;
/** scrollWidth and clientWidth are rounded separately; one pixel apart is not real overflow. */
const OVERFLOW_TOLERANCE_PX = 1;

/**
 * The region's name. A template with "{n}" gets the number the CSS counters print beside the
 * element: the topic number (`data-topic-number` on the topic body) and the 1-based position of
 * the element matching `data-scroll-number` among those in the body, so names stay unique
 * ("Ecuación (1.3) desplazable"). Without a topic body the number is dropped.
 */
export function scrollLabel(element: HTMLElement): string | undefined {
  const template = element.dataset.scrollLabel;
  if (!template?.includes(NUMBER_PLACEHOLDER)) return template;
  const body = element.closest<HTMLElement>('[data-topic-number]');
  const selector = element.dataset.scrollNumber;
  const numbered = selector ? element.closest(selector) : null;
  if (!body || !selector || !numbered) return template.replace(NUMBER_SLOT, '');
  const position = [...body.querySelectorAll(selector)].indexOf(numbered) + 1;
  return template.replace(NUMBER_PLACEHOLDER, `${body.dataset.topicNumber}.${position}`);
}

/** Add or remove the tab stop, the region role and its name, depending on overflow now. */
export function syncScrollRegion(element: HTMLElement): void {
  const isOverflowing = element.scrollWidth - element.clientWidth > OVERFLOW_TOLERANCE_PX;
  // Only an overflowing element needs a name (numbering one walks the topic body).
  const label = isOverflowing ? scrollLabel(element) : undefined;
  if (label) {
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
