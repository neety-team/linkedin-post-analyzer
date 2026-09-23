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
6. **Pantalla = voz = caption en 5 de 5.** ⚠️ **Choca con `§1`**, que manda hacerlas distintas y sale de outliers B2B de LinkedIn. En este pilar **pantalla = voz** (validado 5/5, y LinkedIn arranca el vídeo sin sonido). El caption sí cambia, porque en LinkedIn lleva el spam ninja.

### 6.3 · La receta del gancho (lo cerrado el 23/09)

- **Voz = texto en pantalla, en 3 líneas, y cada línea es UN plano** de los 3 rápidos de la intro. La línea y su plano cuentan lo mismo (test de la creadora de vídeos, `global §2.2d`).
- **6-10 palabras**, que se dicen en ~3 s.
- **`Una mañana`, con el artículo.** Sin él, `Mañana con nosotros` se lee como "mañana (el día de después) con nosotros", y con un evento al día siguiente parece un anuncio. En la referencia no pasa porque `Mañana DE un` obliga a leerlo como la parte del día.
- **Ancla de ventas dentro del modificador** (`global §2.3`), en su versión amplia.
- **El modificador es verdad y se ve en los planos.** Si no hay un plano que lo enseñe, no va (`CLAUDE.md`: nada inventado).
- ⛔ `revolucionar` y su familia (`global §2.9-REVOLUCIONAR`: 0.68x, 0.53x y 0.45x en nuestras cuentas).
- **Si el vídeo lleva un enlace (evento, agendar), el gancho NO lo nombra.** Un post que va del evento trae clics y no inscritos (`global §4.4b-EVENTO-EXPLICITO`: 0 inscritos de 37 clics). El enlace entra como ninja: en el payoff del vídeo y en el caption.

### 6.4 · El primer frame

- Tiene que enseñar **la identidad y la contradicción a la vez, sin sonido**: en la referencia, cama + cuerpo de deportista.
- ⛔ **Nada con marca del evento** (photocall, cartel, logo): se lee como promoción desde el segundo 1 (`post-workflow §4.6-FOTO`, el cartel de Unai del 11/08, 0.47x).
- Si salen caras, gana la sonrisa amplia con los ojos abiertos (criterio de CTR de las fotos de la casa).
- El giro final (en el primer vídeo, la piscina) **no sale en la intro**.

### 6.5 · Pendiente de cerrar con los planos grabados
Resto del guion (foreshadow, mecanismo, payoff, giro, corte), duración objetivo (15-30 s, pedida por Iker), caption con ninja y línea de contexto del evento, y el auto-chequeo de `§4` punto 36.

---

## 5 · Cómo combinan las dos capas
- **§2 (VIDEO_SCRIPT)** decide las PALABRAS del spoken hook (uno de los 6 patrones), la estrategia de caption y el texto en pantalla. Es el "qué decir", sacado de outliers reales del nicho.
- **§4 (playbook)** decide la FORMA del vídeo alrededor de esas palabras: foreshadow, mecanismo, payoff, twist, corte, duración y adaptación por plataforma. También gobierna el pensar-primero-el-frame (punto 5) y el auto-chequeo (punto 36).
- Cuando piden vídeo, entrega AMBAS capas: las tres piezas de §1 + el esquema estructural de §4.
