import { describe, expect, test } from 'vitest';
import { G_EARTH } from './constants';
import {
  bernoulliPressure,
  branchFlows,
  circuitProfile,
  curveLoss,
  cvLoss,
  darcyLoss,
  flowFactorForPower,
  flowVelocity,
  frictionFactor,
  hydraulicPower,
  LAMINAR_RE,
  M3S_PER_GPM,
  M3S_PER_LPM,
  minorLoss,
  operatingPoint,
  PA_PER_BAR,
  PA_PER_PSI,
  pipeArea,
  powerLawCurve,
  reynolds,
  segmentLoss,
  seriesLoss,
  TURBULENT_RE,
  type Fluid,
  type Segment,
} from './hydraulics';

/*
 * Reference numbers: docs/superpowers/research/2026-11-17-enfriamiento-liquido.md, §6 (the four
 * steps), §7.1 (the profile table) and §7.2–7.3 (the split and the pumping power).
 */

/** PG25 at 40 °C as research §5.1 prints it (the data module derives it from Melinder). */
const PG25: Fluid = { rho: 1010.6, mu: 1.394e-3 };
const SERVER_FLOW = 7.19 * M3S_PER_LPM;
const HOSE_D = 9.5e-3;
const UQD_BORE = 7.24e-3;
const MAIN_D = 0.16 - (2 * 0.16) / 11;
const PLASTIC = 0.005e-3 * 0.3048;
const STEEL = 0.15e-3 * 0.3048;
const KPA = 1e3;
const PITCH = 0.04445;

/** |actual/expected − 1| below `tolerance`: for values the research prints rounded. */
function expectRelative(actual: number, expected: number, tolerance: number): void {
  expect(Math.abs(actual / expected - 1)).toBeLessThan(tolerance);
}

function segment(overrides: Partial<Segment> & Pick<Segment, 'id'>): Segment {
  return {
    label: overrides.id,
    length: 1,
    diameter: HOSE_D,
    roughness: PLASTIC,
    dy: 0,
    ...overrides,
  };
}

/** The MGX header piece of research §7.2: 29 × 54 mm inside, D_h = 4A/P, one 44,45 mm pitch. */
const MGX_AREA = 0.029 * 0.054;
const MGX_HEADER: Segment = segment({
  id: 'manifold',
  length: PITCH,
  diameter: (4 * MGX_AREA) / (2 * (0.029 + 0.054)),
  area: MGX_AREA,
  roughness: STEEL,
  dy: PITCH,
});
const RACK_FLOW = 172.5 * M3S_PER_LPM;

describe('unit conversions', () => {
  test('the psi, the US gallon per minute, the litre per minute and the bar come from their definitions', () => {
    expect(PA_PER_PSI).toBeCloseTo(6894.757293168, 6);
    expect(M3S_PER_GPM).toBeCloseTo(3.785411784e-3 / 60, 15);
    expect(M3S_PER_LPM).toBeCloseTo(1e-3 / 60, 15);
    expect(PA_PER_BAR).toBe(1e5);
  });
});

describe('continuity (13.1)', () => {
  test('pipeArea is πD²/4', () => {
    expect(pipeArea(0.1)).toBeCloseTo((Math.PI * 0.01) / 4, 12);
  });

  test('a server at 7,19 L/min moves at 1,69 m/s in the 9,5 mm hose and 2,91 m/s in the UQD bore', () => {
    const vHose = flowVelocity(SERVER_FLOW, HOSE_D);
    const vBore = flowVelocity(SERVER_FLOW, UQD_BORE);

    expect(vHose).toBeCloseTo(1.69, 2);
    expect(vBore).toBeCloseTo(2.91, 2);
    expect(vBore / vHose).toBeCloseTo((HOSE_D / UQD_BORE) ** 2, 10);
    expect((HOSE_D / UQD_BORE) ** 2).toBeCloseTo(1.72, 2);
  });

  test('the CDU flow of 23 L/s moves at 1,71 m/s in the 130,9 mm main pipe (GF: 1,7 m/s)', () => {
    expect(MAIN_D * 1e3).toBeCloseTo(130.9, 1);
    expect(flowVelocity(0.023, MAIN_D)).toBeCloseTo(1.709, 3);
  });

  test('rejects a diameter that is not positive and a negative or non-finite flow', () => {
    expect(() => pipeArea(0)).toThrow(RangeError);
    expect(() => flowVelocity(SERVER_FLOW, -1)).toThrow(RangeError);
    expect(() => flowVelocity(-1, HOSE_D)).toThrow(RangeError);
    expect(() => flowVelocity(Number.NaN, HOSE_D)).toThrow(RangeError);
  });
});

