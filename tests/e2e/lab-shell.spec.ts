import { expect, test, type Locator, type Page } from '@playwright/test';
import { labOrPlaceholder, readoutText, waitForIsland } from './helpers';
import {
  compareHydrated,
  drawingWidths,
  expectSameHeightAfterHydration,
  holdMeasuring,
  HYDRATION_WIDTHS,
  measureServer,
  releaseMeasuring,
} from './hydrationStability';
import { TOPIC_PAGES } from './topicPages';

const DESKTOP = { width: 1280, height: 800 };
/**
 * The labs whose scene alone fills the first screen at 1 280 × 800, so their first slider cannot
 * share it (Dylan 2026-11-16, «8 de 9»): Tema 1's map is 708 px tall at the column's 766 px.
 * For them the scene itself must still fit.
 */
const SCENE_FILLS_FIRST_SCREEN: ReadonlySet<string> = new Set(['drone-lab']);
const JUMP_PAGE = './temas/salto-personaje/';
const JUMP_LAB = 'jump-lab';
const LABS = TOPIC_PAGES.map(({ path, labTestId }) => ({ path, testId: labTestId }));
const SETTINGS_TITLE = /^Ajustes: /;
const WHEEL_PX = 400;
/** LabShell's READOUT_ANNOUNCE_DELAY_MS: readouts are spoken once still for this long. */
const READOUT_SETTLE_MS = 750;
/** Frames the self-check gives a comparison to (wrongly) finish while measuring is held. */
const HELD_FRAMES = 30;
/** Sub-pixel rounding of two boxes that should share an edge or a centre. */
const ALIGN_SLACK_PX = 2;
const SCROLL_INTO_LAB_PX = 300;
/** The first physical control of a lab: the first field of its «Parámetros». */
const FIRST_CONTROL = ':is(input, select, textarea, [role="slider"], [role="radio"])';
/** Anything that is or may become a control: none may sit in a lab's canvas notes. */
const CONTROL = ':is(a, button, input, select, textarea, summary, [tabindex]:not([tabindex^="-"]))';
/** Sub-pixel rounding of a box against the boxes it is made of. */
const LAYOUT_SLACK_PX = 1;
/** The transport's event buttons, in the order Tab reaches them after the timeline. */
const EVENT_BUTTONS = ['Evento anterior', 'Evento siguiente'] as const;
/**
 * Every lab on the tiered shell (LabShell `levels`), listed by hand: a checklist kept beside
 * topicPages.ts. The generic tests below open each topic page's lab (LABS); «… dibuja solo su
 * laboratorio…» fails when a page renders a lab that is not its own, one that is not tiered, or
 * one missing here.
 */
const MIGRATED_LABS: ReadonlySet<string> = new Set([
  'drone-lab',
  'jump-lab',
  'habitat-lab',
  'tyre-lab',
  'trigger-lab',
  'regen-lab',
  'bounce-lab',
  'wheel-lab',
  'flyby-lab',
  'spring-lab',
  'synth-lab',
]);
/** One column at every width: two desktops, below lg (no topic bar), 200 % zoom and two phones. */
const VIEWPORTS = [
  { name: '1 280 × 800', size: { width: 1280, height: 800 } },
  { name: '1 440 × 900', size: { width: 1440, height: 900 } },
  { name: '900 × 800', size: { width: 900, height: 800 } },
  { name: '960 × 540 (1 920 × 1 080 al 200 %)', size: { width: 960, height: 540 } },
  { name: '390 × 844', size: { width: 390, height: 844 } },
  { name: '360 × 800', size: { width: 360, height: 800 } },
] as const;

test.use({ viewport: DESKTOP });

async function openLab(
  page: Page,
  path: string,
  testId: string,
  options?: { drawingsMeasured?: boolean },
): Promise<Locator> {
  await page.goto(path);
  const lab = page.getByTestId(testId);
  // Tema 1's lab shows a placeholder while its dataset chunk loads.
  await labOrPlaceholder(page, testId).scrollIntoViewIfNeeded();
  await expect(lab).toBeVisible();
  await waitForIsland(page, `[data-testid="${testId}"]`, options);
  return lab;
}

