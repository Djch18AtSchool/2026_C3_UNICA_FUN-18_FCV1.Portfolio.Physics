import { expect, test, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const TOGGLE = '[data-theme-toggle]';

function documentTheme(page: Page): Promise<string | undefined> {
  return page.evaluate(() => document.documentElement.dataset.theme);
}

function storedTheme(page: Page): Promise<string | null> {
  return page.evaluate(() => window.localStorage.getItem('theme'));
}

test.use({ colorScheme: 'light' });

test('el botón de tema alterna, guarda la elección y la conserva al recargar', async ({ page }) => {
  await page.goto('./');
  await waitForIsland(page, TOGGLE);
  expect(await documentTheme(page)).toBe('light');
  expect(await storedTheme(page)).toBeNull();

  await page.locator(TOGGLE).click();

  await expect.poll(() => documentTheme(page)).toBe('dark');
  expect(await storedTheme(page)).toBe('dark');
  await expect(page.locator(TOGGLE)).toHaveAccessibleName('Cambiar a tema claro');

  await page.reload();

  expect(await documentTheme(page)).toBe('dark');
  await expect(page.locator(TOGGLE)).toHaveAccessibleName('Cambiar a tema claro');

  await waitForIsland(page, TOGGLE);
  await page.locator(TOGGLE).click();

  await expect.poll(() => documentTheme(page)).toBe('light');
  expect(await storedTheme(page)).toBe('light');
});
