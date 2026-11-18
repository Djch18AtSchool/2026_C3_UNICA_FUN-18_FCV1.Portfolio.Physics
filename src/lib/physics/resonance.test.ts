import { describe, expect, test } from 'vitest';
import {
  criticalPedestrians,
  cycleEnergies,
  energyChangePerCycle,
  energyGrowthPerCycle,
  forcedStep,
  naturalFrequency,
  resonanceGain,
  steadyAmplitude,
  troopForceAmplitude,
  vortexFrequency,
  zvShaper,
  type Oscillator,
} from './resonance';

const TWO_PI = 2 * Math.PI;
/** Exact unit definitions (international mile and foot). */
const MPH = 0.44704;
const FT = 0.3048;

/** An oscillator with natural frequency f0 (Hz), damping ratio ζ and mass m. */
function oscillator(f0: number, zeta: number, m = 1): Oscillator {
  const k = m * (TWO_PI * f0) ** 2;
  return { m, k, b: 2 * zeta * Math.sqrt(k * m) };
}

/** Mulberry32: a small seeded generator, so the random-phase test is reproducible. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Free response of the oscillator to a unit impulse at t = 0: e^{−ζω0 t} sin(ωd t)/(m ωd). */
function impulseResponse(o: Oscillator, t: number): number {
  if (t < 0) return 0;
  const w0 = Math.sqrt(o.k / o.m);
  const zeta = o.b / (2 * Math.sqrt(o.k * o.m));
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  return (Math.exp(-zeta * w0 * t) * Math.sin(wd * t)) / (o.m * wd);
}

describe('natural frequency (12.1)', () => {
  test('f0 = √(k/m)/2π', () => {
    expect(naturalFrequency({ m: 2, k: 2 * TWO_PI ** 2, b: 0 })).toBeCloseTo(1, 12);
    expect(naturalFrequency({ m: 1, k: 400, b: 3 })).toBeCloseTo(20 / TWO_PI, 12);
  });

  test('rejects a mass that is not positive and a negative stiffness', () => {
    expect(() => naturalFrequency({ m: 0, k: 1, b: 0 })).toThrow(RangeError);
    expect(() => naturalFrequency({ m: 1, k: -1, b: 0 })).toThrow(RangeError);
    expect(() => naturalFrequency({ m: 1, k: Number.NaN, b: 0 })).toThrow(RangeError);
  });
});

