// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { knobBox, useKnobReveal, type KnobReveal } from './useKnobReveal';
import { useRefit } from './useRefit';

const RADIUS_PX = 41;

let latest: KnobReveal;

interface KnobProps {
  at: { x: number; y: number };
  scale?: number;
  reveal(box: unknown): void;
  isPressing?: boolean;
  onCanvasFocus?(): void;
}

function Knob({ at, scale = 2, reveal, isPressing = false, onCanvasFocus }: KnobProps) {
  const zoom = { reveal, isPointerPressing: () => isPressing, view: { scale, x: 0, y: 0 } };
  latest = useKnobReveal({ zoom, at, radiusPx: RADIUS_PX });
  return (
    <div data-testid="canvas" onFocus={onCanvasFocus}>
      <svg>
        <g data-testid="knob" tabIndex={0} onFocus={latest.onFocus} />
      </svg>
    </div>
  );
}

afterEach(cleanup);

describe('knobBox', () => {
  test('is radiusPx of screen around the knob, in drawing units at the zoom', () => {
    expect(knobBox({ x: 300, y: 120 }, 40, 1)).toEqual({ x: 260, y: 80, width: 80, height: 80 });
    expect(knobBox({ x: 300, y: 120 }, 40, 4)).toEqual({ x: 290, y: 110, width: 20, height: 20 });
  });
});

describe('useKnobReveal', () => {
  test('a focus from the keyboard reveals the knob with its band, and the canvas does not see it', () => {
    const reveal = vi.fn();
    const onCanvasFocus = vi.fn();
    const { getByTestId } = render(
      <Knob at={{ x: 100, y: 50 }} reveal={reveal} onCanvasFocus={onCanvasFocus} />,
    );

    fireEvent.focus(getByTestId('knob'));

    expect(reveal).toHaveBeenCalledTimes(1);
    expect(reveal).toHaveBeenCalledWith(knobBox({ x: 100, y: 50 }, RADIUS_PX, 2));
    expect(onCanvasFocus).not.toHaveBeenCalled();
  });

  test('a focus a press gives reveals nothing, and the canvas does not see it either', () => {
    const reveal = vi.fn();
    const onCanvasFocus = vi.fn();
    const { getByTestId } = render(
      <Knob at={{ x: 100, y: 50 }} reveal={reveal} isPressing onCanvasFocus={onCanvasFocus} />,
    );

    fireEvent.focus(getByTestId('knob'));

    expect(reveal).not.toHaveBeenCalled();
    expect(onCanvasFocus).not.toHaveBeenCalled();
  });

  test('a key that moves the knob reveals it once it is drawn at its new place', () => {
    const reveal = vi.fn();
    const { rerender } = render(<Knob at={{ x: 100, y: 50 }} reveal={reveal} />);

    latest.revealAfterKey(true);
    rerender(<Knob at={{ x: 120, y: 50 }} reveal={reveal} />);

    expect(reveal).toHaveBeenCalledTimes(1);
    expect(reveal).toHaveBeenCalledWith(knobBox({ x: 120, y: 50 }, RADIUS_PX, 2));

    // A later move that no key asked for (a drag) does not reveal.
    rerender(<Knob at={{ x: 140, y: 50 }} reveal={reveal} />);
    expect(reveal).toHaveBeenCalledTimes(1);
  });

  test('a key that does not move the knob leaves no reveal pending for a later drag', () => {
    const reveal = vi.fn();
    const { rerender } = render(<Knob at={{ x: 100, y: 50 }} reveal={reveal} />);

    latest.revealAfterKey(false);
    rerender(<Knob at={{ x: 100, y: 50 }} reveal={reveal} />);
    rerender(<Knob at={{ x: 140, y: 50 }} reveal={reveal} />);

    expect(reveal).not.toHaveBeenCalled();
  });
});

describe('useRefit', () => {
  function Refit({ refit, fit }: { refit: number; fit(): void }) {
    useRefit({ fit }, refit);
    return null;
  }

  test('frames the drawing again on each change of the counter, not on the first value', () => {
    const fit = vi.fn();
    const { rerender } = render(<Refit refit={0} fit={fit} />);
    expect(fit).not.toHaveBeenCalled();

    rerender(<Refit refit={1} fit={fit} />);
    rerender(<Refit refit={1} fit={fit} />);
    expect(fit).toHaveBeenCalledTimes(1);

    rerender(<Refit refit={2} fit={fit} />);
    expect(fit).toHaveBeenCalledTimes(2);
  });
});
