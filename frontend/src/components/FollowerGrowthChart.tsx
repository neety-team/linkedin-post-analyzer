import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { useChartColors } from '../theme';
import InfoHint from './InfoHint';

const BASE = import.meta.env.VITE_API_URL || '';

interface Point {
  day: string;
  followers: number; // total ese dia (cada cuenta con su ultima foto conocida)
  gained: number;    // seguidores nuevos ese dia (oficial de LinkedIn en las conectadas)
}

interface Props {
  creatorId: string | null;
  startDate: string;
  endDate: string;
  includeManual?: boolean;
  reloadSignal?: number;
}

type Modo = 'cumulative' | 'daily';

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('es-ES');
}

function fmtFull(n: number): string {
  return Math.round(n).toLocaleString('es-ES');
}

function restarDias(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function PuntoTooltip({ active, payload, modo }: any) {
  const cc = useChartColors();
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div
      style={{
        backgroundColor: cc.tooltipBg,
        border: `1px solid ${cc.data}55`,
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: `0 0 14px ${cc.data}33`,
      }}
    >
      <div style={{ color: cc.muted, fontSize: 11, marginBottom: 2 }}>{d.label}</div>
      <div style={{ color: cc.data, fontSize: 18, fontWeight: 700 }}>
        +{fmtFull(modo === 'cumulative' ? d.acumulado : d.gained)}
        <span style={{ color: cc.muted, fontSize: 11, fontWeight: 500, marginLeft: 6 }}>
          {modo === 'cumulative' ? 'seguidores nuevos acumulados' : 'seguidores nuevos ese día'}
        </span>
      </div>
      {modo === 'cumulative' && (
        <div style={{ color: cc.muted, fontSize: 11 }}>+{fmtFull(d.gained)} ese día</div>
      )}
      {d.followers > 0 && (
        <div style={{ color: cc.muted, fontSize: 11, marginTop: 2 }}>{fmtFull(d.followers)} seguidores en total</div>
      )}
    </div>
  );
}

/**
 * FOLLOWER GROWTH COMO LINKEDIN (Iker, 2026-09-17). Igual que Audience
 * analytics: Cumulative (curva que arranca en 0 al inicio del rango) o Daily
 * (barras), con los seguidores ganados del periodo en grande, la variacion
 * contra el periodo anterior y el total actual. Los seguidores nuevos de las
 * cuentas conectadas son la serie oficial de LinkedIn; antes salian de restar
 * fotos del total y la primera foto de las cuentas manuales pinto un +2.600
 * falso el 21/08/2026.
 */
export default function FollowerGrowthChart({ creatorId, startDate, endDate, includeManual = true, reloadSignal }: Props) {
  const cc = useChartColors();
  const [points, setPoints] = useState<Point[] | null>(null);
  const [previo, setPrevio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<Modo>('cumulative');

  const days = useMemo(() => {
    const a = new Date(`${startDate}T00:00:00`);
    const b = new Date(`${endDate}T00:00:00`);
    return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
  }, [startDate, endDate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const pedir = (desde: string, hasta: string) => {
      const params = new URLSearchParams({ start_date: desde, end_date: hasta });
      if (creatorId) params.set('creator_id', creatorId);
      if (!includeManual) params.set('include_manual', 'false');
      return fetch(`${BASE}/api/accounts/follower-history?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => (Array.isArray(data?.points) ? (data.points as Point[]) : []));
    };
    Promise.all([
      pedir(startDate, endDate),
      pedir(restarDias(startDate, days), restarDias(startDate, 1)),
    ])
      .then(([actual, anterior]) => {
        if (cancelled) return;
        setPoints(actual);
        setPrevio(anterior.reduce((s, p) => s + (p.gained || 0), 0));
      })
      .catch(() => {
        if (!cancelled) { setPoints([]); setPrevio(null); }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [creatorId, startDate, endDate, includeManual, reloadSignal, days]);

  const chartData = useMemo(() => {
    let acumulado = 0;
    return (points || []).map((p) => {
      acumulado += p.gained || 0;
      return { ...p, label: fmtDay(p.day), acumulado };
    });
  }, [points]);

  const xTickInterval = Math.max(0, Math.floor(chartData.length / 8) - 1);
  const ganados = chartData.length ? chartData[chartData.length - 1].acumulado : 0;
  const totalActual = chartData.length ? chartData[chartData.length - 1].followers : 0;
  const variacion = previo && previo > 0 ? ((ganados - previo) / previo) * 100 : null;
  const boton = (activo: boolean) =>
    `px-2.5 py-1 rounded-full border text-xs transition-colors ${
      activo ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text-secondary'
    }`;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Crecimiento de seguidores</h3>
          <p className="text-xs text-text-muted mt-0.5">
            {creatorId
              ? 'Seguidores nuevos en el periodo, como en las estadísticas de audiencia de LinkedIn.'
              : 'Seguidores nuevos en el periodo de todas las cuentas propias, como en las estadísticas de audiencia de LinkedIn.'}
            {!creatorId && <InfoHint text="Las cuentas manuales se calculan a partir de sus totales diarios." />}
          </p>
        </div>
        <div className="flex gap-1">
          <button className={boton(modo === 'cumulative')} onClick={() => setModo('cumulative')}>Acumulado</button>
          <button className={boton(modo === 'daily')} onClick={() => setModo('daily')}>Diario</button>
        </div>
      </div>

      {!loading && chartData.length > 0 && (
        <div className="mb-3 flex items-baseline gap-x-4 gap-y-1 flex-wrap">
          <span className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-primary tabular-nums">+{fmtFull(ganados)}</span>
            <span className="text-sm text-text-muted">seguidores nuevos · {days} d</span>
          </span>
          {variacion != null && (
            <span className={`text-xs font-medium ${variacion >= 0 ? 'text-success' : 'text-danger'}`}>
              {variacion >= 0 ? '▲' : '▼'} {Math.abs(variacion).toLocaleString('es-ES', { maximumFractionDigits: 0 })}%
              <span className="text-text-muted font-normal"> vs. los {days} días anteriores</span>
            </span>
          )}
          {totalActual > 0 && (
            <span className="text-xs text-text-muted">
              <span className="text-text-secondary font-semibold tabular-nums">{fmtFull(totalActual)}</span> seguidores en total
            </span>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-center text-text-muted text-sm py-12">Cargando…</p>
      ) : chartData.length === 0 ? (
        <p className="text-center text-text-muted text-sm py-12">Aún no hay datos de seguidores en este periodo.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="seguidoresFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cc.data} stopOpacity={0.3} />
                <stop offset="100%" stopColor={cc.data} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
            <XAxis
              dataKey="label"
              tick={{ fill: cc.muted, fontSize: 11 }}
              axisLine={{ stroke: cc.grid }}
              interval={xTickInterval}
            />
            <YAxis
              tick={{ fill: cc.muted, fontSize: 11 }}
              axisLine={{ stroke: cc.grid }}
              tickFormatter={fmtNum}
              allowDecimals={false}
            />
            <Tooltip content={<PuntoTooltip modo={modo} />} cursor={{ fill: cc.cursor }} />
            <ReferenceLine y={0} stroke={cc.grid} />
            {modo === 'cumulative' ? (
              <>
                <Area type="monotone" dataKey="acumulado" stroke="none" fill="url(#seguidoresFill)" isAnimationActive={false} />
                <Line type="monotone" dataKey="acumulado" stroke={cc.data} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </>
            ) : (
              <Bar dataKey="gained" fill={cc.data} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
