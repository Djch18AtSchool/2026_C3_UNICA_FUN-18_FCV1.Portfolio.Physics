import { describe, expect, test } from 'vitest';
import { linearScale } from '../../lab/plotScales';
import { scaleBarLength } from '../../lab/scaleBarMath';
import { fitView, IDENTITY_VIEW, toWorld, zoomAt, type ZoomFrame } from '../../lab/zoomMath';
import { JUMP_LIMITS } from './jumpModel';
import {
  JUMP_SCALE_UNITS,
  plotPxPerMetre,
  plotPointBox,
  sceneWindow,
  steadyLengthPerMs,
  zoomedWindow,
  type PlotSize,
} from './jumpZoom';

const SIZE: PlotSize = { width: 320, height: 160 };
/** The window of Celeste's opening jump, as sceneDomains frames it (a 2:1 plot). */
const BASE = { x: { min: -0.12, max: 3.0 }, y: { min: -0.06, max: 1.5 } };
const X_SPAN = BASE.x.max - BASE.x.min;
const Y_SPAN = BASE.y.max - BASE.y.min;
const FRAME: ZoomFrame = {
  viewport: SIZE,
  bounds: { x: 0, y: 0, ...SIZE },
  fit: { x: 0, y: 0, ...SIZE },
  limits: { minScale: 1, maxScale: 8 },
};
const centreOf = (domain: { min: number; max: number }) => (domain.min + domain.max) / 2;

describe('sceneWindow', () => {
  test('is the scene domains as a window of x and y', () => {
    expect(sceneWindow({ x: BASE.x, y: BASE.y })).toEqual(BASE);
  });
});

describe('zoomedWindow', () => {
  test('is the base window at the identity view, whatever the plot size', () => {
    expect(zoomedWindow(BASE, IDENTITY_VIEW, SIZE)).toEqual(BASE);
    expect(zoomedWindow(BASE, IDENTITY_VIEW, { width: 23, height: 7 })).toEqual(BASE);
  });

  test('is the base window while the plot is not measured', () => {
    const zoomed = { scale: 4, x: -100, y: -50 };
    expect(zoomedWindow(BASE, zoomed, { width: 0, height: 0 })).toEqual(BASE);
  });

  test('shows a window 1/scale as wide about the same centre when zoomed about it', () => {
    const view = zoomAt(IDENTITY_VIEW, 4, { x: SIZE.width / 2, y: SIZE.height / 2 }, FRAME);
    const { x, y } = zoomedWindow(BASE, view, SIZE);
    expect(x.max - x.min).toBeCloseTo(X_SPAN / 4, 9);
    expect(y.max - y.min).toBeCloseTo(Y_SPAN / 4, 9);
    expect(centreOf(x)).toBeCloseTo(centreOf(BASE.x), 9);
    expect(centreOf(y)).toBeCloseTo(centreOf(BASE.y), 9);
  });

  test('keeps the metre under the pointer where it was when zooming about the pointer', () => {
    const pointer = { x: 80, y: 120 };
    const metreAt = (window: typeof BASE) => ({
      x: window.x.min + (pointer.x / SIZE.width) * (window.x.max - window.x.min),
      y: window.y.max - (pointer.y / SIZE.height) * (window.y.max - window.y.min),
    });
    const after = zoomedWindow(BASE, zoomAt(IDENTITY_VIEW, 5, pointer, FRAME), SIZE);
    expect(metreAt(after).x).toBeCloseTo(metreAt(BASE).x, 9);
    expect(metreAt(after).y).toBeCloseTo(metreAt(BASE).y, 9);
  });

  test('moves with the pan: dragging the drawing right shows the metres to the left', () => {
    const zoomed = zoomAt(IDENTITY_VIEW, 4, { x: 0, y: 0 }, FRAME);
    const panned = { ...zoomed, x: zoomed.x + 40 };
    expect(zoomedWindow(BASE, panned, SIZE).x.min).toBeLessThan(
      zoomedWindow(BASE, zoomed, SIZE).x.min,
    );
    expect(zoomedWindow(BASE, panned, SIZE).y).toEqual(zoomedWindow(BASE, zoomed, SIZE).y);
  });

  test('never leaves the base window while the view obeys the clamp', () => {
    const corner = zoomAt(IDENTITY_VIEW, 8, { x: SIZE.width, y: SIZE.height }, FRAME);
    const { x, y } = zoomedWindow(BASE, corner, SIZE);
    expect(x.max).toBeCloseTo(BASE.x.max, 9);
    expect(y.min).toBeCloseTo(BASE.y.min, 9);
    expect(x.min).toBeGreaterThanOrEqual(BASE.x.min);
    expect(y.max).toBeLessThanOrEqual(BASE.y.max);
  });

  test('«Ajustar» gives back the whole base window', () => {
    const view = zoomAt(IDENTITY_VIEW, 6, { x: 10, y: 10 }, FRAME);
    expect(view.scale).toBe(6);
    expect(zoomedWindow(BASE, fitView(FRAME), SIZE)).toEqual(BASE);
  });

  test('keeps the window of the plot aspect, so equal units hold without SvgPlot widening it', () => {
    const view = zoomAt(IDENTITY_VIEW, 3, { x: 200, y: 40 }, FRAME);
    const { x, y } = zoomedWindow(BASE, view, SIZE);
    expect((y.max - y.min) / (x.max - x.min)).toBeCloseTo(Y_SPAN / X_SPAN, 9);
  });
});

