// Copy engine for the Lead Magnet tab.
//
// Everything here is DETERMINISTIC — no model call. A lead magnet reply is
// "Enviado!"; there's nothing for an LLM to reason about, and a template is
// instant, free, and can't drift off-brand. The variety that keeps it from
// reading like a bot comes from three cheap moves: rotate the variant, stretch
// a vowel, sometimes add one emoji.
//
// The AI path still exists in the panel, but only as an explicit button on the
// comments that actually earned it (someone who asked a real question next to
// the keyword) — that goes through the existing /generate endpoint.

// ─────────────────────────── keyword matching ───────────────────────────

// Strip accents + lowercase, so "MAPA" matches "mapa", "Mapa" and "mapá".
function normalize(s: string): string {
  // ̀-ͯ is the combining-diacritics block: after NFD, "á" is "a" +
  // U+0301, so dropping the block leaves the bare letter. Written as escapes
  // on purpose — literal combining marks here are invisible in a diff and
  // die on the first encoding mishap.
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Does this comment contain the keyword as a WHOLE WORD?
//
// Whole-word, not substring: "MAPA" must not match "mapamundi", and a keyword
// like "IA" would otherwise hit every "financiera" in the thread. The bounds
// are hand-rolled rather than \b because \b is ASCII-only in JS — it would
// break on a keyword with ñ or an accent.
export function matchesKeyword(text: string, keyword: string): boolean {
  const k = normalize(keyword).trim();
  if (!k) return false;
  const t = normalize(text);
  const isWordChar = (c: string | undefined) => !!c && /[a-z0-9]/.test(c);
  let from = 0;
  for (;;) {
    const i = t.indexOf(k, from);
    if (i === -1) return false;
    if (!isWordChar(t[i - 1]) && !isWordChar(t[i + k.length])) return true;
    from = i + 1;
  }
}

// ─────────────────────── recursos por palabra clave ───────────────────────
//
// La palabra clave que pides comentar YA dice qué recurso hay que mandar:
// "subvencion" solo puede llevar a la guía de la subvención. Así el panel no
// pide un campo de enlace a mano (un sitio menos donde pegar el link mal ni el
// tema): tú escribes la palabra y el DM sale con su enlace y su tema resueltos.
//
// La clave se normaliza (sin tildes, minúsculas) igual que matchesKeyword, así
// que "Subvención", "subvencion" y "SUBVENCION" resuelven el mismo recurso.
// Añadir una campaña nueva = una línea aquí, nada de tocar la UI.
export interface Recurso {
  link: string;
  // Rellena "el recurso sobre {t}" en el DM.
  topic: string;
}

// ⛔ EL CATALOGO ES LA FUENTE DE VERDAD, Y YA NO SE INDEXA POR PALABRA CLAVE
// (Iker, 2026-08-11).
//
// LinkedIn dejo de repartir el "comenta la palabra X" entre el 4 y el 5 de
// agosto de 2026 (`post-workflow §4.5.0-CTA`), asi que los posts nuevos NO
// nombran ninguna palabra: piden el recurso con una pregunta y se manda por
// privado a quien comente cualquier cosa. Sin palabra que teclear, el recurso
// tiene que salir del PROPIO POST, que es lo que hace `detectarRecurso`.
//
// Cada entrada lleva dos cosas para reconocerse:
//   · claves — las palabras que se pedian comentar cuando el gate existia. Se
//     conservan porque los posts VIEJOS siguen en la herramienta y se les
//     sigue mandando el recurso desde aqui.
//   · pistas — lo que el post PROMETE, que es como se reconoce un post nuevo.
//     Van sin tildes y en minusculas porque se comparan contra `normalize`.
interface RecursoDef extends Recurso {
  claves: string[];
  pistas: string[];
}

const CATALOGO: RecursoDef[] = [
  {
    // La palabra vuelve a ser `vibe` (2026-08-12), pero ya no vive en el texto:
    // va DENTRO de la imagen del post (post-workflow §4.5.0-CTA-IMAGEN), asi
    // que al post nuevo de Unai lo reconocen las PISTAS, no extractKeyword.
    // La clave se conserva igual por dos motivos: los comentarios que llegan
    // dicen "vibe" (lo pide el banner de la foto) y el 632c de abril sigue en
    // la herramienta con su comenta "vibe" dentro del texto.
    link: 'https://recursos.neety.com/vibe/',
    topic: 'cómo montar tu prospección con Claude',
    claves: ['vibe'],
    pistas: [
      'vibe prospecting', 'puerta fria', 'tumbar la prospeccion',
      'sistema completo', 'visto bueno',
    ],
  },
  {
    // ERRORES (Iker, 2026-08-26). Reedicion del recurso del 21/04, que paso de 8
    // errores a 5 y estreno la seccion del prompt de Claude. Igual que `vibe` y
    // `criba`, la palabra vive DENTRO de la imagen del post y no en el texto
    // (`post-workflow §4.5.0-CTA-IMAGEN`), asi que a este post lo reconocen las
    // PISTAS y no `extractKeyword`.
    //
    // ⛔ SIN ESTA ENTRADA EL PANEL SE QUEDA MUDO. `detectarRecurso` no habria
    // encontrado nada, `resolverRecurso` habria devuelto null, y con `recurso`
    // en null el boton de enviar el DM se BLOQUEA: el panel te pide el enlace a
    // mano con los comentarios entrando. Es el escenario que ya avisa la entrada
    // de `criba` unas lineas mas abajo, y aqui habria pasado por no dar de alta
    // el recurso, no por un empate.
    //
    // Las cinco pistas se eligieron comprobando DOS cosas contra el texto real
    // del post: que las cinco aparecen, y que ninguna pista de los otros seis
    // recursos casa con el (cero solapes medidos), asi que no puede haber empate.
    link: 'https://recursos.neety.com/errores/',
    topic: 'los 5 errores que dejan tus mensajes sin respuesta',
    claves: ['errores'],
    pistas: [
      'sacado los colores', 'marcados uno por uno', 'la frase de relleno',
      'peticiones metidas', 'ninguno es de redaccion',
    ],
  },
  {
    link: 'https://recursos.neety.com/subvencion-euskadi/',
    topic: 'la subvención de IA para industria vasca',
    claves: ['subvencion'],
    pistas: ['subvencion', 'ayuda publica', 'industria vasca', 'euskadi'],
  },
  {
    link: 'https://recursos.neety.com/prospeccion-manual/',
    topic: 'las señales que avisan de que una empresa va a comprar',
    claves: ['manual'],
    pistas: ['prospeccion manual', 'senales que avisan', 'va a comprar', 'senal de compra'],
  },
  {
    // La criba (Asier, 2026-08-14). Igual que `vibe`, la palabra vive DENTRO de
    // la imagen y no en el texto, asi que a este post lo reconocen las PISTAS.
    //
    // ⚠️ OJO AL SOLAPE CON LA ENTRADA DE ARRIBA: nuestro post dice "prospeccion
    // manual" en el gancho, que es pista de `/prospeccion-manual/`. Por eso las
    // de aqui son cuatro y todas exclusivas de este texto: gana por 4 a 1 y no
    // hay empate, que es lo unico que devolveria null y dejaria al panel
    // pidiendo el enlace a mano con 300 comentarios esperando.
    link: 'https://recursos.neety.com/criba/',
    topic: 'los 5 pasos para cribar tu lista de empresas',
    claves: ['criba'],
    pistas: [
      'la criba', 'lista corta', 'prueba que encaja',
      'enterrar la prospeccion', '5 pasos que sigo',
    ],
  },
  {
    // RIENDAS (Unai, 2026-08-18). Es la 1a REEDICION de un recurso del catalogo
    // (`post-workflow §4.5.0-REUTILIZAR`): el post estrena concepto pero la web
    // sigue siendo la de mayo, asi que la URL es `/llaves/` y NO `/riendas/`.
    //
    // Por eso esta entrada lleva las DOS claves:
    //   · `riendas` — la que pide el banner de la foto del post nuevo.
    //   · `llaves`  — la de los dos posts de mayo (285c y 232c), que siguen en
    //     la herramienta con su `comenta "llaves"` dentro del texto.
    // Las dos resuelven el mismo enlace, que es justo para lo que sirve tener
    // varias claves por entrada.
    //
    // ⚠️ El post del 18/08 NO nombra ninguna palabra en el texto: desde
    // `§4.5.0-CTA-CERO` el cuerpo no pide ninguna accion y la palabra vive solo
    // en el banner de la imagen. Asi que a ese post lo reconocen las PISTAS.
    // Comprobadas una a una contra las otras 5 entradas: cero solapes. Ojo con
    // los falsos amigos, que casi cuelan: nuestro texto dice "tumbarme el
    // borrador" (la pista de /vibe/ es "tumbar la prospeccion") y "monte un
    // sistema" (la de /vibe/ es "sistema completo"). Ninguna de las dos casa.
    link: 'https://recursos.neety.com/llaves/',
    topic: 'el sistema con Claude que critica mis borradores antes de publicar',
    claves: ['riendas', 'llaves'],
    pistas: [
      'las riendas', 'riendas de mi linkedin', 'las llaves de mi linkedin',
      'no pasan el filtro', '3 trabajos', 'lo hacia a ciegas',
    ],
  },
  {
    // PERFIL (Asier, 2026-09-17). Reedicion de /perfil/, que llevaba desde mayo
    // SIN entrada aqui: con el post nuevo, `detectarRecurso` habria devuelto null
    // y el boton del DM se habria bloqueado con los comentarios entrando.
    // Igual que `criba` y `errores`, la palabra vive DENTRO de la imagen del post
    // (`post-workflow §4.5.0-CTA-IMAGEN`), asi que al post lo reconocen las PISTAS.
    //
    // Las cinco se comprobaron contra el texto real del post (aparecen las
    // cinco) y contra los posts de los otros recursos (cero solapes). Ojo al
    // falso amigo: la guia se llama "landing page", pero el post no lo dice, asi
    // que no sirve de pista.
    link: 'https://recursos.neety.com/perfil/',
    topic: 'las 7 piezas para que tu perfil de LinkedIn venda',
    claves: ['perfil'],
    pistas: [
      'mi perfil no le vendia', 'montado como un curriculum', 'las 7 piezas',
      'escaparate de venta', 'el curriculum, para las entrevistas',
    ],
  },
  {
    // `firma` y `nombre` apuntaban al mismo sitio con dos entradas duplicadas:
    // el post se reescribio tres veces por un capado de alcance y la palabra
    // cambio, pero la pagina siguio siendo /firma/. Con el catalogo eso es una
    // sola entrada con dos claves, que es lo que siempre fue.
    link: 'https://recursos.neety.com/firma/',
    topic: 'los 5 mensajes para dar con quien cierra la compra',
    claves: ['firma', 'nombre'],
    pistas: [
      'quien firma', 'firma la compra', 'prospeccion por nombre',
      '5 mensajes', 'quien decide', 'con quien hablo',
    ],
  },
];

const RECURSOS: Record<string, Recurso> = Object.fromEntries(
  CATALOGO.flatMap((r) => r.claves.map((c) => [c, { link: r.link, topic: r.topic }]))
);

// El recurso de una palabra clave, o null si esa palabra no tiene uno mapeado
// todavía (entonces el panel avisa en vez de mandar un DM sin enlace).
export function recursoFor(keyword: string): Recurso | null {
  return RECURSOS[normalize(keyword).trim()] ?? null;
}

// El recurso de una palabra, con SALIDA MANUAL (Iker, 2026-08-07).
//
// Hasta ahora, si la palabra no estaba en el mapa, el panel avisaba y bloqueaba
// el envio: habia que esperar a que yo tocara este fichero. Eso paso de verdad
// un viernes a la una, con el post ya subido y la gente comentando.
//
// Ahora el panel deja escribir el enlace a mano y esto lo recoge. El mapa sigue
// mandando cuando existe —es donde vive el tema bien redactado y evita erratas—,
// pero nunca vuelve a ser un bloqueo.
export function resolverRecurso(keyword: string, link?: string, topic?: string): Recurso | null {
  const mapeado = recursoFor(keyword);
  if (mapeado) return mapeado;
  const l = (link || '').trim();
  if (!l) return null;
  // ⛔ ANTES DE DARLO POR "ESCRITO A MANO", MIRA EL ENLACE (Iker, 2026-08-14).
  //
  // Desde que el recurso se detecta por PISTAS y no por palabra (`detectarRecurso`),
  // el camino normal en un post nuevo es: sin palabra → aquí, con el enlace del
  // catálogo pero por la puerta del "a mano". Reconocerlo es lo que hace que el
  // tema bien redactado del catálogo mande sobre el de reserva.
  //
  // Se compara sin la barra final porque el enlace viaja de las dos formas.
  const limpio = l.replace(/\/+$/, '');
  const delCatalogo = CATALOGO.find((r) => r.link.replace(/\/+$/, '') === limpio);
  if (delCatalogo) {
    return {
      link: delCatalogo.link,
      // El tema escrito a mano sí manda: puede afinarlo para ese post.
      topic: (topic || '').trim() || delCatalogo.topic,
    };
  }
  // Sin tema, el DM diria "te dejo el recurso sobre " y se cortaria en seco, asi
  // que hay un texto de reserva en vez de dejar la frase coja.
  return { link: l, topic: (topic || '').trim() || 'lo que pediste en el post' };
}

// ────────────────── la palabra clave se saca del propio post ──────────────────
//
// El CTA del lead magnet SIEMPRE lleva la palabra entre comillas después de
// "comenta" — es regla dura del pilar y `scripts/validar-post.py` la exige antes
// de publicar. Así que el post ya sabe cuál es su palabra y no hay por qué
// teclearla a mano: se saca de aquí y el panel la prerrellena.
//
// Se busca desde el FINAL: el CTA vive en la última línea, y un post puede
// mencionar "comenta" antes de pasada (`§4.4`). Si hay varias, gana la última.
//
// Comillas: se aceptan las rectas y las tipográficas, porque LinkedIn convierte
// unas en otras según desde dónde se pegue el texto. Es el mismo motivo por el
// que `normalize` existe.
const CTA_KEYWORD = /comenta\w*\s+["“«']([^"”»']{2,30})["”»']/gi;

export function extractKeyword(postText: string | null | undefined): string {
  if (!postText) return '';
  let last = '';
  for (const m of postText.matchAll(CTA_KEYWORD)) last = m[1];
  return last.trim();
}

// ⛔⛔ ¿ESTE COMENTARIO ESTA CERRADO SIN HABER PEDIDO NADA? (Iker, 2026-08-25)
//
// Devuelve true cuando la persona **no pidio el recurso** y **ya le has
// contestado**: ahi no queda trabajo pendiente y no tiene que salir en «Para
// actuar».
//
// EL CASO QUE LO MOTIVA. En el post de la lista del 22/07, Josu Yuguero comenta
// para CORREGIR un dato de plantilla de DANOBAT. No pide nada, no escribe la
// palabra, y Unai ya le contesto — y aun asi el panel lo pintaba como el unico
// «1 para actuar» del post, con la maquinaria de entrega montada.
//
// ⚠️ Y LA SOSPECHA ERA OTRA, ASI QUE CONVIENE DEJARLO ESCRITO: parecia que
// alguna palabra del comentario, o la mencion a varias empresas, disparaba un
// trigger. **No hay tal trigger: `accionable` no lee el texto del comentario ni
// una vez.** Para alguien de 1er grado la regla era solo "¿tiene fila de envio?
// no -> hay trabajo", y Josu era el unico de los 18 sin fila porque a los otros
// 17 ya se les habia mandado algo. Por eso salia solo el, y solo en ese post.
//
// LAS TRES CONDICIONES SON A LA VEZ, Y CADA UNA TAPA UNA FORMA DE PERDER UN LEAD:
//
//  1. **El post TIENE palabra.** Desde el 05/08 el `Comenta "X"` vive en la FOTO
//     (`post-workflow §4.5.0-CTA-IMAGEN`), asi que los posts nuevos no la llevan
//     en el texto y `extractKeyword` devuelve ''. Sin esta condicion, la regla
//     cerraria a TODO el que este contestado en esos posts. **Eso es perder
//     leads en silencio, que es el peor modo de fallo: no da error, simplemente
//     no aparece.**
//  2. **No la escribio.** Palabra entera y sin tildes (`matchesKeyword`), asi que
//     "buen listado" no cuenta como pedir "lista".
//  3. **Ya esta contestado.** Es lo que lo hace seguro: hay gente que pide sin
//     escribir la palabra ("me interesa"), y mientras no le hayas contestado
//     sigue saliendo para que la mires. Solo se cierra cuando ya decidiste que
//     hacer con ella. Es el mismo criterio que ya usaba la regla del 3er grado
//     (`!puedeDm && answered_by_author`), extendido: la respuesta publica cierra
//     el caso tambien cuando la persona no pidio nada.
//
// MEDIDO SOBRE 4 LEAD MAGNETS REALES antes de escribirla: quita **7 falsos
// positivos de 16 accionables** y **no tumba ni una peticion de verdad**. Los
// que salen son todos opiniones ("Es muy complicado tener un perfil perfecto",
// "El museo de los horrores deberia ser obligatorio"); los que quedan son todos
// peticiones limpias ("Clientes marzo", "destripa ventas", "Clientes junio 🤩").
//
// ⚠️⚠️ ESTA REGLA VIVE EN DOS SITIOS y tienen que decir lo mismo: aqui, y en
// `/comments/pending` del backend (`backend/src/routes/accounts.ts`), que es
// quien pinta la chapa «N para actuar» de la fila plegada. Si cambias una y no
// la otra, la chapa dice 1 y debajo no aparece nadie — que es exactamente lo que
// paso el 21/08 con otra regla de este mismo panel.
export function cerradoSinPedirlo(
  text: string,
  keyword: string,
  answeredByAuthor: boolean
): boolean {
  if (!keyword.trim()) return false;
  if (!answeredByAuthor) return false;
  return !matchesKeyword(text || '', keyword);
}

// ────────────── el RECURSO se saca del post, sin palabra de por medio ──────────────
//
// Sustituye al campo "Palabra clave" del panel (Iker, 2026-08-11): *"ya no
// pedimos palabras, que se detecte automaticamente en base a la publicacion el
// enlace del lead magnet, ya nada de input"*.
//
// Dos pasadas, en este orden:
//   1. LA PALABRA, si el post la lleva. Los posts anteriores al 05/08/2026
//      siguen en la herramienta con su `comenta "X"` dentro, y ahi la palabra
//      es una firma exacta: mejor eso que adivinar por contenido.
//   2. LAS PISTAS. Se cuenta cuantas aparecen en el texto y gana la que mas
//      tenga. Un empate devuelve null a proposito: dos recursos igual de
//      probables es justo cuando NO hay que elegir por el usuario, porque el
//      precio de acertar es cero y el de fallar es mandarle a 400 personas el
//      enlace equivocado. El panel entonces pide el enlace a mano.
// ⛔ LA PALABRA QUE LA GENTE COMENTA, CUANDO NO ESTA EN EL TEXTO (Iker, 2026-08-26)
//
// Desde el 05/08 el `Comenta "X"` vive DENTRO de la foto, asi que `extractKeyword`
// devuelve '' en todos los posts nuevos. Pero la palabra EXISTE: es la que pide el
// banner, y es la `clave` del recurso que `detectarRecurso` acaba de identificar
// por pistas. Sin esto, el panel se queda sin saber que palabra estan comentando,
// y todo lo que cuelga de `cfg.keyword` se apaga: el aviso de "no lo ha pedido"
// salta en TODAS las tarjetas, `cerradoSinPedirlo` no cierra a nadie y el sector
// del tipo lista sale siempre vacio.
//
// El orden de resolucion queda: lo que este guardado a mano, luego el `comenta "X"`
// del texto si el post es viejo, y por ultimo la clave del recurso detectado.
export function claveDelPost(postText: string | null | undefined): string {
  const enElTexto = extractKeyword(postText);
  if (enElTexto) return enElTexto;
  if (!postText) return '';
  const t = normalize(postText);
  let mejor: RecursoDef | null = null;
  let mejorN = 0;
  let empate = false;
  for (const r of CATALOGO) {
    const n = r.pistas.filter((p) => t.includes(p)).length;
    if (n === 0) continue;
    if (n > mejorN) { mejor = r; mejorN = n; empate = false; }
    else if (n === mejorN) empate = true;
  }
  // Mismo criterio que `detectarRecurso`: con empate no se adivina.
  if (!mejor || empate) return '';
  return mejor.claves[0] || '';
}

export function detectarRecurso(postText: string | null | undefined): Recurso | null {
  if (!postText) return null;

  const porPalabra = recursoFor(extractKeyword(postText));
  if (porPalabra) return porPalabra;

  const t = normalize(postText);
  let mejor: RecursoDef | null = null;
  let mejorN = 0;
  let empate = false;
  for (const r of CATALOGO) {
    const n = r.pistas.filter((p) => t.includes(p)).length;
    if (n === 0) continue;
    if (n > mejorN) { mejor = r; mejorN = n; empate = false; }
    else if (n === mejorN) empate = true;
  }
  if (!mejor || empate) return null;
  return { link: mejor.link, topic: mejor.topic };
}

// ──────────────────────────── name extraction ────────────────────────────

// "Mario Carrillo Pérez" → "Mario". The DM opens with the first name, never
// the full display name (nobody says "Hola Mario Carrillo Pérez").
//
// Returns null when the name is unusable, and the caller then drops the name
// slot entirely rather than guessing — a mangled "Hola Ceo!" is worse than a
// plain "Holaaa!". Unusable means: emoji/decoration only, or an all-caps
// token that's really a title.
export function firstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  // Drop the noise people staple to their LinkedIn name: separators
  // ("| Growth @Acme"), parentheticals ("(she/her)"), and any emoji.
  // The separators and the emoji are two passes because they need
  // different matching — a literal set vs. the Unicode property. Emoji are
  // deliberately NOT listed literally: \p{Extended_Pictographic} already
  // covers every one of them, and spelling a few out by hand only invites
  // stray variation selectors into the character class.
  const cleaned = fullName
    .replace(/[|·•‣]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[\p{Extended_Pictographic}️]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const first = cleaned.split(' ')[0] || '';
  if (first.length < 2) return null;
  // Letters only (accents and ñ included) — rejects "CEO", "Dr.", "@handle".
  if (!/^[\p{L}][\p{L}'’-]*$/u.test(first)) return null;
  // ALL-CAPS multi-letter token → almost always a title, not a name.
  if (first.length > 1 && first === first.toUpperCase() && first !== first.toLowerCase()) return null;
  // Normalize "mario" → "Mario", per hyphen-separated part so "Jean-Luc"
  // survives as "Jean-Luc" instead of being flattened to "Jean-luc".
  return first
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join('-');
}

// ───────────────────────────── vowel stretching ─────────────────────────────

// "Hola" → "Holaaa", "Listo" → "Listooo". Stretches the LAST vowel of the
// word, which is where the emphasis naturally lands in Spanish. Same trick
// replyGenerator's RULE 12 asks the model for, done in code because here the
// input is a fixed vocabulary.
// `total` is how many copies of the vowel end up in the word, not how many
// get added: total=2 turns "Hola" into "Holaa".
function stretchLastVowel(word: string, total: number): string {
  const m = word.match(/^(.*?)([aeiouáéíóú])([^aeiouáéíóú]*)$/i);
  if (!m) return word;
  const [, head, vowel, tail] = m;
  // The EXTRA copies are lowercase, always. When the stretched vowel is a
  // capital ("Ep" — the vowel is the first letter), repeating it verbatim
  // gives "EEEp", which reads as shouting at someone we're cold-messaging.
  // "Eeep" is the thing a person actually types.
  return head + vowel + vowel.toLowerCase().repeat(Math.max(0, total - 1)) + tail;
}

// ─────────────────────────────── voice per founder ───────────────────────────

// Cuánto se alarga la vocal. Es un RASGO DE VOZ de la persona cuya cuenta
// publica, no un ajuste global, y va en escala:
//
//   sobrio (Unai) > medio (Asier) > cercano (Iker)
//
// Unai es el FUNDADOR: firma él y nuestro lector es un director industrial de
// ~50 años, así que "Holaaaa" no es él. Iker es el más cercano de los tres.
//
// TWIN: backend/src/services/replyGenerator.ts tiene la misma escala
// (voiceForAuthor) para las respuestas a comentarios. Son paquetes separados
// sin módulo común: si cambia el reparto, hay que tocar los dos.
export type Voice = 'sobrio' | 'medio' | 'cercano';

// Se compara por el nombre de pila porque es lo que guarda la tabla creators y
// lo que ya enseña la UI. Un desconocido cae en 'medio', que es el menos
// equivocado de los tres: una cuenta nueva nunca debe heredar en silencio la
// voz de otro.
export function voiceFor(creatorName: string | null | undefined): Voice {
  const first = (creatorName || '').trim().split(/\s+/)[0]?.toLowerCase();
  if (first === 'unai') return 'sobrio';
  if (first === 'iker') return 'cercano';
  return 'medio';
}

// ────────────────────────────── reply variants ──────────────────────────────

// The user's own list. `stretch: false` marks the ones where stretching reads
// wrong ("Revisa tu DM" → "Revisaaa tu DM" is not a thing anyone says).
const REPLY_VARIANTS: { text: string; stretch: boolean }[] = [
  { text: 'Enviado', stretch: true },
  { text: 'Ya está', stretch: false },
  { text: 'Ya lo tienes', stretch: false },
  { text: 'Hecho', stretch: true },
  { text: 'Mandado', stretch: true },
  { text: 'Listo', stretch: true },
  { text: 'Entregado', stretch: true },
  { text: 'Emitido', stretch: true },
  { text: 'Remitido', stretch: true },
  { text: 'Te lo he pasado', stretch: false },
  { text: 'Te lo he mandado', stretch: false },
  { text: 'Revisa tu DM', stretch: false },
  { text: 'Mira tu DM', stretch: false },
];

const REPLY_EMOJIS = ['🙌', '🔥', '💪', '✅', '🚀', '😊', '👌'];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// Build one reply. `recent` is the variants already used on THIS post — we
// avoid them so a run of 40 comments doesn't show "Enviado!" eight times in
// a row, which is the exact thing that makes it read as a bot. Once every
// variant is spent the caller resets the list.
export function buildReply(
  opts: { recent?: string[]; rng?: () => number; voice?: Voice } = {}
): { text: string; variant: string } {
  const rng = opts.rng ?? Math.random;
  const recent = opts.recent ?? [];
  const voice = opts.voice ?? 'medio';
  const pool = REPLY_VARIANTS.filter((v) => !recent.includes(v.text));
  const chosen = pick(pool.length > 0 ? pool : REPLY_VARIANTS, rng);

  let text = chosen.text;
  // Stretch roughly 2 of every 3 eligible replies — always is try-hard.
  if (chosen.stretch && rng() < 0.66) {
    // Unai y Asier paran en "Enviadoo"; Iker mantiene los 2-3 de siempre.
    const total = voice === 'cercano' ? 2 + Math.floor(rng() * 2) : 2;
    text = stretchLastVowel(text, total);
  }
  // "!" on about half. Some variants read better flat ("Ya está").
  if (rng() < 0.5) text += '!';
  // One emoji on about a third, never two.
  if (rng() < 0.35) text += ` ${pick(REPLY_EMOJIS, rng)}`;

  return { text, variant: chosen.text };
}

// ─────────────────── la respuesta que PIDE la solicitud ───────────────────
//
// Para quien no es contacto y no nos ha mandado solicitud. Desde el 2026-08-17 a
// esa gente no le mandamos NADA por privado: se retiraron la invitación con nota
// (gasta el cupo semanal, y en la cuenta de Unai está baneada desde el 14/08) y
// el InMail (créditos contados). El paso lo da ella.
//
// Las tres reglas del texto, y las tres son la diferencia entre que funcione o no:
//
//  · Se pide SOLICITUD DE CONTACTO, nunca un "sígueme". Un seguidor sigue siendo
//    de 2º o 3er grado y a ese LinkedIn no deja escribirle: pedir un follow es
//    tirar el lead con la sensación de haber hecho algo.
//  · Va con el PORQUÉ. Sin la excusa de LinkedIn se lee como un peaje que le
//    ponemos nosotros; con ella es una limitación de la plataforma, que todo el
//    mundo entiende. Lo eligió Iker sobre la versión seca.
//  · No promete nada que haya salido. Aquí un "te lo he mandado" es mentira, y es
//    exactamente el bug del 13/08 con otra cara.
const ASK_VARIANTS: string[] = [
  'Mándame solicitud y te lo paso, que LinkedIn no me deja escribirte si no somos contacto',
  'Te lo mando en cuanto me llegue tu solicitud, LinkedIn no me deja escribir a quien no es contacto',
  'No me deja LinkedIn escribirte sin ser contactos. Mándame solicitud y va para ti',
  'Mándame solicitud y te lo paso por privado, que si no somos contactos LinkedIn no me deja',
  'LinkedIn no me deja mandarte nada sin ser contactos. Échame la solicitud y te lo paso',
  'En cuanto me mandes solicitud te lo paso, que LinkedIn me lo bloquea si no somos contacto',
  'Te lo paso encantado, pero mándame antes solicitud: LinkedIn no me deja escribirte de otra forma',
  'Mándame la solicitud y te lo paso al privado, que LinkedIn no me deja escribir a quien no tengo agregado',
  'Necesito que me mandes tu solicitud para poder escribirte, cosas de LinkedIn. Y te lo paso',
  'Si me mandas solicitud te lo paso por privado, LinkedIn no me deja hacerlo de otra manera',
];

// Una petición. `recent` son las variantes ya usadas en ESTE post, por lo mismo
// que en buildReply: 40 comentarios con la misma frase es lo que hace que se lea
// como un bot.
//
// Sin estirar vocales y sin nombre delante, a diferencia de buildReply: la frase
// ya es larga, y "Marta mándame solicitud y te lo paso, que LinkedIn…" se lee como
// una plantilla de mail merge justo en el momento en que le estamos pidiendo algo.
export function buildAskReply(
  opts: { recent?: string[]; rng?: () => number; voice?: Voice } = {}
): { text: string; variant: string } {
  const rng = opts.rng ?? Math.random;
  const recent = opts.recent ?? [];
  const pool = ASK_VARIANTS.filter((v) => !recent.includes(v));
  const chosen = pick(pool.length > 0 ? pool : ASK_VARIANTS, rng);
  // Un emoji en un tercio, como en buildReply: pedir algo a secas suena seco.
  const text = rng() < 0.33 ? `${chosen} ${pick(REPLY_EMOJIS, rng)}` : chosen;
  return { text, variant: chosen };
}

// ────────────────────────────── regional greeting ──────────────────────────

// Region-aware greeting, ONLY when the profile location is unambiguous.
//
// The location LinkedIn gives us is free text the person typed ("Bilbao y
// alrededores", "Greater Barcelona Area"), so this is a whitelist of cities
// and provinces, not a parser. Anything not on the list → neutral. That's the
// deliberate bias: a "kaixo" to someone who isn't from Euskadi lands worse
// than a plain "holaaa", and the DM is the door to the lead — not the place
// to be clever. The greetings themselves are the soft, everyday ones ("ep",
// "kaixo"), never the formal ones.
const REGIONS: { keys: string[]; greetings: string[] }[] = [
  {
    keys: ['bilbao', 'bizkaia', 'vizcaya', 'donostia', 'san sebastian', 'gipuzkoa',
           'guipuzcoa', 'vitoria', 'gasteiz', 'araba', 'alava', 'euskadi',
           'pais vasco', 'basque country', 'getxo', 'barakaldo', 'irun'],
    greetings: ['Kaixo', 'Aupa'],
  },
  {
    keys: ['barcelona', 'girona', 'gerona', 'lleida', 'lerida', 'tarragona',
           'catalunya', 'cataluna', 'catalonia', 'sabadell', 'terrassa',
           'badalona', 'hospitalet', 'manresa', 'reus'],
    greetings: ['Ep', 'Bon dia'],
  },
  {
    keys: ['valencia', 'valència', 'castellon', 'castello', 'alicante',
           'alacant', 'comunitat valenciana', 'comunidad valenciana', 'gandia',
           'elx', 'elche'],
    greetings: ['Ei', 'Bon dia'],
  },
];

const NEUTRAL_GREETINGS = ['Hola', 'Ey'];

// Pick the greeting word (no name yet, no stretching yet).
function baseGreeting(location: string | null | undefined, rng: () => number): string {
  if (location) {
    const loc = normalize(location);
    for (const r of REGIONS) {
      // Whole-word check so "Alava" doesn't fire on "Palavas".
      if (r.keys.some((k) => matchesKeyword(loc, k))) {
        // Even on a hit, stay neutral a third of the time: two DMs to the
        // same city shouldn't both open in Basque, and it keeps the whole
        // batch from reading as a mail merge with a locale column.
        if (rng() < 0.66) return pick(r.greetings, rng);
        return pick(NEUTRAL_GREETINGS, rng);
      }
    }
  }
  return pick(NEUTRAL_GREETINGS, rng);
}

// "Hola" → "Holaaa" / "Holaa". Stretching the greeting is what turns a dry
// mail-merge open into something a person would type. For "Ey" the letter that
// stretches is the y, not a vowel, so it's handled apart.
//
// `total` counts the final letters, so it lines up with buildReply. Sober is a
// flat 2 ("Holaa", "Eyy", "Kaixoo"); 'cercano' (Iker) keeps 3–4, which is what this has
// always produced.
function stretchGreeting(g: string, rng: () => number, voice: Voice): string {
  const total = voice === 'cercano' ? 3 + Math.floor(rng() * 2) : 2;
  if (/y$/i.test(g)) return g + 'y'.repeat(Math.max(0, total - 1));
  return stretchLastVowel(g, total);
}

// ──────────────────────────────── DM variants ────────────────────────────────

// Shapes for the private message, built from the reference the user gave:
//   "Hola XXNOMBREXX! Te dejo el recurso sobre XXTEMAXX por aquí: XXENLACEXX
//    Espero que te sirva XXEMOJIXX"
// Same skeleton (greeting → here's the resource → link → sign-off), reworded
// so a batch doesn't read identical. `{t}` is the topic.
//
// The link is NOT in these strings — it goes on its own line (see buildDm).
// A URL is one unbreakable token, and LinkedIn's message pane drops it onto
// a new line together with whatever word precedes it, so "…comercial por /
// aquí: <link>" is what the recipient actually sees. Owning the break means
// LinkedIn has nothing left to wrap, and a link on its own line is how a
// person sends one anyway.
const DM_BODIES = [
  'Te dejo el recurso sobre {t} por aquí:',
  'Aquí lo tienes, el recurso sobre {t}:',
  'Va para ti el recurso sobre {t}:',
  'Como te prometí, el recurso sobre {t}:',
  'Te paso el recurso sobre {t}:',
];

const DM_SIGNOFFS = [
  'Espero que te sirva',
  'Espero que te venga bien',
  'Ojalá te sea útil',
  'Cualquier cosa me dices',
  'Me cuentas qué te parece',
];

const DM_EMOJIS = ['🙌', '💪', '🚀', '😊', '🔥', '👌'];

export interface DmInput {
  name: string | null;
  location?: string | null;
  topic: string;
  link: string;
  // Whose account is writing. Defaults to 'medio' so a caller that forgets it
  // gets the long-standing behaviour, never a voice that isn't theirs.
  voice?: Voice;
  rng?: () => number;
}

// The full private message. The greeting carries the first name when we could
// extract one; when we couldn't, the greeting stands alone ("Holaaa!") rather
// than risking a wrong name.
export function buildDm(input: DmInput): string {
  const rng = input.rng ?? Math.random;
  const g = stretchGreeting(baseGreeting(input.location, rng), rng, input.voice ?? 'medio');
  const name = firstName(input.name);
  const open = name ? `${g} ${name}!` : `${g}!`;
  // replaceAll with a function: a plain string replacement would interpret
  // "$&"/"$'" inside the topic as substitution patterns.
  const body = pick(DM_BODIES, rng).replaceAll('{t}', () => input.topic);
  const signoff = `${pick(DM_SIGNOFFS, rng)} ${pick(DM_EMOJIS, rng)}`;
  // Link on its own line, sign-off after a blank one. See DM_BODIES for why
  // the link can't share a line with the text.
  return `${open} ${body}\n${input.link}\n\n${signoff}`;
}

// ⛔ AQUÍ ESTABAN `buildInviteNote`, `buildInmail` y `asuntoInmail`, y se
// borraron a propósito (Iker, 2026-08-17).
//
// Eran los dos canales para quien no es contacto: la invitación con nota (el
// enlace iba DENTRO de la nota, tope 300 caracteres) y el InMail con asunto.
// Se retiraron los dos: el cupo semanal de invitaciones se acaba, en la cuenta de
// Unai están baneadas desde el 14/08, y los créditos de InMail son pocos. Ahora a
// esa gente se le pide la solicitud con `buildAskReply` y el recurso sale por DM
// cuando la manda.
//
// Antes de reescribir cualquiera de las tres, leer el spec:
// `docs/superpowers/specs/2026-08-17-pedir-solicitud-lead-magnet-design.md`.
// No se quitaron por un bug, se quitaron por una decisión.

// ──────────────────────────── lista personalizada ───────────────────────────
//
// El lead magnet "lista": la persona comenta «lista» + su sector, y le mandamos
// por DM una lista de empresas reales de ese sector. El backend
// (/lead-magnet/lista) trae las empresas reales; aquí se extrae el sector del
// comentario y se formatea el DM en la voz de la cuenta, como el resto del panel.

export interface ListaCompany {
  name: string;
  zona: string | null;
  linkedinUrl: string;
}

// "lista automoción porfa" → "automoción". Quita la palabra clave y el relleno,
// deja lo que la persona escribió como sector. Conserva acentos (usa la palabra
// original, no la normalizada) porque la búsqueda de Unipile los tolera y se ve
// mejor en el DM. Vacío si solo comentó la palabra clave.
export function extractSector(text: string, keyword: string): string {
  const k = normalize(keyword).trim();
  const raw = (text || '').trim();
  if (!raw) return '';
  // ⛔ SIN LA PALABRA CLAVE NO HAY SECTOR, Y ESTO ES LA PRECONDICION QUE SE
  // ROMPIO SOLA (Iker, 2026-08-25).
  //
  // Esta funcion nacio el 22/07, cuando la lista de comentarios estaba FILTRADA
  // por la palabra: todo lo que le llegaba era, por construccion, una peticion
  // del recurso, asi que "quitale la palabra y el relleno, lo que quede es el
  // sector" era correcto. El 11/08 se quito ese filtro a proposito (05d2ea0,
  // "se acabo la palabra clave") porque con el gate muerto nadie la escribe y
  // filtrar dejaba la lista vacia con 400 comentarios debajo. **La precondicion
  // desaparecio y esto se quedo asumiendola.**
  //
  // Desde entonces, a quien NO pide nada se le extraia el comentario ENTERO
  // como sector. Caso real del post de la lista del 22/07: Josu Yuguero corrige
  // un dato de plantilla de DANOBAT y acaba con el sector "Unai muchas ayudar
  // tantas personas. pequeno apunte. DANOBATGROUP formada SORALUCE Milling…",
  // y con el boton de "Generar lista" activo para mandarle una lista que no
  // habia pedido. Medido en ese post: 15 de 18 comentarios llevan la palabra y
  // dan un sector de verdad; los 3 que no la llevan son EXACTAMENTE los tres
  // que no piden nada (la correccion de Josu y dos apoyos de los jefes).
  //
  // Vacio es la respuesta honesta, y ademas desactiva solo el boton de generar
  // (`disabled={!sector.trim()}`). El campo es editable: si alguien pide la
  // lista sin escribir la palabra, se teclea a mano — que es infinitamente
  // mejor que mandarle a Unipile media frase como si fuera un sector.
  //
  // `matchesKeyword` es el mismo comparador que usa el resto del panel (palabra
  // entera, sin tildes) y ya devuelve false con la clave vacia, que es el otro
  // caso sin señal: en un post nuevo `cfg.keyword` es '' y ahi no se puede
  // saber si el comentario pide algo.
  if (!matchesKeyword(raw, keyword)) return '';
  const kept = raw.split(/\s+/).filter((w) => {
    const n = normalize(w).replace(/[^\p{L}\p{N}]/gu, '');
    if (!n) return false;
    if (n === k) return false;
    return !FILLER.has(n);
  });
  // Deja letras/números/espacios y los separadores que un sector real puede
  // llevar ("i+d", "auto-moción"); fuera emoji y puntuación suelta.
  return kept.join(' ').replace(/[^\p{L}\p{N}\s+.&/-]/gu, '').replace(/\s+/g, ' ').trim();
}

// "https://www.linkedin.com/company/gestamp/" → "linkedin.com/company/gestamp",
// que es como se lee un enlace en un DM sin ocupar dos líneas.
function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

export interface ListaInput {
  name: string | null;
  sector: string;
  companies: ListaCompany[];
  location?: string | null;
  voice?: Voice;
  rng?: () => number;
  // true cuando este DM es el SEGUIMIENTO de una invitación ya aceptada: la
  // persona comentó, le respondimos y le mandamos la nota prometiéndole la lista
  // al aceptar. Ahora que es 1er grado, el DM ENTREGA lo prometido — no reabre la
  // conversación con un saludo de cero (ya la tuvimos).
  followup?: boolean;
}

// El "spam ninja" del DM. El lead magnet "lista" NO crea web ni gate, así que el
// DM es el único sitio donde capturar hacia producto: sin esto regalamos la
// lista y no llevamos a nadie a ningún lado (el error del 8.52x "desmonto
// perfiles" — se hizo viral y capturó CERO). Apunta a `agendar`, el destino
// canónico del spam ninja (global §4.4b).
//
// Diferencia clave con el POST: en el post público el lead magnet NO lleva spam
// ninja (apilaría CTAs y hundiría los comentarios, global §4.4b). Aquí es un DM
// PRIVADO a alguien que ya comentó y ya tiene su recurso, así que un funnel al
// final no compite con nada. Y nombrar Neety SÍ vale: es un mensaje personal,
// no un post (donde la marca delataría el guiño). Una sola mención, sin vender
// (brand-voice §4). Cierra el "a quién" que da la lista con el "cuándo" que es
// justo lo que hace el producto.
// El enlace va con https:// (no la versión "bonita" sin protocolo): LinkedIn
// solo genera la tarjeta de preview del recurso si el enlace lleva https. Los 15
// de las empresas van SIN protocolo a propósito (prettyUrl), para que no compitan
// por la preview y la tarjeta que salga sea la de señales.
const NINJA_DM =
  'PD: la lista es a quién vender. Cuándo escribirle a cada una (la señal que dispara la compra) lo tienes aquí: https://recursos.neety.com/senales';

// El DM con la lista entera, para 1er grado. Abre con el saludo regional (mismo
// que buildDm), dice el número REAL de empresas (no "15" fijo), lista cada una
// con su zona y su LinkedIn, y cierra con el spam ninja hacia agendar.
export function buildListaDm(input: ListaInput): string {
  const rng = input.rng ?? Math.random;
  const g = stretchGreeting(baseGreeting(input.location, rng), rng, input.voice ?? 'medio');
  const name = firstName(input.name);
  const open = name ? `${g} ${name}!` : `${g}!`;
  const n = input.companies.length;
  const cuenta = n === 1
    ? '1 empresa activa a la que puedes vender, con dónde está y su LinkedIn'
    : `${n} empresas activas a las que puedes vender, con dónde están y su LinkedIn`;
  // Follow-up: no se re-saluda. Entrega lo prometido en la nota, referenciándolo
  // ("la que te prometí"), que es lo que hace que se lea como continuación y no
  // como un mensaje frío nuevo. Cold (1er grado directo, sin invitación previa):
  // saludo normal, es el primer contacto por privado.
  const intro = input.followup
    ? `${name ? name + ', ' : ''}aquí va la lista de ${input.sector} que te prometí.\n${cuenta}:`
    : `${open} Aquí tienes tu lista de ${input.sector}.\n${cuenta}:`;
  const lines = input.companies
    .map((c) => `→ ${c.name}${c.zona ? ` · ${c.zona}` : ''}\n   ${prettyUrl(c.linkedinUrl)}`)
    .join('\n');
  const close = 'Escríbeles por lo que venden, no por el nombre: es lo que abre la puerta.';
  return `${intro}\n\n${lines}\n\n${close}\n\n${NINJA_DM}`;
}

// ⛔ AQUÍ ESTABA `buildListaInvite`, y se borró a propósito (2026-08-17).
//
// Montaba la nota de invitación de la lista: un ADELANTO con los primeros nombres
// que cupieran en 300 caracteres y "y N más", y la lista entera salía por DM al
// aceptar. Con la invitación retirada ya no hay nota que llenar: a quien no es
// contacto se le pide la solicitud, la lista completa se guarda montada como
// follow-up y sale entera en cuanto la manda. Un adelanto de 300 caracteres era
// una limitación de la nota, no algo que quisiéramos.

// Words that are NOT content: someone typing "MAPA porfa gracias!!" wrote the
// keyword and nothing else, however many words it technically is.
const FILLER = new Set([
  'porfa', 'porfavor', 'favor', 'por', 'gracias', 'graciass', 'grac', 'plis',
  'please', 'quiero', 'me', 'lo', 'la', 'el', 'interesa', 'interesada',
  'interesado', 'apunto', 'apuntado', 'yo', 'tambien', 'gustaria', 'dale',
  'va', 'vamos', 'si', 'sii', 'claro', 'genial', 'top', 'crack', 'grande',
  'gran', 'buen', 'bueno', 'buena', 'brutal', 'mucho', 'muy', 'un', 'una',
  'y', 'a', 'de', 'que', 'en', 'con', 'para', 'mil', 'eso', 'esto',
]);

// Does this comment deserve a written answer, or is "Enviado!" the whole of it?
//
//   'plain' — the keyword and nothing more ("MAPA", "MAPA porfa!", "MAPA 🙌").
//             The template IS the right answer; there's nothing to engage with.
//   'rich'  — they wrote something real next to the keyword: a question, an
//             opinion, their own experience. This is the best comment on the
//             post and answering it with "remitido!" wastes it.
//
// Rich is deliberately NOT "has a question mark". Plenty of the best comments
// never ask anything — they tell you something. So the test is whether any
// CONTENT survives once the keyword, the punctuation, the emoji and the
// filler are stripped out.
export function commentDepth(text: string, keyword: string): 'plain' | 'rich' {
  let rest = normalize(text);
  // Remove every occurrence of the keyword, not just the first.
  const k = normalize(keyword).trim();
  if (k) rest = rest.split(k).join(' ');
  const words = rest
    .replace(/[\p{Extended_Pictographic}️]/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FILLER.has(w));
  // A question is rich even if short ("¿cubre Gipuzkoa?" → 2 content words),
  // because a question demands an answer no template can give.
  if (/[?¿]/.test(rest) && words.length >= 1) return 'rich';
  return words.length >= 3 ? 'rich' : 'plain';
}
