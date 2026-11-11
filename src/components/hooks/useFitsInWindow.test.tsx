// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useFitsInWindow } from './useFitsInWindow';

const WINDOW_HEIGHT = 800;
/** What the sticky offset resolves to in these tests (the probe's height). */
const OFFSET_PX = 64;

let observed: ResizeObserverCallback[] = [];

function stubLayout(height: number): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        observed = [...observed, callback];
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('innerHeight', WINDOW_HEIGHT);
  // The element measures `height`; the offset probe measures OFFSET_PX.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const isProbe = this.dataset.fitsProbe !== undefined;
    return { height: isProbe ? OFFSET_PX : height } as DOMRect;
  });
}

function Probe() {
  const [ref, fits] = useFitsInWindow<HTMLDivElement>('var(--topic-bar-clearance)');
  return (
    <div
      ref={ref}
      data-testid="box"
      data-fits={fits === undefined ? 'unknown' : fits ? 'yes' : 'no'}
    />
  );
}

describe('useFitsInWindow', () => {
  afterEach(() => {
    cleanup();
    observed = [];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('unknown on the first render (the server’s): nothing sticks before it measures', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(<Probe />);

    expect(screen.getByTestId('box')).toHaveAttribute('data-fits', 'unknown');
  });

  test('true when the element and the offset above it fit the window', () => {
    stubLayout(WINDOW_HEIGHT - OFFSET_PX);
    render(<Probe />);

    expect(screen.getByTestId('box')).toHaveAttribute('data-fits', 'yes');
  });

  test('false when it is taller, and it follows the element as it resizes', () => {
    stubLayout(WINDOW_HEIGHT - OFFSET_PX + 1);
    render(<Probe />);
    expect(screen.getByTestId('box')).toHaveAttribute('data-fits', 'no');

    stubLayout(300);
    act(() => observed.forEach((callback) => callback([], {} as ResizeObserver)));
    expect(screen.getByTestId('box')).toHaveAttribute('data-fits', 'yes');
  });

  test('follows the window as it resizes', () => {
    stubLayout(700);
    render(<Probe />);
    expect(screen.getByTestId('box')).toHaveAttribute('data-fits', 'yes');

    vi.stubGlobal('innerHeight', 600);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByTestId('box')).toHaveAttribute('data-fits', 'no');
  });
});
