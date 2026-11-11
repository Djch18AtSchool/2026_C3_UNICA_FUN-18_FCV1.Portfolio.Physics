// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ChoiceField from './ChoiceField';

const OPTIONS = [
  { value: 'floor', label: 'Rebote contra el piso' },
  { value: 'pair', label: 'Choque de dos cuerpos' },
] as const;

function renderField(onChange = vi.fn()) {
  render(
    <ChoiceField id="mode" label="Modo" value="floor" options={OPTIONS} onChange={onChange} />,
  );
  return onChange;
}

/** The visible segment of a radio: the span after the visually hidden input. */
function segment(name: string): HTMLElement {
  return screen.getByRole('radio', { name }).nextElementSibling as HTMLElement;
}

describe('ChoiceField', () => {
  afterEach(cleanup);

  test('is a radio group named by its label, with the value checked', () => {
    renderField();

    expect(screen.getByRole('radiogroup', { name: 'Modo' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Rebote contra el piso' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Choque de dos cuerpos' })).not.toBeChecked();
  });

  test('choosing another option reports its value', async () => {
    const onChange = renderField();

    await userEvent.setup().click(screen.getByRole('radio', { name: 'Choque de dos cuerpos' }));

    expect(onChange).toHaveBeenCalledWith('pair');
  });

  test('every segment has its own border, so a wrapped option still reads as a choice', () => {
    renderField();

    // Wrapped onto a second row (Tema 7 at 1 280 px, Tema 8 at 360 px), an option without a
    // border looked like loose text; the checked one keeps the accent.
    expect(segment('Choque de dos cuerpos')).toHaveClass('border-border');
    expect(segment('Choque de dos cuerpos')).not.toHaveClass('border-transparent');
    expect(segment('Rebote contra el piso')).toHaveClass('peer-checked:border-accent');
  });
});
