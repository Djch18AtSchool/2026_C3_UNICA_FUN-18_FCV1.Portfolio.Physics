import type { JSX } from 'react';
import { CELESTE_JUMP, JUMP_PRESETS } from '../../../lib/data/jumpPresets';
import { formatNumber } from '../../../lib/format';
import { G_EARTH } from '../../../lib/physics';
import { SURFACE_COLOR, TEXT_COLOR, TICK_FONT_FAMILY } from '../../charts/chartTheme';
import { monoTextWidth, type Scale } from '../../lab/plotScales';
import SvgPlot, { type PlotSeries } from '../../lab/SvgPlot';
import { computeJump, type JumpResult, type JumpSettings } from './jumpModel';
import { worldForPreset } from './jumpWorlds';

export type JumpFigureVariant = 'caida-libre' | 'gravedades' | 'diseno';

export interface JumpFigureProps {
  variant: JumpFigureVariant;
}

/** Madeline's impulse at 8 px = 1 m (m/s), the one v1 compares across gravities. */
const IMPULSE = CELESTE_JUMP.v0;
const SMB = JUMP_PRESETS.find((preset) => preset.id === 'super-mario-bros')?.values as JumpSettings;
/** Fixed precision of the static figures, which do not follow the lab's decimals setting. */
const PRECISION = 2;
const APEX_RADIUS = 5;
const LABEL_GAP = 10;
const LABEL_SIZE = 12;
const HALO_WIDTH = 4;
const GUIDE_DASH = '2 4';

const m = (value: number) => formatNumber(value, { precision: PRECISION, unit: 'm' });
const s = (value: number) => formatNumber(value, { precision: PRECISION, unit: 's' });
/** Gravity as v1 writes it: 9,81, 28,1, 112,5 (no padding zeros). */
const gravity = (g: number) => `${String(g).replace('.', ',')} m/s²`;

/** A symmetric jump (k = 1, vₓ = 0) with this impulse and gravity. */
const verticalJump = (v0: number, g: number) => computeJump({ v0, g, vx: 0, fallMultiplier: 1 });
const heightOverTime = (result: JumpResult) => result.points.map(({ t, y }) => ({ x: t, y }));
const riseOnly = (result: JumpResult) =>
  heightOverTime({ ...result, points: result.points.filter((p) => p.t <= result.tApex) }).concat({
    x: result.tApex,
    y: result.hMax,
  });

function seriesFor(
  presetId: string,
  label: string,
  points: { x: number; y: number }[],
): PlotSeries {
  return { id: presetId, label, points, color: worldForPreset(presetId).color };
}

const AXES = { xLabel: 't', xUnit: 's', yLabel: 'y', yUnit: 'm' } as const;

function FreeFall(): JSX.Element {
  const earth = verticalJump(IMPULSE, G_EARTH);
  return (
    <SvgPlot
      {...AXES}
      title={`Lanzamiento vertical en la Tierra, v₀ = ${String(IMPULSE).replace('.', ',')} m/s`}
      series={[seriesFor('tierra', 'Tierra', heightOverTime(earth))]}
      marker={{ x: earth.tApex, y: earth.hMax, label: 'ápice' }}
      ariaLabel={`Altura y(t) con g = 9,81 m/s²: sube ${m(earth.hMax)} en ${s(earth.tApex)} y vuelve al suelo a los ${s(earth.tAir)}.`}
    />
  );
}

function Gravities(): JSX.Element {
  const jumps = [
    { id: 'tierra', g: G_EARTH },
    { id: 'super-mario-bros', g: SMB.g },
    { id: 'celeste', g: CELESTE_JUMP.g },
  ].map(({ id, g }) => ({ id, g, result: verticalJump(IMPULSE, g) }));
  return (
    <SvgPlot
      {...AXES}
      title={`El mismo impulso, ${String(IMPULSE).replace('.', ',')} m/s, con tres gravedades`}
      series={jumps.map(({ id, g, result }) =>
        seriesFor(id, `${worldForPreset(id).name}, g = ${gravity(g)}`, heightOverTime(result)),
      )}
      ariaLabel={`Altura y(t) con el mismo impulso: ${jumps
        .map(
          ({ id, result }) => `${worldForPreset(id).name}, ${m(result.hMax)} en ${s(result.tAir)}`,
        )
        .join('; ')}.`}
    />
  );
}

