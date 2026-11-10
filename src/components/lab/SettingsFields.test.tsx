// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SegmentedField, SelectField, SwitchField } from './SettingsFields';

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

  test('an option group is a native <optgroup> with its label, in the order given', () => {
    const onChange = vi.fn();
    const { container } = render(
      <SelectField
        id="ball"
        label="Pelota"
        value="fiba"
        options={[
          { value: '', label: 'Personalizado', disabled: true },
          { label: 'Rebotes realistas', options: OPTIONS },
          { label: 'Rebotes que se sienten mal', options: [{ value: 'fiba', label: 'FIBA' }] },
        ]}
        onChange={onChange}
      />,
    );

    const groups = [...container.querySelectorAll('optgroup')];
    expect(groups.map((group) => group.label)).toEqual([
      'Rebotes realistas',
      'Rebotes que se sienten mal',
    ]);
    expect([...groups[0].children].map((option) => option.textContent)).toEqual(['RK4', 'Euler']);
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Personalizado',
      'RK4',
      'Euler',
      'FIBA',
    ]);
    expect(screen.getByLabelText('Pelota')).toHaveValue('fiba');

    fireEvent.change(screen.getByLabelText('Pelota'), { target: { value: 'euler' } });
    expect(onChange).toHaveBeenCalledWith('euler');
  });
});

describe('fields with KaTeX in their label', () => {
  test('a select typesets its label and is named in words', () => {
    const { container } = render(
      <SelectField
        id="step"
        label="Paso del motor $\Delta t$"
        value="rk4"
        options={OPTIONS}
        onChange={vi.fn()}
      />,
    );

    expect(container.querySelector('label .inline-math')).not.toBeNull();
    expect(container.textContent).not.toContain('$');
    expect(screen.getByRole('combobox', { name: 'Paso del motor delta t' })).toBeInTheDocument();
  });

  test('a select with a plain label keeps it as its name', () => {
    render(
      <SelectField id="s" label="Integrador" value="rk4" options={OPTIONS} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-label');
  });

  test('a switch and a segmented control are named in words', () => {
    render(
      <>
        <SwitchField id="vec" label="Vectores $\vec v_\infty$" checked onChange={vi.fn()} />
        <SegmentedField
          id="side"
          label="Lado de $\vec V_p$"
          value="a"
          options={['a', 'b']}
          onChange={vi.fn()}
        />
      </>,
    );

    expect(screen.getByRole('switch', { name: 'Vectores vector v sub infinito' })).toBeChecked();
    expect(screen.getByRole('radiogroup', { name: 'Lado de vector V sub p' })).toBeInTheDocument();
  });
});
