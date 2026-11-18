/**
 * MENCIONES DE UN POST PROGRAMADO (2026-11-18).
 *
 * Los textos de la semana mencionan con `@Nombre Apellido`. Unipile no entiende
 * eso: quiere el texto con `{{0}}`, `{{1}}`… y, aparte, la lista `mentions` con
 * el nombre y el `profile_id` de cada uno, en ese orden. Los perfiles vienen de
 * `semana_posts.menciones` ([{nombre, profile_id}]).
 *
 * Funciones puras, sin BD ni red: se prueban en `scripts/testMenciones.ts`.
 *
 * - Los nombres llevan espacios y tildes. Se comparan en NFC (un texto copiado
 *   de macOS puede traer las tildes descompuestas) y se casa el MAS LARGO
 *   primero: con «Ana» y «Ana Pérez» en la lista, «@Ana Pérez» es Ana Pérez.
 * - El nombre tiene que acabar ahi: «@Ana» no casa dentro de «@Anabel».
 * - Un `@Algo` que queda sin perfil hace que el post no se pueda programar: en
 *   LinkedIn saldria como texto plano, sin mencion.
 * - Un correo (`iker@neety.com`) no es una mencion: la @ va pegada a letras.
 */

export interface Mencion {
  nombre: string;
  profile_id: string;
}

export interface MencionUnipile {
  name: string;
  profile_id: string;
}

export interface TextoConMenciones {
  /** El texto con cada `@Nombre` cambiado por `{{i}}`. */
  texto: string;
  /** Lo que va en `mentions`, en el orden de los indices. */
  mentions: MencionUnipile[];
  /** Los `@Algo` del texto que no tienen perfil, sin repetir y en orden de aparicion. */
  sinPerfil: string[];
}

const LETRA = /[\p{L}\p{M}\p{N}_]/u;
// Una @ que no va pegada a una palabra (eso seria un correo) y le sigue una letra.
// Se captura hasta tres palabras mas en mayuscula, para nombrar bien lo que falta.
const RE_ARROBA = /(?<![\p{L}\p{M}\p{N}_.])@(\p{L}[\p{L}\p{M}\p{N}'’.-]*(?: \p{Lu}[\p{L}\p{M}\p{N}'’.-]*){0,3})/gu;

const nfc = (s: string) => s.normalize('NFC');

/** Valida y limpia la lista que llega del PUT o del MCP. `null` la vacia. */
export function normalizarMenciones(v: unknown, clave: string): Mencion[] {
  if (v === null) return [];
  if (!Array.isArray(v)) throw new Error(`\`menciones\` de ${clave} tiene que ser una lista de {nombre, profile_id}`);
  const out: Mencion[] = [];
  const vistos = new Set<string>();
  for (const m of v) {
    const nombre = typeof m?.nombre === 'string' ? nfc(m.nombre.trim().replace(/^@/, '')) : '';
    const profile_id = typeof m?.profile_id === 'string' ? m.profile_id.trim() : '';
    if (!nombre || !profile_id) {
      throw new Error(`Cada mención de ${clave} necesita \`nombre\` y \`profile_id\``);
    }
    if (nombre.length > 120 || profile_id.length > 200) throw new Error(`Mención demasiado larga en ${clave}`);
    if (vistos.has(nombre)) throw new Error(`Mención repetida en ${clave}: ${nombre}`);
    vistos.add(nombre);
    out.push({ nombre, profile_id });
  }
  return out;
}

/**
 * Cambia cada `@Nombre` con perfil por `{{i}}` y devuelve la lista para Unipile.
 * Una persona mencionada dos veces usa el mismo indice. Las menciones de la
 * lista que el texto no usa no van en `mentions`.
 */
export function aplicarMenciones(textoOriginal: string, menciones: Mencion[] | null | undefined): TextoConMenciones {
  const texto = nfc(textoOriginal || '');
  const lista = (menciones || [])
    .map((m) => ({ nombre: nfc(String(m.nombre || '').trim().replace(/^@/, '')), profile_id: String(m.profile_id || '').trim() }))
    .filter((m) => m.nombre && m.profile_id)
    .sort((a, b) => b.nombre.length - a.nombre.length);

  const mentions: MencionUnipile[] = [];
  const indice = new Map<string, number>();
  let out = '';
  let i = 0;
  while (i < texto.length) {
    const c = texto[i];
    const pegada = i > 0 && /[\p{L}\p{M}\p{N}_.]/u.test(texto[i - 1]);
    if (c === '@' && !pegada) {
      const m = lista.find((x) => {
        if (!texto.startsWith(x.nombre, i + 1)) return false;
        const sig = texto[i + 1 + x.nombre.length];
        return sig === undefined || !LETRA.test(sig);
      });
      if (m) {
        let n = indice.get(m.nombre);
        if (n === undefined) {
          n = mentions.length;
          indice.set(m.nombre, n);
          mentions.push({ name: m.nombre, profile_id: m.profile_id });
        }
        out += `{{${n}}}`;
        i += 1 + m.nombre.length;
        continue;
      }
    }
    out += c;
    i++;
  }

  const sinPerfil: string[] = [];
  for (const r of out.matchAll(RE_ARROBA)) {
    const nombre = r[1].replace(/[.'’-]+$/, '');
    if (nombre && !sinPerfil.includes(nombre)) sinPerfil.push(nombre);
  }
  return { texto: out, mentions, sinPerfil };
}

/** El motivo por el que las menciones impiden programar, o null. */
export function motivoMenciones(texto: string, menciones: Mencion[] | null | undefined): string | null {
  const { sinPerfil } = aplicarMenciones(texto, menciones);
  if (!sinPerfil.length) return null;
  if (sinPerfil.length === 1) return `Falta el perfil de LinkedIn de @${sinPerfil[0]}`;
  return `Falta el perfil de LinkedIn de ${sinPerfil.map((n) => '@' + n).join(', ')}`;
}
