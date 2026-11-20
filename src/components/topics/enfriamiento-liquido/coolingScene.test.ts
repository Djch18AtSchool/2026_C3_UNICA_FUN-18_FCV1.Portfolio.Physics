import { describe, expect, test } from 'vitest';
import {
  DESCHUTES_PUMP,
  pumpPressure,
  RD109,
  SERVER_HOSES,
  UQD04,
} from '../../../lib/data/liquidCooling';
import { PRESETS } from '../../../lib/data/liquidCoolingCircuit';
import { M3S_PER_LPM, PA_PER_BAR, type ReturnLayout } from '../../../lib/physics/hydraulics';
import {
  coolingScene,
  INITIAL_COOLING_STATE,
  initialModel,
  labConfig,
  presetState,
  PUMP_FLOW,
  snapPumpFlow,
  pumpReading,
  SERVER_COUNT,
  systemCurve,
  withState,
  type CoolingLabState,
  type CoolingScene,
} from './coolingScene';

const LPM = M3S_PER_LPM;
const KPA = 1e3;
const L_PER_M3 = 1e3;

const sceneOf = (state: CoolingLabState): CoolingScene => {
  const scene = coolingScene(state);
  if (!scene) throw new Error('the scene should be valid');
  return scene;
};

describe('the lab state and the rack it builds', () => {
  test('the reference: 172,5 L/min into a rack of 24 servers, GF’s 3/8″ hose, direct return', () => {
    expect(INITIAL_COOLING_STATE).toEqual({
      base: 'referencia24',
      pumpFlow: 172.5,
      hose: '3/8',
      servers: 24,
      layout: 'directo',
    });
    expect(presetState('mgx44')).toEqual({
      base: 'mgx44',
      pumpFlow: 170,
      hose: '3/8',
      servers: 44,
      layout: 'directo',
    });
  });

  test('the preset values land on the sliders’ grids, within their ranges', () => {
    for (const id of ['referencia24', 'mgx44'] as const) {
      const { pumpFlow, servers } = presetState(id);
      expect(Number.isInteger(pumpFlow / PUMP_FLOW.step), id).toBe(true);
      expect(pumpFlow).toBeGreaterThanOrEqual(PUMP_FLOW.min);
      expect(pumpFlow).toBeLessThanOrEqual(PUMP_FLOW.max);
      expect(servers).toBeLessThanOrEqual(SERVER_COUNT.max);
    }
    expect(PUMP_FLOW.min).toBeGreaterThan(0);
    expect(SERVER_COUNT).toEqual({ min: 1, max: 44, step: 1 });
  });

  test('labConfig keeps the base preset’s plate, racks and inlet pressure and takes the four parameters', () => {
    const config = labConfig({ ...INITIAL_COOLING_STATE, hose: '1/4', servers: 12 });
    const reference = PRESETS.referencia24;

    expect(config.rackFlow).toBeCloseTo(reference.rackFlow, 15);
    expect(config.servers).toBe(12);
    expect(config.serverHoseDiameter).toBe(SERVER_HOSES[0].diameter.value);
    expect(config.layout).toBe('directo');
    expect(config.plateDesignFlow).toBe(reference.plateDesignFlow);
    expect(config.racks).toBe(reference.racks);
    expect(config.inletPressure).toBe(reference.inletPressure);
    expect(labConfig(presetState('mgx44')).plateDesignFlow).toBe(PRESETS.mgx44.plateDesignFlow);
  });
});

