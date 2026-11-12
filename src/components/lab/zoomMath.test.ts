import { describe, expect, test } from 'vitest';
import {
  actualSizeView,
  clampPan,
  clampScale,
  DEFAULT_ZOOM_LIMITS,
  fitView,
  formatZoomFactor,
  IDENTITY_VIEW,
  interpolateView,
  pinchView,
  REVEAL_MARGIN_PX,
  revealView,
  panBy,
  requireZoomFrame,
  toScreen,
  toWorld,
  viewsEqual,
  viewTransform,
  wheelDeltaPx,
  wheelZoomFactor,
  zoomAt,
  zoomSpoken,
  type ZoomFrame,
  type ZoomView,
} from './zoomMath';

const NNBSP = ' ';
const VIEWPORT = { width: 400, height: 300 };
const frame = (overrides: Partial<ZoomFrame> = {}): ZoomFrame => ({
  viewport: VIEWPORT,
  bounds: { x: 0, y: 0, ...VIEWPORT },
  fit: { x: 0, y: 0, ...VIEWPORT },
  limits: DEFAULT_ZOOM_LIMITS,
  ...overrides,
});
const view = (scale: number, x = 0, y = 0): ZoomView => ({ scale, x, y });

describe('clampScale', () => {
  test('keeps a scale inside the limits and pulls one outside to the nearest limit', () => {
    const limits = { minScale: 0.5, maxScale: 4 };

    expect(clampScale(2, limits)).toBe(2);
    expect(clampScale(0.1, limits)).toBe(0.5);
    expect(clampScale(9, limits)).toBe(4);
  });
});

describe('requireZoomFrame', () => {
  test('accepts positive limits in order and positive boxes', () => {
    expect(() => requireZoomFrame(frame())).not.toThrow();
  });

  test.each([
    ['a minimum of zero', { limits: { minScale: 0, maxScale: 8 } }],
    ['a maximum under the minimum', { limits: { minScale: 2, maxScale: 1 } }],
    ['an infinite maximum', { limits: { minScale: 1, maxScale: Infinity } }],
    ['empty bounds', { bounds: { x: 0, y: 0, width: 0, height: 10 } }],
    ['an empty box to fit', { fit: { x: 0, y: 0, width: 10, height: -1 } }],
  ])('throws with %s, naming the fix', (_name, overrides) => {
    expect(() => requireZoomFrame(frame(overrides))).toThrow(/useZoomPan/u);
  });
});

describe('toScreen and toWorld', () => {
  test('map a drawing point to the viewport and back', () => {
    const at = view(2, 10, -20);

    expect(toScreen(at, { x: 5, y: 5 })).toEqual({ x: 20, y: -10 });
    expect(toWorld(at, { x: 20, y: -10 })).toEqual({ x: 5, y: 5 });
  });

  test('the identity view leaves points where they are', () => {
    expect(toScreen(IDENTITY_VIEW, { x: 7, y: 9 })).toEqual({ x: 7, y: 9 });
  });
});

describe('viewTransform', () => {
  test('is an SVG transform: translate, then scale', () => {
    expect(viewTransform(view(2.5, 10, -4))).toBe('translate(10 -4) scale(2.5)');
  });
});

