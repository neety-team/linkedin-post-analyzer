import { Router, Request, Response } from 'express';
import pool from '../db';
import { unipileService, LINKEDIN_REACTION_TYPES, LinkedinReactionType, normalizeReactionValue } from '../services/unipile';
import { enrichPost } from '../services/engagement';
import { recalcCreatorOutliers } from '../services/outliers';
import { PostModel } from '../models/post';
import { CreatorModel } from '../models/creator';
import { maybeTick, capturePostSnapshot } from '../services/postMonitor';
import { anunciarPostsDeHoy, componerMensaje } from '../services/anuncioChat';
import { buscarMensajeEnviado, veredictoDeBusqueda } from '../services/verificarEnvio';
import { generateComments, generateSupportiveComments } from '../services/commentGenerator';
import { CommenterProfileModel } from '../models/commenterProfile';
import { sendToGoogleChat } from '../services/googleChat';
import { captureAccountSnapshots } from '../services/accountSnapshots';
import { extractViewerTimestamps } from '../utils/wvmp';
import { generateReply } from '../services/replyGenerator';
import { getMemeImageSummary } from '../services/postImageText';
import { roastProfile } from '../services/roaster';
import { generarRastro } from '../services/rastroGenerator';
import { runFollowerSync, getFollowerSyncProgress } from '../services/followerSync';
import { fetchPremiumAnalytics, savePremiumAnalytics } from '../services/premiumAnalytics';
import {
  extraerPost,
  guardarPostManual,
  actualizarMetricasPrivadas,
  CAMPOS_PRIVADOS,
  MetricasPrivadas,
} from '../services/manualPost';

const router = Router();

// Parse the date range from a request that supports both styles:
//   - new style: ?start_date=2026-04-01&end_date=2026-05-25 (inclusive on both ends)
//   - legacy:    ?days=30                                  (last N days, ending today)
// Returns { startDate, endDate } as YYYY-MM-DD strings + a derived
// `days` for endpoints that still want a single-number version (delta
// comparison vs previous period in /analytics). Both bounds are clamped
// to a sane max of 730 days to keep queries cheap.
function parseDateRange(req: Request): { startDate: string; endDate: string; days: number } {
  const startDateRaw = typeof req.query.start_date === 'string' ? req.query.start_date.trim() : '';
  const endDateRaw = typeof req.query.end_date === 'string' ? req.query.end_date.trim() : '';
  const ISO = /^\d{4}-\d{2}-\d{2}$/;

  if (ISO.test(startDateRaw) && ISO.test(endDateRaw)) {
    const start = new Date(`${startDateRaw}T00:00:00.000Z`);
    const end = new Date(`${endDateRaw}T00:00:00.000Z`);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const clamped = Math.min(diffDays, 730);
    return { startDate: startDateRaw, endDate: endDateRaw, days: clamped };
  }

  const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 730);
  const today = new Date();
  const start = new Date(today.getTime() - (days - 1) * 86400000);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  return { startDate: fmt(start), endDate: fmt(today), days };
}

