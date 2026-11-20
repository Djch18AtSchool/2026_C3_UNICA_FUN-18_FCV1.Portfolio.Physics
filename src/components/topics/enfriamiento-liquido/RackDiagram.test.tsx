// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { mathTextToString } from '../../../lib/mathNotation';
import { plexViolations } from '../../../test-glyphs';
import { coolingScene, INITIAL_COOLING_STATE, type CoolingLabState } from './coolingScene';
import { rackSummary } from './coolingLabReadings';
import RackDiagram, { RACK_HEIGHT } from './RackDiagram';

const sceneOf = (state: CoolingLabState) => {
  const scene = coolingScene(state);
  if (!scene) throw new Error('the scene should be valid');
  return scene;
};
const REFERENCE = sceneOf(INITIAL_COOLING_STATE);
const drawing = () => screen.getByTestId('rack-diagram');
const bars = (container: HTMLElement) =>
  [...container.querySelectorAll<SVGRectElement>('[data-server]')].map((bar) => ({
    port: Number(bar.dataset.server),
    width: Number(bar.getAttribute('width')),
    isWorst: bar.hasAttribute('data-worst'),
  }));

describe('RackDiagram: the rack, its two manifolds and one bar per server', () => {
  afterEach(cleanup);

  test('one image named by the rack in words, at a fixed height', () => {
    render(<RackDiagram scene={REFERENCE} failure={null} />);

    expect(drawing()).toHaveAttribute('role', 'img');
    expect(drawing()).toHaveAttribute('aria-label', mathTextToString(rackSummary(REFERENCE)));
    expect(drawing()).toHaveAttribute('height', String(RACK_HEIGHT));
    expect(drawing().getAttribute('viewBox')).toMatch(new RegExp(` ${RACK_HEIGHT}$`));
  });

  test('a bar per server, its length proportional to its flow; the farthest marked as the worst', () => {
    const { container } = render(<RackDiagram scene={REFERENCE} failure={null} />);
    const drawn = bars(container);

    expect(drawn).toHaveLength(24);
    const [first, last] = [drawn.find((b) => b.port === 1)!, drawn.find((b) => b.port === 24)!];
    expect(last.width / first.width).toBeCloseTo(REFERENCE.flows[23] / REFERENCE.flows[0], 6);
    expect(drawn.filter((bar) => bar.isWorst).map((bar) => bar.port)).toEqual([24]);
    expect(within(drawing()).getByText('24')).toBeInTheDocument();
  });

  test('the minimum is one dashed line across the rows, left of every bar’s end while they reach it', () => {
    const { container } = render(<RackDiagram scene={REFERENCE} failure={null} />);
    const line = container.querySelector('[data-minimum]')!;
    const x = Number(line.getAttribute('x1'));
    const ends = [...container.querySelectorAll('[data-server]')].map(
      (bar) => Number(bar.getAttribute('x')) + Number(bar.getAttribute('width')),
    );

    expect(line.getAttribute('stroke-dasharray')).toBeTruthy();
    expect(ends.every((end) => end > x)).toBe(true);
  });

  test('direct return leaves at the bottom; reverse return at the top', () => {
    const { container, rerender } = render(<RackDiagram scene={REFERENCE} failure={null} />);
    expect(container.querySelector('[data-outlet]')).toHaveAttribute('data-outlet', 'abajo');

    const reverse = sceneOf({ ...INITIAL_COOLING_STATE, layout: 'invertido' });
    rerender(<RackDiagram scene={reverse} failure={null} />);
    expect(container.querySelector('[data-outlet]')).toHaveAttribute('data-outlet', 'arriba');
    expect(
      bars(container)
        .filter((bar) => bar.isWorst)
        .map((bar) => bar.port),
    ).toEqual([12]);
  });

  test('the chips read the scene; a split that does not converge says so first, and is announced', () => {
    const { rerender } = render(<RackDiagram scene={REFERENCE} failure={null} />);
    const chips = () =>
      within(screen.getByRole('list', { name: 'Estado del circuito' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent);

    expect(chips()).toEqual([
      'El servidor más lejano alcanza el objetivo de diseño de OCP (1,5 L/min por kW)',
      'Cada UQD04 pasa de su caudal nominal',
    ]);
    expect(screen.getByRole('status')).toHaveTextContent('');

    rerender(<RackDiagram scene={REFERENCE} failure="reparto" />);
    expect(chips()[0]).toBe('El reparto no converge con estos valores');
    expect(screen.getByRole('status')).toHaveTextContent(
      'El reparto no converge con estos valores: el dibujo y las lecturas son los del último cálculo válido.',
    );
  });

  test('a short worst server ends its bar before the minimum', () => {
    const short = sceneOf({ ...INITIAL_COOLING_STATE, pumpFlow: 150 });
    const { container } = render(<RackDiagram scene={short} failure={null} />);
    const x = Number(container.querySelector('[data-minimum]')!.getAttribute('x1'));
    const worst = container.querySelector('[data-worst]')!;

    expect(Number(worst.getAttribute('x')) + Number(worst.getAttribute('width'))).toBeLessThan(x);
  });

  test('44 servers and a single one still draw a visible bar each, with every glyph in Plex', () => {
    for (const servers of [44, 1]) {
      const { container } = render(
        <RackDiagram scene={sceneOf({ ...INITIAL_COOLING_STATE, servers })} failure={null} />,
      );
      const heights = [...container.querySelectorAll('[data-server]')].map((bar) =>
        Number(bar.getAttribute('height')),
      );
      expect(heights).toHaveLength(servers);
      expect(Math.min(...heights)).toBeGreaterThanOrEqual(2);
      expect(plexViolations(container)).toEqual([]);
      cleanup();
    }
  });
});
