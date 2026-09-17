import pool from '../db';
import { unipileService, esRepost } from './unipile';
import { calculateEngagement } from './engagement';
import { recalcCreatorOutliers } from './outliers';
import { refrescarPostManual } from './manualPost';
import { captureAccountSnapshots } from './accountSnapshots';
import { runFollowerSync } from './followerSync';
import { fetchPremiumAnalytics, savePremiumAnalytics } from './premiumAnalytics';
import { resumirMemesPendientes } from './postImageText';

// Phase-based snapshot cadence for LinkedIn posts.
// The algorithm distributes posts in waves, so we sample densely in the golden hour
// (decisive for distribution) and taper off as the curve flattens. ~35 snapshots/post/week.
//
//   Phase           Window         Cadence   Snapshots   Why
//   golden          0 – 1h         15 min    ~4          Decides distribution
//   first_wave      1 – 6h         30 min    ~10         Slope still steep
//   consolidation   6 – 24h        2h        ~9          Bulk of reach accumulates
//   long_tail       24 – 72h       6h        ~8          85–90% of final data
//   tail            72h – 7d       24h       ~4          Trickle, freeze final metrics
//   closed          > 7d           —         0           Done
//
// The worker ticks every 15 min (golden-hour resolution) and lets each post decide
// whether enough time has passed since its last snapshot.

const TICK_MS = 15 * 60 * 1000;
const MONITOR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
// Tolerance so scheduling jitter doesn't push a snapshot one full tick forward
const DUE_TOLERANCE_MS = 30 * 1000;

// In-flight guard + last-run timestamp so opportunistic ticks from HTTP requests
// don't pile up or double-fire alongside the background setInterval.
let tickInFlight = false;
let lastTickAt = 0;

function requiredIntervalMs(ageMs: number): number | null {
  if (ageMs < 1 * HOUR_MS) return 15 * 60 * 1000;
  if (ageMs < 6 * HOUR_MS) return 30 * 60 * 1000;
  if (ageMs < 24 * HOUR_MS) return 2 * HOUR_MS;
  if (ageMs < 72 * HOUR_MS) return 6 * HOUR_MS;
  if (ageMs < 7 * 24 * HOUR_MS) return 24 * HOUR_MS;
  return null;
}

