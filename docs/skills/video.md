# SKILL: video — Guion de vídeo corto para LinkedIn (text + video)

> **name:** video
> **description:** Cómo se hace un post de LinkedIn con VÍDEO. Un vídeo NO es un post de texto con un clip encima: es otro artefacto, con tres piezas separadas (caption / texto en pantalla / spoken hook), 6 patrones de gancho hablado probados en outliers B2B-IA, y un playbook estructural de 36 puntos. Fuente: `VIDEO_SCRIPT` + `VIDEO_SYSTEM_PROMPT` + `SHORT_FORM_VIDEO_PLAYBOOK` de `postPrompt.ts`.
> **when-to-use:** Cargar SOLO cuando la petición es un vídeo (o el usuario dijo "modo vídeo", que es sticky hasta que diga lo contrario). Reemplaza las reglas de hook de texto de `global-instructions §2` — NO se aplican al vídeo. Sí conviven `aboutme`, `brand-voice` y las reglas comerciales universales.

---

## 0 · Precedencia — el vídeo es OTRO artefacto

Un post de vídeo se consume distinto (autoplay, swipe, sonido normalmente off→on). Por eso **NO aplican** las reglas de post de texto:
- ❌ Tope de caracteres del hook, corte "…ver más", "el salto en blanco rompe el hook", prohibición de preámbulo en la línea 2, ancla de sector en la primera línea. Son artefactos del feed de texto.
- ❌ El **tag de viralidad** `🔥 ~Nx · arquetipo` (referencia arquetipos de TEXTO, hook_type × structure — no describen vídeos).
- ❌ Las 4 mecánicas de texto (mapa, "Los 10", meme, lead magnet como estructura) y `outliers-database §3` (decomposición de outliers de texto).
- ❌ El registro de imágenes (`images` skill), HOOK_LAW, calidad de hook de texto.

**Sí siguen mandando** (son de comercio, no de formato): menciones a terceros SIEMPRE en positivo, atacar el problema y no al lector, público B2B amplio (no fuerces marco industrial), fórmula "Comenta X + Y" si hay lead magnet en el caption, idioma del usuario, **sin markdown dentro del caption**, el **verbo punchy con techo** (`global §2.9`: sube hasta el que encaja, sin pasarse a gore) y el **SPAM NINJA en el caption** (`global §4.4b`: máx 2 líneas cortas, sin nombrar a Neety, girando el concepto del gancho, nunca última línea — **salvo que el caption sea un lead magnet**, que entonces no lleva). Y la voz Neety (`brand-voice`).

**Datos propios que sí valen:** los outliers de TEXTO+VÍDEO de la cuenta (no los de texto solo). Ese subconjunto es la única referencia de la cuenta que aplica a un vídeo. El resumen medido está en `§4b`, y el primer pilar de vídeo, en `§6`.

---

## 1 · LA REGLA #1 — tres piezas separadas, NUNCA copiadas entre sí

Un vídeo son **tres textos**, cada uno optimizando algo distinto. En los outliers estudiados, el caption y el spoken hook eran estrategias deliberadamente DIFERENTES sobre el mismo vídeo.

1. **CAPTION** (el texto del post bajo el vídeo) — trabajo: **que te encuentren** + dar contexto al algoritmo. Puede ser una pregunta provocadora o una línea tipo SEO. (La primera línea del caption sí la corta el feed — cuídala.)
2. **TEXTO EN PANTALLA** (quemado en los primeros frames del vídeo) — trabajo: **forzar la lectura en el scroll con sonido apagado**. ≤6 palabras, encuadre emocional ("modo GENIO", "nadie hace esto").
3. **SPOKEN HOOK** (los primeros 0–9 s de audio) — trabajo: **retención**. Aquí aterriza la promesa de verdad. NO es el caption reformulado.

> El caption vende el clic; el spoken hook vende que se queden. Escribe los tres y hazlos deliberadamente distintos.

---

## 2 · Los 6 patrones de SPOKEN HOOK probados (adaptar a Neety B2B ventas + IA — nunca copiar literal)

1. **"X acaba de matar a Y" + "y aquí está cómo en 3 pasos"** — provocación y luego coste de entrada bajo. El hook vende destrucción, el cuerpo promete construcción.
   → *"Neety acaba de matar al que escribe cold emails a mano. Así montas outbound sin tocarlo, en 3 pasos."*
