import { describe, expect, test } from 'vitest';
import { linearScale } from '../../lab/plotScales';
import { axisTicks, yTickLabelChars } from '../../lab/SvgPlotAxes';
import { actualSizeView, fitView, IDENTITY_VIEW, panBy, zoomAt } from '../../lab/zoomMath';
import type { ZoomFrame } from '../../lab/zoomMath';
import { SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX, scaleBarLength } from '../../lab/scaleBarMath';
import { SCALE_BAR_LABEL_GAP, SCALE_BAR_LABEL_SIZE, SCALE_BAR_TICK } from '../../lab/ScaleBar';
import { DRONE_ROUTE } from '../../../lib/data/droneRoute';
import { MAP_DOMAIN } from './droneScene';
import {
  boxAroundPoint,
  ROUTE_SCALE_UNITS,
  plotPxPerMetre,
  ROUTE_Y_LABEL_CHARS,
  ROUTE_BAR_GAP_PX,
  ROUTE_BAR_INSET_PX,
  ROUTE_KNOB_RADIUS_PX,
  routeScaleBarMaxPx,
  routeScaleBarSpot,
  ROUTE_ZOOM_COLUMN_PX,
  zoomedWindow,
  type PlotSize,
} from './routeZoom';

const SQRT2 = Math.SQRT2;
const SIZE: PlotSize = { width: 320, height: 290 };
const X_SPAN = MAP_DOMAIN.x.max - MAP_DOMAIN.x.min;
const Y_SPAN = MAP_DOMAIN.y.max - MAP_DOMAIN.y.min;
const FRAME: ZoomFrame = {
  viewport: SIZE,
  bounds: { x: 0, y: 0, ...SIZE },
  fit: { x: 0, y: 0, ...SIZE },
  limits: { minScale: 1, maxScale: 8 },
};

describe('zoomedWindow', () => {
  test('is the whole map window at the identity view', () => {
    expect(zoomedWindow(IDENTITY_VIEW, SIZE)).toEqual({ x: MAP_DOMAIN.x, y: MAP_DOMAIN.y });
  });

  test('is the whole map window while the plot is not measured', () => {
    const zoomed = { scale: 4, x: -100, y: -50 };
    expect(zoomedWindow(zoomed, { width: 0, height: 0 })).toEqual({
      x: MAP_DOMAIN.x,
      y: MAP_DOMAIN.y,
    });
  });

  test('shows a window 1/scale as wide about the same centre when zoomed about it', () => {
    const view = zoomAt(IDENTITY_VIEW, 4, { x: SIZE.width / 2, y: SIZE.height / 2 }, FRAME);
    const { x, y } = zoomedWindow(view, SIZE);
    expect(x.max - x.min).toBeCloseTo(X_SPAN / 4, 9);
    expect(y.max - y.min).toBeCloseTo(Y_SPAN / 4, 9);
    expect((x.min + x.max) / 2).toBeCloseTo((MAP_DOMAIN.x.min + MAP_DOMAIN.x.max) / 2, 9);
    expect((y.min + y.max) / 2).toBeCloseTo((MAP_DOMAIN.y.min + MAP_DOMAIN.y.max) / 2, 9);
  });

  test('keeps the metre under the pointer where it was when zooming about the pointer', () => {
    const pointer = { x: 80, y: 220 };
    const before = zoomedWindow(IDENTITY_VIEW, SIZE);
    const metreAt = (window: typeof before) => ({
      x: window.x.min + (pointer.x / SIZE.width) * (window.x.max - window.x.min),
      y: window.y.max - (pointer.y / SIZE.height) * (window.y.max - window.y.min),
    });
    const after = zoomedWindow(zoomAt(IDENTITY_VIEW, 5, pointer, FRAME), SIZE);
    expect(metreAt(after).x).toBeCloseTo(metreAt(before).x, 9);
    expect(metreAt(after).y).toBeCloseTo(metreAt(before).y, 9);
  });

  test('moves with the pan: dragging the drawing right shows the metres to the left', () => {
    const zoomed = zoomAt(IDENTITY_VIEW, 4, { x: 0, y: 0 }, FRAME);
    const panned = { ...zoomed, x: zoomed.x + 40 };
    expect(zoomedWindow(panned, SIZE).x.min).toBeLessThan(zoomedWindow(zoomed, SIZE).x.min);
    expect(zoomedWindow(panned, SIZE).y).toEqual(zoomedWindow(zoomed, SIZE).y);
  });

  test('never leaves the map window while the view obeys the clamp', () => {
    const corner = zoomAt(IDENTITY_VIEW, 8, { x: SIZE.width, y: SIZE.height }, FRAME);
    const { x, y } = zoomedWindow(corner, SIZE);
    expect(x.max).toBeCloseTo(MAP_DOMAIN.x.max, 9);
    expect(y.min).toBeCloseTo(MAP_DOMAIN.y.min, 9);
    expect(x.min).toBeGreaterThanOrEqual(MAP_DOMAIN.x.min);
    expect(y.max).toBeLessThanOrEqual(MAP_DOMAIN.y.max);
  });

  test('«Ajustar» gives back the whole window and «1:1» is the same view here', () => {
    const view = zoomAt(IDENTITY_VIEW, 6, { x: 10, y: 10 }, FRAME);
    expect(zoomedWindow(fitView(FRAME), SIZE)).toEqual(zoomedWindow(IDENTITY_VIEW, SIZE));
    expect(actualSizeView(view, FRAME).scale).toBe(1);
  });
});

