import { describe, expect, test } from 'vitest';
import { placeLabels, type LabelRequest, type PlacedLabel } from './labelLayout';

const GAP = 4;

/** Every pair of labels in one row stays GAP apart; no box covers another label's leader. */
function expectClean(placed: PlacedLabel[]): void {
  for (const label of placed) {
    expect(label.left, `${label.id} covers its own leader`).toBeLessThanOrEqual(label.x);
    expect(label.left + label.width, `${label.id} covers its own leader`).toBeGreaterThanOrEqual(
      label.x,
    );
    for (const other of placed) {
      if (other === label) continue;
      const isInside = other.x > label.left - GAP && other.x < label.left + label.width + GAP;
      expect(isInside, `${label.id} hides the leader of ${other.id}`).toBe(false);
      if (other.row !== label.row) continue;
      const isApart =
        other.left >= label.left + label.width + GAP ||
        label.left >= other.left + other.width + GAP;
      expect(isApart, `${label.id} and ${other.id} overlap`).toBe(true);
    }
  }
}

describe('placeLabels', () => {
  test('labels with room stay centred on their marker, all in the first row', () => {
    const requests: LabelRequest[] = [
      { id: 'a', x: 100, width: 60 },
      { id: 'b', x: 300, width: 60 },
    ];

    const placed = placeLabels(requests, { min: 0, max: 400 }, GAP);

    expect(placed.map(({ id, left, row }) => ({ id, left, row }))).toEqual([
      { id: 'a', left: 70, row: 0 },
      { id: 'b', left: 270, row: 0 },
    ]);
  });

  test('a crowded neighbour moves up a row, and a label at the edge slides inside the bounds', () => {
    const requests: LabelRequest[] = [
      { id: 'a', x: 100, width: 60 },
      { id: 'b', x: 140, width: 60 },
      { id: 'c', x: 395, width: 50 },
    ];

    const placed = placeLabels(requests, { min: 0, max: 400 }, GAP);

    expect(placed.map((label) => label.row)).toEqual([0, 1, 0]);
    expect(placed[2].left + placed[2].width).toBeLessThanOrEqual(400);
    expectClean(placed);
  });

  test('the four Voyager 2 encounters on a 260 px phone chart: two rows, nothing hidden', () => {
    const requests: LabelRequest[] = [
      { id: 'J', x: 73, width: 72 },
      { id: 'S', x: 108, width: 64.8 },
      { id: 'U', x: 181, width: 64.8 },
      { id: 'N', x: 240, width: 64.8 },
    ];

    const placed = placeLabels(requests, { min: 2, max: 258 }, GAP);

    expectClean(placed);
    expect(Math.max(...placed.map((label) => label.row))).toBe(1);
  });

  test('returns the labels in the order they were asked for', () => {
    const placed = placeLabels(
      [
        { id: 'late', x: 300, width: 40 },
        { id: 'early', x: 50, width: 40 },
      ],
      { min: 0, max: 400 },
      GAP,
    );

    expect(placed.map((label) => label.id)).toEqual(['late', 'early']);
  });
});
