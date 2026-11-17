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
  perfilesDeCuentas,
  IMAGEN_MAX_BYTES,
} from '../services/semana';
import { identidadDe } from '../middleware/basicAuth';

const router = Router();

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const param = (req: Request, k: string) => String((req.params as any)[k] || '');

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

/** GET /api/semana/perfiles — nombre, titular y foto de las tres cuentas. */
router.get('/perfiles', async (_req: Request, res: Response) => {
  res.json({ perfiles: await perfilesDeCuentas() });
});

/** GET /api/semana/posts/:id/imagen — la foto del post. */
router.get('/posts/:id/imagen', async (req: Request, res: Response) => {
  try {
    const id = param(req, 'id');
    if (!RE_UUID.test(id)) return res.status(400).json({ error: 'Id no válido' });
    const img = await leerImagen(id);
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
      const r = await guardarImagen(id, req.body);
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
    res.json({ borrada: await borrarImagen(id) });
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
    const r = await guardarSemana(semana, { estado, nota, posts });
    res.json({ ...r, semana: await leerSemana(semana) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
