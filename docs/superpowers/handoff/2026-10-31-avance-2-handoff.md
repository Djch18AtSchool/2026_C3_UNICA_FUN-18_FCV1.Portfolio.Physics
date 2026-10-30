# Traspaso · Avance 2 (31 de octubre de 2026)

Documento para continuar el trabajo. Reúne el estado del sitio tras el Avance 2, lo que falta
para entregarlo, las decisiones vigentes, las decisiones que tomó Claude sin consultar y la
forma de trabajo acordada. Reemplaza como punto de partida al traspaso del Avance 1
(`docs/superpowers/handoff/2026-10-10-avance-1-handoff.md`), que queda como historia.

## Estado

- **Publicado:** `origin/main` = `1069de1` (el Avance 1, entregado el 17 de octubre). Es lo
  que hoy sirve GitHub Pages. La rama local `main` está desactualizada en `fa33c68`, 53 commits
  **detrás** de `origin/main` (no adelante): antes de usarla, `git fetch` y
  `git switch main && git merge --ff-only origin/main`. La etiqueta `avance-1` nunca se creó
  (pendiente 5).
- **En curso:** rama `avance-2`, todavía **sin integrar a `main`**. `origin/main` es ancestro
  de `avance-2`, así que `git push origin avance-2:main` es un avance rápido. Reúne:
  - **Temas 6 a 9**, con el formato del Avance 1 (cuatro `Step` con ecuación numerada y `Why`,
    `UseCase`, `Callout` de clase, `Connections`, `Sources`), su recurso prescrito con insignia
    y un laboratorio por tema:
    - Tema 6, frenado regenerativo (visualización de datos; caso FASTSim; `RegenLab`).
    - Tema 7, coeficiente de restitución (simulación; caso Box2D v3; `BounceLab`).
    - Tema 8, ruedas de reacción (diagrama; caso 42 de NASA Goddard con Kepler/K2, Hubble y
      JWST; `WheelLab`).
    - Tema 9, asistencia gravitatoria (visualización de datos; caso diseño de trayectorias de
      JPL y JPL Horizons; `FlybyLab`).
  - **Tablas de datos:** componente `DataTable` con un registro tipado por tema
    (`src/lib/tables/`), numeradas por tema ("Tabla 6.1"), que también alimentan el tiempo de
    lectura y "Copiar Markdown".
  - **Colores con significado:** tokens `--sun`, `--jupiter`, `--saturn`, `--uranus`,
    `--neptune`, `--tennis` y `--basketball`, con variante oscura y contraste comprobado.
  - **Datos reproducibles:** `pnpm run data:cycles` (ciclos UDDS, HWFET y US06 de la EPA →
    `src/data/drive-cycles.json`) y `pnpm run data:voyager` (rapidez heliocéntrica de las
    Voyager desde JPL Horizons → `src/data/voyager-speed.json`).
  - **Temas 1 a 5:** sus datos de leyenda pasaron a tablas y cada uno ganó una frase de
    conexión recíproca hacia un tema nuevo (pendiente 2); `updated` = 2026-10-30.
  - **Hechas:** la tarea compartida de tipografía (signo menos verdadero, unidades de tiempo en
    la barra de reproducción, suites e2e compartidas que recorren los nueve temas), la revisión
    final de toda la rama, con su ronda de correcciones (R35 a R37), y la pasada visual final en
    360 px y 1280 px, con la suya (R38 a R40).
- **Puerta final en `avance-2` (`4526a4e`, último commit de contenido, tras la pasada visual,
  R40 y R41; después solo cambia este traspaso):** `pnpm run check` sin errores ni avisos;
  1 923 pruebas unitarias en 157 archivos, cobertura 98,72 % de sentencias, 93,85 % de ramas,
  99,06 % de funciones y 99,25 % de líneas; 11 páginas construidas (portada, 404 y los nueve
  temas); e2e 478 pasan y 0 fallan (`--workers=2`). Lighthouse en móvil, Temas 7 y 9:
  accesibilidad, buenas prácticas y SEO en 100.
- **Sitio:** https://djch18atschool.github.io/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/
- **Repositorio:** https://github.com/Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics
- **Entrega:** Avance 2 (Temas 6 a 9; los Temas 1 a 5 se vuelven a evaluar), sábado
  31 de octubre de 2026 a las 23:59, en Moodle, con la URL del sitio y la del repositorio.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Especificación y plan del Avance 2 | `docs/superpowers/specs/2026-10-30-avance-2-design.md`, `docs/superpowers/plans/2026-10-30-avance-2.md` |
