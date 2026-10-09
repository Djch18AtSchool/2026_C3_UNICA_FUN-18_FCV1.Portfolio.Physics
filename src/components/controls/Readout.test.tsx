// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import Readout from './Readout';
import { EXACT_TEXT } from '../../test-exact-text';

describe('Readout', () => {
  afterEach(cleanup);

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
});
