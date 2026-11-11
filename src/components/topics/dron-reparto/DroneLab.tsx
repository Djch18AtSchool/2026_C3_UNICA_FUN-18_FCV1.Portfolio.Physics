import { useEffect, useMemo, useState, type JSX } from 'react';
import {
  routeDuration,
  type RouteDefinition,
  type RouteSample,
} from '../../../lib/data/droneRoute';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import { readTexSeed } from '../../lab/TexSeed';
import type { Point } from '../../lab/OverlayMarks';
import ParamField from '../../lab/ParamField';
import type { DragPoint } from '../../lab/useDrag';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import TimeScaleBadge from '../../lab/TimeScaleBadge';
import {
  ACCEL_SCALE_FACTOR,
  DEFAULT_DISPLAY,
  droneLocalSettings,
  type DroneDisplay,
} from './droneLabSettings';
import DroneProfiles from './DroneProfiles';
import DroneSkeleton from './DroneSkeleton';
import { isDeclaredRoute } from './routeEdit';
import RouteMapLab from './RouteMapLab';
import RouteMapNotes from './RouteMapNotes';
import type { StopIndex } from './RouteOverlay';
import RouteViewFields from './RouteViewFields';
import { useEditableRoute, type Limits } from './useEditableRoute';
import { useRouteView, useViewFlight } from './useRouteView';

/** Ranges of the main parameters (spec §8.3). */
const V_MAX_RANGE = { min: 1, max: 15, step: 0.5 } as const;
const A_MAX_RANGE = { min: 0.5, max: 5, step: 0.1 } as const;
interface DroneDataset {
  definition: RouteDefinition;
  samples: RouteSample[];
}

type LoadState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; samples: RouteSample[] };

/** «Cómo se usa»: the drag of the stops and its keys, before the MDX's text. */
const DRAG_HINT =
  'Arrastra las paradas A, B y C, o enfócalas y muévelas con las flechas (10 m; con Mayús, 100 m). La ruta se recalcula al soltar.';

/**
 * The committed dataset (scripts/generate-drone-route.ts; 355 KB of JSON, about 43 KB gzipped)
 * is not part of the island's bundle: Vite splits this import into its own chunk, fetched after
 * hydration. The assignment keeps its shape checked at compile time.
 */
async function loadDeclaredSamples(): Promise<RouteSample[]> {
  const { default: dataset } = await import('../../../data/drone-route.json');
  const typed: DroneDataset = dataset;
  return typed.samples;
}

/** The lab's six readouts: the drone's state, the route time it is at and how long the route lasts. */
function droneReadouts(now: RouteSample, routeTime: number, duration: number): LabReadout[] {
  return [
    { id: 'x', label: 'Posición x', value: now.x, unit: 'm' },
    { id: 'y', label: 'Posición y', value: now.y, unit: 'm' },
    { id: 'speed', label: 'Rapidez |v|', value: now.speed, unit: 'm/s' },
    { id: 'accel', label: 'Aceleración |a|', value: now.accel, unit: 'm/s²' },
    { id: 'route-time', label: 'Instante en la ruta', value: routeTime, unit: 's' },
    { id: 'duration', label: 'Duración de la ruta', value: duration, unit: 's' },
  ];
}

/** Level 1: the two limits of the flight. */
function DroneParams({
  limits,
  onChange,
}: {
  limits: Limits;
  onChange(update: (previous: Limits) => Limits): void;
}): JSX.Element {
  return (
    <>
      <ParamField
        id="drone-vmax"
        label="Rapidez máxima $v_\text{máx}$"
        unit="m/s"
        {...V_MAX_RANGE}
        value={limits.vMax}
        onChange={(vMax) => onChange((previous) => ({ ...previous, vMax }))}
      />
      <ParamField
        id="drone-amax"
        label="Aceleración máxima $a_\text{máx}$"
        unit="m/s²"
        {...A_MAX_RANGE}
        value={limits.aMax}
        onChange={(aMax) => onChange((previous) => ({ ...previous, aMax }))}
      />
    </>
  );
}

