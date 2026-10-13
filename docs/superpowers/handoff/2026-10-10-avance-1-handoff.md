# Traspaso · Avance 1 (10 de octubre de 2026)

Documento para continuar el trabajo en otra máquina. Reúne el estado del sitio, lo que falta
para cerrar el Avance 1, las decisiones vigentes que condicionan el contenido y la forma de
trabajo acordada. Reemplaza la memoria local de Claude Code de la máquina anterior, que no viaja
con el repositorio.

## Estado

- **Rama `main` = rama `v2` = commit `2d8c393`.** La v2 completa está integrada y desplegada.
- **Sitio:** https://djch18atschool.github.io/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/
- **Repositorio:** https://github.com/Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics
- **Entrega:** Avance 1 (Temas 1 a 5), fecha límite movida por el docente al sábado
  17 de octubre de 2026 a las 23:59, en Moodle, con la URL del sitio y la del repositorio.
- **Puertas en `2d8c393`:** `pnpm run check` limpio; 905 pruebas unitarias con cobertura ≈ 98 %
  (umbral 80 % en `src/lib/**` y `src/components/**`); 15 páginas construidas; 226 pruebas e2e
  con axe sin fallos; Lighthouse en portada, Tema 1 y Tema 2: rendimiento 95 a 100,
  accesibilidad 100, buenas prácticas 100.
- **Ajustes de interfaz del 13 de octubre (rama `polish/ui-adjustments`, sobre `v2`):** botón del
  repositorio, chevron de los selects, sin botón de barra lateral, fecha del último commit,
  cabecera del tema con franja de metadatos y herramientas (sin "Tema N · Avance X" ni "Estado"),
  barra lateral plana con fases futuras deshabilitadas y barra de progreso de lectura. La rama
  `wip/quitar-linea-tema-avance` quedó superada por estos cambios.
- **Tema 5 terminado el 13 de octubre (misma rama):** video de terceros incrustado con análisis
  por instante (pendiente 1), modelo del gatillo apoyado en la API de Apple, la ingeniería
  inversa de los efectos y un desmontaje, y preajuste "Resorte tardío". Revisión independiente
  aprobada con cambios, ya aplicados (commits `fd6dfbd` a `5048467`). Textos a la espera de la
  lectura de Dylan (pendiente 2).

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Especificación v1 y v2 | `docs/superpowers/specs/2026-10-08-physics-portfolio-design.md`, `docs/superpowers/specs/2026-10-09-portfolio-v2-design.md` |
| Planes v1 y v2 | `docs/superpowers/plans/2026-10-08-physics-portfolio-avance-1.md`, `docs/superpowers/plans/2026-10-09-portfolio-v2.md` |
| Fuentes verificadas y notas de la pila | `docs/superpowers/research/` |
| Consigna original del Avance 1 (PDF del docente, fuera de git) | `C:\Users\dylan\Downloads\Portafolio - Avance 1.pdf` (en WSL, `/mnt/c/Users/dylan/Downloads/`); la especificación v1 §2 la resume |
| Datos del curso, temas y fases | `src/consigna.ts` |
| Textos de los temas | `src/content/topics/*.mdx` |
| Cascarón de laboratorio | `src/components/lab/` |
| Laboratorios por tema | `src/components/topics/*/` |
| Comandos y estructura | `README.md` |

**No está en git y hay que copiar a mano desde la máquina anterior**
(`~/projects/university/2026/Q3/Physics I/portfolio/`):

- `.reference/class-material/`: material del curso extraído del portal (índice en
  `00-indice.md`). Se usa para escribir las "Conexiones con lo visto en clase". Es material
  del curso y por eso no se publica. Si no se copia, se vuelve a extraer del portal.
- `.superpowers/sdd/`: libros de decisiones (`progress.md`), briefs e informes de las dos
  corridas de *subagent-driven development* (v1 y v2), con capturas y paquetes de revisión.
  Las decisiones que siguen vigentes están resumidas más abajo; el resto es historial.

