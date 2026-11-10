/**
 * Where InlineMath gets KaTeX. On the server the renderer is loaded before any render (top-level
 * await, removed from the browser build because import.meta.env.SSR is false there), so the
 * HTML carries typeset math. In the browser KaTeX is loaded only when a formula must be rendered
 * there (a label that changed or mounted after hydration): hydrated spans keep the server's HTML.
 */
export type TexRender = (tex: string) => string;

let renderer: TexRender | undefined = import.meta.env.SSR
  ? (await import('../../lib/texHtml')).texToHtml
  : undefined;
let loading: Promise<TexRender> | undefined;

/** The renderer when already loaded (always on the server), else undefined. */
export function loadedTexRenderer(): TexRender | undefined {
  return renderer;
}

/** Loads KaTeX once (a separate chunk in the browser) and returns the renderer. */
export function loadTexRenderer(): Promise<TexRender> {
  if (renderer) return Promise.resolve(renderer);
  loading ??= import('../../lib/texHtml').then(({ texToHtml }) => {
    renderer = texToHtml;
    return texToHtml;
  });
  return loading;
}

/** Tests only: forget the loaded renderer, as a fresh page would be. */
export function resetTexRendererForTests(): void {
  renderer = undefined;
  loading = undefined;
}
