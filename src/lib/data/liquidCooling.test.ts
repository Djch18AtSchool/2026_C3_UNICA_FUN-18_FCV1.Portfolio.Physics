import { describe, expect, test } from 'vitest';
import { M3S_PER_GPM, M3S_PER_LPM, PA_PER_BAR, PA_PER_PSI } from '../physics/hydraulics';
import {
  DESCHUTES_PUMP,
  EPANET_VALUES,
  FLOW_PER_KW,
  FLOW_PER_KW_LPM,
  GF_PUBLISHED,
  GF_PUBLISHED_DROP_BAR,
  MGX_MANIFOLD,
  PG25_40C,
  pumpPressure,
  RD109,
  SHAHI_2023_PORT_FLOWS,
  UQD04,
  type Provenance,
} from './liquidCooling';

/*
 * Every number below is printed in docs/superpowers/research/2026-11-17-enfriamiento-liquido.md
 * (§5 sources, §7 reference calculation and its errata) or in the prototype outputs it came from.
 */

const LPM = M3S_PER_LPM;
const ORIGINS = ['producto', 'ilustrativo', 'calculo'];

describe('PG25 at 40 °C, the RD109 supply', () => {
  test('ρ = 1010,6 kg/m³ and μ = 1,394 mPa·s, the values of research §5.1', () => {
    expect(PG25_40C.rho).toBeCloseTo(1010.6, 1);
    expect(PG25_40C.mu * 1e3).toBeCloseTo(1.394, 3);
    expect(PG25_40C.temperatureC).toBe(40);
    expect(PG25_40C.origin).toBe('calculo');
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

  test('RD109 with GF: 23 L/s per CDU of 8 racks with 24 servers, a 130,9 mm main pipe and 4 bar abs', () => {
    expect(RD109.cduFlow.value).toBe(0.023);
    expect([RD109.racks.value, RD109.servers.value]).toEqual([8, 24]);
    expect(RD109.mainPipeDiameter.value * 1e3).toBeCloseTo(130.9, 1);
    expect(RD109.inletPressure.value / PA_PER_BAR).toBe(4);
  });

  test('GF’s published breakdown adds up to its 1,98 bar', () => {
    const sum = GF_PUBLISHED.breakdown.reduce((total, item) => total + item.dp, 0);

    expect(sum / PA_PER_BAR).toBeCloseTo(GF_PUBLISHED_DROP_BAR, 10);
    expect(GF_PUBLISHED.breakdown.find((item) => item.id === 'placas-frias')?.dp).toBe(1.2e5);
    expect(GF_PUBLISHED.cfdManifoldFlow.value / LPM).toBeCloseTo(170, 10);
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