describe('clampPan', () => {
  test('a drawing larger than the viewport cannot leave a gap at any edge', () => {
    // At ×2 the 400 × 300 drawing is 800 × 600: x in [−400, 0], y in [−300, 0].
    expect(clampPan(view(2, 50, 40), frame())).toEqual(view(2, 0, 0));
    expect(clampPan(view(2, -500, -400), frame())).toEqual(view(2, -400, -300));
    expect(clampPan(view(2, -100, -50), frame())).toEqual(view(2, -100, -50));
  });

  test('a drawing smaller than the viewport stays whole inside it', () => {
    const limits = { minScale: 0.5, maxScale: 8 };
    // At ×0,5 the drawing is 200 × 150: x in [0, 200], y in [0, 150].
    expect(clampPan(view(0.5, -10, 400), frame({ limits }))).toEqual(view(0.5, 0, 150));
    expect(clampPan(view(0.5, 120, 60), frame({ limits }))).toEqual(view(0.5, 120, 60));
  });

  test('bounds off the origin shift the allowed offsets with them', () => {
    const bounds = { x: -100, y: 0, width: 600, height: 300 };
    // At ×1 the drawing spans x from −100 to 500: x in [−100, 100].
    expect(clampPan(view(1, 150, 0), frame({ bounds }))).toEqual(view(1, 100, 0));
    expect(clampPan(view(1, -150, 0), frame({ bounds }))).toEqual(view(1, -100, 0));
  });

  test('an unmeasured viewport leaves the view as it is', () => {
    const unmeasured = frame({ viewport: { width: 0, height: 0 } });

    expect(clampPan(view(2, 50, 40), unmeasured)).toEqual(view(2, 50, 40));
  });

  test('returns a new object and leaves its argument alone', () => {
    const before = view(2, 50, 40);

    const after = clampPan(before, frame());

    expect(after).not.toBe(before);
    expect(before).toEqual(view(2, 50, 40));
  });
});

describe('zoomAt', () => {
  test('keeps the drawing point under the anchor where it was', () => {
    const anchor = { x: 100, y: 75 };
    const before = toWorld(IDENTITY_VIEW, anchor);

    const after = zoomAt(IDENTITY_VIEW, 2, anchor, frame());

    expect(after.scale).toBe(2);
    expect(toScreen(after, before)).toEqual(anchor);
  });

  test('stops at the limits and keeps the anchor there too', () => {
    const anchor = { x: 200, y: 150 };

    const after = zoomAt(view(6), 4, anchor, frame());

    expect(after.scale).toBe(DEFAULT_ZOOM_LIMITS.maxScale);
    expect(zoomAt(view(1), 0.5, anchor, frame()).scale).toBe(DEFAULT_ZOOM_LIMITS.minScale);
  });

  test('the pan it leaves is clamped', () => {
    // Zooming out to ×1 about a corner would leave a gap; the clamp closes it.
    expect(zoomAt(view(2, -400, -300), 0.5, { x: 0, y: 0 }, frame())).toEqual(view(1, 0, 0));
  });
});

describe('panBy', () => {
  test('moves the drawing by the given pixels, clamped', () => {
    expect(panBy(view(2, -100, -100), { x: 30, y: -50 }, frame())).toEqual(view(2, -70, -150));
    expect(panBy(view(2, -100, -100), { x: 500, y: 0 }, frame())).toEqual(view(2, 0, -100));
  });

  test('at ×1 with the drawing filling the viewport there is nothing to pan', () => {
    expect(panBy(IDENTITY_VIEW, { x: 48, y: 48 }, frame())).toEqual(IDENTITY_VIEW);
  });
});

describe('fitView («Ajustar»)', () => {
  test('frames the whole drawing by default: the identity view', () => {
    expect(fitView(frame())).toEqual(IDENTITY_VIEW);
  });

  test('frames a box of interest, centred, as large as it fits', () => {
    // A 100 × 50 box at (100, 100): ×4 by width (×6 by height), centred in 400 × 300.
    const fit = { x: 100, y: 100, width: 100, height: 50 };

    const framed = fitView(frame({ fit }));

    expect(framed.scale).toBe(4);
    expect(toScreen(framed, { x: 150, y: 125 })).toEqual({ x: 200, y: 150 });
  });

  test('stays inside the limits', () => {
    const fit = { x: 0, y: 0, width: 10, height: 10 };

    expect(fitView(frame({ fit })).scale).toBe(DEFAULT_ZOOM_LIMITS.maxScale);
  });

  test('a drawing larger than the viewport is shrunk to fit when the limits allow', () => {
    const bounds = { x: 0, y: 0, width: 800, height: 300 };
    const limits = { minScale: 0.25, maxScale: 8 };

    const framed = fitView(frame({ bounds, fit: bounds, limits }));

    expect(framed).toEqual(view(0.5, 0, 75));
  });

  test('an unmeasured viewport gives the identity view (what the server paints)', () => {
    expect(fitView(frame({ viewport: { width: 0, height: 0 } }))).toEqual(IDENTITY_VIEW);
  });
});

