import { describe, expect, test } from 'vitest';
import {
  curveLoss,
  cvLoss,
  flowVelocity,
  hydraulicPower,
  M3S_PER_GPM,
  M3S_PER_LPM,
  operatingPoint,
  PA_PER_BAR,
  PA_PER_PSI,
  powerLawCurve,
  seriesLoss,
} from '../physics/hydraulics';
import {
  DESCHUTES_PUMP,
  GF_PUBLISHED,
  GF_PUBLISHED_DROP_BAR,
  PG25_40C,
  pumpPressure,
  RD109,
  UQD04,
} from './liquidCooling';
import {
  PRESETS,
  rackPath,
  rackProfile,
  rackSplit,
  RD109_CIRCUIT,
  serverBranch,
  serverFlow,
  type CoolingPreset,
  type RackConfig,
} from './liquidCoolingCircuit';

/*
 * Every number below is printed in docs/superpowers/research/2026-11-17-enfriamiento-liquido.md
 * (§7.1 with its errata of 2026-11-17, §7.2, §8) or in the prototype outputs it came from.
 */

const LPM = M3S_PER_LPM;
const KPA = 1e3;
const ORIGINS = ['producto', 'ilustrativo', 'calculo'];
const REFERENCE = PRESETS.referencia24;
const MGX44 = PRESETS.mgx44;

const lastPressure = (config: RackConfig, server?: number) =>
  rackProfile(config, server).at(-1)?.pReal ?? Number.NaN;
const totalDrop = (config: RackConfig, server?: number) =>
  config.inletPressure - lastPressure(config, server);

describe('the reference rack', () => {
  test('GF’s 23 L/s over 8 racks is 172,5 L/min per rack and 7,19 L/min per server', () => {
    expect(REFERENCE.rackFlow / LPM).toBeCloseTo(172.5, 10);
    expect(serverFlow(REFERENCE) / LPM).toBeCloseTo(7.1875, 10);
  });
});

