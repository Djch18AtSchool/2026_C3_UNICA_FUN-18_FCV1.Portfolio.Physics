// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fakeClock } from '../../test-fake-clock';
import { plexViolations } from '../../test-glyphs';
import TransportBar from './TransportBar';
import type { TransportMarker } from './transportMarkers';

const UDDS = 1369;
const ONE_STOP: readonly TransportMarker[] = [{ t: 21, label: 'Detención' }];
const TWO_STOPS: readonly TransportMarker[] = [
  { t: 120, label: 'Detención' },
  { t: 312, label: 'Detención' },
];

const speed = () => screen.getByRole('combobox', { name: 'Velocidad de reproducción' });
const pairButtons = () =>
  screen.queryAllByRole('button', { name: /^Evento (anterior|siguiente)$/ });

/** Every control and the readout of the bar, in the order of the DOM (of reading and of Tab). */
function controlsInOrder(container: HTMLElement): string[] {
  return [...container.querySelectorAll('button, select, input, [data-transport-time]')].map(
    (node) =>
      node.getAttribute('aria-label') ?? (node.hasAttribute('data-transport-time') ? 't' : '?'),
  );
}

describe('TransportBar in one row', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('the speed is a compact native select after «Reiniciar», with the clock’s speed chosen', () => {
    render(<TransportBar clock={fakeClock({ duration: 10, speed: 0.5 })} />);

    expect(speed()).toHaveValue('0.5');
    expect([...speed().querySelectorAll('option')].map((option) => option.textContent)).toEqual([
      '0,25×',
      '0,5×',
      '1×',
      '1,5×',
      '2×',
    ]);
    expect(speed()).toHaveClass('h-11');
  });

  test('choosing a speed sets it on the clock', () => {
    const clock = fakeClock({ duration: 10 });
    render(<TransportBar clock={clock} />);

    fireEvent.change(speed(), { target: { value: '2' } });

    expect(clock.setSpeed).toHaveBeenCalledWith(2);
  });

  test('a lab offers its own speeds', () => {
    render(<TransportBar clock={fakeClock({ duration: 10, speed: 8 })} speeds={[1, 4, 8]} />);

    expect([...speed().querySelectorAll('option')].map((option) => option.value)).toEqual([
      '1',
      '4',
      '8',
    ]);
    expect(speed()).toHaveValue('8');
  });

  test('without events: play, reset, speed, timeline and t, in that order; no event line', () => {
    const { container } = render(<TransportBar clock={fakeClock({ duration: 10 })} />);

    expect(controlsInOrder(container)).toEqual([
      'Reproducir',
      'Reiniciar',
      'Velocidad de reproducción',
      'Línea de tiempo',
      't',
    ]);
    expect(container.querySelector('[data-transport-event]')).toBeNull();
    expect(container.querySelector('[data-transport-events]')).toBeNull();
  });

  test('with one event: its mark and its line, but no pair and no status region', () => {
    const { container } = render(
      <TransportBar clock={fakeClock({ duration: UDDS })} timeUnit="s" markers={ONE_STOP} />,
    );

    expect(container.querySelectorAll('[data-transport-mark]')).toHaveLength(1);
    expect(container.querySelector('[data-transport-event]')).toHaveTextContent(
      /^Siguiente: Detención · t = 21\ss$/u,
    );
    expect(container.querySelector('[data-transport-events]')).not.toBeNull();
    expect(pairButtons()).toEqual([]);
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('from two events the joined pair closes the row, after the timeline and t', () => {
    const { container } = render(
      <TransportBar clock={fakeClock({ duration: UDDS })} markers={TWO_STOPS} />,
    );

    expect(controlsInOrder(container)).toEqual([
      'Reproducir',
      'Reiniciar',
      'Velocidad de reproducción',
      'Línea de tiempo',
      't',
      'Evento anterior',
      'Evento siguiente',
    ]);
    const pair = container.querySelector('[data-transport-pair]') as HTMLElement;
    const [previous, next] = within(pair).getAllByRole('button');
    // Joined: the inner corners are square and the second drops its shared left border.
    expect(previous).toHaveClass('rounded-r-none');
    expect(next).toHaveClass('rounded-l-none', 'border-l-0');
    expect(within(pair).getByRole('status')).toBeInTheDocument();
  });

  test('the event line sits after the pair in the DOM (it is aria-hidden: the timeline says it)', () => {
    const { container } = render(
      <TransportBar clock={fakeClock({ duration: UDDS, t: 312 })} markers={TWO_STOPS} />,
    );
    const line = container.querySelector('[data-transport-event]') as HTMLElement;
    const pair = container.querySelector('[data-transport-pair]') as HTMLElement;

    expect(line).toHaveAttribute('aria-hidden', 'true');
    expect(line).toHaveAttribute('data-transport-event', 'at');
    expect(pair.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('after the last event the line is kept, empty, so the bar never changes height', () => {
    const { container } = render(
      <TransportBar clock={fakeClock({ duration: UDDS, t: 900 })} markers={TWO_STOPS} />,
    );
    const line = container.querySelector('[data-transport-event]') as HTMLElement;

    expect(line).toHaveAttribute('data-transport-event', '');
    expect(line.textContent).toBe(' ');
    expect(line).not.toHaveAttribute('title');
    expect(line.className).toMatch(/\bmin-h-11\b/u);
  });

  test('on a phone the event line is as tall as the pair (44 px), so one event or two never changes the bar', () => {
    const { container } = render(
      <TransportBar clock={fakeClock({ duration: UDDS, t: 100 })} markers={[TWO_STOPS[0]]} />,
    );
    const line = container.querySelector('[data-transport-event]') as HTMLElement;

    expect(container.querySelector('[data-transport-pair]')).toBeNull();
    // The pair's buttons are 44 px (ICON_BUTTON): its row is never taller than the lone line.
    expect(line.className).toMatch(/(?:^|\s)min-h-11(?:\s|$)/u);
    expect(line.className).toMatch(/@xl\/transport:min-h-0\b/u);
  });

  test('the t readout reserves its longest text also without events', () => {
    render(<TransportBar clock={fakeClock({ duration: UDDS })} timeUnit="s" />);

    // «t = 1 369 s»: 11 characters of the mono face.
    expect(screen.getByText(/^t = 0\ss$/u).style.minWidth).toBe('11ch');
  });

  test('the row sets itself by its own width (a container), not by the window', () => {
    const { container } = render(<TransportBar clock={fakeClock({ duration: 10 })} />);
    const root = screen.getByRole('group', { name: 'Reproducción' });

    expect(root).toHaveClass('@container/transport');
    expect(root.firstElementChild?.className).toMatch(/@xl\/transport:/u);
    expect(container.innerHTML).not.toMatch(/\b(sm|md|lg|xl):/u);
  });

  test('every character it prints, the speeds included, is one IBM Plex draws', () => {
    const { container } = render(
      <TransportBar clock={fakeClock({ duration: UDDS })} markers={TWO_STOPS} />,
    );

    expect(plexViolations(container)).toEqual([]);
  });
});
