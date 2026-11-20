/**
 * Tema 11's synthesiser lab in the browser (Review Focus 2). No real audio plays: an init script
 * puts a recording stub on window.AudioContext before any page script runs, and the tests assert
 * the calls the lab makes: no context before a press, one oscillator with a PeriodicWave, a gain
 * that ramps from 0 to −18 dBFS and never steps, one stop, and the context closed on pagehide
 * (also on a real navigation, recorded in sessionStorage, which survives it).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const PAGE = './temas/sintesis-sonido/';
const LAB = 'synth-lab';
const VOICE_GAIN = 10 ** (-18 / 20);
const RAMP_S = 0.03;
const CLOSED_KEY = 'synth-e2e-closed';

type ParamEvent = [kind: 'set' | 'linear' | 'target' | 'cancel', ...values: number[]];
interface StubContext {
  options: { sampleRate?: number; latencyHint?: string };
  state: string;
  calls: string[];
  waves: { real: number[]; imag: number[]; constraints?: { disableNormalization: boolean } }[];
  oscillators: { waves: number; started?: number; stopped?: number; frequency: ParamEvent[] }[];
  gains: ParamEvent[][];
}

/** The stub: records every context, node and scheduled value in window.audioLog. */
async function stubAudio(page: Page): Promise<void> {
  await page.addInitScript((closedKey) => {
    const contexts: unknown[] = [];
    (window as unknown as { audioLog: unknown[] }).audioLog = contexts;
    type Point = { kind: 'set' | 'linear' | 'target'; value: number; time: number; tau?: number };
    /** An AudioParam whose value follows its timeline; every call goes to `events`. */
    class Param {
      events: unknown[][] = [];
      private timeline: Point[] = [];
      constructor(
        private readonly initial: number,
        private readonly clock: () => number,
      ) {}
      get value() {
        return this.levelAt(this.clock());
      }
      levelAt(t: number) {
        let level = this.initial;
        let since = 0;
        for (const [i, point] of this.timeline.entries()) {
          if (point.kind === 'linear' && t < point.time) {
            const share = point.time > since ? (t - since) / (point.time - since) : 1;
            return level + (point.value - level) * Math.max(0, share);
          }
          if (point.kind !== 'linear' && point.time > t) return level;
          if (point.kind === 'target') {
            const until = Math.min(t, this.timeline[i + 1]?.time ?? t);
            level =
              point.value +
              (level - point.value) * Math.exp(-(until - point.time) / (point.tau ?? 1));
            since = until;
            continue;
          }
          level = point.value;
          since = point.time;
        }
        return level;
      }
      private add(point: Point) {
        this.timeline = [...this.timeline, point].sort((a, b) => a.time - b.time);
      }
      setValueAtTime(value: number, time: number) {
        this.events.push(['set', value, time]);
        this.add({ kind: 'set', value, time });
        return this;
      }
      linearRampToValueAtTime(value: number, time: number) {
        this.events.push(['linear', value, time]);
        this.add({ kind: 'linear', value, time });
        return this;
      }
      setTargetAtTime(value: number, time: number, tau: number) {
        this.events.push(['target', value, time, tau]);
        this.add({ kind: 'target', value, time, tau });
        return this;
      }
      /** Logs the level the timeline had at `time`, then drops what starts from it on. */
      cancelScheduledValues(time: number) {
        this.events.push(['cancel', time, this.levelAt(time)]);
        this.timeline = this.timeline.filter((point) => point.time < time);
        return this;
      }
    }
    class Node {
      connect<T>(node: T) {
        return node;
      }
      disconnect() {}
    }
    class Oscillator extends Node {
      frequency: Param;
      waves = 0;
      started?: number;
      stopped?: number;
      onended: (() => void) | null = null;
      constructor(clock: () => number) {
        super();
        this.frequency = new Param(440, clock);
      }
      setPeriodicWave() {
        this.waves += 1;
      }
      start(time: number) {
        this.started = time;
      }
      stop(time: number) {
        this.stopped = time;
      }
    }
    class Gain extends Node {
      gain: Param;
      constructor(clock: () => number) {
        super();
        this.gain = new Param(1, clock);
      }
    }
    class StubAudioContext {
      state = 'suspended';
      destination = {};
      calls: string[] = [];
      waves: unknown[] = [];
      oscillators: Oscillator[] = [];
      gainNodes: Gain[] = [];
      sampleRate: number;
      private readonly origin = performance.now();
      constructor(public options: { sampleRate?: number } = {}) {
        this.sampleRate = options.sampleRate ?? 48000;
        contexts.push(this);
      }
      get currentTime() {
        return (performance.now() - this.origin) / 1000;
      }
      createOscillator() {
        const node = new Oscillator(() => this.currentTime);
        this.oscillators.push(node);
        return node;
      }
      createGain() {
        const node = new Gain(() => this.currentTime);
        this.gainNodes.push(node);
        return node;
      }
      createPeriodicWave(real: Float32Array, imag: Float32Array, constraints: unknown) {
        const wave = { real: [...real], imag: [...imag], constraints };
        this.waves.push(wave);
        return wave;
      }
      resume() {
        this.calls.push('resume');
        this.state = 'running';
        return Promise.resolve();
      }
      suspend() {
        this.calls.push('suspend');
        this.state = 'suspended';
        return Promise.resolve();
      }
      close() {
        this.calls.push('close');
        this.state = 'closed';
        sessionStorage.setItem(closedKey, String(contexts.length));
        return Promise.resolve();
      }
    }
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: StubAudioContext,
    });
  }, CLOSED_KEY);
}

