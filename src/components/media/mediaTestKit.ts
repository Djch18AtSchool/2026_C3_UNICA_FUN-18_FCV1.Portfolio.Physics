/** Fixtures and helpers shared by the tests of a hosted AnalyzedMedia (video or audio). */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { vi } from 'vitest';
import type { HostedSource, MediaMarker, RealSpeed } from '../../lib/media';
import AnalyzedMedia from './AnalyzedMedia';

export const VIDEO: HostedSource = {
  kind: 'video',
  files: [
    { src: 'media/prueba/puente.webm', type: 'video/webm' },
    { src: 'media/prueba/puente.mp4', type: 'video/mp4' },
  ],
  title: 'Tacoma Narrows Bridge destruction',
  credit: 'Barney Elliott y Harbine Monroe, 1940; dominio público',
  duration: 150,
  poster: 'media/prueba/puente.jpg',
  width: 640,
  height: 480,
};
export const AUDIO: HostedSource = {
  kind: 'audio',
  files: [{ src: 'media/prueba/clarinete.mp3', type: 'audio/mpeg' }],
  title: 'Clarinete, mi bemol 4, fortissimo',
  credit: 'Electronic Music Studios, Universidad de Iowa',
  // Long enough for the markers every test shares.
  duration: 150,
};
export const MARKERS: MediaMarker[] = [
  { time: 5, title: 'La línea central', analysis: 'Un nodo: la torsión $\\theta$ no la mueve.' },
  { time: 50, title: 'El viento', analysis: 'Viento casi constante.' },
  { time: 115.8, title: 'El colapso', analysis: 'Filmado a 24 cuadros por segundo.' },
];
export const REAL_SPEED: RealSpeed = {
  label: 'Velocidad real (×2/3)',
  rate: 2 / 3,
  ranges: [
    [2, 42.8],
    [46.1, 115.8],
  ],
};
export const TEST_ID = 'tacoma-video';
export const FAILURE = /^No se pudo reproducir el archivo en este navegador:/;

export function renderMedia(source: HostedSource = VIDEO, realSpeed?: RealSpeed) {
  return render(
    createElement(AnalyzedMedia, { source, markers: MARKERS, realSpeed, testId: TEST_ID }),
  );
}

export function media(): HTMLMediaElement {
  return document.querySelector('video, audio') as HTMLMediaElement;
}

export function markerButton(name: RegExp): HTMLElement {
  return within(screen.getByTestId(`${TEST_ID}-markers`)).getByRole('button', { name });
}

export function announcer(): HTMLElement {
  return screen
    .getByTestId(`${TEST_ID}-player`)
    .querySelector('[aria-live="polite"]') as HTMLElement;
}

/**
 * jsdom has no media pipeline. Like a browser, setting `currentTime` moves the position at once
 * and fires `seeking`; `playTo` stands for the playback advancing and reporting its time.
 */
export function emulatePlayback(element: HTMLMediaElement) {
  let position = 0;
  Object.defineProperty(element, 'currentTime', {
    configurable: true,
    get: () => position,
    set: (value: number) => {
      position = value;
      element.dispatchEvent(new Event('seeking'));
    },
  });
  return {
    playTo(time: number) {
      position = time;
      fireEvent.timeUpdate(element);
    },
  };
}
/** jsdom does not implement play(); this one resolves, as a browser's does after a click. */
export function stubPlay() {
  return vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
}
