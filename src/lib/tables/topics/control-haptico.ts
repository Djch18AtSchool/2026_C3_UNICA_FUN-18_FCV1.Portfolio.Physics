/**
 * Tables of Tema 5. Every number comes from code at module load: the worked examples of
 * src/lib/data/triggerPresets.ts (the example spring, F₀ and the laboratory's presets, k = 400 N/m
 * from rest and from x₀ = 3 mm), read through triggerReadings, which takes the kernel's Hooke force,
 * elastic energy and piecewise resistance over the assumed travel of src/lib/data/triggerModel.ts.
 * The last table describes the trigger modes of Apple's API (ruling R34: data only this table uses
 * lives here, with its source).
 */
import { TRIGGER_TRAVEL_MM } from '../../data/triggerModel';
import {
  EXAMPLE_SPRING,
  TRIGGER_PRESETS,
  triggerReadings,
  VIBRATION_AMPLITUDE_N,
} from '../../data/triggerPresets';
import { formatNumber } from '../../format';
import type { DataTableSpec } from '../types';

function preset(id: string) {
  const found = TRIGGER_PRESETS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`control-haptico: no existe el preajuste "${id}"`);
  return found;
}

const IDEAL = preset('ideal');
const LATE = preset('tardio');
const IDEAL_SPRING = EXAMPLE_SPRING;
const MM_PER_M = 1000;
const MILLIJOULES_PER_JOULE = 1000;

/** A quarter of the travel, half of it and the bottom: the positions the figures read. */
const QUARTER_MM = TRIGGER_TRAVEL_MM / 4;
const MID_MM = TRIGGER_TRAVEL_MM / 2;
const VIBRATION_N = VIBRATION_AMPLITUDE_N;

const newtons = (value: number) => formatNumber(value, { precision: 1 });
const SPRING_LABEL = `${IDEAL_SPRING.k} N/m`;
const TRAVEL_LABEL = `${TRIGGER_TRAVEL_MM} mm`;

const VIBRATION: DataTableSpec = {
  id: 'control-haptico-vibracion',
  caption: `Fuerza sobre el dedo en tres puntos del recorrido. F₀ = ${newtons(VIBRATION_N)} N es un supuesto del modelo, igual a la fuerza del resorte a ${MID_MM} mm para poder compararlas.`,
  columns: [
    { key: 'x', label: 'Desplazamiento x', unit: 'mm', align: 'num', precision: 0 },
    {
      key: 'vibration',
      label: 'Vibración fija, amplitud F₀',
      unit: 'N',
      align: 'num',
      precision: 1,
    },
    {
      key: 'spring',
      label: `Resorte de ${SPRING_LABEL}, k x`,
      unit: 'N',
      align: 'num',
      precision: 1,
    },
  ],
  rows: [QUARTER_MM, MID_MM, TRIGGER_TRAVEL_MM].map((x) => ({
    x,
    vibration: VIBRATION_N,
    spring: triggerReadings(IDEAL_SPRING, x).hooke,
  })),
  source: {
    text: `Cálculo propio con las ecuaciones (5.1) y (5.2); recorrido de ${TRAVEL_LABEL}, k y F₀ ilustrativos`,
  },
};

function energyRow(point: string, x: number) {
  const { hooke, energy } = triggerReadings(IDEAL_SPRING, x);
  return { point, x, force: hooke, energy, springWork: -energy };
}

/** The worked substitution at the bottom, in SI: F = k x and U = ½ k x² with x = 0,008 m. */
const BOTTOM_M = TRIGGER_TRAVEL_MM / MM_PER_M;
const BOTTOM = triggerReadings(IDEAL_SPRING, TRIGGER_TRAVEL_MM);
const BOTTOM_SUBSTITUTION = [
  `F = ${IDEAL_SPRING.k} · ${formatNumber(BOTTOM_M, { precision: 3 })} = ${newtons(BOTTOM.hooke)} N`,
  `U = ½ · ${IDEAL_SPRING.k} · ${formatNumber(BOTTOM_M, { precision: 3 })}² = ${formatNumber(BOTTOM.energy / MILLIJOULES_PER_JOULE, { precision: 4 })} J = ${formatNumber(BOTTOM.energy, { precision: 1 })} mJ`,
].join(' y ');

const ENERGY: DataTableSpec = {
  id: 'control-haptico-energia',
  caption: `Resorte ideal de ${SPRING_LABEL} a mitad del recorrido y al fondo, donde ${BOTTOM_SUBSTITUTION}; el trabajo de la propia fuerza elástica vale −U (Módulo 2, Tema 03, concepto 03).`,
  columns: [
    { key: 'point', label: 'Punto del recorrido', align: 'text' },
    { key: 'x', label: 'Desplazamiento x', unit: 'mm', align: 'num', precision: 0 },
    { key: 'force', label: 'Fuerza, k x', unit: 'N', align: 'num', precision: 1 },
    {
      key: 'energy',
      label: 'Energía guardada, U = ½ k x²',
      unit: 'mJ',
      align: 'num',
      precision: 1,
    },
    {
      key: 'springWork',
      label: 'Trabajo de la fuerza elástica',
      unit: 'mJ',
      align: 'num',
      precision: 1,
    },
  ],
  rows: [energyRow('A mitad', MID_MM), energyRow('Al fondo', TRIGGER_TRAVEL_MM)],
  source: {
    text: `Cálculo propio con la ecuación (5.2); resorte ideal según Serway y Jewett (2018), fuente 5; k y recorrido de ${TRAVEL_LABEL} ilustrativos`,
  },
};

