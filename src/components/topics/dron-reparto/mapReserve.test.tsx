// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { DRONE_ROUTE, type RouteSample } from '../../../lib/data/droneRoute';
import { createFrameStore } from '../../lab/frameStore';
import { stubResizeObserver, viewBoxOf } from '../../lab/svgPlotTestKit';
import {
  MAP_PLOT_CLASS,
  MAP_PLOT_VARS,
  MAP_FIGURE_CHROME,
  MAP_WIDE_FROM_CONTAINER,
  mapPlotHeight,
} from './mapReserve';
import { sampleAt } from './routeEdit';
import RouteMapLab from './RouteMapLab';

let samples: RouteSample[] = [];
beforeAll(async () => {
  samples = (await import('../../../data/drone-route.json')).default.samples;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** The route map at an svg width, as the browser would measure it. */
function renderMapAt(svgWidth: number) {
  stubResizeObserver(svgWidth);
  const now = sampleAt(samples, 30);
  return render(
    <RouteMapLab
      stops={DRONE_ROUTE.stops}
      samples={samples}
      now={now}
      live={{ frame: createFrameStore(), sampleAt: (t) => sampleAt(samples, t) }}
      duration={387.43}
      showVectors
      showTrail
      velocityScale={15}
      accelScale={60}
      decimals={2}
      onStopDrag={() => undefined}
      onSeek={() => undefined}
    />,
  );
}

const PHONE_WIDTH = 246;
const NARROWEST_WIDTH = 240;
const WIDEST_COMPACT = 479;
const NARROWEST_WIDE = 480;
const COLUMN_WIDTH = 561;
const FULL_WIDTH = 725;

describe('mapPlotHeight', () => {
  test.each([
    NARROWEST_WIDTH,
    PHONE_WIDTH,
    363,
    WIDEST_COMPACT,
    NARROWEST_WIDE,
    COLUMN_WIDTH,
    FULL_WIDTH,
  ])('is the height SvgPlot gives the map at an svg width of %i px', (width) => {
    const { container } = renderMapAt(width);

    const [, , viewWidth, viewHeight] = viewBoxOf(container.querySelector('svg[role="img"]')!);

    expect(viewWidth).toBe(width);
    expect(viewHeight).toBeCloseTo(mapPlotHeight(width), 1);
  });
});

describe('the reserved height in CSS', () => {
  test('both layouts are written from the same numbers as mapPlotHeight, in the figure width less its frame', () => {
    // The frame is 2 rem of padding and 2 px of border; the compact margins add 66 px, the wide 112.
    expect(MAP_PLOT_VARS['--map-plot-h-compact']).toBe(
      'calc(80px + 0.90625 * (100cqw - 2rem - 68px))',
    );
    expect(MAP_PLOT_VARS['--map-plot-h-wide']).toBe(
      'calc(80px + 0.90625 * (100cqw - 2rem - 114px))',
    );
  });

  test('with a 16 px root, a 300 px container is the compact layout and mapPlotHeight agrees', () => {
    const REM = 16;
    const svgWidth = 300 - 2 * REM - 2;
    expect(mapPlotHeight(svgWidth)).toBeCloseTo(80 + 0.90625 * (300 - 2 * REM - 68), 5);
  });

  test('the wide layout starts where the svg reaches 480 px: the figure frame wider', () => {
    expect(MAP_WIDE_FROM_CONTAINER).toBe('calc(482px + 2rem)');
    expect(MAP_PLOT_CLASS).toContain(`@min-[${MAP_WIDE_FROM_CONTAINER.replace(' + ', '+')}]`);
  });

  test('the figure around the svg adds 4 rem and 2 px: border, padding, caption and its margin', () => {
    expect(MAP_FIGURE_CHROME).toBe('calc(4rem + 2px)');
  });

  test('the map sits in a container of its own that carries both heights', () => {
    const { container } = renderMapAt(PHONE_WIDTH);

    const reserve = container.firstElementChild as HTMLElement;
    expect(reserve.className).toContain('@container');
    expect(reserve.style.getPropertyValue('--map-plot-h-compact')).toBe(
      MAP_PLOT_VARS['--map-plot-h-compact'],
    );
    expect(reserve.querySelector('svg[role="img"]')).not.toBeNull();
  });
});