describe('Bernoulli (13.2), with g = 9,81 m/s²', () => {
  test('entering the UQD bore from the hose, horizontal, the pressure drops 2,84 kPa', () => {
    const vHose = flowVelocity(SERVER_FLOW, HOSE_D);
    const vBore = flowVelocity(SERVER_FLOW, UQD_BORE);

    const p2 = bernoulliPressure(300e3, vHose, 0, vBore, 0, PG25);

    expect((300e3 - p2) / KPA).toBeCloseTo(2.84, 2);
  });

  test('rising 1,067 m up the manifold (24 ports × 44,45 mm) at constant speed costs ρgΔy = 10,6 kPa', () => {
    const rise = 24 * PITCH;

    const p2 = bernoulliPressure(300e3, 1.2, 0, 1.2, rise, PG25);

    expect(rise).toBeCloseTo(1.067, 3);
    expect(300e3 - p2).toBeCloseTo(PG25.rho * G_EARTH * rise, 6);
    expect((300e3 - p2) / KPA).toBeCloseTo(10.6, 1);
  });

  test('without losses the pressure comes back when speed and height come back', () => {
    const down = bernoulliPressure(250e3, 1.69, 0, 2.91, 1, PG25);

    expect(bernoulliPressure(down, 2.91, 1, 1.69, 0, PG25)).toBeCloseTo(250e3, 6);
  });

  test('rejects a fluid without a positive density or viscosity', () => {
    expect(() => bernoulliPressure(1e5, 1, 0, 2, 0, { rho: 0, mu: 1e-3 })).toThrow(RangeError);
    expect(() => reynolds({ rho: 1000, mu: Number.NaN }, 1, 0.01)).toThrow(RangeError);
  });
});

describe('Reynolds and the friction factor', () => {
  test('main pipe: Re ≈ 162 000 and f ≈ 0,0163 (Swamee–Jain, EPANET plastic roughness)', () => {
    const v = flowVelocity(0.023, MAIN_D);

    const re = reynolds(PG25, v, MAIN_D);

    expectRelative(re, 162_161, 0.001);
    expect(frictionFactor(re, PLASTIC, MAIN_D)).toBeCloseTo(0.0163, 4);
  });

  test('3/8″ server hose: Re ≈ 11 600 and f ≈ 0,030', () => {
    const v = flowVelocity(SERVER_FLOW, HOSE_D);

    const re = reynolds(PG25, v, HOSE_D);

    expectRelative(re, 11_638, 0.002);
    expect(frictionFactor(re, PLASTIC, HOSE_D)).toBeCloseTo(0.03, 3);
  });

  test('laminar flow follows Hagen–Poiseuille, f = 64/Re, up to the class limit of 2300', () => {
    expect(frictionFactor(1000, PLASTIC, HOSE_D)).toBe(0.064);
    expect(LAMINAR_RE).toBe(2300);
    expect(frictionFactor(LAMINAR_RE, STEEL, 0.02)).toBeCloseTo(64 / 2300, 12);
  });

  test('fully turbulent flow uses Swamee–Jain: a smooth pipe at Re = 10⁵ gives 0,0179', () => {
    expect(TURBULENT_RE).toBe(4000);
    expect(frictionFactor(1e5, 0, 0.05)).toBeCloseTo(0.01786, 5);
  });

  test('the transition joins both ends without a jump (EPANET’s cubic, from the class limits)', () => {
    const below = frictionFactor(LAMINAR_RE * (1 - 1e-9), STEEL, 0.0377);
    const above = frictionFactor(LAMINAR_RE * (1 + 1e-9), STEEL, 0.0377);
    const beforeTurbulent = frictionFactor(TURBULENT_RE * (1 - 1e-9), STEEL, 0.0377);
    const turbulent = frictionFactor(TURBULENT_RE, STEEL, 0.0377);
    const middle = frictionFactor(3000, STEEL, 0.0377);

    expect(above).toBeCloseTo(below, 9);
    expect(beforeTurbulent).toBeCloseTo(turbulent, 9);
    expect(middle).toBeGreaterThan(Math.min(below, turbulent));
    expect(middle).toBeLessThan(Math.max(below, turbulent));
  });

  test('rejects a Reynolds number that is not positive and a negative roughness', () => {
    expect(() => frictionFactor(0, PLASTIC, HOSE_D)).toThrow(RangeError);
    expect(() => frictionFactor(5000, -1e-6, HOSE_D)).toThrow(RangeError);
  });
});

