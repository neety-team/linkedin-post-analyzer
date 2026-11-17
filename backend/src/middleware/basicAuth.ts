import { Request, Response, NextFunction, RequestHandler } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * QUIEN ENTRA (2026-11-17).
 *
 * Hay dos puertas, y las dos pasan por este middleware:
 *
 * 1. El Worker de `contenido.neety.team` (carpeta `worker/`). Valida la sesion
 *    del login central de neety.team y reenvia la peticion FIRMADA con
 *    `X-Proxy-Secret`, mas quien es la persona en `X-Auth-*`. Una peticion
 *    firmada no necesita contraseña.
 * 2. Lo que no pasa por el Worker: el MCP y los scripts, con un token de
 *    maquina, y la contraseña compartida mientras siga definida.
 *
 * La identidad SOLO se cree si la firma es buena. A cualquier otra peticion se
 * le borran las cabeceras `X-Auth-*` antes de seguir, para que nadie pueda
 * presentarse como otro escribiendolas a mano.
 *
 * Si `PROXY_SECRET` no esta definido, la puerta 1 no existe.
 */
export interface Identidad {
  email: string;
  nombre: string;
  rol: string | null;
}

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  if (x.length !== y.length) {
    timingSafeEqual(y, y); // comparacion de relleno: el tiempo no delata la longitud
    return false;
  }
  return timingSafeEqual(x, y);
}

function cabecera(req: Request, nombre: string): string {
  const v = req.headers[nombre];
  return (Array.isArray(v) ? v[0] : v) || '';
}

