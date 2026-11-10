/**
 * An SVG label in the mini-notation of src/lib/mathNotation.ts, with real sub- and superscripts
 * (tspan, 75 %, shifted with dy), Greek letters and the symbols IBM Plex lacks in KaTeX's fonts,
 * and vectors with an arrow drawn as a <path> over the base letter (never U+20D7). Everything
 * else stays in the label's Plex family, so no character reaches a fallback font. Usage:
 *
 *   <MathText source="v_∞,in" x={40} y={20} fontSize={13} />            v with subscript ∞,in
 *   <MathText source="vec v = vec V_p + vec v_∞" … fill={TEXT_COLOR} />  three drawn arrows
 *   <MathText source="ω_máx = 10^-7 rad/s" … anchor="end" />             KaTeX ω, real power
 *   <MathText source="|Δv|" … family="sans" />                          sans label, KaTeX Δ
 *
 * One <text> per label: put the whole label (numbers and units included) in `source`, since a
 * script shifts the baseline of what follows. Plain text renders exactly as a plain <text>. The
 * figure's own aria-label says the notation in words: build it with mathTextToString
 * («v sub infinito, in»), not with the raw source.
 * The arrow's place comes from the font metrics in src/lib/glyphAdvances.ts, so it is right on
 * the server and needs no DOM measurement; pass `fill` when the label holds a vector or ≠.
 */
import type { JSX } from 'react';
import { KATEX_HEIGHTS, MATH_FONT_FAMILY, PLEX_HEIGHTS, type MathFont } from '../../lib/mathFonts';
import {
  mathRuns,
  runScale,
  runWidth,
  type LabelFamily,
  type MathRun,
  type Script,
} from '../../lib/mathNotation';

export type TextAnchor = 'start' | 'middle' | 'end';

export interface MathTextProps {
  source: string;
  x: number;
  y: number;
  fontSize: number;
  anchor?: TextAnchor;
  /** The label's Plex family (default mono, the figures' font). */
  family?: LabelFamily;
  /** Text color; also the drawn arrows'. Inherited from the parent when omitted. */
  fill?: string;
  /** A stroke behind the text and the arrows, in the surface color, for legibility on lines. */
  halo?: { color: string; width: number };
  /** Baseline shift (px) applied to the whole label, e.g. to centre it on `y`. */
  dy?: number;
  fontWeight?: number;
  transform?: string;
  className?: string;
}

const FAMILY_CSS: Readonly<Record<LabelFamily, string>> = {
  mono: 'var(--font-mono)',
  sans: 'var(--font-sans)',
};
/** Baseline offsets of scripts, in em of the label (down is positive in SVG). */
const SUB_SHIFT_EM = 0.25;
const SUP_SHIFT_EM = -0.4;
const PERCENT = 100;
const PERCENT_DECIMALS = 1;
/** Letters whose top is the x-height: the arrow sits lower over them. */
const SHORT_LETTERS = 'acegmnopqrsuvwxyzαγεηικμνοπρστυφχψω';
/** Drawn arrow: gap above the letter, stroke, head and side insets, in em of the base. */
const ARROW_GAP_EM = 0.12;
const ARROW_STROKE_EM = 0.07;
const ARROW_HEAD_EM = 0.16;
const ARROW_INSET = 0.08;
/** KaTeX_Math is italic: its arrow leans right with the letter, as KaTeX's skew does. */
const ITALIC_SKEW_EM = 0.08;
/** The stroke through "=" that makes ≠, in em, from the glyph's centre. */
const NOT_HALF_WIDTH_EM = 0.14;
const NOT_LOW_EM = 0.02;
const NOT_HIGH_EM = 0.56;
const PX_DECIMALS = 2;

const SHIFT_EM: Readonly<Record<Script, number>> = {
  base: 0,
  sub: SUB_SHIFT_EM,
  sup: SUP_SHIFT_EM,
};
const round = (value: number) => Number(value.toFixed(PX_DECIMALS));

function startX(x: number, width: number, anchor: TextAnchor): number {
  if (anchor === 'middle') return x - width / 2;
  return anchor === 'end' ? x - width : x;
}

function letterTop(char: string, font: MathFont | undefined): number {
  const heights = font ? KATEX_HEIGHTS : PLEX_HEIGHTS;
  return SHORT_LETTERS.includes(char) ? heights.x : heights.cap;
}

