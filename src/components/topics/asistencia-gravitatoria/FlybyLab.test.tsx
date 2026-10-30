// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetSettingsForTests, setSettings } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import FlybyLab, { FLYBY_LAPSE } from './FlybyLab';

const FOOTNOTE = 'Modelo plano de cónicas empalmadas.';
/** useSimClock under reduced motion: one step of duration/60 every 250 ms. */
const REDUCED_STEP_MS = 250;
const REDUCED_STEPS = 60;

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
  const view = render(<FlybyLab footnote={FOOTNOTE} />);
  mockIdentityCtm();
  return view;
}

const plain = (text: string | null | undefined) => (text ?? '').replace(/\s/g, ' ');

/** The value text of a LabShell readout row, normalised to plain spaces. */
function readout(label: string): string {
  const row = screen.getByText(label, { selector: 'span' }).parentElement as HTMLElement;
  return plain(row.lastElementChild?.textContent);
}

/** A readout as a number (decimal comma, either minus sign). */
/** The readout's leading number: a unit may follow after a space or, for °, attached (R39). */
const readoutValue = (label: string) =>
  Number((/^[−\d,]+/.exec(readout(label))?.[0] ?? 'NaN').replace(',', '.').replace('−', '-'));

const DELTA_V = 'Ganancia de rapidez Δ|v|';
const TURN = 'Ángulo de giro δ';
const ALL_READOUTS = [
  'Excentricidad e',
  TURN,
  'Cambio de velocidad |Δv⃗|',
  '|v| antes, marco del Sol',
  '|v| después, marco del Sol',
  DELTA_V,
];

const rpField = () => screen.getByRole('textbox', { name: /^Máxima aproximación r_p/ });
const rpSlider = () => screen.getByRole('slider', { name: /^Máxima aproximación r_p/ });
const handle = () => screen.getByTestId('periapsis-handle');
const lab = () => screen.getByTestId('flyby-lab');
const timeline = () => screen.getByRole('slider', { name: 'Línea de tiempo' });
const warning = () => screen.getByTestId('flyby-rp-warning');
const comparison = () => screen.getByRole('table', { name: 'Modelo plano frente al dato' });

async function typeRp(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.clear(rpField());
  await user.type(rpField(), `${text}{Enter}`);
}

function centre(testId: string): { x: number; y: number } {
  const circle = screen.getByTestId(testId) as unknown as SVGCircleElement;
  return { x: Number(circle.getAttribute('cx')), y: Number(circle.getAttribute('cy')) };
}

function knobCentre(): { x: number; y: number } {
  const knob = handle().querySelector('[data-knob]') as SVGCircleElement;
  return { x: Number(knob.getAttribute('cx')), y: Number(knob.getAttribute('cy')) };
}

function dragHandleTo(to: { x: number; y: number }): void {
  const start = knobCentre();
  fireEvent.pointerDown(handle(), { pointerId: 1, clientX: start.x, clientY: start.y });
  fireEvent.pointerMove(handle(), { pointerId: 1, clientX: to.x, clientY: to.y });
  fireEvent.pointerUp(handle(), { pointerId: 1, clientX: to.x, clientY: to.y });
}

function stubAnimationFrame() {
  const request = vi.fn(() => 1);
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  return request;
}

