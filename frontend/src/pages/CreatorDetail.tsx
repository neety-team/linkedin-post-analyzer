import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SkeletonChart } from '../components/Skeleton';
import EngagementChart from '../components/EngagementChart';
import ContentTypeBreakdown from '../components/ContentTypeBreakdown';
import ConsistencyHeatmap from '../components/ConsistencyHeatmap';
import PatternInsights from '../components/PatternInsights';
import OutlierTable from '../components/OutlierTable';
import HookTypeChart from '../components/HookTypeChart';
import StructureChart from '../components/StructureChart';
import TimingHeatmap from '../components/TimingHeatmap';

const BASE = import.meta.env.VITE_API_URL || '';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  if (!res.ok) {
    let msg = `Error de la API ${res.status}`;
    try { msg = JSON.parse(text).error || msg; } catch {}
    throw new Error(msg);
  }
  return JSON.parse(text);
}

interface Creator {
  id: string;
  name: string | null;
  headline: string | null;
  profile_image_url: string | null;
  followers_count: number;
  linkedin_url: string;
  location: string | null;
  timezone: string | null;
  utc_offset: number | null;
}

interface Stats {
  total_posts: number;
  total_outliers: number;
  avg_engagement: number;
  median_engagement: number;
  stddev_engagement: number;
  outlier_rate: number;
  posts_per_week: number;
  best_day: string | null;
  engagement_rate: number;
  avg_comment_like_ratio: number;
  avg_share_like_ratio: number;
  content_type_distribution: { content_type: string; count: string }[];
  outlier_content_type_distribution: { content_type: string; count: string }[];
  hook_type_breakdown: { type: string; count: number; avg_ratio: number; avg_engagement: number }[];
  structure_breakdown: { structure: string; count: number; avg_ratio: number; avg_engagement: number }[];
  timing_heatmap: { day: number; hour: number; count: number; avg_engagement: number; outliers: number; outlier_rate: number }[];
  best_timing_slots: { day: number; hour: number; count: number; avg_engagement: number; outliers: number; outlier_rate: number }[];
  creator_location: string | null;
  creator_timezone: string | null;
  creator_utc_offset: number | null;
  creator_utc_label: string;
}

interface AllData {
  creator: Creator;
  stats: Stats;
  timeline: { published_at: string; engagement_score: number; is_outlier: boolean; content_type: string; hook_text: string | null; hook_type?: string; outlier_ratio?: number; post_url?: string | null; content_text?: string | null }[];
  dailyEngagement: { day: string; engagement: number }[];
  patterns: { type: string; title: string; value: string; detail: string }[];
  outlierPosts: any[];
  allPosts: any[];
}

