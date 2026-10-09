# Portafolio de evidencias de Física I — Diseño

Fecha: 2026-10-08
Estado: borrador para revisión de Dylan
Alcance de este documento: la base del sitio para las tres entregas y el contenido completo del Avance 1 (temas 1 a 5).

## 1. Objetivo

Construir la página web personal que pide la consigna del portafolio de FUN-18 Física I (Universidad CENFOTEC, sección FCV1, periodo 2026-C3): un sitio público, con repositorio público, donde cada uno de los 13 temas del curso tiene su sección con (a) un caso de uso en Ingeniería de Software y (b) el recurso de apoyo del tipo prescrito. El sitio se entrega en tres avances acumulativos. El Avance 1 cubre los temas 1 a 5 y vence el sábado 10 de octubre de 2026 a las 23:59.

Criterio de éxito: alcanzar el nivel "Excelente" en los cuatro criterios de la rúbrica, y que agregar un tema en el Avance 2 consista en escribir un archivo MDX y, si el tema lo pide, una isla interactiva.

Principio de trabajo acordado: la fecha ordena la secuencia, no recorta funciones, diseño ni arquitectura. Se publica una versión completa temprano y se itera hasta la hora de entrega.

## 2. Requisitos del enunciado

### 2.1 Cada tema lleva dos elementos obligatorios

(a) Caso de uso en Ingeniería de Software con tres partes:
1. El caso concreto, nombrando producto, sistema o industria.
2. El concepto físico aplicado, escrito como ecuación explícita.
3. La justificación de por qué modelar la física resuelve el problema mejor que las alternativas no físicas (valores fijos, trayectorias precalculadas, animaciones guionizadas). El nivel "Excelente" pide discutir qué se gana y qué cuesta.

(b) El recurso de apoyo del tipo prescrito, sin sustituciones:
- Simulación interactiva: corre en la página, al menos un control manipulable, el resultado se recalcula desde la física.
- Visualización de datos: gráfica propia con datos reales o calculados, ejes etiquetados, unidades y fuente citada.
- Diagrama: esquema propio con elementos, fuerzas o variables y ecuaciones anotadas sobre el dibujo.
- Multimedia con análisis: video o audio incrustado más análisis escrito que señale el instante concreto y lo conecte con la ecuación.

### 2.2 Temas del Avance 1

| N.º | Título exacto | Recurso prescrito | Exigencia específica |
|---|---|---|---|
| 1 | Rastreo y navegación de un dron de reparto | Visualización de datos | Perfiles de posición, velocidad y aceleración a lo largo de una ruta, con ejes, unidades y fuente (datos reales o generados desde una ruta declarada) |
| 2 | El salto del personaje: cómo los motores de juego falsean la gravedad | Simulación interactiva | Al menos dos controles, impulso de salto y valor de la gravedad, que modifiquen la trayectoria recalculada en vivo |
| 3 | Gravedad artificial por rotación en hábitats espaciales | Diagrama | Esquema propio con eje de giro, radio, dirección de la aceleración centrípeta y ecuaciones, más caso numérico: radio y RPM para 1 g |
| 4 | Llantas de Fórmula 1: la ventana de temperatura y el agarre | Visualización de datos | Coeficiente de agarre contra temperatura, o fuerza lateral máxima contra carga vertical, con fuente citada |
| 5 | El resorte virtual detrás de un control háptico | Multimedia con análisis | Video del efecto háptico incrustado, análisis del instante donde se percibe la fuerza restauradora y la curva fuerza contra desplazamiento |

### 2.3 Temas futuros

Avance 2: frenado regenerativo en un vehículo eléctrico; el coeficiente de restitución en un motor de videojuego; ruedas de reacción en satélites; asistencia gravitatoria de la Voyager.

Entrega Final: spring animations en interfaces; síntesis de sonido y armónicos; resonancia estructural y Tacoma Narrows; enfriamiento líquido de un centro de datos.

Sus tipos de recurso se publican en las consignas siguientes. El sitio los muestra desde el día uno como "próximamente", con título provisional tomado de esta consigna.

### 2.4 Requisitos de la página

- Publicada en una URL pública. Repositorio público entregado también. La calidad del código no se evalúa; el historial de commits evidencia autoría.
- Navegación que lleve a cualquier tema sin buscar, con los títulos tal como aparecen en la consigna.
- Todo contenido de terceros citado con su fuente.

### 2.5 Rúbrica y dónde se satisface

| Criterio | Nivel Excelente | Dónde lo cubre el diseño |
|---|---|---|
| Casos de uso | Originales o profundos, documentados y citados, con justificación que discute qué se gana y qué cuesta | Componente `UseCase` con tres huecos obligatorios y un cuarto hueco "balance" (ganancia y costo); fuentes numeradas desde el frontmatter (§6, §10) |
| Recursos de apoyo | Del tipo prescrito, elaborados por el estudiante, que enriquecen la comprensión | Una isla o figura propia por tema, con `Figure` que exige fuente y muestra el tipo (§7, §8) |
| Cobertura y profundidad | Todos los temas, desarrollo propio, conexiones explícitas entre temas y con clase | Esquema que exige los 13 temas; bloque `Connections` con temas relacionados y referencias a módulos del curso (§4.4, §8.6) |
| Calidad y publicación | Presentación profesional, navegación fluida, diseño cuidado, jerarquía clara, fuentes con rigor | Diseño "cuaderno de laboratorio técnico", menú persistente de 13 temas, orden fijo de secciones, despliegue continuo (§9, §11) |

## 3. Decisiones tomadas

