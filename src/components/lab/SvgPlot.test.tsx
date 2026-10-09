// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';
import type { Scale } from './plotScales';
import SvgPlot, { type SvgPlotProps } from './SvgPlot';

const PROPS: SvgPlotProps = {
  title: 'Trayectoria',
  xLabel: 'x',
  xUnit: 'm',
  yLabel: 'y',
  yUnit: 'm',
  series: [
    {
      id: 'path',
      label: 'Trayectoria',
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 3 },
        { x: 10, y: 0 },
      ],
    },
  ],
  xDomain: { min: 0, max: 10 },
  yDomain: { min: 0, max: 4 },
  ariaLabel: 'Trayectoria parabólica del salto',
};

/** Identity CTM on the slider's svg: client pixels are viewBox units. */
function mockIdentityCtm(slider: HTMLElement): void {
  const svg = slider.closest('svg') as SVGSVGElement;
  Object.defineProperty(svg, 'getScreenCTM', {
    configurable: true,
    value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
  });
}

/** A ResizeObserver that reports `width` for every observed element as soon as it observes it. */
function stubResizeObserver(width: number): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(target: Element) {
        const entry = { target, contentRect: { width } } as unknown as ResizeObserverEntry;
        this.callback([entry], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    },
  );
}

function viewBoxOf(svg: Element): number[] {
  return (svg.getAttribute('viewBox') ?? '').split(' ').map(Number);
}

