import pool from '../db';
import { classifyPillar } from '../services/pillar';

export interface Post {
  id: string;
  creator_id: string;
  linkedin_post_id: string | null;
  content_text: string | null;
  content_type: string;
  published_at: Date | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  impressions_count: number | null;
  /** LinkedIn Premium: visitas al perfil que vinieron DE ese post. */
  profile_viewers_count: number | null;
  /** LinkedIn Premium: seguidores ganados con ese post. */
  followers_gained_count: number | null;
  /** LinkedIn Premium: veces que alguien guardo el post. */
  saves_count: number | null;
  /** LinkedIn Premium: veces que alguien lo mando por privado. */
  sends_count: number | null;
  /** LinkedIn Premium: clics al enlace externo. El numero del lead magnet. */
  link_clicks_count: number | null;
  /** LinkedIn Premium: clics al boton de accion del perfil. */
  premium_button_clicks: number | null;
  /** A donde apuntaba el enlace (para saber que se medía). */
  link_url: string | null;
  engagement_score: number;
  outlier_ratio: number;
  is_outlier: boolean;
  /**
   * "De los mejores DE ESTA CUENTA". Pregunta distinta de is_outlier: aquel es
   * la ALERTA (destaco de verdad), este es la INSPIRACION (lo mejor que hace
   * esta cuenta). Se calcula en outliers.ts::recalcTopDelCreador.
   */
  top_del_creador: boolean;
  hook_text: string | null;
  word_count: number;
  has_hashtags: boolean;
  hashtags: string[];
  has_emoji: boolean;
  has_call_to_action: boolean;
  language: string | null;
  char_count: number;
  line_break_count: number;
  has_aggressive_spacing: boolean;
  hook_type: string;
  post_structure: string;
  comment_like_ratio: number;
  share_like_ratio: number;
  text_tone: string;
  post_url: string | null;
  raw_data: any;
  created_at: Date;
}

