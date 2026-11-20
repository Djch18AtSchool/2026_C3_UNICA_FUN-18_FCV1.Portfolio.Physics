import { useEffect, useMemo, useState, type JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import type { SettingOption } from '../../lab/SettingsDrawer';
import { SwitchField } from '../../lab/SettingsFields';
import SpectrumBars from './SpectrumBars';
import {
  audibleCount,
  HARMONIC_COUNT,
  INITIAL_SYNTH_STATE,
  presetIdFor,
  setAmplitude,
  setCursor,
  setF1,
  setRandomPhases,
  setSampleRate,
  soundingRecipeFor,
  SYNTH_PRESETS,
  synthReadings,
  synthSpectrum,
  synthWaveform,
  waveformAt,
  withPreset,
  type SynthReadings,
  type SynthRecipe,
  type SynthState,
} from './synthScene';
import SynthParams from './SynthParams';
import SynthStage from './SynthStage';
import {
  randomPhasesNote,
  spectrumDescription,
  statusText,
  USAGE,
  waveformDescription,
} from './synthTexts';
import { useAdditiveVoice, type AdditiveVoice } from './useAdditiveVoice';

function labReadouts(readings: SynthReadings): LabReadout[] {
  return [
    { id: 'f1', label: 'Fundamental $f_1$', value: readings.f1, unit: 'Hz', precision: 1 },
    {
      id: 'period',
      label: 'Periodo $T = 1/f_1$',
      value: readings.periodMs,
      unit: 'ms',
      precision: 2,
    },
    {
      id: 'odd-even',
      label: 'Impares sobre pares, $n \\le 10$',
      value: readings.oddEvenDb,
      unit: 'dB',
      precision: 1,
    },
    {
      id: 'strongest',
      label: 'Armónico más fuerte, $n$',
      value: readings.strongest,
      unit: '',
      precision: 0,
    },
  ];
}

/** Level 3: the drawer can take the dashed −y(t + T/2) (and its point) off the waveform. */
function displayOptions(
  showShifted: boolean,
  onChange: (isShown: boolean) => void,
): SettingOption[] {
  return [
    {
      key: 'shifted',
      kind: 'toggle',
      label: 'Curva $-y(t + T/2)$ sobre la forma de onda',
      value: showShifted,
      onChange,
    },
  ];
}

/**
 * What sounds, recomputed only when the recipe, the phases or the number of harmonics under f_s/2
 * change: a new f₁ keeps the same arrays, so the voice glides instead of swapping its wave.
 */
function useSounding(state: SynthState): SynthRecipe {
  const { amplitudes, phases, randomPhases, phaseDraw } = state;
  const count = audibleCount(state.f1, state.sampleRate);
  return useMemo(
    () => soundingRecipeFor({ amplitudes, phases, randomPhases, phaseDraw }, count),
    [amplitudes, phases, randomPhases, phaseDraw, count],
  );
}

/** The voice follows the state; nothing reaches Web Audio before «Reproducir». */
function useVoiceSync(voice: AdditiveVoice, sounding: SynthRecipe, state: SynthState): void {
  const { setRecipe, setFrequency, setSampleRate: setRate } = voice;
  useEffect(() => setRecipe(sounding.amplitudes, sounding.phases), [setRecipe, sounding]);
  useEffect(() => setFrequency(state.f1), [setFrequency, state.f1]);
  useEffect(() => setRate(state.sampleRate), [setRate, state.sampleRate]);
}

export interface SynthLabProps {
  /** «Qué deja fuera el modelo», written in the topic's MDX so it travels with its text. */
  leftOut?: string;
}

/**
 * Tema 11's laboratory on LabShell, with no clock: an additive synthesiser on the Web Audio API.
 * Ten amplitudes, f₁ and f_s are the parameters; the presets (the four classic recipes and the
 * two measured ones) and «Fases aleatorias» the scenario; the canvas is «Reproducir» and the
 * waveform that sounds, with a cursor on t; the spectrum is the support plot. The drawer hides
 * −y(t + T/2). Sound starts only on a press (useAdditiveVoice).
 */
export default function SynthLab({ leftOut }: SynthLabProps): JSX.Element {
  const [state, setState] = useState<SynthState>(INITIAL_SYNTH_STATE);
  const [showShifted, setShowShifted] = useState(true);
  const voice = useAdditiveVoice();
  const sounding = useSounding(state);
  useVoiceSync(voice, sounding, state);
  const readings = synthReadings(state);
  const audible = audibleCount(state.f1, state.sampleRate);
  const waveform = useMemo(() => synthWaveform(sounding, state.f1), [sounding, state.f1]);

  const params = (
    <SynthParams
      state={state}
      audible={audible}
      onAmplitude={(n, value) => setState((previous) => setAmplitude(previous, n, value))}
      onF1={(f1) => setState((previous) => setF1(previous, f1))}
      onSampleRate={(value) => {
        // Inside the change event: a playing voice reopens its context within the gesture.
        voice.setSampleRate(Number(value));
        setState((previous) => setSampleRate(previous, Number(value)));
      }}
    />
  );

  // Inline, so the shell sees LabPresets on top and closes its row with «Restablecer».
  const scenario = (
    <>
      <LabPresets
        id="synth-preset"
        presets={SYNTH_PRESETS}
        activeId={presetIdFor(state)}
        onSelect={({ values }) => setState((previous) => withPreset(previous, values))}
      />
      <SwitchField
        id="synth-random-phases"
        label="Fases aleatorias"
        checked={state.randomPhases}
        onChange={(isOn) => setState((previous) => setRandomPhases(previous, isOn))}
      />
      <p data-testid="synth-random-note" className="m-0 text-sm text-fg-muted">
        <InlineMath text={randomPhasesNote(state.randomPhases)} />
      </p>
    </>
  );

  return (
    <LabShell
      title="Laboratorio de síntesis aditiva"
      testId="synth-lab"
      readouts={labReadouts(readings)}
      levels={{ params, scenario, display: displayOptions(showShifted, setShowShifted) }}
      notes={{ usage: [...USAGE], leftOut: leftOut ? [leftOut] : [] }}
      onReset={() => setState(INITIAL_SYNTH_STATE)}
      charts={
        <SpectrumBars
          bars={synthSpectrum(sounding.amplitudes)}
          harmonics={HARMONIC_COUNT}
          title="Contenido armónico de la receta"
          yTitle="Nivel de $A_n$ (dB)"
          ariaLabel={spectrumDescription(readings, audible)}
          oddEvenDb={readings.oddEvenDb}
          testId="synth-spectrum"
        />
      }
    >
      <SynthStage
        isPlaying={voice.isPlaying}
        status={statusText(
          voice.isPlaying,
          sounding.amplitudes.every((a) => a === 0),
          voice.error,
        )}
        onToggle={() => (voice.isPlaying ? voice.stop() : void voice.start())}
        onStop={voice.stop}
        waveform={waveform}
        waveformLabel={waveformDescription(readings, state.randomPhases)}
        showShifted={showShifted}
        cursorMs={state.cursorMs}
        at={waveformAt(sounding, state.f1, state.cursorMs)}
        onCursor={(tMs) => setState((previous) => setCursor(previous, tMs))}
      />
    </LabShell>
  );
}
