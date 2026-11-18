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
  EPANET_VALUES,
  FLOW_PER_KW,
  FLOW_PER_KW_LPM,
  GF_PUBLISHED,
  GF_PUBLISHED_DROP_BAR,
  MGX_MANIFOLD,
  PG25_40C,
  PRESETS,
  propyleneGlycolWater,
  pumpPressure,
  rackPath,
  rackProfile,
  rackSplit,
  RD109,
  RD109_CIRCUIT,
  serverBranch,
  serverFlow,
  SHAHI_2023_PORT_FLOWS,
  UQD04,
  volumeToMassFraction,
  type CoolingPreset,
  type Provenance,
  type RackConfig,
} from './liquidCooling';

/*
 * Every number below is printed in docs/superpowers/research/2026-11-17-enfriamiento-liquido.md
 * (§5 sources, §6 steps, §7 reference calculation) or in the prototype outputs it came from.
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

describe('PG25 at 40 °C (Melinder 2010, as coded in Modelica Buildings v14.0.0)', () => {
  test('25 % by volume is a mass fraction of 0,2601 at 20 °C', () => {
    expect(volumeToMassFraction(0.25, 20)).toBeCloseTo(0.2601, 4);
  });

  test('ρ = 1010,6 kg/m³ and μ = 1,394 mPa·s, the values of research §5.1', () => {
    expect(PG25_40C.rho).toBeCloseTo(1010.6, 1);
    expect(PG25_40C.mu * 1e3).toBeCloseTo(1.394, 3);
    expect(PG25_40C.temperatureC).toBe(40);
    expect(PG25_40C.origin).toBe('calculo');
  });

  test('the viscosity falls from 2,541 to 1,102 mPa·s between 20 and 50 °C (×2,3)', () => {
    const cold = propyleneGlycolWater(0.25, 20).mu;
    const hot = propyleneGlycolWater(0.25, 50).mu;

    expect(cold * 1e3).toBeCloseTo(2.541, 3);
    expect(hot * 1e3).toBeCloseTo(1.102, 3);
    expect(cold / hot).toBeCloseTo(2.3, 1);
  });

  test('with no glycol it reproduces water at 30 °C (NIST: 995,74 kg/m³, 0,797 22 mPa·s) within 0,03 %', () => {
    const water = propyleneGlycolWater(0, 30);

    expect(Math.abs(water.rho / 995.74 - 1)).toBeLessThan(3e-4);
    expect(water.mu * 1e3).toBeCloseTo(0.7967, 4);
  });

  test('rejects a volume fraction outside 0…0,6 and a non-finite temperature', () => {
    expect(() => propyleneGlycolWater(0.7, 40)).toThrow(RangeError);
    expect(() => propyleneGlycolWater(-0.1, 40)).toThrow(RangeError);
    expect(() => propyleneGlycolWater(0.25, Number.NaN)).toThrow(RangeError);
  });
});

describe('the flow rule and the parts of the circuit', () => {
  test('the system exponent 1,9 is the OAI 8x1 loop: 2,6 → 12,9 psi between 6 and 14 L/min', () => {
    const fitted = Math.log(12.9 / 2.6) / Math.log(14 / 6);

    expect(fitted).toBeCloseTo(1.89, 2);
    expect(RD109.systemExponent.value).toBe(Math.round(fitted * 10) / 10);
    expect(RD109.systemExponent.source).toMatch(/2,6 a 12,9 psi entre 6 y 14 L\/min/);
  });

  test('OCP’s design rule is 1,5 L/min per kW', () => {
    expect(FLOW_PER_KW_LPM).toBe(1.5);
    expect(FLOW_PER_KW.value).toBe(1.5);
    expect(FLOW_PER_KW.source).toMatch(/OCP/);
  });

  test('UQD04: Cv 1,29 (Amphenol), 6,44 L/min nominal and a 7,24 mm bore (OCP v2.0.0)', () => {
    expect(UQD04.cv.value).toBe(1.29);
    expect(UQD04.cv.source).toMatch(/Amphenol/);
    expect(UQD04.nominalFlow.value / LPM).toBeCloseTo(6.44, 10);
    expect(UQD04.bore.value).toBe(7.24e-3);
    expect(UQD04.nominalFlow.source).toMatch(/OCP/);
    expect([UQD04.cvMin.value, UQD04.cvMax.value]).toEqual([1.1, 1.6]);
  });

  test('MGX manifold: 35 × 60 mm tube with 3 mm wall, 1566 mm² inside, D_h = 37,7 mm, 44 ports at 44,45 mm', () => {
    expect(MGX_MANIFOLD.innerArea.value * 1e6).toBeCloseTo(1566, 6);
    expect(MGX_MANIFOLD.hydraulicDiameter.value * 1e3).toBeCloseTo(37.7, 1);
    expect(MGX_MANIFOLD.ports.value).toBe(44);
    expect(MGX_MANIFOLD.portPitch.value).toBe(0.04445);
    expect(MGX_MANIFOLD.innerArea.origin).toBe('calculo');
  });

  test('EPANET’s tables: plastic 0,0015 mm, steel 0,046 mm and K = 1,8 for a branch tee', () => {
    expect(EPANET_VALUES.roughnessPlastic.value * 1e3).toBeCloseTo(0.0015, 4);
    expect(EPANET_VALUES.roughnessSteel.value * 1e3).toBeCloseTo(0.046, 3);
    expect(EPANET_VALUES.teeK.value).toBe(1.8);
  });

  test('RD109 with GF: 23 L/s for 8 racks is 172,5 L/min per rack and 7,19 L/min per server', () => {
    expect(RD109.cduFlow.value).toBe(0.023);
    expect(REFERENCE.rackFlow / LPM).toBeCloseTo(172.5, 10);
    expect(serverFlow(REFERENCE) / LPM).toBeCloseTo(7.1875, 10);
    expect(RD109.mainPipeDiameter.value * 1e3).toBeCloseTo(130.9, 1);
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

  test('GF’s published breakdown adds up to its 1,98 bar', () => {
    const sum = GF_PUBLISHED.breakdown.reduce((total, item) => total + item.dp, 0);

    expect(sum / PA_PER_BAR).toBeCloseTo(GF_PUBLISHED_DROP_BAR, 10);
    expect(GF_PUBLISHED.breakdown.find((item) => item.id === 'placas-frias')?.dp).toBe(1.2e5);
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

describe('DESCHUTES_PUMP (OCP Project Deschutes, fig. 5.1.1, PG25, two pumps)', () => {
  const curve = (pwm: number) => {
    const found = DESCHUTES_PUMP.curves.find((c) => c.pwm === pwm);
    if (!found) throw new Error(`no ${pwm} % curve`);
    return found;
  };
  const psiAt500 = (pwm: number) =>
    pumpPressure(curve(pwm), DESCHUTES_PUMP.ratedFlow.value) / PA_PER_PSI;

  test('is rated 500 GPM at 80–90 psi, which the 90–95 % PWM curves give', () => {
    expect(DESCHUTES_PUMP.ratedFlow.value / M3S_PER_GPM).toBeCloseTo(500, 10);
    expect(DESCHUTES_PUMP.ratedDpMin.value / PA_PER_PSI).toBeCloseTo(80, 10);
    expect(DESCHUTES_PUMP.ratedDpMax.value / PA_PER_PSI).toBeCloseTo(90, 10);
    expect(psiAt500(100)).toBeCloseTo(106.2, 1);
    expect(psiAt500(95)).toBeCloseTo(91.9, 1);
    expect(psiAt500(90)).toBeCloseTo(80.5, 1);
    expect(DESCHUTES_PUMP.curves.map((c) => c.pwm)).toEqual([100, 95, 90, 83, 80, 75, 66, 50, 33]);
  });

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

describe('SHAHI_2023_PORT_FLOWS (NVIDIA and UT Arlington, 6 ports, 49,5 L/min, no cold plates)', () => {
  test('the FNM flows written on fig. 5 fall from port 1 to 6 and add up to 49,5 L/min', () => {
    const fnm = SHAHI_2023_PORT_FLOWS.fnm.flows.map((q) => q / LPM);

    expect(fnm).toHaveLength(6);
    expect(fnm[0]).toBeCloseTo(8.9742, 10);
    for (let i = 1; i < fnm.length; i++) expect(fnm[i]).toBeLessThan(fnm[i - 1]);
    expect(fnm.reduce((sum, q) => sum + q, 0)).toBeCloseTo(49.5, 1);
  });

  test('the measured flows are an approximate reading of fig. 4 and add up to the same rack flow', () => {
    const measured = SHAHI_2023_PORT_FLOWS.measured;

    expect(measured.approximate).toBe(true);
    expect(measured.flows).toHaveLength(6);
    expect(measured.flows.reduce((sum, q) => sum + q, 0) / LPM).toBeCloseTo(49.5, 1);
    expect(SHAHI_2023_PORT_FLOWS.layout).toBe('directo');
  });
});

describe('model vs product: every value says its origin and its source', () => {
  const everything: unknown[] = [
    FLOW_PER_KW,
    ...Object.values(EPANET_VALUES),
    ...Object.values(UQD04),
    ...Object.values(MGX_MANIFOLD),
    ...Object.values(DESCHUTES_PUMP),
    ...Object.values(RD109),
    ...Object.values(GF_PUBLISHED),
    ...Object.values(SHAHI_2023_PORT_FLOWS),
    ...DESCHUTES_PUMP.curves,
    ...GF_PUBLISHED.breakdown,
    PG25_40C,
  ];
  const sourced = everything.filter((item): item is Provenance => {
    return typeof item === 'object' && item !== null && 'origin' in item;
  });

  test('origin is producto, ilustrativo or calculo, and the source is never empty', () => {
    expect(sourced.length).toBeGreaterThan(50);
    for (const item of sourced) {
      expect(ORIGINS).toContain(item.origin);
      expect(item.source.trim().length).toBeGreaterThan(0);
    }
  });

  test('a computed value says so in its source', () => {
    for (const item of sourced.filter((s) => s.origin === 'calculo')) {
      expect(item.source).toMatch(/^Cálculo propio/);
    }
  });
});
