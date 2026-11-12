// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { useJumpZoom, type JumpZoom } from './useJumpZoom';

/** The plot area the first measure reports, and what a margin fit does to it (12 px). */
const PLOT = { width: 320, height: 160 };
const MARGIN_FIT_PX = 12;
const REAL_RESIZE_PX = 80;
const BASE = { x: { min: -0.12, max: 3.0 }, y: { min: -0.06, max: 1.5 } };
const OTHER_BASE = { x: { min: -0.2, max: 5.0 }, y: { min: -0.1, max: 2.5 } };

let latest: JumpZoom;

function Harness({ base = BASE }: { base?: typeof BASE }) {
  const jumpZoom = useJumpZoom(base);
  latest = jumpZoom;
  return (
    <div {...jumpZoom.viewportProps} data-testid="viewport">
      <p id={jumpZoom.zoom.instructionsId}>instrucciones</p>
      <button type="button">asidero</button>
    </div>
  );
}

/** A ResizeObserver the test drives: every observed element is reported by `resize`. */
class FakeResizeObserver {
  static live: FakeResizeObserver[] = [];
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.live.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    FakeResizeObserver.live = FakeResizeObserver.live.filter((observer) => observer !== this);
  }
  report(size: { width: number; height: number }) {
    this.callback([{ contentRect: size } as ResizeObserverEntry], this as never);
  }
}

function resize(size: { width: number; height: number }): void {
  act(() => FakeResizeObserver.live.forEach((observer) => observer.report(size)));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  FakeResizeObserver.live = [];
  resetSettingsForTests();
});

const spanOf = (domain: { min: number; max: number }) => domain.max - domain.min;
const zoomInTwice = () => {
  act(() => latest.zoom.zoomIn());
  act(() => latest.zoom.zoomIn());
};

describe('useJumpZoom', () => {
  test('shows the base window while the plot is not measured, and without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(<Harness />);

    expect(latest.domains).toEqual(BASE);
  });

  test('zooms the window about its centre by the view scale once the plot is measured', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    render(<Harness />);
    resize(PLOT);

    zoomInTwice();

    expect(spanOf(latest.domains.x)).toBeCloseTo(spanOf(BASE.x) / 2, 6);
    expect(spanOf(latest.domains.y)).toBeCloseTo(spanOf(BASE.y) / 2, 6);
  });

  test('keeps the view when the base window changes, framing the same share of the new one', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    const { rerender } = render(<Harness />);
    resize(PLOT);
    zoomInTwice();

    rerender(<Harness base={OTHER_BASE} />);

    expect(latest.zoom.view.scale).toBeCloseTo(2, 6);
    expect(spanOf(latest.domains.x)).toBeCloseTo(spanOf(OTHER_BASE.x) / 2, 6);
  });

  test('keeps the plot size the window was computed from through a margin fit of a few px', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    render(<Harness />);
    resize(PLOT);
    zoomInTwice();
    const before = latest.domains;

    resize({ width: PLOT.width + MARGIN_FIT_PX, height: PLOT.height + MARGIN_FIT_PX });

    expect(latest.domains).toEqual(before);
  });

  test('follows the plot when the container really resizes', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    render(<Harness />);
    resize(PLOT);
    zoomInTwice();
    const before = latest.domains;

    resize({ width: PLOT.width + REAL_RESIZE_PX, height: PLOT.height + REAL_RESIZE_PX });

    expect(latest.domains).not.toEqual(before);
  });

  test('brings a knob into view from its place on the plot, 12 px around it and 16 from the edge', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    render(<Harness />);
    resize(PLOT);
    for (let step = 0; step < 6; step += 1) act(() => latest.zoom.zoomIn());
    const before = latest.domains;
    // Past the right edge of the plot, at its middle height.
    const outside = { x: PLOT.width + 40, y: PLOT.height / 2 };

    act(() => latest.revealPoint(outside));

    expect(latest.domains.x.max).toBeGreaterThan(before.x.max);
    expect(latest.domains.y).toEqual(before.y);
    expect(screen.getByTestId('viewport')).toBeInTheDocument();
  });

  describe('a handle that takes the focus', () => {
    /** jsdom shows every script focus; a browser shows only the keyboard's. */
    function focusShown(isShown: boolean) {
      const matches = Element.prototype.matches;
      vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector) {
        return selector === ':focus-visible' ? isShown : matches.call(this, selector);
      });
    }
    function zoomedAndFocused() {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      setSettings({ motion: 'reduced' });
      render(<Harness />);
      resize(PLOT);
      for (let step = 0; step < 4; step += 1) act(() => latest.zoom.zoomIn());
      const before = latest.zoom.view;
      act(() => screen.getByRole('button', { name: 'asidero' }).focus());
      return before;
    }
    afterEach(() => vi.restoreAllMocks());

    test('is brought into view when the browser shows its focus (Tab)', () => {
      focusShown(true);
      const before = zoomedAndFocused();

      expect(latest.zoom.view).not.toEqual(before);
    });

    test('does not pan the view when the focus is a press on it (no focus ring)', () => {
      focusShown(false);
      const before = zoomedAndFocused();

      expect(latest.zoom.view).toEqual(before);
    });
  });

  test('releases its observer with the viewport', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const { unmount } = render(<Harness />);
    expect(FakeResizeObserver.live.length).toBeGreaterThan(0);

    unmount();

    expect(FakeResizeObserver.live).toHaveLength(0);
  });
});
