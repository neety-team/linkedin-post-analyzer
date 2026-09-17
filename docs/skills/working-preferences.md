# SKILL: working-preferences — Cómo trabajar conmigo en los posts

> **name:** working-preferences
> **description:** Preferencias de trabajo del usuario al crear publicaciones de LinkedIn con Claude. Define el flujo, el formato de entrega, cuándo avisar/validar/preguntar y los tics a evitar en la interacción.
> **when-to-use:** Cargar en cualquier sesión de creación de contenido, junto a `aboutme`, `brand-voice` y `global-instructions`. Esta skill NO dice cómo escribir el post — dice cómo entregarlo y cómo comportarte durante la iteración.

---

## 0b · ⭐ RESUMEN AL FINAL, SIEMPRE — Y EN BULLETS, NO EN PÁRRAFOS (2026-07-16 · reforzado 2026-07-27)
**Cada respuesta termina con un `## Resumen` en BULLET POINTS cortos.** Sin excepción, aunque la respuesta sea corta.
- **Por qué:** "me pones mucho texto y no me entero". Reincidí el 2026-07-27: entregué el resumen como párrafo corrido en una respuesta larga y me lo devolvió ("si no es imposible entenderte"). El resumen en prosa NO cuenta como resumen.
- **Qué va dentro, en este orden:** bullets de **qué he hecho/decidido** + bullets de **PENDIENTES** (qué falta y qué necesito de él). Un bullet = una cosa, una línea.
- **Cuanta más información tenga la respuesta, más obligatorio es esto.** En respuestas largas, además: menos parrafazos arriba (bloques cortos, listas), que el resumen no sea el único sitio legible.
- **Lo demás va arriba y más corto.** El resumen no es la excusa para escribir 30 líneas antes.

## 1 · Formato de entrega

- **Todo borrador de post va dentro de un bloque de código cercado** (triple backtick sin lenguaje). Motivo: la UI mangla los saltos de línea y el espaciado si el post va como texto normal; dentro del bloque se preserva exacto y sale botón de copiar.
  - Un bloque por variante / por hook / por pieza de vídeo.
  - Fuera del bloque va todo lo demás: razonamiento, tag de viralidad, "por qué funciona", concepto de imagen.
- **⛔ UN SOLO BLOQUE POR POST, Y ES EL FICHERO QUE PASÓ EL VALIDADOR, COPIADO TAL CUAL (Iker, 2026-09-16).** El 16/09 entregué la tarjeta dos veces: la primera reescrita a mano en la respuesta y **sin la línea en blanco entre el bloque del spam ninja y el cierre**, y la segunda buena con una nota de "copia esta". Iker: *"¿por qué me das dos variantes con la primera estando fatal?"*. **El texto del bloque se vuelca del fichero validado (`cat`), nunca se reteclea**: al reteclear se pierden justo los saltos, que el validador ya no ve. Y si detecto un fallo en un bloque antes de enviar, se corrige ese bloque; **nunca se entrega el malo con una fe de erratas debajo**. La línea en blanco después del ninja es obligatoria: sin ella el enlace y el cierre se leen como un bloque de tres.
- **Nada de markdown DENTRO del post** (no `**negrita**`, no `*cursiva*`, no `#` headers, no `código`). LinkedIn no lo renderiza. El único markdown que toca el post es el propio bloque que lo envuelve.
- Cuando propongo **2-3 variantes**, cada una con su tag de viralidad y su "por qué" fuera del bloque, para que puedas comparar. Arquetipos genuinamente distintos entre variantes.
- **Concepto de imagen = UN párrafo simple** en prosa, listo para pegar en un generador de imágenes. Sin bullets, sin headers, sin "concepto alternativo" salvo que lo pida.

---


## 📋📋 1-PEGAR · EL POST SE LE DEJA EN EL PORTAPAPELES, LISTO PARA LINKEDIN (Iker, 2026-09-17)

**El problema, que no es del texto:** el editor nuevo de LinkedIn se come los saltos al pegar texto plano, y las rutas de rescate fallan cada una a su manera. **Gmail DUPLICA los blancos** (cada línea se vuelve un bloque y el blanco cuenta dos veces), **Gmail y Google Docs se comen los emojis**, y **Notion convierte `1. ` en lista numerada**, que es justo lo que lleva todo lead magnet. El 17/09 el bloque que se entregó tenía un solo blanco entre párrafos; los dobles los metió Gmail.

**LA SALIDA: al entregar un post definitivo, además del bloque cercado, se ejecuta**
```
powershell -STA -ExecutionPolicy Bypass -File scripts\copiar-post.ps1 <fichero.txt>
```
**con el MISMO fichero que pasó el validador.** Deja en el portapapeles HTML con un `<p>` por línea y `<p><br></p>` por blanco, los emojis como entidades y la lista como texto; Iker pega directo en LinkedIn con Ctrl+V. Si el modo por defecto fallara, `-Modo br` es el plan B. **⚠️ Pendiente de confirmar en LinkedIn con el primer uso**: el HTML se ha verificado leyendo el portapapeles, no pegando en el editor.

## ⭐ 1c · SI UN HALLAZGO CAMBIA UN ENTREGABLE YA DADO, REDALO ENTERO (Iker, 2026-07-21)

**El fallo:** entregado un prompt de diseñador, hice una investigacion posterior que obligaba a cambiarle una columna. Explique el cambio y **no volvi a dar el prompt**. Iker se quedo con un prompt caduco y un parrafo diciendole que estaba caduco.

**Regla: cuando algo que descubres invalida un entregable que ya has dado — prompt, post, lista, ruta de fichero — no describas el cambio: vuelve a dar el entregable entero y corregido, en el mismo turno.** El resumen explica el porque; el bloque trae la version buena. Nunca al reves, y nunca solo una de las dos.

Vale para todo lo que se copia y pega: un prompt de diseñador, el texto de un post, un comando. **Si Iker tiene que reconstruirlo el juntando tu explicacion con la version vieja, esta mal entregado.** Es exactamente el mismo criterio que `§1` (el post siempre completo dentro del bloque, nunca "cambia esta linea").

**Y antes de cerrar el turno, comprueba hacia atras:** ¿algo de lo que acabo de descubrir toca un bloque que ya le di? Si toca, ese bloque se rehace.

### ⛔⛔ 1c-BIS · UN ENTREGABLE QUE AUN NO SE HA EJECUTADO SE REHACE ENTERO, NUNCA SE COMPLEMENTA (Iker, 2026-08-14) — GLOBAL

**El caso:** le di un prompt de edicion de imagen con tres correcciones, **el no lo habia pasado todavia**, y volvio con una cuarta idea suya. Le entregue un SEGUNDO prompt con lo nuevo y le dije que pegara los dos seguidos. Iker: *"si tu me das un plan de correccion y sin ejecutarlo yo te doy mas informacion, tienes que completar el prompt que ya tenias y darme uno con todo, tanto lo tuyo como lo mio. Esto es receta global"*.

**La regla:** mientras un entregable **no se haya ejecutado**, sigue estando abierto. Cualquier cosa que llegue despues —una correccion suya, una idea nueva, un dato mio— **se funde dentro y se vuelve a dar el entregable COMPLETO**, una sola pieza para copiar y pegar.

- **`§1c` cubria solo la mitad:** decia que se rehace cuando **YO** descubro algo que lo invalida. Faltaba el caso mas frecuente, que es cuando **EL** añade algo encima de un plan que todavia no ha corrido.
- **El disparador es si se ha EJECUTADO, no si ha pasado un turno.** Si el prompt ya se paso al diseñador y la imagen ha vuelto, entonces si toca un prompt nuevo y solo con lo nuevo (`images §0i-3`: en edicion no se repite lo que ya esta bien). Si no se ha pasado, es el mismo entregable y se reescribe entero.
- **⛔ Y no se le manda encadenar piezas.** *"Pegale estos dos seguidos"*, *"y ademas cambiale esto"* o *"coge el de antes y añadele"* son las tres formas de romper esto. Si Iker tiene que juntar dos bloques mios para tener la version buena, esta mal entregado — es exactamente el mismo criterio que `§1` (el post entero dentro del bloque, nunca "cambia esta linea").
- **⚠️ Y lo que NO vale como excusa, porque es lo que use yo:** que juntarlo lo haga mas largo o mas facil de que el ejecutor se salte la mitad. Eso es una deduccion mia (`§0c`) contra una instruccion suya. Si el prompt se hace largo, se aprieta la redaccion; no se parte en dos.

Vale para todo lo que se copia y se pega: prompts de diseñador, de animador y de programador, textos de post, comandos y briefings.

## 📏📏 0g · NADA SE ESTIMA. LO QUE SE PUEDE MEDIR, SE MIDE (Iker, 2026-08-27) — GLOBAL, Y ES DE LAS GORDAS

