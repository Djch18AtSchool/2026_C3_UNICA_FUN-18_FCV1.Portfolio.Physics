import { execFileSync } from 'node:child_process';

// Pinned to Costa Rica so CI (UTC) and a local build agree on which calendar day "today" is.
const TIME_ZONE = 'America/Costa_Rica';

/** Spanish long-date label for a date, e.g. "9 de octubre de 2026". */
export function formatBuildDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'long', timeZone: TIME_ZONE }).format(date);
}

/** ISO (YYYY-MM-DD) for the same date, the shape `<time datetime>` expects. */
export function formatBuildDateIso(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date);
}

type GitRunner = () => string;

const runGitLog: GitRunner = () =>
  execFileSync('git', ['log', '-1', '--format=%cI'], { cwd: process.cwd(), encoding: 'utf8' });

/**
 * Date of the last commit (HEAD). Throws, never falls back to "today": a wrong date on a
 * graded portfolio is worse than a failed build.
 */
export function readLastCommitDate(run: GitRunner = runGitLog): Date {
  let output: string;
  try {
    output = run();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `No se pudo leer la fecha del último commit con git (${reason}). ` +
        'Construye el sitio dentro del repositorio y con git instalado.',
    );
  }
  const date = new Date(output.trim());
  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `La salida de git (${JSON.stringify(output.trim())}) no es una fecha válida.`,
    );
  }
  return date;
}

const LAST_UPDATE = readLastCommitDate();

/** Last-update date (last commit), shared by the cover and the footer so both show the same day. */
export const BUILD_DATE_LABEL = formatBuildDateLabel(LAST_UPDATE);
export const BUILD_DATE_ISO = formatBuildDateIso(LAST_UPDATE);
