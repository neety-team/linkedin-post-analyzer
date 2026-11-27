/**
 * /api/newsletter — la pestaña Newsletter de contenido (2026-11-20).
 * La lógica vive en `services/newsletter.ts` y `services/metricasNewsletter.ts`;
 * esto solo valida y responde.
 *
 * La aprobación es solo de Iker y se decide por la IDENTIDAD de la petición
 * (login central), nunca por lo que mande el navegador en el cuerpo.
 */
import express, { Router, Request, Response } from 'express';
import {
  listarCorreos,
  aprobarCorreo,
  crearFeedback,
  puedeAprobar,
  retirarCorreo,
  programarCorreo,
} from '../services/newsletter';
import { estadoMetricas, estadoBarrido, refrescarMetricas, conversionesDeEnviados } from '../services/metricasNewsletter';
import { identidadDe } from '../middleware/basicAuth';

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lo que usa el router. Se inyecta en los tests para no necesitar base de datos. */
export interface DepsNewsletter {
  listarCorreos: typeof listarCorreos;
  aprobarCorreo: typeof aprobarCorreo;
  crearFeedback: typeof crearFeedback;
  puedeAprobar: typeof puedeAprobar;
  retirarCorreo: typeof retirarCorreo;
  programarCorreo: (id: string, quien: any) => Promise<string>;
  estadoMetricas: typeof estadoMetricas;
  estadoBarrido: typeof estadoBarrido;
  refrescarMetricas: typeof refrescarMetricas;
  /** Reuniones e inscritos de cada enviado (mismo orden). Inyectable para no tocar red ni BD en los tests. */
  conversionesDeEnviados: typeof conversionesDeEnviados;
}

export const serviciosReales: DepsNewsletter = {
  listarCorreos,
  aprobarCorreo,
  crearFeedback,
  puedeAprobar,
  retirarCorreo,
  programarCorreo: (id, quien) => programarCorreo(id, quien),
  estadoMetricas,
  estadoBarrido,
  refrescarMetricas,
  conversionesDeEnviados,
};

/** Lo más que espera el GET a las conversiones antes de responder sin ellas. */
export const MS_CONVERSIONES = 2000;

/** La promesa, o `alternativa` si tarda más de `ms`. El temporizador no retiene el proceso. */
function conTope<T>(p: Promise<T>, ms: number, alternativa: T): Promise<T> {
  let t: NodeJS.Timeout | undefined;
  const tope = new Promise<T>((r) => {
    t = setTimeout(() => r(alternativa), ms);
    t.unref?.();
  });
  return Promise.race([p.catch(() => alternativa), tope]).finally(() => clearTimeout(t));
}