> **Iker, y no está hablando de un recorte:** *"estoy flipando con que me has admitido que es que lo estabas estimando. Nunca tienes que dejar nada a la estimación, y menos en imágenes, todo lo tienes que medir en base a píxeles. Y lo segundo: nuestra estrategia entera de LinkedIn, desde que hemos empezado y por lo que nos está yendo bien, es porque no dejamos nada a la suerte ni a la estimación, todo lo que se puede medir lo medimos. Por favor, que no vuelva a pasar"*.

**QUÉ PASÓ, y por eso está escrito aquí y no en un runbook.** Al cuadrar una foto de grupo calculé el desplazamiento **mirando miniaturas**. Fallé, corregí **a ojo otra vez** y me pasé al lado contrario. Dos entregas malas seguidas por el mismo motivo, y ninguna de las dos la cazó ningún check: **lo estimado pasa todos los controles, porque no hay control que mire una estimación.**

**LA REGLA: si una cosa tiene número, se saca el número ANTES de decidir. No después, y nunca en su lugar.**

| ⛔ lo que hacía | ✅ lo que se hace |
|---|---|
| *"parece que hay más aire a la izquierda"* | rejilla de coordenadas, leer los centros, **restar** los dos aires |
| *"el gancho se ve corto"* | `len()` del gancho contra la mediana medida de los ganadores |
| *"esta región parece virgen"* | consultar la cobertura por cuenta en el historial |
| *"esa referencia funcionó bien"* | reacciones, comentarios, reposts y % de risa de la BD |
| *"el enlace cae más o menos por la mitad"* | posición exacta del carácter contra el tope de 650 |

- **Y el orden importa: se mide PRIMERO y se decide DESPUÉS.** Medir para justificar lo que ya elegiste no es medir.
- **⛔ Si algo no se puede medir, se dice que es criterio y se etiqueta como tal** (`§0c`), no se disfraza de conclusión. Lo prohibido no es tener criterio: es presentar una estimación como si fuera un dato.
- **El coste de medir es de minutos y el de estimar es una entrega devuelta.** La rejilla de coordenadas que resolvió el recorte tardó 3 minutos; las dos versiones malas costaron dos turnos suyos.
- **⭐ Y EL PORQUÉ DE FONDO, que es lo que hay que retener:** esto no es una manía de precisión, **es la estrategia entera de la casa**. Todo el sistema —los pilares, los ganchos, las horas, los verbos, las puertas, los vehículos— existe porque se midió, no porque se intuyó. **Una estimación mía metida en medio de eso rompe la única cosa que hace que funcione.**

## 🛑🛑 1b · TODO PROMPT PARA UN EJECUTOR VA EN **UN SOLO BLOQUE, UN SOLO PÁRRAFO Y SIN SÍMBOLOS RAROS** (Iker, 2026-08-18) — GLOBAL

**Esto ya estaba escrito, pero SOLO en `images §0i-3` como si fuera del prompt del diseñador.** No lo es: vale para **cualquier** prompt que yo le dé a alguien que ejecuta — diseñador, animador, **programador** — y por tenerlo guardado en el sitio equivocado lo incumplí el 18/08 entregándole **cuatro bloques** para un solo encargo. Iker: *"¿por qué me pasas cuatro prompts cuando te he dicho que me pases solo uno, definitivo, con todo, en un solo párrafo, sin símbolos raros? Eso ya lo deberías saber de hace mucho tiempo"*. Es el caso de libro de `§0c-BIS`: **una regla universal escrita dentro de un runbook garantiza que se rompa en los demás.**

**LAS TRES CONDICIONES, y son a la vez:**
1. **UN SOLO BLOQUE.** Un encargo, un bloque cercado, una sola cosa que copiar y pegar. Si le doy dos, tiene que decidir él en qué orden van y qué hace con cada uno, y eso ya es trabajo mío que le he pasado.
2. **UN SOLO PÁRRAFO.** Sin listas, sin líneas sueltas, sin apartados numerados, sin saltos de línea de maquetación. Se escribe como se le explicaría a una persona hablando.
3. **CERO SÍMBOLOS RAROS.** Ni paréntesis, ni corchetes, ni comillas, ni barras, ni flechas, ni asteriscos, ni viñetas, ni numeración con puntos. Las cifras normales sí (18 palabras, 140 caracteres, 360 de ancho).

**⭐ Y LA PREGUNTA QUE LO ROMPÍA: ¿y si el encargo lleva DENTRO textos literales que él tiene que pegar tal cual?** Fue mi excusa el 18/08 con los tres prompts de Claude. **No vale: van dentro del mismo párrafo, delimitados con PALABRAS.** *"El prompt número uno va en la sección 00 y dice así. …texto literal… Ahí termina el prompt número uno."* Se lee igual de bien, se copia de una sola vez, y desaparece el riesgo de que se le quede una pieza fuera.

**Corolario que se me olvida:** si por meterlo todo el párrafo se hace largo, **se aprieta la redacción, no se parte en dos** (`§1c-BIS`). La longitud nunca es motivo para trocear.

## 🛑🛑 1c-TER · SI UN ENTREGABLE MÍO DICE "TE LO PASO YO", ESA PIEZA ES PENDIENTE MÍO (Iker, 2026-08-18)

**El fallo:** en el prompt para el programador de `/llaves/` escribí *"los tres prompts te los paso yo literal, y hasta que los tengas deja los huecos marcados"*, y luego en el resumen puse **"PENDIENTE — tú: los 3 prompts"**. Iker pasó el prompt, el programador construyó los tres bloques con sus `[PENDIENTE]` dentro, y la web se quedó parada esperando algo que tenía que escribir yo. Iker: *"¿por qué no me has avisado de que le has dicho que tú le vas a pasar el prompt si no se los has pasado?"*.

**La regla: cuando un entregable mío delega una pieza EN MÍ, esa pieza se entrega en el MISMO turno.** Si de verdad no se puede, va en el resumen como **bloqueo mío**, con lo que me falta para desbloquearlo. **Nunca en la lista de pendientes de él**, porque ahí la lee como algo que tiene que hacer o esperar, y no es ni una cosa ni la otra.

**El chequeo, antes de cerrar cualquier turno con un entregable dentro:** busca en el bloque las promesas en primera persona (*"te lo paso"*, *"te lo mando"*, *"lo escribo yo"*, *"lo mido y te digo"*). **Cada una de ellas es una línea de MI lista, no de la suya.** Si alguna sigue sin cumplir al final del turno, o se cumple ahí mismo o se marca en rojo.

## 🛑🛑 0e · NUNCA `git add -A`: SE AÑADEN MIS FICHEROS POR NOMBRE (2026-08-21)

**El fallo, y lo descubrí yo auditando mis propios commits, no me lo dijo nadie:** dos commits míos del 21/08 se llevaron por delante **cambios de frontend que no eran míos** (`DateRangeCalendar.tsx`, 163 líneas nuevas, y `Accounts.tsx`), que estaban sin commitear en el árbol cuando empecé. Usé `git add -A` y me llevé lo que había suelto, **con un mensaje de commit que hablaba de recetas de copy**.

**Lo que hace de esto algo peor que un despiste:** el código quedó **mal atribuido en el historial**. Quien busque cuándo entró ese componente va a encontrar un commit sobre ganchos de LinkedIn. Y si hubiera que revertir mi commit, se revertiría trabajo ajeno con él.

**LA REGLA, sin excepciones:**
1. **`git status --short` ANTES de añadir nada.** Si aparece algo que yo no he tocado, es de otro.
2. **`git add <ruta> <ruta>`, por nombre.** Nunca `-A`, nunca `.`, nunca `-u`.
3. **Si hay cambios ajenos sueltos, se dicen en la entrega y se dejan donde están.** No se commitean por cortesía ni se descartan por limpieza: **borrar trabajo que no es mío es peor que el error que estoy arreglando.**

## 🛑🛑 0f · UNA LISTA DE QUEMADAS SE TOCA AL PUBLICAR, NUNCA AL ENTREGAR (2026-08-21)

**Metí `acertar con quién no` en `SPAM_QUEMADO` con el post todavía sin subir, por no olvidarme luego.** Resultado: **el validador tumbaba el propio post que acababa de aprobar**, porque su ninja lleva esa frase.

**Las listas de quemadas (`SPAM_QUEMADO`, `SPAM_QUEMADO_CORREO`, `CONCEPTO_QUEMADO`, `FRASE_RABIA_USADA`, `VERBO_PREJUICIO_QUEMADO`, `PAIS_QUEMADO`) describen lo que YA SE PUBLICÓ.** Adelantarlas convierte el validador en un obstáculo contra el borrador vivo, que es justo lo contrario de para lo que está.
- **El disparador es la confirmación de que está subido**, no la entrega ni la aprobación.
- **Y para no olvidarlo, va en la lista de PENDIENTES MÍOS del resumen** (`§1c-TER`: lo que prometo en primera persona es mi lista, no la suya), nunca dentro del código antes de tiempo.

