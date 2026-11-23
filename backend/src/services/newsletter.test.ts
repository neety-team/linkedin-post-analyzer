// Test de la logica de newsletter. Se corre con:  cd backend && npx tsx src/services/newsletter.test.ts
import assert from 'node:assert/strict';
import {
  huellaTexto,
  estadoTrasReescribir,
  motivoNoReescribible,
  puedeAprobar,
  motivoNoAprobable,
  estadoAlVincular,
  diaMadrid,
  MOTIVO_CAMBIADO,
  MOTIVO_NO_APROBADO,
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
// 2026-11-23: el HTML de la preview es lo que se aprueba; si cambia, cambia la huella.
assert.notEqual(huellaTexto({ remitente: 'Kaixito', asunto: 'a', cuerpo: 'x', html: '<p>x</p>' } as any), h);
assert.notEqual(
  huellaTexto({ remitente: 'Kaixito', asunto: 'a', cuerpo: 'x', html: '<p>x</p>' } as any),
  huellaTexto({ remitente: 'Kaixito', asunto: 'a', cuerpo: 'x', html: '<p>y</p>' } as any)
);

// Aprobar solo el texto que se vio
assert.equal(motivoNoAprobable({ estado: 'borrador', validador_ok: true, huella: h }, h), null);
assert.equal(motivoNoAprobable({ estado: 'borrador', validador_ok: true, huella: h }, 'vieja'), MOTIVO_CAMBIADO);
assert.equal(motivoNoAprobable({ estado: 'borrador', validador_ok: true, huella: null }, h), MOTIVO_CAMBIADO);

// Vincular una campana. "Hoy" es el 20/11 a las 23:30 UTC, que en Madrid ya es el 21/11.
const hoy = new Date('2026-11-20T23:30:00Z');
assert.equal(diaMadrid(hoy), '2026-11-21');
const est = (r: { estado: string } | { motivo: string }) => ('estado' in r ? r.estado : `motivo: ${r.motivo}`);
assert.equal(est(estadoAlVincular({ estado: 'aprobado' }, 38, false, hoy)), 'programado');
assert.equal(est(estadoAlVincular({ estado: 'borrador' }, 38, false, hoy)), `motivo: ${MOTIVO_NO_APROBADO}`);
assert.equal(est(estadoAlVincular({ estado: 'idea' }, 38, false, hoy)), `motivo: ${MOTIVO_NO_APROBADO}`);
assert.equal(est(estadoAlVincular({ estado: 'programado' }, null, false, hoy)), 'borrador');
// Un enviado no se desvincula
assert.match(est(estadoAlVincular({ estado: 'enviado' }, null, false, hoy)), /motivo: .*enviado/);
// Histórico: idea o borrador con fecha anterior a hoy (Madrid) pasa a enviado
assert.equal(est(estadoAlVincular({ estado: 'borrador', fecha: '2026-11-12' }, 36, true, hoy)), 'enviado');
assert.equal(est(estadoAlVincular({ estado: 'idea', fecha: '2026-11-20' }, 36, true, hoy)), 'enviado', 'el 20 ya es ayer en Madrid');
// Histórico rechazado: desde aprobado, programado o enviado
for (const estado of ['aprobado', 'programado', 'enviado']) {
  assert.match(est(estadoAlVincular({ estado, fecha: '2026-11-12' }, 36, true, hoy)), /motivo: histórico solo vale para una idea o un borrador/);
}
// Histórico rechazado: fecha de hoy o futura, o sin fecha
assert.match(est(estadoAlVincular({ estado: 'borrador', fecha: '2026-11-21' }, 39, true, hoy)), /motivo: .*no es anterior a hoy/);
assert.match(est(estadoAlVincular({ estado: 'borrador', fecha: '2026-11-24' }, 39, true, hoy)), /motivo: .*no es anterior a hoy/);
assert.match(est(estadoAlVincular({ estado: 'borrador', fecha: null }, 39, true, hoy)), /motivo: .*fecha/);
assert.match(est(estadoAlVincular({ estado: 'borrador' }, 39, true, hoy)), /motivo: .*fecha/);

console.log('newsletter.test.ts: OK');
