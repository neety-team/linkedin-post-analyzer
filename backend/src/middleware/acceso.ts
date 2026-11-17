import { Request, Response, NextFunction, RequestHandler } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * QUIEN ENTRA (2026-11-17).
 *
 * Ya no hay contraseña compartida. Hay dos puertas, y las dos pasan por aqui:
 *
 * 1. LAS PERSONAS entran por la suite. El Worker de `contenido.neety.team`
 *    (carpeta `worker/`) valida la sesion del login central de neety.team y
 *    reenvia la peticion FIRMADA con `X-Proxy-Secret`, mas quien es la persona
 *    en `X-Auth-*`. Variable: `PROXY_SECRET`.
 * 2. LAS MAQUINAS (el MCP y los scripts) entran con un token:
 *    `Authorization: Bearer <API_TOKEN>`. Variable: `API_TOKEN`.
 *
 * La identidad SOLO se cree si la firma es buena. A cualquier otra peticion se
 * le borran las cabeceras `X-Auth-*` antes de seguir, para que nadie pueda
 * presentarse como otro escribiendolas a mano.
 *
 * `APP_BASIC_USER` y `APP_BASIC_PASS` ya no abren nada aqui. Si siguen
 * definidas es solo porque el proxy del roaster las usa para hablar con OTRA
 * app (ver `services/roaster.ts`).
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
 * Railway pone estas variables en todo lo que despliega. Sirven para que la
 * app no se pueda dejar abierta en produccion ni por error.
 */
function enRailway(): boolean {
  return !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID);
}

/**
 * La puerta de toda la app. Por orden:
 *
 * 1. Preflight CORS, salud y las dos rutas publicas: pasan siempre.
 * 2. Peticion firmada por el Worker de la suite (`PROXY_SECRET`): pasa.
 * 3. Token de maquina (`API_TOKEN`, cabecera `Authorization: Bearer …`): pasa.
 * 4. Todo lo demas: 401, sin `WWW-Authenticate`, para que el navegador no abra
 *    ninguna ventana de contraseña y la persona vea por donde se entra.
 *
 * CERRADA POR DEFECTO. Si no hay ni `PROXY_SECRET` ni `API_TOKEN`, no entra
 * nadie: no existe el caso "sin variables, abierta". Para desarrollar en local
 * sin montar nada se pone `ACCESO_ABIERTO=1`, que en Railway se ignora.
 *
 * Las comparaciones usan crypto.timingSafeEqual.
 */
export function accesoMiddleware(): RequestHandler {
  const secretoProxy = (process.env.PROXY_SECRET || '').trim();
  const tokenApi = (process.env.API_TOKEN || '').trim();
  const abierta = process.env.ACCESO_ABIERTO === '1' && !enRailway();
  const MSG_SUITE = 'Se entra por https://contenido.neety.team con tu sesión de neety.team';

  // eslint-disable-next-line no-console
  console.log(`[acceso] suite: ${secretoProxy ? 'si' : 'no'} · token de maquina: ${tokenApi ? 'si' : 'no'}`);
  if (abierta) {
    // eslint-disable-next-line no-console
    console.warn('[acceso] ACCESO_ABIERTO=1: la app esta ABIERTA. Solo vale en local; en Railway se ignora.');
  } else if (process.env.ACCESO_ABIERTO === '1') {
    // eslint-disable-next-line no-console
    console.warn('[acceso] ACCESO_ABIERTO=1 ignorado: esto es Railway.');
  }
  if (!abierta && !secretoProxy && !tokenApi) {
    // eslint-disable-next-line no-console
    console.error(
      '[acceso] No hay PROXY_SECRET ni API_TOKEN: NO PUEDE ENTRAR NADIE. ' +
        'Define PROXY_SECRET (suite) y API_TOKEN (MCP y scripts).'
    );
  }

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
    // tiene sesión. Si esto se quita, el lead magnet muere en silencio: el
    // enlace sale igual y nadie puede abrirlo.
    // Solo /r/… — el resto de la app sigue cerrada.
    if (req.path === '/r' || req.path.startsWith('/r/')) return next();
    // Y /api/submit, que es el proxy del gate de neety-resources. TIENE que ser
    // público: lo llama el neety-form.js que corre en el navegador del visitante.
    // Y tiene que llamarse exactamente así, porque el fetch de su fichero es a
    // `/api/submit` RELATIVO (su línea 237) y no se toca: servimos SU fichero
    // tal cual, sin fork.
    if (req.path === '/api/submit') return next();

    if (abierta) return next();

    // Firmada por el Worker: la sesion ya la valido el login central.
    if (firmado) return next();

    // Token de maquina: el MCP y los scripts.
    const [scheme, credencial] = (req.headers.authorization || '').split(' ');
    if (tokenApi && scheme === 'Bearer' && credencial && iguales(credencial, tokenApi)) return next();

    return res.status(401).send(MSG_SUITE);
  };
}
