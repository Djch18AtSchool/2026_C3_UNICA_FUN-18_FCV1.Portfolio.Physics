/**
 * Tables of Tema 3. The habitats come from the circular-motion kernel (solveHabitat with
 * g = 9,81 m/s² and h = 1,80 m); the Stanford torus facts and the comfort criteria are copied
 * from NASA SP-413 and SpinCalc (docs/superpowers/research/2026-10-08-sources.md, sections 7 and 8).
 */
import { formatNumber } from '../../format';
import {
  G_EARTH,
  PERSON_HEIGHT,
  radiusForGravity,
  rpmForGravity,
  solveHabitat,
} from '../../physics';
import { COMFORT } from '../../data/comfortCriteria';
import {
  HABITAT_PRESETS,
  SP413_URL,
  STANFORD_TORUS_SP413,
  type HabitatSettings,
} from '../../data/habitatPresets';
import type { DataTableSpec } from '../types';

const PERCENT = 100;
const NO_VALUE = '—';

/** The (r, rpm) pair a lab preset loads: the single source of the habitats it names. */
function presetValues(id: string): HabitatSettings {
  const preset = HABITAT_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`tablas: falta el preajuste de hábitat ${id}`);
  return preset.values;
}

const TORUS = presetValues('toro-stanford');
const SP413_LIMIT = presetValues('limite-sp413');
/** NASA SP-413: R = 830 m and r = 65 m (habitatPresets.ts); R + r is the SP-413 limit's preset. */
export const STANFORD_TORUS = {
  R: TORUS.r,
  tubeRadius: STANFORD_TORUS_SP413.tubeRadius,
  rpm: TORUS.rpm,
} as const;

const ONE_G_RADIUS_M = 100;
const CENTRIFUGE_RADIUS_M = presetValues('centrifuga-pequena').r;

/** A habitat row: the (r, RPM) pair it is built on and its name. */
const HABITATS: readonly { name: string; r: number; rpm: number }[] = [
  {
    name: 'Centrífuga pequeña',
    r: CENTRIFUGE_RADIUS_M,
    rpm: rpmForGravity(G_EARTH, CENTRIFUGE_RADIUS_M),
  },
  { name: '1 g a 100 m', r: ONE_G_RADIUS_M, rpm: rpmForGravity(G_EARTH, ONE_G_RADIUS_M) },
  { name: '1 g a 2 RPM', r: radiusForGravity(G_EARTH, 2), rpm: 2 },
  {
    name: 'Toro de Stanford: pared interior del tubo',
    r: STANFORD_TORUS.R - STANFORD_TORUS.tubeRadius,
    rpm: STANFORD_TORUS.rpm,
  },
  { name: 'Toro de Stanford: radio mayor R', r: STANFORD_TORUS.R, rpm: STANFORD_TORUS.rpm },
  { name: '1 g a 1 RPM', r: radiusForGravity(G_EARTH, 1), rpm: 1 },
  {
    name: 'Límite de SP-413: punto más exterior del tubo',
    r: SP413_LIMIT.r,
    rpm: SP413_LIMIT.rpm,
  },
];

/** A radius as the page writes it: whole metres as given, a computed radius to 0,1 m. */
const radiusText = (r: number): string =>
  formatNumber(r, { precision: Number.isInteger(r) ? 0 : 1 });

const habitatRows = HABITATS.map(({ name, r, rpm }) => {
  const habitat = solveHabitat({ r, rpm });
  return {
    habitat: name,
    r: radiusText(r),
    rpm,
    omega: habitat.omega,
    v: habitat.v,
    T: habitat.period,
    aC: habitat.aC,
    gRatio: habitat.gRatio,
    gradient: habitat.gradient * PERCENT,
  };
});

const gRatioText = (r: number): string =>
  formatNumber(solveHabitat({ r, rpm: STANFORD_TORUS.rpm }).gRatio, { precision: 2 });
const torusFrom = gRatioText(STANFORD_TORUS.R);
const torusTo = gRatioText(SP413_LIMIT.r);
const innerWall = gRatioText(STANFORD_TORUS.R - STANFORD_TORUS.tubeRadius);

