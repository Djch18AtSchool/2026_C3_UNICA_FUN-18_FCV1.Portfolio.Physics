/**
 * Free fall from rest (Módulo 1, Tema 1.2), for the own application of «Qué aprendí»: how long
 * a falling wrist reads about 0 g and how fast it reaches the floor, and how long a jump does.
 */
import { airTime } from './projectile';
import { requireNonNegative, requirePositive } from './validate';

/** Time to fall a height h from rest: t = √(2h/g). */
export function freeFallTime(height: number, g: number): number {
  requireNonNegative('height', height);
  requirePositive('g', g);
  return Math.sqrt((2 * height) / g);
}

/** Speed after falling a height h from rest: v = √(2gh). */
export function freeFallSpeed(height: number, g: number): number {
  requireNonNegative('height', height);
  requirePositive('g', g);
  return Math.sqrt(2 * g * height);
}

/**
 * Time in the air of a jump whose apex is `height` above the take-off: the whole flight is free
 * fall, so a worn accelerometer reads about 0 g for t = 2√(2h/g).
 */
export function jumpWeightlessTime(height: number, g: number): number {
  requirePositive('height', height);
  return airTime(freeFallSpeed(height, g), g);
}
