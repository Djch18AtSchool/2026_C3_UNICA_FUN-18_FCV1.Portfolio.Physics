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
- `src/components/lab/`: el armazón de los laboratorios (`LabShell`, `LabPresets`, `LabNotes`, `StatusChips`, `LegendKey`, `SettingsDrawer`, `ParamField`, `TransportBar` con sus eventos, `TimeScaleBadge`, `useSimClock`; ver «Laboratorios por niveles» y «Escala de tiempo y eventos»), las gráficas SVG (`SvgPlot` con su cursor, ejes y marcas), los ajustes de reproducción comunes (`clockSettings`), `useDrag`, `OverlayMarks`, `PlotPoints`, `scrollLock` y `useSettledText`.
- `src/components/controls/`: `Readout` (una lectura) y `Slider`.
- `src/components/charts/`: `ChartFrame` (el marco con título y nota de toda gráfica) y `chartTheme`/`chartScale` (tokens de color y tipografía, formato de marcas); las gráficas mismas son `SvgPlot`, en `src/components/lab/`.
- `src/components/nav/`: navegación: barra lateral con búsqueda (`SidebarSearch`), `TopicTools`, el pie (identidad, icono de GitHub y botón de tema) y `BackToTop.astro`, el botón flotante "Volver arriba", que aparece al bajar, se detiene sobre el pie y se esconde mientras hay un laboratorio bajo él (en el móvil, mientras se lee uno: no tapa sus campos).
- `src/components/hooks/`: hooks de React compartidos.
- `src/components/topics/`: laboratorios y figuras de cada tema (`DroneLab`, `JumpLab`, `HabitatLab`, `TyreLab`, `TriggerLab`, `RegenLab`, `BounceLab`, `WheelLab`, `FlybyLab`).
- `src/layouts/`: plantillas de página.
- `src/pages/`: páginas del sitio (`temas/` para cada tema).
- `src/styles/`: estilos globales.
- `tests/e2e/`: pruebas de extremo a extremo (Playwright). `tests/e2e/fixtures/<nombre>/` son páginas de prueba fuera del sitio (una raíz de Astro propia que `fixtureSite.ts` construye y sirve en un puerto libre para un archivo de pruebas); hoy, `lab-time` para `time-scale.spec.ts`.

## Notación matemática

Todo símbolo del sitio se dibuja con una fuente que lo tiene: IBM Plex Sans, IBM Plex Mono o KaTeX; nunca con una fuente de reserva del sistema. Dos capas lo vigilan, y cubren cosas distintas:

- **Pruebas unitarias** (`plexViolations`, `src/test-glyphs.ts`, en jsdom): los nueve laboratorios y las figuras de React de los temas (no las `.astro`: `HabitatDiagram`, `WheelDiagram`, tablas, ecuaciones y pies de figura quedan fuera) en sus estados de prueba. Comprueban que ningún texto fuera de KaTeX tenga un carácter que Plex no dibuja (`src/lib/typography.ts`, derivado de los archivos de las fuentes) y que no quede un `_`, `^` o `$` sin tipografiar. No ven qué fuente usó realmente el navegador.
- **Guardia e2e** (`tests/e2e/glyphs.spec.ts`, Chromium): la portada y las nueve páginas de tema (1 280 y 360 px, claro y oscuro), con las mismas dos comprobaciones de caracteres sobre todo el texto (también el oculto, como las pestañas del cajón de ajustes) y, además, las fuentes que el navegador realmente usó (`CSS.getPlatformFontsForNode`): solo IBM Plex y `KaTeX_*`. Mide cada laboratorio al abrirse, tras cada preajuste, en sus estados condicionales (T1: ruta modificada; T8: medidor por encima del límite, etc.) y con cada pestaña del cajón abierta. `tests/e2e/glyphGuard.spec.ts` comprueba que la guardia falla si no midió nada, si un error de CDP no se pudo contar o si un laboratorio se queda sin estados.