export interface PostFilters {
  outliers_only?: boolean;
  content_type?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export const PostModel = {
  async findByCreator(creatorId: string, filters: PostFilters = {}): Promise<Post[]> {
    const conditions = ['creator_id = $1', `linkedin_post_id <> 'DEMO_LIVE_POST'`];
    const values: any[] = [creatorId];
    let idx = 2;

    if (filters.outliers_only) {
      conditions.push('is_outlier = TRUE');
    }
    if (filters.content_type) {
      conditions.push(`content_type = $${idx}`);
      values.push(filters.content_type);
      idx++;
    }

    let orderBy = 'published_at DESC';
    if (filters.sort === 'engagement_desc') orderBy = 'engagement_score DESC';
    else if (filters.sort === 'engagement_asc') orderBy = 'engagement_score ASC';
    else if (filters.sort === 'date_asc') orderBy = 'published_at ASC';
    else if (filters.sort === 'outlier_ratio_desc') orderBy = 'outlier_ratio DESC';

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const { rows } = await pool.query(
      `SELECT id, creator_id, linkedin_post_id, content_text, content_type,
              published_at, likes_count, comments_count, reposts_count,
              impressions_count, profile_viewers_count, followers_gained_count,
              saves_count, sends_count, link_clicks_count, premium_button_clicks, link_url, pillar,
              engagement_score, outlier_ratio, is_outlier, top_del_creador,
              hook_text, word_count, char_count, line_break_count,
              has_aggressive_spacing, hook_type, post_structure,
              comment_like_ratio, share_like_ratio, text_tone,
              has_hashtags, hashtags, has_emoji,
              has_call_to_action, language, post_url, created_at
       FROM posts WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );
    return rows;
  },

  async countByCreator(creatorId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count FROM posts WHERE creator_id = $1 AND linkedin_post_id <> 'DEMO_LIVE_POST'`,
      [creatorId]
    );
    return parseInt(rows[0].count, 10);
  },

  async bulkUpsert(posts: Partial<Post>[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const post of posts) {
        await client.query(
          `INSERT INTO posts (
            creator_id, linkedin_post_id, content_text, content_type,
            published_at, likes_count, comments_count, reposts_count,
            impressions_count, engagement_score, outlier_ratio, is_outlier,
            hook_text, word_count, char_count, line_break_count,
            has_aggressive_spacing, hook_type, post_structure,
            comment_like_ratio, share_like_ratio, text_tone,
            has_hashtags, hashtags, has_emoji,
            has_call_to_action, language, post_url, raw_data,
            profile_viewers_count, followers_gained_count, pillar
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
          ON CONFLICT (linkedin_post_id) DO UPDATE SET
            -- ESCUDO ANTI-CERO (2026-09-17): Unipile devuelve contadores a 0 a
            -- ratos, y con otra cuenta que no es la duena las impresiones llegan
            -- siempre a 0/NULL. Un 0 no pisa un valor real.
            likes_count = CASE WHEN EXCLUDED.likes_count > 0 THEN EXCLUDED.likes_count ELSE posts.likes_count END,
            comments_count = CASE WHEN EXCLUDED.comments_count > 0 THEN EXCLUDED.comments_count ELSE posts.comments_count END,
            reposts_count = CASE WHEN EXCLUDED.reposts_count > 0 THEN EXCLUDED.reposts_count ELSE posts.reposts_count END,
            impressions_count = COALESCE(NULLIF(EXCLUDED.impressions_count, 0), posts.impressions_count),
            engagement_score = CASE WHEN EXCLUDED.engagement_score > 0 THEN EXCLUDED.engagement_score ELSE posts.engagement_score END,
            -- outlier_ratio / is_outlier NO se tocan aqui: llegaban a 0/false en
            -- cada re-escaneo y los recalcula recalcCreatorOutliers.
            char_count = EXCLUDED.char_count,
            line_break_count = EXCLUDED.line_break_count,
            has_aggressive_spacing = EXCLUDED.has_aggressive_spacing,
            hook_type = EXCLUDED.hook_type,
            post_structure = EXCLUDED.post_structure,
            comment_like_ratio = EXCLUDED.comment_like_ratio,
            share_like_ratio = EXCLUDED.share_like_ratio,
            text_tone = EXCLUDED.text_tone,
            raw_data = EXCLUDED.raw_data,
            -- COALESCE: si un re-escaneo viene sin analytics, NO borres lo que ya
            -- tenias. Unipile no siempre lo devuelve.
            profile_viewers_count = COALESCE(EXCLUDED.profile_viewers_count, posts.profile_viewers_count),
            followers_gained_count = COALESCE(EXCLUDED.followers_gained_count, posts.followers_gained_count),
            -- El pilar que ya estaba MANDA: aqui se calcula sin reaction_mix
            -- (las reacciones llegan despues), asi que un re-escaneo degradaria
            -- un meme ya identificado a 'otro'. El pase autoritativo es
            -- POST /api/posts/classify-pillars, que si ve las reacciones.
            pillar = COALESCE(posts.pillar, EXCLUDED.pillar)`,
          [
            post.creator_id, post.linkedin_post_id, post.content_text, post.content_type,
            post.published_at, post.likes_count || 0, post.comments_count || 0, post.reposts_count || 0,
            post.impressions_count, post.engagement_score || 0, post.outlier_ratio || 0, post.is_outlier || false,
            post.hook_text, post.word_count || 0, post.char_count || 0, post.line_break_count || 0,
            post.has_aggressive_spacing || false, post.hook_type || 'other', post.post_structure || 'other',
            post.comment_like_ratio || 0, post.share_like_ratio || 0, post.text_tone || 'neutral',
            post.has_hashtags || false, post.hashtags || [],
            post.has_emoji || false, post.has_call_to_action || false, post.language, post.post_url,
            post.raw_data ? JSON.stringify(post.raw_data) : null,
            post.profile_viewers_count ?? null, post.followers_gained_count ?? null,
            classifyPillar({ content_text: post.content_text ?? null, content_type: post.content_type ?? null }),
          ]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async deleteByCreator(creatorId: string): Promise<void> {
    await pool.query('DELETE FROM posts WHERE creator_id = $1', [creatorId]);
  },

  async getStats(creatorId: string) {
    const { rows } = await pool.query(
      `SELECT
        COUNT(*) as total_posts,
        COUNT(*) FILTER (WHERE is_outlier = TRUE) as total_outliers,
        COUNT(*) FILTER (WHERE top_del_creador = TRUE) as total_top_del_creador,
        AVG(engagement_score) as avg_engagement,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY engagement_score) as median_engagement,
        STDDEV(engagement_score) as stddev_engagement,
        -- SEÑALES DE CUENTA (no de post): sirven para detectar un PERFIL raro,
        -- no un post raro. Adam Grant sale CV 0,55 y 52,0% de formato raro
        -- contra una mediana de mercado de CV ~2,4 y 0,65%. Eso es lo que le
        -- delata como perfil anomalo sin mirar post a post.
        --
        -- consistencia = coeficiente de variacion. Bajo = cuenta plana, y una
        -- cuenta plana NUNCA puede disparar el 3x de is_outlier (por eso existe
        -- top_del_creador). Las 4 cuentas ciegas de la BD estan en 0,31-0,55;
        -- el resto, entre 2 y 7.
        CASE WHEN AVG(engagement_score) > 0
          THEN STDDEV_POP(engagement_score) / AVG(engagement_score)
          ELSE NULL END as consistencia,
        -- pct_formato_raro = % de posts que son imagen sin texto. La mediana
        -- del mercado es 0,65% (241 de 37.168 posts de la BD).
        (COUNT(*) FILTER (
           WHERE content_type = 'image' OR COALESCE(char_count, 0) = 0
         )::float / NULLIF(COUNT(*), 0)) as pct_formato_raro,
        MIN(published_at) as first_post_date,
        MAX(published_at) as last_post_date
      FROM posts WHERE creator_id = $1 AND linkedin_post_id <> 'DEMO_LIVE_POST'`,
      [creatorId]
    );
    return rows[0];
  },

  async getContentTypeDistribution(creatorId: string, outliersOnly = false) {
    const condition = outliersOnly ? 'AND is_outlier = TRUE' : '';
    const { rows } = await pool.query(
      `SELECT content_type, COUNT(*) as count
       FROM posts WHERE creator_id = $1 AND linkedin_post_id <> 'DEMO_LIVE_POST' ${condition}
       GROUP BY content_type ORDER BY count DESC`,
      [creatorId]
    );
    return rows;
  },

  async getTimeline(creatorId: string) {
    const { rows } = await pool.query(
      `SELECT published_at, engagement_score, is_outlier, content_type, hook_text,
              hook_type, outlier_ratio, post_url, content_text
       FROM posts WHERE creator_id = $1 AND published_at IS NOT NULL AND linkedin_post_id <> 'DEMO_LIVE_POST'
       ORDER BY published_at ASC`,
      [creatorId]
    );
    return rows;
  },

  // Per-calendar-day engagement delta derived from post_snapshots. For each post
  // we take the latest snapshot per day, diff consecutive days, and sum across
  // posts. This captures engagement *received* on days when no post was published
  // (as long as the posts are within the 7-day snapshot window).
  async getDailyEngagement(creatorId: string) {
    const { rows } = await pool.query(
      `WITH post_scope AS (
         SELECT id FROM posts
         WHERE creator_id = $1 AND published_at IS NOT NULL AND linkedin_post_id <> 'DEMO_LIVE_POST'
       ),
       snap AS (
         SELECT s.post_id,
                s.captured_at,
                (s.captured_at AT TIME ZONE 'UTC')::date AS day,
                COALESCE(s.likes_count, 0)
                  + 2 * COALESCE(s.comments_count, 0)
                  + 3 * COALESCE(s.reposts_count, 0) AS engagement
         FROM post_snapshots s
         JOIN post_scope p ON p.id = s.post_id
       ),
       last_per_day AS (
         SELECT DISTINCT ON (post_id, day)
                post_id, day, engagement
         FROM snap
         ORDER BY post_id, day, captured_at DESC
       ),
       daily_delta AS (
         SELECT post_id, day,
                engagement - COALESCE(LAG(engagement) OVER (PARTITION BY post_id ORDER BY day), 0) AS delta
         FROM last_per_day
       )
       SELECT TO_CHAR(day, 'YYYY-MM-DD') AS day,
              SUM(GREATEST(delta, 0))::INTEGER AS engagement
       FROM daily_delta
       GROUP BY day
       ORDER BY day ASC`,
      [creatorId]
    );
    return rows as { day: string; engagement: number }[];
  },

  /**
   * Los mejores posts de TODA la BD, mezclando creadores.
   *
   * Dos cosas que no son obvias y conviene no deshacer:
   *
   * 1. El filtro es `is_outlier OR top_del_creador`. Solo con is_outlier, las
   *    cuentas ultraconsistentes NO APARECEN NUNCA: Adam Grant (5,6M
   *    seguidores) tiene max/media = 2,75x contra un umbral de 3,00x, o sea
   *    cero outliers por construccion. Y con ellas desaparecia su formato: de
   *    los 2.278 outliers de la competencia solo 6 eran imagen-sola (0,26%),
   *    cuando ese formato es el 52% de lo que publica Grant.
   *
   * 2. Se ordena por PERCENTIL DENTRO DEL CREADOR, no por outlier_ratio.
   *    outlier_ratio no es comparable entre creadores (se calcula con dos
   *    metodos distintos y su escala depende de la dispersion de la cuenta),
   *    asi que ordenar una lista MEZCLADA por el hunde a las cuentas planas al
   *    fondo: el mejor post del año de Grant tiene ratio 2,75 y saldria por
   *    detras de cualquier post mediocre de una cuenta a rachas. El percentil
   *    si significa lo mismo para todos.
   */
  async getTopOutliersGlobal(limit = 500) {
    const { rows } = await pool.query(
      `WITH pct AS (
         SELECT id,
                percent_rank() OVER (PARTITION BY creator_id ORDER BY engagement_score) AS percentil
           FROM posts
          WHERE linkedin_post_id <> 'DEMO_LIVE_POST'
       )
       SELECT p.id, p.creator_id, p.linkedin_post_id, p.content_text, p.content_type,
              p.published_at, p.likes_count, p.comments_count, p.reposts_count,
              p.engagement_score, p.outlier_ratio, p.is_outlier, p.top_del_creador,
              ROUND(pct.percentil::numeric, 3)::float AS percentil_creador,
              p.hook_text, p.hook_type, p.post_structure, p.text_tone,
              p.word_count, p.has_emoji, p.has_hashtags, p.has_call_to_action,
              p.comment_like_ratio, p.share_like_ratio, p.post_url,
              c.name as creator_name, c.profile_image_url as creator_image
       FROM posts p
       JOIN creators c ON p.creator_id = c.id
       JOIN pct ON pct.id = p.id
       WHERE (p.is_outlier = TRUE OR p.top_del_creador = TRUE)
         AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
       ORDER BY pct.percentil DESC, p.outlier_ratio DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  },
};
