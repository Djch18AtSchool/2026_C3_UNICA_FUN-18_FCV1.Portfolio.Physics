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
