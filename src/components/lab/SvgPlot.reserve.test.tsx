// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../lib/settingsStore';
import SvgPlot, { COMPACT_WIDTH, PLOT_ASPECT, type SvgPlotProps } from './SvgPlot';
import { resolveCssLength } from '../../test-css-length';
import { PROPS, stubResizeObserver, viewBoxOf } from './svgPlotTestKit';

type Reserve = { className: string; style: CSSStyleDeclaration };
/** Rounded ResizeObserver widths on either side of the 480 px switch, and both layouts. */
const WIDTHS = [300, 360, 479, 479.4, 479.6, 480, 520, 760];
/** Sub-pixel: the viewBox height is rounded to 0,01 px. */
const HEIGHT_TOLERANCE_PX = 0.5;

/** The reserve a plot carries before it measures (the server's markup, and while hydrating). */
function reserveOf(props: SvgPlotProps): Reserve {
  vi.stubGlobal('ResizeObserver', undefined);
  render(<SvgPlot {...props} />);
  const svg = screen.getByRole('img') as unknown as SVGSVGElement;
  const reserve = { className: svg.getAttribute('class') ?? '', style: svg.style };
  cleanup();
  vi.unstubAllGlobals();
  return reserve;
}

/** The height the plot draws at, in CSS px, once it measures a container `width` px wide. */
function drawnHeightAt(props: SvgPlotProps, width: number): number {
  stubResizeObserver(Math.round(width));
  render(<SvgPlot {...props} />);
  const svg = screen.getByRole('img');
  const [, , viewWidth, viewHeight] = viewBoxOf(svg);
  expect(svg.getAttribute('class')).toBe('block h-auto');
  cleanup();
  vi.unstubAllGlobals();
  return (viewHeight * width) / viewWidth;
}

/** The layout the reserve's container query picks at `width`: its threshold is in the class. */
function layoutAt(reserve: Reserve, width: number): 'compact' | 'wide' {
  const threshold = Number(/@min-\[([\d.]+)px\]\/plot:/.exec(reserve.className)?.[1]);
  return width >= threshold ? 'wide' : 'compact';
}

/** The box height the reserve gives at a container `width`, as the browser would resolve it. */
function reservedHeightAt(reserve: Reserve, width: number): number {
  const layout = layoutAt(reserve, width);
  const aspect = reserve.style.getPropertyValue(`--plot-aspect-${layout}`);
  if (aspect) return width / Number(aspect);
  const height = reserve.style.getPropertyValue(`--plot-height-${layout}`);
  return resolveCssLength(height, { container: width });
}

const expectReserved = (props: SvgPlotProps, width: number) =>
  expect(
    Math.abs(reservedHeightAt(reserveOf(props), width) - drawnHeightAt(props, width)),
  ).toBeLessThan(HEIGHT_TOLERANCE_PX);

describe('SvgPlot reserves its own height until it measures', () => {
  afterEach(() => {
    cleanup();
    resetSettingsForTests();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  test.each(WIDTHS)('default aspect: at %s px the reserved box is as tall as the drawing', (w) => {
    expectReserved(PROPS, w);
  });

  test.each(WIDTHS)('a compact/wide pair: at %s px the reserved box is as tall too', (w) => {
    expectReserved({ ...PROPS, aspectRatio: { compact: 1.1, wide: 2 } }, w);
  });

  test.each([300, 520])('a fixed aspect: at %s px the reserved box is as tall too', (w) => {
    expectReserved({ ...PROPS, aspectRatio: 2 }, w);
  });

  test.each(WIDTHS)('equal units on both axes: at %s px the reserved box is as tall too', (w) => {
    expectReserved({ ...PROPS, equalAspect: true }, w);
  });

  test('equal units with a span ratio past the bounds: the clamped slope is the one reserved', () => {
    const tall = { ...PROPS, equalAspect: true, yDomain: { min: 0, max: 40 } };

    for (const width of [360, 720]) expectReserved(tall, width);
  });

  test('the switch sits half a pixel under COMPACT_WIDTH, where rounded widths turn wide', () => {
    const reserve = reserveOf(PROPS);

    expect(layoutAt(reserve, COMPACT_WIDTH - 0.6)).toBe('compact');
    expect(layoutAt(reserve, COMPACT_WIDTH - 0.5)).toBe('wide');
  });

  test('the default pair is the one the layout uses', () => {
    expect(PLOT_ASPECT).toEqual({ compact: 1.25, wide: 1.6 });
  });

  test('the reserve is the first render’s: it is computed once, not on every render until measured', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { rerender } = render(<SvgPlot {...PROPS} aspectRatio={2} />);
    rerender(<SvgPlot {...PROPS} aspectRatio={{ compact: 1.1, wide: 1.5 }} />);

    const svg = screen.getByRole('img') as unknown as SVGSVGElement;
    expect(svg.style.getPropertyValue('--plot-aspect-compact')).toBe('2');
  });

  test('measured, the box drops the reserve and takes the drawing’s natural height', () => {
    stubResizeObserver(400);
    render(<SvgPlot {...PROPS} />);

    const svg = screen.getByRole('img') as unknown as SVGSVGElement;
    expect(svg.getAttribute('class')).toBe('block h-auto');
    expect(svg.style.getPropertyValue('--plot-aspect-compact')).toBe('');
  });
});
