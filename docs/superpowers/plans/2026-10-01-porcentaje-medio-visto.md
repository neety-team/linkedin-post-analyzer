# Porcentaje medio visto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guardar las métricas de vídeo de LinkedIn (reproducciones, tiempo total, tiempo medio) y la duración del vídeo, y enseñar en la franja de cada post de vídeo el "porcentaje medio visto".

**Architecture:** Las 3 métricas salen de la página de analíticas que ya parsea `premiumAnalytics.ts`. La duración se lee una vez de la cabecera `mvhd` del mp4 que enlaza Unipile (Range de 64 KB). Se guardan 4 columnas en `posts`, viajan por las mismas consultas que `saves_count` y el frontend pinta el porcentaje en `FranjaPremium`.

**Tech Stack:** Node + TypeScript (backend, `tsx`), Postgres, React + Tailwind (frontend).

## Global Constraints
- Spec: `docs/superpowers/specs/2026-10-01-porcentaje-medio-visto-design.md`.
- Nombre visible: **"Porcentaje medio visto"** (Iker, 01/10).
- Colores: neutro < 80% · **verde ≥ 80%** (Iker) · **ámbar ≥ objetivo de Jenny por duración**: 100% si el vídeo dura < 30 s, 90% si dura ≥ 30 s (`Documentos/Mario/APRILYNNE/APUNTES JENNY SHORTS.txt`: *"Under 30s → needs 100%+ retention. 30–40s → 90%+"*).
- Ceros: `video_avg_watch_s = 0` con `video_views > 0` se trata como null (LinkedIn sirve ceros a ratos).
- No hay runner de tests: las pruebas son scripts `backend/src/scripts/probar*.ts` con `npx tsx`.
- Typecheck del frontend con `npx tsc -b` (el `--noEmit` no comprueba nada aquí).
- Commits con `git add <ruta>` por nombre, nunca `-A`.

---

### Task 1: Parsers puros (tiempo y cabecera mp4) con su prueba

**Files:**
- Create: `backend/src/services/videoMetrics.ts`
- Create: `backend/src/scripts/probarVideoMetricas.ts`

**Interfaces:**
- Produces: `aSegundos(s: string | null | undefined): number | null`, `duracionMvhd(buf: Buffer): number | null`, `fetchVideoDuration(linkedinPostId: string, accountId: string): Promise<number | null>`

- [ ] **Step 1: Escribir la prueba** (`probarVideoMetricas.ts`)

```ts
import { aSegundos, duracionMvhd } from '../services/videoMetrics';

let fallos = 0;
const eq = (nombre: string, real: unknown, esperado: unknown) => {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${nombre}: ${real} (esperado ${esperado})`);
};

eq('3h 57m', aSegundos('3h 57m'), 14220);
eq('17s', aSegundos('17s'), 17);
eq('1m 5s', aSegundos('1m 5s'), 65);
eq('vacio', aSegundos(''), null);
eq('null', aSegundos(null), null);

// Cabecera mp4 sintetica: atomo mvhd version 0, timescale 1000, duracion 22273.
const b = Buffer.alloc(120);
b.write('mvhd', 44, 'ascii');
b.writeUInt8(0, 48);              // version
b.writeUInt32BE(1000, 60);        // timescale (mvhd+16)
b.writeUInt32BE(22273, 64);       // duration  (mvhd+20)
eq('mvhd v0', duracionMvhd(b), 22.273);
eq('sin mvhd', duracionMvhd(Buffer.alloc(64)), null);

