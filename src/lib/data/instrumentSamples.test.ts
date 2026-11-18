import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import raw from '../../data/instrument-harmonics.json';
import { halfWaveCorrelation, oddEvenPowerDb, synthesize } from '../physics/harmonics';
import {
  INSTRUMENT_SAMPLES,
  parseInstrumentHarmonics,
  type InstrumentId,
} from './instrumentSamples';

const { flauta, clarinete } = INSTRUMENT_SAMPLES;
const IDS: InstrumentId[] = ['flauta', 'clarinete'];
const PUBLIC_DIR = resolve(process.cwd(), 'public');
const round = (value: number, decimals: number) => Number(value.toFixed(decimals));
const cents = (f: number, g: number) => 1200 * Math.log2(f / g);
const linear = (db: number) => 10 ** (db / 20);

function correlation(u: readonly number[], v: readonly number[]): number {
  const mean = (s: readonly number[]) => s.reduce((sum, x) => sum + x, 0) / s.length;
  const [mu, mv] = [mean(u), mean(v)];
  const dot = (p: readonly number[], q: readonly number[], mp: number, mq: number) =>
    p.reduce((sum, x, i) => sum + (x - mp) * (q[i] - mq), 0);
  return dot(u, v, mu, mv) / Math.sqrt(dot(u, u, mu, mu) * dot(v, v, mv, mv));
}

/** Research §4.1, «Receta medida»: A_n/A₁ in dB, n = 1…12. */
const RESEARCH_DB: Record<InstrumentId, number[]> = {
  clarinete: [0, -34.1, 3.3, -21.2, -7.8, -31.5, -18.0, -37.3, -27.8, -37.6, -40.1, -28.8],
  flauta: [0, 3.7, 0.8, 0.0, -0.3, -4.9, -18.4, -15.6, -26.7, -25.7, -23.0, -30.6],
};

describe('the pitch both notes share (research §4.1)', () => {
  test('both f₁ read 310,1–310,3 Hz to one decimal: 310,10 Hz (clarinete) and 310,34 Hz (flauta)', () => {
    [flauta, clarinete].forEach(({ f1 }) => {
      expect(round(f1, 1)).toBeGreaterThanOrEqual(310.1);
      expect(round(f1, 1)).toBeLessThanOrEqual(310.3);
    });
    expect(clarinete.f1).toBeCloseTo(310.1, 2);
    expect(flauta.f1).toBeCloseTo(310.34, 2);
  });

  test('they differ by 0,25 Hz = 1,37 cents (research: «≤ 0,24 Hz = 1,3 cents», from f₁ rounded first)', () => {
    expect(flauta.f1 - clarinete.f1).toBeCloseTo(0.246, 3);
    expect(cents(flauta.f1, clarinete.f1)).toBeCloseTo(1.37, 2);
  });

  test('the period is T = 3,225 ms (clarinete) and 3,222 ms (flauta), −5,8 and −4,4 cents from mi♭4 = 311,13 Hz', () => {
    // Research §4.1 measures from 311,13 Hz; from the unrounded 440·2^(−6/12) = 311,127 Hz the
    // clarinet is −5,74 cents (−5,7).
    const eFlat4 = 311.13;

    expect(1000 / clarinete.f1).toBeCloseTo(3.225, 3);
    expect(1000 / flauta.f1).toBeCloseTo(3.222, 3);
    expect(round(cents(clarinete.f1, eFlat4), 1)).toBe(-5.8);
    expect(round(cents(flauta.f1, eFlat4), 1)).toBe(-4.4);
    expect(cents(clarinete.f1, 440 * 2 ** (-6 / 12))).toBeCloseTo(-5.74, 2);
  });
});

