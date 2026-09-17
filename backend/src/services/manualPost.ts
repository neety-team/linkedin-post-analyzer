import pool from '../db';
import { unipileService } from './unipile';
import { enrichPost } from './engagement';
import { classifyPillar } from './pillar';
import { recalcCreatorOutliers } from './outliers';

// POSTS DE CUENTAS QUE NO ESTAN CONECTADAS A UNIPILE (Iker, 2026-08-19).
//
// Escribimos posts para gente de la empresa que no son los 3 jefes. Esas
// cuentas no estan conectadas por Unipile y no lo van a estar. Antes de esto,
// esos posts no existian para la herramienta: ni Live posts, ni dashboard, ni
// forma de saber si funcionaron.
//
// Lo que hace posible el modulo: Unipile lee un post PUBLICO de cualquiera
// usando la sesion de una cuenta que SI tenemos conectada. Comprobado contra
// la API real el 2026-08-19 — devuelve texto, autor, imagenes y contadores de
// un post que no es nuestro.
//
// Lo que NO puede: las impresiones. `impressions_counter` viene 0 y
// `analytics` viene null en un post ajeno, porque son privadas del dueño. Por
// eso existe la mitad "escribo yo a mano" de esta funcionalidad.

export interface MetricasPrivadas {
  impressions_count?: number | null;
  link_clicks_count?: number | null;
  saves_count?: number | null;
  sends_count?: number | null;
  premium_button_clicks?: number | null;
  profile_viewers_count?: number | null;
  followers_gained_count?: number | null;
  link_url?: string | null;
}

// Las 8 columnas que el usuario escribe a mano. Una sola lista, usada por el
// upsert, por el PATCH y por el arrastre de snapshots: si mañana se añade una
// metrica, se añade AQUI y los tres sitios la recogen solos.
export const CAMPOS_PRIVADOS: (keyof MetricasPrivadas)[] = [
  'impressions_count',
  'link_clicks_count',
  'saves_count',
  'sends_count',
  'premium_button_clicks',
  'profile_viewers_count',
  'followers_gained_count',
  'link_url',
];

const TIPOS_URN = ['activity', 'ugcPost', 'share'] as const;

export interface UrlParseada {
  // El URN que mas probablemente sea, segun lo que dice la propia URL.
  urn: string;
  // Ese y los otros tipos como respaldo, en orden de intento.
  candidatos: string[];
}

/**
 * Saca el URN de un post de una URL de LinkedIn.
 *
 * Unipile exige el URN EXACTO: `urn:li:activity:7485982282298806272` da 404
 * sobre un post cuyo URN real es `urn:li:ugcPost:7485982282298806272`, aunque
 * el numero sea el mismo. El id numerico suelto tambien da 404. Comprobado el
 * 2026-08-19.
 *
 * La suerte es que la URL publica lleva el tipo dentro:
 *   .../posts/postiv-ai_postiv-update-ugcPost-7485982282298806272-SnX2
 *   .../posts/postiv-ai_nobody-ever-activity-7494317162271076352-3n0e
 * asi que se lee de ahi en vez de adivinar. Los otros tipos van detras como
 * respaldo por si LinkedIn cambia el formato del slug.
 *
 * Devuelve null si la URL no contiene ningun id de post reconocible.
 */
export function parsearUrlPost(url: string): UrlParseada | null {
  const texto = (url || '').trim();
  if (!texto) return null;

  const construir = (tipo: string, id: string): UrlParseada => {
    const urn = `urn:li:${tipo}:${id}`;
    const resto = TIPOS_URN.filter((t) => t !== tipo).map((t) => `urn:li:${t}:${id}`);
    return { urn, candidatos: [urn, ...resto] };
  };

  // 1. URN literal, venga de /feed/update/ o pegado a pelo.
  const urnDirecto = texto.match(/urn:li:(activity|ugcPost|share):(\d+)/i);
  if (urnDirecto) {
    const tipo = TIPOS_URN.find((t) => t.toLowerCase() === urnDirecto[1].toLowerCase()) || 'activity';
    return construir(tipo, urnDirecto[2]);
  }

  // 2. URL publica /posts/<slug>-<tipo>-<id>-<codigo>. El tipo va justo antes
  //    del numero, asi que se ancla a "-tipo-digitos" y no a cualquier numero
  //    suelto del slug.
  const enSlug = texto.match(/-(activity|ugcPost|share)-(\d{10,})/i);
  if (enSlug) {
    const tipo = TIPOS_URN.find((t) => t.toLowerCase() === enSlug[1].toLowerCase()) || 'activity';
    return construir(tipo, enSlug[2]);
  }

  // 3. Solo el numero (alguien pega el id suelto). No sabemos el tipo: se
  //    prueban los tres en orden de frecuencia.
  const soloNumero = texto.match(/^(\d{10,})$/);
  if (soloNumero) return construir('activity', soloNumero[1]);

  // 4. Ultimo recurso: un numero largo en cualquier parte de la URL.
  const numeroSuelto = texto.match(/(\d{15,})/);
  if (numeroSuelto) return construir('activity', numeroSuelto[1]);

  return null;
}

