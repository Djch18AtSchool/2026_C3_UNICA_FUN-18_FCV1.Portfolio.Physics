import { describe, expect, test } from 'vitest';
import { DESCHUTES_PUMP } from '../../../lib/data/liquidCooling';
import { M3S_PER_GPM } from '../../../lib/physics/hydraulics';
import { coolingScene, INITIAL_COOLING_STATE, type CoolingLabState } from './coolingScene';
import {
  TARGET_COLOR,
  PUBLISHED_COLOR,
  pumpPlot,
  SERVER_COLOR,
  splitPlot,
  SYSTEM_COLOR,
} from './coolingLabPlots';

const sceneOf = (state: CoolingLabState) => {
  const scene = coolingScene(state);
  if (!scene) throw new Error('the scene should be valid');
  return scene;
};
const REFERENCE = sceneOf(INITIAL_COOLING_STATE);

describe('splitPlot: each server’s flow against its minimum', () => {
  test('one point per port in L/min, the minimum as a dashed line across every port', () => {
    const plot = splitPlot(REFERENCE);
    const [flows, minimum] = plot.series;

    expect(plot.series.map((series) => series.id)).toEqual(['caudal', 'minimo']);
    expect(flows.points).toHaveLength(24);
    expect(flows.points[23].x).toBe(24);
    expect(flows.points[23].y).toBeCloseTo(7.1822, 3);
    expect(flows.color).toBe(SERVER_COLOR);
    expect(minimum).toMatchObject({
      dashed: true,
      color: TARGET_COLOR,
      label: 'Objetivo de diseño de OCP, 1,5 L/min por kW',
    });
    expect(minimum.points.map((point) => point.x)).toEqual([0.5, 24.5]);
    expect(minimum.points[0].y).toBeCloseTo(6.375, 10);
    expect(plot.xDomain).toEqual({ min: 0.5, max: 24.5 });
    expect(plot.yDomain.min).toBeLessThan(6.375);
    expect(plot.yDomain.max).toBeGreaterThan(7.2);
    expect(plot.worst).toMatchObject({ id: 'peor', x: 24 });
    expect(plot.worst.label).toBe('24, el más lejano');
  });

  test('a single server is one point, its own worst', () => {
    const plot = splitPlot(sceneOf({ ...INITIAL_COOLING_STATE, servers: 1 }));

    expect(plot.series[0].points).toEqual([{ x: 1, y: 172.5 }]);
    expect(plot.xDomain).toEqual({ min: 0.5, max: 1.5 });
    expect(plot.worst.x).toBe(1);
  });
});

describe('pumpPlot: Deschutes’ curves, the circuit’s curve and the two points', () => {
  const plot = pumpPlot(REFERENCE);
  const byId = (id: string) => plot.series.find((series) => series.id === id);

  test('the nine published curves as one series, cut where they stop giving pressure, up to 650 GPM', () => {
    const family = byId('deschutes')!;
    const breaks = family.points.filter((point) => Number.isNaN(point.x)).length;

    expect(breaks).toBe(DESCHUTES_PUMP.curves.length - 1);
    expect(family.points.filter((p) => !Number.isNaN(p.y)).every((p) => p.y >= 0)).toBe(true);
    expect(family).toMatchObject({ color: PUBLISHED_COLOR, dashed: true });
    expect(plot.xDomain.max).toBeCloseTo((650 * M3S_PER_GPM) / 1e-3, 9);
    expect(plot.xDomain.min).toBe(0);
  });

  test('the lowest curve that reaches the duty point, solid; the circuit’s curve from 0, in ink', () => {
    const curve = byId('curva')!;
    const system = byId('sistema')!;

    expect(curve.label).toBe('Curva de 66 % PWM, la más baja que da el punto pedido');
    expect(curve.color).toBe(PUBLISHED_COLOR);
    expect(curve.dashed).toBeFalsy();
    expect(system.color).toBe(SYSTEM_COLOR);
    expect(system.points[0]).toEqual({ x: 0, y: 0 });
    const ys = system.points.map((point) => point.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(plot.series.map((series) => series.id)).toEqual(['deschutes', 'curva', 'sistema']);
  });

  test('the duty point at 23,0 L/s and 179,9 kPa; the operating point of the 66 % curve at 28,6 L/s', () => {
    const [duty, operating] = plot.points;

    expect(duty).toMatchObject({ id: 'pedido', label: 'pedido', color: SYSTEM_COLOR });
    expect(duty.x).toBeCloseTo(23, 9);
    expect(duty.y).toBeCloseTo(179.85, 1);
    expect(operating).toMatchObject({ id: 'operacion', label: '66 %', color: PUBLISHED_COLOR });
    expect(operating.x).toBeCloseTo(28.59, 2);
    expect(operating.y).toBeCloseTo(270.6, 1);
    expect(plot.yDomain.max).toBeGreaterThan(820);
  });

  test('with no curve that reaches it, only the family and the circuit; the duty point off the scale goes on the top edge', () => {
    const steep = pumpPlot(
      sceneOf({ ...INITIAL_COOLING_STATE, servers: 1, hose: '1/4', pumpFlow: 225 }),
    );

    expect(steep.series.map((series) => series.id)).toEqual(['deschutes', 'sistema']);
    expect(steep.points).toEqual([]);
    expect(steep.edge?.x).toBeCloseTo(30, 9);
    expect(steep.edge?.label).toMatch(/^pedido: [\d\s\u202f]+,\d\skPa, fuera de escala$/);
  });

  test('a duty point far above the pump keeps the pump’s curves readable: the axis stops at twice their top', () => {
    const steep = pumpPlot(
      sceneOf({ ...INITIAL_COOLING_STATE, servers: 1, hose: '1/4', pumpFlow: 225 }),
    );

    expect(steep.yDomain.max).toBeLessThan(2 * 830 * 1.1);
    expect(steep.yDomain.max).toBeGreaterThan(2 * 820);
    expect(plot.edge).toBeUndefined();
  });

  test('the family is labelled with the published range of speeds', () => {
    expect(byId('deschutes')?.label).toBe('Curvas publicadas de Deschutes, de 33 a 100 % PWM');
  });
});
