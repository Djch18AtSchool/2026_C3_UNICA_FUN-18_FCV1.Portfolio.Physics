import { describe, expect, test } from 'vitest';
import {
  dampingRatio,
  fromPerceptual,
  naturalAngularFrequency,
  springState,
} from '../physics/dampedSpring';
import {
  APPLE_FORWARD_EXAMPLE,
  APPLE_INVERSE_EXAMPLE,
  MOTION_SPRING_TESTS,
  MOTION_VISUAL_DURATION,
  motionVisualSpring,
} from './springReferences';

/** Motion's harness: x = target + u, sampled every stepS and rounded (spring.test.ts). */
const sampled = ({ params, from, to, stepS, expected }: (typeof MOTION_SPRING_TESTS)[number]) =>
  expected.map((_, i) => Math.round(to + springState(params, from - to, 0, i * stepS).u));

describe("Motion's three spring tests (v14.14.0, spring.test.ts L41-L121)", () => {
  test('under, critically and overdamped, all from 100 to 1 000 every 0,2 s', () => {
    expect(MOTION_SPRING_TESTS.map(({ id, params }) => [id, params])).toEqual([
      ['subamortiguado', { k: 300, b: 10, m: 1 }],
      ['critico', { k: 100, b: 20, m: 1 }],
      ['sobreamortiguado', { k: 300, b: 100, m: 1 }],
    ]);
    MOTION_SPRING_TESTS.forEach(({ from, to, stepS, origin }) => {
      expect([from, to, stepS]).toEqual([100, 1000, 0.2]);
      expect(origin).toBe('producto');
    });
  });

  test('keep the expected arrays as the test file writes them', () => {
    expect(MOTION_SPRING_TESTS.map(({ expected }) => expected)).toEqual([
      [100, 1343, 873, 1046, 984, 1005, 998, 1001, 1000],
      [100, 635, 918, 984, 997, 1000],
      [100, 499, 731, 855, 922, 958, 977, 988, 993, 996, 998, 999, 999, 1000],
    ]);
  });

  test('cite their lines at the tag', () => {
    expect(MOTION_SPRING_TESTS.map(({ source }) => source.split(' ').at(-1))).toEqual([
      'L41-L53',
      'L72-L85',
      'L105-L121',
    ]);
    MOTION_SPRING_TESTS.forEach(({ source }) => {
      expect(source).toContain('v14.14.0');
      expect(source).toContain('__tests__/spring.test.ts');
    });
  });

  test('the book formulas (10.6) reproduce each of them, value by value', () => {
    MOTION_SPRING_TESTS.forEach((motionTest) =>
      expect(sampled(motionTest)).toEqual(motionTest.expected),
    );
  });
});

describe("Apple's documented conversions (SwiftUI Spring)", () => {
  test('Spring(duration: 0.5, bounce: 0.3) gives (1.0, 157.9, 17.6), and (10.10) agrees', () => {
    const { duration, bounce, published, origin, source } = APPLE_FORWARD_EXAMPLE;
    const { k, b, m } = fromPerceptual(duration, bounce);

    expect([duration, bounce]).toEqual([0.5, 0.3]);
    expect(published).toEqual({ m: 1, k: 157.9, b: 17.6 });
    expect(m).toBe(published.m);
    expect(k.toFixed(1)).toBe(published.k.toFixed(1));
    expect(b.toFixed(1)).toBe(published.b.toFixed(1));
    expect(origin).toBe('producto');
    expect(source).toContain('https://developer.apple.com/documentation/swiftui/spring');
  });

  test('Spring(mass: 1, stiffness: 100, damping: 10) gives (0.63, 0.5): d = 2π/ω₀ and β = 1 − ζ', () => {
    const { params, published, origin } = APPLE_INVERSE_EXAMPLE;
    const duration = (2 * Math.PI) / naturalAngularFrequency(params);

    expect(params).toEqual({ k: 100, b: 10, m: 1 });
    expect(published).toEqual({ duration: 0.63, bounce: 0.5 });
    expect(duration.toFixed(2)).toBe('0.63');
    expect(1 - dampingRatio(params)).toBe(published.bounce);
    expect(origin).toBe('producto');
  });
});

describe("Motion's visualDuration (spring.ts L28-L29, L40, L240-L248)", () => {
  test('defaults to 0,3 s and bounce 0,3; the period is 1,2 times the visual duration', () => {
    expect(MOTION_VISUAL_DURATION).toMatchObject({
      visualDuration: 0.3,
      bounce: 0.3,
      periodFactor: 1.2,
      minDampingRatio: 0.05,
      bounceZeroProgress: 0.9668,
      origin: 'producto',
    });
    expect(MOTION_VISUAL_DURATION.source).toContain('L240-L248');
  });

  test('is (10.10) with d = 1,2 T_v: the default spring() is k = 304,62 and b = 24,43', () => {
    const spring = motionVisualSpring(0.3, 0.3);

    expect(spring).toEqual(fromPerceptual(1.2 * 0.3, 0.3));
    expect(spring.k.toFixed(2)).toBe('304.62');
    expect(spring.b.toFixed(2)).toBe('24.43');
    expect(naturalAngularFrequency(spring)).toBeCloseTo((2 * Math.PI) / (1.2 * 0.3), 12);
  });

  test('ζ is never below 0,05: bounce 1 keeps a little damping, as Motion does', () => {
    expect(dampingRatio(motionVisualSpring(0.3, 1))).toBeCloseTo(0.05, 12);
    expect(dampingRatio(motionVisualSpring(0.3, 0.97))).toBeCloseTo(0.05, 12);
  });

  test("bounce 0 is 96,68 % of the way at the visual duration, as Motion's test says", () => {
    const spring = motionVisualSpring(0.5, 0);
    const progress = 1 + springState(spring, -1, 0, 0.5).u;

    expect(progress.toFixed(4)).toBe(MOTION_VISUAL_DURATION.bounceZeroProgress.toFixed(4));
  });

  test('rejects a negative bounce, whose overdamped branch the page does not use', () => {
    expect(() => motionVisualSpring(0.3, -0.2)).toThrow(RangeError);
  });
});
