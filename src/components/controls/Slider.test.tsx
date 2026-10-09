// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Slider from './Slider';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';

const BASE_PROPS = {
  id: 'gravity',
  label: 'Gravedad',
  unit: 'm/s²',
  min: 1,
  max: 25,
  step: 0.01,
  value: 9.81,
};

describe('Slider', () => {
  afterEach(() => {
    cleanup();
    resetSettingsForTests();
    localStorage.clear();
  });

  test('labels the range input with the name and the unit', () => {
    render(<Slider {...BASE_PROPS} onChange={() => {}} />);

    const input = screen.getByLabelText('Gravedad (m/s²)');

    expect(input).toHaveAttribute('type', 'range');
    expect(input).toHaveAttribute('id', 'gravity');
  });

  test('exposes the formatted value with its unit as aria-valuetext', () => {
    render(<Slider {...BASE_PROPS} onChange={() => {}} />);

    expect(screen.getByLabelText('Gravedad (m/s²)')).toHaveAttribute(
      'aria-valuetext',
      '9,81\u202fm/s²',
    );
  });

  test('shows the live value in monospace and the visible min–max range', () => {
    render(<Slider {...BASE_PROPS} onChange={() => {}} />);

    expect(screen.getByTestId('slider-value')).toHaveClass('font-mono');
    expect(screen.getByTestId('slider-value').textContent).toBe('9,81\u202fm/s²');
    expect(screen.getByText('1,00–25,00')).toBeInTheDocument();
  });

  test('uses the explicit precision for value and range', () => {
    render(<Slider {...BASE_PROPS} step={1} precision={1} value={3} onChange={() => {}} />);

    expect(screen.getByTestId('slider-value').textContent).toBe('3,0\u202fm/s²');
    expect(screen.getByText('1,0–25,0')).toBeInTheDocument();
  });

  test('falls back to the global decimals, not the step, when precision is omitted', () => {
    render(<Slider {...BASE_PROPS} step={1} value={3} onChange={() => {}} />);

    expect(screen.getByTestId('slider-value').textContent).toBe('3,00\u202fm/s²');
  });

  test('aria-valuetext follows the global decimals setting', () => {
    setSettings({ decimals: 3 });
    render(<Slider {...BASE_PROPS} step={1} value={3} onChange={() => {}} />);

    expect(screen.getByLabelText('Gravedad (m/s²)')).toHaveAttribute(
      'aria-valuetext',
      '3,000\u202fm/s²',
    );
  });

  test('reports the new numeric value when the input changes', () => {
    const onChange = vi.fn();
    render(<Slider {...BASE_PROPS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Gravedad (m/s²)'), { target: { value: '20' } });

    expect(onChange).toHaveBeenCalledExactlyOnceWith(20);
  });
});
