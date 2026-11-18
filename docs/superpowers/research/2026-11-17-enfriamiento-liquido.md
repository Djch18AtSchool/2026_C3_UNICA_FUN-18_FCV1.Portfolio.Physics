# Tema 13 — Enfriamiento líquido de un centro de datos: continuidad, caudal y Bernoulli. Investigación de fuentes

Fecha de acceso de todas las fuentes: **2026-11-17**. Los valores se copiaron de la fuente abierta (PDF descargado, código en un tag o commit fijo, o página leída). Lo marcado «(cálculo propio)» lo calculé con los scripts de `research/scripts-enfriamiento/`. Lo marcado **NO CONFIRMADO** no se pudo abrir o verificar. Las citas textuales van en el idioma original; los literales de código se copian tal cual (con punto decimal).

Rutas (scratchpad de la sesión): descargas en `research/data/enfriamiento-liquido/` (`ocp/`, `mbl/`, `epanet/`, `papers/`, `schneider/`, `ashrae/`, `vendor2/`, `fluid/`, `modulo6/`), que se trataron como datos no confiables: no se ejecutó nada de ellas. Scripts propios en `research/scripts-enfriamiento/` (`pg_props.py`, `hydraulics.py`, `check_rules.py`, `profile.py`, `manifold.py`, `preset44.py`, `summarize_profile.py`, `tok2.py`), salidas en `research/out-enfriamiento/` (`perfil_U_srv24.csv`, `perfil_Z_srv24.csv`, `perfil_U_srv1.csv`, `reparto_U_ref.csv`). Todo el Python corrió con `python3 -I`; como `-I` desactiva el *site* del usuario, `manifold.py` añade a mano la ruta de numpy (`~/.local/lib/python3.12/site-packages`). Sin scipy.

---

## 1. Recomendación

- **Caso de uso principal:** el **dimensionado hidráulico del circuito TCS (*technology cooling system*) de un rack de IA de clase NVIDIA GB200 NVL72**, alimentado por un CDU de la especificación abierta **Google Project Deschutes (OCP)**, calculado con un **modelo de red de flujo 1D**. El código abierto y citable es la **Modelica Buildings Library v14.0.0** (LBNL, licencia tipo BSD), paquete `Buildings.Fluid.DataCenters`. Desde 2025–2026 trae modelos de rack con placa fría alimentados con datos de OCP (`OCP_1kW_OAM_PG25`) y un registro del CDU `GoogleProjectDeschutes_2MW`.
  - El modelo calcula el caudal de diseño a partir de la potencia, la caída de presión de cada elemento con una ley de potencia Δp ∝ ṁⁿ (n = 2 turbulento, n = 1 laminar; n = 1,85 ajustado a datos de OCP), la fricción de tuberías con Darcy–Weisbach y la carga que debe dar la bomba como **suma de las caídas en serie**. El CDU regula la velocidad de la bomba para mantener un **Δp fijo** entre impulsión y retorno, que es también el control por defecto de Deschutes (§2, §3).
  - **Contraste industrial con datos medidos:** NVIDIA y la Universidad de Texas en Arlington validaron con un modelo de red de flujo (software comercial MacroFlow) el reparto de caudal entre los puertos de un manifold de rack. Midieron caudales por puerto y la curva Δp–Q, y advierten que el Cv del fabricante del conector produjo una «significant discrepancy» (Shahi et al., 2023; manuscrito abierto en NSF PAR).
  - **Contraste de código abierto genérico:** EPANET (US EPA / OWA, MIT) resuelve exactamente «continuidad en cada nodo + pérdida en cada tramo». Su `hydcoeffs.c` tiene f = 64/Re en laminar, Swamee–Jain en turbulento y K·v²/2g en accesorios (§2).
- **Por qué este caso cumple la banda Excelente.** El concepto de la consigna, continuidad + Bernoulli con pérdidas para que «llegue suficiente caudal a cada servidor», es literalmente lo que hacen los tres programas. Además hay datos abiertos de cada pieza del circuito real:
  - CDU Deschutes: 500 GPM, 80–90 psi disponibles, curvas de bomba con su ecuación.
  - Manifold de rack OCP MGX (NVIDIA): tubo de 35 × 60 mm, 44 puertos a 44,45 mm.
  - Conector UQD04 (OCP v2.0.0): caudal nominal, Cv, diámetros.
  - Fluido PG25 (Melinder, en el código de LBNL).
  - Un circuito completo de referencia de GB200 (Schneider RD109, analizado por GF con desglose de pérdidas).

  Con esos parámetros, **mi cálculo con continuidad + Darcy–Weisbach + K reproduce el desglose publicado por GF con un 7,5 % de diferencia** (1,83 bar frente a 1,98 bar; §7). Esa coincidencia sirve de validación propia.
- **Visualización sugerida** (recurso VISUALIZACIÓN DE DATOS, §8):
  - **(a)** v(x) y p(x) a lo largo del recorrido CDU → tubería principal → manguera de rack → manifold → manguera 3/8″ → UQD → placa fría → retorno, con la franja de secciones dibujada debajo. Se superponen la p de Bernoulli ideal y la p real con pérdidas.
  - **(b)** Un panel v frente a A, con las hipérbolas Q = A v de los tres caudales del circuito.
  - **(c)** El caudal que recibe cada servidor, con retorno directo y retorno invertido, contrastado con los caudales por puerto de Shahi et al. (2023), que son datos reales: modelo y medición.
- **Decisiones para Dylan** (detalle en §10):
  - preset de referencia de 24 servidores (valida contra GF) o de 44 puertos (MGX; UQD04 dentro de su caudal nominal);
  - y o z para la altura;
  - si se muestra el término ρgy del manifold vertical;
  - si el laboratorio incluye el punto de operación con la curva de bomba de Deschutes.

---

## 2. Casos de uso candidatos (ordenados)

| # | Caso | Qué calcula el software | Ecuación explícita (en código o especificación) | Por qué la física supera a la alternativa | Qué cuesta |
|---|---|---|---|---|---|
| 1 | **Modelica Buildings Library v14.0.0, `Buildings.Fluid.DataCenters`** (LBNL; BSD) con datos de OCP (placa fría OAM 1 kW con PG25, CDU Google Project Deschutes) | Caudal del rack a partir de la potencia y ΔT; caída de presión del rack y de las tuberías; carga de la bomba del CDU como suma en serie; control de la bomba por Δp; temperatura de carcasa con R(V̇) | `k = m_flow_nominal / dp_nominal^(1/n)` (Δp ∝ ṁⁿ; `n=2` turbulento, `n=1` laminar; `n = 1.85` para el rack); `dpStraightPipe_nominal = …WallFriction.Detailed.pressureLoss_m_flow(…)` (Darcy); `dpPumpExt_nominal = datRac.dp_nominal + valRac.dp_nominal + pipRacIn.dp_nominal + …`; `mRac_flow_nominal = PRac/(ΔT)/cp` | Frente a una **regla fija** (L/min por kW): la regla da el caudal, pero no la presión que debe dar la bomba ni cómo se reparte. El modelo suma cada Δp con su ley física y dice cuánta Δp debe sostener el CDU. Frente a **sobredimensionar la bomba**: se ve cuánto caudal y potencia se desperdician | Propiedades del fluido «constantes»: la propia librería advierte hasta 250 % de error en viscosidad en 10 °C. Accesorios con un factor genérico `fac = 2`. `dp_nominal` y n salen de una sola publicación (OCP 2023). El rack es un único bloque: no reparte entre servidores |
| 2 | **Red de flujo (FNM) de manifolds de rack en NVIDIA** (Shahi et al., IPACK 2023, NVIDIA + UT Arlington; software comercial MacroFlow 4.0) | Caudal por puerto del manifold y Δp del lazo, con curvas Δp–Q de cada componente (tubos, tes, codos, QD caracterizados en casa); validado contra medición | Conservación en nodos + curva Δp(Q) por componente (el artículo no publica las ecuaciones de MacroFlow) | Predice el reparto antes de construir. Midieron 16,4–50,4 L/min y 1,8–10,5 psi, con variación de 0,2–0,5 L/min entre puertos. Con el Cv del fabricante, el modelo fallaba | Software cerrado. Hace falta medir los QD («vendor specifications can be error prone»). CFD con 6–30 % de error |
| 3 | **EPANET 2.3.5** (OWA, MIT; motor de US EPA) | Caudales y presiones en una red cualquiera (algoritmo de gradiente global de Todini) | `r = 16.0 * PI * s * r;` (laminar, Hagen–Poiseuille, Re ≤ 2000); Swamee–Jain `f = 1.0 / (y3*y3)` para Re ≥ 4000; interpolación cúbica entre medias; `r1 = f * r + ml;` (fricción + menores); `Km = 0.02517 * Km / D⁴` (K de base v²/2g a base Q²) | Las mismas ecuaciones que pide el tema, en código pequeño y legible. Admite otro fluido con `VISCOSITY` y `SPECIFIC GRAVITY` | Pensado para acueductos. No trae curvas de placas frías ni QD; hay que darlas como pérdidas equivalentes |
| 4 | **GF Piping Systems + Schneider Electric EcoStruxure Reference Design 109 (GB200 NVL72)** (libro blanco de GF, 2026; Sinetz + ANSYS CFD) | Pérdidas del circuito completo de 8 racks de 132 kW con componentes nombrados; reparto en un manifold de 44 ramas; velocidades máximas | Software cerrado; publican los resultados (desglose de Δp por componente, 1,98 bar en total) | Muestra que placas frías + conectores son > 85 % de la pérdida y que, con el manifold bien dimensionado, las placas frías igualan el reparto (< 5 %) | Documento de un fabricante que promueve tubería de polímero: tomar la comparación polímero/acero como afirmación del vendedor |
| 5 | GT-SUITE (modelo del CDU Deschutes), Boyd Smart CFD (citado en OCP OAI) | — | — | — | **NO CONFIRMADO**: solo blogs de vendedor o una mención; no abrí documentación técnica |

