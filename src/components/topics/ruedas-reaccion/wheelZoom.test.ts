import { describe, expect, test } from 'vitest';
import { SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX, scaleBarLength } from '../../lab/scaleBarMath';
import { IDENTITY_VIEW } from '../../lab/zoomMath';
import { CUBESAT_6U } from '../../../lib/data/reactionWheels';
import { BODY_FOOTPRINT, DIAL_MARGIN, TEXT_BAND, type SceneGeometry } from './wheelScene';
import {
  BODY_SCALE_UNITS,
  KNOB_REVEAL_RADIUS,
  knobRevealBox,
  pxPerCm,
  zoomGeometry,
} from './wheelZoom';

const CM_PER_M = 100;
const BASE: SceneGeometry = {
  c: { x: 200, y: 200 },
  dial: 166,
  scale: 688,
  wheel: 46.7,
  zoom: 1,
  extent: { width: 400, height: 400 },
};

describe('zoomGeometry', () => {
  test('the identity view leaves the drawing as the lab frames it', () => {
    expect(zoomGeometry(BASE, IDENTITY_VIEW)).toEqual(BASE);
  });

  test('the dial, the body scale and the wheel grow with the zoom about the view', () => {
    const view = { scale: 2, x: -100, y: -50 };

    const zoomed = zoomGeometry(BASE, view);

    expect(zoomed.c).toEqual({ x: 300, y: 350 });
    expect(zoomed.dial).toBe(332);
    expect(zoomed.scale).toBe(1376);
    expect(zoomed.wheel).toBeCloseTo(93.4, 10);
    expect(zoomed.zoom).toBe(2);
  });

  test('the canvas stays the size it was: the corner texts do not follow the zoom', () => {
    expect(zoomGeometry(BASE, { scale: 4, x: -300, y: -300 }).extent).toEqual(BASE.extent);
  });

  test('does not mutate its arguments', () => {
    const view = Object.freeze({ scale: 2, x: 0, y: 0 });
    const frozen = Object.freeze({ ...BASE, c: Object.freeze({ ...BASE.c }) });

    expect(() => zoomGeometry(frozen, view)).not.toThrow();
  });
});

/** The bar ScaleBar draws for the body: its ladder and the px per centimetre at this zoom. */
const bodyScaleBar = (pxPerMetre: number, zoomScale: number) =>
  scaleBarLength(pxPerCm(pxPerMetre, zoomScale), BODY_SCALE_UNITS);

describe('the body’s scale bar', () => {
  test('is written in centimetres and measures what the drawn body measures', () => {
    const bar = bodyScaleBar(BASE.scale, 1);

    expect(bar?.text).toMatch(/cm$/u);
    expect(bar?.px).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX);
    expect(bar?.px).toBeLessThanOrEqual(SCALE_BAR_MAX_PX);
    // px / (px per cm) = the centimetres it says.
    expect((bar?.px ?? 0) / (BASE.scale / CM_PER_M)).toBeCloseTo(bar?.value ?? 0, 9);
  });

  test('is 20 cm at the lab framing, a bit over half the 366 mm body', () => {
    const bar = bodyScaleBar(BASE.scale, 1);

    expect(bar?.value).toBe(20);
    expect(bar?.px).toBeCloseTo(0.2 * BASE.scale, 9);
    expect(0.2).toBeLessThan(BODY_FOOTPRINT.long);
    expect(BODY_FOOTPRINT.long).toBe(CUBESAT_6U.dimensions[2]);
  });

  test('is recomputed with the zoom: 2 cm at ×8, still 64 to 160 px', () => {
    const bar = bodyScaleBar(BASE.scale, 8);

    expect(bar?.value).toBe(2);
    expect(bar?.px).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX);
    expect(bar?.px).toBeLessThanOrEqual(SCALE_BAR_MAX_PX);
  });

  test('is a round length, 1, 2 or 5 times a power of ten, at every zoom step', () => {
    for (let step = 0; step <= 6; step += 1) {
      const bar = bodyScaleBar(BASE.scale, Math.SQRT2 ** step);
      const mantissa = (bar?.value ?? 0) / 10 ** Math.floor(Math.log10(bar?.value ?? 1));
      expect([1, 2, 5]).toContain(Math.round(mantissa * 1e9) / 1e9);
    }
  });

  test('says nothing when the scale is not a number (the scene is not measured)', () => {
    expect(bodyScaleBar(Number.NaN, 1)).toBeUndefined();
  });
});

describe('pxPerCm', () => {
  test('is the body’s px per metre over 100, times the zoom', () => {
    expect(pxPerCm(688, 1)).toBeCloseTo(6.88, 12);
    expect(pxPerCm(688, 8)).toBeCloseTo(55.04, 12);
  });
});

describe('the text band', () => {
  test('is the dial’s margin plus the knob’s ring, and a reveal keeps the knob that far from the texts', () => {
    expect(TEXT_BAND).toBe(DIAL_MARGIN + 11);
    expect(KNOB_REVEAL_RADIUS).toBe(TEXT_BAND);
  });
});

describe('knobRevealBox', () => {
  test('is centred on the knob, in drawing units, with the text band around it', () => {
    const box = knobRevealBox({ x: 300, y: 120 }, 1);

    expect(box).toEqual({
      x: 300 - KNOB_REVEAL_RADIUS,
      y: 120 - KNOB_REVEAL_RADIUS,
      width: 2 * KNOB_REVEAL_RADIUS,
      height: 2 * KNOB_REVEAL_RADIUS,
    });
  });

  test('is smaller in drawing units the more the view is zoomed (the band is in screen px)', () => {
    const box = knobRevealBox({ x: 300, y: 120 }, 4);

    expect(box.width).toBe((2 * KNOB_REVEAL_RADIUS) / 4);
  });
});
