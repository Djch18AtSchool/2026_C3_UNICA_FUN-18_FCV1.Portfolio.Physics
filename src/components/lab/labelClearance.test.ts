import { describe, expect, test } from 'vitest';
import {
  boxAround,
  boxesOverlap,
  boxReach,
  clearSpot,
  segmentHitsBox,
  segmentsOf,
  spotsAround,
  spotsBeside,
  textBox,
  type Segment,
} from './labelClearance';

const BOX = { left: 0, right: 10, top: 0, bottom: 10 };

describe('segmentHitsBox', () => {
  test('a segment crossing, inside, touching or missing the box', () => {
    const crossing: Segment = [
      { x: -5, y: 5 },
      { x: 15, y: 5 },
    ];
    const inside: Segment = [
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];
    const missing: Segment = [
      { x: 12, y: -5 },
      { x: 20, y: 20 },
    ];
    const diagonalPast: Segment = [
      { x: 11, y: -1 },
      { x: 21, y: 9 },
    ];
    const vertical: Segment = [
      { x: 10, y: -3 },
      { x: 10, y: 3 },
    ];

    expect(segmentHitsBox(crossing, BOX)).toBe(true);
    expect(segmentHitsBox(inside, BOX)).toBe(true);
    expect(segmentHitsBox(vertical, BOX)).toBe(true);
    expect(segmentHitsBox(missing, BOX)).toBe(false);
    expect(segmentHitsBox(diagonalPast, BOX)).toBe(false);
  });
});

describe('segmentsOf', () => {
  test('joins consecutive points and breaks at a non-finite one', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: Number.NaN, y: Number.NaN },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];

    expect(segmentsOf(points)).toEqual([
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      [
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
    ]);
  });
});

describe('clearSpot', () => {
  const wall: Segment = [
    { x: 50, y: 0 },
    { x: 50, y: 100 },
  ];
  const area = { left: 0, right: 100, top: 0, bottom: 100 };
  const size = { width: 20, height: 10 };

  test('skips a candidate on a line and one outside the plot, and takes the next clear one', () => {
    const candidates = [
      { x: 50, y: 50 },
      { x: 95, y: 50 },
      { x: 30, y: 50 },
    ];

    expect(clearSpot(candidates, size, [wall], area)).toEqual({ x: 30, y: 50 });
    expect(boxAround({ x: 30, y: 50 }, 20, 10)).toEqual({
      left: 20,
      right: 40,
      top: 45,
      bottom: 55,
    });
  });

  test('a box set on the area edge up to float round-off still counts as inside', () => {
    const edge = { x: 10 + 1e-12 - 1e-9, y: 50 };

    expect(clearSpot([edge], size, [], area)).toEqual(edge);
  });

  test('returns undefined when every candidate is blocked', () => {
    expect(clearSpot([{ x: 50, y: 50 }], size, [wall], area)).toBeUndefined();
  });

  test('also skips a candidate whose box overlaps a blocked box (a readout, a placed label)', () => {
    const readout = { left: 60, right: 100, top: 40, bottom: 60 };
    const candidates = [
      { x: 75, y: 50 },
      { x: 75, y: 80 },
    ];

    expect(clearSpot(candidates, size, [], area, [readout])).toEqual({ x: 75, y: 80 });
  });
});

describe('boxesOverlap', () => {
  test('overlapping boxes do, boxes that only meet or stay apart do not', () => {
    const a = { left: 0, right: 10, top: 0, bottom: 10 };

    expect(boxesOverlap(a, { left: 5, right: 15, top: 5, bottom: 15 })).toBe(true);
    expect(boxesOverlap(a, { left: 2, right: 3, top: 2, bottom: 3 })).toBe(true);
    expect(boxesOverlap(a, { left: 10, right: 20, top: 0, bottom: 10 })).toBe(false);
    expect(boxesOverlap(a, { left: 0, right: 10, top: 11, bottom: 20 })).toBe(false);
  });
});

describe('textBox', () => {
  test('a monospace text box from its anchor and baseline: start, middle and end', () => {
    // 4 characters at 10 px are 24 px wide; the box runs from 0,8 em above to 0,25 em below.
    expect(textBox({ x: 100, y: 50 }, 'abcd', 10, 'start')).toEqual({
      left: 100,
      right: 124,
      top: 42,
      bottom: 52.5,
    });
    expect(textBox({ x: 100, y: 50 }, 'abcd', 10, 'middle').left).toBe(88);
    expect(textBox({ x: 100, y: 50 }, 'abcd', 10, 'end').right).toBe(100);
  });
});

describe('label spots', () => {
  const size = { width: 40, height: 14 };

  test('boxReach is half the box along an axis and more along a diagonal', () => {
    expect(boxReach({ x: 1, y: 0 }, size)).toBe(20);
    expect(boxReach({ x: 0, y: -1 }, size)).toBe(7);
    expect(boxReach({ x: Math.SQRT1_2, y: Math.SQRT1_2 }, size)).toBeCloseTo(27 * Math.SQRT1_2);
  });

  test('spotsAround starts past the point along the direction, its box gap px clear of it', () => {
    const [first, ...rest] = spotsAround({ x: 100, y: 100 }, { x: 1, y: 0 }, size, 4);

    expect(first).toEqual({ x: 124, y: 100 });
    expect(boxAround(first, size.width, size.height).left).toBe(104);
    // Then turned either way, ending opposite: every box stays gap px clear of the point.
    expect(rest.length).toBeGreaterThanOrEqual(6);
    for (const spot of rest) {
      const box = boxAround(spot, size.width, size.height);
      const inside =
        box.left - 4 < 100 && box.right + 4 > 100 && box.top - 4 < 100 && box.bottom + 4 > 100;
      expect(inside).toBe(false);
    }
  });

  test('spotsBeside puts the box gap px to each side of a segment, first on its left', () => {
    const from = { x: 0, y: 100 };
    const to = { x: 100, y: 100 };
    const [left, right] = spotsBeside(from, to, size, 4);

    // Left of a segment pointing right (screen y down) is above it.
    expect(left).toEqual({ x: 50, y: 89 });
    expect(right).toEqual({ x: 50, y: 111 });
    for (const spot of [left, right]) {
      expect(segmentHitsBox([from, to], boxAround(spot, size.width, size.height))).toBe(false);
    }
  });
});

describe('textBox with the MathText notation', () => {
  test('measures V_p as drawn and reaches up to a vector arrow', () => {
    const plain = textBox({ x: 0, y: 20 }, 'Vp', 10, 'start');
    const scripted = textBox({ x: 0, y: 20 }, 'V_p', 10, 'start');
    const vector = textBox({ x: 0, y: 20 }, 'vec V_p', 10, 'start');

    expect(scripted.right).toBeLessThan(plain.right);
    expect(scripted.top).toBe(plain.top);
    expect(vector.top).toBeLessThan(scripted.top);
    expect(vector.right).toBeCloseTo(scripted.right);
  });
});
