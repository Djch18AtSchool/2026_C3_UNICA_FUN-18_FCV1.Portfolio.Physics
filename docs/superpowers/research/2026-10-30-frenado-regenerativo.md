# Tema 6: Frenado regenerativo en un vehículo eléctrico. Investigación de fuentes

Fecha de acceso de todas las fuentes: **2026-10-30**. Los valores se copiaron de la fuente abierta (archivo descargado o página leída). Lo marcado "(cálculo propio)" lo calculé yo con los scripts de `scripts/`. Lo marcado **NO CONFIRMADO** no se pudo abrir ni verificar. Las citas textuales van en el idioma original.

Rutas (scratchpad): datos en `research/data/frenado/`, scripts en `research/scripts/` (`energy_balance.py`, `xlsx2csv.py`, `find_ev.py`). Todo el Python se ejecutó con `python3 -I`.

---

## 1. Recomendación

- **Caso de uso:** **FASTSim** (Future Automotive Systems Technology Simulator), el simulador de código abierto de NREL, hoy *National Laboratory of the Rockies* (NLR). Licencia Apache-2.0, repositorio `NatLabRockies/fastsim`, versión v3.1.0 (2026-08-31). Cada paso de tiempo calcula, a partir de un ciclo de velocidad, la potencia que piden las ruedas, P = ΔK/Δt + P_rodadura + P_aero (+ pendiente + inercia de ruedas). Cuando esa potencia es negativa, el motor la recupera hasta un límite de potencia y con un rendimiento η, y el freno de fricción absorbe el resto. Las líneas de código están citadas en la §2. Es verificable y abierto, y su física es justo la de la consigna (trabajo, energía cinética y transformación).
- **Datos para la visualización:**
  - Ciclo **EPA UDDS** (1 Hz, mph), dominio público para uso educativo; HWFET y US06 sirven de contraste.
  - Coeficientes de carga en carretera A, B, C y peso equivalente de prueba de un vehículo real, tomados de la **EPA Test Car List 2025**.
  - Mapa de rendimiento del motor y de la batería del archivo de vehículo de FASTSim (Tesla Model 3 RWD 2022).
- **Vehículo:** **Tesla Model 3 Long Range RWD, año modelo 2025** (id. de vehículo de prueba `3R124-782214`, prueba `RTSL10086702`, "Charge Depleting UDDS"). El mismo registro aparece en las listas 2025 y 2026.
  - ETW = 4250 lb → m = 1927,77 kg (cálculo propio).
  - A = 27,02 lbf, B = 0,2873 lbf/mph, C = 0,01220 lbf/mph².
  - Alternativa: Nissan LEAF 2025 (`KWB115`), el auto del e-Pedal; sus números van en la §7.
- **Gráfica sugerida:** dos vistas del mismo cálculo segundo a segundo sobre el UDDS.
  - (a) Arriba, la velocidad v(t). Abajo, las energías acumuladas: tracción, carga en carretera, frenado en ruedas, energía devuelta a la batería y fricción. El CSV ya está generado.
  - (b) Un balance tipo Sankey del ciclo: 1,60 kWh de tracción → 0,73 kWh de carga en carretera + 0,87 kWh frenados → 0,70 kWh a la batería + 0,10 kWh de pérdidas motor/transmisión + 0,06 kWh de fricción.
  - La cita de la gráfica debe separar con claridad lo que es dato real (ciclo y coeficientes EPA) de lo que es modelo (reparto regenerativo/fricción con parámetros de FASTSim).
- **Datos medidos de regeneración (corriente de batería):** el D3 de Argonne **no fue accesible** desde aquí: anl.gov devuelve HTTP 403 a clientes automáticos y osti.gov rechazó la conexión. Ver §4. Si Dylan lo abre en su navegador y la descarga del Model 3 2020 resulta libre, serviría de validación (superponer la potencia de batería medida a la modelada).

---

## 2. Casos de uso candidatos (ordenados)

### 1) FASTSim (NLR/NREL), recomendado. CONFIRMADO (código leído en v3.1.0)
- Repositorio: https://github.com/NatLabRockies/fastsim (redirige desde NREL/fastsim). Licencia **Apache-2.0** (archivo `LICENSE`). Rama por defecto `fastsim-3`. Último *release* `v3.1.0`, publicado el 2026-08-31.
- README (cita): "Developed by the National Laboratory of the Rockies (NLR), it provides fast, credible estimates of powertrain performance and energy consumption." / "It occupies a practical middle ground between basic efficiency assumptions and detailed component/control models".
- **Qué calcula.** `fastsim-core/src/simdrive/mod.rs` (v3.1.0, l. 585–643): cada paso, la potencia de tracción como suma de términos físicos:
  - `pwr_accel = mass / (2.0 * dt) * (speed² − speed_prev²)` ⇒ ΔK/Δt
  - `pwr_drag = 0.5 * Air::get_density * drag_coef * frontal_area * ((speed + speed_prev)/2)³`
  - `pwr_rr = mass * ACC_GRAV * wheel_rr_coef * cos(atan(grade)) * (speed_prev + speed)/2`
  - `pwr_tractive = pwr_rr + pwr_whl_inertia + pwr_accel + pwr_ascent + pwr_drag`