### 1) Modelica Buildings Library v14.0.0 — recomendado. CONFIRMADO (código leído en el tag)

- Repositorio `lbl-srg/modelica-buildings`, tag `v14.0.0`. El objeto de tag `d492c6979eb0a49928243e9382c21eaa730304cb` apunta al commit `ad48324b74e9751e2e49dac5fe3c4dcb546755a2` (tagger 2026-10-05). Licencia en `Buildings/legal.html`: copyright «Modelica Association, … The Regents of the University of California, through Lawrence Berkeley National Laboratory», con cláusulas de redistribución de tipo BSD de 3 cláusulas.
- **Rack con placa fría**: `Buildings/Fluid/DataCenters/Racks/Liquid/ColdPlateR_P.mo`.
  - l. 64–69: `Fluid.FixedResistances.PressureDrop preDro(… final m_flow_nominal=dat.m_flow_nominal, final dp_nominal=dat.dp_nominal, final n=dat.n) "Flow resistance"`.
  - Documentación, l. 122: «m_flow ⁄ m_flow_nominal = (dp ⁄ dp_nominal)^m».
  - l. 130–133: «Based on a data fit using the data in Chen et al. (2023), the default value is m=1.85. The model assumes a default pressure drop dp_nominal of dp_nominal=50 kPa, which is the pressure drop of the OCP specified cold plate with a 8x1 loop at 10 l/min flow rate with 25% PGW.»
  - URL: https://github.com/lbl-srg/modelica-buildings/blob/v14.0.0/Buildings/Fluid/DataCenters/Racks/Liquid/ColdPlateR_P.mo#L64-L69
- `…/Racks/Liquid/Data/Generic.mo` l. 7: `dp_nominal(displayUnit="Pa") = 50000`; l. 11: `parameter Real n(min=1, max=2) = 1.85 "Flow exponent, n=1 for laminar, n=2 for turbulent"`.
- `…/Racks/Liquid/Data/OCP_1kW_OAM_PG25.mo` l. 5–8: `V_flow={0.4,…,2.4}/60/1000`, `R={0.0389,…,0.0197}` (resistencia térmica caso-entrada). Doc l. 14–16: «based on the Open Compute Project (OCP) report by Chen et al. (2023). The data is based on Figure 7, which is for a single cold plate with PG25». Primera implementación: 16 de diciembre de 2025.
- **Ley de pérdida** `Buildings/Fluid/FixedResistances/PressureDrop.mo`.
  - l. 7–8: `parameter Real n(min=1, max=2) = 2 "Flow exponent, n=1 for laminar, n=2 for turbulent"`.
  - l. 17–19: `k = … m_flow_nominal_pos / dp_nominal_pos^(1/n) … "Flow coefficient, k=m_flow/dp^(1/n)"`.
- **Tubería con Darcy** `Buildings/Fluid/FixedResistances/HydraulicDiameter.mo`.
  - l. 14: `ReC(min=0)=4000 "Reynolds number where transition to turbulence starts"`.
  - l. 22: `roughness(min=0) = 2.5e-5`.
  - l. 25: `fac(min=1) = 2 "Factor to take into account resistance of bends etc., fac=dp_nominal/dpStraightPipe_nominal"`.
  - l. 32–34: `dpStraightPipe_nominal = Modelica.Fluid.Pipes.BaseClasses.WallFriction.Detailed.pressureLoss_m_flow(…)`.
  - El factor 2 para «bends etc.» es una **regla empírica dentro del modelo físico**: sirve para el «qué cuesta».
- **Ejemplo de sistema** `Buildings/Applications/DataCenters/LiquidCooled/Examples/ChillerWSE.mo`.
  - l. 14–20: rack con PG al 25 % en volumen (`phi=0.25`).
  - l. 22: `PRac = 1E6`.
  - l. 27: `dTRac_nominal = -5` (K).
  - l. 35: suministro a 45 °C.
  - l. 52–54: `mRac_flow_nominal=PRac/(TRacRet_nominal - TRacSup_nominal)/MediumRac.cp_const`, es decir, P = ṁ c ΔT usado para pasar de kW a caudal.
  - l. 103–104: `dpPumpExt_nominal=datRac.dp_nominal + valRac.dp_nominal + pipRacIn.dp_nominal + pipRacOut.dp_nominal` (pérdidas en serie que suma la bomba).
  - l. 168: `dpSet(k=datCDU.dpPumpExt_nominal)`.
  - l. 654–661: `Pipe = Fluid.FixedResistances.HydraulicDiameter(… v_nominal=5, roughness=0.015E-3, length=20, fac=2)`.
- **CDU controlado por Δp**: `Buildings/Fluid/DataCenters/CDUs/BaseClasses/PartialCDU.mo` l. 105 (entrada `dpSet`), l. 128 (`Controls.OBC.CDL.Reals.PID conPum`), l. 297 `connect(dpSet, conPum.u_s)`, l. 299 `connect(senRelPre.p_rel, conPum.u_m)`, l. 307 `connect(conPum.y, pum.y)`.
- **CDU Deschutes**: `…/CDUs/LiquidToLiquid/Data/GoogleProjectDeschutes_2MW.mo` l. 5–14: `Q_flow_nominal=2E6`, `TApp_nominal=3`, `phiGlyRac=0.25`, `dpPumpExt_nominal=827000`.
  - Su referencia es «OCP 2026. Open Compute Project meeting, CDU Information WP. March 24, 2026.», un documento que **no** encontré abierto.
  - 827 000 Pa son 120 psi, lo que no coincide con los 80–90 psi de la especificación. **No usar la curva de este registro**; usar las ecuaciones de la Fig. 5.1.1 de la especificación (§5).
- **Fluido PG–agua** `Buildings/Media/Antifreeze/Functions/PropyleneGlycolWater.mo`.
  - Polinomios de Melinder (2010), l. 366–378 (`X_a_ref=0.307031`, `T_ref` = 32,7083 °C, coeficientes `a_d`, `a_eta`, `a_cp`); l. 60 `eta :=1e-3*exp(polynomialProperty(…))`.
  - Doc del medio (`Buildings/Media/Antifreeze/PropyleneGlycolWater.mo` l. 146–151): «The maximum errors are 0.8 % for mass density, 1.5 % for specific heat capacity, 3.2 % for thermal conductivity and 250 % for dynamic viscosity» (en un rango de 10 °C con propiedades constantes).
  - l. 179–180: «this medium package should not be used if the simulation relies on the dynamic viscosity».
- **Qué falta para el tema:** el modelo trata el rack como «one large rack», así que el reparto entre servidores hay que añadirlo. Eso es justo el paso 4 y el laboratorio.

### 2) FNM de manifolds en NVIDIA — contraste con medición. CONFIRMADO (manuscritos aceptados abiertos)

- Shahi, P.; Heydari, A.; Bansode, P.; Siddharth, A.; Chowdhury, U.; Miyamura, H.; Modi, H.; Agonafer, D.; Tradat, M.; Rodriguez, J. «Experimental and CFD Analysis of a Rack Manifold for High Power Density Liquid-Cooled Rack», ASME InterPACK 2023, IPACK2023-114351, DOI 10.1115/IPACK2023-114351. PDF: https://par.nsf.gov/servlets/purl/10537453 (sha256 a0eff7ba…).
  - «The flow varied from 16.4 lpm to 50.4 lpm and the pressure drop recorded across the rack manifolds were 1.8 psi to 10.5 psi, respectively.»
  - «the manifold was able to supply almost the same flow rates through each port with a variation of 0.2 to 0.5 lpm».
  - «Commercial 1D flow network modeling software, MacroFlow 4.0[16], is used»; «A CoolIT CHx80 CDU was used».
  - «The characteristics of a manifold component in terms of their flow and thermal resistances are not readily available in handbooks and vendor specifications can be error prone.»
  - «There is a significant discrepancy in the simulation results when Cv data provided by the QD manufacturer is used.»
  - «The FNM predicts the ideal results with decreasing flow rates from bottom to top while the experimental data shows an erratic variation in the flow rates across each port. The variation was within the acceptable measurement error of 10%.»
  - «An error margin in a range of 6-30% was obtained between experimental and CFD results.»
  - Tabla 1 (PG25 a 25 °C, CFD): 1020 kg/m³, 3850 J/(kg·K), 0.002 Pa·s, 0.49 W/(m·K).
  - Figura 5 (FNM, 49,5 L/min, 6 puertos, entrada y salida del mismo lado): Q = 8.9742, 8.4878, 8.1774, 8.0043, 7.9287, 7.9098 lit/min, leídos en la figura.
- Shahi, P. et al. «Methodology to Characterize Row Manifolds for High Power Direct to Chip Liquid Cooling Data Centers», IPACK2023-112084. PDF: https://par.nsf.gov/servlets/purl/10537457 (sha256 fc9e153c…).
  - «When the system flow rate was around 166.2 lpm the flow rate going to each individual port was around 41.2 lpm, where the maximum difference between the two ports' flow rate was 0.66 lpm».
  - Pérdida de la fila: 4,5 psi a 166 L/min; con FNM, 3.96 psi.
  - «the solution of conservation equations over the network enables efficient prediction of the flow rates, pressures, and temperatures in a complete liquid-cooling system».
  - Su CDU: «450 kW, which can provide a maximum flow rate of 500 lpm at an external pressure drop of 3.4 bar».

### 3) EPANET 2.3.5 — contraste de código abierto. CONFIRMADO

