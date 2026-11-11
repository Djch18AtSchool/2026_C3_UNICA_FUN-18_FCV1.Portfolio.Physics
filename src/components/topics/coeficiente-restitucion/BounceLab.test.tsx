// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import BounceLab from './BounceLab';
import { readout } from '../../../test-readout';

const USAGE = 'A 1× la reproducción va en tiempo real.';
const LEFT_OUT = 'Desprecio el arrastre del aire.';
const usageNote = () => document.querySelector('details[data-lab-note="usage"]') as HTMLElement;
const leftOutNote = () =>
  document.querySelector('details[data-lab-note="left-out"]') as HTMLElement;
/** Tests that sweep presets or the timeline render the lab dozens of times; room under load. */
const HEAVY_TEST_TIMEOUT_MS = 20_000;

/** Identity CTM on every svg: client pixels are viewBox units, so DOM coordinates are pointer ones. */
function mockIdentityCtm(): void {
  for (const svg of document.querySelectorAll('svg')) {
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
    });
  }
}

function renderLab() {
  const view = render(<BounceLab usage={USAGE} leftOut={LEFT_OUT} />);
  mockIdentityCtm();
  return view;
}

const numberOf = (text: string) => Number(text.replace(/\s.*$/, '').replace(',', '.'));
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const presetSelect = () =>
  screen.getByRole('combobox', { name: 'Valores de referencia' }) as HTMLSelectElement;
const eRange = () => screen.getByRole('slider', { name: /^Coeficiente de restitución e/ });
const gear = () => screen.getByRole('button', { name: 'Ajustes del simulador' });
const ball = (which: 'ideal' | 'engine') => screen.getByTestId(`ball-${which}`);
const seekEnd = () => fireEvent.change(timeline(), { target: { value: '1000' } });

async function choosePreset(id: string) {
  await userEvent.setup().selectOptions(presetSelect(), id);
}

/** Opens the drawer and returns the dialog. */
async function openDrawer(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(gear());
  return screen.getByRole('dialog');
}

