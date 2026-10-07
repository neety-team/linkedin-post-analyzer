import { Router, Request, Response } from 'express';
import { DiscoveredCreatorModel } from '../models/discoveredCreator';
import { CreatorModel } from '../models/creator';
import { unipileService } from '../services/unipile';
import { tagCreatorNiche } from '../services/nicheTagging';
import { normalizeLinkedInUrl, isValidLinkedInUrl } from '../utils/linkedin';
import { calculateEngagement, MIN_OUTLIER_ENGAGEMENT } from '../services/engagement';

const router = Router();

function paramId(req: Request): string {
  return paramId(req) as string;
}

// ─── Virality score formula ───────────────────────────────────────────────────
function computeViralityScore(avgEng: number, outlierCount: number, outlierRatioAvg: number): number {
  return avgEng * 0.40 + outlierCount * 200 * 0.35 + outlierRatioAvg * 100 * 0.25;
}

// ─── Core enrichment ─────────────────────────────────────────────────────────
async function enrichCreator(linkedinUrl: string, searchQuery?: string): Promise<void> {
  const normalized = normalizeLinkedInUrl(linkedinUrl);

  // 1. Fetch profile
  const rawProfile = await unipileService.getProfile(normalized);
  const profile = unipileService.normalizeProfile(rawProfile, normalized);

  if (!profile.linkedin_id) {
    throw new Error('Could not resolve LinkedIn internal ID from profile');
  }

  // 2. Fetch posts (last 90 days, max 30)
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rawPosts = await unipileService.getPosts(profile.linkedin_id, since);

  // Filter out reposts
  const originalPosts = rawPosts.filter((raw) => {
    if (raw.type === 'repost' || raw.type === 'RESHARE' || raw.type === 'reshare') return false;
    if (raw.is_repost || raw.is_reshare) return false;
    if (raw.reshared_post || raw.original_post) return false;
    return true;
  }).slice(0, 30);

  // 3. Compute engagement metrics
  const scores = originalPosts.map((raw) => {
    const likes = raw.reaction_counter ?? raw.likes_count ?? raw.reactions_count ?? 0;
    const comments = raw.comment_counter ?? raw.comments_count ?? 0;
    const reposts = raw.repost_counter ?? raw.reposts_count ?? raw.shares_count ?? 0;
    return calculateEngagement({ likes_count: likes, comments_count: comments, reposts_count: reposts });
  });

  const totalPosts = scores.length;
  const avgEngagement = totalPosts > 0 ? scores.reduce((a, b) => a + b, 0) / totalPosts : 0;
  const maxEngagement = totalPosts > 0 ? Math.max(...scores) : 0;

  // Outliers = posts with score >= 3x average AND past the absolute floor
  // (same rule as recalculateOutliers — a 20x on a 5-like post isn't a
  // real outlier and shouldn't inflate the virality score).
  const outlierScores = scores.filter(
    (s) => avgEngagement > 0 && s >= avgEngagement * 3 && s >= MIN_OUTLIER_ENGAGEMENT
  );
  const outlierCount = outlierScores.length;
  const outlierRatioAvg = totalPosts > 0
    ? scores.reduce((sum, s) => sum + (avgEngagement > 0 ? s / avgEngagement : 0), 0) / totalPosts
    : 0;

  const viralityScore = computeViralityScore(avgEngagement, outlierCount, outlierRatioAvg);

  // 4. AI niche tagging
  const postTexts = originalPosts
    .map((raw) => raw.text || raw.content || raw.body || '')
    .filter(Boolean);
  const nicheTags = await tagCreatorNiche(profile.headline || '', postTexts);

  // 5. Upsert
  await DiscoveredCreatorModel.upsert({
    linkedin_url: normalized,
    linkedin_id: profile.linkedin_id,
    name: profile.name,
    headline: profile.headline,
    followers_count: profile.followers_count,
    profile_image_url: profile.profile_image_url,
    location: profile.location,
    search_query: searchQuery ?? null,
    niche_tags: nicheTags,
    avg_engagement: Math.round(avgEngagement),
    max_engagement: Math.round(maxEngagement),
    outlier_count: outlierCount,
    outlier_ratio_avg: Math.round(outlierRatioAvg * 100) / 100,
    total_posts_sampled: totalPosts,
    virality_score: Math.round(viralityScore),
    enriched_at: new Date(),
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/discover/search — Search Unipile by keyword
router.post('/search', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Falta el texto de búsqueda' });
  }

  // Try Unipile search endpoint
  let searchResults: { linkedin_url: string }[] = [];
  try {
    const baseUrl = process.env.UNIPILE_BASE_URL || 'https://api18.unipile.com:14891';
    const apiKey = process.env.UNIPILE_API_KEY || '';
    const accountId = process.env.UNIPILE_ACCOUNT_ID || '';

    const params = new URLSearchParams({ account_id: accountId, keywords: query, limit: '20' });
    const searchRes = await fetch(`${baseUrl}/api/v1/search/people?${params.toString()}`, {
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    });

    if (!searchRes.ok) {
      const body = await searchRes.text();
      console.warn(`[Discover] Unipile search returned ${searchRes.status}: ${body}`);
      return res.status(422).json({
        error: 'La búsqueda de personas de Unipile no está disponible en tu plan. Añade los creadores por URL.',
        code: 'SEARCH_UNAVAILABLE',
      });
    }

    const data: any = await searchRes.json();
    const items: any[] = data.items || data.results || data.data || [];

    searchResults = items
      .map((item: any) => {
        const identifier = item.public_identifier || item.username || item.linkedin_identifier;
        if (!identifier) return null;
        return { linkedin_url: `https://www.linkedin.com/in/${identifier}/` };
      })
      .filter(Boolean) as { linkedin_url: string }[];

    console.log(`[Discover] Unipile search for "${query}" returned ${searchResults.length} results`);
  } catch (err: any) {
    console.error('[Discover] Search error:', err.message);
    return res.status(422).json({
      error: 'La búsqueda de personas de Unipile no está disponible. Añade los creadores por URL.',
      code: 'SEARCH_UNAVAILABLE',
    });
  }

  if (searchResults.length === 0) {
    return res.json({ message: 'Sin resultados', enriched: 0 });
  }

  // Enrich each result (sequential to avoid rate limits)
  let enriched = 0;
  const errors: string[] = [];
  for (const result of searchResults) {
    try {
      await enrichCreator(result.linkedin_url, query);
      enriched++;
    } catch (err: any) {
      console.error(`[Discover] Enrich failed for ${result.linkedin_url}:`, err.message);
      errors.push(`${result.linkedin_url}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  res.json({ message: 'Búsqueda completada', total: searchResults.length, enriched, errors: errors.slice(0, 5) });
});

// POST /api/discover/creators — Add a single creator by URL
router.post('/creators', async (req: Request, res: Response) => {
  const { linkedin_url } = req.body;
  if (!linkedin_url) return res.status(400).json({ error: 'Falta linkedin_url' });

  const normalized = normalizeLinkedInUrl(linkedin_url);
  if (!isValidLinkedInUrl(normalized)) {
    return res.status(400).json({ error: 'La URL de LinkedIn no es válida' });
  }

  try {
    await enrichCreator(normalized);
    const creator = await DiscoveredCreatorModel.findByUrl(normalized);
    res.status(201).json(creator);
  } catch (err: any) {
    console.error('[Discover] Add creator error:', err.message);
    res.status(422).json({ error: err.message });
  }
});

// GET /api/discover/creators — List all discovered creators
router.get('/creators', async (req: Request, res: Response) => {
  try {
    const { query, tag, sort } = req.query;
    const creators = await DiscoveredCreatorModel.findAll({
      query: typeof query === 'string' ? query : undefined,
      tag: typeof tag === 'string' ? tag : undefined,
      sortBy: typeof sort === 'string' ? sort : undefined,
    });
    res.json(creators);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discover/tags — All distinct niche tags
router.get('/tags', async (_req: Request, res: Response) => {
  try {
    const tags = await DiscoveredCreatorModel.allNicheTags();
    res.json(tags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/discover/creators/:id
router.delete('/creators/:id', async (req: Request, res: Response) => {
  try {
    await DiscoveredCreatorModel.delete(paramId(req));
    res.json({ message: 'Eliminado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discover/creators/:id/refresh — Re-enrich
router.post('/creators/:id/refresh', async (req: Request, res: Response) => {
  try {
    const creator = await DiscoveredCreatorModel.findById(paramId(req));
    if (!creator) return res.status(404).json({ error: 'Creador no encontrado' });

    await enrichCreator(creator.linkedin_url, creator.search_query ?? undefined);
    const updated = await DiscoveredCreatorModel.findById(paramId(req));
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discover/creators/:id/promote — Copy to main creators table
router.post('/creators/:id/promote', async (req: Request, res: Response) => {
  const id = paramId(req);
  try {
    console.log(`[Promote] Looking up discovered creator ${id}`);
    const discovered = await DiscoveredCreatorModel.findById(id);
    if (!discovered) {
      console.log(`[Promote] Not found: ${id}`);
      return res.status(404).json({ error: 'Creador no encontrado' });
    }
    console.log(`[Promote] Found: ${discovered.name} (${discovered.linkedin_url})`);

    // Check if already in dashboard
    const existing = await CreatorModel.findByUrl(discovered.linkedin_url);
    if (existing) {
      console.log(`[Promote] Already in dashboard: ${discovered.linkedin_url}`);
      return res.status(409).json({ error: 'Este creador ya está en el panel' });
    }

    // Create in main creators table
    console.log(`[Promote] Creating creator in dashboard...`);
    await CreatorModel.create({
      linkedin_url: discovered.linkedin_url,
      linkedin_id: discovered.linkedin_id,
      name: discovered.name,
      headline: discovered.headline,
      followers_count: Number(discovered.followers_count) || 0,
      connections_count: 0,
      profile_image_url: discovered.profile_image_url,
      location: discovered.location,
      timezone: null,
      utc_offset: null,
    });

    console.log(`[Promote] Done: ${discovered.name}`);
    res.status(201).json({ message: 'Añadido al panel', linkedin_url: discovered.linkedin_url });
  } catch (err: any) {
    console.error(`[Promote] Error for ${id}:`, err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

export default router;
