import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import {
  DRONE_ROUTE,
  routeDuration,
  type RouteDefinition,
  type RouteSample,
} from '../../../lib/data/droneRoute';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import type { Point } from '../../lab/OverlayMarks';
import ParamField from '../../lab/ParamField';
import type { DragPoint } from '../../lab/useDrag';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSimClock } from '../../lab/useSimClock';
import {
  ACCEL_SCALE_FACTOR,
  DEFAULT_DISPLAY,
  droneLocalSettings,
  type DroneDisplay,
} from './droneLabSettings';
import DroneProfiles from './DroneProfiles';
import { isDeclaredRoute, moveStop, sampleAt, tryGenerate } from './routeEdit';
import RouteMapLab from './RouteMapLab';
import type { StopIndex } from './RouteOverlay';

/** The route lasts minutes: playback compresses it 20 times (387 s in about 19 s at 1×). */
export const TIME_LAPSE = 20;
/**
 * Cruising on leg 1, halfway to A: the opening view shows the drone and its v clear of every stop
 * (braking into A, as in v1, put the drone under A's knob at any width).
 */
const INITIAL_TIME_S = 30;
/** Ranges of the main parameters (spec §8.3). */
const V_MAX_RANGE = { min: 1, max: 15, step: 0.5 } as const;
const A_MAX_RANGE = { min: 0.5, max: 5, step: 0.1 } as const;
/** A generation slower than one frame debounces the next parameter change by PARAM_DEBOUNCE_MS. */
const FRAME_BUDGET_MS = 16;
const PARAM_DEBOUNCE_MS = 150;

interface DroneDataset {
  definition: RouteDefinition;
  samples: RouteSample[];
}

/** The last route that could be flown, with its samples. */
interface ValidRoute {
  def: RouteDefinition;
  samples: RouteSample[];
}

type Limits = Pick<RouteDefinition, 'vMax' | 'aMax'>;

const DECLARED_LIMITS: Limits = { vMax: DRONE_ROUTE.vMax, aMax: DRONE_ROUTE.aMax };

type LoadState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; samples: RouteSample[] };

const STATUS_TEXT: Record<Exclude<LoadState['status'], 'ready'>, string> = {
  loading: 'Cargando los datos de la ruta…',
  error: 'No se pudieron cargar los datos de la ruta. Recarga la página para intentarlo de nuevo.',
};
const CHART_COUNT = 4;

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

/** Holds the space of the lab and the charts while the dataset chunk loads. */
function DroneSkeleton({ status }: { status: 'loading' | 'error' }): JSX.Element {
  return (
    <div data-testid="drone-lab-loading" className="flex flex-col gap-4">
      <p role="status" className="m-0 text-sm text-fg-muted">
        {STATUS_TEXT[status]}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <div className="aspect-square rounded-base border border-dashed border-border" />
        {Array.from({ length: CHART_COUNT }, (_, index) => (
          <div
            key={index}
            className="aspect-[1.6] w-full max-w-[720px] rounded-base border border-dashed border-border"
          />
        ))}
      </div>
    </div>
  );
}

interface DroneLabViewProps {
  declared: RouteSample[];
  footnote?: string;
}

