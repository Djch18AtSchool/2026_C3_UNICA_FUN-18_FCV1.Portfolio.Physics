// @vitest-environment jsdom
/** Tema 6's lab: its tiered shell, presets, «Cómo se usa» and «Qué deja fuera», hints and glyphs. */
import { fireEvent, screen, within, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { readoutRow } from '../../../test-readout';
import { plexViolations } from '../../../test-glyphs';
import { mathSourceText } from '../../../test-inline-math';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import RegenLab from './RegenLab';
import {
  USAGE,
  LEFT_OUT,
  renderLab,
  STRETCH_BARS,
  SPEED,
  lab,
  etaSlider,
  pMaxField,
  presetSelect,
  choosePreset,
  shownView,
  region,
  installRegenLabLifecycle,
} from './regenLabTestKit';

describe('RegenLab: shell, notes and text', () => {
  installRegenLabLifecycle();

  test('the shell is the tiered one: η and P_máx in Parámetros, the five presets in Escenario, the view in the drawer', () => {
    const { container } = renderLab();

    expect(container.querySelector('[data-lab-shell="tiered"]')).not.toBeNull();
    expect(region('Parámetros')).toContainElement(etaSlider());
    expect(region('Parámetros')).toContainElement(pMaxField());
    expect(region('Parámetros').innerHTML).not.toMatch(/\bsm:grid-cols/);
    expect(region('Escenario')).toContainElement(presetSelect());
    expect(shownView()).toHaveAccessibleName('Tramo');
    expect(within(presetSelect()).getAllByRole('option')).toHaveLength(5);
    expect(region('Lecturas')).toContainElement(readoutRow(SPEED));
    expect(container.querySelector('[data-lab-transport]')).not.toBeNull();
  });

  test('the cold battery option is plain text in the select and typeset in the note chip name', async () => {
    const user = userEvent.setup();
    renderLab();

    const option = screen.getByRole('option', { name: /^Batería fría o llena/ });
    expect(option).toHaveTextContent('Batería fría o llena (Pmáx 10 kW)');
    expect(option.textContent).not.toContain('$');
    await choosePreset(user, /^Batería fría o llena/);
    expect(screen.getByTestId('preset-note')).toHaveTextContent(/Con la batería fría o casi llena/);
    expect(screen.getByTestId('preset-note')).toHaveTextContent('Fuente: Model 3 · escenario');
  });

  test('the Model 3 presets link the EPA list’s public page as their source, not a download', () => {
    renderLab();

    const note = screen.getByTestId('preset-note');
    expect(note).toHaveTextContent('Fuente: EPA, vehículo 3R124-782214');
    expect(within(note).getByRole('link', { name: 'EPA, vehículo 3R124-782214' })).toHaveAttribute(
      'href',
      'https://www.epa.gov/compliance-and-fuel-economy-data/data-cars-used-testing-fuel-economy',
    );
  });

  test('the view and the cycle sit under the parameters, beside the presets; f(v) stays in the drawer', async () => {
    const user = userEvent.setup();
    renderLab();
    const scenario = region('Escenario');

    expect(
      within(scenario)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label') ?? radio.parentElement?.textContent),
    ).toEqual(['Tramo', 'Ciclo', 'Conducir']);
    expect(within(scenario).getByRole('combobox', { name: 'Ciclo de manejo (EPA)' })).toHaveValue(
      'udds',
    );
    expect(screen.queryByRole('group', { name: 'Ajustes activos' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByRole('combobox', { name: 'Vista' })).toBeNull();
    expect(within(dialog).queryByRole('combobox', { name: 'Ciclo de manejo (EPA)' })).toBeNull();
    expect(within(dialog).getByRole('switch', { name: /^Desvanecimiento/ })).toBeChecked();
  });

  test('how to use it says the views, the events, the cursor, f(v) and the MDX text; the source of η is in what the model leaves out', () => {
    const { container } = renderLab();
    const usage = container.querySelector<HTMLDetailsElement>('details[data-lab-note="usage"]')!;
    const leftOut = container.querySelector<HTMLDetailsElement>(
      'details[data-lab-note="left-out"]',
    )!;

    expect(usage.open || leftOut.open).toBe(false);
    expect(usage).toHaveTextContent('La vista se elige bajo los parámetros. «Tramo» es la frenada');
    expect(usage).toHaveTextContent('con 5 s antes y después (en el UDDS, la de la figura 6.3)');
    // The pair exists only from two events (E1): in «Ciclo» with two stops or more, never in «Tramo».
    expect(usage).toHaveTextContent(
      'En «Ciclo», con dos detenciones o más, «Evento anterior» y «Evento siguiente» saltan entre ellas;',
    );
    expect(usage).toHaveTextContent(
      'en «Tramo», la marca de la línea de tiempo señala la detención.',
    );
    expect(usage).not.toHaveTextContent('saltan entre las detenciones');
    expect(usage).toHaveTextContent('Arrastra el cursor de la gráfica de energía');
    expect(usage).toHaveTextContent('en «Tramo» no sale del tramo');
    expect(usage).toHaveTextContent('sus energías y el porcentaje recuperado son los del tramo');
    expect(usage).not.toHaveTextContent(/veces más rápida|×\d/);
    expect(usage).toHaveTextContent('apaga la regeneración cerca de detenerse');
    expect(usage).toHaveTextContent(USAGE);
    expect(usage).not.toHaveTextContent('engranaje');
    expect(usage).not.toHaveTextContent('Boretti');
    expect(leftOut).toHaveTextContent('Boretti midió del 70 al 80 % en un Leaf 2012');
    expect(leftOut).toHaveTextContent(LEFT_OUT);
  });

  test('the lab’s hints and the MDX’s usage split the work: no topic said twice, and the playback is conditioned', () => {
    const mdx = readFileSync(
      join(process.cwd(), 'src/content/topics/frenado-regenerativo.mdx'),
      'utf8',
    );
    const mdxUsage = /usage="([^"]+)"/.exec(mdx)?.[1] ?? '';
    const { container } = render(<RegenLab usage={mdxUsage} />);
    const text = container.querySelector('details[data-lab-note="usage"]')?.textContent ?? '';
    const count = (phrase: string) => text.split(phrase).length - 1;

    expect(mdxUsage).not.toBe('');
    // Each topic once: the lab says where the view is chosen and what «Tramo» is; the MDX, how
    // each view plays, where t counts from and who says the scale.
    for (const phrase of [
      'La vista se elige',
      'velocidad real',
      'cámara rápida',
      'inicio del ciclo',
      'insignia',
    ]) {
      expect(count(phrase), phrase).toBe(1);
    }
    // As in Tema 1: «velocidad real» holds at 1× and without reduced motion only.
    expect(mdxUsage).toMatch(/en 1×/);
    expect(mdxUsage).toMatch(/movimiento reducido/);
  });

  test('without the MDX texts it still says how to use it and where η comes from', () => {
    const { container } = render(<RegenLab />);

    expect(container.querySelector('details[data-lab-note="usage"] p')).not.toBeNull();
    expect(container.querySelector('details[data-lab-note="left-out"] p')).not.toBeNull();
    // Where η comes from, and what «Conducir» leaves out (D3).
    const leftOut = container.querySelectorAll('details[data-lab-note="left-out"] p');
    expect(leftOut).toHaveLength(2);
    expect(leftOut[1]).toHaveTextContent(/^En «Conducir», el acelerador empuja/);
  });

  test('the legend and the two explanations are canvas notes, with no controls, under the drawing', () => {
    const { container } = renderLab();
    const notes = container.querySelector('[data-lab-canvas-notes]') as HTMLElement;
    const canvas = container.querySelector('[data-lab-canvas]') as HTMLElement;

    expect(
      within(notes).getByRole('list', { name: 'Leyenda del flujo de potencia' }),
    ).toBeVisible();
    expect(notes).toHaveTextContent('El grosor es proporcional a |P|');
    expect(notes).toHaveTextContent('La barra del frenado en las ruedas se reparte');
    expect(notes.querySelector('button, a, input, select, [tabindex]')).toBeNull();
    expect(canvas.querySelector('[aria-label="Leyenda del flujo de potencia"]')).toBeNull();
    expect(canvas).not.toHaveTextContent('El grosor es proporcional');
  });

  test('scene first: the canvas is the minimap and the scene; the energies follow the readouts', () => {
    const { container } = renderLab();
    const canvas = container.querySelector('[data-lab-canvas]') as HTMLElement;
    const charts = container.querySelector('[data-lab-charts]') as HTMLElement;

    expect(within(canvas).getByTestId('regen-minimap')).toBeInTheDocument();
    expect(within(canvas).getByTestId('regen-scene')).toBeInTheDocument();
    expect(canvas).not.toHaveTextContent(STRETCH_BARS);
    expect(charts).toHaveTextContent(STRETCH_BARS);
    expect(within(charts).getByTestId('regen-energy-plot')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Lecturas' }).compareDocumentPosition(charts) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test('the drawings keep their height until they measure: fixed scene, SvgPlot-reserved plot, bars by container', () => {
    const { container } = renderLab();
    const scene = screen.getByTestId('regen-scene').querySelector('svg')!;
    const plotSvg = within(screen.getByTestId('regen-energy-plot')).getByRole(
      'img',
    ) as unknown as SVGSVGElement;

    expect(Number(scene.getAttribute('height'))).toBeGreaterThan(0);
    expect(scene.getAttribute('class')).not.toContain('h-auto');
    // SvgPlot's own default pair, reserved by container width (SvgPlot.reserve.test.tsx).
    expect(plotSvg.style.getPropertyValue('--plot-aspect-compact')).toBe('1.25');
    expect(plotSvg.style.getPropertyValue('--plot-aspect-wide')).toBe('1.6');

    // The bars switch layout by the stage's width, not the window's.
    expect(container.querySelector('[data-energy]')?.className).not.toMatch(/(^|\s)sm:/);
    expect(container.querySelector('[data-energy]')?.className).toMatch(/@md:/);
  });

  test('every character outside KaTeX is one IBM Plex draws, at the start, with zero regeneration and in the settings', async () => {
    const user = userEvent.setup();
    const { container } = renderLab();
    expect(plexViolations(container)).toEqual([]);

    fireEvent.change(etaSlider(), { target: { value: '0' } });
    expect(plexViolations(container)).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Ajustes del simulador' }));
    expect(plexViolations(container)).toEqual([]);
  });

  test('the hint ties "no friction without f(v)" to the default 239 kW cap, not to any P_máx', () => {
    const { container } = renderLab();

    expect(mathSourceText(container).replace(/\s+/g, ' ')).toContain(
      '$f(v)$ apaga la regeneración cerca de detenerse; sin él, con el tope de 239 kW, la fricción no haría falta en estos ciclos.',
    );
  });
});
