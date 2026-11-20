// Test de las rutas de newsletter, sin base de datos. Se corre con:
//   cd backend && npx tsx src/routes/newsletter.test.ts
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';
import { crearRouter, DepsNewsletter } from './newsletter';
import { puedeAprobar, MOTIVO_CAMBIADO } from '../services/newsletter';

const ID_BORRADOR = '11111111-1111-4111-8111-111111111111';
const ID_IDEA = '22222222-2222-4222-8222-222222222222';
const ID_ENVIADO = '44444444-4444-4444-8444-444444444444';
const ID_NADA = '33333333-3333-4333-8333-333333333333';

const estados: Record<string, string> = { [ID_BORRADOR]: 'borrador', [ID_IDEA]: 'idea' };
const HUELLA = 'h-actual';
let aprobadosLlamadas = 0;
let conversionesColgadas = false;

const deps: DepsNewsletter = {
  listarCorreos: async () => ({
    proximos: Object.entries(estados).map(([id, estado]) => ({ id, estado, feedback: [], metricas: null })),
    enviados: [{ id: ID_ENVIADO, estado: 'enviado', fecha: '2026-11-12', feedback: [], metricas: null }],
  }),
  aprobarCorreo: async (id, quien, huella) => {
    aprobadosLlamadas++;
    if (!(id in estados)) return 'no_existe';
    if (estados[id] === 'idea') return 'una idea no se aprueba, primero un borrador';
    if (huella !== HUELLA) return MOTIVO_CAMBIADO;
    estados[id] = 'aprobado';
    return 'ok';
  },
  crearFeedback: async (correoId, autor, texto) => ({ id: 'f1', correo_id: correoId, autor, texto }),
  puedeAprobar, // el real: es la regla que se prueba
  estadoMetricas: () => ({ configurado: !!process.env.BREVO_API_KEY }),
  estadoBarrido: async () => ({ ultimo_at: null, error: null }),
  refrescarMetricas: async () => ({ campanas: 0, error: null }),
  conversionesDeEnviados: async (env) => {
    if (conversionesColgadas) await new Promise(() => {}); // nunca contesta
    return env.map(() => ({ demos: 3, inscritos: null }));
  },
};

async function servir(email: string | null) {
  const app = express();
  app.use((req, _res, next) => {
    if (email) (req as any).identidad = { email, nombre: email.split('@')[0], rol: null };
    next();
  });
  app.use('/api/newsletter', crearRouter(deps, { msConversiones: 100 }));
  const srv = await new Promise<import('node:http').Server>((r) => {
    const s = app.listen(0, () => r(s));
  });
  const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/newsletter`;
  return { base, cerrar: () => srv.close() };
}

const cuerpo = (r: Response): Promise<any> => r.json();
const aprobar = (base: string, id: string, body?: unknown) =>
  fetch(`${base}/correos/${id}/aprobar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

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
  assert.deepEqual(g.enviados[0].conversiones, { demos: 3, inscritos: null }, 'cada enviado trae sus conversiones');
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
  // Sin huella: 400, y sin llegar al servicio
  const antes = aprobadosLlamadas;
  r = await aprobar(s.base, ID_BORRADOR);
  assert.equal(r.status, 400);
  assert.match((await cuerpo(r)).error, /huella/);
  r = await aprobar(s.base, ID_BORRADOR, { huella: '' });
  assert.equal(r.status, 400);
  assert.equal(aprobadosLlamadas, antes, 'sin huella no se llama a aprobar');
  r = await aprobar(s.base, ID_IDEA, { huella: HUELLA });
  assert.equal(r.status, 409);
  assert.match((await cuerpo(r)).error, /idea/);
  r = await aprobar(s.base, ID_NADA, { huella: HUELLA });
  assert.equal(r.status, 404);
  // Huella vieja (el texto cambió desde que se abrió la tarjeta): 409 y sigue en borrador
  r = await aprobar(s.base, ID_BORRADOR, { huella: 'h-vieja' });
  assert.equal(r.status, 409);
  assert.equal((await cuerpo(r)).error, MOTIVO_CAMBIADO);
  assert.equal(estados[ID_BORRADOR], 'borrador');
  r = await aprobar(s.base, ID_BORRADOR, { huella: HUELLA });
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

  // Conversiones que no contestan: el GET responde igual, con ellas en null
  conversionesColgadas = true;
  const t0 = Date.now();
  g = await cuerpo(await fetch(s.base));
  assert.ok(Date.now() - t0 < 1500, 'el GET no espera a las conversiones');
  assert.deepEqual(g.enviados[0].conversiones, { demos: null, inscritos: null });
  conversionesColgadas = false;
  s.cerrar();

  console.log('newsletter (rutas): ok');
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
