import { trackedCreate } from './claudeClient';
import pool from '../db';

// ⛔⛔ VARIEDAD DE CONCEPTO, NO SOLO DE APERTURA (Iker, 2026-10-01)
//
// *"Cuando respondo a comentarios de publicaciones de peloteo siempre me
// generas comentarios que hablan de lo mismo, siempre del silencio, antes de
// que nadie los pusiese en el mapa... necesito conceptos más originales"*.
//
// MEDIDO el 01/10 sobre lo publicado (Unipile), no supuesto:
//   · respuestas a comentarios de peloteos: 3 de 3 en "Las 10" de CLM, 4 de 5
//     en el despiece de Bizkaia y 7 de 12 en el mapa de Extremadura repiten la
//     TESIS del post ("nadie lo ve", "en silencio", "debajo del radar", "antes
//     de que nadie hablara de..."). Y 2 de 3 en CLM, el mismo dato: "silos en
//     150 paises".
//   · respuestas del video de Unai del 30/09: 3 de 3, "no saber a quien llamar".
//   · Google Chat de "Las 10": 4 de 5 la misma idea, y el quinto, "Qué post más
//     necesario." (23 caracteres).
//
// LA CAUSA es la de siempre en estos generadores, pero un piso mas arriba: lo
// que se sorteaba era la FORMA (el movimiento retorico, la primera palabra), y
// el CONTENIDO lo decidia el modelo, que con el mismo post delante cae siempre
// en lo mas fuerte del post, su tesis. La unica memoria entre respuestas eran
// las 4 primeras palabras (`APERTURAS_POR_POST`): la idea no la recordaba nadie.
// Y en Google Chat los siete angulos colgaban de "la idea principal del post".
//
// EL ARREGLO, en las tres capas de la casa: el prompt ASIGNA de que parte
// concreta del post va cada uno (y nombra la tesis como ya dicha), el codigo
// le pasa a la respuesta lo que ya se contesto en ese post, y este fichero
// COMPRUEBA la salida.

