import type { Preset } from '../../components/controls/Presets';
import type { JumpSettings } from '../../components/topics/salto-personaje/jumpModel';

/**
 * Reference jumps for the simulator. Game values are converted from pixels with a declared scale
 * (docs/superpowers/research/2026-10-08-sources.md, sections 1 and 3); the conversions are mine:
 *   Celeste, 8 px = 1 m (hitbox width):  900 / 8 = 112,5 m/s²; 105 / 8 = 13,125 ≈ 13,1 m/s; 90 / 8 = 11,25 m/s.
 *   SMB, 16 px = 1 m, 60 frames/s:  4 · 60 / 16 = 15 m/s; 0,125 · 60² / 16 = 28,125 ≈ 28,1 m/s²;
 *   0,4375 / 0,125 = 3,5.
 */
export const JUMP_PRESETS: Preset<JumpSettings>[] = [
  {
    id: 'tierra',
    name: 'Tierra',
    values: { v0: 8, g: 9.81, vx: 3, fallMultiplier: 1 },
    sourceLabel: 'g estándar, 9,81 m/s²',
    note: 'Gravedad terrestre estándar con el mismo impulso de 8 m/s; vₓ = 3 m/s es un valor ilustrativo.',
  },
  {
    id: 'luna',
    name: 'Luna',
    values: { v0: 8, g: 1.62, vx: 3, fallMultiplier: 1 },
    sourceLabel: 'g lunar, 1,62 m/s²',
    note: 'Gravedad en la superficie lunar con el mismo impulso: la altura y el tiempo en el aire salen unas 6 veces los terrestres (9,81 / 1,62 = 6,06).',
  },
  {
    id: 'celeste',
    name: 'Celeste',
    values: { v0: 13.1, g: 112.5, vx: 11.25, fallMultiplier: 1 },
    sourceLabel: 'Player.cs, Noel Berry (2018)',
    note: 'Escala supuesta 8 px = 1 m (el ancho de la caja de colisión, o hitbox, de Madeline): Gravity 900 px/s² → 112,5 m/s², JumpSpeed 105 px/s → 13,1 m/s, MaxRun 90 px/s → 11,25 m/s. No modela la prolongación del impulso (VarJumpTime 0,2 s) ni la media gravedad cerca del ápice.',
  },
  {
    id: 'super-mario-bros',
    name: 'Super Mario Bros.',
    values: { v0: 15, g: 28.1, vx: 6, fallMultiplier: 3.5 },
    sourceLabel: 'Desensamblado de SMB (doppelganger)',
    note: 'Escala supuesta 16 px = 1 m (un bloque) a 60 cuadros/s, salto parado: 4 px/cuadro → 15 m/s; 0,125 px/cuadro² → 28,1 m/s² mientras se sostiene A; desde el ápice, 0,4375 px/cuadro² (×3,5). Omite el tope de caída de 4 px/cuadro; vₓ = 6 m/s es ilustrativa.',
  },
];
