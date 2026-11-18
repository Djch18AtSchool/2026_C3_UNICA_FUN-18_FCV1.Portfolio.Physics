/**
 * Tema 10's tables: the spring presets with their regime numbers, and the perceptual parameters
 * of Apple and Motion converted to k and b. Product values are read from src/lib/data; every
 * ζ, M_p, t_s, k and b printed here is computed with the core (cálculo propio).
 */
import {
  APPLE_FORWARD_EXAMPLE,
  APPLE_INVERSE_EXAMPLE,
  MOTION_VISUAL_DURATION,
  motionVisualSpring,
} from '../../data/springReferences';
import { SPRING_PRESETS, type SpringPreset } from '../../data/springPresets';
import { formatNumber } from '../../format';
import {
  dampingRatio,
  fromPerceptual,
  naturalAngularFrequency,
  overshootRatio,
  settlingTime,
  springState,
  type SpringParams,
} from '../../physics/dampedSpring';
import type { DataTableSpec, TableCell } from '../types';

/** The band of t_s, as the figures': ±2 % of the travel. */
const SETTLING_EPSILON = 0.02;
const PERCENT = 100;
/** k and b print the decimals they need: 100, or 157,91. */
const PARAM_DECIMALS = 2;
const NONE = '—';

const comma = (value: number, decimals: number) => formatNumber(value, { precision: decimals });
/** A decimal comma inside KaTeX needs braces, or it spaces like punctuation: 1{,}2. */
const texNumber = (value: number, decimals: number) => comma(value, decimals).replace(',', '{,}');
const trimmed = (value: number) => comma(value, Number.isInteger(value) ? 0 : PARAM_DECIMALS);

/**
 * A preset's name as the table prints it: its plain label (made for a native <option>) with the
 * magnitudes it names set as formulas, as every symbol on the page.
 */
const TABLE_NAMES: Readonly<Record<string, string>> = {
  'motion-xy': 'Motion, posición $x$ e $y$',
};

const ORIGIN_LABELS: Readonly<Record<SpringPreset['origin'], string>> = {
  producto: 'Producto',
  ilustrativo: 'Ilustrativo',
};

function presetRow({ id, label, params, origin, source }: SpringPreset): Record<string, TableCell> {
  const zeta = dampingRatio(params);
  const overshoot = overshootRatio(zeta);
  return {
    preajuste: TABLE_NAMES[id] ?? label,
    k: trimmed(params.k),
    b: trimmed(params.b),
    m: trimmed(params.m),
    zeta,
    mp: overshoot === 0 ? '0' : comma(overshoot * PERCENT, 2),
    // From rest, a unit step: the band is ±2 % of any travel.
    ts: settlingTime(params, -1, 0, SETTLING_EPSILON),
    origen: ORIGIN_LABELS[origin],
    fuente: source,
  };
}

const PREAJUSTES: DataTableSpec = {
  id: 'animaciones-resorte-preajustes',
  caption:
    'Preajustes de resorte: los valores por omisión de Motion, el ejemplo documentado de Apple y un sobreamortiguado ilustrativo, todos con $m$ = 1 kg. $\\zeta$ es la (10.4), $M_p$ la (10.7) y $t_s$ el último instante fuera de la banda de ±2 % del recorrido, partiendo del reposo.',
  columns: [
    { key: 'preajuste', label: 'Preajuste', align: 'text', minWidthCh: 16 },
    { key: 'k', label: '$k$', unit: 'N/m', align: 'num', precision: PARAM_DECIMALS },
    { key: 'b', label: '$b$', unit: 'N·s/m', align: 'num', precision: PARAM_DECIMALS },
    { key: 'm', label: '$m$', unit: 'kg', align: 'num', precision: 0 },
    { key: 'zeta', label: '$\\zeta$', align: 'num', precision: 2 },
    { key: 'mp', label: '$M_p$', unit: '%', align: 'num', precision: 2 },
    { key: 'ts', label: '$t_s$ al 2 %', unit: 's', align: 'num', precision: 3 },
    { key: 'origen', label: 'Origen', align: 'text' },
    { key: 'fuente', label: 'Fuente', align: 'text', minWidthCh: 32 },
  ],
  rows: SPRING_PRESETS.map(presetRow),
  source: {
    text: 'Motion v14.14.0 (tag v14.14.0, commit f95ab94), licencia MIT, y Apple Developer Documentation (SwiftUI, Spring). Son cálculo propio con el núcleo del sitio: el $k$ y el $b$ del ejemplo de Apple, con la (10.10) a 0,5 s y rebote 0,3; el $b$ de la escala hacia 0, $2\\sqrt{550}$; y $\\zeta$, $M_p$ y $t_s$ de todas las filas.',
  },
};

