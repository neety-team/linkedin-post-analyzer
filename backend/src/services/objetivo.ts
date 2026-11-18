/**
 * EL OBJETIVO DE CADA POST EN CUENTAS (2026-11-18).
 *
 * El objetivo es la INTENCION con la que se publico el post, no lo que consiguio:
 * un meme se sube buscando alcance aunque luego traiga una demo. Tres valores,
 * los mismos que planifica Semana, y sin subtipos (ni leads ni demos).
 *
 * De donde sale, por prioridad (se calcula AL LEER, para que un cambio de pilar
 * o un post recien enlazado desde Semana se vea sin reprocesar nada):
 *   1. Cambiado a mano en Cuentas (`objetivo_origen = 'manual'`). Manda siempre.
 *   2. Planificado en Semana: el post de `semana_posts` enlazado por su id de
 *      LinkedIn o, si no hay enlace, el unico planificado para esa cuenta ese dia
 *      cuando la cuenta solo publico uno ese dia.
 *   3. Antes del inicio de la estrategia no hay objetivo.
 *   4. El barrido del historico (`objetivo_origen = 'barrido'`), que se escribio
 *      leyendo el texto de los posts que la regla del pilar no cubre.
 *   5. La regla del pilar.
 * Solo en cuentas propias: la competencia no tiene objetivo que conozcamos.
 */

export const OBJETIVOS = ['alcance', 'notoriedad', 'conversion'] as const;
export type Objetivo = (typeof OBJETIVOS)[number];

export function esObjetivo(v: unknown): v is Objetivo {
  return typeof v === 'string' && (OBJETIVOS as readonly string[]).includes(v);
}

/** Primer post de la estrategia. Antes de esto no se publicaba con objetivo. */
export const INICIO_ESTRATEGIA = '2026-04-14';

/**
 * La prioridad real de cada pilar, la misma con la que se planifica la semana.
 * Los pilares de meme llevan subtipo en el slug (`meme_captura`...) y los de
 * peloteo tambien (`peloteo_mapa`...), por eso se mira el prefijo.
 * Tarjeta, otro y los pilares creados a mano no tienen regla: o los decide el
 * barrido o alguien a mano.
 */
export function objetivoPorPilar(pilar: string | null | undefined): Objetivo | null {
  if (!pilar) return null;
  if (pilar === 'meme' || pilar.startsWith('meme_')) return 'alcance';
  if (pilar === 'peloteo' || pilar.startsWith('peloteo_')) return 'alcance';
  if (pilar === 'evento' || pilar === 'historia_evento') return 'notoriedad';
  if (pilar === 'lead_magnet' || pilar === 'historia') return 'conversion';
  return null;
}

/** La misma regla en SQL. ⚠️ Si cambia `objetivoPorPilar`, se cambia aqui en el mismo commit. */
function sqlPorPilar(col: string): string {
  return `CASE
      WHEN ${col} = 'meme' OR ${col} LIKE 'meme\\_%' THEN 'alcance'
      WHEN ${col} = 'peloteo' OR ${col} LIKE 'peloteo\\_%' THEN 'alcance'
      WHEN ${col} IN ('evento', 'historia_evento') THEN 'notoriedad'
      WHEN ${col} IN ('lead_magnet', 'historia') THEN 'conversion'
    END`;
}

/**
 * `LEFT JOIN LATERAL` que añade `obj.objetivo` y `obj.objetivo_fuente`
 * ('manual' | 'semana' | 'barrido' | 'pilar'). Necesita en el FROM un alias de
 * posts (con id, creator_id, linkedin_post_id, published_at, pillar, objetivo y
 * objetivo_origen) y uno de creators (con name e is_managed).
 */
export function sqlObjetivoLateral(p = 'p', c = 'c'): string {
  const dia = (alias: string) => `(${alias}.published_at AT TIME ZONE 'Europe/Madrid')::date`;
  const digitos = (expr: string) => `regexp_replace(${expr}, '[^0-9]', '', 'g')`;
  return `LEFT JOIN LATERAL (
      SELECT sp.objetivo
        FROM semana_posts sp
       WHERE ${c}.is_managed = TRUE
         AND sp.objetivo IS NOT NULL
         AND (
           (sp.linkedin_post_id IS NOT NULL AND ${p}.linkedin_post_id IS NOT NULL
             AND ${digitos('sp.linkedin_post_id')} <> ''
             AND ${digitos('sp.linkedin_post_id')} = ${digitos(`${p}.linkedin_post_id`)})
           OR (
             sp.cuenta = lower(split_part(trim(${c}.name), ' ', 1))
             AND sp.fecha = ${dia(p)}
             AND NOT EXISTS (SELECT 1 FROM semana_posts sp2
                              WHERE sp2.cuenta = sp.cuenta AND sp2.fecha = sp.fecha AND sp2.id <> sp.id)
             AND NOT EXISTS (SELECT 1 FROM posts p2
                              WHERE p2.creator_id = ${p}.creator_id AND p2.id <> ${p}.id
                                AND p2.deleted_from_linkedin_at IS NULL
                                AND ${dia('p2')} = sp.fecha)
           )
         )
       ORDER BY (sp.linkedin_post_id IS NOT NULL
                 AND ${digitos('sp.linkedin_post_id')} = ${digitos(`COALESCE(${p}.linkedin_post_id, '')`)}) DESC
       LIMIT 1
    ) obj_sem ON TRUE
    LEFT JOIN LATERAL (
      SELECT f.objetivo_fuente,
             CASE f.objetivo_fuente
               WHEN 'manual' THEN ${p}.objetivo
               WHEN 'semana' THEN obj_sem.objetivo
               WHEN 'barrido' THEN ${p}.objetivo
               WHEN 'pilar' THEN ${sqlPorPilar(`${p}.pillar`)}
             END AS objetivo
        FROM (SELECT CASE
                WHEN ${c}.is_managed IS NOT TRUE THEN NULL
                WHEN ${p}.objetivo_origen = 'manual' AND ${p}.objetivo IS NOT NULL THEN 'manual'
                WHEN obj_sem.objetivo IS NOT NULL THEN 'semana'
                WHEN ${p}.published_at IS NULL OR ${p}.published_at < '${INICIO_ESTRATEGIA}'::date THEN NULL
                WHEN ${p}.objetivo IS NOT NULL THEN 'barrido'
                WHEN ${sqlPorPilar(`${p}.pillar`)} IS NOT NULL THEN 'pilar'
              END AS objetivo_fuente) f
    ) obj ON TRUE`;
}
