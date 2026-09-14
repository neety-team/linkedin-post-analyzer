# SKILL: outliers-database — El análisis de outliers (arquetipos, hooks, patrones)

> **name:** outliers-database
> **description:** Los datos vivos de qué está funcionando: arquetipos con sus ratios reales, top hooks, patrones de lenguaje y formato, timing, y el contenido viral de las cuentas que trackeamos en la herramienta (Dashboard). Es la evidencia empírica sobre la que se apoya `global-instructions`.
> **when-to-use:** Cargar cuando necesites justificar una elección con datos reales (el tag de viralidad `🔥 ~Nx · arquetipo`), elegir arquetipo para una idea, o diagnosticar por qué algo funcionó/flopeó. Los números concretos se rellenan a mano desde el Dashboard (ver §5).

---

## 0 · IMPORTANTE — cómo se alimenta esta skill

> ✅ **Estado 2026-07-13:** el backend de **Railway YA es accesible** desde el entorno (antes daba 403). Ahora se puede consultar en vivo por HTTPS con auth básica. §3 (Explorer) y §4 (histórico + split por cuenta) se pueden **refrescar solos** desde la API — ya no hace falta pegar PDFs a mano.

El análisis real de outliers se calcula en vivo desde la base de datos (sección **Dashboard / Explorer**). Acceso directo por HTTPS (auth básica, usuario `Neety`):
- `GET /api/creators` — lista de las 149 cuentas trackeadas (managed + referencia).
- `GET /api/analysis/{id}/stats` — stats por cuenta: hook_type_breakdown, structure_breakdown, content_type, timing_heatmap, best_timing_slots (base del split por cuenta, §4).
- `GET /api/analysis/cross-creators` — análisis cross-creator (base de §3).
- `GET /api/analysis/{id}/export`, `/patterns`, `/timeline`, `/compare` — detalle fino.
- IDs managed: Iker `3d545376-057c-48db-8b45-c5c5510110bb` · Unai `88d272b7-0f93-49cf-bac1-1334965f361d` · Asier `89610120-758c-4d25-8353-76c1147e0f0c`.

**Para refrescar:** consulta esos endpoints y vuelca los números a §3/§4 (los ratios decaen; refresca cada 1-2 meses). Si el acceso vuelve a caer, la vía manual de siempre (pegar el export del Explorer) sigue valiendo.

**⭐ Cómo se DESCUBREN creators nuevos para la BD (validado 2026-07-27, tanda de marketing/marca personal):**
1. **Añadirlos es gratis y automático:** `POST /api/creators` con `{"linkedin_url": "..."}` — el backend saca el perfil por Unipile, scrapea su histórico de posts y calcula outliers solo. Apify solo hace falta para DESCUBRIR quién añadir.
2. **La búsqueda por keyword NO funciona para España:** el actor de Apify `harvestapi/linkedin-post-search` (pago por resultado, ~0,002$/post, sin suscripción) con queries en español devolvió 2/400 posts en español. No repetir esa vía.
3. **La vía que SÍ funciona — el ecosistema de un creator semilla:** con un creator bueno ya localizado (ej. Miriam Collado), pedir al actor los posts que le MENCIONAN (`mentioningMember`, ventana 3 meses). De ahí salen dos listas de oro: los AUTORES de posts virales que le mencionan, y los CO-ETIQUETADOS recurrentes (los "7 creadores a seguir" — quien sale etiquetado 10+ veces junto a la semilla es del mismo ecosistema y nivel).
4. Filtrar: español, nicho correcto (fuera sectores ajenos aunque sean virales), no estar ya en la BD, y persona (no empresa). Añadir la shortlist y dejar que el cálculo de outliers de la propia BD sea el juez final.
5. **Ser muy co-etiquetado mide popularidad en el gremio, NO viralidad.** Caso real: Ana Díaz del Río salía 10 veces co-etiquetada con Miriam y tenía 922 posts con **0 outliers** y engagement medio 3. Se borró.

**⭐ PODA — cómo limpiar cuentas que solo hacen ruido (Iker, 2026-07-27):**
Un `total_outliers = 0` NO significa lo mismo en todas. Antes de borrar, mira SIEMPRE el engagement medio junto al número de posts:
- **BORRAR — plana de verdad:** muestra grande (20+ posts) **y** media baja. Nunca despega y ensucia los filtros de Inspiration. (Borradas el 2026-07-27: Ana Díaz del Río 922p/avg 3 · Ryan Brancheau 105p/avg 29 · Elliott Azoulay 81p/avg 162 · Jaume Iglesias 23p/avg 54 · Dhruvi S. 22p/avg 47.)
- **BORRAR — perfil duplicado:** la misma persona metida dos veces; se queda el que tiene histórico y outliers. (Borrados: el clon de Kevin French con 1 post y el de Adam Ali con 9.)
- **🚫 NO BORRAR — falso negativo del método:** cuentas con **media estratosférica** (Adam Grant avg 15.509 · Jasmin Alić 5.486 · Lara Acosta 3.089). El outlier es relativo a SU media (≥3x), así que quien es viral SIEMPRE nunca marca 3x sobre sí mismo: su media ya es un outlier del sector. Son swipe material de élite; borrarlas sería el peor error de la limpieza.
- **🚫 NO BORRAR — muestra insuficiente:** menos de ~15 posts scrapeados. No hay datos para juzgar; re-scrapea antes de sentenciar.

**Recordatorio del cálculo (auditado 2026-07-27):** el outlier se computa sobre el **histórico COMPLETO** del creator, sin ninguna ventana de 6 meses ni de ningún tipo (`backend/src/services/outliers.ts`). Dashboard/descubiertos: `≥3x su media` **y** `≥200 de engagement absoluto`. Cuentas managed con impresiones reales: híbrido `MAX(ratio engagement, ratio impresiones) ≥ 3x`, sin suelo absoluto.

Usa el **snapshot cross-creator** (§3), la **taxonomía** (§1) y el **histórico Neety** (§4). Los ratios cambian con cada scrape: trátalos como órdenes de magnitud, no como cifras exactas, hasta refrescar.

---

## ⛔⛔ 0b · UN 0 DE CLICS NO ES UN CERO: ES UN HUECO (Mario, 2026-09-14)

**El caso que lo prueba, y se cerró cruzando dos fuentes:** el mapa de Cantabria de Asier (01/09, 13.021 impresiones, con su enlace a `recursos.neety.com/mapas/cantabria/` en el cuerpo).

```
Panel de LinkedIn ...... "Visits to links from this post"  =  0
GA4, misma ventana ..... /mapas/cantabria/  =  27 vistas, 21 usuarios activos
```

**El 0 lo sirve LinkedIn y nosotros lo copiamos fiel. Pero es falso.**

> **LA REGLA: si un post tiene enlace, tuvo alcance normal y no fue bloqueado, el número de clics NUNCA es cero.** Cuando `link_clicks_count` venga a 0 (o la interfaz no enseñe número), la lectura por defecto es **medición perdida**, no post que no convirtió.

**Cómo se reconoce el hueco:** cuando LinkedIn marca 0 **no pinta la URL al lado**, así que en la BD queda `link_url` vacío junto a un `link_clicks_count` de 0 o `NULL`. **`link_url` vacío + enlace presente en el cuerpo = medición perdida.** Le pasa sobre todo a posts largos (el mapa son 2.017 caracteres) y a los que llevan más de un enlace.

**⛔ PROHIBIDO EN UNA ENTREGA:**
1. Decir que un post "no convirtió" apoyándose en un hueco.
2. Meter ese 0 en una media, un CTR o una tabla comparativa.
3. Declarar un pilar flojo con esa cifra dentro.

**Lo que se hace en su lugar:** se marca como **no medido**, se dice que el dato lo perdió LinkedIn, y si hace falta el número se pide por **GA4 cruzando el UTM** (`global §4.4b-UTM`): `Informes → Interacción → Páginas y pantallas` para el total de la página, y `Campaña de la sesión` en Adquisición de tráfico para atribuirlo al post. **Ojo: GA4 también se queda corto** si el visitante no acepta el banner de cookies, así que GA4 por encima de 0 demuestra que LinkedIn se equivoca, pero un 0 en GA4 no demuestra lo contrario.

**⭐ Y ESTO NO TUMBA EL CONTADOR DE LINKEDIN, SOLO EL CERO (Mario, 2026-09-14).** *"Es la única métrica a la que nos podemos agarrar en nuestro dashboard, y no siempre se equivoca. Desde que empezamos a medir los clics y el CTR hemos descubierto qué pilares convierten más y hasta cosas de formateado, como que poner enlaces en líneas individuales convertía muchísimo peor."* **Las cifras distintas de cero se siguen usando con normalidad.** La regla es sobre el cero.

**El único caso en que un cero SÍ es un cero:** que el post fuera bloqueado o no tuviera impresiones. Se distingue mirando el alcance — un bloqueado se ve como la historia de Unai del 02/09, con **18 impresiones**, no con 13.021.

## 1 · Taxonomía (el vocabulario del análisis)

