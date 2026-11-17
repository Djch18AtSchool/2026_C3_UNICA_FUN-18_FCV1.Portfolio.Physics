/**
 * What the glyph guard (glyphs.spec.ts) measures in a page: the characters of every text node
 * that IBM Plex does not draw, the notation written raw, through the DevTools protocol the fonts
 * the browser actually used for each element with visible text, and with those the site's type
 * rule (E3, src/styles/math.css; typeRuleViolations in src/lib/typography.ts): KaTeX's faces only
 * for what Plex lacks outside a display, Plex Mono only for the numbering, lowercase Greek and
 * every variable italic (a formula's Latin letter, and a figure label's one-letter variable:
 * uprightFigureVariables), and every inline formula at its text's size. The notation written raw
 * is looked for in the text and in what is spoken or shown on hover (aria-label,
 * aria-valuetext, title).
 */
import type { CDPSession, Locator, Page } from '@playwright/test';
import {
  inlineMathSizeViolation,
  NUMBERING_SELECTOR,
  rawNotationMarks,
  typeRuleViolations,
  uncoveredChars,
  uprightFigureVariables,
  type DrawnFont,
  type DrawnText,
  type LabelRun,
  type PlexFamily,
} from '../../src/lib/typography';

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

/** A drawn element as the type rule reads it, its fonts still to come from CDP. */
type ProbeInfo = Omit<DrawnText, 'fonts'> & { where: string };

/** A form control's text (no text node, so no font query): its family and style only. */
type ControlInfo = ProbeInfo;

interface InlineMathSize {
  size: number;
  parentSize: number;
  where: string;
}

interface Collected {
  texts: TextNodeInfo[];
  probes: number;
  /** Per probe index, what the type rule reads of it. */
  drawn: Record<string, ProbeInfo>;
  controls: ControlInfo[];
  inlineMath: InlineMathSize[];
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
  numbering,
}: {
  rootSelector: string;
  attribute: string;
  hiddenBox: number;
  numbering: string;
}): Collected {
  const root = document.querySelector(rootSelector);
  if (!root) return { texts: [], probes: 0, drawn: {}, controls: [], inlineMath: [] };
  const describe = (element: Element) => {
    const style = getComputedStyle(element);
    const setting = element.closest('.katex-display')
      ? 'display-math'
      : element.closest('.katex')
        ? 'inline-math'
        : element.closest('svg')
          ? 'figure'
          : 'text';
    const own = [...element.childNodes]
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.textContent ?? '')
      .join('');
    return {
      text: own,
      setting: setting as DrawnText['setting'],
      family: style.fontFamily.split(',')[0].replaceAll('"', '').trim(),
      fontStyle: style.fontStyle,
      isNumbering: element.closest(numbering) !== null,
      isLeaf: ![...element.children].some((child) => (child.textContent ?? '').trim() !== ''),
      isMathVariable:
        element.closest('.katex') !== null && element.classList.contains('mathnormal'),
      where:
        `${element.tagName.toLowerCase()} ${element.closest('[data-testid]')?.getAttribute('data-testid') ?? ''}`.trim(),
    };
  };
  const drawn: Record<string, ProbeInfo> = {};
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
      drawn[String(probes)] = describe(parent);
      probes += 1;
    }
    const families = getComputedStyle(parent).fontFamily.split(',');
    const first = families[0].replaceAll('"', '').trim();
    if (parent.closest('.katex') || /^KaTeX/.test(first)) continue;
    const family: PlexFamily = /mono/i.test(first) ? 'mono' : 'sans';
    const label = parent.closest('[data-testid]')?.getAttribute('data-testid') ?? '';
    texts.push({ text, family, where: `${parent.tagName.toLowerCase()} ${label}`.trim() });
  }
  const isShown = (element: Element) => {
    const box = element.getBoundingClientRect();
    return (
      element.checkVisibility({ visibilityProperty: true }) &&
      (box.width >= hiddenBox || box.height >= hiddenBox)
    );
  };
  const controls = [
    ...root.querySelectorAll(
      'input:not([type="range"], [type="checkbox"], [type="radio"], [type="hidden"]), select, textarea',
    ),
  ]
    .filter(isShown)
    .map((control) => ({
      ...describe(control),
      text: (control as HTMLInputElement).value ?? '',
      isLeaf: false,
    }));
  const inlineMath = [...root.querySelectorAll('.katex')]
    .filter((formula) => !formula.closest('.katex-display') && isShown(formula))
    .map((formula) => ({
      size: parseFloat(getComputedStyle(formula).fontSize),
      parentSize: parseFloat(getComputedStyle(formula.parentElement ?? formula).fontSize),
      where: describe(formula).where,
    }));
  return { texts, probes, drawn, controls, inlineMath };
}

