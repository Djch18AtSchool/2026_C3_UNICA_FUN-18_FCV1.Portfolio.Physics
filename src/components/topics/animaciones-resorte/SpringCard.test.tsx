// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { createFrameStore } from '../../lab/frameStore';
import { plexViolations } from '../../../test-glyphs';
import SpringCard from './SpringCard';
import { BEZIER_COLOR, REGIME_COLORS } from './springPlots';
import { bezierAt, buildRun, MARKS, springAt, type SpringRun } from './springScene';

const MOTION_DEFAULT = { k: 100, b: 10, m: 1 };

function renderScene(
  run: SpringRun,
  t: number,
  options: { showComparison?: boolean; showBand?: boolean } = {},
) {
  const frame = createFrameStore(t);
  const view = render(
    <SpringCard
      run={run}
      frame={frame}
      t={t}
      showComparison={options.showComparison ?? true}
      showBand={options.showBand ?? true}
    />,
  );
  return { ...view, frame };
}

const card = (lane: 'spring' | 'bezier') => screen.getByTestId(`card-${lane}`);
const xOf = (lane: 'spring' | 'bezier') => Number(card(lane).getAttribute('data-x'));
const sceneHeight = () => Number(screen.getByTestId('spring-scene').getAttribute('height'));

describe('SpringCard, the lab’s canvas', () => {
  afterEach(cleanup);

  test('two lanes, the spring’s regime chip and the curve’s duration, with Plex glyphs only', () => {
    renderScene(buildRun(MOTION_DEFAULT, []), 0);

    expect(screen.getByText('Resorte')).toBeInTheDocument();
    expect(screen.getByText('Curva de duración fija')).toBeInTheDocument();
    const chip = screen.getByTestId('spring-regime');
    expect(chip).toHaveAttribute('data-regime', 'subamortiguado');
    expect(chip).toHaveTextContent(/^Subamortiguado/);
    expect(screen.getByTestId('comparison-duration')).toHaveTextContent(/0,81\ss$/);
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('the regime chip follows b: critical, overdamped and «Sin amortiguar» for b = 0', () => {
    const cases = [
      [{ k: 100, b: 20, m: 1 }, 'critico', /^Crítico/],
      [{ k: 100, b: 40, m: 1 }, 'sobreamortiguado', /^Sobreamortiguado/],
      [{ k: 100, b: 0, m: 1 }, 'sin-amortiguar', /^Sin amortiguar/],
    ] as const;
    for (const [params, regime, text] of cases) {
      const { unmount } = renderScene(buildRun(params, []), 0);
      expect(screen.getByTestId('spring-regime')).toHaveAttribute('data-regime', regime);
      expect(screen.getByTestId('spring-regime')).toHaveTextContent(text);
      expect(card('spring').querySelector('rect')).toHaveAttribute('fill', REGIME_COLORS[regime]);
      unmount();
    }
  });

  test('each card stands at its x at the live time, and follows the frame store', () => {
    const run = buildRun(MOTION_DEFAULT, [0.2]);
    const { frame } = renderScene(run, 0.1);

    expect(xOf('spring')).toBeCloseTo(springAt(run, 0.1).x, 2);
    expect(xOf('bezier')).toBeCloseTo(bezierAt(run, 0.1).x, 2);
    expect(card('bezier').querySelector('rect')).toHaveAttribute('fill', BEZIER_COLOR);

    act(() => frame.set(0.5));

    expect(xOf('spring')).toBeCloseTo(springAt(run, 0.5).x, 2);
    expect(xOf('bezier')).toBeCloseTo(bezierAt(run, 0.5).x, 2);
  });

  test('the ghost, the band and «destino» mark the current target, which a press swaps', () => {
    const run = buildRun(MOTION_DEFAULT, [0.2]);
    const { frame } = renderScene(run, 0.1);
    const targetOf = () => Number(screen.getByTestId('target-label').getAttribute('data-target'));

    expect(targetOf()).toBe(MARKS.to);
    expect(document.querySelectorAll('[data-ghost]')).toHaveLength(2);
    expect(document.querySelector('[data-band="reposo"]')).toHaveAttribute(
      'data-target',
      String(MARKS.to),
    );

    act(() => frame.set(0.3));

    expect(targetOf()).toBe(MARKS.from);
    const markText = (mark: number) =>
      document.querySelector(`[data-mark="${mark}"] text`)?.textContent?.replaceAll('\u202f', ' ');
    expect(markText(MARKS.from)).toBe('100 px');
    expect(markText(MARKS.to)).toBe('1 000 px');
  });

  // The 100 px guide crossed «Curva de duración fija» (360 px) and «T = 0,81 s» (1 280 px).
  test('the marks’ guides and the band run down each lane’s card and rail, leaving the lane titles clear', () => {
    // After the press the target is 100 px, under the titles: the band must leave them clear too.
    renderScene(buildRun(MOTION_DEFAULT, [0.2]), 0.3);
    const title = screen.getByText('Curva de duración fija');
    const chip = screen.getByTestId('comparison-duration').querySelector('rect') as SVGRectElement;
    const header = {
      top: Number(title.getAttribute('y')) - 13,
      bottom: Number(chip.getAttribute('y')) + Number(chip.getAttribute('height')) + 4,
    };
    const cardCentre = (lane: 'spring' | 'bezier') =>
      Number(/translate\([\d.]+ ([\d.]+)\)/.exec(card(lane).getAttribute('transform') ?? '')?.[1]);

    for (const mark of [MARKS.from, MARKS.to]) {
      const guides = [
        ...document.querySelectorAll(`[data-mark="${mark}"] line[stroke-dasharray]`),
      ].map((line) => [Number(line.getAttribute('y1')), Number(line.getAttribute('y2'))]);

      for (const [y1, y2] of guides) {
        expect(y2 <= header.top || y1 >= header.bottom, `${mark}: ${y1}–${y2}`).toBe(true);
      }
      for (const lane of ['spring', 'bezier'] as const) {
        const y = cardCentre(lane);
        expect(guides.some(([y1, y2]) => y1 < y && y < y2), `${mark} en ${lane}`).toBe(true);
      }
    }
    const bands = [...document.querySelectorAll('[data-band="reposo"]')].map((rect) => [
      Number(rect.getAttribute('y')),
      Number(rect.getAttribute('y')) + Number(rect.getAttribute('height')),
    ]);
    expect(bands.length).toBeGreaterThan(0);
    for (const [y1, y2] of bands) {
      expect(y2 <= header.top || y1 >= header.bottom, `banda: ${y1}–${y2}`).toBe(true);
    }
  });

  test('the drawer’s settings hide the curve’s lane (a shorter canvas) and the band', () => {
    renderScene(buildRun(MOTION_DEFAULT, []), 0);
    const tall = sceneHeight();
    cleanup();

    renderScene(buildRun(MOTION_DEFAULT, []), 0, { showComparison: false, showBand: false });

    expect(sceneHeight()).toBeLessThan(tall);
    expect(screen.queryByTestId('card-bezier')).toBeNull();
    expect(screen.queryByText('Curva de duración fija')).toBeNull();
    expect(document.querySelector('[data-band]')).toBeNull();
  });

  test('a card past the drawn track stays on its edge, marked as clamped', () => {
    // Undamped and pressed at the far end of its swing (1 900 px): half a period later it is
    // 1 800 px past the start, its new target.
    const run = buildRun({ k: 100, b: 0, m: 1 }, [Math.PI / 10]);
    const far = (2 * Math.PI) / 10;
    renderScene(run, far);

    expect(springAt(run, far).x).toBeLessThan(MARKS.from - 400);
    expect(card('spring')).toHaveAttribute('data-clamped', 'left');
    expect(card('bezier')).not.toHaveAttribute('data-clamped');
  });

  test('the drawing has room for the plain step’s overshoot, also without damping', () => {
    renderScene(buildRun({ k: 100, b: 0, m: 1 }, []), Math.PI / 10);

    expect(xOf('spring')).toBeCloseTo(2 * MARKS.to - MARKS.from, 6);
    expect(card('spring')).not.toHaveAttribute('data-clamped');
  });

  test('the canvas takes the focus, from Tab or a click, says its shortcuts and shows its ring', () => {
    renderScene(buildRun(MOTION_DEFAULT, []), 0);
    const canvas = screen.getByTestId('spring-canvas');

    expect(canvas).toHaveAttribute('tabindex', '0');
    expect(canvas).toHaveAttribute('role', 'group');
    expect(canvas).toHaveAccessibleName(/Atajos: Espacio o K reproduce y pausa; I interrumpe/);
    expect(canvas).toHaveAttribute('aria-keyshortcuts', 'Space K I R , .');
    expect(canvas.className).toMatch(/focus-visible:outline-2/);

    fireEvent.pointerDown(canvas.querySelector('svg') as Element);

    expect(canvas).toHaveFocus();
  });

  test('describes both cards at the settled time for screen readers', () => {
    renderScene(buildRun(MOTION_DEFAULT, []), 0);

    // formatNumber's U+202F, between thousands and before the unit, read as plain spaces.
    const name = screen.getByRole('img').getAttribute('aria-label')?.replaceAll(' ', ' ');
    expect(name).toBe(
      'Dos tarjetas van de 100 px a 1 000 px. El resorte, subamortiguado, está en 100 px, con destino 1 000 px; la curva de duración fija, en 100 px.',
    );
  });
});
