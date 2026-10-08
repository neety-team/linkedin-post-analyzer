import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface TypeCount {
  content_type: string;
  count: string;
}

interface Props {
  all: TypeCount[];
  outliers: TypeCount[];
}

const COLORS = ['#E66A1B', '#4F52D9', '#7C5CD6', '#C73B3B', '#B07510', '#5B8FE0', '#9A7FE0', '#E07878', '#D4A21C', '#1E9160', '#0A66C2'];

const typeLabels: Record<string, string> = {
  text: 'Texto',
  text_image: 'Texto + foto',
  text_carousel: 'Texto + carrusel',
  text_video: 'Texto + vídeo',
  text_document: 'Texto + documento',
  image: 'Solo foto',
  carousel: 'Solo carrusel',
  video: 'Solo vídeo',
  document: 'Solo documento',
  poll: 'Encuesta',
  article: 'Artículo',
};

export default function ContentTypeBreakdown({ all, outliers }: Props) {
  const allData = all.map((d) => ({ name: typeLabels[d.content_type] || d.content_type, value: parseInt(d.count, 10) }));
  const outlierData = outliers.map((d) => ({ name: typeLabels[d.content_type] || d.content_type, value: parseInt(d.count, 10) }));

  return (
    <div className="bg-bg-card rounded-xl p-6 min-w-0 overflow-hidden">
      <h3 className="text-lg font-semibold mb-4">Reparto por tipo de contenido</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-text-secondary text-sm mb-2 text-center">Todos los posts</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={allData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                {allData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E0E3', borderRadius: '8px', color: '#431B44', fontSize: '13px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#76607A' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-text-secondary text-sm mb-2 text-center">Solo outliers</p>
          {outlierData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={outlierData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {outlierData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E0E3', borderRadius: '8px', color: '#431B44', fontSize: '13px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#76607A' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-text-muted text-sm">Aún no hay outliers</div>
          )}
        </div>
      </div>
    </div>
  );
}
