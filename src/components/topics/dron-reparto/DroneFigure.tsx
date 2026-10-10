import type { JSX } from 'react';
import { DRONE_ROUTE } from '../../../lib/data/droneRoute';
import { formatNumber } from '../../../lib/format';
import { CHART_COLORS, TEXT_COLOR } from '../../charts/chartTheme';
import { Arrow, Label, type Point } from '../../lab/OverlayMarks';
import type { Scale } from '../../lab/plotScales';
import SvgPlot from '../../lab/SvgPlot';
import { constantSpeedFlight, firstLegProfile } from './droneFigures';
import { ACCEL_COLOR, ROUTE_COLOR, VELOCITY_COLOR } from './RouteOverlay';

export type DroneFigureVariant = 'ruta' | 'saltos' | 'perfil';

export interface DroneFigureProps {
  variant: DroneFigureVariant;
}

type Scales = { x: Scale; y: Scale };

/** Fixed precision of the static figures, which do not follow the lab's decimals setting. */
const PRECISION = 1;
const STOP_RADIUS = 5;
const GUIDE_DASH = '4 4';
/** The map window: the stops plus 100 m, room for labels and the velocity arrow. */
const MAP_PAD_M = 100;
/** Room south of the depot for its label and the x component's. */
const MAP_PAD_BOTTOM_M = 170;
/** Below this plot width (px) the map drops the coordinates from its labels. */
const COMPACT_PLOT_WIDTH = 360;
/** Vertical label offsets (px): the depot's below its dot, C's beside it (it is near the top). */
const STOP_LABEL_DY: Record<string, number> = { Depósito: 18, C: 4 };
/** Extra room east of B for its label. */
const MAP_LABEL_ROOM_M = 150;
/** Map metres per m/s of the velocity arrow in figure 1.1 (as in the laboratory). */
const VELOCITY_SCALE_M = 15;
/** Room above ±vₘₐₓ in figure 1.2. */
const SPEED_HEADROOM = 1.15;
/** The x window of figure 1.3 runs a little past the end of the leg. */
const LEG_X_ROOM = 1.08;
/** Room above vₘₐₓ in figure 1.3 for the label of T. */
const PROFILE_HEADROOM = 1.3;

const coords = ({ x, y }: Point) =>
  `(${formatNumber(x, { precision: 0 })}; ${formatNumber(y, { precision: 0 })})`;
const seconds = (value: number) => formatNumber(value, { precision: PRECISION, unit: 's' });

/** Figure 1.1: the declared route, the position vector of B with its components, v on leg 1. */
function RouteMap(): JSX.Element {
  const stops = DRONE_ROUTE.stops;
  const xs = stops.map((s) => s.x);
  const ys = stops.map((s) => s.y);
  const b = stops[2];
  const [depot, a] = stops;
  const legLength = Math.hypot(a.x - depot.x, a.y - depot.y);
  const middle = { x: (depot.x + a.x) / 2, y: (depot.y + a.y) / 2 };
  const velocityTip = {
    x: middle.x + ((a.x - depot.x) / legLength) * DRONE_ROUTE.vMax * VELOCITY_SCALE_M,
    y: middle.y + ((a.y - depot.y) / legLength) * DRONE_ROUTE.vMax * VELOCITY_SCALE_M,
  };
  const overlay = ({ x, y }: Scales) => {
    const px = (p: Point) => ({ x: x.toPx(p.x), y: y.toPx(p.y) });
    const origin = px({ x: 0, y: 0 });
    const corner = px({ x: b.x, y: 0 });
    // On a phone the plot is too narrow for coordinates: names and bare component letters only.
    const isCompact = x.range[1] - x.range[0] < COMPACT_PLOT_WIDTH;
    const stopLabel = (stop: Point & { name: string }) =>
      isCompact ? stop.name : `${stop.name} ${coords(stop)}`;
    return (
      <g className="pointer-events-none">
        <polyline
          points={`${origin.x},${origin.y} ${corner.x},${corner.y} ${px(b).x},${px(b).y}`}
          fill="none"
          stroke={TEXT_COLOR}
          strokeDasharray={GUIDE_DASH}
        />
        <Label at={{ x: (origin.x + corner.x) / 2, y: corner.y }} dx={0} dy={18} anchor="middle">
          {isCompact ? 'x' : `x = ${b.x} m`}
        </Label>
        <Label at={{ x: corner.x, y: (corner.y + px(b).y) / 2 }} dx={-8} dy={4} anchor="end">
          {isCompact ? 'y' : `y = ${b.y} m`}
        </Label>
        <Arrow from={origin} to={px(b)} color={TEXT_COLOR} />
        <Label
          at={{ x: (origin.x + px(b).x) / 2, y: (origin.y + px(b).y) / 2 }}
          dx={-14}
          dy={-6}
          anchor="end"
        >
          r
        </Label>
        <Arrow from={px(middle)} to={px(velocityTip)} color={VELOCITY_COLOR} />
        <Label at={px(velocityTip)}>v</Label>
        {stops.slice(0, -1).map((stop) => (
          <g key={stop.name}>
            <circle cx={px(stop).x} cy={px(stop).y} r={STOP_RADIUS} fill={TEXT_COLOR} />
            <Label at={px(stop)} dx={10} dy={STOP_LABEL_DY[stop.name] ?? -10}>
              {stopLabel(stop)}
            </Label>
          </g>
        ))}
      </g>
    );
  };
  return (
    <SvgPlot
      title="Ruta declarada en el plano x–y"
      xLabel="x (este)"
      xUnit="m"
      yLabel="y (norte)"
      yUnit="m"
      series={[
        {
          id: 'ruta',
          label: 'Ruta',
          points: stops.map(({ x, y }) => ({ x, y })),
          color: ROUTE_COLOR,
        },
      ]}
      xDomain={{
        min: Math.min(...xs) - MAP_PAD_M,
        max: Math.max(...xs) + MAP_PAD_M + MAP_LABEL_ROOM_M,
      }}
      yDomain={{ min: Math.min(...ys) - MAP_PAD_BOTTOM_M, max: Math.max(...ys) + MAP_PAD_M }}
      equalAspect
      overlay={overlay}
      ariaLabel={`Ruta depósito ${coords(depot)} → A ${coords(a)} → B ${coords(b)} → C ${coords(stops[3])} → depósito, en metros; el vector de posición de B tiene componentes x = ${b.x} m e y = ${b.y} m.`}
    />
  );
}

