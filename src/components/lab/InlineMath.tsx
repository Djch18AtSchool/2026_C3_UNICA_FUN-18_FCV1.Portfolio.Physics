/**
 * Text with KaTeX inline between `$…$`, for the HTML parts of figures and labs: chart titles and
 * legends, readout and parameter labels. Plain text renders as plain text (no wrapper), so a
 * label without math is unchanged. Usage:
 *
 *   <InlineMath text="Suma $\vec v = \vec V_p + \vec v_\infty$ antes y después" />
 *   <InlineMath text="Rapidez $|\vec v|$" />
 *
 * The server typesets with KaTeX (a TeX error fails the build, as in Equation.astro). In the
 * browser a hydrated formula keeps the server's HTML, so KaTeX's JavaScript is never downloaded
 * for it; only a formula that changes or mounts after hydration loads KaTeX (texRenderer.ts) and
 * shows once it arrives. The parsing lives in src/lib/inlineMath.ts, shared with Figure.astro.
 */
import { useEffect, useRef, useState, type JSX } from 'react';
import { escapeHtml, groupInlineMath, NO_WRAP_CLASS } from '../../lib/inlineMath';
import { loadedTexRenderer, loadTexRenderer, reportTexError } from './texRenderer';

export interface InlineMathProps {
  text: string;
}

/** Empty HTML that never changes: React leaves the server's markup in place under it. */
const KEEP_SERVER_HTML = { __html: '' } as const;

/** One formula: typeset now when KaTeX is at hand, else kept from the server or loaded. */
function TexSpan({ tex }: { tex: string }): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState<{ tex: string; html: string } | undefined>(undefined);
  /** The formula the span's current markup shows (the server's, after hydration). */
  const shown = useRef<string | undefined>(undefined);
  // The renderer caches per formula, so a lab's 10 Hz re-renders do not typeset again.
  const html = loaded?.tex === tex ? loaded.html : loadedTexRenderer()?.(tex);

  useEffect(() => {
    if (html !== undefined) {
      shown.current = tex;
      return;
    }
    if (shown.current === undefined && ref.current?.hasChildNodes()) shown.current = tex;
    if (shown.current === tex) return;
    let isLive = true;
    loadTexRenderer()
      .then((render) => {
        if (isLive) setLoaded({ tex, html: render(tex) });
      })
      .catch((error: unknown) => {
        // A failed chunk load shows the TeX source rather than an empty span, and is reported
        // explicitly (a rethrow here would only be an unhandled rejection).
        if (isLive) setLoaded({ tex, html: escapeHtml(tex) });
        reportTexError(error);
      });
    return () => {
      isLive = false;
    };
  }, [tex, html]);

  return (
    <span
      ref={ref}
      className="inline-math"
      dangerouslySetInnerHTML={html === undefined ? KEEP_SERVER_HTML : { __html: html }}
      suppressHydrationWarning
    />
  );
}

export default function InlineMath({ text }: InlineMathProps): JSX.Element {
  const groups = groupInlineMath(text);
  return (
    <>
      {groups.map((group, i) => {
        if (group.kind === 'text') return group.text;
        if (group.after === '') return <TexSpan key={i} tex={group.tex} />;
        // The punctuation after a formula stays on its line.
        return (
          <span key={i} className={NO_WRAP_CLASS}>
            <TexSpan tex={group.tex} />
            {group.after}
          </span>
        );
      })}
    </>
  );
}
