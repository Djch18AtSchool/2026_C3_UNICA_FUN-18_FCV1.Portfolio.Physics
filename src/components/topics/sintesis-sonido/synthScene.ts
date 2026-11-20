/**
 * The additive synthesiser of Tema 11 (research §7), as pure state: ten harmonics with amplitudes
 * A_n (relative to the A₁ = 1 of every preset) and phases φ_n, played at f₁ as one PeriodicWave
 * (11.4, 11.5), and the waveform and spectrum drawn from that same recipe. Every change returns a
 * new state. What sounds drops the harmonics above Nyquist (11.9) and, with «Fases aleatorias»,
 * swaps the recipe's phases for a seeded draw.
 */
import { MS_PER_S } from '../../../lib/data/instrumentSamples';
import {
  maxHarmonicBelowNyquist,
  oddEvenPowerDb,
  pearson,
  synthesize,
} from '../../../lib/physics/harmonics';
import { seededRandom } from '../../../lib/random';
import {
  halfWaveSeries,
  RECIPE_F1,
  WAVEFORM_AXES,
  type SpectrumBar,
  type WaveformData,
} from './soundPlots';
import { HARMONIC_COUNT, SYNTH_PRESETS, type SynthRecipe } from './synthPresets';

export { HARMONIC_COUNT, SYNTH_PRESETS, type SynthPreset, type SynthRecipe } from './synthPresets';

interface Grid {
  min: number;
  max: number;
  step: number;
}

/** 0 to 1,6 by 0,01: the flute's measured A₂/A₁ is 1,54, above the 1,5 the research proposed. */
export const AMPLITUDE_RANGE = { min: 0, max: 1.6, step: 0.01 } as const;
/** La2 to la5, by 0,1 Hz: the recordings' 310,1 Hz is on the grid. */
export const F1_RANGE = { min: 110, max: 880, step: 0.1 } as const;
/** Illustrative rates, from telephone audio to 48 kHz; 44,1 kHz is the MIS recordings' own. */
export const SAMPLE_RATES = [8000, 16000, 22050, 44100, 48000] as const;
export const DEFAULT_SAMPLE_RATE = 44100;
/** The cursor runs over the waveform's shared axis (ms). */
export const CURSOR_RANGE = { min: 0, max: WAVEFORM_AXES.xDomain.max } as const;
const DEFAULT_CURSOR_MS = 1;
/** Points per period of the drawn waveform: even, so half a period is a whole number of points. */
const SAMPLES_PER_PERIOD = 120;
/** The peak is sought on a finer grid that holds every drawn point. */
const PEAK_SAMPLES = 4 * SAMPLES_PER_PERIOD;
const TWO_PI = 2 * Math.PI;

const decimalsOf = (step: number) => Math.max(0, -Math.floor(Math.log10(step)));

function requireNumber(name: string, value: number): void {
  if (!Number.isFinite(value))
    throw new RangeError(`${name} must be a finite number, got ${value}`);
}

/** The grid point min + k·step nearest to value, inside [min, max], without float residue. */
function snap(value: number, { min, max, step }: Grid): number {
  const clamped = Math.min(max, Math.max(min, value));
  const k = Math.round((clamped - min) / step);
  return Number((min + k * step).toFixed(decimalsOf(step)));
}

/** The clarinet's measured f₁ (310,10 Hz) on the slider's grid. */
export const DEFAULT_F1 = snap(RECIPE_F1, F1_RANGE);

/** Everything the lab draws and plays from. */
export interface SynthState extends SynthRecipe {
  f1: number;
  /** f_s of the AudioContext, Hz: one of SAMPLE_RATES. */
  sampleRate: number;
  /** «Fases aleatorias»: play the draw `phaseDraw` instead of the recipe's own phases. */
  randomPhases: boolean;
  /** How many times the random phases were switched on: each time is a new seeded draw. */
  phaseDraw: number;
  /** The waveform's cursor, ms. */
  cursorMs: number;
}

