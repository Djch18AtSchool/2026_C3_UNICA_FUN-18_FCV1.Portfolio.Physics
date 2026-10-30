import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { setRange, waitForIsland } from './helpers';

const PAGE = './temas/ruedas-reaccion/';
const TITLE = 'Ruedas de reacción: cómo un satélite se gira sin empujarse contra nada';
const LAB = '[data-testid="wheel-lab"]';
const STEPS = 4;
const TABLE_IDS = [
  'ruedas-reaccion-ruedas',
  'ruedas-reaccion-maniobra',
  'ruedas-reaccion-misiones',
];
const DIAGRAM_TEXTS = ['(8.1)', '(8.2)', '(8.3)', '(8.4)', '485 vueltas', 'la nave deriva'];
const PHONE = { width: 360, height: 800 };
const THEMES = ['light', 'dark'] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
/** The table frame scrolls on its own once its content is wider than the frame (1 px of rounding). */
const OVERFLOW_TOLERANCE_PX = 1;
/** Timeline position (of 1000) to start from: the 60 s turn then ends within half a second. */
const NEAR_END = '995';
const PLAYBACK_TIMEOUT_MS = 3000;
const STILL_AT_END_MS = 500;
const SCROLL_STEP_PX = 600;

/** The value text of a LabShell readout row. */
async function readoutText(page: Page, label: string): Promise<string> {
  const row = page.locator(LAB).locator('div', { has: page.getByText(label, { exact: true }) });
  return ((await row.last().locator('span').last().textContent()) ?? '').trim();
}

async function openLab(page: Page): Promise<void> {
  await page.goto(PAGE);
  // The island hydrates with client:visible; bring it into view and wait for React.
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
}

/** Islands hydrate with client:visible: walk the page so every one renders before a scan. */
async function hydrateAllIslands(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += SCROLL_STEP_PX) {
    await page.mouse.wheel(0, SCROLL_STEP_PX);
  }
  await page.waitForLoadState('networkidle');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('lleva el título de la consigna y cuatro pasos', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
    await expect(page.locator('section.step')).toHaveCount(STEPS);
    for (let n = 1; n <= STEPS; n++) {
      await expect(
        page.getByRole('heading', { level: 2, name: new RegExp(`^Paso ${n} · `) }),
      ).toBeVisible();
    }
  });

  test('cada paso tiene su "Por qué", su ecuación y al menos una figura', async ({ page }) => {
    for (const step of await page.locator('section.step').all()) {
      await expect(step.locator('.why')).toHaveCount(1);
      await expect(step.locator('.equation')).toHaveCount(1);
      expect(await step.locator('figure[data-testid="figure"]').count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('solo el diagrama de la rueda lleva insignia, la de "Diagrama"', async ({ page }) => {
    const badges = page.locator('figure[data-testid="figure"] .figure-head');

    await expect(badges).toHaveCount(1);
    await expect(badges.getByText('Diagrama', { exact: true })).toHaveCount(1);
    // `has` is relative to each figure: the one figure whose head shows a badge.
    const badged = page.locator('figure[data-testid="figure"]', {
      has: page.locator('.figure-head'),
    });
    await expect(badged).toHaveAttribute('data-type', 'diagrama');
    await expect(badged.getByTestId('wheel-diagram')).toBeAttached();
  });

  test('el diagrama anota las ecuaciones (8.1) a (8.4), las 485 vueltas y la deriva', async ({
    page,
  }) => {
    const diagram = page.getByTestId('wheel-diagram');

    await expect(diagram).toBeVisible();
    for (const text of DIAGRAM_TEXTS) {
      await expect(diagram.locator('text', { hasText: text }).first()).toBeAttached();
    }
  });

  test('en el detalle M, el rótulo «rueda» queda debajo del título, sin tocarlo', async ({
    page,
  }) => {
    const diagram = page.getByTestId('wheel-diagram');
    const box = async (label: string) =>
      (await diagram.locator(`text[data-label="${label}"]`).boundingBox())!;

    const title = await box('detalle-titulo');
    const wheel = await box('detalle-rueda');

    expect(wheel.y).toBeGreaterThan(title.y + title.height);
  });

  test('el paso 4 pone el diagrama antes del laboratorio', async ({ page }) => {
    const figures = page.locator('section.step#paso-4 figure[data-testid="figure"]');

    await expect(figures).toHaveCount(2);
    await expect(figures.nth(0).getByTestId('wheel-diagram')).toBeAttached();
    await expect(figures.nth(1)).toHaveAttribute('data-type', 'simulacion');
    await expect(figures.nth(1).getByTestId('wheel-lab')).toBeAttached();
    await expect(figures.nth(1).getByTestId('lab-footnote')).toContainText('tiempo real');
  });

  test('las tres tablas se numeran Tabla 8.1 a 8.3, en orden', async ({ page }) => {
    const tables = page.getByTestId('data-table');

    await expect(tables).toHaveCount(TABLE_IDS.length);
    // getComputedStyle does not resolve counters: check the prefix, the topic and each position.
    const labels = await tables.evaluateAll((figures) =>
      figures.map((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        const prefix = getComputedStyle(
          figure.querySelector('figcaption') as Element,
          '::before',
        ).content;
        const position = [...(body?.querySelectorAll('.content-table') ?? [])].indexOf(figure) + 1;
        return { id: figure.id, prefix, label: `Tabla ${body?.dataset.topicNumber}.${position}` };
      }),
    );

    expect(labels.map(({ id }) => id)).toEqual(TABLE_IDS);
    expect(labels.map(({ label }) => label)).toEqual(['Tabla 8.1', 'Tabla 8.2', 'Tabla 8.3']);
    for (const { prefix } of labels) {
      expect(prefix).toBe('"Tabla " counter(topic) "." counter(table) " · "');
    }
  });

  test('la página cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(
      page.getByTestId('callout').and(page.locator('[data-variant="clase"]')),
    ).toHaveCount(1);
    await expect(page.getByTestId('connections')).toBeVisible();
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(10);
  });
});

