// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { useJumpZoom, type JumpZoom } from './useJumpZoom';

/** The plot area the first measure reports, and what a margin fit does to it (12 px). */
const PLOT = { width: 320, height: 160 };
const MARGIN_FIT_PX = 12;
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

  test('follows every change of the plot size: the window is computed from the plot on screen', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    render(<Harness />);
    resize(PLOT);
    zoomInTwice();
    const before = latest.domains;

    resize({ width: PLOT.width + MARGIN_FIT_PX, height: PLOT.height + MARGIN_FIT_PX });

    expect(latest.domains).not.toEqual(before);
    expect(latest.plot).toEqual({
      width: PLOT.width + MARGIN_FIT_PX,
      height: PLOT.height + MARGIN_FIT_PX,
    });
  });

  test('says the plot is settled once the observer reports the size SvgPlot drew', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    render(<Harness />);
    resize(PLOT);

    act(() => latest.noteDrawn({ width: PLOT.width, height: PLOT.height + MARGIN_FIT_PX }));
    expect(latest.isPlotSettled()).toBe(false);

    resize({ width: PLOT.width, height: PLOT.height + MARGIN_FIT_PX });
    expect(latest.isPlotSettled()).toBe(true);
  });

  test('brings a point in metres into view: 12 px around it and 16 from the edge', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    render(<Harness />);
    resize(PLOT);
    for (let step = 0; step < 6; step += 1) act(() => latest.zoom.zoomIn());
    const before = latest.domains;
    // Past the right edge of the window on show, at its middle height.
    const outside = { x: before.x.max + 0.3, y: (before.y.min + before.y.max) / 2 };

    act(() => latest.revealAt(outside));

    expect(latest.domains.x.max).toBeGreaterThan(outside.x);
    expect(latest.domains.y.min).toBeCloseTo(before.y.min, 6);
    expect(screen.getByTestId('viewport')).toBeInTheDocument();
  });

  describe('a handle that takes the focus', () => {
    /** Zoomed in, the handle focused either by the keyboard (Tab) or inside a press (R30). */
    function zoomedAndFocused(by: 'keyboard' | 'press') {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      setSettings({ motion: 'reduced' });
      render(<Harness />);
      resize(PLOT);
      for (let step = 0; step < 4; step += 1) act(() => latest.zoom.zoomIn());
      const before = latest.zoom.view;
      const handle = screen.getByRole('button', { name: 'asidero' });
      if (by === 'press') fireEvent.mouseDown(handle);
      act(() => handle.focus());
      if (by === 'press') fireEvent.mouseUp(handle);
      return before;
    }

    test('is brought into view when the keyboard focuses it (Tab)', () => {
      const before = zoomedAndFocused('keyboard');

      expect(latest.zoom.view).not.toEqual(before);
    });

    test('does not pan the view when the focus comes with a press on it', () => {
      const before = zoomedAndFocused('press');

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
