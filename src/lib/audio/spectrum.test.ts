import { describe, expect, test } from 'vitest';
import {
  amplitudeSpectrum,
  attackTime,
  envelopeEvents,
  hann,
  harmonicAmplitudes,
  median,
  peakNear,
  realFft,
  rmsEnvelope,
  welchPsd,
} from './spectrum';

const FS = 44100;
const TWO_PI = 2 * Math.PI;
/** A clarinet-like recipe in dB re A₁ (research §4.1), with phases that are not all zero. */
const RECIPE_DB = [0, -34.1, 3.3, -21.2, -7.8, -31.5, -18, -37.3, -27.8, -37.6, -40.1, -28.8];
const RECIPE_PHASES = RECIPE_DB.map((_, i) => (i * 1.3) % TWO_PI);
const dbToLinear = (db: number) => 10 ** (db / 20);

/** A steady periodic note: Σ A_n sin(2π n f₁ t + φ_n) sampled at f_s for `seconds`. */
function steadyNote(f1: number, seconds: number, peak = 0.2): Float64Array {
  const amplitudes = RECIPE_DB.map(dbToLinear);
  return Float64Array.from({ length: Math.round(seconds * FS) }, (_, i) =>
    amplitudes.reduce(
      (sum, a, k) => sum + peak * a * Math.sin((TWO_PI * (k + 1) * f1 * i) / FS + RECIPE_PHASES[k]),
      0,
    ),
  );
}

/** Direct DFT, the definition the FFT must reproduce. */
function directDft(x: readonly number[]) {
  const n = x.length;
  return Array.from({ length: n / 2 + 1 }, (_, k) =>
    x.reduce(
      (acc, v, i) => ({
        re: acc.re + v * Math.cos((TWO_PI * k * i) / n),
        im: acc.im - v * Math.sin((TWO_PI * k * i) / n),
      }),
      { re: 0, im: 0 },
    ),
  );
}

describe('hann (symmetric, as numpy.hanning)', () => {
  test('is 0 at both ends and 1 in the middle', () => {
    const window = hann(5);

    [0, 0.5, 1, 0.5, 0].forEach((v, i) => expect(window[i]).toBeCloseTo(v, 12));
    expect(window[0]).toBe(0);
    expect(window[2]).toBe(1);
  });

  test('a single point is 1; rejects a length that is not a positive integer', () => {
    expect(Array.from(hann(1))).toEqual([1]);
    expect(() => hann(0)).toThrow(RangeError);
    expect(() => hann(3.5)).toThrow(RangeError);
  });
});

describe('realFft (radix 2)', () => {
  test('matches the direct DFT bin by bin (bins 0…n/2)', () => {
    const x = Array.from(
      { length: 16 },
      (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1) + (i % 3) * 0.1,
    );
    const { re, im } = realFft(x);
    const expected = directDft(x);

    expect(re).toHaveLength(9);
    expected.forEach(({ re: r, im: m }, k) => {
      expect(re[k]).toBeCloseTo(r, 10);
      expect(im[k]).toBeCloseTo(m, 10);
    });
  });

  test('a single sample is its own transform; does not modify the input', () => {
    const x = Float64Array.from([3, 1, 4, 1]);
    const { re } = realFft([2.5]);

    realFft(x);
    expect(Array.from(re)).toEqual([2.5]);
    expect(Array.from(x)).toEqual([3, 1, 4, 1]);
  });

  test('rejects a length that is not a power of two', () => {
    expect(() => realFft([1, 2, 3])).toThrow(RangeError);
    expect(() => realFft([])).toThrow(RangeError);
  });
});

describe('amplitudeSpectrum and peakNear', () => {
  test('pads to the next power of two of window × zero padding and scales a sinusoid to its amplitude', () => {
    const fs = 8000;
    const f = (1000 * fs) / 8192; // exactly on bin 1000 of the padded transform
    const frame = Float64Array.from(
      { length: 1024 },
      (_, i) => 0.5 * Math.sin((TWO_PI * f * i) / fs),
    );
    const spectrum = amplitudeSpectrum(frame, fs, 8);

    expect(spectrum.df).toBeCloseTo(fs / 8192, 12);
    expect(spectrum.amplitude).toHaveLength(4097);
    expect(spectrum.amplitude[1000]).toBeCloseTo(0.5, 6);
  });

  test('parabolic interpolation recovers a frequency between bins and its amplitude', () => {
    const frame = Float64Array.from(
      { length: 11025 },
      (_, i) => 0.3 * Math.sin((TWO_PI * 310.2 * i) / FS),
    );
    const peak = peakNear(amplitudeSpectrum(frame, FS), 311.13, 0.06);

    expect(Math.abs(peak.frequency - 310.2)).toBeLessThan(0.01);
    expect(20 * Math.log10(peak.amplitude / 0.3)).toBeCloseTo(0, 1);
  });

  test('peakNear rejects a band with no bin in it', () => {
    const spectrum = amplitudeSpectrum(new Float64Array(16).fill(1), 16, 1);

    expect(() => peakNear(spectrum, 1000, 0.01)).toThrow(RangeError);
  });

  test('a peak on the last bin has no neighbour to interpolate with: it is read as is', () => {
    const spectrum = { df: 10, amplitude: Float64Array.from([0, 0.1, 0.2, 0.7]) };

    expect(peakNear(spectrum, 29, 0.1)).toEqual({ frequency: 30, amplitude: 0.7 });
  });
});

