/**
 * In a narrow lab (a phone's card, under 36 rem) the canvas bleeds into the card's padding, so a
 * drawing keeps its width (CANVAS_BLEED, LabShell). From 36 rem it grows no further than that,
 * centred: one rule for every drawing in one column, where the stage is as wide as the card (a
 * map or a ring no longer fills 813 px at 900 px while a 400 px scene floats). Beside the panel the
 * stage is narrower than 36 rem, so the cap never bites there. What in the canvas must line up with
 * the card's text instead (a gauge, a status line, a scene with labels at its edges) takes the
 * inset back under the same condition (CANVAS_INSET). All by the lab's own width (its container),
 * not the window's.
 */
export const CANVAS_BLEED = '-mx-3 @xl/lab:mx-auto @xl/lab:w-full @xl/lab:max-w-[36rem]';
export const CANVAS_INSET = 'px-3 @xl/lab:px-0';
