import { describe, expect, test } from 'vitest';
import { SHAHI_2023_PORT_FLOWS } from '../../../lib/data/liquidCooling';
import { PRESETS, serverFlow } from '../../../lib/data/liquidCoolingCircuit';
import { M3S_PER_LPM } from '../../../lib/physics/hydraulics';
import {
  branchFlowSeries,
  decadeTicks,
  logScale,
  NO_PLATE_COLOR,
  shahiSeries,
  velocityAreaData,
  WITH_PLATE_COLOR,
} from './coolingCharts';

const REFERENCE = PRESETS.referencia24;
const MM2 = 1e-6;

describe('velocityAreaData: continuity drawn as v against A', () => {
  const data = velocityAreaData(REFERENCE);

  test('three flows, three hyperbolas v = Q/A: the CDU, one rack and one server', () => {
    expect(data.curves.map((curve) => curve.id)).toEqual(['cdu', 'rack', 'servidor']);
    expect(data.curves.map((curve) => curve.flow)).toEqual([
      0.023,
      REFERENCE.rackFlow,
      serverFlow(REFERENCE),
    ]);
    for (const curve of data.curves) {
      for (const point of curve.points) {
        expect(point.y * point.x * MM2, curve.id).toBeCloseTo(curve.flow, 12);
      }
    }
  });

  test('each section of the path sits on the hyperbola of the flow it carries', () => {
    const flows = Object.fromEntries(data.curves.map((curve) => [curve.id, curve.flow]));

    expect(data.sections.map((section) => section.n)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const section of data.sections) {
      expect(section.v * section.area * MM2, section.name).toBeCloseTo(flows[section.flowId], 12);
      expect(section.area).toBeGreaterThan(data.area.min);
      expect(section.area).toBeLessThan(data.area.max);
      expect(section.v).toBeLessThan(data.v.max);
    }
    expect(data.sections.map((section) => section.v.toFixed(2))).toEqual([
      '1.71',
      '1.42',
      '1.84',
      '0.08',
      '1.69',
      '2.91',
    ]);
  });

  test('the manifold runs down its area from the rack’s hyperbola to a server’s', () => {
    const [top, bottom] = data.manifold;

    expect(top.x).toBe(bottom.x);
    expect(top.y).toBeCloseTo(data.sections[2].v, 12);
    expect(bottom.y).toBeCloseTo(data.sections[3].v, 12);
  });
});

describe('logScale and decadeTicks: the area axis spans three decades', () => {
  test('each decade takes the same length and toValue undoes toPx', () => {
    const x = logScale({ min: 10, max: 10_000 }, [0, 300]);

    expect(x.toPx(10)).toBe(0);
    expect(x.toPx(100)).toBeCloseTo(100, 9);
    expect(x.toPx(1000)).toBeCloseTo(200, 9);
    expect(x.toValue(x.toPx(437))).toBeCloseTo(437, 9);
  });

  test('ticks at every power of ten inside the domain', () => {
    expect(decadeTicks({ min: 20, max: 30_000 })).toEqual([100, 1000, 10_000]);
  });

  test('a domain that is not positive cannot be drawn on a log axis', () => {
    expect(() => logScale({ min: 0, max: 10 }, [0, 100])).toThrow(RangeError);
  });
});

describe('branchFlowSeries: the split of the 24-server rack (13.4)', () => {
  const series = branchFlowSeries(REFERENCE);
  const byId = Object.fromEntries(series.map((s) => [s.id, s]));
  const flows = (id: string) => byId[id].points.map((point) => point.y);
  const spread = (id: string) => (Math.max(...flows(id)) - Math.min(...flows(id))) / 7.1875;

  test('with and without cold plates, direct and reverse return, 24 ports each', () => {
    expect(series.map((s) => s.id)).toEqual([
      'placa-directo',
      'placa-invertido',
      'sin-placa-directo',
      'sin-placa-invertido',
    ]);
    for (const s of series) {
      expect(s.converged, s.id).toBe(true);
      expect(s.points.map((point) => point.x)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
      expect(s.points.reduce((sum, point) => sum + point.y, 0)).toBeCloseTo(172.5, 6);
    }
  });

  test('direct return gives the bottom server the most: 7,201 → 7,182 L/min with plates', () => {
    expect(flows('placa-directo')[0]).toBeCloseTo(7.201, 3);
    expect(flows('placa-directo').at(-1)).toBeCloseTo(7.182, 3);
    for (let i = 1; i < 24; i++)
      expect(flows('placa-directo')[i]).toBeLessThan(flows('placa-directo')[i - 1]);
  });

  test('reverse return is symmetric about the middle of the rack', () => {
    const reverse = flows('placa-invertido');

    for (let i = 0; i < 12; i++) expect(reverse[i]).toBeCloseTo(reverse[23 - i], 9);
  });

  test('the cold plate equalises: 0,27 % of spread with it, 1,0 % without it', () => {
    expect(spread('placa-directo') * 100).toBeCloseTo(0.27, 2);
    expect(spread('sin-placa-directo') * 100).toBeCloseTo(0.98, 2);
    expect(spread('placa-invertido')).toBeLessThan(spread('placa-directo'));
  });

  test('colour says plate or no plate; the dash says direct or reverse', () => {
    expect(byId['placa-directo'].color).toBe(WITH_PLATE_COLOR);
    expect(byId['sin-placa-invertido'].color).toBe(NO_PLATE_COLOR);
    expect(series.filter((s) => s.dashed).map((s) => s.layout)).toEqual(['invertido', 'invertido']);
  });
});

describe('shahiSeries: the bench of NVIDIA and UT Arlington, 6 ports at 49,5 L/min', () => {
  test('their network model as a line and their measurement as points, in L/min', () => {
    const { fnm, measured } = shahiSeries();

    expect(fnm.map((point) => point.x)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(fnm[0].y).toBeCloseTo(8.9742, 10);
    expect(measured.map((point) => point.y)).toEqual(
      SHAHI_2023_PORT_FLOWS.measured.flows.map((q) => expect.closeTo(q / M3S_PER_LPM, 10)),
    );
  });
});

describe('velocityAreaData for another rack (the lab, Task 14)', () => {
  test('the 44-port preset names its own count and keeps every point on its hyperbola', () => {
    const data = velocityAreaData(PRESETS.mgx44);

    expect(data.sections[2].name).toBe(
      'Manifold, primer tramo: lleva el caudal de los 44 servidores',
    );
    expect(data.sections[3].id).toBe('manifold-ida-44');
    expect(data.sections[3].v * data.sections[3].area * MM2).toBeCloseTo(
      serverFlow(PRESETS.mgx44),
      12,
    );
  });
});