/** Every element that draws text: all of them are tagged, those inside KaTeX too (its faces only). */
async function collectProbes(page: Page, rootSelector: string): Promise<Collected> {
  return page.evaluate(collectInPage, {
    rootSelector,
    attribute: PROBE_ATTRIBUTE,
    hiddenBox: HIDDEN_BOX_PX,
    numbering: NUMBERING_SELECTOR,
  });
}

/** An SVG <text> as the browser set it, run by run, with where it is. */
interface FigureLabel {
  runs: LabelRun[];
  where: string;
}

/**
 * Runs in the page. Every SVG <text> under the root (drawn or not: computed style needs no
 * layout), outside the numbering, as runs of its text nodes: italic or not, and a script when its
 * size is under the label's (MathText's tspan at 75 %).
 */
function collectFigureLabelsInPage({
  rootSelector,
  numbering,
}: {
  rootSelector: string;
  numbering: string;
}): FigureLabel[] {
  const root = document.querySelector(rootSelector);
  if (!root) return [];
  return [...root.querySelectorAll('svg text')]
    .filter((label) => label.closest(numbering) === null)
    .map((label) => {
      const labelSize = parseFloat(getComputedStyle(label).fontSize);
      const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
      const runs: LabelRun[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const style = getComputedStyle(node.parentElement ?? label);
        runs.push({
          text: node.textContent ?? '',
          isItalic: style.fontStyle !== 'normal',
          isScript: parseFloat(style.fontSize) < labelSize,
        });
      }
      const testId = label.closest('[data-testid]')?.getAttribute('data-testid') ?? '';
      return { runs, where: `text ${testId}`.trim() };
    });
}

/** The spoken and hover texts under the root: what a screen reader says or a tooltip shows. */
const SPOKEN_ATTRIBUTES = ['aria-label', 'aria-valuetext', 'title'] as const;

/** Runs in the page. Each spoken attribute under the root (the root too), with its element. */
function collectSpokenInPage({
  rootSelector,
  attributes,
}: {
  rootSelector: string;
  attributes: readonly string[];
}): TextNodeInfo[] {
  const root = document.querySelector(rootSelector);
  if (!root) return [];
  const selector = attributes.map((name) => `[${name}]`).join(', ');
  const elements = [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)];
  return elements.flatMap((element) =>
    attributes
      .filter((name) => element.hasAttribute(name))
      .map((name) => ({
        text: element.getAttribute(name) ?? '',
        family: 'sans' as const,
        where: `${element.tagName.toLowerCase()}[${name}]`,
      })),
  );
}

/** Upright Latin variables of the figures under the root, one line per label. */
async function figureVariableLines(page: Page, rootSelector: string): Promise<string[]> {
  const labels = await page.evaluate(collectFigureLabelsInPage, {
    rootSelector,
    numbering: NUMBERING_SELECTOR,
  });
  return labels.flatMap(({ runs, where }) => {
    const letters = uprightFigureVariables(runs);
    if (letters.length === 0) return [];
    const text = runs
      .map((run) => run.text)
      .join('')
      .trim()
      .slice(0, 60);
    return [
      `variable latina recta en una figura (${letters.join(', ')}; va en cursiva, entre $…$): ${where} «${text}»`,
    ];
  });
}

/** Notation left raw in what is spoken (aria-label, aria-valuetext) or shown on hover (title). */
async function spokenNotationLines(page: Page, rootSelector: string): Promise<string[]> {
  const spoken = await page.evaluate(collectSpokenInPage, {
    rootSelector,
    attributes: SPOKEN_ATTRIBUTES,
  });
  return spoken.flatMap(({ text, where }) =>
    rawNotationMarks(text).map((mark) => `${mark} en ${where} «${text.trim().slice(0, 60)}»`),
  );
}

