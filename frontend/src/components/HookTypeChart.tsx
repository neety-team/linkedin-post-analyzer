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


const COLORS = ['#E66A1B', '#7E3AA8', '#1E9160', '#7C5CD6', '#C73B3B', '#B07510', '#4F52D9', '#0A66C2', '#C2408A', '#B4531A', '#2FA866', '#6B6EE6', '#0E8FA8', '#B8930A', '#A15CD6', '#C73B3B', '#76607A', '#13998A', '#B83FC4', '#7A6B7B'];

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
          <XAxis type="number" tick={{ fill: '#76607A', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#E6E0E3' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#76607A', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#E6E0E3' }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E0E3',
              borderRadius: '8px',
              color: '#431B44',
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
