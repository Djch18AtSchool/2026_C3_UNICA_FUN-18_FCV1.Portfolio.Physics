import { describe, expect, test } from 'vitest';
import { MARCH_PACE_HZ, PEDESTRIAN_FORCES } from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import { resonanceGain, steadyAmplitude, zvShaper } from '../../../lib/physics/resonance';
import { envelopeAt, firstReach } from './resonanceRun';
import {
  SLOW_SWEEP_ERROR,
  slowSweepSeconds,
  sweepModel,
  sweepTimeScale,
  SWEEP_RANGE,
  toDrawing,
  troopModel,
  troopPhases,
  TROOP_DURATION_LIMITS,
  troopForcing,
  zvModel,
  zvResidual,
  type SweepSettings,
  type TroopSettings,
} from './resonanceScene';

const TWO_PI = 2 * Math.PI;
const F1 = PEDESTRIAN_FORCES.verticalN.value;
const KLIPPER_ZETA = KLIPPER.defaultDampingRatio.value;

/** A sweep at the documented slow rate: T_b = 4/(ζ² f0). */
const slowSweep = (f0: number, zeta: number): SweepSettings => ({
  f0,
  zeta,
  sweepS: Math.ceil(slowSweepSeconds(zeta, f0) - 1e-9),
});

/** The largest relative gap between the traced peaks and (12.3), past the first tenth of the run. */
function worstError(settings: SweepSettings): number {
  const sweep = sweepModel(settings);
  const omega0 = TWO_PI * settings.f0;
  const oscillator = { m: 1, k: omega0 * omega0, b: 2 * settings.zeta * omega0 };
  const errors = sweep.run.peakT
    .map((t, i) => ({ t, a: sweep.run.peakA[i] }))
    .filter(({ t }) => t > sweep.duration / 10)
    .map(({ t, a }) => {
      const steady = steadyAmplitude(oscillator, oscillator.k, omega0 * sweep.ratioAt(t));
      return Math.abs(a - steady) / steady;
    });
  expect(errors.length).toBeGreaterThan(30);
  return Math.max(...errors);
}

const BROUGHTON: TroopSettings = {
  n: 60,
  f0: MARCH_PACE_HZ,
  zeta: 0.004,
  step: 'al-paso',
  seed: 1831,
};

describe('«Barrido»: the drive frequency sweeps across [0,5 f0; 1,5 f0] over the clock', () => {
  const model = sweepModel(slowSweep(1, KLIPPER_ZETA));

  test('linearly, from half f0 to one and a half f0, through f0 at half the run', () => {
    expect(SWEEP_RANGE).toEqual({ start: 0.5, end: 1.5 });
    expect(model.duration).toBe(400);
    expect(model.driveHzAt(0)).toBeCloseTo(0.5, 12);
    expect(model.driveHzAt(100)).toBeCloseTo(0.75, 12);
    expect(model.driveHzAt(200)).toBeCloseTo(1, 12);
    expect(model.driveHzAt(400)).toBeCloseTo(1.5, 12);
    expect(model.ratioAt(300)).toBeCloseTo(1.25, 12);
    expect(model.resonanceTime).toBe(200);
  });

  test.each([
    [1, 0.1],
    [1, 0.2],
    [2, 0.15],
  ])(
    'at the documented rate (f0 = %s Hz, ζ = %s) the traced envelope stays within 5 %% of (12.3)',
    (f0, zeta) => {
      // Arrange
      const settings = slowSweep(f0, zeta);

      // Act: every peak past the start's transient (the first tenth of the run).
      const worst = worstError(settings);

      // Assert
      expect(sweepModel(settings).isSlow).toBe(true);
      expect(worst).toBeLessThan(SLOW_SWEEP_ERROR);
    },
  );

  test('a sweep ten times faster misses (12.3) by far more: its peak short and late', () => {
    const settings = { f0: 1, zeta: KLIPPER_ZETA, sweepS: 40 };
    const fast = sweepModel(settings);

    expect(fast.isSlow).toBe(false);
    expect(worstError(settings)).toBeGreaterThan(0.2);
    expect(fast.run.maxPeak).toBeLessThan(0.97 * resonanceGain(KLIPPER_ZETA));
    expect(fast.peakTime).toBeGreaterThan(fast.resonanceTime);
  });

  test('changing ζ redraws the analytic curve, which peaks at 1/(2ζ) at ω_d = ω0', () => {
    const at = (zeta: number) => {
      const curve = sweepModel({ f0: 1, zeta, sweepS: 100 }).curve;
      return curve.find((point) => point.x === 1)?.y;
    };

    expect(at(0.1)).toBeCloseTo(resonanceGain(0.1), 9);
    expect(at(0.2)).toBeCloseTo(resonanceGain(0.2), 9);
    expect(sweepModel({ f0: 1, zeta: 0.1, sweepS: 100 }).curve).not.toEqual(
      sweepModel({ f0: 1, zeta: 0.2, sweepS: 100 }).curve,
    );
  });

  test('the plot reaches above both the curve and the trace', () => {
    expect(model.yMax).toBeGreaterThan(resonanceGain(KLIPPER_ZETA));
    expect(model.yMax).toBeGreaterThan(model.run.maxPeak);
  });

  test('marks the passage through resonance and the peak of the envelope', () => {
    expect(model.markers).toEqual([
      { t: 200, label: 'Paso por la resonancia' },
      { t: model.peakTime, label: 'Pico de la envolvente', kind: 'peak' },
    ]);
  });

  test('the trace follows the clock: no point after the time asked', () => {
    const early = model.trace(150);
    expect(early.length).toBeGreaterThan(10);
    expect(Math.max(...early.map((point) => point.x))).toBeLessThanOrEqual(model.ratioAt(150));
    expect(model.trace(model.duration).length).toBeGreaterThan(early.length);
  });
});

