import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { hydrateAllIslands, readoutText as readReadout, waitForIsland } from './helpers';
import { badgeTouches } from './svgBadgeClearance';

const PAGE = './temas/asistencia-gravitatoria/';
const TITLE = 'Asistencia gravitatoria: cómo la Voyager ganó velocidad sin gastar combustible';
const LAB = '[data-testid="flyby-lab"]';
const CHART = '[data-testid="voyager-speed-chart"]';
const PHONE = { width: 360, height: 800 };
const DESKTOP = { width: 1280, height: 800 };
const THEMES = ['light', 'dark'] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
const STEP_COUNT = 4;
const TABLE_IDS = ['asistencia-gravitatoria-constantes', 'asistencia-gravitatoria-encuentros'];
const MIN_SOURCES = 8;
const DELTA = 'Ángulo de giro δ';
/** The chart's source sentence (VOYAGER_CHART_SOURCE): printed once, by the Figure, never twice. */
const SOURCE_SENTENCE = 'trayectoria de diseño reconstruida hasta el 29 de agosto de 1989';

/** The value text of the readout row of the lab labelled exactly `label` (helpers.ts). */
const readoutText = (page: Page, label: string) => readReadout(page, LAB, label);

async function open(page: Page, selector: string): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await waitForIsland(page, selector);
}

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('lleva el título del tema', async ({ page }) => {
    await expect(page).toHaveTitle(new RegExp(`^Tema 9: ${TITLE}`));
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

  test('solo la gráfica de la Voyager lleva insignia, "Visualización de datos", con su fuente una sola vez', async ({
    page,
  }) => {
    const badged = page.locator('figure[data-testid="figure"]:has(.figure-head)');

    await expect(badged).toHaveCount(1);
    await expect(badged).toHaveAttribute('data-type', 'visualizacion');
    await expect(badged.locator(CHART)).toBeAttached();
    await expect(badged.locator('.figure-head')).toHaveText('Visualización de datos');
    const source = badged.locator('.figure-source');
    await expect(source).toContainText('NASA/JPL Horizons');
    await expect(source).toContainText('trayectoria de diseño');
    // The chart's own footnote carries only the Δ|v| method, so the sentence is not repeated.
    const occurrences = await page.evaluate(
      (sentence) => (document.body.textContent ?? '').split(sentence).length - 1,
      SOURCE_SENTENCE,
    );
    expect(occurrences).toBe(1);
  });

  test('las dos tablas se numeran 9.1 y 9.2, en orden', async ({ page }) => {
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
      expect(label).toBe(`Tabla 9.${index + 1}`);
    }
  });

  test('cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toHaveCount(1);
    await expect(page.getByTestId('connections')).toBeVisible();
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(
      MIN_SOURCES,
    );
  });

  test('el cursor de la gráfica se mueve con el teclado y cambia la lectura', async ({ page }) => {
    await open(page, CHART);
    const chart = page.locator(CHART);
    const cursor = chart.getByRole('slider', { name: 'Fecha', exact: true });
    const readout = chart.getByTestId('voyager-readout');
    const before = await readout.textContent();
    const dateBefore = await cursor.getAttribute('aria-valuetext');

    await cursor.focus();
    await cursor.press('PageUp');

    await expect(cursor).not.toHaveAttribute('aria-valuetext', dateBefore ?? '');
    await expect(readout).not.toHaveText(before ?? '');
  });
});

