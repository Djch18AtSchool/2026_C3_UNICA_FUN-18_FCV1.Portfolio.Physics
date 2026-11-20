// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { plexViolations } from '../../../test-glyphs';
import { createFrameStore } from '../../lab/frameStore';
import { activeModel } from './bridgeFrames';
import BridgeScene, { type BridgeSceneProps } from './BridgeScene';
import { f0KeyTarget, snapToLimit } from './FrequencyRuler';
import { DEFAULT_SETTINGS, RESONANCE_LIMITS, type ResonanceSettings } from './resonancePresets';

const SWEEP = activeModel(DEFAULT_SETTINGS);
const settingsFor = (patch: Partial<ResonanceSettings>): ResonanceSettings => ({
  ...DEFAULT_SETTINGS,
  ...patch,
});

function props(patch: Partial<BridgeSceneProps> = {}): BridgeSceneProps {
  return {
    active: SWEEP,
    frame: createFrameStore(0),
    t: 0,
    showEnvelope: true,
    f0: 1,
    f0Limits: RESONANCE_LIMITS.sweep.f0,
    decimals: 2,
    onF0Change: () => undefined,
    ...patch,
  };
}

/** Identity CTM on every svg: client pixels are viewBox units. */
function mockIdentityCtm(): void {
  for (const svg of document.querySelectorAll('svg')) {
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
    });
  }
}

/** Text with plain spaces: numbers keep their unit with U+202F. */
const spaced = (text: string | null) => (text ?? '').replace(/\s/g, ' ');
const handle = () => screen.getByRole('slider', { name: 'Frecuencia natural f sub 0' });
const allPaths = () =>
  [...document.querySelectorAll('path')].map((path) => path.getAttribute('d') ?? '');

describe('BridgeScene', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test('«Barrido»: one deck, the shaker and the drive moving on the ruler, said in words', () => {
    const frame = createFrameStore(0);
    render(<BridgeScene {...props({ frame })} />);

    expect(screen.getByTestId('bridge-scene')).toHaveAttribute('data-mode', 'barrido');
    expect(screen.getByTestId('deck-puente')).toBeInTheDocument();
    expect(screen.getByTestId('shaker')).toBeInTheDocument();
    expect(screen.queryByTestId('soldiers')).toBeNull();
    expect(spaced(screen.getByRole('img').getAttribute('aria-label'))).toMatch(
      /^Puente de prueba de f sub 0 = 1,00 Hz con un vibrador/,
    );
    const driveAt = () => Number(screen.getByTestId('ruler-drive').getAttribute('data-x'));
    const before = driveAt();
    act(() => frame.set(SWEEP.duration));
    expect(driveAt()).toBeGreaterThan(before);
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('«Tropa»: one soldier per N, Sétra’s band, the march pace and the 25 cm bar', () => {
    const active = activeModel(settingsFor({ mode: 'tropa' }));
    render(<BridgeScene {...props({ active, f0: 2, f0Limits: RESONANCE_LIMITS.troop.f0 })} />);

    expect(screen.getByTestId('soldiers')).toHaveAttribute('data-count', '60');
    expect(screen.getByTestId('scale-bar')).toHaveTextContent('25 cm');
    expect(screen.getByTestId('frequency-ruler')).toHaveTextContent('Sétra: riesgo máximo');
    expect(screen.getByTestId('frequency-ruler')).toHaveTextContent('paso militar');
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('«Tropa» without damping at the pace: the deck is held at the drawing’s edge, no NaN', () => {
    const settings = settingsFor({
      mode: 'tropa',
      troop: { ...DEFAULT_SETTINGS.troop, n: 200, zeta: 0 },
    });
    const active = activeModel(settings);
    render(<BridgeScene {...props({ active, frame: createFrameStore(active.duration), f0: 2 })} />);

    expect(screen.getByTestId('deck-puente')).toHaveAttribute('data-clamped', 'true');
    expect(screen.getByText('fuera de escala')).toBeInTheDocument();
    for (const d of allPaths()) expect(d).not.toMatch(/NaN|Infinity/);
  });

  test('«Filtro ZV»: two decks with their titles, the ± 5 % band and f_ZV; the pushes show', () => {
    const active = activeModel(settingsFor({ mode: 'filtro-zv' }));
    const frame = createFrameStore(0.05);
    render(<BridgeScene {...props({ active, frame })} />);

    expect(screen.getByTestId('deck-un-empujon')).toBeInTheDocument();
    expect(screen.getByTestId('deck-dos-empujones')).toBeInTheDocument();
    expect(screen.getByTestId('bridge-scene')).toHaveTextContent('Dos empujones (filtro ZV)');
    expect(screen.getByTestId('frequency-ruler')).toHaveTextContent('±5 %');
    expect(screen.getByTestId('pushes').querySelectorAll('line')).toHaveLength(2);
    act(() => frame.set(3));
    expect(screen.getByTestId('pushes').querySelectorAll('line')).toHaveLength(0);
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('without the envelope setting the band is not drawn', () => {
    render(<BridgeScene {...props({ showEnvelope: false })} />);
    expect(document.querySelector('[data-envelope]')).toBeNull();
  });
});

describe('the f0 knob', () => {
  afterEach(cleanup);

  test('says its value and moves a step with the arrows, five with Shift, to the ends with Home/End', () => {
    const onF0Change = vi.fn();
    render(<BridgeScene {...props({ onF0Change })} />);

    expect(spaced(handle().getAttribute('aria-valuetext'))).toBe('f sub 0 = 1,00 Hz');
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    fireEvent.keyDown(handle(), { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(handle(), { key: 'End' });
    fireEvent.keyDown(handle(), { key: 'Home' });
    fireEvent.keyDown(handle(), { key: 'a' });

    expect(onF0Change.mock.calls.map(([f0]) => f0)).toEqual([1.05, 0.75, 2, 0.5]);
  });

  test('is dragged along the ruler, snapped to the slider’s grid', () => {
    const onF0Change = vi.fn();
    render(<BridgeScene {...props({ onF0Change })} />);
    mockIdentityCtm();
    const knob = handle().querySelector('[data-knob]') as SVGCircleElement;
    const start = { x: Number(knob.getAttribute('cx')), y: Number(knob.getAttribute('cy')) };

    fireEvent.pointerDown(handle(), { pointerId: 1, clientX: start.x, clientY: start.y });
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: start.x + 100, clientY: start.y });
    fireEvent.pointerUp(handle(), { pointerId: 1, clientX: start.x + 100, clientY: start.y });

    const [moved] = onF0Change.mock.calls.at(-1) as [number];
    expect(moved).toBeGreaterThan(1);
    expect(Math.round(moved / 0.05) * 0.05).toBeCloseTo(moved, 9);
  });

  test('the grid helpers clamp to the limits', () => {
    const limits = RESONANCE_LIMITS.troop.f0;
    expect(snapToLimit(5, limits)).toBe(3);
    expect(snapToLimit(1.977, limits)).toBe(2);
    expect(f0KeyTarget('PageUp', false, 2, limits)).toBe(2.25);
    expect(f0KeyTarget('Tab', false, 2, limits)).toBeUndefined();
  });
});