| Decisión | Valor | Motivo |
|---|---|---|
| Stack | Astro 7 con islas React 19, MDX, KaTeX, Tailwind 4, Vitest 5, Playwright 1.64, pnpm | Sitio de contenido con piezas interactivas aisladas; salida estática |
| Hosting | GitHub Pages con GitHub Actions | Un solo lugar para las dos URLs de la entrega |
| Cuenta y repo | `Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics` | Convención de nombres de la cuenta universitaria de Dylan |
| URL del sitio | `https://djch18atschool.github.io/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/` | Deriva del nombre del repo; requiere `base` en Astro |
| Autor mostrado | Dylan Chaves | Decisión de Dylan |
| Dirección visual | Cuaderno de laboratorio técnico | Decisión de Dylan |
| Idioma | Contenido en español con coma decimal; código, commits y nombres de archivos en inglés | Consigna en español; convención de código |
| Notación | Estándar de libros de texto de Física I (Serway; Sears y Zemansky); g = 9,81 m/s² como en la consigna; ω llamada velocidad angular, con nota de que la consigna la llama frecuencia angular | Decisión de Dylan: paridad con clase solo donde la notación de clase es estándar |
| Alcance físico | Lo que cubre cada tema, con extensiones dentro del tema cuando elevan la calidad (ej. dinámica circular en el tema 3). Nada de material lejano al curso | Decisión de Dylan |
| Autoría del texto | Claude redacta borradores; Dylan revisa, ajusta con su voz y aprueba cada tema antes de publicarlo | Plagio sancionado; el historial de commits evidencia autoría |
| Commits | Identidad universitaria de Dylan, formato convencional, sin línea de coautoría | Configuración global de Dylan |
| Video del tema 5 | Grabado por Dylan con su DualSense | Recurso propio, más fuerte para la rúbrica |
| Material de clase | Extraído a `.reference/class-material/`, fuera de git | Para las conexiones con clase; no es contenido del portafolio |

## 4. Arquitectura

### 4.1 Árbol del repositorio

```
2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics/
├── .github/workflows/
│   ├── ci.yml                    pruebas unitarias, build y e2e en cada push y PR
│   └── deploy.yml                build y despliegue a GitHub Pages desde main
├── docs/superpowers/             specs y planes
├── public/
│   ├── media/                    video del tema 5 comprimido y su póster
│   └── favicon.svg
├── scripts/
│   └── generate-drone-route.ts   genera src/data/drone-route.json desde la ruta declarada
├── src/
│   ├── consigna.ts               lista constante de los 13 temas (número, slug, título exacto, fase)
│   ├── content.config.ts         colección `topics` con esquema zod
│   ├── content/topics/           13 archivos MDX
│   ├── data/                     datasets versionados (drone-route.json, tyre-*.json)
│   ├── lib/
│   │   ├── physics/              kernel puro: constants, vector, kinematics, projectile, circular, friction, spring
│   │   ├── data/                 generadores y modelos de datos (droneRoute, tyreModels)
│   │   └── format.ts             formateo de números con unidad, coma decimal
│   ├── components/
│   │   ├── ui/                   primitivas Astro y React
│   │   ├── charts/               LineChart y marco común (React, Recharts)
│   │   ├── nav/                  SideNav, TopicCard, Breadcrumbs, PrevNext, ThemeToggle
│   │   └── topics/<slug>/        islas específicas de cada tema
│   ├── layouts/                  BaseLayout.astro, TopicLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── temas/[slug].astro
│   │   └── 404.astro
│   └── styles/                   tokens.css, global.css, katex override
├── tests/e2e/                    Playwright (las pruebas unitarias van junto a cada módulo: src/**/*.test.ts)
├── astro.config.ts
├── package.json
└── README.md
```

### 4.2 Rutas

- `/`: portada. Encabezado con nombre, curso, sección, periodo y docente. Indicador "N de 13 temas publicados". Tarjetas de tema agrupadas en Avance 1, Avance 2 y Entrega Final. Cada tarjeta: número, título exacto, tipo de recurso (o "por definir"), estado, producto del caso de uso cuando está publicado.
- `/temas/<slug>/`: una página por tema, generada estáticamente para los 13. Un tema con estado `proximamente` muestra encabezado, concepto, fase y la leyenda "Se publica en el Avance 2" o "Se publica en la Entrega Final".
- `/404`: página con el menú de temas.
- Toda URL interna se construye con el `base` de Astro para que funcione bajo el subdirectorio de GitHub Pages. Política de barra final: `always`.

### 4.3 Orden fijo de secciones en una página de tema publicada

1. Encabezado: "Tema N · Avance X", título exacto, concepto físico en una frase, insignia del tipo de recurso.
2. Caso de uso en Ingeniería del Software, con cuatro subsecciones tituladas: "El caso concreto", "La ecuación", "Por qué modelar la física", "Qué se gana y qué cuesta".
3. Recurso de apoyo, con figura numerada, insignia del tipo y línea de fuente.
4. Conexiones: con otros temas del portafolio y con lo visto en clase.
5. Fuentes: lista numerada.
6. Pie: fecha de actualización, enlace "Ver fuente de esta página en GitHub", navegación anterior y siguiente.

### 4.4 Colección de contenido

`src/consigna.ts` exporta la lista inmutable de los 13 temas: número, slug, título exacto, fase. Es la única fuente de verdad para títulos y numeración; el esquema y una prueba la usan.

