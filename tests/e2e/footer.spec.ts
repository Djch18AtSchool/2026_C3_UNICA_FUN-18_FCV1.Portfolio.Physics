import { expect, test, type Page } from '@playwright/test';
import { AUTHOR, COURSE, REPO_URL } from '../../src/consigna';

const PAGES = ['./', './temas/salto-personaje/', './temas/frenado-regenerativo/', './no-existe/'];
const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };
/** Sub-pixel slack for layout rounding. */
const ROUNDING_PX = 1;
/** What the footer leaves out: no school, no course data, no topic tally. */
const OMITTED_TEXTS = ['Escuela', COURSE.code, 'Sección', 'temas publicados', 'Sitio generado'];

async function footerBottomGap(page: Page): Promise<number> {
  return page.evaluate(() => {
    const footer = document.querySelector('body > footer')!;
    const bottom = footer.getBoundingClientRect().bottom + window.scrollY;
    const pageBottom = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    return pageBottom - bottom;
  });
}

test('cada página tiene un solo pie con la identidad del portafolio', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);

    const footer = page.getByRole('contentinfo');
    await expect(footer, path).toHaveCount(1);
    await expect(page.locator('body > footer'), path).toHaveCount(1);
    await expect(footer).toContainText('Portafolio de evidencias de Física I');
    await expect(footer).toContainText(AUTHOR);
    await expect(footer).toContainText(COURSE.university);
    for (const text of OMITTED_TEXTS) await expect(footer, path).not.toContainText(text);
  }
});

test('el pie enlaza al repositorio con el icono de GitHub en contorno', async ({ page }) => {
  await page.goto('./');

  const link = page.getByRole('contentinfo').getByRole('link', { name: 'Repositorio' });
  await expect(link).toHaveAttribute('href', REPO_URL);
  const icon = link.locator('svg');
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expect(icon).toHaveAttribute('fill', 'none');
});

test('el pie dice cuándo se actualizó, con la fecha del último commit', async ({ page }) => {
  await page.goto('./');

  const footer = page.getByRole('contentinfo');
  await expect(footer).toContainText(/Actualizado el \d{1,2} de \S+ de \d{4}/);
  await expect(footer.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
});

test('"Volver arriba" lleva al inicio de la página', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('./temas/salto-personaje/');

  const backToTop = page.getByRole('contentinfo').getByRole('link', { name: 'Volver arriba' });
  await backToTop.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await backToTop.click();

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

for (const viewport of [DESKTOP, PHONE]) {
  test(`a ${viewport.width} px el pie queda al fondo de una página corta y no desborda`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('./no-existe/');

    expect(Math.abs(await footerBottomGap(page))).toBeLessThanOrEqual(ROUNDING_PX);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width);
  });
}
