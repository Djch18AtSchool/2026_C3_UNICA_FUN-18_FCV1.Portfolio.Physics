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

  await nav.locator('summary').first().click();

  await expect(links).toHaveCount(TOPIC_COUNT);
  await expect(
    nav.locator('details[data-phase="1"] [data-testid="topic-link"]').first(),
  ).toBeVisible();
  for (const phase of [2, 3]) await nav.locator(`details[data-phase="${phase}"] > summary`).click();
  for (const link of await links.all()) await expect(link).toBeVisible();
});

for (const width of [360, PHONE.width]) {
  test(`con la barra lateral guardada como cerrada, el tema 2 no desborda a ${width} px y conserva el cajón`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: PHONE.height });
    await page.addInitScript(() => window.localStorage.setItem('portafolio.nav.sidebar', 'closed'));
    await page.goto('./temas/salto-personaje/');
    const nav = page.locator('nav[aria-label="Temas"]');

    await expect(page.locator('[data-sidebar-toggle]')).toBeHidden();
    await expect(nav).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await nav.locator('summary').first().click();
    await expect(nav.getByTestId('topic-link').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
