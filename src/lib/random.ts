/**
 * A seeded uniform generator in [0, 1) (mulberry32): the figures and the laboratory draw the same
 * «random» phases on the server and in the browser, and the tests can pin them.
 */
const UINT32 = 4294967296;

export function seededRandom(seed: number): () => number {
  if (!Number.isInteger(seed)) throw new RangeError(`seed must be an integer, got ${seed}`);
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  };
}
