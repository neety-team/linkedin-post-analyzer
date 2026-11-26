/**
 * TRAER TRAS PUBLICAR (2026-11-26).
 *
 * El boton «Traer posts nuevos» de Cuentas, pulsado solo y a la hora que marca
 * Semana. Sin esto, un post recien salido no tiene curva ni hora dorada hasta
 * que alguien se acuerda del boton, y los primeros datos (impresiones,
 * reacciones) son justo los que deciden la distribucion.
 *
 * NO VIGILA EL FEED: se sincroniza con la planificacion. La vuelta (cada 2 min)
 * solo lee la BD; a Unipile se llama UNA vez por publicacion, unos minutos
 * despues de su hora, y solo para la cuenta que publica (lo mismo que el boton
 * con el filtro de esa cuenta). La hora es `publicado_at` si el publicador lo
 * subio, o `programado_para` si se publica a mano.
 *
 * AGRUPA: si otro post sale en los proximos AGRUPAR_MIN, espera y los trae
 * juntos, con un techo de ESPERA_MAX_MIN para no perder la hora dorada.
 *
 * CON TECHO: si el post no aparece (se publico tarde, o no salio), reintenta
 * cada REINTENTO_MIN hasta MAX_INTENTOS y lo deja. Si ya esta en la BD porque
 * alguien pulso el boton, se marca sin llamar a nadie.
 *
 * FRENO: TRAER_TRAS_PUBLICAR=0 en el entorno lo apaga.
 */
import pool from '../db';
import { NOMBRE_EN_LINKEDIN } from './publicadorLinkedin';

const UN_MINUTO = 60 * 1000;
/** Lo que se le da a LinkedIn para que el post exista en el feed (con 202 aun lo procesa). */
export const ESPERA_MIN = 3;
/** Si otro post sale en este margen, se espera para traerlos juntos. */
export const AGRUPAR_MIN = 20;
/** Nunca se retrasa la primera traida mas que esto desde la hora del post. */
export const ESPERA_MAX_MIN = 30;
export const REINTENTO_MIN = 15;
export const MAX_INTENTOS = 4;
/** Solo se miran los posts de las ultimas horas: un despliegue no barre el historico. */
const VENTANA_HORAS = 12;

export interface Pendiente {
  id: string;
  clave: string;
  cuenta: string;
  momento: Date;
  intentos: number;
  ultimo: Date | null;
}

/**
 * Que toca traer ahora. Pura, para los tests.
 * `proximos` son las horas de los posts aun programados que no han llegado.
 */
export function decidir(pendientes: Pendiente[], proximos: Date[], ahora: Date): { traer: Pendiente[]; motivo: string | null } {
  const t = ahora.getTime();
  const tocan = pendientes.filter(
    (p) =>
      p.intentos < MAX_INTENTOS &&
      p.momento.getTime() <= t - ESPERA_MIN * UN_MINUTO &&
      (!p.ultimo || p.ultimo.getTime() <= t - REINTENTO_MIN * UN_MINUTO)
  );
  if (!tocan.length) return { traer: [], motivo: null };
  const viene = proximos.some((h) => h.getTime() > t && h.getTime() <= t + AGRUPAR_MIN * UN_MINUTO);
  // El techo cuenta solo para la primera traida: un reintento no espera a nadie.
  const primeras = tocan.filter((p) => p.intentos === 0);
  const masVieja = Math.min(...primeras.map((p) => p.momento.getTime()));
  const puedeEsperar = primeras.length === tocan.length && t - masVieja < ESPERA_MAX_MIN * UN_MINUTO;
  if (viene && puedeEsperar) return { traer: [], motivo: 'espera al siguiente post del día para traerlos juntos' };
  return { traer: tocan, motivo: null };
}

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** La cuenta de Semana (`iker`) → el creador conectado de Cuentas. */
export function creadorDeCuenta(cuenta: string, creadores: { id: string; name: string | null }[]): string | null {
  const completo = normalizar(NOMBRE_EN_LINKEDIN[cuenta] || '');
  const porNombre = creadores.filter((c) => completo && normalizar(c.name || '') === completo);
  if (porNombre.length === 1) return porNombre[0].id;
  const porPila = creadores.filter((c) => normalizar(c.name || '').split(' ')[0] === normalizar(cuenta));
  return porPila.length === 1 ? porPila[0].id : null;
}

async function creadoresConectados(): Promise<{ id: string; name: string | null }[]> {
  const { rows } = await pool.query(
    `SELECT id, name FROM creators
      WHERE is_managed = TRUE AND unipile_account_id IS NOT NULL AND is_manual IS NOT TRUE`
  );
  return rows;
}

/** Los posts de Semana ya salidos (o con la hora pasada) que aun no estan en Cuentas. */
async function leerPendientes(): Promise<Pendiente[]> {
  const { rows } = await pool.query(
    `SELECT id, clave, cuenta, traer_intentos AS intentos, traer_ultimo_at AS ultimo,
            CASE WHEN estado = 'publicado' THEN COALESCE(publicado_at, programado_para, updated_at)
                 ELSE programado_para END AS momento
       FROM semana_posts
      WHERE traido_at IS NULL
        AND traer_intentos < $1
        AND (estado = 'publicado' OR (estado = 'programado' AND programado_para IS NOT NULL))
        AND CASE WHEN estado = 'publicado' THEN COALESCE(publicado_at, programado_para, updated_at)
                 ELSE programado_para END
            BETWEEN NOW() - ($2 || ' hours')::interval AND NOW()`,
    [MAX_INTENTOS, String(VENTANA_HORAS)]
  );
  return rows.map((r) => ({ ...r, momento: new Date(r.momento), ultimo: r.ultimo ? new Date(r.ultimo) : null }));
}

