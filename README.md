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

| #   | Tema                                                                                  | Avance   |
| --- | ------------------------------------------------------------------------------------- | -------- |
| 1   | Rastreo y navegación de un dron de reparto                                            | Avance 1 |
| 2   | El salto del personaje: cómo los motores de juego falsean la gravedad                 | Avance 1 |
| 3   | Gravedad artificial por rotación en hábitats espaciales                               | Avance 1 |
| 4   | Llantas de Fórmula 1: la ventana de temperatura y el agarre                           | Avance 1 |
| 5   | El resorte virtual detrás de un control háptico                                       | Avance 1 |
| 6   | Frenado regenerativo en un vehículo eléctrico                                         | Avance 2 |
| 7   | El coeficiente de restitución en un motor de videojuego: por qué la pelota rebota mal | Avance 2 |
| 8   | Ruedas de reacción: cómo un satélite se gira sin empujarse contra nada                | Avance 2 |
| 9   | Asistencia gravitatoria: cómo la Voyager ganó velocidad sin gastar combustible        | Avance 2 |

Los temas de la Entrega Final se agregan cuando llegue su consigna. Hasta entonces, el sitio muestra esa entrega solo como sección con la insignia «Se publica con su consigna».

## Estado

Los cinco temas del Avance 1 están publicados en el formato de pasos de la versión 2: cada tema se lee en pasos (`Step`), cada paso con su explicación de apoyo (`Why`) y un laboratorio interactivo propio (dron, salto, hábitat, llantas y gatillo). Cada uno conserva su análisis escrito y el tipo de recurso de apoyo prescrito, sin sustituciones: visualización de datos (Tema 1), simulación interactiva (Tema 2), diagrama (Tema 3), visualización de datos (Tema 4) y multimedia con análisis (Tema 5). El Tema 5 incrusta un video, citado como fuente: la entrevista de PlayStation Access «A Game Developer Explains How PS5's DualSense Actually Works» (2021), con el análisis propio de cuatro instantes. La fachada muestra la miniatura del video (pedida a `i.ytimg.com`) y su título; el reproductor se carga desde `youtube-nocookie.com` solo cuando el lector lo pide (`src/lib/youtube.ts`, `HapticVideo`); sin JavaScript, la fachada y cada marca enlazan a YouTube.

Los cuatro temas del Avance 2 siguen el mismo formato, cada uno con su laboratorio y su recurso prescrito: visualización de datos (Tema 6, energías acumuladas en el ciclo UDDS con ciclo y coeficientes reales de la EPA y el reparto regenerativo modelado con FASTSim), simulación interactiva (Tema 7, rebotes y choques con el paso de un motor de física), diagrama (Tema 8, el intercambio de momento angular entre satélite y rueda) y visualización de datos (Tema 9, la rapidez heliocéntrica de las Voyager según JPL Horizons). Desde el Avance 2, los datos de todos los temas viven en tablas (`DataTable`, numeradas por tema) y las leyendas quedan en dos o tres frases; cada tema del Avance 1 suma una conexión con un tema nuevo. El estado detallado, los pendientes y las decisiones están en `docs/superpowers/handoff/2026-10-31-avance-2-handoff.md`.

## Estructura