describe('losses (13.3): Darcy–Weisbach, K and Cv', () => {
  const vHose = flowVelocity(7.1875 * M3S_PER_LPM, HOSE_D);

  test('0,5 m of 3/8″ hose with f = 0,030 loses 2,28 kPa, and its tee (K = 1,8) 2,60 kPa', () => {
    expect(darcyLoss(0.03, 0.5, HOSE_D, PG25, vHose) / KPA).toBeCloseTo(2.28, 2);
    expect(minorLoss(1.8, PG25, vHose) / KPA).toBeCloseTo(2.6, 2);
  });

  test('the UQD04 (Cv = 1,29) at 1,90 GPM loses 15,1 kPa: 5,3 times the reversible Bernoulli drop', () => {
    const loss = cvLoss(1.9 * M3S_PER_GPM, 1.29, PG25);
    const reversible = 0.5 * PG25.rho * (flowVelocity(SERVER_FLOW, UQD_BORE) ** 2 - vHose ** 2);

    expect(loss / KPA).toBeCloseTo(15.1, 1);
    expect(loss / reversible).toBeCloseTo(5.3, 1);
    expect(loss / (0.5 * PG25.rho * vHose ** 2)).toBeCloseTo(10.5, 1);
  });

  test('Cv uses specific gravity against water at 60 °F (999,0 kg/m³): water at 1 Cv loses 1 psi', () => {
    expect(cvLoss(M3S_PER_GPM, 1, { rho: 999, mu: 1e-3 })).toBeCloseTo(PA_PER_PSI, 6);
  });

  test('a power-law curve passes through its nominal point and scales as Qⁿ', () => {
    const curve = powerLawCurve(1.2e5, SERVER_FLOW, 1.85);

    expect(curve.b).toBe(1.85);
    expect(curveLoss(curve, SERVER_FLOW)).toBeCloseTo(1.2e5, 6);
    expect(curveLoss(curve, 2 * SERVER_FLOW) / 1.2e5).toBeCloseTo(2 ** 1.85, 10);
    expect(curveLoss(curve, 0)).toBe(0);
  });

  test('rejects a curve exponent outside the laminar–turbulent range 1…2', () => {
    expect(() => powerLawCurve(1e5, SERVER_FLOW, 0.5)).toThrow(RangeError);
    expect(() => curveLoss({ a: 1, b: 2.5 }, SERVER_FLOW)).toThrow(RangeError);
  });

  test('pumping 1,80 bar at 23 L/s takes Δp·Q = 4,14 kW of hydraulic power', () => {
    expect(hydraulicPower(1.8 * PA_PER_BAR, 0.023) / 1e3).toBeCloseTo(4.14, 2);
  });

  test('with Δp ∝ Q^1,9, oversupplying 51 % triples the pumping power (1,512 → ×3,32)', () => {
    const system = powerLawCurve(1.8e5, 0.023, 1.9);
    const power = (q: number) => hydraulicPower(curveLoss(system, q), q);

    expect(power(1.512 * 0.023) / power(0.023)).toBeCloseTo(3.32, 2);
    expect(power(1.51 * 0.023) / power(0.023)).toBeGreaterThan(3);
  });
});

