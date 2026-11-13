// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { plexViolations } from '../../test-glyphs';
import ScaleBar, {
  inlineScaleBarMaxPx,
  SCALE_BAR_BOX_CHROME_PX,
  ScaleBarSvg,
  ScaleBarWords,
} from './ScaleBar';
import { SCALE_BAR_MAX_PX, SCALE_BAR_MIN_PX } from './scaleBarMath';

const NNBSP = ' ';
/** jest-dom folds U+202F into a space unless told not to. */
const EXACT = { normalizeWhitespace: false } as const;
const KM = [{ label: 'km', size: 1 }];
const JUPITER_RADII = [{ label: '$R_J$', size: 1 }];
const bar = (container: HTMLElement) => container.querySelector<HTMLElement>('div[data-scale-bar]');
const line = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-scale-bar-line]');

describe('ScaleBar', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('a round length, its bar as long as that length at the given scale', () => {
    const { container } = render(<ScaleBar pxPerUnit={0.15} units={KM} />);

    expect(bar(container)).toHaveTextContent(`1${NNBSP}000${NNBSP}km`, EXACT);
    expect(line(container)?.style.width).toBe('150px');
  });

  test('maxPx keeps the bar short on a narrow canvas: 500 km for 127 px per 1 000 km', () => {
    const { container } = render(<ScaleBar pxPerUnit={0.127} units={KM} maxPx={112} />);

    expect(bar(container)).toHaveTextContent(`500${NNBSP}km`, EXACT);
    expect(line(container)?.style.width).toBe('63.5px');
  });

  test('maxPx reaches the words and the SVG bar too', () => {
    const { container } = render(
      <svg>
        <ScaleBarSvg pxPerUnit={0.127} units={KM} maxPx={112} x={200} y={100} anchor="end" />
      </svg>,
    );
    const words = render(<ScaleBarWords pxPerUnit={0.127} units={KM} maxPx={112} />);

    expect(container.querySelector('path')?.getAttribute('d')).toBe('M136.5 92V100H200V92');
    expect(words.container).toHaveTextContent(`500${NNBSP}km`, EXACT);
  });

  test('follows the zoom: twice the scale, a shorter round length', () => {
    const { container, rerender } = render(<ScaleBar pxPerUnit={0.15} units={KM} />);

    rerender(<ScaleBar pxPerUnit={0.3} units={KM} />);

    expect(bar(container)).toHaveTextContent(`500${NNBSP}km`, EXACT);
    expect(line(container)?.style.width).toBe('150px');
  });

  test('a unit with math goes through KaTeX', () => {
    const { container } = render(<ScaleBar pxPerUnit={100} units={JUPITER_RADII} />);

    expect(bar(container)?.querySelector('.katex')).not.toBeNull();
    expect(plexViolations(container)).toEqual([]);
  });

  test('is drawing only, inert to the pointer; its words are read in the canvas', () => {
    const { container } = render(<ScaleBar pxPerUnit={100} units={JUPITER_RADII} />);

    expect(bar(container)).toHaveAttribute('aria-hidden', 'true');
    expect(bar(container)?.className).toContain('pointer-events-none');
    expect(container.querySelector('[data-scale-bar-words]')).toHaveTextContent(
      `Barra de escala: 1${NNBSP}R sub J`,
      EXACT,
    );
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  test('bottom-left by default; on the right it aligns to the end', () => {
    const { container, rerender } = render(<ScaleBar pxPerUnit={1} units={KM} />);
    expect(bar(container)?.className).toMatch(/\bbottom-2\b/u);
    expect(bar(container)?.className).toMatch(/\bleft-2\b/u);

    rerender(<ScaleBar pxPerUnit={1} units={KM} corner="top-right" />);

    expect(bar(container)?.className).toMatch(/\btop-2\b/u);
    expect(bar(container)?.className).toContain('items-end');
  });

  test('draws nothing for a scale that is not a positive number', () => {
    const { container } = render(<ScaleBar pxPerUnit={Number.NaN} units={KM} />);

    expect(container).toBeEmptyDOMElement();
  });

  test('a bad ladder of units fails when it renders, with the fix', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<ScaleBar pxPerUnit={1} units={[{ label: 'R_J', size: 1 }]} />)).toThrow(
      /\$…\$/u,
    );
  });

  test('the server draws it the same way', () => {
    expect(renderToString(<ScaleBar pxPerUnit={0.15} units={KM} />)).toContain('width:150px');
  });
});