- **Texto de HTML** (leyendas, títulos, lecturas, parámetros, notas de preajuste, celdas y fuente de `DataTable`, atributos de `Figure`): escribe la fórmula entre `$…$` y se compone con KaTeX (`InlineMath` en React; `inlineMathToHtml` en Astro). `\$` es un signo de dólar literal; un `$` sin cerrar rompe la compilación. Los controles con `$…$` en su etiqueta (`ParamField`, `SwitchField`, `SelectField`, `SegmentedField`, `LabPresets`) llevan un `aria-label` hablado (`mathAriaLabel`: «r sub p»).
- **Texto dentro de un SVG**: `MathText` con la mininotación de `src/lib/mathNotation.ts`: `v_∞,in` (subíndice), `10^-7` (potencia), `vec v` (flecha dibujada sobre la letra) y `\_` o `\^` para el signo literal. Pasa la etiqueta completa, números y unidades incluidos, en un solo `MathText`, y escribe el nombre accesible de la figura con `mathTextToString` (dice «v sub infinito», «10 a la menos 7»).
- **Los `<option>` nativos no admiten KaTeX** (ni ninguna marca): ahí va texto plano de Plex sin símbolos que Plex no tenga («Crítica, c = 2 raíz(k m)»). Un preajuste en fichas (`LabPresets`, hasta cuatro) sí admite `$…$`; en su `<select>` (más de cuatro) lleva un `optionLabel` en texto plano.
- Un cambio en las fuentes de Plex se regenera con `pnpm run data:fonts` (la cobertura sale de los archivos de las fuentes, no de una lista escrita a mano).

## Laboratorios por niveles

Los nueve laboratorios usan `LabShell` (`src/components/lab/LabShell.tsx`). Uno nuevo (el del Tema 10, el día que llegue su consigna) declara sus niveles y el cascarón los coloca:

```tsx
<LabShell
  title="Laboratorio del …"
  testId="<algo>-lab"             // también en tests/e2e/topicPages.ts y en MIGRATED_LABS (lab-shell.spec.ts)
  clock={clock}                   // opcional: sin reloj no hay reproducción
  markers={markers}               // opcional: eventos en la línea de tiempo (ver «Escala de tiempo y eventos»)
  timeOrigin={offset}             // opcional: dónde cae t = 0 del reloj en el tiempo del laboratorio (solo la lectura)
  readouts={readouts}             // «Lecturas», en celdas de dos columnas
  onReset={onReset}               // «Restablecer», junto a «Parámetros»
  levels={{
    params: <>…</>,               // nivel 1: los campos físicos, siempre a la vista
    scenario: <LabPresets … />,   // nivel 2 (opcional): modo y preajustes
    display: displayOptions,      // nivel 3: SettingOption[] del cajón; `chip` → ficha junto al engranaje
  }}
  canvasNotes={<…Notes />}        // opcional: lo que lee el lienzo (leyenda, cámara rápida, tablas)
  notes={{ usage: [...], leftOut: [...] }} // string[]: «Cómo se usa» y «Qué deja fuera el modelo», cerrados al final
>
  <…Scene />                      // el lienzo
</LabShell>
```

- **Orden**: el del DOM es el de lectura y el visual, en una columna y en dos: escenario (lienzo y reproducción) → panel (parámetros, escenario, lecturas) → `canvasNotes` → desplegables.
- **Dos columnas** (variante `lab-split:` de `global.css`: ventana `lg` y laboratorio de 42 rem): el escenario y, a su derecha, el panel de 20 rem. El panel fluye con la página (nada se esconde en un scroll propio). El escenario se queda pegado bajo la barra del tema mientras cabe en la ventana (`useFitsInWindow`, `data-lab-stage-fits`); si es más alto, fluye y su reproducción queda pegada al pie de la ventana. `canvasNotes` ocupa la fila de abajo, a todo el ancho.
- **Una columna**: el lienzo crece hasta 36 rem, centrado (`canvasInset.ts`); un panel de más de 42 rem reparte sus niveles en dos columnas equilibradas (columnas CSS, en orden de lectura: baja por la izquierda y sigue por la derecha); cada nivel pasa entero, con su título y todo su contenido, a una de las dos. Nada del laboratorio decide columnas con `sm:`/`md:`/`lg:`.
- **`LabPresets`**: hasta cuatro preajustes son fichas; más, un `<select>` (con `groups` si se agrupan, y `optionLabel` en texto plano para un nombre con `$…$`). Debajo, una línea con la nota (una oración: `presetNotes.test.ts`) y «Fuente:», enlazada si hay `sourceUrl` (una página, no un archivo que se descarga). Tras una edición, la nota del último preajuste activo se queda en todos los laboratorios, empezando con «Partí de «…» y cambié algún valor.» (`basedOnId` lo fija para un laboratorio que vuelve a montar `LabPresets`). Mientras el preajuste está activo, su versión editada ocupa la misma celda, invisible y con `aria-hidden` (`data-preset-note-reserve`), para que la línea no cambie de alto al editar. Por eso el texto de la nota está dos veces en el DOM: una prueba lo busca dentro de `getByTestId('preset-note')`, nunca con `getByText` sobre toda la página.
- **`StatusChips`**: fichas de solo lectura para un estado que informa el laboratorio (el «Motor» del Tema 7), no para un ajuste.
- **Fichas de ajustes**: una opción del nivel 3 con `chip` se ve junto al engranaje (`settingChips.ts`): un interruptor solo si está activo, un selector con su opción, un rango con su valor.
- **Notas**: un párrafo por cadena, o por bloque entre líneas en blanco dentro de una; `$…$` con KaTeX. Solo `usage` y `leftOut` del MDX cuentan en el tiempo de lectura.

