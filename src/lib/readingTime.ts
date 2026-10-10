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

/** The MDX body without the lines that start with "import ", trimmed. */
export function markdownSource(body: string): string {
  return body
    .split('\n')
    .filter((line) => !line.startsWith(IMPORT_PREFIX))
    .join('\n')
    .trim();
}

/** Whole minutes to read: words / 200 plus 0.5 per figure, rounded, at least one. */
export function readingMinutes(body: string): number {
  const text = markdownSource(body.replace(FRONTMATTER, ''));
  const words = text.split(/\s+/).filter(Boolean).length;
  const figures = text.split(FIGURE_TAG).length - 1;
  const minutes = Math.round(words / WORDS_PER_MINUTE + figures * MINUTES_PER_FIGURE);
  return Math.max(MIN_MINUTES, minutes);
}