const HABITATS_TABLE: DataTableSpec = {
  id: 'gravedad-artificial-habitats',
  caption: `Hábitats de los pasos 2 a 4 con g = ${formatNumber(G_EARTH, { precision: 2, unit: 'm/s²' })} y h = ${formatNumber(PERSON_HEIGHT, { precision: 2, unit: 'm' })}, ordenados por radio. Según mi cálculo, del radio mayor del Toro de Stanford al punto más exterior del tubo la gravedad aparente va de ${torusFrom} a ${torusTo} g, dentro de los 0,95 ± 0,05 g del informe; la pared interior se queda en ${innerWall} g.`,
  columns: [
    { key: 'habitat', label: 'Hábitat', align: 'text' },
    // Pre-formatted cells: whole metres as given, a computed radius to 0,1 m.
    { key: 'r', label: 'Radio r', unit: 'm', align: 'num', precision: 1 },
    { key: 'rpm', label: 'Giro N', unit: 'RPM', align: 'num', precision: 2 },
    { key: 'omega', label: '$\\omega$', unit: 'rad/s', align: 'num', precision: 4 },
    { key: 'v', label: 'Rapidez del piso v', unit: 'm/s', align: 'num', precision: 1 },
    { key: 'T', label: 'Período T', unit: 's', align: 'num', precision: 1 },
    { key: 'aC', label: '$a_c$', unit: 'm/s²', align: 'num', precision: 2 },
    { key: 'gRatio', label: '$a_c/g$', align: 'num', precision: 2 },
    { key: 'gradient', label: 'Gradiente h/r', unit: '%', align: 'num', precision: 1 },
  ],
  rows: habitatRows,
  source: {
    text: 'Cálculo propio con las ecuaciones (3.2) a (3.4); radios del Toro de Stanford de NASA SP-413, fuente 1',
  },
};

const TORO_TABLE: DataTableSpec = {
  id: 'gravedad-artificial-toro',
  caption:
    'El Toro de Stanford según NASA SP-413, del estudio de verano de 1975, publicado en 1977: geometría y criterios del informe.',
  columns: [
    { key: 'dato', label: 'Dato', align: 'text' },
    { key: 'valor', label: 'Según SP-413', align: 'text' },
  ],
  rows: [
    {
      dato: 'Forma',
      valor: `tubo de ${2 * STANFORD_TORUS.tubeRadius} m de diámetro doblado en una rueda de unos 1 800 m, con seis rayos`,
    },
    { dato: 'Radio mayor R', valor: `${STANFORD_TORUS.R} m` },
    { dato: 'Radio del tubo', valor: `${STANFORD_TORUS.tubeRadius} m` },
    { dato: 'Gravedad para vivir', valor: 'entre 0,9 y 1 g' },
    { dato: 'Giro en las zonas de vivienda', valor: `no más de ${STANFORD_TORUS.rpm} RPM` },
    { dato: 'Gravedad que reporta', valor: `0,95 ± 0,05 g a ${STANFORD_TORUS.rpm} RPM` },
  ],
  source: { text: 'NASA SP-413, fuente 1', url: SP413_URL },
};

/** One author of SpinCalc's comfort table; null where the page gives no value ("?"). */
export interface ComfortCriterion {
  author: string;
  rMin: number | null;
  rpmMax: number | null;
  vMin: number | null;
}

/** SpinCalc's comfort criteria (minimum radius, maximum spin, minimum tangential speed). */
export const COMFORT_CRITERIA: readonly ComfortCriterion[] = [
  { author: 'Hill y Schnitzer (1962)', rMin: null, rpmMax: 4, vMin: 6 },
  { author: 'Gilruth (1969)', rMin: 12, rpmMax: 6, vMin: null },
  { author: 'Gordon y Gervais (1969)', rMin: 12, rpmMax: 6, vMin: 7 },
  { author: 'Stone (1973)', rMin: 4, rpmMax: 6, vMin: 10 },
  { author: 'Cramer (1985)', rMin: null, rpmMax: 3, vMin: 7 },
];

/** "de 3 a 6": the spread the figure draws as a band (COMFORT), which the rows reproduce. */
function spread(key: keyof typeof COMFORT): string {
  const [low, high] = COMFORT[key];
  return `de ${low} a ${high}`;
}

const CONFORT_TABLE: DataTableSpec = {
  id: 'gravedad-artificial-confort',
  caption: `Límites de confort de los cinco autores que recopila SpinCalc. No coinciden: el giro máximo va ${spread('rpmMax')} RPM; el radio mínimo, cuando lo dan, ${spread('rMin')} m, y la velocidad tangencial mínima, ${spread('vMin')} m/s.`,
  columns: [
    { key: 'autor', label: 'Autor', align: 'text' },
    { key: 'rMin', label: 'Radio mínimo', unit: 'm', align: 'num', precision: 0 },
    { key: 'rpmMax', label: 'Giro máximo', unit: 'RPM', align: 'num', precision: 0 },
    {
      key: 'vMin',
      label: 'Velocidad tangencial mínima',
      unit: 'm/s',
      align: 'num',
      precision: 0,
    },
  ],
  rows: COMFORT_CRITERIA.map(({ author, rMin, rpmMax, vMin }) => ({
    autor: author,
    rMin: rMin ?? NO_VALUE,
    rpmMax: rpmMax ?? NO_VALUE,
    vMin: vMin ?? NO_VALUE,
  })),
  source: {
    text: 'SpinCalc de Theodore W. Hall (artificial-gravity.com, desde 2000; última revisión de 2018), fuente 2',
    url: 'https://www.artificial-gravity.com/sw/SpinCalc/',
  },
};

export const TABLES: readonly DataTableSpec[] = [HABITATS_TABLE, TORO_TABLE, CONFORT_TABLE];
