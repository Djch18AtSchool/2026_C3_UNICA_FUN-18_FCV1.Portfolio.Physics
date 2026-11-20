// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { classicAmplitudes } from '../../../lib/physics/harmonics';
import { plexViolations } from '../../../test-glyphs';
import { EVEN_COLOR, ODD_COLOR, recipeSpectrum, sampleSpectrum } from './soundPlots';
import SpectrumBars, { oddEvenText } from './SpectrumBars';
import { paints, plain, strayDollars, stubWidth } from './soundTestKit';

const clarinet = () =>
  render(
    <SpectrumBars
      bars={sampleSpectrum('clarinete')}
      title="Contenido armónico"
      ariaLabel="Espectro del clarinete"
      oddEvenDb={25.6662}
      testId="espectro"
    />,
  );

describe('SpectrumBars', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('draws one bar per harmonic, n = 1…12, each with its range', () => {
    const { container } = clarinet();

    const bars = [...container.querySelectorAll('rect[data-harmonic]')];
    expect(bars.map((bar) => bar.getAttribute('data-harmonic'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
    ]);
    expect(container.querySelectorAll('[data-range]')).toHaveLength(12);
  });

  test('odd bars carry the hatch pattern and the odd color; even bars a plain fill of the other', () => {
    const { container } = clarinet();
    const pattern = container.querySelector('svg[role="img"] pattern');
    const odd = [...container.querySelectorAll('rect[data-parity="impar"]')];
    const even = [...container.querySelectorAll('rect[data-parity="par"]')];

    expect(pattern?.id).toMatch(/impar$/);
    expect(odd).toHaveLength(6);
    expect(even).toHaveLength(6);
    for (const bar of odd) {
      expect(bar.getAttribute('fill')).toBe(`url(#${pattern?.id})`);
      expect(bar.getAttribute('stroke')).toBe(ODD_COLOR);
    }
    for (const bar of even) expect(bar.getAttribute('fill')).toBe(EVEN_COLOR);
    expect(pattern?.querySelector('line')?.getAttribute('stroke')).toBe(ODD_COLOR);
  });

  test('a taller bar is a higher level: the 3rd harmonic stands above the fundamental', () => {
    const { container } = clarinet();
    const top = (n: number) =>
      Number(container.querySelector(`rect[data-harmonic="${n}"]`)?.getAttribute('y'));

    expect(top(3)).toBeLessThan(top(1));
    expect(top(1)).toBeLessThan(top(2));
  });

  test('prints the odd/even power above the bars and names the figure for a screen reader', () => {
    clarinet();

    expect(plain(screen.getByTestId('odd-even').textContent)).toMatch(/: \+25,7 dB$/);
    expect(screen.getByRole('img', { name: 'Espectro del clarinete' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Leyenda del espectro' }).textContent).toContain(
      'Rango entre ventanas de 0,25 s',
    );
  });

  test('a recipe without even harmonics draws no even bar, no range and says so', () => {
    const { container } = render(
      <SpectrumBars
        bars={recipeSpectrum(classicAmplitudes('cuadrada', 12))}
        title="Contenido armónico"
        ariaLabel="Espectro"
        oddEvenDb={Infinity}
      />,
    );

    expect(container.querySelectorAll('rect[data-parity="par"]')).toHaveLength(0);
    expect(container.querySelectorAll('rect[data-parity="impar"]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-range]')).toHaveLength(0);
    expect(screen.getByRole('list', { name: 'Leyenda del espectro' }).textContent).not.toContain(
      'Rango',
    );
    expect(plain(screen.getByTestId('odd-even').textContent)).toMatch(/: sin pares$/);
  });

  test('oddEvenText signs a level and says a silent parity in words', () => {
    expect(plain(oddEvenText(25.6662))).toBe('+25,7 dB');
    expect(plain(oddEvenText(-0.7247))).toBe('−0,7 dB');
    expect(oddEvenText(Infinity)).toBe('sin pares');
    expect(oddEvenText(-Infinity)).toBe('sin impares');
  });

  test.each([
    [720, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']],
    [360, ['1', '2', '4', '6', '8', '10', '12']],
  ])('at %i px the x axis ticks %j', (width, labels) => {
    stubWidth(width);
    const { container } = clarinet();
    const ticks = [
      ...container.querySelectorAll('svg[role="img"] .tabular-nums text[text-anchor="middle"]'),
    ]
      .map((text) => text.textContent ?? '')
      .filter((text) => /^\d+$/.test(text));

    expect(ticks).toEqual(labels);
  });

  test.each([
    [720, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']],
    [360, ['1', '2', '4', '6', '8', '10']],
  ])('with ten harmonics (the lab) at %i px the x axis ticks %j', (width, labels) => {
    stubWidth(width);
    const { container } = render(
      <SpectrumBars
        bars={recipeSpectrum(classicAmplitudes('sierra', 10))}
        harmonics={10}
        title="T"
        ariaLabel="A"
      />,
    );
    const ticks = [
      ...container.querySelectorAll('svg[role="img"] .tabular-nums text[text-anchor="middle"]'),
    ]
      .map((text) => text.textContent ?? '')
      .filter((text) => /^\d+$/.test(text));

    expect(ticks).toEqual(labels);
    expect(container.querySelectorAll('rect[data-harmonic]')).toHaveLength(10);
  });

  test('the y axis says A_n/A_1 by default, or the title a figure gives it', () => {
    const notation = (container: Element) =>
      [...container.querySelectorAll('text[data-notation]')].map((text) =>
        text.getAttribute('data-notation'),
      );
    const { container } = clarinet();
    expect(notation(container)).toContain('$A_n/A_1$ (dB)');
    cleanup();

    const lab = render(
      <SpectrumBars
        bars={recipeSpectrum([1])}
        yTitle="Nivel de $A_n$ (dB)"
        title="T"
        ariaLabel="A"
      />,
    );
    expect(notation(lab.container)).toContain('Nivel de $A_n$ (dB)');
    expect(notation(lab.container)).not.toContain('$A_n/A_1$ (dB)');
  });

  test('without an odd/even value, no line is printed', () => {
    render(<SpectrumBars bars={recipeSpectrum([1])} title="T" ariaLabel="A" />);

    expect(screen.queryByTestId('odd-even')).toBeNull();
  });

  test.each([360, 720])('at %i px: Plex draws every character, tokens only, no raw $', (width) => {
    stubWidth(width);
    const { container } = clarinet();

    expect(plexViolations(container)).toEqual([]);
    expect(paints(container).filter((paint) => /#[0-9a-f]{3,8}\b/i.test(paint))).toEqual([]);
    expect(strayDollars(container)).toEqual([]);
    expect(container.querySelector('svg[role="img"]')?.getAttribute('viewBox')).toMatch(
      new RegExp(`^0 0 ${width} `),
    );
  });
});
