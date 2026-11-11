import { describe, expect, test } from 'vitest';
import type { SettingOption } from './SettingsDrawer';
import { settingChips } from './settingChips';

const noop = () => {};

const toggle = (key: string, value: boolean, chip?: string): SettingOption => ({
  key,
  label: `Ajuste ${key}`,
  kind: 'toggle',
  value,
  chip,
  onChange: noop,
});

const speed: SettingOption = {
  key: 'speed',
  label: 'Velocidad',
  kind: 'select',
  value: '0.5',
  options: [
    { value: '0.5', label: '0,5×' },
    { value: '1', label: '1×' },
  ],
  chip: 'Velocidad',
  onChange: noop,
};

const scale: SettingOption = {
  key: 'scale',
  label: 'Escala de vectores',
  kind: 'range',
  value: 1.5,
  min: 0.5,
  max: 3,
  step: 0.25,
  unit: '×',
  chip: 'escala',
  onChange: noop,
};

describe('settingChips', () => {
  test('a toggle shows its chip only while it is on, named by the chip itself', () => {
    expect(
      settingChips([toggle('trail', true, 'estela'), toggle('grid', false, 'rejilla')]),
    ).toEqual([{ key: 'trail', text: 'estela', name: 'estela' }]);
  });

  test('a select shows the chosen option and is named with the chip before it', () => {
    expect(settingChips([speed])).toEqual([{ key: 'speed', text: '0,5×', name: 'Velocidad 0,5×' }]);
  });

  test('an option may give its chip in TeX: the native <option> keeps its plain label', () => {
    const damping: SettingOption = {
      key: 'damping',
      label: 'Amortiguación',
      kind: 'select',
      value: 'critica',
      options: [
        {
          value: 'critica',
          label: 'Crítica, c = 2 raíz(k m)',
          chip: 'Crítica, $c = 2\\sqrt{k m}$',
        },
      ],
      chip: 'Amortiguación',
      onChange: noop,
    };

    expect(settingChips([damping])).toEqual([
      {
        key: 'damping',
        text: 'Crítica, $c = 2\\sqrt{k m}$',
        name: 'Amortiguación Crítica, c = 2 raíz de (k m)',
      },
    ]);
  });

  test('a select whose value has no option shows the raw value rather than nothing', () => {
    expect(settingChips([{ ...speed, value: '3' }])).toEqual([
      { key: 'speed', text: '3', name: 'Velocidad 3' },
    ]);
  });

  test('a range shows the chip and its value at the precision of its step, with the unit', () => {
    expect(settingChips([scale])).toEqual([
      { key: 'scale', text: 'escala 1,50 ×', name: 'escala 1,50 ×' },
    ]);
  });

  test('an option without a chip never shows, whatever its kind or value', () => {
    const { chip: _speed, ...plainSpeed } = speed as Extract<SettingOption, { kind: 'select' }>;
    const { chip: _scale, ...plainScale } = scale as Extract<SettingOption, { kind: 'range' }>;

    expect(settingChips([toggle('a', true), plainSpeed, plainScale])).toEqual([]);
  });

  test('a chip with notation is shown typeset and named in words', () => {
    expect(settingChips([toggle('vinf', true, 'vectores $\\vec v_\\infty$')])).toEqual([
      { key: 'vinf', text: 'vectores $\\vec v_\\infty$', name: 'vectores vector v sub infinito' },
    ]);
  });

  test('keeps the order of the drawer', () => {
    const keys = settingChips([speed, toggle('trail', true, 'estela'), scale]).map(
      ({ key }) => key,
    );

    expect(keys).toEqual(['speed', 'trail', 'scale']);
  });
});