test('el panel de ajustes bloquea el desplazamiento sin mover la página y lo devuelve al cerrar', async ({
  page,
}) => {
  const lab = await openLab(page, JUMP_PAGE, JUMP_LAB);
  const gear = lab.getByRole('button', { name: 'Ajustes del simulador' });
  const articleLeft = () =>
    page
      .locator('article')
      .first()
      .evaluate((node) => node.getBoundingClientRect().left);
  const before = await articleLeft();

  await gear.click();
  await expect(page.getByRole('dialog', { name: SETTINGS_TITLE })).toBeVisible();
  const scrollWhileOpen = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, WHEEL_PX);

  await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
  expect(await articleLeft()).toBe(before);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollWhileOpen);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: SETTINGS_TITLE })).toBeHidden();
  await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
  await expect(gear).toBeFocused();
});

test('un decimal elegido en el salto rige también las lecturas del hábitat', async ({ page }) => {
  const jump = await openLab(page, JUMP_PAGE, JUMP_LAB);
  await jump.getByRole('button', { name: 'Ajustes del simulador' }).click();
  const dialog = page.getByRole('dialog', { name: SETTINGS_TITLE });
  await dialog.getByRole('tab', { name: 'Global' }).click();
  await dialog.getByText('1', { exact: true }).click();
  await page.keyboard.press('Escape');

  await openLab(page, './temas/gravedad-artificial/', 'habitat-lab');
  for (const label of ['Velocidad angular $\\omega$', 'Velocidad tangencial $v$', 'Período $T$']) {
    expect(await readoutText(page, '[data-testid="habitat-lab"]', label)).toMatch(/^\d+,\d\s\S+$/);
  }
});

test('el título del panel solo es un encabezado mientras el panel está abierto', async ({
  page,
}) => {
  const lab = await openLab(page, JUMP_PAGE, JUMP_LAB);

  await expect(page.getByRole('heading', { name: SETTINGS_TITLE })).toHaveCount(0);
  await lab.getByRole('button', { name: 'Ajustes del simulador' }).click();
  await expect(page.getByRole('heading', { name: SETTINGS_TITLE })).toHaveCount(1);
});

test('la búsqueda no indexa el título del panel de ajustes', async ({ page }) => {
  await page.goto(JUMP_PAGE);
  await waitForIsland(page, 'input[type="search"]');

  await page.getByRole('searchbox', { name: 'Buscar en el portafolio' }).fill('Ajustes');

  await expect(page.getByRole('status').filter({ hasText: 'Sin resultados' })).toHaveCount(1);
});

test('las lecturas se anuncian una vez quietas, no en cada pulsación', async ({ page }) => {
  const lab = await openLab(page, JUMP_PAGE, JUMP_LAB);
  const announcer = lab.getByTestId('readout-announcer');
  await expect(announcer).toHaveAttribute('aria-live', 'polite');
  await expect(announcer).toHaveText('');

  const handle = lab.getByTestId('launch-handle');
  await handle.focus();
  // A monotonic clock: the wall clock (Date.now) can step back mid-test (seen under WSL).
  const pressedAt = performance.now();
  await handle.press('ArrowUp');
  // One read, no retries: still inside the settle window, nothing has been announced yet.
  const early = (await announcer.textContent()) ?? '';
  const readAfterMs = performance.now() - pressedAt;
  if (readAfterMs < READOUT_SETTLE_MS) expect(early).toBe('');

  await expect.poll(async () => (await announcer.textContent()) ?? '').toContain('Altura máxima:');
  expect(performance.now() - pressedAt).toBeGreaterThanOrEqual(READOUT_SETTLE_MS);
});

for (const { path, testId } of LABS) {
  test(`cada manejador de ${testId} muestra el anillo de foco con el teclado`, async ({ page }) => {
    const lab = await openLab(page, path, testId);
    const handles = await lab.locator('svg [role="slider"]').all();
    expect(handles.length).toBeGreaterThan(0);

    for (const handle of handles) {
      const name = (await handle.getAttribute('aria-label')) ?? '';
      expect(name.length, 'nombre accesible').toBeGreaterThan(0);
      expect(await handle.getAttribute('aria-valuetext'), name).toBeTruthy();
      // A key press first, so the browser treats the scripted focus as keyboard focus.
      await page.keyboard.press('Shift');
      await handle.focus();
      const ring = handle.locator('circle[stroke="var(--accent)"]');
      await expect(ring, name).toHaveCSS('opacity', '1');
    }
  });
}