Comando sugerido en la máquina anterior, para luego descomprimir en la raíz del clon nuevo:

```
tar czf ~/portafolio-fisica-estado-local.tgz -C "$HOME/projects/university/2026/Q3/Physics I/portfolio" .reference .superpowers
```

## Pendientes de Dylan para cerrar el Avance 1

1. ~~**Video del Tema 5.**~~ Resuelto el 13 de octubre, ya no hay que grabar. La consigna pide
   para "Multimedia con análisis" "un video o audio incrustado, acompañado de un análisis escrito
   propio" y exige citar "todo contenido tomado de terceros (imágenes, datos, videos)"; a
   diferencia de la gráfica y el diagrama ("construida por usted", "hecho por usted"), no pide
   que el video sea propio. Grabarlo fue una decisión de la especificación v1, no de la
   consigna. El Tema 5 incrusta "A Game Developer Explains How PS5's DualSense Actually Works"
   (PlayStation Access, 5 de agosto de 2021, `CaPHUZapCTI`), una entrevista a Toshimasa Aoki
   (Sony Interactive Entertainment) y Mike Daly (Insomniac Games), con cuatro marcadores
   comprobados con los subtítulos y con fotogramas: 2:18 (vibración), 3:18 (motores que empujan
   el gatillo), 4:02 (media presión) y 4:15 (la tensión crece con el recorrido: el instante de
   la fuerza restauradora). Se eligió frente a dos anuncios oficiales de PlayStation (1:26 y 20 s,
   animación y escenas de juego, sin explicación) y el desmontaje de Restore Technique (sin narración; queda citado como fuente del
   mecanismo) porque es oficial, tiene capítulos y en él Sony describe la curva fuerza contra
   recorrido. Se ve tras una fachada que no carga nada de YouTube hasta que el lector pulsa
   (`youtube-nocookie.com`). **Queda para Dylan:** la rúbrica, en el nivel Bueno, habla de un
   recurso "elaborado por el estudiante"; si quiere certeza, confirmar con el docente que un
   video de terceros con análisis propio cuenta. Plan B si exigiera video propio: grabar,
   comprimir con `bash scripts/compress-video.sh media-raw/<archivo>` y recuperar del commit
   `cbad0a8` el reproductor local (`src/components/topics/control-haptico/HapticVideo.tsx`) y
   sus tipos (`VideoMarker`, `HapticVideoProps` en `src/lib/data/triggerModel.ts`).
2. **Lectura de los cinco textos.** Son de autoría de Dylan ante el profesor (el plagio se
   sanciona). El botón "Copiar Markdown" de cada tema entrega el texto completo.
3. ~~**Nombre de la escuela.**~~ Resuelto el 13 de octubre: la portada ya no nombra la escuela
   ni los datos del curso (código, sección, periodo); dice solo "Universidad CENFOTEC" y
   "Física I", y el pie igual. `COURSE.school`, `section` y `period` se quitaron de
   `src/consigna.ts` (`COURSE.code` sigue solo en la descripción de la página).
4. ~~**Línea "Tema N · Avance X".**~~ Resuelto el 13 de octubre: se quitó de la cabecera del
   tema (la barra fija de escritorio la conserva).
5. **Texto en leyendas.** Para respetar el tope de 650 palabras de prosa por tema, parámetros y
   salvedades viven en leyendas de figura (800 a 1 700 palabras por tema; el Tema 5, con el
   análisis por instante del video, es el más largo: 14 min de lectura). Opción recomendada:
   convertir los datos en tablas y recortar las leyendas. Decisión de Dylan.
6. **Etiqueta y entrega.** Con los puntos anteriores resueltos y la puerta completa en verde:
   ```
   git tag -a avance-1 -m "Avance 1: Temas 1 a 5"
   git push origin avance-1
   ```
   Luego la entrega en Moodle (URL del sitio y del repositorio). Después de la etiqueta, la
   carpeta local `.superpowers/` se puede borrar.

## Menores diferidos (opcionales, sin efecto en la entrega)

