import { describe, expect, test } from 'vitest';
import {
  arcPath,
  centreOn,
  clampRp,
  planetView,
  RP_RANGE,
  rpFromDistance,
  rpKeyTarget,
  rpToSlider,
  scaleBar,
  sliderToRp,
  tipLabel,
  triangleLayout,
} from './flybyScene';

const R_J = 71492;

describe('log r_p scale (1 to 100 planet radii)', () => {
  test('the ends of the bar are the ends of the range, 10 R sits in the middle', () => {
    expect(rpToSlider(1)).toBe(0);
    expect(rpToSlider(100)).toBe(1);
    expect(rpToSlider(10)).toBeCloseTo(0.5, 12);
    expect(sliderToRp(0)).toBe(1);
    expect(sliderToRp(1)).toBe(100);
  });

  test('sliderToRp keeps 0,01 R and does not clamp, so a drag can ask for less than 1 R', () => {
    expect(sliderToRp(rpToSlider(10.09))).toBe(10.09);
    expect(sliderToRp(-0.25)).toBeLessThan(1);
    expect(sliderToRp(1.2)).toBeGreaterThan(100);
  });

  test('rpToSlider clamps values outside the range', () => {
    expect(rpToSlider(0.2)).toBe(0);
    expect(rpToSlider(400)).toBe(1);
  });
});

describe('clampRp', () => {
  test('keeps a value in range with no warning', () => {
    expect(clampRp(10.09)).toEqual({ rp: 10.09, warning: null });
  });

  test('below 1 R the probe would hit the planet: 1 R and a warning', () => {
    expect(clampRp(0.4)).toEqual({ rp: RP_RANGE.min, warning: 'below' });
  });

  test('above 100 R it stops at the end of the range', () => {
    expect(clampRp(250)).toEqual({ rp: RP_RANGE.max, warning: 'above' });
  });

  test('a value that is not a number falls back to 1 R with the warning', () => {
    expect(clampRp(Number.NaN)).toEqual({ rp: RP_RANGE.min, warning: 'below' });
  });
});

describe('rpKeyTarget', () => {
  test('arrows move 1 % of the log bar, Shift and Page keys 10 %', () => {
    expect(rpKeyTarget('ArrowRight', false, 10)).toBe(10.47);
    expect(rpKeyTarget('ArrowLeft', false, 10)).toBe(9.55);
    expect(rpKeyTarget('ArrowUp', true, 10)).toBe(15.85);
    expect(rpKeyTarget('PageDown', false, 10)).toBe(6.31);
  });

  test('Home and End jump to the ends; other keys do nothing', () => {
    expect(rpKeyTarget('Home', false, 10)).toBe(1);
    expect(rpKeyTarget('End', false, 10)).toBe(100);
    expect(rpKeyTarget('a', false, 10)).toBeUndefined();
  });

  test('never leaves the range', () => {
    expect(rpKeyTarget('ArrowLeft', true, 1)).toBe(1);
    expect(rpKeyTarget('PageUp', false, 99)).toBe(100);
  });
});

describe('planetView', () => {
  test('periapsis is drawn further out as r_p grows, on the log bar', () => {
    const near = planetView(300, R_J, R_J);
    const far = planetView(300, 100 * R_J, R_J);

    expect(far.periapsisPx).toBeGreaterThan(near.periapsisPx);
    expect(near.periapsisPx).toBeCloseTo(near.scale * R_J, 9);
  });

  test('at 1 R the planet is to scale and touches periapsis', () => {
    const view = planetView(300, R_J, R_J);

    expect(view.planetPx).toBeCloseTo(view.periapsisPx, 9);
    expect(view.isPlanetEnlarged).toBe(false);
  });

  test('far away the planet would vanish: drawn at a minimum size and flagged', () => {
    const view = planetView(300, 100 * R_J, R_J);

    expect(view.isPlanetEnlarged).toBe(true);
    expect(view.planetPx).toBeGreaterThan(view.scale * R_J);
  });

  test('the track reaches beyond periapsis and leaves room for the v∞ arrows', () => {
    const view = planetView(300, 100 * R_J, R_J);

    expect(view.reachKm).toBeGreaterThan(100 * R_J);
    expect(view.reachKm * view.scale).toBeLessThan(150);
  });

  test('rpFromDistance inverts the drawing; inside the planet it asks for less than 1 R', () => {
    const view = planetView(300, 10.09 * R_J, R_J);

    expect(rpFromDistance(view.periapsisPx, 150)).toBeCloseTo(10.09, 2);
    expect(rpFromDistance(0, 150)).toBeLessThan(1);
  });
});

