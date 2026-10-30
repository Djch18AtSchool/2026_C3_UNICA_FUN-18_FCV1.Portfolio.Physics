/**
 * The step figures of Tema 9, drawn with the lab plotter. Paso 1 (`vis-viva`): V2's speed against
 * its distance to the Sun follows vis-viva, bound before Jupiter and hyperbolic after. Paso 2
 * (`hiperbola`): the flyby in Jupiter's frame, to scale. Paso 3 (`triangulo`): the velocity
 * triangles back in the Sun's frame, Jupiter (+9,91 km/s) beside Neptune (−2,13 km/s).
 */
import type { JSX } from 'react';
import { PLANETS, type PlanetId } from '../../../lib/data/planets';
import { formatNumber } from '../../../lib/format';
import { TEXT_COLOR, TICK_COLOR } from '../../charts/chartTheme';
import { useElementWidth } from '../../hooks/useElementWidth';
import { Arrow, Label, type Point } from '../../lab/OverlayMarks';
import { fitCentre, monoTextWidth, type Domain, type Scale } from '../../lab/plotScales';
import SvgPlot from '../../lab/SvgPlot';
import { signed } from './flybyFormat';
import { clearSpot, segmentsOf, type Box, type Segment } from '../../lab/labelClearance';
import { speedText } from './voyagerChartData';
import { SUN_COLOR } from './VoyagerPlotParts';
import {
  formatScientific,
  hyperbolaFigure,
  jupiterRecoil,
  velocityTriangle,
  visVivaFigure,
  type VelocityTriangle,
} from './flybyFigures';

export type FlybyFigureVariant = 'vis-viva' | 'hiperbola' | 'triangulo';

export interface FlybyFigureProps {
  variant: FlybyFigureVariant;
}

type Scales = { x: Scale; y: Scale };

const JUPITER = `var(${PLANETS.jupiter.token})`;
const DOT_RADIUS = 3;
const GUIDE_DASH = '4 4';
const FALLBACK_WIDTH = 720;
/** Phones get a squarer Paso 1 plot so both curves keep some height. */
const COMPACT_WIDTH = 480;
const COMPACT_ASPECT = 0.9;
const WIDE_ASPECT = 1.6;
/** Plot areas narrower than this (px) stack the aphelion label on three lines. */
const SPLIT_LABEL_BELOW_PX = 360;
const LABEL_LINE = 14;
/** Font size of the overlay labels (OverlayMarks' Label). */
const LABEL_SIZE = 13;
const APHELION_LABEL_GAP = 8;
/** Drops the last line's baseline so it is centred on the dot. */
const APHELION_LABEL_DROP = 4;
/** r to 11 UA: past Saturn's orbit, with room right of the aphelion for its label on a phone. */
const VIS_VIVA_DOMAIN = { x: { min: 0, max: 11 }, y: { min: 0, max: 45 } } as const;
/** Paso 2's window: room past the path and around the crossing of the asymptotes (R_J). */
const PATH_MARGIN_RADII = 5;
const CENTER_MARGIN_RADII = 12;
/** Asymptote lines drawn this long (R_J), and the incoming one this far past the crossing. */
const ASYMPTOTE_RADII = 90;
const ASYMPTOTE_PAST_RADII = 14;
const ARC_RADII = 9;
const ARC_STEPS = 24;
/** "v∞" tags: tried at these distances (px) from their arrow, at these fractions along it. */
const TAG_DISTANCES_PX = [14, 20, 28, 36, 46];
const TAG_ALONG = [0.5, 0.3, 0.7, 0.15, 0.85];
/** Clear space (px) kept around a tag's text box, for the arrowheads and the line widths. */
const TAG_PAD_PX = 3;
/** Drops the baseline so the text is centred on its spot (13 px font: 10 px up, 3 px down). */
const TAG_BASELINE_DROP = 3.5;
/** Smallest drawn radius of Jupiter (px): at true scale it is a few pixels wide. */
const MIN_PLANET_PX = 3;
/**
 * Room (px) around the velocity triangles for the labels above the tips and under V⃗_p: about
 * two lines of the 13 px label font, whatever the width.
 */
