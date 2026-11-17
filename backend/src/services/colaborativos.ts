import pool from '../db';
import { recalcCreatorOutliers } from './outliers';
import { unipileService } from './unipile';

// DETECCION DE COLABORATIVOS (2026-11-04). Ni el post de Unipile ni la pagina de
// LinkedIn dicen quien es coautor, pero el feed del coautor si lo delata: alli el
// colaborativo sale como repost SUYO dos veces (23/10: a 40 y 80 s; 04/11: a 2-3 y
// 3-9 min), y un repost normal sale una sola vez. Medido en los dos colaborativos de
// las cuentas de los jefes y en los reposts normales de esos mismos dias.

// Social ids que el feed de una cuenta trae como repost suyo dos veces o mas.
export function colaborativosEnFeed(rawPosts: any[], providerId: string): string[] {
  const veces = new Map<string, number>();
  for (const r of rawPosts) {
    if (!(r?.is_repost || r?.is_reshare)) continue;
    if (!providerId || r?.reposted_by?.id !== providerId) continue;
    const id = String(r.social_id || r.id || '');
    if (!id) continue;
    veces.set(id, (veces.get(id) ?? 0) + 1);
  }
  return [...veces].filter(([, n]) => n >= 2).map(([id]) => id);
}

// Marca como coautora a la cuenta cuyo feed se acaba de leer en los colaborativos
// que publico OTRA cuenta propia. Solo anade, nunca quita: lo marcado a mano manda.
// Si el post del autor principal aun no esta en la base (los scrapes van en
// paralelo), lo coge la siguiente vuelta del monitor.
export async function marcarColaborativosDelFeed(
  creatorId: string,
  providerId: string,
  rawPosts: any[]
): Promise<number> {
  const ids = colaborativosEnFeed(rawPosts, providerId);
  if (!ids.length) return 0;
  const { rows } = await pool.query(
    `SELECT p.id, p.creator_id
       FROM posts p JOIN creators c ON c.id = p.creator_id
      WHERE c.is_managed = TRUE AND p.creator_id <> $1 AND p.linkedin_post_id = ANY($2::text[])`,
    [creatorId, ids]
  );
  let marcados = 0;
  for (const r of rows) {
    const ins = await pool.query(
      `INSERT INTO post_coautores (post_id, creator_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [r.id, creatorId]
    );
    if (ins.rowCount) {
      marcados++;
      await recalcCreatorOutliers(r.creator_id).catch((e) => console.error('[colaborativos] recalc', e?.message));
    }
  }
  return marcados;
}

// BUSQUEDA DESDE EL AUTOR PRINCIPAL (2026-11-17). Lo de arriba solo corre al leer el
// feed del COAUTOR, y desde el 07/10 los posts nuevos entran con el boton de la cuenta
// que publica: el feed del coautor no se lee nunca y el colaborativo no se marcaba.
// Ademas el coautor acepta la invitacion unos minutos despues de publicar (17/11: el
// boton a los 0 min y los dos reposts del coautor a los 2 min), asi que tambien se
// mira en las vueltas del monitor mientras el post es joven.
// Lee el feed reciente de las OTRAS cuentas propias y marca como coautora a la que
// trae como repost suyo, dos veces, un post de esta cuenta. Una llamada por cuenta.
export async function buscarCoautoresDe(principalId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT id, linkedin_id, unipile_account_id FROM creators
      WHERE is_managed = TRUE AND id <> $1 AND is_manual IS NOT TRUE
        AND linkedin_id IS NOT NULL AND unipile_account_id IS NOT NULL`,
    [principalId]
  );
  const desde = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  let marcados = 0;
  for (const c of rows) {
    try {
      const raws = await unipileService.getPosts(c.linkedin_id, desde, c.unipile_account_id);
      marcados += await marcarColaborativosDelFeed(c.id, c.linkedin_id, raws);
    } catch (e: any) {
      console.warn(`[colaborativos] feed de ${c.id} no leido:`, e?.message);
    }
  }
  return marcados;
}
