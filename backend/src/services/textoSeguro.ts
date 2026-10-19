// Un emoji son DOS unidades de texto en JavaScript (un "surrogado" alto y uno
// bajo). Un `.slice(0, n)` que cae entre las dos deja medio emoji, el body sale
// con un `\ud83e` suelto y Anthropic lo tumba con 400 "unexpected end of hex
// escape". Y no falla una respuesta: fallan TODOS los comentarios del post,
// porque lo ya contestado entra en cada prompt (Iker, 2026-10-19: una respuesta
// de 241 caracteres que acababa en 🤝, cortada a 240).
//
// Test: `npx tsx src/scripts/testSurrogados.ts`

/** `texto.slice(0, n)` sin partir un emoji: si el corte cae en medio, lo deja fuera entero. */
export function cortar(texto: string, n: number): string {
  if (texto.length <= n) return texto;
  const alto = texto.charCodeAt(n - 1);
  return alto >= 0xd800 && alto <= 0xdbff ? texto.slice(0, n - 1) : texto.slice(0, n);
}

/**
 * Quita los surrogados sueltos de todos los textos de un objeto (el body de
 * una llamada a Claude). Es la red para los recortes que no pasen por `cortar`:
 * cualquier `.slice` de cualquier prompt de la app acaba aqui.
 */
export function sanearUnicode<T>(valor: T): T {
  if (typeof valor === 'string') {
    return valor.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '') as T;
  }
  if (Array.isArray(valor)) return valor.map((v) => sanearUnicode(v)) as T;
  if (valor && typeof valor === 'object' && Object.getPrototypeOf(valor) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor)) out[k] = sanearUnicode(v);
    return out as T;
  }
  return valor;
}
