/**
 * El efecto abeja y la segunda foto, contra un Postgres local y sin red.
 *   DATABASE_URL=postgres://prueba@localhost:5544/neety_lpa_prueba npx tsx src/scripts/testAbeja.ts
 */
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('Esta prueba solo corre contra un Postgres local (DATABASE_URL con localhost).');
  process.exit(1);
}
delete process.env.EFECTO_ABEJA;
delete process.env.ANTHROPIC_API_KEY;
import pool from '../db';
import { runMigrations } from '../db/migrate';
import { guardarSemana, guardarImagen, leerImagen, borrarImagen } from '../services/semana';
import { prepararPublicacion, cuerpoUnipile } from '../services/publicadorLinkedin';
import { planRonda, planificarAbeja, vueltaAbeja, cambiarAbeja, estadoAbeja, type Ejecutor } from '../services/abeja';
import { repartirRoles, limpiarTexto, interpretarRonda, componerAviso, type Ronda } from '../services/abejaTextos';

let fallos = 0;
const ok = (c: boolean, m: string) => {
  console.log(`${c ? 'OK ' : 'FALLO'} ${m}`);
  if (!c) fallos++;
};
const S = '2098-W20';
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 1)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 2)]);

const ronda: Ronda = {
  idioma: 'es',
  comentarios: [
    { cuenta: 'unai', rol: 'apoyo', texto: 'Esto lo vimos en la feria de Bilbao', respuesta: 'Justo, Unai' },
    { cuenta: 'asier', rol: 'duda', texto: '¿Y si el que decide no está en LinkedIn?', respuesta: 'Pasa, y entonces se llama' },
  ],
};

/** Un LinkedIn de mentira que apunta lo que se le pide. */
function falso() {
  const log: string[] = [];
  let n = 0;
  const ej: Ejecutor = {
    async localizar() {
      log.push('localizar');
      return { social_id: 'urn:li:activity:1', url: 'https://www.linkedin.com/feed/update/urn:li:activity:1/' };
    },
    async comentar(p) {
      log.push(`comentar ${p.account_id}${p.responde_a ? ` responde ${p.responde_a}` : ''}: ${p.texto}`);
      return { comment_id: p.responde_a ? null : `c${++n}` };
    },
    async reaccionar(p) {
      log.push(`like ${p.account_id}${p.comment_id ? ` en ${p.comment_id}` : ''}`);
    },
    async repost(p) {
      log.push(`repost ${p.account_id}`);
    },
    async chat(t) {
      log.push(`chat ${t}`);
    },
    async cabecera() {
      return '🐝 Nuevo post de IKER:';
    },
  };
  return { ej, log };
}
const cuentas = { iker: 'A-iker', unai: 'A-unai', asier: 'A-asier' };

