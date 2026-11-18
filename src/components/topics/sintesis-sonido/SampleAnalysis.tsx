import type { JSX } from 'react';
import AnalyzedMedia from '../../media/AnalyzedMedia';
import InlineMath from '../../lab/InlineMath';
import {
  INSTRUMENT_SAMPLES,
  typesetFlat,
  type InstrumentId,
} from '../../../lib/data/instrumentSamples';
import { formatNumber } from '../../../lib/format';
import EnvelopePlot from './EnvelopePlot';
import { sampleCredit, sampleDescriptions, sampleMarkers, sampleTitle } from './sampleTexts';
import { sampleEnvelope, sampleSpectrum, sampleWaveform } from './soundPlots';
import SpectrumBars from './SpectrumBars';
import WaveformPlot from './WaveformPlot';

export interface SampleAnalysisProps {
  sample: InstrumentId;
}

/**
 * One recording of Tema 11's prescribed resource: the audio with its two analysed instants (the
 * attack and the sustain), then its envelope, four periods of its waveform with −y(t + T/2) on
 * top and its twelve harmonics, on the axes the other recording shares.
 */
export default function SampleAnalysis({ sample }: SampleAnalysisProps): JSX.Element {
  const data = INSTRUMENT_SAMPLES[sample];
  const descriptions = sampleDescriptions(sample);
  const headingId = `muestra-${sample}-titulo`;
  return (
    <section
      data-testid={`muestra-${sample}`}
      aria-labelledby={headingId}
      className="@container flex min-w-0 flex-col gap-4"
    >
      <h3 id={headingId} className="m-0 text-base font-semibold">
        <InlineMath
          text={`${typesetFlat(data.name)}: $f_1$ = ${formatNumber(data.f1, { precision: 2, unit: 'Hz' })}`}
        />
      </h3>
      <AnalyzedMedia
        testId={`${sample}-audio`}
        source={{
          kind: 'audio',
          files: [{ src: data.mp3, type: 'audio/mpeg' }],
          title: sampleTitle(sample),
          credit: sampleCredit(sample),
          duration: data.clip.durationS,
        }}
        markers={sampleMarkers(sample)}
      />
      <EnvelopePlot
        data={sampleEnvelope(sample)}
        title="Envolvente de la nota completa"
        ariaLabel={descriptions.envelope}
        testId={`${sample}-envolvente`}
      />
      <div className="grid min-w-0 gap-4 @2xl:grid-cols-2">
        <WaveformPlot
          data={sampleWaveform(sample)}
          title="Cuatro periodos del sostenido"
          ariaLabel={descriptions.waveform}
          testId={`${sample}-forma`}
        />
        <SpectrumBars
          bars={sampleSpectrum(sample)}
          title="Contenido armónico"
          ariaLabel={descriptions.spectrum}
          oddEvenDb={data.oddEvenDb}
          testId={`${sample}-espectro`}
        />
      </div>
    </section>
  );
}
