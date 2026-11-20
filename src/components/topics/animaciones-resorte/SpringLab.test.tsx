// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { formatNumber } from '../../../lib/format';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { readout } from '../../../test-readout';
import SpringLab from './SpringLab';
import { bezierAt, buildRun, springAt } from './springScene';

const USAGE = 'A 1× la reproducción va en tiempo real.';
const LEFT_OUT = 'Integro con la solución analítica (10.6).';
const MOTION_DEFAULT = { k: 100, b: 10, m: 1 };
/** The timeline's positions per run (TIMELINE_STEPS) and Motion's default run, 3 s. */
const STEPS = 1000;
const RUN_S = 3;
const LABELS = {
  zeta: 'Razón de amortiguamiento $\\zeta$',
  omega: 'Frecuencia natural $\\omega_0$',
  overshoot: 'Sobrepaso previsto $M_p$',
  target: 'Destino $x_\\text{obj}$',
  x: 'Posición del resorte $x$',
  v: 'Velocidad del resorte $v$',
  xCurve: 'Posición de la curva $x$',
  vCurve: 'Velocidad de la curva $v$',
} as const;

const plain = (text: string) => text.replaceAll(' ', ' ');
const value = (label: string) => plain(readout(label));
const px = (x: number, precision: number) => plain(formatNumber(x, { precision, unit: 'px' }));
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const seekTo = (seconds: number) =>
  fireEvent.change(timeline(), { target: { value: String((seconds / RUN_S) * STEPS) } });
const interruptButton = () => screen.getByRole('button', { name: 'Interrumpir' });
const presetSelect = () =>
  screen.getByRole('combobox', { name: 'Valores de referencia' }) as HTMLSelectElement;
const regimeChip = () => screen.getByTestId('spring-regime');
const summary = (part: string) => plain(mathSourceText(screen.getByTestId(`summary-${part}`)));
const marks = () => document.querySelectorAll('[data-transport-mark]');

function renderLab() {
  return render(<SpringLab usage={USAGE} leftOut={LEFT_OUT} />);
}

async function choosePreset(id: string) {
  await userEvent.setup().selectOptions(presetSelect(), id);
}