2. **"Nadie está hablando de esto" / "quédate hasta el final — lo que ningún SDR usa todavía"** — exclusividad de insider. La palanca de retención más fuerte observada.
   → *"Esta táctica de outbound rinde 10x y nadie habla de ella." / "Quédate al final: el montaje que ningún comercial está usando aún."*
3. **"Todos te dicen X, pero [a escala se rompe / si empiezas no sabrás cómo]"** — contradice el consenso y nombra el dolor.
   → *"Todos te dicen que personalices cada email a mano. Hazlo a escala y no envías nunca. Esto es lo que funciona de verdad."*
4. **"Esta es LA ÚNICA [cadena/secuencia/playbook]…" + resultado ultra-específico en negativo** ("nunca miente, nunca alucina"). Triple negativo = elimina TODOS los dolores base de golpe.
   → *"Esta es LA cadena de prospección para que tu comercial nunca pierda un follow-up, nunca deje enfriar un lead caliente, nunca mande un genérico."*
5. **"Vamos a [verbo] en 60 segundos" + problema mundano y universal.** "Vamos a" (no "te voy a enseñar") hace que el espectador lo haga CONTIGO — acorta distancia. El más fácil de producir.
   → *"Vamos a montar tu primer agente de prospección en 60 segundos. Mira mi bandeja ahora mismo: 200 leads sin tocar."*
6. **"$X/año [equivalente humano]"** — resultado cuantificado contra un equipo humano. Codicia + status + concreción.
   → *"Así corres un equipo de SDRs de 500.000 €/año con 3 agentes de Neety."*

### Técnicas de los primeros 3 segundos (recurren en los mayores outliers)
- **Números recitados en crudo** como prueba social ("3 millones. 800 mil. 1,2 millones.") ANTES de cualquier frase — el cerebro los suma solo. Solo si los números son reales.
- Entrega la **promesa global ANTES** de pedir la acción de engagement. El "guarda/sigue/comenta" va DESPUÉS de que el hook aterrice, nunca antes.

### NO copiar (se ven en outliers pero no transfieren a cuenta pequeña/nueva)
- Comment-gate descarado en el segundo 0 → solo funciona en audiencias grandes ya entrenadas. Mete la puerta de comentario en **~seg 12–15**, tras el hook.
- Secuestro geopolítico / breaking-news → no reproducible a demanda; necesita un evento real, espéralo, nunca lo finjas.
- Listicle puro sin antagonista → sin "vs" / "en vez de" / "todos te dicen… pero", el vídeo queda plano.

> Una idea de vídeo que no puede cargar uno de estos 6 spoken hooks es una idea débil — dilo en vez de forzar un guion plano.

---

## 3 · El entregable cuando piden vídeo (5 salidas)
1. **CAPTION** — texto del post bajo el vídeo (pieza 1).
2. **TEXTO EN PANTALLA** — ≤6 palabras, encuadre emocional (pieza 2).
3. **SPOKEN HOOK** — 0–9 s, uno de los 6 patrones adaptado a B2B ventas + IA (pieza 3; NO el caption reformulado).
4. **ESQUEMA ESTRUCTURAL** — con el playbook §4: foreshadow, mecanismo que empuja al final, payoff, twist si encaja, corte abrupto, y duración objetivo por plataforma (YouTube Shorts ~30-35 s, TikTok 10-20 s, Reels visual-first).
5. **(Opcional) Auto-chequeo pre-publicación** — del punto #36 del playbook.

---

## 4 · Playbook estructural de vídeo corto (36 puntos)

La estructura del vídeo alrededor de las palabras. VIDEO_SCRIPT (§2) manda en el "qué decir" del spoken hook; este playbook manda en la "forma completa" del vídeo.

**Idea → historia**
1. No pienses "voy a hacer un vídeo sobre X": añade historia, objetivo o conflicto. Añade un "por qué" personal e ironía/contraste. (Ej.: "cocinar para desconocidos" → "mi cocina está rota y cocino para ganar dinero y arreglarla".)
2. Que el espectador se implique rápido: objetivo claro, algo en juego, una razón para ver hasta el final. Mejor si el protagonista tiene un problema/reto/misión.
3. Hook visual muy fuerte: el primer frame se entiende SIN audio (funciona como título + miniatura). Visual, simple. Evita hooks abstractos o explicativos.
4. Escribe el hook como para un niño de 5 años: frases simples, sin palabras complicadas (mejor explicar una palabra difícil que usarla).
5. Antes de grabar, dibuja/imagina el PRIMER FRAME: piensa la imagen antes que el texto; qué imagen resume mejor el vídeo, y luego la frase que la acompaña.

