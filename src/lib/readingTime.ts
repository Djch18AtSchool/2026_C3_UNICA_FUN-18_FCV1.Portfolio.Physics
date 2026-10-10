/**
 * Reading time and the copyable source of a topic, both from its raw MDX body (`entry.body`).
 * The body has no frontmatter, but a leading one is stripped anyway so a full file also works.
 */
const WORDS_PER_MINUTE = 200;
/** Each figure or laboratory (all sit in a <Figure>) adds half a minute (spec §6). */
const MINUTES_PER_FIGURE = 0.5;
const MIN_MINUTES = 1;
const FIGURE_TAG = '<Figure';
const IMPORT_PREFIX = 'import ';
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
const FENCE = /^\s*(```|~~~)/;
const DISPLAY_MATH = /\$\$[\s\S]*?\$\$/g;
/** Inline math; a "${" opens a template interpolation in a prop, not math. */
const INLINE_MATH = /\$(?!\{)[^$\n]+\$/g;
/** What may follow "<" to open a JSX tag: a name, a closing "/" or a fragment's ">". */
const TAG_START = /[A-Za-z/>]/;
const QUOTES = new Set(['"', "'", '`']);

/** The lines of `body`, each tagged with whether it belongs to a fenced code block. */
function fencedLines(body: string): { line: string; isCode: boolean }[] {
  let isInFence = false;
  return body.split('\n').map((line) => {
    if (!FENCE.test(line)) return { line, isCode: isInFence };
    isInFence = !isInFence;
    return { line, isCode: true };
  });
}

/** The MDX body without its top-level "import " lines (those inside code fences stay), trimmed. */
export function markdownSource(body: string): string {
  return fencedLines(body)
    .filter(({ line, isCode }) => isCode || !line.startsWith(IMPORT_PREFIX))
    .map(({ line }) => line)
    .join('\n')
    .trim();
}

/** Index just past the ">" that closes the tag opened at `start`, ignoring quotes and braces. */
function tagEnd(text: string, start: number): number {
  let quote = '';
  let depth = 0;
  for (let i = start + 1; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === quote) quote = '';
    } else if (QUOTES.has(char)) quote = char;
    else if (char === '{') depth++;
    else if (char === '}') depth--;
    else if (char === '>' && depth === 0) return i + 1;
  }
  return text.length;
}

/**
 * Reader-facing text props (spec §6, reversed ruling): a JSX attribute holding a string that the
 * page shows, quoted or as a template literal (Figure `caption`, a laboratory's `footnote`, HapticVideo's `transcript`, a Step or
 * Callout `title`), and the string values of object keys the components print (Figure
 * `source.text`, HapticVideo marker `title` and `analysis`, Equation symbol `meaning`).
 * Attributes such as `id`, `latex`, `src` or `variant`, and the symbols themselves, are not read.
 */
const TEXT_ATTRIBUTE =
  /\b(?:caption|footnote|label|note|title|transcript)=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
const TEXT_KEY =
  /\b(?:analysis|label|meaning|note|text|title)\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
/** A template interpolation such as `${60 / TIME_LAPSE}` prints one value: one word. */
const INTERPOLATION = /\$\{[^}]*\}/g;
const INTERPOLATED_VALUE = '0';
/** A word is a whitespace-separated fragment with at least one letter or digit ("→" is not). */
const WORD = /[\p{L}\p{N}]/u;

/** The reader-facing strings inside one JSX tag, joined by spaces. */
function tagText(tag: string): string {
  const attributes = [...tag.matchAll(TEXT_ATTRIBUTE)].map(
    ([, double, single, template]) =>
      double ?? single ?? template.replace(INTERPOLATION, INTERPOLATED_VALUE),
  );
  const keys = [...tag.matchAll(TEXT_KEY)].map(([, single, double]) => single ?? double);
  return [...attributes, ...keys].join(' ');
}

/** Split the text into its prose (every JSX tag replaced by a space) and its tags' read text. */
function splitTags(text: string): { prose: string; props: string } {
  let prose = '';
  const props: string[] = [];
  let i = 0;
  while (i < text.length) {
    const isTag = text[i] === '<' && TAG_START.test(text[i + 1] ?? '');
    if (!isTag) {
      prose += text[i++];
      continue;
    }
    const end = tagEnd(text, i);
    props.push(tagText(text.slice(i, end)));
    prose += ' ';
    i = end;
  }
  return { prose, props: props.join(' ') };
}

/** The body as read: no frontmatter, imports, code blocks or math; tags split from the prose. */
function readableText(body: string): { prose: string; props: string; figures: number } {
  const source = markdownSource(body.replace(FRONTMATTER, ''));
  const withoutCode = fencedLines(source)
    .filter(({ isCode }) => !isCode)
    .map(({ line }) => line)
    .join('\n');
  const figures = withoutCode.split(FIGURE_TAG).length - 1;
  const withoutMath = withoutCode.replace(DISPLAY_MATH, ' ').replace(INLINE_MATH, ' ');
  return { ...splitTags(withoutMath), figures };
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => WORD.test(token)).length;
}

export interface ReadingStats {
  /** Words of the Markdown prose, outside every tag. */
  proseWords: number;
  /** Words of the reader-facing text props: captions, footnotes, sources, analyses… */
  propWords: number;
  /** Figures and laboratories (each sits in a <Figure>). */
  figures: number;
}

/** What a reader reads in an MDX body: prose words, text-prop words and figures. */
export function readingStats(body: string): ReadingStats {
  const { prose, props, figures } = readableText(body);
  return { proseWords: countWords(prose), propWords: countWords(props), figures };
}

/** Whole minutes to read: (prose + text-prop words) / 200 plus 0.5 per figure, at least one. */
export function readingMinutes(body: string): number {
  const { proseWords, propWords, figures } = readingStats(body);
  const words = proseWords + propWords;
  const minutes = Math.round(words / WORDS_PER_MINUTE + figures * MINUTES_PER_FIGURE);
  return Math.max(MIN_MINUTES, minutes);
}
