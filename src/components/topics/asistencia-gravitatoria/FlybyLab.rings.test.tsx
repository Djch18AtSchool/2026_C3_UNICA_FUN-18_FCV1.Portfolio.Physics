// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetSettingsForTests } from '../../../lib/settingsStore';
import { installDialogPolyfill } from '../../../test-dialog';
import { mathSourceText } from '../../../test-inline-math';
import FlybyLab from './FlybyLab';

const presetSelect = () => screen.getByRole('combobox', { name: 'Valores de referencia' });
const rings = () => [...document.querySelectorAll('[data-testid="flyby-rings"] circle')];
const planetRadius = () => Number(screen.getByTestId('flyby-planet').getAttribute('r'));
const rpField = () => screen.getByRole('textbox', { name: 'Máxima aproximación r sub p' });
const frameName = () =>
  screen.getByRole('img', { name: /^Sobrevuelo en el marco/ }).getAttribute('aria-label') ?? '';

/** Each ring's edges in planet radii, from its stroke: the circle at the middle, as wide as the ring. */
function ringEdges(): [string, number, number][] {
  const radius = planetRadius();
  return rings().map((ring) => {
    const r = Number(ring.getAttribute('r'));
    const half = Number(ring.getAttribute('stroke-width')) / 2;
    return [
      ring.getAttribute('data-ring') ?? '',
      Number(((r - half) / radius).toFixed(3)),
      Number(((r + half) / radius).toFixed(3)),
    ];
  });
}

async function typeRp(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.clear(rpField());
  await user.type(rpField(), `${text}{Enter}`);
}

/** The width the surface casing adds to a trace drawn over the rings: 1,5 px on each side. */
const CASING_EXTRA = 3;

