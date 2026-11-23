/**
 * Las menciones de la vista previa (2026-11-23). Marca como mención exactamente
 * lo que enlazará el publicador: es el mismo recorrido que `aplicarMenciones`
 * de `backend/src/services/menciones.ts`, sobre la lista `menciones` del post.
 *
 * - Solo es mención un `@Nombre` cuyo nombre está en la lista, tal cual (en NFC),
 *   y que acaba ahí: «@Ana» no casa dentro de «@Anabel».
 * - Se casa el nombre más largo primero, así que valen minúsculas («@byNeural»),
 *   puntos y siglas («Ph.D.») y varias palabras.
 * - Una @ pegada a una palabra o a un punto es un correo, no una mención.
 * - Un `@Algo` sin perfil se queda en llano, como saldría en LinkedIn.
 *
 * `menciones.test.ts` lo compara con `aplicarMenciones` del backend.
 */

export interface MencionPost {
  nombre: string;
  profile_id: string;
}

export type Trozo = { tipo: 'texto'; texto: string } | { tipo: 'mencion'; nombre: string };

const LETRA = /[\p{L}\p{M}\p{N}_]/u;
const PEGADA = /[\p{L}\p{M}\p{N}_.]/u;
const nfc = (s: string) => s.normalize('NFC');

export function trozosConMenciones(textoOriginal: string, menciones: MencionPost[] | null | undefined): Trozo[] {
  const texto = nfc(textoOriginal || '');
  const lista = (menciones || [])
    .map((m) => ({ nombre: nfc(String(m?.nombre || '').trim().replace(/^@/, '')), profile_id: String(m?.profile_id || '').trim() }))
    .filter((m) => m.nombre && m.profile_id)
    .sort((a, b) => b.nombre.length - a.nombre.length);

  const out: Trozo[] = [];
  let llano = '';
  let i = 0;
  while (i < texto.length) {
    const c = texto[i];
    const pegada = i > 0 && PEGADA.test(texto[i - 1]);
    if (c === '@' && !pegada) {
      const m = lista.find((x) => {
        if (!texto.startsWith(x.nombre, i + 1)) return false;
        const sig = texto[i + 1 + x.nombre.length];
        return sig === undefined || !LETRA.test(sig);
      });
      if (m) {
        if (llano) out.push({ tipo: 'texto', texto: llano });
        llano = '';
        out.push({ tipo: 'mencion', nombre: m.nombre });
        i += 1 + m.nombre.length;
        continue;
      }
    }
    llano += c;
    i++;
  }
  if (llano) out.push({ tipo: 'texto', texto: llano });
  return out;
}
