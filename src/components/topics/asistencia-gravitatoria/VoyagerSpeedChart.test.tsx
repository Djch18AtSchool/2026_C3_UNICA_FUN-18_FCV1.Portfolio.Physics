// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { stubResizeObserver } from '../../lab/svgPlotTestKit';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { svgText } from '../../../test-svg-text';
import VoyagerSpeedChart, { VOYAGER_CHART_SOURCE } from './VoyagerSpeedChart';

const NNBSP = '\u202f';

/** Each encounter label's box, as the chart lays it out (viewBox px). */
function labelBoxes(container: HTMLElement) {
  return [...container.querySelectorAll<SVGGElement>('[data-encounter]')].map((group) => ({
    id: group.dataset.encounter ?? '',
    x: Number(group.dataset.x),
    left: Number(group.dataset.left),
    width: Number(group.dataset.width),
    row: Number(group.dataset.row),
  }));
}

describe('VoyagerSpeedChart', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test('four encounter markers in planet colors, labelled with the signed jump', () => {
    const { container } = render(<VoyagerSpeedChart />);

    const guides = [...container.querySelectorAll('[data-encounter] [data-guide]')];
    expect(guides.map((guide) => guide.getAttribute('stroke'))).toEqual([
      'var(--jupiter)',
      'var(--saturn)',
      'var(--uranus)',
      'var(--neptune)',
    ]);
    // Testing Library collapses the unit's narrow no-break space to a plain space.
    for (const label of ['+10,2 km/s', '+4,9 km/s', '+1,9 km/s', '−2,1 km/s']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test('speed and distance panels share the time axis; escape dashed in --sun over a shaded zone', () => {
    const { container } = render(<VoyagerSpeedChart />);

    expect(container.querySelector('[data-panel="speed"]')).not.toBeNull();
    expect(container.querySelector('[data-panel="distance"]')).not.toBeNull();
    const escape = container.querySelector('[data-series="escape"]');
    expect(escape?.getAttribute('stroke')).toBe('var(--sun)');
    expect(escape?.getAttribute('stroke-dasharray')).not.toBeNull();
    expect(container.querySelector('[data-region="hiperbolica"]')?.getAttribute('fill')).toBe(
      'var(--sun)',
    );
    expect(container.querySelector('[data-series="v2"]')?.getAttribute('stroke')).toBe('var(--fg)');
    expect(container.querySelector('[data-series="solo-sol-r"]')).not.toBeNull();
    expect(screen.getByText('|v| (km/s)')).toBeInTheDocument();
    expect(screen.getByText('r (UA)')).toBeInTheDocument();
  });

  test('a legend names every line; the footnote explains Δ|v| and leaves the source to the Figure', () => {
    const { container } = render(<VoyagerSpeedChart />);
    const legend = screen.getByRole('toolbar', { name: 'Leyenda: realzar una serie' });

    expect(plexViolations(container)).toEqual([]);
    expect(mathSourceText(legend)).toContain('V2, $\\sqrt{2GM_\\odot/r}$');
    expect(legend).toHaveTextContent('Voyager 2');
    expect(legend).toHaveTextContent('Voyager 1');
    expect(legend).toHaveTextContent('Rapidez de escape');
    expect(legend).toHaveTextContent('Zona hiperbólica');
    expect(legend).toHaveTextContent('Solo el Sol');
    const footnote = screen.getByTestId('chart-footnote');
    expect(footnote).toHaveTextContent(/120 días antes y 120 días después \(vis-viva\)/);
    expect(footnote).not.toHaveTextContent('Horizons');
    expect(VOYAGER_CHART_SOURCE).toMatch(/^Gráfica del autor; datos: NASA\/JPL Horizons/);
  });

  test('the date cursor moves with the keyboard and the readout follows it', () => {
    render(<VoyagerSpeedChart />);
    const slider = screen.getByRole('slider', { name: 'Fecha' });
    const readout = screen.getByTestId('voyager-readout');

    expect(slider).toHaveAttribute('aria-valuetext', '1 ene 1980');
    expect(readout).toHaveTextContent(/^1 ene 1980\. Voyager 2:/);

    fireEvent.keyDown(slider, { key: 'End' });

    expect(slider).toHaveAttribute('aria-valuetext', '1 ene 1990');
    expect(readout).toHaveTextContent(/^1 ene 1990\. Voyager 2:/);
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider.getAttribute('aria-valuetext')).toMatch(/1989$/);
  });

  test('the readout is announced once the cursor settles', () => {
    vi.useFakeTimers();
    render(<VoyagerSpeedChart />);
    const announcer = screen.getByTestId('voyager-announcer');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    expect(announcer).toHaveTextContent('');

    fireEvent.keyDown(screen.getByRole('slider', { name: 'Fecha' }), { key: 'Home' });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(announcer).toHaveTextContent(/^21 ago 1977\./);
  });

  test('the Jupiter detail shows the hourly window: the peak inside the well and the net jump', () => {
    const { container } = render(<VoyagerSpeedChart />);
    const toggle = screen.getByRole('group', { name: 'Detalle de cada encuentro' });

    fireEvent.click(within(toggle).getByRole('button', { name: 'Júpiter' }));

    expect(within(toggle).getByRole('button', { name: 'Júpiter' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(container.querySelector('[data-panel="distance"]')).toBeNull();
    expect(screen.getByText(`Pico: 26,87 km/s`)).toBeInTheDocument();
    expect(screen.getByText(`+10,2 km/s`)).toBeInTheDocument();
    expect(screen.getByText(svgText('t − tMA (d)'))).toHaveAttribute(
      'data-notation',
      't − t_{MA} (d)',
    );
    expect(plexViolations(container)).toEqual([]);
    expect(screen.getByTestId('voyager-detail-numbers')).toHaveTextContent(
      /antes 9,\d\d\skm\/s, después 19,\d\d\skm\/s; salto neto \+10,2\skm\/s/,
    );
    expect(screen.getByRole('img', { name: /pico de 26,87/ })).toHaveAccessibleName(/salto neto/);
    expect(screen.getByRole('slider', { name: 'Fecha' })).toHaveAttribute(
      'aria-valuetext',
      `MA \u22122,00${NNBSP}d`,
    );

    fireEvent.click(within(toggle).getByRole('button', { name: 'Misión completa' }));
    expect(container.querySelector('[data-panel="distance"]')).not.toBeNull();
  });

  test('the detail prop opens on that encounter: Neptune loses 2,1 km/s', () => {
    render(<VoyagerSpeedChart detail="N" />);

    expect(screen.getByRole('button', { name: 'Neptuno' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(`−2,1 km/s`)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Neptuno/ })).toBeInTheDocument();
  });

  test('on a 260 px phone chart: years every other tick, no label overlaps, no wider than its box', () => {
    stubResizeObserver(260);
    const { container } = render(<VoyagerSpeedChart />);

    const svg = container.querySelector('svg[role="img"]') as SVGSVGElement;
    expect(svg.getAttribute('viewBox')?.split(' ')[2]).toBe('260');
    const years = [...container.querySelectorAll('[data-tick-label]')].map((t) => t.textContent);
    expect(years).toEqual(['1978', '1980', '1982', '1984', '1986', '1988', '1990']);
    const boxes = labelBoxes(container);
    expect(boxes).toHaveLength(4);
    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.left + box.width).toBeLessThanOrEqual(260);
      for (const other of boxes) {
        if (other === box) continue;
        expect(other.x > box.left - 4 && other.x < box.left + box.width + 4).toBe(false);
        if (other.row === box.row) {
          const isApart =
            other.left >= box.left + box.width || box.left >= other.left + other.width;
          expect(isApart, `${box.id} / ${other.id}`).toBe(true);
        }
      }
    }
  });

  test('a wide chart labels every year', () => {
    stubResizeObserver(720);
    const { container } = render(<VoyagerSpeedChart />);

    expect(container.querySelectorAll('[data-tick-label]')).toHaveLength(13);
  });
});
