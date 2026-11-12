/**
 * The zoom of Tema 8's scene (D1.3b): the shared pieces (useZoomPan, ZoomControls, the scale bar)
 * on the real page. The dial, the 6U body and the wheel draw through the zoom's view; the bar says
 * how many centimetres of the body it is; the knob keeps its meaning and its size.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const PAGE = './temas/ruedas-reaccion/';
const LAB = '[data-testid="wheel-lab"]';
const SCENE = '[data-testid="wheel-scene"]';
const PHONE = { width: 360, height: 800 };
const NARROW = { width: 320, height: 800 };
const DESKTOP = { width: 1280, height: 800 };
const BLOCKING_IMPACTS = ['serious', 'critical'];
const ZOOM_STEP = Math.SQRT2;
const MAX_ZOOM_CLICKS = 6;
const WHEEL_NOTCH_PX = 100;
const PAN_STEP_PX = 48;
const BUTTON_PX = 40;
const GLYPH_PX = 20;
/** What the factor reads after 0 to 6 presses of «Acercar» (steps of √2). */
const FACTORS = ['×1', '×1,4', '×2', '×2,8', '×4', '×5,7', '×8'] as const;
const PX_SLACK = 1.5;
const DRAG_STEPS = 6;
const BAR_MIN_PX = 64;
const BAR_MAX_PX = 160;
/** The 6U's long side seen along the slew axis (m): 366,0 mm. */
const BODY_LONG_CM = 36.6;

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
const scene = (lab: Locator) => lab.locator(SCENE);
const factor = (lab: Locator) => lab.locator('[data-zoom-factor]');
const dialRing = (lab: Locator) => scene(lab).locator('[data-dial]');
const knob = (lab: Locator) => lab.getByTestId('target-handle');
const zoomButton = (lab: Locator, name: string) =>
  lab.getByRole('group', { name: 'Zoom' }).getByRole('button', { name, exact: true });

const dialRadius = async (lab: Locator) => Number(await dialRing(lab).getAttribute('r'));
const dialCentre = async (lab: Locator) => ({
  x: Number(await dialRing(lab).getAttribute('cx')),
  y: Number(await dialRing(lab).getAttribute('cy')),
});

/** Waits for a glide to end with the dial drawn `radius` px wide. */
async function settleRadius(lab: Locator, radius: number): Promise<void> {
  await expect
    .poll(async () => Math.abs((await dialRadius(lab)) - radius), { message: `r = ${radius}` })
    .toBeLessThan(1e-6);
}

/** The live body's long side in px (its first two corners; the scene's user unit is a CSS px). */
async function bodyLongPx(lab: Locator): Promise<number> {
  const points =
    (await scene(lab).locator('[data-body="live"] polygon').first().getAttribute('points')) ?? '';
  const [front, back] = points
    .trim()
    .split(/\s+/u)
    .map((pair) => pair.split(',').map(Number));
  return Math.hypot(front[0] - back[0], front[1] - back[1]);
}

/** The scale bar in the strip: its line's length in px, its cm and its text. */
async function scaleBar(lab: Locator) {
  const bar = lab.locator('[data-scale-bar]');
  const px = (await bar.locator('[data-scale-bar-line]').boundingBox())!.width;
  const text = ((await bar.textContent()) ?? '').replace(/\s+/gu, ' ').trim();
  return { px, value: Number(text.replace(/ cm$/u, '').replace(',', '.')), text };
}

type Box = { x: number; y: number; width: number; height: number };
const isApart = (a: Box, b: Box) =>
  a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
const isInside = (inner: Box, outer: Box) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

