import type { JSX } from 'react';
import { GRAVITY_GRADIENT_6U } from '../../../lib/data/reactionWheels';
import { formatNumber } from '../../../lib/format';
import { MIN_DUMP_PLAYBACK } from './disturbanceTimeline';
import {
  DAY_LAPSE,
  dumpingParams,
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
/** "2,28·10⁻⁷": the mantissa of a tiny torque with the given decimals. */
const scientific = (value: number, exponent: number, precision: number) =>
  `${formatNumber(value / 10 ** exponent, { precision })}·10${superscript(exponent)}`;
/** τ_gg to the code's own value, 2,28·10⁻⁷ N·m, as the τ readout shows it. */
const DISTURBANCE_DECIMALS = 2;
const DUMP_DECIMALS = 1;
const BUTTON =
  'min-h-9 self-start rounded-base border border-border px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';
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
function maneuverWarning(settings: WheelSettings, feasibility: Feasibility): string {
  const { torqueShare, momentumShare, tMin } = feasibility;
  return `La rueda no alcanza: se satura o le falta torque. En ${n(settings.T, 1, 's')} el giro de ${n(settings.thetaDeg, 0, '°')} pide τ = ${n(torqueShare * SPACECRAFT.tauMax * MILLI, 2, 'mN·m')} (${n(torqueShare * PERCENT, 0, '%')} de τ_máx) y |L_w| = ${n(momentumShare * SPACECRAFT.Lmax, 4, 'N·m·s')} (${n(momentumShare * PERCENT, 0, '%')} de L_máx). El giro más corto que permite la rueda dura T_mín = ${n(tMin, 1, 's')}; aquí se dibuja el giro ideal, que la rueda no puede dar.`;
}

/**
 * A live region that stays in the page and only changes its text, so screen readers announce the
 * warning when T drops below T_min (a region mounted already filled may go unannounced).
 */
function WarningRegion({ text }: { text: string | undefined }): JSX.Element {
  return (
    <div role="status">
      {text === undefined ? null : (
        <p className="m-0 rounded-base border-l-[3px] px-3 py-2 text-sm" style={WARNING_STYLE}>
          {text}
        </p>
      )}
    </div>
  );
}

function ManeuverLimits({ feasibility }: { feasibility: Feasibility }): JSX.Element {
  return (
    <p className="m-0 text-sm text-fg-muted">
      {`Giro más corto para este ángulo: T_mín = ${n(feasibility.byTorque, 1, 's')} por torque (τ_máx = ${n(SPACECRAFT.tauMax * MILLI, 0, 'mN·m')}) y ${n(feasibility.byMomentum, 1, 's')} por momento (L_máx). La maniobra corre en tiempo real.`}
    </p>
  );
}

const decimalsFor = (value: number) => (Number.isInteger(value) ? 0 : 1);
const speedText = (speed: number) => `${String(speed).replace('.', ',')}×`;

/** "a 4×, 8 h de órbita por segundo (un día en 3 s)": the time-lapse at a playback speed. */
function lapseAt(speed: number): string {
  const hours = (DAY_LAPSE * speed) / SECONDS_PER_HOUR;
  const daySeconds = SECONDS_PER_DAY / (DAY_LAPSE * speed);
  return `${speedText(speed)}, ${n(hours, decimalsFor(hours), 'h')} de órbita por segundo (un día en ${n(daySeconds, decimalsFor(daySeconds), 's')})`;
}

function lapseStatement(speed: number): string {
  const chosen = speed === 1 ? '' : `; a ${lapseAt(speed)}`;
  return `A cámara rápida. A ${lapseAt(1)}${chosen}. Cada descarga se estira a ${n(MIN_DUMP_PLAYBACK, 0, 's')} de pantalla a 1× para que se vea; la línea de tiempo cuenta segundos de reproducción y la lectura «Tiempo en órbita», horas de órbita.`;
}

function actuatorLaw(isMagnetic: boolean): string {
  if (isMagnetic) {
    return `Magnetopar: τ = m × B = ${scientific(dumpTorque('magnetopar'), -5, DUMP_DECIMALS)} N·m con m ⊥ B, el mejor caso; τ siempre es ⊥ B, así que la parte de L_w paralela a B espera a que la órbita gire el campo.`;
  }
  const { tauExt, tauDump, Lmax, dumpAt } = dumpingParams('propulsor');
  const seconds = (dumpAt * Lmax) / (tauDump - tauExt);
  return `Propulsor: τ = r × F. Su torque es un supuesto ilustrativo, no un dato de una fuente: lo acoto con el τ_máx de la rueda (${n(tauDump * MILLI, 0, 'mN·m')}), porque la rueda debe frenarse igual de rápido mientras la nave sigue quieta. Con esa cota la descarga dura unos ${n(seconds, 0, 's')}, lo más rápido posible.`;
}

/** What the disturbance mode is doing now, the dump actuator's law, the time-lapse and a jump to the dump. */
function DisturbanceStatus({
  settings,
  dumping,
  speed,
  onGoToDump,
}: {
  settings: WheelSettings;
  dumping: boolean;
  speed: number;
  onGoToDump(): void;
}): JSX.Element {
  const isMagnetic = settings.actuator === 'magnetopar';
  const phase = dumping
    ? `Descargando con el ${isMagnetic ? 'magnetopar' : 'propulsor'}: el torque externo de descarga frena la rueda y la nave sigue quieta.`
    : `Acumulando: la rueda absorbe τ_ext = ${scientific(GRAVITY_GRADIENT_6U.torque, -7, DISTURBANCE_DECIMALS)} N·m (gradiente de gravedad a 500 km, tomado constante en su máximo: una cota superior) y la nave sigue quieta.`;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p data-testid="wheel-phase" className="m-0">
        {phase}
      </p>
      <p className="m-0 text-fg-muted">{actuatorLaw(isMagnetic)}</p>
      <p className="m-0 text-fg-muted">{lapseStatement(speed)}</p>
      <button type="button" onClick={onGoToDump} className={`${BUTTON} mt-1`}>
        Ir a la descarga
      </button>
    </div>
  );
}

export interface WheelStatusProps {
  settings: WheelSettings;
  feasibility: Feasibility;
  dumping: boolean;
  /** The clock's playback speed, for the time-lapse statement. */
  speed: number;
  onGoToDump(): void;
}

/**
 * The lines under the gauge: the warning's live region (filled when T < T_min), then in the
 * maneuver T_min, and in the disturbance the phase, the actuator's law and the time-lapse.
 */
export default function WheelStatus({
  settings,
  feasibility,
  dumping,
  speed,
  onGoToDump,
}: WheelStatusProps): JSX.Element {
  const isManeuver = settings.mode === 'maniobra';
  const warning =
    isManeuver && !feasibility.isFeasible ? maneuverWarning(settings, feasibility) : undefined;
  return (
    <div className="flex flex-col gap-2">
      <WarningRegion text={warning} />
      {isManeuver ? (
        <ManeuverLimits feasibility={feasibility} />
      ) : (
        <DisturbanceStatus
          settings={settings}
          dumping={dumping}
          speed={speed}
          onGoToDump={onGoToDump}
        />
      )}
    </div>
  );
}