describe('RD109_CIRCUIT: the path to the farthest server (24th, top), direct return', () => {
  const profile = rackProfile(REFERENCE);
  const drop = totalDrop(REFERENCE);

  test('is the reference path itself, 79,4 m long', () => {
    expect(rackPath(REFERENCE)).toEqual(RD109_CIRCUIT);
    expect(profile.at(-1)?.x).toBeCloseTo(79.4036, 4);
  });

  test('climbs 1,067 m up the manifold and comes back to its starting height', () => {
    const heights = RD109_CIRCUIT.reduce<number[]>((ys, s) => [...ys, (ys.at(-1) ?? 0) + s.dy], []);

    expect(Math.max(...heights)).toBeCloseTo(1.0668, 4);
    expect(heights.at(-1)).toBeCloseTo(0, 12);
  });

  // Ruling R7: the research's 1,83 bar counted friction twice in the UQDs and the cold plate
  // (research §7.1, errata of 2026-11-17); a component with a Cv or a curve carries its whole loss.
  test('totals 1,80 ± 0,02 bar (1,799), 9,2 % below GF’s published 1,98 bar', () => {
    expect(GF_PUBLISHED_DROP_BAR).toBe(1.98);
    expect(Math.abs(drop / PA_PER_BAR - 1.8)).toBeLessThanOrEqual(0.02);
    expect(drop / PA_PER_BAR).toBeCloseTo(1.799, 3);
    expect((1 - drop / PA_PER_BAR / GF_PUBLISHED_DROP_BAR) * 100).toBeCloseTo(9.2, 1);
  });

  test('the pressure falls from 400,0 to 220,1 kPa abs while the ideal one closes at 400,0', () => {
    expect(profile[0].pReal / KPA).toBeCloseTo(400, 6);
    expect(lastPressure(REFERENCE) / KPA).toBeCloseTo(220.1, 1);
    expect((profile.at(-1)?.pIdeal ?? 0) / KPA).toBeCloseTo(400, 6);
  });

  // Friction is the pipes, hoses and manifold only: 20,78 kPa (the research's 24,2 counted 3,37 kPa
  // of friction inside the UQDs and the cold plate as well).
  test('friction adds 20,78 kPa and the local losses 159,08 kPa', () => {
    const local = RD109_CIRCUIT.reduce((sum, s) => {
      const q = serverFlow(REFERENCE) * (s.flowMultiple ?? 1);
      const k = s.K ? s.K * 0.5 * PG25_40C.rho * flowVelocity(q, s.diameter) ** 2 : 0;
      const cv = s.cv ? cvLoss(q, s.cv, PG25_40C) : 0;
      return sum + k + cv + (s.curve ? curveLoss(s.curve, q) : 0);
    }, 0);

    expect(local / KPA).toBeCloseTo(159.08, 2);
    expect((drop - local) / KPA).toBeCloseTo(20.78, 2);
  });

  test('the main pipe is the fastest pipework, 1,71 m/s, as GF’s 1,7 m/s', () => {
    const main = rackProfile(REFERENCE).find((point) => point.segmentId === 'tuberia-ida');

    expect(main?.v).toBeCloseTo(1.709, 3);
    expect(GF_PUBLISHED.maxPipeVelocity.value).toBe(1.7);
  });

  test('the bottom server (direct return) and the top one (reverse return) differ only by mbar', () => {
    const bottom = totalDrop(REFERENCE, 1);
    const topReverse = totalDrop({ ...REFERENCE, layout: 'invertido' });

    expect(bottom / PA_PER_BAR).toBeCloseTo(1.791, 3);
    // The reverse-return outlet sits one pitch above port N, as in manifold.py (profile.py, and
    // so the research's 1,828 before the errata, left that last header piece out).
    expect(topReverse / PA_PER_BAR).toBeCloseTo(1.795, 3);
    expect(Math.abs(drop - bottom) / 100).toBeLessThan(10);
  });

  test('each UQD04 loses 15,1 kPa at Cv 1,29, 20,8 kPa at OCP’s minimum 1,1 and 9,8 kPa at 1,6', () => {
    const q = serverFlow(REFERENCE);

    expect(cvLoss(q, UQD04.cv.value, PG25_40C) / KPA).toBeCloseTo(15.11, 2);
    expect(cvLoss(q, UQD04.cvMin.value, PG25_40C) / KPA).toBeCloseTo(20.8, 1);
    expect(cvLoss(q, UQD04.cvMax.value, PG25_40C) / KPA).toBeCloseTo(9.8, 1);
  });

  test('pumping it at 23 L/s takes Δp·Q = 4,14 kW, 0,39 % of the 1,06 MW of IT (8 × 132 kW)', () => {
    const power = hydraulicPower(drop, RD109.cduFlow.value);

    expect(power / 1e3).toBeCloseTo(4.14, 2);
    expect((power / (8 * 132e3)) * 100).toBeCloseTo(0.39, 2);
  });
});

