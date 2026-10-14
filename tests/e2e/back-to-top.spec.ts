import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { BACK_TO_TOP_REVEAL_PX } from '../../src/lib/backToTop';
import { waitForIsland } from './helpers';

const PAGES = [
  { name: 'la portada', path: './' },
  { name: 'un tema', path: './temas/salto-personaje/' },
  { name: 'la página 404', path: './no-existe/' },
];
const DESKTOP = { width: 1280, height: 900 };
const LAPTOP = { width: 1024, height: 768 };
const PHONE = { width: 390, height: 844 };
/** Touch target (Apple HIG 44 pt; WCAG 2.5.5 enhanced). */
const MIN_TOUCH_PX = 44;
/** The button's margin to the right and bottom edges, and to the footer's rule, in rem. */
const EDGE_REM = 1;
/** Sub-pixel slack for layout rounding. */
const ROUNDING_PX = 1;
/** Scroll step used to walk a whole page looking for the button crossing the footer. */
const WALK_STEP_PX = 120;
/** A point well past the reveal distance, still far from both ends of a long page. */
const MID_PAGE_Y = BACK_TO_TOP_REVEAL_PX * 4;
const LAB_TEST_ID = 'jump-lab';
const SETTINGS_TITLE = /^Ajustes: /;
const BLOCKING_IMPACTS = ['serious', 'critical'];

/** Present in the page whether or not it is shown, so the tests can ask about its state. */
const anyBackToTop = (page: Page) => page.locator('a[href="#top"]');
/** Only while shown: the accessibility tree leaves out a hidden button. */
const backToTop = (page: Page) => page.getByRole('link', { name: 'Volver arriba', exact: true });

async function scrollToY(page: Page, y: number): Promise<void> {
  await page.evaluate((top) => window.scrollTo(0, top), y);
}

const scrollToEnd = (page: Page) =>
  page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

/** How far the page can scroll: a short page, such as the 404, cannot reach the reveal distance. */
function maxScroll(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
}

/** The root font size in px (17 on this site), to turn rem into the pixels the layout uses. */
function remPx(page: Page): Promise<number> {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
}

/** Distances from the button to the viewport's right and bottom edges, and its size. */
async function edgeGaps(page: Page) {
  return anyBackToTop(page).evaluate((node) => {
    const box = node.getBoundingClientRect();
    return {
      right: window.innerWidth - box.right,
      bottom: window.innerHeight - box.bottom,
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
    };
  });
}

for (const { name, path } of PAGES) {
  test(`${name} tiene un solo "Volver arriba", fuera del pie y sin texto visible de más`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(anyBackToTop(page)).toHaveCount(1);
    await expect(page.getByRole('contentinfo').getByText('Volver arriba')).toHaveCount(0);
    await expect(anyBackToTop(page)).toHaveAttribute('title', 'Volver arriba');
    await expect(anyBackToTop(page)).toHaveAttribute('aria-label', 'Volver arriba');
    await expect(anyBackToTop(page).locator('svg[data-icon="arrow-up"]')).toHaveCount(1);
  });
}

for (const { name, path } of PAGES) {
  test(`al inicio de ${name} el botón no se ve, no se alcanza y no recibe clics`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(anyBackToTop(page)).toBeHidden();
    await expect(anyBackToTop(page)).toHaveCSS('visibility', 'hidden');
    await expect(anyBackToTop(page)).toHaveCSS('pointer-events', 'none');
    await expect(backToTop(page)).toHaveCount(0);
    // Tabbing can scroll the page (a focused footer link brings the page's end into view) and
    // that reveals the button, which is right; but while it is hidden Tab never lands on it.
    for (let press = 0; press < 40; press += 1) {
      await page.keyboard.press('Tab');
      const { href, scrollY } = await page.evaluate(() => ({
        href: document.activeElement?.getAttribute('href'),
        scrollY: window.scrollY,
      }));
      if (href === '#top') expect(scrollY).toBeGreaterThan(BACK_TO_TOP_REVEAL_PX);
    }
  });
}

