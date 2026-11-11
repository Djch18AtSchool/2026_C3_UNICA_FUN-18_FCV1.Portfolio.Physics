/** How far down, in px, the page has to be scrolled before "Volver arriba" appears. */
export const BACK_TO_TOP_REVEAL_PX = 160;

/** The button is only worth showing once the reader has left the top of the page. */
export function isBackToTopShown(scrollY: number): boolean {
  return Number.isFinite(scrollY) && scrollY > BACK_TO_TOP_REVEAL_PX;
}

/**
 * "Volver arriba" without the side effects of a plain `#top` link: no `#top` in the address bar
 * and no history entry per press. The link keeps its `href`, so without JS it still scrolls.
 *
 * Scrolling is instant (the site has no smooth scrolling). Focus goes to the page start the way
 * following the anchor would: the body takes it for a moment, so the next Tab reaches the first
 * link ("Saltar al contenido"). The body needs a temporary `tabindex` to be focusable, and its
 * focus ring is hidden meanwhile, since the body is not a control.
 */
export function goToTop(event: Pick<Event, 'preventDefault'>, root: Document = document): void {
  event.preventDefault();
  const view = root.defaultView;
  if (!view) return;
  view.scrollTo(0, 0);

  const { body } = root;
  const previousOutline = body.style.outline;
  body.setAttribute('tabindex', '-1');
  body.style.outline = 'none';
  body.focus({ preventScroll: true });
  body.addEventListener(
    'blur',
    () => {
      body.removeAttribute('tabindex');
      body.style.outline = previousOutline;
    },
    { once: true },
  );
}

/** The edges of a box, as getBoundingClientRect gives them. */
export interface Edges {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Whether any of the boxes covers part of the button (touching is not covering). The button hides
 * while a laboratory lies under it, so it never sits over a lab's fields, «Restablecer» or the
 * focus ring of what has the keyboard (WCAG 2.4.11).
 */
export function overlapsAny(button: Edges, boxes: readonly Edges[]): boolean {
  return boxes.some(
    (box) =>
      box.left < button.right &&
      button.left < box.right &&
      box.top < button.bottom &&
      button.top < box.bottom,
  );
}