| N.º | Slug | Fase | Título |
|---|---|---|---|
| 1 | dron-reparto | 1 | Rastreo y navegación de un dron de reparto |
| 2 | salto-personaje | 1 | El salto del personaje: cómo los motores de juego falsean la gravedad |
| 3 | gravedad-artificial | 1 | Gravedad artificial por rotación en hábitats espaciales |
| 4 | llantas-f1 | 1 | Llantas de Fórmula 1: la ventana de temperatura y el agarre |
| 5 | control-haptico | 1 | El resorte virtual detrás de un control háptico |
| 6 | frenado-regenerativo | 2 | Frenado regenerativo en un vehículo eléctrico |
| 7 | coeficiente-restitucion | 2 | El coeficiente de restitución en un motor de videojuego |
| 8 | ruedas-reaccion | 2 | Ruedas de reacción en satélites |
| 9 | asistencia-gravitatoria | 2 | Asistencia gravitatoria de la Voyager |
| 10 | spring-animations | 3 | Spring animations en interfaces |
| 11 | sintesis-sonido | 3 | Síntesis de sonido y armónicos |
| 12 | resonancia-tacoma | 3 | Resonancia estructural y Tacoma Narrows |
| 13 | enfriamiento-datacenter | 3 | Enfriamiento líquido de un centro de datos |

Los títulos 6 a 13 son provisionales, tomados de la lista de la consigna del Avance 1, y se reemplazan por los exactos cuando salga cada consigna.

Esquema de frontmatter de `topics` (zod):

```
number        entero 1..13; debe coincidir con consigna.ts para ese slug
phase         1 | 2 | 3
title         texto; debe ser idéntico al de consigna.ts (verificado por prueba)
shortTitle    texto ≤ 40 caracteres, para el menú
concept       una frase
status        'publicado' | 'proximamente'
resourceType  'simulacion' | 'visualizacion' | 'diagrama' | 'multimedia'; opcional si proximamente
useCase       { product, industry }; obligatorio si publicado
sources       lista de { id, title, authors?, year?, publisher?, url?, accessed? }; ≥ 1 si publicado
related       lista de slugs de otros temas; cada uno debe existir
classRefs     lista de { module, topic, note? } con el módulo y tema del curso
updated       fecha
```

Reglas de refinamiento: un tema `publicado` exige `resourceType`, `useCase` y al menos una fuente. El build falla si no se cumplen.

### 4.5 Flujo de datos

- Frontmatter alimenta portada, menú, encabezado de tema, conexiones y fuentes.
- El cuerpo MDX escribe la prosa y usa los componentes de §6.
- Los datasets de `src/data/` son JSON versionados. El del dron lo produce `scripts/generate-drone-route.ts` con el kernel de física; se vuelve a generar con `pnpm data:drone`. Los de llantas se generan desde modelos con parámetros citados en `src/lib/data/tyreModels.ts`.
- Las islas se hidratan con `client:visible`. Las gráficas reciben sus datos como props desde el MDX o importan el JSON.

## 5. Kernel de física

Ubicación `src/lib/physics/`. Funciones puras, sin estado ni DOM, unidades del SI, cada función con comentario que escribe la ecuación que implementa. Todas aceptan y devuelven números o vectores simples para que las pruebas sean directas.

`constants.ts`
- `G_EARTH = 9.81` m/s², `G_MOON = 1.62` m/s².

`vector.ts`
- `Vec2 = { x, y }`; `add`, `sub`, `scale`, `magnitude`, `angle`, `fromPolar`, `components(magnitude, angleRad)`.

`kinematics.ts`
- `positionConstantAcceleration(r0, v0, a, t)` → r(t) = r0 + v0 t + ½ a t².
- `velocityConstantAcceleration(v0, a, t)` → v(t) = v0 + a t.
- `derivativeSeries(samples: {t, value: Vec2}[])` → derivada por diferencias centrales (adelante y atrás en los extremos). Devuelve velocidad desde posición, o aceleración desde velocidad.
- `trapezoidalProfile(distance, vMax, aMax)` → tramos de aceleración, crucero y frenado, con el caso triangular cuando no se alcanza vMax. Devuelve función s(t), v(t), a(t) y la duración.

`projectile.ts`
- `jumpApexHeight(v0, g)` → h = v0² / (2 g).
- `jumpTimeToApex(v0, g)` → t = v0 / g.
- `jumpAirTime(v0, gUp, gDown)` → t = v0/gUp + sqrt(2 h / gDown), con h = v0²/(2 gUp). Si gDown = gUp se reduce a 2 v0 / g.
- `designJump(height, timeToApex)` → { g: 2h / t², v0: 2h / t }. Es la inversa que usan los diseñadores.
- `trajectory(v0, vx, gUp, gDown, dt)` → muestras (t, x, y, vy) hasta volver a y = 0, con integración analítica por tramos (subida con gUp, bajada con gDown).
- `analyticY(v0, g, t)` → y = v0 t − ½ g t².

`circular.ts`
- `rpmToOmega(rpm)` → ω = 2π rpm / 60; `omegaToRpm`.
- `centripetalFromOmega(omega, r)` → a = ω² r; `centripetalFromSpeed(v, r)` → a = v² / r.
- `tangentialSpeed(omega, r)` → v = ω r.
- `period(omega)` → T = 2π / ω; `frequency(omega)` → f = ω / 2π.
- `radiusForGravity(targetA, rpm)` → r = a / ω².
- `rpmForGravity(targetA, r)` → rpm desde ω = sqrt(a / r).
- `headToFootGradient(r, height)` → Δa/a = h / r.
- `maxCorneringSpeed(mu, g, r)` → v = sqrt(μ g r). Conecta con el tema 4.

