import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForIsland } from './helpers';
import { stubYouTube } from './youtubeStub';

const PAGE = './temas/resonancia-estructural/';
const TACOMA = '[data-testid="tacoma-video-player"]';
const MILLENNIUM = '[data-testid="millennium-video-player"]';
const TACOMA_MARKERS = ['0:14', '0:32', '0:51', '1:01', '1:55'];
const MILLENNIUM_WATCH = 'https://www.youtube.com/watch?v=Hz72lzDxMfc';
const MILLENNIUM_EMBED = /^https:\/\/www\.youtube-nocookie\.com\/embed\/Hz72lzDxMfc\?/;
const REAL_RATE = 2 / 3;
const TABLE_IDS = [
  'resonancia-estructural-setra',
  'resonancia-estructural-millennium',
  'resonancia-estructural-aleteo',
  'resonancia-estructural-tacoma',
  'resonancia-estructural-medicion',
];
const CREDIT =
  'Video: Barney Elliott y Harbine Monroe (The Camera Shop, Tacoma), 7 de noviembre de 1940. Prelinger Archives vía Wikimedia Commons, dominio público';
/** A seek lands on a frame of the file: within one frame (1/29,97 s) and a little slack. */
const SEEK_TOLERANCE_S = 0.1;

async function openTacoma(page: Page): Promise<Locator> {
  await page.goto(PAGE);
  const player = page.locator(TACOMA);
  await player.scrollIntoViewIfNeeded();
  await waitForIsland(page, TACOMA);
  return player;
}

const video = (player: Locator) => player.locator('video');
const marker = (player: Locator, time: string) =>
  player.getByTestId('tacoma-video-markers').getByRole('button', { name: new RegExp(`^${time} `) });
const rate = (player: Locator) => video(player).evaluate((v: HTMLVideoElement) => v.playbackRate);
const time = (player: Locator) => video(player).evaluate((v: HTMLVideoElement) => v.currentTime);

test.describe('el video del Tacoma (recurso prescrito)', () => {
  test('alojado en WebM y MP4, solo metadatos al cargar, sin reproducción automática', async ({
    page,
  }) => {
    const player = await openTacoma(page);
    const element = video(player);

    await expect(element).toHaveAttribute('preload', 'metadata');
    await expect(element).not.toHaveAttribute('autoplay', /.*/);
    await expect(element).toHaveAttribute('controls', '');
    await expect(element).toHaveAttribute('aria-label', /^Película muda de la destrucción/);
    await expect(element).toHaveAttribute('poster', /tacoma-1940-poster\.jpg$/);
    await expect(element.locator('source')).toHaveCount(2);
    await expect(element.locator('source').nth(0)).toHaveAttribute('type', 'video/webm');
    await expect(element.locator('source').nth(1)).toHaveAttribute('type', 'video/mp4');
    expect(await element.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await expect(player.getByTestId('tacoma-video-credit')).toHaveText(CREDIT);
    await expect(player.getByTestId('tacoma-video-error')).toHaveCount(0);
  });

  test('cinco marcas en orden, cada una con su análisis escrito', async ({ page }) => {
    const player = await openTacoma(page);
    const labels = player.getByTestId('marker-label');

    await expect(labels).toHaveCount(TACOMA_MARKERS.length);
    for (const [index, stamp] of TACOMA_MARKERS.entries()) {
      await expect(labels.nth(index)).toHaveText(new RegExp(`^${stamp} · `));
    }
    for (const analysis of await player.getByTestId('marker-analysis').all()) {
      await expect(analysis).toBeVisible();
    }
    await expect(labels.nth(3)).toContainText('3,43 s en el video son 5,15 s reales');
    await expect(player.getByTestId('marker-analysis').nth(3)).toContainText('0,191 Hz');
  });

  test('con «Velocidad real» encendida, la marca de 1:01,7 reproduce a 2/3 y la del colapso a 1× (Review Focus 5)', async ({
    page,
  }) => {
    const player = await openTacoma(page);
    const toggle = player.getByTestId('tacoma-video-real-speed');
    await expect(toggle).toHaveText('Velocidad real (×2/3)');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await marker(player, '1:01').click();

    await expect.poll(() => time(player)).toBeGreaterThanOrEqual(61.7 - SEEK_TOLERANCE_S);
    await expect.poll(() => rate(player)).toBeCloseTo(REAL_RATE, 6);
    await expect(marker(player, '1:01')).toHaveAttribute('aria-current', 'true');

    await marker(player, '1:55').click();

    await expect.poll(() => time(player)).toBeGreaterThanOrEqual(115.8 - SEEK_TOLERANCE_S);
    await expect.poll(() => rate(player)).toBe(1);
    await expect(marker(player, '1:55')).toHaveAttribute('aria-current', 'true');
  });

  test('cada marca de una toma de torsión cae a 2/3, y apagar el botón vuelve a 1×', async ({
    page,
  }) => {
    const player = await openTacoma(page);
    const toggle = player.getByTestId('tacoma-video-real-speed');
    await toggle.click();

    for (const stamp of ['0:14', '0:32', '0:51']) {
      await marker(player, stamp).click();
      await expect.poll(() => rate(player), { message: stamp }).toBeCloseTo(REAL_RATE, 6);
    }
    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => rate(player)).toBe(1);
  });

  test('con el botón apagado, una marca reproduce a 1× y anuncia el instante', async ({ page }) => {
    const player = await openTacoma(page);

    await marker(player, '0:51').click();

    await expect.poll(() => time(player)).toBeGreaterThanOrEqual(51.1 - SEEK_TOLERANCE_S);
    expect(await rate(player)).toBe(1);
    await expect(player.locator('[aria-live="polite"]')).toHaveText(
      'Reproduciendo desde 0:51: El viento: la fuente de energía',
    );
  });

  test('la figura es la única con insignia, multimedia, y acredita la película en Commons', async ({
    page,
  }) => {
    await page.goto(PAGE);
    const figure = page.locator('figure[data-testid="figure"]', { has: page.locator(TACOMA) });

    await expect(figure).toHaveAttribute('data-type', 'multimedia');
    await expect(figure.locator('.figure-head')).toHaveCount(1);
    // The topic header names the resource type too; inside the body, only this figure's badge does.
    await expect(
      page.locator('.topic-body').getByText('Multimedia con análisis', { exact: true }),
    ).toHaveCount(1);
    await expect(figure.locator('.figure-source a')).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Tacoma_Narrows_Bridge_destruction.ogv',
    );
    await expect(figure.locator('.figure-source')).toContainText('Prelinger');
  });
});