export interface AutorPost {
  provider_id: string | null;
  public_identifier: string | null;
  name: string | null;
  headline: string | null;
  profile_image_url: string | null;
  is_company: boolean;
  linkedin_url: string | null;
}

export interface VistaPreviaPost {
  urn: string;
  post_url: string | null;
  autor: AutorPost;
  content_text: string;
  content_type: string;
  published_at: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  imagenes: string[];
  // La cuenta a la que ira el post: la que ya existe, o la que se creara.
  cuenta_existente: { id: string; name: string | null; is_manual: boolean; conectada: boolean } | null;
  // Con que sesion de Unipile se ha leido. Informativo, para el modal.
  leido_con: 'cuenta_propia' | 'sesion_prestada';
  raw: any;
}

// Construye la URL del perfil desde el identificador publico. Las empresas
// viven en /company/ y las personas en /in/: mezclarlas creaba creators con
// una URL que no abre.
function urlDePerfil(autor: any): string | null {
  const ident = autor?.public_identifier;
  if (!ident) return null;
  return autor?.is_company
    ? `https://www.linkedin.com/company/${ident}/`
    : `https://www.linkedin.com/in/${ident}/`;
}

// Que sesion usamos para leer. Si el post resulta ser de una de NUESTRAS
// cuentas conectadas, se usa la suya: asi las impresiones llegan de verdad en
// vez de venir a 0. Para cualquier otro autor se presta la sesion por defecto
// (UNIPILE_ACCOUNT_ID), que solo LEE contenido publico.
async function sesionParaAutor(providerId: string | null): Promise<{ accountId: string | undefined; propia: boolean }> {
  if (providerId) {
    const { rows } = await pool.query(
      `SELECT unipile_account_id FROM creators
        WHERE linkedin_id = $1 AND unipile_account_id IS NOT NULL
        LIMIT 1`,
      [providerId]
    );
    if (rows[0]?.unipile_account_id) {
      return { accountId: String(rows[0].unipile_account_id), propia: true };
    }
  }
  return { accountId: undefined, propia: false };
}

/**
 * Lee un post publico de LinkedIn a partir de su URL. NO escribe nada en la BD.
 *
 * Recorre los candidatos de `parsearUrlPost` hasta el primer 200: un 404
 * significa "ese no es el tipo de URN", no "el post no existe", asi que se
 * sigue probando. Cualquier otro error corta (un 401 no se arregla probando
 * otro URN).
 */
