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
 * "Engagements" acumulada, en el orden que la persona dejo elegido en LinkedIn:
 * la diaria se elige con serieDiaria, por sus numeros. Comprobado ese dia: la suma de los ultimos 7 dias de
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

/**
 * ⛔ DIARIA O ACUMULADA SE DECIDE POR LOS NUMEROS, NUNCA POR EL ORDEN
 * (2026-09-17). LinkedIn pinta primero la vista que la persona dejo elegida en
 * su pantalla: cuando Iker miro Content y Audience analytics en "Cumulative",
 * la primera serie paso a ser la acumulada y se guardo como diaria (8,4 M de
 * impresiones en 30 dias, +5.800 seguidores "al dia").
 * Regla: la acumulada nunca baja y su suma es muchisimo mayor que la de la
 * diaria. Con dos series del mismo nombre, la diaria es la de menor suma. Con
 * una sola, si nunca baja se trata como acumulada y la diaria sale de restar
 * cada dia al anterior.
 */
function puntos(bloque: string): [string, number][] {
  const out: [string, number][] = [];
  for (const m of bloque.matchAll(/\{"y":(\d+),[\s\S]{0,400}?"x":(\d{13})\}/g)) {
    out.push([new Date(Number(m[2])).toISOString().slice(0, 10), Number(m[1])]);
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

// ¿Es una serie ACUMULADA? No se exige "nunca baja": la acumulada de engagement
// de Iker del 17/09 tenia alguna bajada suelta (LinkedIn corrige dias pasados)
// y se tomo por diaria (2,34 M). Una acumulada baja en muy pocos dias y termina
// en su maximo; una diaria baja mas o menos la mitad de los dias.
function nuncaBaja(p: [string, number][]): boolean {
  if (p.length < 2) return false;
  let bajadas = 0;
  let maximo = 0;
  for (let k = 0; k < p.length; k++) {
    if (k > 0 && p[k][1] < p[k - 1][1]) bajadas++;
    maximo = Math.max(maximo, p[k][1]);
  }
  const ultimo = p[p.length - 1][1];
  return maximo > 0 && bajadas / (p.length - 1) < 0.05 && ultimo >= maximo * 0.95;
}

function aDiaria(acumulada: [string, number][]): [string, number][] {
  return acumulada.map(([dia, v], k) => [dia, k === 0 ? v : Math.max(0, v - acumulada[k - 1][1])]);
}

// Contenido del array cuyo '[' esta en `inicio`, hasta su ']' de cierre real,
// saltando corchetes dentro de cadenas. No depende de la clave que venga
// detras: LinkedIn cierra la serie unas veces con `],"dashStyle"` y otras no.
function arrayDesde(html: string, inicio: number): string {
  let nivel = 0;
  let enCadena = false;
  for (let k = inicio; k < html.length; k++) {
    const c = html[k];
    if (enCadena) {
      if (c === '\\') k++;
      else if (c === '"') enCadena = false;
      continue;
    }
    if (c === '"') enCadena = true;
    else if (c === '[') nivel++;
    else if (c === ']' && --nivel === 0) return html.slice(inicio + 1, k);
  }
  return '';
}

export function serieDiaria(html: string, nombre: string): Map<string, number> {
  const re = new RegExp(`"name":"${nombre}"[^\\[]{0,300}?"data":\\[\\{"y":`, 'g');
  const bloques = [...html.matchAll(re)]
    .map((m) => puntos(arrayDesde(html, (m.index ?? 0) + m[0].length - '[{"y":'.length)))
    .filter((b) => b.length > 0);
  if (bloques.length === 0) return new Map();
  const suma = (b: [string, number][]) => b.reduce((acc, [, v]) => acc + v, 0);
  let diaria: [string, number][];
  if (bloques.length >= 2) {
    diaria = [...bloques].sort((a, b) => suma(a) - suma(b))[0];
  } else {
    diaria = nuncaBaja(bloques[0]) ? aDiaria(bloques[0]) : bloques[0];
  }
  return new Map(diaria);
}

/**
 * LinkedIn SOLO pinta la metrica y la vista que la persona dejo elegidas en su
 * pantalla, salvo que la URL las fije: `metricType` + `lineChartType=DAILY`
 * (comprobado el 17/09/2026: sin `lineChartType` pedir ENGAGEMENTS devolvia
 * impresiones). Por eso cada metrica va en su propia peticion y con las dos.
 */
async function pedirPagina(accountId: string, url: string): Promise<string | null> {
  const res = await fetch(`${BASE()}/api/v1/linkedin`, {
    method: 'POST',
    headers: { 'X-API-KEY': KEY(), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ account_id: accountId, method: 'GET', request_url: url, encoding: false }),
  });
  if (!res.ok) {
    console.warn(`[linkedinOverview] HTTP ${res.status} para ${accountId} en ${url}`);
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
  return html.replace(/\\"/g, '"');
}

const URL_CONTENIDO = (metrica: string) =>
  `https://www.linkedin.com/analytics/creator/content/?metricType=${metrica}&lineChartType=DAILY&timeRange=past_365_days`;

/** Serie diaria valida: ano entero y no todo a 0; si no, null. */
function validar(s: Map<string, number>, que: string, accountId: string): Map<string, number> | null {
  if (s.size < 300 || [...s.values()].every((v) => v === 0)) {
    console.warn(`[linkedinOverview] ${que} de ${accountId}: ${s.size} dias o todo a 0, se descarta`);
    return null;
  }
  return s;
}

export async function fetchSeriesDiarias(accountId: string): Promise<DiaOficial[] | null> {
  if (!KEY() || !accountId) return null;
  const htmlImp = await pedirPagina(accountId, URL_CONTENIDO('IMPRESSIONS'));
  const imp = htmlImp ? validar(serieDiaria(htmlImp, 'Impressions'), 'impresiones diarias', accountId) : null;
  if (!imp) return null;
  const htmlEng = await pedirPagina(accountId, URL_CONTENIDO('ENGAGEMENTS'));
  const eng = htmlEng ? validar(serieDiaria(htmlEng, 'Engagements'), 'engagement diario', accountId) : null;
  return [...imp.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, impresiones]) => ({
      dia,
      impresiones,
      // Sin serie valida de engagement, null: el guardado conserva lo que habia.
      engagements: eng ? eng.get(dia) ?? 0 : null,
    }));
}

/**
 * Una lectura VALIDADA (ano entero y no todo a 0) sobrescribe lo guardado: es
 * la foto completa de LinkedIn, y asi se reparan datos malos anteriores (las
 * acumuladas guardadas como diarias el 17/09/2026). El escudo contra lecturas
 * degradadas esta en la validacion del fetch, no aqui.
 */
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
       impressions = EXCLUDED.impressions,
       engagements = COALESCE(EXCLUDED.engagements, creator_daily_impressions.engagements),
       captured_at = NOW()`,
    [creatorId, dias.map((p) => p.dia), dias.map((p) => p.impresiones), dias.map((p) => p.engagements)]
  )
}

/**
 * SEGUIDORES NUEVOS DIARIOS OFICIALES (Iker, 2026-09-17). Audience analytics
 * (`/analytics/creator/audience/?timeRange=past_365_days`) trae "New followers"
 * diaria y acumulada (se distinguen con serieDiaria). Medido con Iker: 5.845 en 365
 * dias, como la curva acumulada de su captura de LinkedIn. Con ella la grafica
 * de seguidores deja de depender de fotos diarias del total, que para las
 * cuentas manuales no existian y metieron un +2.591 falso el 21/08.
 */
export async function fetchSeguidoresDiarios(accountId: string): Promise<Map<string, number> | null> {
  if (!KEY() || !accountId) return null;
  const html = await pedirPagina(
    accountId,
    'https://www.linkedin.com/analytics/creator/audience/?lineChartType=DAILY&timeRange=past_365_days'
  );
  return html ? validar(serieDiaria(html, 'New followers'), 'seguidores diarios', accountId) : null;
}

export async function guardarSeguidoresDiarios(
  pool: { query: (q: string, v?: any[]) => Promise<any> },
  creatorId: string,
  serieDias: Map<string, number>
): Promise<void> {
  if (serieDias.size === 0) return;
  const dias = [...serieDias.keys()];
  await pool.query(
    `INSERT INTO creator_daily_impressions (creator_id, day, impressions, new_followers)
     SELECT $1::uuid, d::date, 0, n FROM unnest($2::text[], $3::int[]) AS t(d, n)
     ON CONFLICT (creator_id, day) DO UPDATE SET
       new_followers = EXCLUDED.new_followers`,
    [creatorId, dias, dias.map((d) => serieDias.get(d) ?? 0)]
  );
}
