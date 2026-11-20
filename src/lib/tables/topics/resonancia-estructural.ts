/**
 * Tables of Tema 12, in the order of the page: Sétra's footbridge ranges and the march (Paso 3),
 * the Millennium Bridge (Paso 3), the torsional flutter of the Tacoma (Paso 4), the Tacoma facts
 * (Paso 4) and my frame-by-frame measurement of the 1940 film (Paso 4). Published values come from
 * src/lib/data with their source; every derived number is computed here with the resonance core
 * (cálculo propio), and each row says which kind it is.
 */
import {
  BROUGHTON,
  MARCH_PACE,
  MARCH_PACE_HZ,
  MILLENNIUM,
  PEDESTRIAN,
  PEDESTRIAN_FORCES,
  SETRA_RANGES,
  STEEL_FOOTBRIDGE_DAMPING,
  TACOMA,
  TACOMA_SI,
  TACOMA_TORSION,
  type SourcedRange,
  type SourcedValue,
} from '../../data/bridges';
import type { ValueOrigin } from '../../data/origin';
import { FLUTTER_TABLE, FLUTTER_WINDS_MPH, tacomaNetDamping } from '../../data/tacomaFlutter';
import { formatNumber } from '../../format';
import {
  criticalPedestrians,
  energyGrowthPerCycle,
  resonanceGain,
  troopForceAmplitude,
} from '../../physics/resonance';
import type { DataTableSpec, TableCell, TableColumn } from '../types';

const NONE = '—';
const PERCENT = 100;
const N_PER_KN = 1000;
const KG_PER_T = 1000;
const SECONDS_PER_MINUTE = 60;

const ORIGIN_LABELS: Readonly<Record<ValueOrigin, string>> = {
  producto: 'Dato publicado',
  calculo: 'Cálculo propio',
  ilustrativo: 'Ilustrativo',
};
const EXTRAPOLATED = 'Extrapolado (cálculo propio)';

const comma = (value: number, decimals: number) => formatNumber(value, { precision: decimals });
const span = (min: number, max: number, decimals: number) =>
  `${comma(min, decimals)}–${comma(max, decimals)}`;

/** The five columns of a table of facts: what, how much, in what, which kind, from where. */
const FACT_COLUMNS: readonly TableColumn[] = [
  { key: 'magnitud', label: 'Magnitud', align: 'text', minWidthCh: 24 },
  { key: 'valor', label: 'Valor', align: 'num', precision: 2 },
  { key: 'unidad', label: 'Unidad', align: 'text' },
  { key: 'origen', label: 'Origen', align: 'text' },
  // Sources run to ~200 characters: at 40ch a phone row is a few lines, and a desktop table
  // still fits its frame.
  { key: 'fuente', label: 'Fuente', align: 'text', minWidthCh: 40 },
];

interface Fact {
  magnitud: string;
  valor: string;
  unidad: string;
  origin: ValueOrigin;
  fuente: string;
}

const factRow = ({ magnitud, valor, unidad, origin, fuente }: Fact): Record<string, TableCell> => ({
  magnitud,
  valor,
  unidad,
  origen: ORIGIN_LABELS[origin],
  fuente,
});

/** A published or computed value with its own source line. */
const value = (entry: SourcedValue, decimals: number, scale = 1) => ({
  valor: comma(entry.value * scale, decimals),
  origin: entry.origin,
  fuente: entry.source,
});
const valueRange = (entry: SourcedRange, decimals: number, scale = 1) => ({
  valor: span(entry.min * scale, entry.max * scale, decimals),
  origin: entry.origin,
  fuente: entry.source,
});
const own = (number: number, decimals: number, how: string) => ({
  valor: comma(number, decimals),
  origin: 'calculo' as const,
  fuente: `Cálculo propio: ${how}`,
});

// ---------------------------------------------------------------------------------------------
// Paso 3: Sétra and the march

const STEEL = STEEL_FOOTBRIDGE_DAMPING.value;
const SOLDIERS = BROUGHTON.soldiersOnBridge.value;
const F1 = PEDESTRIAN_FORCES.verticalN.value;
const inStepKn = troopForceAmplitude(F1, new Array<number>(SOLDIERS).fill(0)) / N_PER_KN;
const breakingStepKn = (Math.sqrt(SOLDIERS) * F1) / N_PER_KN;

