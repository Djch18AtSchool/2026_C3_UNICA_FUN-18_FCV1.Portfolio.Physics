/**
 * What the drone lab shows while its route data loads. It holds the lab's own structure, so the
 * page does not move when the lab arrives: the card with its title row, the map's place (the same
 * height mapReserve gives the map) over the transport and the panel's two blocks beside it, the
 * canvas notes' row, the two disclosures, and under them the four charts' places. It carries the
 * typeset formulas of the labels that mount after the data (TexSeed), so none waits for KaTeX.
 *
 * The places' heights are not on the 4/8 scale on purpose: each is the height of the loaded part
 * it stands for, measured in rem (they follow the root font size with the text), at each layout
 * the part changes height in (shots/b3-3/scripts/drone-parts.cjs measures both).
 * dron-reparto.spec.ts compares the two cards at 360, 900 and 1 280 px within 8 px.
 */
import type { CSSProperties, JSX } from 'react';
import { CANVAS_BLEED } from '../../lab/canvasInset';
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
 * A place's height in each layout of the loaded lab, in rem: a phone's narrow card, a card from
 * 26 rem (the transport fits one line), from 34 rem (the canvas notes' legend fits one line) and
 * the two columns. A layout left out keeps the one before it.
 */
interface PlaceHeights {
  narrow: number;
  from26?: number;
  from34?: number;
  split?: number;
}

/** Tailwind needs the classes literal: each layout reads its height from a custom property. */
const PLACE_HEIGHT =
  'h-(--place-narrow) @min-[26rem]/lab:h-(--place-26) @min-[34rem]/lab:h-(--place-34) lab-split:h-(--place-split)';

function placeStyle({ narrow, from26 = narrow, from34 = from26, split = from34 }: PlaceHeights) {
  return {
    '--place-narrow': `${narrow}rem`,
    '--place-26': `${from26}rem`,
    '--place-34': `${from34}rem`,
    '--place-split': `${split}rem`,
  } as CSSProperties;
}

/** The transport: two lines on a phone, one from 26 rem, and pinned with its padding in two columns. */
const TRANSPORT: PlaceHeights = { narrow: 4.75, from26: 2.75, split: 4.3 };
/** «Parámetros» with v_máx and a_máx, and «Lecturas» with its four cells. */
const PARAMS: PlaceHeights = { narrow: 16.75, from26: 16 };
const READOUTS: PlaceHeights = { narrow: 15 };
/** The canvas notes: legend, phase and route notes, from three lines down to one. */
const NOTES: PlaceHeights = { narrow: 6.25, from26: 4.75, from34: 3.25 };
/** Each closed disclosure: its summary line and the rule above it. */
const DISCLOSURE: PlaceHeights = { narrow: 2.5625 };
const DISCLOSURES = 2;

/**
 * A chart's place: the svg at SvgPlot's 1,6 (1,25 below 480 px) and 8 rem for the frame, caption,
 * legend and readings. On a phone the legends of the velocity, acceleration and distance charts
 * wrap to a second line: the extra rem of each, measured on the loaded charts.
 */
const CHART =
  'h-[calc((100cqw-2rem)/1.25+8rem+var(--chart-extra))] @min-[calc(482px+2rem)]:h-[calc((100cqw-2rem)/1.6+8rem)]';
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
          style={{ '--chart-extra': `${extra}rem` } as CSSProperties}
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
