/**
 * The models of Tema 12's laboratory, one per mode, built on the core (src/lib/physics/resonance.ts)
 * and the sourced data (bridges.ts, klipper.ts):
 *
 * - «Barrido»: an oscillator of natural frequency f0 driven by F0 cos φ(t) whose frequency sweeps
 *   linearly from 0,5 f0 to 1,5 f0 over the run, as Klipper's resonance test sweeps its axes; the
 *   traced envelope against (12.3). Amplitudes relative to the static deflection F0/k.
 * - «Tropa»: N soldiers at the march pace (2,0 Hz) on a footbridge, in step (equal phases) or
 *   breaking step (seeded random phases), (12.5); the two runs side by side.
 * - «Filtro ZV»: one push against Klipper's two ZV impulses (12.6) designed at f_ZV with ζ = 0,1.
 *
 * Every run starts from rest and is read at the clock's time (resonanceRun.ts).
 */
import { MARCH_PACE_HZ, PEDESTRIAN_FORCES, SETRA_RANGES } from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import {
  resonanceGain,
  steadyAmplitude,
  zvShaper,
  type Oscillator,
} from '../../../lib/physics/resonance';
import { seededRandom } from '../../../lib/random';
import type { TransportMarker } from '../../lab/transportMarkers';
import { decayingEnvelopeAt, firstReach, simulate, traceUntil, type Run } from './resonanceRun';

export type ResonanceMode = 'barrido' | 'tropa' | 'filtro-zv';
export type StepChoice = 'al-paso' | 'rompiendo';
export type XY = { x: number; y: number };

const TWO_PI = 2 * Math.PI;
/** Float slack when a value set on a slider's grid is compared with a bound. */
const EPSILON = 1e-9;

/** An oscillator of mass m (kg), natural frequency f0 (Hz) and damping ratio ζ (12.1, 12.2). */
function oscillatorOf(m: number, f0: number, zeta: number): Oscillator {
  const omega0 = TWO_PI * f0;
  return { m, k: m * omega0 * omega0, b: 2 * zeta * m * omega0 };
}

/** A value on a drawing whose room is ±full: its share of the room, clamped, and whether it was. */
export function toDrawing(value: number, full: number): { fraction: number; isClamped: boolean } {
  const fraction = value / full;
  return { fraction: Math.min(Math.max(fraction, -1), 1), isClamped: Math.abs(fraction) > 1 };
}

// ---------------------------------------------------------------------------------------------
// «Barrido»

export interface SweepSettings {
  f0: number;
  zeta: number;
  /** Seconds the sweep takes, T_b. */
  sweepS: number;
}

/** The sweep's drive, as a share of f0: from 0,5 to 1,5. */
export const SWEEP_RANGE = { start: 0.5, end: 1.5 } as const;
const SWEEP_SPAN = SWEEP_RANGE.end - SWEEP_RANGE.start;
/**
 * My slow-sweep rule (cálculo propio, simulated with this integrator for ζ from 0,05 to 0,3): with
 * T_b ≥ 4/(ζ² f0), each peak of the trace past the start lies within 5 % of (12.3), about 4 %
 * worst, just after resonance. In rate, f0/T_b ≤ ζ² f0²/4.
 */
export const SLOW_SWEEP_FACTOR = 4;
/** What the rule guarantees: every traced peak past the start within 5 % of (12.3). */
export const SLOW_SWEEP_ERROR = 0.05;
/** The longest playback a sweep takes at 1×, in s: the time scale grows by powers of two. */
export const SWEEP_PLAYBACK_S = 60;
/** Steps per natural period: the integrator's error stays near 1 % (it is first order). */
const SWEEP_STEPS_PER_PERIOD = 150;
const SWEEP_SAMPLE_EVERY = 5;
const CURVE_SAMPLES = 400;
const TRACE_POINTS = 400;
/** The plot's top over the highest finite value drawn. */
const PLOT_HEADROOM = 1.2;
/** A curve that grows without limit is clamped this far above the plot's top (it is clipped). */
const CURVE_CLAMP = 2;

/** T_b of the slow-sweep rule, 4/(ζ² f0); never slow enough without damping (Infinity). */
export function slowSweepSeconds(zeta: number, f0: number): number {
  return zeta > 0 ? SLOW_SWEEP_FACTOR / (zeta * zeta * f0) : Number.POSITIVE_INFINITY;
}

/** The power of two that plays a sweep of `sweepS` seconds in at most SWEEP_PLAYBACK_S. */
export function sweepTimeScale(sweepS: number): number {
  return 2 ** Math.max(0, Math.ceil(Math.log2(sweepS / SWEEP_PLAYBACK_S) - EPSILON));
}

