/**
 * What the drone lab shows while its route data loads. It holds the lab's own structure, so the
 * page does not move when the lab arrives: the card with its title row, the map's place (the same
 * height mapReserve gives the map) over the transport's, the control deck's three blocks under
 * them, the canvas notes, the two disclosures, and under the card the four charts' places. It
 * carries the typeset formulas of the labels that mount after the data (TexSeed), so none waits
 * for KaTeX.
 *
 * The places' heights are not on the 4/8 scale on purpose: each is the height of the loaded part
 * it stands for, measured in rem (they follow the root font size with the text), at each width
 * the part changes height at. dron-reparto.spec.ts compares every place with its part (header,
 * stage, panel, canvas notes, disclosures) at widths from 320 to 1 280 px, on both sides of every
 * step below, within 2 px.
 *
 * To recalibrate after a text, layout or root-size change: run that spec; each failing line names
 * the part, the width and both heights. Then, on the built site (`pnpm run build`, `astro
 * preview`), load Tema 1 and sweep the window width 1 px at a time (the lab is already loaded: a
 * resize only reflows it), logging each width where the height of the transport, the deck's three
 * blocks, the canvas notes or a disclosure changes. A step is the card's content width there (the
 * window less the page's margins) in rem: refine it by setting the card's own width in fractions
 * of a px, so the skeleton and the lab change together. Each height is the loaded part's, in rem.
 * Move the step (STEPS and PLACE_HEIGHT) or the height named. Last calibrated in E1 (2026-11-16).
 */
import type { CSSProperties, JSX } from 'react';
import { CANVAS_BLEED } from '../../lab/canvasInset';
import { PLOT_ASPECT } from '../../lab/svgPlotReserve';
import {
  LAB_CANVAS_NOTES,
  LAB_CARD,
  LAB_DISCLOSURES,
  LAB_PANEL,
  LAB_STAGE,
} from '../../lab/labShellClasses';
import TexSeed, { formulasOf } from '../../lab/TexSeed';
import { DRONE_LAB_FORMULAS } from './droneLabFormulas';
import { MAP_FIGURE_CLASS, MAP_FIGURE_STYLE } from './mapReserve';

export interface DroneSkeletonProps {
  status: 'loading' | 'error';
  /** The MDX's texts: their formulas are seeded too. */
  usage?: string;
  leftOut?: string;
}

const STATUS_TEXT: Record<DroneSkeletonProps['status'], string> = {
  loading: 'Cargando los datos de la ruta…',
  error: 'No se pudieron cargar los datos de la ruta. Recarga la página para intentarlo de nuevo.',
};
// scale-exempt: the outline of a loading placeholder marks a state, it separates no content
const PLACE = 'rounded-base border border-dashed border-border';

/**
 * The widths of the card's content box (rem; the container query's width, the card less its 1 rem
 * padding on each side) where a part of the loaded lab changes height: the readouts' labels
 * rewrap (16,1221); the canvas notes go from three lines to two (16,8497) and to one (30,9747);
 * «Restablecer» joins the leg's select on one row (22,5625); the transport goes to one row and the
 * parameters two to a row (36, the shell's @xl/lab); the readouts four to a row (42, @2xl/lab).
 * Measured on the loaded lab at the site's 16 px root; in window widths they are 324, 336, 427,
 * 562, 658 and 754 px (and 1 058, where the sidebar's lg layout widens the column to 42 rem).
 */
const STEPS = ['s16-1221', 's16-8497', 's22-5625', 's30-9747', 's36', 's42'] as const;
type Step = (typeof STEPS)[number];

/**
 * Tailwind needs the classes literal: each step reads its height from a custom property (named
 * with hyphens: Tailwind reads an underscore in an arbitrary value as a space).
 */
const PLACE_HEIGHT =
  'h-(--place-narrow) @min-[16.1221rem]/lab:h-(--place-s16-1221) @min-[16.8497rem]/lab:h-(--place-s16-8497) @min-[22.5625rem]/lab:h-(--place-s22-5625) @min-[30.9747rem]/lab:h-(--place-s30-9747) @min-[36rem]/lab:h-(--place-s36) @min-[42rem]/lab:h-(--place-s42)';

/**
 * A place's height in rem: on the narrowest card, then from each step where it changes (a step
 * left out keeps the height before it).
 */
interface PlaceHeights {
  narrow: number;
  from?: Partial<Record<Step, number>>;
}

function placeStyle({ narrow, from = {} }: PlaceHeights): CSSProperties {
  const heights = STEPS.reduce<readonly number[]>(
    (sofar, step) => [...sofar, from[step] ?? sofar.at(-1) ?? narrow],
    [],
  );
  return Object.fromEntries([
    ['--place-narrow', `${narrow}rem`],
    ...STEPS.map((step, index) => [`--place-${step}`, `${heights[index]}rem`]),
  ]) as CSSProperties;
}

/**
 * The transport with events: on a phone three rows (the buttons and t, the timeline with its
 * marks, the event line beside the pair); from 36 rem one row with the event line under it.
 */
