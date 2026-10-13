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

  test('keeps a short select on one row with its label', () => {
    render(
      <SelectField
        id="integrator"
        label="Integrador"
        value="rk4"
        options={OPTIONS}
        onChange={vi.fn()}
      />,
    );

    const row = screen.getByLabelText('Integrador').parentElement?.parentElement as HTMLElement;

    expect(row.className).toContain('justify-between');
    expect(row.className).not.toContain('flex-col');
  });

  test('stacks a long option under its label and gives the select the full width', () => {
    const longOptions = [
      { value: 'critica', label: 'Crítica, c = 2√(k m)' },
      { value: 'sub', label: 'Subamortiguada, 0,3 del valor crítico' },
    ];
    render(
      <SelectField
        id="damping"
        label="Amortiguación al soltar"
        value="critica"
        options={longOptions}
        onChange={vi.fn()}
      />,
    );

    const select = screen.getByLabelText('Amortiguación al soltar');
    const wrapper = select.parentElement as HTMLElement;
    const row = wrapper.parentElement as HTMLElement;

    expect(row.className).toContain('flex-col');
    expect(wrapper.className).toContain('w-full');
    expect(select.className).toContain('w-full');
    expect(select.className).toContain('max-w-full');
    expect(select.className).toContain('min-w-0');
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
