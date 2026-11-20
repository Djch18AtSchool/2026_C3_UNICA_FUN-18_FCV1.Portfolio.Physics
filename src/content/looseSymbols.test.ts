/**
 * Guard of the type rule's last mile (src/lib/looseSymbols.ts): no letter that names a magnitude
 * of its page is loose in what the reader reads. It walks each topic's MDX (prose, captions, lab
 * notes, equation meanings, figure sources, the notes of «Con lo visto en clase») and the strings
 * its laboratory and figures show as text (preset names and notes, select options, hints, table
 * captions): whatever passes through KaTeX inline (`$…$`) or is a reader-facing text by its key.
 * Accessible names (aria-label, an SVG's <title>/<desc>) are spoken, not drawn: not read here.
 * In the code it also reads the text a JSX element holds as written (`<p>…</p>`, an SVG
 * `<text>…</text>`, a `{`…`}` child), not only keyed strings.
 * It also reads what each table of the page prints, from the table registry (caption, column
 * headers, every cell written as text, source line): a table cell may come from a data module (a
 * value's «Fuente», a shot's name), which the code walk does not read.
 * A new topic is walked as soon as its MDX exists; it needs its lab folder
 * `src/components/topics/<slug>/` and its table `src/lib/tables/topics/<slug>.ts` (the site's
 * convention), and says which one is missing.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, test } from 'vitest';
import { splitInlineMath } from '../lib/inlineSegments';
import { looseSymbols, texVariables, withoutInterpolations } from '../lib/looseSymbols';
import { tableById } from '../lib/tables';
import { columnHeader, DATA_TABLE_TAG, formatCell } from '../lib/tables/markdown';

const ROOT = process.cwd();
const TOPICS_DIR = join(ROOT, 'src/content/topics');

/**
 * Loose letters that are not magnitudes, each with its reason. A context is matched against the
 * twelve characters each side of the letter (looseSymbols' `near`), so keep it short and exact:
 * a wider window would let one name hide another loose letter close by.
 */
const EXCEPTIONS: readonly { context: RegExp; reason: string }[] = [
  { context: /M\. A\. Minov/u, reason: 'iniciales de un nombre propio (Tema 9)' },
  { context: /Panel B:/u, reason: 'nombre del panel de la figura (Tema 8)' },
  { context: /Espacio o K reproduce/u, reason: 'nombre de una tecla del atajo (Tema 7)' },
  { context: /^m$/u, reason: 'la unidad de una barra de escala (ScaleUnit.label): metros' },
  {
    context: /Coef A, B, C/u,
    reason: 'nombres de los campos de la lista de la EPA, citados en inglés (Tema 6)',
  },
  {
    context: /Tabla I(?![\p{L}])/u,
    reason:
      'número romano de la tabla de Billah y Scanlan (1991), citada como la numeran (Tema 12)',
  },
];

const LATEX_ATTRIBUTE = /\blatex=(?:"([^"]*)"|\{`([^`]*)`\})/gu;
const SYMBOL_KEY = /\bsymbol:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/gu;
const IMPORT_LINE = /^import .*$/gmu;
/** A JSX tag's own code: its name and every attribute that is not a reader-facing text. */
const TEXT_PROP =
  /\b(?:caption|usage|leftOut|note|meaning|text|analysis)(?:=|:\s*)(?:"([^"]*)"|'((?:[^'\\]|\\.)*)'|\{`([^`]*)`\})/gu;

const unescape = (text: string) => text.replace(/\\\\/gu, '\\');

/** The formulas a text writes, its `$…$`. */
const inlineFormulas = (text: string) =>
  splitInlineMath(withoutInterpolations(text)).flatMap((segment) =>
    segment.kind === 'math' ? [segment.tex] : [],
  );

/** Each match's first defined group. */
const groups = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].map((match) =>
    unescape(match.slice(1).find((g) => g !== undefined) ?? ''),
  );

interface TopicSources {
  slug: string;
  /** What the reader reads, piece by piece, with where it came from. */
  texts: { where: string; text: string }[];
  /** Every formula of the page, to know its magnitudes. */
  formulas: string[];
}

