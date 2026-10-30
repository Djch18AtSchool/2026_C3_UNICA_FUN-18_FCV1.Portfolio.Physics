import { describe, expect, test } from 'vitest';
import { omegaToRpm } from './circular';
import {
  bodyRateChange,
  boxInertia,
  gravityGradientTorqueMax,
  minSlewTime,
  restToRestSlew,
  slewStateAt,
  wheelMomentumAt,
  wheelTurnsForSlew,
  type DumpingParams,
} from './rotation';

/** Research §6: 6U CubeSat (12 kg, 100,0 × 226,3 × 366,0 mm) and the RW400 50 mN·m·s wheel. */
const IS_6U = boxInertia(12, 0.2263, 0.366);
const IW_RW400 = 0.05 / ((5000 * 2 * Math.PI) / 60);
const QUARTER_TURN = Math.PI / 2;
const RW400_LMAX = 0.05;
const RW400_TAU_MAX = 0.008;
const TAU_GG = 2.29e-7;
const TAU_MTQ = 1.2e-5;

describe('boxInertia', () => {
  test('gives the research value for the 6U about the axis normal to its largest face', () => {
    expect(IS_6U).toBeCloseTo(0.1852, 4);
  });

  test('gives the long-axis value 0,0612 kg·m² (100,0 × 226,3 mm cross-section)', () => {
    expect(boxInertia(12, 0.1, 0.2263)).toBeCloseTo(0.0612, 4);
  });

  test('rejects a mass or a side that is not positive', () => {
    expect(() => boxInertia(0, 0.2, 0.3)).toThrow(RangeError);
    expect(() => boxInertia(12, -0.2, 0.3)).toThrow(RangeError);
    expect(() => boxInertia(12, 0.2, Number.NaN)).toThrow(RangeError);
  });
});

