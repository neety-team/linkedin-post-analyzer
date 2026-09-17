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
// LO QUE HACE, y por que sale barato:
//   · SOLO para posts con pilar `meme`, que es donde el chiste vive en la foto.
//   · La foto se reduce a 512 px (~350 tokens) y se la mira Haiku UNA vez por
//     post. El resultado (el texto literal de la imagen y una linea de que se
//     ve) se guarda en `posts.image_summary`.
//   · Cada respuesta lo lee como TEXTO: unas decenas de tokens, no una imagen.
//
// NUNCA LANZA: sin resumen, el generador sigue con la RULE 3f (no afirmar nada
// de lo que la foto ensena), que es lo que habia hasta hoy.

const MAX_DIM = 512;

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

/**
 * Resumen en texto de la imagen de un MEME, cacheado en la fila del post.
 * Devuelve null si el post no es meme, no tiene imagen o no se ha podido leer.
 */
export async function getMemeImageSummary(postId: string): Promise<string | null> {
  try {
    const { rows } = await pool.query(
      `SELECT pillar, raw_data, image_summary, image_summary_source_url
         FROM posts WHERE id = $1`,
      [postId]
    );
    const post = rows[0];
    if (!post || post.pillar !== 'meme') return null;

    const url = extraerUrlImagen(post.raw_data);
    // Cache valida si se hizo de la misma imagen (o si ya no hay URL que comparar).
    if (post.image_summary && (!url || url === post.image_summary_source_url)) {
      return post.image_summary;
    }
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

    await pool
      .query(
        `UPDATE posts SET image_summary = $2, image_summary_source_url = $3 WHERE id = $1`,
        [postId, resumen, url]
      )
      .catch((e: any) => console.warn('[postImageText] no se ha podido cachear:', e?.message));
    return resumen;
  } catch (err: any) {
    console.warn('[postImageText] fallo resumiendo la imagen:', err?.message);
    return null;
  }
}
