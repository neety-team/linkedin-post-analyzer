import { Post } from '../models/post';
import { classifyTone } from './engagement';

interface PatternInsight {
  type: string;
  title: string;
  value: string;
  detail: string;
}

export function detectPatterns(allPosts: Post[]): PatternInsight[] {
  const insights: PatternInsight[] = [];

  // Los patrones se sacan de `top_del_creador`, NO de `is_outlier`.
  //
  // Con is_outlier esta funcion cortaba en seco (`if (outliers.length === 0)
  // return []`) en las cuentas ultraconsistentes, que son justo las que mas
  // hay que estudiar: Adam Grant tiene max/media = 2,75x contra un umbral de
  // 3,00x, o sea CERO outliers por construccion, y el Explorer no sacaba ni un
  // patron de la cuenta mas viral de LinkedIn. Le pasaba a 4 de 142 cuentas.
  //
  // `top_del_creador` es relativo a la forma de cada cuenta, asi que siempre
  // devuelve algo mientras la cuenta tenga posts: 0 creadores vacios sobre los
  // 145 de la BD con >=10 posts.
  //
  // Fallback a is_outlier solo para no romper si llega un post viejo sin
  // recalcular todavia (la columna es NOT NULL DEFAULT FALSE).
  let outliers = allPosts.filter((p) => p.top_del_creador);
  if (outliers.length === 0) outliers = allPosts.filter((p) => p.is_outlier);
  const marcados = new Set(outliers.map((p) => p.id));
  const nonOutliers = allPosts.filter((p) => !marcados.has(p.id));

  if (outliers.length === 0) return insights;

  // 1. Most common content type in outliers
  const typeCounts: Record<string, number> = {};
  for (const p of outliers) {
    typeCounts[p.content_type] = (typeCounts[p.content_type] || 0) + 1;
  }
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  if (topType) {
    const pct = Math.round((topType[1] / outliers.length) * 100);
    insights.push({
      type: 'content_type',
      title: 'Tipo de contenido dominante en los outliers',
      value: `${pct}% ${formatContentType(topType[0])}`,
      detail: `${topType[1]} de los ${outliers.length} outliers son de tipo "${formatContentType(topType[0])}".`,
    });
  }

  // 2. Word count comparison
  const avgWordsOutlier = avg(outliers.map((p) => p.word_count));
  const avgWordsNormal = avg(nonOutliers.map((p) => p.word_count));
  if (avgWordsNormal > 0) {
    const diff = Math.round(((avgWordsOutlier - avgWordsNormal) / avgWordsNormal) * 100);
    const direction = diff > 0 ? 'más' : 'menos';
    insights.push({
      type: 'word_count',
      title: 'Longitud de los outliers frente a la media',
      value: `${Math.abs(diff)}% ${direction} palabras`,
      detail: `Los outliers tienen de media ${Math.round(avgWordsOutlier)} palabras, frente a ${Math.round(avgWordsNormal)} en los posts normales.`,
    });
  }

  // 3. Hook type analysis — ranked by avg outlier ratio (not raw engagement)
  const hookTypeCounts: Record<string, { count: number; totalRatio: number; totalEngagement: number }> = {};
  for (const p of allPosts) {
    const ht = p.hook_type || 'other';
    if (!hookTypeCounts[ht]) hookTypeCounts[ht] = { count: 0, totalRatio: 0, totalEngagement: 0 };
    hookTypeCounts[ht].count++;
    hookTypeCounts[ht].totalRatio += p.outlier_ratio;
    hookTypeCounts[ht].totalEngagement += p.engagement_score;
  }
  const hookTypeEntries = Object.entries(hookTypeCounts)
    .filter(([k]) => k !== 'other')
    .map(([type, data]) => ({
      type,
      avgRatio: data.count > 0 ? Math.round((data.totalRatio / data.count) * 100) / 100 : 0,
      avgEng: data.count > 0 ? data.totalEngagement / data.count : 0,
      count: data.count,
    }))
    .sort((a, b) => b.avgRatio - a.avgRatio);

  if (hookTypeEntries.length > 0) {
    const best = hookTypeEntries[0];
    const worst = hookTypeEntries[hookTypeEntries.length - 1];
    insights.push({
      type: 'hook_type',
      title: 'Tipo de gancho que mejor funciona',
      value: formatHookType(best.type),
      detail: `Los ganchos "${formatHookType(best.type)}" tienen un multiplicador medio de ${best.avgRatio}x (${worst.avgRatio > 0 ? Math.round(best.avgRatio / worst.avgRatio * 10) / 10 : ''}x más que "${formatHookType(worst.type)}") en ${best.count} posts.`,
    });
  }

  // 4. Post structure analysis — ranked by avg outlier ratio
  const structureCounts: Record<string, { count: number; totalRatio: number; totalEngagement: number }> = {};
  for (const p of allPosts) {
    const ps = p.post_structure || 'other';
    if (!structureCounts[ps]) structureCounts[ps] = { count: 0, totalRatio: 0, totalEngagement: 0 };
    structureCounts[ps].count++;
    structureCounts[ps].totalRatio += p.outlier_ratio;
    structureCounts[ps].totalEngagement += p.engagement_score;
  }
  const structEntries = Object.entries(structureCounts)
    .filter(([k]) => k !== 'other')
    .map(([structure, data]) => ({
      structure,
      avgRatio: data.count > 0 ? Math.round((data.totalRatio / data.count) * 100) / 100 : 0,
      avgEng: data.count > 0 ? data.totalEngagement / data.count : 0,
      count: data.count,
    }))
    .sort((a, b) => b.avgRatio - a.avgRatio);

  if (structEntries.length > 0) {
    const best = structEntries[0];
    insights.push({
      type: 'post_structure',
      title: 'Estructura que mejor funciona',
      value: formatStructure(best.structure),
      detail: `Los posts con estructura "${formatStructure(best.structure)}" tienen un multiplicador medio de ${best.avgRatio}x (${best.count} posts).`,
    });
  }

  // 5. Aggressive spacing impact
  const spacingPosts = allPosts.filter((p) => p.has_aggressive_spacing);
  const noSpacingPosts = allPosts.filter((p) => !p.has_aggressive_spacing);
  if (spacingPosts.length >= 3 && noSpacingPosts.length >= 3) {
    const avgSpacing = avg(spacingPosts.map((p) => p.engagement_score));
    const avgNoSpacing = avg(noSpacingPosts.map((p) => p.engagement_score));
    const diff = avgNoSpacing > 0 ? Math.round(((avgSpacing - avgNoSpacing) / avgNoSpacing) * 100) : 0;
    if (Math.abs(diff) > 10) {
      insights.push({
        type: 'spacing',
        title: 'Impacto del espaciado agresivo entre líneas',
        value: `${diff > 0 ? '+' : ''}${diff}% interacciones`,
        detail: `Los posts con espaciado agresivo tienen de media ${Math.round(avgSpacing)} interacciones, frente a ${Math.round(avgNoSpacing)} sin él.`,
      });
    }
  }

  // 6. Comment-to-like ratio (debate indicator)
  const highDebate = allPosts
    .filter((p) => p.comment_like_ratio > 0.1 && p.likes_count > 0)
    .sort((a, b) => b.comment_like_ratio - a.comment_like_ratio);
  const lowDebate = allPosts
    .filter((p) => p.comment_like_ratio <= 0.1 && p.comment_like_ratio >= 0 && p.likes_count > 0);
  if (highDebate.length >= 2 && lowDebate.length >= 2) {
    const avgHighDebate = avg(highDebate.map((p) => p.engagement_score));
    const avgLowDebate = avg(lowDebate.map((p) => p.engagement_score));
    insights.push({
      type: 'debate',
      title: 'Rendimiento de los posts con mucho debate',
      value: `${highDebate.length} posts de debate`,
      detail: `Los posts con muchos comentarios por reacción (>10%) tienen de media ${Math.round(avgHighDebate)} interacciones, frente a ${Math.round(avgLowDebate)} en los de poco debate.`,
    });
  }

  // 7. Hashtag usage
  const outlierHashtagRate = outliers.filter((p) => p.has_hashtags).length / outliers.length;
  const normalHashtagRate = nonOutliers.length > 0
    ? nonOutliers.filter((p) => p.has_hashtags).length / nonOutliers.length
    : 0;
  insights.push({
    type: 'hashtags',
    title: 'Uso de hashtags en los outliers',
    value: `${Math.round(outlierHashtagRate * 100)}% usa hashtags`,
    detail: `Outliers: ${Math.round(outlierHashtagRate * 100)}% · Posts normales: ${Math.round(normalHashtagRate * 100)}%.`,
  });

  // 8. CTA usage
  const outlierCTARate = outliers.filter((p) => p.has_call_to_action).length / outliers.length;
  const normalCTARate = nonOutliers.length > 0
    ? nonOutliers.filter((p) => p.has_call_to_action).length / nonOutliers.length
    : 0;
  insights.push({
    type: 'cta',
    title: 'Llamada a la acción en los outliers',
    value: `${Math.round(outlierCTARate * 100)}% incluye CTA`,
    detail: `Outliers: ${Math.round(outlierCTARate * 100)}% · Posts normales: ${Math.round(normalCTARate * 100)}%.`,
  });

  // 9. Best day of week
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayCounts: Record<number, number> = {};
  for (const p of outliers) {
    if (p.published_at) {
      const day = new Date(p.published_at).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
  }
  const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  if (topDay) {
    insights.push({
      type: 'best_day',
      title: 'Mejor día para outliers',
      value: dayNames[parseInt(topDay[0])],
      detail: `${topDay[1]} outliers se publicaron un ${dayNames[parseInt(topDay[0])].toLowerCase()}.`,
    });
  }

  // 10. Emoji usage
  const outlierEmojiRate = outliers.filter((p) => p.has_emoji).length / outliers.length;
  insights.push({
    type: 'emoji',
    title: 'Uso de emojis en los outliers',
    value: `${Math.round(outlierEmojiRate * 100)}% usa emojis`,
    detail: `El ${Math.round(outlierEmojiRate * 100)}% de los outliers lleva emojis.`,
  });

  // 11. Top hooks
  const hooks = outliers
    .filter((p) => p.hook_text)
    .map((p) => p.hook_text!)
    .slice(0, 5);
  if (hooks.length > 0) {
    insights.push({
      type: 'hooks',
      title: 'Mejores ganchos de los outliers',
      value: `${hooks.length} ganchos`,
      detail: hooks.join(' | '),
    });
  }

  return insights;
}

export function getCrossCreatorPatterns(allPosts: Post[], creatorTimezones: Record<string, string> = {}) {
  // Union de las dos señales, no solo `is_outlier`. En una lista MEZCLADA de
  // creadores, `is_outlier` esta sesgado hacia las cuentas de cola pesada y
  // excluye por completo a las ultraconsistentes: los 2.278 outliers de la
  // competencia solo tenian 6 posts de imagen-sola (0,26%) porque las tres
  // cuentas que viven de ese formato (Adam Grant, Alex y Leila Hormozi) casi no
  // aparecian. Con la union, esa distribucion deja de mentir.
  const outliers = allPosts.filter((p) => p.is_outlier || p.top_del_creador);
  const marcados = new Set(outliers.map((p) => p.id));
  const nonOutliers = allPosts.filter((p) => !marcados.has(p.id));

  // Content type distribution across all outliers
  const typeCounts: Record<string, number> = {};
  for (const p of outliers) {
    typeCounts[p.content_type] = (typeCounts[p.content_type] || 0) + 1;
  }

  // Average word count
  const avgWords = avg(outliers.map((p) => p.word_count));

  // CTA rate
  const ctaRate = outliers.length > 0
    ? outliers.filter((p) => p.has_call_to_action).length / outliers.length
    : 0;

  // Hook type distribution across outliers
  const hookTypeCounts: Record<string, number> = {};
  for (const p of outliers) {
    const ht = p.hook_type || 'other';
    hookTypeCounts[ht] = (hookTypeCounts[ht] || 0) + 1;
  }

  // Structure distribution across outliers
  const structureCounts: Record<string, number> = {};
  for (const p of outliers) {
    const ps = p.post_structure || 'other';
    structureCounts[ps] = (structureCounts[ps] || 0) + 1;
  }

  // Common traits of top outliers
  const topOutliers = outliers
    .sort((a, b) => b.outlier_ratio - a.outlier_ratio)
    .slice(0, Math.min(10, outliers.length));

  const commonTraits: string[] = [];
  if (topOutliers.length >= 3) {
    // Most common hook type
    const topHookTypes: Record<string, number> = {};
    for (const p of topOutliers) {
      const ht = p.hook_type || 'other';
      topHookTypes[ht] = (topHookTypes[ht] || 0) + 1;
    }
    const dominantHook = Object.entries(topHookTypes).sort((a, b) => b[1] - a[1])[0];
    if (dominantHook && dominantHook[1] / topOutliers.length >= 0.3) {
      commonTraits.push(`${Math.round(dominantHook[1] / topOutliers.length * 100)}% usa ganchos "${formatHookType(dominantHook[0])}"`);
    }

    // Most common structure
    const topStructures: Record<string, number> = {};
    for (const p of topOutliers) {
      const ps = p.post_structure || 'other';
      topStructures[ps] = (topStructures[ps] || 0) + 1;
    }
    const dominantStruct = Object.entries(topStructures).sort((a, b) => b[1] - a[1])[0];
    if (dominantStruct && dominantStruct[1] / topOutliers.length >= 0.3) {
      commonTraits.push(`${Math.round(dominantStruct[1] / topOutliers.length * 100)}% sigue la estructura "${formatStructure(dominantStruct[0])}"`);
    }

    // Average length
    const avgLen = avg(topOutliers.map((p) => p.word_count));
    commonTraits.push(`Media de ${Math.round(avgLen)} palabras`);

    // Best day
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const topDays: Record<number, number> = {};
    for (const p of topOutliers) {
      if (p.published_at) {
        const day = new Date(p.published_at).getDay();
        topDays[day] = (topDays[day] || 0) + 1;
      }
    }
    const bestDay = Object.entries(topDays).sort((a, b) => b[1] - a[1])[0];
    if (bestDay && bestDay[1] / topOutliers.length >= 0.25) {
      commonTraits.push(`${Math.round(bestDay[1] / topOutliers.length * 100)}% se publicó un ${dayNames[parseInt(bestDay[0])]}`);
    }
  }

  // Best days and hours for outliers (cross-creator, converted to each creator's local time).
  // Uses IANA timezone (e.g. "Europe/Madrid") so DST is handled correctly — otherwise every
  // summer/spring post gets shifted an hour early.
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const dayStats: Record<number, { total: number; outliers: number; totalRatio: number }> = {};
  const hourStats: Record<number, { total: number; outliers: number; totalRatio: number }> = {};
  const weekdayToNum: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const formatters = new Map<string, Intl.DateTimeFormat>();
  const getFormatter = (tz: string) => {
    let f = formatters.get(tz);
    if (!f) {
      try {
        f = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          weekday: 'short',
          hour: '2-digit',
          hourCycle: 'h23',
        });
      } catch {
        f = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: '2-digit', hourCycle: 'h23' });
      }
      formatters.set(tz, f);
    }
    return f;
  };
  for (const p of allPosts) {
    if (!p.published_at) continue;
    const d = new Date(p.published_at);
    const tz = creatorTimezones[p.creator_id] || 'UTC';
    const parts = getFormatter(tz).formatToParts(d);
    const weekdayPart = parts.find((x) => x.type === 'weekday')?.value;
    const hourPart = parts.find((x) => x.type === 'hour')?.value;
    if (!weekdayPart || !hourPart) continue;
    const day = weekdayToNum[weekdayPart];
    const hour = parseInt(hourPart, 10) % 24;
    if (day === undefined || isNaN(hour)) continue;
    if (!dayStats[day]) dayStats[day] = { total: 0, outliers: 0, totalRatio: 0 };
    dayStats[day].total++;
    if (p.is_outlier) { dayStats[day].outliers++; dayStats[day].totalRatio += p.outlier_ratio; }
    if (!hourStats[hour]) hourStats[hour] = { total: 0, outliers: 0, totalRatio: 0 };
    hourStats[hour].total++;
    if (p.is_outlier) { hourStats[hour].outliers++; hourStats[hour].totalRatio += p.outlier_ratio; }
  }

  const bestDays = Object.entries(dayStats)
    .map(([day, s]) => ({
      day: parseInt(day),
      day_name: dayNames[parseInt(day)],
      total_posts: s.total,
      outliers: s.outliers,
      outlier_rate: s.total > 0 ? Math.round((s.outliers / s.total) * 100) : 0,
      avg_outlier_ratio: s.outliers > 0 ? Math.round((s.totalRatio / s.outliers) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.outlier_rate - a.outlier_rate);

  // Avoid small-bucket variance noise: hours with only a handful of posts can hit a
  // spurious "10% outlier rate" from 1 lucky post. Require a meaningful sample —
  // at least 30 posts AND at least 20% of the busiest hour. Rare-hour posts
  // (e.g. 02:00) are legitimately rare, so they shouldn't dominate the ranking.
  const hourTotals = Object.values(hourStats).map((s) => s.total);
  const maxHourTotal = hourTotals.length > 0 ? Math.max(...hourTotals) : 0;
  const minHourSample = Math.max(30, Math.round(maxHourTotal * 0.2));
  const bestHours = Object.entries(hourStats)
    .filter(([, s]) => s.total >= minHourSample)
    .map(([hour, s]) => ({
      hour: parseInt(hour),
      hour_label: `${parseInt(hour)}:00`,
      total_posts: s.total,
      outliers: s.outliers,
      outlier_rate: s.total > 0 ? Math.round((s.outliers / s.total) * 100) : 0,
      avg_outlier_ratio: s.outliers > 0 ? Math.round((s.totalRatio / s.outliers) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.outlier_rate - a.outlier_rate);

  const outlierTiming = { best_days: bestDays, best_hours: bestHours };

  // Tone analysis — compute dynamically to avoid stale DB values
  // Classify each post's tone live
  const getTone = (p: Post) => {
    const live = classifyTone(p.content_text);
    return live !== 'neutral' ? live : (p.text_tone || 'neutral');
  };

  // Outlier tones
  const outlierTones: Record<string, { count: number; totalEng: number; totalRatio: number }> = {};
  for (const p of outliers) {
    const tone = getTone(p);
    if (!outlierTones[tone]) outlierTones[tone] = { count: 0, totalEng: 0, totalRatio: 0 };
    outlierTones[tone].count++;
    outlierTones[tone].totalEng += p.engagement_score;
    outlierTones[tone].totalRatio += p.outlier_ratio;
  }

  // Normal post tones (for comparison)
  const normalTones: Record<string, { count: number; totalEng: number; totalRatio: number }> = {};
  for (const p of nonOutliers) {
    const tone = getTone(p);
    if (!normalTones[tone]) normalTones[tone] = { count: 0, totalEng: 0, totalRatio: 0 };
    normalTones[tone].count++;
    normalTones[tone].totalEng += p.engagement_score;
    normalTones[tone].totalRatio += p.outlier_ratio;
  }

  // Build comparative breakdown — sorted by avg outlier ratio (not raw engagement)
  const allToneKeys = new Set([...Object.keys(outlierTones), ...Object.keys(normalTones)]);
  const toneComparison = [...allToneKeys]
    .filter((k) => k !== 'neutral')
    .map((tone) => {
      const o = outlierTones[tone] || { count: 0, totalEng: 0, totalRatio: 0 };
      const n = normalTones[tone] || { count: 0, totalEng: 0, totalRatio: 0 };
      return {
        tone,
        outlier_count: o.count,
        outlier_avg_ratio: o.count > 0 ? Math.round((o.totalRatio / o.count) * 100) / 100 : 0,
        outlier_avg_engagement: o.count > 0 ? Math.round(o.totalEng / o.count) : 0,
        outlier_pct: outliers.length > 0 ? Math.round((o.count / outliers.length) * 100) : 0,
        normal_count: n.count,
        normal_avg_ratio: n.count > 0 ? Math.round((n.totalRatio / n.count) * 100) / 100 : 0,
        normal_avg_engagement: n.count > 0 ? Math.round(n.totalEng / n.count) : 0,
        normal_pct: nonOutliers.length > 0 ? Math.round((n.count / nonOutliers.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.outlier_avg_ratio - a.outlier_avg_ratio);

  // Neutral stats
  const neutralOutlierPct = outliers.length > 0
    ? Math.round(((outlierTones['neutral']?.count || 0) / outliers.length) * 100)
    : 0;

  // Generate interpretation
  const interpretation = generateToneInterpretation(toneComparison, outliers.length, nonOutliers.length, neutralOutlierPct);

  // Analyze actual text patterns in outlier content
  const textPatterns = analyzeTextPatterns(outliers, nonOutliers);

  // Detect cross-variable archetypes
  const archetypes = detectArchetypes(allPosts);

  return {
    total_outliers: outliers.length,
    content_type_distribution: typeCounts,
    hook_type_distribution: hookTypeCounts,
    structure_distribution: structureCounts,
    tone_comparison: toneComparison,
    tone_interpretation: interpretation,
    neutral_outlier_pct: neutralOutlierPct,
    avg_word_count: Math.round(avgWords),
    cta_rate: Math.round(ctaRate * 100),
    common_traits: commonTraits,
    outlier_timing: outlierTiming,
    text_patterns: textPatterns,
    archetypes,
  };
}

// Stopwords to exclude from keyword analysis (EN + ES)
const STOPWORDS = new Set([
  // English
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must','can','could',
  'i','me','my','we','us','our','you','your','he','him','his','she','her','it','its',
  'they','them','their','this','that','these','those','what','which','who','whom',
  'and','but','or','nor','not','no','so','if','then','than','too','very','just',
  'about','above','after','again','all','also','am','any','as','at','back','because',
  'before','between','both','by','come','day','de','down','each','even','every',
  'first','for','from','get','go','got','here','how','in','into','know','like',
  'make','many','more','most','much','new','now','of','on','one','only','or','other',
  'out','over','own','people','per','really','right','said','same','say','see','some',
  'still','take','tell','there','thing','think','time','to','two','up','use','want',
  'way','well','when','where','why','with','work','year','don\'t','didn\'t','won\'t',
  'isn\'t','aren\'t','wasn\'t','weren\'t','doesn\'t','it\'s','i\'m','you\'re','they\'re',
  'we\'re','i\'ve','you\'ve','we\'ve','they\'ve','i\'ll','you\'ll','he\'ll','she\'ll',
  'that\'s','let','ve','re','ll','s','t','m','d',
  // Spanish
  'el','la','los','las','un','una','unos','unas','de','del','al','en','con','por',
  'para','es','son','fue','ser','estar','que','se','no','si','lo','le','su','sus',
  'me','te','nos','mi','tu','yo','ya','más','muy','como','pero','sin','sobre',
  'entre','hasta','desde','donde','cuando','todo','esta','este','ese','eso','aquí',
  'hay','tiene','hacer','puede','cada','porque','también','bien','o','ni','e','y',
  'era','han','he','ha','hemos','tiene','hay','va','algo','nada','otro','otra',
  'otros','muchos','poco','tan','después','antes','solo','mucho',
]);

function analyzeTextPatterns(outliers: Post[], nonOutliers: Post[]) {
  const texts = outliers.map((p) => p.content_text || '').filter((t) => t.length > 10);
  const normalTexts = nonOutliers.map((p) => p.content_text || '').filter((t) => t.length > 10);

  if (texts.length < 3) {
    return {
      opening_patterns: [],
      closing_patterns: [],
      recurring_phrases: [],
      power_words: [],
      formatting_style: null,
      writing_analysis: 'No hay suficiente texto de outliers para analizarlo.',
    };
  }

  // ---- 1. Opening line patterns ----
  const openingLines = texts.map((t) => {
    const firstLine = t.split('\n').find((l) => l.trim().length > 0) || '';
    return firstLine.trim();
  }).filter((l) => l.length > 5);

  // Classify openings by pattern
  const openingPatterns: Record<string, { count: number; examples: string[] }> = {};
  for (const line of openingLines) {
    const pattern = classifyOpeningPattern(line);
    if (!openingPatterns[pattern]) openingPatterns[pattern] = { count: 0, examples: [] };
    openingPatterns[pattern].count++;
    if (openingPatterns[pattern].examples.length < 3) {
      openingPatterns[pattern].examples.push(line.substring(0, 80) + (line.length > 80 ? '...' : ''));
    }
  }

  // ---- 2. Closing line patterns ----
  const closingLines = texts.map((t) => {
    const lines = t.split('\n').filter((l) => l.trim().length > 0);
    return (lines[lines.length - 1] || '').trim();
  }).filter((l) => l.length > 3);

  const closingPatterns: Record<string, { count: number; examples: string[] }> = {};
  for (const line of closingLines) {
    const pattern = classifyClosingPattern(line);
    if (!closingPatterns[pattern]) closingPatterns[pattern] = { count: 0, examples: [] };
    closingPatterns[pattern].count++;
    if (closingPatterns[pattern].examples.length < 3) {
      closingPatterns[pattern].examples.push(line.substring(0, 80) + (line.length > 80 ? '...' : ''));
    }
  }

  // ---- 3. Recurring 2-3 word phrases (ngrams) ----
  const outlierNgrams = extractNgrams(texts);
  const normalNgrams = extractNgrams(normalTexts);

  // Find phrases that appear more in outliers than normal
  const recurringPhrases = Object.entries(outlierNgrams)
    .filter(([phrase, count]) => count >= 3)
    .map(([phrase, count]) => {
      const normalCount = normalNgrams[phrase] || 0;
      const outlierRate = count / texts.length;
      const normalRate = normalTexts.length > 0 ? normalCount / normalTexts.length : 0;
      return { phrase, count, outlier_pct: Math.round(outlierRate * 100), normal_pct: Math.round(normalRate * 100), overindex: normalRate > 0 ? Math.round((outlierRate / normalRate) * 10) / 10 : 99 };
    })
    .sort((a, b) => b.overindex - a.overindex)
    .slice(0, 15);

  // ---- 4. Semantic word categories (not literal words) ----
  const semanticCategories = analyzeSemanticPatterns(texts, normalTexts);

  // ---- 5. Formatting / writing style ----
  const avgSentenceLen = texts.map((t) => {
    const sentences = t.split(/[.!?]+/).filter((s) => s.trim().length > 3);
    return sentences.length > 0 ? t.split(/\s+/).length / sentences.length : 0;
  });
  const avgSentenceLenOutlier = avg(avgSentenceLen);

  const normalAvgSentenceLen = normalTexts.map((t) => {
    const sentences = t.split(/[.!?]+/).filter((s) => s.trim().length > 3);
    return sentences.length > 0 ? t.split(/\s+/).length / sentences.length : 0;
  });
  const avgSentenceLenNormal = avg(normalAvgSentenceLen);

  const avgLineBreaksOutlier = avg(outliers.map((p) => p.line_break_count || 0));
  const avgLineBreaksNormal = avg(nonOutliers.map((p) => p.line_break_count || 0));

  const avgWordCountOutlier = avg(outliers.map((p) => p.word_count));
  const avgWordCountNormal = avg(nonOutliers.map((p) => p.word_count));

  const emojiRateOutlier = outliers.filter((p) => p.has_emoji).length / Math.max(1, outliers.length);
  const emojiRateNormal = nonOutliers.filter((p) => p.has_emoji).length / Math.max(1, nonOutliers.length);

  const hashtagRateOutlier = outliers.filter((p) => p.has_hashtags).length / Math.max(1, outliers.length);
  const hashtagRateNormal = nonOutliers.filter((p) => p.has_hashtags).length / Math.max(1, nonOutliers.length);

  const questionRateOutlier = texts.filter((t) => t.includes('?')).length / Math.max(1, texts.length);
  const questionRateNormal = normalTexts.filter((t) => t.includes('?')).length / Math.max(1, normalTexts.length);

  const formattingStyle = {
    avg_sentence_length: { outlier: Math.round(avgSentenceLenOutlier * 10) / 10, normal: Math.round(avgSentenceLenNormal * 10) / 10 },
    avg_line_breaks: { outlier: Math.round(avgLineBreaksOutlier * 10) / 10, normal: Math.round(avgLineBreaksNormal * 10) / 10 },
    avg_word_count: { outlier: Math.round(avgWordCountOutlier), normal: Math.round(avgWordCountNormal) },
    emoji_rate: { outlier: Math.round(emojiRateOutlier * 100), normal: Math.round(emojiRateNormal * 100) },
    hashtag_rate: { outlier: Math.round(hashtagRateOutlier * 100), normal: Math.round(hashtagRateNormal * 100) },
    question_rate: { outlier: Math.round(questionRateOutlier * 100), normal: Math.round(questionRateNormal * 100) },
  };

  // ---- 6. Synthesize text-based analysis ----
  const analysisLines: string[] = [];

  // Opening analysis
  const topOpening = Object.entries(openingPatterns).sort((a, b) => b[1].count - a[1].count);
  if (topOpening.length > 0) {
    const top = topOpening[0];
    const topPct = Math.round((top[1].count / texts.length) * 100);
    analysisLines.push(`Apertura: el ${topPct}% de los outliers abre con "${top[0]}". Ejemplo: "${top[1].examples[0]}"`);
    if (topOpening.length >= 2) {
      const second = topOpening[1];
      analysisLines[analysisLines.length - 1] += `. La segunda más común: "${second[0]}" (${Math.round((second[1].count / texts.length) * 100)}%).`;
    }
  }

  // Closing analysis
  const topClosing = Object.entries(closingPatterns).sort((a, b) => b[1].count - a[1].count);
  if (topClosing.length > 0) {
    const top = topClosing[0];
    const topPct = Math.round((top[1].count / texts.length) * 100);
    analysisLines.push(`Cierre: el ${topPct}% de los outliers cierra con "${top[0]}". Ejemplo: "${top[1].examples[0]}"`);
  }

  // Recurring phrases
  const overindexedPhrases = recurringPhrases.filter((p) => p.overindex > 1.5).slice(0, 5);
  if (overindexedPhrases.length > 0) {
    analysisLines.push(`Frases que aparecen más en los outliers: ${overindexedPhrases.map((p) => `"${p.phrase}" (${p.outlier_pct}% de los outliers frente a ${p.normal_pct}% de los normales)`).join(', ')}.`);
  }

  // Semantic categories
  const topCategories = semanticCategories.filter((c) => c.outlier_density > c.normal_density * 1.2).slice(0, 5);
  if (topCategories.length > 0) {
    analysisLines.push(`Patrones de lenguaje más fuertes en los outliers: ${topCategories.map((c) => `${c.label} (${c.outlier_density} por cada 100 palabras frente a ${c.normal_density} en los normales)`).join(', ')}.`);
  }

  // Writing style diff
  if (Math.abs(avgSentenceLenOutlier - avgSentenceLenNormal) > 2) {
    const shorter = avgSentenceLenOutlier < avgSentenceLenNormal;
    analysisLines.push(`Frases: los outliers usan frases más ${shorter ? 'cortas' : 'largas'} (media de ${Math.round(avgSentenceLenOutlier)} palabras por frase frente a ${Math.round(avgSentenceLenNormal)} en los posts normales). ${shorter ? 'La escritura directa y troceada genera más interacciones.' : 'Las frases más desarrolladas conectan mejor.'}`);
  }

  if (avgLineBreaksOutlier > avgLineBreaksNormal * 1.3) {
    analysisLines.push(`Formato: los outliers usan un ${Math.round((avgLineBreaksOutlier / Math.max(1, avgLineBreaksNormal) - 1) * 100)}% más de saltos de línea. El espacio en blanco y el ritmo visual importan.`);
  }

  const wordDiff = avgWordCountNormal > 0 ? Math.round(((avgWordCountOutlier - avgWordCountNormal) / avgWordCountNormal) * 100) : 0;
  if (Math.abs(wordDiff) > 15) {
    analysisLines.push(`Longitud: los outliers tienen de media ${Math.round(avgWordCountOutlier)} palabras (un ${wordDiff > 0 ? `${wordDiff}% más largos` : `${Math.abs(wordDiff)}% más cortos`} que los normales). ${wordDiff > 0 ? 'El contenido en profundidad funciona mejor.' : 'Gana el contenido conciso.'}`);
  }

  if (Math.abs(questionRateOutlier - questionRateNormal) > 10) {
    analysisLines.push(`Preguntas: el ${Math.round(questionRateOutlier * 100)}% de los outliers incluye preguntas frente al ${Math.round(questionRateNormal * 100)}% de los posts normales. ${questionRateOutlier > questionRateNormal ? 'Preguntar genera interacciones.' : 'Las afirmaciones funcionan mejor que las preguntas.'}`);
  }

  return {
    opening_patterns: topOpening.map(([pattern, data]) => ({
      pattern,
      count: data.count,
      pct: Math.round((data.count / texts.length) * 100),
      examples: data.examples,
    })),
    closing_patterns: topClosing.map(([pattern, data]) => ({
      pattern,
      count: data.count,
      pct: Math.round((data.count / texts.length) * 100),
      examples: data.examples,
    })),
    recurring_phrases: recurringPhrases,
    semantic_categories: semanticCategories,
    formatting_style: formattingStyle,
    writing_analysis: analysisLines.join('\n\n'),
  };
}

function classifyOpeningPattern(line: string): string {
  const l = line.toLowerCase().trim();
  if (l.endsWith('?') || l.includes('?')) return 'Pregunta';
  if (/^\d|^[0-9]/.test(l)) return 'Número / dato';
  if (/^(i |i\'m |i\'ve |i was |i had |i used |i remember|i quit|i lost|i failed|i got)/i.test(l)) return 'Primera persona ("Yo...")';
  if (/^(you |you\'re |you\'ve |your )/i.test(l)) return 'Le habla al lector ("Tú...")';
  if (/^(stop |don\'t |never |no one |nobody |forget |quit |avoid )/i.test(l)) return 'Negación / prohibición';
  if (/^(here|here\'s|here are|these|this is how|this is why|this is what)/i.test(l)) return 'Revelación directa ("Aquí tienes...")';
  if (/^(the |a |an )?(truth|problem|reality|secret|reason|thing|mistake|myth)/i.test(l)) return 'Arranque de verdad / revelación';
  if (/^(most |everyone |nobody |people |they |99%|90%|80%)/i.test(l)) return 'Generalización ("La mayoría...")';
  if (/^(if |when |imagine |picture |what if)/i.test(l)) return 'Hipótesis / condicional';
  if (/^(how |why |what |where |who )/i.test(l)) return 'Palabra interrogativa';
  if (/^(un |una |el |la |no |si |yo |tu |es |lo )/i.test(l)) return 'Arranque en español';
  if (l.length < 30) return 'Frase corta y directa';
  return 'Afirmación';
}

function classifyClosingPattern(line: string): string {
  const l = line.toLowerCase().trim();
  if (l.endsWith('?')) return 'Acaba en pregunta (CTA)';
  if (/follow|like|comment|share|repost|save|subscribe|tag|dm/i.test(l)) return 'CTA explícito (seguir / reaccionar / compartir)';
  if (/agree|disagree|thoughts|opinion|what do you/i.test(l)) return 'Pide opinión';
  if (/👇|⬇|below|comment below|drop/i.test(l)) return 'CTA para comentar (👇)';
  if (/#\w+/.test(l)) return 'Línea de hashtags';
  if (/💡|🔥|🚀|✅|❤|🙏|🎯|💪|👊/i.test(l)) return 'Énfasis con emoji';
  if (/ps:|p\.s\.|ps\./i.test(l)) return 'Posdata (P. D.)';
  if (l.length < 25) return 'Cierre corto';
  if (/remember|don\'t forget|lesson|takeaway|bottom line|key|moral/i.test(l)) return 'Lección / conclusión';
  return 'Cierre con afirmación';
}

function extractNgrams(texts: string[]): Record<string, number> {
  const ngrams: Record<string, number> = {};
  for (const text of texts) {
    const words = text.toLowerCase().replace(/[^\w\sáéíóúñü']/g, '').split(/\s+/).filter((w) => w.length >= 2 && !STOPWORDS.has(w));
    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (words[i].length >= 3 || words[i + 1].length >= 3) {
        ngrams[bigram] = (ngrams[bigram] || 0) + 1;
      }
    }
    // Trigrams
    for (let i = 0; i < words.length - 2; i++) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      ngrams[trigram] = (ngrams[trigram] || 0) + 1;
    }
  }
  return ngrams;
}

function extractWordFrequency(texts: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const text of texts) {
    const words = text.toLowerCase().replace(/[^\w\sáéíóúñü']/g, '').split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    const seen = new Set<string>(); // Count once per post
    for (const w of words) {
      if (!seen.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
        seen.add(w);
      }
    }
  }
  return freq;
}

/**
 * Detect the virality driver for a post — why people feel compelled to engage/share.
 */
export function detectViralityDriver(post: {
  content_text?: string | null;
  comment_like_ratio?: number;
  share_like_ratio?: number;
  hook_type?: string;
  text_tone?: string;
}): { driver: string; label: string; explanation: string } {
  const text = (post.content_text || '').toLowerCase();
  const clr = post.comment_like_ratio || 0;
  const slr = post.share_like_ratio || 0;

  // Social currency: makes the sharer look smart/informed
  if (/framework|system|hack|secret|insider|strategy|method|playbook|guide|tutorial|step.by.step/i.test(text) && slr > 0.05) {
    return { driver: 'social_currency', label: 'Moneda social', explanation: 'La gente lo comparte para parecer lista o bien informada: la convierte en fuente de conocimiento valioso' };
  }

  // Controversy: triggers debate
  if (clr > 0.12 || /unpopular|controversial|hot take|fight me|disagree|wrong|lie|myth|stop doing|overrated/i.test(text)) {
    return { driver: 'controversy', label: 'Controversia', explanation: 'Provoca reacciones fuertes a favor o en contra: la gente comenta para defender su postura o validar su punto de vista' };
  }

  // Identity: people see themselves in it
  if (/^(if you|you['']re a|to every|dear |para |si eres|who else|raise your hand|that feeling when|when you)/i.test(text) ||
      /we['']ve all|todos hemos|relatable|me too|same|been there|i feel this/i.test(text)) {
    return { driver: 'identity', label: 'Identidad', explanation: 'La gente interactúa porque se ve reflejada en el post: valida quién es o quién quiere ser' };
  }

  // Belonging: community, shared experience
  if (/community|tribe|movement|together|we |nosotros|join|support|you['']re not alone|no estás sol/i.test(text) || clr > 0.08) {
    return { driver: 'belonging', label: 'Pertenencia', explanation: 'Crea sensación de experiencia compartida o de comunidad: la gente interactúa para sentirse parte de algo más grande' };
  }

  // Utility: genuinely useful, people save/share for reference
  if (/how to|step|tip|tool|resource|template|checklist|guide|save this|bookmark|here['']?s (how|what|the)/i.test(text) && slr > 0.03) {
    return { driver: 'utility', label: 'Utilidad', explanation: 'Valor práctico puro: la gente lo guarda y lo comparte como referencia a la que volver' };
  }

  // Emotion: vulnerability, inspiration, empathy
  if (/failed|lost|quit|cried|struggled|vulnerable|honest|scared|confession|ashamed/i.test(text) || post.text_tone === 'vulnerable' || post.text_tone === 'empathy') {
    return { driver: 'emotion', label: 'Emoción', explanation: 'Autenticidad emocional sin filtros: la gente interactúa porque le hace sentir algo real' };
  }

  // Aspiration: people share what they want to become
  if (/success|freedom|dream|transform|next level|6.figure|millonari|wealth|achieve|unlock/i.test(text) || post.text_tone === 'aspirational') {
    return { driver: 'aspiration', label: 'Aspiración', explanation: 'La gente lo comparte porque representa lo que quiere llegar a ser: el contenido aspiracional se difunde mucho' };
  }

  // Default: social currency (most common driver on LinkedIn)
  return { driver: 'social_currency', label: 'Moneda social', explanation: 'Conocimiento para compartir: la gente lo difunde para ganar autoridad por asociación' };
}

/**
 * Analyze why people specifically comment on a post.
 */
function analyzeCommentDriver(post: {
  content_text?: string | null;
  comment_like_ratio?: number;
  has_call_to_action?: boolean;
}): string {
  const text = (post.content_text || '').toLowerCase();
  const clr = post.comment_like_ratio || 0;
  const lastLines = text.split('\n').filter((l) => l.trim()).slice(-3).join(' ');

  if (/agree|disagree|what do you think|thoughts\?|hot take|controversial|unpopular/i.test(text)) return 'debate — el post toma una postura que obliga a posicionarse';
  if (/\?$/.test(lastLines) || /what['']?s your|tell me|share your/i.test(lastLines)) return 'pregunta directa — el CTA pide la opinión de forma explícita';
  if (/who else|raise your hand|same|been there|relatable|tag someone/i.test(text)) return 'experiencia compartida — la gente comenta para decir "a mí también" y validar su propio camino';
  if (/failed|lost|vulnerable|confession|honest|scared/i.test(text)) return 'empatía — la vulnerabilidad provoca respuestas de apoyo e historias personales a cambio';
  if (/resource|tool|link|send|dm|comment .*(get|receive|access)/i.test(text)) return 'petición de recurso — la gente comenta para conseguir algo valioso';
  if (clr > 0.15) return 'tema que divide — el asunto genera opiniones fuertes por sí solo';
  if (post.has_call_to_action) return 'CTA explícito — el post pide interacción directamente';
  return 'interacción orgánica — el contenido invita a conversar de forma natural';
}

/**
 * Generate an abstract replicable template from a post.
 */
function generateAbstractTemplate(post: {
  hook_type?: string;
  post_structure?: string;
  text_tone?: string;
  content_text?: string | null;
}): string {
  const text = post.content_text || '';
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  const hookLabel = formatHookType(post.hook_type || 'other');
  const structLabel = formatStructure(post.post_structure || 'other');

  // Analyze the actual structure zones
  const zones: string[] = [];

  // Hook zone (first 1-3 lines)
  if (lines.length >= 1) {
    const firstLine = lines[0].trim();
    if (/\?/.test(firstLine)) zones.push('[Gancho: pregunta que cuestiona una suposición]');
    else if (/^\d/.test(firstLine)) zones.push('[Gancho: dato que impacta]');
    else if (/^(i |yo )/i.test(firstLine)) zones.push('[Gancho: entrada con historia personal]');
    else if (/^(stop|don['']t|never|no )/i.test(firstLine.toLowerCase())) zones.push('[Gancho: ruptura de patrón / prohibición]');
    else zones.push(`[Gancho: ${hookLabel}]`);
  }

  // Body zone
  const bodyLines = lines.slice(1, -1);
  const listItems = bodyLines.filter((l) => /^\s*(\d+[\.\)]\s|[-•]\s|→|✅|❌|▸|🔹)/.test(l));
  if (listItems.length >= 3) {
    zones.push(`[Cuerpo: lista de ${listItems.length} puntos de valor]`);
  } else if (bodyLines.length > 5 && /then|but|so |después|pero|así que/i.test(bodyLines.join(' '))) {
    zones.push('[Cuerpo: arco narrativo con tensión → resolución]');
  } else if (bodyLines.length > 3) {
    zones.push('[Cuerpo: argumento / pruebas de apoyo]');
  }

  // Closing zone
  if (lines.length >= 2) {
    const last = lines[lines.length - 1].trim().toLowerCase();
    if (/\?/.test(last)) zones.push('[Cierre: pregunta abierta para comentarios]');
    else if (/follow|like|share|save|repost|👇|⬇/i.test(last)) zones.push('[Cierre: CTA explícito de interacción]');
    else if (/lesson|takeaway|remember|key/i.test(last)) zones.push('[Cierre: conclusión / lección clave]');
    else zones.push('[Cierre: frase final / remate]');
  }

  return `${hookLabel} + ${structLabel}: ${zones.join(' → ')}`;
}

/**
 * Analyze the narrative mechanism — how the post creates and maintains tension.
 */
function analyzeNarrativeMechanism(text: string): string {
  const lower = text.toLowerCase();
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  // Open loop: creates a question that MUST be answered
  if (/here['']?s (what|why|how)|this is what|let me explain|te explico|lo que pasó|what happened/i.test(lower) && lines.length > 5) {
    return 'Bucle abierto — el gancho plantea una pregunta que obliga a seguir leyendo para encontrar la respuesta';
  }

  // Common enemy: us vs. them
  if (/they |them |those |the (people|ones|companies|gurus|experts) who|los que|la gente que|toxic|broken system|old way/i.test(lower)) {
    return 'Enemigo común — crea una dinámica de "nosotros contra ellos" que construye identidad de grupo y complicidad en los comentarios';
  }

  // Belief break: shatters an assumption then rebuilds
  if (/myth|lie|wrong|actually|truth is|in reality|en realidad|la verdad|most people think|everyone believes/i.test(lower)) {
    return 'Ruptura de creencia — derriba una suposición muy extendida y crea una disonancia cognitiva que pide resolverse';
  }

  // Contrast/comparison: before/after, old/new
  if (/before|after|old|new|used to|now i|antes|después|vs\.?|versus|instead of/i.test(lower)) {
    return 'Contraste — enfrenta dos estados (antes/después, mal/bien) para que la idea se sienta concreta';
  }

  // Vulnerability escalation: progressively deeper confession
  if (/failed|lost|quit|cried|scared|ashamed|confession|honest|vulnerable/i.test(lower) && lines.length > 4) {
    return 'Vulnerabilidad creciente — una confesión personal cada vez más profunda que genera implicación emocional';
  }

  // Authority proof: establishes credibility then delivers framework
  if (/\d+ (years|clients|companies|projects|años)|i['']ve (helped|built|coached|worked)|expert|proven/i.test(lower)) {
    return 'Prueba de autoridad — primero se gana la credibilidad para que el consejo posterior parezca fiable y aplicable';
  }

  // Curiosity stacking: multiple open loops
  if (/(but (that['']s not|wait|here['']s)|and (here['']s|that['']s)|the (best|worst) part|pero (eso no|espera)|y (aquí|eso))/i.test(lower)) {
    return 'Curiosidad encadenada — superpone varios bucles abiertos y pequeños suspenses para mantener el ritmo de lectura';
  }

  // Pattern/rhythm: repetitive structure for memorability
  const shortLines = lines.filter((l) => l.trim().length < 40 && l.trim().length > 5);
  if (shortLines.length / lines.length > 0.6 && lines.length > 5) {
    return 'Patrón rítmico — las líneas cortas y directas crean una cadencia de lectura fácil de consumir y de recordar';
  }

  return 'Valor directo — una estructura sencilla que prioriza la claridad sobre la tensión narrativa';
}

/**
 * Generate a per-post deep explanation of why an outlier post worked.
 * Analyzes: narrative mechanism, hook tension, virality driver, comment driver, abstract template.
 */
export function generatePostExplanation(post: {
  content_type: string;
  hook_type?: string;
  post_structure?: string;
  text_tone?: string;
  word_count?: number;
  has_emoji?: boolean;
  has_hashtags?: boolean;
  has_call_to_action?: boolean;
  comment_like_ratio?: number;
  share_like_ratio?: number;
  outlier_ratio: number;
  engagement_score: number;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  content_text?: string | null;
}): {
  summary: string;
  narrative_mechanism: string;
  hook_tension: string;
  virality_driver: { driver: string; label: string; explanation: string };
  comment_driver: string;
  abstract_template: string;
} {
  const text = post.content_text || '';

  // 1. Narrative mechanism
  const narrativeMechanism = analyzeNarrativeMechanism(text);

  // 2. Hook tension analysis
  const hookTensionMap: Record<string, string> = {
    pattern_interrupt: 'Amenaza a la identidad — le dice al lector que está haciendo algo mal y crea urgencia por seguir leyendo',
    belief_breaker: 'Disonancia cognitiva — contradice una creencia del lector y le obliga a resolver el conflicto',
    curiosity_gap: 'Hueco de información — abre un bucle que el cerebro necesita cerrar',
    data_shock: 'Ruptura de expectativas — una cifra sorprendente rompe lo esperado y pide una explicación',
    hot_take: 'Riesgo social — el autor se posiciona en público y despierta el impulso de estar a favor o en contra',
    personal_confession: 'Tensión de vulnerabilidad — la honestidad sin filtros genera implicación empática',
    story_opener: 'Tirón narrativo — los marcadores temporales ("Cuando yo...") activan la parte del cerebro que escucha historias',
    hypothetical_question: 'Activa la imaginación — obliga al lector a imaginar un escenario',
    why_question: 'Curiosidad por la causa — el "por qué" despierta la necesidad de entender el origen',
    how_question: 'Curiosidad práctica — promete conocimiento aplicable',
    direct_question: 'Interpelación directa — le pregunta al lector en persona y cuesta pasar de largo',
    open_question: 'Hueco de conocimiento — una pregunta amplia despierta las ganas de saber la respuesta',
    rhetorical_question: 'Respuesta implícita — el lector completa la respuesta y se implica',
    list_promise: 'Compromiso de valor — un número promete un valor concreto, acotado y fácil de leer en diagonal',
    prediction: 'Inquietud por el futuro — las predicciones crean urgencia por estar preparado',
    how_to_framework: 'Promesa de utilidad — anuncia conocimiento que se aplica al momento',
    bold_claim: 'Desafío de autoridad — una afirmación rotunda obliga al lector a juzgarla',
    common_mistake: 'Miedo a fallar — nadie quiere estar cometiendo un error conocido',
    direct_callout: 'Segmentación — le habla directamente a un público concreto y lo hace relevante',
    announcement: 'Novedad — la noticia tiene relevancia inmediata',
    social_proof_opener: 'Ancla de credibilidad — los resultados y las cifras dan autoridad antes del contenido',
    analogy: 'Reencuadre — conectar conceptos conocidos de otra forma crea un momento "ajá"',
    contrarian_take: 'Desafío al consenso — ir contra la opinión general despierta curiosidad por el razonamiento',
    relatable_moment: 'Efecto espejo — verse reflejado en el contenido crea una conexión emocional inmediata',
    motivational: 'Tirón aspiracional — activa la distancia entre quién eres y quién quieres ser',
    observation: 'Efecto de ponerle nombre — poner palabras a algo que se sentía y nadie decía conecta con fuerza',
    challenge: 'Tensión de acción — reta al lector y despierta el impulso de comprometerse',
  };
  const hookTension = hookTensionMap[post.hook_type || ''] || 'Captura de atención — la primera línea frena el scroll con valor directo o intriga';

  // 3. Virality driver
  const viralityDriver = detectViralityDriver(post);

  // 4. Comment driver
  const commentDriver = analyzeCommentDriver(post);

  // 5. Abstract template
  const abstractTemplate = generateAbstractTemplate(post);

  // 6. Summary — a concise narrative paragraph
  const summaryParts: string[] = [];

  // Performance context
  if (post.outlier_ratio >= 10) summaryParts.push(`Rendimiento excepcional: ${post.outlier_ratio}x.`);
  else if (post.outlier_ratio >= 5) summaryParts.push(`Éxito viral fuerte: ${post.outlier_ratio}x la media.`);
  else summaryParts.push(`Outlier sólido: ${post.outlier_ratio}x la media.`);

  // Why it worked (the mechanism)
  const mecanismo = narrativeMechanism.split(' — ')[1] || narrativeMechanism;
  summaryParts.push(`${mecanismo.charAt(0).toUpperCase()}${mecanismo.slice(1)}.`);

  // What drove engagement
  if ((post.comment_like_ratio || 0) > 0.12) {
    summaryParts.push(`Mucho debate (${Math.round((post.comment_like_ratio || 0) * 100)}% de comentarios por reacción): ${commentDriver.split(' — ')[0]}.`);
  }
  if ((post.share_like_ratio || 0) > 0.08) {
    summaryParts.push(`Se comparte mucho, con motor de ${viralityDriver.label.toLowerCase()}.`);
  }

  return {
    summary: summaryParts.join(' '),
    narrative_mechanism: narrativeMechanism,
    hook_tension: hookTension,
    virality_driver: viralityDriver,
    comment_driver: commentDriver,
    abstract_template: abstractTemplate,
  };
}

// Etiquetas solo de presentacion (la clave de la BD no se toca). Son las
// mismas que pinta el frontend: pages/Inspiration.tsx (HOOK_LABELS /
// STRUCT_LABELS / TONE_LABELS / CONTENT_TYPE_LABELS) y, para las claves que
// alli faltan, components/HookTypeChart.tsx y StructureChart.tsx.
function formatHookType(type: string): string {
  const labels: Record<string, string> = {
    pattern_interrupt: 'Ruptura de patrón',
    belief_breaker: 'Rompe creencias',
    curiosity_gap: 'Hueco de curiosidad',
    data_shock: 'Dato impactante',
    hot_take: 'Opinión polémica',
    personal_confession: 'Confesión personal',
    story_opener: 'Arranque de historia',
    hypothetical_question: 'Pregunta hipotética',
    why_question: 'Pregunta «por qué»',
    how_question: 'Pregunta «cómo»',
    direct_question: 'Pregunta directa',
    open_question: 'Pregunta abierta',
    rhetorical_question: 'Pregunta retórica',
    list_promise: 'Promesa de lista',
    prediction: 'Predicción',
    how_to_framework: 'Cómo hacerlo',
    bold_claim: 'Afirmación rotunda',
    common_mistake: 'Error común',
    direct_callout: 'Interpelación directa',
    announcement: 'Anuncio',
    social_proof_opener: 'Prueba social',
    analogy: 'Analogía',
    contrarian_take: 'A contracorriente',
    relatable_moment: 'Momento reconocible',
    motivational: 'Motivacional',
    observation: 'Observación',
    challenge: 'Reto',
    other: 'Otro',
  };
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatStructure(structure: string): string {
  const labels: Record<string, string> = {
    hook_list_cta: 'Gancho → Lista → CTA',
    hook_story_lesson_cta: 'Historia → Lección → CTA',
    problem_agitate_solve: 'Problema → Agitación → Solución',
    contrarian_proof_reframe: 'A contracorriente → Prueba → Reencuadre',
    confession_insight_takeaway: 'Confesión → Revelación → Conclusión',
    list_framework: 'Lista / método',
    problem_solution: 'Problema → Solución',
    story_lesson: 'Historia → Lección',
    before_after: 'Antes / Después',
    step_by_step: 'Paso a paso',
    myth_busting: 'Desmontar mitos',
    question_answer: 'Pregunta → Respuesta',
    observation_insight: 'Observación → Aprendizaje',
    prediction_vision: 'Predicción / Visión',
    motivational_manifesto: 'Motivacional',
    authority_framework: 'Autoridad → Marco',
    comparison: 'Comparativa',
    short_punchy: 'Corto y directo',
    long_form_essay: 'Ensayo largo',
    narrative_arc: 'Arco narrativo',
    content_with_cta: 'Contenido + CTA',
    data_driven: 'Basado en datos',
    other: 'Otra',
  };
  return labels[structure] || structure.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatContentType(type: string): string {
  const labels: Record<string, string> = {
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
  return labels[type] || type;
}

function generateToneInterpretation(
  toneComparison: { tone: string; outlier_count: number; outlier_avg_ratio: number; outlier_avg_engagement: number; outlier_pct: number; normal_count: number; normal_avg_ratio: number; normal_avg_engagement: number; normal_pct: number }[],
  totalOutliers: number,
  totalNormal: number,
  neutralOutlierPct: number,
): string {
  const lines: string[] = [];

  // Top performing tones by outlier ratio (primary metric)
  const topByRatio = toneComparison.filter((t) => t.outlier_count >= 2).slice(0, 3);
  if (topByRatio.length > 0) {
    const names = topByRatio.map((t) => `${formatToneLabel(t.tone)} (multiplicador medio ${t.outlier_avg_ratio}x)`);
    lines.push(`Los tonos con mayor multiplicador son: ${names.join(', ')}.`);
  }

  // Tones that are more prevalent in outliers vs normal
  const outlierSkewed = toneComparison.filter((t) => t.outlier_pct > t.normal_pct + 5 && t.outlier_count >= 2);
  if (outlierSkewed.length > 0) {
    const skewedNames = outlierSkewed.map((t) => `${formatToneLabel(t.tone)} (${t.outlier_pct}% en outliers frente a ${t.normal_pct}% en normales)`);
    lines.push(`Tonos más frecuentes en los outliers: ${skewedNames.join(', ')}.`);
  }

  // Tones that perform better in normal posts (surprising)
  const normalSkewed = toneComparison.filter((t) => t.normal_pct > t.outlier_pct + 5 && t.normal_count >= 2);
  if (normalSkewed.length > 0) {
    const names = normalSkewed.map((t) => formatToneLabel(t.tone));
    lines.push(`Tonos más frecuentes en los posts normales: ${names.join(', ')}. No son los que generan outliers.`);
  }

  // Neutral commentary
  if (neutralOutlierPct > 50) {
    lines.push(`El ${neutralOutlierPct}% de los outliers tiene tono neutro: el contenido funciona por su valor o su tema, no por los detonantes emocionales.`);
  } else if (neutralOutlierPct < 30) {
    lines.push(`Solo el ${neutralOutlierPct}% de los outliers es neutro: los detonantes emocionales y psicológicos pesan mucho en la viralidad.`);
  }

  // Best vs worst tone ratio
  if (topByRatio.length > 0 && topByRatio[0].outlier_avg_ratio > 0) {
    const best = topByRatio[0];
    const worst = toneComparison.filter((t) => t.outlier_count >= 2).slice(-1)[0];
    if (worst && worst.outlier_avg_ratio > 0) {
      const diff = Math.round((best.outlier_avg_ratio / worst.outlier_avg_ratio) * 10) / 10;
      if (diff > 1.3) {
        lines.push(`Los posts de tono "${formatToneLabel(best.tone)}" consiguen un multiplicador ${diff}x mayor que los de tono "${formatToneLabel(worst.tone)}".`);
      }
    }
  }

  if (lines.length === 0) {
    lines.push('No hay datos suficientes para sacar conclusiones sobre el tono. Añade más creadores y actualiza los datos.');
  }

  return lines.join(' ');
}

function formatToneLabel(tone: string): string {
  const labels: Record<string, string> = {
    urgency: 'Urgencia', authority: 'Autoridad', social_proof: 'Prueba social',
    fomo: 'FOMO', aspirational: 'Aspiracional', empathy: 'Empatía',
    provocative: 'Provocador', educational: 'Educativo', vulnerable: 'Vulnerable',
    humorous: 'Humor', neutral: 'Neutro',
  };
  return labels[tone] || tone;
}

// ---- Semantic pattern categories ----
const SEMANTIC_CATEGORIES: { category: string; label: string; patterns: RegExp[] }[] = [
  {
    category: 'action_verbs', label: 'Verbos de acción',
    patterns: [/\b(stop|start|build|create|launch|ship|scale|grow|transform|break|change|fix|solve|master|unlock|discover|learn|try|test|apply|implement|execute|deliver)\b/gi,
               /\b(para|empieza|construye|crea|lanza|escala|crece|transforma|rompe|cambia|arregla|resuelve|domina|desbloquea|descubre|aprende|prueba|aplica|implementa)\b/gi],
  },
  {
    category: 'urgency_words', label: 'Urgencia / escasez',
    patterns: [/\b(now|today|immediately|asap|urgent|critical|deadline|hurry|fast|quick|before|don't wait|limited|running out|last chance|right now)\b/gi,
               /\b(ahora|hoy|inmediatamente|urgente|crítico|rápido|antes de|no esperes|limitado|última oportunidad|ya)\b/gi],
  },
  {
    category: 'exclusivity_words', label: 'Exclusividad / información de dentro',
    patterns: [/\b(secret|insider|hidden|unknown|nobody tells|few people|exclusive|rare|elite|top \d+%|most people don't|what they don't|behind the scenes)\b/gi,
               /\b(secreto|oculto|desconocido|nadie te dice|pocos|exclusivo|raro|élite|la mayoría no|lo que no te)\b/gi],
  },
  {
    category: 'contrast_words', label: 'Contraste / tensión',
    patterns: [/\b(but|however|instead|yet|although|while|versus|vs|unlike|opposite|not|never|wrong|right|before|after|old|new|myth|truth|reality)\b/gi,
               /\b(pero|sin embargo|en vez de|aunque|mientras|versus|opuesto|no|nunca|mal|bien|antes|después|viejo|nuevo|mito|verdad|realidad)\b/gi],
  },
  {
    category: 'emotional_amplifiers', label: 'Amplificadores emocionales',
    patterns: [/\b(incredible|amazing|insane|mind-blowing|game-changer|life-changing|powerful|massive|brutal|shocking|devastating|terrifying|extraordinary|absurd|ridiculous)\b/gi,
               /\b(increíble|alucinante|brutal|impactante|poderoso|masivo|devastador|extraordinario|absurdo|ridículo|impresionante|bestial)\b/gi],
  },
  {
    category: 'authority_markers', label: 'Autoridad / prueba',
    patterns: [/\b(proven|research|study|data|evidence|science|expert|certified|\d+ years|\d+ clients|\d+ companies|results|roi|revenue)\b/gi,
               /\b(probado|investigación|estudio|datos|evidencia|ciencia|experto|certificado|\d+ años|\d+ clientes|resultados|ingresos)\b/gi],
  },
  {
    category: 'vulnerability_markers', label: 'Vulnerabilidad / honestidad',
    patterns: [/\b(failed|lost|scared|ashamed|honest|truth is|confession|mistake|wrong|struggled|broke|cried|quit|fired|rejected|doubt|imposter)\b/gi,
               /\b(fracasé|perdí|miedo|vergüenza|honesto|la verdad|confesión|error|equivoqué|luché|arruinado|lloré|renuncié|despidieron|rechazado|duda|impostor)\b/gi],
  },
  {
    category: 'second_person', label: 'Segunda persona ("tú")',
    patterns: [/\b(you|your|you're|you've|you'll|yourself)\b/gi,
               /\b(tú|tu|ustedes|te|ti|contigo)\b/gi],
  },
];

function analyzeSemanticPatterns(outlierTexts: string[], normalTexts: string[]): {
  category: string; label: string; outlier_density: number; normal_density: number; diff_pct: number;
}[] {
  return SEMANTIC_CATEGORIES.map(({ category, label, patterns }) => {
    const outlierCount = countPatternMatches(outlierTexts, patterns);
    const normalCount = countPatternMatches(normalTexts, patterns);
    const outlierWords = outlierTexts.reduce((s, t) => s + t.split(/\s+/).length, 0);
    const normalWords = normalTexts.reduce((s, t) => s + t.split(/\s+/).length, 0);
    // Density = matches per 100 words
    const outlierDensity = outlierWords > 0 ? Math.round((outlierCount / outlierWords) * 1000) / 10 : 0;
    const normalDensity = normalWords > 0 ? Math.round((normalCount / normalWords) * 1000) / 10 : 0;
    const diffPct = normalDensity > 0 ? Math.round(((outlierDensity - normalDensity) / normalDensity) * 100) : 0;
    return { category, label, outlier_density: outlierDensity, normal_density: normalDensity, diff_pct: diffPct };
  }).sort((a, b) => b.diff_pct - a.diff_pct);
}

function countPatternMatches(texts: string[], patterns: RegExp[]): number {
  let total = 0;
  for (const text of texts) {
    for (const pattern of patterns) {
      const matches = text.match(new RegExp(pattern.source, pattern.flags));
      if (matches) total += matches.length;
    }
  }
  return total;
}

// ---- Archetype detection ----
export function detectArchetypes(allPosts: Post[]): {
  archetype: string;
  label: string;
  description: string;
  hook_type: string;
  structure: string;
  tone: string;
  count: number;
  avg_engagement: number;
  avg_outlier_ratio: number;
  example_hooks: string[];
}[] {
  // Group posts by hook×structure×tone combo
  const combos: Record<string, { posts: Post[]; totalEng: number; totalRatio: number }> = {};
  for (const p of allPosts) {
    const hook = p.hook_type || 'other';
    const struct = p.post_structure || 'other';
    const tone = classifyTone(p.content_text) || p.text_tone || 'neutral';
    if (hook === 'other' || struct === 'other') continue; // Skip unclassified
    const key = `${hook}|${struct}|${tone}`;
    if (!combos[key]) combos[key] = { posts: [], totalEng: 0, totalRatio: 0 };
    combos[key].posts.push(p);
    combos[key].totalEng += p.engagement_score;
    combos[key].totalRatio += p.outlier_ratio;
  }

  // Filter combos that appear at least 2 times
  return Object.entries(combos)
    .filter(([, data]) => data.posts.length >= 2)
    .map(([key, data]) => {
      const [hook, structure, tone] = key.split('|');
      const avgEng = Math.round(data.totalEng / data.posts.length);
      const avgRatio = Math.round((data.totalRatio / data.posts.length) * 100) / 100;
      const exampleHooks = data.posts
        .filter((p) => p.hook_text)
        .sort((a, b) => b.outlier_ratio - a.outlier_ratio)
        .slice(0, 3)
        .map((p) => p.hook_text!.substring(0, 80));

      // Generate archetype name
      const archetypeName = `${formatHookType(hook)} + ${formatStructure(structure)} + ${formatToneLabel(tone)}`;

      return {
        archetype: key,
        label: archetypeName,
        description: `Cuando un gancho "${formatHookType(hook)}" se combina con la estructura "${formatStructure(structure)}" y el tono "${formatToneLabel(tone)}", los posts tienen un multiplicador medio de ${avgRatio}x (${avgEng.toLocaleString('es-ES')} interacciones).`,
        hook_type: hook,
        structure,
        tone,
        count: data.posts.length,
        avg_engagement: avgEng,
        avg_outlier_ratio: avgRatio,
        example_hooks: exampleHooks,
      };
    })
    .sort((a, b) => b.avg_outlier_ratio - a.avg_outlier_ratio)
    .slice(0, 15);
}

// ---- Narrative rhythm analysis ----
export function analyzeNarrativeRhythm(post: { content_text?: string | null }): {
  hook_zone: { lines: number; avg_words_per_line: number; style: string };
  body: { style: string; has_list: boolean; has_tension_relief: boolean; mini_hooks: number };
  closing: { style: string; cta_type: string | null };
  sentence_rhythm: { short_long_alternation: number; avg_line_length: number };
  scroll_stops: number;
  scroll_stop_types: string[];
} {
  const text = post.content_text || '';
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  // Hook zone (first 3 content lines)
  const hookLines = lines.slice(0, Math.min(3, lines.length));
  const hookWordsPerLine = hookLines.length > 0
    ? Math.round(hookLines.reduce((s, l) => s + l.trim().split(/\s+/).length, 0) / hookLines.length)
    : 0;
  let hookStyle = 'standard';
  if (hookWordsPerLine <= 5) hookStyle = 'punchy_short';
  else if (hookWordsPerLine >= 15) hookStyle = 'dense_narrative';
  else if (hookLines.length >= 2 && /\?/.test(hookLines[0])) hookStyle = 'question_lead';

  // Body analysis
  const bodyLines = lines.slice(3, Math.max(3, lines.length - 2));
  const hasListInBody = bodyLines.some((l) => /^\s*(\d+[\.\)]\s|[-•]\s|→|✅|❌|▸|🔹)/.test(l));
  const bodyText = bodyLines.join(' ').toLowerCase();
  const hasTensionRelief = /but |however|yet |aunque|pero |sin embargo/i.test(bodyText) &&
    /so |therefore|because|result|solution|por eso|así que|la solución/i.test(bodyText);

  // Mini-hooks: lines that restart attention mid-post
  const miniHooks = bodyLines.filter((l) => {
    const lt = l.trim().toLowerCase();
    return /^(but |here['']?s|the (real|best|worst|key)|wait|and here|pero |aquí|lo (mejor|peor|clave))/i.test(lt) ||
      (lt.endsWith('?') && lt.length < 60) || /^(→|👉|🔥|💡|⚡|🚀)/.test(lt);
  }).length;

  let bodyStyle = 'prose';
  if (hasListInBody) bodyStyle = 'list_driven';
  else if (hasTensionRelief) bodyStyle = 'tension_relief';
  else if (miniHooks >= 2) bodyStyle = 'mini_hook_chain';
  else if (bodyLines.length > 8) bodyStyle = 'long_narrative';

  // Closing analysis
  const closingLines = lines.slice(Math.max(0, lines.length - 2));
  const lastLine = (closingLines[closingLines.length - 1] || '').trim().toLowerCase();
  let closingStyle = 'statement';
  let ctaType: string | null = null;
  if (/\?$/.test(lastLine)) { closingStyle = 'question'; ctaType = 'engagement_question'; }
  else if (/follow|like|share|save|repost|👇|⬇|comment/i.test(lastLine)) { closingStyle = 'explicit_cta'; ctaType = 'explicit_action'; }
  else if (/agree|disagree|thoughts|what do you|qué opinas/i.test(lastLine)) { closingStyle = 'opinion_ask'; ctaType = 'opinion_request'; }
  else if (/lesson|takeaway|remember|bottom line|key|moral/i.test(lastLine)) closingStyle = 'takeaway';
  else if (lastLine.length < 25) closingStyle = 'punchline';

  // Sentence rhythm — measure short-long alternation
  const lineLengths = lines.map((l) => l.trim().split(/\s+/).length);
  let alternations = 0;
  for (let i = 1; i < lineLengths.length; i++) {
    const prev = lineLengths[i - 1];
    const curr = lineLengths[i];
    if ((prev <= 5 && curr >= 10) || (prev >= 10 && curr <= 5)) alternations++;
  }
  const alternationRate = lineLengths.length > 1 ? Math.round((alternations / (lineLengths.length - 1)) * 100) : 0;
  const avgLineLen = lineLengths.length > 0 ? Math.round(lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length) : 0;

  // Scroll stops — elements that re-grab attention
  const scrollStopTypes: string[] = [];
  let scrollStops = 0;
  const blankLineCount = text.split('\n').filter((l) => l.trim().length === 0).length;
  if (blankLineCount >= 3) { scrollStops += Math.min(blankLineCount, 5); scrollStopTypes.push('white_space_breaks'); }
  if (miniHooks > 0) { scrollStops += miniHooks; scrollStopTypes.push('mini_hooks'); }
  const emojiLines = lines.filter((l) => /[\u{1F600}-\u{1FAFF}]/u.test(l));
  if (emojiLines.length >= 2) { scrollStops += 1; scrollStopTypes.push('emoji_markers'); }
  const listItemCount = lines.filter((l) => /^\s*(\d+[\.\)]\s|[-•]\s|→|✅|❌|▸|🔹)/.test(l)).length;
  if (listItemCount >= 3) { scrollStops += 1; scrollStopTypes.push('list_structure'); }
  if (alternationRate > 30) { scrollStops += 1; scrollStopTypes.push('rhythm_variation'); }

  return {
    hook_zone: { lines: hookLines.length, avg_words_per_line: hookWordsPerLine, style: hookStyle },
    body: { style: bodyStyle, has_list: hasListInBody, has_tension_relief: hasTensionRelief, mini_hooks: miniHooks },
    closing: { style: closingStyle, cta_type: ctaType },
    sentence_rhythm: { short_long_alternation: alternationRate, avg_line_length: avgLineLen },
    scroll_stops: scrollStops,
    scroll_stop_types: scrollStopTypes,
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
