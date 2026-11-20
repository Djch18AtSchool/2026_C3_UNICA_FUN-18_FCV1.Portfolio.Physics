import { useEffect, useMemo, useState, type JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import type { SettingOption } from '../../lab/SettingsDrawer';
import { SelectField, SwitchField } from '../../lab/SettingsFields';
import { formatNumber } from '../../../lib/format';
import SpectrumBars from './SpectrumBars';
import {
  AMPLITUDE_RANGE,
  audibleCount,
  F1_RANGE,
  HARMONIC_COUNT,
  INITIAL_SYNTH_STATE,
  presetIdFor,
  SAMPLE_RATES,
  setAmplitude,
  setCursor,
  setF1,
  setRandomPhases,
  setSampleRate,
  soundingRecipe,
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
import SynthStage from './SynthStage';
import {
  amplitudeLabel,
  nyquistNote,
  randomPhasesNote,
  spectrumDescription,
  statusText,
  USAGE,
  waveformDescription,
} from './synthTexts';
import { useAdditiveVoice, type AdditiveVoice } from './useAdditiveVoice';

const NOTE = 'm-0 text-sm text-fg-muted';

const SAMPLE_RATE_OPTIONS = SAMPLE_RATES.map((rate) => ({
  value: String(rate),
  label: formatNumber(rate, { precision: 0, unit: 'Hz' }),
}));

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

/** What sounds, recomputed only when the recipe, the note, the rate or the phases change. */
function useSounding(state: SynthState): SynthRecipe {
  const { amplitudes, phases, f1, sampleRate, randomPhases, phaseDraw } = state;
  return useMemo(
    () =>
      soundingRecipe({
        ...INITIAL_SYNTH_STATE,
        amplitudes,
        phases,
        f1,
        sampleRate,
        randomPhases,
        phaseDraw,
      }),
    [amplitudes, phases, f1, sampleRate, randomPhases, phaseDraw],
  );
}

/** The voice follows the state; nothing reaches Web Audio before «Reproducir». */
function useVoiceSync(voice: AdditiveVoice, sounding: SynthRecipe, state: SynthState): void {
  const { setRecipe, setFrequency, setSampleRate: setRate } = voice;
  useEffect(() => setRecipe(sounding.amplitudes, sounding.phases), [setRecipe, sounding]);
  useEffect(() => setFrequency(state.f1), [setFrequency, state.f1]);
  useEffect(() => setRate(state.sampleRate), [setRate, state.sampleRate]);
}

interface AmplitudeFieldProps {
  n: number;
  value: number;
  isAudible: boolean;
  onChange(n: number, value: number): void;
}

/** A_n; above f_s/2 the fieldset disables its slider and number, and the label says why. */
function AmplitudeField({ n, value, isAudible, onChange }: AmplitudeFieldProps): JSX.Element {
  return (
    <fieldset
      disabled={!isAudible}
      data-harmonic-field={n}
      className="m-0 min-w-0 border-0 p-0 disabled:opacity-60"
    >
      <ParamField
        id={`synth-a${n}`}
        label={amplitudeLabel(n, isAudible)}
        unit=""
        min={AMPLITUDE_RANGE.min}
        max={AMPLITUDE_RANGE.max}
        step={AMPLITUDE_RANGE.step}
        value={value}
        onChange={(next) => onChange(n, next)}
      />
    </fieldset>
  );
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
  const isSilent = sounding.amplitudes.every((a) => a === 0);

  const onAmplitude = (n: number, value: number) =>
    setState((previous) => setAmplitude(previous, n, value));
  const onSampleRate = (value: string) => {
    // Inside the change event: a playing voice reopens its context within the gesture.
    voice.setSampleRate(Number(value));
    setState((previous) => setSampleRate(previous, Number(value)));
  };

  const params = (
    <>
      {state.amplitudes.map((value, i) => (
        <AmplitudeField
          key={i}
          n={i + 1}
          value={value}
          isAudible={i < audible}
          onChange={onAmplitude}
        />
      ))}
      <ParamField
        id="synth-f1"
        label="Fundamental $f_1$"
        unit="Hz"
        min={F1_RANGE.min}
        max={F1_RANGE.max}
        step={F1_RANGE.step}
        value={state.f1}
        onChange={(f1) => setState((previous) => setF1(previous, f1))}
      />
      <SelectField
        id="synth-fs"
        stacked
        label="Frecuencia de muestreo $f_s$"
        value={String(state.sampleRate)}
        options={SAMPLE_RATE_OPTIONS}
        onChange={onSampleRate}
      />
      <p data-testid="synth-nyquist" className={NOTE}>
        <InlineMath text={nyquistNote(state.f1, state.sampleRate)} />
      </p>
    </>
  );

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
      <p data-testid="synth-random-note" className={NOTE}>
        <InlineMath text={randomPhasesNote(state.randomPhases)} />
      </p>
    </>
  );

  const display: SettingOption[] = [
    {
      key: 'shifted',
      kind: 'toggle',
      label: 'Curva $-y(t + T/2)$ sobre la forma de onda',
      value: showShifted,
      onChange: setShowShifted,
    },
  ];

  return (
    <LabShell
      title="Laboratorio de síntesis aditiva"
      testId="synth-lab"
      readouts={labReadouts(readings)}
      levels={{ params, scenario, display }}
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
        status={statusText(voice.isPlaying, isSilent, voice.error)}
        onToggle={() => (voice.isPlaying ? voice.stop() : void voice.start())}
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
