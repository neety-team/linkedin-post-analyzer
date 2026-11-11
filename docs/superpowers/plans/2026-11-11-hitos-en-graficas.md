# Hitos en las gráficas · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Banderitas de hito (cada millón de impresiones; 1K/2,5K/5K/7,5K/10K y cada 5K de seguidores) en las gráficas de impresiones y de seguidores, solo si el día del hito cae en el rango elegido.

**Architecture:** El backend calcula los cruces sobre todo el histórico con las mismas series que pintan las gráficas (lógica pura en `services/hitos.ts` + endpoint `GET /api/accounts/milestones`). El frontend filtra por rango (`utils/hitos.ts`) y pinta cada hito como una `ReferenceLine` de Recharts con una banderita propia y tooltip (`components/HitoFlag.tsx`).

**Tech Stack:** Express + pg (backend), React 19 + Recharts 3 + Tailwind (frontend), tests con `node:assert` corridos con `npx tsx`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-11-hitos-en-graficas-design.md`.
- Impresiones: cada 1.000.000, acumulado desde el primer dato, no desde el inicio del rango.
- Seguidores: 1.000 · 2.500 · 5.000 · 7.500 · 10.000 y después cada 5.000.
- Lo superado en el primer dato no es hito. En la vista de todas las cuentas, los hitos de seguidores son los de cada cuenta, no los de la suma.
- Color de la banderita: `cc.accent` (naranja de marca) con texto `cc.onAccent`.
- Si el endpoint falla, la gráfica se pinta igual sin banderitas.

---

### Task 1: Lógica pura del backend ✅

**Files:** Create `backend/src/services/hitos.ts`, `backend/src/services/hitos.test.ts`

**Produces:** `umbralesSeguidores(max): number[]`, `umbralesImpresiones(max): number[]`, `cruces(serie: PuntoSerie[], umbrales: number[]): Cruce[]`, `acumular(diaria: PuntoSerie[]): PuntoSerie[]`, con `PuntoSerie = { dia: string; valor: number }` y `Cruce = { valor: number; dia: string }`.

- [x] Test escrito (`hitos.test.ts`: umbrales, lo ya superado no cuenta, dos umbrales el mismo día, baja y sube, vacía, acumulado).
- [x] `cd backend && npx tsx src/services/hitos.test.ts` → `✅ hitos: todos los casos pasan`.
- [ ] Commit: `Hitos: logica de umbrales y cruces con su test`.

### Task 2: Endpoint `GET /api/accounts/milestones`

**Files:** Modify `backend/src/routes/accounts.ts` (añadir import y la ruta junto a `/follower-history`).

**Consumes:** Task 1 y `serieSeguidores(creatorId, incluirManual, desde, hasta)` de `accounts.ts`.
**Produces:** `{ impresiones: Hito[], seguidores: Hito[] }`, `Hito = { metrica: 'impresiones' | 'seguidores'; valor: number; dia: string; creatorId: string | null; creatorName: string | null }`.

- [ ] Añadir `import { umbralesSeguidores, umbralesImpresiones, cruces, acumular } from '../services/hitos';`
- [ ] Añadir la ruta:

```ts
router.get('/milestones', async (req: Request, res: Response) => {
  try {
    const raw = (req.query.creator_id as string) || '';
    if (raw.startsWith('colab:')) return res.json({ impresiones: [], seguidores: [] });
    const creatorId = raw || null;
    const incluirManual = req.query.include_manual !== 'false';
    const filtroManual = incluirManual ? '' : ' AND is_manual IS NOT TRUE';
    const hoy = new Date().toISOString().slice(0, 10);
    const DESDE = '2025-01-01';

    // Impresiones: la misma serie diaria que la grafica (oficial + manuales por fecha de publicacion).
    const params: any[] = [];
    let oficialScope = `c.is_managed = TRUE AND c.unipile_account_id IS NOT NULL AND c.is_manual IS NOT TRUE`;
    let manualScope = `p.creator_id IN (SELECT id FROM creators WHERE is_managed = TRUE${filtroManual})`;
    if (creatorId) {
      params.push(creatorId);
      oficialScope = `c.id = $1 AND c.unipile_account_id IS NOT NULL`;
      manualScope = `p.creator_id = $1`;
    }
    const { rows: imp } = await pool.query(
      `WITH oficial AS (
         SELECT d.day, SUM(d.impressions)::bigint AS v
           FROM creator_daily_impressions d JOIN creators c ON c.id = d.creator_id
          WHERE ${oficialScope} GROUP BY d.day),
       manual AS (
         SELECT (p.published_at)::date AS day, SUM(p.impressions_count)::bigint AS v
           FROM posts p JOIN creators c ON c.id = p.creator_id AND c.is_manual = TRUE
          WHERE ${manualScope} AND p.published_at IS NOT NULL
            AND p.linkedin_post_id <> 'DEMO_LIVE_POST' AND p.deleted_from_linkedin_at IS NULL
          GROUP BY 1)
       SELECT day::text AS dia, SUM(v)::bigint AS valor
         FROM (SELECT * FROM oficial UNION ALL SELECT * FROM manual) x
        GROUP BY day ORDER BY day`,
      params,
    );
    const acum = acumular(imp.map((r: any) => ({ dia: r.dia, valor: Number(r.valor) || 0 })));
    const maxImp = acum.length ? acum[acum.length - 1].valor : 0;
    let nombre: string | null = null;
    if (creatorId) {
      const { rows } = await pool.query(`SELECT name FROM creators WHERE id = $1`, [creatorId]);
      nombre = rows[0]?.name ?? null;
    }
    const impresiones = cruces(acum, umbralesImpresiones(maxImp)).map((c) => ({
      metrica: 'impresiones' as const, ...c, creatorId, creatorName: nombre,
    }));

    // Seguidores: cuenta a cuenta (la suma tiene saltos por altas de cuentas).
    const cuentas: { id: string; name: string }[] = creatorId
      ? [{ id: creatorId, name: nombre || '' }]
      : (await pool.query(`SELECT id, name FROM creators WHERE is_managed = TRUE${filtroManual} ORDER BY created_at`)).rows;
    const seguidores: any[] = [];
    for (const cu of cuentas) {
      const serie = await serieSeguidores(cu.id, true, DESDE, hoy);
      const puntos = serie.map((p) => ({ dia: String(p.day).slice(0, 10), valor: p.followers || 0 }));
      const max = puntos.reduce((m, p) => Math.max(m, p.valor), 0);
      for (const c of cruces(puntos, umbralesSeguidores(max))) {
        seguidores.push({ metrica: 'seguidores', ...c, creatorId: cu.id, creatorName: cu.name });
      }
    }
    res.json({ impresiones, seguidores });
  } catch (err: any) {
    console.error('[accounts/milestones]', err);
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] `cd backend && npx tsc --noEmit -p .` → sin errores.
- [ ] Commit: `Hitos: endpoint /api/accounts/milestones (impresiones del conjunto o de la cuenta, seguidores cuenta a cuenta)`.

### Task 3: Lógica pura del frontend

**Files:** Create `frontend/src/utils/hitos.ts`, `frontend/src/utils/hitos.test.ts`

**Produces:** `type Hito` (igual que el backend), `hitosEnRango(hitos, inicio, fin): Hito[]`, `cifraCorta(valor): string` (`4M`, `10K`, `2,5K`), `textoHito(hito): { titulo: string; quien: string; fecha: string }`, `porDia(hitos): Map<string, Hito[]>`.

- [ ] Test (`node:assert`): `cifraCorta(4_000_000) === '4M'`, `cifraCorta(10_000) === '10K'`, `cifraCorta(2_500) === '2,5K'`, `cifraCorta(7_500) === '7,5K'`; `hitosEnRango` incluye los bordes y excluye fuera; `textoHito` de impresiones sin cuenta → `quien === 'entre todas las cuentas'`, de seguidores con `creatorName: 'Iker Galarza Rodríguez'` → `quien === 'Iker'`; `titulo` → `'4.000.000 impresiones'` / `'10.000 seguidores'`.
- [ ] `cd backend && npx tsx ../frontend/src/utils/hitos.test.ts` → pasa.
- [ ] Commit: `Hitos: utilidades del frontend (rango, cifra corta y textos) con su test`.

### Task 4: Banderita y tooltip

**Files:** Create `frontend/src/components/HitoFlag.tsx`

**Consumes:** Task 3. **Produces:** `useHitos(creatorId: string | null, includeManual: boolean, reload?: number): { impresiones: Hito[]; seguidores: Hito[] }` · `<CapaHitos hitos={Hito[]} yAxisId?={string} onHover={(h: HoverHito | null) => void} />` devuelve las `ReferenceLine` (se llama como función dentro del `ComposedChart`: `{capaHitos({...})}`) · `<HitoTooltip hover={HoverHito | null} />` para pintar fuera del SVG.

- Banderita: mástil 1,5 px y banderín de cola de golondrina de 16 px de alto en `cc.accent`, cifra corta en `cc.onAccent` 10 px negrita, **por encima del área de datos** (la gráfica sube su margen superior a 26 cuando hay hitos). Línea vertical discontinua `3 3` en `cc.accent` al 45 %.
- Varios hitos el mismo día: banderines uno al lado del otro.
- Tooltip con el estilo de los de la herramienta (`cc.tooltipBg`, borde `cc.accent` al 55 %, radio 10): `🏁 {titulo}` / `{quien} · {fecha}`.
- [ ] Commit: `Hitos: banderita con tooltip para las graficas (Recharts)`.

### Task 5: Gráfica de seguidores

**Files:** Modify `frontend/src/components/FollowerGrowthChart.tsx`

- [ ] `XAxis dataKey="day"` con `tickFormatter={fmtDay}` (la banderita se coloca por día exacto).
- [ ] `const { seguidores } = useHitos(creatorId, includeManual, reloadSignal)`; `hitosEnRango(seguidores, startDate, endDate)` y solo los días que existan en `chartData`.
- [ ] `margin.top = visibles.length ? 26 : 8`; `{capaHitos(...)}` dentro del `ComposedChart`; `<HitoTooltip />` en un `div` relativo que envuelve el `ResponsiveContainer`.
- [ ] Commit: `Hitos: banderitas en la grafica de seguidores`.

### Task 6: Gráfica de impresiones

**Files:** Modify `frontend/src/components/AccountsEngagementChart.tsx`, `frontend/src/pages/Accounts.tsx`

- [ ] Prop nueva `hitos?: Hito[]` (ya filtrados al rango por la página); solo se pintan con `metrica === 'impressions'`, con `yAxisId="left"`.
- [ ] `XAxis dataKey="day"` con `tickFormatter` que devuelve el `label` de ese día.
- [ ] En `Accounts.tsx`: `const { impresiones: hitosImp } = useHitos(esColab ? 'colab:' : cuentaId, incluirManuales, refreshSignal)` y pasar `hitos={hitosEnRango(hitosImp, dateRange.start, dateRange.end)}`.
- [ ] `cd frontend && npx tsc --noEmit -p tsconfig.app.json` → sin errores.
- [ ] Commit: `Hitos: banderitas de cada millon en la grafica de impresiones`.

### Task 7: Verificación y subida

- [ ] Navegador: Iker del 01/10 al 11/11 → banderita `10K` el 25 oct; todas las cuentas del 01/10 al 11/11 → `4M` el 18 oct en impresiones e `Iker · 10K` en seguidores; hover → tooltip; modo oscuro; un rango sin hitos → sin cambios.
- [ ] `git pull --rebase` y `git push origin main` (el backend de Railway despliega al subir).
