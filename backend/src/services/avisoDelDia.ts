/**
 * EL AVISO DEL DIA AL CHAT DE CONTENIDO (2026-11-25).
 *
 * Hasta el 25/11 salia un aviso por post (3 o 4 seguidos a las 8:35) con una
 * cabecera en mayusculas, el enlace largo, la ronda automatica de los
 * fundadores y un «like, comentario, compartir y guardar» para todos. Del 17 al
 * 25/11 casi no tuvo respuestas en el espacio: no pedia nada a nadie en concreto.
 *
 * Lo que cambia (25/11):
 *   - UN mensaje con todos los posts de la manana. El aviso de cada post espera
 *     a que salgan los demas posts de fundadores del dia (hasta 2 horas) y el
 *     ultimo en salir avisa de todos, tambien de los de ventas ya publicados.
 *   - Cada post con su primera linea (lo que dice de verdad) y un enlace corto.
 *   - En cada post UNA persona del equipo, mencionada, con una pregunta que
 *     puede contestar desde su trabajo. Esa respuesta es su comentario. Se
 *     rota: no se le pide a la misma persona dos veces seguidas.
 *   - Fuera la ronda de los fundadores (no le pide nada al resto) y el
 *     recordatorio de las cuatro acciones. Al resto, un like.
 *
 * Como se mide (dos semanas): personas del equipo, sin fundadores, que dan like
 * o comentan en cada post, y cuantos de los nombrados comentan. Lo de antes del
 * cambio es la base.
 *
 * Las funciones puras se prueban en scripts/testAbeja.ts sin red.
 */
import Anthropic from '@anthropic-ai/sdk';
import { trackedCreate } from './claudeClient';
import { stripLoneSurrogates } from '../utils/sanitizeText';

/** Las cuentas que publican en la semana (fundadores y ventas). */
export type CuentaSemana = 'iker' | 'unai' | 'asier' | 'ismael' | 'jose';

export const NOMBRE_AUTOR: Record<string, string> = {
  iker: 'Iker',
  unai: 'Unai',
  asier: 'Asier',
  ismael: 'Ismael',
  jose: 'José Tomás',
};

export interface Persona {
  clave: string;
  nombre: string;
  /** El id de Google Chat (users/<id>) para mencionarla. Sin él, el nombre en negrita. */
  chatId: string | null;
  /** Su cuenta en la semana si publica (para no pedirle comentar su propio post). */
  cuenta?: CuentaSemana;
  /** Qué hace, para que la pregunta sea de su trabajo. Vacío = no se le pide nada. */
  papel: string;
  /** Palabras que, si salen en el post, hacen que la pregunta le toque a ella. */
  zonas: string[];
  pedir: boolean;
}

/**
 * El equipo del espacio «🐝 LinkedIn Content» sin los fundadores (25/11/2026).
 * Ids sacados del propio espacio; papeles de Objetivos del CRM. Angie, Daniel y
 * Marcos están en el espacio pero sin papel confirmado: no se les pide nada
 * hasta confirmarlo. Para cambiar a quién se pregunta, aquí.
 */
export const EQUIPO: Persona[] = [
  {
    clave: 'ismael',
    nombre: 'Ismael',
    chatId: '100575691085984165417',
    cuenta: 'ismael',
    papel: 'comercial (SDR) que busca y llama cada día a empresas industriales de Cataluña',
    zonas: ['cataluña', 'catalunya', 'barcelona', 'tarragona', 'lleida', 'girona'],
    pedir: true,
  },
  {
    clave: 'jose',
    nombre: 'José Tomás',
    chatId: '104010540487066403471',
    cuenta: 'jose',
    papel: 'comercial (SDR) que busca clientes industriales en la Comunitat Valenciana y habla con consultoras y agencias que pueden recomendarnos',
    zonas: ['comunitat valenciana', 'valencia', 'alicante', 'castellón', 'castellon', 'consultor', 'partner'],
    pedir: true,
  },
  {
    clave: 'helene',
    nombre: 'Helene',
    chatId: '106887174740318564939',
    papel: 'comercial (SDR) que llama y escribe cada día a directores comerciales de empresas industriales',
    zonas: [],
    pedir: true,
  },
  {
    clave: 'helena',
    nombre: 'Helena',
    chatId: '105415232806325963169',
    papel: 'customer success: acompaña a los clientes de Neety en su día a día con la herramienta',
    zonas: ['cliente', 'clientes'],
    pedir: true,
  },
  {
    clave: 'mario',
    nombre: 'Mario',
    chatId: '104887327121993871469',
    papel: 'marketing de Neety',
    zonas: [],
    pedir: true,
  },
  { clave: 'angie', nombre: 'Angie', chatId: '104625201265817922440', papel: '', zonas: [], pedir: false },
  { clave: 'daniel', nombre: 'Daniel', chatId: '117440978930556124333', papel: '', zonas: [], pedir: false },
  { clave: 'marcos', nombre: 'Marcos', chatId: '116673223565796155066', papel: '', zonas: [], pedir: false },
];