describe('steady forced amplitude (12.3)', () => {
  test('at ω = ω0 it is the static deflection times 1/(2ζ)', () => {
    [0.005, 0.05, 0.2].forEach((zeta) => {
      const o = oscillator(0.2, zeta, 3);
      const F0 = 7;
      const w0 = TWO_PI * 0.2;

      expect(steadyAmplitude(o, F0, w0)).toBeCloseTo(F0 / o.k / (2 * zeta), 9);
    });
  });

  test('tends to the static deflection F0/k when ω = 0, and falls off far above ω0', () => {
    const o = oscillator(1, 0.1);

    expect(steadyAmplitude(o, 5, 0)).toBeCloseTo(5 / o.k, 12);
    expect(steadyAmplitude(o, 5, 10 * TWO_PI)).toBeLessThan((5 / o.k) * 0.02);
  });

  test('uses |F0|, so a force in antiphase has the same amplitude', () => {
    const o = oscillator(1, 0.1);

    expect(steadyAmplitude(o, -5, 3)).toBe(steadyAmplitude(o, 5, 3));
  });

  test('Review Focus 3: b = 0 at ω = ω0 gives Infinity, never NaN', () => {
    const o = oscillator(0.5, 0);
    const w0 = TWO_PI * 0.5;

    expect(steadyAmplitude(o, 10, w0)).toBe(Number.POSITIVE_INFINITY);
    expect(steadyAmplitude(o, 0, w0)).toBe(0);
  });

  test('rejects a negative or non-finite driving frequency and a non-finite force', () => {
    const o = oscillator(1, 0.1);

    expect(() => steadyAmplitude(o, 1, -1)).toThrow(RangeError);
    expect(() => steadyAmplitude(o, 1, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => steadyAmplitude(o, Number.NaN, 1)).toThrow(RangeError);
    expect(() => steadyAmplitude({ m: 1, k: 1, b: -0.1 }, 1, 1)).toThrow(RangeError);
  });
});

describe('resonance gain 1/(2ζ)', () => {
  test('×100 for the Tacoma torsion (ζ = 0,005) and ×2,5 with ζ = 0,2', () => {
    expect(resonanceGain(0.005)).toBeCloseTo(100, 9);
    expect(resonanceGain(0.2)).toBeCloseTo(2.5, 12);
  });

  test('is unbounded without damping and rejects a negative ζ', () => {
    expect(resonanceGain(0)).toBe(Number.POSITIVE_INFINITY);
    expect(() => resonanceGain(-0.1)).toThrow(RangeError);
  });
});

describe('energy per cycle (12.4)', () => {
  const o = oscillator(1, 0.1, 2);
  const F0 = 3;
  const w0 = TWO_PI;

  test('in steady state the force puts in what the damper takes out, at three frequencies', () => {
    [0.6 * w0, w0, 1.7 * w0].forEach((omega) => {
      const { input, dissipated } = cycleEnergies(o, F0, omega);
      const A = steadyAmplitude(o, F0, omega);

      expect(input).toBeGreaterThan(0);
      expect(input).toBeCloseTo(dissipated, 12);
      expect(dissipated).toBeCloseTo(Math.PI * o.b * omega * A * A, 12);
    });
  });

  test('matches the work F·v integrated over one cycle of the simulated steady state', () => {
    const dt = 1e-4;
    [0.6 * w0, w0, 1.7 * w0].forEach((omega) => {
      let s = { x: 0, v: 0 };
      let t = 0;
      // 40 s ≫ the transient's 1/(ζω0) = 1,6 s; then one exact period.
      const settle = Math.round(40 / dt);
      for (let i = 0; i < settle; i += 1, t += dt)
        s = forcedStep(o, s, F0 * Math.cos(omega * t), dt);
      const steps = Math.round(TWO_PI / omega / dt);
      let work = 0;
      for (let i = 0; i < steps; i += 1, t += dt) {
        const next = forcedStep(o, s, F0 * Math.cos(omega * t), dt);
        // W = ∫F dx, with F at the middle of the step (midpoint rule).
        work += F0 * Math.cos(omega * (t + dt / 2)) * (next.x - s.x);
        s = next;
      }

      expect(work / cycleEnergies(o, F0, omega).input).toBeCloseTo(1, 2);
    });
  });

  test('Review Focus 3: undamped at resonance there is no steady state, so both are Infinity', () => {
    const energies = cycleEnergies(oscillator(1, 0), F0, w0);

    expect(energies).toEqual({
      input: Number.POSITIVE_INFINITY,
      dissipated: Number.POSITIVE_INFINITY,
    });
  });

  test('without damping and off resonance nothing goes in or out', () => {
    const energies = cycleEnergies(oscillator(1, 0), F0, 0.5 * w0);

    expect(energies.input).toBeCloseTo(0, 12);
    expect(energies.dissipated).toBe(0);
  });
});

describe('a troop of N steps (12.5)', () => {
  test('in step (equal phases) the forces add to N·F1', () => {
    expect(troopForceAmplitude(280, new Array(60).fill(0))).toBeCloseTo(60 * 280, 9);
    expect(troopForceAmplitude(280, new Array(60).fill(1.3))).toBeCloseTo(60 * 280, 9);
  });

  // The research's statement is about the rms (√⟨|F|²⟩ = √N·F1); the plain mean of |F| is the
  // Rayleigh mean √(π/4)·√N·F1 ≈ 0,89·√N·F1.
  test('breaking step (random phases) the rms of the sum is √N·F1, over 2 000 seeded draws', () => {
    const N = 100;
    const F1 = 280;
    const random = mulberry32(12);
    const draws = 2000;
    let sumOfSquares = 0;
    for (let d = 0; d < draws; d += 1) {
      const phases = Array.from({ length: N }, () => TWO_PI * random());
      sumOfSquares += troopForceAmplitude(F1, phases) ** 2;
    }
    const rms = Math.sqrt(sumOfSquares / draws);

    expect(Math.abs(rms / (Math.sqrt(N) * F1) - 1)).toBeLessThan(0.05);
  });

  test('two steps in antiphase cancel, and an empty troop pushes nothing', () => {
    expect(troopForceAmplitude(280, [0, Math.PI])).toBeCloseTo(0, 9);
    expect(troopForceAmplitude(280, [])).toBe(0);
  });

  test('rejects a non-finite force or phase', () => {
    expect(() => troopForceAmplitude(Number.NaN, [0])).toThrow(RangeError);
    expect(() => troopForceAmplitude(1, [0, Number.POSITIVE_INFINITY])).toThrow(RangeError);
  });
});

describe('ZV input shaper (12.6, Klipper v0.13.0)', () => {
  test('second impulse half a damped period later, with ratio K = e^{−ζπ/√(1−ζ²)}', () => {
    const f = 50;
    const zeta = 0.1;
    const df = Math.sqrt(1 - zeta * zeta);
    const K = Math.exp((-zeta * Math.PI) / df);
    const { amplitudes, times } = zvShaper(f, zeta);

    expect(times[0]).toBe(0);
    expect(times[1]).toBeCloseTo(0.5 / (f * df), 15);
    expect(amplitudes[1] / amplitudes[0]).toBeCloseTo(K, 15);
  });

  test('amplitudes add to 1, as kin_shaper.c normalises them (Klipper: A = [1; 0,7292] at ζ = 0,1)', () => {
    const { amplitudes } = zvShaper(50, 0.1);

    expect(amplitudes[0] + amplitudes[1]).toBeCloseTo(1, 15);
    expect(amplitudes[1] / amplitudes[0]).toBeCloseTo(0.7292, 4);
  });

  test('the two superposed free responses cancel after the second impulse', () => {
    [
      [50, 0.1],
      [0.2, 0.005],
      [2, 0.4],
    ].forEach(([f, zeta]) => {
      const o = oscillator(f, zeta);
      const { amplitudes, times } = zvShaper(f, zeta);
      const period = 1 / f;
      const single = Math.max(
        ...Array.from({ length: 200 }, (_, i) => Math.abs(impulseResponse(o, (i * period) / 200))),
      );
      const residual = Math.max(
        ...Array.from({ length: 400 }, (_, i) => {
          const t = times[1] + (i * 3 * period) / 400;
          return Math.abs(
            amplitudes[0] * impulseResponse(o, t - times[0]) +
              amplitudes[1] * impulseResponse(o, t - times[1]),
          );
        }),
      );

      expect(residual / single).toBeLessThan(1e-9);
    });
  });

  test('ζ = 0 gives two equal impulses half a period apart', () => {
    const { amplitudes, times } = zvShaper(10, 0);

    expect(amplitudes).toEqual([0.5, 0.5]);
    expect(times[1]).toBeCloseTo(0.05, 15);
  });

  test('rejects a frequency that is not positive and ζ outside [0, 1)', () => {
    expect(() => zvShaper(0, 0.1)).toThrow(RangeError);
    expect(() => zvShaper(50, 1)).toThrow(RangeError);
    expect(() => zvShaper(50, -0.1)).toThrow(RangeError);
  });
});

describe('Millennium Bridge: critical number of pedestrians (12.8)', () => {
  test('≈ 37 people with CL1 as built (ζ = 0,7 %, 0,48 Hz, 130 t, k_p = 300 N·s/m)', () => {
    expect(criticalPedestrians(0.007, 0.48, 130_000, 300)).toBeCloseTo(36.6, 1);
    expect(Math.round(criticalPedestrians(0.007, 0.48, 130_000, 300))).toBe(37);
  });

  test('≈ 1 180 people with ζ = 20 % (0,49 Hz, 144 t)', () => {
    expect(Math.round(criticalPedestrians(0.2, 0.49, 144_000, 300) / 10) * 10).toBe(1180);
  });

  test('rejects a coefficient that is not positive', () => {
    expect(() => criticalPedestrians(0.007, 0.48, 130_000, 0)).toThrow(RangeError);
    expect(() => criticalPedestrians(-0.1, 0.48, 130_000, 300)).toThrow(RangeError);
  });
});

describe('vortex shedding (12.9)', () => {
  test('Tacoma at 42 mph, D = 8 ft, S = 0,11: ≈ 0,85 Hz, 4,2 times the 0,20 Hz torsion', () => {
    const fs = vortexFrequency(0.11, 42 * MPH, 8 * FT);

    expect(fs).toBeCloseTo(0.847, 3);
    expect(fs / 0.2).toBeCloseTo(4.2, 1);
  });

  test('rejects a deck depth that is not positive', () => {
    expect(() => vortexFrequency(0.11, 18.8, 0)).toThrow(RangeError);
  });
});

describe('self-excitation: energy change per cycle (12.12)', () => {
  test('ΔE/E ≈ −4πζ: −0,0628 with the Tacoma structural ζ = 0,005', () => {
    expect(energyChangePerCycle(0.005)).toBeCloseTo(-0.0628, 4);
  });

  test('a negative net ζ means energy gained every cycle', () => {
    expect(energyChangePerCycle(-0.015)).toBeCloseTo(0.1885, 4);
    expect(energyChangePerCycle(0)).toBeCloseTo(0, 15);
  });

  test('rejects a non-finite ζ', () => {
    expect(() => energyChangePerCycle(Number.NaN)).toThrow(RangeError);
  });
});

describe('self-excitation: exact energy change per natural period (12.12)', () => {
  // The research's flutter table (§4) with ζ_s = 0,005 and Billah and Scanlan's Table I.
  test('e^{−4πζ} − 1: +6,48 %, +13,4 % and +20,7 % at ζ_net = −0,005, −0,010 and −0,015', () => {
    expect(energyGrowthPerCycle(-0.005)).toBeCloseTo(Math.exp(0.02 * Math.PI) - 1, 12);
    expect(energyGrowthPerCycle(-0.005)).toBeCloseTo(0.0648, 4);
    expect(energyGrowthPerCycle(-0.01)).toBeCloseTo(0.134, 3);
    expect(energyGrowthPerCycle(-0.015)).toBeCloseTo(0.207, 3);
  });

  test('a positive ζ loses energy: −6,1 % per cycle with the structural ζ = 0,005', () => {
    expect(energyGrowthPerCycle(0.005)).toBeCloseTo(-0.0609, 4);
    expect(energyGrowthPerCycle(0)).toBeCloseTo(0, 15);
  });

  test('the linear −4πζ is its small-ζ limit and always below the exact gain', () => {
    for (const zeta of [-0.033, -0.015, -0.001, 0.001, 0.015]) {
      expect(energyGrowthPerCycle(zeta)).toBeGreaterThan(energyChangePerCycle(zeta));
    }
    expect(energyGrowthPerCycle(-1e-6) / energyChangePerCycle(-1e-6)).toBeCloseTo(1, 4);
  });

  test('rejects a non-finite ζ', () => {
    expect(() => energyGrowthPerCycle(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('forcedStep (semi-implicit Euler with a force)', () => {
  test('v′ = v + (F − kx − bv)/m·dt, then x′ = x + v′·dt', () => {
    const next = forcedStep({ m: 2, k: 10, b: 1 }, { x: 0.5, v: 1 }, 4, 0.1);

    expect(next.v).toBeCloseTo(1 + ((4 - 5 - 1) / 2) * 0.1, 15);
    expect(next.x).toBeCloseTo(0.5 + next.v * 0.1, 15);
  });

  test('a constant force with damping settles at the static deflection F/k', () => {
    const o = oscillator(1, 0.3);
    let s = { x: 0, v: 0 };
    for (let i = 0; i < 20_000; i += 1) s = forcedStep(o, s, 6, 1e-3);

    expect(s.x).toBeCloseTo(6 / o.k, 6);
    expect(s.v).toBeCloseTo(0, 6);
  });

  test('driven at ω0 from rest, the amplitude grows to (F0/k)/(2ζ)', () => {
    const zeta = 0.05;
    const o = oscillator(1, zeta);
    const dt = 1e-4;
    let s = { x: 0, v: 0 };
    let peak = 0;
    for (let i = 0; i < 300_000; i += 1) {
      s = forcedStep(o, s, Math.cos(TWO_PI * i * dt), dt);
      if (i > 280_000) peak = Math.max(peak, Math.abs(s.x));
    }

    expect(peak / (1 / o.k / (2 * zeta))).toBeCloseTo(1, 2);
  });

  test('rejects a step that is not positive and a non-finite force or state', () => {
    const o = oscillator(1, 0.1);

    expect(() => forcedStep(o, { x: 0, v: 0 }, 1, 0)).toThrow(RangeError);
    expect(() => forcedStep(o, { x: 0, v: 0 }, Number.NaN, 0.01)).toThrow(RangeError);
    expect(() => forcedStep(o, { x: Number.NaN, v: 0 }, 1, 0.01)).toThrow(RangeError);
  });
});
