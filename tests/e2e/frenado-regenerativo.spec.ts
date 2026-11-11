import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  hydrateAllIslands,
  readoutText as readReadout,
  seekTimeline,
  setRange,
  waitForIsland,
} from './helpers';

const PAGE = './temas/frenado-regenerativo/';
const TITLE = 'Frenado regenerativo en un vehículo eléctrico';
const LAB = '[data-testid="regen-lab"]';
const CHART = '[data-testid="energy-balance-chart"]';
const PHONE = { width: 360, height: 800 };
const THEMES = ['light', 'dark'] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
const STEP_COUNT = 4;
const TABLE_IDS = ['frenado-regenerativo-vehiculo', 'frenado-regenerativo-ciclos'] as const;
/** Timeline position (of 1000) to start from, so the run ends within a second at 1×. */
const NEAR_END = '995';
/** Longest the last 0,5 % of a run (0,13 s of the stretch, ≈ 0,34 s of the UDDS) may take. */
const PLAYBACK_TIMEOUT_MS = 3000;
/** The stretch «Tramo» plays (figure 6.3's braking), the UDDS's length and its stops. */
const STRETCH = { start: 376, end: 402 };
const UDDS_S = 1369;
const UDDS_STOPS = 17;
/** Half a pixel of rounding either way when comparing drawn positions. */
const PX_SLACK = 1;
const VIEW_CYCLE = 'Ciclo completo';
const STILL_AT_END_MS = 500;
const BATTERY = 'Energía a la batería $E_\\text{batería}$';
const BLENDED = 'Frenando con el motor y con fricción';

/** The value text of the readout row of the lab labelled exactly `label` (helpers.ts). */
const readoutText = (page: Page, label: string) => readReadout(page, LAB, label);

async function openLab(page: Page): Promise<void> {
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
}

const timelineOf = (lab: Locator) =>
  lab.getByRole('slider', { name: 'Línea de tiempo', exact: true });
const badgeOf = (lab: Locator) => lab.locator('[data-lab-canvas] [data-time-scale-badge]');
const marksOf = (lab: Locator) => lab.locator('[data-transport-marks] [data-transport-mark]');

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('lleva el título del tema', async ({ page }) => {
    await expect(page).toHaveTitle(new RegExp(`^Tema 6: ${TITLE}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
  });

  test('tiene cuatro pasos, cada uno con su "Por qué" y su figura', async ({ page }) => {
    const steps = page.locator('section.step');

    await expect(steps).toHaveCount(STEP_COUNT);
    for (let n = 1; n <= STEP_COUNT; n += 1) {
      const step = page.locator(`section.step#paso-${n}`);
      await expect(step).toContainText(`Paso ${n}`);
      await expect(step.locator('.why')).toHaveCount(1);
      expect(await step.locator('figure').count()).toBeGreaterThanOrEqual(1);
    }
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(STEP_COUNT);
  });

  test('solo la gráfica de energías lleva insignia, "Visualización de datos", con EPA y FASTSim en su fuente', async ({
    page,
  }) => {
    const badged = page.locator('figure[data-testid="figure"]:has(.figure-head)');

    await expect(badged).toHaveCount(1);
    await expect(badged).toHaveAttribute('data-type', 'visualizacion');
    await expect(badged.locator(CHART)).toBeAttached();
    await expect(badged.locator('.figure-head')).toHaveText('Visualización de datos');
    const source = badged.locator('.figure-source');
    await expect(source).toContainText('EPA');
    await expect(source).toContainText('FASTSim');
  });

  test('la gráfica de energías termina el UDDS con el 40,4 % de la tracción en la batería', async ({
    page,
  }) => {
    const chart = page.locator(CHART);
    await chart.scrollIntoViewIfNeeded();
    await waitForIsland(page, CHART);

    await expect(chart.getByTestId('energy-balance-readout')).toContainText('40,4');
  });

  test('las dos tablas se numeran 6.1 y 6.2, en orden', async ({ page }) => {
    const tables = page.getByTestId('data-table');

    await expect(tables).toHaveCount(TABLE_IDS.length);
    for (const [index, id] of TABLE_IDS.entries()) {
      const table = tables.nth(index);
      await expect(table).toHaveAttribute('id', id);
      // getComputedStyle does not resolve counters: check the topic number and the position.
      const label = await table.evaluate((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        const position = [...(body?.querySelectorAll('.content-table') ?? [])].indexOf(figure) + 1;
        return `Tabla ${body?.dataset.topicNumber}.${position}`;
      });
      expect(label).toBe(`Tabla 6.${index + 1}`);
    }
  });

  test('cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toHaveCount(1);
    await expect(page.getByTestId('connections')).toBeVisible();
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(7);
  });
});

