// Pruebas del Worker sin desplegar: node worker/prueba.mjs
// Sustituye fetch por un doble que hace de login central y de backend.
import worker from './index.js';

const ENV = {
  BACKEND_ORIGIN: 'https://backend.prueba',
  AUTH_BASE_URL: 'https://auth.prueba',
  APP_SLUG: 'contenido',
  INTERNAL_TOKEN: 'token-de-prueba',
  PROXY_SECRET: 'secreto-de-prueba',
};
let alBackend = [];
let alLogin = [];
let loginResponde = () => new Response('{}', { status: 401 });

globalThis.fetch = async (input, init) => {
  const req = input instanceof Request ? input : new Request(input, init);
  const u = new URL(req.url);
  if (u.host === 'auth.prueba') {
    alLogin.push(req);
    return loginResponde(req);
  }
  alBackend.push(req);
  return new Response('ok-backend', { status: 200 });
};

let fallos = 0;
function comprobar(nombre, cond) {
  console.log(`${cond ? 'OK   ' : 'FALLA'} ${nombre}`);
  if (!cond) fallos++;
}
const pedir = (ruta, opts = {}, env = ENV) => {
  alBackend = [];
  alLogin = [];
  return worker.fetch(new Request('https://contenido.neety.team' + ruta, opts), env);
};
const nav = { headers: { accept: 'text/html' } };
const sesionBuena = () =>
  new Response(JSON.stringify({ user: { email: 'unai@neety.com', name: 'Unai Arámbarri' }, app: { slug: 'contenido', role: 'admin' } }), { status: 200 });

// 1 · Sin secretos: proxy puro, sin firma
let r = await pedir('/semana', nav, { BACKEND_ORIGIN: ENV.BACKEND_ORIGIN });
comprobar('sin secretos reenvía sin preguntar al login', r.status === 200 && alLogin.length === 0);
comprobar('sin secretos no firma', alBackend[0].headers.get('x-proxy-secret') === null);

// 2 · Sin sesión
loginResponde = () => new Response('{}', { status: 401 });
r = await pedir('/semana', nav);
comprobar('sin sesión, una página redirige al login', r.status === 302 && r.headers.get('location').startsWith('https://auth.prueba/login?app=contenido&next='));
comprobar('y no toca el backend', alBackend.length === 0);
r = await pedir('/api/semana', { headers: { cookie: 'better-auth.session_token=caducado' } });
comprobar('sin sesión, la API da 401 en JSON', r.status === 401 && (await r.json()).error.length > 0);

// 3 · Con sesión
loginResponde = (req) => (req.headers.get('x-internal-token') === 'token-de-prueba' && (req.headers.get('cookie') || '').includes('bueno') ? sesionBuena() : new Response('{}', { status: 401 }));
r = await pedir('/api/semana', { headers: { cookie: 'better-auth.session_token=bueno', 'x-auth-email': 'intruso@fuera.com', 'x-proxy-secret': 'inventado' } });
const b = alBackend[0];
comprobar('con sesión pasa al backend', r.status === 200 && new URL(b.url).host === 'backend.prueba');
comprobar('va firmada con el secreto bueno', b.headers.get('x-proxy-secret') === 'secreto-de-prueba');
comprobar('la identidad es la del login, no la que mandó el cliente', b.headers.get('x-auth-email') === 'unai@neety.com');
comprobar('el nombre viaja codificado', decodeURIComponent(b.headers.get('x-auth-name')) === 'Unai Arámbarri');
comprobar('lleva el rol', b.headers.get('x-auth-role') === 'admin');
comprobar('reenvía la cookie al login', (alLogin[0].headers.get('cookie') || '').includes('bueno'));
r = await pedir('/api/semana', { headers: { cookie: 'better-auth.session_token=bueno' } });
comprobar('la segunda vez tira de la caché de sesión', r.status === 200 && alLogin.length === 0);

// 4 · CSRF
r = await pedir('/api/semana/posts/x/feedback', { method: 'POST', body: '{}', headers: { cookie: 'better-auth.session_token=bueno', origin: 'https://kaixo.neety.team' } });
comprobar('un POST desde otro origen se rechaza', r.status === 403 && alBackend.length === 0);
r = await pedir('/api/semana/posts/x/feedback', { method: 'POST', body: '{}', headers: { cookie: 'better-auth.session_token=bueno', origin: 'https://contenido.neety.team' } });
comprobar('un POST desde la propia página pasa', r.status === 200 && alBackend.length === 1);

// 5 · Rutas que no pasan por el login
loginResponde = () => new Response('{}', { status: 401 });
for (const ruta of ['/api/health', '/r/abc', '/api/submit']) {
  r = await pedir(ruta, { headers: { 'x-auth-email': 'intruso@fuera.com' } });
  comprobar(`${ruta} es pública y va sin firma ni identidad`, r.status === 200 && alLogin.length === 0 && alBackend[0].headers.get('x-proxy-secret') === null && alBackend[0].headers.get('x-auth-email') === null);
}
r = await pedir('/mcp', { method: 'POST', body: '{}', headers: { authorization: 'Bearer token-mcp' } });
comprobar('el MCP con token pasa sin firma', r.status === 200 && alLogin.length === 0 && alBackend[0].headers.get('authorization') === 'Bearer token-mcp' && alBackend[0].headers.get('x-proxy-secret') === null);
r = await pedir('/api/outliers/buscar', { headers: { authorization: 'Bearer token-mcp', 'x-auth-email': 'intruso@fuera.com' } });
comprobar('un script con token pasa sin firma ni identidad', r.status === 200 && alLogin.length === 0 && alBackend[0].headers.get('x-proxy-secret') === null && alBackend[0].headers.get('x-auth-email') === null);
r = await pedir('/api/outliers/buscar', { headers: { authorization: 'Basic abc' } });
comprobar('una contraseña ya no es credencial: sin sesión, 401 y no llega al backend', r.status === 401 && alLogin.length === 1 && alBackend.length === 0);

// 6 · Sin acceso y login caído
loginResponde = () => new Response('{}', { status: 403 });
r = await pedir('/semana', { headers: { accept: 'text/html', cookie: 'better-auth.session_token=sinacceso' } });
comprobar('sesión sin acceso a la app: 403 con página', r.status === 403 && (await r.text()).includes('Sin acceso') && alBackend.length === 0);
loginResponde = () => { throw new Error('caído'); };
r = await pedir('/semana', { headers: { accept: 'text/html', cookie: 'better-auth.session_token=otro' } });
comprobar('login caído: 503 y no pasa nadie', r.status === 503 && alBackend.length === 0);
loginResponde = () => new Response('{"user":{}}', { status: 200 });
r = await pedir('/api/semana', { headers: { cookie: 'better-auth.session_token=raro' } });
comprobar('respuesta rara del login: 503 y no pasa nadie', r.status === 503 && alBackend.length === 0);

// 7 · Salir
r = await pedir('/salir', nav);
comprobar('/salir manda al cierre de sesión central', r.status === 302 && r.headers.get('location').startsWith('https://auth.prueba/sign-out?next='));

console.log(fallos ? `\n${fallos} comprobaciones fallan` : '\nTodo en verde');
process.exit(fallos ? 1 : 0);
