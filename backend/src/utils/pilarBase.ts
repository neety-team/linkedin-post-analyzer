/**
 * Subtipos del meme (2026-10-30, post-workflow §4.4-SUBTIPOS).
 *
 * El meme se abre en cinco subtipos ('meme_desgaste', 'meme_captura'...), igual
 * que el peloteo se abre en mapa, "Las 10" y despiece. Se asignan a mano; el
 * clasificador sigue emitiendo 'meme'. Todo lo que trata un post como meme
 * (la cabecera del chat, el resumen de la imagen, los filtros) usa esto para
 * no dejar fuera a los subtipos.
 */
export const MEME_SUBTIPOS = [
  'meme_desgaste',
  'meme_captura',
  'meme_grafica',
  'meme_traductor',
  'meme_personaje',
] as const;

/** 'meme' y todos sus subtipos. */
export const PILARES_MEME: string[] = ['meme', ...MEME_SUBTIPOS];

export function esMeme(pillar: string | null | undefined): boolean {
  return !!pillar && (pillar === 'meme' || pillar.startsWith('meme_'));
}

/** El pilar sin subtipo: 'meme_captura' -> 'meme'. El resto, tal cual. */
export function pilarBase(pillar: string | null | undefined): string | null | undefined {
  return esMeme(pillar) ? 'meme' : pillar;
}

/** Un filtro por pilares que pide 'meme' incluye tambien sus subtipos. */
export function expandirPilares(pilares: string[]): string[] {
  return pilares.includes('meme') ? Array.from(new Set([...pilares, ...MEME_SUBTIPOS])) : pilares;
}
