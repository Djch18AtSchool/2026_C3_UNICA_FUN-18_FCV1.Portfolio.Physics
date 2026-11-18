/**
 * Our own spectral analysis of a recorded note (Tema 11), ported from the research prototypes
 * (`harmonics.py`, `final_pair.py`, `envelope.py`; method of
 * docs/superpowers/research/2026-11-17-sintesis-sonido.md §4.1): Hann window, Welch average of
 * 0,25 s windows with 50 % overlap, zero padding ×8, peaks refined by parabolic interpolation of
 * the log magnitude, and a 10 ms RMS envelope for the attack.
 */
import { requirePositive } from '../physics/validate';

type Samples = ArrayLike<number>;

/** A one-sided amplitude spectrum: bin k is at k·df Hz; a sinusoid of amplitude A peaks at A. */
export interface Spectrum {
  df: number;
  amplitude: Float64Array;
}

/** Zero padding of each window before the FFT (research §4.1: ×8). */
export const ZERO_PAD = 8;
/** Welch windows of the analysis: 0,25 s with 50 % overlap. */
export const WELCH_WINDOW_S = 0.25;
export const WELCH_OVERLAP = 0.5;
/** Search bands around the expected peaks: ±6 % for the first guess of f₁, ±2 % per harmonic. */
export const F1_SEARCH_TOLERANCE = 0.06;
const HARMONIC_SEARCH_TOLERANCE = 0.02;
/** f₁ is the median of f_k/k over the first six harmonic peaks. */
const F1_REFINE_HARMONICS = 6;
/** Keeps log(0) finite in the interpolation, as the prototype does. */
const LOG_FLOOR = 1e-20;
/** Envelope thresholds of research §4.1, as fractions of the sustain level (median). */
const ONSET_FRACTION = 0.5;
const LOW_FRACTION = 0.1;
const HIGH_FRACTION = 0.9;

function requirePositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer, got ${value}`);
  }
}

/** Symmetric Hann window, w_i = 0,5 − 0,5 cos(2π i/(n − 1)), the same as numpy.hanning(n). */
export function hann(n: number): Float64Array {
  requirePositiveInteger('n', n);
  if (n === 1) return Float64Array.of(1);
  return Float64Array.from(
    { length: n },
    (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)),
  );
}

function bitReverse(i: number, bits: number): number {
  let reversed = 0;
  for (let b = 0; b < bits; b += 1) reversed = (reversed << 1) | ((i >> b) & 1);
  return reversed;
}

/**
 * Discrete Fourier transform X_k = Σ x_i e^(−2πi k i/n) of a real signal whose length is a power
 * of two (iterative radix-2 Cooley–Tukey), returned for bins k = 0…n/2. The input is not modified.
 */
export function realFft(x: Samples): { re: Float64Array; im: Float64Array } {
  const n = x.length;
  if (n < 1 || (n & (n - 1)) !== 0) {
    throw new RangeError(`the FFT length must be a power of two, got ${n}`);
  }
  const bits = Math.log2(n);
  const re = Float64Array.from({ length: n }, (_, i) => x[bitReverse(i, bits)]);
  const im = new Float64Array(n);
  const cos = Float64Array.from({ length: n / 2 }, (_, k) => Math.cos((2 * Math.PI * k) / n));
  const sin = Float64Array.from({ length: n / 2 }, (_, k) => Math.sin((2 * Math.PI * k) / n));
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let j = 0; j < half; j += 1) {
        const a = start + j;
        const b = a + half;
        const wr = cos[j * step];
        const wi = -sin[j * step];
        const tr = wr * re[b] - wi * im[b];
        const ti = wr * im[b] + wi * re[b];
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
  return { re: re.slice(0, n / 2 + 1), im: im.slice(0, n / 2 + 1) };
}

/**
 * Hann-windowed amplitude spectrum of one frame, zero-padded to the next power of two of
 * length × zeroPad and scaled by 2/Σw, so a sinusoid of amplitude A centred on a bin reads A.
 */
export function amplitudeSpectrum(
  frame: Samples,
  sampleRate: number,
  zeroPad = ZERO_PAD,
): Spectrum {
  requirePositive('sampleRate', sampleRate);
  requirePositiveInteger('zeroPad', zeroPad);
  const window = hann(frame.length);
  const size = 2 ** Math.ceil(Math.log2(frame.length * zeroPad));
  const padded = new Float64Array(size);
  window.forEach((w, i) => {
    padded[i] = frame[i] * w;
  });
  const { re, im } = realFft(padded);
  const scale = 2 / window.reduce((sum, w) => sum + w, 0);
  return {
    df: sampleRate / size,
    amplitude: re.map((r, k) => Math.hypot(r, im[k]) * scale),
  };
}

/** Start sample of every whole window, hop = ⌊window·(1 − overlap)⌋ (Welch). */
function windowStarts(length: number, window: number, overlap: number): number[] {
  if (!(overlap >= 0 && overlap < 1)) {
    throw new RangeError(`overlap must be in [0, 1), got ${overlap}`);
  }
  if (window < 1 || length < window) {
    throw new RangeError(`the signal (${length} samples) is shorter than one window (${window})`);
  }
  const hop = Math.max(1, Math.floor(window * (1 - overlap)));
  return Array.from({ length: Math.floor((length - window) / hop) + 1 }, (_, i) => i * hop);
}

/** The amplitude spectrum of each Welch window of x (windowS long, sliding by the hop). */
export function windowSpectra(
  x: Samples,
  sampleRate: number,
  windowS: number,
  overlap: number,
  zeroPad = ZERO_PAD,
): Spectrum[] {
  requirePositive('windowS', windowS);
  const window = Math.floor(windowS * sampleRate);
  const frames = Float64Array.from(x);
  return windowStarts(x.length, window, overlap).map((start) =>
    amplitudeSpectrum(frames.subarray(start, start + window), sampleRate, zeroPad),
  );
}

/**
 * Welch average: power_k = mean over the windows of |X_k|², with X scaled as in
 * amplitudeSpectrum. It is an amplitude-squared spectrum (not a density): √power_k is the
 * averaged amplitude of a steady sinusoid at bin k, which is what research §4.1 reads.
 */
export function welchPsd(
  x: Samples,
  sampleRate: number,
  windowS: number,
  overlap: number,
  zeroPad = ZERO_PAD,
): { df: number; power: Float64Array; windows: number } {
  const spectra = windowSpectra(x, sampleRate, windowS, overlap, zeroPad);
  const power = spectra[0].amplitude.map(
    (_, k) => spectra.reduce((sum, s) => sum + s.amplitude[k] ** 2, 0) / spectra.length,
  );
  return { df: spectra[0].df, power, windows: spectra.length };
}

/**
 * The strongest bin strictly inside (fc(1 − tol), fc(1 + tol)), refined by a parabola through the
 * log magnitudes of that bin and its neighbours: offset p = ½(a − c)/(a − 2b + c) bins and
 * amplitude e^(b − ¼(a − c)p), as `peak_near` in the research's harmonics.py.
 */
export function peakNear(
  spectrum: Spectrum,
  fc: number,
  tol: number,
): { frequency: number; amplitude: number } {
  const { df, amplitude } = spectrum;
  const low = fc * (1 - tol);
  const high = fc * (1 + tol);
  let best = -1;
  for (
    let k = Math.max(0, Math.floor(low / df));
    k <= Math.min(amplitude.length - 1, Math.ceil(high / df));
    k += 1
  ) {
    const f = k * df;
    if (f > low && f < high && (best < 0 || amplitude[k] > amplitude[best])) best = k;
  }
  if (best < 0) {
    throw new RangeError(`no spectrum bin between ${low} Hz and ${high} Hz`);
  }
  if (best === 0 || best === amplitude.length - 1) {
    return { frequency: best * df, amplitude: amplitude[best] };
  }
  const [a, b, c] = [-1, 0, 1].map((d) => Math.log(amplitude[best + d] + LOG_FLOOR));
  const curvature = a - 2 * b + c;
  const p = curvature === 0 ? 0 : (0.5 * (a - c)) / curvature;
  return { frequency: (best + p) * df, amplitude: Math.exp(b - 0.25 * (a - c) * p) };
}

/** The middle value, or the mean of the two middle values (numpy.median). */
export function median(values: readonly number[]): number {
  if (values.length === 0) throw new RangeError('median of an empty list');
  const sorted = [...values].sort((p, q) => p - q);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** f₁ from a spectrum: first guess near f1Guess, then the median of f_k/k for k = 1…6. */
export function fundamentalFrequency(spectrum: Spectrum, f1Guess: number): number {
  const coarse = peakNear(spectrum, f1Guess, F1_SEARCH_TOLERANCE).frequency;
  const estimates = Array.from(
    { length: F1_REFINE_HARMONICS },
    (_, i) => peakNear(spectrum, (i + 1) * coarse, HARMONIC_SEARCH_TOLERANCE).frequency / (i + 1),
  );
  return median(estimates);
}

/** Peak amplitudes of harmonics 1…count around n·f1 (±2 %), in dB relative to the first. */
export function harmonicLevelsDb(spectrum: Spectrum, f1: number, count: number): number[] {
  requirePositiveInteger('count', count);
  const amplitudes = Array.from(
    { length: count },
    (_, i) => peakNear(spectrum, (i + 1) * f1, HARMONIC_SEARCH_TOLERANCE).amplitude,
  );
  return amplitudes.map((a) => 20 * Math.log10(a / amplitudes[0]));
}

/**
 * Research §4.1 on a steady segment x: the Welch-averaged spectrum (0,25 s Hann windows, 50 %
 * overlap, ×8 padding), f₁ refined over harmonics 1…6, and the level of each harmonic
 * n = 1…count in dB relative to A₁ (index 0 = n 1, always 0 dB).
 */
export function harmonicAmplitudes(
  x: Samples,
  sampleRate: number,
  f1Guess: number,
  count: number,
): { f1: number; amplitudesDb: number[] } {
  requirePositiveInteger('count', count);
  const { df, power } = welchPsd(x, sampleRate, WELCH_WINDOW_S, WELCH_OVERLAP);
  const spectrum = { df, amplitude: power.map(Math.sqrt) };
  const f1 = fundamentalFrequency(spectrum, f1Guess);
  return { f1, amplitudesDb: harmonicLevelsDb(spectrum, f1, count) };
}

/** RMS of consecutive non-overlapping frames of ⌊frameS·f_s⌋ samples (the tail is dropped). */
export function rmsEnvelope(x: Samples, sampleRate: number, frameS: number): Float64Array {
  const frame = Math.floor(frameS * sampleRate);
  if (!(frame >= 1)) {
    throw new RangeError(`a frame of ${frameS} s is shorter than one sample at ${sampleRate} Hz`);
  }
  return Float64Array.from({ length: Math.floor(x.length / frame) }, (_, f) => {
    let sum = 0;
    for (let i = f * frame; i < (f + 1) * frame; i += 1) sum += x[i] * x[i];
    return Math.sqrt(sum / frame);
  });
}

/** Attack, sustain level and release of an envelope sampled at frameRate frames per second. */
export interface EnvelopeEvents {
  /** Median of the envelope between the first and the last frame above half its maximum. */
  sustainLevel: number;
  attackStartS: number;
  attackEndS: number;
  releaseStartS: number;
  releaseEndS: number;
}

/** Frame indices of the envelope events (see envelopeEvents). */
function eventFrames(envelope: Samples) {
  const e = Array.from(envelope);
  const peak = e.reduce((max, v) => Math.max(max, v), 0);
  if (!(peak > 0)) throw new RangeError('the envelope is silent');
  const isOn = (v: number) => v > ONSET_FRACTION * peak;
  const onStart = e.findIndex(isOn);
  // numpy's e[on[0]:on[-1]] leaves out the last frame above half the maximum.
  const sustainLevel = median(e.slice(onStart, Math.max(e.findLastIndex(isOn), onStart + 1)));
  const first = (fraction: number) => e.findIndex((v) => v > fraction * sustainLevel);
  const last = (fraction: number) => e.findLastIndex((v) => v > fraction * sustainLevel);
  return {
    sustainLevel,
    attackStart: first(LOW_FRACTION),
    attackEnd: first(HIGH_FRACTION),
    releaseStart: last(HIGH_FRACTION),
    releaseEnd: last(LOW_FRACTION),
  };
}

/**
 * Research §4.1 (`envelope.py`): the attack runs from the first frame above 10 % to the first
 * above 90 % of the sustain level; the release (the «caída» at the end of the note) from the last
 * frame above 90 % to the last above 10 %. Times are frame starts, frame index / frameRate.
 */
export function envelopeEvents(envelope: Samples, frameRate: number): EnvelopeEvents {
  requirePositive('frameRate', frameRate);
  const frames = eventFrames(envelope);
  return {
    sustainLevel: frames.sustainLevel,
    attackStartS: frames.attackStart / frameRate,
    attackEndS: frames.attackEnd / frameRate,
    releaseStartS: frames.releaseStart / frameRate,
    releaseEndS: frames.releaseEnd / frameRate,
  };
}

/** Attack time, 10 % → 90 % of the sustain level (research §4.1), in seconds. */
export function attackTime(envelope: Samples, frameRate: number): number {
  requirePositive('frameRate', frameRate);
  const { attackStart, attackEnd } = eventFrames(envelope);
  return (attackEnd - attackStart) / frameRate;
}