const TRIANGLE_MARGIN_PX = 30;
/**
 * Width (px) between a triangle's cell and its plot area: the chart frame's padding and border
 * (2 × 17) and the plotter's compact margins (about 40 left and 14 right).
 */
const TRIANGLE_PLOT_INSET_PX = 90;
const SPEED_PRECISION = 2;
const ENERGY_PRECISION = 1;
const ANGLE_PRECISION = 1;

const degrees = (value: number) => `${formatNumber(value, { precision: ANGLE_PRECISION })}°`;
const energy = (value: number) => signed(value, ENERGY_PRECISION, 'km²/s²');

/** The plot's aspect ratio for its measured width, inside a wrapper that measures it. */
function useFigureAspect() {
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  return { ref, aspectRatio: width < COMPACT_WIDTH ? COMPACT_ASPECT : WIDE_ASPECT };
}

/** Lines of a label as tspans, so the text keeps its words for assistive technology. */
function Lines({ at, lines }: { at: Point; lines: string[] }): JSX.Element {
  return (
    <text
      x={at.x}
      y={at.y}
      fill={TEXT_COLOR}
      fontFamily="var(--font-mono)"
      fontSize={LABEL_SIZE}
      stroke="var(--bg-elevated)"
      strokeWidth={4}
      paintOrder="stroke"
    >
      {lines.map((line, index) => (
        <tspan key={line} x={at.x} dy={index === 0 ? 0 : LABEL_LINE}>
          {index < lines.length - 1 ? `${line} ` : line}
        </tspan>
      ))}
    </text>
  );
}

/** Paso 1: |v| against r, the data on vis-viva with ε < 0 before Jupiter and ε > 0 after. */
function VisVivaPlot(): JSX.Element {
  const figure = visVivaFigure();
  const { ref, aspectRatio } = useFigureAspect();
  const aphelionLines = [
    'Afelio:',
    `${formatNumber(figure.aphelion.x, { precision: 2, unit: 'UA' })},`,
    speedText(figure.aphelion.y),
  ];
  const overlay = ({ x, y }: Scales) => {
    const px = (p: Point) => ({ x: x.toPx(p.x), y: y.toPx(p.y) });
    const aphelion = px(figure.aphelion);
    const isSplit = x.range[1] - x.range[0] < SPLIT_LABEL_BELOW_PX;
    const lines = isSplit ? aphelionLines : [aphelionLines.join(' ')];
    const jupiterX = x.toPx(figure.jupiterR);
    return (
      <g className="pointer-events-none">
        <line
          x1={jupiterX}
          x2={jupiterX}
          y1={y.range[0]}
          y2={y.range[1]}
          stroke={JUPITER}
          strokeDasharray={GUIDE_DASH}
        />
        <Label at={{ x: jupiterX, y: y.range[1] }} dx={-6} dy={16} anchor="end">
          Júpiter
        </Label>
        {[...figure.before, ...figure.after].map((p) => (
          <circle
            key={p.x}
            data-dot=""
            cx={x.toPx(p.x)}
            cy={y.toPx(p.y)}
            r={DOT_RADIUS}
            fill={TEXT_COLOR}
          />
        ))}
        <circle cx={aphelion.x} cy={aphelion.y} r={DOT_RADIUS + 1} fill={TICK_COLOR} />
        {/* Below the escape curve, right of the dot, the plot is empty: the last line sits level with it. */}
        <Lines
          at={{
            x: aphelion.x + APHELION_LABEL_GAP,
            y: aphelion.y + APHELION_LABEL_DROP - (lines.length - 1) * LABEL_LINE,
          }}
          lines={lines}
        />
      </g>
    );
  };
  return (
    <div ref={ref}>
      <SvgPlot
        aspectRatio={aspectRatio}
        title="Rapidez de la Voyager 2 frente a su distancia al Sol"
        xLabel="r"
        xUnit="UA"
        yLabel="|v|"
        yUnit="km/s"
        series={[
          {
            id: 'datos',
            label: 'Datos de Horizons (puntos cada 20 días)',
            points: [],
            color: TEXT_COLOR,
          },
          {
            id: 'solo-sol',
            label: `Solo el Sol antes de Júpiter, ε = ${energy(figure.boundEnergy)}`,
            points: figure.boundCurve,
            color: TICK_COLOR,
            dashed: true,
          },
          {
            id: 'despues',
            label: `Después de Júpiter, ε = ${energy(figure.afterEnergy)}`,
            points: figure.afterCurve,
            color: JUPITER,
          },
          {
            id: 'escape',
            label: 'Escape, √(2GM☉/r): ε = 0',
            points: figure.escapeCurve,
            color: SUN_COLOR,
            dashed: true,
          },
        ]}
        xDomain={VIS_VIVA_DOMAIN.x}
        yDomain={VIS_VIVA_DOMAIN.y}
        overlay={overlay}
        ariaLabel={`Rapidez de la Voyager 2 respecto al Sol frente a su distancia al Sol. Antes de Júpiter los datos siguen vis-viva con ε = ${energy(figure.boundEnergy)}, una órbita ligada: solo con el Sol la rapidez bajaría a ${speedText(figure.aphelion.y)} en el afelio, a ${formatNumber(figure.aphelion.x, { precision: 2, unit: 'UA' })}, y la sonda volvería. Entre Júpiter y Saturno siguen vis-viva con ε = ${energy(figure.afterEnergy)}, por encima de la rapidez de escape.`}
      />
    </div>
  );
}