- `OpenWaterAnalytics/EPANET`, tag `v2.3.5` (commit `444725fbf16ab28b0470ef0ed281dc4849d49583`, publicado el 2026-02-20). Licencia MIT.
- `src/hydsolver.c` l. 6–7: «computes flows and pressures throughout a pipe network using Todini's Global Gradient Algorithm».
- `src/hydcoeffs.c` (sha256 08fd29e8…):
  - l. 133–134, Darcy: `link->R = L / 2.0 / 32.2 / d / SQR(PI * SQR(d) / 4.0);`, es decir, h = f (L/D) v²/2g en unidades inglesas.
  - l. 713–718: «// ... use Hagen-Poiseuille formula for laminar flow (Re <= 2000)» `r = 16.0 * PI * s * r;`.
  - l. 721–727: `f = frictionFactor(q, e, s, &dfdq); r1 = f * r + ml;`.
  - l. 756–765: «For Re >= 4000 use Swamee & Jain approximation of the Colebrook-White Formula … `f = 1.0 / (y3*y3);`».
  - l. 767–781: «interpolating polynomials developed by E. Dunlop for transition flow from 2000 < Re < 4000».
  - URL: https://github.com/OpenWaterAnalytics/EPANET/blob/v2.3.5/src/hydcoeffs.c#L692-L781
- `src/input1.c` l. 597–598: «// Convert minor loss coeff. from V^2/2g basis to Q^2 basis» `link->Km = 0.02517 * link->Km / SQR(link->Diam) / SQR(link->Diam);`. 0,02517 = 8/(g π²) con g = 32,2 ft/s² (cálculo propio).
- Manual de EPANET 2.2 (`USEPA/EPANET2.2`, commit `598ee6cd214de07a0d62e7dafc1bdbf09173645a`, `User_Manual/docs/3_network_model.rst`):
  - l. 239–248: «The Hagen–Poiseuille formula is used for laminar flow (Re < 2,000).» / «The Swamee and Jain approximation to the Colebrook-White equation is used for fully turbulent flow (Re > 4,000).» / «A cubic interpolation from the Moody Diagram is used for transitional flow».
  - Tabla de rugosidad (l. 282–303): «Plastic … 0.005», «Steel … 0.15» (ε en ft × 10⁻³).
  - Tabla de K (l. 333–362): «Standard tee - flow through branch 1.8», «Short-radius elbow 0.9», «Gate valve, fully open 0.2».
  - l. 836–846: «solving simultaneously the conservation of flow equation for each junction and the head loss relationship across each link».
  - `input_keywords.rst` l. 643–651: `VISCOSITY` «relative to that of water at 20 deg. C» y `SPECIFIC GRAVITY`.

### 4) GF / Schneider RD109 — circuito completo de referencia. CONFIRMADO (libro blanco descargado)

- Freda, C.; Kugele, T. «White paper: Hydraulic design principles for efficient direct liquid cooling infrastructure», GF Piping Systems (Georg Fischer). PDF creado el 14 de agosto de 2026; las figuras llevan fecha del 3 de marzo de 2026. https://www.gfps.com/content/dam/gfps/com/whitepapers/en/gfps-whitepaper-hydraulic-design-principles-en.pdf (sha256 86ff1822…).
- **Caso base:** «Schneider Electric's EcoStruxure Reference Design 109 … liquid-cooled racks up to a rack density of 132 kW». Cada CDU sirve 8 racks y «requires a total volumetric flow rate of approximately 23 L/s», con PG25 a 40 °C. Entrada a 4 bar. Pérdida «1.98 bar (28.72 psi) for the polymer configuration and 2.31 bar (33.50 psi) for the steel configuration». Herramientas: «Sinetz software from Sigma Ingenieurgesellschaft mbH and ANSYS CFD software».
- **Tabla 1 (componentes)**:
  - «Supply and return pipeline 70 m … PROGEF PP-H d160/SDR11 | SCH10 stainless … 5"»;
  - «Hose big … Parker E-Z FORM™ 2" cooling hose»;
  - «Danfoss Hansen FD 83 2"»;
  - «Manifold 32 à 1.8 m … LiquidCore d63 PVDF with 24 outlets»;
  - «Danfoss Hansen Universal Quick Disconnect (UQD04)»;
  - «Datacenter Cooling hose 3/8" inner diameter = 9.5 mm»;
  - «Cold plate 16 x 24 | 1.2 bar (17.40 psi) pressure drop for all cold plates and internal piping».
- **Figura 2 (desglose, bar)**: total 1,98; placas frías 1,20; QD pequeños 0,51; mangueras 3/8″ 0,05; QD grande 0,01; accesorios 0,09; manifolds 0,03; tuberías 0,07; válvulas mariposa 0,02. La suma da 1,98 ✓ (cálculo propio).
- **Citas**:
  - «Due to their relatively small internal flow passages, a local flow constriction is introduced that increases fluid velocity and turbulence, leading to a significant pressure drop across the connection.»
  - «Together, cold plates and couplings account for over 85% of the entire pressure loss».
  - «the cold plates act as the dominant hydraulic equalizers, resulting in fluctuations of less than 5%, regardless of the manifold design».
  - «In unbalanced systems, the overall cooling need is determined by the branch with the lowest available volume flow. To compensate for a reduced volume flow, the overall volume flow needs to be increased, leading to other racks being oversupplied. Ultimately, pumping energy demand rises without any thermal performance improvements».
  - «since the racks have a significantly higher pressure loss than the distribution line, comparing the order of bar to mbar, the effect of the hydraulic location can usually be neglected».
  - «DLC systems operate at lower fluid velocities, ranging from 1.5–2.1 m/s … the maximum velocity in the pipework was 1.7 m/s».
  - Criterio de diseño de GF: manifold con pérdida «less than 50 mbar (0.73 psi)».
  - Figura 5: «Circular d63 manifolds with 44 branches are used. The volume flow is defined as 170 l/min.»
- **Schneider Electric, «EcoStruxure™ Reference Design 109 … Liquid-cooled AI Clusters (NVIDIA GB200)»** (RD109DSR13-GB200.pdf, creado el 14 de marzo de 2026, sha256 5253c862…). URL: https://download.schneider-electric.com/files?p_enDocType=Other+technical+guide&p_File_Name=RD109DSR13-GB200.pdf&p_Doc_Ref=RD109DSR0_EN
  - «AI racks up to 132 kW/rack», «forty-eight 132 kW liquid cooled IT racks, modeled after NVIDIA GB200 NVL72».
  - «TCS loop supply temperature 104 °F» y «TCS loop return temperature 129 °F».
  - CDU «Motivair» L2L N+1.

### 5) Otros (no recomendados como caso, útiles como dato)

- **NVIDIA DGX GB200 User Guide** (https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html, CONFIRMADO): «The compute trays are cooled by liquid that runs up and down the rack through manifolds.»; «The rack power consumption is approximately 120kW.»; «18x 1RU compute trays, each with 2 Grace CPUs and 4 Blackwell GPUs»; «9x 1RU NVLink switch trays». **No publica caudal ni temperatura**.
- Blog de NVIDIA (M. Hamilton, 22 de abril de 2025): «300x more water efficiency», «25x more energy efficiency». CONFIRMADO, pero es marketing; no usar como dato físico.
- Caudales de GB200 en blogs de terceros (80–195 L/min por rack, contradictorios): **NO usar**.

---

## 3. Fuentes

