interface Pattern {
  type: string;
  title: string;
  value: string;
  detail: string;
}

interface Props {
  patterns: Pattern[];
}

const typeIcons: Record<string, string> = {
  content_type: '📊',
  word_count: '📝',
  hashtags: '#️⃣',
  cta: '📣',
  best_day: '📅',
  emoji: '😀',
  hooks: '🎣',
};

export default function PatternInsights({ patterns }: Props) {
  if (patterns.length === 0) {
    return (
      <div className="bg-bg-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Patrones detectados</h3>
        <p className="text-text-muted">Aún no hay datos suficientes para detectar patrones.</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Patrones detectados</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {patterns.filter(p => p.type !== 'hooks').map((p, i) => (
          <div key={i} className="bg-bg-secondary rounded-lg p-4 border border-border">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{typeIcons[p.type] || '💡'}</span>
              <div>
                <p className="text-text-secondary text-sm">{p.title}</p>
                <p className="text-accent font-bold text-lg">{p.value}</p>
                <p className="text-text-muted text-xs mt-1">{p.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {patterns.filter(p => p.type === 'hooks').map((p, i) => (
        <div key={i} className="mt-4 bg-bg-secondary rounded-lg p-4 border border-border">
          <p className="text-text-secondary text-sm mb-2">🎣 {p.title}</p>
          <div className="space-y-2">
            {p.detail.split(' | ').map((hook, hi) => (
              <p key={hi} className="text-text-primary text-sm bg-bg-card rounded px-3 py-2">
                "{hook}"
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
