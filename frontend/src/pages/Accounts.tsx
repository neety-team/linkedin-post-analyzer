import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, apiPatch, apiPost, apiDelete } from '../hooks/useApi';
import AddManualPostModal from '../components/accounts/AddManualPostModal';
import { DateRangeCalendar } from '../components/DateRangeCalendar';
import {
  Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ComposedChart, Area, ReferenceLine,
} from 'recharts';
import AccountsEngagementChart from '../components/AccountsEngagementChart';
import FollowerGrowthChart from '../components/FollowerGrowthChart';
import OrganicFollowersChart from '../components/OrganicFollowersChart';
import ProfileViewChart from '../components/ProfileViewChart';
import GoogleChatModal from '../components/accounts/GoogleChatModal';
import MediaViewer, { NO_MEDIA_TYPES } from '../components/MediaViewer';
import MonthlyBarChart from '../components/MonthlyBarChart';
import RepliesPanel from '../components/accounts/RepliesPanel';
import LeadMagnetPanel from '../components/accounts/LeadMagnetPanel';
import PilarSelector, { PilaresProvider, usePilares } from '../components/accounts/PilarSelector';
import FiltroDesplegable from '../components/accounts/FiltroDesplegable';
import {
  aplicarFiltrosTop, recuentosFacetados, filtrosDesdeParams, filtrosAParams, hayFiltrosTop,
  ORDENES_TOP, ENLACE_OPCIONES, SIN_PILAR, type FiltrosTop, type OrdenTop, type FiltroEnlace,
} from '../utils/topPostsFiltros';

interface ManagedAccount {
  id: string;
  name: string | null;
  headline: string | null;
  profile_image_url: string | null;
  followers_count: number;
  location: string | null;
  last_scraped_at: string | null;
  is_managed: boolean;
  unipile_account_id: string | null;
  linkedin_id: string | null;
  // Cuenta de la empresa que NO esta conectada a Unipile (migracion v38): sus
  // posts se pegan a mano por URL y las metricas privadas las escribe el
  // usuario. unipile_account_id es NULL a proposito en estas.
  is_manual?: boolean;
  total_posts: number;
  total_outliers: number;
  avg_engagement: number;
  max_engagement: number;
  last_post_at: string | null;
  created_at: string | null;
}

// ⛔ NO HAY `Candidate` NI SELECTOR DE CREADORES EN ESTA PAGINA (Iker, 2026-08-13).
// Accounts gestiona SOLO las 3 cuentas de founder, que estan conectadas a Unipile
// y no van a cambiar. El selector que habia listaba los 151 creadores del
// Dashboard con un check de "cual gestiono", y eso es una pregunta que en esta
// pagina no existe: la respuesta es siempre las mismas tres.
// Quien gestiona `is_managed` es el Dashboard; aqui se leen via `GET /api/accounts`,
// que ya filtra por `is_managed = TRUE`.

interface DailyRowPost {
  id: string;
  preview: string | null;
  url: string | null;
  outlier_ratio: number | null;
  is_outlier: boolean | null;
  creator_id: string;
  creator_name: string;
}

interface DailyRow {
  day: string;
  posts: number;
  outliers: number;
  total_engagement: number;
  avg_engagement: number;
  total_impressions: number;
  rolling_sum_7d: number;
  rolling_impressions_7d: number;
  active_posts_7d: number;
  // Array of all posts published on this day, ordered by engagement
  // DESC. Empty array when no posts. Replaces the previous
  // top_post_* fields (which only surfaced 1 post per day).
  day_posts: DailyRowPost[];
}

interface CompareMetric {
  current: number;
  previous: number;
  delta_pct: number | null;
}

interface Comparison {
  avg_engagement: CompareMetric;
  total_posts: CompareMetric;
  total_outliers: CompareMetric;
  total_likes: CompareMetric;
  total_comments: CompareMetric;
  total_reposts: CompareMetric;
  total_impressions: CompareMetric;
  avg_impressions: CompareMetric;
}

interface FormatRow {
  content_type: string;
  count: number;
  avg_engagement: number;
  outliers: number;
}

interface HookRow {
  hook_type: string;
  count: number;
  avg_engagement: number;
}

interface TopPost {
  id: string;
  content_text: string | null;
  content_type: string;
  published_at: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  profile_viewers_count?: number | null;
  followers_gained_count?: number | null;
  saves_count?: number | null;
  sends_count?: number | null;
  video_views?: number | null;
  video_watch_time_s?: number | null;
  video_avg_watch_s?: number | null;
  video_duration_s?: number | string | null;
  link_clicks_count?: number | null;
  premium_button_clicks?: number | null;
  link_url?: string | null;
  pillar?: string | null;
  impressions_count: number | null;
  engagement_score: number;
  outlier_ratio: number;
  is_outlier: boolean;
  post_url: string | null;
  hook_text: string | null;
  creator_name: string | null;
  creator_image: string | null;
}

interface LivePost {
  id: string;
  content_text: string | null;
  hook_text: string | null;
  content_type: string;
  published_at: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  profile_viewers_count?: number | null;
  followers_gained_count?: number | null;
  saves_count?: number | null;
  sends_count?: number | null;
  video_views?: number | null;
  video_watch_time_s?: number | null;
  video_avg_watch_s?: number | null;
  video_duration_s?: number | string | null;
  link_clicks_count?: number | null;
  premium_button_clicks?: number | null;
  link_url?: string | null;
  pillar?: string | null;
  impressions_count: number | null;
  engagement_score: number;
  outlier_ratio: number | null;
  is_outlier: boolean;
  post_url: string | null;
  creator_id: string;
  creator_name: string | null;
  creator_image: string | null;
  snapshot_count: number;
  last_snapshot_at: string | null;
  // Lecturas del pase de contadores de posts de mas de 7 dias (diario hasta
  // los 90 dias, semanal despues) y fecha de la ULTIMA actualizacion real del
  // post, sea snapshot o lectura. Es la que se enseña: el snapshot cierra al
  // dia 7 y su edad sola hacia creer que nadie tocaba los posts viejos.
  readings_count: number;
  last_reading_at: string | null;
  is_live: boolean;
  phase: 'golden' | 'first_wave' | 'consolidation' | 'long_tail' | 'tail' | 'closed';
  // Cuenta de la empresa que NO esta conectada a Unipile: el post se pego a
  // mano y sus metricas privadas las escribe el usuario (ver migracion v38).
  creator_is_manual?: boolean;
}

const PHASE_META: Record<LivePost['phase'], { label: string; bg: string; text: string; window: string; cadence: string; blurb: string }> = {
  golden:        { label: '🔥 Golden hour',   bg: 'bg-red-500/15',    text: 'text-red-400',    window: '0 – 1h',   cadence: 'every 15 min', blurb: 'Primera muestra: si engancha, LinkedIn amplía distribución. Ventana que decide si el post prende.' },
  first_wave:    { label: '🌊 1st wave',      bg: 'bg-orange-500/15', text: 'text-orange-400', window: '1 – 6h',   cadence: 'every 30 min', blurb: 'Segunda oleada. Aquí se ve con claridad si va a ser normal, bueno o viral.' },
  consolidation: { label: '📈 Consolidation', bg: 'bg-yellow-500/15', text: 'text-yellow-400', window: '6 – 24h',  cadence: 'every 2h',     blurb: 'Se acumula el grueso del alcance. A las 24h suele haber el 60–70% de las impresiones totales.' },
  long_tail:     { label: '📉 Long tail',     bg: 'bg-sky-500/15',    text: 'text-sky-400',    window: '24 – 72h', cadence: 'every 6h',     blurb: 'Long tail fuerte. A 72h ya tienes el 85–90% de las impresiones finales.' },
  tail:          { label: '🐢 Tail',          bg: 'bg-purple-500/15', text: 'text-purple-400', window: '3 – 7d',   cadence: 'every 24h',    blurb: 'Cola residual, sobre todo comentarios y algún reshare.' },
  closed:        { label: '✅ Closed',        bg: 'bg-bg-secondary',  text: 'text-text-muted', window: '> 7d',     cadence: 'weekly',       blurb: 'Sin más puntos en la curva, pero los contadores se refrescan cada semana (públicos sin límite de edad, Premium hasta un año): un post que resurge se ve.' },
};

const PHASE_ORDER: LivePost['phase'][] = ['golden', 'first_wave', 'consolidation', 'long_tail', 'tail', 'closed'];

const ZOOM_PRESETS: { label: string; maxMin: number | null }[] = [
  { label: '1h',  maxMin: 60 },
  { label: '6h',  maxMin: 360 },
  { label: '24h', maxMin: 1440 },
  { label: '72h', maxMin: 4320 },
  { label: 'All', maxMin: null },
];

interface Snapshot {
  captured_at: string;
  impressions_count: number | null;
  // Lo que pinta la curva: la lectura, la estimacion entre dos lecturas o null
  // (backend/src/services/curvaImpresiones.ts).
  impressions_chart?: number | null;
  impressions_estimated?: boolean;
  // Igual para los contadores: en una lectura manual la BD guardaba una copia
  // de los del monitor; aqui llegan estimados (o null si no hay lectura despues).
  likes_chart?: number | null;
  comments_chart?: number | null;
  reposts_chart?: number | null;
  counters_estimated?: boolean;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  profile_viewers_count?: number | null;
  followers_gained_count?: number | null;
  saves_count?: number | null;
  sends_count?: number | null;
  video_views?: number | null;
  video_watch_time_s?: number | null;
  video_avg_watch_s?: number | null;
  video_duration_s?: number | string | null;
  link_clicks_count?: number | null;
  premium_button_clicks?: number | null;
  link_url?: string | null;
  pillar?: string | null;
}

interface TypicalBucket {
  ageMin: number;
  sampleCount: number;
  // Las impresiones pueden tener menos muestras que el engagement (snapshots
  // sin lectura ni estimacion); con menos de 2, sus percentiles vienen null.
  sampleCountImp?: number;
  p25Imp: number | null;
  p50Imp: number | null;
  p75Imp: number | null;
  // Null si en ese tramo hay menos de 2 muestras de engagement (pero si de
  // impresiones).
  p25Eng: number | null;
  p50Eng: number | null;
  p75Eng: number | null;
}

interface SnapshotsResponse {
  post: LivePost;
  snapshots: Snapshot[];
  typical: TypicalBucket[];
}

interface PerAccountRow {
  id: string;
  name: string | null;
  profile_image_url: string | null;
  is_manual?: boolean;
  posts: number;
  outliers: number;
  avg_engagement: number;
  max_virality: number;
  avg_virality: number;
  total_impressions: number;
  avg_impressions: number;
}

interface Analytics {
  days: number;
  creator_id: string | null;
  totals: {
    total_posts: number;
    total_outliers: number;
    avg_engagement: number;
    max_engagement: number;
    total_likes: number;
    total_comments: number;
    total_reposts: number;
    total_impressions: number;
    posts_with_impressions: number;
    avg_impressions: number;
    followers_gained: number;
    profile_views_gained: number;
    posts_per_week: number;
  };
  comparison: Comparison;
  // Cifras oficiales de la pagina de resumen de LinkedIn (ultima lectura de
  // cada cuenta conectada del ambito, sumadas). null si aun no hay lectura.
  linkedin_oficial?: {
    profile_viewers_90d: number;
    post_impressions_7d: number;
    cuentas: number;
    captured_at: string;
  } | null;
  periodo_previo?: { engagement: number; impressions: number } | null;
  daily: DailyRow[];
  format_mix: FormatRow[];
  top_posts: TopPost[];
  hook_types: HookRow[];
  per_account: PerAccountRow[];
}

const FORMAT_LABELS: Record<string, string> = {
  text: 'Text',
  text_image: 'Text + Photo',
  text_carousel: 'Text + Carousel',
  text_video: 'Text + Video',
  text_document: 'Text + Doc',
  image: 'Photo only',
  carousel: 'Carousel only',
  video: 'Video only',
  document: 'Doc only',
  poll: 'Poll',
  article: 'Article',
};

const FORMAT_COLORS: Record<string, string> = {
  text: '#e8935a',
  text_image: '#6366f1',
  text_carousel: '#a78bfa',
  text_video: '#f87171',
  text_document: '#fbbf24',
  image: '#93c5fd',
  carousel: '#c4b5fd',
  video: '#fca5a5',
  document: '#fcd34d',
  poll: '#34d399',
  article: '#38bdf8',
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#222639',
  border: '1px solid #2e3348',
  borderRadius: '8px',
  color: '#e8eaf0',
  fontSize: '12px',
};

