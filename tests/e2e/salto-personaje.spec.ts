import { expect, test, type Page } from '@playwright/test';
import { setRange, waitForIsland } from './helpers';

const PAGE = './temas/salto-personaje/';
const LAB = '[data-testid="jump-lab"]';
const MS_PER_S = 1000;
/** The lab must fill the reading column (spec §6): at least this share of the article width. */
const MIN_WIDTH_SHARE = 0.9;

/** Spanish-formatted number ("3,26 m", "−0,5 s") → 3.26. */
function parseSpanish(text: string): number {
  return Number(text.replace(/[^\d,-]/g, '').replace(',', '.'));
}

/** The value text of a LabShell readout row. */
async function readoutText(page: Page, label: string): Promise<string> {
  const row = page.locator(LAB).locator('div', { has: page.getByText(label, { exact: true }) });
  return ((await row.last().locator('span').last().textContent()) ?? '').trim();
}

const readoutValue = async (page: Page, label: string) =>
  parseSpanish(await readoutText(page, label));

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
  // The island hydrates with client:visible; bring it into view and wait for React.
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
});

test('abre en el preajuste Celeste con la referencia terrestre a la vista', async ({ page }) => {
  await expect(page.getByRole('slider', { name: 'Gravedad g' })).toHaveValue('112.5');
  await expect(page.getByRole('button', { name: /^Celeste/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText(/^Referencia terrestre, g = 9,81/)).toBeVisible();
});

test('reproducir termina en t = t_aire, vuelve a "Reproducir" y no repite', async ({ page }) => {
  const lab = page.locator(LAB);
  const tAir = await readoutValue(page, 'Tiempo en el aire');

  await lab.getByRole('button', { name: 'Reproducir' }).click();
  await page.waitForTimeout((tAir + 1) * MS_PER_S);

  await expect(lab).toHaveAttribute('data-playing', 'false');
  await expect(lab.getByRole('button', { name: 'Reproducir' })).toBeVisible();
  const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });
  await expect(timeline).toHaveValue('1000');
  const tText = (await timeline.getAttribute('aria-valuetext')) ?? '';
  expect(Math.abs(parseSpanish(tText) - tAir)).toBeLessThan(0.006);

  // Still at the end a moment later: the clock did not wrap around.
  await page.waitForTimeout(500);
  await expect(timeline).toHaveValue('1000');
  await expect(lab).toHaveAttribute('data-playing', 'false');
});

test('arrastrar el manejador del vector con el ratón cambia la altura máxima', async ({ page }) => {
  const before = await readoutText(page, 'Altura máxima');
  const knob = page.getByTestId('launch-handle').locator('[data-knob]');
  const box = await knob.boundingBox();
  expect(box).not.toBeNull();
  const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 20, { steps: 4 });
  await page.mouse.move(x, y - 40, { steps: 4 });
  await page.mouse.up();

  await expect.poll(() => readoutText(page, 'Altura máxima')).not.toBe(before);
  expect(await readoutValue(page, 'Altura máxima')).toBeGreaterThan(parseSpanish(before));
});

test('mover la gravedad recalcula la altura máxima', async ({ page }) => {
  const gravity = page.getByRole('slider', { name: 'Gravedad g' });
  const before = await readoutValue(page, 'Altura máxima');

  await setRange(gravity, '150');

  await expect(gravity).toHaveValue('150');
  await expect.poll(() => readoutValue(page, 'Altura máxima')).toBeLessThan(before);
});

test('el engranaje abre el panel, Escape lo cierra y el foco vuelve al engranaje', async ({
  page,
}) => {
  const gear = page.locator(LAB).getByRole('button', { name: 'Ajustes del simulador' });
  const dialog = page.getByRole('dialog', { name: /^Ajustes: Laboratorio del salto/ });

  await gear.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('switch', { name: 'Repetir' })).not.toBeChecked();
  await page.keyboard.press('Escape');

  await expect(dialog).toBeHidden();
  await expect(gear).toBeFocused();
});

test('con 1 decimal global las lecturas muestran un decimal', async ({ page }) => {
  await page.locator(LAB).getByRole('button', { name: 'Ajustes del simulador' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'Global' }).click();
  await dialog.getByText('1', { exact: true }).click();
  await page.keyboard.press('Escape');

  for (const label of ['Altura máxima', 'Tiempo al ápice', 'Tiempo en el aire', 'Alcance']) {
    expect(await readoutText(page, label)).toMatch(/^\d+,\d\s[ms]$/);
  }
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
  await expect(
    page.locator('figure[data-type="simulacion"]').getByTestId('jump-lab'),
  ).toBeVisible();
  await expect(page.getByTestId('jump-designer')).toBeVisible();
  expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('connections')).toBeVisible();
  expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(4);
});
