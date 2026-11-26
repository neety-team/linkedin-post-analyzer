/**
 * Cuándo se pulsa solo «Traer posts nuevos» y para qué cuenta. Sin BD ni red.
 *   npx tsx src/scripts/testTraerTrasPublicar.ts
 */
import { decidir, creadorDeCuenta, ESPERA_MIN, AGRUPAR_MIN, ESPERA_MAX_MIN, REINTENTO_MIN, MAX_INTENTOS, type Pendiente } from '../services/traerTrasPublicar';

let fallos = 0;
const ok = (c: boolean, m: string) => {
  console.log(`${c ? 'OK ' : 'FALLO'} ${m}`);
  if (!c) fallos++;
};
const M = 60 * 1000;
const ahora = new Date('2098-03-03T09:00:00Z');
const hace = (min: number) => new Date(ahora.getTime() - min * M);
const en = (min: number) => new Date(ahora.getTime() + min * M);
const p = (clave: string, momento: Date, extra: Partial<Pendiente> = {}): Pendiente => ({
  id: clave, clave, cuenta: 'iker', momento, intentos: 0, ultimo: null, ...extra,
});

ok(decidir([p('a', hace(ESPERA_MIN - 1))], [], ahora).traer.length === 0, 'no trae antes de que LinkedIn lo tenga');
ok(decidir([p('a', hace(ESPERA_MIN))], [], ahora).traer.length === 1, `trae a los ${ESPERA_MIN} min de su hora`);
ok(decidir([p('a', en(5))], [], ahora).traer.length === 0, 'un post aún no salido no se trae');

const agrupa = decidir([p('a', hace(5))], [en(AGRUPAR_MIN - 5)], ahora);
ok(agrupa.traer.length === 0 && !!agrupa.motivo, 'espera si otro post sale enseguida');
ok(decidir([p('a', hace(5))], [en(AGRUPAR_MIN + 5)], ahora).traer.length === 1, 'no espera a uno que sale mucho después');
ok(decidir([p('a', hace(ESPERA_MAX_MIN))], [en(5)], ahora).traer.length === 1, `no retrasa más de ${ESPERA_MAX_MIN} min la primera traída`);

ok(decidir([p('a', hace(30), { intentos: 1, ultimo: hace(REINTENTO_MIN - 1) })], [], ahora).traer.length === 0, 'no reintenta antes de tiempo');
ok(decidir([p('a', hace(30), { intentos: 1, ultimo: hace(REINTENTO_MIN) })], [], ahora).traer.length === 1, `reintenta a los ${REINTENTO_MIN} min`);
ok(decidir([p('a', hace(30), { intentos: 1, ultimo: hace(REINTENTO_MIN) })], [en(5)], ahora).traer.length === 1, 'un reintento no espera a nadie');
ok(decidir([p('a', hace(90), { intentos: MAX_INTENTOS, ultimo: hace(60) })], [], ahora).traer.length === 0, `lo deja tras ${MAX_INTENTOS} intentos`);

const dos = decidir([p('a', hace(10)), p('b', hace(4), { cuenta: 'unai' })], [], ahora);
ok(dos.traer.length === 2, 'dos posts de la mañana salen en la misma traída');

const creadores = [
  { id: 'I', name: 'Iker Galarza Rodríguez' },
  { id: 'U', name: 'Unai Arambarri Yeregui' },
  { id: 'A', name: 'Asier Olaizola' },
  { id: 'J', name: 'José Tomás López Cifuentes' },
];
ok(creadorDeCuenta('iker', creadores) === 'I', 'iker → su creador');
ok(creadorDeCuenta('jose', creadores) === 'J', 'josé, con tilde, también');
ok(creadorDeCuenta('ismael', creadores) === null, 'una cuenta sin creador conectado no se trae');
ok(creadorDeCuenta('asier', [...creadores, { id: 'A2', name: 'Asier Otro' }]) === 'A', 'el nombre completo manda sobre el de pila');

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
