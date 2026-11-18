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

### Página (`src/content/topics/animaciones-resorte.mdx`)

- `src/content/topics/animaciones-resorte.mdx:5`, título corto (nuevo): «Animaciones con resorte»
- `src/content/topics/animaciones-resorte.mdx:6`, concepto (nuevo): «Oscilador amortiguado: ley de Hooke, amortiguamiento viscoso, regímenes subamortiguado, crítico y sobreamortiguado, y por qué una interfaz anima con rigidez y amortiguamiento en vez de con una duración.»
- `src/content/topics/animaciones-resorte.mdx:9`, caso de uso, producto (nuevo): «Motion (antes Framer Motion) y las animaciones con resorte de Apple»
- `src/content/topics/animaciones-resorte.mdx:10`, caso de uso, industria (nuevo): «Interfaces de usuario y animación web»
- `src/content/topics/animaciones-resorte.mdx:81`, «Con lo visto en clase», tema (nuevo): «Tema 1 · Ecuaciones Diferenciales y Movimiento Oscilatorio · Ecuación Diferencial del Movimiento Armónico Simple (MAS)»
- `src/content/topics/animaciones-resorte.mdx:82`, «Con lo visto en clase», nota (nuevo): «$m\,d^2x/dt^2 = -kx$ con $\omega = \sqrt{k/m}$ y $T = 2\pi\sqrt{m/k}$: las (10.1) y (10.2).»
- `src/content/topics/animaciones-resorte.mdx:84`, «Con lo visto en clase», tema (nuevo): «Tema 3 · Oscilaciones Amortiguadas Simples · Tres regímenes»
- `src/content/topics/animaciones-resorte.mdx:85`, «Con lo visto en clase», nota (nuevo): «La (10.3), $b_c = 2\sqrt{km}$ y $dE/dt = -b v_x^2$; su $\omega^\prime$ es el de la (10.6).»
- `src/content/topics/animaciones-resorte.mdx:87`, «Con lo visto en clase», tema (nuevo): «Tema 02 · Fricción y resortes · Concepto 04 · Fuerza elástica y ley de Hooke»
- `src/content/topics/animaciones-resorte.mdx:88`, «Con lo visto en clase», nota (nuevo): «$a_x = -(k/m)\,x$: una aceleración que cambia con la deformación, la de la (10.1).»
- `src/content/topics/animaciones-resorte.mdx:90`, «Con lo visto en clase», tema (nuevo): «Tema 04 · Energía mecánica · Concepto 03 · Energía potencial elástica»
- `src/content/topics/animaciones-resorte.mdx:91`, «Con lo visto en clase», nota (nuevo): «$U_\text{el} = kx^2/2$: el segundo término de la $E$ de la (10.5).»
- `src/content/topics/animaciones-resorte.mdx:93`, «Con lo visto en clase», tema (nuevo): «Tema 04 · Energía mecánica · Concepto 05 · Trabajo no conservativo y balance de energía»
- `src/content/topics/animaciones-resorte.mdx:94`, «Con lo visto en clase», nota (nuevo): «$\Delta(K+U) = W_\text{otras}$: con la fuerza viscosa, la (10.5).»
- `src/content/topics/animaciones-resorte.mdx:110`, introducción (nuevo): «Lo que se desliza o se abre en iOS y en Motion no sigue una curva dibujada a mano: sigue un resorte amortiguado, calculado en cada cuadro.»
- `src/content/topics/animaciones-resorte.mdx:112`, Paso 1, título (nuevo): «Un resorte sin amortiguar»
- `src/content/topics/animaciones-resorte.mdx:114`, Paso 1 (nuevo): «Llamo $u$ al desplazamiento del elemento respecto de su destino; con solo Hooke, su aceleración cambia con $u$.»
- `src/content/topics/animaciones-resorte.mdx:141`, Paso 1, «En el fenómeno» (nuevo): «El elemento cruza el destino a su rapidez máxima y sigue de largo, porque nada le quita energía: «Springs with ˋdamping: 0ˋ will run forever» <Cite id="motion-docs-spring" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:147`, Paso 1, «En la ecuación» (nuevo): «Derivo dos veces la (10.2): <Equation inline latex="\ddot u = -\omega_0^2\,u" />, la (10.1). Con los valores por omisión de Motion, 100 N/m y 1 kg, <Equation inline latex="T_0" /> = 0,63 s.»
- `src/content/topics/animaciones-resorte.mdx:156`, Paso 1, pie de figura (nuevo): «Valor animado de 100 a 1 000 con $k$ = 100 N/m, $m$ = 1 kg y $b$ = 0. Es un coseno de periodo $T_0$ = 0,63 s: vuelve a 100 en cada periodo y nunca se queda en la banda de ±2 % del destino.»
- `src/content/topics/animaciones-resorte.mdx:158`, Paso 1, fuente de la figura (nuevo): «Gráfica que calculé con la (10.2); $k$ y $m$ por omisión de Motion v14.14.0 (spring.ts L22 y L24), con $b$ = 0»
- `src/content/topics/animaciones-resorte.mdx:166`, Paso 2, título (nuevo): «El amortiguamiento viscoso»
- `src/content/topics/animaciones-resorte.mdx:168`, Paso 2 (nuevo): «Le añado una fuerza opuesta a la velocidad, <Equation inline latex="-b\,\dot u" /> <Cite id="serway-jewett-2018" sources={frontmatter.sources} />. La razón $\zeta$ compara $b$ con el amortiguamiento crítico <Equation inline latex="b_c" />.»
- `src/content/topics/animaciones-resorte.mdx:173`, Paso 2, leyenda de ecuación (nuevo): «coeficiente de amortiguamiento viscoso»
- `src/content/topics/animaciones-resorte.mdx:198`, Paso 2, «En el fenómeno» (nuevo): «Cada vaivén es menor: la fuerza viscosa siempre frena, y el elemento acaba en una banda alrededor del destino.»
- `src/content/topics/animaciones-resorte.mdx:204`, Paso 2, «En la ecuación» (nuevo): «Con la (10.3), <Equation inline latex="\dot E = v\,(m\dot v + k u) = -b v^2" />. Si <Equation inline latex="\zeta < 1" />, <Equation inline latex="u = A_0 e^{-\zeta\omega_0 t}\cos(\omega' t + \phi)" /> con <Equation inline latex="\omega' = \omega_0\sqrt{1-\zeta^2}" />: un coseno por una exponencial, el «damped cosine» de Apple <Cite id="wwdc23-springs" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:213`, Paso 2, pie de figura (nuevo): «Los valores por omisión de Motion, $k$ = 100 N/m, $b$ = 10 N·s/m y $m$ = 1 kg ($\zeta$ = 0,5), de 100 a 1 000. La curva queda entre las envolventes $x_\text{obj} \pm A_0 e^{-\zeta\omega_0 t}$, con $A_0 = |u_0|/\sqrt{1-\zeta^2}$, y entra para siempre en la banda de ±2 % a los 0,81 s.»
- `src/content/topics/animaciones-resorte.mdx:215`, Paso 2, fuente de la figura (nuevo): «Gráfica que calculé con la (10.6); valores por omisión de Motion v14.14.0 (spring.ts L22-L24)»
- `src/content/topics/animaciones-resorte.mdx:223`, Paso 3, título (nuevo): «Tres regímenes y ninguna duración»
- `src/content/topics/animaciones-resorte.mdx:225`, Paso 3 (nuevo): «Con cualquier <Equation inline latex="u_0" /> y <Equation inline latex="v_0" />, la (10.3) tiene tres soluciones según $\zeta$: las tres ramas del generador de Motion <Cite id="motion-v14140" sources={frontmatter.sources} />. Con ellas reproduzco, valor por valor, sus tres pruebas (cálculo propio).»
- `src/content/topics/animaciones-resorte.mdx:235`, Paso 3, leyenda de ecuación (nuevo): «tasas de las dos exponenciales, una lenta y una rápida»
- `src/content/topics/animaciones-resorte.mdx:256`, Paso 3, leyenda de ecuación (nuevo): «tiempo de asentamiento: desde ahí, $|u| \le \varepsilon\,|u_0|$»
- `src/content/topics/animaciones-resorte.mdx:267`, Paso 3, «En el fenómeno» (nuevo): «Con <Equation inline latex="\zeta < 1" /> el elemento se pasa y oscila; con <Equation inline latex="\zeta = 1" /> llega sin pasarse en el menor tiempo; con <Equation inline latex="\zeta > 1" />, sin pasarse pero más tarde. Ninguno termina en un instante preciso.»
- `src/content/topics/animaciones-resorte.mdx:273`, Paso 3, «En la ecuación» (nuevo): «La (10.7) es la (10.6) en el primer <Equation inline latex="v = 0" />; la (10.8), cuándo la envolvente cae a $\varepsilon$. El asentamiento depende de $\zeta$, <Equation inline latex="\omega_0" />, $\varepsilon$ y del estado inicial: no hay una duración. Con una banda del 2 %, <Equation inline latex="\zeta = 0{,}8" /> entra antes que el crítico (cálculo propio).»
- `src/content/topics/animaciones-resorte.mdx:282`, Paso 3, pie de figura (nuevo): «Las tres pruebas del resorte de Motion, de 100 a 1 000 con $m$ = 1 kg: subamortiguada ($k$ = 300 N/m, $b$ = 10 N·s/m), crítica (100 y 20) y sobreamortiguada (300 y 100). Las curvas son la (10.6); los puntos, los valores que cada prueba espera cada 0,2 s, y coinciden al redondear.»
- `src/content/topics/animaciones-resorte.mdx:284`, Paso 3, fuente de la figura (nuevo): «Gráfica que calculé con la (10.6); valores esperados de la prueba spring.test.ts de Motion v14.14.0, L41-L121»
- `src/content/topics/animaciones-resorte.mdx:295`, Paso 4, título (nuevo): «Lo que hace una biblioteca real»
- `src/content/topics/animaciones-resorte.mdx:297`, Paso 4 (nuevo): «Si el destino cambia a mitad de camino, la biblioteca reinicia la (10.6) desde el estado actual; Motion pasa ˋvalue.getVelocity()ˋ a la animación nueva <Cite id="motion-v14140" sources={frontmatter.sources} />. Apple cambió $m$, $k$ y $b$, que «are not very intuitive» <Cite id="wwdc23-springs" sources={frontmatter.sources} />, por una duración $d$ y un rebote $\beta$ <Cite id="apple-spring" sources={frontmatter.sources} />. Un umbral de reposo corta la cola.»
- `src/content/topics/animaciones-resorte.mdx:315`, Paso 4, leyenda de ecuación (nuevo): «rebote: $\zeta = 1 - \beta$; 0 es crítico y 1, sin amortiguar»
- `src/content/topics/animaciones-resorte.mdx:327`, Paso 4, leyenda de ecuación (nuevo): «umbral de distancia; Motion usa 0,5 px, «selected empirically»»
- `src/content/topics/animaciones-resorte.mdx:337`, Paso 4, «En el fenómeno» (nuevo): «Interrumpido, el resorte sigue con su velocidad y vuelve sin sacudida; una curva con duración arranca otra vez desde el reposo, y su velocidad cae a cero de golpe.»
- `src/content/topics/animaciones-resorte.mdx:343`, Paso 4, «En la ecuación» (nuevo): «Con la (10.9), $x$ y $v$ son continuas en <Equation inline latex="t^*" />; solo salta la aceleración, una cantidad finita por la (10.3). La (10.10) da <Equation inline latex="\omega_0 = 2\pi/d" /> y <Equation inline latex="\zeta = 1 - \beta" />: con 0,5 s y 0,3, los 157,9 N/m y 17,6 N·s/m de Apple (tabla 10.2).»
- `src/content/topics/animaciones-resorte.mdx:352`, Paso 4, pie de figura (nuevo): «La transición por omisión de Motion para una traslación ($k$ = 500 N/m, $b$ = 25 N·s/m) frente a una curva ease-in-out que dura 0,26 s, lo que tarda el resorte en asentarse al 2 %. A $t^*$ = 0,10 s el destino vuelve a 100. Arriba, la posición; abajo, la velocidad: la del resorte sigue en unos 6 680 px/s y la de la curva cae de 5 330 px/s a 0.»
- `src/content/topics/animaciones-resorte.mdx:354`, Paso 4, fuente de la figura (nuevo): «Gráfica que calculé con las (10.6) y (10.9); $k$ y $b$ de Motion v14.14.0 (default-transitions.ts L4-L9); curva ease-in-out, cubic-bezier(0.42, 0, 0.58, 1), de CSS Easing Functions Level 1 (W3C)»
- `src/content/topics/animaciones-resorte.mdx:368`, caso de uso, «El caso concreto» (nuevo): «Motion (antes Framer Motion, licencia MIT) anima interfaces web <Cite id="motion-blog-2024" sources={frontmatter.sources} />. Su generador ˋspringˋ (tag v14.14.0, commit ˋf95ab94ˋ) escribe las tres ramas de la (10.6) <Cite id="motion-v14140" sources={frontmatter.sources} />. Apple explica el porqué en la WWDC23; desde iOS 17, los resortes animan SwiftUI por omisión <Cite id="wwdc23-springs" sources={frontmatter.sources} />. En Android, Material 3 pasó de duraciones con curvas de Bézier a tokens con $k$ y $\zeta$ <Cite id="androidx" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:374`, Paso 4, «En la ecuación» (nuevo): «ˋreturn s.target - c.env * (c.A * c.sin + s.delta * c.cos)ˋ (L392) es la (10.6) si ˋs.deltaˋ vale <Equation inline latex="-u_0" /> y ˋs.velocityˋ, <Equation inline latex="-v_0" />. ˋdamping / (2 * Math.sqrt(stiffness * mass))ˋ (L314) es la (10.4), y la escala hacia 0 usa ˋ2 * Math.sqrt(550)ˋ: el crítico exacto, para que la escala no se vuelva negativa.»
- `src/content/topics/animaciones-resorte.mdx:380`, caso de uso, «Por qué modelar la física» (nuevo): «Una curva con duración «is just a prespecified curve, so there's no way to represent an initial velocity» <Cite id="wwdc23-springs" sources={frontmatter.sources} />. El resorte acepta cualquier distancia y cualquier <Equation inline latex="v_0" />: un gesto o una animación interrumpida entregan su velocidad sin salto (figura 10.4). Con curvas haría falta una por caso.»
- `src/content/topics/animaciones-resorte.mdx:386`, caso de uso, «Qué se gana y qué cuesta» (nuevo): «Gano continuidad de velocidad con solo tres números, $m$, $k$ y $b$. Cuesta no tener duración («a bit unpredictable», dice Apple <Cite id="wwdc23-springs" sources={frontmatter.sources} />), umbrales empíricos, parámetros sin objeto real y trampas numéricas: la 14.7.0 corrigió sobreamortiguados que saltaban al destino <Cite id="motion-v14140" sources={frontmatter.sources} />. Los resortes por duración de Motion terminan a tiempo, pero ignoran la velocidad heredada <Cite id="motion-docs-transitions" sources={frontmatter.sources} />.»
- `src/content/topics/animaciones-resorte.mdx:392`, recuadro de clase, título (nuevo): «Módulo 5 · Temas 1 y 3; Módulo 2 · Temas 02 y 04, y SPAA 02»
- `src/content/topics/animaciones-resorte.mdx:394`, recuadro «Visto en clase» (nuevo): «El Módulo 5 escribe la (10.2), la (10.3), <Equation inline latex="b_c = 2\sqrt{km}" /> y la (10.5); su envolvente <Equation inline latex="e^{-(b/2m)t}" /> es la de la (10.6), porque <Equation inline latex="\zeta\omega_0 = b/2m" />. El Módulo 2 da Hooke («No corresponde usar MRUA») y la energía elástica <Equation inline latex="\tfrac12 k x^2" />. La regla B de su SPAA 02, «su velocidad se vuelve cero», es el error de la curva con duración. Las (10.7) a (10.11) son extensiones.»
- `src/content/topics/animaciones-resorte.mdx:400`, «Conexiones» (nuevo): «Con el Tema 5: el mismo oscilador devuelve el gatillo al reposo, crítico o a 0,3 del crítico, con $c$ en lugar de $b$. Con el Tema 7: ˋbounceˋ de react-spring invierte la velocidad en el destino y la escala, como una restitución <Cite id="react-spring-v1012" sources={frontmatter.sources} />. Con el Tema 12: el mismo oscilador, forzado a su frecuencia natural.»

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
- `src/lib/tables/topics/animaciones-resorte.ts:102`, celda «Llamada» (nuevo): «Apple, SwiftUI: Spring(duration: ${forward.duration}, bounce: ${forward.bounce})»
- `src/lib/tables/topics/animaciones-resorte.ts:103`, celda «Conversión» (nuevo): «$k = m\,(2\pi/d)^2$, $b = 4\pi m\,(1-\beta)/d$»
- `src/lib/tables/topics/animaciones-resorte.ts:112`, celda «Llamada» (nuevo): «Apple, SwiftUI: Spring(mass: ${inverse.params.m}, stiffness: ${inverse.params.k}, damping: ${inverse.params.b})»
- `src/lib/tables/topics/animaciones-resorte.ts:113`, celda «Conversión» (nuevo): «$d = 2\pi/\omega_0$, $\beta = 1 - \zeta$»
- `src/lib/tables/topics/animaciones-resorte.ts:114`, celda «Cálculo propio» (nuevo): «$d$ = ${comma(period, 2)} s, $\beta$ = ${comma(bounce, 1)}»
- `src/lib/tables/topics/animaciones-resorte.ts:128`, celda «Llamada» (nuevo): «Motion: spring() por omisión, visualDuration: ${visualDuration}, bounce: ${bounce}»
- `src/lib/tables/topics/animaciones-resorte.ts:129`, celda «Conversión» (nuevo): «$\omega_0 = 2\pi/(${factor}\,T_v)$, $\zeta = \text{máx}(1-\beta;\ ${texNumber(minDampingRatio, 2)})$, $b = 2\zeta\sqrt{k m}$»
- `src/lib/tables/topics/animaciones-resorte.ts:135`, celda «Llamada» (nuevo): «Motion: bounce: 0, al cumplirse visualDuration»
- `src/lib/tables/topics/animaciones-resorte.ts:136`, celda «Conversión» (nuevo): «la (10.6) crítica en $t = T_v$, con $\omega_0 T_v = 2\pi/${factor}$»
- `src/lib/tables/topics/animaciones-resorte.ts:137`, celda «Cálculo propio» (nuevo): «${comma(progress * PERCENT, 2)} % del recorrido»
- `src/lib/tables/topics/animaciones-resorte.ts:138`, celda «Lo que publica la fuente» (nuevo): ««bounce 0 is 96.68% of the way at visualDuration»»
- `src/lib/tables/topics/animaciones-resorte.ts:147`, leyenda de la tabla (nuevo): «Los parámetros perceptuales de Apple y de Motion, duración y rebote, convertidos a $k$ y $b$ con la (10.10) y $m$ = 1 kg: lo que calculo frente a lo que publica la fuente. En Motion, $T_v$ es visualDuration.»
- `src/lib/tables/topics/animaciones-resorte.ts:149`, encabezado de columna (nuevo): «Llamada»
- `src/lib/tables/topics/animaciones-resorte.ts:150`, encabezado de columna (nuevo): «Conversión»
- `src/lib/tables/topics/animaciones-resorte.ts:151`, encabezado de columna (nuevo): «Cálculo propio»
- `src/lib/tables/topics/animaciones-resorte.ts:152`, encabezado de columna (nuevo): «Lo que publica la fuente»
- `src/lib/tables/topics/animaciones-resorte.ts:153`, encabezado de columna (nuevo): «Fuente»
- `src/lib/tables/topics/animaciones-resorte.ts:157`, fuente de la tabla (nuevo): «Apple Developer Documentation (SwiftUI, Spring), ejemplos de su resumen; Motion v14.14.0 (tag v14.14.0, commit f95ab94), packages/motion-dom/src/animation/generators/spring.ts y su prueba. La conversión de Apple sale de su ejemplo: la diapositiva de la WWDC23 trae una errata en la fórmula de damping.»

### Fuentes mostradas en la tabla 10.2 (`src/lib/data/springReferences.ts`)

- `src/lib/data/springReferences.ts:65`, celda «Fuente» de la tabla 10.2 (nuevo): «Apple Developer Documentation, SwiftUI, Spring (https://developer.apple.com/documentation/swiftui/spring)»
- `src/lib/data/springReferences.ts:97`, celda «Fuente» de la tabla 10.2 (MOTION es «Motion v14.14.0 (commit f95ab94), packages/motion-dom/src/animation/generators») (nuevo): «${MOTION}/spring.ts L28-L29, L40, L42-L50 y L240-L248, y su prueba spring.test.ts L473-L475»
