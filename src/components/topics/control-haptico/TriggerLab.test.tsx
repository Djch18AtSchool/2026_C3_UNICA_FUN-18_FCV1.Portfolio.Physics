// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import TriggerLab from './TriggerLab';
import { readout } from '../../../test-readout';

const LEFT_OUT = 'Recorrido supuesto de 8 mm; k y $x_0$ ilustrativos.';
const FRAME_MS = 16;
const RELEASE_BOUND_MS = 3000;

/** Identity CTM on every svg: client pixels are viewBox units, so DOM coordinates are pointer ones. */
function mockIdentityCtm(): void {
  for (const svg of document.querySelectorAll('svg')) {
    Object.defineProperty(svg, 'getScreenCTM', {
      configurable: true,
      value: () => ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }),
    });
  }
}

/** requestAnimationFrame on top of the fake setTimeout: one frame every 16 ms, with a timestamp. */
function stubAnimationFrame() {
  let now = 0;
  const request = vi.fn(
    (callback: FrameRequestCallback) =>
      setTimeout(() => {
        now += FRAME_MS;
        callback(now);
      }, FRAME_MS) as unknown as number,
  );
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  return request;
}

function stubReducedMotion(isReduced: boolean): void {
  vi.stubGlobal('matchMedia', () => ({
    matches: isReduced,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

function renderLab() {
  const view = render(<TriggerLab leftOut={LEFT_OUT} />);
  mockIdentityCtm();
  return view;
}

const lever = () => screen.getByRole('slider', { name: 'Recorrido del gatillo x' });
const kField = () => screen.getByRole('textbox', { name: /^Rigidez k/ });
const startField = () => screen.getByRole('textbox', { name: /^Inicio de la resistencia/ });
const releaseButton = () => screen.getByRole('button', { name: 'Soltar el gatillo' });
const replayButton = () => screen.getByRole('button', { name: 'Repetir retorno' });
const preset = (name: RegExp) =>
  within(screen.getByRole('group', { name: 'Valores de referencia' })).getByRole('button', {
    name,
  });
const dampingSelect = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
  return within(screen.getByRole('dialog')).getByRole('combobox', { name: /^Amortiguación/ });
};

function typeInto(field: HTMLElement, value: string): void {
  fireEvent.change(field, { target: { value } });
  fireEvent.keyDown(field, { key: 'Enter' });
}

/** Presses the lever all the way down with the pointer (far below the pivot) and holds it. */
function pressToBottom(): void {
  const knob = lever().querySelector('[data-knob]') as SVGCircleElement;
  const start = { x: Number(knob.getAttribute('cx')), y: Number(knob.getAttribute('cy')) };
  fireEvent.pointerDown(lever(), { pointerId: 1, clientX: start.x, clientY: start.y });
  fireEvent.pointerMove(lever(), { pointerId: 1, clientX: start.x, clientY: start.y + 2000 });
}

function releasePointer(): void {
  fireEvent.pointerUp(lever(), { pointerId: 1, clientX: 0, clientY: 2000 });
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('TriggerLab', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('opens at rest with k = 400 N/m and x₀ = 0, with no transport bar', () => {
    renderLab();

    expect(readout('Desplazamiento x')).toBe('0,0 mm');
    expect(readout('Fuerza del gatillo F')).toBe('0,00 N');
    expect(kField()).toHaveValue('400');
    expect(startField()).toHaveValue('0');
    expect(lever()).toHaveAttribute('aria-valuemin', '0');
    expect(lever()).toHaveAttribute('aria-valuemax', '8');
    expect(screen.queryByRole('button', { name: 'Reproducir' })).toBeNull();
    expect(screen.getByText(/energía elástica del resorte ideal/i)).toBeInTheDocument();
  });

  test('the shell is the tiered one: k and x₀ in Parámetros, the presets in Escenario, no clock', () => {
    const { container } = renderLab();
    const region = (name: string) => screen.getByRole('region', { name });

    expect(container.querySelector('[data-lab-shell="tiered"]')).not.toBeNull();
    expect(region('Parámetros')).toContainElement(kField());
    expect(region('Parámetros')).toContainElement(startField());
    expect(region('Parámetros').innerHTML).not.toMatch(/\bsm:grid-cols/);
    expect(
      within(region('Escenario')).getByRole('group', { name: 'Valores de referencia' }),
    ).toBeInTheDocument();
    expect(region('Lecturas')).toContainElement(screen.getByText('Fuerza del gatillo F'));
    expect(container.querySelector('[data-lab-transport]')).toBeNull();
    expect(within(region('Parámetros')).queryByRole('button')).toBe(
      within(region('Parámetros')).queryByRole('button', { name: 'Restablecer' }),
    );
  });

  test('the two release buttons sit on the canvas under the lever; the legend is a canvas note without controls', () => {
    const { container } = renderLab();
    const canvas = container.querySelector('[data-lab-canvas]') as HTMLElement;
    const notes = container.querySelector('[data-lab-canvas-notes]') as HTMLElement;

    expect(canvas).toContainElement(releaseButton());
    expect(canvas).toContainElement(replayButton());
    expect(
      lever().compareDocumentPosition(releaseButton()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(notes).toHaveTextContent(/energía elástica del resorte ideal/i);
    expect(notes).toHaveTextContent('10 veces más lenta');
    expect(notes.querySelector('button, a, input, select, [tabindex]')).toBeNull();
  });

  test('the three presets are chips; under them the note and its source', () => {
    renderLab();
    expect(screen.getByTestId('preset-note')).toHaveTextContent(/Fuente: cálculo propio/);

    fireEvent.click(preset(/^Resorte tardío/));
    expect(screen.getByTestId('preset-note')).toHaveTextContent(
      /^El ejemplo del paso 4.*Fuente: cálculo propio con la ecuación \(5\.4\)/,
    );
    fireEvent.click(preset(/^Subamortiguado/));
    expect(screen.getByTestId('preset-note')).toHaveTextContent(/Fuente: supuesto del modelo/);
  });

  test('beside the gear, a chip with the damping that follows the drawer', () => {
    renderLab();
    const chips = () =>
      within(screen.getByRole('group', { name: 'Ajustes activos' }))
        .getAllByRole('button')
        .map((chip) => chip.getAttribute('aria-label'));
    expect(chips()).toEqual(['Amortiguación Crítica, c = 2 raíz(k m)']);

    fireEvent.change(dampingSelect(), { target: { value: 'subamortiguada' } });

    expect(chips()).toEqual(['Amortiguación Subamortiguada, 0,3 del valor crítico']);
  });

  test('how to use it says the drag, the keys and the two buttons, not the gear; what the model leaves out is closed', () => {
    const { container } = renderLab();
    const usage = container.querySelector<HTMLDetailsElement>('details[data-lab-note="usage"]')!;
    const leftOut = container.querySelector<HTMLDetailsElement>(
      'details[data-lab-note="left-out"]',
    )!;

    expect(usage.open || leftOut.open).toBe(false);
    expect(usage).toHaveTextContent('Arrastra la palanca y suéltala');
    expect(usage).toHaveTextContent('«Soltar el gatillo»');
    expect(usage).toHaveTextContent('«Repetir retorno»');
    expect(usage).not.toHaveTextContent('engranaje');
    expect(mathSourceText(leftOut)).toContain(LEFT_OUT);
  });

  test('without the MDX text there is no empty «Qué deja fuera el modelo»', () => {
    const { container } = render(<TriggerLab />);

    expect(container.querySelector('details[data-lab-note="left-out"]')).toBeNull();
  });

  test('the drawings keep their height until they measure: the lever has a fixed one, the plot reserves its two aspects', () => {
    renderLab();
    const svg = screen.getByTestId('trigger-lever');
    const plotSvg = within(screen.getByTestId('trigger-plot')).getByRole(
      'img',
    ) as unknown as SVGSVGElement;

    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(0);
    expect(svg.getAttribute('class')).not.toContain('h-auto');
    // SvgPlot reserves them by container width (SvgPlot.reserve.test.tsx): squarer in a stage.
    expect(plotSvg.style.getPropertyValue('--plot-aspect-compact')).toBe('1.1');
    expect(plotSvg.style.getPropertyValue('--plot-aspect-wide')).toBe('2');
  });

  test('every character outside KaTeX is one IBM Plex draws, in the lab, its settings and the notes', () => {
    const { container } = renderLab();
    expect(plexViolations(container)).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    expect(plexViolations(container)).toEqual([]);
  });

  test('the notation is typeset: x₀ on the lever and in the field, U and W in the note', () => {
    const { container } = renderLab();
    fireEvent.click(screen.getByRole('button', { name: /^Resorte tardío/ }));

    expect(mathSourceText(startField().closest('div'))).toContain('$x_0$');
    expect(container.querySelector('[data-mark="x0"] [data-notation]')).not.toBeNull();
    const note = mathSourceText(screen.getByText(/energía elástica del resorte ideal/i));
    expect(note).toContain('$U = \\tfrac12 k x^2$');
    expect(note).toContain('$W = \\tfrac12 k (x - x_0)^2$');
  });

  test('dragging the trigger to 8 mm shows F = 3,2 N and U = 12,8 mJ', () => {
    stubAnimationFrame();
    renderLab();

    pressToBottom();

    expect(lever()).toHaveAttribute('aria-valuenow', '8');
    expect(lever()).toHaveAttribute('aria-valuetext', expect.stringMatching(/^x = 8,0\smm$/));
    expect(readout('Desplazamiento x')).toBe('8,0 mm');
    expect(readout('Fuerza del gatillo F')).toBe('3,20 N');
    expect(readout('Energía elástica U, resorte ideal')).toBe('12,80 mJ');
    expect(readout('Trabajo del dedo W')).toBe('12,80 mJ');
    act(() => setSettings({ decimals: 1 }));
    expect(readout('Fuerza del gatillo F')).toBe('3,2 N');
    expect(document.querySelector('[data-marker]')).not.toBeNull();
  });

  test('releasing the trigger brings x back to 0 with the damped spring, then stops', () => {
    const request = stubAnimationFrame();
    renderLab();
    pressToBottom();

    releasePointer();
    advance(2 * FRAME_MS);
    const midway = Number(lever().getAttribute('aria-valuenow'));
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(8);
    advance(RELEASE_BOUND_MS);

    expect(readout('Desplazamiento x')).toBe('0,0 mm');
    expect(readout('Fuerza del gatillo F')).toBe('0,00 N');
    const calls = request.mock.calls.length;
    advance(1000);
    expect(request.mock.calls.length).toBe(calls);
  });

  test('the keyboard presses and holds the trigger, and "Soltar el gatillo" releases it', () => {
    stubAnimationFrame();
    renderLab();
    expect(releaseButton()).toBeDisabled();

    lever().focus();
    fireEvent.keyDown(lever(), { key: 'End' });
    advance(1000);
    expect(readout('Fuerza del gatillo F')).toBe('3,20 N');
    fireEvent.keyDown(lever(), { key: 'ArrowLeft', shiftKey: true });
    expect(readout('Desplazamiento x')).toBe('7,0 mm');
    fireEvent.keyDown(lever(), { key: 'ArrowRight' });
    expect(readout('Desplazamiento x')).toBe('7,1 mm');

    fireEvent.click(releaseButton());
    advance(RELEASE_BOUND_MS);
    expect(readout('Desplazamiento x')).toBe('0,0 mm');
  });

  test('with reduced motion the release jumps to rest without animating', () => {
    stubReducedMotion(true);
    const request = stubAnimationFrame();
    renderLab();
    pressToBottom();

    releasePointer();

    expect(readout('Desplazamiento x')).toBe('0,0 mm');
    expect(request).not.toHaveBeenCalled();
  });

  test('the global "reduced" motion setting also skips the animation', () => {
    setSettings({ motion: 'reduced' });
    const request = stubAnimationFrame();
    renderLab();
    lever().focus();
    fireEvent.keyDown(lever(), { key: 'End' });

    fireEvent.click(releaseButton());

    expect(readout('Desplazamiento x')).toBe('0,0 mm');
    expect(request).not.toHaveBeenCalled();
  });

  test('k and x₀ reshape the profile: 1,6 N at k = 200, and 2,0 N with 5,0 mJ from x₀ = 3 mm', () => {
    stubAnimationFrame();
    renderLab();
    lever().focus();
    fireEvent.keyDown(lever(), { key: 'End' });

    typeInto(kField(), '200');
    expect(readout('Fuerza del gatillo F')).toBe('1,60 N');
    typeInto(kField(), '400');
    typeInto(startField(), '3');

    expect(readout('Fuerza del gatillo F')).toBe('2,00 N');
    expect(readout('Trabajo del dedo W')).toBe('5,00 mJ');
    expect(readout('Energía elástica U, resorte ideal')).toBe('12,80 mJ');
  });

  test('the release stops at rest, never below 0, and sooner when underdamped', () => {
    stubAnimationFrame();
    renderLab();
    /** Presses to 8 mm with the keys, lets go and counts frames until rest; returns the lowest x. */
    const releaseOnce = () => {
      fireEvent.keyDown(lever(), { key: 'End' });
      fireEvent.click(releaseButton());
      const samples: number[] = [];
      while (
        readout('Desplazamiento x') !== '0,0 mm' &&
        samples.length * FRAME_MS < RELEASE_BOUND_MS
      ) {
        advance(FRAME_MS);
        samples.push(Number(lever().getAttribute('aria-valuenow')));
      }
      return { frames: samples.length, lowest: Math.min(...samples) };
    };

    const critical = releaseOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    fireEvent.change(
      within(screen.getByRole('dialog')).getByRole('combobox', { name: /^Amortiguación/ }),
      {
        target: { value: 'subamortiguada' },
      },
    );
    const underdamped = releaseOnce();

    expect(critical.lowest).toBeGreaterThanOrEqual(0);
    expect(underdamped.lowest).toBeGreaterThanOrEqual(0);
    expect(underdamped.frames).toBeLessThan(critical.frames);
    expect(readout('Desplazamiento x')).toBe('0,0 mm');
  });

  test('a pointer release starts the return from the release point', () => {
    stubAnimationFrame();
    renderLab();
    pressToBottom();
    const hit = lever().querySelector('line') as SVGLineElement;
    const pivot = { x: Number(hit.getAttribute('x1')), y: Number(hit.getAttribute('y1')) };

    // Halfway through the 24° turn from rest (−12°) is 0°: straight right of the pivot, 4 mm.
    fireEvent.pointerUp(lever(), { pointerId: 1, clientX: pivot.x + 200, clientY: pivot.y });

    expect(readout('Desplazamiento x')).toBe('4,0 mm');
    advance(RELEASE_BOUND_MS);
    expect(readout('Desplazamiento x')).toBe('0,0 mm');
  });

  test('"Restablecer" stops a release and restores the defaults', () => {
    stubAnimationFrame();
    renderLab();
    typeInto(kField(), '200');
    pressToBottom();
    releasePointer();
    advance(FRAME_MS);

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
    advance(RELEASE_BOUND_MS);

    expect(kField()).toHaveValue('400');
    expect(readout('Desplazamiento x')).toBe('0,0 mm');
  });

  test('the presets set k, x₀ and the damping, and the readouts follow', () => {
    stubAnimationFrame();
    renderLab();
    lever().focus();
    fireEvent.keyDown(lever(), { key: 'End' });

    fireEvent.click(preset(/^Resorte tardío/));
    expect(kField()).toHaveValue('400');
    expect(startField()).toHaveValue('3');
    expect(readout('Fuerza del gatillo F')).toBe('2,00 N');
    expect(readout('Trabajo del dedo W')).toBe('5,00 mJ');
    expect(preset(/^Resorte tardío/)).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(preset(/^Subamortiguado/));
    expect(startField()).toHaveValue('0');
    expect(readout('Fuerza del gatillo F')).toBe('3,20 N');
    expect(dampingSelect()).toHaveValue('subamortiguada');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ajustes' }));

    fireEvent.click(preset(/^Resorte ideal/));
    expect(dampingSelect()).toHaveValue('critica');
    expect(preset(/^Resorte ideal/)).toHaveAttribute('aria-pressed', 'true');
  });

  test('"Repetir retorno" waits for a release, then replays it from the last pressed x', () => {
    stubAnimationFrame();
    renderLab();
    expect(replayButton()).toBeDisabled();

    lever().focus();
    fireEvent.keyDown(lever(), { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(lever(), { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(lever(), { key: 'ArrowRight', shiftKey: true });
    expect(replayButton()).toBeDisabled();
    fireEvent.click(releaseButton());
    advance(RELEASE_BOUND_MS);
    expect(readout('Desplazamiento x')).toBe('0,0 mm');
    expect(replayButton()).toBeEnabled();

    fireEvent.click(replayButton());
    expect(readout('Desplazamiento x')).toBe('3,0 mm');
    advance(2 * FRAME_MS);
    const midway = Number(lever().getAttribute('aria-valuenow'));
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(3);
    advance(RELEASE_BOUND_MS);
    expect(readout('Desplazamiento x')).toBe('0,0 mm');
  });

  test('"Restablecer" forgets the last release', () => {
    stubAnimationFrame();
    renderLab();
    pressToBottom();
    releasePointer();
    advance(RELEASE_BOUND_MS);
    expect(replayButton()).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(replayButton()).toBeDisabled();
  });

  test('the lever names its force with the global decimals', () => {
    stubAnimationFrame();
    setSettings({ decimals: 1 });
    renderLab();
    lever().focus();
    fireEvent.keyDown(lever(), { key: 'End' });

    expect(screen.getByRole('img', { name: /^Gatillo, no a escala/ })).toHaveAccessibleName(
      /empuja el dedo con 3,2\sN\.$/,
    );
  });
});
