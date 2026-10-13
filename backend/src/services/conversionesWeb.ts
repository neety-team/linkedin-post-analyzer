// CONVERSIONES FUERA DE LINKEDIN PARA EL RESUMEN DE CUENTAS (Mario, 2026-10-13)
//
// Dos cifras que Mario apunta en la reunion de cada dos semanas y que hasta ahora
// iba a buscar a otro sitio:
//
// 1. DEMOS ATRIBUIDAS A MARIO, de la web nueva (neety.com, D1 de la landing):
//    GET {LANDING_URL}/api/analyzer/demos?desde&hasta con Bearer LANDING_ANALYZER_TOKEN.
//    Misma regla de atribucion que el admin de la web (LinkedIn organico, newsletter y
//    recursos; nunca los mensajes privados de los comerciales). Solo recuentos.
//    Sin el token, `configurado: false` y la tarjeta lo dice: nunca un 0 inventado.
//
// 2. INSCRITOS AL WEBINAR, del contador publico de Luma (el mismo que lee el aviso
//    diario al chat, avisoWebinarLuma). Luma gratis no dice de donde viene cada
//    inscrito, asi que es el TOTAL del evento, no atribuido. Solo mientras el evento
//    no haya pasado.
//
// Las dos fuentes son externas: van aparte de /analytics, con cache corta, y un fallo
// devuelve el motivo en vez de tumbar la pantalla.
import pool from '../db';
import { leerEvento } from './avisoWebinarLuma';

const LANDING_URL = () => (process.env.LANDING_URL || 'https://neety.com').replace(/\/$/, '');
const TOKEN = () => process.env.LANDING_ANALYZER_TOKEN || '';
const CACHE_MS = 5 * 60 * 1000;

export interface Recuento {
  solicitudes: number;
  cualificadas: number;
  oportunidades: number;
}
export interface ResumenDemos extends Recuento {
  por_canal: { linkedin: number; newsletter: number; recursos: number };
  // Desgloses por UTM de la primera visita (rama analyzer-demos de la web, 13-oct).
  // Opcionales: la web vieja no los manda y la pantalla tiene que seguir.
  por_pilar?: Record<string, Recuento>;
  por_cuenta?: Record<string, Recuento>;
  por_campana?: Record<string, Recuento>;
  /** clave `${utm_campaign}|${utm_content}`: lo que permite casar cada demo con su post. */
  por_publicacion?: Record<string, Recuento>;
}

/** Demos que se casan con un post concreto (clave = id del post). */
export type DemosPorPost = Record<string, Recuento & { campana: string }>;
export type Demos =
  | { configurado: false }
  | { configurado: true; error: string }
  | { configurado: true; current: ResumenDemos; previous: ResumenDemos; por_post: DemosPorPost; sin_casar: number };

export interface EventoWeb {
  nombre: string;
  /** null = Luma no lo enseña (lista oculta y sin aforo). */
  inscritos: number | null;
  empieza: string;
  url: string;
}

const cache = new Map<string, { t: number; v: unknown }>();
async function conCache<T>(clave: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(clave);
  if (hit && Date.now() - hit.t < CACHE_MS) return hit.v as T;
  const v = await fn();
  cache.set(clave, { t: Date.now(), v });
  return v;
}

