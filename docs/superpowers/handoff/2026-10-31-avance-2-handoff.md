# Traspaso · Avance 2 (31 de octubre de 2026)

Documento para continuar el trabajo. Reúne el estado del sitio tras el Avance 2, lo que falta
para entregarlo, las decisiones vigentes, las decisiones que tomó Claude sin consultar y la
forma de trabajo acordada. Reemplaza como punto de partida al traspaso del Avance 1
(`docs/superpowers/handoff/2026-10-10-avance-1-handoff.md`), que queda como historia.

## Estado

- **Publicado:** `origin/main` = `c9a773d` (Avance 2 con la fase A de la auditoría), integrado
  con avance rápido el 31 de octubre a las 02:34 UTC por indicación de Dylan («sube el código que
  tenemos»); el despliegue a GitHub Pages terminó en verde y las nueve páginas de tema y la
  portada responden 200. La rama local `main` ya apunta al mismo commit. Lo publicado antes
  (`1069de1`, Avance 1 del 17 de octubre) queda en la historia. Las etiquetas `avance-1` y
  `avance-2` siguen sin crearse (pendientes 4 y 5; `git tag -l` está vacío). **Después:**
  `origin/main` avanzó a `6dc690b` (suma B1a, B1b y el plan de las fases B, C y D); la `main`
  local sigue en `c9a773d`.
- **Fase B cerrada en `fase-b`** (`c26520a`, 11 de noviembre de 2026, 00:06 UTC−6; 212 commits
  sobre `6dc690b`, sin empujar): B2 notación, B3 cascarón por niveles y B4 legibilidad a velocidad
  real, sobre B1a y B1b. Resumen, decisiones (FB-R1 a FB-R26), textos para Dylan, decisiones
  abiertas y deudas en la sección «Fase B cerrada».
- **Contenido del Avance 2** (rama `avance-2`, ya en `main`). Reúne:
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
- **Fase A de la auditoría integral (30 de octubre, tarde):** tras la auditoría pedida por Dylan
  (`docs/superpowers/audits/2026-10-30-auditoria-integral.md`), cinco tareas de texto en
  paralelo, cada una con revisión independiente y ronda de correcciones, integradas en seis
  commits: `f4dcb0e` (prueba del tope de 650), `935d3e4` (Temas 7 y 8), `681482d` (Tema 4 con
  datos reales en la figura 4.3), `1715ec4` (Tema 9 sin flechas U+20D7), `aac05b4` (Temas 1 a 3,
  caso de 1 g en el Tema 3) y `ac2a6a2` (Temas 5 y 6, Tabla 5.4 nueva). La lista completa de
  frases «antes → después» para la lectura de Dylan está en
  `docs/superpowers/audits/2026-10-30-fase-a-cambios.md`. Prosa final: 643, 648, 649, 649, 649,
  649, 650, 650 y 650 palabras (Temas 1 a 9).
- **Puerta tras la fase A:** `ac2a6a2` (último commit de contenido de la fase A; después solo cambia documentación): `pnpm run check` sin errores ni avisos; 1936 pruebas unitarias en 157 archivos, cobertura 98,70 % de sentencias, 93,79 % de ramas, 99,06 % de funciones y 99,24 % de líneas; 11 páginas construidas; e2e 478 pasan y 0 fallan en el puerto 4322 (2,5 min). Lighthouse no se repitió (sin cambios de interfaz).
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
| Auditoría integral del 30 de octubre, revisiones académicas por tema y lista de cambios de la fase A | `docs/superpowers/audits/2026-10-30-*.md` |
| Especificación y plan del Avance 2 | `docs/superpowers/specs/2026-10-30-avance-2-design.md`, `docs/superpowers/plans/2026-10-30-avance-2.md` |
| Plan de las fases B, C y D de la auditoría | `docs/superpowers/plans/2026-10-31-fases-b-c-d.md` |
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
- `.superpowers/sdd/2026-10-31-fases-b-c-d/`: el libro de la fase B (`progress.md`, rulings
  FB-R1 a FB-R26), los briefs, los informes `task-*-report.md` y las revisiones
  `review-*-report.md`; las capturas están en `shots/`.
- `.superpowers/sdd/2026-10-30-avance-2/`: el libro de decisiones (`progress.md`), los briefs,
  informes y paquetes de revisión de cada tarea. Lo vigente está resumido abajo.
- Los worktrees de trabajo viven en el directorio temporal de la sesión de Claude Code
  (`…/scratchpad/worktrees/`) y desaparecen con ella; todo lo integrado está en `avance-2`.

## Pendientes de Dylan para cerrar el Avance 2

1. **Leer los cuatro textos nuevos (Temas 6 a 9).** La fase A cambió frases en los cuatro; la
   lista exacta está en `docs/superpowers/audits/2026-10-30-fase-a-cambios.md`. Son borradores de Claude y cuentan como
   autoría de Dylan ante el profesor (el plagio se sanciona). El botón "Copiar Markdown" de
   cada tema entrega el texto completo, con las tablas. Cada uno queda en 644 a 650 palabras
   de prosa, con el tope en 650; si se agrega algo, hay que quitar otro tanto. La revisión
   final cambió unas pocas frases (R37): en el Tema 6, «Al detenerse» → «Cerca de
   detenerse»; en el Tema 9, «según los datos de Horizons» en la primera frase y, para seguir
   en 650, «Pero en Júpiter» → «En Júpiter», «la cifra que publica la NSSDCA» → «la cifra de la
   NSSDCA» y «una alineación poco frecuente, que se repite» → «una alineación que se repite».
2. **Releer los Temas 1 a 5.** También cambiados por la fase A (misma lista; el Tema 3 ganó el
   caso de 1 g en prosa y en el diagrama, el Tema 4 los puntos reales en la figura 4.3 y el
   Tema 5 la Tabla 5.4). Los datos de las leyendas pasaron a tablas; las leyendas quedaron
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
   Resuelto en la fase A: ahora dice «la lectura t da el tiempo real transcurrido, en horas o
   días, aunque en pantalla pasen segundos».
9. **Decisiones abiertas tras la auditoría** (`2026-10-30-auditoria-integral.md` §11 y §12):
   Tema 6, f(v) a la rapidez media como FASTSim 2 (40,4 % → 41,2 %, fricción 0,062 → 0,046 kWh)
   o a la rapidez final, ya declarada en la nota; Tema 4, si el caso de uso debe explicar qué
   implicaría LS_EXPY = 0,49 como β (unas 20 palabras a recortar); raíz y cuerpo a 16 px
   (decidido por Dylan el 10 de noviembre; lo aplica la fase C); notación de vectores en texto
   plano (hecha en la fase B2); anillos de Saturno y realismo
   (fase D); y la voz de las líneas de fuente (pendiente 7).

10. **Leer los textos de la fase B** (sección «Fase B cerrada», apartado 4) y resolver las
    decisiones abiertas de su apartado 5. Los textos nuevos o cambiados son borradores de Claude,
    como los del Avance 2.

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
  tiempo (R37): el UDDS se lee en segundos enteros. Desde B4 hay tres cambios: el Tema 1 lee el
  tiempo de la ruta con los decimales globales, el Tema 6 el del ciclo («t = 389,00 s» en
  «Tramo») y el Tema 8, en «Perturbación y descarga», horas de órbita (FB-R23 a FB-R25); la nota
  de «Cómo se usa» del Tema 6 ya no dice «la lectura t va en segundos reales» (la del Tema 3 sí).
- **Los temas futuros no existen en el sitio:** los Temas 10 a 13 no tienen nombre, enlace ni
  página; la Entrega Final es la única sección con la insignia "Se publica con su consigna".
  `tests/e2e/site-pages.spec.ts` lo comprueba.
- **Todo tema con archivo está publicado** (frontmatter sin `status`; `number` en
  `src/consigna.ts`; al menos dos `related`, solo temas del sitio; al menos una referencia a
  clase).
- **Simuladores ricos:** reloj, línea de tiempo, lecturas, preajustes, ajustes locales y
  globales, atajos de teclado, alternativa de teclado para cada arrastre, movimiento reducido
  respetado y velocidad de reproducción indicada en la página cuando no es real (desde B4, en
  una insignia sobre el lienzo, no solo en una nota).
- **Tema 5, portada, franja del tema, pie, "Volver arriba" y títulos que se parten:** sin
  cambios respecto del traspaso del Avance 1, salvo "Volver arriba": desde B3 no aparece
  mientras un laboratorio ocupa su esquina y, en el móvil, se oculta mientras se lee uno.

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
  números; costo: una cadena. (B3.2c lo acortó después a «Tres días de perturbación»: la ficha
  se salía 12 px del panel a 360 px.)
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

- **R42 — tope de 650 como prueba:** `src/content/topics.test.ts` falla si la prosa de un tema
  supera 650 palabras según `readingStats`; la regla se comprobaba a mano. Costo: ninguno.
