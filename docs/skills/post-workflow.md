# SKILL: post-workflow — Cómo montar el workflow y la RECETA cronológica de un post

> **name:** post-workflow
> **description:** El marco de workflows de Neety (destilado del playbook interno) YA ADAPTADO a la creación de posts, más la receta cronológica paso a paso para devolver publicaciones casi listas. Define cómo orquestar, cuándo montar un workflow vs. un solo prompt, y dónde el "círculo" se para y te devuelve el control.
> **when-to-use:** Cargar al producir cualquier post de LinkedIn. Se apoya en todas las demás skills; NO las reemplaza — si algo aquí choca con `global-instructions` / `brand-voice` / `working-preferences` / `outliers-database` / `images` / `video`, **mandan ellas**.

---

## 0 · Regla de oro (precedencia)
Este archivo adapta el marco de "workflows" del playbook interno a la creación de posts. **Las skills basadas en datos mandan siempre.** El playbook está pensado para tareas abiertas (prospección, listas, webs); un post NO es una tarea 100% autónoma: tiene puntos donde, por diseño, el sistema se para y te devuelve el control (ver §5). No dejes que la idea de "que corra solo hasta el final" pise esas paradas.

---

## 1 · El marco, traducido a posts
Un solo concepto (el **workflow**) y dentro viven el resto:
- **Workflow** = el guion que ordena el trabajo, estructura fija (no improvisa el proceso a mitad).
- **Contexto** = de qué come. Aquí = **las demás skills** (una skill es contexto en MD) + la idea semilla que le das. Sin contexto, trabaja a ciegas.
- **Goal** = objetivo que no se suelta. En posts **no hay métrica autónoma que perseguir** (la viralidad no se mide antes de publicar) → los posts caen en el lado "objetivo abierto/creativo = puntos de control", NO en "persigue una métrica". El "objetivo" real de un post es pasar el pase de validación y darte 2-3 variantes para elegir.
- **Loop** = una etapa critica su propio resultado y lo rehace hasta pasar el listón de calidad. **Aquí el "listón" ES el pase de validación** (`global-instructions §8` + `working-preferences §2`). Este es el encaje perfecto del marco: corre el Loop en silencio antes de entregar.

---

## 2 · ¿Workflow o un solo prompt? (no sobre-ingenierices)
- **UN post suelto → suele bastar UN prompt bien dado** (pilar + cuenta + idea + objetivo). Con las skills cargadas, el modelo ya devuelve 2-3 variantes buenas. Montar un multi-agente para un tuit es matar moscas a cañonazos de verdad.
- **Monta workflow cuando pasa de 2-3 pasos y ves la película:**
  - **⭐ EL objetivo real = planificador semanal de las 3 cuentas** ("planifícame la semana"): workflow **paralelo** (una rama por cuenta) que intercala categorías de pilar entre cuentas. Es el workflow complejo que da sentido a todo esto — **detallado en §8**. NO montes uno por tipo de post; montas UNO que planifica la semana entera.
  - **Un post o un mapa suelto** → workflow **encadenado** (o incluso un solo prompt), con el runbook del pilar (§4).
- **Regla previa del playbook (válida):** antes de montar, imagina "si lo hiciera yo a mano, ¿qué pasos daría?" = el esqueleto (que es justo la receta de §4). Y si algo no está claro, pídele a Claude que te **haga preguntas** para validar el sistema antes de lanzarlo.

---

## 3 · Los 2 patrones aplicados a posts
- **Encadenado (en serie):** un objetivo, camino secuencial, cada paso necesita el anterior. Ej. mapa: idea → **verificar cifras** → hook → cuerpo → imagen → validación. Es el patrón por defecto de un post individual con verificación.
- **Paralelizado (en abanico):** ramas independientes que corren a la vez y al final se juntan. Ej. el planificador semanal (§8): rama Iker + rama Unai + rama Asier en paralelo → al final, un chequeo que aplica el intercalado de categorías del día.
- Dentro de cada rama, los pasos van encadenados (el runbook del pilar, §4).

---

## 4 · LA RECETA cronológica (esqueleto general + un runbook por pilar)

### 4.0 · Política de empresas y menciones @ (CORREGIDA — leer primero)
Antes se dejaban SIEMPRE vacías. **Ya no.** La regla nueva:
- **Rellena** los bloques de empresas y las menciones @ con datos **reales y verificables**, tomados de una **fuente**: (a) los datos del **mapa de pampam** o la lista que te pase el usuario, (b) fuentes públicas con cita (ICEX, cámara de comercio, INE/Eurostat, autoridad portuaria, prensa sectorial), o (c) **búsqueda web**, siempre citando de dónde sale.
- **Marca cada entrada** con su fuente y un nivel de confianza, y añade una lista corta **"revisa estas"** con las dudosas. El usuario da el visto bueno final.
- **NUNCA inventes.** Si no puedes verificar una empresa/persona, deja ese hueco como `→ [PENDIENTE · no verificado]` en vez de rellenarlo con algo falso. Un nombre inventado o un dato mal envenena el hilo (mapa de 6x → 0.5x).
- **Menciones @:** cargo con poder de decisión y actividad de CUALQUIER tipo (30 días para ordenar, 6 meses de techo); y una empresa con alguien dentro gana a una sin nadie. **Manda `§4.0d` punto 3.** ~~Solo quien haya COMENTADO a otros~~ se revirtió el 26/08.
- **Sin web ni fuente disponible** → compórtate como antes (deja el bloque vacío marcado y pídele la fuente al usuario). Mejor vacío que inventado.

### 4.0b · ⭐ MAPA vs "LOS 10": criterios de selección OPUESTOS (2026-07-17)
> Los dos son PELOTEO y los dos mencionan empresas y personas, así que es fácil mezclarlos. **Lo que se busca en cada uno no se parece.**

| | **MAPA** | **"LOS 10"** |
|---|---|---|
| **El protagonista** | La **EMPRESA** | La **PERSONA** |
| **Criterio** | Que encaje con **nuestro ICP** (`aboutme`): industrial B2B, 100-700 empleados, exportadora | Que su empresa esté **CRECIENDO** en el último año, con logro verificado |
| **Filtro común** | De esa región · persona **activa** (<3 meses) | De esa región · persona **activa** (<3 meses) |
| **¿Importa el crecimiento?** | **NO** | **SÍ, es el criterio entero** |
| **¿Importa el encaje ICP?** | **SÍ, es el criterio entero** | Sí, pero manda el crecimiento |

**⚠️ EL ERROR QUE YA SE COMETIÓ (Cataluña):** llegó un aviso de que Esteban Espuña *"sigue en pérdidas, y mencionarla en un post de empresas que van bien es un riesgo"*, y estuve a punto de cambiarla. **Es aplicarle a un mapa el criterio de "Los 10".** El mapa no dice que vayan bien: dice que **sostienen la industria de esa región**. Una empresa puede tener un mal año y seguir siendo un exportador industrial de manual. Sus cuentas no son el criterio de este pilar.
- **En el MAPA no se pide ni un logro ni una cifra por empresa.** Por eso su bloque es `→ @Empresa - @Persona`, sin `· logro`: no hay que justificar nada (`§4.2` Paso 10).
- **En "LOS 10" el logro ES la ficha**, y por eso ahí sí va (`→ @Persona - @Empresa · logro`) y por eso ahí sí se descarta a quien decrece.

### 4.0c · ⭐ REPETIR REGIÓN: la lista NUNCA repite empresa, y si no llegan 20, van 16 (2026-07-17)

Aplica al **MAPA y a "LOS 10" por igual**. Una región se puede repetir. **Una empresa no.**

**LA REGLA.** Si vas a hacer un peloteo de una región que ya hemos tocado, **ninguna empresa ni persona de tu lista puede haber salido en NINGÚN post anterior de esa región**. Cruza contra:
- los **mapas** anteriores de esa región,
- los **"Los 10"** anteriores de esa región — **el otro formato también cuenta**,
- y **todas las cuentas**, no solo la que publica.

**POR QUÉ, que es lo que hace que no se negocie:** el peloteo no existe para tener razón sobre una región, existe para que **empresas NUEVAS de esa región nos conozcan**, porque son clientes potenciales. Repetir empresa es gastar una plaza en alguien que ya nos vio. El post te sale igual de bonito y no te trae a nadie nuevo.

**SI NO LLEGAS A 20, NO RELLENES: BAJA A 16.** Un bloque menos (4×4 en vez de 5×4). Pierdes 4 menciones de alcance y no pasa nada. **Lo que no vale es completar con repetidas, y lo que tampoco vale es no publicar.** Busca las 20 siempre, en serio y con fuentes locales, pero si la región está exprimida, 16 nuevas baten a 20 con 4 recicladas. Y si tampoco llegas a 16, ese es el aviso de que esa región ya está agotada para ese formato: cambia de región.

**CÓMO SE COMPRUEBA (no lo hagas a ojo):** baja los posts de las 3 cuentas, quédate con los que mencionan esa región, saca sus líneas `→` y cruza tu lista **normalizando** — sin acentos, en minúscula y sin sufijos legales (`SA`, `SAU`, `SL`, `Group`, `Grupo`). Sin normalizar se cuela "Bioibérica" contra "Bioiberica" y "Prefabricados Pujol" contra "Prefabricats Pujol". Medido en Cataluña el 2026-07-17: **83 empresas y personas ya mencionadas** entre el mapa de Iker y el "Los 10" de Unai. Eso es lo que hay que esquivar, y a ojo no se esquiva.

**⭐ BUSCANDO EMPRESAS NO SE PARA NUNCA (Iker, 2026-07-31).** Si una no sirve o no salen suficientes, **se sigue: otra fuente, otra provincia, prensa local, otro endpoint**. Solo se para cuando es **imposible** encontrar más, y eso hay que haberlo intentado de verdad. La que no convence **se descarta sola, sin consultar**: no se devuelven dudas. Y **no se re-auditan empresas ya verificadas en la misma sesión** — eso es trabajo repetido, no rigor. Textual: *"no tienes que parar, tienes que seguir, seguir, seguir"*. Truco que salvó Asturias el 31/07: **adivinar el slug de LinkedIn no funciona** (fallaron 20 de 22); se busca por **keyword** con `category: companies`, y el endpoint `/linkedin/company/{x}` acepta también el **id numérico**, que a veces es la única forma de sacar una ficha.

**⚠️ Y LO CARO NO ES LA REGLA, ES LA BÚSQUEDA.** Cuando falten empresas, el reflejo es dar la región por agotada. En Cataluña un investigador devolvió *"0 de Girona, ninguna pasó el listón"* y **era falso**: buscando "Cataluña" a nivel autonómico, Barcelona se come los resultados. Atacando fuentes locales (el ranking provincial, el directorio del polígono de Riudellots, la prensa comarcal) salieron 8 gerundinas a la primera. **Antes de bajar a 16, busca por provincia y con prensa local.**

### 🌳🌳 4.0d · EL TRONCO COMÚN DEL PELOTEO REGIONAL: LO QUE COMPARTEN MAPA, "LOS 10" Y DESPIECE (Iker, 2026-09-16) — CANÓNICO

> **Iker:** *"creo que hay muchas diferencias entre lo pulida que está la receta del mapa, la de los 10 que retocamos ayer y la de despiece, cuando en realidad las tres, por mucho que cada una se represente con una imagen diferente, tienen en común ese orgullo peloteo regional y cosas como los clichés"*.

**Tenía razón y la auditoría lo confirma:** cada runbook se había ido corrigiendo por separado y el despiece arrastraba reglas viejas (menciones "que COMENTEN", enlace "tras las menciones", nada sobre clichés ni barrido). **Lo que es igual en los tres vive AQUÍ. Los runbooks solo guardan lo que de verdad los separa**, y cuando una regla de aquí se toque, se toca aquí (`working-preferences §0c-BIS`).

| | MAPA (`§4.2`) | "LOS 10" (`§4.3`) | DESPIECE (`§4.7`) |
|---|---|---|---|
| **Protagonista** | la empresa | la persona | la empresa, pieza a pieza |
| **Gancho** | 4 inamovibles | 3 inamovibles propios | los 4 del mapa, con el objeto dentro del remate |
| **Fichas** | 20, bloques de 4 | 10, bloques de 5, con logro | 12 exactas, bloques de 4, `→ Pieza: @Empresa - @Persona` |
| **Imagen** | PamPam | orla | llanta |
| **Todo lo demás** | ⬇️ tronco común | ⬇️ tronco común | ⬇️ tronco común |

**1 · LA VENTANA ANTES QUE LA REGIÓN.** Se cuentan los peloteos de las 3 cuentas en los 21 días previos: mediana **39.310** con 0-3, **16.726** con 4-5 y **2.360** con 6-7 (22 peloteos, medido el 2026-09-15). Con 4 o más se avisa; con 6 o más se mueve el post. Detalle en `§4.7` Paso 0.

**2 · EL GANCHO LO ENTIENDE CUALQUIERA** (Iker, 2026-09-16). Concepto, clichés y sitio, en palabras que conoce toda España. **Lo de allí baja al cuerpo.** El caso: `el garaje de la ría` → `el garaje del norte`. Iker: *"el concepto de garaje me encanta… pero el de la ría no creo que lo entienda cualquier persona"*. Mecanizado como fallo duro en los tres pilares (`GANCHO: sin vocabulario ni grafia LOCAL`). ⚠️ No es un veto a la grafía `tx`: `txistorra` va en el gancho de Navarra (79.224) y se entiende en toda España. La primera versión del check lo tumbaba.

**3 · LAS MENCIONES, con este orden de prioridad y sin excepciones de pilar:**
1. **Cargo con poder de decisión** (CEO/DG/gerente/fundador → dirección comercial o de exportación → marketing → dirección industrial). Sin eso no se menciona, aunque esté activísimo (`§4.2` Paso 4, `scripts/menciones.py`).
2. **Actividad de cualquier tipo en LinkedIn** (publicar, comentar o compartir): 30 días es lo ideal y sirve para ORDENAR; 3 meses si no hay nadie; 6 de techo. ~~"Que haya COMENTADO a otros"~~ se revirtió el 26/08.
3. **⭐ UNA EMPRESA CON ALGUIEN DENTRO GANA A UNA SIN NADIE (Iker, 2026-09-16).** *"hay muchas empresas en las que no has encontrado ninguna persona a la que mencionar. Esto es lo que tenemos que evitar al máximo a menos que no nos quede otra"*. La ficha sin persona sigue siendo válida, pero es **el último recurso**: antes se busca otra empresa que encaje y tenga un directivo activo. Solo si no la hay, se queda la ficha sin persona y se dice en la entrega con su número.
4. **El método que encuentra a esa gente es buscar PERSONAS primero:** Sales Navigator con `posted_on_linkedin: true`, la `location` de la región y el sector en `keywords`. Después se verifica la empresa (`§4.3` Paso 2). Probado el 16/09 en Bizkaia: sacó a Estampaciones Vizcaya con su gerente, que el barrido por empresas había dejado sin persona.
   - **⛔ Y ANTES DE DAR UNA EMPRESA POR "SIN NADIE", SE LEE LA PLANTILLA ENTERA (Iker, 2026-09-16).** *"Light Systems tiene un director, ¿por qué lo has descartado?"*. Tenía razón y eran **dos fallos de `scripts/menciones.py`**, ya arreglados: (a) la búsqueda classic devuelve 25 personas y no se paginaba, así que en una empresa de 128 empleados el directivo podía no salir → ahora se leen **todos** con Sales Navigator, página a página; (b) el cargo se puntuaba **solo por el titular**, y Ruben Saez tiene de titular `Head of R&D en UNO MINDA RINDER` y de cargo actual `Director departamento I+D+i` → ahora puntúa **titular + cargo actual**. El id de Sales Navigator (`ACwAA…`) se resuelve a `provider_id` antes de pedir la actividad (si no, devuelve listas vacías sin error). Y dos vetos que se colaban: `RR. HH.` con puntos y `QA` pegado a un guion bajo (`Deputy General Manager_QA`, que además ya no se salva por llevar "general manager": con `deputy`/`assistant`/`adjunto` delante no es un director general).
   - **Lo que queda "sin nadie" después de eso se dice con su motivo, empresa a empresa:** inactivo (0 posts y 0 comentarios, comprobado), pasado del techo de 6 meses, cargo vetado o una sola persona en LinkedIn. El directivo pasado del techo **se ofrece como excepción** y lo decide Iker.
5. **La empresa califica por su ORIGEN**, no por la ciudad de su página ni por tener una planta (`§4.2` Paso 4). **Se verifica contra su descripción de LinkedIn y, si ahí no lo dice, contra su web** (`§4.7` Paso 2).
6. **Ninguna empresa ni persona repetida** contra `menciones-usadas.json` (`§4.0c`), **y ningún cliente**: se cruza contra la lista de clientes de `/agendar/`.
7. **Las DOS menciones siempre que haya persona** (`§4.3` Paso 2), con los nombres exactos de LinkedIn, tagline incluido.

**4 · LOS CLICHÉS, IGUAL EN LOS TRES.** En el gancho van **los 2 más universales**. En el cuerpo van **otros, más locales, y como mínimo 8 guiños** (medido en el mapa: Navarra, 10 guiños → 79.224; Asturias, 4 → 2.297). **Los pueblos van con su oficio** y salen de las propias fichas (`global §4.1` 2b). ~~"4-8"~~ era la cifra vieja y seguía escrita en `global §4.1` y en `§4.3` Paso 3b.

**5 · EL FINAL, EN ESTE ORDEN EN LOS TRES:** lista → cuerpo con clichés y pueblos → **reveal tardío** con frase nueva → **barrido geográfico** en una línea corta → **línea de contexto del evento** si el enlace es Luma → **el bloque del enlace** → **cierre punchy** que rebota contra el concepto.

**6 · DÓNDE VA EL ENLACE: NO ESTÁ DECIDIDO, Y HAY UN A/B ABIERTO (Iker, 2026-09-16)**

> 🔴 **LO QUE NO SABEMOS, dicho sin adornos.** En 20 de los 21 peloteos con enlace, el enlace cae **entre el 88% y el 96% del texto**: siempre casi al final. **Con eso no se puede comparar "arriba contra abajo", porque abajo es lo único que hemos publicado.** Las dos versiones de este punto del 16/09 lo presentaban como medido y no lo estaba:
> - la primera mezclaba clics a PamPam con clics a nuestra web;
> - la segunda comparaba "0-3 líneas tras la lista" (0,184%) contra "4-10" (0,471%), **pero en esos posts la lista ya estaba al final**, así que las dos bandas son "enlace al final" y no responden a la pregunta.

**Lo único que empuja hacia ARRIBA, y viene de otros sitios:**
- **El correo** (`historial-newsletter`, 28/08): el enlace metido en la posdata sacó **2 clics en 682 envíos**; subido al cuerpo, **6 en 327**. Único cambio entre tandas, n pequeño.
- **El resto de pilares** (`global §4.4b-CLICS`): en prosa, el enlace antes del carácter 650 convierte más.
- **Iker, y es el criterio de quien lo ve en el móvil:** *"a nivel psicológico lo comprobamos incluso en los correos, poniendo el enlace en la posdata no pulsaba prácticamente nadie"*.

**El único peloteo con el enlace subido:** Cantabria, 01/09, **del 87% al 60%**, a petición de Iker (*"lo veo muy atrás"*). **13.021 impresiones y 21 clics en GA4 (0,161%)**. No se puede leer: un solo post, recién vueltos de vacaciones, y medido en GA4 cuando todos los demás están medidos en LinkedIn.

**LO QUE SÍ SE MANTIENE, porque está medido en todos los pilares:** el enlace **nunca en la última línea** y **nunca en una línea suelta**: siempre en el bloque de dos (`global §4.4b-FORMA`).

**EL A/B, con las cuatro condiciones de `§9b`:**
| brazo | dónde va el enlace | posts |
|---|---|---|
| **A · abajo** | detrás del reveal, entre el 88% y el 96% | los 20 del histórico |
| **B · a media cola** | detrás de la primera línea de clichés, con reveal, pueblos y cierre por debajo; **por debajo del 80%** | Cantabria 01/09 (60%) · **despiece de Bizkaia de Asier, 16/09 (74%)** |

**Se lee con 3 o 4 posts del brazo B en la MISMA cuenta.** La cuenta de Asier ya tiene los dos: Aragón (A, 0,500%), Cantabria (B, GA4) y Bizkaia (B). **Cada peloteo nuevo apunta en su ficha del historial el % de posición del enlace** el día que sale.

**Cómo se sube sin romper el ritmo** (caso de Bizkaia): mover el bloque del enlace deja casi siempre un tramo en espejo o un ciclo suelta-bloque-suelta-bloque. Se prueban las ordenaciones de la cola con el validador y se elige **la más alta que pase limpia**. En Bizkaia quedó: sirimiri → contexto del evento → enlace → reveal y barrido → pueblos → "ninguna sale en un anuncio" → cierre.

**Mecanizado** como aviso en `validar-post.py` (`PELOTEO: posicion del enlace`), que imprime el % y dice a qué brazo pertenece el post.

**7 · LAS LISTAS DE QUEMADAS CADUCAN** (Iker, 2026-09-16). País, concepto, frase-rabia y verbo del prejuicio **se liberan a los 42 días** (`global §2.0b-VENTANA`). Lo que no caduca: **la región dentro de la misma cuenta** y los vetos sin fecha.

### ⛔ 4.1-GANCHO · SI EL PILAR NO ESTÁ DEFINIDO, PRIMERO SOLO EL GANCHO (Iker, 2026-08-05)

**LA PUERTA. Antes de escribir una sola línea de cuerpo, pregúntate: ¿este post pertenece a un pilar que ya tenemos validado con datos?** (mapa · "Los 10" · despiece · meme · lead magnet · historia). **Si la respuesta es NO —nos estamos inventando el formato— el flujo CAMBIA y no se entrega una publicación entera.**

**Lo que se entrega en esa casuística, y solo esto:**
1. **Un aviso explícito** de que ese formato **no está validado ni con nuestros datos ni con los de nadie**, así que lo único que puede sostenerlo es el gancho.
2. **DIEZ variantes de gancho, todas con metáfora** (`global §2.0a`), cada una con **un concepto distinto** y, a poder ser, **una perspectiva distinta**: el que vende, el que compra, el jefe, el oficio, el que mira desde el futuro, el que se queda fuera.
3. **Una tabla con el resultado del validador de cada uno** y mi recomendación razonada de dos o tres.
4. **Y ahí se para.** El cuerpo NO se escribe hasta que Iker elige o pide otra ronda.

**🚫 Y LAS DIEZ TIENEN QUE PASAR EL VALIDADOR. NO SE PRESENTA NADA QUE YA SABES QUE FALLA (Iker, 2026-08-05).** Le pasé una tanda con dos ganchos marcados por mí mismo como *"sin ancla de ventas"*. Su respuesta: ***"¿por qué me das esas opciones si tú sabías que no tenían ancla?"***. Tenía razón: **enseñar una opción rota le hace perder tiempo revisando algo que no podía salir**, y encima ensucia la comparación entre las que sí valen.
- **El flujo correcto:** genera **más de diez**, pásalas TODAS por el validador, **descarta las que fallen** y presenta solo las limpias. Si de doce sobreviven ocho, se entregan ocho y se dice por qué cayeron las otras cuatro.
- **Lo que sí se puede enseñar es el descarte**, en una línea (*"cayó por cifra en letra"*), porque eso es información. Lo que no vale es colarla en la lista de candidatas.

**POR QUÉ, con la prueba del mismo día en que se escribió:** el 05/08, montando el primer post del evento de septiembre, le entregué **la publicación completa seis veces seguidas** cambiando solo el gancho. Todo el cuerpo de las cinco primeras fue trabajo tirado, y por el camino se colaron dos datos falsos que había que ir corrigiendo en cada versión. **Iker: *"si el gancho no convence, nadie va a pulsar ver más, así que por mucho que nos curremos el cuerpo la publicación ya no sirve de nada"*.** Es como trabajaba él su primer mes en LinkedIn, cuando no tenía ningún pilar: mil iteraciones de gancho probando conceptos, metáforas y verbos punchy, y solo después el cuerpo.

**⚠️ OJO CON EL LÍMITE:** esto **NO aplica a los pilares definidos**. En un mapa o un meme la receta ya dice cómo va el gancho y el cuerpo, así que ahí se entrega el post completo como siempre. **La puerta es solo para lo que nos estamos inventando.**

### 4.1 · Esqueleto general (todo post pasa por aquí)
1. **Input:** pilar · cuenta (Iker/Unai/Asier) · idea semilla · objetivo (`alcance | pipeline`).
2. **Test gana/pierde + mecánica** (`global-instructions §0`, matriz §4.6) + **chequeo de riesgo** (`working-preferences §2-§3`: región baneada, fatiga de lead magnet, meme sin motor, exclusividad de formato del día). Si hay riesgo → **avisar ANTES** del borrador.
3. **Verificación de datos** (donde aplique): cifras contra fuente real + empresas/menciones según §4.0.
4. **Hook:** 2-3 candidatos (`global-instructions §2`) — copia la anatomía del pilar en `swipe-file` (varía las palabras). **En TODO hook, itera el VERBO hasta el más punchy CON TECHO: la escalera y los verbos validados están en `global-instructions §2.9`.** Medido en nuestras cuentas: "desmonto perfiles" 8.52x vs "destripo perfiles" 0.21x.
5. **Cuerpo:** `§3` + voz `brand-voice`, con `swipe-file` como molde de estructura (bloques, anáforas, staccato, reveal).
6. **CTA:** regla del UNO (`§4.5`), **y desde el 2026-08-27 eso incluye el ENLACE: un post, UNA puerta** (`global §4.4e-UNA`). El doble bloque de `agendar` + `correo` que se probó del 18/08 al 20/08 **está retirado**: los 3 únicos posts que lo llevaron se quedaron con el `link_url` vacío y cero clics, contra 8 de 8 con un solo enlace que sí midieron. **La puerta la eligen el TEMA del post y el PILAR**: agendar si el post toca vender, correo si no lo toca o si interesa la puerta barata, Luma mientras viva el evento (y en el primer jefe, Luma manda). El mapa sigue con su ultra ninja a la página de la región, que es contenido y no cuenta como puerta. La forma del bloque de dos no cambia y vive en `global §4.4b-MOLDE`.
7. **Imagen — SIEMPRE un prompt o una recomendación basada en datos** (según el registro correcto, `images §3`):
   - **Mapa:** captura de PamPam (la haces tú) → el workflow no da prompt, entrega el CSV.
   - **"Los 10":** orla de retratos con TU plantilla → el workflow entrega el ZIP de 10 fotos (no prompt).
   - **Meme:** **prompt de modificaciones** sobre la referencia (`§4.4` Pasos 6a-6b: primero se inventaría la foto, luego se escribe el prompt).
   - **Lead magnet / personal / founder:** **recomendación de foto natural** (selfie o grupo con compañeros; NO caricatura ni diseño elaborado).
   - **Deseo/números/conversación/métricas:** prompt de **screenshot documental** (iMessage, app del banco, dashboard de LinkedIn con nuestros datos).
   - Vídeo → skill `video`.
8. **Tag de viralidad:** `outliers-database §4` (Neety) primero; §3 solo etiquetado.
9. **Loop = pase de validación en silencio** (`global-instructions §8`): autocrítica hasta pasar el listón.
10. **Entrega:** 2-3 variantes en bloques cercados (`working-preferences §1`); empresas/menciones rellenas y marcadas (§4.0); lista de "revisa estas"; y **di qué esperas del usuario** para el siguiente paso.

### 4.2 · Runbook MAPA REGIONAL (encadenado) — RECETA DEFINITIVA
> **Input del usuario:** SOLO la región — **si no te la da, pídesela primero.** Todo lo demás (país de comparación, cifras, empresas, personas) lo verifica y rellena el workflow.
> **Output final (solo esto):** (1) el **TEXTO** del post copy-ready · (2) el **CSV** para importar en PamPam · (3) el **TÍTULO** y la **descripción** para la web del mapa — la descripción va en **UN SOLO PÁRRAFO, sin saltos de línea** (Iker, 2026-07-22), y **tanto el título como la descripción se entregan cada uno en su bloque cercado** para poder copiarlos con el botón (igual que el texto del post) · (4) la **guía de menciones** (en el chat: enlaces CLICABLES fuera de cercado, Paso 10). **Son CUATRO piezas, ni una menos.**
> **DE LAS TRES IMÁGENES, TÚ SOLO DAS UNA (la de PamPam):**
> - **Imagen del POST** = captura de la web PamPam → **la hace el USUARIO**. El workflow NO la genera ni la describe. (Por eso el mapa NO usa la skill `images`.) **Pero SÍ lleva aviso: el de encuadre, ver justo debajo.**
> - **Portada de la WEB del mapa** = captura del propio mapa → **la saca el PROGRAMADOR** (confirmado por él el 2026-07-31).
> - **Portada de PAMPAM** = foto icónica de la región con licencia libre → **la das TÚ** (Paso 11).

**⛔⛔ LOS CUATRO INAMOVIBLES DEL GANCHO DE PELOTEO (Iker, 2026-07-31). Aplican al MAPA y al DESPIECE. NO a "LOS 10".** Se puede iterar todo lo demás, pero estas cuatro piezas **no se quitan, no se sustituyen y no se mejoran**, por muy punchy que parezca la alternativa:
> 1. **El PREJUICIO dicho por otro** (`la ven`, `la tienen`, `nadie la cuenta`). No se afirma en primera persona.
> 2. **EXACTAMENTE 2 clichés** de la región.
> 3. **La palabra `exporta`.** Es lo que ata el pilar a **VENTAS** de forma indirecta: **si alguien exporta es porque VENDE**. Sin ella el post es peloteo bonito que podría subir cualquiera.
> 4. **La COMPARACIÓN con un país CONCRETO y verificado** (`más que [PAÍS] entero`). Ni "medio mundo" ni "países enteros" en vago.
>
> **POR QUÉ ESTÁ AQUÍ EN MAYÚSCULAS: me las cargué dos días seguidos y las dos veces me pareció una mejora.** El **30/07**, en el despiece de Euskadi, cambié el remate de `exporta` por el objeto (*"Y ahí se hace tu coche"*), puse un concepto flojo (*"el sitio de comer"*) y me salté el prejuicio ajeno: **está rindiendo peor**. El **31/07**, en el mapa de Asturias, cambié `exporta más que [PAÍS]` por un shock de producción (*"y aún funde zinc para medio mundo"*) porque el total exportado no daba un titular redondo. **Las dos veces el validador me lo dijo con el fallo "Hook anclado a VENTAS" y las dos veces yo lo despaché como "fallo esperado del pilar".** No lo era: en cuanto volvió `exporta`, el check pasó solo. **Si el validador marca ancla de ventas en un peloteo, es que falta `exporta`. Punto.**
>
> **⛔ "LOS 10" QUEDA FUERA, y no por descuido (Iker, 2026-07-31).** Ahí el foco es **LA PERSONA**, el comercial invisible, no la región: su gancho es de otra familia y **el que más alcance nos ha dado no lleva `exporta` ni comparación de país**. Meterle estas cuatro reglas tumbaría los cuatro "Los 10" del histórico, incluido el 4.81x. En ese pilar el listón es otro (`§4.3`). Por eso los checks del validador van sobre `('mapa', 'objeto')` y no sobre `los10`.
>
> **Y si la comparación no sale redonda, se busca mejor, no se quita.** En Asturias di por muerta la comparación creyendo que solo batía a Chipre por un 1,8%, y era falso: **Chipre exporta 4.383 M$ en bienes (OMC, 2024) y Asturias 5.654 M€, casi un 40% más.** El error fue mío al comparar, no del dato. Mecanizado en `validar-post.py` como dos fallos duros.

**Paso 1 — Iterar el GANCHO** (estructura archi-probada, ver `swipe-file §2.1`). Empieza SIEMPRE por aquí. Fórmula:
`[concepto original despectivo/gracioso de la zona] + [EXACTAMENTE 2 clichés locales] + [frase-rabia entre comillas] . Y exporta más que [PAÍS] entero 👇`
- **⭐⭐⭐ CÓMO SE INVENTA EL CONCEPTO — LA FÓRMULA, que hasta el 2026-08-03 no estaba escrita.** Aquí ponía *"inventa uno original y geográfico"*, y eso no es un método, es un deseo. Por ese hueco entregué `el pasillo de España` (que además pincha al país) y `la región más extensa de la Unión Europea` (que es un DATO, no una metáfora). Iker: *"me parece una basura… trastienda del norte era superoriginal"*.
  - **📊 VALIDADO CONTRA IMPRESIONES REALES (autovalidación del 2026-08-03, solo mapas de IKER para que la comparación sea limpia):**

    | Impresiones | Concepto | Familia |
    |---|---|---|
    | **112.667** | `el pueblo de 7.000 habitantes` | dato-shock |
    | **79.224** | `el patio trasero de los Pirineos` | metáfora doméstica |
    | **64.566** | `la esquina del Atlántico` | metáfora doméstica |
    | 29.755 | `región de 8,7 millones de habitantes` | dato SIN contradicción |
    | 16.726 | `un desierto` | metáfora de PAISAJE |
    | 2.090 *(Unai)* | `un museo minero` | espacio, pero PÚBLICO |

    **Lo que dicen los números, y no estaba escrito:**
    1. **La metáfora de PAISAJE rinde ~4 veces peor que la doméstica.** `desierto` 16.726 y `secarral` 27.009 frente a `patio trasero` 79.224 y `esquina` 64.566. **No vale cualquier metáfora: tiene que ser de CASA.**
    2. **`museo minero` es el peor mapa del histórico (2.090).** Es un espacio, pero **público y turístico**. Lo que funciona no es "un sitio", es **un sitio de TU casa**, porque el lector se coloca dentro.
    3. **HAY UNA SEGUNDA FAMILIA QUE GANA A TODAS: el DATO-SHOCK**, y es la del mejor mapa de la historia. **Pero solo funciona si el número es PEQUEÑO y CONTRADICE**: `7.000 habitantes` hace 112.667 y `8,7 millones` hace 29.755. **El número tiene que ser tan pequeño que choque con "exporta más que países enteros".** Un número grande e impresionante (`la región más extensa de la UE`) no sorprende a nadie y por eso Iker lo tumbó el 03/08.
    - **⚠️ Y esto contradice a medias lo que escribo abajo:** la fórmula doméstica es la vía **fiable** (2º y 3º puestos), pero **el techo lo tiene el dato-shock**. Si aparece un número pequeño y contradictorio de esa región, **ese gana**. Si no aparece, se va a la fórmula.

  - **⬆️ ESTO ES UN CASO PARTICULAR DE UNA REGLA GENERAL (`global §2.0a`, 2026-08-05):** el gancho de CUALQUIER pilar se construye con una metáfora y no con una afirmación. Lo de abajo es cómo se aplica esa regla al mapa, donde el objeto sale de la geografía. En un meme, un lead magnet o un post de evento el objeto sale de otro sitio, pero **el procedimiento de 5 pasos es el mismo**.
  - **LA FÓRMULA DEL MAPA, sacada de los que funcionaron:** `[ESPACIO DOMÉSTICO HUMILDE] + de + [ACCIDENTE GEOGRÁFICO]`. Es una **palabra de casa aplicada al mapa**, y por eso la entiende todo el mundo y suena nueva a la vez.
    - `trastienda` + del norte (Álava) · `esquina` + del Atlántico (Galicia) · `patio trasero` + de los Pirineos (Navarra) · `tejado` + de la Península (Castilla y León).
    - **Los tres son sitios de una casa donde no se recibe a nadie.** Ese es el desprecio: no eres el salón.
  - **EL PROCEDIMIENTO, cuatro pasos y en este orden:**
    1. **Escribe la geografía REAL de la región en una frase**, sin adjetivos. Castilla y León: *"meseta alta cercada por cordilleras por los cuatro lados, de donde bajan los ríos"*.
    2. **Traduce esa forma a una parte de una casa.** ¿Alto y nadie sube? → tejado, azotea, desván. ¿Cerrado por los cuatro lados? → patio de luces, corral. ¿Detrás? → trastienda. ¿En una punta? → esquina, rincón.
    3. **Comprueba las dos cosas que lo tumban:** ¿la palabra la usa un señor de 55 años en un bar? ¿está en `CONCEPTO_QUEMADO`, aunque sea a medias (`patio` ya salió en Navarra)?
    4. **Y remátalo con el CIERRE del post**, que tiene que rebotar contra el concepto. Tejado → *"Del tejado nadie se acuerda. Pero es lo que aguanta la casa."* Si el cierre no rebota, el concepto no estaba bien elegido.
  - **🚫 LO QUE NO ES UN CONCEPTO:** un dato (`la región más extensa de la UE`), un adjetivo (`la olvidada`), el nombre real (`la meseta`), ni algo que critique a España o a otra región (`el pasillo de España`).
  - **🚫 PALABRAS QUEMADAS EN EL ARRANQUE:** `región`, `tierra`, `pueblo`. **Y el gancho NO empieza con el verbo** (`La ven`, `La despachan`, `La tienen`): eso ya se hizo en 6 de 10 mapas y canta. **Empieza por el CONCEPTO** (`Al tejado de la Península lo resumen en…`, `Esta esquina del Atlántico la ven como…`).
- **Concepto: DERIVADO DE LA GEOGRAFÍA de la región** (su posición en el mapa, accidentes geográficos, fronteras). Nunca "región/pueblo/tierra". Así lo hemos hecho siempre: Galicia = "la esquina del Atlántico" (arriba a la izquierda), Álava/País Vasco = "la trastienda del norte" (arriba, la olvidada del norte), Navarra = "el patio trasero de los Pirineos" (frontera con Francia). Inventa uno original y geográfico por región; no repitas concepto usado.
  - **🔴🔴 EL PREJUICIO SE ATRIBUYE A LA GENTE, NUNCA SE AFIRMA (Iker, 2026-07-30). Es LA regla del gancho y me la salté dos dias seguidos.** El gancho **no dice lo que pensamos nosotros**, dice **lo que piensa todo el mundo**. Sin ese sujeto colectivo, el desprecio se lee como NUESTRO y ofendes justo a quien querias que comentara defendiendo lo suyo.
  - **❌ Mal:** *"El museo de la mina: sidra, fabada y a hacer fotos"* · *"En el mapa es un paramo con catedrales"*. Afirman. Somos nosotros los que desprecian.
  - **✅ Bien, y son los que funcionaron:** *"Nadie habla del pueblo…"* · *"Todos ven esta tierra como playa y paella"* · *"A esta tierra la conocen por la lluvia"* · *"Esta esquina del Atlantico la ven como pulpo y el Camino"* · *"La ven como el patio trasero de los Pirineos"* · *"La llaman la trastienda del norte"*.
  - **La formula del sujeto:** `nadie habla de` · `todos ven` · `la conocen por` · `la ven como` · `la llaman` · `la tienen fichada como` · `la despachan como`. **Siempre hay alguien ajeno opinando.**
  - **Y la frase-rabia tiene que DESPRECIAR de verdad**, no ser simpatica. *"y a hacer fotos"* se queda corta. La familia que funciona: *`y para de contar`* · *`y poco mas`* · *`y poco que rascar`* · *`buena para [comer X] y para irse`* · *`un [plato] antes de seguir carretera`*. **Si el local no siente el desprecio, no comenta, y sin comentarios no hay motor.**
- **⭐ VARÍA EL ARRANQUE del gancho (Iker, 2026-07-22).** No abras SIEMPRE con "La ven como…". Es un tic: se ha usado en Navarra, Murcia y compañía. Alterna: *"La despachan como…"*, *"La colocan como…"*, *"La tienen fichada como…"*, *"En el mapa es…"*, *"Para el resto es…"*, o **empieza directamente por el concepto** (sin verbo de "ver"). Que dos mapas seguidos no abran igual.
  - **⭐ INNOVA el TIPO de concepto, no solo las palabras (Iker, 2026-07-22).** El molde de "esquina / rincón / posición en el mapa" ya está muy usado (Galicia "esquina del Atlántico", y el primer intento de Murcia era "la esquina de abajo a la derecha"). Sal de la metáfora de POSICIÓN: tira de otros accidentes geográficos o rasgos (clima, río, costa, aridez, un lago…). Murcia se resolvió con **"un desierto con playa"** (la paradoja: el sitio más seco que riega a media Europa) en vez de otra "esquina".
- **⚠️ NO criticar otras regiones/ciudades ESPAÑOLAS.** Estos posts buscan **HERMANDAD entre regiones, no dividir el país** (igual que nunca hablamos mal de otra empresa, tampoco de otra región). **Prohibido nombrar/pinchar a Madrid, Barcelona u otras ciudades/regiones españolas** en el concepto o el hook. El "desprecio" es (a) **auto-despectivo** de la propia región (sus clichés) o (b) apoyado en una **frontera extranjera** (los Pirineos están entre España y Francia → "patio trasero de los Pirineos" vale). Nada de "la sala de espera entre Madrid y Barcelona" ni "para media España": genera conflicto entre regiones.
- **⭐⭐ PARA ELEGIR REGIÓN MANDAN LAS IMPRESIONES, NO EL RATIO (Iker, 2026-07-29).** Yo estaba eligiendo por multiplicador y **es el criterio equivocado**: el ratio se mide contra la media de ESA cuenta, así que **se comprime según la cuenta crece** y no dice cuánta gente vio el post. Elegir región es una decisión de ALCANCE PURO, así que la vara es la **impresión absoluta**.
  - **La prueba está en nuestros propios datos:** Navarra 7.72x hizo **79.200** impresiones y Cataluña 7.11x hizo **48.900**. Ratio casi idéntico, **30.000 personas de diferencia**.
  - **Ranking real por impresiones:** Gipuzkoa **112.700** · Navarra **79.200** · Valencia **51.500** · Cataluña **48.900** · Andalucía **29.800** · Bizkaia **21.300**.
  - **⚠️ Y esto tumba una creencia que teníamos:** que "el País Vasco limita el alcance". **Gipuzkoa es el mapa con MÁS impresiones de todo el histórico.** La creencia venía de mirar Bizkaia (3.27x) y de confundir ratio con alcance.
  - El ratio sigue valiendo para comparar un post contra la media de su cuenta y su pilar. Para decidir territorio, no.
- **⭐⭐ CUÁNTAS EMPRESAS: 20 es el objetivo, 10 es el SUELO (Iker, 2026-07-29). Regla TRANSVERSAL de todo el peloteo.** Aquí ponía *"si no llegas a 20 baja a 16"* y se quedaba sin suelo, así que ante una región floja no había criterio para decidir entre publicar o no.
  - **Siempre se apunta a 20 empresas y 20 personas.** Cuantas más, más alcance y más gente que repostea.
  - **Encontrar menos NO descarta la publicación.** Se entrega con las que haya.
  - **Por debajo de 10 empresas y 10 personas, el post NO se hace.** Ese es el suelo.
  - **Y nunca se rellena con inventadas** para llegar a una cifra bonita (`aboutme`: jamás inventar). Antes 14 reales que 20 con seis dudosas.
  - **Excepción: "Los 10" son siempre 10**, ni uno más ni uno menos, como dice su propio nombre.
  - **Los bloques siguen siendo de 4.** Si el número no es múltiplo de 4, el último bloque es de 2 o de 3, nunca de 1: una ficha suelta al final se lee como que se te olvidó algo.
  - **Ojo con el despiece:** al fijar un sector (automoción) el universo se estrecha mucho más que en un mapa, que acepta cualquier industria de la región. **Es el pilar con más riesgo de quedarse corto**, y por eso este suelo importa aquí más que en ningún otro.
  - Mecanizado: `validar-post.py --pilar mapa` falla por debajo de 10 y te dice cuántas llevas.
- **⭐⭐ EL CONCEPTO TAMBIÉN VA EN PALABRA UNIVERSAL, no solo los clichés (Iker, 2026-07-29).** Aquí solo se pedía que fueran universales los 2 clichés, y por ese hueco colé *"un páramo con catedrales"*: **"páramo" no lo usa medio España**. El concepto lo lee TODO el mundo antes de pulsar "ver más", así que **una palabra rara ahí sale más cara que en ningún otro sitio del post**.
  - **La vara son los que ya funcionaron:** `esquina`, `trastienda`, `patio trasero`, `desierto`, `última parada`. **Palabras de andar por casa que cualquiera visualiza al instante.** Genérico en la PALABRA, original en la IMAGEN: `el pasillo con catedrales` es genérico de vocabulario y nuevo de concepto a la vez.
  - **⭐ Y LA ORTOGRAFÍA DEL GANCHO ES LA CASTELLANA (Iker, 2026-07-29).** Escribí `txuleton` en el gancho y **eso autolimita el alcance**: el gancho lo lee toda España y la grafía local añade fricción justo donde más cara sale. Va **`chuletón`**. La grafía de allí (`tx`, `pil-pil`, `txapela`) baja al CUERPO, donde el lector ya está dentro y encima identifica mejor. Es la misma regla que los clichés universales, aplicada a cómo se escriben.
  - **El test:** ¿la usaría un señor de 55 años hablando en un bar? Si dudas, no vale. Literario, técnico o de diccionario = fuera. Y sigue aplicando lo de siempre: **el concepto no se repite NUNCA, ni entre cuentas.**
- **⭐ Clichés del GANCHO: EXACTAMENTE los 2 más UNIVERSALES que tenga la región. Los específicos van al CUERPO** (2026-07-17). **Máximo 2, no 3 (Iker, 2026-07-22).**
  - **⚠️ El CONCEPTO no puede colar un 3er cliché sin que te des cuenta.** Murcia salió *"un desierto con playa: sol, tomate"* → "playa" iba en el concepto pero cuenta igual: son 3 (playa, sol, tomate). Se quitó → *"un desierto: sol, tomate"* (2). Cuenta TODAS las palabras-cliché del gancho, vengan del concepto o de la lista.
  - **⚠️ NO repitas una palabra-cliché ya usada en otro mapa.** "playa" ya se gastó en Valencia ("playa y paella"); por eso se cayó de Murcia. Antes de fijar los 2, cruza mentalmente contra los conceptos/clichés del `historial-publicaciones`.
  - **El gancho lo lee TODO el mundo; el cuerpo solo el que ya ha pulsado "ver más".** Cada palabra que un señor de Cuenca no entiende es fricción en el sitio donde más cara sale. `pan con tomate` y `playa` los pilla toda España; `calçots` y `cava` no, así que esos bajan al cuerpo, donde además identifican mejor porque el que lee ya está dentro.
  - **Es la MISMA regla de `global §2.3`**, que ya decía *"cuanto más genérico el gancho, más lejos llega; la especificidad va en el cuerpo"*. Aquello se escribió para la jerga de ventas (CRM, ICP); esto lo extiende al vocabulario regional. Mismo principio, otro eje.
  - ⚠️ **Esto NO está probado con datos, y conviene saberlo.** Los ganchos con clichés universales (Galicia `pulpo y el Camino` 7.29x · Valencia `playa y paella` 6.77x) baten a los locales (Álava `pintxo-pote` 3.59x · Aragón `jota, Pilar y ternasco` 2.53x)… **pero todos los universales son de Iker y todos los locales son de Unai y Asier**. Está confundido con la cuenta: los 3 mapas de Unai caen entre 3.2x y 3.7x hagan lo que hagan, y los 6 de Iker entre 5.4x y 12.9x. **La comparación limpia exige la MISMA cuenta.** Se adopta por coherencia con §2.3 y porque no cuesta nada, no porque el dato lo diga.
  - Los clichés siguen siendo de ESA región (Sevilla → feria y playa; Valencia → paella y Fallas): universal no es genérico, es que se entienda fuera.
- **⚠️ MATIZ MEDIDO EL 2026-07-30, al mecanizar esto en el validador:** al pasar los checks del gancho contra el histórico salieron **dos cosas que contradicen la receta**, y mandan los datos. **(a)** El mejor mapa de todos, *"Nadie habla del pueblo de 7.000 habitantes que exporta más que países enteros"* (**12.89x**), **NO lleva frase-rabia**. **(b)** Ese mismo y el de Andalucía (*"8,7 millones de habitantes"*, 5.38x) **llevan CIFRA en el gancho**, y en los dos la cifra ES el concepto. Así que las dos reglas van en el validador como **AVISO y no como fallo**: se recuerdan, no se imponen. **La única que sí es fallo duro es el sujeto ajeno**, porque esa la cumplen todos los ganchos buenos sin excepción.
- **⭐ EL VERBO DEL PREJUICIO ROTA SIEMPRE (Iker, 2026-07-31).** El **sujeto ajeno** es obligatorio y no se toca (`la ven`, `nadie habla de`, `la tienen`), pero **el VERBO que lo acompaña se gasta y hay que cambiarlo cada vez**. Pasó con `fichada`: la estrené el 30/07 en el despiece de Euskadi (*"nadie lo tiene fichado como tierra de coches"*), me gustó porque pega mucho más que `la ven`, y al día siguiente abrí el mapa de Asturias con *"la tienen fichada"* **y encima la repetí otra vez tres líneas más abajo**. El verbo es lo PRIMERO que se lee: repetirlo convierte el pilar en plantilla y el lector deja de notar el desprecio, que es el motor entero. **No es que el verbo sea malo, es que ya está gastado, y eso es peor.**
  - **Familia al mismo nivel de potencia, para rotar:** `la tienen jubilada` · `la despachan como` · `la dan por amortizada` · `la entierran con` · `nadie la cuenta como` · `la tienen archivada` · `la dan por vista`. El listón es *"¿duele tanto como fichada?"*; si el verbo es tibio (`la ven`, `la asocian a`) no vale, aunque el sujeto ajeno esté bien puesto.
  - **La PREPOSICIÓN va con el verbo, y cambiarla estropea la imagen (Iker, 2026-07-31).** `fichada`/`despachada`/`catalogada` piden **`como`** (son etiquetas: te clasifican *como* algo). `jubilada`/`enterrada`/`archivada` piden **`en`** (son destinos: te mandan *a* un sitio). *"La tienen jubilada **como** un museo"* se lee raro porque un museo no está jubilado; *"jubilada **en** un museo minero"* la convierte en **pieza expuesta**, que humilla mucho más que una comparación. **Y el que manda a un SITIO regala el cierre**: el remate *"El museo está muy bien. La fábrica de al lado, mejor"* rebota porque los dos son lugares.
  - **El mejor verbo es el que hace daño en ESA región concreta:** en Asturias `jubilada` gana a todos porque el prejuicio real es el de la cuenca cerrada. Búscalo así, no de la lista.
  - **Mecanizado:** `VERBO_PREJUICIO_QUEMADO` en `scripts/validar-post.py`. **Cuando publiques un peloteo, mete ahí el verbo que hayas usado.** La lista solo crece y el check es fallo duro.
- **Frase-rabia (OBLIGATORIA — es el motor de la rabia, no un adorno):** el remate que despacha la región en cuatro palabras y hace que el local comente para defenderla. **NUNCA la escribas igual que la vez anterior, pero NUNCA la omitas.** Validadas: Navarra `toro, txistorra y poco más` · Álava `buena para un pintxo-pote y para irse` · Aragón `un ternasco antes de seguir carretera`. Familia de variantes para rotar: "y para de contar", "y gracias", "y poco que rascar", "buena para [comer X] y [largarse]", "sitio de parar y seguir". El patrón es: **[cliché de comida/fiesta] + [gesto de despacharla]**. Si el hook no tiene este beat, el local no siente el desprecio → no comenta → no hay motor.
- **Cierre:** `Y exporta más que [PAÍS] entero 👇` (el país sale del Paso 2).
- **Verbo punchy con techo** (`global §2.9`) donde el hook lleve verbo (exportar, vender, cargar…).

**Paso 2 — Elegir y VERIFICAR el PAÍS de comparación** (sub-procedimiento — antes NO lo tenía):
1. Busca el **dato oficial más reciente de exportaciones de la provincia/región** en euros, **citando fuente** (EUSTAT / ICEX / Datacomex).
2. Lista los países que exportan **un poco MENOS** que esa cifra → candidatos a "XXX exporta más que [país] entero". Para cada candidato: **nombre, cifra y año**.
3. **Elige el país que MÁS frene el scroll** para nuestra audiencia (director industrial español de 50-60): prioriza países **conocidos** y que **sorprendan** (que parezcan "más grandes/importantes" que una provincia — Bolivia, Croacia, Portugal, Luxemburgo, Honduras, Italia han funcionado). Itera varios y quédate con el más impactante.
4. **INNEGOCIABLE — el dato tiene que ser real y verificable, con fuente.** Nunca sacrifiques veracidad por impacto: un dato mal → el primer comentario de un local corrigiéndote hunde el post (de 6x a 0.5x). Entre dos países igual de impactantes, el de dato más sólido.
5. **⚠️ VERIFICACIÓN DE LA COMPARACIÓN-PAÍS — la más traicionera** (auditoría 2026-07-23: se colaron DOS falsas en posts publicados). Reglas duras:
   - **Mercancías contra mercancías, mismo año.** Compara exportación de BIENES de la región contra exportación de BIENES del país (OEC/COMTRADE/Eurostat), no contra su PIB ni sus exportaciones de servicios. "Andalucía más que Italia" era falso (Italia ~600.000M€ vs Andalucía ~40.000M€, 15x). "Álava más que Honduras" era falso (Honduras ~10.200M€ > Álava 9.151M€).
   - **La fuente tiene que publicar ese país.** Citamos "(EUSTAT)" para un dato de Honduras que EUSTAT no publica jamás. La fuente del país es Banco Mundial/OEC/COMTRADE, y va citada como tal.
   - **Exige MARGEN, no empate.** Si el país queda a menos de ~15% por debajo, un comentarista con otra fuente (WITS vs COMTRADE dan cifras distintas) te lo invierte. Navarra vs Bolivia quedó casi en empate: evita esos. Elige un país claramente por debajo.
   - **Re-verifica al REUTILIZAR el mapa** (para la web u otra cuenta): las cifras caducan. Varias regiones publicaron un total de exportación que ya no cuadra con el último año oficial (Cataluña, Aragón, Navarra, Álava, Bizkaia). Antes de reciclar, recomprueba el último dato.

**Paso 3 — CUERPO** (fiel a `swipe-file §2.1` + voz `brand-voice`, VARIANDO expresiones):
1. Setup corto justo tras el gancho (sin preámbulo en la línea 2).
2. **Los 3 datos numéricos en lista (1/2/3), cada uno con FUENTE citada** (Eurostat, EUSTAT, Banco Mundial, Datacomex…). El primero suele ampliar la comparación del gancho.
   - **NUNCA pongas la FECHA/AÑO de la fuente en el cuerpo.** Cita el nombre (`(IAEST y Banco Mundial)`), nunca `(EUSTAT 2024)` ni "vendieron 15.615M€ **en 2025**". Motivo: el lector ve un año y lee el post como viejo aunque se publique hoy → rechazo y scroll. El dato SIEMPRE va verificado y con su año registrado **fuera del post** (entrega interna); si alguien pregunta el año en comentarios, se le responde ahí y suma credibilidad. Usa referencias temporales relativas o ninguna: "ya adelantó", "en un año", presente ("venden al mundo").
3. **⭐⭐⭐ LOS 4 INGREDIENTES DEL CUERPO, sacados del mapa de Navarra (79.224 impresiones) el 2026-08-03.** Aquí ponía *"cuerpo saturado de clichés, tejidos"*, y con esa frase entregué un cuerpo de Castilla y León que **no nombraba ni un solo sitio de Castilla y León**. Iker: *"tienes que desvelar el resto de cosas que hay dentro: ciudades, pueblos, lo que sea"*. Los cuatro, y ninguno es opcional:
   - **(a) LUGARES CONCRETOS de dentro de la región, con nombre.** Navarra dice *"montados en Landaben"*. No vale "en la región" ni "en sus fábricas". **Pueblos mejor que capitales**: el de Aguilar de Campoo se siente señalado; el de "Palencia" no tanto. Salen gratis de las fichas del CSV, que ya llevan la ubicación de cada empresa.
   - **(b) PRODUCTOS QUE EL LECTOR TIENE EN CASA.** Navarra: *"la ensalada en bolsa, las conservas, la pasta de tomate que tienes en la nevera"*. Es el eje de **ubicuidad invisible**, y es lo que convierte una lista de empresas en algo que te toca a ti. Formato: `[producto de casa], desde [pueblo]`.
   - **(c) ANÁFORA DE NEGACIÓN con clichés locales.** Navarra: *"No paga las nóminas San Fermín. No las pagan las subvenciones forales. No las paga el pacharán de sobremesa."* Es lo que da el mérito sin caer en el eje "callado", que está prohibido.
   - **(d) UNA LÍNEA DE MÉRITO HUMANA, con un oficio dentro.** Navarra: *"gente que empezó barriendo una nave y acabó dirigiéndola"*. Una persona haciendo algo concreto, nunca un adjetivo.
   - **🚫 Y LOS CLICHÉS DEL CUERPO NO SON LOS DEL GANCHO (Iker, 2026-08-03).** En el gancho van los **2 más universales**, y en el cuerpo van **otros, y más locales**, precisamente para que el de allí se sienta identificado. Yo puse `trigo` en el gancho **y lo repetí en la línea del reveal**. Castilla y León: gancho `trigo, castillos` → cuerpo `niebla, murallas de Ávila, acueducto, morcilla, cochinillo`. **Si una palabra ya salió arriba, abajo no vuelve.**
3. **⭐⭐ LA DENSIDAD DE CLICHÉS ES EL MOTOR, NO EL ADORNO. MÍNIMO OCHO (medido el 2026-08-05).** Aquí ponía "4-8" y ese suelo de 4 es el que hundió Asturias.
   - **La medida, con los dos extremos del histórico:** **Navarra, 79.224 impresiones, DIEZ guiños** (San Fermín · el pañuelo rojo · las subvenciones forales · el pacharán de sobremesa · Landaben · los Volkswagen · las palas de los molinos · la ensalada en bolsa · las conservas · la pasta de tomate). **Asturias, 2.297 impresiones, CUATRO** (sidra · fabada · las vacas · hórreos). Es el peor mapa de todo el histórico.
   - **Por qué es el motor y no decoración:** este pilar funciona porque **el local se siente aludido y comenta o repostea**. Cada cliché es un anzuelo distinto; con cuatro solo pican los de la capital, con diez pica el del pueblo, el que trabaja en esa fábrica y el que se ríe del tópico. **Menos clichés = menos gente que se da por aludida = menos alcance.**
   - **Y no valen cuatro genéricos:** tienen que mezclar comida, fiesta, paisaje, marcas locales, un barrio o polígono concreto y algo que solo sepa el de allí.
   - Cuerpo saturado de **clichés de la zona nueva** (mínimo 8, tejidos), anáfora de negación ("No paga X. No las pagan Y."), frases-oficio, y variedad de formato (bloques de 2/3, líneas sueltas, escalera).
4. **⭐⭐ EL REVEAL VA ANTES DE LA LISTA, Y DETRÁS DE ÉL EL BARRIDO GEOGRÁFICO (medido el 2026-08-03 sobre los 14 mapas publicados).**
   - **🔄 DECISIÓN DE IKER, 2026-08-03: el reveal pasa a ir DESPUÉS de la lista, y con él todo el bloque final.** Yo le puse delante los datos, que van al revés (**13 de 14 mapas publicados lo llevan ANTES**, y el único que lo lleva después es Asturias con 2.090 impresiones, el peor). **Pero esa evidencia es débil y hay que decirlo:** el de Asturias era de Unai, en viernes, con una empresa repetida y estrenando el ultra ninja, así que su fracaso no se puede achacar a la posición del reveal. Un solo caso confundido no es una regla.
   - **El argumento de Iker, que es estructural y no de datos:** *"si todo el peso está antes de las menciones, ¿para qué vas a seguir leyendo el post?"*. **El post tiene que quedar equilibrado**: gancho → bloque de datos → una línea → menciones → y el resto (clichés, mérito, reveal, barrido y spam ninja) DESPUÉS. Medido en el de Castilla y León: **589 caracteres antes de la lista y 617 después**. Ese es el reparto que se busca.
   - **🔴 Y OJO CON MEDIRLA MAL: el mapa de Castilla y León se publicó el 04/08, en AGOSTO, con media España de vacaciones.** Además llevaba **tres cambios experimentales a la vez** (reveal abajo, sin CTA de comentario, concepto de familia nueva). **Si rinde flojo, no sabremos cuál de las cuatro cosas fue.**
     - **Cómo se mide bien:** NO se compara contra Navarra (79.224, junio) ni Galicia (64.566, junio). Se compara contra **otro post de Iker de esas mismas semanas de agosto**, para que el mes se cancele. Si no lo hay, **la hipótesis se queda sin resolver y se vuelve a probar en septiembre**, con un solo cambio cada vez.
     - **La lección general:** meter varios cambios a la vez en el mismo post ahorra tiempo pero **destruye la posibilidad de aprender**. Cuando haya varias hipótesis, se reparten entre publicaciones.
   - **⚠️ QUEDA COMO HIPÓTESIS A MEDIR, no como verdad.** Es un cambio contra la mayoría del histórico, así que **cuando este mapa tenga números, se compara contra los de Iker con el reveal arriba** (Navarra 79.224, Galicia 64.566) y se decide con datos, no con preferencia.
   - **Y justo detrás del reveal va un BARRIDO GEOGRÁFICO de la región, nombrando dos extremos.** Navarra (79.224): *"De Pamplona a la Ribera, exportando… mientras el resto solo la recuerda en julio"*. Es lo que hace que el post no hable de una capital sino de un territorio entero, y es lo que engancha al de un pueblo pequeño. **Formato: `De [sitio A] a [sitio B], [lo que hacen]`.**
     - **⚠️ UNA LÍNEA, Y CORTA (Iker, 2026-08-03).** Es un **beat punchy**, no una frase explicativa: tiene que caber en una línea del móvil. Yo entregué *"De Aguilar de Campoo a la Ribera del Duero, cargando contenedores mientras el resto solo la cruza"* (**98 caracteres**, se parte en dos) y quedó en *"De Aguilar de Campoo a Peñafiel, cargando desde antes de amanecer"* (**66**). **El valor que NO se puede perder al acortar es el humano**: alguien haciendo algo concreto. Lo que se sacrifica es el contraste con "el resto", que ya lo lleva el gancho.
     - **⚠️ OJO, ESTO NO ES UN TOPE DE LONGITUD PARA TODO EL POST.** Medido el 03/08 sobre los mapas de Iker con más de 20.000 impresiones: hay **líneas de prosa de hasta 189 caracteres** y la mediana es 61. Un tope duro tumbaría al de 79.224 y al de 64.566. **Lo corto se exige en los BEATS punchy** (barrido, reveal, cierre), no en las líneas explicativas.
     - **🚫 Y la fórmula del barrido ROTA como todo lo demás.** Ya está usado: `exportando en silencio mientras el resto solo la recuerda en julio` (Navarra) y `cargando desde antes de amanecer` (Castilla y León). **No repitas "mientras el resto…" en el próximo**: cambia el verbo y el gesto (madrugar, cargar, soldar, salir de noche, no fallar una fecha). Ojo: la versión de Navarra lleva *"en silencio"*, que hoy está **prohibido** (`§4.2 Paso 3.5`); se copia la estructura, no ese eje.
   - **ORDEN EXACTO (Iker, 2026-08-03):** gancho → setup de 2 líneas → **bloque de 3 datos** → una línea → frase de entrada a la lista → **LISTA** → productos con su pueblo → línea → anáfora de negación → línea de mérito → clichés locales → **reveal** → **barrido geográfico** → **CTA al mapa** → cierre bold statement.
   - **🚫 NADA DE PEDIR COMENTARIOS (Iker, 2026-08-03).** Los mapas antiguos remataban con *"¿Falta la tuya? Coméntala y la añado al mapa"*, y **eso ya no se pone**: con el CTA del mapa ya hay un enlace, y **meter un segundo CTA rompe justo lo que hace fuerte al ultra ninja, que es no pedir nada** (`global §4.4b`). Un CTA que no pide no se puede declinar; dos se leen como anuncio.
4. **Reveal tardío:** "Sí, hablo de [región]."
5. **🚫 EL EJE "CALLADO" ESTÁ QUEMADO — prohibido.** Nada de "aquí se vende callado", "trabajan en silencio", "no lo cuentan", "no salen en la foto", "nadie los conoce", "sin hacer ruido" en el cuerpo, el spam ninja NI el cierre. Lo hemos usado en TODAS las regiones y quien nos lee lo tiene fichado: **no puede ser que todas las regiones estén calladas, alguna hablará**. Además es un ángulo de lástima ("pobrecitos, nadie les hace caso") cuando lo que queremos es dar **mérito y protagonismo**. (Ojo: el silencio SÍ es el eje propio de "Los 10" §4.3 — la persona invisible. En mapas, no.)
   **Ejes de mérito para rotar** (uno por mapa, nunca repetir el del anterior): **carácter forjado por la geografía** (Aragón: "el cierzo no deja crecer nada flojo") · **ubicuidad invisible** ("lo tienes en casa y no sabes ni cómo se llaman") · **exigencia del cliente** ("aquí te compra quien no perdona un retraso") · **oficio heredado** ("empezó barriendo la nave y acabó dirigiéndola") · **récord contra pronóstico**. El local tiene que pensar "qué bien, nos están dando mérito", no "qué pena damos".
6. **VARÍA las expresiones** frente a mapas anteriores: mismo formato/pilar, palabras y ángulos distintos, y **no repitas comodines** ("La gente y las empresas que mueven todo esto:" → dilo distinto cada vez). **La variedad de ARRANQUE de los bloques ya no vive aquí: es `global §2.0b-ARRANQUE`**, que aplica a todos los pilares. Lo único propio del mapa es que **la anáfora de negación (`No paga… / No las pagan…`) es SUYA** y no se calca en otro pilar.

**Paso 4 — EMPRESAS y PERSONAS a mencionar** (las rellena el workflow vía Unipile — antes se dejaba vacío):
Objetivo: 20 empresas industriales B2B de la región, cada una con UNA persona concreta mencionable y **activa** en LinkedIn, ordenadas de mayor a menor probabilidad de interactuar.
- **Criterios de empresa:** 100-700 empleados (evita megaempresas demasiado corporativas); medianas/grandes, familiares, founder-led o con directivos visibles; sectores industriales (metalurgia, máquina-herramienta, bienes de equipo, automoción, aeronáutica, energía/oil&gas, forja, fundición, calderería, naval/offshore, electrónica, ingeniería, química, caucho, plástico, alimentación industrial…); cubre TODO el territorio (no solo la capital); prioriza exportadoras / presencia internacional. (Para el País Vasco hay una semilla de 346 empresas ICP: `ref_empresas_industriales_pais-vasco.csv` — úsala como punto de partida pero verifica igual con Unipile.)
- **Persona (en este orden):** 1) CEO / director general / gerente; 2) fundador / presidente / propietario; 3) director comercial / marketing / desarrollo de negocio / export manager.
- **⛔⛔ EL CARGO ES UN FILTRO DURO, NO UNA PREFERENCIA: SIN PODER DE DECISIÓN NO SE MENCIONA (Iker, 2026-08-26).** Aquí ponía *"en este orden"* y eso se leía como una lista de deseos: cuando el 1 y el 2 no estaban activos, yo bajaba hasta lo que hubiera y colaba **técnicos de mantenimiento, responsables de sistemas, de calidad, de RRHH, de compras y hasta becarios**. Iker, textual: *"a veces como excepción, como no hay nadie activo, mencionas a becarios, que esos poco pueden hacer, y eso creo que es un error"*.
  - **LO QUE BUSCAMOS, y son dos cosas a la vez: que DECIDA y que sea de VENTAS.** El mencionado tiene que poder comprarnos algún día o poder llevarnos a quien compra. Por eso el orden bueno es: **(1) CEO / director general / gerente / consejero delegado / fundador / propietario · (2) director comercial / de ventas / de exportación / de desarrollo de negocio / KAM · (3) director de marketing · (4) director industrial / de operaciones / de planta**, y ahí se acaba.
  - **⛔ NO SE MENCIONA NUNCA, aunque esté activísimo y aunque la empresa sea perfecta:** becario, estudiante, técnico, operario, administrativo, mantenimiento, sistemas/IT, RRHH, calidad, prevención, almacén, logística, compras, contabilidad, soporte. **No deciden y no venden**, así que la ficha se gasta en alguien que no nos puede comprar y encima el post se lee como que hemos rellenado.
  - **Y si en una empresa no hay NADIE con cargo válido, la empresa se cae o va SOLO con el nombre de empresa.** Una ficha sin persona sigue notificando a la página; una ficha con la persona equivocada no notifica a nadie que importe. Medido el 26/08: al pasar este filtro sobre Cantabria se cayeron **ENSA, Global Steel Wire y Armando Alvarez Group**, y el mapa bajó de 16 menciones a 12. **Es la decisión correcta**: 12 que deciden baten a 16 con cuatro que no.
  - **Mecanizado en `scripts/menciones.py`** (`RANK` y `VETO`): saca la ficha de empresa y ya devuelve solo a los que pasan el filtro, ordenados por recencia. **Si tocas la lista de cargos, tócala ahí.**
- **🔄🔄 LA ACTIVIDAD VUELVE A SER CUALQUIER ACTIVIDAD EN LINKEDIN, NO SOLO COMENTAR (Iker, 2026-08-26). REVIERTE la regla del 2026-07-24.** Durante un mes el filtro fue *"tiene que haber COMENTADO en el post de otro"*, y en la práctica **tiraba a los buenos**: un CEO que publica cada semana pero no comenta a nadie quedaba fuera, y su hueco lo acababa ocupando un técnico que sí comentaba. Iker: *"en vez de la actividad sea en que ellos comenten, simplemente a que vuelvan a tener actividad en el último mes o, si no, en los últimos tres meses, en general en LinkedIn, ya sea publicando, comentando o compartiendo"*.
  - **LA VENTANA:** **1 mes** es lo ideal; si no sale nadie con cargo válido se abre a **3 meses**; **6 meses es el techo** y solo en agosto o Navidad. Por encima de 6 meses, no.
  - **CÓMO SE MIDE:** la última actividad es la **más reciente de las dos fuentes**, `GET /users/{id}/posts` (publicaciones y reposts, con fecha relativa tipo `3d`/`2w`/`1mo`) y `GET /users/{id}/comments` (comentarios que ha hecho, con fecha ISO). Se ordena por esa fecha.
  - **Lo que se gana, medido el 26/08 sobre las mismas empresas:** Reinosa Forgings pasa de 50 días a 7, Velfair de 122 a 7, Talleres Ardanza de 42 a 2, y **Grupo Uvesa deja de estar vacía**. Nadie nuevo entró por la puerta de atrás: el filtro de cargo de arriba es el que sujeta la calidad.
  - ⚠️ **Y lo que se pierde, dicho:** comentar a otros sigue siendo la señal más fuerte de que alguien nos va a comentar. **Entre dos candidatos empatados en cargo, gana el que COMENTA**, no el que solo publica. Lo que cambia es que ya no descarta.
- ~~**Actividad (filtro duro) — que COMENTE a otros, no solo que publique (Iker, 2026-07-24):**~~ 🔴 **SUPERADA EL 2026-08-26 por el bloque de arriba: ya no descarta a quien no comenta.** Se conserva porque el POR QUÉ sigue siendo bueno (comentar predice mejor que publicar) y porque la escalera de ventana de aquí abajo se sigue aplicando tal cual. Lo único que cae es el "solo vale comentar". Texto original: en los **últimos 3 meses** tiene que haber **comentado en el post de OTRA persona**. NO basta con que publique o comparta en su propio perfil: si solo emite y nunca comenta a nadie, la probabilidad de que nos comente a nosotros es bajísima, y una mención así es tirar el hueco. Se comprueba con `GET {BASE}/api/v1/users/{provider_id}/comments?account_id=…` (devuelve los comentarios que HA HECHO, con fecha). **Ordena por recencia del último comentario:** quien comentó esta semana bate a quien comentó hace 2 meses. Sin comentario en 3 meses = descártalo, aunque publique a diario. Si nadie de la empresa comenta, **descarta esa empresa** y coge otra. Verifica que el cargo sea ACTUAL. (Caso real: Jaione de ikale tenía el último POST hace 3 meses —parecía dormida por la regla vieja— pero había comentado hace 2 días y comenta sin parar → mención excelente.)
  - **⭐⭐ LA VENTANA ES FLEXIBLE, NO UN MURO (Iker, 2026-08-07).** Lo IDEAL es que haya comentado en el **último mes**. Pero **descartar una empresa buena porque su gente no comenta desde hace 40 días es tirar la empresa por culpa de la persona**, y eso no compensa. La escalera: se busca a 1 mes; si no hay nadie, se abre a 2; luego a 3; y **hasta 6 como techo**. Iker: *"más de 3 meses sin comentar no creo que nos convenga, o expandirías hasta 6"*. **Por encima de 6 meses no, ahí ya no comenta.**
  - **Y si ni a 6 meses hay nadie, la empresa NO se cae: va SOLO con el nombre de empresa.** Es lo que faltaba escrito. El 07/08 yo quité las 4 personas verificadas del despiece de Navarra porque a 8 empresas les faltaba, y eso es justo al revés: **se pone lo que se tiene**. Iker: *"como hay dos que no tienen, entonces no pones ninguna, eso no me parece bien"*. Una ficha sin persona sigue mencionando a la empresa.
  - **Agosto y Navidad son la excepción obvia:** medio sector está de vacaciones y la ventana corta deja el pilar sin gente. Ahí se abre a 6 sin pensarlo.
  - **¿3 meses o 1 mes?** 3 meses en el filtro duro. Comentar es más esporádico que publicar; exigir "comentó en el último mes" encoge demasiado el pool y deja fuera a gente válida que comenta cada 6-8 semanas. El mes se usa para RANKEAR (más reciente, mejor), no para descartar.
- **⭐ Logo de cada empresa (para el CSV) — EL CAMPO ES `logo_large`, verificado 2026-07-17:**
  ```
  GET {BASE}/api/v1/linkedin/company/{id}?account_id={A}   →   logo_large
  ```
  Devuelve una URL de `media.licdn.com/dms/image/…/company-logo_400_400/…`. Esa URL va **tal cual** en la columna **`Media`** del CSV (Paso 8). Medido en Cataluña: **16 de 16**, ninguna en blanco.
  - **UNA EMPRESA NO SE SACA COMO UNA PERSONA.** Son dos endpoints y dos campos distintos, y confundirlos devuelve vacío:
    | | endpoint | campo |
    |---|---|---|
    | **EMPRESA** | `/api/v1/linkedin/company/{id}` | **`logo_large`** |
    | **PERSONA** | `/api/v1/users/{id}` | `profile_picture_url_large` |
  - **⚠️ Este Paso decía `logoUrl` o `pictureUrl` y NINGUNO DE LOS DOS EXISTE.** Por eso el CSV de Cataluña se entregó el 2026-07-17 con la columna `Media` vacía en las 16 filas y lo pilló el usuario: la regla estaba escrita, pero con un nombre de campo inventado, así que cumplirla al pie de la letra daba vacío igual. **Un nombre de campo no se escribe de memoria: se comprueba contra la API y se anota el día que se comprobó.**
  - No uses favicons de la web oficial: salían en blanco.
- **⛔⛔ LA EMPRESA CALIFICA POR DONDE FABRICA, NO POR LO QUE DICE SU PÁGINA (Iker, 2026-08-07).** Vale para **mapa, "Los 10" y despiece**, los tres.
  - **El fallo:** el 07/08, verificando automoción de Navarra, tumbé **14 de 23 candidatas** porque su página de LinkedIn devolvía la sede global — Benteler en Salzburgo, KYB en Tokio, SKF en Gotemburgo, Kromberg en Wolfsburgo, Weidplas en Suiza, Knorr-Bremse en Múnich—. **Todas tienen planta en Navarra.** Iker: *"con que la empresa tenga relación con la región, o sea que su planta siga estando ahí, la podemos mencionar igual, porque si no nunca vamos a tener empresas"*.
  - **Y ya había precedente nuestro:** en el mapa de Castilla y León entraron **CROPU** (sede en Cantabria) y **Campofrío** (sede en Madrid) porque su centro está en Burgos. La página muestra la SEDE, no la planta, y eso ya estaba escrito.
  - **⭐ EL ANCLA ES EL ORIGEN, NO LA PLANTA (Iker, 2026-08-07, precisando lo de arriba):** *"lo importante es que el origen de la empresa sea en esa región"*. **✅ CALIFICA la que NACIÓ allí**, aunque su página ponga hoy otra ciudad porque creció, la compraron o movió el domicilio social. **❌ NO califica la multinacional de fuera con planta allí**: Benteler es alemana, KYB japonesa, SKF sueca. Tienen fábrica en Navarra y aun así no son de Navarra.
  - **Y esto MEJORA el post, no lo empeora.** El motor del peloteo es el orgullo de pertenencia, y *"esta empresa es de aquí"* pega mucho más fuerte que *"esta multinacional tiene aquí una nave"*. La regla de origen no es una traba burocrática: es la que hace que el post funcione.
  - **Consecuencia práctica: no se descarta por la ciudad de la página.** `Lizarte` sale en Hospitalet y nació en Estella; `Seinsa` sale en Madrid y es navarra. Esas VUELVEN a entrar. Lo que decide es el origen, y se verifica: su web, su historia, el año y el sitio de fundación, o el topónimo en el propio nombre (`Frenos Iruña`, `Tafalla Iron Foundry`).
  - **Si existe la página LOCAL, se menciona esa y no la del grupo** (`GONVAUTO NAVARRA SA` antes que `Gonvauto`, `TI GROUP AUTOMOTIVE SYSTEMS PAMPLONA SA` antes que `TI Fluid Systems`): notifica a la gente que está allí, que es de quien queremos el comentario.
  - **🔴 LO QUE NO CAMBIA: la colisión de nombre sigue matando.** Buscando `MAPSA` sale una asociación de colegios de Michigan y buscando `SAKANA` sale Sakana AI, de Tokio. **Que ahora aceptemos sedes de fuera hace esto MÁS peligroso, no menos**, porque ya no puedo usar "la sede no es de la región" como señal de alarma. La descripción se lee siempre.
- **Orden:** por probabilidad de interacción (actividad reciente > cercanía industria/territorio/exportación > perfil personal visible > tamaño adecuado).
- **🔗 EL ENLACE DE LA GUÍA SE SACA DE `public_identifier`, NUNCA SE DEDUCE DEL NOMBRE (Iker, 2026-08-05).** Escribí a mano `linkedin.com/company/telpark/` a partir del nombre "Telpark" y **seis de los ocho enlaces de esa guía estaban rotos**: el de AFM es `afmcluster`, el de UPTEK es `uptek-afm`, el de Multiverse es `multiversecomputing`, el de Arania es `arania-s-a-` y el de Betsaide es `betsaide-sal`. Ninguno se parece a su nombre.
  - **Y el de Telpark era peor que un 404: apuntaba a OTRA EMPRESA.** `/company/telpark/` es una `TELPARK` de Bury, en Reino Unido, que gestiona un centro comercial. La nuestra vive en `/company/empark-aparcamientos-y-servicios-s-a/` porque Telpark es la marca de Empark. **Dos páginas con el mismo nombre y distinta empresa: deducir la URL te manda a la equivocada sin que te enteres.**
  - **Siempre así:** `GET /linkedin/company/{id}` → `public_identifier` → `https://www.linkedin.com/company/{public_identifier}/`. Es el mismo error de familia que el `logoUrl` inventado del Paso 4: **un campo no se escribe de memoria, se lee de la API**.
  - **Ojo, esto NO afecta a la mención del post**: ahí va el `name`, y LinkedIn lo resuelve solo en el desplegable. El `public_identifier` es solo para el enlace de la guía.
- **⚠️ NOMBRES EXACTOS DE LINKEDIN, ni uno retocado.** Copia el campo `name` que devuelve Unipile (empresa y persona) **literal**: mayúsculas, tildes, `S.A.`/`S.A.U.`, y hasta el tagline si la página lo lleva en el nombre (`Cartonajes Barco | Soluciones de embalaje`). **Prohibido "embellecerlos"**: nada de `ARPA EMC` por `ARPA Equipos Móviles de Campaña`, ni `Nurel` por `NUREL`, ni quitar el `S.A.`.
  **Por qué importa (no es cosmético):** el usuario pega las @ a mano y LinkedIn autocompleta **por el nombre exacto**. Si el nombre no coincide, no salta el autocompletado → la mención se queda en texto muerto → esa empresa no recibe notificación → mención perdida y, con ella, el alcance que el mapa presta. Y como LinkedIn inserta el nombre real al mencionar, el post publicado acabaría distinto del que validaste.
  Lo mismo para las personas (`first_name + last_name` tal cual: `Oscar Fernandez Feito`, sin ponerle las tildes que su perfil no tiene).
- **@ DELANTE DE CADA NOMBRE**, empresa y persona: `→ @Empresa - @Persona`. No es cosmético: el usuario pega el post en LinkedIn y clica detrás de cada @; con la arroba ya puesta, LinkedIn dispara el buscador de menciones solo. Sin ella tiene que ir escribiendo arroba por arroba, 40 veces.
- **LÍNEA EN BLANCO entre la frase de entrada y la primera empresa.** La frase que presenta la lista (`Estas son las 20 que lo sostienen, y quien hay detrás:`) va **sola, con un salto en blanco detrás de los dos puntos**. Nunca pegada a la primera `→`: pegada, la lista se lee como un muro y la frase pierde el efecto de anuncio.
```
❌ MAL                          ✅ BIEN
Estas son las 20:               Estas son las 20:
→ @Fersa - @Rafael Paniagua
                                → @Fersa - @Rafael Paniagua
```
- **Salida:** lista limpia, sin explicación, en **5 bloques de 4 líneas** (20 en total), formato exacto:
```
Frase de entrada:

→ @Empresa - @Persona
→ @Empresa - @Persona
→ @Empresa - @Persona
→ @Empresa - @Persona

→ @Empresa - @Persona
(… ×5 bloques)
```
- **🚫 NO AVISES DE LOS NOMBRES CON SÍMBOLOS, PARÉNTESIS O TAGLINE. ERA FALSO (Iker, 2026-08-03).** Aquí ponía que `@Lingotes Especiales SA (LGT)` o `@Cartonajes Barco | Soluciones de embalaje` daban problemas al buscar la mención y que había que recortarlos. **No es verdad: con la @ delante, Iker hace clic y LinkedIn los encuentra perfectamente**, paréntesis y barras incluidos. El aviso solo metía ruido y le hacía dudar de nombres que funcionan. **Los nombres van completos y sin nota de ningún tipo**, que es justo lo que pide el Paso 4. Yo escribí esta regla sin comprobarla contra el uso real.
- **Ejecución y credenciales:** **Claude lo ejecuta** vía Unipile. Las credenciales **NO van en el repo** — ya están puestas como **variables de entorno**: la **API key** de Unipile, la **URL/DSN base** (host + puerto) y el **account_id**. Léelas de ahí en el runtime (nombres del tipo `UNIPILE_API_KEY`, `UNIPILE_DSN`/URL, `UNIPILE_ACCOUNT_ID` — usa las que estén configuradas; si no las encuentras, lista las env vars del entorno). Construye las llamadas (`GET {DSN}/api/v1/linkedin/company/{identifier}`, cabecera `X-API-KEY`) con esos valores. Nunca hardcodees la key. (Respaldo si el account_id no estuviera en env: `7F9jXBHXQJyR--5uTD62OQ` — no es secreto sin la key.)
- **URLs de LinkedIn:** al sacar cada empresa+persona, captura también la **URL de LinkedIn de la empresa** (su página) y la **URL del perfil de la persona**. Sirven para la guía de menciones del output (Paso 10).
- **Menciones:** las @-menciones reales las pone el usuario a mano en LinkedIn (copiar/pegar no arrastra los tags). El workflow entrega los NOMBRES en el bloque del cuerpo **y, aparte, la guía de menciones con los enlaces** (Paso 10) para que el usuario encuentre a la persona/empresa correcta sin confundirse con homónimos.

**Paso 5 — CTA AL MAPA (link a `recursos.neety.com/mapas/{región}`) — NO es el cierre:**
> **Las 7 reglas de forma del bloque están en `global-instructions §4.4b` (posición, máx 2 líneas, `https://` delante). Léelas ahí, no de memoria.** Y el **QUÉ** dice el bloque sale del banco de dolores de **`global §4.4b-MUNICIÓN`**, con su lista de promesas vetadas. Aquí lo específico del mapa:
- **⚠️ EL ENLACE DEL MAPA VA A `recursos.neety.com/mapas/{región}/`, NO a agendar** (Iker, 2026-07-23). El jefe ya pagó PamPam, así que la web de recursos **embebe el mapa completo** de esa región. Se enlaza ESO. El CTA a `/agendar/` se olía a venta ("te decimos en cuál sembrar y cuándo" = demo); el enlace al mapa se lee como **recurso**, que es lo que el lector ya venía a buscar, y captura igual (la propia página de recursos lleva su gate/CTA a agendar). El slug es la región en minúscula y sin tildes: `/mapas/murcia/`, `/mapas/aragon/`, `/mapas/pais-vasco/`. **Verifica que la página existe antes de entregar** (WebFetch a `recursos.neety.com/mapas`); si aún no está subida, va como `[PENDIENTE · subir el mapa a recursos]`.
- **⭐⭐ ESTO NO ES UN SPAM NINJA MEJOR, ES DE OTRA CATEGORIA (Iker, 2026-07-31: "yo a esto lo llamaria ULTRA NINJA").** Merece entenderse, porque explica por que gana y que hay que vigilar. Cuatro cosas que se acumulan:
  1. **No pide nada.** Promete justo lo que el lector venia buscando tras leerse 12 empresas. Sin demo, sin "te ayudamos", sin nada que rechazar. **Un CTA que no pide no se puede declinar.**
  2. **El clic es autoseleccion pura.** Solo pincha a quien le interesa la industria de ESA region, que es exactamente el ICP. Ese clic vale mas que cien impresiones.
  3. **Aterrizan en NUESTRO dominio, no en PamPam.** El trafico es nuestro, el SEO es nuestro, y **quien vende es la pagina, no el post**.
  4. **Y ahi esta lo ultra:** la venta ocurre **DESPUES** del clic. El spam ninja normal todavia huele un poco a pitch; este no huele a nada. Descubren que es nuestra web cuando ya estan dentro.
- **🔴 LA CONSECUENCIA, Y ES LA PARTE QUE SE OLVIDA:** si el post ya no vende, **quien tiene que convertir es la PAGINA**. Todo el peso del gate y del CTA a agendar se ha mudado alli. **Si esa pagina no captura, el post entero se queda en alcance bonito.** Asi que al medir un mapa no basta el ratio: hay que mirar **clics al enlace** y **que hace la pagina con ellos**. Y si alguna vez hay que elegir donde invertir una hora, va antes la pagina que el post.
- **Colocación: en la zona final, detrás del reveal y del barrido** (`§4.0d` punto 6, medido el 16/09). 🔴 Aquí ponía *"justo DESPUÉS del bloque de menciones"*, y contradecía el ORDEN EXACTO de Iker del 03/08, dos pasos más arriba, y lo que publicamos en 20 de 21 peloteos.
- **Framing de recurso, no de anuncio. Forma corta exacta y COMPLETA: `Mapa completo aquí: {link}`** (sin coma, sin "empresa por empresa", y sin nada delante). Es el molde literal que dio los CTR más altos (Galicia, Valencia, Bizkaia). NO "te decimos", NO "reserva", NO "agenda", NO alargarlo.
- **🔴 CORREGIDO EL 2026-07-31: EN EL MAPA VA SOLO LA LINEA DEL ENLACE, SIN FRASE DE DOLOR DELANTE.** Es el **SPAM ULTRA NINJA** (`global §4.4b`), y el motivo esta ahi: el mapa es el pilar que mas clics genera **precisamente porque nada insinua que llevamos a nuestra web**, y una frase de dolor delante reintroduce el olor a venta que es lo que el ultra ninja elimina. **El bloque de DOS que pide §3.2 se saca de otro par natural del cuerpo.** Lo de abajo es la regla vieja, se conserva porque **sigue valiendo para el spam ninja normal de los demas pilares**:
- ~~**Bloque de DOS líneas pegadas (SIN salto en blanco entre ellas), no dos líneas sueltas**~~ (Iker, 2026-07-23). El chiste del hook va encima del CTA y se leen de un golpe: dolor → fix. Un enlace flotando solo con blanco alrededor tiene pinta de anuncio (ceguera de banner) y rompe el problema→solución; además el spam ninja va SIEMPRE fusionado (`global §4.4b`). El dolor aterriza en el industrial de ESA región con un diferenciador de `aboutme §1b`, girando la palabra del hook. Validado (Murcia, hook del desierto):
  > `Picar 500 puertas frías para sacar uno. Eso es sembrar en el desierto.`
  > `Mapa completo aquí: https://recursos.neety.com/mapas/murcia/`

**Paso 6 — CIERRE del post:** una **frase punchy tipo bold statement** que remate el post. **NO** pide comentarios, **NO** hace pregunta, **NO** repite el link. Es un claim fuerte que cierra (p. ej. "Al final las que más venden son las que menos lo cuentan.").

**Paso 7 — Ensamblar el TEXTO** copy-ready, en este orden: **gancho → cuerpo (3 datos + clichés + reveal) → 20 empresas en 5×4 → CTA al mapa (link `recursos.neety.com/mapas/{región}`, NO agendar) → cierre punchy**. Corre el pase de validación (§8) en silencio.

**⭐⭐ COORDENADAS: UNA DISTINTA POR EMPRESA, NUNCA LA DE LA CAPITAL (Iker, 2026-08-03).** En el CSV de Castilla y León le puse a las 4 empresas de Burgos **la misma coordenada, la de la capital** (`42.3400, -3.7000`). PamPam las apiló en el punto exacto y **salieron como puntos sin logo y sin nombre**: cuatro menciones tiradas. Se vio a simple vista en el mapa montado, porque las cuatro fallonas eran justo las cuatro pegadas.
- **Cada empresa lleva la coordenada de SU dirección**, que sale del campo `locations` de su propia página (`GET /linkedin/company/{id}` → `locations` con `street`, `city`, `postal_code`). Un polígono industrial y el centro de la capital están a 3-4 km, y con eso PamPam ya las separa.
- **Comprobación obligatoria antes de entregar el CSV:** que **no haya dos coordenadas iguales**. Es una línea de código y evita el fallo entero:
  ```python
  assert len({f[4] for f in filas}) == len(filas), 'coordenadas repetidas'
  ```
- **🚫 LOS MAPAS YA PUBLICADOS NO SE RETOCAN (Iker, 2026-08-04).** El de Asturias comparte coordenada en tres empresas y probablemente le pasó lo mismo, pero **ya está subido y rehacerlo no cambia nada**: la regla existe **de cara al futuro**. Vale para cualquier corrección de este tipo — se arregla la receta, no el pasado.
- **🔎 Y de paso, mirar la dirección revela cosas:** al sacarlas salió que **CROPU tiene la sede en Guarnizo (Cantabria)** y **Campofrío en Alcobendas (Madrid)**, aunque las dos tengan centro en Burgos. Es el patrón de siempre: **la página muestra la SEDE, no la planta**. No las tumba, pero se avisa en la entrega para que el usuario decida.

**Paso 8 — CSV para PamPam** (clonar `ref_import_navarra.csv`, en esta misma carpeta — plantilla de referencia sobre Navarra):
- **Cálcalo tal cual:** misma estructura de columnas, mismo orden, mismas comillas, mismo formato (incluida la columna `Section` que aparece DOS veces — se mantiene). Cambia solo la info por ser otra ubicación.
- Solo las 20 empresas que has elegido para el post.
- **Coordenadas:** formato `"lat, lng"` como string entre comillas, **verificadas** según la dirección real de la sede (se matchea como coordenadas, nunca como dirección, para que Google Places no sobrescriba).
- **Descripciones:** en español, **una sola frase** por empresa, foco industrial/exportador, sin relleno.
- **Agrupa por `Section`** en categorías limpias de sector.
- **⭐ Logo → columna `Media`, la ÚLTIMA, y NUNCA se entrega vacía.** Pega ahí el **`logo_large`** de cada empresa (Paso 4). Es la columna que el usuario mira primero, y **el CSV de Cataluña se entregó con las 16 vacías** (2026-07-17). Referencia real: `mapa_aragon_pampam.csv` en el Escritorio, donde `Media` lleva `https://media.licdn.com/dms/image/v2/…/company-logo_400_400/…`. NO uses favicons de la web (salían en blanco). `Sticker` = 🏢.
- **Antes de entregar el CSV, cuenta las filas con `Media` no vacío y dilo en la entrega** (`16/16 con logo`). Si alguna se queda sin logo, va marcada y avisada — en Aragón se coló una vacía sin avisar.
- Incluye TODAS las columnas del archivo de referencia (el Match mode sobrescribe el registro entero).

**Paso 9 — TÍTULO y DESCRIPCIÓN para la web del mapa** (van juntos, los dos siempre):
- **Título — plantilla FIJA, no la reinventes:** `[Región]: el músculo industrial`. Ej.: `Álava: el músculo industrial` · `Aragón: el músculo industrial`. Aquí no toca creatividad: es el formato de la web y se repite mapa a mapa.
- **Descripción de 2 líneas:** corta y concisa, tipo "20 empresas industriales de [región] de los sectores X, Y, Z…". Sin florituras. Sin fechas (`global §3.5b`).

**Paso 9b — LA PÁGINA DEL MAPA LA CREO YO (Iker, 2026-08-27) — el prompt al programador SE RETIRA:**
- **Es el espejo de `§4.5.0-YO-LO-HAGO`** (el recurso del lead magnet lo adapto yo): la página de `recursos.neety.com/mapas/{region}/` **la creo yo directamente en el repo `neety-resources`** (`C:/Users/LENOVO/Desktop/neety-resources`), no se entrega un prompt. Estrenado con Cantabria el 27/08 (commit `f71b1d3`).
- **CÓMO:** clonar la master **`mapas/murcia/index.html`** (lleva dentro el comentario `PLANTILLA DE MAPA` con lo editable marcado `<< EDITAR >>`) a `mapas/{slug}/index.html` y editar SOLO eso: title/meta/og/canonical, H1, lede con ángulo, las 3 cifras con su fuente (sin años, `global §3.5b`), el iframe, el párrafo de valor (con empresas Y pueblos del propio mapa, no solo la capital) y el JSON-LD.
- **⚠️ EL ALTA SON TRES SITIOS MÁS, y es lo que siempre se olvida:** la **tarjeta** en `mapas/index.html` (la más reciente ARRIBA), su **JSON-LD** (entra en posición 1 y se renumeran las demás) y el **`sitemap.xml`**.
- **⚠️ La banda del evento lleva `utm_source` y `utm_campaign` con el slug de ESTA región** (`recursos-mapa-{slug}`): la propia plantilla avisa de que es lo que se copia mal al clonar.
- **Lo ÚNICO que no puedo producir es el embed de PamPam** (lo monta Iker desde el CSV). Si aún no ha llegado, la página sale entera con un hueco con estilo de la web donde va el iframe y se cierra después con un push de una línea; si ya llegó, nace completa. **Al pedirlo, se le pide la URL de PamPam con su hash, ya no un prompt.**
- **La portada `assets/mapas/{slug}.jpg` también la saco yo:** captura del mapa VIVO de PamPam con Playwright (`devDependencies` del propio repo) a **2400×1260**, el encuadre de las otras. La foto de portada que PamPam publica como `og:image` NO vale: es la foto de la región, no el mapa con los logos.
- **Verificación tras el push** ([[deploy-auto-con-lag]]): despliega solo en ~2-3 min, pero a veces el build NO se lanza. `curl` a la URL nueva; si a los ~5 min sigue en 404, no seguir esperando: panel de Cloudflare.
- ~~**Paso 9b viejo — PROMPT PARA EL PROGRAMADOR:**~~ retirado. Se conserva abajo lo que sigue siendo verdad de CÓMO está montada la web:
- **⚠️ NO SE ESCRIBE DE MEMORIA NI MIRANDO LA WEB POR FUERA (Iker, 2026-07-31).** Escribí el de Asturias calcándolo de lo que se veía en la de Murcia ("reutiliza el mismo layout, la misma tipografía") y **contradecía cosas que el programador ya sabe de la web**: yo describía la fachada, no cómo está montada por dentro. Y encima me inventé un título cuando el **Paso 9 ya fija la plantilla** `[Región]: el músculo industrial`.
- **Un párrafo, explicado como a un amigo, específico y sin secciones** — igual que los prompts de imagen (`images §0a`). Nada de listas, ni bloques con encabezados, ni meta-título/meta-descripción sueltos si la web ya los genera.
- **⚠️ DEBAJO DEL PROMPT VA SIEMPRE EL AVISO A MARIO (Iker, 2026-08-03), en su propio bloque**, igual que el de postproducción en los prompts de imagen (`images §0a-penta`). Literal:
  > ⚠️ **Acuérdate Mario de pegarle al final del prompt el código embebido de PamPam.**
  **El disparador es ENTREGAR el prompt, no acordarse.** El hash es lo único que el programador no puede deducir de nada, y si se copia mal el mapa carga vacío sin dar error.
- **Lo que hay que darle cada vez** (esto sí lo pone el post): región, slug, título del Paso 9, descripción del Paso 9, los 3 datos del cuerpo y el **embed de PamPam**, que lo monta Iker desde el CSV y sin él el prompt no está cerrado.
- **📌 CÓMO ESTÁN HECHAS LAS PÁGINAS DE LOS MAPAS (respuesta del programador, 2026-07-31 — esto ya no se pregunta más):**
  - **No hay componente, ni JSON, ni panel.** Cada página es un **HTML estático de 227 líneas clonado a mano**. La master es **`mapas/murcia/index.html`**, que lleva dentro un comentario `PLANTILLA DE MAPA` con los campos marcados `<< EDITAR >>`.
  - Las **10 páginas de hoy comparten estructura idéntica** (cabecera a dos columnas con el mapa a toda altura) y solo cambian **~15 líneas**: título/SEO/OG/canonical, H1, lede, las 3 cifras con fuente, el iframe y el párrafo de valor.
  - Crear una región = copiar la carpeta a `mapas/{region}/`, editar lo marcado y **darla de alta en TRES sitios más**: la **tarjeta** en `mapas/index.html`, su **entrada en el JSON-LD** de esa misma página (*"es lo que se suele olvidar"*, dicho por él) y el **`sitemap.xml`**. Push a `main` y **Cloudflare publica solo en 2-3 minutos**.
  - **🔴 DE MÍ SOLO NECESITA DOS COSAS: la URL pública de PamPam con su hash, y las 3 cifras con fuente.** El `?fullPanelMobile=true`, el iframe y el CSS los pone él. **El SEO, el título, el H1, el canonical y el OG se derivan solos del nombre de la región: NO se los escribo.** El lede lo escribe él con el patrón `[Región]: el músculo industrial` **salvo que yo traiga ángulo**, y traerlo es lo que aporta el workflow.
  - **La portada `assets/mapas/{region}.jpg` la saca ÉL, y es una captura del propio mapa.** Por eso el Paso 11 está muerto (ver abajo).
  - **Tiempo:** menos de una hora desde que tiene URL y cifras, verificación en escritorio y móvil incluida.

**⛔ EL NOMBRE NUNCA SE ACORTA, NI EL DE LA PERSONA NI EL DE LA EMPRESA (Iker, 2026-07-31).** Va **tal cual lo devuelve LinkedIn**, en el cuerpo del post Y en la guía, en **todos los pilares**, no solo en el mapa. Aunque quede largo, aunque lleve `S.A.`, aunque el nombre de la página tenga un guion dentro y choque con el separador ` - ` de la línea.
- **Razón 1, la que él da:** con el nombre recortado **no encuentra el perfil** en el desplegable de la @ y pierde el tiempo buscándolo.
- **🔴 Razón 2, que es peor y la descubrimos en Asturias:** **acortar rompe el detector de repetidas de `§4.0c`.** Yo escribí `@TSK` y el cruce contra el "Los 10" de Asturias de Iker no saltaba; al poner el nombre real, **`TSK Electrónica y Electricidad` salió repetida al instante**. Lo mismo con `@Reny Picot`, que es la **marca comercial** y no el nombre de la página (`Industrias Lacteas Asturianas, S.A.`). **Un nombre acortado no es solo incómodo: esconde violaciones de reglas.**
- **Ojo con las marcas:** la empresa se menciona por el nombre de **su página**, no por la marca con la que la conoce la gente. Si quieres que se entienda, la marca va en la **descripción del CSV**, nunca en la mención.
- **Ojo con las tildes:** si el perfil está escrito sin ellas (`Jesus Angel Perez Fernandez`) se copia **sin ellas**. Manda el perfil, no la ortografía.

**Paso 10 — Guía de menciones** (fuera del post, para pegar las @ a mano): las 20, para que el usuario encuentre a la persona/empresa correcta sin confundirse con homónimos.
- **⚠️ ESTO APLICA AL MAPA (20 menciones). Con POCAS menciones, TABLA DE 4 COLUMNAS (Iker, 2026-07-29).** La frontera es el numero:
  - **Hasta 12 fichas** (historia con peloteo, "Los 10", despiece): **tabla markdown de CUATRO columnas**, en este orden exacto: **nombre de la empresa | enlace de la empresa | nombre de la persona | enlace de la persona**. Se lee de un vistazo y se comprueba fila a fila.
  - **20 menciones (el mapa):** linea a linea, sin tabla, calcando la posicion del post, que es para lo que sirve ahi.
- **NUNCA en tabla markdown** *(solo en el mapa, ver el punto de arriba)*. El usuario la usa línea a línea; la tabla estorba y no se copia bien.
- **Tiene DOS usos y por eso DOS formatos. Da el que toca según dónde la entregues:**
  - **En el CHAT (revisión):** enlaces **CLICABLES** (markdown `[texto](url)`), **fuera** de bloque cercado. Es la única forma de que el usuario abra las 20 fichas de una en una y confirme que la persona sigue ahí, que el cargo cuadra y que es de la región. Dentro de un bloque cercado NO se puede clicar → inservible para revisar.
  - **En un fichero de entrega:** **bloque cercado de texto plano** con las URLs desnudas, para copiar/pegar limpio.
  - Es la excepción a `working-preferences §1` (que pide bloque cercado): esa regla existe porque LinkedIn mangla los saltos del POST, y la guía de menciones no se pega en LinkedIn.
- **Calca el formato y el orden del bloque de empresas del post** (mismas 5×4, mismo orden), pero cambiando cada nombre por su URL. Así cada línea de la guía cae en la MISMA posición que su línea del post y se va bajando a la vez por los dos.
- **Solo las dos URLs, nada más.** Sin cargo, sin fecha de actividad, sin por qué está elegida: en el MAPA no hay que justificar cada ficha (la justificación va aparte, en la lista de "revisa estas"). El nombre ya viaja dentro de la URL.
**Así en el CHAT** (suelto, sin cercar, para que se renderice y se pueda clicar):
`→ [Empresa](https://www.linkedin.com/company/…) - [Persona](https://www.linkedin.com/in/…)`

**Así en un FICHERO** (cercado, URLs desnudas):
```
→ linkedin.com/company/… - linkedin.com/in/…
→ linkedin.com/company/… - linkedin.com/in/…
(… 5 bloques de 4, en el orden exacto del post)
```

**Paso 11 — FOTO de portada, y es para PAMPAM, no para la web.**
> **🔴 ESTO LO MATÉ POR ERROR EL 31/07 Y LO REVIVE IKER EL 03/08.** El programador me dijo que la portada de la **página web** (`assets/mapas/{region}.jpg`) es una captura del propio mapa y la saca él, y yo di por muerto el paso entero. **Eran DOS fotos distintas y las confundí:**
> - **Portada de la WEB** → captura del mapa → **la saca el PROGRAMADOR**. Esa sí que no la doy yo.
> - **Portada de PAMPAM** → foto icónica de la región → **la doy YO**, y va en el output junto al título y la descripción, que son los tres campos que PamPam pide para el mapa.
>
> **Lección: cuando alguien me resuelve una tarea, compruebo QUÉ tarea exactamente antes de borrar el paso.** Borré de más por no distinguir dos cosas con el mismo nombre.
- Una foto **icónica y reconocible de la región** (lo primero que a alguien le viene a la cabeza con "Aragón"): capital/skyline, río, monumento o paisaje-marca. Horizontal, ≥1200px de ancho, que funcione recortada como cabecera.
- **🚫 NUNCA "la primera que salga en Google Imágenes".** Casi todo lo que devuelve Google es **material con copyright** (bancos de imágenes, prensa, fotógrafos). Esta foto va a la **web pública de una empresa** = uso comercial: una reclamación es dinero real y llega por burofax. Que sea fácil de coger no la hace libre.
- **Busca solo en fuentes de licencia libre y comprueba la licencia una por una:** **Wikimedia Commons** (usa su API: `action=query&generator=search&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata` → lee `LicenseShortName` y `Artist`), Unsplash, Pexels. Sirven: **CC0 / dominio público** (lo mejor: sin obligaciones), **CC BY** y **CC BY-SA** (obligan a atribuir). **NO sirve** ningún **CC NC** (prohíbe uso comercial) ni nada sin licencia explícita.
- **MÍRALA antes de entregarla** (descárgala y ábrela). No entregues una foto por su título: los buscadores devuelven escaneos de libros, cuadros y fotos mal encuadradas mezclados con las buenas.
- **Entrega:** el fichero + la URL de descarga + **licencia y autor listos para pegar**. Si hay una CC0 decente, ofrécela como alternativa aunque la bonita sea CC BY-SA: al usuario le puede compensar no tener que atribuir.
- Validado (Aragón): `Zaragoza Rio Ebro and Catedral-Basílica del Pilar upstream from Puente de Piedra.jpg` (CC BY-SA 4.0, Ymblanter) y la alternativa CC0 `Zaragoza shel.JPG`.
- Validado (Castilla y León): `Burgos cathedral 1.JPG`, **CC0** (Jebulon), 4600x3316. **Prioriza CC0 siempre que la haya**: no obliga a atribuir y en una web comercial eso es una cosa menos de la que acordarse.

**⚠️ EL PROMPT DE LA WEB NECESITA LA URL DE PAMPAM, Y NO LA TENGO YO (Iker, 2026-07-30).** El orden real es: yo entrego el CSV → **Iker monta el mapa en PamPam** → Iker me pasa el **enlace** → y solo entonces el prompt del programador esta completo. **Si entrego el prompt sin ese enlace, va SIEMPRE con un aviso en la entrega pidiendoselo.** Si Iker manda el `<iframe>` entero, **el prompt lleva la URL de `src` sin parametros** (`https://www.pampam.city/{hash}`), porque el programador pone el `?fullPanelMobile=true`, el iframe y el CSS por su cuenta. **Pero el iframe crudo se pega igual al final del prompt, en una linea** (Iker, 2026-07-31): el **hash es lo unico que no se puede deducir de nada** y un caracter mal copiado no da error, carga el mapa vacio. Cuesta una linea y mata el unico fallo silencioso del proceso.

**⭐ ORDEN EXACTO DEL OUTPUT (Iker, 2026-08-03). No es cosmético: es el orden en que él lo ejecuta.**
> 1. **TEXTO** del post, en bloque cercado.
> 2. **GUÍA DE MENCIONES**, con enlaces clicables fuera de cercado (Paso 10), calcando el orden del post.
> 3. **CSV** para importar en PamPam.
> 4. **FOTO** de portada para PamPam (Paso 11), con su licencia y autor.
> 5. **TÍTULO** (`[Región]: el músculo industrial`), en su bloque cercado.
> 6. **DESCRIPCIÓN**, en su bloque cercado y en un solo párrafo.
> 7. **PROMPT PARA EL PROGRAMADOR** de la página web (Paso 9b), en un párrafo.
>
> **Los puntos 3, 4, 5 y 6 van juntos y en ese orden porque son las cuatro cosas que se meten en PamPam de una sentada**: importas el CSV, subes la foto, pones el título y pegas la descripción. Yo se lo daba con el título antes que el CSV, que es al revés de como se usa.
> La **imagen del POST** no la doy nunca: es la captura de PamPam que hace el usuario. La **portada de la WEB** tampoco: la saca el programador.

**⚠️ AVISO DE LA CAPTURA DEL MAPA — VA EN TODA ENTREGA DE MAPA (Iker, 2026-07-31).** En el mapa **NO se avisa de limpiar metadatos**: la captura sale de PamPam, que es una web, y no ensucia nada (`images §0` lo explica). Lo que sí se avisa es del **encuadre**, que es lo único que puede salir mal y solo lo ve el que hace la captura. **UNA LÍNEA, ni una más**, literal:
> ⚠️ Antes de capturar, comprueba que los logos se ven grandes y bien espaciados entre sí; si alguno queda muy lejos, muévele la ubicación a mano en PamPam.

**Nada de que se lean los nombres (Iker, 2026-07-31):** ese lo quitó él, así que no vuelve. El aviso es solo de espaciado y tamaño.

**Por qué es el aviso que importa aquí:** en el mapa la imagen ES el contenido. Un logo pisando a otro o un nombre cortado se lee como chapuza justo en el post que va de que conocemos a esas empresas. Y como la captura la hace el usuario, es el único punto del pilar que yo no puedo verificar.

**🔴 EL TÍTULO Y LA DESCRIPCIÓN NO SE OLVIDAN (Iker, 2026-07-31).** Es la pieza (3) y se me quedo fuera en la entrega de Asturias. **Repasa esta lista de cuatro antes de dar por cerrado el mapa**, aunque la conversacion venga larga y llena de retoques: precisamente cuando hay muchas iteraciones es cuando se cae una pieza.

**Guardarraíles de elección de región (Paso 0):**
- **🔔 ANTES DE NADA, RECUÉRDALE LO DEL ORGULLO DE PAÍS (encargo de Iker, 2026-07-29).** Antes de proponer región, dile que tiene aparcada la idea de hacer el peloteo con **orgullo de ESPAÑA frente a otros países** en vez de por comunidad: *"no conozco a nadie que se sienta orgulloso de ser europeo, pero de ser español sí"*. Motor de pique sano tipo Mundial (Argentina, México, Uruguay, Chile, Colombia, Perú), **jamás tirando mierda a nadie**, que ya tenemos clientes latinoamericanos y queremos más. Él decide si toca ya o sigue aparcada.
- **🔴🔴 VERIFICAR UNA MENCIÓN SON CUATRO COMPROBACIONES, NO UNA (Iker, 2026-07-29, tras el despiece de Euskadi).** Yo daba por bueno "trabaja en esa empresa" y le devolvía las dudas al usuario. **Eso es mi trabajo, no el suyo.** Las cuatro, todas, antes de escribir un nombre:
  1. **¿La EMPRESA hace esa pieza?** Se comprueba contra **su propia descripción de LinkedIn** (`GET /api/v1/linkedin/company/{slug}` → `description`), nunca por intuición. Ese día iban a colarse cinco falsas: **Copreci** hace electrodomésticos, **Orkli** climatización de edificios, **Goizper** bancos de ensayo, **Onapres** prensas hidráulicas y la página de **Grupo ELAY** es de recursos humanos. Ninguna hace piezas de coche. Si la descripción está vacía, la empresa se cae: **Mecaner** y **Megatech Amurrio** se quedaron fuera por eso.
  2. **¿La PERSONA está en esa región?** El `location` del PERFIL, no el titular. **En multinacionales el buscador te devuelve gente de otras plantas:** `Jasmin Gaši` (Mubea) está en **Suiza**, `Martha Melo` (Walter Pack) en **Barcelona** y `Àlex Rodríguez Aguado` en **Barcelona aunque su titular diga "Gestamp Bizkaia"**. **El titular dice dónde está la planta; el location dice dónde está la persona. Manda el location.**
  3. **¿Tiene cargo con poder de decisión y actividad en LinkedIn?** El filtro de `§4.0d` punto 3 (ya no es "¿comenta?": se revirtió el 26/08).
  4. **¿Tiene el apellido completo?** Descarta los abreviados tipo `Daniel M.`: la mención se renderiza cortada y queda fatal. Y **el nombre exacto se saca del endpoint de USUARIO, no del buscador**, que trunca: el search devolvía `Josu Zaldua Saenz de Burua` y el perfil dice `Saenz de Buruaga`.
  - **Consecuencia práctica:** de 20 candidatas verificadas quedaron **12**. Y 12 salen en **3 bloques de 4 exactos**, que es mejor que 14 en 4+4+3+3. **Verificar de verdad no solo evita el error: a veces mejora el formato.**
- **⚠️ PREGUNTA PRIMERO PARA QUÉ CUENTA ES.** La región no se elige en abstracto: **las regiones quemadas son POR CUENTA**, no globales. Iker ya hizo Cataluña → Iker no la repite jamás, pero **Unai y Asier sí pueden hacerla**. El plan es que cada cuenta acabe tocando todas las regiones (España se acaba). Mira la cobertura por cuenta en `docs/skills/historial-publicaciones.md` **antes** de proponer nada.
- **El CONCEPTO no se repite en los 42 días siguientes, tampoco entre cuentas** (`§4.0d` punto 7; antes ponía "NUNCA") (medido: "país inventado" 7.87x en Unai → 1.2x al repetirlo Iker). Y si una cuenta hace una región que ya hizo otra, el concepto, el país de comparación y los clichés van **todos nuevos**.
- **Prefiere la COMUNIDAD AUTÓNOMA a la provincia/ciudad** — más alcance. Validado: elegimos Cataluña (no Barcelona); y Álava (provincia) rindió MENOS que País Vasco (comunidad). Baja a provincia solo si tiene identidad muy fuerte y ya tocaste la comunidad.
- Greenlit (comunidades sin tocar): Aragón, Asturias, Murcia, Castilla y León, Castilla-La Mancha, Extremadura, La Rioja, Cantabria, Canarias, Baleares…
- Baneadas: capitales/ciudades obvias (Madrid 0.55x) y cualquier cosa que critique a otra región española.
- ≥2 semanas desde el último mapa de esa cuenta. **Región: no repetir DENTRO de esa cuenta** (otra cuenta sí puede hacerla). **Concepto: no repetir NUNCA, ni entre cuentas** (medido: 7.87x → 1.2x al repetirlo otra cuenta).

### 🚫 4.2-PAIS · ~~PELOTEO DE PAÍS POR ADIVINANZA~~ · NO EXISTE. ME LO INVENTÉ (2026-08-05)

**Lo dejo escrito porque el ERROR es más útil que la regla que quise poner.**

Auditando el cajón `otro` vi el post de Unai del 12/06 (*"Nadie habla de este país…"*, **78.711 impresiones**), no encontré bloque de menciones, vi **33 likes y 32 comentarios** y concluí que habíamos descubierto un pilar nuevo cuyo motor era la adivinanza. Se lo presenté a Iker como el segundo mejor post del histórico.

**Estaba mal en tres cosas, y las tres estaban ya escritas en `historial-publicaciones.md`:**
1. **No es peloteo, es un MEME.** La ficha lo dice literal: *"Mapa-meme dibujado (NO peloteo)"*. La imagen era un mapa dibujado y el país era **inventado**: humor y sarcasmo puros.
2. **El motor no era la adivinanza, era CONTROVERSIA INVOLUNTARIA.** *"Lo leyeron como burla a Baleares."* Esos 32 comentarios no eran gente jugando, era gente picada.
3. **No es un triunfo.** La ficha avisa: ***"alcance sin respaldo"***. 78.7K impresiones con **33 likes y 2 reposts** es un post hueco, no un modelo a copiar. Y el 2º intento (12.7K) murió justo porque *"el país ficticio cayó donde no había nada, nadie se sintió aludido, sin controversia y sin alcance"*.

**📌 LA LECCIÓN, que es la que hay que retener: LA BASE DE DATOS TIENE LOS NÚMEROS, EL HISTORIAL TIENE EL PORQUÉ.** Yo hice el análisis contra la BD y no abrí el historial, que ya tenía el diagnóstico correcto de los dos posts. **Antes de sacar cualquier conclusión sobre un post publicado, se lee su ficha del historial.** Un número sin su ficha te lleva a inventarte un pilar.

### 4.3 · Runbook "LOS 10" (encadenado) — RECETA DEFINITIVA
> **Casi idéntico al mapa (§4.2)** en formato y flujo (hook → cuerpo → menciones → spam ninja → cierre punchy). La diferencia de fondo: **la importancia va a las PERSONAS, no a la región.**
> **Input del usuario:** SOLO la región (o sector) — **si no te la da, pídesela primero** (igual que el mapa). El resto lo verifica y rellena el workflow.
> ⛔ **La orla se entrega SIN el aviso de desenfoque ni de exportar sin metadatos** (Iker, 2026-09-16): la monta `montar-orla.py` sobre su plantilla (`images §0a-penta`).
> **Diferencias de OUTPUT vs mapa:** (a) **NO hay CSV** (no se dibuja mapa) · (b) en su lugar, las **10 FOTOS en un ZIP/carpeta, en el ORDEN de mención** (el usuario las mete en SU plantilla de imagen con otra herramienta) · (c) **los 2 PROMPTS de imagen** literales, adaptados a la región (Paso 6b) · (d) el resto igual: texto copy-ready + guía de menciones con enlaces.

**Paso 0 — Región + guardarraíles:** **PREGUNTA PRIMERO PARA QUÉ CUENTA ES** (igual que el mapa, §4.2). Los guardarraíles son los mismos y **todos se miden POR CUENTA**:
- **≥2 semanas desde el último PELOTEO de esa cuenta.** Mapa y "Los 10" son la MISMA categoría a efectos de espaciado: cuentan juntos.
- **Región: no repetir DENTRO de esa cuenta.** Entre cuentas SÍ se puede (si Iker ya hizo "Los 10" del País Vasco, Unai y Asier todavía pueden). Cobertura por cuenta en `docs/skills/historial-publicaciones.md`.
- **Un mapa y un "Los 10" del mismo territorio NO se queman entre sí** — validado: Iker hizo el mapa de Gipuzkoa (12.92x, abril) y "Los 10" del País Vasco (4.81x, junio), 10 semanas después y sin penalización. Son pilares distintos (uno pelotea empresas, el otro personas). Pero **no los pegues en el tiempo**.
- **Concepto y personas: no repetir NUNCA, ni entre cuentas.** Y jamás menciones dos veces a la misma persona en dos "Los 10".

**Paso 1 — HOOK (foco en la persona):**

> ### ⛔⛔ LOS TRES INAMOVIBLES DEL GANCHO DE "LOS 10" (Iker, 2026-09-15) — como los 4 del mapa
>
> **Iker, y es una petición de receta, no una corrección de un post:** *"si no, por mucho que la plantilla de la foto en cada uno sea siempre igual, estamos arriesgando demasiado. Estaría bien que para este formato de los 10 también veamos qué patrones podríamos tener así más o menos hardcodeados"*.
>
> **El mapa tiene sus cuatro inamovibles desde julio y este pilar no tenía ninguno**, así que cada gancho se escribía de cero y el riesgo era máximo justo en la línea que decide el post. Destilados de **los CUATRO "Los 10" del histórico** (son cuatro, no cinco: el de Navarra del 11/09 se escribió y no llegó a subirse), y **el corte no tiene ruido: los dos que vuelan llevan las tres piezas, y cada uno de los dos flojos falla exactamente UNA.**
>
> | ratio | imp | puente empresa→persona | gerundio de herida | región en el gancho |
> |---|---|---|---|---|
> | **4.43x** | 49.426 | SÍ | `quemando` | no |
> | **2.49x** | 27.795 | SÍ | `comiéndose` | no |
> | 0.75x | 8.486 | **NO** | `aguantando` | no |
> | 0.53x | 6.572 | SÍ | **NINGUNO** | **SÍ** |
>
> 1. **EL PUENTE: el gancho abre por la EMPRESA (o por su resultado) y gira a la PERSONA anónima dentro de la misma frase.** *"Las empresas que más vendieron este año tienen algo en común: personas desconocidas…"* · *"Ninguna empresa vende más por suerte. Alguien…"*. **El que arranca directo en el comercial se quedó en 0.75x**: sin el puente no hay revelación, y la revelación es el motor. El anónimo se nombra sin nombre: `alguien`, `personas desconocidas`, `quien`.
> 2. **LA HERIDA FÍSICA EN GERUNDIO, y es del OFICIO, no del ego.** `quemando el teléfono`, `comiéndose noes`, `aguantando el no`. **El único gancho sin gerundio de herida es el 0.53x, que la cambió por una herida de ego (no salir en la foto).** A un comercial no le duele que no le hagan fotos; le duele comerse noes. ⚠️ **Y esto es la excepción consciente al veto de gerundios de `global §2.9`**: allí se vetan los gerundios que DESCRIBEN (`colgando`, `volviendo a`); aquí el gerundio va pegado a un verbo punchy y es lo que hace la escena.
> 3. **LA REGIÓN NO SE NOMBRA.** Se revela al final, después de la lista y de los clichés (Paso 3b). **El único que la pone arriba es el de Cataluña, 0.53x, el peor del pilar**, y encima el adjetivo de sector estrecha el alcance (`global §2.3b`).
>
> **Y dos piezas más que cumplen los CUATRO, así que no se tocan aunque no separen nada:** el **`👇`** al final (4 de 4) y **CERO cifras en el gancho** (0 de 4 llevan). Ojo, esto no es el mapa: aquí **no hay comparación-país ni cifra shock**, que canibaliza al mapa (Paso 3b).
>
> **Longitud:** los dos que vuelan miden **106 y 96 caracteres**; el 0.75x, 77. **Este pilar es la excepción a la mediana de 75 de `global §2.10`**, y tiene sentido: el puente necesita sitio. Por debajo de ~90 sospecha de que te has dejado el puente fuera.
>
> **Mecanizado** en `validar-post.py --pilar los10`: el puente y el gerundio como **avisos** (n=4, no da para fallo duro) y la región como **fallo duro** (además ya era regla escrita). **Probados contra los cuatro ganchos reales: aprueban a los dos ganadores y cazan el fallo concreto de cada flojo.**
>
> **⛔ Y ESTO NO SUSTITUYE AL PASE DE CRITERIO:** los tres inamovibles hacen que el gancho esté en la familia que funciona, no que sea bueno. El verbo sigue subiendo por la escalera de `global §2.9` y el ángulo sigue pasando por `global §8`.
>
> #### 🔟 LOS GANCHOS PUBLICADOS SE SACAN DE LA BD **ANTES** DE ESCRIBIR, NO AL ENTREGAR (Iker, 2026-09-15)
>
> **Iker, y es la lección que importa de toda la sesión:** *"casi cometes otra vez el error de la foto. Siempre priorizar nuestros datos frente a los de otros, una vez que ya hemos hecho varias pruebas y hemos sacado outliers"*.
>
> **Lo que pasó:** propuse un gancho sobre la foto, que es **el mecanismo del único "Los 10" que flopeó** (0.53x, y de esta misma cuenta), teniendo el diagnóstico escrito en `global §4.2` desde julio. Lo cazó él, no yo. Al reescribirlo me fui a otro concepto nuevo (`vive en la carretera`) y **volvió a fallar dos de los tres inamovibles**, porque seguía escribiendo de cero en vez de mirar los cuatro que existen.
>
> **EL PASO, y va el PRIMERO del Paso 1:** antes de escribir una sola línea, `GET /api/creators/{id}/posts` de las tres cuentas, filtrar `pillar='peloteo_los10'` y poner los ganchos publicados delante, ordenados por ratio. **Se escribe MIRÁNDOLOS.** El bloque de la entrega (`OUTPUT`) es el mismo trabajo enseñado, no un trabajo aparte: si el bloque se monta al final, el gancho ya está escrito y llega tarde.
>
> **Es `global §0-DATOS` aplicado a este pilar**, y vale igual para cualquier otro: *"los outliers de fuera te dan ideas; los propios te dan garantía"*.

- Fórmula = **verbo físico + la herida propia del comercial** para que se IDENTIFIQUE al leerlo ("personas desconocidas quemando el teléfono", "aguantando el no", "marcando nombres que nadie conoce") + `👇`.
- El comercial anónimo tiene que pensar "ese soy yo". Nada abstracto.
- **NUNCA crítica ni reproche a las empresas.** Regla precisa y su evidencia en el **Paso 3d** — no basta con "que no suene mal": lo que se prohíbe es que la **empresa sea el sujeto** que tapa a la persona.
- **Verbo físico punchy con techo** (`global §2.9`): "quemando el teléfono", "aguantando el no".
- Aplica el resto de reglas de hook (`global-instructions §2` + `swipe-file §3.1`).

**Paso 2 — Las 10 PERSONAS (vía Unipile — como en §4.2, pero personas):**
- **La empresa de cada persona DEBE encajar con nuestro ICP** (`aboutme`): **B2B industrial** (máquina-herramienta, bienes de equipo, automoción, aeronáutica, metalurgia, química, alimentación industrial…) o **servicios B2B**; medianas/grandes (≈100-700 empleados), familiares/founder-led/con directivos visibles, exportadoras. Mismos criterios de empresa que el mapa (§4.2 Paso 4). No metas a alguien de una empresa fuera de ICP aunque sea buen comercial.
- **Criterio de selección = CRECIMIENTO de la empresa en el último año** (el proxy). La lógica: si la empresa ha crecido mucho, su director/equipo comercial es bueno → es a quien queremos pelotear. Elige las 10 empresas ICP que más han crecido y coge a su responsable comercial.
- **Verificación (obligatoria, con fuente pública reciente):** confirma ese crecimiento con noticias/datos públicos del último año. Señales válidas: **facturación/ingresos al alza**, **récord de facturación**, **beneficio neto ↑**, **EBITDA ↑**, **subida de puestos en un ranking**, **% de ventas ↑**, **inversión recibida**, **internacionalización/nueva filial**, **premio**. Cada persona lleva su **logro concreto** citado (ej. `+77% bº (EBITDA +34%)`, `récord €344M`, `€54M → €60M`). Real y verificable, sin polémica; marca los dudosos.
- **Semilla opcional:** `ref_empresas_industriales_pais-vasco.csv` (346 empresas industriales del País Vasco con sector, nº empleados, tier A/B/C, "por qué encaja", señales y fuentes) sirve de punto de partida para el País Vasco. **Aun usándola, verifica SIEMPRE empresa + persona + actividad con Unipile** (no publiques directamente de la lista). Para otras regiones, arranca de cero con los criterios de arriba.
- **⭐ Activos EN LINKEDIN en los últimos 30 días — publicando, comentando o compartiendo (Iker, 2026-08-26; antes era "solo comentando" y tiraba a los CEOs que publican pero no comentan).** Y el cargo manda igual que en el mapa: **sin poder de decisión no se menciona** (`§4.2 Paso 4`).
  > #### ⛔⛔ LOS 30 DÍAS ORDENAN, NO DESCARTAN, CUANDO LA EMPRESA ES ICP (Iker, 2026-09-15)
  >
  > **Iker, al proponerle yo quitar una ficha de 120 días:** *"¿por qué quieres que quitemos a una persona en concreto? Por mucho que esa empresa lleve tiempo sin actividad, oye, si es una empresa nueva que encaja con nuestro cliente ideal, no lo veo mal, ¿no?"*.
  >
  > **Y la receta ya le daba la razón, en `§4.2 Paso 4`, dos veces:** *"el mes se usa para RANKEAR (más reciente, mejor), no para descartar"* y *"si ni a 6 meses hay nadie, la empresa NO se cae"* (esa la fijó él mismo el 07/08). **El fallo fue mío y es de lectura:** el "30 días" de aquí arriba suena a filtro duro y choca con la escalera de `§4.2`, que es la que manda.
  >
  > **LA REGLA, unificada:** **30 días es lo IDEAL y sirve para ORDENAR la lista** (quien publicó esta semana va arriba). Si no hay nadie con cargo válido, se abre a **3 meses**, y **6 es el techo**. Una ficha dentro del techo **no se quita**, porque lo que se pierde al quitarla es más que lo que se gana: **la mención de la empresa vale por sí sola** y el peloteo existe para que **empresas NUEVAS del ICP nos conozcan** (`§4.0c`), no para cosechar likes de la persona.
  >
  > **Lo único que sí descarta, y eso no se toca:** cargo sin poder de decisión, persona fuera de la región, apellido abreviado, sin foto (aquí hace falta para la orla) o más de 6 meses sin actividad.
  >
  > **El coste real, dicho con su número, para que la decisión sea con los ojos abiertos:** lo único que correlaciona con que un peloteo reparta es **cuántos mencionados contestan** (`outliers §3.13`: Aragón 19 comentarios → 2.91x contra Cataluña 0 → 0.59x). Una ficha de 120 días es **una papeleta menos en ese sorteo**, no un post peor. ~~Activos COMENTANDO a otros EN LOS ÚLTIMOS 30 DÍAS (Iker, 2026-07-28).~~ Vía `/users/{id}/comments`. La ventana de 30 días vale para **CUALQUIER formato que mencione a alguien**, no solo "Los 10": a los 3 meses se colaban perfiles que ya no comentan y la mención muere. Y ojo, actividad significa que **comenta en posts de otros**, no que publique en el suyo; si solo publican en su perfil pero no comentan a nadie, se descartan: no nos van a comentar (`§4.2 Paso 4`).
- **⭐⭐ CÓMO SE BUSCA DE VERDAD: POR PERSONAS, NO ADIVINANDO HANDLES DE EMPRESA (Iker, 2026-07-29).** El método que fallaba: pensar empresas de memoria y probar handles a ciegas (`grupo-ybarra`, `migasa`, `cunext`…). La mayoría da 404, y de las que resuelven casi ninguna tiene gente que comente. **Cinco tandas, ~40 empresas, cero fichas nuevas.**
  - **Lo que SÍ funciona:** `POST /linkedin/search` con `category: people` y **`keywords` en lenguaje natural**, del tipo *"director general fabrica Andalucia"*, *"director comercial aceite Jaen"*, *"gerente cooperativa agroalimentaria Almeria"*, una consulta por provincia y por sector. **En una sola tanda salieron 19 personas activas con foto**, y de ahí salió Bodegas Barbadillo.
  - El orden correcto es **persona → empresa**, no empresa → persona: primero encuentras a alguien que comenta de verdad, y luego verificas su empresa y su cifra.
  - Un handle inventado también puede devolver **otra empresa distinta** y colarse: `cunext` devolvía una compañía árabe, y varios IDs adivinados devolvieron gente de universidades de EE.UU. **Si no lo has resuelto por búsqueda, no lo uses.**
- **🔴 SI FALLA CUALQUIERA DE LAS TRES COMPROBACIONES, SE DESCARTA Y SE BUSCA OTRO. NUNCA se entrega la ficha con `[PENDIENTE]` (Iker, 2026-07-28, ya avisado antes).** Las tres son: (1) **actividad** — ha comentado a alguien en 90 días; (2) **logro verificable** — cifra de crecimiento con fuente pública del último año; (3) **foto en LinkedIn** — sin ella no se puede montar la orla, que necesita las 10.
  - **Un `[PENDIENTE]` en una mención NO es una entrega**: el post no se puede publicar así, y devolverlo obliga a Iker a hacer el trabajo que era mío. Si un candidato falla, **se sustituye por otro del barrido** y punto.
  - **Por eso el barrido se hace ANCHO desde el principio**: hacen falta bastantes más de 10 candidatos, porque entre inactivos, sin cifra pública y sin foto cae la mayoría. Medido el 2026-07-28 en Andalucía: de ~45 personas revisadas solo 4 pasaban el filtro de actividad, y de los que pasaban, 2 se cayeron por no tener foto y 1 por no tener cifra pública.
- Ordena por probabilidad de interacción / relevancia del logro.
- **Ejecución:** Claude vía Unipile (credenciales de las env vars del entorno "Iker", como §4.2).
- **Formato en el cuerpo:** `→ @Persona - @Empresa · logro concreto` (ej. `→ @Edorta Arriet Azpiroz - @Geminis Lathes · +77% bº`). **Con @ delante de los dos nombres**, igual que el mapa (§4.2 Paso 4): el usuario clica detrás de la arroba y LinkedIn abre el buscador de menciones solo. El logro va DESPUÉS del `·`, sin arroba.
- **⚠️ NOMBRES EXACTOS DE LINKEDIN**, igual que en el mapa (§4.2 Paso 4): copia el `name` de Unipile literal, sin embellecer. Si el nombre no coincide, no salta el autocompletado de la @ y la mención muere.
- **⛔⛔ LAS DOS MENCIONES VAN SIEMPRE, AUNQUE EL NOMBRE DE LA PERSONA YA LLEVE LA EMPRESA DENTRO (Iker, 2026-09-15).**
  > **Casuística nueva.** Hay gente que se pone la empresa en el campo del nombre: `Aitor Lizarraga - AMPO-POYAM Valves`. Con la @ delante, esa ficha **parece** completa —se lee igual que `@Persona - @Empresa`— y yo la entregué con **una sola arroba**, razonando que la empresa ya salía escrita y que el segundo guion quedaba feo. Iker lo añadió a mano: *"siempre tenemos que mencionar a ambos para maximizar el alcance"*.
  >
  > **Y el motivo no es de formato, es de mecanismo: el texto escrito NO notifica a la página de la empresa. Solo la @ lo hace.** Una ficha con una arroba es una notificación regalada, y las notificaciones son el motor entero del peloteo (`outliers §3.13`: lo único que correlaciona con que reparta es cuántos mencionados contestan).
  >
  > **Queda así, con el guion extra y sin importar que el nombre se repita:**
  > ```
  > → @Aitor Lizarraga - AMPO-POYAM Valves - @AMPO · 281M€ y tercer récord seguido
  > ```
  > **El error de fondo, que es el repetible:** decidí por estética contra un mecanismo medido. Cuando choquen, gana el mecanismo y lo feo se declara en la entrega.
  >
  > **Mecanizado** como fallo duro en `validar-post.py --pilar los10` (`Cada ficha lleva DOS menciones`), contando arrobas por línea. **En el MAPA va de aviso**, porque allí sí existe la ficha legítima de una sola @ (empresa sin nadie con cargo válido, `§4.2 Paso 4`).

**Paso 3 — CUERPO** (pelotea a la persona invisible, `swipe-file §3.1`):
- Setup que pinta al que decide de verdad y no sale en la foto (una anáfora tipo "No publica. No da charlas. No sale en la nota de prensa." — **es UNA opción, no la plantilla fija**).
- **🔴 LAS 10 FICHAS SON 10 EMPRESAS DISTINTAS. NUNCA SE REPITE EMPRESA DENTRO DEL MISMO POST (Iker, 2026-07-28).** Vale para cualquier formato de menciones. Dos personas de la misma empresa desperdician una ficha: el peloteo se diluye y se pierde un repost potencial. Si de una empresa solo sale un candidato válido, se coge ese y se busca otra empresa; **no se rellena con un segundo de la misma casa**.
- **⭐ LAS 10 FICHAS VAN EN DOS BLOQUES DE 5, no en 4+4+2 (Iker, 2026-07-28).** Este pilar siempre lleva 10, así que se parten por la mitad: **5 + 5**, con una línea en blanco entre los dos bloques. (El mapa es distinto: 20 fichas en 5 bloques de 4.)
- La **lista de las 10** (`→ @Persona - @Empresa · logro`), con **línea en blanco entre la frase de entrada y la primera persona** (igual que el mapa, §4.2 Paso 4): la frase que presenta la lista va sola, nunca pegada a la primera `→`.
- **Reveal tardío:** "Sí, hablo de [región]. Pero esto va de las personas."
- Eje emocional: "le pongo cara al que estuvo detrás del salto".
- **⭐ LA COLA (de los clichés al cierre) TAMBIÉN ALTERNA BLOQUES (Iker, 2026-07-28).** Después del bloque de menciones es fácil dejarlo todo en líneas individuales, y el post se desinfla justo donde tiene que rematar. Mete **al menos un bloque de 2** ahí abajo. Y si una frase ocupa dos líneas al renderizar (típico del *"y no salen todas de X ni de Y. Salen de…"*), **se parte**: o bloque de 2 o dos líneas individuales, nunca una línea larga que envuelve sola.
- **⭐ VARIEDAD DE ARRANQUE DE BLOQUE → se mudó a `global §2.0b-ARRANQUE` (2026-08-25).** Aquí vivían tres viñetas universales (cuándo anáfora y cuándo no · la anáfora dentro y la variedad entre publicaciones · que se note que es un post nuevo) y por tenerlas guardadas en este runbook **no saltaron al escribir una historia**. Están enteras en global, con los arranques ya gastados en `ARRANQUE_QUEMADO`.

**🔴 Paso 6b-quater — LAS FOTOS DE UNIPILE SON 100x100 Y NO HAY FORMA DE MEJORARLAS POR API (Iker, 2026-07-29).** Comprobado a fondo: el campo `profile_picture_url_large` **devuelve igualmente 100x100**, el endpoint de perfil completo `GET /users/{id}` tambien, y reescribir el tamano en la URL (`shrink_100_100` → `shrink_400_400`) da **403 deny-InvalidToken**, porque el token va firmado para ese tamano exacto.
- **Consecuencia:** el script las amplia x2,24 hasta el hueco de la plantilla y avisa `AMPLIADA, pierde nitidez`. Es inevitable por API.
- **La unica via para una foto nitida es MANUAL:** abrir el perfil en LinkedIn, descargar la foto grande y meterla en la carpeta con su numero. Asi se hizo con Alvaro Ales (400x400 frente a 100x100, ocho veces mas definicion).
- ~~**Cuando una cara salga especialmente mal, pidele a Iker esa foto concreta**~~ 🔴 **RETIRADO EL 2026-09-15.**

> #### ⛔⛔ 6b-quinquies · NUNCA SE PIDE OTRA FOTO NI UN ENCUADRE MEJOR: SE TRABAJA CON LO QUE BAJA DE LINKEDIN (Iker, 2026-09-15)
>
> **Iker, y zanja el punto de arriba:** *"la recomendación que me has dado de la foto de Gustavo no la vuelvas a dar, ya que yo no puedo elegir qué foto tiene la gente en su cuenta de LinkedIn. Así que tenemos que trabajar con lo que descarguemos"*.
>
> **El fallo, y es mío:** avisé de que una de las 10 salía en plano de escritorio, con la cara pequeña, y le pedí *"la foto en primer plano"*. **Eso no es un aviso, es un imposible**: la foto de perfil la elige su dueño. Es exactamente la familia de `feedback: aviso sin comprobar es hipótesis` — una precaución que no se puede ejecutar solo gasta un turno suyo.
>
> | ⛔ nunca se pide | ✅ lo que sí está en nuestra mano |
> |---|---|
> | otra foto de esa persona | bajar `profile_picture_url_large`, que hoy **sí devuelve 800x800** en la mayoría de perfiles |
> | un primer plano, otro encuadre, otro fondo | el **encuadre automático** del script, que acerca solo las caras que bajan del 60% de la mediana del grupo (`--umbral-cara`) |
>
> **Y el criterio de fondo ya estaba escrito dos párrafos más arriba, en el propio Paso 6b:** *"la foto fea se queda fea, y es lo correcto. Es su foto de LinkedIn. Si está borrosa, sale borrosa: eso NO se toca"*. **La receta se contradecía consigo misma y yo apliqué la mitad equivocada.**
>
> **⚠️ Y lo de las 100x100 de aquí arriba ya no es cierto siempre:** el 15/09, de las 10 fotos bajadas, **8 vinieron a 800x800** por `profile_picture_url_large`. El campo funciona; lo que a veces falta es que el propio perfil tenga una grande. **Comprobar el tamaño real al bajarlas, no darlo por perdido.**
>
> **Lo único que sigue valiendo del punto retirado:** si una foto baja a 100x100 y el script avisa de que la amplía, **se dice en la entrega como dato**, sin pedir nada a cambio.

**🔴 Paso 6b-ter — EL TÍTULO Y LA PALETA DE LA ORLA (Iker, 2026-07-28, tres intentos fallidos).**
- **El TÍTULO va incrustado en el PSD** (`LOS 10 QUE LEVANTAN / LA INDUSTRIA ASTURIANA`) y el script **solo sustituye los placeholders `Nombre`**. Si no lo cambias, sale la región del post anterior. Se cambia **solo la última palabra**, repintando únicamente la segunda línea.
- **Cómo es de verdad ese título:** texto en **CREMA sobre la banda oscura**, no texto oscuro sobre caja crema. Me equivoqué dos veces: primero tapé con un rectángulo blanco, y luego oculté la capa de texto (que se llevó por delante su propio fondo y dejó el texto invisible, oscuro sobre oscuro). **Mide los colores antes de pintar**: muestrea píxeles reales de la imagen generada.
- **Paleta nueva del Brandbook 2026** (`images §0a-ter`) sobre la orla: `azul marino #0c202e → berenjena #431b44` y `crema #f9f3ef → mint #ebfff6`.
- **⚠️ El remapeo de color NO puede tocar los retratos.** Aplicado a ciegas, los tonos oscuros del pelo y de las americanas se vuelven morados. La regla que funciona: **crema → mint en TODA la imagen** (apenas aparece en fotos) y **oscuro → berenjena SOLO fuera de las cajas de foto**, que el propio script imprime en su log.

**⚠️ Paso 6b-bis — LA ORLA SE MONTA CON `--nombres` Y CON LA RUTA DE LA FUENTE (Iker, 2026-07-28).** Dos fallos que costaron dos regeneraciones:
1. **`--nombres` no es opcional.** Sin ese parámetro el script pega las fotos y deja los placeholders "Nombre" de la plantilla. Van los 10 nombres separados por `|`, en orden de mención y con las reglas de orla de `images §0e` (nombre + primer apellido, compuestos sin partir, campos invertidos corregidos por el `public_identifier`).
2. **La fuente NO está en `C:\Windows\Fonts`.** Bricolage está instalada en la carpeta de usuario, así que hay que pasarle `--fuente "C:/Users/LENOVO/Documents/Mario/LINKEDIN GROWTH/TIPOGRAFÍAS/Bricolage Grotesque/static/BricolageGrotesque-Bold.ttf"`. Sin eso aborta con "no encuentro la fuente" **y el error sale ARRIBA del todo**, antes del log de fotos, así que con un `tail` no se ve y parece que ha ido bien.

Comando completo de referencia:
```
python scripts/montar-orla.py --plantilla ".../LOS 10 PLANTILLA v2.psd" --fotos ".../fotos"   --salida ".../orla.png" --fuente ".../BricolageGrotesque-Bold.ttf"   --nombres "Nombre1|Nombre2|...|Nombre10"
```

**Paso 3b — CLICHÉS + REVEAL (importado del mapa, va DESPUÉS de la lista):** el hueco está entre la lista y el reveal, y el 4.81x del País Vasco ya lo usaba (txoko, caserío, cooperativa) pero solo con 2 clichés. **Satúralo con 8 o más tejidos** (`§4.0d` punto 4) (`global §4.1` regla 2): el cliché es lo que hace que el local repostee para defender a los suyos, y esa es la carencia medida de este pilar — el "Los 10" del País Vasco sacó **12 reposts** frente a los 46 de Navarra, 60 de Galicia y 90 de Gipuzkoa. Los dos motores no compiten: la identificación del comercial abre el post, el orgullo regional lo reparte.
- Mete aquí el **concepto despectivo original + "y poco más"** (`global §4.1`). **La región NO se nombra hasta el reveal**: los clichés van todos antes y solos ya la insinúan, igual que en el hook del mapa ("el patio trasero de los Pirineos" nunca dice Navarra).
- ⛔ **DEL MAPA SE IMPORTA EL CLICHÉ, NO EL SHOCK CONTRA UN PAÍS.** Nada de "exporta más que Bolivia entera" ni ninguna cifra regional. Motivos, por orden: (a) **la prioridad de este pilar son las PERSONAS**, y en el gancho ni se menciona un país, así que meterlo en el cuerpo lo descentra; (b) **canibaliza el mapa** — es su firma, y lo que hace que un mapa y un "Los 10" del mismo territorio no se quemen entre sí es justo que uno pelotea empresas y el otro personas (`historial-publicaciones`); (c) **alarga el cuerpo después de la lista**, que es donde el post ya va cuesta abajo; (d) el **País Vasco 4.81x no llevaba NI UNA cifra regional**. El único dato numérico de este pilar es el **logro de cada persona** en su ficha. Corregido el 2026-07-15: la primera versión de este Paso 3b lo permitía "si tienes el dato verificado" y el usuario lo tumbó.
- ⚠️ **Nunca en registro de reproche a las empresas** (lo que mató a Cataluña 0.66x). El cliché va contra el tópico de fuera, no contra la empresa que no reconoce a nadie. Regla exacta y evidencia: **Paso 3d**.
- **⭐ Justo DESPUÉS del reveal, nombra ciudades Y pueblos** (`global §4.1` regla 2b). No solo la capital: es una queja real de nuestros comentarios. **Sácalos de las sedes de tus 10 empresas**, que ya están verificadas, así no inventas nada. Asturias: *"Y no salen todos de Gijón ni de Oviedo. Salen de Tineo, de Llanera, de Castropol y del puerto de Avilés."* Es el mismo hueco donde el mapa pone *"De Pamplona a la Ribera"*.

### Paso 3d — ⭐ EL SUJETO QUE TAPA A LA PERSONA NUNCA ES LA EMPRESA (2026-07-17)

Este pilar es el único que menciona a alguien **por su mérito personal dentro de una empresa que no es la nuestra**, y eso genera peticiones de retirada por privado. Van 3 posts y 2 peticiones. Lo que sigue sale de comparar los tres, no de lo que suena sensato.

| | 1º País Vasco 4.82x | 2º Cataluña 0.66x | 3º Asturias |
|---|---|---|---|
| Quejas | **ninguna** | un trabajador pidió retirar su mención | el CEO pidió retirar empresa Y persona |
| ¿La empresa tapa a la persona? | no | **sí** | no |
| Link comercial | **no** | sí | sí |

**LA REGLA (la única que la evidencia soporta).** La persona invisible **sigue siendo el eje** del pilar. Lo que se prohíbe no es la invisibilidad: es que **la empresa sea quien la causa**. El antagonista tiene que ser algo sin ego y sin capacidad de mandarte un DM — la prensa, el titular, la cifra, el foco, o nosotros mismos.

- ✅ *"A una empresa que crece le **hacemos** fotos por fuera"* (nosotros) · *"no sale en la **nota de prensa**"* (la prensa) · *"nunca le **ponen** el nombre delante"* (impersonal) · *"el número sale en la **prensa**. La persona que lo firmó, casi nunca"* · *"Las cifras ya salieron en la prensa. Los nombres los pongo yo."*
- ⛔ *"El nombre que se dice siempre es **el de la empresa**. Hoy le doy la vuelta."* · *"ninguna empresa vende sola"* · *"el mérito se lo llevan las empresas"* · *"detrás del logo"*.

La diferencia es de sujeto, no de tono. En la columna ✅ la persona no sale por cómo funciona la atención; en la ⛔ hay un despojo con culpable, y el culpable está etiquetado en el post. Lo vigila `validar-post.py --pilar los10` (`EMPRESA_LADRONA`), y los 3 posts están clavados en `scripts/test-validador.py`.

**LO QUE NO SE ARREGLA CON PALABRAS — no lo intentes otra vez:**

1. **La atribución única NO es el problema.** Suena a que sí, y es mentira. El post que más fuerte atribuye a una sola persona (*"las 10 personas que **más han hecho vender**"*, *"esa persona **es la razón por la que la empresa factura** lo que factura"*) es el 4.82x, el único sin una sola queja. El que más suave atribuye (*"los 10 nombres que hay **detrás de** las cifras"*) es el que se comió el DM del CEO. **Anti-correlaciona.** Suavizar la atribución es pagar punchy por nada.
2. **El beat de equipo SÍ va, y es obligatorio. Ver Paso 3e.** (Aquí estuvo escrito lo contrario durante media hora: que ese *"pero esto es trabajo en equipo"* llega en comentarios, o sea alcance, y que escribirlo nos lo quitaba. **El usuario lo corrigió y tenía razón**: es alcance *y* es la crítica más repetida del pilar. El apoyo la envuelve y lo que se queda es la crítica. Contar comentarios no mide el enfado que hay dentro de ellos.)
3. **El link se queda.** La única diferencia limpia entre el post sin quejas y los dos con quejas es que aquel no llevaba spam ninja. La lectura probable: un homenaje que acaba en un enlace convierte a la empresa mencionada en decorado de un anuncio, y un CEO que ve el EBITDA de su empresa ahí no está ofendido, está viendo su marca en publicidad de un tercero — por eso lo exige por privado en vez de comentarlo. Es n=3 y confundido (el 2º además flopeó). **Decisión del usuario, 2026-07-17: el link es el negocio y se queda**, asumiendo el peaje. Si algún día hay un 4º "Los 10", esta es la casilla que hay que mirar primero.
4. **Etiquetamos con @ a la empresa Y a la persona.** Se propuso dejar la empresa en texto plano (etiquetar la página notifica a sus admins, que es la vía por la que llegó el DM) y **el usuario lo tumbó el 2026-07-17**: 2 quejas en 3 posts no justifica tocar un formato que funciona por una inferencia sin medir.
5. **La tasa de quejas no baja a cero, y perseguirlo cuesta rendimiento.** La premisa del pilar (la persona está en la sombra) selecciona a gente que eligió la sombra, y su éxito garantiza que la dirección de su empresa lo vea. El objetivo no es que nadie escriba: es que **quien escriba lo haga por ego y no porque tenga razón**. Contra el ego no hay redacción que valga, y el usuario ya lo tiene asumido: *"no podemos controlar cómo cada uno percibe una publicación"*.

### Paso 3e — ⭐ CONCEDE QUE ES TRABAJO EN EQUIPO (obligatorio, 2026-07-17)

**Es la crítica más repetida de este pilar**, y viene disfrazada de apoyo: *"gracias por dar visibilidad a las personas, **pero** esto es trabajo en equipo"*. Sale sobre todo en la 1ª y la 3ª — las dos que funcionan. Si no lo decimos nosotros, se nos echan encima. **Una línea en el cuerpo dice que no es solo mérito de esas 10 personas.**

**⚠️ EL SUJETO ES LA PERSONA, NUNCA LA EMPRESA.** Aquí está el filo, y es fino:

- ⛔ *"una fábrica no factura sola"* (1º) · *"ninguna empresa vende sola"* (2º) → **suenan** a la concesión y apuntan al revés: dicen que la EMPRESA depende de la persona. Eso es el despojo del Paso 3d, no la concesión.
- ✅ *"Ninguno de estos 10 vendió solo."* · *"Detrás de cada nombre hay una fábrica entera."* · *"No lo firmó solo: detrás había un taller entero."* · *"Cada uno tiene una plantilla detrás."*

**Dónde:** en el **setup, antes de la lista**. Ahí enmarca y el lector nunca llega a formular la objeción; después de la lista solo la corrige, y además alarga el tramo donde el post ya va cuesta abajo (Paso 3b). **Nunca de cierre**: el cierre es el bold statement (Paso 5).

**Cómo no perder punchy:** es una concesión, no una disculpa. No pide perdón por publicar el post ni rebaja a los 10 — reconoce al equipo **y sigue defendiendo que alguien dio la cara**. *"Ninguno de estos 10 vendió solo. Pero alguien tuvo que coger el teléfono el día 40."*

Lo vigila `validar-post.py --pilar los10` (`BEAT_EQUIPO`). **Riesgo asumido:** un check positivo se aprueba barato repitiendo una frase, que es como este mismo script creó el tic de *"En ventas,"*. Por eso hay 4 familias arriba y `working-preferences §4` obliga a no repetir la del "Los 10" anterior. **Si en 3 posts sale la misma frase, el tic ya está aquí.**

**Paso 4 — SPAM NINJA:** reglas canónicas en **`global-instructions §4.4b`** (mándalas siempre). **En este pilar va después del REVEAL, no "justo después de las menciones"** (el orden es lista → clichés → reveal → spam ninja → cierre): el reveal es lo que cierra el bloque de la lista, y meter el link antes lo parte. Resumen: máx **2 líneas CORTAS**, **NUNCA nombrar a Neety**, chiste con **verbo punchy con techo** que gira el concepto del hook, dolor concreto + diferenciador aterrizado (`aboutme §1b`) **y el dolor sacado del banco de `global §4.4b-MUNICIÓN`, que además lista lo que el ninja NO puede prometer** (automatismo, volumen, la señal: cada una es una objeción medida en el informe de demos), colocado **justo después de las menciones** y nunca como última línea. Aquí el giro va al dolor del comercial de la región, no al de la empresa.

**Paso 5 — CIERRE punchy** (bold statement, sin pedir comentarios ni preguntar; §4.2 Paso 6). Ej. "Hoy, al menos, sabes su nombre." Corre la validación (§8).

**Paso 6 — FOTOS de las 10 personas (en vez del CSV):** para cada persona, saca su **foto de perfil de LinkedIn** vía Unipile (endpoint de perfil de persona → campo de foto de perfil, `profile_picture_url`/`picture_url`), descárgala, y entrega las 10 en un **ZIP/carpeta nombradas en ORDEN de mención**: `01_Nombre-Apellido.jpg`, `02_…`, … `10_…`. (El usuario las coloca en su plantilla; nosotros NO montamos la imagen — imagen = orla de retratos, `images §8`.)

**Paso 6c — ⛔⛔ LA ORLA APROBADA SE ARCHIVA EN LA CARPETA DEL PILAR (Iker, 2026-09-15).**
> **Iker:** *"una vez que te confirme que la foto de los 10 está bien, tienes que guardármela en esta ruta y con el nombre como lo tengo en otras regiones"*.
>
> - **Ruta:** `C:\Users\LENOVO\Documents\Mario\LINKEDIN GROWTH\PELOTEO REGIONAL\LOS 10\`, que es donde vive la plantilla y el archivo del pilar.
> - **Nombre:** **`los 10 <region>.png`** — todo en minúsculas, **sin tildes ni eñes** y sin guiones, calcando lo que ya hay: `los 10 euskadi.png` · `los 10 cataluna.png` · `los 10 asturias.png` · `los 10 andalucia.png`. **El nombre se calca de la carpeta, no se inventa:** se listan los ficheros antes de escribir ninguno.
> - **⏳ EL DISPARADOR ES SU OK EXPLÍCITO SOBRE LA IMAGEN, no la entrega del post.** Mientras quede una ronda posible —una foto de perfil que pueda llegar en primer plano, un nombre por corregir— la orla todavía puede cambiar, y un fichero desactualizado en la carpeta de referencia es peor que no tenerlo: la siguiente región se clona de ahí.
> - **La copia NO sustituye a la del Escritorio**, que es la que él sube a LinkedIn. Esto es el archivo del pilar.
> - **Mecanizado** como aviso de entrega en `validar-post.py --pilar los10`, con la ruta y el patrón dentro, para que el paso no dependa de que yo me acuerde al cerrar el post.

**Paso 6b — LA ORLA: la monta un SCRIPT, no el robot de diseño (2026-07-16).**
```
python scripts/montar-orla.py   --plantilla "C:/Users/LENOVO/Documents/Mario/LINKEDIN GROWTH/PELOTEO REGIONAL/LOS 10/LOS 10 PLANTILLA.psd"   --fotos "C:/Users/LENOVO/Desktop/los10-<region>"   --fuente "C:/Users/LENOVO/Documents/Mario/LINKEDIN GROWTH/Bricolage_Grotesque/static/BricolageGrotesque-ExtraBold.ttf"   --nombres "Nombre 1 | Nombre 2 | … | Nombre 10"   --salida "C:/Users/LENOVO/Desktop/orla-<region>.png"
```
**Por qué se cambió, que es lo que no hay que olvidar:** los 2 prompts de imagen que había aquí **NO se podían arreglar escribiéndolos mejor**. Un modelo generativo no pega una foto, la **REDIBUJA**: sintetiza píxeles nuevos en todo el lienzo. Por eso devolvía caras que no eran de esas personas, cambiaba el color de los ojos, convertía las fotos malas en fotos de modelo, metía ruido en el azul del header y lo descentraba. **No era un fallo de prompt: era lo único que sabe hacer.** Cada "no toques" que le añadías alargaba el prompt y le hacía menos caso a todo.
- El script detecta **solo** los huecos transparentes, escala con Lanczos (que reduce información, no la inventa), recorta centrado y pone la foto **DEBAJO** con la plantilla encima: la máscara del círculo es la que dibujó el diseñador. Los nombres, la fuente, el cuerpo y el color se **leen del propio PSD**, así que si el diseñador cambia el estilo, el script le sigue.
- **Medido:** 0 píxeles de la plantilla tocados fuera de las cajas de nombre, y dif. media 0.00 entre foto original y círculo. No "parecida": idéntica.
- **La foto fea se queda fea, y es lo correcto.** Es su foto de LinkedIn. Si está borrosa, sale borrosa: eso NO se toca.
- **🔍 ENCUADRE: lo único que el script sí decide.** Hay quien tiene la foto de LinkedIn hecha desde la otra punta de la sala y en la orla, al lado de 9 primeros planos, no se le ve. El script mide cuánto ocupa cada cara, saca la **mediana del grupo** y **acerca solo a las que bajan del 60% de esa mediana**. Al que ya está bien no se le toca.
  - **No es un retoque, es el encuadre que haría un humano en Photoshop:** elegir qué trozo de la foto original se ve. No suaviza, no deforma, no inventa un píxel. Es la misma lógica de coherencia que el apellido único (`images §0e`).
  - Caso Asturias: Alvaro Vallaure tenía la cara al **11,7%** contra una mediana del 40,7% → acercado. Los otros 9, intactos. El peaje es que su recorte hay que ampliarlo x1.98 y se nota; el script lo avisa con ⚠️ en cada ejecución.
  - Se desactiva con `--sin-encuadre` y el umbral se mueve con `--umbral-cara`.
- **⚠️ El detector de caras es YuNet, NUNCA las cascadas Haar.** Haar se probó y era inservible: en la foto de Alvaro Platero (blanco y negro, poco contraste, de tres cuartos) devolvió **3 "caras" y las 3 eran fondo desenfocado**, así que le recortó la nuca. Y lo peligroso no fue eso, fue que **midió su cara al 15% cuando ocupa el 35%**: iba a "arreglar" una foto que estaba perfecta. YuNet da confianza (0.89-0.96 en las 10) y encuentra exactamente una cara por foto. **Una medición mala no se nota, se cuela.**
- **Nombres:** normalizados según `images §0e` (Title Case + nombre completo y PRIMER apellido), no el exacto de LinkedIn (eso es solo para la @ del post).
- Si algún día la plantilla cambia de huecos o de placeholders, el script **avisa y sale con error** en vez de dibujar de más.
- **La plantilla buena es `LOS 10 PLANTILLA v2.psd`** (2026-07-16): círculos más grandes y **sin aro** (los aros finos azules de la v1 quedaban feos). La `DEF` es la vieja, no la uses.
  - **Cambiar de plantilla NO costó tocar una línea del script:** los huecos se detectan solos y pasaron de 209x220 a 213x224 sin que nadie los midiera. Esa es la prueba de que detectarlos automáticamente valía la pena frente a hardcodear coordenadas, que habría roto la orla en silencio.
  - Ojo con la capa `placeholders`: va **oculta a propósito** (es la guía del diseñador). Los huecos de verdad son la transparencia del compuesto, que es lo que lee el script. Que esté invisible NO es un error.

**Paso 7 — Guía de menciones con enlaces** (mismas reglas de formato que el mapa, §4.2 Paso 10): calcando el orden del bloque de personas del post.

> #### ⛔ AQUÍ VA EN TABLA, NO LÍNEA A LÍNEA (Iker, 2026-07-29 · reincidí el 2026-09-15)
> **`§4.2` Paso 10 ya lo dice y yo entregué cuatro veces seguidas el formato del mapa:** la frontera es el NÚMERO de menciones. **Con 20 (mapa) va línea a línea**, calcando la posición del post. **Con 10 o menos —y "Los 10" siempre son 10— va en TABLA markdown**, que es como se comprueba fila a fila.
> - **Columnas, en este orden:** `# · Persona (enlace) · Cargo · Empresa (enlace) + sede · Última actividad · Logro`. La persona primero, que es el orden del cuerpo en este pilar, y **el logro se mantiene** porque aquí es el criterio de selección y lo necesita a mano para responder comentarios.
> - **El cargo y la actividad no son adorno:** Iker pide la guía *"para revisarlas"*, y son las dos cosas que decide él mirando (si el cargo compra y si la persona está viva).
> - **Enlaces markdown CLICABLES y FUERA de bloque cercado**, siempre. Cercado solo si va a un fichero.
> - **Y debajo de la tabla, las fichas con peculiaridad**, en una línea cada una: nombre de LinkedIn raro, persona fuera de la región, actividad al límite. Es lo que le ahorra abrir los diez perfiles. Aquí el orden es **persona primero** (como en el cuerpo, `→ Persona - Empresa`), y **se mantiene el logro** al final: en este pilar el logro SÍ justifica la ficha (es el criterio de selección) y el usuario lo necesita a mano para responder comentarios. Esa es la única diferencia con el mapa, donde no se justifica nada.

⚠️ **El formato manda desde `§4.2` Paso 10 y NO se reescribe aquí.** Resumen: en el CHAT van **enlaces markdown CLICABLES con `https://`, FUERA de todo bloque cercado**; cercado solo si va a un fichero. **Fallado dos veces (2026-07-15)** por el mismo motivo: este Paso decía "mismas reglas que el mapa" y acto seguido las contradecía con un "bloque cercado", heredado del POST. Son cosas opuestas: **el post va cercado porque se copia y pega en LinkedIn sin markdown** (`working-preferences §1`); **la guía no se pega en ningún sitio, se CLICA**. El texto del enlace es el NOMBRE (legible), el href la URL:
```
→ [Javier Soto](https://www.linkedin.com/in/javier-soto-639657b3) - [Esnova](https://www.linkedin.com/company/4999804) · de €30M a rozar €100M
(… 10 líneas, en el orden exacto del post, FUERA de todo bloque cercado)
```
(Ese ejemplo va cercado aquí solo para que veas la sintaxis. En la ENTREGA va suelto, para que se renderice.)

**OUTPUT FINAL (SOLO esto):** (1) el **TEXTO** del post copy-ready · (2) **el BLOQUE DE GANCHOS DEL PILAR**, justo debajo del texto (ver abajo) · (3) el **ZIP con las 10 fotos** en orden de mención · (4) la **guía de menciones con enlaces** · (5) la **ORLA ya montada** con `montar-orla.py` (Paso 6b). **Sin CSV**.

> ### 📋 EL BLOQUE DE GANCHOS, DEBAJO DEL TEXTO Y EN TODAS LAS ENTREGAS (Iker, 2026-09-15)
>
> **Iker:** *"quiero que después de darme el texto de la publicación, me des un bloque con los ganchos ordenados por más outlier a menos, de nuestra propia cuenta, que nos hayan funcionado en este formato. Para que así yo manualmente y de un vistazo rápido pueda validar si este nuevo gancho cumple por lo menos lo mínimo para volver a hacerse viral como los otros y tiene esos patrones en común o no"*.
>
> **Va en un bloque cercado, justo después del post**, con **el gancho real de cada "Los 10" publicado, su ratio y sus impresiones, de mayor a menor**, y **el nuevo abajo del todo, marcado**. Los textos salen de la BD (`pillar='peloteo_los10'`), no de memoria.
>
> - **Son los que HAY, no un número fijo.** Hoy son **cuatro**; cuando se publique el quinto, serán cinco. **No se rellena con ganchos de otro pilar ni con inventados.**
> - **Debajo del bloque, la línea de patrones:** puente · gerundio de herida · región, marcando cuáles cumple el nuevo (`§4.3` Paso 1).
> - **Mecanizado** como aviso de entrega en `validar-post.py --pilar los10`, que imprime los cuatro ganchos con su ratio para que no haya que ir a buscarlos.

### ⛔⛔ 4.4-PASO-1 · PRIMERO LA IDEA, DESPUÉS EL FORMATO (Iker, 2026-08-11)

**Son dos lecturas de la referencia y van en este orden. Las dos, siempre.**

Iker: *"la manera que tenías tú de captar la anatomía no es mala, sino que eso se hace
DESPUÉS de lo mío. Primero se capta la esencia de la IDEA, y el paso dos es captar la
esencia del formateado, tanto del gancho como del cuerpo. Tienes que hacer las dos
cosas, pero lo primero y lo más importante es la idea"*.

| | qué se lee | cómo |
|---|---|---|
| **1. LA IDEA** | el **verbo** que hace el chiste y el **concepto** que abre | a mano, mirando el gancho. El script saca los verbos candidatos y hace las 4 preguntas |
| **2. EL FORMATO** | longitud del gancho, frases, emojis, bloques, ritmo, cierre | `python scripts/anatomia-referencia.py original.txt mio.txt` |

**Por qué este orden y no el otro:** un remix con el **formato perfecto y la idea
perdida** es el meme de otro vaciado —pasó el 11/08 con el de Lauren Vilips: calqué su
estructura, tiré su *"you're not saving lives"* y la imagen se quedó con un médico que
ningún texto explicaba—. Al revés, con la idea buena y el formato flojo, **todavía se
salva**: el chiste funciona aunque el ritmo cojee.

**Cómo se caza la idea, que es el atajo de Iker: por el VERBO.** *"Yo sobre todo pillo
las esencias con los verbos"*. Y el concepto que va con él es siempre una de estas cuatro
cosas — **original, exagerado, controversial o una metáfora**. `salvar vidas` es metáfora
+ exageración, y por eso vuela. **Si lo que has sacado no es ninguna de las cuatro, no has
dado con la idea todavía.**

### 💰💰 4.4-CONVERSION · EL ALCANCE Y LA CONVERSIÓN DE UN MEME SON DOS PALANCAS DISTINTAS (medido 2026-09-14)

**Los dos memes de la ventana del 01-11/09, con tres días de diferencia y el mismo enlace de Luma:**

| meme | de qué va el chiste | impresiones | clics | CTR | asistentes |
|---|---|---|---|---|---|
| Iker 01/09 · *"Cada ascenso en ventas se cobra en otro sitio"* | el ascenso y el físico — **universal** | **218.529** | 111 | **0,051%** | 7 |
| Asier 03/09 · *"Mi mayor inversión en ventas emocionó al equipo"* | 4.797 € en una herramienta y 12 meses sin ver una cara — **el gasto del comprador** | 27.499 | 76 | **0,276%** | 1 |

**8 veces menos alcance y 5,4 veces mejor CTR.**

> **LA REGLA: el alcance de un meme lo decide lo UNIVERSAL que sea el chiste. La conversión la decide si el SUJETO del chiste es el dolor del que compra.** Son dos palancas, y hasta el 14/09 las tratábamos como una.

**La prueba de por qué, y sale de los comentarios, no de la teoría:** los 21 comentarios del de 218.529 hablan del chiste — el peso, los escalones, si la gráfica tiene sentido — y **ni uno habla de vender**. Mucha cuenta de LATAM, fuera del ICP, y uno acusándonos de faltar al respeto por el físico. Llegó a muchísima gente y a casi nadie que compre.

**CÓMO SE USA AL ELEGIR LA IDEA (`§4.4-PASO-1`), y no es "elige siempre el estrecho":**
- **El meme de chiste universal es un boleto de lotería.** Nuestra mediana de meme está en ~9.900 impresiones; 2 de 12 se fueron por encima de 100k. Cuando toca, se lleva el premio gordo él solo (los 7 asistentes del 01/09 son la mejor cifra de toda la campaña del evento). **No se puede presupuestar.**
- **La historia es renta fija:** mediana ~10.100 impresiones × 0,40% de CTR ≈ 40 clics **todas las semanas** (`§4.6`).
- **Por eso el meme no se elige para cubrir un número de conversión.** Si la semana tiene que traer inscripciones, demos o correos, el número lo pone otro pilar y el meme va de extra.
- **⭐ Y si el meme ADEMÁS tiene que convertir, el chiste se elige por su SUJETO:** que el que se ríe sea el que paga la factura. `Un ascenso` se ríe cualquiera; `4.797 € de una herramienta que nadie usa` solo se ríe quien firma esa factura — y ése es el que pincha.

⚠️ **Lo que este dato NO dice:** que el meme universal sea malo. Trajo 7 asistentes, el récord de alcance de la casa y +29 seguidores en un día. Dice que **no se le puede pedir conversión**, no que no se haga.

### ⛔⛔ 4.4-PASO-0 · ANTES DE ELABORAR NADA: ¿YA LA HEMOS USADO? (Iker, 2026-08-11)

**Es el PRIMER paso del runbook del meme, antes de leer la referencia siquiera.**
Iker: *"cuando consigas una referencia, antes de elaborarla, verificar si ya la
hemos usado o no, porque si no estás perdiendo el tiempo"*.

**Qué pasó el 2026-08-11:** propuse a Asier el meme de The Office, escribí el post,
el prompt de imagen y las dos comparativas — y **The Office fue el primer meme de
Asier**, el 16/07. Iker lo sabía; yo no lo había mirado. Al cambiarla, propuse la de
los calvos, que **Iker se había hecho el 06/05 con 138.828 impresiones**. Dos
referencias quemadas seguidas, dos entregas enteras a la basura y el retraso encima.

**La comprobación, en este orden:**
1. **En la cuenta que va a publicar.** Si esa cuenta ya la usó, se descarta y se
   busca otra. No hay excepción.
2. **En las otras cuentas.** Si la usó otra, **no se descarta automáticamente**, pero
   **tiene que pasar las TRES puertas de `§4.4-REPETIR`**. Y en cualquier caso **se dice
   en la entrega con su resultado**, para que la decisión sea de Iker y con el dato
   delante.

#### ⛔⛔ 4.4-REPETIR · UNA REFERENCIA DE OTRA CUENTA SE PUEDE REPETIR, PERO CON ESPACIADO Y SOLO SI LA PRIMERA VOLÓ (Iker, 2026-08-24)

> **Iker, y es lo que faltaba escrito:** *"la regla era que no se podía repetir el mismo
> meme en la misma cuenta, pero en otras sí. Lo que pasa que creo que es demasiado pronto
> para repetir esta referencia, y además no sé si fue muy bien. En el caso de repetir un
> meme de otra cuenta sí que se puede, pero siempre y cuando haya un buen espaciado, de
> mínimo un mes, y sobre todo solo en el caso de que en la primera cuenta haya ido muy
> bien"*.
>
> **⚠️ ÁMBITO: vale para CUALQUIER pilar que parta de una referencia** (meme, lead
> magnet, historia, remix de lo que sea), no solo para el meme. Vive aquí porque los dos
> casos medidos son memes. Misma lógica que `§4.4-DOBLE` y `global §2.2b`.

**LAS TRES PUERTAS, y se pasan LAS TRES o se busca otra referencia:**

| # | Puerta | Vara |
|---|---|---|
| **1** | **ESPACIADO desde la publicación anterior** | **mínimo 1 mes**, y el único caso que funcionó llevaba **98 días** |
| **2** | **La primera vez VOLÓ** | outlier de verdad: **≥3x o ≥50.000 impresiones**. La mediana del meme es 6.905, así que "no fue mal" NO vale |
| **3** | **Se repite CON el filo** (`§4.4-DOBLE`) | si el motor era la polémica o el registro bruto y hay que suavizarlo para que quepa en la cuenta nueva, **no se repite** |

**LOS DOS CASOS MEDIDOS, que son los que fijan la vara:**

| Caso | Espaciado | La 1ª vez | La 2ª vez |
|---|---|---|---|
| ✅ **La escalera de calvicie** · Iker 06/05 → Asier 12/08 | **98 días** | 13.92x · **138.828** | 6.04x · **89.320**, el mejor post de Asier |
| ⛔ **El tatuaje** · Unai 29/07 → Iker 31/07 | **2 días** | 6.88x · **93.744** | 0.53x · **5.427**, un **5,8%** del original |

- **El espaciado es lo que separa los dos casos, no la calidad de la referencia:** las dos
  partían de un post que había volado (138.828 y 93.744) y las dos se remixaron bien. La
  que se repitió a los 2 días se estrelló.
- **⛔ Y ESTO RETIRA EL "LO ANTES POSIBLE" DE `§4.4-DOBLE`.** Aquella regla decía que un
  ganador se dobla en otra cuenta **cuanto antes**, y es exactamente lo que produjo el
  5,8%. El double down sigue existiendo como jugada, pero **con el mes de espaciado por
  delante**; si la idea no aguanta un mes, es que era del momento y no se dobla.
- **⚠️ n=2, y se dice en la entrega.** El mes es criterio de Iker; los 98 días son lo
  único medido. Cuando haya un tercer caso entre 30 y 98 días, se anota aquí y se ajusta
  la vara con él.
- **⛔ EL ESPACIADO SE CUENTA DESDE QUE LA COPIAMOS NOSOTROS, NO DESDE LA FECHA DE LA
  REFERENCIA (Mario, 2026-08-26).** Es el error que cometí al ofrecerle el meme del
  descafeinado: miré que el original de Segantini era del 16/07 y me pareció lejano, cuando
  **lo que cuenta es que NUESTRA copia salió el 14/08**, o sea 11 días. Iker: *"cuando me
  refiero a espaciar la referencia no es viendo la fecha en la que se ha publicado la
  referencia, sino viendo la fecha en nuestras cuentas de cuándo ya hemos copiado esa
  referencia"*.
  - **Dónde se mira: `historial-publicaciones.md`, la fila de NUESTRO post**, que es donde
    está anotada la referencia de cada meme. La fecha del original no pinta nada aquí.
  - **La referencia puede ser de hace un año y estar quemadísima**, porque lo que el lector
    ha visto es lo nuestro, no lo suyo.

**Mecanizado** como aviso de entrega en `validar-post.py` (`ENTREGA: si la referencia ya
la uso otra cuenta`), que imprime las tres puertas con su vara. El script no ve la
referencia, así que no puede ser fallo duro: lo que puede hacer es que la pregunta salte
siempre, que es donde se falla.

**Cómo se comprueba, que a ojo no vale:** el texto del post nuestro casi nunca nombra
la referencia, así que se busca por el CONCEPTO de la imagen — `calv|pelo`,
`tiburón`, `tatuaje`— sobre los `content_text` de las 3 cuentas, y se cruza con
`historial-publicaciones.md`, que sí anota la referencia de cada meme.

### 🔄🔄 4.4-PASO-0-REFRESH · LA PRIMERA PUBLICACIÓN DE CADA SEMANA EMPIEZA REFRESCANDO EL CORPUS (Mario, 2026-08-26) — GLOBAL

> **Mario:** *"cada vez que tú detectes que es lunes o que es una nueva semana, y estamos haciendo la primera publicación de la semana, tienes que irte a la sección dashboard y pulsar el botón refresh all, porque así podremos encontrar memes nuevos de la gente que tenemos trackeada"*.

**Cuándo: al detectar que arranca semana nueva** (lunes, o el primer post que se escribe esa semana), **antes de buscar ninguna referencia**. No espera a que lo pidan.

**Cómo, sin salir de aquí:** `neety_refrescar` con `ambito: competencia` y `limite: 500`, que es el equivalente del botón **refresh all** del dashboard. Vuelve en el acto y sigue en segundo plano unos 10 minutos con los ~150 creadores; el progreso se mira con `neety_refrescar_estado`, **nunca relanzando el refresco**. Mientras corre se puede ir trabajando en la receta.

**Por qué importa y no es burocracia:** el corpus está agotado por arriba (`§4.4-PASO-0b`), así que **lo que salva la semana es lo que se ha publicado en los últimos días**. Sin refrescar, se buscan referencias sobre una foto de hace semanas y salen siempre las mismas, que es exactamente por lo que se acaban repitiendo.
- **⚠️ Y lo que el refresco NO arregla, dicho por Iker:** *"seguramente hay gente en el sector que no tenemos trackeada que también hace buenas publicaciones"*. El refresco actualiza a los que YA seguimos; para los que no, sigue haciendo falta la búsqueda por keyword de `§4.4-PASO-0b`. **Las dos vías, no una.**

### ⛔ 4.4-PASO-0b · LAS REFERENCIAS SE BUSCAN EN LINKEDIN, NO SOLO EN LA BD

Iker, 2026-08-11: *"son todas referencias que las sigues sacando de nuestra base de
datos, cuando tú tienes Unipile. Llevamos 5 meses usándola y yo ya miraba la sección
de inspiración con el filtro meme, y los primeros casi todos ya los hemos usado"*.

**El corpus está agotado por arriba**: ordenar por ratio devuelve justo lo que ya
hemos gastado. Lo nuevo hay que ir a buscarlo.

> ### ✅✅ CORREGIDO EL 2026-08-18: LA BÚSQUEDA DE POSTS **SÍ** FUNCIONA, Y ES LA MEJOR VÍA PARA ENTRAR EN UN SECTOR NUEVO
>
> Aquí ponía que `category: posts` devolvía `total_count: 0` con cualquier keyword. **Es falso hoy** (probado el 18/08 buscando memes de atención al cliente): devuelve resultados normales, de 10 en 10, paginando con `cursor`.
> ```
> POST {BASE}/api/v1/linkedin/search?account_id=…
> {"api":"classic","category":"posts","keywords":"customer success meme"}
> ```
> - **El campo `total_count` viene a `null`, y ESE fue el malentendido**: no significa cero resultados, significa que LinkedIn no devuelve el total. Lo que importa es `items`, que viene lleno. **Mirar `items`, nunca `total_count`.**
> - Cada item trae `reaction_counter`, `comment_counter`, `repost_counter`, `share_url`, `text`, `author` y `attachments` con la URL de la imagen. O sea, todo lo que hace falta para filtrar sin abrir LinkedIn.
> - **Para qué vale de verdad:** el camino de abajo (pedirle los posts a un autor que ya conoces) solo te da más de lo mismo. **Cuando hay que saltar a un sector donde no conocemos a nadie** —atención al cliente, partnerships, RRHH— la búsqueda por keyword es la única puerta. El 18/08 dio **496 posts en 12 consultas**, y de ahí salieron 17 candidatos con imagen y más de 100 reacciones.
> - **Receta de búsqueda que funcionó:** una docena de keywords en INGLÉS mezclando el rol y la palabra `meme` o `funny` (`customer success meme`, `support ticket meme`, `csm meme`, `churn meme`, `account manager meme`), 4-5 páginas cada una. En español devuelve casi nada, igual que ya avisaba `outliers §0`.
> - **Tarda:** cada consulta va a 10-20 segundos, así que 12 keywords son varios minutos. Lánzalo en segundo plano y sigue con otra cosa.
> - **Y el filtro de risa se corre después**, sobre los 5-8 finalistas (`GET /posts/{social_id}/reactions?limit=100`), que es lo que separa un meme de verdad de un post con foto: el 18/08 los candidatos iban del **2% al 50%** de `ENTERTAINMENT` con likes parecidos.

> ### 📉📉 4.4-PASO-0c · LA CANTERA DE PROGRAMACIÓN NO DA RISA, Y ESO CAMBIA CÓMO SE BUSCA PARA EL TERCER JEFE (medido el 2026-08-19)
>
> **Buscando la referencia del carril de Asier** (`aboutme §2-CARRIL`: ventas + programación) se barrieron **~900 posts en 5 tandas y 4 vías** — keywords de ventas, keywords de desarrollo, feeds de fábricas de memes y capturas de tuit. **Resultado: en el carril de programación no hay una sola referencia que pase nuestro listón.**
>
> | referencia dev | reacciones | % de risa | risas absolutas |
> |---|---|---|---|
> | GeeksforGeeks, el punto y coma | 4.079 | **13%** | 530 |
> | Kartikey, no despliegues en producción | 1.039 | **9%** | 93 |
> | Talha, no vuelvo a tocar ese código | 991 | **14%** | 138 |
> | Pooran, la IA se come lo fácil | 595 | 21% | 124 |
> | Sachin, el jefe de producto a las 2:47 | 362 | 10% | 36 |
> | Arthur, datos sucios más IA | 312 | **30%** | 93 |
> | Ghadeer, vibe coding día 1 contra día 30 | 183 | **28%** | 51 |
>
> **Lo que enseña, y es de método:** en la cantera de desarrollo **el volumen y la risa van al revés**. Los posts con miles de reacciones son de páginas enormes cuyo público da "me gusta" de cortesía (13% de risa: eso **no es un meme**, es un post con foto, `§4.4` filtro del 25%), y los que sí hacen reír son pequeños. Compáralo con la cantera de ventas, donde el mismo día salían **1.742 risas absolutas** (Alex Cohen vía brendan short) y **825** (Will Aitken).
>
> **CÓMO SE BUSCA ENTONCES EN ESE CARRIL, por orden:**
> 1. **Por el cruce IA + producto + ventas**, que es donde el carril técnico sí tiene risa y encima es nuestro terreno (`aboutme §1`: *"no vendemos AI SDRs"*). Ahí están el tuit de las herramientas de IA apiladas y la sátira del vibe coding.
> 2. **Por capturas de tuit**, no por posts nativos: el humor de desarrollo vive en X y llega a LinkedIn reposteado (`§4.4-IDENTIDAD` ya cubre cómo se calca la identidad de la cuenta).
> 3. **Nunca por páginas de volumen** (GeeksforGeeks y similares): su ratio de risa las descalifica de entrada, por muchas reacciones que tengan.
> 4. **Y si aun así no sale**, se dice y se pide referencia, que es lo que manda el runbook. **No se rellena con una plantilla genérica.**
>
> **⚠️ Y el suelo de risas absolutas no se baja en silencio.** Si para este carril hay que aceptar una referencia de 150-350 reacciones, **es una decisión de Iker y se declara en la entrega**, con la comparación delante.

La otra vía, que sigue valiendo para exprimir a un autor que ya conoces:

```
GET {BASE}/api/v1/users/{provider_id}/posts?account_id=…&limit=30
```

Se pide sobre los **autores de meme que ya conocemos** y devuelve **sus últimas
publicaciones, incluidas las que nuestra BD todavía no ha rastreado**. Así salieron
el 11/08 posts de hace 4 horas y de hace 5 días que no estaban en el corpus.

Se filtra por: lleva imagen, reacciones por encima del umbral del autor, y **no está
en `cross-creators`** (si está, ya lo teníamos). Lo de hace menos de un mes es lo que
sorprende, que es de lo que vive este pilar.

### 4.4 · Runbook MEME (REMIX de una referencia) — receta definitiva

> **⭐ EL FLUJO EN 5 PASOS (la intuición, antes de los detalles). Costó 8 iteraciones sacarlo el 2026-07-23; que no vuelva a costar:**
> 1. **REFERENCIA = meme de VERDAD.** Riesgo de risa 25-56% (`GET /posts/{id}/reactions`, `ENTERTAINMENT`), ≥100 likes. **Viral aunque NO sea de ventas** — el dolor psicológico es universal y ya lo adaptamos. Mira la imagen antes de elegir.
> 2. **CALCA LA ESENCIA ENTERA**, no media: la mecánica del gancho, la estructura del cuerpo (flechas, numerada, dos cajas…), la longitud, la mecánica de la imagen **y el TIEMPO VERBAL** (si promete en futuro, tú en futuro). Fidelidad > "corto y punchy".
> 3. **ADÁPTALO A VENTAS** en el texto y en la imagen (`§2.3`), sin destripar el chiste que remata la foto.
> 4. **MEJÓRALO** (el paso que más olvido): verbo con techo (`§2.9`), **sin repetir verbo**, formato más limpio. Igualar el original es el SUELO; superarlo es la meta.
> 5. **VALIDA:** mecánico 30/30 (`validar-post.py --pilar meme`) + pase de criterio (`§8`). Entrega con comparativa (texto verbatim, dos columnas, `working-preferences §1e`).
>
> Los pasos 2-4 son la cadena que se me escapa: calco medio, olvido el tiempo verbal, o no mejoro el punch. Léelos SIEMPRE.
>
> **⭐ EN EL MEME, UNA BROMA YA VALIDADA DENTRO DE VENTAS BATE AL REMIX DE OTRO SECTOR (Iker, 2026-07-29).** La norma general es robar outliers de otro sector y traerlos al nuestro, porque el ángulo llega fresco. **En el meme es al revés:** si existe una broma universal que YA ha funcionado dentro de ventas, tiene más garantía, porque **el sector ya te la ha comprado** y no hay que traducir el dolor. Caso: el email del tatuaje de Félix Fernández (59% de risas, 3,38x) es dolor puro de ventas, y el remix salió redondo sin forzar la adaptación.
>
> **⭐ PASO 0 — ELIGE LA CUENTA QUE AGUANTA EL MEME, NO REBAJES EL MEME PARA LA CUENTA (Iker, 2026-07-27).** El nivel de burrada del original es parte del motor: si lo suavizas para que encaje en una cuenta sobria, te quedas con el tema y sin el chiste.
> - **Iker (2º jefe) = memes BRUTOS o informales.** Le da igual el registro mientras el post viaje.
> - **Unai (1º) y Asier (3º) = memes de ventas más normalitos y sobrios.** Y sí, eso les cuesta alcance: es una decisión asumida, no un descuido.
> - **El caso que lo demostró (0,31x, 1.003 impresiones):** el original de Gavin Fernand (corporatedudes, 425 reacciones, 45% risas) traducía **"I just shit my pants"** al lenguaje corporativo de LinkedIn. Nosotros, para que encajara en la cuenta sobria de Unai, pusimos arriba *"El cliente me dijo que no"* → *"Oportunidad en pausa estratégica"*. **La caja de arriba ya era corporativa, así que no había caída y no había chiste.** El motor de ese meme es la DISTANCIA entre la vulgaridad y el eufemismo. Ese meme tenía que haber ido en Iker, tal cual de bruto.
> - **Regla:** mide primero cuánto de bruto es el original. Si no cabe en la cuenta que te tocaba, **cambia de cuenta**, no de chiste.
>
> ### 🔴🔴 4.4-ESENCIA · LA ESENCIA SE EXTRAE DE LO QUE SE VE, NUNCA DE LO QUE YO CREA (Iker, 2026-07-30)
> **🗺️ Esta es la CAPA 1 (lo visual) de las tres que tiene una referencia. Las otras dos y el indice, en `global §2.2b-CAPAS`.**
> **⚠️ UNIVERSAL, no solo del meme.** Vale para remixar CUALQUIER cosa: un lead magnet, un mapa, una historia. La esencia se saca del texto palabra por palabra y del inventario de lo que se ve, nunca de mi teoria de por que funciono. Enlazada desde `global §2.2b`.
> **Iker, literal: "CLARO QUE QUEREMOS COPIAR AUNQUE SEA DESCARADO PERO MEJORANDO Y ADAPTANDO A VENTAS. NO TE VAYAS POR LAS RAMAS HACIENDO OTRA BROMA DISTINTA."**
>
> **⭐⭐ COPIA NO ES PLAGIO, Y NO PASA NADA POR QUE SE NOTE (Iker, 2026-07-30).** Yo arrastraba la idea de que habia que disimular el calco, y **eso es lo que me hacia buscar "el equivalente" en vez de copiar**. Aclarado: *"me da igual que se note que es una copia, lo importante es que no sea un plagio"*. **La ESENCIA se copia PALABRA POR PALABRA**; lo que no se copia es el gancho entero. Si el original dice `codigo de verificacion`, mi gancho dice **`codigo de verificacion`**. Si en la foto hay un tatuaje, en la mia hay un tatuaje. Si son calvos, son calvos. **Y luego se adapta a ventas y se mejora**, que es la otra mitad.
> - **⛔ Buscar el equivalente NO es adaptar.** "Alta de proveedor" era mi equivalente de "codigo de verificacion": mismo concepto abstracto, palabras distintas. **Mal.** Adaptar es conservar la palabra y cambiar el CONTEXTO en el que aparece.
> - **⭐ EL TEST DE LA RABIA, que es el que me faltaba.** Despues de adaptar, leelo en frio y pregunta: **¿esto sigue dando la misma rabia?** Mi version decia *"enhorabuena por la venta, te hemos enviado el alta de proveedor"* y Iker lo tumbo en una linea: **si te confirman que la venta salio bien, ir al correo no da rabia, son buenas noticias**. La rabia del original viene de que te BLOQUEAN justo cuando ibas a conseguir lo tuyo. **Si tu version no bloquea, no sirve.**
>
> **El fallo, tres veces en una semana, y siempre el mismo:** me quedaba con el FORMATO y cambiaba el elemento concreto que hacia el chiste.
> - **Tatuaje → tarta.** En la foto se veia un tatuaje. Puse una tarta.
> - **Calvos → otra cosa.** La escalera de calvicie era el chiste. La adapte a ventas y me lleve por delante a los calvos.
> - **Codigo de verificacion → "eso lo lleva otra persona".** Su texto decia codigo de verificacion. Yo escribi otra broma y encima me invente una teoria sobre bucles que **no estaba en ninguna parte** para justificarla.
>
> **⛔ LA CAUSA RAIZ: yo teorizaba POR QUE creia que habia funcionado, y construia el remix sobre esa teoria.** Eso es inventarse el dato. En marketing nos cenimos a lo medido; aqui igual.
>
> **EL PROCEDIMIENTO, y se hace por escrito ANTES de redactar nada:**
> 1. **Copia el texto del original PALABRA POR PALABRA.** Entero, sin resumir.
> 2. **Haz el inventario de lo que SE VE en la imagen.** Objetos, personas, gestos, texto dentro de la foto. Literal: *"mujer sentada en una mesa, dedos apretando los ojos cerrados, oficina detras"*.
> 3. **La esencia es ESO y nada mas.** Esas dos listas. **Pero leidas de verdad: lo que la cosa nombrada HACE literalmente** (Iker, 2026-07-30). Eso NO es teorizar, es entender la palabra.
>    - **Ejemplo, y es el que me costo tres intentos.** El original decia *"a verification code was just sent to your email"*. Un codigo de verificacion **literalmente significa**: creias que habias terminado, aparece un paso mas, tienes que ir a otro sitio, buscarlo y volver, y solo entonces consigues lo que ibas a buscar. **Eso es FRICCION**, y esta en el significado de la palabra, no en una hipotesis sobre por que gusto.
>    - **Yo entregue dos versiones sin friccion**: *"eso lo lleva otra persona"* (un corte de manga) y *"tu propuesta ha sido leida"* (un callejon sin salida). Ninguna tiene el paso extra, asi que ninguna golpea igual.
>    - **La frontera:** ✅ *"un codigo de verificacion obliga a dar un rodeo antes de conseguir lo que ibas a buscar"* es LEER. ❌ *"esto funciono porque la gente odia los bucles y el sistema te manda en circulos"* es INVENTAR. Lo primero sale de la palabra; lo segundo, de mi cabeza.
>    - **El test:** describe lo que hace el elemento del original **sin usar la palabra "funciona" ni "gusta"**. Si no puedes, todavia no lo has entendido. **Prohibido anadir una tercera linea que empiece por "lo que pasa es que" o "funciona porque".**
> 4. **Adaptar a ventas = cambiar SOLO el contexto.** Los elementos de las dos listas se quedan. Si el original dice `codigo de verificacion`, tu version lleva un aviso automatico del sistema. Si en la foto hay un tatuaje, en la tuya hay un tatuaje.
> 5. **Y ENTONCES se mejora**, que es la otra mitad del trabajo: mejor gancho, mejor cuerpo, mejor imagen, nuestro formateado. **Mejorar es sumar, nunca sustituir lo que ya funcionaba.**
>
> **El test antes de entregar:** pon las dos listas al lado de tu version. **Cada elemento de la lista tiene que tener su equivalente reconocible en el remix.** Si falta uno, no es un remix, es otro post.
>
> ### ⛔⛔ 4.4-ESENCIA-MITAD · CUANDO EL TEXTO Y LA IMAGEN DEL ORIGINAL CUENTAN CHISTES DISTINTOS, LA ESENCIA ES LA DE LA PIEZA QUE ESTAMOS ROBANDO (Mario, 2026-08-26) — GLOBAL
>
> > **Iker, sobre la v1 del meme de Asier:** *"como primera versión está bien, pero no sé si hemos perdido la esencia del meme, creo que sí. Recuerda que hay que calcar la esencia tanto del texto como de la foto"*. Y la había perdido entera.
>
> **El caso, y es el que hay que reconocer porque se repite:** la referencia de Pietro Acerbis son **DOS piezas que no cuentan el mismo chiste**. Su TEXTO es un listículo serio sobre los cinco problemas del CRM. Su IMAGEN es un meme de katana donde `YES` resulta ser el principio de `YESTERDAY I HAD A DREAM ABOUT IT`. **El 32% de risa lo produce la imagen, no el listículo.**
>
> **Lo que hice mal, y las tres cosas salen del mismo error:** cogí el ángulo del **TEXTO** (el CRM está lleno de datos inútiles) y escribí un cuerpo que inventariaba el papeleo. Resultado:
> 1. **Mi gancho no calcaba su mecánica.** La de la imagen es una **pregunta acusadora en estilo directo** que deja la respuesta colgando; yo narré el desenlace desde fuera (*"y no le mentí ni una vez"*), que es contar el chiste en vez de montarlo.
> 2. **El motor no aparecía en el texto por ningún lado.** El motor es **la palabra cortada** — que la sílaba visible sea el principio literal de la frase entera —, y mi cuerpo hablaba de bolígrafos. Es el fallo de Lauren Vilips del 11/08 al revés: allí la foto tenía un médico que ningún texto recogía; aquí la foto parte una palabra y el texto no la nombraba.
> 3. **Y el remix pasaba el validador a 49/49.** Esto el script no lo ve nunca.
>
> **LA REGLA, en una línea:** *antes de extraer la esencia, di en voz alta **QUÉ PIEZA** de la referencia estamos robando, y saca la esencia SOLO de esa.* Si robamos la imagen, el gancho calca la mecánica **del texto que hay DENTRO de la imagen**, no la del post que la envuelve.
>
> **EL CHEQUEO, y es de diez segundos:** escribe en literal **cuál es el mecanismo del gag en una frase**, y después busca esa frase dentro de tu texto. Aquí: *"la respuesta corta que suena a un sí es en realidad el principio de una frase que dice que no"*. Si esa frase no está recogida en el cuerpo ni en el gancho, **el motor se ha quedado solo en la foto y el texto es de otro post**.
>
> **⚠️ Y esto NO choca con `§4.4-CALLA`** (el cuerpo no explica la imagen). Recoger el MECANISMO no es describir la foto: el cierre *"El sí entero nunca cabe en la ficha"* no cuenta que hay una katana, pero sostiene el mismo motor. **Se recoge el mecanismo en abstracto; lo que no se hace es narrar lo que se ve.**
>
> ### 🔴🔴 4.4-ESENCIA-MITAD-BIS · CORRECCION DEL 27/08: EL GANCHO CALCA EL GANCHO DEL POST, NUNCA EL TEXTO DE DENTRO DE LA FOTO (Iker, 2026-08-27)
>
> > **Iker, sobre el meme de la ficha ya publicado:** *"como me acabas de recordar la referencia, el gancho original no tenia absolutamente nada que ver con el nuestro. De hecho, nuestro gancho repetia la broma de la foto, cosa que siempre tenemos que hacer ganchos complementarios"*.
>
> **⛔ LO QUE HABIA ESCRITO JUSTO AQUI ARRIBA ERA MIO Y ESTABA MAL** (`working-preferences §0c`): puse que *"si robamos la imagen, el gancho calca la mecanica del texto que hay DENTRO de la imagen"*. **De ahi salio un gancho que contaba la misma broma que la foto**, y eso choca de frente con `global §2.0c-VISUAL`, que lleva desde el 21/08 diciendo que si el gancho y la foto cuentan lo mismo, una de las dos capas sobra.
>
> **LA REGLA BUENA, y la prueba es la propia referencia:** el post de Pietro Acerbis es un **listiculo serio sobre la ficha del cliente** y su foto es **un gag de katana**. Las dos piezas no cuentan el mismo chiste **a proposito**: el texto argumenta y la foto remata. **Ese reparto ES la referencia, y es lo que se calca.**
>
> | capa | de donde sale |
> |---|---|
> | **nuestro GANCHO y nuestro CUERPO** | del **gancho y el cuerpo del post original** |
> | **el texto de DENTRO de nuestra foto** | del **texto de dentro de su foto** (`images §0b-TEXTO-REF`) |
>
> **Lo que SI se conserva de `§4.4-ESENCIA-MITAD`:** que el **mecanismo del gag** se recoja en abstracto en alguna linea de la mitad de abajo, sin narrar la foto (`§4.4-CALLA`). Lo que se retira es que el GANCHO lo haga.
>
> **EL TEST, y son dos gestos:** tapa la foto y lee el gancho; tapa el gancho y mira la foto. **Si las dos respuestas se parecen, el gancho esta mal**, aunque calque algo de la referencia.
>
> ### ⛔⛔ 4.4-ROL · EL GANCHO NO LE PUEDE ATRIBUIR AL QUE PUBLICA UN ROL QUE NO TIENE (Iker, 2026-08-27) — GLOBAL
>
> > **Iker, sobre el mismo meme movido a su cuenta:** *"el segundo jefe es el que se encarga de las ventas de la parte comercial, entonces el no tiene un jefe de ventas, ya que el es su propio jefe de ventas"*.
>
> **Es la misma familia que el dato biografico inventado de `aboutme §2`** (el `llevo años publicando` de Mario): **la voz generica del meme no es permiso para colgarle al dueno de la cuenta un puesto, un jefe o una antiguedad que no son suyos.** El lector que le conoce lo pilla en un segundo y el post pasa de chiste a incoherencia.
>
> **EL CHEQUEO, antes de dar el gancho por bueno:** lee el gancho poniendo delante el **headline real** de esa cuenta. *Co-Founder @ Neety, parte comercial* + *"mi jefe de ventas me mando..."* no se sostiene.
>
> **⭐ Y LA FOTO NO CAE EN ESTO SI VA EN GENERICO, que es lo que salvo este caso.** El rotulo dice **`Jefe:`** a secas, no `Jefe de ventas:`, y **por encima de un cofundador comercial si hay un CEO**. Iker: *"con eso nos salvamos"*. **Corolario que vale para cualquier prompt de imagen: el rotulo de un rol va siempre en la version mas generica que aguante el chiste** (`Jefe`, `El cliente`, `Compras`), porque asi la imagen sirve para las cinco cuentas y no hay que re-editarla al moverla.

> ### 🧠🧠 4.4-ESENCIA-OFICIO · SI EL ELEMENTO DEL ORIGINAL ES DE OTRO OFICIO, SE CALCA EL MECANISMO Y NO LA COSA (Iker, 2026-08-27)
> **⚠️ Esto AFINA `§4.4-ESENCIA`, que dice "los elementos de las dos listas se quedan". Se quedan cuando el lector los reconoce. Cuando pertenecen a un oficio que no es el de la cuenta, lo que se queda es el MECANISMO.**
>
> > **Iker, sobre el bloque de tres de la referencia:** *"yo tampoco entiendo de lo que ella hablaba, o sea, ¿qué significa landing page backlog, microsite, two sprints away, dashboard pronto? Tienes que mencionar cosas que encajen más con la labor que te digo yo que tengo de simplemente publicar, pero que sí que sea un cuello de botella y problemas de verdad"*.
>
> **El caso.** El original es de una growth de PRODUCTO con equipo de ingeniería detrás: `Landing page? Backlog. / Microsite? Two sprints away. / Dashboard? "Soon."` son cosas que ella **pide a otro equipo**. Mario no pide nada de eso a nadie: **Mario publica**. Calcarle esas tres palabras es darle un dolor prestado, y encima uno que su lector no reconoce.
>
> **QUÉ SE CONSERVA Y QUÉ SE TRADUCE:**
> | | del original | en el remix |
> |---|---|---|
> | ✅ **el MECANISMO** | `¿[cosa que necesito]? [respuesta que me deja tirado]`, tres veces | idéntico |
> | ✅ **la DEGRADACIÓN** | Backlog → dos sprints → "pronto" | dos que controlo → el que no |
> | ⛔ **las COSAS** | landing page, microsite, dashboard, sprints | **el gancho, la hora de publicar, quién nos lee** |
>
> **⛔⛔ Y EL ERROR CONTRARIO, QUE COMETÍ EN EL TURNO SIGUIENTE: SOBRECORREGIR Y TIRAR EL BLOQUE ENTERO (Iker, 2026-08-27).** Al saber que `microsite` y `two sprints` no eran de su mundo, descarté **las tres** cosas. Iker: *"es tan fácil como que mires la referencia: yo sí que toco landing pages también, y tenemos nuestro propio dashboard personal. Podrías copiar cosas de esas, que son problemas que yo también afronto. Lo que yo no afronto es nada relacionado con llamar a clientes o publicidad, todo lo hago orgánico"*.
> - **De las tres cosas del original, DOS eran suyas** (`landing page`, `dashboard`) **y una no** (`microsite`, que se pide a ingeniería). Lo que sobraba era **el marco** (encargárselo a otro equipo), no las cosas.
> - **LA REGLA: antes de descartar un elemento por "es de otro oficio", se PREGUNTA cuáles SÍ son suyos.** El que firma la cuenta lo sabe y yo no. Descartar entero es tan caro como calcar entero: en el primer intento le puse un dolor prestado, en el segundo le quité dos herramientas que usa cada día.
> - **Y hay un motivo de ALCANCE encima del de veracidad** (Iker): *"mete más cuello de botella, más problemas con los que cualquiera se pueda sentir identificado si trabaja en marketing o en growth"*. **Las cosas del original venían ya elegidas por alguien de ese oficio**, así que las que encajan son las que más identificación traen. Tirarlas es tirar alcance.
>
> **⛔ Y LAS RESPUESTAS DEL BLOQUE TAMBIÉN SE CALCAN, NO SOLO LAS PREGUNTAS (Iker, 2026-08-27).** *"Sé tan descarado de copiar las expresiones naturales que ella ha utilizado en inglés, como «pronto» o «two sprints away», que es como «dos pasos»"*.
> - **El fallo:** calqué el molde de la pregunta (`¿X? Y.`) y **me inventé las respuestas** (`Llena de visitas`, `Lleno de números`). Es `§4.4-ESENCIA` otra vez: buscar el equivalente en vez de copiar.
> - **Lo que se hizo:** `Backlog.` → **`En la cola.`** · `Two sprints away.` → **`A 2 pasos.`** · `"Soon."` → **`Pronto.`** Traducción natural al castellano, no literal, **y con la degradación intacta** (concreto → sin fecha → nada).
> - **La regla: en un bloque calcado, lo que se traduce son las PALABRAS; lo que se cambia es solo el sustantivo al que se aplican.** Si el original responde con tres largas, tú respondes con esas tres largas.
>
> **LOS DOS TESTS, y los dos se corren sobre el borrador, no sobre la teoría:**
> 1. **¿EL QUE FIRMA ENTIENDE SU PROPIO POST?** Si el dueño de la cuenta tiene que preguntar qué significa una línea, el lector ya se ha ido. **Es el test más barato que existe y no lo estaba corriendo.**
> 2. **¿LO QUE CUENTA EL CUERPO ES UN PROBLEMA DE VERDAD, O ES LA VENTAJA DISFRAZADA?** Aquí caí en el mismo turno: puse `Aquí no llamamos a nadie / Nos escriben ellos` **como si fuera el cuello de botella, y eso es justo lo que le va BIEN**. El gancho prometía un problema y el cuerpo contaba lo bien que va: el bucle no paga y el lector se siente estafado.
>   - **La forma correcta es que convivan:** la ventaja va de **premisa** (`Aquí no llamamos a nadie. / Nos escriben ellos.`) y el cuello de botella va **detrás** (`Pero hay un techo.` → `¿Quién nos lee? Eso ya no lo elegimos.`). Primero por qué eres bueno, después dónde se acaba.
>
> **Y el cuello de botella bueno es el que el DESTINO del enlace resuelve.** Aquí *no elegimos quién nos lee* lo resuelve una sala de 80 plazas elegidas a mano, que es literalmente lo que vende el evento. Si el cuello de botella que cuentas no lo arregla el enlace, has escrito dos posts pegados.
>
> ### 📏 4.4-MEDIR · LA ANATOMIA DE LA REFERENCIA SE MIDE, NO SE MIRA (Iker, 2026-08-06)
> **🔒 ESTA REGLA ES UNIVERSAL Y VIVE EN `global §2.2b-MEDIR`.** Vale para CUALQUIER pilar que parta de una referencia, no solo el meme. Aqui queda el detalle porque el primer caso fue un meme; si algun dia choca con lo de alla, manda `global`.
> **`python scripts/anatomia-referencia.py original.txt mio.txt` antes de entregar.** Copié el tema y el motor del meme de Daniel Disney y no medí nada, y salió esto:
> ```
> ORIGINAL  hook 34 car | 1 frase  | emoji 🤣
> EL MIO    hook 62 car | 2 frases | emoji 👇
> ```
> Iker: *"no puede ser que el gancho original sea tan corto con un emoji de risa y el nuestro sea el doble de largo, dos frases en vez de una, y el emoji de la mano en vez del suyo. Todo lo queremos validar en datos. En las referencias igual: analiza su ritmo, su lenguaje, sus conjugaciones, su longitud, sus emojis, todo."*
> - **Longitud del hook:** el inglés dice lo mismo con menos palabras, así que se admite margen, **pero no el DOBLE**.
> - **Nº de frases del hook:** una frase es una frase. Partirla en dos se carga el golpe seco.
> - **El emoji del hook se calca**, no se sustituye: 🤣 anuncia broma y 👇 anuncia lista. **Y se mira DÓNDE vive cada emoji**: aquí el 👇 estaba en el CIERRE, no en el hook, así que copiarlo al hook es ponerlo donde el original no lo puso.
> - **Longitud total y nº de bloques:** 1.289 car y 17 bloques contra 773 y 9 es habernos dejado media publicación.
> - **El ritmo es donde SÍ mejoramos**: bloques de 2 y 3 en escalera y líneas sueltas. Su ritmo puede ser peor que el nuestro; la longitud y el hook, no.
> - **Lo que NO se calca se dice en la entrega, para que sea decisión y no descuido.** Aquí, el cierre: el suyo remata con pregunta + 👇 y el nuestro con un bold statement, porque `global §4.5` pide un solo CTA y ese hueco ya lo ocupa el spam ninja.
>
> ### 🔒 4.4-BUCLE · →→ ESTA REGLA SE MUDÓ A `global-instructions §2.0` (Iker, 2026-07-31)
> **El bucle abierto es de TODOS los pilares, no del meme ni del lead magnet.** La escribí aquí y en `§4.5` como si fuera de pilar, y por eso propuse un gancho de meme que desvelaba el chiste. **Vive en `global §2.0` y ahí se lee.** Lo único específico del meme: al haber imagen, el bucle es doble — el gancho tampoco cuenta lo que se ve.
>
> ### 🤐 4.4-CALLA · EL CUERPO NO NOMBRA EL CHISTE, Y SI LO NOMBRA ES TARDE (Iker, 2026-07-31)
> **⚠️ UNIVERSAL: vale para TODO post con imagen, no solo el meme. El principio esta en `global §2.0c`.** Aqui queda el detalle porque el primer caso fue un meme.
> **El cuerpo del meme habla del MÉTODO en abstracto. La broma la carga la imagen, entera.** Comprobado contra los dos originales: **ni el post de Félix ni el nuestro de Unai nombran el tatuaje una sola vez**. Unai habla de *"hacer algo imposible de ignorar"* y de *"el que no contesta también está contestando"*, y el tatuaje **no aparece en el texto en ningún momento**.
> - **Por qué funciona así:** el lector ve la imagen, entiende el chiste solo, y el texto le da **otra capa** en vez de repetirle lo que acaba de ver. Si el cuerpo explica la foto, el post pierde la mitad: la foto deja de aportar y el texto tampoco aporta.
> - **Y si hay que nombrarlo, NUNCA justo debajo del gancho.** Iker, 2026-07-31: en el double down yo puse *"El brazo tiene un fallo: hay que enseñarlo. / La cara sale sola en cada videollamada"* **en la segunda línea del post**, y eso mata el bucle en el sitio exacto donde más caro sale, el corte del "ver más". **Va después del crédito, ya metido en el cuerpo**, cuando el lector lleva rato dentro.
> - **Regla práctica:** de la mitad del post hacia arriba, se habla del método. De la mitad hacia abajo se puede guiñar a la imagen.

> ### 🔁 4.4-DOBLE · DOUBLE DOWN: SE REPITE EL ESQUELETO, SOLO ROTA EL INTENSIFICADOR (Iker, 2026-07-31)
> **⚠️ NO ES DEL MEME: vale para CUALQUIER pilar.** Se puede doblar un mapa, un lead magnet o una historia que acabe de petar. Está escrita aquí porque el primer caso fue un meme, pero al leerla sustituye "meme" por el pilar que toque.
> **Qué es.** Repetir en otra cuenta una idea que se acaba de hacer viral en la nuestra.
> **⛔ AQUÍ PONÍA "lo antes posible" Y SE RETIRÓ EL 2026-08-24:** eso es justo lo que
> produjo el 5,8% de abajo. Ahora manda el espaciado de **mínimo 1 mes** de
> `§4.4-REPETIR`, con sus otras dos puertas. No es un pilar y no lleva receta propia: es una jugada sobre un pilar que ya existe. Se hizo el 31/07 con el tatuaje (Unai, miércoles, ~100.000 impresiones → Iker, viernes).
> - **El cuerpo se copia casi entero.** Ya está adaptado a ventas y ya capturó la esencia. Tocarlo es rehacer trabajo que funcionó.
> - **El gancho MANTIENE el esqueleto validado y solo cambia la palabra de intensidad.** La escalera real de este caso: Félix puso `no, señor` → nosotros lo mejoramos con `Jamás` → el double down usa `Nunca`. **Tres palabras, misma frase.** Inventar un gancho nuevo es tirar lo único que ya sabes que funciona.
> - **La escalada va en la IMAGEN, no en el texto.** El brazo pasó a la cara. Ahí es donde se sube lo absurdo sin tocar lo que ya rinde.
> - **Y se marca que es broma en el cierre**, con una línea corta detrás del bold statement (`Silencio es no. El láser son 6 sesiones.`). El primero se comió insultos por leerse en serio.
> - **🔴 MEDIDO EL 2026-08-05, Y ES PEOR DE LO QUE YO AVISABA: el double down del tatuaje hizo 5.427 contra 93.744 del original. Un 5,8%.** Yo avisé de que rendiría "por debajo"; rindió **17 veces menos**.
> - **La causa, y es la lección:** el original funcionó **por polémica** (a Unai le insultaron y eso disparó los comentarios). Al repetir, lo hicimos **más absurdo a propósito para evitar los insultos**… y con eso le quitamos el motor. **Un double down suavizado no es un double down: es el mismo chiste sin lo que lo hizo viral.**
> - **La regla: o se repite CON el filo, o no se repite.** Si el original era controversial y no queremos volver a comerlo, la respuesta correcta no es limarlo, es **no hacer el double down** y buscar otro ángulo.
> - **Expectativa realista:** un double down rinde **por debajo** del original, porque la audiencia se solapa y parte ya lo vio. Se avisa en la entrega.
>
> ### 🎯 4.4-FUENTE · DE DÓNDE SE COGE LA REFERENCIA (Iker, 2026-08-05, tras el flop del código de verificación)
>
> **Qué pasó.** El meme del código de verificación de Asier hizo **196 impresiones en casi una semana**. Al resubirlo con caricatura y la cuenta ya verificada mejoró el arranque, **pero se quedó en 296 impresiones a las 3 horas: flop confirmado también en la segunda versión** (Iker, 2026-08-05). **O sea que ni la caricatura ni la cuenta verificada salvaron al meme: el problema estaba en la ELECCIÓN de la referencia.** Pero además costó una barbaridad adaptarlo: siete iteraciones para llevar "código de verificación" al terreno de ventas.
>
> ### 📊 4.4-SERIO · EL MEME SERIO GANA EN CALIDAD DE AUDIENCIA, Y EL DATO LO CONFIRMA (Iker, 2026-08-10)
> **Medido en los 17 memes de 2026 con más de 10.000 impresiones.** El de *"Vender es un caos"* (Unai, 06/08) es **el mejor de todos en engagement por impresión**: 0,54% de likes contra 0,18% del tatuaje y 0,07% del que más alcance tuvo. Y **31 reposts**, récord absoluto de la tabla; el segundo tiene 22 con el triple de alcance. **El tatuaje tuvo un 50% más de impresiones y la MITAD de likes.**
> - **Lo que dice el dato:** el meme serio y reconocible llega a menos gente pero a **gente que reacciona**, y esa es la que puede comprar. El meme bruto compra alcance con audiencia que no es nuestra.
> - **La consecuencia, y es de Iker: las referencias de meme para UNAI y ASIER van en este registro** —de ventas, reconocible, sin caricatura—, y **la cuenta de IKER se reserva como banco de pruebas** para lo más informal. No se restringe a los tres: se reparte.
> - **Lo que sí vale para las TRES:** la referencia tiene que estar **ya adaptada a ventas** y, a igualdad, **priorizar idiomas que no sean el español** —y no solo el inglés— para que no nos pillen la copia.
> - **Por qué esto importa más que el alcance:** el objetivo es vender. Entre 190.000 impresiones con 143 likes y 61.000 con 330, la segunda nos deja más gente a la que escribir.

> **⚖️ LOS TRES EJES DE UNA REFERENCIA, y el mejor caso es el que tiene los tres (Iker, 2026-08-05):**
> | Eje | Por qué importa |
> |---|---|
> **1. ¿Ya está adaptada a VENTAS?** | Si el chiste nació en nuestro sector, **el puente ya está construido**. Ese es el coste que nadie ve: adaptar cuesta iteraciones y lo que llega, llega forzado. |
> **2. ¿Está en INGLÉS?** | Suelen tener **más alcance**, y sobre todo **no nos pillan la copia**: nuestro público no vio el original y el autor no se cruza con nosotros. |
> **3. ¿Ataca un problema PSICOLÓGICO universal?** | La calvicie le pasa a cualquiera, sea comercial o dentista. Eso es lo que hace que viaje fuera del nicho. |
>
> **El caso perfecto es el de la calvicie: los tres a la vez** (ya iba de ventas, estaba en inglés y el motor es psicológico), y son nuestros dos mejores memes del histórico, **16.45x y 13.52x**.
>
> **El contraejemplo es el del tatuaje:** ya estaba adaptado a ventas ✅ y era psicológico ✅, **pero en español** ❌. Resultado: nos pillaron la copia en menos de una hora, Félix bloqueó a Unai, y **la polémica nos dio alcance**. Iker, y esto es lo importante: ***"tampoco me conviene que se nos haga viral por polémica de copia"***. **El alcance por polémica de copia no es una estrategia, es una factura aplazada.**
>
> ### ⛔⛔ 4.4-FUENTE-VENTAS · YA NO ES UNA PREFERENCIA: LA REFERENCIA ES **SIEMPRE** DE VENTAS (Iker, 2026-08-24)
>
> **La lista de abajo estaba ordenada por preferencia y el punto 3 abría la puerta a memes de otro sector. Esa puerta se cierra en los tres jefes.** Iker: *"siempre las referencias tienen que ser ya las originales, aunque estén en otro idioma, siempre de ventas"*. Solo **Mario** (marketing) y **Helena** (atención al cliente) son excepción, cada uno con su mundo.
> - **Lo que se conserva del punto 3:** que el dolor sea **psicológico y universal** sigue siendo el criterio para elegir **dentro** de la cantera de ventas, no un permiso para salir de ella.
> - **Y el rincón de ventas lo decide la cuenta** (`aboutme §2-CARRIL`): Unai desde el que manda, Iker de calle, Asier con lo técnico al lado sin pasarse de específico.
> - **Se comprueba en el HEADLINE del autor**, no en si el chiste se puede llevar a ventas.
> - **El caso que lo motiva:** el meme de la búsqueda de Google de Asier (20/08) hizo **3.010 imp · 0.32x** con una referencia que era meme pero no de ventas.
>
> **📊 Y LA REGLA NO ES SOLO CRITERIO, ESTÁ EN NUESTROS PROPIOS NÚMEROS (medido el 2026-08-25).** Clasificados a mano los memes de las 3 cuentas con referencia anotada en el historial:
>
> | La referencia era… | n | Mediana de impresiones | Los casos |
> |---|---|---|---|
> | **DE VENTAS** | 9 | **95.913** | 168.926 · 165.526 · 138.828 · 121.706 · 95.913 · 93.744 · 24.806 · 12.805 · 1.784 |
> | **NO de ventas** | 7 | **1.405** | 21.761 · 16.769 · 3.010 · 1.405 · 550 · 345 · 196 |
>
> **68 veces más mediana.** Y los **seis** memes de la casa por encima de 90.000 impresiones salen los seis de una referencia de ventas.
> - ⚠️ **Lo que no prueba:** que baste con que sea de ventas. El diccionario (brendan short, GTM) era de ventas y se quedó en **1.784**. Ser de ventas es **condición necesaria, no suficiente**.
> - ⚠️ **Y la clasificación la he hecho yo a mano** leyendo la referencia anotada en `historial-publicaciones`, así que se puede discutir caso por caso. Lo que no se discute con esa distancia es la dirección.
>
> **🔎 LO QUE CUESTA ENCONTRARLA, dicho para que nadie repita el barrido a ciegas (2026-08-25).** Barridos **58 creadores de ventas del corpus, 494 posts con imagen en la BD y 236 más frescos traídos de Unipile**, midiendo el % de risa uno a uno: **solo 7 pasan el filtro de meme de verdad (≥25% de risa)**, y de los **250 posts de ventas que hablan del JEFE, cero**. La cantera del rincón de dirección está vacía de memes: lo que hay son posts de consejo con foto. **Si algún día hace falta uno de ese rincón y no aparece, no es que se haya buscado mal.**
>
> **📋 EL INVENTARIO COMPLETO DE LA CANTERA, CERRADO EL 2026-08-26. Léelo ANTES de barrer otra vez: el barrido cuesta una hora y esta tabla lo resume.** Vías usadas: corpus refrescado ese día (533 posts nuevos), `cross-creators` filtrado por gancho con palabra de ventas, búsqueda por keyword en Unipile (16 keywords) y el feed de ~80 creadores de ventas. Medido el % de risa uno a uno sobre **todas** las que llevan imagen y pasan de 100 reacciones.
>
> | referencia | risas abs | 🔁 | por qué NO está libre |
> |---|---|---|---|
> | brendan short 28/07 *not wrong haha* | 2.023 | 129 | usada · meme del diccionario, Unai 13/08 |
> | brendan short 10/08 *gtm engineers be like* | 1.786 | 32 | el tuit de Alex Cohen, **ya descartado dos veces** para Asier (ángulo de apilar herramientas) · y su gancho no lleva palabra de ventas |
> | Olga Mykhoparkina 19/08 *Claude watermark / SEO* | 1.676 | 95 | usada · **es la de la búsqueda de Google, la que salió a 3.010 · 0.32x** |
> | Segantini 16/07 *decaf espresso* | 1.093 | 47 | nuestra copia salió el 14/08 → **12 días**, y solo hizo 2.47x: falla las puertas 1 y 2 de `§4.4-REPETIR` |
> | Will Aitken 27/07 *emergency discount* | 1.157 | 77 | **es un VÍDEO**, no una imagen |
> | Jan B. Mundorf 13/05 *a sales team (cold calling edition)* | 863 | 103 | **es The Office**, el primer meme de Asier (16/07) |
> | Will Aitken 10/08 *cold call transcript* | 813 | 11 | usada · Iker 19 y 20/08 |
> | Segantini 27/07 *where did you get my number* | 360 | 7 | descartada el 14/08: mete la objeción de privacidad en nuestros comentarios |
> | Segantini 22/06 *rejection isn't the worst part* | 342 | 45 | **es un VÍDEO** |
> | Segantini 06/07 *I can handle rejection* | 213 | 3 | la captura es un ligue por privado, ni es de ventas ni pasa `§4.4-STOP` |
> | Segantini 24/07 *cold calls on Fridays* | 166 | 6 | 🟢 **libre**, pero es el rincón de Iker |
> | Segantini 08/07 *Descartes* | 125 | 12 | descartada el 14/08: 2 de 4 en el filtro de motor |
> | **Pietro Acerbis 01/07 *Today's CRM has FIVE structural problems*** | **40** | 5 | 🟢 **LIBRE y del rincón de Asier** (la herramienta), gancho con `CRM` |
> | Josh Etim 24/08 *underperforming sales rep* | 26 | 9 | 20% de risa, por debajo del suelo del 25% |
>
> **LAS DOS CONCLUSIONES, y la segunda es la que cambia cómo se planifica:**
> 1. **Todo lo que tiene señal de risa grande está gastado.** No es que la cantera sea pobre: es que **nos la hemos comido nosotros** en seis semanas. Lo que queda libre está uno o dos órdenes de magnitud por debajo en risas absolutas.
> 2. **⛔ Y por eso `§4.4-REPETIR` deja de ser el plan B y pasa a ser una vía normal.** Con la cantera agotada, **el double down espaciado de un ganador nuestro compite de tú a tú con una referencia fresca floja**, y encima con la garantía de que ya voló en nuestra audiencia. Antes de aceptar una referencia de menos de 150 risas absolutas, se miran las nuestras que pasan las tres puertas.
>
> **LA REGLA, por orden de preferencia:**
> 1. **Lo primero: referencias que YA funcionaron EN VENTAS.** Si el chiste nació en nuestro sector, el puente no hay que construirlo, ya está hecho. Ese es el coste oculto que casi nadie ve: **un meme que hay que "adaptar a ventas" durante siete iteraciones es un meme que va a llegar forzado.**
> 2. **Y dentro de esas, mejor en INGLÉS que en español.** Dos motivos: la copia se nota menos (nuestro público no vio el original) y el autor tiene menos probabilidad de cruzarse con nosotros. Con un original español pasó lo que pasó: Félix Fernández bloqueó a Unai en menos de una hora.
> 3. **⭐ LA EXCEPCIÓN, y es la que da los mejores outliers: memes de OTRO sector adaptados a ventas.** Los dos mejores del histórico son de fuera (la escalera de calvicie, 16.45x y 13.52x). **Pero solo valen si atacan un problema PSICOLÓGICO UNIVERSAL del ser humano**, no una situación propia de ese sector. La calvicie funciona porque le pasa a cualquiera, sea comercial o dentista. Un chiste sobre una herramienta ajena, no.
> - **El test antes de elegir referencia:** *¿el problema del que se ríe le pasa a cualquier persona, o solo a alguien de ese oficio?* Si es lo segundo, el puente a ventas te va a costar siete iteraciones y va a quedar forzado.
>
> **⚠️ Y las dos cosas que arreglamos al resubir van juntas y no se pueden separar:** cuenta **verificada** y fichero **limpio** (caricatura a resolución completa en vez de foto de IA degradada). Cambiamos las dos a la vez, así que no sabemos cuál pesaba. **Ojo con el dato que descarta la explicación fácil: el meme del 22/07 también hizo 345 impresiones y ese no llevaba ninguna IA**, era un montaje a mano, pero sí iba degradado y con la cuenta sin verificar. Ver la cuarentena de `images §0`.
>
> ### ©️ 4.4-CREDITO · SI LA REFERENCIA ES ESPAÑOLA Y DE VENTAS, SE ACREDITA (Iker, 2026-07-29)
> **⚠️ UNIVERSAL, no solo del meme.** Si remixamos a un espanol del sector ventas, se le menciona, sea el pilar que sea. En el validador se activa solo con `--pilar meme`; para los demas pilares se pasa `--remix`.
> **Qué pasó.** El meme del tatuaje hizo casi 30.000 impresiones en menos de una hora, **y el autor original lo vio**. Bloqueó la cuenta de Unai. **Bloquear es el aviso barato: el caro es un reporte por copia.** Mismo patrón que el "Andalucía es más grande que Italia", que también nos costó insultos y también acabó en una regla dura del runbook del mapa.
>
> **⚠️ "ESPAÑOLA" ES EL IDIOMA DEL TEXTO, NO LA NACIONALIDAD DEL AUTOR (Iker, 2026-07-30).** Yo descarte acreditar a un autor "porque era frances" y **eso no es el criterio**: lo que decide es **en que idioma esta escrito el post**. Un post en ingles no lo va a ver nuestra audiencia aunque su autor viva en Bilbao, y uno en español lo van a ver todos aunque el autor sea de Buenos Aires. **Mira el idioma del texto y nada mas.**
>
> **La regla.** Si la referencia que calcamos es **ESPAÑOLA Y del sector de VENTAS**, va **una línea suelta en el cuerpo mencionando al autor con @**. Ese es justo el caso en el que el autor comparte audiencia con nosotros y va a verlo. Si la referencia es de fuera o de otro sector, no hace falta (el validador acepta `--referencia-fuera` para dejarlo por escrito).
>
> **⭐ Y el arreglo de verdad no es el crédito, es la MENCIÓN.** La diferencia entre que el autor se sienta copiado y que se sienta citado **es la notificación**. Un creador al que le llega un aviso de que has partido de su idea suele comentar o compartir, porque le confirma que su chiste funciona. A Félix se lo hicimos a su espalda, y por eso lo vivió como un robo. **Menciónalo con @, no lo nombres en texto plano.**
>
> **DÓNDE VA, que es lo delicado:**
> - **NUNCA en el gancho ni justo después.** Ahí matas el chiste antes de contarlo: el lector aún no se ha reído y ya le has dicho que no es tuyo.
> - **NUNCA de última línea.** Se come el bold statement del cierre, que es lo que da la fuerza final.
> - **VA EN MEDIO, después de que el chiste haya aterrizado y ANTES del spam ninja.** Para entonces el lector ya se ha reído y el crédito se lee como clase, no como disculpa.
>
> **Cómo se escribe:** con naturalidad y sin sonar a nota legal. *"Esto se lo vi a @Nombre y me lo he traído a mi terreno."* Nada de "créditos a" ni "fuente:". **Y que no nos reste**: no vale *"lo contó mucho mejor @Nombre"*.
>
> **Dónde está la frontera con otros pilares:** se acredita cuando lo que calcamos es **RECONOCIBLE como suyo** (el chiste concreto, la imagen concreta). Una mecánica genérica que usa medio LinkedIn (la escalera de calvicie, el wojak, un antes/después) no tiene autor identificable y no se acredita. El lead magnet calca **estructura**, no una pieza reconocible, así que tampoco.
>
> **Mecanizado:** `validar-post.py --pilar meme` **falla** si no encuentra línea de crédito, salvo que se pase `--referencia-fuera`. Y si la encuentra, comprueba **que no esté ni en las 2 primeras líneas ni en la última**.
>
> ### 🚫🚫 4.4-STOP · MEME CONTROVERSIAL EN UNAI: PROHIBIDO (Iker, 2026-07-29)
>
> **Lo de arriba ya estaba escrito y aun así recomendé el meme del tatuaje para Unai. Pasó lo que tenía que pasar.** El meme se viralizó (14.000 impresiones en horas) **y un directivo nos insultó CON SU NOMBRE REAL**, porque se creyó que el tatuaje era de verdad. Unai es el **FUNDADOR y CEO**: firma la casa, y lo que le llega a él no se borra con un buen ratio.
>
> **Deja de ser criterio y pasa a ser un bloqueo:** `validar-post.py --pilar meme --cuenta unai` **FALLA siempre** salvo que se pase `--meme-sobrio`. El flag no se pasa por inercia: se pasa después de contestar que NO a las cinco preguntas de abajo.
>
> **Un meme es CONTROVERSIAL si CUALQUIERA de estas es que sí:**
> 1. **¿El chiste depende de que alguien se crea que pasó de verdad?** (el tatuaje: sí, y ahí estuvo el insulto)
> 2. ¿Hay un acto ridículo o humillante atribuido a quien publica?
> 3. ¿Alguien podría respondernos enfadado por habérselo creído?
> 4. ¿Hay tacos, escatología, sexo, política o religión?
> 5. ¿Se ríe de un colectivo?
>
> **La cascada, en este orden y sin saltársela:**
> - **Iker (2º) casi siempre.** Es la cuenta que aguanta el registro bruto.
> - **Asier (3º) si Iker ya tiene meme esa semana.** Ahí cuela.
> - **Unai: nunca.** Si el chiste solo funciona siendo controversial y ni Iker ni Asier pueden esa semana, **no se publica**. Se cambia el chiste o se espera. No se suaviza para meterlo en Unai, que eso ya lo probamos y dio 0,31x.
>
> **⚠️ Y el coste oculto del realismo:** `images §0a-sexta-bis` dice que en un pantallazo documental el realismo ES la credibilidad, y es verdad, **pero esa credibilidad tiene precio**: cuanto más se lo cree la gente, más real es el enfado del que se lo cree. Ese precio lo paga la persona que firma el post. **Cuanto más creíble sea el montaje, más lejos tiene que estar de la cuenta de Unai.**
>
> **Y fuera del meme: cuidado con la REDACCIÓN de todo lo de Unai.** No es solo el pilar. Cualquier frase suya que se pueda leer como chulería, burla o exageración se revisa dos veces (`brand-voice §1b`: tiene que sonar como el director industrial de ~50 años que nos lee, y que le vea como un igual).
>
> #### ✅ EL PRIMER CASO DE LA CASCADA FUNCIONANDO AL DERECHO (Iker, 2026-08-13)
> **Todos los ejemplos de aquí arriba son fracasos**: el tatuaje que le costó un insulto con nombre real a Unai, y el *"I just shit my pants"* limado para que cupiera en su cuenta, que se quedó en 0,31x. Faltaba el caso contrario, que es el que enseña a ELEGIR bien desde el principio.
> **El meme del 14/08** (SpongeBob progresivo, remate *"salir con la hija del cliente para conseguir la reunión"*) se eligió para **Iker** sabiendo que el remate iba a levantar comentarios. Iker, viendo la imagen montada: *"este meme es bastante peligroso si se hubiese subido en el primer jefe o el tercero, va a generar mucha controversia. Pero como es para el segundo, perfecto: no se va a quejar aunque le insulten, no es tan exquisito"*.
> - **Lo que confirma:** el filtro de controversia se aplica al ELEGIR LA REFERENCIA, no al redactar. El chiste llegó entero a la cuenta que lo aguanta, sin suavizar nada, que es justo lo que falló con el 0,31x.
> - **Y para MEDIRLO:** en un meme colocado a propósito en la cuenta de Iker, **los comentarios enfadados no son una señal de fracaso**, son el motor esperado. Lo que se mira es alcance y reposts, no el tono de los comentarios.

> **Input del usuario:** SIEMPRE un **enlace a un post-meme de LinkedIn** de referencia (un caso de éxito). **Si no te lo pasa, PÍDESELO por chat antes de nada.**
>
> ⛔ **Y SI TE LA PASA ÉL, TAMBIÉN SE MIDE (Iker, 2026-09-16).** El 15/09 Iker trajo un meme que le había pasado el jefe: el paseador de perros de Kevin Meyer, con **10% de risa, ~68 risas absolutas**, además patrocinado (`#FullEnrichPartner`) y con el ángulo de apilar herramientas ya gastado (165.526 en Unai y 345 en Asier). Se dijo que no con esos números, **se buscó otra sin parar el turno** (Luke Ross, 40% de risa, ~305 risas, gancho con `cold calls`, del carril de Iker) y se entregó el post entero sobre ella. Iker: *"me ha gustado bastante tu decisión"*. **Que la referencia venga de arriba no la exime de ningún filtro, y si falla, el entregable es el post con la alternativa, no una pregunta.**
>
> 🔴 **NUNCA propongas un meme sin referencia real validada (Iker, 2026-07-22).** Un formato de meme genérico "que funciona en internet" (distracted boyfriend, midwit, drake…) **NO vale**: si no está validado como OUTLIER en un post real de LinkedIn (nuestro o de otro creador), no es un dato, es una apuesta, y no nos la jugamos. **Todo meme que entregues lleva el ENLACE al post de referencia y su ratio.** Si no encuentras una referencia real potente (p.ej. el banco de inspiración no tiene un meme de ventas fuerte), **DILO y pídele una a Iker** — no rellenes con un template genérico. "Siempre subimos cosas basadas en datos."
> - 🔴 **PISO DURO: la referencia necesita ≥100 likes (Iker, 2026-07-23).** El meme del Aquaman (Asier, 22/07) se remixó de una referencia de **80 likes** y flopeó. Regla de Iker validada en su cuenta: **con ~100 likes el post suele tener miles de impresiones** (en memes la interacción es baja, así que 100 likes = mucho alcance). **Menos de 100 likes NO se coge, por buena que parezca la plantilla.** El FIT (dolor psicológico, de ventas, no infantil, sin usar) manda sobre el nº de likes en el desempate, pero el piso de 100 no se salta.
> - 🔎 **DÓNDE BUSCAR cuando nuestra BD ya no tiene memes sin usar (los mejores ya se hicieron):** **Unipile posts-search.** `POST {BASE}/api/v1/linkedin/search?account_id=…` con `{"api":"classic","category":"posts","keywords":"…","limit":50}` (pagina con `cursor`). Devuelve `reaction_counter` (likes), `repost_counter`, `comment_counter`, `share_url`, `text` y `attachments` (la imagen). Filtra `reaction_counter>=100` + adjunto imagen. **Mejor que keywords sueltas:** ir a las **cuentas fábrica de memes** (ej. `corporatedudes`, creadores de memes de ventas) vía `GET /users/{provider_id}/posts` y filtrar su feed — el keyword-search sobre el TEXTO se pierde los memes visuales (llevan poco texto). **Descarga la imagen y MÍRALA** antes de elegir: el texto no te dice si es una plantilla limpia o un carrusel de consejos.
> - 🤣 **EL FILTRO QUE DICE SI ES UN MEME DE VERDAD: la reacción de RISA disparada (Iker, 2026-07-23).** No hay patrón en el texto ni en la foto; **el patrón es que un meme tiene la reacción de risa petada** en vez de "me gusta" normal. Se mide: `GET {BASE}/api/v1/posts/{social_id}/reactions?account_id=…&limit=100` (⚠️ el máximo es **100**; pedir 120 devuelve vacío) → cuenta los `value === 'ENTERTAINMENT'` sobre el total de la muestra. **Un meme de verdad tiene 25-56% de risa; un post de consejo/infografía tiene ~0%.** Rankea los candidatos por ese %, no por likes. Caso: el diagrama de zigzag que elegí primero (Noam) NO era un meme (0% risa, era un carrusel de consejos disfrazado); el traductor de LinkedIn de corporatedudes sí (45% risa). **Si dudas de si algo es meme, mira el % de risa antes de proponerlo.**
> - 😂📏 **EL PORCENTAJE DE RISA SE LEE EN ABSOLUTO, NO SOLO EN PORCENTAJE (Iker, 2026-08-18).** *"Cuanto más porcentaje de risa tenga la referencia mejor, obviamente que esté equilibrado el engagement: no nos sirve de nada un altísimo porcentaje de risas y luego la publicación solo tiene cien risas"*. La vara de comparación entre candidatas es **risas absolutas ≈ % de `ENTERTAINMENT` × reacciones totales**, y a igualdad, gana el que más reposts tiene (es la métrica que más reparte). El % solo sirve para separar un meme de un post de consejo (el suelo del 25%); **para elegir entre memes, manda el producto**. Caso del 18/08 en la cantera de CS: el `hello????????` (2.826 × 29% ≈ 819 risas, 53 reposts) empata en risas absolutas con el del tamaño de letra (1.793 × 49% ≈ 879, 25 reposts) y le dobla en reposts, así que gana aunque su porcentaje sea la mitad. Y la Dora calva, con el % más alto de la tanda (56%), queda a la mitad en absoluto (983 × 56% ≈ 550).
> - 🌍 **El meme NO tiene que ser DE ventas; tiene que ser VIRAL + dolor psicológico (Iker, 2026-07-23).** El dolor psicológico es UNIVERSAL (los calvos, el ridículo, la autodelusión, el pavor a que te pillen) y a ventas lo adaptamos NOSOTROS en el texto y la imagen. NO descartes un meme buenísimo por no ser "sales-native" — eso es sobre-filtrar (me pasó: rechacé memes de corporatedudes por "no ser de ventas"). Lo que importa: risa alta + dolor humano reconocible + que se pueda anclar a ventas al remixar. El de "los calvos" funcionó justo así: calvicie = dolor psicológico social, y encima resulta que en ventas también quema.
> - ♻️ **UN CONCEPTO QUEMADO COMO PROPUESTA NO está quemado como CHISTE (Iker, 2026-07-23).** El "traductor" flopeó como LEAD MAGNET (*"traduzco comentarios"* 0.43x, `global §2` flops): ahí el traductor ERA la propuesta de valor y no valía nada. Pero como MEME el traductor es el CHISTE (la autodelusión de maquillar el parte), y lo que vendemos en el spam ninja es otra cosa ("a quién llamar y cuándo"). Antes de reusar un concepto, mira en qué PAPEL cayó: quemado como propuesta ≠ quemado como broma. Lo que NO se hace: presentar el traductor como si fuera lo que ofrece Neety.
> - 📐 **FIDELIDAD > "corto y punchy" (Iker, 2026-07-23).** "Corto y conciso" es NUESTRO default, pero **manda la estructura del original** (`§4.4` Paso 3, "longitud: la del original"). Si la referencia lleva lista de flechas + lista numerada, el remix las lleva; si es un traductor de dos cajas, el remix es un traductor de dos cajas. Me pasó: cogí una referencia larga (flechas + numerada) y entregué un cuerpo corto "porque lo nuestro es corto" — mal, eso es escribir otro post, no calcar. Primero calca la estructura del original, LUEGO mejora el punch dentro de esa estructura.
> - 💥 **EN MEMES DE "GAP", LA ESENCIA ES EL TAMAÑO DEL SALTO, NO EL MOLDE (Iker, 2026-07-23).** Traductor, antes/después, expectativa vs realidad, "lo que digo / lo que quiero decir"… el motor es el CONTRASTE, y el contraste lo da lo CRUDO/absurdo/bestia del lado "real". El traductor original ponía una barbaridad (*"I just shit my pants"*) para que el salto a la versión LinkedIn fuera brutal. Yo puse *"El cliente me dijo que no"* — demasiado suave, un "no" ya esperas que se maquille, y el chiste se desinfla. **Calca ese REGISTRO: pon lo más crudo/humillante que la voz de la cuenta aguante** (un founder no suelta el taco literal, pero sí "el cliente me colgó a la cara" o "llevo 4 meses sin cerrar un pedido"). Cuanto más patética/real la entrada, más gordo el salto y más gracia. No suavices el input.
> - ⏳ **CALCA HASTA EL TIEMPO VERBAL (Iker, 2026-07-23).** La esencia incluye el TIEMPO del verbo (`§2.9b`). El traductor original va en FUTURO (*"this is GOING TO BE a million dollar business"*) y yo lo puse en presente (*"Esto factura millones"*) — mal. Corregido a futuro: *"Esto VA A FACTURAR millones"*. Si el original promete (futuro), tú prometes; si constata (presente), tú constatas. El tiempo verbal cambia el tono tanto como el verbo.
> **⚠️ PREGUNTA TAMBIÉN PARA QUÉ CUENTA ES, y hazlo ANTES de elegir la referencia** (`brand-voice §1b` · `images §0g`). **Son dos cajones:**
> - **Unai y Asier** → meme **inteligente, para industriales, inequívocamente de ventas y NUNCA infantil**. Ni dibujos de animales ni caricaturas monas. No es que no puedan llevar meme (el mejor post de Unai, 16.62x, ES un meme: el wojak); es que el wojak es feo y un border collie dibujado es mono.
> - **Iker** → **cualquier meme outlier**, con la condición de siempre: adaptado a ventas (`global §2.3`). Sin restricción extra.
>
> Si la referencia es buenísima pero su imagen es tierna, **va a Iker**. Cambiar de cuenta es gratis; forzar el registro, no. Y ojo: **"específico de ventas" no es "de nicho"** — `global §2.4` sigue mandando y un meme que solo pilla el 1% no viaja en ninguna cuenta.
> **Output final:** (1) el **TEXTO** del post copy-ready + (2) un **PROMPT de modificaciones para la foto** (Claude **NO genera la imagen**; el usuario la edita a partir de la referencia).
> **Prioridad:** la FOTO es el motor. El texto (gancho + cuerpo) va **corto**.

> ## ⚖️ QUÉ SE CALCA Y QUÉ NO (leer antes del Paso 0)
> "Fiel a la referencia" **no** significa copiarlo todo. Se calca la **ESENCIA**; el **formateado siempre es nuestro**. Si ser fiel te obliga a romper nuestras reglas, **ganan las nuestras** (es la regla de oro de §0: las skills de datos mandan sobre este archivo).
>
> | Se calca A MUERTE (es el motor) | Manda SIEMPRE lo nuestro (es el envase) |
> |---|---|
> | La **mecánica del GANCHO** (Paso 2) | **Formateado:** bloques de 2/3, línea individual detrás, líneas cortas, el cierre respira (`global §3.2-§3.3`) |
> | La **IMAGEN**: layout, paneles, estilo de dibujo, mecánica cómica (Paso 6) | **Puntuación anti-IA:** cero guion largo, cero coma antes de "y" (`brand-voice §3`) |
> | La **temática y el esqueleto del cuerpo**: sus etiquetas, su orden (Paso 3) | **Ancla de ventas** y **verbo con techo** (`global §2.3`, `§2.9`) |
> | La **emoción**: contraste, curiosidad, reto (`outliers-database §3.9c` Paso 5) | **Spam ninja** (`global §4.4b`) y la jerga vetada del hook |
>
> **El caso real (2026-07-14):** la referencia del meme del perro venía **sin un solo salto de línea**, ocho líneas seguidas de corrido. Calcarla al pie de la letra habría sido entregar un parrafazo ilegible. Se calcó su esqueleto (`Realidad: / LinkedIn: / Traducción: / Pero hey… / PD:`) y se le metieron **nuestros** saltos: el bloque de etiquetas junto (es enumeración paralela, `§3.3` unidad c) y aire entre secciones.
>
> **La pregunta que lo resuelve siempre:** ¿esto que estoy copiando es lo que hizo volar al post, o es solo cómo lo tecleó su autor? Lo primero se calca. Lo segundo, ni de broma.
>
> ## EL ORDEN IMPORTA: PRIMERO CALCAR, DESPUES MEJORAR (Iker, 2026-07-20)
> **Calcar un outlier no es la meta, es el suelo.** El objetivo minimo es estar a la altura del original; si se puede mejorar, se mejora. Pero **en ese orden**: primero se calca la mecanica entera (gancho, imagen, esqueleto del cuerpo), y solo entonces se pasa el envase por nuestras reglas.
>
> **Los BLOQUES DE DOS tambien aplican al meme.** El 20-jul se entrego un meme con todo el cuerpo en lineas sueltas porque la referencia iba asi. Mal: el formateado es nuestro (`global §3.2`). Al meterle un bloque de dos en las lineas de Ferran Torres, la anafora ("El que fallaba los faciles / El que se comia las criticas") gano un ritmo que en linea corrida se perdia.
>
> **⚠️ Con una condicion: solo si MEJORA.** No metas un bloque de dos por cumplir. La enumeracion paralela (la escalera de 6 roles) es una unidad y se queda junta. Si partir algo lo hace mas pesado en vez de mas ritmico, no lo partas.
>
> **⭐ MEJORAR = VERBOS PUNCHY Y SIN REPETIR (Iker, 2026-07-23).** Calcar y adaptar a ventas es el suelo; el plus es que el resultado sea MÁS punchy que el original. Dos fallos que lo tiran: (1) **verbo flojo** (`global §2.9`, escalera y techo) — sube el verbo un peldaño; (2) **repetir el mismo verbo** en el hook. Ej. real que se rechazó: hook *"Te venden que vender es mandar la oferta y cerrar"* — `venden`+`vender` pegados, queda fatal. Arreglado: *"Te pintan la venta como una línea recta"* (`pintan` punchy, un solo `venta`, y encima monta la imagen del zigzag). Antes de entregar el hook, léelo en alto: si un verbo se repite o suena plano, otra pasada.
>
> **Y el cierre punchy es SIEMPRE una linea.** Dos oraciones largas al final diluyen el remate: un cierre no admite explicacion detras.

**Paso 0 — Conseguir la referencia:** accede al enlace y extrae (a) el **TEXTO** del post (gancho/1ª línea + cuerpo) y (b) la **FOTO**.

**⛔ PASO 0 — ¿ESTE TEMA YA LO HAN HECHO DOS CUENTAS DE VENTAS? ENTONCES ESTÁ QUEMADO (medido el 2026-08-05).** El lead magnet de Iker del 28/07 hizo **2.837 impresiones (0.82x)** siendo **el cuarto de nuestro sector en subir el mismo recurso**.
- **Y el dato que señala dónde estuvo el fallo:** sacó **31 comentarios sobre 23 likes**, más comentarios que likes. **El gate funcionó perfectamente.** Lo que no llegó fue la gente. O sea que **no fue la receta, fue el tema**: la mejoramos mucho y dio igual.
- **Por qué mata:** el lead magnet vive de que el lector quiera ESE recurso. Si ya lo ha visto pedir tres veces en su feed, **ya lo tiene o ya decidió que no lo quiere**. Un gancho mejor no arregla eso.
- **Comprobación obligatoria antes de elegir tema:** cruzar contra el banco de outliers de competencia (`/api/analysis/cross-creators`). **Si dos o más cuentas de ventas ya lo han hecho, se cambia de tema**, por muy validado que esté. Estar validado y estar quemado son la misma cosa vista con un mes de diferencia.

**Paso 1 — Traducir (si está en inglés, que es lo habitual):** EN→ES **fiel al original** en formato, longitud y estructura, pero con **expresiones naturales en español** donde suenen mejor (no traducción literal robótica).

> ### ⛔⛔ 4.4-PASO-1-LITERAL · LA TRADUCCIÓN SE ESCRIBE, Y SE ESCRIBE ANTES DE ADAPTAR NADA. TAMBIÉN LA DEL TEXTO DE DENTRO DE LA IMAGEN (Mario, 2026-08-26)
>
> > **Iker, y es el orden entero de la receta dicho por él:** *"los pasos a seguir ya te los expliqué: encontramos una referencia que sea de ventas, de meme y adecuada para el tipo de jefe. Luego, lo traducimos al español tal cual. Luego aplicamos todo lo que sabemos de formateado, de verbos, de palabras, de longitudes, de ritmo y de spam. Y luego me lo devuelves, iterando todo lo posible"*.
>
> **Lo que hacía mal: me saltaba el paso 2 y pasaba del inglés directo a "mi versión".** Y sin la traducción delante, lo que sale no es una adaptación, es **el equivalente** — que es justo lo que `§4.4-ESENCIA` lleva prohibido desde julio y que sigo cometiendo. Iker, sobre la v2: *"¿estás seguro de que **me pidieron cuentas** significa lo mismo que **has actualizado el CRM**?"*. No lo significa, y solo se ve poniendo las dos frases una debajo de otra.
>
> **LAS TRES REGLAS DEL PASO:**
> 1. **Se escribe, no se piensa.** La traducción literal va en un bloque, en la entrega, para que se pueda comparar palabra por palabra. Si no está escrita, no se ha hecho.
> 2. **⭐ Se traduce TAMBIÉN el texto que va DENTRO de la imagen**, que es donde vive el chiste en la mitad de los memes. Aquí ponía "traducir el post" y por eso lo saltaba: el post de la referencia era un listículo y el gag estaba en la foto.
> 3. **Y en la traducción NO se adapta nada todavía.** Ni el ancla de ventas, ni el verbo punchy, ni la longitud. Eso es el paso 3. Mezclarlos es lo que produce el equivalente.
>
> **El único cambio que SÍ entra en la traducción es la palabra vetada por AUDIENCIA**, y entra como traducción llana, no como concepto nuevo: `CRM` → `la ficha del cliente` (`global §2.3-CRM`), no `el parte de ventas`, que es otra cosa.
>
> **EL TEST, y es el que Iker aplicó:** coge la frase del original y la tuya, ponlas una debajo de otra y pregunta **si significan lo mismo**. No si suenan parecido ni si van del mismo tema: **lo mismo**.
>
> ```
> Did you update the CRM?        →  ¿Has actualizado la ficha del cliente?   ✅ significa lo mismo
> Did you update the CRM?        →  Me pidieron cuentas                      ⛔ es OTRA frase
> ```
>
> #### ⛔⛔ 4.4-PASO-1-VERBO · EL VERBO DEL ORIGINAL ES EL SUELO DE LA ESCALERA, NO EL PUNTO DE PARTIDA LIBRE (Mario, 2026-08-26)
>
> > **Iker, sobre la v3:** *"el texto original dice ¿actualizaste el CRM? Entonces, ¿por qué me pones el verbo preguntar? Si tiene que ser actualizar. Preguntar lo entendería si fuese un verbo más punchy que actualizar, pero es que preguntar es un verbo muy blando"*.
>
> **La regla, y encaja las dos que parecían chocar** (`§4.4-ESENCIA`, copia palabra por palabra · `§2.9`, mejora el verbo): **el verbo del original SE MANTIENE por defecto. Solo se cambia SUBIENDO la escalera, nunca bajándola.** Si el recambio es más blando, es que estaba parafraseando, no mejorando.
>
> ```
> update  →  actualizar   ✅ el suyo, calcado
> update  →  rellenar     ✅ si algún día se demuestra más punchy
> update  →  preguntar    ⛔ más blando Y encima es otro verbo, el de la pregunta y no el de la acción
> ```
>
> **⛔ Y NO ES SOLO EL VERBO: vale para CUALQUIER palabra literal del original, y ahí estaba el segundo caso del mismo post.** El original responde `YES` y yo escribí `media respuesta`, que es **mi descripción de su `YES`**, no su `YES`. La palabra que dice el original se dice, y el matiz nuestro se añade **al lado**, nunca en su lugar: `solté un sí` conserva la palabra y mete el verbo punchy encima.
>
> **EL CHEQUEO, que se hace en tabla y por escrito junto a la traducción del `§4.4-PASO-1-LITERAL`:** una fila por palabra cargada del original —el verbo, el objeto, la respuesta, el remate— con su traducción y con lo que puse yo. **Cualquier fila donde la tercera columna no contenga la segunda es una paráfrasis**, y hay que justificar por qué sube la escalera o volver a la palabra del original. En la v3 fallaban tres filas de seis; en la v4, cero.

**Paso 2 — HOOK: ⭐ CALCA LA MECÁNICA DEL GANCHO ORIGINAL, igual que calcas la foto.**
- **El gancho se roba con la misma fidelidad que la imagen.** Si calcas el layout de la foto pero te inventas un gancho nuevo, has tirado la mitad del outlier: el gancho original es parte del motor que lo hizo volar, no un envoltorio.
- **Método:** escribe en una frase QUÉ hace el gancho original (su mecánica), y reprodúcela. Ej. real: *"LinkedIn es mágico ✨"* = **afirmación corta, irónica, sobre la herramienta, que monta el marco sin destripar el chiste**. El remix mantiene esa mecánica (corta + irónica + sobre la herramienta) y cambia la piel a ventas: *"Tu CRM resucita clientes muertos ✨"*.
- **Mismo o mejor, nunca distinto.** "Mejor" = el verbo sube un peldaño (`global §2.9`) y se ancla a ventas (`§2.3`). "Distinto" = un gancho tuyo pegado a una foto ajena.
- ❌ **Fallo real (2026-07-14):** referencia con gancho *"LinkedIn es mágico ✨"* y el remix salió *"Tu cliente no te cogió el teléfono. El CRM lo asciende a oportunidad en fase avanzada 👇"*. Largo, específico, destripa el chiste que cuenta la foto y no se parece en nada al original. El validador dio 17/17 porque **esto el script no lo ve**: es criterio.
- **EL 👇 VA SIEMPRE, aunque la referencia no lo lleve** (corregido 2026-07-20 con datos, antes decia lo contrario).
  Aqui ponia que no se lo metieras a la fuerza si el original no lo tenia, citando "Subir en ventas siempre pasa factura." (13.51x) como validacion. **Generalizaba desde UN caso.** Mirando los 3 memes grandes de Iker:

  | Hook | lleva 👇 | Ratio |
  |---|---|---|
  | "El cold calling no ha muerto. Lo hemos enterrado en vida **👇**" | Si | **16.44x** |
  | "Esta es la vida del comercial **👇**" | Si | 8.45x |
  | "Subir en ventas siempre pasa factura." | No | 13.51x |

  **Dos de tres lo llevan, incluido el mejor.** Y hay un motivo mecanico: el 👇 marca el punto donde el lector decide pulsar "ver mas", justo antes del corte de la vista previa. El emoji es NUESTRA convencion y va en el envase, no en el motor: se calca la mecanica del gancho, no su puntuacion final.
- **Itera VERBOS** hasta el más punchy **sin perder el significado original** (escalera y techo: `global-instructions §2.9`).
- Aplica TODAS las reglas de hook (`global-instructions §2` + `swipe-file`): bloque único ≤210, imagen mental, ≤1 número, corto.
- **Ancla a VENTAS siempre**, aunque la referencia no vaya de ventas: desde el lado de vender, del cliente o del comercial. Amplifica el alcance al máximo sin perder la esencia de ventas.

**Paso 3 — CUERPO: fiel al original en ESTRUCTURA, no solo en tono.** Copia su esqueleto etiqueta por etiqueta y cambia solo el contenido. Ej. real: si el original va `Realidad: / LinkedIn: / Traducción: / Pero hey… / PD:`, el remix va `Realidad: / CRM: / Traducción: / Pero oye… / PD:`. **Escribir un cuerpo propio "en el mismo espíritu" NO es calcar: es otro post.**

> ### ⛔⛔ 4.4-CORTO · LA LONGITUD DEL ORIGINAL NO SE CALCA NUNCA. EL CUERPO DEL MEME ES CORTO (Iker, 2026-08-13)
> **HARDCODE DEL PILAR, y sustituye a lo que ponía aquí** (*"longitud: la del original; si la referencia tiene 10 líneas cortas, el remix tiene 10 líneas cortas"*) y al bullet de `FIDELIDAD > corto y punchy` de más arriba, **solo en lo que toca a la LONGITUD**. Todo lo demás de la fidelidad sigue igual: la idea, el gancho, el esqueleto, el tiempo verbal y la mecánica de la imagen se calcan a muerte.
>
> Iker: *"me da igual cómo sea la referencia a nivel de longitud. Igual que cuando la referencia solo tiene una línea tú copias la esencia y aun así me haces gancho y cuerpo, en el caso contrario haz lo mismo: aunque la referencia sea larguísima, el cuerpo lo quiero corto"*. **Es simétrico y por eso es fácil de recordar: la longitud la ponemos nosotros, en los dos sentidos.**
>
> **📊 MEDIDO EL 13/08 sobre los 59 memes de las 3 cuentas con más de 500 impresiones**, que es lo que faltaba para que esto dejara de ser una intuición:
>
> | longitud del cuerpo | n | mediana de impresiones |
> |---|---|---|
> | **≤450 caracteres** | 18 | **11.602** |
> | 451-700 | 22 | 3.760 |
> | >700 | 19 | 4.745 |
>
> - **Los cortos alcanzan unas 3 veces más**, y los **siete memes más vistos del histórico** (168.926 · 138.828 · 93.744 · 89.320 · 86.815 · 60.443 · 44.997) **están todos por debajo de 450 caracteres**.
> - ⚠️ **Y el matiz honesto, porque hay excepciones reales:** el likes/impresión sale MÁS ALTO en los largos (1,25% contra 0,38%), pero eso es el artefacto de siempre — a más alcance, menos ratio de interacción —, no una virtud del cuerpo largo. Y hay tres largos que sí volaron (817, 886 y 1.085 car). **La tendencia central manda, la excepción se decide a mano.**
> - **El segundo motivo, y es de Iker: diferenciar el pilar.** Un meme largo se parece a un lead magnet o a una historia. El meme se reconoce de un vistazo por ser corto.
>
> **Objetivo: ≤450 caracteres.** Mecanizado en `validar-post.py --pilar meme`: **aviso pasando de 450** (con las medianas delante) y **fallo duro pasando de 700**, que es la zona donde además el spam ninja se cae por debajo del carácter 650 y el CTR se hunde (`§4.4b-CLICS`).
- Adaptado a ventas B2B (`§2.3`), pero sin destripar el chiste que cuenta la foto: el texto monta el marco, la foto remata.
- **Roles de trabajadores:** sin anglicismos ni títulos complejos. Español genérico que un **industrial de 50+ entienda** (comercial, jefe de ventas, director comercial, gerente…) — lo más genérico = más alcance. (Mismo criterio en la foto, Paso 6.)

**Paso 3b — SI EL MEME VA DE ACTUALIDAD, DOS COSAS OBLIGATORIAS** (Iker, 2026-07-20):
1. **DESVELA a la persona o la referencia dentro del cuerpo.** Si el hook usa un apodo, una cara o un guiño ("el tiburon"), **siempre habra alguien que no lo pille**, y ese se va. Una linea basta, y encima puede hacer doble trabajo: *"Ferran Torres. El que fallaba los faciles."* resuelve quien es Y monta la historia.
2. **Robale al peloteo regional su cliche de orgullo** cuando el tema lo permita. El mecanismo del mapa (*"toro, txistorra y poco mas"* → giro) funciona igual aqui: *"Nos ven como siesta y sangria. Y la estrella la mete el que todos daban por amortizado."* Ojo, solo si hay paralelismo real — ahi lo habia (a España la infravaloran, a el tambien). Forzado queda pegote.

**Paso 4 — SPAM NINJA:** reglas canónicas en **`global-instructions §4.4b`** (mándalas siempre). Máx **2 líneas CORTAS**, **NUNCA nombrar a Neety**, chiste con **verbo punchy con techo** que gira el concepto del hook, dolor concreto + diferenciador aterrizado (`aboutme §1b`) **y el dolor sacado del banco de `global §4.4b-MUNICIÓN`, que además lista lo que el ninja NO puede prometer** (automatismo, volumen, la señal: cada una es una objeción medida en el informe de demos), nunca última línea. Aquí no hay menciones, así que va en el punto más natural del cuerpo — y ojo: el cuerpo del meme es de 3-6 líneas, así que el spam ninja **no puede comerse el post**. Validado: el iMessage "El de Ventas" (7.9x · 80.9K) llevaba link de agendar en spam ninja sin matar alcance.

> ⛔⛔ **DÓNDE VA, EXACTAMENTE: ANTES DEL CARÁCTER 650** (medido en clics, 2026-08-10).
> "El punto más natural del cuerpo" era demasiado vago y nos costó el mejor meme del año.
> El del 06/08 sacó **77.006 impresiones, récord de reposts — y 13 clics: 0,017%**, el peor
> CTR del año. Su enlace estaba en el carácter **707**. De los 6 memes con dato, los 4 que
> lo ponen antes del **511** dan 0,050-0,151%; los 2 que pasan de 650 dan 0,042% y 0,017%,
> y son los dos cuerpos más largos. Está en el validador.
>
> ⚠️ **Y AQUÍ SE CORRIGE EL "3-6 LÍNEAS" DE ARRIBA.** El cuerpo del 06/08 ocupa 816
> caracteres, muy por encima de esas 3-6 líneas, **y es nuestro mejor meme del año en
> engagement** (0,54% lk/imp, 31 reposts, récord de la tabla). El cuerpo largo, cuando sale
> de la referencia, **funciona**. Lo que no funciona es dejar el ninja al final de él.
>
> **Entonces: cuerpo largo → el ninja SUBE.** No se acorta el post para que quepa el ninja
> al final; se mete el ninja hacia la mitad y el cuerpo sigue hasta el punchline. En un
> meme de 800 caracteres eso es aproximadamente **tras el segundo bloque**, no tras el
> último. El lector que va a hacer clic ya se ha reído a esa altura; el que llega al final
> ya ha decidido que no.
>
> **Y cómo se escribe ese bloque** (§4.4b-CLICS, las dos van al validador):
> - **Bloque de DOS: dolor arriba, promesa corta + enlace en la segunda línea.** Máximo
>   **80 caracteres sin contar la URL**. La de 0,415% ocupa 69; fusionarlo todo en una
>   línea larga (101 caracteres) baja a 0,172%.
> - **Promete IDENTIFICAR a la persona, no el momento.** *"Te marcamos quién va a comprar
>   y cuándo"* → 0,415%. *"De montar esa lista nos encargamos nosotros"* → 0,017%. Lo que
>   los clientes dijeron en reunión que compran es la identificación de empresa y persona.


**Paso 5 — Cierre + validación:** el post cierra con el **punchline del meme** (regla del UNO, sin apilar CTAs).

> **📬 EL SEGUNDO BLOQUE DE CORREO, EN MEME, ES OPCIONAL Y NO SE HARDCODEA (`global §4.4e-MEME`, Iker 2026-08-19).** Entra a veces, se decide post a post, y **los 450 caracteres del pilar se miden DESCONTANDO ese bloque**: el presupuesto es del chiste y la puerta nueva no se lo come. El tope duro de 700 sobre el total no se mueve. **Si el meme ya no cabe en 450 por sí solo, lo que sobra es cuerpo, no el bloque, y nunca se recorta el chiste para meter el segundo enlace.**

> **⛔ SI HAY SPAM NINJA, EL CIERRE NO PUEDE SER OTRO CTA** (Iker, 2026-07-20). Nada de "Etiqueta al compi que…" ni "Comenta X". Aunque `global §4.4b` diga que el spam ninja no consume la regla del UNO, **en la practica compite**: el lector que iba a clicar el enlace se va a comentar, y la prioridad es el clic. El cierre es un **bold statement de UNA linea**, y punto.
>
> ⚠️ **Tiene un coste y hay que saberlo:** la referencia de la calvicie hizo 13.51x cerrando con "Etiqueta al compi que ya empezo a mirar champus anticaida", y el etiquetado es motor de alcance en memes. Se cambia alcance por intencion **a proposito**, no por descuido. Corre el pase de validación (§8). **Output 1 = el TEXTO copy-ready.**

**Paso 6a — ⭐ INVENTARIO DE LA IMAGEN (antes de escribir una sola línea del prompt).**
> **El objetivo es UN prompt que salga a la primera, no una cadena de prompts de edición.** Cuando hacen falta 3 rondas, el fallo casi nunca es del diseñador: es que el primer prompt pedía mal las cosas.

Mira la foto **sola**, tapando el texto del post, y escribe en literal:
1. **¿Cuántos paneles / filas / columnas tiene?** → el remix lleva **EXACTAMENTE los mismos**. No es orientativo.
2. **¿Qué hay en cada panel y quién es?** (mismo par repetido, escalera de personas, antes/después…)
3. **¿La imagen lleva texto? ¿De quién y qué dice?** ¿Es diálogo, son etiquetas, es un titular?
4. **¿Qué NO lleva la imagen?** ← el más importante. Aquí es donde se cuela lo que solo estaba en el post.
5. **⭐ ¿DE QUIÉN es la identidad que sale dentro de la imagen?** ← pregunta nueva, ver el bloque de abajo.

### ⛔⛔ 4.4-IDENTIDAD · EN UN PANTALLAZO, DE QUIÉN ES LA CUENTA LO DECIDE EL ORIGINAL (Iker, 2026-08-13)

**La regla, corta: NUNCA ponemos nuestro propio nombre dentro del pantallazo, salvo que en el meme original el autor use el suyo.** Quién firma lo que se ve es **parte de la esencia** (`§4.4-ESENCIA`), igual que el tatuaje o los calvos, y se calca como todo lo demás.

**Qué pasó el 13/08.** La referencia era el pantallazo de un tuit que publicó **brendan short**, pero el tuit **era de conor brennan-burke**, otra persona. Yo leí los dos nombres, me sonaron parecidos y **di por hecho que era el mismo**, así que monté el prompt poniendo a **Unai** como autor del tuit. Iker: *"el que subió el meme se llama Brendan y la captura ponía Brennan, pero no es la misma persona; creo que eso te ha generado confusión"*. Costó un prompt de edición.

**Por qué importa y no es un detalle de forma:**
- **Cambia el mecanismo.** Un tuit ajeno se lee como *"mirad lo que ha dicho este"*, que es compartible. El mismo tuit con nuestra cara es **autobombo**, y el lector ya no lo reposta.
- **Y hacia dentro:** si la cuenta que firma es Unai, cualquier cosa que diga el pantallazo la firma **el CEO** (`§4.4-STOP`).

**LAS TRES SALIDAS, por orden:**
1. **El original usa a un TERCERO → nosotros usamos un tercero.** Y **qué clase de tercero lo decide el original**, no la comodidad:
   - **Si la cuenta del original es una PERSONA** (nombre propio, aunque sea un anónimo cualquiera) → la nuestra es **una persona ficticia**, con **el mismo sexo** que la del original y **nombre español de la tierra de la cuenta que publica** (vasco por defecto; valenciano en Helena y Mario). Detalle, listas de nombres y quemados en **`images §0a-septima-NOMBRES`**.
   - **Si la cuenta del original es una CUENTA-ROL, anónima o de parodia** (`IT Unprofessional`, `@it_unprofession`) → la nuestra también: nombre y `@` del mismo palo (`Cuota Trimestral` / `@cuotatrimestral`), que es el recurso que ya nos funcionó con el contacto *"El de Ventas"* del iMessage (8,46x).
   - **En los dos casos:** **avatar por defecto de la plataforma** (la silueta gris), cero cara y cero tick de verificado.
   > 🔴 **CORREGIDO EL 2026-08-18, y lo que había escrito aquí era mío.** Esta salida decía que el tercero *"no es una persona inventada con nombre y apellido: es una cuenta-ROL"*, siempre. **Iker lo tumba:** con el tuit de `emily june` puse `Cuenta Clave / @cuentaclave` y su respuesta fue *"pierde un poco de gracia, lo has hecho como si fuera corporativo"*. **Un chiste lo cuenta una persona; una cuenta corporativa lo enfría.** Y el precedente ya estaba a favor suyo y yo no lo miré: el correo del tatuaje (**93.744 impresiones**) usa **nombres de persona inventados** (Mikel, Iñaki), no una cuenta-rol.
   - ⚠️ **En los dos casos, antes de subir se comprueba que ese `@` no exista de verdad.** Un usuario que resulta ser de alguien es suplantación.
2. **El original usa su PROPIA cuenta → nosotros usamos la nuestra.** Es el caso del correo del tatuaje (93.744 imp): captura de ENVIADOS desde la cuenta de Unai, porque el original también era del propio autor.
3. **Si por lo que sea hay que poner una foto real nuestra**, el prompt pide **dejar el círculo del avatar vacío como placeholder** y la foto se pega a mano en el paso final desde el banco de fotos. Nunca se le pide al generador que dibuje una cara nuestra.

**Y el chequeo, en el inventario del Paso 6a:** antes de escribir el prompt, escribe en literal *"la cuenta del pantallazo es de X, y el que publica el meme es Y"*. **Si X e Y son la misma persona, la nuestra también; si son distintas, las nuestras también.** No se decide por comodidad ni porque el nombre suene parecido.

**⛔ LA TRAMPA QUE YA CAYÓ (2026-07-16): el texto del post y el texto de la imagen son DOS MITADES DISTINTAS. No se mezclan.**
> ⛔ **EL CRÉDITO SOLO SI LA REFERENCIA ES ESPAÑOLA Y DE VENTAS (Iker, 2026-08-11).**
> *"Como la referencia está en otro idioma, no hace falta darle créditos. Eso es solo
> cuando es una calca de ventas en español y nos van a pillar."* El crédito no es
> cortesía: es un **seguro**. Nació porque el autor del meme del tatuaje —español y del
> sector— vio la copia y bloqueó la cuenta de Unai. Con un autor de otro idioma y de
> otro mercado ese riesgo no existe, y la línea de "gracias a X" solo gasta un bloque
> del post. **En el validador es `--referencia-fuera`**, y ahora hay que pasarlo
> siempre que la referencia no sea española.

- La referencia (The Office, 8.57x) tenía **`Manager: / SDR: / AE:` en el TEXTO** del post y **diálogo puro en la IMAGEN** (`CALL THE PROSPECT.` → `I EMAILED THEM.`). **La foto no llevaba ni un rol.**
- El prompt salió pidiendo **6 filas con los roles como etiquetas**: conté los roles del TEXTO en vez de los paneles de la FOTO, y convertí un meme de diálogo en un gráfico de etiquetas. Costó 3 rondas de edición arreglarlo.
- **El reparto correcto, que es el que hace la referencia:** el **TEXTO** lleva la escalera de roles · la **IMAGEN** lleva el diálogo. Cada uno cuenta una mitad. Con los roles metidos en la foto, la imagen **repetía lo que ya decía el texto** y dejaba de aportar (es la misma regla que "el título no repite el hook", `images §0h`).
- **Regla de pulgar:** si algo lo sabes por haber leído el post y NO se ve en la foto, **no va en el prompt**.

**Si la imagen es un DIÁLOGO, se calca la mecánica del diálogo,** no solo el hecho de que hablen: el original **escala la MISMA frase** (`CALL THE PROSPECT.` / `CALL THEM.` / `CALL THEM!` / `JUST CALL THEM!!!`) mientras el otro se desinfla. El remix escala la misma frase (`¿El pedido está cerrado?` → `¡¡¿ESTÁ CERRADO O NO?!!`). Cambia la piel, nunca el mecanismo.

**⚠️ DE VERTICAL A 1:1 SE COMPRIME, y ahí se muere el motor.** Casi todas las referencias son verticales y nosotros publicamos 1:1 (`images §0b`), así que los paneles se aplastan. `global §4.3` exige que el cambio corporal sea **legible a tamaño miniatura**: si al reencuadrar la calvicie deja de verse, el post sale **sin motor**, con el chiste técnicamente dentro pero invisible en el feed. **Si el original es vertical y lleva cambio corporal, pídele explícitamente que ese cambio se note a simple vista** y dile de dónde sacar el espacio (quitar el footer libera alto: `images §0h`).

**Paso 6b — FOTO: PROMPT de modificaciones (NO generar la imagen).** Con el inventario delante, entrega **UN SOLO PÁRRAFO** con los cambios a aplicar sobre ella. Nada de listas ni de secciones: un párrafo, simple de leer y **lo más específico posible, para que el diseñador lo entienda a la primera**.

**Cómo se escribe el prompt (técnica validada por el usuario, funciona):**
- **⬛ SIEMPRE `en formato cuadrado 1:1`**, aunque la referencia sea vertical (`images §0b`). LinkedIn recorta arriba y abajo en el feed. 19 de 20 de nuestros outliers son 1:1. El formato es NUESTRO: se calca la esencia, no el encuadre.
- **UN párrafo, CORTO y en lenguaje llano.** Lo lee un diseñador que va a tardar en montarlo: cada frase de más le cuesta tiempo. Claro y corto bate a exhaustivo.
- **⭐ LA CONTENCION VA PARTIDA: ORDEN AL PRINCIPIO, PROHIBICIONES AL FINAL** (Iker, 2026-07-20).
  - **Abre** en MAYUSCULAS y con dos puntos: `SOLO HAZ LO QUE TE PIDO:`
  - **Cierra** en minusculas (solo la inicial en mayuscula), literal:
    `Deja todo lo demas intacto. No hagas nada que no te he pedido, ni toques colores ni suavices caras ni deformes.`
  - **Las mayusculas van solo en la apertura.** Gritar tambien el cierre reparte el enfasis entre dos sitios y ninguno destaca; en minusculas se lee como la coletilla que es, sin competir con la orden de entrada.
  - **Por que partido:** las herramientas de imagen pesan mas la ULTIMA instruccion. Metiendo "deja todo lo demas intacto" al principio, queda enterrada bajo los cambios que vienen despues; al final es lo ultimo que lee. Y agrupar ahi TODAS las prohibiciones (colores, caras, deformar) evita el goteo de "ah, y tampoco…" que alarga el prompt y se pierde.
- **Di "calca esta referencia".** Así, con esas palabras. Nada de "parte de la imagen de referencia y mantén el layout, los paneles, la línea divisoria…": eso es hablar complicado para decir "calca".
- **⛔ NUNCA enumeres lo que se queda igual.** Es el error que más engorda el prompt. el bloque de contencion del final **ya lo cubre entero**. Listar "los dos paneles, la línea divisoria, el fondo de papel, la etiqueta negra, el encuadre, el estilo de dibujo…" no añade precisión: añade ruido y esconde los cambios de verdad entre la paja.
- **Pide SOLO los cambios exactos**, numerados dentro del párrafo (1), (2), (3). Y en cada uno, solo lo que cambia: no repitas "con la misma pose, el mismo encuadre y el mismo tratamiento", que también es decir lo que NO cambia.
- **Las prohibiciones ya van todas en el bloque de cierre de arriba.** No las repartas por el prompt: las herramientas suelen clavar la primera fila y hacer lo que quieren en la ultima, asi que la contencion tiene que ser lo ultimo que lean.
- **La tipografía SOLO si la imagen lleva texto.** Si no lleva, no la menciones: le estás dando una instrucción sin objeto y la puede usar de excusa para añadir texto que nadie pidió.
- **Regla de pulgar:** si una frase describe algo que ya está en la referencia y no cambia, **bórrala**.
- **🎯 NUNCA le digas "céntralo"** (`images §0c`). Es un juicio y la herramienta no mide, mueve: falla siempre. Dale la operación: `aprovecha el espacio que tiene a la izquierda para que quede centrado`. Validado.
- **⭐ El objetivo es calcar Y MEJORAR** (`images §0d`). Los defectos del original **no se heredan**: encuadre alargado → 1:1, textos descentrados → colocados. Ser fiel no es ser fiel a sus fallos. Lo que no se toca es la mecánica, el sujeto y el estilo.
- **Textos (SOLO si la imagen lleva):** si van en inglés, traducirlos al español (adaptado a ventas si no lo estaba), con **nuestra tipografía** (Bricolage Grotesque títulos + Switzer cuerpo) y la **regla de la palabra naranja** (`images §4`). **Si la imagen no lleva texto, no menciones la tipografía.**
  - ⭐ **SIEMPRE que nombres las fuentes, di que le adjuntas los instaladores** (Iker, 2026-07-20). Literal: `Te adjunto los dos archivos instaladores de las fuentes.` Iker los manda con el prompt. Sin esa frase el diseñador tira de una fuente parecida que tenga a mano y la imagen sale con otra tipografía.
  - **Las 4 reglas del texto de la imagen están en `images §0h` y son de obligado cumplimiento:** (1) el **título de la imagen también se ancla a ventas** (el test de §2.3 no es solo del hook); (2) el título **no repite el hook**, es otra frase del mismo chiste; (3) **cero footer** aunque la referencia lo lleve, y cero logos; (4) se traduce **TODO**, incluidos los rincones (badges, botones, `Delivered`, `Send`), no solo las etiquetas grandes.
- **Roles en la imagen:** español genérico, sin anglicismos, entendibles por industrial 50+ (igual que el cuerpo).
- **Paleta + detalles de marca** (Brandbook 2026, `images §0a-ter`)**:** aplica **Mint claro `#ebfff6`** (fondo) · **Berenjena `#431b44`** (tinta) · **Naranja `#fe8238`** (highlight), y **añade detalles nuestros** (corbatas naranjas, patrones, siluetas, props en naranja…) — no solo recolorear.
- **Fidelidad al diseño original:** mantén el **estilo de dibujo** (minimalista→minimalista, recargado→recargado), el **layout, paneles, escena y mecánica cómica** de la referencia.
- **⛔ EL SUJETO NO SE CAMBIA. Es el motor, no el decorado.** Conserva el elemento y varía solo el detalle: si el original tiene un perro → **otro perro**; café → otro café; avión → otro avión; camión → otro camión, **nunca un gato**. Un perro nuevo con nuestros colores haciendo lo mismo. Punto.
  ❌ **Fallo real (2026-07-14):** referencia con un perro (1.307 likes, 96 reposts) y el prompt salió "el perro pasa a ser un COMERCIAL", razonando que había que anclar la imagen a ventas. **La gracia ERA el perro**; sin él no hay meme, hay una viñeta corporativa. El ancla de ventas se pone en el TEXTO (el del post y el de la imagen), nunca cambiando el sujeto.
  **La regla de "roles en español genérico" NO es permiso para sustituir al protagonista**: aplica cuando el original YA tiene roles, no para meterlos donde no los había.
- **Objetivo:** replicar el caso de éxito del original, **misma esencia**, remix a nuestro sector + Neety. (Sistema visual completo en `images §5-B` y `§6`.)

**Sanity check (antes de entregar):** ¿la referencia tiene un motor que transfiere a ventas (filtro de 4 puntos, `global-instructions §4.3`)? Si el meme no puede anclarse a ventas o pierde la gracia al remixarlo, dilo en vez de forzarlo.

**OUTPUT FINAL (SOLO esto):** (1) el **TEXTO** del post en bloque cercado · (2) el **PROMPT de modificaciones de la foto**. Sin CSV ni menciones (eso es del mapa).

### 4.5 · Runbook LEAD MAGNET (comment-gated) — RECETA DEFINITIVA

#### ⛔ 4.5.-3 · POR DÓNDE SE ENTREGA EL RECURSO: YA NO AGREGAMOS A NADIE (Iker, 2026-08-17)

**LA REGLA DE HOY. La herramienta no manda invitaciones ni InMails. La solicitud la manda ELLA.** Tres canales, los tres gratis, y se eligen en este orden:

1. **1er grado** → mensaje privado normal.
2. **Nos ha mandado ELLA una solicitud y sigue pendiente de aceptar** → mensaje normal contestando a esa solicitud (`linkedin[invitation_id]`). **Llega igual que un DM y no hay que aceptarla.** No se acepta a propósito: aceptar en masa es lo que dispara los límites de LinkedIn.
3. **Ni conexión ni solicitud por ninguna parte** → **no se le manda NADA por privado.** Se le responde en público pidiéndole que nos mande él la solicitud, con el porqué («LinkedIn no me deja escribirte si no somos contacto»), y ese pedido se guarda. Cuando la manda, la persona aparece en **«Solicitudes pedidas»** con el recurso ya escrito y sale contestando a su solicitud.

**Por qué se retiraron los dos canales que empujábamos nosotros:**

- **La invitación con nota** gasta el cupo semanal, y en la cuenta de **Unai** estaba **baneada** desde el 13/08: LinkedIn aceptaba la llamada por la API —Unipile devolvía OK— y luego **se tragaba la nota en silencio**. La herramienta las guardaba como enviadas, marcaba el comentario como contestado, y horas después escribían los comentaristas diciendo que **no habían recibido nada**.
- **El InMail** gasta créditos de Premium/Sales Navigator, que son pocos.

Ninguno de los dos escala y ninguno construye red. Pedir la solicitud no tiene tope, y quien la manda ya te sigue.

**⚠️ SE PIDE SOLICITUD DE CONTACTO, NUNCA UN "SÍGUEME".** Un seguidor sigue siendo de 2º o 3er grado y a ese LinkedIn **no** deja escribirle: pedir un follow es tirar el lead con la sensación de haber hecho algo. Esta distinción es la razón de ser de todo el flujo.

**⚠️ EL COSTE DEL CAMBIO, QUE HAY QUE MEDIR.** Antes la nota llevaba el enlace DENTRO y llegaba **aunque la persona no aceptara nunca**. Ahora quien no manda solicitud **no recibe nada**: la entrega dejó de ser inmediata para todo el que no es contacto. Al primer lead magnet con esto, mirar el ratio **comentarios → recurso entregado** y compararlo con los de agosto antes de dar el cambio por bueno.

**⚠️ PENDIENTE DE COMPROBAR EN REAL.** Que un **segundo** mensaje, días después, salga por el hilo de una solicitud que **sigue pendiente**. No está verificado. Si no sale, cualquier follow-up comercial posterior obligará a aceptar la solicitud, y eso es una decisión que hay que tomar aparte.

**⚠️ LO QUE SE MANDÓ ANTES DEL 17/08 SIGUE VIVO.** Los invitados con nota que aún no habían aceptado siguen en la sección **«Seguimientos»** (la de abajo, histórica): cuando aceptan, se les manda su recurso desde ahí. No se crean invitaciones nuevas, pero esas hay que cerrarlas.

**⚠️ HAY DOS BANDEJAS, Y UN ENVÍO NO ENCONTRADO NO ES UN ENVÍO NO ENTREGADO (Iker, 2026-08-14).** Unipile **no sirve por defecto** la bandeja `INBOX_LINKEDIN_SALES_NAVIGATOR`, usa otros identificadores de persona ahí (`ACwAA…` en vez de `ACoAA…`) y va **con días de retraso**. Por eso la herramienta mira las dos bandejas y, cuando no encuentra la conversación, dice **"no lo sé" en ámbar y nunca "no ha llegado" en rojo**: un rojo falso ahí te empuja a reenviar, y eso es la misma persona recibiendo el recurso dos veces. El barrido de la segunda bandeja **se queda aunque ya no mandemos InMails**: un mensaje colgado de una solicitud pendiente puede aparecer también fuera del chat de siempre. **Si lo has mandado tú a mano**, dale a **"✓ Ya se lo mandé a mano"** en la tarjeta: la herramienta no puede enterarse sola.

**⚠️ Si tocas el panel: `npx tsc --noEmit` en `frontend/` NO COMPRUEBA NADA.** Su `tsconfig.json` es un proyecto de solo referencias (`"files": []`), así que ese comando sale limpio siempre, compilando cero ficheros — y `vite build` usa esbuild, que borra los tipos sin mirarlos. Así se coló el 14/08 un `ReferenceError` que dejaba **la pantalla en negro** al abrir un post. **El comando bueno es `npx tsc -b`.**

**Y LO MÁS IMPORTANTE: ENVIADO ≠ LLEGADO.** El 200 de la API no es prueba de nada. Después de cada envío la herramienta **relee LinkedIn** (el mensaje en el chat) y solo pinta en verde lo que encuentra; lo que no, lo marca **caído en rojo con el motivo**. En el panel hay un botón **"Revisar envíos"** que repasa los ya guardados y corrige los que se dieron por buenos sin haber salido — es lo que hay que darle para limpiar cualquier tanda anterior al 14/08. **Nunca respondas "Enviado!" en el comentario antes de que el recurso esté comprobado**: el panel ya lo bloquea, pero la regla es de criterio, no de botón.

#### 🔴 4.5.-2 · TODO LEAD MAGNET TIENE QUE CAPTURAR ALGO — AVISO OBLIGATORIO AL ITERAR IDEAS (Iker, 2026-07-22)

**El objetivo NO es solo que se haga viral. Es que se haga viral Y capture, porque vendemos un producto de IA y hay que llevar a la gente hacia comprar.** Un lead magnet que se hace viral y no captura nada es **regalar valor como quien regala calabazas**: el peor resultado, porque gastas el mejor alcance en cero pipeline.

**Caso que no se repite:** "desmonto perfiles" 8.52x · 483 comentarios · **capturó CERO** (regalaba todo, sin gate, sin funnel). Alcance de lujo tirado.

**REGLA DE TRABAJO (esto es un aviso que doy YO, sin que Iker lo pida):** cada vez que se **itere una idea de lead magnet**, antes de escribir nada, comprobar: **si esta idea se hace viral, ¿capturamos algo — correo, lead o demo?** Si la respuesta es no, **AVISAR a Iker con esas palabras** ("esto, si pega, no captura nada") y proponer cómo cerrarlo, ANTES del borrador. No esperar a que pregunte.

**Las tres vías de captura (al menos una, siempre):**
1. **Gate de correo** en una web de recurso (`lead-magnet-web`) → captura email. El caso del recurso público.
2. **Funnel a `agendar`** dentro del entregable → demo/lead. En un lead magnet que entrega por DM y NO crea web ni gate (la lista de empresas), el DM cierra con spam ninja a agendar (`global §4.4b`, matiz del DM privado). Sin esto el DM captura cero.
3. **El propio DM/relación** como puerta comercial, si además lleva el funnel de (2).

**Ojo:** el aviso vale para CUALQUIER pilar viral, no solo el lead magnet — un meme que se dispara sin su spam ninja también es alcance tirado (`global §4.4b`). Pero en el lead magnet es donde más duele, porque ahí el alcance es escaso y caro y el objetivo declarado es pipeline.

#### ⭐ 4.5.-1 · LA IMAGEN DEL LEAD MAGNET: CALCAR SI, PERO NO COMO EN EL MEME (Iker, 2026-07-21)

**La diferencia que hay que tener clara:** en el meme **la foto ES el motor**, asi que se calca si o si (`§4.4`). En el lead magnet **el motor es el volumen de comentarios**, no la imagen. Por eso aqui la imagen es opcional y se decide mirando la referencia.

**Regla de decision:**
1. **¿La referencia lleva imagen y es buena?** → cálcala con todo lo de `§4.4` Paso 6 (inventario primero, un solo parrafo, contencion partida, `images §0h`).
2. **¿No lleva imagen, o la que lleva es mala?** → no la copies. Publica sin foto o con una nuestra.

**⭐ LO QUE HAY QUE MIRAR: QUE ENSEÑA ESA IMAGEN.** Caso real, Guillermo Flor 12.3x: su imagen **no es una foto suya, es una captura de la propia lista** — la tabla entera con nombres reconocibles a la vista (Naval Ravikant, Mark Cuban, Sam Altman, Peter Thiel). **La imagen es la PRUEBA de que el recurso existe y de que es bueno.** Eso vale muchisimo mas que un selfie, y encima resuelve el problema de las cuentas que no tienen fotos naturales.

**Consecuencia practica:** en un lead magnet de lista o plantilla, **enseña el artefacto**, no tu cara. Y las filas de esa captura **tienen que ser reales**: si alguien busca una y no existe, se cae el post entero (`aboutme`: nunca inventar).

**Lo que se calca y lo que no** (igual que en meme): se calca el layout, la estructura de columnas y la mecanica de "aqui esta lo que vas a recibir". **Manda lo nuestro** en paleta (Mint `#ebfff6` + Berenjena `#431b44` + Naranja `#fe8238`, `images §0a-ter`), tipografia (Bricolage + Switzer), formato 1:1 y **cero footer y cero logos** (`images §0h` regla 3) — Guillermo lleva una franja de marca abajo y **se quita**.

**El titulo de la imagen** cumple lo mismo que en cualquier otro pilar (`images §0h` y `§1b`): corto, verbo punchy, anclado a ventas y **sin repetir el hook**. Caso real: hook *"La lista definitiva de 25 empresas activas a las que vender"* → titulo de imagen *"Vender sin llamar a ciegas"*.



#### ⭐ 4.5.0 · EL HOOK "ÚLTIMA HORA" (medido, y NO estaba en esta receta hasta el 2026-07-20)

Nuestros 2 mejores lead magnets usan la misma estructura de gancho y **la receta no la recogía**: solo aparecía como ejemplo suelto en `swipe-file`. Por eso se dejó de usar sin que nadie lo decidiera. **Sin usar desde el 2026-05-15.**

**LO QUE DECIDE NO ES EL TEMA, ES EL SUJETO DE LA FRASE.** Verificado sobre 5 posts nuestros:

| Sujeto | Post | Resultado |
|---|---|---|
| ✅ **lo que le pasa a TU TRABAJO** | "🚨 ÚLTIMA HORA: Claude acaba de matar **el cold outbound**" | **9.96x · 632 com.** |
| ✅ **lo que le pasa a TU TRABAJO** | "🚨 ÚLTIMA HORA: Claude ha reducido **toda mi prospección** a una frase" | **2.72x · 167 com.** |
| ⛔ el MODELO | "🚨 ÚLTIMA HORA: **Claude Opus 4.7** acaba de romper las…" | 0.70x |
| ⛔ el MODELO | "**Hoy ha salido Sonnet 4.5.** Y no es una actualización…" | 0.22x |
| ⛔ el MODELO | "🚨 URGENTE: **El nuevo Claude** acaba de tachar…" | 0.23x |

Mismo hook, mismo emoji, mismo mes, **40x de diferencia**. La noticia de IA es la EXCUSA para escribir; el sujeto del titular es siempre el trabajo del lector.

**Variantes del disparador de urgencia** (para no repetir el mismo literal, `working-preferences §4`). "ÚLTIMA HORA" es la que tiene los datos y es la traducción que decidimos para el *breaking* inglés — **nunca dejarlo en inglés**, nuestro lector es un director industrial español:
- `🚨 ÚLTIMA HORA:` ← la probada, 9.96x y 2.72x
- `⚰️ D.E.P.` ← el R.I.P. en español. Nuestro (Iker, 21/05: *"⚰️ D.E.P. prospección a ciegas"*) y el que **acaba de usar Martín Arosa** (2026-07-23). Mata algo que el lector hace mal (una práctica, no el modelo).
- `🚨 Acaba de pasar:`
- `🚨 Esto cambió ayer:`
- `🚨 Nadie lo ha contado todavía:`
- `🚨 Llevo 24 horas dándole vueltas a esto:`

**🔴 ES OBLIGATORIO, COMO "EXPORTA" EN LOS MAPAS (Iker, 2026-07-23).** No es "una opción que va bien": el hook del lead magnet **abre siempre** con el disparador de última hora + emoji de alarma (🚨 o ⚰️). **El validador lo comprueba** (`--pilar leadmagnet`). Por qué ahora es regla dura: la lista de Unai (22/07) se lo saltó y arrancó fría (0 comentarios ajenos el día 1; despegó el día 2 a ~4.000 imp cuando llegaron comentarios reales). **Validación externa:** Guillermo Flor y Martín Arosa —los dos referentes que SIEMPRE publican lead magnets— abren SIEMPRE con este gancho. Es su firma, y es la de nuestros dos mejores. Cuando Iker pase el enlace del post de Martín Arosa, añádelo aquí con su ratio.

**⭐ SHOW DON'T TELL + RETRASA EL DESVELAMIENTO, como en los mapas (Iker, 2026-07-24).** El hook de última hora **NO cuenta toda la historia de cabeza.** Da el SHOCK (el dato, la subvención) pero **retrasa el "quién/dónde" al cuerpo** — igual que el mapa no dice la región hasta tarde (`§4.2` reveal tardío). Fallo real: *"🚨 en Euskadi subvencionan el 60% de tu IA…"* soltaba **Euskadi en la línea 1** (como cantar la región en un mapa). Arreglado: *"🚨 hay una subvención que te paga el 60% de tu IA para vender más. Y casi nadie la pide 👇"* — el shock (subvención 60%) + intriga ("casi nadie la pide"), y **"Euskadi / SPRI / industria vasca" se revela ya dentro del cuerpo**. Es regla de hook GENERAL (`§2`), no solo del lead magnet: shock + gap, nunca exposición plana con la respuesta entera servida.

#### 🔴 4.5.0c · EL RECURSO PROMETE IDENTIFICACIÓN, NO SEÑALES — Y HAY QUE LLEGAR EL PRIMERO (Iker, 2026-07-29)

**El caso que lo enseña, medido:** el lead magnet de prospección manual (Iker, 28-jul) hizo **0,66x con 1.706 impresiones**, frente al de la subvención (1,16x, 4.420 imp). **2,6 veces menos alcance.** No falló la conversión: casi nadie lo vio. Dos causas, las dos evitables:

**1. Prometimos lo que menos compran.** De los 5 puntos de la guía, **2 eran de señales**, el titular de la imagen era de señales (*"Todos avisan antes de comprar"*) y el gancho llevaba ahí. Pero el informe de 50 demos dice que la señal interesa **a nivel secundario** (`aboutme §1b`) y lo que compran es **a quién vender y quién decide dentro**. Solo 1 de los 5 puntos tocaba eso.
- **Regla:** el recurso se construye sobre **la identificación** (qué empresas encajan y quién decide en cada una), y se mide en **MESES ahorrados**, que es la palabra que usan ellos. Las señales pueden salir, pero **nunca como promesa principal ni en el titular de la imagen**.
- **Y no prometas que la IA escribe el mensaje:** objeción real y repetida (*"se nota automatizado, se ignora y quema la confianza"*).

**2. Llegamos tarde a un tema quemado.** Martín Arosa publicó *"D.E.P. prospección manual"* el **25-jun**; nosotros el **28-jul**, un mes después y con audiencia solapada. **Un tema validado no vale si ya te lo han contado: el que pidió su guía no pide la segunda.**
- **Antes de elegir tema, comprueba cuándo lo publicó la referencia.** Si tiene más de 2-3 semanas y comparte audiencia con nosotros, o se cambia de tema o se cambia el ÁNGULO por completo. Copiar el molde es bueno; copiar el tema con un mes de retraso es llegar al turno de otro.

#### 🎯🎯 4.5.0-TEMA · LA TEMÁTICA GANADORA ES `CLAUDE + VENTAS + UNA VARIANTE DE PROSPECCIÓN` (Iker, 2026-08-14)

> **La intuición de Iker, textual:** *"la clave 100% temática Claude + ventas, pero aún afinaría más. A esas dos hay que sumarle siempre una variante sobre prospección: vibe prospecting, prospección en frío, prospección manual"*. **Medida el 14/08 contra los 50 últimos posts de Martín Arosa (Unipile) y contra nuestros 41 lead magnets. Sale que sí, y con margen.**

**LO QUE HACE ÉL, ordenado por familia temática** (`comment_counter` real, 50 posts, 30/06 → 14/08):

| familia del post | comentarios |
|---|---|
| **Regalo de IA aplicada a captar clientes en LinkedIn** (Claude / ChatGPT / n8n) | 305 · 414 · 493 · 527 · 546 · 614 · 978 · 1.031 · 1.072 · 1.167 · 1.218 · 1.232 · 1.290 · 1.391 · 1.959 · 2.122 |
| Opinión, noticia de IA, caso de cliente, marca personal | 4 · 5 · 7 · 10 · 11 · 13 · 28 · 30 · 33 · 41 · 49 · 73 · 99 · 111 · 127 · 136 · 146 · 177 |

**Dos órdenes de magnitud, y el corte no es el gancho ni la hora: es que haya un ARTEFACTO de IA que regalar.** Sin regalo, su techo son 177 comentarios con 40.000 seguidores más que nosotros.

**Y DENTRO DE ESA FAMILIA, LA SUB-VARIANTE QUE MÁS REPITE ES LA PROSPECCIÓN:**

| fecha | gancho | comentarios |
|---|---|---|
| 14/07 | `🚨 ADIÓS: D.E.P. Prospección Manual 🚨` | **1.031** |
| 23/07 | `🚨 ADIÓS: D.E.P. prospección manual.` | **1.232** |
| 10/08 | `¡Elimina YA tu hoja de prospección manual!` | 305 |

**⛔ ESTO CORRIGE `§4.5.0c` EN SU PUNTO 2 ("llegamos tarde a un tema quemado"). El tema NO se quema: él repitió el MISMO tema, con el MISMO enemigo, a nueve días de distancia, y subió de 1.031 a 1.232.** Lo que hundió nuestro 28/07 no fue llegar un mes tarde, fue que **prometimos señales** (punto 1 de esa misma sección, que sigue en pie) y que el post no se repartió. **La regla nueva:** el tema se repite a propósito, como el mapa; **lo que tiene que ser nuevo es el ÁNGULO y el artefacto**, no la temática.

**LA FÓRMULA, PARA ELEGIR TEMA SIN PENSAR:**
```
CLAUDE (nombrado en el gancho)  +  un RESULTADO DE VENTAS  +  una variante de PROSPECCIÓN
```
- **Variantes ya usadas por nosotros:** `vibe prospecting` (632c, y 2ª ronda el 12/08) · `prospección a puerta fría` (12/08) · `quién firma la compra` (11/08) · `prospección manual · la criba` (14/08, Asier).
- **Variantes libres:** el follow-up · la lista de rebotes · el primer mensaje · la reunión que no se agenda · el CRM que nadie rellena · el cliente que se fue con otro.
- **Nuestros datos lo respaldan por el otro lado:** los 5 lead magnets con Claude pasan de 100 comentarios (632 · 285 · 232 · 183 · 167) y la mediana sin IA es 20. **Lo que faltaba escrito es que los cinco, además, van de prospección.**

**⚠️ Y EL AVISO QUE ACOMPAÑA A ESTO: el tema es de él, así que el ÁNGULO tiene que ser NUESTRO.** Su promesa siempre es **volumen** (*"entre 50 y 200 prospectos cualificados en 15 minutos"*). La nuestra, por el informe de 50 demos, es lo contrario: **la criba y la prueba** (`aboutme §1b` pilar 1). Ahí es donde se le gana (`global §2.2b`, ser el segundo mejor), y no copiándole el número.

#### 🔎🔎 4.5.0-COMPETENCIA · PASO 0 OBLIGATORIO: LA INVESTIGACIÓN DE REFERENTES, ANTES DE ELEGIR TEMA (Mario, 2026-08-26)

> **Iker, y es una regla de casa:** *"cada vez que yo te pida una publicación del pilar lead magnet, sea para el jefe que sea, me hagas una investigación primero de nuestros principales competidores, qué patrones hay entre las temáticas entre cuentas de ventas"*.

**El fallo que lo motiva, y es mío:** el 26/08 le propuse reutilizar `/vibe/` para Iker con el argumento de que en SU cuenta era virgen. Y era verdad, pero **Unai lo había publicado 13 días antes**. El espaciado que yo miré era el de la cuenta; el que importa es el de la **temática en toda la casa**, porque las tres cuentas comparten público (`§8.2`). Iker: *"yo quiero sorprender a la audiencia y no quemarles, ni con temática ni con tipo de contenido"*.

**ESTE PASO VA ANTES DE ELEGIR EL RECURSO, no después. Son dos consultas y salen en cinco minutos.**

##### 1 · Los tres referentes, por Unipile

```
GET {UNIPILE_BASE_URL}/api/v1/users/{pid}/posts?account_id={id}&limit=30
```
| referente | pid | estado a 2026-08-26 |
|---|---|---|
| **Martín Arosa** | `ACoAADZxEhwBY2fsFAEmdrvJato1IwHiB8W0NgQ` | ✅ **a tope**: 15 de sus 23 últimos son lead magnets, mediana 200 comentarios, pico **1.467** |
| **Luna Chen** | `ACoAACZ9ZkcBl_c6lvWcyXAVnyI2ukNM7u7sYjY` | ✅ **la más cercana a nosotros, y es de VENTAS pura**: 27 de 30 son lead magnets, pico **1.381** |
| **Guillermo Flor** | `ACoAABBit2ABCYNySanEgukvlFBH-HcIKGlWHu8` | ⛔ **ABANDONÓ el pilar**: 1 de 29. Hoy es un noticiero de IA en inglés (`BREAKING…`), mucha reacción y pocos comentarios |

**Un referente sin posts del pilar no es evidencia de nada**, ni a favor ni en contra: se dice y se pasa al siguiente (ya estaba en `§4.5.0-REFERENTES-PRIMERO`). Guillermo Flor está en ese caso desde agosto, así que **la pareja viva es Martín Arosa + Luna Chen**.

##### 2 · Y si con eso no basta, se sacan referentes NUEVOS de nuestra propia BD

No hace falta un filtro de pilar: la huella dactilar del lead magnet ya está medida en `outliers-database §3.9b` y se aplica sobre `/api/analysis/cross-creators`:

1. **`comentarios >= likes`** — un post normal tiene muchos más likes que comentarios; un lead magnet invierte la proporción porque el comentario es el peaje.
2. **+ palabra-puerta en el texto** (`comenta "X"`, `comment "X"`, `escribe "X"`, `drop … below`).
3. **+ filtro de nicho** (`vender|comercial|prospec|outbound|cold|cliente|sales|SDR|GTM…`) para quedarse con los de VENTAS.

**Medido el 26/08:** de los 500 top outliers salen **72 lead magnets confirmados**, y **48 son de ventas**. Eso es cantera de sobra sin depender de tres cuentas.

##### 3 · Qué se saca de ahí, y es lo único que importa: EL PATRÓN DE TEMÁTICA

**Medido el 26/08 sobre los ganchos de esos 48:** `cold` **(11)** · `claude` (10) · `linkedin` (9) · `sales` (6) · `email` (4) · `calling` (4). **La palabra nº1 del pilar en nuestro nicho es `cold`** — cold email y cold calling —, por delante incluso de Claude.

**Y hacia dónde se ha movido la pareja viva, que es el dato fresco:**
- **Luna Chen → `Claude AGENTS / SKILLS para ventas`**: *"20 Best Claude Agents For Your Entire Sales Operation"* (1.381c) · *"25 Best AI Skills For LinkedIn Outreach"* (249c) · *"My Full Claude Sales System, 337+ skills"* (180c). **No es prospección: es el CATÁLOGO de agentes para todo el ciclo comercial.**
- **Martín Arosa → `n8n + agentes que gestionan LinkedIn`**: n8n (1.467c y 503c), la biblioteca de recursos (1.427c), el agente que analiza antes de escribir (489c). **Ya no habla de prospección.**
- **Y los dos se han copiado el formato de NOTICIA DE ÚLTIMA HORA.** ⛔ Ese no nos conviene y no se copia (Iker, 26/08): nuestro alcance no viene de dar noticias, y ya está escrito que los posts de lanzamiento de modelo nos flopean (`working-preferences §3`).

##### 4 · ⛔ EL ESPACIADO SE MIDE ENTRE NOSOTROS, NO CONTRA ELLOS (y la puerta dura es la MISMA cuenta)

> **Mario:** *"tienes que espaciar no entre las fechas de publicación de otras cuentas, sino entre nosotros mismos"*. Y sobre Martín Arosa, que repite tema cada dos días: *"que por poder se puede… pero yo quiero sorprender a la audiencia"*.

**Que un referente repita un tema NO nos da permiso para repetirlo.** Es la misma asimetría de `§4.5.0-CTA-CERO`: se les mira para detectar hacia dónde se mueve el nicho, no para copiarles los permisos.

###### 🔴🔴 LA PUERTA DURA ES **LA MISMA CUENTA**. ENTRE CUENTAS ES UN AVISO, NO UN VETO (medido el 2026-08-26)

> **🔴 AQUÍ PONÍA TRES PUERTAS DURAS Y ERA DEMASIADO ESTRICTO.** Lo escribí el mismo día tras equivocarme con `/vibe/`, y **sobrecorregí**: puse el mismo veto para las tres cuentas juntas que para una sola. Iker lo dudó en voz alta —*"creo que está siendo demasiado estricto, el espaciado sobre todo tiene que ser con la cuenta concreta, ¿no?"*— **y al medirlo tenía razón**. Caso de libro de `working-preferences §0c`: una deducción mía disfrazada de regla, y encima contra nuestros propios datos.

**REPETIR TEMA EN LA MISMA CUENTA: HUNDE SIEMPRE. n=3 y unánimes.**

| distancia | tema | resultado |
|---|---|---|
| +15d | vibe (Unai) | 632c → **167c** · −74% |
| +23d | llaves (Unai) | 285c → **33c** · −88% |
| **+89d** | vibe (Unai) | 167c → **96c** · −43% · **a TRES MESES sigue cayendo** |

**REPETIR TEMA EN OTRA CUENTA: no hay patrón, y el mejor caso SUBE.**

| distancia | tema | resultado |
|---|---|---|
| **+7d** | llaves · Iker → Unai | 232c → **285c** · ✅ **sube**, y son el nº3 y el nº4 del histórico |
| +13d | llaves · Unai → Iker | 33c → 62c · ↗ recupera |
| +14d | perfil · Iker → Unai | 483c → 9c ⛔ **pero confundido**: el 2º uso fue `destripo`, el verbo pasado de rosca que `global §2.9` ya explica solo (8.52x contra 0.21x) |
| +2d | prospección manual · Unai → Asier | 96c → 16c ⛔ |

**El caso de las llaves es el que decide: mismo recurso, mismo concepto, SIETE días y dos cuentas — y el segundo hizo MÁS comentarios que el primero.** Mi regla de ayer lo habría prohibido, y son dos de nuestros cuatro mejores lead magnets.

**LAS PUERTAS, CORREGIDAS:**

| puerta | qué mide | vara |
|---|---|---|
| **1 · MISMA CUENTA · DURA** | ¿de qué habló ESTE jefe en sus lead magnets? | **mínimo ~90 días Y ángulo nuevo**, sabiendo que aun así cae: a 89 días vibe perdió un 43% |
| **2 · OTRA CUENTA · AVISO** | ¿cuántos días desde que otra cuenta lo publicó? | **no veta.** Se dice en la entrega con el número y **decide Iker**. Por debajo de ~1 semana, avisar fuerte |
| **3 · El recurso** | ¿qué slug lleva más tiempo sin usarse? | **ordena la cola** de `§4.5.0-REUTILIZAR`; no veta |

**⚠️ POR QUÉ EL LEAD MAGNET NO SE QUEMA ENTRE CUENTAS Y EL PELOTEO SÍ** *(deducción mía, `working-preferences §0c`, sin medir — se anota porque explica los dos conjuntos de datos a la vez)*: el **peloteo** depende de TERCEROS que son **los mismos** entre cuentas — si Iker menciona 20 empresas de una región y tres días después lo hace Unai, es la misma gente recibiendo la misma notificación, y por eso `§8.2` mide una quema colectiva real (4 peloteos en 10 días hundieron el pilar). El **lead magnet** depende de que gente nueva vea el post en SU feed y comente, y los feeds de las tres cuentas solo se solapan en parte. **Motores distintos, así que no tienen por qué compartir la regla de espaciado.**

**⛔ LO QUE NO CAMBIA, y es criterio de marca por encima del dato:** Martín Arosa repite el mismo tema cada dos días y le sigue funcionando. **No lo copiamos.** Así que **ante dos opciones que pasen las puertas, gana siempre la que lleve más tiempo sin tocarse.** La tabla dice qué está prohibido; la preferencia de Iker decide entre lo permitido.

**La cola de `§4.5.0-REUTILIZAR` se ordena por la puerta 3 (días desde el último uso), no por comentarios del post origen.** Y entre los que pasan las puertas, **desempata el TECHO DEL TEMA FUERA, no lo que nos hizo a nosotros** (`§4.5.0-TECHO`).

##### 🎯🎯 4.5.0-TECHO · UN TEMA SE JUZGA POR SU TECHO **FUERA**, NO POR LO QUE NOS HIZO A NOSOTROS (Mario, 2026-08-26)

> **Iker, y es la corrección que abre esta sección:** *"que me estés dando a entender que una publicación que nos pilló hace meses cien comentarios es buena, yo lo veo poco. Obviamente para nuestra cuenta es buena, pero tenemos que aspirar a más, sobre todo ahora que ya hemos aprendido a esquivar los baneos"*.

**El fallo:** ordené la cola de recursos por los comentarios que sacó NUESTRO post de origen. Eso mide **nuestra ejecución de entonces**, no el tema. Y con esa vara, un tema con techo de 1.710 comentarios se queda archivado como "el de 120".

**EL CASO QUE LO DEMUESTRA, y es nuestro:** el post de Iker del 21/04 (*"Por qué la mayoría de los cold emails se ignoran"*, **120 comentarios**) es una **traducción casi literal** de un post que está en nuestra propia BD:

| post | comentarios | ratio | fecha |
|---|---|---|---|
| El original en inglés (*"Why most cold emails get ignored"*) | **1.710** | **30.4x** | 10/11/2025 |
| Su propio remix, 5 meses después, casi calcado | **1.414** | 24.9x | 02/04/2026 |
| **Nuestra traducción** | **120** | 2.16x | 21/04/2026 |

**Dos cosas que esto enseña y que no teníamos escritas:**
1. **El techo del tema es 1.710, no 120.** Nuestro número medía el molde de abril: un ensayo traducido literal, sin disparador, sin Claude, sin lista numerada y con `Escribe "sí" en los comentarios` de CTA — el CTA implícito que `swipe-file §4.1` ya demostró que hunde el conteo (0.59x contra 8.52x). **Hoy tenemos el molde campeón y no lo teníamos entonces.**
2. **El autor original repitió su propio post cinco meses después casi calcado y volvió a hacer 1.414.** O sea que el tema aguanta la repetición **en su propia cuenta**, cosa que a nosotros no nos pasa (`§4.5.0-ESPACIADO`). Es la asimetría de confianza de cuenta de siempre.

**⚠️ Y LA CAUTELA, dicha entera:** no se puede atribuir todo el hueco a la ejecución. En abril nuestra audiencia era más pequeña, y aunque el ratio normaliza por la media del propio autor (30.4x contra 2.16x), no lo normaliza todo. **Lo que sí se sostiene: un tema con 1.710 comentarios demostrados fuera no se descarta porque nosotros lo hiciéramos a 120.**

**LA REGLA:** al elegir recurso, cada candidato lleva **DOS cifras**, y mandan en este orden:
1. **El TECHO del tema fuera** — el mejor análogo en `/api/analysis/cross-creators` con la huella de `outliers-database §3.9b`. Dice cuánto puede dar.
2. **Nuestro resultado** — dice cómo lo ejecutamos la última vez, y **sirve para diagnosticar, no para descartar.**

**Si el techo es alto y lo nuestro fue bajo, eso no es un tema muerto: es un tema mal ejecutado, y encima ya sabemos por dónde.** Ese es el mejor candidato que hay, porque el riesgo está identificado.

##### 5 · Lo que va en la entrega, siempre

Una tabla de **recurso · comentarios del origen · días desde el último uso en la casa · quién lo publicó**, y el patrón de temática de los referentes con sus cifras. **Sin eso, la elección del tema es una opinión mía.**

#### 🛠️🛠️ 4.5.0-YO-LO-HAGO · EL RECURSO YA NO SE PIDE POR PROMPT: LO ADAPTO YO (Mario, 2026-08-26)

> **Mario:** *"tú ahora mismo tienes acceso también al repositorio de recursos, así que cuando ejecutes lead magnet, si yo te doy el ok, no hace falta que me des el prompt que le pasaríamos al programador, sino que tú mismo te conviertes en el programador y me adaptas ya el recurso. El error que yo hacía antes es que solo te conectaba el repositorio de publicaciones"*. Y lo mismo para **la imagen OG** del recurso: *"ya vas a poder hacerlo tú todo, tienes la plantilla, tienes los conocimientos para meter el logo y para meter la foto en la web"*.

**QUÉ CAMBIA EN LA ENTREGA.** `lead-magnet-web §5` describe un **prompt para el programador**; eso queda para cuando NO haya acceso al repo. Con los dos repos conectados, el entregable ya no es el prompt: **es el cambio hecho, medido y commiteado**.

| antes | ahora |
|---|---|
| prompt para el programador | **yo edito `neety-resources` y commiteo** |
| prompt para el diseñador de la OG | **yo genero la OG y la coloco**, salvo que la que hay ya sirva |
| «pendiente: que lo monte el programador» | **pendiente: que Iker lo mire en producción** |

**🔴🔴 Y LA PIEZA QUE FALTABA EN EL OUTPUT: DAR DE ALTA EL RECURSO EN EL CATÁLOGO (Mario, 2026-08-26).** *"La próxima vez que preparemos un lead magnet, en el output tienes que incluir que tú actualices el catálogo en caso de que falte ese recurso, sea nuevo o uno reutilizado que nunca se metió."*

**Es BLOQUEANTE y casi se publica sin ello.** El catálogo es `CATALOGO` en `frontend/src/components/accounts/leadMagnetCopy.ts`, y es lo que hace que el panel sepa **qué enlace mandar** y **qué palabra están comentando**. `/errores/` llevaba desde abril sin estar dado de alta: `detectarRecurso` habría devuelto `null`, `resolverRecurso` también, y **con `recurso` en null el botón de enviar el DM se bloquea** — el panel pidiendo el enlace a mano con los comentarios entrando.

**Cada entrada lleva cuatro cosas:**
- **`link`** — la URL del recurso.
- **`topic`** — rellena *"te dejo el recurso sobre {topic}"* en el DM, así que se lee como parte de una frase.
- **`claves`** — la palabra que la gente comenta, o sea **la del banner de la foto**. Si es una reedición, van las dos: la nueva y la de los posts viejos que siguen en la herramienta.
- **`pistas`** — frases del texto del post, **sin tildes y en minúsculas**, que es como se reconoce un post nuevo (la palabra ya no está en el texto).

**⛔ Y LAS PISTAS SE COMPRUEBAN, NO SE ELIGEN A OJO. Dos cosas, las dos medidas contra el texto real del post:**
1. **Que las pistas aparezcan de verdad** en el post.
2. **Que ninguna pista de los OTROS recursos case con él.** Si hay empate, `detectarRecurso` devuelve `null` a propósito, y estás en el mismo escenario de arriba. La entrada de `/criba/` ya avisa de esto porque casi le pasa.

**Y si la palabra vive en la foto** —que es el caso normal desde el 05/08— **`claveDelPost` la saca de la `clave` del recurso detectado**. Sin eso, `cfg.keyword` queda vacía y se apaga todo lo que cuelga de ella: el aviso de *"no lo ha pedido"* salta en todas las tarjetas, `cerradoSinPedirlo` no cierra a nadie y el sector del tipo lista sale siempre vacío.

**🔴🔴 Y ADAPTAR EL RECURSO NO ES ADAPTAR EL GATE: EL RECURSO TIENE QUE SER EL ESPEJO DEL POST (Mario, 2026-08-26).** *"Acabo de comprobar que efectivamente has adaptado el gate del recurso al nuevo texto de la publicación, pero espero que también hayas actualizado el recurso en sí, ¿no? Ya que ahora ha entrado al recurso y hay por lo menos nueve secciones, cuando creo que como mucho debería haber cinco. Revísalo, y no vuelves a fallar esto en el futuro."*

**Lo que pasó, para que no se repita.** El post de `/errores/` prometía **5 errores, cada uno con su arreglo al lado**. Yo cambié el post de 8 trucos a 5 y adapté el gate, di el recurso por hecho y **no abrí la guía**. Dentro seguía la versión vieja: **9 secciones numeradas por CANAL** (LinkedIn, cold email, ICP, estrategia, automatización, copy, cadencia, benchmarks, prompt), con los 5 errores escondidos dentro de la sección 06. El lector entraba buscando cinco cosas y se encontraba nueve, ninguna de ellas llamada como lo que le prometimos. **Y el recurso ya estaba en producción con gente entrando.**

**LA REGLA. La promesa del post es el índice del recurso.** Si el post dice *5 errores*, la guía tiene **5 secciones numeradas, ni una más**, tituladas con los 5 errores, **en el mismo orden y con las mismas palabras**. Lo demás —tablas, prompts, material de consulta— va **sin numerar** detrás, para que no compita con la promesa.

**Y lo que había dentro NO se tira: se reparte.** Los datos con fuente son lo que sostiene el recurso. En `/errores/` los 23 `data-row` con sus 23 fuentes se repartieron entre los 5 errores por **lo que prueba cada dato**, no por el canal del que venían. Cero datos inventados, cero datos perdidos: se cuentan antes y después.

**Se comprueba con un script, no a ojo:**
```
python scripts/validar-recurso.py <ruta/al/index.html> --promete 5
```
Cuenta las secciones numeradas, los datos y las fuentes, y avisa de tildes comidas y de inglés suelto (los dos fallos que salieron ese día al reescribir párrafos a mano). **Su resultado va en la entrega, igual que el del validador del post.**

**⛔ LO QUE NO CAMBIA, Y ES LO QUE EVITA QUE ESTO SALGA MAL:**
1. **Se espera el OK de Iker antes de tocar el repo.** El post se aprueba primero; el recurso se adapta después. *"si yo te doy el ok"*.
2. **Antes de dar el recurso por adaptado, SE ABRE Y SE LEE ENTERO.** No basta con el gate ni con el `<h1>`. El fallo del 26/08 fue exactamente eso: dar por bueno lo que no se había mirado.
3. **`lead-magnet-web §4c` manda igual: MEDIR, NO ESTIMAR.** Se levanta el estático (`python -m http.server 8899 --bind 127.0.0.1`, en background y **sin pipe**) y se miden las **líneas renderizadas** a **1440 y a 360**, no los caracteres. Los recursos ya publicados son la especificación.
3. **Los invariantes se miden contra el catálogo**, no se recuerdan (`§4.5.0-REUTILIZAR`): H1 de 39-55 caracteres en 2 líneas, lede de 155-190 en 3 líneas a 1440 y 4 a 360, `h3` de card 30-42, `p` de card 85-109.
4. **Los comportamientos comunes se HEREDAN y se nombran uno a uno**: header sticky, scroll suavizado, animaciones de entrada, y el `prompt-box` con su botón de copiar. Se copian de un recurso publicado, con los mismos tokens. **Un recurso que se comporta distinto al resto canta aunque el copy sea perfecto.**
5. **Los tres registros del slug, el `robots.txt` y el `noindex` se comprueban aunque no se toquen.** Si falta uno, se rompe en silencio.
6. **Y la OG solo se rehace si hace falta.** La de `/errores/` dice *"El error no es el canal · Es el mensaje"* y **no lleva ningún número dentro**, así que pasar de 8 a 5 errores no la invalida. Rehacer trabajo bueno es el error de `§4.5.0-RESUBIDA`.

**🔴🔴 7. EL COMPORTAMIENTO HEREDADO SE COPIA LITERAL DEL FICHERO. NO SE REESCRIBE DE MEMORIA.**

**Y esto lo escribo porque me lo salté y me costó un bug que además diagnostiqué mal.** Al traer el `prompt-box` de `/firma/` a `/errores/` **reescribí el JS a mano** en vez de copiarlo tal cual, y en esa reescritura el `.then(done)` se quedó **sin `.catch`**: si `writeText` rechaza —documento sin foco, permiso denegado, iframe— el botón se queda mudo y el fallback de `execCommand` no llega a correr nunca.

**Lo cacé midiendo, no leyendo** (en local `writeText` rechaza con *"Document is not focused"*), lo arreglé, y **entonces me equivoqué en el diagnóstico**: lo di por "bug heredado de `/firma/`" y avisé de que los demás recursos lo tenían. **Falso.** Comprobados uno a uno después: `/firma/`, `/llaves/`, `/criba/` y `/mensajes/` **ya tenían su `.catch` con fallback**. El bug era mío y solo mío, nacido de reescribir en vez de copiar.

**Dos reglas, y la segunda duele más que la primera:**
- **Copiar literal.** Si el bloque se hereda, se saca del fichero fuente y se pega. Reescribirlo "igual pero mejor" es exactamente por donde entra el defecto.
- **Antes de decir que un bug es HEREDADO, se comprueba en el fuente.** Un `grep` de 10 segundos habría bastado. Acusar al código de otro de un fallo propio manda a alguien a arreglar lo que no está roto, y encima ensucia la receta con una regla falsa.

#### 🔁🔁 4.5.0-REUTILIZAR · EL RECURSO NO SE CREA DE CERO: SE REUSA EL DE UN TEMA YA VALIDADO (Iker, 2026-08-18)

> **Iker, textual:** *"ya que tenemos once, adaptar la mayoría. Primero repetir y double down en los que nos fueron ya hace meses, porque el otro día ya vimos que repitiendo el primero más viral se volvió a ir viral. No hay que perder el tiempo creando recursos de cero si ya tenemos ideas validadas que, con lo que sabemos hoy, podemos mejorarlas. Encima la gente se creerá que son recursos nuevos."*

**LA REGLA: antes de proponer un recurso nuevo, se mira el catálogo de `recursos.neety.com`.** Si hay uno cuyo TEMA ya dio comentarios, se reutiliza **el mismo slug, la misma palabra de gate y el mismo enlace**, y se le mete lo que hemos aprendido desde entonces. Montar una página de cero es la excepción, no el punto de partida.

**POR QUÉ ES BARATO Y ADEMÁS SE PERCIBE COMO NUEVO, y son tres cosas distintas:**
1. **El slug y los tres registros ya existen** (`GATED`, `RESOURCES`, `withGuide`), el `robots.txt` y el sitemap ya están puestos, y la OG ya está hecha. El programador solo toca copy y bloques.
2. **El que lo pidió hace meses tiene la cookie `neety_gate` y entra directo** — así que ve la guía nueva sin pagar peaje otra vez. No captura, pero recupera a un lead frío.
3. **El que no lo vio en su día no distingue un recurso nuevo de uno reeditado.** El feed no tiene memoria; nuestra base de datos sí.

**🔴 CORREGIDO EL 2026-08-26: LA COLA SE ORDENA POR DÍAS SIN USARSE, Y LOS COMENTARIOS DESEMPATAN.** Aquí ponía que *"el orden lo manda el post que generó el recurso"*, o sea por comentarios, y **con esa lectura le propuse a Iker reutilizar `/vibe/` (632c, el nº1) trece días después de que lo publicara Unai**. Los comentarios dicen si un tema PICA; los días dicen si está QUEMADO, y lo segundo se comprueba primero (`§4.5.0-COMPETENCIA` punto 4). El orden bueno: **pasar las tres puertas de espaciado → y entre los que quedan, el de más comentarios.**

**Estado a 2026-08-26, ordenado por días sin usarse en TODA la casa:**

| slug | com. origen | días | quién lo usó la última vez |
|---|---|---|---|
| `/errores/` | 120 | **0** | **26/08 Iker · reeditado hoy** (era el que llevaba 127 dias) |
| `/senales/` | 23 | 120 | 28/04 Unai · flojo de origen |
| `/mensajes/` | 129 | 69 | 18/06 Unai, y ahí flopeó (18c) |
| `/propuesta/` | 20 | 42 | 15/07 Asier · flojo |
| `/perfil/` | **483** | 40 | 17/07 Iker, con el ángulo de auditoría web → 0.32x |
| `/subvencion-euskadi/` | 46 | 33 | 24/07 Iker |
| `/prospeccion-manual/` | 31 | 29 | 28/07 Iker |
| `/firma/` | 19 | 15 | 11/08 Iker ⛔ |
| `/vibe/` | **632** | 14 | 12/08 Unai ⛔ |
| `/criba/` | 16 | 12 | 14/08 Asier ⛔ |
| `/llaves/` | 285 | 8 | 18/08 Unai ⛔ |

**Fíjate en lo que enseña la tabla: los tres recursos con más comentarios de origen (632, 483, 285) son los TRES más recientes.** Justamente porque funcionan, se han vuelto a usar antes. Ordenar por comentarios es ordenar por "lo que acabamos de quemar".

**La lista de abajo se conserva por el detalle de cada recurso**, pero el orden que manda es el de arriba:

| slug | recurso | post origen | com | ratio | estado |
|---|---|---|---|---|---|
| `/vibe/` | Claude Code para prospección B2B | 30/04 Unai | **632** | 9.41x | ✅ repetido 12/08 → 96c · 1.54x, **el único post de agosto por encima de 1x** |
| `/perfil/` | Tu perfil como landing page B2B | 28/05 Iker, *desmonto perfiles* | **483** | 8.66x | ⚠️ reintentado el 17/07 como auditoría de web → 0.32x. Ese ángulo ya se gastó |
| `/llaves/` | Le tiré las llaves de mi LinkedIn a Claude | 12/05 Unai (285) + 05/05 Iker (232) | **285** | 4.32x | 🔜 en adaptación 18/08 |
| `/subvencion-euskadi/` | El 60% de tu IA lo paga el Gobierno Vasco | 24/07 Iker | 46 | 1.18x | sin repetir |
| `/prospeccion-manual/` | 7 señales de que una empresa va a comprar | 28/07 Iker | 31 | 0.83x | sin repetir |
| `/senales/` · `/errores/` · `/mensajes/` · `/propuesta/` | señales · errores de outbound · mensajes · comité | 28/04 · 21/04 · 18/06 · 15/07 | 23 · 120 · 18 · 20 | ≤2.14x | 🔴 mapeo de `/senales/` y `/errores/` **inferido, sin confirmar** |
| `/criba/` · `/firma/` | criba · quién firma la compra | 14/08 Asier · 06-11/08 Iker | 16 · 19 | ≤0.54x | demasiado recientes, no tocar |

**⛔ Y EL MATIZ QUE EVITA QUE ESTO SE USE MAL: reutilizar un tema VALIDADO no es lo mismo que reutilizar un tema que flopeó.** De los once, **dos** vienen de posts de 8x-9x y **nueve** de posts que no pasaron de 46 comentarios. Reeditar uno de esos nueve **no es una apuesta barata**: si el tema no picó, la página bonita no lo arregla, y entonces hay que cambiar el ÁNGULO — que ya es trabajo de recurso nuevo con un contenedor viejo. **Primero se agotan los validados.**

**LA ADAPTACIÓN ES LIGERA, Y ESTO ES LO QUE NO SE TOCA NUNCA (Iker, 2026-08-18):** el TEMA, la metáfora del gancho, la palabra del gate, el H1, las secciones de la guía y el cierre. Iker, sobre mi primera versión, que reescribía `/llaves/` entera para llevarla a prospección: *"lo que estás pretendiendo hacer es cambiar por completo el recurso. Yo te había dicho adaptar un poco. No cambiar por completo el contenido para que sea de prospección, eso no tiene sentido"*. **Se corrige lo que hoy sabemos que falta, y nada más.**

**CÓMO SE ENCUENTRA QUÉ FALTA: se abre el HTML del recurso y se cuenta, no se opina.** En `/llaves/` (18/08): `Claude` salía **6 veces en 111 KB** y las seis fuera del contenido (title, dos metas, hero, una lista de herramientas, ficha del autor), y `prompt` salía **0 veces**. O sea que el post prometía *"monté un sistema con Claude que hace 3 cosas"* y la guía entregaba un playbook manual. **Ese grep es el diagnóstico entero**, y es reproducible en los otros diez.

**🐴 AL REEDITAR, LO QUE ROTA ES EL OBJETO DE LA METÁFORA, NO SOLO EL VERBO (Iker, 2026-08-18).** Doblar un ganador nuestro repitiendo el gancho casi palabra por palabra es lo que hacen Martín Arosa y Guillermo Flor, y les funciona. **Iker lo rechaza a propósito, y da su motivo:** *"está el riesgo de que nos pillen hasta repitiendo una idea, y a nivel personal no me gusta hacer eso. Considero que perjudica la calidad del contenido"*. **Es una decisión de marca por encima del dato, y así queda escrita.**

**LO QUE SE CONSERVA Y LO QUE SE CAMBIA, que es lo que hace que esto no sea tirar el activo:**
- **Se conserva el VEHÍCULO**, que es lo medido (`global §2.2b`): *yo le entregué el mando de mi LinkedIn a Claude y me fue mejor vendiendo*.
- **Se cambia el OBJETO**, que es piel: `llaves` → `riendas`. Caso del 18/08, propuesto por Iker.
- **Y el objeto nuevo se comprueba contra el corpus antes de usarlo.** Medido: `rienda` no aparece **ni una vez en los 258 posts** de las 3 cuentas.

**POR QUÉ `riendas` no es un peor sustituto, y sale de nuestras propias reglas:**
| criterio | `llaves` | `riendas` |
|---|---|---|
| se puede rodar (`§2.2d`) | ✅ el gesto de tirarlas | ✅ la mano que las agarra |
| doble lectura digital (`§2.2d-DOBLE`) | ⚠️ una llave es también una contraseña | ✅ ninguna |
| registro del lector de 45-60 | neutro | ✅ **lenguaje de mando**, y encima refrán |
| gastado en nuestro corpus | ⚠️ 2 posts | ✅ virgen |

**⛔ EL COSTE, Y HAY QUE COMPENSARLO CON EL VERBO:** `tomar las riendas` está **más lexicalizado** que `tirar las llaves`. Como frase hecha, el lector la lee sin ver nada. **Por eso el verbo tiene que devolverle el cuerpo al objeto:** `tomó` y `lleva` son neutros y no pintan; **`me quitó` sí se ve**, y además monta tensión y pago en la misma línea. Escalera: `tomar` → `llevar` → `coger` → `agarrar` → **`quitar`** → `arrebatar` (se pasa).

**🔴 Y LA CONSECUENCIA QUE SE OLVIDA: SI CAMBIA EL OBJETO DEL GANCHO, CAMBIA EL H1 DEL GATE Y LA PALABRA DEL BANNER.** `lead-magnet-web §2` dice que el H1 del gate **es el gancho del post casi palabra por palabra**, porque quien aterriza viene de leer el post. Un gancho de `riendas` contra un gate de `llaves` rompe el reconocimiento justo donde se deja el correo. **El slug SÍ se queda** (`/llaves/`): no se ve en ninguna parte, porque el lead magnet no lleva enlace en el post.

**🎨 Y LA COHERENCIA DE DISEÑO GLOBAL MANDA SOBRE EL COPY NUEVO (Iker, 2026-08-18).** Al reeditar hay que retocar los textos que venden el recurso (lede del gate, metas, card de la home), y ahí es por donde se rompe la web: *"que no hayas propuesto nuevos títulos que ya vayan a ocupar más de lo que siempre tienen que ocupar"*. **Los invariantes se MIDEN contra los once ya publicados, no se recuerdan.** Medido el 18/08 sobre `index.html`:

| campo | rango real del catálogo (n=11) | dónde está `/llaves/` |
|---|---|---|
| `h3` de la card | **30-42 caracteres**, siempre **exactamente UN `<em>` coral** | **42 · el máximo de los once** |
| `p` de la card | 85-109 caracteres | **109 · el máximo** |
| `p.card-p-m` (móvil) | 51-65 caracteres | **65 · el máximo** |
| lede del gate | 155-190 caracteres · 3 líneas a 1440 y 4 a 360 | — |

**Consecuencia práctica, y vale para cualquier reedición:** el copy nuevo entra **a la misma longitud o más corto, nunca más largo**. Si lo que quieres nombrar no cabe, **se recorta el copy**; no se estira la caja ni se toca el CSS (`lead-magnet-web §4c`). Y en `/llaves/` los tres campos están ya en el techo del catálogo, así que ahí el margen es cero.

**⛔⛔ LOS DOS ERRORES SIMÉTRICOS AL REEDITAR, Y LOS COMETÍ LOS DOS EN EL MISMO DÍA (Iker, 2026-08-18):**

| error | qué hice | por qué está mal |
|---|---|---|
| **Pasarse** | Propuse llevar `/llaves/` de contenido de LinkedIn a prospección | *"Eso es un cambio radical de temática, y eso no tiene sentido"*. Adaptar a Claude **no** es reescribir de qué va el recurso |
| **Quedarse corto** | Entregué el gancho calcando casi literal nuestro 285c | *"Está el riesgo de que nos pillen hasta repitiendo una idea"*. Doblar no es copiar y pegar |

**LA LÍNEA, en una frase: el RECURSO no se toca salvo que sea imprescindible, y el GANCHO estrena concepto siempre.** Lo que se adapta del recurso es solo lo que hoy sabemos que le falta (en `/llaves/`, que Claude no aparecía dentro); lo que se inventa nuevo es la metáfora del post. Son dos piezas y se mueven al revés: **la web, quieta; el gancho, nuevo.**

**Y el concepto nuevo lo puede traer cualquiera, no hace falta un método.** `llaves` → `riendas` lo propuso Iker en una línea. Lo que sí hay que hacer siempre es **comprobarlo contra el corpus antes de usarlo** y pasarle el test del objeto (`global §2.9-OBJETO`).

**⚠️ ESTO NO CONTRADICE `lead-magnet-web §2`** (*"nace de una duda real y repetida, no de reciclar contenido con un título bonito"*). Aquello prohíbe **empaquetar contenido viejo con un título nuevo**; esto obliga a **reeditar un tema que ya demostró que pica**. Lo que se reutiliza es la evidencia, no el relleno.

#### 📈 4.5.0-CTA-IMAGEN-MEDIDO · EL BANNER EN LA FOTO FUNCIONA, Y EL CUELLO DE BOTELLA SE HA MOVIDO (medido 2026-08-14)

**El 12/08 fue el primer post con el `Comenta "X"` metido en la imagen (`§4.5.0-CTA-IMAGEN`). Resultado, contra los cuatro anteriores:**

| post | comentarios | impresiones |
|---|---|---|
| 06/08 · 07/08 ×2 (gate en el texto) | 12 · 12 · 14 | **67 · 18 · 163** ← capados |
| 11/08 (sin gate en ninguna parte) | 19 | 2.740 |
| **12/08 (gate en la IMAGEN)** | **71** | 2.036 |

- **El mecanismo está resuelto: el gate sobrevive dentro de la foto y el post ya no se capa.** 71 comentarios es el mejor lead magnet nuestro desde mayo, y encima Iker confirma que **por fin llegan comentarios de gente de fuera de nuestra red**, que es la señal que llevábamos meses sin ver.
- **⛔ Pero el cuello de botella ya no es el CTA, es el ALCANCE.** 2.036 impresiones contra una mediana de corpus de 3.424 y contra las 25.100 del 632c. Con ese alcance, 71 comentarios es una **tasa altísima** (3,5% de los que lo vieron comentaron, contra el 2,5% del 632c): **el problema no es que no convierta, es que no lo ve nadie.**
- **Consecuencia práctica al planificar:** la palanca del próximo lead magnet **no es tocar el CTA otra vez**, es el TEMA y el GANCHO (`§4.5.0-TEMA`) y la hora (`working-preferences §1h`). Si el siguiente saca 2.000 impresiones otra vez, el problema es de reparto y toca mirar `images §0a-CAPADO`, no el copy.

#### 📋 4.5.0-ENTREGA · EN TODA ENTREGA DE LEAD MAGNET VAN NUESTROS 5 MEJORES GANCHOS (Iker, 2026-08-05)

**Después del texto del post, SIEMPRE, va una tabla con los cinco ganchos de lead magnet que más comentarios nos han dado, ordenados por comentarios.** Iker: *"para que así pueda revisarlo siempre bien"*.

**No se copia de aquí: se genera de la base de datos en cada entrega**, filtrando `pillar = lead_magnet` en las 3 cuentas y ordenando por `comments_count`. Así el bloque se actualiza solo cuando publiquemos uno que entre en el top 5, y **nunca queda desfasado**.

**Columnas:** comentarios · ratio · el gancho literal · **el verbo punchy subrayado**, que es lo que hay que comparar contra el gancho nuevo.

**Para qué sirve de verdad:** es el listón. Antes de dar por bueno un gancho, se pone al lado de esos cinco y se ve si aguanta la comparación. Es la versión práctica de `global §0-DATOS`: **nuestros datos delante, no de memoria.**

#### ⛔⛔ 4.5.0-RESUBIDA · UNA RESUBIDA NO ES UN LEAD MAGNET NUEVO (Iker, 2026-08-10)

**En una resubida SOLO cambia el texto.** La web del recurso, la imagen del post y
la imagen de compartir **ya existen desde la primera subida** y no se vuelven a
pedir. Iker: *"es la cuarta vez que resubimos el post, así que la web el
programador ya la hizo, la imagen ya creamos una y la de compartido ya se hizo"*.

**Qué hice mal el 2026-08-10:** entregué "el output completo" de las CUATRO piezas
— texto, imagen del post, imagen OG y prompt del programador — en la **cuarta**
subida del mismo post. Peor aún: recomendé un formato de imagen distinto del que
ya está hecho y aprobado (el de los logos de Claude y LinkedIn, sacado de una
referencia más validada), o sea que propuse **tirar trabajo bueno y rehacerlo**.

**La regla de las cuatro piezas es para un lead magnet NUEVO.** Antes de armar la
entrega, la pregunta es una: **¿es la primera vez que sube este post?**

| | primera subida | resubida |
|---|---|---|
| texto | sí | **sí, es lo único** |
| imagen del post | sí | ya está |
| imagen OG | sí | ya está |
| prompt del programador | sí | ya está |
| comparativas (§1e-DOS) | sí | sí |
| validador | sí | sí |

**Y el listado de PENDIENTES también se revisa.** Arrastré tres turnos seguidos un
*"PENDIENTE: la página /firma/ no existe"* que era falso: estaba hecha. **Un
pendiente que no es verdad es peor que no ponerlo**, porque manda a Iker a
comprobar algo que ya estaba resuelto. Si un pendiente lleva varios turnos sin
moverse, se verifica o se quita.

#### ⛔ 4.5.0-AVANCE · LA LISTA DEL LEAD MAGNET ES UN AVANCE, NO EL CONTENIDO (Iker, 2026-08-10)

**Los items van a UNA LINEA. No se desarrollan.** Un lead magnet **abre un hueco, no lo cierra**: si explicas cada punto, el lector ya tiene lo que necesita y no pide el recurso. Iker: *"hay que dar un avance del contenido pero NO contar el contenido"*.

**⚠️ Y CUIDADO CON LA TRAMPA EN LA QUE CAI (2026-08-10).** Nuestro mejor lead magnet, el de 632 comentarios, **sí lleva la lista desarrollada** —5 puntos con titulo y tres lineas cada uno— y yo lo copié creyendo que era la estructura ganadora. **La diferencia está en QUÉ enumera esa lista:**

| lo que enumera | cómo va |
|---|---|
| **Lo que está CAMBIANDO en el mercado** (el 632: "lenguaje natural > filtros rígidos", "señales vivas > base de datos fría") | **desarrollado**, porque es el argumento del post y no es el entregable |
| **LO QUE HAY DENTRO del recurso** (los 5 mensajes, los capítulos de la guía) | **una línea por punto**, porque desarrollarlo es regalar el recurso |

**El test antes de escribir la lista:** ¿esto es el motivo por el que debería querer el recurso, o es el recurso? Si es lo segundo, una línea.

**Y la longitud sale sola de ahí.** El post pasó de 1.702 a 1.217 caracteres solo con esto, en la zona del 483 y el 232. No se acorta recortando frases: se acorta no contando lo que se regala.

#### 🛑🛑 4.5.0-REFERENTES-PRIMERO · ANTE LA SOSPECHA DE CAPADO, LO PRIMERO ES MIRAR A LOS REFERENTES. AUTOMÁTICO (Iker, 2026-08-18)

> **La regla ya existía** como "lección de método" al final de `§4.5.0-CTA`, y **por estar contada como anécdota no se dispara**. Aquí queda como **reflejo obligatorio**, con su comando.

**EL DISPARADOR, y no hace falta que Iker lo pida:** en cuanto alguien —él o yo— diga *"creo que nos han bloqueado la palabra X"*, **lo PRIMERO que se hace, antes de tocar una coma de nuestro texto, es sacar los últimos posts de Martín Arosa y de Guillermo Flor y ver si ELLOS siguen usando X.** Iker: *"esto deberías haber tenido tú la capacidad de pensar: ostras, vamos a revisar a estos creadores a ver cómo lo están haciendo estos días"*.

**EL COMANDO, para no tener que reconstruirlo bajo presión:**
```
GET {UNIPILE_BASE_URL}/api/v1/users/{pid}/posts?account_id={id}&limit=25
  Martín Arosa   ACoAADZxEhwBY2fsFAEmdrvJato1IwHiB8W0NgQ
  Guillermo Flor ACoAABBit2ABCYNySanEgukvlFBH-HcIKGlWHu8
```
Y se cruza `date` + `comment_counter` + presencia de la palabra sospechosa en `text`. **Solo el TEXTO**: la foto no la clasifica LinkedIn, y de hecho ellos siguen metiendo `comenta` dentro de la imagen.

**EL CASO QUE LO FIJA (18/08, con el post ya subido y a punto de borrarlo).** Hipótesis: *"habrán bloqueado `conecta` como bloquearon `comenta`"*. Medido en 2 minutos:

| hace | comentarios | qué lleva en el TEXTO |
|---|---|---|
| **20 h** | **311** | `conecta` + `comenta` + `gratis` |
| 1 d | **497** | `conecta` + `gratis` |
| 3 d | **1.380** | `conecta` + `comenta` + `gratis` + `acceso libre` |
| 3 d | **457** | `conecta` + `comenta` + `gratis` |

**Cuatro posts en tres días con `conecta`, de 311 a 1.380 comentarios. Hipótesis muerta**, y sin tocar nuestro post.
- **Guillermo Flor no siempre sirve:** sus 15 últimos son noticias de IA, cero lead magnets. **Un referente sin posts del pilar no es evidencia de nada**, ni a favor ni en contra. Se dice y se pasa al siguiente.
- 🔎 **Y salió un hallazgo lateral que hay que investigar aparte, NO en caliente:** Martín Arosa **ha vuelto a meter `comenta` en el TEXTO** (20 h · 311💬 y 3 d · 1.380💬), justo lo que `§4.5.0-CTA` dio por muerto el 05/08. Si se confirma, esa sección se revisa. **No se toca a mitad de una crisis.**

**⛔ POR QUÉ ESTO VA ANTES QUE BORRAR: borrar tiene coste medido.** El 06 y 07/08 resubimos tres veces y cada resubida fue **peor** que la anterior (67 → 19 → 163 impresiones). **Un borrado no devuelve el post al punto de partida**, así que la sospecha se confirma con datos ajenos antes de gastar esa bala.

#### 🚦🚦 4.5.0-CAPADO-RAPIDO · CÓMO SABER EN 45 MINUTOS SI NOS HAN CAPADO (Iker, 2026-08-18)

**El problema real, y es de decisión, no de análisis:** un post se sube a las 12, se tarda horas en despegar, y si te enteras tarde de que está capado ya has perdido la mejor franja del día. Iker, con el post recién subido: *"¿cómo puedo darme cuenta rápido de si estamos bloqueados o no?"*.

**🔴 LO PRIMERO, PORQUE ES LA LECTURA QUE FALLA: QUE SALGA EN "RECIENTE" NO DESCARTA EL CAPADO.** LinkedIn tiene dos feeds y no dicen lo mismo. **Reciente** es cronológico de a quién sigues y apenas pasa por el algoritmo, así que un post capado **también** sale ahí. **Principal** es el que decide el reparto. Mirar Reciente y respirar tranquilo es exactamente el error que hay que evitar. Y en Principal hay que mirar **a los 30-45 minutos**, no a los 3: a los 3 minutos casi nada ha entrado todavía.

**🛑🛑 EL INSTRUMENTO BUENO YA LO TENEMOS Y ES LA BANDA TÍPICA DE LA HERRAMIENTA, NO ESTE SEMÁFORO (Iker, 2026-08-18).** El Explorer pinta, para cada post, **`typical impressions at the same age` con su p25-p75 y su n**. Iker lo sacó de ahí en 10 segundos: su meme del 13/08 tenía **212 impresiones a los 38 minutos** con banda típica **174-278**, y **141 a los 22 minutos**. El lead magnet de hoy iba a **30 a los 11 minutos**, o sea **menos de la mitad de lo normal de su propia cuenta**.

**⛔ Y EL ERROR QUE ESTO CORRIGE ERA MÍO Y DE ESTE MISMO DÍA: yo comparaba contra el SUELO, no contra lo NORMAL.** Puse de vara los tres capados de agosto (19 impresiones en 1 hora) y concluí *"vas a 8 veces el ritmo de un capado, no lo borres"*. **Contra el suelo todo parece sano.** Iker: *"no me puedes decir que 30 impresiones no es raro"*. Tenía razón: el post estaba a menos de la mitad de su banda.

**LA REGLA, entonces:**
1. **Primero, la banda típica del Explorer** para esa cuenta y esa edad. Es específica de la cuenta, se actualiza sola y tiene n. **Es la única vara buena.**
2. **Por debajo de p25 a los 20-30 minutos → problema real**, aunque el número absoluto parezca decente.
3. **El semáforo de abajo se queda solo como red de emergencia**, para cuando no haya banda o no se pueda abrir la herramienta. **Detecta el capado extremo, no el post flojo**, y confundir las dos cosas es lo que casi nos hace dejar vivo un post muerto.
4. ⚠️ **Matiz honesto:** los lead magnets arrancan más lentos que un meme (`historial`, 20/07), así que la banda de la cuenta mezcla pilares. Aun así, **la mitad de p25 no lo explica el pilar**.

**📉📉 LA SEÑAL MÁS FINA NO ES EL NÚMERO, ES LA PENDIENTE (Iker, 2026-08-18).** Las dos versiones del mismo post, el mismo día, la misma cuenta y la misma foto:

| | 7 min | 10-11 min | 20 min | impresiones por minuto |
|---|---|---|---|---|
| **BLOQUEADA** (con `conecta conmigo`) | 20 | 30 | 40 | 2,9 → 2,7 → **2,0 · va frenando** |
| **SANA** (sin la línea) | — | **56** | — | **5,6 · el doble en el mismo minuto** |

**Una publicación bloqueada no arranca baja: DESACELERA.** LinkedIn se la enseña a un puñado, no le funciona con ellos y deja de repartirla. Una sana mantiene el ritmo o lo sube. **Por eso dos medidas separadas 10 minutos valen más que una sola**, por muy pronto que la tomes: una foto fija no distingue "empieza lento" de "le han cortado el grifo", y la pendiente sí.

**CÓMO SE USA, en 12 minutos:** anota impresiones a los 7-8 minutos y otra vez a los 18-20. **Si la segunda medida da MENOS impresiones por minuto que la primera, está capada.** Si da igual o más, está viva. Iker lo resumió así al comparar las dos versiones: *"ya lleva 56 impresiones en 10 minutos, o sea, más que antes en muchísimo más tiempo"*.

**EL SEMÁFORO DE EMERGENCIA, con nuestros propios números y no con sensaciones:**

| impresiones a los 60 min | veredicto | evidencia |
|---|---|---|
| **< 100** | 🔴 **capado, se borra** | los 3 de agosto: 19 en 1 h · 67 en 24 h · 163 |

**⚠️ Y OJO CON LEER EL SEMÁFORO A LOS 7 MINUTOS, QUE ES CUANDO MÁS MIEDO DA (Iker, 2026-08-18).** El post de `riendas` tenía **20 impresiones a los 7 minutos** e Iker lo dio por bloqueado. **No cuadra con el patrón:** un capado de verdad hizo **19 impresiones en UNA HORA**. 20 en 7 minutos es ~170 al ritmo de la primera hora, o sea **nueve veces el ritmo de un capado**. **El umbral es por HORA y se lee a la hora**; extrapolar los primeros minutos asusta y hace borrar posts sanos.
| 100-300 | ⚠️ dudoso, esperar a las 3 h | — |
| **> 300** | ✅ reparto normal | el 12/08 llegó a 2.092 |

**LAS DOS PRUEBAS DE APOYO, por orden de coste:**
1. **La cuenta ajena.** Alguien que **NO siga** a la cuenta busca su nombre y mira si el post aparece en el perfil y en su Principal. Si a un no-seguidor no le sale ni entrando al perfil, es señal dura.
2. **Unipile, en 10 segundos y sin depender de nadie:** `GET /users/{provider_id}/posts?account_id=…&limit=4` devuelve `reaction_counter`, `comment_counter` y `repost_counter` del último post con su antigüedad. **No da impresiones**, así que no sustituye al semáforo, pero **sí distingue un post muerto de uno vivo**: el de `riendas` tenía 1 reacción, 2 comentarios y 1 repost **a los 6 minutos**, y los capados de agosto no tuvieron nada parecido.

**⛔ Y LA DECISIÓN QUE CUELGA DE ESTO: el calentamiento manual del equipo se gasta DESPUÉS de pasar el semáforo, no antes.** Iker no compartió el post en el chat de la empresa hasta comprobarlo, y es lo correcto: **avisar al equipo de un post que no se está repartiendo es quemar la única palanca manual que tenemos.**

**⚠️ `conecta` NO es sospechoso, ya está probado dos veces.** `(Conecta conmigo para que pueda escribirte)` iba en el 12/08 (2.092 imp · 71💬) y en el 14/08, los dos posteriores al bloqueo del 05/08, y ninguno se capó. Antes de sospechar de una palabra, **míralo en el corpus** (`brand-voice §2c`): es la misma lección que con `prompt`.

#### 🔥 4.5.0-CALENTAR · ANTES DE SUBIR, LA CUENTA COMENTA EN OTROS POSTS (Iker, 2026-08-18)

**Iker, contándolo de pasada al ir a publicar:** *"ya he comentado con su cuenta en otras publicaciones para revivir su cuenta antes de subir algo"*.

**No es un truco suelto, es parte del lanzamiento del pilar que más depende del reparto.** El diagnóstico de agosto es que el copy y el CTA están resueltos y **el cuello de botella es el alcance** (`§4.5.0-CTA-IMAGEN-MEDIDO`: 2.036 impresiones con 71 comentarios). Una cuenta que lleva días sin actividad arranca fría, y el lead magnet **no tiene motor de reposts ni de risa**: si no hay comentarios en las 3 primeras horas, no hay nada que lo salve (`outliers §4.48`).

- **Se hace ANTES de subir**, no después.
- **Comentarios sustanciosos en posts del nicho con buen alcance**, con las reglas de `brand-voice §7.2`: 3-4 líneas, referencia específica al post, nunca "gran post".
- **Encaja con lo que ya sabíamos por el otro lado:** los comentarios que HA HECHO alguien son nuestro filtro duro para mencionarle (`CLAUDE.md`, Unipile). Lo que pedimos a los demás nos lo aplicamos.

**⚠️ Y al medir el post, esto es contexto:** si un lead magnet arranca mejor de lo esperado, parte del mérito puede ser el calentamiento y no el copy. Anótalo en el historial junto al resultado.

#### 🏃🏃 4.5.0-RITMO · EL LECTOR VIENE A POR EL BLOQUE NUMÉRICO: SE LLEGA EN 3 LÍNEAS (Iker, 2026-08-18)

> **Mario:** *"igual que en el mapa la gente quiere llegar rápido al bloque numérico para validar la región, en el lead magnet quiere llegar rápido para saber qué incluye. Priorizaría uno de dos antes que uno de tres"*.

**LA REGLA: entre el gancho y la lista numerada caben COMO MUCHO 3 líneas**, y esas 3 son o líneas individuales o **un bloque de DOS**. Nunca un bloque de tres, por buena que sea su anáfora.

**Por qué, y es el mismo motivo que en el mapa (`§4.2`):** el bloque numérico **es** la promesa del post. En el mapa el lector baja a comprobar si está su región; aquí baja a ver qué trae el recurso. Todo lo que se interponga es peaje, y el peaje se paga con scroll.

**⚠️ Y HAY UN AGRAVANTE QUE NO TIENE EL MAPA:** desde `§4.5.0-CTA-IMAGEN` la instrucción de comentar vive en la foto, así que **mucha gente decide sin haber leído el cuerpo entero**. El cuerpo ya no es donde se cierra la conversión, es lo que evita perderla. Iker: *"que nunca un usuario pueda decir: el gancho me ha encantado, pero el cuerpo es tan largo que me da pereza"*.

**LO QUE ESTO CORRIGE DE `global §3.2`:** ahí el bloque de tres es un recurso de ritmo válido en cualquier sitio. **En este pilar, antes de la lista, no lo es.** Después de la lista sí.

**⛔ Y DESPUÉS DE LA LISTA HAY QUE ROMPER EL RITMO, QUE ES DONDE FALLÉ (Iker, 2026-08-18).** Aligeré la entrada y dejé **seis líneas individuales seguidas** detrás del bloque numérico. Iker: *"después del bloque numérico todos son líneas individuales. Eso es un ritmo superpredecible, así que corrígelo y que esto no vuelva a pasar"*. **Acortar la entrada no es excusa para que la salida se lea plana:** el lector que sigue leyendo después de la lista es el que más cerca está de pedirte el recurso, y una fila de sueltas le da permiso para irse.
- **La cola del post lleva al menos DOS bloques múltiples**, y ahí **sí vale el de tres** con su anáfora (`No va de… / No va de… / No va de…`), que además es el molde de nuestro 632c (*"Ya no va de:"*).
- **La forma que quedó:** `1-1-2-1 · lista · 1-1-3-1-1-1-2-1`. Entrada corta y de dos, cola con un tres y un dos.

**⚠️ Y OJO CON EL EFECTO SECUNDARIO, que me costó dos intentos:** al quitar bloques de la entrada, el ritmo se vuelve `1-2-1-2` y salta el check de **ciclo que se repite**. No se arregla añadiendo bloques a la entrada (rompería esta regla): se arregla **dándole densidad a la cola**.

**🔧 Y EL VALIDADOR IBA EN CONTRA, así que se ha cambiado.** Su check `RITMO: al menos un bloque de TRES` excluía las listas del recuento y por tanto **empujaba a meter un bloque de tres en prosa**, justo lo que esta regla prohíbe. Desde el 18/08, en `--pilar leadmagnet` **la lista numerada de 3 o más líneas ya cumple la densidad** y no hace falta ningún otro bloque de tres. Los demás pilares no cambian.

#### 👀 4.5.0-REFERENTE-OBSERVADO · LO QUE HA CAMBIADO MARTÍN AROSA, Y LO QUE NO COPIAMOS (2026-08-18)

> ⛔ **Esto es una OBSERVACIÓN, no una receta.** Se anota para detectar hacia dónde se mueve el nicho, **nunca como permiso para recuperar lo que nos capa.** Iker, el mismo día: *"yo no quiero poner en mi publicación conecta ni comenta, por mucho que lo haga él. Siempre tenemos que priorizar nuestros datos, y nuestros datos dicen que si ponemos eso no salimos en el feed"*.

**LO QUE NO SE COPIA, y es innegociable:** él sigue usando `conecta` y `comenta` en el texto (316💬 hace 21 h, 497💬 hace 1 d, 1.380💬 hace 3 d). **A nosotros eso nos capa, medido dos veces.** Es asimetría de confianza de cuenta (`brand-voice §2c`), no una contradicción: **los datos que mandan son los nuestros** (`global §0-DATOS`).

**LO QUE SÍ MERECE LA PENA MIRAR, porque es de MECÁNICA DE ENTREGA y no de CTA:** sus dos posts que funcionan de las últimas 24 h **ya no entregan el recurso por privado**. Cierran con *"lo estoy compartiendo en mi comunidad privada y gratuita, +1.300 profesionales"*. Ha movido el destino del DM a una comunidad.
- **Por qué nos interesa el dato:** nuestro cuello de botella de entrega es que desde el 17/08 no agregamos a nadie, así que a quien no es contacto **el recurso solo le llega si él manda la solicitud** (`§4.5.-3`). Una comunidad no tiene ese peaje.
- **Y Daniel Matias apunta al mismo sitio por otro camino:** hace 50 minutos, 20 comentarios, **cero peticiones en el texto** y cierre con `♻️ Repost`.
- **Los dos han salido del "comenta y te lo mando por privado".** Puede que lo que esté envejeciendo no sea una palabra, sino el mecanismo entero.
- **⚠️ Sin decisión tomada.** Montar comunidad es un proyecto, no un cambio de copy. Se anota para revisarlo cuando toque, no para improvisarlo.

#### 🧿🧿 4.5.0-FIRMA · LOS 4 INVARIANTES QUE HACEN RECONOCIBLE UN LEAD MAGNET (Iker, 2026-08-18)

> **Para qué existe esto:** LinkedIn nos ha tumbado ya dos elementos del CTA, `comenta` el 05/08 y `conecta conmigo` el 18/08, y **las dos veces el clasificador se quedó codificando la regla muerta** y metió el post en el pilar equivocado. Iker: *"busca un patrón en nuestros últimos lead magnets pese a todas las prohibiciones de palabras, y fíjalo tanto en receta como en detección de pilar"*.

**LOS CUATRO. Van SIEMPRE, en el último tercio del texto, y son inamovibles como `exporta` en el mapa:**

| # | invariante | ejemplo | por qué no lo pueden prohibir |
|---|---|---|---|
| 1 | **Una PREGUNTA que ofrece el recurso** | `¿La quieres?` | ofrecer no es pedir una acción de plataforma |
| 2 | **Decir que se comparte GRATIS** | `La estoy compartiendo gratis para quien la pida.` | medido: 15 posts nuestros con `gratis`, mediana **3.884** impresiones contra 3.371 del corpus, y está en el gancho de nuestro **#2** histórico |
| 3 | **NOMBRAR el entregable** | `una guía` · `el sistema` · `los 3 prompts` | es la cosa que regalas. Un lead magnet sin entregable nombrado no existe |
| 4 | **CERO enlaces en el cuerpo** | — | ya era regla del pilar, calcada de los referentes |

**⛔ POR QUÉ LOS CUATRO Y NO DOS, QUE ERA LA PROPUESTA INICIAL.** Iker propuso quedarse con la pregunta y el `gratis`, que son los que van en todos. **Medido sobre los 258 posts de las 3 cuentas y no vale:** solo con esos dos hay **4 falsos positivos**, y tres son MAPAS, que también cierran con pregunta y con la palabra gratis. Añadiendo el entregable bajan a 2; añadiendo el "sin enlace" baja a **1**, y el que queda es un post de 2025 archivado como `otro`.
- **El discriminador que más aporta es el enlace**, y es puro sentido: **el mapa SIEMPRE cierra con su enlace y el lead magnet NUNCA lleva ninguno.**
- Tiene razón en que 3 y 4 dependen del post, **y por eso se fijan aquí como obligatorios**: si el entregable se nombra siempre, el detector no falla nunca. **La detección no se arregla adivinando mejor, se arregla escribiendo siempre igual.**

**🔧 Mecanizado en `backend/src/services/pillar.ts`**, en `pideConectar`: `pregunta && gratis && (entregable || conecta conmigo) && sin enlace`. `conecta conmigo` se queda como ALTERNATIVA al entregable, no como requisito, para que los posts viejos no se caigan del pilar al reclasificar.

**📌 Y LA REGLA DE MÉTODO, que es la que se ha roto dos veces:** cuando una prohibición de LinkedIn nos obliga a quitar un elemento del CTA, **en el mismo turno se mira el clasificador**. No es una tarea aparte ni para mañana: el pilar es lo que ordena el histórico, y un post mal clasificado envenena las medianas con las que decidimos la semana siguiente.

#### ⛔⛔⛔ 4.5.0-CTA-CERO · NINGUNA PETICIÓN EXPLÍCITA DE ACCIÓN EN EL TEXTO. NUNCA MÁS (Iker, 2026-08-18)

> **Esta sección MANDA sobre todo lo que hay debajo.** `§4.5.0-CTA` y `§4.5.0-CTA-IMAGEN` se leen ya con esta regla puesta.

**LO QUE PASÓ, medido en la misma tarde y en la misma cuenta:**

| versión | qué llevaba el texto | resultado |
|---|---|---|
| 1ª subida | `(Conecta conmigo para que pueda escribirte)` | **40 impresiones en 20 minutos** · no aparecía en el feed de ninguna de las 4 cuentas |
| 2ª subida | **sin esa línea** y sin `Acceso libre` | **apareció en el feed Principal de las 3 cuentas de los jefes en 4 minutos** |

**Es el mismo patrón que `comenta` el 05/08, y ya van dos veces.**

**LA REGLA: el texto del post NO pide NINGUNA acción de plataforma al lector.** Ni comentar, ni conectar, ni compartir, ni guardar, ni seguir, ni etiquetar, ni repostear. **La familia entera, no una lista de palabras**, porque lo que se persigue es la petición, no el verbo concreto.

**⭐ EL PORQUÉ, que es de Iker y es lo que hace la regla PREDECIBLE en vez de supersticiosa:** *"al final estamos aprovechando un exploit. Si pides explícitamente que la gente haga algo, te sube el engagement, y el engagement de la primera hora es lo que hace que el algoritmo te recomiende más"*. **LinkedIn no persigue la palabra: persigue la petición, porque infla artificialmente la única señal con la que decide el reparto.** Por eso da igual qué sinónimo uses, y por eso la lista negra se define por INTENCIÓN.

**⛔ Y SE APLICA AUNQUE LOS REFERENTES LO SIGAN HACIENDO.** Martín Arosa usaba `conecta` y `comenta` en el texto el mismo día con 316 y 497 comentarios. **No es contradicción, es asimetría de confianza de cuenta** (`brand-voice §2c`): lo que una cuenta grande se puede permitir, la nuestra no. Iker: *"pese a que las referencias lo hagan"*. **Se mira a los referentes para detectar CAMBIOS de mecánica, no para copiarles los permisos.**

**DÓNDE VIVE AHORA LA PETICIÓN, que no desaparece, se muda:**
1. **La palabra a comentar → en el BANNER de la imagen.** LinkedIn todavía no lee el texto de las fotos. Iker: *"seguro que en el futuro también nos lo prohibirán, pero de momento no tiene tanta inteligencia"*. Cuando eso cambie, se vuelve a mover.
2. **🔴 La petición de solicitud de contacto → en la RESPUESTA a cada comentario.** Es obligatorio y es lo que más fácil se pierde: desde el 17/08 no agregamos a nadie (`§4.5.-3`), así que sin esa frase **el que comenta y no es contacto se queda sin recurso**. Literal:
   > `Nombre` ahí va. LinkedIn no me deja escribirte si no somos contacto, mándame solicitud y te la paso.
3. **La pregunta directa (`¿La quieres?`) y `gratis` se QUEDAN en el texto.** No piden una acción de plataforma: ofrecen. Y `gratis` está en el gancho de nuestro nº2 histórico (483💬) con mediana de 3.884 impresiones en 15 posts.

**🔧 Mecanizado y VOLTEADO el mismo día:** el check del validador que **exigía** `(Conecta conmigo…)` ahora lo **prohíbe**, junto a toda la familia. Al hacerlo me colé dos bytes `0x08` en las regex y **lo cazó el autochequeo del propio script**, que existe justamente por el mismo fallo del 06/08. La red funcionó.

#### 🚨🚨 4.5.0-DATOS · EL CAPADO DEL 19/08 ERA DECIR QUE HABÍAMOS TRANSCRITO UNA LLAMADA (Iker, 2026-08-20)

> **CERRADO con un test de UNA SOLA VARIABLE, y la hipótesis era de Iker.** El mismo meme, con las **3 conjugaciones de `transcribir` cambiadas por `apuntar`** y **todo lo demás intacto**, salió a la primera: apareció en el feed nada más subirlo (`§4.5.0-FEED`). Se cambió una cosa y solo una.

**El recorrido, con mis dos hipótesis muertas por el camino:**

| hipótesis | de quién | veredicto |
|---|---|---|
| La doble puerta (2 enlaces) | mía | ⛔ **refutada** — el meme de Asier del 20/08 lleva los mismos dos enlaces y se repartió |
| `coger` sin objeto (vulgar en América) | mía | ⛔ **refutada** — el resubido que voló **lleva `coge` dentro, sin tocar** |
| `transcribir` y familia | **Iker** | ✅ **confirmada** |

**⚠️⚠️ Y AHORA LO QUE MÁS IMPORTA, PORQUE CONFUNDIRLO NOS CUESTA POSTS: LA PALABRA NO ESTÁ PROHIBIDA.**

| post | cómo aparece | imp |
|---|---|---|
| 05/06 | `6️⃣ **Grabar la llamada**` — ítem de una lista de herramientas del sector, **infinitivo, impersonal** | **165.526** · 12.05x ← **nuestro mayor meme** |
| 08/05 | `Sintetizar **12 transcripciones** de discovery` — plural, sin artículo | 4.082 |
| 24/09 | `recibirás **la grabación**` — la de nuestro propio webinar | 967 |
| **19/08** | `**La transcribo** igual` · `**La transcripción** es mentira` — **primera persona, y publicando el documento** | **133** |

**LA REGLA, y es de mecanismo, no de vocabulario:** lo que capa es **reclamar en primera persona que hemos grabado o transcrito una conversación con un tercero**, y encima enseñar el documento. Eso LinkedIn lo lee como **tratamiento de datos de un tercero sin su consentimiento**, y lo decide ANTES de repartir. Iker: *"interpretan que estamos haciendo algo ilegal o peligroso a nivel de derechos de los usuarios, de sus datos, protección de datos"*.

- ✅ **Impersonal o de terceros pasa:** `Grabar la llamada` (infinitivo, en una lista) · `las herramientas de transcripción` · `12 transcripciones`.
- ⛔ **Primera persona no pasa:** `la transcribo` · `grabé la llamada` · `mi transcripción` · `la grabación de esa reunión`.
- **Los sinónimos que ya usamos y funcionan:** `apuntar` · `dejar por escrito` · `pasar a papel` · `copiar`. **⛔ `grabar` NO sirve de recambio**: grabar una llamada es más delicado que transcribirla, no menos.
- **La foto sí puede llevar la palabra**, y es donde debe vivir: LinkedIn **no lee la imagen** (`§4.5.0-CTA-IMAGEN`). El rótulo `TRANSCRIPCIÓN LITERAL DE UNA LLAMADA EN FRÍO` se quedó intacto y el post voló. **Motor viral en la foto, texto limpio para el clasificador.**

**🆕 FAMILIA 7 de `brand-voice §2c`: DAR A ENTENDER QUE MANEJAMOS DATOS O CONVERSACIONES DE TERCEROS.** Es la familia más peligrosa que tenemos **porque es la que roza lo que vendemos de verdad** (encontrar empresas y personas). Y no es nueva del todo: `§4.5.0a punto 3b` ya decía que *"`me da el nombre` gana a `me encuentra a quien`, porque `encontrar a alguien` roza el registro de rastrear personas"*. **Ese instinto estaba escrito hace dos semanas sin mecanismo; ahora lo tiene y está medido.**
- **El test, antes de entregar:** *¿esta frase, leída por un abogado y sin contexto, suena a que hemos cogido datos de alguien que no nos los dio?* Si sí, se pasa a impersonal o se cambia el verbo.
- **Mecanizado:** fallo duro para la primera persona (`transcribo`, `grabé`…) y aviso para `la transcripción` / `la grabación`. Verificado que **falla el post capado, pasa el resubido y pasa el de 165.526**.

**🔴 LA LECCIÓN DE MÉTODO, que ya son tres capados y tres aciertos suyos:**
1. **Iker ha acertado las tres veces apostando por el TEXTO** (`comenta`, `conecta conmigo`, `transcribir`). Yo he fallado tres veces buscando la explicación estructural: el logo de la imagen (07/08), la doble puerta y `coger` (20/08). **Cuando un post se capa al segundo de subirlo, la causa está en el texto, y la discusión debe empezar ahí.**
2. **El diferencial de vocabulario contra el corpus es necesario pero no suficiente.** Me dio los cuatro candidatos correctos (`transcribir`, `transcribo`, `transcripción`) y yo los descarté por parecerme inocentes. **La lista se ordena por MECANISMO —¿qué riesgo legal ve una máquina aquí?—, no por lo que a mí me suene mal en español.**
3. **Y el corpus se mira ENTERO antes de escribir la regla.** Si hubiera escrito "transcribir está prohibida" me habría cargado el patrón de nuestro mayor meme. **La palabra casi nunca es la regla: la regla es la forma de decirla.**

#### 🕵️ 4.5.0-FEED · EL DIAGNÓSTICO DE PRIMER NIVEL ES EL FEED, Y ES DE IKER (2026-08-18)

> 🔝 **LO CANÓNICO DE CAPADO VIVE AHORA EN `global-instructions §9` (2026-08-26).** Nos han capado un lead magnet, un meme y una historia, así que es de todos los pilares y no de este runbook. Aquí se queda el detalle operativo; **si algo choca, manda global §9**, que además fija el umbral en **10 minutos** y dice que **el corpus histórico NO vale para preguntas de moderación**.

**Por delante del semáforo de impresiones y de la banda del Explorer, va este, porque es el más rápido: recién subido el post, se abre el feed Principal desde otra cuenta y se mira si aparece.**

- **Aparece en pocos minutos** → comportamiento normal, el algoritmo lo está distribuyendo.
- **No aparece pasados 10-15 minutos en NINGUNA cuenta** → algo va mal, y hay que actuar antes de perder la franja.

**Es un instrumento suyo y le ha funcionado las dos veces**: en agosto con `comenta` y el 18/08 con `conecta`. Iker: *"llevo meses que en cuanto subo una publicación me interactúo conmigo mismo, y que esté recargando el feed y no me aparezca me demuestra que me han bloqueado, porque nunca me ocurre"*. **Gana al semáforo de impresiones porque no hay que esperar a que se acumulen.**

- **⚠️ Ojo: "Reciente" no vale**, es cronológico y ahí sale hasta un post capado. **Solo cuenta "Primero los más relevantes"** (`§4.5.0-CAPADO-RAPIDO`).
- **📏 Y a partir de ahora se ANOTA el dato:** en cada publicación, **cuántos minutos tarda en aparecer en Principal desde otra cuenta**. Con 5-6 posts hay línea base y la hipótesis de la "cola de revisión" pasa de intuición a número.

##### 🔕🔕 4.5.0-SIN-AVISO · LINKEDIN NO AVISA, ASÍ QUE LA AUSENCIA DE AVISO NO ES INFORMACIÓN (Mario, 2026-08-26)

> **Iker, con un post recién subido y sin aparecer en el feed:** *"me he ido a las analíticas desde la cuenta del primer jefe y no hay ningún tipo de aviso, y nunca veo avisos en LinkedIn. En otras plataformas como TikTok, si subes algo y te lo banean, sale el aviso"*.

**Es un detalle operativo pequeño y ahorra media hora de búsqueda inútil:** en TikTok un contenido restringido te lo dice; **en LinkedIn no hay ninguna pantalla que te avise de que un post no se está repartiendo.** Ni en las analíticas del post, ni en notificaciones, ni en el perfil.

**LAS DOS CONSECUENCIAS, y las dos se fallan:**
1. **No pierdas tiempo buscando el aviso.** No existe. Lo único que hay es el comportamiento: feed, banda típica y pendiente (`§4.5.0-FEED`, `§4.5.0-CAPADO-RAPIDO`).
2. **⛔ Y "no hay ningún aviso" NO significa que esté todo bien.** Los tres posts capados de agosto tampoco tuvieron aviso. **La ausencia de aviso es el estado normal en las dos situaciones**, así que no es evidencia ni a favor ni en contra: es ruido.

##### ⏳ 4.5.0-REVISION · LA HIPÓTESIS DE LA COLA DE REVISIÓN (Iker) — ⚠️ n=0, SIN UN SOLO DATO ANOTADO

**La hipótesis, en sus palabras:** un post puede tardar un rato largo en aparecer en Principal y **luego aparecer de golpe y repartirse con normalidad**, como si LinkedIn lo hubiera tenido en una cola de revisión. *"El otro día me asusté igual y pasados no sé cuántos minutos de repente ya me salió"*.

**Está escrita desde el 18/08 y el instrumento también, y aun así no tenemos NI UN número apuntado.** Ese es el fallo: la hipótesis no avanza porque el dato se toma en caliente, cuando nadie está para apuntar.

**LO QUE HAY QUE APUNTAR, en la ficha del historial de CADA post:**
- **minutos hasta aparecer en Principal** desde una cuenta que no sigue a la que publica,
- si **apareció de golpe** o fue subiendo,
- y **qué llevaba de nuevo** ese post (imagen distinta, enlace distinto, parámetros, formato nuevo).

**Con 5-6 posts se sabe si la mediana es de 2 minutos o de 20, y solo entonces un retraso significa algo.** Hoy, sin línea base, **un post que tarda 15 minutos no se puede distinguir de uno normal**, y por eso el susto se repite cada vez.

**🔍 EL CANDIDATO DEL 26/08, dicho como lo que es — una sospecha con una coincidencia detrás:** ese post es **el primero de los 267 del histórico que lleva parámetros UTM en el enlace** (comprobado en el corpus). No hay ninguna evidencia de que eso active una revisión, y a favor de que sea inocuo está que **LinkedIn mete UTMs en sus propios enlaces de compartir** (`utm_source=social_share_send`). **Pero es la única variable nueva, así que si el retraso se repite en los siguientes posts con UTM y no en los que no lo llevan, ahí está la respuesta.**
- ⛔ **Lo que NO se hace: quitar los UTM en caliente.** Sin línea base no habría contra qué comparar, y encima perderíamos la única forma de atribución que tenemos. **Se miden los siguientes.**

#### 🚨🚨 4.5.0-CTA · EL "COMENTA LA PALABRA" DEJÓ DE FUNCIONAR EL 5 DE AGOSTO DE 2026

> **Esto es lo que estuvo capando nuestros lead magnets toda la semana del 03/08, y no era ninguna palabra.** Cuatro publicaciones borradas y resubidas cambiando gancho, cuerpo entero, imagen, y quitando `prompt`, `ÚLTIMA HORA`, `destapa`, `firma`, `regalo` y hasta la foto. **El problema nunca estuvo en el texto: estaba en el MECANISMO.**

**LA PRUEBA, en la cuenta de Martín Arosa (el mayor del nicho, medido el 2026-08-10):**

| fecha | comentarios | ¿pide comentar la palabra? |
|---|---|---|
| 13/07 → 31/07 | 527 · 1.032 · 970 · 1.072 · 1.233 · 1.398 · **1.254** | **SÍ** |
| **03/08** | **7** | SÍ |
| **04/08** | **41** | SÍ |
| 05/08 → 10/08 | **543 · 402 · 483 · 145** | **NO, en ninguno** |

**Sus dos últimos posts con gate sacaron 7 y 41 comentarios viniendo de 1.254, y desde el 05/08 no lo ha vuelto a usar.** Nuestro capado es del 06/08: justo en la bisagra.

**⛔ REGLA NUEVA: el lead magnet YA NO PIDE "Comenta la palabra X".** Todo lo escrito en `§4.4` sobre la palabra clave, el 2º dato, que la palabra se entienda sola o que no esté quemada **queda EN SUSPENSO** mientras dure esto. No se borra por si vuelve a servir, pero no se aplica.

**✅ EL CTA QUE SÍ FUNCIONA AHORA, calcado de sus tres últimos:**
```
¿Quieres [el recurso]?

Lo estoy compartiendo de forma gratuita.
Acceso libre.
(Conecta conmigo para que pueda escribirte).
```
- **Una PREGUNTA directa** en vez de una orden. La gente comenta igual porque quiere el recurso, y el comentario sale de ellos, no de una instrucción.
- **`gratis` / `de forma gratuita` SÍ se usa**, y sin miedo: lo lleva en dos de sus tres últimos.
- **`(Conecta conmigo para que pueda escribirte)` vuelve**, entre paréntesis y al final. Yo lo había quitado el 06/08 diciendo que era un segundo CTA; con el gate fuera **ya no compite con nada**, y él lo lleva en los tres.
- **Sin enlace en el post.** Ninguno de los suyos lo lleva.

**🔴 LA LECCIÓN DE MÉTODO, que es más cara que la regla:** estuvimos una semana buscando *qué palabra* nos penalizaba, y **cambiando variables de una en una sobre nuestro propio post**. Lo que resolvió el caso en 10 minutos fue **mirar la línea temporal del referente y ver QUÉ CAMBIÓ ÉL Y CUÁNDO**. Cuando algo deja de funcionar de golpe y no sabemos por qué, **lo primero no es auditar nuestro texto: es mirar si el mejor del nicho cambió de mecánica, y en qué fecha.**

#### 🚨🚨 4.5.0-CTA-IMAGEN · EL "COMENTA X" VUELVE, PERO DENTRO DE LA FOTO (Iker, 2026-08-12)

**El workaround que Iker cazó y yo no:** el 11/08 detecté que Martín Arosa había dejado de pedir la palabra. **Lo que no vi es DÓNDE la había metido: en la IMAGEN.** LinkedIn clasifica el TEXTO del post, no lee la foto, así que el gate sobrevive escondido ahí y el texto queda limpio para el algoritmo.

**La evidencia, medida por Unipile el 2026-08-12:**

| post | comentarios | texto | imagen |
|---|---|---|---|
| Martín Arosa 11/08 (sistema n8n) | **1.321** | pregunta + acceso libre + conecta conmigo, **cero "comenta"** | banner inferior oscuro: 💬 *Comenta "SISTEMA" y te lo envío por mensaje privado*, palabra en color |
| Martín Arosa 10/08 (guía Claude Code) | 289 | ídem, cero "comenta" | mismo banner: *¿Quieres esta guía completa? Comenta "HOJA"…*, palabra en naranja |
| Daniel Matias (`dmtiass`) 11/08 (Claude MCP LinkedIn) | 249 | cero CTA de comentario (cierra con repost) | franja amarilla arriba: *Connect + Comment "MCP" for access* |

**LA RECETA, desde hoy:**
1. **El TEXTO no cambia** respecto a `§4.5.0-CTA`: pregunta directa + gratis + conecta conmigo. Ni una aparición de "comenta" en el cuerpo (el validador lo sigue vigilando como fallo duro).
2. **La palabra clave va DENTRO de la imagen**, en un banner al pie (o franja arriba, como Daniel Matias), con la palabra destacada en color y **entrecomillada**. Va **en el prompt del diseñador**, y es la pieza clave de ese prompt.
   - **⭐ EL LITERAL ES DE UNA SOLA LÍNEA, Y SIN "POR MENSAJE PRIVADO" (Iker, 2026-08-18):** `Comenta "palabra" y te la envío`. Antes calcábamos las dos líneas de Martín Arosa. Iker: *"lo de comenta abajo se podría condensar en una sola línea y quitarlo de por mensaje privado"*. **Y de paso quita un problema:** `por mensaje privado` es **familia 5 de riesgo** en `brand-voice §2c` (sacar gente a privado). Se gana en compacidad y en riesgo a la vez.
   - **⭐ Y EL PRONOMBRE CONCUERDA CON CÓMO LLAMAMOS AL RECURSO EN EL POST, no con la palabra "recurso".** Si el cuerpo dice *"lo he metido en una **guía**"* y *"**¿La** quieres?"*, el banner dice **`te la envío`**. Poner `te lo envío` deja al lector leyendo dos géneros para la misma cosa en la misma pantalla. Si se quiere el masculino, lo que se cambia es el post (`el sistema`, `el recurso`), nunca solo el banner.
3. **Las reglas de la PALABRA de `§4.5.0a` punto 3b siguen vivas** (se entiende sola, es la tesis, sin tilde, no gastada) — aunque en la imagen las referencias la ponen en MAYÚSCULAS y así se calca. La herramienta debe filtrar el comentario sin distinguir mayúsculas.
4. **Esto reactiva el motor del pilar** (el comentario-peaje) que el CTA de solo-pregunta había dejado cojo: la pregunta invita, el banner da la instrucción exacta.

**⚠️ El validador NO ve la imagen:** por eso hay un AVISO fijo en `--pilar leadmagnet` recordando que el "comenta" vive en la foto y que hay que comprobarlo en el prompt del diseñador antes de entregar.

#### 🧩🧩 4.5.0-COMPLEMENTO · EL TEXTO DE LA IMAGEN COMPLEMENTA AL DEL POST, NO LO REPITE (Iker, 2026-08-18)

**La regla del meme aplicada aquí, y resuelve un problema que yo estaba arreglando por el camino caro.** En el meme el texto de la imagen nunca calca el del post: lo complementa. **En el lead magnet reeditado eso es exactamente lo que permite estrenar concepto en el gancho sin tocar la web.**

**El caso:** el post estrena `riendas` y el recurso publicado sigue diciendo `llaves`. Yo propuse un addendum para que el programador cambiara el H1 del gate, la meta, la OG y la card. Iker lo paró: *"significan lo mismo, son sinónimos, variedad, complementario. Yo creo que no hace falta que el programador lo toque"*.

**Y tenía razón por partida doble:**
1. **El puente lo hace la propia foto.** El lector ve `riendas` en el gancho y `llaves` en el banner **a la vez, en la misma pantalla**, así que llega al gate con la palabra ya reconocida. El salto no existe.
2. **Cero trabajo nuevo.** Reeditar un recurso vale la pena porque es barato; si cada cambio de concepto obliga a repasar seis campos de la web, deja de serlo.

**⛔ ESTO MATIZA `lead-magnet-web §2`**, que pide que el H1 del gate sea el gancho casi palabra por palabra. **Sigue en pie cuando el recurso se construye a la vez que el post.** En una REEDICIÓN, donde el gancho estrena concepto a propósito, basta con que **la palabra del banner sea la del gate**: es ella la que hace de puente, no el gancho.

**La consecuencia práctica, para no dudar nunca más:** el gancho lleva el concepto NUEVO; **la imagen y la web llevan el concepto VIEJO**, que es el que ya está indexado y construido. Y no se toca nada.

**⛔ Y ESTO NO ES SOLO DE LA PALABRA DEL BANNER: ES DE TODO EL TEXTO DE LA FOTO (Iker, 2026-08-18).** Lo escribí pensando en el CTA y por eso dejé la **cabecera** de la imagen calcando el gancho, con `riendas` saliendo dos veces en la misma foto. **La cabecera es otro texto complementario**, con su ancla de ventas y **sin ninguna palabra en naranja**, que la naranja es una por imagen y en este pilar va en el CTA. Los tres checks del título están en `images §0h-COMPLEMENTO`.

#### ⛔⛔ 4.5.0a · LOS INAMOVIBLES DEL LEAD MAGNET (Iker, 2026-08-05). Igual que `exporta` en el mapa.

**1 · EL GANCHO: DOS PIEZAS VALIDADAS, Y LO ÓPTIMO ES LLEVAR LAS DOS A LA VEZ.**

🥇🥇 **LA ESTRUCTURA CAMPEONA ES LA SUMA: `[DISPARADOR] + CLAUDE + [VERBO PUNCHY] + [resultado de VENTAS]`** (Iker, 2026-08-05). Los cinco lead magnets nuestros de Claude, por comentarios:

| c | cuenta | gancho | disparador | Claude+verbo |
|---|---|---|---|---|
| **632** | Unai | `🚨 ÚLTIMA HORA: Claude acaba de matar el cold outbound…` | ✅ | ✅ |
| 285 | Unai | `Le pasé las llaves de mi LinkedIn a Claude…` | — | ✅ |
| 232 | Iker | `Le tiré las llaves de mi LinkedIn a Claude…` | — | ✅ |
| 183 | Iker | `Claude me ha ayudado a cazar miles de leads…` | — | ✅ |
| **167** | Unai | `🚨 ÚLTIMA HORA: Claude ha reducido toda mi prospección…` | ✅ | ✅ |

**El #1 y el #5 llevan las dos. Y el disparador es además lo que usan sin falta Martín Arosa y Guillermo Flor: eso es DOBLE validación, dentro y fuera de casa.** No es redundancia, es la máxima garantía que sabemos comprar. Con una pieza el post pasa; con las dos se repite la estructura exacta del mejor que hemos hecho nunca.

- **⭐ UNA SOLA MARCA DE RECIENTE, NO DOS (Iker, 2026-08-07).** `🚨 ÚLTIMA HORA`, `ahora` y `acaba de` **dicen exactamente lo mismo**, y nuestro 632c llevaba DOS a la vez (*"🚨 ÚLTIMA HORA: Claude ACABA DE matar…"*). Con una basta. Y de las tres, **`ahora` es la única que no imita una alerta de noticias**, así que es la que se usa cuando queremos la sensación de novedad sin la señal de sensacionalismo. Iker lo vio al quitar ÚLTIMA HORA tras dos posts capados: *"decir última hora, decir ahora o decir acaba de es lo mismo"*.
- **⭐ Y LA NOVEDAD SE COMBINA CON LA PRIMERA PERSONA, no la sustituye.** `Claude ahora TE encuentra…` es un anuncio de función y es la familia de Martín Arosa; `Claude ahora ME encuentra…` es un experimento y es la nuestra —los 4 mejores nuestros sin alarma hablan de lo que me pasó A MÍ—. Una letra de diferencia y cambia de familia.
- **PIEZA 1 · EL DISPARADOR.** `🚨 ÚLTIMA HORA` · `⚰️ D.E.P.` · `BREAKING` · `🚨 ADIÓS`. **Rota**, pero alguno tiene que haber.
- **PIEZA 2 · CLAUDE + VERBO.** `Claude acaba de [verbo]` · `Claude ahora [verbo]` · `Claude me ha [verbo]` · `Le di/pasé/tiré las llaves a Claude` · `Hoy [verbo]…` · `Cada semana…`.
- **⚠️ EL ERROR QUE ESTO CORRIGE (Iker, 2026-08-05):** yo tenía esto escrito como dos moldes **rivales** ("el nuestro" vs "el de ellos") y basta-con-uno, y llegué a recomendar quitar el disparador *porque era de fuera*. Es falso: el disparador está en nuestro #1 y en nuestro #5. **Antes de declarar que un patrón es "de ellos", míralo en nuestra tabla.**
- **⚡ EL VERBO ES LA MITAD DEL GANCHO, Y VA ITERADO (Iker, 2026-08-05).** Mira los de nuestros cinco mejores: **matar** (632c) · **desmontar** (483c) · **tirar** las llaves (232c) · **cazar** miles de leads (183c) · **pasar** las llaves (285c). Todos **punchy y visuales**, ninguno de relleno. Iker: *"me centraba en refinar al máximo los hooks, y la clave era el verbo punchy"*.
  - **Se itera con la escalera de `§2.9` y se para en el peldaño con techo.** Para "encontrar a quien decide": `encontrar` → `localizar` → **`destapar`** → `desenterrar`. Se queda en destapar: `encontrar` es de relleno y `desenterrar` se pasa.
  - **Fíjate en que `matar` sí valía**: la escalera no prohíbe lo fuerte, prohíbe lo gratuito. `Claude acaba de matar el cold outbound` es nuestro mejor lead magnet.
- **⭐ Y NUESTROS GANCHOS SÍ LLEVAN `👇`**, aunque Martín Arosa y Guillermo Flor no lo usen: tres de nuestros cinco mejores lo llevan y otro usa `↓`. **Manda lo nuestro** (`global §0-DATOS`).
- **⭐ CLAUDE VA DELANTE si se puede.** Dos de los cinco abren literalmente con la palabra (`Claude acaba de matar…`, `Claude me ha ayudado a cazar…`). Es lo primero que lee el que quiere la herramienta.
- **En los dos moldes:** `CLAUDE` no se toca, el remate es un resultado de VENTAS, ≤90 caracteres y cero cifras.
- **El disparador ROTA**: `🚨 ÚLTIMA HORA` · `⚰️ D.E.P.` · `BREAKING` · `🚨 ADIÓS`.
- **`CLAUDE` NO SE TOCA.** Va nombrado en la primera línea, siempre.
- **El remate es un resultado de VENTAS**, no una capacidad de la herramienta.
- ≤90 caracteres · cero cifras · sin `👇`.
- Validado: *"🚨 ÚLTIMA HORA: Claude ya te dice a quién le tienes que vender"* (66 car).

**LA PRUEBA, de nuestras propias cuentas:** los **cinco** lead magnets nuestros con Claude pasaron de **100 comentarios** (632 · 285 · 232 · 183 · 167). Mediana con IA **167**, sin IA **20**. **Ocho veces más, y en este pilar el comentario ES la conversión.**

**2 · EL POST ES UN EXPERIMENTO EN PRIMERA PERSONA, NO UN PAQUETE.** Esto es lo que perdimos en junio y explica el desplome de 208 a 18 comentarios en un mes.
- **Lo que funcionaba (abril-mayo):** *"Le pasé las llaves de mi LinkedIn a Claude y nunca había cerrado tantas reuniones"* · *"Claude me ha ayudado a cazar miles de leads"* · *"Hoy desmonto perfiles en directo"*. **Todos son: YO hice X, me pasó Y, te doy lo que usé.**
- **Lo que dejó de funcionar (junio-julio):** `nuestro arsenal volcado` · `la biblia de ventas` · `la lista definitiva de 15 empresas` · `una auditoría de tu web`. **Todos son paquetes.** Nadie pide un paquete: piden lo que le funcionó a alguien.
- **🔴 Y de aquí sale una obligación práctica: el experimento tiene que ser REAL.** Si el post dice "le di X a Claude y pasó Y", **Iker lo tiene que haber hecho de verdad**, aunque sean 20 minutos con 10 empresas. Sin experimento no hay post: se cambia el ángulo, no se inventa el resultado.

**3 · UN recurso, genérico, el mismo para todos, y la captura la hace el GATE de la landing.**

**3b · ⭐ LA PALABRA DEL CTA ES UN CARTEL PÚBLICO, NO SOLO UN FILTRO (Iker, 2026-08-07).** Cuando el hilo se llena, cualquiera que pase ve doscientos comentarios con esa palabra. **Si se entiende sola, el propio hilo vende el post; si es opaca, no dice nada.** Iker: *"si ahora ves moviendo comentarios con la palabra cierra, no vas a saber de lo que va"*.
- **El test:** léela sin el post delante. ¿Se entiende? ❌ `cierra`, `vibe`, `frase`. ✅ `nombre`, `perfil`, `llaves`.
- **La mejor palabra es la TESIS del post.** El del 07/08 dice *"el problema es el nombre"*, así que la palabra es `nombre` y el gancho la incorpora: *"Claude ahora me da el nombre de quien cierra la compra"*. Los tres criterios a la vez: se entiende sola, es la tesis, y reconecta con el gancho.
- **Y `me da el nombre` gana a `me encuentra a quien`** (Iker): es más concreto —promete algo que puedes pegar en un buscador— y baja el riesgo, porque `encontrar a alguien` roza el registro de rastrear personas.
- **⛔ Gastadas en todo LinkedIn, no valen aunque nosotros no las hayamos usado:** `guía`, `plantilla`, `info`, `quiero`, `dame`, `pdf`, `link`, `gratis`. No distinguen nuestro post de los otros doce del feed. Mecanizado en el validador.

**4 · ⛔ LAS PROMESAS DEL CUERPO SE VERIFICAN COMO SE VERIFICA UNA CIFRA (Iker, 2026-08-05).** Se me coló *"te saca su nombre y su perfil **sin pagar una herramienta**"* en un post sobre cómo encontramos nosotros a los decisores. **A esa persona la encontramos con Sales Navigator y Unipile, y los dos se pagan** (Unipile: 49 €/mes mínimo, 7 días de prueba). Es la misma familia de mentira que inventarse una empresa, con el agravante de que **la desmonta el propio lector en cuanto lo intenta**, y encima ese lector es el que acaba de dejarnos el correo.
- **NUESTRO STACK REAL, para contrastar contra él:** Claude · LinkedIn Premium (las 3 cuentas) · Sales Navigator · Unipile · nuestro backend. **Todo menos Claude a secas se paga.**
- **Di lo que el prompt SÍ hace, no lo que te ahorra.** ❌ *"te saca su perfil sin pagar nada"* → ✅ *"te da el filtro exacto con el que buscarla en LinkedIn"*.
- **El experimento tiene que ser reproducible por el lector con lo que le dices que hace falta.** Si para reproducirlo necesita Sales Navigator, o se dice, o se cambia el prompt.
- Mecanizado: el validador falla ante `sin pagar` · `sin herramienta` · `no necesitas pagar` · `sin suscripción` y similares en el cuerpo de un lead magnet.
- **Y de aquí, la longitud de la lista: números IMPARES (Iker, 2026-08-05).** Al caerse el prompt falso quedaban 5 en vez de 6 y **mejor así**: 5 y 7 rinden más que 4 y 6 en lista numerada. Si al quitar algo te queda par, quita otro o añade otro.

**5 · EL CTA PIDE LA PALABRA **Y UN SEGUNDO DATO** (medido en los nuestros, 2026-08-06).** Iker dudaba porque la competencia pide una sola palabra y porque nuestro #1 (`vibe`, 632c) también. Los diez nuestros con más comentarios dicen lo contrario:

| | posts | mediana comentarios | mediana impresiones |
|---|---|---|---|
| **Con 2º dato** (483 · 285 · 183 · 167) | 4 | **234** | **11.638** |
| Solo palabra (632 · 232 · 177 · 129 · 104 · 65) | 6 | 153 | 8.522 |

**Un 53% más de comentarios pidiendo el dato.** La hipótesis de Iker, que explica el porqué: 600 comentarios idénticos (`vibe`, `vibe`, `vibe`) le huelen a LinkedIn a coordinación y nerfea el alcance; el segundo dato los hace todos distintos. Datos usados: `+ tu sector` · `+ tu departamento` · `+ tu emoji favorito`. **El dato tiene que servir para responderle**: el `+ tu mes de cumpleaños` no servía para nada y flopeó a 0.57x.

**6 · PALABRAS VETADAS EN LA MARCA PERSONAL DE IKER: `descargar`, `instalar`, `gratis` (Iker, 2026-08-06).** En LinkedIn **no nos penalizan** —medido: `gratis` sale en 15 posts con mediana de 3.884 impresiones contra 3.371 del corpus entero, y está en el gancho de nuestro **#2** (*"Hoy desmonto perfiles de LinkedIn gratis"*, 483c)—. **Así que `gratis` se usa sin miedo.** `instalar` (3 posts) y `descargar` (1) no tienen muestra que las defienda y casi siempre sobran: *"No hay nada que montar"* dice lo mismo. El validador las marca como aviso, no como fallo.

#### ⭐⭐ 4.5.0b · EL MODELO GENÉRICO — PATRONES DE MARTINA ROSA Y GUILLERMO FLOR (Iker, 2026-07-24)

🎯 **ESTE PILAR SE MIDE CONTRA ELLOS, NO CONTRA NUESTRO HISTORIAL (Iker, 2026-07-24).** No tenemos la estrategia de lead magnet pulida como los mapas o los memes: casi no hay datos de éxito nuestros, así que **NO te fíes de nuestros flops** (ni de las reglas que salieron de ellos). El único dato interno fiable es el **9.85x de Unai**, que además usó ESTE formato (última hora + temática tipo IA, parecida a la suya). La **vara de medir de TODA la publicación —hook, cuerpo E imagen— son Martín Arosa y Guillermo Flor.** Es el pilar más valioso para conversión (captura correos → email marketing) y hay que recuperarlo. El validador `--generico` ya mide contra ellos: hook (corto ≤90, sin cifras, sin 👇, con alarma) y cuerpo (lista numerada + largo); la imagen, la captura del recurso (punto 6).

**🔎 CÓMO ELEGIR REFERENCIAS: el signo es COMENTARIOS DISPARADOS, mín ≥500 (Iker, 2026-07-24).** Igual que el meme se elige por % de RISA, el lead magnet se elige por nº de COMENTARIOS (es comment-gated: la gente comenta la palabra). **Piso: ≥500 comentarios** (ellos sacan 1.000-9.600; con <100 no interesa). Fuente = sus feeds en vivo por Unipile (`GET /users/{pid}/posts`, filtra `comment_counter>=500`); nuestra BD `/api/analysis/cross-creators` vino VACÍA, no sirve. **Los 3 referentes del sector (estúdialos, no solo 2 posts):**
- **Martín Arosa Otero** (`martinarosaotero`): **34 posts ≥500c, top 6.128c**. Formato estrella: `🚨 D.E.P. [categoría], ADIÓS. 🚨` (alarma a los DOS lados) y `🚨 ÚLTIMA HORA: [Claude/GPT] ahora puede [X]`. Usa `↳` para presentar el recurso.
- **Guillermo Flor** (pid `ACoAABBit2ABCYNySanEgukvlFBH-HcIKGlWHu8`): `I turned [X] into AI Skills 🔥`, `BREAKING: [news]`, `The [X] Playbook 🔥` (bold).
- **Luna Chen** 🐝 (@QuickGen/Beeze AI, pid `ACoAACZ9ZkcBl_c6lvWcyXAVnyI2ukNM7u7sYjY`): **9.626c en el top**. **La más cercana a NOSOTROS: va de VENTAS puras** (SDR con IA, outreach, GTM, prospección, "get clients"). Sus hooks SÍ se atan a un resultado de VENTAS y petan → **el ancla de ventas SÍ funciona en este pilar** (responde el miedo de Iker: sí conviene atarlo a ventas).

**EL CUERPO REAL, calcado del top de Martín Arosa (2.477c):** hook → intro al recurso + `(guarda esto)` → `¿El problema?` + **`❌ lo malo` / `✅ lo bueno`** (con esos emojis) → `Ahí es donde [la IA] cambia el juego` → **LISTA NUMERADA** de lo que hay dentro → **reframe de valor punchy** (*"el cliente no compra tu perfil, compra lo que entiende de ti en 5 segundos"*) → recap del recurso (*"listos para copiar, pegar y aplicar hoy"*) → **CTA: `Comenta "X" y te lo envío por privado. Conecta conmigo`** (una palabra + "conecta" para poder mandarle el DM, que necesita 1er grado). Ojo: Martín Arosa a veces SÍ mete cifras en el hook ("39 llamadas en 5 días"); nosotros NO (preferencia de Iker), pero que conste que a ellos les funciona.

**NOMBRAR TERCEROS = CREDIBILIDAD, pero cuidado con la fuga (Iker, 2026-07-24).** Los tres nombran marcas concretas y eso da credibilidad: Guillermo (McKinsey, Claude), Luna (Clay, Phantombuster como enemigos a "borrar"), Martín (Claude, GPT-5). Lo específico se cree; lo genérico suena a vapor. **Pero ellos nombran AUTORIDAD o herramientas, no "un proveedor al que podrías ir en vez de a mí".** Cuando el tercero es un PARTNER de servicio (ej. la consultora que gestiona la subvención, Ikale Consulting): (a) nómbralo UNA vez, EN EL CUERPO, nunca en el gancho; (b) enmárcalo como **"nuestro partner X"** —no "contacta a X"— para que Neety siga siendo la puerta y no te salten al proveedor directo; (c) el nombre tiene que ser REAL y bien escrito (verifícalo). El plus de credibilidad ("esto es real, no humo") suele ganar a la fuga, que es pequeña porque el camino de menos esfuerzo sigue siendo comentar la palabra.

**Son los dos que MÁS comentarios sacan del sector, y REPITEN lo que funciona (como nosotros con los mapas).** Martín Arosa hizo el mismo lead magnet dos semanas seguidas —misma foto, casi el mismo hook (solo cambió mayúsculas y quitó el emoji final), cuerpo reescrito un poco— y sacó **1.033 comentarios** una semana y **788 en <24h** la siguiente. Guillermo saca **2.014** con el mismo molde. **Nuestro error era dejar de hacer el gancho de última hora / adiós / D.E.P. y encima personalizar de más.** El validador ya tiene el flag `--generico` para este modelo (salta el check del 2º dato). Los patrones, medidos sobre sus posts:

1. **⭐ CLAUDE VA NOMBRADO EN EL GANCHO, NO SOLO EN EL CUERPO (Iker, 2026-08-05).** Si el recurso es de Claude, **la palabra Claude aparece en la primera línea**, corta y con ancla de ventas. Yo entregué *"⚰️ D.E.P. escribirle al que no decide"*, que es punchy pero **no dice de qué va el recurso**, y en este pilar el lector comenta porque quiere ESA herramienta. **Lo que rota es el disparador** (`🚨 ÚLTIMA HORA` / `⚰️ D.E.P.` / `BREAKING`), no la mención de Claude. Y el dato que lo sostiene: nuestros lead magnets con IA sacan **mediana de 167 comentarios contra 20** los que no la llevan.
1. **HOOK — disparador + tema de IA en tendencia. Y CORTO.** Alarma (`🚨 ÚLTIMA HORA` / `⚰️ D.E.P.` / `BREAKING:` / bold + `🔥`) sobre lo ÚLTIMO de IA (skills, agentes, un modelo nuevo). El sujeto es el TRABAJO del lector (`§4.5.0`), no el modelo. Ej. real Martín Arosa: *"⚰️ D.E.P. prospección manual"* (4 palabras); Guillermo: *"BREAKING: [modelo] just made [X] accessible"*, *"I turned McKinsey frameworks into AI Skills 🔥"*, *"The one-person billion-dollar company 🔥"*.
   - **⭐ MECÁNICAS CONCRETAS DE SUS HOOKS (lo que me salté el 2026-07-24 y Iker me paró):** (a) **CORTO, de pocas palabras** — el validador `--generico` lo exige (≤90 car). (b) **CERO cifras** — los números (60%, 100.000€) van al CUERPO, nunca al hook (Iker lo odia). (c) **SIN `👇`** — ellos no lo usan; emoji de alarma al INICIO (`🚨`/`⚰️`) o `🔥` al final. (d) **Show don't tell + reveal retrasado** (el de arriba): da el shock, retrasa el quién/dónde. Fallo real: entregué *"🚨 ÚLTIMA HORA: hay una subvención que te paga el 60% de tu IA para vender más. Y casi nadie la pide 👇"* — largo, con 60% y con 👇, TODO lo contrario de lo suyo. Arreglado: *"🚨 ÚLTIMA HORA: tu próxima IA no la pagas tú"*.
2. **CUERPO MÁS LARGO QUE EL NUESTRO** (nos quedábamos cortos). La estructura, calcada de los dos: **setup/reframe** (una historia o un "el problema nunca fue X") → **malo → bueno** (a menudo con emojis) → **LISTA NUMERADA de lo que hay DENTRO del recurso** (1, 2, 3… los componentes concretos: "12 skills", "10 skills", los pasos) → **ancla de valor** (*"esto es lo que $2M/un asesor te cobraría"*).
3. **CTA — UNA palabra IGUAL PARA TODOS, sin 2º dato.** `Comenta "AGENTE"` / `Comment "CONSULTING"` / `Comment "SOLO"`. **NADA de pedir sector ni web personalizados**: todos comentan lo mismo. La palabra reconecta con el hook.
4. **UN recurso GENÉRICO, no personalizado y no varios.** Una guía / una biblioteca de skills, la MISMA para todos. Nuestro error doble: personalizar (cuesta tiempo y no hace falta) y regalar varios recursos a la vez. Uno, genérico, y basta.
5. **La captura la hace la LANDING (gate de correo), no el comentario.** Por eso el CTA no necesita 2º dato: el post consigue el comentario, y el correo/lead sale de la pequeña web con gate (`lead-magnet-web`). Sin gate, un lead magnet genérico regala y no captura (`§4.5.-2`).
6. **IMAGEN = el propio RECURSO, TODOS son Text+Photo (Iker, 2026-07-24; los 8 outliers de Luna son Text+Photo).** Nunca selfie ni meme: la foto ES la PRUEBA de que el recurso existe y es gordo. Dos moldes, ambos vistos en los tres:
   - **(a) PORTADA de una GUÍA en PDF, enseñada DENTRO del visor** (Martín Arosa, Guillermo): se ve el chrome del visor de PDF (miniaturas de páginas al lado, "1/28") → grita "esto es una guía real de 28 páginas". Portada editorial: **título serif gigante**, **logos de autoridad** (Claude/Anthropic + LinkedIn/McKinsey), y un **"Contenido" con índice numerado** (01-10) visible → prueba de que tiene chicha.
   - **(b) INFOGRAFÍA de una página** (Luna/Beeze): lista numerada (01-04) + sub-bullets con `↳` + **antes→después cuantificado** ("2 horas → 15 minutos") + logos de las herramientas + a veces avatares ilustrados (su org-chart del "SDR Team"). Cabecera y pie con su marca.
   - **Paleta común: crema/terracota editorial + serif (estilo Anthropic).** Nada de stock chillón.
   - **Para NOSOTROS:** portada de guía ("El 60% de tu IA subvencionado · SPRI · Euskadi") con índice de los 5 puntos, crema/serif, logos legítimos (Claude, SPRI/Gobierno Vasco), enseñada como PDF con sus miniaturas. Reutilizable entre posts de subvención.
7. **REPITE lo que funciona.** Si un tema+hook peta, se vuelve a hacer a las 1-2 semanas con cambios mínimos. No hace falta reinventar cada vez.

> ### 🎨 4.3-PLANTILLA · LA PLANTILLA DE "LOS 10" Y SUS COLORES (Iker, 2026-07-30)
> **Fichero:** `Documents/Mario/LINKEDIN GROWTH/PELOTEO REGIONAL/LOS 10/LOS 10 PLANTILLA.psd` (1254x1254). **La edita Iker, no yo.** Verificada el 30/07: 10 placeholders de texto con el literal `Nombre`, 378.240 px de huecos transparentes y el titulo en capa editable a 81,8 px.
>
> **⭐ El titulo lleva `XXX` como marcador de region**, igual que el del despiece. Antes tenia `LA INDUSTRIA ASTURIANA` escrito a fuego **y por eso la orla de Andalucia salio diciendo ASTURIANA** y hubo que rehacerla. `montar-orla.py --region ANDALUZA` lo sustituye solo.
>
> **🎨 Colores oficiales, de la PAGINA 23 del `docs/brandbook-neety-2026.pdf`. Esa es la fuente, NO los PSD:**
>
> | Color | Codigo | RGB |
> |---|---|---|
> | Berenjena | `#431b44` | 67, 27, 68 |
> | Naranja | `#fe8238` | 254, 130, 56 |
> | Mint claro | `#ebfff6` | 235, 255, 246 |
> | Azul bebe | `#a7c5f9` | 167, 197, 249 |
>
> **🔴 LOS PSD ESTAN DESVIADOS Y NO VALEN COMO REFERENCIA (Iker, 2026-07-30).** Muestreados el 30/07: franja `#461943` en vez de `#431b44`, fondo `#e6f6ef` en vez de `#ebfff6` y el naranja de "Los 10" en `#ee9363` en vez de `#fe8238`. **El origen:** la plantilla salio de un generador de imagen, los colores se movieron por el camino y cada copia lo ha ido arrastrando.
>
> **⚠️ Y me equivoque yo ANTES en esta misma seccion.** Al ver que el PSD no coincidia con mi memoria, di por hecho que el equivocado era yo y escribi aqui que los PSD mandaban. **Era al reves.** La leccion: cuando un fichero derivado contradice a la fuente, **se comprueba la FUENTE**, no se asume que la fuente esta obsoleta. El brandbook manda sobre cualquier PSD, plantilla o captura.
>
> El blanco del titulo esta en `#f9f3ef`, que **no aparece en la paleta**. En brandbook estricto seria el Mint claro `#ebfff6`.

#### ⭐⭐ 4.7 · Runbook DESPIECE / OBJETO — el 3er peloteo regional (Iker, 2026-07-30)

> **📬 LLEVA LOS DOS BLOQUES (`global §4.4e`).** Es el peloteo que **sí** admite el segundo bloque de correo, al contrario que el mapa (manda su ultra ninja) y que "Los 10" (el enlace ya convierte el homenaje en decorado de un anuncio, y dos lo duplican). Aquí hay cuerpo de sobra para intercalar: el de `agendar` en su sitio, ≥2 líneas de cuerpo, el de correo, y después todavía cuerpo y el cierre punchy.

**Qué es.** El tercer formato del pilar peloteo. El mapa pelotea EMPRESAS de una región, "Los 10" pelotea PERSONAS, y este pelotea **un OBJETO cotidiano despiezado**: cada pieza, la empresa de la región que la fabrica. **La prioridad es la EMPRESA**, como en el mapa, con la persona al lado. Estrenado el 2026-07-30 en la cuenta de Iker con Euskadi y el coche. Se valida con `--pilar objeto`.

> ### 🔎🔎 PASO 0 DEL DESPIECE · LOS GANCHOS PUBLICADOS SE SACAN DE LA BD ANTES DE ESCRIBIR (2026-09-15, a petición de Iker)
>
> **Lo mismo que se hizo con "Los 10" el 15/09 (`§4.3` Paso 1), aplicado aquí.** Antes de escribir una línea: `GET /api/creators/{id}/posts`, filtrar `pillar='peloteo_objeto'` y poner los ganchos publicados delante, ordenados por impresiones. **Se escribe MIRÁNDOLOS.**
>
> **🔴 Y LO PRIMERO QUE HAY QUE SABER: ESTE PILAR NO TIENE NI UN DATO LIMPIO. Son dos posts y los dos flopearon, pero NINGUNO por el gancho.**
>
> | fecha | cuenta | región | imp | ratio | gancho |
> |---|---|---|---|---|---|
> | 30/07 | Iker | Euskadi | **4.075** | 0.94x | `En el mapa es el sitio de comer: Guggenheim, chuletón y de vuelta al aeropuerto. Y ahí se hace tu coche 👇` |
> | 07/08 | Asier | Navarra | **1.273** | 0.46x | `Al felpudo del Pirineo lo archivan en toros, espárragos y nada más. Y exporta más piezas de coche que Montenegro entero 👇` |
>
> El de Iker se explica solo (perdió 3 de los 4 inamovibles, `§4.2`). **El de Asier los cumple los cuatro y aun así hizo 1.273**, y ahí es donde estaba el agujero de diagnóstico: llevábamos desde agosto diciendo "fue el mes". **No es el mes. Es la SATURACIÓN, y ahora está medida.**
>
> #### 📉📉 LO QUE DE VERDAD MANDA EN UN PELOTEO NO ES EL GANCHO, ES CUÁNTOS PELOTEOS HA HABIDO ANTES (medido el 2026-09-15 sobre los 22 peloteos publicados)
>
> Para cada peloteo se cuenta **cuántos peloteos de las TRES cuentas salieron en los 21 días anteriores**. El corte es monótono y no es sutil:
>
> | peloteos en los 21 días previos | n | mediana de impresiones |
> |---|---|---|
> | **0-3** | 12 | **39.310** |
> | 4-5 | 7 | 16.726 |
> | **6-7** | 3 | **2.360** |
>
> **Un factor 17 entre la banda limpia y la saturada.** Y los dos despieces cayeron justo ahí: el de Iker con **5** peloteos detrás y el de Asier con **6**, la segunda ventana más saturada de toda la historia del pilar.
>
> **La prueba sin ruido está DENTRO de una sola cuenta, la de Asier**, que hizo los tres posts con el mismo formato de peloteo y la misma baseline:
> ```
> 14/07  mapa Aragón      4 peloteos detrás  →  27.009 imp
> 07/08  despiece Navarra 6 peloteos detrás  →   1.273 imp
> 01/09  mapa Cantabria   0 peloteos detrás  →  13.021 imp
> ```
> **Mismo autor, misma mecánica, y lo único que se mueve con las impresiones es cuánta gente había visto ya un peloteo nuestro esa quincena.**
>
> ⚠️ **Lo que este dato NO dice, y hay que decirlo:** está confundido con el CALENDARIO (julio concentró 9 peloteos y es también cuando el feed se vacía) y con la NOVEDAD (abril fue el estreno del formato). No se puede separar con n=22. **Lo que sí se puede hacer es la consecuencia práctica, que es la misma en las tres lecturas: mirar la ventana antes de programar un peloteo.**
>
> **LA REGLA OPERATIVA, y va al Paso 1:** antes de elegir región, **cuenta los peloteos de las 3 cuentas de los últimos 21 días**. Con 4 o más, este pilar arranca cuesta arriba y hay que decirlo en la entrega; con 6 o más, se propone mover el post de día o cambiar de pilar.
>
> #### 🧬 LA ANATOMÍA DEL GANCHO PONE EL SUELO, NO EL TECHO (mismo corte, 2026-09-15)
>
> **Dentro de la cuenta de Iker, que es la única con 8 mapas, los cuatro inamovibles NO separan a los buenos de los malos:** Murcia (16.726) y Castilla y León (8.781) los llevan los cuatro, y Cataluña (48.866) **no lleva ninguno** — ni concepto, ni clichés, ni frase-rabia, y encima nombra la región en el gancho. Lo que separa a esos tres es la ventana.
>
> **Y aun así la fórmula no se toca, porque donde SÍ se ve es abajo:** los dos peores peloteos de Unai con ventana limpia son exactamente los dos que rompen la fórmula — el del 20/05 (`De día parece una tierra de oficinas`, **sin sujeto ajeno, sin clichés y sin país**: 5.311) y el "Los 10" de Cataluña (**reproche a las empresas**: 6.572). **La fórmula no te hace volar; no tenerla te hunde.** Por eso los cuatro inamovibles siguen siendo fallo duro y por eso este bloque no los relaja.
>
> #### ⛔⛔ LO QUE SÍ ES PROPIO DEL DESPIECE: EL PAÍS DE LA COMPARACIÓN TIENE QUE SER UN PAÍS **RICO Y CONOCIDO**, PORQUE EN PIEZAS NO GANAMOS A NINGUNO QUE HAGA COCHES
>
> **El problema es de tamaño y es estructural, no de redacción.** El remate del despiece mete el objeto dentro (`Y exporta más piezas de coche que [PAÍS] entero`, `§4.7` Paso 3), así que ya no comparamos exportación total contra exportación total: comparamos **partida 8708 contra partida 8708**. Y ahí una provincia española pesa poco:
>
> | | partes y accesorios de vehículos (HS 8708) |
> |---|---|
> | **Bizkaia** | **832,4 M€** (EUSTAT) |
> | Serbia | 958 M$ · Suiza 1.128 M$ · Portugal 3.569 M$ · Suecia 5.233 M$ (Banco Mundial/Comtrade) |
> | Noruega 540 M$ · Dinamarca 716 M$ · Bulgaria 449 M$ · Croacia 359 M$ · Grecia 153 M$ | |
>
> **Ningún país con industria de automoción de verdad queda por debajo con margen.** O sea que el país de la comparación va a ser SIEMPRE uno que no hace coches, y ahí es donde se cayó Montenegro: el lector nota que la comparación está ganada de antemano y el shock no llega.
>
> **LA SALIDA, y es la que se usa en el despiece de Bizkaia:** se elige un país **rico, famoso y del primer mundo** cuya falta de industria sea justo la ironía. **Noruega** es el caso perfecto — **96 de cada 100 coches nuevos que se matriculan allí son eléctricos, récord mundial (OFV)**, y aun así exporta la mitad de piezas que una provincia vasca. *(Deducción mía a partir de la tabla, `working-preferences §0c`: el corte de países está medido, que la ironía compense el tamaño no.)*
>
> **Y el procedimiento se queda igual de duro que en el mapa** (`§4.2` Paso 2): **partida contra partida**, fuente que publique ese país, y **margen de al menos el 15%**. Bizkaia contra Noruega son 832 M€ contra ~500 M€: **+66%**.
>
> #### 📏 LONGITUD Y FORMA, con lo poco que hay
> Los dos despieces publicados miden **105 y 121 caracteres**, dentro de la horquilla de los mapas (80-130). **Con n=2 no hay nada que deducir: manda la vara del mapa** (`global §2.10`, mediana 75-93 y sospecha por encima de 110).

**Paso 1 — OBJETO y REGIÓN.**
- El objeto tiene que ser **reconocible por cualquiera y despiezable**. El coche es el caso perfecto: todo el mundo tiene uno y da para 20 sistemas con proveedor distinto. Un aerogenerador sería más "nuestro" pero nadie tiene uno en el garaje.
- **La región se elige por IMPRESIONES, no por ratio.** Y **la región NO se quema entre formatos de peloteo**: el despiece es nuevo, así que puede repetir una región que ya hizo el mapa o "Los 10", incluso en la misma cuenta. Lo que sí va nuevo es el concepto, los clichés y la frase-rabia.
- **⛔ ANTES DE ELEGIR REGIÓN, CUENTA LOS PELOTEOS DE LOS ÚLTIMOS 21 DÍAS** (las 3 cuentas juntas, Paso 0 de aquí arriba). Con 4 o más, se dice en la entrega; con 6 o más, se mueve de día o se cambia de pilar. **Es lo único medido que explica los dos flops del pilar.**
- **🗺️ PAÍS VASCO, MEDIDO EL 2026-09-15: a nivel de PROVINCIA la automoción da para UN solo despiece más, y es Bizkaia.** Cruzando el universo de Sales Navigator contra las 721 entidades de `menciones-usadas.json`, **Gipuzkoa y Álava no llegan a 12** y **Euskadi entero ya está gastado** (despiece de Iker, 30/07). En Bizkaia se llega a 12, pero **solo 8 lo dicen en su propia descripción de LinkedIn**: las otras 4 (Lekun, IGESTEK, Plásticos Gernika y una más) hay que verificarlas **contra su web**, que es fuente válida por `§4.0` aunque el Paso 2 use la descripción por defecto. **Y el precio se dice en la entrega: son empresas pequeñas y solo 4 de las 12 tienen a alguien con cargo y actividad ≤6 meses.**
- **⚠️ Al fijar un sector el universo se estrecha muchísimo más que en un mapa**, que acepta cualquier industria. **Es el pilar con más riesgo de quedarse corto.** Medido el 30/07: Galicia daba 8 empresas y Euskadi 12. Si la región no llega a 10, se cambia de región, no se rellena.

**Paso 2 — LAS EMPRESAS, y aquí está el trabajo de verdad.**
- **⛔ SON 12 EXACTAS (Iker, 2026-08-07).** No es objetivo ni suelo: es el número. **La plantilla de la llanta tiene 12 huecos**, así que 11 deja un agujero vacío y 13 no cabe. El texto y la imagen son la misma pieza y aquí **el número lo manda la imagen**. Vale para el despiece de **cualquier objeto y cualquier sector**, no solo la llanta de automoción: cuando se cree la plantilla de otro sector, se crea con 12 huecos.
- ~~Objetivo 20, suelo 10.~~ (Era lo de antes, cuando la plantilla no estaba fijada.)
- **Descubrimiento: buscar PERSONAS, no empresas.** La página de LinkedIn de una empresa muestra su SEDE, no sus plantas: filtrando por localización de empresa se caen justo las grandes (Michelin dice Clermont-Ferrand aunque fabrique en Valladolid). Buscando personas con `keywords` de la planta salen las multinacionales con su gente real.
- **🔧 Y SI LA DESCRIPCIÓN NO DICE EL SECTOR, SE MIRA SU WEB ANTES DE DESCARTARLA (2026-09-15).** La regla de abajo existe para no INVENTAR, no para limitar la fuente a LinkedIn: `§4.0` acepta *"fuentes públicas con cita"*. En Bizkaia, 4 de las 12 empresas no nombran automoción en su ficha de LinkedIn y su propia web sí (Lekun: *"los sectores energéticos, eléctricos, automoción, naval"*). **Lo que no cambia: si ni la ficha ni la web lo dicen, la empresa se cae** — así se cayeron Tornillería Amezua (dice construcción, energía, agricultura y naval), FORMESA (eléctrico, valvulería y ferroviario) y Aceros Inoxidables Olarra.
- **Cada pieza se asigna contra la DESCRIPCIÓN de la propia empresa** (`GET /api/v1/linkedin/company/{slug}` da `description`), nunca por intuición. **El 30/07 esto evitó cinco errores factuales**: Copreci hace electrodomésticos, Orkli climatización de edificios, Goizper bancos de ensayo, Onapres prensas y la página de Grupo ELAY es de recursos humanos. **Si la descripción está vacía, la empresa se cae** (así se fueron Mecaner y Megatech).
- Las cuatro comprobaciones de mención del `§4.2` aplican enteras.

**Paso 3 — EL TEXTO.** Calca la estructura del mapa y cambia solo su firma:
- **Gancho:** misma fórmula que el mapa (concepto despectivo en palabra universal + EXACTAMENTE 2 clichés universales + frase-rabia) **y el mismo remate con `exporta` + país concreto**. El OBJETO no sustituye a `exporta`: **va DENTRO del remate**, que es lo que diferencia al despiece sin romper el ancla de ventas. Plantilla: *"Y exporta más [piezas de coche] que [PAÍS] entero 👇"*.
  - **🔴 ESTO ES UNA CORRECCIÓN, NO LA RECETA ORIGINAL (Iker, 2026-07-31).** Yo escribí ayer que *"el despiece remata con el OBJETO y esa sustitución es lo que evita canibalizar el mapa"*, y el despiece de Euskadi salió con *"Y ahí se hace tu coche"* en vez de `exporta`. **Está rindiendo peor.** Lo que diferencia al despiece del mapa **no es quitar `exporta`**, es el objeto, el despiece por piezas y la imagen de la llanta: con eso sobra para no canibalizar. Ver los CUATRO INAMOVIBLES en `§4.2`.
- **Ficha:** `→ La pieza: @Empresa - @Persona`. La pieza delante y los dos puntos son la firma del formato y lo que lo distingue del mapa en el clasificador.
- **Bloques de 4**, y si el número no es múltiplo de 4 el último es de 2 o de 3, nunca de 1. Nunca un 5 seguido de un 2.
- **Reveal tardío** de la región, después de la lista, con los clichés locales justo antes.
- **El final va en el orden del tronco común** (`§4.0d` puntos 5 y 6): reveal → barrido → contexto del evento si toca → bloque del enlace → cierre punchy que rebota contra el concepto.
- ⚠️ **NO importes la comparación con otro país.** Es la firma del mapa, igual que ya se decidió en "Los 10".

**Paso 4 — LA IMAGEN: plantilla de silueta + script.**
- 🔧 **RUTAS ACTUALIZADAS EL 2026-08-27:** la carpeta `LINKEDIN GROWTH/LOS 10/` ya no existe; los tres formatos viven ahora en **`LINKEDIN GROWTH/PELOTEO REGIONAL/`**, en `DESPIECE/`, `LOS 10/` y `MAPAS/`. Y la plantilla de la llanta se llama **`PLANTILLA AUTOMOCION.psd`**, no `PLANTILLA OBJETO.psd`. Con las rutas viejas el script aborta.
- **Idea de Iker:** la silueta del objeto más representativo del sector, con los **logos** repartidos por ella. En automoción, una **llanta** con los logos en la corona. Logos y no caras, porque este pilar prioriza la empresa.
- **La compone `scripts/montar-llanta.py`, no un generador.** Un modelo generativo rechaza logos de terceros por copyright y, si los acepta, los redibuja (`images §0i-2`).
- **⭐ Plantilla VIGENTE (desde el 2026-09-16): `Documents/Mario/LINKEDIN GROWTH/PELOTEO REGIONAL/DESPIECE/PLANTILLA AUTOMOCION v2.psd`** (1254x1254). Es la llanta **rellena de berenjena por fuera, con el centro y las 5 ventanas en menta** (la decisión de abajo). Franja berenjena con el título en capa de texto editable (`XXX` = región), y 12 huecos de logo **transparentes**: 7 de 165-166 px en la corona y 5 de 122 px en las ventanas. **El script no rellena nada: el relleno viene en el PSD.** Primer montaje: Bizkaia, 16/09 (`automocion bizkaia.png`).
  - ~~`PLANTILLA AUTOMOCION.psd`~~ (llanta solo de líneas; Euskadi y Navarra) y ~~`PLANTILLA AUTOMOCION vOLD.psd`~~ (la del 30/07) **ya no se usan**. Se conservan en la carpeta por si hay que remontar un post viejo.
  - 📐 **Mejora propuesta y aún sin aplicar:** subir los 5 huecos de las ventanas de 122 a ~150 px. En el móvil el logo de LEKUN no se lee, y las ventanas tienen sitio.
  - **Comando:** `python scripts/montar-llanta.py --plantilla ".../DESPIECE/PLANTILLA AUTOMOCION v2.psd" --logos <carpeta con 01- a 12-> --region VIZCAÍNA --salida ".../DESPIECE/automocion <region>.png"`. La región va en adjetivo y en mayúsculas (`VASCA`, `NAVARRA`, `VIZCAÍNA`), porque sustituye a `XXX` en *LA INDUSTRIA XXX*.
- **Los logos se bajan de Unipile** (`logo_large`) numerados en el orden del post: `01-acero.jpg`, `02-tubos.jpg`. Mismo procedimiento que el CSV del mapa, pero **aquí NO hay CSV**.
- **Una plantilla por SECTOR.** La llanta vale para automoción y se reutiliza en toda España y en las tres cuentas: solo cambia el título. Otro sector pide otra silueta.
- **El script ordena los huecos por ÁNGULO, como un reloj**, empezando arriba. Una orla se lee por filas, una rueda se lee como un reloj.
- **🟣 LA LLANTA VA RELLENA EN BERENJENA POR FUERA; EL CENTRO Y LAS VENTANAS SE QUEDAN EN MENTA (Iker, 2026-09-16). Lo trae la PLANTILLA nueva, no el script.** Se probaron tres rellenos sobre la plantilla de líneas:

  | qué se rellena | lo oscuro de la rueda | veredicto |
  |---|---|---|
  | nada (plantilla vieja) | 11% | ⛔ *"la veía como vacía"*: el círculo central parecía un hueco de logo que se nos había olvidado |
  | centro + 5 ventanas | 20% | ⛔ feo: seis manchas sueltas que compiten con los logos |
  | solo las 5 ventanas | 19% | ⛔ el centro se queda como el único círculo claro y parece todavía más un hueco |
  | ⭐ **la rueda grande, con centro y ventanas en menta** | 31% | ✅ **el elegido** |

  **Por qué gana, en palabras de Iker:** *"el morado es la silueta perfecta de la llanta"*, las ventanas en menta *"lo veo como algo mejor"*, y **los contornos de las ventanas y del centro se funden con el relleno y desaparecen**, así que el centro *"se nota que está hecho a posta y que no falta ningún logo"*. **La lección:** hay más superficie oscura que nunca, pero es UNA sola figura, no varias manchas, y el ojo la lee de golpe y pasa a los logos. Además, los discos blancos de los logos de fuera pisan el borde morado y se recortan con fuerza.
  - `montar-llanta.py --relleno` solo sirve para maquetas (pinta centro y ventanas, que es la versión descartada). **Con la plantilla nueva, el script no rellena nada.**
- **🎯 EL LOGO SE CENTRA IGUALANDO EL VACÍO DE ARRIBA Y DE ABAJO DENTRO DEL CÍRCULO (Iker, 2026-09-16).** *"tienes que fijarte muy bien en cada logo con el que trabajas, si es circular, si es cuadrado"*. El caso fue la "U" de TALLERES UNAMUNZAGA (ancha arriba, estrecha abajo), y costó dos intentos:

  | cómo se centraba | vacío arriba / abajo de la silueta | qué vio Iker |
  |---|---|---|
  | por la CAJA (lo de siempre) | **−22%**: más aire abajo | *"tiene más espacio por abajo"* ✅ |
  | por el CÍRCULO MÍNIMO (1er arreglo, retirado) | **+47%**: más aire arriba, y el logo más grande | *"te has pasado bajándolo, y lo has agrandado"* ✅ |
  | ⭐ **igualando el vacío** | **−2%** | — |

  - **La lección de método:** el círculo mínimo iguala el aire de las ESQUINAS, y el ojo compara el **vacío que queda entre el borde y la SILUETA del logo** (su contorno convexo, no píxel a píxel: el hueco entre los brazos de la U no cuenta como aire). Esa medida predijo las dos quejas de Iker antes de tocar nada, y por eso es la buena.
  - **La regla:** el TAMAÑO se calcula como siempre, y en horizontal se centra por la caja, como siempre. **Solo en vertical** se busca la posición que iguala el vacío de arriba y de abajo, sin que la marca se salga del círculo.
  - **🔧 Un bug destapado por el camino:** para decidir qué es logo, el script usaba "todo lo que no sea blanco puro", y el fondo CASI blanco de muchos JPG (Sidenor) contaba como logo. `_mascara_marca()` mide el fondo en el borde del logo, igual que el recorte.
  - **Prueba:** `python scripts/test-montar-llanta.py <carpeta de logos>` exige menos de un 10% de desequilibrio y que el logo no se salga del círculo. **Pasa en los 36 logos de los tres despieces (Euskadi, Navarra y Bizkaia), con el tamaño idéntico al de antes en los 36.** El script avisa en el montaje con la misma medida (`⚠️ descentrado en vertical`).
- **Los logos van CONTENIDOS, no recortados**, sobre un disco blanco. Un logo recortado pierde el nombre de la empresa, que es lo único que hay que poder leer.
- 🔴 **El desenfoque de postproducción va SOLO sobre la plantilla, una vez.** Las imágenes de cada región las compone el script y no llevan firma de generador, igual que "Los 10".

**OUTPUT FINAL de este pilar (SOLO esto, Iker, 2026-07-30):**
> ⛔ **SIN el aviso de desenfoque ni de exportar sin metadatos** (Iker, 2026-09-16): la imagen la monta `montar-llanta.py` sobre su plantilla, que ya lleva la postproducción hecha (`images §0a-penta`).
1. **El TEXTO** del post en bloque cercado, para copiarlo con el botón.
2. **La GUÍA DE MENCIONES**, en tabla markdown **fuera de bloque cercado** (si no, los enlaces no se pueden pulsar), con las 12 fichas **en el mismo orden que el post** y estas 4 columnas: **Pieza | Empresa (enlace) | Persona (enlace) | Cargo · última actividad**. Si la ficha no lleva persona, la columna dice **por qué** (nadie con cargo, o su última actividad a X días). Los enlaces salen de `public_identifier`, nunca del nombre (`§4.2` Paso 4). Los `|` de los nombres con tagline **se quitan en la tabla** (rompen las columnas); en el post van enteros. Mismo formato que la de "Los 10" (`§4.3`), fijado el 16/09 al entregar el despiece de Bizkaia.
3. **La IMAGEN** ya montada, **MOSTRADA en el chat** y **guardada en `Documents/Mario/LINKEDIN GROWTH/PELOTEO REGIONAL/DESPIECE/`** con la convencion de esa carpeta: minusculas, espacios y sin acentos, con el SECTOR delante (`automocion euskadi.png`, `alimentacion galicia.png`). El sector y no la palabra "objeto", que es jerga interna y no dice nada al abrir la carpeta (Iker, 2026-07-30).
4. **NADA MAS. Sin ZIP ni carpeta de logos** (Iker, 2026-07-30): los logos me los bajo yo para montar la imagen, asi que entregarlos es ruido. **Vale igual para "Los 10" con las fotos de las personas.** Lo unico que se entrega es la imagen final. La ruta se da igual, porque la necesita para subirla, pero la imagen se ensena. Vale lo mismo para "Los 10": si la compongo yo con un script, se ve aqui.

**Sin CSV, sin fotos de personas y sin Excel.** El mapa necesita CSV porque se dibuja un mapa; aquí no hay nada que importar.

#### ⭐⭐ 4.6 · Runbook HISTORIA PERSONAL / ANÉCDOTA (Iker, 2026-07-24)

> ### 📬 4.6-CORREO · ESTE PILAR LLEVA UNA SOLA PUERTA, Y ES `AGENDAR` (Iker, 2026-08-24)
> **🔴 AQUÍ PONÍA LO CONTRARIO Y ERA EL PEOR SITIO POSIBLE PARA LA SEGUNDA PUERTA.** Del 18/08 al 24/08 este runbook decía que la historia llevaba los dos bloques y que era *"el canario"*. Iker lo cierra: **una puerta por post, y en historia es la de `agendar`.** Razonamiento entero y el criterio por pilar, en `global §4.4e-PUERTA`.
>
> **Los dos motivos, y el primero manda sobre el segundo:**
> 1. **Coherencia.** Una historia se construye **entera** sobre el dolor que resuelve la herramienta, así que el enlace de agendar cae solo. El de correo habría que importarlo, y un dolor importado produce la frase de catálogo que `global §4.4b` prohíbe.
> 2. **Dato.** Este pilar tiene el **mejor CTR de la casa a `/agendar/`** (0,41% · 0,364% · 0,276%, `§4.6-MEDIDO`) contra el 0,022% del meme de más alcance del mes. Es poco alcance y mucha intención: **bajar ahí la puerta es cambiar una reunión por un suscriptor.**
>
> **Y encaja con la regla del UNO** (`global §4.5`), que lleva meses en la casa y que el lead magnet cumple sin discutir: ahí no va enlace **precisamente** para no partir su motor.
>
> **Lo que sí se sigue anotando al publicar:** los clics a `/agendar/` de cada historia, en `historial-publicaciones`. Es la serie que sostiene este pilar hacia dentro.

> ### 🎯 4.6-OBJETIVO · ESTE PILAR NO VA DE VIRALIDAD (Iker, 2026-07-29)
> **Léelo antes de escribir uno y antes de juzgar el resultado de uno.** Los demás pilares buscan alcance. **Este busca cercanía y naturalidad con la audiencia**, y son cosas distintas. Medir una historia por el multiplicador es medirla con la regla de otro pilar y concluir siempre que va mal.
>
> **Las dos ÚNICAS condiciones bajo las que una historia personal sí viaja** (apuntes de expertos que pasó Iker):
> 1. **Que seas conocido o autoridad.** Si lo eres, a la gente le interesa hasta lo que desayunas. Si no lo eres, a nadie le importa tu anécdota por sí sola. **Nosotros todavía no lo somos**, así que no contamos con esta.
> 2. **Que le haya pasado a muchísima gente.** Identificación masiva: el lector se ve a sí mismo, lo comparte con un amigo, comenta su propia versión y se monta debate. **Esta es la única palanca que está en nuestra mano**, y por eso la historia se elige por cuánta gente ha vivido eso, no por cuánto nos marcó a nosotros.
>    - ⭐ **AFINADO EL 2026-08-17 (`§4.6-NOSTALGIA`): no vale cualquier recuerdo compartido. El que más rinde es el de una ETAPA que se vivió CON alguien**, no el de una anécdota que le pasó a mucha gente por separado. Léelo antes de elegir la historia: cambia cuál eliges, no solo cómo la escribes.
>
> **Cómo se juzga un post de este pilar, entonces:** no por impresiones ni por ratio, sino por **calidad de conversación**. Comentarios en los que alguien cuenta SU caso · respuestas largas en vez de emojis sueltos · mensajes privados · guardados. Un 1x con quince comentarios personales ha cumplido su objetivo; un 3x con cero conversación, no.
>
> **Y no se mata el pilar por un mal ratio.** n=1 por cuenta. Se sigue probando **de vez en cuando, por variedad**, que es justo lo que pide la visión de futuro de aquí abajo (dejar de repetir los mismos 3 pilares en las mismas 3 cuentas). No es el caballo ganador y no tiene que serlo.
>
> **📌 ACTUALIZADO 2026-08-14 · lo de arriba sigue entero, con dos matices que sí cambian al planificar:** (1) ya hay **n=2 en Iker con números** (`§4.6-MEDIDO`) y el pilar aguanta 5.000-6.500 impresiones y el **mejor CTR de la casa**; (2) **durante agosto deja de ser "de vez en cuando" y pasa a ser SEMANAL** (`§8.0-AGOSTO`), porque ocupa el sitio del peloteo.
>
> **Registro del 29/07 (Iker, historia + peloteo):** apostado deliberadamente por la condición 2. El dolor elegido, *que te juzguen por ser joven*, lo ha vivido media audiencia, y el peloteo a 5 clientes reales aportaba la prueba que a nosotros nos falta por no ser conocidos todavía. **Es la mejor tirada posible con las cartas que tenemos.** Anota el resultado en `historial-publicaciones` mirando conversación, no solo el multiplicador.

> ### 📈📈 4.6-SERIE · LAS 6 HISTORIAS DE LA RECETA ACTUAL, CRUZADAS (BD en vivo, 2026-08-27)
> **Sustituye a `§4.6-MEDIDO` como fuente de números del pilar** — aquello eran los dos de Iker y se queda debajo por el histórico del razonamiento. Esto es la serie entera, y sale de `link_clicks_count` de la BD, no de memoria.
>
> | fecha | cuenta | imp | clics | **CTR** | car | el gancho abre con | puerta |
> |---|---|---|---|---|---|---|---|
> | 21/08 | Unai | 6.788 | **46** | **0,678%** | 694 | PROMESA (*jamás me imaginé*) | Luma |
> | 26/08 | Unai | 5.393 | 32 | **0,593%** | 762 | NEGACIÓN (*Nunca le vi*) | Luma |
> | 13/08 | Iker | 10.160 | 37 | 0,364% | 696 | ESCENA (*Le pregunté… me plantó*) | agendar |
> | 29/07 | Iker | 6.554 | **19** | 0,290% | **1.177** | negación, larga | agendar |
> | 25/08 | Asier | 13.045 | 36 | 0,276% | 725 | *Mi primera clase…* | agendar |
> | 18/08 | Iker | 12.472 | 33 | 0,265% | 706 | *Mi primera venta…* | agendar |
>
> **1 · ⭐ LOS CLICS SON UNA CONSTANTE Y LAS IMPRESIONES NO. Es el hallazgo que cambia cómo se escribe este pilar.** 32 · 33 · 36 · 37 · 46. Da igual que el post haga **5.393 o 13.045** impresiones: la historia entrega **~36 clics** siempre, y el techo medido está en 46. **O sea que aquí no se busca alcance, se busca que el que llega pulse.** Perseguir impresiones en este pilar no sube los clics, y es la confirmación cuantitativa de `§4.6-OBJETIVO`.
>
> **2b · 🔴 Y ESA LONGITUD SE MIDE CON EL ENLACE COMO LO VE EL LECTOR, NO COMO LO ESCRIBIMOS (2026-08-27).** Las cifras de la tabla salen de `char_count` de la BD, o sea del texto **YA PUBLICADO**, donde LinkedIn ha reescrito la URL a `lnkd.in/xxxxxxxx`: **24 caracteres** en el post del 26/08 y **25** en el `luma.com` pelado del 21/08. Desde que el UTM es obligatorio (`global §4.4b-UTM`, 26/08) la URL que nosotros escribimos mide **~156 caracteres**, así que medir el borrador en crudo compara contra una vara de otra unidad. **Un borrador de 729 caracteres de texto salía como 861 y fallaba el check**, empujando a escribir historias más cortas que el óptimo medido. **Mecanizado el 27/08:** `validar-post.py` normaliza cada URL a 25 caracteres antes de contar.
>
> **2 · ⛔ LA LONGITUD ES LO ÚNICO QUE ROMPE LA CONSTANTE, Y ES UN FALLO DURO.** El único que se sale hacia abajo (19 clics, **la mitad**) es el único que pasa de 800 caracteres: **1.177**. Los cinco que caen entre **694 y 762** dan todos 32-46. **El rango de trabajo del pilar es 700-780 caracteres**, y es estrecho a propósito.
>
> **3 · Los dos mejores CTR son los dos que apuntan a Luma**, con el doble de conversión que los cuatro de `/agendar/`. ⚠️ **Está confundido con la cuenta** (los dos son de Unai) y son n=2, así que no prueba nada por sí solo — **pero apunta en la misma dirección que el dato global de puertas**, que sí tiene tamaño: `luma.com` **0,692%** contra `/agendar/` **0,103%** en toda la casa. Con un evento vivo, la historia va a Luma.
>
> **4 · ⛔ NO SE ABRE CON "MI PRIMERA…".** Los **dos peores** CTR del pilar abren así (0,276% y 0,265%). Los dos mejores abren por **negación** (*Nunca le vi…*) o por **promesa** (*…jamás me imaginé…*). La explicación encaja con `global §2.0`: una escena cerrada no deja bucle abierto, y una negación o una promesa sí. **Con n=6 no es ley, es el patrón más limpio que tiene el pilar**, y se escribe aquí para poder tumbarlo con datos si aparecen.
>
> **5 · Lo que NO discrimina, dicho para que nadie lo persiga:** la **estructura** (`narrative_arc` está en el mejor y en los dos peores) y los **guardados/envíos** (3-6 y 3-7 en todos, sin señal). Las tres historias con `likes ≫ comentarios` cumplen la vara del pilar de `§8.0`.

> ### 📊 4.6-MEDIDO · LOS DOS DE IKER, CON NÚMEROS REALES (2026-08-14, sacados de la BD, no de memoria)
>
> | Fecha | Impresiones | Ratio | Likes | Com. | Reposts | Clics enlace | **CTR** |
> |---|---|---|---|---|---|---|---|
> | 29/07 (historia + peloteo) | 6.554 | 0.64x | 31 | 6 | 5 | 19 | 0,290% |
> | 13/08 (historia sola, Excel) | **8.500** | 0.84x | 34 | 10 | 4 | 35 | **0,41%** |
>
> 🔴 **Fila del 13/08 RE-MEDIDA el 2026-08-17, con el post ya asentado.** El 14/08 marcaba 5.023 imp · 0.51x · 26 clics · **0,518%**, y de ahí salió la frase "es el CTR más alto de la casa". **Al crecer el denominador el CTR baja a 0,41% y el mapa de Aragón (0,44%) le vuelve a pasar por delante.** Lo que NO cambia: sigue siendo el mejor CTR del pilar y casi dobla al 0,290% del 29/07, así que la regla del ninja de `global §4.4b-FORMA` se queda. **Y la lección de método vale para cualquier medición futura: un CTR tomado a las 24 h está inflado, porque los clics entran antes que las impresiones. Nada se declara récord hasta los 3-4 días.**
>
> **Se lee por los dos lados, y hay que decir los dos al planificar:**
> - **El ratio de los dos está por debajo de 1x**, o sea por debajo de la media de la propia cuenta de Iker. **Este pilar sigue sin ser de alcance** y `§4.6-OBJETIVO` sigue en pie entero. Lo que sorprende no es el multiplicador: es que **un pilar sin estructura ultra-validada, con la historia inventada cada vez, sostenga 5.000-6.500 impresiones** en vez de morirse en 1.000 como los lead magnets flojos.
> - **Lo que sí es un salto medido es el CTR: 0,290% → 0,518%, casi el doble, y con MENOS impresiones** (26 clics contra 19). Pasa de largo la vara de **0,4%** que se puso el 13/08 para juzgar el experimento del ninja, así que **la regla nueva de `global §4.4b-FORMA` (el ninja recicla el objeto y el verbo del gancho) + el enlace 518 posiciones antes SÍ aportan**, y se quedan.
> - ~~**Es el CTR más alto anotado en este historial**, por encima del mejor mapa (Aragón, 0,44%)~~ 🔴 **Corregido el 17/08: con el post asentado son 0,41%, justo por debajo de Aragón.** Sigue muy por encima del mejor meme (iMessage, 0,09%) y del propio 29/07. **Historia no es el pilar que más gente alcanza, pero sí de los que mejor convierten al que alcanza.**
> - **La conversación sube pero sigue corta:** 6 → 9 comentarios. Con la vara del propio pilar eso sigue siendo poco, así que la palanca a trabajar es esa, no el alcance.
>
> ### 💥 EL DATO QUE VENDE ESTE PILAR HACIA DENTRO (medido el 2026-08-18)
> **El mejor argumento que tenemos para el pilar, y hay que tenerlo a mano porque sirve para convencer a los jefes, no solo para planificar:**
>
> | post | impresiones | clics a la web | CTR |
> |---|---|---|---|
> | **historia** · Iker 13/08 | **9.275** | **36** | **0,388%** |
> | meme · Asier 12/08 (el de más alcance del mes) | **119.029** | 26 | 0,022% |
>
> **12,8 veces menos alcance y un 38% MÁS de clics.** No es que el meme sea malo — es el mejor post del mes y su trabajo es el alcance (`outliers §3.11`). Es que **son pilares con trabajos distintos, y el que trae gente a la web es este.**
> - **Cómo se usa al pedir recursos internos** (fotos, tiempo, un OK): traducido a lo que le importa a un founder, **una historia trae más visitas a la web que el post más viral del mes**. Ese es el titular, y funciona porque es contraintuitivo.
> - ⚠️ **Y lo honesto, que va dicho:** n=1 contra n=1, y el CTR de un post con 9.000 impresiones tiene mucho más ruido que el de uno con 119.000. La dirección es consistente con las 3 historias medidas (0,290% · 0,388% · pendiente), pero **no es una ley, es la mejor evidencia que tenemos hoy.**

> **Consecuencia al planificar (Iker, 2026-08-14): historia ENTRA en la rotación semanal de agosto** (`§8.0-AGOSTO`), en el sitio que deja el peloteo. Deja de ser "de vez en cuando, por variedad" mientras dure el override.

> ### 🕰️ 4.6-NOSTALGIA · LA ETAPA COMPARTIDA BATE A LA ANÉCDOTA PROPIA (Iker, 2026-08-17)
> **La actualización más importante de este runbook desde que existe, y afina `§4.6-OBJETIVO` condición 2.** Ahí ponía "que le haya pasado a muchísima gente". **Faltaba decir de qué tipo de recuerdo se trata**, y no todos valen lo mismo.
>
> Iker, textual: *"no es solo lo que le gusta a la gente esa primera persona nostalgia identificativa, sino esa primera persona nostalgia identificativa COMPARTIDA. No que te recuerde algo que has hecho tú, sino que te recuerde a una situación compartida con alguien"*.
>
> **LA ESCALERA, de menos a más potente:**
>
> | nivel | qué cuenta | por qué rinde menos o más |
> |---|---|---|
> | 1 · **Mi anécdota** | *"un día me pasó X"* | Solo funciona si eres conocido (`§4.6-OBJETIVO` condición 1), **y no lo somos** |
> | 2 · **Mi anécdota que también es tuya** | *"me plantó el portátil delante"* | Ya es identificación. Es el nivel del 13/08 |
> | 3 · **La ETAPA que vivimos varios a la vez** | *"aquel verano media cuadrilla andaba en las mismas"* | ⭐ **El bueno.** El lector no se acuerda de sí mismo, se acuerda de sí mismo **con alguien**, y eso es lo que hace que se lo mande a esa persona |
>
> **De dónde sale la observación, y explica por qué el nivel 3 gana:** Iker lo ve en la comunidad de Fortnite. Los vídeos que revientan **no narran una partida concreta con un amigo**, narran **la etapa entera**: cómo era jugar entonces, lo que se hacía, lo que ya no existe. *"Se centran más en hablar de la etapa en sí de nostalgia"* que del momento puntual. Una anécdota se lee; **una etapa se comparte**, porque el lector tiene delante a la persona con la que la vivió.
>
> **Y encaja con la firma medida del pilar** (`§4.6-MEDIDO`): historia no alcanza a mucha gente, pero **convierte al que alcanza mejor que ningún otro pilar** (0,41% de CTR contra 0,09% del mejor meme). Esa conversión sale de la cercanía, no del alcance — así que **la palanca del pilar es subir la cercanía, no perseguir impresiones**. La etapa compartida es exactamente eso.
>
> **CÓMO SE ESCRIBE, en tres movimientos:**
> 1. **Nombra la etapa en la línea 2, antes que la escena.** `Aquel verano…`, `Cuando en clase…`, `En los veranos de…`. Es la línea que le dice al lector *"tú también estuviste ahí"*.
> 2. **Mete al colectivo con el que se vivió** — la cuadrilla, la clase, el equipo, los del barrio —, **pero el protagonista sigue siendo YO** (`brand-voice`, canónico: yo > nosotros > tú). El grupo es el decorado del recuerdo, no el sujeto de la frase.
> 3. **La escena concreta va DESPUÉS**, y sirve de prueba de que la etapa existió. Al revés no funciona: si abres con el detalle, el lector lo lee como tu historia y no como la suya.
>
> **⚙️ Y OJO CON EL CHOQUE TÉCNICO, que lo descubrí escribiendo esta misma publicación:** el tiempo natural de la nostalgia en español es el **IMPERFECTO** (`me pateaba`, `pagaban`, `echaba`), y el clasificador de la herramienta reconoce una historia contando **PRETÉRITOS** (`§4.6` punto 1c: hacen falta **4 o más** en `-é`, `-ó`, `-aron`, `-ieron`). **Si escribes la etapa entera en imperfecto, la herramienta la clasifica como meme y deja de compararse contra su propio pilar.**
> - **La mezcla que funciona, y es además lo correcto en español:** **imperfecto para la costumbre** (`andaba en las mismas`, `tenía 15 años`) y **pretérito para los hechos** (`la cerré`, `la eché`, `pagó`). El idioma ya distingue el fondo del suceso; solo hay que usarlo bien.
> - **Se cuenta antes de entregar**, no se supone.

> ### 🔴🔴 4.6-BIO · ANTES DE INVENTAR NADA, MIRA LA BIOGRAFÍA DEL DUEÑO DE LA CUENTA (Iker, 2026-08-21)
> **`§4.6-INVENTAR` AUTORIZA a inventar la escena. No OBLIGA, y esa diferencia me costó dos borradores.** Escribí la historia de Unai con una escena de cromos en el patio, correctísima según la receta, y él la devolvió: *"el contexto de los 13 años tienes que enfocarlo más con la verdad de la historia del primer jefe"* — y pasó la línea de su propio perfil de LinkedIn: **"Llevo construyendo tecnología desde los 13 años, cuando programaba mis primeras webs"**.
> - **El hecho real gana siempre que exista y encaje con el dolor.** Aguanta preguntas en los comentarios, y la inventada no: a una escena construida cualquiera le puede pedir el detalle delante de todos.
> - **Y encima trae material gratis**: una biografía real viene con época, oficio y vocabulario propios, que es justo lo que hace que la historia no se pueda copiar-pegar a otra cuenta.
> - **EL PASO, y va ANTES de elegir la escena:** leer el **perfil del dueño de la cuenta** (headline y el "acerca de") y preguntarle a Iker por lo que no esté escrito ahí. ⚠️ **Unipile NO devuelve el `summary`** — comprobado el 21/08, viene vacío —, así que esa parte se pide, no se saca por API.
> - **La escena inventada sigue siendo la salida buena cuando NO hay hecho real que encaje.** Es lo que abarata el pilar y no se toca (`§4.6-INVENTAR` entero sigue en pie).
> - **⛔ Y SI LA ESCENA VIENE DE OTRO OFICIO, EL PUENTE AL DE HOY VA EN EL ÚLTIMO TERCIO (Iker, 2026-08-21).** Una biografía real puede traer un oficio que **no es el carril de la cuenta** (`aboutme §2-CARRIL`): Unai programaba webs de crío y hoy es CEO fundador. **La infancia es el vehículo, no la etiqueta**, así que antes del cierre tiene que aparecer explícito lo que hace HOY — en su caso `Hoy no toco el código. / Hoy levanto dinero y doy la cara.` Sin ese puente el lector se queda con la etiqueta equivocada del dueño del perfil, y encima el cierre pierde la mitad de su sentido.
> - **Lo real y lo inventado se separan en la entrega, línea por línea.** En este post: real los 13 años, las primeras webs y que no ha parado de construir; inventados el taller del barrio y que fuera la primera que usó alguien.
>
> ### 🎭 4.6-INVENTAR · LA ESCENA SE PUEDE INVENTAR. EL DOLOR, NUNCA (Iker, 2026-08-14)
> **Es la ÚNICA excepción del pilar historia a "nunca inventes nada"**, y es exactamente la misma excepción que ya existía en email (`email-marketing §7`, Iker 2026-07-27). Fuera de estos dos sitios, el innegociable de `CLAUDE.md` sigue entero.
>
> **SE PUEDE INVENTAR:** la escena, la reunión, el objeto encima de la mesa, el diálogo, el orden en que pasan las cosas, y el protagonista **con nombre de pila o sin nombre**.
>
> **⛔ NO SE INVENTA NUNCA:**
> - **El DOLOR.** Sale del **feedback real de las reuniones con clientes** (hoy: el informe de las 50 demos). Si el dolor no está en ese material, la historia no se escribe: se escribe otra.
> - **El nombre de una empresa** (ni inventado ni real reconocible sin permiso), **el apellido de una persona**, ni nada que identifique a un cliente concreto.
> - **Ninguna cifra atribuida a Neety** (resultados, clientes, porcentajes): esas solo reales y con fuente, como siempre.
>
> **Por qué funciona, que es lo que Iker confirmó con el post del 13/08:** el lector no se identifica porque la escena haya pasado, se identifica porque **el dolor es suyo**. Lo que hace viajar a una historia es la condición 2 de `§4.6-OBJETIVO` (identificación masiva), y esa se cumple con el dolor, no con la veracidad de la anécdota. El 13/08 la escena la redactó Claude a partir del **dolor nº1 del informe de 50 demos** (buscar a mano se come el tiempo de contactar) → 5.023 impresiones y el mejor CTR de la casa.
>
> **Y esto es lo que abarata el pilar:** sin verificación de empresas, sin CSV, sin menciones que cruzar. **Por eso puede ser semanal en agosto** y el peloteo no.
> - **Sigue habiendo un gate humano:** la historia se entrega diciendo **de qué dolor del informe sale**, para que Iker la contraste con una reunión real antes de publicar. Inventar la escena no es inventar el material.
> - **⭐ Y EL ARGUMENTO PARA DEFENDERLO HACIA DENTRO, MEDIDO (2026-08-21).** Cuando un jefe pregunte si nos lo hemos inventado, la respuesta no es teórica: **los dos mejores posts del pilar son los dos que llevan escena construida.** Iker 13/08 (escena redactada a partir del dolor nº1 del informe) → **10.2k imp · 1.01x · 0,41% de CTR, el mejor del pilar**; Iker 18/08 (portal, 143 nombres y el filtro del césped, inventados) → **9.5k imp · 0.95x, el de más alcance del pilar**. **Y el matiz que cierra la conversación: no nos inventamos el DOLOR, que sale de 50 reuniones reales. Nos inventamos el decorado.**

> ### 🌳🌳 4.6-RAMAS · LA TAXONOMÍA DEL PILAR HISTORIA (Mario, 2026-08-26) — ⚠️ SIN VALIDAR EN DATOS
> **Iker, cerrando el día y pidiendo que quede escrito:** *"hemos abierto dentro del pilar historia una nueva rama: ya no es solo la historia personal nuestra, sino que podemos contar historias en tercera persona. Y no solo eso, sino adaptadas al peloteo. Algunas historias estaría bien adaptarlas por región: que no entren en la categoría peloteo regional, sino que sean pilar historia de tipo peloteo regional"*.
>
> **🔴 LO PRIMERO, PORQUE ES LO QUE MÁS FÁCIL SE OLVIDA: nada de esto está medido.** Se creó el 26/08 y **el único post que lo usa es el de ese día**, así que hoy es **n=1 para las dos cosas a la vez**. Va escrito porque si no se escribe se pierde, no porque haya funcionado. **La regla de `working-preferences §0c` sigue mandando: hasta que haya números, esto son hipótesis con nombre, no recetas.**
>
> #### LAS DOS RAMAS, y las decide QUIÉN es el protagonista
>
> | rama | protagonista | quién narra | dónde está el detalle |
> |---|---|---|---|
> | **A · HISTORIA PROPIA** | el dueño de la cuenta | él mismo, 1ª persona | el runbook de siempre (`§4.6`) |
> | **B · HISTORIA DE OTRO** | un tercero **sin nombre**, por su oficio | el dueño de la cuenta, **de testigo** | `§4.6-TESTIGO` |
>
> - **Que la historia sea REAL o INVENTADA no es una rama, es otro eje** y ya está resuelto en `§4.6-INVENTAR` (la escena se puede inventar, el dolor jamás). **Las dos ramas admiten las dos cosas**, y eso lo dice Iker expresamente: *"tanto si son reales como inventadas, me da igual en ambos casos"*.
> - **La rama B nace de una necesidad de la CUENTA, no del rendimiento** (el primer jefe no quiere autobiografía inventada), y por eso la rama A **sigue siendo el default** mientras B no tenga números: los 4 mejores ganchos del pilar van en 1ª persona del singular (`brand-voice`, la tabla de la persona del gancho).
>
> #### Y UNA VARIANTE QUE CRUZA LAS DOS: LA HISTORIA REGIONAL
>
> **No es una tercera rama: es un ACABADO que se le puede poner a cualquiera de las dos.** La historia se ambienta en una región y el cuerpo se carga de clichés y de orgullo, **sin salir del pilar historia**: no se convierte en peloteo, no lleva lista de empresas, no lleva CSV y no lleva menciones masivas.
>
> **POR QUÉ, y el razonamiento es de Iker:** *"nuestra prioridad número uno hoy no es alcance, sino conversión a un evento presencial en el País Vasco"*. La historia es **el pilar que peor alcanza y mejor convierte** (0,76% de CTR a Luma el 21/08 contra el 0,022% del meme de más alcance del mes), y el orgullo regional es **el motor que mejor mueve a un local**. Juntar los dos es meter el combustible del peloteo en el motor que convierte.
>
> **⭐ Y LA CORRECCIÓN DE FONDO QUE HAY QUE TENER CLARA, porque cambia dónde se pone el esfuerzo:** *"la clave validada ya no es el peloteo general, que es lo que yo pensaba al principio —que con mencionar a gente se haría viral—, sino el peloteo y el ORGULLO regional"*. **Y esto sí está medido:**
> - **Mismo número de menciones, 16 veces de diferencia:** Cataluña de Iker **7.10x** y Cataluña de Unai **0.59x**, las dos con 16 menciones (`outliers-database §3.13`). Mencionar no explica nada.
> - **Peloteo puro sin orgullo regional:** el post de evento de Unai del 11/08, con **8 marcas mencionadas**, hizo **1.955 impresiones y 0.47x**.
> - **Orgullo regional:** mediana del mapa **24.152** y de "Los 10" **18.140**, contra 3.072 del post suelto.
> **Conclusión operativa: las horas van en el orgullo (clichés, territorios, el oficio de cada sitio), no en conseguir una mención más.**
>
> #### 🛑🛑 Y LA VARIANTE REGIONAL ES PUNTUAL, NO EL NUEVO DEFAULT (Mario, 2026-08-26)
> **Iker, en cuanto vio la receta escrita:** *"es muy importante que a partir de ahora no me hagas todas las publicaciones del pilar historia de peloteo regional. Esto tiene que ser algo puntual, cuando sea coherente, sobre todo relacionado con el spam ninja. A menos que con esto descubramos que las historias regionales funcionan aún mejor, y entonces ya las adaptaremos todas"*.
>
> **EL DISPARADOR, y es uno: la COHERENCIA con la puerta.** La variante regional entra cuando **el destino del enlace es regional** (hoy, un evento presencial en Donostia) o cuando **el dolor de la historia es de esa región**. Fuera de eso, el default del pilar es **sin región**.
> - **Por qué no vale como default:** el orgullo regional **estrecha el alcance a propósito** (`global §2.3b`), y eso solo se paga cuando lo que hay al otro lado del enlace también es regional. En una historia que lleva a `/agendar/`, que vende a toda España, el peaje no compra nada.
> - **Y si se abusa, se quema:** el peloteo funciona porque el local se siente reconocido. Un local reconocido cada semana deja de sentirse reconocido y empieza a ver el molde, que es exactamente lo que previene la ley de variedad de `global §2.0b`.
> - **La condición para cambiar la norma está escrita y es la de siempre:** si la serie de historias regionales bate a la serie sin región **con la vara del pilar** (clics y conversación, no impresiones), se revisa esto. Hasta entonces, puntual.

> #### CÓMO SE HACE UNA HISTORIA REGIONAL, sin que se convierta en un mapa
> 1. **La escena manda.** Sigue habiendo un protagonista, un sitio y unos pretéritos (`§4.6` 1c). Si al quitar los clichés no queda una escena, es un mapa mal hecho.
> 2. **Los clichés van EN EL CUERPO, nunca en el gancho** (`global §2.3b-ESCENARIO`): arriba el genérico que entiende cualquiera, abajo el específico.
> 3. **El topónimo va con su OFICIO** (`global §4.1` punto 2b), y el oficio tiene que ser cierto y de dominio público.
> 4. **Se nombran los territorios que hagan falta para que no se quede fuera ninguno.** En Euskadi son tres, y dejar uno fuera es la queja que ya nos han hecho en comentarios.
> 5. **⛔ Menos de 6 menciones @** o el clasificador la reetiqueta como peloteo y deja de compararse contra su propio pilar (`§4.6b`).
> 6. **Una sola puerta**, la del pilar (`global §4.4e-PUERTA`).
>
> #### 📏 LO QUE HAY QUE APUNTAR PARA PODER MEDIRLO ALGÚN DÍA
> **Cada fila de historia del `historial-publicaciones` declara DOS cosas: la RAMA (propia / de otro) y si es REGIONAL.** Sin eso, dentro de un mes tendremos ocho historias y ninguna forma de saber qué rama funcionó. **Y se juzgan con la vara del pilar** (`§4.6-OBJETIVO`): conversación y clics, nunca impresiones.
> **Mecanizado** como aviso de entrega en `validar-post.py --pilar historia`, que pregunta las dos cosas en cada validación.

> ### 👁️👁️ 4.6-TESTIGO · LA HISTORIA SE PUEDE CONTAR SIN SER EL PROTAGONISTA (Mario, 2026-08-26)
> **Iker, y el motivo es de la persona, no del pilar:** *"inventarnos cualquier tipo de historia en el segundo jefe me da igual, pero conociendo el primero, ¿hay alguna manera de contar esta historia sin perder rendimiento pero que no se hable desde una primera persona?"*.
>
> **LA SALIDA ES EL NARRADOR TESTIGO: el protagonista es OTRO y el dueño de la cuenta solo estaba delante.** No se toca `§4.6-INVENTAR` (la escena se puede inventar, el dolor no); lo que cambia es **de quién es la escena**.
>
> **Qué se GANA, y son dos cosas:**
> 1. **Al que firma no se le atribuye ningún hecho falso.** Lo único que afirma es **haber estado delante**, que en un founder es lo más normal del mundo y nadie le puede pedir la factura en comentarios. Es justo el miedo que resuelve.
> 2. **Nuestros datos dicen que hablar de un tercero rinde MÁS.** El mejor post de evento del histórico no habla de nosotros (*"que dos clientes subieran a un escenario a vendernos ellos no fue casualidad"*, **4.140**) y el de nuestro propio premio rindió por debajo. Y `global §2.9-REVOLUCIONAR` lo mide en otro sitio: en el corpus **no hay ni un caso** en el que alguien anuncie que ÉL va a cambiar algo y funcione; cuando funciona, **la hazaña es de otro y nosotros la contamos**.
>
> **Qué se PIERDE, dicho en voz alta:** la **confesión** en primera persona, que es la que más identificación produce (`brand-voice`, canónico `YO > NOSOTROS > TÚ`). **Se compensa dejando el YO de NARRADOR dentro de la escena**: la primera persona no desaparece, cambia de papel.
>
> **LAS CINCO REGLAS, y las cinco son obligatorias:**
> 1. **El protagonista NO lleva nombre ni empresa.** Se le nombra por su **oficio** (*el mejor comercial que me he cruzado*). Inventar una persona con nombre sigue prohibido (`CLAUDE.md`).
> 2. **El narrador tiene que estar DENTRO de la escena** — de copiloto, en la mesa de al lado, en la misma feria. Si no está, deja de ser una historia y pasa a ser un cuento, y se nota.
> 3. **La LECCIÓN del cierre es del narrador**, no del protagonista. El otro pone la escena; el que firma pone lo que aprendió.
> 4. **El gancho conserva el token personal** (`me`, `mi`, `nunca`, `aquel`) o el validador lo tumba, y sigue siendo de **una sola oración** (`§4.6` punto 1a).
> 5. **Elogiar al protagonista es peloteo al oficio**, que es el eje emocional de "Los 10" (4.81x): el comercial que lee se siente visto. Es un plus, no un coste.
>
> **Cuándo se usa:** cuando el dueño de la cuenta no quiere autobiografía inventada (hoy, el primer jefe) o cuando **no hay hecho real que encaje** (`§4.6-BIO`). Con hecho real y cuenta cómoda, sigue ganando la primera persona.

> ### 🔁 4.6-VEHICULO · EL DECORADO DE LA HISTORIA ROTA COMO TODO LO DEMÁS (Mario, 2026-08-26)
> **Iker, viendo el 2º borrador:** *"lo veo muy parecido, demasiado, a la misma historia que subimos ayer. Justo después del gancho volvemos a mencionar instituto. Seguro que se pueden inventar historias de otro tipo, sin siempre tener que ser el instituto"*.
>
> **El agujero:** `global §2.0b` (ley de variedad) lista el concepto, el verbo, la frase-rabia, el ninja, el opener, el cierre, el reveal y el arranque de la anáfora… **y no lista el VEHÍCULO de la historia**, que es lo más visible de todo. Resultado: **4 de las 5 últimas historias transcurren en la infancia o el instituto** (Iker 13/08 y 18/08, Unai 21/08, Asier 25/08), y la quinta iba camino de lo mismo.
>
> **LA REGLA: el vehículo entra en la ley de variedad y no se repite en dos historias seguidas, aunque sean de cuentas distintas** (las 3 cuentas comparten red, `global §2.0b-ARRANQUE`).
>
> **VEHÍCULOS YA GASTADOS:** el instituto y la infancia (×4, agotado) · la primera venta de crío (Iker 18/08) · el Excel del cliente en una reunión (Iker 13/08).
> **VEHÍCULOS LIBRES, para no empezar de cero cada vez:** el copiloto de un comercial veterano · la feria · el cliente que te dice que no y por qué · el primer día en un puesto · una comida con un proveedor · la llamada que sale mal · el compañero que te enseñó algo sin querer · la obra o la visita a fábrica · el taxi al aeropuerto · el que se fue de la empresa.
>
> **Mecanizado** como aviso de entrega en `validar-post.py --pilar historia` (`ENTREGA: ¿el VEHICULO de la historia esta gastado?`), que canta si el cuerpo vuelve a caer en el colegio.

Pilar NUEVO, distinto de **autoridad** ("mira qué importante soy": premios, eventos, "voy a X"). Esto es una **ANÉCDOTA con una lección**: real, o **construida sobre un dolor real** (`§4.6-INVENTAR`). **Ya tenemos datos propios, pero pocos** (n=2 en Iker, `§4.6-MEDIDO`; n=2 en Unai): la vara sigue siendo mayormente de fuera, como en el lead magnet. Se valida con `--pilar historia` (+ `--cuenta Mario` para el ancla de marketing en vez de ventas).

> ### 📸 4.6-FOTO · LA HISTORIA VA CON SELFIE SUJETANDO EL MÓVIL CON LA MANO (Iker, 2026-08-13)
> **La firma visual del pilar, y es lo que lo distingue de un vistazo de un meme.** No es "una foto natural" a secas: es un **selfie de cámara real, con el móvil sujeto en la mano y la mano a la vista**. Es lo que hace que se lea como alguien contando algo, no como una pieza montada.
> - Sale del **banco de fotos de los jefes** (carpeta HISTORIA), va **cuadrada**, y el recorte se elige mirando, no a ojo de fichero.
> - Gana la de **sonrisa amplia con ojos abiertos** (`feedback-elegir-foto-real-ctr`), nunca la cara de reventado.
> - **⛔ Y EL BANCO SE MIRA ENTERO ANTES DE ELEGIR, foto a foto (2026-08-21).** No vale el nombre del fichero: las fotos que manda un jefe llegan con nombres de cámara y hay que ABRIRLAS. Del lote de Unai, **3 de 11 no se cuadraron y eso también es entrega**: una foto de grupo horizontal donde el cuadrado deja fuera a medio equipo, un plano en primera persona sin cara, y un frame borroso. **Se dice cuáles y por qué, en vez de convertirlas a lo bruto.** Y las que llevan pantalla o papel con datos de un cliente real salen con aviso de desenfoque (`images §0a-penta`), no se descartan.
> - **⭐⭐ SE ROTA, Y LA REGLA ES INTERCALAR: LA ÚNICA PROHIBIDA ES LA DE LA PUBLICACIÓN ANTERIOR DE ESA CUENTA (Iker, 2026-08-27) — CANÓNICO, corrige lo de abajo.**
>   > **Iker, literal:** *"lo único que tú tienes que hacer y asegurarte es que en cada cuenta la nueva publicación historia nunca repite la misma foto de la publicación anterior, pero sí que puede repetir la de hace dos publicaciones. Lo importante es que siempre vayamos intercalando"*.
>   - **Se compara SOLO contra la historia inmediatamente anterior de esa misma cuenta.** La de hace dos ya vale. Con **2 fotos** válidas una cuenta puede publicar este pilar para siempre.
>   - **🔴 Y ESO DESACTIVA EL BLOQUEO DE ABAJO.** Aquí ponía *"sale la que más tiempo lleve sin usarse"* y *"mínimo 3 selfies por jefe o el pilar se bloquea"*, y de ahí salían dos avisos de entrega que Iker tumbó el 27/08: que a Unai *"se le acaban los selfies"* (tiene 3, con 2 basta) y que a Iker *"se le acaban tras el 04/09"* (tiene 4). **Ninguno de los dos era un problema: era esta regla mal escrita.** Se conserva abajo el porqué del banco, no el umbral.
>   - **Lo que NO cambia:** entre dos fotos permitidas sigue ganando la de **sonrisa amplia y ojos abiertos** (`feedback-elegir-foto-real-ctr`), y **en la ficha del historial se anota SIEMPRE qué foto se subió** — sin ese dato no se puede saber cuál era la anterior, que es justo lo único que hay que mirar (la del 18/08 hubo que preguntarla).
>   - **Precedente que sigue en pie:** repetir la foto **de hace cinco días** hace que la parrilla se lea como el mismo post dos veces. Lo que se ha medido mal era el remedio, no el síntoma.
> - **⭐⭐ MÍNIMO 3 SELFIES CUADRADOS POR JEFE (Iker, 2026-08-18).** Con 3 se puede rotar sin repetir en un mes; con 1 el pilar se bloquea a la segunda semana. **Iker tiene 5; Unai tiene 8 desde el 21/08** (llegaron 11 fotos y se cuadraron 8; 3 se descartaron y el motivo está en la ficha del 21/08 del historial); **Asier sigue a CERO.** Eso choca de frente con `§8.0-AGOSTO`, que mete historia en la rotación semanal de las tres cuentas: **sin banco, las historias de Unai y Asier no se pueden entregar completas.** Pedirles 3 selfies cuadrados a cada uno es un pendiente de bloqueo, no una mejora.
> - **⭐ LA FOTO CONTRASTA CON EL TEXTO, NO LO ILUSTRA.** Es `global §2.0c` aplicado aquí, y hay que tenerlo presente porque el reflejo es el contrario. En la historia del 18/08 el texto va de él con 15 años y **la foto es el Iker de hoy en una oficina**: las dos capas hablan y la foto no gasta lo que cuenta el texto. Iker: *"es como que simula una conversación entre el Iker de mayor y el Iker de pequeño"*. **Una foto de la época habría ilustrado el texto y no habría aportado nada nuevo**, que es justo lo que `§2.0c` prohíbe.
>   - ⚠️ **Con una excepción declarada: cuando la foto ES el concepto.** La historia pendiente de Unai con su foto de pequeño va al revés a propósito, y por eso se declara la divergencia al entregar.
> - **Y esta señal es para el HUMANO, no para el clasificador.** El código no distingue un selfie de un wojak: los dos entran en la base como `text_image` y no hay visión por ordenador en el backend. Al clasificador lo separa el **tiempo verbal** (`services/pillar.ts`: una historia narra en pretérito, un meme describe en presente). Si alguna vez dudas mirando la parrilla, la foto te lo dice a ti en medio segundo; al script hay que seguir diciéndoselo por el texto.

> ### 👥👥 4.6-FOTO-GRUPO · SI UNA CUENTA NO TIENE SELFIES, LA HISTORIA NO SE BLOQUEA: VA FOTO DE GRUPO (Mario, 2026-08-26)
> **El caso, y no es un capricho:** Asier lleva **un mes** sin pasar una sola foto suya y dice que no se las hace. `§4.6-FOTO` pide selfie con el movil en la mano, y con esa regla su cuenta se quedaba fuera del pilar para siempre. Iker: *"la unica alternativa que se me ha ocurrido son fotos grupales en las que el esta incluido"*.
>
> **LA REGLA: cuando el dueño de la cuenta no tenga selfies, se usa una FOTO DE GRUPO donde el sea identificable, y en la entrega se dice quien es y donde esta.** El selfie sigue siendo el default del pilar; esto es la salida cuando no existe, no una alternativa a elegir.
>
> **LOS TRES FILTROS PARA ELEGIR ENTRE FOTOS DE GRUPO, por orden:**
> 1. **⛔ La cara que domina el encuadre tiene que ser la SUYA.** El post lo firma el: si el primer plano es de otro y el sale pequeño y de lado, la foto se cae por buena que sea. *(Asi se descarto `oficina grupal`: es un selfie de otra persona con Asier al fondo a la izquierda.)*
> 2. **⛔ Nitidez antes que resolucion.** Una foto movida se descarta aunque tenga el triple de pixeles. Es el mismo criterio con el que se descarto la de Unai que parecia frame de video. *(Asi se descarto `cena 2 grupal`, 2048px pero blanda, y encima con varios desconocidos reconocibles de fondo.)*
> 3. **⭐ VERTICAL gana a HORIZONTAL, y es puro calculo: el cuadrado de una foto vertical no se lleva a NADIE por delante.** Solo recorta arriba y abajo, asi que la unica decision es el desplazamiento vertical. En una horizontal el cuadrado se come un cuarto del ancho, que es justo donde esta la gente.
>
> **⛔⛔ 4. EL CUADRADO SE CENTRA EN LAS PERSONAS, NUNCA EN EL ENCUADRE NI EN EL LOGO DEL FONDO (Iker, 2026-08-27).**
> > **Iker, sobre mi recorte del 27/08:** *"has centrado según el logo de arriba, pero lo más interesante es centrar en base a las personas. Hay muchísimo más espacio entre la cabeza de Asier y la izquierda que entre la cabeza de Iker y la derecha"*.
>
> **El fallo, y es el reflejo de cualquiera:** al cuadrar una horizontal se coge el centro geométrico del original. Eso centra **el fondo** (el rótulo, el photocall, la pared), no a la gente — y la gente casi nunca está centrada en la foto que hizo alguien con el móvil. Resultado: un lado con medio metro de pared y el del extremo contrario cortado por el hombro.
> **⛔ Y LA CAJA SE CALCULA CON NÚMEROS, NO A OJO. Me pasé DOS veces seguidas el mismo día**, primero corto y luego largo, porque estaba estimando posiciones mirando miniaturas. **El método, y son 3 minutos:**
> 1. **Se pinta una rejilla de coordenadas sobre el original** reescalado (una línea vertical cada 250px con su número encima) y se **leen** los centros de cabeza. Aquí: Asier **1315**, Unai **2100**, Iker **3015**.
> 2. **El centro del grupo es el punto medio entre las cabezas de los EXTREMOS**, no el de la foto: `(1315+3015)/2 = 2165`. (La media de las tres da 2143, o sea lo mismo: si sale muy distinto, es que uno está descolgado y hay que mirar la foto.)
> 3. **`x0 = centro − lado/2`** → `2165 − 1512 = 653`, redondeado a **650**.
> 4. **Se comprueba con los dos aires:** izquierda `1315−650 = 665`, derecha `(650+3024)−3015 = 659`. **6px de diferencia: eso es centrado.**
> - **Y así se ve el error de tamaño que se comete a ojo:** el primer intento dejaba 789 contra 429 y el segundo se pasó al revés. **El ojo no distingue 200px de descuadre en una miniatura; la resta sí.**
> - **Las señales de composición, para confirmar sin medir:** lo que el grupo sostenga delante (un cartel, un trofeo, una placa) queda **centrado**, y el rótulo del fondo deja de estarlo. Si el logo del fondo sale perfectamente centrado, casi seguro que la gente no lo está.
> - **El caso completo:** `IMG_0290.HEIC` (4032×3024). Por encuadre salía `(504,0,3528,3024)`, corregido de más a `(904,0,3928,3024)` y cerrado en **`(650,0,3674,3024)`**.
> - **Vale para cualquier foto de grupo futura**, y también cuando la foto es vertical: allí la decisión es la misma en el eje de arriba a abajo (se centra en las caras, no en el techo).

> **Y el coste se dice:** la elegida el 25/08 mide **684px de ancho** de origen, asi que el cuadrado sale **escalado** y se vera blando en pantalla retina. Se acepta porque no hay alternativa, no porque de igual.
>
> **🧪 LA HIPOTESIS DE IKER, SIN MEDIR Y ANOTADA COMO TAL** *(la propone el, nadie la ha comprobado)*: la restriccion puede acabar siendo una ventaja, igual que paso con la sobriedad de Unai en memes, que empezo siendo una limitacion y resulto rendir mejor. *"A lo mejor nos estan ayudando a hacer A/B testing y descubrimos que en este pilar las fotos grupales dan mejor imagen de marca, y a lo mejor incluso gustan mas"*. **Se mide contra las historias con selfie de Iker (0,41% · 0,364% · 0,276% de CTR) y el resultado se anota aqui.**

**Referentes (de nuestra BD, `/api/ideas/inspiration`):** **Josh Braun** (39x *"My mom died yesterday"*, 29x *"When I was younger in sales, I'd get on a plane…"*), **Daniel Disney** (16 outliers: *"I hired the smartest person in the room once"*, *"I had a manager who would scream at the sales floor"*). **Se eligen por `hook_type` story/confesión + LIKES ≫ comentarios** (si comentarios > likes, es un lead magnet disfrazado de historia, no una historia).

> ### 🎯🎯 4.6-PROMESA · LA SEGUNDA FORMA DE GANCHO DEL PILAR: NO LA ESCENA, LA PROMESA (Iker, 2026-08-21)
> **El punto 1 de aquí abajo dice que la historia entra por una ESCENA. Sigue siendo el default, pero NO es la única forma**, y la segunda nació el 21/08 con la historia de Unai. Iker, pidiéndola: *"que cuando leas ese gancho digas: vale, me está contando que va a revolucionar la industria de las ventas, pero no me está contando cómo"*.
>
> | forma | el gancho | el bucle | cuándo |
|---|---|---|---|
> | **ESCENA** (default) | *Le pregunté a qué empresas quería vender y me plantó el portátil delante* | ¿qué pasó? | la historia se sostiene sola |
> | **PROMESA** | *Con 13 años jamás me imaginé la forma de vender que vamos a reinventar* | ¿qué viene? | **cuando el post tiene que vender algo que aún no ha pasado** (un evento, un lanzamiento) |
>
> **Es el mismo bucle abierto de `global §2.0`, pero CARGADO EN EL FUTURO.** Y es lo que permite meter un evento dentro de una historia sin que huela a promoción, que es el problema que teníamos escrito desde el 05/08 (*un post informativo del evento no lo lee nadie*).
>
> **LAS TRES CONDICIONES, y las tres son obligatorias:**
> 1. **La FOTO no puede delatar.** Selfie o foto real, jamás el cartel. El precedente contrario es el post de evento de Unai del 11/08: gancho de refrán invertido buenísimo y **el cartel con fecha, nombre y patrocinadores de imagen** → *"se notaba que era una promoción desde el segundo 1"*, **0.47x**.
> 2. **El claim va en FUTURO y el intensificador en pasado** (`global §2.3d-FUTURO`). Si el verbo da el hecho por cumplido, no queda nada que esperar y se cae el bucle.
> 3. **El cuerpo tiene que PAGAR la promesa antes del enlace**, con una línea puente que no desvele (*Lo de septiembre empieza justo ahí*). Sin ella el enlace aparece a pelo y el gancho se queda a deber.
>
> **⚠️ Y lo honesto: n=1, sin medir.** Ninguna de las 5 cuentas tenía un gancho de promesa antes de este. Se prueba a propósito y **el primer resultado decide si la forma se queda**.

1. **HOOK:** primera persona, una ESCENA/anécdota concreta (*"I [algo que me pasó]"*, *"Cuando…"*, *"Nunca…"*), vulnerable o intrigante. **NO alarma, NO claim, NO dato.** Corto.
1a. **⛔⛔ Y EN UNA SOLA ORACIÓN, SIEMPRE (Iker, 2026-08-12). HARDCODE DE ESTE PILAR.**
   `global §2.10` permite **una o dos** oraciones en cualquier gancho (medido: 8,4% de outliers con una, 17,0% con dos). **Aquí se aprieta a UNA, y solo aquí**, así que la regla vive en este runbook y no en global (`working-preferences §0c-BIS`).
   - **El motivo es del pilar, no del formato:** la historia entra por una **ESCENA**, y una escena partida en dos frases se lee como un resumen de la escena. El punto de en medio mete una pausa **antes de que el lector se haya metido dentro**, que es justo el momento en el que decide si pulsa "ver más".
   - **⚠️ Condensar NO es rebajar: el verbo punchy y el concepto original se quedan enteros.** Se junta con `y`, con una coma o con un gerundio, y se tira el relleno que sobra.
   - **El caso que la motivó (2026-08-12, historia de Iker):** entregué *"Le pregunté a qué empresas quería vender. Y en vez de contestarme, me plantó el portátil delante 😬"* (98 car, 2 oraciones). Iker: el verbo `plantó` y el concepto le valían, lo que sobraba era el punto. Condensado a **"Le pregunté a qué empresas quería vender y me plantó el portátil delante 😬"** (74 car): mismo verbo, mismo concepto, **24 caracteres menos**, sin frenazo en medio y clavado en la mediana de nuestros ganchos de una oración (75 car). El `y` ya cuenta que no contestó, así que `en vez de contestarme` era relleno.
   - **Mecanizado** en `validar-post.py --pilar historia` (`HISTORIA: el hook va en UNA sola oracion`), fallo duro. No es criterio: es un contador de puntos.
1b. **⭐ LA LINEA 2 SITUA LA ESCENA: QUIEN Y DONDE (Iker, 2026-07-29).** El hook puede dejar el sujeto implicito, pero **la linea siguiente no**. Si el lector tiene que deducir quien habla justo cuando esta decidiendo si sigue leyendo, se le enfria la escena. En esa linea van **la persona y el sitio**: *"Me lo solto el cliente en mitad de la reunion"*.
   - **⛔ NO le pongas etiqueta, describe su PAPEL con la escena (Iker, 2026-07-29, me corrigio).** Yo escribi *"me lo solto el cliente"* y **contradecia el propio cuerpo**: si tres lineas despues dice que dudaba si pagarnos, entonces **no era cliente**, era una demo, una primera reunion para ver si compraba. Y las otras dos etiquetas tampoco valen: `lead` es jerga que un director de 55 anos no usa, y "posible cliente" alarga sin anadir nada.
   - **La solucion es no etiquetar:** *"me lo solto en la reunion en la que decidia si nos compraba o no"*. Situa el sitio, deja clarisimo que aun no habia comprado y el sujeto se entiende solo.
   - **Regla general:** antes de nombrar a alguien en una historia, **comprueba que la etiqueta cuadra con el momento del arco en el que esta**. Cliente, proveedor, socio o jefe describen un estado; si el post cuenta como se llego a ese estado, la etiqueta del final no vale para el principio.
   - **Y di donde pasa** (una reunion, una llamada, una comida). Sin sitio no hay escena, hay un resumen.

1c. **⚙️ CÓMO RECONOCE LA HERRAMIENTA QUE ESTO ES UNA HISTORIA: POR EL PRETÉRITO (Iker, 2026-08-12).**
   La historia del 13/08 salió etiquetada como **meme** en Accounts. El clasificador (`backend/src/services/pillar.ts`) daba por meme cualquier post **corto con foto**, y las 14 historias de la base se libraban solo porque pasaban de 850 caracteres. Esta mide 708.
   - **La señal que los separa está medida:** de los **62 memes de menos de 850 caracteres** que tenemos publicados, **ninguno llega a 4 verbos en pretérito** (el máximo son 3), porque un meme habla en PRESENTE de una situación que se repite (*"Nadie te avisa"*, *"Empiezas llamando a puerta fría"*). Una historia es una escena que ya pasó: `pregunté`, `plantó`, `soltó`, `llevé`.
   - **Consecuencia al escribir:** una historia **se cuenta en pasado**. Si la escribes en presente histórico, además de perder la escena, la herramienta la va a clasificar mal y dejará de compararse contra su propio pilar.
   - **⚠️ La FOTO no sirve de señal** aunque toda historia lleve selfie: el meme también lleva imagen y en la base las dos son `text_image`.

2. **CUERPO:** ritmo de historia — frases cortas, UNA por línea, MUCHO aire. Detalles sensoriales concretos (las botas amarillas, los calcetines: la concreción da credibilidad). Arco: escena → momento → desenlace. Luego un REFRAME/contraste (antes vs ahora). Y una **LECCIÓN corta y universal al final** (*"Moments do"*, *"It can't create a memory"*). La lección ata a tu tema (ventas/marketing) por la HISTORIA, no por el pitch.
3. **FOTO:** texto puro O una foto **REAL/candid** (un momento de verdad), NUNCA un gráfico diseñado (lo opuesto al lead magnet). Muchos de sus outliers son **text-only** (Josh Braun top).
4. **CTA:** NO comment-gate. Cierra en la lección; como mucho un PD/spam ninja suave a un recurso.
5. **Cuenta de Mario = ancla de MARKETING**, no de ventas (`aboutme §2`); el validador lo contempla con `--cuenta Mario`.

**⭐⭐ 4.6b · HISTORIA CON PELOTEO DENTRO (Iker, 2026-07-29).** El pilar sigue siendo **historia**, no se convierte en peloteo. Pero **a veces** (no siempre) la anecdota da pie a nombrar empresas, y entonces se pelotea DENTRO del relato:

- **Las empresas van con @ delante, siempre.** Si se nombra a un cliente y no se le menciona, se pierde el unico motivo por el que merece la pena nombrarlo.
- **Bloque con flechas `→`, como en los pilares de peloteo.** Nada de una linea con los nombres seguidos separados por comas.
- **Cada empresa lleva AL LADO una persona de esa empresa**, y **las DOS llevan arroba**: `→ @Empresa - @Nombre Apellido`. Mencionar la empresa sin mencionar a la persona desperdicia la mitad del peloteo, porque la notificacion que de verdad mueve es la que le llega a un humano. Y esa persona pasa el **filtro duro de actividad**: haber COMENTADO en un post de otro en **el ultimo mes** (`GET /api/v1/users/{provider_id}/comments`). Se verifica una a una, nunca se supone.
- **Maximo 5.** Con 6 o mas menciones el clasificador (`backend/src/services/pillar.ts`) lo reetiqueta como peloteo y deja de compararse contra su propio pilar.
- **El nombre va EXACTO, tal cual lo devuelve Unipile**, tanto el de la empresa como el de la persona: si su perfil pone `Sebastián Luengo, MBA`, va con el `, MBA`; si la pagina se llama `Arania S.A.` o `BETSAIDE SAL`, va asi aunque las mayusculas chirrien.
- **❌ NO HAY EXCEPCION: el nombre va ENTERO, por largo y raro que sea (Iker, 2026-07-29).** Yo propuse recortar `Fagor Automation | CNC & Feedback Systems | Automation Solutions` y `OJMAR - Intelligent Locking Systems` porque comen renglones, y **Iker lo tumbo**: *"aunque tenga rayas raras, me da igual, LinkedIn lo va a encontrar perfecto"*. Y tiene razon en lo que importa: **el nombre completo es lo que hace que el autocompletado acierte a la primera**, y una mencion mal elegida vale cero. Lo feo es cosmetico; fallar la mencion tira el peloteo entero. **Se pega entero y no se toca.** Que la linea ocupe dos renglones es aceptable: al publicarse, las menciones se renderizan como enlaces y se leen como tales.
- **⭐ SIEMPRE, DEBAJO DEL POST, UN BLOQUE DE ENLACES PULSABLES (Iker, 2026-07-29).** Cada vez que la entrega lleve menciones, va **fuera del bloque cercado** una tabla con **el enlace azul de cada perfil y de cada pagina**, empresas y personas, para que Iker abra y confirme de un vistazo que ha mencionado a quien tocaba. Una mencion mal elegida en el desplegable (hay homonimos y filiales: `OJMAR USA` vs `OJMAR`, `Fagor Automation North America` vs la de Arrasate) tira el peloteo y encima etiqueta a un tercero. El bloque es una **tabla markdown de CUATRO columnas**, en este orden: **nombre de la empresa | enlace de la empresa | nombre de la persona | enlace de la persona**. Ni dos columnas ni el nombre metido dentro del enlace: cuatro, separadas, para poder comparar nombre contra enlace sin abrir nada. **Las URLs salen de Unipile, no se construyen a mano:** persona → `https://www.linkedin.com/in/{public_identifier}`, empresa → `https://www.linkedin.com/company/{public_identifier}` (el `public_identifier` de la pagina lo da `GET /api/v1/linkedin/company/{id}`, y **no coincide con el nombre**: el de Telpark es `empark-aparcamientos-y-servicios-s-a`).
- **Los clientes que se nombran salen de una fuente nuestra verificable** (hoy, la seccion "Trabajamos hoy con" de `https://recursos.neety.com/agendar/`). Nunca de memoria.

**Aprendizaje del 2026-07-29, medido:** de las 5 empresas, la primera pasada de busqueda (10 perfiles por empresa) dejo a **Fagor Automation y OJMAR sin nadie activo**. Paginando a **40 perfiles por empresa** aparecieron el **CEO entrante de Fagor comentando hacia 3 dias** y una **directora de operaciones de Betsaide comentando ese mismo dia**. **Diez perfiles no bastan: pagina siempre.** Y aplica la regla de siempre: un mando intermedio activo bate a un director dormido (el director de unidad de negocio de OJMAR llevaba **384 dias** sin comentar).

**⭐ EL EMOJI DEL FINAL DEL HOOK: VARIEDAD, NO SIEMPRE LA MANO (Iker, 2026-07-29).** El `👇` se usa para empujar al "ver mas" y esta bien en la mayoria de pilares, **pero repetirlo en todos los posts canta**. En **historia** va un **emoji personal que encaje con el tono de la escena** (`😅` en el post del cliente que dudaba de nuestra edad: desactiva el reproche y suena a anecdota, no a queja). Y en todos los casos: **se pone el emoji y se QUITA el punto de la palabra anterior**, que con punto queda mal.

**⭐ Y como en TODOS los pilares, aplican las reglas GENERALES (no opcionales por ser pilar nuevo, Iker, 2026-07-24):** (a) **FORMATEADO**: intercala líneas sueltas + bloques de 2/3, con **ANÁFORA** en los bloques complementarios ("No es… / No es… / No es…", "Tu titular… / Tu foto… / Tus destacados…"), `§3.2` — NO todo en líneas sueltas monótonas aunque la vara (Josh Braun) vaya así: **calcamos su ritmo de historia y lo MEJORAMOS con nuestro formateado** (`§2.9` calcar-y-mejorar). (b) **`https://` delante de TODO enlace** (`§4.4b`). (c) Cero coma antes de "y"/"e", cero guion largo (`brand-voice §3`). (d) Verbo con techo, sin repetir verbo (`§2.9`). (e) El pase de criterio (`§8`). El validador `--pilar historia` comprueba las mecanizables; el resto es criterio.

> **📌 VISIÓN DE FUTURO (Iker, 2026-07-24; NO actuar aún, solo registrar):** el plan es **dejar de publicar los mismos 3 pilares en las mismas 3 cuentas cada semana**. La audiencia se está dando cuenta y el rendimiento baja porque **los 3 founders (Iker/Unai/Asier) comparten red** (misma empresa, todos del País Vasco): dos mapas la misma semana en dos cuentas se solapan. Descubrir y validar pilares nuevos (como este de historia) es parte de diversificar. Cada pilar nuevo, **siempre desde datos de outliers de otros primero** (texto entero: gancho+cuerpo, Y foto), hasta tener datos propios.

**⚠️ CONFLICTO SIN RESOLVER, no lo tapes:** `brand-voice §1b` dice que este registro es lo contrario de sobrio y que "si hace falta, va en la cuenta de Iker". Pero los datos dicen lo contrario: en **Unai** hizo 9.96x y 2.72x, y el único de **Iker** hizo 0.70x. Puede ser el sujeto de la frase y no la cuenta (el de Iker hablaba del modelo). **n=1 por cuenta: no está decidido.** Si se vuelve a usar, decidir a conciencia y anotar el resultado.

> Se reconoce el outlier de lead magnet en la DB porque **se disparan los COMENTARIOS** (vibe prospecting 632 · desmonto perfiles 483). El objetivo del formato es EL comentario.
> **⛔ Diferencia clave con los otros pilares: NO lleva spam ninja. Es la ÚNICA excepción y no se "arregla".** El CTA de comentar ES el cierre (regla del UNO). Meter el link de agendar aquí **apila dos CTAs**: el lector que iba a comentar duda entre comentar o clicar, y el conteo de comentarios —que es TODO el motor del formato (632 com. vibe prospecting · 483 desmonto perfiles)— se hunde. El resto de reglas de spam ninja viven en `global-instructions §4.4b`; aquí NO aplica ninguna. Si algún día se prueba, es un A/B consciente con expectativa de caída, no el default.
> **Output (TRES piezas, no una):** (1) el **TEXTO** copy-ready · (2) una **recomendación de imagen** (registro personal/founder: **foto natural real, selfie o foto en grupo con compañeros** — NO caricatura ni diseño elaborado; `images §3`. El mejor del histórico, 8.52x, lleva un selfie de oficina) · (3) el **PROMPT PARA EL PROGRAMADOR** con el gate y el recurso de `recursos.neety.com` → **carga la skill `lead-magnet-web` y sigue su §5**. Sin CSV, sin ZIP, sin spam ninja.
> **El post NO es el lead magnet entero.** El post consigue el comentario; el dinero está en la página: gate que regala un poco + pide el correo → recurso que resuelve el PASO 1 → secuencia de emails → demo. Si entregas solo el texto, has hecho medio trabajo.

**Paso 0 — Input:** la idea/recurso a regalar. Si no te la da, pregúntale qué entregable quiere.

**Paso 1 — ⚠️ NO hay puerta de frecuencia (revisado 2026-07-14).** Aquí había una que pedía ≥2 semanas por cuenta y avisaba de "fatiga". **La BD la desmiente:** Iker publicó lead magnet el 27-may (0.59x) y otro el 28-may (**8.52x · 483 com.**), días consecutivos y misma cuenta. Detalle y los 5 flops de junio explicados uno a uno en `global-instructions §4.4` puerta 1.
**Lo que SÍ se comprueba antes de escribir:** que el ÁNGULO no se parezca al del último lead magnet de esa cuenta y que la PALABRA del CTA no se repita. El calendario no es el problema; el ángulo sí.

**Paso 2 — ÁNGULO ORIGINAL (aquí se gana o se pierde):**
- El entregable = **UNA cosa concreta y específica**. El genérico "toda mi biblia / todos mis recursos en una caja" está **MUERTO** (biblia 1.2x): comentan poco y LinkedIn no amplifica.
- **Evita temas quemados:** "plantillas de mensajes", "los mejores recursos", cosas que TODO el mundo regala → nadie comenta porque ya lo han visto mil veces.
- **Busca el ángulo fresco en la competencia** (ahora con acceso a la DB): mira lead magnets outlier en `/api/analysis/cross-creators` y en otros nichos (no solo ventas) para encontrar mecánicas originales que aún no estén quemadas en nuestro sector. Los ángulos se queman rápido → esto se investiga en cada post, no se hardcodea.

**Paso 3 — HOOK (lo más crítico del formato):**
- Tiene que **frenar el scroll** y, sobre todo, **pintar una imagen física/visual** (acción concreta sobre un objeto): "le tiré las **llaves** de mi LinkedIn a Claude" (tirar un objeto) genera un frame mental. `global-instructions §2.2`.
- ⚠️ **Corrección (BD en vivo, 2026-07-14):** aquí ponía que el de las llaves "fue el mejor". **No lo es.** Lo publicaron las dos cuentas y se quedó en **4.10x (Iker, 232 com.)** y **4.52x (Unai, 285 com.)**. Los que reventaron de verdad: **"vibe prospecting" 9.85x · 632 com.** (urgencia + bandwagon) y **"desmonto perfiles" 8.52x · 483 com.** (entrega LIVE). La imagen física del gancho ayuda, pero lo que dobla los comentarios es el **MECANISMO** (entrega live > PDF, urgencia), no el objeto del hook. No sobreoptimices el gancho a costa del mecanismo.
- **Original** (no un hook visto mil veces), corto, anclado a ventas, ≤1 número, `👇`.
- **Verbo punchy con techo** (`global §2.9`): "le **tiré** las llaves a Claude" (tirar).
- **El hook lleva una PALABRA-gancho con gracia** que luego será la palabra a comentar (ver Paso 5). Ej.: hook "para mandar buenos mensajes tienes que ser **psicólogo**" → palabra = "psicólogo".

**Paso 4 — CUERPO (corto):**
- **CORTO:** no un ensayo. Un setup breve del problema + **~5 bullets de "lo que te vas a encontrar dentro"** y poco más. La mayor parte del peso está en el hook y el CTA, no en el cuerpo.
- **TEASEA, NUNCA DESVELES el contenido:** los bullets dicen QUÉ se va a cubrir (el titular de cada cosa), pero **NO dan la respuesta/el contenido** — si lo desvelas, ya no hay razón para comentar. Se mantiene el curiosity gap: el contenido está DENTRO del recurso, que se consigue comentando. (Ej.: "✅ Cómo convertir tu banner en una máquina de leads" — dice qué, no cómo.)
- Formateado completo (bloques de 2/3, líneas sueltas, staccato) y voz `brand-voice`.
- **NO repitas las mismas expresiones** de otros lead magnets: que se note que es un post NUEVO (varía arranques y comodines, `working-preferences §4`).
- **Entrega LIVE en comentarios** (audit/roast/consejo one-liner público) bate al PDF (desmonto perfiles 8.5x/483 com.) — la recompensa pública e inmediata dispara el loop de comentarios. Sanity: el entregable live tiene que dar VALOR REAL, no ser un chiste a costa del que comenta.
- **NADA de spam ninja / link de agendar aquí.**

**Paso 5 — CTA (crítico, fórmula exacta):**
- Literal y explícito: **`Comenta "[PALABRA]" + [tu sector/departamento] y te lo paso`**.
- **PALABRA** = la que remata la gracia del hook (psicólogo, llaves, vibe, desmonta…). Si el CTA no reconecta con el chiste del hook, pierde fuerza.
- **+ sector/departamento** = el añadido que varía por persona (cada uno trabaja en un sector/depto distinto) → cada comentario es único y LinkedIn no lo nerfea por spam. Preferimos **sector/departamento** (mundo empresarial/ventas) antes que "día favorito / mes de cumple" (descartados: no encajan con el tono).
- **Di SIEMPRE la palabra "Comenta" de forma explícita.** FAIL confirmado: cuando pusimos formas implícitas (rollo *si lo quieres, "[palabra]"*) la gente **no entendía que tenía que comentar** y se hundió el conteo. Nada de implícitos.

**Paso 6 — LA PÁGINA DEL RECURSO (`lead-magnet-web`, obligatorio).** Carga la skill `lead-magnet-web` y entrega el **prompt para el programador** (su §5) con el gate y el recurso.
La regla que más se falla, de su §1: **ni todo ni nada.** Regalar todo en el gate = no hay motivo para dejar el correo. Formulario pelado sin regalar nada = nadie paga por adelantado. **Hay que regalar UNA MUESTRA antes del formulario.** Y el recurso resuelve el **paso 1**, no todo el camino: da el QUÉ y vende el CÓMO, que es donde entra Neety.

**Paso 7 — Validación (§8) → entregar las 3 piezas: TEXTO copy-ready + recomendación de foto + prompt del programador.**

---

### 4.6 · Runbook TARJETA (imagen sola) — EN PRUEBA, fuera de rotación (Iker, 2026-08-20)

> **Estado: PRUEBA, no pilar.** 3 tarjetas en 3 semanas, una cuenta distinta cada vez, **fuera del cuadro latino de §8.2**. Se decide con datos al terminar. Entra solo si tú lo pides (§8.4).
>
> **Arranca en la cuenta de IKER** (Iker, 2026-08-20): *"se empezará en la cuenta del segundo jefe, que es donde tenemos más libertad"*. Mismo criterio que el meme controversial, que va a Iker y nunca a Unai: **lo que todavía se está probando no va a la cuenta del CEO.** Las otras dos tarjetas van a Asier y a Unai, en ese orden.

**Input del usuario:** la creencia comercial que quieres desmontar. Si no la da, pídesela.

#### 4.6.0 · La evidencia, para que no se olvide de dónde sale

Barrido de **153 creadores y 37.168 posts** de nuestra BD (2026-08-20). El formato es **imagen sola, sin nada de texto en LinkedIn**, y es rarísimo: **241 posts de 37.168 (0,65%)**. De los 2.278 outliers de la competencia, solo 6 son imagen-sola (0,26%). Quien lo hace de verdad:

| Cuenta | Seguidores | % imagen-sola | eng. imagen | eng. resto | lift |
|---|---|---|---|---|---|
| Adam Grant | 5,6M | **52,0%** (39/75) | 20.408 | 10.510 | **1,94x** |
| Alex Hormozi | 1,0M | 14,2% (65/458) | 5.477 | 3.815 | **1,44x** |
| Leila Hormozi | 409k | 12,2% (49/403) | 1.874 | 1.578 | **1,19x** |

**13 de los 15 mejores posts del año de Adam Grant son imagen sola.**

**⚠️ Chris Donnelly NO cuenta como referencia viva.** Su post de 2023 (102.802 reacciones) es el origen del formato con métricas simuladas — y son **creíbles, no millonarias**: `11.096 reacciones · 274 comentarios · 429 reposts`, cuando el post real acabó 9x por encima. Pero en sus últimos 500 posts (jun-25 → ago-26) **no queda ni uno**: hoy hace texto largo con puerta de comentario. Se bajó del formato. No se puede probar que LinkedIn lo nerfeara; sí que el que lo inventó lo dejó.

#### ⛔ 4.6-RIESGO · LOS DOS AVISOS QUE VAN ANTES DEL BORRADOR

**1. Este formato QUITA comentarios.** Medido en las tres cuentas, sin una sola excepción:

| | comentarios/likes imagen | resto | reposts/likes imagen | resto |
|---|---|---|---|---|
| Adam Grant | **3,2%** | 5,0% | **5,5%** | 4,7% |
| Alex Hormozi | **9,9%** | 14,2% | **4,5%** | 3,8% |
| Leila Hormozi | **13,1%** | 15,7% | **4,2%** | 3,2% |

Es una **máquina de alcance y repost, no de conversación**. → **Se juzga por alcance y reposts, NUNCA por comentarios.** Y por eso no puede tocar el slot del lead magnet, que vive del conteo.

**2. Ninguna cuenta pequeña de la BD lo ha hecho funcionar.** Todas las de menos de ~150k seguidores que lo intentaron tienen lift < 1: Matt Lakajev 0,23x · Kimberly Price 0,39x · Álvaro Fontela 0,29x · Edson Noyola 0,09x. Son muestras de 1-5 posts y probablemente ni siquiera este formato, así que **no es doctrina** — pero la dirección es unánime y nosotros estamos en 126-146 de engagement medio, no en 15.000. **Por eso es prueba y no pilar.**

#### 4.6-PASO-1 · La tarjeta: 3 párrafos, y el orden no se toca

Anatomía medida sobre **14 de 14 tarjetas de Adam Grant**, leídas una a una:

| Rasgo | Medida |
|---|---|
| Párrafos | **3 en 13 de 14** (la otra son 2, contraste puro) |
| Cifra en P1 | **0 de 14** |
| Dato en P2 | 5 de 14 (`24 experiments:` · `6 studies:` · `Study of problem-solving teams:` · `Data on >34k stars`) |
| P3 aforismo | **14 de 14**, siempre más corta que P1 y P2 |
| Hashtags / emoji / enlaces / menciones | **0 de 14** |
| Barra de métricas | **recortada en 14 de 14** |

```
P1   LA CREENCIA FALSA del mundo comercial. SIN cifra. 1-2 líneas.
     (línea en blanco)
P2   LA EVIDENCIA. Abre nombrando la fuente. Aquí SÍ va la cifra.
     (línea en blanco)
P3   EL AFORISMO. Más corto que P1 y P2. Es lo que se comparte.
```

**Los 3 submoldes de P1, por frecuencia medida:**
1. **Negación + afirmación** — `No es X. Es Y.` El más frecuente. De Grant: *"The cure for ignorance is not information. It's humility and curiosity."*
2. **Afirmación tajante** sobre un colectivo. De Grant: *"Too many mediocre men talk over capable women."*
3. **Vocativo de regañina al jefe** — `Hey leaders:` / `Dear leaders:`, 2 de 14. Traducido: **`Directores comerciales:`**. Es el que más cerca queda de nuestro ICP y del motor de rabia que ya sabemos que funciona.

**El tema: las 14 atacan una creencia del MUNDO DEL TRABAJO.** Ni producto, ni empresa, ni "yo". En cuanto la tarjeta habla de Neety, deja de ser este formato.

- **La cifra de P2 va verificada contra fuente real** y se cita **el nombre, nunca el año** (`global §3.5b`). El año va en la entrega interna, para responder en comentarios.
- **⛔ Y P1 NUNCA lleva cifra.** Cero de catorce.

#### 4.6-PASO-2 · El artefacto (registro screenshot documental, `images §3` registro 2)

**La tarjeta finge ser un post de X.** Eso la mete de lleno en `images §0a-sexta-ter`, que ya lo dice con estas palabras: *"a veces tenemos que ser tan fieles a las referencias que sí hay que hacerlo, como cuando calcamos algo de Twitter y copiamos hasta los colores"*.

**→ NO entra la marca: ni paleta Neety, ni Bricolage/Switzer, ni palabra naranja.** Es una falsificación, y una falsificación con la tipografía de la marca es una falsificación mala.

```
[avatar REAL del jefe]  Nombre exacto ✔ (check azul)
                        @handle
                                        ← RECORTE AQUÍ. Nunca la barra de métricas.

P1
(blanco)
P2
(blanco)
P3
```

**Paleta medida (rota, y nunca dos seguidas iguales):**

| HEX | Tono | Veces en las 14 |
|---|---|---|
| `#FFFFE5` | crema | 2 |
| `#F3FFFF` | azul hielo | 3 |
| `#F1FEEC` | verde menta | 3 |
| `#F2E2E5` | rosa polvo | 2 |
| `#FEFBF4` | marfil | 1 |
| `#FFFFFF` | blanco | 3 |

Texto `#0F1419`, sans, **cuerpo grande**. Grant va de 0,91 a 1,00 de ratio; nosotros **1:1 y 800x800**, que es lo que manda `images §0b` sin excepciones y además cae dentro de su rango.

**⛔ NUNCA APAISADO.** Andy Elliott es el único de la BD que lo hace apaisado (1,55-1,74) y es el que peor rinde del grupo.

**⛔ Y NUNCA MÉTRICAS FALSAS.** Los tres que viven del formato hoy recortan por encima de la barra de likes. El único que las puso se bajó del formato. No hay razón para heredar la parte que ya no sostiene nadie.

#### 4.6-PASO-3 · El texto de LinkedIn

**150-400 caracteres.** La tarjeta **ES el gancho**, así que el texto **arranca ya en cuerpo**: no repite la frase de la tarjeta ni explica la imagen (`global §2.0c`).

**Que el texto entre no es opinión, está medido** en las cuentas de referencia:

| chars | Alex Hormozi | Leila Hormozi |
|---|---|---|
| 0 | 1,00x (n=65) | 1,00x (n=49) |
| **1-150** | **0,95x (n=111)** | **1,06x (n=114)** |
| **151-400** | **0,91x (n=49)** | **1,11x (n=39)** |

Con muestras de más de 100 posts, el texto corto es **neutro o sube**.

**Lo que SÍ penaliza es el CTA imperativo:** Alex 0,80x y Leila 0,90x contra sus propios posts sin CTA. Recuento de CTA: Grant **0 de 75**, Alex 11 de 393, Leila 8 de 353.

- **✅ Spam ninja de agendar: OBLIGATORIO**, en su posición canónica. No es un CTA imperativo — es un enlace enterrado en cuerpo, y la doble puerta ya está refutada como no-capadora (`§4.5.0-PUERTAS`).
- **⚠️ Spam ninja de correo: OPCIONAL post a post**, igual que en meme (`global §4.4e-MEME`).
- **⛔ CTA imperativo: PROHIBIDO.** Nada de `comenta`, `descarga`, `sígueme`, `dime qué opinas`.
- **⛔ Hashtags y emoji: CERO**, dentro y fuera de la tarjeta.

**El pasillo de `§4.4e-PRONTO`, resuelto para este pilar:** esa regla exige ≥2 bloques de cuerpo entre el gancho y el ninja de agendar. Aquí el gancho vive en la imagen, así que **se siguen contando 2 bloques desde el inicio del texto**, lo que deja el enlace sobre el carácter 200.

**⛔ Y las reglas de ritmo de `global §3.2` NO aplican**, por el mismo motivo por el que no aplican al meme: con 150-400 caracteres no hay sitio para escalera, par obligatorio ni alternancia de bloques. Forzarlas aquí es inventarse un post largo que este formato no tiene.

#### 4.6-PASO-4 · Validación y entrega

```bash
python scripts/validar-post.py <fichero.txt> --pilar tarjeta [--cuenta X]
```

Entrega, fuera del bloque: la línea del validador, el tag de viralidad, los **dos avisos de `§4.6-RIESGO`**, el prompt de la tarjeta y **el año de la fuente de P2**.

**Al publicar, al historial** (`docs/skills/historial-publicaciones.md`): cuenta, fecha, creencia atacada, fondo usado y **alcance + reposts** (no comentarios).

#### 4.6-HANDLE · La cabecera de la tarjeta (CERRADO, Iker 2026-08-20)

La tarjeta simula X, así que la cabecera son **dos líneas**: nombre exacto con check azul, y debajo el `@handle`. En LinkedIn no existen los handles; en X sí, y por eso hay que rellenarlo.

**Decisión de Iker: se es fiel a la referencia y se simula X**, con el mismo criterio que ya se aplica a los memes que simulan capturas: *"cuando subimos memes que simulan capturas, casi siempre son capturas de personas que en Twitter no existen"*.

**LOS TRES HANDLES, y no se cambian post a post:**

| Cuenta | Nombre exacto (línea 1) | Handle (línea 2) |
|---|---|---|
| Iker | `Iker Galarza Rodríguez` | `@ikergalarza` |
| Unai | `Unai Arambarri Yeregui` | `@unaiarambarri` |
| Asier | `Asier Olaizola` | `@asierolaizola` |

- **Salen de vuestro identificador REAL de LinkedIn** (`ikergalarza`, `unai-arambarri-yeregui`, `asier-olaizola`), no de la nada. No se inventa ninguna identidad: es el nombre propio.
- **⛔ Se quitan los guiones.** En X un handle solo admite letras, números y guion bajo. `@unai-arambarri-yeregui` delata la tarjeta a quien la mire dos segundos.
- **⛔ Y se acorta el de Unai a dos palabras.** `@unaiarambarriyeregui` son 20 caracteres y se lee como un churro; los handles de las referencias son cortos (`@AdamMGrant`, `@AlexHormozi`, `@LeilaHormozi`).
- **El nombre de la línea 1 va COMPLETO y exacto**, como en LinkedIn (`feedback_nombres_nunca_acortados`). Lo que se acorta es el handle, no el nombre.
- **La foto es la REAL del jefe**, la misma del perfil. Es lo que sostiene la cabecera.
---

## 5 · Dónde el círculo SE PARA y te devuelve (gates humanos — aquí mandan las skills)
El playbook empuja autonomía total; para posts quedan estas paradas, pero **más ligeras que antes** (ahora Claude rellena, tú validas, no rellenas desde cero):
1. **Empresas y menciones @:** Claude las **rellena con reales verificadas** (§4.0) y te da la lista "revisa estas". Tu trabajo pasa de *rellenar* a *dar el visto bueno* — salvo lo que quede marcado `[PENDIENTE · no verificado]`, que sí completas tú.
2. **Cifras (mapa):** Claude propone y cita fuente; la **confirmación final antes de publicar es tuya**.
3. **Elegir variante + avisos de riesgo:** el sistema entrega 2-3 y AVISA; no auto-publica ni auto-elige.
4. **Imagen:** el sistema da el párrafo/concepto; **generarla** (pegarlo en tu generador) y subirla es tuyo.

Todo lo demás (investigar, verificar, rellenar con reales, redactar, autocriticar) corre solo. El objetivo real: **de idea a borrador ya casi listo que revisas y publicas**, no "de idea a post publicado sin ti".

---

## 6 · Formato de salida (override del playbook)
El playbook dice "output = acción ejecutada o HTML estudio". Para posts **no**: el output es el de `working-preferences §1` (un bloque cercado por variante, sin markdown dentro del post, "por qué" + tag + concepto de imagen fuera). El HTML briefing solo tendría sentido para un plan de contenido semanal, no para el post en sí.

---

## 7 · Cosas del playbook que SÍ adoptamos tal cual
- **Pensar "si lo hiciera a mano, ¿qué pasos?"** antes de montar (= la receta §4).
- **Que Claude te diga siempre qué espera de ti para el siguiente paso** (paso 10) → puedes llevar varios hilos a la vez sin recoger contexto de cero.
- **Dictar por audio** al montar/pedir: das más contexto que tecleando.
- **Encadenado vs paralelo** como las dos únicas formas de organizar el trabajo.

---

## 8 · EL WORKFLOW REAL: planificador semanal de las 3 cuentas

### ⭐ LA VENTANA DE PUBLICACIÓN (CORREGIDO 2026-07-20, la 1ª versión estaba MAL)

**⚠️ AVISO SOBRE LA VERSIÓN ANTERIOR.** Aquí ponía *"los 10 posts que han pasado de 6x están todos entre las 10:00 y las 13:00"* y *"después de las 13:00 nada ha pasado de 3.57x"*. **Las dos frases eran FALSAS.** Salieron de un análisis cuyo filtro de pilares **no reconocía los memes**, así que tiraba a la basura justo los posts de más alcance. Corregido sobre los **90 posts desde abril de 2026**, sin filtrar por pilar.

| Franja | n | Mediana | Media | **Impresiones medianas** |
|---|---|---|---|---|
| antes de 10h | 4 | 0.70x | 1.07x | 4.475 |
| **10:00-11:00** | 25 | **1.29x** | **3.38x** | **11.065** |
| 11:00-12:00 | 10 | 1.02x | 2.39x | 5.221 |
| 12:00-13:00 | 29 | 0.72x | 2.79x | 4.082 |
| 13:00-14:00 | 16 | 0.69x | 1.87x | 5.247 |
| 14:00+ | 6 | 0.48x | 0.92x | 3.611 |

**LO QUE SÍ SE SOSTIENE:**
- **La franja 10:00-11:00 es la mejor**, y por bastante: sus impresiones medianas (11.065) **doblan a las de cualquier otra franja**. Ahí están el 16.44x, el 12.90x, el 9.96x y el 8.51x.
- **Después de las 14:00 no hemos hecho nada bueno nunca**: n=6, el mejor 2.16x. Muestra pequeña, pero es lo único que hay.

**⛔ LO QUE NO SE SOSTIENE Y NO SE PUEDE USAR DE EXCUSA:**
- **Las 13:00 NO son la muerte.** A esa hora están el **8.45x** (86.815 impresiones) y el **7.82x** (78.711). Si un post publicado a las 13:30 hace 0.59x, **la hora no lo explica**: a esa misma hora hemos hecho 8x.
- **El VIERNES no es mal día.** Medido sobre **20 viernes**: nuestros **dos mejores posts de la historia** (16.45x y 16.44x, ~166.000 impresiones cada uno) son los dos de viernes, y uno de ellos a las 13h. La primera versión decía n=3 porque el filtro roto se comía los memes, que era justo lo que se publicaba los viernes.

**EL VIERNES Y EL MEME (decisión del usuario, 2026-07-20 — NO se hardcodea):** los datos dicen que viernes + meme es nuestra combinación más potente (16.45x y 16.44x, ~166.000 impresiones cada uno). **Aun así NO se convierte en regla**, y el motivo es de planificación, no de rendimiento: **las 3 cuentas no pueden publicar el mismo pilar el mismo día** (exclusividad de categoría por día, §8). Si el viernes fuera "día de meme", o lo monopoliza una cuenta o las tres hacen lo mismo, que es justo lo que se quiere evitar con 3 cuentas.
- **Lo que sí vale:** recomendar el viernes-meme **a UNA cuenta concreta** (p. ej. Iker) y dejar el resto libre.
- **Lo que no vale:** escribirlo como regla general para las tres.

**Regla operativa:** apunta a **10:00-11:00** si puedes, porque es donde está el doble de alcance. Pasadas las **14:00**, sabes que vas con la muestra en contra. Entre medias, la hora **no** es una explicación válida de un flop: busca la causa en el ángulo o en el motor del pilar (`outliers-database §3.10`).

### ⭐ 8.0 · LA 4ª CUENTA OPCIONAL: MARIO (marketing) — Iker, 2026-07-22
Al planificar, además de las 3 de founder (Iker/Unai/Asier), considera **opcionalmente ~1 post/semana para Mario** (Growth & Marketing, ficha completa en `aboutme §2`). **NO entra en el cuadro latino 3×3** ni en la exclusividad de categoría de las 3 founder: es un **EXTRA**, unas semanas sí y otras no → **pregunta a Iker si esta semana toca Mario**. Reusa los mismos pilares que funcionan (mapa / meme / "Los 10") pero **anclados a MARKETING** (pelotea a gente y empresas de marketing, no industriales), con las **menciones obligatorias** (`@neety` + `@Unai` + `@Iker` + `@Asier`) y, si es post de resultados, **calcando el dashboard de analíticas de LinkedIn** (no un diseño). Su parte de comentarios/analíticas es **manual** (no está en Unipile). Y es buen sitio para **estrenar pilares nuevos de marketing**.

### 8.0 · ⭐ LEE EL PILAR ANTES DE SACAR CONCLUSIONES (Iker, 2026-07-27)
Cada post lleva ahora su **etiqueta de PILAR** en la herramienta (chapa de color arriba en la tarjeta, junto al multiplicador; la calcula `backend/src/services/pillar.ts`): `peloteo_mapa · peloteo_los10 · lead_magnet · meme · historia · otro`.

**Compara SIEMPRE dentro del mismo pilar.** Sin la etiqueta se sacaban conclusiones falsas: mirando la tabla en crudo parecía que *"los posts cortos van mal"*, cuando lo corto eran los **memes** (cortos por diseño, el motor es la imagen) y los **lead magnets** (que acaban en "comenta X"). De hecho **los dos mejores posts de la historia son cortos** (16,37x y 15,64x). La longitud no explica nada; el pilar sí.

**Y cada pilar se juzga con su propia vara:**
- **Peloteo (mapa / los 10):** el pilar de ALCANCE. Se le exige multiplicador alto (histórico 3-8x).
- **Meme:** alcance disparado y **reacciones de risa**, no me-gusta.
- **Lead magnet:** se juzga por **comentarios y leads, NUNCA por ratio de outlier**. Un lead magnet ronda 1x por naturaleza (los últimos: 28L/39C y 30L/34C, más comentarios que likes, que es exactamente el gate funcionando). Medirlo con la vara del mapa lleva a "arreglar" lo que no está roto.
- **Historia:** likes muy por encima de comentarios.

### 📉 8.0-RIESGO · UNA SEMANA NO PUEDE DEPENDER DE UN SOLO POST (medido el 2026-08-05)

**La semana del 27 al 31 de julio: 8 posts, 123.402 impresiones, y UNO SOLO aporta 93.744. El 76%.** Y 142 de los 225 clics. **Siete de los ocho quedaron por debajo de 1.0x**, o sea por debajo de la media de su propia cuenta.

**Eso no es una buena semana, es una semana frágil.** Si ese meme no sale, la semana entera son 29.658 impresiones repartidas entre siete posts. **El resultado dependió de un acierto, no del sistema.**

**Qué hacer con esto al planificar:**
- **Mirar la semana entera, no post a post.** Si al repasar el plan ves que solo hay una apuesta fuerte y seis de relleno, el plan está mal repartido aunque cada pieza cumpla su receta.
- **El pilar que más mediana da es el peloteo** (21.295 contra 2.925 de un post suelto), así que **una semana sin peloteo en ninguna cuenta es una semana que depende del azar del meme**.
- **Y avisar de la fragilidad en la propia planificación**, con el número: es más útil decir *"esta semana el 70% del alcance depende del martes"* que repasar siete posts uno a uno.

### 🌴🌴 8.0-AGOSTO · EN AGOSTO NO SE PUBLICA PELOTEO (Iker, 2026-08-14) — OVERRIDE ESTACIONAL CON FECHA DE CADUCIDAD

**Aplica a las semanas del 17/08 y del 24/08 de 2026, y caduca el 31/08.** No es doctrina permanente: es un override de calendario que **manda sobre §8.1 y §8.2 mientras dura**.

**LA REGLA:** las tres cuentas publican **MEME + LEAD MAGNET + HISTORIA**. **Cero peloteo** — ni mapa, ni "Los 10", ni despiece — en ninguna de las tres.

**POR QUÉ, y el motivo es del pilar, no del mes:** el peloteo es **el único pilar cuyo motor está FUERA de nosotros**. Funciona porque la empresa y la persona mencionadas reciben la notificación, entran, reaccionan y reparten el post a SU red. **En agosto en España esa gente está de vacaciones**, así que la notificación cae en un móvil que nadie mira y el motor no arranca. El post puede estar perfecto y aun así no repartir. Es la frase de Iker del `historial-publicaciones`: *"el algoritmo no es un robot, es tu público objetivo"*.
- **🔴 Y ya está MEDIDO EN AGOSTO, no es una hipótesis** (sacado de la BD el 14/08): el **despiece de Navarra de Asier (07/08)** hizo **1.273 impresiones · 0.39x**, con 12 empresas verificadas una a una, 6 personas con actividad comprobada y saliendo en el feed de las 4 cuentas desde el minuto uno. **El pilar tiene 21.295 de mediana: se quedó en el 6%.** El post no falló; faltaba el público.
- **Y el precedente de fuera de agosto apunta a lo mismo:** el mapa de Cataluña de Unai (17/07) hizo **0.59x con 3.018 impresiones** cuando sus otros mapas van a 21-36K, y la causa que dio Iker fue **que las empresas nos ignoraron**. En julio eso fue mala suerte; en agosto es la norma.
- **El contraste, la misma semana y en las mismas cuentas:** los memes de agosto van a **95.913 (6.91x)** y **89.320 (6.04x)**. **No es que agosto baje el techo: es que baja el techo del pilar que depende de terceros.**
- **No es que el formato se haya quemado.** El peloteo sigue siendo el pilar de más mediana (21.295 impresiones). Lo que falta es el público, y vuelve en septiembre.

**LO QUE OCUPA SU SITIO, y por qué cada uno aguanta agosto:**
1. **MEME — 3 FIJOS POR SEMANA, UNO POR CUENTA. No es "si da tiempo".** Iker lo dice con nombre: ha habido semanas en las que el meme se cayó por falta de tiempo y se priorizaron otros pilares; **en agosto eso no pasa**. Es el pilar cuyo motor es **100% nuestro** (imagen + gancho): no depende de que nadie conteste. Y agosto lo confirma — el tatuaje y el de *"vender es un caos"* se dispararon **en agosto**.
2. **LEAD MAGNET — todas las semanas.** Acabamos de volver a encontrar cómo hacerlo viral: el **CTA dentro de la imagen** (`§4.5.0-CTA-IMAGEN-MEDIDO`), que el 12/08 sacó **71 comentarios sin capado**. Y aguanta agosto porque **quien comenta es gente ACTIVA de fuera de nuestra red**: no necesita que nuestro público objetivo esté en su mesa.
3. **HISTORIA — entra en la rotación semanal.** Deja de ser el pilar "de vez en cuando, por variedad" de `§4.6-OBJETIVO` **durante agosto**. Con n=2 en Iker sostiene 5.000-6.500 impresiones **sin estructura validada** y da el CTR más alto anotado en el historial (`§4.6-MEDIDO`). Y como la escena se inventa desde un dolor real (`§4.6-INVENTAR`), **no tiene cuello de botella de investigación ni depende de terceros**: es el pilar más barato de producir, que es justo lo que hace falta para sostener 9 posts en agosto.

**QUÉ CAMBIA EN EL CUADRO LATINO (§8.2):** nada de la mecánica. Las tres categorías por día siguen siendo tres y siguen siendo exclusivas; lo único que cambia es **cuáles**: `PELOTEO → HISTORIA`. La alternancia mapa ↔ "Los 10" queda **congelada** y se reanuda en septiembre por donde se quedó.

**⚠️ EL RIESGO, DECLARADO Y ACEPTADO A PROPÓSITO (contra `§8.0-RIESGO`):** una semana sin peloteo es una semana con menos suelo — el peloteo da 21.295 de mediana contra 2.925 de un post suelto. **En agosto se acepta a sabiendas**, y la compensación es que los **tres memes son innegociables** y el lead magnet entra todas las semanas: tres tiros al motor que sí funciona en agosto, en vez de uno. **Al planificar hay que decirlo con el número, no taparlo.**

**⛔ EL AVISO QUE ME TOCA DAR ESTE MES (Iker lo pidió explícitamente):** si en agosto se pide un mapa, un "Los 10" o un despiece, **aviso ANTES de escribir una línea** con el dato de arriba y ofrezco **dejarlo preparado para septiembre** en vez de publicarlo. **No es un veto:** si Iker confirma, se escribe entero y se entrega, que la decisión es suya (`working-preferences §2`). Mecanizado como AVISO (que no resta en el marcador) en `validar-post.py` para `--pilar mapa|los10|objeto` cuando la fecha del sistema cae en agosto.

### 📅 8.0-SEPTIEMBRE · LAS 2 PRIMERAS SEMANAS DE SEPTIEMBRE SE DEJAN ESCRITAS ANTES DE LAS VACACIONES (Iker, 2026-08-14)

**Las fechas, que ya están cerradas (Iker, 2026-08-14):**

| Hito | Fecha |
|---|---|
| Último día de trabajo | **viernes 28/08** — deadline duro: todo escrito, validado, con imagen y **programado** |
| Vacaciones | **lunes 31/08 → viernes 11/09** (2 semanas) |
| Semanas a cubrir | la del **31/08** y la del **07/09** |
| Vuelta | **lunes 14/09** |

**El calendario de preparación, y arranca YA:**
- **Semana del 17/08 — se baja el ritmo de publicación a propósito.** Menos posts esa semana, porque las horas se van en dejar septiembre montado. No es dejar de publicar: es publicar menos y preparar más. La semana del 10/08 salió muy bien y da colchón para hacerlo.
- **Semana del 24/08 — el grueso.** Aquí se monta y se cierra todo, con el viernes 28 como tope.
- **No se planifica desde las vacaciones.** Lo que no esté hecho el 28/08 no sale.

**📦 EL VOLUMEN ESTÁ CERRADO: 6 POSTS POR SEMANA, 2 POR CUENTA. 12 EN TOTAL (Iker, 2026-08-14).** No son 9. **El recorte es deliberado y no se negocia al alza:** el ritmo normal aspira a 8-9 y esas semanas se publica **dos tercios**, porque sin la capa manual de interacción (`el aviso de abajo`) más volumen no rinde más, solo llena el feed. **No propongas subirlo.**

**LA ESTRUCTURA DE CADA SEMANA — 2 por cuenta = 1 peloteo + 1 de otro pilar:**

| | Cuenta A | Cuenta B | Cuenta C |
|---|---|---|---|
| **Peloteo** (1 por cuenta y semana) | **Mapa** | **Despiece** | **"Los 10"** |
| **El otro post** | meme / lead magnet / historia | ídem | ídem |

- **Los tres jefes llevan peloteo LAS DOS SEMANAS**, y **el formato rota entre ellos**: quien hace mapa la semana del 31/08 no lo repite la del 07/09. Así salen **6 peloteos** (2 mapas, 2 despieces, 2 "Los 10") y **6 posts de los otros pilares**.
- **⛔ ESTO ABRE EL TOPE COLECTIVO DE `§8.2`** — que decía *un mapa y un "Los 10" por semana entre las tres cuentas* — a **un post de CADA UNO de los tres formatos por semana**. Es lo único que permite que las tres cuentas lleven peloteo. Precedente: en la semana del 03/08 ya convivieron un mapa (Iker, 04/08) y un despiece (Asier, 07/08).
  - **⚠️ Y esta apertura NO se va a poder validar con esas dos semanas**, porque sus métricas no generan doctrina (aviso de abajo). **Queda como excepción de la ventana, no como regla nueva**, y se decide en octubre con datos limpios. Si en septiembre se ve saturación del pilar, se vuelve al tope de dos.
- **Región nueva por cuenta** (`historial-publicaciones`, tabla de cobertura, **actualizada el 14/08**), menciones verificadas una a una y CSV/imagen ya montados.

**🔧 FIJO Y DECIDIDO: EL DESPIECE DEL SEGUNDO JEFE ES DE MÁQUINA HERRAMIENTA (Iker, 2026-08-14).**
- **Él quiere despiece sí o sí**, y el sector tiene que ser **uno que no hayamos hecho nunca**: los dos despieces publicados son de **automoción** (Euskadi 30/07 y Navarra 07/08). Máquina herramienta es sector industrial con interés real de audiencia y no está tocado.
- **⛔ Pide PLANTILLA NUEVA, y eso es trabajo de diseño, no de texto.** Solo existe la de la llanta (automoción). Se crea con **12 huecos transparentes** como manda `§4.7` Paso 2, misma cocina que la llanta (1254×1254, franja berenjena con el título editable y `XXX` de marcador de región, fondo menta, silueta en línea berenjena). `scripts/montar-llanta.py` **sirve tal cual**: detecta los huecos transparentes solos y los ordena por ángulo.
- **Siluetas candidatas, a elegir con Iker** (una sola, la más reconocible por cualquiera y no solo por un ingeniero): una **fresa/broca** de mecanizado · un **plato de torno con sus garras** (es un círculo, así que hereda la lectura de reloj de la llanta) · un **engranaje** · una **llave fija**. La regla de `§4.7` Paso 1 manda: reconocible por cualquiera y despiezable.
- **⚠️ La REGIÓN de este despiece está sin decidir y tiene trampa:** la máquina herramienta se concentra en Euskadi/Gipuzkoa, **y Euskadi ya está gastada para un despiece de Iker** (el coche, 30/07). Repetir región Y formato en la misma cuenta es repetir. Alternativas a mirar: **Castilla y León** (Burgos, Nicolás Correa) — ojo, que Iker ya hizo su mapa el 04/08 —, Cataluña o Valencia. Y aplica el aviso duro del pilar: **si la región no llega a 12 empresas del sector, se cambia de región, no se rellena** (`§4.7` Paso 1).
- **El despiece de alimentación** que quedó parado en agosto (espátula o gorro de cocinero) sigue vivo como **el segundo despiece**, el de la otra semana y otra cuenta.

**⏱️ AVISO DE CARGA, y es el riesgo real de este plan:** son **6 peloteos + una plantilla nueva desde cero** en **10 días laborables**, publicando a la vez. El peloteo es con diferencia el pilar más caro (12 empresas verificadas una a una, personas con actividad comprobada, CSV, imagen montada). **Recomendación: los 6 peloteos primero y la plantilla la semana del 17/08**, y que los 6 posts "del otro pilar" sean **memes e historias**, que no dependen de verificar a terceros. Si algo se cae, que se caiga por el lado barato.

**🧪 EXPERIMENTO NUEVO: SE PROGRAMA CON LA HERRAMIENTA NATIVA DE LINKEDIN.** Nunca lo hemos probado — siempre se ha subido a mano. La sospecha viene de TikTok (allí lo programado pierde alcance), pero **es un mito sin comprobar en LinkedIn** y ahora hay ocasión de medirlo. Todo lo demás se respeta igual: hora de la franja buena (10:00-11:00), gancho, cuerpo, foto.

**⛔⛔ Y AQUÍ VA EL AVISO QUE MÁS IMPORTA: LAS MÉTRICAS DEL 31/08 AL 11/09 NO GENERAN DOCTRINA.**
Durante esas dos semanas **no va a estar la capa manual que hace funcionar el sistema**: comentar y responder rápido desde las 4 cuentas, reparto interno, seguimiento de la primera hora. Solo habrá una persona pendiente y sin acceso a todas las cuentas. **Y encima se cambia una segunda variable a la vez** (programado en vez de manual).
- **Consecuencia operativa:** de esas dos semanas **no sale ninguna regla nueva, ni se declara muerto ningún pilar, ni se toca ninguna receta**. Si un post cae, la explicación por defecto es la falta de interacción, no el copy.
- **Y no valen de baseline**: al comparar en septiembre y octubre, esas dos semanas se marcan como periodo anómalo, igual que se marca agosto.
- **Lo que sí se puede medir de ahí, y con cuidado:** el experimento de la programación nativa, comparando **solo** contra posts del mismo pilar y cuenta — y aun así con la advertencia de arriba encima.

### 📅✅ 8.0-PROGRAMAR · LA HERRAMIENTA NATIVA DE LINKEDIN NO PENALIZA EL ALCANCE (medido 2026-09-14)

**La duda llevaba abierta desde que se decidió dejar septiembre escrito (`§8.0-SEPTIEMBRE`): nadie sabía si programar con el nativo de LinkedIn costaba alcance.** Ya está contestada, y a favor.

- **7 posts programados, 7 publicados.** Ni uno se cayó, ni uno se quedó en la cola.
- **El post más grande de la historia de la casa salió programado:** el meme de Iker del 01/09, **218.529 impresiones**, sin nadie delante para empujarlo en la primera hora.

> **Programar no cuesta alcance.** Se puede dejar contenido programado sin descontar nada por el formato de publicación.

**⛔ Y lo que esto NO autoriza, que es la lectura peligrosa:** no dice que el sistema funcione igual sin la capa manual. En esa misma ventana la frecuencia bajó a la mitad, las cuentas no se comentaron entre sí y se quedaron comentarios sin responder — y **la mediana de impresiones de la segunda semana fue de 1.364 contra 20.260 de la primera**. Lo que está medido es la fontanería (publica o no publica), no el rendimiento. **Programar más no sustituye a estar delante**, y el volumen de las semanas sin nadie sigue cerrado donde está (`§8.0-SEPTIEMBRE`).

### 8.1 · Las 3 categorías de pilar (unidad de rotación)
- **PELOTEO (regional)** = { **Mapa regional** | **"Los 10"** directores/comerciales regionales }. Ensalzan una zona o a personas. Los dos formatos cuentan como **la MISMA categoría** a efectos de intercalado (no pueden coincidir dos peloteos el mismo día).
- **LEAD MAGNET** (comment-gated).
- **MEME** (con motor).

Vídeo, evento y formatos nuevos quedan **fuera de la rotación por defecto**; entran solo si tú lo pides (8.4).

### 8.2 · La regla de intercalado (exclusividad por día = cuadro latino 3×3)
Cada día de publicación, las 3 cuentas cubren las **3 categorías DISTINTAS** (nunca dos cuentas la misma categoría el mismo día), y a lo largo de la semana **cada cuenta pasa por las 3**. Ejemplo de reparto:

| Día | Iker | Unai | Asier |
|-----|------|------|-------|
| Martes | Peloteo | Lead magnet | Meme |
| Miércoles | Meme | Peloteo | Lead magnet |
| Jueves | Lead magnet | Meme | Peloteo |

- **Frecuencia por defecto:** 3 posts/semana/cuenta (tú confirmas la frecuencia al lanzar).
- **Días/horas por defecto:** martes-jueves; 11:00-12:00 y 14:00-15:00 (hora local). Configurable.
- **Rota semana a semana** quién hace qué (que no salga idéntico).
- **⭐ Dentro de PELOTEO, cada cuenta ALTERNA semana a semana: mapa → "Los 10" → mapa → "Los 10"…** Si la semana pasada esa cuenta sacó mapa, esta semana le toca "Los 10", y al revés. **Esa alternancia ES lo que produce el espaciado de ≥2 semanas entre mapas** (§8.3): no hay que calcularlo aparte, sale solo. Cambia siempre región/tema.
- **⛔ REGLA DURA (Iker, 2026-07-27) — UN SOLO MAPA Y UN SOLO "LOS 10" POR SEMANA, CONTANDO LAS TRES CUENTAS.** En una misma semana, **solo una cuenta** publica mapa y **solo otra cuenta** publica "Los 10". La tercera cuenta se queda **sin peloteo** esa semana (hasta que exista el tercer formato de peloteo, §8.1b). Esto ANULA lo que decía antes esta línea ("sí pueden coincidir dos cuentas en el mismo pilar la misma semana"), que era falso y nos costó caro.
  - **Por qué, con datos (medido 2026-07-27):** entre el 14 y el 23 de julio salieron **4 peloteos en 10 días** entre las tres cuentas, y el pilar se hundió: Iker pasó de **7,68x (563 likes) el 30-jun** a **2,69x (176)** y **1,23x (95)**; Unai de **2,92x (287)** a **0,71x (55)**. En junio, con la mitad de densidad, todos rendían 5-7x.
  - **No es el tamaño de la región,** que era la excusa fácil: **Navarra (660.000 habitantes) hizo 7,68x y Murcia (1,5 millones) hizo 1,23x**. La región pequeña ganó a la grande. Lo que cambió fue la **frecuencia**.
  - **La causa:** las tres cuentas son la misma empresa, comparten público objetivo y se comparten entre ellas. Aunque cada cuenta respete su espaciado individual, **el formato se quema a nivel COLECTIVO**. El espaciado por cuenta no basta.
  - Y como siempre: regiones distintas y personas distintas, y **nunca repetir el concepto**.
  - 📌 **EXCEPCIÓN CON FECHA (Iker, 2026-08-14): las semanas del 31/08 y del 07/09** el tope pasa a **un post de cada uno de los TRES formatos por semana** (mapa + despiece + "Los 10"), para que las tres cuentas lleven peloteo mientras Iker está de vacaciones. Es una ventana concreta, no un cambio de regla, y **no se puede validar con esas semanas** porque sus métricas no generan doctrina (`§8.0-SEPTIEMBRE`). Se decide en octubre.

### 8.3 · Guardarraíles de espaciado (entre semanas) → vía el HISTORIAL
> **Todo se mide POR CUENTA.** Ninguna de estas reglas es global entre cuentas.
- **Mapa (dos guardarraíles, y hay que pasar los DOS):** (1) ≥2 semanas entre mapas de la MISMA cuenta, que sale solo con la alternancia de §8.2; y (2) **el tope COLECTIVO de §8.2: un solo mapa y un solo "Los 10" por semana entre las tres cuentas.** El segundo es el que de verdad protege el pilar, porque la audiencia es compartida. Nunca dos semanas seguidas de mapa en la misma cuenta. **No repetir región EN ESA CUENTA** (la cobertura por cuenta está en `docs/skills/historial-publicaciones.md`; entre cuentas sí se puede repetir región, pero nunca el concepto).
- **Lead magnet: NO hay espaciado.** ⚠️ Aquí ponía "≥2 semanas por cuenta; nunca dos seguidos" y **es falso** (se corrigió en `global §4.4` y `§4.5` el 2026-07-14 pero esta línea se quedó sin tocar). **La fatiga de lead magnet no existe:** Iker publicó uno el **27-may (0.59x)** y otro el **28-may (8.52x, el 2º mejor post del histórico)**, días consecutivos y en la misma cuenta. La única diferencia fue el CTA ("Comenta" explícito), no el calendario. **Si un lead magnet flopea, mira el ángulo y el CTA, nunca la fecha.** Lo único que se mantiene: no solapar dos cuentas el MISMO día, que ya lo impide el cuadro latino.
- **Mecanismo:** el planificador LEE el archivo **`historial-publicaciones.md`** (registro vivo) al empezar, respeta el espaciado a partir de él, y **añade la semana nueva** cuando la apruebas. Hay que **commitear** ese archivo cada vez que cambie para que el historial no se pierda. Si el historial está vacío o desactualizado, el workflow **te pregunta** qué hizo cada cuenta las últimas 2 semanas antes de asignar.

> #### ⛔⛔ EL ESPACIADO SE MIDE CONTRA LA BD, NO CONTRA EL PLAN (2026-09-15)
>
> **El fallo, y lo repetí en tres entregas seguidas del mismo post:** avisé de que el peloteo de Unai salía *"a 7 días del despiece de Cataluña del 09/09"*, y **ese despiece nunca se publicó**. Estaba en el cuadro del plan de septiembre de `historial-publicaciones`, con su día y su cuenta, y lo leí como un hecho. Lo mismo con el "Los 10" de Navarra del 11/09. **Su último peloteo real es del 31/07: 47 días, no 7.**
>
> **El plan dice lo que se iba a publicar; solo la BD dice lo que se publicó.** Un post puede caerse, moverse o quedarse escrito sin subir, y eso pasa de verdad: de las dos semanas programadas de septiembre, **de 12 posts planificados salieron 7**.
>
> **LA REGLA: el gap de espaciado se saca de `GET /api/creators/{id}/posts`, filtrando por pilar y mirando la fecha real del último publicado.** El historial se usa para el PORQUÉ (qué región, qué concepto, qué se aprendió), nunca para el CUÁNDO.
>
> **⚠️ Y el coste de equivocarse aquí no es cosmético:** un aviso de riesgo inventado se lee luego como hecho y frena una publicación que estaba bien. Es la misma familia que `working-preferences §0g`: lo que tiene número se mide, y este lo tenía.
>
> **⭐ Y de paso, el dato que salió al medirlo de verdad, que corrige otra creencia:** el gap por cuenta, **solo, no explica el rendimiento**. Peloteos a ≤9 días del anterior: n=10, mediana **13.496** impresiones. A ≥14 días: n=8, mediana **17.158**. Dentro de cada grupo la varianza se come la diferencia (a 5 días hay un 79.224 y un 8.781; a 22 días, un 6.572). **Lo que sí está medido es el tope COLECTIVO de `§8.2`** — 4 peloteos en 10 días entre las tres cuentas hundieron el pilar en julio —, que es densidad entre cuentas, no el hueco de una sola.

### 8.4 · LA PREGUNTA PREVIA (obligatoria, antes de planificar nada)
El workflow SIEMPRE arranca preguntando:
> *"¿Planificamos la semana con los 3 pilares de siempre (peloteo / lead magnet / meme) o quieres meter o probar un formato nuevo esta semana (vídeo, evento, otro)?"*
- **"Lo de siempre"** → aplica el cuadro latino de 8.2.
- **"Formato nuevo X"** → lo encaja donde digas y recoloca el resto respetando el intercalado.

### 8.5 · Flujo del workflow (paralelo por cuenta)
1. **Pregunta previa** (8.4) + confirmar frecuencia y días.
2. **Proponer la MATRIZ semanal** (tabla cuenta × día × categoría) aplicando 8.2 + 8.3. Para cada celda de PELOTEO, decidir si mapa o "Los 10" y la región/tema.
3. **[Checkpoint] Enseñarte la matriz** para aprobar o ajustar ANTES de generar (recomendado siempre; imprescindible las primeras semanas).
4. **Generar los posts en PARALELO** (una rama por cuenta; dentro de cada post, el runbook del pilar §4.2-4.5, encadenado): verificar datos → hook → cuerpo → CTA → concepto de imagen → Loop de validación (§8).
5. **Entregar:** la matriz + todos los posts, cada uno con su texto en bloque cercado, tag, "por qué", riesgos, concepto de imagen y "revisa estas" (empresas/cifras/menciones). Y **di qué esperas de mí** para el siguiente paso.

### 8.6 · El output por post (lo que te devuelve)
- **PRIMERO el TEXTO perfecto (gancho + cuerpo)** en bloque cercado, listo para copiar.
- **Fuera del bloque:** tag de viralidad, "por qué funciona", riesgos y el **CONCEPTO DE IMAGEN** (un párrafo listo para el generador).
- **La imagen en sí:** el párrafo/prompt de imagen es el entregable y la generas tú. **No hay que pedirlo aparte** — el concepto de imagen sale del propio runbook del pilar.

---

## 9 · Cerrar el bucle: medir y aprender (después de publicar)
El sistema no termina al entregar el post. Para que mejore con el tiempo:
1. **Registrar el resultado:** cuando un post lleva unos días, apunta en `historial-publicaciones` su **ratio real** (y likes/comentarios/reposts). Así el planificador tiene datos frescos y el espaciado sigue teniendo sentido.
2. **Destilar el aprendizaje:** si un post **rompe** (muy por encima) o **flopea** (muy por debajo) de lo esperado, saca UNA frase de aprendizaje y proponla para la skill que toque (`outliers-database §4` si es un ratio/patrón, `swipe-file` si es un molde de texto, `global-instructions` si es una regla nueva). No lo dejes solo en la memoria de la conversación.
3. **Persistir:** el aprendizaje solo cuenta si se guarda en el archivo y se **commitea**. Memoria ≠ archivo (ver README, flujo de actualización).
4. **Refrescar los ratios:** cada 1-2 meses, reexporta "Top posts" y el Explorer y actualiza §4 y §3 — los ratios decaen y las mecánicas se queman.

### 🧪🧪 9b · CÓMO SE HACE UN A/B DE VERDAD AQUÍ (Mario, 2026-08-26)

> **Iker, y es la forma en que piensa todo lo de esta semana:** *"al final lo que estamos haciendo es A/B testing. Es como ayer, hemos reconvertido una limitación —que el tercer jefe no me pasa una foto suya individual— y hemos subido una foto de grupo. Así descubrimos, pero necesitamos más pruebas de qué pasa. Eso lo comprobaremos cuando en la misma cuenta hagamos la misma prueba dos veces"*.

**Y tiene razón en la parte que más nos cuesta: para leer un A/B, la prueba se repite en la MISMA cuenta.** Entre cuentas no se puede comparar, porque la baseline es distinta y el ratio se calcula contra ella (`outliers-database §3.15`).

**LAS CUATRO CONDICIONES, y sin las cuatro no es un A/B, es una anécdota:**
1. **UNA variable por vez.** Si un post cambia la rama, el vehículo, la región y la foto a la vez —como el del 26/08— **no se puede atribuir nada a nada**. Se dice al entregar y se acepta a propósito, pero no se lee después como si fuera una prueba.
2. **Misma cuenta y mismo pilar.** La baseline manda.
3. **La etiqueta se apunta EN EL MOMENTO, en la ficha del historial.** Una condición que no se anota el día que se publica no existe dentro de un mes. Es la misma razón por la que se anota qué foto se subió (`§4.6-FOTO`).
4. **No se lee con n=1 por brazo.** Con 5.000-9.000 impresiones el ruido se come cualquier diferencia pequeña. **La vara práctica: 3 o 4 posts por condición** antes de sacar una conclusión, y si el corte no es limpio (como el 15/3 de `working-preferences`), no hay regla.

**⛔ Y EL ERROR QUE HAY QUE EVITAR ES EL DE SIEMPRE: confundir la variable con el PILAR** (`global §4.4b`). Antes de comparar dos condiciones, comprueba que las dos tienen el mismo reparto de pilares detrás.

**A/B ABIERTOS AHORA MISMO** (estado vivo, el detalle en `historial-publicaciones`):
| prueba | brazo A | brazo B | estado |
|---|---|---|---|
| **Foto de la historia** | selfie individual | foto de grupo | A: 4 posts · B: 1 (Asier 25/08, 9.187 imp y subiendo). **Falta repetir B en la misma cuenta** |
| **Registro de la foto** | oficina | casa, informal | 21/08 Unai en oficina (5.651 imp · 43 clics) contra 26/08 Unai en casa. **Mismo pilar y misma cuenta: es el A/B más limpio que tenemos**, aunque el resto del post cambie |
| **Rama del pilar** | historia propia | historia de otro | A: 4 · B: 1 (26/08) |
| **Variante regional** | sin región | con región | A: 4 · B: 1 (26/08), **confundida con la rama** |
| **Posición del enlace en peloteo** | abajo (88-96% del texto) | a media cola (<80%) | A: 20 posts · B: Cantabria 01/09 (60%) y Bizkaia 16/09 (74%), **los dos de Asier**. Detalle en `§4.0d` punto 6 |

---

## ⚙️ EL CRUCE DE MENCIONES (añadido 2026-07-20)

`§4.0c` prohíbe repetir empresa o persona entre posts de la misma región, contando
las TRES cuentas y los DOS formatos. A ojo no escala: en Cataluña había **83
entidades ya mencionadas** entre el mapa de Iker y el "Los 10" de Unai.

**Ahora lo comprueba el validador.** Fuente: `docs/skills/menciones-usadas.json`
(518 entidades de 22 posts de peloteo), con normalización que caza `Bioibérica`
contra `Bioiberica` y `Prefabricados Pujol` contra `Prefabricats Pujol`.

```
node scripts/extraer-menciones.mjs     # regenerar tras publicar un peloteo
```

⚠️ **Regenéralo DESPUÉS de publicar, no antes.** Si lo regeneras con el borrador
ya publicado dentro, al revalidar ese mismo post se detectará a sí mismo.