- **Límite de potencia y rendimiento en la regeneración.** `fastsim-core/src/vehicle/powertrain/electric_machine.rs`:
  - l. 248–253: `pwr_mech_regen_max = pwr_out_max.min(pwr_in_bwd_lim / eff_at_max_regen)` (comentario en el código: "maximum power in backward direction is minimum of component `pwr_out_max` parameter or time-varying max power in bacward direction (i.e. regen) based on what the ReversibleEnergyStorage can provide").
  - l. 339–343: `pwr_mech_prop_out = pwr_out_req.max(-pwr_mech_regen_max)`, con el comentario "excess is handled by `pwr_mech_dyn_brake`".
  - l. 413–421: en regeneración, `pwr_elec_prop_in = pwr_mech_prop_out * eff`, es decir, la potencia eléctrica es η por la mecánica.
- **La fricción** queda como el remanente. `vehicle_model.rs` l. 954–962 calcula `pwr_brake`, que la documentación define como "Total braking power including regen" (l. 1348).
- **Límite por estado de carga.** `reversible_energy_storage.rs` l. 394–428 (`set_pwr_charge_max`): la potencia de carga máxima cae linealmente dentro de un *buffer* de SOC y se vuelve cero en `max_soc`. También limita a `(max_soc − soc)·E_cap/dt`. Comentario: "to protect against excessive topping off of the battery". La batería aplica su propio η en l. 311–328.
- **Parámetros del vehículo** (`fastsim-core/resources/vehicles/2022 Tesla Model 3 RWD thrml.yaml`, v3.1.0, sha256 a66abe1b…):
  - Motor: `pwr_out_max_watts: 239000.0`; rendimiento del motor en función de la fracción de potencia: 0,84 (a 0), 0,86, 0,88, 0,90, 0,91, 0,92 (a 0,1), 0,94 (0,2), 0,95 (0,4–0,6), 0,94, 0,93 (a 1,0).
  - Transmisión: `eff_interp: 0.98`.
  - Batería: `eff_interp: Constant 0.9848857801796105`, `pwr_out_max_watts: 201227.4239`, `energy_capacity_joules: 194400000.0` (= 54 kWh, cálculo propio), `min_soc 0.05`, `max_soc 0.98`.
  - Chasis: `drag_coef 0.23`, `frontal_area 2.22 m²`, `wheel_rr_coef 0.007`, `mass_kilograms 1752.0`, `pwr_aux_base_watts 250.0`.
  - Chasis, para la adherencia (leído el 2026-11-11 en el mismo archivo, mismo sha256): `wheel_fric_coef: 0.7`, `drive_type: RWD`, `drive_axle_weight_frac: 0.59`, `cg_height_meters: -0.53`, `wheel_base_meters: 2.87528`.
  - Límite de tracción de FASTSim 3.1.0 (`fastsim-core/src/vehicle/vehicle_model.rs`, `set_curr_pwr_out_max`, l. 966–991, sha256 b342f797…): `max_trac_accel = wheel_fric_coef * drive_axle_weight_frac * ACC_GRAV / (1 + weight_transfer_sign * |cg_height| * wheel_fric_coef / wheel_base)`, con `weight_transfer_sign = -1.0` en RWD (comentario: "weight shifts toward rear drive axle → increases traction"). Con g = 9,81 m/s² da 4,65 m/s² (cálculo propio). Lo usa el modo «Conducir» del laboratorio (tarea D3).
  - Estos valores son estimaciones del equipo de FASTSim, no datos de Tesla.
- **Versión anterior (FASTSim 2), modelo explícito de desvanecimiento a baja velocidad.** Rama `fastsim-2`, `python/fastsim/simdrive.py` l. 912–919:
  ```
  regen_contrl_lim_kw_perc = max_regen / (1 + regen_a * exp(-regen_b * (mph_promedio + 1)))
  cyc_regen_brake_kw = max(min(cur_max_mech_mc_kw_in * trans_eff, regen_contrl_lim_kw_perc * -cyc_whl_kw_req), 0)
  cyc_fric_brake_kw = -min(cyc_regen_brake_kw + cyc_whl_kw_req, 0)
  ```
  - Valores típicos: `max_regen: 0.98`, `regen_a: 500.0`, `regen_b: 0.99` (p. ej. `cal_and_val/f2-vehicles/2016 Leaf 24 kWh.yaml`).
  - En `fastsim-core/src/compat/fastsim_2/mod.rs` l. 225 y 313–314 aparecen marcados "TODO: placeholder". Son valores por defecto, no una medición.
  - La guía de migración dice: "Not in FASTSim 3; FASTSim 3 handles regen limits via powertrain controls."
- **Por qué modelar la física supera las alternativas.**
  - (a) Una **constante "la regeneración recupera X %"** no sirve: con el mismo auto y el mismo modelo, la energía devuelta a la batería es el 43,9 % de la tracción en UDDS, el 13,6 % en HWFET y el 34,5 % en US06 (cálculo propio, §7). La fracción depende de cuánto se frena, a qué velocidad y con qué potencia.
  - (b) Una **tabla precalculada de autonomía por ciclo** no responde a preguntas nuevas: otro ciclo, otra masa, batería llena o fría, otro límite de potencia. El modelo sí, porque cada término sale de F·v y de ΔK.
  - (c) El modelo además **separa** cuánto se pierde en aire y rodadura, cuánto en fricción y cuánto en el motor. Una cifra agregada no permite saber dónde mejorar.
- **Qué cuesta.**
  - Hacen falta parámetros: coeficientes de carga, masa, mapas de rendimiento, límites.
  - Algunos son estimados o *placeholders* (regen_a, regen_b), y la calidad depende de calibrarlos con dinamómetro.
  - El modelo es cuasi-estático: ignora transitorios térmicos del frenado, el reparto delantero/trasero y el ABS.
  - En FASTSim 3, el BEV no tiene desvanecimiento a baja velocidad: todo el frenado, hasta el límite de potencia, se trata como recuperable. Eso sobreestima un poco la regeneración.

