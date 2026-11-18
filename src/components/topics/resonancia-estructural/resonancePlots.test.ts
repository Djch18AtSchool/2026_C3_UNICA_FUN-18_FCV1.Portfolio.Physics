import { describe, expect, test } from 'vitest';
import { TACOMA, TACOMA_TORSION } from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import { resonanceGain } from '../../../lib/physics/resonance';
import {
  CURVE_ZETAS,
  explainedVariance,
  fitSinusoid,
  freeModes,
  measurementPlot,
  resonanceCurve,
  selfExcited,
  troopForces,
  type XY,
} from './resonancePlots';

const TWO_PI = 2 * Math.PI;
const yAt = (points: readonly XY[], x: number) => points.find((p) => p.x === x)?.y;
const peak = (points: readonly XY[]) =>
  points.reduce((best, p) => (p.y > best.y ? p : best), points[0]);

describe('free modes of the Tacoma (12.1), figure of Paso 1', () => {
  const { vertical, torsion } = freeModes();

  test('the vertical mode at 37 cycles/min and the torsion at 12, from the FWA report', () => {
    expect(vertical.cyclesPerMin).toBe(TACOMA.verticalAtSwitchCyclesPerMin.value);
    expect(torsion.cyclesPerMin).toBe(TACOMA.torsionCyclesPerMin.value);
    expect(torsion.periodS).toBeCloseTo(5, 12);
  });

  test('each curve is cos(2π f t): back at its start every period', () => {
    expect(yAt(torsion.points, 0)).toBe(1);
    expect(yAt(torsion.points, 5)).toBeCloseTo(1, 12);
    expect(yAt(torsion.points, 2.5)).toBeCloseTo(-1, 12);
    torsion.points.forEach(({ x, y }) => expect(y).toBeCloseTo(Math.cos((TWO_PI * x) / 5), 12));
    vertical.points.forEach(({ x, y }) =>
      expect(y).toBeCloseTo(Math.cos((TWO_PI * 37 * x) / 60), 12),
    );
  });

  test('both span the same window, sampled finely enough for the faster mode', () => {
    expect(torsion.points.at(-1)?.x).toBe(vertical.points.at(-1)?.x);
    const step = vertical.points[1].x - vertical.points[0].x;
    expect(step).toBeLessThan(60 / 37 / 20);
  });
});

describe('the resonance curve (12.3), figure of Paso 2', () => {
  test('the three ζ are the ones Klipper tests its shapers with', () => {
    expect(CURVE_ZETAS).toEqual(KLIPPER.testDampingRatios.values);
  });

  test.each(CURVE_ZETAS)('ζ = %s: at ω_d = ω0 the curve reads exactly 1/(2ζ)', (zeta) => {
    const points = resonanceCurve(zeta);

    expect(yAt(points, 1)).toBeCloseTo(1 / (2 * zeta), 9);
    expect(yAt(points, 1)).toBeCloseTo(resonanceGain(zeta), 9);
  });

  test.each(CURVE_ZETAS)(
    'ζ = %s: the peak sits at ω0 (within ζ²) and no higher than 1/(2ζ√(1−ζ²))',
    (zeta) => {
      const top = peak(resonanceCurve(zeta));

      expect(Math.abs(top.x - 1)).toBeLessThanOrEqual(zeta * zeta + 0.01);
      expect(top.y).toBeGreaterThanOrEqual(1 / (2 * zeta) - 1e-9);
      expect(top.y).toBeLessThanOrEqual(1 / (2 * zeta * Math.sqrt(1 - zeta * zeta)) + 1e-9);
    },
  );

  test('static deflection at ω_d → 0 and a falling tail well above ω0', () => {
    const points = resonanceCurve(0.1);

    expect(yAt(points, 0)).toBeCloseTo(1, 12);
    expect(points.at(-1)?.y ?? Infinity).toBeLessThan(0.5);
  });

  test('the less damping, the taller and narrower the peak', () => {
    const [low, mid, high] = CURVE_ZETAS.map((zeta) => yAt(resonanceCurve(zeta), 1) ?? 0);

    expect(low).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(high);
  });
});

