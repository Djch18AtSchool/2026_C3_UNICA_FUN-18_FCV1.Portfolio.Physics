/**
 * The laboratories' shared controls on the scale of measures (README, «Escala de medidas»): every
 * form control 40 px high, icon buttons 44 with 20 px glyphs, and number boxes that hold the
 * longest value of their grid.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';
import { TOPIC_PAGES } from './topicPages';

const VIEWPORTS = [
  { name: '1 280', size: { width: 1280, height: 800 } },
  { name: '360', size: { width: 360, height: 800 } },
] as const;
/** Form controls: number fields, selects, segments and switch rows (`h-10`, `min-h-10`). */
const CONTROL_PX = 40;
/**
 * The exception (README, «Iconos y controles»): the settings chips beside the gear and the topic's
 * copy buttons are 32 px with a fine pointer (targets of at least 24 px, WCAG 2.5.8).
 */
const COMPACT_CONTROL_PX = 32;
/** The two laboratories without a clock: no transport to measure. */
const LABS_WITHOUT_CLOCK: ReadonlySet<string> = new Set(['tyre-lab', 'trigger-lab']);
/** Icon buttons at the touch size the laboratories use (`size-11`). */
const ICON_BUTTON_PX = 44;
/** A glyph inside an icon button (`size-5`). */
const ICON_PX = 20;
/** The settings drawer as a right panel from `sm` up (`w-96`). */
const DRAWER_WIDTH_PX = 384;
/** Grid points a number field is checked against at most (every lab's grid has fewer). */
const MAX_GRID_POINTS = 100_000;
/** Decimals ParamField shows at most (MAX_FIELD_DECIMALS). */
const FIELD_DECIMALS = 4;

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

interface NumberFieldFit {
  id: string;
  height: number;
  longest: string;
  overflow: number;
}

/**
 * Each visible ParamField number box (`…-number`, beside its range): its height and, with the
 * longest text of its grid min + k·step typed in, how far that text overflows the box.
 */
function measureNumberFields(lab: Locator): Promise<NumberFieldFit[]> {
  return lab.evaluate(
    async (root, { maxPoints, decimals }) => {
      await document.fonts.ready;
      const fieldText = (value: number) =>
        String(Number(value.toFixed(decimals)))
          .replace('-', '−')
          .replace('.', ',');
      const longestOnGrid = (range: HTMLInputElement) => {
        const [min, max, step] = [range.min, range.max, range.step].map(Number);
        const points = Math.min(Math.floor((max - min) / step + 1e-9), maxPoints);
        let longest = '';
        for (let k = 0; k <= points; k += 1) {
          const text = fieldText(min + k * step);
          if (text.length > longest.length) longest = text;
        }
        return longest;
      };
      const fields = Array.from(root.querySelectorAll<HTMLInputElement>('input[id$="-number"]'));
      return fields
        .filter((field) => field.getClientRects().length > 0)
        .map((field) => {
          const range = document.getElementById(field.id.replace(/-number$/, ''));
          const longest = range instanceof HTMLInputElement ? longestOnGrid(range) : '';
          const shown = field.value;
          field.value = longest;
          const overflow = field.scrollWidth - field.clientWidth;
          field.value = shown;
          return { id: field.id, height: field.getBoundingClientRect().height, longest, overflow };
        });
    },
    { maxPoints: MAX_GRID_POINTS, decimals: FIELD_DECIMALS },
  );
}

/** The labels of the fields (ParamField and r_p) and of the readouts. */
const LABELS = '[data-lab-level] label[for], [data-readout] > span:first-child';
/** Two fragments within this many px of each other's top share a line. */
const SAME_LINE_PX = 4;

/**
 * The labels (their text) whose formula wrapped onto a line of its own: a symbol under the words
 * it belongs to (Tema 6's «batería η», Tema 9's «|Δv⃗|»).
 */
function lonelySymbols(lab: Locator): Promise<string[]> {
  return lab.evaluate(
    async (root, { selector, sameLine }) => {
      await document.fonts.ready;
      const tops = (node: Node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return [...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => rect.top);
      };
      return [...root.querySelectorAll<HTMLElement>(selector)]
        .filter((label) => label.getClientRects().length > 0)
        .filter((label) => {
          const formulas = [...label.querySelectorAll('.katex')];
          const words = [...label.childNodes].flatMap((child) => {
            const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);
            const texts: Text[] = [];
            if (child.nodeType === Node.TEXT_NODE) texts.push(child as Text);
            while (walker.nextNode()) texts.push(walker.currentNode as Text);
            return texts.filter(
              (text) => text.data.trim() !== '' && !text.parentElement?.closest('.katex'),
            );
          });
          const wordTops = words.flatMap(tops);
          return formulas.some((formula) => {
            const top = formula.getBoundingClientRect().top;
            return (
              wordTops.length > 0 && wordTops.every((wordTop) => Math.abs(wordTop - top) > sameLine)
            );
          });
        })
        .map((label) => (label.textContent ?? '').trim().slice(0, 60));
    },
    { selector: LABELS, sameLine: SAME_LINE_PX },
  );
}

/** Rendered heights of what matches `selector` inside `host`, visible ones only. */
function heights(host: Locator, selector: string): Promise<{ text: string; height: number }[]> {
  return host.evaluate(
    (root, inner) =>
      Array.from(root.querySelectorAll<HTMLElement>(inner))
        .filter((node) => node.getClientRects().length > 0)
        .map((node) => ({
          text: (node.textContent ?? node.getAttribute('aria-label') ?? '').trim().slice(0, 40),
          height: node.getBoundingClientRect().height,
        })),
    selector,
  );
}