function descodificar(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/**
 * Lee la firma del Worker. Devuelve la identidad si la firma es buena y trae
 * correo; en cualquier otro caso borra las cabeceras de identidad y devuelve
 * null. La firma se borra siempre: no tiene que viajar mas alla de aqui.
 */
function identidadFirmada(req: Request, secreto: string): { firmado: boolean; identidad: Identidad | null } {
  const firma = cabecera(req, 'x-proxy-secret');
  const firmado = !!secreto && !!firma && iguales(firma, secreto);
  delete req.headers['x-proxy-secret'];

  if (!firmado) {
    for (const k of Object.keys(req.headers)) {
      if (k.toLowerCase().startsWith('x-auth-')) delete req.headers[k];
    }
    return { firmado: false, identidad: null };
  }

  const email = cabecera(req, 'x-auth-email').trim().toLowerCase();
  if (!email) return { firmado: true, identidad: null };
  const nombre = descodificar(cabecera(req, 'x-auth-name')).trim() || email.split('@')[0];
  const rol = cabecera(req, 'x-auth-role').trim() || null;
  return { firmado: true, identidad: { email, nombre: nombre.slice(0, 80), rol } };
}

/** La persona que hace la peticion, si entro por el login central. */
export function identidadDe(req: Request): Identidad | null {
  return ((req as any).identidad as Identidad | undefined) || null;
}

/**
 * La puerta de toda la app. Por orden:
 *
 * 1. Preflight CORS, salud y las dos rutas publicas: pasan siempre.
 * 2. Peticion firmada por el Worker de la suite (`PROXY_SECRET`): pasa.
 * 3. Token de maquina (`API_TOKEN`, cabecera `Authorization: Bearer …`): pasa.
 *    Es por donde entran el MCP y los scripts, que no tienen sesion de navegador.
 * 4. Contraseña compartida (`APP_BASIC_USER` + `APP_BASIC_PASS`), si esta
 *    definida: es lo que habia hasta el 17/11/2026.
 *
 * QUITAR LA CONTRASEÑA A LAS PERSONAS es poner `SOLO_SUITE=1`: el navegador
 * deja de pedirla y solo se entra por la suite. La contraseña sigue valiendo
 * como llave de maquina, porque el MCP, los scripts de `scripts/` y el
 * servicio del roaster la usan.
 *
 * Borrar las dos variables la quita tambien para las maquinas. Con
 * `PROXY_SECRET` o `API_TOKEN` definidos la app NO se queda abierta: lo que no
 * venga firmado ni con token recibe un 401. Antes de hacerlo hay que pasar el
 * MCP y los scripts a `API_TOKEN`, y el roaster deja de funcionar.
 *
 * Solo cuando no hay NINGUNA de las cuatro variables la app queda abierta, que
 * es el caso del desarrollo en local.
 *
 * Las comparaciones usan crypto.timingSafeEqual.
 */
export function basicAuthMiddleware(): RequestHandler {
  const user = (process.env.APP_BASIC_USER || '').trim();
  const pass = (process.env.APP_BASIC_PASS || '').trim();
  const secretoProxy = (process.env.PROXY_SECRET || '').trim();
  const tokenApi = (process.env.API_TOKEN || '').trim();
  const hayContrasena = !!(user && pass);
  // SOLO_SUITE=1: las personas entran solo por la suite. La contraseña deja de
  // pedirse en el navegador (no se manda WWW-Authenticate) y queda como llave
  // de maquina para lo que ya la usa: el MCP y los scripts del repo. Solo vale
  // con PROXY_SECRET definido, para no dejar a nadie fuera por error.
  const soloSuite = process.env.SOLO_SUITE === '1' && !!secretoProxy;
  const MSG_SUITE = 'Se entra por https://contenido.neety.team con tu sesión de neety.team';
  const abierta = !hayContrasena && !secretoProxy && !tokenApi;

  // eslint-disable-next-line no-console
  console.log(
    `[auth] suite: ${secretoProxy ? 'si' : 'no'} · token de maquina: ${tokenApi ? 'si' : 'no'} · ` +
      `contraseña compartida: ${hayContrasena ? `si (user="${user}")` : 'no'}` +
      (soloSuite ? ' · SOLO_SUITE: el navegador no pide contraseña' : '')
  );
  if (abierta) {
    // eslint-disable-next-line no-console
    console.warn(
      '[auth] Sin PROXY_SECRET, API_TOKEN ni APP_BASIC_USER/APP_BASIC_PASS: la app esta ABIERTA. ' +
        'Vale para desarrollo en local, nunca para produccion.'
    );
  }

  // Pre-compute the encoded "user:pass" buffer once.
  const expected = hayContrasena ? Buffer.from(`${user}:${pass}`, 'utf8') : null;

  return (req: Request, res: Response, next: NextFunction) => {
    // Always let CORS preflights through — the auth header isn't sent on
    // OPTIONS, so blocking it would break browser CORS handshakes.
    if (req.method === 'OPTIONS') return next();

    // Antes que nada: o la peticion viene firmada por el Worker, o se le quita
    // cualquier identidad que traiga escrita.
    const { firmado, identidad } = identidadFirmada(req, secretoProxy);
    if (identidad) (req as any).identidad = identidad;

    // Health endpoint open so Railway / uptime checks aren't 401-ing.
    if (req.path === '/health' || req.path === '/api/health') return next();

    // Las páginas del lead magnet "rastro" van ABIERTAS a propósito: el enlace
    // se pega en un comentario de LinkedIn y lo abre un desconocido que no
    // tiene nuestras credenciales. Si esto se quita, el lead magnet muere en
    // silencio: el enlace sale igual y nadie puede abrirlo.
    // Solo /r/… — el resto de la app sigue cerrada.
    if (req.path === '/r' || req.path.startsWith('/r/')) return next();
    // Y /api/submit, que es el proxy del gate de neety-resources. TIENE que ser
    // público: lo llama el neety-form.js que corre en el navegador del visitante,
    // que no tiene nuestras credenciales. Y tiene que llamarse exactamente así,
    // porque el fetch de su fichero es a `/api/submit` RELATIVO (su línea 237) y
    // no se toca: servimos SU fichero tal cual, sin fork.
    if (req.path === '/api/submit') return next();

    if (abierta) return next();

    // Firmada por el Worker: la sesion ya la valido el login central.
    if (firmado) return next();

    const header = req.headers.authorization || '';
    const [scheme, encoded] = header.split(' ');

    // Token de maquina: el MCP y los scripts.
    if (tokenApi && scheme === 'Bearer' && encoded && iguales(encoded, tokenApi)) return next();

    // Sin contraseña compartida no hay nada mas que probar: se entra por la
    // suite. Va sin WWW-Authenticate para que el navegador no pida contraseña.
    if (!expected) return res.status(401).send(MSG_SUITE);

    // Con SOLO_SUITE el 401 va sin WWW-Authenticate: el navegador no abre la
    // ventana de contraseña y la persona ve por donde se entra.
    const rechazar = (msg: string) => {
      if (soloSuite) return res.status(401).send(MSG_SUITE);
      res.setHeader('WWW-Authenticate', 'Basic realm="Neety", charset="UTF-8"');
      return res.status(401).send(msg);
    };

    if (scheme !== 'Basic' || !encoded) return rechazar('Hace falta iniciar sesión');

    let provided: Buffer;
    try {
      provided = Buffer.from(encoded, 'base64');
    } catch {
      return rechazar('Hace falta iniciar sesión');
    }

    // timingSafeEqual requires equal-length inputs. On mismatch we run a
    // dummy comparison against the expected buffer so timing is constant
    // regardless of which user/length the attacker tries.
    let ok = false;
    if (provided.length === expected.length) {
      ok = timingSafeEqual(provided, expected);
    } else {
      timingSafeEqual(expected, expected); // dummy
      ok = false;
    }

    if (!ok) return rechazar('Usuario o contraseña incorrectos');

    next();
  };
}