export default function CreatorDetail() {
  const { id } = useParams();
  const [data, setData] = useState<AllData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshPhase, setRefreshPhase] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const creator = await fetchJson<Creator>(`/api/creators/${id}`);
        if (cancelled) return;

        const [stats, timeline, dailyEngagement, patterns, outlierRes, allRes] = await Promise.all([
          fetchJson<Stats>(`/api/creators/${id}/stats`),
          fetchJson<any[]>(`/api/creators/${id}/timeline`),
          fetchJson<{ day: string; engagement: number }[]>(`/api/creators/${id}/daily-engagement`),
          fetchJson<any[]>(`/api/creators/${id}/patterns`),
          fetchJson<{ posts: any[] }>(`/api/creators/${id}/posts?outliers_only=true&limit=100`),
          fetchJson<{ posts: any[] }>(`/api/creators/${id}/posts?limit=100&sort=engagement_desc`),
        ]);

        if (cancelled) return;
        setData({ creator, stats, timeline, dailyEngagement, patterns, outlierPosts: outlierRes.posts, allPosts: allRes.posts });
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, loadKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshPhase('Leyendo de LinkedIn el perfil y los posts...');
    try {
      const res = await fetch(`${BASE}/api/creators/${id}/refresh`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `No se pudo actualizar (${res.status})`);
      }
      setRefreshPhase('Recargando las estadísticas...');
      // Reload all data
      setLoadKey((k) => k + 1);
    } catch (err: any) {
      setError(err.message);
    }
    setRefreshing(false);
    setRefreshPhase(null);
  };

  const handleExport = () => {
    window.open(`${BASE}/api/creators/${id}/export`, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Creador no encontrado.</p>
        {error && <p className="text-danger text-sm mt-2">{error}</p>}
      </div>
    );
  }

  const { creator, stats, timeline, dailyEngagement, patterns, outlierPosts, allPosts } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bg-card rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex items-center gap-4 flex-1">
          {creator.profile_image_url ? (
            <img src={creator.profile_image_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-2xl">
              {(creator.name || '?')[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{creator.name || 'Desconocido'}</h1>
            <p className="text-text-secondary text-sm">{creator.headline || '--'}</p>
            <p className="text-text-muted text-xs mt-1">
              {creator.followers_count > 0 ? `${creator.followers_count.toLocaleString('es-ES')} seguidores` : 'Seguidores desconocidos'}
              {creator.location && <span className="ml-2">· {creator.location}</span>}
              {stats.creator_utc_label && stats.creator_utc_label !== 'UTC' && <span className="ml-1 text-accent">({stats.creator_utc_label})</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
          >
            Exportar CSV
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-accent transition-colors disabled:opacity-50"
          >
            {refreshing ? 'Actualizando...' : 'Actualizar datos'}
          </button>
        </div>
      </div>

      {/* Refresh progress bar */}
      {refreshing && refreshPhase && (
        <div className="bg-bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">{refreshPhase}</span>
          </div>
          <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full bg-accent animate-pulse" style={{ width: '100%', opacity: 0.6 }} />
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Interacciones medias', value: stats.avg_engagement.toLocaleString('es-ES') },
          { label: 'Mediana', value: stats.median_engagement.toLocaleString('es-ES') },
          { label: 'Posts totales', value: stats.total_posts },
          { label: 'Outliers', value: stats.total_outliers, accent: true },
          { label: 'Posts/semana', value: stats.posts_per_week },
          { label: '% de outliers', value: `${stats.outlier_rate}%`, accent: true },
          { label: 'Tasa de interacción', value: stats.engagement_rate > 0 ? `${stats.engagement_rate}%` : 'N/D', accent: stats.engagement_rate > 0 },
          { label: 'Comentarios/reacciones', value: stats.avg_comment_like_ratio > 0 ? `${Math.round(stats.avg_comment_like_ratio * 100)}%` : 'N/D' },
        ].map((kpi, i) => (
          <div key={i} className="bg-bg-card rounded-lg p-4 text-center">
            <p className="text-text-muted text-xs mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.accent ? 'text-accent' : 'text-text-primary'}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {timeline.length > 0 && (
        <EngagementChart data={timeline} dailyEngagement={dailyEngagement} avgEngagement={stats.avg_engagement} />
      )}

      {/* Hook Type + Structure Breakdown */}
      {stats.hook_type_breakdown && stats.hook_type_breakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HookTypeChart data={stats.hook_type_breakdown} />
          <StructureChart data={stats.structure_breakdown || []} />
        </div>
      )}

      {/* Optimal Timing */}
      {stats.timing_heatmap && stats.timing_heatmap.length > 0 && (
        <TimingHeatmap
          heatmap={stats.timing_heatmap}
          bestSlots={stats.best_timing_slots || []}
          timezoneLabel={stats.creator_utc_label || 'UTC'}
          location={stats.creator_location || undefined}
        />
      )}

      {/* Content Type + Posting Consistency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContentTypeBreakdown
          all={stats.content_type_distribution}
          outliers={stats.outlier_content_type_distribution}
        />
        {timeline.length > 0 && <ConsistencyHeatmap data={timeline} />}
      </div>

      {/* Patterns */}
      {patterns.length > 0 && <PatternInsights patterns={patterns} />}

      {/* Outlier posts table */}
      {outlierPosts.length > 0 && (
        <OutlierTable
          posts={outlierPosts}
          title="Posts outlier"
          creatorName={creator.name}
          creatorHeadline={creator.headline}
        />
      )}

      {/* All posts table */}
      {allPosts.length > 0 && (
        <OutlierTable
          posts={allPosts}
          title="Todos los posts"
          creatorName={creator.name}
          creatorHeadline={creator.headline}
        />
      )}
    </div>
  );
}