describe('segmentLoss and seriesLoss', () => {
  test('a stretch of hose adds its Darcy friction and its K', () => {
    const hose = segment({ id: 'manguera', length: 0.5, K: 1.8 });
    const v = flowVelocity(SERVER_FLOW, HOSE_D);
    const f = frictionFactor(reynolds(PG25, v, HOSE_D), PLASTIC, HOSE_D);

    const loss = segmentLoss(hose, SERVER_FLOW, PG25);

    expect(loss).toBeCloseTo(darcyLoss(f, 0.5, HOSE_D, PG25, v) + minorLoss(1.8, PG25, v), 9);
  });

  test('a component with a Cv or a measured curve carries its whole loss: no friction over its drawn length', () => {
    const coupling = segment({ id: 'uqd', length: 0.06, diameter: UQD_BORE, cv: 1.29 });
    const curve = powerLawCurve(1.2e5, SERVER_FLOW, 1.85);
    const plate = segment({ id: 'placa', length: 0.15, curve });
    const both = segment({ id: 'ambos', length: 0.15, K: 1.8, cv: 1.29, curve });
    const v = flowVelocity(SERVER_FLOW, HOSE_D);

    expect(segmentLoss(coupling, SERVER_FLOW, PG25)).toBe(cvLoss(SERVER_FLOW, 1.29, PG25));
    expect(segmentLoss(plate, SERVER_FLOW, PG25)).toBeCloseTo(1.2e5, 6);
    expect(segmentLoss(both, SERVER_FLOW, PG25)).toBeCloseTo(
      minorLoss(1.8, PG25, v) + cvLoss(SERVER_FLOW, 1.29, PG25) + 1.2e5,
      6,
    );
  });

  test('no flow, no loss; a fitting of zero length has no friction', () => {
    expect(segmentLoss(segment({ id: 'a', K: 1.8 }), 0, PG25)).toBe(0);
    const tee = segment({ id: 'te', length: 0, K: 1.8 });
    expect(segmentLoss(tee, SERVER_FLOW, PG25)).toBeCloseTo(
      minorLoss(1.8, PG25, flowVelocity(SERVER_FLOW, HOSE_D)),
      9,
    );
  });

  test('a non-circular section takes its velocity from its area and its friction from D_h', () => {
    const v = RACK_FLOW / MGX_AREA;
    const re = reynolds(PG25, v, MGX_HEADER.diameter);
    const f = frictionFactor(re, STEEL, MGX_HEADER.diameter);

    expect(v).toBeCloseTo(1.836, 3);
    expect(re).toBeCloseTo(50_219, -2);
    expect(segmentLoss(MGX_HEADER, RACK_FLOW, PG25)).toBeCloseTo(
      darcyLoss(f, PITCH, MGX_HEADER.diameter, PG25, v),
      9,
    );
  });

  test('seriesLoss multiplies the path flow by each segment’s flowMultiple', () => {
    const hose = segment({ id: 'manguera', length: 0.5 });
    const rack = segment({ id: 'rack', length: 3, diameter: 0.0508, flowMultiple: 24 });

    const total = seriesLoss([hose, rack], SERVER_FLOW, PG25);

    expect(total).toBeCloseTo(
      segmentLoss(hose, SERVER_FLOW, PG25) + segmentLoss(rack, 24 * SERVER_FLOW, PG25),
      9,
    );
  });

  test('rejects a negative flow', () => {
    expect(() => segmentLoss(segment({ id: 'a' }), -1e-4, PG25)).toThrow(RangeError);
  });
});