| # | Título | Autores | Año | Editor | URL | Estado |
|---|---|---|---|---|---|---|
| 1 | Módulo 6: Mecánica de fluidos (bundle `/assets/index-BWO8LFcd.js`, sha256 23d4cc58…) | Curso FUN-18 | 2026 | Universidad CENFOTEC | https://fun18-modulo6.netlify.app/ | CONFIRMADO (leído como texto, sin ejecutar) |
| 2 | Project Deschutes: Data Center Facilities, Specification 1.0.0 (efectiva el 26 de febrero de 2026; título del PDF «Externally Shared DRAFT- OCP-Specification-Deschutes v 1.0») | Google (J. Padilla, M. Iyengar, V. Soundararajan, G. Soni, S. McCauley, T. Fitzgerald, S. Sivasankar) | 2026 | Open Compute Project | https://www.opencompute.org/documents/ocp-specification-deschutes-v1-0-pdf (sha256 5dc849bf…) | CONFIRMADO |
| 3 | Universal Quick Disconnect (UQD) Design Specification v2.0.0 (efectiva el 22 de septiembre de 2026) | v1: M. Sprenger, J. Johnson, B. Henkel (Intel); v2: T. Gaskill, E. Langer (CPC), P. Artman (AMD) | 2026 | OCP | https://www.opencompute.org/wp-content/uploads/2026/10/OCP-Design-Spec_UQD_v2.0.0.pdf (sha256 6971bc5d…) | CONFIRMADO |
| 4 | OCP OAI System Liquid Cooling Guidelines (actualización del 3 de marzo de 2023) | C. Chen (Meta), D. Trieu (Microsoft), T. Shah (Intel) et al. | 2023 | OCP | https://www.opencompute.org/documents/oai-system-liquid-cooling-guidelines-in-ocp-template-mar-3-2023-update-pdf (sha256 531d457d…) | CONFIRMADO |
| 5 | MGX Accelerated Computing Rack and Trays Specification, Rev. 1.0 | NVIDIA | 2024 (efectiva el 29 de agosto; pie del 10 de octubre) | OCP | https://www.opencompute.org/documents/mgx-accelerated-computing-rack-and-trays-specification-101024-pdf (sha256 c4dfc730…) | CONFIRMADO (cotas leídas en los planos renderizados) |
| 6 | Single-Phase Direct-to-Chip Cold Plate Test Specification 1.0.0 (efectiva el 3 de septiembre de 2026) | B. Sutton (CoolIT) et al. | 2026 | OCP | https://www.opencompute.org/wp-content/uploads/2026/10/OCP-Cold-Plate-Test-Specification-V1.0.0.pdf (sha256 2e32daaf…) | CONFIRMADO |
| 7 | Modelica Buildings Library v14.0.0 | LBNL / Modelica Association / IBPSA (M. Wetter et al.) | 2026 | GitHub `lbl-srg` | https://github.com/lbl-srg/modelica-buildings/tree/v14.0.0 | CONFIRMADO (código) |
| 8 | Properties of Secondary Working Fluids for Indirect Systems | Å. Melinder | 2010 | IIR, París | (vía fuente 7) | Correlaciones CONFIRMADAS en el código; libro NO CONFIRMADO (no abierto) |
| 9 | EPANET 2.3.5 (código) y EPANET 2.2 User Manual | OWA / US EPA (L. Rossman et al.) | 2026 / 2025 | GitHub | https://github.com/OpenWaterAnalytics/EPANET/tree/v2.3.5 ; https://github.com/USEPA/EPANET2.2 | CONFIRMADO |
| 10 | Experimental and CFD Analysis of a Rack Manifold for High Power Density Liquid-Cooled Rack | P. Shahi, A. Heydari et al. (NVIDIA, UT Arlington) | 2023 | ASME InterPACK, IPACK2023-114351 | https://par.nsf.gov/servlets/purl/10537453 | CONFIRMADO (manuscrito aceptado) |
| 11 | Methodology to Characterize Row Manifolds for High Power Direct to Chip Liquid Cooling Data Centers | P. Shahi, A. Heydari et al. | 2023 | ASME InterPACK, IPACK2023-112084 | https://par.nsf.gov/servlets/purl/10537457 | CONFIRMADO |
| 12 | Hydraulic design principles for efficient direct liquid cooling infrastructure | C. Freda, T. Kugele | 2026 | GF Piping Systems | URL en §2.4 | CONFIRMADO (documento de fabricante) |
| 13 | EcoStruxure Reference Design 109 (NVIDIA GB200) | Schneider Electric | 2026 | Schneider Electric | URL en §2.4 | CONFIRMADO |
| 14 | Water-Cooled Servers: Common Designs, Components, and Processes | ASHRAE TC 9.9 | 2019 (con fe de erratas del 10/10/2019) | ASHRAE | https://resourcecenter.ashrae.org/File%20Library/Technical%20Resources/Bookstore/WhitePaper_TC099-WaterCooledServers.pdf (sha256 d8c92909…) | CONFIRMADO |
| 15 | UQD/UQDB Catalog | Amphenol Industrial | 2025 | Amphenol | https://www.amphenol.co.jp/military/catalog/UQD_UQDB.pdf (sha256 7b879948…) | CONFIRMADO |
| 16 | UQD SpecSheet (SW1020) | Specialty Manufacturing | 2026 | — | https://www.specialtymfg.com/wp-content/uploads/UQD-SpecSheet-Website.pdf | CONFIRMADO (dato de contraste) |
| 17 | Thermophysical properties of water (isobara 0,3 MPa, 20–50 °C) | E. W. Lemmon et al. | — | NIST Chemistry WebBook | https://webbook.nist.gov/cgi/fluid.cgi?…&ID=C7732185&Type=IsoBar&P=0.3&TLow=20&THigh=50 | CONFIRMADO (TSV descargado) |
| 18 | 9. Hydronic Distribution Systems (*Idronics*) | Caleffi | 2022 (14 de julio) | Caleffi | https://www.caleffi.com/en-us/blog/9-hydronic-distribution-systems | CONFIRMADO (leído) |
| 19 | DGX GB200 User Guide, Hardware | NVIDIA | — | NVIDIA Docs | https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html | CONFIRMADO |
| 20 | DOWFROST LC 25 (propiedades típicas) | Dow, vía distribuidor Krayden/Caplinq | — | — | https://www.krayden.com/products/dowfrost-lc-25 | Secundario. La hoja de Dow (dow.com) devolvió HTTP 403: **NO CONFIRMADO** de primera mano |
| 21 | Boyd CPU/GPU Liquid Cold Plates, P/N 668348 y 668359 | Boyd | 2022 | Boyd | https://info.boydcorp.com/hubfs/Thermal/Liquid-Cooling/Boyd-Standard-CPU-Liquid-Cold-Plate-Datasheets.pdf | Descargado; **unidades de Δp dudosas**, ver §10 |
| 22 | Física para ciencias e ingeniería, Vol. 1, 10.ª ed. (mecánica de fluidos) | R. A. Serway y J. W. Jewett | 2018 | Cengage | (ya citado en el repo) | Referencia de libro; capítulo y página NO CONFIRMADOS aquí |

**Licencias:**
- Código: MBL de tipo BSD, EPANET MIT.
- Especificaciones OCP: bajo los CLA de OWF/OCP; citarlas no requiere permiso.
- Datos del NIST: obra del Gobierno de EE. UU.
- Documentos de GF, Schneider, Amphenol y Boyd: con copyright; solo se citan números y frases cortas.

---

## 4. Lo que da la clase (Módulo 6) y la notación

Leído del bundle JS (sin ejecutarlo). Coincide con `.reference/class-material/06-mecanica-de-fluidos.md` (local, fuera de git).

- **Cubre:**
  - 1.1 Hidrostática (p = p₀ + ρgh, Pascal, Arquímedes).
  - 1.2 Continuidad y Bernoulli: «Ecuación de Continuidad (Conservación de masa)», `Q = A₁ · v₁ = A₂ · v₂ = constante` con «A = πD²/4 para tubería circular · Q en m³/s»; Bernoulli `p₁ + ½ρv₁² + ρgz₁ = p₂ + ½ρv₂² + ρgz₂ = constante`, «Cada sumando tiene dimensión de Pa = J/m³». La Ecuación de Bernoulli «expresa el teorema trabajo-energía para un fluido ideal (no viscoso, estacionario, incompresible e irrotacional a lo largo de una línea de corriente)». Incluye el Venturi.
  - 1.3 Torricelli y la **ecuación generalizada** «(Sistemas reales con bombas y pérdidas)», en alturas: p₁/ρg + v₁²/2g + z₁ + h_b = p₂/ρg + v₂²/2g + z₂ + h_L, con «la altura de energía entregada por bombas (h_b)» y «pérdidas de carga por fricción viscosa y accesorios como codos o válvulas (h_L)».
  - 1.4 Viscosidad τ = μ du/dy y **Re = ρvD/μ**, con «Laminar < 2300 · Transición 2300–4000 · Turbulento > 4000», más Navier–Stokes de forma cualitativa.
- **Solo nombra, no desarrolla:**
  - Darcy–Weisbach y Moody: «ecuación generalizada de energía con h_L (calculada mediante Darcy-Weisbach/Moody)».
  - Poiseuille: «h_L, modeladas por Poiseuille/Darcy».
  - La resistencia laminar que «escala con 1/D⁴».
  - Por lo tanto, **Darcy–Weisbach, f = 64/Re, la correlación turbulenta y los K son extensión dentro del tema**, y hay que decirlo en la página.
- **No hay** caudal másico, termodinámica ni calor específico en el curso (módulos 1–6). P = ṁ c ΔT no es material de Física I.
- **Notación de clase:**
  - p minúscula; ρ; Q; A; v; D (diámetro, no radio); z para la cota; μ; Re; h_b; h_L.
  - g = 9.81 y punto decimal en la app.
  - Laboratorio SPAA «Tanque elevado – reductor – boquilla» (Re₁ = 62 642, Q ≈ 5 L/s con Re < 4000). Nuestro laboratorio lo extiende de forma natural.
- **Propuesta para la página:** p minúscula (clase y Sears–Zemansky), Q para el caudal (clase), **y** para la altura (Serway y Sears–Zemansky; la clase usa z: decisión de Dylan, §10), g = 9,81 m/s² y coma decimal.

---

## 5. Números clave (copiados de la fuente)

### 5.1 Fluido

| Magnitud | Valor | Fuente |
|---|---|---|
| PG25 = 25 % en volumen → fracción másica | 0,2601 a 20 °C | cálculo propio con `volumeToMassFraction` de MBL |
| PG25 a 25 °C (Melinder) | ρ = 1018,0 kg/m³; μ = 2,146 mPa·s; c = 3921 J/(kg·K) | cálculo propio con los polinomios de MBL |
| PG25 a 40 °C (Melinder) | **ρ = 1010,6 kg/m³; μ = 1,394 mPa·s**; c = 3958 J/(kg·K) | ídem |
| PG25 a 20 / 50 °C | μ = 2,541 / 1,102 mPa·s | ídem |
| PG25 a 25 °C usado por NVIDIA en CFD | 1020 kg/m³; 0.002 Pa·s; 3850 J/(kg·K) | Shahi 2023, Tabla 1 |
| DOWFROST LC 25 (distribuidor) | «2.72 mPa·s @ 20 °C», «1.15 mPa·s @ 50 °C», «Specific Gravity (25/25 °C): 1.030–1.036», «25 vol%» | fuente 20 (secundaria) |
| Agua a 40 °C, 0,3 MPa | ρ = 992,30 kg/m³; μ = 0,65275 mPa·s | NIST (fuente 17) |
| Comprobación de Melinder con agua a 30 °C | 995,99 kg/m³ y 0,7967 mPa·s frente a 995,74 y 0,79722 del NIST | cálculo propio |

Melinder reproduce el agua del NIST con un error menor de 0,03 %. Para PG25, la viscosidad de Melinder queda un 6,6 % por debajo del valor de LC 25 a 20 °C (2,54 frente a 2,72 mPa·s), y la densidad un 1,4 % por debajo, coherente con los inhibidores. La viscosidad **se multiplica por 2,3 entre 20 y 50 °C**.

### 5.2 Caudal por potencia (la «regla»)

