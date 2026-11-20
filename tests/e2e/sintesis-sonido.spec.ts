import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { RESOURCE_LABELS, topicBySlug } from '../../src/consigna';
import { waitForIsland } from './helpers';

const SLUG = 'sintesis-sonido';
const PAGE = `./temas/${SLUG}/`;
const TOPIC = topicBySlug(SLUG);
const SAMPLES = ['flauta', 'clarinete'] as const;
type Sample = (typeof SAMPLES)[number];
/** One figure per step, and the lab (Task 8) closing Paso 4. */
const STEP_FIGURES = [
  'tone-figure-seno',
  'pipe-modes',
  'tone-figure-recetas',
  'muestra-flauta',
  'synth-lab',
];
const TABLE_IDS = [
  'sintesis-sonido-recetas',
  'sintesis-sonido-armonicos',
  'sintesis-sonido-muestras',
];
/** (11.1) to (11.9): one in Paso 1, two in Paso 2, three in Pasos 3 and 4. */
const DISPLAY_EQUATIONS = 9;
const PHONE = { width: 360, height: 800 };
/** A seek lands on an MP3 frame (26 ms); the attack marker must land well inside the attack. */
const SEEK_SLACK_S = 0.05;

interface Span {
  startS: number;
  endS: number;
}
/** The analysed data the page draws (the JSON the site reads), to check where a seek lands. */
const DATA = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/instrument-harmonics.json'), 'utf8'),
) as {
  samples: Record<
    Sample,
    { mp3: { trimStartS: number; durationS: number }; attack: Span; analysisWindow: Span }
  >;
};
/** A band of the AIFF timeline on the clip's (what the audio player shows). */
const onClip = (sample: Sample, { startS, endS }: Span) => {
  const trim = DATA.samples[sample].mp3.trimStartS;
  return { start: startS - trim, end: endS - trim };
};

const audioOf = (page: Page, sample: Sample) =>
  page.getByTestId(`${sample}-audio-player`).locator('audio');
const markerOf = (page: Page, sample: Sample, time: string) =>
  page.getByTestId(`${sample}-audio-markers`).getByRole('button', { name: new RegExp(`^${time}`) });

/** Brings a recording into view, waits for its island and for the MP3's metadata, muted. */
async function openSample(page: Page, sample: Sample): Promise<void> {
  const selector = `[data-testid="muestra-${sample}"]`;
  await page.locator(selector).scrollIntoViewIfNeeded();
  await waitForIsland(page, selector);
  await audioOf(page, sample).evaluate((audio: HTMLAudioElement) => {
    audio.muted = true;
  });
  await expect
    .poll(() => audioOf(page, sample).evaluate((audio: HTMLAudioElement) => audio.duration))
    .toBeCloseTo(DATA.samples[sample].mp3.durationS, 1);
}

/**
 * Presses a marker and returns where the seek landed: the medium's time when its `seeked` event
 * fires, read before playback moves it on (reading `currentTime` later races the playback).
 */
async function seekWith(page: Page, sample: Sample, time: string): Promise<number> {
  const audio = audioOf(page, sample);
  await audio.evaluate((element: HTMLAudioElement & { landed?: Promise<number> }) => {
    element.landed = new Promise((resolve) =>
      element.addEventListener('seeked', () => resolve(element.currentTime), { once: true }),
    );
  });
  await markerOf(page, sample, time).click();
  return audio.evaluate(
    (element: HTMLAudioElement & { landed?: Promise<number> }) => element.landed ?? Number.NaN,
  );
}

