import { expect, test, type Locator, type Page } from '@playwright/test';

const PAGE = './temas/gravedad-artificial/';

async function setRange(slider: Locator, value: string): Promise<void> {
  await slider.fill(value);
  await slider.dispatchEvent('input');
  await slider.dispatchEvent('change');
}

function readoutRow(page: Page, label: string): Locator {
  return page.getByTestId('habitat-readouts').locator('div', { hasText: label }).first();
}

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
});

test('el diagrama del hábitat se ve y anota las ecuaciones', async ({ page }) => {
  const diagram = page.getByTestId('habitat-diagram');

  await expect(diagram).toBeVisible();
  await expect(diagram.locator('text', { hasText: 'ω²' }).first()).toBeAttached();
  await expect(diagram.locator('text', { hasText: '2π' }).first()).toBeAttached();
});

test('en modo "Fijar 1 g", 2 RPM da un radio de 223,6 m', async ({ page }) => {
  const calculator = page.getByTestId('habitat-calculator');
  await calculator.scrollIntoViewIfNeeded();
  await expect(calculator).toHaveAttribute('data-ready', 'true');

  await page.getByRole('radio', { name: 'Fijar 1 g y despejar r' }).check();
  await setRange(page.getByLabel(/^Velocidad de giro/), '2');

  await expect(readoutRow(page, 'Radio necesario').locator('span').last()).toHaveText(
    /^223,6\s?m$/,
  );
});

test('la página cumple la estructura del tema', async ({ page }) => {
  await expect(page.locator('figure[data-type="diagrama"]')).toBeVisible();
  await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
  expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('connections')).toBeVisible();
  expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(3);
});