describe('SpringLab', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('opens on Motion’s default: k, b and m, five presets, the canvas, the plot and the notes', () => {
    renderLab();

    expect(screen.getByTestId('spring-lab')).toHaveAttribute('data-lab-shell', 'tiered');
    const params = within(screen.getByRole('region', { name: 'Parámetros' }));
    const limits = [
      [/^Rigidez k/, '10', '1000'],
      [/^Amortiguamiento b/, '0', '100'],
      [/^Masa m/, '0.1', '5'],
    ] as const;
    for (const [name, min, max] of limits) {
      const range = params.getByRole('slider', { name });
      expect(range).toHaveAttribute('min', min);
      expect(range).toHaveAttribute('max', max);
      expect(range).toHaveAttribute('step', '0.1');
    }
    expect(presetSelect().value).toBe('motion-defecto');
    expect([...presetSelect().options].map((option) => option.text)).toEqual([
      'Motion, por omisión (producto)',
      'Motion, posición x e y (producto)',
      'Motion, escala hacia 0 (producto)',
      'Apple, ejemplo (producto)',
      'Sobreamortiguado (ilustrativo)',
    ]);
    expect(value(LABELS.zeta)).toBe('0,500');
    expect(value(LABELS.omega)).toBe('10,00 rad/s');
    expect(value(LABELS.overshoot)).toBe('16,30 %');
    expect(value(LABELS.target)).toBe('1 000 px');
    expect(screen.getByTestId('spring-scene')).toBeInTheDocument();
    expect(screen.getByTestId('spring-plot').querySelectorAll('[data-series]')).toHaveLength(2);
    expect(document.querySelector('details[data-lab-note="usage"]')).toHaveTextContent(USAGE);
    expect(document.querySelector('details[data-lab-note="left-out"]')).toHaveTextContent(LEFT_OUT);
  });

  test('the card and the readouts are springState at the clock’s time', () => {
    renderLab();
    const run = buildRun(MOTION_DEFAULT, []);

    seekTo(0.3);

    expect(value(LABELS.x)).toBe(px(springAt(run, 0.3).x, 1));
    expect(value(LABELS.xCurve)).toBe(px(bezierAt(run, 0.3).x, 1));
    expect(Number(screen.getByTestId('card-spring').getAttribute('data-x'))).toBeCloseTo(
      springAt(run, 0.3).x,
      2,
    );
  });

  test('moving k recomputes ζ, ω₀, the overshoot and x(t)', () => {
    renderLab();
    seekTo(0.3);

    fireEvent.change(screen.getByRole('slider', { name: /^Rigidez k/ }), {
      target: { value: '400' },
    });

    const run = buildRun({ ...MOTION_DEFAULT, k: 400 }, []);
    expect(value(LABELS.zeta)).toBe('0,250');
    expect(value(LABELS.omega)).toBe('20,00 rad/s');
    expect(value(LABELS.overshoot)).toBe('44,43 %');
    expect(value(LABELS.x)).toBe(px(springAt(run, 0.3).x, 1));
    expect(presetSelect().value).toBe('');
  });

  test('the regime chip for ζ = 0,5, 1 and 2', async () => {
    renderLab();
    expect(regimeChip()).toHaveAttribute('data-regime', 'subamortiguado');

    await choosePreset('motion-escala-cero');
    expect(regimeChip()).toHaveAttribute('data-regime', 'critico');
    expect(regimeChip()).toHaveTextContent(/^Crítico/);
    expect(value(LABELS.zeta)).toBe('1,000');

    await choosePreset('sobreamortiguado');
    expect(regimeChip()).toHaveTextContent(/^Sobreamortiguado/);
    expect(value(LABELS.overshoot)).toBe('0,00 %');
  });

  test('Review Focus 3: b = 0 reads «Sin amortiguar», settles «nunca» and every readout is finite', () => {
    renderLab();
    const field = screen.getByRole('textbox', { name: /^Amortiguamiento b/ });

    fireEvent.change(field, { target: { value: '0' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(regimeChip()).toHaveTextContent(/^Sin amortiguar/);
    expect(summary('settling')).toMatch(/^nunca: con \$b = 0\$/);
    expect(summary('curve')).toMatch(/porque el resorte nunca se asienta$/);
    expect(value(LABELS.overshoot)).toBe('100,00 %');
    for (const label of Object.values(LABELS)) expect(value(label)).not.toMatch(/—|NaN/);
  });

  test('«Interrumpir» waits at the start, then swaps the target mid-flight with v kept', () => {
    renderLab();
    expect(interruptButton()).toBeDisabled();
    expect(screen.getByTestId('interrupt-hint')).toHaveTextContent(/^En el inicio no hay/);
    seekTo(0.2);
    const vBefore = value(LABELS.v);
    const marksBefore = marks().length;

    fireEvent.click(interruptButton());

    expect(value(LABELS.target)).toBe('100 px');
    expect(value(LABELS.v)).toBe(vBefore);
    expect(value(LABELS.vCurve)).toBe('0 px/s');
    expect(marks().length).toBe(marksBefore);
    expect(summary('jump')).toMatch(/^a \$t\^\*\$ = 0,20 s el resorte sigue a /);
    expect(screen.getByTestId('interrupt-hint')).toHaveTextContent(/^Cambia el destino/);
  });

  test('Review Focus 4: two quick presses keep the readouts continuous; a press at rest swaps only', () => {
    renderLab();
    seekTo(0.2);
    const [x, v] = [value(LABELS.x), value(LABELS.v)];

    fireEvent.click(interruptButton());
    fireEvent.click(interruptButton());

    expect(value(LABELS.target)).toBe('1 000 px');
    expect([value(LABELS.x), value(LABELS.v)]).toEqual([x, v]);

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
    seekTo(2.91);
    fireEvent.click(interruptButton());

    expect(value(LABELS.target)).toBe('100 px');
    expect(value(LABELS.x)).toBe('1 000,0 px');
    expect(value(LABELS.v)).toBe('0 px/s');
    expect(summary('jump')).toMatch(/solo cambia el destino$/);
  });

  test('keyboard: the sliders and «Interrumpir» are reachable with Tab; I interrupts, Space plays', async () => {
    const user = userEvent.setup();
    renderLab();
    seekTo(0.2);
    const reached = new Set<string>();

    for (let press = 0; press < 40 && !reached.has('Interrumpir'); press++) {
      await user.tab();
      const focused = document.activeElement;
      reached.add(focused?.getAttribute('aria-label') ?? focused?.textContent?.trim() ?? '');
    }

    expect([...reached].some((name) => /^Rigidez k/.test(name))).toBe(true);
    expect([...reached].some((name) => /^Amortiguamiento b/.test(name))).toBe(true);
    expect([...reached].some((name) => /^Masa m/.test(name))).toBe(true);
    expect(reached.has('Interrumpir')).toBe(true);

    const lab = screen.getByTestId('spring-lab');
    fireEvent.keyDown(lab, { key: 'i' });
    expect(value(LABELS.target)).toBe('100 px');
    fireEvent.keyDown(lab, { key: ' ' });
    expect(lab).toHaveAttribute('data-playing', 'true');
    fireEvent.keyDown(lab, { key: 'k' });
    expect(lab).toHaveAttribute('data-playing', 'false');
  });

  test('the keys stay native inside a field: «i» typed in a number box does not interrupt', () => {
    renderLab();
    seekTo(0.2);

    fireEvent.keyDown(screen.getByRole('textbox', { name: /^Rigidez k/ }), { key: 'i' });
    fireEvent.keyDown(screen.getByTestId('spring-lab'), { key: '.' });

    expect(value(LABELS.target)).toBe('1 000 px');
    expect(Number((timeline() as HTMLInputElement).value)).toBeGreaterThan((0.2 / RUN_S) * STEPS);

    // «,» steps back; a key with Ctrl is the browser's; R rewinds to the start.
    const lab = screen.getByTestId('spring-lab');
    fireEvent.keyDown(lab, { key: ',' });
    expect((timeline() as HTMLInputElement).value).toBe(String(Math.round((0.2 / RUN_S) * STEPS)));
    fireEvent.keyDown(lab, { key: 'i', ctrlKey: true });
    expect(value(LABELS.target)).toBe('1 000 px');
    fireEvent.keyDown(lab, { key: 'r' });
    expect((timeline() as HTMLInputElement).value).toBe('0');
  });

  test('with reduced motion the lab opens on the final frame, the whole plot in sight', () => {
    setSettings({ motion: 'reduced' });
    renderLab();

    expect((timeline() as HTMLInputElement).value).toBe(String(STEPS));
    expect(value(LABELS.x)).toBe('1 000,0 px');
    expect(screen.getByTestId('spring-plot').querySelectorAll('[data-series]')).toHaveLength(2);
  });

  test('the drawer hides the curve (lane, series, readouts) and the band', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    await user.click(screen.getByRole('switch', { name: 'Tarjeta con la curva de duración fija' }));
    await user.click(screen.getByRole('switch', { name: /^Banda de ±2/ }));

    expect(screen.queryByTestId('card-bezier')).toBeNull();
    expect(screen.getByTestId('spring-plot').querySelectorAll('[data-series]')).toHaveLength(1);
    expect(() => readout(LABELS.vCurve)).toThrow();
    expect(document.querySelector('[data-band]')).toBeNull();
    expect(screen.queryByTestId('summary-curve')).toBeNull();
  });

  test('every preset and the drawer draw Plex glyphs only', async () => {
    const user = userEvent.setup();
    renderLab();

    for (const option of [...presetSelect().options]) {
      await user.selectOptions(presetSelect(), option.value);
      seekTo(0.2);
      fireEvent.click(interruptButton());
      expect(plexViolations(document.body), option.value).toEqual([]);
    }
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    expect(plexViolations(document.body), 'settings').toEqual([]);
  });

  test('a preset rewinds to a new run and its note line says what it teaches', async () => {
    renderLab();
    seekTo(0.2);
    fireEvent.click(interruptButton());

    await choosePreset('apple-ejemplo');

    expect((timeline() as HTMLInputElement).value).toBe('0');
    expect(value(LABELS.target)).toBe('1 000 px');
    expect(screen.getByRole('textbox', { name: /^Rigidez k/ })).toHaveValue('157,9');
    expect(mathSourceText(screen.getByTestId('preset-note'))).toMatch(
      /^La \(10\.10\) con \$d\$ = 0,5 s/,
    );
  });
});