/** Computed min-height of the visible segments (ChoiceField, SegmentedField) inside `host`. */
function segmentMinHeights(host: Locator): Promise<string[]> {
  return host.evaluate((root) =>
    Array.from(root.querySelectorAll<HTMLElement>('[role="radiogroup"] label > span'))
      .filter((node) => node.getClientRects().length > 0)
      .map((node) => getComputedStyle(node).minHeight),
  );
}

for (const { name, size } of VIEWPORTS) {
  test.describe(`a ${name} px`, () => {
    test.use({ viewport: size });

    for (const { path, labTestId } of TOPIC_PAGES) {
      test(`${labTestId}: campos, selectores y segmentos de 40 px; iconos de 20 en botones de 44`, async ({
        page,
      }) => {
        const lab = await openLab(page, path, labTestId);

        const fields = await measureNumberFields(lab);
        expect(fields.length, 'campos numéricos medidos').toBeGreaterThan(0);
        for (const field of fields) {
          expect(field.height, `${field.id}: alto`).toBe(CONTROL_PX);
          expect(field.overflow, `${field.id}: «${field.longest}» no cabe`).toBeLessThanOrEqual(0);
        }
        for (const select of await heights(lab, 'select')) {
          expect(select.height, `selector ${select.text}`).toBe(CONTROL_PX);
        }
        for (const minHeight of await segmentMinHeights(lab)) {
          expect(minHeight).toBe(`${CONTROL_PX}px`);
        }

        for (const chip of await heights(lab, '[aria-label="Ajustes activos"] button')) {
          expect(chip.height, `ficha ${chip.text}`).toBe(COMPACT_CONTROL_PX);
        }

        const transport = lab.getByRole('group', { name: 'Reproducción' });
        const hasClock = !LABS_WITHOUT_CLOCK.has(labTestId);
        await expect(transport).toHaveCount(hasClock ? 1 : 0);
        if (!hasClock) return;
        const buttons = await heights(transport, 'button');
        expect(buttons.length, 'botones de la reproducción').toBeGreaterThanOrEqual(2);
        for (const button of buttons) {
          expect(button.height, `botón ${button.text}`).toBe(ICON_BUTTON_PX);
        }
        for (const glyph of await transport.locator('button svg').all()) {
          const box = await glyph.boundingBox();
          expect([box?.width, box?.height]).toEqual([ICON_PX, ICON_PX]);
        }
      });
    }

    for (const { path, labTestId } of TOPIC_PAGES) {
      test(`${labTestId}: ningún símbolo queda solo en una línea de su etiqueta`, async ({
        page,
      }) => {
        const lab = await openLab(page, path, labTestId);
        expect(await lonelySymbols(lab)).toEqual([]);
      });
    }

    test('Tema 9: «Ir a la máxima aproximación» y las vistas de la gráfica de las Voyager miden 40 px', async ({
      page,
    }) => {
      const lab = await openLab(page, './temas/asistencia-gravitatoria/', 'flyby-lab');
      const jump = lab.getByRole('button', { name: 'Ir a la máxima aproximación' });
      expect((await jump.boundingBox())?.height).toBe(CONTROL_PX);

      const views = page.getByRole('group', { name: 'Detalle de cada encuentro' });
      await views.scrollIntoViewIfNeeded();
      await waitForIsland(page, '[aria-label="Detalle de cada encuentro"]');
      const buttons = await heights(views, 'button');
      expect(buttons.length).toBeGreaterThan(1);
      for (const button of buttons) {
        expect(button.height, `vista ${button.text}`).toBe(CONTROL_PX);
      }
    });

    test('las herramientas del tema miden 32 px con un puntero fino (la excepción del README)', async ({
      page,
    }) => {
      await page.goto('./temas/salto-personaje/');
      const tools = page.getByTestId('topic-tools');
      await waitForIsland(page, '[data-testid="topic-tools"]');
      const buttons = await heights(tools, 'button');
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button.height, `herramienta ${button.text}`).toBe(COMPACT_CONTROL_PX);
      }
    });

    test('el cajón de ajustes: pestañas, selectores, interruptores y segmentos de 40 px; cerrar con un icono de 20', async ({
      page,
    }) => {
      const lab = await openLab(page, './temas/salto-personaje/', 'jump-lab');
      await lab.getByRole('button', { name: 'Ajustes del simulador' }).click();
      const dialog = page.getByRole('dialog', { name: /^Ajustes: / });
      await expect(dialog).toBeVisible();

      const close = dialog.getByRole('button', { name: 'Cerrar ajustes' });
      expect((await close.boundingBox())?.height).toBe(ICON_BUTTON_PX);
      const glyph = await close.locator('svg').boundingBox();
      expect([glyph?.width, glyph?.height]).toEqual([ICON_PX, ICON_PX]);
      if (size.width >= DRAWER_WIDTH_PX * 2) {
        expect((await dialog.boundingBox())?.width).toBe(DRAWER_WIDTH_PX);
      }

      for (const tabName of ['Este simulador', 'Global'] as const) {
        await dialog.getByRole('tab', { name: tabName }).click();
        const panel = dialog.getByRole('tabpanel', { name: tabName });
        for (const tab of await heights(dialog, '[role="tab"]')) {
          expect(tab.height, `pestaña ${tab.text}`).toBe(CONTROL_PX);
        }
        for (const select of await heights(panel, 'select')) {
          expect(select.height, `selector ${select.text}`).toBe(CONTROL_PX);
        }
        for (const row of await heights(panel, 'label:has([role="switch"])')) {
          expect(row.height, `interruptor ${row.text}`).toBe(CONTROL_PX);
        }
        for (const minHeight of await segmentMinHeights(panel)) {
          expect(minHeight).toBe(`${CONTROL_PX}px`);
        }
      }
    });
  });
}
