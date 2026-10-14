import { expect, test, type Page } from '@playwright/test';

const TOGGLE = 'header [data-theme-toggle]';
const FOOTER_TOGGLE = 'body > footer [data-theme-toggle]';
const PHONE = { width: 390, height: 844 };

function documentTheme(page: Page): Promise<string | undefined> {
  return page.evaluate(() => document.documentElement.dataset.theme);
}

function storedTheme(page: Page): Promise<string | null> {
  return page.evaluate(() => window.localStorage.getItem('theme'));
}

/** Both toggles (header and footer) are hydrated islands. */
async function waitForToggles(page: Page): Promise<void> {
  await expect(page.locator('astro-island:not([ssr]) [data-theme-toggle]')).toHaveCount(2);
}

test.use({ colorScheme: 'light' });

test('el botón de tema alterna, guarda la elección y la conserva al recargar', async ({ page }) => {
  await page.goto('./');
  await waitForToggles(page);
  expect(await documentTheme(page)).toBe('light');
  expect(await storedTheme(page)).toBeNull();

  await page.locator(TOGGLE).click();

  await expect.poll(() => documentTheme(page)).toBe('dark');
  expect(await storedTheme(page)).toBe('dark');
  await expect(page.locator(TOGGLE)).toHaveAccessibleName('Cambiar a tema claro');

  await page.reload();

  expect(await documentTheme(page)).toBe('dark');
  await expect(page.locator(TOGGLE)).toHaveAccessibleName('Cambiar a tema claro');

  await waitForToggles(page);
  await page.locator(TOGGLE).click();

  await expect.poll(() => documentTheme(page)).toBe('light');
  expect(await storedTheme(page)).toBe('light');
});

test('el pie trae su propio botón de tema, que cambia, guarda y deja sincronizado al del encabezado', async ({
  page,
}) => {
  await page.goto('./');
  await waitForToggles(page);
  await expect(page.locator('[data-theme-toggle]')).toHaveCount(2);
  await expect(page.locator(FOOTER_TOGGLE)).toHaveAccessibleName('Cambiar a tema oscuro');

  await page.locator(FOOTER_TOGGLE).click();

  await expect.poll(() => documentTheme(page)).toBe('dark');
  expect(await storedTheme(page)).toBe('dark');
  await expect(page.locator(FOOTER_TOGGLE)).toHaveAccessibleName('Cambiar a tema claro');
  await expect(page.locator(TOGGLE)).toHaveAccessibleName('Cambiar a tema claro');

  await page.locator(TOGGLE).click();

  await expect.poll(() => documentTheme(page)).toBe('light');
  expect(await storedTheme(page)).toBe('light');
  await expect(page.locator(FOOTER_TOGGLE)).toHaveAccessibleName('Cambiar a tema oscuro');
  await expect(page.locator(TOGGLE)).toHaveAccessibleName('Cambiar a tema oscuro');
});

test('con el tema oscuro guardado, los dos botones nacen con la etiqueta de la acción correcta', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: true });
  await context.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
  const page = await context.newPage();
  await page.goto('./temas/salto-personaje/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator(TOGGLE)).toHaveAccessibleName('Cambiar a tema claro');
  await expect(page.locator(FOOTER_TOGGLE)).toHaveAccessibleName('Cambiar a tema claro');
  await context.close();
});

test('el botón de tema del pie se alcanza con el teclado y se activa con Enter', async ({
  page,
}) => {
  await page.goto('./');
  await waitForToggles(page);

  await page.locator(FOOTER_TOGGLE).focus();
  await expect(page.locator(FOOTER_TOGGLE)).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');

  await expect.poll(() => documentTheme(page)).toBe('dark');
});

test('no hay identificadores repetidos con los dos botones en la página', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('./');

  const duplicated = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  });
  expect(duplicated).toEqual([]);
});
