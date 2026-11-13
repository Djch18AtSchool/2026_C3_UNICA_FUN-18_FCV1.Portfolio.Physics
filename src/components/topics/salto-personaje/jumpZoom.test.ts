import { describe, expect, test } from 'vitest';
import { JUMP_PRESETS } from '../../../lib/data/jumpPresets';
import { linearScale } from '../../lab/plotScales';
import { SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX, scaleBarLength } from '../../lab/scaleBarMath';
import { axisTicks, yTickLabelChars } from '../../lab/SvgPlotAxes';
import { fitView, IDENTITY_VIEW, panBy, zoomAt, type ZoomFrame } from '../../lab/zoomMath';
import { computeJump, JUMP_LIMITS } from './jumpModel';
import { sceneDomains } from './jumpScene';
import {
  isPlotDrawn,
  JUMP_SCALE_UNITS,
  JUMP_Y_LABEL_CHARS,
  jumpScaleBarMaxPx,
  launchTipMetres,
  metresBox,
  metresToDrawing,
  plotAreaOf,
  steadyLengthPerMs,
  zoomedWindow,
  type PlotSize,
} from './jumpZoom';
import { plotPxPerMetre } from '../../lab/plotScales';

const SQRT2 = Math.SQRT2;
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

describe('metresBox', () => {
  const PLOT: PlotSize = { width: 320, height: 160 };

  test('is a box of 2·radius/scale centred where the metre point is drawn at ×1, in drawing units', () => {
    const at = { x: 1, y: 0.5 };
    const box = metresBox(at, BASE, PLOT, 12, 4);
    expect(box.width).toBeCloseTo(24 / 4, 12);
    expect(box.height).toBeCloseTo(24 / 4, 12);
    expect(box.x + box.width / 2).toBeCloseTo(((1 - BASE.x.min) / X_SPAN) * PLOT.width, 9);
    expect(box.y + box.height / 2).toBeCloseTo(((BASE.y.max - 0.5) / Y_SPAN) * PLOT.height, 9);
  });

  test('puts the window’s corners at the plot’s corners (y grows downward on the screen)', () => {
    const topLeft = metresBox({ x: BASE.x.min, y: BASE.y.max }, BASE, PLOT, 0, 1);
    expect(topLeft.x).toBeCloseTo(0, 9);
    expect(topLeft.y).toBeCloseTo(0, 9);
    const bottomRight = metresBox({ x: BASE.x.max, y: BASE.y.min }, BASE, PLOT, 0, 1);
    expect(bottomRight.x).toBeCloseTo(PLOT.width, 9);
    expect(bottomRight.y).toBeCloseTo(PLOT.height, 9);
  });

  test('is where the window shows the point: the same drawing px the zoomed window maps back to it', () => {
    const view = zoomAt(IDENTITY_VIEW, 4, { x: 100, y: 50 }, FRAME);
    const window = zoomedWindow(BASE, view, SIZE);
    const at = { x: (window.x.min + window.x.max) / 2, y: (window.y.min + window.y.max) / 2 };
    const box = metresBox(at, BASE, SIZE, 0, view.scale);
    // The window's centre is at the viewport's centre: screen = drawing · scale + offset.
    expect(box.x * view.scale + view.x).toBeCloseTo(SIZE.width / 2, 6);
    expect(box.y * view.scale + view.y).toBeCloseTo(SIZE.height / 2, 6);
  });
});

describe('isPlotDrawn', () => {
  test('is true when the measured size is the drawn one, to a sub-pixel', () => {
    expect(isPlotDrawn({ width: 334, height: 167 }, { width: 334.2, height: 166.8 })).toBe(true);
  });

  test('is false while the observer still has the plot of the last jump', () => {
    expect(isPlotDrawn({ width: 334, height: 167 }, { width: 334, height: 182 })).toBe(false);
  });

  test('is false before the plot is measured', () => {
    expect(isPlotDrawn({ width: 0, height: 0 }, { width: 334, height: 167 })).toBe(false);
  });
});

describe('plotAreaOf', () => {
  test('is the corner and size of the plot area, whichever way each scale runs', () => {
    const x = linearScale({ min: 0, max: 1 }, [84, 418]);
    const y = linearScale({ min: 0, max: 1 }, [189, 22]);
    expect(plotAreaOf({ x, y })).toEqual({ left: 84, top: 22, width: 334, height: 167 });
  });
});

describe('launchTipMetres', () => {
  test('is the launch speeds times the metres drawn per m/s', () => {
    expect(launchTipMetres({ v0: 10, vx: 4 }, 0.05)).toEqual({ x: 0.2, y: 0.5 });
  });
});