const TRANSPORT: PlaceHeights = { narrow: 9, from: { s36: 4.25 } };
/** «Parámetros» with v_máx and a_máx: one under the other, then side by side. */
const PARAMS: PlaceHeights = { narrow: 10.1641, from: { s36: 4.332 } };
/** «Escenario»: the view, the leg shown and «Restablecer» (beside the leg from 22,5625 rem). */
const SCENARIO: PlaceHeights = { narrow: 17.375, from: { 's22-5625': 13.375 } };
/** «Lecturas»: six readouts two to a row (their labels on one line from 16,1221), then four. */
const READOUTS: PlaceHeights = { narrow: 14.9375, from: { 's16-1221': 13.6875, s42: 8.625 } };
/** The canvas notes: legend, phase and route notes, from three lines down to one. */
const NOTES: PlaceHeights = { narrow: 6.3086, from: { 's16-8497': 4.8086, 's30-9747': 3.2891 } };
/** Each closed disclosure: its summary line and the rule above it. */
const DISCLOSURE: PlaceHeights = { narrow: 2.5625 };
const DISCLOSURES = 2;

/**
 * A chart's place: the svg at SvgPlot's own aspects (PLOT_ASPECT, through custom properties) and
 * 8 rem for the frame, caption, legend and readings, wide where the map figure is. On a phone the
 * legends of the velocity, acceleration and distance charts wrap to a second line: the extra rem
 * of each, measured on the loaded charts.
 */
const CHART =
  'h-[calc((100cqw-2rem)/var(--chart-compact)+8rem+var(--chart-extra))] @min-[calc(481.5px+2rem)]:h-[calc((100cqw-2rem)/var(--chart-wide)+8rem)]';
const CHART_PHONE_EXTRA_REM = [0, 1.75, 1.75, 2.75] as const;

/** A dashed place of the given heights; `className` places it in the grid. */
function Place({ heights, className = '' }: { heights: PlaceHeights; className?: string }) {
  return (
    <div
      aria-hidden="true"
      style={placeStyle(heights)}
      className={`${PLACE_HEIGHT} ${PLACE} ${className}`}
    />
  );
}

/** The header row of the loaded lab: its title and the gear. */
function HeaderPlace(): JSX.Element {
  return (
    <div aria-hidden="true" className="flex flex-nowrap items-center gap-3">
      <span className="min-w-0 grow text-sm font-semibold">Laboratorio del dron</span>
      <div className={`size-11 shrink-0 ${PLACE}`} />
    </div>
  );
}

/** The map's place, which says the loading state, over the transport's. */
function StagePlace({ status }: Pick<DroneSkeletonProps, 'status'>): JSX.Element {
  return (
    <div data-skeleton="stage" className={LAB_STAGE}>
      <div style={MAP_FIGURE_STYLE} className={`@container ${CANVAS_BLEED}`}>
        <div className={`${MAP_FIGURE_CLASS} flex items-center justify-center p-4 ${PLACE}`}>
          <p role="status" className="m-0 text-center text-sm text-fg-muted">
            {STATUS_TEXT[status]}
          </p>
        </div>
      </div>
      <Place heights={TRANSPORT} />
    </div>
  );
}

/** The panel's blocks under the stage: the parameters, the scenario and the readouts. */
function PanelPlace(): JSX.Element {
  return (
    <div data-skeleton="panel" aria-hidden="true" className={LAB_PANEL}>
      <Place heights={PARAMS} />
      <Place heights={SCENARIO} className="mt-(--lab-flow-section)" />
      <Place heights={READOUTS} className="mt-(--lab-flow-block)" />
    </div>
  );
}

/** The four profile charts under the card. */
function ChartPlaces(): JSX.Element {
  return (
    <div aria-hidden="true" className="@container flex flex-col gap-4">
      {CHART_PHONE_EXTRA_REM.map((extra, index) => (
        <div
          key={index}
          style={
            {
              '--chart-extra': `${extra}rem`,
              '--chart-compact': PLOT_ASPECT.compact,
              '--chart-wide': PLOT_ASPECT.wide,
            } as CSSProperties
          }
          className={`${CHART} ${PLACE}`}
        />
      ))}
    </div>
  );
}

export default function DroneSkeleton({ status, usage, leftOut }: DroneSkeletonProps): JSX.Element {
  const seeded = [...DRONE_LAB_FORMULAS, ...formulasOf(usage ?? ''), ...formulasOf(leftOut ?? '')];
  return (
    <div data-testid="drone-lab-loading" className="flex flex-col gap-4">
      <TexSeed formulas={seeded} />
      {/* The attribute makes the figure's frame lend its width now, as it will to the lab. */}
      <div data-lab-shell="tiered" className={LAB_CARD}>
        <HeaderPlace />
        <StagePlace status={status} />
        <PanelPlace />
        <Place heights={NOTES} className={LAB_CANVAS_NOTES} />
        <div aria-hidden="true" className={`flex flex-col ${LAB_DISCLOSURES}`}>
          {Array.from({ length: DISCLOSURES }, (_, index) => (
            <div
              key={index}
              style={placeStyle(DISCLOSURE)}
              className={`${PLACE_HEIGHT} border-t border-border`}
            />
          ))}
        </div>
      </div>
      <ChartPlaces />
    </div>
  );
}
