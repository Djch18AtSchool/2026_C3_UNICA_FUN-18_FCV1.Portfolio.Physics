// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { svgText } from '../../../test-svg-text';
import { BREAKDOWN_ROWS } from '../../../lib/data/liquidCoolingBreakdown';
import { TICK_FONT_SIZE } from '../../charts/chartTheme';
import { textWidth } from '../../lab/plotScales';
import BranchFlowFigure from './BranchFlowFigure';
import LossBreakdownFigure from './LossBreakdownFigure';
import VelocityAreaFigure from './VelocityAreaFigure';

const legends = () => screen.getAllByRole('toolbar', { name: 'Leyenda: realzar una serie' });

/** A ResizeObserver that reports every observed element at `width` px, as on a phone. */
function stubWidth(width: number): void {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe(element: Element) {
        this.callback(
          [{ target: element, contentRect: { width } } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
      unobserve() {}
    },
  );
}

describe('VelocityAreaFigure: continuity as v against A (step 1)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('the axes say their magnitude and unit; the area axis says it is logarithmic', () => {
    render(<VelocityAreaFigure />);

    expect(
      screen.getByText(svgText('Área de la sección A (mm², escala logarítmica)')),
    ).toBeInTheDocument();
    expect(screen.getByText(svgText('Velocidad media v (m/s)'))).toBeInTheDocument();
    expect(screen.getByText(svgText('1 000'))).toBeInTheDocument();
  });

  test('the hyperbolas are lines and the sections are numbered points, keyed under the chart', () => {
    const { container } = render(<VelocityAreaFigure />);
    const key = screen.getByRole('list', { name: 'Secciones del circuito' });

    expect(container.querySelectorAll('path[data-series="hiperbolas"]')).toHaveLength(3);
    expect(container.querySelectorAll('circle[data-series="secciones"]')).toHaveLength(6);
    expect(within(key).getAllByRole('listitem')).toHaveLength(6);
    expect(mathSourceText(key)).toMatch(/Boca del UQD04: \$A\$ = 41,2\smm², \$v\$ = 2,91\sm\/s/);
    // A symbol, its «=» and its value never break apart: two unbreakable groups per section.
    expect(key.querySelectorAll('.whitespace-nowrap')).toHaveLength(12);
    const text = mathSourceText(legends()[0]);
    expect(text).toContain('Hipérbola $v = Q/A$ de cada caudal');
    expect(text).toContain('Sección del circuito (punto)');
  });

  test('each hyperbola is labelled with its flow', () => {
    render(<VelocityAreaFigure />);

    expect(screen.getByText(svgText('QCDU = 23 L/s'))).toBeInTheDocument();
    expect(screen.getByText(svgText('Qrack = 172,5 L/min'))).toBeInTheDocument();
    expect(screen.getByText(svgText('q = 7,19 L/min'))).toBeInTheDocument();
    expect(screen.queryByTestId('velocity-area-flows')).toBeNull();
  });

  test('on a phone, with no room for those labels, a line under the chart names the flows', () => {
    stubWidth(264);
    render(<VelocityAreaFigure />);

    expect(screen.getByText(svgText('Área A (mm², escala log.)'))).toBeInTheDocument();
    expect(
      mathSourceText(screen.getByTestId('velocity-area-flows')).replace(/\s+/g, ' '),
    ).toContain('Hipérbolas, de izquierda a derecha: $q$ = 7,19 L/min');
  });

  test('every character outside KaTeX is one IBM Plex draws', () => {
    const { container } = render(<VelocityAreaFigure />);

    expect(plexViolations(container)).toEqual([]);
  });
});