La herramienta clasifica cada post por **hook_type × post_structure × tone**. Estas son las etiquetas canónicas — úsalas al referirte a arquetipos.

### Tipos de hook (hook_type)
| clave | etiqueta |
|---|---|
| pattern_interrupt | Ruptura de patrón |
| belief_breaker | Rompe creencias |
| curiosity_gap | Intriga |
| data_shock | Dato impactante |
| hot_take | Opinión polémica |
| personal_confession | Confesión personal |
| story_opener | Apertura narrativa |
| hypothetical_question | Pregunta hipotética |
| why_question | Pregunta "por qué" |
| how_question | Pregunta "cómo" |
| direct_question | Pregunta directa |
| bold_claim | Afirmación audaz |
| common_mistake | Error frecuente |
| direct_callout | Llamada directa |
| list_promise | Promesa de lista |
| contrarian_take | Contrarian |
| relatable_moment | Momento relatable |
| motivational | Motivacional |
| observation | Observación |

### Estructuras (post_structure)
| clave | etiqueta |
|---|---|
| hook_list_cta | Hook → Lista → CTA |
| hook_story_lesson_cta | Historia → Lección → CTA |
| problem_agitate_solve | Problema → Agitación → Solución |
| contrarian_proof_reframe | Contrarian → Prueba → Reencuadre |
| confession_insight_takeaway | Confesión → Insight → Conclusión |
| list_framework | Framework en lista |
| problem_solution | Problema → Solución |
| story_lesson | Historia → Lección |
| before_after | Antes / Después |
| step_by_step | Paso a paso |
| myth_busting | Desmontando mitos |
| short_punchy | Corto e impactante |
| long_form_essay | Ensayo largo |
| data_driven | Basado en datos |

### Definición de outlier
Un post es **outlier** cuando supera **≥3x** el engagement promedio de su autor. El **outlier ratio** (cuánto sobre-rinde vs la media del autor) es la métrica clave, **no** el engagement bruto.

---

## 2 · Cómo se usa el arquetipo al escribir

- **Tag de viralidad obligatorio** en cada opción: `🔥 ~{ratio}x vs. media · {arquetipo} (n={count} outliers reales)`. El número prioriza el **histórico Neety** (§4, cuentas propias). Nunca inventes ratio. Si el arquetipo no tiene histórico Neety suficiente: `🔥 arquetipo sin histórico suficiente en tus datos` (sin número) — y, si quieres respaldarlo, cita el ratio **cross-creator** de §3 dejando claro que es de *todos los creadores analizados*, no de la cuenta: p. ej. `🔥 sin histórico propio · recipe cross-creator ~6.7x`.
- ⚠️ **§3 (cross-creator) ≠ §4 (Neety).** Los ratios de §3 salen de los 1.893 outliers de TODAS las cuentas trackeadas (competencia + referentes globales), no de Iker/Unai/Asier. Son **priors direccionales** (qué combinación hook×estructura×tono tiende a viajar), no la cifra de tu cuenta. Para el tag propio manda §4.
- Elige arquetipos genuinamente distintos entre las 2-3 variantes para poder comparar.
- La voz (`brand-voice`) es el CÓMO; el arquetipo/estructura es el QUÉ y sale de aquí. Si hay conflicto, mandan estos datos.

---

## 3 · Análisis cross-creator del Explorer (snapshot 2026-07-09)

> Destilado del export completo del **Outlier Explorer** ("explorer completo.pdf", en `docs/`). Muestra: **~1.894 outliers** de TODAS las cuentas analizadas (competencia + referentes globales + las cuentas Neety), con los **500 top** desglosados por formato. **Población distinta de §4** (que es solo Neety). Trátalo como el mapa cross-creator de qué combinaciones viajan; para el ratio de TU cuenta manda §4. Los números son de este scrape — órdenes de magnitud, no verdad eterna.
> ✅ **Verificado en vivo contra Railway (`/api/analysis/cross-creators`) el 2026-07-13:** las distribuciones coinciden con este snapshot (1.894 vs 1.893 outliers, mismas distros de hook/estructura, empatía 7.63x vs 7.75x). El snapshot está vigente; refrescar cada 1-2 meses desde ese endpoint.

### 3.1 · Qué tienen en común los top outliers (retrato agregado)
- **1.893 outliers** · media **178 palabras** · **CTA en 36%** · formato top = **texto + imagen**.
- El outlier medio: **60% hooks "Other"** (fuera de plantilla clásica), **40% estructura "Narrative Arc"**, **~171 palabras**, publicado un **jueves** (40% del top).
- **Solo 11% son de tono neutro** → el disparador emocional/psicológico es casi obligatorio.
- **Los dos motores dominantes** (etiqueta "Why did this work?" sobre los top): **Controversy (254)** y **Social Currency (139)**, muy por encima de Belonging (58), Aspiration (15), Utility (14), Emotion (12), Identity (8). Traducción operativa: o **divides** (postura fuerte que obliga a tomar bando) o das **moneda social** (algo que al compartirlo hace quedar bien/listo al que repostea). Lo demás es cola.

### 3.2 · Hook types en outliers (distribución real)
`Other 48%` · `Bold Claim 12%` · `Story Opener 9%` · `Curiosity Gap 8%` · `Data Shock 7%` · `Rhetorical Q 5%` · `List Promise 3%` · `Announcement 2%` · `Direct Callout 2%` · `How-To 1%` · `Pattern Interrupt 1%` · `Relatable 1%` · `Hot Take 1%`.
> Lectura: casi la mitad NO encaja en una etiqueta de plantilla ("Other") — los mejores hooks son idiosincráticos, no fórmula enlatada. De los etiquetables, **Bold Claim** manda, seguido de apertura narrativa e intriga.

### 3.3 · Post structure en outliers
`Narrative Arc 23%` · `Short & Punchy 12%` · `Other 12%` · `List/Framework 10%` · `Hook→List→CTA 6%` · `Problem→Solution 5%` · `Before/After 4%` · `Long-form 4%` · `Data-Driven 4%` · `Comparison 3%` · `Question→Answer 3%` · `Myth Busting 3%` · `Content+CTA 3%` · `Story→Lesson 3%` · `Contrarian→Proof 2%` · `Step-by-Step 2%`.
> Lectura: **arco narrativo** (setup→tensión→resolución) es la estructura más frecuente entre outliers, pero conviven con el **corto e impactante**. No hay UNA estructura ganadora; hay dos polos (historia larga vs dardo).

### 3.4 · Tono × outlier ratio (ranking — el tono que MÁS multiplica)
`Empathy 7.63x` · `Social Proof 6.97x` · `Authority 6.78x` · `Provocative 6.69x` · `Educational 6.46x` · `Urgency 6.45x` · `Aspirational 6.45x` · `Vulnerable 6.24x` · `Humorous 5.79x` · `FOMO 4.84x`.
> Empatía ("te entiendo, he estado ahí") es el tono con mayor ratio — encaja de lleno con `brand-voice §6` (atacar el problema, no al lector) y con el eje de "Los 10". FOMO es el que menos viaja.

### 3.5 · Los 10 "Viral Archetypes" (recetas hook × estructura × tono, cross-creator)
Ratios de todas las cuentas; n bajo (2-7 posts) → priors, no leyes.
```
#1  6.74x  List Promise    + Comparison/Versus     + Aspirational   (n=7)  "10 Visuals that will change the way you think."
#2  6.33x  Hot Take        + List/Framework        + Educational    (n=3)  "3 harsh truths I've been thinking about..."
#3  6.06x  Bold Claim      + Content+CTA           + Empathy        (n=3)  "Subir en ventas siempre pasa factura."   ← cuenta Neety
#4  5.73x  Motivational    + Motivational Manifesto+ Educational    (n=2)  "It's never too late to jump."
#5  5.60x  Direct Callout  + Data-Driven           + Authority      (n=4)  "Your title doesn't make you a leader."
#6  4.86x  Pattern Interrupt + Before/After        + Aspirational   (n=3)  "Si sigues usando PowerPoint como hace 5 años, tienes un problema."
#7  4.61x  Personal Confession + Narrative Arc     + Aspirational   (n=4)  "Me despidieron..."
#8  4.55x  Rhetorical Q    + Myth Busting          + Aspirational   (n=3)  "¿Cuántas de estas mentiras de ventas B2B sigues creyendo?"
#9  4.44x  How-To/Framework+ Hook→List→CTA         + Neutral        (n=3)  "How to respond when a prospect says:"
#10 4.40x  Bold Claim      + Hook→List→CTA         + Humorous       (n=3)  "NEVER use GPT for cold emails again…"
```
> Las que mejor encajan con la voz Neety y el nicho B2B: **#3** (Bold Claim + empatía — de hecho una es de la cuenta), **#6** (Pattern Interrupt + antes/después — el ADN del meme con motor A), **#8** (pregunta retórica que desmonta mitos de ventas), **#10** (Bold Claim sobre una herramienta con humor).

