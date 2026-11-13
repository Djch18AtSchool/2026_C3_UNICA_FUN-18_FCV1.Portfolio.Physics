/**
 * The handles' feedback and the legends' highlight (D4, auditoría §8) on the real pages: every
 * lab with a draggable knob grows it while dragged (about its centre, with the grabbing cursor)
 * and shows its focus ring, on a surface casing, from the keyboard; the charts' legends highlight
 * their series. The shared pieces are tried on their own in microinteractions.spec.ts.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';
import { TOPIC_PAGES, type TopicPage } from './topicPages';

const KNOB_GROWTH = 1.25;
const PX_SLACK = 0.5;
const MIN_RING_CONTRAST = 3;
const BLOCKING_IMPACTS = ['serious', 'critical'];

async function openLab(page: Page, { path, labTestId }: TopicPage): Promise<Locator> {
  await page.goto(path);
  await page
    .locator(`[data-testid="${labTestId}-loading"], [data-testid="${labTestId}"]`)
    .first()
    .scrollIntoViewIfNeeded();
  await waitForIsland(page, `[data-testid="${labTestId}"]`);
  return page.getByTestId(labTestId);
}

/** The lab's first draggable knob in its canvas, scrolled to the middle of the window. */
async function firstKnob(lab: Locator): Promise<Locator | undefined> {
  const handles = lab.locator('[data-lab-canvas] [role="slider"]:has([data-knob])');
  if ((await handles.count()) === 0) return undefined;
  const handle = handles.first();
  await handle.evaluate((node) => node.scrollIntoView({ block: 'center' }));
  return handle;
}

const centreOf = async (locator: Locator) => {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width };
};

function contrast(a: string, b: string): number {
  const luminance = (rgb: string) => {
    const [r, g, bl] = (rgb.match(/[\d.]+/gu) ?? []).slice(0, 3).map((value) => {
      const c = Number(value) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const KNOB_LABS = TOPIC_PAGES.filter(({ number }) => number !== 4 && number !== 6);

for (const topic of KNOB_LABS) {
  test.describe(`Tema ${topic.number}, el asidero`, () => {
    test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });

    test('crece al arrastrarlo sin mover su centro, con el cursor de agarrar, y vuelve al soltarlo', async ({
      page,
    }) => {
      const lab = await openLab(page, topic);
      const handle = await firstKnob(lab);
      if (!handle) throw new Error(`el Tema ${topic.number} no tiene asidero con perilla`);
      const dot = handle.locator('[data-knob]');
      const before = await centreOf(dot);

      await page.mouse.move(before.x, before.y);
      await page.mouse.down();

      await expect(handle).toHaveAttribute('data-dragging', '');
      await expect(handle).toHaveCSS('cursor', 'grabbing');
      await expect
        .poll(async () => (await centreOf(dot)).width / before.width)
        .toBeCloseTo(KNOB_GROWTH, 2);
      const grown = await centreOf(dot);
      expect(Math.abs(grown.x - before.x)).toBeLessThanOrEqual(PX_SLACK);
      expect(Math.abs(grown.y - before.y)).toBeLessThanOrEqual(PX_SLACK);

      await page.mouse.up();
      await expect(handle).not.toHaveAttribute('data-dragging');
    });

    test('enfocado con el teclado, su aro se ve sobre su borde de superficie, con contraste ≥ 3:1, en claro y oscuro', async ({
      page,
    }) => {
      const lab = await openLab(page, topic);
      const handle = await firstKnob(lab);
      if (!handle) throw new Error(`el Tema ${topic.number} no tiene asidero con perilla`);
      // A key first, so the browser shows the focus that follows as a keyboard's.
      await page.keyboard.press('Shift');
      for (const theme of ['light', 'dark'] as const) {
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        await handle.focus();

        const ring = handle.locator('[data-knob-ring]');
        const casing = handle.locator('[data-knob-ring-casing]');
        await expect(ring).toHaveCSS('opacity', '1');
        await expect(casing).toHaveCSS('opacity', '1');
        const [ringColor, casingColor] = await Promise.all(
          [ring, casing].map((mark) => mark.evaluate((node) => getComputedStyle(node).stroke)),
        );
        expect(contrast(ringColor, casingColor), theme).toBeGreaterThanOrEqual(MIN_RING_CONTRAST);
      }
    });
  });
}

interface LegendCase {
  name: string;
  topic: number;
  /** The figure whose legend is tried, by its title. */
  title: RegExp;
}

const LEGENDS: readonly LegendCase[] = [
  {
    name: 'la gráfica de energías del laboratorio',
    topic: 6,
    title: /^Energías acumuladas a lo largo/,
  },
  { name: 'la trayectoria del laboratorio', topic: 2, title: /^Trayectoria del salto/ },
  { name: 'la gráfica de las Voyager', topic: 9, title: /^Rapidez de las Voyager respecto/ },
  { name: 'la gráfica de los umbrales', topic: 7, title: /^Altura de cada rebote/ },
];

/** How many of the figure's series are drawn highlighted and faded. */
const emphasisCounts = (figure: Locator) =>
  figure.evaluate((node) => {
    const marks = [...node.querySelectorAll('[data-series], [data-region]')];
    const count = (value: string) =>
      marks.filter((mark) => mark.getAttribute('data-emphasis') === value).length;
    return { focus: count('focus'), dim: count('dim') };
  });

for (const legend of LEGENDS) {
  const topic = TOPIC_PAGES.find(({ number }) => number === legend.topic)!;

  test.describe(`Tema ${legend.topic}, ${legend.name}`, () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test('pasar sobre una entrada realza su serie y atenúa las demás; salir lo deshace', async ({
      page,
    }) => {
      await openLab(page, topic);
      // The chart's own figure: the innermost of those (a page's Figure wraps it).
      const figure = page
        .locator('figure')
        .filter({ has: page.locator('figcaption', { hasText: legend.title }) })
        .last();
      await figure.scrollIntoViewIfNeeded();
      await waitForIsland(page, 'ul[aria-label="Leyenda"]');
      const entries = figure.getByRole('list', { name: 'Leyenda' }).getByRole('button');
      await expect(entries.first()).toBeVisible();
      expect(await emphasisCounts(figure)).toEqual({ focus: 0, dim: 0 });

      await entries.nth(1).hover();

      await expect.poll(async () => (await emphasisCounts(figure)).focus).toBeGreaterThan(0);
      expect((await emphasisCounts(figure)).dim).toBeGreaterThan(0);

      await page.mouse.move(0, 0);
      await expect.poll(() => emphasisCounts(figure)).toEqual({ focus: 0, dim: 0 });
    });
  });
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`accesibilidad (${theme})`, () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    for (const number of [2, 6, 9]) {
      test(`Tema ${number}: sin violaciones graves con una serie realzada y un asidero enfocado`, async ({
        page,
      }) => {
        const topic = TOPIC_PAGES.find((page) => page.number === number)!;
        const lab = await openLab(page, topic);
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        const entries = page.getByRole('list', { name: 'Leyenda' }).getByRole('button');
        await entries.first().scrollIntoViewIfNeeded();
        await entries.first().click();
        const handle = await firstKnob(lab);
        await page.keyboard.press('Shift');
        await (handle ?? lab.locator('[data-lab-canvas] [role="slider"]').first()).focus();

        const results = await new AxeBuilder({ page })
          .include(`[data-testid="${topic.labTestId}"]`)
          .analyze();

        expect(
          results.violations
            .filter(({ impact }) => BLOCKING_IMPACTS.includes(impact ?? ''))
            .map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target).join(' | ')}`),
        ).toEqual([]);
      });
    }
  });
}