describe('actualSizeView («1:1»)', () => {
  test('returns to ×1 keeping the point at the centre of the viewport', () => {
    const bounds = { x: 0, y: 0, width: 1600, height: 1200 };
    const at = view(2, -1000, -800);
    const centre = toWorld(at, { x: 200, y: 150 });

    const actual = actualSizeView(at, frame({ bounds }));

    expect(actual.scale).toBe(1);
    expect(toScreen(actual, centre)).toEqual({ x: 200, y: 150 });
  });

  test('with the default bounds it lands on the identity view', () => {
    expect(actualSizeView(view(3, -300, -200), frame())).toEqual(IDENTITY_VIEW);
  });

  test('an unmeasured viewport only resets the scale', () => {
    expect(actualSizeView(view(3, -30, -20), frame({ viewport: { width: 0, height: 0 } }))).toEqual(
      view(1, -30, -20),
    );
  });
});

describe('revealView', () => {
  // At ×2 about the centre: x in [−400, 0], y in [−300, 0]; the view shows drawing x 100–300.
  const zoomed = view(2, -200, -150);

  test('a box already in view, with its margin, leaves the view alone', () => {
    expect(revealView(zoomed, { x: 150, y: 100, width: 20, height: 20 }, frame())).toEqual(zoomed);
  });

  test('a box off the left edge comes in by the least pan, to the margin', () => {
    const revealed = revealView(zoomed, { x: 40, y: 100, width: 10, height: 10 }, frame());

    expect(toScreen(revealed, { x: 40, y: 100 }).x).toBe(REVEAL_MARGIN_PX);
    expect(revealed.y).toBe(zoomed.y);
    expect(revealed.scale).toBe(2);
  });

  test('a box off the right and the bottom edges comes in to the margin there', () => {
    const revealed = revealView(zoomed, { x: 330, y: 260, width: 10, height: 10 }, frame());
    const corner = toScreen(revealed, { x: 340, y: 270 });

    expect(corner.x).toBe(VIEWPORT.width - REVEAL_MARGIN_PX);
    expect(corner.y).toBe(VIEWPORT.height - REVEAL_MARGIN_PX);
  });

  test('a box larger than the viewport shows its start (top-left)', () => {
    const revealed = revealView(zoomed, { x: 20, y: 20, width: 300, height: 10 }, frame());

    expect(toScreen(revealed, { x: 20, y: 20 }).x).toBe(REVEAL_MARGIN_PX);
  });

  test('the pan stays inside the drawing', () => {
    const revealed = revealView(zoomed, { x: 0, y: 0, width: 4, height: 4 }, frame());

    expect(revealed).toEqual(view(2, 0, 0));
  });

  test('an unmeasured viewport leaves the view alone', () => {
    const unmeasured = frame({ viewport: { width: 0, height: 0 } });

    expect(revealView(zoomed, { x: 0, y: 0, width: 4, height: 4 }, unmeasured)).toEqual(zoomed);
  });
});

describe('pinchView', () => {
  test('spreading two fingers to twice their distance doubles the scale about their midpoint', () => {
    const from = [
      { x: 150, y: 150 },
      { x: 250, y: 150 },
    ] as const;
    const to = [
      { x: 100, y: 150 },
      { x: 300, y: 150 },
    ] as const;
    const under = toWorld(IDENTITY_VIEW, { x: 200, y: 150 });

    const pinched = pinchView(IDENTITY_VIEW, from, to, frame());

    expect(pinched.scale).toBe(2);
    expect(toScreen(pinched, under)).toEqual({ x: 200, y: 150 });
  });

  test('moving both fingers together pans by the midpoint', () => {
    const start = view(2, -200, -150);
    const from = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ] as const;
    const to = [
      { x: 130, y: 90 },
      { x: 230, y: 90 },
    ] as const;

    expect(pinchView(start, from, to, frame())).toEqual(view(2, -170, -160));
  });

  test('two fingers on the same point leave the view unchanged', () => {
    const same = [
      { x: 100, y: 100 },
      { x: 100, y: 100 },
    ] as const;

    expect(pinchView(view(2, -10, -10), same, same, frame())).toEqual(view(2, -10, -10));
  });
});