const SETRA_TABLE: DataTableSpec = {
  id: 'resonancia-estructural-setra',
  caption:
    'Pasarelas según la guía de Sétra y el paso militar. El rango 1 es el de riesgo máximo de resonancia; el paso de 2,0 Hz cae dentro del vertical. Las fuerzas son amplitudes por persona; la fila de 60 soldados aplica la (12.5) con todos en fase o con fases al azar (valor cuadrático medio).',
  columns: FACT_COLUMNS,
  rows: [
    {
      magnitud: 'Rango 1 vertical, riesgo máximo de resonancia',
      ...valueRange(SETRA_RANGES.vertical, 1),
      unidad: 'Hz',
    },
    { magnitud: 'Rango 1 lateral', ...valueRange(SETRA_RANGES.lateral, 1), unidad: 'Hz' },
    { magnitud: 'Marcha normal', ...valueRange(PEDESTRIAN.walkingHz, 1), unidad: 'Hz' },
    { magnitud: 'Paso militar (quick time)', ...value(MARCH_PACE, 0), unidad: 'pasos/min' },
    {
      magnitud: 'Paso militar, en hercios',
      ...own(MARCH_PACE_HZ, 1, '120 pasos/min ÷ 60'),
      unidad: 'Hz',
    },
    {
      magnitud: 'Fuerza vertical de un peatón, $F_1 = 0{,}4\\,G_0$',
      ...value(PEDESTRIAN_FORCES.verticalN, 0),
      unidad: 'N',
      fuente: `${PEDESTRIAN_FORCES.verticalN.source}, con $G_0$ de Sétra, §1.2.1`,
    },
    {
      magnitud: 'Fuerza lateral de un peatón, $0{,}05\\,G_0$, a $f_m/2$',
      ...value(PEDESTRIAN_FORCES.lateralN, 0),
      unidad: 'N',
      fuente: `${PEDESTRIAN_FORCES.lateralN.source}, con $G_0$ de Sétra, §1.2.1`,
    },
    {
      magnitud: 'Amortiguamiento de cálculo, pasarela de acero',
      ...value(STEEL_FOOTBRIDGE_DAMPING, 1, PERCENT),
      unidad: '%',
    },
    {
      magnitud: 'Ancho del pico, $2\\zeta f_0$, con $f_0$ = 2,0 Hz',
      ...own(2 * STEEL * MARCH_PACE_HZ, 3, '2 × 0,004 × 2,0 Hz'),
      unidad: 'Hz',
    },
    {
      magnitud: 'Amplificación en resonancia, $1/(2\\zeta)$',
      ...own(resonanceGain(STEEL), 0, '1/(2 × 0,004), (12.3)'),
      unidad: NONE,
    },
    {
      magnitud: '60 soldados al paso, $N F_1$',
      ...own(inStepKn, 1, `60 × ${comma(F1, 0)} N, (12.5)`),
      unidad: 'kN',
    },
    {
      magnitud: '60 soldados rompiendo el paso, $\\sqrt{N}\\,F_1$',
      ...own(breakingStepKn, 1, `√60 × ${comma(F1, 0)} N, (12.5)`),
      unidad: 'kN',
    },
  ].map(factRow),
  source: {
    text: 'Sétra/AFGC (2006), tablas 1.1, 2.3, 2.4 y 2.6 y §1.2.1; FM 3-21.5 (2003), párr. 4-5e; unos 60 soldados sobre el puente de Broughton según The Philosophical Magazine (1831); el resto, cálculo propio con las ecuaciones (12.3) y (12.5)',
  },
};

// ---------------------------------------------------------------------------------------------
// Paso 3: the Millennium Bridge

const { cl1Measured, lateralForceCoefficient: KP } = MILLENNIUM;
const CL1 = {
  f: cl1Measured.frequencyHz.value,
  M: cl1Measured.modalMassKg.value,
  zeta: cl1Measured.dampingRatio.value,
};
const DAMPED_ZETA = MILLENNIUM.dampingAfter.max;
const nAsBuilt = criticalPedestrians(CL1.zeta, CL1.f, CL1.M, KP.value);
const nDamped = criticalPedestrians(DAMPED_ZETA, CL1.f, CL1.M, KP.value);

