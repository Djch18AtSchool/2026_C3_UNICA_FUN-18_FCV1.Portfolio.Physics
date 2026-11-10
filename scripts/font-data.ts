/**
 * Reads the site's real font files and writes two generated modules:
 *
 * - src/lib/plexCoverage.ts: the code points IBM Plex Sans and IBM Plex Mono draw on this site,
 *   from the @fontsource files BaseLayout imports (Sans 400/500/600, Mono 400/500, upright). A
 *   character counts as covered by a family when every imported weight draws it; for each weight
 *   the browser may pick any @font-face subset whose `unicode-range` contains the character, so a
 *   weight covers the union over its subsets of (cmap ∩ unicode-range).
 * - src/lib/glyphAdvances.ts: advance widths (thousandths of an em) of Plex Sans 400, of Plex
 *   Mono (one width: it is monospaced, checked here) and of the KaTeX characters MathText routes
 *   to KaTeX_Main and KaTeX_Math (src/lib/mathFonts.ts), so a figure label can place a drawn
 *   vector arrow over its base letter without measuring the DOM.
 *
 * WOFF 1.0 files are read with node:zlib (no new dependency); cmap formats 4 and 12 are parsed.
 * Run with `pnpm run data:fonts`; src/lib/fontData.test.ts re-derives both modules from
 * node_modules and fails if the committed ones drift from the installed fonts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import { KATEX_MAIN_CHARS, KATEX_MATH_CHARS } from '../src/lib/mathFonts';

export type CodeRange = readonly [number, number];
/** Code point → glyph id. */
type GlyphMap = Map<number, number>;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const COVERAGE_OUTPUT = 'src/lib/plexCoverage.ts';
export const ADVANCES_OUTPUT = 'src/lib/glyphAdvances.ts';

/** The faces BaseLayout.astro imports; keep in step with its @fontsource imports. */
export const PLEX_FACES = {
  sans: { pkg: '@fontsource/ibm-plex-sans', weights: [400, 500, 600] },
  mono: { pkg: '@fontsource/ibm-plex-mono', weights: [400, 500] },
} as const;

export type PlexFamily = keyof typeof PLEX_FACES;

const WOFF_SIGNATURE = 0x774f4646; // 'wOFF'
const WOFF_HEADER_BYTES = 44;
const WOFF_DIR_ENTRY_BYTES = 20;
const CMAP_RECORD_BYTES = 8;
const FORMAT4_HEADER_BYTES = 14;
const FORMAT12_HEADER_BYTES = 16;
const FORMAT12_GROUP_BYTES = 12;
const HEAD_UNITS_PER_EM = 18;
const HHEA_NUMBER_OF_HMETRICS = 34;
const HMTX_RECORD_BYTES = 4;
const MISSING_GLYPH = 0;
const LAST_BMP = 0xffff;
const PER_MILLE = 1000;
/** Advance widths are tabulated for Sans over these ranges: Latin and the punctuation blocks. */
const SANS_ADVANCE_RANGES: readonly CodeRange[] = [
  [0x0020, 0x024f],
  [0x2000, 0x22ff],
];
/** The weight whose Sans advances are tabulated: the body text's. */
const SANS_ADVANCE_WEIGHT = 400;

/** The uncompressed table `tag` of a WOFF 1.0 file. */
export function woffTable(woff: Uint8Array, tag: string): DataView {
  const view = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  if (view.getUint32(0) !== WOFF_SIGNATURE) throw new Error('font-data: not a WOFF 1.0 file');
  const wanted = [...tag].reduce((code, char) => code * 256 + char.charCodeAt(0), 0);
  for (let i = 0; i < view.getUint16(12); i += 1) {
    const entry = WOFF_HEADER_BYTES + i * WOFF_DIR_ENTRY_BYTES;
    if (view.getUint32(entry) !== wanted) continue;
    const offset = view.getUint32(entry + 4);
    const compLength = view.getUint32(entry + 8);
    const raw = woff.subarray(offset, offset + compLength);
    const table = compLength < view.getUint32(entry + 12) ? new Uint8Array(inflateSync(raw)) : raw;
    return new DataView(table.buffer, table.byteOffset, table.byteLength);
  }
  throw new Error(`font-data: WOFF without a ${tag} table`);
}