| Especificaciones y planes del Avance 1 (historia) | `docs/superpowers/specs/2026-10-0*.md`, `docs/superpowers/plans/2026-10-0*.md` |
| Investigación verificada de los Temas 6 a 9 (fuentes, números, código fijado a commit, trampas) | `docs/superpowers/research/2026-10-30-{frenado-regenerativo,coeficiente-restitucion,ruedas-reaccion,asistencia-gravitatoria}.md` |
| Consigna del Avance 2 (PDF del docente, fuera de git) | `C:\Users\dylan\Downloads\Portafolio - Avance 2.docx.pdf` (en WSL, `/mnt/c/Users/dylan/Downloads/`) |
| Datos del curso, fases y temas | `src/consigna.ts` (nueve temas; el Avance 2 ya no es fase futura) |
| Textos de los temas | `src/content/topics/*.mdx` |
| Componente de tabla | `src/components/ui/DataTable.astro` |
| Registro de tablas | `src/lib/tables/` (`index.ts`, `types.ts`, `markdown.ts`) y una tabla por tema en `src/lib/tables/topics/<slug>.ts` |
| Núcleo de física nuevo | `src/lib/physics/energy.ts` (Tema 6), `collision.ts` (7), `rotation.ts` (8), `gravitation.ts` (9), `regenModelText.ts` (texto del modelo del Tema 6, derivado del código) |
| Datos y preajustes con fuente | `src/lib/data/`: `evModels.ts`, `driveCycles.ts`, `ballStandards.ts`, `engineRestitution.ts`, `reactionWheels.ts`, `planets.ts`, `voyager.ts`; también `triggerPresets.ts` y `comfortCriteria.ts`, que salieron de componentes de los Temas 5 y 3 |
| Datos generados | `src/data/drive-cycles.json`, `src/data/voyager-speed.json` (y `drone-route.json` del Avance 1) |
| Scripts de datos | `scripts/generate-drive-cycles.ts`, `scripts/generate-voyager-speed.ts` |
| Laboratorios y figuras de los temas nuevos | `src/components/topics/{frenado-regenerativo,coeficiente-restitucion,ruedas-reaccion,asistencia-gravitatoria}/` |
| Pruebas e2e de los temas nuevos | `tests/e2e/{frenado-regenerativo,coeficiente-restitucion,ruedas-reaccion,asistencia-gravitatoria,data-table}.spec.ts` |
| Comandos y estructura | `README.md` |

**No está en git (solo local):**

- `.reference/class-material/`: material del curso. Para el Avance 2 se extrajo el Módulo 4,
  Gravitación (`04-gravitacion.md`), y `00-indice.md` registra la cobertura de los Temas 6 a 9.
- `.superpowers/sdd/2026-10-30-avance-2/`: el libro de decisiones (`progress.md`), los briefs,
  informes y paquetes de revisión de cada tarea. Lo vigente está resumido abajo.
- Los worktrees de trabajo viven en el directorio temporal de la sesión de Claude Code
  (`…/scratchpad/worktrees/`) y desaparecen con ella; todo lo integrado está en `avance-2`.

## Pendientes de Dylan para cerrar el Avance 2

1. **Leer los cuatro textos nuevos (Temas 6 a 9).** Son borradores de Claude y cuentan como
   autoría de Dylan ante el profesor (el plagio se sanciona). El botón "Copiar Markdown" de
   cada tema entrega el texto completo, con las tablas. Cada uno queda en 644 a 650 palabras
   de prosa, con el tope en 650; si se agrega algo, hay que quitar otro tanto. La revisión
   final cambió unas pocas frases (R37): en el Tema 6, «Al detenerse» → «Cerca de
   detenerse»; en el Tema 9, «según los datos de Horizons» en la primera frase y, para seguir
   en 650, «Pero en Júpiter» → «En Júpiter», «la cifra que publica la NSSDCA» → «la cifra de la
   NSSDCA» y «una alineación poco frecuente, que se repite» → «una alineación que se repite».
2. **Releer los Temas 1 a 5.** Los datos de las leyendas pasaron a tablas; las leyendas quedaron
   en dos o tres frases y algunas filas son cálculos nuevos del código. Cada tema ganó una frase
   de conexión (borrador de Claude) y el tema nuevo en `related`:
   - **Tema 1 (dron):** tablas de tramos de la ruta y de límites. Frase nueva: «En el Tema 6
     uso un ciclo de conducción, un perfil de velocidad como el del dron; cada frenada quita
     ½ m v².»
   - **Tema 2 (salto):** tabla de constantes de Celeste y Super Mario Bros. con su conversión a
     SI; las líneas de fuente remiten a ella. Frase nueva, impersonal: «En el Tema 7, entre
     rebotes la pelota es un lanzamiento vertical, la (2.1), y el motor la integra con el mismo
     Euler semi-implícito.» La lectura subió 1 min y volvió a bajar con R40 (las celdas de
     números no cuentan): 7 min.
   - **Tema 3 (hábitat):** tablas de hábitats, del Toro de Stanford y de los límites de confort
     de los cinco autores que recopila SpinCalc (nueva, por autor). Frase nueva, en primera
     persona: «Al girar el hábitat desde dentro le doy momento angular: la nave gira al revés
     (Tema 8).» La lectura subió 1 min.
   - **Tema 4 (llantas):** cuatro tablas (carga, temperatura y las dos del MUR). Frase nueva:
     «Con el Tema 6: freno con el motor eléctrico (regenerativo) o con las pastillas, y en ambos
     casos el agarre limita la desaceleración.» Prosa 648.
   - **Tema 5 (háptico):** tres tablas (vibración, energía del resorte, trabajo del dedo en dos
     preajustes); la aritmética de la figura 5.2 vive ahora en la leyenda de su tabla. Frase
     nueva: «Con el Tema 7: veo un choque como un resorte breve; con e < 1, no devuelve toda la
     energía.» (la revisión final corrigió «e < 1 mide la energía que no devuelve»: e no mide
     energía; lo perdido es la fracción 1 − e²). Para volver a 650 palabras se acortaron **solo las dos frases que redactó
     Claude** (esta y la del Tema 3 del 13 de octubre, que ahora dice «allí sentimos como peso
     la normal del piso, no m g; aquí, el contacto del gatillo, venga de un motor o de un
     resorte»). **Sigue siendo decisión de Dylan** el pendiente 3 del Avance 1: conservar,
     reescribir o quitar la frase del Tema 3 (y bajar `MIN_RELATED` a uno si se quita).
