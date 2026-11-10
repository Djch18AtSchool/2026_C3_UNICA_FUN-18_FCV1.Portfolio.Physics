/**
 * Resolves a CSS length the site writes in its reserves (`calc()`, `min()`, `max()`, `clamp()`;
 * px, rem and cqw; `var(--x)` of given values) as the browser would, for the tests that check a
 * reserve against the drawing it stands for. Anything else throws rather than guess.
 */
export interface CssLengthContext {
  /** The query container's width (px), for `cqw`. */
  container: number;
  /** The root font size (px), for `rem`. */
  rem?: number;
  /** Values of the custom properties the expression reads. */
  vars?: Readonly<Record<string, string | number>>;
}

const DEFAULT_REM = 16;
const PERCENT = 100;
/** What may be left once units and functions are rewritten: numbers, operators, the helpers. */
const ARITHMETIC = /^[\d.+\-*/(), ]*$/;

function substituteVars(expression: string, vars: CssLengthContext['vars'] = {}): string {
  return expression.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
    if (!(name in vars)) throw new Error(`sin valor para ${name}`);
    return `(${substituteVars(String(vars[name]), vars)})`;
  });
}

export function resolveCssLength(expression: string, context: CssLengthContext): number {
  const { container, rem = DEFAULT_REM, vars } = context;
  const js = substituteVars(expression, vars)
    .replace(/([\d.]+)cqw/g, (_, n: string) => String((Number(n) / PERCENT) * container))
    .replace(/([\d.]+)rem/g, (_, n: string) => String(Number(n) * rem))
    .replace(/([\d.]+)px/g, '$1')
    .replace(/\bcalc\(/g, '(');
  const bare = js.replace(/\b(min|max|clamp)\(/g, '(');
  if (!ARITHMETIC.test(bare)) throw new Error(`no es una longitud simple: ${expression}`);
  const clamp = (low: number, value: number, high: number) => Math.min(Math.max(value, low), high);
  return Function('min', 'max', 'clamp', `return ${js}`)(Math.min, Math.max, clamp) as number;
}