Reglas que dejaron los nueve laboratorios:

- **El lienzo es solo el dibujo** y lo que se arrastra o se pulsa en él. Leyendas (`LegendItem`, `src/components/lab/LegendKey.tsx`), notas de cámara rápida, tablas y párrafos que leen el dibujo van a `canvasNotes`.
- **`canvasNotes` sin controles**: son texto que lee el dibujo, tras los controles (`lab-shell.spec.ts` lo comprueba). Un botón como «Soltar el gatillo» va en el lienzo o en un nivel.
- **Consultas de contenedor dentro del lienzo** (`@container` y `@lg:`…): a 1 280 px el escenario mide ~430 px aunque la ventana sea ancha. Lo que deba alinearse con el texto de la tarjeta usa `CANVAS_INSET` (`canvasInset.ts`), que sigue al sangrado del lienzo.
- **SSR y alto reservado**: el servidor no conoce el ancho del escenario. `SvgPlot` reserva solo el alto que dibujará (`svgPlotReserve.ts`; `aspectRatio` admite un par `{ compact, wide }`); un dibujo propio que mide su ancho debe reservar su alto en CSS (como `HabitatScene`) o tener un alto fijo (como `BounceScene`). `lab-shell.spec.ts` compara la página sin JavaScript con la hidratada a 360, 540 y 1 280 px y falla si un dibujo cambia de alto o queda con bandas vacías.
- **Todo dibujo del lienzo mide su ancho**: un `svg[role=img]` o `svg[data-testid]` con `viewBox` dentro del lienzo debe dibujarse al ancho que mide (su `viewBox` igual a su caja). La comprobación de hidratación espera a eso antes de comparar, y un dibujo de `viewBox` fijo la deja esperando hasta fallar con «dibujo N sin medir». Un dibujo fijo va fuera de esos selectores o mide su ancho como los demás.

## Escala de tiempo y eventos

Regla (auditoría §12.2): cada laboratorio con reloj declara su escala de tiempo **en el lienzo**, junto a lo que se mueve, y ofrece al menos una vista a 1× en la que el fenómeno se entiende. Las notas al pie pueden explicarla, pero no son el único lugar donde se dice. Dos piezas de `src/components/lab/` lo resuelven:

```tsx
const STOPS: readonly TransportMarker[] = UDDS_STOPS.map((t) => ({ t, label: 'Detención' })); // de módulo

const clock = useSimClock(duration, { timeScale: 20 });  // clock.rate: s simulados por s real
<LabShell clock={clock} markers={STOPS} …>
  <div className="relative">                 // la caja de la escena, posicionada
    <Scene … />
    <TimeScaleBadge clock={clock} />          // «×20 cámara rápida», esquina superior derecha
  </div>
</LabShell>
```

