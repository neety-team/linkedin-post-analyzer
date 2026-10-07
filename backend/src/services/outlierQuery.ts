import pool from '../db';

/**
 * El buscador de outliers.
 *
 * Antes de esto, consultar el corpus era: getTopOutliersGlobal(500) —sin un
 * solo filtro— o el ILIKE privado de getBrainstormContext. Cualquier pregunta
 * del tipo "los lead magnets de los ultimos 3 meses por multiplicador" se
 * respondia bajandose todo y mirandolo a ojo.
 *
 * DOS DECISIONES QUE CONVIENE ENTENDER
 * ------------------------------------
 * 1. `percentil_creador`. outlier_ratio NO es comparable entre creadores:
 *    services/outliers.ts usa dos metodos (hibrido con alcance para las
 *    cuentas gestionadas, absoluto para el resto) y ademas un 6x de una cuenta
 *    de 2.000 seguidores no es la misma leccion que uno de 200.000. El
 *    percentil dentro de SU creador si significa lo mismo para todos, y es el
 *    orden correcto cuando la lista mezcla cuentas.
 * 2. `metodo`. Cada fila dice con que metodo se calculo su ratio ('hibrido' o
 *    'absoluto'). Es barato y evita la comparacion tramposa por defecto.
 */

export interface FiltrosOutliers {
  // quien
  ambito?: 'propias' | 'competencia' | 'todas';
  creator_ids?: string[];
  creador?: string;
  seguidores_min?: number;
  seguidores_max?: number;
  // cuando
  desde?: string;
  hasta?: string;
  ultimos_dias?: number;
  // cuanto
  solo_outliers?: boolean;
  ratio_min?: number;
  ratio_max?: number;
  likes_min?: number;
  likes_max?: number;
  comentarios_min?: number;
  reposts_min?: number;
  impresiones_min?: number;
  engagement_min?: number;
  comment_like_ratio_min?: number;
  share_like_ratio_min?: number;
  guardados_min?: number;
  clics_enlace_min?: number;
  // que
  pilar?: string[];
  tema?: string[];
  hook_type?: string[];
  // Psicologia del gancho (IA, solo cuentas propias; services/ganchoPsicologia.ts)
  gancho?: string[];
  estructura?: string[];
  tono?: string[];
  tipo_contenido?: string[];
  idioma?: string;
  longitud_min?: number;
  longitud_max?: number;
  // texto
  q?: string;
  modo?: 'frase' | 'todas' | 'cualquiera';
  excluir?: string;
  // salida
  orden?: string;
  limit?: number;
  offset?: number;
  /** Paginación por clave. Devuelto por la llamada anterior como `cursor_siguiente`. */
  cursor?: string;
}

export interface FilaOutlier {
  id: string;
  creator_id: string;
  creador: string | null;
  es_gestionada: boolean;
  seguidores: number;
  published_at: Date | null;
  pilar: string | null;
  tema: string | null;
  tipo_contenido: string;
  hook_type: string;
  gancho: string | null;
  estructura: string;
  tono: string;
  hook: string | null;
  likes: number;
  comentarios: number;
  reposts: number;
  impresiones: number | null;
  engagement: number;
  ratio: number;
  es_outlier: boolean;
  percentil_creador: number | null;
  metodo: 'hibrido' | 'absoluto';
  comment_like_ratio: number;
  share_like_ratio: number;
  longitud: number;
  url: string | null;
}

/**
 * Whitelist estricta de ordenaciones: el `orden` viaja desde el cliente y se
 * interpola en el SQL, asi que nunca puede salir de aqui.
 *
 * Cada una define una EXPRESION SIN NULOS (con COALESCE donde la columna los
 * admite) porque es la clave del cursor: con NULOS por medio, la comparacion
 * por filas `(expr, id) < (valor, id)` deja de funcionar y la paginacion se
 * salta registros en silencio. El COALESCE a un valor extremo mantiene ademas
 * el mismo orden que tenia el NULLS LAST anterior.
 */
interface Ordenacion {
  expr: string;
  dir: 'ASC' | 'DESC';
  tipo: 'float' | 'timestamptz';
}

