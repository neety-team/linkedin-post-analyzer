import { useState, useMemo } from 'react';
import { useApi, apiDelete } from '../hooks/useApi';
import CreatorForm from '../components/CreatorForm';
import { SkeletonCard } from '../components/Skeleton';
import { Link } from 'react-router-dom';
import { useChartColors } from '../theme';

const BASE = import.meta.env.VITE_API_URL || '';

interface Creator {
  id: string;
  name: string | null;
  headline: string | null;
  profile_image_url: string | null;
  followers_count: number;
  location: string | null;
  timezone: string | null;
  utc_offset: number | null;
  last_scraped_at: string | null;
  total_posts: number;
  total_outliers: number;
  avg_engagement: number;
}

type SortKey = 'name' | 'total_posts' | 'total_outliers' | 'avg_engagement' | 'followers_count' | 'last_scraped_at';

function ReclassifyButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ total: number; updated: number } | null>(null);

  const run = async () => {
    setState('loading');
    try {
      const res = await fetch(`${BASE}/api/creators/reclassify`, { method: 'POST' });
      const data = await res.json();
      setResult(data);
      setState('done');
      setTimeout(() => setState('idle'), 6000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  if (state === 'done' && result) return (
    <span className="text-xs text-success">✓ {result.updated} posts reclasificados de {result.total}</span>
  );
  if (state === 'error') return (
    <span className="text-xs text-danger">Error al reclasificar</span>
  );

  return (
    <button
      onClick={run}
      disabled={state === 'loading'}
      title="Relee los datos en bruto de todos los posts y corrige su tipo (imagen/vídeo/texto)"
      className="px-3 py-2 bg-bg-card border border-border text-text-muted text-xs rounded-lg hover:border-accent/40 hover:text-text-secondary disabled:opacity-50 transition-colors"
    >
      {state === 'loading' ? 'Reclasificando…' : '🔄 Corregir tipos'}
    </button>
  );
}

export default function Dashboard() {
  const cc = useChartColors();
  const { data: creators, loading, error, refetch } = useApi<Creator[]>('/api/creators');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [rowRefreshing, setRowRefreshing] = useState<string | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number; currentName: string | null; errors: number } | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('avg_engagement');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState('');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!creators) return;
    if (selectedIds.size === creators.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(creators.map((c) => c.id)));
    }
  };

  const handleBatchRefresh = async () => {
    if (!creators) return;
    setRefreshing(true);

    // Determine which creators to refresh
    const toRefresh = selectedIds.size > 0
      ? creators.filter((c) => selectedIds.has(c.id))
      : creators;

    const total = toRefresh.length;
    let completed = 0;
    let errors = 0;
    setRefreshProgress({ current: 0, total, currentName: null, errors: 0 });

    // Concurrency pool — N refreshes in flight at once instead of strictly
    // one-by-one. Combined with the backend's incremental scrape (it stops
    // paginating at the first already-stored post), a 120-creator refresh
    // goes from ~40 min to a couple of minutes. Kept at 3 (not higher) so
    // we don't trip Unipile's rate limit — that was causing the 500s; the
    // backend now also retries 429/5xx with backoff as a second safety net.
    const CONCURRENCY = 3;
    let next = 0;
    const worker = async () => {
      // `next++` is atomic between awaits (single-threaded JS), so each
      // worker pulls a distinct index — no double-processing.
      while (true) {
        const idx = next++;
        if (idx >= total) return;
        const creator = toRefresh[idx];
        try {
          const res = await fetch(`${BASE}/api/creators/${creator.id}/refresh`, { method: 'POST' });
          if (!res.ok) errors++;
        } catch {
          errors++;
        } finally {
          completed++;
          setRefreshProgress({ current: completed, total, currentName: creator.name || 'Desconocido', errors });
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker())
    );

    setRefreshProgress({ current: total, total, currentName: null, errors });
    refetch();

    // Clear progress after a few seconds
    setTimeout(() => {
      setRefreshProgress(null);
    }, 3000);
    setRefreshing(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('¿Eliminar este creador y todos sus datos?')) return;
    try {
      await apiDelete(`/api/creators/${id}`);
      refetch();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Per-row refresh — same endpoint as the "open profile → refresh" flow,
  // exposed directly in the list so you don't have to enter each profile.
  const handleRowRefresh = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (rowRefreshing) return;
    setRowRefreshing(id);
    try {
      const res = await fetch(`${BASE}/api/creators/${id}/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      refetch();
    } catch (err: any) {
      alert(`No se pudo actualizar: ${err.message}`);
    } finally {
      setRowRefreshing(null);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    if (!creators) return [];
    let filtered = creators;
    if (filter) {
      const q = filter.toLowerCase();
      filtered = creators.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.headline || '').toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      if (sortBy === 'name') {
        av = (a.name || '').toLowerCase();
        bv = (b.name || '').toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (sortBy === 'last_scraped_at') {
        av = a.last_scraped_at ? new Date(a.last_scraped_at).getTime() : 0;
        bv = b.last_scraped_at ? new Date(b.last_scraped_at).getTime() : 0;
      } else {
        av = (a as any)[sortBy] || 0;
        bv = (b as any)[sortBy] || 0;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [creators, sortBy, sortDir, filter]);

  const sortIcon = (key: SortKey) => {
    if (sortBy !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Panel</h1>
        <p className="text-text-secondary">Añade un creador de LinkedIn para analizar sus outliers.</p>
      </div>

      <CreatorForm onCreated={refetch} />

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 text-danger text-sm">{error}</div>
      )}

      {loading && !creators && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {creators && creators.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-4">📊</p>
          <p>Aún no hay creadores analizados. Pega arriba una URL de LinkedIn para empezar.</p>
        </div>
      )}

      {creators && creators.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              type="text"
              placeholder="Buscar por nombre o titular..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent w-full sm:w-64"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-text-muted text-xs">Ordenar por:</span>
              {([
                ['avg_engagement', 'Interacciones'],
                ['total_outliers', 'Outliers'],
                ['total_posts', 'Posts'],
                ['followers_count', 'Seguidores'],
                ['name', 'Nombre'],
                ['last_scraped_at', 'Última actualización'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    sortBy === key
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-bg-secondary text-text-muted border border-border hover:border-accent/30'
                  }`}
                >
                  {label}{sortIcon(key)}
                </button>
              ))}
            </div>
          </div>

          {/* Batch actions */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                {selectedIds.size === creators.length ? 'Quitar selección' : 'Seleccionar todos'}
              </button>
              <button
                onClick={handleBatchRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-accent text-on-accent rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-accent-strong transition-colors"
              >
                {refreshing
                  ? 'Actualizando...'
                  : selectedIds.size > 0
                    ? `Actualizar ${selectedIds.size} seleccionado${selectedIds.size === 1 ? '' : 's'}`
                    : 'Actualizar todos'}
              </button>
              <ReclassifyButton />
            </div>

            {/* Progress bar */}
            {refreshProgress && (
              <div className="bg-bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">
                    {refreshProgress.current < refreshProgress.total
                      ? `Actualizando: ${refreshProgress.currentName}`
                      : `¡Hecho! ${refreshProgress.total - refreshProgress.errors}/${refreshProgress.total} actualizados`}
                  </span>
                  <span className="text-xs text-text-muted">
                    {refreshProgress.current}/{refreshProgress.total}
                    {refreshProgress.errors > 0 && (
                      <span className="text-danger ml-1">({refreshProgress.errors} {refreshProgress.errors === 1 ? 'error' : 'errores'})</span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${refreshProgress.total > 0 ? (refreshProgress.current / refreshProgress.total) * 100 : 0}%`,
                      backgroundColor: refreshProgress.current >= refreshProgress.total ? cc.success : cc.accent,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Creator grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.map((creator) => (
              <div key={creator.id} className="relative">
                {/* Checkbox */}
                <label
                  className="absolute top-4 left-4 z-10 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(creator.id)}
                    onChange={() => toggleSelect(creator.id)}
                    className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                  />
                </label>
                <Link
                  to={`/creator/${creator.id}`}
                  className="block bg-bg-card rounded-xl p-6 pl-12 border border-border hover:border-accent/30 cursor-pointer transition-all hover:shadow-lg hover:shadow-accent/5 group no-underline text-inherit"
                >
                  <div className="flex items-center gap-4 mb-4">
                    {creator.profile_image_url ? (
                      <img src={creator.profile_image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
                        {(creator.name || '?')[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                        {creator.name || 'Desconocido'}
                      </h3>
                      <p className="text-text-secondary text-sm truncate">{creator.headline || '--'}</p>
                      {creator.location && (
                        <p className="text-text-muted text-xs truncate">{creator.location}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleRowRefresh(creator.id, e)}
                      disabled={rowRefreshing === creator.id}
                      className="flex items-center gap-1 text-[11px] text-text-muted hover:text-accent border border-border hover:border-accent/40 rounded-md px-2 py-1 transition-all disabled:opacity-60 disabled:cursor-wait whitespace-nowrap"
                      title="Actualizar este perfil ahora"
                    >
                      {rowRefreshing === creator.id ? '↻ Actualizando…' : '↻ Actualizar'}
                    </button>
                    <button
                      onClick={(e) => handleDelete(creator.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all text-sm px-2 py-1"
                      title="Eliminar creador"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-bg-secondary rounded-lg p-2">
                      <p className="text-text-muted text-[10px]">Posts</p>
                      <p className="text-text-primary font-bold">{creator.total_posts}</p>
                    </div>
                    <div className="bg-bg-secondary rounded-lg p-2">
                      <p className="text-text-muted text-[10px]">Outliers</p>
                      <p className="text-accent font-bold">{creator.total_outliers}</p>
                    </div>
                    <div className="bg-bg-secondary rounded-lg p-2">
                      <p className="text-text-muted text-[10px]">Interacc. media</p>
                      <p className="text-text-primary font-bold">{creator.avg_engagement.toLocaleString('es-ES')}</p>
                    </div>
                    <div className="bg-bg-secondary rounded-lg p-2">
                      <p className="text-text-muted text-[10px]">Seguidores</p>
                      <p className="text-text-primary font-bold">
                        {creator.followers_count > 0 ? (creator.followers_count >= 1000 ? `${Math.round(creator.followers_count / 1000)}K` : creator.followers_count) : '--'}
                      </p>
                    </div>
                  </div>

                  {creator.last_scraped_at && (
                    <p className="text-text-muted text-xs mt-3">
                      Actualizado: {new Date(creator.last_scraped_at).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
