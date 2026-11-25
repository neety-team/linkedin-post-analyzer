# SKILL: aboutme — Quiénes somos (Neety + los 3 perfiles de LinkedIn)

> **name:** aboutme
> **description:** Contexto de identidad. Úsalo SIEMPRE que escribas o edites una publicación de LinkedIn para Neety, o cuando necesites saber quién es la empresa, qué vende y quiénes son las tres personas en cuyas cuentas publicamos (El segundo jefe, el primer jefe, el tercer jefe).
> **when-to-use:** Cargar al inicio de cualquier tarea de creación de contenido de LinkedIn. Es la base sobre la que se apoyan `brand-voice`, `working-preferences`, `global-instructions` y `outliers-database`.

---

## 1 · La empresa: Neety

Neety construye **sistemas de outbound operativo con IA** para **empresas industriales B2B** y **empresas de servicios B2B**.

- Frase raíz de posicionamiento: **"No vendemos AI SDRs. Operamos pipeline."** (🔄 Es posicionamiento interno, no frase para un post: `pipeline` y los anglicismos los veta `brand-voice §2b`, 07/08.)
- Categoría que reivindicamos: **outbound operativo** (concepto propio, repetible en los posts para construir categoría). (🔄 `outbound` en el gancho es demasiado nicho, check `DEMASIADO_NICHO`; en los posts la categoría de Neety es `herramienta`, 15/10.)
- Pruebas de cliente (usar cuando encajen, ancla mejor que la auto-promoción):
  - **+200 PYMEs** atendidas. ⚠️ `[PENDIENTE · sin origen documentado]`
  - **+40% de conversión** sobre baseline en industrial. ⚠️ `[PENDIENTE · sin origen documentado]`
  > ⚠️ **Estas dos cifras NO tienen fuente registrada** (detectado el 2026-07-14 al revisar un gate donde iban a salir publicadas como prueba social). Esta skill las listaba como "pruebas reales", pero nadie ha documentado de dónde salen. **Hasta que alguien las confirme, NO se publican**: ni en un post, ni en un gate, ni en la web. La regla no admite excepciones por ser cifras nuestras — de hecho es peor, porque un cliente las puede preguntar. Si son ciertas, apunta aquí la fuente y quita el aviso.
  - **0 herramientas genéricas** — todo se construye sobre el playbook del cliente.
- **⛔ Neety es MASCULINO (2026-10-16): `el nuevo Neety`, `lo presenté`**, porque es el producto. Se me coló `La nueva @Neety la presenté`. Fallo duro en `validar-post.py` (`NEETY va en masculino`). `la nueva versión de Neety` sí vale: ahí el femenino es de `versión`. **Y en los posts su categoría es `herramienta`** (no `software`, `brand-voice §2b`), así que con `herramienta` de sujeto concuerda en femenino (`nuestra herramienta… la programé`) y con `Neety` solo, en masculino (`el nuevo @Neety lo presenté`).
- Web: **neety.io** (🔄 desde el 05/10 la web principal y la puerta de los posts es `neety.com`, línea de abajo.)
- Link de agendar demo (el que metemos en spam ninja): ⛔ **DESDE EL 2026-10-05 ES `https://neety.com/solicitar-demo`, EN POSTS Y EN CORREOS** (El equipo: *"a partir de ahora, tanto en publicaciones de LinkedIn como en correos, ya no mandamos a la web de recursos a agendar; vamos a mandar a la web principal a solicitar demo"*). Mismo formato de UTM (`global §4.4b-UTM`), la página lo guarda igual. **`recursos.neety.com/agendar/` es fallo en `validar-post.py` y `validar-email.py`.** 🔄 **Desde el 22/11/2026 `recursos.neety.com` ya no existe** (redirige con 301) y todo vive en `neety.com`: mapas en `neety.com/blog/mapa-industrial-<region>`, correo en `neety.com/newsletter` y páginas de lead magnet en `neety.com/academia/<slug>` (tabla en `lead-magnet-web.md`, arriba). Cualquier enlace a `recursos.neety.com` es fallo en los dos validadores. ✅ **Iker probó el 05/10 que el calendario de `/solicitar-demo` ya notifica bien**: el aviso de abajo sobre Google Chat queda resuelto.
  - ~~`https://recursos.neety.com/agendar/`, y sigue siéndolo hasta que Iker diga lo contrario.~~ (hasta el 04/10)
- **✅ MIGRACIÓN CERRADA PARA AGENDAR EL 2026-10-05 (línea de arriba). Historia de cómo se llegó, `https://neety.com/solicitar-demo` (2026-09-29):** El 28/09 dijo que se cambiaba y el 29/09 lo frenó: *"esta semana aún estoy retocando todo… si tenemos una demo en la nueva web, aún no notifica bien por Google Chat… aún hay que migrar también todos los recursos, toda la sección de mapas"*. **Hasta entonces, todo post iba a `recursos.neety.com` (agendar, correo, mapas).** (Ese dominio ya no existe desde el 22/11/2026.)
  - **⏰ DESDE EL LUNES 05/10, EN CADA PUBLICACIÓN QUE SE PREPARE, SE AVISA EN EL CHAT sin que lo pida:** *"¿esta ya va a la web nueva?"*, con lo que dependa del pilar (el mapa no tiene sección en la web nueva todavía). La decisión es suya post a post hasta que la migración esté cerrada. **Mecanizado:** `validar-post.py` sacaba ese aviso a partir del 05/10 cuando el post enlazaba a `recursos.neety.com`; desde el 22/11/2026 ese enlace es fallo (el dominio ya no existe).
  - **Cuando se estrene**, el primer post de cada cuenta con el dominio nuevo puede quedarse ~20 min en revisión (hipótesis mía por analogía con el primer UTM, `global §9.0b`): no se borra antes de 30.
  - Lo que ya se sabe de la página nueva: promete lo mismo (*"Lo difícil no es cerrar. Es saber a quién llamar, y por cuál empezar"*, buscador en directo de **empresas + interlocutor**, reserva de 30 min con Iker) y **guarda el UTM de primera visita** en `sessionStorage` (comprobado en su JS el 28/09), así que el formato de UTM de `global §4.4b-UTM` no cambia. Mismo contenedor GTM (`GTM-5WB7KCLM`). `validar-post.py` ya la reconoce como la puerta de agendar (`puerta_agendar()`), para el día que se use. ⚠️ Las notificaciones de demo a Google Chat desde esta página **aún no funcionan bien** (29/09).
- CTA founder-led que genera confianza: *"Reserva 30 min con Iker · si no encajamos, te lo digo yo mismo."*
- Cumplimiento: RGPD como **encargado del tratamiento (art. 28)**, integración con CRM, y **"no reemplaza a tu equipo comercial"** (alinea con el pilar 3).

### El ICP (a quién le hablamos)
- **Broadly** empresas B2B medianas/grandes.
- Segmento fuerte y recurrente: **exportadores industriales** (los outliers de mapas regionales lo prueban), pero **NO exclusivo**: servicios B2B, SaaS, consultoras, clientes B2B de agencias también encajan.
- Persona concreta a la que se le escribe el hook: **director comercial de 45-60 años** que vende (p. ej. maquinaria industrial en Gipuzkoa), lleva vendiendo desde antes de que existiera Salesforce, **no** es early-adopter de IA, **no** lee Hacker News y **no** conoce jerga de LLMs.
- Error a evitar: forzar cada post a un marco industrial. Si la idea es SaaS / servicios, inclínate hacia ahí.
- **🔄 17/11 · Lo que HACE Neety se dice sin sector** (`every company has one person who decides`, no `every industrial company`). La industria es la prioridad, no el límite: una frase que ata el producto a un sector le dice al resto que no es para ellos. El sector sí puede ir en la ESCENA (con quién trabajamos, de qué hablamos), nunca en la promesa.
- **🌎 Mercado: cualquier país (2026-10-26).** La herramienta se usa desde el navegador, no se instala nada, así que se puede vender en Latinoamérica o en cualquier sitio, y el objetivo a futuro es ser internacionales. **Un inscrito o un lead de fuera de España es público válido, no ruido** (el meme del compañero de marketing del 21/10 inscribió a varios de México). El post sigue en español y con la persona de arriba; lo que cambia es que no se descarta a nadie por el país. Ojo con las horas: un evento a las 10:00 de España cae a las 3:00 en México, y a esos inscritos les toca la grabación.

---

## 1b · Qué nos hace DISTINTOS (propuesta de valor real — usar para cuerpos no genéricos)

> Esta sección es la munición contra los cuerpos genéricos. Cuando un post toca "cómo vende Neety" o el dolor del comprador, aterrízalo en estos pilares y contrastes concretos en vez de hablar de "IA para ventas" en abstracto. (Fuentes: documento interno "Propuesta de valor vs. landing" + el **deck oficial de 12 páginas firmado por Iker**, en `Documentos/Mario/LINKEDIN GROWTH/PROPUESTA VALOR NEETY.pdf`, jul 2026.) **⭐ ESTA SECCIÓN ES TRANSVERSAL (2026-07-27):** no se usa solo en el post que la motivó. Vale para el cuerpo de cualquier publicación, para **todo spam ninja** y para **el contenido de cualquier recurso que regalemos** — un recurso tiene que enseñar de verdad el método manual y, al hacerlo, dejar sentir su coste (que son los 4 dolores del deck), para que el botón final de agendar caiga por su propio peso.