const ORDENES: Record<string, Ordenacion> = {
  ratio: { expr: 'COALESCE(p.outlier_ratio, 0)', dir: 'DESC', tipo: 'float' },
  percentil: { expr: 'COALESCE(pct.percentil, -1)', dir: 'DESC', tipo: 'float' },
  likes: { expr: 'COALESCE(p.likes_count, 0)', dir: 'DESC', tipo: 'float' },
  comentarios: { expr: 'COALESCE(p.comments_count, 0)', dir: 'DESC', tipo: 'float' },
  reposts: { expr: 'COALESCE(p.reposts_count, 0)', dir: 'DESC', tipo: 'float' },
  impresiones: { expr: 'COALESCE(p.impressions_count, -1)', dir: 'DESC', tipo: 'float' },
  engagement: { expr: 'COALESCE(p.engagement_score, 0)', dir: 'DESC', tipo: 'float' },
  fecha: { expr: `COALESCE(p.published_at, '1970-01-01'::timestamptz)`, dir: 'DESC', tipo: 'timestamptz' },
  fecha_asc: { expr: `COALESCE(p.published_at, '2999-01-01'::timestamptz)`, dir: 'ASC', tipo: 'timestamptz' },
  debate: { expr: 'COALESCE(p.comment_like_ratio, 0)', dir: 'DESC', tipo: 'float' },
  utilidad: { expr: 'COALESCE(p.share_like_ratio, 0)', dir: 'DESC', tipo: 'float' },
};

/**
 * El cursor es opaco a proposito: quien lo usa solo tiene que devolverlo tal
 * cual. Dentro va el valor de la clave de orden y el id de la ultima fila —
 * paginacion por CLAVE, no por OFFSET.
 *
 * Importa la diferencia: con offset, un refresco corriendo a la vez (que
 * cambia outlier_ratio de medio corpus) desplaza las filas entre dos paginas y
 * acabas repitiendo unas y saltandote otras sin enterarte. Con clave, cada
 * pagina continua exactamente donde acabo la anterior.
 */
export function codificarCursor(valor: unknown, id: string, orden: string): string {
  return Buffer.from(JSON.stringify({ v: valor, id, o: orden })).toString('base64url');
}

function decodificarCursor(cursor: string, orden: string): { v: unknown; id: string } {
  let d: any;
  try {
    d = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('cursor ilegible. Usa el `cursor_siguiente` que devuelve la búsqueda anterior.');
  }
  if (!d?.id) throw new Error('cursor incompleto.');
  if (d.o && d.o !== orden) {
    // Cambiar de orden a mitad de paginacion daria una lista incoherente:
    // mejor decirlo que devolver algo raro.
    throw new Error(
      `el cursor es de un orden distinto ("${d.o}") al pedido ("${orden}"). ` +
        'Si cambias de orden, empieza la paginación de cero.'
    );
  }
  return { v: d.v, id: d.id };
}

export const ORDENES_VALIDOS = Object.keys(ORDENES);

const LIMITE_MAXIMO = 100;

/** Trocea el `q` en palabras utiles (fuera signos y palabras de una letra). */
function tokenizar(q: string): string[] {
  return q
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}áéíóúñÁÉÍÓÚÑ-]/gu, '').trim())
    .filter((t) => t.length > 1);
}

interface Construccion {
  where: string[];
  params: any[];
}

