// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Preset } from '../../lib/presets';
import { mathSourceText } from '../../test-inline-math';
import LabPresets, { MAX_PRESET_CHIPS, PRESETS_LABEL } from './LabPresets';

type G = { g: number };
const preset = (id: string, extra: Partial<Preset<G>> = {}): Preset<G> => ({
  id,
  name: `Planeta ${id}`,
  values: { g: id.length },
  ...extra,
});

const FEW: Preset<G>[] = [
  preset('tierra', { sourceLabel: 'g estándar', note: 'Superficie, $g$ = 9,81 m/s².' }),
  preset('luna', {
    sourceLabel: 'NASA',
    sourceUrl: 'https://nssdc.gsfc.nasa.gov/',
    note: 'Media.',
  }),
];
const MANY: Preset<G>[] = ['a', 'b', 'c', 'd', 'e'].map((id) => preset(id));

const noteLine = () => screen.getByTestId('preset-note');

describe('LabPresets', () => {
  afterEach(() => {
    cleanup();
    // A spy left by a failed assertion must not leak into the next test.
    vi.restoreAllMocks();
  });

  test(`up to ${MAX_PRESET_CHIPS} presets are one-line chips in a group named «${PRESETS_LABEL}»`, () => {
    const onSelect = vi.fn();
    render(<LabPresets id="p" presets={FEW} activeId="tierra" onSelect={onSelect} />);

    const group = screen.getByRole('group', { name: 'Valores de referencia' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Planeta tierra', 'Planeta luna']);
    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect(buttons[0]).toHaveClass('whitespace-nowrap');

    fireEvent.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(FEW[1]);
  });

  test('a chip is its mark and one inline run: no flex gap opens around a formula in its name', () => {
    const withMath = [preset('rapido', { name: 'El giro más rápido ($\\approx$ 12 s)' })];
    render(<LabPresets id="p" presets={withMath} onSelect={vi.fn()} />);

    const chip = screen.getByRole('button');
    expect(chip.childNodes).toHaveLength(2);
    expect([...chip.children].map((child) => child.tagName)).toEqual(['SPAN', 'SPAN']);
    expect(chip.lastElementChild?.querySelector('.katex')).not.toBeNull();
  });

  test('a chip keeps the accessible name it had as a two-line button: name and source', () => {
    render(<LabPresets id="p" presets={FEW} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Planeta tierra g estándar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planeta luna NASA' })).toBeInTheDocument();
  });

  test(`more than ${MAX_PRESET_CHIPS} presets are a select with its visible label`, () => {
    const onSelect = vi.fn();
    render(<LabPresets id="p" presets={MANY} activeId="b" onSelect={onSelect} />);

    const select = screen.getByRole('combobox', { name: 'Valores de referencia' });
    expect(select).toHaveValue('b');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(MANY.map(({ name }) => name));
    expect(screen.queryByRole('group', { name: 'Valores de referencia' })).toBeNull();

    fireEvent.change(select, { target: { value: 'd' } });
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(MANY[3]);
  });

  test('the select says «Personalizado» once the values no longer match a preset', () => {
    render(<LabPresets id="p" presets={MANY} onSelect={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'Valores de referencia' });
    const placeholder = within(select).getByRole('option', { name: 'Personalizado' });
    expect(select).toHaveValue('');
    expect(placeholder).toBeDisabled();
  });

  test('an activeId that names no preset reads as «Personalizado», without a React warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<LabPresets id="p" presets={MANY} activeId="desconocido" onSelect={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'Valores de referencia' });
    expect(select).toHaveValue('');
    expect(within(select).getByRole('option', { name: 'Personalizado' })).toBeDisabled();
    expect(screen.queryByTestId('preset-note')).toBeNull();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  test('an option takes the preset’s plain optionLabel, since an <option> cannot hold KaTeX', () => {
    const withMath = [
      ...MANY.slice(1),
      preset('z', { name: '$P_\\text{máx}$ bajo', optionLabel: 'P máx bajo' }),
    ];
    render(<LabPresets id="p" presets={withMath} activeId="z" onSelect={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'P máx bajo' })).toBeInTheDocument();
  });

  test('a select would print raw TeX: a preset named with $…$ and no optionLabel throws', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const withMath = [...MANY.slice(1), preset('z', { name: '$P_\\text{máx}$ bajo' })];

    expect(() => render(<LabPresets id="p" presets={withMath} onSelect={vi.fn()} />)).toThrow(
      /optionLabel/,
    );
    error.mockRestore();
  });

  test('one line under the choice: the active preset’s note, then «Fuente:» and its link', () => {
    const { rerender } = render(
      <LabPresets id="p" presets={FEW} activeId="luna" onSelect={vi.fn()} />,
    );

    expect(noteLine()).toHaveTextContent('Media. Fuente: NASA');
    expect(within(noteLine()).getByRole('link', { name: 'NASA' })).toHaveAttribute(
      'href',
      'https://nssdc.gsfc.nasa.gov/',
    );

    rerender(<LabPresets id="p" presets={FEW} activeId="tierra" onSelect={vi.fn()} />);
    expect(mathSourceText(noteLine())).toBe('Superficie, $g$ = 9,81 m/s². Fuente: g estándar');
    expect(within(noteLine()).queryByRole('link')).toBeNull();
  });

  test('a source without a note is the whole line', () => {
    const sourceOnly = [preset('marte', { sourceLabel: 'NSSDCA' }), ...MANY];
    render(<LabPresets id="p" presets={sourceOnly} activeId="marte" onSelect={vi.fn()} />);

    expect(noteLine().textContent).toBe('Fuente: NSSDCA');
  });

  test('no note line while no preset is active, or when the active one has neither note nor source', () => {
    const { rerender } = render(<LabPresets id="p" presets={FEW} onSelect={vi.fn()} />);
    expect(screen.queryByTestId('preset-note')).toBeNull();

    rerender(<LabPresets id="p" presets={MANY} activeId="a" onSelect={vi.fn()} />);
    expect(screen.queryByTestId('preset-note')).toBeNull();
  });

  test('with groups, the select lists each group as an <optgroup> in the groups’ order', () => {
    const grouped = MANY.map((item, i) => ({ ...item, group: i < 2 ? 'real' : 'mal' }));
    const { container } = render(
      <LabPresets
        id="p"
        presets={grouped}
        groups={[
          { id: 'mal', label: 'Se sienten mal' },
          { id: 'real', label: 'Realistas' },
        ]}
        activeId="a"
        onSelect={vi.fn()}
      />,
    );

    const groups = [...container.querySelectorAll('optgroup')];
    expect(groups.map((group) => group.label)).toEqual(['Se sienten mal', 'Realistas']);
    expect(groups.map((group) => [...group.children].map((option) => option.textContent))).toEqual([
      ['Planeta c', 'Planeta d', 'Planeta e'],
      ['Planeta a', 'Planeta b'],
    ]);
    expect(screen.getByRole('combobox', { name: 'Valores de referencia' })).toHaveValue('a');
  });

  test('with groups, a preset in none of them throws rather than vanish from the select', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const grouped = MANY.map((item) => ({ ...item, group: item.id === 'e' ? 'otro' : 'real' }));

    expect(() =>
      render(
        <LabPresets
          id="p"
          presets={grouped}
          groups={[{ id: 'real', label: 'Realistas' }]}
          onSelect={vi.fn()}
        />,
      ),
    ).toThrow(/Planeta e/);
    error.mockRestore();
  });

  test('after an edit, the preset it was based on keeps its note, led by «Valores modificados…»', () => {
    const notes = MANY.map((item) => ({ ...item, note: `Nota ${item.id}.`, sourceLabel: 'NASA' }));
    const { rerender } = render(
      <LabPresets id="p" presets={notes} activeId="b" basedOnId="b" onSelect={vi.fn()} />,
    );
    expect(noteLine().textContent).toBe('Nota b. Fuente: NASA');

    rerender(<LabPresets id="p" presets={notes} basedOnId="b" onSelect={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Valores de referencia' })).toHaveValue('');
    expect(noteLine().textContent).toBe(
      'Valores modificados a partir de «Planeta b»; la nota describe el preajuste original. Nota b. Fuente: NASA',
    );
  });

  test('every lab gets «Valores modificados…»: after an edit the last preset’s note stays, with no prop', () => {
    const notes = FEW.map((item) => ({ ...item, note: `Nota ${item.id}.` }));
    const { rerender } = render(
      <LabPresets id="p" presets={notes} activeId="luna" onSelect={vi.fn()} />,
    );

    rerender(<LabPresets id="p" presets={notes} onSelect={vi.fn()} />);

    expect(noteLine().textContent).toBe(
      'Valores modificados a partir de «Planeta luna»; la nota describe el preajuste original. Nota luna. Fuente: NASA',
    );
  });

  test('the note line never shrinks on an edit: it already holds the room of its edited version', () => {
    const notes = FEW.map((item) => ({ ...item, note: `Nota ${item.id}.` }));
    const { container } = render(
      <LabPresets id="p" presets={notes} activeId="luna" onSelect={vi.fn()} />,
    );

    // The visible note and, in the same grid cell, its edited version hidden from everyone.
    const cell = noteLine().parentElement as HTMLElement;
    expect(cell).toHaveClass('grid');
    const reserve = cell.querySelector('[data-preset-note-reserve]') as HTMLElement;
    expect(reserve).toHaveAttribute('aria-hidden', 'true');
    expect(reserve).toHaveClass('invisible');
    expect(reserve.textContent).toBe(
      'Valores modificados a partir de «Planeta luna»; la nota describe el preajuste original. Nota luna. Fuente: NASA',
    );
    expect(container.querySelectorAll('[data-testid="preset-note"]')).toHaveLength(1);
  });

  test('the select’s label sits above it, as every choice of a lab’s levels', () => {
    render(<LabPresets id="p" presets={MANY} activeId="a" onSelect={vi.fn()} />);

    const field = screen.getByRole('combobox', { name: 'Valores de referencia' }).closest('div')
      ?.parentElement as HTMLElement;
    expect(field).toHaveClass('flex-col');
  });

  test('takes another name for its group or select', () => {
    render(<LabPresets id="p" label="Preajuste" presets={MANY} activeId="a" onSelect={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Preajuste' })).toBeInTheDocument();
  });

  test('marks its root for the glyph guard with the form it took', () => {
    const { container, rerender } = render(<LabPresets id="p" presets={FEW} onSelect={vi.fn()} />);
    expect(container.querySelector('[data-lab-presets]')).toHaveAttribute(
      'data-lab-presets',
      'chips',
    );

    rerender(<LabPresets id="p" presets={MANY} onSelect={vi.fn()} />);
    expect(container.querySelector('[data-lab-presets]')).toHaveAttribute(
      'data-lab-presets',
      'select',
    );
  });
});