/** The MDX body's prose: no imports, no tags (their text props are read apart), no equations. */
function mdxProse(body: string): string {
  return body
    .replace(IMPORT_LINE, ' ')
    .replace(LATEX_ATTRIBUTE, ' ')
    .replace(/<Equation\s+inline\b[^>]*\/>/gsu, '§')
    .replace(/<[A-Za-z/][^>]*?(?:\/>|>)/gsu, ' ');
}

function mdxSources(slug: string): Omit<TopicSources, 'slug'> {
  const raw = readFileSync(join(TOPICS_DIR, `${slug}.mdx`), 'utf8');
  const { data, content } = matter(raw);
  const notes = ((data.classRefs ?? []) as { note?: string }[]).flatMap((ref) => ref.note ?? []);
  const props = groups(content, TEXT_PROP);
  const prose = mdxProse(content)
    .split(/\n{2,}/u)
    .filter((block) => block.trim() !== '');
  const where = `${slug}.mdx`;
  const texts = [...notes, ...props, ...prose].map((text) => ({ where, text }));
  const formulas = [
    ...groups(content, LATEX_ATTRIBUTE),
    ...groups(content, SYMBOL_KEY),
    ...texts.flatMap(({ text }) => inlineFormulas(text)),
  ];
  return { texts, formulas };
}