describe('BounceLab', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    localStorage.clear();
    resetSettingsForTests();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('opens on the ITF tennis ball with both balls, the engine defaults and the two disclosures', () => {
    renderLab();

    expect(presetSelect().value).toBe('tenis-itf');
    const scene = within(screen.getByTestId('bounce-scene'));
    expect(scene.getByText('Física ideal')).toBeInTheDocument();
    expect(scene.getByText('Motor de juego')).toBeInTheDocument();
    expect(screen.getByTestId('engine-config')).toHaveTextContent(/Δt = 1\/60 s × 4/);
    expect(screen.getByRole('textbox', { name: /^Coeficiente de restitución e/ })).toHaveValue(
      '0,745',
    );
    expect(ball('ideal')).toHaveAttribute('data-ball', 'tenis');
    expect(usageNote()).toHaveTextContent(USAGE);
    expect(leftOutNote()).toHaveTextContent(LEFT_OUT);
  });

  test('the presets come in two groups: realistic bounces and ones that feel wrong', () => {
    renderLab();
    const groups = presetSelect().querySelectorAll('optgroup');

    expect([...groups].map((group) => group.label)).toEqual([
      'Rebotes realistas',
      'Rebotes que se sienten mal',
    ]);
    expect(groups[0].querySelectorAll('option')).toHaveLength(8);
    expect(groups[1].querySelectorAll('option')).toHaveLength(6);
  });

  test('moving e changes the engine ball’s next apex and the measured e', () => {
    renderLab();
    const apexBefore = numberOf(readout('Primer rebote $h_1$ (motor)'));
    const measuredBefore = numberOf(readout(String.raw`e medido $\sqrt{h_1/h_0}$ (motor)`));

    fireEvent.change(eRange(), { target: { value: '0.5' } });

    const apexAfter = numberOf(readout('Primer rebote $h_1$ (motor)'));
    const measuredAfter = numberOf(readout(String.raw`e medido $\sqrt{h_1/h_0}$ (motor)`));
    expect(apexAfter).toBeLessThan(apexBefore);
    // h₁ ≈ e² h₀ = 0,25 · 2,54 m, a little less from the step's gravity.
    expect(apexAfter).toBeGreaterThan(0.6);
    expect(apexAfter).toBeLessThan(0.64);
    expect(measuredAfter).not.toBe(measuredBefore);
    expect(measuredAfter).toBeGreaterThan(0.48);
    expect(measuredAfter).toBeLessThanOrEqual(0.5);
    expect(presetSelect().value).toBe('');
  });

  test('"Umbral alto (Unity)" ends with 8 bounces and a resting ball after an 18,5 cm one', async () => {
    renderLab();
    await choosePreset('umbral-unity');

    seekEnd();

    expect(readout('Rebotes del motor')).toBe('8');
    expect(ball('engine')).toHaveAttribute('data-resting', 'true');
    const summary = screen.getByTestId('bounce-summary');
    expect(summary).toHaveTextContent(/8 rebotes/);
    expect(summary).toHaveTextContent(/18,5 cm/);
    expect(summary).toHaveTextContent(/8,58 s/);
  });

  test(
    '"e = 1,1" gains energy and the ball stays inside the canvas, clamped and explained',
    async () => {
      renderLab();
      await choosePreset('e-mayor-que-uno');
      const scene = screen.getByTestId('bounce-scene');
      const height = Number(scene.getAttribute('viewBox')?.split(' ')[3]);
      let sawClamp = false;

      for (let position = 0; position <= 1000; position += 50) {
        fireEvent.change(timeline(), { target: { value: String(position) } });
        for (const which of ['ideal', 'engine'] as const) {
          // The ball is drawn at the origin of a group translated to its centre.
          const circle = ball(which).querySelector('[data-ball-body]') as SVGCircleElement;
          const transform = circle.parentElement?.getAttribute('transform') ?? '';
          const cy = Number(/translate\([-\d.]+ ([-\d.]+)\)/.exec(transform)?.[1]);
          const r = Number(circle.getAttribute('r'));
          expect(cy - r).toBeGreaterThanOrEqual(0);
          expect(cy + r).toBeLessThanOrEqual(height);
          if (ball(which).getAttribute('data-clamped') === 'above') {
            sawClamp = true;
            expect(screen.getByTestId('scene-notes')).toHaveTextContent(/sale del cuadro/);
          }
        }
      }

      expect(sawClamp).toBe(true);
      expect(numberOf(readout('$E/E_0$ ideal'))).toBeGreaterThan(1);
      expect(screen.getByTestId('scene-notes')).toHaveTextContent(/gana energía/);
      expect(screen.getByTestId('bounce-summary')).toHaveTextContent('∞');
    },
    HEAVY_TEST_TIMEOUT_MS,
  );

  test(
    'readouts never show NaN or a dash for any preset',
    async () => {
      renderLab();
      const ids = [...presetSelect().querySelectorAll('option')]
        .map((option) => option.value)
        .filter(Boolean);

      for (const id of ids) {
        fireEvent.change(presetSelect(), { target: { value: id } });
        for (const position of ['0', '1000']) {
          fireEvent.change(timeline(), { target: { value: position } });
          for (const row of document.querySelectorAll('[data-readout]')) {
            expect(row.textContent, id).not.toMatch(/NaN|—/);
          }
        }
      }
    },
    HEAVY_TEST_TIMEOUT_MS,
  );

  test('the h₀ handle takes the arrow keys and changes the first rebound', async () => {
    const user = userEvent.setup();
    renderLab();
    const handle = screen.getByTestId('h0-handle');
    const apexBefore = readout('Primer rebote $h_1$ (motor)');
    expect(handle).toHaveAttribute('role', 'slider');

    handle.focus();
    await user.keyboard('{ArrowUp}');

    expect(handle).toHaveAttribute('aria-valuenow', '2.59');
    expect(handle.getAttribute('aria-valuetext')?.replace(/\s/g, ' ')).toBe('h sub 0 = 2,59 m');
    expect(readout('Primer rebote $h_1$ (motor)')).not.toBe(apexBefore);
    await user.keyboard('{End}');
    expect(handle).toHaveAttribute('aria-valuenow', '3');
  });

  test('dragging the h₀ handle down lowers the drop height', () => {
    renderLab();
    const handle = screen.getByTestId('h0-handle');
    const knob = handle.querySelector('[data-knob]') as SVGCircleElement;
    const start = { x: Number(knob.getAttribute('cx')), y: Number(knob.getAttribute('cy')) };

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: start.x, clientY: start.y });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: start.x, clientY: start.y + 60 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: start.x, clientY: start.y + 60 });

    expect(Number(handle.getAttribute('aria-valuenow'))).toBeLessThan(2.54);
    expect(screen.getByRole('textbox', { name: /^Altura de suelta/ })).not.toHaveValue('2,54');
  });

  test('collision mode conserves p to the displayed decimals for e = 0, 0,5 and 1', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('radio', { name: 'Choque de dos cuerpos' }));
    const eField = screen.getByRole('textbox', { name: /^Coeficiente de restitución e/ });

    for (const e of ['0', '0,5', '1']) {
      await user.clear(eField);
      await user.type(eField, `${e}{Enter}`);
      expect(readout('p antes'), e).toBe(readout('p después'));
    }
    // e = 1: no kinetic energy lost; ΔK/K_rel = 1 − e² = 0.
    expect(readout(String.raw`$\Delta K$ perdida`)).toBe('0,00 J');
    expect(readout(String.raw`$\Delta K/K_\text{rel}$`)).toBe(readout('1 − e²'));
  });

  test('collision mode: e = 0 leaves both bodies with the centre-of-mass velocity', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('radio', { name: 'Choque de dos cuerpos' }));
    const eField = screen.getByRole('textbox', { name: /^Coeficiente de restitución e/ });

    await user.clear(eField);
    await user.type(eField, '0{Enter}');

    expect(readout("$v_1'$")).toBe(readout("$v_2'$"));
    expect(readout(String.raw`$\Delta K/K_\text{rel}$`)).toBe('1,00');
  });

  test(
    'every character outside KaTeX, in both modes, every preset and the settings, is one IBM Plex draws',
    async () => {
      const user = userEvent.setup();
      renderLab();
      const ids = [...presetSelect().querySelectorAll('option')].map((option) => option.value);

      for (const id of ids) {
        await user.selectOptions(presetSelect(), id);
        expect(plexViolations(document.body), id).toEqual([]);
      }
      await user.click(gear());
      expect(plexViolations(document.body), 'settings').toEqual([]);
      await user.keyboard('{Escape}');
      await user.click(screen.getByRole('radio', { name: 'Choque de dos cuerpos' }));
      expect(plexViolations(document.body), 'collision').toEqual([]);
      await user.click(screen.getByRole('switch', { name: /m sub 2 tiende a infinito/ }));
      expect(plexViolations(document.body), 'wall').toEqual([]);
    },
    HEAVY_TEST_TIMEOUT_MS,
  );

  test('collision mode with a fixed body 2 is the floor: v₁′ = −e v₁', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('radio', { name: 'Choque de dos cuerpos' }));

    await user.click(screen.getByRole('switch', { name: /m sub 2 tiende a infinito/ }));

    expect(readout("$v_1'$")).toBe('−2,00 m/s');
    expect(screen.getByTestId('collision-notes')).toHaveTextContent(/piso/);
  });

  test('with reduced motion playback steps without requestAnimationFrame', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    const request = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', request);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    setSettings({ motion: 'reduced' });
    renderLab();
    const before = timeline().getAttribute('aria-valuetext');

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    act(() => vi.advanceTimersByTime(500));

    expect(request).not.toHaveBeenCalled();
    expect(timeline().getAttribute('aria-valuetext')).not.toBe(before);
  });

  test('the drawer opens from the keyboard, changes Δt and returns focus on Escape', async () => {
    const user = userEvent.setup();
    renderLab();
    gear().focus();

    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Paso del motor delta t' }),
      '30',
    );
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(gear()).toHaveFocus();
    expect(screen.getByTestId('engine-config')).toHaveTextContent(/Δt = 1\/30 s × 4/);
  });

  test('the drawer changes the mixing rule, and its Modo select reaches the collision mode', async () => {
    const user = userEvent.setup();
    renderLab();
    const dialog = await openDrawer(user);

    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Regla de combinación' }),
      'average',
    );
    expect(screen.getByTestId('bounce-summary')).toHaveTextContent(
      /promedio\(0,745; 0,000\) = 0,372/,
    );
    expect(screen.getByTestId('preset-note')).toHaveTextContent(/Partí de «Tenis ITF/);

    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Modo' }), 'collision');

    expect(screen.getByTestId('collision-scene')).toBeInTheDocument();
    expect(within(dialog).queryByRole('combobox', { name: 'Paso del motor delta t' })).toBeNull();
  });

  test('the Unity preset credits Unity only with the threshold and the rule, and says why the floor is 0,9', async () => {
    renderLab();
    await choosePreset('umbral-unity');
    const note = screen.getByTestId('preset-note');

    expect(note).toHaveTextContent(
      /umbral de 2 m\/s y la mezcla promedio, los valores por defecto de Unity 3D/,
    );
    expect(note).toHaveTextContent(/1\/60 s con 4 subpasos, es el fino de Box2D/);
    expect(note).toHaveTextContent(
      /con el suelo en 0, el valor por defecto de Unity, el promedio daría 0,450/,
    );
    // e halves, so the rebound height (e² h₀) falls to a quarter, not to a half (ruling R27).
    expect(note).toHaveTextContent(
      /e quedaría a la mitad y la altura del rebote, a la cuarta parte/,
    );
    expect(note).not.toHaveTextContent(/rebotaría la mitad/);
    // The stop is the kernel's: 8 rebounds, the last 18,5 cm, as on the page; one colon only.
    expect(note).toHaveTextContent(/daría 0,450; e quedaría/);
    expect(note).toHaveTextContent(/el último de 18,5 cm/);
  });

  test('with e(v) on, a preset with e > 1 no longer claims the ball gains energy', async () => {
    const user = userEvent.setup();
    renderLab();
    await choosePreset('e-mayor-que-uno');
    expect(screen.getByTestId('scene-notes')).toHaveTextContent(/gana energía/);
    const dialog = await openDrawer(user);

    await user.click(within(dialog).getByRole('switch', { name: /e\(v\)/ }));

    expect(screen.queryByTestId('scene-notes')?.textContent ?? '').not.toMatch(/gana energía/);
  });

  test('the e control holds the FIBA and FIFA centres exactly (step 0,001)', async () => {
    renderLab();

    // jsdom does not snap a range to its step, so the step itself is checked.
    expect(eRange()).toHaveAttribute('step', '0.001');
    await choosePreset('baloncesto-fiba');
    expect(eRange()).toHaveValue('0.767');
    await choosePreset('futbol-fifa');
    expect(eRange()).toHaveValue('0.851');
  });

  test('the mixing note gives every rule over a floor of 0,5 and over a floor of 0', async () => {
    renderLab();
    await choosePreset('mezcla');
    const note = screen.getByTestId('preset-note');

    expect(mathSourceText(note)).toContain(
      String.raw`suelo de 0,5: máx $\to$ 0,850; promedio $\to$ 0,675; producto $\to$ 0,425; suma recortada $\to$ 1,000`,
    );
    expect(mathSourceText(note)).toContain(
      String.raw`suelo de 0: máx $\to$ 0,850; promedio $\to$ 0,425; producto $\to$ 0,000; suma recortada $\to$ 0,850`,
    );
  });

  test('a threshold of 0 explains that the engine ball never rests', async () => {
    const user = userEvent.setup();
    renderLab();
    const dialog = await openDrawer(user);

    fireEvent.change(within(dialog).getByRole('slider', { name: /Umbral de restitución/ }), {
      target: { value: '0' },
    });

    expect(screen.getByTestId('scene-notes')).toHaveTextContent(/nunca queda en reposo/);
    expect(screen.getByTestId('scene-notes')).toHaveTextContent(/microrrebotes/);
  });

  test('the e(v) preset credits Fig. 8 to «Dynamic properties of tennis balls» (ruling R31)', async () => {
    renderLab();
    await choosePreset('realista-mejorado');
    const note = screen.getByTestId('preset-note');

    expect(note).toHaveTextContent(/Cross \(1999\), «Dynamic properties of tennis balls», Fig\. 8/);
    expect(note).not.toHaveTextContent(/The bounce of a ball/);
  });

  test('e(v) replaces the e control with the illustrative fit', async () => {
    const user = userEvent.setup();
    renderLab();
    const dialog = await openDrawer(user);

    await user.click(within(dialog).getByRole('switch', { name: /e\(v\)/ }));

    expect(screen.queryByRole('slider', { name: /^Coeficiente de restitución e/ })).toBeNull();
    expect(screen.getByTestId('speed-fit')).toHaveTextContent(/ajuste ilustrativo/);
    expect(screen.getByTestId('bounce-summary')).toHaveTextContent(/e\(v\)/);
  });

  test('"Pocos fps con Baumgarte" marks the gain and draws the sunk ball on the floor', async () => {
    renderLab();
    await choosePreset('pocos-fps');

    seekEnd();

    expect(screen.getByTestId('energy-plot').querySelector('[data-gain]')).not.toBeNull();
    expect(ball('engine')).toHaveAttribute('data-clamped', 'below');
    expect(screen.getByTestId('scene-notes')).toHaveTextContent(/penetración/);
    expect(numberOf(readout(String.raw`e medido $\sqrt{h_1/h_0}$ (motor)`))).toBeGreaterThan(0.75);
  });

  test('"Choque de reglas de combinación" shows the pair e the engine uses', async () => {
    renderLab();
    await choosePreset('mezcla');

    expect(screen.getByTestId('bounce-summary')).toHaveTextContent(/suma recortada/);
    expect(screen.getByText(/0,675/)).toBeInTheDocument();
  });

  test('keyboard shortcuts: Space plays, R rewinds, the period steps one engine frame', async () => {
    const user = userEvent.setup();
    renderLab();
    screen.getByTestId('h0-handle').focus();

    await user.keyboard('.');
    expect(timeline().getAttribute('aria-valuetext')?.replace(/\s/g, ' ')).toBe('t = 0,017 s');
    await user.keyboard(' ');
    expect(screen.getByTestId('bounce-lab')).toHaveAttribute('data-playing', 'true');
    await user.keyboard('r');
    expect(screen.getByTestId('bounce-lab')).toHaveAttribute('data-playing', 'false');
    expect(timeline().getAttribute('aria-valuetext')?.replace(/\s/g, ' ')).toBe('t = 0,000 s');
  });

  test('slow motion is stated on the page', async () => {
    const user = userEvent.setup();
    renderLab();
    const dialog = await openDrawer(user);

    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Velocidad' }), '0.25');

    expect(screen.getByTestId('scene-notes')).toHaveTextContent(/cámara lenta/);
  });

  test('"Restablecer" goes back to the tennis ball and the bounce mode', async () => {
    const user = userEvent.setup();
    renderLab();
    await choosePreset('plastilina');
    await user.click(screen.getByRole('radio', { name: 'Choque de dos cuerpos' }));

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(presetSelect().value).toBe('tenis-itf');
    expect(screen.getByTestId('bounce-scene')).toBeInTheDocument();
  });
});
