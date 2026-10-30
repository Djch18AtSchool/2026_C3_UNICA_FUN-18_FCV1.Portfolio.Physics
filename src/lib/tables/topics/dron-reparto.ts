/**
 * Tables of Tema 1. The legs come from the declared route (src/lib/data/droneRoute.ts) through the
 * trapezoidal profile of the kinematics kernel; the autopilot defaults are copied from their
 * sources (docs/superpowers/research/2026-10-08-sources.md, sections 5 and 6).
 */
import { DRONE_ROUTE, routeDuration } from '../../data/droneRoute';
import { formatNumber } from '../../format';
import { angle, magnitude, sub, trapezoidalProfile, vec } from '../../physics';
import type { DataTableSpec } from '../types';

const DEGREES_PER_RADIAN = 180 / Math.PI;
const CM_PER_M = 100;
const NO_VALUE = '—';

/** ArduPilot Copter 4.6.3, AC_WPNav.cpp: AP_GROUPINFO("JERK", …, 1.0f), in m/s³ (source 2). */
const ARDUPILOT_JERK_M_S3 = 1;
/** PX4 parameter reference (source 5): MPC_XY_VEL_MAX, MPC_XY_CRUISE, MPC_ACC_HOR, MPC_JERK_AUTO. */
const PX4_DEFAULTS = { vMax: 12, cruise: 5, aMax: 3, jerk: 4 } as const;

const { stops, vMax, aMax } = DRONE_ROUTE;

/** One leg of the route: its arrival stop, length, heading and trapezoidal profile. */
const LEGS = stops.slice(1).map((to, i) => {
  const from = stops[i];
  const delta = sub(vec(to.x, to.y), vec(from.x, from.y));
  const d = magnitude(delta);
  const profile = trapezoidalProfile(d, vMax, aMax);
  const accelDistance = profile.s(vMax / aMax);
  return { from, to, d, theta: angle(delta), profile, cruise: d - 2 * accelDistance };
});

const legRows = LEGS.map(({ from, to, d, theta, profile, cruise }) => ({
  tramo: `${from.name} → ${to.name}`,
  x: to.x,
  y: to.y,
  d,
  theta: theta * DEGREES_PER_RADIAN,
  ax: aMax * Math.cos(theta),
  ay: aMax * Math.sin(theta),
  cruise,
  T: profile.duration,
  dwell: to.dwell,
}));

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

const totalRow = {
  tramo: 'Ruta completa',
  x: NO_VALUE,
  y: NO_VALUE,
  d: sum(legRows.map((row) => row.d)),
  theta: NO_VALUE,
  ax: NO_VALUE,
  ay: NO_VALUE,
  cruise: NO_VALUE,
  T: sum(legRows.map((row) => row.T)),
  dwell: sum(legRows.map((row) => row.dwell)),
};

const shortestCruise = Math.min(...LEGS.map((leg) => leg.cruise));
const isAnyTriangular = LEGS.some((leg) => leg.profile.isTriangular);
const number = (value: number, precision: number, unit: string) =>
  formatNumber(value, { precision, unit });

const triangularText = isAnyTriangular
  ? 'algún tramo es triangular'
  : `el tramo más corto deja ${number(shortestCruise, 1, 'm')} de crucero, así que ningún tramo es triangular`;

const TRAMOS: DataTableSpec = {
  id: 'dron-reparto-tramos',
  caption: `Tramos de la ruta declarada con el perfil del paso 3, v_máx = ${number(vMax, 0, 'm/s')} y a_máx = ${number(aMax, 1, 'm/s²')}: punto de llegada, longitud, rumbo, componentes de la aceleración al arrancar, crucero y duración. Con aceleración y frenado a a_máx, ${triangularText}; con las entregas, la ruta toma ${number(routeDuration(DRONE_ROUTE), 1, 's')}.`,
  columns: [
    { key: 'tramo', label: 'Tramo', align: 'text' },
    { key: 'x', label: 'Llegada, x', unit: 'm', align: 'num', precision: 0 },
    { key: 'y', label: 'Llegada, y', unit: 'm', align: 'num', precision: 0 },
    { key: 'd', label: 'Longitud d', unit: 'm', align: 'num', precision: 1 },
    { key: 'theta', label: 'Rumbo θ', unit: '°', align: 'num', precision: 1 },
    { key: 'ax', label: 'aₓ al arrancar', unit: 'm/s²', align: 'num', precision: 2 },
    { key: 'ay', label: 'a_y al arrancar', unit: 'm/s²', align: 'num', precision: 2 },
    { key: 'cruise', label: 'Crucero, d − 2d_a', unit: 'm', align: 'num', precision: 1 },
    { key: 'T', label: 'Duración T', unit: 's', align: 'num', precision: 1 },
    { key: 'dwell', label: 'Entrega al llegar', unit: 's', align: 'num', precision: 0 },
  ],
  rows: [...legRows, totalRow],
  source: {
    text: 'Ruta declarada por el autor en src/lib/data/droneRoute.ts; tramos calculados con la ecuación (1.3) y los límites de ArduPilot Copter 4.6.3 (fuente 2)',
  },
};

const LIMITES: DataTableSpec = {
  id: 'dron-reparto-limites',
  caption:
    'Límites de trayectoria por defecto de los dos autopilotos, en SI. La sobreaceleración (jerk) es el ritmo de cambio de la aceleración horizontal; ArduPilot 4.6.3 guarda rapidez y aceleración en centímetros, y su lista actual de parámetros les cambia el nombre.',
  columns: [
    { key: 'autopiloto', label: 'Autopiloto', align: 'text' },
    { key: 'vMax', label: 'Rapidez horizontal máx.', unit: 'm/s', align: 'num', precision: 0 },
    {
      key: 'cruise',
      label: 'Rapidez de crucero en misión',
      unit: 'm/s',
      align: 'num',
      precision: 0,
    },
    { key: 'aMax', label: 'Aceleración horizontal', unit: 'm/s²', align: 'num', precision: 1 },
    { key: 'jerk', label: 'Sobreaceleración, jerk', unit: 'm/s³', align: 'num', precision: 0 },
    { key: 'parametros', label: 'Parámetros', align: 'text' },
  ],
  rows: [
    {
      autopiloto: 'ArduPilot Copter 4.6.3',
      vMax,
      cruise: NO_VALUE,
      aMax,
      jerk: ARDUPILOT_JERK_M_S3,
      parametros: `WPNAV_SPEED = ${number(vMax * CM_PER_M, 0, 'cm/s')}, WPNAV_ACCEL = ${number(aMax * CM_PER_M, 0, 'cm/s²')} y un jerk de ${number(ARDUPILOT_JERK_M_S3, 0, 'm/s³')}; en la lista actual, WP_SPD, WP_ACC y WP_JERK`,
    },
    {
      autopiloto: 'PX4',
      ...PX4_DEFAULTS,
      parametros: 'MPC_XY_VEL_MAX, MPC_XY_CRUISE, MPC_ACC_HOR y MPC_JERK_AUTO',
    },
  ],
  source: {
    text: 'Documentación del modo Auto, código de Copter 4.6.3 y lista de parámetros de ArduPilot (fuentes 1, 2 y 3); referencia de parámetros de PX4 (fuente 5)',
  },
};

export const TABLES: readonly DataTableSpec[] = [TRAMOS, LIMITES];