- **`clock.rate`** (`useSimClock`): segundos simulados por segundo real de la reproducción actual: `timeScale` × velocidad, o, con movimiento reducido, el paso que de verdad se ve (la corrida entera en 15 s a 1×, por pasos).
- **`TimeScaleBadge`** (HTML): en una esquina (`corner`, por omisión `top-right`) de la caja posicionada de la escena, a 8 px de sus bordes, sin atrapar el puntero ni animarse. Lee `clock.rate` o un `factor` explícito, que manda (un laboratorio cuyo reloj no cuenta segundos reales del fenómeno, como la perturbación del Tema 8, pasa el suyo). El factor va con dos cifras significativas («×0,25», «×20», «×19 000»); la palabra es automática («velocidad real», «cámara rápida», «cámara lenta»), propia (`label`) o ninguna (`label={null}`). Para el lector de pantalla lleva la escala en palabras en un texto oculto («Escala de tiempo: 20 veces la velocidad real, cámara rápida») y una región `status` discreta que dice solo un cambio posterior (de velocidad o de vista), cuando lleva 750 ms quieto; al cargar no dice nada.
- **`TimeScaleBadgeSvg`**: el mismo rótulo como `<g>` dentro de una escena SVG, en `x`, `y` (la palabra, 16 unidades debajo; `anchor` `start` o `end`). Es solo dibujo: la escena añade `<TimeScaleStatus clock={clock} label={…} />` en HTML para los lectores de pantalla.
- **`label`, una sola sintaxis** en las tres piezas: palabras con las fórmulas entre `$…$`, como el resto del HTML del sitio («paso de $r_p$»). La variante SVG la pasa a la mininotación de `MathText` y el texto hablado la dice en palabras («paso de r sub p»). Un `r_p` o un `10^-7` fuera de `$…$` lanza un error al construir, con el arreglo.
- **`markers`** (`TransportMarker`: `{ t, label, kind? }`): eventos del reloj, en segundos, nunca posiciones de la línea de tiempo. `kind` es `'stop'` (por omisión) o `'peak'` (una marca más ancha y oscura). Se descartan las marcas fuera de [0, duración], sin nombre o repetidas; se ordenan por tiempo (`normalizeMarkers`, que devuelve un `NormalizedMarkers`: los ayudantes de `transportMarkers.ts` solo aceptan esa lista). Con alguna, `TransportBar` dibuja las marcas (bordes, que también se ven con colores forzados) en una franja al pie de la línea de tiempo, donde queda el centro del pulgar en ese instante, sin tocar el pulgar; no reciben el puntero, así que un clic sobre una lleva el pulgar a ella. Debajo, una segunda fila: «Evento anterior», «Evento siguiente», el evento en que está el tiempo y la lectura de t (a 360 px o menos, la lectura baja a una tercera línea; el alto no cambia mientras t avanza). Los botones saltan desde el tiempo en vivo a la marca vecina (con tolerancia de media posición de la línea, para no quedarse en la actual) y lo anuncian en una región `status`: «Detención 5 de 17 · t = 312 s» (otra vez si se repite); en un extremo quedan con `aria-disabled` (conservan el foco) y dicen cuál es el último o el primero («No hay evento siguiente; el último es Detención 17 de 17 · t = 1 360 s»). El anuncio se borra al reproducir o al mover el tiempo. Las marcas con el mismo `label` se numeran entre sí; un nombre único se lee solo («Máxima aproximación»). La línea de tiempo añade el evento a su `aria-valuetext` mientras el tiempo está en él y conserva sus teclas nativas.
- **Alto**: la reproducción con eventos mide dos filas; `global.css` deriva `--lab-transport-room-events` de `--lab-transport-room` y se lo da al escenario que la contiene (`:has([data-transport-events])`), para que un control del lienzo enfocado no quede bajo la reproducción pegada. Marcas, botones y rótulo dependen solo de las props y del reloj: el servidor y el cliente dibujan lo mismo. **Una excepción visible**: el servidor no conoce el movimiento reducido, así que manda el ritmo nominal («×20») y, con movimiento reducido, la insignia pasa tras hidratar al paso que se ve («×91»). No hay salto de diseño (la insignia es absoluta) ni anuncio (ese primer asentamiento no se dice).
- **Deuda conocida (fase C/D)**: la posición de las marcas supone el pulgar nativo de 16 px de Chromium y Firefox; en otro navegador o con otro pulgar se desalinean hasta unos píxeles en los extremos. Se arregla fijando el pulgar con CSS propio (una sola medida para pulgar y marcas) cuando la fase C reestile la línea de tiempo.

### Reglas para quien las use