3. **Datos medidos de Argonne (D3) para el Tema 6, opcional.** Claude no pudo abrirlos (403 y
   conexión rechazada). Abrir en el navegador:
   - https://www.anl.gov/taps/d3-2020-tesla-model-3
   - https://www.anl.gov/taps/d3-downloadable-dynamometer-database
   - https://www.osti.gov/dataexplorer/biblio/dataset/3376961

   Anotar si la descarga es directa y sin registro, el texto de atribución exacto que exige
   Argonne, los términos de uso y si las columnas traen voltaje y corriente de batería
   (P = V·I < 0 marca la regeneración). Si todo eso está, la potencia medida se superpone a la
   modelada en la figura del Tema 6 sin rehacer nada; ojo: el D3 es un Model 3 2020 AWD, no el
   2025 RWD del sitio, y así habría que decirlo. Si no, el tema queda como está (declara que el
   reparto es modelado).
4. **Integración a `main` y entrega.** Tras la revisión final y la lectura de Dylan: subir
   `avance-2`, CI en verde, integrar con avance rápido (`git push origin avance-2:main`, sin
   squash ni rebase), verificar las páginas vivas de los nueve temas y entregar en Moodle (URL
   del sitio y del repositorio) antes del sábado 31 de octubre a las 23:59. Luego, si se
   quiere, etiquetar: `git tag -a avance-2 -m "Avance 2: Temas 6 a 9"` y
   `git push origin refs/tags/avance-2` (la etiqueta y la rama comparten nombre; con
   `refs/tags/` el push no es ambiguo).
5. **Etiqueta `avance-1`, que nunca se creó.** Lo entregado el 17 de octubre es `1069de1`
   (hoy `origin/main`). Decidir si se etiqueta:
   ```
   git tag -a avance-1 1069de1 -m "Avance 1: Temas 1 a 5 (entregado el 17 de octubre de 2026)"
   git push origin refs/tags/avance-1
   ```
6. **Retroalimentación del docente sobre el Avance 1.** Cuando llegue, se trata aparte (la
   especificación del Avance 2 la deja fuera de alcance). Los Temas 1 a 5 se vuelven a evaluar
   con este avance.
7. **Voz de las líneas de fuente de las figuras: elegir una.** Hoy conviven dos: la mayoría dice
   «del autor» o «por el autor» («Gráfica del autor con…», «Curva calculada por el autor
   con…»), pero tres figuras del Tema 7 y dos del Tema 2 dicen «que calculé» («Curva que
   calculé con…»). Decidir cuál queda y unificar las demás.
8. **Nota del laboratorio del Tema 9 (commit `7e83acb`).** Su redacción, «la lectura t marca el
   tiempo real», es de Claude y no se ha leído: confirmar que se entiende (la lectura escala a
   horas o días mientras el sobrevuelo se ve en pocos segundos).

## Decisiones vigentes que condicionan el contenido

Las del Avance 1 que siguen rigiendo, más las del Avance 2. Rigen también para la Entrega
Final.

- **Notación de libro de texto** (Serway, Sears-Zemansky): g = 9,81 m/s², decimales con coma
  en la prosa, fuerza normal `n`, momento angular `L` (42 lo llama `H`; se aclara en el caso de
  uso). Los literales de código se citan tal cual, con punto. Extensiones dentro del tema son
  bienvenidas; material de otros cursos, no.
- **Colores con significado real**, nunca por orden de serie: Tierra azul (`--chart-1`), Marte
  naranja (`--chart-2`), Luna gris (`--fg-muted`); Sol, planetas exteriores, pelota de tenis y
  balón de baloncesto con sus tokens. En el Tema 6, lo devuelto a la batería en verde
  (`--chart-3`) y el calor de fricción en rojo anaranjado (`--chart-2`). Ningún texto llama
  "roja" a `--chart-2` (en el Tema 8 marca L_máx como tono de advertencia). Las figuras usan
  tokens, no hex, y evitan juntar pares cercanos (urano con `--chart-6`, tenis con
  `--chart-5`).
- **Estructura por pasos:** cuatro `Step` por tema nuevo (mínimo tres), cada uno con ecuación
  numerada, `Why` con `fenomeno` y `ecuacion` y su figura a lo ancho de la columna.
- **Prosa ≤ 650 palabras por tema.** Con las tablas, cada leyenda dice en dos o tres frases qué
  muestra la figura y cómo leerla; los parámetros viven en la tabla. Cuentan para la lectura el
  título de la tabla, las etiquetas de columna y las celdas de texto, no las numéricas.
