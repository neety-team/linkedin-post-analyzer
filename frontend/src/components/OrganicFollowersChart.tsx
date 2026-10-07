import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { FOLLOWER_SYNC_PHASE_LABELS, etiqueta } from '../utils/etiquetas';

const BASE = import.meta.env.VITE_API_URL || '';

interface Point {
  day: string;
  organic: number;     // new pure-follow followers that day (they followed first)
  connection: number;  // new followers that entered via a connection
  total: number;
}

interface Props {
  creatorId: string | null;
  days: number;
  reloadSignal?: number;
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

const TOOLTIP_STYLE = {
  backgroundColor: '#222639',
  border: '1px solid #2e3348',
  borderRadius: '8px',
  color: '#e8eaf0',
  fontSize: '12px',
};

/**
 * OrganicFollowersChart — new followers per day split into:
 *  - "Orgánicos" (pure_follow): they hit Follow without connecting — they
 *    chose you because of your content. The metric that matters.
 *  - "Por conexión": entered via a connection (inbound or outbound).
 *
 * Data starts the day the follower-sync baseline ran (pre-existing followers
 * can't be dated, so they're excluded). Until then the chart is empty.
 */
export default function OrganicFollowersChart({ creatorId, days, reloadSignal }: Props) {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (creatorId) params.set('creator_id', creatorId);
    fetch(`${BASE}/api/accounts/followers/organic-history?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setPoints(Array.isArray(data?.points) ? data.points : []);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [creatorId, days, reloadSignal, reloadKey]);

  // Kick the follower sync. First run per creator is the heavy baseline
  // (full follower list + relations); it runs in the background, so we just
  // fire it and tell the user to come back. Later runs are cheap diffs.
  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const params = new URLSearchParams();
      if (creatorId) params.set('creator_id', creatorId);
      const res = await fetch(`${BASE}/api/accounts/followers/sync?${params.toString()}`, { method: 'POST' });
      const json = await res.json();
      if (json.started === false) {
        setSyncMsg(json.reason === 'ya está en marcha' ? 'Ya está sincronizando…' : `No arrancó: ${json.reason}`);
      } else {
        setSyncMsg('Sincronizando en segundo plano. Vuelve en unos minutos y recarga.');
        setTimeout(() => setReloadKey((k) => k + 1), 30000);
      }
    } catch (e: any) {
      setSyncMsg(`Error: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Per-creator sync status from the DB. Polls every 8s while syncing,
  // otherwise every 60s — tells us whether the baseline actually ran for
  // each managed creator even after a server restart wipes the in-memory
  // progress state.
  interface SyncCreator {
    id: string;
    name: string;
    has_account_id: boolean;
    baseline_done: boolean;
    baseline_count: number | null;
    last_synced_at: string | null;
    last_new_count: number | null;
    followers_in_db: number;
    new_since_baseline: number;
  }
  interface SyncStatus {
    progress: {
      running: boolean;
      phase: string;
      current_creator: string | null;
      creators_done: number;
      creators_total: number;
      new_followers_this_run: number;
      last_error: string | null;
    };
    creators: SyncCreator[];
  }
  const [status, setStatus] = useState<SyncStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      fetch(`${BASE}/api/accounts/followers/sync-status`)
        .then((r) => r.json())
        .then((s) => { if (!cancelled) setStatus(s); })
        .catch(() => {});
    };
    tick();
    const interval = status?.progress.running ? 8000 : 60000;
    const id = setInterval(tick, interval);
    return () => { cancelled = true; clearInterval(id); };
  }, [status?.progress.running, reloadKey]);

  const chartData = useMemo(
    () => (points || []).map((p) => ({ ...p, label: fmtDay(p.day) })),
    [points]
  );

  const totals = useMemo(() => {
    const organic = (points || []).reduce((s, p) => s + (p.organic || 0), 0);
    const connection = (points || []).reduce((s, p) => s + (p.connection || 0), 0);
    return { organic, connection };
  }, [points]);

  const xTickInterval = Math.max(0, Math.floor(chartData.length / 8) - 1);

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Seguidores orgánicos</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Gente que te empezó a seguir por tu contenido (no porque tú la buscaras).
            Arranca el día de la primera sincronización; el histórico previo no se puede fechar.
          </p>
        </div>
        <div className="flex items-start gap-5">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wide text-text-muted">Orgánicos</span>
            <span className="text-sm font-semibold tabular-nums text-accent">
              {totals.organic > 0 ? '+' : ''}{totals.organic.toLocaleString('es-ES')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wide text-text-muted">Por conexión</span>
            <span className="text-sm font-semibold tabular-nums text-text-secondary">
              {totals.connection.toLocaleString('es-ES')}
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs px-2.5 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 transition-colors self-center"
            title="Captura la lista de seguidores y la clasifica. La primera vez tarda unos minutos (lectura inicial)."
          >
            {syncing ? 'Sincronizando…' : '↻ Sincronizar seguidores'}
          </button>
        </div>
      </div>
      {syncMsg && <p className="text-[11px] text-text-muted mb-2">{syncMsg}</p>}

      {/* Per-creator sync status — surfaces whether the baseline ran for
          each managed creator. After a server restart the in-memory progress
          state resets to idle; this DB-backed summary still shows the truth. */}
      {status && status.creators.length > 0 && (
        <div className="text-[11px] text-text-muted mb-3 flex flex-wrap gap-x-4 gap-y-1">
          {status.progress.running && (
            <span className="text-accent font-medium">
              ↻ {etiqueta(FOLLOWER_SYNC_PHASE_LABELS, status.progress.phase)} · {status.progress.current_creator || ''} ({status.progress.creators_done}/{status.progress.creators_total})
            </span>
          )}
          {status.creators.map((c) => (
            <span key={c.id} className={c.baseline_done ? '' : 'text-amber-400/80'}>
              <strong className="text-text-secondary">{c.name}:</strong>{' '}
              {c.baseline_done
                ? `${c.followers_in_db.toLocaleString('es-ES')} en la BD${c.new_since_baseline > 0 ? ` (${c.new_since_baseline} nuevos)` : ''}`
                : c.has_account_id
                  ? 'sin sincronizar'
                  : 'sin unipile_account_id'}
              {c.last_synced_at && (
                <span className="text-text-muted ml-1">
                  · {new Date(c.last_synced_at).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </span>
              )}
            </span>
          ))}
          {status.progress.last_error && (
            <span className="text-red-400 w-full" title={status.progress.last_error}>
              ✗ {status.progress.last_error.slice(0, 200)}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-center text-text-muted text-sm py-12">Cargando…</p>
      ) : chartData.length === 0 ? (
        <p className="text-center text-text-muted text-sm py-12">
          Aún no hay datos. La primera sincronización lee la base de seguidores; a partir
          de ahí cada día nuevo se desglosa en orgánicos vs conexión.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#2e3348' }}
              interval={xTickInterval}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#2e3348' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: '#2e334855' }}
              formatter={(v: any, name: any) => [v, name === 'organic' ? 'Orgánicos' : 'Por conexión']}
              labelFormatter={(label: any) => label}
            />
            <Legend
              formatter={(value) => (value === 'organic' ? 'Orgánicos' : 'Por conexión')}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Bar dataKey="organic" stackId="f" fill="#e8935a" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="connection" stackId="f" fill="#4b5168" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