describe('«Barrido» without damping (Review Focus 3: ζ → 0 at exact resonance)', () => {
  const model = sweepModel({ f0: 1, zeta: 0, sweepS: 400 });

  test('(12.3) grows without limit, yet every number drawn or read stays finite', () => {
    expect(model.peakGain).toBe(Number.POSITIVE_INFINITY);
    expect(model.slowSeconds).toBe(Number.POSITIVE_INFINITY);
    expect(model.isSlow).toBe(false);
    expect(Number.isFinite(model.yMax)).toBe(true);
    for (const point of model.curve) expect(Number.isFinite(point.y)).toBe(true);
    // Clamped above the plot's top, so the curve leaves it at ω_d = ω0 instead of a NaN path.
    expect(model.curve.find((point) => point.x === 1)?.y).toBeGreaterThan(model.yMax);
    expect(Number.isFinite(model.run.maxPeak)).toBe(true);
    expect(model.trace(model.duration).every(({ y }) => Number.isFinite(y))).toBe(true);
  });

  test('crossing resonance in finite time leaves a finite envelope', () => {
    expect(model.run.maxPeak).toBeGreaterThan(resonanceGain(0.05));
    expect(model.run.maxPeak).toBeLessThan(model.yMax);
  });
});

describe('the slow-sweep rule and the time scale', () => {
  test('T_b = 4/(ζ² f0): 400 s for Klipper’s ζ = 0,1 at 1 Hz, never without damping', () => {
    expect(slowSweepSeconds(0.1, 1)).toBeCloseTo(400, 9);
    expect(slowSweepSeconds(0.2, 2)).toBeCloseTo(50, 9);
    expect(slowSweepSeconds(0, 1)).toBe(Number.POSITIVE_INFINITY);
  });

  test('a power of two that plays the sweep in at most a minute, real time when it fits', () => {
    expect(sweepTimeScale(40)).toBe(1);
    expect(sweepTimeScale(60)).toBe(1);
    expect(sweepTimeScale(100)).toBe(2);
    expect(sweepTimeScale(400)).toBe(8);
    expect(sweepTimeScale(1200)).toBe(32);
  });
});