for (const { viewport, label } of [
  { viewport: DESKTOP, label: 'escritorio' },
  { viewport: PHONE, label: 'móvil' },
]) {
  test(`en ${label} aparece al bajar, desaparece al volver arriba y queda en la esquina inferior derecha`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('./temas/salto-personaje/');
    await expect(anyBackToTop(page)).toBeHidden();

    await scrollToY(page, BACK_TO_TOP_REVEAL_PX / 2);
    await expect(anyBackToTop(page)).toBeHidden();

    await scrollToY(page, MID_PAGE_Y);
    await expect(backToTop(page)).toBeVisible();
    const gaps = await edgeGaps(page);
    expect(gaps.width).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
    expect(gaps.height).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
    expect(gaps.right).toBeCloseTo(EDGE_REM * (await remPx(page)), 0);
    expect(gaps.bottom).toBeCloseTo(EDGE_REM * (await remPx(page)), 0);
    expect(gaps.left).toBeGreaterThan(viewport.width / 2);
    expect(gaps.top).toBeGreaterThan(viewport.height / 2);

    await scrollToY(page, 0);
    await expect(anyBackToTop(page)).toBeHidden();
  });
}

for (const viewport of [DESKTOP, LAPTOP, PHONE]) {
  for (const { name, path } of PAGES) {
    test(`a ${viewport.width} px el botón de ${name} nunca cruza el pie, en ningún punto del recorrido`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(path);

      const crossings = await page.evaluate(
        ({ step, slack }) => {
          const button = document.querySelector('a[href="#top"]')!;
          const footer = document.querySelector('body > footer')!;
          const end = document.documentElement.scrollHeight - window.innerHeight;
          const stops: number[] = [];
          for (let y = 0; y < end; y += step) stops.push(y);
          stops.push(Math.max(end, 0));
          return stops
            .map((y) => {
              window.scrollTo(0, y);
              const box = button.getBoundingClientRect();
              const foot = footer.getBoundingClientRect();
              return { y, overlap: box.bottom - foot.top > slack && box.top < foot.bottom };
            })
            .filter((stop) => stop.overlap)
            .map((stop) => stop.y);
        },
        { step: WALK_STEP_PX, slack: ROUNDING_PX },
      );

      expect(crossings).toEqual([]);
    });
  }
}

/** Clear air between the last content and the button resting at the end of a page. */
const MIN_CONTENT_CLEARANCE_PX = 12;

for (const viewport of [DESKTOP, LAPTOP, PHONE]) {
  test(`a ${viewport.width} px al final de un tema el botón se detiene entre el contenido y el pie, a 1 rem del pie y del borde derecho`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('./temas/salto-personaje/');
    await scrollToEnd(page);

    await expect(backToTop(page)).toBeVisible();
    const { buttonTop, buttonBottom, buttonRight, contentBottom, footerTop, viewportWidth } =
      await page.evaluate(() => {
        const box = document.querySelector('a[href="#top"]')!.getBoundingClientRect();
        return {
          buttonTop: box.top,
          buttonBottom: box.bottom,
          buttonRight: box.right,
          contentBottom: document.querySelector('main > :last-child')!.getBoundingClientRect()
            .bottom,
          footerTop: document.querySelector('body > footer')!.getBoundingClientRect().top,
          viewportWidth: window.innerWidth,
        };
      });
    expect(buttonBottom).toBeLessThanOrEqual(footerTop - ROUNDING_PX);
    expect(footerTop - buttonBottom).toBeCloseTo(EDGE_REM * (await remPx(page)), 0);
    expect(buttonTop).toBeGreaterThanOrEqual(contentBottom + MIN_CONTENT_CLEARANCE_PX);
    // Still in the right-hand corner, 1rem from the edge as while it follows the viewport.
    expect(viewportWidth - buttonRight).toBeCloseTo(EDGE_REM * (await remPx(page)), 0);
  });
}

test('"Volver arriba" lleva al inicio, deja el foco de teclado al principio y se esconde', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('./temas/salto-personaje/');
  await scrollToEnd(page);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await backToTop(page).click();

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(anyBackToTop(page)).toBeHidden();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
});

