/**
 * The text styles of the prescribed diagram's equations and labels that carry symbols, for
 * MathText (the notation of src/lib/mathNotation.ts): sizes and inks as WheelDiagram.astro's
 * `.wd-eq`, `.wd-label` and `.wd-note` classes set them for the plain texts, each on the surface
 * halo that keeps it readable over lines. Every text is at least 16 viewBox units, so on a 360 px
 * phone (panel ≈ 294 px wide for 420 units) nothing renders below 11 px, and a subscript (75 %)
 * of an equation stays above 16 units.
 */
const SURFACE = 'var(--bg-elevated)';
const HALO = { color: SURFACE, width: 4 } as const;

/** Equations (.wd-eq): 23 units. */
export const EQ_TEXT = {
  fontSize: 23,
  family: 'sans',
  fill: 'var(--fg)',
  halo: HALO,
} as const;

/** Labels (.wd-label): 17 units. */
export const LABEL_TEXT = {
  fontSize: 17,
  family: 'sans',
  fill: 'var(--fg)',
  halo: HALO,
} as const;

/** Notes (.wd-note): 16 units, in the muted ink. */
export const NOTE_TEXT = {
  fontSize: 16,
  family: 'sans',
  fill: 'var(--fg-muted)',
  halo: HALO,
} as const;