/** Points of an arc of `radius` around `centre` from angle a to b (rad), in data units. */
function arc(centre: Point, radius: number, a: number, b: number): Point[] {
  return Array.from({ length: ARC_STEPS + 1 }, (_, i) => {
    const angle = a + ((b - a) * i) / ARC_STEPS;
    return { x: centre.x + radius * Math.cos(angle), y: centre.y + radius * Math.sin(angle) };
  });
}

/**
 * Where a "v∞" tag goes: the nearest spot beside its arrow (either side, along the arrow, a
 * little further out each round) whose box crosses no line of the figure, or beside the
 * arrow's middle when nothing is clear.
 */
function vInfTagSpot(from: Point, to: Point, lines: readonly Segment[], area: Box): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const normal = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
  const at = (t: number, side: number, distance: number) => ({
    x: from.x + t * (to.x - from.x) + side * distance * normal.x,
    y: from.y + t * (to.y - from.y) + side * distance * normal.y,
  });
  const candidates = TAG_DISTANCES_PX.flatMap((distance) =>
    TAG_ALONG.flatMap((t) => [at(t, 1, distance), at(t, -1, distance)]),
  );
  const size = {
    width: monoTextWidth('v∞', LABEL_SIZE) + 2 * TAG_PAD_PX,
    height: LABEL_SIZE + 2 * TAG_PAD_PX,
  };
  return clearSpot(candidates, size, lines, area) ?? at(0.5, 1, TAG_DISTANCES_PX[0]);
}