/** Glyphs of a format 4 subtable starting at `start`. */
function format4(cmap: DataView, start: number): GlyphMap {
  const segCount = cmap.getUint16(start + 6) / 2;
  const endCodes = start + FORMAT4_HEADER_BYTES;
  const startCodes = endCodes + 2 * segCount + 2;
  const deltas = startCodes + 2 * segCount;
  const rangeOffsets = deltas + 2 * segCount;
  const glyphs: GlyphMap = new Map();
  for (let s = 0; s < segCount; s += 1) {
    const first = cmap.getUint16(startCodes + 2 * s);
    const delta = cmap.getInt16(deltas + 2 * s);
    const rangeOffsetAt = rangeOffsets + 2 * s;
    const rangeOffset = cmap.getUint16(rangeOffsetAt);
    for (let c = first; c <= cmap.getUint16(endCodes + 2 * s) && c !== LAST_BMP; c += 1) {
      const raw =
        rangeOffset === 0 ? c : cmap.getUint16(rangeOffsetAt + rangeOffset + 2 * (c - first));
      const glyph = raw === 0 && rangeOffset !== 0 ? MISSING_GLYPH : (raw + delta) & LAST_BMP;
      if (glyph !== MISSING_GLYPH) glyphs.set(c, glyph);
    }
  }
  return glyphs;
}

/** Glyphs of a format 12 subtable starting at `start`. */
function format12(cmap: DataView, start: number): GlyphMap {
  const glyphs: GlyphMap = new Map();
  for (let g = 0; g < cmap.getUint32(start + 12); g += 1) {
    const at = start + FORMAT12_HEADER_BYTES + g * FORMAT12_GROUP_BYTES;
    const first = cmap.getUint32(at);
    for (let c = first; c <= cmap.getUint32(at + 4); c += 1) {
      const glyph = cmap.getUint32(at + 8) + (c - first);
      if (glyph !== MISSING_GLYPH) glyphs.set(c, glyph);
    }
  }
  return glyphs;
}

/** Code point → glyph id from the Unicode cmap subtable (format 12 preferred over 4). */
export function cmapGlyphs(cmap: DataView): GlyphMap {
  const subtables = Array.from({ length: cmap.getUint16(2) }, (_, i) => {
    const at = 4 + i * CMAP_RECORD_BYTES;
    const offset = cmap.getUint32(at + 4);
    return { platform: cmap.getUint16(at), offset, format: cmap.getUint16(offset) };
  });
  const unicode = subtables.filter(({ platform }) => platform === 0 || platform === 3);
  const best = unicode.find(({ format }) => format === 12) ?? unicode.find((t) => t.format === 4);
  if (!best) throw new Error('font-data: no Unicode cmap subtable of format 4 or 12');
  return best.format === 12 ? format12(cmap, best.offset) : format4(cmap, best.offset);
}

/** Advance widths of a WOFF file's characters, in thousandths of an em. */
export function advancesOf(woff: Uint8Array): Map<number, number> {
  const unitsPerEm = woffTable(woff, 'head').getUint16(HEAD_UNITS_PER_EM);
  const metricsCount = woffTable(woff, 'hhea').getUint16(HHEA_NUMBER_OF_HMETRICS);
  const hmtx = woffTable(woff, 'hmtx');
  const advance = (glyph: number) =>
    hmtx.getUint16(Math.min(glyph, metricsCount - 1) * HMTX_RECORD_BYTES);
  const entries = [...cmapGlyphs(woffTable(woff, 'cmap'))].map(
    ([point, glyph]): [number, number] => [
      point,
      Math.round((advance(glyph) * PER_MILLE) / unitsPerEm),
    ],
  );
  return new Map(entries);
}

