// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import RegenLab from './RegenLab';
import { readout } from '../../../test-readout';

const USAGE = 'En «Tramo» la reproducción va a velocidad real.';
const LEFT_OUT = 'Pendiente, viento y temperatura.';

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
  const view = render(<RegenLab usage={USAGE} leftOut={LEFT_OUT} />);
  mockIdentityCtm();
  return view;
}

const BATTERY = 'Energía a la batería $E_\\text{batería}$';
const FRICTION = 'Calor de fricción $E_\\text{fricción}$';
const LOSS = 'Pérdidas de conversión $E_\\text{conversión}$';
const RECOVERED = 'Recuperado, % de la tracción';
const POWER = 'Potencia en las ruedas P';
const SPEED = 'Velocidad v';

const lab = () => screen.getByTestId('regen-lab');
const etaSlider = () => screen.getByRole('slider', { name: /^Rendimiento/ });
const pMaxField = () => screen.getByRole('textbox', { name: /^Potencia máxima de regeneración/ });
const timeCursor = () => screen.getByRole('slider', { name: 'Tiempo' });
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const timelineText = () => (timeline().getAttribute('aria-valuetext') ?? '').replace(/\s/g, ' ');
const presetSelect = () =>
  screen.getByRole('combobox', { name: 'Valores de referencia' }) as HTMLSelectElement;
/** The text of the option the select shows: «Personalizado» once an edit left every preset. */
const presetShown = () => presetSelect().selectedOptions[0].textContent;
async function choosePreset(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.selectOptions(presetSelect(), screen.getByRole('option', { name }));
}
const flow = (id: string) =>
  screen.getByTestId('regen-scene').querySelector(`[data-flow="${id}"]`) as SVGGElement;

/** The view on show, as the chip beside the gear names it. */
const viewChip = () =>
  within(screen.getByRole('group', { name: 'Ajustes activos' })).getByRole('button', {
    name: /^Vista /,
  });
/** Picks a view in the drawer («Vista») and closes it. */
function chooseView(view: 'tramo' | 'ciclo'): void {
  fireEvent.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByRole('combobox', { name: 'Vista' }), {
    target: { value: view },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar ajustes' }));
}
/** Shows the whole cycle («Ciclo»). */
const showCycle = () => chooseView('ciclo');
/** Moves the energy cursor to the end of the cycle with the keyboard, in the view «Ciclo». */
function seekToEnd(): void {
  if (viewChip().getAttribute('aria-label') !== 'Vista Ciclo') showCycle();
  timeCursor().focus();
  fireEvent.keyDown(timeCursor(), { key: 'End' });
}
/** The badge's visible text, factor and words, as the canvas shows it. */
const badgeText = () =>
  [...(lab().querySelector('[data-time-scale-badge]')?.children ?? [])]
    .map((part) => part.textContent?.replace(/\s/g, ' '))
    .join(' ');
const marks = () => lab().querySelectorAll('[data-transport-mark]');
const nextEvent = () => screen.getByRole('button', { name: 'Evento siguiente' });
const previousEvent = () => screen.getByRole('button', { name: 'Evento anterior' });
/** Moves the transport to a timeline position (of 1000), as a drag would. */
const scrubTo = (position: number) =>
  fireEvent.change(timeline(), { target: { value: String(position) } });

/**
 * Replaces requestAnimationFrame with a queue the test flushes at chosen timestamps (ms);
 * cancelAnimationFrame removes a queued frame, as the browser does.
 */
function installFrameQueue() {
  let queue = new Map<number, FrameRequestCallback>();
  let nextId = 0;
  const request = vi.fn((callback: FrameRequestCallback) => {
    nextId += 1;
    queue.set(nextId, callback);
    return nextId;
  });
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => queue.delete(id));
  return {
    request,
    flush(now: number) {
      const pending = [...queue.values()];
      queue = new Map();
      act(() => pending.forEach((callback) => callback(now)));
    },
    get pending() {
      return queue.size;
    },
  };
}

