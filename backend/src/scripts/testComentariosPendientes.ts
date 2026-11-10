// Test de la regla de hilos pendientes e ignorados (services/comentariosPendientes.ts).
// Se corre con:
//   npx tsx backend/src/scripts/testComentariosPendientes.ts
import assert from 'node:assert/strict';
import { marcarPendientes, HiloMin, ComentarioMin } from '../services/comentariosPendientes';

const YO = 'ACoYO';
let n = 0;
const c = (autor: string, hora: number, extra: Partial<ComentarioMin> = {}): ComentarioMin => ({
  id: `c${++n}`,
  date: new Date(Date.UTC(2026, 10, 10, hora)).toISOString(),
  author: { profile_id: autor },
  my_reaction: null,
  ...extra,
});
const hilo = (top: ComentarioMin, ...replies: ComentarioMin[]): HiloMin => ({ ...top, replies });
const corre = (h: HiloMin, ignorados: string[] = []) => {
  marcarPendientes([h], YO, new Set(ignorados));
  return { cerrado: !!h.answered_by_author, pendientes: (h.pending_followups ?? []).map((r) => r.id) };
};

// ── Reglas previas, sin ignorados: no cambian ──
{
  const h = hilo(c('mario', 1));
  assert.deepEqual(corre(h), { cerrado: false, pendientes: [] }, 'comentario sin tocar: pendiente');
}
{
  const h = hilo(c('mario', 1, { my_reaction: 'like' }));
  assert.equal(corre(h).cerrado, true, 'una reacción lo cierra');
}
{
  const h = hilo(c('mario', 1), c(YO, 2));
  assert.equal(corre(h).cerrado, true, 'cola nuestra: cerrado');
}
{
  const a = c('ana', 3);
  const h = hilo(c('mario', 1), c(YO, 2), a, c('pepe', 4, { my_reaction: 'like' }));
  assert.equal(corre(h).cerrado, true, 'el de en medio sin atender no reabre si la cola está atendida');
}

// ── El hilo de la captura: respondimos y entró un follow-up; se ignora ──
{
  const f = c('mario', 3);
  const h = hilo(c('mario', 1), c(YO, 2), f);
  assert.deepEqual(corre(h), { cerrado: false, pendientes: [f.id] }, 'sin ignorar: pendiente');
  assert.deepEqual(corre(h, [f.id]), { cerrado: true, pendientes: [] }, 'ignorado: el hilo entero fuera');
}

// ── Dos follow-ups, se ignora el primero: sigue abierto apuntando al otro ──
{
  const a = c('mario', 3), b = c('ana', 4);
  const h = hilo(c('mario', 1), c(YO, 2), a, b);
  assert.deepEqual(corre(h, [a.id]), { cerrado: false, pendientes: [b.id] });
}

// ── Se ignora el ÚLTIMO con otro pendiente antes: NO se cierra ──
{
  const a = c('ana', 3), b = c('mario', 4);
  const h = hilo(c('mario', 1), c(YO, 2), a, b);
  assert.deepEqual(corre(h, [b.id]), { cerrado: false, pendientes: [a.id] });
}

// ── Comentario nuevo después de ignorar: vuelve (otra persona y la misma) ──
{
  const f = c('mario', 3), nuevo = c('ana', 5);
  const h = hilo(c('mario', 1), c(YO, 2), f, nuevo);
  assert.deepEqual(corre(h, [f.id]), { cerrado: false, pendientes: [nuevo.id] }, 'otra persona');
}
{
  const f = c('mario', 3), otraVez = c('mario', 5);
  const h = hilo(c('mario', 1), c(YO, 2), f, otraVez);
  assert.deepEqual(corre(h, [f.id]), { cerrado: false, pendientes: [otraVez.id] }, 'se ignora el comentario, no la persona');
}

// ── Comentario de arriba ignorado en un hilo donde nunca escribimos ──
{
  const top = c('troll', 1);
  assert.equal(corre(hilo(top), [top.id]).cerrado, true, 'sin respuestas: fuera');
}
{
  const top = c('troll', 1), tercero = c('ana', 2);
  const h = hilo(top, tercero);
  assert.deepEqual(corre(h, [top.id]), { cerrado: false, pendientes: [tercero.id] }, 'la respuesta va al tercero');
}
{
  const top = c('troll', 1), suya = c('troll', 2);
  const h = hilo(top, suya);
  assert.deepEqual(corre(h, [top.id, suya.id]), { cerrado: true, pendientes: [] }, 'todo ignorado: fuera');
}

// ── Ignorar una respuesta del medio en un hilo sin nosotros ──
{
  const top = c('mario', 1, { my_reaction: 'like' }), r = c('ana', 2);
  assert.equal(corre(hilo(top, r), [r.id]).cerrado, true, 'la cola efectiva es el de arriba, con reacción');
}

// ── Deshacer = quitar del conjunto: vuelve el estado de antes ──
{
  const f = c('mario', 3);
  const h = hilo(c('mario', 1), c(YO, 2), f);
  corre(h, [f.id]);
  assert.deepEqual(corre(h, []), { cerrado: false, pendientes: [f.id] });
}

console.log('✓ comentariosPendientes: todos los casos en verde');
