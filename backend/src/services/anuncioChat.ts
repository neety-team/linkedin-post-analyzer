// ANUNCIADOR AUTOMATICO DE POSTS AL GOOGLE CHAT DEL EQUIPO (Iker, 2026-08-27)
//
// QUE HACE: lo mismo que hacia Iker a mano cada mañana en Accounts —pulsar
// "Get new posts", abrir el post recien publicado, pulsar "Chat" y luego
// "Enviar al Chat"—, pero solo y a su hora. Nace de las dos semanas de
// vacaciones (31/08 al 11/09): sin nadie delante, el equipo no se entera de
// que hay post nuevo y la capa manual de la primera hora es justo lo que hace
// funcionar el sistema.
//
// POR QUE CORRE VARIAS VECES Y NO UNA:
// LinkedIn no publica en el minuto exacto. El 26/08 documentamos una cola de
// revision de ~20 minutos con la curva entera (plana los primeros 15 min,
// aparece en el feed a los 20). Un unico pase a las 10:05 se encontraria la
// cuenta vacia justo los dias en que el post va con retraso, que son los dias
// en los que MAS falta hace avisar. Por eso hay tres pases.
//
// POR QUE NO LLEVA LAS 12 FECHAS DENTRO:
// Se penso hardcodear los 12 dias del calendario de vacaciones y se descarto:
// se rompe en cuanto se mueve un dia, hay que tocarlo para cada semana nueva y
// deja de servir al volver. Corre TODOS los dias y no manda nada si no
// encuentra post sin anunciar, que es la misma condicion con menos piezas.
import pool from '../db';
import { sendToGoogleChat } from './googleChat';
import { generateSupportiveComments } from './commentGenerator';
// OJO: `scrapeCreatorPosts` vive en routes/accounts y ESE modulo importa de
// aqui (`anunciarPostsDeHoy` para el endpoint manual). Un import estatico
// cerraria un ciclo y en CommonJS el que se cargue segundo se veria al otro a
// medio construir, con el simbolo en `undefined`. Se resuelve con un import
// DINAMICO dentro de la funcion: para cuando corre, los dos modulos estan
// enteros. Si algun dia se saca esa funcion a su propio servicio, esto vuelve
// a ser un import normal de arriba.

// Las cabeceras y los recordatorios son los MISMOS que los del modal
// (frontend/src/components/accounts/GoogleChatModal.tsx). Estan duplicados a
// proposito y no extraidos a un paquete compartido: son 20 lineas de texto y
// el front y el back no comparten build. Si se tocan alli, se tocan aqui.
//
// Frases COMPLETAS y no piezas que se ensamblan: componer "NUEVO" + etiqueta
// producia "NUEVO LOS 10" y "HISTORIA NUEVO", porque el genero y el numero
// cambian con el pilar.
const CABECERAS: Record<string, string[]> = {
  meme: ['Nuevo MEME de {N}', 'Nuevo MEMEEE de {N}', 'MEMAZO nuevo de {N}', '{N} tiene MEME nuevo', 'Nuevo MEME {N}'],
  peloteo_mapa: ['Nuevo MAPA de {N}', 'Nuevo MAPAAA de {N}', 'MAPA nuevo de {N}', '{N} tiene MAPA nuevo'],
  peloteo_los10: ['Nuevo TOP 10 de {N}', 'Nuevos 10 de {N}', 'LOS 10 de {N}, recién salidos', '{N} tiene TOP 10 nuevo'],
  lead_magnet: ['Nuevo LEAD MAGNET de {N}', 'Nuevo LEAD MAGNEEET de {N}', 'LEAD MAGNET nuevo de {N}', '{N} tiene LEAD MAGNET nuevo'],
  historia: ['Nueva HISTORIA de {N}', 'Nueva HISTORIAAA de {N}', 'HISTORIA nueva de {N}', '{N} tiene HISTORIA nueva'],
  peloteo_objeto: ['Nuevo DESPIECE de {N}', 'Nuevo DESPIEEECE de {N}', 'DESPIECE nuevo de {N}', '{N} tiene DESPIECE nuevo'],
  evento: ['Nuevo post de EVENTO de {N}', 'EVENTO nuevo de {N}', '{N} anuncia el EVENTO', 'Post del EVENTO de {N}'],
  otro: ['Nuevo POST de {N}', 'Nuevo POOOST de {N}', 'POST nuevo de {N}', '{N} tiene POST nuevo', 'Nuevo POST {N}'],
};