/** A string literal in code, with the key (`key:`), attribute (`key=`) or constant it is. */
const KEYED_STRING =
  /(?:([\w-]+)\s*([:=])\s*\{?\s*|([A-Z][A-Z0-9_]*)\s*=\s*)?(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/gu;
/**
 * Keys and constants whose strings the page shows as text. Not `optionLabel`: a native <option>
 * cannot hold a formula, so it is the plain twin of a preset's `$…$` name (LabPresets).
 */
const READER_KEY =
  /^(?:note|caption|label|xLabel|yLabel|text|title|hint|usage|leftOut|name|summary|footnote)$/u;
const READER_CONSTANT = /(?:HINT|NOTE|LABEL|CAPTION|TEXT|SUMMARY)S?$/u;
/** Spoken, never drawn. */
const SPOKEN_KEY = /^(?:aria-label|ariaLabel|aria-valuetext|description|desc|alt)$/u;

/** A JSX `name=` names a part (`data-vector`), not a text. */
const isPartName = (key: string | undefined, separator: string | undefined) =>
  key === 'name' && separator === '=';

function isReaderString([key, separator, constant]: (string | undefined)[], text: string): boolean {
  if ((key && SPOKEN_KEY.test(key)) || isPartName(key, separator)) return false;
  if (inlineFormulas(text).length > 0) return true;
  return Boolean((key && READER_KEY.test(key)) || (constant && READER_CONSTANT.test(constant)));
}

const COMMENTS = /\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gmu;
/**
 * A JSX element's own text, as written: words right before a closing tag (`<p>… e² …</p>`, an SVG
 * `<text>M</text>`), or a literal child (`>{`v antes = ${…}`}<`). Code comparisons (`a < b`)
 * are never followed by `</`.
 */
const JSX_TEXT = />([^<>{}]*[A-Za-z][^<>{}]*)<\/|>\s*\{\s*`((?:[^`\\]|\\.)*)`\s*\}\s*</gu;

const jsxTexts = (code: string) =>
  [...code.matchAll(JSX_TEXT)].map(([, text, literal]) => unescape(text ?? literal ?? ''));

function codeSources(paths: readonly string[]): Omit<TopicSources, 'slug'> {
  const texts = paths.flatMap((path) => {
    const code = readFileSync(join(ROOT, path), 'utf8').replace(COMMENTS, ' ');
    const keyed = [...code.matchAll(KEYED_STRING)].flatMap(
      ([, key, separator, constant, ...values]) => {
        const text = unescape(values.find((value) => value !== undefined) ?? '');
        return isReaderString([key, separator, constant], text) ? [{ where: path, text }] : [];
      },
    );
    const jsx = path.endsWith('.tsx') ? jsxTexts(code).map((text) => ({ where: path, text })) : [];
    return [...keyed, ...jsx];
  });
  return { texts, formulas: texts.flatMap(({ text }) => inlineFormulas(text)) };
}

/** A topic's laboratory, figures and table: its own folder and its table module. */
function codePaths(slug: string): string[] {
  const folder = `src/components/topics/${slug}`;
  const table = `src/lib/tables/topics/${slug}.ts`;
  const missing = [folder, table].filter((path) => !existsSync(join(ROOT, path)));
  if (missing.length > 0) {
    throw new Error(
      `${slug}: falta ${missing.join(' y ')}. Cada tema tiene su carpeta de laboratorio y su tabla (README, «Estructura»); la guardia lee las dos.`,
    );
  }
  const own = readdirSync(join(ROOT, folder))
    .filter((name) => /\.tsx?$/u.test(name) && !/\.test\.|TestKit/u.test(name))
    .map((name) => `${folder}/${name}`);
  return [...own, table];
}

/** A column of units (Temas 12 and 13): a lone «m» or «t» there is metres or tonnes. */
const UNIT_COLUMN_LABEL = 'Unidad';

/**
 * What the page's tables print (each `<DataTable id="…" />` of its MDX, from the registry): the
 * caption, each column header with its unit, every cell written as text (numbers are formatted
 * digits) except a column of units, and the source line.
 */
function tableSources(slug: string): Omit<TopicSources, 'slug'> {
  const body = readFileSync(join(TOPICS_DIR, `${slug}.mdx`), 'utf8');
  const texts = [...body.matchAll(DATA_TABLE_TAG)].flatMap(([, id]) => {
    const { caption, columns, rows, source } = tableById(id);
    const [first] = columns;
    const cells = columns
      .filter(({ label }) => label !== UNIT_COLUMN_LABEL)
      .flatMap((column) =>
        rows.flatMap((row) =>
          typeof row[column.key] === 'string'
            ? [
                {
                  where: `${id}: ${column.key} de «${formatCell(first, row[first.key])}»`,
                  text: String(row[column.key]),
                },
              ]
            : [],
        ),
      );
    return [
      { where: `${id}: pie`, text: caption },
      ...columns.map((column) => ({ where: `${id}: columna`, text: columnHeader(column) })),
      ...cells,
      { where: `${id}: fuente`, text: source.text },
    ];
  });
  return { texts, formulas: texts.flatMap(({ text }) => inlineFormulas(text)) };
}

function topicSources(slug: string): TopicSources {
  const parts = [mdxSources(slug), codeSources(codePaths(slug)), tableSources(slug)];
  return {
    slug,
    texts: parts.flatMap(({ texts }) => texts),
    formulas: parts.flatMap(({ formulas }) => formulas),
  };
}

const SLUGS = readdirSync(TOPICS_DIR)
  .filter((name) => name.endsWith('.mdx'))
  .map((name) => name.replace(/\.mdx$/u, ''));

const isExcepted = (near: string) => EXCEPTIONS.some(({ context }) => context.test(near));

describe('ninguna letra de magnitud suelta fuera de una fórmula', () => {
  test.each(SLUGS)('%s', (slug) => {
    const { texts, formulas } = topicSources(slug);
    const symbols = new Set(formulas.flatMap(texVariables));
    const loose = texts.flatMap(({ where, text }) =>
      looseSymbols(text, symbols)
        .filter(({ near }) => !isExcepted(near))
        .map(({ letter, context }) => `${where} [${letter}] …${context}…`),
    );

    expect(loose).toEqual([]);
  });
});

describe('lo que imprimen las tablas', () => {
  test('entra en la guardia, también lo que viene de un módulo de datos, y no la columna de unidades', () => {
    const { texts } = topicSources('resonancia-estructural');
    const setra = texts.filter(({ where }) => where.startsWith('resonancia-estructural-setra:'));

    expect(setra.some(({ text }) => text.startsWith('Sétra/AFGC'))).toBe(true);
    expect(setra.some(({ where }) => where.includes(': unidad de'))).toBe(false);
    expect(setra.some(({ where }) => where.endsWith(': pie'))).toBe(true);
  });
});