/** An arrow over a run of width `width` (px) starting at `left`, its letter on `baseline`. */
function vectorPath(run: MathRun, left: number, width: number, baseline: number, em: number) {
  const skew = run.font === 'katex-math' ? ITALIC_SKEW_EM * em : 0;
  const y = round(baseline - (letterTop(run.text, run.font) + ARROW_GAP_EM) * em);
  const from = round(left + ARROW_INSET * width + skew);
  const to = round(left + (1 - ARROW_INSET) * width + skew);
  const head = ARROW_HEAD_EM * em;
  const back = round(to - head);
  return `M${from} ${y}H${to}M${back} ${round(y - head)}L${to} ${y}L${back} ${round(y + head)}`;
}

/** The stroke through "=" that makes ≠. */
function notPath(left: number, width: number, baseline: number, em: number) {
  const centre = left + width / 2;
  const half = NOT_HALF_WIDTH_EM * em;
  return `M${round(centre - half)} ${round(baseline - NOT_LOW_EM * em)}L${round(centre + half)} ${round(baseline - NOT_HIGH_EM * em)}`;
}

export interface MathMark {
  kind: 'vector' | 'not';
  d: string;
}

/** The drawn marks of a label (arrows, ≠ strokes) in its own coordinates. */
export function mathMarks(
  runs: readonly MathRun[],
  { x, y, fontSize, anchor = 'start', family = 'mono', dy = 0 }: MathTextProps,
): MathMark[] {
  const widths = runs.map((run) => runWidth(run, fontSize, family));
  const total = widths.reduce((sum, width) => sum + width, 0);
  const lefts = widths.map(
    (_, i) => startX(x, total, anchor) + widths.slice(0, i).reduce((s, w) => s + w, 0),
  );
  return runs.flatMap((run, i): MathMark[] => {
    if (!run.mark) return [];
    const em = fontSize * runScale(run);
    const baseline = y + dy + SHIFT_EM[run.script] * fontSize;
    const d =
      run.mark === 'vector'
        ? vectorPath(run, lefts[i], widths[i], baseline, em)
        : notPath(lefts[i], widths[i], baseline, em);
    return [{ kind: run.mark, d }];
  });
}

const isPlain = (runs: readonly MathRun[]) =>
  runs.length <= 1 && runs.every((run) => run.script === 'base' && !run.font && !run.mark);

/** The runs as tspans, each script entered and left with a dy (px) on its own tspan. */
function RunSpans({ runs, fontSize }: { runs: readonly MathRun[]; fontSize: number }) {
  return runs.map((run, i) => {
    const previous = i === 0 ? 0 : SHIFT_EM[runs[i - 1].script];
    const shift = round((SHIFT_EM[run.script] - previous) * fontSize);
    const scale = runScale(run);
    return (
      <tspan
        key={i}
        dy={shift === 0 ? undefined : shift}
        fontSize={scale === 1 ? undefined : `${(scale * PERCENT).toFixed(PERCENT_DECIMALS)}%`}
        fontFamily={run.font ? MATH_FONT_FAMILY[run.font] : undefined}
        fontStyle={run.font === 'katex-math' ? 'italic' : undefined}
      >
        {run.text}
      </tspan>
    );
  });
}

export default function MathText(props: MathTextProps): JSX.Element {
  const { source, x, y, fontSize, anchor = 'start', family = 'mono', fill, halo, dy } = props;
  const runs = mathRuns(source);
  const plain = isPlain(runs);
  const marks = mathMarks(runs, props);
  const haloProps = halo
    ? { stroke: halo.color, strokeWidth: halo.width, paintOrder: 'stroke' as const }
    : {};
  const text = (
    <text
      x={x}
      y={y}
      dy={dy}
      textAnchor={anchor}
      fontFamily={FAMILY_CSS[family]}
      fontSize={fontSize}
      fontWeight={props.fontWeight}
      fill={fill}
      transform={marks.length === 0 ? props.transform : undefined}
      className={marks.length === 0 ? props.className : undefined}
      {...haloProps}
    >
      {plain ? source : <RunSpans runs={runs} fontSize={fontSize} />}
    </text>
  );
  if (marks.length === 0) return text;
  const strokeWidth = ARROW_STROKE_EM * fontSize;
  const markPaths = (stroke: string, width: number, kind?: boolean) =>
    marks.map((mark, i) => (
      <path
        key={i}
        data-math-mark={kind ? mark.kind : undefined}
        d={mark.d}
        stroke={stroke}
        strokeWidth={width}
      />
    ));
  return (
    <g transform={props.transform} className={props.className}>
      {halo ? (
        <g aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {markPaths(halo.color, strokeWidth + halo.width)}
        </g>
      ) : null}
      {text}
      <g aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {markPaths(fill ?? 'currentColor', strokeWidth, true)}
      </g>
    </g>
  );
}
