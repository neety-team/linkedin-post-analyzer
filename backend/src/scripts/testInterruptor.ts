/**
 * El interruptor de la subida automatica y la deteccion de cuentas de Unipile.
 *   DATABASE_URL=postgres://prueba@localhost:5544/neety_lpa_prueba npx tsx src/scripts/testInterruptor.ts
 */
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('Esta prueba solo corre contra un Postgres local (DATABASE_URL con localhost).');
  process.exit(1);
}
delete process.env.PUBLICAR_LINKEDIN;
delete process.env.UNIPILE_API_KEY;
delete process.env.UNIPILE_BASE_URL;
import pool from '../db';
import { runMigrations } from '../db/migrate';
import { elegirCuentas, publicarActivo, cambiarSubidaAutomatica, estadoPublicador } from '../services/publicadorLinkedin';

let fallos = 0;
const ok = (c: boolean, m: string) => {
  console.log(`${c ? 'OK ' : 'FALLO'} ${m}`);
  if (!c) fallos++;
};

(async () => {
  await runMigrations();
  const previo = (await pool.query(`SELECT * FROM publicador_ajustes WHERE id = 1`)).rows[0];

  // Cuentas
  const li = (id: string, name: string, status = 'OK') => ({ id, type: 'LINKEDIN', name, sources: [{ status }] });
  const m = elegirCuentas([
    li('A', 'Iker Galarza Rodríguez'),
    li('B', 'Unai Arambarri Yeregui'),
    li('C', 'Unai Arambarri Yeregui'),
    li('D', 'Asier Olaizola', 'CREDENTIALS'),
    { id: 'E', type: 'MAIL', name: 'Asier Olaizola', sources: [{ status: 'OK' }] },
  ]);
  ok(m.iker === 'A', 'encuentra la cuenta por el nombre de LinkedIn');
  ok(m.unai === null, 'con dos cuentas iguales no elige ninguna');
  ok(m.asier === null, 'una cuenta desconectada o que no es de LinkedIn no vale');
  ok(elegirCuentas([li('X', 'iker galarza rodriguez')]).iker === 'X', 'sin importar tildes ni mayúsculas');

  // Interruptor
  await cambiarSubidaAutomatica(false, 'Prueba');
  ok((await publicarActivo()) === false, 'apagado');
  await cambiarSubidaAutomatica(true, 'Prueba');
  ok((await publicarActivo()) === true, 'el botón lo enciende');
  const e = await estadoPublicador();
  ok(e.activo === true && e.cambiado_por === 'Prueba' && !!e.cambiado_at && e.forzado === null, 'y apunta quién y cuándo');
  process.env.PUBLICAR_LINKEDIN = '0';
  ok((await publicarActivo()) === false && (await estadoPublicador()).forzado === 'apagado', 'PUBLICAR_LINKEDIN=0 lo apaga aunque el botón diga que sí');
  delete process.env.PUBLICAR_LINKEDIN;

  // Dejarlo como estaba
  if (previo) {
    await pool.query(`UPDATE publicador_ajustes SET activo = $1, cambiado_por = $2, cambiado_at = $3 WHERE id = 1`, [
      previo.activo,
      previo.cambiado_por,
      previo.cambiado_at,
    ]);
  } else {
    await pool.query(`DELETE FROM publicador_ajustes WHERE id = 1`);
  }
  console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo OK');
  await pool.end();
  process.exit(fallos ? 1 : 0);
})();