test.describe('el video del Tacoma sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('cada marca enlaza al archivo en su instante y el análisis se lee igual', async ({
    page,
  }) => {
    await page.goto(PAGE);
    const player = page.locator(TACOMA);
    const labels = player.getByTestId('marker-label');

    await expect(labels).toHaveCount(TACOMA_MARKERS.length);
    await expect(labels.nth(3)).toHaveAttribute(
      'href',
      /\/media\/resonancia-estructural\/tacoma-1940\.webm#t=61\.7$/,
    );
    await expect(player.getByTestId('marker-analysis').first()).toBeVisible();
  });
});

test.describe('el video del Millennium Bridge', () => {
  test.beforeEach(async ({ page }) => {
    await stubYouTube(page);
    await page.goto(PAGE);
    await page.locator(MILLENNIUM).scrollIntoViewIfNeeded();
    await waitForIsland(page, MILLENNIUM);
  });

  test('una fachada sin reproductor hasta que se pide, con su crédito y dos marcas', async ({
    page,
  }) => {
    const player = page.locator(MILLENNIUM);

    await expect(player).toHaveAttribute('data-state', 'facade');
    await expect(player.getByTestId('millennium-video-facade')).toBeVisible();
    await expect(player.locator('iframe')).toHaveCount(0);
    await expect(player.getByTestId('millennium-video-credit')).toContainText('Frontline by ITN');
    await expect(player.getByTestId('marker-label')).toHaveCount(2);
    await expect(player.getByTestId('millennium-video-real-speed')).toHaveCount(0);
  });

  test('una marca abre el reproductor de youtube-nocookie en su instante', async ({ page }) => {
    const player = page.locator(MILLENNIUM);
    const second = player.getByTestId('marker-label').nth(1);

    await second.click();

    await expect(player.locator('iframe')).toHaveAttribute('src', MILLENNIUM_EMBED);
    await expect(second).toHaveAttribute('aria-current', 'true');
  });

  test('no lleva insignia de recurso y enlaza el video en su fuente', async ({ page }) => {
    const figure = page.locator('figure[data-testid="figure"]', { has: page.locator(MILLENNIUM) });

    await expect(figure.locator('.figure-head')).toHaveCount(0);
    await expect(figure.locator('.figure-source a')).toHaveAttribute('href', MILLENNIUM_WATCH);
  });
});

test.describe('página', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE);
  });

  test('cuatro pasos, cada uno con su «Por qué» y al menos una figura', async ({ page }) => {
    const steps = page.locator('section.step');

    await expect(steps).toHaveCount(4);
    for (const step of await steps.all()) {
      await expect(step.locator('.why')).toHaveCount(1);
      expect(await step.locator('figure[data-testid="figure"]').count()).toBeGreaterThanOrEqual(1);
    }
    await expect(
      page.locator('section.step#paso-4 [data-testid="tacoma-measurement"]'),
    ).toBeAttached();
  });

  test('cinco tablas numeradas 12.1 a 12.5, en el orden de la página', async ({ page }) => {
    const tables = page.getByTestId('data-table');

    await expect(tables).toHaveCount(TABLE_IDS.length);
    const numbering = await tables.evaluateAll((figures) =>
      figures.map((figure) => {
        const body = figure.closest<HTMLElement>('[data-topic-number]');
        const all = [...(body?.querySelectorAll('.content-table') ?? [])];
        return { id: figure.id, label: `${body?.dataset.topicNumber}.${all.indexOf(figure) + 1}` };
      }),
    );
    expect(numbering).toEqual(TABLE_IDS.map((id, i) => ({ id, label: `12.${i + 1}` })));
    await expect(page.locator('#resonancia-estructural-medicion')).toContainText('5,23');
    await expect(page.locator('#resonancia-estructural-millennium')).toContainText('vano norte');
    await expect(page.locator('#resonancia-estructural-aleteo')).toContainText('Extrapolado');
  });

  test('una sola insignia de recurso en toda la página', async ({ page }) => {
    await expect(page.locator('.figure-head')).toHaveCount(1);
  });

  test('la estructura del tema: caso de uso, recuadros, conexiones, fuentes y doce ecuaciones', async ({
    page,
  }) => {
    await expect(page.locator('[data-testid="use-case"] [data-part]')).toHaveCount(4);
    await expect(page.locator('[data-testid="callout"][data-variant="clase"]')).toBeVisible();
    await expect(page.locator('[data-testid="callout"][data-variant="nota"]')).toContainText(
      'CVE-2022-38392',
    );
    await expect(page.getByTestId('connections')).toBeVisible();
    expect(await page.locator('[data-testid="sources"] li').count()).toBeGreaterThanOrEqual(16);
    await expect(page.locator('.topic-body .equation')).toHaveCount(12);
  });
});