`friction.ts`
- `maxStaticFriction(muS, N)` → f ≤ μs N; `kineticFriction(muK, N)` → f = μk N.
- `normalOnIncline(m, g, thetaRad)` → N = m g cos θ.
- `loadSensitiveMu(mu0, fz, fz0, exponent)` → μ(Fz) = μ0 (Fz / Fz0)^(n − 1), con n < 1.
- `maxLateralForce(mu0, fz, fz0, exponent)` → Fy = μ(Fz) Fz.
- `gripVsTemperature(muPeak, tOpt, widthBelow, widthAbove, t)` → campana asimétrica alrededor de la temperatura óptima.
- `magicFormula(x, B, C, D, E)` → y = D sin(C atan(B x − E (B x − atan(B x)))) (Pacejka).

`spring.ts`
- `hookeForce(k, x)` → F = −k x.
- `elasticEnergy(k, x)` → U = ½ k x².
- `piecewiseResistance(x, start, k)` → 0 si x < start; k (x − start) si x ≥ start. Modelo del modo de resistencia de un gatillo adaptativo.
- `forceCurve(fn, xMax, steps)` → muestras (x, F) para graficar.

Pruebas en `tests/unit/physics/*.test.ts`, una por módulo, estructura preparar-actuar-verificar, con casos analíticos:
- v0 = 10 m/s, g = 9,81 → h = 5,097 m; t_ápice = 1,019 s; t_aire = 2,039 s.
- designJump(5,097 m; 1,019 s) → g ≈ 9,81, v0 ≈ 10.
- 2 RPM → ω = 0,2094 rad/s; r para 9,81 m/s² = 223,6 m. r = 100 m → 2,99 RPM.
- Toro de Stanford: r = 830 m, 1 RPM → 0,93 g (NASA SP-413 reporta 0,95 ± 0,05 g).
- Fricción: μs = 0,40, N = 98 N → 39,2 N.
- Hooke: k = 150 N/m, x = −0,08 m → +12 N.
- Perfil trapezoidal: distancia 100 m, vMax 10 m/s, aMax 2,5 m/s² → duración 14 s; distancia 10 m → caso triangular.

Cobertura mínima del 80% en `src/lib/**`, verificada en CI.

## 6. Componentes compartidos

Astro para lo estático, React solo donde hay estado.

| Componente | Tipo | Contrato |
|---|---|---|
| `UseCase` | Astro | Cuatro slots con nombre: `caso`, `ecuacion`, `justificacion`, `balance`. Si falta alguno, falla en build con un mensaje que nombra el slot. Renderiza las cuatro subsecciones con sus títulos fijos |
| `Equation` | Astro | Props `latex`, `label?`, `symbols?` (lista símbolo → significado y unidad). Numerada por tema con contador CSS: "Ec. N.k". Modo `inline` sin número |
| `Figure` | Astro | Props `type` (uno de los cuatro), `caption`, `source` ({ text, url?, sourceId? }), `id`. Numera "Figura N.k" con contador CSS. Sin `source` falla en build |
| `Sources` | Astro | Lee `sources` del frontmatter y renderiza lista numerada con enlace y fecha de consulta |
| `Cite` | Astro | Prop `id`; renderiza "[n]" enlazado al ítem; falla en build si el id no existe en el frontmatter |
| `Connections` | Astro | Lee `related` y `classRefs`; muestra dos listas: "Con otros temas" y "Con lo visto en clase" |
| `Callout` | Astro | Variantes `nota`, `clase`, `cuidado`. Para comentarios al margen |
| `ControlPanel` | React | Contenedor de controles con título y botón "Restablecer" |
| `Slider` | React | Props `label`, `unit`, `min`, `max`, `step`, `value`, `onChange`, `format?`. Entrada tipo range con etiqueta visible, valor en monoespaciada, operable por teclado, con `aria-valuetext` que incluye la unidad |
| `Readout` | React | Props `label`, `value`, `unit`, `precision`. Valor con coma decimal |
| `Presets` | React | Lista de botones con nombre y referencia de fuente; al pulsar, aplica un conjunto de valores |
| `ChartFrame` | React | Envuelve Recharts: título, ejes con etiqueta y unidad obligatorias, leyenda, línea de fuente. Falla en desarrollo si falta la unidad de un eje |
| `LineChart` | React | Series múltiples sobre `ChartFrame`, tooltip con unidades, colores de la paleta de datos, respeta tema |
| `SideNav` | Astro | 13 temas agrupados por fase, estado, ítem activo. Cajón en móvil |
| `TopicCard`, `Breadcrumbs`, `PrevNext`, `ThemeToggle`, `StatusBadge`, `ResourceBadge` | Astro, salvo `ThemeToggle` que es React | Navegación y señalización |

Formateo numérico centralizado en `src/lib/format.ts` con `Intl.NumberFormat('es-CR')` para coma decimal y separador de miles con espacio fino.

## 7. Islas por tema

### 7.1 Tema 1 · `DroneProfiles`

- Entrada: `src/data/drone-route.json` con muestras a 10 Hz: t, x, y, vx, vy, ax, ay, speed, heading.
- Ruta declarada en `scripts/generate-drone-route.ts`: depósito (0, 0), entrega A (600, 200), entrega B (900, 800), entrega C (300, 1 100), regreso al depósito, en metros, con parada de 20 s en cada entrega. Cada tramo usa el perfil trapezoidal con vMax y aMax tomados de los parámetros por defecto de navegación de ArduPilot, citados en el frontmatter. Las curvas en cada vértice se modelan con frenado a cero, lo que produce picos de aceleración visibles y discutibles.
- Vista: mapa x–y de la ruta con el dron en el instante seleccionado y los vectores v y a dibujados a escala; gráficas x(t) y y(t); vx(t), vy(t) y |v|(t); ax(t), ay(t) y |a|(t). Un deslizador de tiempo sincroniza las cuatro vistas.
- Línea de fuente: "Datos generados por el autor con el script del repositorio a partir de la ruta declarada; límites de velocidad y aceleración según [n]".

