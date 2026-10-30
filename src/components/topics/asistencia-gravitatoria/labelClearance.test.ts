import { describe, expect, test } from 'vitest';
import { boxAround, clearSpot, segmentHitsBox, segmentsOf, type Segment } from './labelClearance';

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

  test('returns undefined when every candidate is blocked', () => {
    expect(clearSpot([{ x: 50, y: 50 }], size, [wall], area)).toBeUndefined();
  });
});