/** Opens a topic page's lab, which must be on the tiered shell. */
async function openTiered(page: Page, path: string, testId: string): Promise<Locator> {
  const lab = await openLab(page, path, testId);
  await expect(lab, `${testId} va por niveles`).toHaveAttribute('data-lab-shell', 'tiered');
  return lab;
}

/** Scrolls the page so the lab's top sits `below` px under the window's top. */
async function scrollLabTo(lab: Locator, below: number): Promise<void> {
  await lab.evaluate(
    (node, offset) =>
      window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - offset),
    below,
  );
}

/** A CSS length resolved in the page, in px (a probe of that height). */
async function cssLengthPx(page: Page, length: string): Promise<number> {
  return page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.height = value;
    document.body.append(probe);
    const height = probe.getBoundingClientRect().height;
    probe.remove();
    return height;
  }, length);
}

/** Where a stage that fits the window sticks: under the topic bar (its clearance). */
const stickyTop = (page: Page) => cssLengthPx(page, 'var(--topic-bar-clearance)');

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('sin caja');
  return box;
}

/** The controls inside a lab's canvas notes, described; empty when it has none or no notes. */
async function canvasNotesControls(lab: Locator): Promise<string[]> {
  return lab
    .locator(`[data-lab-canvas-notes] ${CONTROL}`)
    .evaluateAll((nodes) =>
      nodes.map((node) => `${node.tagName.toLowerCase()} «${(node.textContent ?? '').trim()}»`),
    );
}

/**
 * The card's own parts that take no height yet push what follows (an empty place with its
 * margin): none may be left, whatever the lab declares (no charts, no canvas notes, no notes).
 */
async function emptyPlaces(lab: Locator): Promise<string[]> {
  return lab.evaluate((root) =>
    [...root.children].flatMap((node) => {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.position === 'absolute') return [];
      const margin = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
      const isEmpty = node.getBoundingClientRect().height === 0;
      const name = [...node.attributes]
        .filter(({ name: attribute }) => attribute.startsWith('data-'))
        .map(({ name: attribute }) => `[${attribute}]`)
        .join('');
      return isEmpty && margin > 0 ? [`${node.tagName.toLowerCase()}${name} (${margin} px)`] : [];
    }),
  );
}

/** Everything in the lab, its drawer aside, that sticks to or is fixed in the window. */
async function pinned(lab: Locator): Promise<string[]> {
  return lab.evaluate((root) =>
    [...root.querySelectorAll('*')]
      .filter((node) => !node.closest('dialog'))
      .filter((node) => ['sticky', 'fixed'].includes(getComputedStyle(node).position))
      .map((node) => node.tagName.toLowerCase()),
  );
}

