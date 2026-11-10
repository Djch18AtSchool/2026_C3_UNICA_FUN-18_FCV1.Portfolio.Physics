import { describe, expect, test } from 'vitest';
import type { Segment } from '../../lab/labelClearance';
import { labelSize, placeLabels } from './flybyLabels';

const PANEL = { width: 200, height: 100 };
const WALL: Segment = [
  { x: 100, y: 0 },
  { x: 100, y: 100 },
];

describe('labelSize', () => {
  test('pads the 13 px monospace text by 2 px on every side', () => {
    // «v antes» is 7 characters of 0,6 × 13 px.
    expect(labelSize('v antes')).toEqual({ width: 7 * 0.6 * 13 + 4, height: 17 });
  });

  test('measures a label in the notation as drawn: scripts at 75 %, KaTeX glyphs their size', () => {
    // v (0,6 em) then «∞,in» as a subscript: ∞ in KaTeX_Main (1 em, × 0,516/0,442), «,in» mono.
    const subscript = 0.75 * ((1 * 0.516) / 0.442 + 3 * 0.6);
    expect(labelSize('vec v_∞,in').width).toBeCloseTo((0.6 + subscript) * 13 + 4);
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
