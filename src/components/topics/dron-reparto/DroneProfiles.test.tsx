// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { DRONE_ROUTE, generateRoute } from '../../../lib/data/droneRoute';
import DroneProfiles, { buildCharts } from './DroneProfiles';

const SAMPLES = generateRoute(DRONE_ROUTE);

describe('DroneProfiles', () => {
  afterEach(cleanup);

  test('draws the four profile charts for the samples it receives', () => {
    render(<DroneProfiles samples={SAMPLES} definition={DRONE_ROUTE} t={65} />);

    const root = screen.getByTestId('drone-profiles');
    for (const title of [
      'Posición: x(t) y y(t)',
      'Velocidad: vx(t), vy(t) y |v|(t)',
      'Aceleración: ax(t), ay(t) y |a|(t)',
      'Distancia recorrida frente a |Δr| desde el depósito',
    ]) {
      expect(root).toHaveTextContent(title);
    }
  });

  test('velocity and acceleration span ±1,15 times their limits, whatever the samples', () => {
    const domain = (id: string, vMax: number, aMax: number) =>
      buildCharts(SAMPLES, { ...DRONE_ROUTE, vMax, aMax }).find((chart) => chart.id === id)?.yAxis
        .domain;

    expect(domain('velocidad', 10, 2.5)).toEqual([-11.5, 11.5]);
    expect(domain('aceleracion', 10, 2.5)?.map((v) => Number(v.toFixed(3)))).toEqual([
      -2.875, 2.875,
    ]);
    expect(domain('velocidad', 15, 5)?.[1]).toBeCloseTo(17.25, 9);
    expect(domain('posicion', 10, 2.5)).toEqual([0, 1500]);
    const ticks = buildCharts(SAMPLES, DRONE_ROUTE).find((chart) => chart.id === 'velocidad')?.yAxis
      .ticks;
    expect(ticks).toEqual([-10, -5, 0, 5, 10]);
  });
});
