/**
 * Analitica de LinkedIn Premium de un post, leida de la pagina web.
 *
 * POR QUE ESTO EXISTE
 * -------------------
 * La API de Unipile expone `analytics` en `getPostById`, pero solo trae dos
 * campos: visitas al perfil y seguidores ganados. Los CLICS AL ENLACE —el unico
 * numero que dice si un lead magnet convierte— no estan ahi. Tampoco los
 * guardados ni los envios por privado.
 *
 * Resulta que LinkedIn los renderiza en el HTML de
 * `/analytics/post-summary/<urn>/`, dentro del payload de rehidratacion de React.
 * Una sola peticion trae las 11 metricas. Verificado el 2026-07-20 contra los
 * posts de Iker y Unai: los numeros cuadran con lo que se ve en pantalla.
 *
 * TRES COSAS QUE DUELEN SI NO SE SABEN
 * ------------------------------------
 * 1. La analitica de un post SOLO la ve su autor. Hay que pasar el
 *    `unipile_account_id` del creador dueño del post. Con la cuenta equivocada
 *    LinkedIn devuelve la pagina sin datos: todo sale null, nunca datos de otro.
 *    Comprobado a proposito. Un fallo de mapeo nos deja ciegos, no mintiendo.
 * 2. El HTML viene DOBLEMENTE escapado: el proxy lo mete en un JSON y dentro el
 *    payload RSC trae sus propias comillas escapadas. Sin desescapar, los
 *    patrones no casan y todo sale null EN SILENCIO — que parece "LinkedIn no da
 *    el dato" cuando en realidad es un bug nuestro. De ahi `pareceLaPagina()`.
 * 3. Los bloques de ayuda (los tooltips de la "i") repiten LITERALMENTE las
 *    mismas etiquetas. Si no se filtran, se lee el numero equivocado. Se
 *    distinguen porque al tooltip le sigue una frase, no una cifra.
 */

const BASE = () => process.env.UNIPILE_BASE_URL || 'https://api18.unipile.com:14891';
const KEY = () => process.env.UNIPILE_API_KEY || '';

export interface PremiumAnalytics {
  impressions: number | null;
  profileViewers: number | null;
  followersGained: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  saves: number | null;
  sends: number | null;
  premiumButtonClicks: number | null;
  linkClicks: number | null;
  linkUrl: string | null;
}

