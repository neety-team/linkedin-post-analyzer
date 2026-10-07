import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StructureData {
  structure: string;
  count: number;
  avg_ratio: number;
  avg_engagement: number;
}

interface Props {
  data: StructureData[];
}

const structureLabels: Record<string, string> = {
  hook_list_cta: 'Gancho>Lista>CTA',
  hook_story_lesson_cta: 'Gancho>Historia>Lección>CTA',
  problem_agitate_solve: 'Problema>Agitación>Solución',
  contrarian_proof_reframe: 'Contracorriente>Prueba>Giro',
  confession_insight_takeaway: 'Confesión>Aprendizaje>Conclusión',
  list_framework: 'Lista / Marco',
  problem_solution: 'Problema > Solución',
  story_lesson: 'Historia > Lección',
  before_after: 'Antes / Después',
  step_by_step: 'Paso a paso',
  myth_busting: 'Desmontar mitos',
  question_answer: 'Pregunta > Respuesta',
  observation_insight: 'Observación > Aprendizaje',
  prediction_vision: 'Predicción / Visión',
  motivational_manifesto: 'Motivacional',
  authority_framework: 'Autoridad > Marco',
  comparison: 'Comparativa',
  short_punchy: 'Corto y directo',
  long_form_essay: 'Ensayo largo',
  narrative_arc: 'Arco narrativo',
  content_with_cta: 'Contenido + CTA',
  data_driven: 'Basado en datos',
  other: 'Otra',
};

const COLORS = ['#34d399', '#e8935a', '#67e8f9', '#a78bfa', '#fbbf24', '#f87171', '#6366f1', '#38bdf8', '#f472b6', '#fb923c', '#4ade80', '#818cf8', '#22d3ee', '#facc15', '#c084fc', '#94a3b8', '#2dd4bf', '#e879f9', '#4b5563'];

export default function StructureChart({ data }: Props) {
  const chartData = data
    .filter((d) => d.count >= 1)
    .map((d, i) => ({
      name: structureLabels[d.structure] || d.structure,
      count: d.count,
      avg_ratio: d.avg_ratio,
      avg_engagement: d.avg_engagement,
      color: COLORS[i % COLORS.length],
    }));

  return (
    <div className="bg-bg-card rounded-xl p-6 min-w-0 overflow-hidden">
      <h3 className="text-lg font-semibold mb-1">Rendimiento por estructura del post</h3>
      <p className="text-text-muted text-xs mb-4">Multiplicador medio de outlier (Xx) según la estructura</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 100 }}>
          <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2e3348' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2e3348' }}
            width={100}
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