const RECORDATORIOS = [
  '🔥 Like, comentario, compartir y guardar. Los cuatro. La primera hora lo decide todo.',
  '⚡ Cuatro toques: like, comentario, compartir y guardar (los 3 puntitos del post). Y volamos.',
  '🚀 Like, comentario, compartir y guardar. Veinte segundos vuestros, un día entero de alcance.',
  '🔥 La primera hora manda. Like, comentario, compartir y guardar, sin dejarse ninguno.',
  'Si dais LIKE + COMENTARIO + COMPARTIR + GUARDAR nos ayudáis mucho 😉',
  '⚡ Si caen los cuatro (like, comentario, compartir y guardar) esto se va arriba solo.',
  '🔥 Comentario y guardado son los que más pesan. Con el like y el compartir, pleno.',
];

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

const PER_COMMENT_CAP = 200;
function truncate(s: string): string {
  const t = (s || '').trim();
  if (t.length <= PER_COMMENT_CAP) return t;
  const slice = t.slice(0, PER_COMMENT_CAP - 1);
  const lastBreak = Math.max(
    slice.lastIndexOf('. '), slice.lastIndexOf('? '),
    slice.lastIndexOf('! '), slice.lastIndexOf('\n')
  );
  const cutAt = lastBreak > PER_COMMENT_CAP * 0.6 ? lastBreak + 1 : slice.lastIndexOf(' ');
  return (cutAt > PER_COMMENT_CAP * 0.5 ? t.slice(0, cutAt) : slice).trimEnd() + '…';
}

export function componerMensaje(input: {
  creatorName: string | null;
  url: string | null;
  pillar: string | null;
  comments: string[];
}): string {
  // Solo el nombre de pila, para que las tres cuentas se lean igual.
  const first = ((input.creatorName || '').trim().split(/\s+/)[0] || 'ACCOUNT').toUpperCase();
  const frase = pick(CABECERAS[input.pillar || 'otro'] || CABECERAS.otro);
  const header = `🐝 ${frase.replace('{N}', first)}:\n${input.url || '(sin URL)'}`;
  const recordatorio = pick(RECORDATORIOS);
  const cleaned = input.comments.map((c) => c.trim()).filter(Boolean);
  if (cleaned.length === 0) return [header, '', recordatorio].join('\n');
  const subtitle = `💬 ${cleaned.length} COMENTARIOS de APOYO (copia y pega):`;
  return [header, '', recordatorio, '', subtitle, '', cleaned.join('\n\n')].join('\n');
}

// Ventana de "hoy" en hora de Madrid. Railway corre en UTC, asi que preguntar
// por CURRENT_DATE daria el dia equivocado entre las 00:00 y las 02:00 locales
// en verano. Se delega en Postgres, que sabe de zonas horarias y de horario de
// verano; calcularlo a mano con un offset fijo se rompe el ultimo domingo de
// octubre.
const VENTANA_HOY = `p.published_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'`;

export interface ResultadoAnuncio {
  revisadas: number;
  encontrados: number;
  enviados: number;
  fallos: { postId: string; error: string }[];
}

/**
 * Un pase completo: refresca las cuentas gestionadas, busca posts publicados
 * HOY que no se hayan anunciado, y manda uno por post.
 *
 * Idempotente: `chat_announced_at` se escribe DESPUES del envio, asi que un
 * post ya anunciado nunca se repite y uno cuyo webhook fallo se reintenta en
 * el pase siguiente.
 */
