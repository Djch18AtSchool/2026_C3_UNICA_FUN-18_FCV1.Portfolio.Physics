// Pinned to Costa Rica so CI (UTC) and a local build agree on which calendar day "today" is.
const TIME_ZONE = 'America/Costa_Rica';

/** Spanish long-date label for a build date, e.g. "9 de octubre de 2026". */
export function formatBuildDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'long', timeZone: TIME_ZONE }).format(date);
}

/** ISO (YYYY-MM-DD) for the same date, the shape `<time datetime>` expects. */
export function formatBuildDateIso(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date);
}

const BUILD_DATE = new Date();

/** The site's build date, shared by the cover and the footer so both show the same day. */
export const BUILD_DATE_LABEL = formatBuildDateLabel(BUILD_DATE);
export const BUILD_DATE_ISO = formatBuildDateIso(BUILD_DATE);
