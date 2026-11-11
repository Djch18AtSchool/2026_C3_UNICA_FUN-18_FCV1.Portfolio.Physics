import type { JSX } from 'react';
import { GRAVITY_GRADIENT_6U } from '../../../lib/data/reactionWheels';
import { formatNumber } from '../../../lib/format';
import InlineMath from '../../lab/InlineMath';
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
/** TeX for InlineMath: «$2{,}28 \cdot 10^{-7}$», the mantissa of a tiny torque with its decimals. */
const scientific = (value: number, exponent: number, precision: number) =>
  `$${formatNumber(value / 10 ** exponent, { precision }).replace(',', '{,}')} \\cdot 10^{${exponent}}$`;
/** τ_gg to the code's own value, 2,28·10⁻⁷ N·m, as the τ readout shows it. */
const DISTURBANCE_DECIMALS = 2;
const DUMP_DECIMALS = 1;
const BUTTON =
  'min-h-9 self-start rounded-base border border-border px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted hover:text-fg';

/** T below T_min: the brief's warning, then what the turn asks of the wheel and the shortest T. */
function maneuverWarning(settings: WheelSettings, feasibility: Feasibility): string {
  const { torqueShare, momentumShare, tMin } = feasibility;
  return `La rueda no alcanza: se satura o le falta torque. En ${n(settings.T, 1, 's')} el giro de ${n(settings.thetaDeg, 0, '°')} pide $\\tau$ = ${n(torqueShare * SPACECRAFT.tauMax * MILLI, 2, 'mN·m')} (${n(torqueShare * PERCENT, 0, '%')} de $\\tau_\\text{máx}$) y $|L_w|$ = ${n(momentumShare * SPACECRAFT.Lmax, 4, 'N·m·s')} (${n(momentumShare * PERCENT, 0, '%')} de $L_\\text{máx}$). El giro más corto que permite la rueda dura $T_\\text{mín}$ = ${n(tMin, 1, 's')}; aquí se dibuja el giro ideal, que la rueda no puede dar.`;
}

/**
 * A live region that stays in the page and only changes its text, so screen readers announce the
 * warning when T drops below T_min (a region mounted already filled may go unannounced).
 */
function WarningRegion({ text }: { text: string | undefined }): JSX.Element {
  return (
    <div role="status">
      {text === undefined ? null : (
        <p
          className="mx-0 mt-4 mb-0 rounded-base border-l-[3px] px-3 py-2 text-sm"
          style={WARNING_STYLE}
        >
          <InlineMath text={text} />
        </p>
      )}
    </div>
  );
}

function ManeuverLimits({ feasibility }: { feasibility: Feasibility }): JSX.Element {
  return (
    <p className="m-0">
      <InlineMath
        text={`Giro más corto para este ángulo: $T_\\text{mín}$ = ${n(feasibility.byTorque, 1, 's')} por torque ($\\tau_\\text{máx}$ = ${n(SPACECRAFT.tauMax * MILLI, 0, 'mN·m')}) y ${n(feasibility.byMomentum, 1, 's')} por momento ($L_\\text{máx}$). La maniobra corre en tiempo real.`}
      />
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
  return `La perturbación va a cámara rápida y el dibujo dice el factor. A ${lapseAt(1)}${chosen}. Cada descarga se estira a ${n(MIN_DUMP_PLAYBACK, 0, 's')} de pantalla a 1× para que se vea; la reproducción y la lectura «Tiempo en órbita» cuentan horas de órbita.`;
}

function actuatorLaw(isMagnetic: boolean): string {
  if (isMagnetic) {
    return `Magnetopar: $\\tau = m \\times B$ = ${scientific(dumpTorque('magnetopar'), -5, DUMP_DECIMALS)} N·m con $m \\perp B$, el mejor caso; $\\tau$ siempre es $\\perp B$, así que la parte de $L_w$ paralela a $B$ espera a que la órbita gire el campo.`;
  }
  const { tauExt, tauDump, Lmax, dumpAt } = dumpingParams('propulsor');
  const seconds = (dumpAt * Lmax) / (tauDump - tauExt);
  return `Propulsor: $\\tau = r \\times F$. Su torque es un supuesto ilustrativo, no un dato de una fuente: lo acoto con el $\\tau_\\text{máx}$ de la rueda (${n(tauDump * MILLI, 0, 'mN·m')}), porque la rueda debe frenarse igual de rápido mientras la nave sigue quieta. Con esa cota la descarga dura unos ${n(seconds, 0, 's')}, lo más rápido posible.`;
}

/** What the disturbance mode is doing now, and a jump to the dump (a button: it stays in the canvas). */
function DisturbanceStatus({
  settings,
  dumping,
  onGoToDump,
}: {
  settings: WheelSettings;
  dumping: boolean;
  onGoToDump(): void;
}): JSX.Element {
  const isMagnetic = settings.actuator === 'magnetopar';
  const phase = dumping
    ? `Descargando con el ${isMagnetic ? 'magnetopar' : 'propulsor'}: el torque externo de descarga frena la rueda y la nave sigue quieta.`
    : `Acumulando: la rueda absorbe $\\tau_\\text{ext}$ = ${scientific(GRAVITY_GRADIENT_6U.torque, -7, DISTURBANCE_DECIMALS)} N·m (gradiente de gravedad a 500 km, tomado constante en su máximo: una cota superior) y la nave sigue quieta.`;
  return (
    <div className="mt-4 flex flex-col gap-2 text-sm">
      <p data-testid="wheel-phase" className="m-0">
        <InlineMath text={phase} />
      </p>
      <button type="button" onClick={onGoToDump} className={BUTTON}>
        Ir a la descarga
      </button>
    </div>
  );
}

export interface WheelStatusProps {
  settings: WheelSettings;
  feasibility: Feasibility;
  dumping: boolean;
  onGoToDump(): void;
}

/**
 * The canvas's status, under the gauge: the warning's live region (filled when T < T_min) and, in
 * the disturbance, the phase and the jump to the dump. The region sits in the page even when empty,
 * so it takes no space; each block brings its own top margin.
 */
export default function WheelStatus({
  settings,
  feasibility,
  dumping,
  onGoToDump,
}: WheelStatusProps): JSX.Element {
  const isManeuver = settings.mode === 'maniobra';
  const warning =
    isManeuver && !feasibility.isFeasible ? maneuverWarning(settings, feasibility) : undefined;
  return (
    <div>
      <WarningRegion text={warning} />
      {isManeuver ? null : (
        <DisturbanceStatus settings={settings} dumping={dumping} onGoToDump={onGoToDump} />
      )}
    </div>
  );
}

export interface WheelNotesProps {
  settings: WheelSettings;
  feasibility: Feasibility;
  /** The clock's playback speed, for the time-lapse statement. */
  speed: number;
}

/**
 * What reads the canvas without being a control, in the lab's canvas notes: in the maneuver the
 * shortest turn; in the disturbance the dump actuator's law and the time-lapse.
 */
export function WheelNotes({ settings, feasibility, speed }: WheelNotesProps): JSX.Element {
  if (settings.mode === 'maniobra') {
    return (
      <div className="text-sm text-fg-muted">
        <ManeuverLimits feasibility={feasibility} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 text-sm text-fg-muted">
      <p className="m-0">
        <InlineMath text={actuatorLaw(settings.actuator === 'magnetopar')} />
      </p>
      <p className="m-0">{lapseStatement(speed)}</p>
    </div>
  );
}
