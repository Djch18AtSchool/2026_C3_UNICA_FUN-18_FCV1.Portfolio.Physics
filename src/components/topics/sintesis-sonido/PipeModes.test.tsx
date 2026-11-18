// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { plexViolations } from '../../../test-glyphs';
import PipeModes from './PipeModes';
import { EVEN_COLOR, ODD_COLOR } from './soundPlots';
import { paints, plain } from './soundTestKit';

const modesOf = (container: Element, kind: string) =>
  [...container.querySelectorAll(`[data-pipe="${kind}"] [data-mode]`)].map((mode) =>
    mode.getAttribute('data-mode'),
  );

describe('PipeModes', () => {
  afterEach(cleanup);

  test('the open pipe shows n = 1, 2, 3 and the closed one only n = 1, 3, 5', () => {
    const { container } = render(<PipeModes />);

    expect(modesOf(container, 'abierto')).toEqual(['1', '2', '3']);
    expect(modesOf(container, 'cerrado')).toEqual(['1', '3', '5']);
    expect(container.querySelectorAll('[data-pipe="cerrado"] [data-closed-end]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-pipe="abierto"] [data-closed-end]')).toHaveLength(0);
  });

  test('odd modes are solid in the odd color, the even one dashed in the even color', () => {
    const { container } = render(<PipeModes />);
    const strokes = (parity: string) =>
      [...container.querySelectorAll(`[data-parity="${parity}"] path`)].map((path) => [
        path.getAttribute('stroke'),
        path.getAttribute('stroke-dasharray'),
      ]);

    expect(new Set(strokes('impar').map(([stroke]) => stroke))).toEqual(new Set([ODD_COLOR]));
    expect(strokes('impar').every(([, dash]) => dash === null)).toBe(true);
    expect(strokes('par')).toHaveLength(2);
    expect(strokes('par').every(([stroke, dash]) => stroke === EVEN_COLOR && dash !== null)).toBe(
      true,
    );
  });

  test('labels each pipe’s length and each mode’s frequency in the site’s notation', () => {
    const { container } = render(<PipeModes />);
    const notations = [...container.querySelectorAll('text[data-notation]')].map((text) =>
      plain(text.getAttribute('data-notation')),
    );

    expect(notations).toContain('Abierto-abierto (flauta): $L$ = 0,55 m');
    expect(notations).toContain('Cerrado-abierto (clarinete): $L$ = 0,27 m');
    expect(notations).toContain('$n$ = 5 · 1 550 Hz');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('a la misma escala');
  });

  test('Plex draws every character, with color tokens only', () => {
    const { container } = render(<PipeModes />);

    expect(plexViolations(container)).toEqual([]);
    expect(paints(container).filter((paint) => /#[0-9a-f]{3,8}\b/i.test(paint))).toEqual([]);
  });
});