- Subíndices en ASCII en algunas etiquetas SVG de los laboratorios.
- La línea de fuente de la figura 5.5 lleva contenido que debería estar en la leyenda.
- El factor `${60 / TIME_LAPSE}` se interpola crudo en el MDX del Tema 1 (formato).
- La definición del presupuesto de 650 palabras: tokens crudos frente a palabras.
- Leyenda larga de la figura 1.3 del Tema 1 (≈ 150 palabras de parámetros).

## Decisiones vigentes que condicionan el contenido

Vienen de las revisiones de la v2 y de las indicaciones de Dylan. Rigen también para el
Avance 2 y la Entrega Final.

- **Notación de libro de texto** (Serway, Sears-Zemansky): g = 9,81 m/s² como en la consigna,
  decimales con coma en la prosa, fuerza normal `n`; `N` solo al citar la clase (en el Tema 3
  `N` son las RPM). La clase usó g = 9,8 y peso P; no se replica. Extensiones dentro del mismo
  tema son bienvenidas (dinámica circular en el hábitat); material de otros cursos, no.
- **Colores con significado real:** Tierra azul (`--chart-1`), Marte naranja (`--chart-2`),
  Luna gris (`--fg-muted`), nunca por orden de serie. Dylan revisa estos detalles.
- **Estructura por pasos:** cada tema tiene al menos 3 `Step` (modelo simple, por qué no
  basta, qué falta, modelo mejorado), cada paso con ecuación numerada y un `Why` con
  justificación verbal (`fenomeno`) y matemática (`ecuacion`). Lo valida
  `src/content/topics.test.ts`.
- **Prosa ≤ 650 palabras por tema;** datos y salvedades en leyendas. El tiempo de lectura de
  la insignia cuenta prosa y texto visible de leyendas, notas y transcripciones.
- **Una sola insignia de recurso por tema:** solo la figura del recurso prescrito la lleva;
  el resto pasa `showBadge={false}`. El laboratorio no dibuja marca propia.
- **Voz en primera persona** en los textos y en las líneas de crédito de las figuras.
- **Sin inventar detalles futuros:** los Temas 6 a 13 aparecen solo por nombre, sin concepto
  ni tipo de recurso, hasta que lleguen sus consignas. La portada no lleva conteo de temas.
- **Simuladores ricos:** reloj, línea de tiempo, lecturas, preajustes, panel de ajustes local y
  global, atajos de teclado. Velocidades indicadas en página: retorno del gatillo 10 veces más
  lento (`SLOW_MOTION`), hábitat 6 veces más rápido, dron 20 veces más rápido (`TIME_LAPSE`).
- **Tema 4:** curvas de carga escaladas por μ(T)/μ_pico; ventana del C4 marcada como supuesto
  del modelo. **Tema 1:** cuatro gráficas de perfiles; el laboratorio abre con el dron en
  crucero (t = 30 s). **Temas 1 a 4:** `updated` = 2026-10-10.
