import pool from '../db';

// LA FOTO DEL POST, PARA QUIEN TENGA QUE ENTENDER EL POST (Iker, 2026-09-15)
//
// POR QUE EXISTE, y es un fallo de diseno nuestro, no del modelo: el generador
// de respuestas recibia SOLO el texto. Y nuestra propia doctrina dice que el
// texto NUNCA cuenta lo que ensena la foto (`global §2.0c`: "el cuerpo no
// explica la imagen"; `post-workflow §4.4-CALLA`). O sea que, por construccion,
// un generador que solo lee el texto esta CIEGO a la mitad de cada meme.
//
// Lo que costo:
//   · alguien comento "no entiendo este post" en el meme del 03/09, donde el
//     chiste entero vive en la captura (un companero pregunta si esos 4.797€
//     son un viaje, y la factura resulta ser la renovacion de las herramientas
//     de ventas). Sin la foto no hay nada que explicar, asi que la respuesta
//     salio por la tangente y encima borde.
//   · y en el meme del peso, alguien se quejo y la herramienta contesto que
//     "en ningun momento hemos hablado de peso" — MENTIRA, estaba en la foto.
//     Negar en publico algo que si dijimos es el peor error posible aqui.
//
// Se cachea en las columnas `cached_image_*` de `posts`, que ya existian desde
// la v28 y no las usaba nadie: la primera respuesta de un post la descarga y
// las demas la reutilizan, asi que la tanda de 20 comentarios paga una sola vez.

export interface PostImage {
  b64: string;
  mediaType: string;
}

// Mismo orden de busqueda que `/api/posts/post/:id/media`: attachments primero
// (es el campo bueno de Unipile) y luego los dos fallbacks historicos.
function extraerUrl(raw: any): string | null {
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

const TIPOS_OK = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/**
 * Devuelve la imagen del post en base64, o null si no hay o no se ha podido
 * traer. NUNCA lanza: quedarse sin foto degrada la respuesta, pero no puede
 * tumbar la generacion — y quien la use tiene que decirle al modelo que esta
 * ciego (ver RULE 3f en `replyGenerator`), que es lo que evita que afirme lo
 * que la foto contiene o no contiene.
 */
export async function getPostImage(postId: string): Promise<PostImage | null> {
  try {
    const { rows } = await pool.query(
      `SELECT raw_data, cached_image_b64, cached_image_media_type, cached_image_source_url
         FROM posts WHERE id = $1`,
      [postId]
    );
    const post = rows[0];
    if (!post) return null;

    const url = extraerUrl(post.raw_data);

    // Cache valida: hay bytes Y se cachearon de la MISMA url que hay ahora. Si
    // el creador cambio la imagen, `cached_image_source_url` deja de coincidir
    // y se vuelve a bajar.
    if (post.cached_image_b64 && post.cached_image_media_type) {
      if (!url || url === post.cached_image_source_url) {
        return { b64: post.cached_image_b64, mediaType: post.cached_image_media_type };
      }
    }
    if (!url) return null;

    // Las URL de media.licdn.com CADUCAN y devuelven 403 (CLAUDE.md). Si pasa,
    // no se reintenta aqui: se devuelve null y el prompt se entera de que no
    // hay foto, que es mucho mejor que adivinar.
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) {
      console.warn(`[postImage] ${postId}: la imagen devuelve ${resp.status}, la respuesta se genera sin ella`);
      return null;
    }
    const tipo = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!TIPOS_OK.has(tipo)) {
      console.warn(`[postImage] ${postId}: tipo no soportado (${tipo})`);
      return null;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    // Tope de seguridad: la API rechaza imagenes enormes y un meme nuestro
    // nunca pasa de unos cientos de KB.
    if (buf.byteLength > 4 * 1024 * 1024) {
      console.warn(`[postImage] ${postId}: imagen de ${Math.round(buf.byteLength / 1024)}KB, demasiado grande`);
      return null;
    }
    const b64 = buf.toString('base64');

    await pool
      .query(
        `UPDATE posts
            SET cached_image_b64 = $2,
                cached_image_media_type = $3,
                cached_image_source_url = $4,
                cached_image_cached_at = NOW()
          WHERE id = $1`,
        [postId, b64, tipo, url]
      )
      .catch((e: any) => console.warn('[postImage] no se ha podido cachear:', e?.message));

    return { b64, mediaType: tipo };
  } catch (err: any) {
    console.warn('[postImage] fallo trayendo la imagen:', err?.message);
    return null;
  }
}