- **R43 — Tema 4, datos reales en la figura 4.3:** seis pares de `tcurve_F3soft.lut` (MUR) se
  dibujan sobre el modelo, con su fuente, y viven en `src/lib/data/tyreModels.ts`; la fuente de
  la figura 4.2 ya no dice «inspirado en LS_EXPY» (β = 0,9 queda como ilustrativo) en lugar de
  reencuadrar el caso de uso, por presupuesto; la rúbrica pide «datos reales bien citados».
  Costo: una serie que quitar y 20 palabras si Dylan prefiere el reencuadre.
- **R44 — Tema 6, f(v) a rapidez final, declarada:** el núcleo no cambió; la nota del laboratorio
  dice que FASTSim 2 usa la media (41,2 %) y el comentario de `energy.ts` ya no afirma lo
  contrario; cambiar el modelo mueve números en texto, tabla, pruebas y traspaso y es decisión
  de Dylan (pendiente 9). Costo: una ronda de números si elige la media.
- **R45 — Tema 9, vectores sin flecha en texto plano:** leyendas, etiquetas, notas y lecturas
  escriben v, V_p y |Δv|; dos pruebas fallan si vuelve U+20D7; no se creó la Tabla 9.3 (la
  leyenda del laboratorio conserva 3 radios, 20,37 y 6,76 km/s). Costo: ninguno; la notación
  definitiva (KaTeX_Main o flecha dibujada) es de la fase B.
- **R46 — Tema 5, (5.1) como amplitud y Tabla 5.4:** `F(x,t) = F₀ sin(ωt)`, símbolos ω y t, y
  una tabla con los cuatro modos de la API de Apple y la escalera de Klein en lugar de la línea
  de fuente de 210 palabras; la cita de Sony quedó como fragmento. Costo: una tabla que revisar.
- **R47 — datos de validación en notas, no en tablas:** Tema 1 (3 876 muestras, 1 mm/s salvo
  en los quiebres, 5 mm/s) en la nota del laboratorio; Tema 2 (ápice 3,75 / 3,88 / ≈ 3,95 m) en
  la suya; la tabla 2.1 es «constantes tal como las imprime el código» y un derivado no cabe
  sin romper su semántica. Costo: moverlos después.
- **R48 — Tema 3, caso de 1 g en prosa y en el diagrama:** el `Why` del paso 2 lo resuelve en
  los dos sentidos y `HabitatDiagram.astro` lleva la nota «a_c = g · 2 RPM → 223,6 m · 1 RPM →
  894,6 m», a 17 px en móvil (el e2e exige ≥ 11 px efectivos y el SVG mide 290 px a 375 px, no
  305 como decía el comentario). Costo: ninguno.

- **R49 — Tema 1 sin Recharts (fase B, `23c907d`):** los cuatro perfiles se dibujan con
  `SvgPlot`; no hay cursor arrastrable por gráfica (la línea de tiempo es el único mando de t,
  también con teclado); la lectura del instante va en una fila HTML bajo cada gráfica, no en una
  placa dentro del SVG, para no tapar las series, e interpola entre muestras como las lecturas
  del laboratorio; las etiquetas de banda pasan abajo como en el Tema 4. Costo si Dylan quiere
  cursor por gráfica: una prop `onSeek` y el cursor de `SvgPlot`.

- **R50 — reloj fuera de React (fase B, `0fa68f0`):** el tiempo vivo de cada laboratorio está en
  un almacén de cuadro escrito por `requestAnimationFrame`; el estado de React se sincroniza a
  10 Hz y en cada transición discreta (`clock.state.t` es exacto tras play, pause, seek y step);
  las lecturas, el texto del transporte y el anunciador se refrescan a 10 Hz (antes 60: ningún
  texto es legible más rápido) y el pulgar de la línea de tiempo se escribe por cuadro;
  `MAX_FRAME_DT_S` pasó de 0,05 a 0,25 s: un cuadro lento salta en vez de frenar la simulación y
  una parada mayor reanuda sin brinco; los arcos ω del Tema 8 avanzan en pasos de 0,5° (cuerpo) y
  1° (rueda); `useThrottledFrameTime` se descartó por YAGNI. La revisión independiente cazó una
  regresión (el `rotate` de SVG gira horario y el laboratorio cuenta antihorario) que ninguna
  prueba comparaba; ahora `WheelScene.test.tsx` compara el morro vivo con el fantasma objetivo.
  Medido en producción: 4,6–8,1 mutaciones por cuadro (antes 45–86), < 1 ms de script por
  cuadro, 60 fps con CPU ×4 en los siete laboratorios con reloj; `pnpm run measure:labs <url>`
  imprime la tabla y `tests/e2e/lab-performance.spec.ts` vigila el presupuesto. Costo si algo
  no gusta: los ganchos son locales a `src/components/lab/`.

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
  misma unidad, otra precisión. (Resuelto en B4 para los Temas 1 y 6 y la perturbación del 8;
  sigue la maniobra del 8, con 1 decimal.)
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
  segundos de reproducción frente a horas de órbita (resuelto en B4.4: el transporte lee horas
  de órbita en la perturbación); "un día en 12 s" ≈ 14 s el día de la
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

## Fase B cerrada (10 y 11 de noviembre de 2026)

Rama `fase-b`, de `6dc690b` a `c26520a`: 212 commits, 329 archivos, +21 981 / −3 978 líneas
(`git diff --shortstat`), del 10 de noviembre a las 08:29 al 11 de noviembre a las 00:06 (UTC−6;
`c26520a` es el último commit de contenido). Cierra B2 (notación sin fuente de reserva), B3
(cascarón por niveles) y B4 (legibilidad a velocidad real) sobre B1a y B1b, que ya están arriba
(R49, R50). Dylan levantó el alto de la fase B el 10 de noviembre: B2, B3, B4, la integración, C
y D, sin detenerse (libro de la fase, cabecera). Ningún commit lleva línea de coautor ni de
atribución (`git log --format=%B 6dc690b..HEAD | grep -ci 'co-authored\|claude-session'` da 0).

- **Sin empujar.** `origin/fase-b` y `origin/main` están en `6dc690b` (referencias remotas
  locales, sin `fetch`; ese commit ya incluía B1a, B1b y el plan) y la `main` local sigue en
  `c9a773d`. La integración (`git push origin fase-b:main`, avance rápido) espera la puerta
  completa del controlador sobre `c26520a` y el CI en verde (FB-R26).
- **Puerta del controlador sobre `c26520a` (2026-11-11, antes de integrar):** `pnpm run check` sin errores,
  avisos ni sugerencias; 193 archivos y 2 646 pruebas unitarias en verde; cobertura 98,98 % de sentencias y
  94,64 % de ramas; `pnpm run build` con 11 páginas; e2e 756 pasan (7,7 min, `--workers=2`, puerto 4322).
  El commit `69c35e9` que añadió esta sección solo toca documentación.
- **Puerta del implementador sobre `c26520a`** (`task-B4.3-report.md`, ronda final 2):
  `pnpm run check` sin errores, avisos ni sugerencias; 2 646 pruebas unitarias en 193 archivos;
  cobertura 98,98 % de sentencias y 94,64 % de ramas; `pnpm run build` en verde; e2e 756 pasan,
  0 fallan, 0 inestables (7,7 min, `--workers=2`, puerto 4322). Antes (puerta de B1 sobre
  `0fa68f0`): 1 961 pruebas en 154 archivos, 98,74 %, 485 e2e. La corrida del controlador sobre el
  mismo commit se anota al cerrar; no existía cuando se escribió esto.
- **Dónde está el detalle.** Libro de decisiones (`progress.md`), briefs, 15 informes de
  implementación (`task-*-report.md`; B4.4 va dentro del de B4.3) y 21 de revisión (`review-*-report.md`), en
  `.superpowers/sdd/2026-10-31-fases-b-c-d/` (no está en git, como el del Avance 2). Las cifras de
  abajo llevan entre paréntesis el informe de donde salen. El plan es
  `docs/superpowers/plans/2026-10-31-fases-b-c-d.md`.
- **Ramas de trabajo.** Quedan las ramas `fase-b-b32-{a,b,c}` y `fase-b-b42-{a,b,c}` con sus
  worktrees en el directorio temporal de la sesión; todo está integrado en `fase-b` (por
  `cherry-pick`, así que los hashes difieren). Borrarlos al integrar. No hay etiquetas
  (`git tag -l` vacío): `avance-1` y `avance-2` siguen pendientes (4 y 5).

### 1. Qué entregó la fase B