### 2) Software de control del dinamómetro de chasis (EPA, 40 CFR 1066.210). CONFIRMADO (texto legal leído)
- eCFR, 40 CFR § 1066.210 "Dynamometers" (versión al 2026-09-01, API `https://www.ecfr.gov/api/versioner/v1/full/2026-09-01/title-40.xml?part=1066&section=1066.210`).
  - Cita: "A chassis dynamometer typically uses electrically generated load forces combined with its rotational inertia to recreate the mechanical inertia and frictional forces that a vehicle exerts on road surfaces (known as “road load”)."
  - El texto pide medir a "10 Hz or faster" y aplicar una fuerza F_R a partir de A ("frictional load"), B ("load from drag and rolling resistance … in lbf/(mi/hr) or N·s/m"), C ("aerodynamic effects … in lbf/(mi/hr)² or N·s²/m²"), M_e ("effective mass … including the effect of rotating axles"), el término de aceleración con (v_i − v_{i−1})/(t_i − t_{i−1}) y la pendiente G_i, con a_g = 9,80665 m/s².
  - La ecuación está publicada como imagen (`/graphics/er29jn21.264.gif`), que no pude ver (devuelve HTML). La forma F_R = A + B v + C v² + M_e·dv/dt + M a_g sin(atan(G/100)) se **reconstruye de la lista de variables**; la forma exacta tipográfica queda NO CONFIRMADA.
- **Qué calcula:** en lazo cerrado y en tiempo real, la fuerza que el rodillo debe oponer a la rueda para que el auto "crea" que está en la carretera. Es el mismo F = A + Bv + Cv² de la Test Car List.
- **Por qué la física y no una tabla:** el dinamómetro responde a la velocidad real que el auto logra, no a la del guion. Un perfil de fuerza pregrabado se desincronizaría al primer error del conductor y no conservaría la energía. Durante el frenado regenerativo en la prueba EPA, el rodillo es quien "devuelve" ½mv² al auto, y solo así la batería se recarga como en la calle.
- **Qué cuesta:** calibrar A, B y C con pruebas de desaceleración libre (*coastdown*) en pista, ver la subparte D del mismo texto (NO CONFIRMADO: no la abrí). Además, en un dinamómetro de 2 ruedas el eje no motriz no gira, de ahí M_e.
- Es buen caso, pero no es "software" visible para el estudiante. Lo recomiendo como contexto: así se generan los datos de la EPA que usa la gráfica.

### 3) Mezcla de frenado (*brake blending*) en el auto: Nissan e-Pedal, Tesla, Hyundai i-Pedal. Parcialmente CONFIRMADO
- **Nissan, nota de prensa "e‑Pedal: Easy driving using only the accelerator pedal"** (6 de diciembre de 2017), https://global.nissannews.com/en/releases/e-pedal-easy-driving-using-only-the-accelerator-pedal:
  - "Easing off the accelerator pedal creates a deceleration force (max 0.2G) comparable to stepping on the brake pedal."
  - Al soltar el pedal, "regenerative and friction brakes are applied automatically".
- **Manual del LEAF 2025** (Nissan Malta), sección "Regenerative brake system", https://www.nissan.com.mt/ownership/owners-manuals/manuals.html/iom/leaf/0ze2/e0/2025/regenerative-brake-system-1.shtml:
  - "Less deceleration is provided by the regenerative brake system when the Li-ion battery is fully charged."
  - Se reduce "automatically … when the battery temperature is high/low".
  - En la sección e-Pedal (misma serie, `e-pedal-driving-features-1.shtml`): "The maximum deceleration changes according to the vehicle speed."
- **Tesla:** el manual (tesla.com/ownersmanual) devuelve HTTP 403, así que queda **NO CONFIRMADO**. Solo hay foros y prensa: Electrek (2022) sobre la compensación con frenos de fricción cuando la regeneración está limitada por temperatura o SOC. Es fuente secundaria.
- **Qué calcula el software:** reparte la desaceleración pedida entre el par negativo del motor (limitado por P_máx, por la corriente de carga admisible según SOC y temperatura, y por la adherencia del eje motriz) y la presión hidráulica.
- **Contra:** el código es propietario. Las ecuaciones exactas no son verificables, solo el comportamiento declarado. Por eso lo pongo tercero, como ejemplo del "qué falta" (paso 3).

### Otros (no recomendados)
- **SAE J1634** (procedimiento de autonomía de BEV, ciclos múltiples): la norma es de pago y no la abrí, NO CONFIRMADO. Sirve solo de contexto.

---

## 3. Fuentes

