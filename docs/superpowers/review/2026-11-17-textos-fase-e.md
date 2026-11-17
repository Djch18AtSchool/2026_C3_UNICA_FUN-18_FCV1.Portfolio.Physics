# Textos de la fase E para que Dylan los lea (17 de noviembre de 2026)

Rama `fase-e-laboratorio`, desde `5ff337e` (lo publicado). La fase E (E1, E3, E5 y E6) cambió el cascarón de los
laboratorios y la tipografía de los símbolos. Casi todo lo de abajo es **solo marcado**: la letra que nombra una
magnitud pasa a escribirse entre `$…$` (se dibuja en la cursiva de Plex, como en un libro) y ninguna palabra ni cifra
cambia. Las pocas frases que sí cambian de palabras están marcadas con **(palabras)** y van primero.

Cómo leer cada línea: `archivo`, «antes» → «después». En los MDX, la línea es el párrafo entero tal como está escrito
(con `$…$` y `<Equation>`); en el código, la línea de código que lleva el texto (los `${…}` son números que pone el
laboratorio). El acento grave de las plantillas de JavaScript se muestra como «ˋ» para no romper este documento.

## 1. Frases con palabras nuevas o cambiadas (palabras)

De E1 (rediseño del cascarón, 16 de noviembre; su informe: `.superpowers/sdd/2026-10-31-fases-b-c-d/task-E1-report.md`):

1. Tema 6, «Cómo se usa» (`RegenLab.tsx`, `VIEW_HINT`): «La vista se elige en los ajustes.» → «La vista se elige bajo
   los parámetros.» Después E5 la volvió a cambiar (punto 7).
2. Tema 4, pie del laboratorio (`llantas-f1.mdx`): «(C3 o C4, en los ajustes)» → «(C3 o C4, bajo los parámetros)».
3. Tema 7, «Cómo se usa» (`coeficiente-restitucion.mdx`): «en el engranaje, Velocidad 0,25× es cámara lenta» → «a
   0,25×, en la velocidad junto a «Reiniciar», va en cámara lenta». Después E5 la volvió a cambiar (punto 8).
4. Tema 6, nombres de las vistas: «Tramo: una frenada», «Ciclo completo», «Conducir: el tramo con tus pedales» →
   «Tramo», «Ciclo», «Conducir» (segmentos de una fila; «Cómo se usa» explica cada una).
5. Tema 5, amortiguación: ahora en segmentos con KaTeX, «Crítica, $c = 2\sqrt{k m}$» (antes el texto plano del
   `<option>`, «Crítica, c = 2 raíz(k m)»).
6. Textos de interfaz nuevos (no de tema): «Velocidad de reproducción» (nombre del selector «1×▾»), «de 1,00 a 30,00»
   (los límites de un parámetro, dichos por el lector de pantalla y como `title`) y, en el Tema 9, «de 1 a 100 R sub J,
   escala logarítmica».

De E5 (ronda de arreglos, 17 de noviembre):

7. Tema 6, «Cómo se usa» (`RegenLab.tsx`, `VIEW_HINT`): «“Evento anterior” y “Evento siguiente” saltan entre las
   detenciones.» → «En «Ciclo», con dos detenciones o más, «Evento anterior» y «Evento siguiente» saltan entre ellas; en
   «Tramo», la marca de la línea de tiempo señala la detención.»
8. Tema 7, «Cómo se usa» (`coeficiente-restitucion.mdx`): «A 1× la reproducción va en tiempo real; a 0,25×, en la
   velocidad junto a «Reiniciar», va en cámara lenta.» → «A 1× la reproducción va en tiempo real; con el selector de
   velocidad en 0,25×, en cámara lenta.»

E3 y E6 no cambiaron ninguna palabra.

## 2. E3 · la regla tipográfica (solo marcado)

Reconstruido del diff de cada commit de E3 (`git diff <commit>^ <commit>`), solo las líneas con texto que el lector ve
o que el lector de pantalla dice; las líneas son las del árbol de ese commit (E5 y E6 movieron algunas después). El
informe de E3 solo los resumía por commit. Quedan fuera los cambios de código sin texto (clases, familias de letra).
Lo que aquí aparece como «vec v», «V_p», «v_∞» era la mininotación de las figuras SVG (letra recta); `$…$` la dibuja
en cursiva. Comprobado por la revisión final de la fase: en los MDX no cambió ninguna palabra.

#### `0221252` feat(type): one family for text, values and symbols (1)

**`src/components/topics/asistencia-gravitatoria/planetZoom.ts`**

- l. 27: «{ label: ˋ$${unit}$ˋ, size: radiusKm },» → «{ label: unitTex(unit), size: radiusKm },»

#### `d3860e5` feat(type): every symbol written as a formula, in labels, figures and prose (206)

**`src/components/topics/asistencia-gravitatoria/FlybyFigure.tsx`**

- l. 181: «xLabel="r"» → «xLabel="$r$"»
- l. 183: «yLabel="|v|"» → «yLabel="$|v|$"»
- l. 194: «label: ˋSolo el Sol antes de Júpiter, ε = ${energy(figure.boundEnergy)}ˋ,» → «label: ˋSolo el Sol antes de Júpiter, $\\varepsilon$ = ${energy(figure.boundEnergy)}ˋ,»
- l. 201: «label: ˋDespués de Júpiter, ε = ${energy(figure.afterEnergy)}ˋ,» → «label: ˋDespués de Júpiter, $\\varepsilon$ = ${energy(figure.afterEnergy)}ˋ,»
- l. 207: «label: 'Escape, $\\sqrt{2GM_\\odot/r}$: ε = 0',» → «label: 'Escape, $\\sqrt{2GM_\\odot/r}$: $\\varepsilon = 0$',»
- l. 233: «const VINF_TAG = 'vec v_∞';» → «const VINF_TAG = '$\\vec v_\\infty$';»
- l. 266: «const deltaText = ˋδ = ${degrees(figure.deltaDeg)}ˋ;» → «const deltaText = ˋ$\\delta$ = ${degrees(figure.deltaDeg)}ˋ;»
- l. 314: «{ˋr_p = ${formatNumber(figure.rpRadii, { precision: 2 })} R_Jˋ}» → «{ˋ$r_p$ = ${formatNumber(figure.rpRadii, { precision: 2 })}\u202f$R_\\mathrm{J}$ˋ}»
- l. 355: «xLabel="x"» → «xLabel="$x$"»
- l. 356: «xUnit="R_J"» → «xUnit="$R_\mathrm{J}$"»
- l. 357: «yLabel="y"» → «yLabel="$y$"»
- l. 358: «yUnit="R_J"» → «yUnit="$R_\mathrm{J}$"»
- l. 362: «label: ˋTrayectoria de la V2: hipérbola con e = ${eText}ˋ,» → «label: ˋTrayectoria de la V2: hipérbola con $e$ = ${eText}ˋ,»
- l. 399: «: ˋ${base} Es un giro fuera del plano: el dibujo conserva los ángulos de vec v_∞ con vec V_p, no el giro δ = ${degrees(t.deltaDeg)}.ˋ;» → «: ˋ${base} Es un giro fuera del plano: el dibujo conserva los ángulos de vec v_∞ con vec V_p, no el giro $\\delta$ = ${degrees(t.deltaDeg)}.ˋ;»
- l. 473: «xLabel="v_x"» → «xLabel="$v_x$"»
- l. 475: «yLabel="v_y"» → «yLabel="$v_y$"»
- l. 504: «const speeds = ˋ|v| respecto al Sol: ${speedText(t.vIn)} antes y ${speedText(t.vOut)} después.ˋ;» → «const speeds = ˋ$|v|$ respecto al Sol: ${speedText(t.vIn)} antes y ${speedText(t.vOut)} después.ˋ;»
- l. 506: «return ˋ${speeds} Giro fuera del plano: el dibujo conserva los ángulos de $\\vec v_\\infty$ con $\\vec V_p$ (${degrees(t.thetaInDeg)} y ${degrees(t.thetaOutDeg)}), no el giro δ = ${degrees(t.deltaDeg)}.ˋ;» → «return ˋ${speeds} Giro fuera del plano: el dibujo conserva los ángulos de $\\vec v_\\infty$ con $\\vec V_p$ (${degrees(t.thetaInDeg)} y ${degrees(t.thetaOutDeg)}), no el giro $\\delta$ = ${degrees(t.deltaDeg)}.ˋ;»

**`src/components/topics/asistencia-gravitatoria/FlybyLab.tsx`**

- l. 169: «{ id: 'e', label: 'Excentricidad e', value: hyperbola.e, unit: '', precision: E_PRECISION },» → «{ id: 'e', label: 'Excentricidad $e$', value: hyperbola.e, unit: '', precision: E_PRECISION },»
- l. 172: «label: 'Ángulo de giro δ',» → «label: 'Ángulo de giro $\\delta$',»

**`src/components/topics/asistencia-gravitatoria/PlanetFrame.tsx`**

- l. 465: «const rpValue = ˋr_p = ${formatNumber(rp, { precision: 2, unit })}ˋ;» → «const rpValue = ˋ$r_p$ = ${formatNumber(rp, { precision: 2 })}\u202f${unitTex(unit)}ˋ;»

**`src/components/topics/asistencia-gravitatoria/SunFrame.tsx`**

- l. 41: «const VP_LABEL = 'vec V_p';» → «const VP_LABEL = '$\\vec V_p$';»
- l. 102: «text: 'vec v antes',» → «text: '$\\vec v$ antes',»
- l. 106: «text: 'vec v después',» → «text: '$\\vec v$ después',»
- l. 110: «text: 'δ',» → «text: '$\\delta$',»

**`src/components/topics/asistencia-gravitatoria/VoyagerDetailPlot.tsx`**

- l. 61: «label: 'Zona hiperbólica, por encima del escape (ε\u00a0>\u00a00)',» → «label: 'Zona hiperbólica, por encima del escape ($\\varepsilon > 0$)',»

**`src/components/topics/asistencia-gravitatoria/VoyagerMissionPlot.tsx`**

- l. 60: «label: 'Zona hiperbólica, por encima del escape (ε\u00a0>\u00a00)',» → «label: 'Zona hiperbólica, por encima del escape ($\\varepsilon > 0$)',»

**`src/components/topics/asistencia-gravitatoria/planetFrameLayout.ts`**

- l. 28: «export const VP_KEY = 'vec V_p';» → «export const VP_KEY = '$\\vec V_p$';»
- l. 37: «const WIDEST_RP_VALUE = 'r_p = 100,00 R_J';» → «const WIDEST_RP_VALUE = '$r_p$ = 100,00\u202f$R_\\mathrm{J}$';»
- l. 47: «const KNOB_LABEL_TEXT = 'r_p';» → «const KNOB_LABEL_TEXT = '$r_p$';»
- l. 48: «const LABEL_OUT = 'vec v_∞,out';» → «const LABEL_OUT = '$\\vec v_{\\infty,\\text{out}}$';»
- l. 49: «const LABEL_IN = 'vec v_∞,in';» → «const LABEL_IN = '$\\vec v_{\\infty,\\text{in}}$';»

**`src/components/topics/coeficiente-restitucion/BounceFigure.tsx`**

- l. 244: «xLabel="t"» → «xLabel="$t$"»
- l. 246: «yLabel="y"» → «yLabel="$y$"»

**`src/components/topics/coeficiente-restitucion/BouncePlots.tsx`**

- l. 111: «xLabel="t"» → «xLabel="$t$"»
- l. 113: «yLabel="y"» → «yLabel="$y$"»
- l. 123: «xLabel="t"» → «xLabel="$t$"»

**`src/components/topics/coeficiente-restitucion/CollisionMode.tsx`**

- l. 180: «{ label: s.isWall ? 'p_1 antes' : 'p antes', value: o.pBefore, unit: 'kg·m/s' },» → «{ label: s.isWall ? '$p_1$ antes' : '$p$ antes', value: o.pBefore, unit: 'kg·m/s' },»
- l. 181: «{ label: s.isWall ? 'p_1 después' : 'p después', value: o.pAfter, unit: 'kg·m/s' },» → «{ label: s.isWall ? '$p_1$ después' : '$p$ después', value: o.pAfter, unit: 'kg·m/s' },»
- l. 184: «{ label: 'K antes', value: o.kBefore, unit: 'J' },» → «{ label: '$K$ antes', value: o.kBefore, unit: 'J' },»
- l. 185: «{ label: 'K después', value: o.kAfter, unit: 'J', lostUpTo: o.kBefore },» → «{ label: '$K$ después', value: o.kAfter, unit: 'J', lostUpTo: o.kBefore },»

**`src/components/topics/coeficiente-restitucion/ThresholdPlot.tsx`**

- l. 404: «xTitle="n (número de rebote)"» → «xTitle="$n$ (número de rebote)"»
- l. 405: «yTitle="h_n (cm, escala logarítmica)"» → «yTitle="$h_n$ (cm, escala logarítmica)"»

**`src/components/topics/coeficiente-restitucion/bounceFigures.ts`**

- l. 95: «const shortLabel = ˋh_${n} = ${comma(h, 2)}ˋ;» → «const shortLabel = ˋ$h_{${n}}$ = ${comma(h, 2)}ˋ;»

**`src/components/topics/control-haptico/ThirdLawDiagram.tsx`**

