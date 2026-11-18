import type { JSX } from 'react';
import InlineMath from '../../lab/InlineMath';
import { formatNumber } from '../../../lib/format';
import {
  classicAmplitudes,
  oddEvenPowerDb,
  type ClassicWave,
} from '../../../lib/physics/harmonics';
import {
  RECIPE_F1,
  recipeHalfWave,
  recipeSpectrum,
  recipeWaveform,
  SPECTRUM_HARMONICS,
} from './soundPlots';
import SpectrumBars from './SpectrumBars';
import WaveformPlot from './WaveformPlot';

export type ToneFigureVariant = 'seno' | 'recetas';

export interface ToneFigureProps {
  variant: ToneFigureVariant;
}

interface Recipe {
  wave: ClassicWave;
  /** Heading of the recipe's block, with KaTeX inline. */
  heading: string;
}

/** Paso 3's pair: the two Web Audio recipes that hold the two pipes' harmonic series. */
const RECIPES: readonly Recipe[] = [
  { wave: 'cuadrada', heading: 'Onda cuadrada: solo impares, $A_n = 4/(n\\pi)$' },
  { wave: 'sierra', heading: 'Diente de sierra: todos los armónicos, $|A_n| = 2/(n\\pi)$' },
];

const hertz = formatNumber(RECIPE_F1, { precision: 2, unit: 'Hz' });
const periodMs = formatNumber(1000 / RECIPE_F1, { precision: 2, unit: 'ms' });

function recipeDescriptions(wave: ClassicWave) {
  const amplitudes = classicAmplitudes(wave, SPECTRUM_HARMONICS);
  const rho = recipeHalfWave(amplitudes);
  const isSquare = wave === 'cuadrada';
  return {
    amplitudes,
    waveform: isSquare
      ? `Cuatro periodos de la onda cuadrada sumada con doce armónicos, T = ${periodMs}: la misma curva medio periodo después e invertida cae sobre la original.`
      : `Cuatro periodos del diente de sierra sumado con doce armónicos, T = ${periodMs}: la curva medio periodo después e invertida es otra, correlación ${formatNumber(rho, { precision: 2 })}.`,
    spectrum: isSquare
      ? 'Espectro de la onda cuadrada: solo los armónicos impares 1, 3, 5, 7, 9 y 11, que bajan como 1/n; los pares no existen.'
      : 'Espectro del diente de sierra: los doce armónicos, que bajan como 1/n.',
  };
}

function RecipeBlock({ wave, heading }: Recipe): JSX.Element {
  const { amplitudes, waveform, spectrum } = recipeDescriptions(wave);
  return (
    <section data-testid={`receta-${wave}`} className="flex min-w-0 flex-col gap-3">
      <h3 className="m-0 text-base font-semibold">
        <InlineMath text={heading} />
      </h3>
      <div className="grid min-w-0 gap-4 @2xl:grid-cols-2">
        <WaveformPlot
          data={recipeWaveform(amplitudes)}
          title="Cuatro periodos"
          ariaLabel={waveform}
        />
        <SpectrumBars
          bars={recipeSpectrum(amplitudes)}
          title="Contenido armónico"
          ariaLabel={spectrum}
          oddEvenDb={oddEvenPowerDb(amplitudes)}
        />
      </div>
    </section>
  );
}

function PureTone(): JSX.Element {
  const amplitudes = classicAmplitudes('seno', SPECTRUM_HARMONICS);
  return (
    <div data-testid="tono-puro" className="grid min-w-0 gap-4 @2xl:grid-cols-2">
      <WaveformPlot
        data={recipeWaveform(amplitudes)}
        title={`Tono puro de ${hertz}`}
        ariaLabel={`Cuatro periodos de un seno de ${hertz}, cada uno de T = ${periodMs}.`}
        showShifted={false}
      />
      <SpectrumBars
        bars={recipeSpectrum(amplitudes)}
        title="Contenido armónico"
        ariaLabel="Espectro del tono puro: una sola barra, el fundamental n = 1; no hay más armónicos."
      />
    </div>
  );
}

/**
 * The synthesised sounds of Pasos 1 and 3, on the recordings' axes: a pure tone (one harmonic) and
 * the square wave against the sawtooth (odd harmonics only against all of them), each with four
 * periods of its waveform and its spectrum.
 */
export default function ToneFigure({ variant }: ToneFigureProps): JSX.Element {
  return (
    <div data-testid={`tone-figure-${variant}`} className="@container flex min-w-0 flex-col gap-6">
      {variant === 'seno' ? (
        <PureTone />
      ) : (
        RECIPES.map((recipe) => <RecipeBlock key={recipe.wave} {...recipe} />)
      )}
    </div>
  );
}
