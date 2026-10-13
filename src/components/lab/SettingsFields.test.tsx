// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SelectField } from './SettingsFields';

const OPTIONS = [
  { value: 'rk4', label: 'RK4' },
  { value: 'euler', label: 'Euler' },
];

afterEach(cleanup);

describe('SelectField', () => {
  test('labels the native select and hides its decorative chevron from assistive tech', () => {
    const { container } = render(
      <SelectField
        id="integrator"
        label="Integrador"
        value="rk4"
        options={OPTIONS}
        onChange={vi.fn()}
      />,
    );

    const select = screen.getByLabelText('Integrador') as HTMLSelectElement;

    expect(select.tagName).toBe('SELECT');
    expect(select.value).toBe('rk4');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'RK4',
      'Euler',
    ]);
    expect(container.querySelectorAll('select')).toHaveLength(1);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('reports the chosen option value', () => {
    const onChange = vi.fn();
    render(
      <SelectField
        id="integrator"
        label="Integrador"
        value="rk4"
        options={OPTIONS}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Integrador'), { target: { value: 'euler' } });

    expect(onChange).toHaveBeenCalledWith('euler');
  });
});
