/**
 * What the drone lab shows while its route data loads. It holds the lab's own structure, so the
 * page does not move when the lab arrives: the card with its title row, the map's place (the same
 * height mapReserve gives the map) over the transport and the panel's two blocks beside it, the
 * canvas notes' row, the two disclosures, and under them the four charts' places. It carries the
 * typeset formulas of the labels that mount after the data (TexSeed), so none waits for KaTeX.
 *
 * The places' heights are not on the 4/8 scale on purpose: each is the height of the loaded part
 * it stands for, measured in rem (they follow the root font size with the text), at each width
 * the part changes height at. dron-reparto.spec.ts compares every place with its part (header,
 * stage, panel, canvas notes, disclosures) at fifteen widths from 360 to 1 280 px, on both sides
 * of every step below, within 8 px.
 *
 * To recalibrate after a text or root-size change: run that spec; each failing line names the part,
 * the width and both heights. Then, on the built site (`pnpm run build`, `astro preview`), load
 * Tema 1 and sweep the window width 1 px at a time (the lab is already loaded: a resize only
 * reflows it), logging each width where the height of the transport (the second child of the
 * stage), the panel's three blocks, the canvas notes or a disclosure changes. A step is the card's
 * content width there (the window less 66 px under two columns) in rem: refine it by setting the
 * card's own width in fractions of a px, so the skeleton and the lab change together. Each height
 * is the loaded part's, in rem. Move the step (STEPS and PLACE_HEIGHT) or the height named.
 */
import type { CSSProperties, JSX } from 'react';
import { CANVAS_BLEED } from '../../lab/canvasInset';
import { PLOT_ASPECT } from '../../lab/svgPlotReserve';
import {
  LAB_CANVAS_NOTES,
  LAB_CARD,
  LAB_COLUMNS,
  LAB_PANEL,
  LAB_PANEL_CELL,
  LAB_LEVEL_IN_COLUMNS,
  LAB_STAGE_CELL,
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
const PLACE = 'rounded-base border border-dashed border-border';
const CHIP_PLACES = 3;

/**
 * The widths of the card's content box (rem; the container query's width, the card less its 1 rem
 * padding on each side) where a part of the loaded lab changes height, as its text rewraps: the
 * canvas notes go from three lines to two (16,85) and to one (30,975), «Parámetros» loses a line
 * of each field label (18,365 and 19,9275), the transport's second row stops wrapping the time
 * reading onto a third line (19,25). Measured on the loaded lab at the site's 16 px root, to a
 * hundredth of a px; in window widths they are 336, 360, 374, 385 and 562 px, and the e2e checks
 * each of them and the width before it.
 */
const STEPS = ['s16-85', 's18-365', 's19-25', 's19-9275', 's30-975'] as const;
type Step = (typeof STEPS)[number];

/**
 * Tailwind needs the classes literal: each step reads its height from a custom property (named
 * with hyphens: Tailwind reads an underscore in an arbitrary value as a space).
 */
const PLACE_HEIGHT =
  'h-(--place-narrow) @min-[16.85rem]/lab:h-(--place-s16-85) @min-[18.365rem]/lab:h-(--place-s18-365) @min-[19.25rem]/lab:h-(--place-s19-25) @min-[19.9275rem]/lab:h-(--place-s19-9275) @min-[30.975rem]/lab:h-(--place-s30-975) lab-split:h-(--place-split)';

/**
 * A place's height in rem: on a phone's narrow card, from each step where it changes (a step left
 * out keeps the height before it) and in two columns (the last step's when left out).
 */
interface PlaceHeights {
  narrow: number;
  from?: Partial<Record<Step, number>>;
  split?: number;
}

function placeStyle({ narrow, from = {}, split }: PlaceHeights): CSSProperties {
  const heights = STEPS.reduce<readonly number[]>(
    (sofar, step) => [...sofar, from[step] ?? sofar.at(-1) ?? narrow],
    [],
  );
  return Object.fromEntries([
    ['--place-narrow', `${narrow}rem`],
    ...STEPS.map((step, index) => [`--place-${step}`, `${heights[index]}rem`]),
    ['--place-split', `${split ?? heights.at(-1) ?? narrow}rem`],
  ]) as CSSProperties;
}

/**
 * The transport with events: two rows (the time reading on a third line on a phone, up to 19,25
 * rem), and pinned with its padding in two columns.
 */
const TRANSPORT: PlaceHeights = { narrow: 8.25, from: { 's19-25': 6.25 }, split: 7.8125 };
/** «Parámetros» with v_máx and a_máx, «Escenario» with the view and the leg, and «Lecturas». */
const PARAMS: PlaceHeights = { narrow: 16.73, from: { 's18-365': 16.39, 's19-9275': 16.0625 } };
const SCENARIO: PlaceHeights = { narrow: 15.1875 };
const READOUTS: PlaceHeights = { narrow: 15 };
/** The canvas notes: legend, phase and route notes, from three lines down to one. */
const NOTES: PlaceHeights = { narrow: 6.31, from: { 's16-85': 4.81, 's30-975': 3.29 } };
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

/** The header row of the loaded lab: its title, three chips and the gear, wrapping the same way. */
function HeaderPlace(): JSX.Element {
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="max-w-full grow text-sm font-semibold">Laboratorio del dron</span>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {Array.from({ length: CHIP_PLACES }, (_, index) => (
          <div key={index} className={`h-8 w-16 ${PLACE}`} />
        ))}
        <div className={`size-11 ${PLACE}`} />
      </div>
    </div>
  );
}

/** The map's place, which says the loading state, over the transport's. */
function StagePlace({ status }: Pick<DroneSkeletonProps, 'status'>): JSX.Element {
  return (
    <div data-skeleton="stage" className={`flex flex-col gap-4 ${LAB_STAGE_CELL}`}>
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

/** The panel's three blocks, beside the stage in two columns, in two columns in a wide panel. */
function PanelPlace(): JSX.Element {
  return (
    <div data-skeleton="panel" aria-hidden="true" className={LAB_PANEL_CELL}>
      <div className={LAB_PANEL}>
        <Place heights={PARAMS} className={LAB_LEVEL_IN_COLUMNS} />
        <Place heights={SCENARIO} className={LAB_LEVEL_IN_COLUMNS} />
        <Place heights={READOUTS} className={LAB_LEVEL_IN_COLUMNS} />
      </div>
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
        <div className={LAB_COLUMNS}>
          <StagePlace status={status} />
          <PanelPlace />
          <Place heights={NOTES} className={LAB_CANVAS_NOTES} />
        </div>
        <div aria-hidden="true" className="flex flex-col">
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
