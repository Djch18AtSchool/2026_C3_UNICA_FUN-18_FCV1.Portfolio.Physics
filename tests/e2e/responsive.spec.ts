import { expect, test, type Page } from '@playwright/test';

const PHONE = { width: 375, height: 812 };
const TOPIC_COUNT = 13;

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test.use({ viewport: PHONE });

test('la portada no desborda en horizontal a 375 px', async ({ page }) => {
  await page.goto('./');
  await expectNoHorizontalOverflow(page);
});

test('el tema 2 no desborda en horizontal a 375 px', async ({ page }) => {
  await page.goto('./temas/salto-personaje/');
  await page.getByRole('slider').first().scrollIntoViewIfNeeded();
  await expectNoHorizontalOverflow(page);
});

test('el cajón de temas se abre en móvil y lista los 13 temas', async ({ page }) => {
  await page.goto('./temas/salto-personaje/');
  const nav = page.locator('nav[aria-label="Temas"]');
  const links = nav.getByTestId('topic-link');
  await expect(links.first()).toBeHidden();

  await nav.locator('summary').click();

  await expect(links).toHaveCount(TOPIC_COUNT);
  for (const link of await links.all()) await expect(link).toBeVisible();
});
