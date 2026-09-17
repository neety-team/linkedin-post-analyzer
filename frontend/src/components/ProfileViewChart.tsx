import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const BASE = import.meta.env.VITE_API_URL || '';

interface Point {
  day: string;
  views: number;
}

interface Props {
  creatorId: string | null;
  // Range model (preferred). days is still accepted for the
  // "vs last Nd" delta label so the caller can pass a derived day
  // count instead of recomputing it here.
  startDate: string;
  endDate: string;
  days: number;
  reloadSignal?: number;
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// Big-number tooltip — same design language as the follower charts:
// large value in the chart's orange with a soft glow.
const PV_COLOR = '#e8935a';
function ViewsTooltip({ active, payload, label }: any) {
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
      <div style={{ color: PV_COLOR, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
        {fmtNum(n)}
        <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 500, marginLeft: 6 }}>
          {n === 1 ? 'viewer nuevo' : 'viewers nuevos'}
        </span>
      </div>
    </div>
  );
}

// Sum the last `n` daily points (most-recent-first). Returns 0 if the
// series is shorter than n — caller decides whether that's enough signal
// to display a delta.
function sumLastN(points: Point[], n: number): number {
  let total = 0;
  for (let i = Math.max(0, points.length - n); i < points.length; i++) {
    total += points[i].views || 0;
  }
  return total;
}

// Sum points [end-n*2, end-n) — i.e. the window of size n immediately
// before the most-recent window of size n. Used for rolling delta math.
function sumPrevN(points: Point[], n: number): number | null {
  if (points.length < n * 2) return null;
  const start = points.length - n * 2;
  let total = 0;
  for (let i = start; i < start + n; i++) total += points[i].views || 0;
  return total;
}

// Compact delta chip — value + colour + sign. Used for 24h / 7d / range.
function DeltaChip({
  label,
  abs,
  pct,
}: {
  label: string;
  abs: number | null;
  pct: number | null;
}) {
  if (abs === null) {
    return (
      <div className="flex flex-col">
        <span className="text-[9px] uppercase tracking-wide text-text-muted">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-text-muted">—</span>
      </div>
    );
  }
  const colour =
    abs > 0 ? 'text-accent' : abs < 0 ? 'text-red-400' : 'text-text-secondary';
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wide text-text-muted">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${colour}`}>
        {abs > 0 ? '+' : ''}
        {fmtNum(abs)}
        {pct !== null && (
          <span className="text-text-muted font-normal ml-1">
            ({abs > 0 ? '+' : ''}
            {pct.toFixed(1)}%)
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * ProfileViewChart — daily count of LinkedIn "Who Viewed My Profile"
 * viewers, fetched via Unipile's raw passthrough during scrape.
 *
 * Shape mirrors FollowerGrowthChart (same recharts setup, same fetch
 * pattern, same colour grammar in the theme) BUT surfaces three explicit
 * deltas — last 24h, last 7d, and the full range — because viewer counts
 * fluctuate more than follower counts and the day/week trend is what
 * actually matters.
 */
export default function ProfileViewChart({ creatorId, startDate, endDate, days, reloadSignal }: Props) {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(true);

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
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [creatorId, startDate, endDate, reloadSignal]);

  const chartData = useMemo(
    () => (points || []).map((p) => ({ ...p, label: fmtDay(p.day) })),
    [points]
  );

  const xTickInterval = Math.max(0, Math.floor(chartData.length / 8) - 1);

  // One headline delta: the last `days` window summed vs the `days`
  // window immediately before it (how LinkedIn's own analytics frames
  // the trend). null when there isn't enough prior history yet.
  const deltas = useMemo(() => {
    if (!points || points.length === 0) {
      return { vsRange: null, totalRange: 0 };
    }
    const cur = sumLastN(points, days);
    const prev = sumPrevN(points, days);
    const vsRange =
      prev === null
        ? null
        : { abs: cur - prev, pct: prev > 0 ? ((cur - prev) / prev) * 100 : null };
    return {
      vsRange,
      totalRange: sumLastN(points, days),
    };
  }, [points, days]);

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Profile views</h3>
          <p className="text-xs text-text-muted mt-0.5">
            {creatorId
              ? `Estimated new profile views per day (last ${days}d · ~${fmtNum(deltas.totalRange)}) — rebuilt from LinkedIn's viewer list, which misses private viewers; the exact 90-day figure is in the KPI above`
              : `Estimated new profile views per day — all managed accounts (last ${days}d · ~${fmtNum(deltas.totalRange)}) — rebuilt from LinkedIn's viewer list; the exact 90-day figure is in the KPI above`}
          </p>
        </div>
        <div className="flex items-start gap-5 flex-wrap">
          <DeltaChip
            label={`vs last ${days}d`}
            abs={deltas.vsRange ? deltas.vsRange.abs : null}
            pct={deltas.vsRange ? deltas.vsRange.pct : null}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-text-muted text-sm py-12">Loading…</p>
      ) : chartData.length === 0 || deltas.totalRange === 0 ? (
        <p className="text-center text-text-muted text-sm py-12">
          No profile-view data yet — run a refresh to capture viewer
          timestamps from LinkedIn's feed.
          (Requires an active LinkedIn Premium / Sales Navigator on the account.)
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
              domain={['auto', 'auto']}
            />
            <Tooltip
              cursor={{ stroke: '#2e3348', strokeWidth: 1 }}
              content={<ViewsTooltip />}
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="#e8935a"
              strokeWidth={2}
              dot={{ r: 2, fill: '#e8935a' }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
