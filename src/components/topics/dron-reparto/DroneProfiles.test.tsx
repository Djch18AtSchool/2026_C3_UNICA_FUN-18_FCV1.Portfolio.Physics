// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { DRONE_ROUTE, generateRoute } from '../../../lib/data/droneRoute';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { mathSourceText } from '../../../test-inline-math';
import { EXACT_TEXT } from '../../../test-exact-text';
import DroneProfiles, { buildProfiles } from './DroneProfiles';
import { chartStep } from './droneScene';
import { sampleAt } from './routeEdit';
import { decimate, dwellWindows } from './routeSeries';

// Counts the plotter's renders: the marker must follow t without redrawing any plot.
const { plotSpy } = vi.hoisted(() => ({ plotSpy: vi.fn() }));
vi.mock('../../lab/SvgPlot', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lab/SvgPlot')>();
  plotSpy.mockImplementation(actual.default);
  return { ...actual, default: plotSpy };
});

const SAMPLES = generateRoute(DRONE_ROUTE);
const DURATION = SAMPLES[SAMPLES.length - 1].t;
/** Inside the 20 s stop at A (600, 200): the drone hovers at rest there. */
const T_AT_A = 70;
/** Between two samples while cruising on leg 2, where the laboratory interpolates. */
const T_BETWEEN = 116.23;
const TITLES = [
  'Posición: x(t) y y(t)',
  'Velocidad: $v_x(t)$, $v_y(t)$ y |v|(t)',
  'Aceleración: $a_x(t)$, $a_y(t)$ y |a|(t)',
  'Distancia recorrida frente a |Δr| desde el depósito',
];

const plain = (text: string) => text.replace(/\s/g, ' ');
const markerX = (element: Element) =>
  Number(/translate\(([-\d.]+)/.exec(element.getAttribute('transform') ?? '')?.[1]);

const markers = (root: HTMLElement) => Array.from(root.querySelectorAll('[data-profile-marker]'));
const readings = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('dl[data-profile-reading]'));

const renderProfiles = (t: number, timeDecimals?: number) =>
  render(
    <DroneProfiles samples={SAMPLES} definition={DRONE_ROUTE} t={t} timeDecimals={timeDecimals} />,
  );

describe('buildProfiles', () => {
  test('builds the four charts with their series, units and y ranges from the limits', () => {
    const { charts, xDomain, times } = buildProfiles(SAMPLES, DRONE_ROUTE);

    expect(charts.map((chart) => chart.id)).toEqual([
      'posicion',
      'velocidad',
      'aceleracion',
      'distancia',
    ]);
    expect(charts.map((chart) => chart.title)).toEqual(TITLES);
    expect(charts.map((chart) => chart.series.map((s) => s.label))).toEqual([
      ['x', 'y'],
      ['$v_x$', '$v_y$', '|v|'],
      ['$a_x$', '$a_y$', '|a|'],
      ['Distancia recorrida', '|Δr|'],
    ]);
    expect(charts[3].readingLabels).toEqual(['Distancia', '|Δr|']);
    expect(charts.map((chart) => chart.unit)).toEqual(['m', 'm/s', 'm/s²', 'm']);
    expect(charts[0].yDomain).toEqual({ min: 0, max: 1500 });
    expect(charts[1].yDomain).toEqual({ min: -11.5, max: 11.5 });
    expect(charts[2].yDomain?.max).toBeCloseTo(2.875, 9);
    expect(charts[3].yDomain).toBeUndefined();
    expect(xDomain).toEqual({ min: 0, max: 400 });
    expect(times).toHaveLength(SAMPLES.length);
  });

  test('velocity and acceleration span ±1,15 times their limits, whatever the samples', () => {
    const { charts } = buildProfiles(SAMPLES, { ...DRONE_ROUTE, vMax: 15, aMax: 5 });

    expect(charts[1].yDomain?.max).toBeCloseTo(17.25, 9);
    expect(charts[2].yDomain?.min).toBeCloseTo(-5.75, 9);
  });

  test('decimates the curves to one sample in chartStep but keeps every value for the reading', () => {
    const expected = decimate(SAMPLES, chartStep(SAMPLES.length)).length;
    const { charts } = buildProfiles(SAMPLES, DRONE_ROUTE);

    for (const chart of charts) {
      for (const series of chart.series) {
        expect(series.points).toHaveLength(expected);
        expect(series.points[series.points.length - 1].x).toBe(DURATION);
      }
      for (const values of chart.values) expect(values).toHaveLength(SAMPLES.length);
    }
    expect(charts[0].values[0][SAMPLES.length - 1]).toBeCloseTo(0, 6);
    expect(charts[3].values[0][SAMPLES.length - 1]).toBeGreaterThan(3000);
  });

  test('the bands are the delivery windows and the names say what each chart shows', () => {
    const { bands, charts } = buildProfiles(SAMPLES, DRONE_ROUTE);

    expect(bands).toEqual(
      dwellWindows(SAMPLES, DRONE_ROUTE.stops).map((band) => ({ ...band, labelAt: 'bottom' })),
    );
    expect(bands.map((band) => band.label)).toEqual(['A', 'B', 'C']);
    expect(charts[0].ariaLabel).toContain('entregas en A, B, C');
    expect(charts[1].ariaLabel).toContain('v sub máx = 10,0 m/s');
    expect(charts[2].ariaLabel).toContain('a sub máx = 2,5 m/s²');
    expect(charts[3].ariaLabel).toMatch(/crece hasta 3 \d{3} m/);
  });
});

