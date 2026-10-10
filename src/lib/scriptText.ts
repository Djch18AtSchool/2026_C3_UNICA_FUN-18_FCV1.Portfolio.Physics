/**
 * Text embedded in a `<script type="text/plain">` must never contain "</script", or the page's
 * HTML ends early. A backslash goes after every "<" that precedes "/", "!" or "\": the embed then
 * has no "</" (no closing tag) and no "<!" (no comment-like escape state), and reading it back
 * removes exactly the backslashes that were added, so any text survives the round trip.
 */
const NEEDS_ESCAPE = /<([/!\\])/g;
const ESCAPED = /<\\([/!\\])/g;

export function embedScriptText(text: string): string {
  return text.replace(NEEDS_ESCAPE, '<\\$1');
}

export function readScriptText(embedded: string): string {
  return embedded.replace(ESCAPED, '<$1');
}
