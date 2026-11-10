import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { hydrateAllIslands, readoutText as readReadout, setRange, waitForIsland } from './helpers';

const PAGE = './temas/coeficiente-restitucion/';
const TITLE =
  'El coeficiente de restitución en un motor de videojuego: por qué la pelota rebota mal';
const LAB = '[data-testid="bounce-lab"]';
const PHONE = { width: 360, height: 800 };
const THEMES = ['light', 'dark'] as const;
const VIEWPORTS = [
  { name: 'escritorio', size: { width: 1280, height: 800 } },
  { name: 'móvil', size: PHONE },
] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
/** The lab must fill the reading column (spec §6): at least this share of the article width. */
const MIN_WIDTH_SHARE = 0.9;
/** Timeline position (of 1000) to start from, so the drop ends within a moment. */
const NEAR_END = '995';
/** Longest the last 0,5 % of playback may take to reach the end. */
const PLAYBACK_TIMEOUT_MS = 3000;
const STILL_AT_END_MS = 500;
/** The FIBA preset's e, the centre of 0,758–0,776. */
const FIBA_E = 0.767;

const E_SLIDER = 'Coeficiente de restitución e';
/** The readout labels as written (their formulas, $\sqrt{h_1/h_0}$ and $h_1$, are KaTeX). */
const MEASURED_E = String.raw`e medido $\sqrt{h_1/h_0}$ (motor)`;
const FIRST_REBOUND = String.raw`Primer rebote $h_1$ (motor)`;
/** The ITF drop the lab opens on (h_0 = 2,54 m). */
const ITF_DROP_M = 2.54;
/** The engine (Δt = 1/240 s) measures e = √(h_1/h_0) within a couple of hundredths of the ideal. */
const MEASURED_TOLERANCE = 0.02;
const REBOUND_TOLERANCE_M = 0.03;

/** Spanish-formatted number ("0,743", "1,41 m") → 0.743. */
function parseSpanish(text: string): number {
  return Number(
    text
      .replace(/\u2212/g, '-')
      .replace(/[^\d,-]/g, '')
      .replace(',', '.'),
  );
}

/** The value text of the readout row of the lab labelled exactly `label` (helpers.ts). */
const readoutText = (page: Page, label: string) => readReadout(page, LAB, label);

const readoutValue = async (page: Page, label: string) =>
  parseSpanish(await readoutText(page, label));

async function openLab(page: Page): Promise<void> {
  await page.goto(PAGE);
  // The island hydrates with client:visible; bring it into view and wait for React.
  await page.locator(LAB).scrollIntoViewIfNeeded();
  await waitForIsland(page, LAB);
}

const documentWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('lleva el título de la consigna y cuatro pasos, cada uno con su "Por qué"', async ({
    page,
  }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE);
    const steps = page.locator('section.step');

    await expect(steps).toHaveCount(4);
    for (const n of [1, 2, 3, 4]) {
      await expect(
        page.getByRole('heading', { level: 2, name: new RegExp(`^Paso ${n} · `) }),
      ).toBeVisible();
    }
    for (const step of await steps.all()) await expect(step.locator('.why')).toHaveCount(1);
  });

  test('solo la figura del laboratorio lleva la insignia "Simulación interactiva"', async ({
    page,
  }) => {
    const badges = page.getByTestId('figure').getByText('Simulación interactiva', { exact: true });
    const labFigure = page.locator('section.step#paso-4 figure[data-type="simulacion"]', {
      has: page.getByTestId('bounce-lab'),
    });

    await expect(badges).toHaveCount(1);
    await expect(labFigure.getByText('Simulación interactiva', { exact: true })).toHaveCount(1);
    await expect(labFigure.locator('.figure-source')).toContainText('Fuente:');
  });

  test('la página cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(page.getByTestId('use-case')).toContainText(
      'impulse = -cp->normalMass * ( vn + restitution * cp->relativeVelocity );',
    );
    await expect(page.getByTestId('callout')).toContainText('Choque elástico de masas distintas');
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(10);
    await expect(page.getByTestId('connections')).toBeVisible();
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(4);
  });

  test('las dos tablas se numeran 7.1 (motores) y 7.2 (pelotas)', async ({ page }) => {
    const tables = page.getByTestId('data-table');
    await expect(tables).toHaveCount(2);

    const numbers = await tables.evaluateAll((figures) =>
      figures.map((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        const position = [...(body?.querySelectorAll('.content-table') ?? [])].indexOf(figure) + 1;
        return { id: figure.id, number: `${body?.dataset.topicNumber}.${position}` };
      }),
    );

    expect(numbers).toEqual([
      { id: 'coeficiente-restitucion-motores', number: '7.1' },
      { id: 'coeficiente-restitucion-pelotas', number: '7.2' },
    ]);
    await expect(tables.first()).toContainText('Box2D v3');
    await expect(tables.last()).toContainText('0,729–0,761');
  });
});

