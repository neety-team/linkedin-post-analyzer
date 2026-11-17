/**
 * LA SEMANA: el calendario de posts de las tres cuentas y el feedback de cada
 * post (2026-11-17).
 *
 * Por que existe: los posts de una semana se escriben la anterior y cada
 * fundador lee los suyos y dice que cambiaria. Hasta ahora eso vivia en un
 * chat. Aqui queda en la misma base que los posts publicados y sus metricas,
 * y Claude lo lee y lo escribe por el MCP (`mcp/toolsSemana.ts`).
 *
 * Una semana se identifica por su codigo ISO ('2026-W48'). Un post, dentro de
 * su semana, por una `clave` estable ('24-unai-mapa'): reescribir el texto de
 * un post NO cambia su id, asi que el feedback que ya tiene no se pierde.
 */
import pool from '../db';

export const CUENTAS = ['iker', 'unai', 'asier'] as const;
export const OBJETIVOS = ['alcance', 'notoriedad', 'conversion'] as const;
export const ESTADOS_POST = [
  'idea',
  'esqueleto',
  'a_medias',
  'escrito',
  'aprobado',
  'programado',
  'publicado',
] as const;
export const NIVELES = ['estilo', 'pilar', 'post'] as const;

const RE_SEMANA = /^\d{4}-W\d{2}$/;

export function esSemanaValida(s: unknown): s is string {
  return typeof s === 'string' && RE_SEMANA.test(s);
}

export interface PostSemanaEntrada {
  clave: string;
  fecha?: string;
  cuenta?: string;
  objetivo?: string;
  experimento?: boolean;
  pilar?: string | null;
  titulo?: string;
  texto?: string | null;
  estado?: string;
  vara?: string | null;
  por_que?: string | null;
  falta?: string | null;
  nota_imagen?: string | null;
}

