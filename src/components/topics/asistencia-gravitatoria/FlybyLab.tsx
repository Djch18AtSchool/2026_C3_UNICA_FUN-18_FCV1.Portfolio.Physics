import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { PLANETS } from '../../../lib/data/planets';
import { formatNumber } from '../../../lib/format';
import { deltaVMagnitude, planarFlyby } from '../../../lib/physics';
import InlineMath from '../../lab/InlineMath';
import ChoiceField from '../../lab/ChoiceField';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import { useSimClock } from '../../lab/useSimClock';
import { DEFAULT_DISPLAY, flybyLocalSettings, type FlybyDisplay } from './flybyLabSettings';
import { flybyHyperbola, stateAt, timeToRadius } from './flybyOrbit';
import {
  DEFAULT_FLYBY_PRESET_ID,
  FLYBY_PRESETS,
  flybyPreset,
  radiusUnit,
  SIDE_NAMES,
  type FlybySettings,
} from './flybyPresets';
import { nominalFactor } from './flybyFormat';
import { clampRp, planetView, type RpWarning } from './flybyScene';
import FlybyNotes from './FlybyNotes';
import FlybyScene from './FlybyScene';
import RpField, { RpWarningNote } from './RpField';
import { usePeriapsis } from './usePeriapsis';

/**
 * Time lapse of the flyby: at 1× every drawn pass plays in this many seconds, whatever the planet
 * and r_p. Real passes last from hours (Neptune) to weeks (Jupiter at 100 R_J), so the clock runs
 * in real seconds scaled by duration/FLYBY_LAPSE, and the canvas states that factor.
 */
export const FLYBY_LAPSE = 12;
/** Any side of a square panel: the drawn reach in km does not depend on it. */
const REFERENCE_SIDE = 1;
const DEG = 180 / Math.PI;
const E_PRECISION = 3;
const ANGLE_PRECISION = 1;

/**
 * «=» between no-break spaces, and each «symbol = value» of the arrival in a no-wrap span: a line
 * may break after a KaTeX box even before a no-break space, so the span is what keeps them together.
 */
const EQUALS = '\u00a0=\u00a0';
const NO_WRAP = 'whitespace-nowrap';

/** «Cómo se usa»: the drag and its keys, then what a preset fixes and what the reader keeps. */
const DRAG_HINT =
  'Arrastra el punto de máxima aproximación en el dibujo, o enfócalo y muévelo con las flechas (1 % de la escala logarítmica; con Mayús, 10 %); Inicio y Fin lo llevan a 1 y 100 radios.';
const ARRIVAL_HINT = String.raw`Un preajuste fija la llegada: $V_p$, $v_\infty$ y $\theta_\text{in}$, el ángulo entre $\vec V_p$ y $\vec v_{\infty,\text{in}}$; $r_p$ y el lado son tuyos.`;
const SIDE_OPTIONS = (['behind', 'front'] as const).map((value) => ({
  value,
  label: SIDE_NAMES[value],
}));

interface FlybyLabState {
  settings: FlybySettings;
  /** The preset whose values are shown untouched; undefined after an edit. */
  presetId?: string;
  warning: RpWarning;
}

const INITIAL_STATE: FlybyLabState = {
  settings: flybyPreset(DEFAULT_FLYBY_PRESET_ID).values,
  presetId: DEFAULT_FLYBY_PRESET_ID,
  warning: null,
};

export interface FlybyLabProps {
  /** «Cómo se usa», after the drag and preset hints: the stated time lapse, from the topic's MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo», written in the topic's MDX. */
  leftOut?: string;
}

/**
 * Tema 9's laboratory: a planar patched-conic flyby. Left, the planet frame: the hyperbola for
 * (v∞, r_p, GM), the probe moving on it by Kepler's hyperbolic equation and v∞ in and out of
 * equal length; right, the Sun frame: v⃗ = V⃗_p + v⃗∞ before and after. r_p runs from 1 to 100
 * planet radii on a log scale (field, range and the draggable periapsis), the side is behind or in
 * front, and the presets load each Voyager encounter with its Horizons value beside the model's.
 */
