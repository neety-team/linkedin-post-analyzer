// Test de las rutas de newsletter, sin base de datos. Se corre con:
//   cd backend && npx tsx src/routes/newsletter.test.ts
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { crearRouter, DepsNewsletter } from './newsletter';
import { puedeAprobar } from '../services/newsletter';

const ID_BORRADOR = '11111111-1111-4111-8111-111111111111';
const ID_IDEA = '22222222-2222-4222-8222-222222222222';
const ID_NADA = '33333333-3333-4333-8333-333333333333';

const estados: Record<string, string> = { [ID_BORRADOR]: 'borrador', [ID_IDEA]: 'idea' };
let aprobadosLlamadas = 0;

const deps: DepsNewsletter = {
  listarCorreos: async () => ({
    proximos: Object.entries(estados).map(([id, estado]) => ({ id, estado, feedback: [], metricas: null })),
    enviados: [],
  }),
  aprobarCorreo: async (id, quien) => {
    aprobadosLlamadas++;
    if (!(id in estados)) return 'no_existe';
    if (estados[id] === 'idea') return 'una idea no se aprueba, primero un borrador';
    estados[id] = 'aprobado';
    return 'ok';
  },
  crearFeedback: async (correoId, autor, texto) => ({ id: 'f1', correo_id: correoId, autor, texto }),
  puedeAprobar, // el real: es la regla que se prueba
  estadoMetricas: () => ({ configurado: !!process.env.BREVO_API_KEY }),
  estadoBarrido: async () => ({ ultimo_at: null, error: null }),
  refrescarMetricas: async () => ({ campanas: 0, error: null }),
};

async function servir(email: string | null) {
  const app = express();
  app.use((req, _res, next) => {
    if (email) (req as any).identidad = { email, nombre: email.split('@')[0], rol: null };
    next();
  });
  app.use('/api/newsletter', crearRouter(deps));
  const srv = await new Promise<import('node:http').Server>((r) => {
    const s = app.listen(0, () => r(s));
  });
  const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/newsletter`;
  return { base, cerrar: () => srv.close() };
}

const cuerpo = (r: Response): Promise<any> => r.json();

async function main() {
  delete process.env.BREVO_API_KEY;

  // Unai: 403, y sin llegar a tocar el servicio
  let s = await servir('unai@neety.com');
  let r = await fetch(`${s.base}/correos/${ID_BORRADOR}/aprobar`, { method: 'POST' });
  assert.equal(r.status, 403);
  r = await fetch(`${s.base}/correos/${ID_NADA}/aprobar`, { method: 'POST' });
  assert.equal(r.status, 403, 'un id que no existe tampoco se sondea');
  assert.equal(aprobadosLlamadas, 0);
  let g: any = await await cuerpo(await fetch(s.base));
  assert.equal(g.puedo_aprobar, false);
  s.cerrar();

  // Sin identidad: 403
  s = await servir(null);
  r = await fetch(`${s.base}/correos/${ID_BORRADOR}/aprobar`, { method: 'POST' });
  assert.equal(r.status, 403);
  g = await await cuerpo(await fetch(s.base));
  assert.equal(g.puedo_aprobar, false);
  s.cerrar();

  // Iker
  s = await servir('iker@neety.com');
  r = await fetch(`${s.base}/correos/${ID_IDEA}/aprobar`, { method: 'POST' });
  assert.equal(r.status, 409);
  assert.match((await cuerpo(r)).error, /idea/);
  r = await fetch(`${s.base}/correos/${ID_NADA}/aprobar`, { method: 'POST' });
  assert.equal(r.status, 404);
  r = await fetch(`${s.base}/correos/${ID_BORRADOR}/aprobar`, { method: 'POST' });
  assert.equal(r.status, 200);
  assert.equal((await cuerpo(r)).estado, 'aprobado');
  g = await await cuerpo(await fetch(s.base));
  assert.equal(g.puedo_aprobar, true);
  assert.equal(g.metricas.configurado, false, 'sin BREVO_API_KEY no hay métricas configuradas');
  assert.equal(g.metricas.ultimo_barrido, null);
  assert.ok(Array.isArray(g.proximos) && Array.isArray(g.enviados));

  // Feedback: con identidad firma con su nombre y no con el del cuerpo
  r = await fetch(`${s.base}/correos/${ID_BORRADOR}/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: 'Más corto', autor: 'Otro' }),
  });
  assert.equal(r.status, 201);
  assert.equal((await cuerpo(r)).autor, 'iker');

  // Refrescar sin clave: 409
  r = await fetch(`${s.base}/refrescar`, { method: 'POST' });
  assert.equal(r.status, 409);
  s.cerrar();

  console.log('newsletter (rutas): ok');
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
