/**
 * The zoom of Tema 9's planet frame (D1.2b): the shared pieces (useZoomPan, ZoomOverlay, the scale
 * bar) on the real page. The frame draws through the zoom's view: the planet and the track grow, the
 * bar says what a length is, and the knob keeps its meaning. The Sun frame does not zoom.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const PAGE = './temas/asistencia-gravitatoria/';
const LAB = '[data-testid="flyby-lab"]';
const FRAME = '[data-testid="flyby-planet-frame"]';
const PHONE = { width: 360, height: 800 };
const NARROW = { width: 320, height: 800 };
const DESKTOP = { width: 1280, height: 800 };
const BLOCKING_IMPACTS = ['serious', 'critical'];
const ZOOM_STEP = Math.SQRT2;
const MAX_ZOOM_CLICKS = 6;
const WHEEL_NOTCH_PX = 100;
const PAN_STEP_PX = 48;
/** Enough arrow presses to push a ×8 drawing past the canvas' edge. */
const PAN_PRESSES = 12;
const BUTTON_PX = 40;
const GLYPH_PX = 20;
/** What the factor reads after 0 to 6 presses of «Acercar» (steps of √2). */
const FACTORS = ['×1', '×1,4', '×2', '×2,8', '×4', '×5,7', '×8'] as const;
const PX_SLACK = 1.5;
/** The key of V_p at the top-left corner, and the band of texts at the top (PlanetFrame). */
const V_P_KEY_WIDTH_PX = 70;
const TEXT_BAND_PX = 30;
const DRAG_STEPS = 6;
const BAR_MIN_PX = 64;
const BAR_MAX_PX = 160;
/** The radii of Neptune (R_N, km): its 1,18 R_N pass keeps the planet 15 px, true to scale. */
const NEPTUNE_RADIUS_KM = 24764;
/** How far from the canvas' left edge the knob is left for the press (px). */
const EDGE_GAP_PX = 8;
/** Where a key's reveal leaves the knob's centre: its ring and the texts' band (41) plus 16. */
const REVEALED_KNOB_PX = 57;
/**
 * A press that does not move still reads r_p from the pointer, a hair off the knob's centre: less
 * than this share of the value, under half an arrow key's step (1 % of the log bar, about 4,7 %).
 */
const PRESS_RP_SHARE = 0.02;

async function openLab(page: Page, theme: 'light' | 'dark' = 'light'): Promise<Locator> {
  await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
  await page.goto(PAGE);
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
  const lab = page.locator(LAB);
  // Away from the sticky header, which would take the pointer of any gesture on the top.
  await canvas(lab).evaluate((element) => element.scrollIntoView({ block: 'center' }));
  return lab;
}

const canvas = (lab: Locator) => lab.locator('[data-zoom-viewport]');
const frame = (lab: Locator) => lab.locator(FRAME);
const factor = (lab: Locator) => lab.locator('[data-zoom-factor]');
const planet = (lab: Locator) => lab.getByTestId('flyby-planet');
const knob = (lab: Locator) => lab.getByTestId('periapsis-handle');
const zoomButton = (lab: Locator, name: string) =>
  lab.getByRole('group', { name: 'Zoom' }).getByRole('button', { name, exact: true });

const planetRadius = async (lab: Locator) => Number(await planet(lab).getAttribute('r'));
const planetCentre = async (lab: Locator) => ({
  x: Number(await planet(lab).getAttribute('cx')),
  y: Number(await planet(lab).getAttribute('cy')),
});

/** Waits for a glide to end with the planet drawn `radius` px wide. */
async function settleRadius(lab: Locator, radius: number): Promise<void> {
  await expect
    .poll(async () => Math.abs((await planetRadius(lab)) - radius), { message: `r = ${radius}` })
    .toBeLessThan(1e-6);
}

