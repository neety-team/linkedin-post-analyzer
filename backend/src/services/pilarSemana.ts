/**
 * El pilar que el equipo escribe en SEMANA manda sobre el que adivina el texto.
 *
 * POR QUE EXISTE (2026-11-26): el clasificador (`pillar.ts`) solo lee el texto
 * del post, y desde noviembre el equipo prueba formatos que no estaban en su
 * catalogo: Radar, Opinión, Trastienda técnica, Hito propio. Todos entraban en
 * Cuentas como 'otro' (9 de 9 posts 'otro' de las cuentas propias desde el 20/11
 * tenian su pilar escrito en Semana). Semana ya dice lo que es cada post antes de
 * publicarlo, asi que es la fuente de verdad: este modulo traduce su etiqueta
 * libre ("Radar a tres voces · una comunidad") a un slug del catalogo y empareja
 * cada post de Semana con el suyo de Cuentas.
 *
 * Orden de mando: `pillar_manual` (el badge cambiado a mano) > Semana > texto.
 * Lo que Semana no dice con claridad devuelve null y decide el texto: una
 * etiqueta inventada contamina mas que un hueco.
 *
 * ⚠️ Si el equipo estrena otro pilar, se añade aqui su regla, su fila en la
 * semilla de `pillars` (migrate.ts) y se sube `PILLAR_RULES_VERSION`.
 */
import pool from '../db';
import { esMeme } from '../utils/pilarBase';
import { creadorDeCuenta } from './traerTrasPublicar';

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

function subtipoMeme(todo: string): string | null {
  if (/desgaste/.test(todo)) return 'meme_desgaste';
  if (/grafica/.test(todo)) return 'meme_grafica';
  if (/\b(chat|captura|correo|whatsapp)\b/.test(todo)) return 'meme_captura';
  if (/traductor|dos cajas/.test(todo)) return 'meme_traductor';
  if (/personaje/.test(todo)) return 'meme_personaje';
  return null;
}

/**
 * La etiqueta de Semana → slug del catalogo, o null si no lo dice claro.
 *
 * Manda el PRIMER tramo (antes del primer " · "): es donde el equipo pone el
 * pilar, y lo demas son matices ("voz nueva", "en inglés"). "EXPERIMENTO" delante
 * se salta. `pilarTexto` es lo que dijo el clasificador de texto y `guardado` lo
 * que ya tenia el post: sirven para no perder el formato del peloteo ni el
 * subtipo del meme cuando Semana no los nombra.
 */
export function pilarDeEtiqueta(
  etiqueta: string | null | undefined,
  pilarTexto: string,
  guardado?: string | null
): string | null {
  if (!etiqueta || !etiqueta.trim()) return null;
  const tramos = norm(etiqueta).split(/\s*·\s*/).filter(Boolean);
  if (tramos[0] === 'experimento') tramos.shift();
  if (!tramos.length) return null;
  const cabeza = tramos[0];
  const todo = tramos.join(' · ');

  if (/^radar\b/.test(cabeza)) return 'radar';
  if (/^opinion\b/.test(cabeza)) return 'opinion';
  if (/^trastienda\b/.test(cabeza)) return 'trastienda';
  if (/^hito y evento\b/.test(cabeza) || /^historia\b.*\bevento\b/.test(cabeza)) return 'historia_evento';
  if (/^hito\b/.test(cabeza)) return 'hito';
  if (/^historia\b/.test(cabeza)) return 'historia';
  if (/^noticia\b/.test(cabeza)) return 'noticia';
  // El primer Radar (20/11) se apunto como «Recurso con enlace público»: si el
  // texto se presenta como Radar, es un Radar.
  if (/^(recurso|lead ?magnet)\b/.test(cabeza)) return pilarTexto === 'radar' ? 'radar' : 'lead_magnet';
  if (/\btarjeta\b/.test(cabeza)) return 'tarjeta';
  if (/^evento\b/.test(cabeza)) return 'evento';

  if (/^(peloteo|mapa\b|las 10\b|los 10\b|despiece\b)/.test(cabeza)) {
    if (/\b(orla|las 10|los 10)\b/.test(todo)) return 'peloteo_los10';
    if (/\b(despiece|objeto)\b/.test(todo)) return 'peloteo_objeto';
    if (/\bmapa\b/.test(todo)) return 'peloteo_mapa';
    // Semana dice peloteo pero no el formato: el del texto si es un peloteo.
    return pilarTexto.startsWith('peloteo_') ? pilarTexto : 'peloteo_mapa';
  }

  if (/\bmeme\b/.test(todo)) {
    const sub = subtipoMeme(todo);
    if (sub) return sub;
    for (const p of [pilarTexto, guardado]) if (p && p !== 'meme' && esMeme(p)) return p;
    return 'meme';
  }
  return null;
}

const digitos = (s: string | null | undefined) => (s || '').replace(/\D/g, '');
const primeraLinea = (s: string | null | undefined) => {
  const l = (s || '').split('\n').find((x) => x.trim()) || '';
  return norm(l.replace(/@/g, '')).replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 45);
};
const diaMadrid = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });

export interface SemanaPostPilar {
  id: string;
  cuenta: string;
  fecha: string;
  pilar: string | null;
  texto: string | null;
  linkedin_post_id: string | null;
  linkedin_social_id: string | null;
}
export interface PostCuentas {
  id: string;
  creator_id: string;
  linkedin_post_id: string | null;
  content_text: string | null;
  published_at: Date | string | null;
}

