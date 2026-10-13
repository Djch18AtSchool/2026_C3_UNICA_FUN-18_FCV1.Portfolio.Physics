# Portafolio de evidencias de Física I

- **Autor:** Dylan Chaves
- **Universidad:** Universidad CENFOTEC
- **Curso:** FUN-18 Física I
- **Sección:** FCV1
- **Periodo:** 2026-C3
- **Docente:** Andrés Castro Núñez

## Enlaces

- Sitio: https://djch18atschool.github.io/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/
- Repositorio: https://github.com/Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics

## Temas

| #   | Tema                                                                  | Avance   |
| --- | --------------------------------------------------------------------- | -------- |
| 1   | Rastreo y navegación de un dron de reparto                            | Avance 1 |
| 2   | El salto del personaje: cómo los motores de juego falsean la gravedad | Avance 1 |
| 3   | Gravedad artificial por rotación en hábitats espaciales               | Avance 1 |
| 4   | Llantas de Fórmula 1: la ventana de temperatura y el agarre           | Avance 1 |
| 5   | El resorte virtual detrás de un control háptico                       | Avance 1 |

Los temas del Avance 2 y de la Entrega Final se agregan cuando llegue su consigna. Hasta entonces, el sitio muestra esas dos entregas solo como secciones con la insignia «Se publica con su consigna».

## Estado del Avance 1

Los cinco temas del Avance 1 están publicados en el formato de pasos de la versión 2: cada tema se lee en pasos (`Step`), cada paso con su explicación de apoyo (`Why`) y un laboratorio interactivo propio (dron, salto, hábitat, llantas y gatillo). Cada uno conserva su análisis escrito y el tipo de recurso de apoyo prescrito, sin sustituciones: visualización de datos (Tema 1), simulación interactiva (Tema 2), diagrama (Tema 3), visualización de datos (Tema 4) y multimedia con análisis (Tema 5). El Tema 5 incrusta un video de terceros, citado como fuente: la entrevista de PlayStation Access «A Game Developer Explains How PS5's DualSense Actually Works» (2021), con el análisis propio de cuatro instantes. Se carga desde `youtube-nocookie.com` solo cuando el lector lo pide (`src/lib/youtube.ts`, `HapticVideo`); sin JavaScript, la fachada y cada marca enlazan a YouTube.

## Estructura

- `.github/workflows/`: CI y despliegue a GitHub Pages.
- `docs/`: especificaciones, planes e investigación del proyecto.
- `public/`: recursos estáticos (el favicon).
- `scripts/`: `generate-drone-route.ts` (genera el conjunto de datos del dron) y `compress-video.sh` (comprime un video propio a 720p; hoy sin uso, queda como plan B si el Tema 5 necesitara un video grabado por el autor).
- `src/consigna.ts`: datos del curso, fases y temas con consigna (hoy los cinco del Avance 1); un tema nuevo entra aquí y en `src/content/topics/` cuando llega su consigna.
- `src/content/topics/`: un archivo MDX por tema. Todo tema publicado tiene al menos 3 `Step` y un `Why` por cada `Step`; `src/content/topics.test.ts` lo verifica.
- `src/data/`: conjuntos de datos generados.
- `src/lib/settingsStore.ts`: ajustes globales (decimales, cuadrícula, movimiento) guardados en `localStorage` bajo la clave `portafolio.settings`.
- `src/lib/`: también el índice de búsqueda (`searchIndex.ts`, `sectionHeadings.ts`), el estado persistido de la navegación (`navState.ts`, claves `portafolio.nav.avance-N`), `readingTime.ts` y `lastUpdate.ts` (la fecha del último commit, que muestra la portada).
- `src/lib/physics/`: núcleo de física puro, con pruebas.
- `src/lib/data/`: modelos y preajustes con sus fuentes.
- `src/components/ui/`: componentes de interfaz base, incluidos `Step.astro` y `Why.astro` (el modelo de contenido por pasos).
- `src/components/lab/`: el armazón de los laboratorios (`LabShell`, `SettingsDrawer`, `ParamField`, `TransportBar`, `useSimClock`), las gráficas SVG (`SvgPlot` con su cursor, ejes y marcas), los ajustes de reproducción comunes (`clockSettings`), `useDrag`, `OverlayMarks`, `PlotPoints`, `scrollLock` y `useSettledText`.
- `src/components/controls/`: controles interactivos (deslizadores, botones).
- `src/components/charts/`: gráficas.
- `src/components/nav/`: navegación: barra lateral con búsqueda (`SidebarSearch`), `TopicTools`, el pie (solo el icono de GitHub) y `BackToTop.astro`, el botón flotante "Volver arriba" de todas las páginas.
- `src/components/hooks/`: hooks de React compartidos.
- `src/components/topics/`: laboratorios y figuras de cada tema (`JumpLab`, `DroneLab`, `HabitatLab`, `TyreLab`, `TriggerLab`).
- `src/layouts/`: plantillas de página.
- `src/pages/`: páginas del sitio (`temas/` para cada tema).
- `src/styles/`: estilos globales.
- `tests/e2e/`: pruebas de extremo a extremo (Playwright).

## Comandos

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run preview --ignore-lock
pnpm run check
pnpm run test
pnpm run test:cov
pnpm run e2e
E2E_PORT=4322 pnpm run e2e
pnpm run format
pnpm run data:drone
bash scripts/compress-video.sh media-raw/<archivo>  # plan B del Tema 5, hoy sin uso
```

`E2E_PORT=4322 pnpm run e2e` ejecuta las pruebas de extremo a extremo en otro puerto; úsalo en local cuando un servidor de desarrollo ocupa el 4321.
