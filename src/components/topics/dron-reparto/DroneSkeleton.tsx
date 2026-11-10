/**
 * What the drone lab shows while its route data loads. It holds the lab's own structure, so the
 * page does not move when the lab arrives: the card with its title row, the map's place (the same
 * height mapReserve gives the map) over the transport and the panel's two blocks beside it, the
 * canvas notes' row, the two disclosures, and under them the four charts' places. It carries the
 * typeset formulas of the labels that mount after the data (TexSeed), so none waits for KaTeX.
 *
 * The places' heights are not on the 4/8 scale on purpose: each is the height of the loaded part
 * it stands for, measured in rem (they follow the root font size with the text), at each width
 * the part changes height at (shots/b3-3/scripts/drone-parts.cjs measures both).
 * dron-reparto.spec.ts compares the two cards at 360, 414, 540, 900 and 1 280 px within 8 px.
 */
import type { CSSProperties, JSX } from 'react';
import { CANVAS_BLEED } from '../../lab/canvasInset';
import { PLOT_ASPECT } from '../../lab/svgPlotReserve';
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
/** The lab's card, as LabShell draws it (its ROOT and COLUMNS): same classes, same gaps. */
const CARD =
  '@container/lab flex flex-col gap-4 rounded-base border border-border bg-bg-elevated p-4 in-[.figure-frame]:border-0';
const COLUMNS = 'flex flex-col gap-6 lab-split:grid lab-split:grid-cols-[minmax(0,1fr)_20rem]';
const PLACE = 'rounded-base border border-dashed border-border';
const CHIP_PLACES = 3;

/**
 * The widths of the card's content box (rem; the container query's width, the card less its 1 rem
 * padding on each side) where a part of the loaded lab changes height, as its text rewraps: the
 * canvas notes go from three lines to two (17,1) and to one (31,7), «Parámetros» loses a line of
 * each field label (17,6 and 19,7), the transport fits one line (20,75). Measured on the loaded
 * lab (shots/b3-3/scripts/drone-parts.cjs); text scales with the root, so rem holds at 16 px.
 */
const STEPS = ['s17-1', 's17-6', 's19-7', 's20-75', 's31-7'] as const;
type Step = (typeof STEPS)[number];

/**
 * Tailwind needs the classes literal: each step reads its height from a custom property (named
 * with hyphens: Tailwind reads an underscore in an arbitrary value as a space).
 */
const PLACE_HEIGHT =
  'h-(--place-narrow) @min-[17.1rem]/lab:h-(--place-s17-1) @min-[17.6rem]/lab:h-(--place-s17-6) @min-[19.7rem]/lab:h-(--place-s19-7) @min-[20.75rem]/lab:h-(--place-s20-75) @min-[31.7rem]/lab:h-(--place-s31-7) lab-split:h-(--place-split)';

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

/** The transport: two lines on a phone, one from 20,75 rem, and pinned with its padding in two columns. */
const TRANSPORT: PlaceHeights = { narrow: 4.75, from: { 's20-75': 2.75 }, split: 4.3 };
/** «Parámetros» with v_máx and a_máx, and «Lecturas» with its four cells. */
const PARAMS: PlaceHeights = { narrow: 16.75, from: { 's17-6': 16.4, 's19-7': 16 } };
const READOUTS: PlaceHeights = { narrow: 15 };
/** The canvas notes: legend, phase and route notes, from three lines down to one. */
const NOTES: PlaceHeights = { narrow: 6.25, from: { 's17-1': 4.75, 's31-7': 3.25 } };
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
    <div
      data-skeleton="stage"
      className="flex min-w-0 flex-col gap-4 lab-split:col-start-1 lab-split:row-start-1"
    >
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

/** The panel's two blocks, beside the stage in two columns. */
function PanelPlace(): JSX.Element {
  return (
    <div
      data-skeleton="panel"
      aria-hidden="true"
      className="flex min-w-0 flex-col gap-6 lab-split:col-start-2 lab-split:row-start-1"
    >
      <Place heights={PARAMS} />
      <Place heights={READOUTS} />
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
      <div data-lab-shell="tiered" className={CARD}>
        <HeaderPlace />
        <div className={COLUMNS}>
          <StagePlace status={status} />
          <PanelPlace />
          <Place heights={NOTES} className="lab-split:col-span-2 lab-split:row-start-2" />
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
