import pool from '../db';
// Cálculo de métricas de un envío de newsletter (funciones puras, sin red).
// Definiciones del diseño: apertura real = aperturas únicas menos las de Apple MPP;
// clic = personas distintas que han hecho clic / entregados; CTOR = personas / aperturas reales.

export interface GlobalStats {
  sent?: number;
  delivered?: number;
  hardBounces?: number;
  softBounces?: number;
  unsubscriptions?: number;
  uniqueViews?: number;
  appleMppOpens?: number;
  uniqueClicks?: number;
  [k: string]: unknown;
}

export interface Clic {
  email: string;
  url: string;
  t: string; // ISO
}

// Un brazo de un test A/B. Lo rellena la capa de Brevo.
export interface Brazo {
  asunto: string;
  apertura: number | null; // 0-1, tal como lo da Brevo
  clic: number | null; // 0-1, tal como lo da Brevo
}

export interface Metricas {
  enviados: number;
  entregados: number;
  rebotes: number;
  bajas: number;
  aperturas_reales: number | null;
  apertura_real: number | null; // 0-1
  personas: number;
  personas_primer_minuto: number;
  clic: number | null; // personas / entregados
  ctor: number | null; // personas / aperturas_reales
  ab?: { a: Brazo; b: Brazo };
}

// Enlaces de baja o de preferencias de Brevo: no son interés del lector.
export function esEnlaceDeBaja(url: string): boolean {
  return /\/unsubscribe|\/preferences|\/unsub\b/i.test(url);
}

const dividir = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export function calcularMetricas(g: GlobalStats, sentDate: string, clics: Clic[]): Metricas {
  const entregados = g.delivered ?? 0;
  const aperturasReales = Math.max(0, (g.uniqueViews ?? 0) - (g.appleMppOpens ?? 0));

  // Primer clic válido de cada persona (sin internos ni enlaces de baja).
  const primeros = new Map<string, number>();
  for (const c of clics) {
    const email = c.email.trim().toLowerCase();
    if (email.endsWith('@neety.com') || esEnlaceDeBaja(c.url)) continue;
    const t = Date.parse(c.t);
    const previo = primeros.get(email);
    if (previo === undefined || t < previo) primeros.set(email, t);
  }
  const envio = Date.parse(sentDate);
  // Los clics del primer minuto se cuentan como personas, pero marcados: suelen ser escáneres de enlaces.
  const primerMinuto = [...primeros.values()].filter((t) => t - envio <= 60_000).length;
  const personas = primeros.size;

  return {
    enviados: g.sent ?? 0,
    entregados,
    rebotes: (g.hardBounces ?? 0) + (g.softBounces ?? 0),
    bajas: g.unsubscriptions ?? 0,
    aperturas_reales: entregados > 0 ? aperturasReales : null,
    apertura_real: dividir(aperturasReales, entregados),
    personas,
    personas_primer_minuto: primerMinuto,
    clic: dividir(personas, entregados),
    ctor: dividir(personas, aperturasReales),
  };
}

export function estadoMetricas(): { configurado: boolean } {
  return { configurado: !!process.env.BREVO_API_KEY };
}

// ---------------------------------------------------------------------------
// Lectura de Brevo, barrido de clics y cache (tarea 3).
// ---------------------------------------------------------------------------
const BREVO = 'https://api.brevo.com/v3';
const PAUSA_CONTACTO_MS = 250;
const SEIS_HORAS = 6 * 60 * 60 * 1000;

type Fetcher = typeof fetch;
interface Opts {
  fetcher?: Fetcher;
  pausaMs?: number;
}