**Estructura y retención**
6. Estructura clara: hook corto → foreshadow → desarrollo con obstáculos/pasos → payoff → corte abrupto justo después.
7. Foreshadow SIEMPRE: tras el hook, adelanta qué recompensa habrá al final; da una razón concreta para quedarse.
8. Diseña un mecanismo que empuje al final: cuenta atrás, lista de 3 pasos, reto, algo que se complica, o una promesa que solo se resuelve al final.
9. Usa listas de 3 pasos cuando no sepas estructurar: fáciles de seguir, dan progreso, el espectador sabe cuánto queda.
10. Storytelling de "pero / entonces / por eso": nada de lista plana; cada frase provoca la siguiente con problemas y soluciones.
11. Crea expectativas y cúmplelas: si prometes algo en el hook, enséñalo al final; no abras loops que no cierras.
12. Añade un twist final: cierra la historia pero sorprende (gracioso, emocional o inesperado). Tras el twist, termina inmediatamente.
13. Termina justo tras cumplir la promesa: no expliques de más, sin despedidas ni conclusión larga. Corte limpio y abrupto.
14. Cada segundo cuenta: si una frase no empuja la historia, córtala; sin aire muerto al principio ni al final.
15. Controla la duración: ~30-35 s funciona bien; <30 s exige retención altísima; demasiado largo pierde ritmo. Analiza tu propio canal.
16. Busca rewatch: finales rápidos, detalles visuales, giros, buen loop que invite a reverlo.
17. Mide el scroll-through rate: cuánta gente ve en vez de deslizar; el primer frame y el hook mandan.
18. No te obsesiones solo con retención: también satisfacción, shares, interés y audiencia. Buena retención ≠ explota; empezar flojo y despegar es posible.

**Elección de idea**
19. Muchas ideas antes de elegir una: filtra por deseo real, viabilidad, hook, mecanismo, rewatch y si es compartible.
20. Criterios: ¿me apetece? ¿es grabable? ¿hook simple? ¿historia? ¿mecanismo que empuja al final? ¿payoff? ¿rewatch? ¿alguien lo compartiría?
21. Ideas de tu vida diaria: lo que te sorprende, te da rabia, te parece absurdo, tiene solución rara o historia personal detrás.
22. No preguntes primero "¿se hará viral?": pregunta "¿quiero hacerlo?"; la viralidad se construye con hook, historia, mecanismo y payoff.

**Preparación y escritura**
23. Prepara antes de grabar: escribe hook, foreshadow, final, última línea (o hueco para la reacción) y una estructura aproximada.
24. Escribe primero el inicio y el final: el hook define por qué entran, el final por qué se quedan; el medio solo conecta.
25. Transición que no rompa el ritmo: evita "vamos a empezar"; usa una frase que mantenga la historia en movimiento ("así que hice lo único lógico: …").
26. Lenguaje simple y directo: frases cortas, verbos claros, pocas ideas por frase, sin jerga.
27. Piensa en UNA persona concreta al escribir (tu yo de hace años, alguien joven, alguien que no domina el tema). Si esa persona lo entiende, vas bien.

**Plataforma**
28. Adapta a cada plataforma: no todo el short-form funciona igual en todas.
29. YouTube Shorts: más historia, ritmo algo más maduro, ~30-35 s, hook visual fuerte, buen payoff, retención y rewatch.
30. TikTok: más corto, denso, sin pausa, directo; ideal 10-20 s; mucha info/entretenimiento en poco tiempo.
31. Instagram Reels: muy visual, subtítulos claros, que se entienda sin audio, alto potencial de compartir.

**Iteración y cierre**
32. Revisa analíticas: dónde cae la gente, primer y último segundo, rewatch, qué hooks retienen, qué duración funciona en TU cuenta.
33. Aprende de otros creadores pero añade tu twist: analiza por qué funcionan sus hooks, crea varias versiones, elige la mejor, adapta a tu estilo.
34. Haz el vídeo reconocible: patrones visuales repetibles, estilo de framing, primer frame identificable si es una serie.
35. Prioriza claridad sobre creatividad: si no se entiende en 1 segundo, falla; idea simple bien ejecutada > idea compleja confusa.
36. **Preguntas finales antes de publicar:** ¿se entiende sin sonido? ¿el primer frame llama la atención? ¿el hook podría ser título de un vídeo largo? ¿hay razón clara para ver hasta el final? ¿prometo algo y lo cumplo? ¿hay historia? ¿hay giro/payoff? ¿puedo cortar algún segundo? ¿el final termina donde debe? ¿alguien lo compartiría? ¿alguien lo volvería a ver?