- **Tema 5** (`updated` = 2026-10-13): el video es de terceros, incrustado y acreditado ("no es
  de mi autoría") en el reproductor, la figura y la fuente 8; el análisis es propio. La rampa
  (5.4) es el modo de pendiente de la API (Apple, fuente 2); el firmware la cumple en 10 zonas
  de intensidad entera 0 a 8 (Klein, fuente 6), una escalera que el modelo idealiza. El brazo,
  el motor con tornillo sin fin y el resorte de retorno se citan del desmontaje de Restore
  Technique (fuente 7). El preajuste del paso 4 se llama "Resorte tardío": sus valores son
  ilustrativos, no del DualSense.
- **Portada:** lista Autor, Universidad ("Universidad CENFOTEC", sin escuela), Curso
  ("Física I", sin código, sección ni periodo), Docente y Última actualización (fecha del
  último commit, compartida con el pie), botón e icono del repositorio, filas de temas sin
  "Caso:". El portal del curso no se enlaza. Las fases sin temas publicados muestran solo su
  encabezado y la insignia "Se publica con su consigna"; en la barra lateral quedan
  deshabilitadas, y la búsqueda solo indexa temas publicados.
- **Solo se enlazan temas publicados.** Anterior/siguiente se calcula entre temas publicados
  (`publishedNeighbors`): el último publicado no ofrece "siguiente", y un tema próximo solo
  muestra "Último tema publicado" (sin `rel="prev"`). En "Conexiones", un tema relacionado sin
  contenido aparece solo por número y título de la consigna, apagado y sin enlace, con "se
  publica en el Avance 2 / la Entrega Final" (`resolveRelated`). La búsqueda de la barra
  lateral tampoco indexa temas próximos. Las páginas 6 a 13 siguen existiendo por URL.
- **Franja del tema sin bordes:** insignia, lectura y fecha, y debajo las herramientas, sin
  líneas; el espaciado (más amplio antes y después de la franja que dentro) hace de separador.
- **Pie:** doble línea como el encabezado; "Portafolio de evidencias de Física I", "Dylan
  Chaves · Universidad CENFOTEC", "Actualizado el <fecha del último commit>", enlace
  "Repositorio" (nombre accesible "Repositorio en GitHub") y "Volver arriba". Sin escuela,
  datos de curso ni conteos. Un solo `body > footer` (lo observa el script de la barra
  lateral).
- **Títulos que se parten:** "Física I" va con espacio de no separación en encabezado, portada y
  pie, y los títulos de tema pasan por `bindNumerals` ("Fórmula 1" no se separa).

## Forma de trabajo acordada

- **Idioma:** todo con Dylan en español. Dylan quiere leer el brief, verlo reproducido y
  responder preguntas de decisión antes de construir.
- **Nunca recortar calidad por tiempo.** Las fechas ordenan el trabajo; no bajan la barra.
  Si algo se difiere, se dice explícitamente.
- **Implementación con subagentes,** modelo y esfuerzo según la tarea (alto para física,
  diseño visual y textos; menor para andamiaje). Cada tarea: brief, implementación, revisión
  independiente, ronda de correcciones y re-revisión acotada; decisiones del controlador
  anotadas con su costo si estuvieran equivocadas.
- **Commits** en inglés con formato convencional (`feat`, `fix`, `refactor`, `docs`, `test`,
  `chore`, `perf`, `ci`), solo con la identidad de Dylan, **sin línea de coautor**.
- **Ramas:** se trabaja en una rama (`v2` hasta ahora), CI en cada push, y se integra a
  `main` con avance rápido (`git push origin <rama>:main`) cuando CI está en verde. El push a
  `main` despliega a GitHub Pages; verificar las páginas vivas después.
- **Servidor de desarrollo:** Dylan suele tener `pnpm run dev` en el puerto 4321 desde VS Code.
  No matar ese proceso. Las pruebas e2e se corren con otro puerto para probar una
  construcción fresca: `E2E_PORT=4322 pnpm run e2e`.
- **Puerta completa antes de integrar:**
  ```
  pnpm run check && pnpm run test:cov && pnpm run build && E2E_PORT=4322 pnpm run e2e
  ```
- **Textos:** Claude redacta, Dylan revisa y edita antes de que cuenten como publicados.
- **Autenticación:** `gh` configurado con la cuenta universitaria `Djch18AtSchool`; el remoto
  es HTTPS. En la máquina anterior la clave SSH universitaria (`github-university`) necesitaba
  `ssh-add` con contraseña.

## Después del Avance 1

- **Avance 2:** Temas 6 a 9 (nombres en `src/consigna.ts` y en el README). Esperar la consigna
  antes de escribir conceptos o tipos de recurso. Reutilizar el mismo esquema de contenido
  (`Step`/`Why`/`Figure`/`UseCase`/`Callout`/`Connections`/`Sources`), el cascarón de
  laboratorio y la notación. Leer el material de clase antes de escribir las conexiones.
- **Entrega Final:** Temas 10 a 13, misma regla.