function construirWhere(f: FiltrosOutliers): Construccion {
  const where: string[] = [`p.linkedin_post_id <> 'DEMO_LIVE_POST'`];
  const params: any[] = [];
  const add = (sql: string, valor: any) => {
    params.push(valor);
    where.push(sql.replace('$?', `$${params.length}`));
  };

  // Por defecto se buscan SOLO outliers: es un buscador de outliers. Pasar
  // solo_outliers=false es lo que permite calcular denominadores ("¿que
  // porcentaje de los memes acaba siendo outlier?").
  if (f.solo_outliers !== false) where.push('p.is_outlier = TRUE');

  if (f.ambito === 'propias') where.push('c.is_managed = TRUE');
  else if (f.ambito === 'competencia') where.push('COALESCE(c.is_managed, FALSE) = FALSE');

  if (f.creator_ids?.length) add('p.creator_id = ANY($?::uuid[])', f.creator_ids);
  if (f.creador) add('c.name ILIKE $?', `%${f.creador}%`);
  if (f.seguidores_min != null) add('c.followers_count >= $?', f.seguidores_min);
  if (f.seguidores_max != null) add('c.followers_count <= $?', f.seguidores_max);

  if (f.ultimos_dias != null) {
    add(`p.published_at >= NOW() - ($? || ' days')::interval`, String(f.ultimos_dias));
  }
  if (f.desde) add('p.published_at >= $?::timestamptz', f.desde);
  if (f.hasta) add('p.published_at <= $?::timestamptz', f.hasta);

  const numericos: [keyof FiltrosOutliers, string][] = [
    ['ratio_min', 'p.outlier_ratio >= $?'],
    ['ratio_max', 'p.outlier_ratio <= $?'],
    ['likes_min', 'p.likes_count >= $?'],
    ['likes_max', 'p.likes_count <= $?'],
    ['comentarios_min', 'p.comments_count >= $?'],
    ['reposts_min', 'p.reposts_count >= $?'],
    ['impresiones_min', 'p.impressions_count >= $?'],
    ['engagement_min', 'p.engagement_score >= $?'],
    ['comment_like_ratio_min', 'p.comment_like_ratio >= $?'],
    ['share_like_ratio_min', 'p.share_like_ratio >= $?'],
    ['guardados_min', 'p.saves_count >= $?'],
    ['clics_enlace_min', 'p.link_clicks_count >= $?'],
    ['longitud_min', 'p.char_count >= $?'],
    ['longitud_max', 'p.char_count <= $?'],
  ];
  for (const [clave, sql] of numericos) {
    const v = f[clave];
    if (v != null) add(sql, v);
  }

  const listas: [keyof FiltrosOutliers, string][] = [
    ['pilar', 'p.pillar = ANY($?::text[])'],
    ['tema', 'p.topic = ANY($?::text[])'],
    ['hook_type', 'p.hook_type = ANY($?::text[])'],
    ['gancho', 'p.gancho_palanca = ANY($?::text[])'],
    ['estructura', 'p.post_structure = ANY($?::text[])'],
    ['tono', 'p.text_tone = ANY($?::text[])'],
    ['tipo_contenido', 'p.content_type = ANY($?::text[])'],
  ];
  for (const [clave, sql] of listas) {
    const v = f[clave] as string[] | undefined;
    if (v?.length) add(sql, v);
  }

  if (f.idioma) add('p.language = $?', f.idioma);

  // Texto. ILIKE '%x%' aprovecha el indice GIN de pg_trgm que crea la
  // migracion v34; si la extension no estaba disponible sigue funcionando,
  // solo que con seq scan.
  if (f.q?.trim()) {
    const modo = f.modo || 'frase';
    if (modo === 'frase') {
      params.push(`%${f.q.trim()}%`);
      where.push(`(p.content_text ILIKE $${params.length} OR p.hook_text ILIKE $${params.length})`);
    } else {
      const tokens = tokenizar(f.q);
      if (tokens.length) {
        const trozos = tokens.map((t) => {
          params.push(`%${t}%`);
          return `(p.content_text ILIKE $${params.length} OR p.hook_text ILIKE $${params.length})`;
        });
        where.push(`(${trozos.join(modo === 'todas' ? ' AND ' : ' OR ')})`);
      }
    }
  }

  if (f.excluir?.trim()) {
    params.push(`%${f.excluir.trim()}%`);
    where.push(`COALESCE(p.content_text, '') NOT ILIKE $${params.length}`);
  }

  return { where, params };
}

/**
 * Las CTE compartidas por buscar/agrupar/facetas.
 *
 * `metodo` es por creador (no por post): una cuenta gestionada con al menos 3
 * posts con impresiones puntua con el metodo hibrido, y el mismo umbral esta
 * en services/outliers.ts (MIN_POSTS_WITH_IMPRESSIONS). Si uno cambia, el otro
 * tiene que cambiar con el.
 */
