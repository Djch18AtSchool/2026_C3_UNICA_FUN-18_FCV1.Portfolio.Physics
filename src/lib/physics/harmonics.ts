/**
 * Harmonics and timbre (Tema 11): the classic recipes, the sum of harmonics (11.4), the half-wave
 * symmetry (11.6), the Web Audio coefficients (11.5) and the Nyquist limit (11.9). A recipe is a
 * list of signed amplitudes A_n and phases φ_n with index 0 = harmonic n = 1, in the convention
 * y(t) = Σ A_n sin(2π n f₁ t + φ_n). Source: docs/superpowers/research/2026-11-17-sintesis-sonido.md §5.
 */
import { requireFinite, requirePositive } from './validate';

/** The four waveforms of Web Audio's OscillatorNode (W3C Recommendation 2021-06-17, §1.28.6). */
export type ClassicWave = 'seno' | 'cuadrada' | 'sierra' | 'triangular';

/** Harmonics compared by oddEvenPowerDb: n = 1…10 (five odd, five even), as in research §4.1. */
const ODD_EVEN_HARMONICS = 10;
const TWO_PI = 2 * Math.PI;

function requirePositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer, got ${value}`);
  }
}

function requireMatchingPhases(amplitudes: readonly number[], phases: readonly number[]): void {
  if (amplitudes.length !== phases.length) {
    throw new RangeError(
      `phases (${phases.length}) must match amplitudes (${amplitudes.length}), one per harmonic`,
    );
  }
}

/** A_n of harmonic n for each classic wave, with peak amplitude 1 (§1.28.6; Chromium L408-L428). */
function classicAmplitude(wave: ClassicWave, n: number): number {
  const isOdd = n % 2 === 1;
  switch (wave) {
    case 'seno':
      return n === 1 ? 1 : 0;
    case 'cuadrada':
      return isOdd ? 4 / (n * Math.PI) : 0;
    case 'sierra':
      return ((isOdd ? 1 : -1) * 2) / (n * Math.PI);
    case 'triangular':
      // 8 sin(nπ/2)/(π n)²: sin(nπ/2) is +1, −1, +1… on odd n and exactly 0 on even n.
      return isOdd ? ((((n - 1) / 2) % 2 === 0 ? 1 : -1) * 8) / (Math.PI * n) ** 2 : 0;
  }
}

/** Signed amplitudes A_n of a classic wave for n = 1…count (index 0 = n 1); research §5 Paso 3. */
export function classicAmplitudes(wave: ClassicWave, count: number): number[] {
  requirePositiveInteger('count', count);
  return Array.from({ length: count }, (_, i) => classicAmplitude(wave, i + 1));
}

/** Equation (11.4): y(t) = Σ A_n sin(2π n f₁ t + φ_n), with f₁ in Hz and t in s. */
export function synthesize(
  amplitudes: readonly number[],
  phases: readonly number[],
  f1: number,
  t: number,
): number {
  requireMatchingPhases(amplitudes, phases);
  requireFinite('f1', f1);
  requireFinite('t', t);
  return amplitudes.reduce(
    (sum, a, i) => sum + a * Math.sin(TWO_PI * (i + 1) * f1 * t + phases[i]),
    0,
  );
}

/**
 * The recipe over `periods` periods with `samplesPerPeriod` points each, endpoint included:
 * t/T = i/samplesPerPeriod for i = 0…periods·samplesPerPeriod (rounded), and y = (11.4) at f₁ = 1.
 */
export function waveform(
  amplitudes: readonly number[],
  phases: readonly number[],
  periods: number,
  samplesPerPeriod: number,
): { tOverT: number[]; y: number[] } {
  requireMatchingPhases(amplitudes, phases);
  requirePositive('periods', periods);
  requirePositiveInteger('samplesPerPeriod', samplesPerPeriod);
  const tOverT = Array.from(
    { length: Math.round(periods * samplesPerPeriod) + 1 },
    (_, i) => i / samplesPerPeriod,
  );
  return { tOverT, y: tOverT.map((t) => synthesize(amplitudes, phases, 1, t)) };
}

/** y at a fractional index by linear interpolation between its neighbours (numpy.interp). */
export function sampleAt(y: ArrayLike<number>, position: number): number {
  const i = Math.floor(position);
  const fraction = position - i;
  return fraction === 0 ? y[i] : y[i] + fraction * (y[i + 1] - y[i]);
}

/** Pearson correlation of two equally long series. Throws if either does not vary. */
function pearson(u: readonly number[], v: readonly number[]): number {
  const mean = (s: readonly number[]) => s.reduce((sum, x) => sum + x, 0) / s.length;
  const mu = mean(u);
  const mv = mean(v);
  const { uv, uu, vv } = u.reduce(
    (acc, x, i) => ({
      uv: acc.uv + (x - mu) * (v[i] - mv),
      uu: acc.uu + (x - mu) ** 2,
      vv: acc.vv + (v[i] - mv) ** 2,
    }),
    { uv: 0, uu: 0, vv: 0 },
  );
  if (uu === 0 || vv === 0) {
    throw new RangeError('the signal must vary to compute a correlation');
  }
  return uv / Math.sqrt(uu * vv);
}

/**
 * Equation (11.6) measured: the correlation between y(t) and −y(t + T/2) over the largest whole
 * number of periods that leaves room for the half-period shift. `samplesPerPeriod` may be
 * fractional (a recording: f_s/f₁); the shifted samples are then interpolated linearly. It is 1
 * with only odd harmonics, −1 with only even ones and (P_odd − P_even)/(P_odd + P_even) in general.
 */
export function halfWaveCorrelation(y: readonly number[], samplesPerPeriod: number): number {
  requirePositive('samplesPerPeriod', samplesPerPeriod);
  const half = samplesPerPeriod / 2;
  const periods = Math.floor((y.length - 1 - half) / samplesPerPeriod);
  if (periods < 1) {
    throw new RangeError(
      `need at least 1.5 periods (${Math.ceil(1.5 * samplesPerPeriod) + 1} samples), got ${y.length}`,
    );
  }
  const count = Math.round(periods * samplesPerPeriod);
  const u = y.slice(0, count);
  const v = u.map((_, i) => -sampleAt(y, i + half));
  return pearson(u, v);
}

/**
 * Odd/even power in dB (research §4.1): 10 log₁₀[(A₁² + A₃² + A₅² + A₇² + A₉²) /
 * (A₂² + A₄² + A₆² + A₈² + A₁₀²)], from the amplitudes of n = 1, 2, … (index 0 = n 1); harmonics
 * above the tenth are ignored. +∞ with no even power, −∞ with no odd power, NaN for silence.
 */
export function oddEvenPowerDb(amplitudes: readonly number[]): number {
  const { odd, even } = amplitudes
    .slice(0, ODD_EVEN_HARMONICS)
    .reduce(
      (acc, a, i) =>
        i % 2 === 0 ? { ...acc, odd: acc.odd + a * a } : { ...acc, even: acc.even + a * a },
      { odd: 0, even: 0 },
    );
  return 10 * Math.log10(odd / even);
}

/**
 * The recipe as Web Audio PeriodicWave coefficients, equation (11.5): since
 * A sin(α + φ) = A cos φ sin α + A sin φ cos α, real[n] = a_n = A_n sin φ_n (cosine terms) and
 * imag[n] = b_n = A_n cos φ_n (sine terms); index 0 is the DC offset, always 0 (§1.28.3.1).
 */
export function toPeriodicWave(
  amplitudes: readonly number[],
  phases: readonly number[],
): { real: Float32Array; imag: Float32Array } {
  requireMatchingPhases(amplitudes, phases);
  return {
    real: Float32Array.from([0, ...amplitudes.map((a, i) => a * Math.sin(phases[i]))]),
    imag: Float32Array.from([0, ...amplitudes.map((a, i) => a * Math.cos(phases[i]))]),
  };
}

/** Equation (11.9): the highest harmonic n with n f₁ ≤ f_s/2, that is ⌊f_s/(2 f₁)⌋. */
export function maxHarmonicBelowNyquist(f1: number, sampleRate: number): number {
  requirePositive('f1', f1);
  requirePositive('sampleRate', sampleRate);
  return Math.floor(sampleRate / (2 * f1));
}

/**
 * Equation (11.6) predicted (cálculo propio, research §5 Paso 3): the odd and even parts of a
 * recipe are orthogonal over whole periods, so corr(y(t), −y(t + T/2)) = (P_odd − P_even) /
 * (P_odd + P_even) = (r − 1)/(r + 1) with r = 10^(dB/10) from oddEvenPowerDb. One silent parity
 * (±∞ dB) gives ±1.
 */
export function predictedHalfWaveCorrelation(oddEvenDb: number): number {
  if (Number.isNaN(oddEvenDb)) throw new RangeError('oddEvenDb must be a number, got NaN');
  if (oddEvenDb === Infinity) return 1;
  if (oddEvenDb === -Infinity) return -1;
  const ratio = 10 ** (oddEvenDb / 10);
  return (ratio - 1) / (ratio + 1);
}

/** The interval from `from` to `to` (Hz) in cents: 1 200 log₂(to/from); an octave is 1 200. */
export function cents(from: number, to: number): number {
  requirePositive('from', from);
  requirePositive('to', to);
  return 1200 * Math.log2(to / from);
}

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

/** Chromium's table sizes by sample rate (periodic_wave_handler.cc L42-L54, tag 160.0.8168.1). */
const CHROMIUM_TABLE_SIZES = [
  { upTo: 24000, size: 2048 },
  { upTo: 88200, size: 4096 },
  { upTo: Infinity, size: 16384 },
] as const;
const CHROMIUM_BANDS_PER_OCTAVE = 3;
const FLOAT_BYTES = 4;

/**
 * The memory one PeriodicWave takes in Chromium (cálculo propio with its constants): a table of
 * `tableSize` floats per range, round(3 log₂ tableSize) ranges of a third of an octave (L80-L87),
 * so 36 × 4 096 × 4 B = 576 KiB at 44,1 or 48 kHz, whatever the recipe, the note or the duration.
 */
export function chromiumPeriodicWaveMemory(sampleRate: number): {
  tableSize: number;
  ranges: number;
  bytes: number;
} {
  requirePositive('sampleRate', sampleRate);
  const tableSize = CHROMIUM_TABLE_SIZES.find(({ upTo }) => sampleRate <= upTo)?.size ?? 0;
  const ranges = Math.round(CHROMIUM_BANDS_PER_OCTAVE * Math.log2(tableSize));
  return { tableSize, ranges, bytes: ranges * tableSize * FLOAT_BYTES };
}