describe('jumpScaleBarMaxPx', () => {
  test('is half the plot’s width, between the shared minimum and maximum', () => {
    expect(jumpScaleBarMaxPx(230)).toBe(115);
    expect(jumpScaleBarMaxPx(334)).toBe(SCALE_BAR_MAX_PX);
    expect(jumpScaleBarMaxPx(100)).toBe(SCALE_BAR_MIN_PX);
  });

  test('gives a bar that clears half of a phone’s plot at every zoom', () => {
    const maxPx = jumpScaleBarMaxPx(230);
    for (const pxPerMetre of [10, 33, 75, 120, 300, 600, 1_000]) {
      const bar = scaleBarLength(pxPerMetre, JUMP_SCALE_UNITS, maxPx);
      expect(bar?.px ?? Infinity, `${pxPerMetre} px/m`).toBeLessThanOrEqual(maxPx + 1e-6);
    }
  });
});

describe('JUMP_Y_LABEL_CHARS', () => {
  /** Plot areas the lab draws at: a phone's, the two-column stage's, a wide single column's. */
  const WIDTHS = [218, 230, 334, 560];
  const SCALES = [1, 1.2, SQRT2, 2, 2.8, 4, 5.7, 8];
  const PAN_STEPS = 24;
  /** The presets and every corner of the sliders: the jumps of the widest and narrowest shapes. */
  const CORNERS = [2, JUMP_LIMITS.v0[1]].flatMap((v0) =>
    [JUMP_LIMITS.g[0], JUMP_LIMITS.g[1]].flatMap((g) =>
      [0, JUMP_LIMITS.vx[1]].flatMap((vx) =>
        [1, JUMP_LIMITS.fallMultiplier[1]].map((fallMultiplier) => ({ v0, g, vx, fallMultiplier })),
      ),
    ),
  );
  const JUMPS = [...JUMP_PRESETS.map((preset) => preset.values), ...CORNERS];

  /** The widest y tick label (chars) of the windows a view of this jump's plot can show at ×`scale`. */
  function widestLabels(base: typeof BASE, plot: PlotSize, scale: number): number {
    const frame: ZoomFrame = {
      viewport: plot,
      bounds: { x: 0, y: 0, ...plot },
      fit: { x: 0, y: 0, ...plot },
      limits: { minScale: 1, maxScale: 8 },
    };
    const start = zoomAt(IDENTITY_VIEW, scale, { x: 0, y: 0 }, frame);
    return Math.max(
      ...Array.from({ length: PAN_STEPS + 1 }, (_, step) => {
        // From the top of the window (y pan 0) to its bottom, at the left: the y labels only
        // depend on the y window.
        const view = panBy(start, { x: 0, y: (plot.height * scale * step) / PAN_STEPS }, frame);
        const { x, y } = zoomedWindow(base, view, plot);
        const ticks = axisTicks(linearScale(x, [0, plot.width]), linearScale(y, [plot.height, 0]));
        return yTickLabelChars(ticks.y);
      }),
    );
  }

  test('no window from ×1 to ×8, over the whole plot, of any preset or slider corner, has a wider y label', () => {
    for (const settings of JUMPS) {
      const base = sceneDomains([computeJump(settings)]);
      const slope = (base.y.max - base.y.min) / (base.x.max - base.x.min);
      for (const width of WIDTHS) {
        for (const scale of SCALES) {
          expect(
            widestLabels(base, { width, height: width * slope }, scale),
            `${JSON.stringify(settings)} at ${width} px, ×${scale}`,
          ).toBeLessThanOrEqual(JUMP_Y_LABEL_CHARS);
        }
      }
    }
  });

  test('is reached by some window, so the margin is not wider than it needs to be', () => {
    const reached = JUMPS.flatMap((settings) => {
      const base = sceneDomains([computeJump(settings)]);
      const slope = (base.y.max - base.y.min) / (base.x.max - base.x.min);
      return WIDTHS.flatMap((width) =>
        SCALES.map((scale) => widestLabels(base, { width, height: width * slope }, scale)),
      );
    });
    expect(Math.max(...reached)).toBe(JUMP_Y_LABEL_CHARS);
  });
});

describe('metresToDrawing (R33: the launch point the buttons keep)', () => {
  const PLOT: PlotSize = { width: 320, height: 160 };

  test('the launch point lands where the ×1 window draws (0, 0), and the zoomed window keeps it there', () => {
    const launch = metresToDrawing({ x: 0, y: 0 }, BASE, PLOT);
    expect(launch.x).toBeCloseTo(((0 - BASE.x.min) / X_SPAN) * PLOT.width, 9);
    expect(launch.y).toBeCloseTo(((BASE.y.max - 0) / Y_SPAN) * PLOT.height, 9);
    // About that point, a ×4 view still shows (0, 0) at the same plot px.
    const view = { scale: 4, x: launch.x - 4 * launch.x, y: launch.y - 4 * launch.y };
    const window = zoomedWindow(BASE, view, PLOT);
    expect(((0 - window.x.min) / (window.x.max - window.x.min)) * PLOT.width).toBeCloseTo(
      launch.x,
      9,
    );
    expect(((window.y.max - 0) / (window.y.max - window.y.min)) * PLOT.height).toBeCloseTo(
      launch.y,
      9,
    );
  });
});