| Dato | Valor | Fuente |
|---|---|---|
| Regla OCP | «recommended to keep the coolant temperature rise between 7.5°C and 12°C, which is equivalent to a flow rate / heat dissipation ratio of 1.25 LPM/kW~2.0 LPM/kW, based on the properties of PG25 based coolants. A typical design target is 10°C temperature rise, i.e. 1.5 LPM/kW.» | OCP OAI, §1.3, pág. 7 |
| Comprobación | Con PG25 (Melinder), 1,500 L/min por kW ⇔ ΔT = 10,0 K; 1,25 ⇔ 12 K; 2,00 ⇔ 7,5 K, entre 25 y 45 °C | cálculo propio (`check_rules.py`) |
| Placa fría OAM | «between 1 and 2 liters per minute, resulting in chassis level flow rate between 4 and 16 liters per minute» | OCP OAI §1.3 |
| Rack MGX (NVIDIA) | «System Target Sustained Flow Rate (lpm) up to 130 LPM»; «Rack Power 120 kW»; «Rack Level Liquid Heat Capture Ratio 85%»; «Differential Pressure of Node at Target Flow Rate, 1x mated UQD pair ~10 psid» | MGX §11, pág. 84 |
| ⇒ | 1,27 L/min por kW de calor al líquido, ΔT ≈ 11,8 K | cálculo propio |
| RD109 (GB200) | suministro TCS 104 °F = 40,0 °C; retorno 129 °F = 53,9 °C; ΔT = 13,9 K; 132 kW ⇒ 142,5 L/min (todo al líquido) o 121 L/min (85 %) | Schneider RD109; cálculo propio |
| CDU Deschutes | «IT flow (GPM) 500», «Thermal load (kW) 2000», «Facility flow @ 0.25 GPM/kW» ⇒ 0,946 L/min por kW, ΔT ≈ 15,8 K con PG25 | Deschutes §3.1; cálculo propio |
| GF / RD109 | 23 L/s por CDU (8 racks) ⇒ **172,5 L/min por rack**; 24 servidores ⇒ **7,19 L/min por servidor**; en el CFD de 44 ramas, 170 L/min ⇒ 3,86 L/min por rama | GF; cálculo propio |

**Respuesta a la consigna:** sí, la conversión de kW a caudal se puede dar como **dato de fabricante**: «1,5 L/min por kW (OCP), equivalente a un calentamiento del líquido de 10 °C». No hace falta introducir P = ṁ c ΔT, que no es materia del curso. En la página basta una nota al pie: «los ingenieros la obtienen de la capacidad calorífica del PG25; aquí la usamos como dato». El código de MBL sí usa `PRac/ΔT/cp` (ChillerWSE l. 52–54) y puede citarse como «lo que hace el software».

### 5.3 Geometría del circuito

| Pieza | Dato | Fuente |
|---|---|---|
| Tubería principal | PP-H d160/SDR11 o SCH10 5″, 70 m de ida y vuelta | GF, Tabla 1 |
| ⇒ diámetro interior | 160 − 2 × 160/11 = **130,9 mm** (SDR = diámetro exterior / espesor: «ratio of a pipe's outside diameter to its wall thickness», GF) | cálculo propio |
| Manguera de rack | Parker E-Z FORM 2″ (GF); MGX: «MANIFOLD HOSE - PEROXIDE CURED EPDM, 1.5IN I.D.» y puertos «BSPP 1 1/4 … 1) 2" SINGLE HOSE 2) TWO 1.5" HOSES 3) 1.5" HOSE» | GF; MGX Fig. 7-13/7-14 |
| Manifold MGX | tubo de acero inoxidable 304 de 35,00 ± 0,50 × 60,00 ± 0,50 mm, pared de 3,00 mm; 44 puertos UQD («44X UQD CENTER LINE») a 44,45 mm; longitud 2079,1 mm; «CURRENT LOCATION WORKS WITH GB200 REFERENCE DESIGN BRACE LOCATIONS» | MGX Fig. 7-13 a 7-15, pág. 24–25 |
| ⇒ sección interior | 29 × 54 mm, A = 1566 mm², D_h = 4A/P = **37,7 mm** (suponiendo pared uniforme de 3 mm) | cálculo propio |
| Manifold GF | «Circular d63 … PVDF»: el diámetro interior depende del SDR, **NO CONFIRMADO** | GF |
| Conector de la bandeja | «employs the UQD-04 insert on the tray side … a UQDB-04 socket is mounted» en el manifold | MGX §10.1.1 |
| UQD04 | barb de 3/8″ (Tabla 5, pág. 12), «3/8 HB» con ID 7,5 mm (tabla del montaje de ensayo, §9.1.4, pág. 16); tapón con boca ØL = 7,24 mm (Tabla 2, pág. 9); casquillo ØC = 7,14 mm y DD máx. 60 mm (Tabla 1, pág. 8) | UQD v2 |
| Manguera de servidor | «3/8" inner diameter = 9.5 mm» | GF, Tabla 1 |
| Placa fría (interior) | «Meso-Channel with internal fin features between 0.1 mm – 1.0 mm» (OAI §3.5); «microchannels or jet‑impingement structures … narrow hydraulic diameters» (GF). Geometría propietaria: **sin número de canales** | OAI; GF |

### 5.4 Caídas de presión y conectores

| Elemento | Dato | Fuente |
|---|---|---|
| UQD v2, caudal nominal (02/04/06/08) | 2,27 / **6,44** / 11,36 / 17,79 L/min (0,6 / 1,7 / 3,0 / 4,7 GPM) | UQD v2 Tabla 6, pág. 13 |
| UQD v2, Cv mín.–máx. | 0,30–0,43 / **1,1–1,6** / 2,2–3,3 / 3,6–5,6 | ídem |
| Cv: definición | «C_v = Q√(SG/ΔP) ; where Q is in GPM and ΔP is in psi»; nota 7: «Flow coefficient reported relative to water, apply correction factors or perform additional testing to evaluate dP with alternative liquids» | UQD v2 §9.1.4, pág. 16 |
| Curva de ajuste | «Reference Equation: ∆P(Q) = AQ² + BQ (∆P in psi, Q in L/min)» | UQD v2 Tabla 6 |
| Caudal máximo | «general recommendation limit to equivalent volumetric flow derived from minimum cross-sectional area and maximum velocity of 5m/s»; nota 1: «must currently sustain min 2x rated flow» | ídem |
| Amphenol UQD04 | «Cv Value UQD02:0.4 UQD04:1.29 UQD06:2.32 UQD08:3.7» (conforme a «OCP … rev 1.0») | fuente 15 |
| Specialty Mfg UQD04 | caudal nominal «2.2 GPM 8.2 LPM» | fuente 16 (v1; contrasta con el 6,44 de v2) |
| ASHRAE TC 9.9 | «a Cv value is representative of the volumetric flow rate expected to result in 1 psi (6.9 kPa) pressure loss»; caudales típicos «0.1 to 10 gpm (.38 to 31.85 L/m)» | fuente 14, pág. 35–36 |
| Lazo OAI de 8 placas | «At a fixed flow rate of 10 LPM, with 25% PGW, the pressure drops are: 4x2 Layout - 10 psi; 8x1 Layout - 7 psi»; a 10 psi, 10,0 frente a 12,5 L/min | OAI §3.5, pág. 23 |
| Lazo OAI (prueba de Wiwynn) | «the system flow pressure drop (QD-to-QD) already reaches 17 psi at 8 LPM … Roughly 50% of the pressure drop come from the coldplates and remaining 50% from hose+manifold+ manually-mate QDs» | OAI §6.3.3, pág. 31 |
| Exponente n de lazos y placas | Fig. 4 de OAI (lectura aproximada): 8x1 de 2,6 psi a 6 L/min a 12,9 psi a 14 L/min ⇒ n ≈ 1,89; 4x2 ⇒ n ≈ 1,79. MBL: 1,85. Manifold de Shahi: 1,8 → 10,5 psi entre 16,4 y 50,4 L/min ⇒ n = 1,57 | cálculo propio |
| Placa fría (GF) | 1,2 bar para placas frías y tubería interna, «rather conservative» | GF |
| Ensayo de placas (OCP) | «Results are reported as a curve fit equation for pressure drop vs. flow rate»; «Select at least six flow rates from 25% to 150% of rated flow»; fluido a «45°C ± 2°C»; caudal «up to <1.5 m/s to ensure no erosion» | Cold Plate Test Spec §5.2, pág. 14–15 |

### 5.5 Bomba (CDU Deschutes)

| Dato | Valor | Fuente |
|---|---|---|
| Resumen | «hydraulic capacity targets of 500 GPM at 80-90 psi»; «Operating pressure (psig) 0-130»; «Approach temperature (°C) 3» | Deschutes §2.2, §3.1 |
| Bomba | «SPECK», «TOEMA065200», «500 GPM @ 112 psi», «37 kW», «N+1 operation» | Deschutes §6.1, pág. 23 |
| Curvas de presión disponible (Fig. 5.1.1, PG25, 2 bombas; Δp en psi, x en GPM) | 100 % PWM: `119 + 0.0211x + -9.34E-05x^2`; 95 %: `105 + 0.0171x + -8.66E-05x^2`; 90 %: `94.1 + 0.0148x + -8.41E-05x^2`; 83 %: `83 + 0.0144x + -9.05E-05x^2`; 80 %: `74.4 + 0.0107x + -7.96E-05x^2`; 75 %: `65.4 + 8.83E-03x + -7.75E-05x^2`; 66 %: `53.2 + 0.0103x + -9.07E-05x^2`; 50 %: `29.6 + 0.0112x + -9.88E-05x^2`; 33 %: `13 + 6.49E-03x + -9.5E-05x^2` | Deschutes pág. 19 (leyenda leída en la imagen) |
| ⇒ a 500 GPM | 106,2 psi (100 %), 91,9 (95 %), 80,5 (90 %): los «80–90 psi» de la tabla corresponden a ~90–95 % PWM | cálculo propio |
| Control | «DEFAULT: Fixed pressure drop control → control pump speed to maintain fixed pressure differential between liquid supply pressure sensor and liquid return sensor» | Deschutes §7.2.2, pág. 27 |
| Potencia | Hidráulica: 112 psi × 500 GPM = 24,4 kW; frente a 37 kW, η ≈ 0,66 si los 37 kW son potencia eléctrica (**NO CONFIRMADO** qué representan) | cálculo propio |

