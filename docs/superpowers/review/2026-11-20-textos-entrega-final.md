# Textos de la Entrega Final para que Dylan los lea

Rama `entrega-final`. Cada tarea añade aquí su sección: toda frase nueva o cambiada que la página muestra o dice,
con su archivo y su línea, «antes» → «después» (una frase nueva tiene «antes» vacío, —). En el código, la línea que
lleva el texto; los `${…}` son valores que pone el componente.

## Medios con análisis (`AnalyzedMedia`, Task 2)

Textos de interfaz nuevos del componente compartido. Los dos primeros solo aparecen con un video o un audio alojados
(Temas 11 y 12); el tercero también lo oye quien usa un lector de pantalla en el Tema 5. Lo que se ve en el Tema 5 no
cambia.

1. `src/components/media/HostedPlayer.tsx:141-142`, línea bajo un medio que el navegador no puede reproducir (sin el
   códec, archivo ausente, sin red): — → «No se pudo reproducir el archivo en este navegador: descárgalo en
   `${formato}`.» (el enlace es «descárgalo en WebM» o «descárgalo en MP3» y baja el primer archivo).
2. `src/components/media/HostedPlayer.tsx:118`, línea de crédito de un medio alojado: — → «Video: `${credit}`» o
   «Audio: `${credit}`» (como la del Tema 5, «Video: PlayStation Access, 5 de agosto de 2021.»).
3. `src/components/media/AnalyzedMedia.tsx:145`, anuncio para el lector de pantalla al pulsar una marca (no se ve; la
   marca mueve el medio a su instante y lo reproduce, en YouTube y en los alojados, decisión R11): — → «Reproduciendo
   desde `${m:ss}`: `${título de la marca}`», por ejemplo «Reproduciendo desde 4:15: El arco: la tensión crece con el
   recorrido».

## Tarea F (Tema 7)

Corrección del profesor a la ecuación (7.3): la fórmula de $N$ debe excluir el impacto que cae exactamente en el
umbral. El código ya contaba solo los impactos estrictamente por encima; la página decía otra cosa.

1. `src/content/topics/coeficiente-restitucion.mdx:290`, ecuación (7.3), última línea: `N = ⌊ln(v₀/v_th) / ln(1/e)⌋ + 1`
   → `N = ⌈ln(v₀/v_th) / ln(1/e)⌉` (techo, sin el «+ 1»).
2. `src/content/topics/coeficiente-restitucion.mdx:312`, significado de $N$ en la tabla de símbolos: «rebotes antes de
   que el impacto, $e^n v_0$ con $v_0 = \sqrt{2gh_0}$, deje de superar el umbral» → «rebotes: impactos $e^n v_0$, con
   $v_0 = \sqrt{2gh_0}$, estrictamente por encima del umbral; uno que cae justo en $v_\text{th}$ no rebota».
3. `src/content/topics/coeficiente-restitucion.mdx:327`, `Why`, ranura `ecuacion`: añado al final «Con $v_0 = 4$ m/s,
   $v_\text{th} = 1$ m/s y $e = 0{,}5$, los impactos son de 4, 2 y 1 m/s; el tercero, justo en el umbral, no rebota:
   $N = 2$.» (antes: — ; la frase anterior, «… el umbral corta la serie en $N$ botes; con Box2D, 15.», no cambia).

Prosa del tema: 629 → 650 palabras (tope 650), tras acortar mi frase nueva en dos palabras.

## Tema 10

Página nueva, «Spring animations: el resorte amortiguado detrás de las animaciones de iOS y de Framer Motion» (rama
`entrega-final-tema-10`, tarea 4). Todo es nuevo. Tres elecciones de Claude que se ven en el texto:

- La frecuencia angular amortiguada se escribe $\omega'$, como en el Tema 3 del Módulo 5 (y Sears–Zemansky): el
  Módulo 5 reserva $\omega_d$ para la frecuencia impulsora, que usará el Tema 12. La investigación escribía $\omega_d$.
- La curva de duración fija de la figura 10.4 es la `ease-in-out` de CSS, `cubic-bezier(0.42, 0, 0.58, 1)`, la única
  confirmada en la investigación; dura lo que el resorte tarda en asentarse al 2 % (0,26 s).
- En la tabla 10.1 el preajuste «Motion, posición x e y» se escribe «Motion, posición $x$ e $y$» (en el selector del
  laboratorio seguirá en texto plano, porque un `<option>` no admite fórmulas).

La lista va por archivo: la página (frontmatter, con las fuentes tal como salen en «Fuentes», y cuerpo), las figuras,
las tablas y los datos cuyos textos se ven por primera vez en las tablas de esta página.

### Página (`src/content/topics/animaciones-resorte.mdx`)