export const CTE_METODO = `
  metodo AS (
    SELECT c.id AS creator_id,
           (c.is_managed = TRUE
            AND COUNT(p.id) FILTER (WHERE p.impressions_count > 0) >= 3) AS hibrido
      FROM creators c
      LEFT JOIN posts p
        ON p.creator_id = c.id AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
     GROUP BY c.id
  )
`;

const CTES = `
  WITH metodo AS (
    SELECT c.id AS creator_id,
           (c.is_managed = TRUE
            AND COUNT(p.id) FILTER (WHERE p.impressions_count > 0) >= 3) AS hibrido
      FROM creators c
      LEFT JOIN posts p
        ON p.creator_id = c.id AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
     GROUP BY c.id
  ),
  pct AS (
    SELECT id,
           ROUND((percent_rank() OVER (
             PARTITION BY creator_id ORDER BY engagement_score
           ))::numeric, 3)::float AS percentil
      FROM posts
     WHERE linkedin_post_id <> 'DEMO_LIVE_POST'
  )
`;

export async function buscarOutliers(f: FiltrosOutliers): Promise<{
  filas: FilaOutlier[];
  total: number | null;
  orden: string;
  cursor_siguiente: string | null;
}> {
  const { where, params } = construirWhere(f);
  const orden = ORDENES[f.orden || 'ratio'] ? f.orden || 'ratio' : 'ratio';
  const ord = ORDENES[orden];
  const limit = Math.min(Math.max(1, f.limit || 25), LIMITE_MAXIMO);
  const offset = f.cursor ? 0 : Math.max(0, f.offset || 0);

  // Comparacion por FILAS: `(clave, id) < (valor, id)` continua exactamente
  // donde acabo la pagina anterior. El id desempata para que dos posts con el
  // mismo ratio no se pisen ni se pierdan.
  if (f.cursor) {
    const { v, id } = decodificarCursor(f.cursor, orden);
    params.push(v);
    const pv = params.length;
    params.push(id);
    const pi = params.length;
    where.push(
      `(${ord.expr}, p.id) ${ord.dir === 'DESC' ? '<' : '>'} ($${pv}::${ord.tipo}, $${pi}::uuid)`
    );
  }

  const sqlWhere = where.join(' AND ');

  // El COUNT solo en la primera pagina: es la parte cara de la consulta y en
  // las siguientes ya se sabe el total.
  let total: number | null = null;
  if (!f.cursor) {
    const { rows: conteo } = await pool.query(
      `SELECT COUNT(*)::int AS total
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE ${sqlWhere}`,
      params
    );
    total = conteo[0]?.total ?? 0;
  }

  const { rows } = await pool.query(
    `${CTES}
     SELECT ${ord.expr} AS __clave,
            p.id, p.creator_id, c.name AS creador,
            COALESCE(c.is_managed, FALSE) AS es_gestionada,
            COALESCE(c.followers_count, 0) AS seguidores,
            p.published_at, p.pillar AS pilar, p.topic AS tema,
            p.content_type AS tipo_contenido, p.hook_type, p.gancho_palanca AS gancho, p.post_structure AS estructura,
            p.text_tone AS tono, p.hook_text AS hook,
            p.likes_count AS likes, p.comments_count AS comentarios,
            p.reposts_count AS reposts, p.impressions_count AS impresiones,
            p.engagement_score AS engagement, p.outlier_ratio AS ratio,
            p.is_outlier AS es_outlier,
            pct.percentil AS percentil_creador,
            CASE WHEN m.hibrido THEN 'hibrido' ELSE 'absoluto' END AS metodo,
            p.comment_like_ratio, p.share_like_ratio,
            p.char_count AS longitud, p.post_url AS url
       FROM posts p
       JOIN creators c ON c.id = p.creator_id
       LEFT JOIN metodo m ON m.creator_id = p.creator_id
       LEFT JOIN pct ON pct.id = p.id
      WHERE ${sqlWhere}
      ORDER BY ${ord.expr} ${ord.dir}, p.id ${ord.dir}
      LIMIT ${limit + 1} OFFSET ${offset}`,
    params
  );

  // Se pide UNA fila de mas que el limite y se descarta: es lo que permite
  // decir "hay mas" sin contar el total en cada pagina, y evita entregar un
  // cursor que apunte a una pagina vacia cuando la ultima venia justa.
  const hayMas = rows.length > limit;
  const visibles = hayMas ? rows.slice(0, limit) : rows;
  const ultima = visibles[visibles.length - 1];
  const cursorSiguiente =
    hayMas && ultima ? codificarCursor(ultima.__clave, ultima.id, orden) : null;

  const filas = visibles.map(({ __clave, ...resto }: any) => resto) as FilaOutlier[];
  return { filas, total, orden, cursor_siguiente: cursorSiguiente };
}