### Los 3 pilares (lo que de verdad nos separa del resto)
> 🔄 Superado como munición de post el 24/08 y el 16/09 (`CLAUDE.md`, `global §4.4b-MUNICIÓN`, `brand-voice §2c-DATOS`): esto describe el producto, no son frases para el post. En el texto no se promete la señal (pilar 2), ni automatismo (pilar 3), ni el teléfono del interlocutor (pilar 1: se dice `con su contacto`).

1. **Listados con confianza, no listas.** No es "una lista de empresas": es **segmentación técnica profunda** (materiales, procesos, certificaciones, señales a favor y en contra) que da un **% de confianza** alto de que cada empresa encaja. Dos matices del deck que lo afilan: (a) **los mejores clientes no salen en ningún filtro** — son los poco digitalizados o mal etiquetados, y por eso "descargar 2.000 empresas" no es prospección; (b) **cada empresa llega con su PRUEBA**: la frase literal de su web o su LinkedIn que demuestra que cumple el criterio, con el enlace para comprobarlo ("la prueba, no la etiqueta"). Y el **interlocutor con email y teléfono verificados**. El punto de partida es la **calidad**, no el volumen.
2. **Contacto por señal, no por secuencia — "de metralleta a francotirador".** No contactamos a 500 personas porque "toca" en una cadencia (eso quema el mercado y hunde la respuesta). Neety **espera a que pase algo que justifique escribir** y entonces avisa y propone el acercamiento **con contexto**. Contactar por señal dispara la respuesta y la conversión muy por encima de la lista fría.
3. **El comercial enseña; la herramienta replica — "propone, tú confirmas".** Hay automatización del envío, **pero el comercial valida cada comunicación y da feedback**, y Neety aprende **por comercial** (qué empresa acepta o descarta, qué mensaje corrige, qué señal le vale). Entrega **tareas accionables ya redactadas por IA, listas para confirmar**; el tono lo decide el comercial. Cuanto más lo usa, más se parece a él — "se vuelve vuestro".

### 🔴 LO QUE DICEN LOS CLIENTES REALES — MANDA SOBRE LA TEORÍA

> **⭐ ACTUALIZADO EL 2026-08-24 CON EL INFORME NUEVO.** Fuente vigente: `Documentos/Mario/LINKEDIN GROWTH/FEEDBACK CLIENTES 24 AGO.html` · **258 citas literales, 63 empresas, 87 reuniones, 1 jul - 20 ago 2026**, con el encaje de ICP marcado empresa por empresa (**64 de cada 100 citas** salen de una cuenta que encaja). **No es otro documento: es el MISMO informe de demos con un mes más**, así que sustituye al de 50 demos (167 citas, 42 empresas) sin discutir con él. **Todo lo que decía sigue en pie y ha subido de tamaño muestral.** Un tema solo cuenta como **patrón** cuando lo dicen **3 empresas distintas**, no cuando se repite mucho en la misma reunión.

> 🔄🔄 **ACTUALIZADO EL 2026-10-16 CON EL INFORME DEL 15/10, QUE MANDA SOBRE LO DE ABAJO:** `FEEDBACK CLIENTES 16 OCT.html` · **792 citas, 131 empresas, 201 reuniones, 1 jul - 14 oct**, 77 de cada 100 citas de una cuenta que encaja. Lo de abajo se queda como historia; **los tamaños vigentes y las citas nuevas están en `global §4.4b-MUNICIÓN-1510`**. En una línea, lo que ha cambiado:
> - **Buscar contra contactar:** 15 → **37 empresas** (23 ICP). Sigue siendo el dolor nº1.
> - **La persona de dentro:** 2 → **16 empresas** (15 ICP). Ya no es una anécdota: es patrón. *"sabemos quién es Exxon, pero nos falta el jefe de compras y el jefe de ingeniería"* (Lointek).
> - **El listado que acierta:** 8 → **16** (14 ICP). **Lo mismo que ya haces, hecho entero:** 4 → **10**.
> - **La señal como argumento:** 12 → **19** objeciones (15 ICP). **Descubrir un mercado:** 4 → **17** (16 ICP), la que más crece: en su nicho ya se conocen a todos, y lo que les falta es la persona.
> - **Que lo escriba la IA:** 5 → **13** objeciones. **Datos de terceros:** 3 → **10**.
> - 🆕 **Contra quién nos comparan ahora:** un chat de IA (**17 empresas**, 13 ICP: *"eso ya lo tengo ahora mismo gratuito"*) y las bases de datos de empresas (**13, todas ICP**). Sales Navigator sube a 8 (7 ICP) y Waalaxy y Apollo a 10, con solo 1 ICP.

**⚠️ LA SEÑAL NO ES EL ARGUMENTO PRINCIPAL. Lo es la IDENTIFICACIÓN. Y ya no son 8 empresas: son 12 (9 del ICP), del 14 jul al 19 ago.** Es la **objeción más repetida de todo el informe**: *"veo como más interés en la primera parte, que es la identificación sobre todo y las personas. La parte de las señales obviamente me parece interesante, pero a un nivel más secundario"* (Adrián · bigD · 17 jul). Llevábamos meses montando el spam ninja sobre *"de metralleta a francotirador"*, y el mercado dice que eso es el postre, no el plato. **Con 12 empresas ya no es una señal débil: es lo más medido que tenemos.**
- **Y el informe nuevo dice POR QUÉ no convence, que es lo que faltaba:** el que decide **no publica** (*"los cargos con los que quiero contactar son poco activos en redes sociales"*, Synthetrial · 14 jul), y cuando la señal es pública **ya vas tarde** (*"Cuando un proyecto se hace público, está adjudicado ya… normalmente vas tarde"*, Biele Group · 21 jul). No es que la señal les parezca mal: es que **llega tarde y a quien no está**.

**El dolor nº1, y ahora en 15 empresas (9 del ICP):** buscar empresas a mano se come el tiempo de contactar. *"intentar identificar la persona, tocar de una empresa intenta saltar a otra, de una filial intenta saltar a otra"* (Lander · Burdinola · 24 jul). La formulación más limpia, y **sirve casi tal cual de línea de ninja**, es de bigD (16 jul): *"todo aquello que nos pueda ayudar a eliminar un tiempo de trabajo en prospección y dedicarlo a contactar, que es donde realmente se genera"*. **El contraste es buscar CONTRA contactar**, no "ahorrar tiempo" en abstracto.

**⭐ LO NUEVO DE AGOSTO, Y AFINA EL EJE: EL CUELLO DE BOTELLA ES LA PERSONA, NO LA EMPRESA.** Tema nuevo del 19 ago, 2 empresas y **las dos del ICP**: *"dar con la persona que compra el producto nuestro es una de las dificultades"* (Iñaki Zaldua · Ecenarro) y *"son bases de datos… no te da el interlocutor en la empresa, lo que te da es ese posible listado de empresas"* (Iria Iglesias · Gaitek). **La empresa la saben; el nombre de dentro, no.** Un ninja que solo promete "te encontramos las empresas" está vendiendo la mitad barata: **la parte cara, y la que nos separa de una base de datos, es el interlocutor.**

> 🔄 **ACTUALIZADO EL 2026-09-14, y el eje se queda pero cambia de PATA.** En el informe nuevo (359 citas, 77 empresas) este tema **sigue en 2 empresas**, las mismas dos, y sale marcado `Reincide`, **no `Patrón`**: tres semanas y 101 citas nuevas sin que lo diga nadie más. Y hay **una cita ICP en contra** que hay que conocer antes de usarlo — *"solamente con los nombres de las empresas ya me vale. **Me dice las personas, porque yo las personas yo las consigo**"* (Ariel · Composites Martiartu). **No todo el ICP tiene ese cuello de botella, así que no se escribe como si fuera universal.**
> 
> **⭐ Y aun así NO se degrada, porque la pata que lo sostiene ahora es NUESTRA:** la historia del primer jefe del 11/09 se escribió sobre este dolor y es **el mejor CTR de toda la ventana (0,756%)**, el doble que el segundo, sacando más clics él solo con 3.042 impresiones que los otros dos posts de esa semana juntos. **El informe mide cuántos lo dicen; nuestra base mide cuántos pinchan.** El detalle y la regla que sale de ahí, en `global §4.4b-MUNICIÓN-PUNCH`.

**El elogio que mejor vende, y su unidad de medida — MESES:** *"solamente con los nombres de las empresas ya me vale. Me dice las personas, porque yo las personas las consigo. Claro, puede ser un trabajo de meses"* (Ariel · Composites Martiartu · 10 jul). **Usa "meses", no "horas": es la palabra que ellos usan.** 🔄 02/11: lo que manda es la magnitud (mucho tiempo), no la palabra; nuestra redacción rota con sinónimos de igual o más peso (`global §4.4b-UNIDAD`).

**⭐ Y AHORA HAY UN SEGUNDO ELOGIO CON FRASE APROVECHABLE, en 3 empresas:** *"es un poco lo que llevamos haciendo nosotros de forma manual, pero mucho más completo y más rápido"* (Oscar Oteiza · Vi4crane · 22 jul). **La promesa que sí se puede hacer es esa: lo mismo que ya haces, hecho entero.** No es magia, no es automático, y por eso se cree.

**⚔️ CONTRA QUÉ nos comparan, con nombre propio** (útil para el ninja: un enemigo concreto vende más que "la prospección manual"):
- **La licencia (Sales Navigator) — 5 empresas, pero NINGUNA es ICP A.** *"nos puede interesar si eso quiere decir que no nos hace falta contratar el [Sales] Navigator de LinkedIn, que es muy caro"* (Noergia · 16 jul). ⚠️ **Y el ICP nuclear dice lo contrario:** *"Este primer paso yo lo puedo hacer gratis, en Sales Navigator o en LinkedIn"* (Fagor Automation · 5 ago). **El ángulo NO es el precio: es que la licencia te da la lista y no el nombre de dentro.** Desglose completo y las líneas que sí valen: `global §4.4b-LICENCIA`.
- **Waalaxy y Apollo — 5 empresas: volumen sin calidad.** *"campañas demasiado masivas, con unos ratios de conversión muy bajos, más de volumen"* (i+Med · 27 jul). **Un ninja que promete cantidad nos mete en su caja.**

