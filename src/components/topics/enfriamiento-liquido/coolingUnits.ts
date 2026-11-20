/**
 * The units Tema 13's lab prints in, from the SI of the model (m³/s, Pa, W, m), and the numbers it
 * writes with them: one place for the lab's model, texts, plots and readouts.
 */
import { formatNumber } from '../../../lib/format';
import { M3S_PER_LPM, PA_PER_BAR } from '../../../lib/physics/hydraulics';

export const L_PER_M3 = 1e3;
export const PA_PER_KPA = 1e3;
export const W_PER_KW = 1e3;
export const MM_PER_M = 1e3;
export const PERCENT = 100;

/** m³/s → L/min, L/s; Pa → kPa, bar; W → kW. */
export const toLpm = (flow: number) => flow / M3S_PER_LPM;
export const toLitres = (flow: number) => flow * L_PER_M3;
export const toKpa = (pa: number) => pa / PA_PER_KPA;
export const toBar = (pa: number) => pa / PA_PER_BAR;
export const toKw = (watts: number) => watts / W_PER_KW;

/** A plain number in Spanish notation, with its decimals. */
export const number = (value: number, precision: number) => formatNumber(value, { precision });
/** A flow (m³/s) in L/min, 2 decimals by default. */
export const lpm = (flow: number, precision = 2) =>
  formatNumber(toLpm(flow), { precision, unit: 'L/min' });
/** A flow (m³/s) in L/s, 1 decimal. */
export const litres = (flow: number) => formatNumber(toLitres(flow), { precision: 1, unit: 'L/s' });
/** A pressure (Pa) in kPa, 1 decimal. */
export const kpa = (pa: number) => formatNumber(toKpa(pa), { precision: 1, unit: 'kPa' });