describe('«Tropa»: N soldiers at 2,0 Hz, in step or breaking step', () => {
  test('in step the force is N F1; breaking step, |Σ e^{iφ}| F1 with seeded phases', () => {
    const inStep = troopModel(BROUGHTON);
    const breaking = troopModel({ ...BROUGHTON, step: 'rompiendo' });

    expect(inStep.forces.inStep).toBeCloseTo(60 * F1, 9);
    expect(breaking.forces.breaking).toBeCloseTo(F1 * breaking.sumAmplitude, 9);
    expect(breaking.sumAmplitude).toBeLessThan(60);
    expect(troopPhases(60, 1831)).toEqual(troopPhases(60, 1831));
    expect(troopPhases(60, 1832)).not.toEqual(troopPhases(60, 1831));
    // A larger troop keeps the soldiers it had: the first phases do not change.
    expect(troopPhases(80, 1831).slice(0, 60)).toEqual(troopPhases(60, 1831));
  });

  test('the in-step amplitude over the rms of the breaking-step amplitudes is ≈ √N', () => {
    const DRAWS = 2000;
    for (const n of [10, 60, 200]) {
      const settings = { ...BROUGHTON, n };
      const inStep = troopForcing(settings).steady.inStep;
      let squares = 0;
      for (let seed = 1; seed <= DRAWS; seed++) {
        const amplitude = troopForcing({ ...settings, step: 'rompiendo', seed }).steady.breaking;
        squares += amplitude * amplitude;
      }
      const ratio = inStep / Math.sqrt(squares / DRAWS);
      expect(Math.abs(ratio / Math.sqrt(n) - 1), `N = ${n}`).toBeLessThan(0.05);
    }
  });

  test('simulated, the two envelopes end in the ratio N/|Σ e^{iφ}| of this draw', () => {
    const model = troopModel(BROUGHTON);
    const end = model.duration;
    const ratio = envelopeAt(model.runs.inStep, end) / envelopeAt(model.runs.breaking, end);

    expect(ratio / model.ratio).toBeCloseTo(1, 1);
    expect(model.rmsRatio).toBeCloseTo(Math.sqrt(60), 12);
  });

  test('marks when the bridge reaches 90 % of its steady amplitude, ≈ τ ln 10 at resonance', () => {
    const model = troopModel(BROUGHTON);
    const tau = 1 / (0.004 * TWO_PI * MARCH_PACE_HZ);
    const reach = model.reach90.inStep as number;

    expect(reach / (tau * Math.LN10)).toBeCloseTo(1, 1);
    expect(reach).toBe(firstReach(model.runs.inStep, 0.9 * model.steady.inStep));
    expect(model.markers).toEqual([{ t: reach, label: '90 % de la amplitud estacionaria' }]);
    const breaking = troopModel({ ...BROUGHTON, step: 'rompiendo' });
    expect(breaking.markers).toEqual([
      { t: breaking.reach90.breaking, label: '90 % de la amplitud estacionaria' },
    ]);
  });

  test('f0 inside or outside Sétra’s range 1 (1,7–2,1 Hz), and far smaller outside', () => {
    expect(troopModel(BROUGHTON).isInSetraRange).toBe(true);
    expect(troopModel({ ...BROUGHTON, f0: 1.7 }).isInSetraRange).toBe(true);
    expect(troopModel({ ...BROUGHTON, f0: 2.5 }).isInSetraRange).toBe(false);
    expect(troopModel({ ...BROUGHTON, f0: 1.65 }).isInSetraRange).toBe(false);
    expect(troopModel({ ...BROUGHTON, f0: 2.5 }).steady.inStep).toBeLessThan(
      troopModel(BROUGHTON).steady.inStep / 20,
    );
  });

  test('runs about four time constants, within its limits', () => {
    expect(troopModel(BROUGHTON).duration).toBe(80);
    expect(troopModel({ ...BROUGHTON, zeta: 0.05 }).duration).toBe(TROOP_DURATION_LIMITS.min);
    expect(troopModel({ ...BROUGHTON, zeta: 0.001 }).duration).toBe(TROOP_DURATION_LIMITS.max);
  });
});

describe('«Tropa» without damping at the march pace (Review Focus 3)', () => {
  const model = troopModel({ ...BROUGHTON, zeta: 0 });

  test('no steady amplitude: it grows without limit, with no 90 % mark and finite readings', () => {
    expect(model.steady.inStep).toBe(Number.POSITIVE_INFINITY);
    expect(model.reach90.inStep).toBeUndefined();
    expect(model.markers).toEqual([]);
    expect(Number.isFinite(model.runs.inStep.maxPeak)).toBe(true);
    expect(Number.isFinite(model.ratio)).toBe(true);
    expect(model.duration).toBe(TROOP_DURATION_LIMITS.max);
  });

  test('the drawing clamps it to its edge', () => {
    expect(toDrawing(model.runs.inStep.maxPeak, 0.5)).toEqual({ fraction: 1, isClamped: true });
    expect(toDrawing(Number.POSITIVE_INFINITY, 0.5)).toEqual({ fraction: 1, isClamped: true });
    expect(toDrawing(-0.25, 0.5)).toEqual({ fraction: -0.5, isClamped: false });
  });
});