- l. 149: «source="F dedo→gatillo"» → «source="$F$ dedo→gatillo"»
- l. 166: «source="F gatillo→dedo"» → «source="$F$ gatillo→dedo"»
- l. 177: «source="F gatillo→dedo = −F dedo→gatillo"» → «source="$F$ gatillo→dedo = $-F$ dedo→gatillo"»

**`src/components/topics/control-haptico/TriggerLab.tsx`**

- l. 212: «{ id: 'x', label: 'Desplazamiento x', value: state.xMm, unit: 'mm', precision: X_PRECISION },» → «{ id: 'x', label: 'Desplazamiento $x$', value: state.xMm, unit: 'mm', precision: X_PRECISION },»
- l. 213: «{ id: 'force', label: 'Fuerza del gatillo F', value: readings.force, unit: 'N' },» → «{ id: 'force', label: 'Fuerza del gatillo $F$', value: readings.force, unit: 'N' },»
- l. 216: «label: 'Energía elástica U, resorte ideal',» → «label: 'Energía elástica $U$, resorte ideal',»
- l. 220: «{ id: 'work', label: 'Trabajo del dedo W', value: readings.work, unit: 'mJ' },» → «{ id: 'work', label: 'Trabajo del dedo $W$', value: readings.work, unit: 'mJ' },»

**`src/components/topics/control-haptico/hapticPlots.ts`**

- l. 26: «xLabel: 'Desplazamiento x',» → «xLabel: 'Desplazamiento $x$',»
- l. 28: «yLabel: 'Fuerza F',» → «yLabel: 'Fuerza $F$',»

**`src/components/topics/dron-reparto/DroneFigure.tsx`**

- l. 113: «xLabel="x (este)"» → «xLabel="$x$ (este)"»
- l. 115: «yLabel="y (norte)"» → «yLabel="$y$ (norte)"»
- l. 151: «xLabel="t"» → «xLabel="$t$"»
- l. 153: «yLabel="v"» → «yLabel="$v$"»
- l. 158: «label: 'Saltos de v: a = dv/dt infinita',» → «label: 'Saltos de $v$: $a = dv/dt$ infinita',»
- l. 200: «xLabel="t"» → «xLabel="$t$"»
- l. 202: «yLabel="|v|"» → «yLabel="$|v|$"»

**`src/components/topics/dron-reparto/DroneLab.tsx`**

- l. 65: «{ id: 'x', label: 'Posición x', value: now.x, unit: 'm' },» → «{ id: 'x', label: 'Posición $x$', value: now.x, unit: 'm' },»
- l. 66: «{ id: 'y', label: 'Posición y', value: now.y, unit: 'm' },» → «{ id: 'y', label: 'Posición $y$', value: now.y, unit: 'm' },»

**`src/components/topics/dron-reparto/DroneProfiles.tsx`**

- l. 119: «title: 'Posición: x(t) y y(t)',» → «title: 'Posición: $x(t)$ y $y(t)$',»
- l. 128: «{ id: 'x', label: 'x', color: X_COMPONENT_COLOR, values: column(flight.samples, 'x') },» → «{ id: 'x', label: '$x$', color: X_COMPONENT_COLOR, values: column(flight.samples, 'x') },»
- l. 129: «{ id: 'y', label: 'y', color: Y_COMPONENT_COLOR, values: column(flight.samples, 'y') },» → «{ id: 'y', label: '$y$', color: Y_COMPONENT_COLOR, values: column(flight.samples, 'y') },»
- l. 137: «title: 'Velocidad: $v_x(t)$, $v_y(t)$ y |v|(t)',» → «title: 'Velocidad: $v_x(t)$, $v_y(t)$ y $|v|(t)$',»
- l. 148: «{ id: 'speed', label: '|v|', color: VELOCITY_COLOR, values: column(samples, 'speed') },» → «{ id: 'speed', label: '$|v|$', color: VELOCITY_COLOR, values: column(samples, 'speed') },»
- l. 156: «title: 'Aceleración: $a_x(t)$, $a_y(t)$ y |a|(t)',» → «title: 'Aceleración: $a_x(t)$, $a_y(t)$ y $|a|(t)$',»
- l. 167: «{ id: 'accel', label: '|a|', color: ACCEL_COLOR, values: column(samples, 'accel') },» → «{ id: 'accel', label: '$|a|$', color: ACCEL_COLOR, values: column(samples, 'accel') },»
- l. 177: «title: 'Distancia recorrida frente a |Δr| desde el depósito',» → «title: 'Distancia recorrida frente a $|\\Delta r|$ desde el depósito',»
- l. 192: «{ id: 'displacement', label: '|Δr|', color: DISPLACEMENT_COLOR, values: displacement },» → «{ id: 'displacement', label: '$|\\Delta r|$', color: DISPLACEMENT_COLOR, values: displacement },»

**`src/components/topics/dron-reparto/RouteOverlay.tsx`**

- l. 167: «<DroneVector tip={velocityTip} color={VELOCITY_COLOR} text="vec v" />» → «<DroneVector tip={velocityTip} color={VELOCITY_COLOR} text="$\vec v$" />»
- l. 168: «<DroneVector tip={accelTip} color={ACCEL_COLOR} text="vec a" />» → «<DroneVector tip={accelTip} color={ACCEL_COLOR} text="$\vec a$" />»

**`src/components/topics/dron-reparto/droneLabFormulas.ts`**

- l. 15: «(nada)» → «'y',»

**`src/components/topics/frenado-regenerativo/EnergyBalanceChart.tsx`**

- l. 105: «xLabel="Tiempo t"» → «xLabel="Tiempo $t$"»
- l. 107: «yLabel="Velocidad v"» → «yLabel="Velocidad $v$"»
- l. 110: «series={[{ id: 'velocidad', label: 'Velocidad v', points: speed, color: STATE_COLOR }]}» → «series={[{ id: 'velocidad', label: 'Velocidad $v$', points: speed, color: STATE_COLOR }]}»
- l. 119: «xLabel="Tiempo t"» → «xLabel="Tiempo $t$"»

**`src/components/topics/frenado-regenerativo/RegenFigure.tsx`**

- l. 75: «xLabel="Tiempo t"» → «xLabel="Tiempo $t$"»
- l. 77: «yLabel="Energía cinética K"» → «yLabel="Energía cinética $K$"»
- l. 88: «{ id: 'frenadas', label: 'Frenadas: K baja', points: figure.drops, color: STATE_COLOR },» → «{ id: 'frenadas', label: 'Frenadas: $K$ baja', points: figure.drops, color: STATE_COLOR },»
- l. 110: «label: ˋCv^2 = A a ${formatNumber(crossover, { precision: 1, unit: 'm/s' })}ˋ,» → «label: ˋ$Cv^2 = A$ a ${formatNumber(crossover, { precision: 1, unit: 'm/s' })}ˋ,»
- l. 118: «xLabel="Velocidad v"» → «xLabel="Velocidad $v$"»
- l. 120: «yLabel="Fuerza F_RL"» → «yLabel="Fuerza $F_\text{RL}$"»
- l. 201: «xLabel="Tiempo t"» → «xLabel="Tiempo $t$"»
- l. 203: «yLabel="Potencia P"» → «yLabel="Potencia $P$"»

**`src/components/topics/frenado-regenerativo/regenViews.ts`**

- l. 156: «{ id: 'v', label: 'Velocidad v', value: at.v * KMH_PER_MS, unit: 'km/h' },» → «{ id: 'v', label: 'Velocidad $v$', value: at.v * KMH_PER_MS, unit: 'km/h' },»
- l. 157: «{ id: 'p', label: 'Potencia en las ruedas P', value: at.pWheel / W_PER_KW, unit: 'kW' },» → «{ id: 'p', label: 'Potencia en las ruedas $P$', value: at.pWheel / W_PER_KW, unit: 'kW' },»

**`src/components/topics/gravedad-artificial/ApparentWeightDiagram.tsx`**

- l. 144: «label="m g"» → «label="$m g$"»
- l. 152: «label="n"» → «label="$n$"»
- l. 155: «<PanelText centre={earth} lines={['n = m g', 'el piso la sostiene']} />» → «<PanelText centre={earth} lines={['$n = m g$', 'el piso la sostiene']} />»
- l. 164: «label="m g"» → «label="$m g$"»
- l. 167: «<PanelText centre={orbit} lines={['n = 0', 'nave y persona', 'caen con a = g']} />» → «<PanelText centre={orbit} lines={['$n = 0$', 'nave y persona', 'caen con $a = g$']} />»

**`src/components/topics/gravedad-artificial/HabitatDiagram.astro`**

- l. 236: «source="r"» → «source="$r$"»
- l. 248: «source="ω"» → «source="$\omega$"»
- l. 255: «source="T = 2π/ω"» → «source="$T = 2\pi/\omega$"»
- l. 284: «<MathText» → «<MathText source="$a_c$" x={212} y={acArrow.y2 + 6} fontSize={LABEL_SIZE} className="hd-label" />»
- l. 286: «<MathText» → «<MathText source="$a_c = \omega^2 r$" x={300} y={306} fontSize={EQ_SIZE} className="hd-eq" />»
- l. 314: «source="v = ω r"» → «source="$v = \omega r$"»
- l. 323: «source="a_c = g"» → «source="$a_c = g$"»
- l. 379: «source="h"» → «source="$h$"»
- l. 399: «source="ω^2(r − h)"» → «source="$\omega^2 (r - h)$"»
- l. 408: «source="ω^2 r"» → «source="$\omega^2 r$"»
- l. 416: «source="Δa/a = h/r"» → «source="$\Delta a/a = h/r$"»
- l. 424: «source="r = 223,6 m → 0,8 %"» → «source="$r$ = 223,6 m → 0,8 %"»
- l. 432: «source="r = 10 m → 18 %"» → «source="$r$ = 10 m → 18 %"»

**`src/components/topics/gravedad-artificial/HabitatFigure.tsx`**

- l. 192: «xLabel="r"» → «xLabel="$r$"»
- l. 194: «yLabel="a_c"» → «yLabel="$a_c$"»
- l. 284: «xLabel="r"» → «xLabel="$r$"»
- l. 286: «yLabel="N"» → «yLabel="$N$"»

**`src/components/topics/gravedad-artificial/HabitatLab.tsx`**

- l. 90: «{ id: 'omega', label: 'Velocidad angular ω', value: solution.omega, unit: 'rad/s' },» → «{ id: 'omega', label: 'Velocidad angular $\\omega$', value: solution.omega, unit: 'rad/s' },»
- l. 91: «{ id: 'v', label: 'Velocidad tangencial v', value: solution.v, unit: 'm/s' },» → «{ id: 'v', label: 'Velocidad tangencial $v$', value: solution.v, unit: 'm/s' },»
- l. 93: «{ id: 'period', label: 'Período T', value: solution.period, unit: 's' },» → «{ id: 'period', label: 'Período $T$', value: solution.period, unit: 's' },»

**`src/components/topics/llantas-f1/TyreFigure.tsx`**

- l. 58: «label: ˋf_s,máx = ${oneDecimal(BOX.staticLimit)} Nˋ,» → «label: ˋ$f_{s,\\text{máx}}$ = ${oneDecimal(BOX.staticLimit)} Nˋ,»
- l. 65: «label: ˋf_k = ${oneDecimal(BOX.kinetic)} Nˋ,» → «label: ˋ$f_k$ = ${oneDecimal(BOX.kinetic)} Nˋ,»
- l. 84: «label: 'Fricción sobre la caja f',» → «label: 'Fricción sobre la caja $f$',»

**`src/components/topics/llantas-f1/tyrePlots.ts`**

- l. 41: «export const TEMPERATURE_AXIS = { label: 'Temperatura T', unit: '°C' } as const;» → «export const TEMPERATURE_AXIS = { label: 'Temperatura $T$', unit: '°C' } as const;»
- l. 42: «export const LOAD_AXIS = { label: 'Carga vertical F_z', unit: 'N' } as const;» → «export const LOAD_AXIS = { label: 'Carga vertical $F_z$', unit: 'N' } as const;»
- l. 56: «yLabel: 'Coeficiente μ',» → «yLabel: 'Coeficiente $\\mu$',»
- l. 109: «yLabel: 'Fuerza lateral máx. F_y',» → «yLabel: 'Fuerza lateral máx. $F_y$',»

**`src/components/topics/ruedas-reaccion/ExchangeDiagram.tsx`**

- l. 154: «<Equation x={TOP.x + 20} y={TOP.y - 46} source="ω_w" />» → «<Equation x={TOP.x + 20} y={TOP.y - 46} source="$\omega_w$" />»
- l. 163: «<Equation x={TOP.x - 82} y={TOP.y - 76} source="ω_s" />» → «<Equation x={TOP.x - 82} y={TOP.y - 76} source="$\omega_s$" />»
- l. 199: «<Equation x={AXIS_X + 12} y={ORIGIN_Y - L_LENGTH + 14} source="L_w = I_w ω_w" />» → «<Equation x={AXIS_X + 12} y={ORIGIN_Y - L_LENGTH + 14} source="$L_w = I_w \omega_w$" />»
- l. 200: «<Equation x={AXIS_X + 12} y={ORIGIN_Y + 5} source="L_s + L_w = 0" />» → «<Equation x={AXIS_X + 12} y={ORIGIN_Y + 5} source="$L_s + L_w = 0$" />»
- l. 201: «<Equation x={AXIS_X + 12} y={ORIGIN_Y + L_LENGTH - 6} source="L_s = I_s ω_s" />» → «<Equation x={AXIS_X + 12} y={ORIGIN_Y + L_LENGTH - 6} source="$L_s = I_s \omega_s$" />»
- l. 234: «<Equation x={TOP.x} y={BOTTOM_Y} anchor="middle" source="I_s ω_s + I_w ω_w = 0" />» → «<Equation x={TOP.x} y={BOTTOM_Y} anchor="middle" source="$I_s \omega_s + I_w \omega_w = 0$" />»
- l. 239: «source={ˋω_w ≈ ${wheelPerBody} ω_sˋ}» → «source={ˋ$\\omega_w \\approx ${wheelPerBody}\\ \\omega_s$ˋ}»

