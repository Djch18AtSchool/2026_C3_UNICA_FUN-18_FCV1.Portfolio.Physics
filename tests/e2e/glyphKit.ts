/**
 * What the glyph guard (glyphs.spec.ts) measures in a page: the characters of every text node
 * that IBM Plex does not draw, the notation written raw, and, through the DevTools protocol, the
 * fonts the browser actually used for each element with visible text.
 */
import type { CDPSession, Locator, Page } from '@playwright/test';
import { rawNotationMarks, uncoveredChars, type PlexFamily } from '../../src/lib/typography';

/** The fonts a page may draw with: the site's two Plex families and KaTeX's own faces. */
const ALLOWED_FONT = /^(IBM Plex (Sans|Mono)( [A-Za-z]+)?|KaTeX_.+)$/;
/** An element whose box is no bigger than this is hidden text for assistive tech (sr-only, MathML). */
const HIDDEN_BOX_PX = 2;
const PROBE_ATTRIBUTE = 'data-glyph-probe';
const CDP_BATCH = 64;

interface TextNodeInfo {
  text: string;
  family: PlexFamily;
  where: string;
}

interface Collected {
  texts: TextNodeInfo[];
  probes: number;
}

/**
 * Runs in the page. Text nodes outside `.katex` and outside runs set in a KaTeX face, with the
 * Plex family they are drawn in; `<option>` texts too (a closed select shows none, but it is text).
 * Every element with visible text of its own is tagged with data-glyph-probe for the font check.
 */
function collectInPage({
  rootSelector,
  attribute,
  hiddenBox,
}: {
  rootSelector: string;
  attribute: string;
  hiddenBox: number;
}): Collected {
  const root = document.querySelector(rootSelector);
  if (!root) return { texts: [], probes: 0 };
  for (const old of document.querySelectorAll(`[${attribute}]`)) old.removeAttribute(attribute);
  const skipped = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  const texts: TextNodeInfo[] = [];
  let probes = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    const parent = node.parentElement;
    if (!parent || text.trim() === '' || skipped.has(parent.tagName.toUpperCase())) continue;
    // KaTeX's MathML is read by assistive technology and never drawn.
    if (parent.closest('.katex-mathml')) continue;
    // The characters of every text are checked, shown or not (the inactive tab of a drawer, a
    // closed <select>, an SVG <desc>): they need no layout. Only the fonts need a drawn element.
    const box = parent.getBoundingClientRect();
    const isDrawn =
      parent.tagName !== 'OPTION' &&
      parent.tagName !== 'OPTGROUP' &&
      parent.checkVisibility({ visibilityProperty: true }) &&
      (box.width >= hiddenBox || box.height >= hiddenBox);
    if (isDrawn && !parent.hasAttribute(attribute)) {
      parent.setAttribute(attribute, String(probes));
      probes += 1;
    }
    const families = getComputedStyle(parent).fontFamily.split(',');
    const first = families[0].replaceAll('"', '').trim();
    if (parent.closest('.katex') || /^KaTeX/.test(first)) continue;
    const family: PlexFamily = /mono/i.test(first) ? 'mono' : 'sans';
    const label = parent.closest('[data-testid]')?.getAttribute('data-testid') ?? '';
    texts.push({ text, family, where: `${parent.tagName.toLowerCase()} ${label}`.trim() });
  }
  return { texts, probes };
}

/** Every element that draws text: all of them are tagged, those inside KaTeX too (its faces only). */
async function collectProbes(page: Page, rootSelector: string): Promise<Collected> {
  return page.evaluate(collectInPage, {
    rootSelector,
    attribute: PROBE_ATTRIBUTE,
    hiddenBox: HIDDEN_BOX_PX,
  });
}

interface FontCheck {
  /** «family xN dibuja «text»» for each element drawn with a font that is not allowed. */
  problems: string[];
  /** Why the check itself could not run on a node: never swallowed, never read as «no fonts». */
  errors: string[];
  /** Tagged elements the browser returned a platform font for. */
  fontNodes: number;
}