| Etapa | Qué entregó | Cifras antes → después (informe) |
|---|---|---|
| **B1a, B1b** | Reloj fuera de React y Tema 1 sin Recharts. | Ya registradas: R49, R50 y la puerta de B1 arriba. |
| **B2 · notación sin fuente de reserva** | `MathText` (texto en SVG con subíndices, potencias y flecha dibujada) e `InlineMath` (KaTeX en HTML con `$…$`); la cobertura de Plex se deriva de los archivos de las fuentes; los nueve temas migrados; guardia e2e de glifos. | Nodos de texto fuera de Plex a 1 280 px: T1 12 → 0, T2 14 → 0, T3 6 → 0 (B2.2a); T4 9 → 0, T5 30 → 2, T6 2 → 0 (B2.2b); T7 36 → 0, T8 11 → 0 (B2.2c); T9 26 → 0 (B2.1). Los 2 de T5 eran las fichas de `Presets`, ya tipografiadas en B2.3. La guardia halló además Liberation Serif dibujando ω y π en el hábitat del T3 y Times en ω θ τ α del diagrama del T8, que el contador por familia no veía (B2.2c, B2.3). U+202F se conserva en `formatNumber` (medido en Chromium; B2.1 §4). |
| **B2 · Tema 1 sin KaTeX descargado** | `TexSeed`: el servidor siembra el HTML de las 12 fórmulas del laboratorio y de su nota. | Fragmento `texHtml`: 1 petición de 77 368 B → 0; total transferido 468 969 → 393 400 B; CLS a 1 280 px 0,0781 → 0,0001–0,0003 (B2.3 §2). A 360 px el CLS era bimodal (0,02 o 0,12) con y sin el cambio: lo causaba el mapa, que crecía 27 px (lo cerró B3.2a). |
| **B3 · cascarón por niveles** | `LabShell` con tres niveles (parámetros, escenario, pantalla), lienzo y reproducción a la izquierda y panel a la derecha desde ~1 145 px; los nueve laboratorios migrados; esqueletos y alto reservado contra el CLS; `Cómo se usa` y `Qué deja fuera` como desplegables. | Primer control físico a 1 280×800: T1–T3 852–1 174 → 150 px (B3.2a); T4–T6 1 225, 1 091 y 1 690 → 150 (B3.2b, en el orden del informe); T7 994 → 150; T8 1 607 → 150 y perturbación 1 810 → 182 (B3.2c); T9 1 198 → 151, laboratorio de 1 837 → 1 409 px a 1 280 y 3 045 → 2 484 a 360 (B3.1). CLS a 360 px: T4–T6 0,15–0,20 → ≤ 0,003 (B3.2b); T1 0,09–0,16 → 0,003–0,018; T3 0,17–0,22 → 0,0011; T2 sin cambio, crece 40–44 px al hidratar (B3.2a); T7 0,196 → 0,003; T8 0,16–0,20 → 0,001 (B3.2c). A 1 280 px el escenario se pega mientras cabe en T1, T2, T3 y T7; en T4, T5, T6, T8 y T9 mide más que la ventana y fluye (B3 visual, ronda 2). Primer control a 360 px tras FB-R16/FB-R17: T6 1 887 → 1 387, T9 1 620 → 1 052, T5 1 204 → 946, T3 1 073 → 720, T7 1 091 → 575. Puerta de B3 sobre `0eec5c8`: 2 384 pruebas, 98,84 %, e2e 702 (B3.3, ronda 4). |
| **B4 · legibilidad a velocidad real** | Marcas de evento y botones «Evento anterior» / «Evento siguiente» en la reproducción; insignia de escala de tiempo en el lienzo; T1 y T6 abren en «Tramo» a ×1 (antes ×20 la ruta y el ciclo enteros); T9 con el factor junto a la sonda y «Ir a la máxima aproximación»; T8 con el factor por modo y la reproducción en horas de órbita. | T1: «Tramo» ×1 y «Ruta» ×4, con 4 y 5 marcas. T6: «Tramo» ×1 (la frenada de 224,0 kJ de la figura 6.3) y «Ciclo» ×20, con 17 detenciones. T8: ×1 (maniobra), ×7 200 (llenado), ×1 700 (magnetopar) y ×2,5 (propulsor). T9: ×19 000 en el encuentro con Júpiter y entre ×1 400 y ×19 000 en los seis (B4.2c, revisión). La reproducción con eventos mide dos filas: +59 px a 1 280 y 140 px en vez de 106 a ≤ 390 px (B4.1, B4.3). Escenarios a 1 280: T6 1 176 → 1 351 px en «Tramo» (1 330 en «Ciclo»), T9 912 → 1 022; T1 sigue cabiendo y pegado (598 px; también a 1 366×768 y 1 280×720, B4.2b). Puerta final: 2 646 pruebas, 98,98 %, e2e 756. |

### 2. Decisiones del controlador de este plan

Las `Ruling R1` a `R26` del libro de la fase se nombran aquí **FB-R1 … FB-R26** para no chocar
con R1–R50 de este traspaso. Cuando el libro no anotó el costo, la celda lo dice.

