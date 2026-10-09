import { expect, test } from '@playwright/test';

test('la portada carga bajo el base path', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Portafolio de evidencias de Física I',
  );
});