async function leerProximos(): Promise<Date[]> {
  const { rows } = await pool.query(
    `SELECT programado_para FROM semana_posts
      WHERE estado = 'programado' AND programado_para > NOW()
        AND programado_para <= NOW() + ($1 || ' minutes')::interval`,
    [String(AGRUPAR_MIN)]
  );
  return rows.map((r) => new Date(r.programado_para));
}

/**
 * ¿Ya esta en Cuentas? Por su id de LinkedIn si Semana lo tiene; si no (se
 * publico a mano), por un post de esa cuenta desde poco antes de su hora.
 */
async function yaEsta(semanaPostId: string, creatorId: string): Promise<boolean> {
  const digitos = (e: string) => `NULLIF(regexp_replace(COALESCE(${e}, ''), '[^0-9]', '', 'g'), '')`;
  const { rows } = await pool.query(
    `SELECT 1
       FROM semana_posts sp
       JOIN posts p ON p.creator_id = $2
      WHERE sp.id = $1
        AND (
          ${digitos('p.linkedin_post_id')} IN (${digitos('sp.linkedin_post_id')}, ${digitos('sp.linkedin_social_id')})
          OR p.published_at BETWEEN
               (CASE WHEN sp.estado = 'publicado' THEN COALESCE(sp.publicado_at, sp.programado_para, sp.updated_at)
                     ELSE sp.programado_para END) - interval '20 minutes'
               AND NOW() + interval '5 minutes'
        )
      LIMIT 1`,
    [semanaPostId, creatorId]
  );
  return rows.length > 0;
}

const marcarTraido = (id: string) => pool.query(`UPDATE semana_posts SET traido_at = NOW() WHERE id = $1`, [id]);
const sinCreadorAvisado = new Set<string>();

/** Una vuelta. Devuelve lo que ha hecho, para el log y los tests. */
export async function vueltaTraer(
  traer?: (creatorId: string) => Promise<{ scraped: number }>
): Promise<{ traidos: string[]; sin_aparecer: string[]; llamadas: number; motivo: string | null }> {
  const hecho = { traidos: [] as string[], sin_aparecer: [] as string[], llamadas: 0, motivo: null as string | null };
  const pendientes = await leerPendientes();
  if (!pendientes.length) return hecho;

  const creadores = await creadoresConectados();
  const conCreador: (Pendiente & { creatorId: string })[] = [];
  for (const p of pendientes) {
    const creatorId = creadorDeCuenta(p.cuenta, creadores);
    if (!creatorId) {
      if (!sinCreadorAvisado.has(p.cuenta)) {
        sinCreadorAvisado.add(p.cuenta);
        console.warn(`[traerTrasPublicar] la cuenta «${p.cuenta}» no tiene creador conectado en Cuentas: sus posts no se traen solos`);
      }
      continue;
    }
    // Si alguien ya pulso el boton, no se llama a nadie.
    if (await yaEsta(p.id, creatorId)) {
      await marcarTraido(p.id);
      hecho.traidos.push(p.clave);
      continue;
    }
    conCreador.push({ ...p, creatorId });
  }

  const { traer: toca, motivo } = decidir(conCreador, await leerProximos(), new Date());
  hecho.motivo = motivo;
  if (!toca.length) return hecho;

  if (!traer) {
    // Import dinamico, como el descubrimiento de postMonitor: routes/accounts
    // importa servicios que acabarian importando este modulo.
    const { scrapeCreatorPosts } = await import('../routes/accounts');
    traer = (id) => scrapeCreatorPosts(id);
  }
  const ids = [...new Set(toca.map((p) => (p as any).creatorId as string))];
  // En paralelo, como el boton con «todas las cuentas»: cada una es su cuenta de Unipile.
  const r = await Promise.allSettled(ids.map((id) => traer!(id)));
  hecho.llamadas = ids.length;
  r.forEach((x, i) => {
    if (x.status === 'rejected') console.error(`[traerTrasPublicar] fallo al traer ${ids[i]}:`, x.reason?.message);
  });

  for (const p of toca as (Pendiente & { creatorId: string })[]) {
    if (await yaEsta(p.id, p.creatorId)) {
      await marcarTraido(p.id);
      hecho.traidos.push(p.clave);
    } else {
      await pool.query(
        `UPDATE semana_posts SET traer_intentos = traer_intentos + 1, traer_ultimo_at = NOW() WHERE id = $1`,
        [p.id]
      );
      hecho.sin_aparecer.push(p.clave);
    }
  }
  console.log(
    `[traerTrasPublicar] ${hecho.llamadas} cuenta(s) traída(s) · en Cuentas: ${hecho.traidos.join(', ') || '-'}` +
      (hecho.sin_aparecer.length ? ` · aún no aparecen (reintento en ${REINTENTO_MIN} min): ${hecho.sin_aparecer.join(', ')}` : '')
  );
  return hecho;
}

let corriendo = false;
async function tick() {
  if (corriendo) return;
  corriendo = true;
  try {
    await vueltaTraer();
  } catch (e: any) {
    console.error('[traerTrasPublicar] la vuelta ha fallado:', e?.message);
  } finally {
    corriendo = false;
  }
}

export function startTraerTrasPublicar(): void {
  if (process.env.TRAER_TRAS_PUBLICAR === '0') {
    console.log('[traerTrasPublicar] apagado (TRAER_TRAS_PUBLICAR=0)');
    return;
  }
  console.log(`[traerTrasPublicar] encendido: trae cada post ${ESPERA_MIN} min después de su hora en Semana`);
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), 2 * UN_MINUTO);
  }, 30 * 1000);
}