describe('PRESETS', () => {
  test('referencia24 and mgx44 are labelled for the lab', () => {
    expect(REFERENCE.label).toBe('Referencia: 24 servidores (RD109)');
    expect(MGX44.label).toBe('MGX: 44 puertos');
    expect([REFERENCE.servers, MGX44.servers]).toEqual([24, 44]);
  });

  test('mgx44: 170 L/min over 44 ports is 3,86 L/min, 0,91 m/s in the hose and 4,4 kPa per UQD; 1,518 bar', () => {
    const q = serverFlow(MGX44);

    expect(q / LPM).toBeCloseTo(3.86, 2);
    expect(flowVelocity(q, MGX44.serverHoseDiameter)).toBeCloseTo(0.908, 3);
    expect(cvLoss(q, UQD04.cv.value, PG25_40C) / KPA).toBeCloseTo(4.37, 2);
    expect(totalDrop(MGX44) / PA_PER_BAR).toBeCloseTo(1.518, 3);
  });

  test('mgx44 keeps every UQD04 within its 6,44 L/min while referencia24 runs it at 7,19 L/min', () => {
    const nominal = UQD04.nominalFlow.value;
    const mgx = rackSplit(MGX44);
    const reference = rackSplit(REFERENCE);

    expect(mgx.converged).toBe(true);
    for (const flow of mgx.flows) expect(flow).toBeLessThanOrEqual(nominal);
    expect(reference.converged).toBe(true);
    for (const flow of reference.flows) {
      expect(flow / LPM).toBeCloseTo(7.19, 1);
      expect(flow).toBeGreaterThan(nominal);
    }
  });

  test('the reference split matches the prototype: 7,2022 L/min at the bottom, 7,1819 at the top', () => {
    const { flows } = rackSplit(REFERENCE);
    const mean = REFERENCE.rackFlow / REFERENCE.servers;

    expect(flows[0] / LPM).toBeCloseTo(7.202, 2);
    expect((flows.at(-1) ?? 0) / LPM).toBeCloseTo(7.182, 2);
    expect(Math.min(...flows) / mean).toBeCloseTo(0.9993, 3);
    expect(Math.max(...flows) / mean).toBeCloseTo(1.0019, 3);
  });

  test('the branch is the server’s hoses, UQDs and cold plate: 159,98 kPa, manifold.py’s 159,96', () => {
    const branch = serverBranch(REFERENCE);

    expect(branch.map((s) => s.id)).toEqual([
      'manguera-servidor-ida',
      'uqd-ida',
      'placa-fria',
      'uqd-vuelta',
      'manguera-servidor-vuelta',
    ]);
    expect(seriesLoss(branch, serverFlow(REFERENCE), PG25_40C) / KPA).toBeCloseTo(159.96, 1);
  });

  test('every field of a preset says where it comes from', () => {
    for (const preset of Object.values(PRESETS) as CoolingPreset[]) {
      const fields = Object.keys(preset).filter(
        (key) => !['id', 'label', 'provenance'].includes(key),
      );

      expect(Object.keys(preset.provenance).sort()).toEqual(fields.sort());
      for (const provenance of Object.values(preset.provenance)) {
        expect(ORIGINS).toContain(provenance.origin);
        expect(provenance.source.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Review Focus 3: a single server and a tiny hose', () => {
  test('one server: the profile is finite and the split gives it the whole rack flow', () => {
    const single: RackConfig = { ...REFERENCE, servers: 1, rackFlow: serverFlow(REFERENCE) };

    const split = rackSplit(single);

    expect(split.flows).toEqual([expect.closeTo(single.rackFlow, 12)]);
    expect(split.converged).toBe(true);
    for (const point of rackProfile(single)) expect(Number.isFinite(point.pReal)).toBe(true);
  });

  test('a 2 mm server hose: every number stays finite and the stiffer branches still converge', () => {
    const tiny: RackConfig = { ...REFERENCE, serverHoseDiameter: 2e-3 };

    const split = rackSplit(tiny);

    for (const point of rackProfile(tiny)) {
      expect(Number.isFinite(point.v)).toBe(true);
      expect(Number.isFinite(point.pReal)).toBe(true);
    }
    expect(split.converged).toBe(true);
    for (const flow of split.flows) expect(Number.isFinite(flow)).toBe(true);
  });

  test('rackPath rejects a server outside 1…N', () => {
    expect(() => rackPath(REFERENCE, 0)).toThrow(RangeError);
    expect(() => rackPath(REFERENCE, 25)).toThrow(RangeError);
    expect(() => rackPath(REFERENCE, 1.5)).toThrow(RangeError);
  });
});

describe('the operating point on the Deschutes curves', () => {
  const curve = (pwm: number) => {
    const found = DESCHUTES_PUMP.curves.find((c) => c.pwm === pwm);
    if (!found) throw new Error(`no ${pwm} % curve`);
    return found;
  };

  test('on 15 RD109 racks (684 GPM at 26,1 psi) the 66 % curve settles at 638 GPM', () => {
    const nominalFlow = 15 * REFERENCE.rackFlow;
    const system = powerLawCurve(totalDrop(REFERENCE), nominalFlow, RD109.systemExponent.value);

    const point = operatingPoint(
      (q) => pumpPressure(curve(66), q),
      (q) => curveLoss(system, q),
      DESCHUTES_PUMP.curveMaxFlow.value,
    );

    expect(nominalFlow / M3S_PER_GPM).toBeCloseTo(684, 0);
    expect(totalDrop(REFERENCE) / PA_PER_PSI).toBeCloseTo(26.1, 1);
    expect((point?.Q ?? 0) / M3S_PER_GPM).toBeCloseTo(638, 0);
    expect((point?.Q ?? 0) / nominalFlow).toBeCloseTo(0.93, 2);
  });
});