- **Tablas, no leyendas largas.** `<DataTable id="…" />` en el MDX; la tabla vive en
  `src/lib/tables/topics/<slug>.ts` y es la única fuente para la página, la lectura y "Copiar
  Markdown". Una etiqueta `DataTable` no canónica falla, no se omite en silencio.
- **La precisión es la del dato, no la global:** cada columna numérica declara su `precision`;
  las tablas no siguen el ajuste global de decimales.
- **Una fuente por número:** todo número sale de una fuente abierta marcada CONFIRMADO en la
  investigación o es "(cálculo propio)" reproducible por código con pruebas. Lo NO CONFIRMADO
  no se afirma. Los valores que ya existen en otro módulo se importan, nunca se copian; un dato
  de fuente que usa solo su tabla puede vivir en el módulo de la tabla, con su fuente.
  `src/lib` no importa de `src/components`.
- **Tema 6:** el modelo mejorado (gráfica del paso 4, tabla de ciclos, valor por omisión del
  laboratorio) usa el desvanecimiento a baja velocidad f(v) de FASTSim activo, η 0,80,
  P_máx 239 kW: vuelve a la batería el 40,4 % de la tracción en UDDS, 12,5 % en HWFET y 30,7 %
  en US06. Sin f(v) (43,5 %) solo sirve de contraste en el paso 3. Lo disipado = calor de
  fricción + pérdidas de conversión (1 − η). El reparto es modelado y la figura lo declara; el
  ciclo y los coeficientes son datos reales de la EPA.
- **Tema 7:** el preajuste "Umbral alto (Unity)" se detiene a los 8 rebotes en el modelo ideal
  con umbral; en la bola del motor se admite 8 ± 1. Los umbrales de Box2D (1 m/s) y PhysX
  (2 m/s) son cálculo propio y así se marcan.
- **Tema 8:** el torque de gradiente de gravedad es 2,28·10⁻⁷ N·m y la saturación 2,19·10⁵ s
  en todo el sitio (lo que calcula el código, no el redondeo de la investigación). La descarga
  con propulsores es un supuesto ilustrativo, limitado al torque máximo de la rueda (8 mN·m).
- **Tema 9:** el modelo de sobrevuelo es plano; los encuentros fuera del plano (Neptuno de la
  V2, Saturno de la V1) se reconstruyen con el ángulo de salida y se rotulan como tales. "Pasar
  por delante" se ilustra con r_p = 20 R_J. La ganancia máxima en Júpiter está cerca de
  3 R_J.
- **Una sola insignia de recurso por tema:** solo la figura del recurso prescrito.
- **Signo de grado pegado al número (R39):** «97,5°» en lecturas, figuras y texto; los grados
  Celsius y las unidades compuestas llevan espacio («120 °C», «3,0 °/s»).
- **Voz:** los textos van en primera persona. Las líneas de fuente de las figuras dicen casi
  todas «del autor» o «por el autor»; el Tema 7 y parte del Tema 2 dicen «que calculé»
  (pendiente 7).
- **Unidad de tiempo del transporte, por laboratorio (R35):** segundos fijos en los Temas 1, 3
  y 6 y en la maniobra del Tema 8, porque sus lecturas, ejes y notas hablan en segundos; el
  Tema 9 elige la unidad sola (horas o días). Las notas de los Temas 3 y 6 conservan «la lectura
  t va en segundos reales», como se revisaron. Los decimales los fija el paso de la línea de
  tiempo (R37): el UDDS se lee en segundos enteros.
- **Los temas futuros no existen en el sitio:** los Temas 10 a 13 no tienen nombre, enlace ni
  página; la Entrega Final es la única sección con la insignia "Se publica con su consigna".
  `tests/e2e/site-pages.spec.ts` lo comprueba.
- **Todo tema con archivo está publicado** (frontmatter sin `status`; `number` en
  `src/consigna.ts`; al menos dos `related`, solo temas del sitio; al menos una referencia a
  clase).
- **Simuladores ricos:** reloj, línea de tiempo, lecturas, preajustes, ajustes locales y
  globales, atajos de teclado, alternativa de teclado para cada arrastre, movimiento reducido
  respetado y velocidad de reproducción indicada en la página cuando no es real.
- **Tema 5, portada, franja del tema, pie, "Volver arriba" y títulos que se parten:** sin
  cambios respecto del traspaso del Avance 1.

## Decisiones que tomó Claude sin consultar

Del libro de decisiones (`progress.md`, R1 a R40). Formato: qué se decidió; por qué; qué cuesta
si fue un error.

- **R1:** los cuatro temas (y las tareas base) se hicieron en paralelo, cada uno en su
  worktree; lo pedían el plan y la fecha, y los worktrees separan los cambios; costo: conflictos
  de rebase en archivos compartidos, ya resueltos.
- **R2:** la prueba del UDDS fija 1369 s y 11,99 km, y el número de muestras sale del archivo de
  la EPA; la especificación fija duración y distancia, no la cuenta; costo: editar una prueba.
- **R3:** "Umbral alto (Unity)" se detiene a los 8 rebotes en el modelo ideal y en 8 ± 1 en la
  bola del motor; el octavo impacto está solo un 6 % sobre el umbral y el paso de tiempo lo
  mueve; costo: una aserción más laxa.
