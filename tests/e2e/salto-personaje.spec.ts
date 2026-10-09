import { expect, test, type Locator, type Page } from '@playwright/test';

const PAGE = './temas/salto-personaje/';

/** Numeric value of a Readout row, parsed from its Spanish formatting ("3,26 m" → 3.26). */
async function readoutValue(page: Page, label: string): Promise<number> {
  const row = page.getByTestId('jump-readouts').locator('div', { hasText: label }).first();
  const text = (await row.locator('span').last().textContent()) ?? '';
  return Number(text.replace(/[^\d,-]/g, '').replace(',', '.'));
}

async function setRange(slider: Locator, value: string): Promise<void> {
  await slider.fill(value);
  await slider.dispatchEvent('input');
  await slider.dispatchEvent('change');
}

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
  // The island hydrates with client:visible; bring it into view and wait for React.
  await page.getByTestId('jump-simulator').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('jump-simulator')).toHaveAttribute('data-ready', 'true');
});

test('mover la gravedad recalcula la altura máxima', async ({ page }) => {
  const gravity = page.getByLabel(/^Gravedad g/);
  const before = await readoutValue(page, 'Altura máxima');

  await setRange(gravity, '20');

  await expect(gravity).toHaveValue('20');
  await expect.poll(() => readoutValue(page, 'Altura máxima')).toBeLessThan(before);
});

test('el preajuste Luna cambia los controles', async ({ page }) => {
  await page.getByRole('button', { name: /^Luna/ }).click();

  await expect(page.getByLabel(/^Gravedad g/)).toHaveValue('1.62');
});

test('la página cumple la estructura del tema', async ({ page }) => {
  await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
  await expect(page.locator('figure[data-type="simulacion"]')).toBeVisible();
  expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('connections')).toBeVisible();
  expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(2);
});