/** "U+0460-052F,U+20B4,U+4??" → inclusive ranges. */
export function parseUnicodeRange(text: string): CodeRange[] {
  return text.split(',').map((part) => {
    const body = part.trim().replace(/^U\+/i, '');
    if (body.includes('?')) {
      return [parseInt(body.replaceAll('?', '0'), 16), parseInt(body.replaceAll('?', 'F'), 16)];
    }
    const [from, to = from] = body.split('-');
    return [parseInt(from, 16), parseInt(to, 16)];
  });
}

export interface FontFace {
  file: string;
  ranges: CodeRange[];
}

const FACE_PATTERN = /@font-face\s*{([^}]*)}/g;

/** The upright faces of a @fontsource weight stylesheet: their WOFF file and unicode-range. */
export function parseFaces(css: string): FontFace[] {
  return [...css.matchAll(FACE_PATTERN)]
    .map(([, body]) => body)
    .filter((body) => /font-style:\s*normal/.test(body))
    .map((body) => {
      const file = /url\(\.\/files\/([^)]+\.woff)\)\s*format\('woff'\)/.exec(body)?.[1];
      const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1];
      if (!file || !range) throw new Error('font-data: face without a WOFF file or range');
      return { file, ranges: parseUnicodeRange(range) };
    });
}

export const inRanges = (point: number, ranges: readonly CodeRange[]): boolean =>
  ranges.some(([from, to]) => point >= from && point <= to);

/** Code point → advance for one weight: the union over its faces of cmap ∩ unicode-range. */
function weightAdvances(root: string, family: PlexFamily, weight: number): Map<number, number> {
  const pkgDir = resolve(root, 'node_modules', PLEX_FACES[family].pkg);
  const faces = parseFaces(readFileSync(resolve(pkgDir, `${weight}.css`), 'utf8'));
  const entries = faces.flatMap(({ file, ranges }) =>
    [...advancesOf(readFileSync(resolve(pkgDir, 'files', file)))].filter(([point]) =>
      inRanges(point, ranges),
    ),
  );
  return new Map(entries);
}

/** Sorted code points → inclusive ranges of consecutive points. */
export function toRanges(points: readonly number[]): CodeRange[] {
  const sorted = [...points].sort((a, b) => a - b);
  return sorted.reduce<CodeRange[]>((ranges, point) => {
    const last = ranges.at(-1);
    if (last && point === last[1] + 1) return [...ranges.slice(0, -1), [last[0], point]];
    return [...ranges, [point, point]];
  }, []);
}

/** The code points every imported weight of a family draws. */
function familyPoints(family: PlexFamily, root: string): number[] {
  const [first, ...rest] = PLEX_FACES[family].weights.map((w) => weightAdvances(root, family, w));
  return [...first.keys()].filter((point) => rest.every((weight) => weight.has(point)));
}

export function deriveFamilyCoverage(family: PlexFamily, root: string = ROOT): CodeRange[] {
  return toRanges(familyPoints(family, root));
}

/** The one advance of Plex Mono; throws if any covered glyph of any weight differs. */
function monoAdvance(root: string): number {
  const widths = new Set(
    PLEX_FACES.mono.weights.flatMap((w) => [...weightAdvances(root, 'mono', w).values()]),
  );
  // Zero-width marks (combining accents) do not break the monospace grid.
  const spacing = [...widths].filter((width) => width > 0);
  if (spacing.length !== 1) throw new Error(`font-data: Plex Mono widths ${spacing.join(', ')}`);
  return spacing[0];
}

/** Advances of `chars` in a KaTeX font; throws if the font does not draw one of them. */
function katexAdvances(root: string, file: string, chars: string): [string, number][] {
  const advances = advancesOf(readFileSync(resolve(root, 'node_modules/katex/dist/fonts', file)));
  return [...chars].map((char) => {
    const width = advances.get(char.codePointAt(0) ?? -1);
    if (width === undefined) throw new Error(`font-data: ${file} does not draw ${char}`);
    return [char, width];
  });
}

export interface GlyphAdvanceData {
  mono: number;
  sans: [number, number][];
  katexMain: [string, number][];
  katexMath: [string, number][];
}