function llano(t: string): string {
  return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ─────────────────────────── familias de concepto ───────────────────────────
//
// Las ideas que de verdad salen en bucle, cada una con las formas REALES en
// que salio. No es una lista negra: una de ellas en una tanda es apoyo normal.
// Lo que se caza es la SEGUNDA (`familiaRepetida`, `familiaEnTanda`).
export type FamiliaId = 'invisible' | 'a_quien_llamar';

export const FAMILIAS: { id: FamiliaId; nombre: string; re: RegExp }[] = [
  {
    id: 'invisible',
    nombre: 'que nadie lo ve (en silencio, fuera del radar, sin titulares, desde la autovia)',
    re: /(en silencio|en la sombra|entre bambalinas|sin hacer ruido|sin que (nadie|lo|la|los|las|se) |antes de que nadie|(que|porque|y|pero) nadie (lo |la |los |las )?(ve|veia|vea|mira|miraba|cuenta|contaba|conoce|conocia|habla|hablaba|fotografia|visualiza|sabe|sabia|ponia|habia puesto|recuerda)\b|nadie (se para|lo ve|lo cuenta|lo visualiza|habla de)|(fuera|debajo|bajo|por debajo) del? radar|lejos de los focos|sin focos|el foco (va|se va|se lo lleva|se lo llevan|esta|siempre)|(menos|ninguna|ningun|sin) (portadas?|titulares?|reportajes?|folletos?)\b|(no|tampoco|nunca) (sale|salen|aparece|aparecen) en (ningun|ninguna|los|las)\b|(se )?llevan? (todas )?las miradas|acapara(n)? (las miradas|el foco|la atencion)|desapercibid|pasan? de largo|no se ven?\b|(mas alla|desde) (de )?(la|el) (autovia|ventanilla|carretera|tren)\b|no (es )?solo (el )?paisaje|despiste|infravalorad|subestimad|lo que no se cuenta)/,
  },
  {
    id: 'a_quien_llamar',
    nombre: 'saber a quien llamar (el que decide, el decisor)',
    re: /(a quien ([a-z]+ ){0,3}llama|que decide|(dar|das|dio|des) con (el|la) que|el nombre de quien|saber a quien|decisor)/,
  },
];

export function familiasDe(texto: string): FamiliaId[] {
  const t = llano(texto);
  return FAMILIAS.filter((f) => f.re.test(t)).map((f) => f.id);
}

/**
 * La familia del candidato si ya sale en `previas` `tope` veces o mas. Las
 * previas son las ultimas respuestas del MISMO post: quien lo decide es el que
 * llama, con la ventana que quiera.
 */
export function familiaRepetida(
  candidato: string,
  previas: string[],
  tope = 1
): { id: FamiliaId; nombre: string } | null {
  for (const id of familiasDe(candidato)) {
    const veces = previas.filter((p) => familiasDe(p).includes(id)).length;
    if (veces >= tope) {
      const f = FAMILIAS.find((x) => x.id === id)!;
      return { id, nombre: f.nombre };
    }
  }
  return null;
}

/** En una tanda (Google Chat), la familia que sale mas de `tope` veces. */
export function familiaEnTanda(
  textos: string[],
  tope = 1
): { id: FamiliaId; nombre: string; veces: number } | null {
  for (const f of FAMILIAS) {
    const veces = textos.filter((t) => f.re.test(llano(t))).length;
    if (veces > tope) return { id: f.id, nombre: f.nombre, veces };
  }
  return null;
}

/**
 * El dato que el candidato repite de otra respuesta del post. Los numeros
 * pequenos (3 numeros, Las 10, 20 empresas) son el formato, no un dato. Si el
 * numero lo trae el propio comentario, recogerlo es contestarle.
 */
export function datoRepetido(candidato: string, previas: string[], comentario = ''): string | null {
  const nums = (t: string) => (llano(t).match(/\d+(?:[.,]\d+)?/g) || []).filter((n) => parseFloat(n.replace(',', '.')) > 20);
  const usados = new Set(previas.flatMap(nums));
  const delComentario = new Set(nums(comentario));
  return nums(candidato).find((n) => usados.has(n) && !delComentario.has(n)) || null;
}

// EL MISMO DETALLE (prueba en produccion del 01/10, ya con lo de arriba): en
// "Las 10" dos de cinco se fueron a "Kenia, 26 veces", y dos respuestas
// seguidas a "los cuchillos de Albacete". No es la tesis, pero se lee igual de
// repetido. Detalle = nombre propio en mitad de frase o numero de mas de 20.
function detalles(t: string, excluir: Set<string>): Set<string> {
  const out = new Set<string>();
  const palabras = [...(t || '').matchAll(/[\p{L}\d][\p{L}\d.,'’-]*/gu)];
  palabras.forEach((m, k) => {
    const w = m[0].replace(/[.,]+$/, '');
    const antes = (t || '').slice(0, m.index ?? 0);
    if (/^\d/.test(w)) {
      if (parseFloat(w.replace(',', '.')) > 20) out.add(w);
      return;
    }
    if (k === 0 || /[.!?…]\s*$/.test(antes)) return;
    if (!/^\p{Lu}\p{Ll}{3,}/u.test(w)) return;
    const l = llano(w);
    if (!excluir.has(l)) out.add(l);
  });
  return out;
}

function excluidos(nombres: (string | null | undefined)[]): Set<string> {
  return new Set(nombres.filter(Boolean).flatMap((n) => llano(n as string).split(/[\s-]+/)));
}

/** En una tanda, el detalle (nombre propio o dato) que sale en dos o mas. */
export function detalleRepetidoEnTanda(textos: string[], excluir: (string | null | undefined)[] = []): string | null {
  const ex = excluidos(excluir);
  const veces = new Map<string, number>();
  for (const t of textos) for (const d of detalles(t, ex)) veces.set(d, (veces.get(d) || 0) + 1);
  return [...veces.entries()].find(([, v]) => v > 1)?.[0] ?? null;
}

/**
 * El nombre propio que el candidato repite de las respuestas anteriores. Si lo
 * trae el que comenta, recogerlo es contestarle.
 */
export function nombreRepetido(
  candidato: string,
  previas: string[],
  comentario = '',
  excluir: (string | null | undefined)[] = []
): string | null {
  const ex = excluidos(excluir);
  for (const d of detalles(comentario, ex)) ex.add(d);
  for (const w of (comentario.match(/\p{L}+/gu) || [])) ex.add(llano(w));
  const usados = new Set(previas.flatMap((p) => [...detalles(p, ex)]));
  return [...detalles(candidato, ex)].find((d) => usados.has(d) && !/^\d/.test(d)) ?? null;
}

// ⛔ EL NOMBRE QUE NO ESTA EN NINGUN SITIO (prueba del 01/10): "Ajusa exporta
// desde Yecla" (es de Albacete, y el post no dice de donde es) o "Señorío de
// Montanera vende a media Europa". El juez de Haiku se dejo el primero. Un
// nombre propio que no sale ni en el post ni en el comentario lo ha puesto el
// modelo: se vuelve a pedir. Lo de la casa (Neety, el evento) no cuenta.
const NOMBRES_DE_CASA = new Set(['linkedin', 'neety', 'forward', 'donostia']);
export function nombreAjeno(
  cuerpo: string,
  fuentes: string,
  comentario = '',
  excluir: (string | null | undefined)[] = []
): string | null {
  const fuente = llano(`${fuentes} \n ${comentario}`);
  const ex = excluidos(excluir);
  // Por la raiz tambien: "Vasco" con "industria vasca" en el comentario (ronda 7).
  const consta = (d: string) => fuente.includes(d) || (d.length > 4 && fuente.includes(d.slice(0, -1)));
  return [...detalles(cuerpo, ex)].find((d) => !/^\d/.test(d) && !NOMBRES_DE_CASA.has(d) && !consta(d)) ?? null;
}

// ⛔ LA CIFRA QUE NO ESTA EN EL POST (prueba del 01/10): "un millón de
// personas vendiendo más que cuatro millones" (Moldavia: el post solo dice
// "más del doble de gente", y es falso). En digitos y en letra delante de una
// magnitud. Se compara por numero entero, no por trozo: "4" no esta en "4.074".
const EN_LETRA: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100, mil: 1000,
};
export function cifraNueva(c: string, fuentes: string): string | null {
  const f = llano(fuentes);
  const t = llano(c);
  const numeros = (x: string) => (x.match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/[.,]+$/, ''));
  const delPost = new Set(numeros(f));
  const nueva = numeros(t).find((n) => !delPost.has(n));
  if (nueva) return nueva;
  for (const m of t.matchAll(/\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cuarenta|cincuenta|cien|mil)\s+(millon|millones|mil|veces|personas|paises|empresas|habitantes|euros)\b/g)) {
    if (!f.includes(m[0]) && !delPost.has(String(EN_LETRA[m[1]]))) return m[0];
  }
  return null;
}

/**
 * "exactamente" en mitad de frase (prueba del 01/10: "es exactamente lo que
 * falla", "pasa exactamente igual") es tic de IA: la gente dice "justo", o
 * nada. Se arregla en codigo, sin gastar otro intento.
 */
export function quitarExactamente(t: string): string {
  return (t || '')
    .replace(/\bexactamente igual\b/gi, 'igual')
    .replace(/\bexactamente (lo que|la que|el que|eso|esto|ahi|ahí|aqui|aquí|asi|así)\b/gi, 'justo $1')
    .replace(/\s*\bexactamente\b/gi, '');
}

// INGLES COLADO (ronda 3 del 01/10: "mientras others cocinaban"). Palabras
// funcionales inglesas que en castellano no existen; si estan en el post (una
// marca, "Tomato Paste and Tomato Powder"), no cuentan.
const INGLES = /\b(others|the|and|with|while|which|really|very|people|because|about|their|they|anyway|actually)\b/;
export function inglesColado(c: string, fuentes = ''): string | null {
  const m = llano(c).match(INGLES);
  if (!m) return null;
  return new RegExp(`\\b${m[1]}\\b`).test(llano(fuentes)) ? null : m[1];
}

const FUNCIONALES = new Set(['a', 'al', 'de', 'del', 'el', 'la', 'lo', 'los', 'las', 'en', 'y', 'e', 'o', 'un', 'una', 'con', 'por', 'para', 'que', 'se', 'su', 'sus', 'mi', 'tu', 'yo']);

/**
 * ¿Es un nombre propio? Siglas, el nombre de alguien de la conversacion, o una
 * palabra que en las fuentes va en mayuscula EN MITAD DE FRASE (detras de una
 * minuscula). A principio de linea no cuenta: en el meme del 01/10 "Nadie"
 * solo salia asi, se tomo por nombre propio y salio "Tal cuaal, Nadie mete...".
 */
export function esNombrePropio(w: string, fuentes = '', nombres: (string | null | undefined)[] = []): boolean {
  // Un articulo o una preposicion sola nunca lo es, aunque abra el nombre de
  // una empresa (ronda 8: "→ La Chinata" dio "ciertoo La feria").
  if (FUNCIONALES.has(llano(w))) return false;
  if (/^\p{Lu}{2,}/u.test(w)) return true;
  if (nombres.some((n) => (n || '').split(/\s+/).includes(w))) return true;
  const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Detras de una minuscula EN LA MISMA LINEA, o detras de "→ " / " - " como
  // en nuestras listas de empresas. Un salto de linea no es mitad de frase
  // (ronda 7: "...Óscar García Vega⏎⏎Lo que no cabe" dio "Tal cuaal Lo de...").
  return new RegExp(`(?:\\p{Ll}[,;]?[ \\t]+|→[ \\t]*|[ \\t]-[ \\t]+)${esc}(?![\\p{L}])`, 'u').test(fuentes);
}

/**
 * `forzarEstirada` baja la primera letra de lo que sigue a la alargada, y con
 * un nombre propio sale "Tal cuaal, kenia con 26 veces" (ronda 3). Si esa
 * palabra va en mayuscula en el post y nunca en minuscula, se le devuelve.
 */
export function conservarMayuscula(forzada: string, original: string, fuentes: string): string {
  const w = (original.trim().match(/^\p{Lu}\p{Ll}+/u) || [])[0];
  if (!w || !esNombrePropio(w, fuentes)) return forzada;
  const bajo = w.toLowerCase();
  const i = forzada.indexOf(bajo);
  return i >= 0 ? forzada.slice(0, i) + w + forzada.slice(i + bajo.length) : forzada;
}

// ─────────────────────────────── forma ───────────────────────────────

/**
 * Lo que se arregla en codigo sin pedir otra tanda: los dos puntos (prohibidos
 * desde el 12/08, `brand-voice §7.1`, y en la prueba del 01/10 salio "lo de
 * Moldavia: un millón") y la primera letra en minuscula ("exactooo, el
 * cuchillo..."): el movil la pone en mayuscula.
 */
export function pulirComentario(c: string): string {
  const t = (c || '').replace(/\s*:\s+/g, ', ').replace(/,\s*,/g, ',').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const EMOJI_G = /\p{Extended_Pictographic}️?/gu;

// "Qué post más necesario." (Iker, 01/10): *"horrible, demasiado corto, no
// aporta absolutamente nada"*. Un comentario de apoyo tiene que nombrar algo
// del post, y en menos de 35 caracteres no cabe.
const PELOTEO_SOLO = /^(que|vaya|menudo|gran|muy buen|buen|top|brutal|genial)( de)? (post|publicacion|trabajo|aporte|contenido)( mas \w+)?\b/;
export function comentarioVacio(c: string): string | null {
  const t = (c || '').replace(EMOJI_G, '').trim();
  if (t.length < 35) return `demasiado corto (${t.length} caracteres) y no nombra nada del post`;
  const m = llano(t).match(PELOTEO_SOLO);
  if (m) {
    const resto = llano(t).slice(m[0].length).replace(/[^a-z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (resto.length < 5) return 'es peloteo hueco: no nombra nada concreto del post';
  }
  return null;
}

// EL REGISTRO DE INFORME (Iker, 01/10): *"sigo viendo respuestas muy formales,
// que no son naturales"*. Las cinco de abajo son comentarios reales de
// compañeros pegados del Google Chat ("demuestra que el músculo industrial",
// "ecosistemas muy sólidos fuera del radar", "habla de especialización").
// Nadie que comenta desde el movil el post de un conocido escribe asi.
const FORMAL = /(\bdemuestra(n)?\b|pone(n)? de manifiesto|cabe destacar|habla de (especializacion|compromiso|talento|esfuerzo|la capacidad|continuidad)|\becosistemas?\b|tejido (industrial|comercial|productivo|empresarial|economico)|musculo (industrial|exportador|economico)|motor(es)? (economico|del norte|de la economia|industrial)|grandes motores|fuera del radar|lejos de los focos|(poner|pone|ponen|puesta) en valor|capacidad (exportadora|industrial|productiva)|a nivel (de|nacional|internacional)|sin duda alguna|es fundamental|resulta (clave|fundamental)|en definitiva|asimismo|no obstante|realidad (industrial|empresarial|economica)|\bvisibilidad\b)/;
export function registroFormal(c: string): string | null {
  const m = llano(c).match(FORMAL);
  return m ? m[0] : null;
}

// ─────────────────────────────── evento ───────────────────────────────

export function esPostDeEvento(pillar: string | null | undefined, texto: string): boolean {
  if (pillar === 'evento') return true;
  const t = llano(texto);
  return /\bneety forward\b|forward\.neety\.com|\b(luma\.com|lu\.ma)\b|\bevento\b/.test(t);
}

export function esPeloteo(pillar: string | null | undefined): boolean {
  return !!pillar && pillar.startsWith('peloteo_');
}

// El video de Unai del 30/09 contaba EN PASADO la mañana de antes de Neety
// Forward (24/09), y salieron "Mucha suerte mañana" y "Que salga redondo".
const SUERTE_FUTURA = /(mucha suerte|suerte (hoy|manana|para|con|en el|el (lunes|martes|miercoles|jueves|viernes))|que (salga|vaya|sea) (todo )?(bien|redondo|genial|un exito|de lujo)|salga redondo|ganas de que (llegue|empiece|sea|arranque)|a por (ello|todas)|nos vemos (alli|manana|el|en)|(suerte|hasta|nos vemos|ganas de) manana|manana (es el dia|toca|empieza|arranca))/;
export function suerteFutura(c: string): string | null {
  const m = llano(c).match(SUERTE_FUTURA);
  return m ? m[0] : null;
}

/** Quita la frase que desea suerte a un evento que ya paso, si queda algo con sentido. */
export function quitarFraseFutura(c: string): string {
  if (!suerteFutura(c)) return c;
  const frases = c.match(/[^.!?…]+[.!?…]*\s*/g) || [c];
  const quedan = frases.filter((f) => !suerteFutura(f)).join('').trim();
  return quedan.replace(EMOJI_G, '').trim().length >= 35 ? quedan : c;
}

// Afirmar que estuvo. Vale si el post cuenta que fuimos todos (`juntos`); si no
// consta, lo pega gente que puede no haber ido (regla del 27/08).
const ESTUVO = /(lo pasamos|nos lo pasamos|estuvimos|nos vimos|nos reimos|disfrutamos|lo vivimos|alli estuve|estuve alli|estaba alli|corrimos|nos toco)/;
export function afirmaQueEstuvo(c: string): string | null {
  const m = llano(c).match(ESTUVO);
  return m ? m[0] : null;
}

/** El minimo de un comentario a un evento que ya paso: orgullo, enhorabuena o recordarlo. */
export function apoyaEventoPasado(c: string): boolean {
  return /(orgull|enhorabuena|que bien (salio|quedo|lo pasamos|estuvo)|salio (genial|redondo|bien|de lujo|todo)|como salio|menud[oa]|que (dia|manana|jornada|evento|locura|pasada|gozada|equipo|recuerdo)|vaya (dia|manana|jornada|equipo|locura)|curr(o|azo)|lo pasamos|disfrut|repetir|la proxima|gran (dia|evento|trabajo|jornada)|se not[oa]|merecio la pena|valio la pena|recuerdo|aquella|aquel dia)/.test(llano(c));
}

export interface FaseEvento {
  momento: 'antes' | 'durante' | 'despues' | 'desconocido';
  /** El post cuenta que el equipo estuvo junto: quien lo pega estaba ahi. */
  juntos: boolean;
  pistas: string;
}

export function normalizarFase(raw: any): FaseEvento {
  const m = raw?.momento;
  return {
    momento: m === 'antes' || m === 'durante' || m === 'despues' ? m : 'desconocido',
    juntos: raw?.juntos === true,
    pistas: typeof raw?.pistas === 'string' ? raw.pistas.slice(0, 160) : '',
  };
}

/** YYYY-MM-DD en hora de Madrid (Railway corre en UTC). */
export function fechaMadrid(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

// Una vez por post y dia: la fase puede cambiar de un dia a otro (el anuncio
// de ayer es un evento pasado hoy), y dentro del dia no cambia.
const FASES = new Map<string, FaseEvento>();

// ⛔ EL CALENDARIO, PORQUE EL POST NO SIEMPRE LLEVA LA FECHA (prueba del
// 01/10). El video de Unai cuenta "la mañana de antes" sin decir de que dia, y
// con solo la fecha de publicacion (30/09) Haiku fecho el evento al dia
// siguiente, HOY, y salieron "mucha suerte hoy Unai" y "hoy es el día". El
// evento fue el 24/09. Dos fuentes, por orden: los eventos con fecha conocida
// (se añade aqui cada uno nuevo) y nuestros otros posts del evento de los
// ultimos meses, con su fecha, que es como lo fecharia una persona.
export const EVENTOS_CONOCIDOS: { nombre: string; fecha: string; sitio: string }[] = [
  { nombre: 'Neety Forward 2026', fecha: '2026-09-24', sitio: 'Donostia' },
];

async function otrosPostsDelEvento(postId: string | null | undefined): Promise<string> {
  try {
    const { rows } = await pool.query(
      `SELECT to_char(p.published_at, 'YYYY-MM-DD') AS f, left(p.content_text, 200) AS t
         FROM posts p JOIN creators c ON c.id = p.creator_id
        WHERE c.is_managed = TRUE
          AND p.id::text <> $1
          AND (p.pillar = 'evento' OR p.content_text ILIKE '%neety forward%'
               OR p.content_text ILIKE '%lu.ma/%' OR p.content_text ILIKE '%luma.com/%')
          AND p.published_at > NOW() - INTERVAL '120 days'
        ORDER BY p.published_at DESC
        LIMIT 8`,
      [postId || '']
    );
    return rows.map((r: any) => `· ${r.f}: ${String(r.t || '').replace(/\s+/g, ' ')}`).join('\n');
  } catch (err: any) {
    console.warn('[variedadComentarios] no he podido leer los otros posts del evento:', err?.message);
    return '';
  }
}

/**
 * ¿El evento del post ya paso, es hoy o esta por venir? ¿Estuvimos todos?
 *
 * Lo decide Haiku leyendo el post con la fecha de HOY y la de publicacion,
 * porque las pistas son de lenguaje: "llegaba al día siguiente" (pasado), "11
 * personas y una casa rural" (el equipo junto), "quedan las últimas plazas"
 * (futuro). Una lista de tiempos verbales no termina nunca; esto es una
 * pregunta barata, una vez por post y dia.
 */
export async function analizarEvento(input: {
  postId?: string | null;
  texto: string;
  publicadoEl?: string | Date | null;
}): Promise<FaseEvento> {
  const hoy = fechaMadrid();
  const publicado = input.publicadoEl ? fechaMadrid(new Date(input.publicadoEl)) : hoy;
  const clave = `${input.postId || llano(input.texto).slice(0, 120)}|${hoy}`;
  const cacheada = FASES.get(clave);
  if (cacheada) return cacheada;
  let fase: FaseEvento;
  try {
    const calendario = EVENTOS_CONOCIDOS.map((e) => `· ${e.nombre}: ${e.fecha}, ${e.sitio}`).join('\n');
    const otros = await otrosPostsDelEvento(input.postId);
    const msg = await trackedCreate('event_phase', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `Lees un post de LinkedIn de Neety que habla de un evento suyo. Decides DOS cosas.

1. momento: dónde está HOY respecto al evento.
   · "antes": el evento aún no ha ocurrido (lo anuncia, invita, quedan plazas, "mañana", "este jueves", cuenta atrás).
   · "durante": el evento es HOY y está pasando.
   · "despues": el evento ya ha ocurrido. Lo cuenta en pasado ("fue", "llegaba al día siguiente", "gracias a los que vinisteis"), o nombra una fecha anterior a HOY.
   ⚠️ Lo que importa es HOY, no el día que se publicó: un post que cuenta en pasado la víspera del evento es "despues", y un post que anunciaba un evento cuya fecha ya ha pasado también.
   ⛔ FECHA EL EVENTO CON EL CALENDARIO Y CON LOS OTROS POSTS que te paso, NUNCA con el día de publicación. Un post que cuenta "la mañana de antes" o "lo que llegaba al día siguiente" sin decir la fecha NO significa que el evento sea el día después de publicarlo: casi siempre es un vídeo o un recuerdo publicado días después. Si el calendario dice que el evento fue antes de HOY, es "despues".

2. juntos: true SOLO si el post cuenta que el equipo estuvo junto en el evento o preparándolo ("estábamos todos", "11 personas y una casa rural", "cada uno a lo suyo"). false si no consta o si nombra solo a algunos.

pistas: las palabras del post en las que te basas, 15 como mucho.

Responde SOLO con JSON: {"momento": "antes|durante|despues", "juntos": true|false, "pistas": "..."}`,
      messages: [{
        role: 'user',
        content: `HOY es ${hoy}. El post se publicó el ${publicado}.\n\nEVENTOS DE NEETY CON FECHA CONOCIDA:\n${calendario}\n\n${
          otros ? `OTROS POSTS NUESTROS DEL EVENTO (fecha de publicación y comienzo):\n${otros}\n\n` : ''
        }POST A ANALIZAR:\n${input.texto.slice(0, 3000)}`,
      }],
    });
    const block = msg.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
    const crudo = (block?.text || '').trim();
    fase = normalizarFase(JSON.parse(crudo.slice(crudo.indexOf('{'), crudo.lastIndexOf('}') + 1)));
  } catch (err: any) {
    // Sin fase, el banco neutro: ni suerte ni recuerdos. Mejor un comentario
    // que no se moja con el tiempo que uno que desea suerte a algo que paso.
    console.warn('[variedadComentarios] no he podido leer la fase del evento:', err?.message);
    fase = { momento: 'desconocido', juntos: false, pistas: '' };
  }
  FASES.set(clave, fase);
  if (FASES.size > 200) FASES.delete(FASES.keys().next().value as string);
  return fase;
}

/** Lo que el prompt le cuenta al modelo de la fase, en una linea. */
export function textoFase(fase: FaseEvento): string {
  const pistas = fase.pistas ? ` (pistas del post: "${fase.pistas}")` : '';
  if (fase.momento === 'despues') {
    return `EL EVENTO YA HA PASADO${pistas}. Todo en PASADO: nada de "suerte", "que salga bien", "que salga redondo", "ganas de que llegue" ni "mañana". ${
      fase.juntos
        ? 'El post cuenta que estábamos todos juntos, así que se puede recordar en primera persona del plural ("lo pasamos", "corrimos", "qué mañana aquella").'
        : 'No consta que todos los que lo leen fueran: orgullo, enhorabuena y ganas de la próxima, pero sin decir que estuviste ("lo pasamos", "estuvimos" no).'
    }`;
  }
  if (fase.momento === 'durante') return `EL EVENTO ES HOY Y ESTÁ PASANDO${pistas}. Ánimo y ganas para hoy, sin dar por hecho que quien lo pega está allí.`;
  if (fase.momento === 'antes') return `EL EVENTO TODAVÍA NO HA PASADO${pistas}. Suerte, ganas u orgullo, sin dar por hecho que quien lo pega va a ir.`;
  return 'NO SE SABE SI EL EVENTO YA PASÓ: no te mojes con el tiempo. Ni "suerte mañana" ni "qué bien lo pasamos": orgullo, enhorabuena y ganas de ver más.';
}

// ─────────────────────────────── bancos ───────────────────────────────
//
// Cada angulo dice DE QUE PARTE CONCRETA del post va el comentario, no solo
// con que tono. Los anteriores ("refuerza la idea principal", "lleva su idea
// un paso mas alla") colgaban todos de la tesis, y en un peloteo la tesis es
// siempre la misma: que a esa region no la ve nadie.

const ANGULOS_GENERALES = [
  'un detalle CONCRETO del post (una frase, un objeto, una escena) que te ha gustado, recogido dentro de tu frase',
  'lo que te llevas tu: lo que vas a mirar o hacer distinto despues de leerlo',
  'el AUTOR: di QUE esta bien hecho (como lo cuenta, el giro del final, el ejemplo), sin peloteo hueco',
  'una conexion personal INCOMPROBABLE con un detalle del post ("me ha pasado algo parecido", "me ha tocado"), sin inventar casos',
  'humor ligero o complicidad con un detalle del post',
  'refuerza UNA idea secundaria del post, no la central, con un angulo tuyo',
  'a quien le vendria bien leerlo (un perfil general, nunca una persona concreta)',
  'la consecuencia de NO hacer lo que dice el post, con un ejemplo cotidiano',
];

const ANGULOS_PELOTEO = [
  // SOLO lo que dice el post: en un mapa no hay merito por empresa, y la prueba
  // del 01/10 se invento que Señorío de Montanera vende ibérico a media Europa.
  'UNA empresa concreta de la lista y SOLO lo que el post dice de ella (si no dice su merito, tu reaccion a verla ahi; nunca a que se dedica, a quien vende ni desde cuando)',
  'uno de los productos de casa que nombra el post y el pueblo de donde sale, con tu reaccion',
  'la comparacion con el otro pais del post y lo que te ha llamado la atencion, en palabras de calle',
  'la gente: los que empezaron con poco y hoy venden fuera (la frase del oficio del post), con cariño',
  'una costumbre, una comida o un sitio de la region que nombra el post, con cariño',
  'orgullo de esa tierra o ganas de conocerla mejor, con un pueblo o un producto del post',
  'el curro del post: lo bien hilado que esta (los productos de casa, el dato, el remate), sin peloteo hueco',
  'humor ligero o complicidad con un detalle del post (un producto, una costumbre, una frase)',
  'uno de los 3 numeros del post y tu reaccion, como lo diria cualquiera en un bar',
];

export function angulosApoyo(pillar: string | null | undefined): string[] {
  return esPeloteo(pillar) ? ANGULOS_PELOTEO : ANGULOS_GENERALES;
}

const ARRANQUES = [
  'un verbo en primera persona (Me ha pasado, Me flipa, Llevo tiempo viendo)',
  'una palabra literal del post',
  'una negacion (No, Nadie, Ninguno, Ni)',
  'un adverbio de frecuencia (Casi siempre, Rara vez, Normalmente, Al final)',
  'una reaccion de dos o tres palabras seguida de un detalle concreto del post (Qué pasada lo de..., Menudo dato...)',
  'el sujeto concreto de la escena del post (el comercial, el cliente, la lista)',
  // Sin "Yo" (ronda 3 del 01/10): forzado delante, rompia la frase ("Yo me
  // alegra", "Yo la próxima lo volvemos a hacer").
  'una experiencia propia en primera persona (A mi, En mi caso, Me pasa que), con la frase bien construida',
  'un nombre propio del post (una empresa, un pueblo, un producto)',
];

/**
 * En un peloteo, "Nadie..." y "Casi siempre..." llevan derechos a la tesis
 * ("Nadie suelda un estadio de la noche a la mañana... pedidos que nadie
 * contaba", "Casi siempre el foco va a las grandes ciudades"): fuera.
 */
export function arranquesApoyo(pillar: string | null | undefined): string[] {
  return esPeloteo(pillar) ? ARRANQUES.filter((a) => !/^una negacion|^un adverbio de frecuencia/.test(a)) : ARRANQUES;
}

const ANGULOS_EVENTO_ANTES = [
  'desea suerte al autor para el evento, por su nombre de pila y sin decir "vuestro"',
  'dice las ganas que tiene de que empiece o de que llegue el dia',
  'orgullo de estar en esto, en primera persona del plural y SOLO para el evento',
  'recoge un detalle LITERAL del post (una persona, un objeto, una escena) con complicidad y lo cierra con animo para el dia',
  'animo con gracia para el dia, con un detalle del post',
  'le quita hierro a los nervios o a la espera y desea que salga bien',
  'ganas de ver lo que salga de ahi, sin dar por hecho que asiste',
];

const ANGULOS_EVENTO_DESPUES_JUNTOS = [
  'recuerda en PASADO y con complicidad un detalle LITERAL del post (una persona, un objeto, una escena), en primera persona del plural',
  'que bien lo pasamos o que dia aquel, con un detalle concreto del post',
  'orgullo de como salio, en primera persona del plural y SOLO para el evento',
  'lo que mas te gusto del dia, en general y sin inventar nada que no diga el post (ni cifras, ni ponentes, ni asistentes)',
  'humor con un detalle del post (las prisas, la comida, el reloj...), en pasado',
  'ganas de repetir o de la proxima, en primera persona del plural',
  'agradece al autor el post que lo recuerda, con un detalle concreto',
];

const ANGULOS_EVENTO_DESPUES_SIN_CONSTAR = [
  'enhorabuena al autor por como salio, por su nombre de pila y sin decir "vuestro"',
  'orgullo de estar en esto, en primera persona del plural y sin decir que estuviste alli',
  'se nota el curro que hubo detras, con un detalle LITERAL del post',
  'ganas de ver mas (fotos, video, la proxima edicion), sin dar por hecho que estuviste',
  'humor ligero con un detalle del post (las prisas, la comida, el reloj...), sin decir que estuviste',
  'lo bien contado que esta el post, con un detalle concreto',
  'ganas de la proxima, sin dar por hecho que estuviste en esta',
];

const ANGULOS_EVENTO_NEUTRO = [
  'orgullo de estar en esto, en primera persona del plural, sin decir si ya paso o esta por venir',
  'enhorabuena al autor por el post, por su nombre de pila',
  'un detalle LITERAL del post (una persona, un objeto, una escena) con complicidad',
  'se nota el curro que hay detras, con un detalle del post',
  'humor ligero con un detalle del post',
  'lo bien contado que esta el post, con un detalle concreto',
];

export function angulosEvento(fase: FaseEvento): string[] {
  if (fase.momento === 'despues') return fase.juntos ? ANGULOS_EVENTO_DESPUES_JUNTOS : ANGULOS_EVENTO_DESPUES_SIN_CONSTAR;
  if (fase.momento === 'antes' || fase.momento === 'durante') return ANGULOS_EVENTO_ANTES;
  return ANGULOS_EVENTO_NEUTRO;
}

// ─────────────────────────────── el plan de la tanda ───────────────────────────────

// ⛔ UNA LINEA EN EL CHAT (Iker, 01/10, captura): "Me flipa que el director
// tenga en la cabeza una cifra..." (107 caracteres) caia a una segunda linea,
// y el Chat corta en torno a los 95. "Una línea larga, pero una línea".
export const LARGO_MAX_CHAT = 90;

export type Cierre = '.' | '!' | '...';

export interface PlanTanda {
  conEmoji: Set<number>;
  conAlargada: Set<number>;
  cierres: Cierre[];
}

function baraja<T>(xs: T[], rnd: () => number): T[] {
  const c = [...xs];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

/**
 * Emoji, vocales y cierre de cada comentario de Google Chat, decididos aqui
 * (Iker, 2026-10-01):
 *  · EMOJI: *"mínimo dos con emoticonos... que no sean dos seguidas"*. Dos en
 *    posiciones no contiguas, y a veces tres (1, 3 y 5), que es el maximo sin
 *    que se toquen.
 *  · VOCALES: *"me gustaría que alguna más tenga más vocales"*. Dos o tres de
 *    los cinco, en cualquier sitio, y pueden coincidir con el emoji ("alguna
 *    puede tener varias vocales y también emoji o exclamaciones").
 *  · CIERRE: *"nunca veo respuestas con exclamación al final"*. Siempre una sin
 *    emoji acaba en "!" y a menudo otra en "...". Los del emoji acaban en el
 *    emoji, sin "!" delante (Iker, 01/10: "o exclamación, o emoji").
 */
export function planTanda(n: number, rnd: () => number = Math.random): PlanTanda {
  const idx = Array.from({ length: n }, (_, i) => i);
  let emoji: number[];
  if (n >= 5 && rnd() < 0.25) {
    emoji = [0, 2, 4];
  } else {
    const pares: number[][] = [];
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) pares.push([i, j]);
    emoji = pares[Math.floor(rnd() * pares.length)] || [0];
  }
  const conEmoji = new Set(emoji);
  const nAlarg = Math.min(n - 1, 2 + (n >= 5 && rnd() < 0.35 ? 1 : 0));
  const conAlargada = new Set(baraja(idx, rnd).slice(0, nAlarg));
  const cierres: Cierre[] = idx.map(() => '.');
  const sinEmoji = baraja(idx.filter((i) => !conEmoji.has(i)), rnd);
  if (sinEmoji.length) cierres[sinEmoji[0]] = '!';
  if (sinEmoji.length > 1 && rnd() < 0.65) cierres[sinEmoji[1]] = '...';
  // ⛔ Y NUNCA "!" EN UNO CON EMOJI (Iker, 01/10, captura: "...del equipo de
  // ventas! 🔥"): o exclamacion, o espacio y emoji ("grabado 🙌").
  return { conEmoji, conAlargada, cierres };
}

/** Deja el texto acabado en el cierre que le toca. Tras un "jaja", el punto sobra. */
export function aplicarCierre(texto: string, cierre: Cierre): string {
  const base = texto.trimEnd().replace(/[.!…]+$/u, '').trimEnd();
  if (cierre === '.' && /(ja|je|ji){2,}$/i.test(base)) return base;
  return base + cierre;
}

export function textoCierre(c: Cierre): string {
  if (c === '!') return 'ACABA EN EXCLAMACION ("!"), una sola, sin "!!"';
  if (c === '...') return 'ACABA EN PUNTOS SUSPENSIVOS ("..."), como quien deja la frase en el aire';
  return 'acaba en punto normal';
}

// ─────────────────────────────── respuestas ───────────────────────────────

// Lo que ya se contesto en cada post. Dos fuentes:
//  · PUBLICADAS: las respuestas del autor que ya estan en LinkedIn. Las apunta
//    `buildThreadsForPost` cada vez que se abre la pestaña de comentarios, que
//    es justo antes de ponerse a contestar.
//  · GENERADAS: los borradores de esta sesion. "Generar todas" saca 15 o 20
//    seguidos sin publicar ninguno, y esa es la tanda donde mas se repetia.
// En memoria del proceso y a proposito, como `APERTURAS_POR_POST`: si el
// servidor se reinicia, las publicadas vuelven solas al abrir la pestaña.
const PUBLICADAS = new Map<string, string[]>();
const GENERADAS = new Map<string, string[]>();

export function recordarRespuestasPublicadas(postId: string | null | undefined, textos: string[]): void {
  if (!postId) return;
  PUBLICADAS.set(postId, textos.filter(Boolean).slice(-10));
  if (PUBLICADAS.size > 300) PUBLICADAS.delete(PUBLICADAS.keys().next().value as string);
}

export function recordarRespuestaGenerada(postId: string | null | undefined, texto: string): void {
  if (!postId || !texto) return;
  GENERADAS.set(postId, [...(GENERADAS.get(postId) || []), texto].slice(-10));
  if (GENERADAS.size > 300) GENERADAS.delete(GENERADAS.keys().next().value as string);
}

/** Lo ya contestado en el post, de viejo a nuevo y sin duplicados. */
export function respuestasPrevias(postId: string | null | undefined, extra: string[] = []): string[] {
  const todas = [...(postId ? PUBLICADAS.get(postId) || [] : []), ...extra, ...(postId ? GENERADAS.get(postId) || [] : [])];
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const t of todas) {
    const k = llano(t).replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (!k || vistas.has(k)) continue;
    vistas.add(k);
    out.push(t);
  }
  return out.slice(-8);
}

/**
 * Lo que falla de variedad en una respuesta, o null. La ventana es de las 4
 * ultimas: una idea de la familia vale una vez de cada cinco respuestas.
 */
export function problemaDeVariedad(
  cuerpo: string,
  previas: string[],
  comentario: string,
  excluir: (string | null | undefined)[] = [],
  fuentes = ''
): string | null {
  const fam = familiaRepetida(cuerpo, previas.slice(-4));
  if (fam && !FAMILIAS.find((f) => f.id === fam.id)!.re.test(llano(comentario))) {
    return `repite una idea que ya has dicho en otra respuesta de este post (${fam.nombre}): busca OTRA cosa, lo concreto que trae su comentario`;
  }
  const dato = datoRepetido(cuerpo, previas.slice(-6), comentario);
  if (dato) return `repite el dato "${dato}", que ya usaste en otra respuesta de este post: usa otro detalle o ninguno`;
  const nombre = nombreRepetido(cuerpo, previas.slice(-2), comentario, excluir);
  if (nombre) return `vuelve a "${nombre}", que ya salio en la respuesta anterior de este post: agarrate a otro detalle, el que trae su comentario`;
  if (fuentes) {
    const ajeno = nombreAjeno(cuerpo, fuentes, comentario, excluir);
    if (ajeno) return `nombras "${ajeno}", que no sale ni en el post ni en su comentario: no lo nombres`;
    const cifra = cifraNueva(cuerpo, `${fuentes}\n${comentario}`);
    if (cifra) return `das una cifra ("${cifra}") que no esta ni en el post ni en su comentario: quitala`;
  }
  const formal = registroFormal(cuerpo);
  if (formal) return `suena a informe ("${formal}"): dilo como lo dirias hablando`;
  return null;
}

// ─────────────────────────────── el juez de la tanda ───────────────────────────────
//
// ⛔ LO QUE NINGUNA LISTA CAZA (prueba en produccion del 01/10). Con los
// angulos anclados a una parte concreta del post, el modelo rellena lo que el
// post no dice: "Señorío de Montanera lleva años vendiéndole el mejor ibérico a
// media Europa" (el mapa no dice nada de ella), "Moldavia, 4 millones de
// personas" (no esta en el post, y es falso) y "Yo conocí a gente que heredó
// una finca". Lo pega un compañero con su nombre debajo de un post que menciona
// a esa empresa: es el innegociable de la casa, no inventar una empresa, una
// persona ni un dato. Misma solucion que `juezDeInventos` en las respuestas,
// pero UNA llamada para los cinco.
export async function juezDeTanda(comentarios: string[], post: string): Promise<{ i: number; que: string }[]> {
  try {
    const msg = await trackedCreate('supportive_invention_judge', {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Revisas comentarios de apoyo que van a pegar personas reales, con su nombre, debajo de un post de LinkedIn. Tu único trabajo: marcar los que AFIRMAN UN HECHO QUE NO ESTÁ EN EL POST.

MÁRCALO si:
- dice algo de una EMPRESA, una persona o un sitio que el post no dice (a qué se dedica, a quién vende, dónde, desde cuándo, cuánto, premios, "la mejor de", "media Europa");
- da una cifra, una población o una cantidad que no está en el post, o una que está pero con otro significado;
- cuenta una vivencia concreta con escena o con otras personas ("conocí a", "un amigo mío", "mi padre trabajaba en", "el otro día", "estuve en", "trabajé con").

NO lo marques si:
- es una opinión, una reacción, una broma o un deseo;
- recoge o reformula lo que ya dice el post;
- es una costumbre cotidiana e incomprobable de quien comenta ("el pimentón de mis lentejas", "lo tengo pendiente", "me ha pasado algo parecido", "lo tengo en la cocina").

Responde SOLO con JSON: {"inventados": [{"n": <número del comentario>, "que": "<lo inventado, 8 palabras como mucho>"}]} (lista vacía si no hay ninguno)`,
      messages: [{
        role: 'user',
        content: `POST:\n${post.slice(0, 4000)}\n\nCOMENTARIOS:\n${comentarios.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
      }],
    });
    const block = msg.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
    const crudo = (block?.text || '').trim();
    const v = JSON.parse(crudo.slice(crudo.indexOf('{'), crudo.lastIndexOf('}') + 1)) as { inventados?: { n?: number; que?: string }[] };
    return (v.inventados || [])
      .filter((x) => typeof x.n === 'number' && x.n >= 1 && x.n <= comentarios.length)
      .map((x) => ({ i: (x.n as number) - 1, que: x.que || 'un hecho que no esta en el post' }));
  } catch (err: any) {
    // Que falle el juez no tumba la tanda: los pega una persona que la lee.
    console.warn('[variedadComentarios] el juez de la tanda no ha podido opinar:', err?.message);
    return [];
  }
}
