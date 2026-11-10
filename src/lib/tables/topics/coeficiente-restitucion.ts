/**
 * Tema 7's tables: e of real balls from their rules and Cross's measurements, and the default
 * restitution threshold and mixing rule of seven physics engines. Every cell is read from
 * src/lib/data at module load; nothing is typed here.
 */
import type { Source } from '../../../content/topicSchema';
import { BALL_STANDARDS, ballStandardById, type BallStandard } from '../../data/ballStandards';
import { ENGINE_RESTITUTION, type EngineRestitutionRow } from '../../data/engineRestitution';
import { formatNumber } from '../../format';
import type { DataTableSpec, TableCell } from '../types';

const NOT_APPLICABLE = '—';
const RANGE = '–';
const CM_PER_M = 100;
/** A drop-test e range is printed to the third decimal, as Cross's 0,728 < e < 0,762. */
const RANGE_DECIMALS = 3;
/** A single measured e is printed as its source does: 0,86 (Cross 2002), 0,49 (Cross 1999). */
const SINGLE_DECIMALS = 2;
/** Rebound heights in cm keep at most one decimal (FIBA's 1 035 mm is 103,5 cm). */
const REBOUND_DECIMALS = 1;

/** Centimetres with only the decimals the value needs: 135, 103,5. */
function centimetres(metres: number): string {
  const cm = Number((metres * CM_PER_M).toFixed(REBOUND_DECIMALS));
  return formatNumber(cm, { precision: Number.isInteger(cm) ? 0 : REBOUND_DECIMALS });
}

/** e as a range for a drop test, or the single measured value (0 exactly for plasticine). */
function restitutionCell(ball: BallStandard): string {
  if (ball.eMin !== ball.eMax) {
    const [low, high] = [ball.eMin, ball.eMax].map((e) =>
      formatNumber(e, { precision: RANGE_DECIMALS }),
    );
    return `${low}${RANGE}${high}`;
  }
  return ball.eMin === 0 ? '0' : formatNumber(ball.eMin, { precision: SINGLE_DECIMALS });
}

function ballRow(ball: BallStandard): Record<string, TableCell> {
  const { test } = ball;
  const isDrop = test.kind === 'drop';
  return {
    pelota: ball.name,
    ensayo: ball.standard,
    caida: isDrop ? Math.round(test.dropHeight * CM_PER_M) : NOT_APPLICABLE,
    rebote: isDrop
      ? `${centimetres(test.reboundMin)}${RANGE}${centimetres(test.reboundMax)}`
      : NOT_APPLICABLE,
    e: restitutionCell(ball),
  };
}

/** "Rod Cross (2002); FIFA (2018)": each author and year once, in order of first use. */
function sourceList(sources: readonly Source[]): string {
  const credits = sources.map((source) => {
    const name = source.authors ?? source.title;
    return source.year ? `${name} (${source.year})` : name;
  });
  return [...new Set(credits)].join('; ');
}

/**
 * Which e are ours: the drop-test ranges ($\sqrt{h'/h}$) and the baseball's $v_2/v_1$ from Cross's Table I;
 * the superball's 0,86 and the plasticine's 0 are printed by Cross himself (research §3.4, §4).
 */
const OWN_CALCULATION = `Los rangos de e de las normas y el ${restitutionCell(ballStandardById('beisbol'))} del béisbol son cálculo propio, con $e = \\sqrt{h'/h}$ y $e = v_2/v_1$; el ${restitutionCell(ballStandardById('superbola'))} de la superbola y el ${restitutionCell(ballStandardById('plastilina'))} de la plastilina son de Cross.`;