/** Figure 1.2: vₓ and v_y at constant speed jump at every takeoff and landing; a would be infinite. */
function Jumps(): JSX.Element {
  const flight = constantSpeedFlight(DRONE_ROUTE);
  const top = DRONE_ROUTE.vMax * SPEED_HEADROOM;
  const spikes = flight.jumps.flatMap((t) => [
    { x: t, y: -top },
    { x: t, y: top },
    { x: Number.NaN, y: Number.NaN },
  ]);
  return (
    <SvgPlot
      title={`Velocidad con rapidez constante de ${DRONE_ROUTE.vMax} m/s`}
      xLabel="t"
      xUnit="s"
      yLabel="v"
      yUnit="m/s"
      series={[
        {
          id: 'saltos',
          label: 'Saltos de v: a = dv/dt infinita',
          points: spikes,
          color: ACCEL_COLOR,
          dashed: true,
        },
        { id: 'vx', label: 'vₓ', points: flight.vx, color: CHART_COLORS[0] },
        { id: 'vy', label: 'v_y', points: flight.vy, color: CHART_COLORS[1] },
      ]}
      xDomain={{ min: 0, max: flight.duration }}
      yDomain={{ min: -top, max: top }}
      ariaLabel={`Componentes de la velocidad a rapidez constante: cambian de golpe en ${flight.jumps.length} instantes, al despegar y al llegar a cada vértice; la ruta dura ${seconds(flight.duration)}.`}
    />
  );
}

/** Figure 1.3: |v|(t) on the first leg, trapezoid under the limits against constant speed. */
function Profile(): JSX.Element {
  const leg = firstLegProfile(DRONE_ROUTE);
  const cruiseEnd = leg.rectangle[2].x;
  const overlay = ({ x, y }: Scales) => (
    <g className="pointer-events-none">
      <Label at={{ x: x.toPx(leg.tAccel), y: y.toPx(DRONE_ROUTE.vMax) }} dx={6} dy={18}>
        {`tₐ = ${seconds(leg.tAccel)}`}
      </Label>
      <Label at={{ x: x.toPx(cruiseEnd), y: y.toPx(0) }} dx={-6} dy={-10} anchor="end">
        {`d/vₘₐₓ = ${seconds(cruiseEnd)}`}
      </Label>
      <Label
        at={{ x: x.toPx(leg.duration), y: y.toPx(DRONE_ROUTE.vMax) }}
        dx={0}
        dy={-8}
        anchor="end"
      >
        {`T = ${seconds(leg.duration)}`}
      </Label>
    </g>
  );
  return (
    <SvgPlot
      title="Rapidez en el primer tramo, depósito → A"
      xLabel="t"
      xUnit="s"
      yLabel="|v|"
      yUnit="m/s"
      series={[
        {
          id: 'constante',
          label: 'Rapidez constante',
          points: leg.rectangle,
          color: CHART_COLORS[1],
          dashed: true,
        },
        {
          id: 'trapecio',
          label: 'Perfil trapezoidal',
          points: leg.trapezoid,
          color: VELOCITY_COLOR,
        },
      ]}
      xDomain={{ min: 0, max: leg.duration * LEG_X_ROOM }}
      yDomain={{ min: 0, max: DRONE_ROUTE.vMax * PROFILE_HEADROOM }}
      overlay={overlay}
      ariaLabel={`Rapidez en el primer tramo de ${formatNumber(leg.distance, { precision: 1, unit: 'm' })}: el perfil trapezoidal sube hasta 10 m/s en ${seconds(leg.tAccel)}, mantiene el crucero y frena hasta detenerse en T = ${seconds(leg.duration)}; a rapidez constante bastarían ${seconds(cruiseEnd)}.`}
    />
  );
}

/** The static figures of Tema 1's steps 1–3, drawn with the lab plotter. */
export default function DroneFigure({ variant }: DroneFigureProps): JSX.Element {
  switch (variant) {
    case 'ruta':
      return <RouteMap />;
    case 'saltos':
      return <Jumps />;
    case 'perfil':
      return <Profile />;
  }
}
