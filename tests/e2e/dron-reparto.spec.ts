import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  mathSource,
  readoutText as readReadout,
  seekTimeline,
  setRange,
  waitForIsland,
} from './helpers';

const PAGE = './temas/dron-reparto/';
const LAB = '[data-testid="drone-lab"]';
/** The lab must fill the reading column (spec §6): at least this share of the article width. */
const MIN_WIDTH_SHARE = 0.9;
/** Timeline position (of 1000) to start from, so playback reaches the end within a second. */
const NEAR_END = '995';
/** Longest the last 0,5 % of playback may take to reach the end. */
const PLAYBACK_TIMEOUT_MS = 3000;
const STILL_AT_END_MS = 500;

/** The value text of the readout row of the lab labelled exactly `label` (helpers.ts). */
const readoutText = (page: Page, label: string) => readReadout(page, LAB, label);

/** Centre of a handle's visible knob, in page coordinates. */
async function knobCentre(page: Page, testId: string): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId(testId).locator('[data-knob]').boundingBox();
  expect(box).not.toBeNull();
  return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
}

/** Scrolls the map to the middle of the viewport, clear of the sticky topic bar. */
async function centreMap(page: Page): Promise<void> {
  await page
    .getByTestId('route-map')
    .evaluate((map) => map.scrollIntoView({ block: 'center', behavior: 'instant' }));
}

async function mouseDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto(PAGE);
  // The island hydrates with client:visible and then loads the route; wait for both.
  await page
    .locator('[data-testid="drone-lab-loading"], ' + LAB)
    .first()
    .scrollIntoViewIfNeeded();
  await expect(page.locator(LAB)).toBeVisible();
  await waitForIsland(page, LAB);
});

test('reproducir termina al final, vuelve a "Reproducir" y no repite', async ({ page }) => {
  const lab = page.locator(LAB);
  const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });
  await seekTimeline(timeline, NEAR_END);

  await lab.getByRole('button', { name: 'Reproducir' }).click();
  await expect(timeline).toHaveValue('1000', { timeout: PLAYBACK_TIMEOUT_MS });

  await expect(lab).toHaveAttribute('data-playing', 'false');
  await expect(lab.getByRole('button', { name: 'Reproducir' })).toBeVisible();
  await page.waitForTimeout(STILL_AT_END_MS);
  await expect(timeline).toHaveValue('1000');
  await expect(lab).toHaveAttribute('data-playing', 'false');
});

test('arrastrar la parada B cambia la duración y marca la ruta como modificada', async ({
  page,
}) => {
  await centreMap(page);
  const before = await readoutText(page, 'Duración de la ruta');
  const from = await knobCentre(page, 'stop-B');

  await mouseDrag(page, from, { x: from.x + 60, y: from.y + 40 });

  await expect.poll(() => readoutText(page, 'Duración de la ruta')).not.toBe(before);
  await expect(page.getByTestId('route-modified')).toBeVisible();

  await page.locator(LAB).getByRole('button', { name: 'Restablecer' }).click();
  await expect(page.getByTestId('route-modified')).toHaveCount(0);
  await expect.poll(() => readoutText(page, 'Duración de la ruta')).toBe(before);
});

test('soltar B sobre C muestra el mensaje y conserva la ruta', async ({ page }) => {
  await centreMap(page);
  const before = await readoutText(page, 'Duración de la ruta');
  const stopB = page.getByTestId('stop-B');
  const valueBefore = await stopB.getAttribute('aria-valuetext');

  await mouseDrag(page, await knobCentre(page, 'stop-B'), await knobCentre(page, 'stop-C'));

  await expect(page.getByTestId('route-error')).toContainText(
    'La parada B y la parada C coinciden',
  );
  expect(await readoutText(page, 'Duración de la ruta')).toBe(before);
  await expect(stopB).toHaveAttribute('aria-valuetext', valueBefore ?? '');
  await expect(page.getByTestId('route-modified')).toHaveCount(0);
});

test('una parada se mueve con las flechas del teclado', async ({ page }) => {
  const before = await readoutText(page, 'Duración de la ruta');

  await page.getByTestId('stop-C').focus();
  await page.keyboard.press('Shift+ArrowLeft');

  await expect.poll(() => readoutText(page, 'Duración de la ruta')).not.toBe(before);
  await expect(page.getByTestId('route-modified')).toBeVisible();
});