const MILLENNIUM_TABLE: DataTableSpec = {
  id: 'resonancia-estructural-millennium',
  caption:
    'Millennium Bridge, primer modo lateral del vano central (CL1), medido. $N_L$ es la (12.8) con un reparto uniforme de la gente; el umbral de 166 personas se midió en el vano norte, con otro modo y otra masa modal, así que no se compara con él directamente.',
  columns: FACT_COLUMNS,
  rows: [
    { magnitud: 'Frecuencia de CL1, $f$', ...value(cl1Measured.frequencyHz, 2), unidad: 'Hz' },
    {
      magnitud: 'Masa modal de CL1, $M$',
      ...value(cl1Measured.modalMassKg, 0, 1 / KG_PER_T),
      unidad: 't',
    },
    {
      magnitud: 'Amortiguamiento original',
      ...valueRange(MILLENNIUM.dampingBefore, 1, PERCENT),
      unidad: '%',
    },
    {
      magnitud: 'Amortiguamiento que uso, $\\zeta$',
      ...value(cl1Measured.dampingRatio, 1, PERCENT),
      unidad: '%',
    },
    {
      magnitud: 'Coeficiente de fuerza lateral, $k_p$',
      ...value(KP, 0),
      unidad: 'N·s/m',
    },
    {
      magnitud: '$N_L$ con la (12.8), tal como se construyó',
      ...own(nAsBuilt, 0, '$8\\pi$ × 0,007 × 0,48 Hz × 130 000 kg ÷ 300 N·s/m'),
      unidad: 'personas',
    },
    {
      magnitud: 'Umbral medido en el vano norte, sin amortiguadores',
      ...value(MILLENNIUM.northSpanCriticalPedestrians, 0),
      unidad: 'personas',
    },
    {
      magnitud: 'Amortiguadores viscosos añadidos',
      ...value(MILLENNIUM.viscousDampers, 0),
      unidad: NONE,
    },
    {
      magnitud: 'Amortiguamiento tras la reforma',
      ...valueRange(MILLENNIUM.dampingAfter, 0, PERCENT),
      unidad: '%',
    },
    {
      magnitud: '$N_L$ con la (12.8) y $\\zeta$ = 20 %',
      ...own(nDamped, 0, 'el mismo modo CL1 con $\\zeta$ = 0,20'),
      unidad: 'personas',
    },
    {
      magnitud: 'Amplificación en resonancia antes, $1/(2\\zeta)$',
      ...own(resonanceGain(CL1.zeta), 0, '1/(2 × 0,007)'),
      unidad: NONE,
    },
    {
      magnitud: 'Amplificación en resonancia después, $1/(2\\zeta)$',
      ...own(resonanceGain(DAMPED_ZETA), 1, '1/(2 × 0,20)'),
      unidad: NONE,
    },
  ].map(factRow),
  source: {
    text: 'Dallard et al., The Structural Engineer 79(22) (2001), tablas 1-3 y págs. 26-27; Newland, ICSV9 (2002); el resto, cálculo propio con las ecuaciones (12.3) y (12.8)',
  },
};

// ---------------------------------------------------------------------------------------------
// Paso 4: torsional flutter of the Tacoma

function flutterRow(windMph: number): Record<string, TableCell> {
  const net = tacomaNetDamping(windMph);
  if (!net) throw new Error(`resonancia-estructural: Billah y Scanlan no dan A₂* a ${windMph} mph`);
  const row = FLUTTER_TABLE.rows.find((candidate) => candidate.windMph === windMph);
  return {
    viento: windMph,
    zetaTabla: row ? row.zeta : NONE,
    a2: net.a2,
    zetaNeto: net.zetaNet,
    energia: energyGrowthPerCycle(net.zetaNet) * PERCENT,
    origen: net.isExtrapolated ? EXTRAPOLATED : ORIGIN_LABELS[FLUTTER_TABLE.origin],
  };
}

