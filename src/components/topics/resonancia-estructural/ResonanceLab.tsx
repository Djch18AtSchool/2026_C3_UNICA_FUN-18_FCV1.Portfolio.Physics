import { useState, type JSX } from 'react';
import ChoiceField from '../../lab/ChoiceField';
import LabPresets from '../../lab/LabPresets';
import LabShell from '../../lab/LabShell';
import TimeScaleBadge from '../../lab/TimeScaleBadge';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import type { SimClock } from '../../lab/useSimClock';
import type { ActiveModel } from './bridgeFrames';
import BridgeScene from './BridgeScene';
import { ResonanceNotes, ResonanceParams, StepChoiceRow } from './ResonanceControls';
import {
  DEFAULT_DISPLAY,
  MODE_OPTIONS,
  RESONANCE_SPEEDS,
  resonanceLocalSettings,
  type ResonanceDisplay,
} from './resonanceLabSettings';
import ResonancePlot from './ResonancePlot';
import { PRESET_GROUPS, presetIdFor, RESONANCE_PRESETS } from './resonancePresets';
import { resonanceReadouts } from './resonanceReadouts';
import type { ResonanceMode } from './resonanceScene';
import { useResonanceRun } from './useResonanceRun';
import {
  shortcutHandler,
  useResonanceSettings,
  type ResonanceSettingsState,
} from './useResonanceSettings';

/** «Cómo se usa»: the knob, the keys, then what the mode in view does. */
const KNOB_HINT =
  'Arrastra la perilla $f_0$ de la regla de frecuencias, bajo el puente, o enfócala y muévela con las flechas (un paso; con Mayús, cinco); Inicio y Fin la llevan a los extremos.';
const SHORTCUTS_HINT =
  'Atajos, fuera de los campos: Espacio o K reproduce y pausa; R reinicia; «,» y «.» retroceden o avanzan un cuadro.';
const MODE_HINT: Readonly<Record<ResonanceMode, string>> = {
  barrido:
    'En «Barrido», la frecuencia de la fuerza sube en línea recta de $0{,}5\\,f_0$ a $1{,}5\\,f_0$ a lo largo de la corrida, como en el barrido de Klipper, y la gráfica traza la envolvente sobre la (12.3). Con $T_b \\ge 4/(\\zeta^2 f_0)$ (cálculo propio) el barrido es lento y la envolvente queda a menos de un 5 % de la curva; más rápido, se queda corta y llega tarde.',
  tropa:
    'En «Tropa», $N$ soldados marchan a 2,0 Hz con 280 N cada uno. «Al paso» suma sus fuerzas en fase; «Rompiendo el paso», con fases al azar, y «Nuevo sorteo» sortea otras. La masa modal de la pasarela, 40 toneladas, es ilustrativa.',
  'filtro-zv':
    'En «Filtro ZV», arriba la estructura recibe un empujón; abajo, el mismo empujón partido en los dos impulsos de Klipper para $f_\\text{ZV}$, con el $\\zeta$ = 0,1 que Klipper supone. Saca $f_0$ de la banda de ±5 % o cambia $\\zeta$, y la vibración vuelve.',
};

export interface ResonanceLabProps {
  /** «Cómo se usa», after the lab's own hints: from the topic's MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo», from the topic's MDX. */
  leftOut?: string;
}

/**
 * Level 2: the mode, the troop's step with «Nuevo sorteo», and the presets. A fragment, so the
 * shell finds LabPresets at the scenario's top and gives it «Restablecer» (labReset.tsx).
 */
function resonanceScenario(state: ResonanceSettingsState): JSX.Element {
  const { settings } = state;
  return (
    <>
      <ChoiceField
        id="resonance-mode"
        label="Modo"
        value={settings.mode}
        options={MODE_OPTIONS}
        onChange={state.setMode}
      />
      {settings.mode === 'tropa' ? (
        <StepChoiceRow
          step={settings.troop.step}
          onStep={(step) => state.edit.troop({ step })}
          onNewDraw={state.newDraw}
        />
      ) : null}
      <LabPresets
        id="resonance-preset"
        presets={RESONANCE_PRESETS}
        groups={PRESET_GROUPS}
        activeId={presetIdFor(settings)}
        onSelect={state.choosePreset}
      />
    </>
  );
}

/** The canvas: the bridge and, in its corner, the time scale it plays at. */
function Stage({
  active,
  clock,
  state,
  display,
  decimals,
}: {
  active: ActiveModel;
  clock: SimClock;
  state: ResonanceSettingsState;
  display: ResonanceDisplay;
  decimals: number;
}): JSX.Element {
  return (
    <div className="relative">
      <BridgeScene
        active={active}
        frame={clock.frame}
        t={clock.state.t}
        showEnvelope={display.showEnvelope}
        f0={state.f0}
        f0Limits={state.f0Limits}
        decimals={decimals}
        onF0Change={state.setF0}
      />
      <TimeScaleBadge clock={clock} />
    </div>
  );
}

/**
 * Tema 12's laboratory, complementary to the Tacoma film: one forced oscillator in three modes.
 * «Barrido» sweeps the drive across [0,5 f0; 1,5 f0] and traces the envelope over (12.3);
 * «Tropa» puts N soldiers at the march pace on a footbridge, in step or breaking step (12.5);
 * «Filtro ZV» sets one push against Klipper's two impulses (12.6). Any change rewinds the clock:
 * a new run.
 */
export default function ResonanceLab({ usage, leftOut }: ResonanceLabProps): JSX.Element {
  const state = useResonanceSettings();
  const { settings } = state;
  const [display, setDisplay] = useState<ResonanceDisplay>(DEFAULT_DISPLAY);
  const { active, clock } = useResonanceRun(settings);
  const { decimals } = useGlobalSettings();
  const t = clock.state.t;
  const onReset = () => {
    state.reset();
    setDisplay(DEFAULT_DISPLAY);
    clock.reset();
  };
  const plot = (
    <ResonancePlot
      active={active}
      t={t}
      frame={clock.frame}
      decimals={decimals}
      onSeek={clock.seek}
    />
  );

  return (
    <div className="flex flex-col gap-4" onKeyDown={shortcutHandler(clock, active.timeScale)}>
      <LabShell
        title="Laboratorio de la resonancia"
        testId="resonance-lab"
        clock={clock}
        speeds={RESONANCE_SPEEDS}
        timeUnit="s"
        markers={active.markers}
        readouts={resonanceReadouts(active, t)}
        levels={{
          params: <ResonanceParams settings={settings} edit={state.edit} />,
          scenario: resonanceScenario(state),
          display: resonanceLocalSettings({ display, onDisplayChange: setDisplay, clock }),
        }}
        charts={display.showPlot ? plot : undefined}
        canvasNotes={<ResonanceNotes active={active} />}
        notes={{
          usage: [KNOB_HINT, SHORTCUTS_HINT, MODE_HINT[settings.mode], ...(usage ? [usage] : [])],
          leftOut: leftOut ? [leftOut] : [],
        }}
        onReset={onReset}
      >
        <Stage active={active} clock={clock} state={state} display={display} decimals={decimals} />
      </LabShell>
    </div>
  );
}
