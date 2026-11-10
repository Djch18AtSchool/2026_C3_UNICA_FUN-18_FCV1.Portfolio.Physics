/**
 * Tables of Tema 9 (asistencia gravitatoria), built at import from the Horizons dataset and the
 * constants the computations use; nothing is typed by hand. Jumps: by patched conics
 * (|V⃗_p + v⃗∞| after minus before) and from the data (encounterJump, vis-viva, research §5).
 */
import { GM_SUN, PLANETS, PLANET_IDS } from '../../data/planets';
import { VOYAGER, encounterJump, type Encounter } from '../../data/voyager';
import type { DataTableSpec, TableCell } from '../types';

/** With a no-break space, so a narrow table never splits the name from its number. */
const PROBE_NAMES: Readonly<Record<Encounter['probe'], string>> = {
  V1: 'Voyager\u00a01',
  V2: 'Voyager\u00a02',
};

/** '1979-07-09T22:29Z' → '1979-07-09 22:29'. */
const utcText = (iso: string) => iso.replace('T', ' ').replace('Z', '');

function encounterRow(encounter: Encounter): Record<string, TableCell> {
  const series = encounter.probe === 'V2' ? VOYAGER.series.v2 : VOYAGER.series.v1;
  return {
    sonda: PROBE_NAMES[encounter.probe],
    planeta: PLANETS[encounter.planet].name,
    maximaAproximacion: utcText(encounter.caUtc),
    rp: encounter.rpKm,
    vInfIn: encounter.vInfIn,
    vInfOut: encounter.vInfOut,
    delta: encounter.deltaDeg,
    conicas: encounter.conicAfter - encounter.conicBefore,
    datos: encounterJump(series, encounter.caJd, VOYAGER.gmSun),
  };
}

const ENCUENTROS: DataTableSpec = {
  id: 'asistencia-gravitatoria-encuentros',
  caption:
    'Encuentros de las Voyager: máxima aproximación, sobrevuelo en el marco del planeta y salto de rapidez respecto al Sol, por cónicas empalmadas y por los datos (vis-viva a la distancia del encuentro, con la energía 120 días antes y 120 días después). Para Saturno (V2), Horizons da 03:24 UT y NASA, 01:21 UT; la tabla usa la de Horizons.',
  columns: [
    { key: 'sonda', label: 'Sonda', align: 'text' },
    { key: 'planeta', label: 'Planeta', align: 'text' },
    { key: 'maximaAproximacion', label: 'Máxima aproximación', unit: 'UT', align: 'text' },
    { key: 'rp', label: '$r_p$ desde el centro', unit: 'km', align: 'num', precision: 0 },
    { key: 'vInfIn', label: '$v_\\infty$ de entrada', unit: 'km/s', align: 'num', precision: 3 },
    { key: 'vInfOut', label: '$v_\\infty$ de salida', unit: 'km/s', align: 'num', precision: 3 },
    { key: 'delta', label: 'δ', unit: '°', align: 'num', precision: 1 },
    { key: 'conicas', label: 'Δ|v| por cónicas', unit: 'km/s', align: 'num', precision: 2 },
    { key: 'datos', label: 'Δ|v| por los datos', unit: 'km/s', align: 'num', precision: 2 },
  ],
  rows: VOYAGER.encounters.map(encounterRow),
  source: {
    text: 'NASA/JPL Horizons (trayectorias de diseño de la misión en los seis encuentros), consultado el 30 de octubre de 2026; cálculo propio',
    url: 'https://ssd.jpl.nasa.gov/horizons/',
  },
};

/** No radius is used for the Sun. */
const NO_VALUE = '—';

const CONSTANTES: DataTableSpec = {
  id: 'asistencia-gravitatoria-constantes',
  caption:
    'Constantes de los cálculos del tema: GM del Sol y, de cada planeta, el GM del cuerpo (sin sus lunas, porque el sobrevuelo se calcula en el marco del planeta) y el radio ecuatorial.',
  columns: [
    { key: 'cuerpo', label: 'Cuerpo', align: 'text' },
    { key: 'gm', label: 'GM', unit: 'km³/s²', align: 'num', precision: 2 },
    { key: 'radio', label: 'Radio ecuatorial', unit: 'km', align: 'num', precision: 0 },
  ],
  rows: [
    { cuerpo: 'Sol', gm: GM_SUN, radio: NO_VALUE },
    ...PLANET_IDS.map((id) => ({
      cuerpo: PLANETS[id].name,
      gm: PLANETS[id].gm,
      radio: PLANETS[id].radiusKm,
    })),
  ],
  source: {
    text: 'JPL Astrodynamic Parameters (DE440) para el Sol y cabeceras de datos físicos de JPL Horizons para cada planeta, consultados el 30 de octubre de 2026',
  },
};

export const TABLES: readonly DataTableSpec[] = [ENCUENTROS, CONSTANTES];