test.describe('Tema 11, página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('lleva el título de la consigna y cuatro pasos, cada uno con su "Por qué"', async ({
    page,
  }) => {
    expect(TOPIC).toBeDefined();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TOPIC?.title ?? '');
    const steps = page.locator('section.step');

    await expect(steps).toHaveCount(4);
    for (const n of [1, 2, 3, 4]) {
      await expect(
        page.getByRole('heading', { level: 2, name: new RegExp(`^Paso ${n} · `) }),
      ).toBeVisible();
    }
    for (const step of await steps.all()) await expect(step.locator('.why')).toHaveCount(1);
  });

  test('las cinco figuras se numeran 11.1 a 11.5: una por paso y el laboratorio al final del paso 4', async ({
    page,
  }) => {
    const figures = page.locator('.content-figure');
    await expect(figures).toHaveCount(STEP_FIGURES.length);

    // getComputedStyle does not resolve counters: check the prefix, the topic and each position.
    const numbers = await figures.evaluateAll((elements) =>
      elements.map((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        const prefix = getComputedStyle(
          figure.querySelector(':scope > figcaption') as Element,
          '::before',
        ).content;
        const position = [...(body?.querySelectorAll('.content-figure') ?? [])].indexOf(figure) + 1;
        return {
          prefix,
          label: `Figura ${body?.dataset.topicNumber}.${position}`,
          step: figure.closest('section.step')?.id,
        };
      }),
    );

    expect(numbers.map(({ label }) => label)).toEqual([
      'Figura 11.1',
      'Figura 11.2',
      'Figura 11.3',
      'Figura 11.4',
      'Figura 11.5',
    ]);
    expect(numbers.map(({ step }) => step)).toEqual([
      'paso-1',
      'paso-2',
      'paso-3',
      'paso-4',
      'paso-4',
    ]);
    for (const { prefix } of numbers) {
      expect(prefix).toBe('"Figura " counter(topic) "." counter(figure) " · "');
    }
    for (const [index, testId] of STEP_FIGURES.entries()) {
      await expect(figures.nth(index).getByTestId(testId)).toHaveCount(1);
    }
  });

  test('una sola insignia de recurso, en la figura que lleva las dos grabaciones', async ({
    page,
  }) => {
    const badged = page.locator('.content-figure:has(.figure-head)');

    await expect(badged).toHaveCount(1);
    await expect(badged).toHaveAttribute('data-type', 'multimedia');
    await expect(badged.locator('.figure-head')).toHaveText(RESOURCE_LABELS.multimedia);
    for (const sample of SAMPLES)
      await expect(badged.getByTestId(`muestra-${sample}`)).toHaveCount(1);
    await expect(badged.getByTestId('contraste-muestras')).toContainText(
      'Qué diferencia produce qué',
    );
    await expect(badged.locator('.figure-source')).toContainText(
      'Los recorté, los pasé a mono e igualé su sonoridad a −20 LUFS',
    );
  });

  test('las tres tablas se numeran 11.1 a 11.3: recetas, armónicos medidos y datos de las muestras', async ({
    page,
  }) => {
    const tables = page.getByTestId('data-table');
    await expect(tables).toHaveCount(TABLE_IDS.length);

    const labels = await tables.evaluateAll((figures) =>
      figures.map((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        const position = [...(body?.querySelectorAll('.content-table') ?? [])].indexOf(figure) + 1;
        return { id: figure.id, label: `Tabla ${body?.dataset.topicNumber}.${position}` };
      }),
    );

    expect(labels).toEqual(TABLE_IDS.map((id, index) => ({ id, label: `Tabla 11.${index + 1}` })));
    await expect(tables.nth(0)).toContainText('1,273');
    await expect(tables.nth(1)).toContainText('−34,1');
    await expect(tables.nth(1)).toContainText('−18,5 a 5,6');
    await expect(tables.nth(2)).toContainText('BbClarinet.ff.Eb4.stereo.aif');
    await expect(tables.nth(2)).toContainText(
      '«may be downloaded and used for any projects, without restrictions»',
    );
  });

  test('la página cumple la estructura del tema y numera nueve ecuaciones', async ({ page }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(page.getByTestId('use-case')).toContainText(
      'number_of_partials = culling_scale * max_number_of_partials',
    );
    await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="callout"][data-variant="nota"]')).toHaveCount(2);
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(10);
    for (const slug of ['control-haptico', 'animaciones-resorte', 'resonancia-estructural']) {
      await expect(page.getByTestId('connections')).toContainText(topicBySlug(slug)?.title ?? '-');
    }
    await expect(page.locator('.equation')).toHaveCount(DISPLAY_EQUATIONS);
  });
});