## 🛑🛑 0d · DESPUES DE CADA EDICION POR SCRIPT, BUSCAR BYTES 0x08. YA VAN TRES

**El fallo, siempre igual:** edito un fichero con un script, la edicion mete un `\b` de regex, y por el camino se convierte en un **byte de control 0x08**. No da error, no rompe el build, no lo ve el `git diff` a simple vista. **La regex simplemente no casa NUNCA y el check sale OK en falso.**

**Las tres veces:**
1. **06/08** — 12 regex de `validar-post.py`. AI-tells, menciones y agenda llevaban **semanas** dando OK sin comprobar nada.
2. **18/08** — otras 2 en el mismo script, al voltear el check de `conecta`. Lo cazo el autochequeo que se puso tras la primera.
3. **18/08** — 2 en `backend/src/services/pillar.ts`, en la regex del entregable. **Ahi no hay autochequeo**, y de no mirarlo el clasificador habria seguido sin detectar lead magnets, que es justo el bug que estaba arreglando.

**LA COMPROBACION, y va SIEMPRE tras editar codigo con un script:**
```
python -c "import io,glob;[print(p,f.count(chr(8))) for p in glob.glob('**/*.ts',recursive=True)+glob.glob('scripts/*.py') for f in [io.open(p,encoding='utf-8').read()] if chr(8) in f]"
```
Si sale algo, se sustituye por `\b` y se vuelve a comprobar.

**⚠️ Y LO QUE ENSEÑA DE FONDO: un check que no casa nunca es PEOR que no tener el check.** Da la señal de que algo esta vigilado cuando no lo esta, y por eso se tarda semanas en descubrirlo. Cuando un check "siempre pasa", la primera sospecha no es que el codigo este bien: es que el check este muerto.

## ⭐ 1d · LOS AVISOS CRITICOS VAN MARCADOS EN ROJO (Iker, 2026-07-21)

El terminal no pinta color, asi que **todo aviso que pueda tumbar una publicacion o hacerle perder tiempo empieza por 🔴**. Iker lee en diagonal cuando va rapido y un parrafo de texto plano se le pasa.

Se marca en rojo: datos que no se han podido verificar, riesgos de publicar algo falso, cosas que faltan por adjuntar y sin las cuales el entregable no funciona, y contradicciones entre lo que dice el texto y lo que enseña la imagen.

**⭐ Y HAY UN SEGUNDO NIVEL, PARA LO QUE TIENE QUE EJECUTAR ÉL A MANO (Iker, 2026-08-18): `⚠️` MÁS SU NOMBRE.** El 🔴 marca lo que puede tumbar la publicación; el **`⚠️ AVISO, MARIO:`** marca **un paso manual que se hace justo antes de publicar y que es facilísimo saltarse con prisa**. El caso que lo motiva es el desenfoque y el export sin metadatos (`images §0a-penta`), que yo entregaba con `⚙️`: *"si me pones ese emoji de un engranaje no me parece algo urgente"*.
- **Nunca `⚙️`, `🔧` ni `📌`** para algo que él tiene que hacer. Esos se leen como nota técnica y se saltan.
- **Se le nombra:** `AVISO, MARIO:` o `CUIDADO, MARIO:`. Un aviso dirigido a una persona se salta menos que uno impersonal.
- **La regla general detrás: la forma del aviso es parte del aviso.** Si el que lo tiene que ejecutar va con prisa, el formato decide si se hace o no. **No se marca** lo que es solo una opinion o una mejora opcional — si se marca todo, deja de destacar nada.

## 🔴🔴 0c-BIS · ANTES DE ESCRIBIR UNA CORRECCIÓN: ¿ES GLOBAL O ES DE ESTE PILAR? (Iker, 2026-08-06)

**La pregunta se hace SIEMPRE, aunque Iker no la haga.** Cada vez que él corrige algo o que sale un dato, antes de tocar ninguna receta: *¿esto vale para cualquier publicación, o solo para el pilar que tengo delante?*

**EL TEST, que es el que da la respuesta sin dudar:** *¿la cosa que estoy corrigiendo existe SOLO en este pilar?*
- **Si existe en todos → la regla es GLOBAL** y vive en `global-instructions` o aquí, no en el runbook. Formateado, ritmo de bloques, ancho de línea, bucle abierto, cómo se roba una referencia, cómo se entrega: **todo eso lo tiene cualquier post**.
- **Si solo existe en ese pilar → es del RUNBOOK.** El bloque de menciones, el CSV de PamPam, la palabra clave del CTA, la escalera de países: un meme no tiene menciones salvo que demos crédito, así que una regla de menciones NO es global.

**⛔ Por qué esto es prioritario y no una manía de orden: escribir en un runbook algo universal garantiza que se rompa en los otros cinco pilares.** No es una teoría, es lo que lleva pasando:
| Regla | Dónde la escribí | Qué costó |
|---|---|---|
| Bucle abierto | `post-workflow §4.4` (meme) | Propuse un gancho de meme que desvelaba el chiste; había que moverla a `global §2.0` |
| Vehículo vs contenido | `post-workflow §4.4` (meme) | Se rompió **cuatro veces el mismo día** en un lead magnet |
| Medir la anatomía de la referencia | `post-workflow §4.4` (meme) | Iker: *"espero que no lo hayas aplicado solo a la receta de meme"*. A `global §2.2b-MEDIR` |
| Ritmo de bloques | Solo en el validador, y a medias | Prohibía el `1-2-1-2` y le colé un `1-3-1-2-1-3-1-2` |
| **Variedad del ARRANQUE de los bloques** | `post-workflow §4.2`, `§4.3` y `§4.5`, **tres veces y las tres en un runbook** | Escrita desde el **28/07** y aun así entregué `La web / La centralita / La persona` el 25/08, una semana después del `La eché…` de la historia del 18/08. **Al escribir una historia no aplicaba ninguna de las tres.** A `global §2.0b-ARRANQUE` |

**Y si es global, se dice en la entrega.** Una línea: *"esto lo he metido en `global` porque afecta a todos los pilares"*. Así Iker puede corregir la decisión antes de que envejezca dentro del sitio equivocado.

## ⭐ 0c · MIS DEDUCCIONES NO ENTRAN EN LAS RECETAS SIN QUE IKER LAS APRUEBE (Iker, 2026-07-27)

**El fallo real:** el 21-jul observé que un prompt de imagen que funcionó estaba escrito en líneas sueltas, deduje que ESA era la forma correcta y lo escribí en `images §0i-3` **junto a las reglas de Iker, como si fuera una de ellas**. Encima creé una contradicción con su regla de siempre (párrafo único) que arrastré seis días. Cuando lo vio: *"yo eso no te lo he dicho en la vida, ¿alguien ha hecho un commit?"*.

**La regla:** en las recetas solo entra lo que Iker ha dicho o lo que está **medido con datos**. Una conclusión mía sacada de observar un resultado es una **hipótesis**, y va: (a) propuesta en el chat para que él la apruebe, o (b) escrita marcada explícitamente como deducción sin verificar. **Nunca mezclada con sus instrucciones.** Un dato medido se cita con su medición; una regla suya se cita con su fecha; lo mío, si entra, entra etiquetado.

## ⭐ 1d-bis · SI DAS REFERENCIA DE IMAGEN, DAS TAMBIEN EL PROMPT DEL DISEÑADOR (Iker, 2026-07-27)

Describir el concepto de la imagen y enlazar la referencia **no es la entrega**: falta lo único que el diseñador puede ejecutar. En **cada** entrega que lleve imagen van las tres cosas juntas: (1) el **concepto**, (2) la **referencia real con su enlace** (outlier validado, `images.md`), y (3) el **prompt cerrado para el diseñador**, en su propio bloque copiable. Si falta el prompt, la entrega está a medias y hay que volver a pedirlo.

## ⛔⛔ 1d-QUATER · EL ENLACE VA COMPLETO Y LA FOTO VA EN LA ENTREGA FINAL (Iker, 2026-08-13)

**Dos fallos del mismo turno, y los dos dejan al diseñador sin poder trabajar.**

**1 · El enlace de la referencia se pega TAL CUAL lo devuelve la API. Nunca se acorta a mano.** Yo cogí el `share_url` de Unipile y le quité el slug codificado por dejarlo "limpio", y **LinkedIn devuelve error sin ese slug**. Iker: *"el enlace da error, no sé si ha caducado o me lo has dado mal"*. Da igual que sea feísimo y ocupe cuatro líneas: se pega entero, con el `%F0%9D...` y con los parámetros.

