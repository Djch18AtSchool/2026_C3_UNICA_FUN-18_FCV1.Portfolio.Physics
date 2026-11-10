/**
 * What the drone lab shows while its route data loads. It holds the lab's own structure, so the
 * page does not move when the lab arrives: the card with its title row, the map's place (the same
 * height mapReserve gives the map) over the transport and the panel's two blocks beside it, the
 * canvas notes' row, the two disclosures, and under them the four charts' places. It carries the
 * typeset formulas of the labels that mount after the data (TexSeed), so none waits for KaTeX.
 * The sizes in rem are measured on the loaded lab (they follow the root font size with it);
 * dron-reparto.spec.ts compares the two heights.
 */
import type { CSSProperties, JSX } from 'react';
import TexSeed, { formulasOf } from '../../lab/TexSeed';
import { DRONE_LAB_FORMULAS } from './droneLabFormulas';
import { MAP_FIGURE_CLASS, MAP_PLOT_STYLE } from './mapReserve';

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
/** The lab's card, as TieredLabShell draws it (its ROOT and COLUMNS): same classes, same gaps. */
const CARD =
  '@container/lab flex flex-col gap-4 rounded-base border border-border bg-bg-elevated p-4 in-[.figure-frame]:border-0';
const COLUMNS = 'flex flex-col gap-6 lab-split:grid lab-split:grid-cols-[minmax(0,1fr)_20rem]';
const PLACE = 'rounded-base border border-dashed border-border';
const CHIP_PLACES = 3;
/**
 * A chart's place: the svg at SvgPlot's 1,6 (1,25 below 480 px) and 8 rem for the frame, caption,
 * legend and readings. On a phone the legends of the velocity, acceleration and distance charts
 * wrap to a second line: the extra rem of each, measured on the loaded charts.
 */
const CHART =
  'h-[calc((100cqw-2rem)/1.25+8rem+var(--chart-extra))] @min-[calc(482px+2rem)]:h-[calc((100cqw-2rem)/1.6+8rem)]';
const CHART_PHONE_EXTRA_REM = [0, 1.75, 1.75, 2.75] as const;

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

export default function DroneSkeleton({ status, usage, leftOut }: DroneSkeletonProps): JSX.Element {
  const seeded = [...DRONE_LAB_FORMULAS, ...formulasOf(usage ?? ''), ...formulasOf(leftOut ?? '')];
  return (
    <div data-testid="drone-lab-loading" className="flex flex-col gap-4">
      <TexSeed formulas={seeded} />
      {/* The attribute makes the figure's frame lend its width now, as it will to the lab. */}
      <div data-lab-shell="tiered" className={CARD}>
        <HeaderPlace />
        <div className={COLUMNS}>
          <div
            data-skeleton="stage"
            className="flex min-w-0 flex-col gap-4 lab-split:col-start-1 lab-split:row-start-1"
          >
            <div style={MAP_PLOT_STYLE} className="@container -mx-3 sm:mx-0">
              <div className={`${MAP_FIGURE_CLASS} flex items-center justify-center p-4 ${PLACE}`}>
                <p role="status" className="m-0 text-center text-sm text-fg-muted">
                  {STATUS_TEXT[status]}
                </p>
              </div>
            </div>
            <div
              aria-hidden="true"
              className={`h-[4.75rem] @min-[26rem]/lab:h-[2.75rem] lab-split:h-[4.3rem] ${PLACE}`}
            />
          </div>
          <div
            data-skeleton="panel"
            aria-hidden="true"
            className="flex min-w-0 flex-col gap-6 lab-split:col-start-2 lab-split:row-start-1"
          >
            <div className={`h-[16.75rem] @min-[26rem]/lab:h-64 ${PLACE}`} />
            <div className={`h-60 ${PLACE}`} />
          </div>
          <div
            aria-hidden="true"
            className={`h-[6.25rem] @min-[26rem]/lab:h-[4.75rem] lab-split:col-span-2 lab-split:row-start-2 lab-split:h-[3.25rem] ${PLACE}`}
          />
        </div>
        <div aria-hidden="true" className="flex flex-col">
          <div className="h-[2.5625rem] border-t border-border" />
          <div className="h-[2.5625rem] border-t border-border" />
        </div>
      </div>
      <div aria-hidden="true" className="@container flex flex-col gap-4">
        {CHART_PHONE_EXTRA_REM.map((extra, index) => (
          <div
            key={index}
            style={{ '--chart-extra': `${extra}rem` } as CSSProperties}
            className={`${CHART} ${PLACE}`}
          />
        ))}
      </div>
    </div>
  );
}