export function crearRouter(
  deps: DepsNewsletter = serviciosReales,
  opts: { msConversiones?: number } = {}
): Router {
  const msConversiones = opts.msConversiones ?? MS_CONVERSIONES;
  const router = Router();
  router.use(express.json({ limit: '100kb' }));

  const idDe = (req: Request) => String(req.params.id || '');

  /** GET /api/newsletter — los correos, sus métricas y si quien mira puede aprobar. */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { proximos, enviados, automaticos = [] } = await deps.listarCorreos();
      const { configurado } = deps.estadoMetricas();
      const barrido = await deps.estadoBarrido();
      // Las conversiones no pueden tumbar ni frenar la pestaña: si fallan o tardan más de
      // ~2 s, quedan en null. Los inscritos ni se leen (conversionesDeEnviados no llama a
      // leerEventos): hoy siempre darían null, hasta que `origenInscrito` guarde la clave del correo.
      const conv = await conTope(deps.conversionesDeEnviados(enviados), msConversiones, []);
      res.json({
        proximos,
        automaticos,
        enviados: enviados.map((c: any, i: number) => ({ ...c, conversiones: conv[i] ?? { demos: null, inscritos: null } })),
        metricas: { configurado, ultimo_barrido: barrido.ultimo_at, error: barrido.error },
        puedo_aprobar: deps.puedeAprobar(identidadDe(req)),
      });
    } catch (err: any) {
      console.error('[newsletter]', err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/newsletter/correos/:id/aprobar {huella} — solo Iker. Primero la identidad
   * y luego la existencia: quien no aprueba no puede sondear ids. `huella` es la del texto
   * que la tarjeta pintó: si el correo cambió desde entonces, 409 y no se aprueba.
   */
  router.post('/correos/:id/aprobar', async (req: Request, res: Response) => {
    try {
      const yo = identidadDe(req);
      if (!deps.puedeAprobar(yo)) return res.status(403).json({ error: 'Solo Iker aprueba los correos' });
      const id = idDe(req);
      if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
      const huella = (req.body || {}).huella;
      if (typeof huella !== 'string' || !huella) {
        return res.status(400).json({ error: 'Falta la huella del texto que se aprueba: recarga la página' });
      }
      const r = await deps.aprobarCorreo(id, yo!, huella);
      if (r === 'no_existe') return res.status(404).json({ error: 'Correo no encontrado' });
      if (r !== 'ok') return res.status(409).json({ error: r });
      const { proximos, enviados } = await deps.listarCorreos();
      res.json([...proximos, ...enviados].find((c) => c.id === id) || { id, estado: 'aprobado' });
    } catch (err: any) {
      console.error('[newsletter/aprobar]', err);
      res.status(500).json({ error: err.message });
    }
  });

  /** POST /api/newsletter/correos/:id/retirar — solo Iker. Deja de salir en la página (no se borra). */
  router.post('/correos/:id/retirar', async (req: Request, res: Response) => {
    try {
      if (!deps.puedeAprobar(identidadDe(req))) return res.status(403).json({ error: 'Solo Iker retira los correos' });
      const id = idDe(req);
      if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
      const r = await deps.retirarCorreo(id, 'desde la página');
      if (r === 'no_existe') return res.status(404).json({ error: 'Correo no encontrado' });
      if (r !== 'ok') return res.status(409).json({ error: r });
      res.json({ id, estado: 'retirado' });
    } catch (err: any) {
      console.error('[newsletter/retirar]', err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/newsletter/correos/:id/programar — solo Iker y solo un aprobado: crea la campaña
   * en Brevo con el HTML aprobado, a su fecha y hora, y la deja vinculada.
   */
  router.post('/correos/:id/programar', async (req: Request, res: Response) => {
    try {
      const yo = identidadDe(req);
      if (!deps.puedeAprobar(yo)) return res.status(403).json({ error: 'Solo Iker programa los correos' });
      const id = idDe(req);
      if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
      const r = await deps.programarCorreo(id, yo);
      if (r === 'no_existe') return res.status(404).json({ error: 'Correo no encontrado' });
      if (r !== 'ok') return res.status(409).json({ error: r });
      const { proximos, enviados } = await deps.listarCorreos();
      res.json([...proximos, ...enviados].find((c: any) => c.id === id) || { id, estado: 'programado' });
    } catch (err: any) {
      console.error('[newsletter/programar]', err);
      res.status(500).json({ error: err.message });
    }
  });

  /** POST /api/newsletter/correos/:id/feedback {texto, autor?} */
  router.post('/correos/:id/feedback', async (req: Request, res: Response) => {
    try {
      const id = idDe(req);
      if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
      const { autor, texto } = req.body || {};
      // Con login central firma con su nombre real; lo que mande el navegador no cuenta.
      const yo = identidadDe(req);
      const fila = await deps.crearFeedback(id, yo ? yo.nombre : autor, texto);
      if (!fila) return res.status(404).json({ error: 'Correo no encontrado' });
      res.status(201).json(fila);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  /** POST /api/newsletter/refrescar — lanza la lectura de Brevo y responde sin esperarla. */
  router.post('/refrescar', (_req: Request, res: Response) => {
    if (!deps.estadoMetricas().configurado) {
      return res.status(409).json({ error: 'Falta BREVO_API_KEY: no hay métricas que refrescar' });
    }
    deps.refrescarMetricas().catch((err) => console.error('[newsletter/refrescar]', err));
    res.status(202).json({ lanzado: true });
  });

  return router;
}

export default crearRouter();
