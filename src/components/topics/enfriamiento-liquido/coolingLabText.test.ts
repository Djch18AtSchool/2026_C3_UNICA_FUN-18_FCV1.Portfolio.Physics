import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { RD109 } from '../../../lib/data/liquidCooling';
import { formatNumber } from '../../../lib/format';
import { flowFactorForPower } from '../../../lib/physics/hydraulics';
import {
  coolingScene,
  INITIAL_COOLING_STATE,
  presetState,
  type CoolingLabState,
} from './coolingScene';
import {
  COOLING_PRESETS,
  HOSE_OPTIONS,
  LAYOUT_OPTIONS,
  OVERSUPPLY_TO_TRIPLE,
  presetIdFor,
  pumpNote,
  rackSummary,
  readoutLabels,
  shortfallNote,
  statusChips,
  valueOrigins,
} from './coolingLabText';

const sceneOf = (state: CoolingLabState) => {
  const scene = coolingScene(state);
  if (!scene) throw new Error('the scene should be valid');
  return scene;
};
const REFERENCE = sceneOf(INITIAL_COOLING_STATE);
const plain = (text: string) => text.replace(/\s+/g, ' ');

describe('the choices', () => {
  test('four hoses, each with its inner diameter; three-eighths is GF’s 9,5 mm', () => {
    expect(HOSE_OPTIONS.map((option) => plain(option.label))).toEqual([
      '1/4″ (6,35 mm)',
      '5/16″ (7,94 mm)',
      '3/8″ (9,5 mm)',
      '1/2″ (12,7 mm)',
    ]);
    expect(LAYOUT_OPTIONS).toEqual([
      { value: 'directo', label: 'Directo' },
      { value: 'invertido', label: 'Invertido' },
    ]);
  });
});

describe('the two presets', () => {
  test('the reference and MGX, with the names of the data module and the states of the model', () => {
    expect(COOLING_PRESETS.map(({ id, name }) => [id, name])).toEqual([
      ['referencia24', 'Referencia: 24 servidores (RD109)'],
      ['mgx44', 'MGX: 44 puertos'],
    ]);
    expect(COOLING_PRESETS.map((preset) => preset.values)).toEqual([
      presetState('referencia24'),
      presetState('mgx44'),
    ]);
  });

  test('their notes are computed: 1,80 against GF’s 1,98 bar, and the UQD04 over or within its 6,44 L/min', () => {
    const [reference, mgx] = COOLING_PRESETS.map((preset) => plain(preset.note ?? ''));

    expect(reference).toBe(
      'Valida contra GF: hasta el servidor más lejano se pierden 1,80 bar, frente a sus 1,98; cada UQD04 lleva 7,19 L/min, más que sus 6,44 L/min nominales.',
    );
    expect(mgx).toBe(
      'Los 170 L/min del CFD de GF en los 44 puertos del manifold MGX: cada UQD04 lleva 3,86 L/min, dentro de sus 6,44 L/min nominales, y hasta el más lejano se pierden 1,52 bar.',
    );
    for (const preset of COOLING_PRESETS) expect(preset.sourceLabel).toMatch(/GF Piping Systems/);
  });

  test('presetIdFor names a preset only while every value is its own', () => {
    expect(presetIdFor(INITIAL_COOLING_STATE)).toBe('referencia24');
    expect(presetIdFor(presetState('mgx44'))).toBe('mgx44');
    expect(presetIdFor({ ...INITIAL_COOLING_STATE, pumpFlow: 173 })).toBeUndefined();
    expect(presetIdFor({ ...INITIAL_COOLING_STATE, layout: 'invertido' })).toBeUndefined();
  });
});