describe('the timbre: harmonics, odd/even power and half-wave symmetry (research §4.1, §6.4)', () => {
  test.each(IDS)('%s: the measured recipe is the research table to 0,1 dB', (id) => {
    expect(INSTRUMENT_SAMPLES[id].amplitudesDb.map((db) => round(db, 1) + 0)).toEqual(
      RESEARCH_DB[id],
    );
  });

  test('clarinete: odd harmonics 25,7 dB over the even ones; the 3rd is the strongest, +3,3 dB over n = 1', () => {
    expect(Math.abs(clarinete.oddEvenDb - 25.7)).toBeLessThanOrEqual(0.2);
    expect(round(clarinete.amplitudesDb[2], 1)).toBe(3.3);
    expect(Math.max(...clarinete.amplitudesDb)).toBe(clarinete.amplitudesDb[2]);
  });

  test('clarinete: n = 2, 4, 6, 8 sit 21 to 37 dB below the fundamental and below both odd neighbours', () => {
    const even = [1, 3, 5, 7].map((i) => clarinete.amplitudesDb[i]);

    expect(even.map((db) => Math.round(db))).toEqual([-34, -21, -32, -37]);
    [1, 3, 5, 7].forEach((i) => {
      const neighbour = Math.min(clarinete.amplitudesDb[i - 1], clarinete.amplitudesDb[i + 1]);
      // Research §4.1 reads «21 a 38 dB por debajo de sus vecinos impares»; that holds against the
      // fundamental, not against every neighbour: n = 8 is only 9,5 dB below n = 9.
      expect(neighbour - clarinete.amplitudesDb[i]).toBeGreaterThan(9);
    });
  });

  test('flauta: −0,7 dB odd/even; the 2nd is the strongest (+3,7 dB), n ≤ 6 within ±5 dB, then −18 dB at n = 7', () => {
    expect(Math.abs(flauta.oddEvenDb - -0.7)).toBeLessThanOrEqual(0.2);
    expect(round(flauta.amplitudesDb[1], 1)).toBe(3.7);
    expect(Math.max(...flauta.amplitudesDb)).toBe(flauta.amplitudesDb[1]);
    flauta.amplitudesDb.slice(0, 6).forEach((db) => expect(Math.abs(db)).toBeLessThanOrEqual(5));
    expect(Math.round(flauta.amplitudesDb[6])).toBe(-18);
  });

  test.each(IDS)('%s: oddEvenDb is oddEvenPowerDb of the stored recipe', (id) => {
    const { amplitudesDb, oddEvenDb } = INSTRUMENT_SAMPLES[id];

    expect(oddEvenPowerDb(amplitudesDb.map(linear))).toBeCloseTo(oddEvenDb, 2);
  });

  test('half-wave correlation over the sustain: 0,992 (clarinete) and −0,08 (flauta)', () => {
    expect(Math.abs(clarinete.halfWaveCorrelation - 0.992)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(flauta.halfWaveCorrelation - -0.08)).toBeLessThanOrEqual(0.03);
  });

  test('the flute spectrum moves more than the clarinet one: the 5th harmonic spans −18,5…+5,6 dB', () => {
    expect(round(flauta.amplitudeRangesDb.min[4], 1)).toBe(-18.5);
    expect(round(flauta.amplitudeRangesDb.max[4], 1)).toBe(5.6);
    expect(round(clarinete.amplitudeRangesDb.min[2], 1)).toBe(1.9);
    expect(round(clarinete.amplitudeRangesDb.max[2], 1)).toBe(4.2);
  });
});

