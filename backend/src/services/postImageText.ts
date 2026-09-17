import pool from '../db';
import { trackedCreate } from './claudeClient';

// LA IMAGEN DEL MEME, EN TEXTO Y UNA SOLA VEZ (Iker, 2026-09-17)
//
// POR QUE: el 15/09 se quitaron las fotos de las respuestas por coste (~850
// tokens por foto, mandada dos veces por respuesta, ~34k en una tanda de 20).
// Y el generador volvio a quedarse ciego a la broma: en el meme del 16/09,
// Antonio N. siguio el chiste con "tu madre se ha tropezado en la ducha. Solo
// para valientes" y la herramienta se lo tomo en serio y le analizo por que
// "funciona" como tactica. La broma vivia en la imagen.
//
// LO QUE HACE, y por que sale barato (Iker: "no quiero gastar casi tokens"):
//   · SOLO posts con pilar `meme` de NUESTRAS cuentas (is_managed). Nunca la
//     competencia, que son miles de posts.
//   · La foto se reduce a 512 px y JPEG 75 antes de mandarla (~350 tokens en
//     vez de ~850), y la mira Haiku, el modelo barato.
//   · Se hace UNA vez por post, AL PUBLICARLO: el monitor de posts lo lanza en
//     su vuelta (`resumirMemesPendientes`). El resultado se guarda en
//     `posts.image_summary` y cada respuesta lo LEE de la BD como texto.
//   · Una vez guardado NO se rehace nunca, aunque cambie la URL: las URL de
//     media.licdn.com llevan un token que caduca y cambia en cada refresco del
//     post, asi que invalidar por URL volveria a leer la misma imagen una y otra
//     vez.
//   · Si falla (403, imagen rara), se marca `image_summary_tried_at` y no se
//     reintenta hasta pasadas 6 horas.
//
// NUNCA LANZA: sin resumen, el generador sigue con la RULE 3f (no afirmar nada
// de lo que la foto ensena), que es lo que habia hasta el 17/09.

const MAX_DIM = 512;
const REINTENTO_HORAS = 6;
const MEMES_POR_VUELTA = 3;

let _jimp: any;
let _jimpTried = false;
function getJimp(): any | null {
  if (_jimpTried) return _jimp || null;
  _jimpTried = true;
  try {
    _jimp = require('jimp').Jimp;
  } catch (err: any) {
    console.warn('[postImageText] jimp no disponible:', err?.message);
    _jimp = null;
  }
  return _jimp;
}

// Mismo orden de busqueda que `/api/posts/post/:id/media`: attachments primero
// y luego los dos fallbacks historicos. Sin videos ni documentos.
export function extraerUrlImagen(raw: any): string | null {
  if (!raw) return null;
  if (Array.isArray(raw.attachments)) {
    for (const a of raw.attachments) {
      const t = String(a?.type || '').toLowerCase();
      const url = a?.url || a?.download_url || a?.media_url;
      if (!url) continue;
      if (t.includes('video') || t.includes('document') || t.includes('pdf')) continue;
      return String(url);
    }
  }
  for (const campo of ['images', 'media']) {
    const arr = raw?.[campo];
    if (Array.isArray(arr)) {
      for (const it of arr) {
        const url = typeof it === 'string' ? it : it?.url || it?.download_url || it?.media_url;
        if (url) return String(url);
      }
    }
  }
  return null;
}

async function bajarReducida(url: string): Promise<string | null> {
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  // Las URL de media.licdn.com caducan y dan 403 (CLAUDE.md): sin foto, sin resumen.
  if (!resp.ok) {
    console.warn(`[postImageText] la imagen devuelve ${resp.status}`);
    return null;
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.byteLength > 8 * 1024 * 1024) return null;
  const Jimp = getJimp();
  // Sin jimp NO se manda a tamano completo: el sentido de esto es que sea barato.
  if (!Jimp) return null;
  const img = await Jimp.read(buf);
  if (img.bitmap.width > MAX_DIM || img.bitmap.height > MAX_DIM) {
    img.scaleToFit({ w: MAX_DIM, h: MAX_DIM });
  }
  const out: Buffer = await img.getBuffer('image/jpeg', { quality: 75 });
  return out.toString('base64');
}

