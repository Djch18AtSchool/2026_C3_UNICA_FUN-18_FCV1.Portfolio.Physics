// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  DOT_CLEARANCE,
  labelPlacement,
  plateLabels,
  PlotPoints,
  type PlateBox,
} from './PlotPoints';
import { linearScale } from './plotScales';

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

describe('plateLabels: labels on a plate, clear of every dot and of each other', () => {
  /** Data equal to viewBox px (y down), a 400 × 300 plot area from (40, 20). */
  const SCALES = {
    x: linearScale({ min: 40, max: 440 }, [40, 440]),
    y: linearScale({ min: 20, max: 320 }, [20, 320]),
  };
  const intersects = (a: PlateBox, b: PlateBox) =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const coversDot = (box: PlateBox, { x, y }: { x: number; y: number }) => {
    const nx = Math.min(Math.max(x, box.left), box.right);
    const ny = Math.min(Math.max(y, box.top), box.bottom);
    return Math.hypot(x - nx, y - ny) < DOT_CLEARANCE;
  };

  test('a label with nothing in its way keeps its preferred place, up and to the right', () => {
    const [plate] = plateLabels([{ id: 'a', x: 100, y: 200, label: 'pedido' }], SCALES);

    expect(plate).toMatchObject({ anchor: 'start', dx: 10, dy: -10, text: 'pedido' });
  });

  // Tema 13's pump chart at 360 px: the operating point sat on the «i» of «pedido».
  test('a label that would cover another dot moves to a side where it covers none', () => {
    const points = [
      { id: 'pedido', x: 186, y: 181, label: 'pedido' },
      { id: 'operacion', x: 216, y: 163, label: '66 %' },
    ];

    const plates = plateLabels(points, SCALES);

    for (const plate of plates) for (const dot of points) expect(coversDot(plate!.box, dot)).toBe(false);
    expect(intersects(plates[0]!.box, plates[1]!.box)).toBe(false);
    expect(plates[1]).toMatchObject({ anchor: 'start', dy: -10 });
  });

  test('two labels that would overlap take different places', () => {
    const points = [
      { id: 'a', x: 200, y: 150, label: '×1,8', anchor: 'end' as const },
      { id: 'b', x: 200, y: 160, label: '×0,93', anchor: 'end' as const },
    ];

    const [a, b] = plateLabels(points, SCALES);

    expect(intersects(a!.box, b!.box)).toBe(false);
  });

  test('a plate stays inside the plot area: a label at the top edge goes below its dot', () => {
    const [plate] = plateLabels([{ id: 'top', x: 200, y: 24, label: 'pedido' }], SCALES);

    expect(plate!.dy).toBe(20);
    expect(plate!.box.top).toBeGreaterThanOrEqual(20);
  });

  test('a point without a label gets no plate', () => {
    expect(plateLabels([{ id: 'dot', x: 100, y: 100 }], SCALES)).toEqual([undefined]);
  });
});

describe('PlotPoints, plated', () => {
  test('draws a surface plate behind each label, inside the point’s group', () => {
    const scales = {
      x: linearScale({ min: 0, max: 400 }, [0, 400]),
      y: linearScale({ min: 0, max: 300 }, [0, 300]),
    };
    const { container } = render(
      <svg>
        <PlotPoints plated scales={scales} points={[{ id: 'p', x: 100, y: 100, label: 'pedido' }]} />
      </svg>,
    );

    const group = container.querySelector('[data-point="p"]');
    expect(group?.querySelector('rect[data-plate]')).not.toBeNull();
    expect(group?.querySelector('text')).toHaveTextContent('pedido');
  });
});
