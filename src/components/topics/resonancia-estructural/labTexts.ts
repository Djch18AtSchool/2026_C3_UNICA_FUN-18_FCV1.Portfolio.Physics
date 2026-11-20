/**
 * The resonance lab's own texts: «Cómo se usa» (the knob, the keys and the mode in view) and the
 * note under the canvas, by mode. Every number comes from the constant it describes
 * (labTexts.test.ts pins them), never typed by hand.
 */
import { MARCH_PACE_HZ } from '../../../lib/data/bridges';
import { KLIPPER } from '../../../lib/data/klipper';
import { formatNumber } from '../../../lib/format';
import { TROOP_DRAWING_FULL_M } from './bridgeFrames';
import { COARSE_STEPS } from './FrequencyRuler';
import {
  SLOW_SWEEP_ERROR,
  SLOW_SWEEP_FACTOR,
  SOLDIER_FORCE_N,
  SWEEP_RANGE,
  TROOP_MODAL_MASS_KG,
  ZV_DESIGN_ZETA,
  type ResonanceMode,
} from './resonanceScene';

const PERCENT = 100;
const KG_PER_T = 1000;
const n = (value: number, precision: number) => formatNumber(value, { precision });
/** A decimal inside a formula: KaTeX needs the comma braced, «0{,}5». */
const tex = (value: number, precision: number) => n(value, precision).replace(',', '{,}');
const TOLERANCE = n(KLIPPER.zvTolerance.value * PERCENT, 0);

export const KNOB_HINT = `Arrastra la perilla $f_0$ de la regla de frecuencias, bajo el puente, o enfócala y muévela con las flechas (un paso; con Mayús, ${COARSE_STEPS}); Inicio y Fin la llevan a los extremos.`;

export const SHORTCUTS_HINT =
  'Atajos, fuera de los campos: Espacio o K reproduce y pausa; R reinicia; «,» y «.» retroceden o avanzan un cuadro.';

export const MODE_HINT: Readonly<Record<ResonanceMode, string>> = {
  barrido: `En «Barrido», la frecuencia de la fuerza sube en línea recta de $${tex(SWEEP_RANGE.start, 1)}\\,f_0$ a $${tex(SWEEP_RANGE.end, 1)}\\,f_0$ a lo largo de la corrida, como en el barrido de Klipper, y la gráfica traza la envolvente sobre la (12.3). Con $T_b \\ge ${SLOW_SWEEP_FACTOR}/(\\zeta^2 f_0)$ (cálculo propio) el barrido es lento y la envolvente queda a menos de un ${n(SLOW_SWEEP_ERROR * PERCENT, 0)} % de la curva; más rápido, se queda corta y llega tarde.`,
  tropa: `En «Tropa», $N$ soldados marchan a ${n(MARCH_PACE_HZ, 1)} Hz con ${n(SOLDIER_FORCE_N, 0)} N cada uno. «Al paso» suma sus fuerzas en fase; «Rompiendo el paso», con fases al azar, y «Nuevo sorteo» sortea otras. La masa modal de la pasarela, ${n(TROOP_MODAL_MASS_KG / KG_PER_T, 0)} toneladas, es ilustrativa.`,
  'filtro-zv': `En «Filtro ZV», arriba la estructura recibe un empujón; abajo, el mismo empujón partido en los dos impulsos de Klipper para $f_\\text{ZV}$, con el $\\zeta$ = ${n(ZV_DESIGN_ZETA, 1)} que Klipper supone. La «Vibración residual» es la estimación de Klipper (shaper_calibrate.py). Saca $f_0$ de la banda de ±${TOLERANCE} % o cambia $\\zeta$, y la vibración vuelve.`,
};

/** What the canvas shows and at which scale, by mode. */
export const SCENE_NOTE: Readonly<Record<ResonanceMode, string>> = {
  barrido:
    'El vibrador empuja el centro del vano con $F_0\\cos\\varphi(t)$, y la flecha azul es esa fuerza. El dibujo exagera el desplazamiento; la gráfica lo da en veces la deformación estática $F_0/k$.',
  tropa: `Dibujo a escala vertical: el tablero cabe hasta ${n(TROOP_DRAWING_FULL_M, 1)} m arriba y abajo, y más allá queda en el borde, «fuera de escala». Cada trazo es un soldado, y su cabeza sube y baja con la fase de su paso.`,
  'filtro-zv':
    '$A_1$ es la amplitud que deja un solo empujón; las flechas marcan cada empujón cuando llega, y la gráfica lleva una línea en el segundo impulso. La vibración residual es la estimación de Klipper: compara lo que dejan los dos impulsos con un solo empujón dado en el segundo; en la gráfica ese empujón está en $t = 0$, y su vibración lleva medio periodo apagándose.',
};
