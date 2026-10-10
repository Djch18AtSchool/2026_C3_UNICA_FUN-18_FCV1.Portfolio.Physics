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
const INLINE_MATH = /\$[^$\n]+\$/g;
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

/** Replace every JSX tag (opening, closing, self-closing, over any lines) with a space. */
function stripTags(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    const isTag = text[i] === '<' && TAG_START.test(text[i + 1] ?? '');
    if (!isTag) {
      result += text[i++];
      continue;
    }
    result += ' ';
    i = tagEnd(text, i);
  }
  return result;
}

/** The body as read: no frontmatter, imports, code blocks or math; tags removed, prose kept. */
function readableText(body: string): { prose: string; figures: number } {
  const source = markdownSource(body.replace(FRONTMATTER, ''));
  const withoutCode = fencedLines(source)
    .filter(({ isCode }) => !isCode)
    .map(({ line }) => line)
    .join('\n');
  const figures = withoutCode.split(FIGURE_TAG).length - 1;
  const withoutMath = withoutCode.replace(DISPLAY_MATH, ' ').replace(INLINE_MATH, ' ');
  return { prose: stripTags(withoutMath), figures };
}

/** Whole minutes to read: prose words / 200 plus 0.5 per figure, rounded, at least one. */
export function readingMinutes(body: string): number {
  const { prose, figures } = readableText(body);
  const words = prose.split(/\s+/).filter(Boolean).length;
  const minutes = Math.round(words / WORDS_PER_MINUTE + figures * MINUTES_PER_FIGURE);
  return Math.max(MIN_MINUTES, minutes);
}