### 7.2 Tema 2 · `JumpSimulator`

- Controles: impulso de salto v0 (2 a 25 m/s), gravedad g (1 a 150 m/s², porque Celeste equivale a unos 112 m/s² con la escala declarada), velocidad horizontal vx (0 a 12 m/s), multiplicador de gravedad en caída (1 a 4, porque Super Mario Bros multiplica por 3,5 al soltar el botón). Los dos primeros son los exigidos.
- Salida: trayectoria y(x) recalculada en cada cambio; trayectoria fantasma con g = 9,81 para comparar; lecturas h_máx, t_ápice, t_aire, alcance; marcador animado que recorre la curva con paso fijo de 1/120 s. Con movimiento reducido activo, no hay animación.
- Preajustes con fuente: Tierra (9,81), Luna (1,62), Celeste (constantes del `Player.cs` publicado por Noel Berry en 2018: gravedad 900 px/s², salto 105 px/s, carrera 90 px/s, con escala declarada 8 px = 1 m), Super Mario Bros (desensamblado comentado: salto 4 px/cuadro, gravedad 0,125 px/cuadro² con el botón sostenido y 0,4375 al soltar, a 60 cuadros por segundo, con escala 16 px = 1 m). Valores confirmados en el documento de fuentes.
- Panel "Diseñar el salto": entradas altura deseada y tiempo al ápice; muestra g y v0 derivados con `designJump`, y un botón que los aplica a los controles.

### 7.3 Tema 3 · `HabitatDiagram` y `HabitatCalculator`

- `HabitatDiagram.astro`: SVG propio, inline, con variables CSS para los colores. Elementos: anillo del hábitat visto en perspectiva, eje de giro, radio r, flecha de ω, persona de pie sobre el borde exterior con la cabeza hacia el eje, vector a_c hacia el centro, vector de "gravedad aparente" hacia afuera, y las ecuaciones a_c = ω² r, v = ω r, T = 2π/ω anotadas junto a los elementos. Un detalle lateral marca h (altura de la persona) para el gradiente.
- `HabitatCalculator` (React, complemento del diagrama): modo "fijar 1 g y despejar r" con control de RPM, y modo "fijar r y despejar RPM" con control de radio (5 a 4 000 m). Lecturas: ω, v, a_c, a_c/g, T, f, y la diferencia cabeza-pies para h = 1,80 m. Preajustes: Toro de Stanford (r = 830 m, 1 RPM, 0,93 g; NASA SP-413 reporta 0,95 ± 0,05 g), cilindro de O'Neill (r = 4 000 m, ≈ 0,47 RPM), centrífuga pequeña (r = 10 m) para mostrar el gradiente.
- Caso numérico escrito en la prosa: a 2 RPM se necesitan 223,6 m; a 100 m se necesitan 2,99 RPM.

### 7.4 Tema 4 · `GripCharts`

- Gráfica A: coeficiente de agarre contra temperatura de la banda de rodadura, con la ventana de trabajo sombreada. Curva calculada con `gripVsTemperature` y parámetros tomados de fuentes publicadas; puntos de referencia anotados con los rangos de trabajo publicados por Pirelli para sus compuestos.
- Gráfica B: fuerza lateral máxima contra carga vertical. Dos series: modelo lineal F = μ N con μ constante, y modelo con sensibilidad a la carga, con coeficientes citados. Un tooltip muestra el μ efectivo en cada punto.
- Toda serie declara unidad en el eje y la fuente en la línea de la figura. Si al investigar aparece un dataset real con licencia que permita su uso, se superpone como puntos y se cita; si no, las curvas quedan como calculadas con parámetros citados y así se declara.

### 7.5 Tema 5 · `HapticVideo` y `SpringForceCurve`

- `HapticVideo` (React): elemento video con controles nativos, póster, pista de texto, y una lista de marcas de tiempo. Cada marca tiene título y un párrafo de análisis; al pulsar, el video salta al instante. La marca activa se resalta mientras el video avanza.
- `SpringForceCurve` (React): control de rigidez k (50 a 600 N/m) y de posición de inicio de la resistencia (0 a 6 mm sobre un recorrido de 8 mm). Series: Hooke ideal F = k x, y modo de resistencia por tramos del gatillo. Área sombreada bajo la curva con la energía elástica en mJ. Anotación de la tercera ley: la fuerza del gatillo sobre el dedo es igual y opuesta a la del dedo sobre el gatillo.
- El video se guarda en `public/media/` comprimido a 720p, ≤ 15 MB, con póster JPG. Tiene texto alternativo y enlace de descarga.

## 8. Plan de contenido del Avance 1

Cada tema sigue las cuatro subsecciones del caso de uso. Las fuentes listadas fueron verificadas el 8 de octubre de 2026 y están detalladas, con URL y valores, en `docs/superpowers/research/2026-10-08-sources.md`; solo se cita lo confirmado ahí. La prosa es borrador para la revisión de Dylan.

### 8.1 Tema 1 · Dron de reparto