### 3.6 · Cómo abren y cierran los outliers
- **Aperturas:** Declarativa **58%** · Corta e impactante **9%** · "Yo" personal **7%** · Pregunta **6%** · Apertura en español **6%** · Número/dato **4%**. → El arranque ganador es una **afirmación declarativa tajante**, no una pregunta ni un windup.
- **Cierres:** Statement (afirmación de cierre) **37%** · Línea de hashtags **18%** · CTA explícita follow/like/share **18%** · Cierre corto **9%** · Posdata P.S. **8%** · Pregunta final **5%**.

### 3.7 · Estilo de escritura y lenguaje (outliers vs normales)
- **Longitud:** 178 vs 157 palabras (+13%). **Frase:** 13.9 vs 13.5 palabras. **Saltos de línea:** 27.8 vs 24.3 (+14% → más aire). **Emojis:** 55% vs 47% (+17%). Hashtags 22% vs 21%. Preguntas 51% en ambos.
- **CONTRAINTUITIVO — los outliers usan MENOS de esto que los posts normales:** lenguaje de **Autoridad/Prueba −25%** (0.3 vs 0.4 /100w), **Urgencia/Escasez −17%**, **"Tú" directo −7%**. → Confirma tres reglas de la stack: la autoridad **se demuestra, no se anuncia** (`brand-voice §1`), la urgencia/countdown no es palanca fuerte, y **no apuntes al lector con "tú"** (`brand-voice §6`). Contraste/Tensión se mantiene igual (2.3/100w) — la tensión sí, el sermón no.

### 3.8 · Formato visual (los 500 top por formato)
`Texto+Foto 60% (n=300, ~13.6x)` · `Texto+Vídeo (n=113, ~13.3x)` · `Texto solo (n=61, ~13.6x)` · `Texto+Doc (n=17, ~11.6x)` · `Texto+Carrusel (n=9, ~11.1x)`.
> Foto domina en volumen, pero **texto solo rinde igual de alto (~13.6x)**: no todo post necesita imagen. Doc y carrusel quedan por debajo (coherente con "infografías 0/3" de la skill `images §7`).

### 3.9 · Timing (confirma y afina §4/§7)
- **Horas por outlier-ratio (señal FUERTE):** `11:00 → 8.21x` (la mejor con diferencia) · `12:00 → 7.10x` · `14:00 → 7.03x` · `09:00 → 6.75x` · `05:00 → 6.66x` · `07:00 → 6.57x` · `15:00 → 6.12x` · `16:00 → 6.02x`. → Refuerza la ventana **11:00-12:00 y 14:00-15:00** ya recomendada; 11:00 es el pico claro.
- **Días (señal DÉBIL):** las tasas por día están todas apretadas ~4.3-4.9% (Sáb 4.9%, Mié 4.6%, Vie 4.6%, Mar 4.5%, Jue 4.5%). No hay un día ganador nítido cross-creator; el "martes" de §4 sigue siendo el prior propio, con miércoles-jueves igual de válidos.

### 3.9b · 🔎 CÓMO CAZAR LEAD MAGNETS EN LA BD (huella dactilar + remix cross-sector)
> Método verificado el 2026-07-14 contra `/api/analysis/cross-creators`. Sirve para encontrar ángulos frescos sin depender de lo que opine un blog.

**La huella dactilar del lead magnet: `comment_like_ratio ≥ 1`.** Un post normal tiene MUCHOS más likes que comentarios (Gipuzkoa: 1.208❤ / 95💬 = **0,08**). Un lead magnet invierte la proporción, porque el comentario es el peaje (vibe prospecting 95❤ / 632💬 = **6,65** · desmonto perfiles 116❤ / 483💬 = **4,16**). **Si comentarios ≈ o > likes, casi seguro que es comment-gated.**

**El filtro de 2 pasos (rinde 83 lead magnets reales de los 500 top):**
1. `comment_like_ratio >= 1.0` → de 500 outliers quedan **105**.
2. De esos, quédate con los que llevan **palabra-puerta explícita en `content_text`** (`comment "X"`, `comenta "X"`, `type "X"`, `drop … below`) → **83 confirmados**.
3. **La prueba definitiva: LEE LOS COMENTARIOS con Unipile.** La BD no los guarda, pero Unipile sí los sirve:
   `GET {UNIPILE_BASE_URL}/api/v1/posts/{linkedin_post_id}/comments?account_id={UNIPILE_ACCOUNT_ID}&limit=50` (cabecera `X-API-KEY`). El campo `linkedin_post_id` viene en cada outlier de `cross-creators`.
   Cuenta la frecuencia de palabras en esos 50 comentarios: **si UNA palabra aparece en ≥50-60% de ellos, es un lead magnet confirmado y esa palabra es la puerta.**
   - **Verificado el 2026-07-14** sobre el nº1 de la BD (Jan van Musscher, 130.2x · 3.508💬 · *"the ultimate outbound cheat sheet"*): la palabra **"sheet" sale en el 90% de los comentarios**. Así de limpio se ve.
   - **Por qué importa:** un post con los comentarios disparados pero **sin palabra dominante NO es un lead magnet, es una polémica** — la gente discute, no paga peaje. Remixarlo como lead magnet es copiar el número sin el mecanismo. Este test los separa.

**⭐ BUSCA EN TODOS LOS SECTORES, no solo en ventas.** Es la parte que más valor da:
- **Un outlier robado de nuestro propio sector sorprende menos**: nuestra audiencia ya lo ha visto. Robado de otro sector, es original aquí aunque allí sea un clásico.
- Lo que se copia **NUNCA es el tema: es la ESENCIA, el porqué funciona**. Se extrae el mecanismo (qué hace que el lector pague el peaje del comentario) y se remixa a ventas B2B.
- Prueba viva: **Guillermo Flor · 22.1x · 5.432💬 / 451❤ (ratio 12,04)** — un playbook de Claude en Excel y PowerPoint. Cero ventas, y es de los mejores ratios comentario/like de toda la BD. Su esencia (la herramienta que ya usas a diario + un playbook de atajos que no conoces) transfiere a ventas sin despeinarse.
- Criterio de orden: **ratio C/L alto × outlier ratio alto × distancia de nuestro sector**. Cuanto más lejos, más original el remix.

### 3.9bis · ¿El lead magnet lleva FOTO? SÍ (medido, 2026-07-14)
> Duda recurrente ("creo que nunca llevaban foto"). **Es al revés, y por mucho.** Medido sobre los 500 top outliers de `cross-creators`.

| | Lleva foto | Solo texto |
|---|---|---|
| **Lead magnets confirmados** (n=83) | **85%** | 7% |
| Resto de outliers (n=417) | 54% | 13% |

- **El lead magnet lleva foto MÁS que ningún otro formato**, no menos. Y los que la llevan promedian **2.217 comentarios frente a 987** de los de solo texto: 2,2× más de la única métrica que le importa a este pilar.
- **PERO el formato NO es la palanca.** En nuestras cuentas el mejor lead magnet es **solo texto** ("vibe prospecting" 9.85x · 632 com.) y el 2º lleva foto (desmonto perfiles 8.52x · 483 com.). Con foto tenemos desde 8.52x hasta 0.21x. Lo que separa un 9.85x de un 0.21x es el ángulo, el mecanismo y el CTA — nunca si había imagen.
- **Conclusión operativa:** la foto se mantiene (es la norma y correlaciona con más comentarios) pero **no le eches horas**: es un selfie natural (`images §3`), no un diseño. Si un post sale sin foto, no lo bloquees por eso.

### 3.9c · 🔁 CÓMO SE REMIXA UN OUTLIER (el método, no el catálogo)
> Destilado de los apuntes internos "APUNTES REMIX OUTLIERS" (Documents/Mario/LINKEDIN GROWTH). Vienen del mundo del vídeo: **traducción a lo nuestro → "título" = HOOK · "miniatura" = IMAGEN**. Aplica a los 4 pilares, no solo al meme.

**La tesis:** coges lo que ya funcionó, **entiendes POR QUÉ funcionó**, y lo transformas en algo original para tu nicho. Copiar sin entender es llevarse el número sin el mecanismo.

**Paso 1 — Despieza el outlier.** Sepáralo en: hook · imagen · idea principal · formato · promesa · nicho/audiencia · curiosidad que genera. Y pregúntate **qué pieza concreta lo hizo funcionar**: ¿el hook? ¿la imagen? ¿el formato? ¿el tema? ¿el ángulo?

**Paso 2 — 🚫 NO te quedes con el tema superficial. Es el error nº1.**
- ❌ "Esto solo sirve para finanzas."
- ✅ "Esto funciona porque usa el formato *si tuviera que empezar de nuevo*."
- El tema es la piel. **La ESTRUCTURA GANADORA es el hueso**, y el hueso viaja entre nichos.

**Paso 3 — Extrae el PATRÓN y adáptalo.** Del patrón base *"Cómo haría 10.000€/mes si tuviera que empezar de nuevo"* salen: cocina → *"…como chef si tuviera que empezar de nuevo"* · gaming → *"Cómo llegaría a Grandmaster desde Bronze"* · fitness → *"Cómo perdería 45 kg si volviera a pesar 225"*. Mismo hueso, cuatro pieles.
Preguntas que hacen el trabajo: **¿cuál es el equivalente de ese resultado en ventas B2B? ¿cuál es el "empezar de nuevo" de un director comercial? ¿qué transformación quiere de verdad? ¿qué versión suena natural aquí y no a traducción?**