| # | Título | Autores | Año | Editor | URL | Estado |
|---|---|---|---|---|---|---|
| 1 | Dynamometer Drive Schedules | U.S. EPA | página actualizada el 22 de junio de 2026 | U.S. Environmental Protection Agency | https://www.epa.gov/vehicle-and-fuel-emissions-testing/dynamometer-drive-schedules | CONFIRMADO |
| 2 | EPA Urban Dynamometer Driving Schedule (uddscol.txt) | U.S. EPA | archivo, Last-Modified 2021-06-25 | U.S. EPA | https://www.epa.gov/sites/default/files/2015-10/uddscol.txt | CONFIRMADO (descargado) |
| 3 | Highway Fuel Economy Test (hwycol.txt) | U.S. EPA | Last-Modified 2021-06-25 | U.S. EPA | https://www.epa.gov/sites/default/files/2015-10/hwycol.txt | CONFIRMADO |
| 4 | US06 Supplemental FTP Driving Schedule (us06col.txt) | U.S. EPA | Last-Modified 2025-03-31 | U.S. EPA | https://www.epa.gov/system/files/other-files/2025-03/us06col.txt | CONFIRMADO |
| 5 | Data on Cars used for Testing Fuel Economy (2025 Test Car List Data, xlsx, enero de 2026) | U.S. EPA | 2026 | U.S. EPA | https://www.epa.gov/compliance-and-fuel-economy-data/data-cars-used-testing-fuel-economy (archivo: https://www.epa.gov/system/files/documents/2026-01/25-testcar-2026-01-21.xlsx) | CONFIRMADO (descargado) |
| 6 | Test Car List Field Definitions: Years 2000-2009 | U.S. EPA | agosto de 2026 | U.S. EPA | https://www.epa.gov/system/files/documents/2026-08/fuel-economy-test-car-list-field-definitions-for-model-years-2000-2009_1.pdf | CONFIRMADO (define "Dynamometer Target Coefficient A (lbf)", B (lbf/mph), C (lbf/mph**2)) |
| 7 | EPA Disclaimers: Copyright Status | U.S. EPA | página actualizada el 21 de septiembre de 2026 | U.S. EPA | https://www.epa.gov/web-policies-and-procedures/epa-disclaimers | CONFIRMADO |
| 8 | FASTSim v3.1.0 (código, README, LICENSE, archivo del Tesla Model 3 RWD 2022) | National Laboratory of the Rockies (antes NREL) | 2026 (release del 31 de agosto) | GitHub NatLabRockies | https://github.com/NatLabRockies/fastsim/tree/v3.1.0 | CONFIRMADO |
| 9 | FASTSim 2, `python/fastsim/simdrive.py` (rama fastsim-2, último commit 2026-02-11, 63808be) | NREL/NLR | 2026 | GitHub | https://github.com/NatLabRockies/fastsim/blob/fastsim-2/python/fastsim/simdrive.py | CONFIRMADO |
| 10 | 40 CFR § 1066.210 Dynamometers | U.S. EPA (eCFR) | versión del 2026-09-01 | Office of the Federal Register | https://www.ecfr.gov/current/title-40/part-1066/section-1066.210 | CONFIRMADO el texto; ecuación (imagen) NO CONFIRMADA visualmente |
| 11 | Characterizing Regenerative Braking of the Tesla Model 3 Using Chassis Dynamometer Testing (SAE 2026-01-0453) | B. B. Pierce, M. Di Russo, D. Das, L. Zhan, K. Stutenberg (Argonne) | 2026 (7 de abril; WCX, Detroit) | SAE International | https://doi.org/10.4271/2026-01-0453 | CONFIRMADO el resumen; texto completo NO CONFIRMADO (de pago) |
| 12 | Comparison of Regenerative Braking Efficiencies of MY2012 and MY2013 Nissan Leaf | A. Boretti | 2016 | Int. J. of Engineering and Technology Innovation 6(3), p. 214 | https://researchrepository.wvu.edu/faculty_publications/2509 | CONFIRMADO el resumen; PDF (403) NO CONFIRMADO |
| 13 | Analysis of the Regenerative Braking Efficiency of a Latest Electric Vehicle (SAE 2013-01-2872) | A. Boretti (RMIT) | 2013 | SAE International | https://doi.org/10.4271/2013-01-2872 | CONFIRMADO el resumen |
| 14 | e‑Pedal: Easy driving using only the accelerator pedal | Nissan | 2017 (6 de diciembre) | Nissan Global Newsroom | https://global.nissannews.com/en/releases/e-pedal-easy-driving-using-only-the-accelerator-pedal | CONFIRMADO |
| 15 | Nissan LEAF 2025 Owner's Manual, "Regenerative brake system" | Nissan | 2025 | Nissan (sitio de Malta) | https://www.nissan.com.mt/ownership/owners-manuals/manuals.html/iom/leaf/0ze2/e0/2025/regenerative-brake-system-1.shtml | CONFIRMADO |
| 16 | fueleconomy.gov, ficha con "1 gallon of gasoline=33.7 kWh" | U.S. DOE/EPA | 2026 | fueleconomy.gov | https://www.fueleconomy.gov/feg/noframes/33336.shtml | CONFIRMADO |
| 17 | Downloadable Dynamometer Database (D3) | Argonne National Laboratory | — | ANL | https://www.anl.gov/taps/d3-downloadable-dynamometer-database | **NO CONFIRMADO** (HTTP 403) |
| 18 | D3 2020 Tesla Model 3 | Argonne | — | ANL | https://www.anl.gov/taps/d3-2020-tesla-model-3 | **NO CONFIRMADO** (403; solo visto en resultados de búsqueda) |
| 19 | D3 dataset record (OSTI 3376961) | Argonne | 2026 (según buscador) | OSTI | https://www.osti.gov/dataexplorer/biblio/dataset/3376961 | **NO CONFIRMADO** (conexión rechazada) |
| 20 | WLTP, UNECE GTR No. 15 | UNECE WP.29 | — | UNECE | https://unece.org/transport/standards/transport/vehicle-regulations-wp29/global-technical-regulations-gtrs | **NO CONFIRMADO** (403) |
| 21 | Física para ciencias e ingeniería, Vol. 1, 10.ª ed. (teorema trabajo–energía, potencia) | R. A. Serway y J. W. Jewett Jr. | 2018 | Cengage | (ya citada en el repo) | ref. de clase |

