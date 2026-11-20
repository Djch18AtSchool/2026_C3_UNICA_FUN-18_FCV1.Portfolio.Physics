// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { readout } from '../../../test-readout';
import ResonanceLab from './ResonanceLab';

const USAGE = 'La tropa y el filtro corren en tiempo real.';
const LEFT_OUT = 'Un solo modo de cada estructura.';
/** The timeline maps [0, duration] onto 0..1000. */
const TIMELINE_MAX = 1000;

const lab = () => screen.getByTestId('resonance-lab');
const presetSelect = () =>
  screen.getByRole('combobox', { name: 'Valores de referencia' }) as HTMLSelectElement;
const presetNote = () => screen.getByTestId('preset-note');
const mode = (name: string) => screen.getByRole('radio', { name });
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const field = (name: RegExp) => screen.getByRole('textbox', { name });
const chips = () =>
  (document.querySelector('[data-lab-canvas-notes]')?.textContent ?? '').replace(/\s/g, ' ');
const badge = () =>
  (document.querySelector('[data-time-scale-badge]')?.textContent ?? '').replace(/\s/g, ' ');

function typeInto(input: HTMLElement, text: string): void {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

/** Moves the clock to `share` of the run, through the timeline. */
function seekShare(share: number): void {
  fireEvent.change(timeline(), { target: { value: String(share * TIMELINE_MAX) } });
}

/** Every readout's value: none may be «—» (not a number) or carry NaN or Infinity. */
function readoutValues(): string[] {
  return [...document.querySelectorAll('[data-readout]')].map(
    (row) => row.lastElementChild?.textContent ?? '',
  );
}

function expectFiniteReadouts(): void {
  for (const value of readoutValues()) expect(value).not.toMatch(/—|NaN|Infinity|∞/);
}

describe('ResonanceLab', () => {
  beforeEach(() => {
    resetSettingsForTests();
    installDialogPolyfill();
  });
  afterEach(cleanup);

  test('opens on the slow sweep: its preset, readouts, two events and its time scale', () => {
    render(<ResonanceLab usage={USAGE} leftOut={LEFT_OUT} />);

    expect(lab()).toHaveAttribute('data-lab-shell', 'tiered');
    expect(mode('Barrido')).toBeChecked();
    expect(presetSelect().value).toBe('barrido-lento');
    expect(presetNote()).toHaveTextContent(/400\ss/);
    expect(readout('Frecuencia de la fuerza $f_d$')).toBe('0,50 Hz');
    expect(readout('$\\omega_d/\\omega_0$')).toBe('0,50');
    expect(document.querySelector('[data-transport-events]')).not.toBeNull();
    expect(badge()).toMatch(/^×8\s?cámara rápida/);
    expect(chips()).toContain('lento desde');
    expect(screen.getByTestId('sweep-plot')).toBeInTheDocument();
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('the sweep runs through resonance: the drive is f0 at half the run', () => {
    render(<ResonanceLab />);

    seekShare(0.5);

    expect(readout('Frecuencia de la fuerza $f_d$')).toBe('1,00 Hz');
    expect(Number(readout('Amplitud medida $A/(F_0/k)$').replace(',', '.'))).toBeGreaterThan(4);
  });

  test('«Sin amortiguamiento» says «crece sin límite» and every readout stays finite at resonance', async () => {
    render(<ResonanceLab />);
    await userEvent.setup().selectOptions(presetSelect(), 'sin-amortiguamiento');

    seekShare(0.5);

    expect(chips()).toContain('crece sin límite');
    expectFiniteReadouts();
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('«Tropa»: N soldiers, the step choice, one event and real time', () => {
    render(<ResonanceLab />);

    fireEvent.click(mode('Tropa'));

    expect(field(/^Soldados N/)).toHaveValue('60');
    expect(screen.getByRole('radio', { name: 'Al paso' })).toBeChecked();
    expect(readout('Fuerza total $|F|$')).toBe('16,8 kN');
    expect(readout('En media cuadrática, $\\sqrt{N}$')).toBe('7,7');
    expect(badge()).toMatch(/^×1\s?velocidad real/);
    expect(chips()).toContain('dentro del rango de riesgo máximo');
    expect(screen.getByTestId('troop-plot')).toBeInTheDocument();
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('breaking step draws the phases: «Nuevo sorteo» changes the ratio and leaves the preset', async () => {
    render(<ResonanceLab />);
    await userEvent.setup().selectOptions(presetSelect(), 'tropa-rompiendo');
    const before = readout('Al paso / rompiendo el paso, este sorteo');

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo sorteo' }));

    expect(readout('Al paso / rompiendo el paso, este sorteo')).not.toBe(before);
    expect(presetNote()).toHaveTextContent(
      /^Valores modificados a partir de «60 soldados rompiendo el paso»/,
    );
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('«Tropa» without damping at the march pace: «crece sin límite», finite readouts, no event', async () => {
    render(<ResonanceLab />);
    await userEvent.setup().selectOptions(presetSelect(), 'tropa-al-paso');

    typeInto(field(/^Amortiguamiento zeta/), '0');
    seekShare(1);

    expect(chips()).toContain('al paso: crece sin límite');
    expectFiniteReadouts();
    const spoken = screen
      .getByTestId('troop-plot')
      .querySelector('svg[aria-label]')
      ?.getAttribute('aria-label');
    expect(spoken).toContain(
      'al paso hasta crecer sin límite, rompiendo el paso hasta crecer sin límite',
    );
    expect(spoken).not.toMatch(/—|NaN|Infinity/);
    expect(document.querySelector('[data-transport-events]')).toBeNull();
    expect(screen.getByTestId('deck-puente')).toHaveAttribute('data-clamped', 'true');
  });

  test('«Filtro ZV»: tuned, less than 1 % stays; with f0 10 % higher, far more', () => {
    render(<ResonanceLab />);
    fireEvent.click(mode('Filtro ZV'));

    expect(readout('Vibración residual (estimación de Klipper)')).toBe('0,0 %');
    expect(chips()).toContain('dentro de ±5 %');

    typeInto(field(/^Frecuencia natural f sub 0/), '1,1');

    expect(
      Number(
        readout('Vibración residual (estimación de Klipper)')
          .replace(/[^\d,]/g, '')
          .replace(',', '.'),
      ),
    ).toBeGreaterThan(10);
    expect(chips()).toContain('fuera de ±5 %');
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('the f0 knob on the ruler moves the same f0 as the field', () => {
    render(<ResonanceLab />);
    const knob = screen.getByTestId('f0-handle');

    fireEvent.keyDown(knob, { key: 'ArrowRight' });

    expect(field(/^Frecuencia natural f sub 0/)).toHaveValue('1,05');
    expect(presetSelect().value).toBe('');
  });

  test('a preset of another mode switches the mode; «Restablecer» comes back to the start', async () => {
    const user = userEvent.setup();
    render(<ResonanceLab />);

    await user.selectOptions(presetSelect(), 'zv-desafinado');
    expect(mode('Filtro ZV')).toBeChecked();
    expect(field(/^Frecuencia natural f sub 0/)).toHaveValue('1,1');

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));
    expect(mode('Barrido')).toBeChecked();
    expect(presetSelect().value).toBe('barrido-lento');
  });

  test('keys outside the fields: K plays and pauses, R rewinds', () => {
    render(<ResonanceLab />);
    seekShare(0.5);

    fireEvent.keyDown(lab(), { key: 'k' });
    expect(lab()).toHaveAttribute('data-playing', 'true');
    fireEvent.keyDown(lab(), { key: 'k' });
    expect(lab()).toHaveAttribute('data-playing', 'false');
    fireEvent.keyDown(lab(), { key: 'r' });
    expect(readout('Frecuencia de la fuerza $f_d$')).toBe('0,50 Hz');
  });

  test('every field edits the value of its own mode', () => {
    render(<ResonanceLab />);

    typeInto(field(/^Amortiguamiento zeta/), '0,2');
    expect(chips()).toContain('100 s: este lo es');
    typeInto(field(/^Duración del barrido T sub b/), '50');
    expect(chips()).toContain('este es rápido');

    fireEvent.click(mode('Tropa'));
    typeInto(field(/^Soldados N/), '100');
    expect(readout('Fuerza total $|F|$')).toBe('28,0 kN');
    typeInto(field(/^Frecuencia natural f sub 0/), '2,5');
    expect(chips()).toContain('fuera del rango de riesgo máximo');
    typeInto(field(/^Amortiguamiento zeta/), '1');
    expect(chips()).toContain('al paso: ');
    fireEvent.click(screen.getByRole('radio', { name: 'Rompiendo el paso' }));
    expect(screen.getByRole('button', { name: 'Nuevo sorteo' })).toBeInTheDocument();

    fireEvent.click(mode('Filtro ZV'));
    typeInto(field(/^Frecuencia del filtro f sub ZV/), '1,1');
    expect(readout('Desajuste $f_0/f_\\text{ZV} - 1$')).toBe('−9,1 %');
    typeInto(field(/^Amortiguamiento zeta/), '0');
    expect(readout('Fracción del primero $a_1$')).toBe('0,578');
  });

  test('«.» and «,» step a frame of playback; the plot’s cursor seeks the sweep', () => {
    render(<ResonanceLab />);
    const reading = () => timeline().getAttribute('aria-valuetext');
    const start = reading();

    fireEvent.keyDown(lab(), { key: '.' });
    expect(reading()).not.toBe(start);
    fireEvent.keyDown(lab(), { key: ',' });
    expect(reading()).toBe(start);

    fireEvent.keyDown(screen.getByRole('slider', { name: 'Frecuencia de la fuerza' }), {
      key: 'End',
    });
    expect(readout('Frecuencia de la fuerza $f_d$')).toBe('1,50 Hz');
  });

  test('the drawer hides the envelope band and the support plot', async () => {
    const user = userEvent.setup();
    render(<ResonanceLab />);
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    const dialog = screen.getByRole('dialog');

    await user.click(within(dialog).getByRole('switch', { name: 'Banda de la envolvente' }));
    await user.click(within(dialog).getByRole('switch', { name: 'Gráfica de apoyo' }));

    expect(document.querySelector('[data-envelope]')).toBeNull();
    expect(screen.queryByTestId('sweep-plot')).toBeNull();
    expect(plexViolations(document.body)).toEqual([]);
  });

  test('the topic’s notes close the card', () => {
    render(<ResonanceLab usage={USAGE} leftOut={LEFT_OUT} />);
    expect(document.querySelector('details[data-lab-note="usage"]')).toHaveTextContent(USAGE);
    expect(document.querySelector('details[data-lab-note="left-out"]')).toHaveTextContent(LEFT_OUT);
  });
});
