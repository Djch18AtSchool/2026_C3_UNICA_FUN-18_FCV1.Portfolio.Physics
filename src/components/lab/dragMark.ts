/**
 * The mark a handle wears while a pointer drags it (`data-dragging`): global.css grows its knob
 * and shows the grabbing cursor from it (auditoría §8, the handle's feedback). Set on the element
 * that took the press, as an attribute and not React state, so a drag renders nothing more.
 */
export const DRAGGING_ATTRIBUTE = 'data-dragging';

/** Marks or unmarks `element` as dragged; nothing without an element. */
export function markDragging(element: Element | null | undefined, isDragging: boolean): void {
  if (!element) return;
  if (isDragging) element.setAttribute(DRAGGING_ATTRIBUTE, '');
  else element.removeAttribute(DRAGGING_ATTRIBUTE);
}