/** The scale bar as drawn: its length in px and its text and unit. */
async function scaleBar(lab: Locator) {
  const bar = frame(lab).locator('g[data-scale-bar]');
  const path = (await bar.locator('path').getAttribute('d')) ?? '';
  const [, left, right] = /^M([\d.-]+) [\d.-]+V[\d.-]+H([\d.-]+)V/u.exec(path) ?? [];
  const text = ((await bar.locator('text').textContent()) ?? '').replace(/\s+/gu, ' ').trim();
  const [, digits, unit] = /^([\d ,]+) (R\S*|km)$/u.exec(text) ?? [];
  return {
    px: Number(right) - Number(left),
    value: Number(digits.replace(/ /gu, '').replace(',', '.')),
    unit,
    text,
  };
}

type Box = { x: number; y: number; width: number; height: number };
const isApart = (a: Box, b: Box) =>
  a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
const isInside = (inner: Box, outer: Box) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

/** The texts of the corners the knob overlaps: the key, the time badge, the r_p value, the bar. */
async function knobHudOverlaps(lab: Locator): Promise<string[]> {
  const svg = (await frame(lab).boundingBox())!;
  const knobBox = (await knob(lab).locator('[data-knob]').boundingBox())!;
  const hud: [string, Box][] = [
    ['clave de V_p', { x: svg.x, y: svg.y, width: V_P_KEY_WIDTH_PX, height: TEXT_BAND_PX }],
    ['insignia', (await frame(lab).locator('g[data-time-scale-badge]').boundingBox())!],
    ['valor de r_p', (await lab.getByTestId('flyby-rp-value').boundingBox())!],
    ['barra de escala', (await frame(lab).locator('g[data-scale-bar]').boundingBox())!],
  ];
  return hud.filter(([, box]) => !isApart(knobBox, box)).map(([name]) => name);
}

async function chooseEncounter(lab: Locator, label: string): Promise<void> {
  const arrival = lab.getByTestId('flyby-arrival');
  const presets = lab.getByRole('combobox', { name: 'Valores de referencia' });
  const before = await arrival.textContent();
  const isCurrent = (await presets.locator('option:checked').textContent()) === label;
  await presets.selectOption({ label });
  // The arrival line is what changes with a new encounter; the one already chosen changes nothing.
  if (!isCurrent) await expect(arrival).not.toHaveText(before ?? '');
  await expect(planet(lab)).toBeVisible();
}

async function dragMouse(page: Page, from: { x: number; y: number }, by: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps: DRAG_STEPS });
}

/** Focuses the canvas from the keyboard (Tab from the gear), so its focus shows. */
async function tabToCanvas(page: Page, lab: Locator): Promise<void> {
  await lab.getByRole('button', { name: 'Ajustes del simulador' }).focus();
  await page.keyboard.press('Tab');
  await expect(canvas(lab)).toBeFocused();
}

