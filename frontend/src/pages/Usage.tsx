import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import { useChartColors } from '../theme';

// Usage page — Claude/Anthropic spend per feature. Backed by /api/usage/summary
// which hits the claude_usage_logs table populated by trackedCreate /
// trackedStream on every messages.create call across the backend.

interface Totals {
  calls: number;
  input_tokens: string;
  output_tokens: string;
  cache_read_tokens: string;
  cache_write_tokens: string;
  cost_usd: string;
}
interface FeatureRow {
  feature: string;
  calls: number;
  input_tokens: string;
  output_tokens: string;
  cache_read_tokens: string;
  cache_write_tokens: string;
  cost_usd: string;
}
interface ModelRow {
  model: string;
  calls: number;
  input_tokens: string;
  output_tokens: string;
  cost_usd: string;
}
interface DayRow {
  day: string;
  calls: number;
  cost_usd: string;
}
interface Summary {
  window_days: number;
  totals: Totals;
  by_feature: FeatureRow[];
  by_model: ModelRow[];
  by_day: DayRow[];
}

const RANGES: { label: string; days: number }[] = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '365d', days: 365 },
];

// Friendly labels for the feature codes the wrapper records. New features
// just fall through to title-cased default rendering until we add them
// here — no maintenance burden if you forget.
const FEATURE_LABELS: Record<string, string> = {
  post_creator_chat: 'Chat del Post Creator',
  ideas_variant_generation: 'Ideas — generación de variantes',
  ideas_archetype_selector: 'Ideas — selector de arquetipo',
  ideas_brainstorm: 'Ideas — lluvia de ideas',
  ideas_outlier_classifier: 'Clasificador de outliers',
  comment_generator_9angles: 'Comentarios — 9 ángulos (Network)',
  comment_generator_supportive: 'Comentarios de apoyo (Google Chat)',
  reply_generator: 'Respuestas a comentarios (Comentarios)',
  niche_tagging: 'Etiquetado de nicho',
};

