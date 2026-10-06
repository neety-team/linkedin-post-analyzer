# Filtros desplegables en Top posts — diseño

**Fecha:** 2026-10-06 · **Pedido por:** Iker · **Estado:** aprobado en conversación

## Por qué

Top posts (Accounts, abajo del todo) tiene hoy 11 botones de orden y hasta 4 de tipo en la misma fila, todos de una sola opción. Iker quiere (1) filtrar por **pilar de contenido** y ordenar dentro de ese pilar por outlier, CTR, clics o envíos ("qué historias convierten", "qué memes se envían"), (2) poder marcar **varias opciones** donde tenga sentido (mapa + las 10 + objeto como "peloteo") y (3) que los filtros vayan en **desplegables por categoría, como en una tienda de ropa**, con nombres que entienda él, que es quien los usa. De paso sirve al análisis semanal de patrones cruzados: una vista filtrada se puede pegar como enlace.

## Lo comprobado antes de diseñar (72 posts de los 3 jefes, últimos 90 días, producción)

- **Pilar reparte bien:** meme 23, historia 16, lead_magnet 12, peloteo_mapa 8, evento 5, peloteo_los10 4, peloteo_objeto 3, tarjeta 1. Es el filtro que falta.
- **Formato casi no discrimina:** 70 de 72 son texto + imagen. Se mantiene porque existe hoy y servirá con más vídeo.
- **Tipo de gancho (`hook_type`) está vacío** en los nuestros: no entra.
- **55 de 72 llevan enlace:** CTR y clics solo tienen sentido con enlace, de ahí el filtro `Enlace`.
- La lista ya llega entera del backend (`GET /api/accounts/analytics`, `top_posts`, LIMIT 1000) con `pillar`, `content_type` y `link_url`: **todo es cliente, sin tocar el backend.**
- El catálogo de pilares (etiqueta, color, orden) ya vive en `PilaresProvider` / `usePilares()` (`components/accounts/PilarSelector.tsx`).

## Alcance

**Entra:** una barra de 4 desplegables en la tarjeta Top posts, resumen de filtros activos con "x" y "Limpiar", estado en la URL, recuentos facetados.
**No entra:** cambiar el multiplicador (el outlier sigue siendo contra la media de la cuenta, decidido por Iker el 06/10); el filtro de cuenta (sigue arriba de la página porque afecta a todas las gráficas); la paginación de 8 con "Ver más"; cambios en el backend.

## Diseño

### 1 · Las cuatro categorías

| Desplegable | Selección | Opciones | Por qué así |
|---|---|---|---|
| `Ordenar por` | una | Agrupadas con título dentro del panel. **Intención:** Outlier, CTR, Clics, Guardados, Envíos. **Alcance:** Impresiones. **Interacción:** Comentarios, Reposts, Likes, Engagement. **Fecha:** Recientes. | Son los 11 de hoy; el título dice qué mide cada bloque. |
| `Pilar` | varias | Las etiquetas del catálogo con su recuento, en el `sort_order` del catálogo; "Sin pilar" si hay posts con `pillar` nulo. | Comparar familias (los tres peloteos juntos). |
| `Formato` | varias | `FORMAT_LABELS` de los `content_type` presentes, con recuento. | Igual que el filtro de tipo de hoy, pero combinable. |
| `Enlace` | una | Todos · Con enlace · Sin enlace. | Da sentido a CTR y clics. |

Combinación: **Y entre categorías, O dentro de una.** Sin nada marcado en Pilar o Formato = todas.

### 2 · Componente `FiltroDesplegable` (`frontend/src/components/accounts/FiltroDesplegable.tsx`)

Un solo componente para las cuatro chapas. Props: `etiqueta`, `opciones: { valor, etiqueta, recuento?, grupo? }[]`, `seleccion: string[]`, `multiple: boolean`, `onChange(valores)`. Pinta la chapa (en acento y con el número de marcadas cuando hay algo activo; en orden único, con el nombre de la opción elegida), y un panel debajo con checkboxes (múltiple) o radios (única), agrupados por `grupo` cuando lo hay. Se cierra con clic fuera o `Escape`. Sin librerías nuevas.

### 3 · Estado y URL (`frontend/src/pages/Accounts.tsx`)

- `topPostsTypeFilter` y `topPostsSort` se sustituyen por un solo estado `topFiltros = { orden, pilares: string[], formatos: string[], enlace: 'todos' | 'con' | 'sin' }`.
- Se lee y escribe en la URL con `useSearchParams` (react-router v7, ya en el proyecto): `top_orden`, `top_pilar` (lista separada por comas), `top_formato`, `top_enlace`. Solo se escriben los que no están en su valor por defecto; se actualiza con `replace` para no llenar el historial. Un enlace pegado en el chat reproduce la vista.
- `filteredTopPosts` aplica los tres filtros y luego el orden (la lógica de orden actual se mantiene tal cual).
- **Recuentos facetados:** el recuento de cada opción se calcula con los OTROS filtros aplicados, como en una tienda: marcar historia hace que Enlace enseñe "con enlace (9)" solo de historias. Así nunca se marca algo que deja la lista a cero sin saberlo.
- Cambiar cualquier filtro vuelve la paginación a la primera página (`setVisibleTop(TOP_PAGE)`), como hace hoy el filtro de tipo.

### 4 · Lo que se ve

- Cabecera: `Top posts (16 of 72)` cuando hay algún filtro.
- Debajo del título, la línea de "Sorted by…" de hoy se mantiene (depende del orden elegido).
- La fila de 4 chapas sustituye a las dos filas de botones.
- Si hay filtros activos, una línea con cada uno como etiqueta pequeña con "×" (`Pilar: Historia ×`, `Enlace: con ×`) y un botón `Limpiar` al final. El orden no aparece ahí: siempre hay uno.
- `destacar` de `TopPostRow` sigue colgando del orden (CTR / outlier).

### 5 · Pruebas

- Tipos: `tsc -b` en `frontend/` no suma errores a los 12 que ya hay (ninguno de este cambio).
- Lógica pura `aplicarFiltrosTop(posts, filtros)` y `recuentosFacetados(posts, filtros)` en `frontend/src/utils/topPostsFiltros.ts`, con test en `frontend/src/utils/topPostsFiltros.test.ts` si hay runner; si no, script `npx tsx` como en el backend.
- En producción: abrir `/accounts?top_pilar=historia&top_orden=ctr&top_enlace=con` y comprobar que la lista y los recuentos cuadran con los datos de la API.
