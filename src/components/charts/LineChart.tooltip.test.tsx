// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import LineChart, { type LineChartProps } from './LineChart';
import { EXACT_TEXT } from '../../test-exact-text';

const HOVERED_ROW = { fz: 4000, real: 6400, muEff: 1.6 };

interface TooltipContentArgs {
  active: boolean;
  label: number;
  payload: { name: string; value: number; color: string; payload: Record<string, number> }[];
}

// Responsive Recharts charts have no size in jsdom: swap the chart for a plain container and
// render the tooltip content as if the pointer rested on HOVERED_ROW.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Tooltip: ({ content }: { content: (args: TooltipContentArgs) => ReactNode }) => (
    <div data-testid="tooltip-probe">
      {content({
        active: true,
        label: HOVERED_ROW.fz,
        payload: [{ name: 'Fuerza', value: HOVERED_ROW.real, color: 'red', payload: HOVERED_ROW }],
      })}
    </div>
  ),
}));

const PROPS: LineChartProps = {
  title: 'Fuerza lateral',
  data: [{ fz: 0, real: 0, muEff: Number.NaN }, HOVERED_ROW],
  xKey: 'fz',
  xAxis: { label: 'F_z', unit: 'N', precision: 0 },
  yAxis: { label: 'F_y', unit: 'N', precision: 0 },
  series: [{ key: 'real', name: 'Fuerza' }],
};

describe('LineChart tooltip', () => {
  afterEach(cleanup);

  test('formats the hovered values with each axis precision', () => {
    render(<LineChart {...PROPS} />);

    expect(screen.getByText('F_z = 4 000 N', EXACT_TEXT)).toBeInTheDocument();
    expect(screen.getByText('6 400 N', EXACT_TEXT)).toBeInTheDocument();
  });

  test('prints the value unit instead of the axis unit when one is given', () => {
    render(<LineChart {...PROPS} yAxis={{ label: 'μ', unit: 'adimensional', valueUnit: '' }} />);

    expect(screen.getByText('6 400,00', EXACT_TEXT)).toBeInTheDocument();
  });

  test('shows the tooltip extras taken from the hovered row', () => {
    render(
      <LineChart {...PROPS} tooltipExtras={[{ key: 'muEff', name: 'μ efectivo', precision: 2 }]} />,
    );

    expect(screen.getByTestId('tooltip-extras')).toHaveTextContent('μ efectivo');
    expect(screen.getByText('1,60', EXACT_TEXT)).toBeInTheDocument();
  });
});