// La unica llamada que gasta tokens. Se marca el intento ANTES de nada, para
// que un fallo no se reintente en cada vuelta ni en cada respuesta.
async function resumir(postId: string, raw: any): Promise<string | null> {
  await pool.query(`UPDATE posts SET image_summary_tried_at = NOW() WHERE id = $1`, [postId]);
  const url = extraerUrlImagen(raw);
  if (!url) return null;
  const b64 = await bajarReducida(url);
  if (!b64) return null;

  const message = await trackedCreate('meme_image_summary', {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
          {
            type: 'text',
            text: `Es la imagen de un meme de LinkedIn. Devuelve SOLO esto, en espanol y sin markdown:
TEXTO: todo el texto que se lee en la imagen, literal y en orden (si no hay, "ninguno").
ESCENA: una frase con lo que se ve (personajes, situacion), sin interpretar.
BROMA: una frase con donde esta el chiste.
Maximo 80 palabras en total. No inventes nada que no se vea.`,
          },
        ],
      },
    ],
  });
  const block = message.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
  const resumen = (block?.text || '').trim();
  if (!resumen) return null;
  await pool.query(
    `UPDATE posts SET image_summary = $2, image_summary_source_url = $3 WHERE id = $1`,
    [postId, resumen, url]
  );
  console.log(`[postImageText] resumida la imagen del meme ${postId}`);
  return resumen;
}

const PENDIENTE_SQL = `p.pillar = 'meme'
  AND p.image_summary IS NULL
  AND (p.image_summary_tried_at IS NULL
       OR p.image_summary_tried_at < NOW() - INTERVAL '${REINTENTO_HORAS} hours')`;

/**
 * Lo que usa cada respuesta: LEE el resumen guardado. Solo si el post es un
 * meme nuestro y todavia no lo tiene (el monitor aun no ha pasado), lo hace en
 * ese momento, y queda guardado para el resto de la tanda.
 */
export async function getMemeImageSummary(postId: string): Promise<string | null> {
  try {
    const { rows } = await pool.query(
      `SELECT p.image_summary, p.raw_data, (${PENDIENTE_SQL}) AS pendiente
         FROM posts p JOIN creators c ON c.id = p.creator_id
        WHERE p.id = $1 AND p.pillar = 'meme' AND c.is_managed = TRUE`,
      [postId]
    );
    const post = rows[0];
    if (!post) return null;
    if (post.image_summary) return post.image_summary;
    if (!post.pendiente) return null;
    return await resumir(postId, post.raw_data);
  } catch (err: any) {
    console.warn('[postImageText] fallo leyendo el resumen:', err?.message);
    return null;
  }
}

/**
 * Lo que lanza el monitor de posts en cada vuelta: resume los memes NUEVOS de
 * nuestras cuentas (ultimos 7 dias) que aun no tienen resumen. Como mucho 3
 * por vuelta, y cada uno una sola vez.
 */
export async function resumirMemesPendientes(): Promise<void> {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.raw_data
         FROM posts p JOIN creators c ON c.id = p.creator_id
        WHERE c.is_managed = TRUE
          AND p.published_at > NOW() - INTERVAL '7 days'
          AND ${PENDIENTE_SQL}
        ORDER BY p.published_at DESC
        LIMIT ${MEMES_POR_VUELTA}`
    );
    for (const r of rows) {
      await resumir(r.id, r.raw_data).catch((e: any) =>
        console.warn(`[postImageText] ${r.id}: ${e?.message}`)
      );
    }
  } catch (err: any) {
    console.warn('[postImageText] fallo en la vuelta de memes:', err?.message);
  }
}
