import { expect, test, type Page } from '@playwright/test';
import { setRange, waitForIsland } from './helpers';

const PAGE = './temas/llantas-f1/';
const LAB = '[data-testid="tyre-lab"]';
/** The lab must fill the reading column (spec §6): at least this share of the article width. */
const MIN_WIDTH_SHARE = 0.9;
const LOAD_CURSOR = 'Carga vertical F_z';
const TEMPERATURE_CURSOR = 'Temperatura T';

/** The value text of a LabShell readout row. */
async function readoutText(page: Page, label: string): Promise<string> {
  const row = page.locator(LAB).locator('div', { has: page.getByText(label, { exact: true }) });
  return ((await row.last().locator('span').last().textContent()) ?? '').trim();
}

/** Centre of a plot cursor's visible knob, in page coordinates. */
async function knobCentre(page: Page, name: string): Promise<{ x: number; y: number }> {
  const box = await page
    .locator(LAB)
    .getByRole('slider', { name, exact: true })
    .locator('circle')
    .last()
    .boundingBox();
  expect(box).not.toBeNull();
  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
}

/** Scrolls the load plot to the middle of the viewport, clear of the sticky topic bar. */
async function centreLoadPlot(page: Page): Promise<void> {
  await page
    .getByTestId('tyre-load-plot')
    .evaluate((plot) => plot.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

async function openLab(page: Page): Promise<void> {
  await page.goto(PAGE);
  // The island hydrates with client:visible; bring it into view and wait for React.
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
}

test.describe('laboratorio', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('dos gráficas apiladas, con rótulos en °C y en N, y sin barra de transporte', async ({
    page,
  }) => {
    const lab = page.locator(LAB);

    await expect(lab.locator('svg[role="img"]')).toHaveCount(2);
    await expect(lab.getByText('Temperatura T (°C)')).toHaveCount(1);
    await expect(lab.getByText('Carga vertical F_z (N)')).toHaveCount(1);
    await expect(lab.getByText('Fuerza lateral máx. F_y (N)')).toHaveCount(1);
    await expect(lab.getByRole('button', { name: 'Reproducir' })).toHaveCount(0);
    await expect(lab.getByRole('slider', { name: 'Línea de tiempo' })).toHaveCount(0);
    const temperatureBox = await page.getByTestId('tyre-temperature-plot').boundingBox();
    const loadBox = await page.getByTestId('tyre-load-plot').boundingBox();
    expect(loadBox?.y ?? 0).toBeGreaterThan((temperatureBox?.y ?? 0) + 100);
  });

  test('arrastrar el cursor de carga con el ratón cambia la fuerza lateral real', async ({
    page,
  }) => {
    await centreLoadPlot(page);
    const before = await readoutText(page, 'Fuerza lateral real F_y');
    const { x, y } = await knobCentre(page, LOAD_CURSOR);

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 4 });
    await page.mouse.move(x + 120, y, { steps: 4 });
    await page.mouse.up();

    await expect.poll(() => readoutText(page, 'Fuerza lateral real F_y')).not.toBe(before);
    const fz = Number(
      await page
        .locator(LAB)
        .getByRole('slider', { name: LOAD_CURSOR, exact: true })
        .getAttribute('aria-valuenow'),
    );
    expect(fz).toBeGreaterThan(4000);
  });

  test('el cursor de temperatura se mueve con las flechas y sigue al parámetro', async ({
    page,
  }) => {
    const cursor = page.locator(LAB).getByRole('slider', { name: TEMPERATURE_CURSOR, exact: true });
    const before = await readoutText(page, 'Coeficiente de agarre μ(T)');

    await cursor.focus();
    await page.keyboard.press('Shift+ArrowLeft');

    await expect(cursor).toBeFocused();
    await expect.poll(() => readoutText(page, 'Coeficiente de agarre μ(T)')).not.toBe(before);
    await setRange(page.getByRole('slider', { name: /^Temperatura de la banda/ }), '60');
    await expect(cursor).toHaveAttribute('aria-valuenow', '60');
    await expect.poll(() => readoutText(page, 'Coeficiente de agarre μ(T)')).toBe('1,11');
  });

  test('llevar la carga a 8 000 N muestra 11 943 N', async ({ page }) => {
    await setRange(page.getByRole('slider', { name: /^Carga sobre la llanta/ }), '8000');

    await expect
      .poll(async () => (await readoutText(page, 'Fuerza lateral real F_y')).replace(/\s/g, ' '))
      .toBe('11 943 N');
  });

  test('el engranaje abre el panel, el compuesto C4 cambia la ventana, Escape cierra y el foco vuelve', async ({
    page,
  }) => {
    const gear = page.locator(LAB).getByRole('button', { name: 'Ajustes del simulador' });
    const dialog = page.getByRole('dialog', { name: /^Ajustes: Laboratorio de la llanta/ });

    await gear.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox', { name: /^Compuesto/ }).selectOption('C4');
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(gear).toBeFocused();
    await expect(page.locator(LAB).getByText('Ventana de trabajo C4 (2019)')).toBeVisible();
    await expect(page.locator(LAB).getByText('Ventana de trabajo C3 (2019)')).toHaveCount(0);
  });

  test('con 1 decimal global los coeficientes muestran un decimal', async ({ page }) => {
    await page.locator(LAB).getByRole('button', { name: 'Ajustes del simulador' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Global' }).click();
    await dialog.getByText('1', { exact: true }).click();
    await page.keyboard.press('Escape');

    for (const label of ['Coeficiente de agarre μ(T)', 'Coeficiente efectivo μ']) {
      expect(await readoutText(page, label)).toMatch(/^\d+,\d$/);
    }
    expect(await readoutText(page, 'Fuerza lateral real F_y')).toMatch(/^\d[\d\s]*\sN$/);
  });

  test('el laboratorio ocupa el ancho de la columna de lectura', async ({ page }) => {
    const lab = await page.locator(LAB).boundingBox();
    const article = await page.locator('article').boundingBox();

    expect(lab).not.toBeNull();
    expect(article).not.toBeNull();
    expect(lab?.width ?? 0).toBeGreaterThanOrEqual(MIN_WIDTH_SHARE * (article?.width ?? Infinity));
  });
});

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('el paso 4 lleva el laboratorio con una sola insignia de visualización', async ({
    page,
  }) => {
    const step = page.locator('section.step#paso-4');
    // Content figures only: each lab plot's ChartFrame is a <figure> too.
    const figures = step.locator('figure[data-testid="figure"]');

    await expect(figures).toHaveCount(1);
    await expect(figures.nth(0)).toHaveAttribute('data-type', 'visualizacion');
    await expect(figures.nth(0).getByTestId('tyre-lab')).toBeAttached();
    await expect(step.getByText('Visualización de datos', { exact: true })).toHaveCount(1);
    await expect(figures.nth(0).getByTestId('lab-footnote')).toContainText('ilustrativ');
  });

  test('la página tiene cuatro pasos, cada uno con su "Por qué" y su figura', async ({ page }) => {
    const steps = page.locator('section.step');

    await expect(steps).toHaveCount(4);
    for (const step of await steps.all()) {
      await expect(step.locator('.why')).toHaveCount(1);
      expect(await step.locator('figure').count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('las gráficas B y A van en los pasos 2 y 3, con su fuente', async ({ page }) => {
    const load = page.locator('section.step#paso-2 figure');
    const temperature = page.locator('section.step#paso-3 figure');

    await expect(load.getByTestId('tyre-figure-carga')).toBeAttached();
    await expect(load.locator('.figure-source')).toContainText('Milliken');
    await expect(load.locator('.figure-source')).toContainText('ilustrativ');
    await expect(temperature.getByTestId('tyre-figure-temperatura')).toBeAttached();
    await expect(temperature.locator('.figure-source')).toContainText('Autosport');
    await expect(temperature.locator('.figure-source')).toContainText('ilustrativ');
  });

  test('la página cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(4);
    await expect(page.getByTestId('connections')).toBeVisible();
    await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toBeVisible();
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(4);
  });
});

test.describe('con pantalla táctil', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 } });

  test('arrastrar el cursor de carga con el dedo cambia la lectura sin desplazar la página', async ({
    page,
  }) => {
    await openLab(page);
    await centreLoadPlot(page);
    const before = await readoutText(page, 'Fuerza lateral real F_y');
    const { x, y } = await knobCentre(page, LOAD_CURSOR);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const cdp = await page.context().newCDPSession(page);

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (const step of [1, 2, 3, 4]) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + 15 * step, y: y + step }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect.poll(() => readoutText(page, 'Fuerza lateral real F_y')).not.toBe(before);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });
});
