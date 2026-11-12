// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { MAP_DOMAIN } from './droneScene';
import { useRouteZoom, type RouteZoom } from './useRouteZoom';

/** The plot area the first measure reports, and what a margin fit does to it (12 px). */
const PLOT = { width: 322, height: 292 };
const MARGIN_FIT_PX = 12;
const REAL_RESIZE_PX = 80;

let latest: RouteZoom;

function Harness() {
  const routeZoom = useRouteZoom();
  latest = routeZoom;
  return (
    <div {...routeZoom.viewportProps} data-testid="viewport">
      <p id={routeZoom.zoom.instructionsId}>instrucciones</p>
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
const SPAN_X = spanOf(MAP_DOMAIN.x);

describe('useRouteZoom', () => {
  test('shows the whole map window while the plot is not measured, and without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(<Harness />);

    expect(latest.domains).toEqual({ x: MAP_DOMAIN.x, y: MAP_DOMAIN.y });
  });

  test('zooms the window about its centre by the view scale once the plot is measured', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    render(<Harness />);
    resize(PLOT);

    act(() => latest.zoom.zoomIn());
    act(() => latest.zoom.zoomIn());

    expect(spanOf(latest.domains.x)).toBeCloseTo(SPAN_X / 2, 6);
  });

  test('keeps the plot size the window was computed from through a margin fit of a few px', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    render(<Harness />);
    resize(PLOT);
    act(() => latest.zoom.zoomIn());
    act(() => latest.zoom.zoomIn());
    const before = latest.domains;

    resize({ width: PLOT.width + MARGIN_FIT_PX, height: PLOT.height + MARGIN_FIT_PX });

    expect(latest.domains).toEqual(before);
  });

  test('follows the plot when the container really resizes', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    render(<Harness />);
    resize(PLOT);
    act(() => latest.zoom.zoomIn());
    act(() => latest.zoom.zoomIn());
    const before = latest.domains;

    resize({ width: PLOT.width + REAL_RESIZE_PX, height: PLOT.height + REAL_RESIZE_PX });

    expect(latest.domains).not.toEqual(before);
  });

  test('brings a map point into view, a 12 px margin around its knob and 16 px from the edge', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    setSettings({ motion: 'reduced' });
    render(<Harness />);
    resize(PLOT);
    for (let step = 0; step < 6; step += 1) act(() => latest.zoom.zoomIn());
    const outside = { x: 1_300, y: 1_100 };
    expect(latest.domains.x.max).toBeLessThan(outside.x);

    act(() => latest.reveal(outside));

    expect(latest.domains.x.max).toBeGreaterThan(outside.x);
    expect(latest.domains.y.max).toBeGreaterThan(outside.y);
    expect(screen.getByTestId('viewport')).toBeInTheDocument();
  });

  test('releases its observer with the viewport', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const { unmount } = render(<Harness />);
    expect(FakeResizeObserver.live.length).toBeGreaterThan(0);

    unmount();

    expect(FakeResizeObserver.live).toHaveLength(0);
  });
});