- `.github/workflows/`: CI y despliegue a GitHub Pages.
- `docs/`: especificaciones, planes e investigación del proyecto.
- `public/`: recursos estáticos (el favicon).
- `scripts/`: `generate-drone-route.ts` (genera el conjunto de datos del dron), `generate-drive-cycles.ts` (descarga los ciclos UDDS, HWFET y US06 de la EPA), `generate-voyager-speed.ts` (consulta a JPL Horizons la rapidez de las Voyager) y `compress-video.sh` (comprime un video propio a 720p; hoy sin uso, queda como plan B si el Tema 5 necesitara un video grabado por el autor).
- `src/consigna.ts`: datos del curso, fases y temas con consigna (hoy los nueve de los Avances 1 y 2); un tema nuevo entra aquí y en `src/content/topics/` cuando llega su consigna.
- `src/content/topics/`: un archivo MDX por tema. Todo tema publicado tiene al menos 3 `Step` y un `Why` por cada `Step`; `src/content/topics.test.ts` lo verifica.
- `src/data/`: conjuntos de datos generados por los scripts: `drone-route.json`, `drive-cycles.json` y `voyager-speed.json`, cada uno con su consulta y su fecha.
- `src/lib/settingsStore.ts`: ajustes globales (decimales, cuadrícula, movimiento) guardados en `localStorage` bajo la clave `portafolio.settings`.
- `src/lib/`: también el índice de búsqueda (`searchIndex.ts`, `sectionHeadings.ts`), el estado persistido de la navegación (`navState.ts`, claves `portafolio.nav.avance-N`), `readingTime.ts` y `lastUpdate.ts` (la fecha del último commit, que muestra la portada).
- `src/lib/physics/`: núcleo de física puro, con pruebas (cinemática, resortes, fricción, movimiento circular y, desde el Avance 2, `energy.ts`, `collision.ts`, `rotation.ts` y `gravitation.ts`).
- `src/lib/data/`: modelos, datos copiados de una fuente y preajustes, con sus fuentes.
- `src/lib/tables/`: el registro de tablas de datos: `index.ts` (registro y búsqueda por id), `types.ts`, `markdown.ts` (exportación para "Copiar Markdown") y una tabla por tema en `topics/<slug>.ts`. Es la única fuente de cada tabla para la página, el tiempo de lectura y "Copiar Markdown".
- `src/components/ui/`: componentes de interfaz base, incluidos `Step.astro` y `Why.astro` (el modelo de contenido por pasos) y `DataTable.astro` (la tabla de datos, que lee el registro de `src/lib/tables/`).
- `src/components/lab/`: el armazón de los laboratorios (`LabShell`, `SettingsDrawer`, `ParamField`, `TransportBar`, `useSimClock`), las gráficas SVG (`SvgPlot` con su cursor, ejes y marcas), los ajustes de reproducción comunes (`clockSettings`), `useDrag`, `OverlayMarks`, `PlotPoints`, `scrollLock` y `useSettledText`.
- `src/components/controls/`: controles interactivos (deslizadores, botones).
- `src/components/charts/`: `ChartFrame` (el marco con título y nota de toda gráfica) y `chartTheme`/`chartScale` (tokens de color y tipografía, formato de marcas); las gráficas mismas son `SvgPlot`, en `src/components/lab/`.
- `src/components/nav/`: navegación: barra lateral con búsqueda (`SidebarSearch`), `TopicTools`, el pie (identidad, icono de GitHub y botón de tema) y `BackToTop.astro`, el botón flotante "Volver arriba", que aparece al bajar y se detiene sobre el pie.
- `src/components/hooks/`: hooks de React compartidos.
- `src/components/topics/`: laboratorios y figuras de cada tema (`DroneLab`, `JumpLab`, `HabitatLab`, `TyreLab`, `TriggerLab`, `RegenLab`, `BounceLab`, `WheelLab`, `FlybyLab`).
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
pnpm run data:cycles
pnpm run data:voyager
pnpm run measure:labs http://localhost:4324/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/
bash scripts/compress-video.sh media-raw/<archivo>  # plan B del Tema 5, hoy sin uso
```

`E2E_PORT=4322 pnpm run e2e` ejecuta las pruebas de extremo a extremo en otro puerto; úsalo en local cuando un servidor de desarrollo ocupa el 4321.

`pnpm run measure:labs <url>` mide la reproducción de los siete laboratorios con reloj contra un `astro preview` ya levantado (`pnpm run build && pnpm run preview --port 4324`): por laboratorio, con la CPU a velocidad normal y frenada 4×, imprime fps, p95 del cuadro, mutaciones del DOM por cuadro bajo la raíz del laboratorio y milisegundos de script y de tarea por cuadro. Los números dependen de la máquina: compara antes y después en la misma. La prueba `tests/e2e/lab-performance.spec.ts` fija el presupuesto determinista (≤ 12 mutaciones por cuadro); los fps no se afirman en CI.

`pnpm run data:cycles` y `pnpm run data:voyager` descargan de nuevo los ciclos de la EPA y la serie de JPL Horizons y reescriben `src/data/drive-cycles.json` y `src/data/voyager-speed.json`; el sitio no consulta nada al construirse. Las pruebas fijan los hechos que la página afirma, así que un cambio en la fuente se nota en `pnpm run test`.
