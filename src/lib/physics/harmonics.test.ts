import { describe, expect, test } from 'vitest';
import {
  cents,
  classicAmplitudes,
  halfWaveCorrelation,
  maxHarmonicBelowNyquist,
  oddEvenPowerDb,
  predictedHalfWaveCorrelation,
  synthesize,
  toPeriodicWave,
  waveform,
} from './harmonics';

const PI = Math.PI;
const zeros = (n: number) => Array.from({ length: n }, () => 0);
/** Power of the odd (1, 3, 5…) and even (2, 4, 6…) harmonics of a recipe, index 0 = n 1. */
const powerByParity = (amplitudes: readonly number[]) =>
  amplitudes.reduce(
    (acc, a, i) =>
      i % 2 === 0 ? { ...acc, odd: acc.odd + a * a } : { ...acc, even: acc.even + a * a },
    { odd: 0, even: 0 },
  );

describe('classicAmplitudes (Web Audio §1.28.6, research §5 Paso 3)', () => {
  test('a sine is only the fundamental', () => {
    expect(classicAmplitudes('seno', 4)).toEqual([1, 0, 0, 0]);
  });

  test('a square wave has 4/(nπ) on odd n and nothing on even n', () => {
    const expected = [4 / PI, 0, 4 / (3 * PI), 0, 4 / (5 * PI)];

    classicAmplitudes('cuadrada', 5).forEach((a, i) => expect(a).toBeCloseTo(expected[i], 12));
  });

  test('a sawtooth has 2/(nπ) on every n with alternating sign', () => {
    const amplitudes = classicAmplitudes('sierra', 6);

    amplitudes.forEach((a, i) => {
      const n = i + 1;
      expect(a).toBeCloseTo(((n % 2 === 1 ? 1 : -1) * 2) / (n * PI), 12);
    });
    expect(amplitudes[1]).toBeLessThan(0);
  });

  test('a triangle wave has 8/(π² n²) on odd n with alternating sign, exactly 0 on even n', () => {
    const amplitudes = classicAmplitudes('triangular', 7);
    const expected = [1, 0, -1 / 9, 0, 1 / 25, 0, -1 / 49].map((r) => (8 / (PI * PI)) * r);

    amplitudes.forEach((a, i) => expect(a).toBeCloseTo(expected[i], 12));
    expect(amplitudes[1]).toBe(0);
    expect(amplitudes[3]).toBe(0);
  });

  test.each([0, -1, 2.5, Number.NaN])('rejects a harmonic count of %s', (count) => {
    expect(() => classicAmplitudes('cuadrada', count)).toThrow(RangeError);
  });
});

