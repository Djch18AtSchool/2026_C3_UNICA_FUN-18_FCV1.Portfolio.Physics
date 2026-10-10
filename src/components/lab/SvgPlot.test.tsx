// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';
import type { Scale } from './plotScales';
import SvgPlot from './SvgPlot';
import { PROPS, viewBoxOf } from './svgPlotTestKit';

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

  test('draws each band as a rect tagged with its label, named by visible text only', () => {
    const { container } = render(
      <SvgPlot {...PROPS} bands={[{ from: 2, to: 4, label: 'Ventana C3' }]} />,
    );

    const band = container.querySelector('[data-band="Ventana C3"]');
    expect(band?.tagName.toLowerCase()).toBe('rect');
    // aria-label on a role-less <rect> is prohibited (axe aria-prohibited-attr).
    expect(band).not.toHaveAttribute('aria-label');
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

    test('overlayBleed widens only the overlay clip, so a knob on the plot edge stays whole', () => {
      const { container } = render(
        <SvgPlot {...PROPS} overlayBleed={16} overlay={() => <circle r={4} />} />,
      );
      const rectOf = (layer: number) =>
        ['x', 'y', 'width', 'height'].map((name) =>
          Number(
            container
              .querySelectorAll('svg[viewBox]')
              [layer].querySelector('clipPath rect')
              ?.getAttribute(name),
          ),
        );
      const [px, py, pw, ph] = rectOf(0);

      expect(rectOf(1)).toEqual([px - 16, py - 16, pw + 32, ph + 32]);
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

  test('keeps the 720 px layout: plot area from x = 84 to 692 and y from 22, title rotated', () => {
    let captured: { x: Scale; y: Scale } | undefined;
    const { container } = render(
      <SvgPlot
        {...PROPS}
        overlay={(scales) => {
          captured = scales;
          return null;
        }}
      />,
    );

    expect(captured!.x.range).toEqual([84, 692]);
    expect(captured!.y.range[1]).toBe(22);
    expect(container.querySelector('text[transform^="rotate(-90"]')).toHaveTextContent('y (m)');
  });
});
