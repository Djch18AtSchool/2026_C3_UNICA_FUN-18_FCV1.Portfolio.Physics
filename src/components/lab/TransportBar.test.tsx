// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createClock, type ClockState } from '../../lib/physics/clock';
import { EXACT_TEXT } from '../../test-exact-text';
import TransportBar from './TransportBar';
import { useSimClock, type SimClock } from './useSimClock';

function LiveBar({ duration }: { duration: number }) {
  const clock = useSimClock(duration);
  return <TransportBar clock={clock} />;
}

function fakeClock(overrides: Partial<ClockState> = {}): SimClock {
  return {
    state: { ...createClock(4), ...overrides },
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    reset: vi.fn(),
    seek: vi.fn(),
    step: vi.fn(),
    setSpeed: vi.fn(),
    setLoop: vi.fn(),
  };
}

function timeline(): HTMLInputElement {
  return screen.getByRole('slider', { name: 'Línea de tiempo' });
}

describe('TransportBar', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('the play button turns from "Reproducir" into "Pausar" on click', () => {
    render(<LiveBar duration={2} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));

    expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reproducir' })).toBeNull();
  });

  test('exposes the playing state as data-playing on the root', () => {
    const { container } = render(<LiveBar duration={2} />);
    const root = container.firstElementChild as HTMLElement;

    expect(root).toHaveAttribute('data-playing', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(root).toHaveAttribute('data-playing', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(root).toHaveAttribute('data-playing', 'false');
  });

  test('moving the range to 500 calls seek with duration/2', () => {
    const clock = fakeClock({ duration: 4 });
    render(<TransportBar clock={clock} />);

    fireEvent.change(timeline(), { target: { value: '500' } });

    expect(clock.seek).toHaveBeenCalledWith(2);
  });

  test('dragging the range pauses a playing clock', () => {
    render(<LiveBar duration={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));

    fireEvent.change(timeline(), { target: { value: '250' } });

    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeInTheDocument();
    expect(screen.getByText('t = 0,500\u202Fs', EXACT_TEXT)).toBeInTheDocument();
  });

  test('the range spans 0..1000 and mirrors t/duration', () => {
    render(<TransportBar clock={fakeClock({ duration: 4, t: 1 })} />);

    const range = timeline();
    expect(range).toHaveAttribute('min', '0');
    expect(range).toHaveAttribute('max', '1000');
    expect(range).toHaveAttribute('step', '1');
    expect(range.value).toBe('250');
  });

  test('shows the time readout with three decimals and a comma', () => {
    render(<TransportBar clock={fakeClock({ duration: 4, t: 1.2344 })} />);

    expect(screen.getByText('t = 1,234\u202Fs', EXACT_TEXT)).toBeInTheDocument();
  });

  test('a run of less than 120 s keeps seconds in the readout and in aria-valuetext', () => {
    render(<TransportBar clock={fakeClock({ duration: 119.9, t: 60 })} />);

    expect(screen.getByText('t = 60,000\u202Fs', EXACT_TEXT)).toBeInTheDocument();
    expect(timeline()).toHaveAttribute('aria-valuetext', 't = 60,000\u202Fs');
  });

  test('a 22-minute run reads in minutes, in the readout and in aria-valuetext', () => {
    render(<TransportBar clock={fakeClock({ duration: 1369, t: 116 })} />);

    expect(screen.getByText('t = 1,93\u202Fmin', EXACT_TEXT)).toBeInTheDocument();
    expect(timeline()).toHaveAttribute('aria-valuetext', 't = 1,93\u202Fmin');
  });

  test('a flyby pass of 40 h reads in hours, not as 143 969,559 s', () => {
    render(<TransportBar clock={fakeClock({ duration: 144_000, t: 143_969.559 })} />);

    expect(screen.getByText('t = 39,99\u202Fh', EXACT_TEXT)).toBeInTheDocument();
    expect(timeline()).toHaveAttribute('aria-valuetext', 't = 39,99\u202Fh');
  });

  test('a run of a week reads in days', () => {
    render(<TransportBar clock={fakeClock({ duration: 604_800, t: 144_288 })} />);

    expect(timeline()).toHaveAttribute('aria-valuetext', 't = 1,67\u202Fd');
  });

  test('the range still seeks in seconds when the display is in days', () => {
    const clock = fakeClock({ duration: 604_800, t: 0 });
    render(<TransportBar clock={clock} />);

    fireEvent.change(timeline(), { target: { value: '250' } });

    expect(clock.seek).toHaveBeenCalledWith(151_200);
  });

  test('"Reiniciar" resets the clock', () => {
    const clock = fakeClock({ t: 3 });
    render(<TransportBar clock={clock} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));

    expect(clock.reset).toHaveBeenCalledTimes(1);
  });

  test('renders nothing when duration is 0', () => {
    const { container } = render(<TransportBar clock={fakeClock({ duration: 0 })} />);

    expect(container).toBeEmptyDOMElement();
  });

  test('a live clock with duration 0 renders nothing', () => {
    const { container } = render(<LiveBar duration={0} />);

    expect(container).toBeEmptyDOMElement();
  });
});
