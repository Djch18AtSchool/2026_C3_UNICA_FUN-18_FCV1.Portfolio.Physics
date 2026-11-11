/**
 * The measurement system as the browser lays it out (plan C1 and C3, audit §6.2; Dylan set the
 * root and reading size to 16 px on 2026-11-10): the root, the reading size and the titles, the
 * `Why` without a rule, and the vertical rhythm (--flow) between blocks, steps and the use case.
 * The scale of every length in the source is src/styles/scale.test.ts.
 */
import { expect, test, type Page } from '@playwright/test';
import { TOPIC_PAGES } from './topicPages';

const ROOT_PX = 16;
const TITLES_PX = { h1: 36, h2: 24, h3: 20 } as const;
const BLOCK_FLOW_PX = 24;
const STEP_FLOW_PX = 48;
const SECTION_FLOW_PX = 64;
const WHY_LABEL_PX = 12;
const WHY_LABEL_GAP_PX = 8;
/** Sub-pixel slack for layout rounding. */
const ROUNDING_PX = 1;
const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 360, height: 800 },
] as const;

interface WhyLook {
  borders: string[];
  partGap: number;
  labelFont: string;
  labelSize: string;
  labelToText: number;
  whyMargins: [string, string];
}

/** Every Why of the page: its parts' borders, the air between parts and from label to text. */
function whyLooks(page: Page): Promise<WhyLook[]> {
  return page.locator('[data-testid="why"]').evaluateAll((whys) =>
    whys.map((why) => {
      const parts = [...why.querySelectorAll<HTMLElement>(':scope > .why-part')];
      const label = parts[0].querySelector<HTMLElement>('.why-label')!;
      const text = label.nextElementSibling!;
      const style = getComputedStyle(label);
      return {
        // Tailwind's preflight gives every element a solid style; no rule is no width.
        borders: parts.map((part) => getComputedStyle(part).borderTopWidth),
        partGap: parts[1].getBoundingClientRect().top - parts[0].getBoundingClientRect().bottom,
        labelFont: style.fontFamily,
        labelSize: style.fontSize,
        labelToText: text.getBoundingClientRect().top - label.getBoundingClientRect().bottom,
        whyMargins: [getComputedStyle(why).marginTop, getComputedStyle(why).marginBottom],
      };
    }),
  );
}

/** The gap above each step's heading box to the bottom of whatever precedes the step. */
function sectionGaps(page: Page): Promise<{ steps: number[]; useCase: number }> {
  return page.locator('.topic-body').evaluate((body) => {
    const gapAbove = (section: Element): number => {
      const previous = section.previousElementSibling!;
      const heading = section.querySelector('h2')!;
      return heading.getBoundingClientRect().top - previous.getBoundingClientRect().bottom;
    };
    const steps = [...body.querySelectorAll(':scope > .step')].slice(1).map(gapAbove);
    return { steps, useCase: gapAbove(body.querySelector(':scope > .use-case')!) };
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`a ${viewport.width} px`, () => {
    test.use({ viewport });

    test('la raíz y el cuerpo de lectura miden 16 px; los títulos 36, 24 y 20', async ({
      page,
    }) => {
      await page.goto(TOPIC_PAGES[1].path);
      const sizes = await page.evaluate(() => {
        const size = (selector: string) =>
          getComputedStyle(document.querySelector(selector)!).fontSize;
        return {
          root: getComputedStyle(document.documentElement).fontSize,
          body: size('.topic-body > .step > p'),
          h1: size('h1'),
          h2: size('.topic-body h2'),
          h3: size('.use-case h3'),
        };
      });
      expect(sizes).toEqual({
        root: `${ROOT_PX}px`,
        body: `${ROOT_PX}px`,
        h1: `${TITLES_PX.h1}px`,
        h2: `${TITLES_PX.h2}px`,
        h3: `${TITLES_PX.h3}px`,
      });
    });

    test('la cabecera de una tabla se apoya en el mismo trazo a 2 px; las filas, a 1 px', async ({
      page,
    }) => {
      await page.goto(TOPIC_PAGES[2].path);
      const rules = await page
        .locator('.content-table')
        .first()
        .evaluate((table) => {
          const head = getComputedStyle(table.querySelector('thead th')!);
          const row = getComputedStyle(table.querySelector('tbody tr + tr > *')!);
          return {
            head: [head.borderBottomWidth, head.borderBottomStyle, head.borderBottomColor],
            row: [row.borderTopWidth, row.borderTopStyle, row.borderTopColor],
          };
        });
      expect(rules.head).toEqual(['2px', 'solid', rules.row[2]]);
      expect(rules.row.slice(0, 2)).toEqual(['1px', 'solid']);
    });

    for (const { number, path } of TOPIC_PAGES) {
      test(`tema ${number}: Why sin borde, etiqueta en mono de 12 px, 24 px entre partes y 8 px hasta el texto`, async ({
        page,
      }) => {
        await page.goto(path);
        const looks = await whyLooks(page);
        expect(looks.length).toBeGreaterThan(0);
        for (const look of looks) {
          expect(look.borders).toEqual(['0px', '0px']);
          expect(look.labelFont).toMatch(/^"?IBM Plex Mono/);
          expect(look.labelSize).toBe(`${WHY_LABEL_PX}px`);
          expect(look.partGap).toBeCloseTo(BLOCK_FLOW_PX, 0);
          expect(Math.abs(look.labelToText - WHY_LABEL_GAP_PX)).toBeLessThanOrEqual(ROUNDING_PX);
          expect(look.whyMargins).toEqual([`${BLOCK_FLOW_PX}px`, `${BLOCK_FLOW_PX}px`]);
        }
      });

      test(`tema ${number}: 48 px entre pasos y 64 antes del caso de uso`, async ({ page }) => {
        await page.goto(path);
        const { steps, useCase } = await sectionGaps(page);
        for (const gap of steps)
          expect(Math.abs(gap - STEP_FLOW_PX)).toBeLessThanOrEqual(ROUNDING_PX);
        expect(Math.abs(useCase - SECTION_FLOW_PX)).toBeLessThanOrEqual(ROUNDING_PX);
      });
    }
  });
}
