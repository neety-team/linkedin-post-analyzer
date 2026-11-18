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
import { normalizarMenciones, motivoMenciones, type Mencion } from './menciones';

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

/**
 * EL CANDADO (2026-11-17). Un post no puede quedar aprobado, programado ni
 * publicado si su texto tiene un hueco entre corchetes (`[pendiente · …]`,
 * `[PAÍS]`) o esta vacio. Los corchetes son como se marca lo que falta y no se
 * puede escribir sin inventar: si uno llega a LinkedIn, sale publicado tal cual.
 * Se comprueba aqui, en el unico sitio por donde se guarda un post, para que
 * valga igual para la pagina, para el MCP y para una publicacion automatica.
 */
const ESTADOS_CERRADOS = ['aprobado', 'programado', 'publicado'];
const RE_HUECO = /\[[^\]\n]+\]/;

export function motivoNoPublicable(estado: string, texto: string): string | null {
  if (!ESTADOS_CERRADOS.includes(estado)) return null;
  if (!texto.trim()) return 'no tiene texto';
  const hueco = RE_HUECO.exec(texto);
  if (hueco) return `tiene huecos sin rellenar, el primero: ${hueco[0].slice(0, 80)}`;
  return null;
}

/**
 * PROGRAMAR (2026-11-18). Solo se programa un post escrito o aprobado, que pase
 * el candado y cuyas menciones (`@Nombre`) tengan todas su perfil de LinkedIn.
 * Lo mira la pagina para el panel de «Programar posts», la ruta de programar
 * antes de guardar y el publicador otra vez justo antes de subirlo.
 */
export const ESTADOS_PROGRAMABLES = ['aprobado', 'escrito'];

const ESTADO_LEGIBLE: Record<string, string> = {
  idea: 'idea',
  esqueleto: 'esqueleto',
  a_medias: 'a medias',
  escrito: 'escrito',
  aprobado: 'aprobado',
  programado: 'programado',
  publicado: 'publicado',
};

export function motivoNoProgramable(p: {
  estado: string;
  texto: string | null;
  menciones?: Mencion[] | null;
  falta?: string | null;
}): string | null {
  if (p.estado === 'programado') return 'Ya está programado';
  if (p.estado === 'publicado') return 'Ya está publicado';
  if (!ESTADOS_PROGRAMABLES.includes(p.estado)) {
    return `Está en «${ESTADO_LEGIBLE[p.estado] || p.estado}»: solo se programan los posts escritos o aprobados`;
  }
  return motivoParaPublicar(p.texto || '', p.menciones, p.falta);
}

/** El candado y las menciones, sin mirar el estado. Lo usa tambien el publicador. */
export function motivoParaPublicar(texto: string, menciones?: Mencion[] | null, falta?: string | null): string | null {
  // Lo que dice «Qué falta» bloquea igual que un hueco: un post con algo pendiente
  // (un visto bueno, una foto, un dato) no se programa ni se publica (2026-11-18).
  if (falta && falta.trim()) return `Falta: ${falta.trim()}`;
  const candado = motivoNoPublicable('programado', texto);
  if (candado) return candado.charAt(0).toUpperCase() + candado.slice(1);
  return motivoMenciones(texto, menciones);
}

export function esSemanaValida(s: unknown): s is string {
  return typeof s === 'string' && RE_SEMANA.test(s);
}

/**
 * POSTS COLABORATIVOS (2026-11-17). Un post puede firmarlo mas de una cuenta:
 * `cuenta` es la que lo publica y `coautores`, las otras que lo firman. Se
 * normaliza al orden de las columnas (iker, unai, asier) para que el mismo
 * reparto se guarde siempre igual. `null` vacia la lista.
 */
