// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { DRONE_ROUTE, type RouteSample } from '../../../lib/data/droneRoute';
import { createFrameStore } from '../../lab/frameStore';
import { WIDE_FROM_PX } from '../../lab/svgPlotReserve';
import { stubResizeObserver, viewBoxOf } from '../../lab/svgPlotTestKit';
import { resolveCssLength } from '../../../test-css-length';
import {
  MAP_FIGURE_CHROME,
  MAP_FIGURE_CLASS,
  MAP_FIGURE_VARS,
  MAP_WIDE_FROM_CONTAINER,
  mapPlotHeight,
} from './mapReserve';
import { sampleAt } from './routeEdit';
import DroneSkeleton from './DroneSkeleton';
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

/** A CSS length of this module, resolved at a container width and a root size. */
const resolveCss = (expression: string, container: number, rem: number) =>
  resolveCssLength(expression, { container, rem });

/** The figure's height around an svg of the given width: the svg plus the frame and caption. */
const figureHeight = (svgWidth: number, rem: number) =>
  mapPlotHeight(svgWidth) + resolveCss(MAP_FIGURE_CHROME, 0, rem);

describe('the skeleton’s placeholder of the map figure', () => {
  // The frame is in rem: check both the current 17 px root and phase C's 16 px.
  test.each([
    [300, 17],
    [360, 16],
    [515, 17],
    [600, 16],
    [800, 17],
  ])('a %i px container at a %i px root is as tall as the figure SvgPlot draws', (width, rem) => {
    const svgWidth = width - 2 * rem - 2;
    const wideFrom = resolveCss(MAP_WIDE_FROM_CONTAINER, 0, rem);
    const layout = width >= wideFrom ? 'wide' : 'compact';

    expect(resolveCss(MAP_FIGURE_VARS[`--map-figure-h-${layout}`], width, rem)).toBeCloseTo(
      figureHeight(svgWidth, rem),
      5,
    );
  });

  test('turns wide where SvgPlot does (479,5 px of svg): the map and the chart places say the same threshold', () => {
    expect(resolveCss(MAP_WIDE_FROM_CONTAINER, 0, 16)).toBe(WIDE_FROM_PX + 2 + 2 * 16);
    expect(MAP_FIGURE_CLASS).toContain(`@min-[${MAP_WIDE_FROM_CONTAINER}]:`);

    // Tailwind needs each class literal: every place that switches with the svg uses this one.
    const { container } = render(<DroneSkeleton status="loading" />);
    const switching = [...container.querySelectorAll('[class*="@min-[calc("]')];
    expect(switching.length).toBeGreaterThan(1);
    for (const place of switching) {
      expect(place.getAttribute('class')).toContain(`@min-[${MAP_WIDE_FROM_CONTAINER}]:`);
    }
  });

  test('the mounted map reserves, through SvgPlot, the height the placeholder says', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const now = sampleAt(samples, 30);
    const { container } = render(
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
    const svg = container.querySelector('svg[role="img"]') as unknown as SVGSVGElement;

    for (const svgWidth of [
      PHONE_WIDTH,
      320,
      363,
      414,
      WIDEST_COMPACT,
      NARROWEST_WIDE,
      COLUMN_WIDTH,
    ]) {
      const layout = svgWidth >= NARROWEST_WIDE ? 'wide' : 'compact';
      const reserved = svg.style.getPropertyValue(`--plot-height-${layout}`);
      expect(resolveCss(reserved, svgWidth, 16)).toBeCloseTo(mapPlotHeight(svgWidth), 1);
    }
  });
});