export async function extraerPost(url: string): Promise<VistaPreviaPost> {
  const parseada = parsearUrlPost(url);
  if (!parseada) {
    throw new Error(
      'No encuentro el id del post en esa URL. Pega el enlace completo de la publicacion (el que sale en "Copiar enlace a la publicacion").'
    );
  }

  let raw: any = null;
  let urnUsado = '';
  let ultimoError: Error | null = null;

  for (const candidato of parseada.candidatos) {
    try {
      raw = await unipileService.getPostById(candidato);
      urnUsado = candidato;
      break;
    } catch (err: any) {
      ultimoError = err;
      // 404 = tipo de URN equivocado, se prueba el siguiente. Lo demas corta.
      if (!String(err?.message || '').includes('404')) throw err;
    }
  }

  if (!raw) {
    throw new Error(
      `LinkedIn no devuelve ese post (probados ${parseada.candidatos.length} formatos de id). ` +
        'Comprueba que la publicacion es publica y que el enlace esta completo. ' +
        `Detalle: ${ultimoError?.message || 'sin respuesta'}`
    );
  }

  const autorRaw = raw.author || {};
  const providerId = autorRaw.id || null;

  // Segunda pasada SOLO si el post es de una cuenta nuestra: se relee con su
  // propia sesion para que vengan las impresiones reales.
  const sesion = await sesionParaAutor(providerId);
  if (sesion.propia && sesion.accountId) {
    try {
      raw = await unipileService.getPostById(urnUsado, sesion.accountId);
    } catch (err: any) {
      console.warn('[manualPost] relectura con la sesion propia fallo, me quedo con la prestada:', err?.message);
    }
  }

  const normalizado = unipileService.normalizePost(raw, '00000000-0000-0000-0000-000000000000');
  const imagenes = unipileService.extractMediaUrls(raw);

  const cuenta = await buscarCreator(providerId, urlDePerfil(autorRaw));

  return {
    urn: urnUsado,
    post_url: raw.share_url ? String(raw.share_url).split('?')[0] : normalizado.post_url,
    autor: {
      provider_id: providerId,
      public_identifier: autorRaw.public_identifier || null,
      name: autorRaw.name || null,
      headline: autorRaw.headline || null,
      profile_image_url: autorRaw.profile_picture_url || autorRaw.profile_picture_url_large || null,
      is_company: !!autorRaw.is_company,
      linkedin_url: urlDePerfil(autorRaw),
    },
    content_text: normalizado.content_text || '',
    content_type: normalizado.content_type,
    published_at: normalizado.published_at ? normalizado.published_at.toISOString() : null,
    likes_count: normalizado.likes_count,
    comments_count: normalizado.comments_count,
    reposts_count: normalizado.reposts_count,
    imagenes,
    cuenta_existente: cuenta
      ? {
          id: cuenta.id,
          name: cuenta.name,
          is_manual: !!cuenta.is_manual,
          conectada: !!cuenta.unipile_account_id,
        }
      : null,
    leido_con: sesion.propia ? 'cuenta_propia' : 'sesion_prestada',
    raw,
  };
}

// Busca el creator por provider_id primero (es el identificador estable de
// LinkedIn) y por URL de perfil despues (el public_identifier se puede
// cambiar, pero es lo unico que hay si el creator entro por otra via).
async function buscarCreator(
  providerId: string | null,
  linkedinUrl: string | null
): Promise<{ id: string; name: string | null; is_manual: boolean; unipile_account_id: string | null } | null> {
  if (providerId) {
    const { rows } = await pool.query(
      `SELECT id, name, is_manual, unipile_account_id FROM creators WHERE linkedin_id = $1 LIMIT 1`,
      [providerId]
    );
    if (rows[0]) return rows[0];
  }
  if (linkedinUrl) {
    const { rows } = await pool.query(
      `SELECT id, name, is_manual, unipile_account_id FROM creators WHERE linkedin_url = $1 LIMIT 1`,
      [linkedinUrl]
    );
    if (rows[0]) return rows[0];
  }
  return null;
}

// Crea la cuenta manual, o marca como gestionada una que ya existiera sin
// serlo (por ejemplo si esa persona estaba en la BD como competencia).
//
// Lo que NO se toca nunca: `is_manual` de una cuenta que YA esta conectada por
// Unipile. Pegar la URL de un post de Iker mete el post en la cuenta de Iker y
// la deja como estaba; no la degrada a manual.
async function buscarOCrearCreator(autor: AutorPost): Promise<{ id: string; creada: boolean }> {
  const existente = await buscarCreator(autor.provider_id, autor.linkedin_url);

  if (existente) {
    if (!existente.unipile_account_id) {
      await pool.query(
        `UPDATE creators
            SET is_managed = TRUE,
                is_manual = TRUE,
                name = COALESCE(name, $2),
                linkedin_id = COALESCE(linkedin_id, $3)
          WHERE id = $1`,
        [existente.id, autor.name, autor.provider_id]
      );
    }
    return { id: existente.id, creada: false };
  }

  // linkedin_url es UNIQUE NOT NULL en creators. Si LinkedIn no ha dado
  // public_identifier, se cae al provider_id para no violar el NOT NULL con
  // una cadena vacia que ademas colisionaria con el siguiente autor sin
  // identificador.
  const url =
    autor.linkedin_url ||
    (autor.provider_id ? `https://www.linkedin.com/in/${autor.provider_id}/` : null);
  if (!url) throw new Error('LinkedIn no devuelve identificador del autor: no puedo crear la cuenta.');

  const { rows } = await pool.query(
    `INSERT INTO creators (linkedin_url, linkedin_id, name, headline, profile_image_url, is_managed, is_manual)
     VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
     ON CONFLICT (linkedin_url) DO UPDATE
       SET is_managed = TRUE, is_manual = TRUE,
           -- La foto recien leida sustituye a la guardada: la vieja caduca.
           profile_image_url = COALESCE(EXCLUDED.profile_image_url, creators.profile_image_url)
     RETURNING id`,
    [url, autor.provider_id, autor.name, autor.headline, autor.profile_image_url]
  );
  return { id: String(rows[0].id), creada: true };
}

