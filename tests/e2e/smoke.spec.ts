import { expect, test } from '@playwright/test';
import { SITE_URL } from '../../src/consigna';

test('la portada carga bajo el base path', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Portafolio de evidencias de Física I',
  );
});

test('cada página declara su URL pública como canónica', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', SITE_URL);

  await page.goto('./temas/dron-reparto/');
  const topicUrl = `${SITE_URL}temas/dron-reparto/`;
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', topicUrl);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', topicUrl);

  await page.goto('./no-existe/');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