**1b · Y SIEMPRE COMO ENLACE PULSABLE, NUNCA EN BLOQUE DE CÓDIGO (Iker, 2026-08-13).** *"¿Por qué me has dado el enlace en un formato que puedo pulsar y copiar? Siempre los enlaces me los tienes que dar en formato que yo pulso y que salen aquí en azul."* Va en markdown, `[texto corto](URL completa)`, en **cualquier** enlace que le dé: referencias, posts nuestros, documentación, PRs.
- **⛔ EL FALLO DE FONDO, y es el que hay que recordar: traté "completo" y "pulsable" como si hubiera que elegir.** Primero se lo di pulsable pero acortado (roto), y al corregirlo me fui al extremo y se lo puse en bloque de código para que se copiara entero (no pulsable). **Son independientes:** el markdown lleva la URL entera y fea en el destino y enseña un texto corto en azul. Se cumplen las dos a la vez, siempre.
- **La única excepción es lo que va DENTRO del post**, donde la URL se escribe en crudo porque LinkedIn no renderiza markdown (`§1`).

**2 · La foto de la referencia va en el MISMO mensaje que la entrega, al final, no suelta a mitad de turno.** La regla de `§1d-ter` ya decía que se adjunta siempre, y **yo la adjunté**… en medio de un turno largo lleno de comandos, y se perdió de vista. Iker: *"sin foto de referencia, ¿cómo le voy a decir al diseñador que la calque?"*. **Adjuntarla no basta: tiene que estar donde él la va a buscar**, que es junto al post y al prompt.
- **Y se vuelve a descargar en el momento de entregar**, no se reutiliza la de hace tres horas: las URL de `media.licdn.com` caducan y dan 403 (`§1d-ter`).
- **Antes de darla, se comprueba que el post sigue vivo** pidiéndolo a la API. Si el autor lo ha borrado, la referencia ya no vale y hay que decirlo.

## ⭐ 1d-ter · LA FOTO DE LA REFERENCIA SE ADJUNTA SIEMPRE, NO SOLO SU ENLACE (Iker, 2026-08-06)

**En CUALQUIER entrega que se base en una referencia —meme, lead magnet, mapa, historia, email— la imagen de esa referencia va ADJUNTA en el chat**, además del enlace. Iker: *"a veces me la pasas y a veces no, y me la tienes que pasar siempre para ir más rápido"*.

- **El enlace es para él** (comprobar que existe y cuánto hizo); **la foto es para el diseñador**, que la necesita adjunta y no va a abrir LinkedIn (`images §0i-2-ADJUNTOS`). Si no se la doy descargada, el trabajo de bajarla se lo come Iker.
- **Se baja de la API, no se le pide a él:** las nuestras con `POST /api/posts/post/{id}/refresh-media` (las URLs de `media.licdn.com` caducan y dan 403) y las de fuera con `attachments[0].url` de Unipile.
- Va **en el mismo turno** que el prompt del diseñador, para que pueda reenviar las dos cosas de una vez.

## 🔴🔴 1d-BIS · NO SE ENTREGA LA PRIMERA VERSION. NUNCA (Iker, 2026-07-30)

**⚠️ APLICA A TODO, no solo a los memes (Iker, 2026-07-30).** Mapa, "Los 10", despiece, lead magnet, historia, meme, newsletter, secuencia de email, prompt de imagen y prompt para el programador. **Y a cualquier pilar que inventemos manana.** Vive aqui, en como se ENTREGA, precisamente para que no dependa del pilar: si algun dia hay que repetirlo dentro de un runbook, es que esta mal puesto.

**El problema que lo motiva, en palabras de Iker:** *"tienes todas las recetas superdetalladas, con validaciones superespecificas, y solo las estas aplicando si te lo digo yo"*. Cuerpos bien, **ganchos mal**, y cada dia fallando por un motivo distinto: un dia sin sujeto colectivo, otro sin verbo punchy, otro con una cifra dentro.

**⛔ La causa raiz: lo que vive solo como CRITERIO depende de que yo me acuerde, y yo me olvido.** Hay dos arreglos y hacen falta los dos.

### Arreglo 1 — lo mecanizable se MECANIZA, no se anota
Cada vez que Iker corrija algo del gancho o del cuerpo, la primera pregunta es **"¿esto lo puede comprobar el validador?"**. Si la respuesta es si, **va al validador ese mismo dia**, no a un parrafo de la receta. El 2026-07-30 se movieron tres reglas del gancho de peloteo (sujeto ajeno, frase-rabia y sin cifras) y **las tres cazan fallos reales mios de esa misma semana**. Lo que se mecaniza no se olvida.

### Arreglo 2 — el bucle de entrega, obligatorio
**El validador es el SUELO, no el techo.** Pasarlo no significa que este bien.

1. **3 CANDIDATOS DE GANCHO, siempre.** La receta ya lo pedia (`§4` Paso 4) y yo entregaba uno. Escribir tres y elegir es lo que hace que el flojo pierda por comparacion; con uno solo, el flojo gana por incomparecencia.
2. **Validador.** Arreglar TODO lo que falle.
3. **Pase de criterio POR ESCRITO** contra el runbook del pilar, punto por punto. No "lo he revisado": la lista del runbook, marcada.
4. **Si algo queda flojo, se reescribe y se vuelve al 2.**
5. **Solo entonces se entrega.** Iker no es el que encuentra los fallos de primera version: para eso estan el validador y el pase de criterio.

**Y si la version que tengo no es la mejor que puedo dar, NO se entrega.** Iterar cuesta minutos; que Iker corrija una entrega mala cuesta su tiempo, que es lo caro.

## ⛔⛔ 1g · DEBAJO DE CADA PROMPT, QUÉ HAY QUE ADJUNTAR (Iker, 2026-08-11) — GLOBAL

**Justo después de cada prompt va la lista de lo que Iker tiene que adjuntarle a
quien lo va a ejecutar.** En cualquier pilar y para cualquier prompt — diseñador,
animador, programador, edición—. Si no se dice ahí, se olvida, y el diseñador acaba
tirando de la fuente por defecto o inventándose la referencia.

