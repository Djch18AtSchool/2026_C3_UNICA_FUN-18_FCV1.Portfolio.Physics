/**
 * The text of an element as its author wrote it: every KaTeX formula (InlineMath, $…$) back to
 * `$tex$` from its MathML annotation, so a test asserts the source instead of KaTeX's doubled
 * HTML-and-MathML text: mathSourceText(clock) → '$t - t_p$ = 0,0 h · …'.
 */
export function mathSourceText(element: Element | null): string {
  if (!element) return '';
  const copy = element.cloneNode(true) as Element;
  for (const katex of [...copy.querySelectorAll('.katex')]) {
    const tex = katex.querySelector('annotation')?.textContent ?? '';
    katex.replaceWith(`$${tex}$`);
  }
  return copy.textContent ?? '';
}