describe('«Filtro ZV»: one push against Klipper’s two impulses', () => {
  const tuned = zvModel({ f0: 1, zeta: KLIPPER_ZETA, fZv: 1 });

  test('the filter is Klipper’s ZV at the design frequency, with its ζ = 0,1', () => {
    expect(tuned.shaper).toEqual(zvShaper(1, KLIPPER_ZETA));
    expect(tuned.secondImpulse).toBe(tuned.shaper.times[1]);
    expect(tuned.markers).toEqual([{ t: tuned.secondImpulse, label: 'Segundo impulso' }]);
  });

  test('at the design frequency, the vibration after the second impulse is < 1 % of one push', () => {
    expect(tuned.residual).toBeLessThan(1e-9);
    expect(tuned.simulatedResidual).toBeLessThan(0.01);
    expect(tuned.isWithinTolerance).toBe(true);
  });

  test('off by ±10 % it grows past Klipper’s ×10 reduction, which holds within ±5 %', () => {
    const residualAt = (ratio: number) => zvModel({ f0: ratio, zeta: KLIPPER_ZETA, fZv: 1 });
    for (const ratio of [0.9, 1.1]) {
      const off = residualAt(ratio);
      expect(off.residual).toBeGreaterThan(0.1);
      expect(off.isWithinTolerance).toBe(false);
      expect(Math.abs(off.simulatedResidual - off.residual)).toBeLessThan(0.01);
    }
    for (const ratio of [0.95, 1.05]) {
      expect(residualAt(ratio).residual).toBeLessThan(1 / KLIPPER.zvReduction.value);
      expect(residualAt(ratio).isWithinTolerance).toBe(true);
    }
    expect(residualAt(1.1).residual).toBeGreaterThan(residualAt(1.05).residual);
  });

  test('the residual is Klipper’s estimate: ≈ 6,6–6,7 % at ±5 %, ≈ 13 % at ±10 % (research §7)', () => {
    const residualAt = (ratio: number) =>
      zvModel({ f0: ratio, zeta: KLIPPER_ZETA, fZv: 1 }).residual;

    expect(residualAt(0.95)).toBeCloseTo(0.067, 3);
    expect(residualAt(1.05)).toBeCloseTo(0.066, 3);
    expect(residualAt(0.9)).toBeCloseTo(0.135, 3);
    expect(residualAt(1.1)).toBeCloseTo(0.1305, 3);
  });

  test('it is shaper_calibrate.py’s _estimate_shaper (L186-L198), term by term', () => {
    // W = A·e^{−ζω(T_n − T)}, S = W·sin(ω′T), C = W·cos(ω′T), √(ΣS² + ΣC²)·(1/ΣA)
    const klipper = (f0: number, zeta: number, fZv: number) => {
      const { amplitudes, times } = zvShaper(fZv, KLIPPER_ZETA);
      const omega = TWO_PI * f0;
      const omegaD = omega * Math.sqrt(1 - zeta * zeta);
      const last = times[times.length - 1];
      const W = amplitudes.map((a, i) => a * Math.exp(-zeta * omega * (last - times[i])));
      const S = W.reduce((sum, w, i) => sum + w * Math.sin(omegaD * times[i]), 0);
      const C = W.reduce((sum, w, i) => sum + w * Math.cos(omegaD * times[i]), 0);
      return Math.hypot(S, C) / amplitudes.reduce((sum, a) => sum + a, 0);
    };
    for (const [f0, zeta, fZv] of [
      [1.1, 0.1, 1],
      [0.9, 0.05, 1],
      [2, 0.3, 0.5],
      [0.5, 0, 2],
    ]) {
      expect(zvResidual(f0, zeta, zvShaper(fZv, KLIPPER_ZETA))).toBeCloseTo(
        klipper(f0, zeta, fZv),
        12,
      );
    }
  });

  test('never above 100 % of one push, anywhere on the sliders', () => {
    for (const f0 of [0.5, 1, 1.5, 2]) {
      for (const fZv of [0.5, 1, 1.5, 2]) {
        for (const zeta of [0, 0.1, 0.3]) {
          expect(zvModel({ f0, zeta, fZv }).residual, `${f0} ${fZv} ${zeta}`).toBeLessThanOrEqual(
            1,
          );
        }
      }
    }
    const worst = zvModel({ f0: 2, zeta: 0.3, fZv: 0.5 });
    expect(Math.abs(worst.simulatedResidual - worst.residual)).toBeLessThan(0.01);
  });

  test('a filter that assumes ζ = 0,1 leaves vibration on an undamped structure', () => {
    expect(zvResidual(1, 0, zvShaper(1, KLIPPER_ZETA))).toBeGreaterThan(0.15);
    expect(zvModel({ f0: 1, zeta: 0, fZv: 1 }).detuning).toBe(0);
  });

  test('runs six natural periods past the second impulse', () => {
    expect(tuned.duration).toBeCloseTo(tuned.secondImpulse + 6, 9);
  });
});