// force=true ignores per-phase cadence (used by the manual Refresh button in the UI).
async function tick(force = false): Promise<{ captured: number; candidates: number }> {
  if (tickInFlight) return { captured: 0, candidates: 0 };
  tickInFlight = true;
  try {
    // Primero se buscan posts nuevos, para que entren ya en la cola de abajo.
    try {
      await descubrirPostsNuevos();
    } catch (e: any) {
      console.warn('[postMonitor] busqueda de posts nuevos fallo:', e?.message);
    }

    // All managed-account posts within the 7-day window; we'll filter per-post by
    // phase cadence in JS so each post only gets hit at its own required interval.
    const { rows: candidates } = await pool.query(
      `SELECT p.id, p.linkedin_post_id, p.published_at,
              c.id AS creator_id, c.linkedin_id, c.unipile_account_id, c.is_manual,
              (SELECT MAX(s.captured_at) FROM post_snapshots s WHERE s.post_id = p.id) AS last_snapshot_at,
              p.premium_analytics_at,
              p.likes_count, p.comments_count, p.reposts_count, p.impressions_count
       FROM posts p
       JOIN creators c ON c.id = p.creator_id
       WHERE c.is_managed = TRUE
         -- Conectadas por Unipile O manuales. Las manuales no tienen
         -- account_id a proposito (migracion v38); sin este OR sus posts
         -- entrarian en Live posts pero su curva no creceria nunca.
         AND (c.unipile_account_id IS NOT NULL OR c.is_manual = TRUE)
         AND p.published_at IS NOT NULL
         AND p.published_at > NOW() - INTERVAL '7 days'
         AND p.linkedin_post_id <> 'DEMO_LIVE_POST'`
    );

    const now = Date.now();
    const targets = candidates.filter((c) => {
      const age = now - new Date(c.published_at).getTime();
      const interval = requiredIntervalMs(age);
      if (interval === null) return false;
      if (force) return true;
      if (!c.last_snapshot_at) return true;
      const sinceLast = now - new Date(c.last_snapshot_at).getTime();
      return sinceLast >= interval - DUE_TOLERANCE_MS;
    });

    // ⭐ ANALITICA PREMIUM DE LOS POSTS DE LA SEMANA: clics al enlace, guardados,
    // envios, visitas al perfil y seguidores ganados. Nada de esto viene en el
    // feed; se lee del HTML de la pagina de analiticas (ver premiumAnalytics.ts).
    //
    // DESACOPLADA DEL SNAPSHOT (Iker, 2026-09-17). Antes se pedia dentro del
    // bucle de snapshots, o sea solo cuando al post le tocaba foto Y aparecia en
    // el feed. Resultado: el meme de Iker del 16/09 llevaba 119 clics en LinkedIn
    // y la herramienta seguia con 2, los de su primera hora. Mientras el feed
    // venia vacio no se pidio nunca, y cuando falla una vez el reintento esperaba
    // al siguiente snapshot (2h, 6h o 24h segun la fase). Ahora corre en cada
    // vuelta, con su propia cadencia por edad (ver refrescarAnaliticaPostsRecientes).
    try {
      await refrescarAnaliticaPostsRecientes(candidates);
    } catch (e: any) {
      console.warn('[postMonitor] analitica de posts recientes fallo:', e?.message);
    }

    // Los posts de mas de 7 dias siguen acumulando clics y su analitica Premium
    // no la toca nadie mas (ver `refrescarAnaliticaPostsViejos`). Va AQUI, ANTES
    // del return de abajo, y no al final del tick: si no hay ningun post reciente
    // que fotografiar la funcion sale antes de tiempo, y entonces el pase semanal
    // no correria justo en las semanas sin publicaciones, que son en las que la
    // cola de posts viejos se acumula. No necesita el feed, solo el id del post.
    try {
      await refrescarAnaliticaPostsViejos();
    } catch (e: any) {
      console.warn('[postMonitor] pase semanal de analitica fallo:', e?.message);
    }
    // Mismo motivo para los contadores publicos (ver `refrescarContadoresPostsViejos`).
    try {
      await refrescarContadoresPostsViejos();
    } catch (e: any) {
      console.warn('[postMonitor] pase semanal de contadores fallo:', e?.message);
    }

    if (targets.length === 0) return { captured: 0, candidates: candidates.length };

    console.log(`[postMonitor] ${force ? 'forced ' : ''}ticking — ${targets.length}/${candidates.length} post(s) due for snapshot`);

    // Group by creator so we only hit Unipile once per account
    const byCreator = new Map<string, typeof targets>();
    for (const t of targets) {
      const list = byCreator.get(t.creator_id) || [];
      list.push(t);
      byCreator.set(t.creator_id, list);
    }

    const touchedCreators = new Set<string>();

    for (const [creatorId, posts] of byCreator.entries()) {
      const first = posts[0];

      // CUENTAS MANUALES: no tenemos su sesion, asi que no se puede recorrer su
      // feed pidiendo impresiones. Se lee post a post con la sesion prestada,
      // que para contadores publicos basta. Son pocos posts y ademas asi no nos
      // traemos su contenido personal, que no es asunto nuestro.
      //
      // Lo que esta rama NO hace, a proposito: tocar impressions_count. En un
      // post ajeno Unipile devuelve 0, y escribir ese 0 borraria las impresiones
      // que el usuario ha copiado a mano de LinkedIn. Son el dato mas caro de
      // conseguir aqui; solo los cambia otra escritura a mano.
      if (first.is_manual) {
        for (const target of posts) {
          if (!target.linkedin_post_id) continue;
          const r = await refrescarPostManual(String(target.id), String(target.linkedin_post_id));
          if (r.ok) touchedCreators.add(creatorId);
          else console.warn(`[postMonitor] post manual ${target.id} no refrescado:`, r.motivo);
        }
        continue;
      }

      if (!first.linkedin_id || !first.unipile_account_id) continue;

      try {
        // Fetch recent posts with the creator's own account so impressions come through
        const since = new Date(Date.now() - MONITOR_WINDOW_MS - 60 * 60 * 1000);
        const raws = await unipileService.getPosts(first.linkedin_id, since, first.unipile_account_id);

        const byLinkedInId = new Map<string, any>();
        for (const r of raws) {
          const id = r.social_id || r.id;
          if (id) byLinkedInId.set(String(id), r);
        }

        for (const target of posts) {
          const raw = target.linkedin_post_id ? byLinkedInId.get(String(target.linkedin_post_id)) : null;
          if (!raw) {
            // Antes este salto era mudo, y un feed vacio por un repost viejo
            // dejo a dos cuentas 20 horas sin snapshots sin una sola linea de log.
            console.warn(`[postMonitor] post ${target.id} no esta en el feed de ${creatorId} (${raws.length} items): sin snapshot`);
            continue;
          }

          const normalized = unipileService.normalizePost(raw, creatorId);

          // ⛔ ESCUDO ANTI-CERO (2026-09-17). Unipile devuelve a ratos un post con
          // todos los contadores a 0 (medido: 15 de 169 en una lectura, 0 en la
          // siguiente). Antes eso se escribia tal cual: likes a 0 en el post y un
          // punto a 0 en la curva. Un post que ya tenia likes o impresiones no
          // los pierde, asi que esa lectura se descarta entera (sin snapshot) y
          // la siguiente vuelta lo vuelve a intentar.
          const degradado =
            (Number(target.impressions_count) > 0 && !(Number(normalized.impressions_count) > 0)) ||
            (Number(target.likes_count) > 0 && !(Number(normalized.likes_count) > 0));
          if (degradado) {
            console.warn(`[postMonitor] lectura degradada de ${target.id} (contadores a 0): se descarta, sin snapshot`);
            continue;
          }
          const noBaja = (nuevo: any, viejo: any) =>
            Number(nuevo) > 0 ? Number(nuevo) : Number(viejo) || 0;
          normalized.comments_count = noBaja(normalized.comments_count, target.comments_count);
          normalized.reposts_count = noBaja(normalized.reposts_count, target.reposts_count);
          const engagement = calculateEngagement(normalized);

          // Persist the snapshot
          await pool.query(
            `INSERT INTO post_snapshots (post_id, impressions_count, likes_count, comments_count, reposts_count)
             VALUES ($1, $2, $3, $4, $5)`,
            [target.id, normalized.impressions_count, normalized.likes_count, normalized.comments_count, normalized.reposts_count]
          );

          // Only touch the live counters. outlier_ratio/is_outlier are recomputed
          // per-creator below once all posts are in so the multipliers don't drift to 0.
          await pool.query(
            `UPDATE posts SET
               likes_count = $2,
               comments_count = $3,
               reposts_count = $4,
               impressions_count = COALESCE($5, impressions_count),
               engagement_score = $6,
               content_text = COALESCE($7, content_text)
             WHERE id = $1`,
            [target.id, normalized.likes_count, normalized.comments_count, normalized.reposts_count, normalized.impressions_count, engagement, normalized.content_text]
          );

          touchedCreators.add(creatorId);
        }
      } catch (err: any) {
        console.error(`[postMonitor] creator ${creatorId} failed:`, err?.message);
      }
    }

    // Recalculate outlier ratios for every creator whose posts got new numbers.
    // The average has shifted, so all their posts' multipliers need a refresh.
    // recalcCreatorOutliers picks the engagement-RATE method for managed
    // accounts (impressions are real there) and the absolute method elsewhere.
    for (const creatorId of touchedCreators) {
      try {
        await recalcCreatorOutliers(creatorId);
      } catch (err: any) {
        console.error(`[postMonitor] recalc outliers for ${creatorId} failed:`, err?.message);
      }
    }
    return { captured: targets.length, candidates: candidates.length };
  } catch (err: any) {
    console.error('[postMonitor] tick failed:', err?.message);
    return { captured: 0, candidates: 0 };
  } finally {
    tickInFlight = false;
    lastTickAt = Date.now();
    // La imagen de cada meme NUEVO nuestro, resumida en texto una sola vez para
    // las respuestas (`postImageText`). Va en el finally porque el tick sale
    // antes si no hay snapshots que tomar, y el meme recien publicado tambien
    // tiene que resumirse. Sin await: no retrasa el monitor.
    void resumirMemesPendientes();
  }
}