describe('welchPsd (Hann windows, overlap, mean of |X|²)', () => {
  test('averages whole windows hop by hop; √power is the amplitude of a steady sinusoid', () => {
    const fs = 8000;
    const f = (1000 * fs) / 8192;
    const x = Float64Array.from({ length: 4000 }, (_, i) => 0.5 * Math.sin((TWO_PI * f * i) / fs));
    const { df, power, windows } = welchPsd(x, fs, 0.128, 0.5);

    expect(windows).toBe(6);
    expect(df).toBeCloseTo(fs / 8192, 12);
    expect(Math.sqrt(power[1000])).toBeCloseTo(0.5, 6);
  });

  test('rejects a signal shorter than one window or an overlap outside [0, 1)', () => {
    expect(() => welchPsd(new Float64Array(100), FS, 0.25, 0.5)).toThrow(RangeError);
    expect(() => welchPsd(new Float64Array(FS), FS, 0.25, 1)).toThrow(RangeError);
    expect(() => welchPsd(new Float64Array(FS), FS, 0.25, -0.1)).toThrow(RangeError);
  });
});

describe('harmonicAmplitudes (research §4.1: Welch 0,25 s, 50 %, parabolic peaks, f₁ from n = 1…6)', () => {
  test('recovers f₁ = 310,2 Hz within 0,05 Hz and each harmonic within 0,2 dB', () => {
    const { f1, amplitudesDb } = harmonicAmplitudes(steadyNote(310.2, 1.5), FS, 311.13, 12);

    expect(Math.abs(f1 - 310.2)).toBeLessThan(0.05);
    expect(amplitudesDb).toHaveLength(12);
    amplitudesDb.forEach((db, i) => expect(Math.abs(db - RECIPE_DB[i])).toBeLessThan(0.2));
  });

  test('rejects a harmonic count that is not a positive integer', () => {
    expect(() => harmonicAmplitudes(steadyNote(310.2, 0.5), FS, 311.13, 0)).toThrow(RangeError);
  });
});

describe('median', () => {
  test('takes the middle value, or the mean of the two middle values (as numpy)', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(() => median([])).toThrow(RangeError);
  });
});

describe('rmsEnvelope, envelopeEvents and attackTime (research §4.1, 10 %→90 % of the sustain)', () => {
  test('the RMS of whole-period frames of a sine of amplitude A is A/√2', () => {
    const x = Float64Array.from(
      { length: 4410 },
      (_, i) => 0.4 * Math.sin((TWO_PI * 100 * i) / FS),
    );
    const envelope = rmsEnvelope(x, FS, 0.01);

    expect(envelope).toHaveLength(10);
    envelope.forEach((v) => expect(v).toBeCloseTo(0.4 / Math.SQRT2, 6));
  });

  /** 10 silent frames, a 50-frame linear rise, a 100-frame sustain at 1, a 30-frame fall. */
  const envelope = Float64Array.from([
    ...Array.from({ length: 10 }, () => 0),
    ...Array.from({ length: 50 }, (_, j) => j / 50),
    ...Array.from({ length: 100 }, () => 1),
    ...Array.from({ length: 31 }, (_, j) => 1 - j / 30),
    ...Array.from({ length: 10 }, () => 0),
  ]);

  test('the attack runs from the first frame above 10 % to the first above 90 % of the sustain median', () => {
    // rise: frame 10 + j holds j/50 → first > 0,1 at j = 6 (frame 16), first > 0,9 at j = 46 (frame 56)
    expect(attackTime(envelope, 100)).toBeCloseTo(0.4, 12);
    expect(envelopeEvents(envelope, 100)).toMatchObject({ attackStartS: 0.16, attackEndS: 0.56 });
  });

  test('the release runs from the last frame above 90 % to the last above 10 % of the sustain', () => {
    // fall: frame 160 + j holds 1 − j/30 → last > 0,9 at j = 2 (frame 162), last > 0,1 at j = 26 (frame 186)
    const events = envelopeEvents(envelope, 100);

    expect(events.releaseStartS).toBeCloseTo(1.62, 12);
    expect(events.releaseEndS).toBeCloseTo(1.86, 12);
    expect(events.sustainLevel).toBe(1);
  });

  test('rejects a silent envelope and a frame length shorter than one sample', () => {
    expect(() => envelopeEvents(new Float64Array(20), 100)).toThrow(RangeError);
    expect(() => rmsEnvelope(new Float64Array(100), FS, 1e-6)).toThrow(RangeError);
  });
});
