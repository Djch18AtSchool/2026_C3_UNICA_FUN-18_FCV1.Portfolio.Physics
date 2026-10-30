import { describe, expect, test } from 'vitest';
import { arrow, dipoleFieldLine, mathRuns, onEllipse, spinArc } from './diagramGeometry';

const numbers = (text: string) => (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

describe('arrow', () => {
  test('stops the shaft at the base of the head, whose tip is the end point', () => {
    const vector = arrow({ x: 0, y: 100 }, { x: 0, y: 20 }, 10);

    expect(vector).toMatchObject({ x1: 0, y1: 100, x2: 0, y2: 30 });
    expect(numbers(vector.head).slice(0, 2)).toEqual([0, 20]);
  });

  test('refuses a vector of zero length', () => {
    expect(() => arrow({ x: 1, y: 1 }, { x: 1, y: 1 })).toThrow(RangeError);
  });
});

describe('spinArc', () => {
  const ellipse = { cx: 100, cy: 100, rx: 60, ry: 20 };

  test('a growing parameter on the near side runs right to left: clockwise on screen', () => {
    const arc = spinArc(ellipse, 20, 160);
    const [tipX] = numbers(arc.head);

    expect(arc.sense).toBe('horario');
    expect(arc.d).toContain(' 0 0 1 ');
    expect(tipX).toBeLessThan(onEllipse(ellipse, 160).x);
  });

  test('a falling parameter on the near side runs left to right: counterclockwise on screen', () => {
    const arc = spinArc(ellipse, 165, 15);
    const [tipX] = numbers(arc.head);

    expect(arc.sense).toBe('antihorario');
    expect(tipX).toBeGreaterThan(onEllipse(ellipse, 15).x);
  });

  test('uses the large-arc flag past half a turn and refuses an empty arc', () => {
    expect(spinArc(ellipse, -160, 70).d).toContain(' 0 1 1 ');
    expect(() => spinArc(ellipse, 30, 30)).toThrow(RangeError);
  });
});

describe('dipoleFieldLine', () => {
  test('leaves the surface in the south, crosses the equator at r = L and lands in the north', () => {
    const centre = { x: 0, y: 0 };
    const values = numbers(dipoleFieldLine(centre, 300, 100));
    const points = [];
    for (let i = 0; i < values.length; i += 2) points.push({ x: values[i], y: values[i + 1] });

    expect(Math.hypot(points[0].x, points[0].y)).toBeCloseTo(100, 0);
    expect(points[0].y).toBeGreaterThan(0);
    expect(Math.max(...points.map((point) => point.x))).toBeCloseTo(300, 0);
    expect(points.at(-1)?.y).toBeLessThan(0);
  });

  test('refuses a line that does not reach past the surface', () => {
    expect(() => dipoleFieldLine({ x: 0, y: 0 }, 50, 100)).toThrow(RangeError);
  });
});

describe('mathRuns', () => {
  test('sets symbols italic, lowers their subscripts and raises the next run back', () => {
    expect(mathRuns([{ symbol: 'L', sub: 'w' }, ' = ', { symbol: 'Δ', upright: true }])).toEqual([
      { text: 'L', className: 'wd-math', dy: undefined },
      { text: 'w', className: 'wd-math wd-sub', dy: 5 },
      { text: ' = ', className: '', dy: -5 },
      { text: 'Δ', className: '', dy: undefined },
    ]);
  });
});