const clarinet = SYNTH_PRESETS.find(({ id }) => id === 'clarinete');
if (!clarinet) throw new Error('synthScene: falta el preajuste del clarinete');

export const INITIAL_SYNTH_STATE: Readonly<SynthState> = {
  ...clarinet.values,
  f1: DEFAULT_F1,
  sampleRate: DEFAULT_SAMPLE_RATE,
  randomPhases: false,
  phaseDraw: 0,
  cursorMs: DEFAULT_CURSOR_MS,
};

const sameValues = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

/** The preset whose amplitudes and phases the state holds untouched; f₁ and f_s are the note. */
export function presetIdFor(state: SynthRecipe): string | undefined {
  return SYNTH_PRESETS.find(
    ({ values }) =>
      sameValues(values.amplitudes, state.amplitudes) && sameValues(values.phases, state.phases),
  )?.id;
}

/** A preset's recipe; f₁, f_s, the random phases and the cursor stay. */
export function withPreset(state: SynthState, recipe: SynthRecipe): SynthState {
  return { ...state, amplitudes: [...recipe.amplitudes], phases: [...recipe.phases] };
}

/** A_n of harmonic n = 1…10, snapped to the slider's grid and clamped to it. */
export function setAmplitude(state: SynthState, n: number, value: number): SynthState {
  if (!Number.isInteger(n) || n < 1 || n > HARMONIC_COUNT) {
    throw new RangeError(`n must be a harmonic from 1 to ${HARMONIC_COUNT}, got ${n}`);
  }
  requireNumber('A_n', value);
  const next = snap(value, AMPLITUDE_RANGE);
  return { ...state, amplitudes: state.amplitudes.map((a, i) => (i === n - 1 ? next : a)) };
}

export function setF1(state: SynthState, f1: number): SynthState {
  requireNumber('f1', f1);
  return { ...state, f1: snap(f1, F1_RANGE) };
}

export function setSampleRate(state: SynthState, sampleRate: number): SynthState {
  if (!(SAMPLE_RATES as readonly number[]).includes(sampleRate)) {
    throw new RangeError(`sampleRate must be one of ${SAMPLE_RATES.join(', ')}, got ${sampleRate}`);
  }
  return { ...state, sampleRate };
}

/** On: a new seeded draw (the next count); already on, the same state. Off: the recipe's phases. */
export function setRandomPhases(state: SynthState, isOn: boolean): SynthState {
  if (isOn === state.randomPhases) return state;
  return isOn
    ? { ...state, randomPhases: true, phaseDraw: state.phaseDraw + 1 }
    : { ...state, randomPhases: false };
}

export function setCursor(state: SynthState, cursorMs: number): SynthState {
  requireNumber('cursorMs', cursorMs);
  return { ...state, cursorMs: Math.min(CURSOR_RANGE.max, Math.max(CURSOR_RANGE.min, cursorMs)) };
}

/**
 * Seed of draw k is PHASE_SEED + k. Draws are fixed, so the server, the browser and the tests see
 * the same phases; with this offset the first four (seeds 8 to 11) all change the clarinet's shape
 * visibly, correlation < 0,9 with both its measured and its zero phases (synthScene.test.ts),
 * while seed 1 left its 3rd harmonic almost in phase (0,99).
 */
const PHASE_SEED = 7;

/** Draw number `draw`: φ₁ = 0 (the time origin) and φ₂…φ₁₀ uniform in [0, 2π), seeded. */
export function randomPhases(draw: number, count = HARMONIC_COUNT): number[] {
  const random = seededRandom(PHASE_SEED + draw);
  return Array.from({ length: count }, (_, i) => (i === 0 ? 0 : TWO_PI * random()));
}

/** Equation (11.9) for the lab's ten harmonics: how many have n f₁ ≤ f_s/2. */
export function audibleCount(f1: number, sampleRate: number): number {
  return Math.min(HARMONIC_COUNT, maxHarmonicBelowNyquist(f1, sampleRate));
}

