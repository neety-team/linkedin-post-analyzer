/**
 * LOS TEXTOS DEL EFECTO ABEJA (2026-11-18).
 *
 * Cuando sale un post de un fundador, los otros dos le comentan y el autor
 * responde a cada uno. Aqui se escriben esos textos (una llamada al modelo por
 * post) y el aviso que va al Chat de contenido.
 *
 * Como tienen que sonar: cortos y normales, como los escribe una persona desde
 * el movil. Uno apoya; el otro pone en duda algo o da otro angulo. Nada de
 * "¡Gran post!", nada de vender Neety, nada de jerga. En el idioma del post.
 *
 * Las funciones puras (roles, limpieza, aviso) se prueban en
 * scripts/testAbeja.ts sin red.
 */
import Anthropic from '@anthropic-ai/sdk';
import { trackedCreate } from './claudeClient';
import { idiomaDe, type Idioma } from './idioma';
import { quitarComaAntesDeY } from './replyGenerator';
import { stripLoneSurrogates } from '../utils/sanitizeText';

export type Cuenta = 'iker' | 'unai' | 'asier';
export type Rol = 'apoyo' | 'duda' | 'angulo';

export const NOMBRE_PILA: Record<Cuenta, string> = { iker: 'Iker', unai: 'Unai', asier: 'Asier' };

/** Quien es cada fundador, para que cada comentario suene a su oficio. */
const QUIEN_ES: Record<Cuenta, string> = {
  iker: 'Iker, cofundador de Neety, lleva ventas: habla desde el dia a dia del comercial',
  unai: 'Unai, CEO de Neety: habla desde el mercado, los clientes y el ecosistema de startups e inversores',
  asier: 'Asier, cofundador y CTO de Neety, ingeniero: habla desde como se construye y desde los datos',
};

const ROL_TEXTO: Record<Rol, string> = {
  apoyo: 'APOYA el post: suma algo concreto (algo que ha visto, un matiz, un ejemplo corto), no solo aplaude',
  duda: 'PONE EN DUDA una idea del post con respeto y deja una pregunta abierta que el autor pueda contestar',
  angulo: 'DA OTRO ANGULO: lleva la idea del post a otro sitio (otro sector, otro momento, otro cargo)',
};

export const MAX_COMENTARIO = 220;
export const MAX_RESPUESTA = 200;

/** El primero apoya; el segundo pone en duda o da otro angulo, al azar. */
export function repartirRoles(comentaristas: Cuenta[], azar: () => number = Math.random): { cuenta: Cuenta; rol: Rol }[] {
  return comentaristas.map((cuenta, i) => ({
    cuenta,
    rol: i === 0 ? 'apoyo' : azar() < 0.5 ? 'duda' : 'angulo',
  }));
}

/** Deja un texto listo para LinkedIn: sin guion largo, sin hashtags, sin comillas de mas y con tope. */
export function limpiarTexto(t: string, idioma: Idioma, tope: number): string {
  let s = stripLoneSurrogates(String(t || ''))
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '')
    .replace(/^["«“]+|["»”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (idioma === 'es') s = quitarComaAntesDeY(s);
  if (s.length > tope) {
    const corte = s.slice(0, tope);
    const fin = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('? '), corte.lastIndexOf('! '));
    s = (fin > tope * 0.5 ? corte.slice(0, fin + 1) : corte.slice(0, corte.lastIndexOf(' '))).trim();
  }
  return s;
}

export interface Ronda {
  idioma: Idioma;
  comentarios: { cuenta: Cuenta; rol: Rol; texto: string; respuesta: string }[];
}

