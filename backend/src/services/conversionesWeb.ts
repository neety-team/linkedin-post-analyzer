// CONVERSIONES FUERA DE LINKEDIN PARA EL RESUMEN DE CUENTAS (Mario, 2026-10-13)
//
// Dos cifras que Mario apunta en la reunion de cada dos semanas y que hasta ahora
// iba a buscar a otro sitio:
//
// 1. DEMOS ATRIBUIDAS A MARIO, de la web nueva (neety.com, D1 de la landing):
//    GET {LANDING_URL}/api/analyzer/demos?desde&hasta con Bearer LANDING_ANALYZER_TOKEN.
//    Misma regla de atribucion que el admin de la web (LinkedIn organico, newsletter y
//    recursos; nunca los mensajes privados de los comerciales). Solo recuentos.
//    Sin el token, `configurado: false` y la tarjeta lo dice: nunca un 0 inventado.
//
// 2. INSCRITOS AL WEBINAR, del contador publico de Luma (el mismo que lee el aviso
//    diario al chat, avisoWebinarLuma). Luma gratis no dice de donde viene cada
//    inscrito, asi que es el TOTAL del evento, no atribuido. Solo mientras el evento
//    no haya pasado.
//
// Las dos fuentes son externas: van aparte de /analytics, con cache corta, y un fallo
// devuelve el motivo en vez de tumbar la pantalla.
import { leerEvento } from './avisoWebinarLuma';

const LANDING_URL = () => (process.env.LANDING_URL || 'https://neety.com').replace(/\/$/, '');
const TOKEN = () => process.env.LANDING_ANALYZER_TOKEN || '';
const CACHE_MS = 5 * 60 * 1000;

export interface ResumenDemos {
  solicitudes: number;
  cualificadas: number;
  oportunidades: number;
  por_canal: { linkedin: number; newsletter: number; recursos: number };
}
export type Demos =
  | { configurado: false }
  | { configurado: true; error: string }
  | { configurado: true; current: ResumenDemos; previous: ResumenDemos };

export interface EventoWeb {
  nombre: string;
  inscritos: number;
  empieza: string;
  url: string;
}

const cache = new Map<string, { t: number; v: unknown }>();
async function conCache<T>(clave: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(clave);
  if (hit && Date.now() - hit.t < CACHE_MS) return hit.v as T;
  const v = await fn();
  cache.set(clave, { t: Date.now(), v });
  return v;
}

export async function leerDemos(desde: string, hasta: string): Promise<Demos> {
  if (!TOKEN()) return { configurado: false };
  return conCache(`demos:${desde}:${hasta}`, async () => {
    try {
      const res = await fetch(
        `${LANDING_URL()}/api/analyzer/demos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,
        { headers: { Authorization: `Bearer ${TOKEN()}` }, signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return { configurado: true as const, error: `la web respondio ${res.status}` };
      const d = (await res.json()) as any;
      if (!d?.current || !d?.previous) return { configurado: true as const, error: 'respuesta sin datos' };
      return { configurado: true as const, current: d.current, previous: d.previous };
    } catch (err: any) {
      return { configurado: true as const, error: err?.name === 'TimeoutError' ? 'la web no contesta' : String(err?.message || err) };
    }
  });
}

export async function leerEventoWeb(): Promise<EventoWeb | null> {
  return conCache('evento', async () => {
    try {
      const ev = await leerEvento();
      if (!ev || ev.acaba.getTime() < Date.now()) return null;
      return { nombre: ev.nombre, inscritos: ev.inscritos, empieza: ev.empieza.toISOString(), url: ev.url };
    } catch {
      return null;
    }
  });
}
