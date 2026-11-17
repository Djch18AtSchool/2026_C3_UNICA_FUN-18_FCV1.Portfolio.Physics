/** The playback speeds of the transport's speed select («1×▾») and how each one reads. */

/** Playback speeds offered by default (spec §8.2: 0,25× to 2×). */
export const DEFAULT_SPEEDS: readonly number[] = [0.25, 0.5, 1, 1.5, 2];

/** "0,25×": the speed with the Spanish decimal comma. */
export function speedLabel(speed: number): string {
  return `${String(speed).replace('.', ',')}×`;
}
