// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { LINE_WIDTH } from '../charts/chartTheme';
import { SERIES_DIM_OPACITY, SERIES_HIGHLIGHT_WIDTH } from '../charts/seriesHighlight';
import SvgPlot, { type PlotSeries } from './SvgPlot';
import { PROPS } from './svgPlotTestKit';

const SERIES: PlotSeries[] = [
  {
    id: 'tierra',
    label: 'Tierra',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
  },
  {
    id: 'luna',
    label: 'Luna',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
    ],
    dashed: true,
  },
  { id: 'vector', label: 'Velocidad $\\vec v$', points: [], legendKey: 'arrow' },
];

const path = (id: string) => document.querySelector(`path[data-series="${id}"]`) as Element;
const entry = (name: string) =>
  within(screen.getByRole('list', { name: 'Leyenda' })).getByRole('button', { name });
/** Each series' emphasis as drawn: "focus", "dim" or "" (as before). */
const emphases = () =>
  SERIES.filter(({ points }) => points.length > 0).map(
    ({ id }) => path(id).getAttribute('data-emphasis') ?? '',
  );

function renderPlot(series = SERIES) {
  return render(<SvgPlot {...PROPS} series={series} />);
}

describe('SvgPlot · highlighting a series from its legend entry', () => {
  afterEach(cleanup);

  test('each entry is a button named by its label (spoken for a formula), in the same list', () => {
    renderPlot();

    const items = within(screen.getByRole('list', { name: 'Leyenda' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByRole('button')).toHaveAccessibleName('Tierra');
    expect(within(items[2]).getByRole('button')).toHaveAccessibleName('Velocidad vector v');
    for (const item of items) {
      expect(within(item).getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    }
    // Nothing is highlighted until asked: every series is drawn as before.
    expect(emphases()).toEqual(['', '']);
  });

  test('the mouse over an entry thickens its series and fades the others, and leaving undoes it', () => {
    renderPlot();

    fireEvent.pointerEnter(entry('Luna'), { pointerType: 'mouse' });

    expect(emphases()).toEqual(['dim', 'focus']);
    expect(path('luna')).toHaveAttribute('stroke-width', String(SERIES_HIGHLIGHT_WIDTH));
    expect(SERIES_HIGHLIGHT_WIDTH).toBeGreaterThan(LINE_WIDTH);
    expect(path('tierra')).toHaveAttribute('opacity', String(SERIES_DIM_OPACITY));
    // Not by color alone: the highlighted series keeps its color and dash and gains width.
    expect(path('luna')).toHaveAttribute('stroke-dasharray');

    fireEvent.pointerLeave(entry('Luna'), { pointerType: 'mouse' });
    expect(emphases()).toEqual(['', '']);
    expect(path('tierra')).not.toHaveAttribute('opacity');
  });

  test('a keyboard focus highlights while it stays; a focus from a press does not', () => {
    renderPlot();

    fireEvent.focus(entry('Tierra'));
    expect(emphases()).toEqual(['focus', 'dim']);
    fireEvent.blur(entry('Tierra'));
    expect(emphases()).toEqual(['', '']);

    fireEvent.pointerDown(entry('Tierra'), { pointerType: 'touch' });
    fireEvent.focus(entry('Tierra'));
    expect(emphases()).toEqual(['', '']);
  });

  test('a tap (touch: no hover) pins the highlight until the entry is tapped again', () => {
    renderPlot();

    fireEvent.pointerEnter(entry('Luna'), { pointerType: 'touch' });
    expect(emphases()).toEqual(['', '']);
    fireEvent.pointerDown(entry('Luna'), { pointerType: 'touch' });
    fireEvent.click(entry('Luna'));

    expect(entry('Luna')).toHaveAttribute('aria-pressed', 'true');
    expect(emphases()).toEqual(['dim', 'focus']);
    fireEvent.pointerLeave(entry('Luna'), { pointerType: 'touch' });
    expect(emphases()).toEqual(['dim', 'focus']);

    fireEvent.pointerDown(entry('Luna'), { pointerType: 'touch' });
    fireEvent.click(entry('Luna'));
    expect(entry('Luna')).toHaveAttribute('aria-pressed', 'false');
    expect(emphases()).toEqual(['', '']);
  });

  test('a tap outside the legend lets a pinned highlight go; one on another entry moves it', () => {
    renderPlot();
    fireEvent.click(entry('Luna'));

    fireEvent.click(entry('Tierra'));
    expect(entry('Luna')).toHaveAttribute('aria-pressed', 'false');
    expect(emphases()).toEqual(['focus', 'dim']);

    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expect(entry('Tierra')).toHaveAttribute('aria-pressed', 'false');
    expect(emphases()).toEqual(['', '']);
  });

  test('Escape on an entry lets a pinned highlight go', () => {
    renderPlot();
    fireEvent.click(entry('Luna'));

    fireEvent.keyDown(entry('Luna'), { key: 'Escape' });

    expect(entry('Luna')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a pinned series that leaves the plot fades nothing', () => {
    const { rerender } = renderPlot();
    fireEvent.click(entry('Luna'));

    rerender(<SvgPlot {...PROPS} series={[SERIES[0], { ...SERIES[1], id: 'marte' }]} />);

    expect(document.querySelectorAll('[data-emphasis]')).toHaveLength(0);
  });
});