function limpio(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

/** Las semanas que existen, la mas reciente primero, con su carga de trabajo. */
export async function listarSemanas() {
  const { rows } = await pool.query(
    `SELECT s.semana, s.estado, s.nota, s.updated_at,
            COALESCE(p.n, 0)::int AS posts,
            COALESCE(f.n, 0)::int AS feedback_pendiente
       FROM semanas s
       LEFT JOIN (SELECT semana, COUNT(*) AS n FROM semana_posts GROUP BY semana) p
              ON p.semana = s.semana
       LEFT JOIN (
              SELECT sp.semana, COUNT(*) AS n
                FROM semana_feedback sf
                JOIN semana_posts sp ON sp.id = sf.post_id
               WHERE sf.resuelto = FALSE
               GROUP BY sp.semana
            ) f ON f.semana = s.semana
      ORDER BY s.semana DESC`
  );
  return rows;
}

/** Una semana entera: sus posts en orden de dia y cuenta, cada uno con su feedback. */
export async function leerSemana(semana: string) {
  const cab = await pool.query(`SELECT semana, estado, nota, updated_at FROM semanas WHERE semana = $1`, [
    semana,
  ]);
  if (!cab.rows.length) return null;

  const posts = await pool.query(
    `SELECT id, semana, clave, to_char(fecha, 'YYYY-MM-DD') AS fecha, cuenta, objetivo,
            experimento, pilar, titulo, texto, estado, vara, por_que, falta, nota_imagen, updated_at,
            (imagen IS NOT NULL) AS tiene_imagen,
            (EXTRACT(EPOCH FROM imagen_at) * 1000)::bigint::text AS imagen_version
       FROM semana_posts
      WHERE semana = $1
      ORDER BY fecha, array_position(ARRAY['iker','unai','asier'], cuenta), clave`,
    [semana]
  );
  const fb = await pool.query(
    `SELECT sf.id, sf.post_id, sf.autor, sf.texto, sf.nivel, sf.resuelto, sf.respuesta,
            sf.created_at, sf.resuelto_at
       FROM semana_feedback sf
       JOIN semana_posts sp ON sp.id = sf.post_id
      WHERE sp.semana = $1
      ORDER BY sf.created_at`,
    [semana]
  );
  const porPost = new Map<string, any[]>();
  for (const f of fb.rows) {
    if (!porPost.has(f.post_id)) porPost.set(f.post_id, []);
    porPost.get(f.post_id)!.push(f);
  }
  return {
    ...cab.rows[0],
    posts: posts.rows.map((p) => ({ ...p, feedback: porPost.get(p.id) || [] })),
  };
}

/**
 * Crea o actualiza una semana y sus posts. NO borra nada: un post que no viene
 * en la llamada se queda como estaba, porque borrarlo se llevaria su feedback.
 *
 * En un post que ya existe solo cambian los campos que vienen; asi se puede
 * mandar solo `{clave, texto}` para corregir un borrador.
 */
export async function guardarSemana(
  semana: string,
  datos: { estado?: string; nota?: string | null; posts?: PostSemanaEntrada[] }
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO semanas (semana, estado, nota)
       VALUES ($1, COALESCE($2, 'propuesta'), $3)
       ON CONFLICT (semana) DO UPDATE
          SET estado = COALESCE($2, semanas.estado),
              nota = CASE WHEN $4 THEN $3 ELSE semanas.nota END,
              updated_at = NOW()`,
      [semana, limpio(datos.estado, 30), limpio(datos.nota, 2000), datos.nota !== undefined]
    );

    let creados = 0;
    let actualizados = 0;
    for (const p of datos.posts || []) {
      const clave = limpio(p.clave, 80);
      if (!clave) throw new Error('Cada post necesita su `clave`');
      if (p.cuenta !== undefined && !CUENTAS.includes(p.cuenta as any)) {
        throw new Error(`Cuenta no válida en ${clave}: ${p.cuenta}`);
      }
      if (p.objetivo !== undefined && !OBJETIVOS.includes(p.objetivo as any)) {
        throw new Error(`Objetivo no válido en ${clave}: ${p.objetivo}`);
      }
      if (p.estado !== undefined && !ESTADOS_POST.includes(p.estado as any)) {
        throw new Error(`Estado no válido en ${clave}: ${p.estado}`);
      }

      const existe = await client.query(`SELECT id FROM semana_posts WHERE semana = $1 AND clave = $2`, [
        semana,
        clave,
      ]);
      if (!existe.rows.length) {
        if (!p.fecha || !p.cuenta || !p.objetivo || !p.titulo) {
          throw new Error(`El post nuevo ${clave} necesita fecha, cuenta, objetivo y titulo`);
        }
        await client.query(
          `INSERT INTO semana_posts
             (semana, clave, fecha, cuenta, objetivo, experimento, pilar, titulo, texto, estado,
              vara, por_que, falta, nota_imagen)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'idea'),$11,$12,$13,$14)`,
          [
            semana,
            clave,
            p.fecha,
            p.cuenta,
            p.objetivo,
            !!p.experimento,
            limpio(p.pilar, 200),
            limpio(p.titulo, 300),
            p.texto ?? '',
            p.estado ?? null,
            limpio(p.vara, 300),
            limpio(p.por_que, 2000),
            limpio(p.falta, 2000),
            limpio(p.nota_imagen, 3000),
          ]
        );
        creados++;
        continue;
      }

      // Solo los campos que vienen. `undefined` deja el valor; `null` o '' lo vacia.
      const sets: string[] = [];
      const vals: any[] = [];
      const pon = (col: string, v: any) => {
        vals.push(v);
        sets.push(`${col} = $${vals.length}`);
      };
      if (p.fecha !== undefined) pon('fecha', p.fecha);
      if (p.cuenta !== undefined) pon('cuenta', p.cuenta);
      if (p.objetivo !== undefined) pon('objetivo', p.objetivo);
      if (p.experimento !== undefined) pon('experimento', !!p.experimento);
      if (p.pilar !== undefined) pon('pilar', limpio(p.pilar, 200));
      if (p.titulo !== undefined) pon('titulo', limpio(p.titulo, 300));
      if (p.texto !== undefined) pon('texto', p.texto ?? '');
      if (p.estado !== undefined) pon('estado', p.estado);
      if (p.vara !== undefined) pon('vara', limpio(p.vara, 300));
      if (p.por_que !== undefined) pon('por_que', limpio(p.por_que, 2000));
      if (p.falta !== undefined) pon('falta', limpio(p.falta, 2000));
      if (p.nota_imagen !== undefined) pon('nota_imagen', limpio(p.nota_imagen, 3000));
      if (sets.length) {
        vals.push(existe.rows[0].id);
        await client.query(
          `UPDATE semana_posts SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length}`,
          vals
        );
        actualizados++;
      }
    }
    await client.query('COMMIT');
    return { creados, actualizados };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── La foto de un post ───────────────────────────────────────────────────────

export const IMAGEN_MAX_BYTES = 8 * 1024 * 1024;

/**
 * El tipo de una imagen segun sus primeros bytes, o null si no es JPEG, PNG,
 * WebP ni GIF. No se cree lo que diga el navegador en Content-Type: asi no se
 * puede guardar un HTML o un SVG con script haciendolo pasar por foto.
 */
export function tipoDeImagen(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  const gif = b.toString('latin1', 0, 6);
  if (gif === 'GIF87a' || gif === 'GIF89a') return 'image/gif';
  return null;
}

/** Guarda la foto de un post. Devuelve null si el post no existe. */
export async function guardarImagen(postId: string, datos: Buffer) {
  if (!datos.length) throw new Error('La imagen está vacía');
  if (datos.length > IMAGEN_MAX_BYTES) throw new Error('La imagen pesa más de 8 MB');
  const tipo = tipoDeImagen(datos);
  if (!tipo) throw new Error('Solo se admiten fotos JPEG, PNG, WebP o GIF');
  const { rows } = await pool.query(
    `UPDATE semana_posts SET imagen = $2, imagen_tipo = $3, imagen_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING id, (EXTRACT(EPOCH FROM imagen_at) * 1000)::bigint::text AS imagen_version`,
    [postId, datos, tipo]
  );
  return rows[0] ? { id: rows[0].id, tipo, bytes: datos.length, imagen_version: rows[0].imagen_version } : null;
}

export async function leerImagen(postId: string): Promise<{ datos: Buffer; tipo: string; version: string } | null> {
  const { rows } = await pool.query(
    `SELECT imagen, imagen_tipo, (EXTRACT(EPOCH FROM imagen_at) * 1000)::bigint::text AS version
       FROM semana_posts WHERE id = $1 AND imagen IS NOT NULL`,
    [postId]
  );
  if (!rows.length) return null;
  return { datos: rows[0].imagen, tipo: rows[0].imagen_tipo || 'application/octet-stream', version: rows[0].version };
}

/** Quita la foto de un post. true si tenia una. */
export async function borrarImagen(postId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE semana_posts SET imagen = NULL, imagen_tipo = NULL, imagen_at = NULL, updated_at = NOW()
      WHERE id = $1 AND imagen IS NOT NULL`,
    [postId]
  );
  return !!rowCount;
}

