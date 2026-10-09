/** Throws a RangeError unless `value` is strictly positive (also rejects NaN). */
export function requirePositive(name: string, value: number): void {
  if (!(value > 0)) {
    throw new RangeError(`${name} must be greater than 0, got ${value}`);
  }
}

/** Throws a RangeError unless `value` is zero or positive (also rejects NaN). */
export function requireNonNegative(name: string, value: number): void {
  if (!(value >= 0)) {
    throw new RangeError(`${name} must be 0 or greater, got ${value}`);
  }
}

/** Throws a RangeError unless `value` is a finite number (rejects NaN and ±Infinity). */
export function requireFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number, got ${value}`);
  }
}