describe('interpolateView', () => {
  test('starts at the first view and ends at the second', () => {
    const a = view(1);
    const b = view(4, -300, -200);

    expect(interpolateView(a, b, 0)).toEqual(a);
    expect(interpolateView(a, b, 1)).toEqual(b);
  });

  test('scales geometrically: halfway from ×1 to ×4 is ×2', () => {
    expect(interpolateView(view(1), view(4, -300, -225), 0.5).scale).toBeCloseTo(2, 10);
  });

  test('a zoom about a point keeps that point still all the way', () => {
    const anchor = { x: 120, y: 80 };
    const b = zoomAt(IDENTITY_VIEW, 4, anchor, frame());
    const under = toWorld(IDENTITY_VIEW, anchor);

    for (const t of [0.25, 0.5, 0.75]) {
      const middle = toScreen(interpolateView(IDENTITY_VIEW, b, t), under);
      expect(middle.x).toBeCloseTo(anchor.x, 9);
      expect(middle.y).toBeCloseTo(anchor.y, 9);
    }
  });

  test('a pan at the same scale moves in a straight line', () => {
    expect(interpolateView(view(2, 0, 0), view(2, -100, -40), 0.25)).toEqual(view(2, -25, -10));
  });
});

describe('viewsEqual', () => {
  test('ignores sub-pixel and rounding noise, not real differences', () => {
    expect(viewsEqual(view(2, 10, 10), view(2 + 1e-9, 10.0001, 10))).toBe(true);
    expect(viewsEqual(view(2, 10, 10), view(2.01, 10, 10))).toBe(false);
    expect(viewsEqual(view(2, 10, 10), view(2, 11, 10))).toBe(false);
  });
});

describe('wheel', () => {
  test('wheelDeltaPx turns lines and pages into pixels', () => {
    expect(wheelDeltaPx(100, 0, 800)).toBe(100);
    expect(wheelDeltaPx(3, 1, 800)).toBe(48);
    expect(wheelDeltaPx(1, 2, 800)).toBe(800);
  });

  test('wheelZoomFactor zooms in on a wheel turned away from the reader, out towards', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
    expect(wheelZoomFactor(100) * wheelZoomFactor(-100)).toBeCloseTo(1, 12);
    expect(wheelZoomFactor(0)).toBe(1);
  });

  test('one notch of a mouse wheel (100 px) is about one button step', () => {
    expect(wheelZoomFactor(-100)).toBeCloseTo(Math.SQRT2, 1);
  });

  test('a huge delta is capped to one doubling or halving', () => {
    expect(wheelZoomFactor(-100_000)).toBe(2);
    expect(wheelZoomFactor(100_000)).toBe(0.5);
  });
});

describe('formatZoomFactor and zoomSpoken', () => {
  test('two significant digits with a decimal comma, like the time factor', () => {
    expect(formatZoomFactor(2.5)).toBe('×2,5');
    expect(formatZoomFactor(Math.SQRT2)).toBe('×1,4');
    expect(formatZoomFactor(1)).toBe('×1');
    expect(formatZoomFactor(0.5)).toBe('×0,5');
  });

  test('says the factor in words', () => {
    expect(zoomSpoken(1)).toBe('Zoom: tamaño real');
    expect(zoomSpoken(2.5)).toBe('Zoom: 2,5 veces el tamaño real');
    expect(zoomSpoken(0.5)).toBe('Zoom: 0,5 veces el tamaño real');
    expect(zoomSpoken(1000)).toBe(`Zoom: 1${NNBSP}000 veces el tamaño real`);
  });
});