/** What the stub recorded, as plain data. */
function audioLog(page: Page): Promise<StubContext[]> {
  return page.evaluate(() =>
    (
      window as unknown as {
        audioLog: {
          options: StubContext['options'];
          state: string;
          calls: string[];
          waves: StubContext['waves'];
          oscillators: {
            waves: number;
            started?: number;
            stopped?: number;
            frequency: { events: ParamEvent[] };
          }[];
          gainNodes: { gain: { events: ParamEvent[] } }[];
        }[];
      }
    ).audioLog.map((context) => ({
      options: context.options,
      state: context.state,
      calls: context.calls,
      waves: context.waves,
      oscillators: context.oscillators.map(({ waves, started, stopped, frequency }) => ({
        waves,
        started,
        stopped,
        frequency: frequency.events,
      })),
      gains: context.gainNodes.map(({ gain }) => gain.events),
    })),
  );
}

async function openLab(page: Page): Promise<Locator> {
  await stubAudio(page);
  await page.goto(PAGE);
  const lab = page.getByTestId(LAB);
  await lab.scrollIntoViewIfNeeded();
  await waitForIsland(page, `[data-testid="${LAB}"]`);
  return lab;
}

const playButton = (lab: Locator) => lab.getByTestId('synth-play');

/**
 * The gain never steps: no value above −18 dBFS; a «set» right after a «cancel» holds exactly the
 * level the timeline had there (the stub logs it with the cancel); any other «set» is the 0 a new
 * voice starts from.
 */
function expectNoStep(events: ParamEvent[]): void {
  for (const [kind, value] of events) {
    if (kind === 'set' || kind === 'linear') expect(value).toBeLessThanOrEqual(VOICE_GAIN + 1e-9);
  }
  events.forEach(([kind, value, time], index) => {
    if (kind !== 'set') return;
    const [previous, cancelTime, level] = events[index - 1] ?? [];
    if (previous !== 'cancel') {
      expect(value, `«set» ${value} sin «cancel» antes`).toBe(0);
      return;
    }
    expect(cancelTime).toBe(time);
    expect(value, `«set» ${value} en ${time} s: el nivel era ${level}`).toBeCloseTo(level, 9);
  });
}

