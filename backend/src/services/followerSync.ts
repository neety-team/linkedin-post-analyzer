import pool from '../db';
import { unipileService } from './unipile';

// Organic-follower tracking sync. For every managed creator (or one), keep a
// per-follower roster up to date so we can chart "new organic followers/day".
//
// IMPORTANT: followers + relations are PRIVATE to each account — only Iker's
// connected account can see Iker's followers. So this uses each creator's
// OWN unipile_account_id, never the shared scraper account (that one is for
// post reactions, which are visible from any account).
//
// Per creator:
//   - First run = baseline: pull the full follower list + the full relations
//     (connections) map, insert every follower with is_baseline=TRUE,
//     classified pure_follow (not a connection) or connection. Baseline rows
//     are excluded from the daily "new organic" series — we can't date them.
//   - Later runs = incremental: pull followers with the known-id set so we
//     stop at the first one we already have (the list is reverse-chrono).
//     Each NEW follower is classified and inserted with is_baseline=FALSE.

interface SyncProgress {
  running: boolean;
  started_at: string | null;
  phase: 'idle' | 'baseline' | 'incremental';
  current_creator: string | null;
  creators_done: number;
  creators_total: number;
  new_followers_this_run: number;
  last_error: string | null;
}

const state: SyncProgress = {
  running: false,
  started_at: null,
  phase: 'idle',
  current_creator: null,
  creators_done: 0,
  creators_total: 0,
  new_followers_this_run: 0,
  last_error: null,
};

export function getFollowerSyncProgress(): SyncProgress {
  return { ...state };
}

const stripUrn = (s: string) => s.replace(/^urn:li:[a-z_]+:/, '');

function classify(
  followerId: string,
  relations: Map<string, number | null>
): { classification: 'pure_follow' | 'connection'; isConnection: boolean; connCreatedAt: number | null } {
  if (relations.has(followerId)) {
    return { classification: 'connection', isConnection: true, connCreatedAt: relations.get(followerId) ?? null };
  }
  return { classification: 'pure_follow', isConnection: false, connCreatedAt: null };
}

// Insert followers row-by-row. ON CONFLICT DO NOTHING keeps it idempotent and
// preserves the original first_seen_on / classification on re-runs. Volume is
// bounded (a few thousand once for the baseline, a handful per day after) and
// this runs in the background, so per-row is fine and keeps the code simple.
async function insertFollowers(
  creatorId: string,
  items: any[],
  relations: Map<string, number | null>,
  isBaseline: boolean
): Promise<number> {
  let inserted = 0;
  for (const it of items) {
    const id = stripUrn(String(it.id || it.urn || ''));
    if (!id) continue;
    const { classification, isConnection, connCreatedAt } = classify(id, relations);
    const r = await pool.query(
      `INSERT INTO creator_followers
         (creator_id, follower_provider_id, name, headline, profile_url,
          profile_picture_url, classification, is_connection,
          connection_created_at, is_baseline, first_seen_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CURRENT_DATE)
       ON CONFLICT (creator_id, follower_provider_id) DO NOTHING`,
      [
        creatorId,
        id,
        it.name || null,
        it.headline || null,
        it.profile_url || null,
        it.profile_picture_url || null,
        classification,
        isConnection,
        connCreatedAt ? new Date(connCreatedAt) : null,
        isBaseline,
      ]
    );
    if (r.rowCount) inserted++;
  }
  return inserted;
}

