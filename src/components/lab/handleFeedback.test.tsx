// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { FOCUS_RING_RADIUS, Knob } from './OverlayMarks';
import SvgPlotCursor from './SvgPlotCursor';
import { linearScale } from './plotScales';
import { useDrag } from './useDrag';

/** Identity CTM on the given svg: client pixels are viewBox units. */
function mockIdentityCtm(svg: SVGSVGElement): void {
  Object.defineProperty(svg, 'getScreenCTM', {
    configurable: true,
    value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
  });
}

function DragKnob() {
  const drag = useDrag(() => {});
  return (
    <svg>
      <g data-testid="handle" role="slider" tabIndex={0} className="group" {...drag}>
        <Knob at={{ x: 40, y: 40 }} fill="var(--fg)" />
      </g>
    </svg>
  );
}

function renderKnob() {
  const { container } = render(<DragKnob />);
  mockIdentityCtm(container.querySelector('svg') as SVGSVGElement);
  return container.querySelector('[data-testid="handle"]') as Element;
}

describe('a handle while it is dragged (useDrag)', () => {
  afterEach(cleanup);

  test('is marked data-dragging from the press to the release, and only then', () => {
    const handle = renderKnob();
    expect(handle).not.toHaveAttribute('data-dragging');

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 40, clientY: 40 });
    expect(handle).toHaveAttribute('data-dragging');
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 50, clientY: 40 });
    expect(handle).toHaveAttribute('data-dragging');

    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 50, clientY: 40 });
    expect(handle).not.toHaveAttribute('data-dragging');
  });

  test('a cancelled press or a lost capture leaves no mark behind', () => {
    const handle = renderKnob();

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 40, clientY: 40 });
    fireEvent.pointerCancel(handle, { pointerId: 1 });
    expect(handle).not.toHaveAttribute('data-dragging');

    fireEvent.pointerDown(handle, { pointerId: 2, clientX: 40, clientY: 40 });
    fireEvent(handle, new Event('lostpointercapture', { bubbles: true }));
    expect(handle).not.toHaveAttribute('data-dragging');
  });

  test('a right click is not a drag and does not mark it', () => {
    const handle = renderKnob();

    fireEvent.pointerDown(handle, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 2,
      clientX: 40,
      clientY: 40,
    });

    expect(handle).not.toHaveAttribute('data-dragging');
  });
});

describe('Knob', () => {
  afterEach(cleanup);

  test('its focus ring sits on a casing of the surface, both shown only on a visible focus', () => {
    const { container } = render(
      <svg>
        <Knob at={{ x: 0, y: 0 }} fill="var(--fg)" />
      </svg>,
    );
    const casing = container.querySelector('[data-knob-ring-casing]');
    const ring = container.querySelector('[data-knob-ring]');

    expect(ring).toHaveAttribute('r', String(FOCUS_RING_RADIUS));
    expect(ring).toHaveAttribute('stroke', 'var(--accent)');
    expect(casing).toHaveAttribute('r', String(FOCUS_RING_RADIUS));
    expect(casing).toHaveAttribute('stroke', 'var(--bg-elevated)');
    // Wider than the ring by a pixel on each side: the accent always meets the surface.
    expect(Number(casing?.getAttribute('stroke-width'))).toBe(
      Number(ring?.getAttribute('stroke-width')) + 2,
    );
    for (const mark of [casing, ring]) {
      expect(mark?.getAttribute('class')).toContain('group-focus-visible:opacity-100');
    }
    // The casing is painted under the ring.
    expect(casing?.compareDocumentPosition(ring as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});

describe('the plot cursor while it is dragged (SvgPlotCursor)', () => {
  afterEach(cleanup);

  test('is marked data-dragging from the press to the release, and wears the same ring', () => {
    const x = linearScale({ min: 0, max: 10 }, [0, 100]);
    const { container } = render(
      <svg>
        <SvgPlotCursor
          cursor={{ x: 5, onChange: () => {} }}
          x={x}
          area={{ left: 0, top: 10, right: 100, bottom: 90 }}
          xLabel="t"
          xUnit="s"
          decimals={2}
          fontSize={12}
        />
      </svg>,
    );
    mockIdentityCtm(container.querySelector('svg') as SVGSVGElement);
    const handle = container.querySelector('[role="slider"]') as Element;
    expect(container.querySelector('[data-knob-ring-casing]')).not.toBeNull();

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 50, clientY: 10 });
    expect(handle).toHaveAttribute('data-dragging');

    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 60, clientY: 10 });
    expect(handle).not.toHaveAttribute('data-dragging');
  });
});
