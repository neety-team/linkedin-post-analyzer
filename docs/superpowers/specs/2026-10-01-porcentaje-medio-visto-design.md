# Porcentaje medio visto en los posts de vídeo — diseño

**Fecha:** 2026-10-01 · **Pedido por:** Iker · **Estado:** aprobado en conversación, pendiente de revisar este documento

## Por qué

El 30/09 Unai publicó el primer post con vídeo de la casa. LinkedIn da tres métricas de vídeo en la analítica del post (*Video views*, *Watch time*, *Average watch time*) que el dashboard no recoge. Iker quiere ver **una sola**: el tiempo medio visto **en porcentaje de la duración**, como YouTube Shorts lo llama ("porcentaje medio visto"). Por encima del 100% significa que se ve más de una vez, que es el objetivo de un vídeo en bucle (`docs/skills/video.md §6.5f`).

Caso real: 17 s de media en un vídeo de 22,27 s = **76%**.

## Lo comprobado antes de diseñar

- **Las tres métricas vienen en la misma página que ya leemos** (`/analytics/post-summary/<urn>/`, `backend/src/services/premiumAnalytics.ts`). En el post del 30/09: `834` antes de la etiqueta `Video views` (patrón *destacada*), y `Watch time` → `3h 57m`, `Average watch time` → `17s` (patrón *fila*, pero con texto, no solo dígitos).
- **La duración NO viene en esa página.** Sí viene el vídeo: `GET /api/v1/posts/{id}` de Unipile devuelve `attachments[0]` con `type: "video"` y una `url` de `dms.licdn.com` (mp4). Pidiendo solo los **primeros 64 KB** (`Range: bytes=0-65535`, respuesta 206), el átomo `mvhd` aparece en el byte 44 y da **22,273 s**. Sin ffmpeg y sin descargar el vídeo.

## Alcance

**Entra:** leer y guardar las 3 métricas y la duración; mostrar el porcentaje en la franja de métricas de cada post de vídeo (Live Posts y Top Posts); exponerlo en la herramienta MCP de posts.
**No entra:** gráficas de retención, comparativas entre vídeos, métricas de vídeo de la competencia (su analítica solo la ve el autor).

## Diseño

### 1 · Datos (`backend/src/db/migrate.ts`)
Cuatro columnas nuevas en `posts`, todas nulas por defecto:
- `video_views INTEGER`
- `video_watch_time_s INTEGER` — tiempo total, en segundos
- `video_avg_watch_s INTEGER` — tiempo medio, en segundos
- `video_duration_s NUMERIC(8,3)` — duración del vídeo

### 2 · Lectura de la analítica (`premiumAnalytics.ts`)
- `PremiumAnalytics` gana `videoViews`, `videoWatchTimeS`, `videoAvgWatchS`.
- `videoViews` con `destacada(html, 'Video views')`.
- Las otras dos con una variante de `fila` que acepta texto (`"3h 57m"`, `"1m 5s"`, `"17s"`) y una función `aSegundos()` que convierte `h`/`m`/`s` a segundos. Mismo filtro de tooltip que `fila`.
- En posts sin vídeo la página no trae el bloque: todo sale `null`, sin error.
- **Guardado (`savePremiumAnalytics`):** `video_views` y `video_watch_time_s` son acumulados → `GREATEST(COALESCE(...))`, como el resto. `video_avg_watch_s` **puede bajar** → `COALESCE` sin `GREATEST`, y **un 0 con reproducciones > 0 se trata como null** (LinkedIn sirve ceros a ratos, `project_unipile_ceros_intermitentes`).

### 3 · Duración (`backend/src/services/videoDuration.ts`, nuevo)
- `fetchVideoDuration(linkedinPostId, accountId): Promise<number | null>`: pide el post a Unipile, coge el primer adjunto `type === 'video'`, pide `Range: bytes=0-65535` y busca `mvhd`. Versión 0: `timescale`/`duration` de 32 bits; versión 1: duración de 64 bits.
- Si `mvhd` no está al principio (archivo sin *faststart*), segundo intento con `Range: bytes=-65536` (el final). Si tampoco, `null`.
- Se llama **una sola vez por post**: en el mismo sitio donde el monitor lee la analítica Premium, solo si `content_type = 'text_video'` y `video_duration_s IS NULL`. La duración no cambia nunca.
- Las URL de `dms.licdn.com` caducan: se pide el post a Unipile justo antes, no se guarda la URL.

### 4 · API
Las tres consultas de `routes/accounts.ts` que ya listan `saves_count`, `sends_count`… (líneas ~1563, ~1794 y ~2130) añaden las 4 columnas. `models/post.ts` igual.

### 5 · Dashboard (`frontend/src/pages/Accounts.tsx`, `FranjaPremium`)
- Solo si el post es vídeo (`content_type === 'text_video'`).
- **Primera métrica Premium**, antes de guardados: icono de *play* en SVG monocromo, como el resto de glifos de la franja, y el porcentaje redondeado: `▶ 76%`.
- Cálculo: `video_avg_watch_s / video_duration_s × 100`. Si falta cualquiera de los dos: `▶ —`, con tooltip *"aún sin leer"*.
- **≥ 100%**: la cifra se resalta (mismo ámbar que los clics), porque es el objetivo de un vídeo en bucle.
- **Tooltip:** *"Porcentaje medio visto: de media se ven 17 s de los 22 s del vídeo. Por encima del 100%, se ve más de una vez. LinkedIn redondea la media al segundo (±2-3 puntos)."*
- Los tipos de post del fichero (`~117`, `~144`, `~194`, `~407`) ganan los 4 campos opcionales.

### 6 · MCP (`backend/src/mcp/tools.ts`, ~669)
Junto a guardados y envíos, `"X% visto"` cuando el post es vídeo y hay datos. Así el análisis de los siguientes vídeos lo tiene sin entrar al dashboard.

## Errores y casos raros
- Página de analítica ilegible → igual que hoy: `null`, no pisa nada.
- Vídeo borrado o URL caducada → duración `null`, se reintenta en el siguiente ciclo.
- Post de imagen → el componente no pinta nada nuevo.
- Media > duración → porcentaje > 100%, se pinta tal cual (no se recorta).

## Pruebas
No hay runner de tests en el repo; se sigue el patrón de `backend/src/scripts/probar*.ts`:
- `probarVideoMetricas.ts`: `aSegundos("3h 57m") = 14220`, `aSegundos("17s") = 17`, `aSegundos("1m 5s") = 65`; el parser de `mvhd` sobre los 64 KB reales del vídeo del 30/09 da 22,273; y lectura en vivo de la analítica del post `urn:li:activity:7511073375721664512` con la cuenta de Unai: 834 / 14220 / 17.
- Frontend: `tsc -b` (el `--noEmit` no comprueba nada aquí) y mirar la franja en Live Posts con el post del 30/09: debe salir `▶ 76%`.