describe('the scene at the reference: what the page validates against GF', () => {
  const scene = sceneOf(INITIAL_COOLING_STATE);

  test('1,80 bar to the farthest server, and 4,1 kW to pump the 23 L/s of the 8 racks', () => {
    expect(scene.drop / PA_PER_BAR).toBeCloseTo(1.799, 3);
    expect(scene.cduFlow).toBeCloseTo(RD109.cduFlow.value, 12);
    expect(scene.power).toBeCloseTo(scene.drop * scene.cduFlow, 6);
    expect(scene.power / KPA).toBeCloseTo(4.14, 2);
  });

  test('the farthest server, the 24th at the top, gets least: 7,18 L/min against a minimum of 6,375', () => {
    expect(scene.flows).toHaveLength(24);
    expect(scene.flows.reduce((sum, q) => sum + q, 0)).toBeCloseTo(scene.config.rackFlow, 12);
    expect(scene.worst.port).toBe(24);
    expect(scene.worst.flow / LPM).toBeCloseTo(7.1822, 3);
    expect(scene.worst.isFarthest).toBe(true);
    // OCP's 1,5 L/min per kW of the 102 kW an MGX rack gives its liquid, shared by 24 servers.
    expect(scene.minimum / LPM).toBeCloseTo((1.5 * 102) / 24, 10);
    expect(scene.isShort).toBe(false);
    expect(scene.needed).toBe(1);
    expect(scene.neededPower).toBe(1);
  });

  test('each UQD04 carries 7,19 L/min, over its 6,44 L/min nominal', () => {
    expect(scene.config.rackFlow / scene.config.servers / LPM).toBeCloseTo(7.1875, 10);
    expect(scene.isUqdOver).toBe(true);
    expect(sceneOf(presetState('mgx44')).isUqdOver).toBe(false);
    expect(UQD04.nominalFlow.value / LPM).toBeCloseTo(6.44, 10);
  });

  test('the duty point lies between Deschutes’ 50 % and 66 % curves: at 66 % the pump would run at 28,6 L/s', () => {
    const { duty, curve, operating } = scene.pump;

    expect(duty.Q).toBeCloseTo(0.023, 12);
    expect(duty.dp).toBeCloseTo(scene.drop, 6);
    expect(curve?.pwm).toBe(66);
    const fifty = DESCHUTES_PUMP.curves.find((candidate) => candidate.pwm === 50);
    expect(pumpPressure(fifty!, duty.Q)).toBeLessThan(duty.dp);
    expect((operating?.Q ?? 0) * L_PER_M3).toBeCloseTo(28.59, 2);
    expect((operating?.dp ?? 0) / KPA).toBeCloseTo(270.6, 1);
  });

  test('MGX, 44 ports at 170 L/min: 1,52 bar, the 44th server gets least', () => {
    const mgx = sceneOf(presetState('mgx44'));

    expect(mgx.drop / PA_PER_BAR).toBeCloseTo(1.518, 3);
    expect(mgx.worst.port).toBe(44);
    expect(mgx.isShort).toBe(false);
  });
});

describe('the parameters move the split, the drop and the pump', () => {
  test('reverse return: the server that gets least is in the middle, not the farthest', () => {
    const scene = sceneOf({ ...INITIAL_COOLING_STATE, layout: 'invertido' });

    expect(scene.worst.port).toBe(12);
    expect(scene.worst.isFarthest).toBe(false);
    expect(scene.worst.flow / LPM).toBeCloseTo(7.1851, 3);
  });

  test('below 153 L/min the worst server misses its minimum; raising the flow by minimum/worst fixes it', () => {
    const scene = sceneOf({ ...INITIAL_COOLING_STATE, pumpFlow: 150 });

    expect(scene.isShort).toBe(true);
    expect(scene.needed).toBeCloseTo(scene.minimum / scene.worst.flow, 12);
    expect(scene.needed).toBeGreaterThan(1);
    const raised = sceneOf({ ...INITIAL_COOLING_STATE, pumpFlow: 150 * scene.needed + 0.01 });
    expect(raised.worst.flow).toBeGreaterThanOrEqual(raised.minimum);
    // The power grows faster than the flow: P = Δp·Q with Δp ∝ Q^n, n between 1,8 and 2.
    expect(scene.neededPower).toBeGreaterThan(scene.needed ** 2.8);
    expect(scene.neededPower).toBeLessThan(scene.needed ** 3);
  });

  test('a narrower hose raises the drop and the pumping power; a wider one lowers them', () => {
    const [quarter, , gf, half] = SERVER_HOSES.map(
      (hose) => sceneOf({ ...INITIAL_COOLING_STATE, hose: hose.id }).drop,
    );

    expect(quarter).toBeGreaterThan(gf);
    expect(half).toBeLessThan(gf);
  });

  test('fewer servers on the same rack flow: each takes more, and its plate loses more', () => {
    const twelve = sceneOf({ ...INITIAL_COOLING_STATE, servers: 12 });

    expect(twelve.worst.flow / LPM).toBeGreaterThan(14);
    expect(twelve.drop).toBeGreaterThan(sceneOf(INITIAL_COOLING_STATE).drop * 3);
  });
});

/*
 * Review Focus 3: a single server or a tiny hose, at the ends of the flow range, in both layouts:
 * every reading stays finite and the split converges, or the lab says it does not.
 */
