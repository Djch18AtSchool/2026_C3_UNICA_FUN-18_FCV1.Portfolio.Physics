import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const TOPICS_DIR = join(process.cwd(), 'src', 'content', 'topics');
const PHONE = { width: 360, height: 800 };
const THEMES = ['light', 'dark'] as const;
const BLOCKING_IMPACTS = ['serious', 'critical'];
/** The table frame scrolls on its own once its content is wider than the frame (1 px of rounding). */
const OVERFLOW_TOLERANCE_PX = 1;
/** The table frame scrolls on its own once its content is wider than the frame (1 px of rounding). */

/** The first published topic whose MDX writes a <DataTable>, with its number for "Tabla N.1". */
function firstTopicWithTable(): { slug: string; number: number } | undefined {
  for (const fileName of readdirSync(TOPICS_DIR).filter((name) => name.endsWith('.mdx'))) {
    const { data, content } = matter(readFileSync(join(TOPICS_DIR, fileName), 'utf8'));
    if (content.includes('<DataTable')) {
      return { slug: fileName.replace(/\.mdx$/, ''), number: Number(data.number) };
    }
  }
  return undefined;
}

const topic = firstTopicWithTable();
// Skipped until a topic publishes its first <DataTable> (Tarea 6B); then it runs by itself.
test.skip(!topic, 'Sin tablas publicadas todavía: la activa la Tarea 6B');

test.describe('DataTable', () => {
  test.use({ viewport: PHONE });

  test('la leyenda se numera como Tabla N.1 con el contador del tema y el de tablas', async ({
    page,
  }) => {
    await page.goto(`./temas/${topic?.slug}/`);

    // getComputedStyle does not resolve counters, so check their inputs: the prefix template, the
    // topic number and the table's position among the topic's tables.
    const { prefix, topicNumber, position } = await page
      .getByTestId('data-table')
      .first()
      .evaluate((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        return {
          prefix: getComputedStyle(figure.querySelector('figcaption') as Element, '::before')
            .content,
          topicNumber: Number(body?.dataset.topicNumber),
          position: [...(body?.querySelectorAll('.content-table') ?? [])].indexOf(figure) + 1,
        };
      });

    expect(prefix).toBe('"Tabla " counter(topic) "." counter(table) " · "');
    expect(`${topicNumber}.${position}`).toBe(`${topic?.number}.1`);
    await expect(page.getByTestId('data-table').first().locator('.figure-source')).toContainText(
      'Fuente:',
    );
  });

  test('a 360 px la página no desborda y cada tabla se desplaza dentro de su marco', async ({
    page,
  }) => {
    await page.goto(`./temas/${topic?.slug}/`);
    await page.evaluate(() => document.fonts.ready);

    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(PHONE.width);

    for (const frame of await page.locator('[data-testid="data-table"] .table-frame').all()) {
      const { overflows, overflowX } = await frame.evaluate(
        (element, tolerance) => ({
          overflows: element.scrollWidth - element.clientWidth > tolerance,
          overflowX: getComputedStyle(element).overflowX,
        }),
        OVERFLOW_TOLERANCE_PX,
      );
      expect(overflowX).toBe('auto');
      if (overflows) {
        // Wide enough to scroll: a keyboard-reachable region with a short numbered name.
        await expect(frame).toHaveAttribute('tabindex', '0');
        await expect(frame).toHaveAttribute('role', 'region');
        await expect(frame).toHaveAttribute(
          'aria-label',
          new RegExp(`^Tabla ${topic?.number}\\.\\d+ desplazable$`),
        );
      } else {
        await expect(frame).not.toHaveAttribute('tabindex', /.*/);
      }
    }
  });

  for (const theme of THEMES) {
    test(`axe no encuentra violaciones serias ni críticas en el tema ${theme === 'light' ? 'claro' : 'oscuro'}`, async ({
      page,
    }) => {
      await page.addInitScript((value) => window.localStorage.setItem('theme', value), theme);
      await page.goto(`./temas/${topic?.slug}/`);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

      const { violations } = await new AxeBuilder({ page })
        .include('[data-testid="data-table"]')
        .analyze();

      expect(
        violations.filter((violation) => BLOCKING_IMPACTS.includes(violation.impact ?? '')),
      ).toEqual([]);
    });
  }
});