test.describe('el marco del planeta, con zoom', () => {
  test.use({ viewport: DESKTOP });

  test('lleva los botones compartidos con «Ajustar» y sin «1:1»; el marco del Sol no tiene zoom', async ({
    page,
  }) => {
    const lab = await openLab(page);

    await expect(lab.locator('[data-zoom-viewport]')).toHaveCount(1);
    await expect(lab.getByRole('group', { name: 'Zoom' })).toHaveCount(1);
    await expect(canvas(lab)).toHaveAttribute('aria-label', 'Marco de Júpiter');
    await expect(canvas(lab).locator(FRAME)).toHaveCount(1);
    await expect(lab.locator('[data-testid="flyby-sun-frame"]')).toBeVisible();
    await expect(canvas(lab).locator('[data-testid="flyby-sun-frame"]')).toHaveCount(0);
    await expect(zoomButton(lab, 'Tamaño real 1:1')).toHaveCount(0);
    await expect(factor(lab)).toHaveText('×1');
    for (const name of ['Alejar', 'Ajustar']) {
      await expect(zoomButton(lab, name)).toHaveAttribute('aria-disabled', 'true');
    }
    await expect(zoomButton(lab, 'Acercar')).not.toHaveAttribute('aria-disabled');
  });

  test('los botones acercan hasta ×8 y «Ajustar» vuelve al encuadre del encuentro', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const start = await planetRadius(lab);
    const startCentre = await planetCentre(lab);

    await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×1,4');
    await settleRadius(lab, start * ZOOM_STEP);
    for (let step = 1; step < MAX_ZOOM_CLICKS; step += 1) {
      await zoomButton(lab, 'Acercar').click();
    }
    await expect(factor(lab)).toHaveText('×8');
    await expect(zoomButton(lab, 'Acercar')).toHaveAttribute('aria-disabled', 'true');
    await settleRadius(lab, start * 8);

    await zoomButton(lab, 'Ajustar').click();
    await expect(factor(lab)).toHaveText('×1');
    await settleRadius(lab, start);
    await expect.poll(async () => (await planetCentre(lab)).x - startCentre.x).toBeCloseTo(0, 6);
    await expect(zoomButton(lab, 'Ajustar')).toHaveAttribute('aria-disabled', 'true');
  });

  test('la barra de escala es la longitud verdadera de su valor tras un zoom conocido', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await chooseEncounter(lab, 'V2 · Neptuno');
    const radius = await planetRadius(lab);
    const readings: string[] = [];

    for (const clicks of [0, 2, 2, 2]) {
      for (let click = 0; click < clicks; click += 1) await zoomButton(lab, 'Acercar').click();
      const scale = ZOOM_STEP ** (readings.length * 2);
      await settleRadius(lab, radius * scale);
      const bar = await scaleBar(lab);
      const onScreenRadius = await planetRadius(lab);

      // The planet is one R_N on screen; the bar is `value` of them, or the km of that many.
      const radii = bar.unit === 'km' ? bar.value / NEPTUNE_RADIUS_KM : bar.value;
      expect(bar.px / onScreenRadius, bar.text).toBeCloseTo(radii, 3);
      expect(bar.px).toBeGreaterThanOrEqual(BAR_MIN_PX);
      expect(bar.px).toBeLessThanOrEqual(BAR_MAX_PX);
      readings.push(bar.text);
    }

    expect(new Set(readings).size).toBeGreaterThan(1);
    await expect(lab.locator('[data-scale-bar-words]')).toHaveText(
      /^Barra de escala: \d+\sR sub N$/u,
    );
  });

  test('con el teclado: el lienzo entra en el orden de foco, + − 0 y las flechas lo manejan, y luego van el punto y los botones', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const start = await planetRadius(lab);
    await tabToCanvas(page, lab);
    await expect(canvas(lab)).toHaveAttribute('aria-roledescription', 'lienzo con zoom');
    const described = await canvas(lab).getAttribute('aria-describedby');
    await expect(page.locator(`[id="${described}"]`)).toContainText('las flechas lo desplazan');

    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await expect(factor(lab)).toHaveText('×2');
    await settleRadius(lab, start * 2);
    const before = await planetCentre(lab);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    const after = await planetCentre(lab);
    expect(after.x - before.x).toBeCloseTo(PAN_STEP_PX, 3);
    expect(after.y - before.y).toBeCloseTo(PAN_STEP_PX, 3);
    await page.keyboard.press('-');
    await expect(factor(lab)).toHaveText('×1,4');
    await page.keyboard.press('0');
    await expect(factor(lab)).toHaveText('×1');
    await settleRadius(lab, start);

    await page.keyboard.press('Tab');
    await expect(knob(lab)).toBeFocused();
    const value = Number(await knob(lab).getAttribute('aria-valuenow'));
    await page.keyboard.press('ArrowRight');
    expect(Number(await knob(lab).getAttribute('aria-valuenow'))).toBeGreaterThan(value);
    await expect(factor(lab)).toHaveText('×1');
    await page.keyboard.press('Tab');
    await expect(zoomButton(lab, 'Acercar')).toBeFocused();
  });

  test('la rueda con Ctrl acerca bajo el puntero y no deja que la página haga zoom', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const box = (await canvas(lab).boundingBox())!;
    const at = await planetCentre(lab);
    const point = { x: box.x + at.x, y: box.y + at.y };

    await page.mouse.move(point.x, point.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -WHEEL_NOTCH_PX);
    await page.keyboard.up('Control');

    await expect(factor(lab)).toHaveText('×1,4');
    // The planet was under the pointer, and stays there.
    await expect
      .poll(async () => Math.abs((await planetCentre(lab)).x - at.x))
      .toBeLessThan(PX_SLACK);
    expect(Math.abs((await planetCentre(lab)).y - at.y)).toBeLessThan(PX_SLACK);
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
  });

  test('arrastrar el fondo desplaza el dibujo; arrastrar el punto de máxima aproximación mueve r_p, no el dibujo', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const start = await planetRadius(lab);
    for (let click = 0; click < 2; click += 1) await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×2');
    await settleRadius(lab, start * 2);
    const box = (await canvas(lab).boundingBox())!;

    // The background: a point away from the knob, the buttons and the corner texts.
    const background = { x: box.x + 40, y: box.y + box.height * 0.45 };
    const before = await planetCentre(lab);
    await dragMouse(page, background, { x: -30, y: 20 });
    await page.mouse.up();
    const panned = await planetCentre(lab);
    expect(Math.abs(panned.x - (before.x - 30))).toBeLessThan(PX_SLACK);
    expect(Math.abs(panned.y - (before.y + 20))).toBeLessThan(PX_SLACK);

    // The knob: its drag changes r_p and leaves the view (the planet is held while it moves).
    const handle = (await knob(lab).locator('[data-knob]').boundingBox())!;
    const grip = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
    const value = Number(await knob(lab).getAttribute('aria-valuenow'));
    await dragMouse(page, grip, { x: 18, y: 0 });
    expect(await planetCentre(lab)).toEqual(panned);
    expect(Number(await knob(lab).getAttribute('aria-valuenow'))).not.toBe(value);
    await page.mouse.up();
    await expect(factor(lab)).toHaveText('×2');
  });

  test('pulsar el punto de máxima aproximación con el ratón a 8 px del borde, a ×4 y tras usar el teclado, no desplaza la vista ni mueve r_p', async ({
    page,
  }) => {
    // Sin deslizamiento, la vista leída tras la pulsación es la final.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const lab = await openLab(page);
    for (let click = 0; click < 4; click += 1) await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×4');
    await tabToCanvas(page, lab);
    await page.keyboard.press('Tab');
    await expect(knob(lab)).toBeFocused();
    // El teclado ya se usó: el navegador da por visible cualquier foco que venga después.
    await page.keyboard.press('ArrowLeft');
    await canvas(lab).evaluate((element) => element.scrollIntoView({ block: 'center' }));
    const area = (await canvas(lab).boundingBox())!;
    const knobCentre = async () => {
      const box = (await knob(lab).locator('[data-knob]').boundingBox())!;
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    await expect
      .poll(async () => (await knobCentre()).x - area.x)
      .toBeGreaterThanOrEqual(REVEALED_KNOB_PX - PX_SLACK);

    // Arrastra el fondo (lejos de la perilla, los botones y los textos) hasta dejarla a 8 px del borde.
    const grip0 = await knobCentre();
    const grabAt = {
      x: area.x + area.width - 60,
      y: grip0.y < area.y + area.height / 2 ? grip0.y + 60 : grip0.y - 60,
    };
    await dragMouse(page, grabAt, { x: area.x + EDGE_GAP_PX - grip0.x, y: 0 });
    await page.mouse.up();
    // El foco pasa al lienzo con el teclado: un foco visible. La pulsación sobre la perilla la
    // enfocará por script desde ahí, y Chromium da ese foco por visible aunque venga del ratón.
    await tabToCanvas(page, lab);
    await canvas(lab).evaluate((element) => element.scrollIntoView({ block: 'center' }));
    const shown = (await canvas(lab).boundingBox())!;
    await expect.poll(async () => (await knobCentre()).x - shown.x).toBeCloseTo(EDGE_GAP_PX, 0);

    const view = await planetCentre(lab);
    const value = Number(await knob(lab).getAttribute('aria-valuenow'));
    const grip = await knobCentre();
    await page.mouse.move(grip.x, grip.y);
    await page.mouse.down();
    await page.mouse.move(grip.x + 0.5, grip.y);

    await expect(knob(lab)).toBeFocused();
    expect(await planetCentre(lab)).toEqual(view);
    expect(
      Math.abs(Number(await knob(lab).getAttribute('aria-valuenow')) - value),
    ).toBeLessThanOrEqual(value * PRESS_RP_SHARE);
    await page.mouse.up();
    // Released, the frame fits the new r_p again (the hair the press moved it): the planet may
    // shift that much, never the 49 px a reveal to the knob's band would pan the view.
    const after = await planetCentre(lab);
    expect(Math.hypot(after.x - view.x, after.y - view.y)).toBeLessThan(EDGE_GAP_PX);
  });

  test('a ×8, el Tab trae el punto de máxima aproximación a la vista y sus flechas no lo sacan de ella', async ({
    page,
  }) => {
    const lab = await openLab(page);
    for (let click = 0; click < MAX_ZOOM_CLICKS; click += 1) {
      await zoomButton(lab, 'Acercar').click();
    }
    await expect(factor(lab)).toHaveText('×8');
    const isKnobInView = async () =>
      isInside((await knob(lab).boundingBox())!, (await canvas(lab).boundingBox())!);
    await expect.poll(isKnobInView).toBe(false);

    await tabToCanvas(page, lab);
    await page.keyboard.press('Tab');
    await expect(knob(lab)).toBeFocused();

    await expect.poll(isKnobInView).toBe(true);
    for (let press = 0; press < 5; press += 1) await page.keyboard.press('ArrowLeft');
    await expect.poll(isKnobInView).toBe(true);
    await page.keyboard.press('End');
    await expect.poll(isKnobInView).toBe(true);
    await expect(factor(lab)).toHaveText('×8');

    // Revealed, the knob is not under the texts of the corners either (they stay where they are).
    await expect.poll(() => knobHudOverlaps(lab)).toEqual([]);
  });

  test('el punto de máxima aproximación revelado desde cualquier lado no queda bajo los textos de las esquinas, con todos los encuentros y lados', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const options = await lab
      .getByRole('combobox', { name: 'Valores de referencia' })
      .locator('option')
      .allTextContents();
    const isKnobInView = async () =>
      isInside((await knob(lab).boundingBox())!, (await canvas(lab).boundingBox())!);

    for (const encounter of options) {
      await chooseEncounter(lab, encounter);
      for (const side of ['detrás', 'delante']) {
        await lab.getByRole('radio', { name: side }).check({ force: true });
        await zoomButton(lab, 'Ajustar').click({ force: true });
        for (let click = 0; click < MAX_ZOOM_CLICKS; click += 1) {
          await zoomButton(lab, 'Acercar').click();
        }
        await expect(factor(lab)).toHaveText('×8');
        // The drawing is pushed down (ArrowUp), so the knob is left near or below the bottom edge.
        await tabToCanvas(page, lab);
        for (let press = 0; press < PAN_PRESSES; press += 1) await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Tab');
        await expect(knob(lab)).toBeFocused();

        await expect.poll(isKnobInView, { message: `${encounter}, ${side}` }).toBe(true);
        await expect
          .poll(() => knobHudOverlaps(lab), { message: `${encounter}, ${side}` })
          .toEqual([]);
        await zoomButton(lab, 'Ajustar').click();
        await expect(factor(lab)).toHaveText('×1');
      }
    }
  });

  test('enfocar un botón de zoom, o pulsarlo, no desplaza el dibujo', async ({ page }) => {
    const lab = await openLab(page);
    for (let click = 0; click < 4; click += 1) await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×4');
    await tabToCanvas(page, lab);
    for (let press = 0; press < 3; press += 1) await page.keyboard.press('ArrowLeft');
    const before = await planetCentre(lab);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(zoomButton(lab, 'Acercar')).toBeFocused();
    expect(await planetCentre(lab)).toEqual(before);

    // A press on «Alejar», not yet released: the focus it takes must not pan the drawing either.
    const box = (await zoomButton(lab, 'Alejar').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(zoomButton(lab, 'Alejar')).toBeFocused();
    expect(await planetCentre(lab)).toEqual(before);
    await page.mouse.up();
  });

  test('«planeta agrandado» se va cuando el zoom lleva el planeta a su tamaño verdadero', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await knob(lab).focus();
    await page.keyboard.press('End');
    const note = frame(lab).getByText('planeta agrandado');
    await expect(note).toBeVisible();

    for (let click = 0; click < MAX_ZOOM_CLICKS; click += 1) {
      await zoomButton(lab, 'Acercar').click();
    }

    await expect(note).toHaveCount(0);
    await expect.poll(() => planetRadius(lab)).toBeGreaterThan(4);
  });

  test('elegir otro encuentro o «Restablecer» vuelve a encuadrar el dibujo', async ({ page }) => {
    const lab = await openLab(page);
    await zoomButton(lab, 'Acercar').click();
    await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×2');

    await chooseEncounter(lab, 'V2 · Saturno');
    await expect(factor(lab)).toHaveText('×1');
    await expect(canvas(lab)).toHaveAttribute('aria-label', 'Marco de Saturno');

    await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×1,4');
    await lab.getByRole('button', { name: 'Restablecer' }).click();
    await expect(factor(lab)).toHaveText('×1');
  });

  test('el servidor pinta el encuadre inicial, con los botones y la barra de escala', async ({
    browser,
  }) => {
    const plain = await browser.newContext({ javaScriptEnabled: false, viewport: DESKTOP });
    const server = await plain.newPage();
    await server.goto(PAGE);
    const lab = server.locator(LAB);

    await expect(factor(lab)).toHaveText('×1');
    await expect(lab.locator('[data-zoom-controls] button')).toHaveCount(3);
    await expect(lab.locator('g[data-scale-bar]')).toHaveCount(1);
    await plain.close();
  });
});