// ⭐⭐ PASE SEMANAL DE ANALITICA PREMIUM PARA POSTS DE MAS DE 7 DIAS (Mario, 2026-09-14)
//
// EL AGUJERO QUE TAPA: el bucle de arriba solo mira posts de menos de 7 dias,
// asi que la analitica Premium —clics al enlace, guardados, envios, boton— se
// refrescaba cada 6 horas durante una semana y despues NO SE TOCABA NUNCA MAS.
// (Las metricas publicas tenian el mismo agujero; ver el pase de abajo,
// `refrescarContadoresPostsViejos`.) Resultado: un post que sigue vivo acumula
// clics que no llegan a la BD, y la conversion sale infravalorada SIEMPRE y de
// forma desigual entre pilares (un mapa vive semanas, un meme muere en 48h).
// Medido el 14/09 con el mapa de Cantabria: la BD lo tenia congelado en el dia
// 7 y LinkedIn ya iba un 25% por encima en todos los contadores.
//
// Mario: *"pasados siete días que no se actualicen lo entiendo, pero eso de
// nunca es un error garrafal. Una llamada una vez a la semana no pasa nada."*
//
// POR QUE SEMANAL Y NO MAS: es una peticion por post y Unipile devuelve listas
// vacias cuando LinkedIn le mete rate limit, que es el mismo cupo que paga
// TODO el scraping. Con ~9 posts a la semana, la cola en regimen son ~16
// refrescos al dia; con 2 por vuelta y 96 vueltas diarias sobra capacidad.
//
// POR QUE EL TECHO ES 365 DIAS (subido desde 90 el 2026-09-17): se suponia que
// LinkedIn dejaba de servir los bloques pasados 90 dias, y no es asi. Medido ese
// dia: posts de Iker de abril, mayo y junio (3-5 meses) y uno de diciembre de
// 2025 dieron la pagina completa y correcta. Uno de 2023 si la dio con ceros,
// y esos ya no pisan nada (GREATEST en `savePremiumAnalytics`).
//
// NO HACE SNAPSHOT a proposito: la curva del post ya esta cerrada y un punto
// suelto cada semana ensuciaria la grafica. Esto solo actualiza contadores.
const ANALYTICS_OLD_PER_TICK = 2;
const OLD_ANALYTICS_MAX_AGE_DAYS = 365;

// Tope de llamadas de analitica de posts recientes por vuelta. Cada una es una
// peticion a LinkedIn, y el rate limit se paga en TODO el scraping.
const ANALYTICS_RECENT_PER_TICK = 6;
// Respiro entre peticiones a la pagina de analiticas. El relleno retroactivo
// (`/backfill-premium-analytics`) ya documento que sin pausa LinkedIn corta y
// devuelve paginas vacias; el tick las encadenaba sin ninguna.
const ANALYTICS_PAUSE_MS = 1500;
const pausa = () => new Promise((r) => setTimeout(r, ANALYTICS_PAUSE_MS));

// Un intento fallido cuenta como lectura: se reintenta en el siguiente
// intervalo de su fase (30 min a 24h), no en cada vuelta. Un post borrado de
// 2 dias gasta asi 4 llamadas al dia, no 96.
const reintentarAnaliticaReciente = (id: string) =>
  pool.query(`UPDATE posts SET premium_analytics_at = NOW() WHERE id = $1`, [id]);
const reintentarAnaliticaVieja = (id: string) =>
  pool.query(
    `UPDATE posts SET premium_analytics_at = NOW() - INTERVAL '6 days' WHERE id = $1`,
    [id]
  );

async function refrescarAnaliticaPostsRecientes(candidates: any[]): Promise<number> {
  // CADENCIA POR EDAD (Iker, 2026-09-17, segunda vuelta). Con 6h fijas, un post
  // se leia al publicarse (0 guardados) y no otra vez hasta 6h despues: el lead
  // magnet de Asier llevaba 3 guardados y 8 envios en LinkedIn y aqui 0. Ahora
  // sigue las fases de los snapshots con un suelo de 30 min: 30 min las
  // primeras 6h, luego 2h, 6h y 24h (~33 lecturas por post en su semana).
  const ahora = Date.now();
  const toca = (c: any) => {
    const intervalo = requiredIntervalMs(ahora - new Date(c.published_at).getTime());
    if (intervalo == null) return false;
    if (!c.premium_analytics_at) return true;
    const desde = ahora - new Date(c.premium_analytics_at).getTime();
    return desde >= Math.max(intervalo, 30 * 60 * 1000) - DUE_TOLERANCE_MS;
  };
  const pendientes = candidates
    .filter((c) => toca(c) && !c.is_manual && c.unipile_account_id && c.linkedin_post_id)
    // El que lleva mas tiempo sin mirarse primero; los nunca mirados, delante.
    .sort((a, b) =>
      (a.premium_analytics_at ? new Date(a.premium_analytics_at).getTime() : 0) -
      (b.premium_analytics_at ? new Date(b.premium_analytics_at).getTime() : 0))
    .slice(0, ANALYTICS_RECENT_PER_TICK);

  let hechos = 0;
  for (const [i, p] of pendientes.entries()) {
    if (i > 0) await pausa();
    try {
      const a = await fetchPremiumAnalytics(String(p.linkedin_post_id), p.unipile_account_id);
      if (a) {
        await savePremiumAnalytics(pool, p.id, a);
        hechos++;
      } else {
        await reintentarAnaliticaReciente(p.id);
      }
    } catch (e: any) {
      // Un fallo de red tambien se reprograma: si no, el post se queda primero
      // en la cola y bloquea a los demas en cada vuelta.
      console.warn(`[postMonitor] analytics failed for ${p.id}:`, e?.message);
      await reintentarAnaliticaReciente(p.id).catch(() => {});
    }
  }
  if (pendientes.length) {
    console.log(`[postMonitor] analitica reciente: ${hechos}/${pendientes.length} post(s) actualizados`);
  }
  return hechos;
}