export interface PostDelDia {
  id: string;
  cuenta: string;
  texto: string;
  url: string | null;
}

const plano = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

/** La primera línea del post, sin lo que el Chat leería como formato, con tope. Pura. */
export function primeraLinea(texto: string, tope = 110): string {
  const l = (String(texto || '').split(/\r?\n/).find((x) => x.trim()) || '').trim().replace(/[*_~`<>]/g, '');
  if (l.length <= tope) return l;
  const corte = l.slice(0, tope);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(' '), tope * 0.6)).trim()}…`;
}

/** El enlace del post: el que apuntó la verificación o, si no, el de su id. Pura. */
export function enlaceDePost(p: { linkedin_url?: string | null; linkedin_social_id?: string | null; linkedin_post_id?: string | null }): string | null {
  if (p.linkedin_url) return p.linkedin_url;
  if (p.linkedin_social_id) return `https://www.linkedin.com/feed/update/${p.linkedin_social_id}/`;
  if (p.linkedin_post_id) return `https://www.linkedin.com/feed/update/urn:li:activity:${p.linkedin_post_id}/`;
  return null;
}

/**
 * A quién se le pregunta en cada post. Una persona por post y distinta en cada
 * uno; nunca el autor. Manda la zona (si el post habla de lo suyo, le toca) y
 * después a quien hace más que no se le pide. Pura.
 * `ultimaVez`: clave de persona → cuándo se le pidió por última vez (ms).
 */
export function elegirPersonas(posts: { cuenta: string; texto: string }[], equipo: Persona[], ultimaVez: Record<string, number>): (Persona | null)[] {
  const usadas = new Set<string>();
  return posts.map((p) => {
    const texto = plano(p.texto);
    const candidatas = equipo.filter((x) => x.pedir && x.papel && x.cuenta !== p.cuenta && !usadas.has(x.clave));
    if (!candidatas.length) return null;
    const puntos = (x: Persona) => (x.zonas.some((z) => texto.includes(plano(z))) ? 1 : 0);
    const elegida = [...candidatas].sort((a, b) => puntos(b) - puntos(a) || (ultimaVez[a.clave] || 0) - (ultimaVez[b.clave] || 0))[0];
    usadas.add(elegida.clave);
    return elegida;
  });
}

export const PREGUNTA_POR_DEFECTO = '¿Te pasa algo parecido en tu día a día?';
const CIERRE_PREGUNTA = 'Contéstalo en una línea en el post: ese es tu comentario.';

const mencion = (p: Persona) => (p.chatId ? `<users/${p.chatId}>` : `*${p.nombre}*`);

/** El mensaje entero. Pura. */
export function componerAvisoDelDia(input: {
  posts: PostDelDia[];
  personas: (Persona | null)[];
  preguntas: (string | null)[];
  /** Con la ronda apagada, los comentarios que los fundadores pegan a mano. */
  copiar?: { cuenta: string; texto: string }[];
}): string {
  const n = input.posts.length;
  const lineas: string[] = [n === 1 ? `🐝 *Post nuevo de ${NOMBRE_AUTOR[input.posts[0].cuenta] || input.posts[0].cuenta}*` : `🐝 *Hoy salen ${n} posts*`, ''];
  input.posts.forEach((p, i) => {
    lineas.push(`*${NOMBRE_AUTOR[p.cuenta] || p.cuenta}* · ${primeraLinea(p.texto)}`);
    lineas.push(p.url ? `<${p.url}|Abrir el post>` : '(sin enlace todavía)');
    const quien = input.personas[i];
    if (quien) lineas.push(`${mencion(quien)} ${input.preguntas[i] || PREGUNTA_POR_DEFECTO} ${CIERRE_PREGUNTA}`);
    lineas.push('');
  });
  lineas.push(n === 1 ? 'El resto, con un like basta 🙌' : 'El resto, un like a cada uno y listo 🙌');
  if (input.copiar?.length) {
    lineas.push('', 'Fundadores, para copiar y pegar:');
    for (const c of input.copiar) lineas.push(`· ${NOMBRE_AUTOR[c.cuenta] || c.cuenta}: «${c.texto}»`);
  }
  return lineas.join('\n');
}

const SISTEMA = `Escribes, para el Google Chat interno de Neety, UNA pregunta por post a una persona concreta del equipo.
Neety es un SaaS de prospeccion B2B para empresas industriales: encuentra las empresas a las que venderles y quien decide dentro.
Sale un post en LinkedIn de un compañero y queremos que esa persona lo comente. La pregunta le da algo que solo ella puede contar desde su trabajo; lo que conteste, tal cual, es su comentario en LinkedIn.

Reglas:
- Tutea. Español de España. Una sola pregunta, de hasta 140 caracteres, que acabe en "?".
- Sobre el TEMA DEL POST, visto desde el dia a dia de esa persona (su papel viene en el pedido). El tema lo pone el post, no su papel.
- La respuesta se publica como comentario en ese post, a la vista de clientes y prospectos. Nunca preguntes por vender o recomendar Neety, por argumentos de venta, ni por clientes, partners o procesos internos.
- Que se conteste con una experiencia o una opinion en una linea, no con un si o un no.
- NADA INVENTADO: no afirmes nada de la persona ni de su trabajo ("tú abriste Cataluña", "tu cliente X"), ni datos, ni nombres. Solo pregunta.
- Nada de "¿qué te parece el post?", "¿estás de acuerdo?" ni frases de gurú. Sin emojis, sin comillas, sin guion largo.
- Nunca juzgues al que compra.

Devuelves SOLO una linea por post, en el orden pedido:
PREGUNTA <n>: <la pregunta>`;

/** Lee las preguntas del modelo. Pura. Lo que falte queda en null. */
export function interpretarPreguntas(crudo: string, n: number): (string | null)[] {
  const out: (string | null)[] = Array.from({ length: n }, () => null);
  for (const linea of String(crudo || '').split(/\r?\n/)) {
    const m = linea.match(/^[\s\-*#>_]*PREGUNTA\s*(\d+)\s*[:：][\s*_]*(.+?)[\s*_]*$/i);
    if (!m) continue;
    const i = Number(m[1]) - 1;
    if (i < 0 || i >= n) continue;
    let q = stripLoneSurrogates(m[2]).replace(/\s*[—–]\s*/g, ', ').replace(/^["«“]+|["»”]+$/g, '').trim();
    if (q.length > 180 || !q.endsWith('?')) continue;
    out[i] = q;
  }
  return out;
}

/** Una llamada al modelo para todas las preguntas del aviso. Lanza si no hay clave. */
export async function generarPreguntas(pedidos: { texto: string; autor: string; persona: Persona }[]): Promise<(string | null)[]> {
  if (!pedidos.length) return [];
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY sin configurar');
  const pedido = pedidos
    .map((p, i) =>
      [`POST ${i + 1}, de ${NOMBRE_AUTOR[p.autor] || p.autor}.`, `Pregunta para ${p.persona.nombre}: ${p.persona.papel}.`, 'Texto del post:', stripLoneSurrogates(p.texto).slice(0, 3000)].join('\n')
    )
    .join('\n\n---\n\n');
  const r = await trackedCreate('abeja_preguntas', {
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: SISTEMA,
    messages: [{ role: 'user', content: pedido }],
  });
  const crudo = r.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return interpretarPreguntas(crudo, pedidos.length);
}
