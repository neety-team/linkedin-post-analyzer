import { Router, Request, Response } from 'express';
import pool from '../db';

// POST /api/submit — el proxy del gate de neety-resources.
//
// POR QUÉ EXISTE, y por qué NO escribimos nuestro propio formulario: el gate real
// (`neety-form.js`) se sirve tal cual desde recursos.neety.com y su fetch es a
// `/api/submit` RELATIVO, así que desde nuestra página pega aquí. Nosotros
// reenviamos a su endpoint. Resultado: mismo origen (cero CORS), el gate es
// literalmente su fichero (cero fork), y los correos caen en su tabla `leads`
// (una sola lista, que es lo único que importa).
//
// ⚠️ LA RAZÓN DE FONDO ES LEGAL, NO DE ESTILO. Antes teníamos aquí un formulario
// propio con UN consentimiento redactado por mí. Su gate tiene DOS, con textos
// legales concretos (COMMS_TEXT / DATA_TEXT). En la tabla solo se guardan dos
// booleanos, y el SIGNIFICADO de esos booleanos es el texto que se le enseñó a la
// persona: con otra redacción, `consent_comms = true` querría decir dos cosas
// distintas dentro de la misma lista. Es la lista partida otra vez, pero sin que
// se vea. Por eso no se reimplementa: se sirve el suyo.
//
// 23/11/2026: recursos.neety.com ya no existe (su /api/submit responde 410) y la
// página /r/ ya no carga neety-form.js: tiene su propio formulario (routes/rastro.ts).
// Este proxy queda solo para una página vieja abierta o guardada con el gate
// antiguo, y reenvía a la lista de leads de neety.com (`POST /api/lead`, los
// mismos campos más `lang` y `page`). Se puede retirar cuando nadie lo llame.
const router = Router();

const UPSTREAM = process.env.NEETY_LEAD_URL || 'https://neety.com/api/lead';
// Cerrado a propósito: su whitelist rechaza cualquier otro valor con 400
// invalid_resource, así que un typo aquí seria cero correos, no correos mal
// clasificados.
const RESOURCE = 'auditoria-web';

router.post('/', async (req: Request, res: Response) => {
  const { email, consent_data, consent_comms, utm_source, utm_medium, utm_campaign } = req.body ?? {};
  const referer = String(req.get('referer') || '');
  try {
    const r = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        // Nos lo pide su README y es lo más útil que podemos mandar: identifica
        // la auditoría concreta (.../r/<id>). Sin esto, en server-a-server les
        // llegaría el referer de NUESTRO servidor, que no dice nada.
        ...(referer ? { referer } : {}),
        ...(req.get('user-agent') ? { 'user-agent': String(req.get('user-agent')) } : {}),
        // NO mandamos X-Forwarded-For: su README avisa de que no sirve, porque
        // submit.js lee cf-connecting-ip y Cloudflare lo reescribe igualmente.
      },
      body: JSON.stringify({
        email, resource: RESOURCE,
        consent_data: !!consent_data, consent_comms: !!consent_comms,
        utm_source: utm_source ?? null, utm_medium: utm_medium ?? null, utm_campaign: utm_campaign ?? null,
        lang: 'es',
        page: (referer.match(/\/r\/[A-Za-z0-9_-]+/) || [null])[0],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await r.json().catch(() => ({}));
    // Su Set-Cookie NO se reenvía (su README: en nuestro dominio no la lee nadie).
    // Nuestro desbloqueo va por la fila de rastro_analysis, no por su cookie.
    if (r.ok) {
      const m = referer.match(/\/r\/([A-Za-z0-9_-]+)/);
      if (m && email) {
        // Guardamos también aquí para poder abrir SU página al recargar. La lista
        // de leads sigue siendo la de ellos: esto es solo el pase de esta página.
        await pool.query('UPDATE rastro_analysis SET email = $1 WHERE share_id = $2', [String(email).toLowerCase(), m[1]]);
      }
    }
    // `redirect` siempre null con auditoria-web, por diseño suyo.
    res.status(r.status).json(body);
  } catch (err: any) {
    res.status(502).json({ error: 'upstream_error', detail: err.message });
  }
});

export default router;