test.describe('laboratorio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    await open(page, LAB);
  });

  test('un preajuste del selector cambia el ángulo de giro δ y la línea de su fuente', async ({
    page,
  }) => {
    const lab = page.locator(LAB);
    const before = await readoutText(page, DELTA);
    const presets = lab.getByRole('combobox', { name: 'Valores de referencia' });
    await expect(presets.locator('option')).toHaveCount(6);

    await presets.selectOption({ label: 'V2 · Saturno' });

    await expect.poll(() => readoutText(page, DELTA)).not.toBe(before);
    const note = lab.getByTestId('preset-note');
    await expect(note).toContainText('Máxima aproximación');
    await expect(note.getByRole('link', { name: /^JPL Horizons, 1981-08-26/ })).toHaveAttribute(
      'href',
      'https://ssd.jpl.nasa.gov/horizons/',
    );
  });

  test('«Cómo se usa» y «Qué deja fuera el modelo» abren cerrados y dicen el paso y los supuestos', async ({
    page,
  }) => {
    const lab = page.locator(LAB);
    const usage = lab.locator('details[data-lab-note="usage"]');
    const leftOut = lab.locator('details[data-lab-note="left-out"]');
    await expect(usage).not.toHaveAttribute('open');
    await expect(leftOut).not.toHaveAttribute('open');
    await expect(usage.getByText(/12 s a 1×/)).toBeHidden();

    await usage.locator('summary').click();
    await leftOut.locator('summary').press('Enter');

    await expect(usage.getByText(/12 s a 1×/)).toBeVisible();
    await expect(usage).toContainText('Arrastra el punto de máxima aproximación');
    for (const left of ['plano', 'eclíptica', 'lunas', 'cónicas empalmadas']) {
      await expect(leftOut).toContainText(left);
    }
  });

  test('las fichas junto al engranaje dicen lo activo y abren los ajustes', async ({ page }) => {
    const lab = page.locator(LAB);
    const chips = lab.getByRole('group', { name: 'Ajustes activos' }).getByRole('button');
    await expect(chips).toHaveText(['vectores', 'círculo', '1×']);

    await lab.getByRole('button', { name: 'Velocidad 1×' }).click();
    const dialog = page.getByRole('dialog', { name: /^Ajustes: / });
    await dialog.getByRole('combobox', { name: 'Velocidad' }).selectOption('2');
    await dialog.getByRole('switch', { name: /^Círculo/ }).uncheck({ force: true });
    await page.keyboard.press('Escape');

    await expect(chips).toHaveText(['vectores', '2×']);
    await expect(lab.getByRole('button', { name: 'Velocidad 2×' })).toBeFocused();
  });
});

test.describe('laboratorio a 1 280 × 800', () => {
  test.use({ viewport: DESKTOP });

  test('el primer control físico queda en la primera pantalla, a la derecha del lienzo', async ({
    page,
  }) => {
    await page.goto(PAGE);
    await open(page, LAB);
    const lab = page.locator(LAB);
    await lab.evaluate((node) =>
      window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY),
    );

    const field = await lab
      .getByRole('textbox', { name: 'Máxima aproximación r sub p' })
      .boundingBox();
    const canvas = await lab.locator('[data-lab-canvas]').boundingBox();
    expect(field && canvas).toBeTruthy();
    if (!field || !canvas) return;
    expect(field.y + field.height).toBeLessThanOrEqual(DESKTOP.height);
    expect(field.x).toBeGreaterThanOrEqual(canvas.x + canvas.width);
    expect(field.y).toBeLessThan(canvas.y + canvas.height);
  });
});

test.describe('laboratorio a 360 px', () => {
  test.use({ viewport: PHONE });

  test('la llegada no parte un símbolo de su valor ni desborda', async ({ page }) => {
    await page.goto(PAGE);
    await open(page, LAB);
    const arrival = page.locator(LAB).getByTestId('flyby-arrival');

    const report = await arrival.evaluate((line) => {
      const lineBox = line.getBoundingClientRect();
      const pairs = [...line.querySelectorAll('.katex')].map((formula) => {
        // From the formula to the comma or period that ends its value.
        const text = formula.closest('.inline-math')?.nextSibling;
        const range = document.createRange();
        range.setStartBefore(formula);
        const end = text?.textContent?.search(/[,.](\s|$)/) ?? -1;
        if (text && end >= 0) range.setEnd(text, end);
        else range.setEndAfter(formula);
        const tops = [...range.getClientRects()].map((rect) => rect.top + rect.height / 2);
        return Math.max(...tops) - Math.min(...tops);
      });
      return { pairs, overflow: line.scrollWidth - line.clientWidth, right: lineBox.right };
    });

    expect(report.pairs).toHaveLength(3);
    // One line each: the middles of a pair's boxes are within half a line of each other.
    for (const spread of report.pairs) expect(spread).toBeLessThan(10);
    expect(report.overflow).toBeLessThanOrEqual(0);
    expect(report.right).toBeLessThanOrEqual(PHONE.width);
  });

  test('apila lienzo, reproducción, parámetros, escenario, lecturas y desplegables, en ese orden', async ({
    page,
  }) => {
    await page.goto(PAGE);
    await open(page, LAB);
    const lab = page.locator(LAB);
    const parts = [
      lab.locator('[data-lab-canvas]'),
      lab.getByRole('group', { name: 'Reproducción' }),
      lab.getByRole('region', { name: 'Parámetros' }),
      lab.getByRole('region', { name: 'Escenario' }),
      lab.getByRole('region', { name: 'Lecturas' }),
      lab.locator('details[data-lab-note="usage"]'),
      lab.locator('details[data-lab-note="left-out"]'),
    ];

    const tops: number[] = [];
    for (const part of parts) tops.push((await part.boundingBox())?.y ?? Number.NaN);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    expect(new Set(tops).size).toBe(parts.length);
  });
});

