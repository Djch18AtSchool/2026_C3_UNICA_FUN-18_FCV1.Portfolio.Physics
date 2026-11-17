import { describe, expect, test } from 'vitest';
import { mathTextWidth } from '../../../lib/mathNotation';
import type { Segment } from '../../lab/labelClearance';
import { labelSize, placeLabels } from './flybyLabels';

const PANEL = { width: 200, height: 100 };
const WALL: Segment = [
  { x: 100, y: 0 },
  { x: 100, y: 100 },
];

describe('labelSize', () => {
  test('pads the 13 px Plex Sans text by 2 px on every side', () => {
    expect(labelSize('v antes')).toEqual({ width: mathTextWidth('v antes', 13) + 4, height: 17 });
  });

  test('measures a label in the notation as drawn: scripts at 75 %, symbols their face’s size', () => {
    // «∞,in» as a subscript is three quarters of the same text on the line.
    const line = mathTextWidth('v∞,in', 13);
    const sub = mathTextWidth('v', 13) + 0.75 * mathTextWidth('∞,in', 13);
    expect(labelSize('vec v_∞,in').width).toBeCloseTo(sub + 4);
    expect(sub).toBeLessThan(line);
  });
});

describe('placeLabels', () => {
  test('takes the first spot clear of the lines, the texts and the panel edges', () => {
    const readout = { left: 120, right: 200, top: 0, bottom: 20 };
    const [label] = placeLabels(
      [
        {
          text: 'v∞,out',
          spots: () => [
            { x: 100, y: 50 }, // on the wall
            { x: 195, y: 50 }, // past the right edge
            { x: 150, y: 10 }, // on the readout
            { x: 150, y: 50 },
          ],
        },
      ],
      [WALL],
      [readout],
      PANEL,
    );

    expect(label.at).toEqual({ x: 150, y: 50 });
    expect(label.text).toBe('v∞,out');
  });

  test('a placed label blocks the next one', () => {
    const spots = () => [
      { x: 50, y: 50 },
      { x: 50, y: 80 },
    ];
    const [first, second] = placeLabels(
      [
        { text: 'v antes', spots },
        { text: 'v después', spots },
      ],
      [],
      [],
      PANEL,
    );

    expect(first.at).toEqual({ x: 50, y: 50 });
    expect(second.at).toEqual({ x: 50, y: 80 });
  });

  test('when no spot is clear it keeps the first one rather than none', () => {
    const [label] = placeLabels(
      [{ text: 'δ', spots: () => [{ x: 100, y: 50 }] }],
      [WALL],
      [],
      PANEL,
    );

    expect(label.at).toEqual({ x: 100, y: 50 });
  });
});