test('"Volver arriba" no añade #top a la dirección ni entradas al historial', async ({ page }) => {
  await page.goto('./temas/salto-personaje/');
  await scrollToEnd(page);
  const url = page.url();
  const historyLength = await page.evaluate(() => window.history.length);

  for (let press = 0; press < 2; press += 1) {
    await backToTop(page).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await scrollToEnd(page);
  }

  expect(page.url()).toBe(url);
  expect(page.url()).not.toContain('#');
  expect(await page.evaluate(() => window.history.length)).toBe(historyLength);
});

test('el botón queda a 80 % de opacidad y se vuelve sólido al pasar el cursor o enfocarlo', async ({
  page,
}) => {
  await page.goto('./temas/salto-personaje/');
  await scrollToY(page, MID_PAGE_Y);

  await expect(backToTop(page)).toHaveCSS('opacity', '0.8');
  await backToTop(page).hover();
  await expect(backToTop(page)).toHaveCSS('opacity', '1');
  await page.mouse.move(0, 0);
  await expect(backToTop(page)).toHaveCSS('opacity', '0.8');
  await backToTop(page).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(backToTop(page)).toHaveCSS('opacity', '1');
});

test('"Volver arriba" se alcanza y se activa con el teclado, con foco visible', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('./temas/salto-personaje/');
  await scrollToEnd(page);

  await backToTop(page).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(backToTop(page)).toBeFocused();
  await expect(backToTop(page)).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

for (const viewport of [DESKTOP, LAPTOP, PHONE]) {
  for (const { name, path } of PAGES) {
    test(`a ${viewport.width} px el botón de ${name} no tapa el texto ni los iconos del pie`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(path);
      await scrollToEnd(page);

      const result = await page.evaluate(() => {
        const button = document.querySelector('a[href="#top"]')!.getBoundingClientRect();
        const targets = document.querySelectorAll(
          'body > footer p, body > footer a, body > footer button',
        );
        const overlapping = [...targets]
          .map((node) => node.getBoundingClientRect())
          .filter(
            (box) =>
              box.width > 0 &&
              box.left < button.right &&
              box.right > button.left &&
              box.top < button.bottom &&
              box.bottom > button.top,
          );
        return { overlaps: overlapping.length, targets: targets.length };
      });
      expect(result.targets).toBe(4);
      expect(result.overlaps).toBe(0);
    });
  }
}

test('el botón no se imprime', async ({ page }) => {
  await page.goto('./temas/salto-personaje/');
  await scrollToY(page, MID_PAGE_Y);
  await expect(backToTop(page)).toBeVisible();

  await page.emulateMedia({ media: 'print' });

  await expect(anyBackToTop(page)).toBeHidden();
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
  for (const { name, path } of PAGES) {
    test(`el botón de ${name} no añade violaciones de axe en tema ${theme === 'light' ? 'claro' : 'oscuro'}`, async ({
      page,
    }) => {
      await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
      await page.setViewportSize(PHONE);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      // Scroll first when the page can, so the button is in the tree while axe looks.
      if ((await maxScroll(page)) > BACK_TO_TOP_REVEAL_PX) {
        await scrollToY(page, MID_PAGE_Y);
        await expect(backToTop(page)).toBeVisible();
      }

      const { violations } = await new AxeBuilder({ page }).analyze();
      const blocking = violations.filter((violation) =>
        BLOCKING_IMPACTS.includes(violation.impact ?? ''),
      );
      expect(blocking.map(({ id }) => id)).toEqual([]);
    });
  }
}

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('el enlace se ve siempre y sigue llevando al inicio de la página', async ({ page }) => {
    await page.goto('./temas/salto-personaje/');
    // Nothing can reveal it on scroll, so it is never hidden.
    await expect(backToTop(page)).toBeVisible();
    await page.keyboard.press('End');
    // The key scrolls with an animation: wait for it to reach the end before clicking.
    await expect
      .poll(() =>
        page.evaluate(
          () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1,
        ),
      )
      .toBe(true);
    await expect(backToTop(page)).toBeVisible();

    await backToTop(page).click();

    await expect(page).toHaveURL(/#top$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});
