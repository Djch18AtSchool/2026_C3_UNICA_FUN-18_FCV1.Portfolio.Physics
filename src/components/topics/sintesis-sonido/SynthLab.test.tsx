// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { formatNumber } from '../../../lib/format';
import { oddEvenPowerDb } from '../../../lib/physics/harmonics';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installFakeAudio, type FakeAudio } from '../../../test-audio';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { readout } from '../../../test-readout';
import { plain, strayDollars } from './soundTestKit';
import { INITIAL_SYNTH_STATE } from './synthScene';
import SynthLab from './SynthLab';
import { GAIN_RAMP_S, NO_WEB_AUDIO, VOICE_GAIN } from './useAdditiveVoice';

const LEFT_OUT = 'Deja fuera el ataque, el soplido, el vibrato y el aliasing.';
const RAMP_MS = GAIN_RAMP_S * 1000;

let audio: FakeAudio;
let uninstallDialog: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  audio = installFakeAudio();
  uninstallDialog = installDialogPolyfill();
});

afterEach(() => {
  cleanup();
  uninstallDialog();
  audio.uninstall();
  vi.useRealTimers();
  localStorage.clear();
  resetSettingsForTests();
});

const renderLab = () => render(<SynthLab leftOut={LEFT_OUT} />);
const region = (name: string) => screen.getByRole('region', { name });
const playButton = () => screen.getByTestId('synth-play');
const presetSelect = () => screen.getByRole('combobox', { name: 'Valores de referencia' });
const amplitudeField = (n: number) =>
  screen.getByRole('textbox', { name: new RegExp(`^Armónico ${n},`) });
const amplitudeSlider = (n: number) =>
  screen.getByRole('slider', { name: new RegExp(`^Armónico ${n},`) });
const signalPath = (container: Element) =>
  container
    .querySelector('[data-testid="synth-waveform"] [data-series="senal"]')
    ?.getAttribute('d');
const spectrumBars = (container: Element) =>
  [...container.querySelectorAll('[data-testid="synth-spectrum"] rect[data-harmonic]')].map(
    (bar) => `${bar.getAttribute('data-harmonic')}:${bar.getAttribute('y')}`,
  );

function commit(field: HTMLElement, text: string): void {
  fireEvent.change(field, { target: { value: text } });
  fireEvent.keyDown(field, { key: 'Enter' });
}

async function press(button: HTMLElement): Promise<void> {
  await act(async () => {
    fireEvent.click(button);
  });
}

/** The voice's gain every millisecond over `ms`. */
function gainTrace(ms: number): number[] {
  const gain = audio.contexts[0].gains[0].gain;
  const trace = [gain.value];
  for (let i = 0; i < ms; i += 1) {
    act(() => audio.advance(1));
    trace.push(gain.value);
  }
  return trace;
}

describe('SynthLab: what it opens on', () => {
  test('the clarinet’s measured recipe at 310,1 Hz: f₁, T, odd over even power and the strongest harmonic', () => {
    renderLab();
    const odd = oddEvenPowerDb(INITIAL_SYNTH_STATE.amplitudes);

    expect(plain(readout('Fundamental $f_1$'))).toBe('310,1 Hz');
    expect(plain(readout('Periodo $T = 1/f_1$'))).toBe('3,22 ms');
    expect(plain(readout('Impares sobre pares, $n \\le 10$'))).toBe(
      plain(formatNumber(odd, { precision: 1, unit: 'dB' })),
    );
    expect(readout('Armónico más fuerte, $n$')).toBe('3');
    expect((presetSelect() as HTMLSelectElement).value).toBe('clarinete');
  });

  test('on the tiered shell: ten amplitudes, f₁ and f_s in Parámetros; presets and «Fases aleatorias» in Escenario; no transport', () => {
    const { container } = renderLab();
    const params = within(region('Parámetros'));

    expect(
      container.querySelector('[data-testid="synth-lab"][data-lab-shell="tiered"]'),
    ).not.toBeNull();
    expect(params.getAllByRole('slider', { name: /^Armónico \d+,/ })).toHaveLength(10);
    expect(params.getByRole('slider', { name: /^Fundamental/ })).toBeTruthy();
    expect(params.getByRole('combobox', { name: /^Frecuencia de muestreo/ })).toBeTruthy();
    const scenario = within(region('Escenario'));
    expect(scenario.getByRole('combobox', { name: 'Valores de referencia' })).toBe(presetSelect());
    expect(scenario.getByRole('switch', { name: 'Fases aleatorias' })).toBeTruthy();
    expect(container.querySelector('[data-lab-transport]')).toBeNull();
    expect(
      container.querySelector('[data-lab-canvas] [data-testid="synth-waveform"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-lab-charts] [data-testid="synth-spectrum"]'),
    ).not.toBeNull();
  });

  test('the amplitude sliders run 0 to 1,6 by 0,01 and f₁ 110 to 880 Hz by 0,1', () => {
    renderLab();

    expect(amplitudeSlider(1)).toMatchObject({ min: '0', max: '1.6', step: '0.01' });
    const f1 = screen.getByRole('slider', { name: /^Fundamental/ });
    expect(f1).toMatchObject({ min: '110', max: '880', step: '0.1', value: '310.1' });
  });

  test('six presets, each saying where its recipe comes from (ruling R8), in plain text', () => {
    renderLab();
    const options = [...(presetSelect() as HTMLSelectElement).options].map((option) => option.text);

    expect(options).toEqual([
      'Seno (receta clásica)',
      'Cuadrada (receta clásica)',
      'Diente de sierra (receta clásica)',
      'Triangular (receta clásica)',
      'Flauta (medida: grabación MIS)',
      'Clarinete (medida: grabación MIS)',
    ]);
    expect(mathSourceText(screen.getByTestId('preset-note'))).toContain('tabla 11.2');
  });
});