export interface SweepModel {
  settings: SweepSettings;
  duration: number;
  timeScale: number;
  run: Run;
  /** ω_d/ω0 at time t of the run. */
  ratioAt(t: number): number;
  driveHzAt(t: number): number;
  /** The force's share of F0 at time t, cos φ(t). */
  forceShareAt(t: number): number;
  /** (12.3) over the sweep, relative to F0/k, clamped above the plot (finite everywhere). */
  curve: XY[];
  yMax: number;
  /** A(ω0)/(F0/k) = 1/(2ζ): Infinity without damping. */
  peakGain: number;
  slowSeconds: number;
  isSlow: boolean;
  resonanceTime: number;
  peakTime: number;
  /** The traced envelope up to time t, as (ω_d/ω0, A/(F0/k)). */
  trace(t: number): XY[];
  markers: TransportMarker[];
}

export function sweepModel(settings: SweepSettings): SweepModel {
  const { f0, zeta, sweepS } = settings;
  const oscillator = oscillatorOf(1, f0, zeta);
  const F0 = oscillator.k;
  const ratioAt = (t: number) =>
    SWEEP_RANGE.start + (SWEEP_SPAN * Math.min(Math.max(t, 0), sweepS)) / sweepS;
  const phase = (t: number) =>
    TWO_PI * f0 * (SWEEP_RANGE.start * t + (SWEEP_SPAN * t * t) / (2 * sweepS));
  const run = simulate({
    oscillator,
    force: (t) => F0 * Math.cos(phase(t)),
    duration: sweepS,
    dt: 1 / (SWEEP_STEPS_PER_PERIOD * f0),
    sampleEvery: SWEEP_SAMPLE_EVERY,
  });
  const raw = Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => {
    const x = SWEEP_RANGE.start + (SWEEP_SPAN * i) / CURVE_SAMPLES;
    return { x, y: steadyAmplitude(oscillator, F0, TWO_PI * f0 * x) };
  });
  const peakGain = resonanceGain(zeta);
  const curveMax = Number.isFinite(peakGain) ? Math.max(...raw.map((point) => point.y)) : 0;
  const yMax = PLOT_HEADROOM * Math.max(curveMax, run.maxPeak);
  const peakIndex = run.peakA.indexOf(run.maxPeak);
  const peakTime = peakIndex < 0 ? 0 : run.peakT[peakIndex];
  const resonanceTime = ((1 - SWEEP_RANGE.start) / SWEEP_SPAN) * sweepS;
  const slowSeconds = slowSweepSeconds(zeta, f0);
  return {
    settings,
    duration: sweepS,
    timeScale: sweepTimeScale(sweepS),
    run,
    ratioAt,
    driveHzAt: (t) => f0 * ratioAt(t),
    forceShareAt: (t) => Math.cos(phase(t)),
    curve: raw.map(({ x, y }) => ({ x, y: Math.min(y, CURVE_CLAMP * yMax) })),
    yMax,
    peakGain,
    slowSeconds,
    isSlow: sweepS >= slowSeconds - EPSILON,
    resonanceTime,
    peakTime,
    trace: (t) =>
      traceUntil(run, t, TRACE_POINTS).map(({ t: at, a }) => ({ x: ratioAt(at), y: a })),
    markers: [
      { t: resonanceTime, label: 'Paso por la resonancia' },
      { t: peakTime, label: 'Pico de la envolvente', kind: 'peak' },
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// «Tropa»

export interface TroopSettings {
  n: number;
  f0: number;
  zeta: number;
  step: StepChoice;
  /** The seed of the breaking-step phases («Nuevo sorteo» draws another). */
  seed: number;
}

/** Modal mass of the footbridge (ilustrativo: no source gives Broughton's). */
export const TROOP_MODAL_MASS_KG = 40_000;
/** Each soldier's vertical force amplitude: Sétra's 0,4 G₀ with G₀ = 700 N (bridges.ts). */
export const SOLDIER_FORCE_N = PEDESTRIAN_FORCES.verticalN.value;
/** The run lasts four time constants τ = 1/(ζ ω0), within these bounds (s). */
export const TROOP_DURATION_LIMITS = { min: 30, max: 240 } as const;
const TROOP_TIME_CONSTANTS = 4;
const TROOP_DURATION_STEP = 10;
const TROOP_STEPS_PER_PERIOD = 100;
const TROOP_SAMPLE_EVERY = 4;
/** 90 % of the steady amplitude: the event the transport marks. */
export const REACH_SHARE = 0.9;
const PERCENT = 100;

/** N phases (rad) uniform in [0, 2π) from `seed`: the same draw on the server and the browser. */
export function troopPhases(n: number, seed: number): number[] {
  const random = seededRandom(seed);
  return Array.from({ length: n }, () => TWO_PI * random());
}

export interface TroopForcing {
  settings: TroopSettings;
  phases: number[];
  /** |Σ e^{iφ_i}| and its argument: breaking step, the troop pushes as |Σ| soldiers. */
  sumAmplitude: number;
  sumPhase: number;
  /** Force amplitudes (N). */
  forces: { inStep: number; breaking: number };
  /** Steady amplitudes of (12.3), m: Infinity without damping at the pace. */
  steady: { inStep: number; breaking: number };
  /** In-step over breaking-step amplitude for this draw, N/|Σ|, and its rms over draws, √N. */
  ratio: number;
  rmsRatio: number;
  isInSetraRange: boolean;
}

/** Everything of «Tropa» that needs no run: cheap, for a thousand draws. */
export function troopForcing(settings: TroopSettings): TroopForcing {
  const { n, f0, zeta, seed } = settings;
  const phases = troopPhases(n, seed);
  const re = phases.reduce((sum, phase) => sum + Math.cos(phase), 0);
  const im = phases.reduce((sum, phase) => sum + Math.sin(phase), 0);
  const sumAmplitude = Math.hypot(re, im);
  const oscillator = oscillatorOf(TROOP_MODAL_MASS_KG, f0, zeta);
  const omega = TWO_PI * MARCH_PACE_HZ;
  const forces = { inStep: n * SOLDIER_FORCE_N, breaking: sumAmplitude * SOLDIER_FORCE_N };
  const { min, max } = SETRA_RANGES.vertical;
  return {
    settings,
    phases,
    sumAmplitude,
    sumPhase: Math.atan2(im, re),
    forces,
    steady: {
      inStep: steadyAmplitude(oscillator, forces.inStep, omega),
      breaking: steadyAmplitude(oscillator, forces.breaking, omega),
    },
    ratio: n / Math.max(sumAmplitude, Number.EPSILON),
    rmsRatio: Math.sqrt(n),
    isInSetraRange: f0 >= min - EPSILON && f0 <= max + EPSILON,
  };
}

/** Four time constants of the footbridge, rounded up to 10 s, within TROOP_DURATION_LIMITS. */
function troopDuration(f0: number, zeta: number): number {
  const tau = zeta > 0 ? 1 / (zeta * TWO_PI * f0) : Number.POSITIVE_INFINITY;
  const rounded = Math.ceil((TROOP_TIME_CONSTANTS * tau) / TROOP_DURATION_STEP);
  const seconds = rounded * TROOP_DURATION_STEP;
  return Math.min(Math.max(seconds, TROOP_DURATION_LIMITS.min), TROOP_DURATION_LIMITS.max);
}

export interface TroopModel extends TroopForcing {
  duration: number;
  runs: { inStep: Run; breaking: Run };
  /** When each envelope first reaches 90 % of its steady amplitude, if it does. */
  reach90: { inStep?: number; breaking?: number };
  markers: TransportMarker[];
}

export function troopModel(settings: TroopSettings): TroopModel {
  const forcing = troopForcing(settings);
  const { f0, zeta, step } = settings;
  const duration = troopDuration(f0, zeta);
  const oscillator = oscillatorOf(TROOP_MODAL_MASS_KG, f0, zeta);
  const omega = TWO_PI * MARCH_PACE_HZ;
  const dt = 1 / (TROOP_STEPS_PER_PERIOD * Math.max(f0, MARCH_PACE_HZ));
  const runOf = (amplitude: number, phase: number) =>
    simulate({
      oscillator,
      force: (t) => amplitude * Math.cos(omega * t + phase),
      duration,
      dt,
      sampleEvery: TROOP_SAMPLE_EVERY,
    });
  const runs = {
    inStep: runOf(forcing.forces.inStep, 0),
    breaking: runOf(forcing.forces.breaking, forcing.sumPhase),
  };
  const reach90 = {
    inStep: firstReach(runs.inStep, REACH_SHARE * forcing.steady.inStep),
    breaking: firstReach(runs.breaking, REACH_SHARE * forcing.steady.breaking),
  };
  const reach = step === 'al-paso' ? reach90.inStep : reach90.breaking;
  return {
    ...forcing,
    duration,
    runs,
    reach90,
    markers:
      reach === undefined
        ? []
        : [{ t: reach, label: `${REACH_SHARE * PERCENT} % de la amplitud estacionaria` }],
  };
}

// ---------------------------------------------------------------------------------------------
// «Filtro ZV»

export interface ZvSettings {
  /** The structure's natural frequency f0 (Hz) and damping ratio ζ. */
  f0: number;
  zeta: number;
  /** The frequency the filter was designed for, f_ZV (Hz): Klipper's measured one. */
  fZv: number;
}

/** Klipper designs every shaper with ζ = 0,1, «usually unknown» (shaper_defs.py L9). */
export const ZV_DESIGN_ZETA = KLIPPER.defaultDampingRatio.value;
const ZV_RESIDUAL_PERIODS = 6;
const ZV_STEPS_PER_PERIOD = 200;
const ZV_SAMPLE_EVERY = 4;
/** The residual is measured this many natural periods after the second impulse. */
const ZV_MEASURE_PERIODS = 2;

type Shaper = ReturnType<typeof zvShaper>;

/**
 * Residual vibration of a shaper on an oscillator of f0 (Hz) and ζ, as Klipper estimates it
 * (klippy/extras/shaper_calibrate.py `_estimate_shaper`, L186-L198, research §3.4): with
 * W_i = a_i e^{−ζω0 (t_n − t_i)}, V = √((Σ W_i sin ω′t_i)² + (Σ W_i cos ω′t_i)²) / Σ a_i and
 * ω′ = ω0 √(1 − ζ²). It compares the vibration the impulses leave with that of one whole push
 * given at the last impulse, t_n, so it never passes 1; against a push at t = 0, as the plot draws
 * them side by side, the ratio is V e^{ζω0 t_n} (cálculo propio, by superposition).
 */
export function zvResidual(f0: number, zeta: number, { amplitudes, times }: Shaper): number {
  const omega0 = TWO_PI * f0;
  const omegaPrime = omega0 * Math.sqrt(1 - zeta * zeta);
  const last = times[times.length - 1];
  let sine = 0;
  let cosine = 0;
  amplitudes.forEach((a, i) => {
    const weight = a * Math.exp(-zeta * omega0 * (last - times[i]));
    sine += weight * Math.sin(omegaPrime * times[i]);
    cosine += weight * Math.cos(omegaPrime * times[i]);
  });
  return Math.hypot(sine, cosine) / amplitudes.reduce((sum, a) => sum + a, 0);
}

export interface ZvModel {
  settings: ZvSettings;
  shaper: Shaper;
  secondImpulse: number;
  duration: number;
  /** x in units of one push's amplitude, J/(m ω′). */
  runs: { single: Run; shaped: Run };
  /** Klipper's estimate of the residual vibration, a share of one push (zvResidual). */
  residual: number;
  /**
   * The same residual, read on the two runs: the shaped one two periods after the second impulse
   * against the single push as long after its own push, the push Klipper compares with.
   */
  simulatedResidual: number;
  /** f0/f_ZV − 1. */
  detuning: number;
  /** Within Klipper's ± 5 %, where ZV divides the vibration by 10. */
  isWithinTolerance: boolean;
  markers: TransportMarker[];
}

export function zvModel(settings: ZvSettings): ZvModel {
  const { f0, zeta, fZv } = settings;
  const shaper = zvShaper(fZv, ZV_DESIGN_ZETA);
  const [a1, a2] = shaper.amplitudes;
  const secondImpulse = shaper.times[1];
  const oscillator = oscillatorOf(1, f0, zeta);
  const J = TWO_PI * f0 * Math.sqrt(1 - zeta * zeta);
  // A step that lands exactly on the second impulse.
  const dt = secondImpulse / Math.ceil(secondImpulse * f0 * ZV_STEPS_PER_PERIOD);
  const duration = secondImpulse + ZV_RESIDUAL_PERIODS / f0;
  const runOf = (impulses: { t: number; J: number }[]) =>
    simulate({ oscillator, force: () => 0, duration, dt, impulses, sampleEvery: ZV_SAMPLE_EVERY });
  const runs = {
    single: runOf([{ t: 0, J }]),
    shaped: runOf([
      { t: 0, J: a1 * J },
      { t: secondImpulse, J: a2 * J },
    ]),
  };
  const measureAt = secondImpulse + ZV_MEASURE_PERIODS / f0;
  const detuning = f0 / fZv - 1;
  return {
    settings,
    shaper,
    secondImpulse,
    duration,
    runs,
    residual: zvResidual(f0, zeta, shaper),
    simulatedResidual:
      decayingEnvelopeAt(runs.shaped, measureAt) /
      decayingEnvelopeAt(runs.single, measureAt - secondImpulse),
    detuning,
    isWithinTolerance: Math.abs(detuning) <= KLIPPER.zvTolerance.value + EPSILON,
    markers: [{ t: secondImpulse, label: 'Segundo impulso' }],
  };
}