(async () => {
  await runMigrations();
  await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]);
  const base = { fecha: '2098-05-13', cuenta: 'iker', objetivo: 'alcance', titulo: 't', texto: 'Hola, esto es un post' };
  await guardarSemana(S, { posts: [{ clave: 'a-1', ...base }, { clave: 'a-2', ...base }, { clave: 'a-3', ...base }] } as any);
  const id = async (c: string) => (await pool.query(`SELECT id FROM semana_posts WHERE semana = $1 AND clave = $2`, [S, c])).rows[0].id;
  const P1 = await id('a-1');
  const P2 = await id('a-2');
  const P3 = await id('a-3');

  // ── Segunda foto ──
  let err = '';
  try {
    await guardarImagen(P1, JPG, 2);
  } catch (e: any) {
    err = e.message;
  }
  ok(/primero la foto 1/.test(err), 'la foto 2 no se sube sin la 1');
  await guardarImagen(P1, PNG, 1);
  await guardarImagen(P1, JPG, 2);
  ok((await leerImagen(P1, 2))?.tipo === 'image/jpeg' && (await leerImagen(P1, 1))?.tipo === 'image/png', 'guarda las dos fotos');
  const f = (await pool.query(`SELECT * FROM semana_posts WHERE id = $1`, [P1])).rows[0];
  const pub = prepararPublicacion({ ...f, account_id: 'X' });
  ok(pub.imagenes.length === 2 && pub.imagenes[0].tipo === 'image/png' && pub.imagenes[1].tipo === 'image/jpeg', 'se publican las dos, en orden');
  const body = cuerpoUnipile(pub);
  const adj = body.getAll('attachments') as File[];
  ok(adj.length === 2 && adj[0].name === 'foto1.png' && adj[1].name === 'foto2.jpeg', 'dos attachments en el multipart, la 1 primero');
  ok(await borrarImagen(P1, 1), 'quitar la 1...');
  ok((await leerImagen(P1, 1))?.tipo === 'image/jpeg' && !(await leerImagen(P1, 2)), '...sube la 2 a su sitio');

  // ── Textos ──
  ok(JSON.stringify(repartirRoles(['unai', 'asier'], () => 0.9).map((r) => r.rol)) === '["apoyo","angulo"]', 'el primero apoya, el segundo da otro ángulo');
  ok(limpiarTexto('Muy bueno — de verdad, y lo vimos #ventas', 'es', 220) === 'Muy bueno, de verdad y lo vimos', 'quita guion largo, coma antes de y y hashtags');
  ok(limpiarTexto('a'.repeat(50) + '. ' + 'b'.repeat(300), 'es', 100).length <= 100, 'respeta el tope');
  const r = interpretarRonda(
    '```json\n{"comentarios":[{"cuenta":"asier","comentario":"Dos","respuesta":"R2"},{"cuenta":"unai","comentario":"Uno","respuesta":"R1"}]}\n```',
    [
      { cuenta: 'unai', rol: 'apoyo' },
      { cuenta: 'asier', rol: 'duda' },
    ],
    'es'
  );
  ok(r.comentarios[0].texto === 'Uno' && r.comentarios[1].respuesta === 'R2', 'casa cada comentario con su cuenta (JSON)');
  const r2 = interpretarRonda(
    'COMENTARIO unai: Lo de "quién decide" es la clave\nRESPUESTA unai: Justo eso\nCOMENTARIO asier: ¿Y en ferias?\nRESPUESTA asier: También',
    [
      { cuenta: 'unai', rol: 'apoyo' },
      { cuenta: 'asier', rol: 'duda' },
    ],
    'es'
  );
  const r3 = interpretarRonda(
    '**COMENTARIO <Iker> (apoyo):** Muy de acuerdo\n**RESPUESTA <iker>:** Gracias\n- COMENTARIO Asier: ¿Y en ferias?\n- RESPUESTA Asier: También',
    [
      { cuenta: 'iker', rol: 'apoyo' },
      { cuenta: 'asier', rol: 'duda' },
    ],
    'es'
  );
  ok(r3.comentarios[0].texto === 'Muy de acuerdo' && r3.comentarios[0].respuesta === 'Gracias' && r3.comentarios[1].texto === '¿Y en ferias?', 'tolera negritas, <cuenta>, el rol y mayúsculas');
  const r4 = interpretarRonda(
    'COMENTARIO iker: Uno\nRESPUESTA unai: R-iker\n\nCOMENTARIO asier: Dos\nRESPUESTA unai: R-asier',
    [
      { cuenta: 'iker', rol: 'apoyo' },
      { cuenta: 'asier', rol: 'duda' },
    ],
    'en'
  );
  ok(r4.comentarios[0].respuesta === 'R-iker' && r4.comentarios[1].respuesta === 'R-asier', 'la respuesta va con el comentario de encima aunque la firme el autor');
  ok(r2.comentarios[0].texto === 'Lo de "quién decide" es la clave' && r2.comentarios[1].respuesta === 'También', 'lee el formato de líneas, con comillas dentro');
  const aviso = componerAviso({
    cabecera: 'CAB',
    url: 'U',
    autor: 'iker',
    automatica: true,
    comentarios: [{ cuenta: 'unai', texto: 'Hola', hora: new Date('2098-05-13T08:00:00Z') }],
    reposts: ['unai', 'asier'],
    recordatorio: 'REC',
  });
  ok(/Unai, hacia las 10:00: «Hola»/.test(aviso) && /Iker responde/.test(aviso) && /Repost de Unai y Asier/.test(aviso), 'el aviso cuenta la ronda');

  // ── Plan ──
  const plan = planRonda({ autor: 'iker', orden: ['unai', 'asier'], ronda, automatica: true, azar: () => 0.5 });
  const tipos = plan.map((a) => `${a.tipo}:${a.actor ?? '-'}`);
  ok(tipos.filter((t) => t.startsWith('comentar')).length === 2 && !tipos.includes('comentar:iker'), 'comentan los otros dos, no el autor');
  ok(tipos.filter((t) => t === 'responder:iker').length === 2, 'el autor responde a los dos');
  ok(tipos.filter((t) => t.startsWith('like_comentario')).length === 4, 'likes a los comentarios: el autor y el tercero');
  ok(tipos.filter((t) => t.startsWith('repost')).length === 2 && tipos.filter((t) => t.startsWith('like_post')).length === 2, 'likes y reposts de los otros dos');
  const com = plan.filter((a) => a.tipo === 'comentar');
  ok(com[0].minuto < com[1].minuto, 'los comentarios salen separados');
  ok(plan.filter((a) => a.tipo === 'responder').every((a) => a.minuto > plan.find((c) => c.ref === a.depende)!.minuto), 'la respuesta va después de su comentario');
  const apagado = planRonda({ autor: 'iker', orden: ['unai', 'asier'], ronda, automatica: false });
  ok(apagado.length === 2 && !!apagado[1].texto, 'apagado: solo verificar y aviso, con los comentarios para copiar');

  // ── Ejecución ──
  await cambiarAbeja(true, 'Prueba');
  ok((await estadoAbeja()).activo, 'interruptor encendido');
  const hace = new Date(Date.now() - 4 * 60 * 60 * 1000);
  ok((await planificarAbeja({ id: P2, cuenta: 'iker', texto: 'Hola' }, { ahora: hace, ronda, automatica: true, azar: () => 0.5 })) === 14, 'planifica 14 acciones');
  ok((await planificarAbeja({ id: P2, cuenta: 'iker', texto: 'Hola' }, { ronda })) === 0, 'no planifica dos veces el mismo post');
  const { ej, log } = falso();
  for (let i = 0; i < 6; i++) await vueltaAbeja({ ejecutor: ej, cuentas });
  const est = (await pool.query(`SELECT estado, COUNT(*)::int n FROM abeja_acciones WHERE semana_post_id = $1 GROUP BY estado`, [P2])).rows;
  ok(est.length === 1 && est[0].estado === 'hecho' && est[0].n === 14, 'todas hechas');
  ok(log[0] === 'localizar' && log[1].startsWith('chat '), 'primero localiza y luego avisa');
  ok(log.some((l) => l === 'comentar A-unai: Esto lo vimos en la feria de Bilbao'), 'Unai comenta desde su cuenta');
  ok(log.some((l) => /^comentar A-iker responde c\d: Justo, Unai$/.test(l)), 'Iker responde al comentario de Unai');
  ok(log.filter((l) => l.startsWith('repost')).length === 2, 'dos reposts');
  const sp = (await pool.query(`SELECT linkedin_social_id, chat_avisado_at FROM semana_posts WHERE id = $1`, [P2])).rows[0];
  ok(sp.linkedin_social_id === 'urn:li:activity:1' && !!sp.chat_avisado_at, 'apunta el social_id y el aviso');

  // Apagado: el aviso sale, las acciones de las cuentas esperan.
  await cambiarAbeja(false, 'Prueba');
  await planificarAbeja({ id: P3, cuenta: 'unai', texto: 'Hola' }, { ahora: hace, ronda: { idioma: 'es', comentarios: [] }, automatica: true, azar: () => 0.5 });
  const f2 = falso();
  await vueltaAbeja({ ejecutor: f2.ej, cuentas });
  await vueltaAbeja({ ejecutor: f2.ej, cuentas });
  ok(f2.log.length === 2 && f2.log[1].startsWith('chat '), 'apagado: solo localiza y avisa');
  const esperan = (await pool.query(`SELECT COUNT(*)::int n FROM abeja_acciones WHERE semana_post_id = $1 AND estado = 'pendiente'`, [P3])).rows[0].n;
  ok(esperan === 4, 'likes y reposts se quedan pendientes');

  // Un fallo definitivo tumba lo que depende de el.
  await pool.query(`UPDATE abeja_acciones SET estado = 'fallo' WHERE semana_post_id = $1 AND tipo = 'verificar'`, [P3]);
  await vueltaAbeja({ ejecutor: f2.ej, cuentas });
  const saltadas = (await pool.query(`SELECT COUNT(*)::int n FROM abeja_acciones WHERE semana_post_id = $1 AND estado = 'saltado'`, [P3])).rows[0].n;
  ok(saltadas === 4, 'si no se localiza el post, el resto no sale');

  await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]);
  await pool.query(`UPDATE publicador_ajustes SET abeja_activa = FALSE, abeja_cambiado_por = NULL, abeja_cambiado_at = NULL WHERE id = 1`);
  console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo OK');
  await pool.end();
  process.exit(fallos ? 1 : 0);
})();