const PELOTAS: DataTableSpec = {
  id: 'coeficiente-restitucion-pelotas',
  caption:
    "Coeficiente de restitución de pelotas reales: $e = \\sqrt{h'/h}$ del ensayo de caída de cada norma y $e = v_2/v_1$ de las medidas de Cross.",
  columns: [
    { key: 'pelota', label: 'Pelota', align: 'text' },
    { key: 'ensayo', label: 'Norma o medida', align: 'text' },
    { key: 'caida', label: 'Caída', unit: 'cm', align: 'num', precision: 0 },
    // Ranges written by centimetres and restitutionCell: right-aligned and unbroken as every number.
    { key: 'rebote', label: 'Rebote admitido', unit: 'cm', align: 'num', precision: 1 },
    { key: 'e', label: 'e calculado', align: 'num', precision: 3 },
  ],
  rows: BALL_STANDARDS.map(ballRow),
  source: {
    text: `${sourceList(BALL_STANDARDS.flatMap((ball) => ball.sources))}. ${OWN_CALCULATION}`,
  },
};

const NOT_DOCUMENTED = 'No documentado';

/** The rule as the formula it applies to the two materials' e. */
const COMBINE_FORMULA: Record<EngineRestitutionRow['combine'], string> = {
  max: String.raw`$\max(e_1, e_2)$`,
  average: String.raw`$(e_1 + e_2)/2$`,
  min: String.raw`$\min(e_1, e_2)$`,
  multiply: String.raw`$e_1 \cdot e_2$`,
  sumClamped: String.raw`$\min(e_1 + e_2, 1)$`,
  unknown: 'No documentada',
};

/**
 * Godot's 1 m/s is the threshold of Jolt inside Godot; no value is confirmed for GodotPhysics, so
 * the row says which of the two its threshold belongs to.
 */
const ENGINE_LABELS: Readonly<Record<string, string>> = { Godot: 'Godot (con Jolt)' };

function engineRow(row: EngineRestitutionRow): Record<string, TableCell> {
  const sources =
    row.source.id === row.combineSource.id ? [row.source] : [row.source, row.combineSource];
  return {
    motor: ENGINE_LABELS[row.engine] ?? row.engine,
    umbral: row.threshold ?? NOT_DOCUMENTED,
    mezcla: COMBINE_FORMULA[row.combine],
    fuente: sources.map((source) => source.title).join('; '),
  };
}

function thresholdOf(engine: string): string {
  const row = ENGINE_RESTITUTION.find((candidate) => candidate.engine === engine);
  if (row?.threshold == null) throw new Error(`tablas: falta el umbral de ${engine}`);
  return formatNumber(row.threshold, { precision: 1 });
}

/**
 * Box2D's and PhysX's defaults are written as products in their code (research §3.1, §4); the
 * m/s values in the table are our own multiplication.
 */
const DERIVED_THRESHOLDS = `El ${thresholdOf('Box2D v3')} m/s de Box2D (1.0f × lengthUnits, que vale 1) y el ${thresholdOf('PhysX')} m/s de PhysX (0,2 × PxTolerancesScale::speed, que vale 10) son cálculo propio a partir de su código.`;

const MOTORES: DataTableSpec = {
  id: 'coeficiente-restitucion-motores',
  caption:
    'Umbral de restitución y regla de mezcla por defecto de siete motores de física: por debajo del umbral el choque no rebota, y la regla combina el e de los dos materiales ($e_1$, $e_2$).',
  columns: [
    { key: 'motor', label: 'Motor', align: 'text' },
    { key: 'umbral', label: 'Umbral', unit: 'm/s', align: 'num', precision: 1 },
    { key: 'mezcla', label: 'Mezcla de e', align: 'text' },
    { key: 'fuente', label: 'Fuente', align: 'text' },
  ],
  rows: ENGINE_RESTITUTION.map(engineRow),
  source: {
    text: `${sourceList(ENGINE_RESTITUTION.flatMap((row) => [row.source, row.combineSource]))}. Código fijado por tag o commit. ${DERIVED_THRESHOLDS} Unity no escribe la unidad de su umbral, que es m/s por el de PhysX.`,
  },
};

export const TABLES: readonly DataTableSpec[] = [PELOTAS, MOTORES];
