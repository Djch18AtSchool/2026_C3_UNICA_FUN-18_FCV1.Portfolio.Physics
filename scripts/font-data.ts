/**
 * Reads the site's real font files and writes two generated modules:
 *
 * - src/lib/plexCoverage.ts: the code points IBM Plex Sans and IBM Plex Mono draw on this site,
 *   from the @fontsource files BaseLayout imports (Sans 400/500/600 upright and italic, Mono
 *   400/500 upright). A character counts as covered by a family when every imported face draws
 *   it; for each face the browser may pick any @font-face subset whose `unicode-range` contains
 *   the character, so a face covers the union over its subsets of (cmap ∩ unicode-range). Also
 *   the symbols the «Math Symbols» face of src/styles/math.css draws where Plex Sans has none
 *   (KaTeX_Main's → ∞ ≈ ≤ ≥ …, every face of it, within its unicode-range).
 * - src/lib/glyphAdvances.ts: advance widths (thousandths of an em) of Plex Sans 400 upright and
 *   italic, of Plex Mono (one width: it is monospaced, checked here) and of those symbols, so a
 *   figure label can place a drawn vector arrow over its base letter without measuring the DOM.
 *
 * WOFF 1.0 files are read with node:zlib (no new dependency); cmap formats 4 and 12 are parsed.
 * Run with `pnpm run data:fonts`; src/lib/fontData.test.ts re-derives both modules from
 * node_modules and fails if the committed ones drift from the installed fonts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';

export type CodeRange = readonly [number, number];
/** Code point → glyph id. */
type GlyphMap = Map<number, number>;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const COVERAGE_OUTPUT = 'src/lib/plexCoverage.ts';
export const ADVANCES_OUTPUT = 'src/lib/glyphAdvances.ts';
/** The stylesheet that declares the «Math Symbols» face (KaTeX_Main for what Plex lacks). */
export const MATH_CSS = 'src/styles/math.css';
export const MATH_SYMBOLS_FAMILY = 'Math Symbols';

export type FontStyle = 'normal' | 'italic';

