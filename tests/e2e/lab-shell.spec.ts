import { expect, test, type Locator, type Page } from '@playwright/test';
import { cssLengthPxIn, waitForIsland } from './helpers';
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
const JUMP_PAGE = './temas/salto-personaje/';
const JUMP_LAB = 'jump-lab';
const LABS = TOPIC_PAGES.map(({ path, labTestId }) => ({ path, testId: labTestId }));
const SETTINGS_TITLE = /^Ajustes: /;
const WHEEL_PX = 400;
/** LabShell's READOUT_ANNOUNCE_DELAY_MS: readouts are spoken once still for this long. */
const READOUT_SETTLE_MS = 750;
/** Frames the self-check gives a comparison to (wrongly) finish while measuring is held. */
const HELD_FRAMES = 30;
/** Rounding of a sticky offset in rem at the site's root size. */
const STICKY_SLACK_PX = 6;
const SCROLL_INTO_LAB_PX = 300;
/** The first physical control of a lab: the first field of its «Parámetros». */
const FIRST_CONTROL = ':is(input, select, textarea, [role="slider"], [role="radio"])';
/** Anything that is or may become a control: none may sit in a lab's canvas notes. */
const CONTROL = ':is(a, button, input, select, textarea, summary, [tabindex]:not([tabindex^="-"]))';
/** A pinned transport against --lab-transport-room (global.css): rounding of rem at 17 px. */
const TRANSPORT_ROOM_SLACK_PX = 1;
/** Sub-pixel rounding of the columns grid against its cells. */
const LAYOUT_SLACK_PX = 1;
/** The transport's event buttons, in the order Tab reaches them after the timeline. */
const EVENT_BUTTONS = ['Evento anterior', 'Evento siguiente'] as const;
/** What the Tab key reaches, in document order. */
const TABBABLE =
  ':is(a[href], button, input, select, textarea, summary, [tabindex]):not([tabindex="-1"]):not([disabled])';
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
]);
/** Two columns: a desktop window wide enough for the topic bar and a 42rem lab. */
const SPLIT_VIEWPORTS = [
  { name: '1 280 × 800', size: { width: 1280, height: 800 } },
  { name: '1 440 × 900', size: { width: 1440, height: 900 } },
] as const;
/** One column: below lg (no topic bar), and a 1 920 × 1 080 screen at 200 % zoom. */
const ONE_COLUMN_VIEWPORTS = [
  { name: '900 × 800', size: { width: 900, height: 800 } },
  { name: '960 × 540 (1 920 × 1 080 al 200 %)', size: { width: 960, height: 540 } },
] as const;

test.use({ viewport: DESKTOP });