/**
 * Guarda el post manual y siembra su primer snapshot.
 *
 * Vuelve a extraer en vez de fiarse del payload que manda el navegador: lo que
 * llega del cliente es un dato, no una fuente. Asi tampoco se puede inyectar un
 * post inventado con metricas falsas desde la consola del navegador.
 */
export async function guardarPostManual(
  url: string,
  privadas: MetricasPrivadas
): Promise<{ post_id: string; creator_id: string; cuenta_creada: boolean; nombre: string | null }> {
  const vista = await extraerPost(url);
  if (!vista.published_at) {
    throw new Error('LinkedIn no devuelve la fecha de publicacion de ese post. Sin fecha no hay curva ni fases.');
  }

  const { id: creatorId, creada } = await buscarOCrearCreator(vista.autor);

  const enriquecido = enrichPost({
    content_text: vista.content_text,
    likes_count: vista.likes_count,
    comments_count: vista.comments_count,
    reposts_count: vista.reposts_count,
  });

  const pillar = classifyPillar({
    content_text: vista.content_text,
    content_type: vista.content_type,
  });

  // Upsert PROPIO en vez de PostModel.bulkUpsert, y esta es la razon:
  // bulkUpsert hace `impressions_count = EXCLUDED.impressions_count` sin
  // COALESCE. Como Unipile devuelve 0/null de impresiones en un post ajeno,
  // pasar por ahi BORRARIA en cada refresco las impresiones escritas a mano —
  // justo el dato que mas cuesta conseguir aqui. Con COALESCE, lo que se
  // escribio a mano solo lo cambia otra escritura a mano.
  const { rows } = await pool.query(
    `INSERT INTO posts (
       creator_id, linkedin_post_id, content_text, content_type, published_at,
       likes_count, comments_count, reposts_count,
       impressions_count, link_clicks_count, saves_count, sends_count,
       premium_button_clicks, profile_viewers_count, followers_gained_count, link_url,
       engagement_score, hook_text, word_count, char_count, line_break_count,
       has_aggressive_spacing, hook_type, post_structure, comment_like_ratio,
       share_like_ratio, text_tone, has_hashtags, hashtags, has_emoji,
       has_call_to_action, language, post_url, raw_data, pillar
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
       $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35
     )
     ON CONFLICT (linkedin_post_id) DO UPDATE SET
       content_text = EXCLUDED.content_text,
       content_type = EXCLUDED.content_type,
       likes_count = EXCLUDED.likes_count,
       comments_count = EXCLUDED.comments_count,
       reposts_count = EXCLUDED.reposts_count,
       engagement_score = EXCLUDED.engagement_score,
       hook_text = EXCLUDED.hook_text,
       raw_data = EXCLUDED.raw_data,
       post_url = COALESCE(EXCLUDED.post_url, posts.post_url),
       impressions_count = COALESCE(EXCLUDED.impressions_count, posts.impressions_count),
       link_clicks_count = COALESCE(EXCLUDED.link_clicks_count, posts.link_clicks_count),
       saves_count = COALESCE(EXCLUDED.saves_count, posts.saves_count),
       sends_count = COALESCE(EXCLUDED.sends_count, posts.sends_count),
       premium_button_clicks = COALESCE(EXCLUDED.premium_button_clicks, posts.premium_button_clicks),
       profile_viewers_count = COALESCE(EXCLUDED.profile_viewers_count, posts.profile_viewers_count),
       followers_gained_count = COALESCE(EXCLUDED.followers_gained_count, posts.followers_gained_count),
       link_url = COALESCE(EXCLUDED.link_url, posts.link_url),
       pillar = COALESCE(posts.pillar, EXCLUDED.pillar)
     RETURNING id, impressions_count`,
    [
      creatorId,
      vista.urn,
      vista.content_text,
      vista.content_type,
      vista.published_at,
      vista.likes_count,
      vista.comments_count,
      vista.reposts_count,
      privadas.impressions_count ?? null,
      privadas.link_clicks_count ?? null,
      privadas.saves_count ?? null,
      privadas.sends_count ?? null,
      privadas.premium_button_clicks ?? null,
      privadas.profile_viewers_count ?? null,
      privadas.followers_gained_count ?? null,
      privadas.link_url ?? null,
      enriquecido.engagement_score,
      enriquecido.hook_text,
      enriquecido.word_count,
      enriquecido.char_count,
      enriquecido.line_break_count,
      enriquecido.has_aggressive_spacing,
      enriquecido.hook_type,
      enriquecido.post_structure,
      enriquecido.comment_like_ratio,
      enriquecido.share_like_ratio,
      enriquecido.text_tone,
      enriquecido.has_hashtags,
      enriquecido.hashtags,
      enriquecido.has_emoji,
      enriquecido.has_call_to_action,
      enriquecido.language,
      vista.post_url,
      JSON.stringify(vista.raw),
      pillar,
    ]
  );

  const postId = String(rows[0].id);
  // Las impresiones del snapshot son las EFECTIVAS tras el COALESCE, no las que
  // venian en el formulario. Si el post ya existia con impresiones y se vuelve a
  // pegar su URL sin escribir nada, usar el formulario (vacio) meteria un punto
  // nulo en medio de la curva y la partiria en dos.
  await insertarSnapshot(postId, {
    likes_count: vista.likes_count,
    comments_count: vista.comments_count,
    reposts_count: vista.reposts_count,
    impressions_count: rows[0].impressions_count ?? null,
  });

  // El multiplicador se queda en 0 hasta que alguien lo recalcula, y un post
  // recien guardado que muestra "0.0x" se lee como que ha fracasado. Con un solo
  // post de la cuenta sale 1.00x, que es lo honesto: todavia no hay con que
  // comparar.
  await recalcCreatorOutliers(creatorId).catch((e: any) =>
    console.warn('[manualPost] recalc outliers fallo:', e?.message)
  );

  return { post_id: postId, creator_id: creatorId, cuenta_creada: creada, nombre: vista.autor.name };
}