describe('bodyRateChange', () => {
  test('spinning the wheel one way turns the body the other way: I_s Δω_s = −I_w Δω_w', () => {
    const plan = restToRestSlew(IS_6U, IW_RW400, QUARTER_TURN, 60);
    const wheelChange = -plan.peakWheelRate;

    const bodyChange = bodyRateChange(IS_6U, IW_RW400, wheelChange);

    expect(wheelChange).toBeCloseTo(-101.5, 1);
    expect(bodyChange).toBeCloseTo(plan.peakRate, 15);
    expect(bodyChange).toBeCloseTo(0.0524, 4);
    expect(IS_6U * bodyChange + IW_RW400 * wheelChange).toBeCloseTo(0, 12);
  });

  test('a wheel that does not change leaves the body as it was', () => {
    expect(bodyRateChange(IS_6U, IW_RW400, 0)).toBeCloseTo(0, 15);
  });

  test('rejects inertias that are not positive and a rate that is not finite', () => {
    expect(() => bodyRateChange(0, IW_RW400, 1)).toThrow(RangeError);
    expect(() => bodyRateChange(IS_6U, 0, 1)).toThrow(RangeError);
    expect(() => bodyRateChange(IS_6U, IW_RW400, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('wheelTurnsForSlew', () => {
  test('the wheel turns about 485 times for a 90° turn of the 6U', () => {
    expect(wheelTurnsForSlew(IS_6U, IW_RW400, QUARTER_TURN)).toBeCloseTo(485, -1);
  });

  test('is (I_s/I_w)·θ/(2π), about 1940 times the body turns', () => {
    const ratio = IS_6U / IW_RW400;

    expect(ratio).toBeCloseTo(1940, -1);
    expect(wheelTurnsForSlew(IS_6U, IW_RW400, 2 * Math.PI)).toBeCloseTo(ratio, 9);
  });

  test('rejects inertias that are not positive', () => {
    expect(() => wheelTurnsForSlew(IS_6U, 0, QUARTER_TURN)).toThrow(RangeError);
  });
});

describe('restToRestSlew', () => {
  test('90° in 60 s: τ = 0,32 mN·m, ω_s 0,0524 rad/s, L_w 9,70·10⁻³ N·m·s, 970 rpm', () => {
    const plan = restToRestSlew(IS_6U, IW_RW400, QUARTER_TURN, 60);

    expect(plan.torque).toBeCloseTo(3.23e-4, 6);
    expect(plan.alpha).toBeCloseTo(1.75e-3, 5);
    expect(plan.peakRate).toBeCloseTo(0.0524, 4);
    expect(plan.peakWheelMomentum).toBeCloseTo(9.7e-3, 5);
    expect(omegaToRpm(plan.peakWheelRate)).toBeCloseTo(970, -1);
  });

  test('uses 4 % of the RW400 torque and 19 % of its momentum', () => {
    const plan = restToRestSlew(IS_6U, IW_RW400, QUARTER_TURN, 60);

    expect(plan.torque / RW400_TAU_MAX).toBeCloseTo(0.04, 2);
    expect(plan.peakWheelMomentum / RW400_LMAX).toBeCloseTo(0.19, 2);
  });

  test('30 s: τ = 1,29 mN·m, 6°/s, 0,0194 N·m·s and about 1940 rpm', () => {
    const plan = restToRestSlew(IS_6U, IW_RW400, QUARTER_TURN, 30);

    expect(plan.torque).toBeCloseTo(1.29e-3, 5);
    expect((plan.peakRate * 180) / Math.PI).toBeCloseTo(6, 6);
    expect(plan.peakWheelMomentum).toBeCloseTo(0.0194, 4);
    expect(omegaToRpm(plan.peakWheelRate)).toBeCloseTo(1940, -1);
  });

  test('gives magnitudes, the same for a turn the other way', () => {
    expect(restToRestSlew(IS_6U, IW_RW400, -QUARTER_TURN, 60)).toEqual(
      restToRestSlew(IS_6U, IW_RW400, QUARTER_TURN, 60),
    );
  });

  test('below the minimum time it still returns finite numbers that exceed the wheel', () => {
    const plan = restToRestSlew(IS_6U, IW_RW400, QUARTER_TURN, 8);

    for (const value of Object.values(plan)) expect(Number.isFinite(value)).toBe(true);
    expect(plan.torque).toBeGreaterThan(RW400_TAU_MAX);
    expect(plan.peakWheelMomentum).toBeGreaterThan(RW400_LMAX);
  });

  test('rejects a duration that is not positive and an angle that is not finite', () => {
    expect(() => restToRestSlew(IS_6U, IW_RW400, QUARTER_TURN, 0)).toThrow(RangeError);
    expect(() => restToRestSlew(IS_6U, IW_RW400, Number.NaN, 60)).toThrow(RangeError);
  });
});

describe('slewStateAt', () => {
  const at = (t: number, T = 60) => slewStateAt(IS_6U, IW_RW400, QUARTER_TURN, T, t);

  test('starts at rest with the wheel at 0 rpm', () => {
    for (const value of Object.values(at(0))) expect(Math.abs(value)).toBe(0);
  });

  test('is symmetric: half the angle and the peak rate at T/2', () => {
    const half = at(30);

    expect(half.thetaS).toBeCloseTo(QUARTER_TURN / 2, 12);
    expect(half.omegaS).toBeCloseTo(0.0524, 4);
    expect(omegaToRpm(half.omegaW)).toBeCloseTo(-970, -1);
    expect(half.Lw).toBeCloseTo(-9.7e-3, 5);
  });

  test('ends at the target angle with both bodies at rest', () => {
    const end = at(60);

    expect(end.thetaS).toBeCloseTo(QUARTER_TURN, 12);
    expect(end.omegaS).toBeCloseTo(0, 15);
    expect(end.omegaW).toBeCloseTo(0, 12);
    expect(end.torque).toBe(0);
  });

  test('matches the research table at t = 10, 20, 40 and 50 s', () => {
    const rows = [
      { t: 10, omegaS: 0.0175, deg: 5, rpm: -323, Lw: -0.00323 },
      { t: 20, omegaS: 0.0349, deg: 20, rpm: -646, Lw: -0.00646 },
      { t: 40, omegaS: 0.0349, deg: 70, rpm: -646, Lw: -0.00646 },
      { t: 50, omegaS: 0.0175, deg: 85, rpm: -323, Lw: -0.00323 },
    ];

    for (const row of rows) {
      const state = at(row.t);
      expect(state.omegaS).toBeCloseTo(row.omegaS, 4);
      expect((state.thetaS * 180) / Math.PI).toBeCloseTo(row.deg, 6);
      expect(omegaToRpm(state.omegaW)).toBeCloseTo(row.rpm, 0);
      expect(state.Lw).toBeCloseTo(row.Lw, 5);
    }
  });

  test('the motor pushes the wheel one way, then the other: τ = dL_w/dt', () => {
    const plan = restToRestSlew(IS_6U, IW_RW400, QUARTER_TURN, 60);

    expect(at(10).torque).toBeCloseTo(-plan.torque, 15);
    expect(at(45).torque).toBeCloseTo(plan.torque, 15);
    const dt = 1e-3;
    expect((at(10 + dt).Lw - at(10).Lw) / dt).toBeCloseTo(at(10).torque, 9);
    expect((at(45 + dt).Lw - at(45).Lw) / dt).toBeCloseTo(at(45).torque, 9);
  });

  test('keeps the total angular momentum at zero: I_s ω_s + I_w ω_w = 0 at every t', () => {
    for (let t = 0; t <= 60; t += 2.5) {
      const state = at(t);
      expect(IS_6U * state.omegaS + IW_RW400 * state.omegaW).toBeCloseTo(0, 12);
      expect(state.Lw).toBeCloseTo(IW_RW400 * state.omegaW, 15);
    }
  });

  test('I_s Δθ_s + I_w Δθ_w = 0 at every t, with θ_w the integral of ω_w', () => {
    const steps = 6000;
    const dt = 60 / steps;
    let integral = 0;
    let previous = at(0);
    for (let i = 1; i <= steps; i += 1) {
      const state = at(i * dt);
      integral += ((previous.omegaW + state.omegaW) / 2) * dt;
      if (i % 600 === 0) {
        expect(state.thetaW).toBeCloseTo(integral, 6);
        expect(IS_6U * state.thetaS + IW_RW400 * state.thetaW).toBeCloseTo(0, 10);
      }
      previous = state;
    }
  });

  test('the wheel turns about 485 times while the body turns 90°', () => {
    expect(-at(60).thetaW / (2 * Math.PI)).toBeCloseTo(
      wheelTurnsForSlew(IS_6U, IW_RW400, QUARTER_TURN),
      9,
    );
  });

  test('a turn the other way mirrors every signed quantity', () => {
    const forward = at(20);
    const backward = slewStateAt(IS_6U, IW_RW400, -QUARTER_TURN, 60, 20);

    expect(backward.thetaS).toBeCloseTo(-forward.thetaS, 15);
    expect(backward.omegaW).toBeCloseTo(-forward.omegaW, 12);
    expect(backward.torque).toBeCloseTo(-forward.torque, 15);
  });

  test('holds the start before t = 0 and the end after t = T', () => {
    expect(at(-5)).toEqual(at(0));
    expect(at(90)).toEqual(at(60));
  });

  test('a zero angle keeps everything at rest', () => {
    const state = slewStateAt(IS_6U, IW_RW400, 0, 60, 30);

    for (const value of Object.values(state)) expect(Math.abs(value)).toBe(0);
  });

  test('below the minimum time it still returns finite numbers', () => {
    for (const t of [0, 2, 4, 6, 8]) {
      for (const value of Object.values(at(t, 8))) expect(Number.isFinite(value)).toBe(true);
    }
  });

  test('rejects a duration that is not positive and a time that is not finite', () => {
    expect(() => at(10, 0)).toThrow(RangeError);
    expect(() => at(Number.NaN)).toThrow(RangeError);
  });
});

describe('minSlewTime', () => {
  test('the RW400 turns the 6U 90° in 12,1 s at best by torque and 11,6 s by momentum', () => {
    const limits = minSlewTime(IS_6U, QUARTER_TURN, RW400_TAU_MAX, RW400_LMAX);

    expect(limits.byTorque).toBeCloseTo(12.1, 1);
    expect(limits.byMomentum).toBeCloseTo(11.6, 1);
  });

  test('at the torque limit the peak momentum is 96 % of L_max (4820 rpm, 14,9°/s)', () => {
    const { byTorque } = minSlewTime(IS_6U, QUARTER_TURN, RW400_TAU_MAX, RW400_LMAX);

    const plan = restToRestSlew(IS_6U, IW_RW400, QUARTER_TURN, byTorque);

    expect(plan.torque).toBeCloseTo(RW400_TAU_MAX, 12);
    expect(plan.peakWheelMomentum / RW400_LMAX).toBeCloseTo(0.96, 2);
    expect(omegaToRpm(plan.peakWheelRate)).toBeCloseTo(4820, -1);
    expect((plan.peakRate * 180) / Math.PI).toBeCloseTo(14.9, 1);
  });

  test('at the momentum limit the peak momentum is exactly L_max', () => {
    const { byMomentum } = minSlewTime(IS_6U, QUARTER_TURN, RW400_TAU_MAX, RW400_LMAX);

    const plan = restToRestSlew(IS_6U, IW_RW400, QUARTER_TURN, byMomentum);

    expect(plan.peakWheelMomentum).toBeCloseTo(RW400_LMAX, 12);
  });

  test('a turn the other way needs the same time; no turn needs none', () => {
    expect(minSlewTime(IS_6U, -QUARTER_TURN, RW400_TAU_MAX, RW400_LMAX)).toEqual(
      minSlewTime(IS_6U, QUARTER_TURN, RW400_TAU_MAX, RW400_LMAX),
    );
    expect(minSlewTime(IS_6U, 0, 0, 0)).toEqual({ byTorque: 0, byMomentum: 0 });
  });

  test('a wheel without torque or momentum can never finish: explicit Infinity', () => {
    expect(minSlewTime(IS_6U, QUARTER_TURN, 0, 0)).toEqual({
      byTorque: Number.POSITIVE_INFINITY,
      byMomentum: Number.POSITIVE_INFINITY,
    });
  });

  test('rejects negative limits', () => {
    expect(() => minSlewTime(IS_6U, QUARTER_TURN, -1, RW400_LMAX)).toThrow(RangeError);
    expect(() => minSlewTime(IS_6U, QUARTER_TURN, RW400_TAU_MAX, -1)).toThrow(RangeError);
  });
});

describe('gravityGradientTorqueMax', () => {
  test('a 6U at 500 km feels at most 2,29·10⁻⁷ N·m', () => {
    expect(gravityGradientTorqueMax(3.986e14, 6.871e6, 0.124)).toBeCloseTo(2.29e-7, 8);
  });

  test('depends on the size of the inertia difference, not its sign', () => {
    expect(gravityGradientTorqueMax(3.986e14, 6.871e6, -0.124)).toBe(
      gravityGradientTorqueMax(3.986e14, 6.871e6, 0.124),
    );
  });

  test('rejects a radius or μ that is not positive', () => {
    expect(() => gravityGradientTorqueMax(3.986e14, 0, 0.124)).toThrow(RangeError);
    expect(() => gravityGradientTorqueMax(0, 6.871e6, 0.124)).toThrow(RangeError);
  });
});

describe('wheelMomentumAt', () => {
  const noDumping: DumpingParams = {
    tauExt: TAU_GG,
    tauDump: 0,
    Lmax: RW400_LMAX,
    dumpAt: 1,
    dumpTo: 0,
  };

  test('without dumping the wheel fills at τ_ext and saturates after L_max/τ_ext ≈ 2,18·10⁵ s', () => {
    const before = wheelMomentumAt(2.18e5, noDumping);
    const after = wheelMomentumAt(2.19e5, noDumping);

    expect(before.Lw).toBeCloseTo(TAU_GG * 2.18e5, 12);
    expect(before.saturated).toBe(false);
    expect(after).toEqual({ Lw: RW400_LMAX, dumping: false, saturated: true });
    expect(wheelMomentumAt(1e7, noDumping)).toEqual(after);
  });

  test('fills linearly: L_w = τ_ext·t', () => {
    expect(wheelMomentumAt(0, noDumping)).toEqual({ Lw: 0, dumping: false, saturated: false });
    expect(wheelMomentumAt(1e5, noDumping).Lw).toBeCloseTo(0.0229, 12);
  });

  const sawtooth: DumpingParams = {
    tauExt: TAU_GG,
    tauDump: TAU_MTQ,
    Lmax: RW400_LMAX,
    dumpAt: 0.8,
    dumpTo: 0,
  };
  const reachThreshold = (0.8 * RW400_LMAX) / TAU_GG;
  const dumpDuration = (0.8 * RW400_LMAX) / (TAU_MTQ - TAU_GG);

  test('reaches the 80 % threshold (0,040 N·m·s) after about 48 h', () => {
    expect(reachThreshold / 3600).toBeCloseTo(48.5, 1);
    expect(wheelMomentumAt(reachThreshold - 1, sawtooth)).toMatchObject({ dumping: false });
    expect(wheelMomentumAt(reachThreshold + 1, sawtooth)).toMatchObject({ dumping: true });
    expect(wheelMomentumAt(reachThreshold, sawtooth).Lw).toBeCloseTo(0.04, 12);
  });

  test('dumps at the net rate τ_dump − τ_ext down to the lower mark, then fills again', () => {
    const midDump = reachThreshold + dumpDuration / 2;
    const afterDump = reachThreshold + dumpDuration + 1000;

    expect(wheelMomentumAt(midDump, sawtooth)).toMatchObject({ dumping: true, saturated: false });
    expect(wheelMomentumAt(midDump, sawtooth).Lw).toBeCloseTo(0.02, 12);
    expect(wheelMomentumAt(afterDump, sawtooth)).toMatchObject({ dumping: false });
    expect(wheelMomentumAt(afterDump, sawtooth).Lw).toBeCloseTo(TAU_GG * 1000, 12);
  });

  test('repeats exactly: a sawtooth with period fill + dump', () => {
    const period = reachThreshold + dumpDuration;
    const probe = reachThreshold + 1234;

    for (let k = 1; k <= 5; k += 1) {
      expect(wheelMomentumAt(probe + k * period, sawtooth).Lw).toBeCloseTo(
        wheelMomentumAt(probe, sawtooth).Lw,
        12,
      );
    }
  });

  test('never saturates while the dump wins and the threshold is below L_max', () => {
    for (let t = 0; t < 2e6; t += 997) {
      const state = wheelMomentumAt(t, sawtooth);
      expect(state.saturated).toBe(false);
      expect(state.Lw).toBeLessThanOrEqual(0.04 + 1e-15);
      expect(state.Lw).toBeGreaterThanOrEqual(0);
    }
  });

  test('a full dump at a net 1,2·10⁻⁵ N·m empties 0,050 N·m·s in about 4170 s', () => {
    const fullDump: DumpingParams = {
      tauExt: TAU_GG,
      tauDump: TAU_MTQ + TAU_GG,
      Lmax: RW400_LMAX,
      dumpAt: 1,
      dumpTo: 0,
    };
    const full = RW400_LMAX / TAU_GG;

    expect(RW400_LMAX / TAU_MTQ).toBeCloseTo(4170, -1);
    expect(wheelMomentumAt(full, fullDump)).toMatchObject({ dumping: true, saturated: true });
    expect(wheelMomentumAt(full + RW400_LMAX / TAU_MTQ - 1e-6, fullDump).Lw).toBeCloseTo(0, 9);
    expect(wheelMomentumAt(full + 2085, fullDump).Lw).toBeCloseTo(RW400_LMAX - TAU_MTQ * 2085, 12);
  });

  test('a dump that cannot beat the disturbance still fills the wheel to L_max', () => {
    const weak: DumpingParams = { ...sawtooth, tauDump: TAU_GG / 2 };
    const t1 = reachThreshold;
    const toFull = (0.2 * RW400_LMAX) / (TAU_GG / 2);

    expect(wheelMomentumAt(t1 + toFull / 2, weak).Lw).toBeCloseTo(0.045, 12);
    expect(wheelMomentumAt(t1 + toFull / 2, weak)).toMatchObject({
      dumping: true,
      saturated: false,
    });
    expect(wheelMomentumAt(t1 + 2 * toFull, weak)).toEqual({
      Lw: RW400_LMAX,
      dumping: true,
      saturated: true,
    });
  });

  test('a dump that exactly balances the disturbance holds the wheel at the threshold', () => {
    const balanced: DumpingParams = { ...sawtooth, tauDump: TAU_GG };

    const held = wheelMomentumAt(reachThreshold * 10, balanced);

    expect(held).toMatchObject({ dumping: true, saturated: false });
    expect(held.Lw).toBeCloseTo(0.04, 15);
  });

  test('with no disturbance the wheel stays empty forever', () => {
    const calm: DumpingParams = { ...sawtooth, tauExt: 0 };

    expect(wheelMomentumAt(1e9, calm)).toEqual({ Lw: 0, dumping: false, saturated: false });
  });

  test('stops dumping at a partial lower mark when dumpTo > 0', () => {
    const partial: DumpingParams = { ...sawtooth, dumpTo: 0.2 };
    const partialDump = (0.6 * RW400_LMAX) / (TAU_MTQ - TAU_GG);

    expect(wheelMomentumAt(reachThreshold + partialDump, partial).Lw).toBeCloseTo(0.01, 12);
    expect(wheelMomentumAt(reachThreshold + partialDump + 1, partial).dumping).toBe(false);
  });

  test('rejects inconsistent parameters and negative times', () => {
    expect(() => wheelMomentumAt(-1, sawtooth)).toThrow(RangeError);
    expect(() => wheelMomentumAt(0, { ...sawtooth, tauExt: -1 })).toThrow(RangeError);
    expect(() => wheelMomentumAt(0, { ...sawtooth, tauDump: -1 })).toThrow(RangeError);
    expect(() => wheelMomentumAt(0, { ...sawtooth, Lmax: 0 })).toThrow(RangeError);
    expect(() => wheelMomentumAt(0, { ...sawtooth, dumpAt: 1.2 })).toThrow(RangeError);
    expect(() => wheelMomentumAt(0, { ...sawtooth, dumpAt: 0 })).toThrow(RangeError);
    expect(() => wheelMomentumAt(0, { ...sawtooth, dumpTo: 0.8 })).toThrow(RangeError);
    expect(() => wheelMomentumAt(0, { ...sawtooth, dumpTo: -0.1 })).toThrow(RangeError);
  });
});
