/**
 * The classes of LabShell's card and grid, shared with what stands in for a lab while it loads
 * (Tema 1's DroneSkeleton): the same boxes, so nothing moves when the lab arrives.
 */

/** Inside a figure the frame lends its border (content.css); alone the card draws its own. */
export const LAB_CARD =
  '@container/lab flex flex-col gap-4 rounded-base border border-border bg-bg-elevated p-4 in-[.figure-frame]:border-0';
/**
 * Row 1: stage and panel cells; the canvas notes, when there are any, open an implicit row 2 across
 * both (an explicit empty row would still add its gap). In one column they follow the DOM: stage,
 * panel, canvas notes.
 */
export const LAB_COLUMNS =
  'flex flex-col gap-6 lab-split:grid lab-split:grid-cols-[minmax(0,1fr)_20rem]';
/** The CSS variable the stage sticks at (under the topic bar): global.css owns its value. */
export const LAB_STAGE_TOP = '--topic-bar-clearance';
/** Each cell spans row 1 only, so what sticks inside it never slides over the canvas notes. */
export const LAB_STAGE_CELL = 'min-w-0 lab-split:col-start-1 lab-split:row-start-1';
/** The panel's cell is its container: the panel sets its levels by its own width. */
export const LAB_PANEL_CELL =
  '@container/panel min-w-0 lab-split:col-start-2 lab-split:row-start-1';
export const LAB_CANVAS_NOTES = 'min-w-0 lab-split:col-span-2 lab-split:row-start-2';
/**
 * The panel flows with the page: nothing it holds hides behind a scroll of its own. A wide one (a
 * lab in one column at ~900 px) flows its levels into two balanced columns, in reading order (CSS
 * columns: down the left, then down the right), so no label sits half a screen from its value and
 * no column ends half a screen before the other.
 */
export const LAB_PANEL =
  'flex flex-col gap-6 @2xl/panel:block @2xl/panel:columns-2 @2xl/panel:gap-x-8';
/**
 * Each level of a wide panel: the gap the flex column gave, now a margin in the columns. A level
 * moves whole, its title with everything it holds: cut between columns, a piece read as part of
 * the level beside it (Tema 9's «Llegada» under «Lecturas», Tema 7's presets beside «Parámetros»).
 */
export const LAB_LEVEL_IN_COLUMNS = '@2xl/panel:mb-6 @2xl/panel:last:mb-0 break-inside-avoid';
