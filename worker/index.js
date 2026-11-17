// Worker de contenido.neety.team (2026-11-17).
//
// Pone el analizador dentro de la suite de neety.team: quien tiene sesion en
// auth.neety.team entra sin contraseña, y quien no, va al login y vuelve.
//
// El analizador NO se mueve: sigue en Railway (BACKEND_ORIGIN). Este Worker
// solo decide quien pasa y reenvia la peticion FIRMADA con X-Proxy-Secret mas
// la identidad en X-Auth-*; el backend deja pasar sin contraseña lo que llega
// firmado (backend/src/middleware/acceso.ts).
//
// SE ACTIVA SOLO cuando el Worker tiene sus dos secretos, INTERNAL_TOKEN y
// PROXY_SECRET. Mientras falte uno, reenvia tal cual, sin firmar, y el backend
// no deja pasar a ninguna persona: la app ya no tiene contraseña compartida.
//
// El contrato del login esta en el AUTH.md del repo `auth`.

const AUTH_BASE_DEFAULT = 'https://auth.neety.team';
const APP_SLUG_DEFAULT = 'contenido';

// Lo que el backend deja abierto, aqui tambien (mismo criterio que acceso.ts):
// salud, las paginas publicas del lead magnet y el formulario de recursos.
function esPublica(pathname) {
  return (
    pathname === '/health' ||
    pathname === '/api/health' ||
    pathname === '/r' ||
    pathname.startsWith('/r/') ||
    pathname === '/api/submit'
  );
}

// El MCP y los scripts no tienen sesion de navegador: entran con su token de
// maquina (`Authorization: Bearer …`). Esas peticiones pasan SIN firmar y es el
// backend quien comprueba el token.
function entraConCredencial(pathname, request) {
  if (pathname === '/mcp' || pathname.startsWith('/mcp/')) return true;
  return /^Bearer\s+\S/i.test(request.headers.get('Authorization') || '');
}

function gateActivo(env) {
  return !!(env.INTERNAL_TOKEN && env.PROXY_SECRET);
}

function esNavegacion(request) {
  return request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html');
}

