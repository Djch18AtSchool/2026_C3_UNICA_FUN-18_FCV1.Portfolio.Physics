// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Preset } from '../../lib/presets';
import { resetSettingsForTests, setSettings } from '../../lib/settingsStore';
import { installDialogPolyfill } from '../../test-dialog';
import LabPresets from './LabPresets';
import LabShell from './LabShell';
import { PRESET_TRANSITION_ID, PRESET_TRANSITION_MS } from './presetTransition';

const PRESETS: readonly Preset<number>[] = [
  { id: 'tierra', name: 'Tierra', values: 9.81 },
  { id: 'luna', name: 'Luna', values: 1.62 },
  { id: 'marte', name: 'Marte', values: 3.71 },
];

/** A lab with presets, an edit and «Restablecer», as the nine labs wire them. */
function PresetLab({ inShell = true }: { inShell?: boolean }) {
  const [g, setG] = useState(PRESETS[0].values);
  const activeId = PRESETS.find((preset) => preset.values === g)?.id;
  const presets = (
    <>
      <LabPresets
        id="g-preset"
        presets={PRESETS}
        activeId={activeId}
        onSelect={(p) => setG(p.values)}
      />
      <button type="button" onClick={() => setG((value) => value + 1)}>
        Editar
      </button>
    </>
  );
  if (!inShell) return presets;
  return (
    <LabShell
      title="Laboratorio de prueba"
      testId="test-lab"
      readouts={[{ id: 'g', label: 'g', value: g, unit: 'm/s²' }]}
      levels={{ params: <p>g</p>, scenario: presets, display: [] }}
      onReset={() => setG(PRESETS[0].values)}
    >
      <svg data-testid="scene">
        <circle r={g} />
      </svg>
    </LabShell>
  );
}

interface FakeAnimation {
  id: string;
  target: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
}

/** jsdom has no Web Animations: a record of every `animate` call, with its target. */
function stubAnimate() {
  const played: FakeAnimation[] = [];
  const running = new Map<Element, FakeAnimation[]>();
  const animate = function (
    this: Element,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    const animation: FakeAnimation = { id: '', target: this, keyframes, options, cancel: vi.fn() };
    played.push(animation);
    running.set(this, [...(running.get(this) ?? []), animation]);
    return animation as unknown as Animation;
  };
  const getAnimations = function (this: Element) {
    return (running.get(this) ?? []) as unknown as Animation[];
  };
  Object.defineProperty(Element.prototype, 'animate', { value: animate, configurable: true });
  Object.defineProperty(Element.prototype, 'getAnimations', {
    value: getAnimations,
    configurable: true,
  });
  return played;
}

const canvas = () => screen.getByTestId('scene').closest('[data-lab-canvas]');
const chip = (name: string) => screen.getByRole('button', { name });

describe('the preset transition', () => {
  let uninstall: () => void;
  let played: FakeAnimation[];
  beforeEach(() => {
    uninstall = installDialogPolyfill();
    played = stubAnimate();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    localStorage.clear();
    resetSettingsForTests();
    delete (Element.prototype as Partial<Element>).animate;
    delete (Element.prototype as Partial<Element>).getAnimations;
    vi.unstubAllGlobals();
  });

  test('choosing another preset fades the canvas in, once, in 200 ms, with the new values already drawn', () => {
    render(<PresetLab />);
    expect(played).toHaveLength(0);

    fireEvent.click(chip('Luna'));

    expect(played).toHaveLength(1);
    const [animation] = played;
    expect(animation.target).toBe(canvas());
    expect(animation.id).toBe(PRESET_TRANSITION_ID);
    expect(animation.options.duration).toBe(PRESET_TRANSITION_MS);
    expect(PRESET_TRANSITION_MS).toBe(200);
    expect(animation.keyframes.at(-1)).toEqual({ opacity: 1 });
    expect(Number(animation.keyframes[0].opacity)).toBeLessThan(1);
    // Only opacity: nothing moves, so no box a test or a reader measures changes.
    expect(animation.keyframes.flatMap((frame) => Object.keys(frame))).toEqual([
      'opacity',
      'opacity',
    ]);
    expect(screen.getByTestId('scene').querySelector('circle')).toHaveAttribute('r', '1.62');
  });

  test('leaves nothing behind: no attribute on the canvas, and a quick second choice replaces the first', () => {
    render(<PresetLab />);
    const before = [...canvas()!.attributes].map((attribute) => attribute.name);

    fireEvent.click(chip('Luna'));
    fireEvent.click(chip('Marte'));

    expect(played).toHaveLength(2);
    expect(played[0].cancel).toHaveBeenCalledTimes(1);
    expect(played[1].cancel).not.toHaveBeenCalled();
    expect([...canvas()!.attributes].map((attribute) => attribute.name)).toEqual(before);
  });

  test('the active preset, an edit and «Restablecer» do not fade the canvas', () => {
    render(<PresetLab />);

    fireEvent.click(chip('Tierra'));
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(played).toHaveLength(0);
  });

  test('a choice that came back to its preset after an edit fades it', () => {
    render(<PresetLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    fireEvent.click(chip('Tierra'));

    expect(played).toHaveLength(1);
  });

  test('with reduced motion (the site setting) the values change with no transition', () => {
    setSettings({ motion: 'reduced' });
    render(<PresetLab />);

    fireEvent.click(chip('Luna'));

    expect(played).toHaveLength(0);
    expect(screen.getByTestId('scene').querySelector('circle')).toHaveAttribute('r', '1.62');
  });

  test('with reduced motion (the system preference) the values change with no transition', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(<PresetLab />);

    fireEvent.click(chip('Luna'));

    expect(played).toHaveLength(0);
  });

  test('presets outside a LabShell still work, with nothing to fade', () => {
    render(<PresetLab inShell={false} />);

    fireEvent.click(chip('Luna'));

    expect(chip('Luna')).toHaveAttribute('aria-pressed', 'true');
    expect(played).toHaveLength(0);
  });

  test('a browser without Web Animations changes the values with no error', () => {
    delete (Element.prototype as Partial<Element>).animate;
    render(<PresetLab />);

    fireEvent.click(chip('Luna'));

    expect(chip('Luna')).toHaveAttribute('aria-pressed', 'true');
  });
});