describe('DroneProfiles', () => {
  afterEach(() => {
    cleanup();
    // The reset reloads the store from storage, so the storage is cleared first.
    localStorage.clear();
    resetSettingsForTests();
    plotSpy.mockClear();
  });

  test('draws four named charts with titles, axes with units, legends and the delivery bands', () => {
    renderProfiles(T_AT_A);
    const root = screen.getByTestId('drone-profiles');

    for (const title of TITLES) expect(mathSourceText(root)).toContain(title);
    expect(within(root).getAllByRole('img')).toHaveLength(4);
    expect(screen.getByRole('img', { name: /^Posición del dron frente al tiempo/ })).toBeVisible();
    expect(screen.getByRole('img', { name: /^Velocidad del dron/ })).toBeVisible();
    expect(screen.getByRole('img', { name: /^Aceleración del dron/ })).toBeVisible();
    expect(screen.getByRole('img', { name: /^Distancia recorrida y módulo/ })).toBeVisible();
    expect(within(root).getAllByText('t (s)')).toHaveLength(4);
    for (const axis of ['Posición (m)', 'Velocidad (m/s)', 'Aceleración (m/s²)', 'Longitud (m)']) {
      expect(within(root).getByText(axis)).toBeInTheDocument();
    }
    expect(
      within(root).getAllByRole('toolbar', { name: 'Leyenda: realzar una serie' }),
    ).toHaveLength(4);
    for (const stop of ['A', 'B', 'C']) {
      expect(root.querySelectorAll(`rect[data-band="${stop}"]`)).toHaveLength(4);
    }
  });

  // toHaveTextContent collapses every whitespace, U+202F included, so these expectations use spaces.
  test('puts a marker line labelled with t in every plot, with one decimal like the timeline', () => {
    renderProfiles(T_AT_A);
    const root = screen.getByTestId('drone-profiles');

    const marks = markers(root);
    expect(marks).toHaveLength(4);
    for (const mark of marks) {
      expect(mark.querySelector('line')).toBeInTheDocument();
      expect(mark.querySelector('text')).toHaveTextContent('t = 70,0 s');
      expect(mark.querySelector('rect')).toBeNull();
    }
  });

  test('reads every series at t under its plot, as the laboratory does, in text rows', () => {
    renderProfiles(T_AT_A);
    const root = screen.getByTestId('drone-profiles');

    const rows = readings(root);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('t 70,0 s');
    expect(rows[0]).toHaveTextContent('x 600,00 m');
    expect(rows[0]).toHaveTextContent('y 200,00 m');
    expect(within(rows[1] as HTMLElement).getAllByText('0,00 m/s', EXACT_TEXT)).toHaveLength(3);
    expect(rows[3]).toHaveTextContent('Distancia');
    expect(rows[3].querySelectorAll('dd')).toHaveLength(3);
    // No live region: the laboratory's announcer already speaks.
    expect(root.querySelector('[aria-live]')).toBeNull();
  });

  test('interpolates between samples exactly as the laboratory readouts', () => {
    renderProfiles(T_BETWEEN);
    const root = screen.getByTestId('drone-profiles');
    const expected = sampleAt(SAMPLES, T_BETWEEN);

    const [position, velocity] = readings(root);
    expect(position).toHaveTextContent(`x ${expected.x.toFixed(2).replace('.', ',')} m`);
    expect(plain(mathSourceText(velocity))).toContain(
      `$v_x$ ${expected.vx.toFixed(2).replace('.', ',')} m/s`,
    );
  });

  test('the marker moves with t, clamped to the sampled flight, and the values follow the decimals setting', () => {
    const { rerender } = renderProfiles(0);
    const root = screen.getByTestId('drone-profiles');
    const atStart = markerX(markers(root)[0]);

    rerender(<DroneProfiles samples={SAMPLES} definition={DRONE_ROUTE} t={200} />);
    const atMiddle = markerX(markers(root)[0]);
    rerender(<DroneProfiles samples={SAMPLES} definition={DRONE_ROUTE} t={10_000} />);
    act(() => setSettings({ decimals: 1 }));

    expect(atMiddle).toBeGreaterThan(atStart);
    expect(markers(root)[0]).toHaveAttribute('data-marker-t', String(DURATION));
    expect(readings(root)[0]).toHaveTextContent('x 0,0 m');
    expect(markers(root)[0].querySelector('text')).toHaveTextContent(
      `t = ${DURATION.toFixed(1).replace('.', ',')} s`,
    );
  });

  test('timeDecimals sets how t is printed', () => {
    renderProfiles(T_BETWEEN, 2);
    const root = screen.getByTestId('drone-profiles');

    expect(markers(root)[0].querySelector('text')).toHaveTextContent('t = 116,23 s');
    expect(readings(root)[0]).toHaveTextContent('t 116,23 s');
  });

  test('the t label flips to the left of the line near the right edge of the plot', () => {
    const { rerender } = renderProfiles(T_AT_A);
    const root = screen.getByTestId('drone-profiles');
    const anchor = () => markers(root)[0].querySelector('text')?.getAttribute('text-anchor');
    const early = anchor();

    rerender(<DroneProfiles samples={SAMPLES} definition={DRONE_ROUTE} t={DURATION} />);

    expect(early).toBe('start');
    expect(anchor()).toBe('end');
  });

  test('a change of t re-renders the markers and readings only, never the plots', () => {
    const { rerender } = renderProfiles(10);
    const root = screen.getByTestId('drone-profiles');
    const paths = () =>
      Array.from(root.querySelectorAll('path[data-series]')).map((p) => p.getAttribute('d'));
    const before = paths();
    expect(plotSpy).toHaveBeenCalledTimes(4);

    rerender(<DroneProfiles samples={SAMPLES} definition={DRONE_ROUTE} t={20} />);
    rerender(<DroneProfiles samples={SAMPLES} definition={DRONE_ROUTE} t={30} />);

    expect(plotSpy).toHaveBeenCalledTimes(4);
    expect(paths()).toEqual(before);
    for (const mark of markers(root)) {
      expect(mark.querySelector('text')).toHaveTextContent('t = 30,0 s');
    }
    expect(readings(root)[0]).toHaveTextContent('t 30,0 s');
  });

  test('a new route rebuilds the plots', () => {
    const { rerender } = renderProfiles(10);
    const edited = { ...DRONE_ROUTE, vMax: 5 };

    rerender(<DroneProfiles samples={generateRoute(edited)} definition={edited} t={10} />);

    expect(plotSpy).toHaveBeenCalledTimes(8);
  });
});