function pagina(titulo, cuerpo, status) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo} · Neety</title>
<style>
  :root{color-scheme:light dark}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       font-family:system-ui,sans-serif;background:#e6ecf5;color:#431b44}
  main{max-width:440px;padding:32px;text-align:center}
  h1{font-size:22px;margin:0 0 12px}
  p{margin:0;line-height:1.55;color:#5f4762}
  a{color:#c55a0e;font-weight:600}
  @media (prefers-color-scheme:dark){body{background:#1b0d1d;color:#f8f7ec}p{color:#d3c6d3}a{color:#fe8238}}
</style></head><body><main><h1>${titulo}</h1><p>${cuerpo}</p></main></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// Cache corta de sesiones en el propio isolate. El contrato pide no pasar de
// 60 s: si un C-Level quita el acceso a alguien, deja de entrar en un minuto.
const CACHE = new Map();
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 500;

function tokenDeSesion(cookieHeader) {
  const m = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/.exec(cookieHeader || '');
  return m ? m[1] : null;
}

// Devuelve { status: 200, user, app } | { status: 401 } | { status: 403 } | { status: 503 }.
// Ante cualquier error de red o respuesta rara, 503: nunca se da paso por defecto.
async function validarSesion(request, env) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = tokenDeSesion(cookieHeader);
  const ahora = Date.now();
  if (token) {
    const hit = CACHE.get(token);
    if (hit && hit.caduca > ahora) return hit.resultado;
  }

  const base = env.AUTH_BASE_URL || AUTH_BASE_DEFAULT;
  const slug = env.APP_SLUG || APP_SLUG_DEFAULT;
  const url = `${base}/internal/session?app=${encodeURIComponent(slug)}`;
  const headers = { 'X-Internal-Token': env.INTERNAL_TOKEN };
  if (cookieHeader) headers.Cookie = cookieHeader;

  let res;
  try {
    res = env.AUTH ? await env.AUTH.fetch(new Request(url, { headers })) : await fetch(url, { headers });
  } catch {
    return { status: 503 };
  }

  let resultado;
  if (res.status === 200) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    resultado = body && body.user && body.user.email ? { status: 200, user: body.user, app: body.app || null } : { status: 503 };
  } else if (res.status === 401) {
    resultado = { status: 401 };
  } else if (res.status === 403) {
    resultado = { status: 403 };
  } else {
    resultado = { status: 503 };
  }

  if (token && resultado.status !== 503) {
    if (CACHE.size >= CACHE_MAX) CACHE.clear();
    CACHE.set(token, { resultado, caduca: ahora + CACHE_TTL_MS });
  }
  return resultado;
}

// Reenvia al backend de Railway. Lo primero es BORRAR la firma y la identidad
// que traiga el cliente: solo las pone este Worker, y solo si hay sesion.
function reenviar(request, url, env, identidad) {
  const backend = new URL(env.BACKEND_ORIGIN);
  const destino = new URL(request.url);
  destino.protocol = backend.protocol;
  destino.hostname = backend.hostname;
  destino.port = backend.port;

  const salida = new Request(destino.toString(), request);
  salida.headers.delete('X-Proxy-Secret');
  for (const nombre of [...salida.headers.keys()]) {
    if (nombre.toLowerCase().startsWith('x-auth-')) salida.headers.delete(nombre);
  }
  salida.headers.set('X-Forwarded-Host', url.host);
  salida.headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

  if (identidad && env.PROXY_SECRET) {
    salida.headers.set('X-Proxy-Secret', env.PROXY_SECRET);
    salida.headers.set('X-Auth-Email', identidad.user.email);
    if (identidad.user.name) salida.headers.set('X-Auth-Name', encodeURIComponent(identidad.user.name));
    if (identidad.app && identidad.app.role) salida.headers.set('X-Auth-Role', identidad.app.role);
  }
  return fetch(salida, { redirect: 'manual' });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (!env.BACKEND_ORIGIN) return pagina('Falta configuración', 'El Worker no tiene BACKEND_ORIGIN.', 500);

    // Sin los dos secretos, proxy puro: decide el backend, que solo deja pasar tokens.
    if (!gateActivo(env)) return reenviar(request, url, env, null);

    if (request.method === 'OPTIONS' || esPublica(pathname) || entraConCredencial(pathname, request)) {
      return reenviar(request, url, env, null);
    }

    const base = env.AUTH_BASE_URL || AUTH_BASE_DEFAULT;

    // Cerrar sesion se hace en el login central: la cookie es de .neety.team y
    // se limpia para todas las aplicaciones a la vez.
    if (pathname === '/salir') {
      return Response.redirect(`${base}/sign-out?next=${encodeURIComponent(url.origin + '/')}`, 302);
    }

    const sesion = await validarSesion(request, env);

    if (sesion.status === 200) {
      // CSRF: la cookie es de todo .neety.team. Lo que modifica estado tiene
      // que venir de esta misma pagina.
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const origen = request.headers.get('origin');
        if (origen && origen !== url.origin) return json({ error: 'Origen no permitido' }, 403);
      }
      return reenviar(request, url, env, sesion);
    }

    if (sesion.status === 401) {
      if (esNavegacion(request)) {
        const slug = env.APP_SLUG || APP_SLUG_DEFAULT;
        const login = new URL(`${base}/login`);
        login.searchParams.set('app', slug);
        login.searchParams.set('next', request.url);
        return Response.redirect(login.toString(), 302);
      }
      return json({ error: 'Sesión caducada. Recarga la página para volver a entrar.' }, 401);
    }

    if (sesion.status === 403) {
      if (esNavegacion(request)) {
        return pagina(
          'Sin acceso',
          `Tu cuenta no tiene permiso para esta aplicación. Pide a un C-Level que te añada en <a href="${base}/admin/apps">auth.neety.team</a>.`,
          403
        );
      }
      return json({ error: 'Tu cuenta no tiene acceso a esta aplicación.' }, 403);
    }

    if (esNavegacion(request)) {
      return pagina('Login no disponible', 'No se ha podido comprobar tu sesión. Reintenta en unos segundos.', 503);
    }
    return json({ error: 'No se ha podido comprobar la sesión. Reintenta en unos segundos.' }, 503);
  },
};
