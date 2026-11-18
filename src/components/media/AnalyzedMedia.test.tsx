// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { withBase } from '../../lib/url';
import { mathSourceText } from '../../test-inline-math';
import AnalyzedMedia from './AnalyzedMedia';
import {
  announcer,
  AUDIO,
  emulatePlayback,
  MARKERS,
  markerButton,
  media,
  REAL_SPEED,
  renderMedia,
  stubPlay,
  TEST_ID,
  VIDEO,
} from './mediaTestKit';

describe('AnalyzedMedia, hosted video or audio', () => {
  let play: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    play = stubPlay();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('renders every marker with its timestamp and its analysis, typeset', () => {
    renderMedia();

    expect(screen.getAllByTestId('marker-label').map((label) => label.textContent)).toEqual([
      '0:05 · La línea central',
      '0:50 · El viento',
      '1:55 · El colapso',
    ]);
    const analyses = screen.getAllByTestId('marker-analysis');
    expect(analyses).toHaveLength(3);
    expect(mathSourceText(analyses[0])).toBe('Un nodo: la torsión $\\theta$ no la mueve.');
    expect(screen.getByText('Análisis por instante')).toBeVisible();
  });

  test('a video loads from the site, WebM first, with controls, no autoplay and only metadata', () => {
    renderMedia();
    const video = media();

    expect(video.tagName).toBe('VIDEO');
    expect(video).toHaveAttribute('controls');
    expect(video).not.toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('poster', withBase('media/prueba/puente.jpg'));
    expect(video).toHaveAttribute('width', '640');
    expect(video).toHaveAttribute('height', '480');
    expect(video).toHaveAccessibleName(VIDEO.title);
    const sources = [...video.querySelectorAll('source')];
    expect(sources.map((source) => [source.getAttribute('src'), source.type])).toEqual([
      [withBase('media/prueba/puente.webm'), 'video/webm'],
      [withBase('media/prueba/puente.mp4'), 'video/mp4'],
    ]);
    expect(play).not.toHaveBeenCalled();
  });

  test('an audio renders <audio controls> named by its title, without autoplay', () => {
    renderMedia(AUDIO);
    const audio = media();

    expect(audio.tagName).toBe('AUDIO');
    expect(audio).toHaveAttribute('controls');
    expect(audio).not.toHaveAttribute('autoplay');
    expect(audio).toHaveAttribute('preload', 'metadata');
    expect(audio).toHaveAccessibleName(AUDIO.title);
    expect(audio.querySelector('source')).toHaveAttribute(
      'src',
      withBase('media/prueba/clarinete.mp3'),
    );
    expect(document.querySelector('video')).toBeNull();
  });

  test('credits the file in one line, after its kind', () => {
    renderMedia(AUDIO);

    expect(screen.getByTestId(`${TEST_ID}-credit`)).toHaveTextContent(
      /^Audio: Electronic Music Studios, Universidad de Iowa$/,
    );
    cleanup();
    renderMedia();
    expect(screen.getByTestId(`${TEST_ID}-credit`)).toHaveTextContent(/^Video: Barney Elliott/);
  });

  test('a marker seeks the medium and plays it, becomes the active one and announces its title', () => {
    renderMedia();
    emulatePlayback(media());

    fireEvent.click(markerButton(/El viento/));

    expect(media().currentTime).toBe(50);
    expect(play).toHaveBeenCalledTimes(1);
    expect(markerButton(/El viento/)).toHaveAttribute('aria-current', 'true');
    expect(markerButton(/La línea central/)).not.toHaveAttribute('aria-current');
    expect(markerButton(/El viento/)).toHaveAttribute('aria-controls', media().parentElement?.id);
    expect(announcer()).toHaveTextContent('Instante 0:50: El viento');
  });

  test('the playback position highlights the last marker reached', () => {
    renderMedia();
    const playback = emulatePlayback(media());

    playback.playTo(3);
    MARKERS.forEach(({ title }) =>
      expect(markerButton(new RegExp(title))).not.toHaveAttribute('aria-current'),
    );

    playback.playTo(120);
    expect(markerButton(/El colapso/)).toHaveAttribute('aria-current', 'true');
    expect(markerButton(/El viento/)).not.toHaveAttribute('aria-current');
  });

  test('a play() the browser refuses leaves the seek and the marker in place', async () => {
    play.mockRejectedValue(new DOMException('Sin gesto', 'NotAllowedError'));
    renderMedia(AUDIO);
    emulatePlayback(media());

    fireEvent.click(markerButton(/La línea central/));
    await act(async () => undefined);

    expect(media().currentTime).toBe(5);
    expect(markerButton(/La línea central/)).toHaveAttribute('aria-current', 'true');
  });

  test('without JS (server render) the markers link to the file at their instant', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(
      <AnalyzedMedia source={VIDEO} markers={MARKERS} testId={TEST_ID} />,
    );

    const labels = [...container.querySelectorAll('[data-testid="marker-label"]')];
    expect(labels.map((label) => label.getAttribute('href'))).toEqual([
      `${withBase('media/prueba/puente.webm')}#t=5`,
      `${withBase('media/prueba/puente.webm')}#t=50`,
      `${withBase('media/prueba/puente.webm')}#t=115.8`,
    ]);
    expect(container.querySelector('video')).toHaveAttribute('preload', 'metadata');
  });

  test('invalid data fails the render with a clear message', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderMedia({ ...VIDEO, files: [] })).toThrow(/al menos un archivo/);
    expect(() => renderMedia(VIDEO, { ...REAL_SPEED, ranges: [[100, 200]] })).toThrow(/tramo/);
  });
});

