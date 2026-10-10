import { describe, expect, test } from 'vitest';
import { labelPlacement } from './PlotPoints';

const RANGE: [number, number] = [50, 300];

describe('labelPlacement', () => {
  test('keeps the preferred side when the label fits there', () => {
    expect(labelPlacement(100, 60, 'start', RANGE)).toEqual({ anchor: 'start', dx: 10 });
    expect(labelPlacement(200, 60, 'end', RANGE)).toEqual({ anchor: 'end', dx: -10 });
  });

  test('flips a start label that would overrun the right edge', () => {
    expect(labelPlacement(270, 60, 'start', RANGE)).toEqual({ anchor: 'end', dx: -10 });
  });

  test('flips an end label that would overrun the left edge', () => {
    expect(labelPlacement(80, 60, 'end', RANGE)).toEqual({ anchor: 'start', dx: 10 });
  });

  test('centres a label that fits on neither side, kept inside the range', () => {
    expect(labelPlacement(150, 150, 'start', RANGE)).toEqual({ anchor: 'middle', dx: 0 });
    expect(labelPlacement(60, 240, 'start', RANGE)).toEqual({ anchor: 'middle', dx: 110 });
  });
});