describe('the envelope (research §4.1, 10 ms RMS, 10 %→90 % of the sustain)', () => {
  test('the attack lasts 0,40 s (clarinete) and 0,12 s (flauta)', () => {
    expect(Math.abs(clarinete.attackS - 0.4)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(flauta.attackS - 0.12)).toBeLessThanOrEqual(0.02);
  });

  test('bands on the AIFF timeline: attack, analysis window and release (research §4.1 table)', () => {
    expect(clarinete.attack).toEqual({ startS: 0.43, endS: 0.83 });
    expect(clarinete.analysisWindow).toEqual({ startS: 0.6, endS: 2.24 });
    expect(clarinete.release).toEqual({ startS: 2.29, endS: 2.4 });
    expect(flauta.attack).toEqual({ startS: 0.15, endS: 0.27 });
    expect(flauta.analysisWindow).toEqual({ startS: 0.34, endS: 2.42 });
    expect(flauta.release).toEqual({ startS: 2.31, endS: 2.6 });
  });

  test('the bands overlap: the clarinet window opens inside its attack, the flute one closes inside its release', () => {
    // The window starts 0,14 s after the note passes half its level (`steady_segment`), which is
    // before the clarinet reaches 90 %; it ends 0,10 s before the flute falls under half its level.
    expect(clarinete.analysisWindow.startS).toBeLessThan(clarinete.attack.endS);
    expect(flauta.analysisWindow.endS).toBeGreaterThan(flauta.release.startS);
    [clarinete, flauta].forEach(({ attack, analysisWindow, release }) => {
      expect(attack.startS).toBeLessThan(analysisWindow.startS);
      expect(analysisWindow.endS).toBeLessThan(release.endS);
    });
  });

  test('the release (90 % → 10 %) lasts 0,11 s (clarinete) and 0,29 s (flauta)', () => {
    expect(clarinete.release.endS - clarinete.release.startS).toBeCloseTo(0.11, 6);
    expect(flauta.release.endS - flauta.release.startS).toBeCloseTo(0.29, 6);
  });

  test.each(IDS)(
    '%s: the envelope is relative to the sustain level and crosses 0,1 and 0,9 at the attack',
    (id) => {
      const { envelope, attack } = INSTRUMENT_SAMPLES[id];
      const frame = (s: number) => Math.round(s / envelope.frameS);

      expect(envelope.level.findIndex((v) => v > 0.1)).toBe(frame(attack.startS));
      expect(envelope.level.findIndex((v) => v > 0.9)).toBe(frame(attack.endS));
    },
  );
});

describe('the waveform excerpt (4 periods of the sustain, research §6.3)', () => {
  // Research §4.1 reports 0,974 / 0,976 for the 4 periods at the START of its 40-period phase
  // window; our excerpt sits at the centre of that window, where the phases are measured.
  test.each([
    ['clarinete', 0.999],
    ['flauta', 0.995],
  ] as const)(
    '%s: (11.4) with the measured amplitudes and phases rebuilds it (correlation %s)',
    (id, expected) => {
      const { waveform, amplitudesDb, phasesRad, f1 } = INSTRUMENT_SAMPLES[id];
      const fourPeriods = waveform.y.filter((_, i) => waveform.tOverT[i] <= 4);
      const rebuilt = fourPeriods.map((_, i) =>
        synthesize(amplitudesDb.map(linear), phasesRad, f1, waveform.tOverT[i] / f1),
      );

      expect(correlation(fourPeriods, rebuilt)).toBeCloseTo(expected, 2);
    },
  );

  test('t/T runs from 0 past 4,5 periods; the excerpt peaks at 1', () => {
    [flauta, clarinete].forEach(({ waveform }) => {
      expect(waveform.tOverT[0]).toBe(0);
      expect(waveform.tOverT[waveform.tOverT.length - 1]).toBeGreaterThanOrEqual(4.5);
      expect(Math.max(...waveform.y.map(Math.abs))).toBe(1);
    });
  });

  test('in the excerpt the clarinet repeats inverted after T/2 and the flute does not', () => {
    const samplesPerPeriod = (sample: typeof flauta) => sample.waveform.sampleRate / sample.f1;

    expect(halfWaveCorrelation(clarinete.waveform.y, samplesPerPeriod(clarinete))).toBeGreaterThan(
      0.98,
    );
    expect(halfWaveCorrelation(flauta.waveform.y, samplesPerPeriod(flauta))).toBeLessThan(0.5);
  });
});