**`src/components/topics/ruedas-reaccion/WheelFigure.tsx`**

- l. 181: «xLabel="t"» → «xLabel="$t$"»
- l. 183: «yLabel="θ_s"» → «yLabel="$\theta_s$"»
- l. 212: «xLabel="t"» → «xLabel="$t$"»
- l. 214: «yLabel="ω_w"» → «yLabel="$\omega_w$"»
- l. 255: «xLabel="t"» → «xLabel="$t$"»
- l. 257: «yLabel="L_w"» → «yLabel="$L_w$"»

**`src/components/topics/ruedas-reaccion/WheelPanelA.astro`**

- l. 69: «lw: 'L_w = I_w ω_w',» → «lw: '$L_w = I_w \\omega_w$',»
- l. 70: «ls: 'L_s = I_s ω_s',» → «ls: '$L_s = I_s \\omega_s$',»
- l. 71: «sum: 'L_s + L_w = 0',» → «sum: '$L_s + L_w = 0$',»
- l. 72: «conservation: 'I_s ω_s + I_w ω_w = constante',» → «conservation: '$I_s \\omega_s + I_w \\omega_w = \\text{constante}$',»
- l. 73: «angles: 'I_s Δθ_s = −I_w Δθ_w',» → «angles: '$I_s \\Delta\\theta_s = -I_w \\Delta\\theta_w$',»
- l. 74: «wheelTorque: 'τ = dL_w/dt = I_w α_w',» → «wheelTorque: '$\\tau = dL_w/dt = I_w \\alpha_w$',»
- l. 75: «bodyTorque: '−τ = dL_s/dt = I_s α_s',» → «bodyTorque: '$-\\tau = dL_s/dt = I_s \\alpha_s$',»
- l. 76: «omegaW: 'ω_w',» → «omegaW: '$\\omega_w$',»
- l. 77: «omegaS: 'ω_s',» → «omegaS: '$\\omega_s$',»
- l. 78: «tau: 'τ',» → «tau: '$\\tau$',»
- l. 79: «minusTau: '−τ',» → «minusTau: '$-\\tau$',»
- l. 103: «<MathText source="z" x={AXIS_X - 10} y={AXIS.top + 12} anchor="end" {...LABEL_TEXT} />» → «<MathText source="$z$" x={AXIS_X - 10} y={AXIS.top + 12} anchor="end" {...LABEL_TEXT} />»
- l. 229: «<MathText source="τ sobre la rueda," x={236} y={640} {...LABEL_TEXT} />» → «<MathText source="$\tau$ sobre la rueda," x={236} y={640} {...LABEL_TEXT} />»
- l. 230: «<MathText source="−τ sobre la nave:" x={236} y={662} {...LABEL_TEXT} />» → «<MathText source="$-\tau$ sobre la nave:" x={236} y={662} {...LABEL_TEXT} />»

**`src/components/topics/ruedas-reaccion/WheelPanelB.astro`**

- l. 89: «limit: 'L_máx = I_w ω_máx',» → «limit: '$L_\\text{máx} = I_w \\omega_\\text{máx}$',»
- l. 90: «integral: 'L_w = ∫ τ_ext dt',» → «integral: '$L_w = \\int \\tau_\\text{ext}\\, dt$',»
- l. 93: «lw: 'L_w',» → «lw: '$L_w$',»
- l. 94: «tauExt: 'τ_ext',» → «tauExt: '$\\tau_\\text{ext}$',»
- l. 95: «drift: 'ω_s ≠ 0',» → «drift: '$\\omega_s \\ne 0$',»
- l. 96: «magnetic: 'τ = m × B',» → «magnetic: '$\\tau = m \\times B$',»
- l. 97: «thruster: 'τ = r × F',» → «thruster: '$\\tau = r \\times F$',»
- l. 98: «m: 'm',» → «m: '$m$',»
- l. 99: «B: 'B',» → «B: '$B$',»
- l. 100: «r: 'r',» → «r: '$r$',»
- l. 101: «F: 'F',» → «F: '$F$',»
- l. 288: «<MathText source="τ ⊥ B siempre: el momento de la rueda" x={16} y={604} {...LABEL_TEXT} />» → «<MathText»
- l. 289: «<MathText source="paralelo a B espera a que la órbita" x={16} y={626} {...LABEL_TEXT} />» → «source="$\tau \perp B$ siempre: el momento de la rueda"»
- l. 294: «(nada)» → «<MathText source="paralelo a $B$ espera a que la órbita" x={16} y={626} {...LABEL_TEXT} />»
- l. 295: «(nada)» → «<MathText source="gire $B$." x={16} y={648} {...LABEL_TEXT} />»

**`src/components/topics/ruedas-reaccion/WheelPlot.tsx`**

- l. 131: «xLabel="t"» → «xLabel="$t$"»
- l. 133: «yLabel="L_w / L_máx"» → «yLabel="$L_w / L_\text{máx}$"»

**`src/components/topics/ruedas-reaccion/WheelScene.tsx`**

- l. 293: «ˋθ objetivo = ${formatNumber(degrees, { precision: TARGET_PRECISION, unit: '°' })}ˋ;» → «ˋ$\\theta$ objetivo = ${formatNumber(degrees, { precision: TARGET_PRECISION, unit: '°' })}ˋ;»
- l. 368: «label="ω_s"» → «label="$\omega_s$"»
- l. 376: «label="ω_w"» → «label="$\omega_w$"»

**`src/components/topics/ruedas-reaccion/WheelSceneMarks.tsx`**

- l. 193: «const formula = actuator === 'magnetopar' ? 'τ = m × B' : 'τ = r × F';» → «const formula = actuator === 'magnetopar' ? '$\\tau = m \\times B$' : '$\\tau = r \\times F$';»
- l. 202: «label="τ_ext"» → «label="$\tau_\text{ext}$"»

**`src/components/topics/salto-personaje/JumpCanvas.tsx`**

- l. 33: «xLabel="x"» → «xLabel="$x$"»
- l. 35: «yLabel="y"» → «yLabel="$y$"»

**`src/components/topics/salto-personaje/JumpFigure.tsx`**

- l. 52: «const AXES = { xLabel: 't', xUnit: 's', yLabel: 'y', yUnit: 'm' } as const;» → «const AXES = { xLabel: '$t$', xUnit: 's', yLabel: '$y$', yUnit: 'm' } as const;»

**`src/components/topics/salto-personaje/jumpLabView.ts`**

- l. 28: «label: ˋReferencia terrestre, g = ${gravityText(G_EARTH)}ˋ,» → «label: ˋReferencia terrestre, $g$ = ${gravityText(G_EARTH)}ˋ,»

**`src/content/topics/asistencia-gravitatoria.mdx`**

- l. 125: «Lejos de los planetas solo actúa la atracción del Sol, una fuerza conservativa <Cite id="serway-jewett-2018" sources={frontmatter.sources} />: la energía por unidad de masa ε se conserva.» → «Lejos de los planetas solo actúa la atracción del Sol, una fuerza conservativa <Cite id="serway-jewett-2018" sources={frontmatter.sources} />: la energía por unidad de masa $\varepsilon$ se conserva.»
- l. 173: «En Júpiter ε salta de −121,7 a +25,9 km²/s² (figura 9.1): imposible con solo el campo conservativo del Sol. En el marco del planeta, casi inercial en el encuentro, la energía sí se conserva: la sonda describe una hipérbola y sale con la misma rapidez <Equation inline latex="v_\infty" />, girada un ángulo δ.» → «En Júpiter $\varepsilon$ salta de −121,7 a +25,9 km²/s² (figura 9.1): imposible con solo el campo conservativo del Sol. En el marco del planeta, casi inercial en el encuentro, la energía sí se conserva: la sonda describe una hipérbola y sale con la misma rapidez <Equation inline latex="v_\infty" />, girada un ángulo $\delta$.»
- l. 205: «caption="La Voyager 2 en el marco de Júpiter, a escala en radios de Júpiter. Las flechas $\vec v_\infty$ de entrada y de salida miden lo mismo; entre sus asíntotas, el giro δ = 97,5°. En la tabla 9.2, $v_\infty$ baja de 7,639 a 7,579 km/s: las cónicas que publica Horizons se construyeron para coincidir también con encuentros con lunas."» → «caption="La Voyager 2 en el marco de Júpiter, a escala en radios de Júpiter. Las flechas $\vec v_\infty$ de entrada y de salida miden lo mismo; entre sus asíntotas, el giro $\delta = 97{,}5^\circ$. En la tabla 9.2, $v_\infty$ baja de 7,639 a 7,579 km/s: las cónicas que publica Horizons se construyeron para coincidir también con encuentros con lunas."»
- l. 336: «El memorando define la esfera de influencia, <Equation inline latex="\rho^* = (m_p/M_\odot)^{2/5}\, c" /> (<Equation inline latex="m_p" /> y <Equation inline latex="M_\odot" />, masas del planeta y del Sol; c, la distancia planeta-Sol) <Cite id="minovitch-1961" sources={frontmatter.sources} />: dentro solo actúa el planeta, la (9.2); fuera, el Sol, la (9.1), y la (9.3) los empalma. Diseñar es elegir <Equation inline latex="r_p" /> para que δ apunte al planeta siguiente.» → «El memorando define la esfera de influencia, <Equation inline latex="\rho^* = (m_p/M_\odot)^{2/5}\, c" /> (<Equation inline latex="m_p" /> y <Equation inline latex="M_\odot" />, masas del planeta y del Sol; $c$, la distancia planeta-Sol) <Cite id="minovitch-1961" sources={frontmatter.sources} />: dentro solo actúa el planeta, la (9.2); fuera, el Sol, la (9.1), y la (9.3) los empalma. Diseñar es elegir <Equation inline latex="r_p" /> para que $\delta$ apunte al planeta siguiente.»
- l. 342: «Una animación guionizada o una regla «cada planeta suma tanto» no responden qué ocurre si la sonda pasa 1 000 km más cerca, ni explican que Neptuno restara 2,1 km/s; la (9.2) da δ para cualquier <Equation inline latex="r_p" /> y <Equation inline latex="v_\infty" />. La trayectoria de Horizons no es un guion: cónicas empalmadas hasta 1989 y ajuste de 2022 a datos de seguimiento <Cite id="horizons" sources={frontmatter.sources} />.» → «Una animación guionizada o una regla «cada planeta suma tanto» no responden qué ocurre si la sonda pasa 1 000 km más cerca, ni explican que Neptuno restara 2,1 km/s; la (9.2) da $\delta$ para cualquier <Equation inline latex="r_p" /> y <Equation inline latex="v_\infty" />. La trayectoria de Horizons no es un guion: cónicas empalmadas hasta 1989 y ajuste de 2022 a datos de seguimiento <Cite id="horizons" sources={frontmatter.sources} />.»

**`src/content/topics/control-haptico.mdx`**

- l. 370: «Con el Tema 4: como el μ constante, el resorte ideal idealiza un contacto, y el gatillo se aparta por histéresis y saturación. Con el Tema 3: allí sentimos como peso la normal del piso, no <Equation inline latex="m g" />; aquí, el contacto del gatillo. Con el Tema 7: veo un choque como un resorte breve; con <Equation inline latex="e < 1" />, no devuelve toda la energía.» → «Con el Tema 4: como el $\mu$ constante, el resorte ideal idealiza un contacto, y el gatillo se aparta por histéresis y saturación. Con el Tema 3: allí sentimos como peso la normal del piso, no <Equation inline latex="m g" />; aquí, el contacto del gatillo. Con el Tema 7: veo un choque como un resorte breve; con <Equation inline latex="e < 1" />, no devuelve toda la energía.»

**`src/content/topics/dron-reparto.mdx`**