describe('a troop of N (12.5), figure of Paso 3', () => {
  const F1 = 280;
  const troop = troopForces({ maxN: 200, step: 10, F1, seed: 1831 });

  test('in step the forces add to N·F1, in kN', () => {
    troop.inStep.forEach(({ x, y }) => expect(y).toBeCloseTo((x * F1) / 1000, 12));
    expect(yAt(troop.inStep, 60)).toBeCloseTo(16.8, 12);
  });

  test('breaking step, the rms curve is √N·F1', () => {
    troop.rms.forEach(({ x, y }) => expect(y).toBeCloseTo((Math.sqrt(x) * F1) / 1000, 12));
    expect(yAt(troop.rms, 60)).toBeCloseTo(2.169, 3);
  });

  test('one seeded draw per N: the same on every render, scattered around √N·F1', () => {
    const again = troopForces({ maxN: 200, step: 10, F1, seed: 1831 });

    expect(again.draws).toEqual(troop.draws);
    expect(troop.draws.map((p) => p.x)).toEqual(
      troop.inStep.filter((p) => p.x > 0).map((p) => p.x),
    );
    troop.draws.forEach(({ x, y }) => {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan((x * F1) / 1000);
    });
    const meanSquareRatio =
      troop.draws.reduce((sum, { x, y }) => sum + (y / ((Math.sqrt(x) * F1) / 1000)) ** 2, 0) /
      troop.draws.length;
    expect(meanSquareRatio).toBeGreaterThan(0.5);
    expect(meanSquareRatio).toBeLessThan(1.5);
  });

  test('over many seeds the draws’ rms is √N·F1 within 5 %', () => {
    const N = 100;
    let sumOfSquares = 0;
    const seeds = 400;
    for (let seed = 0; seed < seeds; seed += 1) {
      const { draws } = troopForces({ maxN: N, step: N, F1, seed });
      sumOfSquares += draws[0].y ** 2;
    }
    const rms = Math.sqrt(sumOfSquares / seeds);

    expect(Math.abs(rms / ((Math.sqrt(N) * F1) / 1000) - 1)).toBeLessThan(0.05);
  });

  test('rejects a step that does not divide the troop', () => {
    expect(() => troopForces({ maxN: 200, step: 0, F1, seed: 1 })).toThrow(RangeError);
    expect(() => troopForces({ maxN: 200, step: 30, F1, seed: 1 })).toThrow(RangeError);
  });
});

describe('self-excitation (12.10)–(12.11), figure of Paso 4', () => {
  const f0 = 0.2;
  const omega0 = TWO_PI * f0;

  test('θ/θ0 = e^{−ζ_net ω0 t} cos(ω′ t), with ω′ = ω0 √(1 − ζ²)', () => {
    const zeta = -0.015;
    const omegaPrime = omega0 * Math.sqrt(1 - zeta * zeta);
    const { points } = selfExcited(zeta, f0, 30);

    expect(points[0]).toEqual({ x: 0, y: 1 });
    points.forEach(({ x, y }) =>
      expect(y).toBeCloseTo(Math.exp(-zeta * omega0 * x) * Math.cos(omegaPrime * x), 12),
    );
  });

  test('ζ_net < 0: the envelope grows by e^{−ζ_net ω0 t}, ×3,1 in 60 s at ζ_net = −0,015', () => {
    const zeta = -0.015;
    const { envelope } = selfExcited(zeta, f0, 60);

    envelope.forEach(({ x, y }) => expect(y).toBeCloseTo(Math.exp(-zeta * omega0 * x), 12));
    expect(envelope.at(-1)?.y).toBeCloseTo(Math.exp(0.015 * omega0 * 60), 12);
    expect(envelope.at(-1)?.y).toBeCloseTo(3.1, 1);
  });

  test('every peak, one damped period apart, is e^{−2πζ/√(1−ζ²)} times the one before', () => {
    const zeta = -0.033;
    const omegaPrime = omega0 * Math.sqrt(1 - zeta * zeta);
    const period = TWO_PI / omegaPrime;
    const { at } = selfExcited(zeta, f0, 30);

    for (let k = 1; k <= 5; k += 1) {
      expect(at(k * period) / at((k - 1) * period)).toBeCloseTo(
        Math.exp((-TWO_PI * zeta) / Math.sqrt(1 - zeta * zeta)),
        9,
      );
    }
  });

  test('ζ_net > 0 decays and ζ_net = 0 keeps its amplitude', () => {
    expect(selfExcited(0.002, f0, 60).envelope.at(-1)?.y).toBeLessThan(1);
    expect(selfExcited(0, f0, 60).envelope.at(-1)?.y).toBe(1);
  });
});

