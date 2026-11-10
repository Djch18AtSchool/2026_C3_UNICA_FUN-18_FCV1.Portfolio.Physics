/**
 * Where InlineMath gets KaTeX. On the server the renderer is loaded before any render (top-level
 * await, removed from the browser build because import.meta.env.SSR is false there), so the
 * HTML carries typeset math. In the browser KaTeX is loaded only when a formula must be rendered
 * there (a label that changed or mounted after hydration): hydrated spans keep the server's HTML.
 * Either way each formula is typeset once: a lab re-rendering at 10 Hz reads the cache.
 */
export type TexRender = (tex: string) => string;
type TexModule = { texToHtml: TexRender };

/** Formulas kept typeset; past this many (never reached by the site's labels) the cache restarts. */
const MAX_CACHED_FORMULAS = 500;

/** Typesets through `render`, once per distinct formula. */
function cached(render: TexRender): TexRender {
  const html = new Map<string, string>();
  return (tex) => {
    const hit = html.get(tex);
    if (hit !== undefined) return hit;
    if (html.size >= MAX_CACHED_FORMULAS) html.clear();
    const typeset = render(tex);
    html.set(tex, typeset);
    return typeset;
  };
}

const importTexModule = (): Promise<TexModule> => import('../../lib/texHtml');

let renderer: TexRender | undefined = import.meta.env.SSR
  ? cached((await importTexModule()).texToHtml)
  : undefined;
let loading: Promise<TexRender> | undefined;
let importer: () => Promise<TexModule> = importTexModule;

/** The renderer when already loaded (always on the server), else undefined. */
export function loadedTexRenderer(): TexRender | undefined {
  return renderer;
}

/** Loads KaTeX once (a separate chunk in the browser) and returns the renderer. */
export function loadTexRenderer(): Promise<TexRender> {
  if (renderer) return Promise.resolve(renderer);
  loading ??= importer().then(
    ({ texToHtml }) => {
      renderer = cached(texToHtml);
      return renderer;
    },
    (error: unknown) => {
      // A failed chunk load may succeed on a later formula (network back): try again then.
      loading = undefined;
      throw error;
    },
  );
  return loading;
}

/**
 * Reports an error that has no caller to reach (a failed lazy load): to the page's error
 * handlers via reportError, or as an uncaught exception where that does not exist.
 */
export function reportTexError(error: unknown): void {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(error);
    return;
  }
  queueMicrotask(() => {
    throw error;
  });
}

/** Tests only: forget the loaded renderer and its cache, as a fresh page would be. */
export function resetTexRendererForTests(): void {
  renderer = undefined;
  loading = undefined;
}

/** Tests only: replace how KaTeX is imported (undefined restores the real import). */
export function setTexImporterForTests(next: (() => Promise<TexModule>) | undefined): void {
  importer = next ?? importTexModule;
  resetTexRendererForTests();
}