/**
 * Escribe un punto en la curva.
 *
 * Cada edicion de metricas privadas añade una fila con su hora, en vez de
 * pisar la anterior: es lo unico que permite que un post manual tenga curva de
 * impresiones. Si solo se escribe una vez, sale un punto y ya.
 *
 * `post_snapshots` guarda SOLO las 4 metricas que la curva dibuja (impresiones,
 * likes, comentarios, reposts). Los clics, guardados y envios viven en `posts`
 * con su valor actual y no se historifican: nadie los pinta en el tiempo, y
 * añadir 7 columnas para un historico que no se lee es peso muerto. El dia que
 * haga falta, se añaden aqui.
 */
export async function insertarSnapshot(
  postId: string,
  valores: Record<string, any>
): Promise<void> {
  await pool.query(
    `INSERT INTO post_snapshots (
       post_id, likes_count, comments_count, reposts_count, impressions_count
     ) VALUES ($1,$2,$3,$4,$5)`,
    [
      postId,
      valores.likes_count ?? 0,
      valores.comments_count ?? 0,
      valores.reposts_count ?? 0,
      valores.impressions_count ?? null,
    ]
  );
}

/**
 * Actualiza las metricas privadas de un post y deja el punto en la curva.
 *
 * Solo se escriben las claves que vienen en el cuerpo: mandar `{impressions_count: 500}`
 * no borra los clics que ya habia. Para borrar un valor a proposito se manda
 * null explicito.
 */