- Caso concreto: la navegación por puntos de paso de los autopilotos de código abierto ArduPilot y PX4, usados en drones de reparto e inspección. El controlador genera perfiles de posición, velocidad y aceleración acotados para cada tramo y los descompone en componentes norte y este.
- Ecuaciones: r(t) = r0 + v0 t + ½ a t²; v = dr/dt; a = dv/dt; descomposición en componentes; perfil trapezoidal de velocidad.
- Por qué la física: con rumbos y velocidades fijas el dron no respeta límites de aceleración ni corrige por viento sin perder coherencia; el modelo cinemático permite predecir, limitar y replanificar.
- Qué se gana y qué cuesta: se gana coherencia y seguridad ante cualquier ruta; cuesta estimación de estado, ajuste de ganancias y cómputo a bordo.
- Fuentes confirmadas: documentación de ArduPilot Copter (modo Auto, que describe la navegación por curvas S y `WP_JERK`) y el código de Copter 4.6.3 con los valores por defecto WPNAV_SPEED 1000 cm/s y WPNAV_ACCEL 250 cm/s²; documentación de PX4 del controlador de posición y trayectoria limitada en jerk, con MPC_XY_VEL_MAX 12 m/s y MPC_ACC_HOR 3 m/s²; Serway y Jewett, movimiento en dos dimensiones.
- Conexiones: tema 2 (mismas ecuaciones de aceleración constante); clase Módulo 1, temas 1.1 y 1.3.

### 8.2 Tema 2 · Salto del personaje

- Caso concreto: Celeste (Extremely OK Games), cuyo código de movimiento del jugador es público y declara gravedad, velocidad de salto y gravedad reducida cerca del ápice; y la charla de GDC "Math for Game Programmers: Building a Better Jump" de Kyle Pittman, que formaliza elegir altura y tiempo al ápice.
- Ecuaciones: y(t) = y0 + v0 t − ½ g t²; h = v0²/(2g); t_ápice = v0/g; t_aire = 2 v0/g; diseño inverso g = 2h/t², v0 = 2h/t.
- Por qué la física: una animación guionizada no responde a soltar el botón antes, a plataformas móviles ni a viento; con la física cualquier combinación de entrada produce un salto coherente. La gravedad distinta de 9,81 es una decisión de sensación de juego, no un error.
- Qué se gana y qué cuesta: se gana control de la sensación con dos parámetros intuitivos; cuesta error de integración por cuadro dependiente del framerate, que se resuelve con paso fijo.
- Fuentes confirmadas: `Player.cs` de Celeste publicado en GitHub por Noel Berry (2018); diapositivas oficiales de Pittman, GDC 2016, con v0 = 2h/t_h y g = −2h/t_h²; documentación de Unity de `Physics2D.gravity` con valor por defecto (0, −9,8); desensamblado comentado de Super Mario Bros (doppelganger, 6502disassembly.com).
- Conexiones: tema 1 (cinemática), tema 3 (dos formas de fabricar gravedad aparente), tema 7 futuro (restitución); clase Módulo 1, temas 1.2 y 1.3.

### 8.3 Tema 3 · Gravedad artificial

- Caso concreto: SpinCalc de Theodore Hall, la herramienta de software que la comunidad de diseño de hábitats usa para dimensionar radio, velocidad angular, velocidad tangencial y aceleración con los criterios de confort publicados (Hill y Schnitzer 1962, Gilruth 1969, Gordon y Gervais 1969, Stone 1973, Cramer 1985), aplicada al diseño del Toro de Stanford de NASA SP-413. Elite Dangerous, cuyas estaciones giran, se menciona solo si se confirma una fuente oficial de Frontier; la verificación del 8 de octubre no lo logró.
- Ecuaciones: a_c = ω² r = v²/r; v = ω r; T = 2π/ω; f = 1/T; ω = 2π RPM/60; Δa/a = h/r. Extensión: ΣF = m a_c, la normal del piso provee la fuerza centrípeta.
- Por qué la física: un valor fijo de "gravedad" no reproduce el gradiente cabeza-pies ni el efecto Coriolis; el modelo explica por qué los radios pequeños incomodan y permite elegir r y RPM.
- Qué se gana y qué cuesta: se gana un hábitat habitable sin tecnología inexistente; cuesta estructura enorme y mareo por rotación.
- Caso numérico: 2 RPM → 223,6 m; 100 m → 2,99 RPM; Toro de Stanford 830 m a 1 RPM → 0,93 g.
- Fuentes confirmadas: NASA SP-413, "Space Settlements: A Design Study" (1977, NTRS 19770014162) para el Toro de Stanford; Hall, "Artificial Gravity Visualization, Empathy, and Design" (AIAA 2006-7321) y SpinCalc; Serway y Jewett, 10.ª ed., movimiento circular uniforme.
- Conexiones: tema 4 (en curva, la fricción es la fuerza centrípeta), tema 8 futuro (ruedas de reacción); clase Módulo 1, tema 1.4, con nota de que la dinámica circular es extensión.

### 8.4 Tema 4 · Llantas de Fórmula 1