describe('RegenLab', () => {
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

  test('opens in «Tramo» on the Model 3 in the UDDS: figure 6.3’s braking from its start, 376 s, with f(v) on', () => {
    renderLab();

    expect(viewChip()).toHaveAccessibleName('Vista Tramo');
    expect(timelineText()).toBe('t = 0,00 s');
    expect(readout(SPEED)).toBe('57,94 km/h');
    expect(readout(POWER)).toBe('3,81 kW');
    expect(readout(BATTERY)).toBe('0,173 kWh');
    expect(readout(LOSS)).toBe('0,043 kWh');
    expect(readout(FRICTION)).toBe('0,010 kWh');
    expect(readout(RECOVERED)).toBe('26,9 %');
    expect(presetShown()).toMatch(/^Model 3 · ciudad \(UDDS\)/);
  });

  test('«Tramo» plays the 26 s of the stretch at real time and declares ×1 on the canvas', () => {
    const frames = installFrameQueue();
    renderLab();

    expect(badgeText()).toBe('×1 velocidad real');
    expect(screen.getByTestId('regen-scene')).toContainElement(
      lab().querySelector('[data-time-scale-badge]') as HTMLElement,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    frames.flush(1000);
    frames.flush(1100);
    expect(timelineText()).toBe('t = 0,10 s');

    scrubTo(999);
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    for (const now of [2000, 2050, 2100]) frames.flush(now);
    expect(timelineText()).toBe('t = 26,00 s');
    expect(readout(SPEED)).toBe('0,00 km/h');
    expect(readout(BATTERY)).toBe('0,220 kWh');
    expect(lab()).toHaveAttribute('data-playing', 'false');
  });

  test('«Ciclo» shows the whole cycle 20 times faster, with its 17 stops on the timeline', () => {
    renderLab();
    expect(marks()).toHaveLength(1);

    showCycle();

    expect(badgeText()).toBe('×20 cámara rápida');
    expect(marks()).toHaveLength(17);
    expect(screen.getByTestId('regen-minimap').querySelector('[data-stretch]')).toBeNull();
  });

  test('switching views keeps the instant of the cycle: 389 s is t = 13 s of the stretch', () => {
    renderLab();
    scrubTo(500);
    expect(timelineText()).toBe('t = 13,00 s');

    showCycle();
    expect(timelineText()).toBe('t = 389 s');
    expect(readout(SPEED)).toBe('37,01 km/h');

    chooseView('tramo');
    expect(timelineText()).toBe('t = 13,00 s');
    expect(readout(SPEED)).toBe('37,01 km/h');
  });

  test('back to «Tramo» from an instant outside the stretch, it starts from the stretch’s beginning', () => {
    installFrameQueue();
    renderLab();
    showCycle();
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));

    scrubTo(85);
    chooseView('tramo');

    expect(timelineText()).toBe('t = 0,00 s');
    expect(lab()).toHaveAttribute('data-playing', 'false');
  });

  test('the event buttons jump to the stops: the stretch holds the 3rd, the cycle starts at the 1st', () => {
    renderLab();

    fireEvent.click(nextEvent());
    expect(timelineText()).toBe('t = 21,00 s · Detención 3 de 17');
    expect(readout(SPEED)).toBe('0,00 km/h');
    expect(nextEvent()).toHaveAttribute('aria-disabled', 'true');

    showCycle();
    expect(timelineText()).toBe('t = 397 s · Detención 3 de 17');
    fireEvent.click(previousEvent());
    expect(timelineText()).toBe('t = 333 s · Detención 2 de 17');
    scrubTo(0);
    fireEvent.click(nextEvent());
    expect(timelineText()).toBe('t = 125 s · Detención 1 de 17');
  });

  test('a minimap of v(t) situates the stretch in the cycle; the road is the stretch’s 236 m', () => {
    renderLab();
    const minimap = screen.getByTestId('regen-minimap');
    const road = screen.getByTestId('regen-road');

    expect(minimap.querySelector('[data-stretch]')).not.toBeNull();
    expect(minimap.querySelectorAll('[data-stop]')).toHaveLength(17);
    expect(road.textContent?.replace(/\s/g, ' ')).toBe('4,59 km4,83 km');

    showCycle();
    expect(road.textContent?.replace(/\s/g, ' ')).toBe('0,00 km11,99 km');
  });

  test('in «Tramo» the energy plot shades the stretch; its cursor seeks in it, and out of it moves to «Ciclo»', () => {
    renderLab();
    const plot = screen.getByTestId('regen-energy-plot');

    expect(plot.querySelector('[data-band="Tramo"]')).not.toBeNull();
    // One «t =» on screen: the transport's, counted from the stretch's start.
    expect(plot.querySelector('[data-cursor] text')).toBeNull();
    timeCursor().focus();
    fireEvent.keyDown(timeCursor(), { key: 'ArrowRight' });
    // 1 % of the cycle, 13,69 s: 389,69 s is still in the stretch.
    expect(timelineText()).toBe('t = 13,69 s');
    expect(viewChip()).toHaveAccessibleName('Vista Tramo');

    fireEvent.keyDown(timeCursor(), { key: 'ArrowRight' });
    expect(viewChip()).toHaveAccessibleName('Vista Ciclo');
    expect(timelineText()).toBe('t = 403 s');
    expect(plot.querySelector('[data-band]')).toBeNull();
    expect(plot.querySelector('[data-cursor] text')).toHaveTextContent(/t = 403\ss/);
  });

  test('the shell is the tiered one: η and P_máx in Parámetros, the five presets in Escenario, the view in the drawer', () => {
    const { container } = renderLab();
    const region = (name: string) => screen.getByRole('region', { name });

    expect(container.querySelector('[data-lab-shell="tiered"]')).not.toBeNull();
    expect(region('Parámetros')).toContainElement(etaSlider());
    expect(region('Parámetros')).toContainElement(pMaxField());
    expect(region('Parámetros').innerHTML).not.toMatch(/\bsm:grid-cols/);
    expect(region('Escenario')).toContainElement(presetSelect());
    expect(viewChip()).toHaveAccessibleName('Vista Tramo');
    expect(within(presetSelect()).getAllByRole('option')).toHaveLength(5);
    expect(region('Lecturas')).toContainElement(screen.getByText(SPEED));
    expect(container.querySelector('[data-lab-transport]')).not.toBeNull();
  });

  test('the cold battery option is plain text in the select and typeset in the note chip name', async () => {
    const user = userEvent.setup();
    renderLab();

    const option = screen.getByRole('option', { name: /^Batería fría o llena/ });
    expect(option).toHaveTextContent('Batería fría o llena (Pmáx 10 kW)');
    expect(option.textContent).not.toContain('$');
    await choosePreset(user, /^Batería fría o llena/);
    expect(screen.getByTestId('preset-note')).toHaveTextContent(/Con la batería fría o casi llena/);
    expect(screen.getByTestId('preset-note')).toHaveTextContent('Fuente: Model 3 · escenario');
  });

  test('the Model 3 presets link the EPA list’s public page as their source, not a download', () => {
    renderLab();

    const note = screen.getByTestId('preset-note');
    expect(note).toHaveTextContent('Fuente: EPA, vehículo 3R124-782214');
    expect(within(note).getByRole('link', { name: 'EPA, vehículo 3R124-782214' })).toHaveAttribute(
      'href',
      'https://www.epa.gov/compliance-and-fuel-economy-data/data-cars-used-testing-fuel-economy',
    );
  });

  test('beside the gear, chips for the cycle, f(v) and the speed that follow the drawer', async () => {
    const user = userEvent.setup();
    renderLab();
    const chips = () =>
      within(screen.getByRole('group', { name: 'Ajustes activos' }))
        .getAllByRole('button')
        .map((chip) => chip.getAttribute('aria-label'));
    expect(chips()).toEqual(['Vista Tramo', 'Ciclo UDDS · ciudad', 'f(v)', 'Velocidad 1×']);

    await user.click(screen.getByRole('button', { name: 'Ciclo UDDS · ciudad' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Ciclo de manejo (EPA)' }),
      'us06',
    );
    await user.click(within(dialog).getByRole('switch', { name: /^Desvanecimiento/ }));

    expect(chips()).toEqual(['Vista Tramo', 'Ciclo US06 · agresivo', 'Velocidad 1×']);
  });

  test('how to use it says the views, the events, the cursor, f(v) and the MDX text; the source of η is in what the model leaves out', () => {
    const { container } = renderLab();
    const usage = container.querySelector<HTMLDetailsElement>('details[data-lab-note="usage"]')!;
    const leftOut = container.querySelector<HTMLDetailsElement>(
      'details[data-lab-note="left-out"]',
    )!;

    expect(usage.open || leftOut.open).toBe(false);
    expect(usage).toHaveTextContent(
      'La vista se elige en los ajustes: «Tramo» reproduce la frenada',
    );
    expect(usage).toHaveTextContent('con 5 s antes y después (en el UDDS, la de la figura 6.3)');
    expect(usage).toHaveTextContent('saltan entre las detenciones');
    expect(usage).toHaveTextContent('Arrastra el cursor de la gráfica de energía');
    expect(usage).toHaveTextContent('fuera del tramo, la vista pasa a «Ciclo»');
    expect(usage).not.toHaveTextContent(/veces más rápida|×\d/);
    expect(usage).toHaveTextContent('apaga la regeneración cerca de detenerse');
    expect(usage).toHaveTextContent(USAGE);
    expect(usage).not.toHaveTextContent('engranaje');
    expect(usage).not.toHaveTextContent('Boretti');
    expect(leftOut).toHaveTextContent('Boretti midió del 70 al 80 % en un Leaf 2012');
    expect(leftOut).toHaveTextContent(LEFT_OUT);
  });

  test('without the MDX texts it still says how to use it and where η comes from', () => {
    const { container } = render(<RegenLab />);

    expect(container.querySelector('details[data-lab-note="usage"] p')).not.toBeNull();
    expect(container.querySelector('details[data-lab-note="left-out"] p')).not.toBeNull();
    expect(container.querySelectorAll('details[data-lab-note="left-out"] p')).toHaveLength(1);
  });

  test('the legend and the two explanations are canvas notes, with no controls, under the drawing', () => {
    const { container } = renderLab();
    const notes = container.querySelector('[data-lab-canvas-notes]') as HTMLElement;
    const canvas = container.querySelector('[data-lab-canvas]') as HTMLElement;

    expect(
      within(notes).getByRole('list', { name: 'Leyenda del flujo de potencia' }),
    ).toBeVisible();
    expect(notes).toHaveTextContent('El grosor es proporcional a |P|');
    expect(notes).toHaveTextContent('La barra del frenado en las ruedas se reparte');
    expect(notes.querySelector('button, a, input, select, [tabindex]')).toBeNull();
    expect(canvas.querySelector('[aria-label="Leyenda del flujo de potencia"]')).toBeNull();
    expect(canvas).toHaveTextContent('Energías acumuladas hasta t');
    expect(canvas).not.toHaveTextContent('El grosor es proporcional');
  });

  test('the drawings keep their height until they measure: fixed scene, SvgPlot-reserved plot, bars by container', () => {
    const { container } = renderLab();
    const scene = screen.getByTestId('regen-scene').querySelector('svg')!;
    const plotSvg = within(screen.getByTestId('regen-energy-plot')).getByRole(
      'img',
    ) as unknown as SVGSVGElement;

    expect(Number(scene.getAttribute('height'))).toBeGreaterThan(0);
    expect(scene.getAttribute('class')).not.toContain('h-auto');
    // SvgPlot's own default pair, reserved by container width (SvgPlot.reserve.test.tsx).
    expect(plotSvg.style.getPropertyValue('--plot-aspect-compact')).toBe('1.25');
    expect(plotSvg.style.getPropertyValue('--plot-aspect-wide')).toBe('1.6');

    // The bars switch layout by the stage's width, not the window's.
    expect(container.querySelector('[data-energy]')?.className).not.toMatch(/(^|\s)sm:/);
    expect(container.querySelector('[data-energy]')?.className).toMatch(/@md:/);
  });

  test('every character outside KaTeX is one IBM Plex draws, at the start, with zero regeneration and in the settings', async () => {
    const user = userEvent.setup();
    const { container } = renderLab();
    expect(plexViolations(container)).toEqual([]);

    fireEvent.change(etaSlider(), { target: { value: '0' } });
    expect(plexViolations(container)).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    expect(plexViolations(container)).toEqual([]);
  });

  test('the hint ties "no friction without f(v)" to the default 239 kW cap, not to any P_máx', () => {
    const { container } = renderLab();

    expect(mathSourceText(container).replace(/\s+/g, ' ')).toContain(
      '$f(v)$ apaga la regeneración cerca de detenerse; sin él, con el tope de 239 kW, la fricción no haría falta en estos ciclos.',
    );
  });

  test('the regime and the car line are HTML above the drawing, so they wrap on a phone', () => {
    renderLab();
    scrubTo(500);

    const phase = screen.getByText('Frenando con el motor y con fricción');
    expect(phase.closest('svg')).toBeNull();
    const title = screen.getByText('Tesla Model 3 Long Range RWD 2025');
    expect(title.closest('svg')).toBeNull();
  });

  test('the power flow runs wheels → motor → battery with widths proportional to |P|', () => {
    renderLab();
    scrubTo(500); // 389 s of the UDDS, braking from 41,4 to 37,0 km/h at 23,33 kW

    expect(flow('motor-wheels')).toHaveAttribute('data-kind', 'regen');
    expect(flow('battery-motor')).toHaveAttribute('data-kind', 'regen');
    // f(v) = 0,98 at road speed: 2 % of the 23,33 kW, 0,47 kW, goes to the friction brakes.
    expect(flow('wheels-brakes')).toHaveAttribute('data-kind', 'friction');
    expect(flow('wheels-brakes')).toHaveTextContent(/0,5\skW/);
    const width = (id: string) => Number(flow(id).getAttribute('data-width'));
    // 22,86 kW into the motor and 0,80 of it, 18,29 kW, into the battery, at 4 kW per pixel.
    expect(width('motor-wheels')).toBeCloseTo(5.72, 2);
    expect(width('battery-motor')).toBeCloseTo(4.57, 2);
    expect(flow('battery-motor')).toHaveTextContent(/18,3\skW/);
  });

  test('in «Ciclo» play advances t 20 times faster and stops at the end of the cycle without repeating', () => {
    const frames = installFrameQueue();
    renderLab();
    showCycle();
    // From the instant the stretch opened at, 376 s.
    expect(timelineText()).toBe('t = 376 s');

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    frames.flush(1000);
    // One 100 ms frame at 20× is two seconds of the cycle; the transport's settled time is
    // synced every 100 ms of playback.
    frames.flush(1100);
    expect(timelineText()).toBe('t = 378 s');

    fireEvent.change(timeline(), { target: { value: '999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    for (const now of [2000, 2050, 2100, 2150]) frames.flush(now);

    expect(timelineText()).toBe('t = 1 369 s');
    expect(lab()).toHaveAttribute('data-playing', 'false');
    expect(frames.pending).toBe(0);
    expect(readout(BATTERY)).toBe('0,645 kWh');
    expect(readout(LOSS)).toBe('0,161 kWh');
    expect(readout(FRICTION)).toBe('0,062 kWh');
    expect(readout(RECOVERED)).toBe('40,4 %');
  });

  test('"Batería fría o llena" caps P_máx at 10 kW: 0,448 kWh reach the battery over the UDDS', async () => {
    const user = userEvent.setup();
    renderLab();

    await choosePreset(user, /^Batería fría o llena/);
    seekToEnd();

    expect(pMaxField()).toHaveValue('10');
    expect(presetShown()).toMatch(/^Batería fría o llena/);
    expect(readout(BATTERY)).toBe('0,448 kWh');
    expect(readout(FRICTION)).toBe('0,308 kWh');
    expect(readout(RECOVERED)).toBe('28,1 %');
  });

  test('the highway and aggressive presets recover 12,5 % and 30,7 % of the traction', async () => {
    const user = userEvent.setup();
    renderLab();

    await choosePreset(user, /^Model 3 · carretera \(HWFET\)/);
    expect(timelineText()).toBe('t = 0,00 s');
    seekToEnd();
    expect(timelineText()).toBe('t = 765,0 s');
    expect(readout(RECOVERED)).toBe('12,5 %');

    await choosePreset(user, /^Model 3 · agresivo \(US06\)/);
    seekToEnd();
    expect(readout(RECOVERED)).toBe('30,7 %');
  });

  test('the Nissan LEAF preset swaps the car: 0,555 kWh, 34,6 %, back in the UDDS', async () => {
    const user = userEvent.setup();
    renderLab();

    await choosePreset(user, /^Nissan LEAF 2025 · ciudad/);
    seekToEnd();

    expect(readout(BATTERY)).toBe('0,555 kWh');
    expect(readout(RECOVERED)).toBe('34,6 %');
    expect(screen.getByTestId('regen-scene')).toHaveTextContent('Nissan LEAF 2025');
  });

  test('η = 0 recovers 0 % with no NaN, and says why', () => {
    renderLab();

    fireEvent.change(etaSlider(), { target: { value: '0' } });
    seekToEnd();

    expect(readout(RECOVERED)).toBe('0,0 %');
    expect(readout(BATTERY)).toBe('0,000 kWh');
    // All the motor takes, 0,806 kWh, is lost converting.
    expect(readout(LOSS)).toBe('0,806 kWh');
    expect(lab().textContent).not.toMatch(/NaN|Infinity/);
    expect(mathSourceText(screen.getByRole('note'))).toMatch(/\$\\eta\$ = 0/);
    expect(presetShown()).toBe('Personalizado');
  });

  test('P_máx = 0 sends all the braking to the friction brakes', async () => {
    const user = userEvent.setup();
    renderLab();

    scrubTo(500);
    await user.clear(pMaxField());
    await user.type(pMaxField(), '0{Enter}');

    expect(flow('wheels-brakes')).toHaveAttribute('data-kind', 'friction');
    expect(flow('motor-wheels')).toHaveAttribute('data-kind', 'idle');
    seekToEnd();
    expect(readout(FRICTION)).toBe('0,869 kWh');
    expect(readout(LOSS)).toBe('0,000 kWh');
    expect(readout(RECOVERED)).toBe('0,0 %');
    expect(mathSourceText(screen.getByRole('note'))).toMatch(/\$P_\\text\{máx\}\$ = 0/);
    expect(lab().textContent).not.toMatch(/NaN|Infinity/);
  });

  test('in «Ciclo» the energy cursor takes the keyboard: Home, arrows (1 % of the cycle) and End seek', () => {
    renderLab();
    showCycle();
    const before = readout(BATTERY);
    const cursor = timeCursor();
    cursor.focus();

    fireEvent.keyDown(cursor, { key: 'Home' });
    expect(timelineText()).toBe('t = 0 s');
    expect(readout(BATTERY)).toBe('0,000 kWh');
    expect(readout(RECOVERED)).toBe('0,0 %');

    fireEvent.keyDown(cursor, { key: 'ArrowRight' });
    expect(timelineText()).toBe('t = 14 s');

    fireEvent.keyDown(cursor, { key: 'End' });
    expect(readout(BATTERY)).not.toBe(before);
    expect(timelineText()).toBe('t = 1 369 s');
  });

  test('in «Ciclo» dragging the energy cursor seeks and pauses playback', () => {
    installFrameQueue();
    renderLab();
    showCycle();
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(lab()).toHaveAttribute('data-playing', 'true');
    const cursor = timeCursor();
    const knob = cursor.querySelector('[data-knob]') as SVGCircleElement;
    const x = Number(knob.getAttribute('cx'));

    fireEvent.pointerDown(cursor, { pointerId: 1, clientX: x, clientY: 0 });
    fireEvent.pointerMove(cursor, { pointerId: 1, clientX: x + 120, clientY: 0 });
    fireEvent.pointerUp(cursor, { pointerId: 1, clientX: x + 120, clientY: 0 });

    expect(lab()).toHaveAttribute('data-playing', 'false');
    expect(timelineText()).not.toBe('t = 376 s');
  });

  test('with motion "reduced" playback advances in discrete steps, with no frame loop', () => {
    vi.useFakeTimers();
    setSettings({ motion: 'reduced' });
    const frames = installFrameQueue();
    renderLab();

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    act(() => vi.advanceTimersByTime(250));

    // One step is 1/60 of the stretch: 26/60 = 0,433 s; the badge says the pace that is seen.
    expect(timelineText()).toBe('t = 0,43 s');
    expect(badgeText()).toBe('×1,7 cámara rápida');
    expect(frames.request).not.toHaveBeenCalled();
  });

  test('the settings drawer opens and closes with the keyboard and returns focus', async () => {
    const user = userEvent.setup();
    renderLab();
    const gear = screen.getByRole('button', { name: 'Ajustes del simulador' });
    gear.focus();

    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog).getByRole('combobox', { name: 'Ciclo de manejo (EPA)' })).toHaveValue(
      'udds',
    );
    expect(
      within(dialog).getByRole('switch', { name: 'Desvanecimiento a baja velocidad f(v)' }),
    ).toBeChecked();
    expect(within(dialog).getByRole('switch', { name: 'Repetir' })).not.toBeChecked();
    expect(
      within(within(dialog).getByRole('combobox', { name: 'Velocidad' })).getByRole('option', {
        name: '4×',
      }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(dialog).not.toHaveAttribute('open');
    expect(gear).toHaveFocus();
  });

  test('choosing another cycle in the drawer restarts it at t = 0 on its own road', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    const dialog = screen.getByRole('dialog');

    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Ciclo de manejo (EPA)' }),
      'hwfet',
    );
    await user.keyboard('{Escape}');

    // «Tramo» now plays the highway's largest braking, 729–765 s.
    expect(timelineText()).toBe('t = 0,00 s');
    expect(screen.getByTestId('regen-minimap').textContent?.replace(/\s/g, ' ')).toContain(
      'Tramo 729–765 s',
    );
    showCycle();
    expect(timelineText()).toBe('t = 729,0 s');
    expect(screen.getByTestId('regen-scene')).toHaveTextContent(/16,51\skm/);
    expect(presetShown()).toMatch(/^Model 3 · carretera/);
  });

  test('turning f(v) off shows the simple model: 0,695 kWh and no friction at all in the UDDS', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));

    await user.click(
      within(screen.getByRole('dialog')).getByRole('switch', {
        name: 'Desvanecimiento a baja velocidad f(v)',
      }),
    );
    await user.keyboard('{Escape}');
    seekToEnd();

    expect(readout(BATTERY)).toBe('0,695 kWh');
    expect(readout(FRICTION)).toBe('0,000 kWh');
    expect(readout(RECOVERED)).toBe('43,5 %');
    expect(presetShown()).toBe('Personalizado');
  });

  test('the cumulative bars follow t and name each energy', () => {
    renderLab();
    const bars = screen.getByRole('list', { name: 'Energías acumuladas hasta t' });

    for (const name of [
      'Tracción en las ruedas',
      'Carga en carretera',
      'Frenado en las ruedas',
      'A la batería',
      'Pérdidas de conversión $(1 - \\eta)$',
      'Calor de fricción',
    ]) {
      expect(
        [...bars.querySelectorAll('li > span:first-child')].map((label) => mathSourceText(label)),
      ).toContain(name);
    }
    const battery = () => bars.querySelector('[data-energy="eBattery"]') as HTMLElement;
    expect(battery()).toHaveTextContent(/0,173\skWh/);

    seekToEnd();
    expect(battery()).toHaveTextContent(/0,645\skWh/);
  });

  test('the braking bar is split into battery, conversion loss and friction, which fill it', () => {
    renderLab();
    seekToEnd();
    const brake = screen
      .getByRole('list', { name: 'Energías acumuladas hasta t' })
      .querySelector('[data-energy="eBrake"]') as HTMLElement;

    const parts = [...brake.querySelectorAll<HTMLElement>('[data-part]')];
    expect(parts.map((part) => part.dataset.part)).toEqual([
      'eBattery',
      'eConversionLoss',
      'eFriction',
    ]);
    const widths = parts.map((part) => parseFloat(part.style.width));
    // 0,869 kWh on a 0–2 kWh scale: 43,4 % of the bar, split 0,645 + 0,161 + 0,062.
    expect(widths.reduce((a, b) => a + b, 0)).toBeCloseTo(43.43, 1);
    expect(widths[0]).toBeCloseTo(32.26, 1);
    expect(screen.getByText(/lo disipado/)).toBeInTheDocument();
  });

  test('moving a parameter pauses playback', () => {
    installFrameQueue();
    renderLab();
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(lab()).toHaveAttribute('data-playing', 'true');

    fireEvent.change(etaSlider(), { target: { value: '0.7' } });

    expect(lab()).toHaveAttribute('data-playing', 'false');
  });

  test('Restablecer returns to the Model 3 in the UDDS, in «Tramo» at its start', async () => {
    const user = userEvent.setup();
    renderLab();
    await choosePreset(user, /^Nissan LEAF/);
    fireEvent.change(etaSlider(), { target: { value: '0.5' } });
    showCycle();
    scrubTo(500);

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(viewChip()).toHaveAccessibleName('Vista Tramo');
    expect(timelineText()).toBe('t = 0,00 s');
    expect(etaSlider()).toHaveValue('0.8');
    expect(presetShown()).toMatch(/^Model 3 · ciudad/);
    expect(readout(POWER)).toBe('3,81 kW');
  });

  test('the car rides along the road and stays on it, at the end of the stretch and of the cycle', () => {
    renderLab();
    const car = () => screen.getByTestId('regen-car');
    const x = () => Number(car().getAttribute('data-x'));
    const road = () => Number(screen.getByTestId('regen-road').getAttribute('data-x1'));
    const start = x();

    scrubTo(1000);
    // The 236 m of the stretch span the road: the car crosses most of it at real time.
    expect(x()).toBeGreaterThan(start + (road() - start) / 2);
    expect(x()).toBeLessThanOrEqual(road());

    seekToEnd();
    expect(x()).toBeLessThanOrEqual(road());
  });
});
