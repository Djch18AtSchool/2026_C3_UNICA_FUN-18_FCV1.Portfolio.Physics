// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { EXACT_TEXT } from '../../test-exact-text';
import { fakeClock } from '../../test-fake-clock';
import TransportBar from './TransportBar';
import type { TransportMarker } from './transportMarkers';
import { useSimClock } from './useSimClock';

/** A 40 s playback of 80 h of orbit: one playback second is two hours. */
const PLAYBACK = 40;
const HOURS_PER_SECOND = 2;
const orbitHours = (t: number) => `t = ${String(t * HOURS_PER_SECOND).replace('.', ',')} h`;
const DUMP: readonly TransportMarker[] = [{ t: 30, label: 'Descarga' }];

const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const eventText = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-transport-event]');

function LiveOrbit() {
  const clock = useSimClock(PLAYBACK);
  return <TransportBar clock={clock} markers={DUMP} formatTime={orbitHours} />;
}

describe('TransportBar formatTime', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('writes the readout and aria-valuetext in the lab’s reading', () => {
    render(
      <TransportBar clock={fakeClock({ duration: PLAYBACK, t: 11 })} formatTime={orbitHours} />,
    );

    expect(screen.getByText('t = 22 h', EXACT_TEXT)).toBeInTheDocument();
    expect(timeline()).toHaveAttribute('aria-valuetext', 't = 22 h');
  });

  test('the timeline, its seeks and the marks stay on the clock', () => {
    const clock = fakeClock({ duration: PLAYBACK, t: 10 });
    const { container } = render(
      <TransportBar clock={clock} markers={DUMP} formatTime={orbitHours} />,
    );

    expect(timeline()).toHaveValue('250');
    fireEvent.change(timeline(), { target: { value: '500' } });
    expect(clock.seek).toHaveBeenCalledWith(PLAYBACK / 2);
    const mark = container.querySelector<HTMLElement>('[data-transport-mark]');
    expect(mark?.style.getPropertyValue('--mark-at')).toBe(String(30 / PLAYBACK));
  });

  test('a jump announces the event at the lab’s reading', () => {
    render(<LiveOrbit />);

    fireEvent.click(screen.getByRole('button', { name: 'Evento siguiente' }));

    expect(screen.getByRole('status')).toHaveTextContent('Descarga · t = 60 h');
    expect(timeline()).toHaveAttribute('aria-valuetext', 't = 60 h · Descarga');
  });

  test('composes with timeOrigin: the format receives the shifted time', () => {
    render(
      <TransportBar
        clock={fakeClock({ duration: PLAYBACK, t: 1 })}
        timeOrigin={10}
        formatTime={orbitHours}
      />,
    );

    expect(timeline()).toHaveAttribute('aria-valuetext', 't = 22 h');
  });

  test('a format that gives back no text leaves the transport’s own «t = …»', () => {
    const clock = fakeClock({ duration: PLAYBACK, t: 11 });

    expect(renderToString(<TransportBar clock={clock} formatTime={() => ''} />)).toBe(
      renderToString(<TransportBar clock={clock} />),
    );
  });
});

describe('TransportBar next event', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('between events, the row names the next one with its reading, muted and hidden', () => {
    const { container } = render(
      <TransportBar clock={fakeClock({ duration: PLAYBACK, t: 10 })} markers={DUMP} />,
    );

    const text = eventText(container);
    expect(text).toHaveTextContent('Siguiente: Descarga · t = 30,000 s');
    expect(text).toHaveAttribute('data-transport-event', 'next');
    expect(text).toHaveAttribute('aria-hidden', 'true');
    expect(text).toHaveClass('text-fg-muted');
  });

  test('on the event, the row names it in the full ink; after the last, nothing', () => {
    const { container, unmount } = render(
      <TransportBar clock={fakeClock({ duration: PLAYBACK, t: 30 })} markers={DUMP} />,
    );
    expect(eventText(container)).toHaveTextContent(/^Descarga$/);
    expect(eventText(container)).toHaveAttribute('data-transport-event', 'at');
    expect(eventText(container)).toHaveClass('text-fg');
    unmount();

    const after = render(
      <TransportBar clock={fakeClock({ duration: PLAYBACK, t: 35 })} markers={DUMP} />,
    );
    expect(eventText(after.container)).toBeEmptyDOMElement();
  });

  test('the event buttons draw a mark on a track, not ⏮ ⏭', () => {
    const { container } = render(
      <TransportBar clock={fakeClock({ duration: PLAYBACK, t: 10 })} markers={DUMP} />,
    );

    expect(
      [...container.querySelectorAll('[data-event-icon]')].map((icon) =>
        icon.getAttribute('data-event-icon'),
      ),
    ).toEqual(['previous', 'next']);
  });

  test('a live run keeps the next event in step with the time', () => {
    const { container } = render(<LiveOrbit />);
    expect(eventText(container)).toHaveTextContent('Siguiente: Descarga · t = 60 h');

    act(() => screen.getByRole('button', { name: 'Evento siguiente' }).click());

    expect(eventText(container)).toHaveTextContent(/^Descarga$/);
  });
});
