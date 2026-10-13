// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { EmbeddedVideo, VideoMarker } from '../../../lib/videoMarkers';
import { YOUTUBE_EMBED_ORIGIN } from '../../../lib/youtube';
import HapticVideo from './HapticVideo';

const VIDEO: EmbeddedVideo = {
  id: 'CaPHUZapCTI',
  title: "A Game Developer Explains How PS5's DualSense Actually Works",
  channel: 'PlayStation Access',
  published: '2021-08-05',
  duration: 610,
  language: 'en inglés, con subtítulos automáticos',
};
const MARKERS: VideoMarker[] = [
  { time: 138, title: 'Vibración', analysis: 'Un altavoz, no un resorte.' },
  { time: 198, title: 'Un motor empuja', analysis: 'Tercera ley.' },
  { time: 255, title: 'El arco', analysis: 'La tensión crece con el recorrido.' },
];
const TRANSCRIPT = 'Aoki explica cómo funciona el gatillo.';
const WATCH = `https://www.youtube.com/watch?v=${VIDEO.id}`;
const PLAY = /^Reproducir el video aquí/;

function renderPlayer() {
  return render(<HapticVideo video={VIDEO} markers={MARKERS} transcript={TRANSCRIPT} />);
}

function frame(): HTMLIFrameElement {
  return screen.getByTitle(/^Video de YouTube/) as HTMLIFrameElement;
}

function startParam(iframe: HTMLIFrameElement): string | null {
  return new URL(iframe.src).searchParams.get('start');
}

function markerButton(name: RegExp): HTMLElement {
  return within(screen.getByTestId('haptic-video-markers')).getByRole('button', { name });
}

/** A message from the embedded player, as the browser would deliver it. */
function playerSays(data: unknown, origin = YOUTUBE_EMBED_ORIGIN, source = frame().contentWindow) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify(data), origin, source }),
    );
  });
}

/** The JSON messages the page posted to the player, parsed. */
function sentMessages(spy: { mock: { calls: unknown[][] } }): unknown[] {
  return spy.mock.calls.map(([message]) => JSON.parse(String(message)));
}