**Licencia de los datos EPA** (fuente 7, sección "Copyright Status"): "The U.S. Government retains a nonexclusive, royalty-free license to publish or reproduce these documents, or allow others to do so, for U.S. Government purposes. These documents may be freely distributed and used for non-commercial, scientific and educational purposes." La misma página: "Unless otherwise specified, geospatial data produced by the EPA is by default in the public domain … under 17 U.S.C. § 105". Esa frase habla de datos geoespaciales; para los ciclos vale la cláusula educativa. Un portafolio universitario entra en "educational purposes" (CONFIRMADO).

---

## 4. Archivos de datos

| Archivo | URL | Formato | Unidades | Licencia | Contenido verificado (cálculo propio) |
|---|---|---|---|---|---|
| `uddscol.txt` (sha256 cc9f3edf…) | fuente 2 | texto ASCII separado por tabuladores, CRLF; encabezado de 2 líneas ("Test Time, secs  Target Speed, mph") | s, mph | EPA, uso educativo libre | 1370 filas, t = 0…1369 s; distancia 11,990 km = 7,450 mi; v_máx 56,7 mph; v media 19,58 mph; 17 detenciones; 259 s a 0 mph; desaceleración máx. 1,475 m/s² (0,150 g) |
| `hwycol.txt` (e48e278a…) | fuente 3 | ídem | s, mph | ídem | 0…765 s; 16,507 km = 10,257 mi; v_máx 59,9 mph |
| `us06col.txt` (84e9d8cc…) | fuente 4 | ídem (encabezado entre comillas) | s, mph | ídem | 0…600 s; 12,888 km = 8,008 mi; v_máx 80,3 mph; desaceleración máx. 3,085 m/s² (0,314 g) |
| `25-testcar-2026-01-21.xlsx` (f131cbb3…) | fuente 5 | xlsx, 1 hoja, 4288 filas | ETW en lb; A en lbf, B en lbf/mph, C en lbf/mph² (encabezados del archivo) | EPA | ver §5 |
| `fastsim/tesla_m3.yaml` (a66abe1b…) | fuente 8 | YAML | SI | Apache-2.0 | ver §2 |

La página EPA dice: "files contain tab delimited ASCII columns".

**Cómo reproducir:**
1. `curl -sL -o uddscol.txt https://www.epa.gov/sites/default/files/2015-10/uddscol.txt`
2. Descargar el xlsx 2025. Convertirlo con `python3 -I scripts/xlsx2csv.py 25-testcar-2026-01-21.xlsx 25-testcar.csv` (solo librería estándar). Filtrar con `python3 -I scripts/find_ev.py 25-testcar.csv "model 3"`.
3. `python3 -I scripts/energy_balance.py uddscol.txt 4250 27.02 0.2873 0.0122 0.80 239 out.csv`. Argumentos: ciclo, ETW [lb], A, B, C, η simple, P_máx [kW] y CSV de salida. El CSV `data/frenado/out/m3lr-rwd-uddscol.csv` tiene, por segundo: v, P_rueda, P_regen, P_fricción y las energías acumuladas (tracción, carga en carretera, frenado, batería, fricción). Es la serie lista para la gráfica.

**D3 de Argonne (punto 3 del encargo).** No se pudo comprobar si la descarga es libre, el formato ni los términos.
- anl.gov respondió 403 a curl y a WebFetch. Un intento con cabeceras de navegador fue bloqueado por la política del entorno.
- osti.gov rechazó la conexión.
- Indicios indirectos, todos NO CONFIRMADOS:
  - Resultados de búsqueda listan "2023 Hyundai Ioniq5, 2020 Tesla Model 3, 2020 Chevrolet Bolt" en la página EV de D3 y mencionan una frase de atribución obligatoria.
  - Un repositorio de terceros (`mpalmer79/vehicle-thermal-management-simulation`) dice que sus archivos "comprehensive" de D3 fueron "supplied by Argonne in response to VTMS data request". Eso sugiere que los datos completos de 10 Hz pueden requerir solicitud.
  - Otro repositorio (`Faisal-dev-pro/BEV-LMDI-Paper-B`) cita las pruebas "62005005–62007009 (2020 Tesla Model 3 Long Range AWD)".
- **Acción para Dylan:** abrir https://www.anl.gov/taps/d3-2020-tesla-model-3 en el navegador y anotar:
  - si hay descarga directa sin registro;
  - el texto de atribución exacto;
  - si las columnas incluyen voltaje y corriente de batería (con eso, P = V·I < 0 marca la regeneración).

---

## 5. Números clave (copiados de la fuente)

**EPA 2025 Test Car List, Tesla Model 3 Long Range RWD**, vehículo `3R124-782214`, tracción trasera, combustible de prueba "Electricity":

| Campo | Valor (tal cual en el archivo) |
|---|---|
| Equivalent Test Weight (lbs.) | 4250 |
| Target Coef A (lbf) | 27.02 |
| Target Coef B (lbf/mph) | 0.2873 |
| Target Coef C (lbf/mph**2) | 1.2200000000000001E-2 |
| Set Coef A / B / C | −3.87 / 0.1585 / 1.1299999999999999E-2 |
| Test Number (UDDS) | RTSL10086702, "Charge Depleting UDDS", RND_ADJ_FE = 207, FE_UNIT = "MPG" |
| Test Number (HWFET) | RTSL10086700, "Charge Depleting Highway", RND_ADJ_FE = 183 |