type DroneLabViewProps = DroneLabProps & { declared: RouteSample[] };

function DroneLabView({ declared, usage, leftOut }: DroneLabViewProps): JSX.Element {
  const editing = useEditableRoute(declared);
  const { route, limits, error, shownStops } = editing;
  const [display, setDisplay] = useState<DroneDisplay>(DEFAULT_DISPLAY);
  const { decimals } = useGlobalSettings();

  const duration = useMemo(() => routeDuration(route.def), [route.def]);
  /** The clock plays one view of the route: a leg at real speed, or the whole route faster. */
  const routeView = useRouteView(route.def);
  const { clock, span, routeTime } = routeView;
  const { pause } = clock;

  const onStopDrag = (index: StopIndex, at: Point, phase: DragPoint['phase']) => {
    // Any edit, by pointer or by arrow key, pauses playback like a timeline drag.
    pause();
    editing.dragStop(index, at, phase === 'end');
  };
  const onReset = () => {
    editing.reset();
    routeView.reset();
  };

  const { now, live, timeRange, seekRoute } = useViewFlight(route.samples, routeView);

  return (
    <div className="flex flex-col gap-4">
      <LabShell
        title="Laboratorio del dron"
        clock={clock}
        timeUnit="s"
        markers={span.markers}
        readouts={droneReadouts(now, routeTime, duration)}
        canvasNotes={
          <RouteMapNotes
            now={now}
            showVectors={display.showVectors}
            velocityScale={display.vectorScale}
            accelScale={display.vectorScale * ACCEL_SCALE_FACTOR}
            isModified={!isDeclaredRoute(route.def)}
            error={error}
          />
        }
        levels={{
          params: <DroneParams limits={limits} onChange={editing.setLimits} />,
          scenario: (
            <RouteViewFields
              selection={routeView.selection}
              schedule={routeView.schedule}
              onView={routeView.setView}
              onLeg={routeView.setLeg}
            />
          ),
          display: droneLocalSettings({ display, onDisplayChange: setDisplay, clock }),
        }}
        notes={{ usage: [DRAG_HINT, ...(usage ? [usage] : [])], leftOut: leftOut ? [leftOut] : [] }}
        onReset={onReset}
        testId="drone-lab"
      >
        <div className="relative">
          <RouteMapLab
            stops={shownStops}
            samples={route.samples}
            now={now}
            live={live}
            timeRange={timeRange}
            showVectors={display.showVectors}
            showTrail={display.showTrail}
            velocityScale={display.vectorScale}
            accelScale={display.vectorScale * ACCEL_SCALE_FACTOR}
            decimals={decimals}
            onStopDrag={onStopDrag}
            onSeek={seekRoute}
          />
          <TimeScaleBadge clock={clock} />
        </div>
      </LabShell>
      <DroneProfiles samples={route.samples} definition={route.def} t={routeTime} />
    </div>
  );
}

export interface DroneLabProps {
  /** «Cómo se usa», after the drag hint: how the playback and an edited route work, from the MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo» and the notes on the data, written in the topic's MDX. */
  leftOut?: string;
}

/**
 * Tema 1's laboratory on LabShell: the route map with draggable stops A, B and C, the drone
 * flown along the route with its v and a vectors, vₘₐₓ and aₘₐₓ as main parameters and, below,
 * the four profile charts with a marker at t. The declared route comes from the committed
 * dataset, loaded lazily; an edited route is generated in the browser when a stop is dropped.
 */
export default function DroneLab({ usage, leftOut }: DroneLabProps): JSX.Element {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;
    loadDeclaredSamples().then(
      (samples) => {
        if (!isMounted) return;
        readTexSeed();
        setState({ status: 'ready', samples });
      },
      () => isMounted && setState({ status: 'error' }),
    );
    return () => {
      isMounted = false;
    };
  }, []);

  return state.status === 'ready' ? (
    <DroneLabView declared={state.samples} usage={usage} leftOut={leftOut} />
  ) : (
    <DroneSkeleton status={state.status} usage={usage} leftOut={leftOut} />
  );
}
