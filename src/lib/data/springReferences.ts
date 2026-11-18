/**
 * Tema 10's reference values: Motion's own spring tests, which the book formulas reproduce, and
 * the perceptual parameters that Apple and Motion document (research
 * docs/superpowers/research/2026-11-17-animaciones-resorte.md §3.1, §3.3 and §4). Every value is
 * the product's, copied from its source; what the site computes from them is cálculo propio.
 */
import { fromPerceptual, type SpringParams } from '../physics/dampedSpring';

const MOTION = 'Motion v14.14.0 (commit f95ab94), packages/motion-dom/src/animation/generators';
const MOTION_TESTS = `${MOTION}/__tests__/spring.test.ts`;

export interface MotionSpringTest {
  id: 'subamortiguado' | 'critico' | 'sobreamortiguado';
  /** Stiffness and damping of the test; the mass is Motion's default, 1 (spring.ts L24). */
  params: SpringParams;
  /** The keyframes of the test, [100, 1000]. */
  from: number;
  to: number;
  /** The test samples the spring every 200 ms. */
  stepS: number;
  /** The rounded values the test expects at 0, stepS, 2·stepS… */
  expected: readonly number[];
  origin: 'producto';
  source: string;
}

/**
 * The three tests of Motion's spring generator. The underdamped one sets only `stiffness: 300`,
 * so b = 10 is Motion's default damping (spring.ts L23).
 */
export const MOTION_SPRING_TESTS: readonly MotionSpringTest[] = [
  {
    id: 'subamortiguado',
    params: { k: 300, b: 10, m: 1 },
    from: 100,
    to: 1000,
    stepS: 0.2,
    expected: [100, 1343, 873, 1046, 984, 1005, 998, 1001, 1000],
    origin: 'producto',
    source: `${MOTION_TESTS} L41-L53`,
  },
  {
    id: 'critico',
    params: { k: 100, b: 20, m: 1 },
    from: 100,
    to: 1000,
    stepS: 0.2,
    expected: [100, 635, 918, 984, 997, 1000],
    origin: 'producto',
    source: `${MOTION_TESTS} L72-L85`,
  },
  {
    id: 'sobreamortiguado',
    params: { k: 300, b: 100, m: 1 },
    from: 100,
    to: 1000,
    stepS: 0.2,
    expected: [100, 499, 731, 855, 922, 958, 977, 988, 993, 996, 998, 999, 999, 1000],
    origin: 'producto',
    source: `${MOTION_TESTS} L105-L121`,
  },
];

const APPLE_SPRING =
  'Apple Developer Documentation, SwiftUI, Spring (https://developer.apple.com/documentation/swiftui/spring)';

/** `Spring(duration: 0.5, bounce: 0.3)` → `// (1.0, 157.9, 17.6)`: (mass, stiffness, damping). */
export const APPLE_FORWARD_EXAMPLE = {
  duration: 0.5,
  bounce: 0.3,
  published: { m: 1, k: 157.9, b: 17.6 },
  origin: 'producto',
  source: APPLE_SPRING,
} as const;

/** `Spring(mass: 1, stiffness: 100, damping: 10)` → `// (0.63, 0.5)`: (duration, bounce). */
export const APPLE_INVERSE_EXAMPLE = {
  params: { k: 100, b: 10, m: 1 },
  published: { duration: 0.63, bounce: 0.5 },
  origin: 'producto',
  source: APPLE_SPRING,
} as const;

/**
 * Motion's perceptual spring: `defaultVisualDuration = 0.3` and `defaultBounce = 0.3` (spring.ts
 * L28-L29); ζ = max(1 − bounce, minDamping) with `minDamping = 0.05` (L40, L42-L50); and
 * `(2 * Math.PI) / (options.visualDuration * 1.2)` for ω₀ (L240-L248). Its test «bounce 0 is
 * 96.68% of the way at visualDuration» (spring.test.ts L473-L475).
 */
export const MOTION_VISUAL_DURATION = {
  visualDuration: 0.3,
  bounce: 0.3,
  periodFactor: 1.2,
  minDampingRatio: 0.05,
  bounceZeroProgress: 0.9668,
  origin: 'producto',
  source: `${MOTION}/spring.ts L28-L29, L40, L42-L50 y L240-L248, y su prueba spring.test.ts L473-L475`,
} as const;

/**
 * k and b of Motion's `spring({ visualDuration, bounce })` with m = 1: (10.10) with the period
 * d = 1,2·T_v and ζ = max(1 − β, 0,05), so a bounce above 0,95 keeps ζ = 0,05. Negative bounces
 * (overdamped) are rejected: the page does not use them.
 */
export function motionVisualSpring(visualDuration: number, bounce: number): SpringParams {
  const { periodFactor, minDampingRatio } = MOTION_VISUAL_DURATION;
  return fromPerceptual(periodFactor * visualDuration, Math.min(bounce, 1 - minDampingRatio));
}