/** The fonts the browser used per tagged element. */
async function checkFonts(
  page: Page,
  cdp: CDPSession,
  rootSelector: string,
  probes: number,
): Promise<FontCheck> {
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', {
    nodeId: root.nodeId,
    selector:
      rootSelector === 'body'
        ? `[${PROBE_ATTRIBUTE}]`
        : `${rootSelector}[${PROBE_ATTRIBUTE}], ${rootSelector} [${PROBE_ATTRIBUTE}]`,
  });
  const problems: string[] = [];
  const errors: string[] = [];
  let fontNodes = 0;
  if (nodeIds.length !== probes) {
    errors.push(`CDP encontró ${nodeIds.length} de los ${probes} elementos marcados`);
  }
  for (let from = 0; from < nodeIds.length; from += CDP_BATCH) {
    const batch = nodeIds.slice(from, from + CDP_BATCH);
    const results = await Promise.all(
      batch.map(async (nodeId) => {
        try {
          const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
          const { attributes } = await cdp.send('DOM.getAttributes', { nodeId });
          return { fonts, index: attributes[attributes.indexOf(PROBE_ATTRIBUTE) + 1] };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      }),
    );
    for (const result of results) {
      if ('error' in result) {
        errors.push(`error de CDP: ${result.error}`);
        continue;
      }
      if (result.fonts.length > 0) fontNodes += 1;
      const foreign = result.fonts.filter((font) => !ALLOWED_FONT.test(font.familyName));
      if (foreign.length === 0) continue;
      const sample = await page.evaluate(
        ([attribute, value]) =>
          (document.querySelector(`[${attribute}="${value}"]`)?.textContent ?? '')
            .trim()
            .slice(0, 60),
        [PROBE_ATTRIBUTE, result.index],
      );
      problems.push(
        `${foreign.map((font) => `${font.familyName || '(sistema)'} x${font.glyphCount}`).join(', ')} dibuja «${sample}»`,
      );
    }
  }
  return { problems, errors, fontNodes };
}

export interface GlyphReport {
  uncovered: string[];
  rawNotation: string[];
  fonts: string[];
  /** Elements with drawn text that were tagged for the font check. */
  probes: number;
  /** Of those, the ones the browser reported a font for. */
  fontNodes: number;
  /** Checks that could not run (CDP failures, nodes lost): they fail the guard. */
  errors: string[];
}

/** One measurement of the page (or the part of it under `rootSelector`) in its current state. */
async function measureOnce(
  page: Page,
  cdp: CDPSession,
  rootSelector = 'body',
): Promise<GlyphReport> {
  const { texts, probes } = await collectProbes(page, rootSelector);
  const uncovered = texts.flatMap(({ text, family, where }) =>
    uncoveredChars(text, family).map(
      (char) =>
        `${char} (U+${char.codePointAt(0)?.toString(16)}) en ${where} «${text.trim().slice(0, 60)}»`,
    ),
  );
  const rawNotation = texts.flatMap(({ text, where }) =>
    rawNotationMarks(text).map((mark) => `${mark} en ${where} «${text.trim().slice(0, 60)}»`),
  );
  const { problems, errors, fontNodes } = await checkFonts(page, cdp, rootSelector, probes);
  return { uncovered, rawNotation, fonts: problems, probes, fontNodes, errors };
}

/** A running lab may replace a node between tagging it and asking CDP about it: measure again. */
const MEASURE_ATTEMPTS = 3;
const LOST_NODES = /^CDP encontró \d+ de los/;

/**
 * Measures the page (or the part under `rootSelector`). Nodes lost to a re-render are retried; any
 * other failure of the check, or nodes still lost on the last attempt, stays in the report.
 */
export async function measureGlyphs(
  page: Page,
  cdp: CDPSession,
  rootSelector = 'body',
): Promise<GlyphReport> {
  let report = await measureOnce(page, cdp, rootSelector);
  for (let attempt = 1; attempt < MEASURE_ATTEMPTS; attempt += 1) {
    if (!report.errors.some((error) => LOST_NODES.test(error))) break;
    await settle(page);
    report = await measureOnce(page, cdp, rootSelector);
  }
  return report;
}

/** Starts a DevTools session on the page with the domains the font check needs. */
export async function openFontSession(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  return cdp;
}

/** The lines that fail the guard; an empty list is a report that measured something and found nothing. */
export function describeReport(report: GlyphReport, rootSelector = 'body'): string[] {
  const nothingMeasured =
    report.probes === 0
      ? [`nada medido: ningún elemento con texto visible bajo «${rootSelector}»`]
      : report.fontNodes === 0
        ? ['nada medido: el navegador no devolvió ninguna fuente']
        : [];
  return [
    ...nothingMeasured,
    ...report.errors.map((line) => `la comprobación no pudo correr: ${line}`),
    ...report.uncovered.map((line) => `fuera de Plex: ${line}`),
    ...report.rawNotation.map((line) => `notación cruda: ${line}`),
    ...report.fonts.map((line) => `fuente ajena: ${line}`),
  ];
}

/** A lab must be measured in at least one state after its first: a guard with none is not a guard. */
export function requireStates<T>(slug: string, states: readonly T[]): readonly T[] {
  if (states.length === 0) {
    throw new Error(`glyphs: «${slug}» no tiene ningún estado más allá del inicial que medir`);
  }
  return states;
}

/** Waits two frames, so a state change has been laid out before it is measured. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

export type StateStep = (page: Page, lab: Locator) => Promise<void>;
