// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { EXACT_TEXT } from '../../test-exact-text';
import { fakeClock } from '../../test-fake-clock';
import { plexViolations } from '../../test-glyphs';
import TransportBar from './TransportBar';
import type { TransportMarker } from './transportMarkers';
import { useSimClock } from './useSimClock';

const UDDS = 1369;
const NNBSP = ' ';
const STOPS: readonly TransportMarker[] = [
  { t: 120, label: 'Detención' },
  { t: 312, label: 'Detención' },
  { t: 500, label: 'Detención' },
];

function LiveBar({ markers = STOPS }: { markers?: readonly TransportMarker[] }) {
  const clock = useSimClock(UDDS);
  return <TransportBar clock={clock} timeUnit="s" markers={markers} />;
}

const previous = () => screen.getByRole('button', { name: 'Evento anterior' });
const next = () => screen.getByRole('button', { name: 'Evento siguiente' });
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const announcer = () => screen.getByRole('status');
const marks = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[data-transport-marks] [data-transport-mark]'),
];

describe('TransportBar with markers', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('without markers there are no event buttons, marks or announcer', () => {
    const { container } = render(<TransportBar clock={fakeClock({ duration: UDDS })} />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(container.querySelector('[data-transport-marks]')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('an empty or wholly invalid list behaves as no markers', () => {
    const { container } = render(
      <TransportBar
        clock={fakeClock({ duration: UDDS })}
        markers={[{ t: UDDS + 1, label: 'Después' }]}
      />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(container.querySelector('[data-transport-marks]')).toBeNull();
  });

  test('draws one hidden, inert mark per marker in range, placed by its time', () => {
    const { container } = render(
      <TransportBar
        clock={fakeClock({ duration: UDDS })}
        markers={[...STOPS, { t: -3, label: 'Antes' }, { t: 900, label: 'Pico', kind: 'peak' }]}
      />,
    );

    const layer = container.querySelector('[data-transport-marks]');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(layer).toHaveClass('pointer-events-none');
    expect(marks(container).map((mark) => mark.dataset.kind)).toEqual([
      'stop',
      'stop',
      'stop',
      'peak',
    ]);
    expect(marks(container)[1].style.getPropertyValue('--mark-at')).toBe(String(312 / UDDS));
  });

  test('«Evento siguiente» seeks to the next marker after the live time', () => {
    const clock = fakeClock({ duration: UDDS, t: 0 });
    render(<TransportBar clock={clock} markers={STOPS} />);
    // Playing: the live time runs ahead of the settled one.
    act(() => clock.frame.set(200));

    fireEvent.click(next());

    expect(clock.seek).toHaveBeenCalledWith(312);
  });

  test('«Evento anterior» seeks to the marker before the live time', () => {
    const clock = fakeClock({ duration: UDDS, t: 400 });
    render(<TransportBar clock={clock} markers={STOPS} />);

    fireEvent.click(previous());

    expect(clock.seek).toHaveBeenCalledWith(312);
  });

  test('standing on a marker, the buttons go to its neighbours, never to itself', () => {
    render(<LiveBar />);

    fireEvent.click(next());
    fireEvent.click(next());
    expect(timeline()).toHaveAttribute('aria-valuetext', `t = 312${NNBSP}s · Detención 2 de 3`);

    fireEvent.click(previous());
    expect(timeline()).toHaveAttribute('aria-valuetext', `t = 120${NNBSP}s · Detención 1 de 3`);
  });

  test('announces the event and its time in a status region', () => {
    render(<LiveBar />);
    expect(announcer()).toBeEmptyDOMElement();

    fireEvent.click(next());
    fireEvent.click(next());

    expect(announcer()).toHaveTextContent(`Detención 2 de 3 · t = 312${NNBSP}s`, {
      normalizeWhitespace: false,
    });
  });

  test('at the ends the buttons are aria-disabled, keep their focus and do nothing', () => {
    const clock = fakeClock({ duration: UDDS, t: 500 });
    render(<TransportBar clock={clock} markers={STOPS} />);
    next().focus();

    fireEvent.click(next());

    expect(next()).toHaveAttribute('aria-disabled', 'true');
    expect(next()).not.toBeDisabled();
    expect(next()).toHaveFocus();
    expect(clock.seek).not.toHaveBeenCalled();
    expect(previous()).toHaveAttribute('aria-disabled', 'false');
  });

  test('before the first marker «Evento anterior» is aria-disabled', () => {
    render(<TransportBar clock={fakeClock({ duration: UDDS, t: 0 })} markers={STOPS} />);

    expect(previous()).toHaveAttribute('aria-disabled', 'true');
    expect(next()).toHaveAttribute('aria-disabled', 'false');
  });

  test('a button whose target the live time already passed does nothing', () => {
    const clock = fakeClock({ duration: UDDS, t: 400 });
    render(<TransportBar clock={clock} markers={STOPS} />);
    act(() => clock.frame.set(600));

    fireEvent.click(next());

    expect(clock.seek).not.toHaveBeenCalled();
  });

  test('the timeline names the event only while the time stands on it', () => {
    const { rerender } = render(
      <TransportBar clock={fakeClock({ duration: UDDS, t: 312 })} timeUnit="s" markers={STOPS} />,
    );
    expect(timeline()).toHaveAttribute('aria-valuetext', `t = 312${NNBSP}s · Detención 2 de 3`);

    rerender(
      <TransportBar clock={fakeClock({ duration: UDDS, t: 330 })} timeUnit="s" markers={STOPS} />,
    );

    expect(timeline()).toHaveAttribute('aria-valuetext', `t = 330${NNBSP}s`);
  });

  test('shows the event the time stands on beside the readout, hidden from screen readers', () => {
    const { container } = render(
      <TransportBar clock={fakeClock({ duration: UDDS, t: 312 })} timeUnit="s" markers={STOPS} />,
    );

    const event = container.querySelector('[data-transport-event]');
    expect(event).toHaveTextContent('Detención 2 de 3');
    expect(event).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(`t = 312${NNBSP}s`, EXACT_TEXT)).toBeInTheDocument();
  });

  test('pressing again on the same event says it again', () => {
    render(<LiveBar />);
    fireEvent.click(next());
    const first = announcer().firstElementChild;

    fireEvent.change(timeline(), { target: { value: '0' } });
    fireEvent.click(next());

    expect(announcer()).toHaveTextContent(`Detención 1 de 3 · t = 120${NNBSP}s`, {
      normalizeWhitespace: false,
    });
    // A new node in the live region: screen readers speak an addition, even of the same text.
    expect(announcer().firstElementChild).not.toBe(first);
  });

  test('at an end, a press says there is no further event and which one is the last', () => {
    render(<LiveBar />);
    for (let i = 0; i < STOPS.length; i += 1) fireEvent.click(next());

    fireEvent.click(next());

    expect(announcer()).toHaveTextContent(
      `No hay evento siguiente; el último es Detención 3 de 3 · t = 500${NNBSP}s`,
      { normalizeWhitespace: false },
    );
  });

  test('before the first event, «Evento anterior» says which one is the first', () => {
    render(<LiveBar />);

    fireEvent.click(previous());

    expect(announcer()).toHaveTextContent(
      `No hay evento anterior; el primero es Detención 1 de 3 · t = 120${NNBSP}s`,
      { normalizeWhitespace: false },
    );
  });

  test('the announcement is cleared once the time leaves its event (drag or play)', () => {
    render(<LiveBar />);
    fireEvent.click(next());
    expect(announcer()).not.toBeEmptyDOMElement();

    fireEvent.change(timeline(), { target: { value: '500' } });

    expect(announcer()).toBeEmptyDOMElement();
  });

  test('the announcement is cleared when playback starts', () => {
    render(<LiveBar />);
    fireEvent.click(next());

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));

    expect(announcer()).toBeEmptyDOMElement();
  });

  test('the event buttons carry a tooltip with their name', () => {
    render(<LiveBar />);

    expect(previous()).toHaveAttribute('title', 'Evento anterior');
    expect(next()).toHaveAttribute('title', 'Evento siguiente');
  });

  test('the marks are borders, which forced colors keep, and lie under the range', () => {
    const { container } = render(
      <LiveBar markers={[...STOPS, { t: 900, label: 'Pico', kind: 'peak' }]} />,
    );
    const layer = container.querySelector('[data-transport-marks]');

    // The range comes after the marks: it paints over them and takes a click on one.
    expect(layer?.nextElementSibling).toBe(timeline());
    expect(timeline()).toHaveClass('h-10');
    expect(timeline()).not.toHaveClass('h-6');
    for (const mark of marks(container)) {
      expect(mark.className).toMatch(/\bborder-/u);
      expect(mark.className).not.toMatch(/\bbg-/u);
    }
  });

  test('every character it prints is one IBM Plex draws', () => {
    const { container } = render(<LiveBar />);

    fireEvent.click(next());

    expect(plexViolations(container)).toEqual([]);
  });

  test('the server and the first client render draw the same markup', async () => {
    const clock = fakeClock({ duration: UDDS, t: 312 });
    const bar = <TransportBar clock={clock} timeUnit="s" markers={STOPS} />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(bar);
    document.body.append(container);
    const onRecoverableError = vi.fn();

    await act(async () => {
      hydrateRoot(container, bar, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(marks(container)).toHaveLength(STOPS.length);
    container.remove();
  });
});