const FLUTTER: DataTableSpec = {
  id: 'resonancia-estructural-aleteo',
  caption:
    'Aleteo de la torsión del Tacoma con $\\zeta_s$ = 0,005. Cada fila de la Tabla I de Billah y Scanlan es el viento al que $A_2^*$ anula un amortiguamiento mecánico $\\zeta$; con el del puente, la (12.11) da $\\zeta_\\text{neto}$, y la (12.12) la energía que gana o pierde en cada periodo natural, $e^{-4\\pi\\zeta_\\text{neto}} - 1$. La fila de 42 mph prolonga en recta los dos últimos puntos de la tabla: es una extrapolación, no un dato.',
  columns: [
    { key: 'viento', label: 'Viento $U$', unit: 'mph', align: 'num', precision: 1 },
    { key: 'zetaTabla', label: '$\\zeta$ de la Tabla I', align: 'num', precision: 3 },
    { key: 'a2', label: '$A_2^*$', align: 'num', precision: 3 },
    { key: 'zetaNeto', label: '$\\zeta_\\text{neto}$', align: 'num', precision: 3 },
    {
      key: 'energia',
      label: 'Energía por ciclo, $\\Delta E/E$',
      unit: '%',
      align: 'num',
      precision: 1,
    },
    { key: 'origen', label: 'Origen de $A_2^*$', align: 'text' },
  ],
  rows: FLUTTER_WINDS_MPH.map(flutterRow),
  source: {
    text: 'Billah y Scanlan, Am. J. Phys. 59(2) (1991), Tabla I y ecuación (6), pág. 123; $\\zeta_\\text{neto}$, energía y extrapolación, cálculo propio con las ecuaciones (12.11) y (12.12)',
  },
};

// ---------------------------------------------------------------------------------------------
// Paso 4: the Tacoma Narrows Bridge, 7 November 1940

const torsionHz = TACOMA_SI.torsionHz.value;
const vortexHz = TACOMA_SI.vortexHz.value;

const TACOMA_TABLE: DataTableSpec = {
  id: 'resonancia-estructural-tacoma',
  caption:
    'Puente de Tacoma Narrows, 7 de noviembre de 1940. La torsión empezó hacia las 10:00 con 14 ciclos por minuto y terminó en 12; la frecuencia de los vórtices sale de la (12.9) con el viento de esa mañana.',
  columns: FACT_COLUMNS,
  rows: [
    { magnitud: 'Viento, medido hacia las 9:00', ...value(TACOMA.windMph, 0), unidad: 'mph' },
    {
      magnitud: 'El mismo viento en el SI, $U$',
      ...value(TACOMA_SI.windMs, 1),
      fuente: 'Cálculo propio: 42 mph × 0,44704',
      unidad: 'm/s',
    },
    {
      magnitud: 'Modo vertical de 8 o 9 nodos, esa mañana',
      ...valueRange(TACOMA.verticalCyclesPerMin, 0),
      unidad: 'ciclos/min',
    },
    {
      magnitud: 'Torsión de un nodo, al empezar',
      ...value(TACOMA.torsionStartCyclesPerMin, 0),
      unidad: 'ciclos/min',
    },
    {
      magnitud: 'Torsión de un nodo, al final',
      ...value(TACOMA.torsionCyclesPerMin, 0),
      unidad: 'ciclos/min',
    },
    {
      magnitud: 'Frecuencia de la torsión, $f_0$',
      ...own(torsionHz, 2, '12 ciclos ÷ 60 s'),
      unidad: 'Hz',
    },
    {
      magnitud: 'Giro en los cuartos del vano',
      ...value(TACOMA.quarterPointRotationDeg, 0),
      unidad: '°',
    },
    {
      magnitud: 'Amortiguamiento estructural de la torsión, $\\zeta_s$',
      ...value(TACOMA.torsionDampingRatio, 3),
      unidad: NONE,
    },
    {
      magnitud: 'Amplificación si fuera resonancia forzada, $1/(2\\zeta_s)$',
      ...own(resonanceGain(TACOMA.torsionDampingRatio.value), 0, '1/(2 × 0,005), (12.3)'),
      unidad: NONE,
    },
    {
      magnitud: 'Canto de la viga, $D$',
      ...value(TACOMA_SI.deckDepthM, 2),
      fuente: `Cálculo propio: 8 ft × 0,3048; ${TACOMA.deckDepthFt.source}`,
      unidad: 'm',
    },
    { magnitud: 'Número de Strouhal, $S$', ...value(TACOMA.strouhal, 2), unidad: NONE },
    {
      magnitud: 'Desprendimiento de vórtices, $f_v$ con la (12.9)',
      ...own(vortexHz, 2, '0,11 × 18,8 m/s ÷ 2,44 m'),
      unidad: 'Hz',
    },
    {
      magnitud: 'Vórtices frente a torsión, $f_v/f_0$',
      ...own(vortexHz / torsionHz, 1, '0,85 Hz ÷ 0,20 Hz'),
      unidad: NONE,
    },
  ].map(factRow),
  source: {
    text: 'Ammann, von Kármán y Woodruff, The Failure of the Tacoma Narrows Bridge (Federal Works Agency, 1941), págs. 11, 29-31 y V-9 a V-12; Billah y Scanlan, Am. J. Phys. 59(2) (1991), págs. 120 y 123; conversiones y frecuencias, cálculo propio',
  },
};

