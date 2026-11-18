// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { plexViolations } from '../../../test-glyphs';
import { emulatePlayback, stubPlay } from '../../media/mediaTestKit';
import SampleAnalysis from './SampleAnalysis';
import SampleContrast from './SampleContrast';
import { plain, strayDollars, stubWidth } from './soundTestKit';

describe('SampleAnalysis', () => {
  beforeEach(() => {
    stubPlay();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('the clarinet: an audio named in words, from the site, with controls, no autoplay and only metadata', () => {
    const { container } = render(<SampleAnalysis sample="clarinete" />);
    const audio = container.querySelector('audio');

    expect(audio?.getAttribute('aria-label')).toBe(
      'Clarinete en si bemol, mi bemol 4 fortísimo sin vibrato',
    );
    expect(audio).toHaveAttribute('controls');
    expect(audio).toHaveAttribute('preload', 'metadata');
    expect(audio).not.toHaveAttribute('autoplay');
    expect(audio?.querySelector('source')?.getAttribute('src')).toMatch(
      /media\/sintesis-sonido\/clarinete-mib4\.mp3$/,
    );
    expect(audio?.querySelector('source')?.getAttribute('type')).toBe('audio/mpeg');
  });

  test('two analysed instants, the attack at 0:00 and the sustain at 0:01, each with its analysis', () => {
    render(<SampleAnalysis sample="flauta" />);
    const markers = screen.getByTestId('flauta-audio-markers');

    expect(
      within(markers)
        .getAllByTestId('marker-label')
        .map((label) => label.textContent),
    ).toEqual(['0:00 · El ataque', '0:01 · El sostenido']);
    expect(plain(within(markers).getAllByTestId('marker-analysis')[1].textContent)).toContain(
      'el más fuerte es el 2.º, +3,7 dB',
    );
  });

  test('a marker moves the audio to its instant and plays it', () => {
    const { container } = render(<SampleAnalysis sample="clarinete" />);
    const audio = container.querySelector('audio') as HTMLMediaElement;
    emulatePlayback(audio);

    fireEvent.click(
      within(screen.getByTestId('clarinete-audio-markers')).getByRole('button', {
        name: /^0:01/,
      }),
    );

    expect(audio.currentTime).toBe(1);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  test('the heading names the recording with its f₁; the credit says what I did to the clip', () => {
    render(<SampleAnalysis sample="clarinete" />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.querySelector('.katex')).not.toBeNull();
    expect(plain(heading.textContent)).toContain('310,10 Hz');
    expect(plain(screen.getByTestId('clarinete-audio-credit').textContent)).toMatch(
      /^Audio: Christine Bellomy, .*Lo recorté desde 0,38 s y lo igualé a −20 LUFS\.$/,
    );
  });

  test('then its envelope, its waveform and its spectrum, each named for a screen reader', () => {
    render(<SampleAnalysis sample="flauta" />);

    for (const id of ['flauta-envolvente', 'flauta-forma', 'flauta-espectro']) {
      const plot = screen.getByTestId(id);
      expect(within(plot).getByRole('img').getAttribute('aria-label')).not.toBe('');
    }
  });

  test.each(['flauta', 'clarinete'] as const)(
    '%s at 360 px: Plex draws every character outside KaTeX, with no raw $',
    (sample) => {
      stubWidth(360);
      const { container } = render(<SampleAnalysis sample={sample} />);

      expect(plexViolations(container)).toEqual([]);
      expect(strayDollars(container)).toEqual([]);
    },
  );
});

describe('SampleContrast', () => {
  afterEach(cleanup);

  test('four points under one heading, «Qué diferencia produce qué»', () => {
    const { container } = render(<SampleContrast />);

    expect(screen.getByRole('heading', { name: 'Qué diferencia produce qué' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(plexViolations(container)).toEqual([]);
    expect(strayDollars(container)).toEqual([]);
  });
});
