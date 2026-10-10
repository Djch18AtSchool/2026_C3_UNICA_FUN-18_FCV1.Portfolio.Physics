// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';
import { EXACT_TEXT } from '../../test-exact-text';
import LineChart, { type LineChartProps } from './LineChart';

const HOVERED_ROW = { t: 65, x: 1234.5678 };

interface TooltipContentArgs {
  active: boolean;
  label: number;
  payload: { name: string; value: number; color: string; payload: Record<string, number> }[];
}

// Responsive Recharts charts have no size in jsdom: swap the chart for a plain container, the
// grid for a probe and the tooltip for its content as if the pointer rested on HOVERED_ROW.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <i data-testid="grid" />,
  Tooltip: ({ content }: { content: (args: TooltipContentArgs) => ReactNode }) => (
    <div data-testid="tooltip-probe">
      {content({
        active: true,
        label: HOVERED_ROW.t,
        payload: [{ name: 'x', value: HOVERED_ROW.x, color: 'red', payload: HOVERED_ROW }],
      })}
    </div>
  ),
}));

/** The drone profiles' axes: no fixed precision, so the global decimals apply. */
const PROPS: LineChartProps = {
  title: 'Posición: x(t) y y(t)',
  data: [{ t: 0, x: 0 }, HOVERED_ROW],
  xKey: 't',
  xAxis: { label: 't', unit: 's', domain: [0, 400] },
  yAxis: { label: 'Posición', unit: 'm', domain: [0, 1500] },
  series: [{ key: 'x', name: 'x' }],
};

describe('LineChart and the global settings', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('the tooltip follows the global decimals unless an axis fixes its precision', () => {
    render(<LineChart {...PROPS} />);
    expect(screen.getByText('t = 65,00\u202fs', EXACT_TEXT)).toBeInTheDocument();
    expect(screen.getByText('1\u202f234,57\u202fm', EXACT_TEXT)).toBeInTheDocument();

    act(() => setSettings({ decimals: 1 }));
    expect(screen.getByText('t = 65,0\u202fs', EXACT_TEXT)).toBeInTheDocument();
    expect(screen.getByText('1\u202f234,6\u202fm', EXACT_TEXT)).toBeInTheDocument();

    cleanup();
    render(<LineChart {...PROPS} yAxis={{ ...PROPS.yAxis, precision: 3 }} />);
    expect(screen.getByText('1\u202f234,568\u202fm', EXACT_TEXT)).toBeInTheDocument();
  });

  test('the grid follows the global grid setting', () => {
    render(<LineChart {...PROPS} />);
    expect(screen.getByTestId('grid')).toBeInTheDocument();

    act(() => setSettings({ grid: false }));

    expect(screen.queryByTestId('grid')).toBeNull();
  });
});