/** Paso 2: V2's hyperbola around Jupiter, to scale, with r_p, the equal v∞ arrows and δ. */
function HyperbolaPlot(): JSX.Element {
  const figure = hyperbolaFigure();
  const { center, inDir, outDir, path } = figure;
  const along = (from: Point, dir: Point, length: number) => ({
    x: from.x + length * dir.x,
    y: from.y + length * dir.y,
  });
  const extentY = Math.max(...path.map((p) => Math.abs(p.y))) + PATH_MARGIN_RADII;
  const deltaText = `δ = ${degrees(figure.deltaDeg)}`;
  /** In the legend: on a phone there is no free corner of the plot for it. */
  const eText = formatNumber(figure.e, { precision: 3 });
  const asymptotes = [
    along(center, inDir, -ASYMPTOTE_RADII),
    along(center, inDir, ASYMPTOTE_PAST_RADII),
    { x: Number.NaN, y: Number.NaN },
    center,
    along(center, outDir, ASYMPTOTE_RADII),
  ];
  const overlay = ({ x, y }: Scales) => {
    const px = (p: Point) => ({ x: x.toPx(p.x), y: y.toPx(p.y) });
    const planetPx = Math.max(x.toPx(1) - x.toPx(0), MIN_PLANET_PX);
    const area = { left: x.range[0], right: x.range[1], top: y.range[1], bottom: y.range[0] };
    const arrowLines = [figure.inArrow, figure.outArrow].map((arrow): Segment => [
      px(arrow.from),
      px(arrow.to),
    ]);
    const rpLine: Segment = [px({ x: 0, y: 0 }), px({ x: figure.rpRadii, y: 0 })];
    const lines = [
      ...segmentsOf(path.map(px)),
      ...segmentsOf(asymptotes.map(px)),
      ...arrowLines,
      rpLine,
    ];
    const arcPoints = arc(
      center,
      ARC_RADII,
      Math.atan2(inDir.y, inDir.x),
      Math.atan2(outDir.y, outDir.x),
    ).map(px);
    return (
      <g className="pointer-events-none">
        <circle data-planet="jupiter" cx={x.toPx(0)} cy={y.toPx(0)} r={planetPx} fill={JUPITER} />
        <line
          x1={x.toPx(0)}
          y1={y.toPx(0)}
          x2={x.toPx(figure.rpRadii)}
          y2={y.toPx(0)}
          stroke={TEXT_COLOR}
        />
        {/* Between Jupiter and periapsis there is room for the symbol only; the value goes to the
            bottom-right corner, which the incoming asymptote leaves empty. */}
        <Label at={px({ x: figure.rpRadii / 2, y: 0 })} dx={0} dy={-6} anchor="middle">
          rₚ
        </Label>
        <Label at={{ x: x.range[1], y: y.range[0] }} dx={-8} dy={-10} anchor="end">
          {`rₚ = ${formatNumber(figure.rpRadii, { precision: 2 })} R_J`}
        </Label>
        <Arrow from={px(figure.inArrow.from)} to={px(figure.inArrow.to)} color={TEXT_COLOR} />
        <Arrow from={px(figure.outArrow.from)} to={px(figure.outArrow.to)} color={TEXT_COLOR} />
        {[figure.inArrow, figure.outArrow].map((arrow) => {
          const at = vInfTagSpot(px(arrow.from), px(arrow.to), lines, area);
          return (
            <Label key={arrow.from.x} at={at} dx={0} dy={TAG_BASELINE_DROP} anchor="middle">
              v∞
            </Label>
          );
        })}
        <polyline
          points={arcPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={TEXT_COLOR}
        />
        <Label
          at={{
            x: fitCentre(
              x.toPx(center.x),
              monoTextWidth(deltaText, LABEL_SIZE),
              x.range[0],
              x.range[1],
            ),
            y: y.toPx(ARC_RADII),
          }}
          dx={0}
          dy={-8}
          anchor="middle"
        >
          {deltaText}
        </Label>
      </g>
    );
  };
  return (
    <SvgPlot
      title="Sobrevuelo de la Voyager 2 en el marco de Júpiter, a escala"
      xLabel="x"
      xUnit="R_J"
      yLabel="y"
      yUnit="R_J"
      series={[
        {
          id: 'trayectoria',
          label: `Trayectoria de la V2: hipérbola con e = ${eText}`,
          points: path,
          color: TEXT_COLOR,
        },
        {
          id: 'vinf',
          label: `Flechas v⃗∞ al entrar y al salir: ${speedText(figure.vInf)} las dos`,
          points: [],
          color: TEXT_COLOR,
          legendKey: 'arrow',
        },
        {
          id: 'asintotas',
          label: 'Asíntotas: direcciones de v⃗∞ al entrar y al salir',
          points: asymptotes,
          color: TICK_COLOR,
          dashed: true,
        },
      ]}
      xDomain={{
        min: Math.min(...path.map((p) => p.x)) - PATH_MARGIN_RADII,
        max: center.x + CENTER_MARGIN_RADII,
      }}
      yDomain={{ min: -extentY, max: extentY }}
      equalAspect
      overlay={overlay}
      ariaLabel={`Trayectoria de la Voyager 2 en el marco de Júpiter, a escala, en radios de Júpiter (R_J): una hipérbola con rₚ = ${formatNumber(figure.rpKm, { precision: 0, unit: 'km' })} (${formatNumber(figure.rpRadii, { precision: 2 })} R_J), v∞ = ${speedText(figure.vInf)} y e = ${eText}. Entra y sale con la misma rapidez v∞; solo cambia la dirección, que gira δ = ${degrees(figure.deltaDeg)}.`}
    />
  );
}

function triangleDescription(t: VelocityTriangle, name: string): string {
  const base = `Triángulo de velocidades de la Voyager 2 en ${name}: V_p = ${speedText(t.Vp)} y v∞ = ${speedText(t.vInf)}; v⃗∞ forma ${degrees(t.thetaInDeg)} con V⃗_p antes y ${degrees(t.thetaOutDeg)} después, así que |v⃗| = |V⃗_p + v⃗∞| pasa de ${speedText(t.vIn)} a ${speedText(t.vOut)}: ${signed(t.jump, SPEED_PRECISION, 'km/s')}.`;
  return t.isPlanar
    ? base
    : `${base} Es un giro fuera del plano: el dibujo conserva los ángulos de v⃗∞ con V⃗_p, no el giro δ = ${degrees(t.deltaDeg)}.`;
}

const TRIANGLE_PLANETS: readonly PlanetId[] = ['jupiter', 'neptune'];

/** One window for both triangles, so they share a scale and read side by side. */
/**
 * One window for both triangles, so they share a scale and read side by side, with a margin of
 * TRIANGLE_MARGIN_PX on every side for a plot `plotWidth` px wide. The scale is plotWidth over
 * the x span (the equal-aspect plot keeps it while the y span fits), so a margin m in km/s takes
 * m · plotWidth / (core + 2m) px: m = M · core / (plotWidth − 2M).
 */
export function triangleDomain(
  triangles: readonly VelocityTriangle[],
  plotWidth: number,
): { x: Domain; y: Domain } {
  const xs = triangles.flatMap((t) => [0, t.Vp, t.inTip.x, t.outTip.x]);
  const ys = triangles.flatMap((t) => [0, t.inTip.y, t.outTip.y]);
  const core = Math.max(...xs) - Math.min(...xs);
  const room = Math.max(plotWidth - 2 * TRIANGLE_MARGIN_PX, TRIANGLE_MARGIN_PX);
  const margin = (TRIANGLE_MARGIN_PX * core) / room;
  return {
    x: { min: Math.min(...xs) - margin, max: Math.max(...xs) + margin },
    y: { min: Math.min(...ys) - margin, max: Math.max(...ys) + margin },
  };
}

const speedNumber = (v: number) => formatNumber(v, { precision: SPEED_PRECISION });

function TrianglePlot({
  triangle: t,
  domain,
}: {
  triangle: VelocityTriangle;
  domain: { x: Domain; y: Domain };
}): JSX.Element {
  const { name, token } = PLANETS[t.planet];
  const color = `var(${token})`;
  const overlay = ({ x, y }: Scales) => {
    const px = (p: Point) => ({ x: x.toPx(p.x), y: y.toPx(p.y) });
    const origin = px({ x: 0, y: 0 });
    const vpTip = px({ x: t.Vp, y: 0 });
    /** A tip's |v⃗| above it, kept inside the plot. */
    const tipLabel = (tip: Point, value: number) => {
      const text = speedNumber(value);
      const at = {
        x: fitCentre(px(tip).x, monoTextWidth(text, LABEL_SIZE), x.range[0], x.range[1]),
        y: px(tip).y,
      };
      return (
        <Label at={at} dx={0} dy={-10} anchor="middle">
          {text}
        </Label>
      );
    };
    return (
      <g className="pointer-events-none">
        <Arrow from={vpTip} to={px(t.inTip)} color={TICK_COLOR} dashed />
        <Arrow from={vpTip} to={px(t.outTip)} color={TICK_COLOR} />
        <Arrow from={origin} to={px(t.inTip)} color={TEXT_COLOR} dashed />
        <Arrow from={origin} to={px(t.outTip)} color={TEXT_COLOR} />
        <Arrow from={origin} to={vpTip} color={color} />
        <Label at={px({ x: t.Vp / 2, y: 0 })} dx={0} dy={18} anchor="middle">
          {`V_p ${speedNumber(t.Vp)}`}
        </Label>
        {tipLabel(t.inTip, t.vIn)}
        {tipLabel(t.outTip, t.vOut)}
      </g>
    );
  };
  return (
    <SvgPlot
      title={`${name} (V2): ${signed(t.jump, SPEED_PRECISION, 'km/s')}`}
      xLabel="vₓ"
      xUnit="km/s"
      yLabel="v_y"
      yUnit="km/s"
      series={[
        { id: `vp-${t.planet}`, label: `V⃗_p de ${name}`, points: [], color },
        {
          id: `vinf-${t.planet}`,
          label: 'v⃗∞ antes (discontinua) y después',
          points: [],
          color: TICK_COLOR,
        },
        {
          id: `v-${t.planet}`,
          label: 'v⃗ respecto al Sol, antes (discontinua) y después',
          points: [],
          color: TEXT_COLOR,
        },
      ]}
      xDomain={domain.x}
      yDomain={domain.y}
      equalAspect
      overlay={overlay}
      ariaLabel={triangleDescription(t, name)}
    />
  );
}

/** The note under a triangle: |v⃗| before and after, then the recoil or the out-of-plane turn. */
function triangleNote(t: VelocityTriangle): string {
  const speeds = `|v⃗| respecto al Sol: ${speedText(t.vIn)} antes y ${speedText(t.vOut)} después.`;
  if (!t.isPlanar) {
    return `${speeds} Giro fuera del plano: el dibujo conserva los ángulos de v⃗∞ con V⃗_p (${degrees(t.thetaInDeg)} y ${degrees(t.thetaOutDeg)}), no el giro δ = ${degrees(t.deltaDeg)}.`;
  }
  if (t.planet === 'jupiter') {
    const recoil = `${formatScientific(jupiterRecoil(), 1)}\u202fm/s`;
    return `${speeds} El momento se conserva (m Δv⃗ = −M ΔV⃗): Júpiter retrocede ${recoil}.`;
  }
  return speeds;
}

/** Paso 3: Jupiter and Neptune side by side on one scale (stacked on phones), each with a note. */
function Triangles(): JSX.Element {
  const triangles = TRIANGLE_PLANETS.map(velocityTriangle);
  // Both cells have the same width; the first one is measured.
  const [cellRef, cellWidth] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const domain = triangleDomain(triangles, cellWidth - TRIANGLE_PLOT_INSET_PX);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {triangles.map((triangle, i) => (
        <div
          key={triangle.planet}
          ref={i === 0 ? cellRef : undefined}
          data-triangle-cell=""
          className="flex min-w-0 flex-col gap-2"
        >
          <TrianglePlot triangle={triangle} domain={domain} />
          <p className="text-xs text-fg-muted">{triangleNote(triangle)}</p>
        </div>
      ))}
    </div>
  );
}

export default function FlybyFigure({ variant }: FlybyFigureProps): JSX.Element {
  switch (variant) {
    case 'vis-viva':
      return <VisVivaPlot />;
    case 'hiperbola':
      return <HyperbolaPlot />;
    case 'triangulo':
      return <Triangles />;
  }
}