test.describe('Tema 11, las dos grabaciones analizadas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('dos audios con nombre accesible, controles, sin reproducción automática y solo metadatos', async ({
    page,
  }) => {
    const audios = page.locator('audio');
    await expect(audios).toHaveCount(2);

    await expect(audios.nth(0)).toHaveAccessibleName('Flauta, mi bemol 4 fortísimo sin vibrato');
    await expect(audios.nth(1)).toHaveAccessibleName(
      'Clarinete en si bemol, mi bemol 4 fortísimo sin vibrato',
    );
    for (const audio of await audios.all()) {
      await expect(audio).toHaveAttribute('controls', '');
      await expect(audio).toHaveAttribute('preload', 'metadata');
      await expect(audio).not.toHaveAttribute('autoplay');
    }
  });

  test('cuatro marcas en total, el ataque y el sostenido de cada audio, con su análisis', async ({
    page,
  }) => {
    const labels = page.locator('[data-testid$="-audio-markers"] [data-testid="marker-label"]');

    await expect(labels).toHaveText([
      '0:00 · El ataque',
      '0:01 · El sostenido',
      '0:00 · El ataque',
      '0:01 · El sostenido',
    ]);
    const analyses = page.locator(
      '[data-testid$="-audio-markers"] [data-testid="marker-analysis"]',
    );
    await expect(analyses).toHaveCount(4);
    await expect(analyses.nth(3)).toContainText('entre 21 y 37 dB por debajo del fundamental');
  });

  for (const sample of SAMPLES) {
    test(`${sample}: el MP3 se carga, y cada marca lleva el audio adonde dice su análisis`, async ({
      page,
    }) => {
      await openSample(page, sample);
      const attack = onClip(sample, DATA.samples[sample].attack);
      const window = onClip(sample, DATA.samples[sample].analysisWindow);

      const sustain = await seekWith(page, sample, '0:01');
      expect(sustain).toBeCloseTo(1, 1);
      expect(sustain).toBeGreaterThan(window.start);
      expect(sustain).toBeLessThan(window.end);
      await expect(markerOf(page, sample, '0:01')).toHaveAttribute('aria-current', 'true');

      const onset = await seekWith(page, sample, '0:00');
      expect(onset).toBeLessThan(SEEK_SLACK_S);
      expect(onset).toBeLessThan(attack.end);
      await audioOf(page, sample).evaluate((audio: HTMLAudioElement) => audio.pause());
      await expect(page.getByTestId(`${sample}-audio-error`)).toHaveCount(0);
    });
  }

  test('cada grabación dibuja su envolvente, su forma de onda y su espectro con impares rayados', async ({
    page,
  }) => {
    for (const sample of SAMPLES) {
      await openSample(page, sample);
      const section = page.getByTestId(`muestra-${sample}`);

      await expect(section.locator('[data-series="envolvente"]')).toHaveCount(1);
      await expect(section.locator('[data-band="ataque"]')).toHaveCount(1);
      await expect(section.locator('[data-bracket="ventana"]')).toHaveCount(1);
      await expect(section.locator('[data-series="senal"]')).toHaveCount(1);
      await expect(section.locator('[data-series="media-onda"]')).toHaveCount(1);
      await expect(section.locator('rect[data-harmonic]')).toHaveCount(12);
      for (const bar of await section.locator('rect[data-parity="impar"]').all()) {
        await expect(bar).toHaveAttribute('fill', /^url\(#.*impar\)$/);
      }
    }
  });

  // The clarinet's heading sat 5 px under the flute's last panel and read as part of it.
  test('la flauta, el clarinete y el contraste van separados por 32 px, cada título junto a su audio', async ({
    page,
  }) => {
    for (const sample of SAMPLES) await openSample(page, sample);

    const gaps = await page.evaluate(() => {
      const box = (selector: string) =>
        document.querySelector(selector)?.getBoundingClientRect() ?? new DOMRect();
      const flute = box('[data-testid="muestra-flauta"]');
      const clarinet = box('[data-testid="muestra-clarinete"]');
      const heading = box('[data-testid="muestra-clarinete"] h3');
      const player = box('[data-testid="muestra-clarinete"] h3 + *');
      const contrast = box('[data-testid="contraste-muestras"]');
      return {
        aboveHeading: Math.round(heading.top - flute.bottom),
        belowHeading: Math.round(player.top - heading.bottom),
        aboveContrast: Math.round(contrast.top - clarinet.bottom),
      };
    });

    expect(gaps).toEqual({ aboveHeading: 32, belowHeading: 16, aboveContrast: 32 });
  });
});

test.describe('Tema 11 sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('cada marca enlaza al MP3 en su instante, y el análisis se lee igual', async ({ page }) => {
    await page.goto(PAGE);
    const labels = page.getByTestId('clarinete-audio-markers').getByTestId('marker-label');

    await expect(labels).toHaveCount(2);
    await expect(labels.nth(1)).toHaveAttribute(
      'href',
      /\/media\/sintesis-sonido\/clarinete-mib4\.mp3#t=1$/,
    );
    await expect(page.getByTestId('contraste-muestras')).toContainText('0,992');
  });
});

test.describe('Tema 11 en un teléfono', () => {
  test.use({ viewport: PHONE });

  test('a 360 px la página no desborda', async ({ page }) => {
    await page.goto(PAGE);
    for (const selector of [
      '[data-testid="tone-figure-seno"]',
      '[data-testid="tone-figure-recetas"]',
      '[data-testid="muestra-flauta"]',
      '[data-testid="muestra-clarinete"]',
    ]) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await waitForIsland(page, selector);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
