// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import Readout from './Readout';
import { EXACT_TEXT } from '../../test-exact-text';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';

describe('Readout', () => {
  afterEach(() => {
    cleanup();
    resetSettingsForTests();
    localStorage.clear();
  });

  test('shows the label and the value with unit in monospace', () => {
    render(<Readout label="Altura máxima" value={5.1} unit="m" />);

    expect(screen.getByText('Altura máxima')).toBeInTheDocument();
    const value = screen.getByText('5,10\u202fm', EXACT_TEXT);
    expect(value).toHaveClass('font-mono');
  });

  test('honors the precision option', () => {
    render(<Readout label="Tiempo" value={1.23456} unit="s" precision={3} />);

    expect(screen.getByText('1,235\u202fs', EXACT_TEXT)).toBeInTheDocument();
  });

  test('shows an em dash for a non-finite value', () => {
    render(<Readout label="Alcance" value={NaN} unit="m" />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('falls back to the global decimals when precision is omitted', () => {
    setSettings({ decimals: 3 });
    render(<Readout label="Altura máxima" value={5.1} unit="m" />);

    expect(screen.getByText('5,100\u202fm', EXACT_TEXT)).toBeInTheDocument();
  });
});

describe('Readout as a cell of the tiered lab panel', () => {
  afterEach(cleanup);

  test('stacks the label over the value, keeping label first and value last', () => {
    const { container } = render(
      <Readout label="Período T" value={2} unit="s" precision={2} layout="cell" />,
    );
    const row = container.querySelector('[data-readout]') as HTMLElement;

    expect(row).toHaveAttribute('data-layout', 'cell');
    expect(row).toHaveClass('flex-col');
    expect(row.firstElementChild).toHaveTextContent('Período T');
    expect(row.lastElementChild?.textContent).toBe('2,00\u202fs');
    expect(row.lastElementChild).toHaveClass('font-mono');
  });

  test('a row is the default: label and value side by side', () => {
    const { container } = render(<Readout label="Período T" value={2} unit="s" />);
    const row = container.querySelector('[data-readout]') as HTMLElement;

    expect(row).toHaveAttribute('data-layout', 'row');
    expect(row).not.toHaveClass('flex-col');
  });
});

describe('Readout with KaTeX in its label', () => {
  afterEach(cleanup);

  test('typesets the $…$ part of the label', () => {
    const { container } = render(<Readout label="Cambio $|\Delta\vec v|$" value={1} unit="km/s" />);

    expect(container.querySelector('[data-readout] .inline-math')).not.toBeNull();
    expect(container.querySelector('[data-readout] span')?.firstChild?.textContent).toBe('Cambio ');
  });
});