function triggerRow({ name, values: { k, x0Mm } }: typeof IDEAL) {
  const { force, work } = triggerReadings({ k, x0Mm }, TRIGGER_TRAVEL_MM);
  return { preset: name, k, x0: x0Mm, force, work };
}

const TRIGGER: DataTableSpec = {
  id: 'control-haptico-gatillo',
  caption: `Fuerza del perfil y trabajo del dedo al fondo, a ${TRAVEL_LABEL}, en dos preajustes del laboratorio, con valores ilustrativos.`,
  columns: [
    { key: 'preset', label: 'Preajuste', align: 'text' },
    { key: 'k', label: 'k', unit: 'N/m', align: 'num', precision: 0 },
    { key: 'x0', label: 'x₀', unit: 'mm', align: 'num', precision: 0 },
    { key: 'force', label: 'F al fondo', unit: 'N', align: 'num', precision: 1 },
    { key: 'work', label: 'Trabajo del dedo al fondo', unit: 'mJ', align: 'num', precision: 1 },
  ],
  rows: [IDEAL, LATE].map(triggerRow),
  source: {
    text: `Cálculo propio con las ecuaciones (5.2) y (5.4) sobre src/lib/physics/spring.ts; recorrido supuesto de ${TRAVEL_LABEL}; k y x₀ ilustrativos`,
  },
};

/**
 * Klein's reverse engineering of the trigger effects (fuente 6 of the topic): the firmware takes
 * the resistance as 10 zones of the travel, each with an integer intensity from 0 to 8.
 */
const FIRMWARE_ZONES = 10;
const FIRMWARE_MAX_INTENSITY = 8;
const APPLE_API_URL =
  'https://developer.apple.com/documentation/gamecontroller/gcdualsenseadaptivetrigger';

/** The modes of GCDualSenseAdaptiveTrigger (fuente 2) and how the topic reads each as an F(x). */
const MODES: DataTableSpec = {
  id: 'control-haptico-modos',
  caption: `Los cuatro modos con que la API de Apple programa el gatillo adaptativo del DualSense y cómo leo cada uno como una fuerza F(x). Posiciones e intensidades van de 0 a 1, sin milímetros ni newtons; según la ingeniería inversa de Klein, el firmware recibe la resistencia en ${FIRMWARE_ZONES} zonas del recorrido, cada una con una intensidad entera de 0 a ${FIRMWARE_MAX_INTENSITY}, y la pendiente se redondea a esa escalera.`,
  columns: [
    { key: 'mode', label: 'Modo', align: 'text', minWidthCh: 12 },
    { key: 'parameters', label: 'Parámetros de la API', align: 'text', minWidthCh: 18 },
    { key: 'shape', label: 'Forma de F(x)', align: 'text', minWidthCh: 18 },
    { key: 'equation', label: 'Ecuación del sitio', align: 'text', minWidthCh: 14 },
  ],
  rows: [
    {
      mode: 'Resistencia (feedback)',
      parameters: 'posición de inicio e intensidad',
      shape: 'escalón: nula antes del inicio, constante después',
      equation: 'ninguna; un escalón no es la (5.2)',
    },
    {
      mode: 'Arma (weapon)',
      parameters: 'posición de inicio, posición final e intensidad',
      shape: 'escalón entre las dos posiciones',
      equation: 'ninguna; la «media presión» del instante 4:02',
    },
    {
      mode: 'Vibración (vibration)',
      parameters: 'posición de inicio, amplitud y frecuencia',
      shape: 'oscilación de amplitud fija desde el inicio',
      equation: '(5.1), con posición de inicio nula',
    },
    {
      mode: 'Pendiente (slope feedback)',
      parameters: 'posición de inicio, posición final, intensidad inicial e intensidad final',
      shape: 'recta de la intensidad inicial a la final entre las dos posiciones',
      equation: '(5.4), con intensidad inicial nula',
    },
  ],
  source: {
    text: 'Modos y parámetros: Apple, GCDualSenseAdaptiveTrigger, fuente 2; zonas e intensidades del firmware: ingeniería inversa de Klein (2022), fuente 6; lectura como F(x): del autor',
    url: APPLE_API_URL,
  },
};

export const TABLES: readonly DataTableSpec[] = [VIBRATION, ENERGY, TRIGGER, MODES];
