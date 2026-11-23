/**
 * Prueba del gate de las páginas /r/:shareId (routes/rastro.ts) desde que
 * recursos.neety.com ya no existe (23/11/2026). No toca la BD ni neety.com: la
 * consulta se sustituye por una fila de mentira y la lista de leads por un
 * servidor local que apunta lo que recibe.
 *
 *   npx tsx src/scripts/testRastroGate.ts
 */
import http from 'http';
import type { AddressInfo } from 'net';

let fallos = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'OK ' : 'FALLO'} ${m}`); if (!c) fallos++; };

async function main() {
  // 1 · La lista de leads de mentira (hace de neety.com/api/lead).
  const recibidos: any[] = [];
  const lista = http.createServer((req, res) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      recibidos.push(JSON.parse(b || '{}'));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    });
  });
  await new Promise<void>((r) => lista.listen(0, r));
  process.env.NEETY_LEAD_URL = `http://127.0.0.1:${(lista.address() as AddressInfo).port}/api/lead`;

  // 2 · La BD de mentira: una página sin correo y lo que se escribe.
  const db = (await import('../db')).default as any;
  const fila: any = {
    share_id: 'abc123', commenter_name: 'Ana Pérez', sector: 'maquinaria',
    full_analysis: [1, 2, 3].map((n) => ({ titulo: `Fallo ${n}`, prioridad: n, lo_que_dice: 'x', por_que_pierde: 'y', arreglo: 'z' })),
    email: null,
  };
  const escrituras: any[] = [];
  db.query = async (sql: string, params: any[]) => {
    if (/^\s*SELECT/i.test(sql)) return { rows: [fila] };
    escrituras.push({ sql, params });
    fila.email = params[0];
    return { rows: [] };
  };

  const express = (await import('express')).default;
  const rastro = (await import('../routes/rastro')).default;
  const { variantesDelEnlace } = await import('../routes/accounts');
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use('/r', rastro);
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;

  // 3 · La página cerrada: formulario propio, nada de recursos.neety.com.
  const html = await (await fetch(`${base}/r/abc123`)).text();
  ok(html.includes('<form class="gate-form" method="post" action="/r/abc123">'), 'la página cerrada lleva el formulario propio');
  ok(!html.includes('recursos.neety.com'), 'la página ya no carga nada de recursos.neety.com');
  ok(html.includes('name="name" required') && html.includes('value="Ana Pérez"'), 'pide el nombre y lo trae relleno');
  ok(html.includes('https://neety.com/politica-de-privacidad') && html.includes('Me suscribo a la newsletter.'), 'los dos consentimientos con el texto de neety.com');
  ok(html.includes('https://neety.com/solicitar-demo'), 'el botón final va a neety.com/solicitar-demo');

  // 4 · Sin la casilla de privacidad no se guarda nada.
  const post = (cuerpo: string) => fetch(`${base}/r/abc123`, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: cuerpo,
  });
  const sinNombre = await post('email=ana%40empresa.com&consent_data=1');
  ok(sinNombre.status === 400 && (await sinNombre.text()).includes('Escribe tu nombre'), 'sin nombre da 400 y lo explica');
  const sin = await post('name=Ana&email=ana%40empresa.com');
  ok(sin.status === 400 && (await sin.text()).includes('política de privacidad'), 'sin aceptar la privacidad da 400 y lo explica');
  ok(escrituras.length === 0 && recibidos.length === 0, 'sin consentimiento no se guarda ni se manda nada');

  // 5 · Con la casilla: se guarda aquí, va a la lista y la página se abre.
  const con = await post('name=Ana%20P%C3%A9rez&email=Ana%40Empresa.com&consent_data=1&consent_comms=1');
  ok(con.status === 303 && con.headers.get('location') === '/r/abc123', 'con consentimiento redirige a la página');
  ok(escrituras.length === 1 && escrituras[0].params[0] === 'ana@empresa.com', 'el correo se guarda en minúsculas');
  const l = recibidos[0] || {};
  ok(l.name === 'Ana Pérez' && l.email === 'ana@empresa.com' && l.resource === 'auditoria-web' && l.consent_data === true && l.consent_comms === true && l.page === '/r/abc123',
    'la lista de leads recibe nombre, correo, recurso, consentimientos y página');
  const abierta = await (await fetch(`${base}/r/abc123`)).text();
  ok(!abierta.includes('<form class="gate-form"') && !abierta.includes('class="locked"'), 'ya con correo, la página sale abierta');

  // 6 · El barrido de entregas reconoce el enlace viejo y el nuevo del mismo recurso.
  ok(JSON.stringify(variantesDelEnlace('https://neety.com/academia/vibe')) ===
    JSON.stringify(['https://neety.com/academia/vibe', 'recursos.neety.com/vibe', 'neety.com/academia/vibe']), 'enlace nuevo: busca también el viejo');
  ok(variantesDelEnlace('https://recursos.neety.com/vibe/').includes('neety.com/academia/vibe'), 'enlace viejo: busca también el nuevo');
  ok(JSON.stringify(variantesDelEnlace('https://lu.ma/x')) === JSON.stringify(['https://lu.ma/x']), 'otro enlace: se busca tal cual');

  srv.close(); lista.close();
  console.log(fallos ? `\n${fallos} FALLO(S)` : '\nTodo en verde');
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