describe('files, credit and provenance (research §3.2, §6.2)', () => {
  test('cites the MIS files with the hashes of research §3.2', () => {
    expect(clarinete.file).toBe('BbClarinet.ff.Eb4.stereo.aif');
    expect(flauta.file).toBe('Flute.nonvib.ff.Eb4.stereo.aif');
    expect(clarinete.source.sha256).toBe(
      '302660ea9d9cded110dcf26fbfc5b14e988d2006f4f59dc7c276e2ccfeed9a4f',
    );
    expect(flauta.source.sha256).toBe(
      '9ebd45c80c1a0600b9195d45a368949ea98f826ab621b527ab4eff9941839449',
    );
    expect(clarinete.source.url).toBe(
      'https://theremin.music.uiowa.edu/sound%20files/MIS%20Pitches%20-%202014/Woodwinds/Bb%20Clarinet/BbClarinet.ff.Eb4.stereo.aif',
    );
    expect(flauta.source.url).toBe(
      'https://theremin.music.uiowa.edu/sound%20files/MIS%20Pitches%20-%202014/Woodwinds/Flute/Flute.nonvib.ff.Eb4.stereo.aif',
    );
    [flauta, clarinete].forEach(({ source }) => {
      expect(source.page).toBe('https://theremin.music.uiowa.edu/MIS.html');
      expect(source.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  test('credit and license are the texts of research §6.2', () => {
    [flauta, clarinete].forEach(({ credit, license }) => {
      expect(license).toBe('may be downloaded and used for any projects, without restrictions');
      expect(credit).toBe(
        'Muestras: University of Iowa Electronic Music Studios, Musical Instrument Samples (dir. Lawrence Fritts), theremin.music.uiowa.edu/MIS.html. Clarinete en si♭ Buffet R13, intérprete Christine Bellomy (1998); flauta, intérprete Sonja Feig (2000); cámara anecoica, micrófono Neumann KM 84. Archivos BbClarinet.ff.Eb4.stereo.aif y Flute.nonvib.ff.Eb4.stereo.aif. Recortados, convertidos a mono e igualados en sonoridad por el autor. Uso permitido por el MIS: "may be downloaded and used for any projects, without restrictions".',
      );
    });
  });

  test('every number is our own calculation from the recording', () => {
    expect(flauta.origin).toBe('calculo');
    expect(clarinete.origin).toBe('calculo');
  });

  test.each(IDS)(
    '%s: the MP3 is in public/, under 60 kB, at −20 ± 0,5 LUFS, and is the file the JSON hashed',
    (id) => {
      const { mp3, clip } = INSTRUMENT_SAMPLES[id];
      const bytes = readFileSync(resolve(PUBLIC_DIR, mp3));

      expect(mp3).toBe(`media/sintesis-sonido/${id}-mib4.mp3`);
      expect(bytes.length).toBe(clip.bytes);
      expect(bytes.length).toBeLessThan(60_000);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(clip.sha256);
      expect(Math.abs(clip.loudnessLufs - -20)).toBeLessThanOrEqual(0.5);
    },
  );

  test('the clips start where research §6.2 trims them: 0,38 s (clarinete) and 0,10 s (flauta)', () => {
    expect(clarinete.clip.trimStartS).toBe(0.38);
    expect(flauta.clip.trimStartS).toBe(0.1);
  });
});

describe('parseInstrumentHarmonics', () => {
  const withFlute = (changes: Record<string, unknown>) => ({
    ...raw,
    samples: { ...raw.samples, flauta: { ...raw.samples.flauta, ...changes } },
  });

  test('accepts the committed file', () => {
    expect(() => parseInstrumentHarmonics(raw)).not.toThrow();
  });

  test('rejects a recipe with a missing harmonic, a hash that is not SHA-256 or a clip outside public/media', () => {
    expect(() =>
      parseInstrumentHarmonics(
        withFlute({ amplitudesDb: raw.samples.flauta.amplitudesDb.slice(0, 11) }),
      ),
    ).toThrow();
    expect(() => parseInstrumentHarmonics(withFlute({ sha256: 'abc' }))).toThrow();
    expect(() =>
      parseInstrumentHarmonics(
        withFlute({ mp3: { ...raw.samples.flauta.mp3, src: '../flauta.mp3' } }),
      ),
    ).toThrow();
  });
});