/** The glide's distinct radii: one with movimiento reducido (a jump), many without. */
async function radiiDuringZoom(page: Page, lab: Locator): Promise<number[]> {
  const start = await planetRadius(lab);
  await planet(lab).evaluate((circle) => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    new MutationObserver(() => seen.push(circle.getAttribute('r') ?? '')).observe(circle, {
      attributes: true,
      attributeFilter: ['r'],
    });
  });
  await zoomButton(lab, 'Acercar').click();
  await settleRadius(lab, start * ZOOM_STEP);
  const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
  return [...new Set(seen.map(Number))];
}

test('un botón desliza el zoom; con movimiento reducido salta, sin pasos intermedios', async ({
  browser,
}) => {
  const smooth = await browser.newContext({ viewport: DESKTOP });
  const smoothPage = await smooth.newPage();
  const glided = await radiiDuringZoom(smoothPage, await openLab(smoothPage));
  await smooth.close();

  const reduced = await browser.newContext({ reducedMotion: 'reduce', viewport: DESKTOP });
  const reducedPage = await reduced.newPage();
  const jumped = await radiiDuringZoom(reducedPage, await openLab(reducedPage));
  await reduced.close();

  expect(glided.length).toBeGreaterThan(2);
  expect(jumped).toHaveLength(1);
});

