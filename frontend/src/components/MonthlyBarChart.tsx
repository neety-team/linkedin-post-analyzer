import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from 'recharts';

const BASE = import.meta.env.VITE_API_URL || '';

interface Props {
  // API path WITHOUT query string, e.g. '/api/accounts/follower-monthly'
  endpoint: string;
  // Field on each returned point that holds the numeric value to plot.
  valueKey: string;
  creatorId: string | null;
  // New range model: pass start_date + end_date (YYYY-MM-DD) and the
  // backend returns the monthly aggregation for the overlapping months.
  // The legacy `months` prop is kept as a fallback for any caller that
  // hasn't migrated yet.
  startDate?: string;
  endDate?: string;
  // Interruptor de cuentas manuales de la pagina: sin pasarlo, la barra
  // sumaba a Mario y Helena aunque estuviera apagado.
  includeManual?: boolean;
  months?: number;
  title: string;
  subtitle: string;
  // Tooltip/legend noun, e.g. 'seguidores' or 'impresiones'
  unit: string;
  color?: string;
  // If true, negative values render red (growth charts). Impressions never
  // go negative so it's off by default.
  signed?: boolean;
}

// Geometry shared between the chart and the year-band strip below it, so
// the year labels line up under the right months. Fixed (not auto) Y-axis
// width is what makes the alignment exact.
const Y_AXIS_W = 44;
const PLOT_MARGIN = { top: 8, right: 16, bottom: 4, left: 0 };
const CHART_H = 200;

function fmtMonthShort(ym: string): string {
  // 'YYYY-MM' → 'May'  (month only — the year lives in the band below)
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

function fmtMonthFull(ym: string): string {
  // 'YYYY-MM' → 'May 2026'  (used in the tooltip for unambiguous context)
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// Big-number tooltip — same language as FollowerGrowthChart's daily
// tooltip: a large value in the chart's own colour with a soft glow.
function BigValueTooltip({ active, payload, color, unit, signed }: any) {
  if (!active || !payload || !payload.length) return null;
  const n = Number(payload[0]?.value ?? 0);
  const full = payload[0]?.payload?.fullLabel ?? '';
  const colour = signed
    ? (n > 0 ? '#34d399' : n < 0 ? '#f87171' : '#9ca3af')
    : color;
  return (
    <div
      style={{
        backgroundColor: '#222639',
        border: `1px solid ${colour}55`,
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: `0 0 14px ${colour}33`,
      }}
    >
      <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 2 }}>{full}</div>
      <div style={{ color: colour, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
        {signed && n > 0 ? '+' : ''}{fmtNum(n)}
        <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 500, marginLeft: 6 }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

/**
 * Generic "value per month" bar chart. Fetches `${endpoint}?months=&creator_id=`
 * and plots point[valueKey] per month. The X axis shows the month only;
 * a band below groups consecutive months under their year (so "May" /
 * "Jun" with a single "2026" spanning them — no ambiguous "May 26").
 * Used for monthly followers-gained and monthly impressions.
 */
export default function MonthlyBarChart({
  endpoint,
  valueKey,
  creatorId,
  startDate,
  endDate,
  includeManual = true,
  months = 12,
  title,
  subtitle,
  unit,
  color = '#34d399',
  signed = false,
}: Props) {
  const [points, setPoints] = useState<Record<string, any>[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate && endDate) {
      params.set('start_date', startDate);
      params.set('end_date', endDate);
    } else {
      params.set('months', String(months));
    }
    if (creatorId) params.set('creator_id', creatorId);
    if (!includeManual) params.set('include_manual', 'false');
    fetch(`${BASE}${endpoint}?${params.toString()}`)
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
  }, [endpoint, creatorId, startDate, endDate, months, includeManual]);

  const chartData = useMemo(
    () => (points || []).map((p) => ({
      ...p,
      label: fmtMonthShort(p.month),
      fullLabel: fmtMonthFull(p.month),
      year: String(p.month).slice(0, 4),
      _v: Number(p[valueKey]) || 0,
    })),
    [points, valueKey]
  );

  const total = useMemo(
    () => chartData.reduce((s, p) => s + p._v, 0),
    [chartData]
  );

  // Contiguous year groups for the band below the axis. chartData is
  // already sorted ascending by month, so a single pass is enough.
  const yearGroups = useMemo(() => {
    const groups: { year: string; start: number; count: number }[] = [];
    chartData.forEach((p, i) => {
      const last = groups[groups.length - 1];
      if (last && last.year === p.year) last.count += 1;
      else groups.push({ year: p.year, start: i, count: 1 });
    });
    return groups;
  }, [chartData]);

  const n = chartData.length;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        </div>
        {chartData.length > 0 && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-text-muted">Total</div>
            <div className={`text-sm font-semibold tabular-nums ${signed && total < 0 ? 'text-red-400' : 'text-text-secondary'}`}>
              {signed && total > 0 ? '+' : ''}{fmtNum(total)}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-center text-text-muted text-sm py-12">Loading…</p>
      ) : chartData.length === 0 ? (
        <p className="text-center text-text-muted text-sm py-12">
          Not enough monthly data yet — this fills in as each month is captured.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={CHART_H}>
            <BarChart data={chartData} margin={PLOT_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#2e3348' }}
                interval={0}
              />
              <YAxis
                width={Y_AXIS_W}
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#2e3348' }}
                tickFormatter={fmtNum}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={(p: any) => (
                  <BigValueTooltip {...p} color={color} unit={unit} signed={signed} />
                )}
              />
              {signed && <ReferenceLine y={0} stroke="#2e3348" />}
              <Bar dataKey="_v" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {chartData.map((p, i) => (
                  <Cell key={i} fill={signed && p._v < 0 ? '#f87171' : color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Year band — one label per contiguous year, centred under its
              months, aligned to the plot area via the shared geometry.
              A vertical divider at every year boundary gives a clear
              visual cut between e.g. 2025 and 2026. */}
          <div
            style={{
              position: 'relative',
              height: 22,
              marginLeft: Y_AXIS_W + PLOT_MARGIN.left,
              marginRight: PLOT_MARGIN.right,
            }}
          >
            {yearGroups.map((g, gi) => {
              const leftPct = (g.start / n) * 100;
              const widthPct = (g.count / n) * 100;
              return (
                <div key={g.year + g.start}>
                  {/* boundary divider (skip the very first group) */}
                  {gi > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        top: -6,
                        height: 22,
                        width: 1,
                        background: '#3a4566',
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: 0,
                      textAlign: 'center',
                      borderTop: '1px solid #2e3348',
                      paddingTop: 4,
                    }}
                  >
                    <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
                      {g.year}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
