// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import JumpSimulator from './JumpSimulator';

/** formatNumber joins value and unit with a narrow no-break space (U+202F). */
const NNBSP = '\u202f';

function readout(label: string): string {
  const row = within(screen.getByTestId('jump-readouts')).getByText(label).parentElement;
  return row?.lastElementChild?.textContent ?? '';
}

describe('JumpSimulator', () => {
  afterEach(cleanup);

  test('starts from the defaults: v0 = 8 m/s on Earth reaches 3,26 m', () => {
    render(<JumpSimulator />);

    expect(readout('Altura máxima')).toBe(`3,26${NNBSP}m`);
    expect(readout('Tiempo en el aire')).toBe(`1,63${NNBSP}s`);
    expect(screen.queryByTestId('clamp-note')).toBeNull();
  });

  test('the Celeste preset loads the converted Player.cs values', () => {
    render(<JumpSimulator />);

    fireEvent.click(screen.getByRole('button', { name: /^Celeste/ }));

    expect(screen.getByLabelText(/^Gravedad g/)).toHaveValue('112.5');
    expect(readout('Altura máxima')).toBe(`0,76${NNBSP}m`);
    expect(readout('Tiempo en el aire')).toBe(`0,23${NNBSP}s`);
  });

  test('the designer clamps out-of-range results and names the clamped fields', () => {
    render(<JumpSimulator />);
    const designer = within(screen.getByTestId('jump-designer'));

    fireEvent.change(designer.getByLabelText('Altura deseada (m)'), { target: { value: '10' } });
    fireEvent.change(designer.getByLabelText('Tiempo al ápice (s)'), { target: { value: '0,2' } });
    fireEvent.click(designer.getByRole('button', { name: 'Aplicar' }));

    expect(screen.getByTestId('clamp-note')).toHaveTextContent('impulso v₀, gravedad g');
    expect(screen.getByLabelText(/^Gravedad g/)).toHaveValue('150');
    expect(screen.getByLabelText(/^Impulso de salto/)).toHaveValue('25');
  });

  test('the designer applies g = 2h/t² and v0 = 2h/t inside the limits', () => {
    render(<JumpSimulator />);
    const designer = within(screen.getByTestId('jump-designer'));

    fireEvent.click(designer.getByRole('button', { name: 'Aplicar' }));

    // Range inputs keep the exact designed value; the visible text is rounded to the step.
    expect(screen.getByLabelText(/^Gravedad g/)).toHaveAttribute(
      'aria-valuetext',
      `25,00${NNBSP}m/s²`,
    );
    expect(screen.getByLabelText(/^Impulso de salto/)).toHaveAttribute(
      'aria-valuetext',
      `10,0${NNBSP}m/s`,
    );
    expect(readout('Altura máxima')).toBe(`2,00${NNBSP}m`);
    expect(readout('Tiempo al ápice')).toBe(`0,40${NNBSP}s`);
    expect(screen.queryByTestId('clamp-note')).toBeNull();
  });

  test('reset restores the defaults and clears the clamp note', () => {
    render(<JumpSimulator />);
    fireEvent.change(screen.getByLabelText(/^Gravedad g/), { target: { value: '20' } });

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(screen.getByLabelText(/^Gravedad g/)).toHaveValue('9.81');
  });

  test('a blank designer input disables Aplicar', () => {
    render(<JumpSimulator />);
    const designer = within(screen.getByTestId('jump-designer'));

    fireEvent.change(designer.getByLabelText('Altura deseada (m)'), { target: { value: '' } });

    expect(designer.getByRole('button', { name: 'Aplicar' })).toBeDisabled();
  });
});