// Fetch only NEW posts for a managed creator and seed an initial snapshot
// from the data we already pulled, INSIDE this function — no second
// getPosts round-trip, no capturePostSnapshot follow-up call.
//
// The Refresh button in the Accounts UI uses this. Its only job is to
// surface a post the user just published. Continuous tracking of
// existing posts is handled by the postMonitor tick (every 15 min, with
// per-age cadence inside the 7-day window), so this function deliberately
// skips:
//   - forceLiveCapture / re-snapshotting historical posts
//   - capturePostSnapshot (would re-fetch getPosts and rebuild outlier_ratio
//     for every post in the creator — pure waste on a refresh click)
//   - recalculateOutliers (also handled by the tick; one new post barely
//     moves the average and the tick will pick it up within minutes)
//
// Total Unipile calls per click: 1 getProfile + 1 getProfileViewers (the
// account snapshot — followers + WVMP) + 1 getPosts (incremental, stops
// at the first known id). With one new post, that's still ~3 HTTP calls
// instead of the 5 the old path made.
// EXPORTADA (2026-08-27) para que el anunciador automatico de Google Chat
// (services/anuncioChat.ts) haga exactamente lo mismo que el boton "Get new
// posts", en vez de reimplementar el scrape y quedarse desincronizado a la
// primera que alguien toque uno de los dos.
export async function scrapeCreatorPosts(creatorId: string): Promise<{ scraped: number; snapshots_seeded: number }> {
  const t0 = Date.now();
  const creator = await CreatorModel.findById(creatorId);
  if (!creator) return { scraped: 0, snapshots_seeded: 0 };
  const accountIdOverride = (creator as any).unipile_account_id as string | null;
  if (!accountIdOverride) return { scraped: 0, snapshots_seeded: 0 };

  // skipViewers: the WVMP profile-views fetch pages LinkedIn up to 20x and
  // is the single biggest cost of a refresh (20-40s/account). The button is
  // for surfacing a new post, so we only need a fast follower snapshot here;
  // WVMP stays owned by the 6h tick + the profile-views refresh button.
  const snapStart = Date.now();
  const snap = await captureAccountSnapshots(creatorId, { skipViewers: true });
  console.log(`[scrapeCreatorPosts] ${creator.name}: account snapshot (followers, no WVMP) ${Date.now() - snapStart}ms`);
  const providerId = snap.providerId;

  if (!providerId) return { scraped: 0, snapshots_seeded: 0 };

  const { rows: knownRows } = await pool.query(
    `SELECT linkedin_post_id FROM posts
      WHERE creator_id = $1 AND linkedin_post_id IS NOT NULL`,
    [creatorId]
  );
  const knownIds = new Set<string>(knownRows.map((r: any) => String(r.linkedin_post_id)));

  const postsStart = Date.now();
  const rawPosts = await unipileService.getPosts(providerId, undefined, accountIdOverride, knownIds);
  console.log(`[scrapeCreatorPosts] ${creator.name}: getPosts (incremental) ${Date.now() - postsStart}ms, ${rawPosts.length} raw`);
  const originalPosts = rawPosts.filter((raw: any) => {
    if (raw.type === 'repost' || raw.type === 'RESHARE' || raw.type === 'reshare') return false;
    if (raw.is_repost || raw.is_reshare) return false;
    if (raw.reshared_post || raw.original_post) return false;
    return true;
  });
  if (originalPosts.length === 0) {
    await CreatorModel.update(creator.id, { last_scraped_at: new Date() } as any);
    return { scraped: 0, snapshots_seeded: 0 };
  }

  const posts = originalPosts.map((raw) => {
    const normalized = unipileService.normalizePost(raw, creator.id);
    const enriched = enrichPost(normalized);
    return { ...normalized, ...enriched };
  });

  await PostModel.bulkUpsert(posts);
  await CreatorModel.update(creator.id, { last_scraped_at: new Date() } as any);

  // Seed the first snapshot for each newly-discovered post from the data
  // we just downloaded — INSERT only, no extra Unipile calls. Lookup the
  // DB id by linkedin_post_id in one query, then build values inline.
  const newLinkedinIds = posts.map((p: any) => p.linkedin_post_id).filter(Boolean);
  let seededCount = 0;
  if (newLinkedinIds.length > 0) {
    const { rows: idRows } = await pool.query(
      `SELECT id, linkedin_post_id
         FROM posts
        WHERE creator_id = $1 AND linkedin_post_id = ANY($2::text[])`,
      [creatorId, newLinkedinIds]
    );
    const idByLinkedinId = new Map<string, string>();
    for (const r of idRows) idByLinkedinId.set(String(r.linkedin_post_id), String(r.id));

    for (const p of posts as any[]) {
      const internalId = idByLinkedinId.get(String(p.linkedin_post_id));
      if (!internalId) continue;
      try {
        await pool.query(
          `INSERT INTO post_snapshots (post_id, impressions_count, likes_count, comments_count, reposts_count)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            internalId,
            p.impressions_count ?? null,
            p.likes_count ?? 0,
            p.comments_count ?? 0,
            p.reposts_count ?? 0,
          ]
        );
        seededCount++;
      } catch (err: any) {
        console.error(`[scrapeCreatorPosts] seed snapshot failed for ${internalId}:`, err?.message);
      }
    }
  }

  console.log(`[scrapeCreatorPosts] ${creator.name}: TOTAL ${Date.now() - t0}ms (${posts.length} new posts, ${seededCount} snapshots seeded)`);
  return { scraped: posts.length, snapshots_seeded: seededCount };
}

// GET /api/accounts — list all creators flagged as managed accounts, with summary stats
router.get('/', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        c.id, c.name, c.headline, c.profile_image_url, c.followers_count,
        c.location, c.last_scraped_at, c.is_managed, c.unipile_account_id, c.linkedin_id,
        c.is_manual,
        c.created_at,
        COUNT(p.id)::int AS total_posts,
        COUNT(p.id) FILTER (WHERE p.is_outlier = TRUE)::int AS total_outliers,
        COALESCE(ROUND(AVG(p.engagement_score))::int, 0) AS avg_engagement,
        COALESCE(MAX(p.engagement_score)::int, 0) AS max_engagement,
        MAX(p.published_at) AS last_post_at
       FROM creators c
       LEFT JOIN posts p ON p.creator_id = c.id AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
       WHERE c.is_managed = TRUE
       GROUP BY c.id
       ORDER BY avg_engagement DESC`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/candidates — all creators with is_managed flag, for the manager panel
router.get('/candidates', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, headline, profile_image_url, followers_count, is_managed
       FROM creators
       ORDER BY is_managed DESC, name ASC`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/accounts/:id — toggle is_managed and/or set unipile_account_id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { is_managed, unipile_account_id } = req.body;
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (typeof is_managed === 'boolean') {
      sets.push(`is_managed = $${idx++}`);
      values.push(is_managed);
    }
    if (unipile_account_id !== undefined) {
      const trimmed = typeof unipile_account_id === 'string' ? unipile_account_id.trim() : null;
      sets.push(`unipile_account_id = $${idx++}`);
      values.push(trimmed || null);
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: 'Provide is_managed or unipile_account_id' });
    }

    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE creators SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, is_managed, unipile_account_id`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Creator not found' });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/follower-history?creator_id=xxx&days=90
//
// Returns one point per captured day with BOTH the cumulative total
// (`followers`) and the net new followers that day (`gained`). The chart
// plots `gained` — "followers won per day" is far more actionable than a
// slowly-rising cumulative line.
//
// `gained` is computed per creator with a window LAG over that creator's
// own snapshot history (so a gap of N days lumps the growth on the next
// captured day rather than corrupting other creators), THEN summed across
// creators for the combined view. Deltas are derived over ALL history and
// only filtered to the window afterwards, so the first in-window day still
// gets a correct delta against the snapshot just before the window.
router.get('/follower-history', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || null;
    const range = parseDateRange(req);

    const params: any[] = [];
    let creatorFilter = 'c.is_managed = TRUE';
    if (creatorId) {
      params.push(creatorId);
      creatorFilter = `s.creator_id = $${params.length}`;
    }

    // deltas: per-creator gained = followers_count - prior snapshot's count.
    // windowed: keep only the requested range. combined: sum per day.
    params.push(range.startDate, range.endDate);
    const startIdx = params.length - 1;
    const endIdx = params.length;
    const { rows } = await pool.query(
      `WITH deltas AS (
         SELECT
           s.creator_id,
           s.captured_on,
           s.followers_count,
           s.followers_count - LAG(s.followers_count) OVER (
             PARTITION BY s.creator_id ORDER BY s.captured_on ASC
           ) AS gained
         FROM creator_follower_snapshots s
         JOIN creators c ON c.id = s.creator_id
        WHERE ${creatorFilter}
       )
       SELECT
         captured_on::text AS day,
         SUM(followers_count)::int AS followers,
         COALESCE(SUM(gained), 0)::int AS gained
       FROM deltas
       WHERE captured_on >= $${startIdx}::date AND captured_on <= $${endIdx}::date
       GROUP BY captured_on
       ORDER BY captured_on ASC`,
      params
    );
    res.json({ points: rows });
  } catch (err: any) {
    console.error('[accounts/follower-history]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/follower-monthly?creator_id=xxx&months=12
//
// Net new followers per calendar month. For each creator we take the LAST
// snapshot in each month (its end-of-month total) and diff against the
// previous month's end-of-month total — that's the followers genuinely
// won that month. Combined view sums each creator's monthly gain so a
// gap in one account never distorts the other.
//
// Data is preserved indefinitely in creator_follower_snapshots (we never
// delete rows), so this stays reconstructable even if LinkedIn changes
// what it surfaces.
router.get('/follower-monthly', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || null;
    const range = parseDateRange(req);

    const params: any[] = [];
    let creatorFilter = 'c.is_managed = TRUE';
    if (creatorId) {
      params.push(creatorId);
      creatorFilter = `s.creator_id = $${params.length}`;
    }

    // For each (creator, month) take BOTH the first and last snapshot of
    // the month. A month's gain = its end total − the previous month's end
    // total. For the very FIRST tracked month there is no previous month,
    // so we fall back to that month's own first snapshot — i.e. "followers
    // gained during the portion of the month we actually tracked". This
    // makes April show up (its tracked half) instead of being dropped for
    // lacking a prior month to diff against.
    params.push(range.startDate, range.endDate);
    const startIdx = params.length - 1;
    const endIdx = params.length;
    const { rows } = await pool.query(
      `WITH month_bounds AS (
         SELECT
           s.creator_id,
           date_trunc('month', s.captured_on) AS month,
           (ARRAY_AGG(s.followers_count ORDER BY s.captured_on ASC))[1]  AS first_count,
           (ARRAY_AGG(s.followers_count ORDER BY s.captured_on DESC))[1] AS last_count
         FROM creator_follower_snapshots s
         JOIN creators c ON c.id = s.creator_id
        WHERE ${creatorFilter}
        GROUP BY s.creator_id, date_trunc('month', s.captured_on)
       ),
       month_delta AS (
         SELECT
           creator_id,
           month,
           last_count - COALESCE(
             LAG(last_count) OVER (PARTITION BY creator_id ORDER BY month ASC),
             first_count
           ) AS gained
         FROM month_bounds
       )
       SELECT
         to_char(month, 'YYYY-MM') AS month,
         COALESCE(SUM(gained), 0)::int AS gained
       FROM month_delta
       WHERE month >= date_trunc('month', $${startIdx}::date)
         AND month <= date_trunc('month', $${endIdx}::date)
       GROUP BY month
       ORDER BY month ASC`,
      params
    );
    res.json({ points: rows });
  } catch (err: any) {
    console.error('[accounts/follower-monthly]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/impressions-monthly?creator_id=xxx&months=12
//
// Total impressions of posts PUBLISHED in each calendar month. LinkedIn
// doesn't expose a standalone monthly-impressions metric, and post
// snapshots only cover the first 7 days of a post's life, so the only
// faithful aggregate we can build is "lifetime impressions of content
// published that month" — i.e. all of a post's impressions are credited
// to its publish month. Impressions only flow for the authenticated
// (managed) accounts' own posts, which is exactly this scope.
router.get('/impressions-monthly', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || null;
    const range = parseDateRange(req);

    // El interruptor de cuentas manuales tiene que llegar TAMBIEN aqui. Sin
    // esto, apagarlo bajaba los totales de arriba pero dejaba intacta la barra
    // de "Impressions per month": dos numeros que se contradicen en la misma
    // pantalla, que es justo lo que el interruptor existia para evitar.
    const incluirManual = req.query.include_manual !== 'false';
    const filtroManual = incluirManual ? '' : ' AND is_manual IS NOT TRUE';

    const params: any[] = [];
    let scopeSql = `p.creator_id IN (SELECT id FROM creators WHERE is_managed = TRUE${filtroManual})`;
    if (creatorId) {
      params.push(creatorId);
      scopeSql = `p.creator_id = $${params.length}`;
    }

    params.push(range.startDate, range.endDate);
    const startIdx = params.length - 1;
    const endIdx = params.length;
    const { rows } = await pool.query(
      `SELECT
         to_char(date_trunc('month', p.published_at), 'YYYY-MM') AS month,
         COALESCE(SUM(p.impressions_count), 0)::bigint AS impressions,
         COUNT(*)::int AS posts
       FROM posts p
       WHERE ${scopeSql}
         AND p.published_at IS NOT NULL
         AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
         AND p.published_at >= date_trunc('month', $${startIdx}::date)
         AND p.published_at < date_trunc('month', $${endIdx}::date) + interval '1 month'
       GROUP BY date_trunc('month', p.published_at)
       ORDER BY date_trunc('month', p.published_at) ASC`,
      params
    );
    res.json({ points: rows.map((r) => ({ ...r, impressions: Number(r.impressions) })) });
  } catch (err: any) {
    console.error('[accounts/impressions-monthly]', err);
    res.status(500).json({ error: err.message });
  }
});

// /api/accounts/wvmp-capture-now — runs captureAccountSnapshots() for every
// managed account RIGHT NOW and returns whether each insert succeeded. Use
// this to backfill today's snapshot without waiting for the daily scrape,
// AND to surface insert errors that the previous silent-warn version was
// swallowing. Hit it once per deploy fix to verify the row landed.
//
// Accepts both GET and POST so it can be triggered from the browser address
// bar (debug-only endpoint, no user-facing side effect beyond an idempotent
// upsert into the snapshot table).
const wvmpCaptureNow = async (_req: Request, res: Response) => {
  try {
    const { rows: managed } = await pool.query(
      `SELECT id, name FROM creators WHERE is_managed = TRUE AND unipile_account_id IS NOT NULL ORDER BY name ASC`
    );
    const results = [];
    for (const row of managed) {
      try {
        const r = await captureAccountSnapshots(row.id);
        // Verify the row actually landed by re-reading it.
        const stored = await pool.query(
          `SELECT views_count, captured_at
             FROM creator_profile_view_snapshots
            WHERE creator_id = $1 AND captured_on = CURRENT_DATE`,
          [row.id]
        );
        results.push({
          creator_id: row.id,
          creator_name: row.name,
          live_views: r.views,
          pages_walked: r.pages,
          views_error: r.viewsError,
          stored_today: stored.rows[0] || null,
        });
      } catch (err: any) {
        results.push({
          creator_id: row.id,
          creator_name: row.name,
          fatal_error: err.message,
        });
      }
    }
    res.json({ count: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
router.get('/wvmp-capture-now', wvmpCaptureNow);
router.post('/wvmp-capture-now', wvmpCaptureNow);

// GET /api/accounts/wvmp-debug-all — runs the live WVMP fetch for EVERY
// managed account and returns one debug record per account. Saves the user
// from looking up UUIDs by hand. Same shape as /:id/wvmp-debug per entry.
router.get('/wvmp-debug-all', async (_req: Request, res: Response) => {
  try {
    const { rows: managed } = await pool.query(
      `SELECT id, name, unipile_account_id
         FROM creators
        WHERE is_managed = TRUE
          AND unipile_account_id IS NOT NULL
        ORDER BY name ASC`
    );

    const buildShape = (raw: any) => ({
      top_keys: raw && typeof raw === 'object' ? Object.keys(raw).slice(0, 10) : [],
      data_keys: raw?.data && typeof raw.data === 'object' ? Object.keys(raw.data).slice(0, 10) : [],
      data_data_keys: raw?.data?.data && typeof raw.data.data === 'object' ? Object.keys(raw.data.data).slice(0, 10) : [],
      paging_total: raw?.data?.data?.premiumDashAnalyticsObjectByAnalyticsEntity?.paging?.total
        ?? raw?.data?.premiumDashAnalyticsObjectByAnalyticsEntity?.paging?.total
        ?? raw?.premiumDashAnalyticsObjectByAnalyticsEntity?.paging?.total
        ?? null,
      first_element_keys: (() => {
        const root =
          raw?.data?.data?.premiumDashAnalyticsObjectByAnalyticsEntity ??
          raw?.data?.premiumDashAnalyticsObjectByAnalyticsEntity ??
          raw?.premiumDashAnalyticsObjectByAnalyticsEntity ??
          null;
        const els = Array.isArray(root?.elements) ? root.elements : [];
        return els.length > 0 && typeof els[0] === 'object' ? Object.keys(els[0]).slice(0, 15) : [];
      })(),
    });

    const results = [];
    for (const row of managed) {
      const wvmp = await unipileService.getProfileViewers(row.unipile_account_id);
      const lastStored = await pool.query(
        `SELECT captured_on::text AS day, views_count
           FROM creator_profile_view_snapshots
          WHERE creator_id = $1
          ORDER BY captured_on DESC
          LIMIT 5`,
        [row.id]
      );
      results.push({
        creator_id: row.id,
        creator_name: row.name,
        unipile_account_id: row.unipile_account_id,
        live_wvmp: wvmp == null ? null : {
          parsed_count: wvmp.count,
          pages_walked: wvmp.pages,
          voyager_paging_total: wvmp.pagingTotal,
        },
        response_shape: wvmp == null ? null : buildShape(wvmp.raw),
        last_stored_snapshots: lastStored.rows,
        hint: wvmp == null
          ? 'Unipile passthrough returned an error or no body — check server logs for the [Unipile WVMP] line.'
          : wvmp.count === 0
            ? 'Live call succeeded but returned zero viewer elements. Either the queryId hash rotated, the connected LinkedIn account is rate-limited, or the response shape changed.'
            : 'WVMP is returning data. If the chart is still empty, check that the daily scrape is running and inserting snapshots.',
      });
    }

    res.json({ count: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/:id/wvmp-debug — runs the live WVMP fetch for one creator
// and dumps everything we get back so we can see why profile-view tracking
// returns nothing for an account. Surfaces the parsed count, page count,
// paging.total Voyager reports, the response keys at each candidate path,
// and the latest stored snapshot. Hit it with the creator UUID:
//   GET /api/accounts/<uuid>/wvmp-debug
router.get('/:id/wvmp-debug', async (req: Request, res: Response) => {
  try {
    const creator = await CreatorModel.findById(req.params.id as string);
    if (!creator) return res.status(404).json({ error: 'Creator not found' });
    const accountIdOverride = (creator as any).unipile_account_id as string | null;
    if (!accountIdOverride) {
      return res.status(400).json({ error: 'Creator has no unipile_account_id set' });
    }

    const wvmp = await unipileService.getProfileViewers(accountIdOverride);
    const lastStored = await pool.query(
      `SELECT captured_on::text AS day, views_count
         FROM creator_profile_view_snapshots
        WHERE creator_id = $1
        ORDER BY captured_on DESC
        LIMIT 5`,
      [creator.id]
    );

    // Map the response shape so we can see at a glance which path Voyager
    // took without dumping the entire payload to the wire.
    const raw = wvmp?.raw;
    const shape = {
      top_keys: raw && typeof raw === 'object' ? Object.keys(raw).slice(0, 10) : [],
      data_keys: raw?.data && typeof raw.data === 'object' ? Object.keys(raw.data).slice(0, 10) : [],
      data_data_keys: raw?.data?.data && typeof raw.data.data === 'object' ? Object.keys(raw.data.data).slice(0, 10) : [],
      paging_total: raw?.data?.data?.premiumDashAnalyticsObjectByAnalyticsEntity?.paging?.total
        ?? raw?.data?.premiumDashAnalyticsObjectByAnalyticsEntity?.paging?.total
        ?? raw?.premiumDashAnalyticsObjectByAnalyticsEntity?.paging?.total
        ?? null,
      first_element_keys: (() => {
        const root =
          raw?.data?.data?.premiumDashAnalyticsObjectByAnalyticsEntity ??
          raw?.data?.premiumDashAnalyticsObjectByAnalyticsEntity ??
          raw?.premiumDashAnalyticsObjectByAnalyticsEntity ??
          null;
        const els = Array.isArray(root?.elements) ? root.elements : [];
        return els.length > 0 && typeof els[0] === 'object' ? Object.keys(els[0]).slice(0, 15) : [];
      })(),
    };

    res.json({
      creator_id: creator.id,
      creator_name: creator.name,
      unipile_account_id: accountIdOverride,
      // null = the API call itself failed (logged to server console).
      // Anything else = we got a response back; check parsed_count + shape
      // to see whether it's actually carrying viewer data or a paywall.
      live_wvmp: wvmp == null ? null : {
        parsed_count: wvmp.count,
        pages_walked: wvmp.pages,
        voyager_paging_total: wvmp.pagingTotal,
      },
      response_shape: wvmp == null ? null : shape,
      last_stored_snapshots: lastStored.rows,
      hint: wvmp == null
        ? 'Unipile passthrough returned an error or no body — check server logs for the [Unipile WVMP] line. Most common: queryId hash rotated or the connected account has zero Premium access.'
        : wvmp.count === 0
          ? 'Live call succeeded but returned zero viewer elements. This is the LinkedIn-free-tier signature (WVMP is gated behind Premium / Sales Navigator). Confirm the account has Premium or Sales Nav active; without it LinkedIn does not return real WVMP data through any client.'
          : 'WVMP is returning data. If the chart is still empty, check that the daily scrape is running and inserting into creator_profile_view_snapshots.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper — for the scoped creator(s), compute per-day viewer counts by
// taking MAX across all snapshots that captured that day.
//
// Rationale: LinkedIn's WVMP feed is a rolling window. If we used only
// the latest snapshot, viewers that fell off LinkedIn's trailing edge
// since the prior capture would disappear from our chart too. By taking
// MAX over every snapshot's bucket for each (creator, day), we keep the
// highest count we ever recorded for that day — so older days stay
// truthful even as LinkedIn rotates viewers out of its feed.
//
// Returns a Map<dayKey, totalViewers> where total = sum across creators
// of MAX-per-snapshot for that creator/day.
async function buildDailyViewerBuckets(
  creatorId: string | null,
  days: number
): Promise<Map<string, number>> {
  const params: any[] = [];
  let creatorFilter = 'c.is_managed = TRUE';
  if (creatorId) {
    params.push(creatorId);
    creatorFilter = `s.creator_id = $${params.length}`;
  }
  // Pull every snapshot (across history). We need ALL of them, not just
  // those captured within `days`, because a snapshot captured weeks ago
  // may still be the only record of a viewer event whose day-bucket falls
  // inside the requested window (the snapshot captured the rolling window
  // around that day, including its events).
  const { rows: snapshots } = await pool.query(
    `SELECT s.creator_id, s.viewer_timestamps
       FROM creator_profile_view_snapshots s
       JOIN creators c ON c.id = s.creator_id
      WHERE ${creatorFilter}
        AND s.viewer_timestamps IS NOT NULL
        AND array_length(s.viewer_timestamps, 1) > 0`,
    params
  );

  const now = Date.now();
  const windowStart = now - days * 86400_000;
  const dayKey = (ms: number) => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  };

  // perCreatorDay = creator_id → (dayKey → MAX count seen across that
  // creator's snapshots). MAX, not sum: the same viewer captured today
  // and again tomorrow would otherwise be counted twice.
  const perCreatorDay = new Map<string, Map<string, number>>();
  for (const snap of snapshots) {
    const ts: number[] | null = snap.viewer_timestamps;
    if (!Array.isArray(ts)) continue;
    const snapBucket = new Map<string, number>();
    for (const raw of ts) {
      const ms = typeof raw === 'string' ? Number(raw) : raw;
      if (!Number.isFinite(ms) || ms < windowStart || ms > now + 86400_000) continue;
      const key = dayKey(ms);
      snapBucket.set(key, (snapBucket.get(key) || 0) + 1);
    }
    let creatorMap = perCreatorDay.get(snap.creator_id);
    if (!creatorMap) {
      creatorMap = new Map<string, number>();
      perCreatorDay.set(snap.creator_id, creatorMap);
    }
    for (const [k, v] of snapBucket) {
      const prev = creatorMap.get(k) || 0;
      if (v > prev) creatorMap.set(k, v);
    }
  }

  // Combine across creators — sum per day. A human who viewed both
  // managed profiles on the same day counts twice (it IS two views).
  const combined = new Map<string, number>();
  for (const creatorMap of perCreatorDay.values()) {
    for (const [k, v] of creatorMap) {
      combined.set(k, (combined.get(k) || 0) + v);
    }
  }
  return combined;
}

// GET /api/accounts/profile-view-history?creator_id=xxx&days=90
//
// "New profile viewers per day" — bucketed from the per-viewer viewedAt
// timestamps stored on each WVMP snapshot. Counts daily traffic in a way
// that survives LinkedIn rotating viewers out of its rolling feed: we
// MAX across all stored snapshots per (creator, day) instead of trusting
// only the latest capture. See buildDailyViewerBuckets for the details.
router.get('/profile-view-history', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || null;
    const range = parseDateRange(req);

    // buildDailyViewerBuckets only needs a "look-back window in days"
    // (the underlying snapshots store raw viewer timestamps and we bucket
    // them client-side). When end_date < today we still pass enough
    // days to cover from startDate up to today, then filter the iteration
    // window below so only requested days are returned.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startDay = new Date(`${range.startDate}T00:00:00.000Z`);
    const endDay = new Date(`${range.endDate}T00:00:00.000Z`);
    const daysFromTodayBack = Math.max(
      1,
      Math.round((today.getTime() - startDay.getTime()) / 86400000) + 1
    );
    const dayBuckets = await buildDailyViewerBuckets(creatorId, daysFromTodayBack);

    const out: { day: string; views: number }[] = [];
    for (let d = new Date(startDay); d.getTime() <= endDay.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      out.push({ day: key, views: dayBuckets.get(key) || 0 });
    }

    res.json({ points: out });
  } catch (err: any) {
    console.error('[accounts/profile-view-history]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/profile-views/debug
// Per managed creator: live-fetches WVMP (paginated) and reports how many
// viewers Unipile actually returns vs. what's stored, with a sample of viewer
// timestamps. Use this to confirm that both accounts are returning fresh data
// when the chart looks frozen.
router.get('/profile-views/debug', async (_req: Request, res: Response) => {
  try {
    const { rows: managed } = await pool.query(
      `SELECT id, name, unipile_account_id, linkedin_url
         FROM creators
        WHERE is_managed = TRUE
        ORDER BY name`
    );

    const out: any[] = [];
    for (const c of managed) {
      const latestQ = await pool.query(
        `SELECT captured_on::text AS captured_on, captured_at, views_count, raw_response
           FROM creator_profile_view_snapshots
          WHERE creator_id = $1
          ORDER BY captured_at DESC
          LIMIT 1`,
        [c.id]
      );
      const latest = latestQ.rows[0] ?? null;
      const storedTimestamps = latest?.raw_response
        ? extractViewerTimestamps(latest.raw_response)
        : [];

      let live: any = null;
      if (c.unipile_account_id) {
        const wvmp = await unipileService.getProfileViewers(c.unipile_account_id);
        if (wvmp) {
          const liveTimestamps = extractViewerTimestamps(wvmp.raw);
          liveTimestamps.sort((a, b) => b - a); // newest first
          // First element of the feed, raw — lets us see which fields the
          // current LinkedIn schema actually carries the timestamp under
          // when the extractor returns zero matches.
          const firstEl: any =
            wvmp.raw?.data?.data?.premiumDashAnalyticsObjectByAnalyticsEntity?.elements?.[0] ??
            wvmp.raw?.data?.premiumDashAnalyticsObjectByAnalyticsEntity?.elements?.[0] ??
            wvmp.raw?.premiumDashAnalyticsObjectByAnalyticsEntity?.elements?.[0] ??
            null;
          live = {
            count: wvmp.count,
            pages: wvmp.pages,
            paging_total: wvmp.pagingTotal,
            timestamps_extracted: liveTimestamps.length,
            sample_recent_viewers: liveTimestamps.slice(0, 5).map((ms) => new Date(ms).toISOString()),
            first_element_keys: firstEl && typeof firstEl === 'object' ? Object.keys(firstEl) : null,
            first_element_sample: firstEl,
          };
        }
      }

      out.push({
        creator_id: c.id,
        name: c.name,
        has_unipile_account_id: !!c.unipile_account_id,
        unipile_account_id_preview: c.unipile_account_id
          ? `${String(c.unipile_account_id).slice(0, 6)}…${String(c.unipile_account_id).slice(-4)}`
          : null,
        latest_snapshot: latest
          ? {
              captured_on: latest.captured_on,
              captured_at: latest.captured_at,
              views_count: latest.views_count,
              timestamps_in_raw: storedTimestamps.length,
            }
          : null,
        live,
      });
    }

    res.json({ creators: out });
  } catch (err: any) {
    console.error('[accounts/profile-views/debug]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/profile-views/refresh
// Forces a fresh follower + WVMP snapshot for every managed creator with a
// Unipile account_id, ignoring whether today's snapshot already exists
// (the upsert overwrites the row). Used by the daily ticker, and also wired
// into the UI button so the chart can be refreshed on demand without doing
// a full post re-scrape.
router.post('/profile-views/refresh', async (_req: Request, res: Response) => {
  try {
    const { rows: managed } = await pool.query(
      `SELECT id FROM creators WHERE is_managed = TRUE AND unipile_account_id IS NOT NULL`
    );
    const results: any[] = [];
    for (const { id } of managed) {
      try {
        const r = await captureAccountSnapshots(id);
        results.push({ creator_id: id, ...r });
      } catch (err: any) {
        results.push({ creator_id: id, ok: false, error: err?.message });
      }
    }
    res.json({ refreshed: results.length, results });
  } catch (err: any) {
    console.error('[accounts/profile-views/refresh]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/profile-views/refresh
// Forces a fresh follower + WVMP snapshot for every managed creator with a
// Unipile account_id, ignoring whether today's snapshot already exists
// (the upsert overwrites the row). Used by the daily ticker, and also wired
// into the UI button so the chart can be refreshed on demand without doing
// a full post re-scrape.
router.post('/profile-views/refresh', async (_req: Request, res: Response) => {
  try {
    const { rows: managed } = await pool.query(
      `SELECT id FROM creators WHERE is_managed = TRUE AND unipile_account_id IS NOT NULL`
    );
    const results: any[] = [];
    for (const { id } of managed) {
      try {
        const r = await captureAccountSnapshots(id);
        results.push({ creator_id: id, ...r });
      } catch (err: any) {
        results.push({ creator_id: id, ok: false, error: err?.message });
      }
    }
    res.json({ refreshed: results.length, results });
  } catch (err: any) {
    console.error('[accounts/profile-views/refresh]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/accounts/posts/:id/snapshots/zero-impressions
//
// Cleanup for "bogus zero" snapshots. A snapshot is bogus when:
//   - impressions_count is NULL or 0, AND
//   - there exists an EARLIER snapshot for the same post with impressions > 0.
//
// Engagement (likes/comments/reposts) staying flat or growing across those
// rows is the giveaway that Unipile returned a partial/glitched payload
// while we were polling. Rows like that drag the impressions line back to
// zero and ruin the chart.
//
// The earlier "after last_real only" rule missed interior zeros — i.e. a
// bad snapshot surrounded by good ones on either side. The new logic
// catches both trailing AND interior cases, while still preserving the
// legitimate `impressions=0` at the very start of a post's life (no prior
// real snapshot exists at that point, so the rule doesn't fire).
//
// Idempotent — running twice is safe (the second run finds nothing).
router.delete('/posts/:id/snapshots/zero-impressions', async (req: Request, res: Response) => {
  try {
    const postId = req.params.id as string;
    const { rows: anchor } = await pool.query(
      `SELECT MIN(captured_at) AS first_real
         FROM post_snapshots
        WHERE post_id = $1
          AND impressions_count IS NOT NULL
          AND impressions_count > 0`,
      [postId]
    );
    const firstReal = anchor[0]?.first_real;
    if (!firstReal) {
      return res.json({ deleted: 0, reason: 'no real impressions snapshot found — nothing to clean up against' });
    }
    const { rowCount } = await pool.query(
      `DELETE FROM post_snapshots
        WHERE post_id = $1
          AND captured_at > $2
          AND (impressions_count IS NULL OR impressions_count = 0)`,
      [postId, firstReal]
    );
    res.json({ deleted: rowCount ?? 0, anchor_first_real: firstReal });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/posts/:id/hide   — quitar un post de Live Posts a mano.
// POST /api/accounts/posts/:id/unhide — devolverlo, por si el clic fue sin querer.
//
// Iker borra un post de LinkedIn (le pasó dos veces en agosto: el del evento sin
// el OK de los mencionados y el lead magnet capado) y el post se queda colgado en
// el panel. Hasta ahora había que pedírmelo a mí y lo hacía por SQL.
//
// Se reutiliza `deleted_from_linkedin_at`, la misma columna que pone el monitor
// cuando detecta que un post ya no está en el feed (`postMonitor.ts`), en vez de
// crear una `hidden_at` aparte: el caso real es siempre el mismo —el post ya no
// existe en LinkedIn— y dos columnas para un solo estado se acaban desincronizando.
// NO se borra la fila: las métricas y los snapshots se conservan enteros, que es
// justo lo que Iker no quería perder.
router.post('/posts/:id/hide', async (req: Request, res: Response) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE posts SET deleted_from_linkedin_at = NOW()
        WHERE id = $1 AND deleted_from_linkedin_at IS NULL`,
      [req.params.id]
    );
    if (rowCount === 0) {
      // O no existe, o ya estaba oculto. Lo segundo no es un error: el boton es
      // idempotente a proposito, para que un doble clic no reviente nada.
      const { rows } = await pool.query(`SELECT id FROM posts WHERE id = $1`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ ok: true, hidden: true });
  } catch (err: any) {
    console.error('[accounts/posts/:id/hide]', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/:id/unhide', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `UPDATE posts SET deleted_from_linkedin_at = NULL WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ ok: true, hidden: false });
  } catch (err: any) {
    console.error('[accounts/posts/:id/unhide]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/posts/:id/refresh — force a single-post snapshot now.
// Mirrors the bulk live-refresh button but scoped to one post, so the user
// can pull fresh numbers for just the post they're staring at without
// waiting on every monitored creator. Idempotent: re-hitting it captures
// another snapshot row, which is fine — those are the time-series points.
router.post('/posts/:id/refresh', async (req: Request, res: Response) => {
  try {
    const result = await capturePostSnapshot(req.params.id as string);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/accounts/posts/:id/impressions — manually set a post's impression
// count. Needed to backfill posts published BEFORE we started tracking that
// account: LinkedIn only returns impressions to the authenticated owner, so
// those older posts (scraped under another account or before onboarding) have
// none. Recomputes the creator's outliers so the rate-based metrics for
// managed accounts (engagement / impressions) stay consistent afterwards.
router.patch('/posts/:id/impressions', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const impressions = Number(req.body?.impressions);
    if (!Number.isFinite(impressions) || impressions < 0) {
      return res.status(400).json({ error: 'impressions must be a non-negative number' });
    }
    const { rows } = await pool.query(
      `UPDATE posts SET impressions_count = $1 WHERE id = $2
       RETURNING id, creator_id, impressions_count`,
      [Math.round(impressions), id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    const post = rows[0];
    await recalcCreatorOutliers(post.creator_id);
    res.json({ ok: true, id: post.id, impressions_count: post.impressions_count });
  } catch (err: any) {
    console.error('[accounts/posts/impressions]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/:id/scrape — re-scrape posts using this account's unipile_account_id
// so impressions come through (LinkedIn only returns impressions for the authenticated account).
router.post('/:id/scrape', async (req: Request, res: Response) => {
  try {
    const creator = await CreatorModel.findById(req.params.id as string);
    if (!creator) return res.status(404).json({ error: 'Creator not found' });
    if (!(creator as any).unipile_account_id) {
      return res.status(400).json({ error: 'Set a Unipile account ID for this creator first' });
    }
    const result = await scrapeCreatorPosts(creator.id);
    res.json(result);
  } catch (err: any) {
    console.error('[accounts/scrape]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/analytics?creator_id=xxx&days=90
// If creator_id is omitted, aggregates across all managed accounts.
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || null;
    const range = parseDateRange(req);
    const days = range.days;

    const currentStartIso = `${range.startDate}T00:00:00.000Z`;
    const currentEndIso = `${range.endDate}T23:59:59.999Z`;
    // Previous period of equal length, ending right before the current
    // period starts. Used for the deltas in KPI cards.
    const previousStartIso = new Date(
      new Date(currentStartIso).getTime() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    // Build scope: either a specific creator or all managed accounts.
    // Queries use <SCOPE> as a placeholder so each query can append its own params.
    // Demo posts are always excluded so analytics reflect real activity only.
    // Las cuentas manuales (posts que escribimos para trabajadores cuya cuenta
    // no esta conectada) suman a todo por defecto. El check de la UI manda
    // include_manual=false para mirar solo a las cuentas conectadas.
    //
    // Por que existe el interruptor: los TOTALES no sufren al mezclar, pero las
    // MEDIAS si. Un trabajador con 1 post y 8 likes baja el "Avg engagement" de
    // los 3 jefes, y la tabla por cuenta se llena de filas de 1 post. Con el
    // check se ven las dos verdades sin tener que elegir una para siempre.
    const incluirManual = req.query.include_manual !== 'false';
    const filtroManual = incluirManual ? '' : ' AND is_manual IS NOT TRUE';

    const scope = (nextIdx: number) => {
      const demoFilter = `p.linkedin_post_id <> 'DEMO_LIVE_POST'`;
      if (creatorId) return { sql: `p.creator_id = $${nextIdx} AND ${demoFilter}`, params: [creatorId] };
      return {
        sql: `p.creator_id IN (SELECT id FROM creators WHERE is_managed = TRUE${filtroManual}) AND ${demoFilter}`,
        params: [],
      };
    };

    const totalsSql = (dateCondition: string, baseParams: any[]) => {
      const s = scope(baseParams.length + 1);
      return {
        sql: `SELECT
          COUNT(*)::int AS total_posts,
          COUNT(*) FILTER (WHERE p.is_outlier = TRUE)::int AS total_outliers,
          COALESCE(ROUND(AVG(p.engagement_score))::int, 0) AS avg_engagement,
          COALESCE(ROUND(MAX(p.engagement_score))::int, 0) AS max_engagement,
          COALESCE(SUM(p.likes_count)::int, 0) AS total_likes,
          COALESCE(SUM(p.comments_count)::int, 0) AS total_comments,
          COALESCE(SUM(p.reposts_count)::int, 0) AS total_reposts,
          COALESCE(SUM(p.impressions_count), 0)::bigint AS total_impressions,
          COUNT(*) FILTER (WHERE p.impressions_count IS NOT NULL)::int AS posts_with_impressions,
          COALESCE(ROUND(AVG(p.impressions_count) FILTER (WHERE p.impressions_count IS NOT NULL))::int, 0) AS avg_impressions
         FROM posts p
         WHERE ${dateCondition} AND ${s.sql}`,
        params: [...baseParams, ...s.params],
      };
    };

    // Current-period totals
    const currentTotals = totalsSql('p.published_at >= $1 AND p.published_at <= $2', [currentStartIso, currentEndIso]);
    const totalsQ = await pool.query(currentTotals.sql, currentTotals.params);

    // Previous-period totals (same length immediately before current)
    const prevTotals = totalsSql('p.published_at >= $1 AND p.published_at < $2', [previousStartIso, currentStartIso]);
    const prevTotalsQ = await pool.query(prevTotals.sql, prevTotals.params);

    const deltaPct = (curr: number, prev: number): number | null => {
      if (!prev || prev === 0) return null;
      return +(((curr - prev) / prev) * 100).toFixed(1);
    };

    const buildComparison = (curr: any, prev: any) => ({
      avg_engagement: { current: curr.avg_engagement, previous: prev.avg_engagement, delta_pct: deltaPct(curr.avg_engagement, prev.avg_engagement) },
      total_posts: { current: curr.total_posts, previous: prev.total_posts, delta_pct: deltaPct(curr.total_posts, prev.total_posts) },
      total_outliers: { current: curr.total_outliers, previous: prev.total_outliers, delta_pct: deltaPct(curr.total_outliers, prev.total_outliers) },
      total_likes: { current: curr.total_likes, previous: prev.total_likes, delta_pct: deltaPct(curr.total_likes, prev.total_likes) },
      total_comments: { current: curr.total_comments, previous: prev.total_comments, delta_pct: deltaPct(curr.total_comments, prev.total_comments) },
      total_reposts: { current: curr.total_reposts, previous: prev.total_reposts, delta_pct: deltaPct(curr.total_reposts, prev.total_reposts) },
      total_impressions: { current: Number(curr.total_impressions), previous: Number(prev.total_impressions), delta_pct: deltaPct(Number(curr.total_impressions), Number(prev.total_impressions)) },
      avg_impressions: { current: curr.avg_impressions, previous: prev.avg_impressions, delta_pct: deltaPct(curr.avg_impressions, prev.avg_impressions) },
    });

    // Gap-filled daily series with 7-day rolling sum of total engagement.
    // generate_series builds every day in range, LEFT JOIN fills zeros,
    // window function smooths the line so it's not all spikes. The top
    // post per day is carried through so the chart tooltip can show a
    // preview + link for days with publications.
    // First two params are the inclusive [start, end] of the requested
    // window; scope params follow.
    const dailyScope = scope(3);
    const dailyQ = await pool.query(
      `WITH day_series AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS day
      ),
      daily_raw AS (
        SELECT
          (p.published_at)::date AS day,
          COUNT(*)::int AS posts,
          COUNT(*) FILTER (WHERE p.is_outlier = TRUE)::int AS outliers,
          COALESCE(ROUND(SUM(p.engagement_score))::int, 0) AS total_engagement,
          COALESCE(ROUND(AVG(p.engagement_score))::int, 0) AS avg_engagement,
          COALESCE(SUM(p.impressions_count), 0)::bigint AS total_impressions
        FROM posts p
        WHERE p.published_at >= $1 AND p.published_at <= $2 AND ${dailyScope.sql}
        GROUP BY (p.published_at)::date
      ),
      day_post_arrays AS (
        -- All posts published on each day, agg'd as a JSON array so the
        -- chart can render ONE pencil per post (grouped by creator)
        -- instead of a single "top post" badge that hid same-day
        -- publications from the other managed account.
        SELECT
          (p.published_at)::date AS day,
          json_agg(
            json_build_object(
              'id', p.id,
              'preview', COALESCE(p.content_text, p.hook_text),
              'url', p.post_url,
              'outlier_ratio', p.outlier_ratio,
              'is_outlier', p.is_outlier,
              'creator_id', p.creator_id,
              'creator_name', c.name
            ) ORDER BY p.engagement_score DESC
          ) AS day_posts
        FROM posts p
        JOIN creators c ON c.id = p.creator_id
        WHERE p.published_at >= $1 AND p.published_at <= $2 AND ${dailyScope.sql}
        GROUP BY (p.published_at)::date
      ),
      filled AS (
        SELECT
          ds.day,
          COALESCE(dr.posts, 0) AS posts,
          COALESCE(dr.outliers, 0) AS outliers,
          COALESCE(dr.total_engagement, 0) AS total_engagement,
          COALESCE(dr.avg_engagement, 0) AS avg_engagement,
          COALESCE(dr.total_impressions, 0) AS total_impressions,
          dpa.day_posts
        FROM day_series ds
        LEFT JOIN daily_raw dr ON dr.day = ds.day
        LEFT JOIN day_post_arrays dpa ON dpa.day = ds.day
      )
      SELECT
        day::text AS day,
        posts,
        outliers,
        total_engagement,
        avg_engagement,
        total_impressions::bigint AS total_impressions,
        SUM(total_engagement) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)::int AS rolling_sum_7d,
        SUM(total_impressions) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)::bigint AS rolling_impressions_7d,
        SUM(posts) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)::int AS active_posts_7d,
        COALESCE(day_posts, '[]'::json) AS day_posts
      FROM filled
      ORDER BY day ASC`,
      [currentStartIso, currentEndIso, ...dailyScope.params]
    );

    // Content type mix with avg engagement per type
    const formatScope = scope(3);
    const formatQ = await pool.query(
      `SELECT
        p.content_type,
        COUNT(*)::int AS count,
        COALESCE(ROUND(AVG(p.engagement_score))::int, 0) AS avg_engagement,
        COUNT(*) FILTER (WHERE p.is_outlier = TRUE)::int AS outliers
       FROM posts p
       WHERE p.published_at >= $1 AND p.published_at <= $2 AND ${formatScope.sql}
       GROUP BY p.content_type
       ORDER BY count DESC`,
      [currentStartIso, currentEndIso, ...formatScope.params]
    );

    // Top posts — sorted by outlier_ratio DESC (the multiplier vs. each
    // creator's own baseline), engagement_score as a tiebreaker for posts
    // without a ratio yet. The frontend paginates this list with a
    // "ver más" button, so we serve a generous LIMIT instead of the
    // previous 10 — keeps the payload bounded but lets the user dig
    // beyond the very top of the ranking when the range is wide.
    const topScope = scope(3);
    const topPostsQ = await pool.query(
      `SELECT
        p.id, p.content_text, p.content_type, p.published_at,
        p.likes_count, p.comments_count, p.reposts_count, p.impressions_count,
        p.profile_viewers_count, p.followers_gained_count,
              p.saves_count, p.sends_count, p.link_clicks_count, p.premium_button_clicks, p.link_url, p.pillar,
        p.engagement_score, p.outlier_ratio, p.is_outlier,
        p.post_url, p.hook_text,
        c.name AS creator_name, c.profile_image_url AS creator_image
       FROM posts p
       JOIN creators c ON c.id = p.creator_id
       WHERE p.published_at >= $1 AND p.published_at <= $2 AND ${topScope.sql}
       ORDER BY p.outlier_ratio DESC NULLS LAST, p.engagement_score DESC
       LIMIT 50`,
      [currentStartIso, currentEndIso, ...topScope.params]
    );

    // Hook type distribution
    const hookScope = scope(3);
    const hookQ = await pool.query(
      `SELECT
        p.hook_type,
        COUNT(*)::int AS count,
        COALESCE(ROUND(AVG(p.engagement_score))::int, 0) AS avg_engagement
       FROM posts p
       WHERE p.published_at >= $1 AND p.published_at <= $2 AND ${hookScope.sql} AND p.hook_type IS NOT NULL
       GROUP BY p.hook_type
       ORDER BY avg_engagement DESC`,
      [currentStartIso, currentEndIso, ...hookScope.params]
    );

    // Account-level deltas across the same date range. We track followers
    // and profile views as daily snapshots in dedicated tables — for the
    // KPI cards we just want last - first per creator, summed when scope
    // is 'all'. Window functions over the snapshot rows give us the first
    // and last value for each creator without N+1 subqueries.
    const buildSnapshotDelta = async (table: string, valueCol: string): Promise<number> => {
      const params: any[] = [range.startDate, range.endDate];
      let creatorFilter = '';
      if (creatorId) {
        params.push(creatorId);
        creatorFilter = `AND s.creator_id = $${params.length}`;
      }
      const { rows } = await pool.query(
        `SELECT
           COALESCE(SUM(last_v - first_v), 0)::int AS gained
         FROM (
           SELECT DISTINCT
             s.creator_id,
             FIRST_VALUE(s.${valueCol}) OVER (PARTITION BY s.creator_id ORDER BY s.captured_on ASC) AS first_v,
             FIRST_VALUE(s.${valueCol}) OVER (PARTITION BY s.creator_id ORDER BY s.captured_on DESC) AS last_v
           FROM ${table} s
           JOIN creators c ON c.id = s.creator_id
           WHERE c.is_managed = TRUE
             AND s.captured_on >= $1::date
             AND s.captured_on <= $2::date
             ${creatorFilter}
         ) sub`,
        params
      );
      return Number(rows[0]?.gained || 0);
    };
    const followersGained = await buildSnapshotDelta('creator_follower_snapshots', 'followers_count');

    // Profile-views KPI used to be `last - first` of the rolling-feed size,
    // which is misleading. Now we share the bucketing logic with the chart
    // (buildDailyViewerBuckets) so KPI and chart agree by construction —
    // both MAX across snapshots per (creator, day) and sum the resulting
    // per-day counts within the selected window. buildDailyViewerBuckets
    // still takes a single look-back days arg, so we pass enough days to
    // reach back to range.startDate, then filter the resulting bucket map
    // to the requested window before summing.
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    const startUtc = new Date(`${range.startDate}T00:00:00.000Z`);
    const endUtc = new Date(`${range.endDate}T00:00:00.000Z`);
    const buckLookback = Math.max(1, Math.round((todayUtc.getTime() - startUtc.getTime()) / 86400000) + 1);
    const dailyBuckets = await buildDailyViewerBuckets(creatorId, buckLookback);
    let profileViewsGained = 0;
    for (const [key, v] of dailyBuckets.entries()) {
      const d = new Date(`${key}T00:00:00.000Z`).getTime();
      if (d >= startUtc.getTime() && d <= endUtc.getTime()) profileViewsGained += v;
    }

    // Posts/week cadence — always actionable. Uses the same scope filter.
    // `days` is a sanitised integer from the route handler so it's safe to
    // interpolate directly. The previous version passed it as a positional
    // param, which collided with scope()'s $2 placeholder for creator_id and
    // crashed the whole /analytics endpoint with "invalid uuid syntax"
    // whenever a specific creator was selected — that's why every chart
    // looked combined: the request 500'd silently and useApi kept rendering
    // the last successful (all-managed) response.
    const cadenceScope = scope(3);
    const cadenceQ = await pool.query(
      `SELECT COUNT(*)::float / GREATEST(${days} / 7.0, 1) AS posts_per_week
       FROM posts p
       WHERE p.published_at >= $1 AND p.published_at <= $2 AND ${cadenceScope.sql}`,
      [currentStartIso, currentEndIso, ...cadenceScope.params]
    );
    const postsPerWeek = Number(cadenceQ.rows[0]?.posts_per_week || 0);

    // Per-account breakdown (only when aggregating across all managed)
    let perAccount: any[] = [];
    if (!creatorId) {
      const perAccountQ = await pool.query(
        `SELECT
          c.id, c.name, c.profile_image_url, c.is_manual,
          COUNT(p.id)::int AS posts,
          COUNT(p.id) FILTER (WHERE p.is_outlier = TRUE)::int AS outliers,
          COALESCE(ROUND(AVG(p.engagement_score))::int, 0) AS avg_engagement,
          COALESCE(ROUND(MAX(p.outlier_ratio)::numeric, 1)::float, 0) AS max_virality,
          COALESCE(ROUND(AVG(p.outlier_ratio)::numeric, 2)::float, 0) AS avg_virality,
          COALESCE(SUM(p.impressions_count), 0)::bigint AS total_impressions,
          COALESCE(ROUND(AVG(p.impressions_count) FILTER (WHERE p.impressions_count IS NOT NULL))::int, 0) AS avg_impressions
         FROM creators c
         LEFT JOIN posts p ON p.creator_id = c.id
           AND p.published_at >= $1 AND p.published_at <= $2
           AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
         WHERE c.is_managed = TRUE${filtroManual}
         GROUP BY c.id
         ORDER BY avg_engagement DESC`,
        [currentStartIso, currentEndIso]
      );
      perAccount = perAccountQ.rows;
    }

    res.json({
      days,
      start_date: range.startDate,
      end_date: range.endDate,
      creator_id: creatorId,
      totals: {
        ...totalsQ.rows[0],
        followers_gained: followersGained,
        profile_views_gained: profileViewsGained,
        posts_per_week: +postsPerWeek.toFixed(1),
      },
      comparison: buildComparison(totalsQ.rows[0], prevTotalsQ.rows[0]),
      daily: dailyQ.rows,
      format_mix: formatQ.rows,
      top_posts: topPostsQ.rows,
      hook_types: hookQ.rows,
      per_account: perAccount,
    });
  } catch (err: any) {
    console.error('[accounts/analytics]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/live-posts?creator_id=... — monitored posts from managed accounts.
// Includes posts from the last 7 days plus any older post that still has snapshots.
// Pass creator_id to scope to a single account; omit for all managed accounts.
router.get('/live-posts', async (req: Request, res: Response) => {
  try {
    // Opportunistic tick: the UI polls this every 2 min while the Accounts page is open,
    // which keeps snapshot cadence alive even if Railway recycles the background setInterval.
    maybeTick();
    const creatorId = (req.query.creator_id as string) || null;
    // Optional date range — when provided (passed by the Accounts page so
    // the same top-of-page date filter affects both analytics AND the live
    // posts list), we use a STRICT published_at filter and drop the
    // "snapshot_count > 0" fallback. Without it, the default 7-day window
    // OR posts with snapshots stays in place (backward compat for any
    // caller that hits this endpoint without dates).
    const startDate = (req.query.start_date as string) || null;
    const endDate = (req.query.end_date as string) || null;
    // Las cuentas manuales entran por defecto. El check de la UI manda
    // include_manual=false cuando solo se quiere mirar a los jefes.
    const incluirManual = req.query.include_manual !== 'false';
    const params: any[] = [];
    let creatorFilter = '';
    if (creatorId) {
      params.push(creatorId);
      creatorFilter = `AND c.id = $${params.length}`;
    }
    if (!incluirManual) creatorFilter += ` AND c.is_manual IS NOT TRUE`;
    let dateFilter: string;
    if (startDate && endDate) {
      params.push(`${startDate} 00:00:00`);
      const startIdx = params.length;
      params.push(`${endDate} 23:59:59`);
      const endIdx = params.length;
      dateFilter = `p.published_at >= $${startIdx} AND p.published_at <= $${endIdx}`;
    } else {
      dateFilter = `(p.published_at > NOW() - INTERVAL '7 days' OR p.snapshot_count > 0)`;
    }
    const { rows } = await pool.query(
      `WITH candidate_posts AS (
         SELECT p.*,
                (SELECT COUNT(*)::int FROM post_snapshots s WHERE s.post_id = p.id) AS snapshot_count,
                (SELECT MAX(s.captured_at) FROM post_snapshots s WHERE s.post_id = p.id) AS last_snapshot_at
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
         WHERE c.is_managed = TRUE
           -- Conectadas por Unipile O manuales. Las manuales no tienen
           -- account_id a proposito (ver migracion v38), asi que sin este OR
           -- sus posts nunca llegarian a Live posts.
           AND (c.unipile_account_id IS NOT NULL OR c.is_manual = TRUE)
           AND p.published_at IS NOT NULL
           AND p.deleted_from_linkedin_at IS NULL
           ${creatorFilter}
       )
       SELECT
         p.id, p.content_text, p.hook_text, p.content_type, p.published_at,
         p.likes_count, p.comments_count, p.reposts_count, p.impressions_count,
         p.profile_viewers_count, p.followers_gained_count,
              p.saves_count, p.sends_count, p.link_clicks_count, p.premium_button_clicks, p.link_url, p.pillar,
         p.engagement_score, p.outlier_ratio, p.is_outlier, p.post_url,
         c.id AS creator_id, c.name AS creator_name, c.profile_image_url AS creator_image,
         c.is_manual AS creator_is_manual,
         p.snapshot_count,
         p.last_snapshot_at,
         (NOW() - p.published_at < INTERVAL '6 hours') AS is_live,
         CASE
           WHEN NOW() - p.published_at < INTERVAL '1 hour'  THEN 'golden'
           WHEN NOW() - p.published_at < INTERVAL '6 hours' THEN 'first_wave'
           WHEN NOW() - p.published_at < INTERVAL '24 hours' THEN 'consolidation'
           WHEN NOW() - p.published_at < INTERVAL '72 hours' THEN 'long_tail'
           WHEN NOW() - p.published_at < INTERVAL '7 days'  THEN 'tail'
           ELSE 'closed'
         END AS phase
       FROM candidate_posts p
       JOIN creators c ON c.id = p.creator_id
       WHERE ${dateFilter}
       ORDER BY p.published_at DESC
       LIMIT 50`,
      params
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/live-refresh — "fetch latest" for managed accounts.
//
// Pulls only NEW posts (incremental via getPosts knownIds) and creates the
// first snapshot for each one. Does NOT re-snapshot existing posts — the
// 15-min postMonitor tick handles that with a smarter cadence (more
// frequently in the golden hour, less so after 24h), so manually refreshing
// every post on every click would just spam Unipile.
//
// Speed: each account does a fast follower snapshot + incremental getPosts
// ONLY. The slow WVMP profile-views fetch (up to 20 paginated LinkedIn
// calls = 20-40s/account) is skipped here — it's owned by the 6h tick and
// the dedicated profile-views refresh button. Accounts are processed in
// PARALLEL so Iker + Unai don't run back to back.
//
// Accepts an optional `creator_id` in the body so the UI can scope the
// refresh to the currently-selected creator instead of every managed account.
// POST /api/accounts/anuncio-chat/run — dispara A MANO un pase del anunciador.
//
// Existe para poder PROBARLO sin esperar a las 10:05 y sin encender el
// planificador: es la unica forma de comprobar que el webhook manda de verdad
// antes de confiarle dos semanas de vacaciones. Un 200 de la API de Google
// Chat no prueba que el mensaje se vea, asi que despues de llamarlo hay que
// ABRIR el Chat y mirarlo.
//
// `?dry=1` compone el mensaje y lo devuelve SIN enviarlo ni marcar nada.
router.post('/anuncio-chat/run', async (req: Request, res: Response) => {
  try {
    if (req.query.dry === '1') {
      // ?post_id=<uuid> apunta el ensayo a un post CONCRETO, saltandose la
      // ventana de hoy. Sin esto, un dia sin publicaciones devuelve una lista
      // vacia y no se puede ver el mensaje que se mandaria: se prueba que el
      // endpoint responde, no que el aviso este bien escrito.
      const unPost = typeof req.query.post_id === 'string' ? req.query.post_id : null;
      const { rows } = unPost
        ? await pool.query(
            `SELECT p.id, p.post_url, p.content_text, p.pillar, c.name AS creator_name
               FROM posts p JOIN creators c ON c.id = p.creator_id
              WHERE p.id = $1`,
            [unPost]
          )
        : await pool.query(
        `SELECT p.id, p.post_url, p.content_text, p.pillar, c.name AS creator_name
           FROM posts p JOIN creators c ON c.id = p.creator_id
          WHERE c.is_managed = TRUE
            AND p.chat_announced_at IS NULL
            AND p.deleted_from_linkedin_at IS NULL
            AND p.published_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid') AT TIME ZONE 'Europe/Madrid'
          ORDER BY p.published_at ASC`
      );
      return res.json({
        dry_run: true,
        pendientes: rows.length,
        // Con comentarios de apoyo REALES: son la mitad del mensaje y lo que
        // hay que revisar antes de fiarse. Si el generador falla, se ve el
        // mensaje sin ellos, que es exactamente lo que haria el job.
        mensajes: await Promise.all(rows.map(async (p: any) => {
          let comments: string[] = [];
          try {
            comments = await generateSupportiveComments(
              {
                postContent: p.content_text || '',
                creatorName: p.creator_name,
                creatorHeadline: null,
                profile: { headline: null, voice_style: null, worldview: null, signature_moves: null, avoid: null },
              },
              5
            );
          } catch { /* mismo comportamiento que el job: se manda sin ellos */ }
          return componerMensaje({
            creatorName: p.creator_name, url: p.post_url, pillar: p.pillar, comments,
          });
        })),
      });
    }
    const r = await anunciarPostsDeHoy();
    res.json(r);
  } catch (err: any) {
    console.error('[anuncio-chat/run]', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/live-refresh', async (req: Request, res: Response) => {
  try {
    const t0 = Date.now();
    const creatorId = typeof req.body?.creator_id === 'string' ? req.body.creator_id : null;
    const { rows: managed } = creatorId
      ? await pool.query(
          `SELECT id FROM creators
            WHERE id = $1
              AND is_managed = TRUE
              AND unipile_account_id IS NOT NULL`,
          [creatorId]
        )
      : await pool.query(
          `SELECT id FROM creators WHERE is_managed = TRUE AND unipile_account_id IS NOT NULL`
        );

    // Process accounts in parallel — each one is independent (its own
    // Unipile account_id), so there's no reason Iker should wait on Unai.
    const settled = await Promise.allSettled(
      managed.map(({ id }) => scrapeCreatorPosts(id))
    );
    let newPosts = 0;
    let viewSnapshots = 0;
    let captured = 0;
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        newPosts += r.value.scraped;
        viewSnapshots++;
        captured += r.value.snapshots_seeded;
      } else {
        console.error(`[accounts/live-refresh] scrape failed for ${managed[i].id}:`, r.reason?.message);
      }
    });
    console.log(`[accounts/live-refresh] TOTAL ${Date.now() - t0}ms across ${managed.length} account(s), ${newPosts} new posts`);
    res.json({
      captured,
      candidates: newPosts,
      scraped: newPosts,
      accounts: managed.length,
      view_snapshots: viewSnapshots,
    });
  } catch (err: any) {
    console.error('[accounts/live-refresh]', err);
    res.status(500).json({ error: err.message });
  }
});

// Lee las metricas privadas del cuerpo de una peticion. Solo deja pasar las 8
// columnas conocidas (nada de volcar req.body en un UPDATE) y convierte "" en
// null, que es lo que manda un input numerico vacio.
function leerMetricasPrivadas(body: any, soloLasQueVienen: boolean): MetricasPrivadas {
  const out: MetricasPrivadas = {};
  for (const campo of CAMPOS_PRIVADOS) {
    if (soloLasQueVienen && !(campo in (body || {}))) continue;
    const bruto = body?.[campo];
    if (campo === 'link_url') {
      const t = typeof bruto === 'string' ? bruto.trim() : '';
      out.link_url = t || null;
      continue;
    }
    if (bruto === '' || bruto === null || bruto === undefined) {
      (out as any)[campo] = null;
      continue;
    }
    const n = Number(bruto);
    (out as any)[campo] = Number.isFinite(n) ? Math.round(n) : null;
  }
  return out;
}

// POST /api/accounts/manual-post/preview — que hay en esa URL.
//
// NO escribe nada. Existe para que se pueda VER lo extraido antes de guardar:
// pegar la URL equivocada es facil y descubrirlo despues, con una cuenta ya
// creada, es un lio de limpiar.
router.post('/manual-post/preview', async (req: Request, res: Response) => {
  try {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url) return res.status(400).json({ error: 'Falta la URL de la publicacion.' });
    const vista = await extraerPost(url);
    // raw_data fuera de la respuesta: son decenas de KB que el modal no usa.
    const { raw, ...limpio } = vista;
    res.json(limpio);
  } catch (err: any) {
    console.error('[accounts/manual-post/preview]', err?.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/accounts/manual-post — guarda el post y, si hace falta, crea la cuenta.
router.post('/manual-post', async (req: Request, res: Response) => {
  try {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url) return res.status(400).json({ error: 'Falta la URL de la publicacion.' });
    const resultado = await guardarPostManual(url, leerMetricasPrivadas(req.body, false));
    res.json(resultado);
  } catch (err: any) {
    console.error('[accounts/manual-post]', err?.message);
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/accounts/posts/:id/manual-metrics — las metricas que solo ve el dueño.
//
// Ademas de escribirlas en el post, deja un punto en la curva con su hora. Es
// lo que permite que un post manual tenga linea de impresiones: si vuelves a
// mirarlas a las 24h y a las 72h, salen tres puntos.
router.patch('/posts/:id/manual-metrics', async (req: Request, res: Response) => {
  try {
    const privadas = leerMetricasPrivadas(req.body, true);
    const resultado = await actualizarMetricasPrivadas(req.params.id as string, privadas);
    res.json(resultado);
  } catch (err: any) {
    console.error('[accounts/manual-metrics]', err?.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/accounts/demo-seed — insert a demo post + realistic snapshots so the user
// can see what the Live Posts panel looks like without waiting for fresh content.
// Idempotent: re-running replaces the previous demo. Demo post is tagged
// linkedin_post_id = 'DEMO_LIVE_POST'.
router.post('/demo-seed', async (_req: Request, res: Response) => {
  try {
    const creatorQ = await pool.query(
      `SELECT id, name FROM creators WHERE is_managed = TRUE ORDER BY created_at LIMIT 1`
    );
    if (creatorQ.rows.length === 0) {
      return res.status(400).json({ error: 'Need at least one managed creator first' });
    }
    const creator = creatorQ.rows[0];

    // Clean up any previous demo (CASCADE drops snapshots)
    await pool.query(`DELETE FROM posts WHERE linkedin_post_id = 'DEMO_LIVE_POST'`);

    // Publish 4 days ago so the panel shows the full lifecycle across phases
    const publishedAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const finalImpressions = 42000;
    const finalLikes = 980;
    const finalComments = 72;
    const finalReposts = 45;
    const engagement = finalLikes + finalComments * 2 + finalReposts * 3;

    const postInsert = await pool.query(
      `INSERT INTO posts (
         creator_id, linkedin_post_id, content_text, content_type, published_at,
         likes_count, comments_count, reposts_count, impressions_count,
         engagement_score, outlier_ratio, is_outlier, hook_text, language
       ) VALUES ($1, 'DEMO_LIVE_POST', $2, 'text', $3, $4, $5, $6, $7, $8, $9, TRUE, $10, 'es')
       RETURNING id`,
      [
        creator.id,
        'DEMO · Nadie habla del pueblo de 7.000 habitantes que exporta más que países enteros. En 60 segundos te explico por qué 👇',
        publishedAt,
        finalLikes, finalComments, finalReposts, finalImpressions,
        engagement,
        2.3,
        'DEMO · Nadie habla del pueblo de 7.000 habitantes que exporta más que países enteros.',
      ]
    );
    const postId = postInsert.rows[0].id;

    // S-curve: dense in golden hour, steep in first wave, flattening through long tail
    // Fractions chosen to match the LinkedIn distribution curve (~10% at 1h, ~40% at 6h,
    // ~70% at 24h, ~85–90% at 72h, ~98% at 7d).
    const curve: [number, number][] = [
      [10, 0.015], [25, 0.035], [40, 0.060], [55, 0.090],  // golden hour (4 snaps)
      [85, 0.14], [115, 0.19], [145, 0.24], [180, 0.29],
      [215, 0.33], [250, 0.37], [290, 0.40], [330, 0.43],
      [360, 0.45],                                          // 1–6h (9 snaps)
      [480, 0.52], [600, 0.57], [720, 0.61], [900, 0.66],
      [1080, 0.70], [1260, 0.73], [1440, 0.76],             // 6–24h (7 snaps)
      [1800, 0.80], [2160, 0.83], [2880, 0.87], [3600, 0.90],
      [4320, 0.92],                                          // 24–72h (5 snaps)
      [5760, 0.96],                                          // 4d
    ];

    for (const [mins, frac] of curve) {
      const capturedAt = new Date(publishedAt.getTime() + mins * 60 * 1000);
      await pool.query(
        `INSERT INTO post_snapshots (post_id, captured_at, impressions_count, likes_count, comments_count, reposts_count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          postId,
          capturedAt,
          Math.round(finalImpressions * frac),
          Math.round(finalLikes * frac),
          Math.round(finalComments * frac),
          Math.round(finalReposts * frac),
        ]
      );
    }

    res.json({ post_id: postId, snapshots: curve.length });
  } catch (err: any) {
    console.error('[accounts/demo-seed]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/accounts/demo-seed — remove the demo post
router.delete('/demo-seed', async (_req: Request, res: Response) => {
  try {
    const r = await pool.query(`DELETE FROM posts WHERE linkedin_post_id = 'DEMO_LIVE_POST'`);
    res.json({ deleted: r.rowCount || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/posts/:id/snapshots — time-series for a single post's
// impressions/engagement growth during its first 7 days, plus the creator's
// "typical" band (p25–p75 across their other posts at the same age).
//
// The typical curve lets the UI overlay a YouTube-Studio-style gray band so
// the user can tell at a glance whether a specific post is over- or under-
// performing relative to the account's baseline at any given age.
router.get('/posts/:id/snapshots', async (req: Request, res: Response) => {
  try {
    const postQ = await pool.query(
      `SELECT p.id, p.creator_id, p.content_text, p.hook_text, p.published_at,
              p.likes_count, p.comments_count, p.reposts_count, p.impressions_count,
              p.profile_viewers_count, p.followers_gained_count,
              p.saves_count, p.sends_count, p.link_clicks_count, p.premium_button_clicks, p.link_url, p.pillar,
              p.post_url, c.name AS creator_name, c.profile_image_url AS creator_image
       FROM posts p JOIN creators c ON c.id = p.creator_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (postQ.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    const snapsQ = await pool.query(
      `SELECT captured_at, impressions_count, likes_count, comments_count, reposts_count
       FROM post_snapshots
       WHERE post_id = $1
       ORDER BY captured_at ASC`,
      [req.params.id]
    );

    // Typical curve: for each age bucket, compute p25/p50/p75 of impressions
    // and engagement across the creator's *other* posts at the same age.
    // Buckets mirror the monitor cadence (15m in golden hour, then 30m, 2h,
    // 6h, 24h) so we don't over-resolve the band where captures are sparse.
    // HAVING sample_count >= 2 — kept as low as PERCENTILE_CONT can produce
    // meaningful values. We had this at 3 before, which silently nuked the
    // typical band for any creator with a small monitored-post pool (e.g.
    // newer managed accounts where most age buckets only had 1–2 samples).
    // Two samples give a min–max range that's still informative; below that
    // the band would just be a flat line so we drop those buckets.
    const typicalQ = await pool.query(
      `WITH target AS (
         SELECT creator_id FROM posts WHERE id = $1
       ),
       other_posts AS (
         SELECT p.id, p.published_at
         FROM posts p, target t
         WHERE p.creator_id = t.creator_id
           AND p.id <> $1
           AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
           AND p.published_at IS NOT NULL
       ),
       other_snapshots AS (
         SELECT
           op.id AS post_id,
           EXTRACT(EPOCH FROM (s.captured_at - op.published_at)) / 60.0 AS age_min,
           COALESCE(s.impressions_count, 0)::int AS impressions,
           (s.likes_count + 2 * s.comments_count + 3 * s.reposts_count)::int AS engagement
         FROM other_posts op
         JOIN post_snapshots s ON s.post_id = op.id
         WHERE s.captured_at >= op.published_at
           AND s.captured_at <= op.published_at + INTERVAL '7 days'
       ),
       bucketed AS (
         SELECT
           -- Label each bucket by its MIDPOINT (not upper bound) so the
           -- typical band plots where the bucket's data "actually sits"
           -- rather than at the end of its age range. A snapshot at age 5m
           -- falls in bucket [0,15) → midpoint 7, so the gray band visually
           -- aligns with the blue snapshot point at x=5 instead of x=15.
           CASE
             WHEN age_min < 60   THEN (FLOOR(age_min / 15) * 15 + 7)::int     -- [0,60)   buckets width 15
             WHEN age_min < 360  THEN (FLOOR(age_min / 30) * 30 + 15)::int    -- [60,360) buckets width 30
             WHEN age_min < 1440 THEN (FLOOR(age_min / 120) * 120 + 60)::int  -- [6h,24h) width 120
             WHEN age_min < 4320 THEN (FLOOR(age_min / 360) * 360 + 180)::int -- [24h,72h) width 360
             ELSE (FLOOR(age_min / 1440) * 1440 + 720)::int                   -- [72h,…)  width 1440
           END AS bucket_min,
           impressions,
           engagement
         FROM other_snapshots
       )
       SELECT
         bucket_min AS "ageMin",
         COUNT(*)::int AS "sampleCount",
         ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY impressions))::int AS "p25Imp",
         ROUND(PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY impressions))::int AS "p50Imp",
         ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY impressions))::int AS "p75Imp",
         ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY engagement))::int AS "p25Eng",
         ROUND(PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY engagement))::int AS "p50Eng",
         ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY engagement))::int AS "p75Eng"
       FROM bucketed
       GROUP BY bucket_min
       HAVING COUNT(*) >= 2
       ORDER BY bucket_min ASC`,
      [req.params.id]
    );

    res.json({
      post: postQ.rows[0],
      snapshots: snapsQ.rows,
      typical: typicalQ.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Google Chat: notify teammates about a just-published post ─────────────
//
// Internal team flow: when one of us posts, we ping the group chat so
// colleagues can quickly drop a supportive comment from their own profile.
// Past iteration generated 9 different angles (some contrarian) — teammates
// found the message too long and shied away from the edgier takes, so the
// engagement on managed-account posts dropped. This trimmed flow ships only
// reinforce + warm_supportive lines, 3-5 of them (varied daily to avoid
// fatigue), all in the post's language.

// GET /api/accounts/posts/:postId/google-chat-preview
// Returns owner detection (just for the message header label) + post info +
// 3-5 supportive comments. There is NO voice/profile selection: this button
// exists only to feed our internal support network with safe, warm
// copy-paste comments — it never speaks "as Iker" or "as Unai". Dropping
// the profile lookup also makes it load noticeably faster.
router.get('/posts/:postId/google-chat-preview', async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId;

    const { rows } = await pool.query(
      `SELECT p.id, p.content_text, p.post_url, p.hook_text, p.pillar,
              c.name AS creator_name, c.headline AS creator_headline
       FROM posts p
       JOIN creators c ON c.id = p.creator_id
       WHERE p.id = $1`,
      [postId]
    );
    const post = rows[0];
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Randomise the count between 3 and 5 so daily messages don't feel like
    // a template. Variety reduces fatigue on the receiving side without
    // changing the underlying intent.
    // FIJO en 5 (Iker, 2026-07-29). Antes se sorteaba 3-5 para que el mensaje
    // diario no repitiera forma, pero el equipo ha crecido: ahora hay gente de
    // sobra para 5 comentarios y sortear solo dejaba a compañeros sin línea que
    // pegar. La variedad la da el propio texto, no la cantidad.
    const targetCount = 5;
    const rawComments = await generateSupportiveComments(
      {
        postContent: post.content_text || '',
        creatorName: post.creator_name,
        creatorHeadline: post.creator_headline || null,
        // Neutral voice on purpose — these are network-support comments any
        // teammate can paste, not a specific person's voice.
        profile: {
          headline: null,
          voice_style: null,
          worldview: null,
          signature_moves: null,
          avoid: null,
        },
      },
      targetCount
    );

    // Defensive cap per comment: prompt asks for ≤ 180 chars but models
    // overshoot occasionally. 200 chars × 5 comments + header stays well
    // under Google Chat's 4096-char per-message ceiling, so the FE never
    // has to split a single-message-per-post send into chunks.
    const PER_COMMENT_CAP = 200;
    const truncate = (s: string) => {
      const t = (s || '').trim();
      if (t.length <= PER_COMMENT_CAP) return t;
      const slice = t.slice(0, PER_COMMENT_CAP - 1);
      const lastBreak = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! '), slice.lastIndexOf('\n'));
      const cutAt = lastBreak > PER_COMMENT_CAP * 0.6 ? lastBreak + 1 : slice.lastIndexOf(' ');
      return (cutAt > PER_COMMENT_CAP * 0.5 ? t.slice(0, cutAt) : slice).trimEnd() + '…';
    };
    const comments = rawComments.map(truncate);

    res.json({
      post: {
        id: post.id,
        url: post.post_url,
        hook: post.hook_text,
        content: post.content_text,
        creator_name: post.creator_name,
        // El pilar viaja al modal para que la cabecera del mensaje de Chat
        // diga "NUEVO MEMEEE" o "NUEVO LEAD MAGNET" en vez del genérico
        // "NUEVO POST", que es lo que Iker venía corrigiendo a mano cada día.
        pillar: post.pillar || null,
      },
      comments,
      webhook_configured: !!process.env.GOOGLE_CHAT_WEBHOOK_URL,
    });
  } catch (err: any) {
    console.error('[google-chat-preview] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/posts/:postId/send-to-google-chat
// Body: { message: string } OR { messages: string[] } — already-composed text.
// Array form lets the frontend split a long message into several sequential
// chat messages when the total exceeds Google Chat's 4096-char per-message
// limit (we enforce 3800 to keep a safety margin).
router.post('/posts/:postId/send-to-google-chat', async (req: Request, res: Response) => {
  try {
    const webhook = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    if (!webhook) {
      return res.status(400).json({ error: 'GOOGLE_CHAT_WEBHOOK_URL no está configurado en el backend.' });
    }

    // Normalise to an array so the rest of the handler is uniform.
    const body = req.body || {};
    let messages: string[];
    if (Array.isArray(body.messages)) {
      messages = body.messages.map((m: unknown) => (typeof m === 'string' ? m.trim() : '')).filter(Boolean);
    } else if (typeof body.message === 'string') {
      messages = [body.message.trim()].filter(Boolean);
    } else {
      messages = [];
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: 'message is required' });
    }
    if (messages.length > 5) {
      return res.status(400).json({ error: 'no se permiten más de 5 mensajes en una tanda' });
    }
    for (const m of messages) {
      if (m.length > 3800) {
        return res.status(400).json({ error: `un mensaje supera 3800 chars (${m.length}). Edita o usa el split.` });
      }
    }

    // Send sequentially. If one fails midway, return what succeeded so the
    // user knows partial state rather than a generic 500.
    let sent = 0;
    for (const m of messages) {
      await sendToGoogleChat(webhook, m);
      sent++;
    }

    res.json({ ok: true, sent, total: messages.length });
  } catch (err: any) {
    console.error('[send-to-google-chat] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────── Replies sub-tab ─────────────────────────────
//
// Lets the user pick one of their managed-account posts and reply (in their
// own voice — Iker as Iker, Unai as Unai) to comments they haven't answered
// yet. Three endpoints:
//   GET  /posts/:postId/comments                 → list comments + grouped replies + unanswered flag
//   POST /posts/:postId/comments/:cid/generate   → AI draft reply in author's voice
//   POST /posts/:postId/comments/:cid/reply      → send the reply via Unipile
//
// Comments are NOT cached — every GET hits Unipile live. If volume becomes a
// problem we can add a creator_post_comments table; until then, freshness >
// caching complexity.


// Group a flat Unipile comment list into top-level + replies, mark threads
// where the post author already replied so the UI can collapse those.
interface ThreadedComment {
  id: string;
  text: string;
  date: string | null;
  author: {
    name: string | null;
    headline: string | null;
    profile_picture_url: string | null;
    public_identifier: string | null;
    // LinkedIn member provider_id (ACoXXX form). Used as the profile_id
    // when building an @-mention in the reply — Unipile's mentions array
    // expects this exact form. Sourced from comment.author.id; may be null
    // for anonymised or company actors.
    profile_id: string | null;
    // True when the commenter is a COMPANY page (not a personal profile).
    // Companies aren't mentionable via the @-mention template, so the
    // reply is sent without a mention for them.
    is_company?: boolean;
    // How far this commenter is from the account that owns the post:
    // 1 / 2 / 3 (degrees), or null when LinkedIn doesn't say. Comes free
    // in author_details.network_distance — no extra call per commenter.
    // The Lead Magnet tab needs it because LinkedIn only delivers a plain
    // DM to a 1st-degree connection; anyone else gets an invitation with
    // a note instead.
    network_distance?: number | null;
  };
  replies: ThreadedComment[];
  // True iff at least one reply in this thread is from the post author
  // (matched by public_identifier === creator.linkedin_id). Set on top-level
  // comments only — nested replies are siblings of each other inside the
  // same thread.
  answered_by_author?: boolean;
  // Las respuestas del hilo que han entrado DESPUÉS de nuestra última
  // intervención y no son nuestras. Vacío cuando el hilo está al día o cuando
  // todavía no hemos entrado en él. Es lo que la UI resalta para que se vea
  // qué hay que contestar sin releer el hilo entero.
  pending_followups?: ThreadedComment[];
  // The reaction WE'VE placed on this comment (like / celebrate / support /
  // love / insightful / funny), or null if none. Sourced from the
  // comment_reactions table (what we sent from the app) so it survives
  // reloads and the UI can show + lock the reaction state.
  my_reaction?: string | null;
  // True when the comment has NO text body — a GIF / sticker / image-only
  // comment. Unipile does NOT expose the media URL for these (confirmed
  // 2026-07: same keys as any comment, just `text: ""` and no attachment
  // field), so all we can do is flag it. The UI shows a "🎞️ GIF / imagen"
  // placeholder instead of an empty line, and the reply generator answers
  // with a single support emoji (there's no text to engage with).
  is_media_only?: boolean;
}

// LinkedIn expresses the viewer↔profile distance as an enum, which Unipile
// passes through verbatim: "DISTANCE_1" / "DISTANCE_2" / "DISTANCE_3" /
// "OUT_OF_NETWORK" / "SELF". We collapse it to the number the UI shows.
// OUT_OF_NETWORK is 3+ for our purposes (everything past 2nd degree is
// equally un-DM-able), and anything unrecognised → null = "we don't know",
// which the UI treats as "not safe to DM".
function parseNetworkDistance(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toUpperCase();
  if (v === 'SELF' || v === 'DISTANCE_0') return 0;
  const m = v.match(/^DISTANCE_([123])$/);
  if (m) return Number(m[1]);
  if (v === 'OUT_OF_NETWORK') return 3;
  return null;
}

function shapeComment(c: any): ThreadedComment {
  // Unipile's LinkedIn comment schema (confirmed against a live response,
  // 2026-06):
  //   c.author          → STRING display name (e.g. "Mario Carrillo")
  //   c.author_details  → { id, headline, profile_url, profile_picture_url,
  //                         is_company, network_distance }
  //   c.text, c.date    → body and ISO timestamp
  //   c.post_id, c.post_urn
  //   c.reply_counter, c.reaction_counter
  // Replies are returned in the same flat list with a parent_comment_id
  // pointing at their top-level. We still keep the older nested-author
  // and flat-name fallbacks below so older / company-actor payloads
  // don't regress to "Anónimo".
  const details: any = c.author_details || {};

  // Some payloads still nest the author block — fall back to it for older
  // surfaces or replies that haven't converged on the new shape.
  const sub: any =
    (typeof c.author === 'object' && c.author) ||
    c.actor ||
    c.commenter ||
    c.from ||
    c.user ||
    c.member ||
    c.poster ||
    c.profile ||
    c.entity ||
    c.attributes?.actor ||
    c.attributes?.commenter ||
    {};

  const fullName =
    (typeof c.author === 'string' && c.author.trim()) ||
    details.name ||
    details.full_name ||
    sub.name ||
    sub.full_name ||
    sub.display_name ||
    [sub.first_name, sub.last_name].filter(Boolean).join(' ').trim() ||
    c.actor_name ||
    c.commenter_name ||
    c.author_name ||
    null;

  const picture =
    details.profile_picture_url ||
    details.profile_image_url ||
    details.picture_url ||
    sub.profile_picture_url ||
    sub.profile_image_url ||
    sub.picture_url ||
    sub.image_url ||
    sub.avatar_url ||
    c.profile_picture_url ||
    null;

  const headline =
    details.headline ||
    details.occupation ||
    sub.headline ||
    sub.occupation ||
    sub.title ||
    sub.subtitle ||
    null;

  // Provider id from author_details.id (confirmed ACoXXX form, no prefix).
  // Falls through to legacy nested/flat shapes. The .replace strips
  // urn:li:<type>: prefixes so the value matches creator.linkedin_id
  // (stored bare) for the answered-by-author comparison downstream.
  const rawProfileId = String(
    details.id ||
      details.provider_id ||
      details.member_id ||
      sub.id ||
      sub.provider_id ||
      sub.profile_id ||
      sub.member_id ||
      sub.urn ||
      c.author_id ||
      c.profile_id ||
      ''
  );
  const profileId = rawProfileId
    ? rawProfileId.replace(/^urn:li:[a-z_]+:/, '')
    : null;

  // Public identifier — derive from profile_url's /in/<slug> path when the
  // payload only ships the URL (the confirmed shape does), otherwise fall
  // back to nested public_identifier / username / handle.
  let publicIdentifier: string | null = sub.public_identifier || sub.username || sub.handle || sub.slug || null;
  if (!publicIdentifier && typeof details.profile_url === 'string') {
    const m = details.profile_url.match(/linkedin\.com\/in\/([^/?#]+)/);
    if (m) publicIdentifier = m[1];
  }

  const text = String(c.text || c.body || c.content || c.message || '');

  return {
    id: String(c.id || c.social_id || c.comment_id_str || ''),
    text,
    date:
      c.date ||
      c.created_at ||
      c.parsed_datetime ||
      c.posted_at ||
      c.timestamp ||
      c.createdAt ||
      null,
    author: {
      name: fullName,
      headline,
      profile_picture_url: picture,
      public_identifier: publicIdentifier,
      profile_id: profileId,
      // Company pages aren't mentionable the way personal profiles are
      // (Unipile 422s on the @-mention template), so the frontend skips
      // the mention when this is true. Sourced from author_details.is_company.
      is_company: details.is_company === true || sub.is_company === true,
      network_distance: parseNetworkDistance(details.network_distance ?? sub.network_distance),
    },
    replies: [],
    // The viewer's own reaction on this comment, straight from Unipile's
    // `user_reacted` field (absent when we haven't reacted). This is the
    // LinkedIn ground truth — it reflects reactions made on LinkedIn
    // directly, not just ones we sent via the app. Normalised to our
    // lowercase type. The DB-sourced value is only used as a fallback.
    my_reaction: normalizeReactionValue(c.user_reacted),
    // GIF / sticker / image-only comment: Unipile gives us an empty text and
    // no media field, so we can only flag it (the UI shows a placeholder and
    // the reply becomes a support emoji).
    is_media_only: !text.trim(),
  };
}

// Core comment-threading for ONE post: fetch raw comments from Unipile,
// group into top-level threads + replies, fetch nested replies, mark
// answered_by_author, and return the threads. Extracted so both the
// single-post endpoint AND the cross-post "pending" aggregator reuse the
// exact same logic. `post` must carry linkedin_post_id, unipile_account_id
// and creator_linkedin_id.
async function buildThreadsForPost(post: any): Promise<{ threads: ThreadedComment[]; rawSample: any }> {
  const raw = await unipileService.getPostComments(post.linkedin_post_id, post.unipile_account_id);

  // Two-pass grouping: collect top-levels first, then attach inline
  // replies by parent_comment_id (safety net; Unipile currently returns
  // top-level only on the first call).
  const byId = new Map<string, ThreadedComment>();
  const topLevel: ThreadedComment[] = [];
  const rawById = new Map<string, any>();
  for (const c of raw) {
    const id = String(c.id || c.social_id || '');
    if (!id) continue;
    rawById.set(id, c);
    const parentId = c.parent_comment_id || c.comment_id || null;
    if (!parentId) {
      const t = shapeComment(c);
      byId.set(id, t);
      topLevel.push(t);
    }
  }
  for (const c of raw) {
    const parentId = c.parent_comment_id || c.comment_id || null;
    if (!parentId) continue;
    const parent = byId.get(String(parentId));
    if (parent) parent.replies.push(shapeComment(c));
  }

  // Fetch nested replies for threads with reply_counter > 0 (Unipile
  // needs a per-parent follow-up). Parallel, concurrency-capped.
  const CONCURRENCY = 6;
  const queue = topLevel.filter((t) => {
    const r = rawById.get(t.id);
    return r && Number(r.reply_counter) > 0 && t.replies.length === 0;
  });
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (t) => {
        try {
          const replyRaw = await unipileService.getPostComments(
            post.linkedin_post_id,
            post.unipile_account_id,
            { parentCommentId: t.id }
          );
          t.replies = replyRaw.map(shapeComment);
        } catch (err: any) {
          console.warn(`[comments] reply fetch failed for ${t.id}:`, err?.message);
        }
      })
    );
  }

  const tsOf = (d: string | null) => (d ? new Date(d).getTime() : 0);
  for (const t of topLevel) t.replies.sort((a, b) => tsOf(a.date) - tsOf(b.date));
  topLevel.sort((a, b) => tsOf(b.date) - tsOf(a.date));

  const authorLinkedInId: string | null = post.creator_linkedin_id
    ? String(post.creator_linkedin_id).replace(/^urn:li:[a-z_]+:/, '')
    : null;
  // ⛔ "CONTESTADO" ES CONTESTADO LO ÚLTIMO, NO CONTESTADO ALGUNA VEZ
  // (Iker, 2026-08-11).
  //
  // Antes bastaba con que EXISTIERA una respuesta nuestra en el hilo para
  // darlo por cerrado para siempre. Pero un hilo sigue vivo después de que
  // contestemos: en el lead magnet del 11/08, Iker respondió a Mario, y
  // después entraron Vicente Garcés pidiendo el recurso y Mario otra vez. La
  // herramienta ya no los enseñaba, así que un lead que pedía el recurso EN
  // VOZ ALTA se quedaba sin contestar y sin que nadie lo viera.
  //
  // Ahora se compara con la FECHA: un hilo vuelve a estar pendiente si alguien
  // que no somos nosotros ha escrito DESPUÉS de nuestra última intervención.
  // Y los mensajes nuevos van aparte en `pending_followups`, para que la UI
  // pueda enseñar exactamente cuáles hay que responder en vez de repintar el
  // hilo entero como si no lo hubiéramos tocado.
  const nuestraUltimaHora = (t: ThreadedComment): number | null => {
    const mias = [
      ...(t.author.profile_id === authorLinkedInId ? [t.date] : []),
      ...t.replies.filter((r) => r.author.profile_id === authorLinkedInId).map((r) => r.date),
    ].map(tsOf);
    return mias.length ? Math.max(...mias) : null;
  };
  for (const t of topLevel) {
    if (!authorLinkedInId) {
      t.answered_by_author = false;
      t.pending_followups = [];
      continue;
    }
    const mia = nuestraUltimaHora(t);
    if (mia === null) {
      // Nunca hemos ESCRITO en el hilo, así que no hay follow-ups que separar:
      // el pendiente es el comentario de arriba entero.
      //
      // Pero sí puede estar atendido con una REACCIÓN, y eso cuenta igual que
      // en el resto del flujo: la cola aquí es la última respuesta si la hay, y
      // si no el propio comentario de arriba. Sin esto, reaccionar a un
      // comentario sin contestarlo lo dejaba en la bandeja para siempre.
      const colaSinNosotros = t.replies.length ? t.replies[t.replies.length - 1] : t;
      t.answered_by_author = !!colaSinNosotros.my_reaction;
      t.pending_followups = [];
      continue;
    }
    // Una fecha ausente vale 0, así que nunca cuenta como posterior: mejor no
    // resucitar un hilo por un dato que falta que inundar la bandeja.
    //
    // ⛔ Y UNA REACCIÓN NUESTRA YA CUENTA COMO ATENDERLO (Iker, 2026-08-11).
    //
    // Al empezar a mostrar los follow-ups, la bandeja se llenó: cada hilo vivo
    // de cada post reciente vuelve a entrar. Pero a muchos de esos mensajes la
    // respuesta correcta ES un 👍 — no todo merece texto. Si reaccionar no los
    // sacaba de la lista, la única forma de vaciarla era contestar a todo.
    //
    // `my_reaction` viene de `user_reacted` de Unipile, o sea de LinkedIn: vale
    // igual si la reacción se puso desde la app o desde el móvil.
    //
    // ⏱️ El efecto es DIFERIDO a propósito, que es justo como lo pidió: esto se
    // calcula al pedir los comentarios, así que el que acabas de reaccionar
    // sigue en pantalla hasta que recargas. Si desapareciera al instante, la
    // tarjeta se esfumaría bajo el cursor y no podrías rectificar.
    t.pending_followups = t.replies.filter(
      (r) => r.author.profile_id !== authorLinkedInId && tsOf(r.date) > mia && !r.my_reaction
    );

    // ⛔ LO QUE CIERRA UN HILO ES SU COLA, NO QUE NO QUEDE NADA SUELTO EN MEDIO
    // (Iker, 2026-08-12).
    //
    // Antes bastaba UN mensaje sin atender en cualquier punto para que el hilo
    // volviera. Y hay un caso en el que eso es justo lo contrario de lo que
    // quieres: el hilo del tatuaje, donde a un comentario hostil de en medio se
    // decidió NO contestar, y al de abajo se le puso una reacción. Con la regla
    // vieja ese hilo reaparecía para siempre por el de en medio.
    //
    // Iker: *"si entre medias hay un comentario sin responder ni interactuar es
    // por algo. Dudo que se me haya olvidado"*. Un hilo es una conversación: si
    // la ÚLTIMA intervención está atendida —es nuestra, o le hemos puesto una
    // reacción— la conversación está cerrada, decidas lo que decidas del medio.
    // Y si entra alguien nuevo, la cola cambia y el hilo vuelve solo, que es
    // exactamente lo que se quiere.
    //
    // La cola es la última respuesta; si el hilo no tiene ninguna, es el propio
    // comentario de arriba.
    const cola = t.replies.length ? t.replies[t.replies.length - 1] : t;
    t.answered_by_author = cola.author.profile_id === authorLinkedInId || !!cola.my_reaction;
  }

  return { threads: topLevel, rawSample: raw[0] };
}

router.get('/posts/:postId/comments', async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const postQ = await pool.query(
      `SELECT p.id, p.linkedin_post_id, p.content_text, p.creator_id,
              c.name AS creator_name, c.linkedin_id AS creator_linkedin_id,
              c.unipile_account_id
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE p.id = $1`,
      [postId]
    );
    if (postQ.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    const post = postQ.rows[0];
    if (!post.linkedin_post_id) return res.status(400).json({ error: 'Post has no LinkedIn id' });
    if (!post.unipile_account_id) return res.status(400).json({ error: 'Creator has no Unipile account_id' });

    const { threads: topLevel, rawSample } = await buildThreadsForPost(post);

    const noNamesParsed = topLevel.length > 0 && topLevel.every((t) => !t.author.name);
    const response: any = {
      post: {
        id: post.id,
        content_text: post.content_text,
        creator_name: post.creator_name,
      },
      threads: topLevel,
      total_threads: topLevel.length,
      unanswered_threads: topLevel.filter((t) => !t.answered_by_author).length,
    };
    if (rawSample && (req.query.debug === '1' || noNamesParsed)) {
      response._debug_sample = rawSample;
    }
    res.json(response);
  } catch (err: any) {
    console.error('[accounts/comments]', err);
    res.status(500).json({ error: err.message });
  }
});

// ⛔⛔ GEMELO DE `cerradoSinPedirlo` DEL PANEL (Iker, 2026-08-25).
//
// ⚠️ ESTA REGLA VIVE EN DOS SITIOS y tienen que decir LO MISMO: aqui, que pinta
// la chapa «N para actuar» de la fila plegada, y `cerradoSinPedirlo` en
// `frontend/src/components/accounts/leadMagnetCopy.ts`, que decide qué tarjetas
// se ven debajo. Si cambias una y no la otra, la chapa dice 1 y debajo no
// aparece nadie — que es exactamente lo que pasó el 21/08 con otra regla de este
// mismo panel. **El porqué de cada condición está escrito allí, entero.**
//
// Resumen: alguien que NO pidió el recurso y a quien YA has contestado no es
// trabajo pendiente. El caso que lo motiva es Josu Yuguero, que comentó para
// corregir un dato de plantilla en el post de la lista y se quedó de único
// «1 para actuar» del post porque, siendo de 1er grado, la única salida de esa
// lista era tener una fila de envío.
//
// La palabra sale del TEXTO DEL POST, igual que `extractKeyword` en el panel.
// El panel además puede tener una semilla en localStorage, que aquí no se ve;
// si divergieran, el backend contaría uno de más, que es infinitamente menos
// grave que esconder un lead.
const CTA_KEYWORD_POST = /comenta\w*\s+["“«']([^"”»']{2,30})["”»']/gi;

function palabraDelPost(postText: string | null | undefined): string {
  if (!postText) return '';
  let last = '';
  for (const m of postText.matchAll(CTA_KEYWORD_POST)) last = m[1];
  return last.trim();
}

// Palabra ENTERA y sin tildes, para que "buen listado" no cuente como pedir
// "lista". Los límites van a mano y no con \b porque \b es solo ASCII en JS y
// se rompe con una ñ o un acento.
function comentarioPideLaPalabra(text: string, keyword: string): boolean {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const k = norm(keyword).trim();
  if (!k) return false;
  const t = norm(text || '');
  const esLetra = (c: string | undefined) => !!c && /[a-z0-9]/.test(c);
  let from = 0;
  for (;;) {
    const i = t.indexOf(k, from);
    if (i === -1) return false;
    if (!esLetra(t[i - 1]) && !esLetra(t[i + k.length])) return true;
    from = i + 1;
  }
}

// GET /api/accounts/comments/pending — the unified inbox: every UNANSWERED
// top-level comment across recent posts, grouped by post, for ALL managed
// accounts. The frontend fetches this ONCE and filters by account
// client-side (instant switching, no re-scan). We scan the last month of
// posts per creator (with a floor of the last 10 and a cap of 30 — see the
// window constants below), via ROW_NUMBER per creator, so a client-side
// single-account filter still has full coverage — not just whichever creator
// happened to dominate a global top-N. Each group carries creator_id for that
// filtering. Posts with zero pending omitted.
// (creator_id query param still supported for any server-side caller.)
router.get('/comments/pending', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || null;
    // Ventana de comentarios a revisar por cuenta. Antes eran "las 10 últimas
    // publicaciones" (por número), y se perdían comentarios sin responder en
    // posts de hace 1-2 meses (Iker, 2026-07-22). Ahora es por TIEMPO — el
    // último mes — con dos topes:
    //  · SUELO (MIN_POSTS): siempre al menos las 10 últimas, aunque la cuenta
    //    haya publicado poco en el mes → nunca muestra menos que antes.
    //  · TECHO (MAX_POSTS): nunca más de 30, para no disparar las llamadas a
    //    Unipile (una por post) si una cuenta publica a diario.
    // Contestar comentarios de hace meses no aporta; el mes es el punto dulce.
    const RECENT_DAYS = 30;
    const MIN_POSTS = 10;
    const MAX_POSTS = 30;
    const params: any[] = [];
    let creatorFilter = '';
    if (creatorId && creatorId !== 'all') {
      params.push(creatorId);
      creatorFilter = `AND c.id = $${params.length}`;
    }
    const { rows: posts } = await pool.query(
      `WITH ranked AS (
         SELECT p.id, p.linkedin_post_id, p.content_text, p.hook_text, p.published_at,
                p.content_type, p.post_url, p.creator_id,
                -- pillar + contadores: los pide el workspace del lead magnet, que
                -- desde el 2026-08-20 se monta desde aqui al desplegar un post.
                p.pillar, p.comments_count, p.likes_count,
                c.name AS creator_name, c.linkedin_id AS creator_linkedin_id,
                c.profile_image_url AS creator_image, c.unipile_account_id,
                -- ¿Este post tiene solicitudes pedidas sin resolver? Es lo que le
                -- da derecho a saltarse la ventana de 30 dias: al desaparecer la
                -- pestana Lead Magnet ya no hay donde ir a buscarlo a mano.
                EXISTS (
                  SELECT 1 FROM lead_magnet_sends a
                   WHERE a.post_id = p.id AND a.kind = 'ask' AND a.status = 'sent'
                     AND NOT EXISTS (
                       SELECT 1 FROM lead_magnet_sends d
                        WHERE d.post_id = a.post_id AND d.provider_id = a.provider_id
                          AND d.kind = 'dm' AND d.status = 'sent')
                ) AS tiene_pendiente,
                ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY p.published_at DESC) AS rn
           FROM posts p
           JOIN creators c ON c.id = p.creator_id
          WHERE c.is_managed = TRUE
            AND c.unipile_account_id IS NOT NULL
            AND p.linkedin_post_id IS NOT NULL
            AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
            AND p.published_at IS NOT NULL
            ${creatorFilter}
       )
       SELECT * FROM ranked
        WHERE (published_at >= NOW() - INTERVAL '1 day' * ${RECENT_DAYS}
               OR rn <= ${MIN_POSTS}
               -- Un lead magnet con gente esperando entra AUNQUE sea viejo. El
               -- techo de MAX_POSTS se le sigue aplicando: es lo que impide que
               -- una cuenta con 200 posts dispare 200 llamadas a Unipile.
               OR (pillar = 'lead_magnet' AND tiene_pendiente))
          AND rn <= ${MAX_POSTS}
        ORDER BY published_at DESC`,
      params
    );

    // ⛔ PENDIENTE NO ES LO MISMO QUE DISPONIBLE (Iker, 2026-08-20).
    //
    // La primera version contaba "comentaristas sin recurso" y eso saco un post
    // con "18 sin mandar" en el que, al abrirlo, no habia UNA sola persona a la
    // que pudieras mandarle nada: eran 18 esperando a que ellos dieran el paso.
    // Un contador que no se corresponde con ningun trabajo posible es peor que
    // no tener contador, porque te hace abrir el post para nada.
    //
    // Asi que se cuentan tres cosas distintas:
    //   · accionables → puedes actuar YA: 1er grado o nos mando solicitud (DM), o
    //                   todavia no le hemos pedido el paso (respuesta publica).
    //   · esperando   → ya le pedimos el paso y no lo ha dado. La pelota es suya.
    //   · fallidos    → el DM salio y NO llego. Hay que volver a escribirle.
    // Y el post solo entra en la lista si hay accionables o fallidos.
    const idsLm = posts.filter((p) => p.pillar === 'lead_magnet').map((p) => p.id);
    const dmEnviadoPorPost = new Map<string, Set<string>>();
    const dmFallidoPorPost = new Map<string, Set<string>>();
    const askPorPost = new Map<string, Set<string>>();
    const seguimientoPorPost = new Map<string, Set<string>>();
    if (idsLm.length > 0) {
      const { rows: envios } = await pool.query(
        `SELECT post_id, provider_id, comment_social_id, kind, status, text
           FROM lead_magnet_sends
          WHERE post_id = ANY($1::uuid[])`,
        [idsLm]
      );
      // ⛔ SE INDEXA POR PERSONA **Y** POR COMENTARIO (Iker, 2026-08-21).
      //
      // Indexar solo por provider_id era la causa de que la chapa dijera "10 para
      // actuar" y debajo apareciera UNA tarjeta: LinkedIn devuelve OTRO
      // provider_id cuando la persona pasa a 1er grado, asi que el envio ya hecho
      // no casaba con el autor de hoy y se recontaba como pendiente. El id del
      // COMENTARIO no cambia nunca. El panel ya cruzaba por los dos; este
      // contador no, y por eso decian cosas distintas.
      const meter = (m: Map<string, Set<string>>, post: string, e: any) => {
        const set = m.get(post) ?? new Set<string>();
        if (e.provider_id) set.add(e.provider_id);
        if (e.comment_social_id) set.add(e.comment_social_id);
        m.set(post, set);
      };
      // ⛔ Y UNA INVITACION CON EL ENLACE DENTRO **ES** UNA ENTREGA (Iker,
      // 2026-08-21). `buildInviteNote` metia el recurso en la propia nota, asi que
      // esa gente YA lo tiene y no existe ninguna fila 'dm' suya. Contarlos como
      // pendientes es lo que hacia que un post con 3 invitados que ponen "ya tiene
      // el recurso · nada que enviar" dijera "3 para actuar".
      // Se le pregunta al TEXTO REALMENTE ENVIADO, no al tipo: mismo criterio que
      // `conEnlace` en /lead-magnet/followups.
      const llevaEnlace = (t: string | null) =>
        !!t && /recursos\.neety\.com|lnkd\.in|https?:\/\//i.test(t);
      for (const e of envios) {
        // El inmail cuenta como entregado igual que el DM: los dos son el recurso
        // ya en su buzon, y volver a mandarlo es el mismo mensaje repetido.
        if ((e.kind === 'dm' || e.kind === 'inmail') && e.status === 'sent') {
          meter(dmEnviadoPorPost, e.post_id, e);
        } else if (e.kind === 'dm' && e.status === 'failed') {
          meter(dmFallidoPorPost, e.post_id, e);
        } else if (e.kind === 'ask' && e.status === 'sent') {
          meter(askPorPost, e.post_id, e);
        } else if (e.kind === 'invite' && e.status === 'sent') {
          if (llevaEnlace(e.text)) meter(dmEnviadoPorPost, e.post_id, e);
          // Sin enlace es un SEGUIMIENTO de verdad (el caso `lista`): su recurso
          // sigue sin salir y se manda desde el bloque Seguimientos del post, no
          // desde las tarjetas. Cuenta aparte para que el post no desaparezca.
          else meter(seguimientoPorPost, e.post_id, e);
        }
      }
    }

    // Las invitaciones recibidas, UNA llamada por cuenta y ANTES del barrido:
    // hacen falta para saber a quien se le puede escribir ya. Es la misma lista
    // que luego alimenta el bloque de solicitudes de arriba, asi que se pide una
    // sola vez para las dos cosas.
    const cuentasUnicas = [...new Map(posts.map((p) => [p.creator_id, p])).values()];
    const invitacionesPorCuenta = new Map<string, Set<string>>();
    const avisosPorCuenta = new Map<string, string>();
    await Promise.all(cuentasUnicas.map(async (c) => {
      if (!c.unipile_account_id) return;
      try {
        const recibidas = await unipileService.getReceivedInvitations(c.unipile_account_id);
        invitacionesPorCuenta.set(c.creator_id, new Set(recibidas.map((i) => i.inviter_id)));
      } catch (err: any) {
        // Un fallo aqui NO tumba la pantalla: la cuenta sale con su aviso y los
        // comentarios pendientes se siguen viendo. Quedarse sin panel por no
        // poder leer unas invitaciones seria el peor cambio posible.
        avisosPorCuenta.set(
          c.creator_id,
          `No he podido leer las solicitudes recibidas de ${c.creator_name || 'esta cuenta'} (${err?.message}).`
        );
        console.warn('[comments/pending] invitaciones:', err?.message);
      }
    }));

    // Fetch threads for each post in parallel, small concurrency cap.
    const POST_CONCURRENCY = 6;
    const groups: any[] = [];
    for (let i = 0; i < posts.length; i += POST_CONCURRENCY) {
      const batch = posts.slice(i, i + POST_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (post) => {
          try {
            const { threads } = await buildThreadsForPost(post);
            const pending = threads.filter((t) => !t.answered_by_author);

            // Las tres cuentas del lead magnet. Las paginas de empresa fuera: no
            // se puede mandar un DM a una pagina y su comentario no es un lead.
            const esLm = post.pillar === 'lead_magnet';
            let accionables = 0;
            let esperando_su_paso = 0;
            let fallidos = 0;
            let seguimientos_pendientes = 0;
            if (esLm) {
              const entregado = dmEnviadoPorPost.get(post.id) ?? new Set<string>();
              const fallado = dmFallidoPorPost.get(post.id) ?? new Set<string>();
              const pedido = askPorPost.get(post.id) ?? new Set<string>();
              const enSeguimiento = seguimientoPorPost.get(post.id) ?? new Set<string>();
              const invitaciones = invitacionesPorCuenta.get(post.creator_id) ?? new Set<string>();
              const vistos = new Set<string>();
              // La palabra del post, una vez por post y no por comentario.
              const palabra = palabraDelPost(post.content_text);
              for (const t of threads) {
                const pid = t.author?.profile_id;
                if (!pid || t.author?.is_company || vistos.has(pid)) continue;
                vistos.add(pid);
                // Los conjuntos llevan provider_id Y comment_social_id, asi que se
                // pregunta por los dos: el provider cambia, el comentario no.
                const suyo = (m: Set<string>) => m.has(pid) || m.has(t.id);

                // ⛔ ENTREGADO NO ES LO MISMO QUE TERMINADO (Iker, 2026-08-26).
                // Gemelo del cambio en `accionable` del panel: entregar el recurso
                // y contestar en publico son DOS trabajos, y esto cerraba con el
                // primero. Con el post de /errores/ en vivo, el comentario
                // desaparecia de la herramienta al mandar el DM y ya no se podia
                // responder. La respuesta publica no es opcional: es donde se pide
                // la solicitud al que no es contacto y es el motor del pilar.
                // ⚠️ Si tocas esto, toca tambien `cerradoSinPedirlo` y `accionable`
                // en frontend/src/components/accounts/, que calculan lo mismo.
                if (suyo(entregado) && t.answered_by_author) continue;      // ya lo tiene Y ya le contestamos
                if (suyo(fallado)) { fallidos++; continue; }                // hay que reintentar
                if (suyo(enSeguimiento)) { seguimientos_pendientes++; continue; }
                // ⛔ EL CONTADOR CUENTA LO QUE VAS A VER EN LA LISTA DEL POST
                // (Iker, 2026-08-20). Quien tiene un `ask` no sale en las tarjetas:
                // su entrega la gobierna «Solicitudes pedidas», arriba, que es
                // donde aparece en cuanto manda la solicitud o te agrega.
                if (suyo(pedido)) { esperando_su_paso++; continue; }

                // ⛔ Y SI YA LE CONTESTASTE Y NO PUEDES ESCRIBIRLE, NO QUEDA NADA
                // QUE HACER (Iker, 2026-08-21). A un 3er grado sin solicitud solo
                // se le puede contestar en publico pidiendole el paso; si el
                // comentario ya esta respondido, esa accion esta hecha y la pelota
                // es suya. Sale como «esperando su paso» aunque no exista fila
                // `ask` —la respuesta pudo salir desde la pestana Comments, desde
                // LinkedIn a mano, o antes de que existiera ese registro—.
                const puedeDm = t.author?.network_distance === 1 || invitaciones.has(pid);
                if (!puedeDm && t.answered_by_author) { esperando_su_paso++; continue; }

                // ⛔ NO PIDIO NADA Y YA ESTA CONTESTADO (Iker, 2026-08-25).
                // Gemelo de `cerradoSinPedirlo` del panel: las tres condiciones
                // van juntas y el porque de cada una esta escrito alli. Ojo con
                // la primera — si el post no lleva palabra (los nuevos la llevan
                // en la FOTO), no se cierra a nadie, porque ahi no hay señal y
                // excluir seria esconder leads en silencio.
                // NO cuenta como `esperando_su_paso`: no esperamos nada de esta
                // persona, es que no hay nada que hacer con ella.
                if (palabra && t.answered_by_author
                    && !comentarioPideLaPalabra(t.text || '', palabra)) continue;

                accionables++;
              }
            }

            // ⛔ UN LEAD MAGNET NO SE MIDE POR COMENTARIOS SIN RESPONDER
            // (Iker, 2026-08-20). Contestar en publico y entregar el recurso por
            // privado son dos trabajos distintos: un lead magnet contestado del
            // todo pero con recursos sin mandar desaparecia de esta lista, y ese
            // es exactamente el lead que se queria dejar de perder.
            //
            // ⛔ PERO `esperando_su_paso` NO DA DERECHO A SALIR. Si lo unico que
            // queda son personas a las que ya les pediste la solicitud y no la
            // han mandado, aqui no hay nada que hacer: sacar el post solo
            // consigue que lo abras para nada (Iker, 2026-08-20).
            if (pending.length === 0 && accionables === 0 && fallidos === 0
                && seguimientos_pendientes === 0) return null;
            return {
              post: {
                id: post.id,
                hook_text: post.hook_text,
                content_text: post.content_text,
                content_type: post.content_type,
                published_at: post.published_at,
                post_url: post.post_url,
                creator_id: post.creator_id,
                creator_name: post.creator_name,
                creator_image: post.creator_image,
                // Los tres que pide el workspace del lead magnet al montarse aqui.
                comments_count: post.comments_count,
                likes_count: post.likes_count,
                pillar: post.pillar,
              },
              pending_threads: pending,
              pending_count: pending.length,
              es_lead_magnet: esLm,
              accionables,
              esperando_su_paso,
              fallidos,
              seguimientos_pendientes,
            };
          } catch (err: any) {
            console.warn(`[comments/pending] post ${post.id} failed:`, err?.message);
            return null;
          }
        })
      );
      for (const r of results) if (r) groups.push(r);
    }

    // Las solicitudes que YA han llegado, por cuenta. Las invitaciones ya se
    // pidieron arriba, ANTES del barrido, asi que aqui no se vuelve a llamar a
    // Unipile: es una consulta a la base contra la lista que ya tenemos.
    //
    // ⛔ AQUI NO SE COMPRUEBA SI ALGUIEN "YA ES CONTACTO". Eso es una llamada a
    // Unipile POR PERSONA (/lead-magnet/check-accepted, tope 40): con 20
    // esperando en tres cuentas serian 60 llamadas cada vez que se abre la
    // pestana. Ese sigue siendo un boton que se pulsa a mano.
    const cuentas = await Promise.all(cuentasUnicas.map(async (c) => {
      const invitadores = invitacionesPorCuenta.get(c.creator_id) ?? new Set<string>();
      let solicitudes_llegadas = 0;
      if (invitadores.size > 0) {
        const { rows } = await pool.query(
          `SELECT DISTINCT s.provider_id
             FROM lead_magnet_sends s
             JOIN posts p ON p.id = s.post_id
            WHERE p.creator_id = $1 AND s.kind = 'ask' AND s.status = 'sent'
              AND NOT EXISTS (
                SELECT 1 FROM lead_magnet_sends d
                 WHERE d.post_id = s.post_id AND d.provider_id = s.provider_id
                   AND d.kind = 'dm' AND d.status = 'sent')`,
          [c.creator_id]
        );
        solicitudes_llegadas = rows.filter((r) => invitadores.has(r.provider_id)).length;
      }
      return {
        creator_id: c.creator_id,
        creator_name: c.creator_name,
        solicitudes_llegadas,
        aviso: avisosPorCuenta.get(c.creator_id) ?? null,
      };
    }));

    res.json({
      groups,
      cuentas,
      total_pending: groups.reduce((n, g) => n + g.pending_count, 0),
      posts_scanned: posts.length,
    });
  } catch (err: any) {
    console.error('[accounts/comments/pending]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/rastro/generate — el lead magnet público "rastro".
// Genera el análisis de SU sector, lo guarda, crea su página y devuelve el
// comentario listo para pegar (con el enlace ya dentro).
router.post('/rastro/generate', async (req: Request, res: Response) => {
  try {
    const { post_id, comment_text, commenter_name, commenter_headline, commenter_profile_id } = req.body ?? {};
    if (!comment_text || !String(comment_text).trim()) {
      return res.status(400).json({ error: 'Falta el comentario' });
    }
    // PostModel no tiene findById: solo hacen falta 2 campos, así que se piden.
    const { rows } = post_id
      ? await pool.query(
          `SELECT p.content_text, c.name AS creator_name
             FROM posts p JOIN creators c ON c.id = p.creator_id
            WHERE p.id = $1`,
          [String(post_id)]
        )
      : { rows: [] as any[] };
    const post = rows[0] ?? null;
    const out = await generarRastro({
      postId: post_id ? String(post_id) : null,
      commentText: String(comment_text),
      commenterName: commenter_name ? String(commenter_name) : null,
      commenterHeadline: commenter_headline ? String(commenter_headline) : null,
      commenterProfileId: commenter_profile_id ? String(commenter_profile_id) : null,
      postContent: post?.content_text || '',
      authorName: post?.creator_name || 'Neety',
    });
    res.json(out);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/accounts/roaster/analyze — analiza un perfil con el roaster y
// devuelve el análisis + la URL pública para pegar en el comentario.
//
// Existe para el lead magnet PÚBLICO: el valor va en el comentario y el enlace
// lleva al análisis entero. Sin esto habría que abrir el roaster a mano, pegar
// la URL, esperar, copiar el resultado y copiar el enlace, uno por uno y por
// cada persona que comenta. Con 483 comentarios eso no lo hace nadie.
router.post('/roaster/analyze', async (req: Request, res: Response) => {
  try {
    const { url, note, style } = req.body ?? {};
    if (!url || !String(url).trim()) {
      return res.status(400).json({ error: 'Falta la URL del perfil' });
    }
    const out = await roastProfile({
      url: String(url).trim(),
      note: note ? String(note).trim() : undefined,
      style: style ? String(style).trim() : undefined,
    });
    res.json(out);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/posts/:postId/comments/:commentId/generate', async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const commentId = req.params.commentId as string;
    const {
      comment_text, commenter_name, commenter_headline, commenter_profile_id,
      // Set only by the Lead Magnet tab: the resource's topic. Its presence
      // is what tells the generator to also confirm the DM is on its way.
      lead_magnet_topic,
      // Y esto le da la vuelta al cierre: la persona no es contacto y no nos ha
      // mandado solicitud, así que no hay envío que prometer. La respuesta pide
      // el paso en vez de confirmar nada.
      pedir_solicitud,
      // Lo que se dijo antes en el hilo ([{autor, texto}], de viejo a nuevo).
      hilo,
    } = req.body || {};

    // GIF / sticker / image-only comment → no text to engage with. Skip the
    // LLM entirely and reply with a single support emoji (same behaviour as
    // replyGenerator RULE 11 for name-only / emoji-only comments). This also
    // makes "Generar respuesta" work at all for media comments, which used to
    // 400 here because comment_text was empty.
    if (!comment_text || !String(comment_text).trim()) {
      const SUPPORT_EMOJI = ['🙌', '🔥', '💪', '👏', '❤️', '😄'];
      const emoji = SUPPORT_EMOJI[Math.floor(Math.random() * SUPPORT_EMOJI.length)];
      return res.json({
        reply: emoji,
        voice: null,
        comment_id: commentId,
        mention: null,
      });
    }

    const postQ = await pool.query(
      `SELECT p.content_text, c.name AS creator_name
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE p.id = $1`,
      [postId]
    );
    if (postQ.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    const post = postQ.rows[0];

    const profile = await CommenterProfileModel.get();
    if (!profile) {
      return res
        .status(400)
        .json({ error: 'Generic voice profile (Neety) is missing — seed it first' });
    }

    const reply = await generateReply({
      postContent: post.content_text || '',
      commentText: String(comment_text),
      // LA IMAGEN DEL MEME, EN TEXTO (Iker, 2026-09-17). Solo en pilar meme, y
      // se resume una vez por post (`postImageText`): la tanda de 20 respuestas
      // paga unas decenas de tokens cada una, no una foto.
      imageSummary: await getMemeImageSummary(postId),
      hilo: Array.isArray(hilo)
        ? hilo
            .filter((m: any) => m && typeof m.texto === 'string')
            .slice(-6)
            .map((m: any) => ({ autor: m.autor ? String(m.autor) : null, texto: String(m.texto).slice(0, 500) }))
        : [],
      // Para que dos respuestas del MISMO post no abran igual. El generador
      // guarda en memoria las ultimas aperturas por post y se las prohibe a la
      // siguiente (`replyGenerator`, APERTURAS_POR_POST): sin esto cada llamada
      // es independiente y no sabe con que abrio la anterior, que es la causa
      // que este fichero lleva documentada desde el 17/07.
      postId,
      commenterName: commenter_name || null,
      commenterHeadline: commenter_headline || null,
      // The reply is authored by the real post owner (Iker / Unai / Asier),
      // styled with the single generic Neety voice.
      authorName: post.creator_name || 'Neety',
      authorVoice: {
        voice_style: profile.voice_style,
        worldview: profile.worldview,
        signature_moves: profile.signature_moves,
        avoid: profile.avoid,
      },
      // Solo el DM pasa por aquí. El público tiene su propia ruta
      // (/rastro/generate) porque crea además su página.
      leadMagnet: lead_magnet_topic && String(lead_magnet_topic).trim()
        ? {
            kind: 'dm' as const,
            topic: String(lead_magnet_topic).trim(),
            pedirSolicitud: !!pedir_solicitud,
          }
        : undefined,
    });

    // Echo the commenter identity back so the frontend can pass it to /reply
    // unchanged. profile_id is the LinkedIn member provider_id (ACoXXX form)
    // Unipile uses to render an @-mention chip — same value we get back in
    // comment.author.id when we fetched the thread.
    res.json({
      reply,
      voice: profile.name,
      comment_id: commentId,
      mention: commenter_name && commenter_profile_id
        ? { name: String(commenter_name), profile_id: String(commenter_profile_id) }
        : null,
    });
  } catch (err: any) {
    console.error('[accounts/comments/generate]', err);
    res.status(500).json({ error: err.message });
  }
});

// If the reply text starts with the commenter's display name (case-insensitive
// exact prefix match), convert that prefix into a templated mention so
// Unipile renders it as a real LinkedIn @-tag. Returns the (possibly
// rewritten) text and the mentions array to send. We deliberately match
// only at position 0 — the AI is instructed to put the name there, and any
// mid-sentence occurrence the user typed is left alone (probably not a tag
// they intended).
function buildMentionedReply(
  text: string,
  mention: { name: string; profile_id: string } | null
): { text: string; mentions: { name: string; profile_id: string }[] | undefined } {
  if (!mention || !mention.name || !mention.profile_id) {
    return { text, mentions: undefined };
  }
  const name = mention.name;
  const prefix = text.slice(0, name.length);
  if (prefix.toLowerCase() !== name.toLowerCase()) {
    return { text, mentions: undefined };
  }
  const rewritten = `{{0}}${text.slice(name.length)}`;
  return { text: rewritten, mentions: [{ name, profile_id: mention.profile_id }] };
}

router.post('/posts/:postId/comments/:commentId/reply', async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const commentId = req.params.commentId as string;
    const { text, mention } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text required' });
    }

    const postQ = await pool.query(
      `SELECT p.linkedin_post_id, c.unipile_account_id
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE p.id = $1`,
      [postId]
    );
    if (postQ.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    const post = postQ.rows[0];
    if (!post.linkedin_post_id) return res.status(400).json({ error: 'Post has no LinkedIn id' });
    if (!post.unipile_account_id) return res.status(400).json({ error: 'Creator has no Unipile account_id' });

    const { text: finalText, mentions } = buildMentionedReply(
      text.trim(),
      mention && typeof mention === 'object' && mention.name && mention.profile_id
        ? { name: String(mention.name), profile_id: String(mention.profile_id) }
        : null
    );

    let created: any;
    let mentioned = !!mentions;
    try {
      created = await unipileService.replyToComment(
        post.linkedin_post_id,
        commentId,
        finalText,
        mentions,
        post.unipile_account_id
      );
    } catch (err: any) {
      // COMPANY-PAGE commenters (and some other authors) aren't
      // mentionable the way personal profiles are — Unipile 422s on the
      // {{0}} @-mention template ("unable to process the instructions").
      // Retry as a PLAIN-TEXT reply (the name stays as plain text, no
      // @-tag) so the user can still reply to company commenters instead
      // of hitting a dead end. Reactions never had this problem because
      // they carry no mention.
      const is422 = /error 422|unprocessable/i.test(err?.message || '');
      if (is422 && mentions && mentions.length > 0) {
        console.warn('[accounts/comments/reply] 422 with mention — retrying without mention (likely a company / unmentionable author).');
        created = await unipileService.replyToComment(
          post.linkedin_post_id,
          commentId,
          text.trim(), // original text, name as plain text (no {{0}} template)
          undefined,
          post.unipile_account_id
        );
        mentioned = false;
      } else {
        throw err;
      }
    }
    res.json({ ok: true, mentioned, created });
  } catch (err: any) {
    console.error('[accounts/comments/reply]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /posts/:postId/comments/:commentId/react — send a LinkedIn reaction
// (like / celebrate / support / love / insightful / funny) to a specific
// comment on one of our posts, via Unipile. The commentId in the route is
// the comment's LinkedIn social id, which is what Unipile's reaction
// endpoint takes as post_id (LinkedIn addresses posts and comments the
// same way).
router.post('/posts/:postId/comments/:commentId/react', async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const commentId = req.params.commentId as string;
    const reactionType = String(req.body?.reaction_type || '').toLowerCase();
    if (!LINKEDIN_REACTION_TYPES.includes(reactionType as LinkedinReactionType)) {
      return res.status(400).json({
        error: `reaction_type must be one of: ${LINKEDIN_REACTION_TYPES.join(', ')}`,
      });
    }

    const postQ = await pool.query(
      `SELECT p.linkedin_post_id, c.unipile_account_id
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE p.id = $1`,
      [postId]
    );
    if (postQ.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    const post = postQ.rows[0];
    if (!post.linkedin_post_id) return res.status(400).json({ error: 'Post has no LinkedIn id' });
    if (!post.unipile_account_id) return res.status(400).json({ error: 'Creator has no Unipile account_id' });

    // Reacting to a COMMENT: pass the real POST id as post_id and the
    // comment id as comment_id. Previously we sent the comment id AS the
    // post_id with no comment_id — Unipile returned {object:"ReactionAdded"}
    // but the reaction never appeared on LinkedIn (it "added" it in the
    // post namespace against an id that isn't a real post). A LinkedIn
    // comment is addressed as comment(activity:POST_ID, COMMENT_ID), so
    // both ids are required — same shape replyToComment already uses.
    const result = await unipileService.addReaction(
      post.linkedin_post_id,
      reactionType as LinkedinReactionType,
      post.unipile_account_id,
      commentId
    );

    // Record the attempt (audit / future use). NOTE: this is NOT the
    // display source anymore — the Comentarios tab reads the reaction
    // state from Unipile's user_reacted (LinkedIn ground truth), so a
    // recorded-but-never-landed reaction can't falsely lock the bar.
    // Best-effort: a storage hiccup must not fail a reaction.
    try {
      await pool.query(
        `INSERT INTO comment_reactions (comment_social_id, post_id, reaction_type)
         VALUES ($1, $2, $3)
         ON CONFLICT (comment_social_id)
         DO UPDATE SET reaction_type = EXCLUDED.reaction_type, created_at = NOW()`,
        [commentId, postId, reactionType]
      );
    } catch (storeErr: any) {
      console.warn('[accounts/comments/react] reaction stored on LinkedIn but DB persist failed:', storeErr?.message);
    }

    res.json({ ok: true, reaction_type: reactionType, result });
  } catch (err: any) {
    console.error('[accounts/comments/react]', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────── Lead Magnet tab ────────────────────────────
//
// Entregar el recurso a quien comentó en un lead magnet. Todo lo demás que la
// pestaña necesita (la lista de comentarios, las respuestas, las reacciones) es
// LA MISMA maquinaria que usa la pestaña de Comentarios.
//
// ⛔ ESTA HERRAMIENTA YA NO AGREGA A NADIE (Iker, 2026-08-17).
//
// Se retiraron los dos canales en los que empujábamos nosotros:
//
//   · La invitación con nota. Gasta el cupo semanal, y en la cuenta de Unai está
//     prohibida desde el baneo del 14/08 (LinkedIn las aceptaba por API y las
//     tiraba en silencio, ver el bloque v36 de la migración).
//   · El InMail. Gasta créditos de Premium/Sales Navigator, que son pocos.
//
// Las dos escalan mal y ninguna construye red. Quedan tres caminos, y los tres
// son gratis:
//
//   1. Contacto de 1er grado              → DM normal.
//   2. Nos tiene una solicitud pendiente  → mensaje contestando a esa solicitud.
//      Llega igual que un DM y no gasta nada. NO se acepta: aceptar en masa es
//      lo que dispara los límites de LinkedIn.
//   3. Ni una cosa ni la otra             → NADA por privado. Se le responde en
//      público pidiéndole que nos mande ÉL la solicitud, y esa petición se
//      guarda como kind='ask' para poder detectar después que la ha mandado.
//
// Las filas históricas 'invite' e 'inmail' se siguen leyendo (Seguimientos,
// /reverificar). Lo que ya no se hace es crear nuevas.
//
// GET  /api/accounts/lead-magnet/posts?creator_id=  — the post grid
// GET  /api/accounts/lead-magnet/sends?post_id=     — who we already wrote to
// GET  /api/accounts/lead-magnet/canal?creator_id=  — las solicitudes recibidas
// POST /api/accounts/lead-magnet/send               — DM (suelto o a su solicitud)
// POST /api/accounts/lead-magnet/ask                — "le he pedido la solicitud"
// GET  /api/accounts/lead-magnet/pendientes-solicitud?creator_id= — quién ya la mandó
// POST /api/accounts/lead-magnet/reverificar        — releer envíos ya guardados

// GET /api/accounts/lead-magnet/posts?creator_id=xxx&limit=20
//
// The newest posts of ONE managed account, for the grid where the user
// picks which lead magnet they're working through. Deliberately NOT
// filtered to "lead magnet" posts: there's no such flag and guessing from
// the text would misfire, so we show the recent ones and the user picks.
// comments_count comes straight from the posts table (already tracked by
// the monitor) — it's the number that tells them the post is the right one.
router.get('/lead-magnet/posts', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || '';
    if (!creatorId) return res.status(400).json({ error: 'creator_id required' });
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const { rows } = await pool.query(
      `SELECT p.id, p.hook_text, p.content_text, p.content_type, p.published_at,
              p.post_url, p.comments_count, p.likes_count,
              c.name AS creator_name, c.profile_image_url AS creator_image
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE c.id = $1
          AND c.is_managed = TRUE
          AND c.unipile_account_id IS NOT NULL
          AND p.linkedin_post_id IS NOT NULL
          AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
          AND p.published_at IS NOT NULL
        ORDER BY p.published_at DESC
        LIMIT $2`,
      [creatorId, limit]
    );
    res.json({ posts: rows });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/posts]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET/PUT /api/accounts/lead-magnet/config?post_id=xxx
//
// El TIPO de lead magnet (dm/lista/publico) y su recurso, por post. Vivia en el
// localStorage del navegador de Iker hasta el 2026-08-20; se sube a la base
// porque el tipo decide QUE mensaje se genera y perderlo al limpiar el navegador
// significa mandarle a alguien el texto de otro formato.
//
// ⚠️ `link` y `topic` NO se validan contra ningun catalogo, a proposito: son la
// salida manual para cuando la deteccion falla o el recurso es nuevo, y bloquear
// un envio por no reconocer un enlace es exactamente el viernes a la una con el
// post ya subido que ya nos comimos una vez (ver la SALIDA MANUAL del panel).
router.get('/lead-magnet/config', async (req: Request, res: Response) => {
  try {
    const postId = (req.query.post_id as string) || '';
    if (!postId) return res.status(400).json({ error: 'post_id required' });
    const { rows } = await pool.query(
      'SELECT lead_magnet_config FROM posts WHERE id = $1',
      [postId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ config: rows[0].lead_magnet_config ?? null });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/config:get]', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/lead-magnet/config', async (req: Request, res: Response) => {
  try {
    const { post_id, config } = req.body || {};
    if (!post_id || !config) return res.status(400).json({ error: 'post_id and config required' });
    // El tipo SI se acota: es el unico campo que cambia el mensaje que sale, y un
    // valor raro aqui haria que el panel cayera al DM normal sin decir nada.
    const kind = ['dm', 'publico', 'lista'].includes(config.kind) ? config.kind : 'dm';
    const limpio = {
      kind,
      keyword: String(config.keyword || '').slice(0, 120),
      link: String(config.link || '').slice(0, 500),
      topic: String(config.topic || '').slice(0, 300),
    };
    const { rowCount } = await pool.query(
      'UPDATE posts SET lead_magnet_config = $2 WHERE id = $1',
      [post_id, JSON.stringify(limpio)]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ ok: true, config: limpio });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/config:put]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/lead-magnet/sends?post_id=xxx
//
// Everyone we've already sent the resource to on this post, so the UI can
// lock those cards instead of offering to send it a second time. Returns
// failures too — "we tried and LinkedIn refused" is an answer the user
// needs to keep after a reload, not a blank card that invites a retry loop.
router.get('/lead-magnet/sends', async (req: Request, res: Response) => {
  try {
    const postId = (req.query.post_id as string) || '';
    if (!postId) return res.status(400).json({ error: 'post_id required' });
    const { rows } = await pool.query(
      `SELECT comment_social_id, provider_id, kind, status, text, error, verificado, created_at
         FROM lead_magnet_sends
        WHERE post_id = $1
        ORDER BY created_at DESC`,
      [postId]
    );
    res.json({ sends: rows });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/sends]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/lead-magnet/canal?creator_id=xxx
//
// A quién de esta cuenta se le puede escribir gratis porque nos ha mandado ÉL la
// solicitud: `pendientes`, las que nos han llegado y siguen sin aceptar, como
// provider_id → invitation_id. Contestar a una de esas llega igual que un DM y no
// obliga a aceptarla.
//
// Se pide UNA vez por cuenta al abrir el post, no una por tarjeta: la lista de
// invitaciones recibidas es la misma para los 400 comentarios del post.
//
// Un fallo de Unipile devuelve 200 con `pendientes: []` y `aviso`: sin la lista
// el panel sigue funcionando (a esa gente se le pedirá la solicitud, que es lo
// que se hace con todo el que no es contacto), y quedarse sin pantalla sería
// peor que pedirle la solicitud a alguien que ya la había mandado.
router.get('/lead-magnet/canal', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || '';
    if (!creatorId) return res.status(400).json({ error: 'creator_id required' });
    const { rows } = await pool.query(
      `SELECT unipile_account_id FROM creators WHERE id = $1`,
      [creatorId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Creator not found' });
    const accountId = rows[0].unipile_account_id;

    let pendientes: { provider_id: string; invitation_id: string; name: string | null }[] = [];
    let aviso: string | null = null;
    if (accountId) {
      try {
        const recibidas = await unipileService.getReceivedInvitations(accountId);
        pendientes = recibidas.map((i) => ({
          provider_id: i.inviter_id,
          invitation_id: i.invitation_id,
          name: i.inviter_name,
        }));
      } catch (err: any) {
        aviso = `No he podido leer las solicitudes pendientes (${err?.message}). Sin esa lista, a quien nos haya mandado solicitud se le va a pedir otra vez en vez de escribirle.`;
        console.warn('[accounts/lead-magnet/canal] invitaciones recibidas:', err?.message);
      }
    }
    res.json({ pendientes, aviso });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/canal]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/lead-magnet/commenter?creator_id=xxx&provider_id=ACoXXX
//
// One commenter's location, for the region-aware greeting on the DM.
//
// This is a separate, LAZY call on purpose: the comment payload carries the
// name, headline and network_distance but NOT the location, and the only way
// to get it is a profile fetch — one Unipile call per person. Folding that
// into the comment list would mean ~100 calls to open the tab, most of them
// for people the user never writes to. So the panel asks only for the cards
// it actually renders.
//
// Location is best-effort by nature (it's free text the person typed, and
// plenty leave it blank), so a failure returns 200 with location:null and
// the greeting falls back to neutral. It must never block a card.
router.get('/lead-magnet/commenter', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || '';
    const providerId = (req.query.provider_id as string) || '';
    if (!creatorId || !providerId) {
      return res.status(400).json({ error: 'creator_id and provider_id required' });
    }
    const { rows } = await pool.query(
      `SELECT unipile_account_id FROM creators WHERE id = $1`,
      [creatorId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Creator not found' });
    const accountId = rows[0].unipile_account_id;
    if (!accountId) return res.status(400).json({ error: 'Creator has no Unipile account_id' });

    try {
      const profile = await unipileService.getProfile(providerId, accountId);
      res.json({ location: profile.location ?? null, name: profile.name ?? null });
    } catch (err: any) {
      console.warn(`[accounts/lead-magnet/commenter] profile ${providerId} failed:`, err?.message);
      res.json({ location: null, name: null });
    }
  } catch (err: any) {
    console.error('[accounts/lead-magnet/commenter]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/lead-magnet/lista
// Body: { creator_id, sector }
//
// El recurso del lead magnet "lista": 15 empresas reales españolas del sector
// que ha comentado la persona, con zona y su LinkedIn. NO redacta el texto —
// devuelve las empresas estructuradas y el front las formatea en la voz de la
// cuenta (leadMagnetCopy.buildListaDm), igual que el resto del panel.
//
// Todo sale de Unipile y es real. Si el sector no da 15, devuelve las que haya
// (el front dice el número real). Nunca se rellena para llegar a 15.
router.post('/lead-magnet/lista', async (req: Request, res: Response) => {
  try {
    const { creator_id, sector } = req.body || {};
    const sectorClean = String(sector || '').trim();
    if (!creator_id || !sectorClean) {
      return res.status(400).json({ error: 'creator_id and sector required' });
    }

    const { rows } = await pool.query(
      `SELECT unipile_account_id FROM creators WHERE id = $1`,
      [creator_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Creator not found' });
    const accountId = rows[0].unipile_account_id;
    if (!accountId) return res.status(400).json({ error: 'Creator has no Unipile account_id' });

    const companies = await unipileService.searchCompanies(sectorClean, {
      limit: 15,
      accountIdOverride: accountId,
    });
    res.json({ sector: sectorClean, companies });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/lista]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────── el recibo de cada envío ───────────────────────
//
// ⛔ LA RESPUESTA DE UNIPILE NO ES PRUEBA DE NADA (Iker, 2026-08-13).
//
// Ese día la cuenta de Unai tenía un baneo de invitaciones. Unipile devolvía
// 200 a cada nota, la app la guardaba como 'sent', y horas después escribían
// los comentaristas diciendo que no les había llegado nada — mientras la
// herramienta enseñaba "✓ invitación enviada" y el comentario, contestado.
//
// Por eso, después de mandar, se RELEE LinkedIn y se busca lo que acabamos de
// enviar. Tres respuestas posibles, y las tres significan cosas distintas:
//
//   ok: true   → está ahí. Enviado de verdad.
//   ok: false  → hemos podido mirar y NO está. Se guarda como fallido.
//   ok: null   → no hemos podido mirar (la comprobación falló). Se guarda como
//                enviado pero SIN verificar, y el panel lo dice.
//
// Nunca se convierte un null en un true: "no lo sé" pintado de verde es
// exactamente el bug que estamos arreglando.
type Verificacion = { ok: boolean | null; motivo: string | null };

// LinkedIn devuelve el texto tal cual, pero los saltos de línea y los espacios
// viajan mal, así que se compara por huella y no por igualdad.
function huellaTexto(t: string): string {
  return (t || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// ¿Está de verdad en el chat el mensaje (DM o InMail) que acabamos de mandar?
// `chatId` es el que devuelve el envío; cuando no lo hay (envíos guardados
// antes del 2026-08-14) se busca el chat por la persona.
async function verificarMensaje(
  providerId: string,
  accountId: string,
  texto: string,
  chatId: string | null,
  // Cuándo se mandó. Es lo que ACOTA el barrido hacia atrás: sin esto habría que
  // elegir entre mirar poco (el falso negativo del 14/08) o barrer chats
  // enteros. En un envío recién hecho es "ahora"; al repasar uno guardado, su
  // created_at.
  desde: Date | null = null,
  // Los reintentos con espera son para el envío que ACABA de salir: LinkedIn
  // tarda un momento en darlo por bueno y preguntar de inmediato sería
  // inventarse un error. Al repasar envíos viejos (`/reverificar`) no hace
  // falta esperar a nada —llevan horas— y 40 filas × 8 segundos se comerían el
  // timeout de la petición, así que ahí se pasa una sola pasada sin espera.
  esperas: number[] = [1200, 2500, 4000]
): Promise<Verificacion> {
  let ultimo: Verificacion = { ok: null, motivo: 'no he llegado a comprobarlo' };

  for (const espera of esperas) {
    await new Promise((r) => setTimeout(r, espera));

    // TODOS los chats con esa persona, no solo el primero: Asier tenía dos
    // abiertos con Unai el 14/08 y el mensaje puede estar en cualquiera. El del
    // propio envío va primero porque es donde más probable es que esté.
    let chatIds: string[] = [];
    try {
      const chats = await unipileService.getChatsWithAttendee(providerId, accountId, 10);
      chatIds = chats.map((c: any) => c?.id).filter(Boolean);
    } catch (err: any) {
      const msg = err?.message || String(err);
      // "Attendee not found" NO es "no le ha llegado": es lo que pasa siempre
      // con un InMail, cuya bandeja usa otros ids. Se sigue, y si al final no
      // aparece en ninguna parte el veredicto será "no lo sé", no un rojo.
      if (!/404|not found/i.test(msg)) {
        ultimo = { ok: null, motivo: `no he podido comprobarlo: ${msg}` };
        continue;
      }
    }
    if (chatId && !chatIds.includes(chatId)) chatIds.unshift(chatId);

    // LA SEGUNDA BANDEJA. Un InMail puede estar en la de Sales Navigator, que
    // no sale por defecto y donde la persona NO se puede buscar por el
    // provider_id del comentario (usa ids ACwAA). Así que se meten sus chats
    // POSTERIORES al envío y se busca por el texto, que es lo único que casa
    // entre las dos bandejas. Acotado por fecha para no barrer años de InMails.
    //
    // ⚠️ ESTO SE QUEDA AUNQUE YA NO MANDEMOS INMAILS (2026-08-17). Nació para
    // ellos, pero un mensaje colgado de una solicitud pendiente (el canal normal
    // desde hoy) puede aparecer igualmente fuera del chat de siempre, y los
    // InMails viejos se siguen repasando en /reverificar. Quitarlo arriesga
    // marcar como no entregado algo que sí salió, que es el bug del 13/08 con el
    // signo cambiado.
    try {
      const salesNav = await unipileService.getChatsInFolder(
        'INBOX_LINKEDIN_SALES_NAVIGATOR', accountId, 50
      );
      const suelo = desde ? desde.getTime() - 24 * 3600 * 1000 : null;
      for (const c of salesNav) {
        const t = c?.timestamp ? Date.parse(c.timestamp) : NaN;
        if (suelo != null && Number.isFinite(t) && t < suelo) continue;
        if (c?.id && !chatIds.includes(c.id)) chatIds.push(c.id);
      }
    } catch (err: any) {
      // Que no se pueda leer la bandeja de Sales Navigator no invalida lo que
      // ya tengamos de la clásica; solo se anota.
      console.warn('[verificarMensaje] bandeja Sales Navigator ilegible:', err?.message);
    }

    try {
      const r = await buscarMensajeEnviado(
        (id, cursor) => unipileService.getChatMessagesPage(id, { limit: 50, cursor }),
        { chatIds, texto, desde }
      );
      const v = veredictoDeBusqueda(r, chatIds.length === 0);
      if (v.ok === true) return v;
      ultimo = v;
    } catch (err: any) {
      ultimo = { ok: null, motivo: `no he podido comprobarlo: ${err?.message || String(err)}` };
    }
  }
  return ultimo;
}

// ¿Está de verdad la invitación? Si salió, aparece en las pendientes enviadas.
// Si no aparece, queda una explicación buena antes de darla por fallida: que la
// persona la haya ACEPTADO ya (entonces sale de esa lista y pasa a 1er grado).
async function verificarInvitacion(
  providerId: string,
  accountId: string,
  esperas: number[] = [1500, 3000]
): Promise<Verificacion> {
  let ultimoError: string | null = null;
  for (const espera of esperas) {
    await new Promise((r) => setTimeout(r, espera));
    try {
      const enviadas = await unipileService.getSentInvitations(accountId, { maxPages: 3 });
      if (enviadas.some((i) => i.inviter_id === providerId)) return { ok: true, motivo: null };
      ultimoError = 'no aparece en tus invitaciones pendientes';
    } catch (err: any) {
      return { ok: null, motivo: `no he podido comprobarlo: ${err?.message || String(err)}` };
    }
  }
  try {
    const perfil: any = await unipileService.getProfile(providerId, accountId);
    const nd = String(perfil?.network_distance ?? '').toUpperCase();
    if (nd === '1' || nd.includes('DISTANCE_1') || nd.includes('FIRST')) {
      return { ok: true, motivo: null }; // ya te aceptó: por eso no está pendiente
    }
  } catch { /* sin perfil no se puede desmentir; se queda en fallida */ }
  return {
    ok: false,
    motivo: `LinkedIn aceptó la llamada pero ${ultimoError}. Suele ser el baneo de invitaciones de la cuenta: la nota NO ha salido.`,
  };
}

// ⛔ ¿YA TIENE EL RECURSO AUNQUE NO HAYA FILA? (Iker, 2026-08-24)
//
// El agujero que tapa esto: `lead_magnet_sends` era la ÚNICA fuente de verdad
// sobre quién tiene ya el recurso, y `/reverificar` solo repasa las filas que
// existen. A quien recibió el DM pero se quedó SIN fila no lo miraba nadie —
// jamás—, así que el panel lo dejaba en «Para actuar» para siempre y ofrecía
// mandarle el mismo enlace por segunda vez.
//
// No es teoría. Medido en el post del 12/08 de Unai: los DOS únicos accionables
// que quedaban —Alexandra Vega Alemán y Jordi Urgell López— tienen el DM con
// https://recursos.neety.com/vibe/ en su bandeja desde el 13/08 a las 16:38 y
// 16:39 (Jordi hasta le puso un 👍), y no había fila 'dm' suya en NINGÚN post.
// A los dos se les había contestado en público "te lo he mandado". Un clic más
// y les llegaba el recurso repetido.
//
// La diferencia con `verificarMensaje` es qué se busca: allí el TEXTO exacto de
// nuestro mensaje, que aquí no se conoce (no hay fila donde estuviera guardado).
// Aquí se busca EL ENLACE DEL RECURSO dentro de un mensaje NUESTRO, que es la
// única huella que sobrevive sin fila. `buscarMensajeEnviado` ya casa por
// subcadena, así que el enlace entra tal cual como firma.
//
// Sin `desde` el barrido no puede concluir en negativo (así está escrito el
// módulo, y está bien): solo se termina por agotar el chat. Da igual, porque
// aquí SOLO se actúa sobre el hallazgo POSITIVO — un `false` o un `null` no
// escriben nada y la persona sigue en «Para actuar», que es donde ya estaba.
async function buscarEntregaPorEnlace(
  providerId: string,
  accountId: string,
  enlace: string
): Promise<Verificacion> {
  let chatIds: string[] = [];
  try {
    const chats = await unipileService.getChatsWithAttendee(providerId, accountId, 10);
    chatIds = chats.map((c: any) => c?.id).filter(Boolean);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (!/404|not found/i.test(msg)) {
      return { ok: null, motivo: `no he podido comprobarlo: ${msg}` };
    }
  }
  if (chatIds.length === 0) return { ok: null, motivo: 'sin conversación con esta persona' };

  try {
    const r = await buscarMensajeEnviado(
      (id, cursor) => unipileService.getChatMessagesPage(id, { limit: 50, cursor }),
      { chatIds, texto: enlace, desde: null }
    );
    return veredictoDeBusqueda(r, false);
  } catch (err: any) {
    return { ok: null, motivo: `no he podido comprobarlo: ${err?.message || String(err)}` };
  }
}

// POST /api/accounts/lead-magnet/send
// Body: { post_id, comment_id, provider_id, kind: 'dm', text, invitation_id? }
//
// Entrega el recurso a un comentarista. Solo hay un canal: el mensaje privado.
// Cuando llega `invitation_id`, ese mensaje va colgado de la solicitud que ELLA
// nos mandó — llega igual y no hace falta aceptarla.
//
// A failure is recorded, not swallowed: we persist status='failed' with the
// error and STILL return 200, because "LinkedIn refused this one" is a
// normal outcome of this workflow (out-of-network, already messaged), not a
// server error. The UI shows the reason on the card.
router.post('/lead-magnet/send', async (req: Request, res: Response) => {
  try {
    // followup_text / sector / provider_name: extras que la lista guarda para
    // poder pintar la ficha en las secciones de seguimiento. En un DM normal no
    // vienen y se ignoran.
    const {
      post_id, comment_id, provider_id, kind, text,
      invitation_id, followup_text, sector, provider_name,
    } = req.body || {};
    if (!post_id || !comment_id || !provider_id) {
      return res.status(400).json({ error: 'post_id, comment_id and provider_id required' });
    }
    // ⛔ LA PUERTA CERRADA (Iker, 2026-08-17). Un cliente desactualizado —una
    // pestaña abierta desde antes del cambio— todavía manda 'invite' o 'inmail'.
    // Se contesta con el motivo escrito para leer, no con un "kind inválido":
    // quien lo vea tiene que entender qué hacer en su lugar.
    if (kind === 'invite' || kind === 'inmail') {
      return res.status(400).json({
        error: 'Ese canal ya no existe: no mandamos invitaciones ni InMails. Recarga la página y responde al comentario pidiéndole que te mande él la solicitud.',
      });
    }
    if (kind !== 'dm') {
      return res.status(400).json({ error: "kind must be 'dm'" });
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text required' });
    }

    const postQ = await pool.query(
      `SELECT p.id, c.name AS creator_name, c.unipile_account_id
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE p.id = $1`,
      [post_id]
    );
    if (postQ.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    const accountId = postQ.rows[0].unipile_account_id;
    if (!accountId) return res.status(400).json({ error: 'Creator has no Unipile account_id' });

    const body = text.trim();

    let status: 'sent' | 'failed' = 'sent';
    let error: string | null = null;
    let result: any = null;
    let verificado: boolean | null = null;
    // Se sella ANTES de mandar: es el suelo del barrido al comprobarlo.
    const mandadoEn = new Date();
    try {
      result = await unipileService.sendDirectMessage(provider_id, body, accountId, {
        // Contestar a una solicitud pendiente: mensaje normal, sin aceptarla y
        // sin gastar nada. Solo va cuando el panel ha encontrado su invitación.
        ...(invitation_id ? { invitationId: String(invitation_id) } : {}),
      });
    } catch (err: any) {
      status = 'failed';
      error = err?.message || String(err);
      console.warn(`[accounts/lead-magnet/send] dm to ${provider_id} failed:`, error);
    }

    // El recibo. Solo si la llamada no petó: si ya sabemos que falló, no hay
    // nada que releer.
    if (status === 'sent') {
      const v = await verificarMensaje(provider_id, accountId, body, result?.chat_id ?? null, mandadoEn);
      verificado = v.ok;
      if (v.ok === false) {
        status = 'failed';
        error = v.motivo;
        console.warn(`[accounts/lead-magnet/send] dm a ${provider_id} NO verificado: ${v.motivo}`);
      } else if (v.ok === null) {
        error = v.motivo; // enviado, pero sin recibo: el panel lo dice en ámbar
      }
    }

    let persistError: string | null = null;
    // Record the attempt either way, keyed by PERSON (post + provider + kind),
    // not by comment: someone with two keyword-carrying comments must still
    // only ever be one row, or nothing stops us sending them the resource
    // twice. ON CONFLICT overwrites so a retry that finally succeeds replaces
    // the earlier failure.
    try {
      await pool.query(
        `INSERT INTO lead_magnet_sends (post_id, comment_social_id, provider_id, kind, status, text, error, verificado, followup_text, sector, provider_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (post_id, provider_id, kind)
         DO UPDATE SET status = EXCLUDED.status, text = EXCLUDED.text,
                       error = EXCLUDED.error, created_at = NOW(),
                       verificado = EXCLUDED.verificado,
                       comment_social_id = EXCLUDED.comment_social_id,
                       followup_text = COALESCE(EXCLUDED.followup_text, lead_magnet_sends.followup_text),
                       sector = COALESCE(EXCLUDED.sector, lead_magnet_sends.sector),
                       provider_name = COALESCE(EXCLUDED.provider_name, lead_magnet_sends.provider_name)`,
        [post_id, comment_id, provider_id, kind, status, body, error, verificado,
         followup_text || null, sector || null, provider_name || null]
      );
    } catch (storeErr: any) {
      // ⛔ UN GUARDADO QUE FALLA EN SILENCIO ES UN MENSAJE QUE LA APP OLVIDA
      // (Iker, 2026-08-24). Esto era un `console.warn` y ya está: el DM salía,
      // la fila no se escribía, el panel devolvía un ✓ limpio y esa persona se
      // quedaba en «Para actuar» para siempre, con el botón de mandarle el mismo
      // enlace otra vez. Es el estado en el que aparecieron Alexandra y Jordi.
      // Ahora se DICE, en el mismo sitio donde se dice todo lo demás: el mensaje
      // ya salió (eso no se toca), pero la respuesta avisa de que no ha quedado
      // constancia, para que se marque a mano en vez de reenviarlo.
      persistError = storeErr?.message || String(storeErr);
      console.error('[accounts/lead-magnet/send] persist failed:', persistError);
    }

    res.json({
      ok: status === 'sent', kind, status, error, verificado, result,
      ...(persistError ? { persist_error: persistError } : {}),
    });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/send]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/lead-magnet/ask
// Body: { post_id, comment_id, provider_id, text, provider_name?, sector?,
//         followup_text? }
//
// "A esta persona le he pedido que nos mande ELLA la solicitud."
//
// NO MANDA NADA A LINKEDIN, y esa es toda la diferencia con /send. Lo que sale de
// verdad es la respuesta pública al comentario, que va por el endpoint de
// respuestas de siempre. Esta fila es el recibo local, y sin ella
// /pendientes-solicitud no tiene contra qué cruzar las solicitudes recibidas: la
// persona mandaría la suya y no aparecería por ningún lado.
//
// El panel lo llama DESPUÉS de que la respuesta salga bien. Si la respuesta falla
// no se llama: no puede quedar registrado como "pedido" un paso que la persona no
// ha leído.
//
// `sector` y `followup_text` se guardan aquí por el lead magnet de tipo lista:
// son lo que dice QUÉ lista mandarle el día que llegue su solicitud.
router.post('/lead-magnet/ask', async (req: Request, res: Response) => {
  try {
    const { post_id, comment_id, provider_id, text, provider_name, sector, followup_text } = req.body || {};
    if (!post_id || !comment_id || !provider_id) {
      return res.status(400).json({ error: 'post_id, comment_id and provider_id required' });
    }
    // verificado = NULL: no hay nada que comprobar en LinkedIn, porque no hemos
    // mandado nada. Ponerlo en TRUE sería el verde mentiroso del 13/08 otra vez.
    await pool.query(
      `INSERT INTO lead_magnet_sends (post_id, comment_social_id, provider_id, kind, status, text, verificado, followup_text, sector, provider_name)
       VALUES ($1, $2, $3, 'ask', 'sent', $4, NULL, $5, $6, $7)
       ON CONFLICT (post_id, provider_id, kind)
       DO UPDATE SET text = EXCLUDED.text, created_at = NOW(),
                     comment_social_id = EXCLUDED.comment_social_id,
                     followup_text = COALESCE(EXCLUDED.followup_text, lead_magnet_sends.followup_text),
                     sector = COALESCE(EXCLUDED.sector, lead_magnet_sends.sector),
                     provider_name = COALESCE(EXCLUDED.provider_name, lead_magnet_sends.provider_name)`,
      [post_id, comment_id, provider_id, String(text || '').trim() || null,
       followup_text || null, sector || null, provider_name || null]
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/ask]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/lead-magnet/marcar-manual
// Body: { post_id, comment_id, provider_id, kind, text? }
//
// "Este ya se lo mandé yo, a mano." Guarda el envío como hecho SIN mandar nada.
//
// ⛔ POR QUÉ HACE FALTA (Iker, 2026-08-14). El InMail a Susana Osorio salió de
// Sales Navigator a mano, y la herramienta se lo seguía ofreciendo como
// pendiente. No es un descuido: esa bandeja NO se puede consultar por API con
// fiabilidad (otros identificadores de persona y días de retraso en Unipile,
// ver `getChatsInFolder`), así que no hay forma de enterarse solo. Antes que
// adivinar mal —y un clic de más ahí son un crédito gastado y la misma persona
// recibiendo el recurso dos veces—, se le deja decirlo.
//
// Queda con verificado = NULL a propósito: consta como entregado y deja de
// ofrecerse, pero sin fingir que lo hemos comprobado nosotros.
router.post('/lead-magnet/marcar-manual', async (req: Request, res: Response) => {
  try {
    const { post_id, comment_id, provider_id, kind, text, provider_name } = req.body || {};
    if (!post_id || !comment_id || !provider_id) {
      return res.status(400).json({ error: 'post_id, comment_id and provider_id required' });
    }
    // Solo 'dm': ya no se crean filas de invitación ni de InMail, ni mandándolas
    // ni marcándolas a mano (2026-08-17). Las viejas se siguen leyendo.
    if (kind !== 'dm') {
      return res.status(400).json({ error: "kind must be 'dm'" });
    }
    await pool.query(
      `INSERT INTO lead_magnet_sends (post_id, comment_social_id, provider_id, kind, status, text, error, verificado, provider_name)
       VALUES ($1, $2, $3, $4, 'sent', $5, $6, NULL, $7)
       ON CONFLICT (post_id, provider_id, kind)
       DO UPDATE SET status = 'sent', error = EXCLUDED.error, verificado = NULL,
                     created_at = NOW(), comment_social_id = EXCLUDED.comment_social_id,
                     text = COALESCE(EXCLUDED.text, lead_magnet_sends.text),
                     provider_name = COALESCE(EXCLUDED.provider_name, lead_magnet_sends.provider_name)`,
      [post_id, comment_id, provider_id, kind,
       (text || '').trim() || null,
       'marcado a mano: lo mandaste tú fuera de la herramienta, así que no lo he comprobado',
       provider_name || null]
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/marcar-manual]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounts/lead-magnet/reverificar
// Body: { post_id, link? }
//
// Relee en LinkedIn TODOS los envíos que este post tiene guardados —los 'sent'
// Y los 'failed'— y corrige lo que esté al revés, en las dos direcciones:
//
//   · un 'sent' cuyo mensaje no aparece → cae a 'failed' (los del baneo del 13/08)
//   · un 'failed' cuyo mensaje SÍ está en el chat → vuelve a 'sent'
//
// Y DESDE EL 2026-08-24, una tercera dirección que antes no existía: los
// comentaristas SIN NINGUNA FILA a los que ya se les mandó el recurso. Ver
// `buscarEntregaPorEnlace`: este repaso solo miraba filas, así que un envío que
// salió y no se guardó era invisible para siempre y esa persona se quedaba en
// «Para actuar» ofreciendo mandarle el enlace por segunda vez. Ahora se barren
// también los que no tienen fila, y el que ya tenga el enlace nuestro en su
// bandeja se guarda como entregado (`recuperados_sin_fila`).
//
// ⛔ ESTO DECÍA "NUNCA RESUCITA UN FALLIDO" Y ESA REGLA ERA EL BUG (Iker,
// 2026-08-14, dos veces en el mismo día). Se escribió cuando el único origen de
// un 'failed' era que LinkedIn rechazara el envío. Pero ayer apareció el
// segundo origen: EL PROPIO VERIFICADOR, que con la ventana de 10 mensajes
// marcó como fallidos los DM a Mario y a Asier que estaban entregados. Con el
// filtro `status='sent'`, este repaso no volvía a mirarlos jamás: el "revisar
// envíos" decía "15 comprobados, todos llegaron" con los dos falsos fallidos
// delante. Un estado que el verificador puede escribir mal tiene que ser un
// estado que el verificador pueda corregir.
//
// La asimetría que SÍ se conserva es por veredicto, no por fila: resucitar
// exige hallazgo POSITIVO (ok === true, el mensaje encontrado). Un "no lo sé"
// (null) deja el 'failed' como está — no se blanquea un fallo con una duda.
router.post('/lead-magnet/reverificar', async (req: Request, res: Response) => {
  try {
    const { post_id: postId, link: linkBody } = req.body || {};
    if (!postId) return res.status(400).json({ error: 'post_id required' });

    // El post se pide SIEMPRE, no solo cuando hay filas: el barrido de abajo
    // necesita sus comentaristas, y un post con CERO filas y DMs entregados es
    // exactamente el agujero que estamos tapando.
    const postQ = await pool.query(
      `SELECT p.id, p.linkedin_post_id, p.creator_id,
              c.linkedin_id AS creator_linkedin_id, c.unipile_account_id
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE p.id = $1`,
      [postId]
    );
    if (postQ.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
    const post = postQ.rows[0];
    const accountId = post.unipile_account_id;
    if (!accountId) return res.status(400).json({ error: 'Creator has no Unipile account_id' });

    const { rows } = await pool.query(
      `SELECT provider_id, comment_social_id, kind, text, status, verificado, created_at
         FROM lead_magnet_sends
        WHERE post_id = $1
        ORDER BY created_at DESC`,
      [postId]
    );

    // Tope de 40, igual que /check-accepted: cada fila son 1-3 llamadas a
    // Unipile y pasarse de ahí es tocar el rate limit de la cuenta.
    const detalle: {
      provider_id: string; kind: string; ok: boolean | null;
      motivo: string | null; recuperado?: boolean; sin_fila?: boolean;
      ask_restaurada?: boolean;
    }[] = [];
    let asksRestauradas = 0;
    for (const r of rows.slice(0, 40)) {
      // ⛔ UN 'ask' NO SE COMPRUEBA, PORQUE NO MANDA NADA (Iker, 2026-08-24).
      //
      // Su `text` es la RESPUESTA PÚBLICA al comentario ("mándame solicitud y te
      // lo paso"), no un privado. Aquí se le pasaba igualmente a
      // `verificarMensaje`, que lo buscaba dentro del chat de esa persona: no
      // está ni puede estar, así que en cuanto existía una conversación con ella
      // el veredicto salía `false` y la fila caía a 'failed'.
      //
      // Y una 'ask' en 'failed' desaparece de la herramienta: /pendientes-solicitud
      // exige status='sent' y `gestionadosArriba` también, así que esa persona se
      // caía de «Solicitudes pedidas» y volvía a «Para actuar». Medido hoy en el
      // post del 12/08 de Unai: las SEIS filas 'ask' del post estaban así.
      //
      // Como /lead-magnet/ask solo escribe 'sent' y es el único sitio que crea
      // estas filas, NO EXISTE una 'ask' fallida legítima: la que esté en rojo la
      // rompió este repaso, y este repaso la devuelve a su sitio.
      if (r.kind === 'ask') {
        if (r.status === 'failed') {
          await pool.query(
            `UPDATE lead_magnet_sends
                SET status = 'sent', verificado = NULL, error = NULL
              WHERE post_id = $1 AND provider_id = $2 AND kind = 'ask'`,
            [postId, r.provider_id]
          );
          // Contador propio: ni `caidos` ni `recuperados` ni `sin_comprobar`.
          // No es un veredicto sobre LinkedIn, es un destrozo nuestro deshecho.
          asksRestauradas++;
          detalle.push({
            provider_id: r.provider_id, kind: 'ask', ok: true,
            motivo: 'la solicitud pedida no se comprueba en el chat: fila devuelta a «Solicitudes pedidas»',
            ask_restaurada: true,
          });
        }
        continue;
      }
      // Sin esperas: estas filas llevan horas o días, LinkedIn ya las tiene
      // decididas, y encadenar 40 backoffs se comería el timeout.
      const v = r.kind === 'invite'
        ? await verificarInvitacion(r.provider_id, accountId, [0])
        : await verificarMensaje(
            r.provider_id, accountId, r.text || '', null,
            r.created_at ? new Date(r.created_at) : null, [0]
          );
      // ⚠️ Una INVITACIÓN fallida NO se resucita nunca, aunque el veredicto sea
      // true. Su comprobación solo mira si EXISTE una invitación pendiente a esa
      // persona, y en los fallos por `cannot_resend_yet` la que existe es una
      // ANTERIOR, sin nuestra nota con el recurso: resucitarla diría "recurso
      // entregado" en falso. El DM y el InMail sí, porque ahí el hallazgo casa
      // por el TEXTO de nuestro propio mensaje — encontrado es entregado.
      const puedeResucitar = r.kind !== 'invite';
      const statusNuevo =
        v.ok === true ? (r.status === 'sent' || puedeResucitar ? 'sent' : r.status)
        : v.ok === false ? 'failed'
        : r.status;
      detalle.push({
        provider_id: r.provider_id, kind: r.kind, ok: v.ok, motivo: v.motivo,
        recuperado: r.status === 'failed' && statusNuevo === 'sent',
      });
      await pool.query(
        `UPDATE lead_magnet_sends
            SET status = $3,
                verificado = $4,
                -- Confirmado = se limpia el error viejo; si no, se guarda el motivo.
                error = CASE WHEN $4::boolean IS TRUE AND $3 = 'sent' THEN NULL ELSE COALESCE($5, error) END
          WHERE post_id = $1 AND provider_id = $2 AND kind = $6`,
        [postId, r.provider_id, statusNuevo, v.ok, v.motivo, r.kind]
      );
    }

    // ── EL BARRIDO DE LOS QUE NO TIENEN FILA (Iker, 2026-08-24) ──
    //
    // Todo lo de arriba corrige filas. Esto busca a los que FALTAN: gente a la
    // que el panel le seguiría ofreciendo el recurso y que ya lo tiene en su
    // bandeja. Ver `buscarEntregaPorEnlace` para el caso real que lo motiva.
    //
    // El enlace lo manda el panel (sabe cuál es el recurso de este post). Si no
    // viene, se saca del texto de los envíos ya guardados, que lo llevan dentro:
    // así el endpoint se vale solo y un cliente viejo no pierde el barrido.
    const CAP_BARRIDO = 25;
    // Filas repasadas, sellado ANTES del barrido: lo que este añade a `detalle`
    // no son filas revisadas, son filas que no existían.
    const revisados = detalle.length;
    let recuperadosSinFila = 0;
    let barridos = 0;
    let sinBarrer = 0;

    const enlaceDe = (t: string | null): string | null =>
      (t || '').match(/https?:\/\/[^\s)"'<]+/i)?.[0]?.replace(/[.,;]+$/, '') ?? null;
    const enlace =
      (typeof linkBody === 'string' && enlaceDe(linkBody)) ||
      (() => {
        // El más repetido entre los textos guardados: es el recurso de este post.
        const cuenta = new Map<string, number>();
        for (const r of rows) {
          const l = enlaceDe(r.text);
          if (l) cuenta.set(l, (cuenta.get(l) ?? 0) + 1);
        }
        return [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      })();

    if (enlace && post.linkedin_post_id) {
      // Quién NO cuenta como entregado, con el MISMO criterio que el panel: el
      // DM/InMail que salió, y la invitación cuya nota llevaba el enlace dentro.
      // Se cruza por persona Y por comentario, porque el provider_id cambia
      // cuando alguien pasa a 1er grado (el bug del 06/08).
      const llevaEnlace = (t: string | null) =>
        !!t && /recursos\.neety\.com|lnkd\.in|https?:\/\//i.test(t);
      const entregados = new Set<string>();
      for (const r of rows) {
        const cuenta =
          ((r.kind === 'dm' || r.kind === 'inmail') && r.status === 'sent') ||
          (r.kind === 'invite' && r.status === 'sent' && llevaEnlace(r.text));
        if (!cuenta) continue;
        if (r.provider_id) entregados.add(r.provider_id);
        if (r.comment_social_id) entregados.add(r.comment_social_id);
      }

      try {
        const { threads } = await buildThreadsForPost(post);
        const candidatos = threads.filter(
          (t) => !t.author.is_company && t.author.profile_id &&
            !entregados.has(t.author.profile_id) && !entregados.has(t.id)
        );
        sinBarrer = Math.max(0, candidatos.length - CAP_BARRIDO);
        for (const t of candidatos.slice(0, CAP_BARRIDO)) {
          barridos++;
          const v = await buscarEntregaPorEnlace(t.author.profile_id!, accountId, enlace);
          // ⛔ SOLO EL HALLAZGO POSITIVO ESCRIBE. Un `false` o un `null` no dicen
          // "no lo tiene": dicen "no lo he encontrado", y esa persona ya está
          // donde tiene que estar (en «Para actuar»). Convertir esa duda en una
          // fila sería la versión con el signo cambiado del bug del 13/08.
          if (v.ok !== true) continue;
          recuperadosSinFila++;
          // `recuperado` NO: eso es "estaba en rojo y sí había llegado", otra
          // cosa. Aquí no había ni fila. Se cuenta aparte para que el mensaje
          // del panel no mezcle dos arreglos distintos.
          detalle.push({
            provider_id: t.author.profile_id!, kind: 'dm', ok: true,
            motivo: 'ya lo tenía en su bandeja y no había fila', sin_fila: true,
          });
          await pool.query(
            `INSERT INTO lead_magnet_sends (post_id, comment_social_id, provider_id, kind, status, text, error, verificado, provider_name)
             VALUES ($1, $2, $3, 'dm', 'sent', $4, $5, TRUE, $6)
             ON CONFLICT (post_id, provider_id, kind)
             DO UPDATE SET status = 'sent', verificado = TRUE, error = EXCLUDED.error,
                           comment_social_id = EXCLUDED.comment_social_id,
                           provider_name = COALESCE(EXCLUDED.provider_name, lead_magnet_sends.provider_name)`,
            [postId, t.id, t.author.profile_id, enlace,
             'no había fila de este envío: el repaso encontró el enlace del recurso en un mensaje nuestro de su chat',
             t.author.name || null]
          );
        }
      } catch (err: any) {
        // Sin comentarios no hay barrido, pero el repaso de filas de arriba YA
        // está hecho y guardado: se devuelve lo que sí ha salido.
        console.warn('[reverificar] barrido sin fila:', err?.message);
      }
    }

    res.json({
      revisados,
      caidos: detalle.filter((d) => d.ok === false).length,
      // Estaban en 'failed' y el mensaje ha aparecido en el chat: llegaron.
      recuperados: detalle.filter((d) => d.recuperado).length,
      sin_comprobar: detalle.filter((d) => d.ok === null).length,
      omitidos: Math.max(0, rows.length - Math.min(rows.length, 40)),
      barridos,
      recuperados_sin_fila: recuperadosSinFila,
      sin_barrer: sinBarrer,
      asks_restauradas: asksRestauradas,
      detalle,
    });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/reverificar]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/lead-magnet/followups?creator_id=xxx
//
// Los SEGUIMIENTOS pendientes de CUALQUIER lead magnet: gente a la que se le mandó
// una INVITACIÓN (porque no era de 1er grado y un DM no le habría llegado) y a la
// que TODAVÍA no se le ha mandado el recurso por DM. Cuando aceptan, se les manda
// con /lead-magnet/send (kind='dm') y desaparecen de aquí. No lee ninguna
// conversación: solo saca lo guardado al invitar.
//
// ⭐ 2026-08-06: esto filtraba por `followup_text IS NOT NULL`, y ese campo SOLO
// lo rellena el lead magnet de tipo "lista". Resultado: en un lead magnet normal
// invitabas a alguien, te aceptaba, y no aparecía por ningún lado — el segundo
// mensaje se quedaba sin mandar salvo que te acordaras tú. Ahora salen todos, y
// el texto lo monta el panel con el recurso de la palabra clave cuando no hay uno
// guardado.
//
// El NOT EXISTS de abajo es el que evita el DM duplicado: en cuanto esa persona
// tiene un DM enviado en ese post, deja de ser un pendiente.
router.get('/lead-magnet/followups', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || null;
    const params: any[] = [];
    let creatorFilter = '';
    if (creatorId && creatorId !== 'all') {
      params.push(creatorId);
      creatorFilter = `AND c.id = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT s.post_id, s.provider_id, s.provider_name, s.sector, s.followup_text,
              s.comment_social_id, s.created_at, s.text AS invite_text,
              p.hook_text, p.content_text, c.id AS creator_id, c.name AS creator_name,
              c.unipile_account_id
         FROM lead_magnet_sends s
         JOIN posts p ON p.id = s.post_id
         JOIN creators c ON c.id = p.creator_id
        WHERE s.kind = 'invite' AND s.status = 'sent'
          ${creatorFilter}
          AND NOT EXISTS (
            SELECT 1 FROM lead_magnet_sends d
             WHERE d.post_id = s.post_id AND d.provider_id = s.provider_id
               AND d.kind = 'dm' AND d.status = 'sent'
          )
        ORDER BY s.created_at DESC`,
      params
    );

    // ⛔ ¿YA LE LLEGÓ EL RECURSO EN LA PROPIA NOTA? (Iker, 2026-08-12)
    //
    // `buildInviteNote` mete el enlace DENTRO de la nota de la invitación, y su
    // comentario dice literalmente "nunca quites el link". O sea que en un lead
    // magnet normal, cuando la persona acepta, YA TIENE el recurso: no queda
    // nada que mandarle. La `lista` es el caso contrario — su nota es un teaser
    // porque las empresas no caben en 300 caracteres — y por eso guarda un
    // `followup_text`, que es el segundo mensaje de verdad.
    //
    // Se mira el TEXTO REALMENTE ENVIADO y no el tipo de lead magnet: si algún
    // día una invitación sale sin enlace, el seguimiento vuelve a ofrecerlo solo.
    // Preguntarle al dato en vez de deducirlo del kind.
    const conEnlace = (t: string | null) => !!t && /recursos\.neety\.com|lnkd\.in|https?:\/\//i.test(t);

    // 🔧 Y EL NOMBRE, que estaba en null en TODAS las filas: el panel solo lo
    // mandaba en el lead magnet de tipo "lista". Se resuelve contra Unipile por
    // provider_id (la fuente autoritativa) y se GUARDA, asi que el coste se paga
    // una vez por persona y no en cada carga.
    const sinNombre = rows.filter((r: any) => !r.provider_name && r.unipile_account_id);
    const resueltos = new Map<string, string>();
    await Promise.all(
      [...new Set(sinNombre.map((r: any) => r.provider_id as string))].map(async (pid) => {
        const fila = sinNombre.find((r: any) => r.provider_id === pid);
        try {
          // getProfile acepta el provider_id tal cual: extractLinkedInIdentifier
          // devuelve la entrada intacta cuando no es una URL de LinkedIn.
          const u: any = await unipileService.getProfile(pid, fila.unipile_account_id);
          const nombre = [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() || u?.name || null;
          if (nombre) resueltos.set(pid, nombre);
        } catch (e: any) {
          // Que no se caiga la lista entera porque un perfil no responda: sin
          // nombre se sigue pudiendo mandar el mensaje, que es lo importante.
          console.warn(`[followups] no pude resolver el nombre de ${pid}:`, e?.message);
        }
      })
    );
    if (resueltos.size) {
      await pool.query(
        `UPDATE lead_magnet_sends SET provider_name = c.nombre
           FROM (SELECT unnest($1::text[]) AS pid, unnest($2::text[]) AS nombre) c
          WHERE lead_magnet_sends.provider_id = c.pid
            AND lead_magnet_sends.provider_name IS NULL`,
        [[...resueltos.keys()], [...resueltos.values()]]
      );
    }

    res.json({
      followups: rows.map(({ unipile_account_id, ...r }: any) => ({
        ...r,
        provider_name: r.provider_name || resueltos.get(r.provider_id) || null,
        // true = la nota de la invitación ya llevaba el recurso, así que esta
        // persona no tiene nada pendiente y el panel NO debe reofrecerle el link.
        ya_entregado: !r.followup_text && conEnlace(r.invite_text),
      })),
    });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/followups]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounts/lead-magnet/pendientes-solicitud?creator_id=xxx
//
// El otro lado de /ask: a quién le pedimos que nos mandara la solicitud, y quién
// de esos ya la ha mandado.
//
// Cuesta UNA llamada a Unipile por cuenta, no una por persona: la lista de
// solicitudes recibidas es la misma para los 400 comentarios de un post. El cruce
// es por provider_id, el mismo id que trae el comentario.
//
// Devuelve dos cubos:
//   · llegadas  — ya nos mandó la solicitud. Lleva su `invitation_id`, así que el
//                 recurso sale contestando a ESA solicitud: gratis y sin aceptar.
//   · esperando — todavía sin dar el paso, con los días que llevan.
//
// Si Unipile falla se devuelve 200 con `llegadas: []` y un aviso, igual que
// /canal: quedarse sin pantalla sería peor que no saber todavía quién ha dado el
// paso.
router.get('/lead-magnet/pendientes-solicitud', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || '';
    if (!creatorId) return res.status(400).json({ error: 'creator_id required' });

    const cQ = await pool.query(`SELECT unipile_account_id FROM creators WHERE id = $1`, [creatorId]);
    if (cQ.rows.length === 0) return res.status(404).json({ error: 'Creator not found' });
    const accountId = cQ.rows[0].unipile_account_id;

    // Los pedidos que siguen sin resolverse: sin DM detrás. El NOT EXISTS es lo
    // que hace que una persona desaparezca de aquí en cuanto se le manda el
    // recurso, igual que en /followups.
    const { rows } = await pool.query(
      // ⛔ LA CONFIG Y EL TEXTO DEL POST VIAJAN CON CADA FILA (Iker, 2026-08-20).
      //
      // Sin esto, el bloque de solicitudes de arriba de Comments generaba el DM
      // en BLANCO: alli no hay ningun post elegido, asi que no habia recurso que
      // resolver y `Enviar DM` mandaba un mensaje vacio. Y el recurso de una
      // persona no es el del post que estes mirando: es el del post donde ELLA
      // comento.
      `SELECT s.post_id, s.provider_id, s.provider_name, s.sector, s.followup_text,
              s.comment_social_id, s.created_at,
              p.lead_magnet_config, p.content_text AS post_content_text,
              c.name AS post_creator_name,
              EXTRACT(DAY FROM NOW() - s.created_at)::int AS dias
         FROM lead_magnet_sends s
         JOIN posts p ON p.id = s.post_id
         JOIN creators c ON c.id = p.creator_id
        WHERE s.kind = 'ask' AND s.status = 'sent' AND c.id = $1
          AND NOT EXISTS (
            SELECT 1 FROM lead_magnet_sends d
             WHERE d.post_id = s.post_id AND d.provider_id = s.provider_id
               AND d.kind = 'dm' AND d.status = 'sent'
          )
        ORDER BY s.created_at DESC`,
      [creatorId]
    );

    let aviso: string | null = null;
    const invitaciones = new Map<string, string>();
    if (accountId && rows.length > 0) {
      try {
        for (const i of await unipileService.getReceivedInvitations(accountId)) {
          invitaciones.set(i.inviter_id, i.invitation_id);
        }
      } catch (err: any) {
        aviso = `No he podido leer las solicitudes recibidas (${err?.message}). Puede que alguno de estos ya te haya mandado la suya y aquí no salga.`;
        console.warn('[accounts/lead-magnet/pendientes-solicitud]', err?.message);
      }
    }

    const llegadas: any[] = [];
    const esperando: any[] = [];
    for (const r of rows) {
      const invitation_id = invitaciones.get(r.provider_id) ?? null;
      (invitation_id ? llegadas : esperando).push({ ...r, invitation_id });
    }
    res.json({ llegadas, esperando, aviso });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/pendientes-solicitud]', err);
    res.status(500).json({ error: err.message });
  }
});

// Cache en memoria del grado de red, por cuenta y persona.
//
// POR QUE EXISTE (Iker, 2026-08-20): esta comprobacion paso a ser AUTOMATICA al
// abrir Comments, y era un boton que se pulsaba una vez al dia. Sin cache, cada
// cambio del filtro de cuenta rehace las mismas llamadas —una POR PERSONA, con
// 400ms de pausa—, asi que con 40 esperando serian 16 segundos de Unipile cada
// vez que tocas el desplegable.
//
// TTL corto a proposito: lo que se cachea es "todavia NO es contacto", y eso
// cambia solo. Cinco minutos es bastante para cubrir un rato de trabajo sin que
// alguien que acaba de aceptar se quede escondido media manana.
//
// ⚠️ Vive en memoria del proceso: un despliegue lo vacia. Es lo correcto — no es
// un dato, es el ahorro de una llamada.
const gradoCache = new Map<string, { accepted: boolean; at: number }>();
const GRADO_TTL_MS = 5 * 60 * 1000;

// POST /api/accounts/lead-magnet/check-accepted
// Body: { creator_id, provider_ids: [...] }
//
// ¿Quién de los invitados ya me ha ACEPTADO? No lee su chat: recomprueba el grado
// de red de cada uno con Unipile (getProfile → network_distance). Si ahora es 1er
// grado, la invitación se aceptó y ya se le puede mandar la lista por DM. Una
// llamada por persona con pausa; cap de 40 para no tocar el rate limit.
router.post('/lead-magnet/check-accepted', async (req: Request, res: Response) => {
  try {
    const { creator_id, provider_ids } = req.body || {};
    if (!creator_id || !Array.isArray(provider_ids)) {
      return res.status(400).json({ error: 'creator_id and provider_ids[] required' });
    }
    const { rows } = await pool.query(`SELECT unipile_account_id FROM creators WHERE id = $1`, [creator_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Creator not found' });
    const accountId = rows[0].unipile_account_id;
    if (!accountId) return res.status(400).json({ error: 'Creator has no Unipile account_id' });

    const isFirstDegree = (profile: any): boolean => {
      const nd = profile?.network_distance ?? profile?.distance ?? profile?.network_info?.distance;
      if (nd == null) return false;
      const s = String(nd).toUpperCase();
      return s === '1' || s.includes('DISTANCE_1') || s === 'FIRST_DEGREE' || s === 'FIRST';
    };

    const results: { provider_id: string; accepted: boolean }[] = [];
    const ahora = Date.now();
    for (const pid of provider_ids.slice(0, 40)) {
      // Lo ya sabido no se vuelve a preguntar: es lo que hace que abrir Comments
      // tres veces seguidas no sean tres rondas de llamadas a Unipile.
      const clave = `${accountId}:${pid}`;
      const guardado = gradoCache.get(clave);
      if (guardado && ahora - guardado.at < GRADO_TTL_MS) {
        results.push({ provider_id: String(pid), accepted: guardado.accepted });
        continue;
      }
      try {
        const profile = await unipileService.getProfile(String(pid), accountId);
        const accepted = isFirstDegree(profile);
        gradoCache.set(clave, { accepted, at: Date.now() });
        results.push({ provider_id: String(pid), accepted });
      } catch (err: any) {
        console.warn(`[check-accepted] ${pid} failed:`, err?.message);
        results.push({ provider_id: String(pid), accepted: false });
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    res.json({ results });
  } catch (err: any) {
    console.error('[accounts/lead-magnet/check-accepted]', err);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────── Organic followers (Phase 1) ────────────────────────
//
// POST /api/accounts/followers/sync?creator_id=xxx  — run sync now (one creator
//   or all managed). First run per creator is a full baseline; later runs are
//   incremental diffs that classify each NEW follower as pure_follow (organic)
//   or connection.
// GET  /api/accounts/followers/sync-status          — progress + per-creator state
// GET  /api/accounts/followers/organic-history?creator_id=&days=  — daily series.

router.post('/followers/sync', async (req: Request, res: Response) => {
  try {
    const creatorId = (req.query.creator_id as string) || null;
    const result = await runFollowerSync(creatorId);
    res.json(result);
  } catch (err: any) {
    console.error('[accounts/followers/sync]', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/followers/sync-status', async (_req: Request, res: Response) => {
  try {
    // In-memory progress (current run) + DB facts (what's actually been
    // captured per creator across runs / restarts). The in-memory side
    // resets every time the server restarts, so the DB summary is what
    // tells you whether the baseline ever actually ran.
    const progress = getFollowerSyncProgress();
    const { rows: creators } = await pool.query(
      `SELECT c.id, c.name, c.unipile_account_id IS NOT NULL AS has_account_id,
              COALESCE(s.baseline_done, FALSE) AS baseline_done,
              s.baseline_count,
              s.last_synced_at,
              s.last_new_count,
              (SELECT COUNT(*)::int FROM creator_followers f
                WHERE f.creator_id = c.id) AS followers_in_db,
              (SELECT COUNT(*)::int FROM creator_followers f
                WHERE f.creator_id = c.id AND f.is_baseline = FALSE) AS new_since_baseline
         FROM creators c
         LEFT JOIN creator_follower_sync_state s ON s.creator_id = c.id
        WHERE c.is_managed = TRUE
        ORDER BY c.created_at`
    );
    res.json({ progress, creators });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/followers/organic-history', async (req: Request, res: Response) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 90, 365);
    const creatorId = (req.query.creator_id as string) || null;

    // Group new followers (is_baseline = FALSE) by the day we detected them,
    // split into pure_follow (organic) vs connection. Baseline rows excluded.
    const { rows } = creatorId
      ? await pool.query(
          `SELECT first_seen_on::text AS day,
                  COUNT(*) FILTER (WHERE classification = 'pure_follow')::int AS organic,
                  COUNT(*) FILTER (WHERE classification = 'connection')::int  AS connection,
                  COUNT(*)::int AS total
             FROM creator_followers
            WHERE creator_id = $1
              AND is_baseline = FALSE
              AND first_seen_on >= CURRENT_DATE - ($2 || ' days')::interval
            GROUP BY first_seen_on
            ORDER BY first_seen_on ASC`,
          [creatorId, days]
        )
      : await pool.query(
          `SELECT f.first_seen_on::text AS day,
                  COUNT(*) FILTER (WHERE f.classification = 'pure_follow')::int AS organic,
                  COUNT(*) FILTER (WHERE f.classification = 'connection')::int  AS connection,
                  COUNT(*)::int AS total
             FROM creator_followers f
             JOIN creators c ON c.id = f.creator_id
            WHERE c.is_managed = TRUE
              AND f.is_baseline = FALSE
              AND f.first_seen_on >= CURRENT_DATE - ($1 || ' days')::interval
            GROUP BY f.first_seen_on
            ORDER BY f.first_seen_on ASC`,
          [days]
        );
    res.json({ points: rows });
  } catch (err: any) {
    console.error('[accounts/followers/organic-history]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Relleno retroactivo de la analitica Premium (clics al enlace, guardados,
 * envios...) de los posts que ya teniamos guardados.
 *
 * Va POR LOTES a proposito. Es una peticion a LinkedIn por post, y hacer 229 de
 * golpe significa dos cosas malas: la peticion HTTP se muere por timeout, y
 * LinkedIn nos mete rate limit, que en Unipile no se ve como error sino como
 * listas vacias — o sea que envenenaria TODO el scraping, no solo esto.
 * Se llama repetidamente hasta que `restantes` sea 0.
 */
router.post('/backfill-premium-analytics', async (req: Request, res: Response) => {
  const lote = Math.min(Number(req.body?.limit) || 20, 40);
  try {
    const { rows: pendientes } = await pool.query(
      `SELECT p.id, p.linkedin_post_id, c.unipile_account_id, c.name AS creador
         FROM posts p
         JOIN creators c ON c.id = p.creator_id
        WHERE c.is_managed = TRUE
          AND c.unipile_account_id IS NOT NULL
          AND p.linkedin_post_id IS NOT NULL
          AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
          AND p.premium_analytics_at IS NULL
        ORDER BY p.published_at DESC
        LIMIT $1`,
      [lote]
    );

    const resultados: any[] = [];
    for (const p of pendientes) {
      try {
        const a = await fetchPremiumAnalytics(String(p.linkedin_post_id), p.unipile_account_id);
        if (a) {
          await savePremiumAnalytics(pool, p.id, a);
          resultados.push({ id: p.id, creador: p.creador, clics: a.linkClicks, guardados: a.saves, envios: a.sends });
        } else {
          // Marcamos el intento igualmente: si no, el siguiente lote vuelve a
          // pedir los mismos posts rotos y el backfill no avanza nunca.
          await pool.query(`UPDATE posts SET premium_analytics_at = NOW() WHERE id = $1`, [p.id]);
          resultados.push({ id: p.id, creador: p.creador, error: 'sin datos (post viejo o no accesible)' });
        }
      } catch (e: any) {
        resultados.push({ id: p.id, creador: p.creador, error: e?.message });
      }
      // Respiro entre posts. Sin esto LinkedIn corta y empieza a devolver vacio.
      await new Promise((r) => setTimeout(r, 1500));
    }

    const { rows: quedan } = await pool.query(
      `SELECT COUNT(*)::int AS n
         FROM posts p JOIN creators c ON c.id = p.creator_id
        WHERE c.is_managed = TRUE AND c.unipile_account_id IS NOT NULL
          AND p.linkedin_post_id IS NOT NULL AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
          AND p.premium_analytics_at IS NULL`
    );

    res.json({ procesados: resultados.length, restantes: quedan[0].n, resultados });
  } catch (err: any) {
    console.error('[backfill-premium-analytics]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
