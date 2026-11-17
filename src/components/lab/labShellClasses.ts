/**
 * The classes of LabShell's card and of its parts, shared with what stands in for a lab while it
 * loads (Tema 1's DroneSkeleton): the same boxes, so nothing moves when the lab arrives. One
 * column at every width: the scene first, at the column's full width; the transport under it;
 * the control deck (parameters, then the scenario with «Restablecer»); the readouts; the support
 * plots; the canvas notes; the disclosures. The rhythm between them is scale.css's --lab-flow-*.
 */

/** Inside a figure the frame lends its border (content.css); alone the card draws its own. */
export const LAB_CARD =
  '@container/lab flex flex-col rounded-base border border-border bg-bg-elevated p-4 in-[.figure-frame]:border-0';
/** The title row, then the scene. */
export const LAB_STAGE = 'mt-(--lab-flow) flex flex-col gap-(--lab-flow)';
/**
 * The control deck and the readouts, a section's step under the transport (air, not a rule: a
 * rule's own margins put the first slider under the fold of a 1 280 × 800 window in Tema 3), one
 * block of controls the reader moves while the scene stays above it, no scroll of its own.
 */
export const LAB_PANEL = 'mt-(--lab-flow-section) flex flex-col';
/**
 * Level 1, the parameters: two to a row where the lab is wide enough for a label, its slider and
 * its number on one line each (36 rem); a paragraph among them (a note, a warning) takes the row.
 */
export const LAB_PARAMS =
  'grid grid-cols-1 gap-x-8 gap-y-(--lab-flow) @xl/lab:grid-cols-2 [&>p]:col-span-full';
/** Level 2, the scenario: its choices one under the other, under the parameters. */
export const LAB_SCENARIO = 'mt-(--lab-flow-section) flex flex-col gap-(--lab-flow)';
/** «Lecturas»: two to a row, four in a wide lab (42 rem). */
export const LAB_READOUTS =
  'mt-(--lab-flow-block) grid grid-cols-2 gap-x-6 gap-y-(--lab-flow) @2xl/lab:grid-cols-4';
/** The support plots, after the readouts («escena primero»). */
export const LAB_CHARTS = 'mt-(--lab-flow-block) flex flex-col gap-(--lab-flow)';
export const LAB_CANVAS_NOTES = 'mt-(--lab-flow-section) min-w-0';
export const LAB_DISCLOSURES = 'mt-(--lab-flow) empty:hidden';