**Paso 4 — Busca FORMATOS REPETIBLES, no ideas sueltas.** Si un formato ya ha funcionado en varios nichos distintos, es hueso y transfiere. Formatos conocidos a detectar: *si tuviera que empezar de nuevo* · *1 estrella vs 5 estrellas* · *antes vs después* · *barato vs caro* · *no hagas esto / haz esto* · *probé X durante Y días* · *de principiante a experto* · *el método del top 1%* · *lo que haría diferente si empezara hoy*.

**Paso 5 — Cambia lo superficial, MANTÉN la emoción.** Cambia restaurantes→gimnasios, dinero→habilidad, chef→comercial. **Nunca cambies el motor emocional**: curiosidad, transformación, contraste, reto, prueba social, aspiración, resultado concreto. Si al remixar se pierde la emoción, has copiado la piel.

**Paso 6 — Remixa también la IMAGEN, no solo el hook.** ¿La original usa comparación? ¿contradicción? ¿enseña un resultado visual? ¿crea una pregunta en la cabeza? Adapta ESO. Los ejes de comparación que transfieren: NO/SÍ · antes/después · principiante/pro · mal/bien · normal/top 1%. (Encaja con `images §6` y con el motor A del meme: el wojak 16.56x es exactamente un *antes vs ahora*.)

**Paso 7 — ⭐ EL TEST QUE DECIDE SI EL REMIX ESTÁ TERMINADO: "¿esto solo puede publicarlo una cuenta de VENTAS?"**
Es el paso que más se falla y el que convierte el robo en algo original. Robar el hueso es la mitad del trabajo; **re-anclarlo a NUESTRO sector es la otra mitad**, y sin ella el post no sirve.
- **El peor error posible: que tu post lo pudiera subir cualquier cuenta.** Si el mismo texto vale en una consultora, una agencia o una constructora, has copiado un formato genérico. No es un remix, es un post huérfano.
- **La prueba:** lee el post e imagina que lo publica una cuenta de otro sector. ¿Cuela? → **está sin terminar, vuelve a escribirlo.** Tiene que leerse como algo que **SOLO** es posible en una cuenta de ventas.
- **Por qué importa (no es estética):** el algoritmo de LinkedIn ES la audiencia, no suerte. Si el post no está alineado con lo que le interesa a nuestro ICP, no lo distribuye a quien queremos. Contenido de ventas → audiencia de ventas.
- **Cómo se aterriza:** el vocabulario del post tiene que ser el del oficio — vender, cerrar, cliente, comercial, venta, precio, propuesta, cuota, facturar, exportar. No basta con que el TEMA sea traducible: la piel entera se cambia (`global-instructions §2.3`).
- ⚠️ **Pero NO acotes de más en el hook.** "Ventas B2B", "outbound", "pipeline" o "SDR" estrechan el alcance aunque describan bien al cliente. En el gancho, cuanto más genérico dentro de VENTAS, más lejos llega. La especificidad va en el cuerpo.
- **Ejemplo real (lead magnet de Asier, 2026-07-14):** el hueso del McKinsey Slide Playbook se remixó a *"tu propuesta entra sola en un comité"*. **Falla el test**: eso lo publica igual una consultora. Arreglado a *"Cierras con tu cliente. Y la venta se cae en un comité en el que no conoces a nadie"* → cerrar + cliente + venta = solo posible en una cuenta de ventas. Mismo hueso, misma emoción, ahora sí es nuestro.

**Paso 7b — ⚖️ Se calca la ESENCIA, nunca el formateado.** Si ser fiel a la referencia te obliga a romper nuestras reglas (un parrafazo sin saltos, un guion largo, una coma antes de "y", jerga en el hook), **ganan las nuestras**. Se copia lo que hizo volar al post (gancho, imagen, esqueleto, emoción); no se copia cómo lo tecleó su autor. Tabla completa en `post-workflow §4.4`.

**Paso 8 — El paquete completo:** idea remixada + hook adaptado + imagen adaptada + promesa clara + formato reconocible pero fresco.

**Sanity check antes de entregar (si fallas uno, no lo publiques):**
- ¿Estoy **copiando o transformando**?
- ¿La idea funciona **aunque cambie el nicho**? (Si solo funciona con el tema original, era piel.)
- ¿**No parece** una copia literal?
- ¿Se siente **específico para NUESTRA audiencia**?
- ¿El hook genera curiosidad y la promesa es concreta?
- ¿El formato **ya ha demostrado** funcionar?

### 3.10 · Banco de remix (SOLO top-top relevantes para B2B — no la competencia entera)
> De las ~150 páginas de ejemplos (ordenados de más a menos outlier) **no** copio el catálogo. Aquí van los pocos cuyo MECANISMO transfiere a Neety. Ratio = vs. la media del PROPIO autor (cross-creator). Se calca la mecánica, nunca el texto.

- **130.22x · Jan van Musscher · Controversy** — *"I have created the ultimate outbound cheat sheet: everything outbound sales in one page. Like & comment 'SHEET'…"* → lead magnet comment-gated con **UN entregable concreto y específico** (una hoja, no "toda mi biblia"). Valida `global-instructions §4.4`: el topic pica solo + entregable único.
- **68.51x · Jan van Musscher · Controversy** — *"Our client just booked a sales call with an 82,000-person company… Comment 'cold' for the script."* → **cifra-cliente concreta** como prueba social + puerta de comentario. La cifra específica (82.000) es el gancho, no el genérico "conseguimos reuniones".
- **44.62x · Carlos Martínez · Controversy** — *"España tiene un problema 🇪🇸. Y no, no es falta de talento… el talento se va."* → **identidad + agravio + lista** en clave nacional. Mismo motor que los mapas Neety (identidad que genera rabia/orgullo defensivo), a escala país.
- **37.12x · Hassan Elahi · Social Currency** — *"The SDR role isn't entry-level anymore."* → **reframe que dignifica al comercial**. Es el eje emocional de "Los 10" (§4.2): el que hace el trabajo se siente visto y reposta.
- **35.24x · Ryan Reisert · Controversy** — *"Not enough people are talking about this country… where the future of SDRs live. 99% can't name it. Any guesses?"* → el **"país misterioso"** como curiosity gap + juego de adivinanza en comentarios. Valida externamente la variante "país inventado/trampa" de Unai (7.1x) — arma de ocasión.
- **30.14x · Josh Braun · Controversy** — *"Why most cold emails get ignored. Maybe it's not your writing… Maybe it's your offer."* → **belief_breaker** sobre una creencia de ventas + descarga parcial en la línea 2 (sin preámbulo). Modelo de transición hook→cuerpo de `global-instructions §2.6`.
- **39.01x · Chris Donnelly · Controversy** — *"6 ways to stop your top talent from leaving… ♻️ Repost this."* → listicle de liderazgo con CTA de repost → gama alta de **reposts** (la métrica de mayor palanca).
- **37.42x · Luna Chen · Controversy** — *"Anthropic released how they use Claude for Growth Marketing… Comment 'GROWTH'."* → IA enmarcada por **RESULTADO de negocio** ("conversion 41% above industry avg", "1 persona = un departamento"), no por changelog. Exactamente cómo pide `working-preferences §3` reformular los posts de modelo/IA.

---


## ⭐ 3.16 · LA HORA DE PUBLICAR: LAS 10:00, Y LAS 9:00 ES UN ERROR (medido 2026-07-21)

230 posts de las tres cuentas con hora y `outlier_ratio`:

| Hora | n | Mediana | >2x | >4x | Impresiones (mediana) |
|---|---|---|---|---|---|
| 8:00 | 35 | 0,50 | 1 | 0 | 2.740 |
| 9:00 | 23 | 0,57 | **1** | **0** | 3.332 |
| **10:00** | 36 | **0,78** | **11** | **7** | **5.311** |
| 11:00 | 21 | 0,57 | 4 | 2 | 3.148 |
| 12:00 | 40 | 0,59 | 10 | 7 | 3.760 |
| 13:00 | 29 | 0,47 | 6 | 2 | 3.628 |
| 14-16 | 24 | 0,42 | 4 | — | — |
| 17-19 | 12 | 0,59 | **0** | 0 | — |

**Las 10:00 es la hora.** Mejor mediana y **el doble de impresiones** que cualquier otra franja. De los 18 posts historicos por encima de 4x, **catorce salieron a las 10 o a las 12**.

**🔴 Las 9:00 NO es "casi las 10": rinde como las 8:00.** Una sola publicacion por encima de 2x en 23 intentos, y ninguna por encima de 4x. La explicacion que da Iker encaja con el dato: a las nueve la gente esta llegando, abriendo el correo y entrando a reuniones, no esta en el movil. **La clave es adelantarse al pico de las 11, no madrugar.**

**Segunda opcion: las 12:00.** Peor mediana que las 10, pero mismos siete posts por encima de 4x. Sirve para la segunda cuenta del dia.