describe('Saturn’s rings in the planet frame', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDialogPolyfill();
  });
  afterEach(() => {
    cleanup();
    uninstall();
    localStorage.clear();
    resetSettingsForTests();
  });

  test('only Saturn has rings: none at Jupiter, Uranus or Neptune', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);

    expect(rings()).toHaveLength(0);
    for (const name of ['V2 · Urano', 'V2 · Neptuno', 'V1 · Júpiter']) {
      await user.selectOptions(presetSelect(), name);
      expect(rings(), name).toHaveLength(0);
    }
    await user.selectOptions(presetSelect(), 'V2 · Saturno');
    expect(rings()).toHaveLength(3);
  });

  test('C, B and A at their radii in R_S, under the planet and the track, colored by the token', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);
    await user.selectOptions(presetSelect(), 'V2 · Saturno');

    expect(ringEdges()).toEqual([
      ['C', 1.239, 1.526],
      ['B', 1.526, 1.95],
      ['A', 2.03, 2.27],
    ]);
    const group = screen.getByTestId('flyby-rings');
    // Drawn first: the planet, the periapsis line, the track and the probe go over them.
    expect(group.compareDocumentPosition(screen.getByTestId('flyby-planet'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(rings().map((ring) => ring.getAttribute('fill'))).toEqual(['none', 'none', 'none']);
    expect(rings().map((ring) => (ring as SVGElement).style.stroke)).toEqual([
      'color-mix(in srgb, var(--saturn) 70%, black)',
      'var(--saturn)',
      'var(--saturn)',
    ]);
  });

  test('the corner texts go over the rings, legible on them: a backdrop for the key, halos for the texts', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);
    await user.selectOptions(presetSelect(), 'V2 · Saturno');
    const after = (a: Element, b: Element) =>
      a.compareDocumentPosition(b) === Node.DOCUMENT_POSITION_FOLLOWING;
    const rpValue = screen.getByTestId('flyby-rp-value');

    expect(after(screen.getByTestId('flyby-rings'), rpValue)).toBe(true);
    expect(after(screen.getByTestId('flyby-probe'), rpValue)).toBe(true);
    expect(document.querySelector('[data-hud-backdrop="vp-key"]')).toHaveAttribute(
      'fill',
      'var(--bg-elevated)',
    );
    expect(rpValue.querySelector('[paint-order="stroke"]')).not.toBeNull();
  });

  test('the frame’s description names the rings, their plane and where r_p falls', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);
    expect(frameName()).not.toMatch(/anillos/);

    await user.selectOptions(presetSelect(), 'V1 · Saturno');

    expect(frameName()).toMatch(
      /Los anillos principales, de 1,24 a 2,27 R sub S, van a escala de distancia al centro, dibujados en el plano del sobrevuelo; su plano real está inclinado\. La máxima aproximación queda por fuera del anillo A\.$/,
    );
  });

  test('with Saturn drawn enlarged the description says the rings go in proportion, not to scale', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);
    await user.selectOptions(presetSelect(), 'V2 · Saturno');
    await typeRp(user, '100');

    expect(screen.getByText('planeta agrandado')).toBeInTheDocument();
    expect(frameName()).toMatch(
      /Los anillos principales, de 1,24 a 2,27 R sub S, van en proporción al planeta, que se dibuja agrandado, en el plano del sobrevuelo; su plano real está inclinado\./,
    );
    expect(frameName()).not.toMatch(/a escala/);
  });

  test('over the rings the track, the stretch flown and the periapsis line ride on a casing of the surface', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);
    await user.selectOptions(presetSelect(), 'V2 · Saturno');
    await typeRp(user, '2');

    for (const name of ['track', 'travelled', 'periapsis']) {
      const trace = document.querySelector(`[data-trace="${name}"]`) as SVGElement;
      const casing = trace.previousElementSibling as SVGElement;
      expect(casing.getAttribute('data-casing'), name).toBe(name);
      expect(casing.getAttribute('stroke'), name).toBe('var(--bg-elevated)');
      expect(
        Number(casing.getAttribute('stroke-width')) - Number(trace.getAttribute('stroke-width')),
        name,
      ).toBe(CASING_EXTRA);
      for (const attribute of ['d', 'x1', 'y1', 'x2', 'y2', 'stroke-dasharray']) {
        expect(casing.getAttribute(attribute), `${name} ${attribute}`).toBe(
          trace.getAttribute(attribute),
        );
      }
    }
  });

  test('«planeta agrandado» sits on a backdrop of the surface, which the rings never show through', async () => {
    const user = userEvent.setup();
    render(<FlybyLab />);
    await user.selectOptions(presetSelect(), 'V2 · Saturno');
    await typeRp(user, '100');
    const note = screen.getByText('planeta agrandado');
    const backdrop = document.querySelector('[data-hud-backdrop="note"]');

    expect(backdrop).toHaveAttribute('fill', 'var(--bg-elevated)');
    expect(backdrop?.compareDocumentPosition(note)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // Its box is the note's text, so the scale bar's ticks on the line below keep their room.
    expect(
      Number(backdrop?.getAttribute('y')) + Number(backdrop?.getAttribute('height')),
    ).toBeLessThanOrEqual(Number(note.getAttribute('y')) + 4);
  });

  test('«Qué deja fuera» says the rings are drawn in the flyby’s plane and the colors are illustrative', () => {
    const { container } = render(<FlybyLab />);
    const leftOut = container.querySelector('details[data-lab-note="left-out"]');

    expect(mathSourceText(leftOut as HTMLElement)).toMatch(
      /de 1,24 a 2,27 \$R_\\mathrm\{S\}\$ según la NASA, pero dibujados como si estuvieran en el plano del sobrevuelo/,
    );
    expect(leftOut).toHaveTextContent(/se verían como elipses/);
    expect(leftOut).toHaveTextContent(
      /que la pista cruce los anillos en el dibujo no quiere decir que la sonda los atraviese/,
    );
    expect(leftOut).toHaveTextContent(/Los colores de los planetas son ilustrativos/);
    // Each thing left undrawn with its own reason: a view the model lacks, or too faint or thin.
    expect(leftOut).toHaveTextContent(
      'No se dibujan las bandas de Júpiter ni el eje tumbado de Urano, que dependen de desde dónde se mire el planeta, ni los anillos de Júpiter, Urano y Neptuno, muy tenues o muy estrechos para verse a esta escala.',
    );
    expect(leftOut).not.toHaveTextContent(/no sabe cómo se verían/);
  });
});
