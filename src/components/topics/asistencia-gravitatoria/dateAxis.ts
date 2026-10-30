/**
 * Time axis of the Voyager chart: Julian dates (the dataset's x) to calendar dates and back,
 * year ticks for the mission view and signed day ticks around a closest approach.
 * Dates are UT; the series are in TDB, about 50 s apart in 1979, far below a day's tick. Pure.
 */
import type { Domain } from '../../lab/plotScales';
import { monoTextWidth } from '../../lab/plotScales';
import { signed } from './flybyFormat';

/** Julian date of 1970-01-01 00:00 UT, the zero of JavaScript time. */
const JD_UNIX_EPOCH = 2440587.5;
const MS_PER_DAY = 86_400_000;
const MINUTES_PER_DAY = 1440;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Steps tried for labelled ticks, smallest first: every year (or day), every other, every fifth. */
const LABEL_STEPS = [1, 2, 5] as const;
/** Smallest clear space (px) between two tick labels: half a character of the 12 px mono font. */
export const MIN_LABEL_GAP = 3;

/** A tick at x (a Julian date); unlabelled ticks are minor. */
export interface AxisTick {
  x: number;
  label?: string;
}

/** Julian date of an ISO date or date-time in UT ('1980-01-01', '1979-07-09T22:29Z'). */
export function jdFromIso(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new RangeError(`Fecha no válida: ${iso}`);
  return ms / MS_PER_DAY + JD_UNIX_EPOCH;
}

/** The UT instant of a Julian date, rounded to the minute. */
function dateOf(jd: number): Date {
  const minutes = Math.round((jd - JD_UNIX_EPOCH) * MINUTES_PER_DAY);
  return new Date(minutes * (MS_PER_DAY / MINUTES_PER_DAY));
}

/** '9 jul 1979'. */
export function formatDate(jd: number): string {
  const date = dateOf(jd);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** '22:29' (UT). */
export function formatTime(jd: number): string {
  const date = dateOf(jd);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/**
 * The smallest step in LABEL_STEPS whose labels, centred `pxPerUnit · step` apart, keep
 * MIN_LABEL_GAP between them.
 */
function labelStep(pxPerUnit: number, labelWidth: number): number {
  const fits = (step: number) => step * pxPerUnit >= labelWidth + MIN_LABEL_GAP;
  return LABEL_STEPS.find(fits) ?? LABEL_STEPS[LABEL_STEPS.length - 1];
}

const DAYS_PER_YEAR = 365.25;

/** A tick on 1 January of every year inside the domain, labelled every year when the labels fit. */
export function yearTicks(domain: Domain, pxPerDay: number, fontSize: number): AxisTick[] {
  const first = dateOf(domain.min).getUTCFullYear();
  const last = dateOf(domain.max).getUTCFullYear();
  const years = Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i);
  const step = labelStep(pxPerDay * DAYS_PER_YEAR, monoTextWidth('0000', fontSize));
  return years
    .map((year) => ({ year, x: jdFromIso(`${year}-01-01`) }))
    .filter(({ x }) => x >= domain.min && x <= domain.max)
    .map(({ year, x }) => (year % step === 0 ? { x, label: String(year) } : { x }));
}

/** A tick every whole day from `centre` inside the domain, labelled with the signed offset. */
export function offsetDayTicks(
  centre: number,
  domain: Domain,
  pxPerDay: number,
  fontSize: number,
): AxisTick[] {
  const first = Math.ceil(domain.min - centre);
  const last = Math.floor(domain.max - centre);
  const step = labelStep(pxPerDay, monoTextWidth(signed(-9, 0), fontSize));
  return Array.from({ length: last - first + 1 }, (_, i) => first + i).map((day) =>
    day % step === 0 ? { x: centre + day, label: signed(day, 0) } : { x: centre + day },
  );
}