function fmtUsd(s: string | number): string {
  const n = typeof s === 'string' ? Number(s) : s;
  if (!Number.isFinite(n)) return '$0.00';
  if (n >= 1000) return `$${n.toFixed(0)}`;
  if (n >= 10) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function fmtInt(s: string | number): string {
  const n = typeof s === 'string' ? Number(s) : s;
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('es-ES');
}

function fmtTokens(s: string | number): string {
  const n = typeof s === 'string' ? Number(s) : s;
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('es-ES');
}

const MODEL_TINT: Record<string, string> = {
  'claude-opus-4-8': 'text-danger',
  'claude-opus-4-7': 'text-danger',
  'claude-sonnet-4-6': 'text-yellow-700 dark:text-yellow-300',
  'claude-haiku-4-5-20251001': 'text-success',
  'claude-haiku-4-5': 'text-success',
};

export default function Usage() {
  const cc = useChartColors();
  const [days, setDays] = useState(30);
  const { data, loading, error } = useApi<Summary>(`/api/usage/summary?days=${days}`);

  const dailyCost = useMemo(() => {
    if (!data) return [];
    return data.by_day.map((d) => ({ day: d.day, cost: Number(d.cost_usd) }));
  }, [data]);

  const totalCost = data ? Number(data.totals.cost_usd) : 0;
  const dailyAvg = data && data.window_days > 0 ? totalCost / data.window_days : 0;
  const projectedMonthly = dailyAvg * 30;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">💸 Consumo de Claude</h1>
          <p className="text-text-secondary">
            Lo que está fundiendo tokens. Una fila por llamada a Claude, agregado por función y modelo.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                days === r.days
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-muted hover:text-text-secondary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/5 border border-danger/30 rounded-lg p-3">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-text-muted">Cargando…</p>}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label={`Coste últimos ${data.window_days}d`} value={fmtUsd(data.totals.cost_usd)} />
            <KpiCard label="Coste medio / día" value={fmtUsd(dailyAvg)} />
            <KpiCard label="Proyección 30d" value={fmtUsd(projectedMonthly)} sub="al ritmo actual" />
            <KpiCard label="Llamadas totales" value={fmtInt(data.totals.calls)} />
          </div>

          {/* Daily cost line */}
          {dailyCost.length > 0 && (
            <div className="bg-bg-card border border-border rounded-xl p-5">
              <h3 className="text-lg font-semibold mb-1">Coste diario</h3>
              <p className="text-xs text-text-muted mb-4">USD por día en la ventana seleccionada</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyCost} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
                  <XAxis dataKey="day" tick={{ fill: cc.muted, fontSize: 11 }} axisLine={{ stroke: cc.grid }} />
                  <YAxis
                    tick={{ fill: cc.muted, fontSize: 11 }}
                    axisLine={{ stroke: cc.grid }}
                    tickFormatter={(v) => `$${v.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: 8, color: cc.text, fontSize: 12 }}
                    formatter={(v: any) => [fmtUsd(Number(v)), 'coste']}
                  />
                  <Line type="monotone" dataKey="cost" stroke={cc.engagement} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Features table */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold mb-1">Gasto por función</h3>
            <p className="text-xs text-text-muted mb-4">Ordenado por coste descendente. % indica la cuota de cada función sobre el total.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[10px] uppercase tracking-wide text-text-muted border-b border-border">
                  <tr>
                    <th className="py-2 pr-3">Función</th>
                    <th className="py-2 pr-3 text-right">Llamadas</th>
                    <th className="py-2 pr-3 text-right">Entrada</th>
                    <th className="py-2 pr-3 text-right">Salida</th>
                    <th className="py-2 pr-3 text-right">Leído de caché</th>
                    <th className="py-2 pr-3 text-right">Coste</th>
                    <th className="py-2 pr-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_feature.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-text-muted text-xs">
                        Aún no hay datos en esta ventana.
                      </td>
                    </tr>
                  ) : (
                    data.by_feature.map((f) => {
                      const cost = Number(f.cost_usd);
                      const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0;
                      return (
                        <tr key={f.feature} className="border-b border-border/40">
                          <td className="py-2 pr-3 text-text-primary">
                            {FEATURE_LABELS[f.feature] || f.feature}
                            <div className="text-[10px] text-text-muted">{f.feature}</div>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-text-secondary">{fmtInt(f.calls)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-text-secondary">{fmtTokens(f.input_tokens)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-text-secondary">{fmtTokens(f.output_tokens)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-text-secondary">{fmtTokens(f.cache_read_tokens)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums font-medium text-accent">{fmtUsd(cost)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{pct.toFixed(0)}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model mix */}
          {data.by_model.length > 0 && (
            <div className="bg-bg-card border border-border rounded-xl p-5">
              <h3 className="text-lg font-semibold mb-1">Mix de modelos</h3>
              <p className="text-xs text-text-muted mb-4">Para decidir qué bajar a Sonnet o Haiku</p>
              <table className="w-full text-sm">
                <thead className="text-left text-[10px] uppercase tracking-wide text-text-muted border-b border-border">
                  <tr>
                    <th className="py-2 pr-3">Modelo</th>
                    <th className="py-2 pr-3 text-right">Llamadas</th>
                    <th className="py-2 pr-3 text-right">Entrada</th>
                    <th className="py-2 pr-3 text-right">Salida</th>
                    <th className="py-2 pr-3 text-right">Coste</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_model.map((m) => (
                    <tr key={m.model} className="border-b border-border/40">
                      <td className={`py-2 pr-3 font-medium ${MODEL_TINT[m.model] || 'text-text-primary'}`}>{m.model}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text-secondary">{fmtInt(m.calls)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text-secondary">{fmtTokens(m.input_tokens)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-text-secondary">{fmtTokens(m.output_tokens)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-accent">{fmtUsd(m.cost_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="text-2xl font-bold mt-1 text-text-primary">{value}</div>
      {sub && <div className="text-[10px] text-text-muted mt-1">{sub}</div>}
    </div>
  );
}
