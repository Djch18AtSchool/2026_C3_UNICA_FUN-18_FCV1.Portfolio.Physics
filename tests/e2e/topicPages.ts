/** Every published topic page, derived from TOPICS, for the suites that check all of them. */
import { TOPICS } from '../../src/consigna';

/** The LabShell test id each topic page renders, by slug. */
const LAB_TEST_IDS: Readonly<Record<string, string>> = {
  'dron-reparto': 'drone-lab',
  'salto-personaje': 'jump-lab',
  'gravedad-artificial': 'habitat-lab',
  'llantas-f1': 'tyre-lab',
  'control-haptico': 'trigger-lab',
  'frenado-regenerativo': 'regen-lab',
  'coeficiente-restitucion': 'bounce-lab',
  'ruedas-reaccion': 'wheel-lab',
  'asistencia-gravitatoria': 'flyby-lab',
};

export interface TopicPage {
  number: number;
  slug: string;
  /** Relative to the base URL: "./temas/<slug>/". */
  path: string;
  /** data-testid of the page's laboratory (LabShell). */
  labTestId: string;
}

/** One entry per topic in TOPICS; a topic added without its lab test id fails every suite early. */
export const TOPIC_PAGES: readonly TopicPage[] = TOPICS.map(({ number, slug }) => {
  const labTestId = LAB_TEST_IDS[slug];
  if (!labTestId) {
    throw new Error(`tests/e2e/topicPages.ts: falta el test id del laboratorio de "${slug}"`);
  }
  return { number, slug, path: `./temas/${slug}/`, labTestId };
});
