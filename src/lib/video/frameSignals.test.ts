import { describe, expect, test } from 'vitest';
import {
  edgeRow,
  edgeSeries,
  frameCount,
  movingAverage,
  tiltSeries,
  type Band,
  type GrayFrames,
} from './frameSignals';

const WIDTH = 40;
const HEIGHT = 60;

/**
 * Frames whose column x has a smooth bright-to-dark step centred at `centre(frame, x)` (a row
 * coordinate; rows are integers, so a centre of 20.5 lies between rows 20 and 21).
 */
function frames(
  count: number,
  centre: (frame: number, x: number) => number,
  levels: { sky: number; ground: number } = { sky: 200, ground: 40 },
): GrayFrames {
  const data = new Uint8Array(count * WIDTH * HEIGHT);
  const mid = (levels.sky + levels.ground) / 2;
  const half = (levels.sky - levels.ground) / 2;
  for (let f = 0; f < count; f += 1) {
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        const value = mid - half * Math.tanh((y - centre(f, x)) / 1.5);
        data[(f * HEIGHT + y) * WIDTH + x] = Math.round(value);
      }
    }
  }
  return { width: WIDTH, height: HEIGHT, data };
}

const LEFT: Band = { x0: 2, x1: 10, y0: 5, y1: 55 };
const RIGHT: Band = { x0: 30, x1: 38, y0: 5, y1: 55 };

describe('frameCount', () => {
  test('counts whole frames and rejects a stream that ends mid-frame', () => {
    expect(frameCount(frames(3, () => 20.5))).toBe(3);
    expect(() =>
      frameCount({ width: WIDTH, height: HEIGHT, data: new Uint8Array(WIDTH * HEIGHT + 1) }),
    ).toThrow(RangeError);
  });
});

describe('edgeRow', () => {
  test('finds a sky-to-deck step at its centre', () => {
    const video = frames(1, () => 20.5);

    expect(edgeRow(video, 0, LEFT)).toBe(20.5);
  });

  test('ignores a dark-to-bright step (it looks for sky above, deck below)', () => {
    const video = frames(1, () => 20.5, { sky: 40, ground: 200 });

    expect(edgeRow(video, 0, LEFT)).not.toBe(20.5);
  });

  test('a faint horizon is not lost to the bottom of the search window', () => {
    // The research prototype smoothed with zero padding ('same'), which adds a false step at the
    // bottom of the window that beats a faint horizon; here the smoothing has no padding.
    const video = frames(1, () => 30.5, { sky: 200, ground: 180 });

    expect(edgeRow(video, 0, { ...LEFT, y1: 50 })).toBe(30.5);
  });

  test('rejects a band outside the frame, too short to smooth, or a missing frame', () => {
    const video = frames(1, () => 20.5);

    expect(() => edgeRow(video, 0, { ...LEFT, x1: WIDTH + 1 })).toThrow(RangeError);
    expect(() => edgeRow(video, 0, { ...LEFT, y0: 10, y1: 13 })).toThrow(RangeError);
    expect(() => edgeRow(video, 0, { ...LEFT, x0: 10, x1: 10 })).toThrow(RangeError);
    expect(() => edgeRow(video, 1, LEFT)).toThrow(RangeError);
  });
});

describe('movingAverage', () => {
  test('averages each run of `width` samples and keeps only the full windows', () => {
    expect(movingAverage([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([2, 3, 4, 5, 6]);
    expect(movingAverage([4, 8], 1)).toEqual([4, 8]);
  });

  test('a centred window leaves a straight line where it was', () => {
    const line = Array.from({ length: 20 }, (_, i) => 3 + 0.5 * i);

    expect(movingAverage(line, 7)).toEqual(line.slice(3, -3));
  });

  test('rejects an even, non-positive or too long window', () => {
    expect(() => movingAverage([1, 2, 3, 4], 2)).toThrow(RangeError);
    expect(() => movingAverage([1, 2, 3, 4], 0)).toThrow(RangeError);
    expect(() => movingAverage([1, 2, 3], 5)).toThrow(RangeError);
  });
});

describe('series', () => {
  const moving = frames(4, (f, x) => 20.5 + f + (x < WIDTH / 2 ? 2 * f : 0));

  test('edgeSeries follows the step frame by frame', () => {
    expect(edgeSeries(moving, RIGHT)).toEqual([20.5, 21.5, 22.5, 23.5]);
  });

  test('tiltSeries is the left row minus the right row', () => {
    expect(tiltSeries(moving, LEFT, RIGHT)).toEqual([0, 2, 4, 6]);
  });
});