**Sobre la tarde, matiz importante:** publicar de tarde **no mata un post** — el 17% de los de 14-16 pasan de 2x, contra el 20-23% de la mañana. **Lo que si mata es la franja 17-19: 0 de 12.** Por eso un pilar cuyo motor son los comentarios (lead magnet) **no se publica despues de comer**: sus 3 horas criticas caerian justo ahi. Un meme aguanta mejor, porque su motor es la reaccion inmediata.


## 4 · Histórico destilado, cuenta a cuenta (refrescado con export real abr-jul 2026)

> Datos reales del export "Top posts (50)" por cuenta (primeros ~4 meses publicando). Los **textos completos** de estos ejemplos, anotados por estructura, están en la skill **`swipe-file`** — cárgala al escribir hooks/cuerpos. Aquí viven los números; allí la anatomía.

### Stats por cuenta (abr-jul 2026)
| Cuenta | Posts | Outliers | Hit rate | Media × | Pico × | Impresiones | Media imp/post |
|---|---|---|---|---|---|---|---|
| **Iker Galarza** | 48 | 15 | 31% | 3.00x | 16.5x | 1.18M | 24.7K |
| **Unai Arambarri** | 34 | 6 | 18% | 2.19x | 17.0x | 518K | 15.2K |
| **Asier Olaizola** | 1 | 0 | 0% | 0.96x | 1.0x | 4.3K | 4.3K (arranca) |
- **Mix de formato publicado:** Texto+Foto 66 · Texto solo 15 · Carrusel 1 · Vídeo 1. (Foto domina; texto solo también rinde.)
- **Hook por engagement medio:** `bold_claim 399` · `curiosity_gap 314` · `other 221` · `data_shock 159` · `story_opener 106` · `list_promise 102` · `rhetorical_q 86` · `direct_callout 50` · `analogy 35`. → **bold_claim y curiosity_gap** son los tipos que más engagement traen.

### Split por cuenta — señal EN VIVO (Railway, 2026-07-13, todo el histórico)
> Del endpoint `/api/analysis/{id}/stats`. `avg_ratio` = media de TODOS los posts de ese tipo en la cuenta (no el pico de un post) → es la señal de "qué arquetipo rinde mejor en cada cuenta". Cifras all-time (más posts que la tabla de arriba, que era el export de 50).

- **Iker** (148 posts · 16 outliers · rate 11% · mejor día martes):
  - Hook por ratio: **`curiosity_gap` 2.27x (n=20) ← el mejor** · `bold_claim` 1.49x · `other` 1.34x · `list_promise` 0.96x · `story_opener` 0.95x · `rhetorical_q` 0.65x.
  - Estructura por ratio: `data_driven` 16.45x (n=1, el mapa Gipuzkoa) · `content_with_cta` 3.05x · `contrarian_proof_reframe` 2.87x (avgEng 370) · `list_framework` 2.49x (n=21) · `short_punchy` 2.02x.
  - Mejor slot: **martes 11:00 (80% outlier rate, avgEng 647)**, martes 9:00, jueves 9-10.
- **Unai** (72 posts · 7 outliers · rate 10% · mejor día martes):
  - Hook por ratio: **`curiosity_gap` 3.15x (n=11) ← el mejor** · `data_shock` 2.01x · `other` 1.11x · `bold_claim` 0.91x · `rhetorical_q` 0.85x.
  - Estructura por ratio: `content_with_cta` 8.25x (n=3) · `comparison` 5.25x (n=2) · `contrarian_proof_reframe` 3.7x · `list_framework` 1.42x.
  - Mejor slot: martes 8:00 (67%).
- **Asier** (2 posts · 0 outliers): sin señal aún — su cuenta necesita baseline (ver `aboutme`). No leer ratios todavía.

> **Lo más accionable:** en las DOS cuentas con histórico, **`curiosity_gap` es el hook con mejor ratio** (Iker 2.27x, Unai 3.15x) — por encima de bold_claim. Y las estructuras `content_with_cta` y `contrarian_proof_reframe` rinden alto en ambas. El martes por la mañana (9:00-11:00) es el pico claro.

### 4.0b · La FIRMA DE ENGAGEMENT de cada pilar (BD en vivo, 2026-07-14 — los 23 outliers)
> Hallazgo nuevo al revisar los 23 outliers uno a uno. **Cada pilar gana en una métrica distinta.** Sirve para dos cosas: saber si un post está funcionando en las primeras horas, y no juzgar un pilar con la métrica de otro.

| Pilar | Gana en | Reposts | Comentarios | Ejemplo |
|---|---|---|---|---|
| **Mapa** | **REPOSTS** | **20-90** | 27-145 | Gipuzkoa 90🔁 · Galicia 60🔁 · Andalucía 51🔁 |
| **Meme** | **IMPRESIONES** | 9-22 | 25-85 | cold calling 168.9K · wojak 165.5K |
| **Lead magnet** | **COMENTARIOS** | **5-6** | **177-632** | vibe 632💬 · desmonto 483💬 |
| **"Los 10"** | mixto | 12 | 33 | País Vasco 4.81x · 49.4K |

- **El mapa se mide en reposts.** Es el pilar más reposteado con diferencia (hasta 90). Si un mapa no cosecha reposts en las primeras horas, no está viajando: es la señal temprana.
- **El lead magnet casi no se repostea (5-6) y tiene pocos likes** (95 y 116 en los dos mejores) pero se come los comentarios. Un lead magnet con muchos likes y pocos comentarios ha fallado.
- **El meme no se repostea tanto como parece** (9-22) pero es el que revienta impresiones. Su trabajo es alcance, no conversación.
- Ojo con leer likes: Gipuzkoa tiene 1.208 likes (nuestro récord) y el mejor post del histórico (wojak 16.56x) solo 257. Los likes no ordenan nada.

### Mapas regionales (la mecánica más fiable)
- **Gipuzkoa (Iker, 1er mapa) 12.9x · 112.7K · 1.2K likes · 90 reposts** — "pueblo de 7.000 hab que exporta más que países enteros".
- **Navarra (Iker) 7.7x · 79.2K · 563 likes · 46 reposts** — molde gold ("patio trasero de los Pirineos… y poco más. Exporta más que Bolivia") → ver `swipe-file §2.1`.
- Galicia (Iker) 7.3x · 64.6K · 60 reposts ("esquina del Atlántico… más que Croacia").
- Cataluña (Iker) 7.1x · 48.9K · 145 comentarios · 35 reposts.
- Valencia (Iker) 6.8x · 51.5K · 49 reposts.
- Andalucía (Iker) 5.4x · 29.8K · 51 reposts.
- **País inventado / trampa (Unai) 7.87x · 78.7K** — alcance vía curiosidad + guessing game (arma de ocasión).
- Euskadi (Unai, VÍDEO) 3.7x · 21.1K · 37 reposts.
- Bizkaia (Unai) 3.3x · 21.3K.
- Álava "trastienda del norte" (Unai) 2.1x · 20.1K (región menos conocida → techo menor).
- **FLOP de repetición: "país inventado" REMIX (Iker) 1.2x** — repitió el concepto de Unai semanas después y se hundió. Nunca repetir concepto. (Madrid/capitales siguen baneadas por precedente.)

### Memes (con motor)
- **"Caja de herramientas engorda" (Unai) 16.56x · 165.5K — el mejor post del histórico** (Motor A, stacking de tools) → `swipe-file §1.1`.
- **"Cold calling enterrado en vida" (Iker) 16.4x · 168.9K** (Motor A, jerarquía de roles + staccato "Nadie. Llamó. Al. Cliente.") → `swipe-file §1.2`.
- **"Subir en ventas / calvicie SDR→VP" (Iker) 13.5x · 138.8K** (Motor A, cambio corporal en escalera de roles) → `swipe-file §1.3`.
- Factura Claude / "casi me cuesta una boda" (Iker) 5.9x · 60.4K (Motor B, screenshot documental).
- "El humo de la IA reemplaza al comercial / Mikel vuelve" (Iker) 4.4x · 45.0K (Motor A/B).
- "49€ vs Claude por 20€/día" (Unai) 2.9x · 28.1K (Motor B, pilar deseo).
- FLOPS: **"El comercial B2B ha engordado" (Unai) 2.6x** — cambio corporal OK pero timeline de UNA persona (2018→2026) en vez de jerarquía de roles → rinde 6x menos que el meme de jerarquía. "Claude del grupo de pádel" (Unai) 1.5x, "Perder un cliente es arte" (Unai) 1.2x (sátira sin motor).

### "Los 10"
- **País Vasco (Iker) 4.8x · 49.4K — el molde** ("personas desconocidas quemando el teléfono"; foco en la persona) → `swipe-file §3.1`.

