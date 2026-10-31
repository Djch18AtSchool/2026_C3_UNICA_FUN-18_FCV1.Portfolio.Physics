// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type JSX } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { withStableCallbacks } from './withStableCallbacks';

let renders = 0;

function FieldBase({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange(next: number): void;
  label: string;
}): JSX.Element {
  renders += 1;
  return (
    <button type="button" onClick={() => onChange(value + 1)}>
      {`${label} ${value}`}
    </button>
  );
}

const Field = withStableCallbacks(FieldBase);

/** A parent that re-renders on demand and recreates its inline callback every time, like a lab. */
function Parent({ onChange }: { onChange(next: number): void }): JSX.Element {
  const [tick, setTick] = useState(0);
  const [value, setValue] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setTick(tick + 1)}>
        tick
      </button>
      <button type="button" onClick={() => setValue(value + 10)}>
        value
      </button>
      <span data-testid="tick">{tick}</span>
      <Field value={value} label="v" onChange={(next) => onChange(next + tick)} />
    </>
  );
}

describe('withStableCallbacks', () => {
  afterEach(() => {
    cleanup();
    renders = 0;
  });

  test('a parent re-render with a new inline callback does not re-render the field', () => {
    render(<Parent onChange={() => {}} />);
    const before = renders;

    fireEvent.click(screen.getByRole('button', { name: 'tick' }));
    fireEvent.click(screen.getByRole('button', { name: 'tick' }));

    expect(screen.getByTestId('tick')).toHaveTextContent('2');
    expect(renders).toBe(before);
  });

  test('the field still calls the latest callback, with the latest closure', () => {
    const onChange = vi.fn();
    render(<Parent onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'tick' }));

    fireEvent.click(screen.getByRole('button', { name: 'v 0' }));

    // value + 1 from the field, + tick (1) from the newest parent closure.
    expect(onChange).toHaveBeenCalledWith(2);
  });

  test('a changed value prop re-renders the field', () => {
    render(<Parent onChange={() => {}} />);
    const before = renders;

    act(() => fireEvent.click(screen.getByRole('button', { name: 'value' })));

    expect(renders).toBe(before + 1);
    expect(screen.getByRole('button', { name: 'v 10' })).toBeInTheDocument();
  });

  test('names the wrapper after the component', () => {
    expect((Field as { displayName?: string }).displayName).toBe('Stable(FieldBase)');
  });
});