**Resumen rápido:** idea simple + historia · hook visual que se entiende sin audio · lenguaje de niño de 5 años · foreshadow al principio · mecanismo que empuja al final · expectativa clara · payoff · twist si se puede · corte abrupto tras el payoff · analizar retención/scroll-through/rewatch/shares · adaptar a cada plataforma.

---

## 4b · Lo que ya sabemos de VÍDEO en nuestras cuentas (medido el 2026-09-23 contra la BD)

- **12 vídeos en las 3 cuentas, mediana 1.950 impresiones**, contra **3.925 de los 222 posts con imagen**. El vídeo nos rinde la mitad de mediana: todo pilar de vídeo es de momento una prueba y así se avisa.
- **Los 2 vlogs "cómo es nuestro día" van 0 de 2:** la oficina de Lanzadera (Iker 13/12/2024, 0.41x) y Valencia desde el cielo (Unai 10/01/2025, 0.41x). **Ninguno llevaba ancla de ventas ni vector nuevo**: eran un día normal contado en tono reflexivo.
- **El único vídeo que voló es el mapa de Euskadi de Unai (28/04, 3.54x · 21.846)**, con el patrón §2 nº2 (`Nadie habla del pueblo… que exporta más que países enteros`) y ancla de ventas (`exporta`).

---

## 6 · PILAR "UNA MAÑANA CON…" (vlog con vector) — v0, EN PRUEBA (Iker, 2026-09-23)

> **Estado:** primer pilar de vídeo de la casa. Definido el 23/09 con las referencias de Iker (Instagram y TikTok, **ninguna de LinkedIn**). El gancho y el primer frame están definidos; el resto del guion se cierra al ver los planos grabados y se añade aquí. Lo marcado *(deducción)* es mío y está sin validar (`working-preferences §0c`).

### 6.1 · Las referencias (métricas dadas por Iker)

| referencia | red | vistas | ♥ | 💬 | guardados | compartidos |
|---|---|---|---|---|---|---|
| `Un día conmigo compaginando la universidad y las redes` (Iker, cuenta personal) | IG | 176.000 | 3.915 | 65 | 230 | sin dato |
| `Rutina de un / deportista / de 15 años` | TikTok | 400.000 | 38.900 | 221 | 4.422 | 2.888 |
| el mismo texto, repetido por el mismo creador | TikTok | 195.000 | 6.802 | 145 | 1.036 | 3.283 |
| `Mañana de un deportista de 15 años` | TikTok | 107.000 | 8.075 | 72 | 729 | **303** |
| `Día de descanso / de un atleta / de 15 años` | TikTok | 220.000 *(Iker escribió "220"; con 20.000 ♥ se asume 220k)* | 20.000 | 109 | 1.539 | 1.312 |
| `Aquí te traigo una rutina de brazos para hacer en casa` | TikTok | 210.000 | 19.400 | 75 | **7.473** | 654 |

**Lo observable, común a todas:** el texto en pantalla es **exactamente** lo que dice la voz, subtitulado palabra por palabra y partido en 3 líneas; el caption repite el mismo texto. El primer frame enseña la identidad sin sonido (el deportista sale de la cama sin camiseta).

### 6.2 · Los patrones que se cruzan