function DroneLabView({ declared, footnote }: DroneLabViewProps): JSX.Element {
  const initialRoute: ValidRoute = { def: DRONE_ROUTE, samples: declared };
  const [route, setRoute] = useState<ValidRoute>(initialRoute);
  const [limits, setLimits] = useState<Limits>(DECLARED_LIMITS);
  const [preview, setPreview] = useState<{ index: StopIndex; at: Point } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [display, setDisplay] = useState<DroneDisplay>(DEFAULT_DISPLAY);
  /** How long the last generation took (ms), to decide whether parameter changes debounce. */
  const costRef = useRef(0);
  const { decimals } = useGlobalSettings();

  const duration = useMemo(() => routeDuration(route.def), [route.def]);
  const clock = useSimClock(duration, { timeScale: TIME_LAPSE });
  const { seek, pause } = clock;
  useEffect(() => seek(INITIAL_TIME_S), [seek]);

  /** Adopts the candidate if it can be flown; otherwise keeps the last valid route and says why. */
  const commit = (candidate: RouteDefinition) => {
    if (isDeclaredRoute(candidate)) {
      setRoute({ def: candidate, samples: declared });
      setError(null);
      return;
    }
    const started = performance.now();
    const result = tryGenerate(candidate);
    costRef.current = performance.now() - started;
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRoute({ def: candidate, samples: result.samples });
    setError(null);
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    if (limits.vMax === route.def.vMax && limits.aMax === route.def.aMax) return;
    const delay = costRef.current > FRAME_BUDGET_MS ? PARAM_DEBOUNCE_MS : 0;
    const id = setTimeout(() => commitRef.current({ ...route.def, ...limits }), delay);
    return () => clearTimeout(id);
  }, [limits, route.def]);

  const onStopDrag = (index: StopIndex, at: Point, phase: DragPoint['phase']) => {
    // Any edit, by pointer or by arrow key, pauses playback like a timeline drag.
    pause();
    if (phase !== 'end') {
      setPreview({ index, at });
      return;
    }
    setPreview(null);
    commit(moveStop(route.def, index, at.x, at.y));
  };

  const onReset = () => {
    setRoute(initialRoute);
    setLimits(DECLARED_LIMITS);
    setPreview(null);
    setError(null);
  };

  const shownStops = preview
    ? moveStop(route.def, preview.index, preview.at.x, preview.at.y).stops
    : route.def.stops;
  const now = sampleAt(route.samples, clock.state.t);

  const readouts: LabReadout[] = [
    { id: 'x', label: 'Posición x', value: now.x, unit: 'm' },
    { id: 'y', label: 'Posición y', value: now.y, unit: 'm' },
    { id: 'speed', label: 'Rapidez |v|', value: now.speed, unit: 'm/s' },
    { id: 'accel', label: 'Aceleración |a|', value: now.accel, unit: 'm/s²' },
    { id: 'duration', label: 'Duración de la ruta', value: duration, unit: 's' },
  ];

  const params = (
    <>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <ParamField
          id="drone-vmax"
          label="Rapidez máxima vₘₐₓ"
          unit="m/s"
          {...V_MAX_RANGE}
          value={limits.vMax}
          onChange={(vMax) => setLimits((previous) => ({ ...previous, vMax }))}
        />
        <ParamField
          id="drone-amax"
          label="Aceleración máxima aₘₐₓ"
          unit="m/s²"
          {...A_MAX_RANGE}
          value={limits.aMax}
          onChange={(aMax) => setLimits((previous) => ({ ...previous, aMax }))}
        />
      </div>
      <p className="m-0 text-sm text-fg-muted">
        Arrastra las paradas A, B y C, o enfócalas y muévelas con las flechas (10 m; con Mayús, 100
        m). La ruta se recalcula al soltar.
      </p>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <LabShell
        title="Laboratorio del dron"
        clock={clock}
        readouts={readouts}
        params={params}
        localSettings={droneLocalSettings({ display, onDisplayChange: setDisplay, clock })}
        onReset={onReset}
        footnote={footnote}
        testId="drone-lab"
      >
        <RouteMapLab
          stops={shownStops}
          samples={route.samples}
          now={now}
          duration={duration}
          showVectors={display.showVectors}
          showTrail={display.showTrail}
          velocityScale={display.vectorScale}
          accelScale={display.vectorScale * ACCEL_SCALE_FACTOR}
          decimals={decimals}
          isModified={!isDeclaredRoute(route.def)}
          error={error}
          onStopDrag={onStopDrag}
          onSeek={seek}
        />
      </LabShell>
      <DroneProfiles samples={route.samples} definition={route.def} t={clock.state.t} />
    </div>
  );
}

export interface DroneLabProps {
  /** The model's caveats, written in the topic's MDX so they travel with its text. */
  footnote?: string;
}

/**
 * Tema 1's laboratory on the v2 shell: the route map with draggable stops A, B and C, the drone
 * flown along the route with its v and a vectors, vₘₐₓ and aₘₐₓ as main parameters and, below,
 * the four profile charts with a marker at t. The declared route comes from the committed
 * dataset, loaded lazily; an edited route is generated in the browser when a stop is dropped.
 */
export default function DroneLab({ footnote }: DroneLabProps): JSX.Element {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;
    loadDeclaredSamples().then(
      (samples) => isMounted && setState({ status: 'ready', samples }),
      () => isMounted && setState({ status: 'error' }),
    );
    return () => {
      isMounted = false;
    };
  }, []);

  return state.status === 'ready' ? (
    <DroneLabView declared={state.samples} footnote={footnote} />
  ) : (
    <DroneSkeleton status={state.status} />
  );
}
