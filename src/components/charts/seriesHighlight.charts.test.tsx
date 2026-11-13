// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import ThresholdPlot from '../topics/coeficiente-restitucion/ThresholdPlot';
import VoyagerSpeedChart from '../topics/asistencia-gravitatoria/VoyagerSpeedChart';
import { SERIES_DIM_OPACITY } from './seriesHighlight';

const legendButtons = () =>
  within(screen.getByRole('toolbar', { name: 'Leyenda: realzar una serie' })).getAllByRole(
    'button',
  );

/** The chart's legend entry named `name`, as a button. */
const entry = (name: RegExp) =>
  within(screen.getByRole('toolbar', { name: 'Leyenda: realzar una serie' })).getByRole('button', {
    name,
  });

describe('the legend highlight in the charts drawn by hand', () => {
  afterEach(cleanup);

  test('Voyager: a line is highlighted in both panels, the region and the other lines fade', () => {
    const { container } = render(<VoyagerSpeedChart />);
    const emphasisOf = (selector: string) =>
      container.querySelector(selector)?.getAttribute('data-emphasis') ?? '';

    fireEvent.pointerEnter(entry(/^Voyager 2$/), { pointerType: 'mouse' });

    expect(emphasisOf('[data-series="v2"]')).toBe('focus');
    // The distance panel draws V2 under its own id: it follows its legend entry.
    expect(emphasisOf('[data-series="v2-r"]')).toBe('focus');
    expect(emphasisOf('[data-series="v1"]')).toBe('dim');
    expect(emphasisOf('[data-series="v1-r"]')).toBe('dim');
    expect(container.querySelector('[data-region="hiperbolica"]')).toHaveAttribute(
      'opacity',
      String(SERIES_DIM_OPACITY),
    );
  });

  test('Voyager: the hyperbolic zone, from its entry, keeps its shade while the lines fade', () => {
    const { container } = render(<VoyagerSpeedChart />);

    fireEvent.click(entry(/^Zona hiperbólica/));

    expect(container.querySelector('[data-region="hiperbolica"]')).not.toHaveAttribute('opacity');
    expect(container.querySelector('[data-series="v2"]')).toHaveAttribute('data-emphasis', 'dim');
  });

  test('Voyager: the levels of an encounter follow their entry', () => {
    const { container } = render(<VoyagerSpeedChart detail="S" />);

    fireEvent.focus(entry(/^Solo el Sol a la distancia/));

    const levels = [...container.querySelectorAll('[data-series="niveles"]')];
    expect(levels).toHaveLength(2);
    for (const level of levels) expect(level).toHaveAttribute('data-emphasis', 'focus');
    expect(container.querySelector('[data-series="v2"]')).toHaveAttribute('data-emphasis', 'dim');
  });

  test('the bounce thresholds: an engine is highlighted with its threshold and its stop; the rest fade', () => {
    const { container } = render(<ThresholdPlot />);
    const ids = [...container.querySelectorAll('path[data-series]')].map((path) =>
      path.getAttribute('data-series'),
    );
    const engine = ids.find((id) => id !== 'ideal') ?? '';
    const other = ids.find((id) => id !== 'ideal' && id !== engine) ?? '';
    // The legend lists the series in the order they are drawn: the ideal one, then each engine.
    fireEvent.click(legendButtons()[ids.indexOf(engine)]);

    const series = container.querySelector(`path[data-series="${engine}"]`);
    expect(series).toHaveAttribute('data-emphasis', 'focus');
    expect(container.querySelector(`[data-threshold="${other}"]`)).toHaveAttribute(
      'opacity',
      String(SERIES_DIM_OPACITY),
    );
    expect(container.querySelector(`[data-stop="${other}"]`)).toHaveAttribute(
      'data-emphasis',
      'dim',
    );
    expect(container.querySelector(`[data-threshold="${engine}"]`)).not.toHaveAttribute('opacity');
    expect(
      container.querySelector('path[data-series="ideal"]')?.closest('g[opacity]'),
    ).toHaveAttribute('opacity', String(SERIES_DIM_OPACITY));
  });

  test('the bounce thresholds: a legend in a column moves with ↑ and ↓, not ← and →', () => {
    render(<ThresholdPlot />);
    const toolbar = screen.getByRole('toolbar', { name: 'Leyenda: realzar una serie' });
    const [first, second] = legendButtons();
    expect(toolbar).toHaveAttribute('aria-orientation', 'vertical');
    act(() => first.focus());

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: 'ArrowUp' });
    expect(first).toHaveFocus();
  });
});
