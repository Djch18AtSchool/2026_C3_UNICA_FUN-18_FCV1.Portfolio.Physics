// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PLANET_IDS, PLANETS } from '../../../lib/data/planets';
import { mathTextWidth } from '../../../lib/mathNotation';
import { ScaleBarSvg } from '../../lab/ScaleBar';
import { requireScaleUnits, SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX } from '../../lab/scaleBarMath';
import { inlineMathToNotation } from '../../lab/timeScaleFormat';
import { MIN_PLANET_PX, planetView } from './flybyScene';
import {
  barMaxBesideNote,
  frameScaleBar,
  isOnPanel,
  planetOnScreen,
  planetScaleUnits,
  scaleBarObstacles,
} from './planetZoom';

const R_J = PLANETS.jupiter.radiusKm;
const ZOOMS = [1, Math.SQRT2, 2, 4, 8];
const RP_RADII = [1, 1.18, 10.09, 100];
const SIDE = 320;
const CORNER = 12;
const BASELINE = 308;
/** About 4,4 px per radius: Jupiter at its Voyager 2 r_p, drawn at 380 px. */
const PX_PER_KM = 4.4 / R_J;

describe('planetScaleUnits', () => {
  test('is a km → planet radius ladder that the scale bar accepts, for every planet', () => {
    for (const id of PLANET_IDS) {
      const { radiusKm, name } = PLANETS[id];
      const units = planetScaleUnits(`R_${name.charAt(0)}`, radiusKm);

      expect(() => requireScaleUnits(units)).not.toThrow();
      expect(units.map((unit) => unit.size)).toEqual([1, radiusKm]);
      expect(units[1].label).toBe(`$R_${name.charAt(0)}$`);
    }
  });
});

describe('frameScaleBar', () => {
  test.each(PLANET_IDS)(
    '%s: the bar is the true length of its value on the drawing, at every zoom and r_p',
    (id) => {
      const { radiusKm, name } = PLANETS[id];
      const unit = `R_${name.charAt(0)}`;
      for (const radii of RP_RADII) {
        const { scale } = planetView(SIDE, radii * radiusKm, radiusKm);
        for (const zoom of ZOOMS) {
          const bar = frameScaleBar(scale * zoom, unit, radiusKm);

          expect(bar, `${radii} ${unit} ×${zoom}`).toBeDefined();
          if (!bar) continue;
          const isRadii = bar.text.includes('R_');
          const kmPerBar = isRadii ? bar.value * radiusKm : bar.value;
          // The bar's px are its km at the drawing's px per km (the zoom included).
          expect(bar.px).toBeCloseTo(kmPerBar * scale * zoom, 6);
          expect(bar.px).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX);
          expect(bar.px).toBeLessThanOrEqual(SCALE_BAR_MAX_PX + 1e-6);
          // A round 1 · 2 · 5 count of what it is written in.
          expect(String(bar.value).replace(/0+$/u, '')).toMatch(/^[125]$/u);
        }
      }
    },
  );

  test('writes radii while a radius fits and kilometres once the zoom is past it', () => {
    const { scale } = planetView(SIDE, 10.09 * R_J, R_J);

    expect(frameScaleBar(scale, 'R_J', R_J)?.text).toMatch(/R_J/u);
    expect(frameScaleBar(scale * 8, 'R_J', R_J)?.text).toMatch(/R_J/u);
    const tight = planetView(SIDE, 1 * R_J, R_J).scale;
    expect(frameScaleBar(tight * 8, 'R_J', R_J)?.text).toMatch(/^1\s\$R_J\$$/u);
    // A scale where one radius is longer than the bar's maximum falls back to kilometres.
    expect(frameScaleBar((SCALE_BAR_MAX_PX * 1.01) / R_J, 'R_J', R_J)?.text).toMatch(/km$/u);
  });

  test('has no bar for a scale that is not a positive number', () => {
    expect(frameScaleBar(0, 'R_J', R_J)).toBeUndefined();
    expect(frameScaleBar(Number.NaN, 'R_J', R_J)).toBeUndefined();
  });
});

