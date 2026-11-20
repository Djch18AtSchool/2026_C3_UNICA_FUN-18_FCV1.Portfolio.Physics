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

/**
 * Where numbering restarts: a topic body (`data-topic-number`, numbers "N.k") or a scope that
 * numbers on its own (`data-number-scope`, numbers "k": the cover's closing, whose CSS counters
 * print "(1)", "Figura 1").
 */
const NUMBERING_SCOPE = '[data-topic-number], [data-number-scope]';

/**
 * The region's name. A template with "{n}" gets the number the CSS counters print beside the
 * element: the topic number (`data-topic-number` on the topic body, absent in a
 * `data-number-scope`) and the 1-based position of the element matching `data-scroll-number`
 * among those in the scope, so names stay unique ("Ecuación (1.3) desplazable",
 * "Ecuación (3) desplazable"). Outside any numbering scope the number is dropped.
 */
export function scrollLabel(element: HTMLElement): string | undefined {
  const template = element.dataset.scrollLabel;
  if (!template?.includes(NUMBER_PLACEHOLDER)) return template;
  const scope = element.closest<HTMLElement>(NUMBERING_SCOPE);
  const selector = element.dataset.scrollNumber;
  const numbered = selector ? element.closest(selector) : null;
  if (!scope || !selector || !numbered) return template.replace(NUMBER_SLOT, '');
  const position = [...scope.querySelectorAll(selector)].indexOf(numbered) + 1;
  const topic = scope.dataset.topicNumber;
  return template.replace(NUMBER_PLACEHOLDER, topic ? `${topic}.${position}` : `${position}`);
}

/** Add or remove the tab stop, the region role and its name, depending on overflow now. */
export function syncScrollRegion(element: HTMLElement): void {
  // Any overflow, one pixel too: the browser scrolls it and axe asks for the tab stop.
  const isOverflowing = element.scrollWidth > element.clientWidth;
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