for (const size of [DESKTOP, PHONE, NARROW]) {
  test.describe(`a ${size.width} px`, () => {
    test.use({ viewport: size });

    test('botones de 40 px con glifo de 20, bajo el dibujo: nada se toca, ni la barra, ni la insignia, ni «Ir a la máxima aproximación»', async ({
      page,
    }) => {
      const lab = await openLab(page);
      await knob(lab).focus();
      await page.keyboard.press('End');
      const controls = (await lab.locator('[data-zoom-controls]').boundingBox())!;
      const jump = (await lab
        .getByRole('button', { name: 'Ir a la máxima aproximación' })
        .boundingBox())!;
      const svg = (await frame(lab).boundingBox())!;
      // The buttons are the zoom canvas' sibling, in the frame's own box.
      const area = (await canvas(lab).locator('xpath=..').boundingBox())!;
      const zoomCanvas = (await canvas(lab).boundingBox())!;

      for (const name of ['Acercar', 'Alejar', 'Ajustar']) {
        const box = (await zoomButton(lab, name).boundingBox())!;
        expect(box.width).toBe(BUTTON_PX);
        expect(box.height).toBe(BUTTON_PX);
      }
      for (const glyph of await lab.locator('[data-zoom-controls] svg').all()) {
        expect((await glyph.boundingBox())!.width).toBe(GLYPH_PX);
      }
      expect(isInside(controls, area)).toBe(true);
      // Outside the canvas the zoom measures: it is the drawing's square, and the buttons are not part of it.
      expect(isApart(controls, zoomCanvas)).toBe(true);
      expect(zoomCanvas.height).toBeCloseTo(svg.height, 0);
      // Under the drawing's square, so at the lab's own framing they cover none of it.
      expect(isApart(controls, svg)).toBe(true);
      expect(isApart(controls, jump)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        size.width,
      );
    });

    test('la barra de escala, el factor de tiempo, el valor de r_p y la nota no se tocan a ningún zoom', async ({
      page,
    }) => {
      // Without the glide each step is final when the factor says it.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const lab = await openLab(page);
      await knob(lab).focus();
      await page.keyboard.press('End');

      for (let click = 0; click <= MAX_ZOOM_CLICKS; click += 1) {
        if (click > 0) await zoomButton(lab, 'Acercar').click();
        await expect(factor(lab)).toHaveText(FACTORS[click]);
        const bar = (await frame(lab).locator('g[data-scale-bar]').boundingBox())!;
        const badge = (await frame(lab).locator('g[data-time-scale-badge]').boundingBox())!;
        const rp = (await lab.getByTestId('flyby-rp-value').boundingBox())!;
        const area = (await frame(lab).boundingBox())!;
        expect(isInside(bar, area), `barra, paso ${click}`).toBe(true);
        expect(isApart(bar, badge), `barra e insignia, paso ${click}`).toBe(true);
        expect(isApart(bar, rp), `barra y r_p, paso ${click}`).toBe(true);
        // The note shares the bar's text line, at the right; the ticks are on the line below.
        const notes = frame(lab).getByText('planeta agrandado');
        if ((await notes.count()) > 0) {
          const note = (await notes.boundingBox())!;
          const bar = frame(lab).locator('g[data-scale-bar]');
          const text = (await bar.locator('text').boundingBox())!;
          // The ticks, from the path's own numbers (the browser's box adds the stroke's miter).
          const ticks = await bar.locator('path').evaluate((path) => {
            const [left, top, , right] = (path.getAttribute('d') ?? '')
              .match(/-?[\d.]+/gu)!
              .map(Number);
            return {
              left,
              top,
              right: Number(right),
              width: Number(path.getAttribute('stroke-width')),
            };
          });
          const svg = (await frame(lab).boundingBox())!;
          const ticksBox = {
            x: svg.x + ticks.left - ticks.width / 2,
            y: svg.y + ticks.top - ticks.width / 2,
            width: ticks.right - ticks.left + ticks.width,
            height: 8 + ticks.width,
          };
          for (const [name, box] of [
            ['ticks', ticksBox],
            ['text', text],
          ] as const) {
            expect(
              isApart(box, note),
              `barra (${name}) y nota, paso ${click}: ${JSON.stringify({ box, note })}`,
            ).toBe(true);
          }
          expect(isInside(note, area)).toBe(true);
        }
      }
    });
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`sin violaciones graves de accesibilidad con el zoom (${theme})`, async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const lab = await openLab(page, theme);
    await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×1,4');

    const { violations } = await new AxeBuilder({ page }).include(LAB).analyze();

    expect(
      violations
        .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
        .map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(' ')) })),
    ).toEqual([]);
  });
}