export async function actualizarMetricasPrivadas(
  postId: string,
  privadas: MetricasPrivadas
): Promise<{ post_id: string }> {
  const sets: string[] = [];
  const valores: any[] = [];
  let idx = 1;

  for (const campo of CAMPOS_PRIVADOS) {
    if (campo in privadas) {
      sets.push(`${campo} = $${idx++}`);
      valores.push((privadas as any)[campo] ?? null);
    }
  }

  if (sets.length === 0) throw new Error('No has mandado ninguna metrica.');

  valores.push(postId);
  const { rows } = await pool.query(
    `UPDATE posts SET ${sets.join(', ')} WHERE id = $${idx}
     RETURNING id, likes_count, comments_count, reposts_count,
               impressions_count, link_clicks_count, saves_count, sends_count,
               premium_button_clicks, profile_viewers_count, followers_gained_count, link_url`,
    valores
  );
  if (rows.length === 0) throw new Error('Ese post no existe.');

  // El snapshot se siembra con la fila YA actualizada, para que el punto de la
  // curva lleve tambien los contadores publicos del momento y no solo lo que
  // se acaba de teclear.
  await insertarSnapshot(postId, rows[0]);

  // Escribir las impresiones cambia la media de impresiones de la cuenta, y con
  // ella el multiplicador de sus posts. Sin este recalculo, el numero grande de
  // la derecha se queda con el valor de antes de teclear.
  const { rows: duenio } = await pool.query(`SELECT creator_id FROM posts WHERE id = $1`, [postId]);
  if (duenio[0]?.creator_id) {
    await recalcCreatorOutliers(String(duenio[0].creator_id)).catch((e: any) =>
      console.warn('[manualPost] recalc outliers fallo:', e?.message)
    );
  }

  return { post_id: postId };
}

/**
 * Relee los contadores PUBLICOS de un post manual y añade un snapshot.
 *
 * Lo llama el tick de postMonitor. Va post a post con getPostById en vez de
 * recorrer el feed del autor: son pocos posts y recorrer el feed entero de un
 * tercero es mucho mas caro y trae contenido que no queremos.
 *
 * Las metricas privadas del ultimo snapshot se ARRASTRAN al nuevo. Sin eso, la
 * curva de impresiones caeria a cero cada 15 minutos entre dos ediciones
 * manuales y no se podria leer.
 */
export async function refrescarPostManual(
  postId: string,
  urn: string
): Promise<{ ok: boolean; motivo?: string }> {
  let raw: any;
  try {
    raw = await unipileService.getPostById(urn);
  } catch (err: any) {
    return { ok: false, motivo: err?.message || 'Unipile no responde' };
  }

  // Las impresiones del post (escritas a mano) se ARRASTRAN al snapshot nuevo.
  // Sin esto la curva caeria a cero cada 15 minutos entre dos ediciones
  // manuales, y una curva que baja a cero y vuelve a subir no se puede leer.
  const { rows: actual } = await pool.query(
    `SELECT impressions_count, likes_count, comments_count, reposts_count FROM posts WHERE id = $1`,
    [postId]
  );

  // ESCUDO ANTI-CERO (2026-09-17): Unipile da contadores a 0 a ratos. Un post
  // que ya tenia likes no los pierde: esa lectura se descarta entera.
  if (Number(actual[0]?.likes_count) > 0 && !(Number(raw.reaction_counter) > 0)) {
    return { ok: false, motivo: 'lectura degradada (likes a 0), se descarta' };
  }
  const noBaja = (nuevo: any, viejo: any) => (Number(nuevo) > 0 ? Number(nuevo) : Number(viejo) || 0);
  const likes = noBaja(raw.reaction_counter, actual[0]?.likes_count);
  const comentarios = noBaja(raw.comment_counter, actual[0]?.comments_count);
  const reposts = noBaja(raw.repost_counter, actual[0]?.reposts_count);

  await insertarSnapshot(postId, {
    likes_count: likes,
    comments_count: comentarios,
    reposts_count: reposts,
    impressions_count: actual[0]?.impressions_count ?? null,
  });

  // En el post solo se tocan los contadores publicos y lo derivado de ellos.
  // impressions_count y las demas privadas NO se tocan aqui: son del usuario.
  const enriquecido = enrichPost({
    content_text: raw.text || '',
    likes_count: likes,
    comments_count: comentarios,
    reposts_count: reposts,
  });

  await pool.query(
    `UPDATE posts
        SET likes_count = $2, comments_count = $3, reposts_count = $4,
            engagement_score = $5, comment_like_ratio = $6, share_like_ratio = $7,
            raw_data = $8
      WHERE id = $1`,
    [
      postId,
      likes,
      comentarios,
      reposts,
      enriquecido.engagement_score,
      enriquecido.comment_like_ratio,
      enriquecido.share_like_ratio,
      JSON.stringify(raw),
    ]
  );

  return { ok: true };
}