/** The corner texts the knob overlaps: the note, the time badge and the target's text. */
async function knobHudOverlaps(lab: Locator): Promise<string[]> {
  const knobBox = (await knob(lab).locator('[data-knob]').boundingBox())!;
  const hud: [string, Locator][] = [
    ['nota', scene(lab).getByText('6U a escala; rueda no a escala')],
    ['insignia', scene(lab).locator('g[data-time-scale-badge]')],
    ['texto del objetivo', scene(lab).getByTestId('wheel-dial').locator('text').last()],
  ];
  const overlaps: string[] = [];
  for (const [name, locator] of hud) {
    if (!isApart(knobBox, (await locator.boundingBox())!)) overlaps.push(name);
  }
  return overlaps;
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

async function zoomTo(lab: Locator, clicks: number): Promise<void> {
  for (let click = 0; click < clicks; click += 1) await zoomButton(lab, 'Acercar').click();
  await expect(factor(lab)).toHaveText(FACTORS[clicks]);
}

test.describe('la escena de la rueda, con zoom', () => {
  test.use({ viewport: DESKTOP });

  test('lleva los botones compartidos con «Ajustar» y sin «1:1», y su nombre', async ({ page }) => {
    const lab = await openLab(page);

    await expect(lab.locator('[data-zoom-viewport]')).toHaveCount(1);
    await expect(lab.getByRole('group', { name: 'Zoom' })).toHaveCount(1);
    await expect(canvas(lab)).toHaveAttribute('aria-label', 'Escena de la nave y la rueda');
    await expect(canvas(lab).locator(SCENE)).toHaveCount(1);
    await expect(zoomButton(lab, 'Tamaño real 1:1')).toHaveCount(0);
    await expect(factor(lab)).toHaveText('×1');
    for (const name of ['Alejar', 'Ajustar']) {
      await expect(zoomButton(lab, name)).toHaveAttribute('aria-disabled', 'true');
    }
    await expect(zoomButton(lab, 'Acercar')).not.toHaveAttribute('aria-disabled');
  });

  test('los botones acercan hasta ×8 y «Ajustar» vuelve al encuadre del laboratorio', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const start = await dialRadius(lab);
    const startCentre = await dialCentre(lab);

    await zoomButton(lab, 'Acercar').click();
    await expect(factor(lab)).toHaveText('×1,4');
    await settleRadius(lab, start * ZOOM_STEP);
    await zoomTo(lab, MAX_ZOOM_CLICKS);
    await expect(zoomButton(lab, 'Acercar')).toHaveAttribute('aria-disabled', 'true');
    await settleRadius(lab, start * 8);

    await zoomButton(lab, 'Ajustar').click();
    await expect(factor(lab)).toHaveText('×1');
    await settleRadius(lab, start);
    await expect.poll(async () => (await dialCentre(lab)).x - startCentre.x).toBeCloseTo(0, 6);
    await expect(zoomButton(lab, 'Ajustar')).toHaveAttribute('aria-disabled', 'true');
  });

  test('la barra de escala mide centímetros de la nave: su largo sobre el de la nave es sus cm sobre 36,6, a cada zoom', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const start = await dialRadius(lab);
    const readings: string[] = [];

    for (const step of [0, 2, 4, 6]) {
      if (step > 0) {
        await zoomButton(lab, 'Acercar').click();
        await zoomButton(lab, 'Acercar').click();
      }
      await settleRadius(lab, start * ZOOM_STEP ** step);
      const bar = await scaleBar(lab);

      expect(bar.px, bar.text).toBeGreaterThanOrEqual(BAR_MIN_PX);
      expect(bar.px).toBeLessThanOrEqual(BAR_MAX_PX);
      expect(bar.px / (await bodyLongPx(lab)), bar.text).toBeCloseTo(bar.value / BODY_LONG_CM, 3);
      readings.push(bar.text);
    }

    expect(readings).toEqual(['20 cm', '10 cm', '5 cm', '2 cm']);
    await expect(lab.locator('[data-scale-bar-words]')).toHaveText('Barra de escala: 2 cm');
  });

  test('con el teclado: el lienzo entra en el orden de foco, + − 0 y las flechas lo manejan, y luego van la perilla y los botones', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const start = await dialRadius(lab);
    await tabToCanvas(page, lab);
    await expect(canvas(lab)).toHaveAttribute('aria-roledescription', 'lienzo con zoom');
    const described = await canvas(lab).getAttribute('aria-describedby');
    await expect(page.locator(`[id="${described}"]`)).toContainText('las flechas lo desplazan');

    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await expect(factor(lab)).toHaveText('×2');
    await settleRadius(lab, start * 2);
    const before = await dialCentre(lab);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await expect
      .poll(async () => (await dialCentre(lab)).x - before.x, { message: 'ArrowLeft' })
      .toBeCloseTo(PAN_STEP_PX, 3);
    await expect
      .poll(async () => (await dialCentre(lab)).y - before.y, { message: 'ArrowUp' })
      .toBeCloseTo(PAN_STEP_PX, 3);
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
    const at = await dialCentre(lab);
    const point = { x: box.x + at.x, y: box.y + at.y };

    await page.mouse.move(point.x, point.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -WHEEL_NOTCH_PX);
    await page.keyboard.up('Control');

    await expect(factor(lab)).toHaveText('×1,4');
    // The dial's centre was under the pointer, and stays there.
    await expect
      .poll(async () => Math.abs((await dialCentre(lab)).x - at.x))
      .toBeLessThan(PX_SLACK);
    expect(Math.abs((await dialCentre(lab)).y - at.y)).toBeLessThan(PX_SLACK);
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
  });

  test('arrastrar el fondo desplaza el dibujo; arrastrar la perilla mueve el ángulo objetivo, no el dibujo', async ({
    page,
  }) => {
    // Without the glide the reveal is one step, so the view read after it is the final one.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const lab = await openLab(page);
    const start = await dialRadius(lab);
    await zoomTo(lab, 2);
    await settleRadius(lab, start * 2);
    const box = (await canvas(lab).boundingBox())!;

    // The background: a point on the body, away from the knob and the corner texts.
    const background = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const before = await dialCentre(lab);
    await dragMouse(page, background, { x: -30, y: 20 });
    await page.mouse.up();
    await expect
      .poll(async () => Math.abs((await dialCentre(lab)).x - (before.x - 30)))
      .toBeLessThan(PX_SLACK);
    const panned = await dialCentre(lab);
    expect(Math.abs(panned.y - (before.y + 20))).toBeLessThan(PX_SLACK);

    // The knob: a keyboard focus brings it into view; its drag changes the angle and not the view.
    await tabToCanvas(page, lab);
    await page.keyboard.press('Tab');
    await expect(knob(lab)).toBeFocused();
    const view = await dialCentre(lab);
    await expect.poll(async () => (await knobBox(lab)).y).toBeGreaterThan(box.y);
    const handle = await knobBox(lab);
    const grip = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
    const value = Number(await knob(lab).getAttribute('aria-valuenow'));
    await dragMouse(page, grip, { x: 18, y: 0 });
    await expect
      .poll(async () => Number(await knob(lab).getAttribute('aria-valuenow')))
      .not.toBe(value);
    expect(await dialCentre(lab)).toEqual(view);
    await page.mouse.up();
    await expect(factor(lab)).toHaveText('×2');
  });

  test('a ×8, el Tab trae la perilla a la vista, sus teclas no la sacan de ella y no queda bajo los textos', async ({
    page,
  }) => {
    const lab = await openLab(page);
    await zoomTo(lab, MAX_ZOOM_CLICKS);
    const isKnobInView = async () =>
      isInside(await knobBox(lab), (await canvas(lab).boundingBox())!);
    await expect.poll(isKnobInView).toBe(false);

    await tabToCanvas(page, lab);
    await page.keyboard.press('Tab');
    await expect(knob(lab)).toBeFocused();

    await expect.poll(isKnobInView).toBe(true);
    await expect.poll(() => knobHudOverlaps(lab)).toEqual([]);
    for (const key of ['ArrowLeft', 'ArrowLeft', 'Shift+ArrowLeft', 'End', 'Home', 'PageUp']) {
      await page.keyboard.press(key);
      await expect.poll(isKnobInView, { message: key }).toBe(true);
      await expect.poll(() => knobHudOverlaps(lab), { message: key }).toEqual([]);
    }
    await expect(factor(lab)).toHaveText('×8');
  });

  test('«Restablecer» vuelve a encuadrar la escena; cambiar de modo conserva el zoom', async ({
    page,
  }) => {
    const lab = await openLab(page);
    const start = await dialRadius(lab);
    await zoomTo(lab, 2);

    await lab.getByRole('radio', { name: 'Perturbación y descarga' }).check({ force: true });
    await expect(factor(lab)).toHaveText('×2');
    await expect(scene(lab).locator('[data-rate="τ_ext"]')).toBeAttached();

    await lab.getByRole('button', { name: 'Restablecer' }).click();
    await expect(factor(lab)).toHaveText('×1');
    await settleRadius(lab, start);
  });

  test('en la descarga, la ley y el factor de tiempo se quedan en las esquinas aunque el dibujo se acerque', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const lab = await openLab(page);
    await lab.getByRole('radio', { name: 'Perturbación y descarga' }).check({ force: true });
    await lab.getByRole('button', { name: 'Ir a la descarga' }).click();
    const svg = (await scene(lab).boundingBox())!;
    const law = scene(lab).locator('[data-dump-law]');
    await expect(law).toBeVisible();
    const before = (await law.boundingBox())!;

    await zoomTo(lab, 4);

    const after = (await law.boundingBox())!;
    expect(Math.abs(after.x - before.x)).toBeLessThan(PX_SLACK);
    expect(Math.abs(after.y - before.y)).toBeLessThan(PX_SLACK);
    expect(isInside(after, svg)).toBe(true);
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
    await expect(lab.locator('[data-scale-bar]')).toContainText('20 cm');
    await plain.close();
  });
});