**Qué NO prometer en un post (objeciones reales, con su tamaño):**
- **Que el mensaje lo escribe la IA — 5 empresas.** Es objeción dura y con daño: *"vimos tantos de estos mensajes que directamente los ignoramos… se detecta claramente cuando está automatizado"* (Innobide · 20 jul). **Automatismo total = la promesa que quema la confianza del que nos lee.**
- **Que descubre un mercado que ellos no conocen — 4 empresas.** En nichos pequeños ya se lo saben: *"es un círculo muy muy cerrado… sabe quiénes son los compradores"* (Cluster Papel · 13 jul). Lo que compran ahí no es descubrir, es **no tener que hacerlo a mano**.
- **Nada que suene a manejar datos de terceros — 3 empresas lo preguntan en voz alta:** *"¿Tú de dónde has sacado el correo?"* (Binary Soul · 9 jul). Enlaza con la señal de ilegalidad de `brand-voice §2c-DATOS`: **si el mercado ya lo pregunta en una demo, en un post abierto pesa el doble.**

Lo que compran es **a quién vender y quién decide dentro**.

### Qué NO somos (posicionamiento — lo que hay que romper en la cabeza del lector)
- **NO** una agencia que prospecta por ti.
- **NO** "una herramienta de prospección más" con la promesa de siempre.
- **NO** una secuencia/cadencia ciega con IA.
- **SÍ** somos un **software que opera tu propio equipo**: tú y tu comercial al mando.
- Regla de oro: la diferencia **no se afirma con un eslogan** ("no somos X"), se **demuestra** con los 3 pilares. Y nunca decimos "sin esfuerzo / lo hace por ti / tú solo cierras" (eso nos mete en la caja de "agencia/autopilot").

### Los contrastes (dolor de mercado → cómo lo resolvemos) — mina de hooks y cuerpos
| El "así se hace" del sector (dolor) | La forma Neety |
|---|---|
| "x3 más contactos" / volumen / spray | Confianza del listado: % de encaje real |
| Lista genérica ("a qué empresas y cargos") | Segmentación técnica por materiales, procesos, certificaciones y señales |
| Secuencia ciega / cadencia de 500 "porque toca" | Contacto por señal → sube respuesta y conversión |
| "Los contacta en tu nombre / sin esfuerzo" | Tareas accionables prescritas por IA que el comercial **confirma** |
| "Cuando hay un buen momento" (vago) | Señales concretas que disparan la acción (ver abajo) |
| Cazamos y tú solo cierras (saca al comercial) | El comercial valida y enseña; la herramienta replica su voz técnica |

### Las señales concretas (el motor de conversión — buenas para cuerpos y ejemplos)
Interacción en LinkedIn · cambio de puesto · **nueva planta / ampliación / inversión** · noticia relevante del sector · **un premio** · **una visita a tu web** · feria. Cuando hay señal, hay motivo → por eso la conversión sube frente a la lista fría. (La "visita a tu web" y el "premio" salen del deck de propuesta de valor, jul 2026.)

### Frases-ancla del pitch (del deck "Propuesta de valor Neety", jul 2026 — usar para hooks, cuerpos y spam ninja, variando)
> 🔄 Superado en parte: `De metralleta a francotirador` vende la señal, que el ninja no promete (24/08, `CLAUDE.md`); `Neety propone, tú confirmas` nombra a Neety, vetado en el ninja (`global §4.4b`); y `Software propio` choca con la categoría `herramienta` (`brand-voice §2b`, 15/10). Esas tres no van en hooks ni en el ninja.
- **"Tu próximo cliente no está en un filtro."** (el titular del deck — pilar 1)
- **"Lo caro no es la lista. Es todo lo que viene después."** (el reto: depurar 2.000 a 40, dar con el interlocutor, no quemar el mensaje — pilar 1)
- **"De metralleta a francotirador."** (pilar 2, el diferenciador)
- **"La prueba, no la etiqueta"** / **"cada empresa, con su porqué"** (pilar 1, la evidencia)
- **"Neety propone, tú confirmas"** / **"tú, al mando"** (pilar 3, el control se queda en el comercial)
- **"Software propio, no una agencia."** (posicionamiento — enlaza con "qué NO somos")
> ⚠️ Son el ANCLA de valor, no eslóganes para soltar tal cual en cada post (`§1b` regla de oro: la diferencia se demuestra, no se afirma). Y nunca las cruces con "sin esfuerzo / lo hace por ti / tú solo cierras".

### Encuadre CRÍTICO sobre el público (no confundir en los posts)
- **El público / comprador de Neety** son **empresas de industria y servicios** → es a **ellos** a quien se le habla.
- **Lo que Neety encuentra PARA ellos son SUS clientes** — del **sector que sea** (no necesariamente industrial).
- Por tanto "industria y servicios" describe **a quién nos dirigimos**, NO a los leads que generamos. No encajones los leads en "industrial" por defecto (enlaza con la nota del ICP más abajo: el segmento industrial es fuerte pero no exclusivo).
- La prueba del algodón del posicionamiento: si un director de compras industrial lee un mensaje nuestro en 5 segundos, debe pensar *"esto es un software que trabaja distinto: entiende a quién vendo, habla mi idioma técnico y me avisa cuando hay motivo"* — no "una agencia más" ni "otra herramienta de prospección".

---

## 2 · Los tres perfiles en los que publicamos

> **REPARTO · la única tabla con nombres (24/11).** El resto de las skills nombra a cada uno por su alias, y el validador sigue usando el nombre en `--cuenta`.
>
> | Alias en las skills | Quién | Validador |
> |---|---|---|
> | **primer jefe** | Unai Arambarri, CEO | `--cuenta unai` |
> | **segundo jefe** | Iker Galarza, cofundador (parte comercial) | `--cuenta iker` |
> | **tercer jefe** | Asier Olaizola, cofundador (parte técnica) | `--cuenta asier` |
> | **compañera de clientes** | Helena, Partnerships & Customer Success | `--cuenta helena` |
> | **compañera de diseño** | Angela, Product Designer | `--cuenta angela` |
> | **compañero de ventas** | Ismael, Sales Consultant | `--cuenta Ismael --voz-ajena` |
> | **compañero de ventas de zona** | José Tomás, SDR de la Comunitat Valenciana (desde el 24/11) | `--cuenta jose --voz-ajena` |
> | compañero de marketing | cuenta dada de baja el 24/11 | — |
>
> **«Los jefes»** son los tres primeros. **«Los compañeros»** son las tres cuentas siguientes, y entra en el grupo cualquier trabajador que se sume.


⛔ Obsoleto desde el 26/10: hoy son 5 cuentas (las 3 de founder más la compañera de clientes y la compañera de diseño, cada una con su carril, `§2-CARRIL`; la del compañero de marketing se dio de baja el 24/11 porque deja la empresa) y el primer jefe ya no va solo de ventas (autoridad ante el ecosistema). Lo que sigue es registro. Publicamos en **tres cuentas de founder**, todas sobre **ventas B2B**. Desde julio 2026 las tres están activas y se coordinan entre sí (ver reglas de coordinación abajo y en `global-instructions`).

### ⛔⛔ 2-CARRIL · CADA CUENTA ES **VENTAS + SU OFICIO**, Y ESO DECIDE QUÉ REFERENCIA LE TOCA (2026-08-19) — CANÓNICO

> **El fallo que lo motiva, y es mío:** el 19/08 le llevé al TERCER jefe un meme de **transcripción de una llamada a puerta fría**. Iker lo movió al segundo en cuanto lo vio: *"este meme encajaría mucho más con el segundo jefe, ya que él es comercial y él sí que llama por teléfono, entonces ese gancho cuadra"*. La referencia era buena; **la cuenta estaba mal elegida**, y eso se decide ANTES de escribir una línea.

**La regla: las cinco cuentas anclan a VENTAS, siempre y sin excepción. Lo que cambia es el SEGUNDO carril, que es el oficio de esa persona, y es de donde sale la REFERENCIA del meme.**

> **🔄 26/10 (Iker): el primer jefe sale del paraguas de ventas.** En su cuenta lo principal es la **autoridad ante el ecosistema** (inversores, fondos, fundadores, instituciones) y el gancho ya no está OBLIGADO a anclar a ventas, sobre todo en los posts de evento (un gancho de ventas sigue valiendo): ancla a lo que pide el post, variando la palabra y sin ser obvio (`brand-voice §1b`, carril del primer jefe). Ventas sigue valiendo en su cuenta cuando el post es para convertir. **El segundo jefe y el tercer jefe siguen bajo ventas**: Iker quiere conversión y autoridad en ventas en general; el tercer jefe, igual que Iker, con el gancho de ventas general y lo técnico solo en el cuerpo (su gancho técnico: mediana 1.063, n=9, contra 3.774 sin él, n=11; `§2-ASIER-MEME`).

### ⛔⛔⛔ LA REFERENCIA ES SIEMPRE DE VENTAS EN LOS TRES JEFES. EL CARRIL SOLO DECIDE **QUÉ RINCÓN** DE LAS VENTAS (2026-08-24) — CANÓNICO, MANDA SOBRE TODO LO DE ABAJO