// --- facetas ---------------------------------------------------------------

const EJES: Record<string, string> = {
  tema: 'p.topic',
  pilar: 'p.pillar',
  hook: 'p.hook_type',
  gancho: 'p.gancho_palanca',
  estructura: 'p.post_structure',
  tono: 'p.text_tone',
  tipo_contenido: 'p.content_type',
  creador: 'c.name',
  idioma: 'p.language',
};

export const EJES_VALIDOS = Object.keys(EJES);

/**
 * Que valores EXISTEN de verdad en un eje, con recuento.
 *
 * Es la tool que se llama ANTES de filtrar por una categoria, y existe por un
 * motivo concreto: `topic` lo asigna un LLM en texto libre, asi que conviven
 * "Sales Tactics", "Sales Tips" y "B2B Sales" para la misma cosa. Filtrar por
 * uno pierde los otros dos en silencio. Aqui se ven los tres, con su n, y el
 * hueco de los que no tienen etiqueta sale como fila propia en vez de
 * desaparecer.
 */
export async function facetasOutliers(
  eje: string,
  f: FiltrosOutliers
): Promise<{ valor: string | null; n: number; ratio_medio: number; ratio_max: number }[]> {
  const columna = EJES[eje];
  if (!columna) throw new Error(`eje no valido: ${eje}. Validos: ${EJES_VALIDOS.join(', ')}`);

  const { where, params } = construirWhere(f);

  const { rows } = await pool.query(
    `SELECT ${columna} AS valor,
            COUNT(*)::int AS n,
            ROUND(AVG(p.outlier_ratio)::numeric, 2)::float AS ratio_medio,
            ROUND(MAX(p.outlier_ratio)::numeric, 2)::float AS ratio_max
       FROM posts p
       JOIN creators c ON c.id = p.creator_id
      WHERE ${where.join(' AND ')}
      GROUP BY ${columna}
      ORDER BY n DESC
      LIMIT 60`,
    params
  );
  return rows;
}

// --- agregacion ------------------------------------------------------------

const DIMENSIONES: Record<string, string> = {
  ...EJES,
  cuenta: 'c.name',
  dia_semana: `TO_CHAR(p.published_at, 'ID-Dy')`,
  hora: `TO_CHAR(p.published_at, 'HH24')`,
  mes: `TO_CHAR(p.published_at, 'YYYY-MM')`,
  semana: `TO_CHAR(p.published_at, 'IYYY-"W"IW')`,
  bucket_longitud: `CASE
      WHEN p.char_count < 400 THEN '1. <400'
      WHEN p.char_count < 900 THEN '2. 400-900'
      WHEN p.char_count < 1600 THEN '3. 900-1600'
      ELSE '4. >1600' END`,
  bucket_seguidores: `CASE
      WHEN c.followers_count < 5000 THEN '1. <5k'
      WHEN c.followers_count < 20000 THEN '2. 5k-20k'
      WHEN c.followers_count < 100000 THEN '3. 20k-100k'
      ELSE '4. >100k' END`,
};

export const DIMENSIONES_VALIDAS = Object.keys(DIMENSIONES);

export interface FilaAgregada {
  valor: string | null;
  n: number;
  outliers: number;
  tasa_outlier: number;
  ratio_medio: number;
  ratio_mediano: number;
  likes_medios: number;
  comentarios_medios: number;
  impresiones_medias: number | null;
}

/**
 * Group-by generico. `n` va SIEMPRE en la salida y no es opcional: la trampa
 * clasica de este corpus es concluir "los memes van 3x mejor" con n=2.
 */