test('las gráficas de perfiles siguen presentes y su marcador sigue a t', async ({ page }) => {
  const profiles = page.getByTestId('drone-profiles');
  // Each chart title as its author wrote it, KaTeX formulas included.
  const titles = await Promise.all(
    (await profiles.locator('figcaption').all()).map((caption) => mathSource(caption)),
  );
  for (const title of [
    'Posición: x(t) y y(t)',
    'Velocidad: $v_x(t)$, $v_y(t)$ y |v|(t)',
    'Aceleración: $a_x(t)$, $a_y(t)$ y |a|(t)',
    'Distancia recorrida frente a |Δr| desde el depósito',
  ]) {
    expect(titles).toContain(title);
  }
  // Four named charts (SvgPlot images), each with its t axis in seconds and the delivery bands.
  await expect(profiles.getByRole('img')).toHaveCount(4);
  await expect(profiles.getByRole('img', { name: /^Posición del dron/ })).toBeVisible();
  await expect(profiles.getByText('t (s)', { exact: true })).toHaveCount(4);
  for (const axis of ['Posición (m)', 'Velocidad (m/s)', 'Aceleración (m/s²)', 'Longitud (m)']) {
    await expect(profiles.getByText(axis, { exact: true })).toBeVisible();
  }
  for (const stop of ['A', 'B', 'C']) {
    await expect(profiles.locator(`rect[data-band="${stop}"]`)).toHaveCount(4);
  }

  const markers = profiles.locator('[data-profile-marker]');
  await expect(markers).toHaveCount(4);
  const marker = markers.first();
  const before = await marker.getAttribute('transform');
  await setRange(page.locator(LAB).getByRole('slider', { name: 'Línea de tiempo' }), '700');
  await expect.poll(() => marker.getAttribute('transform')).not.toBe(before);
  // Every chart reads its series at the same t, in a text row under the plot.
  await expect(profiles.locator('dl[data-profile-reading]')).toHaveCount(4);
  const readT = await markers.evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute('data-marker-t')),
  );
  expect(new Set(readT).size).toBe(1);
});

test('la figura del laboratorio es una visualización con una sola insignia y fuente de ArduPilot', async ({
  page,
}) => {
  const figure = page.locator('section.step#paso-4 figure[data-type="visualizacion"]');

  await expect(figure.getByText('Visualización de datos', { exact: true })).toHaveCount(1);
  await expect(figure.locator('.figure-source')).toContainText('ArduPilot');
  await expect(figure.locator('details[data-lab-note="left-out"]')).toContainText('no hay viento');
});

test('«Cómo se usa» y «Qué deja fuera el modelo» abren cerrados y dicen el arrastre, la reproducción y los supuestos', async ({
  page,
}) => {
  const lab = page.locator(LAB);
  const usage = lab.locator('details[data-lab-note="usage"]');
  const leftOut = lab.locator('details[data-lab-note="left-out"]');
  await expect(usage).not.toHaveAttribute('open');
  await expect(leftOut).not.toHaveAttribute('open');
  await expect(usage.getByText(/20 veces más rápida/)).toBeHidden();

  await usage.locator('summary').click();
  await leftOut.locator('summary').press('Enter');

  await expect(usage.getByText(/20 veces más rápida/)).toBeVisible();
  await expect(usage).toContainText('Arrastra las paradas A, B y C');
  for (const left of ['2,5 m/s²', 'vértice', 'viento', 'diferencias centrales']) {
    await expect(leftOut).toContainText(left);
  }
});

test('el laboratorio va por niveles, sin escenario: v_máx y a_máx, las lecturas y las fichas del cajón', async ({
  page,
}) => {
  const lab = page.locator(LAB);
  const params = lab.getByRole('region', { name: 'Parámetros' });
  await expect(params.getByRole('slider', { name: /^Rapidez máxima/ })).toBeVisible();
  await expect(params.getByRole('slider', { name: /^Aceleración máxima/ })).toBeVisible();
  await expect(lab.getByRole('region', { name: 'Escenario' })).toHaveCount(0);
  await expect(lab.getByRole('region', { name: 'Lecturas' })).toBeVisible();
  const chips = lab.getByRole('group', { name: 'Ajustes activos' }).getByRole('button');
  await expect(chips).toHaveCount(3);
  await expect(chips.nth(0)).toHaveAccessibleName('vectores');
  await expect(chips.nth(1)).toHaveAccessibleName('rastro');
});

test('la página tiene al menos tres pasos, cada uno con su "Por qué"', async ({ page }) => {
  const steps = page.locator('section.step');

  expect(await steps.count()).toBeGreaterThanOrEqual(3);
  for (const step of await steps.all()) await expect(step.locator('.why')).toHaveCount(1);
});