test.describe('laboratorio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await openLab(page);
  });

  for (const [view, end] of [
    ['Tramo', /^t = 26,00\s?s$/u],
    // The UDDS lasts 1369 s; the thousands are grouped with a narrow no-break space.
    [VIEW_CYCLE, /^t = 1\s?369\s?s$/u],
  ] as const) {
    test(`en «${view}» la reproducción termina, vuelve a "Reproducir" y no repite`, async ({
      page,
    }) => {
      const lab = page.locator(LAB);
      if (view === VIEW_CYCLE) await lab.getByText(VIEW_CYCLE, { exact: true }).click();
      // Exact: the energy plot's cursor is "Tiempo", the transport's slider "Línea de tiempo".
      const timeline = timelineOf(lab);
      await seekTimeline(timeline, NEAR_END);

      await lab.getByRole('button', { name: 'Reproducir', exact: true }).click();
      await expect(timeline).toHaveValue('1000', { timeout: PLAYBACK_TIMEOUT_MS });

      await expect(lab).toHaveAttribute('data-playing', 'false');
      await expect(lab.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible();
      await expect(timeline).toHaveAttribute('aria-valuetext', end);
      await page.waitForTimeout(STILL_AT_END_MS);
      await expect(timeline).toHaveValue('1000');
      await expect(lab).toHaveAttribute('data-playing', 'false');
    });
  }

  test('abre en «Tramo» a velocidad real: «×1» sobre el dibujo y la detención del tramo en la línea', async ({
    page,
  }) => {
    const lab = page.locator(LAB);

    await expect(lab.getByRole('radio', { name: 'Tramo: una frenada' })).toBeChecked();
    await expect(badgeOf(lab)).toHaveText(/^×1\s*velocidad real$/u);
    await expect(lab.locator('[data-time-scale-words]')).toHaveText(
      'Escala de tiempo: velocidad real',
    );
    await expect(marksOf(lab)).toHaveCount(1);
    await expect(timelineOf(lab)).toHaveAttribute('aria-valuetext', /^t = 0,00\s?s$/u);
  });

  test('«Evento siguiente» y «anterior», con el teclado, en las dos vistas', async ({ page }) => {
    const lab = page.locator(LAB);
    const next = lab.getByRole('button', { name: 'Evento siguiente' });
    const previous = lab.getByRole('button', { name: 'Evento anterior' });

    await next.focus();
    await page.keyboard.press('Enter');
    await expect(timelineOf(lab)).toHaveAttribute(
      'aria-valuetext',
      /^t = 21,00\s?s · Detención 3 de 17$/u,
    );
    await expect(lab.getByRole('status').filter({ hasText: 'Detención' })).toHaveText(
      /^Detención 3 de 17 · t = 21,00\s?s$/u,
    );
    await expect(next).toHaveAttribute('aria-disabled', 'true');
    await expect(next).toBeFocused();

    // The view by keyboard: its radios take the arrows, and the instant (397 s) is kept.
    await lab.getByRole('radio', { name: 'Tramo: una frenada' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(lab.getByRole('radio', { name: VIEW_CYCLE })).toBeChecked();
    await expect(badgeOf(lab)).toHaveText(/^×20\s*cámara rápida$/u);
    await expect(marksOf(lab)).toHaveCount(UDDS_STOPS);
    await expect(timelineOf(lab)).toHaveAttribute(
      'aria-valuetext',
      /^t = 397\s?s · Detención 3 de 17$/u,
    );

    await next.focus();
    await page.keyboard.press('Enter');
    await expect(timelineOf(lab)).toHaveAttribute('aria-valuetext', /Detención 4 de 17$/u);
    await page.keyboard.press('Shift+Tab');
    await expect(previous).toBeFocused();
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await expect(timelineOf(lab)).toHaveAttribute(
      'aria-valuetext',
      /^t = 333\s?s · Detención 2 de 17$/u,
    );
  });

  test('el minimapa sitúa el tramo en el ciclo y marca las 17 detenciones', async ({ page }) => {
    const lab = page.locator(LAB);
    const minimap = lab.getByTestId('regen-minimap');
    const svg = minimap.locator('svg');
    const band = minimap.locator('[data-stretch]');

    await expect(minimap.locator('[data-stop]')).toHaveCount(UDDS_STOPS);
    const box = (await svg.boundingBox())!;
    const bandBox = (await band.boundingBox())!;
    const xOf = (t: number) => box.x + 1 + (t / UDDS_S) * (box.width - 2);
    expect(
      Math.abs(bandBox.x + bandBox.width / 2 - (xOf(STRETCH.start) + xOf(STRETCH.end)) / 2),
    ).toBeLessThanOrEqual(PX_SLACK);
    await expect(svg).toHaveAttribute('aria-label', /el tramo va de 376 a 402\s?s\.$/u);

    await lab.getByText(VIEW_CYCLE, { exact: true }).click();
    await expect(band).toHaveCount(0);
    await expect(minimap.locator('[data-playhead]')).toHaveCount(1);
  });

  test('sin JavaScript ya se ven la escala y el minimapa, con su alto final', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(PAGE);
    const lab = page.locator(LAB);

    await expect(badgeOf(lab)).toHaveText(/^×1\s*velocidad real$/u);
    const svg = lab.getByTestId('regen-minimap').locator('svg');
    expect((await svg.boundingBox())?.height).toBe(48);
    await context.close();
  });

  test('cambiar η cambia la energía que llega a la batería', async ({ page }) => {
    const before = await readoutText(page, BATTERY);

    await setRange(page.locator(LAB).getByRole('slider', { name: /^Rendimiento rueda/ }), '0.5');

    await expect.poll(() => readoutText(page, BATTERY)).not.toBe(before);
  });

  test('«Cómo se usa» dice a qué velocidad va la reproducción y «Qué deja fuera el modelo» lo que el modelo omite', async ({
    page,
  }) => {
    const usage = page.locator(LAB).locator('details[data-lab-note="usage"]');
    const leftOut = page.locator(LAB).locator('details[data-lab-note="left-out"]');

    await usage.locator('summary').click();
    await expect(usage).toContainText('En «Tramo» la reproducción va a velocidad real');
    await expect(usage).toContainText('La escala la dice la insignia sobre el dibujo.');
    await expect(usage).not.toContainText('veces más rápida');
    await leftOut.locator('summary').click();
    for (const left of ['Pendiente', 'viento', 'temperatura', 'carga', 'Boretti']) {
      await expect(leftOut).toContainText(left);
    }
  });
});

