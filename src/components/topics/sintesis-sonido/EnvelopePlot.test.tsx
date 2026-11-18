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