test.describe('a 360 px', () => {
  test.use({ viewport: PHONE });

  test('la página no desborda en horizontal con todas las islas dibujadas', async ({ page }) => {
    await page.goto(PAGE);
    await page.evaluate(() => document.fonts.ready);
    await hydrateAllIslands(page);

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

/**
 * The longest text the r_p field shows: two decimals over 1 to 100 planet radii (RpField's
 * toFieldText), five characters from 10 up.
 */
const LONGEST_RP_TEXT = '99,99';

/**
 * How far the number box of a lab's first parameter ends from the parameters' right edge, its
 * size, and how far `longest` typed in it would overflow it.
 */
async function numberBoxInset(page: Page, path: string, lab: string, field: string, longest = '') {
  await page.goto(path);
  await open(page, lab);
  return page.locator(lab).evaluate(
    (node, { selector, text }) => {
      const params = node.querySelector('[data-lab-level="params"]') as HTMLElement;
      const input = node.querySelector(selector) as HTMLInputElement;
      const label = params.querySelector('label') as HTMLElement;
      const box = input.getBoundingClientRect();
      const shown = input.value;
      input.value = text;
      const overflow = input.scrollWidth - input.clientWidth;
      input.value = shown;
      return {
        inset: params.getBoundingClientRect().right - box.right,
        width: box.width,
        height: box.height,
        overflow,
        // The number box sits on its label's row, not on a line of its own.
        isBesideLabel: box.top < label.getBoundingClientRect().bottom,
      };
    },
    { selector: field, text: longest },
  );
}

for (const viewport of [PHONE, DESKTOP]) {
  test(`a ${viewport.width} px el campo de r_p se alinea con los de los demás temas, junto a su etiqueta, y mide lo mismo`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    // Tema 2's first field: a ParamField with the shared unit box.
    const reference = await numberBoxInset(
      page,
      './temas/salto-personaje/',
      '[data-testid="jump-lab"]',
      '[data-lab-level="params"] input[type="text"]',
    );

    const rp = await numberBoxInset(
      page,
      PAGE,
      LAB,
      '[data-lab-level="params"] input[type="text"]',
      LONGEST_RP_TEXT,
    );

    expect(rp.isBesideLabel).toBe(true);
    expect(Math.abs(rp.inset - reference.inset)).toBeLessThanOrEqual(1);
    // The same 40 px by 64 px box as every ParamField, and r_p's longest text fits in it.
    expect({ width: rp.width, height: rp.height }).toEqual({
      width: reference.width,
      height: reference.height,
    });
    expect(rp.overflow, `«${LONGEST_RP_TEXT}» no cabe`).toBeLessThanOrEqual(0);
  });
}

const FRAME = '[data-testid="flyby-planet-frame"]';
const BADGE = `${FRAME} g[data-time-scale-badge]`;
const WIDTHS = [320, 360, 1280] as const;
const RP_LIMITS = ['1', '100'] as const;
const NOMINAL_FACTOR = /^×19\s000\s*cámara rápida$/u;
const PEAK_AT = 0.5;
const MARK_SLACK_PX = 1;
const APPROACH_SAID =
  /^Máxima aproximación: la sonda pasa a 10,09 radios de Júpiter, con \d+,\d+\skm\/s respecto al planeta\.$/u;

test.describe('escala de tiempo y máxima aproximación', () => {
  test('el factor va en el marco del planeta, entre la clave de V_p y el valor de r_p, y dice lo mismo que la nota', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PAGE);
    await open(page, LAB);
    const lab = page.locator(LAB);
    const badge = lab.locator(BADGE);

    await expect(badge).toHaveText(NOMINAL_FACTOR);
    await expect(badge).toHaveAttribute('aria-hidden', 'true');
    await expect(lab.locator('g[data-time-scale-badge]')).toHaveCount(1);
    const box = (await badge.boundingBox())!;
    const frame = (await lab.locator(FRAME).boundingBox())!;
    const rp = (await lab.getByTestId('flyby-rp-value').boundingBox())!;
    expect(box.x).toBeGreaterThan(frame.x);
    expect(box.x + box.width).toBeLessThan(rp.x);
    expect(box.y).toBeLessThan(frame.y + 32);
    // The note states the same factor at 1x, in words.
    await expect(lab.getByTestId('flyby-lapse')).toContainText(/unas 19\s000 veces/u);
    await expect(lab.locator('[data-time-scale-words]')).toHaveText(
      /^Escala de tiempo: 19\s000 veces la velocidad real, cámara rápida$/u,
    );
  });

  for (const width of WIDTHS) {
    test(`a ${width} px el factor no toca texto ni trazo, con los seis encuentros y r_p de 1 a 100`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: DESKTOP.height });
      await page.goto(PAGE);
      await open(page, LAB);
      const lab = page.locator(LAB);
      const presets = lab.getByRole('combobox', { name: 'Valores de referencia' });
      const field = lab.getByRole('textbox', { name: 'Máxima aproximación r sub p' });
      const options = await presets
        .locator('option')
        .evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));

      const arrival = lab.getByTestId('flyby-arrival');
      const rpValue = lab.getByTestId('flyby-rp-value');
      for (const value of options) {
        // Wait for the new encounter to be drawn: its arrival line is the one that changes.
        const before = await arrival.textContent();
        const isCurrent = (await presets.inputValue()) === value;
        await presets.selectOption(value);
        if (!isCurrent) await expect(arrival).not.toHaveText(before ?? '');
        // The badge the clearance is measured on is there and says a factor and its word.
        await expect(lab.locator(BADGE)).toHaveText(/^×[\d\s,]+cámara (rápida|lenta)$/u);
        for (const rp of [undefined, ...RP_LIMITS]) {
          if (rp) {
            await field.fill(rp);
            await field.press('Enter');
            // The r_p readout in the frame is the render that follows the edit.
            await expect(rpValue).toContainText(`${rp},00`);
          }
          const touches = await badgeTouches(lab.locator(FRAME));
          expect(touches, `${value}, r_p ${rp ?? 'del encuentro'}`).toEqual([]);
        }
      }
    });
  }

  test('la máxima aproximación es una marca en la línea de tiempo, donde queda el pulgar a t = t_p', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PAGE);
    await open(page, LAB);
    const lab = page.locator(LAB);
    const mark = lab.locator('[data-transport-mark]');
    const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });

    await expect(mark).toHaveCount(1);
    await expect(mark).toHaveAttribute('data-kind', 'peak');
    const range = (await timeline.boundingBox())!;
    const tick = (await mark.boundingBox())!;
    // The thumb's centre at the middle of the range is the middle of the range (8 px each side).
    expect(
      Math.abs(tick.x + tick.width / 2 - (range.x + range.width * PEAK_AT)),
    ).toBeLessThanOrEqual(MARK_SLACK_PX);
    await lab.getByRole('button', { name: 'Evento siguiente' }).click();
    await expect(timeline).toHaveAttribute('aria-valuetext', /Máxima aproximación$/u);
    await expect(lab.getByTestId('flyby-clock')).toContainText('= 0,0 h');
  });

  test('«Ir a la máxima aproximación» lleva el tiempo a t_p, pausa y dice qué hay allí', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(PAGE);
    await open(page, LAB);
    const lab = page.locator(LAB);
    const go = lab.getByRole('button', { name: 'Ir a la máxima aproximación' });
    const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });

    await lab.getByRole('button', { name: 'Reproducir' }).click();
    await expect(timeline).not.toHaveValue('0');
    await go.click();

    await expect(lab).toHaveAttribute('data-playing', 'false');
    await expect(timeline).toHaveValue('500');
    await expect(lab.getByTestId('flyby-clock')).toContainText('= 0,0 h');
    await expect(lab.getByText(APPROACH_SAID)).toHaveCount(1);
    await expect(
      lab.getByText(APPROACH_SAID).locator('xpath=ancestor-or-self::*[@role="status"]'),
    ).toHaveCount(1);
    await expect(go).toBeVisible();
  });

  test('con movimiento reducido el factor es el paso que se ve (el paso en 15 s): ×15 000 tras hidratar', async ({
    browser,
  }) => {
    const server = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
    const plain = await server.newPage();
    await plain.goto(PAGE);
    await expect(plain.locator(BADGE)).toHaveText(NOMINAL_FACTOR);
    await server.close();

    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(PAGE);
    await open(page, LAB);
    await expect(page.locator(BADGE)).toHaveText(/^×15\s000\s*cámara rápida$/u);
    await context.close();
  });
});
