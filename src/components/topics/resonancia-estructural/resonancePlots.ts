/**
 * Data of Tema 12's figures, built from the resonance core and the sourced bridge data
 * (docs/superpowers/research/2026-11-17-resonancia-estructural.md §4–§6): the free modes of the
 * Tacoma (Paso 1), the resonance curve (Paso 2), the troop's force (Paso 3), the self-excited
 * torsion (Paso 4) and my frame-by-frame measurement of the 1940 film.
 */
import { TACOMA, type TacomaTorsion } from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import { steadyAmplitude, troopForceAmplitude } from '../../../lib/physics/resonance';
import { requirePositive } from '../../../lib/physics/validate';
import { seededRandom } from '../../../lib/random';
import { CHART_COLORS } from '../../charts/chartTheme';

export type XY = { x: number; y: number };

/*
 * Colour carries meaning across the topic's figures, never series order: orange is energy that
 * builds up (the Tacoma torsion, the troop in step, ζ_net < 0, the least damped curve), green is
 * energy that leaves (breaking step, ζ_net > 0, the most damped curve) and blue the reference (the
 * vertical mode, Klipper's default ζ, the 5 s of 1940).
 */
export const BUILDS_UP_COLOR = CHART_COLORS[1];
export const DIES_OUT_COLOR = CHART_COLORS[2];
export const REFERENCE_COLOR = CHART_COLORS[0];
/** The film as the file plays it: an instrument's reading, not a physical result. */
export const RAW_COLOR = 'var(--fg-muted)';

const TWO_PI = 2 * Math.PI;
const SECONDS_PER_MINUTE = 60;
const N_PER_KN = 1000;
const range = <T>(count: number, at: (i: number) => T): T[] =>
  Array.from({ length: count }, (_, i) => at(i));

// ---------------------------------------------------------------------------------------------
// Paso 1: two natural frequencies of one bridge

/** 20 s: four turns of the torsion, about twelve of the vertical mode. */
const FREE_WINDOW_S = 20;
const FREE_SAMPLES = 800;

export interface FreeMode {
  cyclesPerMin: number;
  periodS: number;
  /** x(t)/A = cos(2π f t), released from its top at t = 0. */
  points: XY[];
}

function freeMode(cyclesPerMin: number): FreeMode {
  const f = cyclesPerMin / SECONDS_PER_MINUTE;
  return {
    cyclesPerMin,
    periodS: 1 / f,
    points: range(FREE_SAMPLES + 1, (i) => {
      const x = (FREE_WINDOW_S * i) / FREE_SAMPLES;
      return { x, y: Math.cos(TWO_PI * f * x) };
    }),
  };
}

/**
 * The two modes of 7 November 1940 (FWA 1941): the vertical one of 8 or 9 nodes at 37 cycles/min
 * just before the switch, and the one-node torsion at 12 cycles/min, the one that destroyed it.
 */
export function freeModes(): { vertical: FreeMode; torsion: FreeMode } {
  return {
    vertical: freeMode(TACOMA.verticalAtSwitchCyclesPerMin.value),
    torsion: freeMode(TACOMA.torsionCyclesPerMin.value),
  };
}

// ---------------------------------------------------------------------------------------------
// Paso 2: the resonance curve

/** The three ζ Klipper scores its shapers against (shaper_calibrate.py L14). */
export const CURVE_ZETAS = KLIPPER.testDampingRatios.values;
/** Least damped builds up (orange), Klipper's default is the reference, most damped green. */
export const CURVE_COLORS: Readonly<Record<number, string>> = {
  0.075: BUILDS_UP_COLOR,
  0.1: REFERENCE_COLOR,
  0.15: DIES_OUT_COLOR,
};
const CURVE_MAX_RATIO = 2;
/** An even count with a sample every 0,005: ω_d/ω0 = 1 is one of them. */
const CURVE_SAMPLES = 400;

