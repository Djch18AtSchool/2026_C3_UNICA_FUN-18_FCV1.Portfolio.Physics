// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { DRONE_ROUTE, generateRoute } from '../../../lib/data/droneRoute';
import DroneProfiles from './DroneProfiles';

const SAMPLES = generateRoute(DRONE_ROUTE);

describe('DroneProfiles', () => {
  afterEach(cleanup);

  test('draws the four profile charts for the samples it receives', () => {
    render(<DroneProfiles samples={SAMPLES} stops={DRONE_ROUTE.stops} t={65} />);

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
});