const SISTEMA = `Escribes los comentarios que los cofundadores de Neety se dejan entre ellos en LinkedIn cuando uno publica.
Neety es un SaaS de prospeccion B2B para empresas industriales: encuentra las empresas a las que venderles y quien decide dentro.

Reglas de TODOS los textos:
- Cortos y normales, como los escribe una persona desde el movil: una o dos frases.
- Que suenen naturales y a esa persona. Nada de "¡Gran post!", "Totalmente de acuerdo", "Brutal", ni frases de gurú.
- No repitas el post ni lo resumas. No vendas Neety ni pongas enlaces. Sin hashtags. Como mucho un emoji, y mejor ninguno.
- Nunca guion largo. En castellano, nunca coma antes de "y".
- Nunca juzgues al que compra (directores, clientes): la culpa va a la situacion o al proceso.
- Nunca plantees que la IA sustituye al comercial.
- NADA INVENTADO. No cuentes nada que no este en el post: ni que paso, ni que pregunto alguien, ni como reacciono la gente, ni datos, cifras, clientes o nombres. Ni en el comentario ni en la respuesta.
- Un comentario opina, pregunta o suma una idea general desde el oficio de quien lo escribe. No describe escenas que el post no cuenta.
- La respuesta del autor agradece, opina o devuelve la pregunta, sin hechos nuevos.
- Sin años ni fechas.
- MAL (cuenta lo que paso): "Every conversation that night had the same friction point", "That shift in the room was the real signal", "TAM was the first question".
- BIEN (opina o pregunta): "The who-decides problem shows up in every market we look at", "Did any of them push back on how long industrial sales take?", "Good question. I think that is where we still have to explain it better". Si le preguntan algo que el post no responde, contesta con su opinion o con lo que piensa hacer, nunca con un dato o una anecdota.
- Escribe en el MISMO idioma que el post.

Devuelves SOLO estas lineas, una por texto, sin nada alrededor y sin comillas de mas:
COMENTARIO <cuenta de quien comenta>: <el comentario>
RESPUESTA <cuenta de quien comenta>: <lo que le contesta el AUTOR del post>
Una pareja COMENTARIO/RESPUESTA por cada cuenta pedida, la respuesta justo debajo de su comentario. Cada texto en UNA sola linea.
La respuesta del autor es corta, cercana y contesta de verdad (si le ponen en duda, responde a la duda).`;

/** Una llamada al modelo para toda la ronda. Lanza si no hay clave o si la respuesta no vale. */
export async function generarRonda(input: {
  texto: string;
  autor: Cuenta;
  comentaristas: { cuenta: Cuenta; rol: Rol }[];
}): Promise<Ronda> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY sin configurar');
  const texto = stripLoneSurrogates(input.texto || '');
  const idioma = idiomaDe(texto);
  const pedido = [
    `AUTOR del post: ${QUIEN_ES[input.autor]}.`,
    `Idioma del post: ${idioma === 'en' ? 'inglés' : 'castellano'}.`,
    '',
    'Comentarios que hay que escribir, en este orden:',
    ...input.comentaristas.map((c, i) => `${i + 1}. cuenta "${c.cuenta}" (${QUIEN_ES[c.cuenta]}). ${ROL_TEXTO[c.rol]}.`),
    '',
    `Comentario: hasta ${MAX_COMENTARIO} caracteres. Respuesta del autor: hasta ${MAX_RESPUESTA} caracteres.`,
    '',
    'EL POST:',
    texto.slice(0, 5000),
  ].join('\n');
  const r = await trackedCreate('abeja_ronda', {
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: SISTEMA,
    messages: [{ role: 'user', content: pedido }],
  });
  const crudo = r.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return interpretarRonda(crudo, input.comentaristas, idioma);
}

/**
 * Lee la respuesta del modelo y la casa con los comentaristas pedidos. Pura.
 * El formato es de lineas («COMENTARIO unai: ...») porque un JSON se rompe en
 * cuanto el comentario lleva unas comillas; si aun asi llega un JSON, tambien vale.
 */