| N.º | Decisión | Por qué | Costo si estuviera equivocada |
|---|---|---|---|
| FB-R1 | El trabajo de archivos disjuntos por tema corre como implementadores en paralelo, cada uno en su worktree; los archivos compartidos (`lab/`, `charts/`, `ui/`, `styles/`, e2e compartidas) los toca una tarea a la vez. | El plan y el traspaso lo piden y mandan sobre el valor por omisión de la habilidad. | Un conflicto de fusión a mano. |
| FB-R2 | Cuerpo de lectura y raíz a 16 px en C1 (Dylan, 10 de noviembre: «usa 16px»), no los 17 px del plan. | Decisión del usuario. | Un token. |
| FB-R3 | Desde B2, toda longitud nueva usa la escala 4/8 (4 8 12 16 24 32 48 64; radios 4 y 8; bordes 1 y 2). | C encuentra menos que arreglar. | Ninguno. |
| FB-R4 | La guardia de glifos (`glyphs.spec.ts`) se crea tras las tres sustituciones de tema. | No puede estar en verde antes. | Una prueba en rojo tardía. |
| FB-R5 | Los commits no llevan `Co-Authored-By` ni `Claude-Session`: el CLAUDE.md del repo manda sobre el aviso del arnés. | Regla del proyecto. | Añadir las líneas con rebase. |
| FB-R6 | Cada subagente recibe modelo y esfuerzo explícitos según la tabla que Dylan aprobó (Opus alto para compartido, física y diseño; Sonnet alto para aplicar un patrón; xhigh para el cascarón de B3 y el modo «Conducir» de D3). | Acordado el 10 de noviembre. | Reenviar a un nivel mayor. |
| FB-R7 | Los menores 1 a 5 de la revisión de B2.1 (y los baratos del 6) se corrigen antes de B2.2. | Tres agentes copian ese patrón y el menor 1 deshacía el trabajo de B1a. | Una re-revisión acotada más. |
| FB-R8 | Los dos Importantes de la revisión de B2.2 (hábitat en Times, `L_máx` crudo en T8) se enrutan al implementador de B2.3, no a los tres agentes terminados. | B2.3 editaba esos archivos y era dueño de la guardia que debía cazarlos. | B2.3 crece. |
| FB-R9 | La puerta de integración de B2 no se corre aparte. | La última ronda de B2.3 ya pasó las cuatro órdenes (534 e2e) y la completa se repite antes del push. | Una regresión aparece una etapa después. |
| FB-R10 | Dos columnas exigen `lg` **y** el contenedor de 42 rem (Importante de B3.1). | Entre ~754 y 1 023 px y con zoom 200 % el marco de la figura conservaba `overflow: auto` y el panel quedaba vacío. | Las dos columnas empiezan en ~1 180 px de ventana, no en ~754; una clase que relajar. |
| FB-R11 | El laboratorio por niveles toma el ancho de la figura sin el relleno del marco y, en T9, la leyenda, la nota de velocidad y la tabla pasan bajo la rejilla; ensanchar el laboratorio más que el artículo queda para Dylan o C. | Cambio de maqueta del sitio. | Dylan puede querer una página más ancha (abierta 1 y 2, abajo). |
| FB-R12 | `MIGRATED_LABS` explícita en `lab-shell.spec.ts`: un laboratorio listado que vuelve a apilarse falla; los no listados se saltan por nombre. | Las 24 pruebas por niveles se saltaban por una condición de ejecución y un laboratorio podía desactivarse sin avisar. | No registrado en el libro. |
| FB-R13 | La revisión de B3.2 se parte en tres revisores por grupo, en paralelo con el cierre compartido B3.3; los Importantes van al agente de B3.3. | Igual que FB-R8. | B3.3 crece. |
| FB-R14 | La fuente de los preajustes del Tema 6 enlaza la página pública de la EPA, no el `.xlsx` (un enlace al archivo, a lo sumo como segundo enlace «datos (.xlsx)» con aviso de descarga). | Un enlace que descarga un archivo no es una fuente citable. | Una URL. |
| FB-R15 | La reserva de alto en relación compacta pasa a una opción de `SvgPlot`, con umbral en px derivado de `COMPACT_WIDTH`. | Retira las copias duplicadas (`PLOT_BOX`, `PLOT_ASPECT_RATIO`, `mapReserve`). | `SvgPlot` gana una prop. |
| FB-R16 | El panel fluye con la página y solo el escenario se pega, y solo si cabe; fuera el panel con scroll interno, su región y su sombra. | Las Lecturas quedaban escondidas en el scroll interno a 1 280×800 (Importante de la pasada visual). | Las Lecturas quedan lejos en paneles largos hasta desplazar; revertir es devolver dos clases. |
| FB-R17 | Orden del DOM = lectura = visual: escenario → panel → `canvasNotes` → desplegables. | En una columna las notas del lienzo quedaban entre el dibujo y el primer control (a 1 887 px en T6). | En el móvil la leyenda ya no está junto al dibujo (abierta 3). |
| FB-R18 | `LabPresets` no encoge nunca su línea de nota (copia invisible con `aria-hidden` que reserva el alto) y la nota «Partí de «…» y cambié algún valor.» del Tema 7 pasa a ser común (`basedOnId`). | El escenario saltaba bajo el puntero al editar un preajuste (T2) y las Lecturas subían 51–141 px. | Texto nuevo en siete laboratorios para Dylan; una reserva en blanco si un laboratorio no tiene `basedOn`. |
| FB-R19 | A ~900 px cada nivel del panel pasa entero a una columna (`break-inside-avoid`); se acepta el desequilibrio residual. | Columnas CSS sin más separaban «Valores de referencia» de su selector en siete temas. | Un hueco bajo la columna más corta (18–378 px; el mayor, T7). |
| FB-R20 | La suposición del pulgar nativo de 16 px en las marcas se anota como deuda de C/D. | Reestilar la línea de tiempo de todos los laboratorios no cabía en B. | Marcas desalineadas hasta ±6 px en un navegador con otro pulgar. |
| FB-R21 | En «Tramo» del Tema 6, las energías y los porcentajes son los del tramo (se resta el estado en el desplazamiento); «Ciclo» no cambia. | «Tramo» mostraba acumulados del ciclo: 0,173 kWh y 26,9 % en t = 0 del tramo. | Dos definiciones de energía entre vistas, rotuladas. |
| FB-R22 | Los hallazgos de la revisión de B4.2 vuelven a cada agente de B4.2 en su worktree, no a B4.3. | Conservan el contexto de su tema y no chocan con B4.3 en el checkout principal. | No registrado; en la práctica, el choque de T6 que originó FB-R23. |
| FB-R23 | En «Tramo» del Tema 6 el único t en pantalla es el del ciclo (gana `timeOrigin` de B4.3); se conserva la corrección de energías de FB-R21. | Las dos correcciones resolvían los «dos relojes» en sentidos opuestos. | Las lecturas de T6 van en el reloj del ciclo (376–402 s) y no en 0–26 s. |
| FB-R24 | El Tema 1 adopta `timeOrigin` = inicio del tramo en la ruta: un solo t, el de la ruta; el `aria-valuetext` del dron vuelve al tiempo de ruta y los decimales son los globales. | Importante de la pasada visual de B4: la línea decía «t = 35,60 s» y la lectura y las gráficas 213,9 s. | No registrado en el libro. |
| FB-R25 | `TransportBar` y `LabShell` ganan `formatTime` (formato de la lectura, ortogonal a `timeOrigin`); el Tema 8 lo alimenta con horas de órbita en la perturbación. | La reproducción decía «t = 11,26 s» bajo una gráfica en «22,5 h» (Importante de la pasada visual). | La reproducción del T8 lee horas físicas mientras el reloj corre en segundos de reproducción (documentado). |
| FB-R26 | Empujar `fase-b` a `main` con avance rápido tras la puerta de la fase, cubierto por la instrucción de Dylan del 30 de octubre («sube el código, luego continúa con las demás fases») y el plan. | El mismo flujo dio el CI y el despliegue en verde en `6dc690b`. | Textos de Claude publicados antes de la lectura de Dylan, como tras el Avance 2; `main` solo se revierte con `push --force`, que no se hará. |

### 3. Contratos y guardias nuevas

El README ya los describe («Notación matemática», «Laboratorios por niveles», «Escala de tiempo y
eventos»); aquí solo dónde vive cada pieza. No confundir la **insignia de recurso** (una por tema,
la figura prescrita) con la **insignia de escala de tiempo** de B4.

| Pieza | Archivo | Para qué |
|---|---|---|
| `MathText` y mininotación (`v_∞,in`, `10^-7`, `vec v`) | `src/components/lab/MathText.tsx`, `src/lib/mathNotation.ts`, `mathSpeech.ts` | Texto dentro de un SVG; `mathTextToString` escribe los nombres accesibles. |
| `InlineMath` | `src/components/lab/InlineMath.tsx`, `texRenderer.ts`, `src/lib/inlineMath.ts`, `texHtml.ts` | `$…$` en HTML con KaTeX perezoso y caché; en Astro, `inlineMathToHtml`. `\$` es un dólar literal. |
| `TexSeed` | `src/components/lab/TexSeed.tsx`, `src/components/topics/dron-reparto/droneLabFormulas.ts` | El servidor siembra las fórmulas del Tema 1; una no sembrada solo vuelve a descargar KaTeX. |
| Cobertura de Plex | `scripts/font-data.ts` → `src/lib/plexCoverage.ts`, `glyphAdvances.ts`; `typography.ts` | Derivada de los archivos de las fuentes: `pnpm run data:fonts`; `fontData.test.ts` falla si se desvía. |
| Guardia de glifos | `tests/e2e/glyphs.spec.ts`, `glyphKit.ts`; `glyphGuard.spec.ts`; `plexViolations` en `src/test-glyphs.ts` | Portada y nueve temas, 1 280 y 360 px, claro y oscuro, cada preajuste y estado: solo IBM Plex y `KaTeX_*`, sin `_ ^ $` crudos. `glyphGuard.spec.ts` la hace fallar si no midió nada, si perdió un nodo de CDP o si un laboratorio se queda sin estados. |
| `LabShell` por niveles | `src/components/lab/LabShell.tsx`, `labShellParts.tsx`, `labShellTypes.ts`, `labShellClasses.ts`; variante `lab-split` en `src/styles/global.css` | `levels={{ params, scenario, display }}`, `notes={{ usage, leftOut }}`, `canvasNotes`, `markers`, `timeOrigin`, `formatTime`. Dos columnas con `lg` y 42 rem (FB-R10). |
| `LabPresets`, `StatusChips`, `LabNotes`, `ChoiceField` | `src/components/lab/{LabPresets,StatusChips,LabNotes,ChoiceField}.tsx`, `settingChips.ts` | Fichas (≤ 4) o `<select>` con `groups` y `optionLabel`; nota de una oración con «Fuente:»; «Partí de…» con reserva invisible; fichas de solo lectura; fichas de ajustes junto al engranaje. |
| `useFitsInWindow` | `src/components/hooks/useFitsInWindow.ts` | El escenario se pega solo si cabe; el servidor no pega nada. |
| Alto reservado | `src/components/lab/svgPlotReserve.ts` (`SvgPlot`), `canvasInset.ts` | `SvgPlot` reserva su alto hasta medirse; `CANVAS_INSET` alinea con el sangrado del lienzo. |
| Pruebas de hidratación | `tests/e2e/hydrationStability.ts` (`expectSameHeightAfterHydration`, `holdMeasuring`), `waitForIsland` y `seekTimeline` en `tests/e2e/helpers.ts` | Servidor frente a hidratado a 360, 540 y 1 280 px; `waitForIsland` espera a que React reclame la isla; `seekTimeline` reenvía el `seek` hasta que cambie el `aria-valuetext`. |
| `MIGRATED_LABS` | `tests/e2e/lab-shell.spec.ts` | Los nueve laboratorios; un listado que se apila falla; una prueba por página exige que esté listado el que dibuja. |
| Piezas de tiempo | `src/components/lab/TransportBar.tsx`, `TransportEvents.tsx`, `transportMarkers.ts`, `transportReading.ts`, `transportTime.ts` | `markers` (`{ t, label, kind? }`), `timeOrigin`, `formatTime` y botones de evento. |
| Escala de tiempo | `src/components/lab/TimeScaleBadge.tsx` (HTML, `TimeScaleBadgeSvg`, `TimeScaleStatus`), `timeScaleFormat.ts`; `SimClock.rate` en `useSimClock.ts` | «×20 cámara rápida»; `rate` = segundos simulados por segundo real (con movimiento reducido, el paso que se ve). |
| Página de prueba fuera del sitio | `tests/e2e/fixtureSite.ts`, `tests/e2e/fixtures/lab-time/`, `tests/e2e/time-scale.spec.ts` | Ejercita marcas, insignia y anuncios sin tocar `build/site`, `MIGRATED_LABS`, `TOPIC_PAGES` ni la guardia de glifos. |
| Piezas por tema de B4 | T1 `routeSchedule` (`src/lib/data/droneRoute.ts`), `routeView.ts`; T6 `regenStretch.ts`, `CycleMinimap.tsx`; T9 `flybyScaleBadge.ts`, `PeriapsisJump.tsx`; T8 `useWheelTimeScale.ts` | Vistas, tramo, minimapa, insignia y salto a la máxima aproximación. |
| Rendimiento (B1) | `tests/e2e/lab-performance.spec.ts`, `pnpm run measure:labs <url>` | Presupuesto del reloj. |

