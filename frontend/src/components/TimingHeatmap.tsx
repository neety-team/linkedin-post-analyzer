import { useChartColors } from '../theme';
interface TimingSlot {
  day: number;
  hour: number;
  count: number;
  avg_engagement: number;
  outliers: number;
  outlier_rate: number;
}

interface BestSlot {
  day: number;
  hour: number;
  count: number;
  avg_engagement: number;
  outliers: number;
  outlier_rate: number;
}

interface Props {
  heatmap: TimingSlot[];
  bestSlots: BestSlot[];
  timezoneLabel?: string;
  location?: string;
}

const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const dayLabelsFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function formatHour(h: number): string {
  // Formato de 24 horas, como se lee en España.
  return `${h}:00`;
}

export default function TimingHeatmap({ heatmap, bestSlots, timezoneLabel, location }: Props) {
  const cc = useChartColors();
  // Build a lookup: day-hour → slot
  const lookup: Record<string, TimingSlot> = {};
  for (const s of heatmap) {
    lookup[`${s.day}-${s.hour}`] = s;
  }

  // Find max for color scaling
  const maxEng = Math.max(1, ...heatmap.map((s) => s.avg_engagement));

  // Show hours 6-23 (most relevant for LinkedIn)
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  function getCellColor(slot: TimingSlot | undefined): string {
    if (!slot || slot.count === 0) return cc.emptyCell;
    const intensity = slot.avg_engagement / maxEng;
    if (slot.outlier_rate > 0) {
      // Has outliers — orange spectrum
      if (intensity > 0.7) return cc.heatHot[2];
      if (intensity > 0.4) return cc.heatHot[1];
      return cc.heatHot[0];
    }
    // Normal — blue/green spectrum
    if (intensity > 0.7) return cc.heatData[2];
    if (intensity > 0.4) return cc.heatData[1];
    return cc.heatData[0];
  }

  function getCellBorder(slot: TimingSlot | undefined): string {
    if (!slot) return 'transparent';
    if (slot.outlier_rate >= 50) return cc.diamond;
    return 'transparent';
  }

  // Compute best day and best hour overall
  const dayStats: Record<number, { count: number; totalEng: number; outliers: number }> = {};
  const hourStats: Record<number, { count: number; totalEng: number; outliers: number }> = {};
  for (const s of heatmap) {
    if (!dayStats[s.day]) dayStats[s.day] = { count: 0, totalEng: 0, outliers: 0 };
    dayStats[s.day].count += s.count;
    dayStats[s.day].totalEng += s.avg_engagement * s.count;
    dayStats[s.day].outliers += s.outliers;

    if (!hourStats[s.hour]) hourStats[s.hour] = { count: 0, totalEng: 0, outliers: 0 };
    hourStats[s.hour].count += s.count;
    hourStats[s.hour].totalEng += s.avg_engagement * s.count;
    hourStats[s.hour].outliers += s.outliers;
  }

  const bestDay = Object.entries(dayStats)
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => (b[1].totalEng / b[1].count) - (a[1].totalEng / a[1].count))[0];

  const bestHour = Object.entries(hourStats)
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => (b[1].totalEng / b[1].count) - (a[1].totalEng / a[1].count))[0];

  const bestDayOutlier = Object.entries(dayStats)
    .filter(([, v]) => v.outliers > 0)
    .sort((a, b) => b[1].outliers - a[1].outliers)[0];

  const bestHourOutlier = Object.entries(hourStats)
    .filter(([, v]) => v.outliers > 0)
    .sort((a, b) => b[1].outliers - a[1].outliers)[0];

  return (
    <div className="bg-bg-card rounded-xl p-6 min-w-0 overflow-hidden">
      <div className="flex items-center gap-3 mb-1">
        <h3 className="text-lg font-semibold">Mejor hora para publicar</h3>
        {timezoneLabel && (
          <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-md font-medium">
            {timezoneLabel}
          </span>
        )}
      </div>
      <p className="text-text-muted text-xs mb-4">
        Por día y hora{location ? ` (hora local de ${location})` : timezoneLabel && timezoneLabel !== 'UTC' ? ` (${timezoneLabel})` : ' (UTC)'}: naranja = hay outliers, teal = solo posts normales; cuanto más intenso, más interacciones.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-bg-secondary rounded-lg p-3 text-center">
          <p className="text-text-muted text-[10px]">Mejor día (interacciones medias)</p>
          <p className="text-text-primary font-bold">
            {bestDay ? dayLabelsFull[parseInt(bestDay[0])] : '--'}
          </p>
          {bestDay && (
            <p className="text-text-muted text-[10px]">
              {Math.round(bestDay[1].totalEng / bestDay[1].count).toLocaleString('es-ES')} de media
            </p>
          )}
        </div>
        <div className="bg-bg-secondary rounded-lg p-3 text-center">
          <p className="text-text-muted text-[10px]">Mejor hora (interacciones medias)</p>
          <p className="text-text-primary font-bold">
            {bestHour ? formatHour(parseInt(bestHour[0])) : '--'}
          </p>
          {bestHour && (
            <p className="text-text-muted text-[10px]">
              {Math.round(bestHour[1].totalEng / bestHour[1].count).toLocaleString('es-ES')} de media
            </p>
          )}
        </div>
        <div className="bg-bg-secondary rounded-lg p-3 text-center">
          <p className="text-accent text-[10px]">Mejor día (outliers)</p>
          <p className="text-accent font-bold">
            {bestDayOutlier ? dayLabelsFull[parseInt(bestDayOutlier[0])] : '--'}
          </p>
          {bestDayOutlier && (
            <p className="text-text-muted text-[10px]">
              {bestDayOutlier[1].outliers} {bestDayOutlier[1].outliers === 1 ? 'outlier' : 'outliers'}
            </p>
          )}
        </div>
        <div className="bg-bg-secondary rounded-lg p-3 text-center">
          <p className="text-accent text-[10px]">Mejor hora (outliers)</p>
          <p className="text-accent font-bold">
            {bestHourOutlier ? formatHour(parseInt(bestHourOutlier[0])) : '--'}
          </p>
          {bestHourOutlier && (
            <p className="text-text-muted text-[10px]">
              {bestHourOutlier[1].outliers} {bestHourOutlier[1].outliers === 1 ? 'outlier' : 'outliers'}
            </p>
          )}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex ml-10 mb-1">
            {hours.map((h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-text-muted">
                {h % 3 === 0 ? formatHour(h) : ''}
              </div>
            ))}
          </div>

          {/* Rows by day */}
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <div key={day} className="flex items-center mb-[3px]">
              <div className="w-10 text-[10px] text-text-muted text-right pr-2 shrink-0">
                {dayLabels[day]}
              </div>
              <div className="flex flex-1 gap-[2px]">
                {hours.map((hour) => {
                  const slot = lookup[`${day}-${hour}`];
                  return (
                    <div
                      key={hour}
                      className="flex-1 aspect-square rounded-[3px] transition-colors cursor-default"
                      style={{
                        backgroundColor: getCellColor(slot),
                        boxShadow: getCellBorder(slot) !== 'transparent' ? `inset 0 0 0 1.5px ${getCellBorder(slot)}` : 'none',
                        minHeight: '18px',
                      }}
                      title={
                        slot && slot.count > 0
                          ? `${dayLabelsFull[day]} ${formatHour(hour)}: ${slot.count} ${slot.count === 1 ? 'post' : 'posts'}, ${slot.avg_engagement.toLocaleString('es-ES')} interacciones de media, ${slot.outliers} ${slot.outliers === 1 ? 'outlier' : 'outliers'}`
                          : `${dayLabelsFull[day]} ${formatHour(hour)}: sin posts`
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-text-muted">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: cc.heatData[0] }} />
          <span>Normal (bajo)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: cc.heatData[2] }} />
          <span>Normal (alto)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: cc.heatHot[0] }} />
          <span>Con outliers (bajo)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: cc.heatHot[2] }} />
          <span>Con outliers (alto)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: cc.emptyCell, border: `1.5px solid ${cc.diamond}` }} />
          <span>50%+ de outliers</span>
        </div>
      </div>

      {/* Best slots table */}
      {bestSlots.length > 0 && (
        <div className="mt-5">
          <p className="text-text-secondary text-sm font-medium mb-2">Las 5 mejores franjas (por interacciones medias)</p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {bestSlots.map((s, i) => (
              <div
                key={i}
                className={`rounded-lg p-3 text-center border ${
                  s.outliers > 0
                    ? 'bg-accent/10 border-accent/30'
                    : 'bg-bg-secondary border-border/50'
                }`}
              >
                <p className="font-bold text-text-primary text-sm">
                  {dayLabels[s.day]} {formatHour(s.hour)}
                </p>
                <p className="text-text-muted text-[10px]">
                  {s.avg_engagement.toLocaleString('es-ES')} de media · {s.count} {s.count === 1 ? 'post' : 'posts'}
                </p>
                {s.outliers > 0 && (
                  <p className="text-accent text-[10px] font-medium">{s.outliers} {s.outliers === 1 ? 'outlier' : 'outliers'}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