1. **La fórmula:** `[momento] + [de/con quién] + [UN modificador que no pega]`. El bucket base (`un día conmigo`, `rutina de un deportista`, `24 horas…`) está quemado; **lo que lo hace viral es el modificador**: `de 15 años`, `compaginando la universidad y las redes`, `con [personaje nuevo]`. Es el vector viral.
2. **El modificador crea una contradicción** entre dos cosas que no suelen ir juntas (15 años y disciplina de profesional; universidad y creador). El que mira quiere ver cómo encajan *(deducción)*.
3. **La identidad filtra la audiencia:** `deportista` para al público fitness. En nuestro caso la palabra de identidad tiene que ser de ventas, y así hace a la vez de ancla (`global §2.3`).
4. **"Rutina" se comparte ~10 veces más que "mañana"** con el mismo creador y el mismo modificador (2.888 y 3.283 contra 303). *(deducción: la rutina se puede copiar y se manda a alguien; la mañana solo se mira.)* Guardados altos = utilidad (brazos: 7.473).
5. **La serie se repite:** el mismo texto, publicado dos veces, validó dos veces (400k y 195k). El formato es reconocible (`§4` punto 34).
7. **`conmigo` / `con nosotros` NO está validado: sale en 1 de los 6 vídeos de la temática** (el de Iker, que es el de menos vistas y el de menos ♥ por vista, 2,2%). Lo que sí se repite es **ETIQUETARSE a uno mismo en tercera persona con una identidad** (`de un deportista de 15 años`, **4 de 6**, incluido el de 400k). En vídeo, el "con nosotros" lo hace el primer frame, donde salimos todos (Iker, 29/09, al preguntarlo). **La rampa NO cuenta en estos recuentos (Iker, 29/09):** es otra temática, y la dio solo como ejemplo de adjetivo extremo.
8. **Qué empuja cada referencia, medido sobre sus ♥:** los comentarios no pasan del 0,4-2,1% en ninguna. **El formato no vive de comentarios: vive de guardados y compartidos.** Los guardados se disparan cuando hay algo que usar después (brazos 38,5%, rampa 34,6%: el código del mapa); sin utilidad se quedan en el 6-15%. La `mañana` es la que menos se comparte de la serie del deportista (3,8% contra 7,4% y 48,3%).
6. **Pantalla = voz = caption en 5 de 5.** ⚠️ **Choca con `§1`**, que manda hacerlas distintas y sale de outliers B2B de LinkedIn. En este pilar **pantalla = voz** (validado 5/5, y LinkedIn arranca el vídeo sin sonido). El caption sí cambia, porque en LinkedIn lleva el spam ninja.

### 6.2b · EL CASO QUE LO DEMUESTRA: MISMO VÍDEO, OTRO ADJETIVO, x166 (cuenta de vídeos de Iker, métricas suyas)

| gancho | vistas | ♥ | 💬 | guardados | compartidos |
|---|---|---|---|---|---|
| `Rampa gigante en Fortnite` | ~3.000 | — | — | — | — |
| **`Rampa de la muerte en Fortnite`** | **+500.000** | 41.000 | 236 | 14.200 | 3.742 |

**Los mismos planos y los mismos subtítulos. Solo cambia el gancho.** El segundo: 15,80 s de duración, **10,4 s de retención media (66%)**, **41% lo vio entero** y +1.500 seguidores. Lo observable:
1. **El detalle que describe (`gigante`) se cambia por una expresión hecha de peligro (`de la muerte`).** El primero dice cómo es la rampa; el segundo promete que va a pasar algo. Es `global §2.3d` (el intensificador) llevado al extremo.
2. **Bucle abierto hasta el final:** el código del mapa no se enseñaba hasta el último segundo. En nuestro caso, el evento hace de código: **no se nombra en el gancho y se desvela al final** (Iker, 23/09).
3. **El mismo plano con un zoom distinto en cada palabra del gancho.** Con 3 planos o con uno, en la intro cada palabra lleva su propio corte o zoom.
4. **3 palabras de gancho y 15,8 s de vídeo.** La duración de 15-30 s de este pilar va en esa línea.

**⚠️ El techo del intensificador lo pone la cuenta (`brand-voice §1b`).** `de la muerte` es de calle: vale en Iker y **no en Unai**, cuyo intensificador es el formal (`jamás`, `en la vida`) o la expresión de prensa (`de infarto`, *(deducción: sin medir en su cuenta)*).

### 6.3 · La receta del gancho (lo cerrado el 23/09)