**Va en UNA sola línea y con ⚠️, el triángulo amarillo.** Ni un clip, ni dos
avisos separados, ni un emoji nuevo por mi cuenta (Iker, 2026-08-11: *"eso no te lo
he pedido nunca"*). Una línea, un triángulo, todo dentro: lo que adjunta y la
postproducción si la hay.

Lo habitual: **la foto de la referencia**, **los instaladores de Bricolage
Grotesque y Switzer**, y los **logos** si el pilar los lleva (despiece, mapa).

**Y el prompt mismo NUNCA sale sin paleta ni tipografía.** Está en `images §4 ·
Constraints de marca (SIEMPRE, en cualquier variante)` desde el principio y el
11/08 lo omití en los dos memes. Iker: *"es lo más importante, tanto nuestra
tipografía como los colores del nuevo brand book"*. **Un meme calcado sin nuestra
tipografía es el meme de otro con nuestro chiste**: lo único que lo hace nuestro es
cómo está escrito. Las dos cosas van al validador como aviso de entrega.

## ⛔⛔ 1h-DIA · EL DÍA NO SE PREGUNTA: SE PUBLICA HOY (Iker, 2026-09-16) — GLOBAL

**Todo lo que se prepara se publica el mismo día en que Iker lo cierra conmigo**, salvo que él diga otra cosa, esté de vacaciones o ya sea muy tarde. Iker: *"siempre las cosas se publican el día en el que hablo contigo, a menos que te diga lo contrario"*. **El fallo:** el 16/09 tuve tres turnos seguidos la pregunta *"¿hoy o el 17?"* en los pendientes. **No se pregunta el día; se pregunta la HORA** (abajo), y el `ddmes` del UTM es el de ese día. Si hay algo del calendario que choca (una cuenta que publicó ayer), se avisa en una línea, no se deja abierto como pregunta.

## ⛔⛔ 1h · ANTES DE QUE SUBA NADA, PREGUNTARLE LA HORA (Iker, 2026-08-11) — GLOBAL

**En cuanto Iker diga que el post ya está o que lo va a subir, hay que preguntarle
a qué hora piensa publicarlo y decirle lo que dice el dato.** Sin esperar a que lo
pregunte él.

Iker: *"a veces me caliento. Hoy ya he subido 2 y los 2 a muy buena hora, eso es
más que suficiente. Mejor guardarme para mañana los 2 buenos y a buena hora, que si
no, todo el trabajo para nada. Subir ahora a las 2 de la tarde posts buenos es
matarnos"*.

**El dato, medido sobre los 3 perfiles (hora española, posts con más de 500
impresiones):**

| franja | posts | mediana imp | mediana ratio |
|---|---|---|---|
| **10:00** | 45 | **4.850** | **0,80x** |
| 12:00 | 38 | 4.328 | 0,69x |
| 13:00 | 34 | 3.894 | 0,55x |
| **14:00** | 15 | 2.989 | **0,43x** |
| 15:00 | 7 | 3.543 | 0,37x |

**Las 14:00 es la peor franja de la jornada: 0,43x contra 0,80x de las 10:00.** Un
post bueno publicado ahí rinde la mitad, y no hay forma de recuperarlo.

**Los dos argumentos que hay que darle, porque son los que deciden:**
1. **Ya no hay prisa de contenido.** Desde que ningún post lleva año
   (`brand-voice`), esperar a mañana no le cuesta NADA al texto. Antes sí.
2. **Dos posts buenos al día en buena hora bastan.** El tercero a mala hora no
   suma alcance: gasta una pieza buena.

**Cuándo SÍ se sube a mala hora:** cuando esa cuenta lleva días sin publicar y lo
que se busca es romper la sequía, no el pico. Ahí 0,43x es mejor que nada.

## ⛔⛔ 1f · LO QUE SE COPIA NO SE PARTE A MANO (Iker, 2026-08-11) — GLOBAL

**En todo bloque cercado pensado para COPIAR, cada párrafo va en UNA SOLA LÍNEA.**
Nada de cortar a los 70-75 caracteres para que "quede cuadrado".

Iker: *"siempre me los das con un formato raro, como un salto de línea, entonces los
prompts ocupan mucha altura y sobra mucho espacio por la derecha. Dámelos tal cual.
Es un problema global"*.

**Por qué está mal partirlos:** el bloque no reajusta el texto al ancho de la
ventana, así que mis saltos se quedan fijos. Resultado: una columna estrecha, el
doble de alto y media pantalla vacía a la derecha. Y al pegarlo en otro sitio se
lleva los saltos falsos dentro.

**Dónde aplica — a TODO lo copiable, no solo al prompt del diseñador:**
- prompts de diseñador, de animador y de programador
- prompts de intake y de edición
- cualquier bloque que Iker vaya a pegar en otra herramienta

**La ÚNICA excepción es el TEXTO DEL POST**, donde el salto de línea es contenido:
lo decide `§3.2` y define el ritmo que ve el lector en LinkedIn. Ahí los saltos van
exactamente donde van, ni uno más.

**⛔ Y NO, LOS SALTOS DE PÁRRAFO TAMPOCO (Iker, 2026-08-11).** Escribí aquí que
"los de párrafo sí valen" y **me contradije con `images §2b`**, que ya decía desde esa
misma mañana que el prompt va en **un solo párrafo**. Con mi versión devolví un
prompt de tres. **Es UNO: sin líneas en blanco dentro, sin apartados, sin listas.**
Se escribe como se lo explicarías a un amigo, del tirón.

## ⛔⛔ 1e-DOS · LA COMPARATIVA SON DOS VISTAS, NO UNA (Iker, 2026-08-10) — GLOBAL

**Toda entrega de un post lleva DOS comparativas, en este orden:**

1. **Contra la REFERENCIA que estamos remezclando**, si la hay. Responde: *¿hemos
   calcado lo que fuimos a robar?* — gancho, ritmo, emojis, longitud, cierre.
2. **Contra NUESTRO MEJOR post de ese mismo pilar.** Responde: *¿esto se parece a
   lo que ya sabemos que nos funciona a NOSOTROS?*

**Es global: vale para todos los pilares.** Si no hay referencia externa (mapa,
los 10, despiece), se entrega solo la segunda, y se dice que no hay primera.

**Por qué hacen falta las dos, y no una:** son preguntas distintas y pueden dar
respuestas opuestas. El lead magnet del 2026-08-10 calcaba el CTA de Martín Arosa
(vista 1) y el molde de gancho de nuestro 632c (vista 2); mirando solo una de las
dos, la mitad del post quedaba sin contrastar. Yo entregué primero solo la suya —
y como no compartía anatomía, no medía nada (§1e-REF) — y luego solo la nuestra,
con lo que el CTA robado se quedó sin comparar. **Las dos, siempre.**

**Cuál es "nuestro mejor" de cada pilar** (por comentarios en lead magnet, por
engagement en meme, por clics en peloteo):

| pilar | el mejor | fichero |
|---|---|---|
| lead magnet | 632 comentarios, *"Claude acaba de matar el cold outbound"* | swipe file |
| meme | 06/08, *"Vender es un caos"* (0,54% lk/imp, 31 reposts) | — |
| mapa | 28/04 Unai (1,096% CTR) y 13/05 Iker (270 clics) | — |

**⛔ Y EL PELOTEO NO SE LIBRA POR NO TENER REFERENCIA EXTERNA (Iker, 2026-08-10).** *"Peloteos nunca tenemos referencias de otros, pero de nosotros sí"*. Allí la vista 2 es la ÚNICA, y es justo donde más falta hace: **es el control de regresión del pilar.** Iker: *"así me aseguraré en el futuro de no volver a cagarla como cuando me borraste del gancho la palabra exporta"*. Ese fallo — quitar del gancho una palabra que en el mapa ganador sí estaba — es invisible leyendo el post solo, y **salta a la cara puesto al lado del que funcionó**. La comparativa contra nosotros mismos no es un adorno de la entrega: es lo que impide que cada post nuevo pierda, sin querer, una pieza que ya sabíamos que funcionaba.

**Y las dos se rehacen cada vez que cambia el texto** (§1e-REENTREGA).

## ⛔⛔ 1e-REENTREGA · SI CAMBIA EL TEXTO DEL POST, LA COMPARATIVA SE REHACE (Iker, 2026-08-10)

**La regla:** cada vez que cambia el TEXTO de la publicación, **la comparativa
nueva va en esa misma entrega, sin que Iker la pida**. No solo la primera vez.

**El disparador es que cambie el texto del post.** Una corrección a un análisis, a
una cifra de la entrega o al código **no** la dispara. Iker: *"cuando te haga una
corrección respecto al texto de la publicación me refiero"*.

**Por qué:** el 2026-08-10 entregué el lead magnet con su comparativa, Iker corrigió
tres cosas del texto (el bloque de tres, la longitud, el cierre calcado), reescribí
el post — **y entregué la versión nueva sin comparativa**. La que él tenía delante
compara un texto que ya no existe, así que tuvo que pedirla otra vez. Correr el
script cuesta un segundo; pedirla cuesta un turno entero.

**Dónde aplica:** en todo pilar que se monte sobre una referencia — **lead magnet y
meme siempre**, y cualquier remix. En los pilares de formato propio (mapa, los 10,
despiece) no hay referencia externa que comparar.

**Y la referencia de esa comparativa nueva es la MISMA de antes** (§1e-REF): si al
corregir el texto la comparativa cambiara de referencia, ya no se vería qué ha
cambiado, que es justo para lo que se mira.

## ⛔ 1e-REF · LA REFERENCIA DE LA COMPARATIVA COMPARTE ANATOMIA, NO FECHA (Iker, 2026-08-10)

**El error:** entregue el lead magnet del martes comparado contra el post de 483
comentarios de Martín Arosa, que **no comparte nada con el nuestro** salvo el
mecanismo del CTA. Iker: *"no entiendo tampoco por qué me has puesto esa
referencia si no tiene absolutamente nada que ver con lo nuestro, solo que es el
lead magnet más reciente, supongo"*. Y era exactamente eso: lo elegí por reciente.

**Para qué sirve la comparativa:** para ver si hemos calcado la anatomía — hook,
ritmo, bloques, emojis, longitud. **Contra un post que no comparte anatomía, la
comparativa no mide nada**: sale que somos distintos en todo, que es justo lo que
tiene que salir, y no informa de nada.

**La regla:** la referencia es **el post que estamos calcando**, el que comparte
molde de gancho, pilar y motor. Casi siempre es **uno nuestro del swipe file**.

**Y si de un post solo robamos UN mecanismo** (el CTA, el cierre, un giro), eso
**no lo convierte en la referencia**. Se dice en la entrega en una línea — *"el
CTA sale del 483 de Martín Arosa, que dejó el gate el 05/08"* — y la comparativa
se monta contra la referencia anatómica de verdad.

## ⛔ 1e-COPIA · EL MECANISMO SE ROBA, LAS PALABRAS NO (Iker, 2026-08-10)

Copié el cierre de Martín Arosa casi literal: *"Lo estoy compartiendo de forma
gratuita. / Acceso libre. / (Conecta conmigo para que pueda escribirte)"*, tres
líneas contra sus tres. Iker: *"se ve demasiado copia — todo eso yo lo resumiría
en una, sin perder valor y con otras palabras"*.

**Lo que se roba es el MECANISMO:** sin la palabra "comenta", una pregunta
directa, gratis y conectar para poder mandarlo. **Lo que no se roba es la
redacción.** Tres líneas suyas caben en una nuestra: *"Conecta conmigo y te los
mando gratis."* — mismo mecanismo, 3 líneas menos y sin olor a calco.

**El validador solo puede exigir el mecanismo** (que haya pregunta, que se diga
gratis, que aparezca "conecta conmigo"). **Que no sean sus palabras exactas es
criterio, y toca mirarlo a mano en el pase de `global §8`.**

## ⭐ 1e · TODA ENTREGA DE UN POST LLEVA LA COMPARATIVA ORIGINAL vs EL MIO (Iker, 2026-07-22)

En **cada** entrega de un post (meme, lead magnet, mapa, lo que sea), además del texto, el prompt y los avisos, va **siempre una sección de comparativa**: el **post original de referencia** y **el mío**, **en la misma fila, lado a lado, dos columnas** (izquierda = original, derecha = el mío). Sirve para ver de un vistazo cómo se ha robado la esencia.

**⭐ EL ORDEN DE LA ENTREGA (Iker, 2026-07-27):** primero **mi post** en su bloque cercado listo para copiar; **justo debajo, el post ORIGINAL entero en OTRO bloque cercado igual** (también copiable, mismo formateado); y **después** la vista comparativa. Sin el original suelto no se puede leer de dónde sale lo nuestro.

**🔴 REINCIDÍ OTRA VEZ EL 2026-08-06, y la doctrina de abajo ya estaba escrita entera.** Entregué el meme de Unai con dos bloques cercados apilados. Iker: *"esto te lo he pedido ya muchas veces y siempre te equivocas"*. **Aquí no falta receta, falta cumplirla:** antes de pegar una entrega de post, se relee este bloque, igual que el chequeo de `images §0i-3`. Y dos precisiones suyas de ese día:
- **Las columnas se separan con una línea DISCONTINUA vertical** (`:` repetido a lo alto), no con un borde continuo ni con espacios sueltos. Debajo de la cabecera, una regla horizontal que se cruza con ella.
- **Cero etiquetas dentro de las columnas.** Nada de `GANCHO:`, `CUERPO:`, `CIERRE:`. Iker: *"eso lo sé yo"*. Va el texto tal cual, seguido, de arriba abajo.
- **La comparativa NO tiene que ser copiable** —*"ni me apetece copiarla, no lo necesito, pero necesito verlo en dos columnas"*—, **pero eso NO cambia el contenedor: sigue yendo en un BLOQUE CERCADO de tres comillas.** Al leer lo de "no copiable" me pasé a `<pre>` y salió un desastre: el terminal **no renderiza HTML**, así que Iker vio la etiqueta `<pre>` literal y encima el texto en fuente proporcional, que desalinea las columnas y convierte la vista en una sopa. **El bloque cercado es lo ÚNICO que garantiza monoespaciado aquí**, y el monoespaciado es lo que sostiene las dos columnas. Que además se pueda copiar es un efecto secundario inofensivo.
- **⚙️ NO SE MAQUETA A MANO: `python scripts/comparativa.py <original.txt> <mio.txt> "<cab izq>" "<cab der>"`.** La he entregado mal **cuatro veces**, siempre por maquetado y nunca por criterio: dos apilada, una en `<pre>`, y una con la regla horizontal más ancha que las columnas —se partía en dos líneas— y encima continua. El script fija los 36 caracteres por columna (75 de ancho total, que es lo que entra sin partirse), pone la regla **discontinua** y del ancho exacto, y **cuenta los emojis como dos celdas**, que es lo que descuadraba el separador en las líneas con 🤣 o 👇.
- **Columnas estrechas y largas está BIEN.** Iker: *"si los textos son largos, las columnas serán compactas a nivel de anchura pero muy largas a nivel de altura, y eso me parece bien"*. No se recorta ni se resume para que quepa.

**El formato, exacto (Iker es tiquismiquis con esto):**
- **LOS DOS TEXTOS VAN ENTEROS, sin resumir ni poner `[lo malo]` ni recortes.** Una comparativa "general" con etiquetas no vale: se comparan las publicaciones completas, palabra por palabra.
- **Dos columnas EN LA MISMA FILA**, no dos bloques apilados. Se monta en **un solo bloque cercado monoespaciado**: cada línea = columna izquierda (rellenada a ancho fijo) + hueco + columna derecha, alineadas arriba. **NADA de tabla, nada de floritura, nada de "cosas raras".**
- Cabecera dentro del bloque: **ORIGINAL** (creador + ratio si es referencia) a la izquierda, **EL MÍO** (cuenta) a la derecha.
- El "original" es el texto de la referencia tal cual; si está en inglés, va en inglés (no se traduce en la comparativa). El mío, el que entrego.
- **SOLO EL TEXTO del post (hook, cuerpo, spam ninja, cierre). NADA de la imagen** (Iker, 2026-07-23). La comparativa es para ver cómo se robó la esencia del TEXTO; el concepto de imagen va en su prompt aparte, no en la tabla. Nada de una fila `IMAGEN:`.
- **TEXTO VERBATIM, línea a línea, NO troceado en secciones** (Iker, 2026-07-23). Se pega el texto real del post tal cual (el original en su columna, el mío en la suya), envuelto al ancho. **NADA de etiquetar `HOOK:` / `CUERPO:` / `CIERRE:`** ni resumir cada parte: eso es mi lectura del post, no el post. Si el original es muy largo (essay), se pega su parte comparable y se avisa en una línea de que sigue.
- **Cómo generarlo sin errores de alineación:** con un script que hace word-wrap de cada columna a su ancho (izq ~34, der ~52) y hace zip fila a fila, rellenando la izquierda con `padEnd`. La derecha va la última, así que un emoji ahí no descuadra nada. (El bloque de `node -e` que se usó el 2026-07-22 sirve de plantilla.)

**El esqueleto, para no volver a fallar (Iker, 2026-07-23: lo entregué apilado OTRA VEZ):**
```
✅ BIEN — UN bloque, dos columnas    │ ❌ MAL — dos bloques apilados
ORIGINAL — creador (ratio) │ EL MÍO   │  ``` bloque 1: original ```
Hook: …                    │ Hook: …  │  ``` bloque 2: el mío  ```
Cuerpo: …                  │ Cuerpo: … │  (esto es lo que NO se hace)
```
La columna izquierda y la derecha comparten CADA fila. Si entregas dos ```bloques``` seguidos, está MAL aunque el contenido sea idéntico. Un solo bloque, un separador `│` por línea.

Esto es la vista que pidió el 2026-07-22, tras rechazar dos intentos: uno "super feo" y otro en bloques apilados. Lo quiere en columnas lado a lado, monoespaciado, ni tabla ni apilado. **Reincidí el 2026-07-23 (dos bloques): por eso el esqueleto de arriba.**


## 🔮🔮 1e-PREDICCION · TODA ENTREGA CIERRA CON "PREDICCIÓN DE VIRALIDAD" (Iker, 2026-08-25)

> **Iker, y dice para qué la quiere, que es lo que decide cómo se escribe:** *"quiero que al final del todo me añadas un bloque con bullet points muy sencillos… que me expliques por qué has decidido elegir esta referencia y cómo has decidido copiarla y mejorarla, y qué tienes validado en datos de que vaya a ser viral. Con tu decisión sabré si te has equivocado o no"*.

**Para qué existe: para que Iker pueda auditar mi CRITERIO sin releerse la entrega entera.** El validador comprueba la mecánica y la comparativa enseña el texto; esto enseña **la decisión**. Si la predicción no se sostiene, el post está mal aunque el script dé 49/49.

**DÓNDE VA: la última sección del mensaje, después de todo lo demás.** Se titula **`🔮 PREDICCIÓN DE VIRALIDAD`**.

**LA FORMA, y es lo que la hace útil (si se alarga, deja de leerse):**
- **⛔ TRES BULLETS. Cinco es el techo absoluto y con cinco ya sobra.** Iker, viendo la primera versión de ocho: *"me parece excesiva… máximo cinco, aún así me parecería mucho, máximo tres"*.
- **Cada bullet, DOS LÍNEAS COMO MÁXIMO.** Si solo hay una cosa que decir, un único bullet de dos líneas y ya.
- **⛔ SE CONDENSAN VARIAS IDEAS EN UN BULLET. Nunca un bullet por idea**, que es lo que hizo que la primera versión se fuera a ocho: *"condensa varias ideas en un solo bullet point"*. Un bullet = una de las tres preguntas de abajo, entera, no un trozo.
- **Sin tablas, sin sub-bullets y sin bloques cercados.** Es lo contrario del resto de la entrega: aquí se resume, no se documenta.
- **Cada bullet lleva su número dentro.** Un bullet sin cifra es una opinión, y de opiniones ya va lleno el resto del mensaje.

**LAS TRES PREGUNTAS QUE CONTESTA, y son exactamente los tres bullets, en este orden:**
1. **Por qué ESA referencia** y no otra, **con las descartadas dentro del mismo bullet**: qué la separa, con su métrica (risas absolutas, reposts, encaje de carril).
2. **Qué me llevo intacto y en qué lo he mejorado**, las dos cosas en el mismo bullet.
3. **Qué está VALIDADO en datos** de que reparte —las reglas que cumple con su número medido, no las que cumple "porque lo dice la receta"— **y, pegada al final, la razón para que NO funcione.**

**⚠️ La razón en contra NO ocupa bullet propio: va rematando el tercero.** La sección se llama predicción, no argumentario: una que solo diga cosas buenas no sirve para detectar que me he equivocado, que es justo para lo que la pidió. Pero tampoco se lleva un bullet de los tres.

**⛔ ÁMBITO: TODOS LOS PILARES, SIN EXCEPCIÓN (Iker, 2026-08-25, ampliado el mismo día).** Nació pedida para el meme y él la subió a receta global en cuanto la vio: *"quiero que este output se incluya, a partir de ahora, en todo, o sea, que sea parte de la receta global, y no solo para el pilar de meme"*. Mapa, "Los 10", despiece, lead magnet, historia, evento, tarjeta, vídeo y lo que venga.
- **En los pilares SIN referencia externa** (mapa, "Los 10", despiece), la pregunta 1 cambia de objeto pero no desaparece: **por qué ESTA región, ESTE sector o ESTE ángulo** y no otro, con su dato — cobertura de la cuenta, cifra shock verificada, empresas que salen.
- **En EMAIL vale igual** (`email-marketing`), cambiando "viral" por lo que mide ese canal: aperturas y clics.
- **Es un caso de libro de `§0c-BIS`:** una regla de ENTREGA no vive en el runbook de un pilar. Por eso está aquí y no en `post-workflow §4.4`.

## 2 · Valida de forma proactiva (no esperes a que pregunte)

- Antes de entregar cualquier borrador, corre en silencio el **pase de validación** contra toda la stack de reglas (`global-instructions`, `brand-voice`, mecánicas, RECENT_DIAGNOSIS, datos de la cuenta).
- **Dos salidas:**
  - **Fix silencioso** (violación clara y trivial: markdown dentro, preámbulo prohibido en la línea 2, 2+ cifras en el hook, frases paralelas pegadas con puntos, opener genérico, etc.) → arréglalo dentro de tu razonamiento antes de que lo vea. No hace falta mencionarlo.
  - **Riesgo significativo** (el post va a rendir regular aunque lo arregles: meme que solo pasa 2/4 del filtro, mapa en región baneada, lead magnet dentro de la ventana de fatiga, arquetipo que ya flopeó, hook solo legible por un SDR muy técnico) → **avísame ANTES o junto al borrador**, con razón concreta y datos: *"Antes de entregártelo: esto va a ir regular porque [Madrid ya falló a 0.55x / es el 4º lead magnet en 10 días / al meme le falta cambio corporal en la imagen]. ¿Lo retocamos o pruebo otra mecánica?"*
  - **🚨 SEÑAL LEGAL — TERCERA SALIDA, Y NO SE PREGUNTA (Iker, 2026-08-20).** Si una palabra o una frase puede leerse como que hacemos algo **ilegal o peligroso con datos o conversaciones de otros**, **no me la entregas y no me consultas**: la **sustituyes por un sinónimo igual de punchy** y me das el post ya limpio. Iker: *"no la tienes ni que avisar directamente, me tienes que dar un sinónimo, que sea igual de punchy, pero que no pueda percibirse que es ilegal"*.
    - **Vale aunque NO esté comprobada al 100%.** Aquí no se pide certeza: el recambio no cuesta nada y el capado cuesta el post entero (19/08: **133 impresiones**).
    - **⚠️ Y EL SINÓNIMO PASA POR LA ESCALERA DE `global §2.9` COMO CUALQUIER VERBO.** Esta regla protege el post de LinkedIn; **no es permiso para lijarlo**. Si el recambio es más flojo que el original, no has terminado: busca otro. `transcribo` → `apunto` mantuvo el ritmo y el post voló; `transcribo` → *"documento el contenido de la conversación"* habría sido peor que el capado.
    - **En la entrega va UNA línea fuera del bloque** diciendo qué cambié y por qué — no es un aviso ni una pregunta, es el registro para que la familia crezca con casos reales.
    - **El test y la familia 7 entera, en `brand-voice §2c`. Y NO es una lista negra**: lo que dispara es la RECLAMACIÓN en primera persona, no la palabra.
- **No esperes a que pregunte "¿esto va a funcionar?"** — esa pregunta es TU trabajo responderla antes de que la haga, en cada iteración.
- Si te digo explícitamente "no me valides / no me critiques / dame lo que sea" → sáltate el aviso de riesgo, pero **nunca** el fix silencioso (esas son reglas mecánicas, no opiniones).

### La trampa de la edición parcial
Cuando acoto la petición a un trozo ("no toques el hook, mejora el cuerpo", "solo el cierre", "edición conservadora") **NO** es permiso para saltarte la validación en lo que no toco. El pase corre sobre el post ENTERO en cada iteración. "No toques X" ≠ "X está aprobado". Si auditando lo intacto encuentras un riesgo significativo, señálalo igual: *"Toqué solo lo que pediste, pero auditando el resto: [bloque] infringe [regla]. ¿Te lo arreglo de paso?"*

---

## 3 · Avisar antes de ciertos formatos

- **Posts de evento / premio / reconocimiento:** avísame ANTES de crear que rinden bajo en alcance (0.2x–0.8x) y que es NORMAL — el objetivo es **autoridad** como founders/empresa, no viralidad. Confírmalo conmigo con esa expectativa clara antes de escribir.
- **🌴 PELOTEO EN AGOSTO (mapa / "Los 10" / despiece) — aviso obligatorio este mes (Iker, 2026-08-14):** avísame ANTES de escribir nada de que en agosto ese pilar es tiempo perdido, y con el motivo concreto: **su motor son los mencionados**, y en España están de vacaciones, así que la notificación no la abre nadie y el post no reparte (precedente: mapa de Cataluña de Unai, **0.59x / 3.018 imp**, porque las empresas nos ignoraron). Ofrece **dejarlo preparado para septiembre** y proponme meme / lead magnet / historia en su lugar. **No es un veto:** si confirmo, se escribe entero. Receta completa en `post-workflow §8.0-AGOSTO`; caduca el 31/08.
- **Post sobre versión nueva de Claude / modelo IA:** empújame para atrás (0.88x, 0.25x, dos flops). Propón reformular como "el resultado en términos de la audiencia" (reuniones, replies, horas ahorradas).
- **Infografía:** avísame que van 0-de-3 (incluida una bien hecha). Ofrece alternativas validadas primero.
- **Lead magnet:** ⚠️ **ya NO hay puerta de frecuencia** (revisado 2026-07-14 contra la BD: Iker sacó dos en días consecutivos, 0.59x y 8.52x). Lo que se comprueba en voz alta es el **ÁNGULO**: ¿se parece al del último de esa cuenta? ¿repite la palabra del CTA? ¿es el entregable genérico "todo en una caja", que está muerto? Ver `global-instructions §4.4`.

---

## 4 · Reescritura y sorpresa (tic a evitar)

Este es un tema importante para mí: **quiero seguir sorprendiendo al lector**. No me des siempre las mismas frases.

> **🔄 Y el alcance de "no repetir" es siempre el mismo (Iker, 2026-09-16, `global §2.0b-VENTANA`):** no se repite en las **3 publicaciones siguientes de esa misma cuenta**; después vuelve a valer. **Por cuenta, con caducidad, y los clichés de una región nunca se bloquean.** Ningún "nunca" de esta lista significa "para siempre".

- **Reescribe bastante las expresiones** en cada post nuevo (sobre todo en mapas y "Los 10"): mismos conceptos estructurales, **palabras y ángulos distintos** cada vez.
- **Varía el arranque de los bloques.** No empieces siempre los bloques de 3 por "No…". Rota: unos empiezan por verbo, otros por nombre, otros por lugar, otros por número.
- **No repitas frases-comodín** entre posts. Ejemplo concreto que quiero eliminar: "La gente y las empresas que mueven todo esto:" — dilo distinto cada vez.
- **Varía los CTA de cierre.** Nunca dos posts seguidos con el mismo cierre. (Y ojo: en mapas ya **no** pedimos "comenta tu empresa" como cierre principal — el objetivo ahora es que entren al link de agendar en spam ninja.)

---

## 5 · Reglas operativas que espero que apliques solo

- **Bloques de empresas: RELLÉNALOS con empresas reales verificadas** (política nueva, ver `post-workflow §4.0`) — de la fuente que te pase o de web con cita, marcando las dudosas y sin inventar (lo no verificable va como `→ [PENDIENTE · no verificado]`). Yo doy el visto bueno final. Formato: 20 líneas en 5 bloques de 4, con `→ @Empresa - @Persona` (arroba delante de ambos y nombres exactos de LinkedIn, para que al clicar salte el autocompletado).
- **Verificar cifras de mapa antes de dibujar el cuerpo.** Lista las cifras shock (exportación €, ranking, puerto, habitantes) y dime qué fuentes hay que verificar (ICEX, autoridad portuaria, INE, Eurostat, IDESCAT/EUSTAT/IECA). No entregues cuerpo con números sin verificar — un dato mal me tira el mapa de 6x a 0.5x.
- **Triage de menciones @** por actividad real en LinkedIn (no por cargo): descartar dormidos >3 meses aunque sean el CEO de la región.
- **Link de agendar en spam ninja** en TODOS los pilares menos el lead magnet (no el link del mapa de pampam). Máx 2 líneas cortas, sin nombrar a Neety, girando el concepto del hook con verbo punchy. Reglas: `global-instructions §4.4b`.
- **Modo texto / vídeo:** si digo "modo texto" o "modo vídeo" respétalo como sticky hasta que diga lo contrario.

---

## 6 · Estilo de interacción que prefiero

- **Directo y accionable.** Dame contenido listo para pegar, no consejos vagos.
- **Cuando decidas por mí,** dime qué elegiste y por qué en una línea, y sigue. No me hagas un catálogo de opciones que no vas a tomar.
- **Escribe en el idioma en que te escribo** (normalmente español).
- **Tag de viralidad obligatorio** en cada opción: `🔥 ~{ratio}x vs. media · {arquetipo} (n={count} outliers reales)`, con números SOLO de los datos reales de arquetipos. Si el arquetipo no tiene histórico suficiente, dilo, no inventes número.

---

## 7 · Huecos / cosas que me puedes preguntar

- [x] Canal de entrega: **el chat de Claude Code**, y los entregables grandes (CSV, ZIP, fotos) al Escritorio. Decidido 2026-07-14.
- [ ] ¿Hay días/horas de publicación fijos por cuenta que quieras que asuma? (el sistema sugiere martes-jueves, 11:00-12:00 y 14:00-15:00 hora local).
- [ ] ¿Quieres que lleve yo el control de qué formato tocó a cada cuenta cada día (para la regla de exclusividad) o me lo dices tú en cada sesión?

## Aprendizaje 2026-08-20 — verificar frontend sin backend local

No hay Postgres local ni `.env` de backend, asi que un panel nuevo no se puede
probar contra datos reales antes de desplegar. Lo que SI funciona, y es lo que se
usa desde ahora en cualquier cambio de panel:

Un banco de pruebas temporal: `frontend/src/__sandbox_<algo>.tsx` + su
`__sandbox_<algo>.html` en la raiz de `frontend/` (copia de `index.html` con el
script cambiado), que sustituye `window.fetch` por respuestas simuladas y monta
el componente de verdad. Con eso se comprueba lo que un typecheck no ve: que un
boton dispara la llamada correcta, contra el id correcto, y cuantas llamadas
salen al abrir. Se borra al terminar y NO se commitea.

Dos trampas:
- El banco tiene que hacer `import './App'`. Tailwind descubre las clases por el
  grafo de modulos en dev, y con solo el componente la mitad de la paleta no se
  genera: el badge sale gris y parece un bug del codigo.
- Con el panel del navegador oculto, Chrome no recalcula estilos de nodos que ya
  existian: `getComputedStyle` devuelve el estilo del PRIMER render. Un clon del
  mismo nodo si sale bien. Verificar comportamiento por DOM, no colores por
  computed style.

## Aprendizaje 2026-08-21 — un contador y su lista no pueden vivir en dos sitios

La chapa «10 para actuar» de la fila plegada la calcula el BACKEND (no ha leido
los comentarios todavia) y la lista de tarjetas la calcula el FRONTEND (que si
los ha leido). Son dos implementaciones de la misma regla, y divergieron en
cuanto se toco una: la chapa decia 10 y debajo aparecia 1.

Las tres formas en que divergieron, y valen como lista de comprobacion para
cualquier contador nuevo sobre `lead_magnet_sends`:

1. **Los `kind` que no miras.** Solo se miraba `dm`/`inmail`. Una fila `invite`
   cuya nota llevaba el enlace ES una entrega, y no genera fila `dm`.
2. **`provider_id` NO es estable.** LinkedIn devuelve otro cuando la persona
   pasa a 1er grado. Todo cruce contra un envio guardado tiene que preguntar
   tambien por `comment_social_id`, que no cambia nunca. Esto ya estaba escrito
   en el panel desde el 23/07 y aun asi se repitio en el contador nuevo.
3. **Trabajo hecho fuera de la herramienta.** Una respuesta enviada desde
   LinkedIn a mano, o desde otra pestana, no deja fila `ask`. Preguntarle al
   HECHO (`answered_by_author`) y no solo al registro propio.
4. **El `status` de la fila.** Un `invite` o un `ask` en `failed` NO gobierna
   nada: ni `/followups` ni `/pendientes-solicitud` los listan (los dos exigen
   `status='sent'`). Un filtro que mire solo el `kind` esconde a esa persona de
   la herramienta ENTERA: la tarjeta le dice "ya esta en marcha arriba" y arriba
   no esta. Medido el 21/08 en el post de Unai del 12/08: 9 invitaciones y 1 ask
   en `failed` del dia del baneo de invitaciones, y DOS de esas personas eran de
   1er grado —recursos que se podian mandar ya y llevaban 9 dias escondidos—.

**Y para depurar esto NO hay que adivinar: el backend de produccion se puede
consultar.** `https://linkedin-post-analyzer-production.up.railway.app` con
`APP_BASIC_USER`/`APP_BASIC_PASS` responde 200 (verificado 2026-08-21; el
`outliers-database.md §` que decia que estaba bloqueado por egress ya no aplica).
Con `/api/accounts/lead-magnet/sends?post_id=` y `/api/accounts/posts/:id/comments`
se reproduce el caso exacto y se simulan las dos reglas en un script antes de
tocar una linea. Asi se paso de "creo que es X" a "son 9 invitaciones fallidas y
estas son las dos personas".

Regla: si la misma decision se calcula en dos sitios, cada uno lleva un aviso
cruzado nombrando al otro. Sin eso, el siguiente cambio rompe el par otra vez.

## Aprendizaje 2026-08-25 — al QUITAR un filtro, busca quien vivia de el

Tercer caso de la misma familia que los dos de arriba, y el mas dificil de ver
porque aqui **el cambio que rompio las cosas era correcto**.

`extractSector` nacio el 22/07 con una precondicion implicita: la lista de
comentarios estaba FILTRADA por la palabra clave, asi que todo lo que le llegaba
era una peticion del recurso, y "quitale la palabra y el relleno, lo que quede
es el sector" funcionaba. El 11/08 se quito ese filtro **con razon** (con el
gate muerto nadie escribe la palabra y filtrar dejaba la lista vacia con 400
comentarios debajo). Nadie miro quien dependia de la garantia que acababa de
desaparecer, y desde ese dia a quien NO pedia nada se le extraia el comentario
entero como "sector".

**La regla: cuando quites un filtro, un guard o una validacion de entrada,
busca a los consumidores de lo que ese filtro GARANTIZABA.** Un `grep` de la
funcion que se alimentaba de ahi basta. El diff del cambio no lo enseña: lo que
se rompe no es lo que tocas, es lo que confiaba en ello.

- **El sintoma tipico es un valor absurdo, no un error.** No peta, no da 500, no
  sale en el typecheck: devuelve basura con la forma correcta. Aqui, un `string`
  perfectamente valido que era medio comentario.
- **Y se dimensiona antes de arreglar, con datos reales.** En el post de la
  lista del 22/07: 15 de 18 comentarios llevaban la palabra y daban un sector de
  verdad; los 3 que no la llevaban eran EXACTAMENTE los tres que no pedian nada.
  Un corte de 15/3 limpio es lo que convierte una corazonada en una regla.
- **Y se mira si el bug dejo datos sucios**, no solo si la pantalla ya se ve
  bien: aqui se comprobo que ninguna fila de `lead_magnet_sends` tenia sector
  guardado, o sea que el daño no habia pasado de la UI. Si los hubiera tenido,
  el arreglo incluye limpiarlos.
