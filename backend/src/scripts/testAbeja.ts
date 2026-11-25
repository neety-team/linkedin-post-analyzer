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
import { planRonda, planificarAbeja, vueltaAbeja, cambiarAbeja, estadoAbeja, respuestaConMencion, type Ejecutor } from '../services/abeja';
import { repartirRoles, limpiarTexto, interpretarRonda, type Ronda } from '../services/abejaTextos';
import { EQUIPO, elegirPersonas, componerAvisoDelDia, primeraLinea, enlaceDePost, interpretarPreguntas, type Persona } from '../services/avisoDelDia';

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
function falso(yaRespondidos: string[] = []) {
  const log: string[] = [];
  let n = 0;
  const ej: Ejecutor = {
    async localizar() {
      log.push('localizar');
      return { social_id: 'urn:li:activity:1', url: 'https://www.linkedin.com/feed/update/urn:li:activity:1/' };
    },
    async comentar(p) {
      log.push(`comentar ${p.account_id}${p.responde_a ? ` responde ${p.responde_a}` : ''}: ${p.texto}${p.menciones?.length ? ` [@${p.menciones[0].name}]` : ''}`);
      return { comment_id: p.responde_a ? null : `c${++n}` };
    },
    async hilo(p) {
      const n = Number(p.comment_id.slice(1));
      return {
        autor: { name: n === 1 ? 'Unai Arambarri Yeregui' : 'Asier Olaizola', profile_id: `ACo-${n}` },
        respondido_por: yaRespondidos.includes(p.comment_id) ? ['Iker Galarza Rodríguez'] : ['Mario Carrillo'],
      };
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
    async preguntas(pedidos) {
      return pedidos.map((p) => `¿Pregunta para ${p.persona.nombre}?`);
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
  // ── Aviso del día (puro) ──
  ok(primeraLinea('\n  Gancho *con* formato\nresto') === 'Gancho con formato', 'primera línea sin lo que el Chat lee como formato');
  ok(primeraLinea('a '.repeat(80)).endsWith('…') && primeraLinea('a '.repeat(80)).length <= 111, 'la primera línea larga se corta en una palabra');
  ok(enlaceDePost({ linkedin_post_id: '75' }) === 'https://www.linkedin.com/feed/update/urn:li:activity:75/', 'sin verificar, el enlace sale del id del post');
  ok(enlaceDePost({ linkedin_url: 'U', linkedin_post_id: '75' }) === 'U', 'manda el enlace verificado');
  const eq: Persona[] = [
    { clave: 'ana', nombre: 'Ana', chatId: '1', papel: 'SDR', zonas: ['cataluña'], pedir: true, cuenta: 'ismael' },
    { clave: 'bea', nombre: 'Bea', chatId: '2', papel: 'CS', zonas: [], pedir: true },
    { clave: 'cris', nombre: 'Cris', chatId: null, papel: 'Marketing', zonas: [], pedir: true },
    { clave: 'dani', nombre: 'Dani', chatId: '4', papel: '', zonas: [], pedir: false },
  ];
  const el = elegirPersonas(
    [
      { cuenta: 'iker', texto: 'Si vendes en Cataluña…' },
      { cuenta: 'unai', texto: 'Otro tema' },
    ],
    eq,
    { bea: 2000, cris: 1000 }
  );
  ok(el[0]?.clave === 'ana' && el[1]?.clave === 'cris', 'le toca a quien es de la zona y luego a quien hace más que no se le pide');
  const el2 = elegirPersonas([{ cuenta: 'ismael', texto: 'Cataluña' }], eq, {});
  ok(el2[0]?.clave !== 'ana', 'nunca se le pide comentar su propio post');
  const el3 = elegirPersonas(
    [1, 2, 3, 4].map(() => ({ cuenta: 'iker', texto: 'x' })),
    eq,
    {}
  );
  ok(el3.filter(Boolean).length === 3 && el3[3] === null && new Set(el3.filter(Boolean).map((p) => p!.clave)).size === 3, 'una persona distinta por post y nunca a quien no tiene papel');
  ok(EQUIPO.every((p) => !p.pedir || (p.papel && p.chatId)), 'en el equipo, a quien se le pide tiene papel e id de Chat');
  const avDia = componerAvisoDelDia({
    posts: [
      { id: 'a', cuenta: 'iker', texto: 'Gancho de Iker\ncuerpo', url: 'https://x/1' },
      { id: 'b', cuenta: 'jose', texto: 'Gancho de José', url: null },
    ],
    personas: [eq[1], eq[2]],
    preguntas: ['¿Qué te dicen los clientes?', null],
  });
  ok(/^🐝 \*Hoy salen 2 posts\*/.test(avDia) && /\*Iker\* · Gancho de Iker\n<https:\/\/x\/1\|Abrir el post>/.test(avDia), 'aviso del día: titular, primera línea y enlace corto');
  ok(/<users\/2> ¿Qué te dicen los clientes\? Contéstalo/.test(avDia) && /\*Cris\* ¿Te pasa algo parecido/.test(avDia), 'mención con id de Chat y, sin pregunta, la de por defecto');
  ok(/\*José Tomás\* · Gancho de José/.test(avDia) && !/Ronda de los fundadores/.test(avDia) && /un like a cada uno/.test(avDia), 'incluye los de ventas, sin la ronda y con el like para el resto');
  ok(/^🐝 \*Post nuevo de Unai\*/.test(componerAvisoDelDia({ posts: [{ id: 'a', cuenta: 'unai', texto: 'G', url: 'U' }], personas: [null], preguntas: [null] })), 'con un solo post, «Post nuevo de»');
  const qs = interpretarPreguntas('**PREGUNTA 1:** ¿Cuánto tardas en saber quién decide?\nPREGUNTA 2: Sin interrogación\nPREGUNTA 9: ¿Fuera?', 2);
  ok(qs[0] === '¿Cuánto tardas en saber quién decide?' && qs[1] === null, 'lee las preguntas y descarta lo que no es pregunta');

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
  ok(log.some((l) => /^comentar A-iker responde c\d: \{\{0\}\} justo, Unai \[@Unai Arambarri Yeregui\]$/.test(l)), 'Iker responde al comentario de Unai, con su mención delante');
  ok(log.filter((l) => l.startsWith('repost')).length === 2, 'dos reposts');
  const sp = (await pool.query(`SELECT linkedin_social_id, chat_avisado_at FROM semana_posts WHERE id = $1`, [P2])).rows[0];
  ok(sp.linkedin_social_id === 'urn:li:activity:1' && !!sp.chat_avisado_at, 'apunta el social_id y el aviso');

  // Si el autor ya respondió a mano, la abeja no responde otra vez.
  await planificarAbeja({ id: P1, cuenta: 'iker', texto: 'Hola' }, { ahora: hace, ronda, automatica: true, azar: () => 0.5 });
  const f1 = falso(['c1']);
  for (let i = 0; i < 6; i++) await vueltaAbeja({ ejecutor: f1.ej, cuentas });
  ok(f1.log.filter((l) => / responde c1:/.test(l)).length === 0, 'ya respondido a mano: no se responde dos veces');
  ok(f1.log.filter((l) => / responde c2:/.test(l)).length === 1, 'el otro comentario sí se responde');
  const salt = (await pool.query(`SELECT estado, error FROM abeja_acciones WHERE semana_post_id = $1 AND tipo = 'responder' ORDER BY programado_para`, [P1])).rows;
  ok(salt.some((r) => r.estado === 'saltado' && /a mano/.test(r.error || '')), 'queda como saltada y dice por qué');

  // La mención, pura.
  const m1 = respuestaConMencion('Muy poco definido casi siempre.', { name: 'Unai Arambarri Yeregui', profile_id: 'ACo1' });
  ok(m1.texto === '{{0}} muy poco definido casi siempre.' && m1.menciones?.[0].profile_id === 'ACo1', 'mención delante y el resto en minúscula');
  const m2 = respuestaConMencion('Unai, IA no es magia', { name: 'Unai Arambarri Yeregui', profile_id: 'ACo1' });
  ok(m2.texto === '{{0}} IA no es magia', 'quita el nombre que ya puso el modelo y respeta las siglas');
  const m3 = respuestaConMencion('Gracias', { name: 'Asier Olaizola', profile_id: null });
  ok(m3.texto === 'Asier Olaizola gracias' && !m3.menciones, 'sin profile_id, el nombre en texto plano');

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

  // ── Aviso del día: espera a los de la mañana y sale uno para todos ──
  await cambiarAbeja(true, 'Prueba');
  await guardarSemana(S, {
    posts: [
      { clave: 'g-1', ...base, fecha: '2098-05-14', cuenta: 'iker', texto: 'Primero de Iker\ncuerpo' },
      { clave: 'g-2', ...base, fecha: '2098-05-14', cuenta: 'asier', texto: 'Segundo de Asier\ncuerpo' },
      { clave: 'g-3', ...base, fecha: '2098-05-14', cuenta: 'jose', texto: 'Radar de José\ncuerpo' },
    ],
  } as any);
  const G1 = await id('g-1');
  const G2 = await id('g-2');
  const G3 = await id('g-3');
  await pool.query(`UPDATE semana_posts SET estado = 'publicado', publicado_at = NOW() - interval '20 minutes', linkedin_post_id = '91' WHERE id = $1`, [G1]);
  await pool.query(`UPDATE semana_posts SET estado = 'publicado', publicado_at = NOW() - interval '10 minutes', linkedin_post_id = '93' WHERE id = $1`, [G3]);
  await pool.query(`UPDATE semana_posts SET estado = 'programado', programado_para = NOW() + interval '30 minutes' WHERE id = $1`, [G2]);
  const sinRonda: Ronda = { idioma: 'es', comentarios: [] };
  await planificarAbeja({ id: G1, cuenta: 'iker', texto: 'x' }, { ahora: new Date(Date.now() - 20 * 60 * 1000), ronda: sinRonda, automatica: false });
  const g = falso();
  await vueltaAbeja({ ejecutor: g.ej, cuentas });
  await vueltaAbeja({ ejecutor: g.ej, cuentas });
  ok(!g.log.some((l) => l.startsWith('chat ')), 'con otro post de la mañana por salir, el aviso espera');
  const espera = (await pool.query(`SELECT estado, error FROM abeja_acciones WHERE semana_post_id = $1 AND tipo = 'aviso'`, [G1])).rows[0];
  ok(espera.estado === 'pendiente' && /todos juntos/.test(espera.error || ''), 'queda pendiente y dice por qué');
  // Sale el segundo: su aviso avisa de los tres y el primero ya no repite.
  await pool.query(`UPDATE semana_posts SET estado = 'publicado', publicado_at = NOW() - interval '5 minutes', linkedin_post_id = '92' WHERE id = $1`, [G2]);
  await planificarAbeja({ id: G2, cuenta: 'asier', texto: 'x' }, { ahora: new Date(Date.now() - 5 * 60 * 1000), ronda: sinRonda, automatica: false });
  await pool.query(`UPDATE abeja_acciones SET programado_para = NOW() - interval '1 minute' WHERE semana_post_id = ANY($1) AND estado = 'pendiente'`, [[G1, G2]]);
  for (let i = 0; i < 3; i++) await vueltaAbeja({ ejecutor: g.ej, cuentas });
  const chats = g.log.filter((l) => l.startsWith('chat '));
  ok(chats.length === 1 && /Hoy salen 3 posts/.test(chats[0]) && /Primero de Iker/.test(chats[0]) && /Segundo de Asier/.test(chats[0]) && /Radar de José/.test(chats[0]), 'un solo aviso con los tres posts, también el de ventas');
  ok(/<users\/\d+> ¿Pregunta para /.test(chats[0]), 'con la pregunta y la mención de una persona del equipo');
  const avisos = (await pool.query(`SELECT estado, resultado FROM abeja_acciones WHERE semana_post_id = ANY($1) AND tipo = 'aviso' ORDER BY estado`, [[G1, G2]])).rows;
  ok(avisos.map((r) => r.estado).join(',') === 'hecho,saltado', 'uno avisa y el otro se salta');
  const pedidos = avisos.find((r) => r.estado === 'hecho')?.resultado?.pedidos || [];
  ok(pedidos.length === 3 && new Set(pedidos).size === 3, 'apunta a quién se le pidió, una persona distinta por post');
  ok((await pool.query(`SELECT COUNT(*)::int n FROM semana_posts WHERE id = ANY($1) AND chat_avisado_at IS NOT NULL`, [[G1, G2, G3]])).rows[0].n === 3, 'los tres quedan avisados');
  await pool.query(`DELETE FROM abeja_acciones WHERE semana_post_id = ANY($1)`, [[G1, G2, G3]]);

  await pool.query(`DELETE FROM semanas WHERE semana = $1`, [S]);
  await pool.query(`UPDATE publicador_ajustes SET abeja_activa = FALSE, abeja_cambiado_por = NULL, abeja_cambiado_at = NULL WHERE id = 1`);
  console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo OK');
  await pool.end();
  process.exit(fallos ? 1 : 0);
})();
