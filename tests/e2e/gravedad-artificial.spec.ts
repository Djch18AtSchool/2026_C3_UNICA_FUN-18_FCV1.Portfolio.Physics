import { expect, test, type Page } from '@playwright/test';
import { describeReport, measureGlyphs, openFontSession } from './glyphKit';
import { readoutText as readReadout, seekTimeline, setRange, waitForIsland } from './helpers';

const PAGE = './temas/gravedad-artificial/';
const LAB = '[data-testid="habitat-lab"]';
/** The lab must fill the reading column (spec §6): at least this share of the article width. */
const MIN_WIDTH_SHARE = 0.9;
/** The readout label of the apparent gravity, as written (its a_c/g is KaTeX). */
const APPARENT_GRAVITY = String.raw`Gravedad aparente $a_c/g$`;
/** Timeline position (of 1000) to start from, so the revolution ends within a second. */
const NEAR_END = '995';
/** Longest the last 0,5 % of playback may take to reach the end. */
const PLAYBACK_TIMEOUT_MS = 3000;
const STILL_AT_END_MS = 500;

/** The value text of the readout row of the lab labelled exactly `label` (helpers.ts). */
const readoutText = (page: Page, label: string) => readReadout(page, LAB, label);

/** Centre of the radius handle's visible knob, in page coordinates. */
async function knobCentre(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId('radius-handle').locator('[data-knob]').boundingBox();
  expect(box).not.toBeNull();
  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
}