> **El equipo, literal:** *"solo tienes que coger referencias de marketing en el caso de que trabajemos con el perfil del compañero de marketing, que es una excepción. Al igual que solo tienes que coger referencias de atención al cliente o customer support si trabajamos con la compañera de clientes. Si no, siempre las referencias tienen que ser ya las originales, aunque estén en otro idioma, siempre de ventas"*.

> **🔄 24/11: la excepción de marketing desaparece con la cuenta del compañero de marketing, dada de baja (`§2`, su ficha).** Ya no se buscan referencias de marketing para nadie; la única excepción de referencia fuera de ventas que queda es la de la compañera de clientes (atención al cliente).

**Lo que estaba mal escrito y me costó dos referencias en un día:** esta tabla decía que la referencia sale del **OFICIO** de la cuenta, y de ahí deduje que para el primer jefe valía una referencia del mundo del founder aunque no fuera de ventas (propuse una de un CMO de marketing). **No vale.** En los tres jefes la referencia **nace dentro de ventas**; lo que cambia con la cuenta es **de qué parte de ventas**.

| Cuenta | La referencia sale de | Qué NO vale |
|---|---|---|
| **El primer jefe** (1er jefe, CEO) | ventas **desde el que manda**: el jefe de ventas, el director comercial, el CEO que pide números, el forecast, la reunión de pipeline | Founder o inversión sin ventas dentro |
| **Iker** (2º jefe, comercial) | ventas **de calle**: llamar, puerta fría, el cliente que no coge, el viaje a ver al cliente. Única cuenta que aguanta el registro bruto (`post-workflow §4.4-STOP`) | — |
| **El tercer jefe** (3er jefe, técnico) | 🔄 **desde el 08/10, en MEME: ventas UNIVERSAL**, lo que vive cualquier comercial o director comercial (el pedido, el cliente, la competencia, la cuota, el ascenso), **mirado desde fuera**: el tercer jefe no vende y no se pone un rol que no tiene (`§2-ASIER-MEME`). ~~ventas con lo técnico al lado: la herramienta, el dato, el producto~~ (5 memes técnicos, mediana 718 imp) | Un chiste de programación o de herramienta que solo pilla quien sabe de software, y cualquier gancho donde él diga que vende, llama o tiene jefe de ventas |
| **La compañera de clientes** (customer success) | 🟢 **EXCEPCIÓN: atención al cliente y partnerships** | — |

**✅ El caso al derecho (Iker, 2026-09-29):** el meme de Dachi Beberashvili (*"I'll just check LinkedIn for a minute before I start calling"*, 41% de risa) se eligió para Iker **porque va de LLAMAR**. Iker: *"es el que mejor encaja con el segundo jefe porque es con el que más libertad tenemos, y este meme no encajaría ni con el primero ni con el tercero, ya que no son comerciales, no hacen llamadas en ese sentido para vender, y encima son más sobrios"*. **Dos filtros a la vez: el rincón (llamar) y el registro (el humor más suelto).** Si una referencia de llamadas aparece cuando a Iker no le toca meme, se guarda para él; no se le da a Unai ni a Asier.

**⛔ Y NO ES SOLO LA REFERENCIA: TAMBIÉN EL NARRADOR DEL CUERPO (Iker, 2026-09-30).** El lead magnet `/sistema/` salió en la v1 contado por alguien que llama a clientes, y en la v2 yo lo puse *"desde mi mesa de producto"*. **Las dos mal.** el equipo: *"Asier se encarga de la parte de programación. No está dentro de producto, sino que siempre se comunica con el departamento de producto. Él está enfocado en lo de engineering. Tampoco es comercial"*.
- **⛔ el tercer jefe programa CON más gente (2026-10-16):** ni `yo monté lo de dentro` / `la programé` (se queda con el trabajo de los demás) ni `el equipo montó lo de dentro` (se excluye él). Es uno de los programadores: `salió de nosotros`, `lo montamos los que programamos`.
- **El tercer jefe = INGENIERÍA / programación.** Habla con producto, pero no es de producto. No llama, no vende, no hace demos. ⛔ Pero nunca se escribe que **no ha vendido nunca**: es socio de una empresa que vende desde hace 3-4 años (15/10, `brand-voice §1b`).
- **En su cuenta el que habla es el ingeniero que lo MONTA para el comercial**: *"En mi código, cada pieza sabe lo que hace la de al lado"*, *"Al comercial se lo hago igual, por módulos"*, *"Igual que con mi código, nada sale sin que alguien lo revise"*. El comercial va en tercera persona; el tema sigue siendo vender. Lo nuestro, siempre por su cara buena: nada que deje decir "qué mal se organizan" (`brand-voice`, 30/09).
- **Se comprueba antes de entregar: cada línea en primera persona, ¿la diría un ingeniero que programa y habla con producto?** Si suena a comercial o a jefe de producto, se reescribe.

**El caso que lo prueba, y es nuestro:** el meme del tercer jefe del 20/08 (la captura de una búsqueda de Google) hizo **3.010 impresiones · 0.32x**. Iker, al revisarlo: *"originalmente sí era referencia de meme pero NO de ventas, cuando siempre lo tiene que ser"*.

**⚠️ Y esto AFINA `post-workflow §4.4-FUENTE`, que decía que un meme de OTRO sector con dolor psicológico universal era "la excepción que da los mejores outliers".** Ya no se sale a buscar fuera: **se busca dentro de ventas y ahí se elige el que tenga el dolor más universal**. Lo de "que sea psicológico y universal" sigue mandando **como criterio de elección DENTRO de la cantera de ventas**, no como permiso para salir de ella.

> 🔄 **10/11: SE REABRE** (`post-workflow §4.4-SUJETO`): si el meme va de ventas en la imagen o el texto y no es de herramienta técnica, la referencia vale aunque la primera línea de su post no lleve palabra de ventas; NUESTRO gancho ancla a ventas siempre. La nota que sigue es registro.
> ⏸️ **EN SUSPENSO DESDE EL 14/10:** la excepción de abajo (gancho original sin palabra de ventas) tuvo un único caso, el león de Dachi, y se quedó en 1.565 impresiones. Hasta que Iker la reabra, solo vale la primera línea del original con palabra de ventas. Y el chiste va de una persona de ventas, nunca de una herramienta (`post-workflow §4.4-SUJETO`).

#### 🔄 ACTUALIZADO EL 2026-10-07 (Iker): LA PALABRA DE VENTAS PUEDE ESTAR EN EL GANCHO **O** EN LA IMAGEN Y EL CUERPO DEL ORIGINAL. LO QUE NO SE NEGOCIA ES QUE **NUESTRO** GANCHO ANCLE A VENTAS
> **El equipo:** *"no me había dado cuenta de la casuística de que un gancho de una referencia no tenga vinculación a ventas, pero si todo el resto del cuerpo sí que lo tiene, esa referencia sí que es válida"*. Y lo que sigue siendo regla global: *"el gancho que nosotros vamos a subir siempre tiene que tener vinculación con ventas"*.
> - **El caso:** el león de Dachi Beberashvili (06/10). Gancho `I love motivational speakers.` (sin palabra de ventas), pero la imagen dice `The lion in me after 10 hours of cold calling` y el cuerpo son tres negativas de llamada en frío. 53% de risa, ~305 risas, 26 reposts. Con la regla vieja se habría descartado la mejor referencia de la semana.
> - **⛔ ACOTADO EL MISMO 07/10 (Iker): NO VALE UNA PALABRA SUELTA EN EL CUERPO.** *"No que solo con que tenga una palabra de ventas en el cuerpo cuele… siempre vamos a priorizar referencias, sobre todo en el caso de memes, que en el gancho lo tengan. Hay veces que muchas bromas son internas del sector de las ventas"*. Si se amplía demasiado, la regla se diluye.
> - **La comprobación, por orden, y vale para meme y para CUALQUIER pilar que parta de una referencia:**
>   1. **PRIORIDAD: el gancho del original lleva palabra de ventas.** Es la vía normal y la que se busca primero. Entre dos candidatas parecidas, gana siempre la que la lleva en el gancho.
>   2. **EXCEPCIÓN, solo si se cumplen LAS DOS:** (a) **el chiste mismo es de ventas**: el texto de la imagen, que es lo que hace reír, nombra el oficio (`10 hours of cold calling`); y (b) **todo el cuerpo o su gran mayoría va de ventas** (aquí, tres negativas de llamada en frío y la lección de no abandonar la lista). Una palabra suelta de ventas en un cuerpo que habla de otra cosa **NO** la convierte en referencia de ventas, ni un hashtag, ni el headline del autor.
>   3. **El test de la excepción:** quita el gancho y lee solo la imagen y el cuerpo. ¿Es una broma que solo se entiende desde dentro de ventas? Si podría ser de cualquier oficio cambiando una palabra, fuera.
>   4. **Y la excepción se declara en la entrega**, con por qué pasa los dos puntos, para que decida Iker. Si no está en ninguno de los sitios, se descarta (el botón de IA de Alex Vacca seguiría fuera).
> - **Lo que no se mira, igual que antes:** el headline del autor ni sus hashtags.
> - **Y NUESTRO gancho ancla a ventas siempre** (`global §2.3`), aunque el del original no lo haga. Ahí se mejora la referencia: `Me flipan las charlas motivacionales de ventas`.
> - Lo de abajo se conserva como historia de cómo se llegó; donde diga "solo el gancho", manda esto.

