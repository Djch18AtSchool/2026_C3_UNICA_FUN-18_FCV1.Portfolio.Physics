export type Range = readonly [number, number];

export interface ClampedSettings<T> {
  values: T;
  clamped: (keyof T)[];
}

/** Clamp `value` into `range`; NaN and ±Infinity fall back to the lower bound. */
export function clamp(value: number, range: Range): number {
  const [low, high] = range;
  if (!Number.isFinite(value)) return low;
  return Math.min(Math.max(value, low), high);
}

/**
 * Clamp every setting into its own range. Returns a new object (the input is never
 * mutated) plus the keys whose value had to change, in the key order of `values`.
 */
export function clampSettings<T extends Record<string, number>>(
  values: T,
  limits: { [K in keyof T]: Range },
): ClampedSettings<T> {
  const keys: (keyof T)[] = Object.keys(values);
  const entries = keys.map((key) => [key, clamp(values[key], limits[key])] as const);
  return {
    values: Object.fromEntries(entries) as T,
    clamped: keys.filter((key, index) => values[key] !== entries[index][1]),
  };
}