- **R4:** el ejemplo "por delante" del Tema 9 usa r_p = 20 R_J y no 10 R_J; con 10 R_J la
  investigación da una ganancia de +0,06 km/s, no una pérdida; costo: ninguno, la lección (el
  lado decide) se mantiene.
- **R5:** núcleo y datos de los cuatro temas empezaron junto con las tareas base; tocan archivos
  disjuntos; costo: un conflicto de rebase.
- **R6:** se corrigió la cercanía de color Júpiter–Saturno (claro) y baloncesto–`--chart-2`;
  comparten figuras y Dylan revisa los colores; costo: una ronda corta extra.
- **R7:** el núcleo del Tema 7 expone e(v) y deja que una bola con β > 0 pueda quedar en reposo (relajando los contactos sin
  restitución, al estilo de Box2D; se descartó el *slop*); el
  paso 4 lo pide y sin reposo las lecturas del laboratorio no sirven; costo: una ronda más de
  núcleo.
- **R8:** con worktrees en paralelo, Playwright corre con `--workers=2`; la carga de la máquina
  volvía inestables las pruebas de tiempo; costo: e2e más lentas.
- **R9:** se acepta ±1 rebote para e = 0,75 y umbral 1 m/s en la bola del motor (extensión de
  R3); el esquema pierde ≈ g·h/2 por rebote y el sexto impacto cae; costo: una prueba más laxa.
- **R10:** las etiquetas `DataTable` no canónicas fallan y `precision` es obligatoria; cuatro
  temas escriben contra esa API; costo: una ronda algo mayor.
- **R11:** el identificador de prueba del LEAF (`JNSX10050525`) solo aparece con su cita en la
  investigación; cada identificador impreso debe tener respaldo; costo: una línea de documento.
- **R12:** en cada tema, el laboratorio se hizo antes que figuras y tablas mientras se esperaba
  la tabla; el laboratorio no dependía de ella; costo: alinear piezas de gráfica después.
- **R13:** el código del Tema 9 calcula también los números del texto (fuerza, energía
  potencial, retroceso de Júpiter 4,4·10⁻²¹ m/s, órbita "solo el Sol": a 3,64 UA, e 0,727,
  afelio 6,29 UA); todo número sale de código con pruebas; costo: una ronda mayor.
- **R14:** el Tema 9 agregó una línea a `.prettierignore`; sin ella `pnpm run format` rompe la
  prueba de tamaño del JSON; costo: ninguno.
- **R15:** figuras y laboratorio de cada tema se hicieron en paralelo en worktrees hermanos;
  archivos disjuntos y fecha cercana; costo: ayudantes duplicados, señalados para la revisión
  final.
- **R16:** el preajuste del Tema 8 «Un día de perturbación con descarga» pasó a llamarse «Tres
  días de perturbación con descarga» («Perturbación y descarga» es el modo del laboratorio, no
  el preajuste); el umbral de descarga llega a las 48,6 h y un nombre no puede contradecir sus
  números; costo: una cadena.
- **R17:** el sitio usa 2,28·10⁻⁷ N·m y 2,19·10⁵ s del código en tablas, laboratorio y texto
  del Tema 8; manda lo calculado por código con pruebas; costo: una última cifra distinta de la
  nota de investigación.