test('el laboratorio ocupa el ancho de la columna de lectura', async ({ page }) => {
  const lab = await page.locator(LAB).boundingBox();
  const article = await page.locator('article').boundingBox();

  expect(lab).not.toBeNull();
  expect(article).not.toBeNull();
  expect(lab?.width ?? 0).toBeGreaterThanOrEqual(MIN_WIDTH_SHARE * (article?.width ?? Infinity));
});

test('la página cumple la estructura del tema', async ({ page }) => {
  await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
  expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('connections')).toBeVisible();
  expect(await page.locator('.katex-display').count()).toBeGreaterThanOrEqual(4);
});

test.describe('con pantalla táctil', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 812 } });

  test('arrastrar la parada B con el dedo cambia la duración sin desplazar la página', async ({
    page,
  }) => {
    await centreMap(page);
    const before = await readoutText(page, 'Duración de la ruta');
    const { x, y } = await knobCentre(page, 'stop-B');
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const cdp = await page.context().newCDPSession(page);

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (const step of [1, 2, 3, 4]) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + 4 * step, y: y + 3 * step }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await expect.poll(() => readoutText(page, 'Duración de la ruta')).not.toBe(before);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });
});

/** The loaded lab's card and its skeleton: the skeleton's places are measured in rem (≤ 2 px apart). */
const SKELETON_SLACK_PX = 8;
/** The map's height may move by this much while it mounts: rounding of a fractional width. */
const MAP_GROWTH_SLACK_PX = 1;
const PHONE = { width: 360, height: 800 } as const;
/** A wide phone, and the 540 px window of the other labs' hydration check (map svg 334 and 460 px). */
const WIDE_PHONE = { width: 414, height: 800 } as const;
const SMALL_TABLET = { width: 540, height: 800 } as const;
/** The map's svg at 478,5 px, just under SvgPlot's switch, and at 481,5 px, just past it. */
const MAP_UNDER_SWITCH = { width: 559, height: 800 } as const;
const MAP_PAST_SWITCH = { width: 562, height: 800 } as const;
/** One column with the canvas notes on one line (the case the skeleton missed by 24 px). */
const ONE_COLUMN = { width: 900, height: 800 } as const;
const DESKTOP = { width: 1280, height: 800 } as const;

const heightOf = (locator: Locator) =>
  locator.evaluate((node) => node.getBoundingClientRect().height);

for (const [name, size] of [
  ['360 px', PHONE],
  ['414 px', WIDE_PHONE],
  ['540 px', SMALL_TABLET],
  ['559 px', MAP_UNDER_SWITCH],
  ['562 px', MAP_PAST_SWITCH],
  ['900 px', ONE_COLUMN],
  ['1 280 px', DESKTOP],
] as const) {
  test(`a ${name}, el esqueleto reserva la altura del laboratorio y el mapa no crece al montarse`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Hold the route data: the skeleton stays until the test lets the chunk through.
    await page.route(/drone-route/, async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto(PAGE);
    const skeleton = page.getByTestId('drone-lab-loading');
    await skeleton.scrollIntoViewIfNeeded();
    const skeletonCard = await heightOf(skeleton.locator('[data-lab-shell="tiered"]'));
    // The map's height the instant it enters the page: before SvgPlot has measured its width.
    await page.evaluate(() => {
      new MutationObserver((_records, observer) => {
        const map = document.querySelector('[data-testid="route-map"]');
        if (!map) return;
        Object.assign(window, { mapAtMount: map.getBoundingClientRect().height });
        observer.disconnect();
      }).observe(document.body, { childList: true, subtree: true });
    });

    release();
    await expect(page.locator(LAB)).toBeVisible();
    const mapAtMount = await page.evaluate(
      () => (window as unknown as { mapAtMount: number }).mapAtMount,
    );
    const labCard = await heightOf(page.locator(LAB));
    // Settled once SvgPlot has measured: its viewBox then has the map's own width.
    const map = page.getByTestId('route-map').locator('svg[role="img"]');
    await expect
      .poll(() =>
        map.evaluate((svg) => {
          const box = svg.getBoundingClientRect();
          return Math.abs((svg as SVGSVGElement).viewBox.baseVal.width - box.width);
        }),
      )
      .toBeLessThanOrEqual(1);
    const mapSettled = await heightOf(page.getByTestId('route-map'));

    expect(Math.abs(labCard - skeletonCard)).toBeLessThanOrEqual(SKELETON_SLACK_PX);
    expect(Math.abs(mapSettled - mapAtMount)).toBeLessThanOrEqual(MAP_GROWTH_SLACK_PX);
  });
}
