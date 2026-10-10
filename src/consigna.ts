export type Phase = 1 | 2 | 3;
export type ResourceType = 'simulacion' | 'visualizacion' | 'diagrama' | 'multimedia';

export interface ConsignaTopic {
  readonly number: number;
  readonly slug: string;
  readonly title: string;
  readonly phase: Phase;
}

export const TOPICS: readonly ConsignaTopic[] = Object.freeze(
  [
    {
      number: 1,
      slug: 'dron-reparto',
      phase: 1,
      title: 'Rastreo y navegación de un dron de reparto',
    },
    {
      number: 2,
      slug: 'salto-personaje',
      phase: 1,
      title: 'El salto del personaje: cómo los motores de juego falsean la gravedad',
    },
    {
      number: 3,
      slug: 'gravedad-artificial',
      phase: 1,
      title: 'Gravedad artificial por rotación en hábitats espaciales',
    },
    {
      number: 4,
      slug: 'llantas-f1',
      phase: 1,
      title: 'Llantas de Fórmula 1: la ventana de temperatura y el agarre',
    },
    {
      number: 5,
      slug: 'control-haptico',
      phase: 1,
      title: 'El resorte virtual detrás de un control háptico',
    },
    {
      number: 6,
      slug: 'frenado-regenerativo',
      phase: 2,
      title: 'Frenado regenerativo en un vehículo eléctrico',
    },
    {
      number: 7,
      slug: 'coeficiente-restitucion',
      phase: 2,
      title: 'El coeficiente de restitución en un motor de videojuego',
    },
    { number: 8, slug: 'ruedas-reaccion', phase: 2, title: 'Ruedas de reacción en satélites' },
    {
      number: 9,
      slug: 'asistencia-gravitatoria',
      phase: 2,
      title: 'Asistencia gravitatoria de la Voyager',
    },
    { number: 10, slug: 'spring-animations', phase: 3, title: 'Spring animations en interfaces' },
    { number: 11, slug: 'sintesis-sonido', phase: 3, title: 'Síntesis de sonido y armónicos' },
    {
      number: 12,
      slug: 'resonancia-tacoma',
      phase: 3,
      title: 'Resonancia estructural y Tacoma Narrows',
    },
    {
      number: 13,
      slug: 'enfriamiento-datacenter',
      phase: 3,
      title: 'Enfriamiento líquido de un centro de datos',
    },
  ].map((topic) => Object.freeze(topic) as ConsignaTopic),
);

/** The three deliveries, in order; navigation groups topics by them. */
export const PHASES: readonly Phase[] = [1, 2, 3];

export const PHASE_LABELS: Record<Phase, string> = {
  1: 'Avance 1',
  2: 'Avance 2',
  3: 'Entrega Final',
};

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  simulacion: 'Simulación interactiva',
  visualizacion: 'Visualización de datos',
  diagrama: 'Diagrama',
  multimedia: 'Multimedia con análisis',
};

export const COURSE = {
  code: 'FUN-18',
  name: 'Física I',
  section: 'FCV1',
  period: '2026-C3',
  university: 'Universidad CENFOTEC',
  school: 'Escuela de Fundamentos',
  professor: 'Andrés Castro Núñez',
} as const;

export const AUTHOR = 'Dylan Chaves';
export const REPO_URL =
  'https://github.com/Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics';
export const SITE_URL =
  'https://djch18atschool.github.io/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/';

export function topicBySlug(slug: string): ConsignaTopic | undefined {
  return TOPICS.find((topic) => topic.slug === slug);
}

export function topicByNumber(n: number): ConsignaTopic | undefined {
  return TOPICS.find((topic) => topic.number === n);
}

/** Topics of one phase sorted by number: the consigna list, or any list of topic summaries. */
export function topicsByPhase<T extends { phase: Phase; number: number }>(
  phase: Phase,
  topics: readonly T[],
): T[] {
  return topics.filter((topic) => topic.phase === phase).sort((a, b) => a.number - b.number);
}