- Caso concreto: el modelo de neumático de Assetto Corsa (Kunos Simulazioni), cuyos archivos de configuración exponen un exponente de sensibilidad a la carga y una curva de rendimiento contra temperatura; y la Fórmula Mágica de Pacejka usada en simuladores y en ingeniería de vehículos.
- Ecuaciones: f_máx = μs N (modelo de clase); Fy,máx = μ(Fz) Fz con μ(Fz) = μ0 (Fz/Fz0)^(n−1), n < 1; μ(T) con ventana óptima; Fórmula Mágica.
- Por qué la física: con μ constante un coche más pesado agarraría proporcionalmente más y las llantas frías o recalentadas se comportarían igual, así que no existiría la gestión de neumáticos ni la ventana de temperatura.
- Qué se gana y qué cuesta: se gana comportamiento emergente y realista; cuesta parámetros que hay que medir y calibrar por compuesto.
- Fuentes confirmadas: Pacejka, "Tire and Vehicle Dynamics", 3.ª ed., Butterworth-Heinemann, 2012; Milliken y Milliken, "Race Car Vehicle Dynamics", SAE, 1995 (sensibilidad a la carga, a contrastar con el ejemplar); un `tyres.ini` real y comentado de Assetto Corsa (equipo MUR) con `FZ0`, `LS_EXPY`, `DY_REF` y `PERFORMANCE_CURVE`, porque no existe documentación oficial de Kunos; tabla de ventanas de trabajo de los compuestos Pirelli de 2019 publicada por Autosport (Noble, 2019), declarada como generación de 13 pulgadas; definición de Isola (Pirelli) del rango operativo como agarre máximo menos 3%.
- Conexiones: tema 3 (v_máx = sqrt(μ g r)), tema 5 (modelos de contacto que el libro idealiza); clase Módulo 2, tema 02, conceptos 01 a 03.

### 8.5 Tema 5 · Control háptico

- Caso concreto: los gatillos adaptativos del DualSense de PlayStation 5, cuyo API expone modos de resistencia con posición de inicio y fuerza, documentados en bibliotecas abiertas y usados en Astro's Playroom y Horizon Forbidden West.
- Ecuaciones: F = −k x; U = ½ k x²; tercera ley F_gatillo→dedo = −F_dedo→gatillo; modo por tramos F = k (x − x0) para x ≥ x0.
- Por qué la física: una vibración fija no cambia con cuánto se ha apretado; el resorte virtual sí, y por eso se percibe como tensar algo real.
- Qué se gana y qué cuesta: se gana retroalimentación continua y creíble; cuesta límite de fuerza del motor, latencia y consumo.
- Fuentes confirmadas: página oficial de accesorios DualSense en playstation.com; `DS5State.h` del repositorio DualSense-Windows (modos `ContinuousResitance` y `SectionResitance`, parámetros `startPosition` y `force` de 0 a 255); reseña de Astro's Playroom que describe los gatillos "tensos como un resorte"; PlayStation Blog de Guerrilla (2021) sobre el "pop" del gatillo al máximo del arco en Horizon Forbidden West; Serway y Jewett, ley de Hooke y tercera ley.
- Conexiones: tema 4 (fuerzas de contacto), tema 10 futuro (spring animations), tema 12 futuro (resonancia); clase Módulo 2, tema 02 concepto 04 y tema 01 concepto 05.
- Video: grabado por Dylan según el guion de §13.

### 8.6 Conexiones transversales

Cada tema publicado enlaza a al menos dos temas más y cita al menos un módulo del curso en `classRefs`. Las conexiones se escriben en la prosa, no solo en la lista, para que sean "explícitas" como pide la rúbrica.

## 9. Diseño visual y UX

- Tailwind 4 para utilidades de layout y espaciado; los tokens viven en CSS y se exponen a Tailwind mediante `@theme`. Nada de estilos inline en componentes.
- Tipografía: IBM Plex Sans para texto, IBM Plex Mono para números, unidades, lecturas y código, servidas desde el sitio con paquetes de fuentes locales. KaTeX con su propia fuente.
- Tokens en `tokens.css` como variables CSS: fondo, fondo elevado, texto, texto atenuado, borde, acento principal, y un acento por tipo de recurso (simulación, visualización, diagrama, multimedia). Paleta de datos para gráficas tomada de la guía de visualización, validada en claro y oscuro.
- Tema claro con papel cálido y tema oscuro con grafito. Se respeta `prefers-color-scheme` y el alternador guarda la elección en `localStorage` con lectura protegida por try/catch.
- Detalles de cuaderno: retícula sutil dentro de los marcos de figura, figuras y ecuaciones numeradas, notas al margen para las referencias a clase, valores siempre con unidad.
- Layout: barra lateral fija en escritorio con los 13 temas; cajón en móvil. Columna de lectura de unos 70 caracteres; figuras y simulaciones se ensanchan hasta el contenedor. Encabezado de tema fijo al hacer scroll con número, avance y tipo.
- Accesibilidad: contraste AA, controles con etiqueta y teclado, `aria-valuetext` con unidades, foco visible, `prefers-reduced-motion` respetado en animaciones, textos alternativos en SVG y video.
- Rendimiento: islas con `client:visible`, imágenes y video con dimensiones declaradas, fuentes con `font-display: swap`.
- La dirección estética concreta (proporciones, color exacto, microdetalles) se afina con el skill de diseño frontend al implementar, dentro de estas reglas.

## 10. Datos, fuentes y licencias

- Toda figura declara fuente. Los datos generados se etiquetan como tales y enlazan al script. Los valores de terceros llevan título, autor, año, URL y fecha de consulta.
- No se incluyen imágenes de terceros. El video del tema 5 es propio.
- Las citas en la prosa usan `Cite` con el id de la fuente del frontmatter.
- `src/lib/data/tyreModels.ts` guarda los parámetros de los modelos de llantas con un comentario por parámetro que indica su fuente.

## 11. Pruebas y CI

