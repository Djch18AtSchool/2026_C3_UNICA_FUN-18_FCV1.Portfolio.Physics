// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { withBase } from '../../../lib/url';
import type { VideoMarker } from '../../../lib/data/triggerModel';
import HapticVideo from './HapticVideo';

const MARKERS: VideoMarker[] = [
  { time: 5, title: 'Empieza la resistencia', analysis: 'El gatillo pasa x₀.' },
  { time: 15, title: 'Fondo del recorrido', analysis: 'x máxima y F máxima.' },
  { time: 18, title: 'Liberación', analysis: 'La fuerza restauradora −kx.' },
];
const TRANSCRIPT = 'El dedo descansa sobre el gatillo y luego lo presiona despacio.';
const VIDEO_PATH = 'media/tema-05-dualsense.mp4';

function renderPlayer(): void {
  render(
    <HapticVideo
      src={VIDEO_PATH}
      poster="media/tema-05-dualsense.jpg"
      markers={MARKERS}
      transcript={TRANSCRIPT}
    />,
  );
}

function videoElement(): HTMLVideoElement {
  return screen.getByTestId('haptic-video') as HTMLVideoElement;
}

function markerButton(name: RegExp): HTMLElement {
  return screen.getByRole('button', { name });
}

describe('HapticVideo', () => {
  afterEach(cleanup);

  test('renders a native player with controls, metadata preload and base-prefixed URLs', () => {
    renderPlayer();
    const video = videoElement();

    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('preload', 'metadata');
    expect(video).toHaveAttribute('src', withBase(VIDEO_PATH));
    expect(video).toHaveAttribute('poster', withBase('media/tema-05-dualsense.jpg'));
    expect(screen.queryByTestId('haptic-video-fallback')).toBeNull();
  });

  test('lists each marker as "m:ss · title" with its analysis always visible', () => {
    renderPlayer();

    expect(markerButton(/^0:05 · Empieza la resistencia$/)).toBeInTheDocument();
    expect(markerButton(/^0:15 · Fondo del recorrido$/)).toBeInTheDocument();
    expect(markerButton(/^0:18 · Liberación$/)).toBeInTheDocument();
    MARKERS.forEach(({ analysis }) => expect(screen.getByText(analysis)).toBeVisible());
  });

  test('a load error shows the fallback with the transcript and a download link', () => {
    renderPlayer();
    const video = videoElement();

    fireEvent.error(video);

    expect(screen.getByTestId('haptic-video-player')).toHaveAttribute('data-state', 'error');
    const fallback = screen.getByTestId('haptic-video-fallback');
    expect(within(fallback).getByText(TRANSCRIPT)).toBeVisible();
    const download = within(fallback).getByRole('link', { name: /Descargar el video/ });
    expect(download).toHaveAttribute('href', withBase(VIDEO_PATH));
    expect(download).toHaveAttribute('download');
    // The written analysis does not depend on the video.
    MARKERS.forEach(({ analysis }) => expect(screen.getByText(analysis)).toBeVisible());
  });

  test('in the error state no marker is highlighted, even after choosing one', () => {
    renderPlayer();
    fireEvent.error(videoElement());

    fireEvent.click(markerButton(/Fondo del recorrido/));

    MARKERS.forEach(({ title }) =>
      expect(markerButton(new RegExp(title))).not.toHaveAttribute('aria-current'),
    );
  });

  test('the fallback copy is neutral, so it also fits a later network error', () => {
    renderPlayer();

    fireEvent.error(videoElement());

    const fallback = screen.getByTestId('haptic-video-fallback');
    expect(
      within(fallback).getByText('El video no está disponible en este momento.'),
    ).toBeVisible();
    expect(fallback).not.toHaveTextContent(/en cuanto lo publique/);
  });

  test('an error that happened before hydration is detected on mount', () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'error');
    Object.defineProperty(HTMLMediaElement.prototype, 'error', {
      configurable: true,
      get: () => ({ code: 4 }),
    });
    try {
      renderPlayer();

      expect(screen.getByTestId('haptic-video-player')).toHaveAttribute('data-state', 'error');
    } finally {
      if (descriptor) Object.defineProperty(HTMLMediaElement.prototype, 'error', descriptor);
      else Reflect.deleteProperty(HTMLMediaElement.prototype, 'error');
    }
  });

  test('clicking a marker seeks the video to its time and highlights it', () => {
    renderPlayer();
    const video = videoElement();

    fireEvent.click(markerButton(/Fondo del recorrido/));

    expect(video.currentTime).toBe(15);
    expect(markerButton(/Fondo del recorrido/)).toHaveAttribute('aria-current', 'true');
    expect(markerButton(/Empieza la resistencia/)).not.toHaveAttribute('aria-current');
  });

  test('timeupdate highlights the last marker the playback has reached', () => {
    renderPlayer();
    const video = videoElement();

    video.currentTime = 2;
    fireEvent.timeUpdate(video);
    MARKERS.forEach(({ title }) =>
      expect(markerButton(new RegExp(title))).not.toHaveAttribute('aria-current'),
    );

    video.currentTime = 16.4;
    fireEvent.timeUpdate(video);
    expect(markerButton(/Fondo del recorrido/)).toHaveAttribute('aria-current', 'true');
    expect(markerButton(/Liberación/)).not.toHaveAttribute('aria-current');
  });
});