async function openLab(page: Page, path: string, testId: string): Promise<Locator> {
  await page.goto(path);
  const lab = page.getByTestId(testId);
  // Tema 1's lab shows a placeholder while its dataset chunk loads.
  await page
    .locator(`[data-testid="${testId}"], [data-testid="drone-lab-loading"]`)
    .first()
    .scrollIntoViewIfNeeded();
  await expect(lab).toBeVisible();
  await waitForIsland(page, `[data-testid="${testId}"]`);
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

  const habitat = await openLab(page, './temas/gravedad-artificial/', 'habitat-lab');
  for (const label of ['Velocidad angular ω', 'Velocidad tangencial v', 'Período T']) {
    const value = habitat
      .locator('div', { has: page.getByText(label, { exact: true }) })
      .last()
      .locator('span')
      .last();
    await expect(value).toHaveText(/^\d+,\d\s\S+$/);
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

/** The columns' height beyond their cells (row 1) and the canvas notes' row (with its gap). */
async function columnsSlack(lab: Locator): Promise<number> {
  return lab.evaluate((root) => {
    const height = (node: Element | null | undefined) => node?.getBoundingClientRect().height ?? 0;
    const columns = root.querySelector('[data-lab-columns]');
    const notes = root.querySelector('[data-lab-canvas-notes]');
    const rowGap = columns ? parseFloat(getComputedStyle(columns).rowGap) : 0;
    const rowOne = Math.max(
      height(root.querySelector('[data-lab-stage]')?.parentElement),
      height(root.querySelector('[data-lab-panel]')?.parentElement),
    );
    return height(columns) - rowOne - (notes ? rowGap + height(notes) : 0);
  });
}

test.describe('guardias del cascarón por niveles, autocomprobadas', () => {
  test.use({ viewport: SPLIT_VIEWPORTS[0].size });

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

  test('con la medición retenida, la comprobación de hidratación no acepta antes de que los dibujos midan', async ({
    page,
    browser,
  }) => {
    // Tema 7 at 360 px: before measuring, its scene (400 px, a fixed height) already has the
    // server's height and no plot to look letterboxed, so only the wait tells the two apart.
    const lab = '[data-testid="bounce-lab"]';
    const path = './temas/coeficiente-restitucion/';
    const width = 360;
    const sent = await measureServer(browser, path, lab, width);
    await page.setViewportSize({ width, height: 800 });
    await holdMeasuring(page);
    await openLab(page, path, 'bounce-lab');
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

  test('sin notas del lienzo, la rejilla no deja una fila vacía con su hueco', async ({ page }) => {
    const lab = await openTiered(page, './temas/asistencia-gravitatoria/', 'flyby-lab');
    expect(Math.abs(await columnsSlack(lab))).toBeLessThanOrEqual(LAYOUT_SLACK_PX);

    // A lab without canvas notes: the same lab with that cell taken out.
    await lab.evaluate((root) => root.querySelector('[data-lab-canvas-notes]')?.remove());

    expect(Math.abs(await columnsSlack(lab))).toBeLessThanOrEqual(LAYOUT_SLACK_PX);
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

for (const { path, testId } of LABS) {
  test.describe(`${testId} por niveles`, () => {
    for (const { name, size } of SPLIT_VIEWPORTS) {
      test.describe(`a ${name}, en dos columnas`, () => {
        test.use({ viewport: size });

        test('el primer control físico queda en la primera pantalla, junto al lienzo', async ({
          page,
        }) => {
          const lab = await openTiered(page, path, testId);
          await scrollLabTo(lab, await stickyTop(page));

          const params = lab.getByRole('region', { name: 'Parámetros' });
          const control = await boxOf(params.locator(FIRST_CONTROL).first());
          const canvas = await boxOf(lab.locator('[data-lab-canvas]'));
          expect(control.y + control.height).toBeLessThanOrEqual(size.height);
          expect(control.x).toBeGreaterThanOrEqual(canvas.x + canvas.width);
        });

        test('al bajar, el escenario que cabe queda bajo la barra y el panel fluye con la página; uno más alto fluye con la reproducción al pie', async ({
          page,
        }) => {
          const lab = await openTiered(page, path, testId);
          const top = await stickyTop(page);
          const stage = lab.locator('[data-lab-stage]');
          // Measured after hydration: until then nothing sticks (the server's markup). The fit
          // is read again on every poll, so a stage that settles on either side of the line (a
          // late font, a rounding at the threshold) is judged as it ends up, not as it started.
          const fitsNow = async () => String((await boxOf(stage)).height + top <= size.height);
          await expect
            .poll(
              async () => (await stage.getAttribute('data-lab-stage-fits')) === (await fitsNow()),
            )
            .toBe(true);
          const fits = (await stage.getAttribute('data-lab-stage-fits')) === 'true';
          // The panel has no scroll of its own: the readouts are reached by scrolling the page.
          const panelScroll = await lab.locator('[data-lab-panel]').evaluate((node) => ({
            overflow: getComputedStyle(node).overflowY,
            hidden: node.scrollHeight - node.clientHeight,
          }));
          expect(panelScroll.overflow).toBe('visible');
          expect(panelScroll.hidden).toBeLessThanOrEqual(LAYOUT_SLACK_PX);

          // Halfway through the stage's travel in its cell (the row is as tall as the panel).
          const { cellTop, travel } = await stage.evaluate((node) => {
            const cell = node.parentElement?.getBoundingClientRect();
            return {
              cellTop: (cell?.top ?? 0) + window.scrollY,
              travel: (cell?.height ?? 0) - node.getBoundingClientRect().height,
            };
          });
          await page.evaluate(
            (y) => window.scrollTo(0, y),
            cellTop - top + Math.min(Math.max(travel, 0) / 2, SCROLL_INTO_LAB_PX),
          );

          const position = await stage.evaluate((node) => getComputedStyle(node).position);
          expect(position).toBe(fits ? 'sticky' : 'static');
          if (fits && travel > STICKY_SLACK_PX) {
            expect(Math.abs((await boxOf(stage)).y - top)).toBeLessThanOrEqual(STICKY_SLACK_PX);
          }
          const transport = lab.locator('[data-lab-transport]');
          if ((await transport.count()) > 0) {
            const box = await boxOf(transport);
            expect(box.y >= 0 && box.y + box.height <= size.height).toBe(true);
          }
        });
      });
    }

    test('al editar un valor que deja el preajuste, la nota sigue («Partí de…») y el panel no cambia de alto', async ({
      page,
    }) => {
      await page.setViewportSize(SPLIT_VIEWPORTS[0].size);
      const lab = await openTiered(page, path, testId);
      const presets = lab.locator('[data-lab-presets]');
      if ((await presets.count()) === 0) return; // Tema 1 has no presets.
      const note = lab.getByTestId('preset-note');
      // A lab that opens on its own values (Temas 3 and 4): choose its first preset.
      if ((await note.count()) === 0) {
        const chip = presets.getByRole('button').first();
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

      await expect(note).toHaveText(/^Partí de «.+» y cambié algún valor\./);
      expect(Math.abs((await boxOf(panel)).height - before)).toBeLessThanOrEqual(LAYOUT_SLACK_PX);
    });

    test('las notas del lienzo no tienen controles y la rejilla no deja huecos', async ({
      page,
    }) => {
      await page.setViewportSize(SPLIT_VIEWPORTS[0].size);
      const lab = await openTiered(page, path, testId);

      expect(
        await canvasNotesControls(lab),
        'canvasNotes sin controles (labShellTypes.ts)',
      ).toEqual([]);
      expect(Math.abs(await columnsSlack(lab))).toBeLessThanOrEqual(LAYOUT_SLACK_PX);
    });

    test('un control del lienzo enfocado con el teclado no queda tapado por la reproducción pegada abajo', async ({
      page,
    }) => {
      await page.setViewportSize(SPLIT_VIEWPORTS[0].size);
      const lab = await openTiered(page, path, testId);
      const transport = lab.locator('[data-lab-transport]');
      const canvasControls = lab.locator(`[data-lab-canvas] ${TABBABLE}`);
      if ((await transport.count()) === 0 || (await canvasControls.count()) === 0) return;
      const target = canvasControls.last();
      // The control just under the window's bottom edge, where the pinned transport sits.
      await target.evaluate((node) => {
        const box = node.getBoundingClientRect();
        window.scrollTo(0, window.scrollY + box.bottom - window.innerHeight + box.height / 2);
      });
      const index = await target.evaluate(
        (node, selector) =>
          [...(node.closest('[data-lab-shell]')?.querySelectorAll(selector) ?? [])].indexOf(node),
        TABBABLE,
      );
      await lab
        .locator(TABBABLE)
        .nth(index - 1)
        .evaluate((node) => (node as HTMLElement).focus({ preventScroll: true }));

      await page.keyboard.press('Tab');

      await expect(target).toBeFocused();
      const control = await boxOf(target);
      const bar = await boxOf(transport);
      expect(control.y + control.height).toBeLessThanOrEqual(bar.y + 1);
      // The scroll padding reserves --lab-transport-room: it must stay the transport's height.
      // Read on the stage, which overrides it for a transport with events (two rows).
      const room = await cssLengthPxIn(
        lab.locator('[data-lab-stage]'),
        'var(--lab-transport-room)',
      );
      expect(
        Math.abs(room - bar.height),
        `--lab-transport-room (global.css) = ${room} px, la reproducción pegada (LabShell TRANSPORT) = ${bar.height} px`,
      ).toBeLessThanOrEqual(TRANSPORT_ROOM_SLACK_PX);
    });

    for (const { name, size } of ONE_COLUMN_VIEWPORTS) {
      test(`a ${name} va en una columna: nada pegajoso y el panel bajo el escenario`, async ({
        page,
      }) => {
        await page.setViewportSize(size);
        const lab = await openTiered(page, path, testId);
        await scrollLabTo(lab, -SCROLL_INTO_LAB_PX);

        const positions = await lab.evaluate((root) =>
          ['[data-lab-stage]', '[data-lab-panel]', '[data-lab-transport]'].flatMap((selector) => {
            const node = root.querySelector(selector);
            return node ? [getComputedStyle(node).position] : [];
          }),
        );
        expect(positions.every((position) => position === 'static')).toBe(true);
        const stage = await boxOf(lab.locator('[data-lab-stage]'));
        const panel = await boxOf(lab.locator('[data-lab-panel]'));
        expect(panel.y).toBeGreaterThanOrEqual(stage.y + stage.height);
        expect(Math.abs(panel.x - stage.x)).toBeLessThanOrEqual(STICKY_SLACK_PX);
        // A panel this wide (one column at 900 px) sets its levels in two columns: parameters on
        // the left, readouts on the right, so no label sits half a screen from its value.
        const wide = (await cssLengthPx(page, '42rem')) <= panel.width;
        const params = await boxOf(lab.getByRole('region', { name: 'Parámetros' }));
        const readoutsRegion = lab.getByRole('region', { name: 'Lecturas' });
        if (wide && (await readoutsRegion.count()) > 0) {
          expect(params.width).toBeLessThan(panel.width / 2);
          // Each level moves whole, its title with all it holds: a level cut between columns
          // left «Llegada: V_p…» (Tema 9) at the top of the right column, read as a readout.
          const columns = await lab.locator('[data-lab-panel]').evaluate((node) => {
            const middle = node.getBoundingClientRect().left + node.clientWidth / 2;
            const levels = [...node.querySelectorAll('[data-lab-level]')];
            const split = levels
              .filter((level) => level.getClientRects().length > 1)
              .map((level) => level.getAttribute('data-lab-level'));
            const boxes = levels.map((level) => level.getBoundingClientRect());
            const foot = (side: 'left' | 'right') =>
              Math.max(
                ...boxes
                  .filter((box) => (side === 'left' ? box.right <= middle : box.left >= middle))
                  .map((box) => box.bottom),
                0,
              );
            const tallest = Math.max(...boxes.map((box) => box.height));
            return { split, left: foot('left'), right: foot('right'), tallest };
          });
          expect(columns.split).toEqual([]);
          // Balanced as whole levels allow (Temas 7 and 8 left 360 and 500 px under the
          // parameters): the feet differ by no more than the tallest level, or moving it would
          // have balanced them better.
          expect(columns.left).toBeGreaterThan(0);
          expect(columns.right).toBeGreaterThan(0);
          expect(Math.abs(columns.left - columns.right)).toBeLessThanOrEqual(columns.tallest);
        }
        // One rule for every drawing in one column: the canvas grows up to 36 rem, centred
        // (Temas 1 and 3 no longer fill 813 px while Temas 7–9 stay at 400).
        const canvas = await boxOf(lab.locator('[data-lab-canvas]'));
        expect(canvas.width).toBeLessThanOrEqual(
          (await cssLengthPx(page, '36rem')) + LAYOUT_SLACK_PX,
        );
        const stageCentre = stage.x + stage.width / 2;
        expect(Math.abs(canvas.x + canvas.width / 2 - stageCentre)).toBeLessThanOrEqual(
          STICKY_SLACK_PX,
        );
        // The order of reading is the visual one: the canvas notes come after the panel.
        const notes = lab.locator('[data-lab-canvas-notes]');
        if ((await notes.count()) > 0) {
          expect((await boxOf(notes)).y).toBeGreaterThanOrEqual(panel.y + panel.height);
        }
      });
    }

    test('las fichas abren los ajustes y les devuelven el foco; tras la reproducción el Tab va a «Parámetros»', async ({
      page,
    }) => {
      const lab = await openTiered(page, path, testId);
      const chip = lab.getByRole('group', { name: 'Ajustes activos' }).getByRole('button').first();

      await chip.click();
      await expect(page.getByRole('dialog', { name: SETTINGS_TITLE })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(chip).toBeFocused();

      const timeline = lab.getByRole('slider', { name: 'Línea de tiempo' });
      if ((await timeline.count()) === 0) return;
      // The lab's top under the topic bar: «Restablecer» is in view, so Tab must not move the page
      // (a panel with a scroll of its own once dragged it ~60 px, the lab's header under the bar).
      await scrollLabTo(lab, await stickyTop(page));
      // A lab with events (TransportBar `markers`) has «Evento anterior» and «Evento siguiente»
      // after its timeline, in the transport and in the order of reading; one without has none.
      const transport = lab.locator('[data-lab-transport]');
      const hasMarks = (await transport.locator('[data-transport-mark]').count()) > 0;
      const eventSteps = hasMarks
        ? EVENT_BUTTONS.map((name) => transport.getByRole('button', { name, exact: true }))
        : [];
      await expect(lab.getByRole('button', { name: /^Evento (anterior|siguiente)$/ })).toHaveCount(
        eventSteps.length,
      );
      const restore = lab
        .getByRole('region', { name: 'Parámetros' })
        .getByRole('button', { name: 'Restablecer' });
      await timeline.evaluate((node) => (node as HTMLElement).focus({ preventScroll: true }));
      const before = await page.evaluate(() => window.scrollY);
      for (const next of [...eventSteps, restore]) {
        await page.keyboard.press('Tab');
        await expect(next).toBeFocused();
        expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThanOrEqual(
          LAYOUT_SLACK_PX,
        );
      }
    });
  });
}
