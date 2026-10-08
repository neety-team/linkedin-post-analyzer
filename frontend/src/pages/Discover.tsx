import { useState, useMemo } from 'react';
import { useApi, apiPost } from '../hooks/useApi';

const BASE = import.meta.env.VITE_API_URL || '';

interface DiscoveredCreator {
  id: string;
  linkedin_url: string;
  name: string | null;
  headline: string | null;
  profile_image_url: string | null;
  followers_count: number;
  location: string | null;
  niche_tags: string[];
  avg_engagement: number;
  max_engagement: number;
  outlier_count: number;
  outlier_ratio_avg: number;
  total_posts_sampled: number;
  virality_score: number;
  followers_prev: number | null;
  followers_prev_at: string | null;
  search_query: string | null;
  enriched_at: string | null;
}

type SortKey = 'virality_score' | 'avg_engagement' | 'followers_count' | 'outlier_count';

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

function FollowerGrowthBadge({ creator }: { creator: DiscoveredCreator }) {
  if (!creator.followers_prev || !creator.followers_prev_at) return null;
  const delta = creator.followers_count - creator.followers_prev;
  if (Math.abs(delta) < 10) return null;

  const days = Math.max(
    1,
    Math.round((Date.now() - new Date(creator.followers_prev_at).getTime()) / (1000 * 60 * 60 * 24))
  );
  const perMonth = Math.round((delta / days) * 30);
  if (Math.abs(perMonth) < 50) return null;

  const positive = perMonth > 0;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${positive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
      {positive ? '+' : ''}{formatK(perMonth)}/mes
    </span>
  );
}