describe('plotPxPerMetre', () => {
  /** The x scale the plot draws at a view: the window's domain over the plot's pixels. */
  const xScaleAt = (scale: number, plot: PlotSize = SIZE) => {
    const { x } = zoomedWindow(BASE, { scale, x: 0, y: 0 }, plot);
    return linearScale(x, [84, 84 + plot.width]);
  };

  test('is the plot width over the window width, times the scale', () => {
    expect(plotPxPerMetre(xScaleAt(1))).toBeCloseTo(SIZE.width / X_SPAN, 12);
    expect(plotPxPerMetre(xScaleAt(4))).toBeCloseTo((4 * SIZE.width) / X_SPAN, 12);
  });

  test('follows the plot as drawn, not the size the zoom last measured', () => {
    const wider = linearScale(BASE.x, [40, 40 + SIZE.width + 12]);
    expect(plotPxPerMetre(wider)).toBeCloseTo((SIZE.width + 12) / X_SPAN, 12);
  });

  test('gives a bar of round metres at known zooms', () => {
    /** The bar's text, whatever space it puts between the number and the unit. */
    const bar = (scale: number) =>
      scaleBarLength(plotPxPerMetre(xScaleAt(scale)), JUMP_SCALE_UNITS)?.text.replace(/\s/g, ' ');
    // 320 px over 3,12 m: 102,6 px/m, a 0,5 m bar is 51 px (too short), 1 m is 103 px.
    expect(bar(1)).toBe('1 m');
    expect(bar(4)).toBe('0,2 m');
    expect(bar(8)).toBe('0,1 m');
  });

  test('the bar measures what it says: px / (px per metre) is the value in metres', () => {
    const px = plotPxPerMetre(xScaleAt(3));
    const bar = scaleBarLength(px, JUMP_SCALE_UNITS);
    expect(bar && bar.px / px).toBeCloseTo(bar?.value ?? Number.NaN, 9);
  });
});

describe('steadyLengthPerMs', () => {
  test('is the lab’s metres per m/s at the identity view', () => {
    expect(steadyLengthPerMs(BASE.y, IDENTITY_VIEW.scale, JUMP_LIMITS)).toBeCloseTo(
      (0.5 * Y_SPAN) / JUMP_LIMITS.v0[1],
      12,
    );
  });

  test('shrinks with the scale, so a vector keeps its length on screen at any zoom', () => {
    const at = (scale: number) => steadyLengthPerMs(BASE.y, scale, JUMP_LIMITS);
    const onScreen = (scale: number) => at(scale) * scale;
    expect(onScreen(4)).toBeCloseTo(onScreen(1), 12);
    expect(onScreen(8)).toBeCloseTo(onScreen(1), 12);
  });
});

describe('plotPointBox', () => {
  test('is a box of 2·radius/scale centred where the plot point is, in drawing units', () => {
    const view = zoomAt(IDENTITY_VIEW, 4, { x: 100, y: 50 }, FRAME);
    const point = { x: 30, y: 20 };
    const box = plotPointBox(point, view, 12);
    const centre = toWorld(view, point);
    expect(box.width).toBeCloseTo(24 / 4, 12);
    expect(box.height).toBeCloseTo(24 / 4, 12);
    expect(box.x + box.width / 2).toBeCloseTo(centre.x, 12);
    expect(box.y + box.height / 2).toBeCloseTo(centre.y, 12);
  });

  test('is 2·radius wide at the identity view, where drawing units are screen px', () => {
    const box = plotPointBox({ x: 10, y: 10 }, IDENTITY_VIEW, 12);
    expect(box).toEqual({ x: -2, y: -2, width: 24, height: 24 });
  });
});