### 4. Textos nuevos o cambiados que Dylan debe revisar

Claude redacta y Dylan revisa antes de que cuenten como publicados. Consolidado de los informes;
«antes → después» es lo que se ve en pantalla. Cuando dos informes se contradicen **manda el
último** (las contradicciones resueltas están al final). Ninguna prosa de los temas cambió salvo
lo indicado; la de 650 palabras sigue bajo prueba. Detalle completo en los informes citados.

**Comunes**

- Notas de preajuste: una oración cada una (`presetNotes.test.ts`), con las mismas cifras, y la
  fuente va al final como «Fuente: …» (antes dentro de la ficha). Lo cambiado, por tema, abajo.
- **Nota común nueva (FB-R18):** tras editar un valor, «Partí de «‹nombre›» y cambié algún valor.»
  en los Temas 2, 3, 4, 5, 6, 8 y 9 (el 7 ya la usaba; es su redacción) (B3.3 ronda 3).
- «Cómo se usa» y «Qué deja fuera el modelo» son desplegables que reemplazan a la nota al pie: se
  quita «Lo que el modelo deja fuera:» y el texto empieza con mayúscula; en los Temas 4 y 5 no
  cambia una palabra (B3.1 a B3.3).
- Reproducción con eventos (T1, T6, T9): entre eventos, «Siguiente: ‹evento› · t = …»; anuncios
  «Detención 5 de 17 · t = 312 s» y «No hay evento siguiente; el último es …»; el evento lleva su
  texto entero como `title`; a 320 px un nombre largo se corta con «…» (B4.1, B4.3, B4.4).
- Insignia de escala: «×1 velocidad real», «×20 cámara rápida», «cámara lenta»; hablada: «Escala
  de tiempo: 20 veces la velocidad real, cámara rápida» (B4.1).

**Tema 1** (B3.2a, B3.3, B4.2b, B4.4)

- Fichas nuevas «vectores» y «rastro» (el cajón dice «Rastro»; el encargo decía «estela»).
- La nota al pie se reparte: «La aceleración salta de 0 a 2,5 m/s² … rampa corta.» va a «Qué deja
  fuera el modelo» y «Una ruta editada se genera en el navegador con el mismo código…» a «Cómo se
  usa».
- «Cómo se usa», final: «…con la velocidad de reproducción en 1×, «Tramo» va a velocidad real y
  «Ruta», 4 veces más rápida que el vuelo; el rótulo del mapa dice la escala que se está
  reproduciendo (con movimiento reducido, la del paso a paso).» (antes: «…la reproducción va 20
  veces más rápida que el vuelo.»).
- Nivel «Escenario» nuevo: «Vista» («Tramo», «Ruta») y «Tramo mostrado» («Del depósito a A», «De A
  a B», «De B a C», «De C al depósito»); lectura nueva «Instante en la ruta».
- Línea de «Tramo» (final): «Sale en t = 87,2 s de la ruta y dura 71,1 s.» (67,2 / 71,1 / 71,1 /
  118,0 s según el tramo; la primera versión decía 71,2 s). «Ruta»: «La ruta entera dura 387,4 s.»
- Marcas, «Tramo»: «Salida del depósito» o «Salida de A», «Fin de la aceleración», «Inicio del
  frenado», «Llegada a A» o «Llegada al depósito». «Ruta»: «Salida del depósito», «Llegada a A»,
  «Llegada a B», «Llegada a C», «Llegada al depósito».
- Fase del mapa con vectores: «acelerando ($\vec a$ en el sentido de $\vec v$)», «crucero ($\vec a
  = 0$)», «frenando ($\vec a$ opuesta a $\vec v$)» (antes sin flechas).
- Un solo t (FB-R24): la reproducción en «Tramo» pasa de «t = 35,60 s» (desde el inicio del
  tramo) a «t = 213,90 s» (tiempo de ruta); el `aria-valuetext` del dron, de «30,00 s» a «t =
  208,30 s»; descripción del mapa y gráficas, de «208,3 s» a «208,30 s» (decimales globales).

**Tema 2** (B3.2a, B3.3)

- Fichas: «referencia», «v⃗», «rastro», «caída 3,5 ×» (solo si ≠ 1), «Integrador Euler
  semi-implícito» (solo con Euler); el párrafo del integrador queda solo, en «Qué deja fuera».
- Notas de Celeste y de Super Mario Bros. a una oración: cae `VarJumpTime` en Celeste («lo que no
  modela» ya lo dice el MDX) y «Omite el tope de caída de 4 px/cuadro» en SMB. Fuentes con enlace:
  «Player.cs, Noel Berry (2018)» y «Desensamblado de SMB (doppelganger)».
- **«Cómo se usa», nuevo** (B3.3 ronda 2): «Arrastra la punta del vector de lanzamiento
  $\vec v_0$, o enfócala y muévela con las flechas: arriba y abajo cambian $v_0$ (0,5 m/s) y los
  lados, $v_x$ (0,25 m/s). El punto sobre la curva recorre el salto: arrástralo, o enfócalo y usa
  las flechas, Inicio y Fin.» Las cifras 0,5 y 0,25 m/s son nuevas en la página y salen de las
  constantes `V0_KEY_STEP` y `VX_KEY_STEP`.
- «Qué deja fuera», en el MDX: «Usa $g$ al subir y $k \cdot g$ desde el ápice, sin la prolongación
  del impulso (0,2 s) ni la media gravedad de Celeste cerca del ápice, sin…».

**Tema 3** (B3.2a, B3.3)

- Nota al pie repartida: «La reproducción va 6 veces más rápida … segundos reales.» a «Cómo se usa»;
  «Con g = 9,81 m/s² y h = 1,80 m, resuelve la cinemática y el gradiente; no calcula el efecto
  Coriolis (…) ni los distintos niveles de un tubo de 130 m.» a «Qué deja fuera».
- Toro de Stanford: «…resulta 0,93 g, y SP-413 reporta 0,95 ± 0,05 g.» (cae «y pide vivir entre 0,9
  y 1 g»; sigue en la tabla). «Límite SP-413» (final): «Solo los radios mayores de 895 m dan 1 g por
  debajo de 1 RPM; es el punto más exterior del tubo del Toro de Stanford (830 + 65 m), con 1,00 g y
  un piso a 93,7 m/s.» «Centrífuga pequeña»: fuente «caso ilustrativo del autor».
- «Cómo se usa»: «el par ($r$, RPM)»; leyenda «Sentido de giro $\omega$». Ficha nueva «vectores».
- Líneas «Fuente:» visibles también en Tierra y Luna (no declaradas por B3.2a).

**Tema 4** (B3.2b)

- La ficha de cada preajuste ya no muestra los valores («120 °C · 8 000 N») sino la fuente:
  «cálculo propio con las ecuaciones (4.2) y (4.3)» o «supuesto del modelo» (C4).
- «Cómo se usa»: «Arrastra el cursor de cada gráfica, o enfócalo y muévelo con las flechas (1 % del
  eje; con Mayús, 10 %).» (se cayó «El compuesto se elige en los ajustes del engranaje.»). El
  cursor se llama «Carga vertical F sub z» para el lector de pantalla.

**Tema 5** (B3.2b, B3.3)

- Fuentes: «cálculo propio con la ecuación (5.2)», «cálculo propio con la ecuación (5.4)» y
  «supuesto del modelo, $c$ = 0,3 del valor crítico». «Resorte ideal»: «Al fondo, 3,2 N y 12,8 mJ
  desde el reposo.» (la ecuación pasó a la fuente).
- «Cómo se usa»: «Arrastra la palanca y suéltala, o enfócala y muévela con las flechas (0,1 mm; con
  Mayús, 1 mm): con el teclado el gatillo queda apretado hasta «Soltar el gatillo». «Repetir
  retorno» vuelve a soltarlo desde el último punto.» (se cayó la frase de la amortiguación).
