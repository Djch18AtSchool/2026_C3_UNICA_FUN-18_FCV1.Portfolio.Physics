// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests } from '../../lib/settingsStore';
import type { Scale } from './plotScales';
import SvgPlot from './SvgPlot';
import { PROPS, stubResizeObserver, viewBoxOf } from './svgPlotTestKit';

describe('SvgPlot on a phone-width container', () => {
  afterEach(() => {
    cleanup();
    resetSettingsForTests();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('sizes the viewBox from the measured container width, both layers alike', () => {
    stubResizeObserver(360);
    const { container } = render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange: () => {} }} />);

    const svgs = container.querySelectorAll('svg[viewBox]');
    expect(svgs).toHaveLength(2);
    expect(svgs[0].getAttribute('viewBox')).toMatch(/^0 0 360 /);
    expect(svgs[1].getAttribute('viewBox')).toBe(svgs[0].getAttribute('viewBox'));
    // Below 480 px the default aspect narrows to 1,25 so the plot area stays tall enough.
    expect(viewBoxOf(svgs[0])[3]).toBeCloseTo(360 / 1.25);
  });

  test('a narrow plot without an explicit aspect is drawn at 1,25, taller than 88 px of plot', () => {
    stubResizeObserver(343);
    let captured: { x: Scale; y: Scale } | undefined;
    render(
      <SvgPlot
        {...PROPS}
        overlay={(scales) => {
          captured = scales;
          return null;
        }}
      />,
    );

    expect(viewBoxOf(screen.getByRole('img'))[3]).toBeCloseTo(343 / 1.25);
    expect(captured!.y.range[0] - captured!.y.range[1]).toBeGreaterThan(150);
  });

  test('a narrow plot keeps an explicit aspectRatio', () => {
    stubResizeObserver(343);
    render(<SvgPlot {...PROPS} aspectRatio={2} />);

    expect(viewBoxOf(screen.getByRole('img'))[3]).toBeCloseTo(343 / 2);
  });

  test('below 480 px the margins tighten and the left one fits the widest y tick label', () => {
    stubResizeObserver(300);
    let captured: { x: Scale; y: Scale } | undefined;
    const { container } = render(
      <SvgPlot
        {...PROPS}
        yDomain={{ min: 0, max: 12.5 }}
        overlay={(scales) => {
          captured = scales;
          return null;
        }}
      />,
    );
    const yLabels = [...container.querySelectorAll('text[text-anchor="end"]')].map(
      (node) => node.textContent ?? '',
    );
    const widest = Math.max(...yLabels.map((label) => label.length));
    const [left, right] = captured!.x.range;

    expect(left).toBe(Math.max(40, widest * 8 + 12));
    expect(left).toBeLessThan(84);
    expect(300 - right).toBeLessThan(28);
    // The y title sits horizontally above the axis instead of in a rotated band.
    expect(container.querySelector('text[transform^="rotate(-90"]')).toBeNull();
    expect(screen.getByText('y (m)')).toHaveAttribute('text-anchor', 'start');
  });

  /** Horizontal extent of a <text>, estimated as the plotter does: 0,6 em per mono character. */
  function textExtent(node: Element, fontSize: number): [number, number] {
    const x = Number(node.getAttribute('x'));
    const width = (node.textContent ?? '').length * fontSize * 0.6;
    const anchor = node.getAttribute('text-anchor') ?? 'start';
    if (anchor === 'middle') return [x - width / 2, x + width / 2];
    return anchor === 'end' ? [x - width, x] : [x, x + width];
  }

  test('on a narrow plot the last x tick label and a band label stay inside the viewBox', () => {
    stubResizeObserver(300);
    render(
      <SvgPlot
        {...PROPS}
        xDomain={{ min: 0, max: 10000 }}
        bands={[{ from: 9000, to: 10000, label: 'Ventana de trabajo C3 (2019)' }]}
      />,
    );

    const [, tickRight] = textExtent(screen.getByText('10 000'), 13);
    const [bandLeft, bandRight] = textExtent(screen.getByText('Ventana de trabajo C3 (2019)'), 12);
    expect(tickRight).toBeLessThanOrEqual(300);
    expect(bandLeft).toBeGreaterThanOrEqual(0);
    expect(bandRight).toBeLessThanOrEqual(300);
  });

  test('a band can put its label at the bottom of the plot area', () => {
    let captured: { x: Scale; y: Scale } | undefined;
    render(
      <SvgPlot
        {...PROPS}
        bands={[{ from: 2, to: 4, label: 'Ventana C3', labelAt: 'bottom' }]}
        overlay={(scales) => {
          captured = scales;
          return null;
        }}
      />,
    );

    const y = Number(screen.getByText('Ventana C3', { selector: 'text' }).getAttribute('y'));
    expect(y).toBeLessThan(captured!.y.range[0]);
    expect(y).toBeGreaterThan(captured!.y.range[0] - 20);
  });

  test('the cursor label flips left when it would run past the plot area', () => {
    stubResizeObserver(300);
    render(
      <SvgPlot
        {...PROPS}
        cursor={{ x: 6.5, onChange: () => {}, label: () => 'T = 120 °C, largo' }}
      />,
    );

    expect(screen.getByText('T = 120 °C, largo')).toHaveAttribute('text-anchor', 'end');
  });

  test('on a narrow plot with a draggable cursor the y title clears the knob', () => {
    stubResizeObserver(300);
    let captured: { x: Scale; y: Scale } | undefined;
    render(
      <SvgPlot
        {...PROPS}
        cursor={{ x: 9, onChange: () => {} }}
        overlay={(scales) => {
          captured = scales;
          return null;
        }}
      />,
    );
    const areaTop = captured!.y.range[1];
    const titleBaseline = Number(screen.getByText('y (m)').getAttribute('y'));

    // Knob radius 7 plus its 2 px ring, and the title's descenders (≈ 4 px) above it.
    expect(areaTop - titleBaseline).toBeGreaterThanOrEqual(7 + 2 + 4 + 4);
    expect(titleBaseline).toBeGreaterThanOrEqual(14);
  });

  test('a narrow plot with one-character y labels keeps a 40 px left margin', () => {
    stubResizeObserver(300);
    let captured: { x: Scale; y: Scale } | undefined;
    render(
      <SvgPlot
        {...PROPS}
        yDomain={{ min: 0, max: 4 }}
        overlay={(scales) => {
          captured = scales;
          return null;
        }}
      />,
    );

    expect(captured!.x.range[0]).toBe(40);
  });

  test('a touch on the cursor knob never pans the page', () => {
    const { container } = render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange: () => {} }} />);
    const knobTarget = container.querySelector('[data-cursor-knob-target]') as Element;

    const notCancelled = fireEvent.touchStart(knobTarget, {
      touches: [{ clientX: 0, clientY: 0 }],
    });

    expect(notCancelled).toBe(false);
  });

  test('a touch on the cursor line below the knob still lets the page scroll', () => {
    const { container } = render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange: () => {} }} />);
    const strip = container.querySelector('[data-cursor-strip]') as Element;

    const notCancelled = fireEvent.touchStart(strip, { touches: [{ clientX: 0, clientY: 0 }] });

    expect(notCancelled).toBe(true);
  });

  test('the knob touch target is 24 px wide and 44 px tall, centred on the knob', () => {
    const { container } = render(<SvgPlot {...PROPS} cursor={{ x: 5, onChange: () => {} }} />);
    const target = container.querySelector('[data-cursor-knob-target]') as Element;
    const knob = container.querySelector('[data-cursor] circle:last-of-type') as Element;
    const attr = (node: Element, name: string) => Number(node.getAttribute(name));

    expect(attr(target, 'width')).toBe(24);
    expect(attr(target, 'height')).toBe(44);
    expect(attr(target, 'x') + 12).toBeCloseTo(attr(knob, 'cx'));
    expect(attr(target, 'y') + 22).toBeCloseTo(attr(knob, 'cy'));
  });
  test.each([720, 300])(
    'at %i px a band label placed before the band ends left of it, wrapped to fit the plot',
    (width) => {
      stubResizeObserver(width);
      let captured: { x: Scale; y: Scale } | undefined;
      const { container } = render(
        <SvgPlot
          {...PROPS}
          xDomain={{ min: 40, max: 160 }}
          bands={[
            {
              from: 105,
              to: 135,
              label: 'Ventana de trabajo C3 (2019)',
              labelAt: 'bottom',
              labelBefore: true,
            },
          ]}
          overlay={(scales) => {
            captured = scales;
            return null;
          }}
        />,
      );
      const bandLeft = captured!.x.toPx(105);
      const areaLeft = captured!.x.range[0];
      const text = [...container.querySelectorAll('text')].find(
        (node) => node.textContent === 'Ventana de trabajo C3 (2019)',
      ) as SVGTextElement;
      const tspans = [...text.querySelectorAll('tspan')];
      const lines = tspans.length > 0 ? tspans : [text];
      const x = Number(text.getAttribute('x'));

      expect(text).toHaveAttribute('text-anchor', 'end');
      expect(x).toBeLessThan(bandLeft);
      for (const line of lines) {
        expect(x - (line.textContent ?? '').trim().length * 12 * 0.6).toBeGreaterThanOrEqual(
          areaLeft,
        );
      }
      expect(lines.length).toBe(width === 720 ? 1 : 2);
      expect(container.querySelector('[data-band]')).not.toBeNull();
    },
  );
});
