/**
 * /api/semana — el calendario semanal de posts y su feedback (2026-11-17).
 * La logica vive en `services/semana.ts`; esto solo valida y responde.
 *
 * Orden de las rutas: las fijas (`/feedback/...`, `/posts/...`) van ANTES que
 * `/:semana`, o Express las tomaria por el codigo de una semana.
 */
import express, { Router, Request, Response, NextFunction } from 'express';
import {
  esSemanaValida,
  listarSemanas,
  leerSemana,
  guardarSemana,
  crearFeedback,
  listarFeedback,
  actualizarFeedback,
  guardarImagen,
  leerImagen,
  borrarImagen,
  numeroFoto,
  perfilesDeCuentas,
  programarPosts,
  desprogramarPost,
  reprogramarPost,
  moverPost,
  retirarPost,
  responderPendiente,
  IMAGEN_MAX_BYTES,
} from '../services/semana';
import { estadoPublicador, cambiarSubidaAutomatica } from '../services/publicadorLinkedin';
import { estadoAbeja, cambiarAbeja, rondaDePost, ensayarRonda } from '../services/abeja';
import { identidadDe } from '../middleware/basicAuth';

const router = Router();

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const param = (req: Request, k: string) => String((req.params as any)[k] || '');

/** GET /api/semana/abeja — si el efecto abeja (la ronda entre fundadores) esta encendido. */
router.get('/abeja', async (_req: Request, res: Response) => {
  try {
    res.json(await estadoAbeja());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/semana/abeja {activo} — el boton de la pagina. Queda apuntado quien y cuando. */
router.post('/abeja', async (req: Request, res: Response) => {
  try {
    const { activo, autor } = req.body || {};
    if (typeof activo !== 'boolean') return res.status(400).json({ error: 'Falta `activo` (true o false)' });
    const yo = identidadDe(req);
    const quien = (yo ? yo.nombre : String(autor || '').trim()) || 'alguien sin identificar';
    res.json(await cambiarAbeja(activo, quien));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/semana/posts/:id/abeja/ensayo — escribe los comentarios y las
 * respuestas que llevaria ese post, sin guardar ni enviar nada. Para ver como
 * suenan antes de que salgan.
 */
router.post('/posts/:id/abeja/ensayo', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    res.json(await ensayarRonda(id));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/semana/posts/:id/abeja — la ronda de un post publicado: quien hace que y cuando. */
router.get('/posts/:id/abeja', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    res.json({ acciones: await rondaDePost(id) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/semana — las semanas que hay, la mas reciente primero. */
router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json({ semanas: await listarSemanas() });
  } catch (err: any) {
    console.error('[semana/list]', err);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/semana/feedback/pendiente[?semana=] — lo que falta por atender. */
router.get('/feedback/pendiente', async (req: Request, res: Response) => {
  try {
    const semana = req.query.semana;
    if (semana !== undefined && !esSemanaValida(semana)) {
      return res.status(400).json({ error: 'Semana no válida (formato 2026-W48)' });
    }
    res.json({ feedback: await listarFeedback({ semana: semana as string | undefined }) });
  } catch (err: any) {
    console.error('[semana/feedback/pendiente]', err);
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/semana/feedback/:id {nivel?, resuelto?, respuesta?} */
router.patch('/feedback/:id', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    const { nivel, resuelto, respuesta } = req.body || {};
    const fila = await actualizarFeedback(id, { nivel, resuelto, respuesta });
    if (!fila) return res.status(404).json({ error: 'Feedback no encontrado' });
    res.json(fila);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /api/semana/posts/:id/feedback {autor, texto} */
router.post('/posts/:id/feedback', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    const { autor, texto } = req.body || {};
    // Si la persona entro por el login central, firma con su nombre real y lo
    // que mande el navegador en `autor` no cuenta.
    const yo = identidadDe(req);
    const fila = await crearFeedback(id, yo ? yo.nombre : autor, texto);
    if (!fila) return res.status(404).json({ error: 'Post no encontrado' });
    res.status(201).json(fila);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/semana/posts/:id/pendientes/:pid {respuesta, autor?} — una persona
 * confirma («si» o «no») o cuenta lo que falta. Firma como el feedback: con el
 * login central si lo hay; si no, con `autor`. Devuelve el post actualizado.
 */
router.post('/posts/:id/pendientes/:pid', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    const pid = param(req, 'pid');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    if (!/^[a-z0-9][a-z0-9-]{0,39}$/i.test(pid)) return res.status(400).json({ error: 'Pendiente no válido' });
    const { respuesta, autor } = req.body || {};
    const yo = identidadDe(req);
    const post = await responderPendiente(id, pid, respuesta, yo ? yo.nombre : autor);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });
    res.json(post);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/semana/publicador — si la subida automatica a LinkedIn esta encendida. */
router.get('/publicador', async (_req: Request, res: Response) => {
  try {
    res.json(await estadoPublicador());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/semana/publicador {activo: boolean} — el boton de la pagina que
 * enciende o apaga la subida automatica. Queda apuntado quien y cuando.
 */
router.post('/publicador', async (req: Request, res: Response) => {
  try {
    const { activo, autor } = req.body || {};
    if (typeof activo !== 'boolean') return res.status(400).json({ error: 'Falta `activo` (true o false)' });
    const yo = identidadDe(req);
    const quien = (yo ? yo.nombre : String(autor || '').trim()) || 'alguien sin identificar';
    res.json(await cambiarSubidaAutomatica(activo, quien));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/semana/:semana/programar {posts: [{id, programado_para}]}
 * Programa los posts marcados en el panel. Todo o nada: si uno no se puede, no
 * se programa ninguno y el error dice cual y por que.
 */
router.post('/:semana/programar', async (req: Request, res: Response) => {
  try {
    const semana = param(req, 'semana');
    if (!esSemanaValida(semana)) return res.status(400).json({ error: 'Semana no válida (formato 2026-W48)' });
    const posts = req.body?.posts;
    if (!Array.isArray(posts)) return res.status(400).json({ error: '`posts` tiene que ser una lista' });
    if (posts.some((p: any) => !RE_UUID.test(String(p?.id || '')))) {
      return res.status(400).json({ error: 'Id no válido' });
    }
    const r = await programarPosts(semana, posts);
    res.json({ ...r, semana: await leerSemana(semana) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /api/semana/posts/:id/reprogramar {programado_para} — cambia la hora de un post ya programado. */
router.post('/posts/:id/reprogramar', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    const r = await reprogramarPost(id, String(req.body?.programado_para || ''));
    if (r === 'no_existe') return res.status(404).json({ error: 'Post no encontrado' });
    if (r === 'hora_no_valida') return res.status(400).json({ error: 'Falta la hora nueva (`programado_para`, en ISO)' });
    if (r === 'hora_pasada') return res.status(400).json({ error: 'Esa hora ya ha pasado: elige una posterior' });
    if (r === 'no_programado') return res.status(409).json({ error: 'Ese post no está programado: prográmalo primero' });
    if (r === 'publicando') return res.status(409).json({ error: 'Se está publicando ahora mismo' });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/semana/posts/:id/desprogramar — lo devuelve a «aprobado» y quita la hora. */
router.post('/posts/:id/desprogramar', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    const r = await desprogramarPost(id);
    if (r === 'no_existe') return res.status(404).json({ error: 'Post no encontrado' });
    if (r === 'no_programado') return res.status(409).json({ error: 'Ese post no está programado' });
    if (r === 'publicando') {
      return res.status(409).json({ error: 'Se está publicando ahora mismo: espera un minuto y mira si ha salido' });
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/semana/posts/:id/mover — { semana, fecha?, clave? }. Cambia el post
 * de semana con su feedback y su foto, en vez de copiarlo. No mueve programados
 * ni publicados.
 */
router.post('/posts/:id/mover', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    const { semana, fecha, clave } = req.body || {};
    const r = await moverPost(id, { semana, fecha, clave });
    if (r === 'no_existe') return res.status(404).json({ error: 'Post no encontrado' });
    if (r === 'datos_no_validos') return res.status(400).json({ error: 'Semana (2026-W48), fecha (AAAA-MM-DD) o clave no válidas' });
    if (r === 'bloqueado') return res.status(409).json({ error: 'Un post programado o publicado no se mueve: quítalo antes de la programación' });
    if (r === 'clave_ocupada') return res.status(409).json({ error: 'En esa semana ya hay un post con esa clave' });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/semana/posts/:id — retira un post repetido. No borra feedback ni programados. */
router.delete('/posts/:id', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    const r = await retirarPost(id);
    if (r === 'no_existe') return res.status(404).json({ error: 'Post no encontrado' });
    if (r === 'bloqueado') return res.status(409).json({ error: 'Un post programado o publicado no se retira' });
    if (r === 'con_feedback') return res.status(409).json({ error: 'Tiene feedback: muévelo de semana en vez de retirarlo' });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/semana/perfiles — nombre, titular y foto de las cuentas de la semana. */
router.get('/perfiles', async (_req: Request, res: Response) => {
  res.json({ perfiles: await perfilesDeCuentas() });
});

/** GET /api/semana/posts/:id/imagen[?n=2] — la foto del post (con n=2, la segunda). */
router.get('/posts/:id/imagen', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    const img = await leerImagen(id, numeroFoto(req.query.n));
    if (!img) return res.status(404).json({ error: 'Ese post no tiene foto' });
    // La pagina pide la foto con ?v=<version>: cada foto nueva es otra URL, asi
    // que esta se puede guardar en cache. `nosniff` para que el navegador no la
    // interprete como otra cosa que una imagen.
    res.setHeader('Content-Type', img.tipo);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', req.query.v ? 'private, max-age=31536000, immutable' : 'private, no-cache');
    res.send(img.datos);
  } catch (err: any) {
    console.error('[semana/imagen/get]', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/semana/posts/:id/imagen — sube o cambia la foto. El cuerpo es el
 * fichero tal cual (no JSON), con su Content-Type de imagen.
 */
const cuerpoImagen = express.raw({ type: ['image/*', 'application/octet-stream'], limit: IMAGEN_MAX_BYTES });

router.put(
  '/posts/:id/imagen',
  // El lector del cuerpo falla con un error generico si el fichero se pasa de
  // tamaño: aqui se convierte en un 413 que la pagina puede enseñar.
  (req: Request, res: Response, next: NextFunction) =>
    cuerpoImagen(req, res, (err?: any) => {
      if (!err) return next();
      const grande = err.status === 413 || err.type === 'entity.too.large';
      res.status(grande ? 413 : 400).json({ error: grande ? 'La imagen pesa más de 8 MB' : 'No se ha podido leer la imagen' });
    }),
  async (req: Request, res: Response) => {
    try {
      const id = param(req, 'id');
      if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
      if (!Buffer.isBuffer(req.body)) return res.status(400).json({ error: 'Manda el fichero de la imagen en el cuerpo' });
      const r = await guardarImagen(id, req.body, numeroFoto(req.query.n));
      if (!r) return res.status(404).json({ error: 'Post no encontrado' });
      res.json(r);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

/** DELETE /api/semana/posts/:id/imagen — quita la foto. */
router.delete('/posts/:id/imagen', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    res.json({ borrada: await borrarImagen(id, numeroFoto(req.query.n)) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/semana/:semana — la semana entera, con el feedback de cada post. */
router.get('/:semana', async (req: Request, res: Response) => {
  try {
    const semana = param(req, 'semana');
    if (!esSemanaValida(semana)) return res.status(400).json({ error: 'Semana no válida (formato 2026-W48)' });
    const datos = await leerSemana(semana);
    if (!datos) return res.status(404).json({ error: 'Esa semana no existe' });
    res.json(datos);
  } catch (err: any) {
    console.error('[semana/get]', err);
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/semana/:semana {estado?, nota?, posts?} — crea o actualiza. No borra. */
router.put('/:semana', async (req: Request, res: Response) => {
  try {
    const semana = param(req, 'semana');
    if (!esSemanaValida(semana)) return res.status(400).json({ error: 'Semana no válida (formato 2026-W48)' });
    const { estado, nota, posts } = req.body || {};
    if (posts !== undefined && !Array.isArray(posts)) {
      return res.status(400).json({ error: '`posts` tiene que ser una lista' });
    }
    // Colaborativos: `coautores` es una lista de cuentas o null. El resto (que
    // existan y que no repitan a quien publica) lo comprueba guardarSemana.
    const malCoautores = (posts || []).find(
      (p: any) =>
        p?.coautores !== undefined &&
        p.coautores !== null &&
        (!Array.isArray(p.coautores) || p.coautores.some((c: unknown) => typeof c !== 'string'))
    );
    if (malCoautores) {
      return res.status(400).json({ error: `\`coautores\` de ${malCoautores.clave} tiene que ser una lista de cuentas` });
    }
    const malMenciones = (posts || []).find(
      (p: any) => p?.menciones !== undefined && p.menciones !== null && !Array.isArray(p.menciones)
    );
    if (malMenciones) {
      return res.status(400).json({ error: `\`menciones\` de ${malMenciones.clave} tiene que ser una lista de {nombre, profile_id}` });
    }
    const malPendientes = (posts || []).find(
      (p: any) => p?.pendientes !== undefined && p.pendientes !== null && !Array.isArray(p.pendientes)
    );
    if (malPendientes) {
      return res.status(400).json({ error: `\`pendientes\` de ${malPendientes.clave} tiene que ser una lista` });
    }
    const r = await guardarSemana(semana, { estado, nota, posts });
    res.json({ ...r, semana: await leerSemana(semana) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