function CreatorCard({
  creator,
  onDelete,
  onPromote,
  onRefresh,
}: {
  creator: DiscoveredCreator;
  onDelete: (id: string) => void;
  onPromote: (id: string) => void;
  onRefresh: (id: string) => void;
}) {
  const [promoting, setPromoting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [promoted, setPromoted] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const handlePromote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPromoting(true);
    setPromoteError(null);
    try {
      await apiPost(`/api/discover/creators/${creator.id}/promote`, {});
      setPromoted(true);
      onPromote(creator.id);
    } catch (err: any) {
      if (err.message?.includes('ya está en el panel')) {
        setPromoted(true);
      } else {
        setPromoteError(err.message || 'Error al añadir al panel');
        setTimeout(() => setPromoteError(null), 5000);
      }
    } finally {
      setPromoting(false);
    }
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshing(true);
    try {
      await fetch(`${BASE}/api/discover/creators/${creator.id}/refresh`, { method: 'POST' });
      onRefresh(creator.id);
    } catch {}
    setRefreshing(false);
  };

  const viralityColor = creator.virality_score >= 10000
    ? 'text-diamond'
    : creator.virality_score >= 3000
      ? 'text-accent'
      : 'text-text-secondary';

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 hover:border-accent/30 transition-all group relative">
      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); if (confirm('¿Quitar de Descubrir?')) onDelete(creator.id); }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all text-sm px-1"
        title="Quitar"
      >
        ✕
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {creator.profile_image_url ? (
          <img src={creator.profile_image_url} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-base flex-shrink-0">
            {(creator.name || '?')[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text-primary truncate">{creator.name || 'Desconocido'}</span>
            <FollowerGrowthBadge creator={creator} />
          </div>
          <p className="text-text-secondary text-xs truncate">{creator.headline || '--'}</p>
          {creator.location && <p className="text-text-muted text-[11px] truncate">{creator.location}</p>}
        </div>
      </div>

      {/* Niche tags */}
      {creator.niche_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {creator.niche_tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 text-center mb-4">
        <div className="bg-bg-secondary rounded-lg p-2">
          <p className="text-text-muted text-[10px]">Viralidad</p>
          <p className={`font-bold text-sm ${viralityColor}`}>{formatK(Math.round(creator.virality_score))}</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-2">
          <p className="text-text-muted text-[10px]">Interacc. media</p>
          <p className="text-text-primary font-bold text-sm">{formatK(creator.avg_engagement)}</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-2">
          <p className="text-text-muted text-[10px]">Outliers</p>
          <p className="text-accent font-bold text-sm">{creator.outlier_count}</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-2">
          <p className="text-text-muted text-[10px]">Seguidores</p>
          <p className="text-text-primary font-bold text-sm">{creator.followers_count > 0 ? formatK(creator.followers_count) : '--'}</p>
        </div>
      </div>

      <p className="text-[10px] text-text-muted mb-3">
        {creator.total_posts_sampled} posts analizados
        {creator.enriched_at ? ` · ${new Date(creator.enriched_at).toLocaleDateString('es-ES')}` : ''}
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handlePromote}
          disabled={promoting || promoted}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            promoted
              ? 'bg-success/20 text-success cursor-default'
              : 'bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-50'
          }`}
        >
          {promoted ? '✓ En el panel' : promoting ? 'Añadiendo…' : '+ Panel'}
        </button>
        <a
          href={creator.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg text-xs text-text-muted border border-border hover:border-accent/30 hover:text-text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          ↗
        </a>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 rounded-lg text-xs text-text-muted border border-border hover:border-accent/30 hover:text-text-primary transition-colors disabled:opacity-50"
          title="Actualizar datos"
        >
          {refreshing ? '…' : '↻'}
        </button>
      </div>
      {promoteError && (
        <p className="text-[11px] text-danger mt-2">{promoteError}</p>
      )}
    </div>
  );
}

export default function Discover() {
  const { data: creators, loading, refetch } = useApi<DiscoveredCreator[]>('/api/discover/creators');

  const [searchQuery, setSearchQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [searchUnavailable, setSearchUnavailable] = useState(false);
  const [filterTag, setFilterTag] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('virality_score');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result: any = await apiPost('/api/discover/search', { query: searchQuery.trim() });
      if (result.code === 'SEARCH_UNAVAILABLE') {
        setSearchUnavailable(true);
        showStatus('La búsqueda de Unipile no está disponible en tu plan. Añade los creadores por URL.', 'error');
      } else {
        showStatus(`✓ ${result.enriched} de ${result.total} creadores enriquecidos`, 'success');
        refetch();
      }
    } catch (err: any) {
      if (err.message?.includes('SEARCH_UNAVAILABLE') || err.message?.includes('no está disponible')) {
        setSearchUnavailable(true);
        showStatus('La búsqueda de Unipile no está disponible. Añade los creadores por URL.', 'error');
      } else {
        showStatus(err.message, 'error');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setIsAddingUrl(true);
    try {
      await apiPost('/api/discover/creators', { linkedin_url: urlInput.trim() });
      setUrlInput('');
      showStatus('Creador añadido y enriquecido', 'success');
      refetch();
    } catch (err: any) {
      showStatus(err.message, 'error');
    } finally {
      setIsAddingUrl(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${BASE}/api/discover/creators/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showStatus(data.error || `Error ${res.status}`, 'error');
        return;
      }
      refetch();
    } catch (err: any) {
      showStatus(err.message || 'No se pudo eliminar', 'error');
    }
  };

  // Collect all tags from current creators
  const allTags = useMemo(() => {
    if (!creators) return [];
    const tagSet = new Set<string>();
    creators.forEach((c) => c.niche_tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [creators]);

  const filtered = useMemo(() => {
    if (!creators) return [];
    let list = creators;
    if (filterTag) list = list.filter((c) => c.niche_tags.includes(filterTag));
    return [...list].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
  }, [creators, filterTag, sortBy]);

  const SORT_LABELS: [SortKey, string][] = [
    ['virality_score', 'Viralidad'],
    ['avg_engagement', 'Interacciones'],
    ['followers_count', 'Seguidores'],
    ['outlier_count', 'Outliers'],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Descubrir</h1>
        <p className="text-text-secondary">Encuentra creadores de LinkedIn y ordénalos por nicho y viralidad.</p>
      </div>

      {/* Search + Add URL */}
      <div className="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        {/* Keyword search */}
        {!searchUnavailable && (
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Buscar por tema o nicho</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="p. ej. ventas B2B, growth marketing, startups de IA…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="px-5 py-2 bg-accent text-on-accent rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-accent-strong transition-colors"
              >
                {isSearching ? 'Buscando…' : 'Buscar'}
              </button>
            </div>
          </div>
        )}

        {/* Manual URL */}
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Añadir por URL de LinkedIn</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://www.linkedin.com/in/usuario/"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleAddUrl}
              disabled={isAddingUrl || !urlInput.trim()}
              className="px-5 py-2 bg-bg-secondary border border-border text-text-primary rounded-lg text-sm disabled:opacity-50 hover:border-accent/40 transition-colors"
            >
              {isAddingUrl ? 'Añadiendo…' : '+ Añadir'}
            </button>
          </div>
        </div>

        {/* Status message */}
        {statusMsg && (
          <p className={`text-sm ${statusMsg.type === 'error' ? 'text-danger' : statusMsg.type === 'success' ? 'text-success' : 'text-text-secondary'}`}>
            {statusMsg.text}
          </p>
        )}
      </div>

      {/* Filters + Sort */}
      {creators && creators.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterTag('')}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                  !filterTag ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-bg-secondary text-text-muted border border-border hover:border-accent/30'
                }`}
              >
                Todos
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                    filterTag === tag ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-bg-secondary text-text-muted border border-border hover:border-accent/30'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-text-muted text-xs">Ordenar por:</span>
            {SORT_LABELS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  sortBy === key
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-bg-secondary text-text-muted border border-border hover:border-accent/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-bg-secondary rounded w-2/3" />
                  <div className="h-2 bg-bg-secondary rounded w-full" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1,2,3,4].map((j) => <div key={j} className="h-12 bg-bg-secondary rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && creators && creators.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-4">🔍</p>
          <p className="mb-2">Aún no has descubierto ningún creador.</p>
          <p className="text-sm">Busca arriba por tema o añade una URL de LinkedIn para empezar.</p>
        </div>
      )}

      {/* Creators grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onDelete={handleDelete}
              onPromote={() => {}}
              onRefresh={refetch}
            />
          ))}
        </div>
      )}

      {/* Filtered empty */}
      {!loading && creators && creators.length > 0 && filtered.length === 0 && (
        <p className="text-center text-text-muted py-8">Ningún creador coincide con el filtro seleccionado.</p>
      )}
    </div>
  );
}
