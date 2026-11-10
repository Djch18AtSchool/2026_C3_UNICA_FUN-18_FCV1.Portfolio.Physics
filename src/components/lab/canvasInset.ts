/**
 * In a narrow lab (a phone's card, under 36 rem) the canvas bleeds into the card's padding, so a
 * drawing keeps its width (CANVAS_BLEED, LabShell). What in the canvas must line up with the
 * card's text instead (a gauge, a status line, a scene with labels at its edges) takes the inset
 * back under the same condition (CANVAS_INSET). Both by the lab's own width (its container), not
 * the window's: the stage is narrower than the window beside the panel.
 */
export const CANVAS_BLEED = '-mx-3 @xl/lab:mx-0';
export const CANVAS_INSET = 'px-3 @xl/lab:px-0';
