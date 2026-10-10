import { expect, test, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';

const PAGE = './temas/control-haptico/';
const VIDEO_URL = './media/tema-05-dualsense.mp4';
const HTTP_NOT_FOUND = 404;
const HTTP_OK = 200;
const LAB = '[data-testid="trigger-lab"]';
const LEVER = 'Recorrido del gatillo x';
/** The lab must fill the reading column (spec §6): at least this share of the article width. */
const MIN_WIDTH_SHARE = 0.9;
/** A released trigger is back at rest within this time (the release is bounded to 3 s). */
const RELEASE_BOUND_MS = 3000;
const AT_REST = '0,0 mm';

/** The value text of a LabShell readout row, with plain spaces. */
async function readoutText(page: Page, label: string): Promise<string> {
  const row = page.locator(LAB).locator('div', { has: page.getByText(label, { exact: true }) });
  return ((await row.last().locator('span').last().textContent()) ?? '').trim().replace(/\s/g, ' ');
}

/** Centre of the lever's knob, in page coordinates. */
async function knobCentre(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId('trigger-handle').locator('[data-knob]').boundingBox();
  expect(box).not.toBeNull();
  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
}

/** Scrolls the lever to the middle of the viewport, clear of the sticky topic bar. */
async function centreLever(page: Page): Promise<void> {
  await page
    .getByTestId('trigger-lever')
    .evaluate((scene) => scene.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

async function openLab(page: Page): Promise<void> {
  await page.goto(PAGE);
  // The island hydrates with client:visible; bring it into view and wait for React.
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
}

async function pressToBottomWithKeys(page: Page): Promise<void> {
  await page.locator(LAB).getByRole('slider', { name: LEVER, exact: true }).focus();
  await page.keyboard.press('End');
}

test.describe('video', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('el video se reproduce o, si aún no está publicado, muestra el respaldo', async ({
    page,
    request,
  }) => {
    const response = await request.get(VIDEO_URL);
    const player = page.getByTestId('haptic-video-player');

    if (response.status() === HTTP_NOT_FOUND) {
      await expect(page.locator('[data-state="error"]')).toBeVisible();
      const fallback = page.getByTestId('haptic-video-fallback');
      await expect(fallback).toBeVisible();
      await expect(fallback.getByTestId('haptic-video-transcript')).toBeVisible();
      // No link to the URL that just failed, and nothing to seek.
      await expect(player.getByRole('link', { name: /Descargar el video/ })).toHaveCount(0);
      await expect(page.getByTestId('haptic-video-markers').getByRole('button')).toHaveCount(0);
    } else {
      expect(response.status()).toBe(HTTP_OK);
      await expect(player).toHaveAttribute('data-state', 'ok');
      await expect(player.getByTestId('haptic-video')).toHaveAttribute('controls', '');
      await expect(page.getByTestId('haptic-video-fallback')).toHaveCount(0);
      await expect(player.getByRole('link', { name: 'Descargar el video (MP4)' })).toBeVisible();
      await expect(page.getByTestId('haptic-video-markers').getByRole('button')).toHaveCount(3);
    }
  });

  test('hay tres marcas de tiempo con su análisis escrito', async ({ page }) => {
    const markers = page.getByTestId('haptic-video-markers');

    await expect(markers.getByTestId('marker-label')).toHaveCount(3);
    await expect(markers.getByTestId('marker-label').nth(0)).toHaveText(/^0:05 · /);
    await expect(markers.getByTestId('marker-analysis')).toHaveCount(3);
    for (const analysis of await markers.getByTestId('marker-analysis').all()) {
      await expect(analysis).toBeVisible();
    }
  });

  test('el recurso es multimedia con fuente', async ({ page }) => {
    const figure = page.locator('figure[data-type="multimedia"]');

    await expect(figure).toHaveCount(1);
    await expect(figure.getByTestId('haptic-video-player')).toBeVisible();
    await expect(figure.locator('.figure-source')).toContainText('Astro');
  });
});

test.describe('laboratorio', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('grafica F–x con Hooke y el perfil del gatillo, sin barra de transporte', async ({
    page,
  }) => {
    const lab = page.locator(LAB);

    await expect(lab.locator('svg[role="img"]')).toHaveCount(1);
    await expect(lab.getByText('Desplazamiento x (mm)')).toHaveCount(1);
    await expect(lab.getByText('Fuerza F (N)')).toHaveCount(1);
    await expect(lab.getByText('Resorte ideal, F = k x', { exact: true })).toBeVisible();
    await expect(
      lab.getByText('Perfil del gatillo, ecuación (5.4)', { exact: true }),
    ).toBeVisible();
    await expect(lab.getByRole('button', { name: 'Reproducir' })).toHaveCount(0);
    await expect(lab.getByRole('slider', { name: 'Línea de tiempo' })).toHaveCount(0);
    await expect(lab.getByText(/energía elástica del resorte ideal/)).toBeVisible();
  });

  test('arrastrar la palanca con el ratón cambia las lecturas y al soltarla vuelve a 0,0 mm', async ({
    page,
  }) => {
    await centreLever(page);
    const { x, y } = await knobCentre(page);

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 40, { steps: 4 });
    await page.mouse.move(x, y + 80, { steps: 4 });

    await expect.poll(() => readoutText(page, 'Desplazamiento x')).not.toBe(AT_REST);
    await expect.poll(() => readoutText(page, 'Fuerza del gatillo F')).not.toBe('0,00 N');
    await page.mouse.up();
    await expect
      .poll(() => readoutText(page, 'Desplazamiento x'), { timeout: RELEASE_BOUND_MS })
      .toBe(AT_REST);
    await expect(
      page.locator(LAB).getByRole('button', { name: 'Soltar el gatillo' }),
    ).toBeDisabled();
  });

  test('con el teclado el gatillo llega a 8 mm y 3,20 N, se queda y "Soltar" lo devuelve', async ({
    page,
  }) => {
    await pressToBottomWithKeys(page);

    await expect.poll(() => readoutText(page, 'Desplazamiento x')).toBe('8,0 mm');
    expect(await readoutText(page, 'Fuerza del gatillo F')).toBe('3,20 N');
    expect(await readoutText(page, 'Energía elástica U, resorte ideal')).toBe('12,80 mJ');
    await page.keyboard.press('Shift+ArrowLeft');
    await expect.poll(() => readoutText(page, 'Desplazamiento x')).toBe('7,0 mm');

    await page.locator(LAB).getByRole('button', { name: 'Soltar el gatillo' }).click();
    await expect
      .poll(() => readoutText(page, 'Desplazamiento x'), { timeout: RELEASE_BOUND_MS })
      .toBe(AT_REST);
  });

  test('el engranaje abre el panel, la amortiguación cambia, Escape cierra y el foco vuelve', async ({
    page,
  }) => {
    const gear = page.locator(LAB).getByRole('button', { name: 'Ajustes del simulador' });
    const dialog = page.getByRole('dialog', { name: /^Ajustes: Laboratorio del gatillo/ });

    await gear.click();
    await expect(dialog).toBeVisible();
    const damping = dialog.getByRole('combobox', { name: /^Amortiguación/ });
    await damping.selectOption('subamortiguada');
    await expect(damping).toHaveValue('subamortiguada');
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(gear).toBeFocused();
    await pressToBottomWithKeys(page);
    await page.locator(LAB).getByRole('button', { name: 'Soltar el gatillo' }).click();
    await expect
      .poll(() => readoutText(page, 'Desplazamiento x'), { timeout: RELEASE_BOUND_MS })
      .toBe(AT_REST);
  });

  test('con 1 decimal global la fuerza y la energía muestran un decimal', async ({ page }) => {
    await page.locator(LAB).getByRole('button', { name: 'Ajustes del simulador' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Global' }).click();
    await dialog.getByText('1', { exact: true }).click();
    await page.keyboard.press('Escape');
    await pressToBottomWithKeys(page);

    await expect.poll(() => readoutText(page, 'Fuerza del gatillo F')).toBe('3,2 N');
    expect(await readoutText(page, 'Energía elástica U, resorte ideal')).toBe('12,8 mJ');
    expect(await readoutText(page, 'Trabajo del dedo W')).toBe('12,8 mJ');
  });

  test('el laboratorio ocupa el ancho de la columna de lectura', async ({ page }) => {
    const lab = await page.locator(LAB).boundingBox();
    const article = await page.locator('article').boundingBox();

    expect(lab).not.toBeNull();
    expect(article).not.toBeNull();
    expect(lab?.width ?? 0).toBeGreaterThanOrEqual(MIN_WIDTH_SHARE * (article?.width ?? Infinity));
  });
});

test.describe('con movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('soltar el gatillo lo lleva a 0,0 mm sin animación', async ({ page }) => {
    await openLab(page);
    await pressToBottomWithKeys(page);
    await expect.poll(() => readoutText(page, 'Desplazamiento x')).toBe('8,0 mm');

    await page.locator(LAB).getByRole('button', { name: 'Soltar el gatillo' }).click();

    expect(await readoutText(page, 'Desplazamiento x')).toBe(AT_REST);
  });
});

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('el paso 4 lleva el video antes del laboratorio, con una sola insignia multimedia', async ({
    page,
  }) => {
    const step = page.locator('section.step#paso-4');
    // Content figures only: the lab plot's ChartFrame is a <figure> too.
    const figures = step.locator('figure[data-testid="figure"]');

    await expect(figures).toHaveCount(2);
    await expect(figures.nth(0)).toHaveAttribute('data-type', 'multimedia');
    await expect(figures.nth(0).getByTestId('haptic-video-player')).toBeAttached();
    await expect(figures.nth(1)).toHaveAttribute('data-type', 'simulacion');
    await expect(figures.nth(1).getByTestId('trigger-lab')).toBeAttached();
    await expect(step.getByText('Multimedia con análisis', { exact: true })).toHaveCount(1);
    await expect(figures.nth(1).getByText('Simulación interactiva', { exact: true })).toHaveCount(
      1,
    );
    await expect(figures.nth(1).getByTestId('lab-footnote')).toContainText('ilustrativ');
    await expect(figures.nth(1).locator('.figure-source')).toContainText('supuesto de 8 mm');
  });

  test('la página tiene cuatro pasos, cada uno con su "Por qué" y su figura', async ({ page }) => {
    const steps = page.locator('section.step');

    await expect(steps).toHaveCount(4);
    for (const step of await steps.all()) {
      await expect(step.locator('.why')).toHaveCount(1);
      expect(await step.locator('figure').count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('los pasos 1 a 3 llevan la vibración, el resorte y el par de tercera ley', async ({
    page,
  }) => {
    await expect(
      page.locator('section.step#paso-1').getByTestId('haptic-figure-vibracion'),
    ).toBeAttached();
    const hooke = page.locator('section.step#paso-2 figure[data-testid="figure"]');
    await expect(hooke.getByTestId('haptic-figure-hooke')).toBeAttached();
    await expect(hooke.locator('.figure-source')).toContainText('Serway');
    const thirdLaw = page.locator('section.step#paso-3 figure[data-testid="figure"]');
    await expect(thirdLaw).toHaveAttribute('data-type', 'diagrama');
    await expect(thirdLaw.getByTestId('third-law-diagram')).toBeVisible();
  });

  test('la página cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(5);
    await expect(page.getByTestId('connections')).toBeVisible();
    await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toBeVisible();
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(4);
  });
});

test.describe('con pantalla táctil', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 } });

  test('arrastrar la palanca con el dedo cambia la lectura sin desplazar la página', async ({
    page,
  }) => {
    await openLab(page);
    await centreLever(page);
    const { x, y } = await knobCentre(page);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const cdp = await page.context().newCDPSession(page);

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (const step of [1, 2, 3, 4]) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + step, y: y + 15 * step }],
      });
    }

    await expect.poll(() => readoutText(page, 'Desplazamiento x')).not.toBe(AT_REST);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect
      .poll(() => readoutText(page, 'Desplazamiento x'), { timeout: RELEASE_BOUND_MS })
      .toBe(AT_REST);
  });
});