/**
 * Nombre, titular y foto de perfil de las tres cuentas, para pintar cada post
 * como se vera en LinkedIn. Sale de `creators` (las cuentas propias llevan
 * `is_managed`). Si no hay datos devuelve {} y la pagina pone solo el nombre.
 */
export async function perfilesDeCuentas(): Promise<Record<string, { nombre: string; titular: string | null; foto: string | null }>> {
  const out: Record<string, { nombre: string; titular: string | null; foto: string | null }> = {};
  try {
    const { rows } = await pool.query(
      `SELECT name, headline, profile_image_url FROM creators WHERE is_managed = TRUE AND name IS NOT NULL`
    );
    for (const r of rows) {
      const primero = String(r.name).trim().split(/\s+/)[0].toLowerCase();
      const cuenta = CUENTAS.find((c) => c === primero);
      if (cuenta) out[cuenta] = { nombre: r.name, titular: r.headline || null, foto: r.profile_image_url || null };
    }
  } catch {
    /* sin tabla o sin columna: la pagina se apaña con el nombre */
  }
  return out;
}

/** Un fundador deja feedback en un post. */
export async function crearFeedback(postId: string, autor: string, texto: string) {
  const a = limpio(autor, 60);
  const t = limpio(texto, 4000);
  if (!a) throw new Error('Falta quién deja el feedback');
  if (!t) throw new Error('El feedback está vacío');
  const post = await pool.query(`SELECT id FROM semana_posts WHERE id = $1`, [postId]);
  if (!post.rows.length) return null;
  const { rows } = await pool.query(
    `INSERT INTO semana_feedback (post_id, autor, texto) VALUES ($1, $2, $3)
     RETURNING id, post_id, autor, texto, nivel, resuelto, respuesta, created_at, resuelto_at`,
    [postId, a, t]
  );
  return rows[0];
}

/** El feedback con el post al que pertenece. Por defecto, solo lo que falta por atender. */
export async function listarFeedback(opts: { semana?: string; soloPendiente?: boolean } = {}) {
  const cond: string[] = [];
  const vals: any[] = [];
  if (opts.soloPendiente !== false) cond.push('sf.resuelto = FALSE');
  if (opts.semana) {
    vals.push(opts.semana);
    cond.push(`sp.semana = $${vals.length}`);
  }
  const { rows } = await pool.query(
    `SELECT sf.id, sf.autor, sf.texto, sf.nivel, sf.resuelto, sf.respuesta, sf.created_at,
            sp.id AS post_id, sp.semana, sp.clave, sp.cuenta, sp.titulo, sp.pilar, sp.objetivo,
            to_char(sp.fecha, 'YYYY-MM-DD') AS fecha
       FROM semana_feedback sf
       JOIN semana_posts sp ON sp.id = sf.post_id
      ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''}
      ORDER BY sf.created_at`,
    vals
  );
  return rows;
}

/** Clasifica, contesta o cierra un feedback. Solo cambia lo que viene. */
export async function actualizarFeedback(
  id: string,
  cambios: { nivel?: string | null; resuelto?: boolean; respuesta?: string | null }
) {
  if (cambios.nivel !== undefined && cambios.nivel !== null && !NIVELES.includes(cambios.nivel as any)) {
    throw new Error(`Nivel no válido: ${cambios.nivel}`);
  }
  const sets: string[] = [];
  const vals: any[] = [];
  const pon = (sql: string, v?: any) => {
    if (v !== undefined) {
      vals.push(v);
      sets.push(sql.replace('?', `$${vals.length}`));
    } else {
      sets.push(sql);
    }
  };
  if (cambios.nivel !== undefined) pon('nivel = ?', cambios.nivel);
  if (cambios.respuesta !== undefined) pon('respuesta = ?', limpio(cambios.respuesta, 4000));
  if (cambios.resuelto !== undefined) {
    pon('resuelto = ?', !!cambios.resuelto);
    pon(cambios.resuelto ? 'resuelto_at = NOW()' : 'resuelto_at = NULL');
  }
  if (!sets.length) throw new Error('Nada que cambiar');
  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE semana_feedback SET ${sets.join(', ')} WHERE id = $${vals.length}
     RETURNING id, post_id, autor, texto, nivel, resuelto, respuesta, created_at, resuelto_at`,
    vals
  );
  return rows[0] || null;
}