const springValues = ({ k, b }: SpringParams) =>
  `$k$ = ${comma(k, PARAM_DECIMALS)} N/m, $b$ = ${comma(b, PARAM_DECIMALS)} N·s/m`;

/** Apple's (1.0, 157.9, 17.6) and (0.63, 0.5), as its code comments write them. */
const appleTuple = (values: readonly number[], decimals: readonly number[]) =>
  `(${values.map((value, i) => value.toFixed(decimals[i])).join(', ')})`;

function appleRows(): Record<string, TableCell>[] {
  const forward = APPLE_FORWARD_EXAMPLE;
  const inverse = APPLE_INVERSE_EXAMPLE;
  const period = (2 * Math.PI) / naturalAngularFrequency(inverse.params);
  const bounce = 1 - dampingRatio(inverse.params);
  return [
    {
      llamada: `Apple, SwiftUI: Spring(duration: ${forward.duration}, bounce: ${forward.bounce})`,
      conversion: String.raw`$k = m\,(2\pi/d)^2$, $b = 4\pi m\,(1-\beta)/d$`,
      calculo: springValues(fromPerceptual(forward.duration, forward.bounce)),
      publicado: appleTuple(
        [forward.published.m, forward.published.k, forward.published.b],
        [1, 1, 1],
      ),
      fuente: forward.source,
    },
    {
      llamada: `Apple, SwiftUI: Spring(mass: ${inverse.params.m}, stiffness: ${inverse.params.k}, damping: ${inverse.params.b})`,
      conversion: String.raw`$d = 2\pi/\omega_0$, $\beta = 1 - \zeta$`,
      calculo: String.raw`$d$ = ${comma(period, 2)} s, $\beta$ = ${comma(bounce, 1)}`,
      publicado: appleTuple([inverse.published.duration, inverse.published.bounce], [2, 1]),
      fuente: inverse.source,
    },
  ];
}

function motionRows(): Record<string, TableCell>[] {
  const { visualDuration, bounce, periodFactor, minDampingRatio, source } = MOTION_VISUAL_DURATION;
  const factor = texNumber(periodFactor, 1);
  const smooth = motionVisualSpring(visualDuration, 0);
  const progress = 1 + springState(smooth, -1, 0, visualDuration).u;
  return [
    {
      llamada: `Motion: spring() por omisión, visualDuration: ${visualDuration}, bounce: ${bounce}`,
      conversion: String.raw`$\omega_0 = 2\pi/(${factor}\,T_v)$, $\zeta = \text{máx}(1-\beta;\ ${texNumber(minDampingRatio, 2)})$, $b = 2\zeta\sqrt{k m}$`,
      calculo: springValues(motionVisualSpring(visualDuration, bounce)),
      publicado: NONE,
      fuente: source,
    },
    {
      llamada: 'Motion: bounce: 0, al cumplirse visualDuration',
      conversion: String.raw`la (10.6) crítica en $t = T_v$, con $\omega_0 T_v = 2\pi/${factor}$`,
      calculo: `${comma(progress * PERCENT, 2)} % del recorrido`,
      publicado: '«bounce 0 is 96.68% of the way at visualDuration»',
      fuente: source,
    },
  ];
}

const CONVERSION: DataTableSpec = {
  id: 'animaciones-resorte-conversion',
  caption:
    'Los parámetros perceptuales de Apple y de Motion, duración y rebote, convertidos a $k$ y $b$ con la (10.10) y $m$ = 1 kg: lo que calculo frente a lo que publica la fuente. En Motion, $T_v$ es visualDuration.',
  columns: [
    { key: 'llamada', label: 'Llamada', align: 'text', minWidthCh: 24 },
    { key: 'conversion', label: 'Conversión', align: 'text', minWidthCh: 24 },
    { key: 'calculo', label: 'Cálculo propio', align: 'text', minWidthCh: 20 },
    { key: 'publicado', label: 'Lo que publica la fuente', align: 'text', minWidthCh: 16 },
    { key: 'fuente', label: 'Fuente', align: 'text', minWidthCh: 32 },
  ],
  rows: [...appleRows(), ...motionRows()],
  source: {
    text: 'Apple Developer Documentation (SwiftUI, Spring), ejemplos de su resumen; Motion v14.14.0 (tag v14.14.0, commit f95ab94), packages/motion-dom/src/animation/generators/spring.ts y su prueba. La conversión de Apple sale de su ejemplo: la diapositiva de la WWDC23 trae una errata en la fórmula de damping.',
  },
};

export const TABLES: readonly DataTableSpec[] = [PREAJUSTES, CONVERSION];