describe('circuitProfile', () => {
  const hoseIn = segment({ id: 'manguera-ida', length: 0.5 });
  const bore = segment({ id: 'uqd', length: 0.06, diameter: UQD_BORE, roughness: STEEL, cv: 1.29 });
  const riser = segment({ id: 'subida', length: 1, dy: 1 });
  const hoseBack = segment({ id: 'manguera-vuelta', length: 0.5, dy: -1 });
  const loop = [hoseIn, bore, riser, hoseBack];
  const p0 = 300e3;
  const profile = circuitProfile(loop, SERVER_FLOW, PG25, p0);

  test('two points per segment, at its ends, with x accumulating the lengths', () => {
    const expectedX = [0, 0.5, 0.5, 0.56, 0.56, 1.56, 1.56, 2.06];

    expect(profile).toHaveLength(2 * loop.length);
    profile.forEach((point, i) => expect(point.x).toBeCloseTo(expectedX[i], 12));
    expect(profile.map((point) => point.segmentId)).toEqual(loop.flatMap((s) => [s.id, s.id]));
  });

  test('the velocity steps exactly where the section changes and equals Q/A', () => {
    expect(profile[1].v).toBeCloseTo(flowVelocity(SERVER_FLOW, HOSE_D), 12);
    expect(profile[2].v).toBeCloseTo(flowVelocity(SERVER_FLOW, UQD_BORE), 12);
    expect(profile[2].x).toBe(profile[1].x);
  });

  test('the ideal pressure dips 2,84 kPa in the bore, loses ρgy uphill and closes the loop at p₀', () => {
    expect(profile[0].pIdeal).toBe(p0);
    expect((profile[1].pIdeal - profile[2].pIdeal) / KPA).toBeCloseTo(2.84, 2);
    expect(profile[5].pIdeal - profile[4].pIdeal).toBeCloseTo(-PG25.rho * G_EARTH, 6);
    expect(profile.at(-1)?.pIdeal).toBeCloseTo(p0, 6);
  });

  test('the real pressure ends below p₀ by the total loss, and never above the ideal one', () => {
    const total = seriesLoss(loop, SERVER_FLOW, PG25);

    expect(profile.at(-1)?.pReal).toBeCloseTo(p0 - total, 6);
    for (const point of profile) expect(point.pReal).toBeLessThanOrEqual(point.pIdeal);
  });

  test('a segment that carries several servers runs faster by its flowMultiple', () => {
    const rack = segment({ id: 'rack', diameter: 0.0508, flowMultiple: 24 });

    const [start] = circuitProfile([rack], SERVER_FLOW, PG25, p0);

    expect(start.v).toBeCloseTo(flowVelocity(24 * SERVER_FLOW, 0.0508), 12);
  });

  test('an empty path has no profile', () => {
    expect(circuitProfile([], SERVER_FLOW, PG25, p0)).toEqual([]);
  });

  test('Review Focus 3: a 2 mm hose gives large but finite numbers', () => {
    const tiny = segment({ id: 'manguera-2mm', length: 0.5, diameter: 2e-3, K: 1.8 });

    const points = circuitProfile([tiny, bore], SERVER_FLOW, PG25, p0);

    for (const point of points) {
      expect(Number.isFinite(point.v)).toBe(true);
      expect(Number.isFinite(point.pIdeal)).toBe(true);
      expect(Number.isFinite(point.pReal)).toBe(true);
    }
  });

  test('rejects a flow that is not positive and a non-finite inlet pressure', () => {
    expect(() => circuitProfile(loop, 0, PG25, p0)).toThrow(RangeError);
    expect(() => circuitProfile(loop, SERVER_FLOW, PG25, Number.NaN)).toThrow(RangeError);
  });
});

