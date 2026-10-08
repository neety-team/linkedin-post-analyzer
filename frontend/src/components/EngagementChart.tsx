import { useState, useMemo, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';

interface TimelinePoint {
  published_at: string;
  engagement_score: number;
  is_outlier: boolean;
  content_type: string;
  hook_text: string | null;
  hook_type?: string;
  outlier_ratio?: number;
  post_url?: string | null;
  content_text?: string | null;
}

interface DailyEngagement {
  day: string;
  engagement: number;
}

interface Props {
  data: TimelinePoint[];
  dailyEngagement?: DailyEngagement[];
  avgEngagement: number;
}

type Range = '7d' | '30d' | '90d' | 'all';

const RANGE_DAYS: Record<Range, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

// LinkedIn distribution window: a post keeps gathering meaningful engagement
// for ~7 days after publishing. For public/competitor creators we only see
// each post's total engagement (a single public number), so we estimate the
// day-by-day "active engagement" by summing the engagement_score of every
// post published in the previous 7 days.
const ROLLING_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(ts: string): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function formatDayLabel(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

// Fixed chart margins so the pencil strip below can align with the plot area
// using plain HTML (no fiddling with Recharts internals).
const CHART_MARGIN = { top: 10, right: 10, bottom: 8, left: 5 };
const Y_AXIS_WIDTH = 50;
const X_AXIS_HEIGHT = 28;
const CHART_HEIGHT = 300;

// Solid white pencil silhouette drawn as two paths so the square's background
// color shows through the small gap between shaft and eraser — that's the
// "band" the user designed.
function PencilIcon({ size = 14, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
    >
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
      <path d="M20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

const PENCIL_BG_NORMAL = '#9A8A9B';
const PENCIL_BG_OUTLIER = '#7E3AA8';

interface HoverState {
  day: string;
  x: number;
  y: number;
}

export default function EngagementChart({ data, dailyEngagement }: Props) {
  const [range, setRange] = useState<Range>('30d');
  const [hover, setHover] = useState<HoverState | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const clearTimerRef = useRef<number | null>(null);

  const cancelClear = () => {
    if (clearTimerRef.current != null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  };
  const scheduleClear = () => {
    cancelClear();
    // Short delay so the cursor has time to transit from the chart onto the
    // tooltip itself. Once the cursor enters the tooltip div, onMouseEnter
    // cancels this timer and the tooltip stays open.
    clearTimerRef.current = window.setTimeout(() => setHover(null), 150);
  };

  const { chartData, displayedAvg, postDaysInRange } = useMemo(() => {
    // Group posts by UTC day.
    const byDay = new Map<string, TimelinePoint[]>();
    for (const p of data) {
      if (!p.published_at) continue;
      const k = dayKey(p.published_at);
      const arr = byDay.get(k) || [];
      arr.push(p);
      byDay.set(k, arr);
    }

    const dailyFromSnapshots = new Map<string, number>();
    for (const d of dailyEngagement || []) {
      dailyFromSnapshots.set(d.day, d.engagement || 0);
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // For short ranges, always span the last N days ending today (even if the
    // creator didn't post at the start of the window). For "all", start at
    // their first post.
    const rangeDays = RANGE_DAYS[range];
    const days: string[] = [];
    if (rangeDays != null) {
      const start = new Date(today);
      start.setUTCDate(start.getUTCDate() - (rangeDays - 1));
      for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
        days.push(d.toISOString().slice(0, 10));
      }
    } else if (data.length > 0) {
      const firstKey = dayKey(data[0].published_at);
      const start = new Date(`${firstKey}T00:00:00Z`);
      for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
        days.push(d.toISOString().slice(0, 10));
      }
    }

    const rows = days.map((day) => {
      const posts = byDay.get(day) || [];
      const hasPost = posts.length > 0;
      const snap = dailyFromSnapshots.get(day);

      // Rolling 7-day engagement: on day D, sum the engagement of every post
      // published in [D-6, D]. This approximates how much of the creator's
      // content is still "active" in LinkedIn's distribution window, so days
      // without a new publish don't collapse to zero.
      const dayMs = new Date(`${day}T00:00:00Z`).getTime();
      let rollingEngagement = 0;
      let activePostCount = 0;
      const activePosts: TimelinePoint[] = [];
      for (let back = 0; back < ROLLING_WINDOW_DAYS; back++) {
        const priorKey = new Date(dayMs - back * DAY_MS).toISOString().slice(0, 10);
        const priorPosts = byDay.get(priorKey);
        if (!priorPosts) continue;
        for (const p of priorPosts) {
          rollingEngagement += p.engagement_score || 0;
          activePostCount += 1;
          activePosts.push(p);
        }
      }

      // Prefer measured daily engagement from hourly snapshots when available
      // (managed accounts). For public creators we fall back to the rolling
      // 7-day sum above instead of collapsing non-publish days to zero.
      const engagement =
        snap != null && snap > 0 ? snap : rollingEngagement;

      const isOutlier = posts.some((p) => p.is_outlier);
      const maxRatio = posts.reduce((m, p) => Math.max(m, p.outlier_ratio || 0), 0);
      // Preview post: the day's top post if a publish happened, else the most
      // recent post still inside the 7-day active window so the tooltip has
      // something to show on "quiet" days.
      const topPost = hasPost
        ? posts.reduce(
            (best, p) => ((p.engagement_score || 0) > (best.engagement_score || 0) ? p : best),
            posts[0]
          )
        : activePosts.length > 0
          ? activePosts.reduce(
              (most, p) =>
                new Date(p.published_at).getTime() > new Date(most.published_at).getTime() ? p : most,
              activePosts[0]
            )
          : null;

      return {
        day,
        date: formatDayLabel(day),
        engagement_score: engagement,
        is_outlier: isOutlier,
        outlier_ratio: maxRatio,
        hasPost,
        postCount: posts.length,
        activePostCount,
        topPost,
      };
    });

    const postDays = rows.filter((r) => r.hasPost).length;

    // "avg engagement / day" should report the true daily average, not the
    // sum of rolling-window values (which would count each post up to 7
    // times). Compute it directly from posts published within the range.
    const firstMs = days.length > 0 ? new Date(`${days[0]}T00:00:00Z`).getTime() : 0;
    const lastMs =
      days.length > 0 ? new Date(`${days[days.length - 1]}T00:00:00Z`).getTime() + DAY_MS : 0;
    let engagementInRange = 0;
    for (const p of data) {
      if (!p.published_at) continue;
      const t = new Date(p.published_at).getTime();
      if (t >= firstMs && t < lastMs) {
        engagementInRange += p.engagement_score || 0;
      }
    }
    const avg = rows.length > 0 ? engagementInRange / rows.length : 0;

    return { chartData: rows, displayedAvg: avg, postDaysInRange: postDays };
  }, [data, dailyEngagement, range]);

  return (
    <div className="bg-bg-card rounded-xl p-6 min-w-0 overflow-hidden">
      <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Evolución de las interacciones</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range filter */}
          <div
            style={{
              display: 'flex',
              background: '#F1EEE6',
              borderRadius: 8,
              padding: 2,
              gap: 2,
            }}
          >
            {(['7d', '30d', '90d', 'all'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: range === r ? '#0A66C2' : 'transparent',
                  color: range === r ? '#fff' : '#76607A',
                  transition: 'all 0.15s',
                }}
              >
                {r === 'all' ? 'Todo' : r}
              </button>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap pl-2">
            <span className="flex items-center gap-1">
              <span
                style={{
                  display: 'inline-flex',
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  background: PENCIL_BG_NORMAL,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PencilIcon size={12} color="#ffffff" />
              </span>
              Post
            </span>
            <span className="flex items-center gap-1">
              <span
                style={{
                  display: 'inline-flex',
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  background: PENCIL_BG_OUTLIER,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PencilIcon size={12} color="#ffffff" />
              </span>
              Outlier
            </span>
          </div>
        </div>
      </div>
      <div className="text-[11px] text-text-muted mb-3 space-y-0.5">
        <p>
          <span className="text-text-secondary font-medium">Interacciones</span>: reacciones + comentarios×2 + compartidos×3.
          Para cada día D sumamos las interacciones de todos los posts publicados en los{' '}
          <span className="text-text-secondary font-medium">7 días anteriores</span>, que es la ventana
          de distribución de LinkedIn. Un post de hace tres días sigue sumando al valor de hoy, así que los
          días sin publicar no caen a cero mientras el creador tenga contenido reciente activo.
        </p>
        <p className="text-text-muted/80 italic">
          Si la cuenta está conectada por Unipile, cambiamos esa suma móvil por las interacciones reales
          de cada día, medidas con lecturas cada hora. "Interacciones medias / día" muestra la media diaria
          real del periodo elegido, no la media de la curva, que la ventana móvil inflaría.
        </p>
      </div>
      <div className="flex items-center gap-4 mb-3 text-xs text-text-muted">
        <span>
          <span className="text-text-secondary font-medium">{postDaysInRange}</span>{' '}
          {postDaysInRange === 1 ? 'día' : 'días'} con post{' '}
          {range === 'all' ? 'en todo el periodo' : `en los últimos ${RANGE_DAYS[range]} días`}
        </span>
        <span>
          interacciones medias / día:{' '}
          <span className="text-text-secondary font-medium">{Math.round(displayedAvg).toLocaleString('es-ES')}</span>
        </span>
      </div>
      <div ref={wrapperRef} style={{ position: 'relative' }}>
        {/* The rich tooltip is triggered from the pencil strip below — hovering
            the curve area no longer opens it (felt noisier than useful when
            most days don't have a post). */}
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <AreaChart data={chartData} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7E3AA8" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#7E3AA8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tickFormatter={formatDayLabel}
              tick={{ fill: '#76607A', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#E6E0E3' }}
              interval="preserveStartEnd"
              minTickGap={32}
              height={X_AXIS_HEIGHT}
            />
            <YAxis
              width={Y_AXIS_WIDTH}
              tick={{ fill: '#76607A', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#E6E0E3' }}
            />
            {/* Tooltip component omitted — hover on pencils drives the rich
                tooltip rendered below (outside Recharts). */}
            <Area
              type="monotone"
              dataKey="engagement_score"
              stroke="#7E3AA8"
              strokeWidth={2}
              fill="url(#engagementFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
        {/* Sticky custom tooltip — managed outside Recharts so it stays open
            while the cursor is hovering its own card (and the "View on
            LinkedIn" button remains clickable). */}
        {hover && (() => {
          const d = chartData.find((x) => x.day === hover.day);
          if (!d) return null;
          const heading = d.hasPost
            ? `${d.date} · ${d.postCount} post${d.postCount > 1 ? 's' : ''}`
            : `${d.date} · sin post`;
          const preview = d.topPost?.content_text || d.topPost?.hook_text || '';
          const containerW = wrapperRef.current?.offsetWidth ?? 600;
          const tooltipW = 220;
          const gap = 12;
          // Flip to the left of the cursor when we'd overflow the right edge.
          const showLeft = hover.x + tooltipW + gap + 4 > containerW;
          const leftPx = showLeft ? hover.x - tooltipW - gap : hover.x + gap;
          return (
            <div
              onMouseEnter={cancelClear}
              onMouseLeave={() => setHover(null)}
              style={{
                position: 'absolute',
                left: Math.max(0, leftPx),
                // Anchor the BOTTOM of the tooltip just above the hovered
                // point using translateY(-100%) — this way the tooltip always
                // grows upward into the chart area and never spills below the
                // pencil strip (which would then be clipped by the outer
                // card's overflow-hidden).
                top: Math.max(0, hover.y) - 8,
                transform: 'translateY(-100%)',
                width: tooltipW,
                background: '#FFFFFF',
                border: '1px solid #E6E0E3',
                borderRadius: 8,
                color: '#431B44',
                fontSize: 13,
                padding: 10,
                boxShadow: '0 6px 20px rgba(67,27,68,0.12)',
                zIndex: 50,
                pointerEvents: 'auto',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{heading}</div>
              <div style={{ color: '#664767' }}>
                Interacciones:{' '}
                <span style={{ color: '#431B44', fontWeight: 600 }}>
                  {d.engagement_score.toLocaleString('es-ES')}
                </span>
              </div>
              {/* Extra context lines — always shown when applicable, between
                  the engagement metric and the post preview/CTA below. */}
              {(d.hasPost || d.activePostCount > 0) && (
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '1px solid #E6E0E3',
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  {d.hasPost && (
                    <div>
                      <span style={{ color: '#76607A' }}>Mejor post: </span>
                      <span
                        style={{
                          color: d.is_outlier ? '#7E3AA8' : '#664767',
                          fontWeight: 600,
                        }}
                      >
                        {d.outlier_ratio.toFixed(1)}× la media del creador
                      </span>
                      {d.is_outlier && (
                        <span
                          style={{
                            marginLeft: 6,
                            padding: '1px 5px',
                            borderRadius: 3,
                            background: 'rgba(126,58,168,0.15)',
                            color: '#7E3AA8',
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: 0.3,
                          }}
                        >
                          OUTLIER
                        </span>
                      )}
                    </div>
                  )}
                  {d.activePostCount > 0 && (
                    <div style={{ color: '#76607A', fontSize: 11, marginTop: 2 }}>
                      {d.activePostCount} {d.activePostCount > 1 ? 'posts activos' : 'post activo'} en la ventana de 7 días
                    </div>
                  )}
                </div>
              )}
              {d.hasPost && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 8,
                    background: '#FAF8F4',
                    border: '1px solid #E6E0E3',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  {preview ? (
                    <div
                      style={{
                        color: '#664767',
                        whiteSpace: 'pre-wrap',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        marginBottom: 8,
                        lineHeight: 1.35,
                      }}
                    >
                      {preview}
                    </div>
                  ) : (
                    <div
                      style={{ color: '#8A7A8B', fontStyle: 'italic', marginBottom: 8 }}
                    >
                      (sin vista previa)
                    </div>
                  )}
                  {d.topPost?.post_url && (
                    <a
                      href={d.topPost.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        background: '#0A66C2',
                        color: '#fff',
                        borderRadius: 4,
                        textDecoration: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      Ver en LinkedIn →
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })()}
        {/* Pencil strip — absolutely positioned so each badge lands directly
            under the curve's data point. Recharts AreaChart with category
            XAxis anchors the first point at the left edge of the plot area
            and the last at the right edge, so the i-th point sits at
            i / (n-1) of the plot width. */}
        <div
          style={{
            position: 'relative',
            marginLeft: Y_AXIS_WIDTH + CHART_MARGIN.left,
            marginRight: CHART_MARGIN.right,
            marginTop: 6,
            minHeight: 22,
          }}
          aria-label="Días con posts publicados"
        >
          {chartData.map((d, i) => {
            if (!d.hasPost) return null;
            const isOut = d.is_outlier;
            const n = chartData.length;
            const left = n > 1 ? (i / (n - 1)) * 100 : 50;
            return (
              <div
                key={i}
                onMouseEnter={(e) => {
                  cancelClear();
                  const pencilRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const wrapperRect = wrapperRef.current?.getBoundingClientRect();
                  if (!wrapperRect) return;
                  setHover({
                    day: d.day,
                    x: pencilRect.left + pencilRect.width / 2 - wrapperRect.left,
                    // Use the pencil's actual top so the tooltip (anchored
                    // bottom-up via translateY(-100%)) sits right above it and
                    // never extends below the chart area.
                    y: pencilRect.top - wrapperRect.top,
                  });
                }}
                onMouseLeave={scheduleClear}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: 0,
                  transform: 'translateX(-50%)',
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: isOut ? PENCIL_BG_OUTLIER : PENCIL_BG_NORMAL,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <PencilIcon size={14} color="#ffffff" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
