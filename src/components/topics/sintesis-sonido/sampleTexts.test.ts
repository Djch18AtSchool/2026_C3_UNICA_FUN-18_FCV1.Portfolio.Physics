import { describe, expect, test } from 'vitest';
import { INSTRUMENT_SAMPLES, type InstrumentId } from '../../../lib/data/instrumentSamples';
import {
  ATTACK_MARKER_S,
  evenGapDb,
  fluteSpreadDb,
  SAMPLE_CONTRAST,
  sampleCredit,
  sampleDescriptions,
  sampleMarkers,
  sampleTitle,
  strongestHarmonic,
  SUSTAIN_MARKER_S,
} from './sampleTexts';
import { plain } from './soundTestKit';

const { flauta, clarinete } = INSTRUMENT_SAMPLES;
const IDS: readonly InstrumentId[] = ['flauta', 'clarinete'];
const analysis = (id: InstrumentId, index: number) => plain(sampleMarkers(id)[index].analysis);
const clip = (id: InstrumentId, aiffS: number) => aiffS - INSTRUMENT_SAMPLES[id].clip.trimStartS;

describe('the markers: one at the attack and one in the sustain of each recording', () => {
  test.each(IDS)('%s: «El ataque» at 0:00 and «El sostenido» at 0:01', (id) => {
    expect(sampleMarkers(id).map(({ time, title }) => [time, title])).toEqual([
      [0, 'El ataque'],
      [1, 'El sostenido'],
    ]);
  });

  test.each(IDS)(
    '%s: the attack marker plays the attack and the sustain one lands in the analysis window',
    (id) => {
      const sample = INSTRUMENT_SAMPLES[id];

      expect(ATTACK_MARKER_S).toBeLessThan(clip(id, sample.attack.startS));
      expect(SUSTAIN_MARKER_S).toBeGreaterThan(clip(id, sample.analysisWindow.startS));
      expect(SUSTAIN_MARKER_S).toBeLessThan(clip(id, sample.analysisWindow.endS));
      expect(SUSTAIN_MARKER_S).toBeGreaterThan(clip(id, sample.attack.endS));
    },
  );

  test('the flute: a 0,12 s attack; six harmonics within ±5 dB, the 2nd strongest; no half-wave symmetry', () => {
    expect(analysis('flauta', 0)).toContain('en 0,12 s, de 0,05 a 0,17 s del audio');
    expect(analysis('flauta', 0)).toContain('la (11.7)');
    expect(fluteSpreadDb()).toBeLessThan(5);
    expect(strongestHarmonic('flauta')).toBe(2);
    expect(analysis('flauta', 1)).toContain(
      'a ±5 dB del fundamental y el más fuerte es el 2.º, +3,7 dB',
    );
    expect(analysis('flauta', 1)).toContain('es −0,084 y la (11.6) no se cumple');
    expect(analysis('flauta', 1)).toContain('a −18,4 dB');
  });

  test('the clarinet: a 0,40 s attack, over three times the flute’s, overlapping the window', () => {
    expect(clarinete.attackS / flauta.attackS).toBeGreaterThan(3);
    expect(analysis('clarinete', 0)).toContain('tarda 0,40 s');
    expect(analysis('clarinete', 0)).toContain('de 0,05 a 0,45 s del audio: más del triple');
    expect(analysis('clarinete', 0)).toContain(
      'empieza a los 0,22 s, todavía dentro de este ataque',
    );
  });

  test('the clarinet: even harmonics 21–37 dB below the fundamental (R9), the 3rd above it, 25,7 dB and 0,992', () => {
    expect(evenGapDb().least).toBeCloseTo(21.18, 2);
    expect(evenGapDb().most).toBeCloseTo(37.29, 2);
    expect(strongestHarmonic('clarinete')).toBe(3);
    const text = analysis('clarinete', 1);

    expect(text).toContain('entre 21 y 37 dB por debajo del fundamental');
    expect(text).toContain('el 3.º es más fuerte que el propio fundamental: +3,3 dB');
    expect(text).toContain('los impares 25,7 dB por encima de los pares');
    expect(text).toContain('con correlación 0,992');
    expect(text).not.toMatch(/vecin/);
  });
});

describe('the joint analysis: what difference produces what', () => {
  const all = plain(SAMPLE_CONTRAST.map(({ lead, text }) => `${lead} ${text}`).join(' '));

  test('the pitch: T = 3,22 ms, 310,10 and 310,34 Hz, 1,4 cents apart (R9)', () => {
    expect(all).toContain('cada $T$ = 3,22 ms');
    expect(all).toContain(
      '$f_1$ = 310,10 Hz en el clarinete y 310,34 Hz en la flauta, a 1,4 cents',
    );
    expect(all).not.toMatch(/310,1–310,3|1,3 cents/);
  });

  test('the recipe and the symmetry: 25,7 and −0,7 dB predict 0,995 and −0,083; measured 0,992 and −0,084', () => {
    expect(all).toContain('25,7 dB más que los pares en el clarinete y −0,7 dB en la flauta');
    expect(all).toContain('predice correlaciones de 0,995 y −0,083');
    expect(all).toContain('mido 0,992 y −0,084');
  });

  test('what the spectrum leaves out: the attacks and Wolfe’s caveat, quoted verbatim', () => {
    expect(all).toContain('de 0,40 s frente a 0,12 s (11.7)');
    expect(all).toContain(
      '«with the exception of the closed pipes mentioned above, this is very misleading»',
    );
    expect(all).not.toMatch(/0,974|0,976|−0,76/);
  });
});

describe('names, credits and spoken descriptions', () => {
  test('the audio is named in words, with the flat said aloud', () => {
    expect(sampleTitle('clarinete')).toBe(
      'Clarinete en si bemol, mi bemol 4 fortísimo sin vibrato',
    );
    expect(sampleTitle('flauta')).toBe('Flauta, mi bemol 4 fortísimo sin vibrato');
  });

  test.each(IDS)('%s: the credit names the performer, the MIS file and what I did to it', (id) => {
    const credit = plain(sampleCredit(id));

    expect(credit).toContain('University of Iowa, Musical Instrument Samples');
    expect(credit).toContain(INSTRUMENT_SAMPLES[id].file);
    expect(credit).toContain('Lo recorté desde');
    expect(credit).toContain('−20 LUFS');
  });

  test('the descriptions say the plots’ readings with no raw notation', () => {
    const flute = sampleDescriptions('flauta');
    const clarinet = sampleDescriptions('clarinete');

    expect(plain(flute.waveform)).toContain('no sigue a la original: correlación −0,084');
    expect(plain(clarinet.waveform)).toContain('cae sobre la original: correlación 0,992');
    expect(plain(clarinet.spectrum)).toContain('entre 21 y 37 dB');
    expect(plain(flute.spectrum)).toContain('el más fuerte es el 2.º, con +3,7 dB');
    expect(plain(clarinet.envelope)).toContain('sube del 10 al 90 % en 0,40 s');
    for (const text of [...Object.values(flute), ...Object.values(clarinet)]) {
      expect(text).not.toMatch(/[$♭_^]/);
    }
  });
});