### Lead magnets (comment-gated)
- **"Vibe prospecting" (Unai) 10.0x · 632 comentarios** — récord de comentarios (CTA `Comenta "vibe"`).
- **"Desmonto perfiles" LIVE (Iker) 8.5x · 483 comentarios** — el mejor formato (entrega pública personalizada + verbo "desmonto" + CTA `Comenta "desmonta" + tu departamento`) → `swipe-file §4.1`.
- "Llaves" (Unai 4.6x · 285 comentarios; Iker 4.1x · 232 comentarios), "perfil" (Iker 3.3x · 183 com.), "frase+emoji" (Unai 2.7x · 167 com.), "mensaje" (Iker 2.3x · 129 com.), cold-email "sí en comentarios" (Iker 2.1x · 120 com.).
- **FLOP: "biblia de ventas" (todo junto) (Iker) 1.2x · 2.3K** — genérico "todo mi material en una caja" → LinkedIn no amplifica aunque comenten. El entregable tiene que ser UNO y específico.

### Otros
- Oferta de empleo ("2 SDRs Junior", Iker) 2.5x · 25.6K · 15 reposts (gama media fiable de alcance+reposts).
- Posts de ronda/evento ("330.000€ levantados") 2.0-2.7x — objetivo autoridad, no viralidad (esperado).

### Patrones de hook confirmados
- **≤1 número:** 50% cero, 50% exactamente uno, 0% con dos o más.
- Estructura recurrente: `[claim único O métrica única] + [tensión/reframe] + 👇`, con verbo físico (matar, enterrar, quemar, tirar, reventar) en al menos una parte. El primer salto en blanco va DESPUÉS del gancho.

### Timing confirmado
- Mejor día: martes (miércoles-jueves cerca). Mejores horas: 11:00-12:00 y 14:00-15:00 (hora local).

---

## 5 · Evidencia externa cross-mercado — guía ColdIQ (6.750 posts GTM)

> **Qué es:** guía pública de ColdIQ (Michel Lieben) que analizó con Claude Code **6.750 posts** de **25 top creators** de GTM/ventas/IA (8k-864k seguidores), comparando los **2.089 que superaron 500 likes** contra el resto (baseline "viral" = 28,4% de posts con 200+ likes).
> **Cómo tratarla:** es **evidencia externa direccional**, aún más externa que §3 — son creadores **ingleses de GTM**, y la métrica es **"tasa de viralidad"** (% de posts que pasan un umbral de likes), NO nuestro "outlier ratio" (Nx vs. la media del propio autor) ni nuestro mercado (B2B español). Úsala como confirmación/prior, nunca por encima de §4 (Neety) ni de §3. **Y ojo con los mitos:** varias de sus reglas CHOCAN con lo que nosotros ya hemos verificado — ahí mandan nuestros datos (ver 5.3).

### 5.1 · Lo que CONFIRMA (validación externa de lo que ya hacemos)
- **Hook con número:** aparece en el 62,8% de los virales vs 46,6% de los normales. Encaja con nuestra regla de ≤1 número en el hook (`global-instructions §2.5`): un número sí, dos no.
- **Posts de texto/historia largos:** la tasa sube casi lineal con la longitud (<100 palabras 12,4% · 300-400 39,4% · 400-500 58,3%). Confirma nuestro rango de 300-500 palabras (`§3.3`). **Ojo de alcance:** esto es para posts de TEXTO/historia — NO para memes ni screenshots, que en nuestros datos van CORTOS (`global-instructions §4.3`). Ahí manda lo nuestro.
- **Una idea por línea + voz humana sin clichés de IA:** "here's the thing" / "let that sink in" casi ausentes en top creators. Refuerza `§3` (variedad rítmica, líneas cortas) y la tabla anti-IA de `brand-voice §3`.
- **Comment-to-get como CTA rey:** 41,3% viral y 378 comentarios de media, vs pregunta 81, link en el post 46, y "sígueme" 35 (9,1% viral, el PEOR). Solo ~8% de posts lo usan. Valida de lleno nuestro lead magnet con "Comenta X + Y" (`§4.4`) y la regla del UNO en el cierre.
- **Timing:** ventana de media mañana europea (11:00-12:30) y los primeros 30 min deciden. Confirma nuestro `§3.9`/`§4/§7` (11:00-12:00 y la ventana de oro).
- **Vulnerabilidad rinde** (53% viral vs 28% baseline) → coherente con nuestro tono Empatía/Vulnerable alto (`§3.4`).
- **"Operator lane":** los operadores ganan con **prueba y números grandes** (posts más largos y densos, 62,8% con número). Es exactamente nuestro posicionamiento founder-en-trincheras + cifras de cliente (`brand-voice §1`, `§4.2`).
- **Apropiarte de un concepto/formato y repetirlo:** los mejores reejecutan su formato/hook firma. Encaja con "reusa una palabra-concepto que sea nuestra" (`brand-voice §4.4`). **Matiz nuestro:** apropiarse del CONCEPTO/estructura sí, pero **variando las palabras cada vez** (`working-preferences §4`) — no repetir el hook calcado.

### 5.2 · Lo que AÑADE (nuevo y útil, sin chocar)
- **Banda de 7-10 palabras en el hook** rinde mejor (1-3 palabras es lo peor). Compatible con nuestra ley de bloque único ≤210.
- **Primera persona ("yo") gana a segunda ("tú")** en el hook — la experiencia propia bate al sermón. Encaja con `brand-voice §6` (no apuntar al lector con "tú").
- **5 fórmulas de hook (con ejemplos reales):** (1) la frase escuchada al vuelo ("Founder: 'We need leads NOW!'"), (2) el pattern break ("Contraté a un Gen-Z sin entrevistarlo"), (3) la orden contrarian ("Deja de avergonzarte con herramientas obsoletas"), (4) el curiosity gap ("No me creo que esto no sea real"), (5) el número/hito ("4.000 cold emails. 1 lead. Luego 4M ARR."). Son plantillas de hook que conviven con nuestros hook types — buenas como banco de arranque.
- **Táctica de distribución afilada:** 30-60 min ANTES de publicar, comenta de verdad en 5-10 personas que comentaron tu post anterior → les llega la notificación, ven el nuevo y te devuelven el comentario en la ventana de oro. Es una versión más concreta de nuestro "avisa a 3-5 contactos".
- **Mecanismos emocionales (lente extra):** vindicación · celebración vicaria · articular lo que el lector no sabía decir · el momento "WTF" · pertenencia vía sátira. Decide cuál dispara tu post antes de escribir. Complementa (no sustituye) nuestros 3 pilares (curiosidad/deseo/miedo).
- **"Client story" (case study reenfocado):** abre con la situación, sube al problema, aterriza el resultado. Misma prueba, postura distinta. Encaja con nuestros diferenciadores y cifras de cliente (`aboutme §1b`, "+200 PYMEs / +40%").

