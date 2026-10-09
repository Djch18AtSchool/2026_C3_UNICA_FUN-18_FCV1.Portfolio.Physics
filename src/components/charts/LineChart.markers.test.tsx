// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import LineChart, { type LineChartProps } from './LineChart';

// Responsive Recharts charts have no size in jsdom, so swap the chart for a plain container and
// the reference line for a probe that exposes the props LineChart passes down.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ReferenceLine: ({ x, children }: { x: number; children?: ReactNode }) => (
    <i data-testid="marker" data-x={x}>
      {children}
    </i>
  ),
  Label: ({ value }: { value: string }) => <b data-testid="marker-label">{value}</b>,
}));

const PROPS: LineChartProps = {
  title: 'Posición',
  data: [
    { t: 0, x: 0 },
    { t: 10, x: 50 },
  ],
  xKey: 't',
  xAxis: { label: 't', unit: 's' },
  yAxis: { label: 'x', unit: 'm' },
  series: [{ key: 'x', name: 'x' }],
};

describe('LineChart markers', () => {
  afterEach(cleanup);

  test('draws no vertical marker by default', () => {
    render(<LineChart {...PROPS} />);

    expect(screen.queryByTestId('marker')).not.toBeInTheDocument();
  });

  test('draws one vertical reference line per marker at its x', () => {
    render(<LineChart {...PROPS} markers={[{ x: 4.5 }, { x: 7 }]} />);

    expect(screen.getAllByTestId('marker').map((marker) => marker.dataset.x)).toEqual(['4.5', '7']);
  });

  test('labels a marker when it has a label', () => {
    render(<LineChart {...PROPS} markers={[{ x: 4.5, label: 't = 4,5 s' }]} />);

    expect(screen.getByTestId('marker')).toHaveTextContent('t = 4,5 s');
  });
});