test.describe('laboratorio', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test('mover e recalcula el rebote del motor: el e medido sigue a e y el primer rebote a e² por la altura de suelta', async ({
    page,
  }) => {
    const slider = page.getByRole('slider', { name: E_SLIDER, exact: true });
    const before = await readoutText(page, MEASURED_E);
    const e = 0.5;

    await setRange(slider, String(e));

    await expect(slider).toHaveValue(String(e));
    await expect.poll(() => readoutText(page, MEASURED_E)).not.toBe(before);
    expect(Math.abs((await readoutValue(page, MEASURED_E)) - e)).toBeLessThan(MEASURED_TOLERANCE);
    expect(Math.abs((await readoutValue(page, FIRST_REBOUND)) - e * e * ITF_DROP_M)).toBeLessThan(
      REBOUND_TOLERANCE_M,
    );
  });

  test('carga un preajuste que se siente mal: el umbral de Unity para en seco tras 18,5 cm', async ({
    page,
  }) => {
    await page.getByRole('combobox', { name: 'Preajuste' }).selectOption('umbral-unity');

    await expect(page.getByRole('slider', { name: E_SLIDER, exact: true })).toHaveValue('0.9');
    await expect(page.getByTestId('preset-note')).toContainText(
      'e quedaría a la mitad y la altura del rebote, a la cuarta parte',
    );
    await expect(page.getByTestId('bounce-summary')).toContainText('N = 8 rebotes');
    await expect(page.getByTestId('bounce-summary')).toContainText('18,5 cm');
  });

  test('carga un preajuste realista: el balón FIBA con e = 0,767', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Preajuste' }).selectOption('baloncesto-fiba');

    await expect(page.getByRole('slider', { name: E_SLIDER, exact: true })).toHaveValue(
      String(FIBA_E),
    );
    await expect(page.getByTestId('preset-note')).toContainText('FIBA');
    await expect
      .poll(async () => Math.abs((await readoutValue(page, MEASURED_E)) - FIBA_E))
      .toBeLessThan(MEASURED_TOLERANCE);
  });

  test('reproducir termina al final, vuelve a "Reproducir" y no repite', async ({ page }) => {
    const lab = page.locator(LAB);
    const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });
    await setRange(timeline, NEAR_END);

    await lab.getByRole('button', { name: 'Reproducir' }).click();
    await expect(timeline).toHaveValue('1000', { timeout: PLAYBACK_TIMEOUT_MS });

    await expect(lab).toHaveAttribute('data-playing', 'false');
    await expect(lab.getByRole('button', { name: 'Reproducir' })).toBeVisible();
    // Still at the end a moment later: the clock did not wrap around (a wait is the point here).
    await page.waitForTimeout(STILL_AT_END_MS);
    await expect(timeline).toHaveValue('1000');
    await expect(lab).toHaveAttribute('data-playing', 'false');
  });

  test('el engranaje abre el panel con el teclado, Escape lo cierra y el foco vuelve', async ({
    page,
  }) => {
    const gear = page.locator(LAB).getByRole('button', { name: 'Ajustes del simulador' });
    const dialog = page.getByRole('dialog', { name: /^Ajustes: Laboratorio del rebote/ });

    await gear.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('switch', { name: 'Repetir' })).not.toBeChecked();
    await expect(dialog.getByRole('combobox', { name: 'Velocidad' })).toContainText('0,25×');
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(gear).toBeFocused();
  });

  test('la nota del laboratorio dice la velocidad de reproducción y lo que el modelo deja fuera', async ({
    page,
  }) => {
    const footnote = page.locator(LAB).getByTestId('lab-footnote');

    await expect(footnote).toContainText('tiempo real');
    await expect(footnote).toContainText('0,25×');
    await expect(footnote).toContainText('arrastre del aire');
    await expect(footnote).toContainText('giro');
  });

  test('el laboratorio ocupa el ancho de la columna de lectura', async ({ page }) => {
    const lab = await page.locator(LAB).boundingBox();
    const article = await page.locator('article').boundingBox();

    expect(lab).not.toBeNull();
    expect(article).not.toBeNull();
    expect(lab?.width ?? 0).toBeGreaterThanOrEqual(MIN_WIDTH_SHARE * (article?.width ?? Infinity));
  });
});

test.describe('a 360 px', () => {
  test.use({ viewport: PHONE });

  test('la página no se desplaza en horizontal, ni en el rebote ni en el choque', async ({
    page,
  }) => {
    await page.goto(PAGE);
    await hydrateAllIslands(page);
    await page.evaluate(() => document.fonts.ready);
    expect(await documentWidth(page)).toBeLessThanOrEqual(PHONE.width);

    const collision = page.locator(LAB).getByRole('button', { name: 'Choque de dos cuerpos' });
    await collision.scrollIntoViewIfNeeded();
    await collision.click();
    await expect(collision).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('collision-scene')).toBeVisible();

    expect(await documentWidth(page)).toBeLessThanOrEqual(PHONE.width);
  });
});

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`${viewport.name}, tema ${theme === 'light' ? 'claro' : 'oscuro'}`, () => {
      test.use({ viewport: viewport.size, colorScheme: theme });

      test('axe no encuentra violaciones serias ni críticas', async ({ page }) => {
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
    });
  }
}
