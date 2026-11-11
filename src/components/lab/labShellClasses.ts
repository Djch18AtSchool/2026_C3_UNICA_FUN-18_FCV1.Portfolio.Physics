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
/** Each cell spans row 1 only, so what sticks inside it never slides over the canvas notes. */
export const LAB_STAGE_CELL = 'min-w-0 lab-split:col-start-1 lab-split:row-start-1';
/** The panel's cell is its container: the panel sets its levels by its own width. */
export const LAB_PANEL_CELL =
  '@container/panel min-w-0 lab-split:col-start-2 lab-split:row-start-1';
export const LAB_CANVAS_NOTES = 'min-w-0 lab-split:col-span-2 lab-split:row-start-2';
/**
 * The panel flows with the page: nothing it holds hides behind a scroll of its own. A wide one (a
 * lab in one column at ~900 px) sets its levels in two columns, parameters beside the scenario
 * and the readouts, so no label sits half a screen away from its value.
 */
export const LAB_PANEL =
  'flex flex-col gap-6 @2xl/panel:grid @2xl/panel:grid-cols-2 @2xl/panel:items-start @2xl/panel:gap-x-8';
/** In a two-column panel, the parameters take the left column down both rows. */
export const LAB_PARAMS_LEVEL = '@2xl/panel:row-span-2';
