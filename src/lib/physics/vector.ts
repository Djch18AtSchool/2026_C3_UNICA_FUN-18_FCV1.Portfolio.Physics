/** Immutable 2D vector in SI units, r = (x, y). */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/** Builds a vector: r = (x, y). */
export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

/** Vector sum: a + b = (aₓ + bₓ, a_y + b_y). */
export function add(a: Vec2, b: Vec2): Vec2 {
  return vec(a.x + b.x, a.y + b.y);
}

/** Vector difference: a − b = (aₓ − bₓ, a_y − b_y). */
export function sub(a: Vec2, b: Vec2): Vec2 {
  return vec(a.x - b.x, a.y - b.y);
}

/** Scalar multiple: k·a = (k aₓ, k a_y). */
export function scale(a: Vec2, k: number): Vec2 {
  return vec(a.x * k, a.y * k);
}

/** Magnitude: |a| = √(aₓ² + a_y²). */
export function magnitude(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

/** Direction angle in radians: θ = atan2(a_y, aₓ). */
export function angle(a: Vec2): number {
  return Math.atan2(a.y, a.x);
}

/** Polar to Cartesian: (r cos θ, r sin θ). */
export function fromPolar(r: number, theta: number): Vec2 {
  return vec(r * Math.cos(theta), r * Math.sin(theta));
}
