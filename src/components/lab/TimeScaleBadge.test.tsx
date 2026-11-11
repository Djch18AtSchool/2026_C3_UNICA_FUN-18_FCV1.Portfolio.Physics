// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';
import { fakeClock } from '../../test-fake-clock';
import { plexViolations } from '../../test-glyphs';
import TimeScaleBadge, {
  SCALE_ANNOUNCE_DELAY_MS,
  TimeScaleBadgeSvg,
  TimeScaleStatus,
} from './TimeScaleBadge';
import { useSimClock } from './useSimClock';

const NNBSP = ' ';
const clockAt = (rate: number) => ({ ...fakeClock({ duration: 1369 }), rate });
const badge = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-time-scale-badge]');
/** The badge's parts (factor, words) joined by a space, as they read side by side. */
const badgeText = (container: HTMLElement) =>
  [...(badge(container)?.children ?? [])].map((part) => part.textContent).join(' ');

describe('TimeScaleBadge', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('shows the clock rate and the automatic word: «×20 cámara rápida»', () => {
    const { container } = render(<TimeScaleBadge clock={clockAt(20)} />);

    expect(badgeText(container)).toBe('×20 cámara rápida');
  });

  test('follows the speed setting of a live clock', () => {
    const { result } = renderHook(() => useSimClock(1369, { timeScale: 20 }));
    const { container, rerender } = render(<TimeScaleBadge clock={result.current} />);

    act(() => result.current.setSpeed(0.25));
    rerender(<TimeScaleBadge clock={result.current} />);

    expect(badgeText(container)).toBe('×5 cámara rápida');
  });

  test('says the reduced-motion pace, which is the one that plays', () => {
    setSettings({ motion: 'reduced' });
    const { result } = renderHook(() => useSimClock(1500, { timeScale: 20 }));

    const { container } = render(<TimeScaleBadge clock={result.current} />);

    expect(badgeText(container)).toBe('×100 cámara rápida');
  });

  test('an explicit factor wins over the clock', () => {
    const { container } = render(<TimeScaleBadge clock={clockAt(20)} factor={19_345} />);

    expect(badgeText(container)).toBe(`×19${NNBSP}000 cámara rápida`);
  });

  test('at ×1 the word is «velocidad real»; below 1, «cámara lenta»', () => {
    const { container, rerender } = render(<TimeScaleBadge factor={1} />);
    expect(badgeText(container)).toBe('×1 velocidad real');

    rerender(<TimeScaleBadge factor={0.25} />);

    expect(badgeText(container)).toBe('×0,25 cámara lenta');
  });

  test('takes the lab’s own words, with $…$ typeset, or none at all', async () => {
    const { container, rerender } = render(
      <TimeScaleBadge factor={12} label="1 s de simulación = 12 s reales" />,
    );
    expect(badgeText(container)).toBe('×12 1 s de simulación = 12 s reales');

    rerender(<TimeScaleBadge factor={12} label="paso de $r_p$" />);
    await waitFor(() => expect(badge(container)?.querySelector('.katex')).not.toBeNull());

    rerender(<TimeScaleBadge factor={12} label={null} />);
    expect(badgeText(container)).toBe('×12');
  });

  test('is an inert overlay hidden from screen readers, in the corner asked for', () => {
    const { container, rerender } = render(<TimeScaleBadge factor={20} />);
    expect(badge(container)).toHaveAttribute('aria-hidden', 'true');
    expect(badge(container)).toHaveClass('pointer-events-none', 'absolute', 'top-2', 'right-2');

    rerender(<TimeScaleBadge factor={20} corner="bottom-left" />);

    expect(badge(container)).toHaveClass('bottom-2', 'left-2');
  });

  test('says the scale in words to screen readers, outside the live region', () => {
    const { container } = render(<TimeScaleBadge factor={20} label="cámara rápida" />);

    const words = container.querySelector('[data-time-scale-words]');
    expect(words).toHaveTextContent('Escala de tiempo: 20 veces la velocidad real, cámara rápida');
    expect(words).toHaveClass('sr-only');
    expect(words).not.toHaveAttribute('aria-live');
  });

  test('the live region starts empty and stays so while the scale settles after loading', () => {
    vi.useFakeTimers();
    const { rerender } = render(<TimeScaleBadge factor={20} />);
    // Reduced motion is known only after mount: the clock's rate moves once, right away.
    rerender(<TimeScaleBadge factor={91} />);

    act(() => vi.advanceTimersByTime(SCALE_ANNOUNCE_DELAY_MS * 2));

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    vi.useRealTimers();
  });

  test('a later change of scale is said once it settles', () => {
    vi.useFakeTimers();
    const { rerender } = render(<TimeScaleBadge factor={20} />);
    act(() => vi.advanceTimersByTime(SCALE_ANNOUNCE_DELAY_MS));

    rerender(<TimeScaleBadge factor={5} />);
    act(() => vi.advanceTimersByTime(SCALE_ANNOUNCE_DELAY_MS));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Escala de tiempo: 5 veces la velocidad real, cámara rápida',
    );
    vi.useRealTimers();
  });

  test('a label is written once, with $…$, for the badge, the SVG and the spoken words', () => {
    const { container } = render(
      <>
        <TimeScaleBadge factor={12} label="paso de $r_p$" />
        <svg>
          <TimeScaleBadgeSvg factor={12} x={0} y={0} label="paso de $r_p$" />
        </svg>
      </>,
    );

    expect(container.querySelector('[data-time-scale-words]')).toHaveTextContent(
      'Escala de tiempo: 12 veces la velocidad real, paso de r sub p',
    );
    expect(container.querySelector('[data-notation="paso de r_p"]')).not.toBeNull();
  });

  test('a raw subscript outside $…$ fails loudly instead of being read as «r_p»', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TimeScaleStatus factor={12} label="paso de r_p" />)).toThrow(/\$…\$/u);
    error.mockRestore();
  });

  test('the overlay keeps 8 px from both sides in the rem scale', () => {
    const { container } = render(<TimeScaleBadge factor={20} />);

    expect(badge(container)).toHaveClass('max-w-[calc(100%-1rem)]');
  });

  test('every character it prints is one IBM Plex draws, in HTML and in SVG', () => {
    const { container } = render(
      <>
        <TimeScaleBadge factor={19_345} />
        <svg>
          <TimeScaleBadgeSvg factor={0.25} x={0} y={0} />
        </svg>
      </>,
    );

    expect(plexViolations(container)).toEqual([]);
  });

  test('the server and the first client render draw the same markup', async () => {
    const tree = <TimeScaleBadge clock={clockAt(20)} label="paso de $r_p$" />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(tree);
    document.body.append(container);
    const onRecoverableError = vi.fn();

    await act(async () => {
      hydrateRoot(container, tree, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    container.remove();
  });
});

describe('TimeScaleBadgeSvg', () => {
  afterEach(cleanup);

  const renderInSvg = (node: React.ReactNode) => render(<svg>{node}</svg>);

  test('draws the factor and the word as SVG text at the point given, hidden from readers', () => {
    const { container } = renderInSvg(<TimeScaleBadgeSvg factor={20} x={12} y={24} />);

    const group = container.querySelector('g[data-time-scale-badge]');
    expect(group).toHaveAttribute('aria-hidden', 'true');
    expect(group).toHaveAttribute('pointer-events', 'none');
    expect(badgeText(container)).toBe('×20 cámara rápida');
    expect(container.querySelector('text')).toHaveAttribute('x', '12');
    expect(container.querySelector('text')).toHaveAttribute('y', '24');
  });

  test('anchors at the end and draws a $…$ label with MathText', () => {
    const { container } = renderInSvg(
      <TimeScaleBadgeSvg factor={12_000} x={100} y={20} anchor="end" label="paso de $r_p$" />,
    );

    const texts = [...container.querySelectorAll('text')];
    expect(texts.every((text) => text.getAttribute('text-anchor') === 'end')).toBe(true);
    expect(container.querySelector('[data-notation="paso de r_p"]')).not.toBeNull();
  });

  test('reads the clock rate and has no word when label is null', () => {
    const { container } = renderInSvg(
      <TimeScaleBadgeSvg clock={clockAt(4)} x={0} y={0} label={null} />,
    );

    expect(badgeText(container)).toBe('×4');
  });
});

describe('TimeScaleStatus', () => {
  afterEach(cleanup);

  test('is the spoken scale alone, for a scene that draws TimeScaleBadgeSvg', () => {
    const { container } = render(<TimeScaleStatus clock={clockAt(1)} />);

    expect(container.querySelector('[data-time-scale-words]')).toHaveTextContent(
      'Escala de tiempo: velocidad real',
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