test.describe('guardias del cascarón por niveles, autocomprobadas', () => {
  test.use({ viewport: DESKTOP });

  test('un botón inyectado en las notas del lienzo pone en rojo la guardia de controles', async ({
    page,
  }) => {
    const lab = await openTiered(page, './temas/asistencia-gravitatoria/', 'flyby-lab');
    expect(await canvasNotesControls(lab)).toEqual([]);

    await lab.evaluate((root) =>
      root
        .querySelector('[data-lab-canvas-notes]')
        ?.insertAdjacentHTML('beforeend', '<button type="button">Ir a la descarga</button>'),
    );

    expect(await canvasNotesControls(lab)).toEqual(['button «Ir a la descarga»']);
  });

  test('un lugar vacío con su margen pone en rojo la guardia de huecos', async ({ page }) => {
    const lab = await openTiered(page, './temas/asistencia-gravitatoria/', 'flyby-lab');
    expect(await emptyPlaces(lab)).toEqual([]);

    await lab.evaluate((root) =>
      root
        .querySelector('[data-lab-canvas-notes]')
        ?.insertAdjacentHTML('beforebegin', '<div data-lab-charts style="margin-top: 48px"></div>'),
    );

    expect(await emptyPlaces(lab)).toEqual(['div[data-lab-charts] (48 px)']);
  });

  test('un elemento pegado inyectado pone en rojo la guardia de lo que se pega', async ({
    page,
  }) => {
    const lab = await openTiered(page, './temas/asistencia-gravitatoria/', 'flyby-lab');
    expect(await pinned(lab)).toEqual([]);

    await lab.evaluate((root) =>
      root.querySelector('[data-lab-transport]')?.setAttribute('style', 'position: sticky'),
    );

    expect(await pinned(lab)).toEqual(['div']);
  });

  test('con la medición retenida, la comprobación de hidratación no acepta antes de que los dibujos midan', async ({
    page,
    browser,
  }) => {
    // Tema 7 at 360 px: before measuring, its scene (a fixed height) already has the server's
    // height and no plot to look letterboxed, so only the wait tells the two apart.
    const lab = '[data-testid="bounce-lab"]';
    const path = './temas/coeficiente-restitucion/';
    const width = 360;
    const sent = await measureServer(browser, path, lab, width);
    await page.setViewportSize({ width, height: 800 });
    await holdMeasuring(page);
    // Hydrated, not measured: the measures are held, and that is what is being checked.
    await openLab(page, path, 'bounce-lab', { drawingsMeasured: false });
    await page.evaluate(() => document.fonts.ready);

    // What a comparison right after waitForIsland reads: the drawing as the server drew it.
    const early = await drawingWidths(page, lab);

    // The comparison starts while measuring is held: it must still be waiting some frames later
    // (frames, not a clock), and accept only the measured drawing once the reports are let through.
    let isDone = false;
    const accepted = compareHydrated(page, lab, sent, width).then((widths) => {
      isDone = true;
      return widths;
    });
    for (let frame = 0; frame < HELD_FRAMES && !isDone; frame += 1) {
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    }
    expect(isDone, 'aceptó con la medición retenida').toBe(false);
    await releaseMeasuring(page);
    const widths = await accepted;

    expect(widths).not.toEqual(early);
    const boxes = await page
      .locator(`${lab} [data-lab-canvas] svg[data-testid]`)
      .evaluateAll((svgs) => svgs.map((svg) => Math.round(svg.getBoundingClientRect().width)));
    expect(widths.map(Math.round)).toEqual(boxes);
  });
});

for (const { path, testId } of LABS) {
  test(`${path} dibuja solo su laboratorio, por niveles y en MIGRATED_LABS`, async ({ page }) => {
    await openLab(page, path, testId);
    const labs = await page.locator('[data-testid$="-lab"]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        testId: node.getAttribute('data-testid') ?? '',
        shell: node.getAttribute('data-lab-shell') ?? '',
      })),
    );

    // Only its own: a second lab on the page would get none of the generic tests below.
    expect(labs.map((lab) => lab.testId)).toEqual([testId]);
    for (const { testId, shell } of labs) {
      expect(shell, `${testId}: data-lab-shell`).toBe('tiered');
      expect(MIGRATED_LABS.has(testId), `${testId} está en MIGRATED_LABS`).toBe(true);
    }
  });
}

/** Text at 200 % in the browser's settings: the root at 32 px, not a zoomed 960 px window. */
const ROOT_TEXT_200 = 'html { font-size: 200% !important; }';

for (const { path, testId } of LABS) {
  test(`${path}: con el texto al 200 % (raíz de 32 px) a 1 280 px, el zoom no sale de la tarjeta`, async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(path);
    await page.addStyleTag({ content: ROOT_TEXT_200 });
    await labOrPlaceholder(page, testId).scrollIntoViewIfNeeded();
    const lab = page.getByTestId(testId);
    await waitForIsland(page, `[data-testid="${testId}"]`);

    // WCAG 1.4.4: the zoom strips stack under their bar instead of running past the card.
    const card = await boxOf(lab);
    for (const zoom of await lab.locator('[data-zoom-controls]').all()) {
      const box = await boxOf(zoom);
      expect(box.x, 'el zoom empieza en la tarjeta').toBeGreaterThanOrEqual(card.x);
      expect(box.x + box.width, 'el zoom acaba en la tarjeta').toBeLessThanOrEqual(
        card.x + card.width + LAYOUT_SLACK_PX,
      );
    }
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, 'sin desplazamiento horizontal').toBeLessThanOrEqual(DESKTOP.width);
  });
}

