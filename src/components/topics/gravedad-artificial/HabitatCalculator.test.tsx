// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import HabitatCalculator from './HabitatCalculator';

/** formatNumber joins value and unit with a narrow no-break space (U+202F). */
const NNBSP = ' ';

function readout(label: string): string {
  const row = within(screen.getByTestId('habitat-readouts')).getByText(label).parentElement;
  return row?.lastElementChild?.textContent ?? '';
}

describe('HabitatCalculator', () => {
  afterEach(cleanup);

  test('starts in "fix 1 g" mode: 1 rpm needs 894,6 m', () => {
    render(<HabitatCalculator />);

    expect(screen.getByRole('radio', { name: 'Fijar 1 g y despejar r' })).toBeChecked();
    expect(readout('Radio necesario para 1 g')).toBe(`894,6${NNBSP}m`);
    expect(readout('Gravedad aparente')).toBe(`1,00${NNBSP}g`);
  });

  test('2 rpm needs 223,6 m, with a 0,80 % head-to-foot difference', () => {
    render(<HabitatCalculator />);

    fireEvent.change(screen.getByLabelText(/^Velocidad de giro/), { target: { value: '2' } });

    expect(readout('Radio necesario para 1 g')).toBe(`223,6${NNBSP}m`);
    expect(readout('Período T')).toBe(`30,0${NNBSP}s`);
    expect(readout('Diferencia cabeza–pies')).toBe(`0,80${NNBSP}%`);
  });

  test('fixing r = 100 m needs 2,99 rpm', () => {
    render(<HabitatCalculator />);

    fireEvent.click(screen.getByRole('radio', { name: 'Fijar r y despejar RPM' }));
    fireEvent.change(screen.getByLabelText(/^Radio del hábitat/), { target: { value: '100' } });

    expect(readout('Velocidad de giro necesaria para 1 g')).toBe(`2,99${NNBSP}RPM`);
    expect(readout('Aceleración centrípeta')).toBe(`9,81${NNBSP}m/s²`);
  });

  test('the Stanford preset shows the published design: 830 m at 1 rpm gives 0,93 g', () => {
    render(<HabitatCalculator />);

    fireEvent.click(screen.getByRole('button', { name: /^Toro de Stanford/ }));

    expect(screen.getByRole('radio', { name: 'Fijar r y despejar RPM' })).toBeChecked();
    expect(screen.getByLabelText(/^Radio del hábitat/)).toHaveValue('830');
    expect(readout('Velocidad de giro del diseño')).toBe(`1,00${NNBSP}RPM`);
    expect(readout('Gravedad aparente')).toBe(`0,93${NNBSP}g`);
    expect(readout('Velocidad tangencial v')).toBe(`86,9${NNBSP}m/s`);
  });

  test('moving a control after a preset solves for 1 g again', () => {
    render(<HabitatCalculator />);

    fireEvent.click(screen.getByRole('button', { name: /^Centrífuga pequeña/ }));
    expect(readout('Diferencia cabeza–pies')).toBe(`18,00${NNBSP}%`);
    fireEvent.change(screen.getByLabelText(/^Radio del hábitat/), { target: { value: '4000' } });

    expect(readout('Velocidad de giro necesaria para 1 g')).toBe(`0,47${NNBSP}RPM`);
  });

  test('reset returns to the initial mode and value', () => {
    render(<HabitatCalculator />);

    fireEvent.click(screen.getByRole('button', { name: /^Límite SP-413/ }));
    expect(readout('Gravedad aparente')).toBe(`1,00${NNBSP}g`);
    expect(readout('Velocidad tangencial v')).toBe(`93,7${NNBSP}m/s`);
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(screen.getByRole('radio', { name: 'Fijar 1 g y despejar r' })).toBeChecked();
    expect(readout('Radio necesario para 1 g')).toBe(`894,6${NNBSP}m`);
  });
});
