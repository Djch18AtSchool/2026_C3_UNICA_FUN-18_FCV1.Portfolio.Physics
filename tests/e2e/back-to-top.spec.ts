import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const PAGES = [
  { name: 'la portada', path: './' },
  { name: 'un tema', path: './temas/salto-personaje/' },
  { name: 'la página 404', path: './no-existe/' },
];
const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };
/** Touch target (Apple HIG 44 pt; WCAG 2.5.5 enhanced). */
const MIN_TOUCH_PX = 44;
/** The button keeps 16 to 24 px from the viewport edges. */
const MIN_EDGE_PX = 12;
const MAX_EDGE_PX = 28;
const LAB_TEST_ID = 'jump-lab';
const SETTINGS_TITLE = /^Ajustes: /;
const BLOCKING_IMPACTS = ['serious', 'critical'];

const backToTop = (page: Page) => page.getByRole('link', { name: 'Volver arriba', exact: true });

/** Distances from the button to the viewport's right and bottom edges, and its size. */
async function edgeGaps(page: Page) {
  return backToTop(page).evaluate((node) => {
    const box = node.getBoundingClientRect();
    return {
      right: window.innerWidth - box.right,
      bottom: window.innerHeight - box.bottom,
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      position: getComputedStyle(node).position,
    };
  });
}

for (const { name, path } of PAGES) {
  test(`${name} tiene un solo "Volver arriba", fuera del pie y sin texto visible de más`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(backToTop(page)).toHaveCount(1);
    await expect(page.getByRole('contentinfo').getByText('Volver arriba')).toHaveCount(0);
    await expect(backToTop(page)).toHaveAttribute('title', 'Volver arriba');
    await expect(backToTop(page)).toHaveAttribute('href', '#top');
    await expect(backToTop(page).locator('svg[data-icon="arrow-up"]')).toHaveCount(1);
  });
}

for (const { viewport, label } of [
  { viewport: DESKTOP, label: 'escritorio' },
  { viewport: PHONE, label: 'móvil' },
]) {
  for (const { name, path } of PAGES) {
    test(`en ${label} el botón de ${name} está fijo abajo a la derecha, también al final`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(path);

      const check = async () => {
        const gaps = await edgeGaps(page);
        expect(gaps.position).toBe('fixed');
        expect(gaps.width).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
        expect(gaps.height).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
        expect(gaps.right).toBeGreaterThanOrEqual(MIN_EDGE_PX);
        expect(gaps.right).toBeLessThanOrEqual(MAX_EDGE_PX);
        expect(gaps.bottom).toBeGreaterThanOrEqual(MIN_EDGE_PX);
        expect(gaps.bottom).toBeLessThanOrEqual(MAX_EDGE_PX);
        expect(gaps.left).toBeGreaterThan(viewport.width / 2);
        expect(gaps.top).toBeGreaterThan(viewport.height / 2);
      };

      await check();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await check();
    });
  }
}

test('"Volver arriba" lleva al inicio y deja el foco de teclado al principio', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('./temas/salto-personaje/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await backToTop(page).click();

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
});

test('"Volver arriba" se alcanza y se activa con el teclado, con foco visible', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('./temas/salto-personaje/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  await backToTop(page).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(backToTop(page)).toBeFocused();
  await expect(backToTop(page)).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

for (const viewport of [DESKTOP, PHONE]) {
  test(`a ${viewport.width} px el botón no tapa el pie al final de la página`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('./temas/salto-personaje/');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const overlaps = await page.evaluate(() => {
      const button = document.querySelector('a[href="#top"]')!.getBoundingClientRect();
      const targets = document.querySelectorAll('body > footer p, body > footer a');
      return [...targets]
        .map((node) => node.getBoundingClientRect())
        .filter(
          (box) =>
            box.width > 0 &&
            box.left < button.right &&
            box.right > button.left &&
            box.top < button.bottom &&
            box.bottom > button.top,
        ).length;
    });
    expect(overlaps).toBe(0);
  });
}

test('el botón no tapa el encabezado en una página corta de móvil', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto('./no-existe/');

  const header = await page.locator('body > header').boundingBox();
  const button = (await backToTop(page).boundingBox())!;
  expect(button.y).toBeGreaterThanOrEqual(header!.y + header!.height);
});

test('el botón no se imprime', async ({ page }) => {
  await page.goto('./');
  await page.emulateMedia({ media: 'print' });

  await expect(page.locator('a[href="#top"]')).toBeHidden();
});

test('con el cajón de ajustes abierto en móvil el botón queda debajo y no tapa sus controles', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await page.goto('./temas/salto-personaje/');
  const lab = page.getByTestId(LAB_TEST_ID);
  await lab.scrollIntoViewIfNeeded();
  await waitForIsland(page, `[data-testid="${LAB_TEST_ID}"]`);
  await lab.getByRole('button', { name: 'Ajustes del simulador' }).click();
  const dialog = page.getByRole('dialog', { name: SETTINGS_TITLE });
  await expect(dialog).toBeVisible();

  const result = await page.evaluate(() => {
    const dialogNode = document.querySelector('dialog[open]')!;
    const button = document.querySelector('a[href="#top"]')!.getBoundingClientRect();
    const hitAt = (x: number, y: number) => document.elementFromPoint(x, y);
    const centre = hitAt(button.left + button.width / 2, button.top + button.height / 2);
    const controls = [...dialogNode.querySelectorAll('button, input, select, [role="tab"]')]
      .map((node) => node.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0);
    const covered = controls.filter((box) => {
      const hit = hitAt(box.left + box.width / 2, box.top + box.height / 2);
      return !hit || !dialogNode.contains(hit);
    });
    return {
      isOverButton: centre?.closest('a[href="#top"]') != null,
      isInsideDialog: centre ? dialogNode.contains(centre) : false,
      covered: covered.length,
      controls: controls.length,
    };
  });

  expect(result.isOverButton).toBe(false);
  expect(result.isInsideDialog).toBe(true);
  expect(result.controls).toBeGreaterThan(0);
  expect(result.covered).toBe(0);
});

for (const theme of ['light', 'dark']) {
  test(`el botón no añade violaciones de axe en tema ${theme === 'light' ? 'claro' : 'oscuro'}`, async ({
    page,
  }) => {
    await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
    await page.setViewportSize(PHONE);
    await page.goto('./no-existe/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    const { violations } = await new AxeBuilder({ page }).analyze();
    const blocking = violations.filter((violation) =>
      BLOCKING_IMPACTS.includes(violation.impact ?? ''),
    );
    expect(blocking.map(({ id }) => id)).toEqual([]);
  });
}