/** Numero con separador de miles ("22,420") -> 22420 */
function aNumero(s: string | undefined | null): number | null {
  if (s == null) return null;
  const n = parseInt(s.replace(/[.,\s]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Metrica destacada: el numero va ANTES de su etiqueta.
 * Ej: {"children":["22,420"]} ... {"children":["Impressions"]}
 */
function destacada(html: string, etiqueta: string): number | null {
  const re = new RegExp(`"children":\\["([\\d.,]+)"\\][\\s\\S]{0,600}?"children":\\["${etiqueta}"\\]`);
  return aNumero(html.match(re)?.[1]);
}

/**
 * Metrica de fila: la etiqueta va ANTES del numero.
 * Se salta el tooltip de ayuda, que repite la etiqueta pero va seguido de una
 * explicacion en prosa ("The number of times...") en vez de una cifra.
 */
function fila(html: string, etiqueta: string): number | null {
  const re = new RegExp(`"children":\\["${etiqueta}"\\][\\s\\S]{0,3000}?"children":\\["([\\d.,]+)"\\]`, 'g');
  for (const m of html.matchAll(re)) {
    if (/The (number|total number|percentage)/i.test(m[0])) continue;
    return aNumero(m[1]);
  }
  return null;
}

/**
 * Sanity check: ¿esto es de verdad la pagina de analiticas con datos?
 * Sin esto, un redirect a login o un cambio de formato de LinkedIn se traduce en
 * "todas las metricas a null" sin distinguirse de "el post no tiene clics".
 */
function pareceLaPagina(html: string): boolean {
  return html.includes('"children":["Impressions"]') && html.includes('"children":["Reactions"]');
}

/**
 * Trae la analitica Premium de un post.
 * @param activityUrn  urn:li:activity:XXXX (el linkedin_post_id que guardamos)
 * @param accountId    cuenta de Unipile DEL AUTOR del post
 * @returns null si la pagina no se pudo leer (cuenta ajena, borrado, formato cambiado)
 */
export async function fetchPremiumAnalytics(
  activityUrn: string,
  accountId: string
): Promise<PremiumAnalytics | null> {
  if (!KEY() || !accountId || !activityUrn) return null;

  const res = await fetch(`${BASE()}/api/v1/linkedin`, {
    method: 'POST',
    headers: { 'X-API-KEY': KEY(), 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      account_id: accountId,
      method: 'GET',
      request_url: `https://www.linkedin.com/analytics/post-summary/${activityUrn}/`,
      encoding: false,
    }),
  });

  if (!res.ok) {
    console.warn(`[premiumAnalytics] HTTP ${res.status} para ${activityUrn}`);
    return null;
  }

  const crudo = await res.text();
  let html = crudo;
  try {
    const j = JSON.parse(crudo);
    if (typeof j?.data === 'string') html = j.data;
  } catch {
    /* el proxy ya devolvio HTML plano */
  }
  // Ver nota 2 de la cabecera: sin esto todo sale null en silencio.
  html = html.replace(/\\"/g, '"');

  if (!pareceLaPagina(html)) {
    console.warn(
      `[premiumAnalytics] ${activityUrn}: la respuesta no parece la pagina de analiticas ` +
        `(cuenta equivocada, post borrado, o LinkedIn cambio el formato)`
    );
    return null;
  }

  return {
    impressions: destacada(html, 'Impressions'),
    profileViewers: destacada(html, 'Profile viewers from this post'),
    followersGained: destacada(html, 'Followers gained from this post'),
    reactions: fila(html, 'Reactions'),
    comments: fila(html, 'Comments'),
    reposts: fila(html, 'Reposts'),
    saves: fila(html, 'Saves'),
    sends: fila(html, 'Sends on LinkedIn'),
    premiumButtonClicks: fila(html, 'Premium custom button engagements'),
    linkClicks: fila(html, 'Visits to links from this post'),
    linkUrl:
      html.match(/"children":\["Visits to links from this post"\][\s\S]{0,600}?"children":\["(https?:[^"]+)"\]/)?.[1] ??
      null,
  };
}

/**
 * Guarda lo que se haya podido leer. COALESCE en todo: un null nunca pisa un
 * valor bueno que ya teniamos (LinkedIn deja de servir algunos bloques cuando el
 * post pasa de 90 dias, y no queremos que un refresco tardio borre el historico).
 */
export async function savePremiumAnalytics(
  pool: { query: (q: string, v?: any[]) => Promise<any> },
  postId: string,
  a: PremiumAnalytics
): Promise<void> {
  // GREATEST ademas del COALESCE (2026-09-17): son contadores acumulados, no
  // bajan nunca. Ese dia una lectura dejo los clics al enlace del meme de Iker
  // en 0 cuando la misma pagina, leida tres veces justo despues, daba 119;
  // LinkedIn a veces sirve la pagina con ceros (tambien en posts viejos). Un 0
  // no es "no tiene clics", es "no me lo ha dado".
  await pool.query(
    `UPDATE posts SET
       profile_viewers_count   = GREATEST(COALESCE($2, profile_viewers_count), profile_viewers_count),
       followers_gained_count  = GREATEST(COALESCE($3, followers_gained_count), followers_gained_count),
       saves_count             = GREATEST(COALESCE($4, saves_count), saves_count),
       sends_count             = GREATEST(COALESCE($5, sends_count), sends_count),
       link_clicks_count       = GREATEST(COALESCE($6, link_clicks_count), link_clicks_count),
       premium_button_clicks   = GREATEST(COALESCE($7, premium_button_clicks), premium_button_clicks),
       link_url                = COALESCE($8, link_url),
       premium_analytics_at    = NOW()
     WHERE id = $1`,
    [
      postId,
      a.profileViewers,
      a.followersGained,
      a.saves,
      a.sends,
      a.linkClicks,
      a.premiumButtonClicks,
      a.linkUrl,
    ]
  );
}
