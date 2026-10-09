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

  test('opens on the Celeste preset with the converted Player.cs values', () => {
    render(<JumpSimulator />);

    expect(screen.getByRole('button', { name: /^Celeste/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText(/^Gravedad g/)).toHaveValue('112.5');
    expect(readout('Altura máxima')).toBe(`0,76${NNBSP}m`);
    expect(readout('Tiempo en el aire')).toBe(`0,23${NNBSP}s`);
    expect(screen.queryByTestId('clamp-note')).toBeNull();
  });

  test('the Tierra preset: v0 = 8 m/s on Earth reaches 3,26 m', () => {
    render(<JumpSimulator />);

    fireEvent.click(screen.getByRole('button', { name: /^Tierra/ }));

    expect(screen.getByLabelText(/^Gravedad g/)).toHaveValue('9.81');
    expect(readout('Altura máxima')).toBe(`3,26${NNBSP}m`);
    expect(readout('Tiempo en el aire')).toBe(`1,63${NNBSP}s`);
    expect(screen.getByRole('button', { name: /^Celeste/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
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

    // Range inputs keep the exact designed value; the visible text is rounded to the global decimals.
    expect(screen.getByLabelText(/^Gravedad g/)).toHaveAttribute(
      'aria-valuetext',
      `25,00${NNBSP}m/s²`,
    );
    expect(screen.getByLabelText(/^Impulso de salto/)).toHaveAttribute(
      'aria-valuetext',
      `10,00${NNBSP}m/s`,
    );
    expect(readout('Altura máxima')).toBe(`2,00${NNBSP}m`);
    expect(readout('Tiempo al ápice')).toBe(`0,40${NNBSP}s`);
    expect(screen.queryByTestId('clamp-note')).toBeNull();
  });

  test('reset restores the Celeste defaults and clears the clamp note', () => {
    render(<JumpSimulator />);
    const designer = within(screen.getByTestId('jump-designer'));
    fireEvent.change(designer.getByLabelText('Tiempo al ápice (s)'), { target: { value: '0,05' } });
    fireEvent.click(designer.getByRole('button', { name: 'Aplicar' }));
    expect(screen.getByTestId('clamp-note')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(screen.getByLabelText(/^Gravedad g/)).toHaveValue('112.5');
    expect(screen.getByLabelText(/^Impulso de salto/)).toHaveValue('13.1');
    expect(screen.getByRole('button', { name: /^Celeste/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByTestId('clamp-note')).toBeNull();
  });

  test('a blank designer input disables Aplicar', () => {
    render(<JumpSimulator />);
    const designer = within(screen.getByTestId('jump-designer'));

    fireEvent.change(designer.getByLabelText('Altura deseada (m)'), { target: { value: '' } });

    expect(designer.getByRole('button', { name: 'Aplicar' })).toBeDisabled();
  });

  test('marks only the invalid designer input and announces the hint politely', () => {
    render(<JumpSimulator />);
    const designer = within(screen.getByTestId('jump-designer'));
    const height = designer.getByLabelText('Altura deseada (m)');
    const time = designer.getByLabelText('Tiempo al ápice (s)');
    expect(height).toHaveAttribute('aria-invalid', 'false');

    fireEvent.change(height, { target: { value: '-1' } });

    expect(height).toHaveAttribute('aria-invalid', 'true');
    expect(time).toHaveAttribute('aria-invalid', 'false');
    expect(designer.queryByRole('alert')).toBeNull();
    const hint = designer.getByText('Escribe una altura y un tiempo mayores que cero.');
    expect(hint.closest('[aria-live="polite"]')).not.toBeNull();
    expect(height).toHaveAccessibleDescription('Escribe una altura y un tiempo mayores que cero.');
    expect(time).not.toHaveAccessibleDescription();
  });
});