#### ⛔⛔⛔ CÓMO SE COMPRUEBA: **EL GANCHO DEL ORIGINAL LLEVA UNA PALABRA DE VENTAS. NI EL CUERPO NI EL HEADLINE** (2026-08-25) — 🔄 ampliado el 07/10, ver arriba

> **Iker, y corrige lo que yo había escrito el día antes:** *"para poder saber realmente si es de ventas o no, no te tienes que fijar en el cuerpo de la publicación. Lo más importante tiene que ser que su gancho original del texto de la referencia ya esté vinculado a ventas, explícitamente con alguna palabra"*.

**Yo había puesto que se mira el HEADLINE del autor. No basta**, y el caso lo demuestra: propuse el meme del botón de IA de Alex Vacca, cuyo autor es founder de una empresa de outbound —headline impecable— **y cuyo gancho no lleva una sola palabra de ventas**. El equipo: *"esto no es una broma de ventas, es una publicación que podría subir cualquiera"*.

**LA COMPROBACIÓN, y son diez segundos:** coge **la primera línea del original** y busca dentro una palabra del oficio. **Si no está, la referencia se descarta**, por buen chiste que sea y por bien que encaje su autor.

**⛔ Y "PALABRA DE VENTAS" NO ES SOLO LA PALABRA `SALES`: SE BUSCA FUERA DE LA CAJA, IGUAL QUE EN NUESTROS GANCHOS (2026-08-25).** *"Está muy bien que busques la palabra sales, pero tienes que buscar más palabras. ¿Qué puede estar relacionado con ventas en inglés aparte de la palabra en sí? Pues por ejemplo comercial, cliente, ya que si tienes un cliente es que algo estás vendiendo"*. Es la misma lógica de `global §2.3`: nosotros anclamos por el rol, el oficio, el verbo, la acción o el comprador, no repitiendo "ventas".

| Familia | En inglés | En español |
|---|---|---|
| **El oficio y el rol** | sales, salesperson, sales rep, seller, SDR, BDR, AE, account executive, account manager, VP of sales, CRO | ventas, comercial, vendedor, jefe de ventas, director comercial |
| **El verbo** | sell, selling, sold, pitch, close, closing, negotiate, upsell | vender, vendes, cerrar, cierre, negociar |
| **El otro lado** | client, customer, buyer, prospect, lead, account, decision maker | cliente, comprador, prospecto, el que decide |
| **La acción del día** | cold call, cold email, outreach, follow up, demo, meeting, discovery, proposal, objection, discount | llamada, puerta fría, correo, seguimiento, reunión, propuesta, objeción, descuento |
| **El marcador** | quota, target, commission, revenue, pipeline, deal, contract, renewal, churn, CRM | cuota, comisión, factura, pedido, cartera, contrato, presupuesto |

**El test de por qué vale `client`, que es el que da Iker:** *si alguien tiene un cliente, es que algo está vendiendo*. Cualquier palabra que **solo exista porque hay una venta detrás** cuenta como ancla, aunque no diga "ventas".

**⚠️ Y SÍ, ESTO CONTRADICE A LOS EXPERTOS, QUE DICEN QUE HAY QUE ADAPTAR OUTLIERS DE OTROS SECTORES. Lo decimos en voz alta porque es nuestra experiencia la que manda** (Iker): *"eso hacía que muchas veces memes que pensábamos que iban a ir bien iban fatal de rendimiento, ya que como la referencia no estaba adaptada a ventas, esa broma tenía sentido y la gente lo pillaba en otro sector, pero en ventas no tenía el mismo impacto ni la misma gracia"*. **La gracia no viaja entre sectores; el formato sí.** Respaldo medido en `post-workflow §4.4-FUENTE-VENTAS`: mediana de 95.913 impresiones con referencia de ventas contra 1.405 sin ella.

**⛔ Y LA SEGUNDA MITAD, QUE ES LA QUE ROMPÍ EN EL MISMO POST: NUESTRO GANCHO TIENE QUE RECORDAR AL SUYO.** el equipo: *"nuestro gancho adaptado a ventas no tiene absolutamente nada que me recuerde al gancho original; no es que lo hayas adaptado a ventas, sino que lo has cambiado por completo"*. Ya estaba escrito en `post-workflow §4.4` Paso 2 (*"mismo o mejor, nunca distinto"*) y por eso ahora lleva su test: **pon los dos ganchos uno al lado del otro y pregúntate si se nota el parentesco.** Si un tercero no diría que uno sale del otro, no es un remix, es otro post.

---

**El detalle del segundo carril (el oficio), que sigue valiendo para el TONO y para el ángulo:**

| Cuenta | Carril | Registro |
|---|---|---|
| **El primer jefe** (1er jefe, CEO) | ventas **+ dirección**: levantar dinero, fundadores, inversores, la imagen seria de la empresa y de la marca | Sobrio, cero infantil |
| **Iker** (2º jefe, comercial) | ventas **+ el comercial de calle** | La única que aguanta el registro bruto |
| **El tercer jefe** (3er jefe, técnico) | ventas **+ ingeniería y programación** (habla con producto, pero no es de producto; no es comercial). ⚠️ En MEME el oficio NO decide la referencia: va ventas universal (`§2-ASIER-MEME`) | Sobrio, cero infantil |
| **La compañera de clientes** (customer success) | ventas **+ atención al cliente y partnerships** | Ya validado: su meme del 18/08, de la cantera de Customer Success Collective |

#### ⛔⛔ 2-CARRIL-GANCHO · DÓNDE ANCLA EL GANCHO NO ES IGUAL EN LAS 5 CUENTAS (2026-08-26)

> **Iker, y corrige lo que ponía justo debajo:** *"a lo mejor has enfocado el gancho y la publicación con que tu principal objetivo es vender, pero es que esto era un meme para el perfil de marketing. Siempre queremos la vinculación de marketing con ventas, sobre todo en el gancho, pero tú haces labores de marketing. En esta cuenta el gancho siempre tiene que tener alguna vinculación con marketing. La vinculación con ventas se puede tener luego en el cuerpo, pero no es tan necesaria en el gancho"*.

| cuenta | el GANCHO ancla en | ventas va en |
|---|---|---|
| **El primer jefe · el segundo jefe · el tercer jefe** (los 3 jefes) | **VENTAS**, sin excepción (`global §2.3`) | el gancho **y** el cuerpo |
| **La compañera de clientes** (customer success) | **SU OFICIO**: atención al cliente, cuentas, seguimiento | **el CUERPO** |
| **La compañera de diseño** (product designer, por analogía) | **SU OFICIO**: diseño de producto, pantallas | **el CUERPO** |

**Por qué:** una cuenta de oficio construye red de SU oficio. Un gancho que ancla en vender le pide al algoritmo una audiencia que no es la suya, que es exactamente el fallo que `global §2.3` describe al revés para los jefes. **El puente a ventas ya existe y es el de `§2-PUENTE`** (el post capta la atención, el enlace vende lo que la convierte en clientes): ese puente vive en el CUERPO y en el ninja, no en la primera línea.

**Mecanizado:** `validar-post.py` exige el ancla del oficio con `--cuenta helena` (`CS_ANCLA`) y `--cuenta angela` (`DISENO_ANCLA`). La cuenta de marketing (`MARKETING_ANCLA`) se dio de baja el 24/11.

**LAS DOS COSAS SE CUMPLEN A LA VEZ, y ese es todo el criterio:** la referencia viene del **oficio** de esa cuenta y el **gancho ancla al carril de esa cuenta** (`global §2.3`, el test del ancla; en los 3 jefes ese carril es ventas, en la compañera de clientes y la compañera de diseño es el suyo, ver `§2-CARRIL-GANCHO` justo arriba) (`global §2.3`, el test del ancla). Con solo una de las dos, el post es de otro. El equipo: *"todas las cuentas siempre tienen que tener la vinculación a ventas, al igual que hoy la compañera de clientes ha sido un meme de ventas más atención al cliente, y el otro día con el compañero de marketing fue de ventas y de marketing"*.

**⚠️ Esto AFINA la nota de abajo sobre el tercer jefe, no la contradice.** Ahí ponía que sus posts se anclan en ventas y no se convierten en contenido para AI-builders: **sigue siendo verdad del GANCHO y del CUERPO**. Lo que se abre es la **referencia**: el chiste puede nacer en el mundo del código (igual que el de la compañera de clientes nace en soporte), y el ancla lo pone el gancho.

**Y el momento de aplicarlo es al ELEGIR la referencia, no al redactar.** Es la misma lección de `post-workflow §4.4-STOP` con el registro bruto: **cambiar de cuenta es gratis, forzar el encaje no**. Si una referencia buenísima no es del carril de la cuenta que tocaba, se le da a la cuenta de su carril y para la otra se busca otra.

**Mecanizado** como aviso de entrega en `validar-post.py` (`ENTREGA: el carril de esta cuenta`), que imprime el carril de la cuenta que se le pase con `--cuenta`.

**⚙️ Y EL ANCLA DEL GANCHO TAMBIÉN, DESDE EL 2026-08-27: `validar-post.py` ya no exige ancla de VENTAS en el gancho de la compañera de clientes, exige el de SU OFICIO** (`CS_ANCLA`: cliente, cuenta, soporte, ticket, incidencia, seguimiento, renovación, partner…), igual que hacía con la cuenta de marketing (hoy de baja) desde el 11/08. La excepción estaba escrita para las dos cuentas y mecanizada solo para una, así que un gancho suyo de soporte puro habría fallado el check **haciendo justo lo que manda la receta**. `cliente` colaba de rebote por `ANCLA_AMBIGUA` y por eso el hueco no se había visto nunca. **La vinculación con ventas sigue siendo obligatoria en el CUERPO** y eso lo canta el propio check.

