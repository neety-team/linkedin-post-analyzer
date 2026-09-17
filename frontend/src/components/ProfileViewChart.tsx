import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const BASE = import.meta.env.VITE_API_URL || '';

interface Point {
  day: string;
  views: number;
}

interface PuntoOficial {
  day: string;
  viewers_90d: number;
}

interface Props {
  creatorId: string | null;
  startDate: string;
  endDate: string;
  days: number;
  reloadSignal?: number;
}

type Vista = 'tendencia' | 'diario';

// A partir de cuantos dias guardados la tendencia oficial dice algo.
const MIN_DIAS_TENDENCIA = 7;
const PV_COLOR = '#e8935a';

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('es-ES');
}

function fmtFull(n: number): string {
  return Math.round(n).toLocaleString('es-ES');
}

function VisitasTooltip({ active, payload, label, vista }: any) {
  if (!active || !payload || !payload.length) return null;
  const n = Number(payload[0]?.value ?? 0);
  return (
    <div
      style={{
        backgroundColor: '#222639',
        border: `1px solid ${PV_COLOR}55`,
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: `0 0 14px ${PV_COLOR}33`,
      }}
    >
      <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ color: PV_COLOR, fontSize: 18, fontWeight: 700 }}>
        {vista === 'tendencia' ? fmtFull(n) : `~${fmtFull(n)}`}
        <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 500, marginLeft: 6 }}>
          {vista === 'tendencia' ? 'profile viewers in the last 90 days (LinkedIn)' : 'estimated new viewers that day'}
        </span>
      </div>
    </div>
  );
}

/**
 * PROFILE VIEWS (Iker, 2026-09-17). LinkedIn no da las visitas al perfil dia a
 * dia; solo la cifra "Profile viewers in 90 days" de su resumen. Por eso:
 *  - El numero grande es SIEMPRE esa cifra oficial (la misma que en LinkedIn).
 *  - "Trend (LinkedIn)": esa cifra dia a dia; aparece cuando hay al menos
 *    MIN_DIAS_TENDENCIA dias guardados (se guarda desde el 17/09/2026).
 *  - "Daily (estimated)": barras reconstruidas con la lista de visitantes, que
 *    salen un 12-24% por encima de LinkedIn en 90 dias. Sirven para ver que
 *    dias hubo picos, no para sumar: por eso no hay modo acumulado, que
 *    arrastraria ese error y contradiria la cifra oficial.
 */
export default function ProfileViewChart({ creatorId, startDate, endDate, days, reloadSignal }: Props) {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [oficial, setOficial] = useState<PuntoOficial[]>([]);
  const [oficialActual, setOficialActual] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [vistaElegida, setVistaElegida] = useState<Vista | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (creatorId) params.set('creator_id', creatorId);
    fetch(`${BASE}/api/accounts/profile-view-history?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setPoints(Array.isArray(data?.points) ? data.points : []);
        setOficial(Array.isArray(data?.oficial) ? data.oficial : []);
        setOficialActual(typeof data?.oficial_actual === 'number' ? data.oficial_actual : null);
      })
      .catch(() => {
        if (!cancelled) { setPoints([]); setOficial([]); setOficialActual(null); }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [creatorId, startDate, endDate, reloadSignal]);

  const hayTendencia = oficial.length >= MIN_DIAS_TENDENCIA;
  const vista: Vista = vistaElegida ?? (hayTendencia ? 'tendencia' : 'diario');

  const datosDiario = useMemo(
    () => (points || []).map((p) => ({ ...p, label: fmtDay(p.day) })),
    [points]
  );
  const datosTendencia = useMemo(
    () => oficial.map((p) => ({ ...p, label: fmtDay(p.day) })),
    [oficial]
  );
  const datos = vista === 'tendencia' ? datosTendencia : datosDiario;
  const totalEstimado = (points || []).reduce((s, p) => s + (p.views || 0), 0);
  const variacionTendencia = hayTendencia && oficial[0].viewers_90d > 0
    ? ((oficial[oficial.length - 1].viewers_90d - oficial[0].viewers_90d) / oficial[0].viewers_90d) * 100
    : null;
  const xTickInterval = Math.max(0, Math.floor(datos.length / 8) - 1);
  const boton = (activo: boolean) =>
    `px-2.5 py-1 rounded-full border text-xs transition-colors ${
      activo ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text-secondary'
    }`;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Profile views</h3>
          <p className="text-xs text-text-muted mt-0.5">
            {vista === 'tendencia'
              ? `LinkedIn's own "profile viewers in 90 days", day by day${creatorId ? '' : ' — connected accounts'}`
              : `Estimated new viewers per day, rebuilt from LinkedIn's viewer list (runs 12–24% above LinkedIn; misses private viewers). Use it to spot peaks, not to add up.`}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            className={boton(vista === 'tendencia')}
            onClick={() => setVistaElegida('tendencia')}
            disabled={!hayTendencia}
            title={hayTendencia ? '' : `Available once ${MIN_DIAS_TENDENCIA} days of LinkedIn figures are stored (started 17 Sep 2026)`}
            style={hayTendencia ? undefined : { opacity: 0.45, cursor: 'not-allowed' }}
          >
            Trend (LinkedIn)
          </button>
          <button className={boton(vista === 'diario')} onClick={() => setVistaElegida('diario')}>
            Daily (estimated)
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-baseline gap-x-4 gap-y-1 flex-wrap">
        <span className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-text-primary tabular-nums">
            {oficialActual != null ? fmtFull(oficialActual) : '—'}
          </span>
          <span className="text-sm text-text-muted">profile viewers · last 90 days (LinkedIn)</span>
        </span>
        {vista === 'tendencia' && variacionTendencia != null && (
          <span className={`text-xs font-medium ${variacionTendencia >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {variacionTendencia >= 0 ? '▲' : '▼'} {Math.abs(variacionTendencia).toLocaleString('es-ES', { maximumFractionDigits: 0 })}%
            <span className="text-text-muted font-normal"> in this range</span>
          </span>
        )}
        {vista === 'diario' && totalEstimado > 0 && (
          <span className="text-xs text-text-muted">~{fmtFull(totalEstimado)} estimated in {days}d</span>
        )}
        {!hayTendencia && (
          <span className="text-[10px] text-text-muted/70">
            Trend view unlocks after {MIN_DIAS_TENDENCIA} days of stored LinkedIn figures ({oficial.length}/{MIN_DIAS_TENDENCIA})
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-center text-text-muted text-sm py-12">Loading…</p>
      ) : datos.length === 0 || (vista === 'diario' && totalEstimado === 0) ? (
        <p className="text-center text-text-muted text-sm py-12">No profile-view data in this range yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={datos} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
              tickFormatter={fmtNum}
              domain={vista === 'tendencia' ? ['auto', 'auto'] : [0, 'auto']}
              allowDecimals={false}
            />
            <Tooltip content={<VisitasTooltip vista={vista} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            {vista === 'tendencia' ? (
              <Line
                type="monotone"
                dataKey="viewers_90d"
                stroke={PV_COLOR}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            ) : (
              <Bar dataKey="views" fill={PV_COLOR} fillOpacity={0.55} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