async function refrescarAnaliticaPostsViejos(): Promise<number> {
  const { rows } = await pool.query(
    `SELECT p.id, p.linkedin_post_id, c.unipile_account_id
       FROM posts p
       JOIN creators c ON c.id = p.creator_id
      WHERE c.is_managed = TRUE
        AND c.unipile_account_id IS NOT NULL
        AND c.is_manual IS NOT TRUE
        AND p.published_at IS NOT NULL
        AND p.linkedin_post_id <> 'DEMO_LIVE_POST'
        AND p.published_at <  NOW() - INTERVAL '7 days'
        AND p.published_at >  NOW() - ($1 || ' days')::interval
        AND (p.premium_analytics_at IS NULL
             OR p.premium_analytics_at < NOW() - INTERVAL '7 days')
      ORDER BY p.premium_analytics_at ASC NULLS FIRST
      LIMIT $2`,
    [String(OLD_ANALYTICS_MAX_AGE_DAYS), ANALYTICS_OLD_PER_TICK]
  );

  let hechos = 0;
  for (const p of rows) {
    await pausa();
    try {
      const a = await fetchPremiumAnalytics(String(p.linkedin_post_id), p.unipile_account_id);
      if (a) {
        await savePremiumAnalytics(pool, p.id, a);
        hechos++;
      } else {
        // La pagina no se pudo leer. Se reprograma para MANANA, no para la
        // semana que viene: LinkedIn la sirve vacia a ratos y un post vivo no
        // puede perder una semana por una lectura mala. Tampoco se reintenta
        // en la vuelta siguiente, para no bloquear la cola.
        await reintentarAnaliticaVieja(p.id);
      }
    } catch (e: any) {
      console.warn(`[postMonitor] analitica semanal fallo para ${p.id}:`, e?.message);
      await reintentarAnaliticaVieja(p.id).catch(() => {});
    }
  }
  if (hechos) console.log(`[postMonitor] analitica semanal: ${hechos} post(s) de mas de 7 dias actualizados`);
  return hechos;
}

// ⭐⭐ DESCUBRIMIENTO AUTOMATICO DE POSTS NUEVOS (2026-09-17)
//
// EL AGUJERO: el tick solo actualiza posts que YA estan en la BD. Los nuevos
// entraban por el boton "Get new posts" o por el anunciador del Google Chat, y
// ese caduco el 11/09. Un post que nadie traia no tenia curva, ni hora dorada,
// ni analitica, hasta que alguien pulsaba el boton.
//
// CADENCIA: cada vuelta (15 min) de 8:00 a 20:59 de Madrid, que es cuando se
// publica y cuando la hora dorada importa; cada hora el resto. Es el scrape
// incremental del boton pero SIN la llamada de perfil (sinPerfil): 1 pagina
// del feed por cuenta, ~180 llamadas al dia entre las tres.
let ultimoDescubrimiento = 0;

async function descubrirPostsNuevos(): Promise<number> {
  const hora = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false,
  }).format(new Date()));
  const cada = hora >= 8 && hora < 21 ? TICK_MS : HOUR_MS;
  if (Date.now() - ultimoDescubrimiento < cada - DUE_TOLERANCE_MS) return 0;
  ultimoDescubrimiento = Date.now();

  // Import dinamico: routes/accounts importa este modulo, y al reves se
  // formaria un ciclo en la carga.
  const { scrapeCreatorPosts } = await import('../routes/accounts');
  const { rows } = await pool.query(
    `SELECT id FROM creators
      WHERE is_managed = TRUE AND unipile_account_id IS NOT NULL AND is_manual IS NOT TRUE`
  );
  let nuevos = 0;
  for (const { id } of rows) {
    try {
      const r = await scrapeCreatorPosts(id, { sinPerfil: true });
      nuevos += r.scraped;
    } catch (e: any) {
      console.warn(`[postMonitor] descubrimiento fallo para ${id}:`, e?.message);
    }
  }
  if (nuevos) console.log(`[postMonitor] descubrimiento: ${nuevos} post(s) nuevo(s)`);
  return nuevos;
}

// ⭐⭐ PASE SEMANAL DE CONTADORES PUBLICOS PARA POSTS DE MAS DE 7 DIAS (Iker, 2026-09-17)
//
// EL AGUJERO: likes, comentarios, reposts e impresiones solo los escribia el
// bucle del tick, que cierra a los 7 dias. El 14/09 se dio por hecho que los
// ponia al dia `bulkUpsert` en cada re-escaneo, y es FALSO: el re-escaneo es
// incremental y para en el primer post que ya tenemos, asi que los viejos no
// los vuelve a ver. Medido el 17/09: un post de Iker del 26/08 tenia 2.448
// impresiones en la BD y 3.116 en LinkedIn (+27%). Con 6 meses de historico,
// los multiplicadores y el analisis por pilar salian calculados sobre cifras
// del dia 7, y los posts que resurgen no se veian nunca.
//
// POR QUE EL FEED Y NO LA PAGINA DE ANALITICAS (que ya pedimos cada semana y
// tambien trae estos cuatro numeros): en un post de 2023 la pagina dio 0
// reacciones y 0 comentarios cuando el feed daba 53 y 10. Un cero no lo frena
// el COALESCE. El feed da bien los cuatro a cualquier edad y es la misma
// fuente que los snapshots, asi que las cifras no cambian de criterio al dia 8.
//
// COSTE: una cuenta por vuelta y una vez por semana. El feed entero de Iker
// (173 posts) son 4 paginas, o sea ~12 llamadas a la semana entre las tres.
//
// SIN TECHO DE EDAD: el limite de 90 dias es de la pagina de analiticas
// Premium, no del feed.
//
// NO HACE SNAPSHOT, igual que el pase de analitica: solo contadores.
const COUNTERS_RESYNC_DAYS = 7;
// Si el feed vuelve vacio (rate limit de LinkedIn) no se da la semana por
// hecha: se reintenta en un dia, no en la vuelta siguiente, para no machacar.
const COUNTERS_RETRY_HOURS = 24;

