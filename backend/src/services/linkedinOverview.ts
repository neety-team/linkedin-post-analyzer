/**
 * Cifras OFICIALES de la pagina de resumen de LinkedIn de una cuenta
 * (`/dashboard/`, bloque "Track performance"): visitas al perfil en 90 dias,
 * impresiones de posts en 7 dias, seguidores y apariciones en busquedas.
 *
 * POR QUE EXISTE (Iker, 2026-09-17): las visitas al perfil se reconstruian con
 * la lista de visitantes de LinkedIn, y esa lista no es fiable: sale cortada a
 * medias (Iker: 251 visitantes un dia, 201 el anterior), topa en 1.000 (Unai) y
 * no trae a quien mira en modo privado (Asier: 699 en la lista, 940 en
 * LinkedIn). Ningun metodo cuadraba (+12% a +24%, o -20% a -24%). Esta pagina
 * da el numero que la persona ve en LinkedIn; medido ese dia con Asier: 941
 * visitas, 6.821 impresiones y 4.461 seguidores contra 940 / 6.788 / 4.461 en
 * su captura de un rato antes.
 *
 * Se lee igual que la analitica de un post (premiumAnalytics.ts): GET a traves
 * de Unipile con la cuenta DUENA, HTML con el payload de React doblemente
 * escapado, y el numero va ANTES de su etiqueta.
 */
const BASE = () => process.env.UNIPILE_BASE_URL || 'https://api18.unipile.com:14891';
const KEY = () => process.env.UNIPILE_API_KEY || '';

export interface ResumenLinkedIn {
  profileViewers90d: number | null;
  postImpressions7d: number | null;
  followers: number | null;
  searchAppearances: number | null;
}

