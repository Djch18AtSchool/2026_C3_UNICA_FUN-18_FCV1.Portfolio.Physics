// @vitest-environment jsdom
import { cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useDrag, type DragPoint } from './useDrag';

/** Identity CTM on the given svg: client pixels are viewBox units. */
function mockIdentityCtm(svg: SVGSVGElement): void {
  Object.defineProperty(svg, 'getScreenCTM', {
    configurable: true,
    value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
  });
}

function Handle({ onDrag }: { onDrag: (point: DragPoint) => void }) {
  const drag = useDrag(onDrag);
  return (
    <svg>
      <circle data-testid="handle" cx={0} cy={0} r={5} {...drag} />
    </svg>
  );
}

/** Renders a handle inside an svg with an identity CTM already stubbed, unless `stubCtm` is false. */
function renderHandle(onDrag: (point: DragPoint) => void, { stubCtm = true } = {}) {
  const { container } = render(<Handle onDrag={onDrag} />);
  const svg = container.querySelector('svg') as SVGSVGElement;
  const handle = container.querySelector('[data-testid="handle"]') as unknown as SVGGraphicsElement;
  if (stubCtm) mockIdentityCtm(svg);
  return { svg, handle };
}

function FocusableHandle({ onDrag }: { onDrag: (point: DragPoint) => void }) {
  const drag = useDrag(onDrag);
  return (
    <svg>
      <circle data-testid="handle" tabIndex={0} cx={0} cy={0} r={5} {...drag} />
    </svg>
  );
}

/** Renders a tabindex-0 handle inside an svg with an identity CTM already stubbed. */
function renderFocusableHandle(onDrag: (point: DragPoint) => void) {
  const { container } = render(<FocusableHandle onDrag={onDrag} />);
  const svg = container.querySelector('svg') as SVGSVGElement;
  const handle = container.querySelector('[data-testid="handle"]') as unknown as SVGGraphicsElement;
  mockIdentityCtm(svg);
  return { svg, handle };
}