- **Voz = texto en pantalla, en 3 líneas, y cada línea es UN plano** de los 3 rápidos de la intro. La línea y su plano cuentan lo mismo (test de la creadora de vídeos, `global §2.2d`).
- **6-10 palabras**, que se dicen en ~3 s.
- **`Una mañana`, con el artículo.** Sin él, `Mañana con nosotros` se lee como "mañana (el día de después) con nosotros", y con un evento al día siguiente parece un anuncio. En la referencia no pasa porque `Mañana DE un` obliga a leerlo como la parte del día.
- **Ancla de ventas dentro del modificador** (`global §2.3`), en su versión amplia.
- **El modificador es verdad y se ve en los planos.** Si no hay un plano que lo enseñe, no va (`CLAUDE.md`: nada inventado).
- ⛔ `revolucionar` y su familia (`global §2.9-REVOLUCIONAR`: 0.68x, 0.53x y 0.45x en nuestras cuentas).
- **El verbo del modificador no puede describir.** `intentando vender` es literalmente un delator de `global §2.9` (*intentando, trabajando, haciendo*). Y **`sin descanso` se tumbó el 29/09**: no es punchy y se puede leer como que la empresa explota al equipo. **El test de las dos lecturas vale también para la imagen de empresa**, no solo para el objeto.
- ~~Apuesta del 29/09: `Una mañana / persiguiendo clientes / desde una casa rural`~~ **→ TUMBADA EL MISMO DÍA POR AUTOGOL (`global §4.4b-AUTOGOL`), y la cacé solo porque Iker pidió autovalidarla.** Nuestro propio ninja del 21/07 (18.933 imp) promete *"Te quitamos los minutos de perseguir a quien nunca iba a comprar"*. Un vídeo de la empresa pasándose la mañana persiguiendo clientes publica que lo que vendemos no nos funciona ni a nosotros.
- **Longitud, medida contra las referencias de la temática:** van de **7 a 11 palabras (mediana 9)**. La apuesta con `en una casa rural` tenía 10, por encima de la mediana. **`casa rural` sale del gancho (Iker, 29/09): ya la enseñan los planos**, y el vector que queda en palabras es `a contrarreloj`.
- **Apuesta vigente (29/09, 2ª versión):** `Una mañana / de ventas / a contrarreloj`, con **6 palabras y 35 caracteres**, más corta que cualquier referencia. `con nosotros` no entra: está validado en 1 de 6 y son 2 palabras más. ~~1ª versión: `Una mañana de ventas / a contrarreloj / en una casa rural`~~. **El bucle es el más fuerte de todos los candidatos:** *¿contrarreloj, para qué?* lo paga el desvelado del evento, igual que el código del mapa en la rampa (`§6.2b`). Y la piscina lo contradice al final.

#### ⛔⛔ 6.3-CHECK · TODO GANCHO DE VÍDEO SE ENTREGA CON ESTE CHEQUEO ESCRITO, LÍNEA A LÍNEA (Iker, 2026-09-29)

> Iker: *"asegúrate de que siempre que me das una corrección del gancho la autovalidas con todo lo que sabes"*. En tres rondas le di `de infarto` (fuera del registro de Unai), `sin descanso` (segunda lectura de explotación) y `persiguiendo clientes` (autogol). **Los tres fallaban una regla que ya estaba escrita.** No había un check que las juntara para vídeo.

| # | check | fuente |
|---|---|---|
| 1 | **Bucle abierto:** leído solo, ¿sabes cómo acaba? ¿Qué pregunta deja, y qué parte del vídeo la paga? | `global §2.0` |
| 2 | **Autogol:** ¿el gancho cuenta como algo nuestro el dolor que nuestro producto o el enlace resuelven? | `global §4.4b-AUTOGOL` |
| 3 | **Segunda lectura sobre la EMPRESA** (explotación, desorganización, no nos va bien) y sobre el OBJETO | `§6.3`, `global §2.2d-DOBLE` |
| 4 | **Ancla de ventas** en versión amplia: `ventas`/`vender` fuerte; `cliente` o `teléfono` solos son ambiguos | `global §2.3` |
| 5 | **Punch:** ¿hay verbo que frena o intensificador que lo sustituya? Nada de gerundios que describen | `global §2.9`, `§2.9-SIN-VERBO` |
| 6 | **Rodable:** ¿qué plano va con cada línea? | `global §2.2d` |
| 7 | **Verdad:** ¿lo enseñan los planos? ¿no promete un resultado que no hubo? | `CLAUDE.md` |
| 8 | **Registro de la cuenta** (Unai: nada de expresiones de calle) | `brand-voice §1b` |
| 9 | **Longitud** 6-10 palabras, `una mañana` con artículo, cero familias de riesgo, cero palabras quemadas | `§6.3`, `brand-voice §2c` |
- **El modificador lleva un intensificador extremo, no un adjetivo que describe** (`§6.2b`: `gigante` → `de la muerte`, x166), con el techo de registro de la cuenta.
- **Si el vídeo lleva un enlace (evento, agendar), el gancho NO lo nombra.** Un post que va del evento trae clics y no inscritos (`global §4.4b-EVENTO-EXPLICITO`: 0 inscritos de 37 clics). El enlace entra como ninja: en el payoff del vídeo y en el caption.

### 6.4 · El primer frame

