// Test de la logica pura de filtros de Top posts. Sin runner en el frontend,
// se corre con el tsx del backend:
//   cd backend && npx tsx ../frontend/src/utils/topPostsFiltros.test.ts
import assert from 'node:assert/strict';
import {
  aplicarFiltrosTop, recuentosFacetados, filtrosDesdeParams, filtrosAParams, hayFiltrosTop,
  FILTROS_TOP_DEFECTO, SIN_PILAR, type PostFiltrable, type FiltrosTop,
} from './topPostsFiltros';

const post = (o: Partial<PostFiltrable> & { id: string }): PostFiltrable & { id: string } => ({
  content_type: 'text_image', pillar: 'meme', link_url: null,
  impressions_count: 1000, likes_count: 10, comments_count: 1, reposts_count: 0,
  engagement_score: 10, outlier_ratio: 1, link_clicks_count: null, saves_count: null, sends_count: null,
  published_at: '2026-09-01T10:00:00Z', ...o,
});
const posts = [
  post({ id: 'h1', pillar: 'historia', link_url: 'https://x', link_clicks_count: 20, impressions_count: 1000, outlier_ratio: 2 }),
  post({ id: 'h2', pillar: 'historia', link_url: null, outlier_ratio: 5 }),
  post({ id: 'm1', pillar: 'meme', link_url: 'https://x', link_clicks_count: 5, impressions_count: 10000, outlier_ratio: 9 }),
  post({ id: 'm2', pillar: 'meme', content_type: 'text_video', outlier_ratio: 1 }),
  post({ id: 's1', pillar: null, content_type: null, outlier_ratio: 3 }),
];
// Enlace detectado por el TEXTO aunque link_url sea null (post manual con el
// acortado de LinkedIn en el cuerpo), y nunca por una palabra suelta.
const manualConEnlace = post({ id: 'man', pillar: 'historia', link_url: null, content_text: 'Eso te lo damos nosotros: https://lnkd.in/ebFtmB6Z

Y sigue.' });
const manualAcortado = post({ id: 'man2', pillar: 'historia', link_url: null, content_text: 'mira lnkd.in/abc y ya' });
const manualSinEnlace = post({ id: 'man3', pillar: 'historia', link_url: null, content_text: 'Un director comercial me solto una frase. Sin enlace.' });
assert.deepEqual(ids(aplicarFiltrosTop([manualConEnlace, manualAcortado, manualSinEnlace], con({ enlace: 'con' }))), ['man', 'man2']);
assert.deepEqual(ids(aplicarFiltrosTop([manualConEnlace, manualAcortado, manualSinEnlace], con({ enlace: 'sin' }))), ['man3']);
const ids = (l: { id: string }[]) => l.map((p) => p.id);
const con = (o: Partial<FiltrosTop>): FiltrosTop => ({ ...FILTROS_TOP_DEFECTO, ...o });

// 1. Sin filtros: todos, por outlier.
assert.deepEqual(ids(aplicarFiltrosTop(posts, FILTROS_TOP_DEFECTO)), ['m1', 'h2', 's1', 'h1', 'm2']);

// 2. Pilar: O dentro de la categoria, y SIN_PILAR representa los nulos.
assert.deepEqual(ids(aplicarFiltrosTop(posts, con({ pilares: ['historia'] }))), ['h2', 'h1']);
assert.deepEqual(ids(aplicarFiltrosTop(posts, con({ pilares: ['historia', 'meme'] }))), ['m1', 'h2', 'h1', 'm2']);
assert.deepEqual(ids(aplicarFiltrosTop(posts, con({ pilares: [SIN_PILAR] }))), ['s1']);

// 3. Y entre categorias: historia + con enlace + orden CTR.
assert.deepEqual(ids(aplicarFiltrosTop(posts, con({ pilares: ['historia'], enlace: 'con', orden: 'ctr' }))), ['h1']);
assert.deepEqual(ids(aplicarFiltrosTop(posts, con({ enlace: 'con', orden: 'ctr' }))), ['h1', 'm1'], 'h1 2% > m1 0,05%');
assert.deepEqual(ids(aplicarFiltrosTop(posts, con({ enlace: 'sin' }))), ['h2', 's1', 'm2']);

// 4. Formato: content_type nulo cuenta como 'text'.
assert.deepEqual(ids(aplicarFiltrosTop(posts, con({ formatos: ['text'] }))), ['s1']);
assert.deepEqual(ids(aplicarFiltrosTop(posts, con({ formatos: ['text_video', 'text'] }))), ['s1', 'm2']);

// 5. Recuentos facetados: cada categoria se cuenta con las OTRAS aplicadas.
const r = recuentosFacetados(posts, con({ pilares: ['historia'], enlace: 'con' }));
assert.equal(r.pilares.get('historia'), 1, 'historias con enlace');
assert.equal(r.pilares.get('meme'), 1, 'memes con enlace (sin aplicar el filtro de pilar)');
assert.equal(r.pilares.get(SIN_PILAR), undefined, 'sin pilar y sin enlace: no aparece');
assert.deepEqual(r.enlace, { todos: 2, con: 1, sin: 1 }, 'enlace se cuenta dentro de historia');
assert.equal(r.formatos.get('text_image'), 1, 'formato: historia + con enlace');
const r0 = recuentosFacetados(posts, FILTROS_TOP_DEFECTO);
assert.deepEqual(r0.enlace, { todos: 5, con: 2, sin: 3 });

// 6. hayFiltrosTop ignora el orden.
assert.equal(hayFiltrosTop(FILTROS_TOP_DEFECTO), false);
assert.equal(hayFiltrosTop(con({ orden: 'ctr' })), false);
assert.equal(hayFiltrosTop(con({ enlace: 'con' })), true);

// 7. URL: ida y vuelta, solo lo no-defecto, respetando otros parametros.
const base = new URLSearchParams('tab=bi');
const f = con({ orden: 'ctr', pilares: ['historia', 'meme'], enlace: 'con' });
const sp = filtrosAParams(f, base);
assert.equal(sp.toString(), 'tab=bi&top_orden=ctr&top_pilar=historia%2Cmeme&top_enlace=con');
assert.deepEqual(filtrosDesdeParams(sp), f);
assert.equal(filtrosAParams(FILTROS_TOP_DEFECTO, sp).toString(), 'tab=bi', 'volver al defecto borra las claves');
assert.deepEqual(filtrosDesdeParams(new URLSearchParams('top_orden=loquesea&top_enlace=x')), FILTROS_TOP_DEFECTO, 'valores invalidos caen al defecto');

console.log('✅ topPostsFiltros.test: todo OK');
