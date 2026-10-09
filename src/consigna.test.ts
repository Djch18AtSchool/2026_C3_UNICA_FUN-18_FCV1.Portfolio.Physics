import { describe, expect, test } from 'vitest';
import { PHASE_LABELS, PHASES, TOPICS, topicByNumber, topicsByPhase } from './consigna';

describe('consigna', () => {
  test('hay 13 temas numerados 1..13 en orden', () => {
    expect(TOPICS.map((t) => t.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });
  test('los slugs son únicos y en kebab-case', () => {
    const slugs = TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(13);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  test('los títulos del Avance 1 son idénticos a la consigna', () => {
    expect(topicByNumber(1)?.title).toBe('Rastreo y navegación de un dron de reparto');
    expect(topicByNumber(2)?.title).toBe(
      'El salto del personaje: cómo los motores de juego falsean la gravedad',
    );
    expect(topicByNumber(3)?.title).toBe('Gravedad artificial por rotación en hábitats espaciales');
    expect(topicByNumber(4)?.title).toBe(
      'Llantas de Fórmula 1: la ventana de temperatura y el agarre',
    );
    expect(topicByNumber(5)?.title).toBe('El resorte virtual detrás de un control háptico');
  });
  test('las fases agrupan 5, 4 y 4 temas', () => {
    expect(topicsByPhase(1, TOPICS).map((t) => t.number)).toEqual([1, 2, 3, 4, 5]);
    expect(topicsByPhase(2, TOPICS).map((t) => t.number)).toEqual([6, 7, 8, 9]);
    expect(topicsByPhase(3, TOPICS).map((t) => t.number)).toEqual([10, 11, 12, 13]);
  });
  test('PHASES lista cada fase con etiqueta, en orden', () => {
    expect(PHASES).toEqual([1, 2, 3]);
    expect(PHASES.map((phase) => PHASE_LABELS[phase])).toEqual([
      'Avance 1',
      'Avance 2',
      'Entrega Final',
    ]);
  });
  test('topicsByPhase ordena por número cualquier lista de temas', () => {
    const shuffled = [
      { phase: 1, number: 3 },
      { phase: 2, number: 6 },
      { phase: 1, number: 1 },
    ] as const;
    expect(topicsByPhase(1, shuffled).map((t) => t.number)).toEqual([1, 3]);
  });
});