describe('FlybyLab', () => {
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

  test('the transport reads each pass in its own unit: days at Jupiter, hours at Neptune', async () => {
    const user = userEvent.setup();
    renderLab();

    // V2 at Jupiter (r_p = 10,09 R_J): the drawn pass lasts about 232 209 s, 2,688 d.
    expect(plain(timeline().getAttribute('aria-valuetext'))).toBe('t = 0,000 d');
    fireEvent.change(timeline(), { target: { value: '1000' } });
    expect(plain(timeline().getAttribute('aria-valuetext'))).toBe('t = 2,688 d');

    // V2 at Neptune (r_p = 1,18 R_N): about 17 340 s, a pass of hours.
    await user.click(screen.getByRole('button', { name: /^V2 · Neptuno/ }));
    expect(plain(timeline().getAttribute('aria-valuetext'))).toMatch(/^t = \d+,\d{3} h$/);
  });

  test('the time-lapse note states the pass in the unit and decimals the transport ends on', async () => {
    const user = userEvent.setup();
    renderLab();
    const note = () => plain(screen.getByTestId('flyby-lapse').textContent);
    const endReading = () => {
      fireEvent.change(timeline(), { target: { value: '1000' } });
      return plain(timeline().getAttribute('aria-valuetext')).replace('t = ', '');
    };

    expect(note()).toContain(`el paso dibujado dura ${endReading()} y`);
    expect(note()).toContain('dura 2,688 d y');

    await user.click(screen.getByRole('button', { name: /^V2 · Neptuno/ }));
    expect(note()).toContain(`el paso dibujado dura ${endReading()} y`);
    expect(note()).toMatch(/dura \d+,\d{3} h y/);
  });

  test('opens on V2 at Jupiter: e = 1,330, δ = 97,5° and Δ|v| ≈ +9,9 km/s', () => {
    renderLab();

    expect(readout('Excentricidad e')).toBe('1,330');
    expect(readout(TURN)).toBe('97,5°');
    expect(readout('|v| antes, marco del Sol')).toBe('9,59 km/s');
    expect(readout('|v| después, marco del Sol')).toBe('19,53 km/s');
    expect(readout(DELTA_V)).toBe('9,94 km/s');
    expect(screen.getByRole('button', { name: /^V2 · Júpiter/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(rpField()).toHaveValue('10,09');
    expect(screen.getByTestId('lab-footnote')).toHaveTextContent(FOOTNOTE);
  });

  test('the preset shows the planar model next to the Horizons value, both labelled', () => {
    renderLab();

    const table = comparison();
    const rows = within(table)
      .getAllByRole('row')
      .map((row) => plain(row.textContent));
    expect(within(table).getByRole('columnheader', { name: 'Modelo plano' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: /^Dato/ })).toBeInTheDocument();
    expect(rows).toContain('Δ|v|+9,94 km/s+9,91 km/s');
    expect(rows).toContain('|v| después19,53 km/s19,50 km/s');
  });

  test('closer is not always more: 2 R_J beats the real r_p, 100 R_J falls short', async () => {
    const user = userEvent.setup();
    renderLab();
    const real = readoutValue(DELTA_V);

    await typeRp(user, '2');
    const close = readoutValue(DELTA_V);
    await typeRp(user, '100');
    const far = readoutValue(DELTA_V);

    expect(close).toBeCloseTo(10.73, 2);
    expect(close).toBeGreaterThan(real);
    expect(far).toBeCloseTo(3.54, 2);
    expect(far).toBeLessThan(real);
  });

  // Research §8 rounds θ_in to 131,5° and gets 6,77 km/s; the data's 131,46° gives 6,76 km/s.
  test('the side decides: passing in front at 20 R_J loses speed (6,76 km/s out of 9,59)', async () => {
    const user = userEvent.setup();
    renderLab();
    await typeRp(user, '20');
    expect(readoutValue(DELTA_V)).toBeGreaterThan(0);

    await user.click(screen.getByRole('radio', { name: 'delante' }));

    expect(readout('|v| después, marco del Sol')).toBe('6,76 km/s');
    expect(readoutValue(DELTA_V)).toBeLessThan(0);
  });

  test('editing r_p or the side leaves the preset: the data no longer applies', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(screen.getByRole('radio', { name: 'delante' }));

    expect(screen.queryByRole('table', { name: 'Modelo plano frente al dato' })).toBeNull();
    expect(screen.getByText(/el dato de la Voyager ya no aplica/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^V2 · Júpiter/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('r_p cannot go below 1 R_J: a typed 0,5 stays at 1 R_J with a warning', async () => {
    const user = userEvent.setup();
    renderLab();
    expect(warning()).toBeEmptyDOMElement();

    await typeRp(user, '0,5');

    expect(rpField()).toHaveValue('1');
    expect(handle()).toHaveAttribute('aria-valuenow', '1');
    expect(warning()).toHaveTextContent(/no puede bajar de 1 R_J/);
    expect(readout(TURN)).toBe('151,1°');
  });

  test('dragging the periapsis handle into the planet clamps at 1 R_J; readouts stay numbers', () => {
    renderLab();

    dragHandleTo(centre('flyby-planet'));

    expect(handle()).toHaveAttribute('aria-valuenow', '1');
    expect(warning()).toHaveTextContent(/no puede bajar de 1 R_J/);
    for (const label of ALL_READOUTS) {
      expect(readout(label)).not.toMatch(/NaN|—/);
    }
  });

  test('dragging the handle outward raises r_p and lowers δ', () => {
    renderLab();
    const planet = centre('flyby-planet');
    const knob = knobCentre();

    dragHandleTo({
      x: planet.x + (knob.x - planet.x) * 1.4,
      y: planet.y + (knob.y - planet.y) * 1.4,
    });

    expect(Number(handle().getAttribute('aria-valuenow'))).toBeGreaterThan(10.09);
    expect(readoutValue(TURN)).toBeLessThan(97.5);
    expect(warning()).toBeEmptyDOMElement();
  });

  test('the periapsis handle is a log slider over 1–100 R_J that takes the keyboard', async () => {
    const user = userEvent.setup();
    renderLab();
    const knob = handle();
    expect(knob).toHaveAttribute('role', 'slider');
    expect(knob).toHaveAttribute('aria-valuemin', '1');
    expect(knob).toHaveAttribute('aria-valuemax', '100');
    expect(plain(knob.getAttribute('aria-valuetext'))).toBe('r_p = 10,09 R_J (721 375 km)');

    knob.focus();
    await user.keyboard('{ArrowRight}');
    expect(Number(knob.getAttribute('aria-valuenow'))).toBeGreaterThan(10.09);
    expect(readoutValue(TURN)).toBeLessThan(97.5);
    await user.keyboard('{Home}');
    expect(knob).toHaveAttribute('aria-valuenow', '1');
    await user.keyboard('{End}');
    expect(knob).toHaveAttribute('aria-valuenow', '100');
    expect(rpField()).toHaveValue('100');
  });

  test('the r_p range is logarithmic: its middle is 10 R_J', () => {
    renderLab();

    fireEvent.change(rpSlider(), { target: { value: '500' } });

    expect(rpField()).toHaveValue('10');
    expect(plain(rpSlider().getAttribute('aria-valuetext'))).toBe('10,00 R_J (714 920 km)');
  });

  test('V2 at Neptune is out of the plane: labelled, with the planar result beside the data', async () => {
    const user = userEvent.setup();
    renderLab();

    await user.click(screen.getByRole('button', { name: /^V2 · Neptuno/ }));

    expect(
      screen.getByText('Giro fuera del plano: el modelo plano no reproduce el dato.'),
    ).toBeInTheDocument();
    const rows = within(comparison())
      .getAllByRole('row')
      .map((row) => plain(row.textContent));
    expect(rows).toContain('Δ|v|−4,91 km/s−2,13 km/s');
    expect(screen.getByRole('radio', { name: 'delante' })).toBeChecked();
    expect(rpField()).toHaveValue('1,18');
  });

  test('the probe follows Kepler: halfway through the pass it is at periapsis', () => {
    renderLab();
    const planet = centre('flyby-planet');
    const distance = (p: { x: number; y: number }) => Math.hypot(p.x - planet.x, p.y - planet.y);
    const start = distance(centre('flyby-probe'));

    fireEvent.change(timeline(), { target: { value: '500' } });

    expect(distance(centre('flyby-probe'))).toBeCloseTo(distance(knobCentre()), 1);
    expect(start).toBeGreaterThan(distance(knobCentre()));
    expect(plain(screen.getByTestId('flyby-clock').textContent)).toMatch(/t − t_p = 0,0 h/);
  });

  test('states the time lapse on the canvas', () => {
    renderLab();

    expect(screen.getByTestId('flyby-lapse')).toHaveTextContent(
      new RegExp(`se ve en ${FLYBY_LAPSE} s`),
    );
  });

  test('with reduced motion playback steps without requestAnimationFrame', async () => {
    vi.useFakeTimers();
    setSettings({ motion: 'reduced' });
    const request = stubAnimationFrame();
    renderLab();

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    act(() => vi.advanceTimersByTime(REDUCED_STEP_MS));

    expect(Number(timeline().getAttribute('value'))).toBeGreaterThan(0);
    expect(request).not.toHaveBeenCalled();
  });

  test('play stops at the end of the pass', () => {
    vi.useFakeTimers();
    setSettings({ motion: 'reduced' });
    stubAnimationFrame();
    renderLab();

    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    act(() => vi.advanceTimersByTime(REDUCED_STEP_MS * (REDUCED_STEPS + 2)));

    expect(lab()).toHaveAttribute('data-playing', 'false');
    expect(timeline()).toHaveValue('1000');
    expect(vi.getTimerCount()).toBe(0);
  });

  test('an edit pauses playback and keeps the probe at the same point of the pass', async () => {
    vi.useFakeTimers();
    setSettings({ motion: 'reduced' });
    stubAnimationFrame();
    renderLab();
    fireEvent.change(timeline(), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(lab()).toHaveAttribute('data-playing', 'true');

    fireEvent.change(rpSlider(), { target: { value: '800' } });

    expect(lab()).toHaveAttribute('data-playing', 'false');
    expect(timeline()).toHaveValue('500');
    expect(plain(screen.getByTestId('flyby-clock').textContent)).toMatch(/t − t_p = 0,0 h/);
  });

  test('the drawer offers playback speeds and hides the planet-frame vectors', async () => {
    const user = userEvent.setup();
    renderLab();
    expect(
      screen.getByTestId('flyby-planet-frame').querySelector('[data-vector="vinf-in"]'),
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    const dialog = screen.getByRole('dialog');
    const speed = within(dialog).getByRole('combobox', { name: 'Velocidad' });
    expect(within(speed).getByRole('option', { name: '4×' })).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('switch', { name: 'Vectores v∞ y v_rel en el marco del planeta' }),
    );
    await user.click(within(dialog).getByRole('switch', { name: 'Círculo |v∞| en el triángulo' }));

    expect(
      screen.getByTestId('flyby-planet-frame').querySelector('[data-vector="vinf-in"]'),
    ).toBeNull();
    expect(screen.getByTestId('flyby-sun-frame').querySelector('[data-circle]')).toBeNull();
  });

  test('Restablecer returns to V2 at Jupiter, passing behind', async () => {
    const user = userEvent.setup();
    renderLab();
    await user.click(screen.getByRole('button', { name: /^V1 · Saturno/ }));
    await user.click(screen.getByRole('radio', { name: 'delante' }));

    await user.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(rpField()).toHaveValue('10,09');
    expect(screen.getByRole('radio', { name: 'detrás' })).toBeChecked();
    expect(readout(TURN)).toBe('97,5°');
  });

  test('both frames are described for screen readers', () => {
    renderLab();

    expect(
      screen.getByRole('img', { name: /^Sobrevuelo en el marco de Júpiter/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /^Triángulo de velocidades en el marco del Sol/ }),
    ).toHaveAccessibleName(/v antes 9,59\skm\/s.*v después 19,53\skm\/s/);
  });
});