- `src/content/topics/animaciones-resorte.mdx:5`, título corto (nuevo): «Animaciones con resorte»
- `src/content/topics/animaciones-resorte.mdx:6`, concepto (nuevo): «Oscilador amortiguado: ley de Hooke, amortiguamiento viscoso, regímenes subamortiguado, crítico y sobreamortiguado, y por qué una interfaz anima con rigidez y amortiguamiento en vez de con una duración.»
- `src/content/topics/animaciones-resorte.mdx:9`, caso de uso, producto (nuevo): «Motion (antes Framer Motion) y las animaciones con resorte de Apple»
- `src/content/topics/animaciones-resorte.mdx:10`, caso de uso, industria (nuevo): «Interfaces de usuario y animación web»
- `src/content/topics/animaciones-resorte.mdx:13`, «Fuentes», título de motion-v14140 (nuevo): «Motion v14.14.0 (tag v14.14.0, commit f95ab94)»
- `src/content/topics/animaciones-resorte.mdx:14`, «Fuentes», autores de motion-v14140 (nuevo): «Matt Perry y colaboradores, Motion B.V.»
- `src/content/topics/animaciones-resorte.mdx:16`, «Fuentes», editorial o detalle de motion-v14140 (nuevo): «Repositorio motiondivision/motion en GitHub, licencia MIT; packages/motion-dom/src/animation: generators/spring.ts L22-L50, L240-L248, L305-L318, L335-L455 y L463-L490, utils/default-transitions.ts L4-L18, interfaces/motion-value.ts L48 y la prueba spring.test.ts L41-L121; CHANGELOG.md L106-L120»
- `src/content/topics/animaciones-resorte.mdx:20`, «Fuentes», título de motion-blog-2024 (nuevo): «Framer Motion is now independent, introducing Motion»
- `src/content/topics/animaciones-resorte.mdx:21`, «Fuentes», autores de motion-blog-2024 (nuevo): «Matt Perry»
- `src/content/topics/animaciones-resorte.mdx:23`, «Fuentes», editorial o detalle de motion-blog-2024 (nuevo): «Blog de motion.dev, 12 de noviembre de 2024»
- `src/content/topics/animaciones-resorte.mdx:27`, «Fuentes», título de motion-docs-spring (nuevo): «spring»
- `src/content/topics/animaciones-resorte.mdx:28`, «Fuentes», autores de motion-docs-spring (nuevo): «Motion»
- `src/content/topics/animaciones-resorte.mdx:29`, «Fuentes», editorial o detalle de motion-docs-spring (nuevo): «Documentación de Motion»
- `src/content/topics/animaciones-resorte.mdx:33`, «Fuentes», título de motion-docs-transitions (nuevo): «Transitions (React)»
- `src/content/topics/animaciones-resorte.mdx:34`, «Fuentes», autores de motion-docs-transitions (nuevo): «Motion»
- `src/content/topics/animaciones-resorte.mdx:35`, «Fuentes», editorial o detalle de motion-docs-transitions (nuevo): «Documentación de Motion»
- `src/content/topics/animaciones-resorte.mdx:39`, «Fuentes», título de wwdc23-springs (nuevo): «Animate with springs (sesión 10158)»
- `src/content/topics/animaciones-resorte.mdx:40`, «Fuentes», autores de wwdc23-springs (nuevo): «Apple»
- `src/content/topics/animaciones-resorte.mdx:42`, «Fuentes», editorial o detalle de wwdc23-springs (nuevo): «WWDC23, Apple Developer; transcripción oficial de la página»
- `src/content/topics/animaciones-resorte.mdx:46`, «Fuentes», título de apple-spring (nuevo): «Spring (SwiftUI)»
- `src/content/topics/animaciones-resorte.mdx:47`, «Fuentes», autores de apple-spring (nuevo): «Apple»
- `src/content/topics/animaciones-resorte.mdx:48`, «Fuentes», editorial o detalle de apple-spring (nuevo): «Apple Developer Documentation, iOS 17.0 y posteriores»
- `src/content/topics/animaciones-resorte.mdx:52`, «Fuentes», título de apple-animation-default (nuevo): «Animation.default (SwiftUI)»
- `src/content/topics/animaciones-resorte.mdx:53`, «Fuentes», autores de apple-animation-default (nuevo): «Apple»
- `src/content/topics/animaciones-resorte.mdx:54`, «Fuentes», editorial o detalle de apple-animation-default (nuevo): «Apple Developer Documentation»
- `src/content/topics/animaciones-resorte.mdx:58`, «Fuentes», título de androidx (nuevo): «AndroidX (commit b192298)»
- `src/content/topics/animaciones-resorte.mdx:59`, «Fuentes», autores de androidx (nuevo): «The Android Open Source Project»
- `src/content/topics/animaciones-resorte.mdx:61`, «Fuentes», editorial o detalle de androidx (nuevo): «Repositorio androidx/androidx en GitHub, licencia Apache 2.0; compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens: MotionTokens.kt L24-L39, StandardMotionTokens.kt L20-L31 y ExpressiveMotionTokens.kt L22-L33»
- `src/content/topics/animaciones-resorte.mdx:65`, «Fuentes», título de react-spring-v1012 (nuevo): «react-spring v10.1.2 (tag v10.1.2, commit 59b1e53)»
- `src/content/topics/animaciones-resorte.mdx:66`, «Fuentes», autores de react-spring-v1012 (nuevo): «pmndrs»
- `src/content/topics/animaciones-resorte.mdx:67`, «Fuentes», editorial o detalle de react-spring-v1012 (nuevo): «Repositorio pmndrs/react-spring en GitHub, licencia MIT; packages/core/src/SpringValue.ts L310-L337»
- `src/content/topics/animaciones-resorte.mdx:71`, «Fuentes», título de css-easing-1 (nuevo): «CSS Easing Functions Level 1»
- `src/content/topics/animaciones-resorte.mdx:72`, «Fuentes», autores de css-easing-1 (nuevo): «W3C»
- `src/content/topics/animaciones-resorte.mdx:74`, «Fuentes», editorial o detalle de css-easing-1 (nuevo): «Candidate Recommendation Draft, 13 de febrero de 2023»
- `src/content/topics/animaciones-resorte.mdx:78`, «Fuentes», título de serway-jewett-2018 (nuevo): «Física para ciencias e ingeniería, Vol. 1, 10.ª edición»
- `src/content/topics/animaciones-resorte.mdx:79`, «Fuentes», autores de serway-jewett-2018 (nuevo): «Raymond A. Serway y John W. Jewett Jr.»
- `src/content/topics/animaciones-resorte.mdx:81`, «Fuentes», editorial o detalle de serway-jewett-2018 (nuevo): «Cengage Learning»
- `src/content/topics/animaciones-resorte.mdx:87`, «Con lo visto en clase», tema (nuevo): «Tema 1 · Ecuaciones Diferenciales y Movimiento Oscilatorio · Ecuación Diferencial del Movimiento Armónico Simple (MAS)»
- `src/content/topics/animaciones-resorte.mdx:88`, «Con lo visto en clase», nota (nuevo): «$m\,d^2x/dt^2 = -kx$ con $\omega = \sqrt{k/m}$ y $T = 2\pi\sqrt{m/k}$: las (10.1) y (10.2).»
- `src/content/topics/animaciones-resorte.mdx:90`, «Con lo visto en clase», tema (nuevo): «Tema 3 · Oscilaciones Amortiguadas Simples · Tres regímenes»
- `src/content/topics/animaciones-resorte.mdx:91`, «Con lo visto en clase», nota (nuevo): «La (10.3), $b_c = 2\sqrt{km}$ y $dE/dt = -b v_x^2$; su $\omega^\prime$ es el de la (10.6).»
- `src/content/topics/animaciones-resorte.mdx:93`, «Con lo visto en clase», tema (nuevo): «Tema 02 · Fricción y resortes · Concepto 04 · Fuerza elástica y ley de Hooke»
- `src/content/topics/animaciones-resorte.mdx:94`, «Con lo visto en clase», nota (nuevo): «$a_x = -(k/m)\,x$: una aceleración que cambia con la deformación, la de la (10.1).»
- `src/content/topics/animaciones-resorte.mdx:96`, «Con lo visto en clase», tema (nuevo): «Tema 04 · Energía mecánica · Concepto 03 · Energía potencial elástica»
- `src/content/topics/animaciones-resorte.mdx:97`, «Con lo visto en clase», nota (nuevo): «$U_\text{el} = kx^2/2$: el segundo término de la $E$ de la (10.5).»
- `src/content/topics/animaciones-resorte.mdx:99`, «Con lo visto en clase», tema (nuevo): «Tema 04 · Energía mecánica · Concepto 05 · Trabajo no conservativo y balance de energía»
- `src/content/topics/animaciones-resorte.mdx:100`, «Con lo visto en clase», nota (nuevo): «$\Delta(K+U) = W_\text{otras}$: con la fuerza viscosa, la (10.5).»
- `src/content/topics/animaciones-resorte.mdx:121`, introducción (nuevo): «Lo que se desliza o se abre en iOS y en Motion no sigue una curva dibujada a mano: sigue un resorte amortiguado, calculado en cada cuadro.»
- `src/content/topics/animaciones-resorte.mdx:123`, Paso 1, título (nuevo): «Un resorte sin amortiguar»
- `src/content/topics/animaciones-resorte.mdx:125`, Paso 1 (nuevo): «Llamo $u$ al desplazamiento del elemento respecto de su destino; con solo Hooke, su aceleración cambia con $u$.»
- `src/content/topics/animaciones-resorte.mdx:131`, Paso 1, leyenda de ecuación (nuevo): «posición del elemento en su eje»
- `src/content/topics/animaciones-resorte.mdx:132`, Paso 1, leyenda de ecuación (nuevo): «destino de la animación»
- `src/content/topics/animaciones-resorte.mdx:133`, Paso 1, leyenda de ecuación (nuevo): «masa; las bibliotecas usan 1 kg»
- `src/content/topics/animaciones-resorte.mdx:134`, Paso 1, leyenda de ecuación (nuevo): «rigidez del resorte»
- `src/content/topics/animaciones-resorte.mdx:142`, Paso 1, leyenda de ecuación (nuevo): «desplazamiento inicial, soltado desde el reposo»
- `src/content/topics/animaciones-resorte.mdx:143`, Paso 1, leyenda de ecuación (nuevo): «frecuencia angular natural»
- `src/content/topics/animaciones-resorte.mdx:144`, Paso 1, leyenda de ecuación (nuevo): «periodo»
- `src/content/topics/animaciones-resorte.mdx:152`, Paso 1, «En el fenómeno» (nuevo): «El elemento cruza el destino a su rapidez máxima y sigue de largo, porque nada le quita energía: «Springs with ˋdamping: 0ˋ will run forever» <Cite id="motion-docs-spring" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:158`, Paso 1, «En la ecuación» (nuevo): «Derivo dos veces la (10.2): <Equation inline latex="\ddot u = -\omega_0^2\,u" />, la (10.1). Con los valores por omisión de Motion, 100 N/m y 1 kg, <Equation inline latex="T_0" /> = 0,63 s.»
- `src/content/topics/animaciones-resorte.mdx:167`, Paso 1, pie de figura (nuevo): «Valor animado de 100 a 1 000 con $k$ = 100 N/m, $m$ = 1 kg y $b$ = 0. Es un coseno de periodo $T_0$ = 0,63 s: vuelve a 100 en cada periodo y nunca se queda en la banda de ±2 % del destino.»
- `src/content/topics/animaciones-resorte.mdx:169`, Paso 1, fuente de la figura (nuevo): «Gráfica que calculé con la (10.2); $k$ y $m$ por omisión de Motion v14.14.0 (spring.ts L22 y L24), con $b$ = 0»
- `src/content/topics/animaciones-resorte.mdx:177`, Paso 2, título (nuevo): «El amortiguamiento viscoso»
- `src/content/topics/animaciones-resorte.mdx:179`, Paso 2 (nuevo): «Le añado una fuerza opuesta a la velocidad, <Equation inline latex="-b\,\dot u" /> <Cite id="serway-jewett-2018" sources={frontmatter.sources} />. La razón $\zeta$ compara $b$ con el amortiguamiento crítico <Equation inline latex="b_c" />.»
- `src/content/topics/animaciones-resorte.mdx:184`, Paso 2, leyenda de ecuación (nuevo): «coeficiente de amortiguamiento viscoso»
- `src/content/topics/animaciones-resorte.mdx:191`, Paso 2, leyenda de ecuación (nuevo): «razón de amortiguamiento, adimensional»
- `src/content/topics/animaciones-resorte.mdx:192`, Paso 2, leyenda de ecuación (nuevo): «amortiguamiento crítico, el de $\zeta = 1$»
- `src/content/topics/animaciones-resorte.mdx:200`, Paso 2, leyenda de ecuación (nuevo): «energía mecánica del resorte»
- `src/content/topics/animaciones-resorte.mdx:201`, Paso 2, leyenda de ecuación (nuevo): «velocidad, $\dot u$»
- `src/content/topics/animaciones-resorte.mdx:209`, Paso 2, «En el fenómeno» (nuevo): «Cada vaivén es menor: la fuerza viscosa siempre frena, y el elemento acaba en una banda alrededor del destino.»
- `src/content/topics/animaciones-resorte.mdx:215`, Paso 2, «En la ecuación» (nuevo): «Con la (10.3), <Equation inline latex="\dot E = v\,(m\dot v + k u) = -b v^2" />. Si <Equation inline latex="\zeta < 1" />, <Equation inline latex="u = A_0 e^{-\zeta\omega_0 t}\cos(\omega' t + \phi)" /> con <Equation inline latex="\omega' = \omega_0\sqrt{1-\zeta^2}" />: un coseno por una exponencial, el «damped cosine» de Apple <Cite id="wwdc23-springs" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:224`, Paso 2, pie de figura (nuevo): «Los valores por omisión de Motion, $k$ = 100 N/m, $b$ = 10 N·s/m y $m$ = 1 kg ($\zeta$ = 0,5), de 100 a 1 000. La curva queda entre las envolventes $x_\text{obj} \pm A_0 e^{-\zeta\omega_0 t}$, con $A_0 = |u_0|/\sqrt{1-\zeta^2}$, y entra para siempre en la banda de ±2 % a los 0,81 s.»
- `src/content/topics/animaciones-resorte.mdx:226`, Paso 2, fuente de la figura (nuevo): «Gráfica que calculé con la (10.6); valores por omisión de Motion v14.14.0 (spring.ts L22-L24)»
- `src/content/topics/animaciones-resorte.mdx:234`, Paso 3, título (nuevo): «Tres regímenes y ninguna duración»
- `src/content/topics/animaciones-resorte.mdx:236`, Paso 3 (nuevo): «Con cualquier <Equation inline latex="u_0" /> y <Equation inline latex="v_0" />, la (10.3) tiene tres soluciones según $\zeta$: las tres ramas del generador de Motion <Cite id="motion-v14140" sources={frontmatter.sources} />. Con ellas reproduzco, valor por valor, sus tres pruebas (cálculo propio).»
- `src/content/topics/animaciones-resorte.mdx:242`, Paso 3, leyenda de ecuación (nuevo): «velocidad inicial, por ejemplo la de un gesto»
- `src/content/topics/animaciones-resorte.mdx:243`, Paso 3, leyenda de ecuación (nuevo): «frecuencia angular amortiguada»
- `src/content/topics/animaciones-resorte.mdx:246`, Paso 3, leyenda de ecuación (nuevo): «tasas de las dos exponenciales, una lenta y una rápida»
- `src/content/topics/animaciones-resorte.mdx:256`, Paso 3, leyenda de ecuación (nuevo): «instante del primer sobrepaso»
- `src/content/topics/animaciones-resorte.mdx:257`, Paso 3, leyenda de ecuación (nuevo): «sobrepaso, como fracción del recorrido»
- `src/content/topics/animaciones-resorte.mdx:267`, Paso 3, leyenda de ecuación (nuevo): «tiempo de asentamiento: desde ahí, $|u| \le \varepsilon\,|u_0|$»
- `src/content/topics/animaciones-resorte.mdx:270`, Paso 3, leyenda de ecuación (nuevo): «ancho de la banda de reposo, como fracción del recorrido»
- `src/content/topics/animaciones-resorte.mdx:278`, Paso 3, «En el fenómeno» (nuevo): «Con <Equation inline latex="\zeta < 1" /> el elemento se pasa y oscila; con <Equation inline latex="\zeta = 1" /> llega sin pasarse; con <Equation inline latex="\zeta > 1" />, sin pasarse pero más tarde. Ninguno termina en un instante preciso.»
- `src/content/topics/animaciones-resorte.mdx:284`, Paso 3, «En la ecuación» (nuevo): «La (10.7) es la (10.6) en el primer <Equation inline latex="v = 0" />; la (10.8), cuándo la envolvente cae a $\varepsilon$. El asentamiento depende de $\zeta$, <Equation inline latex="\omega_0" />, $\varepsilon$ y del estado inicial: no hay una duración. Con una banda del 2 %, <Equation inline latex="\zeta = 0{,}8" /> entra antes que el crítico (cálculo propio).»
- `src/content/topics/animaciones-resorte.mdx:293`, Paso 3, pie de figura (nuevo): «Las tres pruebas del resorte de Motion, de 100 a 1 000 con $m$ = 1 kg: subamortiguada ($k$ = 300 N/m, $b$ = 10 N·s/m), crítica (100 y 20) y sobreamortiguada (300 y 100). Las curvas son la (10.6); los puntos, los valores que cada prueba espera cada 0,2 s, y coinciden al redondear.»
- `src/content/topics/animaciones-resorte.mdx:295`, Paso 3, fuente de la figura (nuevo): «Gráfica que calculé con la (10.6); valores esperados de la prueba spring.test.ts de Motion v14.14.0, L41-L121»
- `src/content/topics/animaciones-resorte.mdx:306`, Paso 4, título (nuevo): «Lo que hace una biblioteca real»
- `src/content/topics/animaciones-resorte.mdx:308`, Paso 4 (nuevo): «Si el destino cambia a mitad de camino, la biblioteca reinicia la (10.6) desde el estado actual; Motion pasa ˋvalue.getVelocity()ˋ a la animación nueva <Cite id="motion-v14140" sources={frontmatter.sources} />. Apple cambió $m$, $k$ y $b$ («they're not very intuitive» <Cite id="wwdc23-springs" sources={frontmatter.sources} />) por una duración $d$ y un rebote $\beta$ <Cite id="apple-spring" sources={frontmatter.sources} />. Un umbral de reposo corta la cola.»
- `src/content/topics/animaciones-resorte.mdx:314`, Paso 4, leyenda de ecuación (nuevo): «instante en que cambia el destino»
- `src/content/topics/animaciones-resorte.mdx:315`, Paso 4, leyenda de ecuación (nuevo): «el destino nuevo»
- `src/content/topics/animaciones-resorte.mdx:323`, Paso 4, leyenda de ecuación (nuevo): «duración perceptual: $\omega_0 = 2\pi/d$»
- `src/content/topics/animaciones-resorte.mdx:326`, Paso 4, leyenda de ecuación (nuevo): «rebote: $\zeta = 1 - \beta$; 0 es crítico y 1, sin amortiguar»
- `src/content/topics/animaciones-resorte.mdx:335`, Paso 4, leyenda de ecuación (nuevo): «umbral de rapidez; Motion usa 2 px/s»
- `src/content/topics/animaciones-resorte.mdx:338`, Paso 4, leyenda de ecuación (nuevo): «umbral de distancia; Motion usa 0,5 px, «selected empirically»»
- `src/content/topics/animaciones-resorte.mdx:348`, Paso 4, «En el fenómeno» (nuevo): «Interrumpido, el resorte sigue con su velocidad y vuelve sin sacudida; una curva con duración arranca otra vez desde el reposo, y su velocidad cae a cero de golpe.»
- `src/content/topics/animaciones-resorte.mdx:354`, Paso 4, «En la ecuación» (nuevo): «Con la (10.9), $x$ y $v$ son continuas en <Equation inline latex="t^*" />; solo salta la aceleración, una cantidad finita por la (10.3). La (10.10) da <Equation inline latex="\omega_0 = 2\pi/d" /> y <Equation inline latex="\zeta = 1 - \beta" />: con 0,5 s y 0,3, los 157,9 N/m y 17,6 N·s/m de Apple (tabla 10.2).»
- `src/content/topics/animaciones-resorte.mdx:363`, Paso 4, pie de figura (nuevo): «La transición por omisión de Motion para una traslación ($k$ = 500 N/m, $b$ = 25 N·s/m) frente a una curva ease-in-out que dura 0,26 s, lo que tarda el resorte en asentarse al 2 %. A $t^*$ = 0,10 s el destino vuelve a 100. Arriba, la posición; abajo, la velocidad: la del resorte sigue en unos 6 680 px/s y la de la curva cae de 5 330 px/s a 0.»
- `src/content/topics/animaciones-resorte.mdx:365`, Paso 4, fuente de la figura (nuevo): «Gráfica que calculé con las (10.6) y (10.9); $k$ y $b$ de Motion v14.14.0 (default-transitions.ts L4-L9); curva ease-in-out, cubic-bezier(0.42, 0, 0.58, 1), de CSS Easing Functions Level 1 (W3C)»
- `src/content/topics/animaciones-resorte.mdx:393`, caso de uso, «El caso concreto» (nuevo): «Motion (antes Framer Motion, licencia MIT) anima interfaces web <Cite id="motion-blog-2024" sources={frontmatter.sources} />. Su generador ˋspringˋ (tag v14.14.0, commit ˋf95ab94ˋ) escribe las tres ramas de la (10.6) <Cite id="motion-v14140" sources={frontmatter.sources} />. Apple explica el porqué en la WWDC23 <Cite id="wwdc23-springs" sources={frontmatter.sources} />; desde iOS 17, los resortes animan SwiftUI por omisión <Cite id="apple-animation-default" sources={frontmatter.sources} />. En Android, Material 3 pasó de duraciones con curvas de Bézier a tokens con $k$ y $\zeta$ <Cite id="androidx" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:399`, caso de uso, «La ecuación» (nuevo): «ˋreturn s.target - c.env * (c.A * c.sin + s.delta * c.cos)ˋ (L392) es la (10.6) si ˋs.deltaˋ vale <Equation inline latex="-u_0" /> y ˋs.velocityˋ, <Equation inline latex="-v_0" />. ˋdamping / (2 * Math.sqrt(stiffness * mass))ˋ (L314) es la (10.4), y la escala hacia 0 usa ˋ2 * Math.sqrt(550)ˋ: el crítico exacto, para que la escala no se vuelva negativa.»
- `src/content/topics/animaciones-resorte.mdx:405`, caso de uso, «Por qué modelar la física» (nuevo): «Una curva con duración «is just a prespecified curve, so there's no way to represent an initial velocity» <Cite id="wwdc23-springs" sources={frontmatter.sources} />. El resorte acepta cualquier distancia y cualquier <Equation inline latex="v_0" />: un gesto o una animación interrumpida entregan su velocidad sin salto (figura 10.4). Con curvas haría falta una por caso.»
- `src/content/topics/animaciones-resorte.mdx:411`, caso de uso, «Qué se gana y qué cuesta» (nuevo): «Gano continuidad de velocidad con solo tres números, $m$, $k$ y $b$. Cuesta no tener duración («a bit unpredictable», dice Apple <Cite id="wwdc23-springs" sources={frontmatter.sources} />), umbrales empíricos, parámetros sin objeto real y trampas numéricas: la 14.7.0 corrigió sobreamortiguados que saltaban al destino <Cite id="motion-v14140" sources={frontmatter.sources} />. Los resortes por duración de Motion terminan a tiempo, pero ignoran la velocidad heredada <Cite id="motion-docs-transitions" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:417`, recuadro de clase, título (nuevo): «Módulo 5 · Temas 1 y 3; Módulo 2 · Temas 02 y 04, y SPAA 02»
- `src/content/topics/animaciones-resorte.mdx:419`, recuadro «Visto en clase» (nuevo): «El Módulo 5 escribe la (10.2), la (10.3), <Equation inline latex="b_c = 2\sqrt{km}" /> y la (10.5); su envolvente <Equation inline latex="e^{-(b/2m)t}" /> es la de la (10.6), porque <Equation inline latex="\zeta\omega_0 = b/2m" />. El Módulo 2 da Hooke («No corresponde usar MRUA») y la energía elástica <Equation inline latex="\tfrac12 k x^2" />. La regla B de su SPAA 02, «su velocidad se vuelve cero», es el error de la curva con duración. $\zeta$, la (10.6) completa y las (10.7) a (10.11) son extensiones.»
- `src/content/topics/animaciones-resorte.mdx:425`, «Conexiones» (nuevo): «Con el Tema 5: el mismo oscilador devuelve el gatillo al reposo, crítico o a 0,3 del crítico, con $c$ en lugar de $b$. Con el Tema 7: ˋbounceˋ de react-spring invierte la velocidad en el destino y la escala, como una restitución <Cite id="react-spring-v1012" sources={frontmatter.sources} />. Con el Tema 12: el mismo oscilador, forzado a su frecuencia natural.»

### Figuras 10.1 a 10.4 (`src/components/topics/animaciones-resorte/SpringFigure.tsx`)

- `src/components/topics/animaciones-resorte/SpringFigure.tsx:48`, rótulo en la gráfica (nuevo): «$x_\text{obj}$ ± ${PERCENT}»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:102`, rótulo en la gráfica (nuevo): «$T_0$ = ${comma(LIBRE.period, 2)} s»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:109`, título de la gráfica (nuevo): «Valor animado por un resorte sin amortiguamiento»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:115`, leyenda (nuevo): «Sin amortiguar»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:141`, nombre accesible (lo dice el lector de pantalla) (nuevo): «Valor x frente al tiempo con k = 100 N/m, m = 1 kg y b = 0, de ${TRAVEL.from} hacia ${TRAVEL.to}: un coseno que oscila entre ${TRAVEL.from} y ${2 * TRAVEL.to - TRAVEL.from}, vuelve al punto de partida cada T_0 = ${comma(LIBRE.period, 2)} s y nunca se queda en la banda de ±${PERCENT} del destino.»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:154`, rótulo en la gráfica (nuevo): «$t$ = ${comma(AMORTIGUADO.settling, 2)} s»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:162`, título de la gráfica (nuevo): «Valor animado por el resorte por omisión de Motion y su envolvente»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:168`, leyenda (nuevo): «Motion por omisión, $\zeta$ = 0,5»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:174`, leyenda (nuevo): «Envolvente $x_\text{obj} \pm A_0 e^{-\zeta\omega_0 t}$»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:194`, nombre accesible (lo dice el lector de pantalla) (nuevo): «Valor x frente al tiempo con k = 100 N/m, b = 10 N·s/m y m = 1 kg, ζ = 0,5: oscila de ${TRAVEL.from} hacia ${TRAVEL.to} con vaivenes cada vez menores, entre las dos envolventes exponenciales, y entra para siempre en la banda de ±${PERCENT} a los ${comma(AMORTIGUADO.settling, 2)} s.»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:202`, nombre del régimen en la leyenda (nuevo): «Subamortiguado»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:203`, nombre del régimen en la leyenda (nuevo): «Crítico»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:204`, nombre del régimen en la leyenda (nuevo): «Sobreamortiguado»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:236`, título de la gráfica (nuevo): «Las tres pruebas del resorte de Motion: tres regímenes desde el mismo punto»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:249`, nombre accesible (lo dice el lector de pantalla) (nuevo): «Valor x frente al tiempo, de ${TRAVEL.from} a ${TRAVEL.to}, para las tres pruebas de Motion (ζ = ${zetas}): el subamortiguado se pasa del destino y oscila, el crítico llega sin pasarse y el sobreamortiguado llega sin pasarse pero más tarde. Los puntos son los valores que esperan las pruebas cada 0,2 s y caen sobre las curvas.»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:256`, leyenda (nuevo): «Resorte, transición de Motion para $x$»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:257`, leyenda (nuevo): «Curva de duración fija, ease-in-out»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:258`, rótulo en la gráfica (nuevo): «$t^*$ = ${comma(INTERRUPTION.tStar, 2)} s»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:300`, título de la gráfica (nuevo): «Posición al interrumpir: el resorte frente a una curva de duración fija»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:313`, nombre accesible (lo dice el lector de pantalla) (nuevo): «Posición x frente al tiempo. Los dos parten de ${TRAVEL.from} hacia ${TRAVEL.to}; la curva ease-in-out dura ${comma(duration, 2)} s. A los t* = ${comma(INTERRUPTION.tStar, 2)} s el destino vuelve a ${TRAVEL.from}: el resorte sigue un poco hacia arriba y vuelve sin esquina; la curva da la vuelta en seco desde donde estaba.»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:318`, título de la gráfica (nuevo): «Velocidad al interrumpir: la del resorte es continua, la de la curva salta»
- `src/components/topics/animaciones-resorte/SpringFigure.tsx:327`, nombre accesible (lo dice el lector de pantalla) (nuevo): «Velocidad v frente al tiempo. En t* = ${comma(INTERRUPTION.tStar, 2)} s la velocidad del resorte sigue en ${speed(spring.jump.before)} px/s, sin salto; la de la curva cae a 0 desde ${speed(bezier.jump.before)} px/s, porque una curva con duración arranca siempre desde el reposo.»

### Tablas 10.1 y 10.2 (`src/lib/tables/topics/animaciones-resorte.ts`)

- `src/lib/tables/topics/animaciones-resorte.ts:42`, nombre del preajuste en la tabla (nuevo): «Motion, posición $x$ e $y$»
- `src/lib/tables/topics/animaciones-resorte.ts:46`, celda «Origen» (nuevo): «Producto»
- `src/lib/tables/topics/animaciones-resorte.ts:47`, celda «Origen» (nuevo): «Ilustrativo»
- `src/lib/tables/topics/animaciones-resorte.ts:70`, leyenda de la tabla (nuevo): «Preajustes de resorte: los valores por omisión de Motion, el ejemplo documentado de Apple y un sobreamortiguado ilustrativo, todos con $m$ = 1 kg. $\\zeta$ es la (10.4), $M_p$ la (10.7) y $t_s$ el último instante fuera de la banda de ±2 % del recorrido, partiendo del reposo.»
- `src/lib/tables/topics/animaciones-resorte.ts:72`, encabezado de columna (nuevo): «Preajuste»
- `src/lib/tables/topics/animaciones-resorte.ts:73`, encabezado de columna (nuevo): «$k$»
- `src/lib/tables/topics/animaciones-resorte.ts:74`, encabezado de columna (nuevo): «$b$»
- `src/lib/tables/topics/animaciones-resorte.ts:75`, encabezado de columna (nuevo): «$m$»
- `src/lib/tables/topics/animaciones-resorte.ts:76`, encabezado de columna (nuevo): «$\\zeta$»
- `src/lib/tables/topics/animaciones-resorte.ts:77`, encabezado de columna (nuevo): «$M_p$»
- `src/lib/tables/topics/animaciones-resorte.ts:78`, encabezado de columna (nuevo): «$t_s$ al 2 %»
- `src/lib/tables/topics/animaciones-resorte.ts:79`, encabezado de columna (nuevo): «Origen»
- `src/lib/tables/topics/animaciones-resorte.ts:80`, encabezado de columna (nuevo): «Fuente»
- `src/lib/tables/topics/animaciones-resorte.ts:84`, fuente de la tabla (nuevo): «Motion v14.14.0 (tag v14.14.0, commit f95ab94), licencia MIT, y Apple Developer Documentation (SwiftUI, Spring). Son cálculo propio con el núcleo del sitio: el $k$ y el $b$ del ejemplo de Apple, con la (10.10) a 0,5 s y rebote 0,3; el $b$ de la escala hacia 0, $2\\sqrt{550}$; y $\\zeta$, $M_p$ y $t_s$ de todas las filas.»
- `src/lib/tables/topics/animaciones-resorte.ts:89`, celda «Cálculo propio» (nuevo): «$k$ = ${comma(k, PARAM_DECIMALS)} N/m, $b$ = ${comma(b, PARAM_DECIMALS)} N·s/m»
- `src/lib/tables/topics/animaciones-resorte.ts:98`, celda «Llamada» (nuevo): «Apple, SwiftUI: ${forward.call}»
- `src/lib/tables/topics/animaciones-resorte.ts:99`, celda «Conversión» (nuevo): «$k = m\,(2\pi/d)^2$, $b = 4\pi m\,(1-\beta)/d$»
- `src/lib/tables/topics/animaciones-resorte.ts:105`, celda «Llamada» (nuevo): «Apple, SwiftUI: ${inverse.call}»
- `src/lib/tables/topics/animaciones-resorte.ts:106`, celda «Conversión» (nuevo): «$d = 2\pi/\omega_0$, $\beta = 1 - \zeta$»
- `src/lib/tables/topics/animaciones-resorte.ts:107`, celda «Cálculo propio» (nuevo): «$d$ = ${comma(period, 2)} s, $\beta$ = ${comma(bounce, 1)}»
- `src/lib/tables/topics/animaciones-resorte.ts:121`, celda «Llamada» (nuevo): «Motion: spring() por omisión, visualDuration: ${visualDuration}, bounce: ${bounce}»
- `src/lib/tables/topics/animaciones-resorte.ts:122`, celda «Conversión» (nuevo): «$\omega_0 = 2\pi/(${factor}\,T_v)$, $\zeta = \text{máx}(1-\beta;\ ${texNumber(minDampingRatio, 2)})$, $b = 2\zeta\sqrt{k m}$»
- `src/lib/tables/topics/animaciones-resorte.ts:128`, celda «Llamada» (nuevo): «Motion: bounce: 0, al cumplirse visualDuration»
- `src/lib/tables/topics/animaciones-resorte.ts:129`, celda «Conversión» (nuevo): «la (10.6) crítica en $t = T_v$, con $\omega_0 T_v = 2\pi/${factor}$»
- `src/lib/tables/topics/animaciones-resorte.ts:130`, celda «Cálculo propio» (nuevo): «${comma(progress * PERCENT, 2)} % del recorrido»
- `src/lib/tables/topics/animaciones-resorte.ts:131`, celda «Lo que publica la fuente» (nuevo): ««bounce 0 is 96.68% of the way at visualDuration»»
- `src/lib/tables/topics/animaciones-resorte.ts:140`, leyenda de la tabla (nuevo): «Los parámetros perceptuales de Apple y de Motion, duración y rebote, convertidos a $k$ y $b$ con la (10.10) y $m$ = 1 kg: lo que calculo frente a lo que publica la fuente. En Motion, $T_v$ es visualDuration.»
- `src/lib/tables/topics/animaciones-resorte.ts:142`, encabezado de columna (nuevo): «Llamada»
- `src/lib/tables/topics/animaciones-resorte.ts:143`, encabezado de columna (nuevo): «Conversión»
- `src/lib/tables/topics/animaciones-resorte.ts:144`, encabezado de columna (nuevo): «Cálculo propio»
- `src/lib/tables/topics/animaciones-resorte.ts:145`, encabezado de columna (nuevo): «Lo que publica la fuente»
- `src/lib/tables/topics/animaciones-resorte.ts:146`, encabezado de columna (nuevo): «Fuente»
- `src/lib/tables/topics/animaciones-resorte.ts:150`, fuente de la tabla (nuevo): «Apple Developer Documentation (SwiftUI, Spring), ejemplos de su resumen; Motion v14.14.0 (tag v14.14.0, commit f95ab94), packages/motion-dom/src/animation/generators/spring.ts y su prueba. La conversión de Apple sale de su ejemplo: la diapositiva de la WWDC23 trae una errata en la fórmula de damping.»

### Preajustes mostrados en la tabla 10.1 (`src/lib/data/springPresets.ts`)

- `src/lib/data/springPresets.ts:10`, prefijo de las fuentes de Motion en la columna «Fuente» de la tabla 10.1 (nuevo): «Motion v14.14.0, packages/motion-dom/src/animation»
- `src/lib/data/springPresets.ts:25`, nombre del preajuste en la tabla 10.1 (y en el selector del laboratorio) (nuevo): «Motion, por omisión»
- `src/lib/data/springPresets.ts:28`, celda «Fuente» de la tabla 10.1 (nuevo): «${MOTION}/generators/spring.ts L22-L24»
- `src/lib/data/springPresets.ts:32`, nombre del preajuste en la tabla 10.1 (y en el selector del laboratorio) (nuevo): «Motion, posición x e y»
- `src/lib/data/springPresets.ts:35`, celda «Fuente» de la tabla 10.1 (nuevo): «${MOTION}/utils/default-transitions.ts L4-L18»
- `src/lib/data/springPresets.ts:39`, nombre del preajuste en la tabla 10.1 (y en el selector del laboratorio) (nuevo): «Motion, escala hacia 0»
- `src/lib/data/springPresets.ts:42`, celda «Fuente» de la tabla 10.1 (nuevo): «${MOTION}/utils/default-transitions.ts L11-L18 (L16: damping: target === 0 ? 2 * Math.sqrt(550) : 30)»
- `src/lib/data/springPresets.ts:46`, nombre del preajuste en la tabla 10.1 (y en el selector del laboratorio) (nuevo): «Apple, ejemplo de la documentación»
- `src/lib/data/springPresets.ts:49`, celda «Fuente» de la tabla 10.1 (nuevo): «${APPLE_FORWARD_EXAMPLE.source}: ${APPLE_FORWARD_EXAMPLE.call} da ${APPLE_FORWARD_EXAMPLE.printed}» (en la página: «Apple Developer Documentation, SwiftUI, Spring (https://developer.apple.com/documentation/swiftui/spring): Spring(duration: 0.5, bounce: 0.3) da (1.0, 157.9, 17.6)»)
- `src/lib/data/springPresets.ts:53`, nombre del preajuste en la tabla 10.1 (y en el selector del laboratorio) (nuevo): «Sobreamortiguado»
- `src/lib/data/springPresets.ts:57`, celda «Fuente» de la tabla 10.1 (nuevo): «supuesto del modelo: el doble del amortiguamiento crítico, con la rigidez y la masa de Motion por omisión»

### Fuentes mostradas en las tablas 10.1 y 10.2 (`src/lib/data/springReferences.ts`)

- `src/lib/data/springReferences.ts:65`, celda «Fuente» de las tablas 10.1 (preajuste de Apple) y 10.2 (nuevo): «Apple Developer Documentation, SwiftUI, Spring (https://developer.apple.com/documentation/swiftui/spring)»
- `src/lib/data/springReferences.ts:114`, celda «Fuente» de la tabla 10.2 (MOTION es «Motion v14.14.0 (commit f95ab94), packages/motion-dom/src/animation/generators») (nuevo): «${MOTION}/spring.ts L28-L29, L40, L42-L50 y L240-L248, y su prueba spring.test.ts L473-L475»

### Laboratorio (figura 10.5, `src/components/topics/animaciones-resorte/`, tarea 5)

Todo es nuevo («antes» vacío). Elecciones de Claude que se ven en el texto:

- El recurso es la figura 10.5, con la insignia «Simulación interactiva»; las figuras 10.1 a 10.4 siguen sin ella.
- La tarjeta de comparación es la `ease-in-out` de la figura 10.4 (fallo R14), no la `cubic-bezier(0.25, 0.1, 0.25, 1)`
  del plan, y se llama «Curva de duración fija». Dura el $t_s$ al 2 % del resorte en cada tramo; si el resorte no tiene
  $t_s$ ($b = 0$, o un tramo que empieza dentro de la banda) dura la $d = 2\pi/\omega_0$ de la (10.10), y el resumen lo
  dice.
- «Interrumpir» en reposo aplica la (10.11) con los umbrales de Motion (0,5 px y 2 px/s): el resorte arranca desde su
  destino con $v = 0$ y solo cambia el destino. En el inicio, en pausa, el botón espera.
- El asentamiento sin amortiguamiento se escribe «nunca» en el resumen bajo el lienzo, no en las lecturas: una lectura
  del laboratorio solo muestra números.
- En el selector, el ejemplo de Apple se llama «Apple, ejemplo (producto)»: con el texto al 200 % el nombre completo
  hacía el selector más ancho que la tarjeta. El nombre completo sigue en la nota del preajuste y en la tabla 10.1.

En la página:

- `src/content/topics/animaciones-resorte.mdx:373`, pie de la figura 10.5: — → «Laboratorio del resorte: una tarjeta
  que mueve la (10.6) y, debajo, otra con una curva ease-in-out que dura el $t_s$ del resorte. Mueve $k$, $b$ y $m$
  para pasar por los tres regímenes; «Interrumpir» aplica la (10.9): el resorte conserva $x$ y $v$, y la curva arranca
  otra vez desde el reposo.»
- `src/content/topics/animaciones-resorte.mdx:375`, fuente de la figura 10.5: — → «Simulación que programé sobre
  src/lib/physics/dampedSpring.ts; preajustes de Motion v14.14.0 y de Apple (tabla 10.1); curva ease-in-out,
  cubic-bezier(0.42, 0, 0.58, 1), de CSS Easing Functions Level 1 (W3C)»
- `src/content/topics/animaciones-resorte.mdx:380`, «Cómo se usa», última línea (las velocidades salen de
  `SPRING_SPEEDS`): — → «A 1× la reproducción va en tiempo real, como en una interfaz, donde la animación dura menos de
  un segundo; con 0,1× o 0,25× se ven el sobrepaso y la interrupción de un resorte rígido.»
- `src/content/topics/animaciones-resorte.mdx:381`, «Qué deja fuera el modelo»: — → «Calculo cada cuadro con la
  solución analítica (10.6), exacta en cualquier $t$, como el generador de Motion: no integro paso a paso.
  react-spring avanza con Euler semiimplícito en pasos de 1 ms, y el gatillo del Tema 5 en pasos de 1/4 800 s; su
  error crece con $\omega_0\,\Delta t$, y aquí no aparece. La unidad de longitud se cancela en $k/m$ y en $b/m$, así que
  $k$ en N/m vale igual con $x$ en píxeles; $m$ = 1 kg es la convención de las bibliotecas, no una masa real. Tampoco
  entran el gesto que entrega una $v_0$ al soltar ni la duración y el rebote de Apple, que con la (10.10) dan otros $k$
  y $b$, no otra física. De los umbrales con que Motion da la animación por terminada solo uso el reposo al
  interrumpir.»

En el laboratorio (`SpringLab.tsx`, `springLabText.ts`, `SpringNotes.tsx`, `SpringPlot.tsx`, `SpringCard.tsx`,
`springScene.ts`, `springLabPresets.ts`; los `${…}` son valores que calcula el núcleo):

- `SpringLab.tsx:234`, título: — → «Laboratorio del resorte»
- `SpringLab.tsx:142-144`, parámetros: — → «Rigidez $k$» (N/m, de 10 a 1 000), «Amortiguamiento $b$» (N·s/m, de 0 a 100),
  «Masa $m$» (kg, de 0,1 a 5); los tres con paso 0,1
- `SpringLab.tsx:125`, botón del escenario: — → «Interrumpir»
- `springLabText.ts:55`, línea bajo «Interrumpir» cuando puede pulsarse: — → «Cambia el destino al instante: el resorte
  sigue con su velocidad y la curva arranca otra vez desde el reposo.»
- `springLabText.ts:57`, la misma línea en el inicio, en pausa (botón desactivado): — → «En el inicio no hay
  movimiento que interrumpir: reproduce o mueve la línea de tiempo.»
- `SpringLab.tsx:62-97`, lecturas (decimales fijos): — → «Razón de amortiguamiento $\zeta$» (tres), «Frecuencia
  natural $\omega_0$» (rad/s, dos), «Sobrepaso previsto $M_p$» (%, dos; la (10.7), desde el reposo), «Destino
  $x_\text{obj}$» (px, ninguno), «Posición del resorte $x$» (px, uno), «Velocidad del resorte $v$» (px/s, ninguno),
  «Posición de la curva $x$» y «Velocidad de la curva $v$» (estas dos, solo con la tarjeta de la curva)
- `SpringLab.tsx:171` y `:178`, interruptores del cajón, «Este simulador»: — → «Tarjeta con la curva de duración
  fija», «Banda de ±2 % alrededor del destino»
- `springLabText.ts:22-25`, ficha del régimen en el lienzo: — → «Sin amortiguar, $b = 0$», «Subamortiguado,
  $\zeta < 1$», «Crítico, $\zeta = 1$», «Sobreamortiguado, $\zeta > 1$»
- `springLabText.ts:36-37`, títulos de los carriles del lienzo y de las series de la gráfica: — → «Resorte», «Curva de
  duración fija»
- `springLabText.ts:114`, ficha del carril de la curva: — → «ease-in-out, $T$ = `${duración}`»
- `SpringCard.tsx:228`, rótulo bajo la marca del destino actual: — → «destino» (las marcas dicen «100 px» y
  «1 000 px»)
- `springLabText.ts:49`, «Cómo se usa», primera línea: — → «Reproduce y pulsa «Interrumpir» con las tarjetas a mitad
  de camino: el destino pasa a la otra marca. También puedes pausar, llevar la línea de tiempo o el cursor de la gráfica
  a un instante e interrumpir ahí. Cada interrupción queda en la línea de tiempo; una nueva antes de otra la reemplaza a
  ella y a las siguientes.»
- `springLabText.ts:50` (con la lista de `:40-41`), «Cómo se usa», segunda línea: — → «Atajos, con el foco en el
  lienzo (un clic en él, o Tab) o en el cursor de la gráfica: Espacio o K reproduce y pausa; I interrumpe; R vuelve al
  inicio; «,» y «.» retroceden o avanzan 1/60 s.» (antes de la revisión decía «Atajos, fuera de los campos: …»)
- `springLabText.ts:45`, nombre del lienzo para el lector de pantalla (el lienzo toma el foco para que los atajos
  funcionen): — → «Tarjetas del laboratorio. Atajos: Espacio o K reproduce y pausa; I interrumpe; R vuelve al inicio;
  «,» y «.» retroceden o avanzan 1/60 s.»
- `SpringNotes.tsx:7-11`, notas del lienzo (la segunda frase solo con la tarjeta de la curva; la última, solo con la
  banda): — → «Las dos tarjetas recorren lo mismo, de 100 px a 1 000 px. Arriba, el resorte de la (10.6), con el color
  de su régimen, como en las figuras 10.1 a 10.4. Abajo, la curva ease-in-out de duración fija, que arranca otra vez
  desde el reposo en cada interrupción. El contorno tenue marca el destino de ahora. La franja es la banda de ±2 % del
  recorrido en la que se mide $t_s$.»
- `SpringNotes.tsx:54`, `:58`, `:62`, filas del resumen: — → «Asentamiento al 2 %, $t_s$», «Curva de duración fija»,
  «Última interrupción»
- `springLabText.ts:79-85`, valor de «Asentamiento al 2 %»: — → «`${t_s}`» (sin interrupciones, p. ej. «0,81 s»);
  «nunca: con $b = 0$ el resorte no pierde energía, $dE/dt = -b v^2 = 0$»; «a los `${t}`: `${t_s}` después de la
  última interrupción»; «`${t*}`: tras la última interrupción ya no sale de la banda»
- `springLabText.ts:94-97`, valor de «Curva de duración fija»: — → «ease-in-out de `${T}`, el $t_s$ del resorte: salen
  y llegan a la vez»; o «ease-in-out de `${T}`, la $d = 2\pi/\omega_0$ de la (10.10), porque el resorte nunca se
  asienta» (o «… porque el resorte no sale de la banda»)
- `springLabText.ts:103-109`, valor de «Última interrupción»: — → «ninguna todavía: pulsa «Interrumpir» con las
  tarjetas a mitad de camino»; «a $t^*$ = `${t*}` las dos estaban en reposo: solo cambia el destino»; «a $t^*$ =
  `${t*}` el resorte sigue a `${v}`; la curva pasa de `${v_curva}` a 0»
- `springScene.ts:247-249`, eventos de la reproducción: — → «Interrupción», «Pico» (solo con $\zeta < 1$),
  «Asentamiento»
- `SpringPlot.tsx:156`, título de la gráfica: — → «Posición de las dos tarjetas, $x(t)$»
- `SpringPlot.tsx:100`, rótulo del primer sobrepaso en la gráfica: — → «$t_p$ = `${t_p}`»
- `SpringPlot.tsx:168`, nombre hablado del cursor de la gráfica: — → «Instante en la gráfica de posición»
- `SpringPlot.tsx:114`, descripción hablada de la gráfica (escrita con $x$): — → «Posición x frente al tiempo durante `${duración}`. El
  resorte, `${régimen}`, sale de 100 px hacia 1 000 px. La curva de duración fija va de 100 px a 1 000 px en `${T}`.
  Interrupciones: `${n}`, cada una cambia el destino.» (las dos últimas frases, según el caso)
- `SpringCard.tsx:342`, descripción hablada del lienzo: — → «Dos tarjetas van de 100 px a 1 000 px. El resorte,
  `${régimen}`, está en `${x}`, con destino `${x_obj}`; la curva de duración fija, en `${x}`.»
- `springLabPresets.ts:94` y `:47`, opciones del selector (texto plano): — → el nombre de `springPresets.ts` seguido de
  « (producto)» o « (ilustrativo)»; el de Apple, «Apple, ejemplo (producto)»
- `springLabPresets.ts:79`, nota de «Motion, por omisión»: — → «El generador de Motion sin opciones: $\zeta$ = 0,50, y
  la tarjeta se pasa un 16,30 % del recorrido antes de volver.»
- `springLabPresets.ts:80`, nota de «Motion, posición $x$ e $y$»: — → «La transición que Motion da a una traslación sin
  opciones propias: $\zeta$ = 0,56, con un sobrepaso del 12,03 %.»
- `springLabPresets.ts:82`, nota de «Motion, escala hacia 0»: — → «El crítico exacto, $b = 2\sqrt{k m}$, que Motion usa
  cuando la escala va a 0 para que no se vuelva negativa.»
- `springLabPresets.ts:83`, nota de «Apple, ejemplo de la documentación»: — → «La (10.10) con $d$ = 0,5 s y $\beta$ =
  0,3 da los 157,9 N/m y 17,6 N·s/m que imprime Apple: $\zeta$ = 0,70.»
- `springLabPresets.ts:84`, nota de «Sobreamortiguado»: — → «El doble del amortiguamiento crítico, $\zeta$ = 2: llega
  sin pasarse, pero tarda 1,49 s en asentarse al 2 %.»

Dos textos de la tarea 4 que cambié para que pase la guardia de glifos, que corre en esta página desde que tiene
laboratorio:

- `src/components/topics/animaciones-resorte/SpringFigure.tsx:174`, leyenda de la figura 10.2: «Envolvente
  $x_\text{obj} \pm A_0 e^{-\zeta\omega_0 t}$» → «Envolvente $x_\text{obj} \pm A_0 e^{-(b/2m)\,t}$». Es la misma
  envolvente, en la forma del Módulo 5 que ya cita el recuadro de clase ($\zeta\omega_0 = b/2m$). Con el subíndice
  dentro del exponente, el nombre hablado del botón de la leyenda decía «omega _0» con el guion bajo crudo. El pie de
  la figura conserva $e^{-\zeta\omega_0 t}$.
- `src/content/topics/animaciones-resorte.mdx:215`, Paso 2, «En la ecuación»: «… $\cos(\omega' t + \phi)$» →
  «… $\cos(\omega' t + \varphi)$». La ϕ de `\phi` no está en IBM Plex y se dibujaba con DejaVu Sans; la φ de
  `\varphi` sí está (el Tema 4 la usa), y es la del libro para la fase.

## Tema 11

Página nueva, «Síntesis de sonido: armónicos, timbre y el sintetizador» (rama `entrega-final-tema-11`, tarea 7, con la
ronda de corrección 1 del 20 de noviembre). Todo es nuevo («antes» vacío). Los `${…}` de los componentes son números que
salen de las medidas (`src/data/instrument-harmonics.json`); abajo los escribo como se ven hoy. Elecciones de Claude que
se ven en el texto:

- **Dónde va el recurso.** Las dos grabaciones analizadas (figura 11.4, la única con insignia) van en el paso 4, «Dos
  instrumentos reales»: así sus análisis citan (11.3), (11.4), (11.6) y (11.7) hacia atrás. Los pasos 1 a 3 llevan figuras
  propias con los mismos ejes: un tono puro (11.1), un diagrama de los modos de los dos tubos (11.2, figura nueva) y la
  onda cuadrada frente al diente de sierra (11.3).
- **Temas relacionados:** `control-haptico` y `gravedad-artificial` (la (11.1) es la proyección del MCU del hábitat). El
  Tema 10 no existe aún en esta rama; la tarea 17 añade `animaciones-resorte` y `resonancia-estructural`.
- **El bemol.** IBM Plex no tiene «♭»: en lo que se ve lo compone KaTeX («si$\flat$», «mi$\flat$4»); en lo que se oye
  dice «si bemol», «mi bemol 4». En las líneas de fuente y en la lista de fuentes lo escribo en palabras, «si bemol»: una
  línea de fuente admite fórmulas (la de la figura 11.2 lleva $v$), pero ahí elegí la palabra.
- **Números corregidos frente a la investigación** (decisión R9): $f_1$ = 310,10 y 310,34 Hz, a 1,4 cents; los pares
  del clarinete, «entre 21 y 37 dB por debajo del fundamental». No publico las correlaciones de resíntesis.
- **La (11.6) lleva una segunda relación**, $\rho = (P_\text{imp} - P_\text{par})/(P_\text{imp} + P_\text{par})$ (cálculo
  propio, con prueba): predice 0,995 y −0,083 y mido 0,992 y −0,084. Es lo que conecta los dB de los armónicos con lo que
  se ve en la forma de onda.
- **La (11.5)** se escribe con $t/T$: la §1.28.4 de la especificación escribe $t$ medido en periodos, de 0 a 1 en cada
  ciclo, y así la página no cambia de unidad. Lo dice la leyenda de la (11.5), en la entrada $t/T$.
- **El oído y la fase (Helmholtz, decisión R18).** El pie de la figura 11.4 explica por qué muestro amplitudes y no fases,
  con la cita de Helmholtz y la salvedad de Ellis sobre Koenig («a slight modification»); el paso 4 lo cita en la prosa.
  Es la fuente 12, a la que apuntará el interruptor «Fases aleatorias» del laboratorio (tarea 8).
- **Formas de onda y espectros de los pasos 1 y 3** usan el $f_1$ del clarinete, 310,10 Hz, para que el corchete de $T$
  sea el mismo que en las grabaciones. La forma de onda muestra cuatro periodos y el espectro, $n$ = 1…12 (la tarea; el
  spec decía tres periodos y $n$ = 1…10).
- **Marcas:** el ataque en 0:00, antes de que termine el ataque de cada grabación, y el sostenido en 0:01, dentro de la
  ventana de análisis de cada una (la e2e comprueba adónde cae cada salto).
- **Línea de fuente de las grabaciones** en primera persona (decisión R12), sin cursiva: una línea de fuente no admite
  marcas de cursiva.
- **Punteros «fuente N».** Las líneas de fuente y los análisis que no pueden llevar un enlace [n] (los de los audios)
  nombran la fuente por su número: 1 (W3C), 3 (MIS), 4 y 6 (Wolfe), 5 (Wolfe, tubos) y 12 (Helmholtz). Una prueba
  comprueba que cada número sigue apuntando a esa fuente.

### Ronda de corrección 1 (20 de noviembre): lo que cambió

- caso de uso, «El caso concreto»: «…del W3C es el sintetizador de cada navegador: un ˋOscillatorNodeˋ toca una ˋPeriodicWaveˋ hecha con las amplitudes de sus armónicos [1].…» → «…del W3C (Recomendación del 17 de junio de 2021) es el sintetizador de cada navegador: un ˋOscillatorNodeˋ toca una ˋPeriodicWaveˋ, una receta de armónicos [1].…»
- Paso 4: «…en mi$\flat$4, fortísimo y sin vibrato [3], y mido sus recetas… la exponencial de ˋsetTargetAtTimeˋ [1].» → «…(mi$\flat$4, fortísimo, sin vibrato) [3] y mido sus recetas… la exponencial de ˋsetTargetAtTimeˋ (§1.6.2) [1].»
- Paso 4, «En el fenómeno»: «Con el mismo tono cambian los armónicos y el arranque.…» → «Con el mismo tono cambian los armónicos y el arranque, no las fases, que casi no se oyen [12].…»
- Paso 4, «En la ecuación»: «…[9], y una ˋPeriodicWaveˋ, periódica por definición, no la puede tocar.…» → «…[9]: una ˋPeriodicWaveˋ, periódica por definición, no puede tocarla.…»
- pie de la figura 11.4: (dos frases) → se añade la frase de Helmholtz (abajo, en la entrada del pie)
- recuadro «Visto en clase»: «…El Módulo 1 da $T = 2\pi/\omega$ y $f = 1/T$ en el MCU, con $\omega$ como frecuencia angular.…» → «…El Módulo 1 da $T = 2\pi/\omega$ y $f = 1/T$ del MCU, con $\omega$ como velocidad angular; aquí, la frecuencia angular.…» (el curso la llama «velocidad angular»)
- recuadro Chrome Music Lab: «…es $f_n = n f_1$, con seis armónicos [10].…» → «…es $f_n = n f_1$ [10].…»
- Paso 2 y otros recortes de prosa (para seguir en 650): «…abierto en los dos extremos…» · «…Las dos ecuaciones dicen…» · «…cambia la sonoridad entre recetas (§1.28.5)…» · «Un sintetizador escribe esa diferencia…» · «…la presión del aire en un punto oscila…» · «…con varios armónicos haría…» → «…abierto en ambos extremos…» · «…Las dos dicen…» · «…cambia la sonoridad (§1.28.5)…» · «Un sintetizador la escribe…» · «…la presión del aire oscila…» · «…con armónicos haría…»
- análisis del sostenido del clarinete: «…según Wolfe (UNSW).…» → «…según Wolfe (fuente 6).…»
- análisis conjunto, «Lo que el espectro no cuenta»: «…Wolfe advierte que los libros de introducción dan a entender que el espectro decide el timbre de un instrumento y que,…» → «…Wolfe (fuente 4) advierte que los libros de introducción a veces dan a entender que el espectro es la contribución dominante al timbre de un instrumento y que,…»
- tabla 11.1, leyenda: «…el coeficiente $b_n$ de cada armónico…, son valores del producto…» → «…los coeficientes $b_n$ de cada armónico…, son valores del producto…»
- tabla 11.3, «Intérprete y fecha» del clarinete: «Christine Bellomy, 3 de agosto de 1998; Buffet R13» → «Christine Bellomy, clarinete Buffet R13, 3 de agosto de 1998» (el mismo texto que la línea de crédito, de una sola fuente de datos)

### Página (`src/content/topics/sintesis-sonido.mdx`)

- `src/content/topics/sintesis-sonido.mdx:5`, título corto: «Síntesis de sonido»
- `src/content/topics/sintesis-sonido.mdx:6`, concepto: «Tono puro, modos normales de un tubo y superposición de armónicos (series de Fourier): por qué una flauta y un clarinete en la misma nota no suenan igual, y cómo un sintetizador escribe un timbre como una receta de amplitudes.»
- `src/content/topics/sintesis-sonido.mdx:9`, caso de uso, producto: «Web Audio API del W3C (OscillatorNode y PeriodicWave) y su implementación en Chromium»
- `src/content/topics/sintesis-sonido.mdx:10`, caso de uso, industria: «Navegadores web y síntesis de audio por software»
- `src/content/topics/sintesis-sonido.mdx:11` y siguientes, lista de fuentes (lo que va en castellano):
  - fuente 1 (`:12`): «Web Audio API» · «Paul Adenot y Hongchan Choi (editores), W3C» · «Recomendación del W3C, 17 de junio de 2021: §1.6.2, §1.9, §1.26 y §1.28.4 a §1.28.6»
  - fuente 2 (`:19`): «Chromium 160.0.8168.1 (commit 22cf9aec), periodic_wave_handler.cc» · «The Chromium Authors» · «Repositorio de Chromium, licencia BSD; third_party/blink/renderer/modules/webaudio/periodic_wave_handler.cc L42-L54, L80-L87, L105-L109, L320-L335 y L408-L428»
  - fuente 3 (`:26`): «Musical Instrument Samples» · «University of Iowa Electronic Music Studios, dir. Lawrence Fritts» · «University of Iowa; flauta de Sonja Feig (2000) y clarinete en si bemol de Christine Bellomy (1998), grabados en cámara anecoica»
  - fuente 4 (`:32`): «What is a Sound Spectrum?» · «Joe Wolfe» · «Music Acoustics, UNSW Sydney»
  - fuente 5 (`:38`): «Open vs Closed pipes (Flutes vs Clarinets)» · «Joe Wolfe» · «Music Acoustics, UNSW Sydney»
  - fuente 6 (`:44`): «Clarinet acoustics: an introduction» · «Joe Wolfe» · «Music Acoustics, UNSW Sydney»
  - fuente 7 (`:50`): «How harmonic are harmonics?» · «Joe Wolfe» · «Music Acoustics, UNSW Sydney»
  - fuente 8 (`:56`): «University Physics, Volume 1: §15.3, §16.6 y §17.4» · «William Moebs, Samuel J. Ling y Jeff Sanny» · «OpenStax, Rice University»
  - fuente 9 (`:63`): «Physical Audio Signal Processing: Dispersion Filter-Design» · «Julius O. Smith III» · «CCRMA, Stanford University»
  - fuente 10 (`:69`): «Chrome Music Lab, «Harmonics & Strings» (commit e54bb41)» · «Google Creative Lab» · «Repositorio googlecreativelab/chrome-music-lab en GitHub, licencia Apache-2.0; harmonics & strings/js/Harmonic.js L66-L71 y L257, index.js L36-L37»
  - fuente 11 (`:76`): «Electrical musical instrument, patente US 1 956 350» · «Laurens Hammond» · «Oficina de Patentes de los Estados Unidos, concedida el 24 de abril de 1934»
  - fuente 12 (`:83`): «On the Sensations of Tone, parte I, capítulo VI» · «Hermann L. F. Helmholtz; traducción y notas de Alexander J. Ellis» · «2.ª edición inglesa, reimpresión de 1895, págs. 126 y 127; dominio público, en Internet Archive»
- `src/content/topics/sintesis-sonido.mdx:93`, «Con lo visto en clase», tema: «Tema 4 · Resonancia, Sistemas Acoplados y Ondas Armónicas/Sonoras · Ondas Armónicas y Sonoras»
- `src/content/topics/sintesis-sonido.mdx:94`, «Con lo visto en clase», nota: «Cada partícula del medio hace un MAS, $y(x,t) = A\sin(kx - \omega t)$; en un punto fijo es la (11.1).»
- `src/content/topics/sintesis-sonido.mdx:96`, «Con lo visto en clase», tema: «Tema 4 · Resonancia, Sistemas Acoplados y Ondas Armónicas/Sonoras · Sistemas Acoplados»
- `src/content/topics/sintesis-sonido.mdx:97`, «Con lo visto en clase», nota: «Los modos normales, que según el módulo explican el acoplamiento acústico en los instrumentos: en un tubo son los de las (11.2) y (11.3).»
- `src/content/topics/sintesis-sonido.mdx:99`, «Con lo visto en clase», tema: «Tema 1.4 · Movimiento Circular Uniforme (MCU)»
- `src/content/topics/sintesis-sonido.mdx:100`, «Con lo visto en clase», nota: «$T = 2\pi/\omega$ y $f = 1/T$ en Hz: el periodo y la frecuencia de la (11.1), que es la proyección de un MCU.»
- `src/content/topics/sintesis-sonido.mdx:119`, introducción: «Una flauta y un clarinete en la misma nota no suenan igual. Un sintetizador la escribe como una receta de armónicos.»
- `src/content/topics/sintesis-sonido.mdx:121`, Paso 1, título: «Un tono puro»
- `src/content/topics/sintesis-sonido.mdx:123`, Paso 1: «El sonido más simple es un seno: la presión del aire oscila con una sola frecuencia [8].»
- `src/content/topics/sintesis-sonido.mdx:131`, Paso 1, leyenda de la (11.1): «presión acústica en un punto, respecto de la del ambiente»
- `src/content/topics/sintesis-sonido.mdx:134`, Paso 1, leyenda de la (11.1): «amplitud: fija la sonoridad»
- `src/content/topics/sintesis-sonido.mdx:135`, Paso 1, leyenda de la (11.1): «frecuencia: fija el tono, grave o agudo»
- `src/content/topics/sintesis-sonido.mdx:136`, Paso 1, leyenda de la (11.1): «periodo»
- `src/content/topics/sintesis-sonido.mdx:137`, Paso 1, leyenda de la (11.1): «tiempo»
- `src/content/topics/sintesis-sonido.mdx:145`, Paso 1, «En el fenómeno»: «Subir $f$ sube la nota; subir $A$ la hace más fuerte. Con la misma $f$ y la misma $A$, dos tonos puros suenan idénticos.»
- `src/content/topics/sintesis-sonido.mdx:151`, Paso 1, «En la ecuación»: «La (11.1) es la proyección de un MCU con $\omega = 2\pi f$. Con dos números no distingue instrumentos: le falta el timbre, lo que separa dos sonidos «which have the same pitch and the same loudness» [4].»
- `src/content/topics/sintesis-sonido.mdx:160`, pie de la figura 11.1: «Un tono puro de 310,10 Hz, el $f_1$ medido del clarinete: cuatro periodos de $T$ = 3,22 ms y su contenido armónico, una sola barra en $n$ = 1. Los ejes son los de las figuras 11.3 y 11.4.»
- `src/content/topics/sintesis-sonido.mdx:162`, fuente de la figura 11.1: «Gráfica que calculé con la (11.1); la frecuencia es la del clarinete de la figura 11.4»
- `src/content/topics/sintesis-sonido.mdx:170`, Paso 2, título: «Los modos de un tubo»
- `src/content/topics/sintesis-sonido.mdx:172`, Paso 2: «Un tubo solo deja sonar sus ondas estacionarias: abierto en ambos extremos, como la flauta, todas; cerrado en uno, como el clarinete con su caña, solo las impares [8] [5] [6].»
- `src/content/topics/sintesis-sonido.mdx:178`, Paso 2, leyenda de la (11.2): «frecuencia del modo $n$, el armónico $n$»
- `src/content/topics/sintesis-sonido.mdx:179`, Paso 2, leyenda de la (11.2): «frecuencia fundamental, la del modo 1»
- `src/content/topics/sintesis-sonido.mdx:180`, Paso 2, leyenda de la (11.2): «rapidez del sonido en el aire, unos 340 m/s»
- `src/content/topics/sintesis-sonido.mdx:181`, Paso 2, leyenda de la (11.2): «longitud efectiva del tubo»
- `src/content/topics/sintesis-sonido.mdx:191`, Paso 2, «En el fenómeno»: «Con la misma longitud, el clarinete suena «one octave lower than the flute» [5]; para dar los mismos 310 Hz, su columna de aire mide la mitad.»
- `src/content/topics/sintesis-sonido.mdx:197`, Paso 2, «En la ecuación»: «El aire no se mueve en el extremo cerrado, un nodo, y se mueve al máximo en el abierto, un vientre: solo caben $L = \lambda/4,\ 3\lambda/4,\ 5\lambda/4, \dots$, con $n$ impar. Las dos dicen qué frecuencias suenan, no cuánto.»
- `src/content/topics/sintesis-sonido.mdx:206`, pie de la figura 11.2: «Los tres primeros modos de dos tubos ideales con $f_1$ = 310 Hz, a la misma escala: el abierto-abierto mide 0,55 m y admite $n$ = 1, 2 y 3; el cerrado-abierto mide 0,27 m y solo $n$ = 1, 3 y 5. Las curvas son la amplitud del desplazamiento del aire: vientres en los extremos abiertos, un nodo en el cerrado.»
- `src/content/topics/sintesis-sonido.mdx:208`, fuente de la figura 11.2: «Diagrama que dibujé con las (11.2) y (11.3) y $v$ ≈ 340 m/s de Wolfe (UNSW), fuente 5; longitudes efectivas (cálculo propio), sin la corrección de extremo»
- `src/content/topics/sintesis-sonido.mdx:216`, Paso 3, título: «La receta de armónicos»
- `src/content/topics/sintesis-sonido.mdx:218`, Paso 3: «Toda vibración que se repite cada $T$ es una suma de armónicos [4]. La Web Audio API la escribe con senos y cosenos [1].»
- `src/content/topics/sintesis-sonido.mdx:224`, Paso 3, leyenda de la (11.4): «amplitud del armónico $n$»
- `src/content/topics/sintesis-sonido.mdx:225`, Paso 3, leyenda de la (11.4): «fase del armónico $n$»
- `src/content/topics/sintesis-sonido.mdx:226`, Paso 3, leyenda de la (11.4): «número de armónicos de la receta»
- `src/content/topics/sintesis-sonido.mdx:236`, Paso 3, leyenda de la (11.5): «coeficientes de coseno y de seno: los arreglos real e imag de una PeriodicWave»
- `src/content/topics/sintesis-sonido.mdx:240`, Paso 3, leyenda de la (11.5): «tiempo medido en periodos, de 0 a 1 en cada ciclo: la §1.28.4 lo escribe $t$»
- `src/content/topics/sintesis-sonido.mdx:251`, Paso 3, leyenda de la (11.6): «correlación entre $y(t)$ y $-y(t + T/2)$ sobre periodos completos»
- `src/content/topics/sintesis-sonido.mdx:255`, Paso 3, leyenda de la (11.6): «potencia de los armónicos impares y de los pares, la suma de sus $A_n^2$»
- `src/content/topics/sintesis-sonido.mdx:264`, Paso 3, «En el fenómeno»: «Cada término se repite cada $T$: la suma conserva el tono y cambia la forma, el timbre. Con solo impares, la segunda mitad de cada periodo es la primera invertida.»
- `src/content/topics/sintesis-sonido.mdx:270`, Paso 3, «En la ecuación»: «Desarrollando $\sin(\alpha + \varphi)$, la (11.4) da la (11.5). Medio periodo multiplica el armónico $n$ por $(-1)^n$: los impares cambian de signo y los pares no. Con los dos, $\rho$ pesa sus potencias (cálculo propio).»
- `src/content/topics/sintesis-sonido.mdx:279`, pie de la figura 11.3: «Dos recetas de la Web Audio API con $f_1$ = 310,10 Hz y doce armónicos: la onda cuadrada, solo impares, y el diente de sierra, todos (tabla 11.1). En la cuadrada, $-y(t + T/2)$ cae sobre $y(t)$, como pide la (11.6); en el diente de sierra, no: $\rho$ = 0,52.»
- `src/content/topics/sintesis-sonido.mdx:281`, fuente de la figura 11.3: «Gráfica que calculé con la (11.4) y las recetas de la §1.28.6 de la Web Audio API (W3C, 2021), fuente 1»
- `src/content/topics/sintesis-sonido.mdx:291`, Paso 4, título: «Dos instrumentos reales»
- `src/content/topics/sintesis-sonido.mdx:293`, Paso 4: «Comparo una flauta y un clarinete en si$\flat$ de la University of Iowa (mi$\flat$4, fortísimo, sin vibrato) [3] y mido sus recetas con un FFT propio. Una nota real empieza y termina: la (11.7) multiplica la receta por la exponencial de ˋsetTargetAtTimeˋ (§1.6.2) [1].»
- `src/content/topics/sintesis-sonido.mdx:299`, Paso 4, leyenda de la (11.7): «envolvente: el nivel de la nota en cada instante»
- `src/content/topics/sintesis-sonido.mdx:300`, Paso 4, leyenda de la (11.7): «nivel al empezar la rampa y nivel al que tiende»
- `src/content/topics/sintesis-sonido.mdx:301`, Paso 4, leyenda de la (11.7): «instante en que empieza la rampa»
- `src/content/topics/sintesis-sonido.mdx:302`, Paso 4, leyenda de la (11.7): «constante de tiempo de la rampa»
- `src/content/topics/sintesis-sonido.mdx:313`, Paso 4, leyenda de la (11.8): «coeficiente de inarmonicidad de una cuerda rígida, adimensional; 0 en una cuerda ideal»
- `src/content/topics/sintesis-sonido.mdx:322`, Paso 4, leyenda de la (11.9): «frecuencia de muestreo del audio digital»
- `src/content/topics/sintesis-sonido.mdx:326`, Paso 4, leyenda de la (11.9): «frecuencia a la que se pliega un armónico por encima de $f_s/2$, con el entero $m$ que la deja entre 0 y $f_s/2$»
- `src/content/topics/sintesis-sonido.mdx:336`, Paso 4, «En el fenómeno»: «Con el mismo tono cambian los armónicos y el arranque, no las fases, que casi no se oyen [12]. Soplados, sus armónicos son múltiplos exactos de $f_1$; una cuerda pulsada o golpeada los estira [7].»
- `src/content/topics/sintesis-sonido.mdx:342`, Paso 4, «En la ecuación»: «La (11.8) aparta los parciales de $n f_1$ [9]: una ˋPeriodicWaveˋ, periódica por definición, no puede tocarla. La (11.9) limita la receta: con 310 Hz y 44,1 kHz caben 71 armónicos (cálculo propio).»
- `src/content/topics/sintesis-sonido.mdx:350`, pie de la figura 11.4 (el recurso): «Flauta y clarinete en si$\flat$ en la misma nota, mi$\flat$4, igualados en sonoridad: lo que cambia es el timbre. Bajo cada audio analizo dos instantes, el ataque y el sostenido, y muestro con los mismos ejes su envolvente, cuatro periodos de su forma de onda y sus doce armónicos; al final, qué diferencia produce qué. Muestro amplitudes y no fases porque el oído casi no distingue las fases: para Helmholtz, la cualidad de un sonido depende «solely on the number and relative strength of its partial simple tones, and in no respect on their differences of phase» («solo del número y la intensidad relativa de sus parciales, y en nada de sus diferencias de fase»), aunque su traductor, Ellis, anota que los experimentos de Koenig piden «a slight modification» («una ligera modificación»), fuente 12.»
- `src/content/topics/sintesis-sonido.mdx:352`, fuente de la figura 11.4 (el recurso): «Grabaciones: University of Iowa Electronic Music Studios, Musical Instrument Samples (dir. Lawrence Fritts), fuente 3: flauta de Sonja Feig (2000) y clarinete en si bemol Buffet R13 de Christine Bellomy (1998), en cámara anecoica con un micrófono Neumann KM 84. Los recorté, los pasé a mono e igualé su sonoridad a −20 LUFS; el MIS permite usarlos «for any projects, without restrictions». Envolventes, formas de onda y espectros: cálculo propio sobre los archivos originales»
- `src/content/topics/sintesis-sonido.mdx:371`, caso de uso, «El caso concreto»: «La Web Audio API del W3C (Recomendación del 17 de junio de 2021) es el sintetizador de cada navegador: un ˋOscillatorNodeˋ toca una ˋPeriodicWaveˋ, una receta de armónicos [1]. Chromium la implementa en ˋperiodic_wave_handler.ccˋ (tag 160.0.8168.1, commit ˋ22cf9aecˋ) [2].»
- `src/content/topics/sintesis-sonido.mdx:377`, caso de uso, «La ecuación»: «La §1.28.4 escribe la (11.5); la §1.28.6, las recetas de la tabla 11.1. Chromium aplica la (11.9) en tablas por tercio de octava: ˋnumber_of_partials = culling_scale * max_number_of_partialsˋ (L320-L335) recorta «just in time to truncate partials before aliasing occurs» (L105-L109).»
- `src/content/topics/sintesis-sonido.mdx:383`, caso de uso, «Por qué modelar la física»: «Una muestra grabada vale para una nota y una intensidad; transponerla con ˋplaybackRateˋ la acelera y corre su espectro (§1.9). Doce amplitudes en la (11.4) tocan ese timbre en cualquier nota y duración.»
- `src/content/topics/sintesis-sonido.mdx:389`, caso de uso, «Qué se gana y qué cuesta»: «Gano cualquier timbre periódico con pocos números. Cuesta memoria, 576 KiB por receta en 36 tablas (cálculo propio), y filtrar sobre Nyquist, un trato entre CPU y fidelidad (§1.26); normalizar al pico cambia la sonoridad (§1.28.5), y la (11.4) no tiene ataque, ruido ni inarmonicidad.»
- `src/content/topics/sintesis-sonido.mdx:395`, recuadro, título: «Otro diseño: Chrome Music Lab»
- `src/content/topics/sintesis-sonido.mdx:397`, recuadro: «Su experimento «Harmonics» usa un oscilador seno por armónico: ˋstartingFrequency * (this.ind+1)ˋ es $f_n = n f_1$ [10]. Cada armónico cuesta un oscilador; la ˋPeriodicWaveˋ, una tabla para todos.»
- `src/content/topics/sintesis-sonido.mdx:401`, recuadro, título: «Antes del software: el órgano Hammond»
- `src/content/topics/sintesis-sonido.mdx:403`, recuadro: «Su patente de 1934 ya sumaba al fundamental «the first eight harmonics» [11], tomados de la escala temperada: su quinto armónico queda 13,69 cents alto (cálculo propio).»
- `src/content/topics/sintesis-sonido.mdx:407`, recuadro «Visto en clase», título: «Módulo 5 · Tema 4, introductorio; Módulo 1 · Tema 1.4»
- `src/content/topics/sintesis-sonido.mdx:409`, recuadro «Visto en clase»: «En el Módulo 5, cada partícula del medio hace un MAS: la (11.1) en un punto; sus modos normales son, en un tubo, los de las (11.2) y (11.3). El Módulo 1 da $T = 2\pi/\omega$ y $f = 1/T$ del MCU, con $\omega$ como velocidad angular; aquí, la frecuencia angular. Las (11.2) a (11.9) son extensiones.»
- `src/content/topics/sintesis-sonido.mdx:415`, «Conexiones»: «Con el Tema 5: el actuador del DualSense vibra «like a small speaker» con $F_0\sin(\omega t)$, un tono puro; con armónicos haría la (11.4). Con el Tema 3: la (11.1) proyecta el MCU del hábitat.»

### Figura 11.4: las dos grabaciones (`src/components/topics/sintesis-sonido/`)

- `src/lib/data/instrumentSamples.ts:63`, nombres de las muestras (tarea 6; en pantalla, «♭» lo compone KaTeX: «si$\flat$»): «Flauta» · «Clarinete en si♭»
- `src/lib/data/instrumentSamples.ts:77`, intérprete y fecha de cada grabación (una sola fuente para el crédito y la tabla 11.3): «Sonja Feig, abril de 2000» · «Christine Bellomy, clarinete Buffet R13, 3 de agosto de 1998»
- `src/components/topics/sintesis-sonido/SampleAnalysis.tsx:37`, título de cada grabación: «Flauta: $f_1$ = 310,34 Hz» y «Clarinete en si$\flat$: $f_1$ = 310,10 Hz»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:88`, nombre accesible de cada audio (se oye): «Flauta, mi bemol 4 fortísimo sin vibrato» y «Clarinete en si bemol, mi bemol 4 fortísimo sin vibrato»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:95`, línea de crédito bajo cada audio (tras «Audio: »): «Sonja Feig, abril de 2000; University of Iowa, Musical Instrument Samples, archivo Flute.nonvib.ff.Eb4.stereo.aif. Lo recorté desde 0,10 s y lo igualé a −20 LUFS.» · «Christine Bellomy, clarinete Buffet R13, 3 de agosto de 1998; University of Iowa, Musical Instrument Samples, archivo BbClarinet.ff.Eb4.stereo.aif. Lo recorté desde 0,38 s y lo igualé a −20 LUFS.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:59`, flauta, marca 0:00 «El ataque»: «Desde aquí se oye cómo empieza la nota. En la envolvente, el nivel pasa del 10 al 90 % del sostenido en 0,12 s, de 0,05 a 0,17 s del audio: la flauta arranca casi de golpe. La receta (11.4) sola sonaría completa desde el primer instante; la (11.7) le da esta subida con la envolvente $E(t)$.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:64`, flauta, marca 0:01 «El sostenido»: «A 1 s la nota ya es estable: estoy dentro de la ventana de análisis. En el espectro, los seis primeros armónicos quedan a ±5 dB del fundamental y el más fuerte es el 2.º, +3,7 dB: suenan pares e impares, como pide la (11.2) en un tubo abierto. Por eso la discontinua $-y(t + T/2)$ no sigue a la continua: su correlación con $y(t)$ es −0,084 y la (11.6) no se cumple. En el 7.º armónico el nivel cae de golpe, a −18,4 dB.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:72`, clarinete, marca 0:00 «El ataque»: «El clarinete tarda 0,40 s en pasar del 10 al 90 % de su nivel, de 0,05 a 0,45 s del audio: más del triple que la flauta, y se oye cómo la nota crece. Es la envolvente $E(t)$ de la (11.7). La ventana de análisis empieza a los 0,22 s, todavía dentro de este ataque: en la envolvente, la ventana y el ataque se solapan.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:77`, clarinete, marca 0:01 «El sostenido»: «En el espectro, los armónicos pares (2, 4, 6 y 8) quedan entre 21 y 37 dB por debajo del fundamental, y el 3.º es más fuerte que el propio fundamental: +3,3 dB. Es la (11.3) de un tubo cerrado en un extremo: solo los impares forman ondas estacionarias, y esas refuerzan los impares de la caña, según Wolfe (fuente 6). Con los impares 25,7 dB por encima de los pares, la (11.6) se ve a simple vista: la discontinua $-y(t + T/2)$ cae sobre la continua, con correlación 0,992.»
- `src/components/topics/sintesis-sonido/SampleContrast.tsx:18`, título del análisis conjunto: «Qué diferencia produce qué»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:106`, análisis conjunto: «**Lo que comparten: el tono.** Las dos notas repiten su forma cada $T$ = 3,22 ms: $f_1$ = 310,10 Hz en el clarinete y 310,34 Hz en la flauta, a 1,4 cents. El corchete de $T$ mide lo mismo en las dos formas de onda: por la (11.4), el tono lo pone $f_1$, no la forma.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:110`, análisis conjunto: «**Lo que cambia: qué armónicos suenan.** Los impares pesan 25,7 dB más que los pares en el clarinete y −0,7 dB en la flauta: la (11.3) de un tubo cerrado frente a la (11.2) de uno abierto. Con el mismo tono y la misma sonoridad, esa receta es lo que distingue aquí sus timbres.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:114`, análisis conjunto: «**Dónde se ve: la simetría de media onda.** Con esas potencias, la (11.6) predice correlaciones de 0,995 y −0,083 entre $y(t)$ y $-y(t + T/2)$; mido 0,992 y −0,084. Por eso la curva discontinua solo cae sobre la continua en el clarinete.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:118`, análisis conjunto: «**Lo que el espectro no cuenta.** El ataque, de 0,40 s frente a 0,12 s (11.7), y el ruido del soplido. Wolfe (fuente 4) advierte que los libros de introducción a veces dan a entender que el espectro es la contribución dominante al timbre de un instrumento y que, «with the exception of the closed pipes mentioned above, this is very misleading» («salvo en los tubos cerrados, eso es muy engañoso»): esta pareja funciona porque el clarinete es uno.»
- `src/components/topics/sintesis-sonido/SampleAnalysis.tsx:53`, títulos de las gráficas: «Envolvente de la nota completa» · «Cuatro periodos del sostenido» · «Contenido armónico»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:142`, nombre accesible de la envolvente (se oye): «Envolvente RMS de la flauta, relativa a su sostenido: sube del 10 al 90 % en 0,12 s, de 0,05 a 0,17 s; la ventana de análisis va de 0,24 a 2,32 s y la caída, de 2,21 a 2,50 s.» · «Envolvente RMS del clarinete en si bemol, relativa a su sostenido: sube del 10 al 90 % en 0,40 s, de 0,05 a 0,45 s; la ventana de análisis va de 0,22 a 1,86 s y la caída, de 1,91 a 2,02 s.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:143`, nombre accesible de la forma de onda (se oye): «Cuatro periodos de la forma de onda de la flauta, cada uno de T = 3,22 ms. La misma curva medio periodo después e invertida no sigue a la original: correlación −0,084.» · «Cuatro periodos de la forma de onda del clarinete en si bemol, cada uno de T = 3,22 ms. La misma curva medio periodo después e invertida cae sobre la original: correlación 0,992.»
- `src/components/topics/sintesis-sonido/sampleTexts.ts:144`, nombre accesible del espectro (se oye): «Espectro de la flauta, armónicos 1 a 12 en dB respecto del fundamental: los seis primeros armónicos dentro de ±5 dB del fundamental; el más fuerte es el 2.º, con +3,7 dB. Los impares pesan −0,7 dB sobre los pares.» · «Espectro del clarinete en si bemol, armónicos 1 a 12 en dB respecto del fundamental: los pares 2, 4, 6 y 8 entre 21 y 37 dB por debajo del fundamental; el más fuerte es el 3.º, con +3,3 dB. Los impares pesan +25,7 dB sobre los pares.»

### Gráficas compartidas (figuras 11.1, 11.3 y 11.4)

- `src/components/topics/sintesis-sonido/soundPlots.ts:64`, ejes de la forma de onda: «Tiempo $t$ (ms)» · «Señal $y$ / pico (adimensional)»
- `src/components/topics/sintesis-sonido/soundPlots.ts:76`, ejes de la envolvente: «Tiempo del audio $t$ (s)» · «Nivel RMS / sostenido (adimensional)»
- `src/components/topics/sintesis-sonido/WaveformPlot.tsx:39`, rótulo del corchete: «$T$ = 3,22 ms»
- `src/components/topics/sintesis-sonido/WaveformPlot.tsx:64`, leyenda: «Señal $y(t)$» · «Medio periodo después, invertida: $-y(t + T/2)$»
- `src/components/topics/sintesis-sonido/EnvelopePlot.tsx:63`, rótulos de la envolvente: «Ataque» · «Caída» · «Ventana de análisis»; serie: «Envolvente RMS»
- `src/components/topics/sintesis-sonido/SpectrumBars.tsx:241`, línea sobre las barras (en la onda cuadrada, «sin pares» en lugar del valor): «Impares sobre pares, $n \le 10$: +25,7 dB»
- `src/components/topics/sintesis-sonido/SpectrumBars.tsx:196`, nombre accesible de la leyenda del espectro (se oye): «Leyenda del espectro»
- `src/components/topics/sintesis-sonido/SpectrumBars.tsx:199`, leyenda del espectro: «Impares, $n$ = 1, 3, 5…» · «Pares, $n$ = 2, 4, 6…» · «Rango entre ventanas de 0,25 s»
- `src/components/topics/sintesis-sonido/SpectrumBars.tsx:263`, ejes del espectro: «Armónico $n$ (adimensional)» · «$A_n/A_1$ (dB)»
- `src/components/topics/sintesis-sonido/ToneFigure.tsx:85`, título de la gráfica del paso 1: «Tono puro de 310,10 Hz»
- `src/components/topics/sintesis-sonido/ToneFigure.tsx:86`, nombres accesibles del paso 1 (se oyen): «Cuatro periodos de un seno de 310,10 Hz, cada uno de T = 3,22 ms.» · «Espectro del tono puro: una sola barra, el fundamental n = 1; no hay más armónicos.»
- `src/components/topics/sintesis-sonido/ToneFigure.tsx:33`, títulos del paso 3: «Onda cuadrada: solo impares, $A_n = 4/(n\pi)$» · «Diente de sierra: todos los armónicos, $|A_n| = 2/(n\pi)$» · «Cuatro periodos» · «Contenido armónico»
- `src/components/topics/sintesis-sonido/ToneFigure.tsx:47`, nombres accesibles del paso 3 (se oyen): «Cuatro periodos de la onda cuadrada sumada con doce armónicos, T = 3,22 ms: la misma curva medio periodo después e invertida cae sobre la original.» · «Cuatro periodos del diente de sierra sumado con doce armónicos, T = 3,22 ms: la curva medio periodo después e invertida es otra, correlación 0,52.» · «Espectro de la onda cuadrada: solo los armónicos impares 1, 3, 5, 7, 9 y 11, que bajan como 1/n; los pares no existen.» · «Espectro del diente de sierra: los doce armónicos, que bajan como 1/n.»

### Figura 11.2: los modos de los dos tubos (`PipeModes.tsx`)

- `src/components/topics/sintesis-sonido/PipeModes.tsx:37`, títulos (con la longitud que añade el componente): «Abierto-abierto (flauta): $L$ = 0,55 m» · «Cerrado-abierto (clarinete): $L$ = 0,27 m»
- `src/components/topics/sintesis-sonido/PipeModes.tsx:80`, rótulo de cada modo: «$n$ = 1 · 310 Hz» … «$n$ = 5 · 1 550 Hz»
- `src/components/topics/sintesis-sonido/PipeModes.tsx:176`, escala y leyenda: «10 cm» · «Modo impar» · «Modo par»
- `src/components/topics/sintesis-sonido/PipeModes.tsx:54`, nombre accesible (se oye; sale de los datos de los tubos): «Tres primeros modos de dos tubos ideales con fundamental de 310 Hz, a la misma escala. Abierto en los dos extremos, de 0,55 m: n = 1, 2 y 3, a 310, 620 y 930 Hz, con vientres de desplazamiento en ambos extremos. Cerrado en un extremo, de 0,27 m: solo n = 1, 3 y 5, a 310, 930 y 1 550 Hz, con un nodo en el extremo cerrado y un vientre en el abierto.»

### Tablas 11.1 a 11.3 (`src/lib/tables/topics/sintesis-sonido.ts`)

- `src/lib/tables/topics/sintesis-sonido.ts:37`, leyenda de la tabla 11.1: «Las cuatro ondas de un OscillatorNode como recetas de armónicos: los coeficientes $b_n$ de cada armónico en la (11.5), con todos los $a_n$ = 0, son valores del producto, la Web Audio API. La cuadrada y la triangular solo tienen impares; el diente de sierra tiene todos, con signo alterno.»
- encabezados de la tabla 11.1: «Armónico $n$» · «Seno, $b_1 = 1$» · «Cuadrada, $4/(n\pi)$ en impares» · «Diente de sierra, $(-1)^{n+1}\,2/(n\pi)$» · «Triangular, $8\sin(n\pi/2)/(\pi n)^2$»
- `src/lib/tables/topics/sintesis-sonido.ts:52`, fuente de la tabla 11.1: «W3C, Web Audio API, Recomendación del 17 de junio de 2021, §1.28.6; las mismas recetas en Chromium, periodic_wave_handler.cc L408-L428 (tag 160.0.8168.1)»
- `src/lib/tables/topics/sintesis-sonido.ts:84`, leyenda de la tabla 11.2: «Receta medida de las dos grabaciones: el nivel de cada armónico respecto del fundamental, como promedio de Welch con ventanas de Hann de 0,25 s sobre la ventana de análisis, y el menor y el mayor de esas ventanas. Es una medida mía sobre los originales (cálculo propio), no un valor del producto ni un supuesto: la flauta fluctúa más que el clarinete.»
- encabezados de la tabla 11.2: «Armónico $n$» · «Flauta, $A_n/A_1$ (dB)» · «Flauta, rango (dB)» · «Clarinete en si$\flat$, $A_n/A_1$ (dB)» · «Clarinete en si$\flat$, rango (dB)»
- `src/lib/tables/topics/sintesis-sonido.ts:102`, fuente de la tabla 11.2: «Cálculo propio con un FFT en TypeScript (src/lib/audio/spectrum.ts, pnpm run data:harmonics) sobre Flute.nonvib.ff.Eb4.stereo.aif y BbClarinet.ff.Eb4.stereo.aif del MIS de la University of Iowa»
- `src/lib/tables/topics/sintesis-sonido.ts:126`, leyenda de la tabla 11.3: «Las dos grabaciones del MIS de la University of Iowa y lo que medí en ellas, con el método de la investigación (cálculo propio). Los audios de la figura 11.4 son estos archivos recortados, en mono y a la misma sonoridad.»
- encabezados de la tabla 11.3: «Dato» · «Flauta» · «Clarinete en si$\flat$»
- `src/lib/tables/topics/sintesis-sonido.ts:151`, fuente de la tabla 11.3: «University of Iowa Electronic Music Studios, Musical Instrument Samples (dir. Lawrence Fritts), fichas de la flauta y del clarinete en si bemol; medidas: cálculo propio»
- `src/lib/tables/topics/sintesis-sonido.ts:132` y siguientes, filas de la tabla 11.3 (dato · flauta · clarinete):
  - «Archivo del MIS» · «Flute.nonvib.ff.Eb4.stereo.aif» · «BbClarinet.ff.Eb4.stereo.aif»
  - «Intérprete y fecha» · «Sonja Feig, abril de 2000» · «Christine Bellomy, clarinete Buffet R13, 3 de agosto de 1998»
  - «Formato del original» · «AIFF de 24 bits a 44 100 Hz, dos canales idénticos» · «AIFF de 24 bits a 44 100 Hz, dos canales idénticos»
  - «Fundamental $f_1$» · «310,34 Hz» · «310,10 Hz»
  - «Periodo $T = 1/f_1$» · «3,222 ms» · «3,225 ms»
  - «Impares sobre pares ($n \le 10$)» · «−0,7 dB» · «25,7 dB»
  - «Correlación de $y(t)$ y $-y(t + T/2)$» · «−0,084» · «0,992»
  - «Ataque, 10 → 90 %» · «0,12 s» · «0,40 s»
  - «Caída, 90 → 10 %» · «0,29 s» · «0,11 s»
  - «Audio publicado» · «desde 0,10 s del original; 2,86 s, MP3 mono a −20 LUFS» · «desde 0,38 s del original; 2,52 s, MP3 mono a −20 LUFS»
  - «Origen de los números» · «Medida propia (cálculo propio)» · «Medida propia (cálculo propio)»
  - «Permiso de uso» · ««may be downloaded and used for any projects, without restrictions», según la página del MIS» · ««may be downloaded and used for any projects, without restrictions», según la página del MIS»
- `src/lib/tables/topics/sintesis-sonido.ts:59`, tabla 11.2, rango del fundamental: «referencia»
- `src/lib/tables/topics/sintesis-sonido.ts:110`, tabla 11.3, palabras del formato: «un canal» · «dos canales» · «idénticos»

### Laboratorio (figura 11.5, tarea 8: `src/components/topics/sintesis-sonido/`)

Todo es nuevo («antes» vacío, —). Los `${…}` salen del estado o de los datos; abajo los escribo como se ven al abrir
(clarinete medido, $f_1$ = 310,1 Hz, $f_s$ = 44 100 Hz). Elecciones de Claude que se ven en el texto:

- **Dónde va.** Cierra el paso 4, tras las tablas 11.2 y 11.3: usa las recetas medidas de ese paso y su interruptor
  «Fases aleatorias» apunta al pie de la figura 11.4 (Helmholtz, decisión R18). Es la figura 11.5, sin insignia.
- **Rótulos de los preajustes** (decisión R8): «(receta clásica)» en las cuatro de la Web Audio API y «(medida:
  grabación MIS)» en las dos medidas, no «producto».
- **Amplitudes de 0 a 1,6**, no de 0 a 1,5 como decía la tarea: el 2.º armónico medido de la flauta vale 1,54 y no
  cabría.
- **Frecuencia de muestreo $f_s$** (8 000, 16 000, 22 050, 44 100 y 48 000 Hz, por omisión 44 100, la de las
  grabaciones): sin ella, con $f_1$ ≤ 880 Hz y diez armónicos, ningún armónico pasaría nunca de $f_s/2$ en un equipo
  normal y la (11.9) no se vería. Con 8 000 Hz y 880 Hz solo suenan 4.
- **Un cursor sobre la forma de onda** marca $y(t)$ y $-y(t + T/2)$ en el mismo instante: es la (11.6) leída en un
  punto, y es el asidero que toda prueba de laboratorio exige.
- **El espectro del laboratorio** dice «Nivel de $A_n$ (dB)», $20\log_{10} A_n$, y no $A_n/A_1$: $A_1$ también se
  mueve y puede valer 0 (con solo pares, el periodo es $T/2$). Con $A_1$ = 1, como en todos los preajustes, es lo
  mismo que en la figura 11.4.
- **Un preajuste es el timbre**: elegirlo no cambia $f_1$, $f_s$ ni las fases aleatorias, y mover $f_1$ no deja el
  preajuste (la nota «Valores modificados…» solo sale al tocar una amplitud).
- **Fases aleatorias** con semilla fija: el primer sorteo es siempre el mismo (servidor, navegador y pruebas), y los
  cuatro primeros cambian a la vista la forma del clarinete (correlación < 0,9).
- **Sin «♭» ni «⌊ ⌋» en el laboratorio**: ninguna fuente de la página los dibuja, ni dentro de una fórmula («Plex
  Symbols» llega hasta U+22FF; la guía e2e de glifos vio DejaVu Sans). La nota del clarinete dice «el clarinete de la
  figura 11.4», sin «en si bemol», y la de la (11.9), «admite hasta $n$ = 71» en vez de la parte entera.
- **La tecla K** (ronda de corrección 1): con el foco en cualquier parte del laboratorio salvo un campo numérico o un
  selector, K detiene el sonido, además de «Detener» (WCAG 1.4.2 pide un mecanismo para pararlo). Lo dicen la línea de
  estado y «Cómo se usa».
- **Volumen**: −18 dBFS de pico, con rampas de 30 ms en cada cambio; el navegador normaliza el pico (§1.28.5), así que
  las recetas suenan con el mismo pico y no con la misma sonoridad. Lo dice «Cómo se usa».

Página (`src/content/topics/sintesis-sonido.mdx`):

- `src/content/topics/sintesis-sonido.mdx:369`, pie de la figura 11.5: — → «Laboratorio de síntesis aditiva con la Web
  Audio API: diez amplitudes $A_n$ y la fundamental $f_1$ forman la receta (11.4), que suena como una PeriodicWave
  (11.5) solo después de pulsar «Reproducir»; la forma de onda y el espectro se recalculan con cada control. Los
  preajustes son las recetas clásicas de la tabla 11.1 y las medidas de la tabla 11.2, con sus fases. «Fases
  aleatorias» cambia la forma y deja el espectro; con $f_s$ baja y $f_1$ alta se apagan los armónicos sobre $f_s/2$,
  como pide la (11.9).»
- `src/content/topics/sintesis-sonido.mdx:371`, línea de fuente: — → «Simulación que programé con la Web Audio API
  (W3C, 2021), fuente 1: un OscillatorNode toca la receta como PeriodicWave; recetas clásicas de su §1.28.6 y medidas
  propias de las grabaciones del MIS (tabla 11.2). El pico de −18 dBFS y las frecuencias de muestreo son elecciones
  mías»
- `src/content/topics/sintesis-sonido.mdx:376`, «Qué deja fuera el modelo»: — → «Lo que deja fuera: (1) el ataque y la
  caída, pues la nota suena entera desde el primer instante, sin la envolvente $E(t)$ de la (11.7), y solo entra y
  sale con una rampa de 30 ms para no hacer clic; (2) el ruido del soplido y las fluctuaciones de la flauta, pues la
  receta es periódica y fija, el promedio de la tabla 11.2 y no sus rangos; (3) el vibrato: $f_1$ no oscila; (4) el
  aliasing, pues los armónicos por encima de $f_s/2$ se apagan, como hace Chromium al recortar sus tablas, en lugar de
  plegarse a $|n f_1 - m f_s|$; (5) los armónicos 11 y 12 de las grabaciones y la inarmonicidad de la (11.8).»

Lienzo (`SynthStage.tsx`) y estado del sonido (`synthTexts.ts`, `additiveVoiceEngine.ts`):

- `src/components/topics/sintesis-sonido/SynthLab.tsx:163`, título del laboratorio: — → «Laboratorio de síntesis
  aditiva»
- `src/components/topics/sintesis-sonido/SynthStage.tsx:74`, botón (cambia al pulsarlo): — → «Reproducir» · «Detener»
- `src/components/topics/sintesis-sonido/synthTexts.ts:20`, línea de estado junto al botón: — → «Nada suena hasta que
  pulses «Reproducir».» · «Suena a −18 dBFS de pico; «Detener» o la tecla K lo apagan.» (ronda 1: antes «…; «Detener» lo apaga.») · «Todas las amplitudes que suenan valen 0:
  no se oye nada.»
- `src/components/topics/sintesis-sonido/additiveVoiceEngine.ts:23`, la misma línea si no puede sonar: — → «Este
  navegador no tiene Web Audio: la receta se dibuja, pero no puede sonar.» · «El navegador no dejó empezar el sonido:
  vuelve a pulsar «Reproducir».» · «Este navegador no admite $f_s$ = 8 000 Hz: elige otra frecuencia de muestreo.»
- `src/components/topics/sintesis-sonido/SynthStage.tsx:86`, título de la gráfica del lienzo: — → «Forma de onda que
  suena» (ejes y leyenda, los de las figuras 11.1, 11.3 y 11.4)
- `src/components/topics/sintesis-sonido/SynthStage.tsx:93`, rótulo del cursor: — → «$t$ = 1,00 ms»
- `src/components/topics/sintesis-sonido/synthTexts.ts:65`, nombre accesible de la forma de onda (se oye): — → «Forma de
  onda que suena a 310,1 Hz, cada periodo de T = 3,22 ms. La misma curva medio periodo después e invertida cae sobre
  la original.» (con fases sorteadas añade «, con fases sorteadas»; con el diente de sierra, «La curva medio periodo
  después e invertida es otra: correlación 0,53.»; en silencio, «No suena ningún armónico: es una recta.»)

Parámetros, escenario y ajustes (`SynthParams.tsx`, `SynthLab.tsx`, `synthTexts.ts`, `synthPresets.ts`):

- `src/components/topics/sintesis-sonido/synthTexts.ts:40`, rótulo de cada amplitud: — → «Armónico 1, $A_{1}$» …
  «Armónico 10, $A_{10}$»; sobre Nyquist añade « (sobre $f_s/2$)»
- `src/components/topics/sintesis-sonido/SynthParams.tsx:78`, rótulos: — → «Fundamental $f_1$» · «Frecuencia de
  muestreo $f_s$»; opciones: «8 000 Hz» · «16 000 Hz» · «22 050 Hz» · «44 100 Hz» · «48 000 Hz»
- `src/components/topics/sintesis-sonido/synthTexts.ts:48`, nota de la (11.9) bajo los parámetros: — → «Con $f_s$ = 44 100 Hz caben bajo $f_s/2$ los diez armónicos: la (11.9) admite hasta $n$ = 71.» · con 8 000 Hz y
  880 Hz: «Con $f_s$ = 8 000 Hz y $f_1$ = 880,0 Hz solo caben 4 armónicos bajo $f_s/2$ (11.9): de $A_{5}$ a $A_{10}$
  no suenan y quedan desactivados, como Chromium quita los parciales que se plegarían.»
- `src/components/topics/sintesis-sonido/synthPresets.ts:60` y `:85`, opciones del selector de preajustes (texto plano): — →
  «Seno (receta clásica)» · «Cuadrada (receta clásica)» · «Diente de sierra (receta clásica)» · «Triangular (receta
  clásica)» · «Flauta (medida: grabación MIS)» · «Clarinete (medida: grabación MIS)»; sus nombres en «Valores
  modificados a partir de «…»»: «Seno» · «Cuadrada» · «Diente de sierra» · «Triangular» · «Flauta (medida)» ·
  «Clarinete (medido)»
- `src/components/topics/sintesis-sonido/synthPresets.ts:94`, notas de los preajustes: — →
  - «Un solo armónico, $A_1$ = 1: el tono puro de la (11.1).»
  - «Solo impares, $A_n = 1/n$: la segunda mitad de cada periodo es la primera invertida, la (11.6).»
  - «Todos los armónicos, $A_n = 1/n$, con fase $\pi$ en los pares: el signo alterno de la tabla 11.1.»
  - «Solo impares, $A_n = 1/n^2$, con fase $\pi$ en $n$ = 3 y 7: el signo de $\sin(n\pi/2)$ en la tabla 11.1.»
  - (`:90`) «Los diez primeros armónicos de la tabla 11.2, con sus fases, medidos en la flauta de la figura 11.4, a
    310,34 Hz: el más fuerte es el 2.º, pares e impares por igual.»
  - (`:90`) «Los diez primeros armónicos de la tabla 11.2, con sus fases, medidos en el clarinete de la figura 11.4, a 310,10 Hz: el 3.º supera al fundamental y los pares casi no suenan.»
- `src/components/topics/sintesis-sonido/synthPresets.ts:36`, sus fuentes (tras «Fuente:», enlazadas): — → «W3C, Web
  Audio API, §1.28.6 (tabla 11.1)» · «cálculo propio sobre la grabación del MIS (tabla 11.2)»
- `src/components/topics/sintesis-sonido/SynthLab.tsx:151`, interruptor: — → «Fases aleatorias»
- `src/components/topics/sintesis-sonido/synthTexts.ts:34`, nota bajo el interruptor: — → apagado: «Apagado, cada
  armónico suena con la fase de su receta: la medida, o 0 y $\pi$ en las clásicas.» · encendido: «Fases sorteadas: la
  forma de onda cambia y el espectro no. Para Helmholtz el timbre no depende de las fases, con la ligera salvedad de
  Ellis (pie de la figura 11.4).»
- `src/components/topics/sintesis-sonido/SynthLab.tsx:76`, ajuste del engranaje: — → «Curva $-y(t + T/2)$ sobre la
  forma de onda»

Lecturas y gráfica de apoyo (`SynthLab.tsx`, `synthTexts.ts`):

- `src/components/topics/sintesis-sonido/SynthLab.tsx:42`, lecturas: — → «Fundamental $f_1$» 310,1 Hz · «Periodo
  $T = 1/f_1$» 3,22 ms · «Impares sobre pares, $n \le 10$» 25,7 dB (— cuando falta una paridad o no suena nada) ·
  «Armónico más fuerte, $n$» 3
- `src/components/topics/sintesis-sonido/SynthLab.tsx:173`, título y eje del espectro: — → «Contenido armónico de la
  receta» · «Nivel de $A_n$ (dB)» (el eje $x$, la leyenda y la línea «Impares sobre pares…», los de las figuras)
- `src/components/topics/sintesis-sonido/synthTexts.ts:75`, nombre accesible del espectro (se oye): — → «Espectro de la
  receta, armónicos 1 a 10 en dB: el más fuerte es el 3.º.» (con armónicos sobre Nyquist añade «Del 5.º en adelante
  no suenan: pasan de la mitad de la frecuencia de muestreo.»; en silencio, «ninguno suena.»)

«Cómo se usa» (`src/components/topics/sintesis-sonido/synthTexts.ts:54`): — →

1. «Pulsa «Reproducir» para oír la receta: nada suena antes. Empieza a −18 dBFS de pico con una rampa de 30 ms, y «Detener» lo apaga, como la tecla K con el foco en el laboratorio fuera de un campo numérico; cada cambio de receta baja el volumen, cambia la onda y lo vuelve a subir en 30 ms.» (ronda 1: se añade «, como la tecla K con el foco en el laboratorio fuera de un campo numérico»)
2. «Las amplitudes $A_1$ a $A_{10}$ son relativas al $A_1$ = 1 de los preajustes; las barras dan su nivel,
   $20\log_{10} A_n$, que con $A_1$ = 1 es el $A_n/A_1$ de la figura 11.4. $f_1$ cambia la nota y deja la receta: el
   timbre se conserva.»
3. «El navegador normaliza el pico de cada receta (§1.28.5 de la Web Audio API): todas llegan al mismo pico, no a la
   misma sonoridad. La $f_s$ y el nivel de pico son elecciones mías, no valores de un producto.»
4. «Arrastra el cursor de la forma de onda, o enfócalo y muévelo con las flechas (1 % del eje; con Mayús, 10 %): marca
   $y(t)$ y $-y(t + T/2)$ en el mismo instante. La curva discontinua se quita en los ajustes del engranaje.»

## Tema 12 (`resonancia-estructural`, Task 10)

Página nueva: todo su texto es nuevo («antes» vacío). Prosa: 646 palabras según el contador del sitio (tope 650); las
leyendas, las tablas y el análisis de las marcas no cuentan como prosa. Los valores `${…}` los pone el componente
con datos probados (37 y 12 ciclos/min, 5,0 y 1,6 s; 16,8 y 2,2 kN; ×0,93, ×1,8 y ×3,5; 3,43 y 5,15 s), y los números
que el texto escribe a mano los comprueba `src/content/resonanciaNumbers.test.ts` contra los datos.

> **Dylan: mira el video (93 s) y dime en qué segundo se ve el balanceo lateral y en cuál la gente acompasa el paso;
> con eso vuelven las dos marcas.** Es el reportaje de ITN del Millennium Bridge,
> <https://www.youtube.com/watch?v=Hz72lzDxMfc>. Mientras tanto la figura 12.5 (antes 12.4: el laboratorio de la Task 11 entra antes) tiene una sola marca en 0:00, que solo
> afirma lo que dice el título de ITN y la física con fuente de Arup y Newland, y su pie no señala instantes (ruling
> R17).

Para leer con atención:

- **Decisión de Dylan: la conexión con el Tema 7** (`related`, mdx:123, y la frase de las conexiones, mdx:599). No está
  en el spec: un rebote conserva la fracción $e^2$ de la energía cinética y un ciclo amortiguado, una fracción fija; en
  los dos la energía cae en progresión geométrica. La dejo; quítala si no te convence. Los Temas 10 y 11 se suman en
  la Task 17.
- **La marca de 1:01,7 dice 3,43 s → 5,15 s**, la medición de esa toma (tabla 12.5), no el «3,44 s → 5,2 s» del plan;
  la media de las tres tomas, 3,49 s → 5,23 s, 0,191 Hz y ≈ 11,5 ciclos/min, va en el análisis (decisión R13).
- **La energía por ciclo a 42 mph es +51,4 %** con la forma exacta $e^{-4\pi\zeta_\text{neto}} - 1$ y la recta por los
  dos últimos puntos de la Tabla I; la investigación decía ≈ +52 % (nota añadida en su §4).
- **$N_L$ con $\zeta$ = 20 % es 1 046** sobre el mismo modo medido (0,48 Hz, 130 t); la investigación daba 1 180 con
  los valores del análisis de diseño (0,49 Hz, 144 t).
- **No afirmo** la fecha de Broughton (solo «en 1831»), la marcha de Angers ni una orden del ejército británico.
- Cambiaron cuatro fuentes de `src/lib/data/bridges.ts` que las tablas imprimen, para escribir sus símbolos como
  fórmula: «($k_p$ en N·s/m, de 0,5 a 1,0 Hz)» (antes «(k_p, N·s/m, 0,5-1,0 Hz)»), «$\delta$ ≈ 0,03, $\zeta$ ≈ 0,005»
  (antes «δ ≈ 0,03, ζ ≈ 0,005»), «(medida: de 128 a 130 toneladas)» (antes «(128-130 t medida)») y «párr. 4-5e»
  (antes «párr. 4-5 e»).

### Página (`src/content/topics/resonancia-estructural.mdx`)

Frontmatter, prosa, títulos de paso y recuadros, ecuaciones (lo que dice cada símbolo), pies y fuentes de figura, y las marcas de los dos videos con su análisis escrito. Las fuentes de la bibliografía (`sources`, L11-L123) son las de la investigación, con su título y editorial.

1. `src/content/topics/resonancia-estructural.mdx:6`, concepto: — → «Frecuencia natural, oscilación forzada amortiguada y resonancia, suma de fuerzas con fases y autoexcitación: por qué un pelotón rompe el paso, cómo Klipper anula la vibración de una impresora y qué derribó el puente de Tacoma Narrows.»
2. `src/content/topics/resonancia-estructural.mdx:9`, caso de uso, producto: — → «Klipper v0.13.0: barrido de resonancia y filtro ZV»
3. `src/content/topics/resonancia-estructural.mdx:10`, caso de uso, industria: — → «Firmware de impresoras 3D»
4. `src/content/topics/resonancia-estructural.mdx:123`, temas relacionados (**decisión de Dylan**: el Tema 7 no está en el spec; ver la nota de arriba): — → «['control-haptico', 'coeficiente-restitucion']»
5. `src/content/topics/resonancia-estructural.mdx:126`, referencia a clase, tema: — → «Tema 4 · Resonancia, Sistemas Acoplados y Ondas Armónicas/Sonoras · Oscilaciones Forzadas y Resonancia»
6. `src/content/topics/resonancia-estructural.mdx:127`, referencia a clase, nota: — → «$F(t) = F_0\cos(\omega_d t)$ y $A = F_0/\sqrt{(k - m\omega_d^2)^2 + b^2\omega_d^2}$: la (12.3); en $\omega_d \approx \omega_0$, fuerza y velocidad en fase: la (12.4).»
7. `src/content/topics/resonancia-estructural.mdx:129`, referencia a clase, tema: — → «Tema 3 · Oscilaciones Amortiguadas Simples · Tres regímenes»
8. `src/content/topics/resonancia-estructural.mdx:130`, referencia a clase, nota: — → «$b_c = 2\sqrt{km}$, que define mi $\zeta = b/b_c$, y la envolvente $e^{-(b/2m)t}$ de la (12.11).»
9. `src/content/topics/resonancia-estructural.mdx:132`, referencia a clase, tema: — → «Tema 1 · Ecuaciones Diferenciales y Movimiento Oscilatorio · Solución General y Parámetros Cinemáticos»
10. `src/content/topics/resonancia-estructural.mdx:133`, referencia a clase, nota: — → «$f = \frac{1}{2\pi}\sqrt{k/m}$, independiente de la amplitud: la (12.1).»
11. `src/content/topics/resonancia-estructural.mdx:135`, referencia a clase, tema: — → «Tema 04 · Energía mecánica · Concepto 05 · Trabajo no conservativo y balance de energía»
12. `src/content/topics/resonancia-estructural.mdx:136`, referencia a clase, nota: — → «$\Delta(K+U) = W_\text{otras}$ en cada ciclo: la (12.4) y la (12.12).»
13. `src/content/topics/resonancia-estructural.mdx:159`, prosa: — → «Todo lo que oscila tiene ritmos propios; si algo le entrega energía a ese ritmo, la amplitud crece.»
14. `src/content/topics/resonancia-estructural.mdx:161`, título del paso 1: — → «Frecuencia natural»
15. `src/content/topics/resonancia-estructural.mdx:163`, prosa: — → «Con Hooke y la segunda ley, un cuerpo sujeto a un resorte oscila solo:»
16. `src/content/topics/resonancia-estructural.mdx:169`, ecuación, significado de un símbolo: — → «masa»
17. `src/content/topics/resonancia-estructural.mdx:170`, ecuación, significado de un símbolo: — → «constante elástica»
18. `src/content/topics/resonancia-estructural.mdx:171`, ecuación, significado de un símbolo: — → «desplazamiento desde el equilibrio»
19. `src/content/topics/resonancia-estructural.mdx:172`, ecuación, significado de un símbolo: — → «amplitud y fase inicial»
20. `src/content/topics/resonancia-estructural.mdx:173`, ecuación, significado de un símbolo: — → «frecuencia angular natural»
21. `src/content/topics/resonancia-estructural.mdx:174`, ecuación, significado de un símbolo: — → «frecuencia natural y periodo»
22. `src/content/topics/resonancia-estructural.mdx:182`, prosa: — → «El resorte lo devuelve al equilibrio y la inercia lo pasa de largo: el vaivén tiene un ritmo propio, el mismo con cualquier amplitud.»
23. `src/content/topics/resonancia-estructural.mdx:188`, prosa: — → «Más masa, menos frecuencia: $f_0$ va como $1/\sqrt{m}$; por eso la cama cargada de filamento resuena más bajo. Medir $f_0$ es contar ciclos.»
24. `src/content/topics/resonancia-estructural.mdx:197`, pie de figura: — → «Los dos modos del puente de Tacoma Narrows el 7 de noviembre de 1940, como oscilaciones libres de la ecuación (12.1) con la misma amplitud, que es ilustrativa: el vertical de 8 o 9 nodos a 37 ciclos por minuto y la torsión de un nodo a 12. Hacia las 10:00 el puente pasó de uno al otro, «from 37 to 14», y la torsión terminó en 12: cada modo tiene su propia frecuencia natural, y contar ciclos la mide.»
25. `src/content/topics/resonancia-estructural.mdx:199`, fuente de figura: — → «Gráfica del autor con la ecuación (12.1); frecuencias del informe a la Federal Works Agency (1941), págs. 30-31 y V-12; amplitudes ilustrativas»
26. `src/content/topics/resonancia-estructural.mdx:207`, título del paso 2: — → «Resonancia forzada»
27. `src/content/topics/resonancia-estructural.mdx:209`, prosa: — → «Ahora empujo con una fuerza periódica y le pongo un amortiguador viscoso:»
28. `src/content/topics/resonancia-estructural.mdx:215`, ecuación, significado de un símbolo: — → «coeficiente de amortiguamiento viscoso»
29. `src/content/topics/resonancia-estructural.mdx:216`, ecuación, significado de un símbolo: — → «amplitud de la fuerza»
30. `src/content/topics/resonancia-estructural.mdx:217`, ecuación, significado de un símbolo: — → «frecuencia angular de la fuerza»
31. `src/content/topics/resonancia-estructural.mdx:218`, ecuación, significado de un símbolo: — → «amortiguamiento crítico»
32. `src/content/topics/resonancia-estructural.mdx:219`, ecuación, significado de un símbolo: — → «razón de amortiguamiento, sin unidades»
33. `src/content/topics/resonancia-estructural.mdx:227`, ecuación, significado de un símbolo: — → «amplitud estacionaria, pasado el transitorio»
34. `src/content/topics/resonancia-estructural.mdx:228`, ecuación, significado de un símbolo: — → «deformación estática, la que daría una fuerza quieta»
35. `src/content/topics/resonancia-estructural.mdx:238`, ecuación, significado de un símbolo: — → «energía que entrega la fuerza en un ciclo, la integral de $F v$ (cálculo propio)»
36. `src/content/topics/resonancia-estructural.mdx:241`, ecuación, significado de un símbolo: — → «energía que disipa el amortiguador en un ciclo»
37. `src/content/topics/resonancia-estructural.mdx:242`, ecuación, significado de un símbolo: — → «retraso de $x$ respecto de la fuerza»
38. `src/content/topics/resonancia-estructural.mdx:250`, prosa: — → «Si empujo al ritmo del vaivén, cada empujón suma; a contrarritmo, resta.»
39. `src/content/topics/resonancia-estructural.mdx:256`, prosa: — → «En $\omega_d = \omega_0$ solo $b$ limita: la deformación estática se multiplica por $1/(2\zeta)$, y con la velocidad en fase con la fuerza, $\delta = 90^\circ$, $W_F$ es máximo; en régimen estacionario, $W_F = W_b$.»
40. `src/content/topics/resonancia-estructural.mdx:265`, pie de figura: — → «Amplitud estacionaria de la ecuación (12.3), relativa a la deformación estática $F_0/k$, frente a la frecuencia de la fuerza, con las tres razones de amortiguamiento con que Klipper evalúa sus filtros. En $\omega_d = \omega_0$ cada curva vale $1/(2\zeta)$. La torsión del Tacoma, con $\zeta$ = 0,005, llegaría a 100 (tabla 12.4): veinte veces la impresora con $\zeta$ = 0,1. El barrido de Klipper, de 5 a 135 Hz, traza esta curva en cada eje.»
41. `src/content/topics/resonancia-estructural.mdx:267`, fuente de figura: — → «Gráfica del autor con la ecuación (12.3); razones de amortiguamiento de Klipper v0.13.0, klippy/extras/shaper_calibrate.py L14; barrido de resonance_tester.py L49-L78»
42. `src/content/topics/resonancia-estructural.mdx:273`, título del recuadro (nota): — → «Rhythm Nation y el CVE-2022-38392»
43. `src/content/topics/resonancia-estructural.mdx:275`, prosa: — → «Un fabricante de portátiles vio que el video de «Rhythm Nation» los tumbaba: la canción contenía una frecuencia natural de sus discos de 5400 rpm. Quitó esa banda del audio, la $F_0$ cerca de $\omega_0$: «It is much less expensive to fix the problem in software». Es el CVE-2022-38392.»
44. `src/content/topics/resonancia-estructural.mdx:281`, título del paso 3: — → «Al paso o rompiendo el paso»
45. `src/content/topics/resonancia-estructural.mdx:283`, prosa: — → «Un pelotón son $N$ fuerzas, cada una con su fase:»
46. `src/content/topics/resonancia-estructural.mdx:289`, ecuación, significado de un símbolo: — → «personas que cruzan»
47. `src/content/topics/resonancia-estructural.mdx:290`, ecuación, significado de un símbolo: — → «amplitud de la fuerza de una persona»
48. `src/content/topics/resonancia-estructural.mdx:293`, ecuación, significado de un símbolo: — → «frecuencia y fase de la persona $i$»
49. `src/content/topics/resonancia-estructural.mdx:298`, ecuación, significado de un símbolo: — → «valor cuadrático medio de $|F|$ con fases al azar (cálculo propio)»
50. `src/content/topics/resonancia-estructural.mdx:304`, prosa: — → «El paso militar, 120 por minuto, son 2,0 Hz: dentro del rango de riesgo máximo de Sétra (tabla 12.1). Klipper rompe el paso a propósito, con dos impulsos en contrafase que se anulan:»
51. `src/content/topics/resonancia-estructural.mdx:313`, ecuación, significado de un símbolo: — → «fracción de la orden en cada impulso; Klipper escribe $[1, K]$ y los divide por su suma»
52. `src/content/topics/resonancia-estructural.mdx:315`, ecuación, significado de un símbolo: — → «instante del segundo impulso, el primero en 0»
53. `src/content/topics/resonancia-estructural.mdx:316`, ecuación, significado de un símbolo: — → «periodo amortiguado, que el código llama $t_d$»
54. `src/content/topics/resonancia-estructural.mdx:317`, ecuación, significado de un símbolo: — → «cociente entre el segundo impulso y el primero»
55. `src/content/topics/resonancia-estructural.mdx:321`, prosa: — → «En el Millennium Bridge la gente acompasó el paso al balanceo, y su fuerza creció con la velocidad del tablero:»
56. `src/content/topics/resonancia-estructural.mdx:327`, ecuación, significado de un símbolo: — → «fuerza lateral acompasada de $N$ personas»
57. `src/content/topics/resonancia-estructural.mdx:328`, ecuación, significado de un símbolo: — → «coeficiente de fuerza lateral por persona»
58. `src/content/topics/resonancia-estructural.mdx:329`, ecuación, significado de un símbolo: — → «velocidad lateral del tablero»
59. `src/content/topics/resonancia-estructural.mdx:337`, ecuación, significado de un símbolo: — → «personas a partir de las que el puente se balancea solo»
60. `src/content/topics/resonancia-estructural.mdx:338`, ecuación, significado de un símbolo: — → «frecuencia y masa modal del modo lateral»
61. `src/content/topics/resonancia-estructural.mdx:342`, prosa: — → «Al Tacoma nada lo empujaba a 0,20 Hz; el ritmo de los vórtices del viento era otro:»
62. `src/content/topics/resonancia-estructural.mdx:348`, ecuación, significado de un símbolo: — → «frecuencia de desprendimiento de vórtices»
63. `src/content/topics/resonancia-estructural.mdx:349`, ecuación, significado de un símbolo: — → «número de Strouhal del tablero, unos 0,11»
64. `src/content/topics/resonancia-estructural.mdx:350`, ecuación, significado de un símbolo: — → «rapidez del viento»
65. `src/content/topics/resonancia-estructural.mdx:351`, ecuación, significado de un símbolo: — → «canto del tablero»
66. `src/content/topics/resonancia-estructural.mdx:359`, prosa: — → «Rompiendo el paso, unos empujones anulan a otros: «the tread of one person would have counteracted the vibration arising from that of another».»
67. `src/content/topics/resonancia-estructural.mdx:365`, prosa: — → «Con fases al azar, $|F|$ crece como $\sqrt{N}$ y la potencia, con su cuadrado: $N$ veces menos. Una fuerza que crece con $V$ es un $b$ negativo: pasadas $N_L$ personas, el puente se balancea solo.»
68. `src/content/topics/resonancia-estructural.mdx:374`, pie de figura: — → «Amplitud de la fuerza vertical de $N$ personas con la ecuación (12.5), $F_1$ = 280 N cada una (tabla 12.1). Al paso, todas en fase, crece en recta; rompiendo el paso, con fases al azar, como $\sqrt{N}$, y los puntos son un sorteo de esas fases para cada $N$. Con los unos 60 soldados que cruzaban el puente de Broughton en 1831, 16,8 kN contra 2,2 kN: en resonancia la energía que entra va con el cuadrado, 60 veces menos.»
69. `src/content/topics/resonancia-estructural.mdx:376`, fuente de figura: — → «Gráfica del autor con la ecuación (12.5); fuerza por persona de Sétra (2006), §1.2.1; unos 60 soldados según The Philosophical Magazine (1831); fases sorteadas con una semilla fija»
70. `src/content/topics/resonancia-estructural.mdx:387`, pie de figura: — → «Reportaje de ITN sobre el Millennium Bridge, que cerró en junio de 2000, dos días después de abrir, porque se bamboleaba. Lo analizo entero, desde el inicio, con los datos de Arup; los números de la ecuación (12.8) están en la tabla 12.2.»
71. `src/content/topics/resonancia-estructural.mdx:389`, fuente de figura: — → «Análisis del autor sobre el video de Frontline by ITN (2022, archivo de 2000); datos de Dallard et al. (2001) y Newland (2002)»
72. `src/content/topics/resonancia-estructural.mdx:407`, marca, título: — → «El reportaje: un puente que se bamboleaba»
73. `src/content/topics/resonancia-estructural.mdx:409`, marca, análisis escrito: — → «El título de ITN lo resume: el puente, «wobbly» («bamboleante»), cerró días después de abrir. Según Arup, el primer día el tablero se movió de lado sobre todo a unos 0,8 Hz en el vano sur, y a algo menos de 0,5 Hz y a 1,0 Hz en el central: justo donde empuja de lado cada pie, a la mitad de la frecuencia del paso (tabla 12.1). Arup lo explica así: «it is more comfortable for pedestrians to walk in synchronisation with the natural swaying of the bridge» («es más cómodo caminar al ritmo del balanceo natural del puente»; Dallard et al., pág. 21), y así cada pie empuja a la frecuencia del puente y en la fase que aumenta el movimiento. Es la retroalimentación de la (12.7): más balanceo, más gente acompasada, más fuerza. Con la (12.8), el primer modo lateral del vano central se desestabilizaba con unas 37 personas; la cura fue subir $\zeta$ de menos del 1 % al 15–20 % con 37 amortiguadores viscosos y masas sintonizadas (tabla 12.2).»
74. `src/content/topics/resonancia-estructural.mdx:419`, título del paso 4: — → «Autoexcitación: el Tacoma Narrows»
75. `src/content/topics/resonancia-estructural.mdx:421`, prosa: — → «El 7 de noviembre de 1940 el viento era casi constante. Billah y Scanlan suman a la torsión un término del viento proporcional a la velocidad de giro:»
76. `src/content/topics/resonancia-estructural.mdx:427`, ecuación, significado de un símbolo: — → «ángulo de giro del tablero»
77. `src/content/topics/resonancia-estructural.mdx:428`, ecuación, significado de un símbolo: — → «momento de inercia del tablero por metro de vano»
78. `src/content/topics/resonancia-estructural.mdx:429`, ecuación, significado de un símbolo: — → «amortiguamiento estructural de la torsión, unos 0,005»
79. `src/content/topics/resonancia-estructural.mdx:430`, ecuación, significado de un símbolo: — → «densidad del aire y ancho del tablero»
80. `src/content/topics/resonancia-estructural.mdx:433`, ecuación, significado de un símbolo: — → «coeficiente aerodinámico que crece con el viento, medido en maqueta»
81. `src/content/topics/resonancia-estructural.mdx:442`, ecuación, significado de un símbolo: — → «amortiguamiento neto: estructura menos viento»
82. `src/content/topics/resonancia-estructural.mdx:445`, ecuación, significado de un símbolo: — → «$2I/(\rho B^4)$ con los datos del tablero, de Billah y Scanlan»
83. `src/content/topics/resonancia-estructural.mdx:449`, ecuación, significado de un símbolo: — → «frecuencia angular amortiguada, $\omega_0\sqrt{1 - \zeta_\text{neto}^2}$»
84. `src/content/topics/resonancia-estructural.mdx:462`, ecuación, significado de un símbolo: — → «cambio relativo de la energía en un periodo natural; la forma lineal vale para $\zeta$ pequeño»
85. `src/content/topics/resonancia-estructural.mdx:467`, prosa: — → «¿Fue resonancia? Con impulsos que vienen del propio movimiento, «It would appear not to contradict the qualitative definition of resonance»; pero la (12.10) no tiene fuerza externa: es otra ecuación.»
86. `src/content/topics/resonancia-estructural.mdx:473`, prosa: — → «El viento no tenía ritmo: el ritmo lo ponía el tablero; el viento, la energía.»
87. `src/content/topics/resonancia-estructural.mdx:479`, prosa: — → «Sobre 18,6 mph, $\zeta_\text{neto} < 0$ (tabla 12.3) y el término en $\dot\theta$ empuja en vez de frenar. Lo que entra y lo que sale crecen con $\theta_0^2$: no hay equilibrio, y la amplitud crece en progresión geométrica hasta romper.»
88. `src/content/topics/resonancia-estructural.mdx:488`, pie de figura: — → «Torsión del Tacoma con la ecuación (12.11) a 0,20 Hz, sin ninguna fuerza que oscile, con tres vientos de la tabla 12.3: a 17 mph el amortiguamiento neto es positivo y la amplitud baja; a 30,6 mph es negativo y sube; a 42 mph, el viento de esa mañana, la tabla se prolonga en recta y sube más rápido. Las etiquetas dan la amplitud al cabo de 30 s, seis vueltas.»
89. `src/content/topics/resonancia-estructural.mdx:490`, fuente de figura: — → «Gráfica del autor con las ecuaciones (12.11) y (12.12); $A_2^*$ de la Tabla I de Billah y Scanlan (1991); la curva de 42 mph es una extrapolación»
90. `src/content/topics/resonancia-estructural.mdx:500`, pie de figura: — → «Película muda del 7 de noviembre de 1940, alojada en el sitio. Mi análisis por instante responde lo que pide el recurso: la frecuencia natural (1:01), la fuente de la excitación (0:51) y por qué crece la amplitud (0:51 y 1:55), además del nodo de la torsión (0:14) y la sección del tablero (0:32). Las tomas de torsión corren 1,5 veces más rápido que en la realidad; el botón «Velocidad real (×2/3)» las frena y deja el colapso a 1×.»
91. `src/content/topics/resonancia-estructural.mdx:502`, fuente de figura: — → «Película de Barney Elliott y Harbine Monroe en Wikimedia Commons, dominio público por la dedicación de los Prelinger Archives que registra Commons; la pasé a WebM y MP4 sin tocar la imagen. Análisis mío; velocidad de las cámaras según Olson et al. (2015)»
92. `src/content/topics/resonancia-estructural.mdx:514`, marca, título: — → «La línea central es el nodo de la torsión»
93. `src/content/topics/resonancia-estructural.mdx:516`, marca, análisis escrito: — → «Sobre la calzada, la línea central blanca casi no sube ni baja, mientras los bordes suben y bajan en contrafase: el tablero gira alrededor de su eje. Olson et al. llaman a esa línea «the stationary line about which the twisting occurred» («la línea quieta alrededor de la que ocurría la torsión»). Es el modo de torsión de un nodo, el $\theta(t)$ de la (12.10); el informe de 1941 sitúa ese nodo a mitad del vano, así que cada mitad giraba al revés que la otra.»
94. `src/content/topics/resonancia-estructural.mdx:520`, marca, título: — → «La viga de alma llena: un tablero en H»
95. `src/content/topics/resonancia-estructural.mdx:522`, marca, análisis escrito: — → «Mirando hacia abajo desde el borde se ve la viga de alma llena, de 8 ft (2,44 m) de canto, con sus remaches: el tablero era una sección en H, roma, de solo 39 ft de ancho, 1/72 del vano. Esa forma fija el $A_2^*$ de la (12.11). El informe de 1941 lo concluye: «Its appearance and destructive effect in the Tacoma Narrows Bridge resulted from its narrow width and lack of structural damping» («su aparición y su efecto destructivo se debieron a su ancho estrecho y a la falta de amortiguamiento estructural»).»
96. `src/content/topics/resonancia-estructural.mdx:526`, marca, título: — → «El viento: la fuente de energía»
97. `src/content/topics/resonancia-estructural.mdx:528`, marca, análisis escrito: — → «El oleaje del estrecho delata el viento: 42 mph (18,8 m/s), medido hacia las 9:00. Es la fuente de la excitación, pero no oscila a 0,20 Hz: su único ritmo propio, el desprendimiento de vórtices, da 0,85 Hz con la (12.9), 4,2 veces la torsión (tabla 12.4). Por qué crece la amplitud: el giro decide cuándo empuja el viento, «the wind supplying the power, and the motion supplying the power-tapping mechanism» («el viento pone la potencia y el movimiento, el mecanismo que la toma»), según Billah y Scanlan. Con $\zeta_\text{neto} < 0$, la (12.12) da más energía en cada vuelta: un 20,8 % a 30,6 mph (tabla 12.3).»
98. `src/content/topics/resonancia-estructural.mdx:532`, marca, título: — → «Contar ciclos: 3,43 s en el video son 5,15 s reales»
99. `src/content/topics/resonancia-estructural.mdx:534`, marca, análisis escrito: — → «Desde debajo de la torre, el borde del tablero baja y sube dos veces. Cuadro a cuadro mido 3,43 s por ciclo (figura 12.7 y tabla 12.5). Elliott filmó a 16 cuadros por segundo y el video los pasa como 24, así que cada segundo del video son 1,5 reales: 5,15 s. Con la media de tres tomas, 3,49 s, el periodo real es 5,23 s y la frecuencia 0,191 Hz, unos 11,5 ciclos por minuto, un 4 % por debajo de los 12 que cronometró Farquharson: es la frecuencia natural de la torsión, la $f_0$ de la (12.1) para ese modo. Con «Velocidad real» la toma se ve a su ritmo.»
100. `src/content/topics/resonancia-estructural.mdx:538`, marca, título: — → «El colapso, a velocidad real»
101. `src/content/topics/resonancia-estructural.mdx:540`, marca, análisis escrito: — → «Esta toma es de Monroe, que filmó a 24 cuadros por segundo: Olson et al. comprobaron que los trozos caen con la aceleración de la gravedad solo a esa velocidad, así que va a velocidad real y el botón no la frena. Es el final del crecimiento de la (12.12): sin amplitud de equilibrio, solo la rotura lo detuvo. La torsión había empezado hacia las 10:00; hacia las 11:00 cayeron unos 600 ft del tablero, y a las 11:10, el resto (informe de 1941).»
102. `src/content/topics/resonancia-estructural.mdx:551`, pie de figura: — → «Mi medición cuadro a cuadro de la toma de 1:01,7: la altura del borde del tablero, en píxeles. Tal como corre el video, el ciclo dura 3,43 s; estirada al tiempo real, 5,15 s, y una cosenoide de 5,0 s, el periodo que cronometró Farquharson, ajustada en amplitud, fase y nivel medio sin tocar su periodo, la sigue de cerca. Las tres tomas están en la tabla 12.5.»
103. `src/content/topics/resonancia-estructural.mdx:553`, fuente de figura: — → «Medición del autor (pnpm run data:tacoma) sobre el archivo de Wikimedia Commons; 16 y 24 cuadros por segundo según Olson et al. (2015); 12 ciclos por minuto de Farquharson en el informe de 1941, pág. V-12»
104. `src/content/topics/resonancia-estructural.mdx:567`, prosa: — → «Klipper (v0.13.0, commit 61c0c8d), firmware libre de impresoras 3D, mide con un acelerómetro las resonancias del marco y las correas, causa del _ringing_ de las piezas, y las compensa con _input shaping_.»
105. `src/content/topics/resonancia-estructural.mdx:573`, prosa: — → «`resonance_tester.py` (L49-L78) barre de 5 a 135 Hz a 1 Hz/s; los picos son las $f_0$ de la (12.3). `shaper_defs.py` (L17-L23) arma con ellas el ZV de la (12.6), con $\zeta = 0{,}1$.»
106. `src/content/topics/resonancia-estructural.mdx:579`, prosa: — → «Sin el modelo, lo seguro es bajar la aceleración en todo o imprimir torres de prueba a ciegas. El filtro anula la vibración en la frecuencia medida y la máquina conserva su aceleración.»
107. `src/content/topics/resonancia-estructural.mdx:585`, prosa: — → «Gano velocidad sin _ringing_. Cuesta: el ZV divide la vibración por 10 solo dentro de ±5 % de $f_0$; $\zeta$ «is usually unknown» y se fija en 0,1; el filtro redondea esquinas; y si las correas se aflojan o la cama gana masa, $f_0$ cambia y hay que medir otra vez.»
108. `src/content/topics/resonancia-estructural.mdx:591`, título del recuadro (clase): — → «Módulo 5 · Temas 1, 3 y 4; Módulo 2 · Tema 04»
109. `src/content/topics/resonancia-estructural.mdx:593`, prosa: — → «El Tema 4 da la (12.3) con $F_0\cos(\omega_d t)$ y llama resonancia a $\omega_d \approx \omega_0$, cuando «la fuerza y la velocidad quedan en fase»: la (12.4). Mi $\zeta$ es $b/b_c$, con el $b_c$ del Tema 3. Su amortiguador de masa sintonizado (Taipei 101) es parte de la cura del Millennium. Las fases y la autoexcitación son extensión.»
110. `src/content/topics/resonancia-estructural.mdx:599`, prosa de las conexiones (la frase del Tema 7 es **decisión de Dylan**): — → «Con el Tema 5: su vibración $F_0 \sin(\omega t)$ es la fuerza de la (12.2). Con el Tema 7: un rebote conserva la fracción $e^2$ de la energía cinética, y un ciclo amortiguado, una fracción fija por la (12.12): la energía cae en progresión geométrica.»

### Figuras de los pasos (`src/components/topics/resonancia-estructural/ResonanceFigure.tsx`)

111. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:76`, etiqueta del periodo: — → «$T_0$ = ${comma(periodS, 1)} s»
112. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:102`, título de la gráfica: — → «Dos modos del puente de Tacoma Narrows como oscilaciones libres»
113. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:103`, eje: — → «$t$»
114. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:105`, eje: — → «$x/A$»
115. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:110`, leyenda o etiqueta: — → «Modo vertical, ${vertical.cyclesPerMin} ciclos/min»
116. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:116`, leyenda o etiqueta: — → «Torsión de un nodo, ${torsion.cyclesPerMin} ciclos/min»
117. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:125`, nombre accesible (se oye, no se ve): — → «Dos cosenos de amplitud 1 durante 20 s. El modo vertical, a ${vertical.cyclesPerMin} ciclos por minuto, vuelve a su punto de partida cada ${comma(vertical.periodS, 1)} s; la torsión de un nodo, a ${torsion.cyclesPerMin} ciclos por minuto, cada ${comma(torsion.periodS, 1)} s.»
118. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:161`, título de la gráfica: — → «Curva de resonancia: amplitud frente a la frecuencia de la fuerza»
119. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:162`, eje: — → «$\omega_d/\omega_0$»
120. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:164`, eje: — → «Amplitud relativa $A/(F_0/k)$»
121. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:171`, guía: — → «$\omega_d = \omega_0$»
122. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:176`, nombre accesible (se oye, no se ve): — → «Tres curvas que valen 1 con la fuerza lenta, suben hasta un pico en ω_d = ω_0 y caen por encima. En el pico valen 1 sobre 2 zeta: 6,7 con ζ = 0,075, 5,0 con ζ = 0,1 y 3,3 con ζ = 0,15. Menos amortiguamiento, pico más alto y más angosto.»
123. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:217`, leyenda o etiqueta: — → «${comma(inStep, 1)} kN»
124. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:225`, leyenda o etiqueta: — → «${comma(breaking, 1)} kN»
125. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:235`, título de la gráfica: — → «Fuerza total de $N$ personas al paso y rompiendo el paso»
126. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:236`, eje: — → «$N$»
127. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:238`, eje: — → «Fuerza total $|F|$»
128. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:243`, leyenda: — → «Al paso, $N F_1$»
129. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:249`, leyenda: — → «Rompiendo el paso, $\sqrt{N}\,F_1$»
130. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:258`, guía: — → «${SOLDIERS} soldados»
131. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:264`, nombre accesible (se oye, no se ve): — → «Con F_1 = ${comma(F1, 0)} N por persona, la fuerza al paso crece en recta, N F_1, hasta ${comma(200 * F1 * KN_PER_N, 0)} kN con 200 personas; rompiendo el paso crece como la raíz de N, y los puntos de un sorteo de fases al azar caen a su alrededor. Con ${SOLDIERS} soldados: ${comma(inStep, 1)} kN al paso y ${comma(breaking, 1)} kN rompiendo el paso.»
132. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:292`, leyenda o etiqueta: — → «${name}: $\zeta_\text{neto}$ = ${comma(net.zetaNet, 3)}»
133. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:311`, leyenda o etiqueta: — → «×${comma(growth, growth < 1 ? 2 : 1)}»
134. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:320`, título de la gráfica: — → «Torsión del Tacoma con tres vientos: decae o crece sola»
135. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:321`, eje: — → «$t$»
136. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:323`, eje: — → «Ángulo relativo $\theta/\theta_0$»
137. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:330`, nombre accesible (se oye, no se ve): — → «La torsión a 0,20 Hz durante ${SELF_END_S} s, seis vueltas, sin ninguna fuerza que oscile. Con 17 mph su amplitud baja a ×${comma(CASES[0].growth, 2)}; con 30,6 mph sube a ×${comma(CASES[1].growth, 1)}; con 42 mph, extrapolando la tabla, a ×${comma(CASES[2].growth, 1)}.»
138. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:139`, leyenda de la curva de resonancia, cada $\zeta$: — → «$\zeta$ = ${…} (0,075, 0,1 y 0,15)»
139. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:145`, leyenda de la curva con el $\zeta$ por omisión: — → «${zetaLabel(zeta)}, la de Klipper por omisión»
140. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:288`, leyenda, nombre del viento: — → «${comma(mph, 0)} mph, extrapolado»
141. `src/components/topics/resonancia-estructural/ResonanceFigure.tsx:288`, leyenda, nombre del viento: — → «${comma(mph, 1)} mph»

### Figura de la medición (`src/components/topics/resonancia-estructural/TacomaMeasurement.tsx`)

142. `src/components/topics/resonancia-estructural/TacomaMeasurement.tsx:28`, título de la gráfica: — → «Altura del borde del tablero medida cuadro a cuadro, en el tiempo del video y en el real»
143. `src/components/topics/resonancia-estructural/TacomaMeasurement.tsx:29`, eje: — → «Tiempo desde el inicio de la toma $t$»
144. `src/components/topics/resonancia-estructural/TacomaMeasurement.tsx:31`, eje: — → «Altura del borde del tablero»
145. `src/components/topics/resonancia-estructural/TacomaMeasurement.tsx:36`, leyenda: — → «Tal como corre el video ($T$ = ${VIDEO_PERIOD} s)»
146. `src/components/topics/resonancia-estructural/TacomaMeasurement.tsx:43`, leyenda: — → «Corregida a tiempo real ($T$ = ${REAL_PERIOD} s)»
147. `src/components/topics/resonancia-estructural/TacomaMeasurement.tsx:49`, leyenda: — → «Cosenoide de ${comma(PLOT.farquharsonPeriodS, 1)} s de Farquharson»
148. `src/components/topics/resonancia-estructural/TacomaMeasurement.tsx:58`, nombre accesible (se oye, no se ve): — → «El borde del tablero sube y baja dos veces en la toma. Tal como corre el video, un ciclo dura ${VIDEO_PERIOD} s; estirado ${comma(PLOT.stretch, 1)} veces al tiempo real, ${REAL_PERIOD} s, y casi coincide con una cosenoide de ${comma(PLOT.farquharsonPeriodS, 1)} s, el periodo que cronometró Farquharson.»

### El video del Tacoma (`src/components/topics/resonancia-estructural/tacomaFilm.ts`)

149. `src/components/topics/resonancia-estructural/tacomaFilm.ts:35`, nombre accesible del video: — → «Película muda de la destrucción del puente de Tacoma Narrows, 7 de noviembre de 1940»
150. `src/components/topics/resonancia-estructural/tacomaFilm.ts:52`, botón de velocidad real: — → «Velocidad real (×2/3)»

### Tablas 12.1 a 12.5 (`src/lib/tables/topics/resonancia-estructural.ts`)

151. `src/lib/tables/topics/resonancia-estructural.ts:41`, celda «Origen»: — → «Dato publicado»
152. `src/lib/tables/topics/resonancia-estructural.ts:42`, celda «Origen»: — → «Cálculo propio»
153. `src/lib/tables/topics/resonancia-estructural.ts:45`, celda «Origen»: — → «Extrapolado (cálculo propio)»
154. `src/lib/tables/topics/resonancia-estructural.ts:53`, columna: — → «Magnitud»
155. `src/lib/tables/topics/resonancia-estructural.ts:54`, columna: — → «Valor»
156. `src/lib/tables/topics/resonancia-estructural.ts:55`, columna: — → «Unidad»
157. `src/lib/tables/topics/resonancia-estructural.ts:56`, columna: — → «Origen»
158. `src/lib/tables/topics/resonancia-estructural.ts:57`, columna: — → «Fuente»
159. `src/lib/tables/topics/resonancia-estructural.ts:90`, celda «Fuente»: — → «Cálculo propio: ${how}»
160. `src/lib/tables/topics/resonancia-estructural.ts:105`, leyenda de tabla: — → «Pasarelas según la guía de Sétra y el paso militar. El rango 1 es el de riesgo máximo de resonancia; el paso de 2,0 Hz cae dentro del vertical. Las fuerzas son amplitudes por persona; la fila de 60 soldados aplica la (12.5) con todos en fase o con fases al azar (valor cuadrático medio).»
161. `src/lib/tables/topics/resonancia-estructural.ts:109`, fila: — → «Rango 1 vertical, riesgo máximo de resonancia»
162. `src/lib/tables/topics/resonancia-estructural.ts:113`, fila: — → «Rango 1 lateral»
163. `src/lib/tables/topics/resonancia-estructural.ts:114`, fila: — → «Marcha normal»
164. `src/lib/tables/topics/resonancia-estructural.ts:115`, fila: — → «Paso militar (quick time)»
165. `src/lib/tables/topics/resonancia-estructural.ts:117`, fila: — → «Paso militar, en hercios»
166. `src/lib/tables/topics/resonancia-estructural.ts:118`, celda «Fuente» (tras «Cálculo propio: »): — → «120 pasos/min ÷ 60»
167. `src/lib/tables/topics/resonancia-estructural.ts:122`, fila: — → «Fuerza vertical de un peatón, $F_1 = 0{,}4\,G_0$»
168. `src/lib/tables/topics/resonancia-estructural.ts:125`, celda «Fuente»: — → «${PEDESTRIAN_FORCES.verticalN.source}, con $G_0$ de Sétra, §1.2.1»
169. `src/lib/tables/topics/resonancia-estructural.ts:128`, fila: — → «Fuerza lateral de un peatón, $0{,}05\,G_0$, a $f_m/2$»
170. `src/lib/tables/topics/resonancia-estructural.ts:131`, celda «Fuente»: — → «${PEDESTRIAN_FORCES.lateralN.source}, con $G_0$ de Sétra, §1.2.1»
171. `src/lib/tables/topics/resonancia-estructural.ts:134`, fila: — → «Amortiguamiento de cálculo, pasarela de acero»
172. `src/lib/tables/topics/resonancia-estructural.ts:139`, fila: — → «Ancho del pico, $2\zeta f_0$, con $f_0$ = 2,0 Hz»
173. `src/lib/tables/topics/resonancia-estructural.ts:140`, celda «Fuente» (tras «Cálculo propio: »): — → «2 × 0,004 × 2,0 Hz»
174. `src/lib/tables/topics/resonancia-estructural.ts:144`, fila: — → «Amplificación en resonancia, $1/(2\zeta)$»
175. `src/lib/tables/topics/resonancia-estructural.ts:145`, celda «Fuente» (tras «Cálculo propio: »): — → «1/(2 × 0,004), (12.3)»
176. `src/lib/tables/topics/resonancia-estructural.ts:149`, fila: — → «60 soldados al paso, $N F_1$»
177. `src/lib/tables/topics/resonancia-estructural.ts:150`, celda «Fuente» (tras «Cálculo propio: »): — → «60 × ${comma(F1, 0)} N, (12.5)»
178. `src/lib/tables/topics/resonancia-estructural.ts:154`, fila: — → «60 soldados rompiendo el paso, $\sqrt{N}\,F_1$»
179. `src/lib/tables/topics/resonancia-estructural.ts:155`, celda «Fuente» (tras «Cálculo propio: »): — → «√60 × ${comma(F1, 0)} N, (12.5)»
180. `src/lib/tables/topics/resonancia-estructural.ts:160`, fuente de tabla: — → «Sétra/AFGC (2006), tablas 1.1, 2.3, 2.4 y 2.6 y §1.2.1; FM 3-21.5 (2003), párr. 4-5e; unos 60 soldados sobre el puente de Broughton según The Philosophical Magazine (1831); el resto, cálculo propio con las ecuaciones (12.3) y (12.5)»
181. `src/lib/tables/topics/resonancia-estructural.ts:180`, leyenda de tabla: — → «Millennium Bridge, primer modo lateral del vano central (CL1), medido. $N_L$ es la (12.8) con un reparto uniforme de la gente; el umbral de 166 personas se midió en el vano norte, con otro modo y otra masa modal, así que no se compara con él directamente.»
182. `src/lib/tables/topics/resonancia-estructural.ts:183`, fila: — → «Frecuencia de CL1, $f$»
183. `src/lib/tables/topics/resonancia-estructural.ts:185`, fila: — → «Masa modal de CL1, $M$»
184. `src/lib/tables/topics/resonancia-estructural.ts:190`, fila: — → «Amortiguamiento original»
185. `src/lib/tables/topics/resonancia-estructural.ts:195`, fila: — → «Amortiguamiento que uso, $\zeta$»
186. `src/lib/tables/topics/resonancia-estructural.ts:200`, fila: — → «Coeficiente de fuerza lateral, $k_p$»
187. `src/lib/tables/topics/resonancia-estructural.ts:205`, fila: — → «$N_L$ con la (12.8), tal como se construyó»
188. `src/lib/tables/topics/resonancia-estructural.ts:206`, celda «Fuente» (tras «Cálculo propio: »): — → «8π × 0,007 × 0,48 Hz × 130 000 kg ÷ 300 N·s/m» (Task 11: la guardia de glifos pide la $\pi$ en cursiva, como fórmula: «$8\pi$ × 0,007 × 0,48 Hz × 130 000 kg ÷ 300 N·s/m»)
189. `src/lib/tables/topics/resonancia-estructural.ts:210`, fila: — → «Umbral medido en el vano norte, sin amortiguadores»
190. `src/lib/tables/topics/resonancia-estructural.ts:215`, fila: — → «Amortiguadores viscosos añadidos»
191. `src/lib/tables/topics/resonancia-estructural.ts:220`, fila: — → «Amortiguamiento tras la reforma»
192. `src/lib/tables/topics/resonancia-estructural.ts:225`, fila: — → «$N_L$ con la (12.8) y $\zeta$ = 20 %»
193. `src/lib/tables/topics/resonancia-estructural.ts:226`, celda «Fuente» (tras «Cálculo propio: »): — → «el mismo modo CL1 con $\zeta$ = 0,20»
194. `src/lib/tables/topics/resonancia-estructural.ts:230`, fila: — → «Amplificación en resonancia antes, $1/(2\zeta)$»
195. `src/lib/tables/topics/resonancia-estructural.ts:231`, celda «Fuente» (tras «Cálculo propio: »): — → «1/(2 × 0,007)»
196. `src/lib/tables/topics/resonancia-estructural.ts:235`, fila: — → «Amplificación en resonancia después, $1/(2\zeta)$»
197. `src/lib/tables/topics/resonancia-estructural.ts:236`, celda «Fuente» (tras «Cálculo propio: »): — → «1/(2 × 0,20)»
198. `src/lib/tables/topics/resonancia-estructural.ts:241`, fuente de tabla: — → «Dallard et al., The Structural Engineer 79(22) (2001), tablas 1-3 y págs. 26-27; Newland, ICSV9 (2002); el resto, cálculo propio con las ecuaciones (12.3) y (12.8)»
199. `src/lib/tables/topics/resonancia-estructural.ts:265`, leyenda de tabla: — → «Aleteo de la torsión del Tacoma con $\zeta_s$ = 0,005. Cada fila de la Tabla I de Billah y Scanlan es el viento al que $A_2^*$ anula un amortiguamiento mecánico $\zeta$; con el del puente, la (12.11) da $\zeta_\text{neto}$, y la (12.12) la energía que gana o pierde en cada periodo natural, $e^{-4\pi\zeta_\text{neto}} - 1$. La fila de 42 mph prolonga en recta los dos últimos puntos de la tabla: es una extrapolación, no un dato.»
200. `src/lib/tables/topics/resonancia-estructural.ts:267`, columna: — → «Viento $U$»
201. `src/lib/tables/topics/resonancia-estructural.ts:268`, columna: — → «$\zeta$ de la Tabla I»
202. `src/lib/tables/topics/resonancia-estructural.ts:269`, columna: — → «$A_2^*$»
203. `src/lib/tables/topics/resonancia-estructural.ts:270`, columna: — → «$\zeta_\text{neto}$»
204. `src/lib/tables/topics/resonancia-estructural.ts:273`, columna: — → «Energía por ciclo, $\Delta E/E$»
205. `src/lib/tables/topics/resonancia-estructural.ts:278`, columna: — → «Origen de $A_2^*$»
206. `src/lib/tables/topics/resonancia-estructural.ts:282`, fuente de tabla: — → «Billah y Scanlan, Am. J. Phys. 59(2) (1991), Tabla I y ecuación (6), pág. 123; $\zeta_\text{neto}$, energía y extrapolación, cálculo propio con las ecuaciones (12.11) y (12.12)»
207. `src/lib/tables/topics/resonancia-estructural.ts:295`, leyenda de tabla: — → «Puente de Tacoma Narrows, 7 de noviembre de 1940. La torsión empezó hacia las 10:00 con 14 ciclos por minuto y terminó en 12; la frecuencia de los vórtices sale de la (12.9) con el viento de esa mañana.»
208. `src/lib/tables/topics/resonancia-estructural.ts:298`, fila: — → «Viento, medido hacia las 9:00»
209. `src/lib/tables/topics/resonancia-estructural.ts:300`, fila: — → «El mismo viento en el SI, $U$»
210. `src/lib/tables/topics/resonancia-estructural.ts:302`, celda «Fuente»: — → «Cálculo propio: 42 mph × 0,44704»
211. `src/lib/tables/topics/resonancia-estructural.ts:306`, fila: — → «Modo vertical de 8 o 9 nodos, esa mañana»
212. `src/lib/tables/topics/resonancia-estructural.ts:311`, fila: — → «Torsión de un nodo, al empezar»
213. `src/lib/tables/topics/resonancia-estructural.ts:316`, fila: — → «Torsión de un nodo, al final»
214. `src/lib/tables/topics/resonancia-estructural.ts:321`, fila: — → «Frecuencia de la torsión, $f_0$»
215. `src/lib/tables/topics/resonancia-estructural.ts:322`, celda «Fuente» (tras «Cálculo propio: »): — → «12 ciclos ÷ 60 s»
216. `src/lib/tables/topics/resonancia-estructural.ts:326`, fila: — → «Giro en los cuartos del vano»
217. `src/lib/tables/topics/resonancia-estructural.ts:331`, fila: — → «Amortiguamiento estructural de la torsión, $\zeta_s$»
218. `src/lib/tables/topics/resonancia-estructural.ts:336`, fila: — → «Amplificación si fuera resonancia forzada, $1/(2\zeta_s)$»
219. `src/lib/tables/topics/resonancia-estructural.ts:337`, celda «Fuente» (tras «Cálculo propio: »): — → «1/(2 × 0,005), (12.3)»
220. `src/lib/tables/topics/resonancia-estructural.ts:341`, fila: — → «Canto de la viga, $D$»
221. `src/lib/tables/topics/resonancia-estructural.ts:343`, celda «Fuente»: — → «Cálculo propio: 8 ft × 0,3048; ${TACOMA.deckDepthFt.source}»
222. `src/lib/tables/topics/resonancia-estructural.ts:346`, fila: — → «Número de Strouhal, $S$»
223. `src/lib/tables/topics/resonancia-estructural.ts:348`, fila: — → «Desprendimiento de vórtices, $f_s$ con la (12.9)»
224. `src/lib/tables/topics/resonancia-estructural.ts:349`, celda «Fuente» (tras «Cálculo propio: »): — → «0,11 × 18,8 m/s ÷ 2,44 m»
225. `src/lib/tables/topics/resonancia-estructural.ts:353`, fila: — → «Vórtices frente a torsión, $f_s/f_0$»
226. `src/lib/tables/topics/resonancia-estructural.ts:354`, celda «Fuente» (tras «Cálculo propio: »): — → «0,85 Hz ÷ 0,20 Hz»
227. `src/lib/tables/topics/resonancia-estructural.ts:359`, fuente de tabla: — → «Ammann, von Kármán y Woodruff, The Failure of the Tacoma Narrows Bridge (Federal Works Agency, 1941), págs. 11, 29-31 y V-9 a V-12; Billah y Scanlan, Am. J. Phys. 59(2) (1991), págs. 120 y 123; conversiones y frecuencias, cálculo propio»
228. `src/lib/tables/topics/resonancia-estructural.ts:368`, celda «Señal que sigo»: — → «Inclinación del horizonte»
229. `src/lib/tables/topics/resonancia-estructural.ts:369`, celda «Señal que sigo»: — → «Altura del borde del tablero»
230. `src/lib/tables/topics/resonancia-estructural.ts:388`, leyenda de tabla: — → «Mi medición del periodo de torsión en tres tomas del video, cuadro a cuadro. Elliott filmó a ${TACOMA_TORSION.cameraFps} cuadros por segundo y el video los pasa como si fueran ${TACOMA_TORSION.videoFps}, así que cada periodo real es ${comma(STRETCH, 1)} veces el del video. La media queda un ${comma(belowFarquharson * PERCENT, 0)} % por debajo de los 12 ciclos por minuto que cronometró Farquharson.»
231. `src/lib/tables/topics/resonancia-estructural.ts:390`, columna: — → «Toma»
232. `src/lib/tables/topics/resonancia-estructural.ts:391`, columna: — → «Instantes del archivo»
233. `src/lib/tables/topics/resonancia-estructural.ts:392`, columna: — → «Señal que sigo»
234. `src/lib/tables/topics/resonancia-estructural.ts:393`, columna: — → «Periodo en el video»
235. `src/lib/tables/topics/resonancia-estructural.ts:394`, columna: — → «Periodo real»
236. `src/lib/tables/topics/resonancia-estructural.ts:395`, columna: — → «Frecuencia real»
237. `src/lib/tables/topics/resonancia-estructural.ts:396`, columna: — → «Ciclos por minuto»
238. `src/lib/tables/topics/resonancia-estructural.ts:407`, fila: — → «Media de las tres tomas»
239. `src/lib/tables/topics/resonancia-estructural.ts:414`, fila: — → «Farquharson, cronómetro (1940)»
240. `src/lib/tables/topics/resonancia-estructural.ts:422`, fuente de tabla: — → «Medición propia (pnpm run data:tacoma, src/data/tacoma-torsion.json) sobre el archivo de Wikimedia Commons; velocidad de las cámaras según Olson, Wolf y Hook, Physics Today 68(11) (2015); 12 ciclos por minuto de Farquharson en el informe federal de 1941, pág. V-12»

### Fuentes de los datos que imprimen las tablas (`src/lib/data/bridges.ts`)

Las celdas «Fuente» de las filas «Dato publicado» y algunas de «Cálculo propio» muestran el `source` de cada valor tal como lo escribe el módulo de datos (Task 9 y esta tarea). Primero, las referencias que los componen (`${FWA}`, `${DALLARD}`…); luego, cada valor impreso.

241. `src/lib/data/bridges.ts:32`, referencia `FWA`: — → «Ammann, von Kármán y Woodruff, The Failure of the Tacoma Narrows Bridge (FWA, 1941)»
242. `src/lib/data/bridges.ts:33`, referencia `BILLAH`: — → «Billah y Scanlan, Am. J. Phys. 59(2), 118-124 (1991)»
243. `src/lib/data/bridges.ts:34`, referencia `DALLARD`: — → «Dallard et al., The London Millennium Footbridge, The Structural Engineer 79(22) (2001)»
244. `src/lib/data/bridges.ts:36`, referencia `NEWLAND`: — → «Newland, Vibration of the London Millennium Footbridge: Part 2 — Cure (ICSV9, 2002)»
245. `src/lib/data/bridges.ts:38`, referencia `SETRA`: — → «Sétra/AFGC, Footbridges: assessment of vibrational behaviour (2006)»
246. `src/lib/data/bridges.ts:39`, referencia `PHILMAG`: — → «Fall of the Broughton Suspension Bridge, near Manchester, The Philosophical Magazine 9(53), 384-389 (1831)»
247. `src/lib/data/bridges.ts:41`, referencia `FM`: — → «Department of the Army, FM 3-21.5 Drill and Ceremonies (2003)»
248. `src/lib/data/bridges.ts:42`, referencia `OWN`: — → «cálculo propio»
249. `src/lib/data/bridges.ts:62`, tabla 12.4, viento: — → «${FWA}, pág. 29 y V-9»
250. `src/lib/data/bridges.ts:63`, tabla 12.4, torsión al final: — → «${FWA}, V-12 (Farquharson); ${BILLAH}, pág. 120»
251. `src/lib/data/bridges.ts:64`, tabla 12.4, torsión al empezar: — → «${FWA}, pág. 31 y V-11 (Farquharson)»
252. `src/lib/data/bridges.ts:69`, tabla 12.4, modo vertical: — → «${FWA}, págs. 30-31 (8 o 9 nodos)»
253. `src/lib/data/bridges.ts:71`, tabla 12.4, giro en los cuartos: — → «${FWA}, pág. 31: «nearly 45 degrees each way»»
254. `src/lib/data/bridges.ts:72`, tabla 12.4, amortiguamiento de la torsión: — → «${BILLAH}, pág. 123: $\delta$ ≈ 0,03, $\zeta$ ≈ 0,005»
255. `src/lib/data/bridges.ts:73`, tabla 12.4, canto (tras «Cálculo propio: 8 ft × 0,3048; »): — → «${FWA}, pág. 11; ${BILLAH}, pág. 120»
256. `src/lib/data/bridges.ts:74`, tabla 12.4, Strouhal: — → «${BILLAH}, pág. 120: «about 0.11»»
257. `src/lib/data/bridges.ts:78`, figura 12.1 (no se imprime): — → «${FWA}, pág. 31: «The frequency suddenly changed from 37 to 14»»
258. `src/lib/data/bridges.ts:110`, tabla 12.2, $k_p$: — → «${DALLARD}, págs. 26-27 ($k_p$ en N·s/m, de 0,5 a 1,0 Hz)»
259. `src/lib/data/bridges.ts:112`, tabla 12.2, umbral del vano norte: — → «${NEWLAND} (vano norte, sin amortiguadores)»
260. `src/lib/data/bridges.ts:113`, tabla 12.2, amortiguadores viscosos: — → «${DALLARD}; ${NEWLAND}»
261. `src/lib/data/bridges.ts:118`, tabla 12.2, amortiguamiento original: — → «${DALLARD} (0,6-0,8 % medido); ${NEWLAND} («typically 1% or less»)»
262. `src/lib/data/bridges.ts:124`, tabla 12.2, amortiguamiento tras la reforma: — → «${NEWLAND} (modos laterales por debajo de 1,5 Hz)»
263. `src/lib/data/bridges.ts:128`, tabla 12.2, frecuencia de CL1: — → «${DALLARD}, tablas 1-3»
264. `src/lib/data/bridges.ts:129`, tabla 12.2, masa modal de CL1: — → «${DALLARD}, tablas 1-3 (medida: de 128 a 130 toneladas)»
265. `src/lib/data/bridges.ts:130`, tabla 12.2, amortiguamiento que uso: — → «${OWN}: centro del 0,6-0,8 % medido por ${DALLARD}»
266. `src/lib/data/bridges.ts:145`, tabla 12.1, rango 1 vertical: — → «${SETRA}, tabla 2.3 (pág. 80)»
267. `src/lib/data/bridges.ts:151`, tabla 12.1, rango 1 lateral: — → «${SETRA}, tabla 2.4 (pág. 80)»
268. `src/lib/data/bridges.ts:166`, tabla 12.1, marcha normal: — → «${SETRA}, tabla 1.1 (marcha)»
269. `src/lib/data/bridges.ts:176`, tabla 12.1, fuerza vertical de un peatón: — → «${OWN}: 0,4 × 700 N»
270. `src/lib/data/bridges.ts:180`, tabla 12.1, fuerza lateral de un peatón: — → «${OWN}: 0,05 × 700 N»
271. `src/lib/data/bridges.ts:185`, tabla 12.1, amortiguamiento del acero: — → «${SETRA}, tabla 2.6»
272. `src/lib/data/bridges.ts:189`, figura 12.3 y tabla 12.1 (no se imprime: la fila dice «60 soldados»): — → «${PHILMAG}: «about sixty … were upon the bridge»»
273. `src/lib/data/bridges.ts:193`, tabla 12.1, paso militar: — → «${FM}, párr. 4-5e («Quick Time»)»

### Datos que la página muestra tal cual (`src/data/tacoma-torsion.json`)

274. `src/data/tacoma-torsion.json:1`, tabla 12.5, nombre de la toma: — → «Sobre la calzada»
275. `src/data/tacoma-torsion.json:1`, tabla 12.5, nombre de la toma: — → «Sobre la calzada, con el auto»
276. `src/data/tacoma-torsion.json:1`, tabla 12.5, nombre de la toma: — → «Desde debajo de la torre»
277. `src/data/tacoma-torsion.json:1`, crédito del video (tras «Video: »), el que fija el brief: — → «Barney Elliott y Harbine Monroe (The Camera Shop, Tacoma), 7 de noviembre de 1940. Prelinger Archives vía Wikimedia Commons, dominio público»

### Laboratorio (Task 11: `src/components/topics/resonancia-estructural/ResonanceLab.tsx` y su carpeta)

Laboratorio nuevo: todo su texto es nuevo («antes» vacío) salvo el cambio de número de figura y la $\pi$ de la tabla 12.2.
Va en el paso 3, tras la tabla 12.1 (Sétra): dos de sus tres modos son ecuaciones de ese paso, la tropa (12.5) y el
filtro ZV (12.6), y el barrido reusa la curva (12.3) que el lector acaba de ver en el paso 2. Al entrar antes de la
medición, las figuras 12.4 a 12.7 pasan a ser 12.5 a 12.8; la única referencia escrita a una de ellas está en la marca
1:01,7 (abajo). Los `${…}` los pone el componente con los modelos probados; los números de las notas de preajuste,
de «Cómo se usa» y de las notas del lienzo salen de las constantes que describen (`labTexts.test.ts` y
`resonancePresets.test.ts` los fijan; los del MDX, `resonanciaNumbers.test.ts`), y aquí van como se imprimen hoy.

Para leer con atención:

- **Mi regla de barrido lento, $T_b \ge 4/(\zeta^2 f_0)$ (cálculo propio).** La saqué simulando el barrido con el
  mismo integrador para $\zeta$ de 0,05 a 0,3: con ella cada pico de la envolvente queda a menos de un 5 % de la
  (12.3), un 4 % en el peor caso, justo pasada la resonancia. No es de Klipper; Klipper barre a 1 Hz/s.
- **La masa modal de la pasarela, 40 toneladas, es ilustrativa** (ninguna fuente da la de Broughton), igual que las
  $f_0$ de 1 Hz, 2,0 Hz y 2,5 Hz de los ejemplos. Con ella el pelotón al paso llega a 332 mm.
- **El primer sorteo es uno típico (semilla 1832):** con 60 soldados da $|\Sigma e^{i\varphi}|$ = 6,4, la mediana
  de un sorteo, y un cociente de 9,3. No coincide con la figura 12.3, que sortea $N$ = 10 a 200 de una sola tirada
  (su punto de 60 es otro sorteo). «Nuevo sorteo» enseña cuánto varía uno solo; la lectura «En media cuadrática,
  $\sqrt{N}$» da el promedio que vale.
- **La vibración residual es la estimación de Klipper** (`shaper_calibrate.py`, `_estimate_shaper`, L186-L198; la
  investigación la cita en §3.4 y §7): compara lo que dejan los dos impulsos con un solo empujón dado en el segundo,
  así que nunca pasa del 100 %. Da 6,6–6,7 % a ±5 % (Klipper promete dividirla por 10) y unos 13 % a ±10 %. En la
  gráfica el empujón solo está en $t = 0$; la nota del lienzo lo dice.
- En «Tropa» el amortiguamiento va en % (0,4 %, como lo escribe Sétra); en los otros dos modos, como razón (0,1, como
  Klipper).

278. `src/content/topics/resonancia-estructural.mdx:389`, pie del laboratorio (figura 12.4, paso 3): — → «Laboratorio de la resonancia, ecuaciones (12.2), (12.3), (12.5) y (12.6). En «Barrido», la frecuencia de la fuerza recorre de $0{,}5\,f_0$ a $1{,}5\,f_0$ y la envolvente se traza sobre la curva; en «Tropa», $N$ soldados a 2,0 Hz cruzan una pasarela al paso o rompiendo el paso; en «Filtro ZV», un empujón frente a los dos impulsos de Klipper.»
279. `src/content/topics/resonancia-estructural.mdx:391`, fuente del laboratorio: — → «Simulación del autor sobre src/lib/physics/resonance.ts; la masa de la pasarela y las frecuencias de los ejemplos son ilustrativas»
280. `src/content/topics/resonancia-estructural.mdx:396`, «Cómo se usa», última nota (del MDX; `${SWEEP_PLAYBACK_S}` = 60): — → «La «Tropa» y el «Filtro ZV» corren en tiempo real; un barrido que dura más de ${SWEEP_PLAYBACK_S} s se reproduce a cámara rápida, en potencias de dos, con la escala en la esquina del dibujo.»
281. `src/content/topics/resonancia-estructural.mdx:397`, «Qué deja fuera el modelo» (del MDX; 2,0 Hz y 0,2 Hz los fija `resonanciaNumbers.test.ts`): — → «Un solo modo de cada estructura, el primero, con forma de medio seno; la masa modal de la pasarela y las frecuencias de los ejemplos son ilustrativas; los soldados marchan todos a 2,0 Hz exactos, sin la dispersión de unos 0,2 Hz que Sétra mide en la gente; nadie acompasa su paso al puente, como en el Millennium (12.7); el filtro actúa sobre un empujón, no sobre el recorrido de un cabezal, y Klipper tiene más filtros que el ZV.»
282. `src/content/topics/resonancia-estructural.mdx:551`, análisis de la marca 1:01,7 (el laboratorio entra antes y la medición pasa a ser la figura 12.8): «… Cuadro a cuadro mido 3,43 s por ciclo (figura 12.7 y tabla 12.5). …» → «… Cuadro a cuadro mido 3,43 s por ciclo (figura 12.8 y tabla 12.5). …»
283. `src/components/topics/resonancia-estructural/ResonanceLab.tsx:132`, título del laboratorio: — → «Laboratorio de la resonancia»
284. `src/components/topics/resonancia-estructural/labTexts.ts:28`, «Cómo se usa», la perilla (`${COARSE_STEPS}` = 5): — → «Arrastra la perilla $f_0$ de la regla de frecuencias, bajo el puente, o enfócala y muévela con las flechas (un paso; con Mayús, ${COARSE_STEPS}); Inicio y Fin la llevan a los extremos.»
285. `src/components/topics/resonancia-estructural/labTexts.ts:30`, «Cómo se usa», atajos: — → «Atajos, fuera de los campos: Espacio o K reproduce y pausa; R reinicia; «,» y «.» retroceden o avanzan un cuadro.»
286. `src/components/topics/resonancia-estructural/labTexts.ts:34`, «Cómo se usa» en «Barrido» (números de las constantes: el rango del barrido, la regla y su 5 %): — → «En «Barrido», la frecuencia de la fuerza sube en línea recta de $0{,}5\,f_0$ a $1{,}5\,f_0$ a lo largo de la corrida, como en el barrido de Klipper, y la gráfica traza la envolvente sobre la (12.3). Con $T_b \ge 4/(\zeta^2 f_0)$ (cálculo propio) el barrido es lento y la envolvente queda a menos de un 5 % de la curva; más rápido, se queda corta y llega tarde.»
287. `src/components/topics/resonancia-estructural/labTexts.ts:35`, «Cómo se usa» en «Tropa» (de las constantes: paso militar, 280 N, 40 toneladas): — → «En «Tropa», $N$ soldados marchan a 2,0 Hz con 280 N cada uno. «Al paso» suma sus fuerzas en fase; «Rompiendo el paso», con fases al azar, y «Nuevo sorteo» sortea otras. La masa modal de la pasarela, 40 toneladas, es ilustrativa.»
288. `src/components/topics/resonancia-estructural/labTexts.ts:36`, «Cómo se usa» en «Filtro ZV» (de las constantes: $\zeta$ de Klipper y ±5 %): — → «En «Filtro ZV», arriba la estructura recibe un empujón; abajo, el mismo empujón partido en los dos impulsos de Klipper para $f_\text{ZV}$, con el $\zeta$ = 0,1 que Klipper supone. La «Vibración residual» es la estimación de Klipper (shaper_calibrate.py). Saca $f_0$ de la banda de ±5 % o cambia $\zeta$, y la vibración vuelve.»
289. `src/components/topics/resonancia-estructural/ResonanceControls.tsx:74`, rótulo de parámetro (en los tres modos): — → «Frecuencia natural $f_0$»
290. `src/components/topics/resonancia-estructural/ResonanceControls.tsx:82`, rótulo de parámetro (en los tres modos): — → «Amortiguamiento $\zeta$»
291. `src/components/topics/resonancia-estructural/ResonanceControls.tsx:90`, rótulo de parámetro: — → «Duración del barrido $T_b$»
292. `src/components/topics/resonancia-estructural/ResonanceControls.tsx:105`, rótulo de parámetro: — → «Soldados $N$»
293. `src/components/topics/resonancia-estructural/ResonanceControls.tsx:144`, rótulo de parámetro: — → «Frecuencia del filtro $f_\text{ZV}$»
294. `src/components/topics/resonancia-estructural/ResonanceControls.tsx:122`, unidad del amortiguamiento en «Tropa»: — → «%» (Sétra lo escribe en %, 0,4 %; en «Barrido» y «Filtro ZV» va sin unidad, 0,1 como Klipper)
295. `src/components/topics/resonancia-estructural/ResonanceControls.tsx:179`, elección del nivel 2 en «Tropa»: — → «Paso»
296. `src/components/topics/resonancia-estructural/ResonanceControls.tsx:186`, botón (solo rompiendo el paso): — → «Nuevo sorteo»
297. `src/components/topics/resonancia-estructural/labTexts.ts:42`, nota del lienzo en «Barrido»: — → «El vibrador empuja el centro del vano con $F_0\cos\varphi(t)$, y la flecha azul es esa fuerza. El dibujo exagera el desplazamiento; la gráfica lo da en veces la deformación estática $F_0/k$.»
298. `src/components/topics/resonancia-estructural/labTexts.ts:43`, nota del lienzo en «Tropa» (0,5 m de `TROOP_DRAWING_FULL_M`): — → «Dibujo a escala vertical: el tablero cabe hasta 0,5 m arriba y abajo, y más allá queda en el borde, «fuera de escala». Cada trazo es un soldado, y su cabeza sube y baja con la fase de su paso.»
299. `src/components/topics/resonancia-estructural/labTexts.ts:45`, nota del lienzo en «Filtro ZV»: — → «$A_1$ es la amplitud que deja un solo empujón; las flechas marcan cada empujón cuando llega, y la gráfica lleva una línea en el segundo impulso. La vibración residual es la estimación de Klipper: compara lo que dejan los dos impulsos con un solo empujón dado en el segundo; en la gráfica ese empujón está en $t = 0$, y su vibración lleva medio periodo apagándose.»
300. `src/components/topics/resonancia-estructural/ResonanceLab.tsx:46`, elección del nivel 2: — → «Modo»
301. `src/components/topics/resonancia-estructural/resonanceLabSettings.ts:8`, opción de «Modo»: — → «Barrido»
302. `src/components/topics/resonancia-estructural/resonanceLabSettings.ts:9`, opción de «Modo»: — → «Tropa»
303. `src/components/topics/resonancia-estructural/resonanceLabSettings.ts:10`, opción de «Modo»: — → «Filtro ZV»
304. `src/components/topics/resonancia-estructural/resonanceLabSettings.ts:14`, opción de «Paso»: — → «Al paso»
305. `src/components/topics/resonancia-estructural/resonanceLabSettings.ts:15`, opción de «Paso»: — → «Rompiendo el paso»
306. `src/components/topics/resonancia-estructural/resonanceLabSettings.ts:49`, interruptor del cajón («Este simulador»): — → «Banda de la envolvente»
307. `src/components/topics/resonancia-estructural/resonanceLabSettings.ts:50`, interruptor del cajón («Este simulador»): — → «Gráfica de apoyo»
308. `src/components/topics/resonancia-estructural/resonancePresets.ts:187`, grupo de preajustes (<optgroup>): — → «Barrido»
309. `src/components/topics/resonancia-estructural/resonancePresets.ts:188`, grupo de preajustes (<optgroup>): — → «Tropa»
310. `src/components/topics/resonancia-estructural/resonancePresets.ts:189`, grupo de preajustes (<optgroup>): — → «Filtro ZV»
311. `src/components/topics/resonancia-estructural/resonancePresets.ts:197`, nombre de preajuste: — → «Barrido lento»
312. `src/components/topics/resonancia-estructural/resonancePresets.ts:206`, nombre de preajuste: — → «Barrido rápido»
313. `src/components/topics/resonancia-estructural/resonancePresets.ts:214`, nombre de preajuste: — → «Sin amortiguamiento»
314. `src/components/topics/resonancia-estructural/resonancePresets.ts:222`, nombre de preajuste: — → «60 soldados al paso»
315. `src/components/topics/resonancia-estructural/resonancePresets.ts:230`, nombre de preajuste: — → «60 soldados rompiendo el paso»
316. `src/components/topics/resonancia-estructural/resonancePresets.ts:238`, nombre de preajuste: — → «Pasarela fuera del rango de Sétra»
317. `src/components/topics/resonancia-estructural/resonancePresets.ts:246`, nombre de preajuste: — → «Filtro afinado»
318. `src/components/topics/resonancia-estructural/resonancePresets.ts:255`, nombre de preajuste: — → «Frecuencia natural un 10 % mayor»
319. `src/components/topics/resonancia-estructural/resonancePresets.ts:136`, nota de preajuste (los números, de las constantes y los modelos): — → «Un oscilador de $f_0$ = 1 Hz (ilustrativo) con el $\zeta$ = 0,1 que supone Klipper, barrido en $T_b$ = 400 s, lo que pide mi regla $T_b \ge 4/(\zeta^2 f_0)$: la envolvente sigue a la (12.3) a menos de un 5 % y su pico llega a 5,00, frente a $1/(2\zeta)$ = 5,00.»
320. `src/components/topics/resonancia-estructural/resonancePresets.ts:142`, nota de preajuste (los números, de las constantes y los modelos): — → «El mismo oscilador barrido en 40 s, 10 veces más rápido: el transitorio dura del orden de $1/(\zeta\omega_0)$ = 1,6 s, la amplitud no alcanza a seguir a la fuerza y su pico, 4,78 en vez de 5,00, llega tarde, en $\omega_d/\omega_0$ = 1,06.»
321. `src/components/topics/resonancia-estructural/resonancePresets.ts:147`, nota de preajuste (los números, de las constantes y los modelos): — → «Con $\zeta$ = 0 la (12.3) no tiene estado estacionario en $\omega_d = \omega_0$, crece sin límite; el barrido cruza la resonancia en un tiempo finito y la envolvente llega a 72,5 veces $F_0/k$.»
322. `src/components/topics/resonancia-estructural/resonancePresets.ts:153`, nota de preajuste (los números, de las constantes y los modelos): — → «Los unos 60 soldados que cruzaban el puente de Broughton en 1831, a 2,0 Hz y 280 N cada uno, sobre una pasarela de acero de $f_0$ = 2,0 Hz con el $\zeta$ = 0,4 % de Sétra y 40 toneladas de masa modal (las dos, ilustrativas): el tablero llega al 90 % de su amplitud estacionaria, 332 mm, a los 46 s.»
323. `src/components/topics/resonancia-estructural/resonancePresets.ts:161`, nota de preajuste (los números, de las constantes y los modelos): — → «Los mismos 60 rompiendo el paso, con fases al azar de un sorteo típico (semilla fija): la fuerza total baja de 16,8 kN a 1,8 kN y la amplitud estacionaria, de 332 mm a 36 mm, 9,3 veces menos; en media cuadrática sobre muchos sorteos, $\sqrt{60}$ = 7,7 veces.»
324. `src/components/topics/resonancia-estructural/resonancePresets.ts:167`, nota de preajuste (los números, de las constantes y los modelos): — → «La misma tropa al paso sobre una pasarela de $f_0$ = 2,5 Hz (ilustrativa), fuera del rango de riesgo máximo de Sétra, de 1,7 a 2,1 Hz: a 2,0 Hz la fuerza ya no va al ritmo del puente y la amplitud estacionaria se queda en 4,7 mm.»
325. `src/components/topics/resonancia-estructural/resonancePresets.ts:177`, nota de preajuste (los números, de las constantes y los modelos): — → «Klipper reparte el empujón en $a_1$ = 0,578 en $t = 0$ y $a_2$ = 0,422 en $t_2$ = 0,503 s, medio periodo amortiguado, con $f_\text{ZV}$ = 1 Hz y $\zeta$ = 0,1; sobre una estructura con esos mismos valores (ilustrativos), la vibración que queda tras el segundo impulso, según la estima Klipper, es menos del 1 % de la de un solo empujón.»
326. `src/components/topics/resonancia-estructural/resonancePresets.ts:183`, nota de preajuste (los números, de las constantes y los modelos): — → «Si $f_0$ sube un 10 %, a 1,1 Hz, y el filtro sigue en 1 Hz, el segundo impulso ya no llega en contrafase: según la estimación de Klipper queda un 13,1 % de la vibración, cuando Klipper promete dividirla por 10 solo dentro de ±5 %.»
327. `src/components/topics/resonancia-estructural/resonancePresets.ts:200`, fuente de preajuste (tras «Fuente:»): — → «Klipper v0.13.0, shaper_defs.py L9; regla de barrido lento (cálculo propio)»
328. `src/components/topics/resonancia-estructural/resonancePresets.ts:209`, fuente de preajuste (tras «Fuente:»): — → «Cálculo propio con la (12.2)»
329. `src/components/topics/resonancia-estructural/resonancePresets.ts:217`, fuente de preajuste (tras «Fuente:»): — → «Cálculo propio con la (12.2) y la (12.3)»
330. `src/components/topics/resonancia-estructural/resonancePresets.ts:107`, fuente de preajuste (tras «Fuente:»): — → «The Philosophical Magazine (1831); FM 3-21.5 (2003); Sétra (2006), §1.2.1 y tabla 2.6»
331. `src/components/topics/resonancia-estructural/resonancePresets.ts:241`, fuente de preajuste (tras «Fuente:»): — → «Sétra (2006), tabla 2.3; $f_0$ ilustrativa»
332. `src/components/topics/resonancia-estructural/resonancePresets.ts:249`, fuente de preajuste (tras «Fuente:»): — → «Klipper v0.13.0, shaper_defs.py L17-L23»
333. `src/components/topics/resonancia-estructural/resonancePresets.ts:258`, fuente de preajuste (tras «Fuente:»): — → «Klipper v0.13.0, docs/Resonance_Compensation.md L466-L482»
334. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:27`, lectura: — → «Frecuencia de la fuerza $f_d$»
335. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:33`, lectura: — → «$\omega_d/\omega_0$»
336. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:40`, lectura: — → «Amplitud medida $A/(F_0/k)$»
337. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:46`, lectura: — → «Pico medido hasta ahora»
338. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:60`, lectura: — → «Fuerza total $|F|$»
339. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:67`, lectura: — → «Amplitud del tablero»
340. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:74`, lectura: — → «Al paso / rompiendo el paso, este sorteo»
341. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:81`, lectura: — → «En media cuadrática, $\sqrt{N}$»
342. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:94`, lectura: — → «Vibración residual (estimación de Klipper)»
343. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:101`, lectura: — → «Desajuste $f_0/f_\text{ZV} - 1$»
344. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:108`, lectura: — → «Instante del segundo impulso $t_2$»
345. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:115`, lectura: — → «Fracción del primero $a_1$»
346. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:122`, lectura: — → «Fracción del segundo $a_2$»
347. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:160`, ficha, rótulo de la fila en «Barrido»: — → «Barrido»
348. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:162`, ficha en «Barrido»: — → «Pico de la (12.3): $1/(2\zeta)$ = ${…}» o «Pico de la (12.3): sin amortiguamiento, crece sin límite»
349. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:155`, ficha en «Barrido»: — → «lento desde $T_b$ = ${…} s: este lo es» o «… : este es rápido»
350. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:156`, ficha en «Barrido» sin amortiguamiento: — → «sin amortiguamiento ninguno es lento»
351. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:176`, ficha, rótulo de la fila en «Tropa»: — → «Amplitud estacionaria, (12.3)»
352. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:178`, ficha en «Tropa»: — → «al paso: ${…} mm» o «al paso: crece sin límite»
353. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:179`, ficha en «Tropa»: — → «rompiendo el paso: ${…} mm» o «rompiendo el paso: crece sin límite»
354. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:184`, ficha, rótulo de la fila en «Tropa»: — → «Sétra»
355. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:188`, ficha en «Tropa»: — → «$f_0$ ${dentro|fuera} del rango de riesgo máximo, de 1,7 a 2,1 Hz; paso militar a 2,0 Hz»
356. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:204`, ficha, rótulo de la fila en «Filtro ZV»: — → «Klipper»
357. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:208`, ficha en «Filtro ZV»: — → «filtro para $f_\text{ZV}$ = ${…} Hz con $\zeta$ = 0,1»
358. `src/components/topics/resonancia-estructural/resonanceReadouts.ts:199`, ficha en «Filtro ZV»: — → «$f_0$ dentro de ±5 %, donde Klipper promete dividir la vibración por 10» o «$f_0$ fuera de ±5 %»
359. `src/components/topics/resonancia-estructural/resonanceScene.ts:157`, evento de la reproducción (texto plano: marca, «Siguiente: …» y anuncio): — → «Paso por la resonancia»
360. `src/components/topics/resonancia-estructural/resonanceScene.ts:158`, evento de la reproducción (texto plano: marca, «Siguiente: …» y anuncio): — → «Pico de la envolvente»
361. `src/components/topics/resonancia-estructural/resonanceScene.ts:286`, evento de la reproducción (texto plano: marca, «Siguiente: …» y anuncio): — → «90 % de la amplitud estacionaria»
362. `src/components/topics/resonancia-estructural/resonanceScene.ts:387`, evento de la reproducción (texto plano: marca, «Siguiente: …» y anuncio): — → «Segundo impulso»
363. `src/components/topics/resonancia-estructural/BridgeLayers.tsx:51`, título del tablero de arriba en «Filtro ZV»: — → «Un empujón»
364. `src/components/topics/resonancia-estructural/BridgeLayers.tsx:52`, título del tablero de abajo en «Filtro ZV»: — → «Dos empujones (filtro ZV)»
365. `src/components/topics/resonancia-estructural/BridgeLayers.tsx:129`, aviso sobre el tablero que pasa del dibujo: — → «fuera de escala»
366. `src/components/topics/resonancia-estructural/BridgeScene.tsx:50`, rótulo del lienzo en «Tropa»: — → «$N$ = ${n}, al paso» o «$N$ = ${n}, rompiendo el paso»
367. `src/components/topics/resonancia-estructural/BridgeLayers.tsx:320`, barra de escala en «Tropa»: — → «25 cm»
368. `src/components/topics/resonancia-estructural/bridgeRuler.ts:21`, banda de la regla en «Barrido»: — → «barrido»
369. `src/components/topics/resonancia-estructural/bridgeRuler.ts:29`, banda de la regla en «Tropa»: — → «Sétra: riesgo máximo»
370. `src/components/topics/resonancia-estructural/bridgeRuler.ts:30`, marca de la regla en «Tropa»: — → «paso militar»
371. `src/components/topics/resonancia-estructural/bridgeRuler.ts:41`, banda de la regla en «Filtro ZV»: — → «±5 %»
372. `src/components/topics/resonancia-estructural/bridgeRuler.ts:45`, marca de la regla en «Filtro ZV»: — → «$f_\text{ZV}$»
373. `src/components/topics/resonancia-estructural/BridgeScene.tsx:73`, marca móvil de la regla en «Barrido»: — → «$f_d$»
374. `src/components/topics/resonancia-estructural/FrequencyRuler.tsx:266`, unidad de la regla: — → «Hz»
375. `src/components/topics/resonancia-estructural/FrequencyRuler.tsx:156`, rótulo de la perilla: — → «$f_0$ = ${…} Hz»
376. `src/components/topics/resonancia-estructural/FrequencyRuler.tsx:77`, nombre accesible de la perilla (se oye: «Frecuencia natural f sub 0»): — → «Frecuencia natural $f_0$»
377. `src/components/topics/resonancia-estructural/sceneText.ts:25`, nombre accesible del lienzo en «Barrido» (se oye, no se ve): — → «Puente de prueba de $f_0$ = ${…} con un vibrador en el centro del vano. La frecuencia de la fuerza sube de ${…} a ${…}; ahora vale ${…} y la amplitud es ${…} veces la deformación estática.»
378. `src/components/topics/resonancia-estructural/sceneText.ts:31`, nombre accesible del lienzo en «Tropa» (se oye): — → «Pasarela de $f_0$ = ${…} con ${n} soldados ${al paso|rompiendo el paso} a 2,00 Hz; el tablero sube y baja ${…} mm.»
379. `src/components/topics/resonancia-estructural/sceneText.ts:34`, nombre accesible del lienzo en «Filtro ZV» (se oye): — → «Dos tableros iguales de $f_0$ = ${…}: arriba, un solo empujón; abajo, los dos impulsos del filtro ZV de ${…}. Tras el segundo impulso queda, según la estimación de Klipper, el ${…} % de la vibración de un solo empujón.»
380. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:78`, título de la gráfica en «Barrido»: — → «Curva de resonancia: la (12.3) y lo que traza el barrido»
381. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:79`, eje: — → «$\omega_d/\omega_0$ (adimensional)»
382. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:81`, eje: — → «Amplitud relativa $A/(F_0/k)$ (adimensional)»
383. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:64`, leyenda: — → «Estado estacionario, (12.3)»
384. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:70`, leyenda: — → «Envolvente del barrido»
385. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:90`, nombre accesible del cursor (se oye): — → «Frecuencia de la fuerza»
386. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:92`, rótulo del cursor: — → «$\omega_d/\omega_0$ = ${…}»
387. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:95`, nombre accesible de la gráfica (se oye): — → «La curva azul es la amplitud estacionaria de la (12.3) entre $\omega_d/\omega_0$ = 0,5 y 1,5; su pico vale ${…}» (o «sin amortiguamiento crece sin límite en $\omega_d = \omega_0$»)«. La violeta es la envolvente que traza el barrido hasta ahora; su pico llega a ${…}.»
388. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:121`, título de la gráfica en «Tropa»: — → «Amplitud del tablero, al paso y rompiendo el paso»
389. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:124`, eje: — → «Amplitud (mm)»
390. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:127`, leyenda: — → «Al paso»
391. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:128`, leyenda: — → «Rompiendo el paso»
392. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:135`, guía horizontal: — → «estacionaria al paso» y «estacionaria rompiendo el paso»
393. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:138`, nombre accesible de la gráfica (se oye): — → «La amplitud del tablero sube desde cero: al paso hasta ${…} mm» (o «crecer sin límite»)«, rompiendo el paso hasta ${…} mm» (o «crecer sin límite»)«, en ${…} s.»
394. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:150`, título de la gráfica en «Filtro ZV»: — → «Un empujón frente a los dos impulsos del filtro ZV»
395. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:153`, eje: — → «$x/A_1$ (adimensional)»
396. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:158`, leyenda: — → «Un empujón»
397. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:164`, leyenda: — → «Dos impulsos (ZV)»
398. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:183`, nombre accesible de la gráfica (se oye): — → «Tras un empujón la estructura oscila y se apaga despacio; con los dos impulsos del filtro, el segundo a los ${…} s, queda, según la estimación de Klipper, un ${…} % de la vibración de un empujón.»
399. `src/components/topics/resonancia-estructural/ResonancePlot.tsx:36`, rótulo del cursor de tiempo: — → «$t$ = ${…} s»
400. `src/lib/tables/topics/resonancia-estructural.ts:206`, tabla 12.2, celda «Fuente» de $N_L$ (cambio de forma, no de texto: la guardia de glifos pedía la $\pi$ en cursiva, como fórmula): «8π × 0,007 × 0,48 Hz × 130 000 kg ÷ 300 N·s/m» → «$8\pi$ × 0,007 × 0,48 Hz × 130 000 kg ÷ 300 N·s/m»

## Tema 13

Los `${…}` son valores que el código calcula y escribe; entre corchetes, el valor que sale hoy.

Tema nuevo (Tasks 12 y 13): todo lo de esta sección es "nuevo". Son borradores de Claude y no cuentan como
publicados hasta que Dylan los lea. La prosa del MDX suma 647 palabras (límite 650). Las líneas son las de la
ronda de correcciones 1 de la Task 13.

### Página: `src/content/topics/enfriamiento-liquido.mdx`

Frontmatter:

1. `:5` shortTitle — nuevo: «Enfriamiento líquido».
2. `:6` concept — nuevo: «Continuidad, Bernoulli y la ecuación generalizada con pérdidas; cómo se reparte el caudal
   entre servidores en paralelo para que le llegue suficiente a cada uno.»
3. `:9-10` caso de uso — nuevo: producto «Circuito de un rack de clase NVIDIA GB200 NVL72 con el CDU Google Project
   Deschutes (OCP)»; industria «Centros de datos: enfriamiento líquido directo al chip».
4. `:105` nota de clase (Módulo 6, Tema 2) — nuevo: «$Q = A_1 v_1 = A_2 v_2$ y Bernoulli con $\rho g z$: son la (13.1) y
   la (13.2), con la altura escrita $y$.»
5. `:108` nota de clase (Módulo 6, Tema 3) — nuevo: «La ecuación generalizada con $h_b$ y $h_L$ es la (13.3), escrita en
   presiones. Darcy–Weisbach y Moody, que el módulo solo nombra, y los $K$ y $C_v$ son extensión.»
6. `:111` nota de clase (Módulo 6, Tema 4) — nuevo: «$\mathrm{Re} = \rho v D/\mu$, con los límites de la clase: laminar
   bajo 2300 y turbulento sobre 4000.»
7. `:12-100` fuentes — nuevo: trece entradas, con títulos y editores tal como los publica cada fuente. Melinder va
   dentro de la entrada de la MBL, y el NIST en la del WebBook.

Prosa:

8. `:130` entrada — nuevo: «Un rack de IA de clase NVIDIA GB200 NVL72 disipa unos 120 kW [1] con líquido que pasa por
   placas frías. Sigo un litro desde la bomba hasta el servidor más lejano y de vuelta.»
9. `:132` título del paso 1 — nuevo: «El caudal se conserva».
10. `:134` — nuevo: «Uso el circuito RD109 de Schneider Electric [2], analizado por GF [3]: un CDU entrega 23 L/s a 8
    racks de 24 servidores. NVIDIA no publica el caudal por bandeja: reparto por igual los 23 L/s; la regla de OCP,
    1,5 L/min por kW [4], que tomo como dato, da lo que pide cada uno.»
11. `:141-147` símbolos de la (13.1) — nuevo: $Q$ «caudal: volumen por unidad de tiempo; en las tablas, en L/min»; $A$
    «área de la sección»; $v$ «velocidad media del líquido en la sección»; $D$ «diámetro interior del tramo».
12. `:155` Por qué, fenómeno — nuevo: «Donde la tubería se estrecha, el líquido va más rápido; en cada derivación, el
    caudal se reparte.»
13. `:161` Por qué, ecuación — nuevo: «Cada servidor recibe $q$ = 7,19 L/min: 1,69 m/s en su manguera de 9,5 mm y
    2,91 m/s en la boca de 7,24 mm del conector UQD04. Modelo simple: cada servidor recibe su parte.»
14. `:170` pie de la figura 13.1 — nuevo: «Continuidad: velocidad media frente al área de las secciones del circuito RD109,
    con el eje de áreas logarítmico. Cada caudal fija una hipérbola $v = Q/A$; el manifold baja de la del rack a la de
    un servidor a medida que reparte el caudal.»
15. `:172` fuente de la figura 13.1 — nuevo: «Calculé las velocidades con la ecuación (13.1); caudales de GF para el RD109
    y diámetros de GF, OCP y NVIDIA MGX (tablas 13.1 a 13.3)».
16. `:182` título del paso 2 — nuevo: «Bernoulli: donde la velocidad sube, la presión baja».
17. `:184` — nuevo: «La (13.2) es el teorema trabajo–energía por unidad de volumen de un fluido ideal; como el libro [5],
    escribo la altura $y$.»
18. `:190-197` símbolos de la (13.2) — nuevo: $p$ «presión absoluta»; $\rho$ «densidad del PG25 a 40 °C, 1 010,6 kg/m³
    (tabla 13.1)»; $g$ «aceleración de la gravedad, 9,81 m/s²»; $y$ «altura del punto».
19. `:205` Por qué, fenómeno — nuevo: «Al entrar al conector, el líquido acelera y su presión baja; al subir, también.»
20. `:211` Por qué, ecuación — nuevo: «De la manguera al conector, la presión baja $\tfrac12\rho(v_2^2 - v_1^2)$ =
    2,8 kPa; al subir 1,07 m de manifold, $\rho g\,\Delta y$ = 10,6 kPa. Sin pérdidas, ambas se recuperan y la presión
    vuelve a 400 kPa al cerrar el lazo.»
21. `:219` pie de la figura 13.2 (el recurso prescrito) — nuevo: «Velocidad y presión a lo largo del recorrido de un
    litro de PG25, del CDU al servidor 24 (el de arriba) y de vuelta, con retorno directo. La presión ideal de
    Bernoulli, discontinua, vuelve a 400 kPa; la real, continua, llega con 1,80 bar menos. Debajo, cada tramo con su
    sección; los parámetros están en las tablas 13.1 a 13.3.»
22. `:221` fuente de la figura 13.2 — nuevo: «Calculé el perfil con las ecuaciones (13.1) a (13.3): circuito RD109 de
    Schneider Electric con los caudales, los diámetros y la caída de la placa de GF; UQD04 de OCP v2.0.0 y su $C_v$ de
    Amphenol; manifold MGX de NVIDIA (OCP); PG25 a 40 °C con los polinomios de Melinder de la Modelica Buildings Library
    de LBNL; rugosidad y $K$ de EPANET».
23. `:231` título del paso 3 — nuevo: «Por qué no basta: la fricción y los accesorios disipan energía».
24. `:233` — nuevo: «Paso a presiones la ecuación generalizada de la clase. Para Darcy–Weisbach y los $K$ de los
    accesorios uso los valores de EPANET [6]; los conectores dan $C_v$ [7], y la placa fría, los 1,2 bar de diseño de
    GF, no una curva medida.»
25. `:237` la (13.3), en cuatro líneas — nuevo: la ecuación generalizada en presiones, y
    $\rho g h_L = \sum f\,\tfrac{L}{D}\,\tfrac12\rho v^2 + \sum K\,\tfrac12\rho v^2 + \sum \Delta p_{C_v} +
    \Delta p_\text{placa}$, con $\mathrm{Re} = \rho v D/\mu$.
26. `:239-262` símbolos de la (13.3) — nuevo:
    - $h_b$ «altura que da la bomba»;
    - $h_L$ «pérdida de carga entre los dos puntos»;
    - $f$ «factor de fricción de Darcy: $64/\mathrm{Re}$ bajo 2300 y la fórmula de Swamee y Jain sobre 4000, como
      EPANET; entre los dos límites de la clase, la cúbica de transición de EPANET, que en su código empieza en 2000»;
    - $L$ «longitud del tramo»;
    - $K$ «coeficiente de pérdida local de un accesorio (una te: 1,8)»;
    - $\Delta p_{C_v}$ «caída de un conector con su coeficiente de flujo: $\Delta p = \mathrm{SG}\,(Q/C_v)^2$, en psi
      con $Q$ en gal/min, donde SG es la densidad relativa al agua»;
    - $\Delta p_\text{placa}$ «caída de la placa fría, $R\,Q^n$ con los 1,2 bar de GF; con los dos conectores suma 1,50
      de los 1,80 bar»;
    - $\mu$ «viscosidad del PG25 a 40 °C, 1,394 mPa·s (tabla 13.1)».
27. `:272` Por qué, fenómeno — nuevo: «La viscosidad y los remolinos convierten energía mecánica en interna: esa presión
    no vuelve, y la bomba la repone.»
28. `:278` Por qué, ecuación — nuevo: «La tubería principal va a $\mathrm{Re}$ = 162 000, turbulenta; el último tramo del
    manifold, a unos 2 100, laminar. Cada UQD04 pierde 15,1 kPa, 5,3 veces su caída reversible, y la placa, 120 kPa:
    1,80 bar en total, 9,2 % menos que los 1,98 bar de GF (tabla 13.4).»
29. `:287` pie de la figura 13.3 — nuevo: «Dónde se va la presión hasta el servidor más lejano: mi cálculo por grupo de
    pérdidas, en barras, frente a lo que publica GF, en puntos, con los grupos de la tabla 13.4.»
30. `:289` fuente de la figura 13.3 — nuevo: «Calculé las pérdidas con las ecuaciones (13.1) a (13.3) y los parámetros de
    las tablas 13.1 a 13.3; valores publicados: GF Piping Systems (2026), fig. 2, configuración de polímero».
31. `:302` título del paso 4 — nuevo: «Servidores en paralelo: ¿le llega a todos?».
32. `:304` — nuevo: «Cada servidor es una rama entre los dos manifolds. Con retorno directo, entrada y salida quedan
    abajo y el servidor de abajo tiene el camino más corto; con retorno invertido, la salida está arriba y los caminos
    se igualan.»
33. `:311-321` símbolos de la (13.4) — nuevo:
    - $\Delta p_i$ «caída en la rama del servidor $i$, de un manifold al otro»;
    - $R_i$ «resistencia de la rama, $R_i = \Delta p_\text{diseño}/Q_\text{diseño}^{\,n}$: la suma de sus pérdidas al
      caudal de diseño, dividida entre ese caudal elevado a $n$»;
    - $n$ «exponente: 1,85 con placa fría (Modelica Buildings), 2 sin ella»;
    - $N$ «servidores del rack, 24».
34. `:329` Por qué, fenómeno — nuevo: «Si el manifold pierde presión, la rama más cercana recibe más; una rama muy
    resistente, como la placa fría, iguala el reparto.»
35. `:335` Por qué, ecuación — nuevo: «Con placas, el caudal varía un 0,27 % entre servidores; sin ellas, un 1,0 %. Si el
    peor servidor no llega a su mínimo, hay que subir el caudal total, y con $\Delta p \propto Q^{1{,}9}$ la potencia
    $P = \Delta p\,Q$ crece como $Q^{2{,}9}$.»
36. `:344` pie de la figura 13.4 — nuevo: «Caudal por servidor del rack de 24 con retorno directo (continua) e invertido
    (discontinua), con placas frías y sin ellas, solo mangueras y conectores. Debajo, el banco de NVIDIA y UT
    Arlington: 6 puertos sin placas a 49,5 L/min, su modelo de red (línea) y su medición (puntos).»
37. `:346` fuente de la figura 13.4 — nuevo: «Calculé los repartos con la ecuación (13.4) sobre el manifold MGX (tablas
    13.2 y 13.3); modelo de red y medición: Shahi et al. (2023), fig. 5 y fig. 4, esta en lectura aproximada».
38. `:359` caso de uso, el caso — nuevo: «Google publicó en OCP su CDU Project Deschutes: 500 GPM a 80–90 psi, con la
    bomba a $\Delta p$ fijo [12]. La Modelica Buildings Library v14.0.0 de LBNL modela este sistema en
    `Buildings.Fluid.DataCenters` [10].»
39. `:365` caso de uso, la ecuación — nuevo: «Cada pieza sigue $\Delta p \propto \dot m^{\,n}$, como la (13.4), con
    $n$ = 1,85 en la placa; la tubería, Darcy–Weisbach; y la bomba da la suma de las caídas en serie
    (`dpPumpExt_nominal`).»
40. `:371` caso de uso, justificación — nuevo: «La alternativa no física es la regla fija: 1,5 L/min por kW da el caudal,
    pero no la presión de la bomba ni el reparto. NVIDIA y UT Arlington validaron un modelo de red así, midiendo el
    caudal de cada puerto [13]: con el $C_v$ de catálogo, fallaba. EPANET resuelve lo mismo en acueductos.»
41. `:377` caso de uso, balance — nuevo: «Se gana dar al servidor más lejano su caudal mínimo sin sobredimensionar la
    bomba: subir el caudal un 51 % triplicaría el bombeo (paso 4). Cuesta conocer el fluido, cuya viscosidad se divide
    entre 2,3 de 20 a 50 °C, estimar pérdidas locales y medir conectores.»
42. `:383` título del recuadro de clase — nuevo: «Módulo 6 · Temas 1.2 a 1.4, con una extensión».
43. `:385` recuadro de clase — nuevo: «La (13.1) y la (13.2) son las del Tema 1.2, con la altura $z$; la (13.3), la
    ecuación generalizada del Tema 1.3, y $\mathrm{Re}$ usa los límites del Tema 1.4. La clase nombra Darcy–Weisbach,
    Moody y los accesorios; el $f$, los $K$ y el $C_v$ con que los calculo son extensión.»
44. `:391` conexiones — nuevo: «Bernoulli es el teorema trabajo–energía del Tema 6 por unidad de volumen:
    $P = \Delta p\,Q$ es la gemela de $P = F v$, y la pérdida de carga acaba en calor, como en el freno de fricción. A
    diferencia de la fricción seca del Tema 4, la viscosa depende de la rapidez.»

### Figura 13.1: `src/components/topics/enfriamiento-liquido/VelocityAreaFigure.tsx` y `coolingCharts.ts`

45. `VelocityAreaFigure.tsx:44` título — nuevo: «Velocidad media frente al área de cada sección del circuito RD109».
46. `VelocityAreaFigure.tsx:45` eje x — nuevo: «Área de la sección $A$ (mm², escala logarítmica)». En el teléfono
    (`:47`): «Área $A$ (mm², escala log.)».
47. `VelocityAreaFigure.tsx:50` eje y — nuevo: «Velocidad media $v$ (m/s)».
48. `VelocityAreaFigure.tsx:52-54` leyenda — nuevo: «Hipérbola $v = Q/A$ de cada caudal»; «Sección del circuito
    (punto)»; «Manifold: su caudal baja de puerto en puerto».
49. `coolingCharts.ts:150-152` rótulos de las hipérbolas — nuevo: «$Q_\text{CDU}$ = `${…}` L/s» [23],
    «$Q_\text{rack}$ = `${…}` L/min» [172,5], «$q$ = `${…}` L/min» [7,19].
50. `VelocityAreaFigure.tsx:49` línea bajo el gráfico, solo cuando las hipérbolas no caben con su rótulo (teléfono) —
    nuevo: «Hipérbolas, de izquierda a derecha: $q$ = 7,19 L/min; $Q_\text{rack}$ = 172,5 L/min; $Q_\text{CDU}$ =
    23 L/s.»
51. `coolingCharts.ts:118-131` clave numerada de las secciones (lista «Secciones del circuito», `VelocityAreaFigure.tsx:253`)
    — nuevo:
    - «Tubería principal», «Manguera de rack»;
    - «Manifold, primer tramo: lleva el caudal de los `${N}` servidores» [24];
    - «Manifold, último tramo: lleva el de un servidor»;
    - «Manguera 3/8″ del servidor», «Boca del UQD04»;
    - cada una con «$A$ = … mm², $v$ = … m/s».
52. `VelocityAreaFigure.tsx:146` nombre hablado del dibujo — nuevo: «Velocidad media frente al área de la sección, con
    el eje de áreas logarítmico. Tres hipérbolas v = Q/A: … Secciones: 1, Tubería principal: A = …; …».

### Figura 13.2 (recurso prescrito): `CircuitProfileFigure.tsx`, `SectionStrip.tsx`, `stripLayout.ts`, `coolingPlots.ts`

53. `CircuitProfileFigure.tsx:50` título — nuevo: «Velocidad y presión a lo largo del recorrido, del CDU al servidor 24
    y de vuelta».
54. `CircuitProfileFigure.tsx:51` nota al pie — nuevo: «En la franja, el largo de cada tramo está a escala, y su alto es
    proporcional a su diámetro interior con la escala de cada vista; la placa fría va sin escala.»
55. `CircuitProfileFigure.tsx:53-55` ejes — nuevo: «Posición en el recorrido $x$ (m)», «Velocidad media $v$ (m/s)»,
    «Presión absoluta $p$ (kPa)».
56. `CircuitProfileFigure.tsx:60-68` leyenda — nuevo: «Impulsión, del CDU a la placa fría: $v$ y $p$ real»; «Retorno,
    de la placa fría al CDU: $v$ y $p$ real»; «$p$ ideal de Bernoulli, sin pérdidas».
57. `CircuitProfileFigure.tsx:149` y `coolingPlots.ts:141-143` botones de vista — nuevo: grupo «Vista del recorrido»,
    con «Todo el circuito», «Rack» y «Servidor».
58. `SectionStrip.tsx:40` título de la franja — nuevo: «Tramos: alto proporcional a su diámetro $D$».
59. `stripLayout.ts:54-72` nombres de los tramos — nuevo:
    - tramos: «Tubería principal», «Manguera de rack», «Manifold», «Manguera 3/8″», «UQD04», «Placa fría»;
    - grupos: «Rack», «Servidor»;
    - segunda línea: «$D$ = … mm» (el manifold, «$D_h$ = … mm»; la placa, «sin escala»).
60. `SectionStrip.tsx:148` clave de la franja en el teléfono — nuevo: lista «Tramos de la franja»: «1 Manguera de rack,
    $D$ = 50,8 mm», y así con cada tramo.
61. `coolingPlots.ts:194` lectura de la vista «Todo el circuito» — nuevo: «Del CDU al servidor 24 y de vuelta, la
    presión baja de 400,0 a 220,1 kPa: 179,9 kPa, o 1,80 bar. El 89 % se pierde dentro del servidor. Sin pérdidas,
    Bernoulli volvería a 400,0 kPa.»
62. `coolingPlots.ts:201` lectura de la vista «Rack» — nuevo: «Al subir 1,07 m por el manifold de impulsión, la presión
    baja $\rho g \Delta y$ = 10,6 kPa, que recupera al bajar por el de retorno. En el manifold, la velocidad baja de
    1,84 a 0,08 m/s: cada puerto se lleva el caudal de un servidor.»
63. `coolingPlots.ts:205` lectura de la vista «Servidor» — nuevo: «En la boca del UQD04 el líquido va a 2,91 m/s:
    Bernoulli baja la presión 2,8 kPa y la devuelve en la manguera, pero cada conector pierde 15,1 kPa. La placa fría
    pierde 120,0 kPa, el valor de diseño de GF. Dentro de la placa dibujo la velocidad de la manguera: su interior no es
    público.»
64. `CircuitProfileFigure.tsx:122` nombre hablado del dibujo — nuevo: «Velocidad y presión del refrigerante a lo largo
    de 79,4 m de recorrido; vista: … La presión real sale del CDU a 400,0 kPa y vuelve a 220,1 kPa, 1,80 bar menos; la
    de Bernoulli sin pérdidas vuelve a 400,0 kPa.», seguido de la lectura de la vista.

### Figura 13.3: `src/components/topics/enfriamiento-liquido/LossBreakdownFigure.tsx` (ronda 1)

65. `:41` título — nuevo: «Pérdidas hasta el servidor más lejano, por grupo».
66. `:42` eje x — nuevo: «Pérdida de presión (kPa)».
67. `:45-46` leyenda — nuevo: «Este cálculo (barras)»; «GF, publicado con Sinetz (puntos)».
68. `:43` en la fila de un grupo que no modelo — nuevo: «sin modelar». Los nombres de las filas son los de la tabla 13.4
    (punto 87).
69. `:160` nota bajo el gráfico — nuevo: «Las placas frías y los conectores UQD04 se llevan el 84 % de mi pérdida y el
    86 % de la de GF.»
70. `:155` nombre hablado del dibujo — nuevo: «Pérdidas hasta el servidor más lejano, por grupo. Placas frías y su
    tubería interna: este cálculo 120,0 kPa, GF 120,0 kPa; …», con «GF no la separa» cuando GF no tiene esa fila.

### Figura 13.4: `BranchFlowFigure.tsx` y `coolingCharts.ts`

71. `BranchFlowFigure.tsx:35` título — nuevo: «Caudal que recibe cada servidor del rack».
72. `BranchFlowFigure.tsx:36-37` ejes — nuevo: «Puerto $i$ (1 = abajo)», «Caudal $Q_i$ (L/min)».
73. `BranchFlowFigure.tsx:200` y `:208` encabezados de los paneles — nuevo: «Mi modelo: rack RD109 de 24 servidores a
    172,5 L/min»; «Banco de NVIDIA y UT Arlington: 6 puertos sin placas frías a 49,5 L/min».
74. `coolingCharts.ts:215` leyenda del modelo — nuevo: «Con placa fría, retorno directo», «Con placa fría, retorno
    invertido», «Sin placa fría, retorno directo», «Sin placa fría, retorno invertido».
75. `BranchFlowFigure.tsx:61-64` leyenda del banco — nuevo: «Modelo de red de Shahi et al.: línea»; «Medición de Shahi
    et al.: puntos, lectura aproximada».
76. `BranchFlowFigure.tsx:190-193` nombres hablados de los paneles — nuevo:
    - «Caudal por puerto del rack de 24 servidores a 172,5 L/min: con placa fría, retorno directo, de … a …; …»;
    - «Banco de 6 puertos sin placas frías a 49,5 L/min: el modelo de red de Shahi et al. baja de 8,97 L/min en el
      puerto 1 a 7,91 L/min en el 6; la medición varía sin orden entre 8,00 L/min y 8,54 L/min.»

### Tablas 13.1 a 13.4: `src/lib/tables/topics/enfriamiento-liquido.ts`

77. `:38-42` palabras de la columna «Origen» — nuevo: «Producto», «Supuesto», «Cálculo propio» y, para $g$,
    «Constante».
78. `:56-62` columnas de las tablas 13.1 a 13.3 — nuevo: «Parámetro», «Símbolo», «Valor», «Unidad», «Origen»,
    «Fuente».
79. `:96` pie de la tabla 13.1 — nuevo: «Fluido y caudales del circuito de referencia, el RD109 de Schneider Electric
    analizado por GF. Origen: «Producto» es un valor publicado del producto o de su especificación; «Supuesto», una
    hipótesis de mi modelo; «Cálculo propio», lo que calculé con esos valores. Los 172,5 L/min por rack equivalen a la
    regla de OCP con 115 kW (cálculo propio). Uso las propiedades a 40 °C en todo el lazo, aunque el retorno vuelve
    más caliente. Con 0 % de glicol, el polinomio de Melinder da el agua del NIST a 40 °C con una diferencia de 0,02 %
    en la densidad y de 0,37 % en la viscosidad (cálculo propio).»
80. `:99` fuente de la tabla 13.1 — nuevo: «Polinomios de Melinder (2010) en la Modelica Buildings Library v14.0.0 de
    LBNL; agua: NIST Chemistry WebBook; caudales: GF Piping Systems (2026) y Schneider Electric (RD109); regla de
    caudal: OCP OAI (2023); cada fila con su fuente».
81. `:106` pie de la tabla 13.2 — nuevo: «Geometría de cada tramo del recorrido, de la salida del CDU al servidor y de
    vuelta (origen, como en la tabla 13.1). Las longitudes son supuestos míos: GF da la tubería principal de ida y
    vuelta, y nadie publica las de las mangueras.»
82. `:109` fuente de la tabla 13.2 — nuevo: «GF Piping Systems (2026), tabla 1; NVIDIA, MGX Rev. 1.0 (OCP, 2024),
    fig. 7-13 a 7-15; rugosidad y $K$ de las tablas del manual de EPANET 2.2; cada fila con su fuente».
83. `:116` pie de la tabla 13.3 — nuevo: «El conector UQD04 de cada bandeja y la placa fría (origen, como en la tabla
    13.1). El $C_v$ se define con el caudal en gal/min y la caída en psi. Con 24 servidores por rack, cada UQD04 lleva
    7,19 L/min, más que sus 6,44 L/min nominales. NVIDIA no publica el caudal por bandeja, y la caída de la placa es el
    valor de diseño que GF da para todas las placas y su tubería interna, no la curva medida de un modelo con nombre.»
84. `:119` fuente de la tabla 13.3 — nuevo: «OCP, Universal Quick Disconnect Design Specification v2.0.0 (2026), tablas
    1, 2 y 6; Amphenol, catálogo UQD/UQDB (2025); GF Piping Systems (2026), tabla 1; exponente $n$ por omisión de la
    Modelica Buildings Library v14.0.0; cada fila con su fuente».
85. `:161` pie de la tabla 13.4 — nuevo: «Pérdidas hasta el servidor más lejano (el 24, arriba, con retorno directo),
    agrupadas como en la fig. 2 de GF, frente a lo que GF publica para el mismo circuito con su programa Sinetz. Un
    componente con $C_v$ o con curva medida lleva toda su pérdida en esa ley. Bombear los 23 L/s contra esa pérdida
    pide $P = \Delta p\,Q$ = 4,1 kW (cálculo propio).»
86. `:163-166` columnas de la tabla 13.4 — nuevo: «Grupo de pérdidas», «Este cálculo (bar)», «GF, Sinetz (bar)»,
    «Cómo lo calculo».
87. `src/lib/data/liquidCoolingBreakdown.ts:25-33` filas de la tabla 13.4 y de la figura 13.3 — nuevo: «Placas frías y
    su tubería interna», «Conectores UQD04, ida y vuelta», «Mangueras de 3/8″ del servidor», «Mangueras de rack de
    2″», «Conector grande», «Accesorios (tes)», «Manifolds», «Tuberías principales», «Válvulas mariposa»; y `:176`
    «Total hasta el servidor más lejano».
88. `:143-179` columna «Cómo lo calculo» — nuevo: «Curva de la placa: 1,2 bar de GF a su caudal de diseño»; «Dos
    conectores con $C_v$ = 1,29 de Amphenol»; «Darcy–Weisbach, 0,5 m por sentido»; «Darcy–Weisbach, 3 m por sentido;
    GF no tiene esta fila»; «No lo modelo»; «Cuatro tes con $K$ = 1,8 de EPANET»; «Darcy–Weisbach con el caudal de
    cada tramo»; «Darcy–Weisbach, 35 m por sentido»; «No las modelo»; «Suma: 9,2 % por debajo de GF».
89. `:183` fuente de la tabla 13.4 — nuevo: «Este cálculo: cálculo propio con las ecuaciones (13.1) a (13.3) y los
    parámetros de las tablas 13.1 a 13.3; GF: Freda y Kugele, GF Piping Systems (2026), fig. 2, configuración de
    polímero».

### Tablas 13.1 a 13.3, fila por fila: nombre (`src/lib/data/liquidCoolingParameters.ts`) y «Fuente» impresa

Cada «Fuente» es una cadena de los módulos de datos. La mayoría es de la Task 12 (`src/lib/data/liquidCooling.ts`,
abreviado `lc`, y `src/lib/data/liquidCoolingCircuit.ts`, abreviado `lcc`). Las que empiezan con un autor usan los
prefijos de `lc:45-55`, que se imprimen completos:

- `OCP_OAI` «OCP, OAI System Liquid Cooling Guidelines (2023)»;
- `OCP_UQD` «OCP, Universal Quick Disconnect Design Specification v2.0.0 (2026)»;
- `AMPHENOL` «Amphenol Industrial, catálogo UQD/UQDB (2025)»;
- `MGX` «NVIDIA, MGX Accelerated Computing Rack and Trays Specification Rev. 1.0 (OCP, 2024)»;
- `MBL` «LBNL, Modelica Buildings Library v14.0.0»;
- `EPANET` «US EPA, EPANET 2.2 User Manual»;
- `GF` «Freda y Kugele (GF Piping Systems), Hydraulic design principles for DLC (2026)»;
- `SCHNEIDER` «Schneider Electric, EcoStruxure Reference Design 109 (NVIDIA GB200), 2026».

Los nombres de las filas están entre `liquidCoolingParameters.ts:81` y `:344`; todos son nuevos.

90. «Densidad del PG25 a 40 °C» y «Viscosidad del PG25 a 40 °C» — `lc:68`: «Cálculo propio con los polinomios de
    Melinder (2010) en LBNL, Modelica Buildings Library v14.0.0».
91. «Temperatura de impulsión» — `lc:189`: «Schneider Electric, EcoStruxure Reference Design 109 (NVIDIA GB200),
    2026: «TCS loop supply temperature 104 °F»».
92. «Aceleración de la gravedad» — `liquidCoolingParameters.ts:111`: «Valor del curso (Módulo 6) y de Serway y Jewett»
    (origen «Constante»).
93. «Presión absoluta a la salida del CDU» — `lc:188`: «`GF`, fig. 1: entrada a 4,000 bar abs».
94. «Caudal del CDU» — `lc:185`: «`GF`: «approximately 23 L/s» por CDU».
95. «Racks por CDU» — `lc:186`: «`GF`: 8 racks de 132 kW por CDU».
96. «Servidores por rack» — `lc:187`: «`GF`, tabla 1: manifold «with 24 outlets»».
97. «Caudal por rack» — `lcc:234`: «Cálculo propio: los 23 L/s por CDU de GF entre sus 8 racks».
98. «Caudal medio por servidor» — `liquidCoolingParameters.ts:159`: «Cálculo propio: $q = Q_\text{rack}/N$».
99. «Caudal por potencia, regla de diseño» — `lc:83`: «`OCP_OAI`, §1.3, pág. 7».
100. «Tubería principal: diámetro interior» — `lc:193`: «Cálculo propio: PP-H d160 SDR11 de `GF`,
     $D = d - 2d/\mathrm{SDR}$».
101. «Tubería principal: longitud por sentido» — `lc:198`: «Supuesto: la mitad de los 70 m de ida y vuelta de `GF`».
102. «Manguera de rack: diámetro interior» — `lc:200`: «`GF`, tabla 1: manguera Parker de 2″ (nominal)».
103. «Manguera de rack: longitud por sentido» — `lc:201`: «Supuesto: 3 m de manguera de rack por sentido».
104. «Manifold: área interior» — `lc:123`: «Cálculo propio: 29 × 54 mm, con pared uniforme de 3 mm».
105. «Manifold: diámetro hidráulico» — `lc:127`: antes «Cálculo propio: $D_h = 4A/P$ de la sección interior» →
     después «Cálculo propio: $D_h = 4A/P_m$ de la sección interior, con $P_m$ su perímetro mojado» (ronda 1: $P$ es
     la potencia de la bomba en esta página).
106. «Manifold: paso entre puertos» — `lc:122`: «`MGX`, fig. 7-13: 44,45 mm entre puertos».
107. «Manifold: subida hasta el servidor 24» — `liquidCoolingParameters.ts:239`: «Cálculo propio: 24 puertos por el
     paso de 44,45 mm».
108. «Manguera del servidor: diámetro interior» — `lc:202`: «`GF`, tabla 1: «3/8" inner diameter = 9.5 mm»» (cita
     literal, con punto).
109. «Manguera del servidor: longitud por sentido» — `lc:206`: «Supuesto: 0,5 m de manguera de servidor por sentido».
110. «Rugosidad de tuberías y mangueras» — `lc:90`: «`EPANET`: rugosidad típica del plástico».
111. «Rugosidad del manifold de acero» — `lc:92`: «`EPANET`: rugosidad típica del acero».
112. «Te de derivación, a la entrada de cada manguera» — `lc:93`: «`EPANET`: «Standard tee - flow through branch
     1.8»» (cita literal).
113. «UQD04: coeficiente de flujo» — `lc:98`: «`AMPHENOL`: «UQD04:1.29»» (cita literal).
114. «UQD04: rango de la especificación» — `lc:99`: «`OCP_UQD`, tabla 6».
115. «UQD04: caudal nominal» — `lc:101`: «`OCP_UQD`, tabla 6: 6,44 L/min».
116. «UQD04: boca del tapón» — `lc:102`: «`OCP_UQD`, tabla 2: boca del tapón, ØL». **Para Dylan:** «ØL» es el rótulo
     del plano de OCP (la cota «diámetro L»), no una magnitud de la página; lo dejo tal cual.
117. «UQD04: longitud dibujada» — `lc:106`: «Supuesto: longitud dibujada del conector, la DD máx. de 60 mm de
     `OCP_UQD`, tabla 1».
118. «Placa fría: caída de diseño» — `lc:208`: «`GF`, tabla 1: 1,2 bar, valor de diseño».
119. «Placa fría: exponente de su ley» — `lc:209`: antes «`MBL`: n = 1,85 por omisión, ajustado a OCP» → después
     «`MBL`: $n$ = 1,85 por omisión, ajustado a OCP» (ronda 1: la $n$ suelta era una letra de magnitud fuera de
     fórmula).
120. «Placa fría: caudal al que pierde esa caída» — `lcc:241`: «Supuesto: la placa pierde los 1,2 bar de GF al caudal
     medio por servidor; GF no da el caudal de ese valor».
121. «Placa fría: longitud dibujada» — `lc:210`: «Supuesto: 0,15 m dibujados para la placa fría».
122. Fuentes de datos nuevas que no imprime ninguna tabla — `lc:77-78`: «NIST Chemistry WebBook (Lemmon et al.), agua
     en la isobara de 0,3 MPa: 992,30 kg/m³ a 40 °C» y «…: 0,65275 mPa·s a 40 °C». La comparación se lee en el pie de
     la tabla 13.1.

### Decisiones de redacción que conviene mirar

- Las líneas de fuente de las figuras van en primera persona («Calculé…»), como pide la regla de la Entrega Final.
- «Supuesto» es la palabra de la tabla para lo que el código llama `ilustrativo`. «Producto» abarca también la
  especificación (OCP) y los datos publicados del circuito (GF, Schneider). El pie de la tabla 13.1 lo define.
- La altura es $y$ (decisión de Dylan del 17 de noviembre); el recuadro de clase y la nota de clase dicen que la clase
  escribe $z$.
- «Re» va como $\mathrm{Re}$, en recta, como la clase lo escribe.
- Ronda 1: el caudal de cada servidor (7,19 L/min) sale solo de GF (23 L/s ÷ 8 ÷ 24). La regla de OCP queda como lo que
  pide la carga, y la tabla 13.1 dice a qué carga equivalen los 172,5 L/min (115 kW). La ganancia del caso de uso
  ahora es no sobredimensionar la bomba; los 4,1 kW pasan al pie de la tabla 13.4.
