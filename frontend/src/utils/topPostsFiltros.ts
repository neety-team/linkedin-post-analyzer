// Logica PURA de los filtros y el orden de "Top posts" (Accounts). Sin React:
// se prueba con topPostsFiltros.test.ts (npx tsx). La pagina solo pinta.
//
// POR QUE (Iker, 2026-10-06): habia 11 botones de orden y 4 de tipo en una
// fila, todos de una sola opcion, y ningun filtro por PILAR, que es lo que
// reparte de verdad nuestros posts (en 90 dias: meme 23, historia 16, lead
// magnet 12, mapa 8...). Ahora: cuatro desplegables por categoria, como en una
// tienda de ropa. Y entre categorias, O dentro de una. El multiplicador no
// cambia al filtrar: sigue siendo contra la media de la cuenta (decidido por
// Iker ese dia). Especificacion: docs/superpowers/specs/2026-10-06-top-posts-
// filtros-desplegables-design.md

export type OrdenTop =
  | 'outlier_ratio' | 'impressions' | 'likes' | 'comments' | 'reposts'
  | 'engagement' | 'clicks' | 'ctr' | 'saves' | 'sends' | 'recent';

export type FiltroEnlace = 'todos' | 'con' | 'sin';

export interface FiltrosTop {
  orden: OrdenTop;
  // Slugs de pilar marcados (vacio = todos). SIN_PILAR representa los posts
  // sin clasificar.
  pilares: string[];
  // content_type marcados (vacio = todos).
  formatos: string[];
  enlace: FiltroEnlace;
}

export const SIN_PILAR = '__sin_pilar__';

export const FILTROS_TOP_DEFECTO: FiltrosTop = {
  orden: 'outlier_ratio',
  pilares: [],
  formatos: [],
  enlace: 'todos',
};

// Los 11 ordenes de siempre, agrupados por lo que MIDEN, que es lo que
// necesita Iker para elegir sin pensar: primero intencion ("¿esto sirvio?"),
// luego alcance bruto, luego las piezas del engagement, y la fecha.
// Engagement compuesto va al final de su grupo porque es redundante con
// Outlier, que es lo mismo normalizado por cuenta y por tanto mas justo.
export const ORDENES_TOP: { valor: OrdenTop; etiqueta: string; grupo: string; descripcion: string }[] = [
  { valor: 'outlier_ratio', etiqueta: '🔥 Outlier', grupo: 'Intención', descripcion: "Sorted by outlier ratio (highest multiplier vs. each creator's baseline)" },
  { valor: 'ctr', etiqueta: '🎯 CTR', grupo: 'Intención', descripcion: 'Ordenado por CTR: clics ÷ impresiones. Compara justo posts de tamaños distintos' },
  { valor: 'clicks', etiqueta: '🔗 Clics', grupo: 'Intención', descripcion: 'Ordenado por clics al enlace (solo posts que llevaban enlace)' },
  { valor: 'saves', etiqueta: '🔖 Guardados', grupo: 'Intención', descripcion: 'Ordenado por guardados. Cuesta más que un like y nadie guarda por compromiso' },
  { valor: 'sends', etiqueta: '✈️ Envíos', grupo: 'Intención', descripcion: 'Ordenado por envíos por privado. Alguien se lo mandó a otra persona' },
  { valor: 'impressions', etiqueta: '👁 Impresiones', grupo: 'Alcance', descripcion: 'Sorted by impressions (highest reach first)' },
  { valor: 'comments', etiqueta: '💬 Comentarios', grupo: 'Interacción', descripcion: 'Sorted by comments' },
  { valor: 'reposts', etiqueta: '🔁 Reposts', grupo: 'Interacción', descripcion: 'Sorted by reposts' },
  { valor: 'likes', etiqueta: '👍 Likes', grupo: 'Interacción', descripcion: 'Sorted by likes' },
  { valor: 'engagement', etiqueta: '⚡ Engagement', grupo: 'Interacción', descripcion: 'Sorted by engagement score' },
  { valor: 'recent', etiqueta: '🕐 Recientes', grupo: 'Fecha', descripcion: 'Sorted by most recent' },
];

const ORDENES_VALIDOS = new Set<string>(ORDENES_TOP.map((o) => o.valor));

export const ENLACE_OPCIONES: { valor: FiltroEnlace; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'con', etiqueta: 'Con enlace' },
  { valor: 'sin', etiqueta: 'Sin enlace' },
];

// Lo minimo que necesita un post para filtrarse y ordenarse. TopPost (la fila
// real de analytics) lo cumple de sobra.
export interface PostFiltrable {
  content_type?: string | null;
  pillar?: string | null;
  link_url?: string | null;
  impressions_count: number | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  engagement_score: number;
  outlier_ratio: number;
  link_clicks_count?: number | null;
  saves_count?: number | null;
  sends_count?: number | null;
  published_at: string | null;
}

export const formatoDe = (p: PostFiltrable): string => p.content_type || 'text';
export const pilarDe = (p: PostFiltrable): string => p.pillar || SIN_PILAR;
export const tieneEnlace = (p: PostFiltrable): boolean => !!p.link_url;

type Categoria = 'pilares' | 'formatos' | 'enlace';

// `ignorar` deja fuera UNA categoria: es lo que permite los recuentos
// facetados (cuantos posts tendria cada opcion de Pilar con los demas filtros
// puestos, pero sin el propio filtro de Pilar).
export function pasaFiltros(p: PostFiltrable, f: FiltrosTop, ignorar?: Categoria): boolean {
  if (ignorar !== 'pilares' && f.pilares.length > 0 && !f.pilares.includes(pilarDe(p))) return false;
  if (ignorar !== 'formatos' && f.formatos.length > 0 && !f.formatos.includes(formatoDe(p))) return false;
  if (ignorar !== 'enlace' && f.enlace !== 'todos' && tieneEnlace(p) !== (f.enlace === 'con')) return false;
  return true;
}

