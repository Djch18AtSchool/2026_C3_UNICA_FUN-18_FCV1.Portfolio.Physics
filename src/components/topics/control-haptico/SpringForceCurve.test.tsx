// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import SpringForceCurve from './SpringForceCurve';

/** formatNumber joins value and unit with a narrow no-break space (U+202F). */
const NNBSP = ' ';

function readout(label: string): string {
  const row = within(screen.getByTestId('spring-readouts')).getByText(label).parentElement;
  return row?.lastElementChild?.textContent ?? '';
}

describe('SpringForceCurve', () => {
  afterEach(cleanup);

  test('starts at k = 400 N/m and x₀ = 3 mm: 3,20 N and 12,8 mJ ideal, 2,00 N and 5,0 mJ trigger', () => {
    render(<SpringForceCurve />);

    expect(screen.getByTestId('spring-force-curve')).toHaveAttribute('data-ready', 'true');
    expect(readout('Fuerza al fondo, Hooke ideal')).toBe(`3,20${NNBSP}N`);
    expect(readout('Energía almacenada, Hooke ideal')).toBe(`12,8${NNBSP}mJ`);
    expect(readout('Fuerza al fondo, gatillo')).toBe(`2,00${NNBSP}N`);
    expect(readout('Trabajo del dedo contra el gatillo')).toBe(`5,0${NNBSP}mJ`);
  });

  test('halving k halves the force and the energy', () => {
    render(<SpringForceCurve />);

    fireEvent.change(screen.getByLabelText(/^Rigidez k/), { target: { value: '200' } });

    expect(readout('Fuerza al fondo, Hooke ideal')).toBe(`1,60${NNBSP}N`);
    expect(readout('Energía almacenada, Hooke ideal')).toBe(`6,4${NNBSP}mJ`);
  });

  test('with x₀ = 0 the trigger matches the ideal spring', () => {
    render(<SpringForceCurve />);

    fireEvent.change(screen.getByLabelText(/^Inicio de la resistencia/), {
      target: { value: '0' },
    });

    expect(readout('Fuerza al fondo, gatillo')).toBe(`3,20${NNBSP}N`);
    expect(readout('Trabajo del dedo contra el gatillo')).toBe(`12,8${NNBSP}mJ`);
  });

  test('names both series and states the third law next to the chart', () => {
    render(<SpringForceCurve />);

    expect(screen.getByText(/Fuerza contra desplazamiento/)).toBeInTheDocument();
    expect(screen.getByTestId('third-law-note')).toHaveTextContent('tercera ley');
  });

  test('the reset button restores the defaults', () => {
    render(<SpringForceCurve />);
    fireEvent.change(screen.getByLabelText(/^Rigidez k/), { target: { value: '600' } });

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(screen.getByLabelText(/^Rigidez k/)).toHaveValue('400');
    expect(readout('Energía almacenada, Hooke ideal')).toBe(`12,8${NNBSP}mJ`);
  });
});