async function brevo(ruta: string, fetcher: Fetcher, etiqueta = ruta): Promise<any> {
  const res = await fetcher(`${BREVO}${ruta}`, {
    headers: { 'api-key': process.env.BREVO_API_KEY || '', accept: 'application/json' },
  });
  if (!res.ok) {
    const e: any = new Error(`Brevo ${res.status} en ${etiqueta}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

const pausa = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());
const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Un clic de Brevo ya aplanado, con la campana a la que pertenece. */
export interface ClicCampana extends Clic {
  campaign_id: number;
}

const claveClic = (c: ClicCampana) => `${c.campaign_id}|${c.email}|${c.url}|${c.t}`;

/**
 * Une los clics ya guardados con los recien barridos. Un clic es un hecho que no
 * se deshace: nunca se descarta uno previo, aunque el barrido haya terminado
 * (un contacto borrado en Brevo ya no devuelve sus clics). Se deduplica por la clave primaria.
 */
export function fusionarClics<T extends Clic>(previos: T[], nuevos: T[], _completado = true): T[] {
  const k = (c: T) => `${(c as any).campaign_id ?? ''}|${c.email}|${c.url}|${c.t}`;
  const visto = new Set(previos.map(k));
  return [...previos, ...nuevos.filter((c) => !visto.has(k(c)))];
}

// ----- A/B -----

function porcentaje(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const n = Number.parseFloat(v.replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? n / 100 : null;
}

/**
 * Los dos brazos de un test A/B desde `GET /emailCampaigns/{id}/abTestCampaignResult`.
 * Brevo solo da porcentajes por version ("Version A", "Version B"), sin recuentos:
 * se guardan como tasas 0-1 y no se inventa ningun numero.
 */
export function brazosAB(campana: any, resultado: any): { a: Brazo; b: Brazo } | undefined {
  if (!campana?.abTesting || !resultado || typeof resultado !== 'object') return undefined;
  const st = resultado.statistics || {};
  const arm = (v: 'Version A' | 'Version B', asunto: unknown): Brazo => ({
    asunto: String(asunto ?? ''),
    apertura: porcentaje(st.openers?.[v]),
    clic: porcentaje(st.clicks?.[v]),
  });
  const a = arm('Version A', campana.subjectA);
  const b = arm('Version B', campana.subjectB);
  return a.apertura === null && a.clic === null && b.apertura === null && b.clic === null ? undefined : { a, b };
}

// ----- lectura de campanas -----

export interface DatosCampana {
  global: GlobalStats;
  links: Record<string, number>;
  sentDate: string;
  listas: number[];
  ab?: { a: Brazo; b: Brazo };
}

/** Lee una campana: globalStats y linksStats (dos llamadas) y el A/B si lo hay. */
export async function leerCampana(
  id: number,
  fetcher: Fetcher
): Promise<{ datos: DatosCampana; status: string }> {
  const g = await brevo(`/emailCampaigns/${id}?statistics=globalStats`, fetcher);
  const l = await brevo(`/emailCampaigns/${id}?statistics=linksStats`, fetcher);
  const datos: DatosCampana = {
    global: g?.statistics?.globalStats || {},
    links: l?.statistics?.linksStats || {},
    sentDate: g?.sentDate || g?.scheduledAt || '',
    listas: listasDe(g),
  };
  if (g?.abTesting) {
    try {
      const r = await brevo(`/emailCampaigns/${id}/abTestCampaignResult`, fetcher);
      const ab = brazosAB(g, r);
      if (ab) datos.ab = ab;
    } catch (e: any) {
      if (e?.status !== 404 && e?.status !== 400) throw e; // aun sin resultado: sin A/B
    }
  }
  return { datos, status: String(g?.status || '') };
}

function listasDe(campana: any): number[] {
  const l = campana?.recipients?.lists;
  return Array.isArray(l) ? l.filter((x: unknown) => typeof x === 'number') : [];
}

// ----- barrido de contactos -----

/**
 * Recorre los contactos de las listas y devuelve sus clics en las campanas pedidas.
 * Para al primer error (429 incluido) y lo dice; lo ya leido se devuelve.
 */
export async function barrerContactos(
  listas: number[],
  campanas: Set<number>,
  fetcher: Fetcher,
  pausaMs = PAUSA_CONTACTO_MS
): Promise<{ clics: ClicCampana[]; contactos: number; completado: boolean; error: string | null }> {
  const clics: ClicCampana[] = [];
  const emails = new Set<string>();
  let contactos = 0;
  try {
    for (const lista of listas) {
      for (let offset = 0; ; offset += 500) {
        const r = await brevo(`/contacts/lists/${lista}/contacts?limit=500&offset=${offset}`, fetcher, `/contacts/lists/${lista}/contacts`);
        const cs: any[] = Array.isArray(r?.contacts) ? r.contacts : [];
        for (const c of cs) if (typeof c?.email === 'string') emails.add(c.email.trim().toLowerCase());
        if (cs.length < 500) break;
      }
    }
    for (const email of emails) {
      let c: any;
      try {
        c = await brevo(`/contacts/${encodeURIComponent(email)}`, fetcher, '/contacts/:email');
      } catch (e: any) {
        if (e?.status === 404) continue; // se dio de baja entre medias
        throw e;
      }
      contactos++;
      for (const camp of c?.statistics?.clicked || []) {
        if (!campanas.has(camp?.campaignId)) continue;
        for (const lk of camp.links || []) {
          const t = new Date(lk?.eventTime);
          if (!lk?.url || Number.isNaN(t.getTime())) continue;
          clics.push({ campaign_id: camp.campaignId, email, url: lk.url, t: t.toISOString() });
        }
      }
      await pausa(pausaMs);
    }
    return { clics, contactos, completado: true, error: null };
  } catch (e) {
    return { clics, contactos, completado: false, error: mensaje(e) };
  }
}

// ----- trabajos con base de datos -----

async function campanasVinculadas(): Promise<number[]> {
  const { rows } = await pool.query(`SELECT DISTINCT brevo_campaign_id AS id FROM newsletter_correos WHERE brevo_campaign_id IS NOT NULL`);
  return rows.map((r) => r.id);
}

export async function refrescarMetricas(opts: Opts = {}): Promise<{ campanas: number; error: string | null }> {
  if (!process.env.BREVO_API_KEY) return { campanas: 0, error: null };
  const fetcher = opts.fetcher || fetch;
  let campanas = 0;
  let error: string | null = null;
  for (const id of await campanasVinculadas()) {
    try {
      const { datos, status } = await leerCampana(id, fetcher);
      await pool.query(
        `INSERT INTO newsletter_metricas (campaign_id, datos, estado_brevo, leido_at) VALUES ($1, $2, $3, NOW())
         ON CONFLICT (campaign_id) DO UPDATE SET datos = EXCLUDED.datos, estado_brevo = EXCLUDED.estado_brevo, leido_at = NOW()`,
        [id, JSON.stringify(datos), status]
      );
      if (status === 'sent') {
        await pool.query(
          `UPDATE newsletter_correos SET estado = 'enviado', updated_at = NOW()
            WHERE brevo_campaign_id = $1 AND estado <> 'enviado'`,
          [id]
        );
      }
      campanas++;
    } catch (e) {
      error = mensaje(e);
    }
  }
  return { campanas, error };
}

let enCurso = false;

export async function barrerClics(opts: Opts = {}): Promise<{ contactos: number; error: string | null }> {
  if (!process.env.BREVO_API_KEY) return { contactos: 0, error: null };
  if (enCurso) return { contactos: 0, error: null }; // ya hay un barrido en marcha
  enCurso = true;
  try {
    return await barrerClicsSinGuarda(opts);
  } finally {
    enCurso = false;
  }
}

async function barrerClicsSinGuarda(opts: Opts): Promise<{ contactos: number; error: string | null }> {
  const fetcher = opts.fetcher || fetch;
  let error: string | null = null;
  let r: Awaited<ReturnType<typeof barrerContactos>> = { clics: [], contactos: 0, completado: false, error: null };
  const ids = await campanasVinculadas();
  try {
    const listas = new Set<number>();
    for (const id of ids) {
      const c = await brevo(`/emailCampaigns/${id}?statistics=globalStats`, fetcher);
      for (const l of listasDe(c)) listas.add(l);
    }
    r = await barrerContactos([...listas], new Set(ids), fetcher, opts.pausaMs ?? PAUSA_CONTACTO_MS);
    error = r.error;
  } catch (e) {
    error = mensaje(e);
  }
  const cx = await pool.connect();
  try {
    await cx.query('BEGIN');
    // Un clic es un hecho: solo se insertan los nuevos, nunca se borra ninguno.
    for (const c of r.clics) {
      await cx.query(
        `INSERT INTO newsletter_clics (campaign_id, email, url, t) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [c.campaign_id, c.email, c.url, c.t]
      );
    }
    await cx.query(
      `INSERT INTO newsletter_barrido (id, ultimo_at, error) VALUES (1, NOW(), $1)
       ON CONFLICT (id) DO UPDATE SET ultimo_at = NOW(), error = EXCLUDED.error`,
      [error]
    );
    await cx.query('COMMIT');
  } catch (e) {
    await cx.query('ROLLBACK').catch(() => {});
    error = mensaje(e);
  } finally {
    cx.release();
  }
  return { contactos: r.contactos, error };
}