/**
 * Post de Cuentas → post de Semana. Tres pruebas, de la mas segura a la menos:
 *  1. el id de LinkedIn que Semana guardo al publicar;
 *  2. la misma cuenta y la misma primera linea (sin la @ de las menciones);
 *  3. la misma cuenta y el mismo dia, solo si ese dia hay UN post en cada lado.
 * Lo que no casa por ninguna se queda sin emparejar: mejor sin pilar de Semana
 * que con el de otro post.
 */
export function emparejar(
  semana: SemanaPostPilar[],
  posts: PostCuentas[],
  creadores: Record<string, string | null>
): Map<string, string> {
  const pares = new Map<string, string>();
  const usados = new Set<string>();
  const poner = (postId: string, spId: string) => {
    pares.set(postId, spId);
    usados.add(spId);
  };

  for (const sp of semana) {
    const ids = [digitos(sp.linkedin_post_id), digitos(sp.linkedin_social_id)].filter(Boolean);
    if (!ids.length) continue;
    const p = posts.find((x) => !pares.has(x.id) && ids.includes(digitos(x.linkedin_post_id)));
    if (p) poner(p.id, sp.id);
  }
  for (const sp of semana) {
    if (usados.has(sp.id)) continue;
    const creador = creadores[sp.cuenta];
    const linea = primeraLinea(sp.texto);
    if (!creador || linea.length < 15) continue;
    const p = posts.find((x) => !pares.has(x.id) && x.creator_id === creador && primeraLinea(x.content_text) === linea);
    if (p) poner(p.id, sp.id);
  }
  for (const sp of semana) {
    if (usados.has(sp.id)) continue;
    const creador = creadores[sp.cuenta];
    if (!creador) continue;
    const mismoDiaSemana = semana.filter((o) => o.cuenta === sp.cuenta && o.fecha === sp.fecha);
    const mismoDiaPosts = posts.filter(
      (x) => x.creator_id === creador && x.published_at && diaMadrid(new Date(x.published_at)) === sp.fecha
    );
    if (mismoDiaSemana.length === 1 && mismoDiaPosts.length === 1 && !pares.has(mismoDiaPosts[0].id)) {
      poner(mismoDiaPosts[0].id, sp.id);
    }
  }
  return pares;
}

/** post_id de Cuentas → etiqueta de pilar de Semana, para los posts que casan. */
export async function etiquetasDeSemana(creatorId?: string): Promise<Map<string, string>> {
  const { rows: semana } = await pool.query(
    `SELECT id, cuenta, to_char(fecha, 'YYYY-MM-DD') AS fecha, pilar, texto, linkedin_post_id, linkedin_social_id
       FROM semana_posts
      WHERE COALESCE(TRIM(pilar), '') <> ''
        AND (estado IN ('publicado', 'programado') OR linkedin_post_id IS NOT NULL)`
  );
  if (!semana.length) return new Map();
  const { rows: creadoresRows } = await pool.query(`SELECT id, name FROM creators WHERE is_managed = TRUE`);
  const creadores: Record<string, string | null> = {};
  for (const c of new Set(semana.map((s) => s.cuenta))) creadores[c] = creadorDeCuenta(c, creadoresRows);
  const ids = Object.values(creadores).filter((x): x is string => !!x);
  if (!ids.length) return new Map();
  const desde = semana.map((s) => s.fecha).sort()[0];
  const { rows: posts } = await pool.query(
    `SELECT id, creator_id, linkedin_post_id, content_text, published_at
       FROM posts
      WHERE creator_id = ANY($1::uuid[])
        AND published_at >= ($2::date - interval '3 days')
        ${creatorId ? 'AND creator_id = $3' : ''}`,
    creatorId ? [ids, desde, creatorId] : [ids, desde]
  );
  const porId = new Map(semana.map((s) => [s.id, s.pilar as string]));
  const out = new Map<string, string>();
  for (const [postId, spId] of emparejar(semana, posts, creadores)) out.set(postId, porId.get(spId)!);
  return out;
}

/**
 * Escribe el pilar de Semana en los posts de Cuentas que casan (nunca en uno
 * cambiado a mano). Se llama al traer posts nuevos y al cambiar un pilar en
 * Semana. No lanza: es mantenimiento, un fallo no puede tumbar el scrape.
 */
export async function aplicarPilaresDeSemana(creatorId?: string): Promise<number> {
  try {
    const etiquetas = await etiquetasDeSemana(creatorId);
    if (!etiquetas.size) return 0;
    const { rows } = await pool.query(
      `SELECT id, pillar FROM posts WHERE id = ANY($1::uuid[]) AND pillar_manual IS NOT TRUE`,
      [[...etiquetas.keys()]]
    );
    const cambios: { id: string; pilar: string }[] = [];
    for (const r of rows) {
      const pilar = pilarDeEtiqueta(etiquetas.get(r.id), r.pillar || 'otro', r.pillar);
      if (pilar && pilar !== r.pillar) cambios.push({ id: r.id, pilar });
    }
    if (cambios.length) {
      await pool.query(
        `UPDATE posts SET pillar = c.pilar
           FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS pilar) c
          WHERE posts.id = c.id`,
        [cambios.map((c) => c.id), cambios.map((c) => c.pilar)]
      );
      console.log(`[pilarSemana] ${cambios.length} post(s) con el pilar de Semana`);
    }
    return cambios.length;
  } catch (e: any) {
    console.error('[pilarSemana] no se pudo aplicar el pilar de Semana:', e?.message);
    return 0;
  }
}