async function refrescarContadoresPostsViejos(): Promise<number> {
  const { rows: cuentas } = await pool.query(
    `SELECT id, linkedin_id, unipile_account_id
       FROM creators
      WHERE is_managed = TRUE
        AND unipile_account_id IS NOT NULL
        AND linkedin_id IS NOT NULL
        AND is_manual IS NOT TRUE
        AND (public_counters_next_at IS NULL OR public_counters_next_at <= NOW())
      ORDER BY public_counters_next_at ASC NULLS FIRST
      LIMIT 1`
  );
  const cuenta = cuentas[0];
  if (!cuenta) return 0;

  // Siguiente pase: dentro de 7 dias o el dia 1 del mes que viene (hora de
  // Madrid, la de la sesion), lo que llegue antes, para que las impresiones
  // ganadas caigan en su mes. Si fallo, en 24h.
  const marcar = (reintentarEnHoras: number | null) =>
    reintentarEnHoras == null
      ? pool.query(
          `UPDATE creators
              SET public_counters_synced_at = NOW(),
                  public_counters_next_at = LEAST(NOW() + ($2 || ' days')::interval,
                                                  date_trunc('month', NOW()) + INTERVAL '1 month')
            WHERE id = $1`,
          [cuenta.id, String(COUNTERS_RESYNC_DAYS)]
        )
      : pool.query(
          `UPDATE creators SET public_counters_next_at = NOW() + ($2 || ' hours')::interval WHERE id = $1`,
          [cuenta.id, String(reintentarEnHoras)]
        );

  let raws: any[];
  try {
    // Sin `since` y sin knownIds: el feed ENTERO. Con cualquiera de los dos,
    // getPosts para antes de llegar a los posts viejos, que son los que buscamos.
    raws = await unipileService.getPosts(cuenta.linkedin_id, undefined, cuenta.unipile_account_id);
  } catch (e: any) {
    await marcar(COUNTERS_RETRY_HOURS);
    throw e;
  }
  if (raws.length === 0) {
    console.warn(`[postMonitor] contadores semanales: feed vacio para ${cuenta.id}, reintento en ${COUNTERS_RETRY_HOURS}h`);
    await marcar(COUNTERS_RETRY_HOURS);
    return 0;
  }

  const { rows: viejos } = await pool.query(
    `SELECT id, linkedin_post_id, impressions_count, likes_count, comments_count, reposts_count
       FROM posts
      WHERE creator_id = $1
        AND linkedin_post_id IS NOT NULL
        AND published_at < NOW() - INTERVAL '7 days'`,
    [cuenta.id]
  );
  const porLinkedInId = new Map<string, any>();
  for (const r of raws) {
    const id = r.social_id || r.id;
    if (id) porLinkedInId.set(String(id), r);
  }

  // ⛔ ESCUDO CONTRA EL FEED DEGRADADO (2026-09-17). La primera pasada sobre
  // Iker escribio likes=0 y comentarios=0 en ~100 posts (el del 01/09 paso de
  // 301 likes a 0) mientras las impresiones llegaban bien: Unipile devuelve
  // reacciones a 0 en parte del feed. Un post no pierde todos sus likes, asi
  // que un 0 nunca pisa un valor real, contador a contador. Y si muchos posts
  // vienen asi, el feed entero no es de fiar: no se escribe nada y se reintenta.
  const pares: { p: any; n: any }[] = [];
  for (const p of viejos) {
    const raw = porLinkedInId.get(String(p.linkedin_post_id));
    if (raw) pares.push({ p, n: unipileService.normalizePost(raw, cuenta.id) });
  }
  // Feed a medias: getPosts corta en la primera pagina vacia y devuelve lo que
  // lleve. Si no aparecen ni el 70% de los posts viejos, no se da la semana
  // por hecha (los que faltan se quedarian otros 7 dias sin tocar).
  if (viejos.length > 0 && pares.length / viejos.length < 0.7) {
    console.warn(
      `[postMonitor] contadores semanales: feed incompleto para ${cuenta.id} ` +
        `(${pares.length}/${viejos.length} posts encontrados); reintento en ${COUNTERS_RETRY_HOURS}h`
    );
    await marcar(COUNTERS_RETRY_HOURS);
    return 0;
  }
  const conLikes = pares.filter(({ p }) => Number(p.likes_count) > 0);
  const ceros = conLikes.filter(({ n }) => !(Number(n.likes_count) > 0));
  if (conLikes.length > 0 && ceros.length / conLikes.length > 0.1) {
    console.warn(
      `[postMonitor] contadores semanales: feed degradado para ${cuenta.id} ` +
        `(${ceros.length}/${conLikes.length} posts con likes a 0), no se escribe nada; reintento en ${COUNTERS_RETRY_HOURS}h`
    );
    await marcar(COUNTERS_RETRY_HOURS);
    return 0;
  }

  const real = (nuevo: any, viejo: any) =>
    Number(nuevo) > 0 ? Number(nuevo) : Number(viejo) || 0;

  let hechos = 0;
  for (const { p, n } of pares) {
    const likes = real(n.likes_count, p.likes_count);
    const comments = real(n.comments_count, p.comments_count);
    const reposts = real(n.reposts_count, p.reposts_count);
    // Mismo escudo para las impresiones: un 0/null con un valor real guardado
    // es un fallo puntual de Unipile, no un post que ha perdido lectores.
    const imp = Number(n.impressions_count) > 0 ? Number(n.impressions_count) : null;
    await pool.query(
      `UPDATE posts SET
         likes_count = $2,
         comments_count = $3,
         reposts_count = $4,
         impressions_count = COALESCE($5, impressions_count),
         engagement_score = $6
       WHERE id = $1`,
      [p.id, likes, comments, reposts, imp,
       calculateEngagement({ likes_count: likes, comments_count: comments, reposts_count: reposts })]
    );
    // La lectura queda guardada: de la serie sale "impresiones ganadas cada mes".
    await pool.query(
      `INSERT INTO post_metric_readings (post_id, impressions_count, likes_count, comments_count, reposts_count)
       VALUES ($1, COALESCE($2, (SELECT impressions_count FROM posts WHERE id = $1)), $3, $4, $5)`,
      [p.id, imp, likes, comments, reposts]
    );
    hechos++;
  }
  await marcar(null);
  if (hechos) await recalcCreatorOutliers(cuenta.id);
  console.log(`[postMonitor] contadores semanales: ${hechos}/${viejos.length} post(s) de mas de 7 dias al dia para ${cuenta.id}`);
  return hechos;
}

