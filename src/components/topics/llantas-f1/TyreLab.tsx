import { useState, type JSX } from 'react';
import type { Compound } from '../../../lib/data/tyreModels';
import { formatNumber } from '../../../lib/format';
import LabPresets from '../../lab/LabPresets';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import { SelectField } from '../../lab/SettingsFields';
import SvgPlot, { STAGE_PLOT_ASPECT } from '../../lab/SvgPlot';
import { mathTextToString } from '../../../lib/mathNotation';
import { useGlobalSettings } from '../../lab/useGlobalSettings';
import {
  COMPOUNDS,
  compoundOptionLabel,
  INITIAL_TYRE_STATE,
  LOAD_DOMAIN,
  LOAD_STEP,
  setCompound,
  setLoad,
  setTemperature,
  TEMPERATURE_DOMAIN,
  TEMPERATURE_STEP,
  TYRE_PRESETS,
  presetIdFor,
  tyreReadings,
  type TyreLabState,
  type TyreReadings,
} from './tyreLabModel';
import { PlotPoints } from '../../lab/PlotPoints';
import { NO_LOCAL_SETTINGS } from '../../lab/labShellTypes';
import {
  LINEAR_COLOR,
  LOAD_AXIS,
  loadPlot,
  REAL_COLOR,
  TEMPERATURE_AXIS,
  temperaturePlot,
} from './tyrePlots';

/** Forces read in whole newtons; the global decimals would print 11 942,90 N. */
const FORCE_PRECISION = 0;

const COMPOUND_OPTIONS = COMPOUNDS.map((compound) => ({
  value: compound,
  label: compoundOptionLabel(compound),
}));

/** «Cómo se usa»: the two cursors and their keys. The compound is chosen in the scenario. */
const DRAG_HINT =
  'Arrastra el cursor de cada gráfica, o enfócalo y muévelo con las flechas (1 % del eje; con Mayús, 10 %).';

interface PlotProps {
  state: TyreLabState;
}

/** The scene: μ(T) over the compound's 2019 window, its cursor bound to T. */
function TemperaturePlot({
  state,
  mu,
  decimals,
  onTemperature,
}: PlotProps & { mu: number; decimals: number; onTemperature(t: number): void }) {
  return (
    <div data-testid="tyre-temperature-plot">
      <SvgPlot
        aspectRatio={STAGE_PLOT_ASPECT}
        title="Coeficiente de agarre $\mu$ frente a la temperatura"
        {...temperaturePlot(state.compound)}
        cursor={{
          x: state.t,
          onChange: onTemperature,
          label: (t) => `T = ${formatNumber(t, { precision: 0, unit: TEMPERATURE_AXIS.unit })}`,
        }}
        marker={{ x: state.t, y: mu }}
        ariaLabel={mathTextToString(
          `μ(T) del compuesto ${state.compound}: a ${formatNumber(state.t, { precision: 0 })} °C, μ = ${formatNumber(mu, { precision: decimals })}.`,
        )}
      />
    </div>
  );
}

/** The support plot after the readouts: the peak lateral force of both models, its cursor bound to F_z. */
function LoadPlot({
  state,
  readings,
  onLoad,
}: PlotProps & { readings: TyreReadings; onLoad(fz: number): void }) {
  return (
    <div data-testid="tyre-load-plot">
      <SvgPlot
        aspectRatio={STAGE_PLOT_ASPECT}
        title="Fuerza lateral máxima frente a la carga vertical"
        {...loadPlot(readings.factor)}
        cursor={{
          x: state.fz,
          onChange: onLoad,
          label: (fz) => `F_z = ${formatNumber(fz, { precision: 0, unit: LOAD_AXIS.unit })}`,
        }}
        overlay={(scales) => (
          <PlotPoints
            scales={scales}
            points={[
              { id: 'lineal', x: state.fz, y: readings.linear, color: LINEAR_COLOR },
              { id: 'real', x: state.fz, y: readings.real, color: REAL_COLOR },
            ]}
          />
        )}
        ariaLabel={mathTextToString(
          `A ${formatNumber(state.fz, { precision: 0, unit: 'N' })}, el modelo lineal da ${formatNumber(readings.linear, { precision: 0, unit: 'N' })} y el de sensibilidad a la carga, ${formatNumber(readings.real, { precision: 0, unit: 'N' })}.`,
        )}
      />
    </div>
  );
}