/** Tema 1's lab loads its dataset after hydration: its skeleton has its own test (dron-reparto). */
const SKELETON_FIRST_LABS: ReadonlySet<string> = new Set(['drone-lab']);

for (const { path, testId } of LABS) {
  if (SKELETON_FIRST_LABS.has(testId)) continue;
  for (const width of HYDRATION_WIDTHS) {
    test(`${testId} a ${width} px: el servidor dibuja el laboratorio con el alto que tendrá hidratado`, async ({
      browser,
    }) => {
      await expectSameHeightAfterHydration(browser, path, `[data-testid="${testId}"]`, width);
    });
  }
}

/** The boxes of a lab's parts, top to bottom, as laid out now (null for a part it has not). */
async function partBoxes(lab: Locator) {
  return lab.evaluate((root) => {
    const box = (selector: string) => {
      const node = root.querySelector(selector);
      if (!node) return null;
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height, bottom: y + height };
    };
    return {
      canvas: box('[data-lab-canvas]'),
      transport: box('[data-lab-transport]'),
      panel: box('[data-lab-panel]'),
      readouts: box('[data-lab-level="readouts"]'),
      charts: box('[data-lab-charts]'),
      notes: box('[data-lab-canvas-notes]'),
    };
  });
}

for (const { path, testId } of LABS) {
  test.describe(`${testId} por niveles`, () => {
    for (const { name, size } of VIEWPORTS) {
      test(`a ${name}: una columna, el lienzo a todo el ancho y todo debajo en el orden de lectura; nada se pega`, async ({
        page,
      }) => {
        await page.setViewportSize(size);
        const lab = await openTiered(page, path, testId);
        await scrollLabTo(lab, -SCROLL_INTO_LAB_PX);

        expect(await pinned(lab), 'nada se pega a la ventana').toEqual([]);
        const parts = await partBoxes(lab);
        const { canvas, panel } = parts;
        if (!canvas || !panel) throw new Error('sin lienzo o sin panel');
        // The canvas is the column's: the deck's width, plus the bleed on a narrow card.
        const bleed = panel.width < (await cssLengthPx(page, '36rem')) ? 24 : 0;
        expect(Math.abs(canvas.width - (panel.width + bleed))).toBeLessThanOrEqual(LAYOUT_SLACK_PX);
        // Top to bottom in the order of reading: scene, transport, deck, plots, canvas notes.
        const order = [canvas, parts.transport, panel, parts.charts, parts.notes].filter(
          (part) => part !== null,
        );
        order.slice(1).forEach((part, index) => {
          expect(part.y, `parte ${index + 1} bajo la anterior`).toBeGreaterThanOrEqual(
            order[index].bottom - LAYOUT_SLACK_PX,
          );
        });
        // The panel has no scroll of its own: the readouts are reached by scrolling the page.
        const panelScroll = await lab.locator('[data-lab-panel]').evaluate((node) => ({
          overflow: getComputedStyle(node).overflowY,
          hidden: node.scrollHeight - node.clientHeight,
        }));
        expect(panelScroll.overflow).toBe('visible');
        expect(panelScroll.hidden).toBeLessThanOrEqual(LAYOUT_SLACK_PX);
      });
    }

    test('a 1 280 × 800 la escena (a todo el ancho de la columna) y el primer control caben en la primera pantalla', async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      const lab = await openTiered(page, path, testId);
      // The scene's top just under the topic bar (the card's title row scrolled away): the
      // window's room for the scene and the deck is its height less the bar's clearance.
      await lab
        .locator('[data-lab-canvas]')
        .evaluate(
          (node, top) =>
            window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - top),
          await stickyTop(page),
        );

      const canvas = await boxOf(lab.locator('[data-lab-canvas]'));
      // Never smaller than before phases B–D (725–761 px at 1 280): the article column's width.
      expect(canvas.width).toBeGreaterThanOrEqual(725);
      expect(canvas.y + canvas.height, 'la escena cabe').toBeLessThanOrEqual(DESKTOP.height);
      const params = lab.getByRole('region', { name: 'Parámetros' });
      const control = await boxOf(params.locator(FIRST_CONTROL).first());
      expect(control.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
      if (!SCENE_FILLS_FIRST_SCREEN.has(testId)) {
        expect(control.y + control.height, 'el primer control cabe con ella').toBeLessThanOrEqual(
          DESKTOP.height,
        );
      }
    });

    test('a 1 280 px los parámetros van de dos en dos y las lecturas de cuatro en cuatro', async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      const lab = await openTiered(page, path, testId);
      const tops = (selector: string) =>
        lab
          .locator(selector)
          .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));

      const fields = await tops('[data-lab-level="params"] > [data-param-field]');
      if (fields.length >= 2) {
        expect(Math.abs(fields[0] - fields[1]), 'dos parámetros en una fila').toBeLessThanOrEqual(
          ALIGN_SLACK_PX,
        );
      }
      const readouts = await tops('[data-lab-level="readouts"] > [data-readout]');
      expect(readouts.length).toBeGreaterThan(0);
      const firstRow = readouts.filter((top) => Math.abs(top - readouts[0]) <= ALIGN_SLACK_PX);
      expect(firstRow.length, 'lecturas en la primera fila').toBe(Math.min(4, readouts.length));
    });

    test('al editar un valor que deja el preajuste, la nota sigue («Valores modificados…») y el panel no cambia de alto', async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      const lab = await openTiered(page, path, testId);
      const presets = lab.locator('[data-lab-presets]');
      if ((await presets.count()) === 0) return; // Tema 1 has no presets.
      const note = lab.getByTestId('preset-note');
      // A lab that opens on its own values (Temas 3 and 4): choose its first preset.
      if ((await note.count()) === 0) {
        const chip = presets.getByRole('group').getByRole('button').first();
        if ((await chip.count()) > 0) await chip.click();
        else await presets.locator('select').selectOption({ index: 1 });
        await expect(note).toBeVisible();
      }
      const panel = lab.locator('[data-lab-panel]');
      const before = (await boxOf(panel)).height;

      const field = lab
        .getByRole('region', { name: 'Parámetros' })
        .locator('input[type="range"]')
        .first();
      await field.focus();
      await page.keyboard.press('ArrowRight');

      await expect(note).toHaveText(
        /^Valores modificados a partir de «.+»; la nota describe el preajuste original\./,
      );
      expect(Math.abs((await boxOf(panel)).height - before)).toBeLessThanOrEqual(LAYOUT_SLACK_PX);
    });

    test('las notas del lienzo no tienen controles y no queda ningún lugar vacío', async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      const lab = await openTiered(page, path, testId);

      expect(
        await canvasNotesControls(lab),
        'canvasNotes sin controles (labShellTypes.ts)',
      ).toEqual([]);
      expect(await emptyPlaces(lab)).toEqual([]);
    });

    test('«Restablecer» cierra la fila de los preajustes (o el escenario) y hay uno solo', async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      const lab = await openTiered(page, path, testId);
      const reset = lab.getByRole('button', { name: 'Restablecer', exact: true });

      await expect(reset).toHaveCount(1);
      const scenario = lab.getByRole('region', { name: 'Escenario' });
      await expect(scenario.getByRole('button', { name: 'Restablecer', exact: true })).toHaveCount(
        1,
      );
      const row = lab.locator('[data-preset-row]');
      if ((await row.count()) > 0) {
        await expect(row.locator('[data-lab-reset]')).toHaveCount(1);
        // At the end of the presets' row: its right edge is the row's.
        const [resetBox, rowBox] = [await boxOf(reset), await boxOf(row)];
        expect(
          Math.abs(resetBox.x + resetBox.width - (rowBox.x + rowBox.width)),
        ).toBeLessThanOrEqual(ALIGN_SLACK_PX);
      }
    });

    test('la cabecera es el título y el engranaje, que abre los ajustes y recibe el foco; tras la reproducción el Tab va a los parámetros', async ({
      page,
    }) => {
      await page.setViewportSize(DESKTOP);
      const lab = await openTiered(page, path, testId);
      const gear = lab.getByRole('button', { name: 'Ajustes del simulador' });
      await expect(lab.getByRole('group', { name: 'Ajustes activos' })).toHaveCount(0);
      await expect(gear.locator('xpath=..').locator(':scope > *')).toHaveCount(2);

      await gear.click();
      await expect(page.getByRole('dialog', { name: SETTINGS_TITLE })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(gear).toBeFocused();

      const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });
      if ((await timeline.count()) === 0) return;
      await scrollLabTo(lab, await stickyTop(page));
      // From two events the transport ends with «Evento anterior | siguiente», in the order of
      // reading; with one or none it has no pair.
      const transport = lab.locator('[data-lab-transport]');
      const marks = await transport.locator('[data-transport-mark]').count();
      const eventSteps =
        marks >= 2
          ? EVENT_BUTTONS.map((name) => transport.getByRole('button', { name, exact: true }))
          : [];
      await expect(lab.getByRole('button', { name: /^Evento (anterior|siguiente)$/ })).toHaveCount(
        eventSteps.length,
      );
      const firstControl = lab
        .getByRole('region', { name: 'Parámetros' })
        .locator(FIRST_CONTROL)
        .first();
      await timeline.evaluate((node) => (node as HTMLElement).focus({ preventScroll: true }));
      for (const next of [...eventSteps, firstControl]) {
        // A control already in sight takes the focus without moving the page.
        const box = await boxOf(next);
        const isInSight = box.y >= 0 && box.y + box.height <= DESKTOP.height;
        const before = await page.evaluate(() => window.scrollY);
        await page.keyboard.press('Tab');
        await expect(next).toBeFocused();
        if (isInSight) {
          expect(
            Math.abs((await page.evaluate(() => window.scrollY)) - before),
          ).toBeLessThanOrEqual(LAYOUT_SLACK_PX);
        }
      }
    });
  });
}

