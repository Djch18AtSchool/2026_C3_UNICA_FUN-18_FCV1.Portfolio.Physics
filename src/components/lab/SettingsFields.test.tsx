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
  test('wraps the native select with its own aria-hidden chevron', () => {
    const { container } = render(
      <SelectField
        id="integrator"
        label="Integrador"
        value="rk4"
        options={OPTIONS}
        onChange={vi.fn()}
      />,
    );

    const select = screen.getByLabelText('Integrador');
    const wrapper = select.parentElement as HTMLElement;
    const chevron = wrapper.querySelector('svg');

    expect(wrapper.className).toContain('relative');
    expect(select.className).toContain('appearance-none');
    expect(chevron?.getAttribute('aria-hidden')).toBe('true');
    expect(chevron?.getAttribute('class')).toContain('pointer-events-none');
    expect(container.querySelectorAll('select')).toHaveLength(1);
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
