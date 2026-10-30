/**
 * Comfort limits SpinCalc collects from its five authors (Theodore W. Hall, "SpinCalc: an
 * artificial-gravity calculator in JavaScript", artificial-gravity.com, © 2000, revised
 * 2018-09-09; docs/superpowers/research/2026-10-08-sources.md, section 8): the maximum spin goes
 * from 3 to 6 rpm, the minimum radius, when given, from 4 to 12 m, and the minimum tangential
 * speed from 6 to 10 m/s.
 */

/** A [lowest, highest] spread of one comfort limit across the authors. */
export type ComfortSpread = readonly [low: number, high: number];

/** The spreads of the three comfort limits: maximum spin (rpm), minimum radius (m), minimum v (m/s). */
export interface ComfortBands {
  rpmMax: ComfortSpread;
  rMin: ComfortSpread;
  vMin: ComfortSpread;
}

export const COMFORT = {
  rpmMax: [3, 6],
  rMin: [4, 12],
  vMin: [6, 10],
} as const satisfies ComfortBands;