describe('planetOnScreen', () => {
  test('is the true radius when it is large enough to see, and flagged as such', () => {
    expect(planetOnScreen(20, 1)).toEqual({ radiusPx: 20, isEnlarged: false });
    expect(planetOnScreen(20, 2)).toEqual({ radiusPx: 40, isEnlarged: false });
  });

  test('is enlarged to the minimum only while the true size would vanish, and says so', () => {
    expect(planetOnScreen(1, 1)).toEqual({ radiusPx: MIN_PLANET_PX, isEnlarged: true });
    expect(planetOnScreen(1, 2)).toEqual({ radiusPx: MIN_PLANET_PX, isEnlarged: true });
  });

  test('stops being enlarged once the zoom reaches the true size (Jupiter at 100 R_J, ×8)', () => {
    const { scale } = planetView(SIDE, 100 * R_J, R_J);
    const truePx = R_J * scale;

    expect(planetOnScreen(truePx, 1).isEnlarged).toBe(true);
    expect(planetOnScreen(truePx, 8)).toEqual({ radiusPx: truePx * 8, isEnlarged: false });
  });

  test('takes the true size at exactly the minimum as not enlarged', () => {
    expect(planetOnScreen(MIN_PLANET_PX, 1)).toEqual({
      radiusPx: MIN_PLANET_PX,
      isEnlarged: false,
    });
  });
});

describe('isOnPanel', () => {
  const panel = { width: 300, height: 320 };

  test('is true inside the panel and on its edge, false outside', () => {
    expect(isOnPanel({ x: 150, y: 160 }, panel)).toBe(true);
    expect(isOnPanel({ x: 0, y: 320 }, panel)).toBe(true);
    expect(isOnPanel({ x: -1, y: 160 }, panel)).toBe(false);
    expect(isOnPanel({ x: 150, y: 321 }, panel)).toBe(false);
  });

  test('can keep a margin from the edge', () => {
    expect(isOnPanel({ x: 4, y: 160 }, panel, 8)).toBe(false);
    expect(isOnPanel({ x: 12, y: 160 }, panel, 8)).toBe(true);
  });
});

describe('scaleBarObstacles', () => {
  const at = { x: CORNER, y: BASELINE };

  test('covers the bar and its text as the shared ScaleBarSvg draws them', () => {
    const bar = frameScaleBar(PX_PER_KM, 'R_J', R_J);
    if (!bar) throw new Error('no bar');
    const { container } = render(
      <svg>
        <ScaleBarSvg pxPerUnit={PX_PER_KM} units={planetScaleUnits('R_J', R_J)} x={at.x} y={at.y} />
      </svg>,
    );
    const path = container.querySelector('path')?.getAttribute('d') ?? '';
    const [, left, top, right] = /^M([\d.]+) ([\d.]+)V[\d.]+H([\d.]+)V/u.exec(path) ?? [];
    const text = container.querySelector('text');
    const baseline = Number(text?.getAttribute('y'));

    const [ticks, label] = scaleBarObstacles(bar, at);

    expect(ticks.left).toBeCloseTo(Number(left), 6);
    expect(ticks.right).toBeCloseTo(Number(right), 6);
    expect(ticks.top).toBeCloseTo(Number(top), 6);
    expect(ticks.bottom).toBeCloseTo(at.y, 6);
    expect(label.bottom).toBeGreaterThan(baseline);
    expect(label.bottom).toBeLessThanOrEqual(ticks.top);
    expect(label.left).toBeCloseTo(Number(left), 6);
    expect(label.right - label.left).toBeCloseTo(
      mathTextWidth(inlineMathToNotation(bar.text), 12, 'sans'),
      6,
    );
  });
});

describe('barMaxBesideNote (the bar never reaches «planeta agrandado»)', () => {
  test('stops 8 px before the note, within the shared 64–160 px; no note, no limit', () => {
    expect(barMaxBesideNote(8, 150)).toBe(134);
    expect(barMaxBesideNote(8, 400)).toBe(SCALE_BAR_MAX_PX);
    expect(barMaxBesideNote(8, 60)).toBe(SCALE_BAR_MIN_PX);
    expect(barMaxBesideNote(8, undefined)).toBeUndefined();
  });

  test('a bar measured with it ends before the note', () => {
    const maxPx = barMaxBesideNote(8, 170)!;
    for (const pxPerKm of [1e-4, 3e-4, 1e-3, 3e-3]) {
      const bar = frameScaleBar(pxPerKm, 'R_J', PLANETS.jupiter.radiusKm, maxPx);
      if (bar) expect(8 + bar.px).toBeLessThanOrEqual(170 - 8);
    }
  });
});
