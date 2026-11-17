/**
 * /api/semana — el calendario semanal de posts y su feedback (2026-11-17).
 * La logica vive en `services/semana.ts`; esto solo valida y responde.
 *
 * Orden de las rutas: las fijas (`/feedback/...`, `/posts/...`) van ANTES que
 * `/:semana`, o Express las tomaria por el codigo de una semana.
 */
import { Router, Request, Response } from 'express';
import {
  esSemanaValida,
  listarSemanas,
  leerSemana,
  guardarSemana,
  crearFeedback,
  listarFeedback,
  actualizarFeedback,
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
    const r = await guardarSemana(semana, { estado, nota, posts });
    res.json({ ...r, semana: await leerSemana(semana) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