export async function anunciarPostsDeHoy(): Promise<ResultadoAnuncio> {
  const out: ResultadoAnuncio = { revisadas: 0, encontrados: 0, enviados: 0, fallos: [] };
  const webhook = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhook) {
    console.warn('[anuncioChat] GOOGLE_CHAT_WEBHOOK_URL sin configurar — no se envia nada');
    return out;
  }

  // 1 · "Get new posts": exactamente el mismo scrape que el boton de la UI.
  const { rows: managed } = await pool.query(
    `SELECT id, name FROM creators
      WHERE is_managed = TRUE AND unipile_account_id IS NOT NULL`
  );
  out.revisadas = managed.length;
  const { scrapeCreatorPosts } = await import('../routes/accounts');
  const scrapes = await Promise.allSettled(managed.map(({ id }) => scrapeCreatorPosts(id)));
  scrapes.forEach((r, i) => {
    if (r.status === 'rejected') {
      // Que falle el scrape de una cuenta no puede tumbar el aviso de las
      // otras dos, y ademas el post puede estar ya en la base de un pase
      // anterior. Se registra y se sigue.
      console.error(`[anuncioChat] scrape falló para ${managed[i].name}:`, r.reason?.message);
    }
  });

  // 2 · Posts de hoy sin anunciar. Los ocultados con el boton "hide" quedan
  // fuera (marcan `deleted_from_linkedin_at`): si un post se borro de LinkedIn
  // porque estaba capado, anunciarlo al equipo entero manda a doce personas a
  // un enlace muerto.
  const { rows: pendientes } = await pool.query(
    `SELECT p.id, p.post_url, p.content_text, p.pillar,
            c.name AS creator_name, c.headline AS creator_headline
       FROM posts p
       JOIN creators c ON c.id = p.creator_id
      WHERE c.is_managed = TRUE
        AND p.chat_announced_at IS NULL
        AND ${VENTANA_HOY}
        AND p.deleted_from_linkedin_at IS NULL
      ORDER BY p.published_at ASC`
  );
  out.encontrados = pendientes.length;
  if (pendientes.length === 0) return out;

  // 3 · Un mensaje por post, en serie. En serie y no en paralelo a proposito:
  // son como mucho dos al dia y el Chat los ordena por llegada.
  for (const post of pendientes) {
    try {
      let comments: string[] = [];
      try {
        const raw = await generateSupportiveComments(
          {
            postContent: post.content_text || '',
            creatorName: post.creator_name,
            pillar: post.pillar,
            creatorHeadline: post.creator_headline || null,
            profile: { headline: null, voice_style: null, worldview: null, signature_moves: null, avoid: null },
          },
          5
        );
        comments = raw.map(truncate);
      } catch (e: any) {
        // Sin comentarios de apoyo el aviso pierde valor pero NO se cancela:
        // el enlace y el recordatorio de las 4 acciones son lo que de verdad
        // dispara la primera hora. Quedarse callado es peor que quedarse corto.
        console.error(`[anuncioChat] comentarios de apoyo fallaron para ${post.id}:`, e?.message);
      }

      const mensaje = componerMensaje({
        creatorName: post.creator_name,
        url: post.post_url,
        pillar: post.pillar,
        comments,
      });

      await sendToGoogleChat(webhook, mensaje);
      // Se marca DESPUES del envio. Si sendToGoogleChat lanza, el post sigue
      // pendiente y el pase siguiente lo reintenta.
      await pool.query(`UPDATE posts SET chat_announced_at = NOW() WHERE id = $1`, [post.id]);
      out.enviados++;
      console.log(`[anuncioChat] enviado: ${post.creator_name} · ${post.pillar || 'otro'}`);
    } catch (e: any) {
      out.fallos.push({ postId: post.id, error: e?.message || String(e) });
      console.error(`[anuncioChat] envío falló para ${post.id}:`, e?.message);
    }
  }
  return out;
}

// ─────────────────────────────── planificador ───────────────────────────────
//
// Los tres pases de la mañana, en hora de Madrid. Las 10:05 son las 10:01 de
// publicacion mas los 4 minutos de margen que pidio Iker; los otros dos cubren
// la cola de revision de LinkedIn (~20 min medidos el 26/08).
const PASES = ['10:05', '10:20', '10:40'];
const UN_MINUTO = 60 * 1000;

