import { expect, test, type Page } from '@playwright/test';
import { AUTHOR, COURSE, REPO_URL } from '../../src/consigna';

const PAGES = ['./', './temas/salto-personaje/', './temas/frenado-regenerativo/', './no-existe/'];
const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };
/** Touch target on a phone (Apple HIG 44 pt; WCAG 2.5.5 enhanced). */
const MIN_TOUCH_PX = 44;
const FOOTER_ICON_STROKE = '1.6';
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

test('el pie enlaza al repositorio con el icono de GitHub de trazo fino', async ({ page }) => {
  await page.goto('./');

  const link = page
    .getByRole('contentinfo')
    .getByRole('link', { name: 'Repositorio en GitHub', exact: true });
  await expect(link).toHaveAttribute('href', REPO_URL);
  // WCAG 2.5.3: the spoken name starts with the visible label.
  await expect(link).toHaveText('Repositorio');
  const icon = link.locator('svg');
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expect(icon).toHaveAttribute('fill', 'none');
  // The same 1.6 stroke as the footer's other icon.
  await expect(icon).toHaveAttribute('stroke-width', FOOTER_ICON_STROKE);
  await expect(
    page.getByRole('contentinfo').getByRole('link', { name: 'Volver arriba' }).locator('svg'),
  ).toHaveAttribute('stroke-width', FOOTER_ICON_STROKE);
});

for (const { viewport, isTall } of [
  { viewport: PHONE, isTall: true },
  { viewport: DESKTOP, isTall: false },
]) {
  test(`a ${viewport.width} px los enlaces del pie ${isTall ? 'son áreas táctiles amplias' : 'conservan su línea'}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('./');

    const links = page.getByRole('contentinfo').getByRole('link');
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      const { height } = (await link.boundingBox())!;
      if (isTall) expect(height).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
      else expect(height).toBeLessThan(MIN_TOUCH_PX / 2);
    }
  });
}

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