describe('branchFlows (13.4): servers in parallel between two headers', () => {
  const q = RACK_FLOW / 24;
  /** A branch without cold plate (research §7.2, second row): 0,10 bar at the mean flow, n = 2. */
  const lowBranch = powerLawCurve(0.1 * PA_PER_BAR, q, 2);
  const split = (layout: 'directo' | 'invertido', header = MGX_HEADER, branchCurve = lowBranch) =>
    branchFlows({ Qrack: RACK_FLOW, branchCurve, header, ports: 24, layout, f: PG25 });
  const direct = split('directo');
  const reverse = split('invertido');
  const spread = (flows: number[]) => (Math.max(...flows) - Math.min(...flows)) / (RACK_FLOW / 24);

  test('both layouts converge and share exactly the rack flow', () => {
    for (const result of [direct, reverse]) {
      expect(result.converged).toBe(true);
      expect(result.iterations).toBeLessThan(500);
      expect(result.flows).toHaveLength(24);
      expect(result.flows.reduce((sum, flow) => sum + flow, 0)).toBeCloseTo(RACK_FLOW, 12);
    }
  });

  test('direct return gives the nearest server the most flow, decreasing up the rack', () => {
    const flows = direct.flows;

    expect(Math.max(...flows)).toBe(flows[0]);
    for (let i = 1; i < flows.length; i++) expect(flows[i]).toBeLessThan(flows[i - 1]);
    expect(spread(flows)).toBeGreaterThan(0.02);
  });

  test('reverse return keeps equal branches within 2 % of each other', () => {
    expect(spread(reverse.flows)).toBeLessThan(0.02);
    expect(spread(reverse.flows)).toBeLessThan(spread(direct.flows));
  });

  test('reproduces research §7.2 for the narrow 3/4″ header: direct 0,634 · 1,919 · 1,578, reverse 0,734 · 1,426', () => {
    const narrow: Segment = { ...MGX_HEADER, diameter: 0.019, area: undefined };

    const { flows, converged } = split('directo', narrow);
    const mean = RACK_FLOW / 24;

    expect(converged).toBe(true);
    const reverse = split('invertido', narrow).flows;

    expect(Math.min(...flows) / mean).toBeCloseTo(0.634, 3);
    expect(Math.max(...flows) / mean).toBeCloseTo(1.919, 3);
    expect(mean / Math.min(...flows)).toBeCloseTo(1.578, 3);
    expect(Math.min(...reverse) / mean).toBeCloseTo(0.734, 3);
    expect(Math.max(...reverse) / mean).toBeCloseTo(1.426, 3);
  });

  test('a single server takes the whole rack flow at once', () => {
    const one = branchFlows({
      Qrack: RACK_FLOW,
      branchCurve: lowBranch,
      header: MGX_HEADER,
      ports: 1,
      layout: 'directo',
      f: PG25,
    });

    expect(one.flows).toHaveLength(1);
    expect(one.flows[0]).toBeCloseTo(RACK_FLOW, 12);
    expect(one.converged).toBe(true);
    expect(one.iterations).toBe(1);
  });

  test('Review Focus 3: a 2 mm header never returns NaN: finite flows, or converged: false', () => {
    const tinyHeader: Segment = { ...MGX_HEADER, diameter: 2e-3, area: undefined };

    for (const layout of ['directo', 'invertido'] as const) {
      const result = split(layout, tinyHeader);

      expect(typeof result.converged).toBe('boolean');
      expect(result.iterations).toBeLessThanOrEqual(500);
      for (const flow of result.flows) {
        expect(Number.isFinite(flow)).toBe(true);
        expect(flow).toBeGreaterThanOrEqual(0);
      }
      expect(result.flows.reduce((sum, flow) => sum + flow, 0)).toBeCloseTo(RACK_FLOW, 9);
    }
  });

  test('stops at 500 iterations and says converged: false when the split keeps moving', () => {
    const header: Segment = { ...MGX_HEADER, diameter: 4e-3, area: undefined };
    const stiff = powerLawCurve(10, q, 1);

    const result = split('directo', header, stiff);

    expect(result.converged).toBe(false);
    expect(result.iterations).toBe(500);
    for (const flow of result.flows) expect(Number.isFinite(flow)).toBe(true);
  });

  test('absurd header losses (1e-40 m) still split exactly the rack flow, nearly all to port 1', () => {
    const absurd: Segment = { ...MGX_HEADER, diameter: 1e-40, area: undefined };

    const { flows, converged } = split('directo', absurd);

    expect(converged).toBe(false);
    expect(flows.reduce((sum, flow) => sum + flow, 0)).toBeCloseTo(RACK_FLOW, 12);
    expect(flows[0] / RACK_FLOW).toBeGreaterThan(0.999);
  });

  test('losses that overflow to infinity (1e-80 m) stop at once with the last finite flows', () => {
    const overflow: Segment = { ...MGX_HEADER, diameter: 1e-80, area: undefined };

    const result = split('directo', overflow);

    expect(result).toEqual({
      flows: Array(24).fill(RACK_FLOW / 24),
      converged: false,
      iterations: 1,
    });
  });

  test('rejects a port count that is not a positive integer and a rack flow that is not positive', () => {
    const base = { Qrack: RACK_FLOW, branchCurve: lowBranch, header: MGX_HEADER, f: PG25 };

    expect(() => branchFlows({ ...base, ports: 0, layout: 'directo' })).toThrow(RangeError);
    expect(() => branchFlows({ ...base, ports: 2.5, layout: 'directo' })).toThrow(RangeError);
    expect(() => branchFlows({ ...base, Qrack: 0, ports: 4, layout: 'directo' })).toThrow(
      RangeError,
    );
  });
});

