import { describe, expect, test } from 'vitest';
import { steadyAmplitude, type Oscillator } from '../../../lib/physics/resonance';
import {
  decayingEnvelopeAt,
  envelopeAt,
  firstReach,
  maxEnvelopeUntil,
  simulate,
  traceUntil,
  xAt,
  type Run,
} from './resonanceRun';

const TWO_PI = 2 * Math.PI;

/** m = 1 kg at f0 Hz with damping ratio ζ: k = ω0², b = 2ζω0. */
function unitOscillator(f0: number, zeta: number): Oscillator {
  const omega0 = TWO_PI * f0;
  return { m: 1, k: omega0 * omega0, b: 2 * zeta * omega0 };
}

describe('simulate', () => {
  test('a resonant drive from rest settles on the steady amplitude of (12.3)', () => {
    // Arrange
    const oscillator = unitOscillator(1, 0.05);
    const omega = TWO_PI;
    const F0 = oscillator.k;

    // Act: 30 time constants, so the transient has died out.
    const run = simulate({
      oscillator,
      force: (t) => F0 * Math.cos(omega * t),
      duration: 100,
      dt: 1 / 400,
    });

    // Assert
    const steady = steadyAmplitude(oscillator, F0, omega);
    expect(envelopeAt(run, run.duration)).toBeCloseTo(steady, 1);
    expect(Math.abs(envelopeAt(run, run.duration) - steady) / steady).toBeLessThan(0.01);
  });

  test('an impulse J on a resting oscillator starts it at J/(m ω′) and nothing before it', () => {
    // Arrange
    const oscillator = unitOscillator(1, 0);
    const J = TWO_PI;

    // Act
    const run = simulate({
      oscillator,
      force: () => 0,
      duration: 3,
      dt: 1 / 1000,
      impulses: [{ t: 1, J }],
    });

    // Assert
    expect(xAt(run, 0.5)).toBe(0);
    expect(envelopeAt(run, 2.5)).toBeCloseTo(1, 2);
  });

  test('stores samples on a regular grid and interpolates between them', () => {
    const run = simulate({
      oscillator: unitOscillator(1, 0.1),
      force: (t) => t,
      duration: 1,
      dt: 0.01,
      sampleEvery: 10,
    });

    expect(run.sampleDt).toBeCloseTo(0.1, 12);
    expect(run.samples.length).toBe(11);
    const between = xAt(run, 0.45);
    expect(between).toBeCloseTo((run.samples[4] + run.samples[5]) / 2, 12);
    expect(xAt(run, -1)).toBe(run.samples[0]);
    expect(xAt(run, 9)).toBe(run.samples[10]);
  });

  test('rejects a run without steps and an impulse outside the run', () => {
    const oscillator = unitOscillator(1, 0.1);
    expect(() => simulate({ oscillator, force: () => 0, duration: 0, dt: 0.1 })).toThrow(
      RangeError,
    );
    expect(() =>
      simulate({ oscillator, force: () => 0, duration: 1, dt: 0.1, impulses: [{ t: 2, J: 1 }] }),
    ).toThrow(RangeError);
  });
});

describe('the envelope of a run', () => {
  const run: Run = simulate({
    oscillator: unitOscillator(2, 0.02),
    force: (t) => 1000 * Math.cos(TWO_PI * 2 * t),
    duration: 20,
    dt: 1 / 800,
  });

  test('is 0 at the start, grows with the peaks and holds the last one past the end', () => {
    expect(envelopeAt(run, 0)).toBe(0);
    expect(envelopeAt(run, 5)).toBeGreaterThan(envelopeAt(run, 1));
    expect(envelopeAt(run, 50)).toBe(envelopeAt(run, run.duration));
  });

  test('its running maximum never decreases and reaches the largest peak', () => {
    const times = [0, 1, 2, 5, 10, 20];
    const maxima = times.map((t) => maxEnvelopeUntil(run, t));
    maxima.slice(1).forEach((value, i) => expect(value).toBeGreaterThanOrEqual(maxima[i]));
    expect(maxEnvelopeUntil(run, run.duration)).toBe(run.maxPeak);
    expect(maxEnvelopeUntil(run, -1)).toBe(0);
  });

  test('says when it first reaches a level, and never for one above every peak', () => {
    const half = run.maxPeak / 2;
    const at = firstReach(run, half);
    expect(at).toBeDefined();
    expect(envelopeAt(run, at as number)).toBeGreaterThanOrEqual(half * 0.999);
    expect(firstReach(run, run.maxPeak * 2)).toBeUndefined();
    expect(firstReach(run, Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  test('its trace keeps at most the requested points, in time order, up to a time', () => {
    const trace = traceUntil(run, 10, 50);
    expect(trace.length).toBeLessThanOrEqual(50);
    expect(trace.at(-1)?.t).toBeLessThanOrEqual(10);
    trace.slice(1).forEach((point, i) => expect(point.t).toBeGreaterThan(trace[i].t));
    expect(traceUntil(run, -1, 50)).toEqual([]);
  });
});

describe('the decaying envelope of a free oscillation', () => {
  test('follows e^{−ζω0 t} exactly between peaks, where a straight line would sag', () => {
    // Arrange: a push on a damped oscillator, read halfway between two peaks.
    const zeta = 0.1;
    const omega0 = TWO_PI;
    const oscillator = unitOscillator(1, zeta);
    const run = simulate({
      oscillator,
      force: () => 0,
      duration: 4,
      dt: 1 / 2000,
      impulses: [{ t: 0, J: omega0 * Math.sqrt(1 - zeta * zeta) }],
    });
    const [t0, t1] = [run.peakT[2], run.peakT[3]];
    const middle = (t0 + t1) / 2;
    const exact = run.peakA[2] * Math.exp(-zeta * omega0 * (middle - t0));

    // Act
    const geometric = decayingEnvelopeAt(run, middle);

    // Assert
    expect(geometric).toBeCloseTo(exact, 4);
    expect(envelopeAt(run, middle)).toBeGreaterThan(exact);
  });

  test('falls back to the straight line next to a zero', () => {
    const run = simulate({
      oscillator: unitOscillator(1, 0.1),
      force: () => 0,
      duration: 1,
      dt: 0.01,
    });
    expect(decayingEnvelopeAt(run, 0.5)).toBe(0);
  });
});
