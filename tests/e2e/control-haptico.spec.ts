import { expect, test, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';
import { stubYouTube, THUMBNAIL } from './youtubeStub';

const PAGE = './temas/control-haptico/';
const PLAYER = '[data-testid="haptic-video-player"]';
const WATCH = 'https://www.youtube.com/watch?v=CaPHUZapCTI';
const EMBED = /^https:\/\/www\.youtube-nocookie\.com\/embed\/CaPHUZapCTI\?/;
const STILL = 'https://i.ytimg.com/vi/CaPHUZapCTI/maxresdefault.jpg';
const MARKER_TIMES = ['2:18', '3:18', '4:02', '4:15'];
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

/** Brings the player into view and waits until its island hydrated (client:visible). */
async function openPlayer(page: Page): Promise<void> {
  await page.goto(PAGE);
  await page.locator(PLAYER).scrollIntoViewIfNeeded();
  await waitForIsland(page, PLAYER);
}

function playerFrame(page: Page) {
  return page.locator(PLAYER).locator('iframe');
}

async function startParam(page: Page): Promise<string | null> {
  const src = (await playerFrame(page).getAttribute('src')) ?? '';
  return new URL(src).searchParams.get('start');
}

test.describe('video', () => {
  let requested: string[] = [];

  test.beforeEach(async ({ page }) => {
    requested = await stubYouTube(page);
    await openPlayer(page);
  });

  test('sin pulsar nada, la fachada muestra la miniatura y solo esa imagen se pide a YouTube', async ({
    page,
  }) => {
    const player = page.locator(PLAYER);
    const still = player.getByTestId('haptic-video-facade').locator('img');

    await expect(player).toHaveAttribute('data-state', 'facade');
    await expect(player.getByRole('button', { name: /^Reproducir el video aquí/ })).toBeVisible();
    await expect(player.locator('iframe')).toHaveCount(0);
    await expect.poll(() => still.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1280);
    await expect(still).toHaveAttribute('src', STILL);
    await page.waitForLoadState('networkidle');
    expect(requested).toEqual([STILL]);
  });

  test('la fachada carga el reproductor de youtube-nocookie en 0 s, le pasa el foco y se conecta', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^Reproducir el video aquí/ }).click();

    await expect(playerFrame(page)).toHaveAttribute('src', EMBED);
    expect(await startParam(page)).toBe('0');
    await expect(playerFrame(page)).toHaveAttribute(
      'title',
      /^Video de YouTube: «A Game Developer/,
    );
    await expect(playerFrame(page)).toBeFocused();
    await expect(page.locator(PLAYER)).toHaveAttribute('data-state', 'connected');
  });

  test('con el reproductor conectado, una marca salta a su instante sin recargarlo', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /^Reproducir el video aquí/ }).click();
    await expect(page.locator(PLAYER)).toHaveAttribute('data-state', 'connected');
    const src = await playerFrame(page).getAttribute('src');
    const marker = page.getByTestId('haptic-video-markers').getByRole('button', { name: /^4:15/ });

    await marker.click();

    await expect(page.frameLocator(`${PLAYER} iframe`).locator('#time')).toHaveText('t = 255');
    await expect(marker).toHaveAttribute('aria-current', 'true');
    expect(await playerFrame(page).getAttribute('src')).toBe(src);
  });

  test('una marca pulsada sobre la fachada abre el reproductor en su instante', async ({
    page,
  }) => {
    const marker = page.getByTestId('haptic-video-markers').getByRole('button', { name: /^2:18/ });

    await marker.click();

    await expect(playerFrame(page)).toHaveAttribute('src', EMBED);
    expect(await startParam(page)).toBe('138');
    await expect(marker).toHaveAttribute('aria-current', 'true');
  });

  test('hay cuatro marcas de tiempo con su análisis escrito', async ({ page }) => {
    const markers = page.getByTestId('haptic-video-markers');

    await expect(markers.getByTestId('marker-label')).toHaveCount(MARKER_TIMES.length);
    for (const [index, time] of MARKER_TIMES.entries()) {
      await expect(markers.getByTestId('marker-label').nth(index)).toHaveText(
        new RegExp(`^${time} · `),
      );
    }
    for (const analysis of await markers.getByTestId('marker-analysis').all()) {
      await expect(analysis).toBeVisible();
    }
  });

  test('el recurso es multimedia y acredita el video en una línea, sin repetir la leyenda', async ({
    page,
  }) => {
    const figure = page.locator('figure[data-type="multimedia"]');

    await expect(figure).toHaveCount(1);
    await expect(figure.getByTestId('haptic-video-player')).toBeVisible();
    await expect(figure.locator('.figure-source a')).toHaveAttribute('href', WATCH);
    await expect(figure.getByTestId('haptic-video-credit')).toHaveText(
      'Video: PlayStation Access, 5 de agosto de 2021. Ver en YouTube',
    );
    await expect(page.locator('main')).not.toContainText(/terceros|autoría/);
    await expect(figure.locator('details')).toHaveCount(0);
  });
});

test.describe('video sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('la fachada y cada marca son enlaces a YouTube, y el análisis se lee igual', async ({
    page,
  }) => {
    const requested = await stubYouTube(page);
    await page.goto(PAGE);
    const player = page.locator(PLAYER);

    await expect(player.getByTestId('haptic-video-facade')).toHaveAttribute('href', WATCH);
    const labels = player.getByTestId('marker-label');
    await expect(labels).toHaveCount(MARKER_TIMES.length);
    await expect(labels.nth(3)).toHaveAttribute('href', `${WATCH}&t=255s`);
    await expect(player.getByTestId('marker-analysis').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(requested.every((url) => THUMBNAIL.test(url))).toBe(true);
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

  test('los preajustes cambian el perfil y «Repetir retorno» repite la última liberación', async ({
    page,
  }) => {
    const lab = page.locator(LAB);
    const presets = lab.getByRole('group', { name: 'Valores de referencia' });
    const replay = lab.getByRole('button', { name: 'Repetir retorno' });
    await expect(replay).toBeDisabled();

    await presets.getByRole('button', { name: /^Resorte tardío/ }).click();
    await pressToBottomWithKeys(page);
    await expect.poll(() => readoutText(page, 'Fuerza del gatillo F')).toBe('2,00 N');
    await lab.getByRole('button', { name: 'Soltar el gatillo' }).click();
    await expect
      .poll(() => readoutText(page, 'Desplazamiento x'), { timeout: RELEASE_BOUND_MS * 2 })
      .toBe(AT_REST);

    await expect(replay).toBeEnabled();
    await replay.click();
    await expect
      .poll(() => readoutText(page, 'Desplazamiento x'), { timeout: RELEASE_BOUND_MS * 2 })
      .toBe(AT_REST);
    await expect(replay).toBeEnabled();
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
    // Only the prescribed video carries a type badge; the lab shows none of its own.
    await expect(figures.nth(1).getByText('Simulación interactiva', { exact: true })).toHaveCount(
      0,
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