- **Las marcas son del reloj que se pasa.** Se filtran por su duración y se numeran entre las que sobreviven: una vista «Tramo» con reloj propio (de 0 a su duración) necesita los tiempos ya desplazados a ese reloj, y su numeración será la del tramo («Detención 1 de 6»), no la del ciclo (o un `label` explícito, como «Detención 3 de 17» en el Tema 6).
- **`timeOrigin`: la lectura en el tiempo del ciclo.** Una vista con reloj propio pasa a `LabShell` (o a `TransportBar`) dónde cae su t = 0 en el tiempo de la corrida entera (el Tema 6, el inicio del tramo: 376 s en el UDDS). La lectura de t, el `aria-valuetext` y los anuncios de evento dicen origen + t («t = 397,00 s · Detención 3 de 17»); la línea de tiempo, las marcas y `seek` siguen en el reloj, y la unidad y sus decimales siguen saliendo de la duración del reloj. Sin la prop (o con un valor no finito), nada cambia. En e2e, con un origen la lectura nunca dice «t = 0»: de las dos esperas de `seekTimeline`, la que cuenta es que la línea tome el valor.
- **`seek` pausa.** Los botones de evento detienen la reproducción; un laboratorio que quiera «saltar y seguir» llama a `play()` después.
- **Tolerancia.** Dos marcas a menos de `duration / 2000` s cuentan como una: se anuncian juntas («A · B») y la segunda es inalcanzable con los botones. Una marca a menos de esa distancia de `t = 0` es inalcanzable con «Evento siguiente» desde el inicio (en la UDDS, 0,68 s).
- **Alto.** Las dos filas suman 59 px al escenario a 1 280 px: comprueba a 1 280 × 800 y a 1 366 × 768 que el escenario sigue pegado; `useFitsInWindow` mide el escenario entero y uno que antes cabía justo puede dejar de pegarse (la reproducción queda entonces pegada al pie).
- **Varias regiones `status`** en un laboratorio: las lecturas (`LabShell`), la reproducción con eventos, la insignia y las del propio tema (el Tema 9 tiene cinco: también el aviso de $r_p$ y el anuncio de «Ir a la máxima aproximación»). En e2e, filtra por su texto o por su vecina (`[data-time-scale-badge] ~ [role="status"]`), nunca `getByRole('status')` a secas (la guardia de glifos tampoco lo hace).
- **Con marcas, el Tab** pasa de la línea de tiempo a «Evento anterior» y «Evento siguiente» antes de llegar a «Parámetros» (`lab-shell.spec.ts` lo recorre así en todo laboratorio con marcas).
- **Insignia SVG junto al borde superior**: la línea de 14 px de IBM Plex Mono sube unos 14,4 px sobre su base; con la base a menos de 15 unidades del borde, la caja del texto sale del `svg` y la comprobación de textos de `responsive.spec.ts` falla.
- **Números con unidad en e2e**: `formatNumber` separa con U+202F, y `getByText` con una expresión regular no lo normaliza: casa «20,23 km/s» con `\s` (`/20,23\skm\/s/`), no con un espacio.
- **No uses a la vez `TimeScaleBadge` y `TimeScaleStatus`**: la insignia HTML ya lleva sus palabras y se dirían dos veces. `TimeScaleStatus` es solo para la variante SVG.
- **La insignia HTML necesita un padre `relative`** (la caja de la escena). Dentro de un `svg[role=img]` sus hijos no llegan al lector: ahí va `TimeScaleBadgeSvg` y, en HTML, `TimeScaleStatus` con el mismo `label`.
- **La escala la declara solo la insignia.** No escribas «1×» ni otro factor en el nombre de una vista o en un preajuste: con movimiento reducido la insignia dirá, por ejemplo, «×91» y los dos textos se contradirían. Nombra la vista por lo que muestra («Tramo», «Ciclo»). Un `factor` explícito no sigue la velocidad ni el movimiento reducido: úsalo solo cuando el reloj no cuenta segundos del fenómeno (Tema 8).
- **`markers` como constante de módulo** (o memorizada): se normalizan con la identidad de la prop, y una lista nueva en cada render se normaliza en cada render.

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

`pnpm run measure:labs <url> [labs]` mide la reproducción de los siete laboratorios con reloj (o solo los `data-testid` que se listen, separados por comas: `drone-lab,wheel-lab`) contra un `astro preview` ya levantado (`pnpm run build && pnpm run preview --port 4324`; en Astro 7 el preview queda como demonio y se detiene con `npx astro preview stop`): por laboratorio, con la CPU a velocidad normal y frenada 4×, imprime fps, p95 del cuadro, mutaciones del DOM por cuadro bajo la raíz del laboratorio y milisegundos de script y de tarea por cuadro. Los números dependen de la máquina: compara antes y después en la misma. La prueba `tests/e2e/lab-performance.spec.ts` fija el presupuesto determinista (≤ 12 mutaciones por cuadro); los fps no se afirman en CI.

`pnpm run data:cycles` y `pnpm run data:voyager` descargan de nuevo los ciclos de la EPA y la serie de JPL Horizons y reescriben `src/data/drive-cycles.json` y `src/data/voyager-speed.json`; el sitio no consulta nada al construirse. Las pruebas fijan los hechos que la página afirma, así que un cambio en la fuente se nota en `pnpm run test`.
