import type { JSX } from 'react';
import { GRAVITY_GRADIENT_6U } from '../../../lib/data/reactionWheels';
import { formatNumber } from '../../../lib/format';
import {
  DAY_LAPSE,
  dumpTorque,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SPACECRAFT,
  type Feasibility,
  type WheelSettings,
} from './wheelLabModel';

const PERCENT = 100;
const MILLI = 1000;
/** The site's warning look (Callout "cuidado"): the red in the rule and a faint tint, never in the text. */
const WARNING_STYLE = {
  borderLeftColor: 'var(--chart-2)',
  backgroundColor: 'color-mix(in srgb, var(--chart-2) 8%, var(--bg-elevated))',
} as const;

const n = (value: number, precision: number, unit?: string) =>
  formatNumber(value, { precision, unit });
/** "2,3·10⁻⁷": one decimal of the mantissa for the tiny torques. */
const scientific = (value: number, exponent: number) =>
  `${formatNumber(value / 10 ** exponent, { precision: 1 })}·10${superscript(exponent)}`;
const SUPERSCRIPTS: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};
function superscript(exponent: number): string {
  return [...String(exponent)].map((char) => SUPERSCRIPTS[char]).join('');
}

/** T below T_min: the brief's warning, then what the turn asks of the wheel and the shortest T. */
function ManeuverWarning({
  settings,
  feasibility,
}: {
  settings: WheelSettings;
  feasibility: Feasibility;
}): JSX.Element {
  const { torqueShare, momentumShare, tMin } = feasibility;
  return (
    <p
      role="status"
      className="m-0 rounded-base border-l-[3px] px-3 py-2 text-sm"
      style={WARNING_STYLE}
    >
      {`La rueda no alcanza: se satura o le falta torque. En ${n(settings.T, 1, 's')} el giro de ${n(settings.thetaDeg, 0, '°')} pide τ = ${n(torqueShare * SPACECRAFT.tauMax * MILLI, 2, 'mN·m')} (${n(torqueShare * PERCENT, 0, '%')} de τ_max) y |L_w| = ${n(momentumShare * SPACECRAFT.Lmax, 4, 'N·m·s')} (${n(momentumShare * PERCENT, 0, '%')} de L_max). El giro más corto que permite la rueda dura T_min = ${n(tMin, 1, 's')}; aquí se dibuja el giro ideal, que la rueda no puede dar.`}
    </p>
  );
}

function ManeuverLimits({ feasibility }: { feasibility: Feasibility }): JSX.Element {
  return (
    <p className="m-0 text-sm text-fg-muted">
      {`Giro más corto para este ángulo: T_min = ${n(feasibility.byTorque, 1, 's')} por torque (τ_max = ${n(SPACECRAFT.tauMax * MILLI, 0, 'mN·m')}) y ${n(feasibility.byMomentum, 1, 's')} por momento (L_max). La maniobra corre en tiempo real.`}
    </p>
  );
}

/** What the disturbance mode is doing now, the dump actuator's law and the time-lapse. */
function DisturbanceStatus({
  settings,
  dumping,
}: {
  settings: WheelSettings;
  dumping: boolean;
}): JSX.Element {
  const isMagnetic = settings.actuator === 'magnetopar';
  const phase = dumping
    ? `Descargando con el ${isMagnetic ? 'magnetopar' : 'propulsor'}: el torque externo de descarga frena la rueda y la nave sigue quieta.`
    : `Acumulando: la rueda absorbe τ_ext = ${scientific(GRAVITY_GRADIENT_6U.torque, -7)} N·m (gradiente de gravedad a 500 km, tomado constante en su máximo: una cota superior) y la nave sigue quieta.`;
  const law = isMagnetic
    ? `Magnetopar: τ = m × B = ${scientific(dumpTorque('magnetopar'), -5)} N·m con m ⊥ B, el mejor caso; τ siempre es ⊥ B, así que la parte de L_w paralela a B espera a que la órbita gire el campo.`
    : `Propulsor: τ = r × F, acotado aquí por el τ_max de la rueda (${n(dumpTorque('propulsor') * MILLI, 0, 'mN·m')}), porque la rueda debe frenarse igual de rápido mientras la nave sigue quieta.`;
  const hoursPerSecond = DAY_LAPSE / SECONDS_PER_HOUR;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p data-testid="wheel-phase" className="m-0">
        {phase}
      </p>
      <p className="m-0 text-fg-muted">{law}</p>
      <p className="m-0 text-fg-muted">
        {`A cámara rápida: ${n(hoursPerSecond, 0, 'h')} de órbita por segundo (un día en ${n(SECONDS_PER_DAY / DAY_LAPSE, 0, 's')}).`}
      </p>
    </div>
  );
}

/**
 * The line under the gauge: in the maneuver, T_min or the warning when T is below it; in the
 * disturbance, the phase, the actuator's law and the time-lapse.
 */
export default function WheelStatus({
  settings,
  feasibility,
  dumping,
}: {
  settings: WheelSettings;
  feasibility: Feasibility;
  dumping: boolean;
}): JSX.Element {
  if (settings.mode === 'perturbacion') {
    return <DisturbanceStatus settings={settings} dumping={dumping} />;
  }
  return feasibility.isFeasible ? (
    <ManeuverLimits feasibility={feasibility} />
  ) : (
    <ManeuverWarning settings={settings} feasibility={feasibility} />
  );
}
