// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import ParamField, { type ParamFieldProps } from './ParamField';

const BASE: Omit<ParamFieldProps, 'value' | 'onChange'> = {
  id: 'jump-g',
  label: (
    <>
      Gravedad <var>g</var>
    </>
  ),
  unit: 'm/s²',
  min: 1,
  max: 30,
  step: 0.01,
};

function Controlled({
  initial = 9.81,
  onChange,
}: {
  initial?: number;
  onChange?: (v: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <ParamField
      {...BASE}
      value={value}
      onChange={(v) => {
        onChange?.(v);
        setValue(v);
      }}
    />
  );
}

const range = () => screen.getByRole<HTMLInputElement>('slider', { name: 'Gravedad g' });
const field = () => screen.getByRole<HTMLInputElement>('textbox', { name: 'Gravedad g' });

describe('ParamField', () => {
  afterEach(cleanup);

  test('labels the range and the number with the same (rich) label, unit after the number', () => {
    render(<Controlled />);

    expect(range()).toHaveAttribute('id', 'jump-g');
    expect(field()).toHaveAttribute('id', 'jump-g-number');
    expect(range()).toHaveAttribute('min', '1');
    expect(range()).toHaveAttribute('max', '30');
    expect(range()).toHaveAttribute('step', '0.01');
    expect(field().nextElementSibling).toHaveTextContent('m/s²');
    expect(field()).toHaveAccessibleDescription('m/s²');
  });

  test('shows the value with a decimal comma in the number field', () => {
    render(<Controlled />);

    expect(range().value).toBe('9.81');
    expect(field().value).toBe('9,81');
  });

  test('moving the range updates the number immediately', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    fireEvent.change(range(), { target: { value: '12.5' } });

    expect(onChange).toHaveBeenCalledWith(12.5);
    expect(field().value).toBe('12,5');
  });

  test('typing does not commit per keystroke; blur commits and the range follows', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    await user.clear(field());
    await user.type(field(), '3,7');
    expect(onChange).not.toHaveBeenCalled();
    expect(field().value).toBe('3,7');

    await user.tab();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(3.7);
    expect(range().value).toBe('3.7');
  });

  test('a value above the maximum is clamped to it on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    await user.clear(field());
    await user.type(field(), '50');
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(30);
    expect(range().value).toBe('30');
    expect(field().value).toBe('30');
  });

  test('a value below the minimum is clamped to it on Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    await user.clear(field());
    await user.type(field(), '-2{Enter}');

    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(range().value).toBe('1');
    expect(field().value).toBe('1');
  });

  test('a typed value snaps to the step grid min + k·step on commit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ParamField {...BASE} step={0.5} value={2} onChange={onChange} />);

    await user.clear(field());
    await user.type(field(), '1,3{Enter}');

    expect(onChange).toHaveBeenCalledWith(1.5);
  });

  test('snapping leaves no float residue and never passes an off-grid maximum', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ParamField {...BASE} min={0} max={1} step={0.1} value={0.5} onChange={onChange} />);

    await user.clear(field());
    await user.type(field(), '0,3{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(0.3);

    onChange.mockClear();
    render(
      <ParamField
        {...BASE}
        id="off-grid"
        min={0}
        max={1.2}
        step={0.5}
        value={0}
        onChange={onChange}
      />,
    );
    const offGrid = screen.getAllByRole<HTMLInputElement>('textbox', { name: 'Gravedad g' })[1];
    await user.clear(offGrid);
    await user.type(offGrid, '1,2{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  test('text that is not a number reverts to the current value without committing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    await user.clear(field());
    await user.type(field(), 'abc');
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
    expect(field().value).toBe('9,81');
  });

  test('a new value from the parent replaces what the field shows', () => {
    const { rerender } = render(<ParamField {...BASE} value={2} onChange={() => {}} />);

    rerender(<ParamField {...BASE} value={4.5} onChange={() => {}} />);

    expect(field().value).toBe('4,5');
    expect(range().value).toBe('4.5');
  });

  test('an empty unit renders no unit mark', () => {
    render(<ParamField {...BASE} unit="" value={2} onChange={() => {}} />);

    expect(field().nextElementSibling).toBeNull();
    expect(field()).not.toHaveAttribute('aria-describedby');
  });
});
