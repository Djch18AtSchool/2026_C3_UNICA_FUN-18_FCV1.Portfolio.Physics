/**
 * The typeset formulas of a lab whose labels mount after its data has loaded. Such a lab renders
 * only a skeleton on the server, and its labels would be new after hydration, so each would have
 * KaTeX's JavaScript downloaded (76,8 KB gzip) for a handful of fixed formulas. The skeleton
 * carries them instead, as JSON typeset by the server; the lab calls readTexSeed() just before it
 * mounts its labels and InlineMath finds them ready. A formula that was not listed still loads
 * KaTeX as usual, so a missing entry costs bytes, never correctness. Usage:
 *
 *   <TexSeed formulas={[...LAB_FORMULAS, ...formulasOf(usage)]} />      // in the skeleton
 *   readTexSeed();                                                      // before the labels
 */
import type { JSX } from 'react';
import { splitInlineMath } from '../../lib/inlineMath';
import { seedTexHtml, typesetNow } from './texRenderer';

const SEED_ATTRIBUTE = 'data-tex-seed';
const SEED_SELECTOR = `script[${SEED_ATTRIBUTE}]`;
/** A character that would close the script (`</script>`) is written as its JSON escape. */
const UNSAFE_IN_SCRIPT = /</g;
const ESCAPED_LESS_THAN = '\\u003c';

/** The distinct formulas written between `$…$` in a text, in order. */
export function formulasOf(text: string): string[] {
  const formulas = splitInlineMath(text).flatMap((segment) =>
    segment.kind === 'math' ? [segment.tex] : [],
  );
  return [...new Set(formulas)];
}

interface TexSeedProps {
  formulas: readonly string[];
}

/** Renders the seed's JSON on the server; in the browser the server's markup is left as is. */
export default function TexSeed({ formulas }: TexSeedProps): JSX.Element {
  const html = Object.fromEntries(
    formulas.flatMap((tex) => {
      const typeset = typesetNow(tex);
      return typeset === undefined ? [] : [[tex, typeset]];
    }),
  );
  const json = Object.keys(html).length === 0 ? '' : JSON.stringify(html);
  return (
    <script
      type="application/json"
      {...{ [SEED_ATTRIBUTE]: '' }}
      dangerouslySetInnerHTML={{ __html: json.replace(UNSAFE_IN_SCRIPT, ESCAPED_LESS_THAN) }}
      suppressHydrationWarning
    />
  );
}

/** The entries of a parsed seed that are formula → HTML strings; nothing for any other shape. */
function seedEntries(parsed: unknown): Record<string, string> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/**
 * Takes the server's seeds from the page. A seed that does not parse, is not an object, or holds
 * something other than strings is ignored for what it holds (KaTeX then typesets those formulas).
 */
export function readTexSeed(root: ParentNode = document): void {
  for (const script of root.querySelectorAll(SEED_SELECTOR)) {
    try {
      seedTexHtml(seedEntries(JSON.parse(script.textContent || '{}')));
    } catch {
      // A seed that does not parse only means the formulas are typeset in the browser instead.
    }
  }
}
