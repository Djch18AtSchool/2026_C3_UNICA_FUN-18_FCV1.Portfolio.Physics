// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useOverflowsY } from './useOverflowsY';

type Observed = { callback: ResizeObserverCallback; targets: Element[] };

/** A ResizeObserver whose reports the test sends by hand; returns what each instance watches. */
function stubObserver(): Observed[] {
  const observers: Observed[] = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private readonly entry: Observed;
      constructor(callback: ResizeObserverCallback) {
        this.entry = { callback, targets: [] };
        observers.push(this.entry);
      }
      observe(target: Element) {
        this.entry.targets.push(target);
      }
      disconnect() {
        this.entry.targets = [];
      }
    },
  );
  return observers;
}

function Box() {
  const [ref, overflows] = useOverflowsY<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="box" data-overflows={overflows}>
      <p>uno</p>
      <p>dos</p>
    </div>
  );
}

/** Gives the box a content height and a visible height, then reports a resize. */
function report(observers: Observed[], scrollHeight: number, clientHeight: number) {
  const box = screen.getByTestId('box');
  Object.defineProperty(box, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(box, 'clientHeight', { configurable: true, value: clientHeight });
  act(() => observers[0].callback([], {} as ResizeObserver));
}

describe('useOverflowsY', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('false until measured, then whether the content is taller than the box', () => {
    const observers = stubObserver();
    render(<Box />);
    expect(screen.getByTestId('box')).toHaveAttribute('data-overflows', 'false');

    report(observers, 929, 715);
    expect(screen.getByTestId('box')).toHaveAttribute('data-overflows', 'true');

    report(observers, 700, 715);
    expect(screen.getByTestId('box')).toHaveAttribute('data-overflows', 'false');
  });

  test('watches the box and each child, so content that grows inside is noticed', () => {
    const observers = stubObserver();
    render(<Box />);

    expect(observers[0].targets.map((target) => target.textContent)).toEqual([
      'unodos',
      'uno',
      'dos',
    ]);
  });

  test('a one-pixel rounding difference is not an overflow', () => {
    const observers = stubObserver();
    render(<Box />);

    report(observers, 716, 715);
    expect(screen.getByTestId('box')).toHaveAttribute('data-overflows', 'false');
  });

  test('without ResizeObserver it stays false and does not throw', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    render(<Box />);

    expect(screen.getByTestId('box')).toHaveAttribute('data-overflows', 'false');
  });
});