### 👤 Iker Galarza — Cofundador (parte comercial)
- Rol: **cofounder**, lado **comercial / ventas**.
- LinkedIn: **https://www.linkedin.com/in/ikergalarza/**
- Headline: *Co-Founder @ Neety | El radar de IA que encuentra a tu cliente ideal por específico que sea y detecta el momento exacto para contactarlo | Software para empresas industriales y servicios B2B*
- Es el autor del playbook interno "LinkedIn no es una lotería" — la voz de referencia original del sistema.
- Perfil más veterano en publicación: la mayoría de los outliers históricos de mapas y memes salieron de su cuenta. **Ratios verificados en vivo contra la BD (2026-07-14):** cold calling 16.45x · "subir en ventas" 13.52x · Gipuzkoa 12.92x · desmonto perfiles 8.52x · iMessage "El de Ventas" 8.46x · Navarra 7.72x · Galicia 7.28x · Cataluña 7.11x. (Antes esta línea decía 7.9x el iMessage y 9.13x el desmonto: los dos estaban mal.)

### 👤 Unai Arambarri — CEO
- Rol: **CEO** de Neety.
- LinkedIn: **https://www.linkedin.com/in/unai-arambarri-yeregui/**
- Headline: *Founder & CEO @ Neety | El próximo motor de ventas B2B no se contrata, se despliega | Software de IA autónoma para prospección en empresas industriales y de servicios B2B*
- ~~Publica sobre ventas B2B igual que los demás.~~ **Desde el 26/10: autoridad ante el ecosistema** (inversores, fondos, fundadores, instituciones) como objetivo principal, y ventas cuando el post es para convertir (`brand-voice §1b`).
- Outliers propios validados (**BD en vivo, 2026-07-14**): wojak "caja de herramientas engorda" **16.56x · 165.5K** (el mejor post del histórico) · "vibe prospecting" **9.85x · 632 com.** (el mejor lead magnet de las 3 cuentas) · mapa "país inventado" (polémica) **7.87x** · llaves a Claude 4.52x. (Antes ponía 7.1x el país inventado: era 7.87x. "49€ vs Claude 3.92x" no aparece en la BD como outlier — reverificar antes de citarlo.)

### 👤 Asier Olaizola — Cofundador (parte de programación / técnica)
- Rol: **cofounder**, lado **programación / técnico / producto**.
- LinkedIn: **https://www.linkedin.com/in/asier-olaizola/**
- Headline: *Co-Founder @ Neety | Construyo la IA de ventas que te trae reuniones, no promesas | Software para empresas industriales y de servicios B2B*
- **Empezó a publicar en julio 2026** — es la cuenta más nueva, todavía sin histórico propio grande de outliers. **Estado real (BD, 2026-07-14): 3 posts, 0 outliers.** (⛔ Obsoleto: dato de julio; el histórico actual está en la BD.) Uno personal de 2024, la oferta de Full Stack Dev del 5-jun (1.10x · 4.3K imp) y el mapa de Aragón del 14-jul.
- Se trata con **la misma paridad** que el segundo jefe y el primer jefe: mismos formatos, misma voz, misma coordinación. (🔄 Superado el 16/07 y el 15/10 por `brand-voice §1b`: el registro va por cuenta, y el tercer jefe tiene sus vetos y su carril de meme, `§2-ASIER-MEME`.)

> ⚠️ **Nota sobre el ángulo técnico del tercer jefe:** aunque su rol es programación, sus posts **siguen siendo sobre ventas B2B** (misma voz Neety, mismo ICP). Su perfil técnico puede aportar credibilidad cuando el post toca el "cómo está construido por dentro" un sistema de outbound, pero el hook y el cuerpo se anclan en ventas, no en ingeniería. No conviertas sus posts en contenido para AI-builders.

> ⛔ Obsoleto: era para las primeras semanas de la cuenta (jul 2026); ya tiene baseline.
> ⚠️ **Arranque de la cuenta del tercer jefe:** empezó en jul 2026 sin histórico → **el outlier ratio aún NO significa nada** en su cuenta (necesita ~4-6 semanas de posts para que LinkedIn fije una baseline). Durante ese periodo, júzgalo por **consistencia y engagement absoluto**, no por el ratio (que puede salir ~1x aunque el post sea bueno). No descartes un formato en su cuenta por un ratio bajo temprano.

#### 🔄🔄 2-ASIER-MEME · SUS MEMES SON DE VENTAS UNIVERSAL, NO DE LO TÉCNICO, Y EL GANCHO NUNCA LE PONE UN ROL QUE NO TIENE (2026-10-08) — CANÓNICO, MANDA SOBRE `§2-CARRIL` EN EL MEME DE ASIER

> **El ajuste:** los últimos memes de esta cuenta salían demasiado tecnológicos para una audiencia de industriales veteranos, porque se pedía que la referencia fuera tecnológica y de ventas. Basta con que sea de ventas, y sin que la cuenta diga de sí misma que llama, porque no es comercial.

**Y LOS DATOS LE DAN LA RAZÓN, cruzados el 08/10 sobre sus 10 memes publicados (BD, impresiones a hoy):**

| el meme del tercer jefe era… | n | los casos | mediana |
|---|---|---|---|
| **de lo TÉCNICO** (la herramienta, la app, el buscador, la IA, la ficha) | 5 | 14 herramientas 420 · código de verificación 196 y 718 · historial de Google 3.751 · la IA y el puesto 766 | **718** |
| **de ventas UNIVERSAL** (el pedido, el ascenso, el caos, lo que se paga) | 4 | el pedido que encoge por cargos 37.526 · la calvicie del ascenso 132.307 · la inversión de 4.797 € 27.962 · vender es un caos 41.293 | **~39.400** |

- **55 veces más mediana**, y no hay solape: el peor universal (27.962) multiplica por 7 al mejor técnico (3.751). Quitando los dos que salieron con el JPG degradado (22/07 y 31/07, `images §0a-penta`), los técnicos quedan en 718 · 766 · 3.751: la distancia no se mueve.
- **El cruce entre cuentas lo confirma:** el ángulo de apilar herramientas hizo **165.526 en el primer jefe** y **420 en el tercer jefe**. La misma idea técnica que voló en otra cuenta se hunde en la suya. Y las universales viajan en las tres: la calvicie (Iker 138.828 · el tercer jefe 132.307) y el caos (el primer jefe 134.692 · el tercer jefe 41.293).
- **⚠️ Lo que no prueba:** que lo técnico no funcione en ninguna cuenta (el informe que resucita clientes del primer jefe, 193.374, es de la ficha del cliente, pero contado desde el que pide números). Prueba que **en la cuenta del tercer jefe el lector no le compra el chiste de su oficio**. El 03/09 (la herramienta de 4.797 € que nadie usa) toca una herramienta y funcionó, porque se cuenta desde **quien paga la factura**, no desde quien la programa.

**LA VOZ DEL GANCHO, y es la segunda mitad del patrón:**
- **Sus tres mejores memes llevan el gancho en 3ª persona impersonal**: *En ventas, el pedido encoge…* · *Cada ascenso en ventas cuesta pelo* · *Vender es un caos y punto*. El cuarto (*Mi mayor inversión en ventas…*) va en 1ª, pero en un papel que SÍ es suyo: el socio que paga.
- **Los que le pusieron un rol que no tiene fallaron:** *Mi historial de Google canta más que **mis ventas*** (3.751) · *Mi **jefe de ventas** me mandó actualizar la ficha* (retirado) · *Llevo 13 pestañas abiertas* buscando a quién escribir (718).

**LA REGLA, y son tres cosas a la vez:**
1. **La referencia: de ventas, del rincón que sea, y la más UNIVERSAL que haya**: la que entiende un director comercial de 55 años que vende maquinaria sin saber nada de software. El pedido que se cae, el cliente que compra a otro, la cuota, el ascenso, el forecast. **Lo técnico solo entra si el chiste se entiende sin saber de software** y, mejor, contado desde quien paga.
2. **El gancho, nunca en 1ª persona de comercial.** el tercer jefe no vende, no llama, no prospecta, no tiene cartera ni cuota ni jefe de ventas. Tres formas que valen: **3ª persona impersonal** (*En ventas…*, *Vender es…*), **vocativo a los comerciales** (*Comerciales, ¿a cuántos…?*: deja claro que les habla desde fuera) o **1ª persona en su papel real** (el que programa para el comercial, el socio que paga).
3. **En el cuerpo, su `yo` es el del ingeniero** (`§2-CARRIL`, 30/09): *Programo para comerciales*. El comercial y el cliente, en 3ª.
- **⛔ Lo que NO cambia:** que la referencia sea de ventas (`§2-CARRIL`, 24/08), los vetos de abajo, `--meme-sobrio` y `--comprador-ok`. Y una referencia de llamadas sigue yendo a Iker si la gracia es que el que habla llama: aquí lo que se abre es el rincón, no el narrador.
- **Mecanizado:** `validar-post.py --cuenta asier` **falla** si el gancho le cuelga un rol comercial en 1ª persona (`mis ventas`, `mi jefe de ventas`, `llamo`, `vendo`, `mi cuota`, `mi cartera`…) y **avisa** si lo hace una línea del cuerpo fuera de una cita. El carril que imprime el aviso de entrega ya dice "ventas universal".
- **Primer caso: el meme del 08/10** (1up, *we've decided to buy your… competitor's product*, 61% de risa): `Comerciales, ¿a cuántos os han soltado esto? 👇`.