describe('useDrag', () => {
  afterEach(() => {
    cleanup();
  });

  test('reports start, move and end phases with the pointer coordinates', () => {
    // Arrange
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag);

    // Act
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 10, clientY: 20 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 30, clientY: 40 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 50, clientY: 60 });

    // Assert
    expect(onDrag).toHaveBeenNthCalledWith(1, { x: 10, y: 20, phase: 'start' });
    expect(onDrag).toHaveBeenNthCalledWith(2, { x: 30, y: 40, phase: 'move' });
    expect(onDrag).toHaveBeenNthCalledWith(3, { x: 50, y: 60, phase: 'end' });
  });

  test('calls setPointerCapture on pointer down when available', () => {
    // Arrange
    const { handle } = renderHandle(vi.fn());
    const capture = vi.fn();
    Object.defineProperty(handle, 'setPointerCapture', { configurable: true, value: capture });

    // Act
    fireEvent.pointerDown(handle, { pointerId: 7, clientX: 0, clientY: 0 });

    // Assert
    expect(capture).toHaveBeenCalledWith(7);
  });

  test('releases pointer capture on pointer up', () => {
    // Arrange
    const { handle } = renderHandle(vi.fn());
    const release = vi.fn();
    Object.defineProperty(handle, 'releasePointerCapture', { configurable: true, value: release });

    // Act
    fireEvent.pointerDown(handle, { pointerId: 3, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(handle, { pointerId: 3, clientX: 0, clientY: 0 });

    // Assert
    expect(release).toHaveBeenCalledWith(3);
  });

  test('exposes touchAction: none so the page does not scroll or select while dragging', () => {
    // Arrange & Act
    const { result } = renderHook(() => useDrag(vi.fn()));

    // Assert
    expect(result.current.style).toEqual({ touchAction: 'none' });
  });

  test('a touch on the handle never pans the page: touchstart is cancelled from mount', () => {
    // Arrange
    const { handle } = renderHandle(vi.fn());

    // Act: no pointerdown first; Chrome decides on panning at touchstart.
    const notCancelled = fireEvent.touchStart(handle, { touches: [{ clientX: 0, clientY: 0 }] });

    // Assert
    expect(notCancelled).toBe(false);
  });

  test('prevents the default pointer down action so the page does not scroll or select', () => {
    // Arrange
    const { handle } = renderHandle(vi.fn());

    // Act
    const notCancelled = fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });

    // Assert
    expect(notCancelled).toBe(false);
  });

  test('ignores a secondary mouse button', () => {
    // Arrange
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag);

    // Act
    fireEvent.pointerDown(handle, {
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      pointerType: 'mouse',
      button: 2,
    });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 10, clientY: 10 });

    // Assert
    expect(onDrag).not.toHaveBeenCalled();
  });

  test('accepts a touch pointer regardless of its button value', () => {
    // Arrange
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag);

    // Act
    fireEvent.pointerDown(handle, {
      pointerId: 1,
      clientX: 5,
      clientY: 5,
      pointerType: 'touch',
      button: -1,
    });

    // Assert
    expect(onDrag).toHaveBeenCalledWith({ x: 5, y: 5, phase: 'start' });
  });

  test('ignores a pointer move with no active drag', () => {
    // Arrange
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag);

    // Act
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 10, clientY: 10 });

    // Assert
    expect(onDrag).not.toHaveBeenCalled();
  });

  test('ignores a pointer up with no active drag', () => {
    // Arrange
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag);

    // Act
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 10, clientY: 10 });

    // Assert
    expect(onDrag).not.toHaveBeenCalled();
  });

  test('ends the drag on pointer cancel, so a later move is ignored', () => {
    // Arrange
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag);
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerCancel(handle, { pointerId: 1, clientX: 1, clientY: 1 });
    onDrag.mockClear();

    // Act
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 2, clientY: 2 });

    // Assert
    expect(onDrag).not.toHaveBeenCalled();
  });

  test('ends a cancelled drag at the last known point, not at the cancel coordinates', () => {
    // Arrange: some browsers report (0, 0) on pointercancel.
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag);
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 5, clientY: 6 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 40, clientY: 50 });
    onDrag.mockClear();

    // Act
    fireEvent.pointerCancel(handle, { pointerId: 1, clientX: 0, clientY: 0 });

    // Assert
    expect(onDrag).toHaveBeenCalledTimes(1);
    expect(onDrag).toHaveBeenCalledWith({ x: 40, y: 50, phase: 'end' });
  });

  test('does nothing on pointer down when the owner svg has no CTM', () => {
    // Arrange
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag, { stubCtm: false });

    // Act
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 10, clientY: 10 });

    // Assert
    expect(onDrag).not.toHaveBeenCalled();
  });

  test('returns stable handler identities across renders', () => {
    // Arrange
    const { result, rerender } = renderHook(({ onDrag }) => useDrag(onDrag), {
      initialProps: { onDrag: vi.fn() },
    });
    const first = result.current;

    // Act
    rerender({ onDrag: vi.fn() });

    // Assert
    expect(result.current.onPointerDown).toBe(first.onPointerDown);
    expect(result.current.onPointerMove).toBe(first.onPointerMove);
    expect(result.current.onPointerUp).toBe(first.onPointerUp);
    expect(result.current.onPointerCancel).toBe(first.onPointerCancel);
    expect(result.current.onLostPointerCapture).toBe(first.onLostPointerCapture);
  });

  test('focuses the handle on pointer down so pointer-then-keyboard interaction keeps working', () => {
    // Arrange
    const { handle } = renderFocusableHandle(vi.fn());

    // Act
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });

    // Assert
    expect(document.activeElement).toBe(handle);
  });

  test('focuses the handle without scrolling the page to it', () => {
    // Arrange
    const { handle } = renderFocusableHandle(vi.fn());
    const focus = vi.spyOn(handle, 'focus');

    // Act
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });

    // Assert
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  test('ends the drag on lost pointer capture, firing exactly one end with the last move point', () => {
    // Arrange
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag);
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 7, clientY: 9 });
    onDrag.mockClear();

    // Act
    fireEvent.lostPointerCapture(handle, { pointerId: 1 });

    // Assert
    expect(onDrag).toHaveBeenCalledTimes(1);
    expect(onDrag).toHaveBeenCalledWith({ x: 7, y: 9, phase: 'end' });
  });

  test('ignores lost pointer capture when no drag is active', () => {
    // Arrange
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag);

    // Act
    fireEvent.lostPointerCapture(handle, { pointerId: 1 });

    // Assert
    expect(onDrag).not.toHaveBeenCalled();
  });

  test('does not fire a second end when lost pointer capture follows a handled pointer up', () => {
    // Arrange
    const onDrag = vi.fn();
    const { handle } = renderHandle(onDrag);
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 3, clientY: 4 });
    onDrag.mockClear();

    // Act
    fireEvent.lostPointerCapture(handle, { pointerId: 1 });

    // Assert
    expect(onDrag).not.toHaveBeenCalled();
  });

  test('calls the latest onDrag callback even though the handler identity is stable', () => {
    // Arrange
    const firstOnDrag = vi.fn();
    const secondOnDrag = vi.fn();
    const { container, rerender } = render(<Handle onDrag={firstOnDrag} />);
    const svg = container.querySelector('svg') as SVGSVGElement;
    const handle = container.querySelector(
      '[data-testid="handle"]',
    ) as unknown as SVGGraphicsElement;
    mockIdentityCtm(svg);
    rerender(<Handle onDrag={secondOnDrag} />);

    // Act
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 0, clientY: 0 });

    // Assert
    expect(firstOnDrag).not.toHaveBeenCalled();
    expect(secondOnDrag).toHaveBeenCalledWith({ x: 0, y: 0, phase: 'start' });
  });
});