### 5.3 · ⚠️ MITOS — donde ColdIQ CHOCA con lo nuestro (mandan NUESTROS datos)
No importar nada de esto; está aquí para reconocerlo y descartarlo:
1. **"Los links matan alcance → ponlo en el primer comentario, nunca en el cuerpo."** ❌ CONTRADICE nuestro `global-instructions §4.5`: hemos **verificado con posts >100K imp** que un link en el cuerpo NO suprime alcance y que el folklore del primer comentario está obsoleto. Además nuestra estrategia mete el link de agendar en spam ninja EN el cuerpo. **Manda lo nuestro.**
2. **"Sin emojis en la primera línea/hook."** ❌ Nuestros mapas cierran el hook con `👇` y está validado en nuestras cuentas. El emoji funcional en el hook se queda.
3. **"Haz infografías (con logos de las tools para que las guarden)."** ❌ Nuestras infografías van **0-de-3** (`images §7`). No las proponemos. Manda lo nuestro.
4. **"El texto solo rinde flojo (15,8%); imagen mucho mejor."** ❌ En NUESTROS datos el **texto solo rinde alto (~13,6x, `§3.8`)**. Métrica y mercado distintos; no trates el texto-solo como débil.
5. **"Reejecuta el MISMO hook calcado varias veces."** ❌ Choca con `working-preferences §4` (variar expresiones, seguir sorprendiendo). Repetimos el CONCEPTO, no las palabras.
6. **"Súbete al trigger del lanzamiento de IA (Anthropic, etc.)."** ⚠️ Para NOSOTROS los posts de lanzamiento de modelo **flopean** (0,88x, 0,25x); hay que **reformular como resultado para la audiencia** (`working-preferences §3`). El "trigger" vale, el post de changelog no.
7. **Ranking de temas (fundraise/revenue/milestone #1).** ⚠️ Es el carril de los creators GTM, **no el nuestro**: nosotros tiramos de mapa / "Los 10" / meme / lead magnet. No pivotes a posts de "hemos facturado X". Lo único aprovechable es el "client story" con resultado concreto (5.2).

> Nota de método: su "tasa de viralidad" (% de posts que pasan un umbral de likes en cuentas grandes inglesas) y nuestro "outlier ratio" (Nx vs. la media del autor, en B2B español) **no son la misma métrica**. Por eso ColdIQ vale como dirección, no como cifra que sustituya a §3/§4.

---

## 6 · Cómo pasarme datos frescos (procedimiento)

### Vía A — Export/HTML del Explorer (la que funciona HOY sin tocar nada) ✅
1. Abre la herramienta → pestaña **Explorer / Dashboard**.
2. Copia (o exporta) los bloques de: **Top Viral Archetypes**, **Hook Types in Outliers**, **Post Structure in Outliers**, **Tone Analysis**, **Opening/Closing Patterns**, **Language Patterns**, **Best Days/Hours**, y **Top 20 Outlier Hooks**.
3. Pégamelo en el chat (texto o HTML, da igual). Yo lo destilo y **relleno §3 y actualizo §4** de esta skill.

### Vía B — Autorizar el backend en la red del entorno (setup una vez) ⚙️
El backend (`https://linkedin-post-analyzer-production.up.railway.app`, auth básica usuario `Neety`) expone endpoints de análisis (`/api/creators`, `/api/creators/:id/stats`, `/api/analysis/...`). Hoy el entorno de Claude **bloquea ese host** (403 en egress). Si se **añade ese dominio a la allowlist de la network policy del entorno** de Claude Code, yo podría consultar esos endpoints por HTTPS y traer los datos solo, sin que tengas que copiar/pegar. Cambio de configuración del entorno (docs: https://code.claude.com/docs/en/claude-code-on-the-web).

### Vía C — Ejecutar en un entorno de red abierta ⚙️
En Claude Code local (tu máquina), sin egress restringido, tanto la URL de Postgres como el backend funcionarían directamente.

> ✅ Estado 2026-07-13: el **backend de Railway ya funciona** desde el entorno (auth básica HTTPS). Se consulta directamente (ver §0 para endpoints). La Vía A (pegar el export) sigue como respaldo si el acceso vuelve a caer.

---

## 7 · Huecos a rellenar
- [x] §3 relleno con el snapshot cross-creator del Explorer (2026-07-09): recetas, distribuciones de hook/estructura/tono, aperturas/cierres, estilo, formato, timing y banco de remix.
- [x] Patrones de lenguaje (densidad outlier vs normal): incorporados en §3.7 (el hallazgo contraintuitivo de menos autoridad/urgencia/"tú").
- [x] Banco de remix de OTRAS cuentas: §3.10 (curado a los top relevantes para B2B; el resto de las ~150 págs de ejemplos se dejan fuera a propósito).
- [x] **Split por cuenta Neety** (qué arquetipo rinde mejor en Iker vs Unai vs Asier): RELLENO en §4 con datos en vivo de Railway (2026-07-13). Hallazgo: `curiosity_gap` es el mejor hook por ratio en Iker (2.27x) y Unai (3.15x); `content_with_cta`/`contrarian_proof_reframe` las mejores estructuras; martes mañana el pico. Asier aún sin baseline.
- [x] **Evidencia externa (guía ColdIQ, 6.750 posts GTM):** destilada en §5 — confirmaciones (5.1), añadidos útiles (5.2) y, sobre todo, los **mitos que chocan con lo nuestro** filtrados y descartados (5.3: links al cuerpo, sin-emoji-hook, infografías, texto-solo-débil, rehook calcado, trigger de lanzamiento IA).
- [ ] **Refresco periódico:** este snapshot es de 2026-07-09; los ratios decaen. Reexporta el Explorer cuando quieras actualizarlo.

## §3.10 · ⭐ EL UMBRAL DE LAS 3 HORAS Y LOS 3 MOTORES DE ALCANCE (medido 2026-07-20)

Medido con `post_snapshots` (capturas cada 15 min) y con los tipos de reacción de Unipile. **Esto es lo que de verdad decide un post, y no estaba escrito en ninguna parte.**

### El umbral: 1.000 impresiones a las 3 horas

| Post | **a las 3h** | Final |
|---|---|---|
| Iker · lead magnet "desmonto" 8.51x | **2.990** | 44.190 |
| Iker · "Los 10" 2.01x | **1.952** | 20.700 |
| Asier · meme 1.79x | **1.937** | 22.605 |
| Unai · lead magnet "última hora" 9.96x | **1.473** | 21.949 |
| Asier · mapa Aragón 2.84x | **1.021** | 22.442 |
| — umbral ≈ 1.000 — | | |
| Unai · mapa Cataluña 0.59x | 565 | 3.018 |
| Iker · lead magnet web 0.29x | 348 | 1.054 |
| Asier · lead magnet comité 0.47x | 327 | 1.084 |

**8 de 8, sin una excepción.** Por encima de ~1.000 a las 3h → acaba entre 20.000 y 44.000. Por debajo → acaba entre 1.000 y 3.000. **No hay término medio: el post despega o se queda en el primer círculo.**

**⛔ Y NO ES LA TASA DE ENGAGEMENT.** Es lo contrario de lo que parece: los flops interactúan MEJOR con la poca gente que los ve. El lead magnet del comité tenía **7,6%** de interacción por impresión a las 3h; el meme que llegó a 22.605, **1,1%**. Optimizar "que guste más" no mueve esta aguja.

### Los 3 motores, y cada pilar tiene el suyo

Lo que rompe el primer círculo no es lo mismo en cada pilar. **Medido:**

| Pilar | Motor | Evidencia |
|---|---|---|
| **Mapa / "Los 10"** | **REPOSTS** | 24 reposts (mapa Aragón) · 16 ("Los 10") → 22.442 y 20.700. La gente comparte el post donde sale su región o su empresa. |
| **Meme** | **REACCIÓN DE RISA** | 34% de reacciones `ENTERTAINMENT` (10 de 29). **780 impresiones por reacción**, contra ~200 de los peloteos. Con solo 4 reposts, 11 likes y 7 comentarios llegó a 22.605: el peor engagement de los 6 y el mejor alcance. |
| **Lead magnet** | **VOLUMEN DE COMENTARIOS** | Los 2 que volaron tienen **483 y 616 comentarios** y solo 6 reposts cada uno. Cada comentario y cada respuesta nuestra es actividad nueva que resucita el post durante días. |

**⚠️ CONSECUENCIA PARA EL LEAD MAGNET, y es el diagnóstico que faltaba:** un lead magnet **no tiene motor de reposts** (nadie comparte "comenta X y te lo paso") **ni de risa** (no es un chiste). **Su único motor es el volumen de comentarios.** Si la petición no genera comentarios en las 3 primeras horas, no hay nada que lo salve, y por eso el pilar cae en vertical en vez de dar 2x: no existe el término medio.

Los 2 que flopearon sacaron **6 y 20 comentarios**. Los 2 que volaron, 483 y 616. **El pilar no está quemado ni el ángulo era genérico: la petición no arrancó el único motor que tiene.**

**Hipótesis NO verificada (n=2, trátala como tal):** la fricción de lo que pides. "Comenta *desmonta* + tu departamento" (483 com.) regala un análisis de TU perfil y cuesta 2 segundos. "Comenta *auditoria* y el enlace de tu web" (6 com.) te obliga a exponer tu web en público delante de todos. Encaja, pero con 2 casos no es un dato.

### Qué mirar a partir de ahora
1. **A las 3 horas, mira las impresiones.** Si van por debajo de 1.000, ese post ya no despega: no gastes más energía en él, y si era el importante de la semana, aprende de ahí.
2. **En el pilar que toque, vigila SU motor**, no el engagement general: reposts en peloteo, risas en meme, comentarios en lead magnet.

---

## §3.11 · ⭐ LOS CLICS AL ENLACE, Y POR QUÉ EL CTR MIENTE ENTRE PILARES (medido 2026-07-20)

Desde el 2026-07-20 la herramienta guarda cuatro métricas de LinkedIn Premium que
antes no teníamos: **clics al enlace, guardados, envíos por privado y clics al
botón Premium**. Backfill completo de los 229 posts de las 3 cuentas.

### La trampa: NO compares CTR entre pilares

El primer análisis dio esto, y es una conclusión FALSA:

| Post | Impresiones | Clics | CTR |
|---|---|---|---|
| Meme iMessage (Iker) | 86.815 | 76 | 0,09% |
| Mapa "pueblo de 2,2M" (Unai) | 21.071 | 231 | 1,10% |

Leído así parece que el meme no convierte y que el enlace en spam ninja no sirve.
**Es mentira.** LinkedIn reparte impresiones de forma muy distinta según el
formato: al meme le regala alcance que nunca se traduce en interacción.

**Engagement por cada 1.000 impresiones (mediana):**

| Pilar | eng/1k imp |
|---|---|
| Lead magnet | 27,24 |
| "otros" | 17,32 |
| Peloteo (mapa · Los 10) | 12,74 |
| **Meme** | **8,75** ← el más bajo de todos |

Al meme lo ve muchísima gente que no hace nada. Si el denominador está inflado,
el CTR sale bajo por construcción, no por culpa del enlace.

### La métrica correcta: clics por cada 100 interacciones

Normalizando por gente que SÍ interactuó, se da la vuelta al resultado:

| Pilar | clics / 100 interacciones | n |
|---|---|---|
| **Meme** | **78,4** | 3 |
| Peloteo | 40,6 | 12 |
| "otros" | 9,4 | 2 |

Caso a caso: meme de Unai 117,5 · meme de Asier 61,9 · meme iMessage 55,9. Los
tres por encima de la media del peloteo. El mapa gallego, con 736 interacciones,
sacó 106 clics (14,4 por 100) — el meme iMessage sacó 76 con solo 136 (55,9).

**El meme convierte casi el doble por persona enganchada.** El spam ninja
funciona: sigue poniéndose.

⚠️ **n=3 memes con enlace.** La dirección es sólida (los 3 casos apuntan igual)
pero el número exacto se moverá. Re-medir cuando haya ~10.

### Reglas que salen de esto

1. **Para comparar pilares distintos, usa clics/interacción, nunca CTR.**
2. **Para comparar dos posts DEL MISMO pilar, el CTR sí vale**: ahí el sesgo de
   impresiones es parecido y se cancela.
3. **Guardados y envíos son la señal de valor real** que no teníamos. Un guardado
   cuesta más que un like y nadie lo hace por compromiso; un envío por privado
   significa que alguien pensó en una persona concreta. El mapa del "pueblo de
   7.000 habitantes" tiene **164 guardados y 110 envíos**: eso no lo compra el
   algoritmo.
4. **El mejor CTR del histórico es una oferta de empleo** (Full Stack, Asier):
   1,49% con solo 4.288 impresiones. Audiencia pequeña e híper-intencionada. Ojo
   con despreciar posts de bajo alcance: alcance e intención no son lo mismo.

---

## §3.12 · CÓMO SE RECONOCE EL PILAR DE UN POST SOLO CON SUS MÉTRICAS

Dictado por Iker el 2026-07-20. **La BD no guarda el pilar**, así que cuando haya
que clasificar posts a posteriori (para medir un pilar contra otro) se usa esto.

| Pilar | Cómo se reconoce |
|---|---|
| **Meme** | Reacciones **FUNNY** disparadas · **impresiones disparadas** pero likes/comentarios/reposts bajos (eng/1k imp ≈ 8,75, el más bajo) · **lo importante está en la FOTO**, el texto es corto |
| **Lead magnet** | **Comentarios disparados** si va bien · **CTA explícito al final** pidiendo comentar una palabra clave |
| **Peloteo regional** (mapa · "Los 10") | **Plagado de menciones** de empresas y personas. En texto plano deja un reguero de `→` |

**Los lead magnets son DOS cosas distintas, no una:**
1. **Público por comentarios** — el recurso se entrega en el propio hilo, a la vista.
2. **Privado por DM** — se manda el recurso por mensaje. **También** hay que
   comentar la palabra clave.

No los mezcles al analizar: el motor de alcance es el mismo (volumen de
comentarios) pero la conversión se mide en sitios distintos.

⚠️ **Aviso sobre la clasificación automática:** el script que separa por `→` y por
CTA acierta con mapas y lead magnets, pero mete en "meme" cualquier post con foto
y texto corto. De 229 posts, 143 cayeron en "otros". Los números por pilar de
§3.11 salen de los que se clasificaron con seguridad, no del total.

---

## §3.13 · EN UN MAPA NO IMPORTA A CUÁNTOS MENCIONAS, SINO CUÁNTOS TE CONTESTAN (medido 2026-07-20)

Tras el flop del mapa de Cataluña de Unai (0.59x) la hipótesis era: *se cayeron 4
empresas y quedaron 16 menciones en vez de 20, por eso rindió menos*.

**Medido: no se sostiene.** Correlación menciones↔impresiones en 29 posts con
menciones: r=0,61 — pero es un espejismo, mezcla mapas con posts que solo llevan
flechas decorativas. Dentro de los mapas de verdad no explica nada:

| Menciones | Impresiones | Ratio | Post |
|---|---|---|---|
| 16 | 48.866 | **7.10x** | Cataluña (Iker) |
| 16 | 3.018 | **0.59x** | Cataluña (Unai) |
| 20 | 10.266 | 1.00x | Lanzadera (Iker) |
| 19 | 112.667 | 12.90x | pueblo de 7.000 (Iker) |

Mismo número de menciones y 16x de diferencia. Un mapa con las 20 completas hizo
1.00x.

**Lo que sí correlaciona es la RESPUESTA de los mencionados:**

| Mapa | Comentarios | De fuera | Resultado |
|---|---|---|---|
| Aragón (Asier) | 19 | 15 + 4 mencionados dando las gracias | 2.91x |
| Cataluña (Unai) | 4 | **0** — los 4 del propio equipo | 0.59x |

**Regla:** no persigas llegar a 20. Persigue que contesten. Vale más un mapa de
16 con gente que responde que uno de 20 mudo. Al elegir, prioriza personas con
actividad reciente real (`aboutme` · filtro de 3 meses de Unipile): un mando
intermedio que publica bate a un CEO dormido, y esto lo confirma con números.

⚠️ Esto NO cierra el caso del flop de Cataluña. Explica una parte. Sigue sin
saberse por qué esas empresas no contestaron cuando en Aragón sí. **Cataluña no
se quema como región:** el primer mapa de Cataluña (Iker) hizo 7.11x y es de los
mejores de la casa.

---

## §3.14 · ⚠️ UN CLIC A UNA WEB AJENA NO ES UN CLIC NUESTRO (2026-07-20)

Al medir CTR, **filtra siempre por destino del enlace** (`posts.link_url`). Los
números más altos del histórico no valen para nada:

| Destino | CTR | Post | ¿Nos sirve? |
|---|---|---|---|
| forms.fillout.com | 1,49% | oferta Full Stack | No — es contratar, no vender |
| **pampam.city** | 1,10% | mapa Euskadi (Unai), 231 clics | **NO — es web ajena** |
| **pampam.city** | 0,91% | mapa Andalucía (Iker), 270 clics | **NO** |
| **pampam.city** | 0,29% | mapa Navarra (Iker), 226 clics | **NO** |
| recursos.neety.com/agendar | 0,11-0,44% | los de julio 2026 | **Sí** |

Los mapas de PamPam mandaban a la gente a **la web de otro**. 727 clics regalados.
Desde julio 2026 el spam ninja apunta siempre a `recursos.neety.com/agendar`, que
es un buscador de clientes ideales en vivo desde el que se agenda reunión.

**Al comparar CTR entre épocas, el cambio de destino es una ruptura**: los CTR de
antes de julio 2026 en mapas no son comparables con los de después. Bajaron, pero
no porque el post fuera peor — porque el enlace dejó de ser un juguete y pasó a
ser una página de conversión.

**Con solo 9 posts apuntando a casa (todos de julio 2026), cualquier media es
provisional.** No tomes decisiones de calendario con esto todavía.

---

## §3.15 · 🚨 EL RATIO BAJA AUNQUE MEJORES: NO LEAS TENDENCIAS CON OUTLIER_RATIO (2026-07-20)

**El error más caro que hemos cometido midiendo.** La rutina de pilares nuevos
del 20-jul concluyó que el meme y el lead magnet estaban "CAYENDO" en las dos
cuentas con histórico, y propuso reemplazar el meme. **Era falso.**

### Por qué el ratio miente con el tiempo

`outlier_ratio` se calcula **contra la media de la propia cuenta**
(`services/outliers.ts`). Esa media **sube según publicas**. Consecuencia: el
mismo post exacto saca un ratio cada vez menor con el paso de los meses.

**Iker, mismo pilar, mismos meses:**

| Periodo | Impresiones (mediana) | Baseline de la cuenta | Ratio medio |
|---|---|---|---|
| 2026-01 | 870 | 3.104 | 0.22 |
| 2026-04 | 10.191 | 4.977 | 2.51 |
| **2026-07** | **20.700** | **10.276** | 2.89 |

La baseline se **triplicó en seis meses**. Las impresiones medianas se
multiplicaron por **veinte** desde enero. Un post que en enero habría dado 3x,
hoy con las mismas impresiones da 1x.

**Y hay un efecto peor: cada viral se autocanibaliza.** El 16.45x de mayo subió
la media de Iker y con ello hundió el ratio de TODO lo publicado después. Cuanto
mejor lo haces, más difícil es volver a parecerlo.

### Lo que pasa de verdad con el meme, medido en absoluto

| Cuenta | Memes 1ª mitad (media imp) | 2ª mitad | Veredicto |
|---|---|---|---|
| **Unai** | 9.254 | **15.326** | **SUBEN** (ratio 1.15 → 2.16) |
| Iker | 81.247 | 40.471 | Sin señal: varianza de 1.827 a 168.926 con n=9. Su último meme hizo **86.815 imp y 8.45x** |

### Reglas

1. **Para TENDENCIA en el tiempo, usa impresiones y likes ABSOLUTOS.** Nunca
   ratio.
2. **El ratio solo vale para comparar posts de la MISMA época y cuenta.** Para eso
   sí es la mejor métrica que tenemos, porque normaliza por tamaño de audiencia.
3. **Un ratio que baja mientras las impresiones suben es una cuenta que CRECE**,
   no un pilar que muere.
4. Al leer cualquier informe con "pendiente" o "cayendo": **comprueba si está
   calculado sobre ratio.** Si lo está, no vale.