- **Línea bajo «Soltar el gatillo» / «Repetir retorno», nueva:** «Con el gatillo suelto no hay nada
  que soltar: apriétalo primero.» y ««Repetir retorno» se activa tras el primer retorno.»
- Ficha de la amortiguación: «Crítica, $c = 2\sqrt{k m}$» (accesible: «Amortiguación Crítica, c = 2
  raíz de (k m)»); la opción del cajón sigue en texto plano: «Crítica, c = 2 raíz(k m)».
- «Qué deja fuera el modelo» en tres párrafos, sin cambiar una palabra.

**Tema 6** (B3.2b, B3.3, B4.2a, B4.3, B4.4)

- Notas de preajuste a una oración, mismas cifras: UDDS «…y $f(v)$ activo; en el UDDS la potencia
  de frenado no pasa de 33,2 kW, así que el límite no actúa.»; US06 «…y 0,31 g; prueba bajar
  P_máx a 30 kW, donde el límite sí importa.»; batería fría «…menos corriente de carga: 10 kW es un
  escenario ilustrativo, no una medición, y lo que pasa del límite lo disipan los frenos de
  fricción.»; LEAF «…(en el UDDS el límite no actúa); es más liviano, pero su C es mayor: …». Opción
  nativa «Batería fría o llena (Pmáx 10 kW)». El enlace de Model 3 y LEAF lleva a la página de la EPA,
  no al `.xlsx` (FB-R14).
- «Cómo se usa» y «Qué deja fuera»: $f(v)$ apaga la regeneración «cerca de detenerse; sin él, con
  el tope de 239 kW, la fricción no haría falta en estos ciclos»; «$\eta$ es el rendimiento de la
  rueda a la batería: Boretti midió del 70 al 80 % en un Leaf 2012 y del 72 al 87 % en uno 2013»;
  el MDX abre ahora con «Pendiente, viento, temperatura y estado de carga de la batería (…)».
- `usage` del MDX (final, B4.4): «Con la velocidad de reproducción en 1× y sin movimiento reducido,
  «Tramo» va a velocidad real y «Ciclo» recorre el ciclo entero en cámara rápida; con movimiento
  reducido, las dos avanzan a saltos. En las dos, la lectura t cuenta desde el inicio del ciclo, y
  la insignia sobre el dibujo dice la escala que se está reproduciendo.» (antes: «La reproducción
  va 20 veces más rápida que el ciclo real: los 1 369 s del UDDS duran 68,5 s a 1×; la lectura t va
  en segundos reales.»).
- **Vista «Tramo» / «Ciclo», nuevo:** selector «Vista» en los ajustes con «Tramo: una frenada» y
  «Ciclo completo»; su ficha dice «Tramo» o «Ciclo» (el MDX también llama «Ciclo» a la vista que
  los ajustes llaman «Ciclo completo»). Consejo (final): «La vista se elige en los ajustes. «Tramo»
  es la frenada del ciclo que más energía quita en las ruedas, con 5 s antes y después (en el UDDS,
  la de la figura 6.3); el mapa de arriba la sitúa en el ciclo, y sus energías y el porcentaje
  recuperado son los del tramo. «Evento anterior» y «Evento siguiente» saltan entre las
  detenciones.» Cursor: «…(1 % del ciclo; con Mayús, 10 %); en «Tramo» no sale del tramo.»
- Lienzo: «Velocidad del UDDS», «Tramo 376–402 s» (minimapa; nombre hablado «Velocidad en el ciclo
  UDDS: 1 369 s y 17 detenciones; el tramo va de 376 a 402 s.»), banda «Tramo», «236 m · auto no a
  escala»; la línea del auto pierde «· UDDS»; marcas «Detención 3 de 17» (HWFET: «Detención»).
- Lecturas en «Tramo» (nuevas): «Energía a la batería en el tramo $E_\text{batería}$», «Pérdidas de
  conversión en el tramo», «Calor de fricción en el tramo» (kJ), «Recuperado en el tramo, % del
  frenado en las ruedas» (75,0 %; en «Ciclo»: «Recuperado en el ciclo, % de la tracción»); barras
  «Energías acumuladas en el tramo, hasta t (escala de 0 a 250 kJ)». El tiempo es el del ciclo:
  «t = 389,00 s» (FB-R23).

**Tema 7** (B3.2c, B3.3)

- Seis notas de pelotas (ITF, FIBA, FIFA, superbola, béisbol, plastilina), final: «…, y uso X con
  $h_0$ = Y m en el motor con los valores por defecto de Box2D.» Otras notas a una oración: «Realista
  mejorado», «e = 1 sin umbral», «Umbral alto (Unity)» (una sola oración larga que conserva «tras 8
  botes, el último de 18,5 cm, la pelota se para en seco») y «Choque de reglas de combinación».
- El selector «Preajuste» pasa a «Valores de referencia»; «Personalizado» solo aparece tras
  editar; ficha «Motor» con «suelo $e$ = 0,00»; **«Modo»** gana etiqueta visible y sus opciones
  pasan de botones a radios.

**Tema 8** (B3.2c, B3.3, B4.2c, B4.3, B4.4)

- «Tres días de perturbación» (antes «…con descarga»; la ficha se salía 12 px del panel a 360 px).
  Notas de preajuste a una oración: «90° en 60 s» (final: «…; a los 30 s la nave gira a 3,0 °/s y la
  rueda va a −970 rpm, el 19 % de L_máx, y al final vuelve a 0 rpm tras 485 vueltas.»), «El giro más
  rápido (≈ 12 s)» y la de los tres días (resumida en una oración).
- `usage` (nuevo en «Cómo se usa»): «La maniobra corre en tiempo real. La perturbación va a cámara
  rápida: a 1×, 2 h de órbita por segundo, un día en 12 s; cada descarga … se estira a 2 s de
  pantalla.» «Qué deja fuera»: «Resuelve un solo eje; …».
- Frase de la perturbación (final): «La perturbación va a cámara rápida y el dibujo dice el
  factor. A 1×, 2 h de órbita por segundo (un día en 12 s)… Cada descarga se estira a 2 s de
  pantalla a 1× para que se vea; la reproducción y la lectura «Tiempo en órbita» cuentan horas de
  órbita.» (antes: «…la línea de tiempo cuenta segundos de reproducción y la lectura «Tiempo en
  órbita», horas de órbita.»).
- Insignias «×1 velocidad real», «×7 200 cámara rápida», «×1 700 cámara rápida», «×2,5 cámara
  rápida»; la descripción del dibujo añade «Escala de tiempo: …». En la perturbación la
  reproducción y el cursor de la gráfica leen horas de órbita: «t = 31,52 h» (antes «t = 11,26 s» y
  «t = 31,5 h»).

**Tema 9** (B3.1, B4.2c, B4.3)

- Nota de preajuste: «Máxima aproximación a {km} del centro ({r} R), por {lado}.»; fuera del plano:
  «…; el giro sale del plano y el modelo usa el lado más cercano, {lado}.» Llegada: «Llegada:
  $V_p$ = …, $v_\infty$ = …, $\theta_\text{in}$ = ….» Frase nueva en «Cómo se usa»: «Un preajuste
  fija la llegada: …; $r_p$ y el lado son tuyos.» «Qué deja fuera»: «Es plano, y los giros
  reales…». Fuente: «JPL Horizons, 1979-07-09 22:29 UT».
- Nuevo: botón «Ir a la máxima aproximación»; su anuncio «Máxima aproximación: la sonda pasa a
  10,09 radios de Júpiter, con 20,23 km/s respecto al planeta.» (solo tras pulsarlo); evento
  «Máxima aproximación»; insignia «×19 000 cámara rápida».
- Nota de cámara rápida (final): «Cámara rápida: el paso dibujado dura 2,688 d y a 1× y sin
  movimiento reducido se ve en 12 s, unas 19 000 veces más rápido; el factor en curso está sobre
  el dibujo.»

**Contradicciones entre informes, resueltas con el último.** SP-413 del Tema 3 (B3.2a →
B3.3); «90° en 60 s» del Tema 8, que B3.2c recortó y B3.3 restituyó; las notas de pelotas del
Tema 7 (B3.2c quitó «Box2D», B3.3 lo devolvió); «cerca del ápice» del Tema 2 (B3.2a lo quitó,
B3.3 lo devolvió); `usage` del Tema 6 (B4.2a → B4.2a ronda 1, que lo eliminó → B4.3 → B4.4); el
consejo de la vista y el del cursor del Tema 6 (B4.2a, ronda 0 → ronda 1 → recorte de la fusión,
FB-R23); la ficha «Ciclo completo» (B4.2a) → «Ciclo» (B4.4); «Cómo se usa» y la línea de «Tramo»
del Tema 1 (B4.2b, ronda 0 → ronda 1); la frase de la perturbación del Tema 8 (B4.2c, ronda 0 →
ronda 1 → B4.4).

