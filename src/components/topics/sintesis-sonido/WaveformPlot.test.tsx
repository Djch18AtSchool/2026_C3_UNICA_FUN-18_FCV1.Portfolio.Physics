// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { classicAmplitudes } from '../../../lib/physics/harmonics';
import { plexViolations } from '../../../test-glyphs';
import { recipeWaveform, sampleWaveform, SHIFTED_COLOR, SIGNAL_COLOR } from './soundPlots';
import { paints, strayDollars, stubWidth } from './soundTestKit';
import WaveformPlot from './WaveformPlot';

describe('WaveformPlot', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('draws y(t) solid and −y(t + T/2) dashed, with a legend', () => {
    const { container } = render(
      <WaveformPlot data={sampleWaveform('clarinete')} title="Cuatro periodos" ariaLabel="Forma" />,
    );
    const signal = container.querySelector('[data-series="senal"]');
    const shifted = container.querySelector('[data-series="media-onda"]');

    expect(signal?.getAttribute('stroke')).toBe(SIGNAL_COLOR);
    expect(signal?.getAttribute('stroke-dasharray')).toBeNull();
    expect(shifted?.getAttribute('stroke')).toBe(SHIFTED_COLOR);
    expect(shifted?.getAttribute('stroke-dasharray')).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Forma' })).toBeTruthy();
  });

  test('marks one period with its length: T = 3,22 ms', () => {
    const { container } = render(
      <WaveformPlot data={sampleWaveform('flauta')} title="Cuatro periodos" ariaLabel="Forma" />,
    );

    const label = container.querySelector('[data-mark="periodo"] text[data-notation]');
    expect(label?.getAttribute('data-notation')?.replace(/ /g, ' ')).toBe('$T$ = 3,22 ms');
  });

  test('the pure tone of Paso 1 leaves the shifted copy out', () => {
    const { container } = render(
      <WaveformPlot
        data={recipeWaveform(classicAmplitudes('seno', 12))}
        title="Tono puro"
        ariaLabel="Seno"
        showShifted={false}
      />,
    );

    expect(container.querySelectorAll('[data-series]')).toHaveLength(1);
  });

  test.each([360, 720])('at %i px: Plex draws every character, tokens only, no raw $', (width) => {
    stubWidth(width);
    const { container } = render(
      <WaveformPlot data={sampleWaveform('flauta')} title="Cuatro periodos" ariaLabel="Forma" />,
    );

    expect(plexViolations(container)).toEqual([]);
    expect(paints(container).filter((paint) => /#[0-9a-f]{3,8}\b/i.test(paint))).toEqual([]);
    expect(strayDollars(container)).toEqual([]);
  });
});
