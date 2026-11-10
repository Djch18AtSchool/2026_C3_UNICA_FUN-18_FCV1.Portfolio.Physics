import { useMemo, useState, type JSX } from 'react';
import { DRIVE_CYCLES } from '../../../lib/data/driveCycles';
import { MODEL3_LR_RWD_2025 } from '../../../lib/data/evModels';
import { formatNumber } from '../../../lib/format';
import { cycleBalance, DEFAULT_REGEN, type BalanceStep } from '../../../lib/physics/energy';
import { mathAriaLabel } from '../../../lib/inlineMath';
import { regenModelText } from '../../../lib/physics/regenModelText';
import Readout from '../../controls/Readout';
import { useElementWidth } from '../../hooks/useElementWidth';
import SvgPlot from '../../lab/SvgPlot';
import { useSettledText } from '../../lab/useSettledText';
import {
  cycleDistance,
  energyBalanceSeries,
  J_PER_KWH,
  STATE_COLOR,
  toKmh,
  type EnergySeries,
} from './regenFigures';

export interface EnergyBalanceChartProps {
  /** The EPA cycle shown; the prescribed chart is the UDDS. */
  cycle?: 'udds';
}

const CAR = MODEL3_LR_RWD_2025;
/** The speed panel is a short strip over the taller energy panel (viewBox width / height). */
const SPEED_ASPECT = { wide: 2.6, compact: 1.2 } as const;
const ENERGY_ASPECT = { wide: 1.6, compact: 0.85 } as const;
const COMPACT_WIDTH = 480;
const FALLBACK_WIDTH = 720;
const ENERGY_PRECISION = 3;
const SPEED_PRECISION = 1;
const SHARE_PRECISION = 1;
const PERCENT = 100;
/** The laboratories' delay (LabShell): announce the readout once the cursor has stopped. */
const ANNOUNCE_DELAY_MS = 750;

const seconds = (t: number) => formatNumber(t, { precision: 0, unit: 's' });
const kwh = (joules: number) =>
  formatNumber(joules / J_PER_KWH, { precision: ENERGY_PRECISION, unit: 'kWh' });
const kmh = (v: number) => formatNumber(toKmh(v), { precision: SPEED_PRECISION, unit: 'km/h' });
const percent = (share: number) =>
  formatNumber(share * PERCENT, { precision: SHARE_PRECISION, unit: '%' });

const DISSIPATED_LABEL = 'Disipado: pérdidas + fricción';

/** What the braking dissipates up to a step: the conversion loss (1 − η) plus the friction heat. */
const dissipatedOf = (step: BalanceStep) => step.eConversionLoss + step.eFriction;

/** Battery / traction up to a step: the share of the traction energy back in the battery. */
const shareOf = (step: BalanceStep) => (step.eTraction > 0 ? step.eBattery / step.eTraction : 0);

/** The step at time t, or the last one before it (the cursor snaps to whole seconds). */
function stepAt(steps: readonly BalanceStep[], t: number): BalanceStep {
  const after = steps.findIndex((step) => step.t > t);
  return steps[after === -1 ? steps.length - 1 : Math.max(0, after - 1)];
}

/** The label of an energy as a screen reader says it: its $…$ in words. */
const spokenLabel = ({ label }: EnergySeries) => mathAriaLabel(label) ?? label;

/** What the screen reader hears once the cursor stops: t, v, the six energies, the dissipated sum and the share. */
function readoutSummary(step: BalanceStep, energies: readonly EnergySeries[]): string {
  const values = energies.map((e) => `${spokenLabel(e).toLowerCase()} ${kwh(step[e.key])}`);
  return [
    `t = ${seconds(step.t)}`,
    `v = ${kmh(step.v)}`,
    ...values,
    `${DISSIPATED_LABEL.toLowerCase()} ${kwh(dissipatedOf(step))}`,
    `batería / tracción ${percent(shareOf(step))}`,
  ].join('; ');
}

/**
 * The prescribed resource of Tema 6 (spec §6 Paso 4): v(t) of the EPA cycle above the cumulative
 * energies of the site's model (DEFAULT_REGEN) for the Model 3, with the lab's six series and
 * colors. One cursor: the energy plot's slider (drag it, or focus it and use the arrow keys) and a
 * static line at the same instant on the speed plot; the readout gives the balance up to it.
 */
