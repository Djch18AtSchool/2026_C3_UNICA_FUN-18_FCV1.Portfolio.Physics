// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { withBase } from '../../lib/url';
import { mathSourceText } from '../../test-inline-math';
import {
  announcer,
  AUDIO,
  emulatePlayback,
  FAILURE,
  MARKERS,
  markerButton,
  media,
  REAL_SPEED,
  renderMedia,
  stubPlay,
  TEST_ID,
  VIDEO,
} from './mediaTestKit';

describe('AnalyzedMedia, a medium that cannot play (Review Focus 1)', () => {
  beforeEach(() => {
    stubPlay();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function failureLine(): HTMLElement {
    return screen.getByTestId(`${TEST_ID}-error`);
  }

  function expectMarkersStillUsable(): void {
    const analyses = screen.getAllByTestId('marker-analysis');
    expect(analyses.map(mathSourceText)).toEqual(MARKERS.map(({ analysis }) => analysis));
    analyses.forEach((analysis) => expect(analysis).toBeVisible());
    fireEvent.click(markerButton(/El colapso/));
    expect(markerButton(/El colapso/)).toHaveAttribute('aria-current', 'true');
    expect(announcer()).toHaveTextContent('Reproduciendo desde 1:55: El colapso');
  }

  test('nothing is said while the medium has not failed', () => {
    renderMedia();

    expect(screen.queryByTestId(`${TEST_ID}-error`)).toBeNull();
  });

  test('an error on the medium shows a line with the file to download; the markers still work', () => {
    renderMedia(VIDEO, REAL_SPEED);
    emulatePlayback(media());
    // The live region exists, empty, before the failure: a region announces changes, not insertions.
    const statusRegion = screen.getByRole('status');
    expect(statusRegion).toBeEmptyDOMElement();

    fireEvent.error(media());

    expect(failureLine()).toHaveTextContent(FAILURE);
    expect(failureLine().closest('[role="status"]')).toBe(statusRegion);
    const link = within(failureLine()).getByRole('link', { name: 'descárgalo en WebM' });
    expect(link).toHaveAttribute('href', withBase(VIDEO.files[0].src));
    expect(link).toHaveAttribute('download');
    expect(screen.queryByTestId(`${TEST_ID}-real-speed`)).toBeNull();
    expectMarkersStillUsable();
  });

  test('when the last source fails, none could play: the same line appears', () => {
    renderMedia();
    const sources = media().querySelectorAll('source');

    fireEvent.error(sources[0]);
    expect(screen.queryByTestId(`${TEST_ID}-error`)).toBeNull();
    fireEvent.error(sources[1]);

    expect(failureLine()).toHaveTextContent(FAILURE);
  });

  test('an audio that cannot play offers its MP3', () => {
    renderMedia(AUDIO);

    fireEvent.error(media());

    expect(within(failureLine()).getByRole('link', { name: 'descárgalo en MP3' })).toHaveAttribute(
      'href',
      withBase(AUDIO.files[0].src),
    );
    expectMarkersStillUsable();
  });

  test('a medium that had already failed before hydration shows the line after one task', () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, 'networkState', 'get').mockReturnValue(
      HTMLMediaElement.NETWORK_NO_SOURCE,
    );

    renderMedia();
    expect(screen.queryByTestId(`${TEST_ID}-error`)).toBeNull();
    act(() => vi.runOnlyPendingTimers());

    expect(failureLine()).toHaveTextContent(FAILURE);
  });

  test('a client-side mount, without a source only until its selection starts, is not a failure', () => {
    vi.useFakeTimers();
    const networkState = vi
      .spyOn(HTMLMediaElement.prototype, 'networkState', 'get')
      .mockReturnValue(HTMLMediaElement.NETWORK_NO_SOURCE);

    renderMedia();
    networkState.mockReturnValue(HTMLMediaElement.NETWORK_LOADING);
    act(() => vi.runOnlyPendingTimers());

    expect(screen.queryByTestId(`${TEST_ID}-error`)).toBeNull();
  });

  test('unmounted before that task runs, it checks nothing', () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, 'networkState', 'get').mockReturnValue(
      HTMLMediaElement.NETWORK_NO_SOURCE,
    );
    const { unmount } = renderMedia();

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