/** What the oscillator plays: no harmonic above Nyquist, and the random phases when they are on. */
export function soundingRecipe(state: SynthState): SynthRecipe {
  const count = audibleCount(state.f1, state.sampleRate);
  return {
    amplitudes: state.amplitudes.map((a, i) => (i < count ? a : 0)),
    phases: state.randomPhases ? randomPhases(state.phaseDraw) : [...state.phases],
  };
}

/** (11.4) at f₁ = 1, so t is in periods. */
const atPeriods = ({ amplitudes, phases }: SynthRecipe, t: number) =>
  synthesize(amplitudes, phases, 1, t);

/** The largest |y| over one period: PeriodicWave normalizes to it (§1.28.5), and so does the plot. */
function recipePeak(recipe: SynthRecipe): number {
  return Array.from({ length: PEAK_SAMPLES }, (_, i) =>
    Math.abs(atPeriods(recipe, i / PEAK_SAMPLES)),
  ).reduce((peak, y) => Math.max(peak, y), 0);
}

/**
 * The recipe at f₁ over the topic's shared waveform axis (0–13 ms, whatever f₁), scaled to peak 1,
 * with −y(t + T/2) at the same instants (11.6). A silent recipe is a flat line.
 */
export function synthWaveform(recipe: SynthRecipe, f1: number): WaveformData {
  const periods = (WAVEFORM_AXES.xDomain.max * f1) / MS_PER_S;
  const half = SAMPLES_PER_PERIOD / 2;
  const count = Math.floor(periods * SAMPLES_PER_PERIOD) + half + 2;
  const peak = recipePeak(recipe);
  const y = Array.from({ length: count }, (_, i) =>
    peak === 0 ? 0 : atPeriods(recipe, i / SAMPLES_PER_PERIOD) / peak,
  );
  return halfWaveSeries(y, SAMPLES_PER_PERIOD * f1, f1, periods);
}

/** y(t) and −y(t + T/2) at the cursor, on the drawn (peak 1) scale. */
export function waveformAt(
  recipe: SynthRecipe,
  f1: number,
  tMs: number,
): { y: number; shifted: number } {
  const peak = recipePeak(recipe);
  if (peak === 0) return { y: 0, shifted: 0 };
  const t = (tMs * f1) / MS_PER_S;
  return { y: atPeriods(recipe, t) / peak, shifted: -atPeriods(recipe, t + 0.5) / peak };
}

/** Pearson correlation of two recipes' waveforms over one period. */
export function waveformCorrelation(a: SynthRecipe, b: SynthRecipe): number {
  const series = (recipe: SynthRecipe) =>
    Array.from({ length: SAMPLES_PER_PERIOD }, (_, i) => atPeriods(recipe, i / SAMPLES_PER_PERIOD));
  return pearson(series(a), series(b));
}

/** The level of each harmonic, 20 log₁₀ A_n (A_n/A₁ in dB while A₁ = 1); −∞ for a silent one. */
export function synthSpectrum(amplitudes: readonly number[]): SpectrumBar[] {
  return amplitudes.map((a, i) => ({ n: i + 1, db: 20 * Math.log10(a), isOdd: i % 2 === 0 }));
}

/** The strongest harmonic n (the lowest on a tie); NaN when nothing sounds. */
function strongestHarmonic(amplitudes: readonly number[]): number {
  const strongest = Math.max(...amplitudes);
  return strongest > 0 ? amplitudes.indexOf(strongest) + 1 : Number.NaN;
}

export interface SynthReadings {
  f1: number;
  periodMs: number;
  /** Odd over even power, n ≤ 10, dB: ±∞ with one parity silent, NaN with none sounding. */
  oddEvenDb: number;
  strongest: number;
}

/** The readouts, of what sounds (no harmonic above Nyquist). */
export function synthReadings(state: SynthState): SynthReadings {
  const { amplitudes } = soundingRecipe(state);
  return {
    f1: state.f1,
    periodMs: MS_PER_S / state.f1,
    oddEvenDb: oddEvenPowerDb(amplitudes),
    strongest: strongestHarmonic(amplitudes),
  };
}
