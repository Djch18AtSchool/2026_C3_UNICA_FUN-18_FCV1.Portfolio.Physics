/**
 * Tables of Tema 4. The load and temperature tables are computed at module load from the
 * illustrative models of src/lib/data/tyreModels.ts (equations 4.2 and 4.3); the two tyres.ini
 * tables copy, as the file writes them, what the MUR team's open example prints
 * (docs/superpowers/research/2026-10-08-sources.md, item 11).
 */
import { formatNumber } from '../../format';
import {
  COMPOUND_WINDOWS,
  LOAD_MODEL,
  loadPoint,
  temperatureModelFor,
} from '../../data/tyreModels';
import { gripVsTemperature } from '../../physics';
import type { DataTableSpec } from '../types';

const PERCENT = 100;
/** The loads the text reads: near zero, the reference load, double it and the plot's end. */
const LOADS_N = [250, 4000, 8000, 10000] as const;
/** The lowest load read, where the power law's effective μ is an artefact of the model, not grip. */
const [ARTEFACT_LOAD_N] = LOADS_N;
/** Cold, the C3 window's edges and its optimum, and hot: the temperatures the text reads. */
const TEMPERATURES_C = [60, 105, 120, 135, 160] as const;

const MUR_SOURCE = {
  text: 'tyres.ini del auto mur_2019 y su tabla de temperatura tcurve_F3soft.lut, rama tyres del repositorio mur-assettocorsa del equipo MUR (Universidad de Melbourne), fuente 3',
  url: 'https://gitlab.eng.unimelb.edu.au/fwongkwok/mur-assettocorsa/-/blob/tyres/mur_2019/data/tyres.ini',
} as const;

const { mu0, fz0, exponent } = LOAD_MODEL.values;
const twoDecimals = (value: number) => formatNumber(value, { precision: 2 });

const LOAD: DataTableSpec = {
  id: 'llantas-f1-carga',
  caption: `Fuerza lateral máxima de los dos modelos y μ efectivo en cuatro cargas. El μ efectivo de ${twoDecimals(loadPoint(ARTEFACT_LOAD_N).muEff)} a ${ARTEFACT_LOAD_N} N es un artefacto del modelo, no un agarre real: la ley de potencia sirve cerca de la carga de referencia y, cuando la carga tiende a cero, da un μ infinito`,
  columns: [
    { key: 'fz', label: 'Carga vertical F_z', unit: 'N', align: 'num', precision: 0 },
    { key: 'linear', label: 'Modelo lineal, μ₀ F_z', unit: 'N', align: 'num', precision: 0 },
    { key: 'real', label: 'Ecuación (4.2), μ(F_z) F_z', unit: 'N', align: 'num', precision: 0 },
    { key: 'muEff', label: 'μ efectivo, μ(F_z)', align: 'num', precision: 2 },
  ],
  rows: LOADS_N.map((fz) => ({ fz, ...loadPoint(fz) })),
  source: {
    text: `Cálculo propio con la ecuación (4.2) y parámetros ilustrativos, no medidos (μ₀ = ${formatNumber(mu0, { precision: 1 })}, F_z0 = ${formatNumber(fz0, { precision: 0 })} N y β = ${formatNumber(exponent, { precision: 1 })}); sensibilidad a la carga según Milliken y Milliken (1995), fuente 6`,
  },
};

const C3_MODEL = temperatureModelFor('C3');
const C3_WINDOW = COMPOUND_WINDOWS.C3.values;
const shareOfPeak = (t: number) => gripVsTemperature(C3_MODEL, t) / C3_MODEL.muPeak;

const TEMPERATURE: DataTableSpec = {
  id: 'llantas-f1-temperatura',
  caption: `Agarre de la campana del C3, ecuación (4.3), en el óptimo, en los bordes de su ventana de 2019 y fuera de ella; dentro de la ventana μ no baja del ${formatNumber(shareOfPeak(C3_WINDOW.from) * PERCENT, { precision: 0 })} % del pico`,
  columns: [
    { key: 't', label: 'Temperatura T', unit: '°C', align: 'num', precision: 0 },
    { key: 'mu', label: 'μ(T)', align: 'num', precision: 2 },
    { key: 'loss', label: 'Pérdida respecto del pico', unit: '%', align: 'num', precision: 0 },
  ],
  rows: TEMPERATURES_C.map((t) => ({
    t,
    mu: gripVsTemperature(C3_MODEL, t),
    loss: (1 - shareOfPeak(t)) * PERCENT,
  })),
  source: {
    text: `Cálculo propio con la ecuación (4.3) y parámetros ilustrativos (μ_pico = ${formatNumber(C3_MODEL.muPeak, { precision: 1 })}, T_ópt = ${C3_MODEL.tOpt} °C y w = ${formatNumber(C3_MODEL.widthAbove, { precision: 1 })} °C a cada lado); ventana del C3 de 2019, generación de 13 pulgadas, de ${C3_WINDOW.from} a ${C3_WINDOW.to} °C según Autosport (Noble, 2019), fuente 1; criterio del agarre máximo menos 3 % de Isola, fuente 2`,
  },
};

const MUR_LOAD: DataTableSpec = {
  id: 'llantas-f1-mur-carga',
  caption:
    'Claves de carga del tyres.ini del auto mur_2019, delante y detrás, escritas como en el archivo',
  columns: [
    { key: 'tyre', label: 'Llanta', align: 'text' },
    { key: 'key', label: 'Clave', align: 'text' },
    { key: 'value', label: 'Valor en el archivo', align: 'text' },
  ],
  rows: [
    { tyre: 'Delantera', key: 'FZ0', value: '1915' },
    { tyre: 'Delantera', key: 'DY_REF', value: '1.80' },
    { tyre: 'Delantera', key: 'LS_EXPY', value: '0.49' },
    { tyre: 'Trasera', key: 'FZ0', value: '2142' },
    { tyre: 'Trasera', key: 'LS_EXPY', value: '0.60' },
  ],
  source: MUR_SOURCE,
};

const MUR_TEMPERATURE: DataTableSpec = {
  id: 'llantas-f1-mur-temperatura',
  caption:
    'La línea PERFORMANCE_CURVE=tcurve_F3soft.lut ;File to use for temperature/grip relation del tyres.ini apunta a una tabla de pares temperatura|multiplicador; copio seis de sus pares, escritos como en el archivo y sin unidad impresa (supongo °C): entre 75 y 100 la llanta da todo su agarre; fría o recalentada, menos',
  columns: [
    { key: 'temperature', label: 'Temperatura', align: 'text' },
    { key: 'multiplier', label: 'Multiplicador del agarre', align: 'text' },
  ],
  rows: [
    { temperature: '0', multiplier: '0.80' },
    { temperature: '40', multiplier: '0.96' },
    { temperature: '75', multiplier: '1.0' },
    { temperature: '100', multiplier: '1.0' },
    { temperature: '140', multiplier: '0.97' },
    { temperature: '240', multiplier: '0.80' },
  ],
  source: MUR_SOURCE,
};

export const TABLES: readonly DataTableSpec[] = [LOAD, TEMPERATURE, MUR_LOAD, MUR_TEMPERATURE];