**🔄 19/10: YA NO ES SOLO EL MEME, ES TODA SU CUENTA (Iker lo veía venir; medido ese día).** Todo lo que no es peloteo del tercer jefe desde el 15/07, partido por el GANCHO:
- **Gancho técnico** (IA, Claude, código, programar, filtro, herramienta): **n=9, mediana 1.063 impresiones, máximo 6.827** (el filtro del 01/10). Ahí están los tres lead magnets de Claude (1.063-1.308), la historia del código y la carpeta de cartón (1.470) y la IA y el puesto (1.014).
- **Gancho sin nada técnico: n=11, mediana 3.774 y máximo 132.325.** Sus cuatro posts de más de 20.000 están aquí.
- **Y el correo 8, firmado por él, técnico y de 240 palabras, fue el peor de la newsletter** (1 clic limpio, 0 inscritos).
- **La regla, en historia, lead magnet y correo igual que en el meme:** el gancho del tercer jefe habla de ventas universal, no de su oficio. ~~Su `yo` de ingeniero puede aparecer en el cuerpo (*Programo para comerciales*), nunca como tema del post.~~ Lo que no se ha probado es un lead magnet del tercer jefe sin Claude en el gancho.
- **🔄 22/10: Y TAMPOCO EN EL CUERPO (Iker lo intuía y pidió confirmarlo con datos).** BD, posts sin peloteo desde el 15/07, con `programar`/`código`/`software`/`arquitectura` en el cuerpo: **historias de las 3 cuentas, mediana 3.715 impresiones y 6 clics (n=10) contra 6.639 y 20 sin ese vocabulario (n=19)**; en el tercer jefe, 1.196 contra 2.591. Su mejor historia (20.491, 25/08) lo nombra una sola vez, casi al final. Y lo que más inscribe al webinar son casos reales de cliente sin nada técnico (el primer jefe 21/10, 1,19 por 1.000; `post-workflow §4.4-CONVERSION-EVENTO`). ⚠️ Confundido con gancho técnico, evento y la caída de su cuenta desde octubre, n pequeño: es dirección, no ley. **Lo que se hace:** el papel del tercer jefe se cuenta sin el oficio (estaba en la visita, es socio, lo vio), y la solución del ninja es de método, no técnica. Aviso en `validar-post.py --cuenta asier`. Primer caso: la historia del olfato del 22/10 (`para programar lo que hace` pasó a `nos lo presentó en una visita`).

#### ⛔⛔⛔ 2-ASIER-VETOS · LO QUE NO ENTRA NUNCA EN LA CUENTA DEL TERCER JEFE (2026-08-26 y 2026-08-27) — CANÓNICO

**No son preferencias, son vetos, y ya nos ha costado un post retirado.**

**🔄 Y DESDE EL 2026-10-02 SU CUENTA VA CON EL MISMO CRITERIO DE MEMES QUE LA DE UNAI:** cuentas de CEO y CTO, memes sobrios. Ningún meme controversial va al tercer jefe (solo a Iker, `post-workflow §4.4-STOP`) y el validador le exige `--meme-sobrio` igual que al primer jefe. Y en las tres cuentas, ningún meme deja mal al cargo que compra (`§4.4-COMPRADOR`, `--comprador-ok`).

| ⛔ veto | por qué |
|---|---|
| **Fútbol, en cualquier forma** | Iker, 26/08: el meme del Mundial de los calvos: el fútbol no encaja en esta cuenta. Se subió en otra por eso |
| **Política** | 🔄 desde el 15/10 es veto de las tres cuentas (`brand-voice §NO CRITICAMOS` 6): es imagen de marca |
| **Cualquier cosa malinterpretable** | *"cosas peligrosas que puedan malinterpretarse en humor. Intentar no facilitar el malinterpretamiento, porque al final la gente lo hará igual"* |
| **⭐ Hablar de una mujer en clave romántica, o que se pueda leer que tiene pareja** | 🔴 **El caso, y es el más caro: se retiró una publicación suya porque la frase `soñé con ella` se leyó como que hablaba de una mujer.** No hizo falta ninguna queja: se retiró antes |

**LO QUE ESTO PROHÍBE EN LA PRÁCTICA, y es más ancho que la frase:** ningún **nombre de mujer** dentro de una imagen suya si el papel puede leerse como pareja (el contacto de un chat, quien manda un mensaje, quien aparece en una captura), ningún corazón ni emoji de afecto, y ninguna escena doméstica compartida. **Si el remix necesita una pareja, la referencia se le da a otra cuenta.**
- **El caso que lo disparó (27/08):** el meme de la factura remixa una captura donde el contacto original es `Amoor ❤️`, o sea la pareja del autor. Con nombre de mujer, aunque quitáramos el corazón, el papel sigue siendo el mismo. **Se cambia a nombre de hombre y a registro de compañero de trabajo**, y con eso la lectura de pareja desaparece.
- **⚠️ Y ojo con `images §0a-septima-NOMBRES`**, que pide calcar el sexo del original: **en el tercer jefe este veto manda por encima**. Si el original lo firma una mujer y el papel es de pareja, o se cambia el papel o se cambia de cuenta.

### 👤 Mario Carrillo Ramírez — CUENTA DADA DE BAJA (2026-11-24)
- **Deja la empresa. Su perfil ya no es una cuenta de Neety:** no se escriben ni se planifican posts para él, no se buscan referencias de marketing para su carril y `validar-post.py --cuenta mario` falla. Sus posts publicados se quedan en la BD y en el historial como registro (sirven de evidencia en `outliers-database` y `post-workflow`), pero sus reglas de cuenta (menciones a la casa, carril de marketing, voz joven, ángulo de contenido que atrae demos) ya no aplican a nadie.
- **Lo que sí queda, porque nunca fue de su cuenta: un DATO BIOGRÁFICO del autor original NO es esencia** (vale para TODO remix). Un gancho suyo salió de calcar el `I've spent 15+ years in growth/marketing` de la referencia y le colgó una veteranía que no tenía. **La ESENCIA se calca palabra por palabra (`post-workflow §4.4-ESENCIA`), pero los años, el tamaño del equipo, los seguidores, la facturación y el cargo del original se quedan en el original.** Lo que se calca es la MECÁNICA, que se puede decir sin ninguna cifra.
  - **El test, antes de entregar cualquier remix:** ¿hay en mi gancho algún número, plazo o credencial que salga del original y no de nuestra realidad? Si sí, fuera: es la misma familia que inventarse una empresa (`CLAUDE.md`, lo que no se negocia).
- **Y el vocabulario prestado se usa con su gramática española** (`farmear aura`, no `aura la farma`): `brand-voice §3c`, el castellano hablado manda sobre las ganas de colocar la palabra de moda.

#### 🌉🌉 EL PUENTE DE LAS CUENTAS DE OFICIO (la compañera de clientes, la compañera de diseño): **ATENCIÓN → CLIENTES** (2026-08-21) — CANÓNICO

**El problema que resuelve, y es de negocio antes que de copy:** una cuenta de oficio ancla a **su oficio**, pero el enlace que lleva dentro vende **ventas**. Sin un puente, o el post no pega con el enlace, o el enlace parece pegado con celo. Y hay una consecuencia práctica: **el post sale en horario de trabajo y los jefes lo van a leer.** Un post de un empleado que no se pueda justificar ante ellos es un problema aunque haga 30.000 impresiones.

**EL PUENTE, y es siempre el mismo, así que se usa de plantilla:**
> **El post capta la atención. El enlace vende lo que convierte esa atención en clientes.**

**Y el post es la DEMOSTRACIÓN de su propia tesis**: el lector ha llegado hasta ahí porque el gancho funcionó. No hay que explicarlo, ya ha pasado.

**Cómo se escribe, en dos líneas** (la forma `eso lo hace cualquiera, lo otro no` de `global §4.4b`, aplicada al TEMA):
```
[lo que el tema del post SÍ te trae]. [lo que NO te trae].
De eso va nuestro correo de ventas: {link}
```
Caso real, el post de la caída de los influencers (21/08): *"Una caída te trae atención. No te trae clientes."*

- **⚠️ El puente NO es una excusa para colar cualquier enlace.** Sigue mandando `global §4.4b-PROMESA`: el destino tiene que dar de verdad lo que las dos líneas prometen.
- **Y esto es lo que decide entre `/agendar/` y `/correo/`:** si el tema del post no toca vender, el de agendar no tiene dolor al que agarrarse y se queda fuera (`global §4.4e-SOLO`). El correo aguanta casi cualquier tema **porque el puente lo sostiene**.
- **En la compañera de clientes**, su post capta atención desde atención al cliente, y el enlace vende lo que convierte eso en cuentas que se quedan. **En la compañera de diseño**, desde el diseño de producto.

