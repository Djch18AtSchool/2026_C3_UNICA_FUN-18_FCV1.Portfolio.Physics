// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import LineChart, { type LineChartProps } from './LineChart';

// Responsive Recharts charts have no size in jsdom and render no marks, so swap the
// chart and its marks for probes that expose the props LineChart passes down.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: ({ dataKey, type }: { dataKey: string; type: string }) => (
    <i data-testid="line" data-key={dataKey} data-type={type} />
  ),
  Legend: ({ itemSorter }: { itemSorter: unknown }) => (
    <i data-testid="legend" data-sorter={String(itemSorter)} />
  ),
}));

const PROPS: LineChartProps = {
  title: 'Velocidad',
  data: [{ t: 0, v: 1 }],
  xKey: 't',
  xAxis: { label: 't', unit: 's' },
  yAxis: { label: 'v', unit: 'm/s' },
  series: [
    { key: 'v', name: 'Velocidad' },
    { key: 'a', name: 'Aceleración' },
  ],
};

describe('LineChart curve and legend order', () => {
  afterEach(cleanup);

  test('draws linear segments by default', () => {
    render(<LineChart {...PROPS} />);

    expect(screen.getAllByTestId('line').map((line) => line.dataset.type)).toEqual([
      'linear',
      'linear',
    ]);
  });

  test('draws monotone curves when asked', () => {
    render(<LineChart {...PROPS} curve="monotone" />);

    expect(screen.getAllByTestId('line').map((line) => line.dataset.type)).toEqual([
      'monotone',
      'monotone',
    ]);
  });

  test('keeps the legend in series order instead of sorting it alphabetically', () => {
    render(<LineChart {...PROPS} />);

    expect(screen.getByTestId('legend').dataset.sorter).toBe('null');
  });
});