describe('HapticVideo', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('without JS (server render) the facade and every marker link to YouTube, with no embed', () => {
    const container = document.createElement('div');
    container.innerHTML = renderToString(
      <HapticVideo video={VIDEO} markers={MARKERS} transcript={TRANSCRIPT} />,
    );

    const facade = container.querySelector('[data-testid="haptic-video-facade"]');
    expect(facade?.tagName).toBe('A');
    expect(facade).toHaveAttribute('href', WATCH);
    const labels = [...container.querySelectorAll('[data-testid="marker-label"]')];
    expect(labels.map((label) => label.getAttribute('href'))).toEqual([
      `${WATCH}&t=138s`,
      `${WATCH}&t=198s`,
      `${WATCH}&t=255s`,
    ]);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.innerHTML).not.toContain('youtube-nocookie.com/embed');
  });

  test('hydrated, the facade is a button and nothing loads from YouTube until it is pressed', () => {
    renderPlayer();

    expect(screen.getByRole('button', { name: PLAY })).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.getByTestId('haptic-video-player')).toHaveAttribute('data-state', 'facade');
    expect(within(screen.getByTestId('haptic-video-markers')).getAllByRole('button')).toHaveLength(
      3,
    );
  });

  test('the facade names the video: title, channel, length and language', () => {
    renderPlayer();
    const facade = screen.getByTestId('haptic-video-facade');

    expect(within(facade).getByText(VIDEO.title)).toHaveAttribute('lang', 'en');
    expect(facade).toHaveTextContent('PlayStation Access · 10:10 · en inglés');
    expect(facade).toHaveTextContent(/youtube-nocookie\.com/);
  });

  test('pressing the facade embeds the video from youtube-nocookie at 0 s and focuses it', () => {
    renderPlayer();

    fireEvent.click(screen.getByRole('button', { name: PLAY }));

    const iframe = frame();
    expect(new URL(iframe.src).origin).toBe(YOUTUBE_EMBED_ORIGIN);
    expect(new URL(iframe.src).pathname).toBe(`/embed/${VIDEO.id}`);
    expect(startParam(iframe)).toBe('0');
    expect(new URL(iframe.src).searchParams.get('origin')).toBe(window.location.origin);
    expect(iframe).toHaveAttribute(
      'title',
      `Video de YouTube: «${VIDEO.title}», de PlayStation Access`,
    );
    expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expect(iframe).toHaveFocus();
    expect(screen.queryByTestId('haptic-video-facade')).toBeNull();
    expect(screen.getByTestId('haptic-video-player')).toHaveAttribute('data-state', 'loading');
  });

  test('a marker pressed on the facade opens the player at its instant and stays highlighted', () => {
    renderPlayer();
    markerButton(/El arco/).focus();

    fireEvent.click(markerButton(/El arco/));

    expect(startParam(frame())).toBe('255');
    expect(markerButton(/El arco/)).toHaveAttribute('aria-current', 'true');
    expect(markerButton(/Vibración/)).not.toHaveAttribute('aria-current');
    expect(markerButton(/El arco/)).toHaveFocus();
  });

  test('once loaded, the page subscribes to the player events', () => {
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: PLAY }));
    const post = vi.spyOn(frame().contentWindow as Window, 'postMessage');

    fireEvent.load(frame());

    expect(post).toHaveBeenCalledWith(expect.any(String), YOUTUBE_EMBED_ORIGIN);
    expect(sentMessages(post)).toContainEqual({ event: 'listening', id: 1, channel: 'widget' });
  });

  test('until the player answers, the subscription is repeated; then it stops', () => {
    vi.useFakeTimers();
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: PLAY }));
    const post = vi.spyOn(frame().contentWindow as Window, 'postMessage');

    act(() => vi.advanceTimersByTime(1000));
    const whileWaiting = post.mock.calls.length;
    playerSays({ event: 'onReady', info: null });
    act(() => vi.advanceTimersByTime(5000));

    expect(whileWaiting).toBeGreaterThanOrEqual(2);
    expect(post.mock.calls.length).toBe(whileWaiting);
    expect(screen.getByTestId('haptic-video-player')).toHaveAttribute('data-state', 'connected');
  });

  test('the playback time the player reports highlights the last marker reached', () => {
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: PLAY }));

    playerSays({ event: 'infoDelivery', info: { currentTime: 100 } });
    MARKERS.forEach(({ title }) =>
      expect(markerButton(new RegExp(title))).not.toHaveAttribute('aria-current'),
    );

    playerSays({ event: 'infoDelivery', info: { currentTime: 241 } });
    expect(markerButton(/Un motor empuja/)).toHaveAttribute('aria-current', 'true');
    expect(markerButton(/El arco/)).not.toHaveAttribute('aria-current');
  });

  test('with the player answering, a marker seeks in place without reloading the iframe', () => {
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: PLAY }));
    playerSays({ event: 'infoDelivery', info: { currentTime: 3 } });
    const src = frame().src;
    const post = vi.spyOn(frame().contentWindow as Window, 'postMessage');

    fireEvent.click(markerButton(/Un motor empuja/));

    expect(frame().src).toBe(src);
    expect(sentMessages(post)).toEqual([
      { event: 'command', func: 'seekTo', args: [198, true], id: 1, channel: 'widget' },
      { event: 'command', func: 'playVideo', args: [], id: 1, channel: 'widget' },
    ]);
    expect(markerButton(/Un motor empuja/)).toHaveAttribute('aria-current', 'true');
  });

  test('without an answer from the player, a marker reloads the embed at its instant', () => {
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: PLAY }));

    fireEvent.click(markerButton(/Vibración/));

    expect(startParam(frame())).toBe('138');
    expect(markerButton(/Vibración/)).toHaveAttribute('aria-current', 'true');
  });

  test('messages from another origin or another window are ignored', () => {
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: PLAY }));

    playerSays({ event: 'infoDelivery', info: { currentTime: 300 } }, 'https://evil.example');
    playerSays({ event: 'infoDelivery', info: { currentTime: 300 } }, YOUTUBE_EMBED_ORIGIN, window);

    expect(screen.getByTestId('haptic-video-player')).toHaveAttribute('data-state', 'loading');
    expect(markerButton(/El arco/)).not.toHaveAttribute('aria-current');
  });

  test('credits the third-party video and links to it on YouTube', () => {
    renderPlayer();
    const credit = screen.getByTestId('haptic-video-credit');

    expect(credit).toHaveTextContent('Video de terceros; no es de mi autoría');
    expect(credit).toHaveTextContent('PlayStation Access, 5 de agosto de 2021');
    expect(within(credit).getByRole('link', { name: /Ver en YouTube/ })).toHaveAttribute(
      'href',
      WATCH,
    );
  });

  test('the description of the analysed fragments sits in a details element', () => {
    renderPlayer();

    const summary = screen.getByText('Descripción de los fragmentos analizados');
    expect(summary.tagName).toBe('SUMMARY');
    expect(summary.closest('details')).toHaveTextContent(TRANSCRIPT);
  });

  test('every analysis is visible before and after the video loads', () => {
    renderPlayer();
    MARKERS.forEach(({ analysis }) => expect(screen.getByText(analysis)).toBeVisible());

    fireEvent.click(screen.getByRole('button', { name: PLAY }));

    MARKERS.forEach(({ analysis }) => expect(screen.getByText(analysis)).toBeVisible());
    expect(screen.getAllByTestId('marker-label').map((label) => label.textContent)).toEqual([
      '2:18 · Vibración',
      '3:18 · Un motor empuja',
      '4:15 · El arco',
    ]);
  });

  test('invalid video data fails the render with a clear message', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      render(<HapticVideo video={{ ...VIDEO, id: 'bad' }} markers={MARKERS} transcript="" />),
    ).toThrow(/identificador de YouTube/);
    expect(() =>
      render(<HapticVideo video={VIDEO} markers={[...MARKERS].reverse()} transcript="" />),
    ).toThrow(/orden creciente/);
  });
});