export interface TyreLabProps {
  /** «Qué deja fuera el modelo», written in the topic's MDX so it travels with its text. */
  leftOut?: string;
}

/**
 * Tema 4's laboratory on LabShell, with no clock: two plots, each with a draggable cursor
 * (temperature, the scene, which reads μ(T) over the chosen compound's 2019 window; and load, a
 * support plot after the readouts, which reads the linear and the load-sensitive peak lateral
 * force), the parameters T and F_z bound to
 * those cursors, the compound and the presets from the topic's numbers as the scenario, and the
 * readouts μ(T), F_y (both) and μ efectivo. Nothing of its own in the drawer.
 * The load curves are multiplied by μ(T)/μ_pico, so moving the temperature moves them too.
 */
export default function TyreLab({ leftOut }: TyreLabProps): JSX.Element {
  const [state, setState] = useState<TyreLabState>(INITIAL_TYRE_STATE);
  const { decimals } = useGlobalSettings();
  const readings = tyreReadings(state);

  const onTemperature = (t: number) => setState((previous) => setTemperature(previous, t));
  const onLoad = (fz: number) => setState((previous) => setLoad(previous, fz));

  const readouts: LabReadout[] = [
    { id: 'mu', label: 'Coeficiente de agarre $\\mu(T)$', value: readings.mu, unit: '' },
    {
      id: 'linear',
      label: 'Fuerza lateral lineal $F_y$',
      value: readings.linear,
      unit: 'N',
      precision: FORCE_PRECISION,
    },
    {
      id: 'real',
      label: 'Fuerza lateral real $F_y$',
      value: readings.real,
      unit: 'N',
      precision: FORCE_PRECISION,
    },
    { id: 'muEff', label: 'Coeficiente efectivo $\\mu$', value: readings.muEff, unit: '' },
  ];

  const params = (
    <>
      <ParamField
        id="tyre-t"
        label="Temperatura de la banda $T$"
        unit="°C"
        min={TEMPERATURE_DOMAIN.min}
        max={TEMPERATURE_DOMAIN.max}
        step={TEMPERATURE_STEP}
        value={state.t}
        onChange={onTemperature}
      />
      <ParamField
        id="tyre-fz"
        label="Carga sobre la llanta $F_z$"
        unit="N"
        min={LOAD_DOMAIN.min}
        max={LOAD_DOMAIN.max}
        step={LOAD_STEP}
        value={state.fz}
        onChange={onLoad}
      />
    </>
  );

  const scenario = (
    <>
      <SelectField
        id="tyre-compound"
        stacked
        label="Compuesto (Pirelli, 2019)"
        value={state.compound}
        options={COMPOUND_OPTIONS}
        onChange={(value) => setState((previous) => setCompound(previous, value as Compound))}
      />
      <LabPresets
        id="tyre-preset"
        presets={TYRE_PRESETS}
        activeId={presetIdFor(state)}
        onSelect={(preset) => setState(preset.values)}
      />
    </>
  );

  return (
    <LabShell
      title="Laboratorio de la llanta"
      readouts={readouts}
      levels={{ params, scenario, display: NO_LOCAL_SETTINGS }}
      notes={{ usage: [DRAG_HINT], leftOut: leftOut ? [leftOut] : [] }}
      onReset={() => setState(INITIAL_TYRE_STATE)}
      testId="tyre-lab"
      charts={<LoadPlot state={state} readings={readings} onLoad={onLoad} />}
    >
      <TemperaturePlot
        state={state}
        mu={readings.mu}
        decimals={decimals}
        onTemperature={onTemperature}
      />
    </LabShell>
  );
}