function aNumero(s: string | undefined | null): number | null {
  if (s == null) return null;
  const n = parseInt(s.replace(/[.,\s]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function cifra(html: string, etiqueta: string): number | null {
  const re = new RegExp(`"children":\\["([\\d.,]+)"\\][\\s\\S]{0,600}?"children":\\["${etiqueta}`);
  return aNumero(html.match(re)?.[1]);
}

export function leerResumenLinkedIn(html: string): ResumenLinkedIn | null {
  const limpio = html.replace(/\\"/g, '"');
  if (!limpio.includes('Profile viewers in 90 days')) return null;
  return {
    profileViewers90d: cifra(limpio, 'Profile viewers in 90 days'),
    postImpressions7d: cifra(limpio, 'Post impressions in 7 days'),
    followers: cifra(limpio, 'Total followers'),
    searchAppearances: cifra(limpio, 'Search appearances'),
  };
}

export async function fetchResumenLinkedIn(accountId: string): Promise<ResumenLinkedIn | null> {
  if (!KEY() || !accountId) return null;
  const res = await fetch(`${BASE()}/api/v1/linkedin`, {
    method: 'POST',
    headers: { 'X-API-KEY': KEY(), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      account_id: accountId,
      method: 'GET',
      request_url: 'https://www.linkedin.com/dashboard/',
      encoding: false,
    }),
  });
  if (!res.ok) {
    console.warn(`[linkedinOverview] HTTP ${res.status} para la cuenta ${accountId}`);
    return null;
  }
  const crudo = await res.text();
  let html = crudo;
  try {
    const j = JSON.parse(crudo);
    if (typeof j?.data === 'string') html = j.data;
  } catch {
    /* HTML plano */
  }
  const r = leerResumenLinkedIn(html);
  if (!r) console.warn(`[linkedinOverview] la respuesta de ${accountId} no parece el resumen de LinkedIn`);
  return r;
}

/**
 * Guarda la lectura del dia. Un 0 o un null no pisan un valor bueno del mismo
 * dia (Unipile da ceros a ratos).
 */
export async function guardarResumenLinkedIn(
  pool: { query: (q: string, v?: any[]) => Promise<any> },
  creatorId: string,
  r: ResumenLinkedIn
): Promise<void> {
  const v = (n: number | null) => (n != null && n > 0 ? n : null);
  await pool.query(
    `INSERT INTO creator_linkedin_overview
       (creator_id, captured_on, captured_at, profile_viewers_90d, post_impressions_7d, followers, search_appearances)
     VALUES ($1, CURRENT_DATE, NOW(), $2, $3, $4, $5)
     ON CONFLICT (creator_id, captured_on) DO UPDATE SET
       captured_at = NOW(),
       profile_viewers_90d = COALESCE(EXCLUDED.profile_viewers_90d, creator_linkedin_overview.profile_viewers_90d),
       post_impressions_7d = COALESCE(EXCLUDED.post_impressions_7d, creator_linkedin_overview.post_impressions_7d),
       followers = COALESCE(EXCLUDED.followers, creator_linkedin_overview.followers),
       search_appearances = COALESCE(EXCLUDED.search_appearances, creator_linkedin_overview.search_appearances)`,
    [creatorId, v(r.profileViewers90d), v(r.postImpressions7d), v(r.followers), v(r.searchAppearances)]
  );
}

/**
 * SERIES DIARIAS OFICIALES (Iker, 2026-09-17). La pagina de Content analytics
 * con `timeRange=past_365_days` trae cuatro series con un punto por dia
 * ({"y": valor, ..., "x": medianoche UTC en ms}), sea cual sea `metricType`:
 * "Impressions" diaria, "Impressions" acumulada, "Engagements" diaria y
 * "Engagements" acumulada, en ese orden. Se toma la PRIMERA de cada nombre
 * (la diaria). Comprobado ese dia: la suma de los ultimos 7 dias de
 * impresiones dio 54.315 / 14.780 / 6.843 contra 54.286 / 14.780 / 6.837 del
 * resumen de Iker, Unai y Asier; la de engagement anual de Iker, 18.861 (la
 * acumulada suma millones, asi se distinguen).
 * Con ellas "Impressions per month" y "Engagement over time" son la cifra de
 * LinkedIn, no una reconstruccion por fecha de publicacion.
 */
export interface DiaOficial {
  dia: string;
  impresiones: number;
  engagements: number | null;
}

function serie(html: string, nombre: string): Map<string, number> {
  const out = new Map<string, number>();
  const bloque = html.match(
    new RegExp(`"name":"${nombre}"[^\\[]{0,300}?"data":\\[(\\{"y":[\\s\\S]*?)\\],"dashStyle"`)
  );
  if (!bloque) return out;
  for (const m of bloque[1].matchAll(/\{"y":(\d+),[\s\S]{0,400}?"x":(\d{13})\}/g)) {
    out.set(new Date(Number(m[2])).toISOString().slice(0, 10), Number(m[1]));
  }
  return out;
}

export async function fetchSeriesDiarias(accountId: string): Promise<DiaOficial[] | null> {
  if (!KEY() || !accountId) return null;
  const res = await fetch(`${BASE()}/api/v1/linkedin`, {
    method: 'POST',
    headers: { 'X-API-KEY': KEY(), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      account_id: accountId,
      method: 'GET',
      request_url:
        'https://www.linkedin.com/analytics/creator/content/?metricType=IMPRESSIONS&timeRange=past_365_days',
      encoding: false,
    }),
  });
  if (!res.ok) {
    console.warn(`[linkedinOverview] series diarias: HTTP ${res.status} para ${accountId}`);
    return null;
  }
  const crudo = await res.text();
  let html = crudo;
  try {
    const j = JSON.parse(crudo);
    if (typeof j?.data === 'string') html = j.data;
  } catch {
    /* HTML plano */
  }
  html = html.replace(/\\"/g, '"');
  const imp = serie(html, 'Impressions');
  const eng = serie(html, 'Engagements');
  // Una lectura buena trae el ano entero; si no, la pagina vino a medias.
  if (imp.size < 300) {
    console.warn(`[linkedinOverview] series diarias de ${accountId}: solo ${imp.size} dias, se descarta`);
    return null;
  }
  const engValida = eng.size >= 300;
  return [...imp.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, impresiones]) => ({
      dia,
      impresiones,
      engagements: engValida ? eng.get(dia) ?? 0 : null,
    }));
}

/** Un 0 no pisa un dia que ya tenia dato (ceros intermitentes). */
export async function guardarSeriesDiarias(
  pool: { query: (q: string, v?: any[]) => Promise<any> },
  creatorId: string,
  dias: DiaOficial[]
): Promise<void> {
  if (dias.length === 0) return;
  await pool.query(
    `INSERT INTO creator_daily_impressions (creator_id, day, impressions, engagements)
     SELECT $1::uuid, d::date, i, e FROM unnest($2::text[], $3::int[], $4::int[]) AS t(d, i, e)
     ON CONFLICT (creator_id, day) DO UPDATE SET
       impressions = CASE WHEN EXCLUDED.impressions > 0 OR creator_daily_impressions.impressions = 0
                          THEN EXCLUDED.impressions ELSE creator_daily_impressions.impressions END,
       engagements = CASE WHEN EXCLUDED.engagements IS NULL THEN creator_daily_impressions.engagements
                          WHEN EXCLUDED.engagements > 0 OR COALESCE(creator_daily_impressions.engagements, 0) = 0
                          THEN EXCLUDED.engagements ELSE creator_daily_impressions.engagements END,
       captured_at = NOW()`,
    [creatorId, dias.map((p) => p.dia), dias.map((p) => p.impresiones), dias.map((p) => p.engagements)]
  )
}
