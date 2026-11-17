/**
 * Cliente HTTP del backend de Neety.
 *
 * El MCP no habla con Postgres: habla con el backend que ya existe. Asi el SQL
 * vive en un solo sitio y una tool nueva no puede quedarse con una copia vieja
 * de una query. El precio es que el backend tiene que estar desplegado — ver
 * el diagnostico de `neety_estado` cuando algo devuelve 404.
 */

const BASE = (process.env.NEETY_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
// El token de maquina del backend. Ya no hay contraseña compartida (2026-11-17).
const TOKEN = (process.env.API_TOKEN || '').trim();

// El refresco reescanea creadores contra Unipile de uno en uno: con presupuesto
// de 15 puede tardar minutos. El resto de llamadas son queries y responden en
// milisegundos, pero un timeout unico y generoso es mas simple que afinar uno
// por endpoint.
const TIMEOUT_MS = Number(process.env.NEETY_TIMEOUT_MS || 15 * 60 * 1000);

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly ruta: string
  ) {
    super(message);
  }
}

function cabeceras(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const url = `${BASE}${ruta}`;
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...cabeceras(), ...(init.headers as Record<string, string>) },
      signal: control.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ErrorApi(`Timeout tras ${Math.round(TIMEOUT_MS / 1000)}s`, 0, ruta);
    }
    throw new ErrorApi(`No se pudo conectar con ${BASE} (${err?.message})`, 0, ruta);
  } finally {
    clearTimeout(temporizador);
  }

  if (res.status === 401) {
    throw new ErrorApi(
      'El backend ha devuelto 401. Falta o no vale API_TOKEN, el token de máquina.',
      401,
      ruta
    );
  }

  const texto = await res.text();

  if (!res.ok) {
    // El backend sirve el frontend en el catch-all, asi que un endpoint que
    // aun no esta desplegado devuelve HTML con 200/404 en vez de JSON. Sin
    // este mensaje, el error que ve el usuario es "Unexpected token <".
    if (texto.trimStart().startsWith('<')) {
      throw new ErrorApi(
        `${ruta} no existe en el backend desplegado (ha respondido HTML). ` +
          'Despliega la rama con las rutas /api/outliers.',
        res.status,
        ruta
      );
    }
    let detalle = texto.slice(0, 300);
    try {
      detalle = JSON.parse(texto).error || detalle;
    } catch {
      /* se queda el texto crudo */
    }
    throw new ErrorApi(detalle, res.status, ruta);
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new ErrorApi(
      `${ruta} ha respondido algo que no es JSON. ¿Esta desplegada la version del backend con /api/outliers?`,
      res.status,
      ruta
    );
  }
}

/** Monta un query string saltandose undefined, null, '' y arrays vacios. */
export function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      sp.set(k, v.join(','));
    } else {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  get: <T>(ruta: string) => pedir<T>(ruta),
  post: <T>(ruta: string, cuerpo?: unknown) =>
    pedir<T>(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo ?? {}),
    }),
  base: BASE,
  tieneCredenciales: Boolean(USER && PASS),
};
