import pool from '../db';
import { unipileService } from './unipile';

// Backfill posts.reaction_mix for outliers. Uses a dedicated Unipile account
// (env UNIPILE_SCRAPER_ACCOUNT_ID) so the load doesn't ride on Iker/Unai's
// real LinkedIn sessions — a restriction on a burner account is recoverable;
// on the brand accounts it's not.
//
// Resumable by construction: the picker selects rows WHERE reaction_mix IS
// NULL, so a crashed run just resumes where it left off on the next start.
// Idempotent on writes (UPDATE … WHERE id = $1).

const SCRAPER_ACCOUNT_ID = process.env.UNIPILE_SCRAPER_ACCOUNT_ID || '';

interface BackfillProgress {
  running: boolean;
  started_at: string | null;
  processed: number;
  failed: number;
  total: number;
  current_post_id: string | null;
  last_error: string | null;
  // Per-HTTP-status counters so the UI can show "138 rate-limit, 5 not-found,
  // 1 5xx, 2 other" instead of one opaque "fallos" number. -1 = network /
  // non-HTTP error.
  errors_by_status: Record<string, number>;
}

const state: BackfillProgress = {
  running: false,
  started_at: null,
  processed: 0,
  failed: 0,
  total: 0,
  current_post_id: null,
  last_error: null,
  errors_by_status: {},
};

export function getBackfillProgress(): BackfillProgress {
  return { ...state, errors_by_status: { ...state.errors_by_status } };
}

interface RunOpts {
  // How many posts to process this run. Default null = all unbackfilled
  // outliers. The UI lets the user pick a cap so they can test on 50 first.
  limit?: number | null;
  // Parallel fetches. Default 1: the dedicated scraper account hits Unipile's
  // per-account rate limit fast at higher concurrency (we observed sustained
  // 429s at concurrency 3). 1 + a small spacing keeps us well under it. Cap
  // is 3 (anything higher is asking for it).
  concurrency?: number;
  // Min ms between requests. 1500ms × 1 concurrent ≈ 0.66 req/s, comfortably
  // below any plausible Unipile per-account ceiling and well under what
  // LinkedIn's session-level detection cares about.
  pauseMs?: number;
}

// Extract the HTTP status from our Unipile error message format
// "Unipile API error <status>: ...". Returns -1 if we can't parse one
// (network error, json parse error, etc).
function statusFromError(err: any): number {
  const m = String(err?.message || '').match(/Unipile API error (\d+)\b/);
  return m ? parseInt(m[1], 10) : -1;
}

export async function runReactionMixBackfill(opts: RunOpts = {}): Promise<{ started: boolean; reason?: string }> {
  if (state.running) return { started: false, reason: 'ya está en marcha' };
  if (!SCRAPER_ACCOUNT_ID) return { started: false, reason: 'UNIPILE_SCRAPER_ACCOUNT_ID no está configurada' };

  const concurrency = Math.max(1, Math.min(3, opts.concurrency ?? 1));
  const pauseMs = Math.max(0, opts.pauseMs ?? 1500);
  const limit = opts.limit ?? null;

  const params: any[] = [];
  let limitSql = '';
  if (limit != null) {
    params.push(limit);
    limitSql = `LIMIT $${params.length}`;
  }
  // Re-process posts that are either un-backfilled (NULL) OR were stored
  // with the broken UNKNOWN mix (the first run read the wrong field). The
  // '_error' sentinel (404s) is preserved by the IS NULL exclusion — those
  // never get re-attempted. The `? 'UNKNOWN'` clause catches the ~1374
  // posts that need re-classifying now that we read `value` correctly.
  const { rows: targets } = await pool.query(
    `SELECT id, linkedin_post_id
       FROM posts
      WHERE is_outlier = TRUE
        AND (reaction_mix IS NULL OR reaction_mix ? 'UNKNOWN')
        AND linkedin_post_id IS NOT NULL
        AND linkedin_post_id <> 'DEMO_LIVE_POST'
      ORDER BY published_at DESC NULLS LAST
      ${limitSql}`,
    params
  );

  if (targets.length === 0) return { started: false, reason: 'no hay nada que rellenar' };

  state.running = true;
  state.started_at = new Date().toISOString();
  state.processed = 0;
  state.failed = 0;
  state.total = targets.length;
  state.current_post_id = null;
  state.last_error = null;
  state.errors_by_status = {};

  // Circuit breaker: if we hit 5 consecutive 429s, cool down for a minute
  // before resuming. Lets Unipile's per-account rate window reset cleanly
  // instead of us burning through retries-of-retries.
  let consecutive429 = 0;

  void (async () => {
    try {
      for (let i = 0; i < targets.length; i += concurrency) {
        const batch = targets.slice(i, i + concurrency);
        const results = await Promise.all(
          batch.map(async (t: any) => {
            state.current_post_id = t.id;
            try {
              const { counts, sampled } = await unipileService.getPostReactions(
                t.linkedin_post_id,
                SCRAPER_ACCOUNT_ID
              );
              const total = Object.values(counts).reduce((s, n) => s + n, 0);
              const mix = { ...counts, total, sampled };
              await pool.query(
                `UPDATE posts SET reaction_mix = $1::jsonb WHERE id = $2`,
                [JSON.stringify(mix), t.id]
              );
              state.processed++;
              return { ok: true, status: 200 };
            } catch (err: any) {
              const status = statusFromError(err);
              const key = String(status);
              state.errors_by_status[key] = (state.errors_by_status[key] || 0) + 1;
              state.failed++;
              state.last_error = `${t.id}: ${err?.message}`.slice(0, 300);
              console.warn(`[reactionMixBackfill] ${t.id} failed (${status}):`, err?.message);

              if (status === 404) {
                const sentinel = {
                  _error: 'not_found',
                  _attempted_at: new Date().toISOString(),
                };
                try {
                  await pool.query(
                    `UPDATE posts SET reaction_mix = $1::jsonb WHERE id = $2`,
                    [JSON.stringify(sentinel), t.id]
                  );
                } catch (writeErr: any) {
                  console.warn(
                    `[reactionMixBackfill] sentinel write failed for ${t.id}:`,
                    writeErr?.message
                  );
                }
              }
              return { ok: false, status };
            }
          })
        );

        // Circuit-breaker: count consecutive batches where every single
        // call returned 429. If we see 5 in a row, pause 60s.
        const all429 = results.length > 0 && results.every((r) => !r.ok && r.status === 429);
        if (all429) {
          consecutive429++;
          if (consecutive429 >= 5) {
            console.warn('[reactionMixBackfill] sustained 429s — pausing 60s to let Unipile cool down');
            await new Promise((r) => setTimeout(r, 60_000));
            consecutive429 = 0;
          }
        } else if (results.some((r) => r.ok)) {
          consecutive429 = 0;
        }

        if (pauseMs > 0 && i + concurrency < targets.length) {
          await new Promise((r) => setTimeout(r, pauseMs));
        }
      }
    } finally {
      state.running = false;
      state.current_post_id = null;
      console.log(
        `[reactionMixBackfill] done — processed=${state.processed} failed=${state.failed} total=${state.total} by_status=${JSON.stringify(state.errors_by_status)}`
      );
    }
  })();

  return { started: true };
}