export function ordenarTop<T extends PostFiltrable>(posts: T[], orden: OrdenTop): T[] {
  // Copia antes de ordenar: la lista original la consumen los recuentos.
  const list = [...posts];
  const num = (v: number | null | undefined) => (typeof v === 'number' ? v : -Infinity);
  switch (orden) {
    case 'impressions': list.sort((a, b) => num(b.impressions_count) - num(a.impressions_count)); break;
    case 'likes': list.sort((a, b) => b.likes_count - a.likes_count); break;
    case 'comments': list.sort((a, b) => b.comments_count - a.comments_count); break;
    case 'reposts': list.sort((a, b) => b.reposts_count - a.reposts_count); break;
    case 'engagement': list.sort((a, b) => b.engagement_score - a.engagement_score); break;
    case 'clicks': list.sort((a, b) => num(b.link_clicks_count) - num(a.link_clicks_count)); break;
    case 'ctr': {
      // Solo posts que llevaban enlace Y tienen alcance medido: un CTR sobre 0
      // impresiones no es "malo", es que no hay dato. Los demas caen al final.
      const ctr = (p: T) =>
        p.link_clicks_count != null && p.impressions_count
          ? p.link_clicks_count / p.impressions_count
          : -Infinity;
      list.sort((a, b) => ctr(b) - ctr(a));
      break;
    }
    case 'saves': list.sort((a, b) => num(b.saves_count) - num(a.saves_count)); break;
    case 'sends': list.sort((a, b) => num(b.sends_count) - num(a.sends_count)); break;
    case 'recent':
      list.sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());
      break;
    default:
      list.sort((a, b) => b.outlier_ratio - a.outlier_ratio);
  }
  return list;
}

export function aplicarFiltrosTop<T extends PostFiltrable>(posts: T[], f: FiltrosTop): T[] {
  return ordenarTop(posts.filter((p) => pasaFiltros(p, f)), f.orden);
}

export interface RecuentosTop {
  pilares: Map<string, number>;
  formatos: Map<string, number>;
  enlace: Record<FiltroEnlace, number>;
}

// Recuentos como en una tienda: cada opcion dice cuantos posts quedarian al
// marcarla, con los filtros de las OTRAS categorias ya aplicados. Asi nunca se
// marca algo que deja la lista a cero sin verlo venir.
export function recuentosFacetados(posts: PostFiltrable[], f: FiltrosTop): RecuentosTop {
  const pilares = new Map<string, number>();
  const formatos = new Map<string, number>();
  const enlace: Record<FiltroEnlace, number> = { todos: 0, con: 0, sin: 0 };
  for (const p of posts) {
    if (pasaFiltros(p, f, 'pilares')) pilares.set(pilarDe(p), (pilares.get(pilarDe(p)) || 0) + 1);
    if (pasaFiltros(p, f, 'formatos')) formatos.set(formatoDe(p), (formatos.get(formatoDe(p)) || 0) + 1);
    if (pasaFiltros(p, f, 'enlace')) {
      enlace.todos++;
      if (tieneEnlace(p)) enlace.con++; else enlace.sin++;
    }
  }
  return { pilares, formatos, enlace };
}

// ¿Hay algun FILTRO activo? El orden no cuenta: siempre hay uno.
export function hayFiltrosTop(f: FiltrosTop): boolean {
  return f.pilares.length > 0 || f.formatos.length > 0 || f.enlace !== 'todos';
}

// ── URL ─────────────────────────────────────────────────────────────────────
// `?top_orden=ctr&top_pilar=historia,meme&top_formato=text_image&top_enlace=con`
// Solo se escribe lo que no esta en su valor por defecto, y se respetan los
// demas parametros de la pagina. Un enlace pegado en el chat reproduce la vista
// (sirve para el analisis semanal de patrones cruzados).
const CLAVES = { orden: 'top_orden', pilares: 'top_pilar', formatos: 'top_formato', enlace: 'top_enlace' } as const;

const lista = (v: string | null): string[] =>
  (v || '').split(',').map((s) => s.trim()).filter(Boolean);

export function filtrosDesdeParams(sp: URLSearchParams): FiltrosTop {
  const orden = sp.get(CLAVES.orden);
  const enlace = sp.get(CLAVES.enlace);
  return {
    orden: orden && ORDENES_VALIDOS.has(orden) ? (orden as OrdenTop) : FILTROS_TOP_DEFECTO.orden,
    pilares: lista(sp.get(CLAVES.pilares)),
    formatos: lista(sp.get(CLAVES.formatos)),
    enlace: enlace === 'con' || enlace === 'sin' ? enlace : 'todos',
  };
}

export function filtrosAParams(f: FiltrosTop, base: URLSearchParams): URLSearchParams {
  const sp = new URLSearchParams(base);
  const poner = (clave: string, valor: string | null) => (valor ? sp.set(clave, valor) : sp.delete(clave));
  poner(CLAVES.orden, f.orden !== FILTROS_TOP_DEFECTO.orden ? f.orden : null);
  poner(CLAVES.pilares, f.pilares.length ? f.pilares.join(',') : null);
  poner(CLAVES.formatos, f.formatos.length ? f.formatos.join(',') : null);
  poner(CLAVES.enlace, f.enlace !== 'todos' ? f.enlace : null);
  return sp;
}