describe('BranchFlowFigure: the flow each server gets (step 4) against Shahi et al.', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('ports are whole numbers on the axis, and the flow ticks need no third decimal', () => {
    stubWidth(264);
    render(<BranchFlowFigure />);
    const bench = within(screen.getByTestId('branch-flow-bench'));
    const model = within(screen.getByTestId('branch-flow-model'));

    for (const port of ['1', '2', '3', '4', '5', '6']) {
      expect(bench.getByText(svgText(port))).toBeInTheDocument();
    }
    expect(bench.queryByText(svgText('2,5'))).toBeNull();
    expect(model.getByText(svgText('24'))).toBeInTheDocument();
    expect(model.queryAllByText(svgText(/^7,\d{3}$/))).toHaveLength(0);
  });

  test('both panels say their axes with units', () => {
    render(<BranchFlowFigure />);

    expect(screen.getAllByText(svgText('Puerto i (1 = abajo)'))).toHaveLength(2);
    expect(screen.getAllByText(svgText('Caudal Qi (L/min)'))).toHaveLength(2);
  });

  test('the model is drawn as lines, the measurement as points, and the legend says which', () => {
    const { container } = render(<BranchFlowFigure />);
    const [model, bench] = legends().map((legend) => mathSourceText(legend));

    expect(container.querySelectorAll('path[data-series^="placa-"]')).toHaveLength(2);
    expect(container.querySelectorAll('path[data-series^="sin-placa-"]')).toHaveLength(2);
    expect(container.querySelectorAll('path[data-series="shahi-fnm"]')).toHaveLength(1);
    expect(container.querySelectorAll('circle[data-series="shahi-medicion"]')).toHaveLength(6);
    expect(container.querySelectorAll('path[data-series="shahi-medicion"]')).toHaveLength(0);
    expect(model).toContain('Con placa fría, retorno directo');
    expect(model).toContain('Sin placa fría, retorno invertido');
    expect(bench).toContain('Modelo de red de Shahi et al.: línea');
    expect(bench).toContain('Medición de Shahi et al.: puntos, lectura aproximada');
  });

  test('colour says plate or no plate, never series order; the bench has no plates either', () => {
    const { container } = render(<BranchFlowFigure />);
    const stroke = (id: string) =>
      container.querySelector(`[data-series="${id}"]`)?.getAttribute('stroke');

    expect(stroke('placa-directo')).toBe('var(--fg)');
    expect(stroke('placa-invertido')).toBe('var(--fg)');
    expect(stroke('sin-placa-directo')).toBe('var(--chart-4)');
    expect(stroke('shahi-fnm')).toBe('var(--chart-4)');
    expect(container.querySelector('[data-series="placa-invertido"]')).toHaveAttribute(
      'stroke-dasharray',
    );
  });

  test('every character outside KaTeX is one IBM Plex draws', () => {
    const { container } = render(<BranchFlowFigure />);

    expect(plexViolations(container)).toEqual([]);
  });
});

describe('LossBreakdownFigure: where the pressure goes (step 3)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('my losses are bars, GF’s published values are points, and the legend says which', () => {
    const { container } = render(<LossBreakdownFigure />);
    const text = mathSourceText(legends()[0]);

    // Seven groups modelled (not the big QD nor the valves); eight published (not the rack hoses).
    expect(container.querySelectorAll('rect[data-series="calculo"]')).toHaveLength(7);
    expect(container.querySelectorAll('circle[data-series="gf"]')).toHaveLength(8);
    expect(text).toContain('Este cálculo (barras)');
    expect(text).toContain('GF, publicado con Sinetz (puntos)');
  });

  test('the axis is the pressure lost, in kPa, and every group of table 13.4 is named', () => {
    render(<LossBreakdownFigure />);

    expect(screen.getByText(svgText('Pérdida de presión (kPa)'))).toBeInTheDocument();
    for (const { label } of BREAKDOWN_ROWS) {
      expect(screen.getByText(svgText(label))).toBeInTheDocument();
    }
    expect(screen.getAllByText(svgText('sin modelar'))).toHaveLength(2);
  });

  test('the bars are to scale: the plates’ is 120/30,2 times the couplings’', () => {
    const { container } = render(<LossBreakdownFigure />);
    const width = (id: string) =>
      Number(container.querySelector(`rect[data-group="${id}"]`)?.getAttribute('width'));

    expect(width('placas-frias') / width('qd-pequenos')).toBeCloseTo(120 / 30.2235, 2);
  });

  test('a note says the plates and couplings take 84 % of my loss and 86 % of GF’s', () => {
    render(<LossBreakdownFigure />);

    expect(mathSourceText(screen.getByTestId('loss-breakdown-note')).replace(/\s+/g, ' ')).toBe(
      'Las placas frías y los conectores UQD04 se llevan el 84 % de mi pérdida y el 86 % de la de GF.',
    );
  });

  test.each([720, 264])('at %i px every group name fits inside the drawing', (width) => {
    stubWidth(width);
    const { container } = render(<LossBreakdownFigure />);
    const [, , viewWidth] = (
      container.querySelector('svg[role="img"]')?.getAttribute('viewBox') ?? ''
    )
      .split(' ')
      .map(Number);

    for (const { label } of BREAKDOWN_ROWS) {
      expect(textWidth(label, TICK_FONT_SIZE) + 16, label).toBeLessThanOrEqual(viewWidth);
    }
    expect(plexViolations(container)).toEqual([]);
  });
});

describe('LossBreakdownFigure: a group I do not model', () => {
  afterEach(cleanup);

  test('«sin modelar» starts past GF’s point, so the point never covers the words', () => {
    const { container } = render(<LossBreakdownFigure />);
    const row = container.querySelector('[data-row="qd-grande"]');
    const dot = row?.querySelector('circle[data-series="gf"]');
    const note = [...(row?.querySelectorAll('text') ?? [])].find(
      (t) => t.textContent === 'sin modelar',
    );

    expect(Number(note?.getAttribute('x'))).toBeGreaterThan(Number(dot?.getAttribute('cx')) + 5);
  });
});