---

## 6. La física en 4 pasos (formato de la casa)

Convenciones: SI, g = 9,81 m/s², p presión absoluta en kPa, Q caudal volumétrico, D diámetro interior, A = πD²/4, y altura (la clase escribe z). Fluido de referencia: PG25 a 40 °C, ρ = 1010,6 kg/m³, μ = 1,394 mPa·s.

### Paso 1. Modelo simple: el caudal se conserva (continuidad)

$$Q = A_1 v_1 = A_2 v_2 \qquad\text{y, en un nodo,}\qquad \sum Q_\text{entra} = \sum Q_\text{sale}$$

- En serie, el mismo Q pasa por todas las secciones; v = Q/A sube donde la tubería se estrecha.
- Ejemplo con el caudal real de un servidor del RD109, q = 7,19 L/min (cálculo propio):
  - manguera de 9,5 mm: v = 1,69 m/s;
  - boca del UQD04, de 7,24 mm: v = 2,91 m/s, con (9,5/7,24)² = 1,72 veces menos área.
- En los nodos, el caudal se reparte en cascada: 23 L/s salen del CDU, que equivalen a 8 racks de 172,5 L/min, y cada rack a 24 servidores de 7,19 L/min. Dentro del manifold, el tramo de arriba de cada puerto lleva q menos que el de abajo: v baja de 1,84 a 0,08 m/s a lo largo del tubo.
- El caudal que necesita cada servidor viene de la regla de 1,5 L/min por kW (dato de OCP).
- **Modelo ingenuo:** «si el CDU entrega N·q, cada servidor recibe q».

### Paso 2. Bernoulli: donde la velocidad sube, la presión baja

$$p_1 + \tfrac12\rho v_1^2 + \rho g y_1 = p_2 + \tfrac12\rho v_2^2 + \rho g y_2$$

- En el estrechamiento del conector (horizontal): Δp = ½ρ(v₂² − v₁²) = ½ · 1010,6 · (2,91² − 1,69²) = **2,84 kPa** de caída. Ese valor es una cota inferior, porque la válvula interior del UQD reduce aún más el área. En el modelo ideal esa presión se **recupera** al volver a la manguera.
- En el manifold vertical de 1,067 m (24 puertos × 44,45 mm), al subir: Δp = ρgΔy = **10,6 kPa**.
  - En el lazo cerrado, ese término se cancela entre la subida por la impulsión y la bajada por el retorno.
  - No cambia el caudal de una rama: su entrada y su salida están a la misma altura.
  - Sí cambia la presión local, y por eso se ve en la gráfica.
- La clase lo presenta como el «teorema trabajo-energía para un fluido ideal».
- **Conclusión ideal:** sin pérdidas, la presión vuelve a su valor inicial al cerrar el lazo. La bomba no tendría nada que hacer y todos los servidores recibirían lo mismo.

### Paso 3. Por qué no basta: la fricción y los accesorios disipan energía

La ecuación generalizada de clase, escrita en presiones (Δp = ρ g h):

$$\Delta p_\text{bomba} = \rho g\,h_b = \sum \Delta p_\text{pérdidas},\qquad \Delta p_f = f\,\frac{L}{D}\,\tfrac12\rho v^2,\qquad \Delta p_\text{local} = K\,\tfrac12\rho v^2$$

- **Factor f**:
  - laminar, f = 64/Re (Hagen–Poiseuille);
  - turbulento, Swamee–Jain, f = 0,25/[log₁₀(ε/3,7D + 5,74/Re^0,9)]², la misma del código de EPANET;
  - Re = ρvD/μ.
- En el circuito de referencia (§7):
  - tubería principal: Re = 162 000, f = 0,0163;
  - manguera de 3/8″: Re = 11 600, f = 0,030;
  - arriba del manifold el caudal es tan pequeño que Re ≈ 2100: es **laminar** (< 2300, criterio de clase).
- **Conectores**: el fabricante da Cv en vez de K. Con Δp[psi] = SG (Q[GPM]/C_v)², el UQD04 (Cv = 1,29) a 1,90 GPM pierde **15,1 kPa**. Es 5,3 veces la caída reversible de Bernoulli del paso 2 y equivale a K ≈ 10,5 sobre la carga de velocidad de la manguera. La GF lo explica: la constricción «increases fluid velocity and turbulence, leading to a significant pressure drop».
- **Placa fría**: no hay geometría pública. Se usa su curva medida, Δp = A Q² + B Q (forma de OCP) o Δp ∝ Qⁿ con n entre 1 (laminar en microcanales) y 2 (turbulento); los datos dan n ≈ 1,6–1,9. Por qué hay régimen laminar dentro: con canales de 0,3–1 mm y v ≈ 1 m/s, Re ≈ 200–1100 (cálculo ilustrativo, geometría supuesta).
- **Suma**: 1,83 bar para el servidor más lejano. La bomba debe dar esa Δp, y su potencia hidráulica es P = Δp·Q = 1,83 × 10⁵ Pa × 0,023 m³/s = **4,2 kW** para 1,06 MW de TI (0,40 %).

### Paso 4. Modelo mejorado: servidores en paralelo y el caudal del más lejano

Cada servidor es una rama entre dos manifolds. Cada rama obedece su curva y todas comparten el caudal del rack:

$$\Delta p_i = R_i\,Q_i^{\,n},\qquad \sum_{i=1}^{N} Q_i = Q_\text{rack},\qquad \Delta p_i = p_{s,i} - p_{r,i}$$

- Si los manifolds no perdieran presión, todas las ramas verían la misma Δp y Q_i = (Δp/R_i)^{1/n}. Las ramas iguales reciben lo mismo, y una rama con R cuatro veces mayor recibe 4^(−1/1,85) = 0,47 veces el caudal (cálculo propio).
- Con pérdidas en los manifolds, la Δp disponible depende del puerto:
  - **retorno directo** (entrada y salida del mismo extremo, en «U»): el servidor más cercano tiene el camino más corto y recibe más. Caleffi: «the highest flow rate will be through the shortest piping path»;
  - **retorno invertido** (salida por el extremo opuesto, en «Z»): «This makes the length of the piping path to and from the circulator approximately the same for each crossover». Es «largely self-balancing» si las ramas son iguales, pero «balancing valves should still be installed».
- **Cómo se garantiza el caudal mínimo del más lejano:**
  1. Hacer que R_rama ≫ R_manifold: la placa fría, de ~1,2 bar, actúa como igualador (GF, criterio de manifold < 50 mbar).
  2. Si no se cumple, usar retorno invertido.
  3. Controlar el CDU a Δp fija, como el control por defecto de Deschutes y `dpSet` en MBL, con un valor tal que la rama peor reciba q_mín: Δp_set ≥ R_peor q_mín^n + pérdidas de los manifolds.
  4. Poner válvulas de equilibrado cuando los servidores son distintos.
  5. Medir, porque el Cv de catálogo falló en Shahi 2023.
- **El precio de no hacerlo:** subir el caudal total hasta que la rama peor llegue a su mínimo. Con Δp ∝ Q^1,9, la potencia P = Δp Q crece como Q^2,9: una sobreoferta del 51 % triplica la potencia de bombeo (§7.3).

---

## 7. Cálculos de referencia (cálculo propio)

### 7.1 Perfil del recorrido hasta el servidor más lejano (24.º, arriba; retorno directo)

Parámetros declarados:
- PG25 a 40 °C; entrada a 4,00 bar abs (GF, Fig. 1).
- Rugosidad de EPANET: plástico 0,0015 mm (tuberías y mangueras), acero 0,046 mm (manifold).
- K de EPANET: 1,8 por cada te de derivación.
- Supuestos: L = 35 m de tubería principal por sentido (la mitad de los 70 m de GF), 3 m de manguera de rack y 0,5 m de manguera de servidor por sentido.
- Script: `profile.py out.csv 24 U`.

| Sección | D (mm) | Q | v (m/s) | Re | f | Δp fricción (kPa) | Δp local (kPa) |
|---|---|---|---|---|---|---|---|
| Tubería principal (ida, 35 m) | 130,9 | 23 L/s | 1,709 | 162 161 | 0,0163 | 6,42 | — |
| Te + manguera de rack 2″ (3 m) | 50,8 | 172,5 L/min | 1,418 | 52 235 | 0,0207 | 1,24 | 1,83 (K 1,8) |
| Manifold de ida (24 tramos de 44,45 mm, sube 1,067 m) | D_h 37,7 | 172,5 → 7,19 L/min | 1,836 → 0,076 | 50 219 → 2 092 | 0,0248 → 0,031 | 0,44 | ρgΔy = 10,6 (reversible) |
| Te + manguera 3/8″ (0,5 m) | 9,5 | 7,19 L/min | 1,690 | 11 638 | 0,0300 | 2,28 | 2,60 (K 1,8) |
| UQD04 de ida (boca ØL) | 7,24 | 7,19 L/min | ≥ 2,910 | ≥ 15 271 | — | (1,34) | **15,11** (Cv 1,29) |
| Placa fría + tubería interna | — | 7,19 L/min | — | — | — | — | **120,0** (GF) |
| UQD04 de vuelta | 7,24 | 7,19 L/min | ≥ 2,910 | — | — | (1,34) | 15,11 |
| Manguera 3/8″ de vuelta + te | 9,5 | 7,19 L/min | 1,690 | 11 638 | 0,0300 | 2,28 | 2,60 |
| Manifold de vuelta (baja 1,067 m) | D_h 37,7 | 7,19 → 172,5 L/min | 0,076 → 1,836 | — | — | 0,44 | −10,6 (reversible) |
| Te + manguera de rack de vuelta | 50,8 | 172,5 L/min | 1,418 | 52 235 | 0,0207 | 1,24 | 1,83 |
| Tubería principal de vuelta | 130,9 | 23 L/s | 1,709 | 162 161 | 0,0163 | 6,42 | — |
| **Total** | | | | | | **24,2** | **159,1** |