describe('plotPxPerMetre', () => {
  /** The x scale the plot draws at a view: the window's domain over the plot's pixels. */
  const xScaleAt = (scale: number, plot: PlotSize = SIZE) => {
    const { x } = zoomedWindow({ scale, x: 0, y: 0 }, plot);
    return linearScale(x, [84, 84 + plot.width]);
  };

  test('is the plot width over the window width, times the scale', () => {
    expect(plotPxPerMetre(xScaleAt(1))).toBeCloseTo(SIZE.width / X_SPAN, 12);
    expect(plotPxPerMetre(xScaleAt(4))).toBeCloseTo((4 * SIZE.width) / X_SPAN, 12);
  });

  test('follows the plot as drawn, not the size the zoom last measured', () => {
    const wider = linearScale(zoomedWindow(IDENTITY_VIEW, SIZE).x, [40, 40 + SIZE.width + 12]);
    expect(plotPxPerMetre(wider)).toBeCloseTo((SIZE.width + 12) / X_SPAN, 12);
  });

  test('gives a bar of round metres at known zooms', () => {
    /** The bar's value and unit, whatever space the text puts between them. */
    const bar = (scale: number) =>
      scaleBarLength(plotPxPerMetre(xScaleAt(scale)), ROUTE_SCALE_UNITS)?.text.replace(/\s/g, ' ');
    expect(bar(1)).toBe('500 m');
    expect(bar(2.5)).toBe('200 m');
    expect(bar(8)).toBe('100 m');
  });

  test('the bar measures what it says: px / (px per metre) is the value in metres', () => {
    const px = plotPxPerMetre(xScaleAt(3));
    const bar = scaleBarLength(px, ROUTE_SCALE_UNITS);
    expect(bar && bar.px / px).toBeCloseTo(bar?.value ?? Number.NaN, 9);
  });
});

describe('boxAroundPoint', () => {
  test('is a box centred on where the metre point is drawn at the identity view', () => {
    const centre = { x: 0, y: 0 };
    const box = boxAroundPoint(centre, SIZE, 10);
    expect(box.x + box.width / 2).toBeCloseTo(((0 - MAP_DOMAIN.x.min) / X_SPAN) * SIZE.width, 9);
    expect(box.y + box.height / 2).toBeCloseTo(((MAP_DOMAIN.y.max - 0) / Y_SPAN) * SIZE.height, 9);
    expect(box.width).toBe(20);
    expect(box.height).toBe(20);
  });

  test('the top of the map window is the top of the box space (y grows downward)', () => {
    const top = boxAroundPoint({ x: 0, y: MAP_DOMAIN.y.max }, SIZE, 4);
    expect(top.y + top.height / 2).toBeCloseTo(0, 9);
  });

  test('is a box of nothing in the plot while it is not measured', () => {
    const box = boxAroundPoint({ x: 600, y: 200 }, { width: 0, height: 0 }, 10);
    expect(box).toEqual({ x: -10, y: -10, width: 20, height: 20 });
  });
});

describe('ROUTE_Y_LABEL_CHARS', () => {
  /** Plot areas the lab draws at: a phone's, the two-column stage's, a wide single column's. */
  const PLOTS: PlotSize[] = [
    { width: 174, height: 158 },
    { width: 218, height: 198 },
    { width: 322, height: 292 },
    { width: 560, height: 507 },
  ];
  const SCALES = [1, 1.2, SQRT2, 2, 2.5, 2.8, 4, 5.7, 8];
  const PAN_STEPS = 12;

  /** The widest y tick label (chars) of every window a view of the plot can show at `scale`. */
  function widestLabels(scale: number, plot: PlotSize): number[] {
    const frame: ZoomFrame = {
      viewport: plot,
      bounds: { x: 0, y: 0, ...plot },
      fit: { x: 0, y: 0, ...plot },
      limits: { minScale: 1, maxScale: 8 },
    };
    const start = zoomAt(IDENTITY_VIEW, scale, { x: 0, y: 0 }, frame);
    return Array.from({ length: PAN_STEPS + 1 }, (_, step) => {
      // From the bottom of the map (y pan 0) to the top, at a few x as well.
      const view = panBy(start, { x: 0, y: (plot.height * scale * step) / PAN_STEPS }, frame);
      const { x, y } = zoomedWindow(view, plot);
      const ticks = axisTicks(linearScale(x, [0, plot.width]), linearScale(y, [plot.height, 0]));
      return yTickLabelChars(ticks.y);
    });
  }

  test('is the widest y label of the whole map window, so ×1 keeps SvgPlot’s own margin', () => {
    for (const plot of PLOTS) {
      expect(widestLabels(1, plot)[0]).toBe(ROUTE_Y_LABEL_CHARS);
    }
  });

  test('no window from ×1 to ×8, panned over the whole map, has a wider y label', () => {
    for (const plot of PLOTS) {
      for (const scale of SCALES) {
        expect(
          Math.max(...widestLabels(scale, plot)),
          `×${scale} at ${plot.width} px`,
        ).toBeLessThanOrEqual(ROUTE_Y_LABEL_CHARS);
      }
    }
  });
});