- Las definiciones EPA llaman "Dynamometer Target Coefficient" a A/B/C y "Dynamometer Set Coefficient" a los Set. Que los Target representen al auto en carretera y los Set sean el ajuste del rodillo que compensa sus propias pérdidas es interpretación mía, coherente con 40 CFR 1066 pero NO CONFIRMADA en texto. **Usar los Target.**
- La unidad "MPG" para un BEV debe leerse como MPGe. Que 207 sea el valor sin ajustar medido en el enchufe (incluye pérdidas de carga) es interpretación mía: **NO CONFIRMADO** (las definiciones 2000–2009 no cubren `RND_ADJ_FE`).

**Conversión a SI** (cálculo propio; 1 lb = 0,45359237 kg, 1 lbf = 4,4482216 N, 1 mph = 0,44704 m/s):

| | Valor SI |
|---|---|
| m = ETW | 1927,77 kg |
| A | 120,19 N |
| B | 2,8587 N·s/m |
| C | 0,27155 N·s²/m² |

**Nissan LEAF 2025** (`KWB115`, tracción delantera): ETW 3875 lb; A 25.89 lbf; B 0.34489999999999998 lbf/mph; C 1.9449999999999999E-2 lbf/mph²; UDDS RND_ADJ_FE 174 / 177.1.
- Prueba del LEAF: test id JNSX10050525, configuración 0, Charge Depleting UDDS, RND_ADJ_FE 174 — EPA Test Car List 2025 (fuente 5).

**Eficiencias y límites medidos o publicados:**
- Boretti 2016 (resumen; Leaf MY2012 vs MY2013, UDDS):
  - "the efficiency propulsive power to vehicle / power from battery are basically unchanged, at about 87-89 %"
  - "the efficiency power to the battery / braking power to vehicle are significantly improved from values of about 70-80 %" … "to values of 72-87 %".
  - **Este es el η de rueda a batería que conviene usar (≈ 0,80).**
- Boretti 2013 (resumen, SAE 2013-01-2872): propulsión "approaches 90%" y regeneración ida y vuelta "the 70%".
- Argonne 2026 (resumen, SAE 2026-01-0453, Model 3 2020):
  - consumo de "3.62 miles/kWh" en ciudad, "3.40 miles/kWh" en carretera y "2.53 miles/kWh" en conducción agresiva;
  - la conducción agresiva tuvo la mayor recuperación;
  - la recuperación es más eficiente entre "10 – 30 mph", y el motor trasero hace prácticamente toda la regeneración;
  - el modo Standard da "57% greater deceleration" que el modo Low en desaceleración libre.
- Nissan e-Pedal: desaceleración máx. "0.2G" (2017).
- Manual LEAF 2025: la regeneración se reduce con la batería llena y con la temperatura de la batería alta o baja.
- FASTSim (parámetros de modelo, no mediciones de Tesla):
  - motor: P_máx 239 kW, η 0,84–0,95 según la carga;
  - transmisión: η 0,98;
  - batería: η ≈ 0,985, P_máx 201 kW;
  - SOC máx. 0,98;
  - FASTSim 2: max_regen 0,98, con desvanecimiento por debajo de ≈ 6 mph (regen_a = 500, regen_b = 0,99).
- MPGe: "1 gallon of gasoline=33.7 kWh" (fueleconomy.gov).

---

## 6. Física en pasos (estilo de la casa)

Convenciones: Serway; g = 9,81 m/s² (solo aparece si se añade pendiente; el CFR usa 9,80665 y no afecta en terreno plano); SI; decimales con coma.

### Paso 1. Frenar es quitar energía cinética
Teorema trabajo–energía: el trabajo neto sobre el auto es igual al cambio de su energía cinética.

$$W_\text{neto} = \Delta K = \tfrac12 m v_f^2 - \tfrac12 m v_i^2$$

Para detenerse desde v (v_f = 0), las fuerzas que frenan deben hacer W = −½mv².
- Ejemplo (cálculo propio): m = 1927,77 kg a 50 km/h (13,89 m/s) da K = 185,9 kJ = 0,0516 kWh.
- El UDDS tiene 17 detenciones y muchas desaceleraciones parciales. Sumando todas las bajadas de K a lo largo del ciclo, **ΔK quitado = 4,045 MJ = 1,124 kWh** (cálculo propio).
- Modelo ingenuo: "un regenerativo ideal devolvería esos 1,12 kWh a la batería".

### Paso 2. Por qué no basta: el aire y las llantas frenan también
No todo ΔK pasa por los frenos: mientras el auto desacelera, la carga en carretera sigue haciendo trabajo negativo. La fuerza de carga en carretera tiene la forma de la EPA (fuentes 5, 6, 10):

$$F_\text{RL}(v) = A + Bv + Cv^2, \qquad P_\text{RL} = F_\text{RL}\,v$$

(A: rodadura y fricción, en N; B: términos lineales, en N·s/m; C: aerodinámica, en N·s²/m².)

La potencia que deben aportar las ruedas es

$$P_\text{rueda} = \frac{dK}{dt} + F_\text{RL}(v)\,v = m v \frac{dv}{dt} + (A + Bv + Cv^2)\,v$$