/** Scrolls the scene to the middle of the viewport, clear of the sticky topic bar. */
async function centreScene(page: Page): Promise<void> {
  await page
    .getByTestId('habitat-scene')
    .evaluate((scene) => scene.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

test.describe('laboratorio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
    // The island hydrates with client:visible; bring it into view and wait for React.
    await page.locator(LAB).scrollIntoViewIfNeeded();
    await waitForIsland(page, LAB);
  });

  test('una vuelta completa termina, vuelve a "Reproducir" y no repite', async ({ page }) => {
    const lab = page.locator(LAB);
    const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });
    await seekTimeline(timeline, NEAR_END);

    await lab.getByRole('button', { name: 'Reproducir' }).click();
    await expect(timeline).toHaveValue('1000', { timeout: PLAYBACK_TIMEOUT_MS });

    await expect(lab).toHaveAttribute('data-playing', 'false');
    await expect(lab.getByRole('button', { name: 'Reproducir' })).toBeVisible();
    // One revolution at 1 rpm is 60 s of real time.
    await expect(timeline).toHaveAttribute('aria-valuetext', /^t = 60,00\s?s$/);
    await page.waitForTimeout(STILL_AT_END_MS);
    await expect(timeline).toHaveValue('1000');
    await expect(lab).toHaveAttribute('data-playing', 'false');
  });

  test('con "fijar 1 g", 2 RPM da un radio de 223,6 m', async ({ page }) => {
    await expect(page.getByRole('switch', { name: 'Fijar 1 g' })).toBeChecked();

    await setRange(page.getByRole('slider', { name: /^Velocidad de giro/ }), '2');

    await expect(page.getByRole('textbox', { name: /^Radio del piso/ })).toHaveValue('223,6');
    await expect(page.getByTestId('radius-handle')).toHaveAttribute('aria-valuenow', '223.6');
  });

  test('arrastrar el radio con el ratón cambia la gravedad aparente', async ({ page }) => {
    await page.getByRole('switch', { name: 'Fijar 1 g' }).uncheck({ force: true });
    await centreScene(page);
    const before = await readoutText(page, APPARENT_GRAVITY);
    const { x, y } = await knobCentre(page);

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 40, y, { steps: 4 });
    await page.mouse.move(x - 80, y, { steps: 4 });
    await page.mouse.up();

    await expect.poll(() => readoutText(page, APPARENT_GRAVITY)).not.toBe(before);
  });

  test('el radio se mueve con las flechas del teclado', async ({ page }) => {
    const radius = page.getByTestId('radius-handle');
    const before = await radius.getAttribute('aria-valuenow');

    await radius.focus();
    await page.keyboard.press('Shift+ArrowLeft');

    await expect(radius).not.toHaveAttribute('aria-valuenow', before ?? '');
    await expect(radius).toBeFocused();
  });

  test('el engranaje abre el panel, Escape lo cierra y el foco vuelve al engranaje', async ({
    page,
  }) => {
    const gear = page.locator(LAB).getByRole('button', { name: 'Ajustes del simulador' });
    const dialog = page.getByRole('dialog', { name: /^Ajustes: Laboratorio del hábitat/ });

    await gear.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('switch', { name: 'Repetir' })).not.toBeChecked();
    await expect(dialog.getByRole('combobox', { name: 'Velocidad' })).toContainText('8×');
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(gear).toBeFocused();
  });

  test('con 1 decimal global las lecturas muestran un decimal', async ({ page }) => {
    await page.locator(LAB).getByRole('button', { name: 'Ajustes del simulador' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Global' }).click();
    await dialog.getByText('1', { exact: true }).click();
    await page.keyboard.press('Escape');

    for (const label of [
      'Velocidad angular ω',
      'Velocidad tangencial v',
      APPARENT_GRAVITY,
      'Período T',
      'Diferencia cabeza–pies h/r',
    ]) {
      expect(await readoutText(page, label)).toMatch(/^\d+,\d\s\S+$/);
    }
  });

  test('el laboratorio va por niveles: N, r y «Fijar 1 g», luego los preajustes con su fuente enlazada', async ({
    page,
  }) => {
    const lab = page.locator(LAB);
    const params = lab.getByRole('region', { name: 'Parámetros' });
    await expect(params.getByRole('slider', { name: /^Velocidad de giro/ })).toBeVisible();
    await expect(params.getByRole('switch', { name: 'Fijar 1 g' })).toBeAttached();
    const scenario = lab.getByRole('region', { name: 'Escenario' });
    await scenario.getByRole('button', { name: /^Toro de Stanford/ }).click();

    const note = lab.getByTestId('preset-note');
    await expect(note).toContainText('0,95 ± 0,05 g');
    await expect(note.getByRole('link', { name: /^NASA SP-413/ })).toHaveAttribute(
      'href',
      'https://ntrs.nasa.gov/citations/19770014162',
    );
    await expect(params.getByRole('switch', { name: 'Fijar 1 g' })).not.toBeChecked();
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

  test('el diagrama del hábitat se ve y anota las ecuaciones', async ({ page }) => {
    const diagram = page.getByTestId('habitat-diagram');

    await expect(diagram).toBeVisible();
    await expect(diagram.locator('text[data-notation="a_c = ω^2 r"]')).toBeAttached();
    await expect(diagram.locator('text[data-notation="T = 2π/ω"]')).toBeAttached();
  });

  test('el diagrama dibuja sus textos solo con IBM Plex o KaTeX, según la fuente que el navegador usó', async ({
    page,
  }) => {
    await page.evaluate(() => document.fonts.ready);
    const cdp = await openFontSession(page);

    // ω and π live only in KaTeX_Math: a text asking for KaTeX_Main falls to Times, which the
    // declared family hides and the fonts really used reveal.
    const report = await measureGlyphs(page, cdp, '[data-testid="habitat-diagram"]');

    expect(describeReport(report, '[data-testid="habitat-diagram"]')).toEqual([]);
    expect(report.probes).toBeGreaterThan(20);
    expect(
      await page.getByTestId('habitat-diagram').locator('text[data-notation]').count(),
    ).toBeGreaterThan(0);
  });

  test('el paso 4 lleva el diagrama antes del laboratorio, con una sola insignia de diagrama', async ({
    page,
  }) => {
    const step = page.locator('section.step#paso-4');
    const figures = step.locator('figure');

    await expect(figures).toHaveCount(2);
    await expect(figures.nth(0)).toHaveAttribute('data-type', 'diagrama');
    await expect(figures.nth(0).getByTestId('habitat-diagram')).toBeAttached();
    await expect(figures.nth(1)).toHaveAttribute('data-type', 'simulacion');
    await expect(figures.nth(1).getByTestId('habitat-lab')).toBeAttached();
    await expect(step.getByText('Diagrama', { exact: true })).toHaveCount(1);
    // Only the prescribed diagram carries a type badge; the lab shows none of its own.
    await expect(figures.nth(1).getByText('Simulación interactiva', { exact: true })).toHaveCount(
      0,
    );
    await expect(figures.nth(1).locator('details[data-lab-note="left-out"]')).toContainText(
      'Coriolis',
    );
  });

  test('«Cómo se usa» y «Qué deja fuera el modelo» abren cerrados y dicen el paso, el arrastre y los supuestos', async ({
    page,
  }) => {
    const lab = page.locator(LAB);
    const usage = lab.locator('details[data-lab-note="usage"]');
    const leftOut = lab.locator('details[data-lab-note="left-out"]');
    await expect(usage).not.toHaveAttribute('open');
    await expect(leftOut).not.toHaveAttribute('open');
    await expect(usage.getByText(/vuelta de 60 s dura 10 s a 1×/)).toBeHidden();

    await usage.locator('summary').click();
    await leftOut.locator('summary').press('Enter');

    await expect(usage.getByText(/vuelta de 60 s dura 10 s a 1×/)).toBeVisible();
    await expect(usage).toContainText('Arrastra el manejador sobre la barra logarítmica');
    for (const left of ['9,81 m/s²', 'Coriolis', '130 m']) {
      await expect(leftOut).toContainText(left);
    }
  });

  test('la página tiene cuatro pasos, cada uno con su "Por qué" y su figura', async ({ page }) => {
    const steps = page.locator('section.step');

    await expect(steps).toHaveCount(4);
    for (const step of await steps.all()) {
      await expect(step.locator('.why')).toHaveCount(1);
      expect(await step.locator('figure').count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('la página cumple la estructura del tema', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(4);
    await expect(page.getByTestId('connections')).toBeVisible();
    expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(4);
  });
});

test.describe('a 375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('ningún texto del diagrama queda por debajo de 11 px efectivos', async ({ page }) => {
    await page.goto(PAGE);
    const MIN_EFFECTIVE_PX = 11;
    /** A subscript or a power (a tspan below 100 %) may be smaller: 9 px, as the other topics' figures. */
    const MIN_SCRIPT_PX = 9;
    const diagram = page.getByTestId('habitat-diagram');
    await diagram.scrollIntoViewIfNeeded();

    const sizes = await diagram.evaluate((svg: SVGSVGElement) => {
      const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      return (
        [...svg.querySelectorAll('text, tspan')]
          // A hidden <text> hides its <tspan>s too, though they still compute display: inline.
          .filter((node) => getComputedStyle(node.closest('text') ?? node).display !== 'none')
          .map((node) => ({
            text: node.textContent?.trim() ?? '',
            px: parseFloat(getComputedStyle(node).fontSize) * scale,
            // MathText sets a subscript or power at 75 % and a KaTeX glyph at 117 % (the x-height
            // of Plex): only a size below 100 % of the label is a script.
            isScript:
              parseFloat(node.getAttribute('font-size') ?? '') < 100 &&
              /%$/.test(node.getAttribute('font-size') ?? ''),
          }))
      );
    });

    const tooSmall = sizes.filter(
      ({ px, isScript }) => px < (isScript ? MIN_SCRIPT_PX : MIN_EFFECTIVE_PX),
    );
    expect(sizes.length).toBeGreaterThan(0);
    expect(tooSmall).toEqual([]);
  });
});

test.describe('con pantalla táctil', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 } });

  test('arrastrar el radio con el dedo cambia la gravedad aparente sin desplazar la página', async ({
    page,
  }) => {
    await page.goto(PAGE);
    await page.locator(LAB).scrollIntoViewIfNeeded();
    await waitForIsland(page, LAB);
    await page.getByRole('switch', { name: 'Fijar 1 g' }).uncheck({ force: true });
    await centreScene(page);
    const before = await readoutText(page, APPARENT_GRAVITY);
    const { x, y } = await knobCentre(page);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const cdp = await page.context().newCDPSession(page);

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (const step of [1, 2, 3, 4]) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - 12 * step, y: y + step }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect.poll(() => readoutText(page, APPARENT_GRAVITY)).not.toBe(before);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });
});