/**
 * (12.3) over ω_d/ω0 from 0 to 2, divided by the static deflection F0/k: an oscillator with
 * m = 1, k = 1 (ω0 = 1) and b = 2ζ driven by F0 = 1, so each point is A/(F0/k) directly.
 */
export function resonanceCurve(zeta: number): XY[] {
  const oscillator = { m: 1, k: 1, b: 2 * zeta };
  return range(CURVE_SAMPLES + 1, (i) => {
    const x = (CURVE_MAX_RATIO * i) / CURVE_SAMPLES;
    return { x, y: steadyAmplitude(oscillator, 1, x) };
  });
}

// ---------------------------------------------------------------------------------------------
// Paso 3: N feet in step and breaking step

export interface TroopForces {
  /** |F| = N·F1, kN. */
  inStep: XY[];
  /** √N·F1, kN: the rms of the sum with random phases. */
  rms: XY[];
  /** One seeded draw of N random phases per N, kN. */
  draws: XY[];
}

/**
 * (12.5): the force amplitude of N people of amplitude F1 (N), every `step` people up to `maxN`,
 * in kN. The random phases come from `seed`, so the server and the browser draw the same points.
 */
export function troopForces({
  maxN,
  step,
  F1,
  seed,
}: {
  maxN: number;
  step: number;
  F1: number;
  seed: number;
}): TroopForces {
  requirePositive('step', step);
  if (!Number.isInteger(maxN / step)) {
    throw new RangeError(`step (${step}) must divide maxN (${maxN})`);
  }
  const counts = range(maxN / step + 1, (i) => i * step);
  const random = seededRandom(seed);
  return {
    inStep: counts.map((n) => ({ x: n, y: (n * F1) / N_PER_KN })),
    rms: counts.map((n) => ({ x: n, y: (Math.sqrt(n) * F1) / N_PER_KN })),
    draws: counts
      .filter((n) => n > 0)
      .map((n) => {
        const phases = range(n, () => TWO_PI * random());
        return { x: n, y: troopForceAmplitude(F1, phases) / N_PER_KN };
      }),
  };
}

// ---------------------------------------------------------------------------------------------
// Paso 4: self-excitation

/** 60 samples per period at 0,2 Hz over a minute. */
const SELF_SAMPLES = 720;

export interface SelfExcited {
  /** θ/θ0 = e^{−ζ_net ω0 t} cos(ω′ t). */
  points: XY[];
  /** e^{−ζ_net ω0 t}. */
  envelope: XY[];
  at(t: number): number;
}

/**
 * The solution of (12.10) released from θ0 at rest-free start, θ/θ0 = e^{−ζ_net ω0 t} cos(ω′ t)
 * with ω′ = ω0 √(1 − ζ_net²) (the ω′ of Módulo 5), from 0 to `tEnd` s, f0 in Hz.
 */
export function selfExcited(zetaNet: number, f0: number, tEnd: number): SelfExcited {
  const omega0 = TWO_PI * f0;
  const omegaPrime = omega0 * Math.sqrt(1 - zetaNet * zetaNet);
  const grow = (t: number) => Math.exp(-zetaNet * omega0 * t);
  const at = (t: number) => grow(t) * Math.cos(omegaPrime * t);
  const times = range(SELF_SAMPLES + 1, (i) => (tEnd * i) / SELF_SAMPLES);
  return {
    points: times.map((x) => ({ x, y: at(x) })),
    envelope: times.map((x) => ({ x, y: grow(x) })),
    at,
  };
}

// ---------------------------------------------------------------------------------------------
// The film: my measurement against the 5 s of 1940

/** Least-squares y ≈ a cos(ωx) + b sin(ωx) + c for a fixed period. */
export interface SinusoidFit {
  amplitude: number;
  offset: number;
  at(x: number): number;
}

/** Determinant of a 3 × 3 matrix given by rows. */
const det3 = ([a, b, c]: number[][]) =>
  a[0] * (b[1] * c[2] - b[2] * c[1]) -
  a[1] * (b[0] * c[2] - b[2] * c[0]) +
  a[2] * (b[0] * c[1] - b[1] * c[0]);

