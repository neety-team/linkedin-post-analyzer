// Test de la logica de newsletter. Se corre con:  cd backend && npx tsx src/services/newsletter.test.ts
import assert from 'node:assert/strict';
import {
  huellaTexto,
  estadoTrasReescribir,
  motivoNoReescribible,
  puedeAprobar,
  motivoNoAprobable,
  estadoAlVincular,
} from './newsletter';

const h = huellaTexto({ remitente: 'Kaixito', asunto: 'a', cuerpo: 'x' } as any);
assert.equal(estadoTrasReescribir({ estado: 'aprobado', huella: h }, h), 'aprobado');
assert.equal(estadoTrasReescribir({ estado: 'aprobado', huella: h }, 'otra'), 'borrador');
assert.equal(estadoTrasReescribir({ estado: 'idea', huella: null as any }, 'otra', 'borrador'), 'borrador');
assert.match(motivoNoReescribible({ brevo_campaign_id: 38, estado: 'programado' })!, /cancela/i);
assert.match(motivoNoReescribible({ brevo_campaign_id: 36, estado: 'enviado' })!, /cancela|enviado/i);
assert.equal(motivoNoReescribible({ brevo_campaign_id: null, estado: 'aprobado' }), null);
assert.equal(puedeAprobar({ email: 'iker@neety.com', nombre: 'Iker', rol: null }), true);
assert.equal(puedeAprobar({ email: 'IKER@neety.com', nombre: 'Iker', rol: null }), true);
assert.equal(puedeAprobar({ email: 'unai@neety.com', nombre: 'Unai', rol: null }), false);
assert.equal(puedeAprobar(null), false);
assert.equal(motivoNoAprobable({ estado: 'borrador', validador_ok: true }), null);
assert.ok(motivoNoAprobable({ estado: 'borrador', validador_ok: false }));
assert.ok(motivoNoAprobable({ estado: 'idea', validador_ok: true }));

// La huella solo depende del texto
assert.equal(huellaTexto({ remitente: 'Kaixito', asunto: 'a', cuerpo: 'x', pilar: 'p' } as any), h);
assert.notEqual(huellaTexto({ remitente: 'Kaixito', asunto: 'b', cuerpo: 'x' } as any), h);

// Vincular una campana
assert.equal(estadoAlVincular('aprobado', 38, false), 'programado');
assert.equal(estadoAlVincular('borrador', 38, false), 'no_aprobado');
assert.equal(estadoAlVincular('idea', 38, false), 'no_aprobado');
assert.equal(estadoAlVincular('borrador', 36, true), 'enviado');
assert.equal(estadoAlVincular('programado', null, false), 'borrador');
assert.equal(estadoAlVincular('enviado', null, false), 'borrador');

console.log('newsletter.test.ts: OK');