describe('operatingPoint', () => {
  const pump = (q: number) => 100 - 10 * q;
  const system = (q: number) => 5 * q * q;

  test('finds where the pump curve meets the system curve', () => {
    const point = operatingPoint(pump, system, 10);
    const expected = (-10 + Math.sqrt(100 + 4 * 5 * 100)) / (2 * 5);

    expect(point?.Q).toBeCloseTo(expected, 9);
    expect(point?.dp).toBeCloseTo(system(expected), 6);
  });

  test('is null when the pump cannot start the flow or the crossing lies beyond Qmax', () => {
    expect(operatingPoint(() => -1, system, 10)).toBeNull();
    expect(operatingPoint(pump, system, 2)).toBeNull();
  });

  test('is null instead of NaN when a curve is not finite', () => {
    expect(operatingPoint(() => Number.NaN, system, 10)).toBeNull();
    expect(operatingPoint(pump, (q) => (q > 5 ? Number.NaN : 5 * q * q), 10)).toBeNull();
    expect(operatingPoint(pump, (q) => (q > 3 && q < 4 ? Number.NaN : 5 * q * q), 10)).toBeNull();
  });

  test('rejects a Qmax that is not positive', () => {
    expect(() => operatingPoint(pump, system, 0)).toThrow(RangeError);
  });
});

describe('flowFactorForPower: P = Δp·Q with Δp ∝ Qⁿ grows as Qⁿ⁺¹', () => {
  test('tripling the pumping power with n = 1,9 takes 46 % more flow, not the 51 % of the research', () => {
    const factor = flowFactorForPower(3, 1.9);

    expect(factor).toBeCloseTo(3 ** (1 / 2.9), 12);
    expect(factor ** 2.9).toBeCloseTo(3, 12);
    expect(Math.round((factor - 1) * 100)).toBe(46);
  });

  test('the same power needs the same flow, and a laminar loss (n = 1) takes √k', () => {
    expect(flowFactorForPower(1, 1.9)).toBe(1);
    expect(flowFactorForPower(4, 1)).toBeCloseTo(2, 12);
  });

  test('rejects a power factor or an exponent that is not positive', () => {
    expect(() => flowFactorForPower(0, 1.9)).toThrow(RangeError);
    expect(() => flowFactorForPower(3, 0)).toThrow(RangeError);
    expect(() => flowFactorForPower(Number.NaN, 1.9)).toThrow(RangeError);
  });
});
