import pool from '../db';
import { MIN_OUTLIER_ENGAGEMENT } from './engagement';

// Minimum number of posts WITH impressions a managed creator needs before
// we factor reach in. Below this the per-creator average impressions is too
// noisy, so we fall back to the absolute-engagement method.
const MIN_POSTS_WITH_IMPRESSIONS = 3;

// Recompute outlier_ratio + is_outlier for EVERY post of one creator,
// choosing the method by account type — the single source of truth for
// outlier scoring. Replaces the duplicated inline loops/SQL that used to
// live in postMonitor and creators.
//
//   MANAGED accounts (Iker / Unai — connected via Unipile, so impressions
//   are real): HYBRID method. We compute TWO ratios and take the GREATER:
//     · engagement ratio = post eng ÷ creator's avg eng
//     · reach ratio      = post impressions ÷ creator's avg impressions
//   outlier_ratio = max(engagement ratio, reach ratio). A post is an
//   outlier when it stood out on EITHER axis (>=3x) and cleared the
//   absolute engagement floor. This makes impressions count IN FAVOUR of
//   a post (a record-reach post like the 168K cold-calling meme scores
//   high via the reach ratio) instead of against it. We deliberately do
//   NOT divide engagement by impressions — engagement RATE drops as reach
//   grows (viral posts hit a colder audience), so dividing would punish
//   exactly the posts that travelled.
//
//   EVERYONE ELSE (discovered profiles on the Dashboard — no impressions):
//   absolute engagement method, unchanged. ratio = post eng ÷ creator avg
//   eng.
//
// Managed accounts that don't yet have enough posts with impressions fall
// back to the absolute method until the data catches up.

/**
 * Ventana en la que un post todavia se considera "en carrera". Un post que
 * cruza el umbral dentro de ella crecio de verdad (evento 'nuevo'); uno que lo
 * cruza despues casi siempre entro porque BAJO LA MEDIA del creador, no porque
 * le pasara nada ('promovido').
 *
 * Es una heuristica, no una medida: distinguirlo con rigor exigiria guardar la
 * media historica del creador en cada recalculo. 14 dias porque el monitor
 * congela un post a los 7 y le damos el doble de margen para los que despegan
 * tarde (un lead magnet puede seguir sumando comentarios dos semanas).
 */
const VENTANA_POST_RECIENTE_DIAS = 14;

interface FilaTransicion {
  id: string;
  era_outlier: boolean;
  es_outlier: boolean;
  ratio_antes: number | null;
  ratio_despues: number | null;
  published_at: Date | null;
}

/**
 * Registra las entradas y salidas de outlier de este recalculo.
 *
 * Solo escribe cuando is_outlier CAMBIA de valor: el recalculo corre en cada
 * tick del monitor y la inmensa mayoria de filas no se mueven. El indice unico
 * (post_id, evento, dia) absorbe el resto — un post que oscila alrededor del
 * umbral genera un evento al dia, no uno cada 15 minutos.
 */
async function registrarTransiciones(filas: FilaTransicion[]): Promise<number> {
  const transiciones = filas.filter((f) => f.era_outlier !== f.es_outlier);
  if (transiciones.length === 0) return 0;

  const ahora = Date.now();
  let escritos = 0;

  for (const f of transiciones) {
    const edadDias = f.published_at
      ? (ahora - new Date(f.published_at).getTime()) / (24 * 60 * 60 * 1000)
      : Infinity;
    const reciente = edadDias <= VENTANA_POST_RECIENTE_DIAS;

    const evento = !f.es_outlier ? 'degradado' : reciente ? 'nuevo' : 'promovido';
    const motivo = !f.es_outlier
      ? reciente
        ? 'ratio_bajo'
        : 'media_del_creador_movida'
      : reciente
        ? 'post_nuevo'
        : 'media_del_creador_movida';

    const { rowCount } = await pool.query(
      `INSERT INTO outlier_events (post_id, evento, ratio_antes, ratio_despues, motivo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (post_id, evento, ((detectado_en AT TIME ZONE 'UTC')::date)) DO NOTHING`,
      [f.id, evento, f.ratio_antes, f.ratio_despues, motivo]
    );
    escritos += rowCount || 0;
  }

  // became_outlier_at solo la primera vez; peak_outlier_ratio siempre al alza.
  const idsEntrantes = transiciones.filter((f) => f.es_outlier).map((f) => f.id);
  if (idsEntrantes.length > 0) {
    await pool.query(
      `UPDATE posts
          SET became_outlier_at = COALESCE(became_outlier_at, NOW()),
              peak_outlier_ratio = GREATEST(COALESCE(peak_outlier_ratio, 0), outlier_ratio)
        WHERE id = ANY($1::uuid[])`,
      [idsEntrantes]
    );
  }

  return escritos;
}

