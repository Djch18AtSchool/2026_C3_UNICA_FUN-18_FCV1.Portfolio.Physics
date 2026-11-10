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
  afterEach(cleanup);

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
