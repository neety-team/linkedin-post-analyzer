# PLAYBOOK — construir un lead magnet (gate + recurso) en recursos.neety.com

> **Qué es:** los apuntes de construir /propuesta/ de principio a fin. Cada regla salió de MEDIR algo o de ROMPER algo.
> **Quién lo usa:** el programador que monta la página, y quien escribe el prompt para él (`docs/skills/lead-magnet-web.md` §5).
> **Dónde debería vivir:** idealmente en el repo de **recursos.neety.com**, junto al código que describe, para que envejezca con él. Está aquí porque es donde se escribe el prompt. Si se copia allí, deja aquí solo el puntero.
> **Ojo:** los invariantes (píxeles, líneas, anchos) son de un scrape del CSS real. Si el CSS cambia, esto miente. Vuelve a medir.

---

================================================================================
RECETA PARA CREAR LEAD MAGNETS (GATE + RECURSO) — recursos.neety.com
Apuntes destilados de construir /propuesta/ de principio a fin.
Cada regla de aquí salió de medir algo o de romper algo.
================================================================================


================================================================================
0. LA REGLA QUE MANDA SOBRE TODAS
================================================================================

MEDIR, NO ESTIMAR. Y medir lo que ve el lector, no lo que dice el CSS.

Los recursos que ya existen SON la especificación. Antes de escribir una línea
de copy, levanta un servidor estático y mide los que ya están publicados.

Dos formas de "verificar" que no valen para nada, las dos aprendidas fallando:

  - Medir CAJA contra CAJA. Daba 80px en todos los huecos y el usuario veía
    152px. El padding vive dentro de la caja y la medición se lo traga. Mide
    desde el último elemento VISIBLE de un bloque hasta el primero del
    siguiente.

  - Comprobar "¿desborda?" y llamarlo verificado. `overflow: false` no dice NADA
    sobre si algo se ve bien. Una maqueta de LinkedIn estirada a 1032px no
    desborda y queda mal.

Una regla escrita no se cumple sola: el spec original ya decía "medir, no
estimar" y aun así se estimó tres veces y se falló las tres. Lo que sí funciona
es un snippet concreto que copiar y un valor esperado exacto. Por eso este
documento los trae.


================================================================================
1. ANATOMÍA
================================================================================

GATE  /<recurso>/index.html          wrapper 580px
  back-link "Todos los recursos" → logotipo → hero (h1 + lede) → proof block
  (1 pieza entera y aplicable + el resto bloqueado en borroso) → form card.

GUÍA  /<recurso>/guia/index.html     container 1080px
  topbar sticky → hero (h1 + lede + índice) → EL ARTEFACTO → secciones
  numeradas → todo junto sobre un ejemplo → el hueco a propósito → autor.

Regla del teaser: se regala la pieza 1 ENTERA y aplicable. Suficiente para que
lo pruebe hoy, insuficiente para reconstruir el resto.


================================================================================
2. INVARIANTES DEL GATE (medidos, no negociables)
================================================================================

                    ESCRITORIO 1440px          MÓVIL 360px
  H1                46px, columna 532px        30px, columna 328px
                    EXACTAMENTE 2 líneas       2 líneas
  Lede              columna 460px, 3 líneas    4 líneas
  Desbordamiento    ninguno                    ninguno

  - H1: 39-55 caracteres, SIEMPRE termina en punto. Salto controlado a mano con
    <br> si hace falta.
  - Lede: 155-190 caracteres.
  - Si no cuadra: ACORTA EL COPY, nunca toques el CSS. El CSS es el de los otros.

FORMULARIO (se hereda assets/neety-form.js tal cual, NO SE TOCA). Medido a 360px:
  - input a 16px  ← por debajo, iOS hace zoom al enfocar
  - input 49px de alto, botón 50px
  - DOS filas de consentimiento, una línea exacta cada una (19px)
  Si una sale a 38px, algo de tu CSS nuevo está pisando al formulario.
  Los dos consentimientos son obligatorios por RGPD. "Solo pedimos el email"
  significa un solo campo, no quitar los consentimientos.


================================================================================
3. EL <em> CORAL: 1 O 2 PALABRAS, JAMÁS UNA FRASE
================================================================================