/** The labs with a clock: a transport bar. */
const CLOCKED: ReadonlySet<string> = new Set(
  TOPIC_PAGES.filter(({ hasClock }) => hasClock).map(({ labTestId }) => labTestId),
);
/** A desktop (one row of transport), a narrow desktop window, and two phones (three rows). */
const TRANSPORT_WIDTHS = [1280, 1024, 390, 360] as const;

/** The vertical centre of each part of the transport's first row, and the event line's box. */
async function transportRow(transport: Locator) {
  return transport.evaluate((root) => {
    const centre = (selector: string) => {
      const node = root.querySelector(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return box.top + box.height / 2;
    };
    const line = root.querySelector('[data-transport-event]')?.getBoundingClientRect();
    const timeline = root.querySelector('input[type="range"]')?.getBoundingClientRect();
    return {
      play: centre('button'),
      speed: centre('select'),
      timeline: centre('input[type="range"]'),
      time: centre('[data-transport-time]'),
      pair: centre('[data-transport-pair]'),
      line: line ? { top: line.top, left: line.left } : null,
      timelineBox: timeline ? { bottom: timeline.bottom, left: timeline.left } : null,
      height: root.getBoundingClientRect().height,
      width: root.getBoundingClientRect().width,
    };
  });
}

for (const { path, testId } of LABS.filter(({ testId }) => CLOCKED.has(testId))) {
  test(`${testId}: la reproducción va en una fila desde 36 rem, con el evento debajo de la línea, y no cambia de alto mientras t avanza`, async ({
    page,
  }) => {
    for (const width of TRANSPORT_WIDTHS) {
      await page.setViewportSize({ width, height: DESKTOP.height });
      const lab = await openTiered(page, path, testId);
      const transport = lab.locator('[data-lab-transport]');
      const row = await transportRow(transport);
      const isOneRow = row.width >= (await cssLengthPx(page, '36rem'));
      if (isOneRow) {
        for (const part of [row.speed, row.timeline, row.time, row.pair]) {
          if (part === null) continue;
          expect(Math.abs(part - (row.play ?? 0)), `a ${width} px, una fila`).toBeLessThanOrEqual(
            ALIGN_SLACK_PX,
          );
        }
      }
      if (row.line && row.timelineBox) {
        expect(row.line.top, `a ${width} px, el evento bajo la línea`).toBeGreaterThanOrEqual(
          row.timelineBox.bottom - LAYOUT_SLACK_PX,
        );
      }
      // The readout reserves its widest text and the event line its lines: t at the end of the
      // run lays out like t = 0.
      const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });
      await timeline.focus();
      await page.keyboard.press('End');
      await expect(timeline).toHaveValue('1000');
      expect((await transportRow(transport)).height, `a ${width} px, el alto al final`).toBe(
        row.height,
      );
    }
  });
}