describe('synthesize: y(t) = Σ A_n sin(2π n f₁ t + φ_n), equation (11.4)', () => {
  test('one harmonic is the pure tone A sin(2π f t + φ) of (11.1)', () => {
    const t = 0.0007;

    expect(synthesize([0.5], [0.3], 310, t)).toBeCloseTo(
      0.5 * Math.sin(2 * PI * 310 * t + 0.3),
      12,
    );
  });

  test('adds the harmonics at n f₁ with their own phases', () => {
    const t = 0.0011;
    const expected = 1 * Math.sin(2 * PI * 200 * t) + 0.25 * Math.sin(2 * PI * 600 * t + 1);

    expect(synthesize([1, 0, 0.25], [0, 0, 1], 200, t)).toBeCloseTo(expected, 12);
  });

  test('repeats every period T = 1/f₁ whatever the recipe', () => {
    const recipe = classicAmplitudes('sierra', 8);
    const phases = recipe.map((_, i) => i * 0.4);

    expect(synthesize(recipe, phases, 310, 0.001 + 1 / 310)).toBeCloseTo(
      synthesize(recipe, phases, 310, 0.001),
      9,
    );
  });

  test('rejects phases that do not match the amplitudes, or a non-finite f₁ or t', () => {
    expect(() => synthesize([1, 0.5], [0], 310, 0)).toThrow(RangeError);
    expect(() => synthesize([1], [0], Number.NaN, 0)).toThrow(RangeError);
    expect(() => synthesize([1], [0], 310, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('waveform', () => {
  test('samples whole periods with t/T on the x axis, endpoint included', () => {
    const { tOverT, y } = waveform([1], [0], 2, 4);

    expect(tOverT).toEqual([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
    expect(y.map((v) => Number(v.toFixed(12)) + 0)).toEqual([0, 1, 0, -1, 0, 1, 0, -1, 0]);
  });

  test('a square recipe swings between about ±1 (peak amplitude 1, research §5)', () => {
    const { y } = waveform(classicAmplitudes('cuadrada', 399), zeros(399), 1, 400);

    expect(y[100]).toBeCloseTo(1, 2);
    expect(y[300]).toBeCloseTo(-1, 2);
  });

  test('rejects a non-positive number of periods or a non-integer resolution', () => {
    expect(() => waveform([1], [0], 0, 64)).toThrow(RangeError);
    expect(() => waveform([1], [0], 1, 0)).toThrow(RangeError);
    expect(() => waveform([1], [0], 1, 10.5)).toThrow(RangeError);
  });
});

describe('halfWaveCorrelation: corr(y(t), −y(t + T/2)), equation (11.6)', () => {
  test('is 1 for a square wave: with only odd harmonics y(t + T/2) = −y(t)', () => {
    const recipe = classicAmplitudes('cuadrada', 15);
    const { y } = waveform(recipe, zeros(15), 3, 256);

    expect(halfWaveCorrelation(y, 256)).toBeCloseTo(1, 12);
  });

  test('equals (P_odd − P_even)/(P_odd + P_even) for a sawtooth (orthogonality over whole periods)', () => {
    const recipe = classicAmplitudes('sierra', 10);
    const { odd, even } = powerByParity(recipe);
    const { y } = waveform(recipe, zeros(10), 3, 256);

    expect(halfWaveCorrelation(y, 256)).toBeCloseTo((odd - even) / (odd + even), 10);
  });

  test('is −1 with only even harmonics, and the same with any phases', () => {
    const { y } = waveform([0, 1, 0, 0.5], [0, 0.3, 0, 2], 2, 128);

    expect(halfWaveCorrelation(y, 128)).toBeCloseTo(-1, 10);
  });

  test('accepts a fractional period (a recording: f_s/f₁ samples) by linear interpolation', () => {
    const fs = 44100;
    const f1 = 310.1;
    const y = Array.from(
      { length: 2000 },
      (_, i) => Math.sin((2 * PI * f1 * i) / fs) + 0.3 * Math.sin((6 * PI * f1 * i) / fs),
    );

    expect(halfWaveCorrelation(y, fs / f1)).toBeGreaterThan(0.999);
  });

  test('needs at least one whole period plus half a period, and a signal that varies', () => {
    expect(() => halfWaveCorrelation([0, 1, 0, -1, 0], 4)).toThrow(RangeError);
    expect(() => halfWaveCorrelation(zeros(64), 16)).toThrow(RangeError);
    expect(() => halfWaveCorrelation(zeros(64), 0)).toThrow(RangeError);
  });
});

describe('oddEvenPowerDb (research §4.1)', () => {
  test('compares the power of n = 1, 3, 5, 7, 9 with that of n = 2, 4, 6, 8, 10', () => {
    // odd: 1² + 0,5² = 1,25; even: 0,5² = 0,25 → 10 log10(5)
    expect(oddEvenPowerDb([1, 0.5, 0.5])).toBeCloseTo(10 * Math.log10(5), 12);
  });

  test('ignores harmonics above the tenth and the sign of each amplitude', () => {
    expect(oddEvenPowerDb([1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9])).toBeCloseTo(0, 12);
  });

  test('is +∞ with no even power (square wave), −∞ with no odd power and NaN for silence', () => {
    expect(oddEvenPowerDb(classicAmplitudes('cuadrada', 10))).toBe(Number.POSITIVE_INFINITY);
    expect(oddEvenPowerDb([0, 1])).toBe(Number.NEGATIVE_INFINITY);
    expect(oddEvenPowerDb([0, 0])).toBeNaN();
  });

  test('a sawtooth sits a few dB above 0 (each odd harmonic is louder than the next even one)', () => {
    const { odd, even } = powerByParity(classicAmplitudes('sierra', 10));

    expect(oddEvenPowerDb(classicAmplitudes('sierra', 10))).toBeCloseTo(
      10 * Math.log10(odd / even),
      12,
    );
  });
});

describe('toPeriodicWave: (A_n, φ_n) → Web Audio real/imag, equation (11.5)', () => {
  test('one harmonic with zero phase is imag[1] = 1, the API sine', () => {
    const { real, imag } = toPeriodicWave([1], [0]);

    expect(Array.from(real)).toEqual([0, 0]);
    expect(Array.from(imag)).toEqual([0, 1]);
  });

  test('a_n = A_n sin φ_n and b_n = A_n cos φ_n, index 0 (DC) = 0', () => {
    const { real, imag } = toPeriodicWave([1, 0.5], [0, PI / 2]);

    expect(real).toBeInstanceOf(Float32Array);
    expect(real[0]).toBe(0);
    expect(imag[0]).toBe(0);
    expect(real[2]).toBeCloseTo(0.5, 6);
    expect(imag[2]).toBeCloseTo(0, 6);
  });

  test('the Fourier sum of the coefficients is the synthesis of (11.4) at t in periods', () => {
    const amplitudes = [1, 0.4, 0.7];
    const phases = [0.2, -1.1, 2.5];
    const { real, imag } = toPeriodicWave(amplitudes, phases);
    const t = 0.37;
    const fourier = [1, 2, 3].reduce(
      (sum, k) => sum + real[k] * Math.cos(2 * PI * k * t) + imag[k] * Math.sin(2 * PI * k * t),
      0,
    );

    expect(fourier).toBeCloseTo(synthesize(amplitudes, phases, 1, t), 5);
  });

  test('rejects phases that do not match the amplitudes', () => {
    expect(() => toPeriodicWave([1, 1], [0])).toThrow(RangeError);
  });
});

describe('maxHarmonicBelowNyquist: ⌊f_s/(2 f₁)⌋, equation (11.9)', () => {
  test('keeps 71 harmonics of 310 Hz at 44,1 kHz and 77 of 310,1 Hz at 48 kHz (research §4.4)', () => {
    expect(maxHarmonicBelowNyquist(310, 44100)).toBe(71);
    expect(maxHarmonicBelowNyquist(310.1, 48000)).toBe(77);
  });

  test('a fundamental above Nyquist leaves no harmonic', () => {
    expect(maxHarmonicBelowNyquist(30000, 44100)).toBe(0);
  });

  test('rejects a non-positive f₁ or sample rate', () => {
    expect(() => maxHarmonicBelowNyquist(0, 44100)).toThrow(RangeError);
    expect(() => maxHarmonicBelowNyquist(310, -1)).toThrow(RangeError);
  });
});

describe('predictedHalfWaveCorrelation: equation (11.6) from the odd/even power', () => {
  test('is (r − 1)/(r + 1) with r = 10^(dB/10): 25,7 dB predicts 0,995 and −0,7 dB predicts −0,083', () => {
    expect(predictedHalfWaveCorrelation(25.6662)).toBeCloseTo(0.9946, 4);
    expect(predictedHalfWaveCorrelation(-0.7247)).toBeCloseTo(-0.0832, 4);
    expect(predictedHalfWaveCorrelation(0)).toBe(0);
  });

  test('matches the correlation measured on a synthesised recipe with both parities', () => {
    const amplitudes = [1, 0.5, 0.3, 0.2, 0.1, 0.05];
    const { y } = waveform(amplitudes, [0.3, -1, 2, 0.5, 1.4, -2.2], 3, 256);

    expect(halfWaveCorrelation(y, 256)).toBeCloseTo(
      predictedHalfWaveCorrelation(oddEvenPowerDb(amplitudes)),
      6,
    );
  });

  test('one silent parity gives ±1, and NaN is rejected', () => {
    expect(predictedHalfWaveCorrelation(Infinity)).toBe(1);
    expect(predictedHalfWaveCorrelation(-Infinity)).toBe(-1);
    expect(() => predictedHalfWaveCorrelation(Number.NaN)).toThrow(RangeError);
  });
});

describe('cents: the interval between two frequencies', () => {
  test('an octave is 1 200 cents and the two recordings are 1,37 cents apart', () => {
    expect(cents(220, 440)).toBeCloseTo(1200, 9);
    expect(cents(310.0964, 310.3424)).toBeCloseTo(1.373, 3);
    expect(cents(440, 220)).toBeCloseTo(-1200, 9);
  });

  test('rejects a non-positive frequency', () => {
    expect(() => cents(0, 440)).toThrow(RangeError);
    expect(() => cents(440, -1)).toThrow(RangeError);
  });
});

describe('the Hammond organ’s tempered harmonics (patent US 1 956 350, research §4.4)', () => {
  test('the 5th harmonic taken from the tempered scale (28 semitones) is 13,69 cents sharp', () => {
    expect(cents(5, 2 ** (28 / 12))).toBeCloseTo(13.69, 2);
    expect(cents(3, 2 ** (19 / 12))).toBeCloseTo(-1.96, 2);
  });
});