// Cifra ENTERA con separador de miles en punto (2.036.300). Es el formato por
// defecto en tarjetas KPI, tabla y métricas de cada post: un número completo
// impacta más que "2036.3K" y ahí hay sitio de sobra (Iker, 2026-07-24).
// En GRÁFICAS NO se usa esto — ahí manda fmtCompact, para que los ejes no se
// amontonen. El agrupado es manual (no toLocaleString) a propósito: en es-ES
// el navegador NO agrupa los de 4 dígitos ("1700"), y quedaba incoherente con
// "44.800". Regex: mete un punto cada 3 dígitos desde la derecha. Math.round
// porque queremos enteros, no "220,7".
function fmtNum(n: number): string {
  const r = Math.round(n);
  return (r < 0 ? '-' : '') + Math.abs(r).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* PILAR de contenido: qué formato de la parrilla es el post.
   Lo detecta el backend (services/pillar.ts) al ingerir, y AHORA se puede
   corregir a mano desde el propio badge (Iker, 2026-08-20): el catálogo de
   pilares, sus colores y el desplegable viven en components/accounts/
   PilarSelector.tsx, que los lee de la tabla `pillars`.

   ⛔ La tabla PILAR_META que había aquí se borró a propósito. Era una lista
   escrita a mano y, cada vez que nacía un pilar en el backend sin pasar por
   aquí, el badge lo pintaba como "Otro" — la tabla decía una cosa y la base
   otra, que es peor que no tener pilar (pasó con `evento` el 11/08). Ahora la
   fuente de verdad es una sola y está en la base de datos. */

/* ¿El cuerpo del post lleva un enlace?
   LinkedIn reescribe TODO enlace del cuerpo a su acortador `lnkd.in/xxxx`, así
   que ese es el patrón que más veces casa; se aceptan también http(s) y www
   por si el texto llega sin reescribir. Da igual si el enlace va en una línea
   suelta o dentro de un bloque de 2 o 3: se busca en el texto entero. */
const RE_ENLACE = /\b(?:https?:\/\/|lnkd\.in\/|www\.)\S+/i;
function tieneEnlaceEnCuerpo(text: string | null | undefined): boolean {
  return !!text && RE_ENLACE.test(text);
}

/* ¿Enseño la chapa de clics al enlace?
   SÍ siempre que el post tenga enlace en el cuerpo, aunque los clics sean 0.
   Antes esto era `!!post.link_clicks_count` y un 0 es falsy, así que la chapa
   desaparecía entera: un post con enlace y 0 clics se veía IGUAL que uno sin
   medición, y parecía que la herramienta no medía (caso real: el mapa de Murcia,
   con lnkd.in en el cuerpo y 0 clics reportados por LinkedIn; Iker, 2026-07-24).
   Con esto quedan tres estados distinguibles: sin enlace → nada · con enlace y
   dato → la cifra (incluido 0) · con enlace y sin dato aún → "—".

   NO basta con `link_clicks_count != null`: LinkedIn devuelve la fila a 0 para
   TODOS los posts, también los que no llevan enlace (un lead magnet de comentario,
   por ejemplo), y entonces salía un "🔗 0" de adorno en medio post de la cuenta.
   El disparador es el ENLACE. El `> 0` de después es solo una red: si algún día
   hay clics pero el enlace no se detecta en el texto, la cifra se enseña igual. */
function mostrarClics(post: { link_clicks_count?: number | null; content_text: string | null }): boolean {
  return tieneEnlaceEnCuerpo(post.content_text) || (post.link_clicks_count ?? 0) > 0;
}

/* ¿Ese 0 es "nadie pinchó" o "LinkedIn no lo está midiendo"?
   Cuando LinkedIn mide un enlace, en la página de analíticas del post pone su URL
   de destino junto a la métrica, y eso es lo que guardamos en `link_url`. Cuando
   NO lo mide, no hay URL: solo un 0 pelado. Así que enlace en el cuerpo + 0 clics
   + sin `link_url` = no está midiendo, y ese 0 no significa falta de interés.
   Medido el 2026-07-24: Navarra 230 y Galicia 107 traen su URL de pampam.city;
   Murcia y Valencia salen a 0 sin URL, con el enlace funcionando y sin haber
   editado el post (global §4.4b). Se pinta apagado y con "sin medir" para que no
   se lea como un fracaso del CTA. */
/* CTR = clics / impresiones, en %. Solo tiene sentido cuando el post LLEVABA
   enlace y LinkedIn midio alcance: un CTR sobre 0 impresiones no es "malo", es
   que no hay dato (misma logica que el orden por 'ctr' de Top posts).
   Iker, 2026-07-29: el numero de clics ya estaba debajo de la tarjeta, pero lo
   que de verdad compara entre posts es la TASA, porque un post con 5 veces mas
   alcance saca mas clics haciendolo peor. */
function ctrPct(post: {
  link_clicks_count?: number | null;
  impressions_count?: number | null;
  content_text: string | null;
}): number | null {
  if (!mostrarClics(post)) return null;
  const imp = post.impressions_count ?? 0;
  if (!imp) return null;
  // Sin dato de clics (analitica Premium aun no leida) no hay CTR: pintar
  // 0,00% lo hacia pasar por un post que no convierte.
  if (post.link_clicks_count == null) return null;
  return (post.link_clicks_count / imp) * 100;
}

function sinMedicion(post: {
  link_clicks_count?: number | null;
  link_url?: string | null;
  content_text: string | null;
}): boolean {
  return tieneEnlaceEnCuerpo(post.content_text) && post.link_clicks_count === 0 && !post.link_url;
}

/* ⭐ FRANJA PREMIUM, UNA SOLA PARA LIVE POSTS Y TOP POSTS (Iker, 2026-09-17).
   Antes cada tarjeta tenia su copia y los ceros se escondian: un post recien
   publicado con 0 guardados no enseñaba nada y parecia que no se medía.
   Reglas:
   - Guardados, envios, seguidores y visitas se enseñan SIEMPRE que LinkedIn
     haya dado la analitica (0 incluido). Si nunca se ha leido: "Premium sin leer".
   - El icono del enlace sale SIEMPRE, con cuatro estados:
       sin enlace en el post            → "sin enlace"
       enlace, clics aun sin leer       → "—"
       enlace, LinkedIn no da la fila   → "sin datos de LinkedIn"
       enlace y dato                    → la cifra (0 incluido), en ambar. */
type PostPremium = {
  content_text: string | null;
  content_type?: string;
  saves_count?: number | null;
  sends_count?: number | null;
  video_views?: number | null;
  video_watch_time_s?: number | null;
  video_avg_watch_s?: number | null;
  video_duration_s?: number | string | null;
  profile_viewers_count?: number | null;
  followers_gained_count?: number | null;
  link_clicks_count?: number | null;
  link_url?: string | null;
};

/* PORCENTAJE MEDIO VISTO (Iker, 2026-10-01). Como en YouTube Shorts: el
   tiempo medio que LinkedIn da de un video, sobre su duracion. Por encima del
   100% el video se ve mas de una vez de media (el objetivo de un video en bucle).
   Colores: verde desde el 80% (Iker); ambar desde el objetivo de Jenny Hoyos,
   que depende de la duracion: <30 s pide 100%, 30 s o mas, 90% (APUNTES JENNY
   SHORTS: "Under 30s needs 100%+ retention. 30-40s 90%+"). */
function porcentajeVisto(p: PostPremium): number | null {
  const d = Number(p.video_duration_s);
  if (p.video_avg_watch_s == null || !d) return null;
  return (p.video_avg_watch_s / d) * 100;
}

function objetivoVisto(duracion: number): number {
  return duracion < 30 ? 100 : 90;
}

function nivelVisto(pct: number, duracion: number): 'neutro' | 'bueno' | 'objetivo' {
  if (pct >= objetivoVisto(duracion)) return 'objetivo';
  if (pct >= 80) return 'bueno';
  return 'neutro';
}

function MetricaVisto({ post }: { post: PostPremium }) {
  const pct = porcentajeVisto(post);
  const dur = Number(post.video_duration_s);
  if (pct == null) {
    return (
      <span className="inline-flex items-center gap-1 text-text-muted" title="Porcentaje medio visto: aún sin leer (falta la analítica de LinkedIn o la duración del vídeo)">
        <MetricIcon d={ICON_PLAY} /> —
      </span>
    );
  }
  const nivel = nivelVisto(pct, dur);
  const color = nivel === 'objetivo' ? 'font-medium text-amber-400' : nivel === 'bueno' ? 'text-emerald-400' : '';
  const titulo =
    `Porcentaje medio visto: de media se ven ${post.video_avg_watch_s} s de los ${Math.round(dur)} s del vídeo. ` +
    `Verde desde el 80%; ámbar desde el objetivo para su duración (${objetivoVisto(dur)}%). ` +
    `Por encima del 100%, se ve más de una vez. LinkedIn redondea la media al segundo (±2-3 puntos).`;
  return (
    <span className={`inline-flex items-center gap-1 ${color}`} title={titulo}>
      <MetricIcon d={ICON_PLAY} /> {Math.round(pct)}%
    </span>
  );
}

function FranjaPremium({ post }: { post: PostPremium }) {
  const leida = [post.saves_count, post.sends_count, post.profile_viewers_count, post.followers_gained_count]
    .some((v) => v != null);
  const conEnlace = mostrarClics(post) || !!post.link_url;
  const sep = <span className="text-text-muted/40 select-none">·</span>;

  let enlace: React.ReactNode;
  if (!conEnlace) {
    enlace = (
      <span className="inline-flex items-center gap-1 text-text-muted/70" title="Este post no lleva enlace: no hay clics que medir">
        <MetricIcon d={ICON_LINK} /> <span className="text-[10px]">sin enlace</span>
      </span>
    );
  } else if (post.link_clicks_count == null) {
    enlace = (
      <span className="inline-flex items-center gap-1 text-text-muted" title="El post lleva enlace, pero la analitica de LinkedIn aun no se ha leido">
        <MetricIcon d={ICON_LINK} /> —
      </span>
    );
  } else if (sinMedicion(post)) {
    enlace = (
      <span
        className="inline-flex items-center gap-1 text-text-muted"
        title="El post lleva enlace, pero LinkedIn no lo registra en la analitica del post (no aparece su URL). Ese 0 no es que nadie pinche: LinkedIn no da el dato."
      >
        <MetricIcon d={ICON_LINK} /> <span className="text-[10px]">sin datos de LinkedIn</span>
      </span>
    );
  } else {
    enlace = (
      <span className="inline-flex items-center gap-1 font-medium text-amber-400" title={`Clics al enlace${post.link_url ? ` → ${post.link_url}` : ''}`}>
        <MetricIcon d={ICON_LINK} /> {fmtNum(post.link_clicks_count)}
      </span>
    );
  }

  return (
    <>
      {sep}
      {post.content_type === 'text_video' && <MetricaVisto post={post} />}
      {leida ? (
        <>
          <span className="inline-flex items-center gap-1" title="Guardados. Cuesta mas que un like y nadie guarda por compromiso.">
            <MetricIcon d={ICON_SAVE} /> {fmtNum(post.saves_count ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1" title="Enviados por privado a otra persona">
            <MetricIcon d={ICON_SEND} /> {fmtNum(post.sends_count ?? 0)}
          </span>
        </>
      ) : (
        <span className="text-[10px] text-text-muted/70" title="La analitica Premium de este post aun no se ha podido leer">
          Premium sin leer
        </span>
      )}
      {enlace}
      {leida && (
        <>
          {sep}
          <span className="text-emerald-400/80" title="Seguidores ganados con este post (LinkedIn Premium)">
            +{fmtNum(post.followers_gained_count ?? 0)} seguidores
          </span>
          <span className="text-emerald-400" title="Visitas a tu PERFIL que salieron de este post (LinkedIn Premium)">
            {fmtNum(post.profile_viewers_count ?? 0)} visitas perfil
          </span>
        </>
      )}
    </>
  );
}

// Compacto (K/M), SOLO para ejes y etiquetas de barra de gráficas, donde una
// cifra entera repetida en cada tick amontona el eje. Añade M para millones
// (antes solo hacía K, y 2 millones salían como "2036.3K", ilegible).
function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toString();
}

/* Iconos de la franja de metricas de cada post.
   Son los MISMOS glifos que usa LinkedIn en su panel de analiticas, para que se
   reconozcan sin leer. Van en SVG monocromo (heredan el color del texto con
   currentColor) en vez de emoji: el emoji se pinta multicolor, cambia de forma
   segun el sistema operativo y no se puede teñir para resaltar los clics. */
const ICON_LIKE = 'M12.9 5.5H9.4l.6-2.2c.2-.9-.3-1.8-1.2-2-.6-.2-1.3.1-1.6.6L4.8 5.5H3a1 1 0 0 0-1 1v5.6a1 1 0 0 0 1 1h8.4a1.7 1.7 0 0 0 1.7-1.4l.8-4.6a1.4 1.4 0 0 0-1-1.6z';
const ICON_COMMENT = 'M8 2a6 6 0 0 0-6 6c0 1.2.4 2.3 1 3.2L2.3 14l2.9-.7c.8.5 1.8.7 2.8.7a6 6 0 1 0 0-12z';
const ICON_REPOST = 'M11 3.5 13.5 6 11 8.5V7H5.5A1.5 1.5 0 0 0 4 8.5v1H2.5v-1A3 3 0 0 1 5.5 5.5H11zM5 12.5 2.5 10 5 7.5V9h5.5A1.5 1.5 0 0 0 12 7.5v-1h1.5v1a3 3 0 0 1-3 3H5z';
const ICON_SAVE = 'M4 2h8a1 1 0 0 1 1 1v11l-5-3.2L3 14V3a1 1 0 0 1 1-1z';
const ICON_SEND = 'M14.5 1.5 1 7.2l4.6 1.6L13 3.4 7.6 10v4.5l2.2-3.3 3.1 1.1z';
// Play: porcentaje medio visto de los posts de video (2026-10-01).
const ICON_PLAY = 'M5 3.2v9.6L12.5 8z';
const ICON_LINK = 'M6.9 9.1a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-1 1 1 1 1-1a1.2 1.2 0 0 1 1.7 1.7L9.6 8.1a1.2 1.2 0 0 1-1.7 0zM9.1 6.9a2.6 2.6 0 0 0-3.7 0L3.2 9.1a2.6 2.6 0 0 0 3.7 3.7l1-1-1-1-1 1a1.2 1.2 0 0 1-1.7-1.7l2.2-2.2a1.2 1.2 0 0 1 1.7 0z';
const ICON_EYE = 'M8 3C4.7 3 2 5.5 1 8c1 2.5 3.7 5 7 5s6-2.5 7-5c-1-2.5-3.7-5-7-5zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0-1.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z';

/**
 * Nombre de cuenta recortado a nombre + primer apellido.
 * LinkedIn guarda el nombre legal completo ("Iker Galarza Rodríguez"), y en una
 * lista de tarjetas eso descuadra las columnas y encima deja a un jefe con dos
 * apellidos y a otro con uno, segun como tenga puesto su perfil. Con dos
 * palabras los tres se ven igual.
 *
 * OJO: solo para las CUENTAS propias (los tres founders). No usar con nombres de
 * comentaristas: hay gente con nombre compuesto ("José Arturo Gutiérrez") a la
 * que esto dejaria en "José Arturo", que no es su apellido.
 */
function nombreCuenta(n: string | null | undefined): string {
  if (!n) return 'Unknown';
  return n.trim().split(/\s+/).slice(0, 2).join(' ');
}

function MetricIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d={d} />
    </svg>
  );
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtFullDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function truncate(s: string | null, n: number): string {
  if (!s) return '—';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// Inline "see more" toggle for post-row body text. Mirrors LinkedIn's
// own preview cut: collapsed view shows the hook only — everything up to
// the first line break. That's the part the feed actually surfaces before
// "…ver más", so it's the most honest preview of what readers see.
//
// Fallback for hooks longer than HARD_PREVIEW_CAP (a single long sentence
// with no \n): cut at the cap so a hook that overruns the see-more zone
// still gets visually flagged. Toggle expands to the full body in both
// cases. \r\n is normalised to \n before scanning so Windows-typed posts
// don't fool the cut.
const HARD_PREVIEW_CAP = 220;
function ExpandablePostText({ text }: { text: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const value = (text || '').replace(/\r\n/g, '\n');
  if (!value) return <p className="text-sm text-text-muted italic">(sin texto)</p>;

  const firstBreak = value.indexOf('\n');
  let preview = value;
  let needsTrunc = false;
  if (firstBreak >= 0 && firstBreak < value.length - 1) {
    preview = value.slice(0, firstBreak);
    needsTrunc = true;
  } else if (value.length > HARD_PREVIEW_CAP) {
    preview = value.slice(0, HARD_PREVIEW_CAP) + '…';
    needsTrunc = true;
  }

  return (
    <div>
      <p className="text-sm text-text-primary whitespace-pre-wrap leading-snug">
        {expanded ? value : preview}
      </p>
      {needsTrunc && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="text-[11px] text-accent hover:text-accent-light mt-1"
        >
          {expanded ? 'Ver menos ↑' : 'Ver más ↓'}
        </button>
      )}
    </div>
  );
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null || !isFinite(pct)) return null;
  const rounded = Math.round(pct);
  if (rounded === 0) {
    return <span className="text-[10px] font-medium text-text-muted">0%</span>;
  }
  const up = rounded > 0;
  return (
    <span className={`text-[10px] font-medium ${up ? 'text-green-400' : 'text-red-400'}`}>
      {up ? '▲' : '▼'} {Math.abs(rounded)}%
    </span>
  );
}

// Format a Date as YYYY-MM-DD using LOCAL time (not UTC), so a user
// picking "today" in the date input doesn't end up sending yesterday.
function toIsoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Compute the [start, end] (inclusive, both ISO YYYY-MM-DD) for a
// "last N days ending today" preset. e.g. preset=30 returns the 30-day
// window ending today, matching the previous `days=30` semantics.
function presetRange(days: number): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return { start: toIsoDay(start), end: toIsoDay(today) };
}

