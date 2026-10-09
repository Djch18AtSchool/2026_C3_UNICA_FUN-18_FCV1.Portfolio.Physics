/**
 * Testing Library collapses every whitespace run (U+202F included) before matching.
 * formatNumber's narrow no-break spaces are part of what we assert, so match verbatim.
 */
export const EXACT_TEXT = { normalizer: (text: string) => text };