describe('SynthLab: sound only after a press, and one stop', () => {
  test('no AudioContext before «Reproducir»; the press starts one voice and the button turns into «Detener»', async () => {
    renderLab();
    fireEvent.change(presetSelect(), { target: { value: 'sierra' } });
    commit(screen.getByRole('textbox', { name: /^Fundamental/ }), '440');
    expect(audio.contexts).toHaveLength(0);
    expect(playButton()).toHaveTextContent('Reproducir');
    expect(screen.getByTestId('synth-status')).toHaveTextContent('Nada suena hasta que pulses');

    await press(playButton());

    expect(audio.contexts).toHaveLength(1);
    const [context] = audio.contexts;
    expect(context.oscillators).toHaveLength(1);
    expect(context.oscillators[0].frequency.value).toBeCloseTo(440, 9);
    expect(context.gains[0].gain.valueAt(GAIN_RAMP_S)).toBeCloseTo(VOICE_GAIN, 12);
    expect(playButton()).toHaveTextContent('Detener');
    expect(screen.getByTestId('synth-status')).toHaveTextContent('−18 dBFS');
  });

  test('«Detener» silences the voice with a ramp and the button reads «Reproducir» again', async () => {
    renderLab();
    await press(playButton());
    act(() => audio.advance(100));

    await press(playButton());
    const trace = gainTrace(2 * RAMP_MS);

    expect(playButton()).toHaveTextContent('Reproducir');
    expect(trace.at(-1)).toBe(0);
    expect(audio.contexts[0].oscillators[0].stoppedAt).toBeDefined();
  });

  test('a new preset while it plays ramps the gain down and up: never a step to full volume', async () => {
    renderLab();
    await press(playButton());
    act(() => audio.advance(100));

    fireEvent.change(presetSelect(), { target: { value: 'cuadrada' } });
    const trace = gainTrace(4 * RAMP_MS);
    const steps = trace.slice(1).map((value, i) => Math.abs(value - trace[i]));

    expect(Math.max(...steps)).toBeLessThanOrEqual(VOICE_GAIN / RAMP_MS + 1e-9);
    expect(Math.min(...trace)).toBe(0);
    expect(audio.contexts[0].oscillators[0].waveSwaps).toHaveLength(2);
  });

  test('a new f₁ while it plays glides the oscillator: no dip, no new wave (fix round 1)', async () => {
    renderLab();
    await press(playButton());
    act(() => audio.advance(100));
    const gain = audio.contexts[0].gains[0].gain;
    const before = gain.value;

    commit(screen.getByRole('textbox', { name: /^Fundamental/ }), '440');
    const trace = [before, ...gainTrace(4 * RAMP_MS)];

    expect(audio.contexts[0].oscillators[0].waveSwaps).toHaveLength(1);
    expect(Math.max(...trace) - Math.min(...trace)).toBe(0);
    expect(audio.contexts[0].oscillators[0].frequency.value).toBeCloseTo(440, 1);
  });

  test('leaving the page closes the AudioContext and the button reads «Reproducir»', async () => {
    renderLab();
    await press(playButton());

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(audio.contexts[0].state).toBe('closed');
    expect(playButton()).toHaveTextContent('Reproducir');
  });

  test('without Web Audio the status line says so and the drawings stay', async () => {
    audio.uninstall();
    const { container } = renderLab();
    await press(playButton());

    expect(screen.getByTestId('synth-status')).toHaveTextContent(NO_WEB_AUDIO);
    expect(playButton()).toHaveTextContent('Reproducir');
    expect(signalPath(container)).toBeTruthy();
  });
});

