import { describe, expect, test } from 'vitest';
import { linearScale } from '../../lab/plotScales';
import { actualSizeView, fitView, IDENTITY_VIEW, zoomAt } from '../../lab/zoomMath';
import type { ZoomFrame } from '../../lab/zoomMath';
import { scaleBarLength } from '../../lab/scaleBarMath';
import { MAP_DOMAIN } from './droneScene';
import {
  boxAroundPoint,
  ROUTE_SCALE_UNITS,
  plotPxPerMetre,
  zoomedWindow,
  type PlotSize,
} from './routeZoom';

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
