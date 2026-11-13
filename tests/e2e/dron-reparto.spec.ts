import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  labOrPlaceholder,
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
  await labOrPlaceholder(page, 'drone-lab').scrollIntoViewIfNeeded();
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
  await expect(usage.getByText(/«Tramo» va a velocidad real/)).toBeHidden();

  await usage.locator('summary').click();
  await leftOut.locator('summary').press('Enter');

  await expect(usage.getByText(/«Tramo» va a velocidad real/)).toBeVisible();
  await expect(usage).toContainText('«Ruta», 4 veces más rápida que el vuelo');
  await expect(usage).toContainText('con movimiento reducido');
  await expect(usage).toContainText('Arrastra las paradas A, B y C');
  for (const left of ['2,5 m/s²', 'vértice', 'viento', 'diferencias centrales']) {
    await expect(leftOut).toContainText(left);
  }
});

test('el laboratorio va por niveles: v_máx y a_máx, el escenario con la vista, las lecturas y las fichas del cajón', async ({
  page,
}) => {
  const lab = page.locator(LAB);
  const params = lab.getByRole('region', { name: 'Parámetros' });
  await expect(params.getByRole('slider', { name: /^Rapidez máxima/ })).toBeVisible();
  await expect(params.getByRole('slider', { name: /^Aceleración máxima/ })).toBeVisible();
  const scenario = lab.getByRole('region', { name: 'Escenario' });
  await expect(scenario.getByRole('radio', { name: 'Tramo' })).toBeChecked();
  await expect(scenario.getByRole('radio', { name: 'Ruta' })).not.toBeChecked();
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

/** The stops of the declared route, in m: where a mark says the drone is at rest. */
const STOP_POSITIONS = {
  A: { x: '600,00 m', y: '200,00 m' },
  B: { x: '900,00 m', y: '800,00 m' },
  C: { x: '300,00 m', y: '1 100,00 m' },
  Depósito: { x: '0,00 m', y: '0,00 m' },
} as const;
/**
 * Clock seconds a view plays before the real seconds that took are read, and the real seconds
 * allowed: at ×1 and ×4 reaching them takes about 1,5 s and 1,5 s (at the other speed, 0,4 s or
 * 6 s), so the bounds tell the two apart with room for a loaded machine.
 */
const TRAMO_REACH_S = { clock: 1.5, realMin: 1.2, realMax: 4 };
const RUTA_REACH_S = { clock: 6, realMin: 0.8, realMax: 3.5 };
const POLL_INTERVAL_MS = 50;
/** The settled marks under the timeline of each view (the mark count is the model's). */
const TRAMO_MARKS = 4;
const RUTA_MARKS = 5;

const timelineOf = (page: Page) =>
  page.locator(LAB).getByRole('slider', { name: 'Línea de tiempo' });
const marksOf = (page: Page) => page.locator(`${LAB} [data-transport-mark]`);
const badgeOf = (page: Page) => page.locator(`${LAB} [data-time-scale-badge]`);
const eventButton = (page: Page, name: 'Evento anterior' | 'Evento siguiente') =>
  page.locator(LAB).getByRole('button', { name });
const chooseView = (page: Page, view: 'Tramo' | 'Ruta') =>
  page
    .locator(LAB)
    .getByRole('region', { name: 'Escenario' })
    .getByText(view, { exact: true })
    .click();

/** The t of the transport's reading («t = 4,00 s · …»), in s. */
async function timelineSeconds(page: Page): Promise<number> {
  const text = (await timelineOf(page).getAttribute('aria-valuetext')) ?? '';
  return Number(
    /t = ([\d\s\u202f]+(?:,\d+)?)/u
      .exec(text)?.[1]
      .replace(/[\s\u202f]/gu, '')
      .replace(',', '.'),
  );
}

test.describe('las vistas «Tramo» y «Ruta»', () => {
  /** The leg chosen in «Tramo» by its option label, or the whole route. */
  const ONE_T_VIEWS = [
    'Del depósito a A',
    'De A a B',
    'De B a C',
    'De C al depósito',
    'Ruta',
  ] as const;

  for (const view of ONE_T_VIEWS) {
    test(`un solo t en «${view}»: la línea, «Instante en la ruta» y el cursor de las gráficas dicen el mismo`, async ({
      page,
    }) => {
      if (view === 'Ruta') await chooseView(page, 'Ruta');
      else {
        await page
          .locator(LAB)
          .getByRole('combobox', { name: 'Tramo mostrado' })
          .selectOption({ label: view });
      }
      await seekTimeline(timelineOf(page), '437');

      const readout = await readoutText(page, 'Instante en la ruta');
      expect(readout).toMatch(/^\d+,\d{2} s$/u);
      // Every reading with its spaces as plain ones (the readout helper writes them so).
      const plain = (text: string | null) => (text ?? '').replace(/\s/gu, ' ');
      expect(plain(await timelineOf(page).getAttribute('aria-valuetext'))).toBe(`t = ${readout}`);
      const chart = page.locator('[data-profile-reading] dd').first();
      expect(plain(await chart.textContent())).toBe(readout);
      const marker = page.locator('[data-profile-marker] text').first();
      expect(plain(await marker.textContent())).toBe(`t = ${readout}`);
    });
  }

  test('abre en «Tramo»: cuatro marcas y «×1 velocidad real» sobre el mapa', async ({ page }) => {
    await expect(marksOf(page)).toHaveCount(TRAMO_MARKS);
    const badge = badgeOf(page);
    await expect(badge).toContainText('×1');
    await expect(badge).toContainText('velocidad real');
    const map = await page.getByTestId('route-map').boundingBox();
    const box = await badge.boundingBox();
    expect(box?.x ?? 0).toBeGreaterThanOrEqual(map?.x ?? Infinity);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
      (map?.x ?? 0) + (map?.width ?? 0),
    );
    expect(box?.y ?? 0).toBeGreaterThanOrEqual(map?.y ?? Infinity);
    await expect(page.getByTestId('drone-view-note')).toHaveText(
      /Sale en t = 0,0\s*s de la ruta y dura 67,2\s*s\./,
    );
  });

  test('«Ruta» pasa a ×4, con una marca por salida y llegada, sin soltar al dron', async ({
    page,
  }) => {
    const before = await readoutText(page, 'Posición x');

    await chooseView(page, 'Ruta');

    await expect(marksOf(page)).toHaveCount(RUTA_MARKS);
    await expect(badgeOf(page)).toContainText('×4');
    await expect(badgeOf(page)).toContainText('cámara rápida');
    expect(await readoutText(page, 'Posición x')).toBe(before);
    await expect(page.locator(LAB).getByRole('combobox', { name: 'Tramo mostrado' })).toHaveCount(
      0,
    );
    await chooseView(page, 'Tramo');
    await expect(badgeOf(page)).toContainText('×1');
  });

  test('«Tramo» corre a velocidad real y «Ruta» cuatro veces más rápido', async ({ page }) => {
    const lab = page.locator(LAB);
    /** Real seconds the timeline takes to read `clock` seconds after pressing play. */
    async function realSecondsToReach(clock: number): Promise<number> {
      await lab.getByRole('button', { name: 'Reiniciar' }).click();
      const started = Date.now();
      await lab.getByRole('button', { name: 'Reproducir' }).click();
      await expect
        .poll(() => timelineSeconds(page), { intervals: [POLL_INTERVAL_MS] })
        .toBeGreaterThanOrEqual(clock);
      const elapsed = (Date.now() - started) / 1000;
      await lab.getByRole('button', { name: 'Pausar' }).click();
      return elapsed;
    }

    const tramo = await realSecondsToReach(TRAMO_REACH_S.clock);
    expect(tramo).toBeGreaterThanOrEqual(TRAMO_REACH_S.realMin);
    expect(tramo).toBeLessThanOrEqual(TRAMO_REACH_S.realMax);

    await chooseView(page, 'Ruta');
    const ruta = await realSecondsToReach(RUTA_REACH_S.clock);
    expect(ruta).toBeGreaterThanOrEqual(RUTA_REACH_S.realMin);
    expect(ruta).toBeLessThanOrEqual(RUTA_REACH_S.realMax);
  });

  test('«Evento siguiente» y «Evento anterior» con el teclado recorren las paradas de la ruta', async ({
    page,
  }) => {
    await chooseView(page, 'Ruta');
    await page.locator(LAB).getByRole('button', { name: 'Reiniciar' }).click();
    const next = eventButton(page, 'Evento siguiente');
    await next.focus();

    for (const stop of ['A', 'B', 'C', 'Depósito'] as const) {
      await page.keyboard.press('Enter');
      const arrival = stop === 'Depósito' ? 'Llegada al depósito' : `Llegada a ${stop}`;
      await expect(timelineOf(page)).toHaveAttribute('aria-valuetext', new RegExp(`· ${arrival}$`));
      // The mark is the instant the drone is on the stop (the 0,1 s samples leave it a hair off).
      expect(await readoutText(page, 'Posición x')).toBe(STOP_POSITIONS[stop].x);
      expect(await readoutText(page, 'Posición y')).toBe(STOP_POSITIONS[stop].y);
      expect(await readoutText(page, 'Rapidez |v|')).toBe('0,00 m/s');
      expect(await readoutText(page, 'Aceleración |a|')).toBe('0,00 m/s²');
      await expect(page.locator(LAB).getByRole('status').filter({ hasText: arrival })).toHaveCount(
        1,
      );
    }
    await expect(next).toHaveAttribute('aria-disabled', 'true');
    await expect(next).toBeFocused();

    const previous = eventButton(page, 'Evento anterior');
    await previous.focus();
    await page.keyboard.press('Enter');
    await expect(timelineOf(page)).toHaveAttribute('aria-valuetext', /· Llegada a C$/);
  });

  test('en «Tramo» las marcas cuentan cómo acelera, cruza y frena entre dos paradas', async ({
    page,
  }) => {
    await page.locator(LAB).getByRole('button', { name: 'Reiniciar' }).click();
    const next = eventButton(page, 'Evento siguiente');
    await next.focus();
    const heard: string[] = [];
    const phase = page.locator(`${LAB} [data-lab-canvas-notes] p`, { hasText: 'Fase:' });
    // Each mark is a sample of the flight, so it reads the phase it names, with no blend.
    const phases = ['crucero', 'frenando', 'detenido en un vértice'];

    for (let i = 0; i < TRAMO_MARKS - 1; i += 1) {
      await page.keyboard.press('Enter');
      await expect(phase).toContainText(phases[i]);
      heard.push((await timelineOf(page).getAttribute('aria-valuetext')) ?? '');
    }

    expect(heard.map((text) => text.replace(/^.* · /u, ''))).toEqual([
      'Fin de la aceleración',
      'Inicio del frenado',
      'Llegada a A',
    ]);
  });

  test('cambiar de tramo abre el nuevo en crucero y dice cuándo sale en la ruta', async ({
    page,
  }) => {
    const leg = page.locator(LAB).getByRole('combobox', { name: 'Tramo mostrado' });

    await leg.selectOption({ label: 'De B a C' });

    await expect(page.getByTestId('drone-view-note')).toHaveText(
      /Sale en t = 178,3\s*s de la ruta y dura 71,1\s*s\./,
    );
    await expect(
      page.locator(`${LAB} [data-lab-canvas-notes] p`, { hasText: 'Fase:' }),
    ).toContainText('crucero');
    await expect(marksOf(page)).toHaveCount(TRAMO_MARKS);
    expect(await readoutText(page, 'Instante en la ruta')).toBe('208,30 s');
    // One t on screen: the transport and the drone read the route's too, not the leg's own clock.
    await expect(timelineOf(page)).toHaveAttribute('aria-valuetext', /^t = 208,30\ss$/u);
    await expect(page.getByTestId('drone-marker')).toHaveAttribute(
      'aria-valuetext',
      /^t = 208,30\ss$/u,
    );
    // The charts below read the same instant of the route, not the leg's own clock.
    await expect(page.locator('[data-profile-marker]').first()).toHaveAttribute(
      'data-marker-t',
      /^208\.3/,
    );
  });

  test('las flechas del teclado cambian la vista y el dron queda dentro del tramo', async ({
    page,
  }) => {
    const tramo = page.locator(LAB).getByRole('radio', { name: 'Tramo' });
    await tramo.focus();

    await page.keyboard.press('ArrowRight');
    await expect(page.locator(LAB).getByRole('radio', { name: 'Ruta' })).toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(tramo).toBeChecked();

    const drone = page.getByTestId('drone-marker');
    await drone.focus();
    await page.keyboard.press('End');
    expect(Number(await drone.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(67.3);
  });

  test('mover una parada con el teclado sigue marcando la ruta como modificada en las dos vistas', async ({
    page,
  }) => {
    await chooseView(page, 'Ruta');
    await page.getByTestId('stop-A').focus();
    await page.keyboard.press('Shift+ArrowRight');

    await expect(page.getByTestId('route-modified')).toBeVisible();
    await expect(marksOf(page)).toHaveCount(RUTA_MARKS);
  });
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

/** Each part of the loaded lab and its place in the skeleton: measured in rem (≤ 2 px apart). */
const SKELETON_SLACK_PX = 2;
/** The map's height may move by this much while it mounts: rounding of a fractional width. */
const MAP_GROWTH_SLACK_PX = 1;
/**
 * Windows where the skeleton is checked, at the site's 16 px root: both sides of each of its six
 * steps (330, 336, 355, 406 and 562 px in one column, 1 070 in two; see DroneSkeleton), the phones
 * between (360, 375, 390), 414, 540 (the other labs' hydration check), 559 (SvgPlot's switch to its
 * wide drawing), 900 (one column, the panel in two), 1 058 (two columns from there) and 1 280. The
 * page is at its 16 px root: nothing forces it here.
 */
const SKELETON_WIDTHS = [
  329, 330, 335, 336, 354, 355, 360, 375, 390, 405, 406, 414, 540, 559, 561, 562, 900, 1058, 1069,
  1070, 1280,
] as const;
const VIEWPORT_HEIGHT = 800;

const heightOf = (locator: Locator) =>
  locator.evaluate((node) => node.getBoundingClientRect().height);

/** The heights of a card's parts: header, stage cell, panel cell, canvas notes, disclosures. */
function cardParts(card: Locator, selectors: { stage: string; panel: string; notes: string }) {
  return card.evaluate((root, parts) => {
    const height = (node: Element | null | undefined) => node?.getBoundingClientRect().height ?? 0;
    return {
      card: height(root),
      header: height(root.children[0]),
      stage: height(root.querySelector(parts.stage)),
      panel: height(root.querySelector(parts.panel)),
      notes: height(root.querySelector(parts.notes)),
      disclosures: height(root.children[2]),
    };
  }, selectors);
}

const SKELETON_PARTS = {
  stage: '[data-skeleton="stage"]',
  panel: '[data-skeleton="panel"]',
  notes: ':scope > :nth-child(2) > :nth-child(3)',
};
const LAB_PARTS = {
  stage: ':scope > :nth-child(2) > :nth-child(1)',
  panel: ':scope > :nth-child(2) > :nth-child(2)',
  notes: '[data-lab-canvas-notes]',
};

/** Loads Tema 1 holding its route data, measures the skeleton, then lets the lab in. */
async function skeletonAgainstLab(page: Page, width: number) {
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
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
  await page.evaluate(() => document.fonts.ready);
  const placeHeights = await cardParts(
    skeleton.locator('[data-lab-shell="tiered"]'),
    SKELETON_PARTS,
  );
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
  const partHeights = await cardParts(page.locator(LAB), LAB_PARTS);
  return { placeHeights, partHeights, mapAtMount };
}

/** The parts whose place differs from them by more than the slack, said. */
function partsApart(places: Record<string, number>, parts: Record<string, number>): string[] {
  return Object.keys(places).flatMap((key) =>
    Math.abs(places[key] - parts[key]) > SKELETON_SLACK_PX
      ? [`${key}: esqueleto ${places[key].toFixed(1)} px, laboratorio ${parts[key].toFixed(1)} px`]
      : [],
  );
}

for (const width of SKELETON_WIDTHS) {
  test(`a ${width} px, cada lugar del esqueleto mide lo que su parte del laboratorio y el mapa no crece al montarse`, async ({
    page,
  }) => {
    const { placeHeights, partHeights, mapAtMount } = await skeletonAgainstLab(page, width);
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

    expect(partsApart(placeHeights, partHeights)).toEqual([]);
    expect(Math.abs(mapSettled - mapAtMount)).toBeLessThanOrEqual(MAP_GROWTH_SLACK_PX);
  });
}
