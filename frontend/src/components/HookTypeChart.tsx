import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { HOOK_TYPE_LABELS, etiqueta } from '../utils/etiquetas';

interface HookTypeData {
  type: string;
  count: number;
  avg_ratio: number;
  avg_engagement: number;
}

interface Props {
  data: HookTypeData[];
}


const COLORS = ['#e8935a', '#67e8f9', '#34d399', '#a78bfa', '#f87171', '#fbbf24', '#6366f1', '#38bdf8', '#f472b6', '#fb923c', '#4ade80', '#818cf8', '#22d3ee', '#facc15', '#c084fc', '#f87171', '#94a3b8', '#2dd4bf', '#e879f9', '#4b5563'];

export default function HookTypeChart({ data }: Props) {
  const chartData = data
    .filter((d) => d.count >= 1)
    .map((d, i) => ({
      name: etiqueta(HOOK_TYPE_LABELS, d.type),
      count: d.count,
      avg_ratio: d.avg_ratio,
      avg_engagement: d.avg_engagement,
      color: COLORS[i % COLORS.length],
    }));

  return (
    <div className="bg-bg-card rounded-xl p-6 min-w-0 overflow-hidden">
      <h3 className="text-lg font-semibold mb-1">Rendimiento por tipo de gancho</h3>
      <p className="text-text-muted text-xs mb-4">Multiplicador medio de outlier (Xx) según cómo arranca el gancho</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 80 }}>
          <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2e3348' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2e3348' }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#222639',
              border: '1px solid #2e3348',
              borderRadius: '8px',
              color: '#e8eaf0',
              fontSize: '13px',
            }}
            formatter={(value: any, name: any) => {
              if (name === 'avg_ratio') return [`${value}x`, 'Multiplicador medio'];
              if (name === 'avg_engagement') return [Number(value).toLocaleString('es-ES'), 'Interacciones medias'];
              return [value, name];
            }}
          />
          <Bar dataKey="avg_ratio" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-2">
        {chartData.map((d) => (
          <span key={d.name} className="text-[10px] text-text-muted">
            {d.name}: {d.count} {d.count === 1 ? 'post' : 'posts'} ({d.avg_engagement.toLocaleString('es-ES')} interacciones)
          </span>
        ))}
      </div>
    </div>
  );
}