describe('SynthLab: the recipe and what is drawn', () => {
  test('an amplitude redraws the waveform and the spectrum, and the preset note says it was modified', () => {
    const { container } = renderLab();
    const [path, bars] = [signalPath(container), spectrumBars(container)];

    commit(amplitudeField(2), '1');

    expect(signalPath(container)).not.toBe(path);
    expect(spectrumBars(container)).not.toEqual(bars);
    expect(screen.getByTestId('preset-note')).toHaveTextContent(
      /^Valores modificados a partir de «Clarinete \(medido\)»/,
    );
  });

  test('a new f₁ keeps the preset (the timbre is the recipe) and moves T', () => {
    renderLab();
    commit(screen.getByRole('textbox', { name: /^Fundamental/ }), '220');

    expect(plain(readout('Periodo $T = 1/f_1$'))).toBe('4,55 ms');
    expect((presetSelect() as HTMLSelectElement).value).toBe('clarinete');
  });

  test('«Fases aleatorias» changes the waveform, not the spectrum, and its note points back to figure 11.4', () => {
    const { container } = renderLab();
    const [path, bars] = [signalPath(container), spectrumBars(container)];
    const note = () => screen.getByTestId('synth-random-note');
    expect(note()).toHaveTextContent('la fase de su receta');
    expect(note()).not.toHaveTextContent('Helmholtz');

    fireEvent.click(screen.getByRole('switch', { name: 'Fases aleatorias' }));

    expect(signalPath(container)).not.toBe(path);
    expect(spectrumBars(container)).toEqual(bars);
    expect(note()).toHaveTextContent('Helmholtz');
    expect(note()).toHaveTextContent('figura 11.4');
  });

  test('at 880 Hz and 8 000 Hz the harmonics above f_s/2 are disabled, and a note says why (11.9)', () => {
    renderLab();
    const note = () => mathSourceText(screen.getByTestId('synth-nyquist'));
    expect(note()).toContain('los diez armónicos');
    // «Plex Symbols» stops at U+22FF: ⌊ ⌋ would fall to a system font even inside a formula.
    expect(note()).not.toMatch(/⌊|⌋|\\lfloor|\\rfloor/);
    expect(amplitudeSlider(5)).toBeEnabled();

    commit(screen.getByRole('textbox', { name: /^Fundamental/ }), '880');
    fireEvent.change(screen.getByRole('combobox', { name: /^Frecuencia de muestreo/ }), {
      target: { value: '8000' },
    });

    for (const n of [1, 2, 3, 4]) expect(amplitudeSlider(n)).toBeEnabled();
    for (const n of [5, 6, 7, 8, 9, 10]) {
      expect(amplitudeSlider(n)).toBeDisabled();
      expect(amplitudeField(n)).toBeDisabled();
    }
    expect(plain(note())).toContain('solo caben 4');
    expect(note()).toContain('(11.9)');
    expect(amplitudeSlider(5).getAttribute('aria-label')).toMatch(/sobre/);
  });

  test('the cursor on the waveform marks y(t) and −y(t + T/2) at the same instant', () => {
    const { container } = renderLab();
    const cursor = screen.getByRole('slider', { name: 'Tiempo t' });

    expect(cursor.getAttribute('aria-valuenow')).toBe('1');
    expect(container.querySelectorAll('[data-testid="synth-waveform"] [data-point]')).toHaveLength(
      2,
    );
    fireEvent.keyDown(cursor, { key: 'ArrowRight' });
    expect(Number(cursor.getAttribute('aria-valuenow'))).toBeGreaterThan(1);
  });

  test('the drawer can hide the dashed −y(t + T/2), with its points', () => {
    const { container } = renderLab();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    fireEvent.click(screen.getByRole('switch', { name: /^Curva/ }));

    expect(
      container.querySelector('[data-testid="synth-waveform"] [data-series="media-onda"]'),
    ).toBeNull();
    expect(container.querySelectorAll('[data-testid="synth-waveform"] [data-point]')).toHaveLength(
      1,
    );
  });

  test('«Restablecer» returns to the clarinet at 310,1 Hz and 44 100 Hz with its own phases', () => {
    renderLab();
    commit(amplitudeField(1), '0,5');
    commit(screen.getByRole('textbox', { name: /^Fundamental/ }), '600');
    fireEvent.click(screen.getByRole('switch', { name: 'Fases aleatorias' }));

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect((presetSelect() as HTMLSelectElement).value).toBe('clarinete');
    expect(plain(readout('Fundamental $f_1$'))).toBe('310,1 Hz');
    expect(screen.getByRole('switch', { name: 'Fases aleatorias' })).not.toBeChecked();
  });

  test('«Qué deja fuera el modelo» is the topic’s text', () => {
    renderLab();
    expect(screen.getByText(LEFT_OUT)).toBeTruthy();
  });
});

describe('SynthLab: glyphs', () => {
  test('Plex draws every character and no $ is left raw, in every state the lab shows', async () => {
    const { container } = renderLab();
    const check = (state: string) => {
      expect(plexViolations(container), state).toEqual([]);
      expect(strayDollars(container), state).toEqual([]);
    };
    check('al abrir');
    fireEvent.click(screen.getByRole('switch', { name: 'Fases aleatorias' }));
    check('fases aleatorias');
    commit(screen.getByRole('textbox', { name: /^Fundamental/ }), '880');
    fireEvent.change(screen.getByRole('combobox', { name: /^Frecuencia de muestreo/ }), {
      target: { value: '8000' },
    });
    check('armónicos sobre Nyquist');
    for (const value of ['seno', 'cuadrada', 'sierra', 'triangular', 'flauta']) {
      fireEvent.change(presetSelect(), { target: { value } });
      check(`preajuste ${value}`);
    }
    await press(playButton());
    check('sonando');
    commit(amplitudeField(1), '0');
    for (const n of [2, 3, 4]) commit(amplitudeField(n), '0');
    check('receta en silencio');
  });
});