function AccountsInner() {
  const [selectedCreator, setSelectedCreator] = useState<string>('all');
  // Date range model: preset = one of [30, 90, 180] OR 'custom' (free
  // start/end selection). We compute startDate + endDate from the
  // active mode and propagate those everywhere — endpoints accept
  // start_date + end_date. `days` is derived for any chart prop that
  // still wants a single number (e.g. ProfileViewChart's "vs last Nd"
  // delta label).
  const [datePreset, setDatePreset] = useState<30 | 90 | 180 | 'custom'>(30);
  // El calendario solo se despliega al pulsar Custom. Antes salían dos campos
  // de fecha en cuanto se elegía Custom, y ocupaban media barra de filtros.
  const [showCalendar, setShowCalendar] = useState(false);
  // El rango personalizado arranca VACIO (Iker, 2026-09-16): antes nacia con
  // los ultimos 30 dias y al abrir el calendario ya habia un rango puesto del
  // 18/08 al 16/09, que es lo mismo que el boton de 30d. Ahora espera a que se
  // pinche: el primer clic es el inicio y el segundo el final.
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  // El preset que habia antes de abrir Custom. Mientras no se pincha ningun
  // dia, los datos siguen siendo los de ese preset, en vez de quedarse vacios.
  const [prevPreset, setPrevPreset] = useState<30 | 90 | 180>(30);

  const dateRange = useMemo(() => {
    if (datePreset === 'custom') {
      // Entre el primer clic y el segundo, `customEnd` está VACÍO. Sin este
      // guard, `''` ordenaba antes que cualquier fecha y el rango salía
      // `{start:'', end:'2026-07-31'}`; luego `new Date('T00:00:00')` era
      // Invalid Date y en la barra se leía "NaN days" (Iker, 2026-08-21).
      // Con un solo día elegido, el rango es ese día: un día.
      if (!customStart && !customEnd) return presetRange(prevPreset);
      if (!customEnd) return { start: customStart, end: customStart };
      if (!customStart) return { start: customEnd, end: customEnd };
      // Guard against inverted ranges — UI prevents this but defend anyway.
      const a = customStart <= customEnd ? customStart : customEnd;
      const b = customStart <= customEnd ? customEnd : customStart;
      return { start: a, end: b };
    }
    return presetRange(datePreset);
  }, [datePreset, customStart, customEnd, prevPreset]);

  // Cerrar el calendario sin haber pinchado ningun dia (o tras "Borrar") vuelve
  // al preset de antes: un Custom vacio no es un filtro.
  // Va en un efecto y no dentro de closeCalendar porque "Borrar" vacia el rango
  // y cierra en el mismo clic, y ahi el cierre aun ve el rango viejo.
  const closeCalendar = () => setShowCalendar(false);
  useEffect(() => {
    if (!showCalendar && datePreset === 'custom' && !customStart && !customEnd) setDatePreset(prevPreset);
  }, [showCalendar, datePreset, customStart, customEnd, prevPreset]);

  const days = useMemo(() => {
    const start = new Date(`${dateRange.start}T00:00:00`);
    const end = new Date(`${dateRange.end}T00:00:00`);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }, [dateRange]);
  // Antes esto era `managerOpen` y abria el selector de creadores. Ahora solo
  // abre el editor de account_id de Unipile, y arranca CERRADO siempre: es la
  // otra mitad del arreglo del panel fantasma, porque ningun estado de carga
  // puede abrirlo por su cuenta (Iker, 2026-08-13).
  const [unipileOpen, setUnipileOpen] = useState(false);
  const [unipileEdits, setUnipileEdits] = useState<Record<string, string>>({});
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [scrapeResult, setScrapeResult] = useState<Record<string, string>>({});
  const [legendOpen, setLegendOpen] = useState(false);
  // Cuentas manuales: por defecto suman a todo. El check las apaga cuando solo
  // se quiere mirar a las cuentas conectadas — los TOTALES no sufren al
  // mezclar, pero las MEDIAS si (un trabajador con 1 post baja el avg de los
  // jefes), y este interruptor evita tener que elegir una verdad para siempre.
  const [incluirManuales, setIncluirManuales] = useState(true);
  const [modalManual, setModalManual] = useState(false);
  const [editarMetricas, setEditarMetricas] = useState<LivePost | null>(null);
  const [liveRefreshing, setLiveRefreshing] = useState(false);
  const [liveRefreshMsg, setLiveRefreshMsg] = useState<string | null>(null);
  // Bumped on Refresh so the snapshot-backed charts (followers, profile views)
  // re-fetch — they own their data fetch internally and otherwise wouldn't
  // notice that the backend just captured fresh snapshots.
  const [refreshSignal, setRefreshSignal] = useState(0);
  // FILTROS DE TOP POSTS (Iker, 2026-10-06): cuatro desplegables por categoria
  // (Ordenar por, Pilar, Formato, Enlace) en vez de 15 botones sueltos de una
  // sola opcion. La logica (Y entre categorias, O dentro, recuentos como en
  // una tienda, ida y vuelta a la URL) vive en utils/topPostsFiltros.ts. El
  // estado ES la URL: `?top_pilar=historia,meme&top_orden=ctr&top_enlace=con`
  // reproduce la vista, que es lo que necesita el analisis semanal.
  // 'clicks' / 'saves' / 'sends' son metricas de LinkedIn Premium (v32). Valen
  // mas que el alcance para juzgar un post: el meme de 86.815 impresiones tiene
  // 0,09% de CTR y un mapa de 21.071 tiene 1,10% — doce veces mejor con cuatro
  // veces menos alcance. 'ctr' ordena por eso mismo, clics entre impresiones,
  // que es lo unico que compara posts de tamaños distintos de forma justa.
  const [searchParams, setSearchParams] = useSearchParams();
  const topFiltros = useMemo<FiltrosTop>(() => filtrosDesdeParams(searchParams), [searchParams]);
  const setTopFiltros = useCallback((cambio: Partial<FiltrosTop>) => {
    setSearchParams((prev) => filtrosAParams({ ...filtrosDesdeParams(prev), ...cambio }, prev), { replace: true });
  }, [setSearchParams]);
  const [chatPostId, setChatPostId] = useState<string | null>(null);
  // Top-level tab. BI is the original Accounts dashboard; Replies is the
  // inbox for answering unanswered comments in the author's own voice
  // (Iker / Unai); Lead Magnet is the delivery flow for a keyword post —
  // pick the post, filter the comments that carry the keyword, reply and
  // send each person the resource. Lead Magnet is its own tab rather than a
  // mode inside Replies because the flow is the opposite shape: Replies
  // starts from "what's pending everywhere", this starts from one post.
  const [view, setView] = useState<'bi' | 'replies' | 'leadmagnet'>('bi');
  // Live-posts list grows long fast; reveal in pages of LIVE_PAGE.
  const LIVE_PAGE = 12;
  const [visibleLive, setVisibleLive] = useState(LIVE_PAGE);
  // Same idea for the Top Posts list (sorted by outlier ratio) — show
  // the head of the ranking by default, let the user expand to dig deeper.
  const TOP_PAGE = 8;
  const [visibleTop, setVisibleTop] = useState(TOP_PAGE);
  // Reset visibility when any Top posts filter changes so we never show a
  // "ver más" with a stale count from the previous filter.
  useEffect(() => {
    setVisibleTop(TOP_PAGE);
  }, [topFiltros]);

  // `loading` NO es decorativo aqui, es lo que arregla el panel fantasma
  // (Iker, 2026-08-13): `useApi` arranca con `data = null`, asi que en CADA
  // recarga `hasAccounts` es false hasta que responde la peticion. Cualquier
  // bloque colgado de `!hasAccounts` se pinta durante ese hueco y parece que no
  // hay cuentas cuando si las hay. Se distingue "aun no ha cargado" de "no hay
  // ninguna" con esta bandera, nunca con la longitud del array.
  const { data: accounts, loading: loadingAccounts, refetch: refetchAccounts } =
    useApi<ManagedAccount[]>('/api/accounts');

  // CUENTAS QUE PUEDEN ACTUAR, no solo aparecer (Iker, 2026-08-19).
  //
  // Comentarios y Lead Magnet no LEEN nada: responden, reaccionan y mandan el
  // recurso por privado. Todo eso necesita la sesion de Unipile de esa cuenta,
  // y una cuenta manual no la tiene — por eso su unipile_account_id es NULL.
  //
  // Sus dos endpoints (/comments/pending y /lead-magnet/posts) ya exigen
  // `unipile_account_id IS NOT NULL`, asi que elegir una manual en el
  // desplegable devolvia SIEMPRE una lista vacia: una opcion que no lleva a
  // ninguna parte y que parece que la herramienta se ha roto.
  //
  // El filtro es por unipile_account_id y no por is_manual a proposito: lo que
  // decide si una cuenta puede actuar es tener sesion, no como se creo. Una
  // cuenta conectada a la que aun no se le ha puesto el ID tampoco puede hacer
  // nada en estas dos pestañas, y se configura arriba en "Unipile IDs".
  const cuentasConSesion = useMemo(
    () => (accounts || []).filter((a) => !!a.unipile_account_id),
    [accounts]
  );
  // Live posts now respect the same top-of-page date range as the analytics
  // charts — the backend STRICTLY filters by published_at within the range
  // when start_date/end_date are present (no 7-day fallback). When the user
  // changes the date filter, useApi re-fetches automatically because the URL
  // changes.
  const livePostsPath = `/api/accounts/live-posts?start_date=${dateRange.start}&end_date=${dateRange.end}${selectedCreator !== 'all' ? `&creator_id=${selectedCreator}` : ''}${incluirManuales ? '' : '&include_manual=false'}`;
  const { data: livePosts, refetch: refetchLive } = useApi<LivePost[]>(livePostsPath);

  // Auto-refresh live posts every 2 minutes so new snapshots appear without a page reload
  useEffect(() => {
    const timer = setInterval(() => refetchLive(), 2 * 60 * 1000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Collapse the list back to the first page whenever the creator filter
  // changes — otherwise switching accounts keeps a stale large reveal.
  useEffect(() => {
    setVisibleLive(LIVE_PAGE);
  }, [selectedCreator]); // eslint-disable-line react-hooks/exhaustive-deps

  const analyticsPath = `/api/accounts/analytics?start_date=${dateRange.start}&end_date=${dateRange.end}${selectedCreator !== 'all' ? `&creator_id=${selectedCreator}` : ''}${incluirManuales ? '' : '&include_manual=false'}`;
  const { data: analytics, loading: loadingAnalytics, refetch: refetchAnalytics } = useApi<Analytics>(analyticsPath);

  const saveUnipileId = async (id: string) => {
    const value = unipileEdits[id] ?? '';
    try {
      await apiPatch(`/api/accounts/${id}`, { unipile_account_id: value });
      setScrapeResult((r) => ({ ...r, [id]: '✓ Saved' }));
      setTimeout(() => setScrapeResult((r) => ({ ...r, [id]: '' })), 2000);
      refetchAccounts();
    } catch (err: any) {
      setScrapeResult((r) => ({ ...r, [id]: `✗ ${err.message}` }));
    }
  };

  const scrapeAccount = async (id: string) => {
    setScrapingId(id);
    setScrapeResult((r) => ({ ...r, [id]: 'Scraping...' }));
    try {
      const res = await apiPost<{ scraped: number; with_impressions: number }>(
        `/api/accounts/${id}/scrape`,
        {}
      );
      setScrapeResult((r) => ({
        ...r,
        [id]: `✓ ${res.scraped} posts · ${res.with_impressions} with impressions`,
      }));
      refetchAccounts();
    } catch (err: any) {
      setScrapeResult((r) => ({ ...r, [id]: `✗ ${err.message}` }));
    } finally {
      setScrapingId(null);
    }
  };

  const hasAccounts = (accounts?.length || 0) > 0;

  const dailyChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.daily.map((d: any) => {
      // day_posts comes from the backend as a JSON array ordered by
      // engagement_score DESC. Normalise it to the camelCase shape the
      // chart expects, and derive `topPost*` from the first element so
      // the per-day tooltip keeps working unchanged.
      const rawDayPosts = Array.isArray(d.day_posts) ? d.day_posts : [];
      const dayPosts = rawDayPosts.map((p: any) => ({
        id: String(p.id),
        preview: p.preview ?? null,
        url: p.url ?? null,
        outlierRatio: p.outlier_ratio != null ? Number(p.outlier_ratio) : null,
        isOutlier: !!p.is_outlier,
        creatorId: String(p.creator_id),
        creatorName: p.creator_name || '—',
      }));
      const top = dayPosts[0];
      return {
        day: d.day,
        label: fmtDay(d.day),
        rolling: d.rolling_sum_7d,
        raw: d.total_engagement,
        posts: d.posts,
        outliers: d.outliers,
        rollingImpressions: Number(d.rolling_impressions_7d || 0),
        rawImpressions: Number(d.total_impressions || 0),
        activePosts: d.active_posts_7d || 0,
        dayPosts,
        topPostId: top?.id ?? null,
        topPostPreview: top?.preview ?? null,
        topPostUrl: top?.url ?? null,
        topPostOutlierRatio: top?.outlierRatio ?? null,
        topPostIsOutlier: top?.isOutlier ?? null,
      };
    });
  }, [analytics]);

  // Show ~8 ticks on the x-axis regardless of range length.
  const xTickInterval = Math.max(0, Math.floor(dailyChartData.length / 8) - 1);

  const formatChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.format_mix.map((f) => ({
      ...f,
      label: FORMAT_LABELS[f.content_type] || f.content_type,
      color: FORMAT_COLORS[f.content_type] || '#6b7280',
    }));
  }, [analytics]);

  const outlierRate = analytics && analytics.totals.total_posts > 0
    ? Math.round((analytics.totals.total_outliers / analytics.totals.total_posts) * 100)
    : 0;

  // Recuentos de cada opcion con los OTROS filtros aplicados, y la lista
  // filtrada y ordenada. Todo en utils/topPostsFiltros.ts (con test).
  const topRecuentos = useMemo(
    () => recuentosFacetados(analytics?.top_posts ?? [], topFiltros),
    [analytics, topFiltros]
  );
  const filteredTopPosts = useMemo(
    () => (analytics ? aplicarFiltrosTop(analytics.top_posts, topFiltros) : []),
    [analytics, topFiltros]
  );
  // Opciones de los desplegables. Pilar: el catalogo en su orden, solo los que
  // tienen algun post en el rango (o estan marcados), mas "Sin pilar" si hay
  // posts sin clasificar. Formato: los content_type presentes.
  const { pilares: catalogoPilares, porSlug: pilarPorSlug } = usePilares();
  const opcionesPilar = useMemo(() => {
    const presentes = new Set<string>([...topRecuentos.pilares.keys(), ...topFiltros.pilares]);
    if (analytics) for (const p of analytics.top_posts) presentes.add(p.pillar || SIN_PILAR);
    const ordenados = [...catalogoPilares]
      .sort((a, b) => a.sort_order - b.sort_order)
      .filter((pl) => presentes.has(pl.slug))
      .map((pl) => ({ valor: pl.slug, etiqueta: pl.label, recuento: topRecuentos.pilares.get(pl.slug) || 0 }));
    // Slugs que no estan en el catalogo (borrados o renombrados): se enseñan tal cual.
    const conocidos = new Set(catalogoPilares.map((pl) => pl.slug));
    for (const slug of presentes) {
      if (slug === SIN_PILAR || conocidos.has(slug)) continue;
      ordenados.push({ valor: slug, etiqueta: slug, recuento: topRecuentos.pilares.get(slug) || 0 });
    }
    if (presentes.has(SIN_PILAR)) {
      ordenados.push({ valor: SIN_PILAR, etiqueta: 'Sin pilar', recuento: topRecuentos.pilares.get(SIN_PILAR) || 0 });
    }
    return ordenados;
  }, [catalogoPilares, topRecuentos, topFiltros.pilares, analytics]);
  const opcionesFormato = useMemo(() => {
    const presentes = new Set<string>(topFiltros.formatos);
    if (analytics) for (const p of analytics.top_posts) presentes.add(p.content_type || 'text');
    return [...presentes].sort().map((t) => ({
      valor: t, etiqueta: FORMAT_LABELS[t] || t, recuento: topRecuentos.formatos.get(t) || 0,
    }));
  }, [analytics, topRecuentos, topFiltros.formatos]);
  const etiquetaPilar = (slug: string) => slug === SIN_PILAR ? 'Sin pilar' : (pilarPorSlug[slug]?.label || slug);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">Accounts</h1>
          <p className="text-text-secondary">Track the performance of the LinkedIn accounts you manage.</p>
        </div>
        {/* Sin engranaje de "Manage accounts" (Iker, 2026-08-13): las cuentas son
            siempre las mismas tres, asi que no hay nada que gestionar. Lo unico que
            queda es pegar el account_id de Unipile, que se abre a mano y NUNCA solo. */}
        {hasAccounts && (
          <button
            onClick={() => setUnipileOpen((v) => !v)}
            className="px-3 py-1.5 bg-bg-card border border-border text-text-muted text-xs rounded-lg hover:border-accent/40 hover:text-text-primary transition-colors"
          >
            {unipileOpen ? 'Hide' : 'Unipile IDs'}
          </button>
        )}
      </div>

      {/* Unipile account ID per managed account — needed to scrape impressions */}
      {unipileOpen && hasAccounts && (
        <div className="bg-bg-card border border-border rounded-xl p-5 space-y-3">
          {(
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Unipile account IDs</h4>
                <p className="text-xs text-text-muted">
                  LinkedIn only returns impressions for posts fetched through the account's own Unipile session.
                  Paste each managed account's Unipile <code className="text-accent">account_id</code> below and hit Scrape.
                </p>
              </div>
              <div className="space-y-2">
                {accounts?.map((a) => {
                  const current = unipileEdits[a.id] ?? a.unipile_account_id ?? '';
                  const dirty = current !== (a.unipile_account_id ?? '');
                  const msg = scrapeResult[a.id];
                  return (
                    <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-bg-primary">
                      {a.profile_image_url ? (
                        <img src={a.profile_image_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-bg-secondary flex items-center justify-center text-text-muted text-xs flex-shrink-0">
                          {(a.name || '?')[0]}
                        </div>
                      )}
                      <div className="text-sm text-text-primary w-40 truncate">{nombreCuenta(a.name)}</div>
                      <input
                        type="text"
                        value={current}
                        placeholder="Unipile account_id"
                        onChange={(e) => setUnipileEdits((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        className="flex-1 bg-bg-card border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
                      />
                      <button
                        disabled={!dirty}
                        onClick={() => saveUnipileId(a.id)}
                        className="px-2 py-1 text-xs border border-border rounded text-text-secondary hover:border-accent hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Save
                      </button>
                      <button
                        disabled={!a.unipile_account_id || scrapingId === a.id}
                        onClick={() => scrapeAccount(a.id)}
                        className="px-2 py-1 text-xs border border-accent/30 bg-accent/10 rounded text-accent hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        {scrapingId === a.id ? '…' : 'Scrape'}
                      </button>
                      {msg && <span className="text-[11px] text-text-muted whitespace-nowrap">{msg}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-section tabs — BI is the dashboard you've always had; Replies
          is the triage view for answering comments in your own voice; Lead
          Magnet delivers the resource to whoever commented the keyword. */}
      {hasAccounts && (
        <div className="flex items-center gap-1 border-b border-border">
          {/* ✅ La pestaña "Lead Magnet" se retiro el 2026-08-21, con el OK de Iker
              despues de usar Comments con datos reales: detecta el pilar, monta el
              mismo panel al desplegar y saca las solicitudes arriba sin elegir
              nada.

              El componente y su rama de render SIGUEN en el codigo
              (`LeadMagnetPanel.tsx`, view === 'leadmagnet'): volver a enseñarla es
              devolver esta linea a la lista. Se dejo asi a proposito por si algun
              dia hace falta la vista de "un post a fondo". */}
          {([
            { key: 'bi', label: 'Accounts', ayuda: '' },
            { key: 'replies', label: 'Comments', ayuda: 'Todo lo que queda por hacer: comentarios sin responder, recursos de lead magnet sin entregar y solicitudes ya llegadas' },

          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              title={t.ayuda || undefined}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                view === t.key
                  ? 'border-accent text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {view === 'replies' && hasAccounts && (
        <RepliesPanel accounts={cuentasConSesion} selectedCreator={selectedCreator} onSelectCreator={setSelectedCreator} />
      )}

      {view === 'leadmagnet' && hasAccounts && (
        <LeadMagnetPanel accounts={cuentasConSesion} onSelectCreator={setSelectedCreator} />
      )}

      {view === 'bi' && (<>
      {/* Filters */}
      {hasAccounts && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Account:</span>
            <select
              value={selectedCreator}
              onChange={(e) => setSelectedCreator(e.target.value)}
              className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="all">All managed accounts</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {nombreCuenta(a.name)}{a.is_manual ? ' · manual' : ''}
                </option>
              ))}
            </select>
          </div>
          {/* El selector SIGUE listando las cuentas manuales aunque el check
              este apagado: el interruptor cambia lo que se AGREGA, no lo que se
              puede mirar. Apagarlo y que ademas desapareciera del desplegable
              seria una segunda regla escondida dentro de la primera. */}
          {accounts?.some((a) => a.is_manual) && (
            <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incluirManuales}
                onChange={(e) => setIncluirManuales(e.target.checked)}
                className="accent-accent"
              />
              <span title="Las cuentas manuales son posts que escribimos para gente cuya cuenta no esta conectada a Unipile. Apagarlo deja solo las conectadas.">
                Incluir cuentas manuales
              </span>
            </label>
          )}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-text-muted mr-1">Range:</span>
            {([30, 90, 180] as const).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDatePreset(d);
                  setPrevPreset(d);
                  setCustomStart('');
                  setCustomEnd('');
                  setShowCalendar(false);
                }}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  datePreset === d
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'bg-bg-secondary text-text-muted border border-border hover:border-accent/30'
                }`}
              >
                {`${d}d`}
              </button>
            ))}
            {/* El calendario es NUESTRO, no el `<input type="date">`: ese panel
                lo dibuja el navegador y no se puede estilar. Salía el día en
                azul de Chrome y con la fuente del sistema. Ver el comentario de
                DateRangeCalendar. */}
            <div className="relative">
              <button
                // Sin esto, el "pinchar fuera" del calendario lo cerraba en el
                // mousedown y el click lo volvia a abrir.
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (showCalendar) return closeCalendar();
                  if (datePreset !== 'custom') {
                    // Se entra en Custom SIN rango: lo elige Iker con dos clics.
                    setCustomStart('');
                    setCustomEnd('');
                    setDatePreset('custom');
                  }
                  setShowCalendar(true);
                }}
                // El ancho DEPENDE de lo que ponga dentro. Con "Custom" cabe en
                // nada; con un rango entero (`2026-07-31 → 2026-08-15`) hacen
                // falta 23 caracteres y antes se cortaba. Se reserva el ancho
                // en cuanto hay rango, en vez de dejar que el botón crezca y
                // encoja: si el ancho bailara con cada clic, los presets de al
                // lado se moverían debajo del cursor (Iker, 2026-08-21).
                className={`py-1 rounded text-xs transition-colors whitespace-nowrap ${
                  datePreset === 'custom'
                    ? 'px-3 min-w-[218px] bg-accent/20 text-accent border border-accent/30 tabular-nums'
                    : 'px-2.5 bg-bg-secondary text-text-muted border border-border hover:border-accent/30'
                }`}
              >
                📅 {datePreset === 'custom' && customStart
                  ? `${customStart}${customEnd ? ` → ${customEnd}` : ' → …'}`
                  : 'Custom'} {showCalendar ? '▴' : '▾'}
              </button>
              {showCalendar && (
                <DateRangeCalendar
                  start={customStart}
                  end={customEnd}
                  onChange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
                  onClose={closeCalendar}
                />
              )}
            </div>
            {datePreset === 'custom' && customStart && (
              <span className="text-[10px] text-text-muted ml-2">{days} day{days === 1 ? '' : 's'}</span>
            )}
          </div>
        </div>
      )}

      {/* Empty state. ⛔ Va con `!loadingAccounts` DELANTE y no es un detalle de
          estilo: es el mismo fallo que abria el panel fantasma. Con solo
          `!hasAccounts`, este bloque se pintaba en cada recarga durante el medio
          segundo que tarda `GET /api/accounts`, y decia "no hay cuentas" teniendo
          tres. `hasAccounts` no distingue "vacio" de "aun no ha llegado";
          `loadingAccounts` si (Iker, 2026-08-13). */}
      {!loadingAccounts && !hasAccounts && (
        <div className="text-center py-16 text-text-muted border border-dashed border-border rounded-xl">
          <p className="text-4xl mb-4">📈</p>
          <p className="mb-1">No managed accounts.</p>
          <p className="text-xs">
            Accounts only shows the 3 founder accounts. If none appear, check <code className="text-accent">is_managed</code> on the Dashboard.
          </p>
        </div>
      )}

      {/* Live posts — monitored growth curve. The backend snapshot worker runs every 15 min
          and captures posts published < 6h ago from managed accounts that have a unipile_account_id. */}
      {hasAccounts && (
        <div className="bg-bg-card border border-border rounded-xl p-5">
          {/* Titulo a la izquierda y botones SIEMPRE arriba a la derecha: el
              texto se estrecha (min-w-0) en vez de empujar los botones a otra
              linea, que es lo que paso al alargar la descripcion (2026-09-17). */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {(() => {
                  // "Monitoring" = any tracked post still within the 7d window (any non-closed phase).
                  // Shows a red breathing dot + outward ripple so it feels like a live heartbeat.
                  const monitoring = livePosts?.some((p) => p.phase !== 'closed');
                  return (
                    <span className="relative flex items-center justify-center h-3 w-3">
                      {monitoring && (
                        <span className="absolute inline-flex h-3 w-3 rounded-full bg-red-500 opacity-60 animate-ping" />
                      )}
                      <span
                        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                          monitoring
                            ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.9)]'
                            : 'bg-text-muted'
                        }`}
                      />
                    </span>
                  );
                })()}
                Live posts
              </h3>
              <p className="text-xs text-text-muted">
                Phase-based snapshots for 7 days; after that, likes, comments, reposts and impressions refresh weekly with no age limit, and Premium analytics weekly up to a year.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 whitespace-nowrap">
              <button
                onClick={() => setLegendOpen((v) => !v)}
                className="text-xs text-text-muted hover:text-accent transition-colors"
                title="Cómo LinkedIn distribuye un post en el tiempo"
              >
                {legendOpen ? '▾' : '▸'} How phases work
              </button>
              {livePosts?.some((p) => p.content_text?.startsWith('DEMO ·')) ? (
                <button
                  onClick={async () => {
                    try {
                      await apiDelete('/api/accounts/demo-seed');
                      refetchLive();
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }}
                  className="text-xs text-text-muted hover:text-red-400 transition-colors"
                >
                  ✕ Remove demo
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      await apiPost('/api/accounts/demo-seed', {});
                      refetchLive();
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }}
                  className="text-xs text-accent hover:text-accent-light transition-colors"
                >
                  + Load demo data
                </button>
              )}
              <button
                onClick={() => setModalManual(true)}
                className="text-xs text-text-muted hover:text-accent transition-colors"
                title="Pegar la URL de un post de una cuenta de la empresa que no esta conectada a Unipile"
              >
                + Anadir post
              </button>
              <button
                onClick={async () => {
                  setLiveRefreshing(true);
                  setLiveRefreshMsg(null);
                  try {
                    // When the page-level selector is on a specific creator,
                    // scope the bulk refresh to that one. 'all' falls back to
                    // refreshing every managed account.
                    const body = selectedCreator !== 'all' ? { creator_id: selectedCreator } : {};
                    const res = await apiPost<{ captured: number; candidates: number; scraped: number; accounts: number }>(
                      '/api/accounts/live-refresh',
                      body
                    );
                    setLiveRefreshMsg(`✓ ${res.scraped} posts scraped · ${res.captured} snapshots`);
                    refetchLive();
                    refetchAnalytics();
                    setRefreshSignal((s) => s + 1);
                    setTimeout(() => setLiveRefreshMsg(null), 5000);
                  } catch (err: any) {
                    setLiveRefreshMsg(`✗ ${err.message}`);
                  } finally {
                    setLiveRefreshing(false);
                  }
                }}
                disabled={liveRefreshing}
                className="text-xs text-text-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={selectedCreator !== 'all'
                  ? "Fetch new posts from this account (only adds posts not already in the DB)"
                  : "Fetch new posts from every managed account (only adds posts not already in the DB)"}
              >
                {liveRefreshing
                  ? '↻ Fetching…'
                  : selectedCreator !== 'all'
                    ? '+ Get new posts (this account)'
                    : '+ Get new posts'}
              </button>
              {liveRefreshMsg && (
                <span className="text-[11px] text-text-muted whitespace-nowrap">{liveRefreshMsg}</span>
              )}
            </div>
          </div>
          {legendOpen && (
            <div className="mb-4 p-4 rounded-lg border border-border bg-bg-primary">
              <p className="text-xs text-text-muted mb-3">
                El algoritmo de LinkedIn distribuye por <span className="text-text-secondary font-medium">oleadas</span>, no linealmente.
                Cada fase tiene su cadencia de captura para samplear denso al principio y tapering al final.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PHASE_ORDER.map((phase) => {
                  const meta = PHASE_META[phase];
                  return (
                    <div key={phase} className="flex items-start gap-2 p-2 rounded border border-border/50 bg-bg-card">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${meta.bg} ${meta.text}`}>
                        {meta.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-text-secondary font-medium">
                          {meta.window} <span className="text-text-muted font-normal">· {meta.cadence}</span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-snug mt-0.5">{meta.blurb}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!livePosts ? (
            <p className="text-xs text-text-muted py-6 text-center">Loading…</p>
          ) : livePosts.length === 0 ? (
            <div className="text-center py-8 text-text-muted border border-dashed border-border rounded-lg">
              <p className="text-sm mb-1">No monitored posts yet.</p>
              <p className="text-xs">
                Publish a post from a managed account with its Unipile account_id set, and it'll appear here within 15 min.
                {accounts?.some((a) => !a.unipile_account_id) && (
                  <> You still have managed accounts without a Unipile ID configured — open "Unipile IDs" up top to set them.</>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {livePosts.slice(0, visibleLive).map((p) => (
                <LivePostRow
                  key={p.id}
                  post={p}
                  onOpenChat={() => setChatPostId(p.id)}
                  onRefreshed={refetchLive}
                  onEditMetrics={() => setEditarMetricas(p)}
                  onRemoveDemo={
                    p.content_text?.startsWith('DEMO ·')
                      ? async () => {
                          try {
                            await apiDelete('/api/accounts/demo-seed');
                            refetchLive();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }
                      : undefined
                  }
                />
              ))}
              {livePosts.length > visibleLive && (
                <button
                  onClick={() => setVisibleLive((v) => v + LIVE_PAGE)}
                  className="w-full py-2.5 text-xs font-medium text-accent hover:text-accent-light border border-border hover:border-accent/40 rounded-lg transition-colors"
                >
                  Ver más ({livePosts.length - visibleLive} restantes) ↓
                </button>
              )}
              {visibleLive > LIVE_PAGE && livePosts.length <= visibleLive && (
                <button
                  onClick={() => setVisibleLive(LIVE_PAGE)}
                  className="w-full py-2 text-[11px] text-text-muted hover:text-text-secondary transition-colors"
                >
                  Ver menos ↑
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analytics */}
      {hasAccounts && analytics && (
        <>
          {/* KPI cards with period-over-period delta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Total posts</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-2xl font-bold text-text-primary">{analytics.totals.total_posts}</div>
                <Delta pct={analytics.comparison.total_posts.delta_pct} />
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">vs previous {days}d</div>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Avg engagement</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-2xl font-bold text-accent">{fmtNum(analytics.totals.avg_engagement)}</div>
                <Delta pct={analytics.comparison.avg_engagement.delta_pct} />
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">per post</div>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Outliers</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-2xl font-bold text-diamond">
                  {analytics.totals.total_outliers}
                  <span className="text-sm text-text-muted ml-1 font-normal">({outlierRate}%)</span>
                </div>
                <Delta pct={analytics.comparison.total_outliers.delta_pct} />
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">hit rate</div>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Best post</div>
              <div className="text-2xl font-bold text-text-primary mt-1">{fmtNum(analytics.totals.max_engagement)}</div>
              <div className="text-[10px] text-text-muted mt-0.5">peak engagement</div>
            </div>
          </div>

          {/* Account-level deltas — followers + profile views over the same
              window. Both come from the daily snapshot tables (last - first).
              Profile views show as '—' when there's no Premium-backed data
              flowing in. Posts/week is a cadence sanity check — paired with
              the engagement KPIs above so you can tell whether you're
              under-posting or over-posting for the engagement you're getting. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1.5">
                <span>👥</span>
                <span>Followers gained</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className={`text-2xl font-bold ${analytics.totals.followers_gained > 0 ? 'text-green-400' : analytics.totals.followers_gained < 0 ? 'text-red-400' : 'text-text-primary'}`}>
                  {analytics.totals.followers_gained > 0 ? '+' : ''}{fmtNum(analytics.totals.followers_gained)}
                </div>
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">over {days}d (snapshot last − first)</div>
            </div>
            {/* CIFRAS OFICIALES DE LINKEDIN (Iker, 2026-09-17). El numero grande
                es el de la pagina de resumen de LinkedIn, el mismo que ve la
                persona. Van en ventana FIJA (90 dias / 7 dias), no en el rango
                elegido: LinkedIn no da otro. La reconstruccion desde la lista de
                visitantes se quedaba entre un 12% y un 24% por encima. */}
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1.5">
                <span>👁️‍🗨️</span>
                <span>Profile viewers · 90d</span>
              </div>
              <div className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
                {analytics.linkedin_oficial ? fmtNum(analytics.linkedin_oficial.profile_viewers_90d) : '—'}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">
                {analytics.linkedin_oficial
                  ? `dato de LinkedIn · leído ${fmtAge(analytics.linkedin_oficial.captured_at)}`
                  : 'aún sin lectura de LinkedIn'}
              </div>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1.5">
                <span>📈</span>
                <span>Post impressions · 7d</span>
              </div>
              <div className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
                {analytics.linkedin_oficial ? fmtNum(analytics.linkedin_oficial.post_impressions_7d) : '—'}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">
                {analytics.linkedin_oficial
                  ? `dato de LinkedIn · leído ${fmtAge(analytics.linkedin_oficial.captured_at)}`
                  : 'aún sin lectura de LinkedIn'}
              </div>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1.5">
                <span>📅</span>
                <span>Posts / week</span>
              </div>
              <div className="text-2xl font-bold text-text-primary mt-1 tabular-nums">
                {analytics.totals.posts_per_week.toFixed(1)}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">avg cadence in range</div>
            </div>
          </div>

          {/* Impressions — only shown when we have any, since LinkedIn only reports it on the authenticated account's own posts */}
          {analytics.totals.total_impressions > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-card border border-accent/30 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1.5">
                  <span>👁️</span>
                  <span>Total impressions</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="text-2xl font-bold text-accent">{fmtNum(analytics.totals.total_impressions)}</div>
                  <Delta pct={analytics.comparison.total_impressions.delta_pct} />
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  across {analytics.totals.posts_with_impressions} post{analytics.totals.posts_with_impressions === 1 ? '' : 's'} with data
                </div>
              </div>
              <div className="bg-bg-card border border-accent/30 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1.5">
                  <span>📏</span>
                  <span>Avg impressions</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="text-2xl font-bold text-accent">{fmtNum(analytics.totals.avg_impressions)}</div>
                  <Delta pct={analytics.comparison.avg_impressions.delta_pct} />
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">per post with data</div>
              </div>
            </div>
          )}

          {/* Engagement totals breakdown with deltas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wide text-text-muted text-center">Likes</div>
              <div className="flex items-baseline justify-center gap-2 mt-0.5">
                <div className="text-lg font-semibold text-text-primary">{fmtNum(analytics.totals.total_likes)}</div>
                <Delta pct={analytics.comparison.total_likes.delta_pct} />
              </div>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wide text-text-muted text-center">Comments</div>
              <div className="flex items-baseline justify-center gap-2 mt-0.5">
                <div className="text-lg font-semibold text-text-primary">{fmtNum(analytics.totals.total_comments)}</div>
                <Delta pct={analytics.comparison.total_comments.delta_pct} />
              </div>
            </div>
            <div className="bg-bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wide text-text-muted text-center">Reposts</div>
              <div className="flex items-baseline justify-center gap-2 mt-0.5">
                <div className="text-lg font-semibold text-text-primary">{fmtNum(analytics.totals.total_reposts)}</div>
                <Delta pct={analytics.comparison.total_reposts.delta_pct} />
              </div>
            </div>
          </div>

          {/* Daily engagement trend — smoothed line with publication markers */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="mb-1 flex items-start justify-between gap-3 flex-wrap">
              <h3 className="text-lg font-semibold">Engagement over time</h3>
            </div>
            <p className="text-xs text-text-muted mb-3">
              {`Impressions and engagements received in the range, like LinkedIn's Content analytics — LinkedIn's own daily figures ${selectedCreator === 'all' ? '(manual accounts: estimated by publication day) — all managed accounts' : '(this account)'}. Pencils mark the days you published.`}
            </p>
            {dailyChartData.length === 0 ? (
              <p className="text-center text-text-muted text-sm py-12">No posts in this range.</p>
            ) : (
              <AccountsEngagementChart
                data={dailyChartData}
                hasImpressions={analytics.totals.total_impressions > 0}
                previo={analytics.periodo_previo ?? null}
                xTickInterval={xTickInterval}
                creatorOrder={(accounts || [])
                  .slice()
                  .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
                  .map((a) => a.id)}
              />
            )}
          </div>

          {/* Monthly impressions — sits right after the engagement curve
              since both are "reach" views. Lifetime impressions of posts
              published that month; only managed accounts' own posts
              report impressions, which is exactly this scope. Respects
              the global date range — shows only the months that overlap
              with the selected window. */}
          <MonthlyBarChart
            endpoint="/api/accounts/impressions-monthly"
            valueKey="impressions"
            creatorId={selectedCreator === 'all' ? null : selectedCreator}
            startDate={dateRange.start}
            endDate={dateRange.end}
            includeManual={incluirManuales}
            title="Impressions per month"
            subtitle={selectedCreator === 'all'
              ? 'Impressions received each month — LinkedIn daily figures for connected accounts (manual accounts: estimated) — all managed accounts'
              : 'Impressions received each month — LinkedIn daily figures (this account)'}
            unit="impressions"
            color="#e8935a"
          />

          {/* Follower growth — net new followers per day */}
          <FollowerGrowthChart
            creatorId={selectedCreator === 'all' ? null : selectedCreator}
            startDate={dateRange.start}
            endDate={dateRange.end}
            includeManual={incluirManuales}
            reloadSignal={refreshSignal}
          />

          {/* Organic followers — new pure-follow vs connection per day. The
              metric you actually care about: people who followed you for your
              content, not because you reached out. */}
          <OrganicFollowersChart
            creatorId={selectedCreator === 'all' ? null : selectedCreator}
            days={days}
            reloadSignal={refreshSignal}
          />

          {/* Monthly followers gained — same monthly aggregation as
              impressions; also respects the global date range now so the
              whole section stays in sync with the chosen window. */}
          <MonthlyBarChart
            endpoint="/api/accounts/follower-monthly"
            valueKey="gained"
            creatorId={selectedCreator === 'all' ? null : selectedCreator}
            startDate={dateRange.start}
            endDate={dateRange.end}
            includeManual={incluirManuales}
            title="New followers per month"
            subtitle={selectedCreator === 'all'
              ? 'New followers each month — LinkedIn daily figures for connected accounts — all managed accounts'
              : 'New followers each month — LinkedIn daily figures (this account)'}
            unit="followers"
            color="#34d399"
            signed
          />

          {/* Profile views — same daily-snapshot pattern, sourced from
              LinkedIn's WVMP feed via Unipile. Surfaces 24h / 7d / range
              deltas so the user sees how visits trend, not just the
              absolute. Requires Premium / Sales Nav to return real data. */}
          <ProfileViewChart
            creatorId={selectedCreator === 'all' ? null : selectedCreator}
            startDate={dateRange.start}
            endDate={dateRange.end}
            days={days}
            reloadSignal={refreshSignal}
          />

          {/* Format mix + Best hooks share one row — both are compact
              "what's working" breakdowns. The previous Publication
              cadence chart was dropped: when/where posts went out is
              already visible via the pencil markers on the Engagement
              chart, so the bar chart was redundant. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Format mix */}
          {formatChartData.length > 0 && (
            <div className="bg-bg-card border border-border rounded-xl p-5">
              <div className="mb-3">
                <h3 className="text-lg font-semibold">Content format mix</h3>
                <p className="text-xs text-text-muted mt-0.5">Posts per content type · hover for avg engagement</p>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(180, formatChartData.length * 48)}>
                <BarChart data={formatChartData} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#2e3348' }}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(232,147,90,0.05)' }}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(_v: any, _n: any, entry: any) => {
                      const row = entry?.payload;
                      return [
                        `${row.count} posts · avg ${fmtNum(row.avg_engagement)} · ${row.outliers} outliers`,
                        row.label,
                      ];
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#9ca3af', fontSize: 11 }}>
                    {formatChartData.map((r) => (
                      <Cell key={r.content_type} fill={r.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hook types */}
          {analytics.hook_types.length > 0 && (
            <div className="bg-bg-card border border-border rounded-xl p-5">
              <div className="mb-3">
                <h3 className="text-lg font-semibold">Best-performing hooks</h3>
                <p className="text-xs text-text-muted mt-0.5">Avg engagement by hook type · longer = better</p>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(180, analytics.hook_types.length * 40)}>
                <BarChart data={analytics.hook_types} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="hook_type"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={{ stroke: '#2e3348' }}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(232,147,90,0.05)' }}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(_v: any, _n: any, entry: any) => {
                      const row = entry?.payload;
                      return [`avg ${fmtNum(row.avg_engagement)} · ${row.count} posts`, row.hook_type];
                    }}
                  />
                  <Bar dataKey="avg_engagement" fill="#e8935a" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#9ca3af', fontSize: 11, formatter: (v: any) => fmtCompact(v) }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          </div>{/* /two-column grid */}

          {/* Per-account comparison */}
          {!selectedCreator || selectedCreator === 'all' ? (
            analytics.per_account.length > 0 && (
              <div className="bg-bg-card border border-border rounded-xl p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Per-account breakdown</h3>
                  <p className="text-xs text-text-muted">Compare accounts side by side</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-muted text-xs border-b border-border">
                        <th className="py-2 pr-3">Account</th>
                        <th className="py-2 px-3 text-right">Posts</th>
                        <th className="py-2 px-3 text-right">Outliers</th>
                        <th className="py-2 px-3 text-right">Hit rate</th>
                        <th className="py-2 px-3 text-right">Avg eng</th>
                        <th className="py-2 px-3 text-right" title="Average engagement / creator average">Avg ×</th>
                        <th className="py-2 px-3 text-right" title="Best single post's multiplier">Peak ×</th>
                        <th className="py-2 px-3 text-right">Impressions</th>
                        <th className="py-2 pl-3 text-right">Avg impressions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.per_account.map((a) => {
                        const rate = a.posts > 0 ? Math.round((a.outliers / a.posts) * 100) : 0;
                        return (
                          <tr key={a.id} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-2">
                                {a.profile_image_url ? (
                                  <img src={a.profile_image_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-bg-primary flex items-center justify-center text-text-muted text-xs">
                                    {(a.name || '?')[0]}
                                  </div>
                                )}
                                <span className="text-text-primary">{nombreCuenta(a.name)}</span>
                                {/* Sin esto, una fila de 1 post y 8 likes se lee
                                    igual que la de un jefe con 40 posts, y el
                                    avg_virality de 1.00x parece un mal dato en
                                    vez de lo que es: no hay base con la que
                                    comparar todavia. */}
                                {a.is_manual && (
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[10px] font-medium"
                                    title="Cuenta no conectada a Unipile: sus posts se añaden a mano y las impresiones las escribe el usuario."
                                  >
                                    manual
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right text-text-primary">{a.posts}</td>
                            <td className="py-2 px-3 text-right text-diamond">{a.outliers}</td>
                            <td className="py-2 px-3 text-right text-text-secondary">{rate}%</td>
                            <td className="py-2 px-3 text-right text-accent font-semibold">{fmtNum(a.avg_engagement)}</td>
                            <td className="py-2 px-3 text-right text-text-secondary">{a.avg_virality ? `${a.avg_virality.toFixed(2)}x` : '—'}</td>
                            <td className="py-2 px-3 text-right text-diamond font-medium">{a.max_virality ? `${a.max_virality.toFixed(1)}x` : '—'}</td>
                            <td className="py-2 px-3 text-right text-text-secondary">{a.total_impressions ? fmtNum(Number(a.total_impressions)) : '—'}</td>
                            <td className="py-2 pl-3 text-right text-text-secondary">{a.avg_impressions ? fmtNum(a.avg_impressions) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : null}

          {/* Top posts */}
          {analytics.top_posts.length > 0 && (
            <div className="bg-bg-card border border-border rounded-xl p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">
                  Top posts
                  <span className="text-text-muted text-sm font-normal ml-2">
                    ({filteredTopPosts.length}{hayFiltrosTop(topFiltros) ? ` of ${analytics.top_posts.length}` : ''})
                  </span>
                </h3>
                <p className="text-xs text-text-muted">
                  {ORDENES_TOP.find((o) => o.valor === topFiltros.orden)?.descripcion}
                </p>
                {/* Cuatro desplegables por categoria, como en una tienda de ropa
                    (Iker, 2026-10-06). Ordenar por y Enlace son de una opcion;
                    Pilar y Formato admiten varias (O dentro de la categoria, Y
                    entre categorias). Los recuentos son facetados: lo que
                    quedaria al marcar esa opcion con los demas filtros puestos. */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <FiltroDesplegable
                    etiqueta="Ordenar por"
                    multiple={false}
                    opciones={ORDENES_TOP.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta, grupo: o.grupo }))}
                    seleccion={[topFiltros.orden]}
                    onChange={([v]) => setTopFiltros({ orden: v as OrdenTop })}
                  />
                  <FiltroDesplegable
                    etiqueta="Pilar"
                    multiple
                    opciones={opcionesPilar}
                    seleccion={topFiltros.pilares}
                    onChange={(v) => setTopFiltros({ pilares: v })}
                  />
                  {opcionesFormato.length > 1 && (
                    <FiltroDesplegable
                      etiqueta="Formato"
                      multiple
                      opciones={opcionesFormato}
                      seleccion={topFiltros.formatos}
                      onChange={(v) => setTopFiltros({ formatos: v })}
                    />
                  )}
                  <FiltroDesplegable
                    etiqueta="Enlace"
                    multiple={false}
                    valorNeutro="todos"
                    opciones={ENLACE_OPCIONES.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta, recuento: topRecuentos.enlace[o.valor] }))}
                    seleccion={[topFiltros.enlace]}
                    onChange={([v]) => setTopFiltros({ enlace: v as FiltroEnlace })}
                  />
                </div>
                {hayFiltrosTop(topFiltros) && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2 text-[11px]">
                    <span className="text-text-muted">Filtros:</span>
                    {topFiltros.pilares.map((slug) => (
                      <button
                        key={`pil-${slug}`}
                        onClick={() => setTopFiltros({ pilares: topFiltros.pilares.filter((x) => x !== slug) })}
                        className="px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20"
                        title="Quitar este filtro"
                      >
                        Pilar: {etiquetaPilar(slug)} ×
                      </button>
                    ))}
                    {topFiltros.formatos.map((t) => (
                      <button
                        key={`fmt-${t}`}
                        onClick={() => setTopFiltros({ formatos: topFiltros.formatos.filter((x) => x !== t) })}
                        className="px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20"
                        title="Quitar este filtro"
                      >
                        Formato: {FORMAT_LABELS[t] || t} ×
                      </button>
                    ))}
                    {topFiltros.enlace !== 'todos' && (
                      <button
                        onClick={() => setTopFiltros({ enlace: 'todos' })}
                        className="px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20"
                        title="Quitar este filtro"
                      >
                        {topFiltros.enlace === 'con' ? 'Con enlace' : 'Sin enlace'} ×
                      </button>
                    )}
                    <button
                      onClick={() => setTopFiltros({ pilares: [], formatos: [], enlace: 'todos' })}
                      className="ml-1 text-text-muted hover:text-text-primary underline-offset-2 hover:underline"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>
              {filteredTopPosts.length === 0 ? (
                <p className="text-text-muted text-sm">No posts match this filter.</p>
              ) : (
                <div className="space-y-2">
                  {filteredTopPosts.slice(0, visibleTop).map((p) => (
                    <TopPostRow
                      key={p.id}
                      post={p}
                      destacar={topFiltros.orden === 'ctr' ? 'ctr' : topFiltros.orden === 'outlier_ratio' ? 'outlier' : null}
                    />
                  ))}
                  {filteredTopPosts.length > visibleTop && (
                    <button
                      onClick={() => setVisibleTop((v) => v + TOP_PAGE)}
                      className="w-full py-2.5 text-xs font-medium text-accent hover:text-accent-light border border-border hover:border-accent/40 rounded-lg transition-colors"
                    >
                      Ver más ({filteredTopPosts.length - visibleTop} restantes) ↓
                    </button>
                  )}
                  {visibleTop > TOP_PAGE && filteredTopPosts.length <= visibleTop && (
                    <button
                      onClick={() => setVisibleTop(TOP_PAGE)}
                      className="w-full py-2 text-[11px] text-text-muted hover:text-text-secondary transition-colors"
                    >
                      Ver menos ↑
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {loadingAnalytics && hasAccounts && (
        <p className="text-center text-text-muted text-sm py-4">Loading analytics…</p>
      )}

      </>)}

      {chatPostId && (
        <GoogleChatModal postId={chatPostId} onClose={() => setChatPostId(null)} />
      )}

      {modalManual && (
        <AddManualPostModal
          onClose={() => setModalManual(false)}
          onSaved={() => {
            refetchLive();
            refetchAccounts();
            refetchAnalytics();
            setRefreshSignal((s) => s + 1);
          }}
        />
      )}

      {editarMetricas && (
        <AddManualPostModal
          editarPostId={editarMetricas.id}
          nombreCuenta={nombreCuenta(editarMetricas.creator_name)}
          valoresIniciales={{
            impressions_count: editarMetricas.impressions_count ?? null,
            profile_viewers_count: editarMetricas.profile_viewers_count ?? null,
            followers_gained_count: editarMetricas.followers_gained_count ?? null,
            link_clicks_count: editarMetricas.link_clicks_count ?? null,
            premium_button_clicks: editarMetricas.premium_button_clicks ?? null,
            saves_count: editarMetricas.saves_count ?? null,
            sends_count: editarMetricas.sends_count ?? null,
          }}
          onClose={() => setEditarMetricas(null)}
          onSaved={() => {
            refetchLive();
            refetchAnalytics();
            setRefreshSignal((s) => s + 1);
          }}
        />
      )}
    </div>
  );
}

function minutesSince(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

// Tooltip de la chapa "N snaps · Xd ago". La edad que se pinta es la de la
// ULTIMA actualizacion del post: snapshot (primeros 7 dias) o lectura del
// pase de contadores (diario hasta 90 dias, semanal despues). Antes se
// pintaba solo la del snapshot y un post releido ayer decia "77d ago".
function fmtActualizacion(post: { snapshot_count: number; last_snapshot_at: string | null; readings_count: number; last_reading_at: string | null }): string {
  const ultima = post.last_reading_at || post.last_snapshot_at;
  if (!ultima) return 'No captures yet';
  const partes = [`Counters last updated ${fmtAge(ultima)}`];
  if (post.last_snapshot_at) partes.push(`${post.snapshot_count} snapshots in the first 7 days (last ${fmtAge(post.last_snapshot_at)})`);
  if (post.readings_count > 0) partes.push(`${post.readings_count} later readings (daily until day 90, weekly after)`);
  return partes.join(' · ');
}

function fmtAge(iso: string): string {
  const m = minutesSince(iso);
  if (m < 60) return `${m}m ago`;
  const h = m / 60;
  if (h < 24) return `${h.toFixed(1)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// Absolute date+time for the post's PUBLICATION timestamp — the user
// asked for the exact moment a post went up instead of the previous
// "7d ago" relative format, which was useless for any planning or
// "when exactly did we publish that" recall. Snapshot ages keep the
// relative `fmtAge` formatting (there "2h ago" is more useful than a
// raw timestamp for spotting fresh / stale captures). Compact format:
// day + abbreviated month + HH:mm; year is added only when the post
// isn't from the current year so recent posts stay short and readable.
function fmtPublishedAt(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Shared snapshot chart — works for any post with captured data (live or historical).
// Fetches `/api/accounts/posts/:id/snapshots` lazily; auto-refreshes every 2 min while live.
function SnapshotCurve({ postId, publishedAt, autoRefresh }: { postId: string; publishedAt: string; autoRefresh?: boolean }) {
  const [zoomMax, setZoomMax] = useState<number | null>(null);
  const { data, loading, refetch } = useApi<SnapshotsResponse>(`/api/accounts/posts/${postId}/snapshots`);
  // Cuenta sin Unipile conectado: las impresiones solo existen donde alguien
  // las copio a mano, y eso cambia como se pintan los puntos.
  const isManualPost = !!data?.post?.creator_is_manual;

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => refetch(), 2 * 60 * 1000);
    return () => clearInterval(timer);
  }, [autoRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge this post's snapshots with the creator's typical percentile curve.
  // The X axis covers only THIS post's lifespan (0 → latest snapshot). For
  // each snapshot we linearly interpolate the typical percentiles from the
  // creator's other-post buckets — so wherever we actually have comparable
  // data, the gray band sits directly under the blue/orange curve.
  //
  // We deliberately do NOT synthesise a (0, 0, 0) anchor nor extend the
  // axis past the latest snapshot: if the creator's other posts were
  // already a few days old when monitoring began, their buckets only cover
  // late ages (e.g. 125–156h) — interpolating across that gap to 0 would
  // fabricate a typical curve we don't really have. Better to show no band
  // than a misleading one; the legend chip reflects that state.
  const curveDataAll = useMemo(() => {
    if (!data) return [];
    const publishedMs = new Date(publishedAt).getTime();
    const typicalSorted = (data.typical || []).slice().sort((a, b) => a.ageMin - b.ageMin);
    // Impresiones y engagement van por separado: un tramo puede tener banda de
    // engagement y no de impresiones (menos de 2 posts con lectura a esa edad).
    const impBuckets = typicalSorted.filter((b) => b.p25Imp != null && b.p75Imp != null);
    const engBuckets = typicalSorted.filter((b) => b.p25Eng != null && b.p75Eng != null);

    const bandAt = (
      age: number,
      buckets: TypicalBucket[],
      p25: (b: TypicalBucket) => number,
      p75: (b: TypicalBucket) => number,
      n: (b: TypicalBucket) => number
    ): { range: [number, number]; n: number } | null => {
      if (buckets.length === 0) return null;
      // Only interpolate WITHIN the real bucket range; outside → null (no
      // band drawn). This is what keeps the band honest when there's no
      // overlap between other posts' buckets and this post's age range.
      if (age < buckets[0].ageMin || age > buckets[buckets.length - 1].ageMin) return null;
      let lo = buckets[0];
      let hi = buckets[buckets.length - 1];
      for (let i = 0; i < buckets.length - 1; i++) {
        if (buckets[i].ageMin <= age && age <= buckets[i + 1].ageMin) {
          lo = buckets[i];
          hi = buckets[i + 1];
          break;
        }
      }
      if (lo.ageMin === hi.ageMin) return { range: [p25(lo), p75(lo)], n: n(lo) };
      const t = (age - lo.ageMin) / (hi.ageMin - lo.ageMin);
      return {
        range: [
          Math.round(p25(lo) + (p25(hi) - p25(lo)) * t),
          Math.round(p75(lo) + (p75(hi) - p75(lo)) * t),
        ],
        n: Math.max(n(lo), n(hi)),
      };
    };

    const mine = data.snapshots.map((s) => {
      const ageMin = Math.max(0, Math.round((new Date(s.captured_at).getTime() - publishedMs) / 60000));
      const imp = bandAt(ageMin, impBuckets, (b) => b.p25Imp as number, (b) => b.p75Imp as number, (b) => b.sampleCountImp ?? b.sampleCount);
      const eng = bandAt(ageMin, engBuckets, (b) => b.p25Eng as number, (b) => b.p75Eng as number, (b) => b.sampleCount);
      const likes = s.likes_chart !== undefined ? s.likes_chart : s.likes_count;
      const comments = s.comments_chart !== undefined ? s.comments_chart : s.comments_count;
      const reposts = s.reposts_chart !== undefined ? s.reposts_chart : s.reposts_count;
      return {
        ageMin,
        label: ageMin < 60 ? `${ageMin}m` : `${(ageMin / 60).toFixed(1)}h`,
        // Nunca `?? 0`: un snapshot sin lectura no es un post con 0 impresiones.
        // Pintarlo como 0 fue lo que obligo a arrastrar la ultima cifra manual,
        // y eso dibujaba mesetas y acantilados en las cuentas manuales.
        impressions: s.impressions_chart !== undefined ? s.impressions_chart : s.impressions_count,
        impressionsEstimated: !!s.impressions_estimated,
        likes,
        comments,
        reposts,
        // Same engagement formula as the rest of the app (likes + 2·comments + 3·reposts).
        // Null cuando el snapshot era una copia sin lectura despues.
        engagement: likes == null ? null : likes + (comments ?? 0) * 2 + (reposts ?? 0) * 3,
        engagementEstimated: !!s.counters_estimated,
        // Snapshot que alguien añadio a mano (alta o "Añadir métricas"): en una
        // cuenta manual, el unico que trae una lectura de impresiones.
        manualSnapshot: isManualPost && s.impressions_chart != null && !s.impressions_estimated,
        typicalImpRange: imp?.range ?? null,
        typicalImpSampleCount: imp?.n ?? null,
        typicalEngRange: eng?.range ?? null,
        typicalEngSampleCount: eng?.n ?? null,
      };
    });

    return mine.sort((a, b) => a.ageMin - b.ageMin);
  }, [data, publishedAt, isManualPost]);

  const curveData = useMemo(
    () => (zoomMax === null ? curveDataAll : curveDataAll.filter((d) => d.ageMin <= zoomMax)),
    [curveDataAll, zoomMax]
  );
  const hasSnapshots = (data?.snapshots?.length || 0) > 0;
  const hasTypical = (data?.typical?.length || 0) > 0;
  // Does the typical band actually overlap with this post's age range?
  // If yes, we render the gray shadow under the curves; if no (e.g. the
  // post is 20h old but the creator's other posts only have buckets at
  // 125h+), we hide the band and tell the user why in the chip.
  const hasImpOverlap = curveDataAll.some((d) => d.typicalImpRange != null);
  const hasEngOverlap = curveDataAll.some((d) => d.typicalEngRange != null);
  // PUNTOS FIJOS EN CADA SNAPSHOT MANUAL (Iker, 2026-10-05). Solo en posts
  // manuales: ahi la linea entre dos lecturas es estimada y hace falta ver
  // donde estan las de verdad. En las conectadas cada snapshot es una lectura
  // y 30 puntos solo ensuciarian. Es el mismo punto que pinta Recharts al pasar
  // el raton (activeDot: color de la linea con borde blanco), para que se lea
  // igual. Sin valor en ese snapshot (copia sin lectura despues), sin punto.
  const manualDot = (color: string, metric: 'impressions' | 'engagement') => (props: any) =>
    props.payload?.manualSnapshot && props.payload?.[metric] != null && props.cy != null ? (
      <circle key={`${metric}-dot-${props.index}`} cx={props.cx} cy={props.cy} r={4} fill={color} stroke="#fff" strokeWidth={2} />
    ) : (
      <g key={`${metric}-dot-${props.index}`} />
    );
  const manualDotChip = (color: string, label: string) => (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-text-muted"
      title="Each dot is a snapshot added by hand (when the post was added or from ⋮ → Añadir métricas). Impressions are only known there; between two dots the blue line is an estimate: half linear in time, half following this post's likes."
    >
      <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: color }} /> {label}
    </span>
  );
  // Cuenta manual sin ninguna lectura todavia: antes salia una linea plana en 0
  // (falso) y ahora saldria una grafica vacia; mejor decir que falta y donde.
  const hasAnyImp = curveDataAll.some((d) => d.impressions != null);
  const maxAgeMin = hasSnapshots
    ? Math.max(0, ...data!.snapshots.map((s) => Math.round((new Date(s.captured_at).getTime() - new Date(publishedAt).getTime()) / 60000)))
    : 0;

  if (loading && !data) {
    return <p className="text-xs text-text-muted py-6 text-center">Loading snapshots…</p>;
  }
  if (!hasSnapshots) {
    return (
      <p className="text-xs text-text-muted py-6 text-center">
        No snapshot data for this post. Only posts monitored during their first 7 days have captures.
      </p>
    );
  }

  const snapshotCount = data?.snapshots.length || 0;
  // Todos los snapshots del zoom, tengan lectura de impresiones o no: el
  // engagement se pinta igual.
  const snapshotsInView = curveData.length;

  const xAxisProps = {
    dataKey: 'ageMin' as const,
    type: 'number' as const,
    domain: [0, 'dataMax'] as [number, string],
    tick: { fill: '#9ca3af', fontSize: 11 },
    axisLine: { stroke: '#2e3348' },
    tickFormatter: (v: number) => (v < 60 ? `${v}m` : `${(v / 60).toFixed(0)}h`),
  };

  const referenceLines = [
    { x: 60, label: '1h' },
    { x: 6 * 60, label: '6h' },
    { x: 24 * 60, label: '24h' },
    { x: 72 * 60, label: '72h' },
  ].filter((ref) => (zoomMax === null ? true : ref.x <= zoomMax));

  const typicalBandChip = (metricLabel: string, hasOverlap: boolean) =>
    hasTypical && hasOverlap ? (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-text-muted"
        title={`Typical ${metricLabel} for this creator's other posts at the same age (p25–p75)`}
      >
        <span className="inline-block w-3 h-2 rounded-sm bg-slate-500/30 border border-slate-500/50" />
        typical {metricLabel} p25–p75
      </span>
    ) : hasTypical ? (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-text-muted/70"
        title={`The creator's other monitored posts only have snapshots at later ages than this post — no comparable typical ${metricLabel} value yet for this post's current age range.`}
      >
        <span className="inline-block w-3 h-2 rounded-sm border border-slate-500/40" />
        typical {metricLabel} not yet available
      </span>
    ) : null;

  return (
    <>
      {/* Shared controls + zoom for both charts below */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        <span className="text-[10px] text-text-muted mr-1">Zoom:</span>
        {ZOOM_PRESETS.map((z) => {
          const dimmed = z.maxMin !== null && z.maxMin > maxAgeMin;
          const active = zoomMax === z.maxMin;
          return (
            <button
              key={z.label}
              onClick={() => setZoomMax(z.maxMin)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                active
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'bg-bg-secondary text-text-muted border border-border hover:border-accent/30'
              } ${dimmed ? 'opacity-40' : ''}`}
            >
              {z.label}
            </button>
          );
        })}
        <span className="text-[10px] text-text-muted ml-2">
          {snapshotsInView} of {snapshotCount} snapshot{snapshotCount === 1 ? '' : 's'}
        </span>
      </div>

      {snapshotsInView === 0 ? (
        <p className="text-xs text-text-muted py-6 text-center">No snapshots in this window.</p>
      ) : (
        <div className="space-y-5">
          {/* Impressions: this post vs typical impressions for the creator */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <p className="text-[11px] text-text-muted">
                <span className="text-sky-400 font-semibold">Impressions</span> · this post vs typical impressions at the same age
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                  <span className="w-3 h-[2px] bg-sky-400" /> this post
                </span>
                {isManualPost && manualDotChip('#38bdf8', 'manual snapshot · line between = estimate')}
                {typicalBandChip('impressions', hasImpOverlap)}
              </div>
            </div>
            {!hasAnyImp ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No impressions reading yet. Add them from ⋮ → Añadir métricas; between two readings the curve is estimated.
              </p>
            ) : (
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={curveData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id={`liveImp-${postId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
                <XAxis {...xAxisProps} />
                <YAxis tick={{ fill: '#7dd3fc', fontSize: 11 }} axisLine={{ stroke: '#2e3348' }} tickFormatter={(v) => fmtCompact(Number(v))} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  content={({ active, payload }: any) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const p = payload[0].payload;
                    return (
                      <div style={CHART_TOOLTIP_STYLE} className="p-2">
                        <div className="text-text-secondary text-[11px] mb-1">+{p.label} since publish</div>
                        {p.manualSnapshot && <div className="text-text-muted text-[10px] mb-1">● manual snapshot</div>}
                        {p.impressions != null && !p.impressionsEstimated && (
                          <div className="text-sky-400 text-xs">👁️ {fmtNum(p.impressions)} impressions</div>
                        )}
                        {p.impressions != null && p.impressionsEstimated && (
                          <>
                            <div className="text-sky-400 text-xs">👁️ ≈ {fmtNum(p.impressions)} impressions</div>
                            <div className="text-text-muted text-[10px]">estimate between two readings</div>
                          </>
                        )}
                        {p.impressions == null && (
                          <div className="text-text-muted text-[11px]">👁️ no impressions reading here</div>
                        )}
                        {p.typicalImpRange && (
                          <div className="text-slate-400 text-[11px] mt-1 pt-1 border-t border-slate-500/30">
                            Typical at this age ({p.typicalImpSampleCount} post{p.typicalImpSampleCount === 1 ? '' : 's'}):<br />
                            👁️ {fmtNum(p.typicalImpRange[0])}–{fmtNum(p.typicalImpRange[1])}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                {referenceLines.map((ref) => (
                  <ReferenceLine
                    key={ref.x}
                    x={ref.x}
                    stroke="#4b5563"
                    strokeDasharray="2 2"
                    label={{ value: ref.label, fill: '#6b7280', fontSize: 10, position: 'top' }}
                  />
                ))}
                {hasImpOverlap && (
                  <Area
                    type="monotone"
                    dataKey="typicalImpRange"
                    stroke="none"
                    fill="#64748b"
                    fillOpacity={0.22}
                    connectNulls
                    activeDot={false}
                    isAnimationActive={false}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="impressions"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill={`url(#liveImp-${postId})`}
                  connectNulls
                  dot={isManualPost ? manualDot('#38bdf8', 'impressions') : false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            )}
          </div>

          {/* Engagement: this post vs typical engagement for the creator */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <p className="text-[11px] text-text-muted">
                <span className="text-accent font-semibold">Engagement</span> · likes + comments×2 + reposts×3, vs typical engagement at the same age
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                  <span className="w-3 h-[2px] bg-accent" /> this post
                </span>
                {isManualPost && manualDotChip('#e8935a', 'manual snapshot')}
                {typicalBandChip('engagement', hasEngOverlap)}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={curveData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id={`liveEng-${postId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e8935a" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e8935a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
                <XAxis {...xAxisProps} />
                <YAxis tick={{ fill: '#e8935a', fontSize: 11 }} axisLine={{ stroke: '#2e3348' }} tickFormatter={(v) => fmtCompact(Number(v))} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  content={({ active, payload }: any) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const p = payload[0].payload;
                    return (
                      <div style={CHART_TOOLTIP_STYLE} className="p-2">
                        <div className="text-text-secondary text-[11px] mb-1">+{p.label} since publish</div>
                        {p.manualSnapshot && <div className="text-text-muted text-[10px] mb-1">● manual snapshot</div>}
                        {p.engagement == null ? (
                          <div className="text-text-muted text-[11px]">no engagement reading here</div>
                        ) : (
                          <>
                            <div className="text-accent text-xs font-medium">
                              {p.engagementEstimated ? '≈ ' : ''}{fmtNum(p.engagement)} engagement
                            </div>
                            <div className="text-text-muted text-[11px]">
                              {p.likes} likes · {p.comments} comments · {p.reposts} reposts
                            </div>
                            {p.engagementEstimated && (
                              <div className="text-text-muted text-[10px]">estimate: counters weren't read at this moment</div>
                            )}
                          </>
                        )}
                        {p.typicalEngRange && (
                          <div className="text-slate-400 text-[11px] mt-1 pt-1 border-t border-slate-500/30">
                            Typical at this age ({p.typicalEngSampleCount} post{p.typicalEngSampleCount === 1 ? '' : 's'}):<br />
                            {fmtNum(p.typicalEngRange[0])}–{fmtNum(p.typicalEngRange[1])}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                {referenceLines.map((ref) => (
                  <ReferenceLine
                    key={ref.x}
                    x={ref.x}
                    stroke="#4b5563"
                    strokeDasharray="2 2"
                    label={{ value: ref.label, fill: '#6b7280', fontSize: 10, position: 'top' }}
                  />
                ))}
                {hasEngOverlap && (
                  <Area
                    type="monotone"
                    dataKey="typicalEngRange"
                    stroke="none"
                    fill="#64748b"
                    fillOpacity={0.22}
                    connectNulls
                    activeDot={false}
                    isAnimationActive={false}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="#e8935a"
                  strokeWidth={2}
                  fill={`url(#liveEng-${postId})`}
                  connectNulls
                  dot={isManualPost ? manualDot('#e8935a', 'engagement') : false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}

// Menu de tres puntos de cada post de Live Posts (Iker, 2026-08-07).
//
// Nace de un caso repetido: Iker borra un post en LinkedIn —el del evento sin el
// OK de los mencionados, el lead magnet capado— y la tarjeta se queda colgada en
// el panel. Hasta ahora tenia que pedirmelo y yo lo quitaba por SQL.
//
// Ocultar NO borra la fila: solo la saca de la vista. Las metricas y los
// snapshots se conservan, que es justo lo que no queria perder.
//
// Confirmacion obligatoria, porque el boton vive pegado a las chapas de pilar y
// de multiplicador y un clic sin querer es facil.
// "Añadir métricas" vive AQUI DENTRO desde el 20/08 (Iker). Estaba suelto en la
// cabecera, en gris y sin borde, asi que parecia una etiqueta y no un boton: se
// podia pulsar y nadie lo pulsaba. Un menu es el sitio de las acciones raras.
function PostMenu({ post, onHidden, onEditMetrics }: {
  post: LivePost; onHidden?: () => void; onEditMetrics?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Cerrar al hacer clic fuera: sin esto el menu se queda abierto al pinchar en
  // otra tarjeta y acabas con varios abiertos a la vez.
  useEffect(() => {
    if (!open) return;
    const cerrar = () => setOpen(false);
    document.addEventListener('click', cerrar);
    return () => document.removeEventListener('click', cerrar);
  }, [open]);

  const ocultar = async () => {
    if (!confirm(
      '¿Ocultar esta publicación del panel?\n\n' +
      'Se quita de Live Posts pero NO se borra: las métricas y el histórico se conservan.\n' +
      'Úsalo cuando hayas borrado el post en LinkedIn.'
    )) return;
    setBusy(true);
    try {
      await apiPost(`/api/accounts/posts/${post.id}/hide`, {});
      setOpen(false);
      onHidden?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-1.5 py-1 rounded text-text-muted hover:text-text-secondary hover:bg-bg-secondary transition-colors leading-none"
        title="Más acciones"
        aria-label="Más acciones"
      >
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[15rem] rounded-lg border border-border bg-bg-card shadow-lg py-1">
          {/* PRIMERO, y solo en las cuentas no conectadas: es la accion que se
              usa a diario en esos posts. Ocultar es la excepcional. */}
          {post.creator_is_manual && onEditMetrics && (
            <button
              onClick={() => { setOpen(false); onEditMetrics(); }}
              className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-bg-secondary"
            >
              Añadir métricas
              <span className="block text-[10px] text-text-muted mt-0.5 whitespace-nowrap">
                Impresiones y clics de la cuenta.
              </span>
            </button>
          )}
          <button
            onClick={ocultar}
            disabled={busy}
            className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-bg-secondary disabled:opacity-50"
          >
            {busy ? 'Ocultando…' : 'Ocultar del panel'}
            {/* Una linea y corta: con "No pierde métricas" detras partia en dos
                y el menu parecia un parrafo. Eso lo dice igual la confirmacion,
                que es donde de verdad hace falta el aviso. */}
            <span className="block text-[10px] text-text-muted mt-0.5 whitespace-nowrap">
              Si ya lo borraste en LinkedIn.
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function LivePostRow({ post, onRemoveDemo, onOpenChat, onRefreshed, onEditMetrics }: { post: LivePost; onRemoveDemo?: () => void; onOpenChat?: () => void; onRefreshed?: () => void; onEditMetrics?: () => void }) {
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const r = await apiPost<{ ok: boolean; reason?: string; engagement?: number; impressions?: number | null }>(
        `/api/accounts/posts/${post.id}/refresh`,
        {}
      );
      if (r.ok) {
        const eng = typeof r.engagement === 'number' ? r.engagement : null;
        const imp = r.impressions;
        // Surface the impressions value too: when LinkedIn doesn't return
        // impressions for a post (Unipile gives back 0/null), we still write
        // the snapshot so engagement keeps tracking. Showing 'imp 0' makes
        // it clear that's coming from upstream, not a refresh-button bug.
        const parts: string[] = [];
        if (eng != null) parts.push(`${fmtNum(eng)} eng`);
        if (imp != null) parts.push(`${fmtNum(imp)} imp`);
        setRefreshMsg(parts.length > 0 ? `✓ ${parts.join(' · ')}` : '✓ refreshed');
        onRefreshed?.();
      } else {
        setRefreshMsg(`✗ ${r.reason || 'failed'}`);
      }
    } catch (err: any) {
      setRefreshMsg(`✗ ${err.message}`);
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(null), 6000);
    }
  };

  return (
    <div className={`rounded-lg border ${post.is_live ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-bg-primary'}`}>
      <div className="flex items-start gap-3 p-3">
        {post.creator_image ? (
          <img src={post.creator_image} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-text-muted text-xs flex-shrink-0">
            {(post.creator_name || '?')[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* Cabecera: a la izquierda quien y cuando; a la derecha, en grande,
              PILAR + multiplicador — misma jerarquia visual que las tarjetas de
              "Top posts", para que las dos secciones se lean igual (Iker,
              2026-07-27). La chapa de FASE (hot/tail/...) se quito: nadie la
              miraba y daba una precision que no tenemos. */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap min-w-0">
              <span className="text-text-secondary font-medium">{nombreCuenta(post.creator_name)}</span>
              {/* Cuenta no conectada a Unipile: lo publico se extrajo de la URL
                  y lo privado lo escribe el usuario. El badge existe para que
                  nadie lea un 0 de impresiones como "no funciono" cuando en
                  realidad es "nadie lo ha copiado todavia". */}
              {post.creator_is_manual && (
                <span
                  className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[10px] font-medium"
                  title="Cuenta no conectada a Unipile. Los contadores publicos se leen solos; las impresiones y los clics los escribes tu."
                >
                  manual
                </span>
              )}
              <span>·</span>
              <span title={new Date(post.published_at).toLocaleString()}>{fmtPublishedAt(post.published_at)}</span>
              <span
                className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border text-text-muted text-[10px]"
                title={fmtActualizacion(post)}
              >
                {post.snapshot_count} snap{post.snapshot_count === 1 ? '' : 's'}
                {(post.last_reading_at || post.last_snapshot_at) && (
                  <span className="ml-1 opacity-60">· {fmtAge((post.last_reading_at || post.last_snapshot_at) as string)}</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* "metricas" ya no vive aqui: era texto gris sin borde entre dos
                  chapas, asi que se leia como una etiqueta y no como algo que se
                  pulsa (Iker, 2026-08-20). Ahora es la primera opcion del menu. */}
              <PostMenu post={post} onHidden={onRefreshed} onEditMetrics={onEditMetrics} />
              <PilarSelector postId={post.id} pillar={post.pillar} />
              {/* CTR a la izquierda del multiplicador (Iker, 2026-07-29): el ojo
                  lee de izquierda a derecha y lo ultimo que ve es lo que se le
                  queda, asi que el outlier va el mas a la derecha y en grande.
                  El CTR solo sale si el post llevaba enlace. */}
              {ctrPct(post) != null && (
                <span
                  className="px-2 py-1 rounded text-xs font-medium tabular-nums bg-bg-secondary border border-border text-text-secondary"
                  title={`Tasa de clics: ${post.link_clicks_count} clics sobre ${fmtNum(post.impressions_count ?? 0)} impresiones`}
                >
                  {ctrPct(post)!.toFixed(2)}% CTR
                </span>
              )}
              {post.outlier_ratio != null && (
                <span
                  className={`px-2.5 py-1 rounded text-sm font-semibold tabular-nums ${
                    post.is_outlier
                      ? 'bg-diamond/15 text-diamond ring-1 ring-diamond/40'
                      : 'bg-bg-secondary border border-border text-text-muted'
                  }`}
                  title="Engagement relative to this creator's average"
                >
                  {post.outlier_ratio.toFixed(1)}x
                </span>
              )}
            </div>
          </div>
          <ExpandablePostText text={post.content_text || post.hook_text} />
          {!NO_MEDIA_TYPES.has(post.content_type) && (
            <div className="mt-2">
              <MediaViewer postId={post.id} contentType={post.content_type} linkedinUrl={post.post_url} />
            </div>
          )}
          {/* Franja de metricas. Iconos calcados de LinkedIn (mismo glifo, mismo
              significado) para los conceptos que TIENEN icono propio alli: asi no
              hay que leer, se reconocen. Los dos que LinkedIn NO iconiza
              —seguidores y visitas al perfil— van con palabra, porque cualquier
              icono de "persona" chocaria con el ojo de impresiones y con el otro.
              Agrupado en tres bloques separados por un punto para que no sea una
              lista plana de siete numeros. */}
          <div className="flex items-center gap-x-3 gap-y-1 text-xs text-text-muted mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1" title="Reacciones">
              <MetricIcon d={ICON_LIKE} /> {fmtNum(post.likes_count)}
            </span>
            <span className="inline-flex items-center gap-1" title="Comentarios">
              <MetricIcon d={ICON_COMMENT} /> {fmtNum(post.comments_count)}
            </span>
            <span className="inline-flex items-center gap-1" title="Republicaciones">
              <MetricIcon d={ICON_REPOST} /> {fmtNum(post.reposts_count)}
            </span>
            {post.impressions_count != null && (
              <span className="inline-flex items-center gap-1 text-accent" title="Impresiones">
                <MetricIcon d={ICON_EYE} /> {fmtNum(post.impressions_count)}
              </span>
            )}

            {/* LinkedIn Premium: lo mas parecido a "esto trajo negocio" que
                tenemos. Ver FranjaPremium para los estados. */}
            <FranjaPremium post={post} />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="ml-auto text-text-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-wait"
              title="Capture a fresh snapshot for this post"
            >
              {refreshing ? '↻ …' : '↻ Refresh'}
            </button>
            {refreshMsg && (
              <span className={`text-[10px] whitespace-nowrap ${refreshMsg.startsWith('✗') ? 'text-danger' : 'text-green-400'}`}>
                {refreshMsg}
              </span>
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-accent hover:text-accent-light"
            >
              {open ? 'Hide stats' : 'Show stats'}
            </button>
            {post.post_url && (
              <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-light">
                View on LinkedIn →
              </a>
            )}
            {onOpenChat && (
              <button
                onClick={onOpenChat}
                className="text-accent hover:text-accent-light"
                title="Enviar a Google Chat con comentarios sugeridos"
              >
                🐝 Chat
              </button>
            )}
            {onRemoveDemo && (
              <button
                onClick={() => {
                  if (confirm('Remove the demo post from live tracking?')) onRemoveDemo();
                }}
                className="text-red-400/70 hover:text-red-400 transition-colors"
                title="Remove demo post"
              >
                ✕ Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3">
          <SnapshotCurve postId={post.id} publishedAt={post.published_at} autoRefresh={post.is_live} />
        </div>
      )}
    </div>
  );
}

// Top Posts row — mirrors the LivePostRow layout but for historical posts in the
// analytics list. The "Show curve" button pulls archived snapshots for any post
// that was previously tracked by the monitor, so the data stays consultable after
// the 7-day live window closes.
function TopPostRow(
  { post, destacar }:
  { post: TopPost; destacar?: 'ctr' | 'outlier' | null }
) {
  const [open, setOpen] = useState(false);
  // CTR solo tiene sentido si el post llevaba enlace Y sabemos su alcance.
  // Sin las dos cosas no es "0%", es que no hay dato — y pintar un 0% haria
  // parecer un fracaso lo que solo es un post sin enlace.
  const ctr =
    post.link_clicks_count != null && post.impressions_count
      ? (post.link_clicks_count / post.impressions_count) * 100
      : null;
  return (
    <div className="rounded-lg border border-border/50 bg-bg-primary">
      <div className="flex items-start gap-3 p-3">
        {post.creator_image ? (
          <img src={post.creator_image} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-text-muted text-xs flex-shrink-0">
            {(post.creator_name || '?')[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap min-w-0">
              <span className="text-text-secondary font-medium">{nombreCuenta(post.creator_name)}</span>
              <span>·</span>
              <span title={post.published_at ? new Date(post.published_at).toLocaleString() : ''}>{post.published_at ? fmtPublishedAt(post.published_at) : '—'}</span>
              <span>·</span>
              <span>{FORMAT_LABELS[post.content_type] || post.content_type}</span>
            </div>
            {/* Badges de cabecera. El del criterio por el que se esta ordenando
                se agranda, para que el ojo pueda seguir la columna que manda el
                orden sin tener que leer numero a numero.
                Las siglas van DENTRO del badge ("0,44% CTR", "8.4x") porque un
                porcentaje suelto al lado de un multiplicador no dice de que es.
                ⚠️ CTR solo compara justo posts DEL MISMO pilar: entre pilares
                miente, porque LinkedIn infla las impresiones del meme
                (outliers-database §3.11). Por eso el tooltip lo avisa. */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Pilar a la IZQUIERDA del CTR, igual que en Live posts (Iker,
                  2026-09-17): el multiplicador va el ultimo, a la derecha. */}
              <PilarSelector postId={post.id} pillar={post.pillar} />
              {ctr != null && (
                <span
                  className={`rounded font-semibold tabular-nums bg-amber-500/15 text-amber-400 ${
                    destacar === 'ctr'
                      ? 'px-2.5 py-1 text-sm ring-1 ring-amber-400/40'
                      : 'px-2 py-0.5 text-xs'
                  }`}
                  title={
                    `CTR ${ctr.toFixed(2)}% — ${post.link_clicks_count} clics sobre ` +
                    `${post.impressions_count?.toLocaleString('es-ES')} impresiones` +
                    (post.link_url ? `\n→ ${post.link_url}` : '') +
                    `\n\nOjo: solo compara justo posts del MISMO pilar.`
                  }
                >
                  {ctr.toFixed(2)}% <span className="opacity-70">CTR</span>
                </span>
              )}
              {post.outlier_ratio != null && (
                <span
                  className={`rounded font-semibold tabular-nums ${
                    post.is_outlier
                      ? 'bg-diamond/15 text-diamond'
                      : 'bg-bg-secondary text-text-muted border border-border'
                  } ${
                    destacar === 'outlier'
                      ? 'px-2.5 py-1 text-sm ring-1 ring-diamond/40'
                      : 'px-2 py-0.5 text-xs'
                  }`}
                  title="Engagement relative to this creator's average"
                >
                  {post.outlier_ratio.toFixed(1)}x
                </span>
              )}
            </div>
          </div>
          <ExpandablePostText text={post.content_text || post.hook_text} />
          {!NO_MEDIA_TYPES.has(post.content_type) && (
            <div className="mt-2">
              <MediaViewer postId={post.id} contentType={post.content_type} linkedinUrl={post.post_url} />
            </div>
          )}
          {/* Misma franja que en Live posts, a proposito: son la misma cosa vista
              en dos sitios y tenerlas distintas obligaba a re-aprender la lectura
              al cambiar de seccion. Las acciones van agrupadas en su propio div
              con ml-auto para que queden pegadas a la derecha; sueltas se metian
              en medio de los numeros en cuanto la fila hacia wrap. */}
          <div className="flex items-center gap-x-3 gap-y-1 text-xs text-text-muted mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1" title="Reacciones">
              <MetricIcon d={ICON_LIKE} /> {fmtNum(post.likes_count)}
            </span>
            <span className="inline-flex items-center gap-1" title="Comentarios">
              <MetricIcon d={ICON_COMMENT} /> {fmtNum(post.comments_count)}
            </span>
            <span className="inline-flex items-center gap-1" title="Republicaciones">
              <MetricIcon d={ICON_REPOST} /> {fmtNum(post.reposts_count)}
            </span>
            {post.impressions_count != null && (
              <span className="inline-flex items-center gap-1 text-accent/80" title="Impresiones">
                <MetricIcon d={ICON_EYE} /> {fmtNum(post.impressions_count)}
              </span>
            )}

            <FranjaPremium post={post} />

            <span className="ml-auto flex items-center gap-3">
              {post.published_at && (
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="text-accent hover:text-accent-light"
                >
                  {open ? 'Hide stats' : 'Show stats'}
                </button>
              )}
              {post.post_url && (
                <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-light">
                  View on LinkedIn →
                </a>
              )}
              {/* Sin boton de Chat a proposito: mandar comentarios sugeridos solo
                  tiene sentido sobre un post vivo, y para eso ya esta en Live
                  posts. Aqui son posts historicos, muchos de hace meses. */}
            </span>
          </div>
        </div>
      </div>
      {open && post.published_at && (
        <div className="px-3 pb-3">
          <SnapshotCurve postId={post.id} publishedAt={post.published_at} />
        </div>
      )}
    </div>
  );
}

/* El catálogo de pilares se carga UNA vez para toda la página. Con 60 posts en
   pantalla, un fetch por selector serían 60 peticiones al mismo endpoint. */
export default function Accounts() {
  return (
    <PilaresProvider>
      <AccountsInner />
    </PilaresProvider>
  );
}
