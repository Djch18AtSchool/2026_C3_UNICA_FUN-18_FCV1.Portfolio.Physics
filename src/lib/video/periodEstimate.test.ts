import { describe, expect, test } from 'vitest';
import { seededRandom } from '../random';
import { estimatePeriod } from './periodEstimate';

/** The Commons file's frame rate, 30000/1001 (NTSC). */
const FPS = 30000 / 1001;
const TWO_PI = 2 * Math.PI;

/** Standard normal samples (Box–Muller) from a seeded generator. */
function gaussian(random: () => number): () => number {
  return () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(TWO_PI * random());
}

/** `seconds` of a signal sampled at FPS, with seeded white noise of standard deviation `noise`. */
function sampled(
  seconds: number,
  shape: (t: number) => number,
  noise: number,
  seed: number,
): number[] {
  const normal = gaussian(seededRandom(seed));
  return Array.from(
    { length: Math.round(seconds * FPS) },
    (_, i) => shape(i / FPS) + noise * normal(),
  );
}

const relativeError = (estimate: number, truth: number) => Math.abs(estimate / truth - 1);

describe('estimatePeriod', () => {
  // Noise of 5 % of the amplitude per frame, about what whole-pixel edge rows give on the film.
  test('recovers a 3,44 s sine sampled at 29,97 fps with noise within 0,5 %', () => {
    const samples = sampled(15, (t) => Math.sin((TWO_PI * t) / 3.44 + 0.7), 0.05, 3);

    expect(relativeError(estimatePeriod(samples, FPS, 2.5, 4.5), 3.44)).toBeLessThan(0.005);
  });

  test('a two-cycle record (7,3 s, like one shot) with drift and noise stays within 1 %', () => {
    const samples = sampled(7.3, (t) => 30 * Math.sin((TWO_PI * t) / 3.42 + 2) + 4 * t, 1.5, 5);

    expect(relativeError(estimatePeriod(samples, FPS, 2.5, 4.5), 3.42)).toBeLessThan(0.01);
  });

  test('a flat-topped (clipped) wave keeps its period', () => {
    const samples = sampled(
      10,
      (t) => Math.max(-1, Math.min(1, 1.6 * Math.sin((TWO_PI * t) / 3.49))),
      0.05,
      8,
    );

    expect(relativeError(estimatePeriod(samples, FPS, 2.5, 4.5), 3.49)).toBeLessThan(0.01);
  });

  test('refines between frames: the result is not a whole number of frames', () => {
    const samples = sampled(12, (t) => Math.cos((TWO_PI * t) / 3.4567), 0, 1);
    const period = estimatePeriod(samples, FPS, 2.5, 4.5);

    expect(Number.isInteger(period * FPS)).toBe(false);
    expect(relativeError(period, 3.4567)).toBeLessThan(0.002);
  });

  test('throws when the correlation has no peak inside the lag range', () => {
    const slow = sampled(20, (t) => Math.sin((TWO_PI * t) / 9), 0, 1);

    expect(() => estimatePeriod(slow, FPS, 2.5, 4.5)).toThrow(RangeError);
  });

  test('throws on a record with nothing that oscillates', () => {
    const ramp = Array.from({ length: 300 }, (_, i) => 2 + 0.1 * i);

    expect(() => estimatePeriod(ramp, FPS, 2.5, 4.5)).toThrow(RangeError);
  });

  test('rejects a bad frame rate, lag range, record length or sample', () => {
    const ok = sampled(10, (t) => Math.sin((TWO_PI * t) / 3.44), 0, 1);

    expect(() => estimatePeriod(ok, 0, 2.5, 4.5)).toThrow(RangeError);
    expect(() => estimatePeriod(ok, FPS, 4.5, 2.5)).toThrow(RangeError);
    expect(() => estimatePeriod(ok, FPS, 0, 4.5)).toThrow(RangeError);
    expect(() => estimatePeriod(ok.slice(0, 150), FPS, 2.5, 4.5)).toThrow(RangeError);
    expect(() => estimatePeriod(ok, 1, 2.2, 2.8)).toThrow(RangeError);
    expect(() =>
      estimatePeriod([...ok.slice(0, 50), Number.NaN, ...ok.slice(51)], FPS, 2.5, 4.5),
    ).toThrow(RangeError);
  });
});
