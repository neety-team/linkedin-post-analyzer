// El objetivo con el que se publica un post: el mismo en Semana (lo que se
// planifica) y en Cuentas (lo que se publico). Una sola constante para que los
// colores y los nombres no se separen entre las dos paginas.
//
// Clases escritas enteras: Tailwind solo compila las que ve en el codigo.

export type Objetivo = 'alcance' | 'notoriedad' | 'conversion';
export type FuenteObjetivo = 'manual' | 'semana' | 'barrido' | 'pilar';

export const OBJETIVOS: Objetivo[] = ['alcance', 'notoriedad', 'conversion'];

export const OBJETIVO: Record<Objetivo, { etiqueta: string; chip: string }> = {
  alcance: { etiqueta: 'Alcance', chip: 'text-data bg-data/10' },
  notoriedad: { etiqueta: 'Notoriedad', chip: 'text-diamond bg-diamond/15' },
  conversion: { etiqueta: 'Conversión', chip: 'text-accent bg-accent/10' },
};

export const FUENTE_OBJETIVO: Record<FuenteObjetivo, string> = {
  manual: 'Cambiado a mano',
  semana: 'El que se planificó en Semana',
  barrido: 'Decidido leyendo el post (histórico)',
  pilar: 'El que da su pilar de contenido',
};

export function esObjetivo(v: unknown): v is Objetivo {
  return typeof v === 'string' && (OBJETIVOS as string[]).includes(v);
}
