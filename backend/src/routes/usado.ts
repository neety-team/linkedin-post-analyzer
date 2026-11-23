import { Router, Request, Response } from 'express';
import { desdeValido, leerUsado } from '../services/usado';

/**
 * GET /api/usado?desde=YYYY-MM-DD — los correos y los posts ya aprobados, programados o
 * publicados, con su texto. Lo leen validar-email.py y validar-post.py con el token de máquinas
 * para saber qué está gastado (2026-11-24). Sin `desde`, los últimos 120 días.
 */
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    res.json(await leerUsado(desdeValido(req.query.desde)));
  } catch (err: any) {
    console.error('[usado]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