console.log(fallos ? `\n${fallos} fallos` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `cd backend && npx tsx src/scripts/probarVideoMetricas.ts`
Expected: error de import (`videoMetrics` no existe).

- [ ] **Step 3: Implementar `videoMetrics.ts`**

```ts
/**
 * Metricas de VIDEO de un post de LinkedIn (Iker, 2026-10-01).
 * - aSegundos: "3h 57m" / "1m 5s" / "17s" -> segundos (asi los pinta LinkedIn).
 * - duracionMvhd: duracion del video leida del atomo `mvhd` del mp4.
 * - fetchVideoDuration: pide el post a Unipile, coge el adjunto de video y lee
 *   SOLO la cabecera (64 KB) del mp4. La pagina de analiticas no da la duracion.
 *   Probado con el video de Unai del 30/09: mvhd en el byte 44, 22,273 s.
 */
const BASE = () => process.env.UNIPILE_BASE_URL || 'https://api18.unipile.com:14891';
const KEY = () => process.env.UNIPILE_API_KEY || '';

export function aSegundos(s: string | null | undefined): number | null {
  if (!s) return null;
  let total = 0;
  let algo = false;
  for (const m of s.matchAll(/(\d+)\s*([hms])/gi)) {
    algo = true;
    const n = parseInt(m[1], 10);
    total += m[2].toLowerCase() === 'h' ? n * 3600 : m[2].toLowerCase() === 'm' ? n * 60 : n;
  }
  return algo ? total : null;
}

export function duracionMvhd(buf: Buffer): number | null {
  const i = buf.indexOf('mvhd', 0, 'ascii');
  if (i < 0 || i + 36 > buf.length) return null;
  const version = buf.readUInt8(i + 4);
  let timescale: number;
  let duration: number;
  if (version === 0) {
    timescale = buf.readUInt32BE(i + 16);
    duration = buf.readUInt32BE(i + 20);
  } else {
    timescale = buf.readUInt32BE(i + 24);
    duration = Number(buf.readBigUInt64BE(i + 28));
  }
  if (!timescale || !duration) return null;
  return Math.round((duration / timescale) * 1000) / 1000;
}

async function trozo(url: string, range: string): Promise<Buffer | null> {
  const r = await fetch(url, { headers: { Range: range } });
  if (!r.ok) return null;
  return Buffer.from(await r.arrayBuffer());
}

export async function fetchVideoDuration(linkedinPostId: string, accountId: string): Promise<number | null> {
  if (!KEY() || !linkedinPostId || !accountId) return null;
  const id = String(linkedinPostId).replace(/^urn:li:activity:/, '');
  const res = await fetch(`${BASE()}/api/v1/posts/${id}?account_id=${encodeURIComponent(accountId)}`, {
    headers: { 'X-API-KEY': KEY(), Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const post: any = await res.json();
  const video = (post?.attachments || []).find((a: any) => a?.type === 'video' && a?.url);
  if (!video) return null;
  // Casi siempre el mp4 viene con faststart (mvhd al principio). Si no, va al final.
  const inicio = await trozo(video.url, 'bytes=0-65535');
  const d1 = inicio ? duracionMvhd(inicio) : null;
  if (d1) return d1;
  const fin = await trozo(video.url, 'bytes=-65536');
  return fin ? duracionMvhd(fin) : null;
}
```

- [ ] **Step 4: Ejecutar la prueba**

Run: `cd backend && npx tsx src/scripts/probarVideoMetricas.ts`
Expected: todas `OK`, `Todo OK`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/videoMetrics.ts backend/src/scripts/probarVideoMetricas.ts
git commit -m "video: parsers de tiempo y de la cabecera mp4 para el porcentaje medio visto"
```

### Task 2: Columnas, lectura de la analítica y guardado

**Files:**
- Modify: `backend/src/db/migrate.ts` (tras `premium_analytics_at`, ~708)
- Modify: `backend/src/services/premiumAnalytics.ts`
- Modify: `backend/src/services/postMonitor.ts` (~337, ~386, ~742)
- Modify: `backend/src/routes/accounts.ts` (~4806)
- Modify: `backend/src/scripts/probarVideoMetricas.ts` (lectura en vivo)

**Interfaces:**
- Consumes: `aSegundos`, `fetchVideoDuration` (Task 1)
- Produces: columnas `video_views`, `video_watch_time_s`, `video_avg_watch_s`, `video_duration_s`; `PremiumAnalytics.videoViews/videoWatchTimeS/videoAvgWatchS`; `savePremiumAnalytics(pool, postId, a, ctx?: { linkedinPostId: string; accountId: string })`

- [ ] **Step 1: Migración**

```sql
  -- v-video (2026-10-01): metricas de VIDEO de LinkedIn y duracion del video.
  -- Solo se enseña el porcentaje medio visto (avg / duracion); el resto se
  -- guarda para analizar los siguientes videos.
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_views INTEGER;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_watch_time_s INTEGER;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_avg_watch_s INTEGER;
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_duration_s NUMERIC(8,3);
```

- [ ] **Step 2: Lectura en `fetchPremiumAnalytics`**

Añadir a la interfaz `videoViews`, `videoWatchTimeS`, `videoAvgWatchS` (`number | null`), una función `filaTexto` (como `fila` pero captura `[^"]{1,20}` que empiece por dígito) y en el `return`:

```ts
    videoViews: destacada(html, 'Video views'),
    videoWatchTimeS: aSegundos(filaTexto(html, 'Watch time')),
    videoAvgWatchS: aSegundos(filaTexto(html, 'Average watch time')),
```

- [ ] **Step 3: Guardado**

En `savePremiumAnalytics`, añadir a la UPDATE:

```sql
       video_views         = GREATEST(COALESCE($9, video_views), video_views),
       video_watch_time_s  = GREATEST(COALESCE($10, video_watch_time_s), video_watch_time_s),
       video_avg_watch_s   = COALESCE($11, video_avg_watch_s),
```

con `$11 = (a.videoAvgWatchS === 0 && (a.videoViews ?? 0) > 0) ? null : a.videoAvgWatchS`. Después, si `ctx` viene y `a.videoViews != null`, leer `video_duration_s`; si es null, `fetchVideoDuration(ctx.linkedinPostId, ctx.accountId)` y guardarla. Errores de la duración, en `try/catch` con `console.warn`: nunca rompen el guardado.

- [ ] **Step 4: Pasar `ctx` en las 4 llamadas** (`postMonitor.ts` ×3 y `accounts.ts` ×1):

```ts
await savePremiumAnalytics(pool, p.id, a, { linkedinPostId: String(p.linkedin_post_id), accountId: p.unipile_account_id });
```

- [ ] **Step 5: Prueba en vivo** (añadir al final de `probarVideoMetricas.ts`, solo si hay `UNIPILE_API_KEY`):

```ts
import { fetchPremiumAnalytics } from '../services/premiumAnalytics';
import { fetchVideoDuration } from '../services/videoMetrics';
// post del 30/09 de Unai
const a = await fetchPremiumAnalytics('urn:li:activity:7511073375721664512', 'aamcUZmeRYCZ3Se9EP77DQ');
console.log('en vivo', a?.videoViews, a?.videoWatchTimeS, a?.videoAvgWatchS);
console.log('duracion', await fetchVideoDuration('7511073375721664512', 'aamcUZmeRYCZ3Se9EP77DQ'));
```

Run: `cd backend && npx tsx src/scripts/probarVideoMetricas.ts` · Expected: reproducciones ≥ 834, tiempo total ≥ 14220, media ~17, duración 22.273.

- [ ] **Step 6: Typecheck y commit**

Run: `cd backend && npx tsc --noEmit -p .` · Expected: sin errores.

```bash
git add backend/src/db/migrate.ts backend/src/services/premiumAnalytics.ts backend/src/services/postMonitor.ts backend/src/routes/accounts.ts backend/src/scripts/probarVideoMetricas.ts
git commit -m "video: guardar reproducciones, tiempo visto y duracion de los posts de video"
```

### Task 3: API, MCP y franja del dashboard

**Files:**
- Modify: `backend/src/models/post.ts` (interfaz ~20 y SELECT ~94)
- Modify: `backend/src/routes/accounts.ts` (SELECT ~1563, ~1794, ~2130; en el de ~2130 también `p.content_type`)
- Modify: `backend/src/mcp/tools.ts` (~669)
- Modify: `frontend/src/pages/Accounts.tsx` (tipos ~117/~144/~194, `PostPremium` ~407, `FranjaPremium`)

**Interfaces:**
- Consumes: columnas de Task 2
- Produces: `porcentajeVisto(post): number | null` y `nivelVisto(pct, duracion): 'neutro' | 'bueno' | 'objetivo'` en `Accounts.tsx`

- [ ] **Step 1: Backend.** Añadir `video_views, video_watch_time_s, video_avg_watch_s, video_duration_s` (con prefijo `p.` donde toque) a los 4 SELECT y a la interfaz de `post.ts` (`number | null`). En `tools.ts`, tras los envíos:

```ts
p.video_avg_watch_s != null && Number(p.video_duration_s) > 0
  ? `${Math.round((p.video_avg_watch_s / Number(p.video_duration_s)) * 100)}% medio visto` : null,
```

- [ ] **Step 2: Frontend.** Añadir los 4 campos opcionales y `content_type?: string` a `PostPremium`; las funciones:

```ts
/* PORCENTAJE MEDIO VISTO (Iker, 2026-10-01). Como en YouTube Shorts.
   Verde desde el 80% (Iker). Ambar desde el objetivo de Jenny Hoyos, que
   depende de la duracion: <30 s pide 100%; 30-40 s, 90% (APUNTES JENNY
   SHORTS). Por encima del 100% se ve mas de una vez. */
function porcentajeVisto(p: PostPremium): number | null {
  const d = Number(p.video_duration_s);
  if (p.video_avg_watch_s == null || !d) return null;
  return (p.video_avg_watch_s / d) * 100;
}
function nivelVisto(pct: number, duracion: number): 'neutro' | 'bueno' | 'objetivo' {
  const objetivo = duracion < 30 ? 100 : 90;
  if (pct >= objetivo) return 'objetivo';
  if (pct >= 80) return 'bueno';
  return 'neutro';
}
```

y, como primer elemento tras `{sep}` en `FranjaPremium`, solo si `post.content_type === 'text_video'`: icono de play (`ICON_PLAY`, mismo estilo `MetricIcon`) + `Math.round(pct)%` (o `—`), con clase `text-amber-400 font-medium` / `text-emerald-400` / sin color según `nivelVisto`, y `title`:

`Porcentaje medio visto: de media se ven {avg} s de los {dur} s del vídeo. Verde desde el 80%; ámbar desde el objetivo para su duración ({objetivo}%). Por encima del 100%, se ve más de una vez. LinkedIn redondea la media al segundo.`

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc -b` · Expected: sin errores.

- [ ] **Step 4: Commit y push**

```bash
git add backend/src/models/post.ts backend/src/routes/accounts.ts backend/src/mcp/tools.ts frontend/src/pages/Accounts.tsx
git commit -m "dashboard: porcentaje medio visto en la franja de los posts de video"
git push
```

- [ ] **Step 5: Verificar en producción** tras el despliegue: refrescar el post del 30/09 (↻ Refresh) y comprobar en Live Posts `▶ 76%` sin color (76 < 80), y el tooltip.
