/**
 * Tema 12's prose, captions and marker analyses write some numbers by hand (an MDX string cannot
 * call the core). Each one is formatted here from the data or the core and must appear in the
 * page exactly as printed, so a rerun of `pnpm run data:tacoma` or a change of a sourced value
 * cannot leave the text behind silently.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  BROUGHTON,
  MILLENNIUM,
  PEDESTRIAN_FORCES,
  TACOMA,
  TACOMA_SI,
  TACOMA_TORSION,
} from '../lib/data/bridges';
import { FLUTTER_TABLE, tacomaNetDamping } from '../lib/data/tacomaFlutter';
import { KLIPPER } from '../lib/data/klipper';
import { formatNumber } from '../lib/format';
import { criticalPedestrians, energyGrowthPerCycle, resonanceGain } from '../lib/physics/resonance';

const MDX = readFileSync(
  join(process.cwd(), 'src/content/topics/resonancia-estructural.mdx'),
  'utf8',
);
const comma = (value: number, decimals: number) => formatNumber(value, { precision: decimals });
const PERCENT = 100;
const SECONDS_PER_MINUTE = 60;

const stretch = TACOMA_TORSION.videoFps / TACOMA_TORSION.cameraFps;
const tower = TACOMA_TORSION.shots.find((shot) => shot.id === 'torre');
if (!tower) throw new Error('tacoma-torsion.json sin la toma de la torre');
const towerVideo = comma(tower.periodVideoS, 2);
const towerReal = comma(tower.periodVideoS * stretch, 2);

describe('Tema 12: the numbers the text writes come from the data and the core', () => {
  test('the counting shot: 3,43 s in the video, 5,15 s real, in its marker and in Fig. 12.8', () => {
    expect(MDX).toContain(`Contar ciclos: ${towerVideo} s en el video son ${towerReal} s reales`);
    expect(MDX).toContain(`Cuadro a cuadro mido ${towerVideo} s por ciclo`);
    expect(MDX).toContain(`son ${comma(stretch, 1)} reales: ${towerReal} s.`);
    expect(MDX).toContain(`el ciclo dura ${towerVideo} s; estirada al tiempo real, ${towerReal} s`);
  });

  test('the mean of three shots: 3,49 s → 5,23 s, 0,191 Hz, 11,5 cycles/min, 4 % below 12', () => {
    const cyclesPerMin = SECONDS_PER_MINUTE / TACOMA_TORSION.periodRealS;
    const below = 1 - cyclesPerMin / TACOMA.torsionCyclesPerMin.value;

    expect(MDX).toContain(
      `Con la media de tres tomas, ${comma(TACOMA_TORSION.meanPeriodVideoS, 2)} s, el periodo real es ${comma(TACOMA_TORSION.periodRealS, 2)} s y la frecuencia ${comma(TACOMA_TORSION.frequencyRealHz, 3)} Hz, unos ${comma(cyclesPerMin, 1)} ciclos por minuto, un ${comma(below * PERCENT, 0)} % por debajo de los ${TACOMA.torsionCyclesPerMin.value} que cronometró Farquharson`,
    );
    expect(MDX).toContain(`corren ${comma(stretch, 1)} veces más rápido`);
  });

  test('the wind: 42 mph (18,8 m/s); vortices at 0,85 Hz, 4,2 times the torsion; the 8 ft girder', () => {
    const ratio = TACOMA_SI.vortexHz.value / TACOMA_SI.torsionHz.value;

    expect(MDX).toContain(`${TACOMA.windMph.value} mph (${comma(TACOMA_SI.windMs.value, 1)} m/s)`);
    expect(MDX).toContain(
      `da ${comma(TACOMA_SI.vortexHz.value, 2)} Hz con la (12.9), ${comma(ratio, 1)} veces la torsión`,
    );
    expect(MDX).toContain(
      `${TACOMA.deckDepthFt.value} ft (${comma(TACOMA_SI.deckDepthM.value, 2)} m) de canto`,
    );
  });

  test('flutter: critical at 18,6 mph with ζ_s = 0,005; +20,8 % of energy per cycle at 30,6 mph', () => {
    const critical = FLUTTER_TABLE.rows.find(
      (row) => row.zeta === TACOMA.torsionDampingRatio.value,
    );
    const net = tacomaNetDamping(30.6);

    expect(MDX).toContain(`Sobre ${comma(critical?.windMph ?? 0, 1)} mph`);
    expect(MDX).toContain(
      `un ${comma(energyGrowthPerCycle(net?.zetaNet ?? 0) * PERCENT, 1)} % a 30,6 mph`,
    );
  });

  test('the resonance curve: the Tacoma’s 1/(2ζ) = 100, twenty times Klipper’s default', () => {
    const tacoma = resonanceGain(TACOMA.torsionDampingRatio.value);
    const printer = resonanceGain(KLIPPER.defaultDampingRatio.value);

    expect(MDX).toContain(`llegaría a ${comma(tacoma, 0)} (tabla 12.4): veinte veces`);
    expect(tacoma / printer).toBeCloseTo(20, 12);
  });

  test('the troop: F1 = 280 N; 60 soldiers give 16,8 kN in step, 2,2 kN breaking it, 60 times less power', () => {
    const F1 = PEDESTRIAN_FORCES.verticalN.value;
    const N = BROUGHTON.soldiersOnBridge.value;
    const inStep = (N * F1) / 1000;
    const breaking = (Math.sqrt(N) * F1) / 1000;

    expect(MDX).toContain(`$F_1$ = ${comma(F1, 0)} N cada una`);
    expect(MDX).toContain(
      `Con los unos ${N} soldados que cruzaban el puente de Broughton en 1831, ${comma(inStep, 1)} kN contra ${comma(breaking, 1)} kN`,
    );
    expect(MDX).toContain(`va con el cuadrado, ${comma((inStep / breaking) ** 2, 0)} veces menos`);
  });

  test('the Millennium Bridge: unas 37 personas from (12.8) on the measured first lateral mode', () => {
    const { cl1Measured, lateralForceCoefficient } = MILLENNIUM;
    const nL = criticalPedestrians(
      cl1Measured.dampingRatio.value,
      cl1Measured.frequencyHz.value,
      cl1Measured.modalMassKg.value,
      lateralForceCoefficient.value,
    );

    expect(MDX).toContain(`se desestabilizaba con unas ${comma(nL, 0)} personas`);
    expect(MDX).toContain(`con ${MILLENNIUM.viscousDampers.value} amortiguadores viscosos`);
  });
});