async function syncOneCreator(creator: { id: string; name: string; unipile_account_id: string }): Promise<void> {
  state.current_creator = creator.name;
  const accountId = creator.unipile_account_id;

  // Has this creator been baselined yet?
  const ss = await pool.query(
    `SELECT baseline_done FROM creator_follower_sync_state WHERE creator_id = $1`,
    [creator.id]
  );
  const baselineDone = ss.rows[0]?.baseline_done === true;

  if (!baselineDone) {
    state.phase = 'baseline';
    // Full pull. Relations first (so classification is ready), then followers.
    const relations = await unipileService.getRelationsMap(accountId);
    const { followers } = await unipileService.getFollowers(accountId);
    const inserted = await insertFollowers(creator.id, followers, relations, true);
    await pool.query(
      `INSERT INTO creator_follower_sync_state
         (creator_id, baseline_done, baseline_count, last_synced_at, last_new_count)
       VALUES ($1, TRUE, $2, NOW(), 0)
       ON CONFLICT (creator_id) DO UPDATE
         SET baseline_done = TRUE,
             baseline_count = EXCLUDED.baseline_count,
             last_synced_at = NOW(),
             last_new_count = 0`,
      [creator.id, followers.length]
    );
    console.log(`[followerSync] baseline ${creator.name}: ${followers.length} followers, ${inserted} inserted`);
    return;
  }

  // Incremental.
  state.phase = 'incremental';
  const known = await pool.query(
    `SELECT follower_provider_id FROM creator_followers WHERE creator_id = $1`,
    [creator.id]
  );
  const knownIds = new Set<string>(known.rows.map((r: any) => r.follower_provider_id));
  const { followers: newOnes } = await unipileService.getFollowers(accountId, { knownIds });

  let inserted = 0;
  if (newOnes.length > 0) {
    // Only fetch relations when there's something new to classify.
    const relations = await unipileService.getRelationsMap(accountId);
    inserted = await insertFollowers(creator.id, newOnes, relations, false);
    state.new_followers_this_run += inserted;
  }
  await pool.query(
    `UPDATE creator_follower_sync_state
        SET last_synced_at = NOW(), last_new_count = $2
      WHERE creator_id = $1`,
    [creator.id, inserted]
  );
  console.log(`[followerSync] incremental ${creator.name}: ${inserted} new follower(s)`);
}

export async function runFollowerSync(
  creatorId: string | null
): Promise<{ started: boolean; reason?: string }> {
  if (state.running) return { started: false, reason: 'ya está en marcha' };

  const { rows: creators } = creatorId
    ? await pool.query(
        `SELECT id, name, unipile_account_id FROM creators
          WHERE id = $1 AND unipile_account_id IS NOT NULL`,
        [creatorId]
      )
    : await pool.query(
        `SELECT id, name, unipile_account_id FROM creators
          WHERE is_managed = TRUE AND unipile_account_id IS NOT NULL
          ORDER BY name`
      );
  if (creators.length === 0) return { started: false, reason: 'ninguna cuenta propia tiene unipile_account_id' };

  state.running = true;
  state.started_at = new Date().toISOString();
  state.phase = 'idle';
  state.creators_done = 0;
  state.creators_total = creators.length;
  state.new_followers_this_run = 0;
  state.last_error = null;

  void (async () => {
    const fallos: string[] = [];
    try {
      for (const c of creators) {
        try {
          await syncOneCreator(c);
        } catch (err: any) {
          // ⛔ SE ACUMULAN TODOS LOS FALLOS, NO SOLO EL ULTIMO (2026-08-13).
          // Esto era `state.last_error = ...` a secas, asi que cada creador
          // pisaba el error del anterior y en pantalla solo quedaba UNO. Como
          // el bucle va `ORDER BY name` (Asier, Iker, Unai), el superviviente
          // era siempre Unai, y un fallo GLOBAL —el limit_too_high de
          // `/users/followers`, que reventaba en los tres— se leia como "le
          // pasa algo a la cuenta de Unai". Un error que miente sobre a quien
          // le pasa cuesta mas caro que no tener error.
          fallos.push(`${c.name}: ${err?.message}`);
          state.last_error = fallos.join(' · ').slice(0, 300);
          console.error(`[followerSync] ${c.name} failed:`, err?.message);
        }
        state.creators_done++;
      }
    } finally {
      state.running = false;
      state.phase = 'idle';
      state.current_creator = null;
      console.log(`[followerSync] done — ${state.new_followers_this_run} new follower(s) across ${state.creators_done} creator(s)`);
    }
  })();

  return { started: true };
}
