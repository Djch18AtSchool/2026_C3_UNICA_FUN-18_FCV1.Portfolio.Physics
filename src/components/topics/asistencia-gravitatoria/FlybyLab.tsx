import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { PLANETS } from '../../../lib/data/planets';
import { formatNumber } from '../../../lib/format';
import { deltaVMagnitude, planarFlyby, type PassSide } from '../../../lib/physics';
import Presets from '../../controls/Presets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import { SegmentedField } from '../../lab/SettingsFields';
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
import { clampRp, planetView, type RpWarning } from './flybyScene';
import FlybyScene from './FlybyScene';
import RpField from './RpField';

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

const SIDE_BY_NAME: Record<string, PassSide> = { detrás: 'behind', delante: 'front' };
const SIDE_OPTIONS = [SIDE_NAMES.behind, SIDE_NAMES.front] as const;

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
  /** The model's caveats and the stated time lapse, written in the topic's MDX. */
  footnote?: string;
}

/**
 * Tema 9's laboratory: a planar patched-conic flyby. Left, the planet frame: the hyperbola for
 * (v∞, r_p, GM), the probe moving on it by Kepler's hyperbolic equation and v∞ in and out of
 * equal length; right, the Sun frame: v⃗ = V⃗_p + v⃗∞ before and after. r_p runs from 1 to 100
 * planet radii on a log scale (field, range and the draggable periapsis), the side is behind or in
 * front, and the presets load each Voyager encounter with its Horizons value beside the model's.
 */
export default function FlybyLab({ footnote }: FlybyLabProps): JSX.Element {
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

  const clock = useSimClock(passSeconds, { timeScale: passSeconds / FLYBY_LAPSE });
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
      label: 'Cambio de velocidad |Δv|',
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
  const arrival = `Llegada de la ${encounter.probe} a ${planet.name}: V_p = ${kms(encounter.VpKms)}, v∞ = ${kms(encounter.vInf)} y θ_in = ${formatNumber(encounter.thetaInDeg, { precision: 1, unit: '°' })} entre V_p y v∞,in. Un preajuste las cambia; r_p y el lado son tuyos.`;

  const params = (
    <>
      <RpField rp={rp} unit={unit} radiusKm={planet.radiusKm} onChange={requestRp} />
      <SegmentedField
        id="flyby-side"
        label="Lado de paso"
        value={SIDE_NAMES[side]}
        options={SIDE_OPTIONS}
        onChange={(name) =>
          update((previous) => ({
            settings: { ...previous.settings, side: SIDE_BY_NAME[name] },
            warning: null,
          }))
        }
      />
      <p className="m-0 text-sm text-fg-muted">{arrival}</p>
      <Presets
        presets={FLYBY_PRESETS}
        activeId={presetId}
        onSelect={(preset) =>
          update(() => ({ settings: preset.values, presetId: preset.id, warning: null }))
        }
      />
      <p className="m-0 text-sm text-fg-muted">
        Arrastra el punto de máxima aproximación en el dibujo, o enfócalo y muévelo con las flechas
        (1 % de la escala logarítmica; con Mayús, 10 %); Inicio y Fin lo llevan a 1 y 100 radios.
      </p>
    </>
  );

  return (
    <LabShell
      title="Laboratorio del sobrevuelo (modelo plano)"
      clock={clock}
      readouts={readouts}
      params={params}
      localSettings={flybyLocalSettings({ display, onDisplayChange: setDisplay, clock })}
      onReset={onReset}
      footnote={footnote}
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
        passSeconds={passSeconds}
        playbackSeconds={FLYBY_LAPSE}
        display={display}
        decimals={decimals}
        warning={warning}
        encounter={presetId ? encounter : undefined}
        onRpRequest={requestRp}
      />
    </LabShell>
  );
}
