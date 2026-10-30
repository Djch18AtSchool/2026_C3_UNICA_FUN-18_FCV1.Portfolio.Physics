import type { JSX } from 'react';
import { RW400 } from '../../../lib/data/reactionWheels';
import { SURFACE_COLOR, TEXT_COLOR, TICK_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { Scale } from '../../lab/plotScales';
import SvgPlot from '../../lab/SvgPlot';
import ExchangeDiagram from './ExchangeDiagram';
import {
  DIAGRAM_FACTS,
  MANEUVER_PEAK,
  maneuverSeries,
  SATURATION,
  saturationSeries,
  WHEEL_COLORS,
} from './wheelFigures';

export type WheelFigureVariant = 'intercambio' | 'maniobra' | 'saturacion';

export interface WheelFigureProps {
  variant: WheelFigureVariant;
}

type Scales = { x: Scale; y: Scale };

const TURN_SECONDS = 60;
const THETA_DOMAIN = { min: 0, max: 100 } as const;
/** Room under the −970 rpm vertex for its two-line note on a phone. */
const WHEEL_RPM_DOMAIN = { min: -1400, max: 100 } as const;
const SATURATION_DAYS = 3.5;
/** Headroom above L_max for the saturation note. */
const SATURATION_TOP = 0.065;
const DOT_RADIUS = 5;
const NOTE_SIZE = 12;
const NOTE_LINE = 15;
const NOTE_GAP = 10;
const HALO_WIDTH = 4;
/** Phones get a squarer plot, so the curves and the notes keep some height (as in Tema 3). */
const COMPACT_WIDTH = 480;
const COMPACT_ASPECT = 0.9;
const WIDE_ASPECT = 1.6;
const FALLBACK_WIDTH = 720;

const haloText = {
  fill: TEXT_COLOR,
  fontFamily: TICK_FONT_FAMILY,
  fontSize: NOTE_SIZE,
  stroke: SURFACE_COLOR,
  strokeWidth: HALO_WIDTH,
  paintOrder: 'stroke',
} as const;

/** Plot areas narrower than this (phones) set the notes on two lines. */
const SPLIT_BELOW_PX = 400;
/** Width of one character of the 12 px mono note font, to keep notes inside the plot. */
const CHAR_WIDTH = 7.3;
const textWidth = (lines: readonly string[]) =>
  Math.max(...lines.map((line) => line.length)) * CHAR_WIDTH;

function NoteText({
  x,
  y,
  lines,
  anchor,
}: {
  x: number;
  y: number;
  lines: readonly string[];
  anchor: 'start' | 'middle' | 'end';
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} {...haloText}>
      {lines.map((line, index) => (
        // A trailing space keeps the words apart in the text's content (and its accessible text).
        <tspan key={line} x={x} dy={index === 0 ? 0 : NOTE_LINE}>
          {index < lines.length - 1 ? `${line} ` : line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * A marked point and its note: below and to the right of it (`below`) or above and to its left
 * (`above`). On a narrow plot the note takes `compactLines`; either way it is pushed back inside
 * the plot's width.
 */
function PointNote({
  id,
  at,
  lines,
  compactLines = lines,
  scales,
  placement,
}: {
  id: string;
  at: { x: number; y: number };
  lines: readonly string[];
  compactLines?: readonly string[];
  scales: Scales;
  placement: 'below' | 'above';
}) {
  const [left, right] = scales.x.range;
  const shown = right - left < SPLIT_BELOW_PX ? compactLines : lines;
  const width = textWidth(shown);
  const cx = scales.x.toPx(at.x);
  const cy = scales.y.toPx(at.y);
  const isBelow = placement === 'below';
  const x = isBelow
    ? Math.min(cx + NOTE_GAP, right - width)
    : Math.max(cx - NOTE_GAP, left + width);
  const firstY = isBelow
    ? cy + NOTE_GAP + NOTE_SIZE
    : cy - NOTE_GAP - (shown.length - 1) * NOTE_LINE;
  return (
    <g data-note={id} className="pointer-events-none">
      <circle
        cx={cx}
        cy={cy}
        r={DOT_RADIUS}
        fill={TEXT_COLOR}
        stroke={SURFACE_COLOR}
        strokeWidth={2}
      />
      <NoteText x={x} y={firstY} lines={shown} anchor={isBelow ? 'start' : 'end'} />
    </g>
  );
}

const BAND_PADDING = 8;

/** A note centred in the x band [from, to] at height y, on two lines when one does not fit. */
function BandNote({
  id,
  from,
  to,
  y,
  lines,
  compactLines,
  scales,
}: {
  id: string;
  from: number;
  to: number;
  y: number;
  lines: readonly string[];
  compactLines: readonly string[];
  scales: Scales;
}) {
  const bandLeft = scales.x.toPx(from);
  const bandRight = scales.x.toPx(to);
  const fits = textWidth(lines) + 2 * BAND_PADDING <= bandRight - bandLeft;
  return (
    <g data-note={id} className="pointer-events-none">
      <NoteText
        x={(bandLeft + bandRight) / 2}
        y={scales.y.toPx(y)}
        lines={fits ? lines : compactLines}
        anchor="middle"
      />
    </g>
  );
}

/** The plot's aspect ratio for its measured width, inside a wrapper that measures it. */
function useFigureAspect() {
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  return { ref, aspectRatio: width < COMPACT_WIDTH ? COMPACT_ASPECT : WIDE_ASPECT };
}

function ManeuverPlots(): JSX.Element {
  const { theta, wheel } = maneuverSeries();
  const { ref, aspectRatio } = useFigureAspect();
  return (
    <div ref={ref} className="flex flex-col gap-4">
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Ángulo de la nave durante el giro"
        xLabel="t"
        xUnit="s"
        yLabel="θ_s"
        yUnit="°"
        series={[{ id: 'theta-nave', label: 'θ_s', points: theta, color: WHEEL_COLORS.body }]}
        xDomain={{ min: 0, max: TURN_SECONDS }}
        yDomain={THETA_DOMAIN}
        overlay={(scales) => (
          <PointNote
            id="theta-pico"
            at={{ x: MANEUVER_PEAK.t, y: MANEUVER_PEAK.thetaDeg }}
            lines={[MANEUVER_PEAK.thetaLabel]}
            compactLines={MANEUVER_PEAK.thetaLines}
            scales={scales}
            placement="below"
          />
        )}
        ariaLabel={`Ángulo de la nave θ_s durante el giro de 90° en 60 s: sube en forma de S, lento al principio y al final, y pasa por ${MANEUVER_PEAK.thetaLabel}, cuando la nave gira más rápido.`}
      />
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Velocidad de la rueda durante el giro"
        xLabel="t"
        xUnit="s"
        yLabel="ω_w"
        yUnit="rpm"
        series={[{ id: 'omega-rueda', label: 'ω_w', points: wheel, color: WHEEL_COLORS.wheel }]}
        xDomain={{ min: 0, max: TURN_SECONDS }}
        yDomain={WHEEL_RPM_DOMAIN}
        overlay={(scales) => (
          <PointNote
            id="omega-pico"
            at={{ x: MANEUVER_PEAK.t, y: MANEUVER_PEAK.wheelRpm }}
            lines={[MANEUVER_PEAK.wheelLabel]}
            compactLines={MANEUVER_PEAK.wheelLines}
            scales={scales}
            placement="below"
          />
        )}
        ariaLabel={`Velocidad de la rueda ω_w durante el mismo giro: baja en línea recta hasta ${MANEUVER_PEAK.wheelLabel}, en sentido contrario al de la nave, y vuelve a 0 rpm al final.`}
      />
    </div>
  );
}

function SaturationPlot(): JSX.Element {
  const { ref, aspectRatio } = useFigureAspect();
  const flat = (y: number) => [
    { x: 0, y },
    { x: SATURATION_DAYS, y },
  ];
  return (
    <div ref={ref}>
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Momento angular de la rueda con una perturbación que no para"
        xLabel="t"
        xUnit="días"
        yLabel="L_w"
        yUnit="N·m·s"
        series={[
          {
            id: 'momento-rueda',
            label: `L_w con τ_ext = ${SATURATION.torqueLabel} constante (peor caso)`,
            points: saturationSeries(SATURATION_DAYS),
            color: WHEEL_COLORS.wheel,
          },
          {
            id: 'limite',
            label: `L_máx = ${DIAGRAM_FACTS.LmaxLabel}`,
            points: flat(RW400.Lmax),
            color: WHEEL_COLORS.limit,
          },
          {
            id: 'pico-giro',
            label: `Pico de un giro de 90° en 60 s: ${SATURATION.maneuverShareLabel} de L_máx`,
            points: flat(SATURATION.maneuverPeak),
            color: TICK_COLOR,
            dashed: true,
          },
        ]}
        xDomain={{ min: 0, max: SATURATION_DAYS }}
        yDomain={{ min: 0, max: SATURATION_TOP }}
        bands={[
          {
            from: SATURATION.days,
            to: SATURATION_DAYS,
            label: 'saturada',
          },
        ]}
        overlay={(scales) => (
          <>
            <BandNote
              id="deriva"
              from={SATURATION.days}
              to={SATURATION_DAYS}
              y={(RW400.Lmax + SATURATION.maneuverPeak) / 2}
              lines={['la nave deriva']}
              compactLines={['la nave', 'deriva']}
              scales={scales}
            />
            <PointNote
              id="saturacion"
              at={{ x: SATURATION.days, y: RW400.Lmax }}
              lines={[`≈ ${SATURATION.daysLabel}`, 'en el peor caso']}
              scales={scales}
              placement="above"
            />
          </>
        )}
        ariaLabel={`L_w crece en línea recta desde la rueda vacía: con el torque máximo del gradiente de gravedad a 500 km, ${SATURATION.torqueLabel}, constante, la rueda se satura en ${SATURATION.secondsLabel}, unos ${SATURATION.daysLabel} en el peor caso, y desde ahí la nave deriva. Un giro de 90° en 60 s solo usa el ${SATURATION.maneuverShareLabel} de L_máx.`}
      />
    </div>
  );
}

/** The static figures of Tema 8's steps 1–3. */
export default function WheelFigure({ variant }: WheelFigureProps): JSX.Element {
  switch (variant) {
    case 'intercambio':
      return <ExchangeDiagram />;
    case 'maniobra':
      return <ManeuverPlots />;
    case 'saturacion':
      return <SaturationPlot />;
  }
}
