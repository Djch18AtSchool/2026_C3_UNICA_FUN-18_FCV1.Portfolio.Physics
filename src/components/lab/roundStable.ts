/**
 * Rounding for what the server and every render must write alike (an svg's viewBox height): to
 * `decimals`, ties upward, and a tie blurred by float noise (a few 1e-13 px from the zoom's
 * domains) rounds the same way on both sides. toFixed rounds the binary value, so 641.875 ± 1e-13
 * gave 641.87 and 641.88 by turns, and the plot's height moved by 1/64 px between zoom steps.
 */

/** How close to a tie (in units of the last decimal) still counts as the tie. */
const TIE_SLACK = 1e-6;

export function roundStable(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.floor(value * scale + 0.5 + TIE_SLACK) / scale;
}
