import { expect, test, type Page } from '@playwright/test';
import { AUTHOR, COURSE, REPO_URL } from '../../src/consigna';

const PAGES = ['./', './temas/salto-personaje/', './no-existe/'];
const DESKTOP = { width: 1280, height: 900 };
const LAPTOP = { width: 1024, height: 768 };
const PHONE = { width: 390, height: 844 };
/** Touch target on a phone (Apple HIG 44 pt; WCAG 2.5.5 enhanced). */
const MIN_TOUCH_PX = 44;
/** Smallest pointer target on a desktop (the header's icon buttons are 40 px). */
const MIN_POINTER_PX = 40;
const FOOTER_ICON_STROKE = '1.6';
/** Sub-pixel slack for layout rounding. */
const ROUNDING_PX = 1;
/** The footer's own breathing room: the content sits no further than this from the document's end. */
const MAX_BOTTOM_GAP_PX = 32;
/** Top and bottom padding stay within this of each other, so the footer reads as centred. */
const MAX_PADDING_SKEW_PX = 8;
const MAX_TOOL_GAP_PX = 16;
const TOOL_TARGETS = 'body > footer a, body > footer button';
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

test('desde sm el texto del pie va a la izquierda y los iconos a la derecha, como el encabezado', async ({
  page,
}) => {
  for (const viewport of [DESKTOP, LAPTOP]) {
    await page.setViewportSize(viewport);
    await page.goto('./');

    const { text, tools, headerTools, headerText } = await page.evaluate(() => {
      const rect = (selector: string) => {
        const node = document.querySelector(selector)!.getBoundingClientRect();
        return { left: node.left, right: node.right };
      };
      return {
        text: rect('body > footer p'),
        tools: rect('body > footer div.flex.items-center'),
        headerText: rect('header a'),
        headerTools: rect('header div.flex.shrink-0'),
      };
    });
    // The same two margins as the header: text on the left edge, icons on the right edge.
    expect(Math.abs(text.left - headerText.left)).toBeLessThanOrEqual(ROUNDING_PX);
    expect(Math.abs(tools.right - headerTools.right)).toBeLessThanOrEqual(MAX_TOOL_GAP_PX);
    expect(tools.left).toBeGreaterThan(viewport.width / 2);
  }
});

test('el pie agrupa el enlace de GitHub y el botón de tema, sin nada más', async ({ page }) => {
  await page.goto('./');

  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('button')).toHaveCount(1);
  await expect(footer.getByRole('button')).toHaveAccessibleName('Cambiar a tema oscuro');
  const [link, button] = await Promise.all([
    footer.getByRole('link').boundingBox(),
    footer.getByRole('button').boundingBox(),
  ]);
  // Same row, same size, side by side: one group of tool icons.
  expect(Math.abs(link!.y - button!.y)).toBeLessThanOrEqual(ROUNDING_PX);
  expect(link!.width).toBeCloseTo(button!.width, 0);
  expect(link!.height).toBeCloseTo(button!.height, 0);
  expect(Math.abs(button!.x - (link!.x + link!.width))).toBeLessThanOrEqual(MAX_TOOL_GAP_PX);
  // Both glyphs are drawn at the same size.
  const [linkIcon, buttonIcon] = await Promise.all([
    footer.locator('a svg').boundingBox(),
    footer.locator('button svg:visible').boundingBox(),
  ]);
  expect(linkIcon!.width).toBeCloseTo(buttonIcon!.width, 0);
  expect(linkIcon!.height).toBeCloseTo(buttonIcon!.height, 0);
});

test('el enlace y el botón del pie se alcanzan con el teclado y muestran el foco', async ({
  page,
}) => {
  await page.goto('./');

  for (const role of ['link', 'button'] as const) {
    const control = page.getByRole('contentinfo').getByRole(role);
    await control.focus();
    await expect(control).toBeFocused();
    await expect(control).toHaveCSS('outline-style', 'solid');
  }
});

for (const { viewport, minPx } of [
  { viewport: PHONE, minPx: MIN_TOUCH_PX },
  { viewport: DESKTOP, minPx: MIN_POINTER_PX },
]) {
  test(`a ${viewport.width} px los controles del pie son áreas de al menos ${minPx} px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('./');

    for (const role of ['link', 'button'] as const) {
      const box = (await page.getByRole('contentinfo').getByRole(role).boundingBox())!;
      expect(box.width, role).toBeGreaterThanOrEqual(minPx);
      expect(box.height, role).toBeGreaterThanOrEqual(minPx);
    }
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

/** Space above and below the footer's content (text and controls), inside its border. */
async function footerPadding(page: Page) {
  return page.evaluate((selector) => {
    const footer = document.querySelector('body > footer')!;
    const box = footer.getBoundingClientRect();
    const border = parseFloat(getComputedStyle(footer).borderTopWidth);
    const parts = [...footer.querySelectorAll('p, a, button')].map((node) =>
      node.getBoundingClientRect(),
    );
    const top = Math.min(...parts.map((part) => part.top));
    const bottom = Math.max(...parts.map((part) => part.bottom));
    const pageBottom = Math.max(document.documentElement.scrollHeight, window.innerHeight);
    return {
      above: top - box.top - border,
      below: box.bottom - bottom,
      toDocumentEnd: pageBottom - (bottom + window.scrollY),
      controls: document.querySelectorAll(selector).length,
    };
  }, TOOL_TARGETS);
}

for (const viewport of [DESKTOP, LAPTOP, PHONE]) {
  for (const path of PAGES) {
    test(`a ${viewport.width} px el contenido del pie queda cerca del fin de ${path} y centrado en su caja`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(path);

      const padding = await footerPadding(page);

      expect(padding.controls).toBe(2);
      expect(padding.toDocumentEnd).toBeLessThanOrEqual(MAX_BOTTOM_GAP_PX);
      expect(padding.toDocumentEnd).toBeGreaterThanOrEqual(0);
      expect(Math.abs(padding.above - padding.below)).toBeLessThanOrEqual(MAX_PADDING_SKEW_PX);
    });
  }
}