// ⛔ FECHA DE CADUCIDAD, Y NO ES UN DETALLE (Iker, 2026-08-28).
// Esto existe para las dos semanas de vacaciones y NO debe seguir corriendo
// despues. El motivo lo da Iker y es de criterio, no de comodidad: cuando el
// esta, los posts no salen a una hora fija y ademas quiere COMPROBAR EL a mano
// que LinkedIn no ha capado la publicacion antes de mandar a doce personas a
// mirarla. El bot no sabe distinguir un post sano de uno en revision: avisa de
// lo que encuentra publicado, y si esta capado manda al equipo a un post que
// se va a morir.
// Se apaga solo el 11/09 en vez de depender de que alguien se acuerde de
// quitar la variable. Para reabrir la ventana (otras vacaciones, una baja),
// se pone AUTO_CHAT_ANNOUNCE_HASTA con la fecha nueva en YYYY-MM-DD.
const ULTIMO_DIA_POR_DEFECTO = '2026-09-11';

function fechaMadrid(): string {
  // en-CA da directamente YYYY-MM-DD, que es lo que se compara como cadena.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function ventanaAbierta(): boolean {
  const hasta = (process.env.AUTO_CHAT_ANNOUNCE_HASTA || ULTIMO_DIA_POR_DEFECTO).trim();
  return fechaMadrid() <= hasta;
}

function horaMadrid(): string {
  // Intl resuelve el horario de verano solo. Formatear y comparar cadenas
  // "HH:MM" es mas simple que hacer cuentas con offsets, y esto corre una vez
  // por minuto: el coste da igual.
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date());
}

let ultimoPaseEjecutado: string | null = null;
let enVuelo = false;

let caducidadAvisada = false;

async function tickAnuncio(): Promise<void> {
  if (!ventanaAbierta()) {
    // Se dice UNA vez y no en cada tick: si no, son 1.440 lineas de log al dia
    // diciendo lo mismo.
    if (!caducidadAvisada) {
      caducidadAvisada = true;
      console.log(
        `[anuncioChat] ventana cerrada (hasta ${process.env.AUTO_CHAT_ANNOUNCE_HASTA || ULTIMO_DIA_POR_DEFECTO}) — ` +
        `el aviso vuelve a ser manual. Para reabrirla, AUTO_CHAT_ANNOUNCE_HASTA=YYYY-MM-DD`
      );
    }
    return;
  }
  const ahora = horaMadrid();
  if (!PASES.includes(ahora)) return;
  // Marca por dia+hora: si el proceso se recicla o el intervalo deriva y el
  // tick cae dos veces dentro del mismo minuto, el pase no se repite.
  const marca = `${new Date().toISOString().slice(0, 10)} ${ahora}`;
  if (ultimoPaseEjecutado === marca) return;
  if (enVuelo) return;
  ultimoPaseEjecutado = marca;
  enVuelo = true;
  try {
    const r = await anunciarPostsDeHoy();
    console.log(`[anuncioChat] pase ${ahora}: ${r.encontrados} pendiente(s), ${r.enviados} enviado(s)`);
  } catch (e: any) {
    console.error(`[anuncioChat] pase ${ahora} falló:`, e?.message);
  } finally {
    enVuelo = false;
  }
}

export function startAnuncioChat(): void {
  // APAGADO POR DEFECTO, y es deliberado: esto escribe solo en el Chat de toda
  // la empresa. Un despliegue no deberia poder encender un emisor automatico
  // sin que nadie lo haya decidido, asi que hace falta AUTO_CHAT_ANNOUNCE=1.
  if (process.env.AUTO_CHAT_ANNOUNCE !== '1') {
    console.log('[anuncioChat] desactivado (AUTO_CHAT_ANNOUNCE != 1)');
    return;
  }
  const hasta = (process.env.AUTO_CHAT_ANNOUNCE_HASTA || ULTIMO_DIA_POR_DEFECTO).trim();
  if (!ventanaAbierta()) {
    console.log(`[anuncioChat] encendido pero FUERA DE VENTANA (acabo el ${hasta}) — no va a mandar nada`);
    return;
  }
  console.log(`[anuncioChat] activo hasta el ${hasta} — pases a las ${PASES.join(', ')} (Europe/Madrid)`);
  setInterval(() => { void tickAnuncio(); }, UN_MINUTO);
}