test.describe('a 360 px', () => {
  test.use({ viewport: PHONE });

  test('la página no desborda en horizontal, tampoco con el laboratorio en régimen mixto', async ({
    page,
  }) => {
    await page.goto(PAGE);
    await page.evaluate(() => document.fonts.ready);
    await hydrateAllIslands(page);
    await openLab(page);
    const lab = page.locator(LAB);

    await lab
      .getByRole('combobox', { name: 'Valores de referencia' })
      .selectOption({ label: 'Batería fría o llena (Pmáx 10 kW)' });
    // 389 s of the UDDS, mid-braking at 23 kW, over the 10 kW cap.
    await seekTimeline(timelineOf(lab), '500');

    const regime = lab.getByTestId('regen-scene').getByText(BLENDED, { exact: true });
    await expect(regime).toBeVisible();
    const box = await regime.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.x ?? 0) + (box?.width ?? Infinity)).toBeLessThanOrEqual(PHONE.width);
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(PHONE.width);
  });
});

for (const theme of THEMES) {
  test.describe(`tema ${theme === 'light' ? 'claro' : 'oscuro'}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
    });

    test('axe no encuentra violaciones serias ni críticas', async ({ page }) => {
      await page.goto(PAGE);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await hydrateAllIslands(page);

      const { violations } = await new AxeBuilder({ page }).analyze();
      const blocking = violations
        .filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? ''))
        .map(({ id, impact, nodes }) => ({
          id,
          impact,
          targets: nodes.map((node) => node.target.join(' ')),
        }));

      expect(blocking).toEqual([]);
    });
  });
}