const knobBox = async (lab: Locator): Promise<Box> =>
  (await knob(lab).locator('[data-knob]').boundingBox())!;

/** The glide's distinct radii: one with movimiento reducido (a jump), many without. */
async function radiiDuringZoom(page: Page, lab: Locator): Promise<number[]> {
  const start = await dialRadius(lab);
  await dialRing(lab).evaluate((circle) => {
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

    test('botones de 40 px con glifo de 20, bajo el dibujo: la barra y los botones no se tocan ni tapan el dibujo', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const lab = await openLab(page);
      const svg = (await scene(lab).boundingBox())!;

      for (const name of ['Acercar', 'Alejar', 'Ajustar']) {
        const box = (await zoomButton(lab, name).boundingBox())!;
        expect(box.width).toBe(BUTTON_PX);
        expect(box.height).toBe(BUTTON_PX);
      }
      for (const glyph of await lab.locator('[data-zoom-controls] svg').all()) {
        expect((await glyph.boundingBox())!.width).toBe(GLYPH_PX);
      }
      for (let click = 0; click <= MAX_ZOOM_CLICKS; click += 1) {
        if (click > 0) await zoomButton(lab, 'Acercar').click();
        await expect(factor(lab)).toHaveText(FACTORS[click]);
        const controls = (await lab.locator('[data-zoom-controls]').boundingBox())!;
        const bar = (await lab.locator('[data-scale-bar]').boundingBox())!;
        const strip = (await lab.locator('[data-wheel-zoom-strip]').boundingBox())!;
        expect(isApart(controls, svg), `botones y dibujo, paso ${click}`).toBe(true);
        expect(isApart(bar, svg), `barra y dibujo, paso ${click}`).toBe(true);
        expect(isApart(bar, controls), `barra y botones, paso ${click}`).toBe(true);
        expect(
          isInside(bar, strip) && isInside(controls, strip),
          `en la franja, paso ${click}`,
        ).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        size.width,
      );
    });

    test('el factor de tiempo, la nota y el texto del objetivo no se tocan a ningún zoom, con la perilla a la vista', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const lab = await openLab(page);
      await knob(lab).focus();

      for (let click = 0; click <= MAX_ZOOM_CLICKS; click += 1) {
        if (click > 0) await zoomButton(lab, 'Acercar').click();
        await expect(factor(lab)).toHaveText(FACTORS[click]);
        await knob(lab).focus();
        await expect.poll(() => knobHudOverlaps(lab), { message: `paso ${click}` }).toEqual([]);
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
