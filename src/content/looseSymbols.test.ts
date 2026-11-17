/**
 * Guard of the type rule's last mile (src/lib/looseSymbols.ts): no letter that names a magnitude
 * of its page is loose in what the reader reads. It walks each topic's MDX (prose, captions, lab
 * notes, equation meanings, figure sources, the notes of «Con lo visto en clase») and the strings
 * its laboratory and figures show as text (preset names and notes, select options, hints, table
 * captions): whatever passes through KaTeX inline (`$…$`) or is a reader-facing text by its key.
 * Accessible names (aria-label, an SVG's <title>/<desc>) are spoken, not drawn: not read here.
 * A new topic is walked as soon as its MDX exists.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, test } from 'vitest';
import { splitInlineMath } from '../lib/inlineSegments';
import { looseSymbols, texVariables, withoutInterpolations } from '../lib/looseSymbols';

const ROOT = process.cwd();
const TOPICS_DIR = join(ROOT, 'src/content/topics');

/**
 * Loose letters that are not magnitudes, each with its reason. A context is matched as a
 * substring of the text around the letter (looseSymbols' `context`), so keep it short and exact.
 */
const EXCEPTIONS: readonly { context: RegExp; reason: string }[] = [
  { context: /M\. A\. Minovitch/u, reason: 'iniciales de un nombre propio (Tema 9)' },
  { context: /Panel B:/u, reason: 'nombre del panel de la figura (Tema 8)' },
  { context: /Espacio o K reproduce/u, reason: 'nombre de una tecla del atajo (Tema 7)' },
  { context: /^m$/u, reason: 'la unidad de una barra de escala (ScaleUnit.label): metros' },
  {
    context: /Target Coef A, B, C/u,
    reason: 'nombres de los campos de la lista de la EPA, citados en inglés (Tema 6)',
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

function codeSources(paths: readonly string[]): Omit<TopicSources, 'slug'> {
  const texts = paths.flatMap((path) => {
    const code = readFileSync(join(ROOT, path), 'utf8').replace(COMMENTS, ' ');
    return [...code.matchAll(KEYED_STRING)].flatMap(([, key, separator, constant, ...values]) => {
      const text = unescape(values.find((value) => value !== undefined) ?? '');
      return isReaderString([key, separator, constant], text) ? [{ where: path, text }] : [];
    });
  });
  return { texts, formulas: texts.flatMap(({ text }) => inlineFormulas(text)) };
}

/** A topic's laboratory, figures and table: its own folder and its table module. */
function codePaths(slug: string): string[] {
  const folder = `src/components/topics/${slug}`;
  const own = readdirSync(join(ROOT, folder))
    .filter((name) => /\.tsx?$/u.test(name) && !/\.test\.|TestKit/u.test(name))
    .map((name) => `${folder}/${name}`);
  return [...own, `src/lib/tables/topics/${slug}.ts`];
}

function topicSources(slug: string): TopicSources {
  const mdx = mdxSources(slug);
  const code = codeSources(codePaths(slug));
  return {
    slug,
    texts: [...mdx.texts, ...code.texts],
    formulas: [...mdx.formulas, ...code.formulas],
  };
}

const SLUGS = readdirSync(TOPICS_DIR)
  .filter((name) => name.endsWith('.mdx'))
  .map((name) => name.replace(/\.mdx$/u, ''));

const isExcepted = (context: string) => EXCEPTIONS.some(({ context: c }) => c.test(context));

describe('ninguna letra de magnitud suelta fuera de una fórmula', () => {
  test.each(SLUGS)('%s', (slug) => {
    const { texts, formulas } = topicSources(slug);
    const symbols = new Set(formulas.flatMap(texVariables));
    const loose = texts.flatMap(({ where, text }) =>
      looseSymbols(text, symbols)
        .filter(({ context }) => !isExcepted(context))
        .map(({ letter, context }) => `${where} [${letter}] …${context}…`),
    );

    expect(loose).toEqual([]);
  });
});
