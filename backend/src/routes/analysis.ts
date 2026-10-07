import { Router, Request, Response } from 'express';
import { PostModel } from '../models/post';
import { CreatorModel } from '../models/creator';
import { detectPatterns, getCrossCreatorPatterns, generatePostExplanation, analyzeNarrativeRhythm, detectViralityDriver } from '../services/patterns';
import { formatUtcOffset } from '../utils/timezone';
import pool from '../db';

function paramId(req: Request): string {
  return req.params.id as string;
}

const router = Router();

// GET /api/creators/:id/stats
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const creator = await CreatorModel.findById(paramId(req));
    if (!creator) return res.status(404).json({ error: 'Creador no encontrado' });

    const stats = await PostModel.getStats(paramId(req));
    const contentDist = await PostModel.getContentTypeDistribution(paramId(req));
    const outlierContentDist = await PostModel.getContentTypeDistribution(paramId(req), true);

    // Calculate posting frequency
    const totalPosts = parseInt(stats.total_posts, 10) || 0;
    let postsPerWeek = 0;
    if (stats.first_post_date && stats.last_post_date && totalPosts > 0) {
      const weeks = Math.max(1,
        (new Date(stats.last_post_date).getTime() - new Date(stats.first_post_date).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
      );
      postsPerWeek = Math.round((totalPosts / weeks) * 10) / 10;
    }

    // Best day of week
    const allPosts = await PostModel.findByCreator(paramId(req), { limit: 10000 });
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayCounts: Record<number, { count: number; totalEngagement: number }> = {};
    for (const p of allPosts) {
      if (p.published_at) {
        const day = new Date(p.published_at).getDay();
        if (!dayCounts[day]) dayCounts[day] = { count: 0, totalEngagement: 0 };
        dayCounts[day].count++;
        dayCounts[day].totalEngagement += p.engagement_score;
      }
    }
    const bestDay = Object.entries(dayCounts)
      .sort((a, b) => b[1].totalEngagement / b[1].count - a[1].totalEngagement / a[1].count)[0];

    // Engagement rate relative to followers
    const engagementRate = creator.followers_count > 0
      ? Math.round((parseFloat(stats.avg_engagement || '0') / creator.followers_count) * 10000) / 100
      : 0;

    // Hook type breakdown — sorted by avg outlier ratio (primary), engagement as secondary
    const hookTypeCounts: Record<string, { count: number; totalEngagement: number; totalRatio: number }> = {};
    for (const p of allPosts) {
      const ht = p.hook_type || 'other';
      if (!hookTypeCounts[ht]) hookTypeCounts[ht] = { count: 0, totalEngagement: 0, totalRatio: 0 };
      hookTypeCounts[ht].count++;
      hookTypeCounts[ht].totalEngagement += p.engagement_score;
      hookTypeCounts[ht].totalRatio += p.outlier_ratio;
    }
    const hookTypeBreakdown = Object.entries(hookTypeCounts)
      .map(([type, data]) => ({
        type,
        count: data.count,
        avg_ratio: data.count > 0 ? Math.round((data.totalRatio / data.count) * 100) / 100 : 0,
        avg_engagement: data.count > 0 ? Math.round(data.totalEngagement / data.count) : 0,
      }))
      .sort((a, b) => b.avg_ratio - a.avg_ratio);

    // Structure breakdown — sorted by avg outlier ratio
    const structureCounts: Record<string, { count: number; totalEngagement: number; totalRatio: number }> = {};
    for (const p of allPosts) {
      const ps = p.post_structure || 'other';
      if (!structureCounts[ps]) structureCounts[ps] = { count: 0, totalEngagement: 0, totalRatio: 0 };
      structureCounts[ps].count++;
      structureCounts[ps].totalEngagement += p.engagement_score;
      structureCounts[ps].totalRatio += p.outlier_ratio;
    }
    const structureBreakdown = Object.entries(structureCounts)
      .map(([structure, data]) => ({
        structure,
        count: data.count,
        avg_ratio: data.count > 0 ? Math.round((data.totalRatio / data.count) * 100) / 100 : 0,
        avg_engagement: data.count > 0 ? Math.round(data.totalEngagement / data.count) : 0,
      }))
      .sort((a, b) => b.avg_ratio - a.avg_ratio);

    // Average engagement ratios
    const avgCommentLikeRatio = allPosts.length > 0
      ? Math.round(allPosts.reduce((s, p) => s + (p.comment_like_ratio || 0), 0) / allPosts.length * 1000) / 1000
      : 0;
    const avgShareLikeRatio = allPosts.length > 0
      ? Math.round(allPosts.reduce((s, p) => s + (p.share_like_ratio || 0), 0) / allPosts.length * 1000) / 1000
      : 0;

    // Day x Hour heatmap — avg engagement and outlier rate per slot
    // Convert to creator's local time if timezone is known
    const utcOffset = creator.utc_offset ?? 0;
    const dayHourMap: Record<string, { count: number; totalEng: number; outliers: number }> = {};
    for (const p of allPosts) {
      if (!p.published_at) continue;
      const d = new Date(p.published_at);
      // Apply UTC offset to get local time
      const localMs = d.getTime() + utcOffset * 60 * 60 * 1000;
      const localDate = new Date(localMs);
      const day = localDate.getUTCDay(); // 0=Sun (using UTC methods on the shifted date)
      const hour = localDate.getUTCHours();
      const key = `${day}-${hour}`;
      if (!dayHourMap[key]) dayHourMap[key] = { count: 0, totalEng: 0, outliers: 0 };
      dayHourMap[key].count++;
      dayHourMap[key].totalEng += p.engagement_score;
      if (p.is_outlier) dayHourMap[key].outliers++;
    }

    const timingHeatmap = Object.entries(dayHourMap).map(([key, v]) => {
      const [day, hour] = key.split('-').map(Number);
      return {
        day,
        hour,
        count: v.count,
        avg_engagement: v.count > 0 ? Math.round(v.totalEng / v.count) : 0,
        outliers: v.outliers,
        outlier_rate: v.count > 0 ? Math.round((v.outliers / v.count) * 100) : 0,
      };
    });

    // Best slots for outliers vs normal
    const bestSlots = [...timingHeatmap]
      .filter((s) => s.count >= 2)
      .sort((a, b) => b.avg_engagement - a.avg_engagement)
      .slice(0, 5);

    res.json({
      total_posts: totalPosts,
      total_outliers: parseInt(stats.total_outliers, 10) || 0,
      creator_location: creator.location || null,
      creator_timezone: creator.timezone || null,
      creator_utc_offset: creator.utc_offset ?? null,
      creator_utc_label: creator.utc_offset != null ? formatUtcOffset(creator.utc_offset) : 'UTC',
      avg_engagement: stats.avg_engagement ? Math.round(parseFloat(stats.avg_engagement)) : 0,
      median_engagement: stats.median_engagement ? Math.round(parseFloat(stats.median_engagement)) : 0,
      stddev_engagement: stats.stddev_engagement ? Math.round(parseFloat(stats.stddev_engagement)) : 0,
      outlier_rate: totalPosts > 0
        ? Math.round((parseInt(stats.total_outliers, 10) / totalPosts) * 100)
        : 0,
      posts_per_week: postsPerWeek,
      best_day: bestDay ? dayNames[parseInt(bestDay[0])] : null,
      engagement_rate: engagementRate,
      avg_comment_like_ratio: avgCommentLikeRatio,
      avg_share_like_ratio: avgShareLikeRatio,
      content_type_distribution: contentDist,
      outlier_content_type_distribution: outlierContentDist,
      hook_type_breakdown: hookTypeBreakdown,
      structure_breakdown: structureBreakdown,
      timing_heatmap: timingHeatmap,
      best_timing_slots: bestSlots,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creators/:id/timeline
router.get('/:id/timeline', async (req: Request, res: Response) => {
  try {
    const timeline = await PostModel.getTimeline(paramId(req));
    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creators/:id/daily-engagement
// Returns [{ day, engagement }] — engagement received per calendar day
// across all the creator's posts, computed from post_snapshots deltas.
router.get('/:id/daily-engagement', async (req: Request, res: Response) => {
  try {
    const daily = await PostModel.getDailyEngagement(paramId(req));
    res.json(daily);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creators/:id/patterns
router.get('/:id/patterns', async (req: Request, res: Response) => {
  try {
    const allPosts = await PostModel.findByCreator(paramId(req), { limit: 10000 });
    const patterns = detectPatterns(allPosts);
    res.json(patterns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analysis/compare?ids=uuid1,uuid2
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const ids = ((req.query.ids as string) || '').split(',').filter(Boolean);
    if (ids.length < 2) return res.status(400).json({ error: 'Indica al menos 2 IDs de creador' });

    const results = await Promise.all(ids.map(async (id) => {
      const creator = await CreatorModel.findById(id);
      if (!creator) return null;
      const stats = await PostModel.getStats(id);
      const posts = await PostModel.findByCreator(id, { limit: 10000 });
      const totalPosts = posts.length;

      let postsPerWeek = 0;
      if (stats.first_post_date && stats.last_post_date && totalPosts > 0) {
        const weeks = Math.max(1,
          (new Date(stats.last_post_date).getTime() - new Date(stats.first_post_date).getTime()) /
          (7 * 24 * 60 * 60 * 1000)
        );
        postsPerWeek = Math.round((totalPosts / weeks) * 10) / 10;
      }

      const outliers = posts.filter((p) => p.is_outlier);
      const engagementRate = creator.followers_count > 0
        ? Math.round((parseFloat(stats.avg_engagement || '0') / creator.followers_count) * 10000) / 100
        : 0;

      // Hook type distribution
      const hookTypes: Record<string, number> = {};
      for (const p of posts) {
        const ht = p.hook_type || 'other';
        hookTypes[ht] = (hookTypes[ht] || 0) + 1;
      }

      return {
        id: creator.id,
        name: creator.name,
        profile_image_url: creator.profile_image_url,
        followers_count: creator.followers_count,
        total_posts: totalPosts,
        total_outliers: outliers.length,
        outlier_rate: totalPosts > 0 ? Math.round((outliers.length / totalPosts) * 100) : 0,
        avg_engagement: stats.avg_engagement ? Math.round(parseFloat(stats.avg_engagement)) : 0,
        median_engagement: stats.median_engagement ? Math.round(parseFloat(stats.median_engagement)) : 0,
        engagement_rate: engagementRate,
        posts_per_week: postsPerWeek,
        avg_comment_like_ratio: Math.round(posts.reduce((s, p) => s + (p.comment_like_ratio || 0), 0) / Math.max(1, totalPosts) * 1000) / 1000,
        avg_share_like_ratio: Math.round(posts.reduce((s, p) => s + (p.share_like_ratio || 0), 0) / Math.max(1, totalPosts) * 1000) / 1000,
        hook_type_distribution: hookTypes,
      };
    }));

    res.json(results.filter(Boolean));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analysis/cross-creators
router.get('/cross-creators', async (_req: Request, res: Response) => {
  try {
    const topOutliers = await PostModel.getTopOutliersGlobal(500);

    // Get all posts for cross-creator patterns
    const creators = await CreatorModel.findAll();
    let allPosts: any[] = [];
    for (const c of creators) {
      const posts = await PostModel.findByCreator(c.id, { limit: 10000 });
      allPosts = allPosts.concat(posts);
    }

    // Build creator timezone map for local time conversion (IANA names so DST is handled)
    const creatorTimezones: Record<string, string> = {};
    for (const c of creators) {
      creatorTimezones[c.id] = c.timezone || 'UTC';
    }

    const patterns = getCrossCreatorPatterns(allPosts, creatorTimezones);

    // Add per-post deep analysis
    const enrichedOutliers = topOutliers.map((post: any) => {
      const explanation = generatePostExplanation(post);
      const rhythm = analyzeNarrativeRhythm(post);
      return {
        ...post,
        ai_explanation: explanation,
        narrative_rhythm: rhythm,
      };
    });

    res.json({ top_outliers: enrichedOutliers, patterns });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/creators/:id/export — CSV export of posts
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const creator = await CreatorModel.findById(paramId(req));
    if (!creator) return res.status(404).json({ error: 'Creador no encontrado' });

    const posts = await PostModel.findByCreator(paramId(req), { limit: 10000, sort: 'engagement_desc' });

    const headers = [
      'Fecha', 'Gancho', 'Tipo de gancho', 'Estructura', 'Tipo de contenido',
      'Reacciones', 'Comentarios', 'Compartidos', 'Puntuación de interacción', 'Multiplicador',
      'Es outlier', 'Palabras', 'Caracteres', 'Comentarios/reacciones',
      'Compartidos/reacciones', 'Tiene CTA', 'Tiene emoji', 'Tiene hashtags', 'Idioma', 'URL',
    ];

    const csvRows = [headers.join(',')];
    for (const p of posts) {
      const row = [
        p.published_at ? new Date(p.published_at).toISOString().split('T')[0] : '',
        `"${(p.hook_text || '').replace(/"/g, '""')}"`,
        p.hook_type || '',
        p.post_structure || '',
        p.content_type,
        p.likes_count,
        p.comments_count,
        p.reposts_count,
        p.engagement_score,
        p.outlier_ratio,
        p.is_outlier,
        p.word_count,
        p.char_count || 0,
        p.comment_like_ratio || 0,
        p.share_like_ratio || 0,
        p.has_call_to_action,
        p.has_emoji,
        p.has_hashtags,
        p.language || '',
        p.post_url || '',
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${(creator.name || 'creator').replace(/[^a-zA-Z0-9]/g, '_')}_posts.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// NOTE: /archetype-leaderboard and /classify-post were removed along with
// the Post Scorer/Checklist. The Post Creator already grounds generation
// in the same real outlier data, so the separate scoring layer (and its
// divergent ruleset) was redundant.

export default router;