export function interpretarRonda(crudo: string, comentaristas: { cuenta: Cuenta; rol: Rol }[], idioma: Idioma): Ronda {
  const t = String(crudo || '').replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim();
  const porLineas: Record<string, { comentario?: string; respuesta?: string }> = {};
  // La RESPUESTA va con el COMENTARIO que tiene encima, ponga el nombre que ponga:
  // el modelo a veces la firma con el autor del post («RESPUESTA unai»).
  let ultimo: string | null = null;
  for (const linea of t.split(/\r?\n/)) {
    // Tolera lo que el modelo añade alrededor: negritas, «<iker>», «(apoyo)», mayusculas.
    const m = linea.match(/^[\s\-*#>_]*(COMENTARIO|RESPUESTA)[\s*_<\[(]*(iker|unai|asier)\b[^:：\n]*[:：][\s*_]*(.+?)[\s*_]*$/i);
    if (!m) continue;
    const esComentario = m[1].toUpperCase() === 'COMENTARIO';
    const c: string = esComentario || !ultimo ? m[2].toLowerCase() : ultimo;
    if (esComentario) ultimo = c;
    porLineas[c] = porLineas[c] || {};
    porLineas[c][esComentario ? 'comentario' : 'respuesta'] = m[3];
  }
  let lista: any[] = Object.entries(porLineas).map(([cuenta, v]) => ({ cuenta, ...v }));
  if (!lista.length) {
    const ini = t.indexOf('{');
    const fin = t.lastIndexOf('}');
    if (ini < 0 || fin <= ini) throw new Error('El modelo no ha devuelto los comentarios en el formato pedido');
    const j = JSON.parse(t.slice(ini, fin + 1));
    lista = Array.isArray(j?.comentarios) ? j.comentarios : [];
  }
  const comentarios = comentaristas.map((c, i) => {
    const item = lista.find((x) => String(x?.cuenta || '').toLowerCase() === c.cuenta) || lista[i];
    const texto = limpiarTexto(item?.comentario || '', idioma, MAX_COMENTARIO);
    const respuesta = limpiarTexto(item?.respuesta || '', idioma, MAX_RESPUESTA);
    if (!texto || !respuesta) {
      throw new Error(`Falta el comentario o la respuesta de ${c.cuenta}. El modelo devolvió: ${t.slice(0, 400)}`);
    }
    return { cuenta: c.cuenta, rol: c.rol, texto, respuesta };
  });
  return { idioma, comentarios };
}

const horaMadrid = (d: Date) =>
  d.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' });

/**
 * El aviso al Chat de contenido. Con la ronda encendida cuenta lo que va a
 * pasar solo; apagada, deja los comentarios para copiar y pegar.
 */
export function componerAviso(input: {
  cabecera: string;
  url: string | null;
  autor: Cuenta;
  automatica: boolean;
  comentarios: { cuenta: Cuenta; texto: string; hora: Date | null }[];
  reposts: Cuenta[];
  recordatorio: string;
}): string {
  const lineas = [input.cabecera, input.url || '(sin enlace todavía)', ''];
  if (input.comentarios.length) {
    if (input.automatica) {
      lineas.push('🐝 Ronda de los fundadores (sale sola):');
      for (const c of input.comentarios) {
        lineas.push(`· ${NOMBRE_PILA[c.cuenta]}${c.hora ? `, hacia las ${horaMadrid(c.hora)}` : ''}: «${c.texto}»`);
      }
      lineas.push(`· ${NOMBRE_PILA[input.autor]} responde a cada comentario y les da like.`);
      if (input.reposts.length) lineas.push(`· Repost de ${input.reposts.map((c) => NOMBRE_PILA[c]).join(' y ')} a lo largo de la mañana.`);
    } else {
      lineas.push('💬 Comentarios para los fundadores (copia y pega):');
      for (const c of input.comentarios) lineas.push(`· ${NOMBRE_PILA[c.cuenta]}: «${c.texto}»`);
    }
    lineas.push('');
  }
  lineas.push(input.recordatorio);
  return lineas.join('\n');
}