test.describe('Tema 11, laboratorio de síntesis', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('nada crea un AudioContext antes de pulsar; «Reproducir» abre uno con su PeriodicWave y sube de 0 a −18 dBFS en 30 ms', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await lab.getByRole('combobox', { name: 'Valores de referencia' }).selectOption('sierra');
    const f1 = lab.getByRole('textbox', { name: /^Fundamental/ });
    await f1.fill('440');
    await f1.press('Enter');
    await lab.getByRole('switch', { name: 'Fases aleatorias' }).check({ force: true });
    expect(await audioLog(page)).toEqual([]);
    await expect(playButton(lab)).toHaveText('Reproducir');

    await playButton(lab).click();

    await expect(playButton(lab)).toHaveText('Detener');
    await expect.poll(async () => (await audioLog(page))[0]?.oscillators.length).toBe(1);
    const [context] = await audioLog(page);
    expect(context.options).toEqual({ sampleRate: 44100, latencyHint: 'interactive' });
    expect(context.calls).toContain('resume');
    expect(context.waves).toHaveLength(1);
    expect(context.waves[0].constraints).toEqual({ disableNormalization: false });
    expect(context.oscillators[0].waves).toBe(1);
    expect(context.oscillators[0].frequency[0]).toEqual(['set', 440, expect.any(Number)]);
    const [first, ramp] = context.gains[0];
    expect(first.slice(0, 2)).toEqual(['set', 0]);
    expect(ramp[0]).toBe('linear');
    expect(ramp[1]).toBeCloseTo(VOICE_GAIN, 9);
    expect(ramp[2] - first[2]).toBeCloseTo(RAMP_S, 9);
    await expect(lab.getByTestId('synth-status')).toContainText('−18 dBFS');
  });

  test('otro preajuste mientras suena baja la ganancia, cambia la onda abajo y la vuelve a subir: nunca un salto', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await playButton(lab).click();
    await expect.poll(async () => (await audioLog(page))[0]?.oscillators.length).toBe(1);

    await lab.getByRole('combobox', { name: 'Valores de referencia' }).selectOption('cuadrada');

    await expect.poll(async () => (await audioLog(page))[0].oscillators[0].waves).toBe(2);
    await expect
      .poll(async () => (await audioLog(page))[0].gains[0].at(-1))
      .toEqual(['linear', expect.closeTo(VOICE_GAIN, 9), expect.any(Number)]);
    const events = (await audioLog(page))[0].gains[0];
    const linears = events.filter(([kind]) => kind === 'linear').map(([, value]) => value);
    expect(linears).toEqual([expect.closeTo(VOICE_GAIN, 9), 0, expect.closeTo(VOICE_GAIN, 9)]);
    expectNoStep(events);
  });

  test('«Detener» la lleva a 0 en 30 ms, para el oscilador abajo y el botón vuelve a «Reproducir»', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await playButton(lab).click();
    await expect(playButton(lab)).toHaveText('Detener');

    await playButton(lab).click();

    await expect(playButton(lab)).toHaveText('Reproducir');
    const [context] = await audioLog(page);
    const events = context.gains[0];
    const last = events.at(-1) ?? [];
    expect(last.slice(0, 2)).toEqual(['linear', 0]);
    expect(context.oscillators[0].stopped).toBeCloseTo(last[2] ?? Number.NaN, 9);
    expectNoStep(events);
    await expect.poll(async () => (await audioLog(page))[0].calls).toContain('suspend');
  });

  test('una f₁ nueva mientras suena desliza la frecuencia: ni baja la ganancia ni cambia la onda', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await playButton(lab).click();
    await expect.poll(async () => (await audioLog(page))[0]?.oscillators.length).toBe(1);
    const before = (await audioLog(page))[0].gains[0].length;

    const f1 = lab.getByRole('textbox', { name: /^Fundamental/ });
    await f1.fill('440');
    await f1.press('Enter');

    await expect
      .poll(async () => (await audioLog(page))[0].oscillators[0].frequency.at(-1)?.slice(0, 2))
      .toEqual(['target', 440]);
    await page.waitForTimeout(100);
    const [context] = await audioLog(page);
    expect(context.oscillators[0].waves).toBe(1);
    expect(context.gains[0]).toHaveLength(before);
  });

  test('la tecla K, con el foco en el laboratorio, la detiene; en el campo de f₁ se escribe', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await playButton(lab).click();
    await expect(playButton(lab)).toHaveText('Detener');

    await lab.getByRole('textbox', { name: /^Fundamental/ }).press('k');
    await expect(playButton(lab)).toHaveText('Detener');
    await lab.getByRole('slider', { name: /^Armónico 3,/ }).press('k');

    await expect(playButton(lab)).toHaveText('Reproducir');
    const events = (await audioLog(page))[0].gains[0];
    expect(events.at(-1)?.slice(0, 2)).toEqual(['linear', 0]);
    expectNoStep(events);
  });

  test('salir de la página (pagehide) cierra el AudioContext, también al navegar de verdad', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await playButton(lab).click();
    await expect.poll(async () => (await audioLog(page))[0]?.oscillators.length).toBe(1);

    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await expect.poll(async () => (await audioLog(page))[0].state).toBe('closed');
    await expect(playButton(lab)).toHaveText('Reproducir');

    await page.evaluate((key) => sessionStorage.removeItem(key), CLOSED_KEY);
    await playButton(lab).click();
    await expect.poll(async () => (await audioLog(page)).length).toBe(2);
    await page.goto('./');
    expect(await page.evaluate((key) => sessionStorage.getItem(key), CLOSED_KEY)).toBe('2');
  });

  test('a 880 Hz y 8 000 Hz los armónicos sobre f_s/2 se desactivan con su nota, y suena en un contexto de 8 000 Hz', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const f1 = lab.getByRole('textbox', { name: /^Fundamental/ });
    await f1.fill('880');
    await f1.press('Enter');
    await lab.getByRole('combobox', { name: /^Frecuencia de muestreo/ }).selectOption('8000');

    await expect(lab.getByTestId('synth-nyquist')).toContainText('solo caben 4');
    for (const n of [1, 4]) {
      await expect(lab.getByRole('slider', { name: new RegExp(`^Armónico ${n},`) })).toBeEnabled();
    }
    for (const n of [5, 10]) {
      await expect(lab.getByRole('slider', { name: new RegExp(`^Armónico ${n},`) })).toBeDisabled();
    }
    await playButton(lab).click();
    await expect.poll(async () => (await audioLog(page))[0]?.options.sampleRate).toBe(8000);
    const [context] = await audioLog(page);
    // Harmonics 5 to 10 go to the oscillator silent: their coefficients are 0.
    // (0 · sin φ may be −0, which is 0 all the same.)
    const silent = (values: number[]) => values.slice(5).map((value) => value === 0);
    expect(silent(context.waves[0].imag)).toEqual([true, true, true, true, true, true]);
    expect(silent(context.waves[0].real)).toEqual([true, true, true, true, true, true]);
    expect(context.waves[0].imag[4]).not.toBe(0);
  });

  test('«Fases aleatorias» cambia la forma de onda y deja el espectro', async ({ page }) => {
    const lab = await openLab(page);
    const signal = lab.locator('[data-testid="synth-waveform"] [data-series="senal"]');
    const bars = lab.locator('[data-testid="synth-spectrum"] rect[data-harmonic]');
    const barTops = () => bars.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('y')));
    const [path, tops] = [await signal.getAttribute('d'), await barTops()];

    await lab.getByRole('switch', { name: 'Fases aleatorias' }).check({ force: true });

    await expect(signal).not.toHaveAttribute('d', path ?? '');
    expect(await barTops()).toEqual(tops);
    await expect(lab.getByTestId('synth-random-note')).toContainText('figura 11.4');
  });

  test('axe no encuentra fallos con las fases sorteadas y los armónicos desactivados', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await lab.getByRole('switch', { name: 'Fases aleatorias' }).check({ force: true });
    const f1 = lab.getByRole('textbox', { name: /^Fundamental/ });
    await f1.fill('880');
    await f1.press('Enter');
    await lab.getByRole('combobox', { name: /^Frecuencia de muestreo/ }).selectOption('8000');
    await playButton(lab).click();
    await expect(playButton(lab)).toHaveText('Detener');

    const { violations } = await new AxeBuilder({ page })
      .include(`[data-testid="${LAB}"]`)
      .analyze();
    expect(violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([]);
  });
});
