// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { plexViolations } from '../../../test-glyphs';
import EnvelopePlot from './EnvelopePlot';
import { sampleEnvelope } from './soundPlots';
import { paints, strayDollars, stubWidth } from './soundTestKit';

const x = (element: Element | null, name = 'x') => Number(element?.getAttribute(name));

describe('EnvelopePlot', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('shades the attack and the release and brackets the analysis window, overlapping as measured', () => {
    const { container } = render(
      <EnvelopePlot data={sampleEnvelope('clarinete')} title="Envolvente" ariaLabel="Env" />,
    );
    const attack = container.querySelector('[data-band="ataque"]');
    const release = container.querySelector('[data-band="caida"]');
    const bracket = container.querySelector('[data-bracket="ventana"] line');

    expect(attack).not.toBeNull();
    expect(release).not.toBeNull();
    // The clarinet's window opens inside its attack band.
    expect(x(bracket, 'x1')).toBeGreaterThan(x(attack));
    expect(x(bracket, 'x1')).toBeLessThan(x(attack) + x(attack, 'width'));
    expect(container.textContent).toContain('Ventana de análisis');
    expect(container.textContent).toContain('Ataque');
    expect(container.textContent).toContain('Caída');
  });

  // At 360 px the clarinet's window label crossed its attack band, where its surface halo showed
  // as a pale blob, and «Ataque» and «Caída» sat 4 px from the band and the falling curve.
  test('the window label lies under the bands, so a band tints its halo; the band labels keep 8 px', () => {
    stubWidth(360);
    const { container } = render(
      <EnvelopePlot data={sampleEnvelope('clarinete')} title="Envolvente" ariaLabel="Env" />,
    );
    const marks = [...container.querySelectorAll('[data-band], text')];
    const windowLabel = marks.findIndex((mark) => mark.textContent === 'Ventana de análisis');
    const attack = container.querySelector('[data-band="ataque"]');
    const release = container.querySelector('[data-band="caida"]');
    const label = (text: string) =>
      [...container.querySelectorAll('text')].find((mark) => mark.textContent === text) ?? null;

    expect(windowLabel).toBeLessThan(marks.indexOf(attack as Element));
    expect(windowLabel).toBeLessThan(marks.indexOf(release as Element));
    expect(x(label('Ataque')) - (x(attack) + x(attack, 'width'))).toBeCloseTo(8, 6);
    expect(x(release) - x(label('Caída'))).toBeCloseTo(8, 6);
  });

  test('draws the envelope as one series and names the figure', () => {
    const { container } = render(
      <EnvelopePlot data={sampleEnvelope('flauta')} title="Envolvente" ariaLabel="Env flauta" />,
    );

    expect(container.querySelectorAll('[data-series="envolvente"]')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Env flauta' })).toBeTruthy();
  });

  test.each([360, 720])('at %i px: Plex draws every character, tokens only, no raw $', (width) => {
    stubWidth(width);
    const { container } = render(
      <EnvelopePlot data={sampleEnvelope('flauta')} title="Envolvente" ariaLabel="Env" />,
    );

    expect(plexViolations(container)).toEqual([]);
    expect(paints(container).filter((paint) => /#[0-9a-f]{3,8}\b/i.test(paint))).toEqual([]);
    expect(strayDollars(container)).toEqual([]);
  });
});
