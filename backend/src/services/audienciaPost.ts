/**
 * QUIEN VE CADA POST (Mario, 2026-10-14): personas alcanzadas, dentro/fuera de la red
 * y demografia (cargo, zona, nivel, empresa, sector y tamaño de empresa).
 *
 * POR QUE VA APARTE DE premiumAnalytics
 * -------------------------------------
 * La pagina `/analytics/post-summary/<urn>/` trae las 11 metricas de siempre, pero los
 * bloques "Members reached" y "Post viewer demographics" llegan VACIOS: LinkedIn los
 * rellena despues con una segunda peticion de su web (SDUI), la "slow metrics":
 *
 *   POST /flagship-web/rsc-action/actions/server-request?sduiid=<RID>
 *   cuerpo = el ServerRequest de la pagina (requestId, serverRequest, states,
 *            requestedArguments + screenId), igual que lo arma su JS (`dy()` del bundle).
 *
 * Se manda por el proxy de Unipile con la sesion DEL AUTOR (como la analitica Premium:
 * con otra cuenta no hay datos). Verificado el 14/10 con un post de Asier: 24.651
 * alcanzados, 2 % dentro de la red, y las seis listas.
 *
 * LO QUE PUEDE CAMBIAR SIN AVISAR
 * -------------------------------
 * Las seis listas vienen como componentes que se intercambian segun un indice (1..6) y
 * no llevan su titulo al lado. El orden observado es cargo, zona, nivel, empresa, sector,
 * tamaño. Zona, nivel y tamaño se COMPRUEBAN por su contenido: si no cuadran, la
 * demografia se descarta entera (mejor nada que listas cruzadas) y solo se guarda el
 * alcance. El nivel se lee completo (no solo el top 5) porque de el sale "% decisores".
 */
const BASE = () => process.env.UNIPILE_BASE_URL || 'https://api18.unipile.com:14891';
const KEY = () => process.env.UNIPILE_API_KEY || '';

const RID = 'com.linkedin.sdui.requests.creatoranalytics.spaSlowMetrics';
const SCREEN = 'com.linkedin.sdui.flagshipnav.creatoranalytics.MembersSPAContainer';

export interface FilaAudiencia {
  label: string;
  /** porcentaje; "< 1%" se guarda como 0.5 */
  pct: number;
}
export interface Demografia {
  cargo: FilaAudiencia[];
  zona: FilaAudiencia[];
  nivel: FilaAudiencia[];
  empresa: FilaAudiencia[];
  sector: FilaAudiencia[];
  tamano: FilaAudiencia[];
}
export interface Audiencia {
  membersReached: number | null;
  inNetworkPct: number | null;
  demografia: Demografia | null;
}

// Niveles de LinkedIn (Seniority). Decisores = los que firman o deciden la compra.
export const NIVELES = ['Unpaid', 'Training', 'Entry', 'Senior', 'Manager', 'Director', 'VP', 'CXO', 'Partner', 'Owner'];
export const NIVELES_DECISORES = ['Director', 'VP', 'CXO', 'Partner', 'Owner'];

const ORDEN: (keyof Demografia)[] = ['cargo', 'zona', 'nivel', 'empresa', 'sector', 'tamano'];

