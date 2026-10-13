import { expect, test, type Page } from '@playwright/test';

const TOPIC = './temas/salto-personaje/';
const BAR = '[data-reading-progress]';
const BAR_HEIGHT_PX = 3;
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
/** Subpixel rounding of the last scroll step. */
const FULL_TOLERANCE = 0.01;

/** The fill's horizontal scale, which is the progress the bar shows. */
async function fillScale(page: Page): Promise<number> {
  return page.locator(`${BAR} > div`).evaluate((fill) => {
    const { transform } = getComputedStyle(fill);
    return transform === 'none' ? 1 : new DOMMatrix(transform).a;
  });
}

/** Scroll so that the given fraction of the reading range has passed, then let the frame run. */
async function scrollToReadingFraction(page: Page, fraction: number): Promise<void> {
  await page.evaluate(async (value) => {
    const head = document.querySelector('[data-topic-head]')!;
    const body = document.querySelector('.topic-body')!;
    const start = head.getBoundingClientRect().top + window.scrollY;
    const end = body.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo(0, start + value * (end - window.innerHeight - start));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, fraction);
}

test.describe('barra de progreso de lectura', () => {
  test('está en 0 al cargar, crece con el scroll y llega a 1 al final del cuerpo', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(TOPIC);
    const bar = page.locator(BAR);
    await expect(bar).toBeVisible();
    await expect(bar).toHaveAttribute('aria-hidden', 'true');
    await expect(bar).toHaveCSS('position', 'fixed');
    await expect(bar).toHaveCSS('pointer-events', 'none');
    expect((await bar.boundingBox())?.height).toBe(BAR_HEIGHT_PX);
    expect(await fillScale(page)).toBe(0);

    await scrollToReadingFraction(page, 0.5);
    const middle = await fillScale(page);
    expect(middle).toBeGreaterThan(0.4);
    expect(middle).toBeLessThan(0.6);

    await scrollToReadingFraction(page, 1);
    expect(await fillScale(page)).toBeGreaterThan(1 - FULL_TOLERANCE);

    await scrollToReadingFraction(page, 0);
    expect(await fillScale(page)).toBe(0);
    expect(errors).toEqual([]);
  });

  for (const [name, viewport] of [
    ['escritorio', DESKTOP],
    ['móvil', PHONE],
  ] as const) {
    test(`en ${name} no desborda el ancho y queda entre la barra fija y el enlace de salto`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(TOPIC);
      await scrollToReadingFraction(page, 0.5);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const zIndex = await page
        .locator(BAR)
        .evaluate((bar) => Number(getComputedStyle(bar).zIndex));
      expect(zIndex).toBeGreaterThan(20);
      expect(zIndex).toBeLessThan(50);
    });
  }

  test('la portada y la página 404 no tienen barra', async ({ page }) => {
    for (const path of ['./', './no-existe/']) {
      await page.goto(path);

      await expect(page.locator(BAR), path).toHaveCount(0);
    }
  });

  test('sin JavaScript la barra no se muestra', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(TOPIC);

    await expect(page.locator(BAR)).toBeHidden();
    await context.close();
  });

  test('no se imprime', async ({ page }) => {
    await page.goto(TOPIC);
    await expect(page.locator(BAR)).toBeVisible();

    await page.emulateMedia({ media: 'print' });

    await expect(page.locator(BAR)).toBeHidden();
  });
});