export default function EnergyBalanceChart({
  cycle = 'udds',
}: EnergyBalanceChartProps): JSX.Element {
  const drive = DRIVE_CYCLES[cycle];
  const { steps, totals } = useMemo(() => cycleBalance(drive.samples, CAR, DEFAULT_REGEN), [drive]);
  const { speed, energies } = useMemo(() => energyBalanceSeries(steps), [steps]);
  const duration = steps[steps.length - 1].t;
  const xDomain = { min: steps[0].t, max: duration };
  const [t, setT] = useState(duration);
  const [ref, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const isCompact = width < COMPACT_WIDTH;
  const step = stepAt(steps, t);
  const announcement = useSettledText(readoutSummary(step, energies), ANNOUNCE_DELAY_MS);
  const label = (x: number) => `t = ${seconds(x)}`;
  const topSpeed = Math.max(...drive.samples.map((s) => s.v));
  const totalsText = energies
    .map((e) => `${spokenLabel(e).toLowerCase()} ${kwh(steps[steps.length - 1][e.key])}`)
    .join(', ');

  return (
    <div ref={ref} data-testid="energy-balance-chart" className="flex flex-col gap-4">
      <SvgPlot
        aspectRatio={isCompact ? SPEED_ASPECT.compact : SPEED_ASPECT.wide}
        title={`Velocidad del ciclo ${drive.name} de la EPA`}
        xLabel="Tiempo t"
        xUnit="s"
        yLabel="Velocidad v"
        yUnit="km/h"
        xDomain={xDomain}
        series={[{ id: 'velocidad', label: 'Velocidad v', points: speed, color: STATE_COLOR }]}
        cursor={{ x: t, label }}
        marker={{ x: step.t, y: toKmh(step.v) }}
        ariaLabel={`v(t) del ciclo ${drive.name} de la EPA: ${seconds(duration)} y ${formatNumber(cycleDistance(drive) / 1000, { precision: 2, unit: 'km' })}, con un máximo de ${kmh(topSpeed)}.`}
        testId="energy-balance-speed"
      />
      <SvgPlot
        aspectRatio={isCompact ? ENERGY_ASPECT.compact : ENERGY_ASPECT.wide}
        title={`Energías acumuladas del ${CAR.name} en el ${drive.name} (${regenModelText(DEFAULT_REGEN)})`}
        xLabel="Tiempo t"
        xUnit="s"
        yLabel="Energía acumulada"
        yUnit="kWh"
        xDomain={xDomain}
        series={energies.map((e) => ({
          id: e.key,
          label: e.label,
          color: e.color,
          dashed: e.dashed,
          points: e.points,
        }))}
        cursor={{ x: t, onChange: (next: number) => setT(Math.round(next)), label }}
        ariaLabel={`Energías acumuladas al final del ciclo: ${totalsText}; se disipan ${kwh(totals.conversionLoss + totals.friction)} (pérdidas de conversión más fricción) y la batería recupera el ${percent(totals.recoveredShare)} de la energía de tracción.`}
        testId="energy-balance-energies"
      />
      <div data-testid="energy-balance-readout" className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        <Readout label="Tiempo t" value={step.t} unit="s" precision={0} />
        <Readout
          label="Velocidad v"
          value={toKmh(step.v)}
          unit="km/h"
          precision={SPEED_PRECISION}
        />
        {energies.map((e) => (
          <Readout
            key={e.key}
            label={e.label}
            value={step[e.key] / J_PER_KWH}
            unit="kWh"
            precision={ENERGY_PRECISION}
          />
        ))}
        <Readout
          label={DISSIPATED_LABEL}
          value={dissipatedOf(step) / J_PER_KWH}
          unit="kWh"
          precision={ENERGY_PRECISION}
        />
        <Readout
          label="Batería / tracción"
          value={shareOf(step) * PERCENT}
          unit="%"
          precision={SHARE_PRECISION}
        />
      </div>
      <p className="m-0 text-sm text-fg-muted">
        Arrastra el cursor de la gráfica de energías, o enfócalo y muévelo con las flechas (1 % del
        ciclo; con Mayús, 10 %; Inicio y Fin van a los extremos); la línea de la velocidad lo sigue.
        Las lecturas suman desde t = 0 hasta el cursor; lo disipado son las pérdidas de conversión
        más el calor de fricción.
      </p>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
