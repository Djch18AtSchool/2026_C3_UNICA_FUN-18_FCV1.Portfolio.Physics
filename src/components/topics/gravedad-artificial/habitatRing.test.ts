import { describe, expect, test } from 'vitest';
import { scaleBarLength, SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX } from '../../lab/scaleBarMath';
import { IDENTITY_VIEW, type ZoomView } from '../../lab/zoomMath';
import {
  HUB_RADIUS,
  pxPerMetre,
  RING_BAND,
  SCALE_UNITS,
  screenRing,
  spinLayout,
  type RingBase,
} from './habitatRing';

const BASE: RingBase = { c: { x: 200, y: 200 }, ring: 120, unit: 30 };
const ZOOMED: ZoomView = { scale: 4, x: -300, y: -500 };

describe('screenRing', () => {
  test('at the identity view is the ring as the scene frames it', () => {
    // Arrange / Act
    const ring = screenRing(BASE, IDENTITY_VIEW);

    // Assert
    expect(ring).toEqual({ ...BASE, band: RING_BAND, hub: HUB_RADIUS, scale: 1 });
  });

  test('maps the centre through the view and multiplies every length by the zoom', () => {
    const ring = screenRing(BASE, ZOOMED);

    expect(ring.c).toEqual({ x: 200 * 4 - 300, y: 200 * 4 - 500 });
    expect(ring.ring).toBe(480);
    expect(ring.unit).toBe(120);
    expect(ring.band).toBe(RING_BAND * 4);
    expect(ring.hub).toBe(HUB_RADIUS * 4);
    expect(ring.scale).toBe(4);
  });

  test('does not touch its arguments', () => {
    const base = structuredClone(BASE);
    const view = { ...ZOOMED };

    screenRing(base, view);

    expect(base).toEqual(BASE);
    expect(view).toEqual(ZOOMED);
  });
});

describe('pxPerMetre', () => {
  test('is the drawn radius over the real one, times the zoom', () => {
    expect(pxPerMetre(150, 300, 1)).toBe(0.5);
    expect(pxPerMetre(150, 300, 4)).toBe(2);
  });

  test('puts a 5 m ring and a 4 000 m ring on bars of a round length that fit', () => {
    for (const [ring, radius] of [
      [75, 5],
      [150, 4000],
    ] as const) {
      for (const zoom of [1, 2, 8]) {
        const bar = scaleBarLength(pxPerMetre(ring, radius, zoom), SCALE_UNITS);
        expect(bar).toBeDefined();
        expect(bar?.px).toBeGreaterThanOrEqual(SCALE_BAR_MIN_PX);
        expect(bar?.px).toBeLessThanOrEqual(SCALE_BAR_MAX_PX);
      }
    }
  });

  test('a bar of the radius drawn at a zoom reads as many metres as the radius it measures', () => {
    // The floor radius is 240 px on screen at ×2 for r = 480 m: 0,5 px/m, so 100 m is 50 px —
    // under the minimum — and the bar picks 200 m (100 px).
    const bar = scaleBarLength(pxPerMetre(120, 480, 2), SCALE_UNITS);

    expect(bar?.px).toBeCloseTo(100, 6);
    expect(bar?.text.replace(/\s/g, ' ')).toBe('200 m');
  });
});

describe('spinLayout', () => {
  test('at the identity view puts the person on the floor under the hub, vectors at its sides', () => {
    const layout = spinLayout(screenRing(BASE, IDENTITY_VIEW), 1);

    expect(layout.floorY).toBe(320);
    expect(layout.person).toBe(34);
    expect(layout.ac.from).toEqual({ x: 209, y: 318 });
    expect(layout.gap.from).toEqual({ x: 191, y: 320 - 17 });
    expect(layout.length).toBe(30);
    expect(layout.isClipped).toBe(false);
  });

  test('a vector longer than 1,5 g is drawn at 1,5 g and marked as clipped', () => {
    const layout = spinLayout(screenRing(BASE, IDENTITY_VIEW), 3);

    expect(layout.length).toBe(45);
    expect(layout.isClipped).toBe(true);
  });

  test('the person and the vectors grow with the zoom, the label gaps do not', () => {
    const at1 = spinLayout(screenRing(BASE, IDENTITY_VIEW), 1);
    const at4 = spinLayout(screenRing(BASE, ZOOMED), 1);

    expect(at4.person).toBe(at1.person * 4);
    expect(at4.length).toBe(at1.length * 4);
    // The a_c label sits a fixed 16 px to the side of the vector, whatever the zoom.
    expect(at4.labels.ac.x - at4.ac.from.x).toBe(at1.labels.ac.x - at1.ac.from.x);
  });

  test('on a small ring the person is a share of the radius, clear of the hub', () => {
    const small = screenRing({ c: { x: 100, y: 100 }, ring: 40, unit: 10 }, IDENTITY_VIEW);

    expect(spinLayout(small, 1).person).toBeCloseTo(14, 6);
  });

  test('the vectors sit a fixed 9 px (times the zoom) to each side of the hub', () => {
    const at4 = spinLayout(screenRing(BASE, ZOOMED), 1);

    expect(at4.ac.from.x - screenRing(BASE, ZOOMED).c.x).toBe(9 * 4);
    expect(screenRing(BASE, ZOOMED).c.x - at4.gap.from.x).toBe(9 * 4);
  });

  test('the g_ap label clears the floor by the band, which grows with the zoom, when the vector is short', () => {
    const ring = screenRing(BASE, ZOOMED);

    const { labels, floorY } = spinLayout(ring, 0.01);

    // 13 px of gap under the band's outer edge.
    expect(labels.gap.y).toBeCloseTo(floorY + RING_BAND * 4 + 13, 6);
  });

  test('1 g is `unit` px long at ×1 and the label of g_ap sits below the vector tip when it is long', () => {
    const { length, labels, gap } = spinLayout(screenRing(BASE, IDENTITY_VIEW), 1);

    expect(length).toBe(BASE.unit);
    expect(labels.gap.y).toBeCloseTo(Math.max(gap.toY, 320 + RING_BAND) + 13, 6);
  });
});
