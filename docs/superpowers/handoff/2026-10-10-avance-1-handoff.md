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
- **Rama `wip/quitar-linea-tema-avance` (`caf7433`):** quita la línea "Tema N · Avance X" sobre
  el título de los temas publicados. Es un cambio de origen desconocido que apareció en el
  árbol de trabajo de `v2`; se guardó como rama para que Dylan decida (pendiente 4).

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Especificación v1 y v2 | `docs/superpowers/specs/2026-10-08-physics-portfolio-design.md`, `docs/superpowers/specs/2026-10-09-portfolio-v2-design.md` |
| Planes v1 y v2 | `docs/superpowers/plans/2026-10-08-physics-portfolio-avance-1.md`, `docs/superpowers/plans/2026-10-09-portfolio-v2.md` |
| Fuentes verificadas y notas de la pila | `docs/superpowers/research/` |
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

1. **Video del Tema 5.** Grabar el clip con el DualSense, dejarlo en `media-raw/` (carpeta
   ignorada por git), comprimirlo y ajustar marcadores y transcripción en
   `src/content/topics/control-haptico.mdx`. Los marcadores actuales están en 5, 15 y 18 s y
   el marcador 3 cita la ecuación (5.2). Hasta entonces la página muestra "El video no está
   disponible" y el análisis escrito.
   ```
   bash scripts/compress-video.sh media-raw/<archivo>
   ```
   Resultado esperado: `public/media/tema-05-dualsense.mp4` y el póster `tema-05-dualsense.jpg`.
2. **Lectura de los cinco textos.** Son de autoría de Dylan ante el profesor (el plagio se
   sanciona). El botón "Copiar Markdown" de cada tema entrega el texto completo.
3. **Nombre de la escuela.** La portada dice "Universidad CENFOTEC · Escuela de Fundamentos"
   (`COURSE.school` en `src/consigna.ts`). Viene de la especificación aprobada, no del
   material de clase, que solo dice "Fundamentos Teórico-Prácticos". Confirmar o corregir.
4. **Línea "Tema N · Avance X".** Decidir si se queda (no hacer nada) o se va (integrar la
   rama `wip/quitar-linea-tema-avance`, que es un commit limpio sobre `v2`).
5. **Texto en leyendas.** Para respetar el tope de 650 palabras de prosa por tema, parámetros y
   salvedades viven en leyendas de figura (800 a 1 200 palabras por tema). Opción recomendada:
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
- Nombre del preajuste "Gatillo DualSense" en el laboratorio del Tema 5.
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
- **Portada:** lista Autor, Universidad, Curso, Docente y Última actualización (fecha del último
  commit, compartida con el pie), botón e icono del repositorio, filas de temas sin
  "Caso:". El portal del curso no se enlaza.

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