// Per-post refresh — captures a fresh snapshot for ONE specific post and
// updates its live counters. Mirrors the inner loop of tick() but scoped to
// a single post so the user can refresh just the post they're looking at
// without waiting on the bulk loop hitting every monitored creator.
//
// Returns the new captured numbers + a small status flag the API can echo
// back. Tolerant to the case where the post is no longer findable on
// LinkedIn (the original was deleted, or the creator's account_id changed)
// — returns ok:false rather than throwing.
// ⭐ EL REFRESH TAMBIEN REFRESCA EL TEXTO (Iker, 2026-08-05).
// Antes solo se tocaban las metricas, asi que si Iker editaba un post ya
// publicado —cosa que hace a menudo con las menciones, porque LinkedIn solo las
// resuelve al pegarlas a mano— la BD se quedaba con la version vieja para
// siempre. Ese dia me hizo dar por buenas cinco menciones que el ya habia
// corregido. COALESCE por si Unipile devuelve texto vacio: mejor conservar el
// que hay que machacarlo con NULL.
export async function capturePostSnapshot(postId: string): Promise<{
  ok: boolean;
  reason?: string;
  impressions?: number | null;
  likes?: number;
  comments?: number;
  reposts?: number;
  engagement?: number;
}> {
  const { rows } = await pool.query(
    `SELECT p.id, p.linkedin_post_id, p.creator_id,
            c.linkedin_id, c.unipile_account_id, c.is_manual
       FROM posts p
       JOIN creators c ON c.id = p.creator_id
      WHERE p.id = $1
      LIMIT 1`,
    [postId]
  );
  const target = rows[0];
  if (!target) return { ok: false, reason: 'post not found' };
  if (!target.linkedin_post_id) {
    return { ok: false, reason: 'post has no linkedin_post_id (cannot match against feed)' };
  }

  // CUENTAS MANUALES: no tienen unipile_account_id (es la proteccion de la v38),
  // asi que el guarda de abajo las rechazaba y el boton de refrescar de su fila
  // devolvia siempre ok:false. Se leen post a post con la sesion prestada, igual
  // que en el tick. Las metricas privadas no se tocan: son del usuario.
  if (target.is_manual) {
    const r = await refrescarPostManual(postId, String(target.linkedin_post_id));
    if (!r.ok) return { ok: false, reason: r.motivo };
    const { rows: fresco } = await pool.query(
      `SELECT likes_count, comments_count, reposts_count, impressions_count, engagement_score
         FROM posts WHERE id = $1`,
      [postId]
    );
    await recalcCreatorOutliers(target.creator_id).catch((e: any) =>
      console.warn('[capturePostSnapshot] recalc manual fallo:', e?.message)
    );
    return {
      ok: true,
      likes: fresco[0]?.likes_count,
      comments: fresco[0]?.comments_count,
      reposts: fresco[0]?.reposts_count,
      impressions: fresco[0]?.impressions_count ?? null,
      engagement: fresco[0]?.engagement_score,
    };
  }

  if (!target.linkedin_id || !target.unipile_account_id) {
    return { ok: false, reason: 'creator missing linkedin_id or unipile_account_id' };
  }

  try {
    // Warm up the Unipile auth surface by hitting the profile endpoint first,
    // mirroring scrapeCreatorPosts. Without this, getPosts sometimes comes
    // back with impressions_counter: 0 for recent posts even when the bulk
    // refresh (which always fetches the profile first) gets real numbers.
    // Best-effort — don't fail the whole refresh if profile fetch errors,
    // just log and proceed with what we have.
    try {
      const { rows: creatorRows } = await pool.query(
        `SELECT linkedin_url FROM creators WHERE id = $1 LIMIT 1`,
        [target.creator_id]
      );
      if (creatorRows[0]?.linkedin_url) {
        await unipileService.getProfile(creatorRows[0].linkedin_url, target.unipile_account_id);
      }
    } catch (warmErr) {
      console.warn('[capturePostSnapshot] profile warm-up failed, continuing:', (warmErr as Error).message);
    }

    // Pull recent posts from this creator's account and find ours by id. Same
    // window the bulk monitor uses so a post older than MONITOR_WINDOW_MS
    // gracefully falls out of range.
    const since = new Date(Date.now() - MONITOR_WINDOW_MS - 60 * 60 * 1000);
    const raws = await unipileService.getPosts(target.linkedin_id, since, target.unipile_account_id);
    const raw = raws.find((r: any) => String(r.social_id || r.id) === String(target.linkedin_post_id));
    if (!raw) {
      // Desambiguar las DOS razones por las que un post puede no estar en el feed
      // (Iker, 2026-08-04). Antes se devolvian juntas y el usuario se quedaba con
      // un post fantasma en Live Posts que no habia forma de quitar.
      //
      //  a) El post es RECIENTE: deberia estar en el feed que acabamos de pedir,
      //     asi que si no esta, su autor probablemente lo BORRO. Se avisa y la
      //     persona decide si lo oculta.
      //  b) El post es viejo y simplemente cayo fuera de MONITOR_WINDOW_MS. Ese
      //     no se toca: sigue vivo en LinkedIn.
      const { rows: pub } = await pool.query(
        `SELECT published_at FROM posts WHERE id = $1 LIMIT 1`,
        [target.id]
      );
      const publishedAt = pub[0]?.published_at ? new Date(pub[0].published_at).getTime() : null;
      const dentroDeVentana =
        publishedAt != null && Date.now() - publishedAt < MONITOR_WINDOW_MS;
      // Ya NO se marca como borrado (2026-09-17): ocultar lo decide una
      // persona con el boton, porque un post borrado puede tener metricas que
      // cuentan (el Los 10 de Unai) y un feed vacio marcaba posts vivos.
      if (dentroDeVentana) {
        const feedReal = raws.some((r: any) => !esRepost(r));
        return {
          ok: false,
          reason: feedReal
            ? 'el post no esta en el feed de LinkedIn (borrado?); si quieres quitarlo de la lista, usa Ocultar'
            : 'LinkedIn devolvio el feed vacio; prueba en unos minutos',
        };
      }
      return { ok: false, reason: 'post not in current feed (older than monitor window)' };
    }

    const normalized = unipileService.normalizePost(raw, target.creator_id);
    const engagement = calculateEngagement(normalized);

    // ⭐ ANALITICA PREMIUM. Aqui SI se pide siempre (a diferencia del tick, que va
    // acotado a 6): esto lo dispara el boton ↻ Refresh de UN post concreto, o sea
    // que lo ha pedido una persona y es una sola llamada. Es la unica forma de
    // forzar el dato sin esperar al monitor.
    // Va en su propio try: si falla, el snapshot —que es lo importante— sigue.
    try {
      const a = await fetchPremiumAnalytics(
        String(target.linkedin_post_id), target.unipile_account_id
      );
      if (a) await savePremiumAnalytics(pool, target.id, a);
    } catch (e: any) {
      console.warn('[capturePostSnapshot] analytics failed:', e?.message);
    }

    // Defensive: if Unipile returned impressions=0/null but the most recent
    // prior snapshot had a real value, that's almost certainly a transient
    // upstream glitch (rate limit, throttling, missing analytics access on
    // this specific call). Refuse the snapshot rather than poison the curve
    // with a fake zero, and surface the reason to the caller. Engagement is
    // computed from likes/comments/reposts which Unipile reports reliably,
    // so we still update the post's live counters from those.
    const newImp = typeof normalized.impressions_count === 'number' ? normalized.impressions_count : null;
    const looksLikeImpZero = newImp == null || newImp === 0;
    // Ademas de los snapshots se mira el propio post: uno sin snapshots (entro
    // tarde, o es viejo) tambien tiene impresiones y likes que no se pisan con 0.
    const { rows: actual } = await pool.query(
      `SELECT impressions_count, likes_count FROM posts WHERE id = $1`,
      [target.id]
    );
    if (Number(actual[0]?.likes_count) > 0 && !(Number(normalized.likes_count) > 0)) {
      return { ok: false, reason: 'LinkedIn devolvio los contadores a 0; no se ha tocado nada, prueba en unos minutos' };
    }
    if (looksLikeImpZero) {
      const { rows: priorSnap } = await pool.query(
        `SELECT impressions_count FROM post_snapshots
          WHERE post_id = $1 AND impressions_count IS NOT NULL AND impressions_count > 0
          ORDER BY captured_at DESC LIMIT 1`,
        [target.id]
      );
      const prior = priorSnap.length > 0
        ? priorSnap
        : Number(actual[0]?.impressions_count) > 0 ? [{ impressions_count: actual[0].impressions_count }] : [];
      if (prior.length > 0) {
        // Update live counters anyway (engagement is reliable) but skip the
        // snapshot insert so the impressions chart doesn't dip to 0.
        await pool.query(
          `UPDATE posts SET
             likes_count = $2,
             comments_count = $3,
             reposts_count = $4,
             engagement_score = $5,
             content_text = COALESCE($6, content_text)
           WHERE id = $1`,
          [target.id, normalized.likes_count, normalized.comments_count, normalized.reposts_count, engagement, normalized.content_text]
        );
        return {
          ok: false,
          reason: `Unipile returned 0 impressions but prior snapshot had ${prior[0].impressions_count} — skipped snapshot to avoid poisoning the curve. Engagement counters were still updated. Try again in a few seconds.`,
          likes: normalized.likes_count,
          comments: normalized.comments_count,
          reposts: normalized.reposts_count,
          engagement,
        };
      }
      // No prior real impressions value (post genuinely has none yet) —
      // proceed with the 0/null insert as before.
    }

    await pool.query(
      `INSERT INTO post_snapshots (post_id, impressions_count, likes_count, comments_count, reposts_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [target.id, normalized.impressions_count, normalized.likes_count, normalized.comments_count, normalized.reposts_count]
    );

    await pool.query(
      `UPDATE posts SET
         likes_count = $2,
         comments_count = $3,
         reposts_count = $4,
         impressions_count = $5,
         engagement_score = $6,
         content_text = COALESCE($7, content_text)
       WHERE id = $1`,
      [target.id, normalized.likes_count, normalized.comments_count, normalized.reposts_count, normalized.impressions_count, engagement, normalized.content_text]
    );

    // Recompute outlier_ratio for the whole creator since the average shifted.
    // Method chosen by account type inside recalcCreatorOutliers.
    await recalcCreatorOutliers(target.creator_id);

    return {
      ok: true,
      impressions: normalized.impressions_count,
      likes: normalized.likes_count,
      comments: normalized.comments_count,
      reposts: normalized.reposts_count,
      engagement,
    };
  } catch (err: any) {
    console.error(`[postMonitor] capturePostSnapshot ${postId} failed:`, err?.message);
    return { ok: false, reason: err?.message || 'unknown error' };
  }
}

// Opportunistic tick triggered by HTTP requests (GET /live-posts polls every 2 min from the UI).
// Makes snapshot capture resilient to Railway recycling the Node process or setInterval drift:
// any time a user has the Accounts page open, ticks stay on cadence even if the background
// interval misses a firing. Fire-and-forget; never blocks the response.
export function maybeTick(): void {
  if (tickInFlight) return;
  if (Date.now() - lastTickAt < TICK_MS) return;
  tick().catch((err) => console.error('[postMonitor] opportunistic tick failed:', err?.message));
}

// One-shot: recompute outlier_ratio/is_outlier for every managed creator's posts.
// Heals historical rows that got zeroed out before the tick logic was fixed.
async function backfillOutliers() {
  try {
    const { rows: creators } = await pool.query(
      `SELECT id FROM creators WHERE is_managed = TRUE`
    );
    for (const { id: creatorId } of creators) {
      await recalcCreatorOutliers(creatorId);
    }
    console.log(`[postMonitor] outlier backfill complete for ${creators.length} managed creator(s)`);
  } catch (err: any) {
    console.error('[postMonitor] backfill failed:', err?.message);
  }
}

// Daily-ish snapshot of follower count + WVMP profile viewers for every
// managed creator. Runs unconditionally on the cadence below; the underlying
// upsert dedupes on (creator_id, captured_on), so re-running the same day
// just refreshes the values rather than producing duplicate rows.
//
// Without this, profile-view snapshots only landed when someone manually
// hit "Refresh" or POST /:id/scrape, which left the chart looking frozen
// for whole days at a time.
const ACCOUNT_SNAPSHOT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
let accountSnapshotInFlight = false;

// FOTOS DE LAS CUENTAS MANUALES (2026-09-17). Las URLs de media.licdn.com van
// firmadas y caducan: la fecha va en la propia URL (`e=`, epoch en segundos).
// Medido: una foto leida el 17/09 caduca el 08/10, o sea duran ~3 semanas. Las
// de Mario y Helena dieron 403 desde el 10/09 porque las manuales no pasan por
// captureAccountSnapshots (no tienen account_id).
// El pase de cada 6h solo MIRA la fecha, sin llamar a nadie; se pide la foto a
// Unipile (sesion compartida, solo la foto) cuando le quedan menos de 3 dias o
// si la URL no trae fecha. Unas 2 llamadas por cuenta al mes.
const FOTO_MARGEN_MS = 3 * 24 * HOUR_MS;

function fotoPorCaducar(url: string | null): boolean {
  const e = url?.match(/[?&]e=(\d+)/)?.[1];
  if (!e) return true;
  return Number(e) * 1000 - Date.now() < FOTO_MARGEN_MS;
}

async function renovarFotosManuales(): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id, linkedin_url, profile_image_url FROM creators
      WHERE is_manual = TRUE AND linkedin_url IS NOT NULL`
  );
  for (const c of rows) {
    if (!fotoPorCaducar(c.profile_image_url)) continue;
    try {
      const raw = await unipileService.getProfile(c.linkedin_url);
      const foto = unipileService.normalizeProfile(raw, c.linkedin_url).profile_image_url;
      if (foto) {
        await pool.query(`UPDATE creators SET profile_image_url = $2 WHERE id = $1`, [c.id, foto]);
      }
    } catch (e: any) {
      console.warn(`[accountSnapshot] foto de la cuenta manual ${c.id} no renovada:`, e?.message);
    }
  }
}

async function accountSnapshotTick(): Promise<void> {
  if (accountSnapshotInFlight) return;
  accountSnapshotInFlight = true;
  try {
    await renovarFotosManuales().catch((e: any) =>
      console.warn('[accountSnapshot] renovar fotos manuales fallo:', e?.message)
    );
    const { rows: managed } = await pool.query(
      `SELECT id FROM creators WHERE is_managed = TRUE AND unipile_account_id IS NOT NULL`
    );
    if (managed.length === 0) return;
    console.log(`[accountSnapshot] refreshing follower + WVMP for ${managed.length} managed creator(s)`);
    for (const { id } of managed) {
      try {
        const r = await captureAccountSnapshots(id);
        console.log(
          `[accountSnapshot] ${id}: views=${r.views} (${r.pages} page(s), paging.total=${r.pagingTotal}), followers=${r.followers}`
        );
      } catch (err: any) {
        console.error(`[accountSnapshot] ${id} failed:`, err?.message);
      }
    }
  } catch (err: any) {
    console.error('[accountSnapshot] tick failed:', err?.message);
  } finally {
    accountSnapshotInFlight = false;
  }
}

export function startPostMonitor() {
  console.log(`[postMonitor] starting — tick every ${TICK_MS / 60000} min, window ${MONITOR_WINDOW_MS / 3600000}h, phase-based cadence`);
  // One-shot heal for any posts whose outlier_ratio got zeroed by the pre-fix monitor
  setTimeout(backfillOutliers, 10 * 1000);
  // First run after 1 minute so the server has time to settle post-deploy
  setTimeout(tick, 60 * 1000);
  setInterval(tick, TICK_MS);

  // First account snapshot ~2 min after boot (gives the post tick room),
  // then every 6h so iekr / unai / any other managed account get fresh
  // follower + WVMP numbers without anyone clicking Refresh.
  setTimeout(accountSnapshotTick, 2 * 60 * 1000);
  setInterval(accountSnapshotTick, ACCOUNT_SNAPSHOT_INTERVAL_MS);

  // Organic-follower sync: first run 5 min after boot (the baseline is the
  // heavy one and we want the server fully settled), then daily. runFollowerSync
  // guards against overlap and only baselines once per creator; later runs are
  // cheap incremental diffs.
  setTimeout(() => {
    runFollowerSync(null).catch((e) => console.error('[followerSync] boot run failed:', e?.message));
  }, 5 * 60 * 1000);
  setInterval(() => {
    runFollowerSync(null).catch((e) => console.error('[followerSync] daily run failed:', e?.message));
  }, 24 * 60 * 60 * 1000);
}
