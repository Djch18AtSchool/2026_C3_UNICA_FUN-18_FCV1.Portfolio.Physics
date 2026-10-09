import { useEffect, useMemo, useState } from 'react';
import {
  TRIGGER_LIMITS,
  TRIGGER_TRAVEL_MM,
  storedEnergyMilliJoules,
  triggerCurves,
  triggerWorkMilliJoules,
  type TriggerSettings,
} from '../../../lib/data/triggerModel';
import LineChart from '../../charts/LineChart';
import ControlPanel from '../../controls/ControlPanel';
import Readout from '../../controls/Readout';
import Slider from '../../controls/Slider';

/** The worked example of the prose: k = 400 N/m, resistance from 3 mm. */
const DEFAULT_SETTINGS: TriggerSettings = { k: 400, start: 3 };
const K_STEP = 10;
const START_STEP = 0.5;
/** A fixed force axis up to 5 N (k_max · 8 mm = 4,8 N), so moving k redraws the line, not the scale. */
const FORCE_AXIS: [number, number] = [0, 5];
const FORCE_TICKS = [0, 1, 2, 3, 4, 5];
const TRAVEL_TICKS = Array.from({ length: TRIGGER_TRAVEL_MM + 1 }, (_, i) => i);

/** Interactive force–displacement curve of the virtual spring behind the DualSense trigger. */
export default function SpringForceCurve() {
  const [settings, setSettings] = useState<TriggerSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);
  useEffect(() => setIsReady(true), []);

  const rows = useMemo(() => triggerCurves(settings).map((point) => ({ ...point })), [settings]);
  const bottom = rows[rows.length - 1];

  return (
    <div
      data-testid="spring-force-curve"
      data-ready={isReady}
      className="flex min-w-0 flex-col gap-4"
    >
      <LineChart
        title="Fuerza contra desplazamiento del gatillo: resorte ideal y perfil por tramos"
        data={rows}
        xKey="x"
        xAxis={{
          label: 'Desplazamiento x',
          unit: 'mm',
          domain: [0, TRIGGER_TRAVEL_MM],
          ticks: TRAVEL_TICKS,
          precision: 2,
        }}
        yAxis={{
          label: 'Fuerza F',
          unit: 'N',
          domain: FORCE_AXIS,
          ticks: FORCE_TICKS,
          precision: 2,
        }}
        series={[
          { key: 'hooke', name: 'Hooke ideal', dashed: true },
          { key: 'trigger', name: 'Gatillo adaptativo' },
        ]}
        bands={[{ from: settings.start, to: TRIGGER_TRAVEL_MM, label: 'Resistencia' }]}
        curve="linear"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <ControlPanel title="Resorte virtual" onReset={() => setSettings(DEFAULT_SETTINGS)}>
          <Slider
            id="spring-k"
            label="Rigidez k"
            unit="N/m"
            min={TRIGGER_LIMITS.k[0]}
            max={TRIGGER_LIMITS.k[1]}
            step={K_STEP}
            value={settings.k}
            onChange={(k) => setSettings({ ...settings, k })}
          />
          <Slider
            id="spring-start"
            label="Inicio de la resistencia x₀"
            unit="mm"
            min={TRIGGER_LIMITS.start[0]}
            max={TRIGGER_LIMITS.start[1]}
            step={START_STEP}
            value={settings.start}
            onChange={(start) => setSettings({ ...settings, start })}
          />
        </ControlPanel>
        <section
          aria-label="Resultados"
          className="flex flex-col gap-3 rounded-base border border-border bg-bg-elevated p-4"
        >
          <div data-testid="spring-readouts" className="flex flex-col gap-2">
            <Readout
              label="Fuerza al fondo, Hooke ideal"
              value={bottom.hooke}
              unit="N"
              precision={2}
            />
            <Readout
              label="Energía almacenada, Hooke ideal"
              value={storedEnergyMilliJoules(settings)}
              unit="mJ"
              precision={1}
            />
            <Readout
              label="Fuerza al fondo, gatillo"
              value={bottom.trigger}
              unit="N"
              precision={2}
            />
            <Readout
              label="Trabajo del dedo contra el gatillo"
              value={triggerWorkMilliJoules(settings)}
              unit="mJ"
              precision={1}
            />
          </div>
          <p className="m-0 text-sm text-fg-muted">
            Cada energía es el área bajo su recta hasta 8 mm: ½ k x² en el resorte ideal y ½ k (8 mm
            − x₀)² en el gatillo, donde es el trabajo del dedo contra el actuador, no energía
            guardada en un resorte. Recorrido supuesto de 8 mm; k y x₀ son ilustrativos.
          </p>
          <p data-testid="third-law-note" className="m-0 border-l-2 border-accent pl-3 text-sm">
            Por la tercera ley, el gatillo empuja el dedo con F(gatillo→dedo) = −F(dedo→gatillo): la
            misma magnitud que grafica la curva, en sentido contrario y sobre el otro cuerpo. Esa
            reacción es lo que el dedo percibe como tensión.
          </p>
        </section>
      </div>
    </div>
  );
}