export function normalizarCoautores(v: unknown, cuenta: string | undefined, clave: string): string[] {
  if (v === null) return [];
  if (!Array.isArray(v)) throw new Error(`\`coautores\` de ${clave} tiene que ser una lista de cuentas`);
  for (const c of v) {
    if (!CUENTAS.includes(c as any)) throw new Error(`Coautor no válido en ${clave}: ${c}`);
  }
  if (new Set(v).size !== v.length) throw new Error(`Coautor repetido en ${clave}`);
  if (cuenta && v.includes(cuenta)) {
    throw new Error(`En ${clave}, ${cuenta} es quien publica: no puede ser también coautor`);
  }
  return CUENTAS.filter((c) => v.includes(c));
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
  /** Las otras cuentas que firman un post colaborativo. `null` o [] = post de una cuenta. */
  coautores?: string[] | null;
  /** Los perfiles de los `@Nombre` del texto: [{nombre, profile_id}]. `null` vacia la lista. */
  menciones?: Mencion[] | null;
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
            experimento, pilar, titulo, texto, estado, vara, por_que, falta, nota_imagen, coautores, updated_at,
            menciones, programado_para, publicando_desde, publicado_at, linkedin_post_id, unipile_draft_id,
            error_publicacion,
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
    posts: posts.rows.map((p) => ({
      ...p,
      motivo_no_programable: motivoNoProgramable(p),
      feedback: porPost.get(p.id) || [],
    })),
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

      const existe = await client.query(
        `SELECT id, estado, texto, cuenta, coautores, to_char(fecha, 'YYYY-MM-DD') AS fecha,
                programado_para, publicando_desde, publicado_at
           FROM semana_posts WHERE semana = $1 AND clave = $2
           FOR UPDATE`,
        [semana, clave]
      );
      const actual = existe.rows[0];

      // PROGRAMADOS Y PUBLICADOS (2026-11-18). El PUT no programa, no desprograma
      // y no toca la hora: eso solo lo hacen las rutas de programar y quitar y el
      // publicador. Asi, volver a subir la semana desde los scripts (que mandan
      // `estado: escrito`) no desprograma nada. Con una excepcion: si cambia lo
      // que se va a publicar (texto, cuenta o dia), el post vuelve a «aprobado» y
      // pierde la hora, para que nadie publique algo que no ha visto.
      let estadoPedido = p.estado;
      let desprogramar = false;
      const protegido =
        !!actual && (actual.estado === 'programado' || (actual.estado === 'publicado' && !!actual.publicado_at));
      if (protegido) estadoPedido = undefined;
      if (actual?.estado === 'programado') {
        const cambia =
          (p.texto !== undefined && (p.texto ?? '') !== actual.texto) ||
          (p.cuenta !== undefined && p.cuenta !== actual.cuenta) ||
          (p.fecha !== undefined && p.fecha !== actual.fecha);
        if (cambia) {
          if (actual.publicando_desde) {
            throw new Error(`El post ${clave} se está publicando ahora mismo: espera a que acabe para cambiarlo`);
          }
          estadoPedido = 'aprobado';
          desprogramar = true;
        }
      }
      if (estadoPedido === 'programado' && actual?.estado !== 'programado') {
        throw new Error(`El post ${clave} se programa desde la página, con «Programar posts», no al guardar la semana`);
      }
      const menciones = p.menciones !== undefined ? normalizarMenciones(p.menciones, clave) : undefined;

      // Coautores: se validan contra la cuenta con la que QUEDARA el post. Si
      // solo cambia la cuenta, tampoco puede pasar a ser uno de sus coautores.
      const cuentaFinal: string | undefined = p.cuenta ?? existe.rows[0]?.cuenta;
      let coautores: string[] | undefined;
      if (p.coautores !== undefined) {
        coautores = normalizarCoautores(p.coautores, cuentaFinal, clave);
      } else if (p.cuenta !== undefined && (existe.rows[0]?.coautores || []).includes(p.cuenta)) {
        throw new Error(`En ${clave}, ${p.cuenta} ya es coautor: quítalo de \`coautores\` para que lo publique`);
      }

      // El candado: se mira como QUEDARIA el post despues de guardar.
      const estadoFinal = estadoPedido ?? actual?.estado ?? 'idea';
      const textoFinal = p.texto !== undefined ? p.texto ?? '' : existe.rows[0]?.texto ?? '';
      const motivo = motivoNoPublicable(estadoFinal, textoFinal);
      if (motivo) {
        throw new Error(`El post ${clave} no puede quedar en «${estadoFinal}»: ${motivo}`);
      }

      if (!existe.rows.length) {
        if (!p.fecha || !p.cuenta || !p.objetivo || !p.titulo) {
          throw new Error(`El post nuevo ${clave} necesita fecha, cuenta, objetivo y titulo`);
        }
        await client.query(
          `INSERT INTO semana_posts
             (semana, clave, fecha, cuenta, objetivo, experimento, pilar, titulo, texto, estado,
              vara, por_que, falta, nota_imagen, coautores, menciones)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,'idea'),$11,$12,$13,$14,$15,$16)`,
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
            estadoPedido ?? null,
            limpio(p.vara, 300),
            limpio(p.por_que, 2000),
            limpio(p.falta, 2000),
            limpio(p.nota_imagen, 3000),
            coautores ?? [],
            JSON.stringify(menciones ?? []),
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
      if (estadoPedido !== undefined && estadoPedido !== actual.estado) pon('estado', estadoPedido);
      if (p.vara !== undefined) pon('vara', limpio(p.vara, 300));
      if (p.por_que !== undefined) pon('por_que', limpio(p.por_que, 2000));
      if (p.falta !== undefined) pon('falta', limpio(p.falta, 2000));
      if (p.nota_imagen !== undefined) pon('nota_imagen', limpio(p.nota_imagen, 3000));
      if (coautores !== undefined) pon('coautores', coautores);
      if (menciones !== undefined) pon('menciones', JSON.stringify(menciones));
      // La unica columna de la programacion que toca el PUT, y solo para quitar la hora.
      if (desprogramar) sets.push('programado_para = NULL');
      if (sets.length) {
        vals.push(actual.id);
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

// ── Programar y quitar de la programacion ────────────────────────────────────

/** Margen para una hora que ya ha pasado mientras se confirmaba el panel. */
const MARGEN_PASADO_MS = 2 * 60 * 1000;

export interface PeticionProgramar {
  id: string;
  /** Instante ISO, calculado en el navegador (hora de Madrid). */
  programado_para: string;
}

/**
 * Pasa a «programado» los posts pedidos, cada uno con su hora. Es todo o nada:
 * si uno no se puede programar, no se programa ninguno y el error dice cual y
 * por que. El candado y las menciones se comprueban aqui, en el servidor,
 * aunque la pagina ya los haya mirado.
 */
export async function programarPosts(semana: string, peticiones: PeticionProgramar[], ahora = new Date()) {
  if (!Array.isArray(peticiones) || !peticiones.length) throw new Error('No hay ningún post marcado para programar');
  const ids = new Set<string>();
  for (const p of peticiones) {
    if (!p || typeof p.id !== 'string') throw new Error('Cada post necesita su `id`');
    if (ids.has(p.id)) throw new Error('Hay un post repetido');
    ids.add(p.id);
    const t = typeof p.programado_para === 'string' ? Date.parse(p.programado_para) : NaN;
    if (!Number.isFinite(t)) throw new Error('Cada post necesita su hora (`programado_para`, en ISO)');
    if (t < ahora.getTime() - MARGEN_PASADO_MS) throw new Error('Una de las horas ya ha pasado: elige una posterior');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const programados: { id: string; clave: string; programado_para: string }[] = [];
    for (const p of peticiones) {
      const { rows } = await client.query(
        `SELECT id, clave, semana, estado, texto, menciones, falta FROM semana_posts WHERE id = $1 FOR UPDATE`,
        [p.id]
      );
      const fila = rows[0];
      if (!fila || fila.semana !== semana) throw new Error('Uno de los posts no es de esta semana');
      const motivo = motivoNoProgramable(fila);
      if (motivo) throw new Error(`«${fila.clave}» no se puede programar: ${motivo}`);
      const r = await client.query(
        `UPDATE semana_posts
            SET estado = 'programado', programado_para = $2, publicando_desde = NULL,
                error_publicacion = NULL, updated_at = NOW()
          WHERE id = $1
          RETURNING id, clave, programado_para`,
        [p.id, new Date(p.programado_para).toISOString()]
      );
      programados.push(r.rows[0]);
    }
    await client.query('COMMIT');
    return { programados };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Una reclamacion que lleva mas que esto sin acabar se da por colgada. */
export const RECLAMACION_COLGADA_MIN = 10;

/**
 * Quita un post de la programacion: vuelve a «aprobado» y pierde la hora. No se
 * puede mientras el publicador lo esta subiendo, salvo que esa subida lleve
 * colgada mas de RECLAMACION_COLGADA_MIN minutos.
 * Devuelve 'ok', 'no_existe', 'no_programado' o 'publicando'.
 */
/**
 * Cambia la hora de un post que ya está programado (2026-11-18), sin pasar por
 * «aprobado»: así no hay un momento en que se quede sin programar. No se toca si
 * se está publicando, y la hora nueva no puede haber pasado.
 */
export async function reprogramarPost(
  id: string,
  programadoPara: string,
  ahora = new Date()
): Promise<'ok' | 'no_existe' | 'no_programado' | 'publicando' | 'hora_pasada' | 'hora_no_valida'> {
  const t = Date.parse(programadoPara);
  if (!Number.isFinite(t)) return 'hora_no_valida';
  if (t < ahora.getTime() - MARGEN_PASADO_MS) return 'hora_pasada';
  const { rowCount } = await pool.query(
    `UPDATE semana_posts SET programado_para = $2, error_publicacion = NULL, updated_at = NOW()
      WHERE id = $1 AND estado = 'programado' AND publicando_desde IS NULL`,
    [id, new Date(t).toISOString()]
  );
  if (rowCount) return 'ok';
  const { rows } = await pool.query(`SELECT estado, publicando_desde FROM semana_posts WHERE id = $1`, [id]);
  if (!rows.length) return 'no_existe';
  return rows[0].estado === 'programado' ? 'publicando' : 'no_programado';
}

export async function desprogramarPost(id: string): Promise<'ok' | 'no_existe' | 'no_programado' | 'publicando'> {
  const { rowCount } = await pool.query(
    `UPDATE semana_posts
        SET estado = 'aprobado', programado_para = NULL, publicando_desde = NULL, updated_at = NOW()
      WHERE id = $1 AND estado = 'programado'
        AND (publicando_desde IS NULL OR publicando_desde < NOW() - ($2 || ' minutes')::interval)`,
    [id, String(RECLAMACION_COLGADA_MIN)]
  );
  if (rowCount) return 'ok';
  const { rows } = await pool.query(`SELECT estado FROM semana_posts WHERE id = $1`, [id]);
  if (!rows.length) return 'no_existe';
  return rows[0].estado === 'programado' ? 'publicando' : 'no_programado';
}

// ── Mover o retirar un post (2026-11-18) ────────────────────────────────────
//
// Al adelantar o aplazar un post se creaba una copia en la otra semana y el
// original seguía en la suya: posts y fotos repetidos entre semanas. Mover lo
// cambia de semana con su feedback y su foto; retirar lo quita cuando ya hay
// otro igual. Ninguno de los dos toca un post programado o publicado.

const ESTADOS_INTOCABLES = ['programado', 'publicado'];
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export type ResultadoMover = 'ok' | 'no_existe' | 'bloqueado' | 'clave_ocupada' | 'datos_no_validos';

export async function moverPost(
  id: string,
  destino: { semana: string; fecha?: string; clave?: string }
): Promise<ResultadoMover> {
  if (!esSemanaValida(destino.semana)) return 'datos_no_validos';
  if (destino.fecha !== undefined && !RE_FECHA.test(destino.fecha)) return 'datos_no_validos';
  if (destino.clave !== undefined && !/^[a-z0-9][a-z0-9-]{1,79}$/.test(destino.clave)) return 'datos_no_validos';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT estado FROM semana_posts WHERE id = $1 FOR UPDATE`, [id]);
    if (!rows.length) {
      await client.query('ROLLBACK');
      return 'no_existe';
    }
    if (ESTADOS_INTOCABLES.includes(rows[0].estado)) {
      await client.query('ROLLBACK');
      return 'bloqueado';
    }
    await client.query(
      `INSERT INTO semanas (semana, estado) VALUES ($1, 'propuesta') ON CONFLICT (semana) DO NOTHING`,
      [destino.semana]
    );
    try {
      await client.query(
        `UPDATE semana_posts
            SET semana = $2, fecha = COALESCE($3::date, fecha), clave = COALESCE($4, clave), updated_at = NOW()
          WHERE id = $1`,
        [id, destino.semana, destino.fecha ?? null, destino.clave ?? null]
      );
    } catch (e: any) {
      await client.query('ROLLBACK');
      if (e?.code === '23505') return 'clave_ocupada';
      throw e;
    }
    await client.query('COMMIT');
    return 'ok';
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Quita un post de su semana. No borra feedback: si lo tiene, hay que moverlo. */
export async function retirarPost(id: string): Promise<'ok' | 'no_existe' | 'bloqueado' | 'con_feedback'> {
  const { rows } = await pool.query(
    `SELECT p.estado, (SELECT COUNT(*) FROM semana_feedback f WHERE f.post_id = p.id)::int AS feedback
       FROM semana_posts p WHERE p.id = $1`,
    [id]
  );
  if (!rows.length) return 'no_existe';
  if (ESTADOS_INTOCABLES.includes(rows[0].estado)) return 'bloqueado';
  if (rows[0].feedback > 0) return 'con_feedback';
  const { rowCount } = await pool.query(
    `DELETE FROM semana_posts WHERE id = $1 AND estado <> ALL($2::text[])
        AND NOT EXISTS (SELECT 1 FROM semana_feedback f WHERE f.post_id = $1)`,
    [id, ESTADOS_INTOCABLES]
  );
  return rowCount ? 'ok' : 'bloqueado';
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
            sp.id AS post_id, sp.semana, sp.clave, sp.cuenta, sp.coautores, sp.titulo, sp.pilar, sp.objetivo,
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
