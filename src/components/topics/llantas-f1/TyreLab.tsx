import { useState, type JSX } from 'react';
import type { Compound } from '../../../lib/data/tyreModels';
import { formatNumber } from '../../../lib/format';
import LabShell, { type LabReadout } from '../../lab/LabShell';
import ParamField from '../../lab/ParamField';
import type { SettingOption } from '../../lab/SettingsDrawer';
import SvgPlot from '../../lab/SvgPlot';
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
  tyreReadings,
  type TyreLabState,
} from './tyreLabModel';
import { PlotPoints } from './TyreMarks';
import {
  LINEAR_COLOR,
  LOAD_AXIS,
  loadPlot,
  REAL_COLOR,
  TEMPERATURE_AXIS,
  temperaturePlot,
  usePlotAspect,
} from './tyrePlots';

/** Two stacked plots: flatter than a lone figure on wide screens, squarer on phones. */
const WIDE_ASPECT = 2;
const COMPACT_ASPECT = 1.1;
/** Forces read in whole newtons; the global decimals would print 11 942,90 N. */
const FORCE_PRECISION = 0;

const COMPOUND_OPTIONS = COMPOUNDS.map((compound) => ({
  value: compound,
  label: compoundOptionLabel(compound),
}));

export interface TyreLabProps {
  /** The model's caveats, written in the topic's MDX so they travel with its text. */
  footnote?: string;
}

/**
 * Tema 4's laboratory on the v2 shell, with no clock: two stacked plots, each with a draggable
 * cursor (temperature, which reads μ(T) over the chosen compound's 2019 window, and load, which
 * reads the linear and the load-sensitive peak lateral force), the parameters T and F_z bound to
 * those cursors, the compound as a local setting and the readouts μ(T), F_y (both) and μ efectivo.
 * The load curves are multiplied by μ(T)/μ_pico, so moving the temperature moves them too.
 */
export default function TyreLab({ footnote }: TyreLabProps): JSX.Element {
  const [state, setState] = useState<TyreLabState>(INITIAL_TYRE_STATE);
  const { decimals } = useGlobalSettings();
  const readings = tyreReadings(state);
  const temperatureAspect = usePlotAspect(WIDE_ASPECT, COMPACT_ASPECT);
  const loadAspect = usePlotAspect(WIDE_ASPECT, COMPACT_ASPECT);

  const onTemperature = (t: number) => setState((previous) => setTemperature(previous, t));
  const onLoad = (fz: number) => setState((previous) => setLoad(previous, fz));

  const readouts: LabReadout[] = [
    { label: 'Coeficiente de agarre μ(T)', value: readings.mu, unit: '' },
    {
      label: 'Fuerza lateral lineal F_y',
      value: readings.linear,
      unit: 'N',
      precision: FORCE_PRECISION,
    },
    {
      label: 'Fuerza lateral real F_y',
      value: readings.real,
      unit: 'N',
      precision: FORCE_PRECISION,
    },
    { label: 'Coeficiente efectivo μ', value: readings.muEff, unit: '' },
  ];

  const localSettings: SettingOption[] = [
    {
      key: 'compound',
      label: 'Compuesto (Pirelli, 2019)',
      kind: 'select',
      value: state.compound,
      options: COMPOUND_OPTIONS,
      onChange: (value) => setState((previous) => setCompound(previous, value as Compound)),
    },
  ];

  const params = (
    <>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <ParamField
          id="tyre-t"
          label="Temperatura de la banda T"
          unit="°C"
          min={TEMPERATURE_DOMAIN.min}
          max={TEMPERATURE_DOMAIN.max}
          step={TEMPERATURE_STEP}
          value={state.t}
          onChange={onTemperature}
        />
        <ParamField
          id="tyre-fz"
          label="Carga sobre la llanta F_z"
          unit="N"
          min={LOAD_DOMAIN.min}
          max={LOAD_DOMAIN.max}
          step={LOAD_STEP}
          value={state.fz}
          onChange={onLoad}
        />
      </div>
      <p className="m-0 text-sm text-fg-muted">
        Arrastra el cursor de cada gráfica, o enfócalo y muévelo con las flechas (1 % del eje; con
        Mayús, 10 %). El compuesto se elige en los ajustes del engranaje.
      </p>
    </>
  );

  return (
    <LabShell
      title="Laboratorio de la llanta"
      type="visualizacion"
      readouts={readouts}
      params={params}
      localSettings={localSettings}
      onReset={() => setState(INITIAL_TYRE_STATE)}
      footnote={footnote}
      testId="tyre-lab"
    >
      <div className="flex flex-col gap-6">
        <div ref={temperatureAspect.ref} data-testid="tyre-temperature-plot">
          <SvgPlot
            aspectRatio={temperatureAspect.aspectRatio}
            title="Coeficiente de agarre μ frente a la temperatura"
            {...temperaturePlot(state.compound)}
            cursor={{
              x: state.t,
              onChange: onTemperature,
              label: (t) => `T = ${formatNumber(t, { precision: 0, unit: TEMPERATURE_AXIS.unit })}`,
            }}
            marker={{ x: state.t, y: readings.mu }}
            ariaLabel={`μ(T) del compuesto ${state.compound}: a ${formatNumber(state.t, { precision: 0 })} °C, μ = ${formatNumber(readings.mu, { precision: decimals })}.`}
          />
        </div>
        <div ref={loadAspect.ref} data-testid="tyre-load-plot">
          <SvgPlot
            aspectRatio={loadAspect.aspectRatio}
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
            ariaLabel={`A ${formatNumber(state.fz, { precision: 0, unit: 'N' })}, el modelo lineal da ${formatNumber(readings.linear, { precision: 0, unit: 'N' })} y el de sensibilidad a la carga, ${formatNumber(readings.real, { precision: 0, unit: 'N' })}.`}
          />
        </div>
      </div>
    </LabShell>
  );
}