describe('model vs product: every value of the lab says where it comes from', () => {
  const origins = (state: CoolingLabState) =>
    Object.fromEntries(valueOrigins(state, sceneOf(state)).map((row) => [row.id, row]));

  test('at the reference: GF’s servers and hose, my 172,5 L/min, an assumed layout and plate flow', () => {
    const rows = origins(INITIAL_COOLING_STATE);

    expect(Object.keys(rows)).toEqual([
      'caudal',
      'servidores',
      'manguera',
      'retorno',
      'placa',
      'racks',
      'minimo',
      'bomba',
    ]);
    expect(rows.caudal.origin).toBe('calculo');
    expect(plain(rows.caudal.text)).toBe('Caudal de la bomba por rack, 172,5 L/min');
    expect(rows.servidores.origin).toBe('producto');
    expect(rows.servidores.source).toMatch(/GF.*24 outlets/);
    expect(rows.manguera.origin).toBe('producto');
    expect(rows.retorno.origin).toBe('ilustrativo');
    expect(rows.placa.origin).toBe('ilustrativo');
    expect(rows.racks.origin).toBe('producto');
    expect(rows.minimo.origin).toBe('calculo');
    expect(plain(rows.minimo.source)).toMatch(
      /^Cálculo propio: 1,5 L\/min por kW \(OCP\) por los 4,25 kW de cada servidor, su parte de los 102 kW que el líquido saca de un rack MGX de 120 kW \(85 %\)/,
    );
    expect(rows.bomba.origin).toBe('producto');
    expect(rows.bomba.source).toMatch(/Deschutes.*650 GPM, lectura aproximada/);
  });

  test('an edited value is the reader’s choice; a preset’s value keeps that preset’s source', () => {
    const edited = origins({ ...INITIAL_COOLING_STATE, pumpFlow: 180, hose: '1/4', servers: 44 });

    expect(edited.caudal).toMatchObject({
      origin: 'ilustrativo',
      source: 'Supuesto: valor elegido en el laboratorio',
    });
    expect(edited.manguera.origin).toBe('ilustrativo');
    expect(edited.manguera.source).toMatch(/1\/4″ nominal/);
    expect(edited.servidores.origin).toBe('producto');
    expect(edited.servidores.source).toMatch(/MGX.*44X UQD/);
    expect(origins(presetState('mgx44')).caudal.origin).toBe('producto');
    expect(origins({ ...INITIAL_COOLING_STATE, layout: 'invertido' }).retorno.source).toMatch(
      /^Supuesto: retorno invertido/,
    );
  });
});