export async function agruparOutliers(
  dimension: string,
  f: FiltrosOutliers
): Promise<FilaAgregada[]> {
  const columna = DIMENSIONES[dimension];
  if (!columna) {
    throw new Error(`dimension no valida: ${dimension}. Validas: ${DIMENSIONES_VALIDAS.join(', ')}`);
  }

  const { where, params } = construirWhere(f);

  const { rows } = await pool.query(
    `SELECT ${columna} AS valor,
            COUNT(*)::int AS n,
            COUNT(*) FILTER (WHERE p.is_outlier)::int AS outliers,
            ROUND((COUNT(*) FILTER (WHERE p.is_outlier)::numeric
                   / NULLIF(COUNT(*), 0) * 100), 1)::float AS tasa_outlier,
            ROUND(AVG(p.outlier_ratio)::numeric, 2)::float AS ratio_medio,
            ROUND((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.outlier_ratio))::numeric, 2)::float
              AS ratio_mediano,
            ROUND(AVG(p.likes_count))::int AS likes_medios,
            ROUND(AVG(p.comments_count))::int AS comentarios_medios,
            ROUND(AVG(p.impressions_count) FILTER (WHERE p.impressions_count IS NOT NULL))::int
              AS impresiones_medias
       FROM posts p
       JOIN creators c ON c.id = p.creator_id
      WHERE ${where.join(' AND ')}
      GROUP BY ${columna}
      ORDER BY n DESC
      LIMIT 40`,
    params
  );
  return rows;
}

// --- salud del corpus ------------------------------------------------------

export async function saludCorpus() {
  const { rows: totales } = await pool.query(
    `SELECT COUNT(*)::int AS posts,
            COUNT(*) FILTER (WHERE is_outlier)::int AS outliers,
            COUNT(*) FILTER (WHERE topic IS NOT NULL AND topic <> '')::int AS con_tema,
            COUNT(*) FILTER (WHERE is_outlier AND (topic IS NULL OR topic = ''))::int
              AS outliers_sin_tema,
            COUNT(*) FILTER (WHERE pillar IS NOT NULL)::int AS con_pilar,
            COUNT(*) FILTER (WHERE pillar = 'otro')::int AS pilar_otro,
            COUNT(*) FILTER (WHERE reaction_mix IS NOT NULL)::int AS con_reacciones,
            COUNT(*) FILTER (WHERE impressions_count IS NOT NULL)::int AS con_impresiones,
            COUNT(*) FILTER (WHERE became_outlier_at IS NOT NULL)::int AS con_fecha_outlier
       FROM posts WHERE linkedin_post_id <> 'DEMO_LIVE_POST'`
  );

  const { rows: temas } = await pool.query(
    `SELECT COUNT(DISTINCT topic)::int AS distintos
       FROM posts WHERE topic IS NOT NULL AND topic <> ''`
  );

  const { rows: frescura } = await pool.query(
    `SELECT COALESCE(c.is_managed, FALSE) AS gestionada,
            COUNT(*)::int AS creadores,
            MAX(c.last_scraped_at) AS mas_reciente,
            MIN(c.last_scraped_at) AS mas_antiguo
       FROM creators c
      GROUP BY COALESCE(c.is_managed, FALSE)`
  );

  const { rows: eventos } = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE detectado_en > NOW() - INTERVAL '7 days')::int AS ultima_semana
       FROM outlier_events`
  );

  // Pares de temas sospechosos de ser el mismo con dos nombres. Heuristica
  // barata (comparten la primera palabra significativa); sirve para ver si la
  // taxonomia ha derivado, no para fusionarlos automaticamente.
  const { rows: duplicados } = await pool.query(
    `WITH t AS (
       SELECT DISTINCT topic FROM posts WHERE topic IS NOT NULL AND topic <> ''
     )
     SELECT a.topic AS a, b.topic AS b
       FROM t a JOIN t b
         ON a.topic < b.topic
        AND LOWER(SPLIT_PART(a.topic, ' ', 1)) = LOWER(SPLIT_PART(b.topic, ' ', 1))
      LIMIT 20`
  );

  return {
    totales: totales[0],
    temas_distintos: temas[0]?.distintos || 0,
    posibles_duplicados: duplicados,
    frescura,
    eventos: eventos[0],
  };
}