export function deriveAdvances(root: string = ROOT): GlyphAdvanceData {
  const covered = new Set(familyPoints('sans', root));
  const sans = [...weightAdvances(root, 'sans', SANS_ADVANCE_WEIGHT)]
    .filter(([point]) => covered.has(point) && inRanges(point, SANS_ADVANCE_RANGES))
    .sort(([a], [b]) => a - b);
  return {
    mono: monoAdvance(root),
    sans,
    katexMain: katexAdvances(root, 'KaTeX_Main-Regular.woff', KATEX_MAIN_CHARS),
    katexMath: katexAdvances(root, 'KaTeX_Math-Italic.woff', KATEX_MATH_CHARS),
  };
}

const hex = (point: number) => `0x${point.toString(16).padStart(4, '0')}`;
const ENTRIES_PER_LINE = 8;

/** Items joined `ENTRIES_PER_LINE` to a line, indented two spaces. */
function wrapped(items: readonly string[]): string {
  const lines = Array.from({ length: Math.ceil(items.length / ENTRIES_PER_LINE) }, (_, i) =>
    items.slice(i * ENTRIES_PER_LINE, (i + 1) * ENTRIES_PER_LINE).join(' '),
  );
  return lines.map((line) => `  ${line}`).join('\n');
}

const HEADER = (what: string) => `/**
 * GENERATED by scripts/font-data.ts (\`pnpm run data:fonts\`); do not edit by hand.
 * ${what}
 */`;

/** The source text of src/lib/plexCoverage.ts. */
export function coverageModule(sans: readonly CodeRange[], mono: readonly CodeRange[]): string {
  const literal = (ranges: readonly CodeRange[]) =>
    ranges.map(([from, to]) => `  [${hex(from)}, ${hex(to)}],`).join('\n');
  return `${HEADER(`Code point ranges (inclusive) that every imported weight of IBM Plex draws, read from the cmap
 * of the @fontsource WOFF files and limited to each face's unicode-range. Sans: 400, 500, 600.
 * Mono: 400, 500.`)}
export type CodeRange = readonly [number, number];

export const PLEX_SANS_RANGES: readonly CodeRange[] = [
${literal(sans)}
];

export const PLEX_MONO_RANGES: readonly CodeRange[] = [
${literal(mono)}
];
`;
}

/** The source text of src/lib/glyphAdvances.ts. */
export function advancesModule(data: GlyphAdvanceData): string {
  const chars = (entries: readonly [string, number][]) =>
    wrapped(entries.map(([char, width]) => `'${char}': ${width},`));
  return `${HEADER(`Advance widths in thousandths of an em, read from the hmtx tables of the site's fonts.`)}

/** Every glyph of IBM Plex Mono (400 and 500) advances this much. */
export const PLEX_MONO_ADVANCE = ${data.mono};

/** IBM Plex Sans 400, code point → advance, over Latin and the punctuation blocks it covers. */
export const PLEX_SANS_ADVANCES: Readonly<Record<number, number>> = {
${wrapped(data.sans.map(([point, width]) => `${hex(point)}: ${width},`))}
};

/** KaTeX_Main Regular: uppercase Greek and the symbols Plex lacks (src/lib/mathFonts.ts). */
export const KATEX_MAIN_ADVANCES: Readonly<Record<string, number>> = {
${chars(data.katexMain)}
};

/** KaTeX_Math Italic: lowercase Greek. */
export const KATEX_MATH_ADVANCES: Readonly<Record<string, number>> = {
${chars(data.katexMath)}
};
`;
}

function main(): void {
  const coverage = coverageModule(deriveFamilyCoverage('sans'), deriveFamilyCoverage('mono'));
  writeFileSync(resolve(ROOT, COVERAGE_OUTPUT), coverage);
  writeFileSync(resolve(ROOT, ADVANCES_OUTPUT), advancesModule(deriveAdvances()));
  process.stdout.write(`font-data: wrote ${COVERAGE_OUTPUT} and ${ADVANCES_OUTPUT}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
