import { expect, test, type Page } from '@playwright/test';
import { setRange, waitForIsland } from './helpers';

const PAGE = './temas/dron-reparto/';
const LAB = '[data-testid="drone-lab"]';
/** The lab must fill the reading column (spec §6): at least this share of the article width. */
const MIN_WIDTH_SHARE = 0.9;
/** Timeline position (of 1000) to start from, so playback reaches the end within a second. */
const NEAR_END = '995';
const PLAYBACK_WAIT_MS = 1500;
const STILL_AT_END_MS = 500;

/** The value text of a LabShell readout row. */
async function readoutText(page: Page, label: string): Promise<string> {
  const row = page.locator(LAB).locator('div', { has: page.getByText(label, { exact: true }) });
  return ((await row.last().locator('span').last().textContent()) ?? '').trim();
}

/** Centre of a handle's visible knob, in page coordinates. */
async function knobCentre(page: Page, testId: string): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId(testId).locator('[data-knob]').boundingBox();
  expect(box).not.toBeNull();
  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
}

/** Scrolls the map to the middle of the viewport, clear of the sticky topic bar. */
async function centreMap(page: Page): Promise<void> {
  await page
    .getByTestId('route-map')
    .evaluate((map) => map.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

async function mouseDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
  // The island hydrates with client:visible and then loads the route; wait for both.
  await page
    .locator('[data-testid="drone-lab-loading"], ' + LAB)
    .first()
    .scrollIntoViewIfNeeded();
  await expect(page.locator(LAB)).toBeVisible();
  await waitForIsland(page, LAB);
});

test('reproducir termina al final, vuelve a "Reproducir" y no repite', async ({ page }) => {
  const lab = page.locator(LAB);
  const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });
  await setRange(timeline, NEAR_END);

  await lab.getByRole('button', { name: 'Reproducir' }).click();
  await page.waitForTimeout(PLAYBACK_WAIT_MS);

  await expect(lab).toHaveAttribute('data-playing', 'false');
  await expect(lab.getByRole('button', { name: 'Reproducir' })).toBeVisible();
  await expect(timeline).toHaveValue('1000');
  await page.waitForTimeout(STILL_AT_END_MS);
  await expect(timeline).toHaveValue('1000');
  await expect(lab).toHaveAttribute('data-playing', 'false');
});

test('arrastrar la parada B cambia la duración y marca la ruta como modificada', async ({
  page,
}) => {
  await centreMap(page);
  const before = await readoutText(page, 'Duración de la ruta');
  const from = await knobCentre(page, 'stop-B');

  await mouseDrag(page, from, { x: from.x + 60, y: from.y + 40 });

  await expect.poll(() => readoutText(page, 'Duración de la ruta')).not.toBe(before);
  await expect(page.getByTestId('route-modified')).toBeVisible();

  await page.locator(LAB).getByRole('button', { name: 'Restablecer' }).click();
  await expect(page.getByTestId('route-modified')).toHaveCount(0);
  await expect.poll(() => readoutText(page, 'Duración de la ruta')).toBe(before);
});

test('soltar B sobre C muestra el mensaje y conserva la ruta', async ({ page }) => {
  await centreMap(page);
  const before = await readoutText(page, 'Duración de la ruta');
  const stopB = page.getByTestId('stop-B');
  const valueBefore = await stopB.getAttribute('aria-valuetext');

  await mouseDrag(page, await knobCentre(page, 'stop-B'), await knobCentre(page, 'stop-C'));

  await expect(page.getByTestId('route-error')).toContainText(
    'La parada B y la parada C coinciden',
  );
  expect(await readoutText(page, 'Duración de la ruta')).toBe(before);
  await expect(stopB).toHaveAttribute('aria-valuetext', valueBefore ?? '');
  await expect(page.getByTestId('route-modified')).toHaveCount(0);
});

test('una parada se mueve con las flechas del teclado', async ({ page }) => {
  const before = await readoutText(page, 'Duración de la ruta');

  await page.getByTestId('stop-C').focus();
  await page.keyboard.press('Shift+ArrowLeft');

  await expect.poll(() => readoutText(page, 'Duración de la ruta')).not.toBe(before);
  await expect(page.getByTestId('route-modified')).toBeVisible();
});

test('las gráficas de perfiles siguen presentes y su marcador sigue a t', async ({ page }) => {
  const profiles = page.getByTestId('drone-profiles');
  for (const title of [
    'Posición: x(t) y y(t)',
    'Velocidad: vx(t), vy(t) y |v|(t)',
    'Aceleración: ax(t), ay(t) y |a|(t)',
    'Distancia recorrida frente a |Δr| desde el depósito',
  ]) {
    await expect(profiles.getByText(title, { exact: true })).toBeVisible();
  }
  // Legend icons are .recharts-surface too; count only each chart's main surface.
  await expect(profiles.locator('.recharts-wrapper > .recharts-surface')).toHaveCount(4);

  const marker = profiles.locator('.recharts-reference-line line').first();
  const before = await marker.getAttribute('x1');
  await setRange(page.locator(LAB).getByRole('slider', { name: 'Línea de tiempo' }), '700');
  await expect.poll(() => marker.getAttribute('x1')).not.toBe(before);
});

test('la figura del laboratorio es una visualización con una sola insignia y fuente de ArduPilot', async ({
  page,
}) => {
  const figure = page.locator('section.step#paso-4 figure[data-type="visualizacion"]');

  await expect(figure.getByText('Visualización de datos', { exact: true })).toHaveCount(1);
  await expect(figure.locator('.figure-source')).toContainText('ArduPilot');
  await expect(figure.getByTestId('lab-footnote')).toContainText('no hay viento');
});

test('la página tiene al menos tres pasos, cada uno con su "Por qué"', async ({ page }) => {
  const steps = page.locator('section.step');

  expect(await steps.count()).toBeGreaterThanOrEqual(3);
  for (const step of await steps.all()) await expect(step.locator('.why')).toHaveCount(1);
});

test('el laboratorio ocupa el ancho de la columna de lectura', async ({ page }) => {
  const lab = await page.locator(LAB).boundingBox();
  const article = await page.locator('article').boundingBox();

  expect(lab).not.toBeNull();
  expect(article).not.toBeNull();
  expect(lab?.width ?? 0).toBeGreaterThanOrEqual(MIN_WIDTH_SHARE * (article?.width ?? Infinity));
});

test('la página cumple la estructura del tema', async ({ page }) => {
  await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
  expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('connections')).toBeVisible();
  expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(4);
});

test.describe('con pantalla táctil', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 } });

  test('arrastrar la parada B con el dedo cambia la duración sin desplazar la página', async ({
    page,
  }) => {
    await centreMap(page);
    const before = await readoutText(page, 'Duración de la ruta');
    const { x, y } = await knobCentre(page, 'stop-B');
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const cdp = await page.context().newCDPSession(page);

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (const step of [1, 2, 3, 4]) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + 4 * step, y: y + 3 * step }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect.poll(() => readoutText(page, 'Duración de la ruta')).not.toBe(before);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });
});