- Tiene que enseñar **la identidad y la contradicción a la vez, sin sonido**: en la referencia, cama + cuerpo de deportista.
- ⛔ **Nada con marca del evento** (photocall, cartel, logo): se lee como promoción desde el segundo 1 (`post-workflow §4.6-FOTO`, el cartel de Unai del 11/08, 0.47x).
- Si salen caras, gana la sonrisa amplia con los ojos abiertos (criterio de CTR de las fotos de la casa).
- El giro final (en el primer vídeo, la piscina) **no sale en la intro**.

### 6.4b · TEXTO EN PANTALLA: CUÁNDO, CUÁNTO, FUENTE Y COLOR (2026-09-29)

- **Lo que NO dice el scraping, para no citarlo mal:** el `VIDEO_SCRIPT` de `postPrompt.ts` sale de las **transcripciones de audio** de 11 TikToks B2B-IA (Apify `clockworks/tiktok-video-scraper`). **Ve lo que se dice, no lo que se ve**: no dice nada de subtítulos, fuente ni color.
- **Texto desde el frame 1 y el vídeo subtitulado entero, palabra a palabra: 6 de 6** vídeos de `§6.1` (la rampa también lo hace, pero no cuenta: es otra temática). LinkedIn arranca los vídeos sin sonido.
- **Fuente: Bricolage Grotesque, en negrita.** No es gusto: el brandbook (`images §0a-ter`) reserva Bricolage para títulos y textos cortos, y un subtítulo de 1-3 palabras es texto corto. Switzer es para texto corrido, y en un vídeo no hay.
- **Color: letra mint claro `#ebfff6` (el blanco de la marca) con contorno o sombra berenjena `#431b44`, y UNA palabra naranja `#fe8238`, solo en el gancho.** Contraste WCAG medido: mint sobre berenjena **13,6:1**, azul bebé **8,1:1** y naranja **5,7:1**. **Sin contorno, sobre agua de piscina** (tono de muestra, no sacado de nuestros planos), el azul bebé cae a **1,6:1** y el naranja a **1,1:1**: desaparecen. El contorno es lo que hace legible cualquier color; el azul, además, se funde con la piscina y el cielo.
- *(Deducción, sin medir)* **el subtítulo blanco es el nativo de TikTok e Instagram**, así que choca menos y no se lee como anuncio. Un texto que se ve de marca se lee como publicidad, igual que el photocall (`§6.4`). La marca entra por la fuente, el contorno berenjena y la palabra naranja, no por pintar todo el texto.
- **El amarillo** es el estilo del que edita para redes. Está fuera de la paleta y no hay dato nuestro que lo pida.
- **🔄 CORREGIDO EL 29/09 POR LA REFERENCIA DE IKER (Rodri): todo el texto en mint, SIN palabra naranja y SIN contorno, y pequeño.** Es su referencia validada y manda sobre mi propuesta de contorno más naranja. **Lo que se mantiene, porque está medido y no es gusto: sin contorno, la legibilidad depende del fondo de cada plano.** Sobre el frame de la piscina de Iker, el mint da:

  | fondo real | contraste |
  |---|---|
  | puerta oscura | 18,1:1 |
  | tarima | 6,7:1 |
  | pared blanca en sombra | 4,0-5,8:1 |
  | **cielo** | **2,3:1** |
  | **agua de la piscina** | **1,9:1** |

  **Por debajo de 3:1 no se lee.** Así que el texto se coloca en cada plano sobre la zona oscura, o lleva una sombra suave berenjena que no se note como contorno. Esta segunda salida es *deducción*, sin medir en nuestros vídeos.
- **Tamaño:** en el vídeo de Iker, "holaaa" mide **12 px de alto sobre 678 del lienzo (1,8%)** y **54 px de ancho sobre 382 (14%)**. No se sube a ojo: se mide un frame de Rodri y se iguala.

### 6.5 · El guion del primer vídeo (29/09, Unai) — la plantilla del pilar

**Estructura, ~17 s y ~40 palabras de voz en off (= subtítulos):**
1. **0-3 s · gancho con sobrecarga de planos:** 3 planos, uno por línea y un zoom por palabra. Primero el grupo trabajando en el sitio (el primer frame), luego el detalle de trabajo y al final una cara de agobio.
2. **3-5 s · dónde y cuántos:** el plano abierto del sitio, cortado **antes** de que se vea el giro. La casa rural sale aquí, dicha en voz, no en el gancho.
3. **5-10 s · el desarrollo en 3 (`§4` punto 9):** `Unos… / Otros… / Y alguien…`. El segundo plano enseña el material del desvelado sin nombrarlo (`montando esto`).
4. **10-13 s · el pago del bucle:** la pregunta del gancho en voz (`¿Tanta prisa por qué?`) y el desvelado.
5. **13-17 s · el giro y corte seco** sobre el audio real del plano (`holaaa`), sin despedida (`§4` punto 13).