Medido en los seis gates originales:
  psicólogo (1) · landing page (2) · 8 errores (2) · 8 señales (2) ·
  llaves (1) · prospección B2B (2)
En H1 de guía el rango llega a 3 (multiplicaron por 11x).

Va en LA PALABRA QUE DA NOMBRE AL RECURSO, no en el remate de la frase.
Un <em> de 7 palabras tiñe media línea de naranja y desequilibra el titular
aunque el número de líneas sea correcto.


================================================================================
4. LA ESCALERA
================================================================================

Titular a dos líneas con <br> puesto A MANO, nunca dejado al azar.
La proporción línea1 / línea2 manda:

  ~0,25          Desplome. No es una escalera.
  0,65 - 0,80    ESCALÓN LIMPIO. Este es el objetivo.
  ~1,0           Plano. No se aprecia.

Mide el ancho de cada candidato CON LA FUENTE REAL antes de elegir el corte:

  const cs = getComputedStyle(h1);
  const span = document.createElement('span');
  span.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;
    font-family:${cs.fontFamily};font-size:${cs.fontSize};
    font-weight:${cs.fontWeight};letter-spacing:${cs.letterSpacing}`;
  document.body.appendChild(span);
  const w = html => { span.innerHTML = html;
                      return Math.ceil(span.getBoundingClientRect().width); };

EL <br> NO BASTA si el max-width es menor que la línea larga: la manda a una
tercera línea. Mide la línea larga y sube el tope por encima.

LA MISMA REGLA VALE PARA LAS FILAS DEL ÍNDICE. Si cae en 5+3 (fila llena con un
muñón colgando, proporción 2,22) queda peor que sin nada. Un solo separador que
fuerce 3+5 lo deja en 0,65, y las dos escaleras riman con el titular.


================================================================================
5. EL ANCHO DEL CONTENEDOR ES PARA ESTRUCTURA, NO PARA TEXTO
================================================================================

Ensanchar el contenedor sin tocar lo de dentro es MEDIO CAMBIO y empeora la
página.

  ANCHO COMPLETO (1032px): rejillas, tablas, comparativas a dos columnas,
    cabeceras de sección. Son las que justifican ensanchar.

  TOPADO: texto corrido (720px) y cualquier maqueta que imite una interfaz real
    (un perfil de LinkedIn, un email, un chat) → 772px. A 1032px dejan de
    parecer lo que imitan.

EL NÚMERO DE CARACTERES NO SE DEDUCE DEL ANCHO. 820px no son 85 caracteres con
Switzer, son ~100. Y el padding de una tarjeta se come el ancho, así que el tope
del texto tiene que ir BASTANTE por debajo del contenedor. 720px ≈ 80 caracteres.

MIDE LA LÍNEA BASE ANTES DE "ARREGLAR" NADA. Fuerza el estado anterior y mide:
casi se deja el texto más estrecho de lo que había estado nunca, "arreglando"
algo que no estaba roto.

  // caracteres por línea REALES. Objetivo: 45-90. Por encima de 100 cansa.
  const lh = parseFloat(getComputedStyle(p).lineHeight);
  const lineas = Math.round(p.getBoundingClientRect().height / lh);
  const cpl = Math.round(p.textContent.trim().length / lineas);


================================================================================
6. EL RECURSO TIENE QUE ASOMAR AL ENTRAR
================================================================================

El gancho es el ARTEFACTO, no el hero. Si al aterrizar solo hay texto, es un
error de producto, no de estética.

  const primero = [...document.querySelectorAll('.container > section')]
    .find(s => !s.classList.contains('hero'));
  primero.getBoundingClientRect().top < innerHeight   // debe ser true

EL PATRÓN ES SIEMPRE EL MISMO: el lede de DOS párrafos tira el contenido fuera
de pantalla. Uno de tres líneas lo arregla.

Medido en las siete guías, ventana de 900px:
  1 párrafo → 146-357px de contenido visible al entrar
  2 párrafos → de 39px a CERO

Ojo: 3 líneas en escritorio son 7 en un móvil.


================================================================================
7. MÓVIL
================================================================================

- EL ÍNDICE NUNCA EN CARRUSEL HORIZONTAL. Medido: 7 de 8 pastillas fuera de
  pantalla. Un índice que hay que deslizar a ciegas no es un índice.
  Grid de 2 columnas + white-space: normal para que las etiquetas puedan partir.

- Si el índice es grid, cualquier separador tipo .toc-break DEBE ir a
  display: none o se come una celda entera.

- Cuenta los items fuera de pantalla, no te fíes del ojo:
    items.filter(a => { const r = a.getBoundingClientRect();
      return r.right > innerWidth + 1 || r.left < -1; }).length   // debe ser 0

- Breakpoints: gate 520px, guía 720px, home 640px.

- COSTE A TENER EN CUENTA: el índice en grid ocupa ~180px más que el carrusel y
  puede tirar el artefacto fuera del pliegue en móvil. Si hay que recuperar ese
  pliegue, el sitio donde recortar es el LEDE (7 líneas en móvil), no el índice.


================================================================================
8. ESPECIFICIDAD: EL FALLO SILENCIOSO
================================================================================

.checklist { margin: 8px 0 12px }   (clase, 0-1-0)
   PISA A
section { margin-bottom: 80px }     (elemento, 0-0-1)

Resultado: un bloque pegado al siguiente mientras todos los demás respiran.
Si un bloque hereda un ritmo del sistema, NO LE PONGAS MARGEN.

Y padding-bottom + margin-bottom SE SUMAN: el hero tenía 64+80 = 144px donde
todo lo demás tenía 80.


================================================================================
9. EL ENTORNO DE MEDICIÓN MIENTE: TRES CAPAS A LA VEZ
================================================================================

El pane del navegador corre la pestaña OCULTA (document.visibilityState ===
"hidden"). Con eso se congelan simultáneamente:

  CONGELADO              CONSECUENCIA                        SOLUCIÓN
  Scroll suave           scrollTo no mueve nada, scrollY 0   scrollTo({top, behavior:'instant'})
  Animaciones CSS        todo a opacity:0, producción incl.  document.getAnimations().forEach(a=>a.finish())
  Transiciones           el transform del reveal se queda    quitar las clases .reveal antes de medir
                         a medias y FALSEA la geometría ±24px
  requestAnimationFrame  los handlers con rAF nunca corren   sustituirlo por uno síncrono en el test
  Eventos de scroll      no disparan                         dispatchEvent(new Event('scroll'))

Se persiguió un fantasma de espaciado (104/56/80) que era solo el transform
congelado. Y se concluyó que "el IntersectionObserver no dispara en pestañas
ocultas" cuando lo que pasaba es que la página nunca scrolleaba.

TRUCO DECISIVO: USA UN CONTROL. Cuando algo no funcione en el test, corre el
MISMO test contra una página que SÍ funciona en producción (/agendar/). Si
también falla, es el entorno. Si no, es tu bug. Ahorró acusar al propio código
dos veces y lo delató una vez.

Para medir geometría, limpia primero:
  document.documentElement.classList.remove('reveal-ready');
  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.remove('reveal','in');
    el.style.cssText += ';transition:none;transform:none;opacity:1;';
  });


================================================================================
10. EL PATRÓN rAF + FLAG 'ticking': NO LO COPIES
================================================================================

  // MAL: si un frame encolado no llega a correr, ticking se queda en true
  // y el handler deja de reaccionar PARA SIEMPRE.
  addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  });

Para tres toggles de clase no hay nada que optimizar: handler síncrono, y la
altura de página cacheada en 'resize' para no forzar reflow en cada scroll.

Reescribirlo así DESTAPÓ TRES FALLOS REALES que el patrón escondía: al subir el
header no reaparecía, y al volver al top se quedaba escondido y con sombra.


================================================================================
11. ANTES DE TOCAR UN FICHERO CON UN SCRIPT
================================================================================

perfil/guia tiene DOS </style>, y el segundo vive DENTRO DE UNA CADENA DE
JAVASCRIPT que construye el informe del roaster. Insertar antes del último metió
CSS en un string literal, lo dejó sin cerrar y ROMPIÓ EL ROASTER ENTERO.

  - Nunca uses rindex / último match a ciegas. Ancla en el PRIMERO y verifica
    qué hay alrededor.
  - Un buscar-y-reemplazar en 7 ficheros necesita comprobar antes qué es cada
    coincidencia (los '820px' eran .container y .topbar-inner, pero podían no
    serlo).
  - VALIDA SIEMPRE EL JS DESPUÉS DE TOCAR HTML:

    node -e "const fs=require('fs');const t=fs.readFileSync(F,'utf8');
    [...t.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(x=>{new Function(x[1])})"


================================================================================
12. COPY
================================================================================

- CERO GUIONES LARGOS (—). Verificado: 0 apariciones en los seis gates y en la
  home. Usa punto, coma o dos puntos.
- Coma antes de "y": sí, pero SOLO uniendo dos oraciones independientes largas.
  Es correcto en español y los seis gates la usan. Nunca en enumeraciones
  ("LinkedIn, email y automatización").
- EL LEDE CIERRA SITUANDO LO QUE HAY DETRÁS DEL GATE. Convención de 4 de 6:
  "Aquí abajo, 1 error entero como prueba y el resto va en el playbook."
- Español de España, tuteando, sin jerga de marketing.
- NINGUNA CIFRA SIN FUENTE VERIFICADA. Si el briefing trae un dato de
  rendimiento ("+40% de conversión") y no se puede verificar, SE QUEDA FUERA
  hasta que lo confirmen. Los ejemplos ficticios se etiquetan como ficticios en
  el propio texto.
- Cuidado con grep -c '[а-яА-Я]': da falsos positivos con las tildes. Usa Python
  con el rango unicode real.


================================================================================
13. ALTA DEL RECURSO: TRES REGISTROS, O SE ROMPE EN SILENCIO
================================================================================

El mismo literal en los tres, coincidiendo con el data-resource del gate y con
el nombre del directorio:

  src/gate.js       → GATED       (protege /<recurso>/guia)
  src/db.js         → RESOURCES   (acepta el POST de /api/submit)
  src/api/submit.js → withGuide   (redirige a la guía)

Se puede PROBAR de verdad, aunque wrangler dev no arranque sin Postgres:
gate.js es JS puro y Node trae crypto.subtle. Importa guardGuide y pásale
Requests reales (sin cookie → 302, cookie válida → pasa, cookie caducada → 302,
firma falsificada → 302).


================================================================================
14. INDEXADO: DOS MITADES, O EL GATE ES PAPEL MOJADO
================================================================================

  robots.txt  →  Disallow: /<recurso>/guia/
  la guía     →  <meta name="robots" content="noindex">

Sin esto Google indexa la guía y cualquiera se salta el gate: el recurso queda
regalado. La guía NO va al sitemap.xml; el gate sí.


================================================================================
15. HOME
================================================================================

- La card lleva DOS descripciones: <p> y <p class="card-p-m">, que la sustituye
  por debajo de 640px para que las cards queden cuadradas a dos columnas.
  Longitudes medidas: h3 30-42, p 85-109, card-p-m 51-65.
- AÑADE EL RETARDO DE ANIMACIÓN DEL NUEVO ÍNDICE: .grid .card:nth-child(N).
  La regla base da la animación a TODAS las cards y los nth-child solo fijan el
  retardo, así que sin la línea la card nueva aparece ANTES que la primera y
  rompe la cascada.
- Actualiza el contador del trust strip ("6 playbooks" → "7").
- OJO A LA REJILLA: 6 cards cerraban 3+3 en escritorio y 2+2+2 en móvil. La
  séptima deja una card huérfana sola en la última fila en ambos.


================================================================================
16. LO QUE EL SISTEMA NO HACE (NO LO PROMETAS)
================================================================================

- submit.js NO ENVÍA NINGÚN CORREO. Deja la cookie y redirige a la guía.
  Prometer "te llega al correo en 2 minutos" sería mentira. El copy correcto es
  ACCESO INMEDIATO.
- La cookie neety_gate desbloquea TODAS las guías: un lead de un post se lleva
  todos los recursos. Por eso el enlace "Todos los recursos" del gate no es una
  fuga, es lo que hace que se los lleve.


================================================================================
17. REUTILIZA LO QUE YA EXISTE ANTES DE INVENTAR CSS
================================================================================

- Bloqueo/desenfoque: ya existe en agendar/index.html
  (filter:blur(4.5px) + opacidad 0.6 en .finder-card-locked). No inventes otro.
- .teaser-cta está definida en las guías y no la usa ninguna: es el botón coral
  de cierre.
- Scroll reveal: existe en agendar. Pórtalo literal, incluido el gate
  html.reveal-ready (solo se activa si hay IntersectionObserver y no hay
  prefers-reduced-motion) y la regla de no ocultar nada por encima del pliegue,
  que es lo que evita el parpadeo al cargar.
- Clases del sistema de la guía: .callout .kicker .quote .section-head
  .section-number .shift-card .shift-compare .shift-pair.before/.after
  .author-card


================================================================================
18. ESTRUCTURA DE CONTENIDO QUE FUNCIONÓ
================================================================================

GATE: regalar la pieza 1 completa + enseñar el resto BLOQUEADO EN BORROSO.
      Contar lo que hay detrás es débil; enseñarlo bloqueado es fuerte.

GUÍA: el artefacto ARRIBA (checklist de 1 página, pensada para captura de
      pantalla) → secciones que expanden cada línea → todo junto sobre un
      ejemplo real → EL HUECO A PROPÓSITO → autor.

EL HUECO A PROPÓSITO es el mejor patrón de cierre: di explícitamente qué NO
resuelve el recurso, y que eso es el producto.
  "La checklist arregla el documento, que es el paso 1. Saber quién decide y
   cuándo entrar es el paso 2, y ese paso 2 es Neety."
El CTA nace del hueco en vez de ser un "agenda una reunión" pegado al final.

Números de sección: van 00, 01, 02... Si una sección no es un paso (la del
autor), NO le pongas número. Una letra haciendo de número queda como un carácter
suelto al lado del título.

NO REPITAS EL NÚMERO dentro de la tarjeta si la cabecera de sección ya lo lleva.


================================================================================
19. CHECKLIST DE VERIFICACIÓN ANTES DE DAR NADA POR TERMINADO
================================================================================

  [ ] H1 y lede del gate: 2 y 3 líneas a 1440px; 2 y 4 líneas a 360px
  [ ] <em> del H1: 1 o 2 palabras
  [ ] Formulario a 360px: input a 16px, consentimientos a una línea, sin
      desbordes
  [ ] Escalera del titular: proporción entre 0,65 y 0,80
  [ ] Escalera del índice: primera fila más corta que la segunda
  [ ] Todos los huecos entre secciones iguales, medidos CONTENIDO a CONTENIDO
  [ ] Caracteres por línea: mediana ≤ 90 en todas las guías
  [ ] Maquetas de interfaz topadas (no estiradas al contenedor)
  [ ] El artefacto asoma al entrar (primer bloque .top < innerHeight)
  [ ] Índice en móvil: 0 items fuera de pantalla, sin scroll horizontal
  [ ] Bloques a 2 columnas colapsan a 1 en su breakpoint
  [ ] Sin desbordamiento horizontal a 1440 y a 360
  [ ] Cero guiones largos en todo el copy nuevo
  [ ] Toda cifra publicada tiene fuente
  [ ] Los tres registros dados de alta con el mismo literal
  [ ] robots.txt + noindex puestos los dos
  [ ] /<recurso>/guia/ redirige sin cookie y abre con ella (probado con Node)
  [ ] Todos los <script> del fichero parsean (probado con Node)
  [ ] La card N tiene su nth-child(N) de retardo


================================================================================
20. DOS APUNTES SOBRE EL PROMPT EN SÍ
================================================================================

PÍDELE QUE TE CONTRADIGA CON DATOS. Las mejores decisiones de este trabajo
salieron de que algo medible tumbara una decisión YA APROBADA: el titular de 93
caracteres que renderizaba a 4 líneas, el robots.txt que faltaba, el <em> de 7
palabras, los 152px de hueco. Si el prompt solo pide ejecutar, esas cuatro se
cuelan.

SEPARA LO QUE EL BRIEFING AFIRMA DE LO QUE SE PUEDE PUBLICAR. Un briefing puede
traer cifras sin origen ("+200 PYMEs", "+40% de conversión") y promesas que el
código no cumple ("te llega al correo en 2 minutos"). Las tres habrían salido
publicadas. Una línea del tipo:

  "Cualquier dato o promesa del briefing se verifica contra el código o contra
   una fuente antes de escribirlo. Si no se puede, se queda fuera y se avisa."

te ahorra ese riesgo.

================================================================================
