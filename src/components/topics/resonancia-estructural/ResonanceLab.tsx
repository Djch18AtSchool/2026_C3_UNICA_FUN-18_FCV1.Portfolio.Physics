import { useState, type JSX, type KeyboardEvent } from 'react';
import ChoiceField from '../../lab/ChoiceField';
import LabPresets from '../../lab/LabPresets';
import LabShell from '../../lab/LabShell';
import TimeScaleBadge from '../../lab/TimeScaleBadge';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import BridgeScene from './BridgeScene';
import {
  ResonanceNotes,
  ResonanceParams,
  StepChoiceRow,
  type ResonanceEdits,
} from './ResonanceControls';
import {
  DEFAULT_DISPLAY,
  MODE_OPTIONS,
  RESONANCE_SPEEDS,
  resonanceLocalSettings,
  type ResonanceDisplay,
} from './resonanceLabSettings';
import ResonancePlot from './ResonancePlot';
import {
  DEFAULT_SETTINGS,
  PRESET_GROUPS,
  presetIdFor,
  RESONANCE_LIMITS,
  RESONANCE_PRESETS,
  type ResonancePreset,
  type ResonanceSettings,
} from './resonancePresets';
import { resonanceReadouts } from './resonanceReadouts';
import type { ResonanceMode } from './resonanceScene';
import { useResonanceRun } from './useResonanceRun';

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

/** Keys that keep their native meaning: fields, buttons and anything inside the drawer. */
const NATIVE_KEYS_SELECTOR = 'input, select, textarea, button, a, dialog';
/** One step of «,» and «.»: a frame of 1/60 s of playback. */
const FRAMES_PER_SECOND = 60;

const LIMITS_OF: Readonly<Record<ResonanceMode, keyof typeof RESONANCE_LIMITS>> = {
  barrido: 'sweep',
  tropa: 'troop',
  'filtro-zv': 'zv',
};

/** The mode in view's f0, which the ruler's knob moves. */
function f0Of(settings: ResonanceSettings): number {
  return settings[LIMITS_OF[settings.mode]].f0;
}

export interface ResonanceLabProps {
  /** «Cómo se usa», after the lab's own hints: from the topic's MDX. */
  usage?: string;
  /** «Qué deja fuera el modelo», from the topic's MDX. */
  leftOut?: string;
}

/**
 * Tema 12's laboratory, complementary to the Tacoma film: one forced oscillator in three modes.
 * «Barrido» sweeps the drive across [0,5 f0; 1,5 f0] and traces the envelope over (12.3);
 * «Tropa» puts N soldiers at the march pace on a footbridge, in step or breaking step (12.5);
 * «Filtro ZV» sets one push against Klipper's two impulses (12.6). Any change rewinds the clock:
 * a new run.
 */
export default function ResonanceLab({ usage, leftOut }: ResonanceLabProps): JSX.Element {
  const [settings, setSettings] = useState<ResonanceSettings>(DEFAULT_SETTINGS);
  const [display, setDisplay] = useState<ResonanceDisplay>(DEFAULT_DISPLAY);
  const { active, clock } = useResonanceRun(settings);
  const { decimals } = useGlobalSettings();
  const t = clock.state.t;

  const edit: ResonanceEdits = {
    sweep: (patch) => setSettings((prev) => ({ ...prev, sweep: { ...prev.sweep, ...patch } })),
    troop: (patch) => setSettings((prev) => ({ ...prev, troop: { ...prev.troop, ...patch } })),
    zv: (patch) => setSettings((prev) => ({ ...prev, zv: { ...prev.zv, ...patch } })),
  };
  const setF0 = (f0: number) => edit[LIMITS_OF[settings.mode]]({ f0 });
  /** A preset sets its mode and that mode's values; the other modes keep theirs. */
  const choosePreset = ({ values }: ResonancePreset) => {
    const key = LIMITS_OF[values.mode];
    setSettings((prev) => ({ ...prev, mode: values.mode, [key]: values[key] }));
  };
  const onReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setDisplay(DEFAULT_DISPLAY);
    clock.reset();
  };

  const onShortcut = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.target as Element).closest(NATIVE_KEYS_SELECTOR)) return;
    const frame = active.timeScale / FRAMES_PER_SECOND;
    const actions: Record<string, () => void> = {
      ' ': clock.toggle,
      k: clock.toggle,
      r: clock.reset,
      '.': () => clock.step(frame),
      ',': () => clock.step(-frame),
    };
    const action = actions[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const scenario = (
    <>
      <ChoiceField
        id="resonance-mode"
        label="Modo"
        value={settings.mode}
        options={MODE_OPTIONS}
        onChange={(mode: ResonanceMode) => setSettings((prev) => ({ ...prev, mode }))}
      />
      {settings.mode === 'tropa' ? (
        <StepChoiceRow
          step={settings.troop.step}
          onStep={(step) => edit.troop({ step })}
          onNewDraw={() => edit.troop({ seed: settings.troop.seed + 1 })}
        />
      ) : null}
      <LabPresets
        id="resonance-preset"
        presets={RESONANCE_PRESETS}
        groups={PRESET_GROUPS}
        activeId={presetIdFor(settings)}
        onSelect={choosePreset}
      />
    </>
  );

  return (
    <div className="flex flex-col gap-4" onKeyDown={onShortcut}>
      <LabShell
        title="Laboratorio de la resonancia"
        testId="resonance-lab"
        clock={clock}
        speeds={RESONANCE_SPEEDS}
        timeUnit="s"
        markers={active.markers}
        readouts={resonanceReadouts(active, t)}
        levels={{
          params: <ResonanceParams settings={settings} edit={edit} />,
          scenario,
          display: resonanceLocalSettings({ display, onDisplayChange: setDisplay, clock }),
        }}
        charts={
          display.showPlot ? (
            <ResonancePlot
              active={active}
              t={t}
              frame={clock.frame}
              decimals={decimals}
              onSeek={clock.seek}
            />
          ) : undefined
        }
        canvasNotes={<ResonanceNotes active={active} />}
        notes={{
          usage: [KNOB_HINT, SHORTCUTS_HINT, MODE_HINT[settings.mode], ...(usage ? [usage] : [])],
          leftOut: leftOut ? [leftOut] : [],
        }}
        onReset={onReset}
      >
        <div className="relative">
          <BridgeScene
            active={active}
            frame={clock.frame}
            t={t}
            showEnvelope={display.showEnvelope}
            f0={f0Of(settings)}
            f0Limits={RESONANCE_LIMITS[LIMITS_OF[settings.mode]].f0}
            decimals={decimals}
            onF0Change={setF0}
          />
          <TimeScaleBadge clock={clock} />
        </div>
      </LabShell>
    </div>
  );
}