**Lo que se comprobó en los metadatos y no se supuso:** **los 25 clips** se grabaron **el martes 22/09 entre las 12:36 y las 13:58** (el 29/09 escribí «lunes»: mal, y lo cazó el calendario), y el evento era el **jueves 24**. `Al día siguiente` sería falso, y el 30/09 Iker lo pidió por impacto: va **`Pasado mañana`**, que es verdad, igual de corto y además hace eco con `Una mañana` del gancho. **La fecha de grabación se lee siempre en `com.apple.quicktime.creationdate` antes de escribir una marca de tiempo.**

**El caption** repite el gancho en la primera línea, **no desvela el evento** (`Todo por algo que llegaba pasado mañana`) y lleva el ninja a `/agendar/` con **la persona, no la empresa** (`El nombre de quien decide te lo damos nosotros`). Es el tipo 2 del mapa de clientes del 18/09 (*sabe qué empresas, no a quién llamar*) y el dolor de nuestro mejor clic.

**⛔ EL CAPTION NUNCA MANDA AL FINAL DEL VÍDEO (Iker, 30/09).** Ni `al final del vídeo`, ni `ojo al último plano`, ni nada que diga dónde está el pago. Iker: *"les estamos incitando a que salten el vídeo hasta el final… no quiero que nos destroce la retención"*. **El caption abre el bucle, pero no dice dónde se cierra**: el que lo lee antes de ver el vídeo salta al final, se pierde el medio y hunde la retención, que es la señal que reparte un vídeo. Se valida con `--pilar meme --referencia-fuera --meme-sobrio`, porque el validador no tiene pilar de vídeo: **57/57** el 29/09.

### 6.5b · LA VOZ EN OFF ES NARRACIÓN, NO TELEGRAMA (Iker, 30/09)

> *"Lo veo horrible. Tienen que ser frases realmente de narración, no puntos y tanta pausa de respiración."* La primera versión eran 9 frases sueltas de 2-5 palabras (`11 personas. Una casa rural.`): leídas por ElevenLabs suenan a lista, no a alguien contando algo.

- **La referencia de cómo se escribe es Rodri** (`Documentos/Mario/APRILYNNE/TRANSCRIPCIONES @rodri_qf.txt` y `CHECKLIST @rodri_qf.txt`): frases enteras y conversacionales que encadenan (`Y claro…`, `Lo gracioso es que…`, `Supongo que…`), micro-confesión al arrancar (`Igual es una tontería, pero…`), historia y reflexión alternadas, y **el giro sencillo y sin insinuar antes**. Las frases cortas se reservan para el golpe, no para todo el guion.
- **Y la estructura, de Jenny Hoyos** (`APUNTES JENNY SHORTS.txt` y `2`): pregunta → progresión constante → tensión → pago → corte seco.
- **Se entregan 3 propuestas de voz, distintas de verdad** (`working-preferences §1d-BIS`): crónica, confesión y cuenta atrás.
- **⛔ El caption tampoco insinúa el giro** (Rodri: *"no puede estar insinuado antes"*). `Bueno, casi nadie` salió el 30/09 por eso.

### 6.6 · Pendiente
Medir el vídeo a los 3-4 días contra la mediana de vídeo de la casa (1.950, `§4b`) y contra la de Unai, y anotarlo en el historial.
Resto del guion (foreshadow, mecanismo, payoff, giro, corte), duración objetivo (15-30 s, pedida por Iker), caption con ninja y línea de contexto del evento, y el auto-chequeo de `§4` punto 36.

---

## 5 · Cómo combinan las dos capas
- **§2 (VIDEO_SCRIPT)** decide las PALABRAS del spoken hook (uno de los 6 patrones), la estrategia de caption y el texto en pantalla. Es el "qué decir", sacado de outliers reales del nicho.
- **§4 (playbook)** decide la FORMA del vídeo alrededor de esas palabras: foreshadow, mecanismo, payoff, twist, corte, duración y adaptación por plataforma. También gobierna el pensar-primero-el-frame (punto 5) y el auto-chequeo (punto 36).
- Cuando piden vídeo, entrega AMBAS capas: las tres piezas de §1 + el esquema estructural de §4.