test.describe('laboratorio', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('la perilla del ángulo objetivo, con el teclado, cambia la ω_w máxima', async ({ page }) => {
    const knob = page.locator(LAB).getByRole('slider', { name: 'Dial del ángulo objetivo' });
    await expect(knob).toHaveAttribute('aria-valuetext', /90/);
    const before = await readoutText(page, 'ω_w máxima de la maniobra');

    await knob.focus();
    await page.keyboard.press('Shift+ArrowDown');

    await expect(knob).toHaveAttribute('aria-valuetext', /80/);
    await expect(knob).toBeFocused();
    await expect.poll(() => readoutText(page, 'ω_w máxima de la maniobra')).not.toBe(before);
  });

  test('reproducir termina el giro, vuelve a "Reproducir" y no repite', async ({ page }) => {
    const lab = page.locator(LAB);
    const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });
    await setRange(timeline, NEAR_END);

    await lab.getByRole('button', { name: 'Reproducir' }).click();
    await expect(timeline).toHaveValue('1000', { timeout: PLAYBACK_TIMEOUT_MS });

    await expect(lab).toHaveAttribute('data-playing', 'false');
    await expect(lab.getByRole('button', { name: 'Reproducir' })).toBeVisible();
    await page.waitForTimeout(STILL_AT_END_MS);
    await expect(timeline).toHaveValue('1000');
    await expect(lab).toHaveAttribute('data-playing', 'false');
  });
});

test.describe('a 360 px', () => {
  test.use({ viewport: PHONE });

  test('la página no desborda y cada tabla se desplaza dentro de su marco', async ({ page }) => {
    await page.goto(PAGE);
    await hydrateAllIslands(page);
    await page.evaluate(() => document.fonts.ready);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      PHONE.width,
    );
    for (const frame of await page.locator('[data-testid="data-table"] .table-frame').all()) {
      const { overflows, overflowX } = await frame.evaluate(
        (element, tolerance) => ({
          overflows: element.scrollWidth - element.clientWidth > tolerance,
          overflowX: getComputedStyle(element).overflowX,
        }),
        OVERFLOW_TOLERANCE_PX,
      );
      expect(overflowX).toBe('auto');
      if (overflows) await expect(frame).toHaveAttribute('role', 'region');
    }
  });
});

for (const theme of THEMES) {
  test(`axe no encuentra violaciones serias ni críticas en el tema ${theme === 'light' ? 'claro' : 'oscuro'}`, async ({
    page,
  }) => {
    await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
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
}