Si P_rueda > 0, el motor tracciona. Si P_rueda < 0, alguien tiene que **frenar** con potencia −P_rueda. Solo esa parte está disponible para regenerar.
- UDDS (cálculo propio): de los 1,124 kWh de K quitados, **0,255 kWh los disipa la carga en carretera** y **0,869 kWh exigen freno** (77,3 %).
- En HWFET solo el 45,6 % del ΔK quitado pasa por los frenos: en carretera el aire hace casi todo el trabajo de frenado.
- Comprobación: tracción − frenado = carga en carretera total. En UDDS, 1,5973 − 0,8686 = 0,7287 kWh, y la integral directa de F_RL·v da 0,7287 kWh ✓.

### Paso 3. Qué falta: el motor no recupera todo, ni a cualquier ritmo
El motor como generador tiene tres limitaciones:
1. **Rendimiento η < 1** de rueda a batería: transmisión × motor/inversor × batería. Boretti midió η de 0,70 a 0,87 en el Leaf.
2. **Potencia máxima** P_máx: del motor, y además la corriente de carga admisible de la batería, que baja con SOC alto y con frío (manual LEAF; FASTSim `set_pwr_charge_max`).
3. **A baja velocidad** el par regenerativo desaparece y termina el freno de fricción (FASTSim 2: f(v) = 0,98/(1 + 500·e^{−0,99(v_mph+1)}); e-Pedal: "regenerative and friction brakes"). Además, si la desaceleración pedida supera lo que el eje motriz puede dar (e-Pedal: 0,2 g), entra la fricción.

Lo que no recupera el motor lo disipan los frenos de fricción como calor:

$$P_\text{fric} = P_\text{freno} - P_\text{regen,rueda}$$

### Paso 4. Modelo mejorado: balance segundo a segundo sobre un ciclo
Con el ciclo EPA a Δt = 1 s, en cada intervalo [t_i, t_{i+1}]:

$$\bar v = \tfrac12(v_i + v_{i+1}),\qquad \Delta K_i = \tfrac12 m (v_{i+1}^2 - v_i^2),\qquad P_i = \frac{\Delta K_i}{\Delta t} + F_\text{RL}(\bar v)\,\bar v$$

$$P_{\text{freno},i} = \max(0, -P_i),\qquad P_{\text{regen},i} = \min\!\big(f(v)\,P_{\text{freno},i},\; P_\text{máx}\big)$$

$$E_\text{batería} = \sum_i \eta_i\,P_{\text{regen},i}\,\Delta t,\qquad E_\text{fricción} = \sum_i \big(P_{\text{freno},i} - P_{\text{regen},i}\big)\Delta t$$

$$E_\text{tracción} = \sum_i \max(0, P_i)\,\Delta t,\qquad \text{fracción recuperada} = \frac{E_\text{batería}}{E_\text{tracción}}$$

- Versión simple para el texto: η constante y P_máx, es decir E_regen = η Σ min(P_freno, P_máx) Δt.
- Versión FASTSim: η_i = 0,98 × η_motor(P/239 kW), con f(v) de FASTSim 2.
- Este es el mismo esquema que FASTSim 3 (`pwr_accel = m/(2Δt)(v² − v_prev²)` y velocidad media del intervalo).

---

## 7. Cálculos principales (cálculo propio)

Tesla Model 3 LR RWD 2025: m = 1927,77 kg; A = 120,19 N; B = 2,8587 N·s/m; C = 0,27155 N·s²/m². Terreno plano, sin inercia de ruedas aparte (ETW ya la aproxima), sin auxiliares.

**UDDS (1369 s, 11,99 km):**

| Magnitud | kWh | MJ | Wh/mi |
|---|---|---|---|
| Energía de tracción en ruedas, Σ max(0, P) | **1,597** | 5,750 | 214,4 |
| Energía cinética quitada, Σ (−ΔK) en desaceleraciones | **1,124** | 4,045 | 150,8 |
| … de la cual la disipa la carga en carretera | **0,255** | 0,918 | 34,2 |
| … de la cual exige freno (= energía de frenado en ruedas) | **0,869** | 3,127 | 116,6 |
| Carga en carretera total del ciclo (A: 0,400; Bv: 0,130; Cv²: 0,198) | 0,729 | 2,623 | 97,8 |
| Recuperable en ruedas tras el desvanecimiento a baja velocidad, f(v) | 0,807 | 2,903 | 108,2 |
| **Almacenado, η constante 0,80, P_máx 239 kW** | **0,695** | 2,502 | 93,3 |
| **Almacenado, cadena FASTSim (0,98 × η_motor), en bornes** | **0,702** | 2,525 | 94,2 |
| … químico, × 0,985 | 0,691 | 2,487 | 92,7 |
| Fricción (FASTSim 2 f(v)) | 0,062 | 0,224 | 8,3 |
| Pérdidas motor + transmisión en la regeneración (0,807 − 0,702) | 0,105 | — | — |

- **Fracción de la energía de tracción recuperada: 43,5 % (η = 0,80) / 43,9 % (cadena FASTSim).**
- Energía de frenado / tracción: 54,4 %. Batería / frenado en ruedas: 80,8 %.
- Energía neta en ruedas con regeneración: 0,896 kWh (120,2 Wh/mi); sin regeneración serían 1,597 kWh (214,4 Wh/mi).
- La potencia de frenado máxima en ruedas es solo **33,2 kW** y la desaceleración máxima 0,150 g. En UDDS el límite de 239 kW no actúa, y tampoco actúa un límite de 60 kW o de 30 kW (pierde solo 0,002 kWh).
  - Con P_máx = 20 kW, el almacenado (η = 0,80) baja de 0,695 a 0,657 kWh.
  - Con 10 kW, baja a 0,487 kWh.