describe('routeScaleBarMaxPx', () => {
  const STOP_C_X = DRONE_ROUTE.stops[3].x;
  /** Where stop C's knob ends, px from the plot's left edge, at the whole window. */
  const cRight = (plotWidth: number) =>
    ((STOP_C_X - MAP_DOMAIN.x.min) / X_SPAN) * plotWidth + ROUTE_KNOB_RADIUS_PX;
  const WIDTHS = [174, 178, 200, 218, 250, 322, 400, 560];

  test.each(WIDTHS)(
    'at a plot %i px wide the bar at the top right clears stop C by the gap',
    (width) => {
      const px = routePxPerMetreAtWhole(width);
      const bar = scaleBarLength(px, ROUTE_SCALE_UNITS, routeScaleBarMaxPx(width))!;
      const barLeft = width - ROUTE_BAR_INSET_PX - bar.px;

      expect(barLeft - cRight(width)).toBeGreaterThanOrEqual(ROUTE_BAR_GAP_PX - 1e-9);
    },
  );

  test.each(WIDTHS)(
    'is never longer than the shared maximum nor shorter than the minimum',
    (width) => {
      const max = routeScaleBarMaxPx(width);

      expect(max).toBeLessThanOrEqual(SCALE_BAR_MAX_PX);
      expect(max).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX);
    },
  );

  test('leaves the shared maximum alone where there is room (a wide plot)', () => {
    expect(routeScaleBarMaxPx(560)).toBe(SCALE_BAR_MAX_PX);
  });
});

/** px per metre of a plot `width` wide showing the whole window. */
function routePxPerMetreAtWhole(width: number): number {
  return width / X_SPAN;
}

describe('routeScaleBarSpot', () => {
  /** The plot area's corner in the svg, as SvgPlot's compact layout puts it. */
  const AREA = { left: 52, top: 30 };

  test('in a plot tall enough for the column under it, the bar keeps its top-right corner', () => {
    const height = ROUTE_ZOOM_COLUMN_PX.height + 64;
    const spot = routeScaleBarSpot({ ...AREA, width: 218, height });

    expect(spot.isAbovePlot).toBe(false);
    expect(spot.x).toBe(AREA.left + 218 - ROUTE_BAR_INSET_PX);
    expect(spot.y).toBeGreaterThan(AREA.top);
    expect(spot.maxPx).toBe(routeScaleBarMaxPx(218));
    // The column's top (bottom-right corner, 8 px in) stays below the bar's line.
    const columnTop = AREA.top + height - ROUTE_BAR_INSET_PX - ROUTE_ZOOM_COLUMN_PX.height;
    expect(columnTop).toBeGreaterThan(spot.y);
  });

  test('in a short plot (Tema 1 at 320 px: 178 × 161) the bar goes over the plot, never under the column', () => {
    const spot = routeScaleBarSpot({ ...AREA, width: 178, height: 161 });

    expect(spot.isAbovePlot).toBe(true);
    expect(spot.x).toBe(AREA.left + 178);
    expect(spot.y).toBeLessThan(AREA.top);
    // Its words and ticks fit in the compact top margin (30 px).
    expect(spot.y - SCALE_BAR_HEIGHT_PX).toBeGreaterThanOrEqual(0);
    expect(spot.maxPx).toBe(SCALE_BAR_MIN_PX);
  });

  test('switches exactly where the column would reach the bar', () => {
    const tallest = [150, 160, 170, 180, 190, 200, 210].map(
      (height) => routeScaleBarSpot({ ...AREA, width: 200, height }).isAbovePlot,
    );
    expect(tallest).toEqual([true, true, true, true, true, false, false]);
  });
});

/** The bar's ticks, gap and words above its line (ScaleBarSvg). */
const SCALE_BAR_HEIGHT_PX = SCALE_BAR_TICK + SCALE_BAR_LABEL_GAP + SCALE_BAR_LABEL_SIZE;
