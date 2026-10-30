/**
 * REPROCESADO DEL PILAR.
 *
 * POR QUE EXISTE (Iker, 2026-08-13)
 * ---------------------------------
 * El pilar se escribe al INGERIR el post, asi que un post que entro con las
 * reglas viejas se queda con la etiqueta vieja para siempre. Paso de verdad: la
 * historia de Iker se publico a las 10:55, el fix del clasificador se commiteo
 * a las 11:04, y el post se quedo etiquetado `meme` hasta que el lo vio en la
 * parrilla. La regla estaba bien; lo que faltaba era volver a pasarla.
 *
 * Iker pidio dos cosas que tiran en direcciones opuestas:
 *   · "me parece bien que cada despliegue reprocese solo"
 *   · "pero no hagas que cada dia se vuelva a reclasificar"
 *
 * Se cumplen las dos con una GUARDA DE VERSION: `PILLAR_RULES_VERSION` vive en
 * `pillar.ts` y se sube a mano al cambiar una regla. Al arrancar se compara con
 * la ultima guardada en `app_state`. Distintas → reproceso una vez. Iguales →
 * ni una consulta de escritura. O sea, el disparador es el CAMBIO DE REGLAS, no
 * el arranque ni el calendario.
 */
import pool from '../db';
import { classifyPillar, PILLAR_RULES_VERSION } from './pillar';
import { esMeme } from '../utils/pilarBase';

const CLAVE = 'pillar_rules_version';

/**
 * Reclasifica todo el historico salvo lo corregido a mano.
 *
 * `pillar_manual` se respeta siempre: es la unica forma de arreglar los
 * formatos que el clasificador no puede acertar por estructura, y tiene que
 * sobrevivir a cualquier reproceso.
 *
 * Escribe SOLO las filas que cambian, y en UNA sentencia. Con el UPDATE dentro
 * del bucle esto eran cientos de idas y vueltas a Postgres.
 */
export async function reclassifyAllPosts(
  opts: { soloVacios?: boolean } = {}
): Promise<{ revisados: number; escritos: number; por_pilar: Record<string, number>; cambios: { id: string; pilar: string }[] }> {
  const { rows } = await pool.query(
    `SELECT id, content_text, reaction_mix, content_type, pillar
       FROM posts
      WHERE linkedin_post_id <> 'DEMO_LIVE_POST'
        AND pillar_manual IS NOT TRUE
        ${opts.soloVacios ? 'AND pillar IS NULL' : ''}`
  );

  const por_pilar: Record<string, number> = {};
  const cambios: { id: string; pilar: string }[] = [];
  for (const r of rows) {
    const pilar = classifyPillar({
      content_text: r.content_text,
      reaction_mix: r.reaction_mix,
      content_type: r.content_type,
    });
    por_pilar[pilar] = (por_pilar[pilar] || 0) + 1;
    // El subtipo del meme lo pone la lectura de la imagen (postImageText) y el
    // clasificador solo sabe decir 'meme': si los dos dicen meme, se queda el subtipo.
    if (pilar === 'meme' && esMeme(r.pillar)) continue;
    if (pilar !== r.pillar) cambios.push({ id: r.id, pilar });
  }

  if (cambios.length) {
    await pool.query(
      `UPDATE posts SET pillar = c.pilar
         FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS pilar) c
        WHERE posts.id = c.id`,
      [cambios.map((c) => c.id), cambios.map((c) => c.pilar)]
    );
  }

  return { revisados: rows.length, escritos: cambios.length, por_pilar, cambios };
}

/**
 * Se llama al arrancar, DESPUES de las migraciones. No lanza nunca: un fallo
 * aqui no puede tumbar el servidor, porque esto es mantenimiento y no arranque.
 */
export async function reclassifyIfRulesChanged(): Promise<void> {
  try {
    const { rows } = await pool.query(`SELECT value FROM app_state WHERE key = $1`, [CLAVE]);
    const guardada = rows[0]?.value ?? null;

    if (guardada === PILLAR_RULES_VERSION) {
      console.log(`[pillar] reglas sin cambios (${PILLAR_RULES_VERSION}), no se reprocesa`);
      return;
    }

    console.log(`[pillar] reglas nuevas: ${guardada ?? 'ninguna'} → ${PILLAR_RULES_VERSION}. Reprocesando…`);
    const res = await reclassifyAllPosts();
    // Se listan los cambios, no solo el numero: si un reproceso mueve algo que
    // estaba bien, queremos verlo en el log del despliegue y no descubrirlo
    // semanas despues mirando una grafica rara.
    console.log(
      `[pillar] reprocesado: ${res.revisados} revisados, ${res.escritos} reetiquetados` +
        (res.escritos ? ` → ${res.cambios.slice(0, 20).map((c) => `${c.id.slice(0, 8)}=${c.pilar}`).join(', ')}` : '')
    );

    await pool.query(
      `INSERT INTO app_state (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [CLAVE, PILLAR_RULES_VERSION]
    );
  } catch (err: any) {
    console.error('[pillar] el reprocesado de arranque fallo:', err?.message);
  }
}
