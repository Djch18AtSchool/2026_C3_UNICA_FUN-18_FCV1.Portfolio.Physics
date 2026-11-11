// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { EXACT_TEXT } from '../../test-exact-text';
import { fakeClock } from '../../test-fake-clock';
import TransportBar from './TransportBar';
import type { TransportMarker } from './transportMarkers';
import { useSimClock } from './useSimClock';

/** Tema 6's «Tramo»: 26 s of its own clock, from 376 s of the cycle; its stop at 21 s (397 s). */
const STRETCH_START = 376;
const STRETCH = 26;
const NNBSP = ' ';
const STOP: readonly TransportMarker[] = [{ t: 21, label: 'Detención 3 de 17' }];

/** A live clock on the stretch, read from the cycle's start. */
function LiveStretch() {
  const clock = useSimClock(STRETCH);
  return <TransportBar clock={clock} timeUnit="s" markers={STOP} timeOrigin={STRETCH_START} />;
}

const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const announcer = () => screen.getByRole('status');

describe('TransportBar timeOrigin', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('shifts the t readout and aria-valuetext of the plain bar by the origin', () => {
    render(
      <TransportBar
        clock={fakeClock({ duration: STRETCH, t: 13 })}
        timeUnit="s"
        timeOrigin={STRETCH_START}
      />,
    );

    expect(timeline()).toHaveAttribute('aria-valuetext', `t = 389,00${NNBSP}s`);
    expect(screen.getByText(`t = 389,00${NNBSP}s`, EXACT_TEXT)).toBeInTheDocument();
  });

  test('the timeline stays on the clock: its position and its seeks ignore the origin', () => {
    const clock = fakeClock({ duration: STRETCH, t: 13 });
    render(<TransportBar clock={clock} timeUnit="s" timeOrigin={STRETCH_START} />);

    expect(timeline()).toHaveValue('500');
    fireEvent.change(timeline(), { target: { value: '250' } });
    expect(clock.seek).toHaveBeenCalledWith(STRETCH / 4);
  });

  test('with markers, the event stays on the clock and is read at the shifted time', () => {
    render(
      <TransportBar
        clock={fakeClock({ duration: STRETCH, t: 21 })}
        timeUnit="s"
        markers={STOP}
        timeOrigin={STRETCH_START}
      />,
    );

    expect(timeline()).toHaveAttribute('aria-valuetext', `t = 397,00${NNBSP}s · Detención 3 de 17`);
    expect(screen.getByText(`t = 397,00${NNBSP}s`, EXACT_TEXT)).toBeInTheDocument();
  });

  test('a jump seeks the clock time and announces the shifted one', () => {
    render(<LiveStretch />);

    fireEvent.click(screen.getByRole('button', { name: 'Evento siguiente' }));

    expect(timeline()).toHaveValue(String(Math.round((21 / STRETCH) * 1000)));
    expect(announcer()).toHaveTextContent(`Detención 3 de 17 · t = 397,00${NNBSP}s`, {
      normalizeWhitespace: false,
    });
  });

  test('at an end, the last event is named at its shifted time', () => {
    render(
      <TransportBar
        clock={fakeClock({ duration: STRETCH, t: STRETCH })}
        timeUnit="s"
        markers={STOP}
        timeOrigin={STRETCH_START}
      />,
    );

    act(() => screen.getByRole('button', { name: 'Evento siguiente' }).click());

    expect(announcer()).toHaveTextContent(
      `No hay evento siguiente; el último es Detención 3 de 17 · t = 397,00${NNBSP}s`,
      { normalizeWhitespace: false },
    );
  });

  test('the readout keeps room for the longest shifted time, the run’s end', () => {
    render(
      <TransportBar
        clock={fakeClock({ duration: STRETCH, t: 0 })}
        timeUnit="s"
        markers={STOP}
        timeOrigin={STRETCH_START}
      />,
    );

    const readout = screen.getByText(`t = 376,00${NNBSP}s`, EXACT_TEXT);
    expect(readout.style.minWidth).toBe(`${[...`t = 402,00${NNBSP}s`].length}ch`);
  });

  test('an origin of 0, or one that is not a finite number, is the bar without it', () => {
    const clock = fakeClock({ duration: STRETCH, t: 13 });
    const plain = renderToString(<TransportBar clock={clock} markers={STOP} />);

    for (const timeOrigin of [0, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        renderToString(<TransportBar clock={clock} markers={STOP} timeOrigin={timeOrigin} />),
      ).toBe(plain);
    }
  });
});