describe('scaleBar', () => {
  test('picks the longest 1-2-5 length in planet radii that fits', () => {
    const bar = scaleBar(1 / 1000, R_J, 80);

    expect(bar.radii).toBe(1);
    expect(bar.px).toBeCloseTo(71.492, 6);
  });

  test('falls back to the smallest step when even that is too long', () => {
    expect(scaleBar(1, R_J, 80).radii).toBe(0.5);
  });
});

describe('triangleLayout', () => {
  test('V_p runs along +x and every tip stays inside the panel', () => {
    const layout = triangleLayout(320, 260, 12.75, [7.71, 5.69], [19.01, 4.32]);

    expect(layout.planetTip.y).toBeCloseTo(layout.origin.y, 9);
    expect(layout.planetTip.x).toBeGreaterThan(layout.origin.x);
    for (const p of [layout.origin, layout.planetTip, layout.inTip, layout.outTip]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(320);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(260);
    }
  });

  test('y points up: a velocity with positive y is drawn above V_p', () => {
    const layout = triangleLayout(320, 260, 12.75, [10, 5], [18, -4]);

    expect(layout.inTip.y).toBeLessThan(layout.origin.y);
  });
});

describe('arcPath', () => {
  test('a counter-clockwise turn draws with sweep 0 (SVG y points down)', () => {
    expect(arcPath({ x: 0, y: 0 }, 10, 0, Math.PI / 2)).toBe('M10 0 A10 10 0 0 0 0 -10');
  });

  test('a clockwise turn draws with sweep 1', () => {
    expect(arcPath({ x: 0, y: 0 }, 10, 0, -Math.PI / 2)).toBe('M10 0 A10 10 0 0 1 0 10');
  });
});

describe('centreOn', () => {
  test('puts the middle of the drawn content in the middle of the panel', () => {
    const centre = centreOn(
      [
        { x: -100, y: -20 },
        { x: 20, y: 60 },
      ],
      300,
      300,
    );

    expect(centre).toEqual({ x: 190, y: 130 });
  });

  test('with nothing to draw, the planet sits in the middle', () => {
    expect(centreOn([], 300, 200)).toEqual({ x: 150, y: 100 });
  });
});

describe('tipLabel', () => {
  test('leans outward along the arrow: right of a tip that points right', () => {
    const label = tipLabel({ x: 100, y: 100 }, { x: 1, y: 0 }, 'v antes', 400);

    expect(label.anchor).toBe('start');
    expect(label.at.x).toBeGreaterThan(100);
  });

  test('never runs past the right edge: it turns to end at the border', () => {
    const label = tipLabel({ x: 290, y: 100 }, { x: 1, y: 0 }, 'v después', 300);

    expect(label.anchor).toBe('end');
    expect(label.at.x).toBeLessThanOrEqual(300);
  });

  test('never runs past the left edge either', () => {
    const label = tipLabel({ x: 10, y: 100 }, { x: -1, y: 0 }, 'v antes', 300);

    expect(label.anchor).toBe('start');
    expect(label.at.x).toBeGreaterThanOrEqual(0);
  });

  test('takes a wider gap when asked, e.g. to clear a knob', () => {
    const label = tipLabel({ x: 100, y: 100 }, { x: 1, y: 0 }, 'r_p', 400, 24);

    expect(label.at.x).toBe(124);
  });

  test('a vertical arrow gets a centred label, shifted to fit', () => {
    const label = tipLabel({ x: 5, y: 100 }, { x: 0, y: -1 }, 'v antes', 300);

    expect(label.anchor).toBe('middle');
    expect(label.at.x).toBeGreaterThan(5);
    expect(label.at.y).toBeLessThan(100);
  });
});