### 5. Decisiones abiertas de Dylan

Lista única, sin duplicados. «Recomendada» es la de los informes de origen; donde ninguno la da y
añado criterio propio, lo marco (mía). Ninguna se tocó: están a la espera de Dylan.

**Maqueta del laboratorio**

1. **Ancho de la columna del lienzo y laboratorio más ancho que el artículo.** A 1 280 px el
   escenario mide ~432 px (el laboratorio queda en 797 px desde 1 280: ancho del artículo menos la
   navegación): la escena del auto del T6 mide 432×170 con rótulos de ~11 px y el gatillo del T5
   432×184 (B3.1, B3.3). Recomendada (mía): ensanchar el laboratorio en C y dejar que D1 (zoom)
   cubra las escenas chicas.
2. **Marcos del Tema 9 lado a lado a 1 280.** Hoy el marco del Sol queda bajo la reproducción
   pegada en la primera pantalla (cubre 140 px a 1 280×800 y 40 a 1 440×900; B3.1); lado a lado el
   escenario cabría y se pegaría. Depende de 1; recomendada: decidir juntas.
3. **Leyendas en móvil.** Van después del panel (FB-R17): a ~1 900 px del dibujo en T6, ~1 200 en
   T9 y ~1 100 en T3 (B3.3). Recomendada (mía): dejarlas, porque orden del DOM, foco y vista
   coinciden; si molesta, juntar al dibujo solo las cortas.
4. **Lecturas sobre Escenario.** Hoy el panel va parámetros → escenario → lecturas. Recomendada
   (mía): dejarlo hasta resolver 1 y 5.
5. **Escenarios altos que no se pegan (T4, T5, T6, T8, T9) y sus alturas.** A 1 280×800 miden más
   que la ventana: T8 1 017 px, T6 1 351, T9 1 022; a T5 le sobran solo 72 px (B3.3, B4 visual).
   Recomendada (B3.3): bajar la gráfica F–x del T5 y sacar $L_w(t)$ del escenario del T8; T4, T6 y
   T9 dependen de 1.
6. **Panel del Tema 2 que desborda.** A 1 280×800 es más alto que la ventana por la nota de
   Celeste (seis líneas; B3.2a); desde FB-R16 fluye con la página, sin scroll interno.
   Recomendada (mía): acortar esa nota (es texto de Dylan).
7. **«Fuente:» visible en Tierra y Luna (T3).** Aparece como en el resto de las fichas; B3.2a no
   lo había declarado. Recomendada (mía): dejarla.
8. **Tema 1 sin nivel «Escenario»:** cerrada por B4.2b, que lo agregó («Vista», «Tramo mostrado»).
9. **Fichas de la cabecera que parecen insignias** y notas de preajuste largas (B3 visual, m4 y
   M). Recomendada (mía): fichas en C (radios y bordes); las notas, al leerlas Dylan.

**Notación y fuentes**

10. **Letras griegas sueltas en Plex Sans junto a KaTeX cursiva.** θ ω δ Δ π ε β μ λ en prosa y
    rótulos HTML (lista por tema en `task-B2.3-report.md`); en SVG el griego sale en cursiva KaTeX
    y las latinas rectas de Plex, así que un dibujo mezcla ω vertical (lecturas) y ω cursiva
    (rótulos) (B2.2c, B2.3). Sin recomendación en los informes.
11. **`<option>` nativo del Tema 5 («Crítica, c = 2 raíz(k m)») y «De Depósito a A» (Tabla 1.1).**
    Un `<option>` no admite KaTeX; la fórmula está en la nota y en la ficha. Recomendada (B2.3):
    dejarlos (límite de la plataforma; «De Depósito a A» es prosa válida).
12. **U+202F medido solo en Chromium.** Safari/CoreText y Windows sin medir (B2.1 §4).
    Recomendada: mirar una vez en Safari y Windows antes de entregar; si se ve una caja, sustituir
    en `formatNumber` por un `<span class="thin">`.
13. **Pulgar nativo de 16 px de las marcas (deuda, FB-R20).** Recomendada: fijarlo con CSS propio al
    reestilar la línea de tiempo en C.

**Tiempo y vistas**

14. **Movimiento reducido pone «Tramo» a ×4,5 (T1) y ×1,7 (T6)**, más rápido que real (la corrida
    en 15 s por pasos). La insignia lo dice. Recomendada (mía): dejarlo, es veraz.
15. **Estilo único de insignia:** píldora HTML en T1/T6 y texto SVG en T8/T9. Recomendada (mía): D4;
    B4.4 deja a T8 en condiciones de adoptar la HTML.
16. **«Ir a la máxima aproximación» frente a «Evento siguiente» (T9).** Desde antes de $t_p$ hacen
    lo mismo; el botón suma ~51 px y el escenario crece 110,5 px (B4.2c). Opciones: dejarlo (nombra
    el evento y dice distancia y rapidez) o quitarlo.
17. **Ampliar la gráfica del T6 al tramo** (barras en kJ del tramo frente a gráfica en kWh del
    ciclo; B4 visual m5). Recomendada (B4.4): ampliarla.
18. **Lugar de la vista:** panel en T1, cajón de ajustes en T6, donde «Escenario» rompía el
    equilibrio de columnas a 900 y 960 px (342,7 frente a 337,2; B4.2a). Recomendada (mía): dejar T6
    en el cajón mientras ese equilibrio no se pueda mantener.
19. **T6 «Tramo» abre con las barras a cero** (es t = 0 del tramo; B4.2a quitó la apertura en
    116 s). Sin recomendación en los informes.
20. **Notación «1×» (ficha) frente a «×19 000» (insignia).** Convención compartida de B4.1: signo
    primero, dos cifras significativas. Recomendada (mía): dejarla.
21. **El porcentaje recuperado en «Tramo» es sobre el frenado en las ruedas** (75,0 %; sobre la
    tracción daría 678 %). Lo confirmó el controlador y la etiqueta lo dice. Recomendada: dejarlo.
22. **Marcas del T1 a ≤ 0,1 s del instante exacto** (67,30 frente a 67,2 s de la Tabla 1.1; «Fin de
    la aceleración» a 4,10 s frente a 4 s) y «Instante en la ruta» 387,50 s frente a «Duración de
    la ruta» 387,43 s (B4.2b, B4.3). Cada marca lee un estado exacto (reposo en una llegada).
    Recomendada (B4.3): una línea en «Qué deja fuera el modelo»; evaluar el vuelo en forma
    analítica rompería «los perfiles leen como el laboratorio».
23. **Realce del tramo en las gráficas del T1:** solo el mapa lo marca (trazo doble de 4 px). La
    banda gris se confundía con las entregas y se retiró (B4.4, m8). Recomendada (B4.3): una banda
    de otro estilo (borde o acento) en `SvgPlot`.
24. **Pie de figura del T6 desfasado en la vista por omisión.** Dos frases hablan del ciclo
    entero: «…el auto recorre el ciclo y el flujo de potencia une batería, motor, ruedas y
    frenos…» y «…con la batería fría o llena, a 10 kW, solo llegan 0,448 kWh en el UDDS» (cifra
    de «Ciclo completo»). Decide Dylan (B4.2a).
25. **HWFET y US06 en «Tramo»** incluyen otras frenadas en ±5 s (449,6 y 762,4 kJ) y el MDX no da
    cifra para ellas (B4.2-r1). Recomendada (mía): aceptarlo.
26. **La fuente `.xlsx` de la EPA ya no es el enlace principal** (FB-R14). Recomendada: dejarlo; a
    lo sumo un segundo enlace «datos (.xlsx)».

**Heredados del traspaso (siguen abiertos):** los textos de lectura de los Temas 1 a 9 (pendientes
1 y 2, más el punto 4 de esta sección); la voz de las líneas de fuente de las figuras (7); f(v) del
Tema 6 a rapidez media o final (9); `LS_EXPY` del Tema 4 (9); la frase de conexión del Tema 3 (2);
las etiquetas `avance-1` y `avance-2` (4 y 5); los datos de Argonne (3); la retroalimentación del
docente (6); y la entrega del Avance 2 en Moodle (4). Pendiente de verificar: que los avisos de
hidratación de los Temas 7 y 9 desaparecieron en el servidor de desarrollo de Dylan.

### 6. Deudas y notas para las fases C y D