/** The faces BaseLayout.astro imports; keep in step with its @fontsource imports. */
export const PLEX_FACES = {
  sans: {
    pkg: '@fontsource/ibm-plex-sans',
    weights: [400, 500, 600],
    styles: ['normal', 'italic'] as readonly FontStyle[],
  },
  mono: {
    pkg: '@fontsource/ibm-plex-mono',
    weights: [400, 500],
    styles: ['normal'] as readonly FontStyle[],
  },
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
/** Advance widths are tabulated for Sans over these ranges: Latin, Greek and the punctuation blocks. */
const SANS_ADVANCE_RANGES: readonly CodeRange[] = [
  [0x0020, 0x024f],
  [0x0370, 0x03ff],
  [0x2000, 0x22ff],
];
/** The italic is tabulated for the letters a figure sets in it: Latin and Greek. */
const ITALIC_ADVANCE_RANGES: readonly CodeRange[] = [
  [0x0041, 0x005a],
  [0x0061, 0x007a],
  [0x0391, 0x03c9],
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

/** The faces of one style in a @fontsource weight stylesheet: their WOFF file and unicode-range. */
export function parseFaces(css: string, style: FontStyle = 'normal'): FontFace[] {
  return [...css.matchAll(FACE_PATTERN)]
    .map(([, body]) => body)
    .filter((body) => new RegExp(`font-style:\\s*${style}`).test(body))
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
function weightAdvances(
  root: string,
  family: PlexFamily,
  weight: number,
  style: FontStyle = 'normal',
): Map<number, number> {
  const pkgDir = resolve(root, 'node_modules', PLEX_FACES[family].pkg);
  const sheet = style === 'italic' ? `${weight}-italic.css` : `${weight}.css`;
  const faces = parseFaces(readFileSync(resolve(pkgDir, sheet), 'utf8'), style);
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

/** The code points every imported face (weight and style) of a family draws. */
function familyPoints(family: PlexFamily, root: string): number[] {
  const { weights, styles } = PLEX_FACES[family];
  const [first, ...rest] = styles.flatMap((style) =>
    weights.map((weight) => weightAdvances(root, family, weight, style)),
  );
  return [...first.keys()].filter((point) => rest.every((face) => face.has(point)));
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

export interface SymbolFace {
  /** The WOFF 1.0 sibling of the face's woff2 (same glyphs; this script reads WOFF 1.0). */
  file: string;
  ranges: CodeRange[];
  /** size-adjust as a factor (116.74% → 1.1674). */
  sizeAdjust: number;
}

const PERCENT = 100;

/** The «Math Symbols» faces of math.css: their KaTeX file, unicode-range and size-adjust. */
export function parseSymbolFaces(css: string): SymbolFace[] {
  return [...css.matchAll(FACE_PATTERN)]
    .map(([, body]) => body)
    .filter((body) => body.includes(`'${MATH_SYMBOLS_FAMILY}'`))
    .map((body) => {
      const file = /url\('[^']*\/([^'/]+)\.woff2'\)/.exec(body)?.[1];
      const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1];
      const adjust = /size-adjust:\s*([\d.]+)%;/.exec(body)?.[1];
      if (!file || !range || !adjust) throw new Error('font-data: incomplete Math Symbols face');
      return {
        file: `${file}.woff`,
        ranges: parseUnicodeRange(range),
        sizeAdjust: Number(adjust) / PERCENT,
      };
    });
}

function symbolFaces(root: string): SymbolFace[] {
  const faces = parseSymbolFaces(readFileSync(resolve(root, MATH_CSS), 'utf8'));
  if (faces.length === 0) throw new Error(`font-data: no ${MATH_SYMBOLS_FAMILY} face in math.css`);
  return faces;
}

/**
 * Code point → advance of the symbols the «Math Symbols» faces draw where Plex Sans has no glyph:
 * every face draws them (cmap ∩ unicode-range); the advance is the regular face's, unscaled.
 */
function symbolAdvances(root: string): Map<number, number> {
  const plex = new Set(familyPoints('sans', root));
  const [first, ...rest] = symbolFaces(root).map(({ file, ranges }) => {
    const advances = advancesOf(readFileSync(resolve(root, 'node_modules/katex/dist/fonts', file)));
    return new Map([...advances].filter(([point]) => inRanges(point, ranges) && !plex.has(point)));
  });
  return new Map([...first].filter(([point]) => rest.every((face) => face.has(point))));
}

/** The code points the «Math Symbols» face draws for the site's sans stack. */
export function deriveSymbolCoverage(root: string = ROOT): CodeRange[] {
  return toRanges([...symbolAdvances(root).keys()]);
}

/** size-adjust of the «Math Symbols» faces (one value: they must agree). */
export function symbolSizeAdjust(root: string = ROOT): number {
  const adjusts = new Set(symbolFaces(root).map((face) => face.sizeAdjust));
  if (adjusts.size !== 1) throw new Error('font-data: Math Symbols faces disagree on size-adjust');
  return [...adjusts][0];
}

export interface GlyphAdvanceData {
  mono: number;
  sans: [number, number][];
  sansItalic: [number, number][];
  symbols: [number, number][];
}

/** One face's advances over `ranges`, limited to what the whole family covers, sorted. */
function tabulate(
  advances: Map<number, number>,
  covered: ReadonlySet<number>,
  ranges: readonly CodeRange[],
): [number, number][] {
  return [...advances]
    .filter(([point]) => covered.has(point) && inRanges(point, ranges))
    .sort(([a], [b]) => a - b);
}

export function deriveAdvances(root: string = ROOT): GlyphAdvanceData {
  const covered = new Set(familyPoints('sans', root));
  const upright = weightAdvances(root, 'sans', SANS_ADVANCE_WEIGHT);
  const italic = weightAdvances(root, 'sans', SANS_ADVANCE_WEIGHT, 'italic');
  return {
    mono: monoAdvance(root),
    sans: tabulate(upright, covered, SANS_ADVANCE_RANGES),
    sansItalic: tabulate(italic, covered, ITALIC_ADVANCE_RANGES),
    symbols: [...symbolAdvances(root)].sort(([a], [b]) => a - b),
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
export function coverageModule(
  sans: readonly CodeRange[],
  mono: readonly CodeRange[],
  symbols: readonly CodeRange[],
  sizeAdjust: number,
): string {
  const literal = (ranges: readonly CodeRange[]) =>
    ranges.map(([from, to]) => `  [${hex(from)}, ${hex(to)}],`).join('\n');
  return `${HEADER(`Code point ranges (inclusive) that every imported face of IBM Plex draws, read from the cmap
 * of the @fontsource WOFF files and limited to each face's unicode-range. Sans: 400, 500, 600,
 * upright and italic. Mono: 400, 500. And the symbols of the «Math Symbols» face (math.css).`)}
export type CodeRange = readonly [number, number];

export const PLEX_SANS_RANGES: readonly CodeRange[] = [
${literal(sans)}
];

export const PLEX_MONO_RANGES: readonly CodeRange[] = [
${literal(mono)}
];

/** What KaTeX_Main draws, as «Math Symbols», after Plex Sans in the sans stack: Plex lacks it. */
export const MATH_SYMBOL_RANGES: readonly CodeRange[] = [
${literal(symbols)}
];

/** The faces' size-adjust: KaTeX's x-height scaled to Plex's. */
export const MATH_SYMBOL_SIZE_ADJUST = ${sizeAdjust};
`;
}

/** The source text of src/lib/glyphAdvances.ts. */
export function advancesModule(data: GlyphAdvanceData): string {
  const points = (entries: readonly [number, number][]) =>
    wrapped(entries.map(([point, width]) => `${hex(point)}: ${width},`));
  return `${HEADER(`Advance widths in thousandths of an em, read from the hmtx tables of the site's fonts.`)}

/** Every glyph of IBM Plex Mono (400 and 500) advances this much. */
export const PLEX_MONO_ADVANCE = ${data.mono};

/** IBM Plex Sans 400, code point → advance, over Latin, Greek and the punctuation blocks it covers. */
export const PLEX_SANS_ADVANCES: Readonly<Record<number, number>> = {
${points(data.sans)}
};

/** IBM Plex Sans 400 Italic, code point → advance, over the Latin and Greek letters. */
export const PLEX_SANS_ITALIC_ADVANCES: Readonly<Record<number, number>> = {
${points(data.sansItalic)}
};

/** «Math Symbols» (KaTeX_Main Regular), code point → advance before its size-adjust. */
export const MATH_SYMBOL_ADVANCES: Readonly<Record<number, number>> = {
${points(data.symbols)}
};
`;
}

function main(): void {
  const coverage = coverageModule(
    deriveFamilyCoverage('sans'),
    deriveFamilyCoverage('mono'),
    deriveSymbolCoverage(),
    symbolSizeAdjust(),
  );
  writeFileSync(resolve(ROOT, COVERAGE_OUTPUT), coverage);
  writeFileSync(resolve(ROOT, ADVANCES_OUTPUT), advancesModule(deriveAdvances()));
  process.stdout.write(`font-data: wrote ${COVERAGE_OUTPUT} and ${ADVANCES_OUTPUT}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