export async function recalcCreatorOutliers(creatorId: string): Promise<void> {
  const { rows: creatorRows } = await pool.query(
    `SELECT is_managed FROM creators WHERE id = $1 LIMIT 1`,
    [creatorId]
  );
  const isManaged = creatorRows[0]?.is_managed === true;

  let useHybrid = false;
  if (isManaged) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n
         FROM posts
        WHERE creator_id = $1
          AND linkedin_post_id <> 'DEMO_LIVE_POST'
          AND impressions_count IS NOT NULL
          AND impressions_count > 0`,
      [creatorId]
    );
    useHybrid = (rows[0]?.n || 0) >= MIN_POSTS_WITH_IMPRESSIONS;
  }

  if (useHybrid) {
    // HYBRID method. outlier_ratio = GREATEST(engagement ratio, reach
    // ratio). avg_eng over all posts; avg_imp over posts that have
    // impressions. A post with no impressions still gets scored on its
    // engagement ratio (reach side contributes 0). Set-based single
    // UPDATE so it stays cheap even on a full-history recompute.
    //
    // NOTE: the absolute engagement floor (MIN_OUTLIER_ENGAGEMENT = 200)
    // is DELIBERATELY OMITTED here. With real impressions data the floor
    // was creating visible inconsistencies on the Engagement-over-time
    // chart — a post with reach 5x the creator's average but
    // engagement<200 (people saw it but didn't interact strongly)
    // showed outlier_ratio = 5.x while is_outlier stayed FALSE,
    // painting it as a non-outlier (grey pencil) despite the multiplier.
    // The reach itself IS the success signal in that case ("si llegó a
    // tantas impresiones por algo será"). The floor stays in the
    // absolute branch below for Dashboard / discovered profiles where
    // no impressions exist and the floor is the only quality guard.
    const { rows } = await pool.query(
      // La CTE `antes` lee la foto previa a la escritura (una CTE ve el estado
      // del inicio de la sentencia), asi que el RETURNING puede dar el valor
      // viejo y el nuevo en la misma vuelta y no hace falta un SELECT extra.
      `WITH antes AS (
         SELECT id, is_outlier, outlier_ratio
           FROM posts
          WHERE creator_id = $1 AND linkedin_post_id <> 'DEMO_LIVE_POST'
       ),
       stats AS (
         SELECT
           AVG(engagement_score)::float AS avg_eng,
           AVG(impressions_count) FILTER (
             WHERE impressions_count IS NOT NULL AND impressions_count > 0
           )::float AS avg_imp
           FROM posts
          WHERE creator_id = $1 AND linkedin_post_id <> 'DEMO_LIVE_POST'
            -- Los ocultos no cuentan en la media (Iker, 2026-09-17): un post
            -- capado con 12 impresiones inflaba el multiplicador del resto.
            AND deleted_from_linkedin_at IS NULL
       )
       UPDATE posts p SET
         outlier_ratio = GREATEST(
           CASE WHEN s.avg_eng > 0
             THEN COALESCE(round((p.engagement_score / s.avg_eng)::numeric, 2), 0)
             ELSE 0 END,
           CASE WHEN p.impressions_count IS NOT NULL AND p.impressions_count > 0 AND s.avg_imp > 0
             THEN COALESCE(round((p.impressions_count::float / s.avg_imp)::numeric, 2), 0)
             ELSE 0 END
         ),
         is_outlier = (
           GREATEST(
             CASE WHEN s.avg_eng > 0 THEN p.engagement_score::float / s.avg_eng ELSE 0 END,
             CASE WHEN p.impressions_count IS NOT NULL AND p.impressions_count > 0 AND s.avg_imp > 0
               THEN p.impressions_count::float / s.avg_imp ELSE 0 END
           ) >= 3.0
         )
       FROM stats s, antes a
       WHERE p.id = a.id
         AND p.creator_id = $1 AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
       RETURNING p.id,
                 a.is_outlier    AS era_outlier,
                 p.is_outlier    AS es_outlier,
                 a.outlier_ratio AS ratio_antes,
                 p.outlier_ratio AS ratio_despues,
                 p.published_at`,
      [creatorId]
    );
    await registrarTransiciones(rows as FilaTransicion[]);
  } else {
    // Absolute-engagement method (Dashboard / discovered profiles, or a
    // managed account without enough impressions data yet). Unchanged from
    // the original behaviour.
    const { rows } = await pool.query(
      `WITH antes AS (
         SELECT id, is_outlier, outlier_ratio
           FROM posts
          WHERE creator_id = $1 AND linkedin_post_id <> 'DEMO_LIVE_POST'
       )
       UPDATE posts p SET
         outlier_ratio = COALESCE(round((p.engagement_score / NULLIF(m.avg, 0))::numeric, 2), 0),
         is_outlier = (m.avg > 0 AND p.engagement_score >= m.avg * 3 AND p.engagement_score >= $2)
       FROM (
         SELECT AVG(engagement_score)::float AS avg
           FROM posts
          WHERE creator_id = $1 AND linkedin_post_id <> 'DEMO_LIVE_POST'
            AND deleted_from_linkedin_at IS NULL
       ) m, antes a
       WHERE p.id = a.id
         AND p.creator_id = $1 AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
       RETURNING p.id,
                 a.is_outlier    AS era_outlier,
                 p.is_outlier    AS es_outlier,
                 a.outlier_ratio AS ratio_antes,
                 p.outlier_ratio AS ratio_despues,
                 p.published_at`,
      [creatorId, MIN_OUTLIER_ENGAGEMENT]
    );
    await registrarTransiciones(rows as FilaTransicion[]);
  }

  // Aditivo y NO CRITICO: si esto peta, el recalculo de is_outlier de arriba ya
  // esta escrito y el scrapeo que nos llamo no puede caerse por un campo que
  // solo alimenta al Explorer. Se avisa por log y se sigue.
  await recalcTopDelCreador(creatorId).catch((e: any) =>
    console.warn(`[top_del_creador] fallo al recalcular ${creatorId}: ${e?.message}`)
  );
}

/**
 * Exponente del suelo de `top_del_creador`, en desviaciones tipicas.
 *
 * El suelo es `mediana * (p84/mediana)^K`, o sea "K sigmas por encima de su
 * propia mediana" escrito como multiplo. K=1,5 es el valor MEDIDO sobre los
 * 37.168 posts de la BD: es el mas alto que no deja a NINGUN creador sin nada
 * en el Explorer.
 *
 *   fijo 2x mediana        -> 2.902 posts,  0 creadores ciegos
 *   fijo 3x mediana        -> 2.330,        4 ciegos (Grant, Lara, Jasmin, Adam Ali)
 *   por tamano (<150k=3x)  -> 2.560,        2 ciegos
 *   K=1,5                  -> 2.647,        0 ciegos   <-- este
 *   K=2,0                  -> 1.269,        5 ciegos
 */
const K_SIGMAS_TOP = 1.5;

/** Percentil minimo dentro del creador. Acota el resultado al top ~8%. */
const PERCENTIL_TOP = 0.92;

/**
 * Marca `top_del_creador` para todos los posts de un creador.
 *
 * DOS condiciones, y las dos hacen falta:
 *   1. percentil >= 0,92 dentro del creador  -> el TOPE (nunca mas del ~8%)
 *   2. engagement >= mediana * (p84/mediana)^1,5 -> el SUELO (filtra cuentas planas)
 *
 * El suelo NO es un multiplo fijo: cada cuenta se lo saca de su propia forma,
 * porque lo que ciega a una cuenta es su DISPERSION, no su tamano. Medido:
 * corr(log seguidores, p84/mediana) = -0,161, mientras que
 * corr(p84/mediana, max/mediana) = +0,764. Adam Ali tiene 10.499 seguidores y
 * p84/mediana 1,54; Lara Acosta tiene 354.139 y 1,39 — igual de planos y
 * tamanos opuestos. Un corte por seguidores los separa mal y deja a Adam Ali
 * a cero.
 *
 * Multiplo que le acaba tocando a cada uno:
 *   Jasmin Alic 1,4x · Lara Acosta 1,6x · Adam Ali 1,9x · Adam Grant 2,1x
 *   Unai 4,1x · Iker 4,8x · Miguel Florido 7,6x · Daniel Disney 8,4x
 *
 * ⚠️ Es el mismo z robusto que se DESCARTO para is_outlier, y no es
 * contradiccion: alli era la unica condicion y generaba falsos negativos en
 * cuentas de cola pesada. Aqui es un suelo acotado por el percentil, sobre un
 * campo aditivo. Disney conserva sus 50 is_outlier intactos y ademas recibe 28
 * aqui.
 */
export async function recalcTopDelCreador(creatorId: string): Promise<void> {
  await pool.query(
    `WITH base AS (
       SELECT id, engagement_score
         FROM posts
        WHERE creator_id = $1 AND linkedin_post_id <> 'DEMO_LIVE_POST'
     ),
     stats AS (
       SELECT
         percentile_cont(0.50) WITHIN GROUP (ORDER BY engagement_score)::float AS mediana,
         percentile_cont(0.84) WITHIN GROUP (ORDER BY engagement_score)::float AS p84
         FROM base
     ),
     suelo AS (
       -- Si la mediana es 0 (cuenta practicamente muerta) no hay forma de la que
       -- sacar un multiplo, asi que el suelo se apaga y manda solo el percentil.
       SELECT CASE
                WHEN s.mediana > 0 AND s.p84 > s.mediana
                  THEN s.mediana * power(s.p84 / s.mediana, $2::float)
                ELSE 0
              END AS minimo
         FROM stats s
     ),
     pct AS (
       SELECT id, engagement_score,
              percent_rank() OVER (ORDER BY engagement_score) AS percentil
         FROM base
     ),
     -- ¿Le pasa el suelo a ALGUIEN en esta cuenta? Postgres interpola
     -- percentile_cont, asi que en cuentas con pocos posts el p84 sale mas alto
     -- que con un percentil por indice y el suelo se endurece de golpe: medido,
     -- dejaba a Adam Ali (n=20) y a Fran Quintero (n=11) sin NADA en el Explorer.
     --
     -- No se arregla bajando la constante — se arregla garantizando el
     -- INVARIANTE: si el suelo no lo pasa nadie, se apaga para esa cuenta y
     -- manda solo el percentil. Asi ninguna cuenta con >=2 posts se queda ciega,
     -- pase lo que pase con sus datos. (Con 1 post el percent_rank es 0 por
     -- definicion y no hay nada que decidir: un post solo no puede ser "lo mejor
     -- de la cuenta".) Rescata a 6 creadores de los 153.
     hay AS (
       SELECT bool_or(pct.percentil >= $3::float AND pct.engagement_score >= suelo.minimo) AS alguno
         FROM pct, suelo
     )
     UPDATE posts p
        SET top_del_creador = (
              pct.percentil >= $3::float
              AND (pct.engagement_score >= suelo.minimo OR NOT COALESCE(hay.alguno, FALSE))
            )
       FROM pct, suelo, hay
      WHERE p.id = pct.id`,
    [creatorId, K_SIGMAS_TOP, PERCENTIL_TOP]
  );
}