- **Raíz y cuerpo a 16 px (FB-R2).** `src/styles/global.css` sigue con `font-size: 106,25 %` (17
  px). Todo lo medido en B se midió a raíz 17: los pasos en rem del esqueleto del Tema 1
  (`DroneSkeleton.tsx`; su e2e corre también a raíz 16 px, y el esqueleto y el laboratorio cambian
  de alto en el mismo ancho: 394 px a raíz 16 y 417 o 418 a raíz 17; B3.3 ronda 3, B4.2b),
  `--lab-transport-room` y `--lab-transport-room-events` (alto de la reproducción; `global.css` es
  la fuente y una e2e vigila la deriva con `TRANSPORT` de `LabShell.tsx` a 1 px),
  `--topic-bar-height` (3 rem) y `--topic-bar-clearance`, que usan `top` y `scroll-padding`, el
  umbral de 479,5 px de `SvgPlot` (30 rem eran 510 px) y, en el informe inicial de B4.2b, una banda
  de ~5 px donde el esqueleto de la reproducción es una línea más alto (19,55 rem a 17 px, 19,25 a
  16). Revisar cada uno con 16 px.
- **Escala de texto.** El laboratorio usa 14,875 / 12,75 / 11 px a raíz 17 (B3 visual); el plan
  fija 14 y 12 como texto auxiliar. Re-mirar a 16 px.
- **Reproducción con eventos a ≤ 390 px: 140 px.** La fila 2 necesita ~342 px y hay ~290; el alto
  se mantiene fijo mientras t avanza (B4.1, B4.3). Bajar a ~106 px pide acortar nombres o dejar
  que el alto cambie al reproducir. A 320 px «Siguiente: …» se corta con «…» (el `title` y el
  anuncio llevan el texto entero). La cabecera del T6 a 360 px tiene 3 filas; 2 pide tocar la
  cabecera compartida.
- **`SvgPlot` y el tope de 400 px.** Las escenas del T7 y del T8 se topan a 400 px (gráfica a
  440), centradas (B3.2c). Las figuras fuera de los laboratorios conservan seis copias de
  `usePlotAspect`/`useFigureAspect`; pasarlas a `aspectRatio={{ compact, wide }}` movería su
  umbral 34 px (B3.3, D3).
- **`--radius` de 3 px** y varias medidas fuera de escala (el esqueleto del Tema 1 conserva alturas
  medidas, nombradas y comentadas; el hábitat del T3 a 20/24 u por el mínimo de 9 px en subíndices;
  B3.1 menor 6, B3.3 D6 y D7) son de C.
- **Pulgar nativo de las marcas** (FB-R20): fijar el pulgar con `::-webkit-slider-thumb` y
  `::-moz-range-thumb` y una sola constante, y que las marcas la usen (también hay un `forced-colors`
  cubierto por e2e).
- **Banda del tramo en `SvgPlot` (m8):** un estilo de banda distinto del de las entregas.
- **Lo que D1 (zoom) tocará.** `useZoomPan` y `ScaleBar` aún no existen; D1 los crea (plan, D1) y
  empieza por el mapa del T1 y el marco del planeta del T9. Tocará el lienzo de cada laboratorio,
  `SvgPlot` (reserva de alto, cursor), `canvasNotes` (la escala) y, para la insignia, la caja
  `relative` de la escena (`TimeScaleBadge`). Los textos de D1 deben usar la escala 4/8.
- **Limpieza:** borrar los worktrees y las ramas `fase-b-b32-*` y `fase-b-b42-*` (hashes distintos
  por `cherry-pick`); el `stash@{0}` de `v2` sigue ahí.
- **Cómo correr la verificación.** Puerta completa, desde la raíz del repo:
  ```
  pnpm run check && pnpm run test:cov && pnpm run build && E2E_PORT=4322 pnpm run e2e
  ```
  Bajo carga, `--workers=2`. Previews de prueba (`astro preview`) en 4324–4329, e2e de worktrees
  en 4336–4338; nunca el 4321 (servidor de Dylan). `pnpm run measure:labs <url>` imprime las
  mutaciones y el tiempo de script por cuadro. Si `test:cov` falla una prueba, correrlo sin filtrar
  para ver su nombre: B3.3 vio un fallo único (2 351 de 2 352) que no se reprodujo en 12 corridas
  limpias; las candidatas (diseños extra de `SvgPlot` en jsdom, una dependencia de orden entre
  pruebas y una carrera en las de `DroneLab`) se corrigieron en la ronda 1, sin confirmar cuál era.

### 7. Correcciones al texto anterior

Lo que dejó de ser cierto con la fase B y se cambió arriba, en el lugar donde estaba:

- **Estado, «Publicado»:** `origin/main` ya no es `c9a773d` sino `6dc690b` (suma B1a, B1b y el
  plan); la `main` local sigue en `c9a773d`. Se añadió una línea con la fase B en «Estado».
- **Pendiente 9:** «raíz 16 px y cuerpo de 17 o 18 px» ya está decidido (16 px, FB-R2); «notación
  de vectores en texto plano (fase B)» se hizo en B2.
- **Decisiones vigentes:** la velocidad de reproducción se indica ahora en una insignia sobre el
  lienzo; «Volver arriba» ya no es «sin cambios» (se oculta mientras un laboratorio ocupa su
  esquina); la unidad de tiempo del transporte (R35) cambió en el Tema 1 (tiempo de ruta), el 6
  (tiempo del ciclo) y el 8 (horas de órbita en la perturbación); la nota de «Cómo se usa» del
  Tema 6 ya no dice «la lectura t va en segundos reales».
- **R16:** el nombre «Tres días de perturbación con descarga» pasó a «Tres días de perturbación»
  (B3.2c). El plan y la especificación del Avance 2 aún dicen «con descarga»; no se tocaron.
- **Menores diferidos, Tema 8:** «"t" del transporte en segundos de reproducción frente a horas de
  órbita» ya está resuelto (B4.4). Y el cursor con otros decimales que el transporte: resuelto
  en los Temas 1 y 6 y en la perturbación del 8; sigue la maniobra del 8 (1 decimal).
- **«Después del Avance 2», «Estado de la fase B»:** ya no «quedan B2, B3 y B4» ni vale la parada
  antes de B2; se reemplazó por el estado actual. «Fases B, C y D»: B está hecha.
- **«Dónde está cada cosa»:** se añadieron el plan de las fases B, C y D y el libro de la fase B.
- **Laboratorios «apilados»:** ya no existen; el cascarón apilado, `Presets` y `ControlPanel` se
  retiraron en B3.3 (los nueve usan `LabShell` por niveles). El traspaso no los mencionaba; la
  prueba que los saltaba (24 a 80 pruebas) corre completa, sin saltadas.

## Después del Avance 2

- **Estado de la fase B:** cerrada en `fase-b` (B1a, B1b, B2, B3 y B4; `c26520a`); ver la
  sección «Fase B cerrada». El alto antes de B2 que pidió Dylan el 31 de octubre se levantó el 10
  de noviembre. B1 ya está en `origin/main` (`6dc690b`). Puerta de B1 sobre `0fa68f0`:
  `pnpm run check` sin errores ni avisos; 1 961 pruebas unitarias en 154 archivos; cobertura
  98,74 % de sentencias, 93,84 % de ramas, 99,19 % de funciones y 99,27 % de líneas; 11 páginas
  construidas; e2e 485 pasan y 0 fallan en el 4322 (siete nuevas de rendimiento). Quedan por
  integrar B2 a B4: `git push origin fase-b:main` (avance rápido) tras la puerta del controlador
  y el CI (FB-R26). Pendiente de verificar en el servidor de desarrollo de Dylan: que los avisos
  de hidratación de los Temas 7 y 9 desaparecieron tras el redondeo de coordenadas (Claude no
  levanta un segundo `astro dev` para no compartir la caché de Vite con el 4321).
- **Fases B, C y D de la auditoría** (`docs/superpowers/audits/2026-10-30-auditoria-integral.md`
  §10 y §12): B (hecha), rendimiento de las simulaciones (reloj fuera de React, memoización, Tema 1
  sin Recharts), notación de símbolos sin depender de la fuente de reserva, controles junto al
  lienzo en tres niveles y «legibilidad a 1×» (Temas 6 y 1); C, sistema de medidas (raíz 16 px,
  escala 4/8, radios, separadores, `Why`); D, zoom con botones en el lienzo y barra de escala,
  anillos de Saturno, modo «Conducir» del Tema 6, microinteracciones. Quedan C y D (deudas en
  «Fase B cerrada», apartado 6).

- **Entrega Final:** esperar su consigna. Cuando llegue, agregar sus temas a `TOPICS` en
  `src/consigna.ts` y un MDX completo por tema, con el mismo esquema (`Step`/`Why`/`Figure`/
  `DataTable`/`UseCase`/`Callout`/`Connections`/`Sources`), una tabla por tema en
  `src/lib/tables/topics/`, el cascarón de laboratorio por niveles (`LabShell`), la notación (`MathText`, `InlineMath`) y la
  insignia de escala de tiempo; leer el material de clase
  antes de escribir las conexiones y actualizar `tests/e2e/site-pages.spec.ts` (páginas
  esperadas y nombres retirados).