describe('SvgPlot', () => {
  afterEach(() => {
    cleanup();
    resetSettingsForTests();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('renders the axis labels with their units', () => {
    render(<SvgPlot {...PROPS} />);

    expect(screen.getByText('x (m)')).toBeInTheDocument();
    expect(screen.getByText('y (m)')).toBeInTheDocument();
  });

  test('renders a full-width svg image with a fixed viewBox, its label and the title', () => {
    render(<SvgPlot {...PROPS} />);

    const svg = screen.getByRole('img', { name: 'Trayectoria parabólica del salto' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 720 450');
    expect(svg).toHaveAttribute('width', '100%');
    expect(screen.getByText('Trayectoria', { selector: 'figcaption' })).toBeInTheDocument();
  });

  test('derives the viewBox height from aspectRatio', () => {
    render(<SvgPlot {...PROPS} aspectRatio={2} />);

    expect(viewBoxOf(screen.getByRole('img'))).toEqual([0, 0, 720, 360]);
  });

  test('formats tick values with the decimal comma', () => {
    render(<SvgPlot {...PROPS} yDomain={{ min: 0, max: 1 }} />);

    expect(screen.getAllByText(/^0,\d+$/).length).toBeGreaterThan(0);
  });

  test('draws each band as a rect labelled with the band label', () => {
    render(<SvgPlot {...PROPS} bands={[{ from: 2, to: 4, label: 'Ventana C3' }]} />);

    const band = screen.getByLabelText('Ventana C3');
    expect(band.tagName.toLowerCase()).toBe('rect');
    expect(screen.getByText('Ventana C3', { selector: 'text' })).toBeInTheDocument();
  });

  test('draws series as paths, dashed when asked', () => {
    const { container } = render(
      <SvgPlot
        {...PROPS}
        series={[
          ...PROPS.series,
          {
            id: 'ghost',
            label: 'Tierra',
            dashed: true,
            points: [
              { x: 0, y: 0 },
              { x: 10, y: 2 },
            ],
          },
        ]}
      />,
    );

    const solid = container.querySelector('[data-series="path"]');
    const dashed = container.querySelector('[data-series="ghost"]');
    expect(solid?.tagName.toLowerCase()).toBe('path');
    expect(solid?.getAttribute('d')).toMatch(/^M/);
    expect(solid).not.toHaveAttribute('stroke-dasharray');
    expect(dashed).toHaveAttribute('stroke-dasharray');
  });

  test('lists two or more series in a legend', () => {
    render(
      <SvgPlot
        {...PROPS}
        series={[...PROPS.series, { id: 'b', label: 'Tierra', points: [{ x: 1, y: 1 }] }]}
      />,
    );

    expect(screen.getByRole('list', { name: 'Leyenda' })).toHaveTextContent('Tierra');
  });

  test('leaves a single series without a legend', () => {
    render(<SvgPlot {...PROPS} />);

    expect(screen.queryByRole('list', { name: 'Leyenda' })).not.toBeInTheDocument();
  });

  test('breaks a series path at non-finite points', () => {
    const { container } = render(
      <SvgPlot
        {...PROPS}
        series={[
          {
            id: 'gap',
            label: 'Con hueco',
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 1 },
              { x: 2, y: Number.NaN },
              { x: 3, y: 1 },
              { x: 4, y: 0 },
            ],
          },
        ]}
      />,
    );

    const d = container.querySelector('[data-series="gap"]')?.getAttribute('d') ?? '';
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d).not.toContain('NaN');
  });

  test('draws the grid by default and hides it with showGrid false', () => {
    const { container, rerender } = render(<SvgPlot {...PROPS} />);
    expect(container.querySelectorAll('[data-grid] line').length).toBeGreaterThan(0);

    rerender(<SvgPlot {...PROPS} showGrid={false} />);
    expect(container.querySelector('[data-grid]')).not.toBeInTheDocument();
  });

  test('follows the global grid setting when showGrid is not given', () => {
    const { container } = render(<SvgPlot {...PROPS} />);

    act(() => {
      setSettings({ grid: false });
    });

    expect(container.querySelector('[data-grid]')).not.toBeInTheDocument();
  });

  test('draws the marker as a circle with its label', () => {
    const { container } = render(<SvgPlot {...PROPS} marker={{ x: 5, y: 3, label: 'Ápice' }} />);

    expect(container.querySelector('circle[data-marker]')).toBeInTheDocument();
    expect(screen.getByText('Ápice')).toBeInTheDocument();
  });

  test('derives the domains from the data when they are omitted', () => {
    let captured: { x: Scale; y: Scale } | undefined;
    render(
      <SvgPlot
        {...PROPS}
        series={[
          {
            id: 'lifted',
            label: 'Elevada',
            points: [
              { x: 0, y: 1 },
              { x: 10, y: 3 },
            ],
          },
        ]}
        xDomain={undefined}
        yDomain={undefined}
        overlay={(scales) => {
          captured = scales;
          return null;
        }}
      />,
    );

    expect(captured?.x.domain.min).toBeLessThan(0);
    expect(captured?.x.domain.max).toBeGreaterThan(10);
    expect(captured?.y.domain.min).toBe(0);
    expect(captured?.y.domain.max).toBeCloseTo(3.1);
  });

  describe('cursor', () => {
    test('exposes a focusable slider labelled by the x axis', () => {
      render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange: () => {} }} />);

      const slider = screen.getByRole('slider', { name: 'x' });
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '10');
      expect(slider).toHaveAttribute('aria-valuenow', '5');
      expect(slider).toHaveAttribute('tabindex', '0');
    });

    test('ArrowRight calls onChange with a greater value', () => {
      const onChange = vi.fn();
      render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange }} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBeGreaterThan(5);
    });

    test('arrows move by 1 % of the domain and by 10 % with Shift', () => {
      const onChange = vi.fn();
      render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange }} />);
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });

      expect(onChange.mock.calls[0][0]).toBeCloseTo(4.9);
      expect(onChange.mock.calls[1][0]).toBeCloseTo(6);
    });

    test('Home and End jump to the domain ends and moves are clamped', () => {
      const onChange = vi.fn();
      render(<SvgPlot {...PROPS} cursor={{ x: 9.95, onChange }} />);
      const slider = screen.getByRole('slider');

      fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
      fireEvent.keyDown(slider, { key: 'Home' });
      fireEvent.keyDown(slider, { key: 'End' });

      expect(onChange.mock.calls.map(([x]) => x)).toEqual([10, 0, 10]);
    });

    test('ignores keys that do not move the cursor', () => {
      const onChange = vi.fn();
      render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange }} />);

      fireEvent.keyDown(screen.getByRole('slider'), { key: 'a' });

      expect(onChange).not.toHaveBeenCalled();
    });

    test('dragging maps the pointer through the screen CTM and clamps it', () => {
      const onChange = vi.fn();
      let xScale: Scale | undefined;
      render(
        <SvgPlot
          {...PROPS}
          cursor={{ x: 5, onChange }}
          overlay={({ x }) => {
            xScale = x;
            return null;
          }}
        />,
      );
      const slider = screen.getByRole('slider');
      mockIdentityCtm(slider);
      const grabbed = xScale!.toPx(5);
      const target = xScale!.toPx(7.5);

      fireEvent.pointerDown(slider, { pointerId: 1, clientX: grabbed, clientY: 100 });
      fireEvent.pointerMove(slider, { pointerId: 1, clientX: target, clientY: 100 });
      fireEvent.pointerMove(slider, { pointerId: 1, clientX: 5000, clientY: 100 });
      fireEvent.pointerUp(slider, { pointerId: 1 });
      fireEvent.pointerMove(slider, { pointerId: 1, clientX: target, clientY: 100 });

      expect(onChange.mock.calls.map(([x]) => x)).toEqual([7.5, 10]);
    });

    test('keeps the grab offset so the knob does not jump to the pointer', () => {
      const onChange = vi.fn();
      let xScale: Scale | undefined;
      render(
        <SvgPlot
          {...PROPS}
          cursor={{ x: 5, onChange }}
          overlay={({ x }) => {
            xScale = x;
            return null;
          }}
        />,
      );
      const slider = screen.getByRole('slider');
      mockIdentityCtm(slider);
      // Grab 8 px right of the line, then move by the pixels of 2.5 m.
      const grabbed = xScale!.toPx(5) + 8;
      const delta = xScale!.toPx(2.5) - xScale!.toPx(0);

      fireEvent.pointerDown(slider, { pointerId: 1, clientX: grabbed, clientY: 100 });
      fireEvent.pointerMove(slider, { pointerId: 1, clientX: grabbed + delta, clientY: 100 });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBeCloseTo(7.5, 6);
    });

    test('renders the cursor label near the handle', () => {
      render(
        <SvgPlot {...PROPS} cursor={{ x: 5, onChange: () => {}, label: (x) => `x = ${x} m` }} />,
      );

      expect(screen.getByText('x = 5 m')).toBeInTheDocument();
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'x = 5 m');
    });

    test('draws a read-only cursor line without a slider when there is no onChange', () => {
      const { container } = render(<SvgPlot {...PROPS} cursor={{ x: 5 }} />);

      expect(screen.queryByRole('slider')).not.toBeInTheDocument();
      expect(container.querySelector('[data-cursor] line')).toBeInTheDocument();
    });
  });

  describe('overlay', () => {
    test('receives scales whose toPx(min) falls inside the plot area', () => {
      let captured: { x: Scale; y: Scale } | undefined;
      render(
        <SvgPlot
          {...PROPS}
          overlay={(scales) => {
            captured = scales;
            return <circle data-testid="overlay-dot" cx={0} cy={0} r={4} />;
          }}
        />,
      );
      const [, , width, height] = viewBoxOf(screen.getByRole('img'));

      const xPx = captured!.x.toPx(captured!.x.domain.min);
      const yPx = captured!.y.toPx(captured!.y.domain.min);
      expect(xPx).toBeGreaterThan(0);
      expect(xPx).toBeLessThan(width);
      expect(yPx).toBeGreaterThan(0);
      expect(yPx).toBeLessThan(height);
    });

    test('renders inside the clipped plot area', () => {
      render(<SvgPlot {...PROPS} overlay={() => <circle data-testid="overlay-dot" r={4} />} />);

      expect(screen.getByTestId('overlay-dot').closest('g[clip-path]')).not.toBeNull();
    });
  });

  test('equalAspect gives both axes the same pixels per unit', () => {
    let captured: { x: Scale; y: Scale } | undefined;
    render(
      <SvgPlot
        {...PROPS}
        equalAspect
        yDomain={{ min: 0, max: 2 }}
        overlay={(scales) => {
          captured = scales;
          return null;
        }}
      />,
    );

    const xUnit = captured!.x.toPx(1) - captured!.x.toPx(0);
    const yUnit = captured!.y.toPx(0) - captured!.y.toPx(1);
    expect(yUnit).toBeCloseTo(xUnit);
    expect(viewBoxOf(screen.getByRole('img'))[3]).toBeLessThan(450);
  });

  test('sizes the viewBox from the measured container width, both layers alike', () => {
    stubResizeObserver(360);
    const { container } = render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange: () => {} }} />);

    const svgs = container.querySelectorAll('svg[viewBox]');
    expect(svgs).toHaveLength(2);
    expect(svgs[0].getAttribute('viewBox')).toMatch(/^0 0 360 /);
    expect(svgs[1].getAttribute('viewBox')).toBe(svgs[0].getAttribute('viewBox'));
    expect(viewBoxOf(svgs[0])[3]).toBeCloseTo(360 / 1.6);
  });

  test('equalAspect caps a tall plot at 1.5 times its width by widening x symmetrically', () => {
    let captured: { x: Scale; y: Scale } | undefined;
    render(
      <SvgPlot
        {...PROPS}
        equalAspect
        xDomain={{ min: 0, max: 1 }}
        yDomain={{ min: 0, max: 100 }}
        overlay={(scales) => {
          captured = scales;
          return null;
        }}
      />,
    );
    const { x, y } = captured!;

    const plotWidth = x.range[1] - x.range[0];
    const plotHeight = y.range[0] - y.range[1];
    expect(plotHeight).toBeCloseTo(1.5 * plotWidth);
    expect(y.domain).toEqual({ min: 0, max: 100 });
    expect((x.domain.min + x.domain.max) / 2).toBeCloseTo(0.5);
    expect(x.toPx(1) - x.toPx(0)).toBeCloseTo(y.toPx(0) - y.toPx(1));
  });

  test('equalAspect keeps a flat plot at least half its width by widening y symmetrically', () => {
    let captured: { x: Scale; y: Scale } | undefined;
    render(
      <SvgPlot
        {...PROPS}
        equalAspect
        xDomain={{ min: 0, max: 100 }}
        yDomain={{ min: 0, max: 1 }}
        overlay={(scales) => {
          captured = scales;
          return null;
        }}
      />,
    );
    const { x, y } = captured!;

    expect(y.range[0] - y.range[1]).toBeCloseTo(0.5 * (x.range[1] - x.range[0]));
    expect(x.domain).toEqual({ min: 0, max: 100 });
    expect((y.domain.min + y.domain.max) / 2).toBeCloseTo(0.5);
    expect(x.toPx(1) - x.toPx(0)).toBeCloseTo(y.toPx(0) - y.toPx(1));
  });

  test('applies the test id to the figure', () => {
    render(<SvgPlot {...PROPS} testId="plot" />);

    expect(screen.getByTestId('plot').tagName.toLowerCase()).toBe('figure');
  });
});