/** Solves the 3 × 3 system M u = r by Cramer's rule. */
function solve3(matrix: number[][], rhs: number[]): number[] {
  const d = det3(matrix);
  return [0, 1, 2].map(
    (col) => det3(matrix.map((row, i) => row.map((v, j) => (j === col ? rhs[i] : v)))) / d,
  );
}

const MIN_FIT_POINTS = 3;

/** The sinusoid of period `period` closest to `points` (least squares on cos, sin and 1). */
export function fitSinusoid(points: readonly XY[], period: number): SinusoidFit {
  requirePositive('period', period);
  if (points.length < MIN_FIT_POINTS) {
    throw new RangeError(`a sinusoid needs ${MIN_FIT_POINTS} points, got ${points.length}`);
  }
  const omega = TWO_PI / period;
  const basis = (x: number) => [Math.cos(omega * x), Math.sin(omega * x), 1];
  const rows = points.map(({ x }) => basis(x));
  const normal = [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => rows.reduce((sum, row) => sum + row[i] * row[j], 0)),
  );
  const rhs = [0, 1, 2].map((i) => rows.reduce((sum, row, k) => sum + row[i] * points[k].y, 0));
  const [a, b, c] = solve3(normal, rhs);
  return {
    amplitude: Math.hypot(a, b),
    offset: c,
    at: (x) => a * Math.cos(omega * x) + b * Math.sin(omega * x) + c,
  };
}

/** R² of `model` on `points`: the share of their variance it explains (0 for a flat record). */
export function explainedVariance(points: readonly XY[], model: (x: number) => number): number {
  const mean = points.reduce((sum, { y }) => sum + y, 0) / points.length;
  const total = points.reduce((sum, { y }) => sum + (y - mean) ** 2, 0);
  if (total === 0) return 0;
  const residual = points.reduce((sum, { x, y }) => sum + (y - model(x)) ** 2, 0);
  return 1 - residual / total;
}

const FIT_SAMPLES = 240;

export interface MeasurementPlot {
  /** The series against the file's seconds, from its first frame. */
  video: XY[];
  /** The same samples against real seconds: video time × 24/16. */
  real: XY[];
  /** Farquharson's 12 cycles/min (5 s), fitted in amplitude and phase to `real`. */
  fit: XY[];
  stretch: number;
  periodVideoS: number;
  periodRealS: number;
  farquharsonPeriodS: number;
  /** R² of the 5 s sinusoid on the real axis and, fitted again, on the video axis. */
  fitFraction: number;
  videoFitFraction: number;
}

/** My measured series of shot `shotId`, on the film's clock and on the real one. */
export function measurementPlot(dataset: TacomaTorsion, shotId: string): MeasurementPlot {
  const shot = dataset.shots.find((candidate) => candidate.id === shotId);
  const series = dataset.series.find((candidate) => candidate.shotId === shotId);
  if (!shot || !series) throw new RangeError(`no measured shot "${shotId}"`);
  const stretch = dataset.videoFps / dataset.cameraFps;
  const farquharsonPeriodS = SECONDS_PER_MINUTE / TACOMA.torsionCyclesPerMin.value;
  const video = series.values.map((y, i) => ({ x: i / series.fps, y }));
  const real = video.map(({ x, y }) => ({ x: x * stretch, y }));
  const fitted = fitSinusoid(real, farquharsonPeriodS);
  const end = real.at(-1)?.x ?? 0;
  return {
    video,
    real,
    fit: range(FIT_SAMPLES + 1, (i) => {
      const x = (end * i) / FIT_SAMPLES;
      return { x, y: fitted.at(x) };
    }),
    stretch,
    periodVideoS: shot.periodVideoS,
    periodRealS: shot.periodVideoS * stretch,
    farquharsonPeriodS,
    fitFraction: explainedVariance(real, fitted.at),
    videoFitFraction: explainedVariance(video, fitSinusoid(video, farquharsonPeriodS).at),
  };
}
