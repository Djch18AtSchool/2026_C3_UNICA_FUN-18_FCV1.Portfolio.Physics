import { expect, test, type Page } from '@playwright/test';
import { AUTHOR, COURSE, REPO_URL } from '../../src/consigna';

const PAGES = ['./', './temas/salto-personaje/', './no-existe/'];
const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };
/** Touch target on a phone (Apple HIG 44 pt; WCAG 2.5.5 enhanced). */
const MIN_TOUCH_PX = 44;
/** Smallest pointer target on a desktop (the header's icon buttons are 40 px). */
const MIN_POINTER_PX = 40;
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

test('el pie enlaza al repositorio solo con el icono de GitHub de trazo fino', async ({ page }) => {
  await page.goto('./');

  const footer = page.getByRole('contentinfo');
  const link = footer.getByRole('link', { name: 'Repositorio en GitHub', exact: true });
  await expect(link).toHaveAttribute('href', REPO_URL);
  await expect(link).toHaveAttribute('title', 'Repositorio en GitHub');
  // Icon only: no visible text, and no other link or button in the footer.
  await expect(link).toHaveText('');
  await expect(footer.getByRole('link')).toHaveCount(1);
  await expect(footer).not.toContainText('Repositorio');
  const icon = link.locator('svg');
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expect(icon).toHaveAttribute('fill', 'none');
  await expect(icon).toHaveAttribute('stroke-width', FOOTER_ICON_STROKE);
});

test('el enlace del pie se alcanza con el teclado y muestra el foco', async ({ page }) => {
  await page.goto('./');

  const link = page.getByRole('contentinfo').getByRole('link');
  await link.focus();
  await expect(link).toBeFocused();
  await expect(link).toHaveCSS('outline-style', 'solid');
});

for (const { viewport, minPx } of [
  { viewport: PHONE, minPx: MIN_TOUCH_PX },
  { viewport: DESKTOP, minPx: MIN_POINTER_PX },
]) {
  test(`a ${viewport.width} px el enlace del pie es un área de al menos ${minPx} px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('./');

    const box = (await page.getByRole('contentinfo').getByRole('link').boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(minPx);
    expect(box.height).toBeGreaterThanOrEqual(minPx);
  });
}

test('el pie ya no dice cuándo se actualizó ni trae "Volver arriba"', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);

    const footer = page.getByRole('contentinfo');
    await expect(footer, path).not.toContainText('Actualizado');
    await expect(footer, path).not.toContainText('Volver arriba');
    await expect(footer.locator('time'), path).toHaveCount(0);
    await expect(footer.locator('a[href="#top"]'), path).toHaveCount(0);
  }
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