// ---------------------------------------------------------------------------------------------
// Paso 4: my measurement of the film

const STRETCH = TACOMA_TORSION.videoFps / TACOMA_TORSION.cameraFps;
const SIGNALS: Readonly<Record<string, string>> = {
  inclinacion: 'Inclinación del horizonte',
  borde: 'Altura del borde del tablero',
};
/** 61,7 → «1:01,7»: an instant of the file, minutes and seconds with one decimal. */
function fileClock(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = comma(seconds - minutes * SECONDS_PER_MINUTE, 1);
  return `${minutes}:${rest.padStart(4, '0')}`;
}
const periodRow = (realS: number) => ({
  real: realS,
  frecuencia: 1 / realS,
  ciclos: SECONDS_PER_MINUTE / realS,
});
const FARQUHARSON_S = SECONDS_PER_MINUTE / TACOMA.torsionCyclesPerMin.value;
const belowFarquharson =
  1 - SECONDS_PER_MINUTE / TACOMA_TORSION.periodRealS / TACOMA.torsionCyclesPerMin.value;

const MEASUREMENT: DataTableSpec = {
  id: 'resonancia-estructural-medicion',
  caption: `Mi medición del periodo de torsión en tres tomas del video, cuadro a cuadro. Elliott filmó a ${TACOMA_TORSION.cameraFps} cuadros por segundo y el video los pasa como si fueran ${TACOMA_TORSION.videoFps}, así que cada periodo real es ${comma(STRETCH, 1)} veces el del video. La media queda un ${comma(belowFarquharson * PERCENT, 0)} % por debajo de los 12 ciclos por minuto que cronometró Farquharson.`,
  columns: [
    { key: 'toma', label: 'Toma', align: 'text', minWidthCh: 16 },
    { key: 'instantes', label: 'Instantes del archivo', align: 'text' },
    { key: 'senal', label: 'Señal que sigo', align: 'text', minWidthCh: 16 },
    { key: 'video', label: 'Periodo en el video', unit: 's', align: 'num', precision: 2 },
    { key: 'real', label: 'Periodo real', unit: 's', align: 'num', precision: 2 },
    { key: 'frecuencia', label: 'Frecuencia real', unit: 'Hz', align: 'num', precision: 3 },
    { key: 'ciclos', label: 'Ciclos por minuto', align: 'num', precision: 1 },
  ],
  rows: [
    ...TACOMA_TORSION.shots.map((shot) => ({
      toma: shot.label,
      instantes: `${fileClock(shot.startS)}–${fileClock(shot.endS)}`,
      senal: SIGNALS[shot.signal],
      video: shot.periodVideoS,
      ...periodRow(shot.periodVideoS * STRETCH),
    })),
    {
      toma: 'Media de las tres tomas',
      instantes: NONE,
      senal: NONE,
      video: TACOMA_TORSION.meanPeriodVideoS,
      ...periodRow(TACOMA_TORSION.periodRealS),
    },
    {
      toma: 'Farquharson, cronómetro (1940)',
      instantes: NONE,
      senal: NONE,
      video: NONE,
      ...periodRow(FARQUHARSON_S),
    },
  ],
  source: {
    text: 'Medición propia (pnpm run data:tacoma, src/data/tacoma-torsion.json) sobre el archivo de Wikimedia Commons; velocidad de las cámaras según Olson, Wolf y Hook, Physics Today 68(11) (2015); 12 ciclos por minuto de Farquharson en el informe federal de 1941, pág. V-12',
  },
};

export const TABLES: readonly DataTableSpec[] = [
  SETRA_TABLE,
  MILLENNIUM_TABLE,
  FLUTTER,
  TACOMA_TABLE,
  MEASUREMENT,
];
