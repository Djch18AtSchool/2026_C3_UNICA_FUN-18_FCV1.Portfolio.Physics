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
  CURVE_NOTE,
  HOSE_OPTIONS,
  LAYOUT_OPTIONS,
  OCP_TARGET,
  OVERSUPPLY_TO_TRIPLE,
  plateNote,
  presetIdFor,
  PWM_RANGE,
  RETURN_NOTE,
  RULE,
  valueOrigins,
} from './coolingLabText';
import {
  pumpNote,
  rackSummary,
  readoutLabels,
  shortfallNote,
  statusChips,
} from './coolingLabReadings';

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
      'presiones',
      'placa',
      'racks',
      'objetivo',
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
    expect(rows.objetivo.origin).toBe('calculo');
    expect(plain(rows.objetivo.text)).toBe('Objetivo de diseño por servidor, 6,38 L/min');
    expect(plain(rows.objetivo.source)).toMatch(
      /^Cálculo propio: el objetivo típico de OCP, 1,5 L\/min por kW \(recomienda de 1,25 a 2,0\), por los 4,25 kW de cada servidor, su parte de los 102 kW que el líquido saca de un rack MGX de 120 kW \(85 %\)/,
    );
    expect(rows.presiones.origin).toBe('ilustrativo');
    expect(plain(rows.presiones.text)).toBe(
      'Presión de retorno al CDU, 220,1 kPa abs; la de impulsión, 400,0 kPa abs',
    );
    expect(plain(rows.presiones.source)).toMatch(
      /^Supuesto: el CDU sostiene su presión de retorno, como lo haría su tanque de expansión; tomo la de la referencia, los 400,0 kPa abs de entrada de GF menos su caída de 179,9 kPa \(cálculo propio\)/,
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
  test('the readouts name the server that gets least, and OCP’s target as a target (R28)', () => {
    expect(readoutLabels(REFERENCE).worst).toBe('Caudal del servidor 24, el más lejano');
    expect(readoutLabels(REFERENCE).target).toBe(
      'Objetivo de diseño de OCP por servidor (1,5 L/min por kW)',
    );
    const reverse = sceneOf({ ...INITIAL_COOLING_STATE, layout: 'invertido' });
    expect(readoutLabels(reverse).worst).toBe('Caudal del servidor 12, el peor servido');
  });

  test('the chips: the farthest reaches OCP’s design target at the reference, not at 150 L/min (R28)', () => {
    expect(statusChips(REFERENCE, null).map((chip) => chip.text)).toEqual([
      'El servidor más lejano alcanza el objetivo de diseño de OCP (1,5 L/min por kW)',
      'Cada UQD04 pasa de su caudal nominal',
    ]);
    const short = sceneOf({ ...INITIAL_COOLING_STATE, pumpFlow: 150 });
    expect(statusChips(short, null)[0].text).toBe(
      'El servidor más lejano está por debajo del objetivo de diseño de OCP (1,5 L/min por kW)',
    );
    const mgx = sceneOf(presetState('mgx44'));
    expect(statusChips(mgx, null)[1].text).toBe('Cada UQD04 va dentro de su caudal nominal');
    const reverse = sceneOf({ ...INITIAL_COOLING_STATE, layout: 'invertido', pumpFlow: 150 });
    expect(statusChips(reverse, null)[0].text).toMatch(/^El servidor peor servido está por debajo/);
    const said = [REFERENCE, short, mgx, reverse].flatMap((scene) => [
      ...statusChips(scene, null).map((chip) => chip.text),
      shortfallNote(scene),
      rackSummary(scene),
    ]);
    expect(said.join(' ')).not.toMatch(/mínimo/);
  });

  test('only a split that does not converge says so; values outside the model say that instead', () => {
    expect(statusChips(REFERENCE, 'reparto')[0]).toEqual({
      id: 'fallo',
      text: 'El reparto no converge con estos valores',
    });
    expect(statusChips(REFERENCE, 'valores')[0]).toEqual({
      id: 'fallo',
      text: 'Estos valores quedan fuera del modelo',
    });
  });

  test('the shortfall: the margin over OCP’s target, or how much more flow and power it takes', () => {
    expect(plain(shortfallNote(REFERENCE))).toBe(
      'El servidor 24, el más lejano, recibe 7,18 L/min: un 12,7 % más que el objetivo de diseño de OCP (1,5 L/min por kW), 6,38 L/min por servidor.',
    );
    const short = sceneOf({ ...INITIAL_COOLING_STATE, pumpFlow: 150 });
    expect(plain(shortfallNote(short))).toBe(
      'El servidor 24 está por debajo del objetivo de diseño de OCP (1,5 L/min por kW): para alcanzarlo, el caudal de la bomba tiene que subir un 2,1 %, a 153,1 L/min por rack, y la potencia de bombeo se multiplica por 1,06.',
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

  test('beyond the measured 650 GPM, the pump note says the curves end there', () => {
    const beyond = {
      ...REFERENCE,
      pump: { ...REFERENCE.pump, duty: { Q: 0.05, dp: 4e5 }, curve: null, operating: null },
    };

    expect(plain(pumpNote(beyond))).toMatch(
      /Ese caudal pasa de los 650 GPM de las curvas publicadas de Deschutes\.$/,
    );
  });

  test('one server is «servidor», in the origins and in the drawing’s name', () => {
    const one = { ...INITIAL_COOLING_STATE, servers: 1 };
    const scene = sceneOf(one);

    expect(valueOrigins(one, scene).find((row) => row.id === 'servidores')?.text).toBe(
      '1 servidor en el rack',
    );
    expect(rackSummary(scene)).toMatch(/^Rack de 1 servidor con retorno directo/);
  });

  test('the rack in words, for the drawing’s accessible name', () => {
    expect(plain(rackSummary(REFERENCE))).toBe(
      'Rack de 24 servidores con retorno directo: el líquido entra abajo por el manifold de impulsión y sale abajo por el de retorno. Cada barra es el caudal de un servidor, y la línea discontinua, el objetivo de diseño de OCP (1,5 L/min por kW): 6,38 L/min por servidor. El servidor 24, el más lejano, recibe 7,18 L/min.',
    );
    const reverse = sceneOf({ ...INITIAL_COOLING_STATE, layout: 'invertido' });
    expect(rackSummary(reverse)).toMatch(/sale arriba por el de retorno/);
  });
});

describe('the lab’s fixed lines, computed from the data', () => {
  test('OCP’s rule and the published curves’ range are formatted from the data, not copied', () => {
    expect(RULE).toBe('1,5 L/min por kW');
    expect(OCP_TARGET).toBe('objetivo de diseño de OCP (1,5 L/min por kW)');
    expect(PWM_RANGE).toBe('de 33 a 100 % PWM');
  });

  test('the plate in use comes with the base preset, and the note names both', () => {
    expect(plain(plateNote(INITIAL_COOLING_STATE))).toBe(
      'Placa fría de «Referencia: 24 servidores (RD109)»: 1,2 bar a 7,19 L/min, un supuesto; «MGX: 44 puertos» trae la suya, a 3,86 L/min.',
    );
    expect(plain(plateNote(presetState('mgx44')))).toMatch(
      /^Placa fría de «MGX: 44 puertos»: 1,2 bar a 3,86 L\/min/,
    );
  });

  test('what the model leaves out: the held return pressure (R27) and the lowest published curve', () => {
    expect(plain(RETURN_NOTE)).toBe(
      'Supongo que el CDU sostiene su presión de retorno, como lo haría su tanque de expansión, en 220,1 kPa abs: la de la referencia, los 400,0 kPa abs de entrada de GF menos su caída. La impulsión es esa más la caída del circuito, así que el perfil y la gráfica de la bomba dan la misma $\\Delta p$; dentro del rack, la presión baja además $\\rho g y$ al subir.',
    );
    expect(CURVE_NOTE).toBe(
      'De las 9 curvas publicadas de Deschutes, uso la más baja que alcanza el caudal; no interpolo entre curvas.',
    );
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
