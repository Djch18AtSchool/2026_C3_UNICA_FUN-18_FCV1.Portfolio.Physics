/**
 * The glyph guard guarded: each way it could pass while measuring nothing must turn it red. These
 * run on the cover with deliberately broken inputs, so a refactor of glyphKit.ts that loses a
 * protection fails here and not silently in glyphs.spec.ts.
 */
import { expect, test, type CDPSession } from '@playwright/test';
import { describeReport, measureGlyphs, openFontSession, requireStates } from './glyphKit';

const LOST_NODE_MESSAGE =
  'Protocol error (CSS.getPlatformFontsForNode): Could not find node with given id';

test.describe('la guardia de glifos se activa', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready);
  });

  test('una fuente del sistema donde debería haber Plex o KaTeX la pone en rojo', async ({
    page,
  }) => {
    const cdp = await openFontSession(page);
    await page.evaluate(() =>
      document.body.insertAdjacentHTML(
        'beforeend',
        '<p id="broken" style="font-family: serif; font-size: 24px">ω π</p>',
      ),
    );

    const report = await measureGlyphs(page, cdp, '#broken');

    expect(report.fonts.join('\n')).toMatch(/dibuja «ω π»/);
    expect(describeReport(report, '#broken').join('\n')).toMatch(/fuente ajena/);
  });

  test('un texto con un símbolo que ninguna fuente del sitio dibuja o con notación cruda, también oculto, falla', async ({
    page,
  }) => {
    const cdp = await openFontSession(page);
    await page.evaluate(() =>
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="hidden" hidden><p>M☉ y F_z</p></div>',
      ),
    );

    const lines = describeReport(await measureGlyphs(page, cdp, '#hidden'), '#hidden').join('\n');

    expect(lines).toMatch(/fuera de Plex: ☉/);
    expect(lines).toMatch(/notación cruda: _/);
  });

  test('(c) una medida que no vio nada falla: raíz vacía, ausente u oculta', async ({ page }) => {
    const cdp = await openFontSession(page);
    await page.evaluate(() =>
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="empty"></div><div id="hidden-root" hidden><p>Texto que nadie ve.</p></div>' +
          '<div id="invisible-root" style="visibility: hidden"><p>Texto con caja que nadie ve.</p></div>',
      ),
    );

    // A hidden root has text, but nothing drawn: its characters are checked, its fonts cannot be.
    // Hidden by `hidden` it has no box; by `visibility: hidden` it keeps one.
    for (const root of ['#empty', '#no-existe', '#hidden-root', '#invisible-root']) {
      const report = await measureGlyphs(page, cdp, root);
      expect(report.probes).toBe(0);
      expect(describeReport(report, root).join('\n')).toMatch(/nada medido/);
    }
  });

  test('(b) un error de CDP no se traga: la comprobación avisa de que no pudo correr', async ({
    page,
  }) => {
    const real = await openFontSession(page);
    const failing = {
      send: (method: string, params?: object) =>
        method === 'CSS.getPlatformFontsForNode'
          ? Promise.reject(new Error('protocolo roto'))
          : (real.send as (m: string, p?: object) => Promise<unknown>)(method, params),
    } as unknown as CDPSession;

    const report = await measureGlyphs(page, failing, 'main, body');

    expect(report.probes).toBeGreaterThan(0);
    expect(report.errors.join('\n')).toMatch(/protocolo roto/);
    expect(describeReport(report).join('\n')).toMatch(/la comprobación no pudo correr/);
  });

  test('(b) si CDP no halla los elementos marcados, avisa', async ({ page }) => {
    const real = await openFontSession(page);
    const blind = {
      send: (method: string, params?: object) =>
        method === 'DOM.querySelectorAll'
          ? Promise.resolve({ nodeIds: [] })
          : (real.send as (m: string, p?: object) => Promise<unknown>)(method, params),
    } as unknown as CDPSession;

    const report = await measureGlyphs(page, blind);

    expect(report.errors.join('\n')).toMatch(/CDP encontró 0 de los/);
  });

  test('(b) un elemento que un nuevo render reemplazó se mide otra vez; si nunca vuelve, avisa', async ({
    page,
  }) => {
    const real = await openFontSession(page);
    // What CDP says when the node it was given is gone (glyphs.spec.ts, Tema 9 after a preset).
    // A session whose font query loses the node for the first `failures` calls.
    const losingNodes = (failures: number) => {
      let left = failures;
      return {
        send: (method: string, params?: object) => {
          if (method === 'CSS.getPlatformFontsForNode' && left > 0) {
            left -= 1;
            return Promise.reject(new Error(LOST_NODE_MESSAGE));
          }
          return (real.send as (m: string, p?: object) => Promise<unknown>)(method, params);
        },
      } as unknown as CDPSession;
    };

    const recovered = await measureGlyphs(page, losingNodes(1));
    const neverBack = await measureGlyphs(page, losingNodes(Number.POSITIVE_INFINITY));

    expect(recovered.errors).toEqual([]);
    expect(recovered.fontNodes).toBeGreaterThan(0);
    expect(describeReport(neverBack).join('\n')).toMatch(/no pudo correr: .*Could not find node/);
  });

  test('la regla tipográfica: un valor en Plex Mono, KaTeX dibujando una cifra, griego recto y una fórmula a 1,21 em fallan', async ({
    page,
  }) => {
    const cdp = await openFontSession(page);
    await page.evaluate(async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="type-rule" style="font-size: 16px">' +
          '<p><span style="font-family: \'IBM Plex Mono\'">12,5 m</span></p>' +
          '<p><span style="font-family: KaTeX_Main">7</span></p>' +
          '<p>Ángulo de giro δ</p>' +
          '<p><span class="katex" style="font-size: 1.21em"><span>x</span></span></p>' +
          '<p><span class="numbering">Figura 3</span></p>' +
          '</div>',
      );
      await document.fonts.load('16px KaTeX_Main');
    });

    const lines = describeReport(await measureGlyphs(page, cdp, '#type-rule'), '#type-rule').join(
      '\n',
    );

    expect(lines).toMatch(/regla tipográfica: Plex Mono fuera de la numeración.*12,5 m/);
    expect(lines).toMatch(/regla tipográfica: KaTeX dibuja 1 letras o cifras.*«7»/);
    expect(lines).toMatch(/regla tipográfica: griego en minúscula, recto.*giro δ/);
    expect(lines).toMatch(/regla tipográfica: fórmula en línea a 1,21 em/);
    expect(lines).not.toMatch(/Figura 3/);
  });

  test('una variable latina recta, en una fórmula o en una figura, falla; una unidad, un nombre o una cursiva no', async ({
    page,
  }) => {
    const cdp = await openFontSession(page);
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="latin" style="font-size: 16px">' +
          '<p>Rigidez <span class="katex"><span class="mord mathnormal" style="font-style: normal">k</span></span></p>' +
          '<svg width="320" height="160" font-size="14">' +
          '<text x="8" y="16">T = 4,92 s</text>' +
          '<text x="8" y="40"><tspan>t</tspan><tspan font-size="75%" dy="3">h</tspan><tspan dy="-3"> = 0,53 s</tspan></text>' +
          '<text x="8" y="64"><tspan font-style="italic">r</tspan> = 223,6 m</text>' +
          '<text x="8" y="88">A</text>' +
          '<text x="8" y="112"><tspan font-style="italic">h</tspan><tspan font-size="75%" dy="3">0</tspan><tspan dy="-3"> = 4,00 m · 1 g</tspan></text>' +
          '</svg></div>',
      );
    });

    const lines = describeReport(await measureGlyphs(page, cdp, '#latin'), '#latin').join('\n');

    expect(lines).toMatch(/variable latina de una fórmula, recta.*«k»/);
    expect(lines).toMatch(/variable latina recta en una figura \(T;.*«T = 4,92 s»/);
    expect(lines).toMatch(/variable latina recta en una figura \(t;.*«th = 0,53 s»/);
    expect(lines).not.toMatch(/223,6|«A»|1 g/);
  });

  test('notación cruda en lo que se dice o se muestra al pasar (aria-label, aria-valuetext, title) falla', async ({
    page,
  }) => {
    const cdp = await openFontSession(page);
    await page.evaluate(() =>
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="spoken"><p>Texto</p>' +
          '<svg role="img" aria-label="V_p = 5,40 km/s"></svg>' +
          '<input type="range" aria-valuetext="10^-7 rad/s">' +
          '<span title="$r_p$ de 1 a 30">r</span>' +
          '<span aria-label="V sub p" title="https://x.com/a_b">ok</span></div>',
      ),
    );

    const lines = describeReport(await measureGlyphs(page, cdp, '#spoken'), '#spoken').join('\n');

    expect(lines).toMatch(/notación cruda: _ en svg\[aria-label\] «V_p/);
    expect(lines).toMatch(/notación cruda: \^ en input\[aria-valuetext\]/);
    expect(lines).toMatch(/notación cruda: \$ en span\[title\]/);
    expect(lines).not.toMatch(/V sub p|x\.com/);
  });

  test('(a) un laboratorio sin ningún estado que medir falla', () => {
    expect(() => requireStates('dron-reparto', [])).toThrow(/ningún estado/);
    expect(requireStates('dron-reparto', ['a'])).toEqual(['a']);
  });

  test('una página real mide algo: elementos marcados y fuentes devueltas', async ({ page }) => {
    const cdp = await openFontSession(page);

    const report = await measureGlyphs(page, cdp);

    expect(report.probes).toBeGreaterThan(20);
    expect(report.fontNodes).toBeGreaterThan(20);
    expect(describeReport(report)).toEqual([]);
  });
});
