/**
 * Table of Tema 2: the jump constants of Celeste (Player.cs) and Super Mario Bros. (the
 * disassembly) as their code prints them, converted to SI with the scales I assume
 * (docs/superpowers/research/2026-10-08-sources.md, sections 1 and 3). The simulator presets in
 * src/lib/data/jumpPresets.ts round the same conversions.
 */
import { JUMP_SCALES } from '../../data/jumpPresets';
import { formatNumber } from '../../format';
import type { DataTableSpec } from '../types';

/** Celeste: 8 px = 1 m (Madeline's hitbox); Super Mario Bros.: 16 px = 1 m (a block), 60 frames/s. */
const {
  celestePxPerM: CELESTE_PX_PER_M,
  smbPxPerM: SMB_PX_PER_M,
  smbFramesPerS: SMB_FRAMES_PER_S,
} = JUMP_SCALES;

type CodeUnit = 'px/s' | 'px/s²' | 's' | 'px/cuadro' | 'px/cuadro²';

/** One game constant: its value and unit as the code has them, and the decimals of its SI value. */
export interface GameConstant {
  name: string;
  game: 'Celeste' | 'Super Mario Bros.';
  value: number;
  unit: CodeUnit;
  /** Decimals of the value as the code prints it. */
  decimals: number;
  /** Decimals of the SI value, as the page has always written it. */
  siDecimals: number;
}

const SI_UNIT: Readonly<Record<CodeUnit, string>> = {
  'px/s': 'm/s',
  'px/s²': 'm/s²',
  s: 's',
  'px/cuadro': 'm/s',
  'px/cuadro²': 'm/s²',
};

const CELESTE = 'Celeste';
const SMB = 'Super Mario Bros.';

export const GAME_CONSTANTS: readonly GameConstant[] = [
  { name: 'Gravity', game: CELESTE, value: 900, unit: 'px/s²', decimals: 0, siDecimals: 1 },
  { name: 'JumpSpeed', game: CELESTE, value: -105, unit: 'px/s', decimals: 0, siDecimals: 1 },
  { name: 'MaxRun', game: CELESTE, value: 90, unit: 'px/s', decimals: 0, siDecimals: 2 },
  { name: 'HalfGravThreshold', game: CELESTE, value: 40, unit: 'px/s', decimals: 0, siDecimals: 0 },
  { name: 'VarJumpTime', game: CELESTE, value: 0.2, unit: 's', decimals: 1, siDecimals: 1 },
  { name: 'MaxFall', game: CELESTE, value: 160, unit: 'px/s', decimals: 0, siDecimals: 0 },
  { name: 'Salto parado', game: SMB, value: 4, unit: 'px/cuadro', decimals: 0, siDecimals: 0 },
  {
    name: 'Gravedad con A sostenido',
    game: SMB,
    value: 0.125,
    unit: 'px/cuadro²',
    decimals: 3,
    siDecimals: 1,
  },
  {
    name: 'Gravedad al soltar A o al empezar a caer',
    game: SMB,
    value: 0.4375,
    unit: 'px/cuadro²',
    decimals: 4,
    siDecimals: 1,
  },
];

/**
 * The constant in SI with +y up: px → m with the game's scale, frames → s at 60 frames/s.
 * Celeste's screen +y points down, so its JumpSpeed (−105 px/s) is an upward 13,125 m/s.
 */
export function toSi({ game, value, unit }: GameConstant): number {
  const upward = Math.abs(value);
  switch (unit) {
    case 's':
      return value;
    case 'px/s':
    case 'px/s²':
      return upward / (game === CELESTE ? CELESTE_PX_PER_M : SMB_PX_PER_M);
    case 'px/cuadro':
      return (upward * SMB_FRAMES_PER_S) / SMB_PX_PER_M;
    case 'px/cuadro²':
      return (upward * SMB_FRAMES_PER_S * SMB_FRAMES_PER_S) / SMB_PX_PER_M;
  }
}

const constantRow = (constant: GameConstant) => ({
  constante: constant.name,
  juego: constant.game,
  codigo: formatNumber(constant.value, { precision: constant.decimals, unit: constant.unit }),
  si: formatNumber(toSi(constant), {
    precision: constant.siDecimals,
    unit: SI_UNIT[constant.unit],
  }),
});

/** The finest precision a row prints in each column (the cells are written per constant). */
const CODE_PRECISION = Math.max(...GAME_CONSTANTS.map((constant) => constant.decimals));
const SI_PRECISION = Math.max(...GAME_CONSTANTS.map((constant) => constant.siDecimals));

const CONSTANTES: DataTableSpec = {
  id: 'salto-personaje-constantes',
  caption: `Constantes de salto de los dos juegos y su conversión a SI: Celeste a ${CELESTE_PX_PER_M} px = 1 m; Super Mario Bros. a ${SMB_PX_PER_M} px = 1 m (el lado de un bloque) y ${SMB_FRAMES_PER_S} cuadros/s. JumpSpeed es negativa porque en pantalla +y apunta hacia abajo; en SI va con +y hacia arriba.`,
  columns: [
    { key: 'constante', label: 'Constante', align: 'text' },
    { key: 'juego', label: 'Juego', align: 'text' },
    // Each cell carries its own precision and unit; right-aligned as every number (R40).
    { key: 'codigo', label: 'En el código', align: 'num', precision: CODE_PRECISION },
    { key: 'si', label: 'En SI', align: 'num', precision: SI_PRECISION },
  ],
  rows: GAME_CONSTANTS.map(constantRow),
  source: {
    text: 'Constantes de Player.cs (fuente 1) y del desensamblado de Super Mario Bros. (fuente 3), convertidas con escalas que supongo yo y que el código no fija',
  },
};

export const TABLES: readonly DataTableSpec[] = [CONSTANTES];