export async function leerDemos(desde: string, hasta: string): Promise<Demos> {
  if (!TOKEN()) return { configurado: false };
  return conCache(`demos:${desde}:${hasta}`, async () => {
    try {
      const res = await fetch(
        `${LANDING_URL()}/api/analyzer/demos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,
        { headers: { Authorization: `Bearer ${TOKEN()}` }, signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return { configurado: true as const, error: `la web respondio ${res.status}` };
      const d = (await res.json()) as any;
      if (!d?.current || !d?.previous) return { configurado: true as const, error: 'respuesta sin datos' };
      const { porPost, sinCasar } = await casarConPosts(d.current, hasta);
      return { configurado: true as const, current: d.current, previous: d.previous, por_post: porPost, sin_casar: sinCasar };
    } catch (err: any) {
      return { configurado: true as const, error: err?.name === 'TimeoutError' ? 'la web no contesta' : String(err?.message || err) };
    }
  });
}

export async function leerEventoWeb(): Promise<EventoWeb | null> {
  return conCache('evento', async () => {
    try {
      const ev = await leerEvento();
      if (!ev || ev.acaba.getTime() < Date.now()) return null;
      return { nombre: ev.nombre, inscritos: ev.inscritos, empieza: ev.empieza.toISOString(), url: ev.url };
    } catch {
      return null;
    }
  });
}

// ── Casar cada demo con su post ─────────────────────────────────────────────
// La convencion de UTMs (docs/skills/global-instructions.md, "utm_campaign es el que
// importa"): utm_campaign = {pilar}-{tema}-{ddmes} y utm_content = la cuenta. Con eso se
// busca el post: misma cuenta, mismo dia de Madrid y, si hay varios, mismo pilar. Solo se
// casa cuando queda UNO; si no, la demo cuenta en el resumen pero no se pega a ningun post
// (`sin_casar`). Un post equivocado es peor que ninguno.
const MESES: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
};
// Pilar del UTM -> slug de `posts.pillar` del analizador.
const PILAR_UTM: Record<string, string[]> = {
  historia: ['historia'],
  meme: ['meme'],
  mapa: ['peloteo_mapa'],
  peloteo: ['peloteo_mapa', 'peloteo_los10', 'peloteo_objeto'],
  las10: ['peloteo_los10'],
  los10: ['peloteo_los10'],
  objeto: ['peloteo_objeto'],
  despiece: ['peloteo_objeto'],
  leadmagnet: ['lead_magnet'],
  evento: ['evento'],
  tarjeta: ['tarjeta'],
};

export function parsearCampana(campana: string, hasta: string): { pilar: string; fecha: string } | null {
  const m = /^([a-z0-9]+)-(?:.*-)?(\d{1,2})(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)$/.exec(campana);
  if (!m) return null;
  const dia = Number(m[2]);
  const mes = MESES[m[3]];
  if (dia < 1 || dia > 31) return null;
  // El año no va en el UTM: el ultimo que no caiga despues del final del rango.
  let anio = Number(hasta.slice(0, 4));
  const fecha = (a: number) => `${a}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  if (fecha(anio) > hasta) anio -= 1;
  return { pilar: m[1], fecha: fecha(anio) };
}

const sinTildes = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

async function casarConPosts(
  resumen: ResumenDemos,
  hasta: string
): Promise<{ porPost: DemosPorPost; sinCasar: number }> {
  const porPost: DemosPorPost = {};
  let sinCasar = 0;
  // Con por_publicacion se sabe la cuenta; sin el (web antigua), solo campaña.
  const entradas: { campana: string; cuenta: string | null; n: Recuento }[] = resumen.por_publicacion
    ? Object.entries(resumen.por_publicacion).map(([k, n]) => {
        const [campana, cuenta] = k.split('|');
        return { campana, cuenta: cuenta && cuenta !== 'sin-cuenta' ? cuenta : null, n };
      })
    : Object.entries(resumen.por_campana ?? {}).map(([campana, n]) => ({ campana, cuenta: null, n }));

  for (const { campana, cuenta, n } of entradas) {
    const c = campana && campana !== 'sin-publicacion' ? parsearCampana(campana, hasta) : null;
    if (!c) {
      sinCasar += n.solicitudes;
      continue;
    }
    const { rows } = await pool.query<{ id: string; pillar: string | null; name: string | null }>(
      `SELECT p.id, p.pillar, c.name
         FROM posts p JOIN creators c ON c.id = p.creator_id
        WHERE c.is_managed = TRUE
          AND p.deleted_from_linkedin_at IS NULL
          AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
          AND (p.published_at AT TIME ZONE 'Europe/Madrid')::date = $1::date`,
      [c.fecha]
    );
    let candidatos = rows;
    if (cuenta) candidatos = candidatos.filter((r) => sinTildes(r.name || '').split(/\s+/)[0] === sinTildes(cuenta));
    if (candidatos.length > 1 && PILAR_UTM[c.pilar]) {
      candidatos = candidatos.filter((r) => r.pillar && PILAR_UTM[c.pilar].includes(r.pillar));
    }
    if (candidatos.length !== 1) {
      sinCasar += n.solicitudes;
      continue;
    }
    const id = candidatos[0].id;
    const prev = porPost[id];
    porPost[id] = {
      campana,
      solicitudes: (prev?.solicitudes ?? 0) + n.solicitudes,
      cualificadas: (prev?.cualificadas ?? 0) + n.cualificadas,
      oportunidades: (prev?.oportunidades ?? 0) + n.oportunidades,
    };
  }
  return { porPost, sinCasar };
}
