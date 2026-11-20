/**
 * The normal modes of an ideal air column (Tema 11, Paso 2): which harmonics a pipe open at both
 * ends (11.2) or closed at one end (11.3) admits, the effective length for a fundamental, and the
 * displacement amplitude of each mode along the pipe. OpenStax University Physics 1, §17.4; Wolfe
 * (UNSW), «Open vs Closed pipes».
 */
import { requirePositive, requirePositiveInteger } from './validate';

/** An ideal pipe open at both ends (a flute) or closed at one and open at the other (a clarinet). */
export type PipeKind = 'abierto' | 'cerrado';

/** The first `count` mode numbers n: every n open at both ends (11.2), only odd n closed (11.3). */
export function pipeModeNumbers(kind: PipeKind, count: number): number[] {
  requirePositiveInteger('count', count);
  return Array.from({ length: count }, (_, i) => (kind === 'abierto' ? i + 1 : 2 * i + 1));
}

/**
 * The (effective) length whose fundamental is f₁ (Hz) with sound speed v (m/s): L = v/(2 f₁) open
 * at both ends, from (11.2) with n = 1, and L = v/(4 f₁) closed at one end, from (11.3).
 */
export function pipeLength(kind: PipeKind, f1: number, v: number): number {
  requirePositive('f1', f1);
  requirePositive('v', v);
  return v / ((kind === 'abierto' ? 2 : 4) * f1);
}

/**
 * The displacement amplitude of mode n along the pipe, at x/L in [0, 1], peak 1: cos(nπx/L) open at
 * both ends (antinodes at both), sin(nπx/2L) closed at x = 0 (a node there, an antinode at the
 * open end; n odd only). OpenStax University Physics 1, §17.4.
 */
export function standingWaveProfile(kind: PipeKind, n: number, xOverL: number): number {
  requirePositiveInteger('n', n);
  if (kind === 'cerrado' && n % 2 === 0) {
    throw new RangeError(`a closed pipe has only odd modes, got n = ${n}`);
  }
  if (!(xOverL >= 0 && xOverL <= 1)) {
    throw new RangeError(`x/L must lie in [0, 1], got ${xOverL}`);
  }
  return kind === 'abierto' ? Math.cos(n * Math.PI * xOverL) : Math.sin((n * Math.PI * xOverL) / 2);
}