- l. 113: «caption="Ruta declarada, en metros: del depósito (0; 0) a las paradas A, B y C, con una entrega de 20 s en cada una, y de vuelta. El vector de posición de B, con componentes x = 900 m e y = 800 m, y la velocidad sobre el primer tramo (rumbo θ = 18,4°), dibujada a escala 1 m/s = 15 m; la tabla 1.1 da cada tramo."» → «caption="Ruta declarada, en metros: del depósito (0; 0) a las paradas A, B y C, con una entrega de 20 s en cada una, y de vuelta. El vector de posición de B, con componentes $x = 900$ m e $y = 800$ m, y la velocidad sobre el primer tramo (rumbo $\theta = 18{,}4^\circ$), dibujada a escala 1 m/s = 15 m; la tabla 1.1 da cada tramo."»
- l. 211: «Cada tramo va del vértice <Equation inline latex="\vec r_i" /> al siguiente con el perfil del paso 3, proyectado con el rumbo θ. La ruta completa dura <Equation inline latex="387{,}4\ \mathrm{s}" />.» → «Cada tramo va del vértice <Equation inline latex="\vec r_i" /> al siguiente con el perfil del paso 3, proyectado con el rumbo $\theta$. La ruta completa dura <Equation inline latex="387{,}4\ \mathrm{s}" />.»
- l. 219: «meaning: 'vector unitario del tramo, (cos θ; sin θ) = Δr/|Δr|',» → «meaning:»
- l. 220: «(nada)» → «'vector unitario del tramo, $(\\cos\\theta; \\sin\\theta) = \\Delta\\vec r/|\\Delta\\vec r|$',»
- l. 292: «La (1.2) es la definición del Tema 1.1: <Equation inline latex="\vec v = d\vec r/dt" />, tangente a la trayectoria, y <Equation inline latex="\vec a = d\vec v/dt = d^2\vec r/dt^2" />. El mapa muestra el criterio de signos de clase: al arrancar, v y a comparten sentido y la rapidez crece; al frenar se oponen. La cuarta gráfica separa la distancia recorrida, escalar de <Equation inline latex="3\,114{,}3\ \mathrm{m}" />, del desplazamiento, vector nulo al cerrar la ruta. Las (1.1) y (1.4) son la descomposición en componentes rectangulares del Tema 1.3, <Equation inline latex="\vec A = A_x\hat\imath + A_y\hat\jmath" /> con <Equation inline latex="\lVert\vec A\rVert = \sqrt{A_x^2 + A_y^2}" />; cos θ y <Equation inline latex="\sin\theta = \cos(90^\circ - \theta)" />, los cosenos directores. Lo nuevo: aceleración constante a trozos, cada trozo un MRU o un MRUA.» → «La (1.2) es la definición del Tema 1.1: <Equation inline latex="\vec v = d\vec r/dt" />, tangente a la trayectoria, y <Equation inline latex="\vec a = d\vec v/dt = d^2\vec r/dt^2" />. El mapa muestra el criterio de signos de clase: al arrancar, v y a comparten sentido y la rapidez crece; al frenar se oponen. La cuarta gráfica separa la distancia recorrida, escalar de <Equation inline latex="3\,114{,}3\ \mathrm{m}" />, del desplazamiento, vector nulo al cerrar la ruta. Las (1.1) y (1.4) son la descomposición en componentes rectangulares del Tema 1.3, <Equation inline latex="\vec A = A_x\hat\imath + A_y\hat\jmath" /> con <Equation inline latex="\lVert\vec A\rVert = \sqrt{A_x^2 + A_y^2}" />; $\cos\theta$ y <Equation inline latex="\sin\theta = \cos(90^\circ - \theta)" />, los cosenos directores. Lo nuevo: aceleración constante a trozos, cada trozo un MRU o un MRUA.»

**`src/content/topics/frenado-regenerativo.mdx`**

- l. 194: «El motor pierde al convertir: Boretti reporta, de rueda a batería, del 70 al 80 % en un Leaf 2012 y del 72 al 87 % en uno 2013 <Cite id="boretti-2016" sources={frontmatter.sources} />; uso η = 0,80. La batería llena, fría o caliente reduce la regeneración <Cite id="nissan-leaf-2025-manual" sources={frontmatter.sources} />; en el modelo, baja <Equation inline latex="P_\text{máx}" />. Cerca de detenerse, el motor frena cada vez menos: f(v), de FASTSim 2 <Cite id="fastsim-2-simdrive" sources={frontmatter.sources} />.» → «El motor pierde al convertir: Boretti reporta, de rueda a batería, del 70 al 80 % en un Leaf 2012 y del 72 al 87 % en uno 2013 <Cite id="boretti-2016" sources={frontmatter.sources} />; uso $\eta = 0{,}80$. La batería llena, fría o caliente reduce la regeneración <Cite id="nissan-leaf-2025-manual" sources={frontmatter.sources} />; en el modelo, baja <Equation inline latex="P_\text{máx}" />. Cerca de detenerse, el motor frena cada vez menos: f(v), de FASTSim 2 <Cite id="fastsim-2-simdrive" sources={frontmatter.sources} />.»
- l. 312: «Se gana una autonomía que responde al ciclo, al auto y a la batería, y saber dónde se pierde cada kWh. Cuesta conocer A, B, C, η y los topes: f(v) usa valores por defecto de FASTSim 2, el reparto es modelado, y sin esos topes el modelo no distingue una batería fría o llena.» → «Se gana una autonomía que responde al ciclo, al auto y a la batería, y saber dónde se pierde cada kWh. Cuesta conocer $A$, $B$, $C$, $\eta$ y los topes: f(v) usa valores por defecto de FASTSim 2, el reparto es modelado, y sin esos topes el modelo no distingue una batería fría o llena.»

**`src/content/topics/gravedad-artificial.mdx`**

- l. 115: «En el borde exterior de un anillo que gira, la persona describe un MCU, con aceleración hacia el eje <Cite id="serway-jewett-2018" sources={frontmatter.sources} />. El diseño fija <Equation inline latex="a_c = g = 9{,}81\ \mathrm{m/s^2}" /> y despeja r o ω.» → «En el borde exterior de un anillo que gira, la persona describe un MCU, con aceleración hacia el eje <Cite id="serway-jewett-2018" sources={frontmatter.sources} />. El diseño fija <Equation inline latex="a_c = g = 9{,}81\ \mathrm{m/s^2}" /> y despeja $r$ o $\omega$.»
- l. 185: «En la (3.3) ω se cancela: el gradiente depende solo de r, del 0,8 % a 223,6 m al 18 % a 10 m.» → «En la (3.3) $\omega$ se cancela: el gradiente depende solo de $r$, del 0,8 % a 223,6 m al 18 % a 10 m.»
- l. 208: «El par (r, ω) fija la rapidez del piso, el período y el gradiente.» → «El par $(r, \omega)$ fija la rapidez del piso, el período y el gradiente.»
- l. 261: «SpinCalc, de Theodore W. Hall <Cite id="hall-spincalc" sources={frontmatter.sources} />, toma dos de r, ω, v y <Equation inline latex="a_c" />, calcula los otros dos y los compara con la zona de confort de cinco autores (figura 3.3). Hall trató este diseño en 2006 <Cite id="hall-2006-aiaa" sources={frontmatter.sources} />; lo aplico al Toro de Stanford de SP-413 <Cite id="nasa-sp413-1977" sources={frontmatter.sources} />.» → «SpinCalc, de Theodore W. Hall <Cite id="hall-spincalc" sources={frontmatter.sources} />, toma dos de $r$, $\omega$, $v$ y <Equation inline latex="a_c" />, calcula los otros dos y los compara con la zona de confort de cinco autores (figura 3.3). Hall trató este diseño en 2006 <Cite id="hall-2006-aiaa" sources={frontmatter.sources} />; lo aplico al Toro de Stanford de SP-413 <Cite id="nasa-sp413-1977" sources={frontmatter.sources} />.»
- l. 273: «La alternativa no física es una «gravedad» fija de 9,81 m/s² hacia el piso, como en un videojuego. Parece correcta mientras nadie se mueva, pero da gradiente nulo, ningún Coriolis y no deja preguntar si un par (r, ω) es habitable. El diseño decide ese par, no g.» → «La alternativa no física es una «gravedad» fija de 9,81 m/s² hacia el piso, como en un videojuego. Parece correcta mientras nadie se mueva, pero da gradiente nulo, ningún Coriolis y no deja preguntar si un par $(r, \omega)$ es habitable. El diseño decide ese par, no g.»

**`src/content/topics/llantas-f1.mdx`**

- l. 69: «note: 'N = mg cos θ: la carga sobre una superficie no es siempre el peso, y en un auto cambia en cada curva.'» → «note: '$N = mg\cos\theta$: la carga sobre una superficie no es siempre el peso, y en un auto cambia en cada curva.'»
- l. 114: «En clase, n fija cuánto se traban las superficies y μ solo depende de los materiales: la (4.1) es lineal y duplicar n duplica el agarre.» → «En clase, $n$ fija cuánto se traban las superficies y $\mu$ solo depende de los materiales: la (4.1) es lineal y duplicar n duplica el agarre.»
- l. 146: «{ symbol: '\\beta', meaning: 'exponente de sensibilidad a la carga, β < 1; uso 0,9' },» → «{ symbol: '\\beta', meaning: 'exponente de sensibilidad a la carga, $\\beta < 1$; uso 0,9' },»
- l. 160: «Con β < 1, la (4.2) da <Equation inline latex="F_{y,\text{máx}} \propto F_z^{\,\beta}" />, más lento que <Equation inline latex="F_z" />: bajo <Equation inline latex="F_{z0}" /> la llanta da más que la recta y, sobre ella, menos.» → «Con $\beta < 1$, la (4.2) da <Equation inline latex="F_{y,\text{máx}} \propto F_z^{\,\beta}" />, más lento que <Equation inline latex="F_z" />: bajo <Equation inline latex="F_{z0}" /> la llanta da más que la recta y, sobre ella, menos.»
- l. 183: «El agarre también depende de la temperatura de la banda. En la tabla de Autosport de 2019, el C3 trabaja en 105–135 °C y el C4, 90–120 °C <Cite id="autosport-pirelli-ranges-2019" sources={frontmatter.sources} />: la ventana donde, por convención de Pirelli, μ no baja del máximo menos un 3 % <Cite id="isola-operating-range" sources={frontmatter.sources} />.» → «El agarre también depende de la temperatura de la banda. En la tabla de Autosport de 2019, el C3 trabaja en 105–135 °C y el C4, 90–120 °C <Cite id="autosport-pirelli-ranges-2019" sources={frontmatter.sources} />: la ventana donde, por convención de Pirelli, $\mu$ no baja del máximo menos un 3 % <Cite id="isola-operating-range" sources={frontmatter.sources} />.»
- l. 311: «Leo ˋFZ0ˋ como carga de referencia en newtons, ˋDY_REFˋ como μ a esa carga y ˋLS_EXPYˋ (LS, _load sensitivity_) como el β de la (4.2); el archivo no imprime la fórmula: la lectura es mía. No sé si Kunos usa la Fórmula Mágica <Cite id="pacejka-2012" sources={frontmatter.sources} />.» → «Leo ˋFZ0ˋ como carga de referencia en newtons, ˋDY_REFˋ como $\mu$ a esa carga y ˋLS_EXPYˋ (LS, _load sensitivity_) como el $\beta$ de la (4.2); el archivo no imprime la fórmula: la lectura es mía. No sé si Kunos usa la Fórmula Mágica <Cite id="pacejka-2012" sources={frontmatter.sources} />.»
- l. 317: «Con μ constante, el doble de peso tomaría las curvas igual de rápido y una llanta fría agarraría como en ventana. Una tabla guionizada fallaría fuera de lo previsto: otro reparto de peso, más carga aerodinámica, una llanta a 150 °C.» → «Con $\mu$ constante, el doble de peso tomaría las curvas igual de rápido y una llanta fría agarraría como en ventana. Una tabla guionizada fallaría fuera de lo previsto: otro reparto de peso, más carga aerodinámica, una llanta a 150 °C.»
- l. 331: «En la caja de 10 kg del Tema 02, con <Equation inline latex="\mu_s = 0{,}40" /> y <Equation inline latex="\mu_k = 0{,}30" />, la clase usa <Equation inline latex="g = 9{,}8\ \text{m/s}^2" /> y <Equation inline latex="N = 98\ \text{N}" />; con <Equation inline latex="9{,}81\ \text{m/s}^2" />, <Equation inline latex="98{,}1\ \text{N}" />: la (4.1), con <Equation inline latex="n = N" />, da los mismos <Equation inline latex="39{,}2\ \text{N}" /> y <Equation inline latex="29{,}4\ \text{N}" />. Las (4.2) a (4.4) son extensiones. El concepto 01 toma μ «constante como una aproximación del contacto real»; con la (4.2), <Equation inline latex="\beta = 0{,}9" /> y <Equation inline latex="F_{z0} = 98\ \text{N}" />, duplicar N a <Equation inline latex="196\ \text{N}" /> daría <Equation inline latex="73{,}2\ \text{N}" />, no <Equation inline latex="78{,}4\ \text{N}" />. La normal «se calcula previamente a partir del DCL y puede ser diferente de mg», como <Equation inline latex="mg\cos\theta" /> en el plano inclinado; en un auto es la <Equation inline latex="F_z" /> de cada llanta.» → «En la caja de 10 kg del Tema 02, con <Equation inline latex="\mu_s = 0{,}40" /> y <Equation inline latex="\mu_k = 0{,}30" />, la clase usa <Equation inline latex="g = 9{,}8\ \text{m/s}^2" /> y <Equation inline latex="N = 98\ \text{N}" />; con <Equation inline latex="9{,}81\ \text{m/s}^2" />, <Equation inline latex="98{,}1\ \text{N}" />: la (4.1), con <Equation inline latex="n = N" />, da los mismos <Equation inline latex="39{,}2\ \text{N}" /> y <Equation inline latex="29{,}4\ \text{N}" />. Las (4.2) a (4.4) son extensiones. El concepto 01 toma $\mu$ «constante como una aproximación del contacto real»; con la (4.2), <Equation inline latex="\beta = 0{,}9" /> y <Equation inline latex="F_{z0} = 98\ \text{N}" />, duplicar N a <Equation inline latex="196\ \text{N}" /> daría <Equation inline latex="73{,}2\ \text{N}" />, no <Equation inline latex="78{,}4\ \text{N}" />. La normal «se calcula previamente a partir del DCL y puede ser diferente de mg», como <Equation inline latex="mg\cos\theta" /> en el plano inclinado; en un auto es la <Equation inline latex="F_z" /> de cada llanta.»
- l. 337: «Con el Tema 3: en curva plana, la fricción lateral es la centrípeta, <Equation inline latex="\mu m g = m v^2/r \Rightarrow v_\text{máx} = \sqrt{\mu g r} = \sqrt{1{,}6 \cdot 9{,}81 \cdot 50} = 28{,}0\ \text{m/s} \approx 101\ \text{km/h}" />; si μ cae un 10 %, la rapidez cae solo un 5,1 %, por la raíz: <Equation inline latex="\mu = 1{,}44 \Rightarrow v_\text{máx} = 26{,}6\ \text{m/s}\ (95{,}7\ \text{km/h})" />. Con el Tema 5, el resorte <Equation inline latex="F = -kx" /> es otro contacto idealizado; la llanta se deforma en su huella, algo que el modelo de clase no tiene. Con el Tema 6: frene el motor eléctrico (regenerativo) o las pastillas, el agarre limita la desaceleración.» → «Con el Tema 3: en curva plana, la fricción lateral es la centrípeta, <Equation inline latex="\mu m g = m v^2/r \Rightarrow v_\text{máx} = \sqrt{\mu g r} = \sqrt{1{,}6 \cdot 9{,}81 \cdot 50} = 28{,}0\ \text{m/s} \approx 101\ \text{km/h}" />; si $\mu$ cae un 10 %, la rapidez cae solo un 5,1 %, por la raíz: <Equation inline latex="\mu = 1{,}44 \Rightarrow v_\text{máx} = 26{,}6\ \text{m/s}\ (95{,}7\ \text{km/h})" />. Con el Tema 5, el resorte <Equation inline latex="F = -kx" /> es otro contacto idealizado; la llanta se deforma en su huella, algo que el modelo de clase no tiene. Con el Tema 6: frene el motor eléctrico (regenerativo) o las pastillas, el agarre limita la desaceleración.»

