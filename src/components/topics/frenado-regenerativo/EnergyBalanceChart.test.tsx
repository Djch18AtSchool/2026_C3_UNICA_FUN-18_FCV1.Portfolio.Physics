// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { cursorX } from '../../lab/svgPlotTestKit';
import EnergyBalanceChart from './EnergyBalanceChart';
import { ENERGY_SERIES } from './regenScene';

const readout = () => screen.getByTestId('energy-balance-readout');
const readoutValue = (label: string) =>
  within(readout()).getByText(label).nextElementSibling?.textContent?.replace(/\s+/g, ' ');
/** "0,161 kWh" → 0.161 */
const readoutNumber = (label: string) =>
  Number(readoutValue(label)?.split(' ')[0].replace(',', '.'));
/** The lab's label, with its no-break spaces as the DOM text matcher normalises them. */
const LOSS_LABEL = (ENERGY_SERIES.find((s) => s.key === 'eConversionLoss')?.label ?? '').replace(
  /\s+/g,
  ' ',
);

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

  test('names the six energies of the lab in a visible legend, the losses apart from braking', () => {
    const { container } = render(<EnergyBalanceChart cycle="udds" />);
    const legend = screen.getByRole('list', { name: 'Leyenda' });
    const stroke = (key: string) =>
      container.querySelector(`[data-series="${key}"]`)?.getAttribute('stroke');

    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(ENERGY_SERIES.map((s) => s.label));
    expect(stroke('eConversionLoss')).toBe('var(--chart-6)');
    expect(stroke('eConversionLoss')).not.toBe(stroke('eBrake'));
  });

  test('starts at the end of the cycle, with the totals, the dissipated sum and the share', () => {
    render(<EnergyBalanceChart />);

    expect(readoutValue('Tiempo t')).toBe('1 369 s');
    expect(readoutValue('Tracción en las ruedas')).toBe('1,597 kWh');
    expect(readoutValue('A la batería')).toBe('0,645 kWh');
    expect(readoutValue(LOSS_LABEL)).toBe('0,161 kWh');
    expect(readoutValue('Calor de fricción')).toBe('0,062 kWh');
    expect(readoutNumber('Disipado: pérdidas + fricción')).toBeCloseTo(
      readoutNumber(LOSS_LABEL) + readoutNumber('Calor de fricción'),
      2,
    );
    expect(readoutValue('Batería / tracción')).toBe('40,4 %');
  });

  test('one slider on the energy plot moves the cursor of both plots and the readout', () => {
    const { container } = render(<EnergyBalanceChart />);
    const sliders = screen.getAllByRole('slider');
    const cursorAt = (testId: string) => cursorX(screen.getByTestId(testId));

    expect(sliders).toHaveLength(1);
    expect(container.querySelectorAll('[data-cursor]')).toHaveLength(2);
    fireEvent.keyDown(sliders[0], { key: 'Home' });
    expect(readoutValue('Tiempo t')).toBe('0 s');
    expect(readoutValue('Batería / tracción')).toBe('0,0 %');
    const atStart = cursorAt('energy-balance-speed');

    fireEvent.keyDown(sliders[0], { key: 'ArrowRight', shiftKey: true });

    expect(readoutValue('Tiempo t')).toBe('137 s');
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '137');
    expect(cursorAt('energy-balance-speed')).not.toBe(atStart);
    expect(readoutValue('Tracción en las ruedas')).not.toBe('0,000 kWh');
  });

  test('announces the settled readout once the cursor stops', () => {
    vi.useFakeTimers();
    render(<EnergyBalanceChart />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'Home' });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(status).toHaveTextContent('t = 0 s');
    expect(status).toHaveTextContent('disipado: pérdidas + fricción 0,000 kWh');
    expect(status).toHaveTextContent('batería / tracción 0,0 %');
  });
});
