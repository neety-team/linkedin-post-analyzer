import pool from '../db';
import { unipileService } from './unipile';
import { CreatorModel } from '../models/creator';
import { extractViewerTimestamps } from '../utils/wvmp';

// Captures today's follower + profile-view snapshots for a single managed
// creator. Idempotent: re-running on the same calendar day overwrites the
// existing row (unique constraint on creator_id + captured_on). Returns the
// resolved providerId so callers can chain into a post scrape without
// re-fetching the profile.
//
// Lives in a dedicated service (rather than in routes/accounts.ts) so both
// the HTTP handlers AND the background ticker in postMonitor can call it
// without pulling in a circular import between routes ↔ services.
export async function captureAccountSnapshots(
  creatorId: string,
  opts: { skipViewers?: boolean } = {}
): Promise<{
  ok: boolean;
  providerId: string | null;
  followers: number | null;
  views: number | null;
  pages: number | null;
  pagingTotal: number | null;
  viewsError: string | null;
}> {
  // skipViewers: skip the WVMP (who-viewed-my-profile) fetch, which pages
  // through LinkedIn Voyager up to 20 times and can take 20-40s per account.
  // The Refresh-posts button passes this — it only needs the post scrape +
  // a fast follower count, NOT the slow profile-views snapshot (that's owned
  // by the 6-hourly accountSnapshotTick and the dedicated profile-views
  // refresh button). Leaving WVMP in the post-refresh path was the reason a
  // single click took 1min+.
  const { skipViewers = false } = opts;
  const creator = await CreatorModel.findById(creatorId);
  if (!creator) {
    return { ok: false, providerId: null, followers: null, views: null, pages: null, pagingTotal: null, viewsError: null };
  }
  const accountIdOverride = (creator as any).unipile_account_id as string | null;
  if (!accountIdOverride) {
    return {
      ok: false,
      providerId: creator.linkedin_id ?? null,
      followers: null,
      views: null,
      pages: null,
      pagingTotal: null,
      viewsError: null,
    };
  }

  let providerId = creator.linkedin_id;
  let latestFollowers: number | null = null;
  try {
    const rawProfile = await unipileService.getProfile(creator.linkedin_url, accountIdOverride);
    const normalized = unipileService.normalizeProfile(rawProfile, creator.linkedin_url);
    if (!providerId && normalized.linkedin_id) providerId = normalized.linkedin_id;
    // > 0 y no >= 0 (2026-09-17): normalizeProfile devuelve 0 cuando Unipile no
    // trae el campo, y Unipile da ceros a ratos. Una cuenta con miles de
    // seguidores no se queda en 0: guardarlo pintaba -8.000 un dia y +8.000 el
    // siguiente en la grafica y en el mes. Sin dato, se usa el ultimo bueno.
    if (typeof normalized.followers_count === 'number' && normalized.followers_count > 0) {
      latestFollowers = normalized.followers_count;
    }
    const updates: Record<string, any> = {};
    if (!creator.linkedin_id && normalized.linkedin_id) updates.linkedin_id = normalized.linkedin_id;
    if (latestFollowers != null) updates.followers_count = latestFollowers;
    // La foto SIEMPRE se reescribe si Unipile trae una (Iker, 2026-07-30). Las
    // URLs de media.licdn.com estan FIRMADAS y CADUCAN: pasadas unas semanas
    // devuelven 403 deny-expired-url y los avatares de las 3 cuentas
    // desaparecen de golpe, que es justo lo que asusto (parecia un problema de
    // credenciales o de trackeo y era solo la imagen). Aqui ya teniamos el
    // perfil recien pedido, asi que refrescarla no cuesta ni una llamada mas:
    // faltaba guardarla. Con esto se auto-repara en cada snapshot.
    if (normalized.profile_image_url) updates.profile_image_url = normalized.profile_image_url;
    if (Object.keys(updates).length > 0) {
      await CreatorModel.update(creator.id, updates as any);
    }
  } catch (err) {
    console.warn(
      '[accountSnapshots] profile fetch failed, continuing with cached data:',
      (err as Error).message
    );
  }
  if (latestFollowers == null && typeof creator.followers_count === 'number' && creator.followers_count > 0) {
    latestFollowers = creator.followers_count;
  }

  if (latestFollowers != null) {
    await pool.query(
      `INSERT INTO creator_follower_snapshots (creator_id, captured_on, captured_at, followers_count)
         VALUES ($1, CURRENT_DATE, NOW(), $2)
       ON CONFLICT (creator_id, captured_on) DO UPDATE
         SET followers_count = EXCLUDED.followers_count,
             captured_at = NOW()`,
      [creator.id, latestFollowers]
    );
  }

  let viewsCount: number | null = null;
  let pages: number | null = null;
  let pagingTotal: number | null = null;
  let viewsError: string | null = null;
  if (skipViewers) {
    return {
      ok: true,
      providerId: providerId ?? null,
      followers: latestFollowers,
      views: null,
      pages: null,
      pagingTotal: null,
      viewsError: null,
    };
  }
  try {
    const wvmpStart = Date.now();
    const wvmp = await unipileService.getProfileViewers(accountIdOverride);
    console.log(`[accountSnapshots] WVMP fetch for ${creatorId} took ${Date.now() - wvmpStart}ms`);
    if (wvmp) {
      viewsCount = wvmp.count;
      pages = wvmp.pages;
      pagingTotal = wvmp.pagingTotal;
      // We deliberately NO LONGER persist wvmp.raw — for accounts with full
      // Premium history that payload is several MB of JSON (one object per
      // viewer × hundreds of viewers × daily snapshots), and writing it on
      // every scrape was triggering silent insert failures (timeouts /
      // pg-pool buffer issues). The raw is only useful for debugging, and
      // /wvmp-debug-all already pulls it live on demand. Setting NULL on
      // the existing column keeps the schema stable.
      //
      // viewer_timestamps DOES get persisted: it's a compact BIGINT[] of
      // ms-epoch viewedAt values (≤1000 entries × 8 bytes ≤ 8 KB), and is
      // what the chart uses to bucket "new viewers per day" instead of
      // plotting the rolling feed size (which produced flat stretches and
      // didn't match LinkedIn's UI numbers).
      const viewerTimestamps = extractViewerTimestamps(wvmp.raw);
      await pool.query(
        `INSERT INTO creator_profile_view_snapshots
           (creator_id, captured_on, captured_at, views_count, raw_response, viewer_timestamps)
         VALUES ($1, CURRENT_DATE, NOW(), $2, NULL, $3::bigint[])
         ON CONFLICT (creator_id, captured_on) DO UPDATE
           SET views_count = EXCLUDED.views_count,
               raw_response = NULL,
               viewer_timestamps = EXCLUDED.viewer_timestamps,
               captured_at = NOW()`,
        [creator.id, wvmp.count, viewerTimestamps]
      );
    }
  } catch (err) {
    // Promote from console.warn to console.error — we were swallowing real
    // failures (the silent reason this whole thing has been stuck). The
    // error message also rides back in the return so callers (e.g. the
    // capture-now route) can surface it to the user.
    viewsError = (err as Error).message;
    console.error('[accountSnapshots] profile-view snapshot failed:', err);
  }

  return {
    ok: true,
    providerId: providerId ?? null,
    followers: latestFollowers,
    views: viewsCount,
    pages,
    pagingTotal,
    viewsError,
  };
}
