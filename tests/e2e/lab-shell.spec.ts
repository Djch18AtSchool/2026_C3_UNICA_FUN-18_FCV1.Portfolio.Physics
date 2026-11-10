import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';
import { expectSameHeightAfterHydration, HYDRATION_WIDTHS } from './hydrationStability';
import { TOPIC_PAGES } from './topicPages';

const DESKTOP = { width: 1280, height: 800 };
const JUMP_PAGE = './temas/salto-personaje/';
const JUMP_LAB = 'jump-lab';
const LABS = TOPIC_PAGES.map(({ path, labTestId }) => ({ path, testId: labTestId }));
const SETTINGS_TITLE = /^Ajustes: /;
const WHEEL_PX = 400;
/** LabShell's READOUT_ANNOUNCE_DELAY_MS: readouts are spoken once still for this long. */
const READOUT_SETTLE_MS = 750;
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
/** What the Tab key reaches, in document order. */
const TABBABLE =
  ':is(a[href], button, input, select, textarea, summary, [tabindex]):not([tabindex="-1"]):not([disabled])';
/**
 * Every lab on the tiered shell (LabShell `levels`), listed by hand so the generic tests below run
 * against each one; a lab rendered on a topic page and missing here fails «cada laboratorio…».
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

/** Opens a lab that must be on the tiered shell: a listed lab still stacked fails here. */
async function openTiered(page: Page, path: string, testId: string): Promise<Locator> {
  const lab = await openLab(page, path, testId);
  await expect(lab, `${testId} está en MIGRATED_LABS`).toHaveAttribute('data-lab-shell', 'tiered');
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

/** The sticky offset the stage declares (its computed `top`, in px). */
const stickyTop = (lab: Locator) =>
  lab.locator('[data-lab-stage]').evaluate((node) => parseFloat(getComputedStyle(node).top));

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

  test('sin notas del lienzo, la rejilla no deja una fila vacía con su hueco', async ({ page }) => {
    const lab = await openTiered(page, './temas/asistencia-gravitatoria/', 'flyby-lab');
    expect(Math.abs(await columnsSlack(lab))).toBeLessThanOrEqual(LAYOUT_SLACK_PX);

    // A lab without canvas notes: the same lab with that cell taken out.
    await lab.evaluate((root) => root.querySelector('[data-lab-canvas-notes]')?.remove());

    expect(Math.abs(await columnsSlack(lab))).toBeLessThanOrEqual(LAYOUT_SLACK_PX);
  });
});

for (const { path, testId } of LABS) {
  test(`cada laboratorio de ${path} va por niveles y está en MIGRATED_LABS`, async ({ page }) => {
    await openLab(page, path, testId);
    const labs = await page.locator('[data-testid$="-lab"]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        testId: node.getAttribute('data-testid') ?? '',
        shell: node.getAttribute('data-lab-shell') ?? '',
      })),
    );

    expect(labs.map((lab) => lab.testId)).toContain(testId);
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
          await scrollLabTo(lab, await stickyTop(lab));

          const params = lab.getByRole('region', { name: 'Parámetros' });
          const control = await boxOf(params.locator(FIRST_CONTROL).first());
          const canvas = await boxOf(lab.locator('[data-lab-canvas]'));
          expect(control.y + control.height).toBeLessThanOrEqual(size.height);
          expect(control.x).toBeGreaterThanOrEqual(canvas.x + canvas.width);
        });

        test('al bajar, el panel queda bajo la barra del tema, nunca más alto que la ventana, y la reproducción a la vista', async ({
          page,
        }) => {
          const lab = await openTiered(page, path, testId);
          const top = await stickyTop(lab);
          // Each column sticks inside its row: scroll halfway through the panel's sticky travel.
          const { cellTop, travel } = await lab.evaluate((root) => {
            const cell = root.querySelector('[data-lab-stage]')?.parentElement;
            const panelBox = root.querySelector('[data-lab-panel]')?.getBoundingClientRect();
            const cellBox = cell?.getBoundingClientRect();
            return {
              cellTop: (cellBox?.top ?? 0) + window.scrollY,
              travel: (cellBox?.height ?? 0) - (panelBox?.height ?? 0),
            };
          });
          if (travel <= 0) {
            // Nothing to travel: row 1 (the stage's and the panel's cells, not the canvas notes'
            // row under both) is no taller than the panel, which fits the window.
            const stageCell = await boxOf(lab.locator('[data-lab-stage]').locator('xpath=..'));
            const panelCell = await boxOf(lab.locator('[data-lab-panel]').locator('xpath=..'));
            expect(Math.max(stageCell.height, panelCell.height)).toBeLessThanOrEqual(
              size.height - top,
            );
            return;
          }
          await page.evaluate(
            (y) => window.scrollTo(0, y),
            cellTop - top + Math.min(travel / 2, SCROLL_INTO_LAB_PX),
          );

          const panel = await boxOf(lab.locator('[data-lab-panel]'));
          const firstLevel = await boxOf(lab.getByRole('region', { name: 'Parámetros' }));
          const bar = await boxOf(page.locator('[data-topic-sticky-bar]'));
          expect(Math.abs(firstLevel.y - top)).toBeLessThanOrEqual(STICKY_SLACK_PX);
          expect(panel.y).toBeGreaterThanOrEqual(bar.y + bar.height);
          expect(panel.y + panel.height).toBeLessThanOrEqual(size.height);
          const transport = lab.locator('[data-lab-transport]');
          if ((await transport.count()) > 0) {
            const box = await boxOf(transport);
            expect(box.y >= 0 && box.y + box.height <= size.height).toBe(true);
          }
        });
      });
    }

    test('a 1 280 × 800 el panel que desborda es una región con nombre y una parada del tabulador; si no, no', async ({
      page,
    }) => {
      await page.setViewportSize(SPLIT_VIEWPORTS[0].size);
      const lab = await openTiered(page, path, testId);
      const panel = lab.locator('[data-lab-panel]');
      const overflows = await panel.evaluate((node) => node.scrollHeight > node.clientHeight + 1);

      if (overflows) {
        await expect(panel).toHaveAttribute('tabindex', '0');
        await expect(lab.getByRole('region', { name: 'Controles del laboratorio' })).toHaveCount(1);
        await panel.focus();
        const before = await panel.evaluate((node) => node.scrollTop);
        await page.keyboard.press('PageDown');
        await expect.poll(() => panel.evaluate((node) => node.scrollTop)).toBeGreaterThan(before);
      } else {
        await expect(panel).not.toHaveAttribute('tabindex');
        await expect(panel).not.toHaveAttribute('role');
      }
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
      const room = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.height = 'var(--lab-transport-room)';
        document.body.append(probe);
        const height = probe.getBoundingClientRect().height;
        probe.remove();
        return height;
      });
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
      await timeline.focus();
      await page.keyboard.press('Tab');
      // A panel that scrolls on its own is a tab stop of its own, before its first control.
      if ((await lab.locator('[data-lab-panel][tabindex="0"]').count()) > 0) {
        await expect(lab.locator('[data-lab-panel]')).toBeFocused();
        await page.keyboard.press('Tab');
      }
      await expect(
        lab
          .getByRole('region', { name: 'Parámetros' })
          .getByRole('button', { name: 'Restablecer' }),
      ).toBeFocused();
    });
  });
}