- **R18:** la descarga con propulsores del Tema 8 se rotula como supuesto ("limitado al torque
  máximo de la rueda, 8 mN·m"); no hay un torque de propulsor confirmado para un 6U; costo: una
  etiqueta.
- **R19:** el modelo mejorado del Tema 6 lleva f(v) activo (40,4 / 12,5 / 30,7 %; 0,448 kWh
  con P_máx 10 kW) y 43,5 % queda como contraste; sin f(v) la fricción es nula y el tema no
  mostraría cuánto se disipa; costo: cambiar otra vez valores de prueba en el Tema 6.
- **R20:** el núcleo del Tema 6 acumula las pérdidas de conversión por paso
  (`eConversionLoss`) y en el total; así cada número de la figura sale del núcleo; costo: un
  campo más.
- **R21:** el umbral de PhysX (2 m/s) se marca como cálculo propio; todo número debe llevar a
  su fuente; costo: una nota.
- **R22:** L_máx del Tema 8 conserva `--chart-2` (tono de advertencia, como el `Callout`
  "cuidado"), pero ningún texto lo llama "rojo"; costo: cambiar un token después.
- **R23:** el diagrama prescrito del Tema 8 corrigió también tamaño de subíndices, etiquetas
  (8.3)/(8.4), línea de fuente derivada de las filas y precisión honesta; el recurso prescrito
  se califica por calidad propia y citas; costo: una ronda mayor.
- **R24:** el control de e del Tema 7 va de 0,001 en 0,001 (FIBA 0,767 y FIFA 0,851 exactos),
  la nota de mezcla incluye piso 0 y se buscó la prueba inestable en tres corridas; barato y
  sobre el recurso prescrito; costo: una ronda algo más larga.
- **R25:** se agregó una tarea compartida (signo menos U+2212 en `formatNumber`, unidades de
  tiempo en `TransportBar`, nombre accesible del cursor de `SvgPlot`); el problema se repetía
  en los Temas 7 a 9 y se ve; costo: una ronda que también toca salidas del Avance 1.
- **R26:** la segunda ronda de figuras del Tema 9 cubrió además el cursor de detalle, la
  etiqueta de la hipérbola en 360 px y la deduplicación con el laboratorio; es el recurso
  prescrito; costo: una ronda mayor.
- **R27:** se corrigió la nota del preajuste de Unity: "e quedaría a la mitad y la altura del
  rebote, a la cuarta parte"; era un error de física en el recurso prescrito; costo: una cadena.
- **R28:** la tarea compartida hace que `a11y.spec.ts` y `responsive.spec.ts` tomen las páginas
  de `TOPICS` (nueve temas con axe en móvil) e investiga `sidebar.spec.ts:117`, inestable; la
  especificación prometía cubrir los temas nuevos; costo: una ronda compartida.
- **R29:** las tablas de los Temas 1 a 5 y su frase de conexión se hicieron en una sola pasada
  por archivo (Temas 1–3 y 4–5 en dos worktrees); evita conflictos en el mismo MDX; costo: las
  conexiones se revisaron junto con las tablas.
- **R30:** los textos los lee Dylan palabra por palabra, así que las rondas de texto corrigieron
  también menores de exactitud y tipografía; costo: rondas algo más largas.
- **R31:** se corrigió la cita del preajuste e(v) del Tema 7 (la figura está en «Dynamic
  properties of tennis balls», no en «The bounce of a ball»); fuente mal atribuida en el recurso
  prescrito; costo: una cadena.
- **R32:** el Tema 5 volvió a ≤ 650 palabras recortando solo las dos frases de conexión
  redactadas por Claude (Tema 7 y Tema 3), nunca prosa revisada por Dylan; el tope es regla y
  esas frases son nuestras; costo: Dylan reescribe dos frases cortas (pendiente 2).
- **R33:** los preajustes del gatillo y los valores de ejemplo k/F₀ pasaron a
  `src/lib/data/triggerPresets.ts` (y, por el mismo motivo, los criterios de confort del Tema 3 a
  `comfortCriteria.ts`); `src/lib` no debe importar de componentes y cada número tiene una sola
  fuente; costo: un refactor pequeño del Tema 5 que hay que volver a comprobar.
- **R34:** un dato copiado de una fuente que solo usa su tabla puede quedar en el módulo de la
  tabla con su fuente; si ya existe en otro lugar, se importa (aplica a los Temas 1 a 3; los
  valores de `tyres.ini` del Tema 4 se quedan en su tabla); costo: mover datos después.
- **R35:** la unidad de tiempo del transporte la fija cada laboratorio: segundos en los Temas 1,
  3 y 6 y en la maniobra del Tema 8, automática en el Tema 9; las notas de los Temas 3 y 6 se
  quedan como se revisaron; la unidad automática pasaba a minutos en ciclos largos y chocaba con
  cursores, ejes y lecturas en segundos; costo: una propiedad `timeUnit` por laboratorio y sus
  pruebas.
- **R36:** las dos gráficas prescritas de los Temas 6 y 9 abren su línea de fuente con el autor
  («Gráfica del autor con las ecuaciones (6.2) a (6.4); …» y «Gráfica del autor; datos:
  NASA/JPL Horizons, …»); todas las demás figuras lo dicen y el recurso prescrito es lo que se
  califica; costo: dos cadenas.
- **R37:** la revisión final corrigió menores que ve el lector: «según los datos de Horizons» y
  la cita de astro-par en el Tema 9 (con tres recortes para seguir en 650), subíndices con
  tilde en el Tema 8 (L_máx, ω_máx, τ_máx, T_mín), decimales del transporte en segundos fijos
  según el paso, la frase de e < 1 del Tema 5 y «≈ 223,6 m» en la leyenda 3.2; Dylan lee cada
  palabra (R30) y son errores visibles; costo: frases que Dylan debe releer (pendiente 1).
- **R38:** una sola ronda corrigió los dos defectos importantes y todos los menores de la pasada
  visual (subtítulos que chocaban en el laboratorio del Tema 7, «v∞,out» sobre la lectura de r_p
  en el del Tema 9, etiquetas sobre arcos y flechas, cursor tachado por la serie, sombra de
  desplazamiento en las tablas, «−1 940», detalle M de la figura 8.4, clave de flecha en la
  leyenda 9.2 y números a la derecha en la tabla 8.1, y también en los rangos de la 7.2, el mismo
  defecto), salvo «UT» (símbolo de la IAU, como lo escribe Horizons) y «Volver arriba» sobre el
  contenido al desplazarse (control flotante, como en el Avance 1); la rúbrica premia el diseño
  cuidado y en un teléfono es donde primero mira un evaluador; costo: una ronda más de revisión.
- **R39:** el signo de grado va pegado al número, sin espacio («97,5°»; Folleto del SI §5.4.3),
  como ya lo escriben figuras y prosa: `formatNumber` con unidad °, ′ o ″ no deja espacio, en
  todo el sitio, Temas 1 a 5 incluidos (°C y °/s conservan el espacio); costo: una regla en
  `format.ts` y sus pruebas.
- **R40:** sin excepciones, toda columna de números va a la derecha, también en los Temas 1 a 5:
  «En el código» y «En SI» de la tabla 2.1 y los valores del tyres.ini de las tablas 4.3 y 4.4
  (escritos como en el archivo, con punto); son tablas nuevas de este avance que Dylan aún no
  lee, y la coherencia del sitio pesa más; la prueba del registro lo exige ahora en toda tabla.
  Como los números se miran y no se leen, la lectura del Tema 2 baja de 8 a 7 min; costo:
  cinco columnas que vuelven a texto si Dylan prefiere el formato del archivo a la izquierda.
- **R41 — miles en las ecuaciones:** en el Tema 8, «I_s/I_w ≈ 1940» pasó a «1 940» (`1\,940`),
  como la figura 8.1 y la convención KaTeX del resto del sitio («3 114», «721 375»); una
  búsqueda en los nueve temas no encontró otro caso. Costo si no gusta: un token.

## Menores diferidos (opcionales, sin efecto en la entrega)

Lo que la tarea compartida y la revisión final no recogieron queda como está. Los del Avance 1
siguen en su traspaso.

- **Compartidos:** colores cercanos (urano y `--chart-6` ΔE 5,5; tenis y `--chart-5` 7,7; sol y
  diagrama ≈ 10; neptuno ≈ acento en claro); baloncesto 3,03:1 sobre `--bg` en claro, justo;
  tolerancia 0,05 del ayudante ΔE. `DataTable`: escape de saltos de línea y barras invertidas
  en celdas Markdown, `expandTables` no distingue bloques de código, CSS de leyenda duplicado,
  el nombre accesible de tablas y figuras no lleva "Tabla N.k". `responsive.spec.ts` sin
  aserción explícita de anterior/siguiente Tema 5 → Tema 6. `ChoiceField` del Tema 8,
  candidato a componente compartido. Transporte: en segundos automáticos (Tema 2, salto de
  menos de 1 s) varios pasos seguidos anuncian el mismo `aria-valuetext`; con unidad fija y
  duración 0 caería a 2 decimales (ningún laboratorio lo hace); los commits intermedios
  `0be25e6` y `f997750` no pasan una prueba de `FlybyLab` (la arregla `68e1f5f`). El cursor
  de algunas gráficas lleva otros decimales que el transporte para el mismo instante (Tema 8
  maniobra «30,0 s» frente a «t = 30,00 s»; Tema 6 en HWFET y US06, 0 frente a 1 decimal):
  misma unidad, otra precisión.
- **Tema 6:** muestras de ciclos mutables (`readonly`); triple validación de tiempo creciente
  (el script debería usar el esquema compartido); `fetch` del script sin tiempo de espera;
  constantes duplicadas (`ENERGY_PRECISION`, `J_PER_KWH`, URL de la EPA dos veces); `--chart-1`
  significa tres cosas entre figuras; en el paso 3 la línea de fricción queda bajo la de
  P_freno; el término Bv del paso 2 se parece a la carga en carretera del paso 4; la barra de
  frenado perdió su morado; el laboratorio anuncia lecturas al hidratar; "Tiempo" frente a
  "Línea de tiempo".
- **Tema 7:** umbral de Godot rotulado "Godot (Jolt)"; supersuave 0,8644 mostrado como 0,86;
  `requirePositiveInteger` duplicado; la docstring de `resolveContact` debería decir que Box2D
  relaja todos los contactos; `e` sigue siendo obligatorio con `restitutionAt`; constantes de
  formato duplicadas; prueba de momento casi tautológica; flechas de parada hasta el piso de la
  gráfica sin marca "piso"; diagrama de choque sin título de `ChartFrame`; marcas del umbral
  0,2/1/2; `BounceLab` ≈ 205 líneas; la nota de Unity aún dice "2 m/s"; otras cadenas que
  nombran «The bounce of a ball» sin revisar.
- **Tema 8:** el título de una prueba dice 2,18·10⁵ s; conversión rpm a mano en una prueba;
  objetos `as const` sin tipo; nota en español torpe en `reactionWheels.ts`; constantes
  duplicadas; dirección de importación de `DEG`; radios estáticos en el modo de perturbación;
  par `WheelScene.tsx`/`wheelScene.ts`; comentarios que llaman "rojo" a `--chart-2`; con
  movimiento reducido a 4×/8× se puede saltar la ventana de descarga; "t" del transporte en
  segundos de reproducción frente a horas de órbita; "un día en 12 s" ≈ 14 s el día de la
  descarga; la hora de órbita se congela durante la descarga; la masa de la tabla 8.1 sin
  unidad en el encabezado (cada celda lleva la suya); "Volver arriba" tapa el borde del panel B en
  360 px; punto del cubo como ⊙; "Tierra" sobre el borde; id SVG fijo; "En su tope" podría
  repetir la consigna; el título de Hasha lleva una elipsis (el título completo de NTRS podría
  reemplazarla).
- **Tema 9:** registro de encuentro sin tipo y `analyseEncounter` de 75 líneas en el script;
  `escapeSpeedSeries` con GM global; literales en pruebas (retroceso sin encadenar
  masa × Júpiter × Δv); `planarSideOf` prefiere "detrás" en empate; falta la aserción
  1 R_J < 3 R_J; el botón de r_p suelta el preajuste; lecturas sin "modelo plano" en preajustes
  fuera del plano; `DEG` con sentidos opuestos; formateador km/s ×4; control de rango y de
  texto con el mismo nombre; lado de Saturno de la V1 probado indirectamente; funciones y
  archivos largos en las gráficas (≈ 445 líneas); `formatOffset(0)` sin signo; "v∞" sin flecha
  en las etiquetas; el nombre accesible no dice
  7,62 km/s; "c, su distancia" algo ambiguo; "(9.4), su superposición" escueto.
- **Temas 1 a 5:** comentario de `jumpPresets` sobre `JUMP_SCALES`; conexión del Tema 2 impersonal; `MM_PER_M`
  definido tres veces y `toMetres` dos; la frase del Tema 3 en el Tema 5 quedó más elíptica;
  cita de Isola dentro de la línea de fuente; `markdownRows` duplicado en pruebas.

## Forma de trabajo acordada

Igual que en el Avance 1, con lo aprendido en el Avance 2:

- **Idioma:** todo con Dylan en español. Dylan quiere leer el brief, verlo reproducido y
  responder preguntas de decisión antes de construir.
- **Nunca recortar calidad por tiempo.** Las fechas ordenan el trabajo; no bajan la barra.
  Si algo se difiere, se dice explícitamente.
- **Implementación con subagentes,** modelo y esfuerzo según la tarea (alto para física,
  diseño visual y textos; menor para andamiaje). Cada tarea: brief, implementación, revisión
  independiente, ronda de correcciones y re-revisión acotada; decisiones del controlador
  anotadas con su costo si estuvieran equivocadas.
- **Trabajo en paralelo con worktrees:** un worktree y una rama por tarea o tema
  (`avance-2-tema-N`, `avance-2-tema-N-fig`…), `pnpm install --frozen-lockfile` en cada uno, y
  rebase con avance rápido sobre la rama principal (historia lineal). Los archivos compartidos
  (`src/components/lab/**`, `ui/**`, `charts/**`, `src/styles/**`, `src/consigna.ts`, suites
  e2e compartidas) solo los toca una tarea compartida.
- **Puertos de e2e:** uno por worktree (base 4331 a 4333, temas 4336 a 4339; integración y
  documentación 4322). Bajo carga, Playwright con `--workers=2`.
- **Límite de uso:** si se corta la sesión por límite de uso, los agentes dejan su trabajo
  guardado; se retoma tras el reinicio leyendo `progress.md` y reanudando cada agente donde
  quedó.
- **Commits** en inglés con formato convencional (`feat`, `fix`, `refactor`, `docs`, `test`,
  `chore`, `perf`, `ci`), solo con la identidad de Dylan, **sin línea de coautor**.
- **Ramas:** se trabaja en una rama (`avance-2` para este avance), CI en cada push, y se integra
  a `main` con avance rápido (`git push origin <rama>:main`) cuando CI está en verde. El push a
  `main` despliega a GitHub Pages; verificar las páginas vivas después.
- **Servidor de desarrollo:** Dylan suele tener `pnpm run dev` en el puerto 4321 desde VS Code.
  No matar ese proceso. Las pruebas e2e se corren en otro puerto.
- **Puerta completa antes de integrar:**
  ```
  pnpm run check && pnpm run test:cov && pnpm run build && E2E_PORT=4322 pnpm run e2e
  ```
- **Textos:** Claude redacta, Dylan revisa y edita antes de que cuenten como publicados.
- **Datos reproducibles:** `pnpm run data:cycles` y `pnpm run data:voyager` vuelven a descargar
  de la EPA y de Horizons y reescriben los JSON con la consulta y la fecha; las pruebas fijan
  los hechos que la página afirma, así que un cambio en la fuente se nota en `pnpm run test`.
- **Autenticación:** `gh` configurado con la cuenta universitaria `Djch18AtSchool`; el remoto
  es HTTPS. La clave SSH universitaria (`github-university`) necesita `ssh-add` con
  contraseña.
- **Limpieza:** después de entregar, borrar los worktrees y las ramas `avance-2-*` ya
  integradas. En el repositorio hay un `stash@{0}` antiguo, de la rama `v2` («stray
  TopicLayout edit of unknown origin», quita la línea "Tema N · Avance X", ya resuelta en el
  Avance 1); no es de ninguna tarea del Avance 2: decidir si se descarta.

## Después del Avance 2

- **Entrega Final:** esperar su consigna. Cuando llegue, agregar sus temas a `TOPICS` en
  `src/consigna.ts` y un MDX completo por tema, con el mismo esquema (`Step`/`Why`/`Figure`/
  `DataTable`/`UseCase`/`Callout`/`Connections`/`Sources`), una tabla por tema en
  `src/lib/tables/topics/`, el cascarón de laboratorio y la notación; leer el material de clase
  antes de escribir las conexiones y actualizar `tests/e2e/site-pages.spec.ts` (páginas
  esperadas y nombres retirados).