describe('AnalyzedMedia, real speed', () => {
  beforeEach(() => {
    stubPlay();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function realSpeedToggle(): HTMLElement {
    return screen.getByTestId(`${TEST_ID}-real-speed`);
  }

  test('without a real speed there is no toggle', () => {
    renderMedia();

    expect(screen.queryByTestId(`${TEST_ID}-real-speed`)).toBeNull();
  });

  test('the toggle is a button named by its label, off at first, that controls the medium', () => {
    renderMedia(VIDEO, REAL_SPEED);

    expect(realSpeedToggle()).toHaveAccessibleName('Velocidad real (×2/3)');
    expect(realSpeedToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(realSpeedToggle()).toHaveAttribute('aria-controls', media().parentElement?.id);
  });

  test('on, playbackRate follows the declared ranges as the video plays', () => {
    renderMedia(VIDEO, REAL_SPEED);
    const playback = emulatePlayback(media());

    fireEvent.click(realSpeedToggle());

    expect(realSpeedToggle()).toHaveAttribute('aria-pressed', 'true');
    playback.playTo(5);
    expect(media().playbackRate).toBe(2 / 3);
    playback.playTo(44);
    expect(media().playbackRate).toBe(1);
    playback.playTo(50);
    expect(media().playbackRate).toBe(2 / 3);
    playback.playTo(120);
    expect(media().playbackRate).toBe(1);
  });

  test('on, a marker lands at the rate of its instant: 1× in the collapse, 2/3 in the shots', () => {
    renderMedia(VIDEO, REAL_SPEED);
    emulatePlayback(media());
    fireEvent.click(realSpeedToggle());

    fireEvent.click(markerButton(/El viento/));
    expect(media().playbackRate).toBe(2 / 3);
    fireEvent.click(markerButton(/El colapso/));
    expect(media().playbackRate).toBe(1);
    fireEvent.click(markerButton(/La línea central/));
    expect(media().playbackRate).toBe(2 / 3);
  });

  test('off again, the video is back at 1× and no longer follows the ranges', () => {
    renderMedia(VIDEO, REAL_SPEED);
    const playback = emulatePlayback(media());
    fireEvent.click(realSpeedToggle());
    playback.playTo(5);

    fireEvent.click(realSpeedToggle());
    playback.playTo(6);

    expect(realSpeedToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(media().playbackRate).toBe(1);
  });
});
