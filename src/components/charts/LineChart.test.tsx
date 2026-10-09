// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import LineChart, { type LineChartProps } from './LineChart';

const DATA = Array.from({ length: 6 }, (_, i) => ({ t: i, y: 2 + 3 * i }));

const PROPS: LineChartProps = {
  title: 'Posición en función del tiempo',
  data: DATA,
  xKey: 't',
  xAxis: { label: 't', unit: 's' },
  yAxis: { label: 'y', unit: 'm' },
  series: [{ key: 'y', name: 'Altura' }],
};

describe('LineChart', () => {
  beforeEach(() => {
    // React logs the thrown render errors that the tests below provoke on purpose.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('throws when the y axis has no unit', () => {
    expect(() => render(<LineChart {...PROPS} yAxis={{ label: 'y', unit: '' }} />)).toThrow(
      'LineChart: el eje y necesita unidad',
    );
  });

  test('throws when the x axis has no unit', () => {
    expect(() => render(<LineChart {...PROPS} xAxis={{ label: 't', unit: '' }} />)).toThrow(
      'LineChart: el eje x necesita unidad',
    );
  });

  test('renders its title', () => {
    render(<LineChart {...PROPS} />);

    expect(screen.getByText('Posición en función del tiempo')).toBeInTheDocument();
    expect(screen.queryByTestId('chart-empty')).not.toBeInTheDocument();
  });

  test('shows the empty state instead of the chart when there is no data', () => {
    render(<LineChart {...PROPS} data={[]} />);

    expect(screen.getByTestId('chart-empty')).toHaveTextContent('Sin datos para graficar');
    expect(screen.getByText('Posición en función del tiempo')).toBeInTheDocument();
  });
});