**`src/content/topics/salto-personaje.mdx`**

- l. 136: «Con el impulso fijo, multiplicar g por λ divide altura y tiempo entre λ: con <Equation inline latex="(v_0, g)" /> como mandos no se ajustan por separado.» → «Con el impulso fijo, multiplicar $g$ por $\lambda$ divide altura y tiempo entre $\lambda$: con <Equation inline latex="(v_0, g)" /> como mandos no se ajustan por separado.»

**`src/lib/tables/topics/asistencia-gravitatoria.ts`**

- l. 45: «{ key: 'delta', label: 'δ', unit: '°', align: 'num', precision: 1 },» → «{ key: 'delta', label: '$\\delta$', unit: '°', align: 'num', precision: 1 },»

**`src/lib/tables/topics/dron-reparto.ts`**

- l. 79: «{ key: 'x', label: 'Llegada, x', unit: 'm', align: 'num', precision: 0 },» → «{ key: 'x', label: 'Llegada, $x$', unit: 'm', align: 'num', precision: 0 },»
- l. 80: «{ key: 'y', label: 'Llegada, y', unit: 'm', align: 'num', precision: 0 },» → «{ key: 'y', label: 'Llegada, $y$', unit: 'm', align: 'num', precision: 0 },»
- l. 81: «{ key: 'd', label: 'Longitud d', unit: 'm', align: 'num', precision: 1 },» → «{ key: 'd', label: 'Longitud $d$', unit: 'm', align: 'num', precision: 1 },»
- l. 86: «{ key: 'T', label: 'Duración T', unit: 's', align: 'num', precision: 1 },» → «{ key: 'T', label: 'Duración $T$', unit: 's', align: 'num', precision: 1 },»

#### `d63732d` feat(type): the time variable and the figures' last bare symbols in italic (14)

**`src/components/topics/asistencia-gravitatoria/FlybyFigure.tsx`**

- l. 311: «r_p» → «{'$r_p$'}»

**`src/components/topics/asistencia-gravitatoria/PlanetFrame.tsx`**

- l. 537: «r_p» → «{'$r_p$'}»

**`src/components/topics/coeficiente-restitucion/BouncePlots.tsx`**

- l. 100: «label: (x: number) => ˋt = ${formatNumber(x, { precision: TIME_PRECISION, unit: 's' })}ˋ,» → «label: (x: number) => ˋ$t$ = ${formatNumber(x, { precision: TIME_PRECISION, unit: 's' })}ˋ,»

**`src/components/topics/control-haptico/TriggerLever.tsx`**

- l. 284: «F» → «{'$F$'}»

**`src/components/topics/dron-reparto/DroneProfilesMarker.tsx`**

- l. 55: «ˋt = ${formatNumber(t, { precision: decimals, unit: 's' })}ˋ;» → «ˋ$t$ = ${formatNumber(t, { precision: decimals, unit: 's' })}ˋ;»

**`src/components/topics/frenado-regenerativo/EnergyBalanceChart.tsx`**

- l. 94: «const label = (x: number) => ˋt = ${seconds(x)}ˋ;» → «const label = (x: number) => ˋ$t$ = ${seconds(x)}ˋ;»

**`src/components/topics/gravedad-artificial/HabitatScene.tsx`**

- l. 115: «ω» → «{'$\\omega$'}»
- l. 215: «r» → «{'$r$'}»
- l. 220: «a_c» → «{'$a_c$'}»
- l. 223: «g_ap» → «{'$g_\\text{ap}$'}»

**`src/components/topics/ruedas-reaccion/WheelPlot.tsx`**

- l. 120: «ˋt = ${formatNumber(x, { precision: isManeuver ? CURSOR_PRECISION : decimals, unit: plot.xUnit })}ˋ;» → «ˋ$t$ = ${formatNumber(x, { precision: isManeuver ? CURSOR_PRECISION : decimals, unit: plot.xUnit })}ˋ;»

**`src/components/topics/ruedas-reaccion/WheelSceneMarks.tsx`**

- l. 117: «B» → «{'$B$'}»
- l. 146: «m» → «{'$m$'}»
- l. 172: «F» → «{'$F$'}»

#### `f4aee51` feat(type): the labs' parameter, readout and table symbols in italic (22)

**`src/components/topics/coeficiente-restitucion/BounceLab.tsx`**

- l. 225: «label="Coeficiente de restitución e"» → «label="Coeficiente de restitución $e$"»
- l. 314: «engineSubtitle={ˋΔt\u00a0=\u00a01/${settings.rate}\u00a0s ×\u00a0${settings.substeps}ˋ}» → «engineSubtitle={ˋ$\\Delta{}t$\u00a0=\u00a01/${settings.rate}\u00a0s ×\u00a0${settings.substeps}ˋ}»

**`src/components/topics/coeficiente-restitucion/BounceScene.tsx`**

- l. 310: «const text = ˋh_0 = ${formatNumber(h0, { precision: decimals, unit: 'm' })}ˋ;» → «const text = ˋ$h_0$ = ${formatNumber(h0, { precision: decimals, unit: 'm' })}ˋ;»
- l. 412: «(nada)» → «source="$y$ (m)"»

**`src/components/topics/coeficiente-restitucion/CollisionMode.tsx`**

- l. 331: «label="Coeficiente de restitución e"» → «label="Coeficiente de restitución $e$"»

**`src/components/topics/control-haptico/TriggerLab.tsx`**

- l. 227: «label="Rigidez k"» → «label="Rigidez $k$"»

**`src/components/topics/control-haptico/TriggerLever.tsx`**

- l. 316: «dy={valueLabelDrop(angle, ˋx = ${xText(xMm)}ˋ)}» → «dy={valueLabelDrop(angle, ˋ$x$ = ${xText(xMm)}ˋ)}»
- l. 319: «{ˋx = ${xText(xMm)}ˋ}» → «{ˋ$x$ = ${xText(xMm)}ˋ}»

**`src/components/topics/control-haptico/hapticPlots.ts`**