describe('ScaleBarSvg', () => {
  const renderSvg = (anchor?: 'start' | 'end') =>
    render(
      <svg>
        <ScaleBarSvg pxPerUnit={0.15} units={KM} x={200} y={100} anchor={anchor} />
      </svg>,
    );

  test('the same length as a bar with end ticks, its text above, drawing only', () => {
    const { container } = renderSvg();
    const group = container.querySelector('g[data-scale-bar]')!;

    expect(group).toHaveAttribute('aria-hidden', 'true');
    expect(group).toHaveAttribute('pointer-events', 'none');
    expect(group.querySelector('path')?.getAttribute('d')).toBe('M200 92V100H350V92');
    expect(group).toHaveTextContent(`1${NNBSP}000${NNBSP}km`, EXACT);
  });

  test('anchored at the end, the bar ends at x', () => {
    const { container } = renderSvg('end');

    expect(container.querySelector('g[data-scale-bar] path')?.getAttribute('d')).toBe(
      'M50 92V100H200V92',
    );
  });

  test('draws nothing for a scale that is not a positive number', () => {
    const { container } = render(
      <svg>
        <ScaleBarSvg pxPerUnit={0} units={KM} x={0} y={0} />
      </svg>,
    );

    expect(container.querySelector('g[data-scale-bar]')).toBeNull();
  });
});

describe('ScaleBarWords', () => {
  test('the SVG bar’s words for screen readers, in HTML', () => {
    const { container } = render(<ScaleBarWords pxPerUnit={0.15} units={KM} />);

    expect(container.querySelector('[data-scale-bar-words]')).toHaveTextContent(
      `Barra de escala: 1${NNBSP}000${NNBSP}km`,
      EXACT,
    );
    expect(container.firstElementChild?.className).toContain('sr-only');
  });

  test('says nothing without a scale', () => {
    const { container } = render(<ScaleBarWords pxPerUnit={-1} units={KM} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('inlineScaleBarMaxPx (a bar beside the zoom buttons in one row)', () => {
  test('leaves the bar what the row has after the buttons, the box and a gap, within 64–160 px', () => {
    // 400 − 191 (buttons) − 18 (box) − 16 (row padding) − 4 (gap) = 171 → the shared 160.
    expect(inlineScaleBarMaxPx(400, 191)).toBe(SCALE_BAR_MAX_PX);
    expect(inlineScaleBarMaxPx(330, 191)).toBe(330 - 191 - SCALE_BAR_BOX_CHROME_PX - 16 - 4);
    expect(inlineScaleBarMaxPx(280, 191)).toBe(SCALE_BAR_MIN_PX);
    expect(inlineScaleBarMaxPx(Number.NaN, 191)).toBe(SCALE_BAR_MAX_PX);
  });
});

describe('ScaleBar with a note', () => {
  afterEach(cleanup);

  test('says whose length it is inside its box, after the length, in a muted tone', () => {
    const { container } = render(
      <ScaleBar
        pxPerUnit={10}
        units={[{ label: 'cm', size: 1 }]}
        corner="inline"
        note="de la nave"
      />,
    );
    const box = container.querySelector('[data-scale-bar]') as HTMLElement;
    const note = box.querySelector('[data-scale-bar-note]');

    expect(note).toHaveTextContent('de la nave');
    expect(note?.className).toContain('text-fg-muted');
    expect(box).toHaveTextContent(/cm\s*de la nave/u);
    // The box is hidden from screen readers: its words say whose length it is too.
    expect(container.querySelector('[data-scale-bar-words]')?.textContent).toMatch(/de la nave$/u);
  });
});

describe('ScaleBarSvg with a backdrop', () => {
  afterEach(cleanup);

  test('lays a plate of the surface under the bar and its words, only when asked', () => {
    const units = [{ label: 'm', size: 1 }];
    const { container, rerender } = render(
      <svg>
        <ScaleBarSvg pxPerUnit={1} units={units} x={10} y={40} />
      </svg>,
    );
    expect(container.querySelector('[data-scale-bar-plate]')).toBeNull();

    rerender(
      <svg>
        <ScaleBarSvg pxPerUnit={1} units={units} x={10} y={40} backdrop />
      </svg>,
    );
    const plate = container.querySelector('[data-scale-bar-plate]');
    const bar = container.querySelector('[data-scale-bar] path');
    expect(plate).toHaveAttribute('fill', 'var(--bg-elevated)');
    // Under the bar: drawn first, and around its whole length.
    expect(plate?.compareDocumentPosition(bar as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(Number(plate?.getAttribute('x'))).toBeLessThan(10);
    expect(
      Number(plate?.getAttribute('y')) + Number(plate?.getAttribute('height')),
    ).toBeGreaterThan(40);
  });
});
