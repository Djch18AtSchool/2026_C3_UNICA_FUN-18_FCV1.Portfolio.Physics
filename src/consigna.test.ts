import { describe, expect, test } from 'vitest';
import { COURSE, PHASE_LABELS, PHASES, TOPICS, topicByNumber, topicsByPhase } from './consigna';

describe('consigna', () => {
  test('lista solo los temas con consigna publicada: los del Avance 1, numerados 1..5', () => {
    expect(TOPICS.map((t) => t.number)).toEqual([1, 2, 3, 4, 5]);
  });
  test('los slugs son únicos y en kebab-case', () => {
    const slugs = TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
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
  test('el Avance 2 y la Entrega Final aún no tienen temas', () => {
    expect(topicsByPhase(1, TOPICS).map((t) => t.number)).toEqual([1, 2, 3, 4, 5]);
    expect(topicsByPhase(2, TOPICS)).toEqual([]);
    expect(topicsByPhase(3, TOPICS)).toEqual([]);
  });
  test('PHASES lista cada fase con etiqueta, en orden', () => {
    expect(PHASES).toEqual([1, 2, 3]);
    expect(PHASES.map((phase) => PHASE_LABELS[phase])).toEqual([
      'Avance 1',
      'Avance 2',
      'Entrega Final',
    ]);
  });
  test('COURSE guarda solo lo que el sitio muestra: sin escuela, sección ni periodo', () => {
    expect(Object.keys(COURSE).sort()).toEqual(['code', 'name', 'professor', 'university']);
    expect(COURSE.university).toBe('Universidad CENFOTEC');
    expect(COURSE.name).toBe('Física I');
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