describe('extreme inputs keep every reading finite (Review Focus 3)', () => {
  const finite = (scene: CoolingScene) => [
    ...scene.flows,
    scene.worst.flow,
    scene.minimum,
    scene.drop,
    scene.cduFlow,
    scene.power,
    scene.needed,
    scene.neededPower,
    scene.pump.duty.Q,
    scene.pump.duty.dp,
    ...(scene.pump.operating ? [scene.pump.operating.Q, scene.pump.operating.dp] : []),
  ];

  for (const servers of [SERVER_COUNT.min, 2, SERVER_COUNT.max]) {
    for (const hose of SERVER_HOSES.map((candidate) => candidate.id)) {
      for (const pumpFlow of [PUMP_FLOW.min, PUMP_FLOW.max]) {
        for (const layout of ['directo', 'invertido'] as ReturnLayout[]) {
          test(`${servers} servidor(es), manguera de ${hose}″, ${pumpFlow} L/min, retorno ${layout}`, () => {
            const scene = sceneOf({ ...INITIAL_COOLING_STATE, servers, hose, pumpFlow, layout });

            expect(finite(scene).every(Number.isFinite)).toBe(true);
            expect(scene.flows).toHaveLength(servers);
            expect(scene.worst.flow).toBeGreaterThan(0);
          });
        }
      }
    }
  }

  test('a single server takes the whole rack flow, and it is the farthest', () => {
    const scene = sceneOf({ ...INITIAL_COOLING_STATE, servers: 1, hose: '1/4' });

    expect(scene.flows).toEqual([scene.config.rackFlow]);
    expect(scene.worst).toEqual({ port: 1, flow: scene.config.rackFlow, isFarthest: true });
  });

  test('a pump flow that is not positive or not finite gives no scene instead of a throw or NaN', () => {
    for (const pumpFlow of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(coolingScene({ ...INITIAL_COOLING_STATE, pumpFlow })).toBeNull();
    }
    expect(coolingScene({ ...INITIAL_COOLING_STATE, servers: 0 })).toBeNull();
  });

  test('a split that does not converge gives no scene', () => {
    const stuck = () => ({ flows: Array(24).fill(1e-4), converged: false, iterations: 500 });

    expect(coolingScene(INITIAL_COOLING_STATE, stuck)).toBeNull();
  });

  test('a split with a number that is not finite gives no scene', () => {
    const broken = () => ({
      flows: [Number.NaN, ...Array(23).fill(1e-4)],
      converged: true,
      iterations: 3,
    });

    expect(coolingScene(INITIAL_COOLING_STATE, broken)).toBeNull();
  });
});

describe('the lab keeps the last valid scene', () => {
  test('a state whose split does not converge keeps the previous scene and says it', () => {
    const model = initialModel();
    const next = { ...INITIAL_COOLING_STATE, servers: 30 };

    const stuck = withState(model, next, () => null);

    expect(stuck.state).toBe(next);
    expect(stuck.scene).toBe(model.scene);
    expect(stuck.sceneState).toBe(model.sceneState);
    expect(stuck.isConverged).toBe(false);

    const back = withState(stuck, INITIAL_COOLING_STATE);
    expect(back.isConverged).toBe(true);
    expect(back.scene.config.servers).toBe(24);
    expect(back.sceneState).toBe(INITIAL_COOLING_STATE);
  });

  test('the first model is the reference’s scene, converged', () => {
    const model = initialModel();

    expect(model.isConverged).toBe(true);
    expect(model.state).toBe(INITIAL_COOLING_STATE);
    expect(model.scene.drop).toBeCloseTo(sceneOf(INITIAL_COOLING_STATE).drop, 9);
  });
});

describe('pumpReading: the lowest published curve that reaches the duty point', () => {
  const config = labConfig(INITIAL_COOLING_STATE);
  const system = systemCurve(config);

  test('the system curve at the CDU’s flow is the drop to the farthest server', () => {
    expect(system(0.023) / PA_PER_BAR).toBeCloseTo(1.799, 3);
    expect(system(0)).toBe(0);
  });

  test('every lower curve falls short of the duty point; the chosen one reaches it', () => {
    const reading = pumpReading(config, 0.023);
    const curve = reading.curve!;

    expect(pumpPressure(curve, 0.023)).toBeGreaterThanOrEqual(reading.duty.dp);
    for (const lower of DESCHUTES_PUMP.curves.filter((c) => c.pwm < curve.pwm)) {
      expect(pumpPressure(lower, 0.023)).toBeLessThan(reading.duty.dp);
    }
  });

  test('no curve beyond the measured 650 GPM, nor above the 100 % curve', () => {
    const beyond = pumpReading(config, DESCHUTES_PUMP.curveMaxFlow.value * 1.01);
    expect(beyond.curve).toBeNull();
    expect(beyond.operating).toBeNull();

    const steep = pumpReading(
      labConfig({ ...INITIAL_COOLING_STATE, servers: 1, hose: '1/4' }),
      0.03,
    );
    expect(steep.curve).toBeNull();
    expect(Number.isFinite(steep.duty.dp)).toBe(true);
  });

  test('at 40 L/s the 95 % curve reaches the duty point but meets the system past 650 GPM: no operating point', () => {
    const reading = pumpReading(config, 0.04);

    expect(reading.curve?.pwm).toBe(95);
    expect(reading.operating).toBeNull();
    expect(pumpReading(config, 0.035).operating?.Q).toBeGreaterThan(0.035);
  });
});

describe('snapPumpFlow: a value from the pump chart’s cursor onto the slider', () => {
  test('rounds to the 0,5 L/min grid and stays inside 10–300 L/min', () => {
    expect(snapPumpFlow(172.6)).toBe(172.5);
    expect(snapPumpFlow(172.8)).toBe(173);
    expect(snapPumpFlow(2)).toBe(PUMP_FLOW.min);
    expect(snapPumpFlow(1000)).toBe(PUMP_FLOW.max);
    expect(snapPumpFlow(Number.NaN)).toBe(PUMP_FLOW.min);
  });
});