**Comparación entre ciclos (mismo auto, cadena FASTSim):**

| Ciclo | Tracción kWh | Frenado kWh | ΔK quitado kWh | A batería kWh | Batería / tracción | P_freno máx. | Desacel. máx. |
|---|---|---|---|---|---|---|---|
| UDDS | 1,597 | 0,869 | 1,124 | 0,702 | **43,9 %** | 33,2 kW | 0,150 g |
| HWFET | 1,775 | 0,285 | 0,624 | 0,242 | **13,6 %** | 47,1 kW | 0,150 g |
| US06 | 2,432 | 0,976 | 1,452 | 0,839 | **34,5 %** | 70,8 kW | 0,314 g |

- En US06 la desaceleración supera los 0,2 g del e-Pedal, así que habría fricción adicional que este modelo no incluye.
- Con P_máx = 30 kW, US06 pasa de 0,781 a 0,632 kWh almacenados (η = 0,80). El límite de potencia importa en conducción agresiva, no en ciudad.

**Nissan LEAF 2025, UDDS:** tracción 1,605 kWh; frenado 0,749 kWh (46,7 %); a batería 0,601 kWh (**37,4 %** de la tracción). El LEAF es más liviano, pero su C es mayor (más aire), así que pierde más en carretera y le queda menos para frenar.

**Coherencia con el dato EPA (con reservas):**
- Si 207 MPGe en UDDS es energía tomada del enchufe, el auto usó 33,7/207 = **162,8 Wh/mi** (cálculo propio). Eso es menos que los 214,4 Wh/mi de tracción en ruedas sin regeneración.
- Por tanto, aun con un tren motriz perfecto, el auto debió recuperar ≥ 51,6 Wh/mi. Es evidencia directa de que la regeneración existe y es grande.
- Con la regeneración modelada, la energía neta en ruedas es de 120,2 Wh/mi, lo que implica ≈ 74 % de enchufe a rueda neta. Es plausible: carga, inversor y motor, más 250 W de auxiliares ≈ 12,7 Wh/mi.
- Depende de la interpretación de RND_ADJ_FE (NO CONFIRMADO).
- Hay coherencia de orden con Argonne 2026: el Model 3 2020 midió 3,62 mi/kWh en ciudad, es decir 276 Wh/mi. Es otra versión del auto, AWD, y otra base de medida, así que **no es comparable directamente**.

---

## 8. Trampas y advertencias

1. **ETW no es la masa en vacío.** La EPA usa el peso equivalente de prueba (clase de inercia, con carga). FASTSim usa 1752 kg para el Model 3 2022. Hay que decir cuál se usa: ETW es lo coherente con los coeficientes A, B y C del mismo ensayo.
2. **Usar "Target", no "Set".** Los Set Coef (A = −3,87 lbf) son ajustes del dinamómetro, no la física del auto.
3. **Unidades imperiales.** B en lbf/mph y C en lbf/mph² se convierten con 0,44704 y 0,44704². Es un error frecuente: C_SI = C·4,44822/0,44704² (C_SI = 0,27155 N·s²/m², no 0,121).
4. **"Energía de frenado" ≠ "ΔK quitado".** La diferencia (0,255 kWh en UDDS) es la carga en carretera durante las desaceleraciones. Conviene nombrar las cosas con precisión en la gráfica.
5. **El porcentaje depende del denominador.** "Recupera el 81 %" (de la energía de frenado) y "recupera el 44 %" (de la tracción) son el mismo cálculo. Hay que citar siempre el denominador.
6. **La regeneración es modelada, no medida.** El reparto regenerativo/fricción y η salen de FASTSim (con *placeholders* en FASTSim 2) y de Boretti. La gráfica debe decir "ciclo y coeficientes: EPA (datos reales); reparto: modelo (cálculo propio con parámetros de FASTSim)". Para "datos reales medidos" de corriente de batería hace falta el D3, NO CONFIRMADO.
7. **Ciclo de dinamómetro ≠ calle.** Sin pendiente, sin viento, a ~20–30 °C. La reducción por frío y por SOC alto (manual LEAF) no aparece en el UDDS estándar. Se puede mostrar como escenario: con P_máx = 10 kW, UDDS baja a 0,487 kWh.
8. **Dinamómetro de 2 ruedas:** en un RWD el eje delantero no gira (40 CFR 1066 usa M_e). El paper de Argonne confirma que en el Model 3 la regeneración la hace casi toda el motor trasero.
9. **Discretización:** 1 Hz con velocidad media del intervalo (igual que FASTSim). Con 10 Hz los números cambiarían poco, sin cuantificar aquí.
10. **WLTC clase 3:** no se pudo abrir la fuente oficial UNECE (403), NO CONFIRMADO. Un artículo de terceros da 1800 s y 23 194 m, frente a los 23,27 km que se suelen citar: hay discrepancia y no se debe usar sin la fuente oficial.
11. **Nomenclatura NREL → NLR:** el README actual de FASTSim dice "National Laboratory of the Rockies (NLR)" y el repositorio está en `NatLabRockies`. Hay que citarlo así y aclarar "(antes NREL)".
12. **Notación del repo:** la fuerza normal es `n`; aquí no aparece. Si se escribe la rodadura como μ_r n = μ_r m g, usar g = 9,81 m/s².