describe('fitSinusoid and explainedVariance', () => {
  test('recovers amplitude, phase and offset of an exact sinusoid', () => {
    const points = Array.from({ length: 200 }, (_, i) => {
      const x = i * 0.05;
      return { x, y: 3 * Math.cos((TWO_PI * x) / 5 - 0.7) + 2 };
    });
    const fit = fitSinusoid(points, 5);

    expect(fit.amplitude).toBeCloseTo(3, 9);
    expect(fit.offset).toBeCloseTo(2, 9);
    expect(fit.at(1.2)).toBeCloseTo(3 * Math.cos((TWO_PI * 1.2) / 5 - 0.7) + 2, 9);
    expect(explainedVariance(points, fit.at)).toBeCloseTo(1, 9);
  });

  test('rejects too few points or a non-positive period', () => {
    expect(() => fitSinusoid([{ x: 0, y: 0 }], 5)).toThrow(RangeError);
    expect(() => fitSinusoid([], 5)).toThrow(RangeError);
    const points = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i % 2 }));
    expect(() => fitSinusoid(points, 0)).toThrow(RangeError);
  });

  test('a flat record has nothing to explain', () => {
    const flat = Array.from({ length: 10 }, (_, i) => ({ x: i, y: 4 }));

    expect(explainedVariance(flat, () => 4)).toBe(0);
  });
});

describe('the measurement of the film (TacomaMeasurement)', () => {
  const plot = measurementPlot(TACOMA_TORSION, 'torre');
  const series = TACOMA_TORSION.series.find((s) => s.shotId === 'torre');
  const shot = TACOMA_TORSION.shots.find((s) => s.id === 'torre');

  test('the video axis counts the file’s frames from the start of the series', () => {
    expect(plot.video).toHaveLength(series?.values.length ?? 0);
    plot.video.forEach(({ x, y }, i) => {
      expect(x).toBeCloseTo(i / (series?.fps ?? 1), 12);
      expect(y).toBe(series?.values[i]);
    });
  });

  test('the real axis reads real seconds: every video second is 24/16 = 1,5 real seconds', () => {
    expect(plot.stretch).toBe(1.5);
    plot.real.forEach(({ x, y }, i) => {
      expect(x).toBeCloseTo(plot.video[i].x * 1.5, 12);
      expect(y).toBe(plot.video[i].y);
    });
    expect(plot.real.at(-1)?.x).toBeCloseTo((1.5 * ((series?.values.length ?? 1) - 1)) / 29.97, 2);
  });

  test('my period for the shot: 3,43 s in the video, 5,15 s real', () => {
    expect(plot.periodVideoS).toBe(shot?.periodVideoS);
    expect(plot.periodRealS).toBeCloseTo((shot?.periodVideoS ?? 0) * 1.5, 12);
    expect(plot.periodRealS).toBeCloseTo(5.15, 2);
  });

  test('Farquharson’s 5 s, fitted in amplitude and phase, follows the corrected series', () => {
    expect(plot.farquharsonPeriodS).toBe(5);
    expect(plot.fit.at(-1)?.x).toBe(plot.real.at(-1)?.x);
    expect(plot.fitFraction).toBeGreaterThan(0.8);
    expect(plot.videoFitFraction).toBeLessThan(0.4);
  });

  test('an unknown shot fails loudly', () => {
    expect(() => measurementPlot(TACOMA_TORSION, 'nope')).toThrow(/nope/);
  });
});