- l. 35: «export function hookeSeries(k: number, label = 'Resorte ideal, F = k x'): PlotSeries {» → «export function hookeSeries(k: number, label = 'Resorte ideal, $F = k x$'): PlotSeries {»

**`src/components/topics/frenado-regenerativo/EnergyBalanceChart.tsx`**

- l. 136: «<Readout label="Tiempo t" value={step.t} unit="s" precision={0} />» → «<Readout label="Tiempo $t$" value={step.t} unit="s" precision={0} />»
- l. 138: «label="Velocidad v"» → «label="Velocidad $v$"»

**`src/components/topics/gravedad-artificial/HabitatLab.tsx`**

- l. 106: «label="Velocidad de giro N"» → «label="Velocidad de giro $N$"»
- l. 116: «label="Radio del piso r"» → «label="Radio del piso $r$"»

**`src/components/topics/llantas-f1/TyreLab.tsx`**

- l. 162: «label="Temperatura de la banda T"» → «label="Temperatura de la banda $T$"»

**`src/components/topics/ruedas-reaccion/WheelLab.tsx`**

- l. 193: «label="Duración de la maniobra T"» → «label="Duración de la maniobra $T$"»

**`src/components/topics/salto-personaje/JumpParams.tsx`**

- l. 40: «label="Gravedad g"» → «label="Gravedad $g$"»

**`src/lib/tables/topics/coeficiente-restitucion.ts`**

- l. 134: «{ key: 'mezcla', label: 'Mezcla de e', align: 'text' },» → «{ key: 'mezcla', label: 'Mezcla de $e$', align: 'text' },»

**`src/lib/tables/topics/control-haptico.ts`**

- l. 44: «{ key: 'x', label: 'Desplazamiento x', unit: 'mm', align: 'num', precision: 0 },» → «{ key: 'x', label: 'Desplazamiento $x$', unit: 'mm', align: 'num', precision: 0 },»
- l. 88: «{ key: 'x', label: 'Desplazamiento x', unit: 'mm', align: 'num', precision: 0 },» → «{ key: 'x', label: 'Desplazamiento $x$', unit: 'mm', align: 'num', precision: 0 },»
- l. 89: «{ key: 'force', label: 'Fuerza, k x', unit: 'N', align: 'num', precision: 1 },» → «{ key: 'force', label: 'Fuerza, $k x$', unit: 'N', align: 'num', precision: 1 },»

**`src/lib/tables/topics/frenado-regenerativo.ts`**

- l. 37: «{ key: 'm', label: 'Masa m', unit: 'kg', align: 'num', precision: 2 },» → «{ key: 'm', label: 'Masa $m$', unit: 'kg', align: 'num', precision: 2 },»

**`src/lib/tables/topics/llantas-f1.ts`**

- l. 64: «{ key: 't', label: 'Temperatura T', unit: '°C', align: 'num', precision: 0 },» → «{ key: 't', label: 'Temperatura $T$', unit: '°C', align: 'num', precision: 0 },»

## 3. E5 · el barrido de letras sueltas (solo marcado, 248 cambios)

Copiado del informe de E5 (`.superpowers/sdd/2026-10-31-fases-b-c-d/task-E5-report.md`, que no está en git). Las líneas
son las de `d7fec8d`. Ninguna palabra cambia; además del marcado, `m g` → `mg`, `·` → `\cdot`, `½` → `\tfrac12` y `−` → `-`
dentro de la fórmula, que KaTeX dibuja igual.

**`src/components/topics/asistencia-gravitatoria/FlybyComparison.tsx`**

- l. 44: «{ label: '|v| antes',» → «{ label: '$|v|$ antes',»
- l. 45: «{ label: '|v| después',» → «{ label: '$|v|$ después',»
- l. 47: «label: 'Δ|v|',» → «label: '$\\Delta|v|$',»
- l. 75: «<th scope="row" className="px-2 py-1 text-left font-normal text-fg-muted"> {row.label} </th>» → «<th scope="row" className="px-2 py-1 text-left font-normal text-fg-muted"> <InlineMath text={row.label} /> </th>»

**`src/components/topics/asistencia-gravitatoria/FlybyFigure.tsx`**

- l. 463: «{`V_p ${speedNumber(t.Vp)}`}» → «{`$V_p$ ${speedNumber(t.Vp)}`}»

**`src/components/topics/asistencia-gravitatoria/FlybyLab.tsx`**

- l. 183: «label: '|v| antes, marco del Sol'» → «label: '$|v|$ antes, marco del Sol'»
- l. 184: «label: '|v| después, marco del Sol'» → «label: '$|v|$ después, marco del Sol'»
- l. 187: «label: 'Ganancia de rapidez Δ|v|'» → «label: 'Ganancia de rapidez $\\Delta|v|$'»

**`src/components/topics/asistencia-gravitatoria/VoyagerDetailPlot.tsx`**

- l. 206: «title="|v| (km/s)"» → «title="$|v|$ (km/s)"»
- l. 211: «title="t − t_{MA} (d)"» → «title="$t - t_\text{MA}$ (d)"»

**`src/components/topics/asistencia-gravitatoria/VoyagerMissionPlot.tsx`**

- l. 149: «title="|v| (km/s)"» → «title="$|v|$ (km/s)"»
- l. 172: «title="r (UA)"» → «title="$r$ (UA)"»

**`src/components/topics/asistencia-gravitatoria/VoyagerSpeedChart.tsx`**

- l. 52: «'Cada salto Δ|v| es la diferencia» → «'Cada salto $\\Delta|v|$ es la diferencia»

**`src/components/topics/coeficiente-restitucion/BounceLab.tsx`**

- l. 50: «regla de combinación, e del suelo, Baumgarte y e(v))» → «regla de combinación, $e$ del suelo, Baumgarte y $e(v)$)»
- l. 188: «label: String.raw`e medido $\sqrt{h_1/h_0}$ (motor)`» → «label: String.raw`$e$ medido $\sqrt{h_1/h_0}$ (motor)`»
- l. 220: «{`e(v) = ${formatNumber(SPEED_FIT.e0, { precision: 2 })} − ${formatNumber(SPEED_FIT.k, { precision: 3 })}·|v| (s/m), recortado a [0, 1]: ajuste ilustrativo a Cross (1999). Desactívalo en los ajustes para volver a un e fijo.`}» → «<InlineMath text={`$e(v)$ = ${formatNumber(SPEED_FIT.e0, { precision: 2 })} − ${formatNumber(SPEED_FIT.k, { precision: 3 })}·$|v|$ (s/m), recortado a [0, 1]: ajuste ilustrativo a Cross (1999). Desactívalo en los ajustes para volver a un $e$ fijo.`} />»

**`src/components/topics/coeficiente-restitucion/BounceNotes.tsx`**

- l. 88: «(con e(v), suma de los vuelos)» → «(con $e(v)$, suma de los vuelos)»
- l. 98: «? `N = ${prediction.bounces} rebotes;» → «? `$N$ = ${prediction.bounces} rebotes;»
- l. 101: «? `e(v) del ajuste ilustrativo,» → «? `$e(v)$ del ajuste ilustrativo,»
- l. 105: «<Row term="T teórico, $t_0(1+e)/(1-e)$">» → «<Row term="$T$ teórico, $t_0(1+e)/(1-e)$">»

**`src/components/topics/coeficiente-restitucion/BouncePlots.tsx`**

- l. 4: «import type { FrameStore } from '../../lab/frameStore';» → «import type { FrameStore } from '../../lab/frameStore'; import InlineMath from '../../lab/InlineMath';»
- l. 111: «title="Altura de las pelotas, y(t)"» → «title="Altura de las pelotas, $y(t)$"»
- l. 139: «{` Botes en que el motor gana energía: ${rises} por encima del vuelo anterior (e > 1) y ${excess} por encima de lo que e permite (sesgo de Baumgarte). `}» → «<InlineMath text={` Botes en que el motor gana energía: ${rises} por encima del vuelo anterior ($e > 1$) y ${excess} por encima de lo que $e$ permite (sesgo de Baumgarte). `} />»

**`src/components/topics/coeficiente-restitucion/CollisionDiagram.tsx`**

- l. 202: «<text x={x + length / 2} y={y + UNDER_LABEL} textAnchor="middle" fontSize={SMALL_SIZE} {...textStyle} > {label} </text>» → «<MathText source={label} x={x + length / 2} y={y + UNDER_LABEL} anchor="middle" fontSize={SMALL_SIZE} fill={TEXT_COLOR} />»
- l. 304: «${layout.hasColumnHeaders ? '' : 'p = '}» → «${layout.hasColumnHeaders ? '' : '$p$ = '}»
- l. 307: «<text x={LABEL_X} y={middle + 4} fontSize={LABEL_SIZE} {...textStyle}> {row.label} </text>» → «<MathText source={row.label} x={LABEL_X} y={middle + 4} fontSize={LABEL_SIZE} fill={TEXT_COLOR} />»
- l. 333: «{ label: 'K del CM',» → «{ label: '$K$ del CM',»
- l. 334: «{ label: 'K relativa',» → «{ label: '$K$ relativa',»
- l. 339: «const keyItemWidth = (label: string) => KEY_SWATCH + KEY_TEXT_GAP + label.length * SMALL_CHAR + KEY_ITEM_GAP;» → «const keyItemWidth = (label: string) => KEY_SWATCH + KEY_TEXT_GAP + mathTextToString(label).length * SMALL_CHAR + KEY_ITEM_GAP;»
- l. 363: «<text x={at + KEY_SWATCH + KEY_TEXT_GAP} y={y} fontSize={SMALL_SIZE} {...textStyle}> {item.label} </text>» → «<MathText source={item.label} x={at + KEY_SWATCH + KEY_TEXT_GAP} y={y} fontSize={SMALL_SIZE} fill={TEXT_COLOR} />»
- l. 385: «<text x={layout.momentum.x + (before.momentum * PX_PER_MOMENTUM) / 2} y={HEADER_Y}> Momento p </text>» → «<MathText source="Momento $p$" x={layout.momentum.x + (before.momentum * PX_PER_MOMENTUM) / 2} y={HEADER_Y} anchor="middle" fontSize={SMALL_SIZE} fill={TICK_COLOR} />»
- l. 425: «label: `e = ${formatTrimmed(row.e)}`,» → «label: `$e$ = ${formatTrimmed(row.e)}`,»

**`src/components/topics/coeficiente-restitucion/CollisionMode.tsx`**

- l. 294: «antes y después para cualquier e; la energía» → «antes y después para cualquier $e$; la energía»
- l. 388: «label: 'p antes'» → «label: '$p$ antes'»
- l. 389: «label: 'p después'» → «label: '$p$ después'»

**`src/components/topics/coeficiente-restitucion/bounceLabSettings.ts`**

- l. 90: «range('floorE', 'e del material del suelo',» → «range('floorE', '$e$ del material del suelo',»
- l. 94: «label: 'e(v) = 0,79 − 0,009·|v| (ajuste ilustrativo)'» → «label: '$e(v) = 0{,}79 - 0{,}009 \\cdot |v|$ (ajuste ilustrativo)'»

**`src/components/topics/coeficiente-restitucion/bouncePresets.ts`**

- l. 118: «(cálculo propio, e = $\\sqrt{h'/h}$ o $v'/v$)» → «(cálculo propio, $e = \\sqrt{h'/h}$ o $v'/v$)»
- l. 168: «con una pelota viva de e = 0,9.'» → «con una pelota viva de $e = 0{,}9$.'»
- l. 172: «name: 'Realista mejorado: e(v)'» → «name: 'Realista mejorado: $e(v)$', optionLabel: 'Realista mejorado: e(v)'»
- l. 183: «note: 'e(v) = 0,79 − 0,009·|v|: ajuste» → «note: '$e(v) = 0{,}79 - 0{,}009 \\cdot |v|$: ajuste»
- l. 183: «a baja velocidad e sube,» → «a baja velocidad $e$ sube,»
- l. 187: «name: 'e = 1 sin umbral'» → «name: '$e = 1$ sin umbral', optionLabel: 'e = 1 sin umbral'»
- l. 192: «no se detiene nunca, porque E no cambia;» → «no se detiene nunca, porque $E$ no cambia;»
- l. 196: «name: 'e = 1,1'» → «name: '$e = 1{,}1$', optionLabel: 'e = 1,1'»
- l. 201: «note: `Con e > 1 cada bote devuelve más energía de la que recibe: E sube un factor e² = ${» → «note: `Con $e > 1$ cada bote devuelve más energía de la que recibe: $E$ sube un factor $e^2$ = ${»
- l. 205: «name: 'e demasiado bajo (0,2)'» → «name: '$e$ demasiado bajo (0,2)', optionLabel: 'e demasiado bajo (0,2)'»
- l. 210: «note: `Una pelota «de tenis» con e = ${» → «note: `Una pelota «de tenis» con $e$ = ${»
- l. 226: «y le doy al suelo el mismo e = ${» → «y le doy al suelo el mismo $e$ = ${»
- l. 226: «'average'), 3)}; e quedaría a la mitad» → «'average'), 3)}; $e$ quedaría a la mitad»
- l. 241: «cambia la regla en los ajustes: e es del par,» → «cambia la regla en los ajustes: $e$ es del par,»
- l. 257: «rebota más alto de lo que e permite» → «rebota más alto de lo que $e$ permite»

**`src/components/topics/control-haptico/HapticFigure.tsx`**

- l. 126: «{`U = ${formatNumber(bottom.energy» → «{`$U$ = ${formatNumber(bottom.energy»

**`src/components/topics/control-haptico/TriggerLab.tsx`**

- l. 272: «del resorte ideal en el x actual;» → «del resorte ideal en el $x$ actual;»
- l. 272: «La flecha F es la fuerza» → «La flecha $F$ es la fuerza»
- l. 272: «el resorte ideal en el mismo x. Al soltarla» → «el resorte ideal en el mismo $x$. Al soltarla»

**`src/components/topics/dron-reparto/DroneFigure.tsx`**

- l. 83: «{isCompact ? 'x' : `x = ${b.x} m`}» → «{isCompact ? '$x$' : `$x$ = ${b.x} m`}»
- l. 86: «{isCompact ? 'y' : `y = ${b.y} m`}» → «{isCompact ? '$y$' : `$y$ = ${b.y} m`}»
- l. 94: «> vec r </Label>» → «> {'$\\vec r$'} </Label>»
- l. 112: «title="Ruta declarada en el plano x–y"» → «title="Ruta declarada en el plano $x$–$y$"»
- l. 182: «{`t_a = ${seconds(leg.tAccel)}`}» → «{`$t_a$ = ${seconds(leg.tAccel)}`}»
- l. 185: «{`d/v_máx = ${seconds(cruiseEnd)}`}» → «{`$d/v_\\text{máx}$ = ${seconds(cruiseEnd)}`}»
- l. 193: «{`T = ${seconds(leg.duration)}`}» → «{`$T$ = ${seconds(leg.duration)}`}»

**`src/components/topics/dron-reparto/DroneLab.tsx`**

- l. 67: «label: 'Rapidez |v|'» → «label: 'Rapidez $|v|$'»

**`src/components/topics/dron-reparto/DroneProfiles.tsx`**

- l. 256: «xLabel="t"» → «xLabel="$t$"»

**`src/components/topics/dron-reparto/RouteMapLab.tsx`**

- l. 61: «xLabel="x (este)"» → «xLabel="$x$ (este)"»
- l. 63: «yLabel="y (norte)"» → «yLabel="$y$ (norte)"»

**`src/components/topics/frenado-regenerativo/RegenNotes.tsx`**

- l. 15: «'El grosor es proporcional a |P|: 20 kW» → «'El grosor es proporcional a $|P|$: 20 kW»

**`src/components/topics/frenado-regenerativo/regenPresets.ts`**

- l. 85: «pero su C es mayor:» → «pero su $C$ es mayor:»

**`src/components/topics/gravedad-artificial/HabitatLab.tsx`**

- l. 40: «$\\omega = \\sqrt{g/r}$, con g = 9,81 m/s².» → «$\\omega = \\sqrt{g/r}$, con $g = 9{,}81$ m/s².»

**`src/components/topics/gravedad-artificial/RadiusBar.tsx`**

- l. 11: «import { Knob, Label } from '../../lab/OverlayMarks';» → «import MathText from '../../lab/MathText'; import { Knob, Label } from '../../lab/OverlayMarks';»
- l. 80: «<text x={x0} y={captionY} fontSize={CAPTION_SIZE} fill={TEXT_COLOR}> Radio del piso r </text>» → «<MathText source="Radio del piso $r$" x={x0} y={captionY} fontSize={CAPTION_SIZE} fill={TEXT_COLOR} />»

**`src/components/topics/llantas-f1/TyreFigure.tsx`**

- l. 75: «xLabel="Fuerza aplicada F"» → «xLabel="Fuerza aplicada $F$"»
- l. 77: «yLabel="Fricción f"» → «yLabel="Fricción $f$"»
- l. 210: «label: `Pico: x ≈ ${twoDecimals(peak.x)}; y = ${twoDecimals(peak.y)}`» → «label: `Pico: $x$ ≈ ${twoDecimals(peak.x)}; $y$ = ${twoDecimals(peak.y)}`»
- l. 217: «label: `x = ${SLIP_MAX}: y = ${twoDecimals(atEnd)}`» → «label: `$x$ = ${SLIP_MAX}: $y$ = ${twoDecimals(atEnd)}`»
- l. 227: «xLabel="Deslizamiento x"» → «xLabel="Deslizamiento $x$"»
- l. 229: «yLabel="Fuerza y"» → «yLabel="Fuerza $y$"»

**`src/components/topics/ruedas-reaccion/ExchangeDiagram.tsx`**

- l. 172: «<text x={(DIVIDER_X + VIEW.width) / 2} y={TITLE_Y} textAnchor="middle" {...textStyle}> Sobre el eje z </text>» → «<MathText source="Sobre el eje $z$" x={(DIVIDER_X + VIEW.width) / 2} y={TITLE_Y} anchor="middle" fontSize={textStyle.fontSize} fill={textStyle.fill} />»

**`src/components/topics/ruedas-reaccion/wheelPresets.ts`**

- l. 58: «para este 6U, y con T = ${n(FASTEST_T» → «para este 6U, y con $T$ = ${n(FASTEST_T»

**`src/components/topics/salto-personaje/JumpDesigner.tsx`**

- l. 57: «text="altura y tiempo al ápice $\to$ g y $v_0$"» → «text="altura y tiempo al ápice $\to$ $g$ y $v_0$"»

**`src/components/topics/salto-personaje/JumpFigure.tsx`**

- l. 80: «seriesFor(id, `${worldForPreset(id).name}, g = ${gravity(g)}`» → «seriesFor(id, `${worldForPreset(id).name}, $g$ = ${gravity(g)}`»
- l. 161: «`${worldForPreset(id).name}: g = ${gravity(settings.g)}, $v_0$» → «`${worldForPreset(id).name}: $g$ = ${gravity(settings.g)}, $v_0$»

**`src/components/topics/salto-personaje/jumpLabView.ts`**

- l. 37: «label: `${world.name}, g = ${gravityText(settings.g)}`» → «label: `${world.name}, $g$ = ${gravityText(settings.g)}`»

**`src/content/topics/asistencia-gravitatoria.mdx`**

- l. 95: «note: 'U = −GMm/r, rapidez de escape y E > 0 hiperbólica,» → «note: '$U = -GMm/r$, rapidez de escape y $E > 0$ hiperbólica,»
- l. 101: «elipse con semieje mayor a y afelio a(1 + e), la órbita» → «elipse con semieje mayor $a$ y afelio $a(1 + e)$, la órbita»
- l. 161: «frente a su distancia r. Los puntos» → «frente a su distancia $r$. Los puntos»
- l. 319: «y la lectura t da el tiempo real» → «y la lectura $t$ da el tiempo real»
- l. 348: «Cuesta integrar n cuerpos,» → «Cuesta integrar $n$ cuerpos,»

**`src/content/topics/coeficiente-restitucion.mdx`**

- l. 151: «note: 'Elástica si K se conserva; con e = 1 elástica y con e = 0 los cuerpos» → «note: 'Elástica si $K$ se conserva; con $e = 1$ elástica y con $e = 0$ los cuerpos»
- l. 157: «la pérdida de la (7.2) con e = 0.'» → «la pérdida de la (7.2) con $e = 0$.'»
- l. 182: «Un solo número, e, decide» → «Un solo número, $e$, decide»
- l. 184: «e compara la velocidad vertical» → «$e$ compara la velocidad vertical»
- l. 199: «altura que alcanza tras el rebote n, desde» → «altura que alcanza tras el rebote $n$, desde»
- l. 222: «soltada desde 2,54 m con e = 0,745,» → «soltada desde 2,54 m con $e = 0{,}745$,»
- l. 222: «la línea discontinua marca T, cuando» → «la línea discontinua marca $T$, cuando»
- l. 234: «el momento lineal; e aporta la segunda ecuación: e = 1 es el choque elástico (K se conserva), e = 0 el completamente» → «el momento lineal; $e$ aporta la segunda ecuación: $e = 1$ es el choque elástico ($K$ se conserva), $e = 0$ el completamente»
- l. 274: «antes y después con e = 0, 0,75 y 1.» → «antes y después con $e = 0$, 0,75 y 1.»
- l. 274: «la barra de K guarda» → «la barra de $K$ guarda»
- l. 286: «en un tiempo finito T, y un motor» → «en un tiempo finito $T$, y un motor»
- l. 327: «corta la serie en N botes;» → «corta la serie en $N$ botes;»
- l. 336: «de una pelota de e = 0,9 soltada» → «de una pelota de $e = 0{,}9$ soltada»
- l. 336: «la corta en su rebote N, y» → «la corta en su rebote $N$, y»
- l. 350: «. Y e no es constante:» → «. Y $e$ no es constante:»
- l. 373: «la fracción e del impulso» → «la fracción $e$ del impulso»
- l. 379: «(7.1). Con e(v), a baja velocidad e crece» → «(7.1). Con $e(v)$, a baja velocidad $e$ crece»
- l. 387: «compara el e medido.» → «compara el $e$ medido.»
- l. 392: «Todo con g = 9,81 m/s².» → «Todo con $g = 9{,}81$ m/s².»
- l. 393: «tiene un e horizontal de 0,76)» → «tiene un $e$ horizontal de 0,76)»
- l. 393: «subestima un poco el e de una pelota» → «subestima un poco el $e$ de una pelota»
- l. 393: «porque todo es vertical; la e(v) real,» → «porque todo es vertical; la $e(v)$ real,»
- l. 423: «es arbitraria: e es del par,» → «es arbitraria: $e$ es del par,»
- l. 431: «es la fila e = 1 de la figura 7.2, y la fila e = 0 es» → «es la fila $e = 1$ de la figura 7.2, y la fila $e = 0$ es»

**`src/content/topics/control-haptico.mdx`**

- l. 69: «y el ejemplo k = 150 N/m, x = −0,08 m $\to$ +12 N» → «y el ejemplo $k = 150$ N/m, $x = -0{,}08$ m $\to$ +12 N»
- l. 107: «amplitud de la vibración, independiente de x;» → «amplitud de la vibración, independiente de $x$;»
- l. 126: «de F no se despeja x. Para informar de la posición, F debe crecer con x.» → «de $F$ no se despeja $x$. Para informar de la posición, $F$ debe crecer con $x$.»
- l. 137: «recorrido de 8 mm, k y $F_0$ ilustrativos» → «recorrido de 8 mm, $k$ y $F_0$ ilustrativos»
- l. 176: «/>. U es el trabajo de comprimirlo, el área bajo kx, <Equation» → «/>. $U$ es el trabajo de comprimirlo, el área bajo $kx$, <Equation»
- l. 176: «; F crece con x, y U con x².» → «; $F$ crece con $x$, y $U$ con $x^2$.»
- l. 187: «fuente 5; k y recorrido ilustrativos.» → «fuente 5; $k$ y recorrido ilustrativos.»
- l. 225: «3,2 N con k = 400 N/m,» → «3,2 N con $k = 400$ N/m,»
- l. 256: «Más duro es un k mayor;» → «Más duro es un $k$ mayor;»
- l. 290: «una fuerza que crezca con x: no hay» → «una fuerza que crezca con $x$: no hay»
- l. 296: «mis $x_0$ y k, y mi dedo» → «mis $x_0$ y $k$, y mi dedo»
- l. 302: «la fuerza no es proporcional a x. Hooke» → «la fuerza no es proporcional a $x$. Hooke»
- l. 308: «el gatillo vuelve a x = 0 por su resorte» → «el gatillo vuelve a $x = 0$ por su resorte»
- l. 317: «y la curva marca F en el x actual;» → «y la curva marca $F$ en el $x$ actual;»
- l. 317: «Duplicar k duplica fuerza y energía;» → «Duplicar $k$ duplica fuerza y energía;»
- l. 319: «supuesto de 8 mm; k y $x_0$ ilustrativos.» → «supuesto de 8 mm; $k$ y $x_0$ ilustrativos.»
- l. 324: «Recorrido supuesto de 8 mm; k y $x_0$ son ilustrativos» → «Recorrido supuesto de 8 mm; $k$ y $x_0$ son ilustrativos»
- l. 324: «con el k del laboratorio» → «con el $k$ del laboratorio»
- l. 324: «devuelve el gatillo a x = 0; aquí lo representan el k virtual y el tope, y la F de las lecturas» → «devuelve el gatillo a $x = 0$; aquí lo representan el $k$ virtual y el tope, y la $F$ de las lecturas»
- l. 324: «que con un k alto aplanaría» → «que con un $k$ alto aplanaría»
- l. 344: «<Equation inline latex="x_0" /> y k; no hay conversión» → «<Equation inline latex="x_0" /> y $k$; no hay conversión»
- l. 350: «con k, Hooke da la fuerza» → «con $k$, Hooke da la fuerza»
- l. 356: «F crece con k, y U con k y el cuadrado» → «$F$ crece con $k$, y $U$ con $k$ y el cuadrado»

**`src/content/topics/dron-reparto.mdx`**

- l. 57: «note: 'v = dr/dt y a = dv/dt: la velocidad es la pendiente de la posición; al frenar, v y a tienen sentidos opuestos.'» → «note: '$v = dr/dt$ y $a = dv/dt$: la velocidad es la pendiente de la posición; al frenar, $v$ y $a$ tienen sentidos opuestos.'»
- l. 60: «rectangulares en x y en y con el rumbo del tramo; |v| es su módulo.'» → «rectangulares en $x$ y en $y$ con el rumbo del tramo; $|v|$ es su módulo.'»
- l. 82: «con x al este e y al norte» → «con $x$ al este e $y$ al norte»
- l. 90: «meaning: 'ángulo del tramo con el eje x, antihorario'» → «meaning: 'ángulo del tramo con el eje $x$, antihorario'»
- l. 104: «La posición crece linealmente con t, y el rumbo reparte v en» → «La posición crece linealmente con $t$, y el rumbo reparte $v$ en»
- l. 151: «donde a = dv/dt sería infinita.» → «donde $a = dv/dt$ sería infinita.»
- l. 169: «meaning: 'distancia avanzada sobre el tramo, con t desde su inicio'» → «meaning: 'distancia avanzada sobre el tramo, con $t$ desde su inicio'»
- l. 188: «y T suma al crucero» → «y $T$ suma al crucero»
- l. 197: «La gráfica marca $t_a$ y T;» → «La gráfica marca $t_a$ y $T$;»
- l. 234: «En un tramo recto el dron no gira: v y a van» → «En un tramo recto el dron no gira: $v$ y $a$ van»
- l. 240: «basta el perfil escalar s(t).» → «basta el perfil escalar $s(t)$.»
- l. 248: «recorre t con v y a dibujados a escala, y al frenar la flecha de a apunta contra el movimiento. Debajo, x(t), y(t), las componentes y los módulos de v y de a, y la distancia recorrida frente a |Δr|,» → «recorre $t$ con $v$ y $a$ dibujados a escala, y al frenar la flecha de $a$ apunta contra el movimiento. Debajo, $x(t)$, $y(t)$, las componentes y los módulos de $v$ y de $a$, y la distancia recorrida frente a $|\Delta r|$,»
- l. 256: «en los instantes en que a cambia de valor» → «en los instantes en que $a$ cambia de valor»
- l. 256: «donde x(t) sube en recta» → «donde $x(t)$ sube en recta»
- l. 292: «al arrancar, v y a comparten sentido» → «al arrancar, $v$ y $a$ comparten sentido»

**`src/content/topics/frenado-regenerativo.mdx`**

- l. 132: «una desaceleración en la que K baja;» → «una desaceleración en la que $K$ baja;»
- l. 144: «publica sus coeficientes A, B y C por auto» → «publica sus coeficientes $A$, $B$ y $C$ por auto»
- l. 194: «el motor frena cada vez menos: f(v), de FASTSim 2» → «el motor frena cada vez menos: $f(v)$, de FASTSim 2»
- l. 221: «la (6.3) sin f(v) no dejaría nada» → «la (6.3) sin $f(v)$ no dejaría nada»
- l. 278: «con grosor proporcional a |P|.» → «con grosor proporcional a $|P|$.»
- l. 283: «En las dos, la lectura t cuenta» → «En las dos, la lectura $t$ cuenta»
- l. 300: «El reparto es la (6.3) sin f(v), que tomo» → «El reparto es la (6.3) sin $f(v)$, que tomo»
- l. 306: «la calcula al instante con A, B, C, la rapidez real» → «la calcula al instante con $A$, $B$, $C$, la rapidez real»
- l. 312: «y los topes: f(v) usa valores» → «y los topes: $f(v)$ usa valores»

**`src/content/topics/gravedad-artificial.mdx`**

- l. 69: «la normal n del piso» → «la normal $n$ del piso»
- l. 88: «Una báscula mide n:» → «Una báscula mide $n$:»
- l. 103: «el piso empuja hacia arriba con n = m g, y eso» → «el piso empuja hacia arriba con $n = mg$, y eso»
- l. 103: «con la misma aceleración a = g: el piso no empuja y n = 0.» → «con la misma aceleración $a = g$: el piso no empuja y $n = 0$.»
- l. 121: «(esta N es el giro, no el newton)» → «(esta $N$ es el giro, no el newton)»
- l. 142: «doblar el giro divide r entre cuatro.» → «doblar el giro divide $r$ entre cuatro.»
- l. 151: «$a_c/g = \omega^2 r/g$ frente a r. A giro» → «$a_c/g = \omega^2 r/g$ frente a $r$. A giro»
- l. 151: «$\omega$ = 0,2094 rad/s y r = 223,6 m;» → «$\omega$ = 0,2094 rad/s y $r = 223{,}6$ m;»
- l. 167: «La cabeza está h más cerca» → «La cabeza está $h$ más cerca»
- l. 194: «\sqrt{g/r}$, frente a r, con los límites» → «\sqrt{g/r}$, frente a $r$, con los límites»
- l. 194: «su gradiente h/r con h = 1,80 m;» → «su gradiente $h/r$ con $h = 1{,}80$ m;»
- l. 220: «en el toro (r = 830 m)» → «en el toro ($r = 830$ m)»
- l. 234: «eje, radio r, sentido de giro» → «eje, radio $r$, sentido de giro»
- l. 234: «2 RPM piden r = 223,6 m y 1 RPM» → «2 RPM piden $r = 223{,}6$ m y 1 RPM»
- l. 234: «con la altura h por qué» → «con la altura $h$ por qué»
- l. 245: «en un período T;» → «en un período $T$;»
- l. 245: «el par (r, RPM) de su fuente» → «el par ($r$, RPM) de su fuente»
- l. 251: «leftOut="Con g = 9,81 m/s² y h = 1,80 m,» → «leftOut="Con $g = 9{,}81$ m/s² y $h = 1{,}80$ m,»
- l. 273: «El diseño decide ese par, no g.» → «El diseño decide ese par, no $g$.»

**`src/content/topics/llantas-f1.mdx`**

- l. 100: «meaning: 'fuerza normal; en clase se escribe N'» → «meaning: 'fuerza normal; en clase se escribe $N$'»
- l. 114: «duplicar n duplica el agarre.» → «duplicar $n$ duplica el agarre.»
- l. 123: «$\mu_k$ = 0,30 y n = m g = 98,1 N (g = 9,81 m/s²).» → «$\mu_k$ = 0,30 y $n = mg = 98{,}1$ N ($g = 9{,}81$ m/s²).»
- l. 195: «meaning: 'diferencia entre T y la temperatura óptima'» → «meaning: 'diferencia entre $T$ y la temperatura óptima'»
- l. 250: «meaning: 'fuerza; con D = 1, normalizada» → «meaning: 'fuerza; con $D = 1$, normalizada»
- l. 265: «/>, al crecer x el argumento» → «/>, al crecer $x$ el argumento»
- l. 265: «hay un pico, de altura D, que» → «hay un pico, de altura $D$, que»
- l. 265: «; B fija la pendiente inicial y E, la curvatura.» → «; $B$ fija la pendiente inicial y $E$, la curvatura.»
- l. 274: «caption="Ecuación (4.4) con B = 10, C = 1,9, D = 1 y E = 0,97:» → «caption="Ecuación (4.4) con $B = 10$, $C = 1{,}9$, $D = 1$ y $E = 0{,}97$:»
- l. 274: «llega al pico, y = 1, en $x» → «llega al pico, $y = 1$, en $x»
- l. 274: «baja a 0,91 en x = 1."» → «baja a 0,91 en $x = 1$."»
- l. 276: «la fuente solo da C = 1,3)» → «la fuente solo da $C = 1{,}3$)»
- l. 331: «duplicar N a <Equation» → «duplicar $N$ a <Equation»

**`src/content/topics/ruedas-reaccion.mdx`**

- l. 226: «que comparten el eje z. Sin torque» → «que comparten el eje $z$. Sin torque»
- l. 235: «respecto del eje z',» → «respecto del eje $z$',»
- l. 271: «sobre el eje z, tienen el mismo largo» → «sobre el eje $z$, tienen el mismo largo»
- l. 443: «el magnetopar tiene m perpendicular a B, su mejor caso» → «el magnetopar tiene $m$ perpendicular a $B$, su mejor caso»
- l. 461: «En 42, L se escribe H.» → «En 42, $L$ se escribe $H$.»
- l. 481: «cambia la I de un solo cuerpo» → «cambia la $I$ de un solo cuerpo»

**`src/content/topics/salto-personaje.mdx`**

- l. 50: «vertical con aceleración −g.'» → «vertical con aceleración $-g$.'»
- l. 53: «el salto es un MRU en x superpuesto a un MRUA en y.'» → «el salto es un MRU en $x$ superpuesto a un MRUA en $y$.'»
- l. 70: «y de ellos salen g e impulso.» → «y de ellos salen $g$ e impulso.»
- l. 74: «Con +y hacia arriba y origen en el despegue, el salto es un MRU en x y un MRUA en y <Cite» → «Con $+y$ hacia arriba y origen en el despegue, el salto es un MRU en $x$ y un MRUA en $y$ <Cite»
- l. 94: «corra lo que corra en x.» → «corra lo que corra en $x$.»
- l. 109: «con $v_0$ = 13,1 m/s y g = 9,81 m/s²;» → «con $v_0$ = 13,1 m/s y $g = 9{,}81$ m/s²;»
- l. 119: «Subir g acorta el tiempo» → «Subir $g$ acorta el tiempo»
- l. 130: «tardaría 0,84 s con g terrestre» → «tardaría 0,84 s con $g$ terrestre»
- l. 157: «elegir la altura del ápice h y el tiempo» → «elegir la altura del ápice $h$ y el tiempo»
- l. 157: «para alcanzarla, no g ni <Equation» → «para alcanzarla, no $g$ ni <Equation»
- l. 171: «la diapositiva da g negativa, como componente con +y arriba» → «la diapositiva da $g$ negativa, como componente con $+y$ arriba»
- l. 180: «Subida hasta el ápice ($t_h$, h) que pide» → «Subida hasta el ápice ($t_h$, $h$) que pide»
- l. 194: «<Equation inline latex="\vec v_0" /> y recorro t.» → «<Equation inline latex="\vec v_0" /> y recorro $t$.»
- l. 209: «y divide g entre dos cerca del ápice.» → «y divide $g$ entre dos cerca del ápice.»
- l. 223: «o el punto de la curva para recorrer t;» → «o el punto de la curva para recorrer $t$;»
- l. 250: «una tabla (x, y) precalculada» → «una tabla $(x, y)$ precalculada»
- l. 264: «En clase g es un dato» → «En clase $g$ es un dato»

**`src/lib/tables/topics/asistencia-gravitatoria.ts`**

- l. 46: «label: 'Δ|v| por cónicas'» → «label: '$\\Delta|v|$ por cónicas'»
- l. 47: «label: 'Δ|v| por los datos'» → «label: '$\\Delta|v|$ por los datos'»

**`src/lib/tables/topics/coeficiente-restitucion.ts`**

- l. 66: «`Los rangos de e de las normas» → «`Los rangos de $e$ de las normas»
- l. 78: «label: 'e calculado'» → «label: '$e$ calculado'»
- l. 130: «la regla combina el e de los dos materiales» → «la regla combina el $e$ de los dos materiales»

**`src/lib/tables/topics/control-haptico.ts`**

- l. 54: «label: `Resorte de ${SPRING_LABEL}, k x`» → «label: `Resorte de ${SPRING_LABEL}, $k x$`»
- l. 66: «recorrido de ${TRAVEL_LABEL}, k y $F_0$ ilustrativos» → «recorrido de ${TRAVEL_LABEL}, $k$ y $F_0$ ilustrativos»
- l. 79: «`F = ${IDEAL_SPRING.k} ·» → «`$F$ = ${IDEAL_SPRING.k} ·»
- l. 80: «`U = ½ · ${IDEAL_SPRING.k}» → «`$U$ = ½ · ${IDEAL_SPRING.k}»
- l. 85: «la propia fuerza elástica vale −U (Módulo 2» → «la propia fuerza elástica vale $-U$ (Módulo 2»
- l. 92: «label: 'Energía guardada, U = ½ k x²'» → «label: 'Energía guardada, $U = \\tfrac12 k x^2$'»
- l. 107: «fuente 5; k y recorrido de ${TRAVEL_LABEL} ilustrativos» → «fuente 5; $k$ y recorrido de ${TRAVEL_LABEL} ilustrativos»
- l. 121: «{ key: 'k', label: 'k', unit: 'N/m'» → «{ key: 'k', label: '$k$', unit: 'N/m'»
- l. 123: «label: 'F al fondo'» → «label: '$F$ al fondo'»
- l. 128: «recorrido supuesto de ${TRAVEL_LABEL}; k y $x_0$ ilustrativos» → «recorrido supuesto de ${TRAVEL_LABEL}; $k$ y $x_0$ ilustrativos»
- l. 144: «cómo leo cada uno como una fuerza F(x).» → «cómo leo cada uno como una fuerza $F(x)$.»
- l. 148: «label: 'Forma de F(x)'» → «label: 'Forma de $F(x)$'»
- l. 178: «lectura como F(x): del autor» → «lectura como $F(x)$: del autor»

**`src/lib/tables/topics/frenado-regenerativo.ts`**

- l. 32: «coeficientes objetivo A, B y C de la carga» → «coeficientes objetivo $A$, $B$ y $C$ de la carga»
- l. 38: «label: 'A', unit: 'lbf'» → «label: '$A$', unit: 'lbf'»
- l. 39: «label: 'A', unit: 'N'» → «label: '$A$', unit: 'N'»
- l. 40: «label: 'B', unit: 'lbf/mph'» → «label: '$B$', unit: 'lbf/mph'»
- l. 41: «label: 'B', unit: 'N·s/m'» → «label: '$B$', unit: 'N·s/m'»
- l. 42: «label: 'C', unit: 'lbf/mph²'» → «label: '$C$', unit: 'lbf/mph²'»
- l. 43: «label: 'C', unit: 'N·s²/m²'» → «label: '$C$', unit: 'N·s²/m²'»

**`src/lib/tables/topics/gravedad-artificial.ts`**

- l. 59: «name: 'Toro de Stanford: radio mayor R'» → «name: 'Toro de Stanford: radio mayor $R$'»
- l. 95: «caption: `Hábitats de los pasos 2 a 4 con g = ${» → «caption: `Hábitats de los pasos 2 a 4 con $g$ = ${»
- l. 95: «})} y h = ${formatNumber(PERSON_HEIGHT» → «})} y $h$ = ${formatNumber(PERSON_HEIGHT»
- l. 99: «label: 'Radio r'» → «label: 'Radio $r$'»
- l. 100: «label: 'Giro N'» → «label: 'Giro $N$'»
- l. 102: «label: 'Rapidez del piso v'» → «label: 'Rapidez del piso $v$'»
- l. 103: «label: 'Período T'» → «label: 'Período $T$'»

**`src/lib/tables/topics/ruedas-reaccion.ts`**

- l. 197: «{ key: 't', label: 't', unit: 's'» → «{ key: 't', label: '$t$', unit: 's'»

## 4. E6 · lo que quedaba recto (solo marcado)

Arreglos de la revisión final de la fase (17 de noviembre). Las líneas son las del árbol de E6.

**Figuras (rótulos SVG)**

- Tema 1, `DroneFigure.tsx:98`, la flecha de la velocidad: «vec v» → «$\vec v$».
- Tema 2, `JumpFigure.tsx:118`, junto al ápice: «h = 4,00 m», «t_h = 0,53 s» → «$h$ = 4,00 m», «$t_h$ = 0,53 s» (y los
  del otro salto).
- Tema 2, `JumpOverlay.tsx:189,194`: «vec v», «vec v_0» → «$\vec v$», «$\vec v_0$».
- Tema 3, `HabitatDiagram.astro:127`: «2 RPM → r = 223,6 m», «1 RPM → r = 894,6 m» → «2 RPM → $r$ = 223,6 m», «1 RPM →
  $r$ = 894,6 m».
- Tema 4, `TyreLab.tsx:71,97`, los cursores de las dos gráficas: «T = 120 °C» → «$T$ = 120 °C»; «F_z = 4 000 N» → «$F_z$
  = 4 000 N».
- Tema 5, `TriggerLever.tsx:179`, la marca del preajuste «Resorte tardío»: «x_0» → «$x_0$».
- Tema 6, `RegenCanvas.tsx:111`, el cursor de la gráfica de energías: «t = 376,00 s» → «$t$ = 376,00 s».
- Tema 7, `BounceFigure.tsx:99`: «T = 4,92 s» → «$T$ = 4,92 s».
- Tema 7, `CollisionDiagram.tsx:113-114,232`: «m_1 = 2 kg», «m_2 = 1 kg» → «$m_1$ = 2 kg», «$m_2$ = 1 kg»; «K = 9 J»,
  «K′ = 6 J» → «$K$ = 9 J», «$K$′ = 6 J».
- Tema 7, `CollisionMode.tsx:243`, en el lienzo de «Choque»: «v_1 = 4,00 m/s», «v_2′ = …» → «$v_1$ = 4,00 m/s»,
  «$v_2$′ = …».
- Tema 7, `BouncePlots.tsx:127`, eje de la gráfica de energía: «Energía (E/E_0)» → «Energía ($E/E_0$)».
- Tema 8, `WheelPanelB.astro:305`: «m B ≈ 1,2·10⁻⁵ N·m, unas 50 veces la perturbación» → «$m B$ ≈ 1,2·10⁻⁵ N·m, unas
  50 veces la perturbación».
- Tema 8, `ExchangeDiagram.tsx:119,195`: «(z apunta hacia ti)» → «($z$ apunta hacia ti)»; el eje «z» (antes en cursiva
  a mano) → «$z$».

**Texto de los laboratorios (HTML)**

- Tema 1, `DroneProfilesMarker.tsx:131`, la lectura del perfil: «t» (en cursiva a mano) → «$t$».
- Tema 6, `EnergyBalanceChart.tsx:167`: «Las lecturas suman desde t = 0 hasta el cursor» → «… desde $t = 0$ hasta el
  cursor».
- Tema 7, `BounceLab.tsx:96`: «e > 1: gana energía» → «$e > 1$: gana energía».
- Tema 7, `BouncePlots.tsx:144`: «deja una fracción e² de la energía: pierde 1 − e² por bote» → «deja una fracción $e^2$
  de la energía: pierde $1 - e^2$ por bote».
- Tema 9, `FlybyNotes.tsx:54-58`, la leyenda: «v antes = 9,59 km/s», «v después = 19,53 km/s» → «$v$ antes = 9,59 km/s»,
  «$v$ después = 19,53 km/s».

**Dicho por el lector de pantalla**

- Tema 9, `FlybyFigure.tsx:398-401`, el nombre del triángulo de velocidades (Neptuno): volvía a decir «V_p» y «v_
  infinito»; ahora dice «V sub p», «v sub infinito», «vector V sub p», «delta», como antes de E3.

E4 propuso además frases más cortas («menos texto», `.superpowers/sdd/2026-10-31-fases-b-c-d/E4-proposals.md`, copia en
`docs/superpowers/review/2026-11-17-E4-propuestas-menos-texto.md`): no están aplicadas; esperan tu decisión.