describe('what the lab says', () => {
  test('the readouts name the server that gets least: the farthest in direct return', () => {
    expect(readoutLabels(REFERENCE).worst).toBe('Caudal del servidor 24, el más lejano');
    const reverse = sceneOf({ ...INITIAL_COOLING_STATE, layout: 'invertido' });
    expect(readoutLabels(reverse).worst).toBe('Caudal del servidor 12, el peor servido');
  });

  test('the chips: it reaches its minimum at the reference, not at 150 L/min; the UQD04 is over its nominal', () => {
    expect(statusChips(REFERENCE, true).map((chip) => chip.text)).toEqual([
      'El servidor más lejano llega a su mínimo',
      'Cada UQD04 pasa de su caudal nominal',
    ]);
    const short = sceneOf({ ...INITIAL_COOLING_STATE, pumpFlow: 150 });
    expect(statusChips(short, true)[0].text).toBe('El servidor más lejano no llega a su mínimo');
    const mgx = sceneOf(presetState('mgx44'));
    expect(statusChips(mgx, true)[1].text).toBe('Cada UQD04 va dentro de su caudal nominal');
    const reverse = sceneOf({ ...INITIAL_COOLING_STATE, layout: 'invertido', pumpFlow: 150 });
    expect(statusChips(reverse, true)[0].text).toBe(
      'El servidor peor servido no llega a su mínimo',
    );
  });

  test('a split that does not converge says so first', () => {
    expect(statusChips(REFERENCE, false)[0]).toEqual({
      id: 'reparto',
      text: 'El reparto no converge con estos valores',
    });
  });

  test('the shortfall: the margin over the minimum, or how much more flow and power it takes', () => {
    expect(plain(shortfallNote(REFERENCE))).toBe(
      'El servidor 24, el más lejano, recibe 7,18 L/min: un 12,7 % más que su mínimo de 6,38 L/min.',
    );
    const short = sceneOf({ ...INITIAL_COOLING_STATE, pumpFlow: 150 });
    expect(plain(shortfallNote(short))).toBe(
      'Para que el servidor 24 llegue a su mínimo, el caudal de la bomba tiene que subir un 2,1 %, a 153,1 L/min por rack, y la potencia de bombeo se multiplica por 1,06.',
    );
  });

  test('the pump: the duty point, the lowest published curve that gives it and where it would run', () => {
    expect(plain(pumpNote(REFERENCE))).toBe(
      'Para mover 23,0 L/s por los 8 racks, la bomba tiene que vencer 179,9 kPa: el punto pedido. La curva publicada más baja que lo da es la de 66 % PWM; a esa velocidad fija, la bomba trabajaría en 28,6 L/s y 270,6 kPa. El control por omisión de Deschutes ajusta la velocidad para sostener una $\\Delta p$ fija: con la del punto pedido, la bomba se queda en él.',
    );
    const fast = sceneOf({ ...INITIAL_COOLING_STATE, pumpFlow: 300 });
    expect(plain(pumpNote(fast))).toMatch(
      /la de 95 % PWM, pero a esa velocidad fija cruzaría la curva del circuito más allá de los 650 GPM medidos\.$/,
    );
    const steep = sceneOf({ ...INITIAL_COOLING_STATE, servers: 1, hose: '1/4', pumpFlow: 225 });
    expect(plain(pumpNote(steep))).toMatch(
      /Ninguna curva publicada de Deschutes, ni la de 100 % PWM, da esa presión a ese caudal\.$/,
    );
  });

  test('the rack in words, for the drawing’s accessible name', () => {
    expect(plain(rackSummary(REFERENCE))).toBe(
      'Rack de 24 servidores con retorno directo: el líquido entra abajo por el manifold de impulsión y sale abajo por el de retorno. Cada barra es el caudal de un servidor, y la línea discontinua, su mínimo de 6,38 L/min. El servidor 24, el más lejano, recibe 7,18 L/min.',
    );
    const reverse = sceneOf({ ...INITIAL_COOLING_STATE, layout: 'invertido' });
    expect(rackSummary(reverse)).toMatch(/sale arriba por el de retorno/);
  });
});

describe('the page’s numbers that point to this lab', () => {
  const mdx = readFileSync(
    join(process.cwd(), 'src/content/topics/enfriamiento-liquido.mdx'),
    'utf8',
  );
  const n = RD109.systemExponent.value;

  test('raising the flow 46 % triples the pumping power, with Δp ∝ Q^1,9: computed, not copied', () => {
    expect(OVERSUPPLY_TO_TRIPLE).toBeCloseTo(flowFactorForPower(3, n) - 1, 15);
    expect(formatNumber(OVERSUPPLY_TO_TRIPLE * 100, { precision: 0 })).toBe('46');
  });

  test('the use case and step 4’s lab caption say the same 46 % and the exponents 1,9 and 2,9', () => {
    const percent = formatNumber(OVERSUPPLY_TO_TRIPLE * 100, { precision: 0 });

    expect(mdx).toContain(`subir el caudal un ${percent} % triplicaría el bombeo (paso 4)`);
    const step4 = mdx.slice(mdx.indexOf('<Step n={4}'), mdx.indexOf('<UseCase>'));
    expect(step4).toContain(`subir el caudal un ${percent} % triplica el bombeo`);
    expect(step4).toContain('$\\Delta p \\propto Q^{1{,}9}$');
    expect(step4).toContain('$Q^{2{,}9}$');
    expect(mdx).not.toContain('51 %');
  });
});