- **Δp total = 183 kPa = 1,83 bar**; la presión baja de 400,0 a 216,8 kPa abs.
- En el servidor de abajo (1.º) con retorno directo: 1,824 bar. En el de arriba con retorno invertido: 1,828 bar. La diferencia entre servidores es de mbar, como dice GF.
- Con Cv = 1,1 (mínimo de OCP v2) cada UQD pierde 20,8 kPa; con Cv = 1,6, 9,8 kPa.
- Con agua a 40 °C y el mismo caudal, el total queda en 1,79 bar: la fricción baja de 24,2 a 20,6 kPa. La placa se mantuvo fija; su Δp real con agua no está publicada.

**Comparación con el desglose de GF (Fig. 2, polímero, bar):**

| | Este cálculo | GF (Sinetz) |
|---|---|---|
| Placas frías | 1,20 (dato de GF) | 1,20 |
| UQD pequeños (×2) | 0,30 (Cv 1,29) / 0,42 (Cv 1,1) | 0,51 |
| Mangueras 3/8″ | 0,046 | 0,05 |
| Accesorios (tes) | 0,089 | 0,09 |
| Manifolds | 0,009 | 0,03 |
| Tuberías | 0,128 | 0,07 |
| QD grande + válvulas mariposa | no modelados | 0,03 |
| **Total** | **1,83** | **1,98** (−7,5 %) |

- La diferencia más grande está en los conectores: el Cv de catálogo subestima la pérdida, igual que en Shahi 2023.
- En tuberías mi cálculo sobreestima, porque GF reparte el caudal a lo largo de la línea, que va perdiendo racks.
- Velocidades: la máxima en tubería es de 1,71 m/s, frente a «maximum velocity in the pipework was 1.7 m/s» en GF. Coincide, lo que valida D = 130,9 mm y los 23 L/s.

**Preset de 44 puertos** (MGX/GF Fig. 5, 170 L/min, `preset44.py`):
- q = 3,86 L/min por puerto; v = 0,91 m/s en la manguera y ≥ 1,56 m/s en el UQD.
- Cada UQD pierde 4,4 kPa; el total es de 1,53 bar con la placa fija en 1,2 bar.
- El UQD04 queda dentro de su caudal nominal v2 (6,44 L/min). En el preset de 24 servidores, 7,19 L/min lo **supera**: ver §10.

**Errata (2026-11-17, implementación).** Al portar `profile.py` a TypeScript encontré una doble cuenta. Cada UQD04 sumaba, además de su pérdida por Cv, la fricción de Darcy a lo largo de sus 60 mm con la boca de 7,24 mm (1,34 kPa cada uno). La placa fría sumaba la fricción de sus 0,15 m dibujados (0,68 kPa) además de los 1,2 bar de GF. El Cv se define a través del conector acoplado y los 1,2 bar de GF cubren «all cold plates and internal piping», así que esos 3,37 kPa ya estaban dentro. Un componente caracterizado por un Cv o por una curva medida lleva toda su pérdida en esa ley; su longitud solo lo ubica en x (`segmentLoss` en `src/lib/physics/hydraulics.ts`). Valores corregidos, calculados por el código con sus pruebas:
- Fricción: 24,2 → **20,8 kPa** (20,78). Las pérdidas locales no cambian (159,1 kPa).
- Total hasta el servidor más lejano: 1,83 → **1,80 bar** (1,799), es decir, **9,2 %** por debajo de los 1,98 bar de GF, no 7,5 %. La presión baja de 400,0 a 220,1 kPa abs.
- Servidor de abajo con retorno directo: 1,824 → 1,791 bar. Servidor de arriba con retorno invertido: 1,828 → 1,795 bar; el código, como `manifold.py`, cuenta también el tramo de manifold sobre el puerto 24 hasta la salida, que `profile.py` omitía.
- Preset de 44 puertos: 1,53 → **1,52 bar** (1,518).
- Con agua a 40 °C (NIST) y el mismo caudal: 1,79 → 1,76 bar.
- Potencia hidráulica a 23 L/s: 4,2 → **4,1 kW** (4,14), el 0,39 % de 1,06 MW de TI.
- En la tabla de comparación con GF, las filas no cambian. Lo que no queda en ninguna fila baja de 5,85 a 2,48 kPa: la fricción de la manguera de rack.
- Reparto (§7.2): la curva de la rama sale de la suma de sus piezas, 159,98 kPa, de acuerdo con los 159,96 kPa sumados a mano en `manifold.py`; los cocientes de la tabla de §7.2 no cambian.
- Punto de operación de §8 con 15 racks: el sistema pide 684 GPM a 26,1 psi (no 26,6), y con 66 % de PWM cae en 638 GPM (0,93 del nominal).

### 7.2 Reparto entre servidores (`manifold.py`)

Modelo:
- ramas con Δp = R Qⁿ (n = 1,85 con placa fría; 2 sin ella);
- manifolds con Darcy en cada tramo de 44,45 mm, con su caudal local;
- caudal total fijo;
- sin recuperación de presión por Bernoulli en el colector (simplificación declarada: su coeficiente es empírico y **NO CONFIRMADO** en una fuente abierta).

Rack de 24 servidores, 172,5 L/min:

| Caso | Retorno directo: q_mín/q̄ · q_máx/q̄ · sobreoferta | Retorno invertido: q_mín/q̄ · q_máx/q̄ · sobreoferta |
|---|---|---|
| Referencia: rama 1,6 bar (placa + 2 UQD + mangueras), manifold MGX | 0,9993 · 1,0019 · 1,0007 | 0,9997 · 1,0006 · 1,0003 |
| Rama de 0,10 bar (sin placa fría), manifold MGX | 0,9893 · 1,0279 · 1,0108 | 0,9950 · 1,0087 · 1,0050 |
| Rama de 0,10 bar y manifold de 3/4″ (19 mm; v = 10 m/s en la entrada) | **0,634 · 1,919 · 1,578** | 0,734 · 1,426 · 1,363 |
| Rama de 1,5 bar y manifold de 3/4″ | 0,956 · 1,117 · 1,046 | 0,978 · 1,039 · 1,023 |
| Ramas desiguales (R × 4 en los puertos 6–18), manifold MGX | 0,661 · 1,401 · 1,512 | 0,662 · 1,400 · 1,512 |
| 44 ramas, 170 L/min, solo UQD + manguera (~0,14 bar) | 0,986 · 1,037 · 1,014 | 0,994 · 1,012 · 1,006 |
| 44 ramas, con placa de 1,2 bar | 0,998 · 1,005 · 1,002 | 0,999 · 1,002 · 1,001 |

«Sobreoferta» = q̄/q_mín, es decir, cuánto hay que subir el caudal total para que la rama peor llegue a su caudal nominal. Lecturas:
- **(i)** Con placas frías y un manifold bien dimensionado, el reparto es uniforme dentro del 0,2 %. Coincide con GF («less than 5%») y con la medición de NVIDIA (0,2–0,5 L/min sobre ~8 L/min).
- **(ii)** Sin la resistencia de la placa, el colector manda. Con retorno directo, el primer servidor recibe más: el FNM de Shahi da 8,97 → 7,91 L/min del puerto 1 al 6 (máx./mín. = 1,13).
- **(iii)** El retorno invertido ayuda contra la pérdida en el colector, pero **no** contra ramas desiguales. Ahí solo sirve equilibrar con válvulas.

### 7.3 Lo que cuesta sobredimensionar la bomba

- Con Δp ∝ Q^1,9 y P = Δp Q ∝ Q^2,9:
  - sobreoferta de 1,011 ⇒ ×1,03 de potencia;
  - 1,046 ⇒ ×1,14;
  - 1,114 ⇒ ×1,37;
  - 1,363 ⇒ ×2,46;
  - **1,512 ⇒ ×3,32**;
  - 1,578 ⇒ ×3,75.
- Potencia hidráulica de referencia: 527 W por rack (4,2 kW por CDU de 8 racks).

---

## 8. Diseño del recurso (VISUALIZACIÓN DE DATOS)

Criterio de la consigna: «una gráfica construida por usted a partir de datos reales o calculados, con ejes etiquetados, unidades y la fuente de los datos citada».

**Gráfica principal (a), «El recorrido de un litro de refrigerante»**:
- Eje x: posición a lo largo del recorrido, en m (0 a 79,4 m para el servidor más lejano).
- Paneles apilados con x compartida:
  - **v (m/s)**, en escalones;
  - **p (kPa, absoluta)**, con dos curvas: p real (con pérdidas) y p de Bernoulli ideal (sin pérdidas, que solo baja donde v sube o y sube y vuelve a su valor). Opcionalmente, la «línea de energía» p + ½ρv² + ρgy, que solo cae por pérdidas.
- **Franja de secciones** debajo: cada tramo dibujado con alto proporcional a D (o a √A, por legibilidad) y rotulado con D en mm. La rotulación es el puente con «en función de la sección de la tubería».
- La tubería principal (35 m por sentido) aplasta la zona interesante (6 m de rack). Propongo encuadre inicial en la zona del rack (x ≈ 35–44 m) con el zoom del sitio (`useZoomPan`, «Ver todo el circuito»), o un corte de eje declarado.
- Marcar:
  - la caída reversible de 2,84 kPa en el UQD frente a la pérdida de 15,1 kPa;
  - el escalón de 120 kPa de la placa;
  - el −10,6 kPa del manifold que sube, recuperado al bajar.

