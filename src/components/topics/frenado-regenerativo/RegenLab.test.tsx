// @vitest-environment jsdom
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { readout } from '../../../test-readout';
import { setSettings } from '../../../lib/settingsStore';
import { mathSourceText } from '../../../test-inline-math';
import {
  renderLab,
  BATTERY,
  FRICTION,
  LOSS,
  RECOVERED,
  STRETCH_BATTERY,
  STRETCH_FRICTION,
  STRETCH_LOSS,
  STRETCH_RECOVERED,
  STRETCH_BARS,
  CYCLE_BARS,
  POWER,
  SPEED,
  lab,
  etaSlider,
  pMaxField,
  timeCursor,
  timeline,
  timelineText,
  presetShown,
  choosePreset,
  flow,
  shownView,
  chooseView,
  cycleSelect,
  showCycle,
  seekToEnd,
  badgeText,
  marks,
  nextEvent,
  previousEvent,
  scrubTo,
  installFrameQueue,
  installRegenLabLifecycle,
} from './regenLabTestKit';

describe('RegenLab', () => {
  installRegenLabLifecycle();

  test('opens in «Tramo» on the Model 3 in the UDDS: figure 6.3’s braking from its start, 376 s, with f(v) on', () => {
    renderLab();

    expect(shownView()).toHaveAccessibleName('Tramo');
    expect(timelineText()).toBe('t = 376,00 s');
    expect(readout(SPEED)).toBe('57,94 km/h');
    expect(readout(POWER)).toBe('3,81 kW');
    // The stretch's own energies: nothing yet at its start (ruling R21).
    expect(readout(STRETCH_BATTERY)).toBe('0,0 kJ');
    expect(readout(STRETCH_LOSS)).toBe('0,0 kJ');
    expect(readout(STRETCH_FRICTION)).toBe('0,0 kJ');
    expect(readout(STRETCH_RECOVERED)).toBe('0,0 %');
    expect(presetShown()).toMatch(/^Model 3 · ciudad \(UDDS\)/);
  });

  test('at the stretch’s end its readouts are figure 6.3’s braking: 168,1 + 42,0 + 13,9 = 224 kJ, 75,0 % recovered', () => {
    renderLab();
    scrubTo(1000);

    expect(readout(STRETCH_BATTERY)).toBe('168,1 kJ');
    expect(readout(STRETCH_LOSS)).toBe('42,0 kJ');
    expect(readout(STRETCH_FRICTION)).toBe('13,9 kJ');
    expect(readout(STRETCH_RECOVERED)).toBe('75,0 %');
    const bars = screen.getByRole('list', { name: STRETCH_BARS });
    expect(bars.querySelector('[data-energy="eBrake"]')).toHaveTextContent(/224,0\skJ/);
    expect(screen.getByText(/\(escala de 0 a 250\skJ\)/)).toBeInTheDocument();
  });

  test('«Ciclo» keeps the cycle’s readouts: at 376 s, 0,173 kWh to the battery and 26,9 % of the traction', () => {
    renderLab();
    showCycle();

    expect(timelineText()).toBe('t = 376 s');
    expect(readout(BATTERY)).toBe('0,173 kWh');
    expect(readout(LOSS)).toBe('0,043 kWh');
    expect(readout(FRICTION)).toBe('0,010 kWh');
    expect(readout(RECOVERED)).toBe('26,9 %');
    expect(screen.getByRole('list', { name: CYCLE_BARS })).toBeInTheDocument();
    expect(screen.getByText(/\(escala de 0 a 2,0\skWh\)/)).toBeInTheDocument();
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
    expect(timelineText()).toBe('t = 376,10 s');

    scrubTo(999);
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    for (const now of [2000, 2050, 2100]) frames.flush(now);
    expect(timelineText()).toBe('t = 402,00 s');
    expect(readout(SPEED)).toBe('0,00 km/h');
    expect(readout(STRETCH_BATTERY)).toBe('168,1 kJ');
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

  test('switching views keeps the instant of the cycle: 389 s of the cycle, 13 s into the stretch, reads 389 s in both', () => {
    renderLab();
    scrubTo(500);
    expect(timelineText()).toBe('t = 389,00 s');

    showCycle();
    expect(timelineText()).toBe('t = 389 s');
    expect(readout(SPEED)).toBe('37,01 km/h');

    chooseView('Tramo');
    expect(timelineText()).toBe('t = 389,00 s');

    // Picking the view on show changes nothing.
    chooseView('Tramo');
    expect(timelineText()).toBe('t = 389,00 s');
    expect(readout(SPEED)).toBe('37,01 km/h');
  });

  test('back to «Tramo» from an instant outside the stretch, it starts from the stretch’s beginning', () => {
    installFrameQueue();
    renderLab();
    showCycle();
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));

    scrubTo(85);
    chooseView('Tramo');

    expect(timelineText()).toBe('t = 376,00 s');
    expect(lab()).toHaveAttribute('data-playing', 'false');
  });

  test('the stretch holds one stop (named under the timeline, no pair); the cycle’s pair jumps between its 17', () => {
    renderLab();

    // One event: its mark and the line say it; the pair takes no place (MIN_EVENTS_FOR_PAIR).
    expect(marks()).toHaveLength(1);
    expect(lab().querySelector('[data-transport-event]')?.textContent).toBe(
      'Siguiente: Detención 3 de 17 · t = 397,00\u202Fs',
    );
    expect(screen.queryByRole('button', { name: 'Evento siguiente' })).toBeNull();
    // Half a position of the timeline counts as on it: 808/1000 of 26 s reads 397,01 s.
    scrubTo(Math.round((21 / 26) * 1000));
    expect(timelineText()).toBe('t = 397,01 s · Detención 3 de 17');
    expect(readout(SPEED)).toBe('0,00 km/h');

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
    // The stretch's road is to scale, the car is not: the note says its length and that.
    expect(screen.getByTestId('regen-scene').textContent?.replace(/\s/g, ' ')).toContain(
      '236 m · auto no a escala',
    );

    showCycle();
    expect(road.textContent?.replace(/\s/g, ' ')).toBe('0,00 km11,99 km');
  });

  test('in «Tramo» the energy plot shades the stretch and its cursor stays in it, reading the cycle’s t as the transport does', () => {
    renderLab();
    const plot = screen.getByTestId('regen-energy-plot');

    expect(plot.querySelector('[data-band="Tramo"]')).not.toBeNull();
    timeCursor().focus();
    fireEvent.keyDown(timeCursor(), { key: 'ArrowRight' });
    // 1 % of the cycle, 13,69 s: 389,69 s is still in the stretch.
    expect(timelineText()).toBe('t = 389,69 s');
    expect(timeCursor()).toHaveAttribute(
      'aria-valuetext',
      timeline().getAttribute('aria-valuetext'),
    );

    fireEvent.keyDown(timeCursor(), { key: 'ArrowRight' });
    fireEvent.keyDown(timeCursor(), { key: 'End' });
    // The view changes only from the drawer: the cursor stops at the stretch's end.
    expect(shownView()).toHaveAccessibleName('Tramo');
    expect(timelineText()).toBe('t = 402,00 s');
    fireEvent.keyDown(timeCursor(), { key: 'Home' });
    expect(timelineText()).toBe('t = 376,00 s');
    expect(plot.querySelector('[data-cursor] text')?.textContent?.replace(/\s/g, ' ')).toBe(
      't = 376,00 s',
    );

    showCycle();
    expect(plot.querySelector('[data-band]')).toBeNull();
    expect(timeCursor().getAttribute('aria-valuetext')?.replace(/\s/g, ' ')).toBe('t = 376 s');
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
    expect(timelineText()).toBe('t = 729,00 s');
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
    expect(timelineText()).toBe('t = 376,43 s');
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
    expect(
      within(dialog).getByRole('switch', { name: 'Desvanecimiento a baja velocidad f(v)' }),
    ).toBeChecked();
    expect(within(dialog).getByRole('switch', { name: 'Repetir' })).not.toBeChecked();

    await user.keyboard('{Escape}');
    expect(dialog).not.toHaveAttribute('open');
    expect(gear).toHaveFocus();
  });

  test('the transport offers this lab’s speeds, up to 4×', () => {
    renderLab();

    const speed = screen.getByRole('combobox', { name: 'Velocidad de reproducción' });
    expect([...speed.querySelectorAll('option')].map((option) => option.textContent)).toEqual([
      '0,25×',
      '0,5×',
      '1×',
      '2×',
      '4×',
    ]);
  });

  test('choosing another cycle restarts it at t = 0 on its own road', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.selectOptions(cycleSelect(), 'hwfet');

    // «Tramo» now plays the highway's largest braking, 729–765 s.
    expect(timelineText()).toBe('t = 729,00 s');
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
    const bars = screen.getByRole('list', { name: STRETCH_BARS });

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
    expect(battery()).toHaveTextContent(/0,0\skJ/);

    seekToEnd();
    expect(screen.getByRole('list', { name: CYCLE_BARS })).toBe(bars);
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

    expect(shownView()).toHaveAccessibleName('Tramo');
    expect(timelineText()).toBe('t = 376,00 s');
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
