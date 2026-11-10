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
  const root = document.querySelector(rootSelector) ?? document.body;
  for (const old of document.querySelectorAll(`[${attribute}]`)) old.removeAttribute(attribute);
  const skipped = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'DESC']);
  const texts: TextNodeInfo[] = [];
  let probes = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    const parent = node.parentElement;
    if (!parent || text.trim() === '' || skipped.has(parent.tagName.toUpperCase())) continue;
    // KaTeX's MathML is read by assistive technology and never drawn.
    if (parent.closest('.katex-mathml')) continue;
    const isOption = parent.tagName === 'OPTION' || parent.tagName === 'OPTGROUP';
    const box = parent.getBoundingClientRect();
    const isVisible =
      parent.checkVisibility({ visibilityProperty: true }) &&
      (box.width >= hiddenBox || box.height >= hiddenBox);
    if (!isOption && !isVisible) continue;
    if (!parent.hasAttribute(attribute) && !isOption) {
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

/** The fonts the browser used per tagged element, as «family: text» for each one not allowed. */
async function foreignFonts(page: Page, cdp: CDPSession, rootSelector: string): Promise<string[]> {
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', {
    nodeId: root.nodeId,
    selector: `${rootSelector === 'body' ? '' : `${rootSelector} `}[${PROBE_ATTRIBUTE}]`,
  });
  const problems: string[] = [];
  for (let from = 0; from < nodeIds.length; from += CDP_BATCH) {
    const batch = nodeIds.slice(from, from + CDP_BATCH);
    const results = await Promise.all(
      batch.map(async (nodeId) => {
        try {
          const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
          const { attributes } = await cdp.send('DOM.getAttributes', { nodeId });
          const index = attributes[attributes.indexOf(PROBE_ATTRIBUTE) + 1];
          return { fonts, index };
        } catch {
          return { fonts: [], index: '' }; // a node without a layout box draws nothing
        }
      }),
    );
    for (const { fonts, index } of results) {
      const foreign = fonts.filter((font) => !ALLOWED_FONT.test(font.familyName));
      if (foreign.length === 0) continue;
      const sample = await page.evaluate(
        ([attribute, value]) => {
          const element = document.querySelector(`[${attribute}="${value}"]`);
          return (element?.textContent ?? '').trim().slice(0, 60);
        },
        [PROBE_ATTRIBUTE, index],
      );
      problems.push(
        `${foreign.map((font) => `${font.familyName || '(sistema)'} x${font.glyphCount}`).join(', ')} dibuja «${sample}»`,
      );
    }
  }
  return problems;
}

export interface GlyphReport {
  uncovered: string[];
  rawNotation: string[];
  fonts: string[];
}

/** Measures the page (or the part of it under `rootSelector`) in its current state. */
export async function measureGlyphs(
  page: Page,
  cdp: CDPSession,
  rootSelector = 'body',
): Promise<GlyphReport> {
  const { texts } = await collectProbes(page, rootSelector);
  const uncovered = texts.flatMap(({ text, family, where }) =>
    uncoveredChars(text, family).map(
      (char) =>
        `${char} (U+${char.codePointAt(0)?.toString(16)}) en ${where} «${text.trim().slice(0, 60)}»`,
    ),
  );
  const rawNotation = texts.flatMap(({ text, where }) =>
    rawNotationMarks(text).map((mark) => `${mark} en ${where} «${text.trim().slice(0, 60)}»`),
  );
  return { uncovered, rawNotation, fonts: await foreignFonts(page, cdp, rootSelector) };
}

/** Starts a DevTools session on the page with the domains the font check needs. */
export async function openFontSession(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  return cdp;
}

export function describeReport(report: GlyphReport): string[] {
  return [
    ...report.uncovered.map((line) => `fuera de Plex: ${line}`),
    ...report.rawNotation.map((line) => `notación cruda: ${line}`),
    ...report.fonts.map((line) => `fuente ajena: ${line}`),
  ];
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
