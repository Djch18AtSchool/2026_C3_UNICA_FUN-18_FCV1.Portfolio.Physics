// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { LINE_WIDTH } from '../charts/chartTheme';
import {
  LEGEND_LABEL,
  SERIES_DIM_OPACITY,
  SERIES_HIGHLIGHT_WIDTH,
} from '../charts/seriesHighlight';
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
const legend = () => screen.getByRole('toolbar', { name: LEGEND_LABEL });
const entry = (name: string) => within(legend()).getByRole('button', { name });
/** The entries that take a Tab: one per legend (a roving tabindex). */
const tabStops = () =>
  within(legend())
    .getAllByRole('button')
    .filter((button) => button.tabIndex === 0)
    .map((button) => button.textContent);
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

  test('one toolbar «Leyenda: realzar una serie», each entry a button named by its label', () => {
    renderPlot();

    expect(LEGEND_LABEL).toBe('Leyenda: realzar una serie');
    expect(legend()).toHaveAttribute('aria-orientation', 'horizontal');
    const buttons = within(legend()).getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAccessibleName('Tierra');
    expect(buttons[2]).toHaveAccessibleName('Velocidad vector v');
    for (const button of buttons) expect(button).toHaveAttribute('aria-pressed', 'false');
    // No list items left in a toolbar: the entries are its only children that speak.
    expect(within(legend()).queryAllByRole('listitem')).toHaveLength(0);
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

  test('the legend takes one Tab: the first entry, or the pinned one', () => {
    renderPlot();
    expect(tabStops()).toEqual(['Tierra']);

    fireEvent.click(entry('Luna'));
    fireEvent.blur(entry('Luna'));

    expect(tabStops()).toEqual(['Luna']);
  });

  test('the arrows, Home and End move the focus along the legend and preview each series', () => {
    renderPlot();
    act(() => entry('Tierra').focus());
    expect(emphases()).toEqual(['focus', 'dim']);

    fireEvent.keyDown(entry('Tierra'), { key: 'ArrowRight' });
    expect(entry('Luna')).toHaveFocus();
    expect(emphases()).toEqual(['dim', 'focus']);
    expect(tabStops()).toEqual(['Luna']);

    fireEvent.keyDown(entry('Luna'), { key: 'End' });
    expect(entry('Velocidad vector v')).toHaveFocus();
    // Past the last, the first again; before the first, the last.
    fireEvent.keyDown(entry('Velocidad vector v'), { key: 'ArrowRight' });
    expect(entry('Tierra')).toHaveFocus();
    fireEvent.keyDown(entry('Tierra'), { key: 'ArrowLeft' });
    expect(entry('Velocidad vector v')).toHaveFocus();
    fireEvent.keyDown(entry('Velocidad vector v'), { key: 'Home' });
    expect(entry('Tierra')).toHaveFocus();
    // Up and down belong to a legend in a column, not to this row.
    fireEvent.keyDown(entry('Tierra'), { key: 'ArrowDown' });
    expect(entry('Tierra')).toHaveFocus();
  });
});
