// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import EnergyBalanceChart from './EnergyBalanceChart';

const ENERGY_NAMES = [
  'Tracción en ruedas',
  'Carga en carretera',
  'Frenado en ruedas',
  'Devuelta a la batería',
  'Calor de fricción',
];

const readout = () => screen.getByTestId('energy-balance-readout');
const readoutValue = (label: string) =>
  within(readout()).getByText(label).nextElementSibling?.textContent?.replace(/\s+/g, ' ');

describe('EnergyBalanceChart', () => {
  afterEach(() => {
    cleanup();
    resetSettingsForTests();
    localStorage.clear();
    vi.useRealTimers();
  });

  test('draws v(t) above the cumulative energies: two plots with labelled axes', () => {
    render(<EnergyBalanceChart />);

    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByText('Velocidad v (km/h)')).toBeInTheDocument();
    expect(screen.getByText('Energía acumulada (kWh)')).toBeInTheDocument();
    expect(screen.getAllByText('Tiempo t (s)')).toHaveLength(2);
  });

  test('names the five energies in a visible legend', () => {
    render(<EnergyBalanceChart cycle="udds" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });

    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(ENERGY_NAMES);
  });

  test('starts at the end of the cycle, with the totals and the share of traction', () => {
    render(<EnergyBalanceChart />);

    expect(readoutValue('Tiempo t')).toBe('1 369 s');
    expect(readoutValue('Tracción en ruedas')).toBe('1,597 kWh');
    expect(readoutValue('Devuelta a la batería')).toBe('0,695 kWh');
    expect(readoutValue('Batería / tracción')).toBe('43,5 %');
  });

  test('the arrow keys move both cursors together and update the readout', () => {
    render(<EnergyBalanceChart />);
    const [speedSlider, energySlider] = screen.getAllByRole('slider');

    fireEvent.keyDown(energySlider, { key: 'Home' });
    expect(readoutValue('Tiempo t')).toBe('0 s');
    expect(readoutValue('Batería / tracción')).toBe('0,0 %');

    fireEvent.keyDown(speedSlider, { key: 'ArrowRight', shiftKey: true });

    expect(readoutValue('Tiempo t')).toBe('137 s');
    expect(speedSlider).toHaveAttribute('aria-valuenow', '137');
    expect(energySlider).toHaveAttribute('aria-valuenow', '137');
    expect(readoutValue('Tracción en ruedas')).not.toBe('0,000 kWh');
  });

  test('announces the settled readout once the cursor stops', () => {
    vi.useFakeTimers();
    render(<EnergyBalanceChart />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    fireEvent.keyDown(screen.getAllByRole('slider')[1], { key: 'Home' });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(status).toHaveTextContent('t = 0 s');
    expect(status).toHaveTextContent('batería / tracción 0,0 %');
  });
});