interface FontCheck {
  /** «family xN dibuja «text»» for each element drawn with a font that is not allowed. */
  problems: string[];
  /** Why the check itself could not run on a node: never swallowed, never read as «no fonts». */
  errors: string[];
  /** Tagged elements the browser returned a platform font for. */
  fontNodes: number;
  /** Per probe index, the fonts the browser used for it. */
  fontsByProbe: Map<string, DrawnFont[]>;
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
  const fontsByProbe = new Map<string, DrawnFont[]>();
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
      fontsByProbe.set(
        result.index,
        result.fonts.map(({ familyName, glyphCount }) => ({ familyName, glyphCount })),
      );
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
  // One line per distinct failure, with how many nodes it hit (a broken protocol hits all of them).
  const counts = new Map<string, number>();
  for (const error of errors) counts.set(error, (counts.get(error) ?? 0) + 1);
  const summary = [...counts].map(([error, count]) => (count > 1 ? `${error} (×${count})` : error));
  return { problems, errors: summary, fontNodes, fontsByProbe };
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
  /** Breaks of the type rule (E3), one line each. */
  typeRule: string[];
}

/** The type rule over every drawn element, form control and inline formula measured. */
function typeRuleLines(collected: Collected, fontsByProbe: Map<string, DrawnFont[]>): string[] {
  const sample = (info: ProbeInfo) => `${info.where} «${info.text.trim().slice(0, 60)}»`;
  const elements = [
    ...Object.entries(collected.drawn).map(([index, info]) => ({
      info,
      fonts: fontsByProbe.get(index) ?? [],
    })),
    ...collected.controls.map((info) => ({ info, fonts: [] })),
  ];
  return [
    ...elements.flatMap(({ info, fonts }) =>
      typeRuleViolations({ ...info, fonts }).map((line) => `${line}: ${sample(info)}`),
    ),
    ...collected.inlineMath.flatMap(({ size, parentSize, where }) => {
      const line = inlineMathSizeViolation(size, parentSize);
      return line === undefined ? [] : [`${line}: ${where}`];
    }),
  ];
}

/** One measurement of the page (or the part of it under `rootSelector`) in its current state. */
async function measureOnce(
  page: Page,
  cdp: CDPSession,
  rootSelector = 'body',
): Promise<GlyphReport> {
  const collected = await collectProbes(page, rootSelector);
  const { texts, probes } = collected;
  const uncovered = texts.flatMap(({ text, family, where }) =>
    uncoveredChars(text, family).map(
      (char) =>
        `${char} (U+${char.codePointAt(0)?.toString(16)}) en ${where} «${text.trim().slice(0, 60)}»`,
    ),
  );
  const rawNotation = [
    ...texts.flatMap(({ text, where }) =>
      rawNotationMarks(text).map((mark) => `${mark} en ${where} «${text.trim().slice(0, 60)}»`),
    ),
    ...(await spokenNotationLines(page, rootSelector)),
  ];
  const { problems, errors, fontNodes, fontsByProbe } = await checkFonts(
    page,
    cdp,
    rootSelector,
    probes,
  );
  const typeRule = [
    ...new Set([
      ...typeRuleLines(collected, fontsByProbe),
      ...(await figureVariableLines(page, rootSelector)),
    ]),
  ];
  return { uncovered, rawNotation, fonts: problems, probes, fontNodes, errors, typeRule };
}

/** A running lab may replace a node between tagging it and asking CDP about it: measure again. */
const MEASURE_ATTEMPTS = 3;
/**
 * A node lost to a re-render: gone before DOM.querySelectorAll found it, or between that and the
 * font query (CDP's «Could not find node with given id»; Tema 9 after a preset, 3 of 160 runs).
 */
const LOST_NODES = /^CDP encontró \d+ de los|^error de CDP: .*Could not find node with given id/;

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
    ...report.typeRule.map((line) => `regla tipográfica: ${line}`),
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