export async function estadoBarrido(): Promise<{ ultimo_at: string | null; error: string | null }> {
  const { rows } = await pool.query(`SELECT ultimo_at, error FROM newsletter_barrido WHERE id = 1`);
  if (!rows.length) return { ultimo_at: null, error: null };
  const u = rows[0].ultimo_at;
  return { ultimo_at: u ? new Date(u).toISOString() : null, error: rows[0].error ?? null };
}

/** Las metricas de una campana desde la cache; null si aun no se ha leido. */
export async function metricasDeCorreo(campaignId: number): Promise<Metricas | null> {
  const { rows } = await pool.query(`SELECT datos FROM newsletter_metricas WHERE campaign_id = $1`, [campaignId]);
  if (!rows.length) return null;
  const datos: DatosCampana = rows[0].datos;
  const cl = await pool.query(`SELECT email, url, t FROM newsletter_clics WHERE campaign_id = $1`, [campaignId]);
  const clics: Clic[] = cl.rows.map((c) => ({ email: c.email, url: c.url, t: new Date(c.t).toISOString() }));
  const m = calcularMetricas(datos.global || {}, datos.sentDate, clics);
  if (datos.ab) m.ab = datos.ab;
  return m;
}

// ----- temporizadores -----

const FORMATO_MADRID = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
function madrid(d: Date): { dia: string; hora: number } {
  const p = Object.fromEntries(FORMATO_MADRID.formatToParts(d).map((x) => [x.type, x.value]));
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) };
}

export function startNewsletterMetricas(): void {
  if (!process.env.BREVO_API_KEY) {
    console.log('[newsletter] sin BREVO_API_KEY: no se lee Brevo');
    return;
  }
  const refrescar = () => { void refrescarMetricas().then((r) => r.error && console.warn('[newsletter] refresco:', r.error)).catch((e) => console.warn('[newsletter] refresco:', mensaje(e))); };
  setTimeout(refrescar, 60_000);
  setInterval(refrescar, SEIS_HORAS);
  // Barrido diario a las 07:00 de Madrid; el ultimo_at evita repetirlo tras un reinicio.
  setInterval(() => {
    void (async () => {
      const ahora = madrid(new Date());
      if (ahora.hora < 7) return;
      const { ultimo_at } = await estadoBarrido();
      if (ultimo_at && madrid(new Date(ultimo_at)).dia === ahora.dia) return;
      const r = await barrerClics();
      if (r.error) console.warn('[newsletter] barrido:', r.error);
    })().catch((e) => console.warn('[newsletter] barrido:', mensaje(e)));
  }, 10 * 60 * 1000);
}