**Panel (b), «v frente a A»**: los puntos (A, v) de cada sección sobre las hipérbolas v = Q/A de los tres caudales del circuito (23 L/s, 172,5 L/min, 7,19 L/min). Muestra la continuidad sin palabras.

**Gráfica (c), «¿Le llega a todos?»**: q_i (L/min) frente al puerto 1…N, con retorno directo y retorno invertido. Debajo, los **datos reales** de Shahi 2023 (6 puertos, 49,5 L/min, sin placas frías):
- FNM: 8,9742; 8,4878; 8,1774; 8,0043; 7,9287; 7,9098 L/min;
- experimento, leído en la Fig. 4 (aproximado): ≈ 8,00; 8,24; 8,24; 8,54; 8,06; 8,40 L/min.
- La fuente se cita tal cual.

**Colores con significado:** impulsión fría en azul y retorno caliente en rojo, como en OCP OAI Fig. 3 y en la convención de agua fría/caliente. PG25 sin color propio (el LC 25 de Dow es «fluorescent yellow» según distribuidores, NO CONFIRMADO en Dow: no usarlo).

**Tabla de parámetros declarados** (va con la gráfica, una fuente por número):
- fluido y temperatura;
- ρ y μ (Melinder/MBL);
- Q del CDU, del rack y del servidor (GF/RD109);
- D de cada tramo (GF, OCP UQD, MGX; diámetro interior calculado del SDR);
- longitudes (supuestas, marcadas);
- ε (EPANET);
- K (EPANET);
- Cv (Amphenol; rango de OCP);
- Δp de la placa (GF);
- p de entrada (GF);
- g = 9,81 m/s².

**Laboratorio** (sobre `LabShell`, como los demás):
- **Parámetros**:
  - D de cada tramo;
  - Q del rack (o Δp del CDU en modo «Δp fija», como Deschutes y MBL);
  - número de servidores N (1–44);
  - Δp nominal de la placa y exponente n;
  - Cv del UQD;
  - fluido (PG25 o agua) y temperatura (20–50 °C, recalcula ρ y μ con Melinder);
  - retorno directo o invertido;
  - un «servidor distinto» (R × k en un rango de puertos).
- **Recalcula**:
  - v_i = Q_i/A_i;
  - Re_i y régimen con el criterio de clase;
  - f_i, Δp_i, p(x) y la cascada de pérdidas (como la Fig. 2 de GF);
  - q por servidor, q_mín/q̄ y sobreoferta;
  - potencia hidráulica P = Δp Q;
  - avisos: v > 2,1 m/s (GF), UQD por encima de su caudal nominal (OCP v2), v en la placa > 1,5 m/s (OCP, ensayo de erosión).
- **Modo opcional «Bomba»**: punto de operación entre una curva de Deschutes (PWM 33–100 %, ecuaciones de la Fig. 5.1.1, medidas hasta 650 GPM) y la curva del sistema de M racks en paralelo, Δp = Δp_n (Q/Q_n)^1,9.
  - Con 15 racks (≈ 2 MW), el sistema pide 684 GPM a 26,6 psi.
  - El punto de operación cae en 635 GPM (0,93 del nominal) con 66 % de PWM y en 732 GPM (1,07) con 75 %: el nominal queda cerca del 70 %.
  - Con 50 % solo llega a 470 GPM (0,69), y la rama peor quedaría sin caudal.
  - Cálculo propio. Los 684 GPM superan los 500 GPM de Deschutes porque aquí ΔT ≈ 11,5 K y no los ~15,8 K implícitos en la especificación.
- **Presets**:
  1. «RD109 / GF (24 servidores)»;
  2. «MGX, 44 puertos»;
  3. «Sin placas frías (ensayo de NVIDIA)»;
  4. «Manifold estrecho de 3/4″»;
  5. «Servidores mixtos: hay que equilibrar»;
  6. «Agua en vez de PG25»;
  7. «Bomba sobredimensionada».
- **Qué está a escala:** posiciones y longitudes sí (supuestas); los diámetros de la franja no (alto ∝ D, con rótulo).
- **Fuera del modelo:** temperatura variable a lo largo del lazo (se usan 40 °C en todo el lazo), recuperación de presión en el colector, transitorios y golpe de ariete, y la geometría interior de la placa.

---

## 9. Conexiones con otros temas

- **Tema 6 (frenado regenerativo)**:
  - Bernoulli es el teorema trabajo–energía por unidad de volumen; la clase lo dice tal cual.
  - La potencia de la bomba, P = Δp·Q, es la gemela de P = F·v del tema 6.
  - Lo que se pierde en h_L acaba como energía interna (calor), igual que el frenado por fricción.
  - Número: 4,2 kW de bombeo para 1,06 MW (0,40 %). Genuina.
- **Tema 4 (llantas, fricción)**: la fricción de Coulomb (μn) no depende de la rapidez; la viscosa sí, con Δp ∝ v en régimen laminar y ∝ v² en turbulento. Es otra relación «no proporcional», como el agarre de la llanta. Genuina.
- **Tema 7 (restitución)**: energía mecánica que se convierte en interna en el choque inelástico y en la pérdida de carga. Opcional.
- **Temas 10–12** (Módulo 5: oscilaciones, ondas, resonancia): vínculo débil.
  - La especificación UQD limita el pico de presión al desconectar («no more than 30psi», §9.1.5) y Deschutes exige ensayos de golpe de ariete. Son transitorios de presión, no resonancia.
  - Solo vale la pena si el Tema 12 trata ondas de presión.
  - El controlador PID de la bomba (MBL `conPum`) no justifica una conexión con el Tema 10.
  - No recomiendo forzarlas.

---

## 10. Riesgos, advertencias y decisiones para Dylan

1. **El caudal por bandeja de GB200 NVL72 no es público.** NVIDIA solo dice «approximately 120kW» y «liquid that runs up and down the rack through manifolds»; el MGX da «up to 130 LPM» por rack. No atribuir a NVIDIA números por servidor. Los blogs de terceros (80–195 L/min) se contradicen: no usarlos.
2. **La Δp de la placa fría es un supuesto de GF** («rather conservative», 1,2 bar), no la curva medida de un modelo con nombre.
   - La curva de Boyd 668348/668359 dice 0,38 → 1,91 «in. H₂O» entre 1 y 3 L/min. Eso son 0,1–0,5 kPa, unas 50 veces menos que lo que implican OAI y MBL (~24 kPa por placa a 1,25 L/min). Sospecho una etiqueta de unidades errónea: **NO CONFIRMADO, no usar**.
   - La hoja de JetCool solo da R frente a caudal.
   - Lo honesto en la página: «Δp de la placa: valor de diseño publicado por GF; las curvas medidas de OCP son de lazos de 8 placas».
3. **UQD04 a 7,19 L/min supera su caudal nominal v2 (6,44 L/min).** Las hojas basadas en v1 lo dan en 8,2 L/min. **Decisión:** preset de 24 servidores (valida contra GF) o de 44 puertos (dentro del nominal, geometría MGX). Propongo los dos, con el de 24 marcado.
4. **Área mínima del UQD:** 7,24 mm es la boca del tapón y 7,5 mm el barb; la válvula interior reduce el paso. La velocidad dibujada es una **cota inferior** y Bernoulli a través del conector es una idealización.
5. **Inconsistencia de GF:** 23 L/s para 8 × 132 kW con ΔT = 10 K requerirían 26,4 L/s. 23 L/s cuadran con ~898 kW (85 % al líquido, como el MGX). Es mi interpretación, **NO CONFIRMADA**.
6. **Deschutes:**
   - el PDF se titula «Externally Shared DRAFT»;
   - dice «2000 MW» (errata por kW);
   - no está claro si los 37 kW de la bomba son eléctricos;
   - el registro de MBL usa 827 kPa, que no coincide con los 80–90 psi y cita un documento no público.
7. **Umbral laminar:** la clase usa 2300/4000; EPANET 2000/4000; MBL, ReC = 4000. En la página, el de clase, con una nota.
8. **Notación (decisión):** p minúscula y Q, como la clase. Para la altura, y (textos) o z (clase). La regla de la casa favorece la del libro (y), mencionando que la clase escribe z.
9. **ρgy en el manifold vertical:** decidir si se dibuja. Es didáctico (el término de clase aparece y se cancela), pero puede confundir. Etiquetarlo «reversible».
10. **Darcy–Weisbach, f, K y Cv son extensión** dentro del tema: la clase solo los nombra. Decirlo en la página.
11. **Propiedades:** en la página, PG25 a 40 °C según Melinder (MBL). La viscosidad varía mucho con T (×2,3 entre 20 y 50 °C) y el retorno va ~10–14 K más caliente: simplificación declarada.
12. **Fuentes de fabricante** (GF, Amphenol, Boyd, Specialty Mfg): solo números puntuales. La comparación polímero/acero de GF es afirmación comercial y no se usa.
13. **Recuperación de presión en el colector** (Bernoulli en un manifold que va perdiendo caudal): existe, pero su coeficiente es empírico y no lo verifiqué en una fuente abierta. El modelo de reparto la omite y lo declara.
14. **Lecturas de figuras** (OAI Fig. 4, puntos experimentales de Shahi Fig. 4, curvas de Deschutes): las ecuaciones de la leyenda de Deschutes y los caudales FNM de Shahi están escritos en la figura y son exactos. El resto son lecturas aproximadas y se marcan así.
15. **Reglas de la casa:** sin recortes por tiempo. El panel de reparto (paso 4) es parte del concepto («que llegue suficiente caudal a cada servidor»), no un extra.