- Unitarias (Vitest): kernel de física, generadores de datos, `format.ts`, y una prueba de contenido que carga `consigna.ts` y los 13 MDX y verifica números únicos 1 a 13, títulos idénticos, slugs coincidentes y que `related` apunte a slugs existentes.
- De extremo a extremo (Playwright, contra `astro preview` del build): la portada lista 13 temas con sus títulos exactos; cada tema publicado muestra las cuatro subsecciones del caso de uso, al menos una figura con línea de fuente y la lista de fuentes; en el tema 2, mover el control de gravedad cambia la lectura de altura máxima; el alternador de tema cambia el atributo del documento; ninguna página registra errores de consola; todos los enlaces internos de cada página, incluidos los de la barra lateral, resuelven con el `base` y responden 200 en preview.
- `astro check` para tipos.
- `ci.yml`: en push y PR, instala con pnpm, corre unitarias con cobertura mínima del 80% en `src/lib/**`, `astro check`, build y e2e.
- `deploy.yml`: en push a `main`, build con `site` y `base` y despliegue a GitHub Pages con las acciones oficiales de Pages.

## 12. Despliegue y repositorio

- Crear el repo público con la CLI de gh en la cuenta universitaria: `gh repo create Djch18AtSchool/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics --public`.
- Remoto por SSH con el alias `github-university`. Antes del primer push Dylan carga la llave con `ssh-add ~/.ssh/id_ed25519_university`.
- Activar Pages con origen "GitHub Actions" vía API de gh.
- `astro.config.ts`: `site: 'https://djch18atschool.github.io'`, `base: '/2026_C3_UNICA_FUN-18_FCV1.Portfolio.Physics'`, `trailingSlash: 'always'`.
- README con curso, sección, periodo, docente, autor, las dos URLs, estado de cada avance, estructura y comandos.
- Commits convencionales (`feat`, `fix`, `docs`, `test`, `chore`, `ci`), frecuentes, con la identidad universitaria de Dylan, sin coautoría.

## 13. Guion de grabación del video del tema 5

Para que Dylan grabe en Astro's Playroom (preinstalado en PS5), zona Cooling Springs, donde el traje de resorte comprime un muelle con el gatillo.

1. Clip principal, 30 a 45 s, teléfono en horizontal, luz lateral para ver el recorrido del gatillo, mano y gatillo R2 visibles de perfil.
   - Segundo 0 a 5: dedo apoyado sin presionar.
   - 5 a 15: presionar muy despacio hasta el fondo; la resistencia crece con el recorrido. Mantener 3 s al fondo.
   - 15 a 20: soltar de golpe; el gatillo regresa solo. Ese es el instante de la fuerza restauradora.
   - Repetir la secuencia una vez más.
2. Clip secundario opcional, 20 s: televisor y mano en el mismo cuadro, para ver el muelle comprimirse en pantalla en sincronía con el gatillo.
3. Anotar los segundos aproximados de inicio de resistencia, fondo y liberación; se afinan al montar.
4. Dejar los archivos originales en `media-raw/` (fuera de git). La compresión a 720p con ffmpeg y el póster los produce un script del repo.

## 14. Manejo de errores

- Build: esquema zod con mensajes que nombran el tema y el campo; `UseCase`, `Figure` y `Cite` fallan con mensaje claro si falta un slot, una fuente o un id.
- Simulaciones: los controles acotan al rango declarado y muestran el rango; valores no finitos se reemplazan por el último válido; si un preajuste trae valores fuera de rango, se recortan y se avisa.
- Gráficas: estado vacío con mensaje si no hay datos; sin unidad de eje, error en desarrollo.
- Video: si falla la carga, se muestra texto alternativo, el análisis completo y el enlace de descarga.
- Navegación: página 404 con menú; prueba e2e que detecta enlaces internos rotos.
- Preferencias: lectura y escritura de `localStorage` envueltas en try/catch; sin almacenamiento, el tema sigue a la preferencia del sistema.

## 15. Secuencia de trabajo

1. Hoy, 8 de octubre: aprobación de esta spec, plan de implementación, andamiaje (Astro, MDX, React, KaTeX, Tailwind, Vitest, Playwright), tokens y layout base, `consigna.ts`, esquema y los 13 MDX mínimos, CI, creación del repo, activación de Pages y primer despliegue del esqueleto.
2. 8 y 9 de octubre: kernel de física con pruebas primero; componentes compartidos; islas de los temas 2, 3, 1, 4 y 5 en ese orden; borradores de los cinco casos de uso con fuentes verificadas, entregados a Dylan para revisión tema por tema.
3. 9 de octubre: Dylan graba el video y revisa textos; integración de sus cambios; compresión e integración del video; pase de diseño con el skill frontend; accesibilidad; e2e completas; Lighthouse.
4. 10 de octubre: revisión final, verificación de que sitio y repositorio son públicos y accesibles, y entrega en Moodle por parte de Dylan.

Dependencias de Dylan: cargar la llave SSH antes del primer push; grabar el video; revisar y aprobar los cinco textos.

## 16. Fuera de alcance

Buscador, comentarios, analítica, internacionalización, PWA, CMS, cuentas de usuario, y el contenido de los temas 6 a 13 más allá de su página "próximamente".

## 17. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Diferencias de API en Astro 7 respecto a versiones conocidas | Verificar colecciones, integraciones y `base` contra la documentación oficial al escribir el plan |
| Rutas rotas bajo el subdirectorio de Pages | Helper único para URLs internas y prueba e2e de enlaces |
| Datos reales de llantas sin licencia clara | Curvas calculadas con parámetros citados, declaradas como tales; puntos de referencia publicados anotados |
| Constantes de juegos mal recordadas | Se verifican contra el código o documento fuente antes de citarlas; si no se confirman, el preajuste no se publica |
| Tamaño del video en el repo | Compresión a 720p, ≤ 15 MB; originales fuera de git |
| Llave SSH sin cargar en el momento del push | Avisar a Dylan al inicio; el repo y Pages se crean con gh por HTTPS, solo el push necesita SSH |
