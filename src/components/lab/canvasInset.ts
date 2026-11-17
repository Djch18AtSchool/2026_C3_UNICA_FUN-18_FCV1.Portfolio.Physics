/**
 * In a narrow lab (a phone's card, under 36 rem) the canvas bleeds into the card's padding, so a
 * drawing keeps its width (CANVAS_BLEED, LabShell); from 36 rem it is the card's content width,
 * the article column's (no cap: the scene is never smaller than the column gives it, Dylan
 * 2026-11-16). The support plots under the readouts bleed the same way. What in the canvas must
 * line up with the card's text instead (a gauge, a status line, a scene with labels at its edges)
 * takes the inset back under the same condition (CANVAS_INSET). All by the lab's own width (its
 * container), not the window's.
 */
export const CANVAS_BLEED = '-mx-3 @xl/lab:mx-0';
export const CANVAS_INSET = 'px-3 @xl/lab:px-0';
