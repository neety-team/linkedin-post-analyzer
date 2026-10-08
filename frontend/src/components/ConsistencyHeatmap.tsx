import { useChartColors } from '../theme';
interface TimelinePoint {
  published_at: string;
}

interface Props {
  data: TimelinePoint[];
}

export default function ConsistencyHeatmap({ data }: Props) {
  const cc = useChartColors();
  // Build a map of date -> post count for the last 26 weeks
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000);

  const dateCounts: Record<string, number> = {};
  for (const d of data) {
    const date = new Date(d.published_at).toISOString().split('T')[0];
    dateCounts[date] = (dateCounts[date] || 0) + 1;
  }

  // Generate weeks grid (26 weeks x 7 days)
  const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];
  const startDate = new Date(sixMonthsAgo);
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];
  const current = new Date(startDate);

  while (current <= now) {
    const dateStr = current.toISOString().split('T')[0];
    currentWeek.push({
      date: dateStr,
      count: dateCounts[dateStr] || 0,
      dayOfWeek: current.getDay(),
    });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    current.setDate(current.getDate() + 1);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const maxCount = Math.max(1, ...Object.values(dateCounts));

  function getColor(count: number): string {
    if (count === 0) return cc.emptyCell;
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.33) return cc.heatHot[0];
    if (intensity < 0.66) return cc.heatHot[1];
    return cc.heatHot[2];
  }

  const dayLabels = ['', 'Lun', '', 'Mié', '', 'Vie', ''];

  return (
    <div className="bg-bg-card rounded-xl p-6 min-w-0 overflow-hidden">
      <h3 className="text-lg font-semibold mb-4">Constancia al publicar</h3>
      <div className="flex gap-1 overflow-x-auto">
        <div className="flex flex-col gap-1 mr-2 text-[10px] text-text-muted">
          {dayLabels.map((l, i) => (
            <div key={i} className="h-[14px] flex items-center">{l}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                className="w-[14px] h-[14px] rounded-[2px] transition-colors"
                style={{ backgroundColor: getColor(day.count) }}
                title={`${day.date}: ${day.count} post${day.count !== 1 ? 's' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-text-muted">
        <span>Menos</span>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-[14px] h-[14px] rounded-[2px]"
            style={{ backgroundColor: getColor(i === 0 ? 0 : (i / 3) * maxCount) }}
          />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}