function aNumero(s: string | undefined | null): number | null {
  if (s == null) return null;
  const n = parseInt(s.replace(/[.,\s]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}
function aPct(s: string): number | null {
  const t = s.replace(/\s/g, '');
  if (/^<1%$/.test(t)) return 0.5;
  const m = /^(\d{1,3})%$/.exec(t);
  return m ? Number(m[1]) : null;
}

/** Filas (etiqueta, %) de un trozo del payload: <p>etiqueta</p><p>NN%</p>. */
function filas(trozo: string): FilaAudiencia[] {
  const re = /"children":\["([^"]{1,140})"\]\}\],\["\$","p",null,\{"className":"[^"]*","children":\["(<?\s?\d{1,3}%)"\]/g;
  const out: FilaAudiencia[] = [];
  for (const m of trozo.matchAll(re)) {
    const pct = aPct(m[2]);
    if (pct != null && !out.some((f) => f.label === m[1])) out.push({ label: m[1], pct });
  }
  return out;
}

/** Exportada para las pruebas: del texto de la respuesta (ya desescapado) a la audiencia. */
export function parsearAudiencia(d: string): Audiencia {
  const membersReached = aNumero(
    d.match(/"children":\["([\d.,]+)"\][\s\S]{0,600}?"children":\["Members reached"\]/)?.[1]
  );
  const inNet = d.match(/"children":\["In-network[^"]*"\][\s\S]{0,1500}?"children":\["(\d{1,3})%"\]/)?.[1];
  const inNetworkPct = inNet != null ? Number(inNet) : null;

  // Trozos RSC "<id>:<json>": las listas suelen ir aparte y se citan como "$Lx".
  const trozos = new Map<string, string>();
  for (const m of d.matchAll(/^([0-9a-f]+):(.*)$/gm)) trozos.set(m[1], m[2]);

  // Las seis listas son las seis primeras veces que se SUSTITUYE el componente de
  // porcentajes, en el orden de su indice (1..6). Cada una llega de una de dos formas
  // (14/10): como referencia a un trozo ("$Lx") o metida ahi mismo (lo que va hasta la
  // siguiente vez que aparece el componente). Con la primera forma sola se perdia la
  // lista de cargos en 18 de 45 posts, y con ella la demografia entera.
  const K = 'CreatorAnalyticsModuleKey_SPA_TOP_DEMOGRAPHICSpercentageComparisonModuleComponentRef';
  const reSust = new RegExp(`"componentKey":"${K}","content":\\{"\\$case":"newComponent","newComponent":(?:"\\$L([0-9a-f]+)"|\\[)`, 'g');
  const sust = [...d.matchAll(reSust)].slice(0, 6);
  const listas = sust.map((m) => {
    if (m[1]) return filas(trozos.get(m[1]) ?? '');
    const desde = (m.index ?? 0) + m[0].length;
    const hasta = d.indexOf(`"${K}"`, desde);
    // Metida ahi, sus filas citan otros trozos ("$L46" = la etiqueta, "$L47" = el %):
    // se sustituyen antes de leer (dos pasadas, por si un trozo cita a otro).
    let seg = d.slice(desde, hasta > 0 ? hasta : desde + 20000);
    for (let i = 0; i < 2; i++) seg = seg.replace(/"\$L([0-9a-f]+)"/g, (todo, id) => trozos.get(id) ?? todo);
    return filas(seg);
  });

  let demografia: Demografia | null = null;
  if (listas.length === 6) {
    const dem = Object.fromEntries(ORDEN.map((k, i) => [k, listas[i]])) as unknown as Demografia;
    // El nivel completo: todas las filas del payload cuya etiqueta es un nivel.
    const nivelCompleto = filas(d).filter((f) => NIVELES.includes(f.label));
    if (nivelCompleto.length > dem.nivel.length) dem.nivel = nivelCompleto.sort((a, b) => b.pct - a.pct);
    const okZona = dem.zona.length > 0 && dem.zona.every((f) => /Area|Region|Metropolitan|Spain|España|Community|Comunidad|Province|Provincia/i.test(f.label));
    const okNivel = dem.nivel.length > 0 && dem.nivel.every((f) => NIVELES.includes(f.label));
    const okTamano = dem.tamano.length > 0 && dem.tamano.every((f) => /employees|empleados/i.test(f.label));
    if (okZona && okNivel && okTamano) demografia = dem;
    else console.warn('[audienciaPost] las listas no cuadran con el orden esperado; demografia descartada');
  }
  return { membersReached, inNetworkPct, demografia };
}

/**
 * Lee la audiencia de un post. null si la peticion falla (cuenta ajena, post borrado o
 * LinkedIn cambio el formato).
 * @param activityUrn urn:li:activity:XXXX (o solo el numero)
 * @param accountId   cuenta de Unipile DEL AUTOR
 */
export async function fetchAudiencia(activityUrn: string, accountId: string): Promise<Audiencia | null> {
  if (!KEY() || !accountId || !activityUrn) return null;
  const activityId = String(activityUrn).replace(/^urn:li:activity:/, '');
  if (!/^\d+$/.test(activityId)) return null;
  const payload = {
    updateKey: {
      feedType: 47,
      items: [{ feedUpdateUrn: { updateUrnActivityUrn: { activityUrn: { activityId } } } }],
      aggregationType: 0,
      aggregationReasonTypes: [],
      isVideoCarousel: false,
    },
  };
  const requestedArguments = {
    $type: 'proto.sdui.actions.requests.RequestedArguments',
    requestedStateKeys: [],
    payload,
    requestMetadata: { $type: 'proto.sdui.common.RequestMetadata' },
  };
  const body = {
    requestId: RID,
    serverRequest: { requestId: RID, requestedArguments, isApfcEnabled: false, isStreaming: false, rumPageKey: '' },
    states: [],
    requestedArguments: { ...requestedArguments, states: [], screenId: SCREEN, knownTemplateIds: [] },
  };
  try {
    const res = await fetch(`${BASE()}/api/v1/linkedin`, {
      method: 'POST',
      headers: { 'X-API-KEY': KEY(), 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        method: 'POST',
        request_url: `https://www.linkedin.com/flagship-web/rsc-action/actions/server-request?sduiid=${encodeURIComponent(RID)}`,
        body,
        encoding: false,
        headers: { 'content-type': 'application/json' },
      }),
    });
    if (!res.ok) {
      console.warn(`[audienciaPost] HTTP ${res.status} para ${activityId}`);
      return null;
    }
    const crudo = await res.text();
    let d = crudo;
    try {
      const j = JSON.parse(crudo);
      if (typeof j?.data === 'string') d = j.data;
    } catch {
      /* ya era texto */
    }
    d = d.replace(/\\"/g, '"');
    if (!d.includes('Members reached') && !d.includes('demographicsFeature')) {
      console.warn(`[audienciaPost] ${activityId}: la respuesta no trae el bloque de audiencia`);
      return null;
    }
    return parsearAudiencia(d);
  } catch (e: any) {
    console.warn(`[audienciaPost] ${activityId}:`, e?.message);
    return null;
  }
}

/** Guarda lo leido. Un null no pisa un dato bueno (como en premiumAnalytics). */
export async function saveAudiencia(
  pool: { query: (q: string, v?: any[]) => Promise<any> },
  postId: string,
  a: Audiencia
): Promise<void> {
  await pool.query(
    `UPDATE posts SET
       members_reached = GREATEST(COALESCE($2, members_reached), members_reached),
       in_network_pct  = COALESCE($3, in_network_pct),
       audiencia       = COALESCE($4::jsonb, audiencia),
       audiencia_at    = NOW()
     WHERE id = $1`,
    [postId, a.membersReached, a.inNetworkPct, a.demografia ? JSON.stringify(a.demografia) : null]
  );
}
