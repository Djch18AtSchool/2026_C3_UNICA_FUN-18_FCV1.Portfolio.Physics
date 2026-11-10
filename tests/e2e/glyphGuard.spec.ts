/**
 * The glyph guard guarded: each way it could pass while measuring nothing must turn it red. These
 * run on the cover with deliberately broken inputs, so a refactor of glyphKit.ts that loses a
 * protection fails here and not silently in glyphs.spec.ts.
 */
import { expect, test, type CDPSession } from '@playwright/test';
import { describeReport, measureGlyphs, openFontSession, requireStates } from './glyphKit';

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

  test('un texto con símbolos fuera de Plex o con notación cruda, también oculto, falla', async ({
    page,
  }) => {
    const cdp = await openFontSession(page);
    await page.evaluate(() =>
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div id="hidden" hidden><p>v∞ y F_z</p></div>',
      ),
    );

    const lines = describeReport(await measureGlyphs(page, cdp, '#hidden'), '#hidden').join('\n');

    expect(lines).toMatch(/fuera de Plex: ∞/);
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