export default function FlybyLab({ usage, leftOut }: FlybyLabProps): JSX.Element {
  const [state, setState] = useState<FlybyLabState>(INITIAL_STATE);
  const [display, setDisplay] = useState<FlybyDisplay>(DEFAULT_DISPLAY);
  const { decimals } = useGlobalSettings();
  const { settings, presetId, warning } = state;
  const { encounter, rp, side } = settings;
  const planet = PLANETS[encounter.planet];
  const unit = radiusUnit(encounter);
  const thetaIn = encounter.thetaInDeg / DEG;
  const rpKm = rp * planet.radiusKm;

  const hyperbola = useMemo(
    () => flybyHyperbola({ vInf: encounter.vInf, rp: rpKm, GM: planet.gm, thetaIn, side }),
    [encounter.vInf, rpKm, planet.gm, thetaIn, side],
  );
  const result = useMemo(
    () => planarFlyby(encounter.VpKms, encounter.vInf, thetaIn, rpKm, planet.gm, side),
    [encounter.VpKms, encounter.vInf, thetaIn, rpKm, planet.gm, side],
  );
  const passSeconds = useMemo(() => {
    const { reachKm } = planetView(REFERENCE_SIDE, rpKm, planet.radiusKm);
    return 2 * timeToRadius(hyperbola, reachKm);
  }, [hyperbola, rpKm, planet.radiusKm]);

  const clock = useSimClock(passSeconds, { timeScale: nominalFactor(passSeconds, FLYBY_LAPSE) });
  const { seek } = clock;
  // The clock's own duration lags a render behind an edit, so the share of the pass stays put.
  const clockDuration = clock.state.duration;
  const progress = clockDuration > 0 ? clock.state.t / clockDuration : 0;
  const tau = (2 * progress - 1) * (passSeconds / 2);
  const probe = stateAt(hyperbola, tau);
  /** The probe at any clock time, for the planet frame's moving layer. */
  const probeAt = useCallback(
    (t: number) => {
      const share = clockDuration > 0 ? t / clockDuration : 0;
      const liveTau = (2 * share - 1) * (passSeconds / 2);
      return { tau: liveTau, probe: stateAt(hyperbola, liveTau) };
    },
    [clockDuration, passSeconds, hyperbola],
  );
  const live = useMemo(() => ({ frame: clock.frame, probeAt }), [clock.frame, probeAt]);
  /** Where in the pass (0..1) an edit found the probe, so the new pass resumes there. */
  const progressRef = useRef(0);
  useEffect(() => {
    seek(progressRef.current * passSeconds);
  }, [passSeconds, seek]);

  /** Every edit, by field, range, handle, key, side or preset, pauses playback. */
  const update = (next: (previous: FlybyLabState) => FlybyLabState) => {
    progressRef.current = progress;
    clock.pause();
    setState(next);
  };

  const requestRp = (requested: number) => {
    const clamped = clampRp(requested);
    update((previous) => ({
      settings: { ...previous.settings, rp: clamped.rp },
      warning: clamped.warning,
    }));
  };

  const onReset = () => {
    progressRef.current = 0;
    clock.reset();
    setState(INITIAL_STATE);
    setDisplay(DEFAULT_DISPLAY);
  };

  const readouts: LabReadout[] = [
    { id: 'e', label: 'Excentricidad e', value: hyperbola.e, unit: '', precision: E_PRECISION },
    {
      id: 'delta',
      label: 'Ángulo de giro δ',
      value: hyperbola.delta * DEG,
      unit: '°',
      precision: ANGLE_PRECISION,
    },
    {
      id: 'dv',
      label: String.raw`Cambio de velocidad $|\Delta \vec v|$`,
      value: deltaVMagnitude(encounter.vInf, hyperbola.delta),
      unit: 'km/s',
    },
    { id: 'vIn', label: '|v| antes, marco del Sol', value: result.vIn, unit: 'km/s' },
    { id: 'vOut', label: '|v| después, marco del Sol', value: result.vOut, unit: 'km/s' },
    {
      id: 'gain',
      label: 'Ganancia de rapidez Δ|v|',
      value: result.vOut - result.vIn,
      unit: 'km/s',
    },
  ];

  const kms = (value: number) => formatNumber(value, { precision: decimals, unit: 'km/s' });
  const periapsis = usePeriapsis({
    clockDuration,
    hyperbola,
    rp,
    planetName: planet.name,
    formatSpeed: kms,
  });
  // Keyed by quantity, not by text: a new preset changes the values in place, not the nodes.
  const arrival = [
    { key: 'Vp', text: `$V_p$${EQUALS}${kms(encounter.VpKms)}` },
    { key: 'vInf', text: `$v_\\infty$${EQUALS}${kms(encounter.vInf)}` },
    {
      key: 'thetaIn',
      text: `$\\theta_\\text{in}$${EQUALS}${formatNumber(encounter.thetaInDeg, { precision: 1, unit: '°' })}`,
    },
  ];

  const params = (
    <>
      <RpField rp={rp} unit={unit} radiusKm={planet.radiusKm} onChange={requestRp} />
      <RpWarningNote warning={warning} unit={unit} />
      <ChoiceField
        id="flyby-side"
        label="Lado de paso"
        value={side}
        options={SIDE_OPTIONS}
        onChange={(next) =>
          update((previous) => ({
            settings: { ...previous.settings, side: next },
            warning: null,
          }))
        }
      />
    </>
  );

  const scenario = (
    <>
      <LabPresets
        id="flyby-preset"
        presets={FLYBY_PRESETS}
        activeId={presetId}
        onSelect={(preset) =>
          update(() => ({ settings: preset.values, presetId: preset.id, warning: null }))
        }
      />
      <p data-testid="flyby-arrival" className="m-0 text-sm text-fg-muted">
        {'Llegada: '}
        {arrival.map(({ key, text }, index) => (
          <Fragment key={key}>
            {index > 0 ? ' ' : null}
            <span className={NO_WRAP}>
              <InlineMath text={text} />
              {index < arrival.length - 1 ? ',' : '.'}
            </span>
          </Fragment>
        ))}
      </p>
    </>
  );

  return (
    <LabShell
      title="Laboratorio del sobrevuelo (modelo plano)"
      clock={clock}
      markers={periapsis.markers}
      readouts={readouts}
      canvasNotes={
        <FlybyNotes
          planet={planet}
          result={result}
          passSeconds={passSeconds}
          playbackSeconds={FLYBY_LAPSE}
          encounter={presetId ? encounter : undefined}
          decimals={decimals}
        />
      }
      levels={{
        params,
        scenario,
        display: flybyLocalSettings({ display, onDisplayChange: setDisplay, clock }),
      }}
      notes={{
        usage: [DRAG_HINT, ARRIVAL_HINT, ...(usage ? [usage] : [])],
        leftOut: leftOut ? [leftOut] : [],
      }}
      onReset={onReset}
      testId="flyby-lab"
    >
      <FlybyScene
        hyperbola={hyperbola}
        planet={planet}
        Vp={encounter.VpKms}
        result={result}
        rp={rp}
        unit={unit}
        tau={tau}
        probe={probe}
        live={live}
        display={display}
        decimals={decimals}
        clock={clock}
        periapsis={periapsis.jump}
        onRpRequest={requestRp}
      />
    </LabShell>
  );
}
