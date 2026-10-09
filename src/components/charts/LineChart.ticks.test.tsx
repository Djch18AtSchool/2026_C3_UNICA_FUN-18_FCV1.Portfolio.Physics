// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import LineChart, { type LineChartProps } from './LineChart';

// Responsive Recharts charts have no size in jsdom: swap the chart for a plain container and
// the axes for probes that expose the ticks LineChart passes down.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  XAxis: ({ ticks }: { ticks?: number[] }) => (
    <i data-testid="x-axis" data-ticks={ticks?.join(',') ?? 'auto'} />
  ),
  YAxis: ({ ticks }: { ticks?: number[] }) => (
    <i data-testid="y-axis" data-ticks={ticks?.join(',') ?? 'auto'} />
  ),
}));

const PROPS: LineChartProps = {
  title: 'Agarre',
  data: [
    { t: 40, mu: 0.8 },
    { t: 160, mu: 1.4 },
  ],
  xKey: 't',
  xAxis: { label: 'Temperatura', unit: '°C', domain: [40, 160] },
  yAxis: { label: 'μ', unit: 'adimensional' },
  series: [{ key: 'mu', name: 'μ' }],
};

describe('LineChart ticks', () => {
  afterEach(cleanup);

  test('leaves the ticks to Recharts by default', () => {
    render(<LineChart {...PROPS} />);

    expect(screen.getByTestId('x-axis').dataset.ticks).toBe('auto');
    expect(screen.getByTestId('y-axis').dataset.ticks).toBe('auto');
  });

  test('passes explicit ticks to each axis', () => {
    render(
      <LineChart
        {...PROPS}
        xAxis={{ ...PROPS.xAxis, ticks: [40, 80, 120, 160] }}
        yAxis={{ ...PROPS.yAxis, ticks: [0, 1, 2] }}
      />,
    );

    expect(screen.getByTestId('x-axis').dataset.ticks).toBe('40,80,120,160');
    expect(screen.getByTestId('y-axis').dataset.ticks).toBe('0,1,2');
  });
});