### 👤 Helena Baviera Serigó — Partnerships & Customer Success (5ª cuenta, Iker 2026-08-18)
- Rol: **Partnerships & Customer Success Manager** en Neety. LinkedIn: `in/helena-baviera` · **2.054 seguidores** · Paterna, Valencia. Headline exacto: *Partnerships & Customer Success Manager en Neety*.
- **Por qué existe:** a la empresa le conviene que hablen de ella **empleados y perfiles distintos**, no solo los tres jefes, y a ella le conviene el alcance. **Conveniencia mutua, dicha así por Iker.** Y hay un motivo de negocio encima: **trabaja con los clientes todos los días**, así que su autoridad pública nos suma donde el founder no llega.
- **La razón operativa por la que su cuenta es interesante AHORA:** está **medio muerta** (casi todo reposts de las cuentas de founder), así que **su baseline es bajísima y LinkedIn boostea el primer post bueno**. En los jefes ya cuesta sacar outliers porque su media lleva meses alta. Es exactamente lo que pasó con la cuenta de marketing (hoy de baja): menos de 500 seguidores, 2.000 impresiones los primeros días y luego explotó a **32.244 con el 99% fuera de su red**.
- 🔴 **NO está conectada a Unipile.** Comentarios, respuestas y analíticas, **a mano**. No la metas en flujos automáticos.
- **Frecuencia: OPCIONAL.** No entra en el cuadro latino 3×3 de las 3 cuentas de founder (`post-workflow §8.2`).
- **Tono: joven y cercano, pero SIN burradas** (18/08). Natural, majo, cercano de verdad y nada sobrio, con un freno: nada de tacos, escatología ni chiste bruto. El humor va en la situación, no en la palabra. En la escala de `brand-voice §1b` se coloca **al lado de Iker**, un punto más joven.
- **⛔ SIN MENCIONES: ni @Neety ni los jefes ni nadie.** Es deliberado: **su cuenta arranca con el experimento ya validado en la cuenta de marketing** (12/08, sin ninguna mención, 32.244 impresiones). Con cero arrobas de la empresa junto a un enlace, el spam ninja no se lee como publicidad.
- **⭐ Público y ángulo: ATENCIÓN AL CLIENTE, CUSTOMER SUCCESS y PARTNERSHIPS**. Los mismos pilares que funcionan, pero **la REFERENCIA del meme se busca en su sector** (soporte, tickets, cuentas, renovaciones) y **el gancho ancla a VENTAS**, que es lo que hizo funcionar el de la cuenta de marketing. (🔄 Superado el 26/08 por `§2-CARRIL-GANCHO`: en la compañera de clientes el gancho ancla a SU oficio, atención al cliente, y ventas baja al cuerpo; así lo mira el validador.)
- **⛔ LA REFERENCIA TIENE QUE SER DE SU OFICIO, no solo de su sector (2026-08-18).** El primer intento fue un tuit de soporte sobre un bonus por tickets cerrados y lo tumbó: *"es un meme de comercial"*. Su trabajo es **cuidar al cliente que YA compró** (reuniones de seguimiento, escuchar feedback, estar encima de sus problemas), no cazar al que aún no compra. Un chiste del comercial que persigue no es suyo aunque salga un ticket dentro. **La cantera:** `Customer Success Collective` (`customersuccesscollective`, página de empresa), 200 posts bajados y 16 con más de 600 reacciones, casi todos capturas de tuit sobre el cliente que no contesta.
- **Referencias ya usadas por la compañera de clientes:** 18/08, tuit *"hello????????"* de emily june vía Customer Success Collective (2.826 · 29% risa). Descartadas y libres: el font-size de KnowComment (1.793 · 49%), el `please find attached` (4.122 · 53%, pero genérico de correo, sin ancla) y la Dora calva (983 · 56%, la calvicie ya está muy vista en las 3 cuentas).

### 👤 Angela Brook Uria — Product Designer (6ª cuenta, Iker 2026-10-01)
- Rol: **Product Designer** en Neety desde **abril de 2026**, en remoto. Diseña las pantallas del producto: research, flujos, wireframes, interfaces, auditorías de UX y el design system. LinkedIn: `in/angelabrookuria` · nombre exacto **`Angela Brook Uria`** (sin tilde en LinkedIn, Iker la escribe la compañera de diseño; firma como Angie) · **1.100 seguidores** · Bilbao. Headline: *Product Designer @ Neety • AI & B2B SaaS*.
- **Por qué existe:** la misma lógica que la compañera de clientes (conveniencia mutua y autoridad de empleada) y la misma razón operativa: **cuenta casi muerta**. Sus últimos posts propios son el `I'm attending` del 01/09 (20 reacciones) y casos de diseño de 2025; el resto son reposts. Baseline bajísima.
- **Sus escenarios con Neety, verificados:** (1) **jueves 28/05, Sarriko (Bilbao)**, sesión con la Asociación Marketing AMA *"Nunca tuviste tanto para vender en B2B"* con el primer jefe (cartel `evento angela.gif` en LINKEDIN GROWTH y post del primer jefe del 01/06: *"junto a la compañera de diseño"*); (2) **24/09, Neety Forward (ARIMA, Donostia)**, presentó con el tercer jefe la nueva generación de Neety (fotos públicas en Flickr, `_DSC1162` a `_DSC1200`).
- **Su voz, sacada de sus propios posts:** cercana, con humor y sin miedo a la primera persona (*"Quizá esté mal que yo lo diga, pero este proyecto mola mucho 😎🔥"*). Su idea de buen diseño, con sus palabras: que alguien que no sabe escanear un QR complete el trámite solo. **Tono: el de la compañera de clientes** (joven, cercano, sin burradas, nada prepotente), con guiño a Bilbao.
- **Menciones: NO es la regla de la compañera de clientes.** Iker pidió mencionar al **tercer jefe** en su primer post (01/10). `@Neety` con su categoría en el cuerpo, como en las historias de los jefes.
- **🧪 CARRIL DEL GANCHO, POR ANALOGÍA Y PENDIENTE DEL OK DE IKER:** se le aplica `§2-CARRIL-GANCHO` como a la compañera de clientes: **el gancho ancla en SU oficio (diseño de producto: pantallas, botones, diseño) y ventas baja al cuerpo**. Mecanizado en `validar-post.py --cuenta angela` (`DISENO_ANCLA`, más el aviso de cuerpo prepotente de la compañera de clientes). Si Iker lo tumba, su gancho vuelve a exigir ancla de ventas.
- `utm_content=angela`. Comentarios y métricas, a mano salvo que se confirme que su cuenta está en Unipile.

---

## 3 · Una voz de marca, con registro por cuenta

- **El QUÉ es uno:** las cuentas hablan de lo mismo y con la misma marca, la voz "Neety".
- **El registro va por cuenta** (desde el 16/07 y el 15/10): volumen, intensificadores y tipo de gancho. La tabla de cada perfil está en `brand-voice §1b`, y el reparto de alias en `§2`.
- En la herramienta, elegir cuenta cambia la identidad del preview (nombre y foto) y el registro que aplica el prompt.

---

## 4 · Estrategia de publicación (contexto que condiciona TODO post)

Estos puntos son de identidad estratégica; el detalle operativo está en `global-instructions` y `working-preferences`.

- **Objetivo doble (MIX):** ya no es solo alcance/outlier. Ahora es **viralidad + que agenden demo** (https://neety.com/solicitar-demo, desde el 05/10, §1). No son excluyentes: el meme iMessage con link de agendar (7.9x · 80.9K) fue el post más visto del periodo.
- **Frecuencia: 3 posts/semana por cuenta de jefe**, mínimo absoluto 1/semana. Ojo al histórico: durante abr-jul 2026 eran **4/semana** porque solo se gestionaban 2 cuentas (segundo y primer jefe); al entrar el tercer jefe (jul 2026) se bajó a **3** para no saturar el feed con 3 cuentas a la vez. Si en el futuro cambia el nº de cuentas, revisa esta cifra.
- **Exclusividad de CATEGORÍA por día (intercalado):** (🔄 hoy los pilares son más: historia, noticia, tarjeta, despiece y "Las 10" en vez de "Los 10"; la lógica vigente está en `post-workflow §8.2`) las 3 cuentas rotan las mismas 3 categorías de pilar — **Peloteo** (mapa regional o "Los 10", cuentan como una sola), **Lead magnet** y **Meme** — pero intercaladas: el mismo día NO se repite categoría en dos cuentas. Cada día las 3 cuentas cubren las 3 categorías distintas; cada cuenta pasa por las 3 a lo largo de la semana. La lógica completa (cuadro latino 3×3, frecuencia, pregunta previa) vive en `post-workflow §8`.
- **El destino del spam ninja es `/solicitar-demo` por defecto** (`post-workflow §8.1b`, 30/10 y 06/11), y el gate de un recurso solo con su motivo. Va atado al hook o a algo gracioso del cuerpo — nunca como venta directa, y **sin nombrar a Neety** (nombrar la marca lo delata como publicidad encubierta). Va en TODOS los pilares menos el lead magnet. Reglas completas: `global-instructions §4.4b`.
- **Mencionar Neety en el cuerpo está permitido** de vez en cuando (no en cada post, pero no prohibido).

---

## 5 · Qué me falta de aquí (huecos a rellenar por el usuario)

Estos datos viven en la base de datos de la herramienta, **no en el código**, así que no los tengo con exactitud. Si los quieres precisos en esta skill, pásamelos y los incorporo:

- [x] **Headline exacto** de cada perfil (El segundo jefe / el primer jefe / el tercer jefe) — incorporados arriba en §2.
- [x] **Nº de seguidores:** se trackea el crecimiento a nivel de negocio, pero **NO es una variable de contenido y por eso no se guarda en las skills**. Está comprobado (aquí y en general en redes) que el rendimiento lo manda la calidad del contenido, no el nº de seguidores: buen contenido tira con pocos seguidores, y mal contenido flopea aunque tengas muchos. No asumas que "más seguidores = irá mejor" ni lo metas como factor en ningún sitio.
- [x] **URL de LinkedIn** de las tres cuentas (Iker `in/ikergalarza`, el primer jefe `in/unai-arambarri-yeregui`, el tercer jefe `in/asier-olaizola`).
- [x] Apellido completo: Iker = "Galarza", el primer jefe = "Arambarri". Ya reflejados arriba.
- [ ] Cualquier matiz de posicionamiento personal que quieras diferenciar entre las tres personas (a día de hoy comparten voz y ángulo).