/** The x window reaches this multiple of Mario's t_h, leaving room for the labels on the right. */
const APEX_X_ROOM = 2;
/** Closest a label starts to its apex, and the room it keeps before another apex's guide. */
const MIN_LABEL_GAP = 6;
const LIMIT_GAP = 4;
/** Line height of the two-line apex label. */
const LABEL_LINE = 15;

/**
 * The apex (t_h, h) of a designed jump, with dotted guides to both axes and a two-line label to
 * its right (the x window leaves room for it): above the point when the plot has room there,
 * below it otherwise, so a short phone plot never clips it.
 */
function Apex({
  result,
  x,
  y,
  labelLimit,
}: {
  result: JumpResult;
  x: Scale;
  y: Scale;
  /** viewBox x the label should end LIMIT_GAP before (another apex's guide), when given. */
  labelLimit?: number;
}) {
  const cx = x.toPx(result.tApex);
  const cy = y.toPx(result.hMax);
  const lines = [`h = ${m(result.hMax)}`, `tₕ = ${s(result.tApex)}`];
  const width = Math.max(...lines.map((line) => monoTextWidth(line, LABEL_SIZE)));
  // On a narrow plot the label slides a little left to clear the limit, but never onto its point
  // (further left it would run into the steeper curve rising past it).
  const latestStart = labelLimit === undefined ? Infinity : labelLimit - LIMIT_GAP - width;
  const labelX = Math.max(cx + MIN_LABEL_GAP, Math.min(cx + LABEL_GAP, latestStart));
  const hasRoomAbove = cy - y.range[1] > 2 * LABEL_LINE + LABEL_GAP;
  const firstLineY = hasRoomAbove ? cy - LABEL_LINE - LABEL_GAP / 2 : cy + LABEL_LINE;
  return (
    <g data-apex="" className="pointer-events-none">
      <polyline
        points={`${x.toPx(0)},${cy} ${cx},${cy} ${cx},${y.toPx(0)}`}
        fill="none"
        stroke={TEXT_COLOR}
        strokeDasharray={GUIDE_DASH}
      />
      <circle
        cx={cx}
        cy={cy}
        r={APEX_RADIUS}
        fill={TEXT_COLOR}
        stroke={SURFACE_COLOR}
        strokeWidth={2}
      />
      <text
        x={labelX}
        y={firstLineY}
        fill={TEXT_COLOR}
        fontFamily={TICK_FONT_FAMILY}
        fontSize={LABEL_SIZE}
        stroke={SURFACE_COLOR}
        strokeWidth={HALO_WIDTH}
        paintOrder="stroke"
      >
        <tspan x={labelX}>{lines[0]}</tspan>
        <tspan x={labelX} dy={LABEL_LINE}>
          {lines[1]}
        </tspan>
      </text>
    </g>
  );
}

function Design(): JSX.Element {
  const celeste = verticalJump(CELESTE_JUMP.v0, CELESTE_JUMP.g);
  const mario = verticalJump(SMB.v0, SMB.g);
  const label = (id: string, settings: JumpSettings) =>
    `${worldForPreset(id).name}: g = ${gravity(settings.g)}, v₀ = ${String(settings.v0).replace('.', ',')} m/s`;
  return (
    <SvgPlot
      {...AXES}
      title="Subida hasta el ápice que pide cada diseño"
      series={[
        seriesFor('super-mario-bros', label('super-mario-bros', SMB), riseOnly(mario)),
        seriesFor('celeste', label('celeste', CELESTE_JUMP), riseOnly(celeste)),
      ]}
      yDomain={{ min: 0, max: mario.hMax * 1.25 }}
      xDomain={{ min: 0, max: mario.tApex * APEX_X_ROOM }}
      overlay={({ x, y }) => (
        <>
          <Apex result={mario} x={x} y={y} />
          <Apex result={celeste} x={x} y={y} labelLimit={x.toPx(mario.tApex)} />
        </>
      )}
      ariaLabel={`Subida de Super Mario Bros. hasta h = ${m(mario.hMax)} en tₕ = ${s(mario.tApex)} y de Celeste hasta h = ${m(celeste.hMax)} en tₕ = ${s(celeste.tApex)}.`}
    />
  );
}

/** The small static figures of Tema 2's steps 1–3, drawn with the lab plotter. */
export default function JumpFigure({ variant }: JumpFigureProps): JSX.Element {
  switch (variant) {
    case 'caida-libre':
      return <FreeFall />;
    case 'gravedades':
      return <Gravities />;
    case 'diseno':
      return <Design />;
  }
}
