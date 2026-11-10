// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createFrameStore } from '../../lab/frameStore';
import { monoTextWidth } from '../../lab/plotScales';
import { stubResizeObserver, viewBoxOf } from '../../lab/svgPlotTestKit';
import BounceScene, { type BounceSceneProps } from './BounceScene';

const NOTE_SIZE = 11;
const MARGIN = { left: 44, right: 12 };
/** As BounceLab builds it: no-break spaces hold "Δt = 1/60 s" and "× 4" together. */
const ENGINE_SUBTITLE = 'Δt = 1/60 s × 4';

const PROPS: BounceSceneProps = {
  h0: 2.54,
  top: 3,
  ball: 'tenis',
  ideal: { y: 2.54, isResting: false },
  engine: { y: 0, isResting: true },
  live: {
    frame: createFrameStore(0),
    ballsAt: () => ({ ideal: { y: 2.54, isResting: false }, engine: { y: 0, isResting: true } }),
  },
  engineSubtitle: ENGINE_SUBTITLE,
  decimals: 2,
  onH0Change: () => {},
  onH0DragPhase: () => {},
};

/** Each subtitle: its lines and the x its column is centred on. */
function subtitles(): { x: number; lines: string[] }[] {
  return [...document.querySelectorAll('[data-subtitle]')].map((group) => ({
    x: Number(group.getAttribute('data-x')),
    lines: [...group.querySelectorAll('text')].map(
      (text) => text.getAttribute('data-notation') ?? text.textContent ?? '',
    ),
  }));
}

/** The horizontal extent of a centred monospace line. */
function extent(x: number, line: string): [number, number] {
  const half = monoTextWidth(line, NOTE_SIZE) / 2;
  return [x - half, x + half];
}

describe('BounceScene column subtitles', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('on a wide canvas each subtitle is one line under its column', () => {
    stubResizeObserver(720);
    render(<BounceScene {...PROPS} />);

    expect(subtitles().map(({ lines }) => lines)).toEqual([['eventos exactos'], [ENGINE_SUBTITLE]]);
  });

  test.each([230, 250, 290, 330])(
    'at %i px the two subtitles wrap inside their own columns and never overlap',
    (width) => {
      stubResizeObserver(width);
      render(<BounceScene {...PROPS} />);
      const [ideal, engine] = subtitles();
      const divider = (ideal.x + engine.x) / 2;

      for (const line of ideal.lines) {
        expect(extent(ideal.x, line)[0]).toBeGreaterThanOrEqual(MARGIN.left);
        expect(extent(ideal.x, line)[1]).toBeLessThan(divider);
      }
      for (const line of engine.lines) {
        expect(extent(engine.x, line)[0]).toBeGreaterThan(divider);
        expect(extent(engine.x, line)[1]).toBeLessThanOrEqual(width - MARGIN.right);
      }
    },
  );

  test('a wrapped subtitle breaks only where a normal space allows it', () => {
    stubResizeObserver(250);
    render(<BounceScene {...PROPS} />);

    expect(subtitles().map(({ lines }) => lines)).toEqual([
      ['eventos', 'exactos'],
      ['Δt = 1/60 s', '× 4'],
    ]);
  });

  test('a wrapped subtitle pushes the status lines and the canvas down by one line', () => {
    stubResizeObserver(400);
    const wide = render(<BounceScene {...PROPS} />);
    const wideHeight = viewBoxOf(screen.getByTestId('bounce-scene'))[3];
    const wideStatus = Number(document.querySelector('[data-status]')?.getAttribute('y'));
    wide.unmount();

    stubResizeObserver(250);
    render(<BounceScene {...PROPS} />);
    const status = document.querySelector('[data-status]');
    const lastLine = [...document.querySelectorAll('[data-subtitle] text')].at(-1);

    // 300 px tall at any width; the wrap adds one 14 px line on the phone.
    expect(wideHeight).toBe(300);
    expect(viewBoxOf(screen.getByTestId('bounce-scene'))[3]).toBe(300 + 14);
    expect(status).toHaveTextContent('en reposo');
    expect(Number(status?.getAttribute('y')) - wideStatus).toBe(14);
    expect(lastLine).toBeDefined();
  });
});

describe('BounceScene before it measures its width (the server, and the lab stage on hydration)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('draws the scene at the width it is capped to, in a box as tall as the drawing', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    render(<BounceScene {...PROPS} />);
    const svg = screen.getByTestId('bounce-scene');

    expect(viewBoxOf(svg)).toEqual([0, 0, 400, 300]);
    expect(svg.getAttribute('height')).toBe('300');
    expect((svg.parentElement as HTMLElement).style.maxWidth).toBe('400px');
  });

  test('a stage narrower than the cap: the box keeps the drawing’s height, whatever its width', () => {
    for (const width of [250, 360]) {
      stubResizeObserver(width);
      render(<BounceScene {...PROPS} />);
      const svg = screen.getByTestId('bounce-scene');

      expect(Number(svg.getAttribute('height'))).toBe(viewBoxOf(svg)[3]);
      cleanup();
    }
  });
});
