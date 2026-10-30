/**
 * Tables of Tema 5. Every number comes from code at module load: the laboratory's worked examples
 * (TRIGGER_PRESETS, k = 400 N/m from rest and from x₀ = 3 mm) read through triggerReadings, which
 * applies the kernel's Hooke force, elastic energy and piecewise resistance over the assumed
 * travel of src/lib/data/triggerModel.ts.
 */
import {
  TRIGGER_PRESETS,
  triggerReadings,
  type SpringSettings,
} from '../../../components/topics/control-haptico/triggerScene';
import { TRIGGER_TRAVEL_MM } from '../../data/triggerModel';
import { formatNumber } from '../../format';
import type { DataTableSpec } from '../types';

function preset(id: string) {
  const found = TRIGGER_PRESETS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`control-haptico: no existe el preajuste "${id}"`);
  return found;
}

const IDEAL = preset('ideal');
const LATE = preset('tardio');
const IDEAL_SPRING: SpringSettings = { k: IDEAL.values.k, x0Mm: 0 };

/** A quarter of the travel, half of it and the bottom: the positions the figures read. */
const QUARTER_MM = TRIGGER_TRAVEL_MM / 4;
const MID_MM = TRIGGER_TRAVEL_MM / 2;
/** The fixed vibration's amplitude matches the spring at mid travel, so the two compare. */
const VIBRATION_N = triggerReadings(IDEAL_SPRING, MID_MM).hooke;

const newtons = (value: number) => formatNumber(value, { precision: 1 });
const SPRING_LABEL = `${IDEAL_SPRING.k} N/m`;
const TRAVEL_LABEL = `${TRIGGER_TRAVEL_MM} mm`;

const VIBRATION: DataTableSpec = {
  id: 'control-haptico-vibracion',
  caption: `Fuerza sobre el dedo en tres puntos del recorrido. F₀ = ${newtons(VIBRATION_N)} N es un supuesto del modelo, igual a la fuerza del resorte a ${MID_MM} mm para poder compararlas`,
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

const ENERGY: DataTableSpec = {
  id: 'control-haptico-energia',
  caption: `Resorte ideal de ${SPRING_LABEL} a mitad del recorrido y al fondo; el trabajo de la propia fuerza elástica vale −U (Módulo 2, Tema 03, concepto 03)`,
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
  caption: `Fuerza del perfil y trabajo del dedo al fondo, a ${TRAVEL_LABEL}, en dos preajustes del laboratorio, con valores ilustrativos`,
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

export const TABLES: readonly DataTableSpec[] = [VIBRATION, ENERGY, TRIGGER];
